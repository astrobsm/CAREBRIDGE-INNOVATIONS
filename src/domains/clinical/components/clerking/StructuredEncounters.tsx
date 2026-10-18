/**
 * Patient panels for structured encounters:
 *   StructuredEncountersPanel  start / continue the initial clerking,
 *                              follow-ups, review & sign, problem list and
 *                              plan tracking, encounter history.
 *   ClinicalOutcomesSummary    outcomes of every tracked problem and plan
 *                              item across encounters (clinical summary).
 *
 * Both read Dexie live, so a clerking signed on this device, or pulled in by
 * sync from another, appears without a reload.
 */
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import type { PatientContext } from '../../clerking/engine';
import type { ClinicalPlanItem, ClinicalProblem } from '../../clerking/records';
import { actorOf, listForPatient, localDraft, markEncounterInError, updateTracked, type ClerkedEncounter } from '../../services/clerkingService';
import { canSign as roleCanSign, messageOf } from '../../clerking/lifecycle';
import InitialEncounterForm from './InitialEncounterForm';
import FollowUpEncounterForm from './FollowUpEncounterForm';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', pending_review: 'bg-amber-100 text-amber-800', signed: 'bg-green-100 text-green-800', entered_in_error: 'bg-red-100 text-red-700 line-through',
  active: 'bg-blue-100 text-blue-800', improving: 'bg-green-100 text-green-800', worsening: 'bg-red-100 text-red-800', resolved: 'bg-emerald-100 text-emerald-800', ruled_out: 'bg-slate-100 text-slate-700',
  pending: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-800', done: 'bg-green-100 text-green-800', not_done: 'bg-amber-100 text-amber-800', stopped: 'bg-slate-100 text-slate-700',
};
const label = (s: string) => s.replace(/_/g, ' ');
const Badge: React.FC<{ s: string }> = ({ s }) => <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[s] || 'bg-gray-100'}`}>{label(s)}</span>;
const fmt = (d?: string | Date | null) => (d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/** The patient's structured encounters, problems and plan, live. */
function usePatientClerking(patientId: string) {
  return useLiveQuery(() => listForPatient(patientId), [patientId]);
}

export interface StructuredEncountersPanelProps {
  patientId: string;
  patientLabel: string;
  ctx: PatientContext;
  /** Names, hospital number, phone — removed from anything sent to the AI. */
  identifiers?: string[];
  hospitalId?: string;
  /** Open straight into a form (e.g. from the encounter page). */
  autoOpen?: 'initial' | 'follow_up';
}

export const StructuredEncountersPanel: React.FC<StructuredEncountersPanelProps> = ({ patientId, patientLabel, ctx, identifiers, hospitalId, autoOpen }) => {
  const { user } = useAuth();
  const state = usePatientClerking(patientId);
  const [form, setForm] = useState<{ type: 'initial' | 'follow_up'; existing?: ClerkedEncounter | null } | null>(autoOpen ? { type: autoOpen } : null);
  const [viewing, setViewing] = useState<string | null>(null);
  const userName = user ? actorOf(user).name || 'Clinician' : 'Clinician';

  const all = state?.encounters || [];
  const encounters = all.filter(e => e.clerking.status !== 'entered_in_error' || viewing === e.id);
  const initial = all.find(e => e.clerking.kind === 'initial' && !['entered_in_error', 'draft'].includes(e.clerking.status))
    || all.find(e => e.clerking.kind === 'initial' && e.clerking.status !== 'entered_in_error');
  const myDraft = all.find(e => e.clerking.status === 'draft' && String(e.clerking.createdBy) === String(user?.id));
  const localInitial = localDraft.load<unknown>(patientId, 'initial');
  const pending = all.filter(e => e.clerking.status === 'pending_review');
  const problems = state?.problems || [];
  const planItems = state?.planItems || [];
  const canSign = roleCanSign(user ? actorOf(user) : null);

  const openExisting = (e: ClerkedEncounter) => setForm({ type: e.clerking.kind, existing: e });

  const changeStatus = async (kind: 'problem' | 'plan', id: string, status: string) => {
    if (!user) return;
    try { await updateTracked(kind, id, status, undefined, user); }
    catch (e) { toast.error(messageOf(e, 'Could not update')); }
  };

  const markError = async (e: ClerkedEncounter) => {
    if (!user) return;
    const reason = window.prompt('Why is this encounter entered in error? (required)');
    if (!reason) return;
    try { await markEncounterInError(e.id, user, reason); toast.success('Marked entered in error'); }
    catch (err) { toast.error(messageOf(err, 'Could not update')); }
  };

  const common = { patientId, patientLabel, ctx, userName, canSign, identifiers, hospitalId, onClose: () => setForm(null), onSaved: () => undefined };

  return (
    <div className="bg-white rounded-xl border-2 border-green-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">🩺 Initial Patient Encounter <span className="text-xs font-normal text-gray-500">· structured clerking</span></h3>
          <p className="text-xs text-gray-600">Detailed review by the house officer / junior registrar, with rule-based and AI-assisted differentials for your approval.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {myDraft ? (
            <button type="button" onClick={() => openExisting(myDraft)} className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white">Continue draft ({myDraft.clerking.kind === 'initial' ? 'initial' : 'follow-up'})</button>
          ) : (
            <button type="button" onClick={() => setForm({ type: 'initial' })} className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white">
              {localInitial ? 'Continue clerking (saved on this device)' : initial ? 'New initial clerking' : 'Start initial clerking'}
            </button>
          )}
          <button type="button" disabled={!initial && problems.length === 0} onClick={() => setForm({ type: 'follow_up' })}
            title={!initial ? 'Complete an initial clerking first' : undefined}
            className="px-3 py-2 text-sm rounded-lg border border-green-600 text-green-700 disabled:opacity-40">Follow-up encounter</button>
          <Link to={`/patients/${patientId}/clinical-summary`} className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Scribe summary &amp; treatment plan
          </Link>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!state && <p className="text-xs text-gray-500">Loading…</p>}

        {canSign && pending.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900 mb-2">Awaiting your review</p>
            {pending.map(e => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm py-1">
                <span>{e.clerking.kind === 'initial' ? 'Initial clerking' : 'Follow-up'} by {e.clerking.createdByName || 'unknown'} · {fmt(e.clerking.submittedAt || e.updatedAt)}</span>
                <button type="button" onClick={() => openExisting(e)} className="px-3 py-1 text-xs rounded bg-amber-600 text-white">Review & sign</button>
              </div>
            ))}
          </div>
        )}

        {state && (problems.length > 0 || planItems.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            <TrackedList title="Problem list" items={problems} statuses={['active', 'improving', 'worsening', 'resolved', 'ruled_out']}
              text={p => (p as ClinicalProblem).label} danger={p => (p as ClinicalProblem).dangerous} onStatus={(id, s) => changeStatus('problem', id, s)} />
            <TrackedList title="Plan (investigations & treatment)" items={planItems} statuses={['pending', 'in_progress', 'done', 'not_done', 'stopped']}
              text={p => `${(p as ClinicalPlanItem).kind === 'investigation' ? '🔬' : '💊'} ${(p as ClinicalPlanItem).text}`} onStatus={(id, s) => changeStatus('plan', id, s)} />
          </div>
        )}

        {state && encounters.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Structured encounters</h4>
            <ul className="divide-y divide-gray-100 border rounded-lg">
              {encounters.map(e => (
                <li key={e.id} className="p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium">{e.clerking.kind === 'initial' ? 'Initial clerking' : 'Follow-up'}</span>{' '}
                      <Badge s={e.clerking.status} />
                      <span className="block text-[11px] text-gray-500">
                        {fmt(e.createdAt)} · {e.clerking.createdByName || 'unknown'}{e.clerking.signedByName ? ` · signed by ${e.clerking.signedByName} ${fmt(e.clerking.signedAt)}` : ''}
                      </span>
                      {e.clerking.summary?.complaints?.length > 0 && <span className="block text-xs text-gray-600">{e.clerking.summary.complaints.map((c: { label: string }) => c.label).join(' · ')}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setViewing(viewing === e.id ? null : e.id)} className="px-2 py-1 text-xs rounded border">{viewing === e.id ? 'Hide' : 'View note'}</button>
                      {['draft', 'pending_review'].includes(e.clerking.status) && (String(e.clerking.createdBy) === String(user?.id) || canSign) && (
                        <button type="button" onClick={() => openExisting(e)} className="px-2 py-1 text-xs rounded border border-green-600 text-green-700">Open</button>
                      )}
                      {e.clerking.status !== 'entered_in_error' && (
                        <button type="button" onClick={() => markError(e)} className="px-2 py-1 text-xs rounded border text-red-600">Entered in error</button>
                      )}
                    </div>
                  </div>
                  {viewing === e.id && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs bg-gray-50 border rounded p-3 max-h-96 overflow-auto font-sans">{e.clerking.narrative || 'No note generated.'}{e.clerking.errorReason ? `\n\nENTERED IN ERROR: ${e.clerking.errorReason}` : ''}</pre>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {form?.type === 'initial' && <InitialEncounterForm {...common} existing={form.existing} />}
      {form?.type === 'follow_up' && (
        <FollowUpEncounterForm {...common} problems={problems} planItems={planItems} initial={initial} existing={form.existing} />
      )}
    </div>
  );
};

const TrackedList: React.FC<{
  title: string;
  items: Array<ClinicalProblem | ClinicalPlanItem>;
  statuses: string[];
  text: (i: ClinicalProblem | ClinicalPlanItem) => string;
  danger?: (i: ClinicalProblem | ClinicalPlanItem) => boolean;
  onStatus: (id: string, status: string) => void;
}> = ({ title, items, statuses, text, danger, onStatus }) => (
  <div className="rounded-lg border border-gray-200">
    <h4 className="text-sm font-semibold text-gray-700 px-3 py-2 border-b bg-gray-50">{title} <span className="font-normal text-gray-500">· {items.length}</span></h4>
    <ul className="divide-y divide-gray-100 max-h-72 overflow-auto">
      {items.length === 0 && <li className="px-3 py-2 text-xs text-gray-500">None</li>}
      {items.map(i => (
        <li key={i.id} className="px-3 py-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-gray-900">{danger?.(i) && <span title="Can't-miss diagnosis" className="text-red-600">⚠ </span>}{text(i)}</p>
            {i.lastReview?.note && <p className="text-[11px] text-gray-500">Last: {i.lastReview.note}</p>}
          </div>
          <select aria-label="Status" value={i.status} onChange={e => onStatus(i.id, e.target.value)}
            className={`text-[11px] rounded-full px-2 py-0.5 border-0 capitalize ${STATUS_STYLE[i.status] || 'bg-gray-100'}`}>
            {statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </li>
      ))}
    </ul>
  </div>
);

/** Outcomes of the structured encounters, for the clinical summary. */
export const ClinicalOutcomesSummary: React.FC<{ patientId: string }> = ({ patientId }) => {
  const state = usePatientClerking(patientId);
  if (!state) return null;
  const live = state.encounters.filter(e => e.clerking.status !== 'entered_in_error');
  if (!live.length) return null;

  const initial = live.filter(e => e.clerking.kind === 'initial').slice(-1)[0] || live[live.length - 1];
  const latest = live[0];
  const followUps = live.filter(e => e.clerking.kind === 'follow_up');
  const problems = state.problems;
  const plan = state.planItems;
  const count = (arr: Array<{ status: string }>, ...s: string[]) => arr.filter(x => s.includes(x.status)).length;
  const planDone = count(plan, 'done');
  const planPct = plan.length ? Math.round((planDone / plan.length) * 100) : 0;
  const latestFlags: string[] = latest.clerking.summary?.red_flags || [];
  const initialSummary = initial.clerking.summary || {};

  return (
    <div className="bg-white rounded-xl border-2 border-green-200 p-4 space-y-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-gray-900">🩺 Clinical encounters — outcomes</h3>
        <span className="text-xs text-gray-500">{live.length} encounter(s) · first {fmt(initial.createdAt)} · last {fmt(latest.createdAt)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        {[
          ['Active', count(problems, 'active'), 'text-blue-700'],
          ['Improving', count(problems, 'improving'), 'text-green-700'],
          ['Worsening', count(problems, 'worsening'), 'text-red-700'],
          ['Resolved', count(problems, 'resolved', 'ruled_out'), 'text-emerald-700'],
          ['Plan done', `${planDone}/${plan.length}`, 'text-gray-800'],
        ].map(([l, v, c]) => (
          <div key={String(l)} className="rounded-lg bg-gray-50 p-2">
            <div className={`text-xl font-bold ${c}`}>{v}</div>
            <div className="text-[11px] text-gray-500">{l}</div>
          </div>
        ))}
      </div>
      {plan.length > 0 && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-label={`Plan ${planPct}% complete`}>
          <div className="h-full bg-green-500" style={{ width: `${planPct}%` }} />
        </div>
      )}

      {initialSummary.complaints?.length > 0 && (
        <p className="text-sm"><strong>Presenting complaints:</strong> {initialSummary.complaints.map((c: { label: string; duration?: { value: number | null; unit: string } }) => `${c.label}${c.duration?.value ? ` (${c.duration.value} ${c.duration.unit})` : ''}`).join(' · ')}</p>
      )}
      {initialSummary.risk_factors?.length > 0 && (
        <p className="text-xs text-amber-900 bg-amber-50 rounded p-2"><strong>Risk factors:</strong> {initialSummary.risk_factors.join(' · ')}</p>
      )}
      {latestFlags.length > 0 && (
        <p className="text-xs text-red-800 bg-red-50 rounded p-2"><strong>⚠ Red flags at last encounter:</strong> {latestFlags.join(' · ')}</p>
      )}

      {problems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Problem outcomes</h4>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-500"><th className="py-1">Problem</th><th>Since</th><th>Status</th><th className="hidden sm:table-cell">Latest review</th></tr></thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="py-1.5 pr-2">{p.dangerous && <span className="text-red-600">⚠ </span>}{p.label}</td>
                  <td className="pr-2 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="pr-2"><Badge s={p.status} /></td>
                  <td className="hidden sm:table-cell text-gray-600">{p.lastReview?.note || (p.lastReview?.status ? label(p.lastReview.status) : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {plan.filter(p => !['done', 'stopped'].includes(p.status)).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Outstanding plan items</h4>
          <ul className="text-xs space-y-0.5">
            {plan.filter(p => !['done', 'stopped'].includes(p.status)).map(p => (
              <li key={p.id} className="flex items-center gap-2"><Badge s={p.status} /> {p.kind === 'investigation' ? '🔬' : '💊'} {p.text}{p.priority === 'urgent' && <span className="text-orange-600">(urgent)</span>}</li>
            ))}
          </ul>
        </div>
      )}

      {followUps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Follow-up trajectory</h4>
          <ol className="text-xs space-y-1">
            {[...followUps].reverse().map(f => (
              <li key={f.id} className="border-l-2 border-green-300 pl-2">
                <span className="text-gray-500">{fmt(f.createdAt)} · {f.clerking.createdByName}</span>
                <span className="block">{(f.clerking.summary?.problems || []).filter((p: { status: string }) => p.status !== 'not_reviewed').map((p: { label: string; status: string }) => `${p.label}: ${label(p.status)}`).join(' · ') || 'No problem updates'}</span>
                {f.clerking.summary?.new_complaints?.length > 0 && <span className="block text-amber-700">New: {f.clerking.summary.new_complaints.join(', ')}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default StructuredEncountersPanel;
