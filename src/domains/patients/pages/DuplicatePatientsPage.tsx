/**
 * Patients -> Duplicate Patients (administrators).
 *
 * Patients registered more than once under the same hospital number at the
 * same hospital (case, spaces and dashes ignored). For each group the
 * administrator picks the record to keep - the one with the most recorded
 * against it is suggested - and the others are merged into it: every
 * admission, encounter, prescription, wound and plan moves across, blanks are
 * filled, allergy lists combined, and the duplicate is retired (kept for the
 * audit trail, never deleted).
 *
 * A super admin sees every hospital; a hospital admin sees and merges only
 * patients registered at their own hospital.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ArrowLeft, CheckCircle2, GitMerge, Loader2, RefreshCw, Users } from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient } from '../../../types';
import type { DuplicateGroup } from '../../../utils/hospitalNumber';
import { canMergePatients, suggestKeep, type MergeActor } from '../services/patientMergePlan';
import {
  countLinkedRecords,
  listDuplicateGroups,
  mergePatients,
  type LinkedCounts,
  type MergeResult,
} from '../services/patientDedupeService';

const label = (t: string) => t.replace(/([A-Z])/g, ' $1').toLowerCase();
const fullName = (p: Patient) => `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed';

interface Outcome { ok: boolean; text: string; warnings?: string[] }

export default function DuplicatePatientsPage() {
  const { user } = useAuth();
  const actor: MergeActor | null = user ? { id: user.id, role: user.role, hospitalId: user.hospitalId } : null;
  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);
  const hospitalName = useMemo(() => {
    const m = new Map((hospitals || []).map((h) => [h.id, h.name]));
    return (id: string) => (id ? m.get(id) || id : 'No hospital recorded');
  }, [hospitals]);

  const [groups, setGroups] = useState<DuplicateGroup<Patient>[] | null>(null);
  const [counts, setCounts] = useState<Record<string, LinkedCounts>>({});
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Record<string, Outcome>>({});

  const load = useCallback(async () => {
    setError('');
    setGroups(null);
    try {
      const all = await listDuplicateGroups();
      // Hospital admins: their own hospital only.
      const mine = all.filter((g) => canMergePatients(actor, g.patients));
      const c = await countLinkedRecords(mine.flatMap((g) => g.patients.map((p) => p.id)));
      const totals = Object.fromEntries(Object.entries(c).map(([id, v]) => [id, v.total]));
      setCounts(c);
      setKeep(Object.fromEntries(mine.map((g) => [g.key, suggestKeep(g.patients, totals)?.id || g.patients[0].id])));
      setGroups(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not look for duplicates.');
      setGroups([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, user?.hospitalId]);
  useEffect(() => { void load(); }, [load]);

  const merge = async (g: DuplicateGroup<Patient>) => {
    if (!actor) return;
    const keepId = keep[g.key];
    const kept = g.patients.find((p) => p.id === keepId);
    const others = g.patients.filter((p) => p.id !== keepId);
    if (!kept || !others.length) return;
    const ok = window.confirm(
      `Keep ${fullName(kept)} (${kept.hospitalNumber}, ${counts[kept.id]?.total || 0} records) and merge ` +
      `${others.length === 1 ? 'the other registration' : `the other ${others.length} registrations`} into it?\n\n` +
      'All their admissions, encounters, prescriptions, wounds and plans move to the kept record. ' +
      'The duplicate is retired, not deleted. This cannot be undone from the app.');
    if (!ok) return;

    setBusy(g.key);
    let moved = 0;
    const warnings: string[] = [];
    try {
      for (const o of others) {
        const r: MergeResult = await mergePatients({ keepId, dropId: o.id, user: actor });
        moved += r.movedTotal;
        if (r.cloud.status === 'done') {
          for (const f of r.cloud.failed) warnings.push(`Cloud: ${label(f.table)} - ${f.reason}`);
        } else {
          warnings.push(r.cloud.reason);
        }
      }
      setDone((d) => ({ ...d, [g.key]: {
        ok: true,
        text: `Merged into ${fullName(kept)} (${kept.hospitalNumber}) - ${moved} record${moved === 1 ? '' : 's'} moved.`,
        warnings,
      } }));
    } catch (e) {
      setDone((d) => ({ ...d, [g.key]: { ok: false, text: e instanceof Error ? e.message : 'The merge failed; nothing was changed.' } }));
    } finally {
      setBusy(null);
    }
  };

  const allowed = actor?.role === 'super_admin' || actor?.role === 'hospital_admin';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <Link to="/patients" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 text-sm">
            <ArrowLeft size={16} /> Back to Patients
          </Link>
          <h1 className="page-title flex items-center gap-2"><Users className="w-6 h-6 text-sky-600" /> Duplicate Patients</h1>
          <p className="page-subtitle max-w-2xl">
            Patients registered more than once under the same hospital number at the same hospital
            (capitals, spaces and dashes ignored). Choose the record to keep; the others are merged into it.
          </p>
        </div>
        <button onClick={() => void load()} className="btn btn-secondary w-full sm:w-auto">
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {!allowed && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3">
          Only an administrator can review and merge duplicate registrations.
        </p>
      )}
      {error && <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg p-3">{error}</p>}
      {allowed && groups === null && (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Looking for duplicates...</p>
      )}
      {allowed && groups && groups.length === 0 && !error && (
        <p className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4" /> No duplicate hospital numbers. Every patient is registered once.
        </p>
      )}

      {allowed && groups?.map((g) => {
        const result = done[g.key];
        const namesDiffer = new Set(g.patients.map((p) => fullName(p).toLowerCase())).size > 1;
        return (
          <div key={g.key} className={`card p-4 ${result?.ok ? 'opacity-70' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {g.patients[0]?.hospitalNumber}{' '}
                  <span className="text-sm font-normal text-gray-500">- {g.patients.length} registrations</span>
                </p>
                <p className="text-xs text-gray-500">{hospitalName(g.scope)}</p>
              </div>
              {!result?.ok && (
                <button onClick={() => void merge(g)} disabled={busy !== null} className="btn btn-primary">
                  {busy === g.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                  Merge into the kept record
                </button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {g.patients.map((p) => {
                const isKeep = keep[g.key] === p.id;
                const c = counts[p.id];
                const top = Object.entries(c?.tables || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
                return (
                  <label key={p.id}
                    className={`block rounded-lg border p-3 cursor-pointer ${isKeep ? 'border-sky-600 bg-sky-50 ring-1 ring-sky-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-2">
                      <input type="radio" name={`keep-${g.key}`} checked={isKeep} disabled={!!result?.ok}
                        onChange={() => setKeep((k) => ({ ...k, [g.key]: p.id }))} className="mt-1" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {fullName(p)} {isKeep && <span className="ml-1 text-xs text-sky-700 font-semibold">KEEP</span>}
                        </p>
                        <p className="text-xs text-gray-600">
                          Stored as "{p.hospitalNumber}"
                          {p.createdAt ? ` - registered ${new Date(p.createdAt).toISOString().slice(0, 10)}` : ''}
                          {' - '}<Link to={`/patients/${p.id}`} className="underline">open</Link>
                        </p>
                        <p className="text-xs text-gray-700 mt-1">
                          <strong>{c?.total || 0}</strong> linked record{(c?.total || 0) === 1 ? '' : 's'}
                          {top.length > 0 && <> - {top.map(([t, n]) => `${label(t)} ${n}`).join(', ')}</>}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {namesDiffer && (
              <p className="mt-3 text-xs flex items-start gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                The names differ. Check these are the same person before merging - if not, one number was
                mistyped: correct it on that patient's record instead.
              </p>
            )}

            {result && (
              <div className={`mt-3 text-sm rounded-lg p-2.5 ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.text}
                {result.warnings && result.warnings.length > 0 && (
                  <ul className="text-xs mt-1 list-disc pl-4">
                    {result.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
