/**
 * Approve → outputs. Nothing reaches the patient and nothing is booked until
 * "Approve plan" (owner decision). Then: clinician PDF, patient copy PDF,
 * "Send to patient's WhatsApp", and a confirm list of follow-up visits booked
 * through the appointment service (each once).
 */
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../../database';
import { useAuth } from '../../../../contexts/AuthContext';
import { approvePlan, appointmentProposals, bookPlanAppointments, downloadClinicianPdf, latestApproval, shareWithPatient, type AppointmentProposal } from '../service';
import type { ClerkingPlanRecord } from '../records';
import { PLAN_SECTIONS, type PlanLine, type RulesPlan } from '../types';

interface Props {
  record: ClerkingPlanRecord | null;
  finalLines: PlanLine[];
  rules: RulesPlan;
  ensure: () => Promise<ClerkingPlanRecord | null>;
}

const sig = (lines: PlanLine[]) => lines.map(l => `${l.id}:${l.text}`).sort().join('|');

export const ApprovePanel: React.FC<Props> = ({ record, finalLines, rules, ensure }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const patient = useLiveQuery(() => (record ? db.patients.get(record.patientId) : undefined), [record?.patientId]);
  const approval = record ? latestApproval(record) : undefined;
  const changed = !!approval && sig(approval.lines) !== sig(finalLines);
  const { proposals, undated } = useMemo(() => (record ? appointmentProposals(record) : { proposals: [], undated: [] }), [record]);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  useEffect(() => { setDates(Object.fromEntries(proposals.map(p => [p.key, p.date]))); }, [proposals.map(p => p.key).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (label: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(label);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); console.error(e); } finally { setBusy(null); }
  };

  const approve = () => run('approve', async () => {
    if (!user) throw new Error('Sign in to approve');
    const r = await ensure();
    if (!r) throw new Error('Could not save the plan');
    const aiCount = finalLines.filter(l => l.source.kind === 'ai').length;
    if (aiCount && !window.confirm(`${aiCount} AI-drafted line(s) are in the final plan. You have checked each one?`)) throw new Error('Approval cancelled');
    await approvePlan(r.id, user);
  }, 'Plan approved');

  const previewPatientCopy = () => run('preview', () => shareWithPatient(record!.id, 'download', user!), 'Patient copy downloaded');

  const book = () => run('book', async () => {
    if (!user || !patient || !record) throw new Error('Patient not loaded');
    const confirmed: AppointmentProposal[] = proposals.filter(p => !excluded.has(p.key)).map(p => ({ ...p, date: dates[p.key] || p.date }));
    if (!confirmed.length) throw new Error('Nothing selected to book');
    await bookPlanAppointments(record.id, confirmed, patient, user);
  }, 'Follow-up booked (WhatsApp reminders scheduled)');

  return (
    <div className="space-y-3 text-xs" data-testid="approve-panel">
      <div className="rounded-lg border bg-white p-2">
        <p className="font-semibold text-gray-900">Final plan: {finalLines.length} lines</p>
        <p className="text-gray-600">{PLAN_SECTIONS.map(s => `${s.label} ${finalLines.filter(l => l.section === s.id).length}`).join(' · ')}</p>
        {finalLines.some(l => l.source.kind === 'ai') && <p className="text-purple-800 mt-1">Includes {finalLines.filter(l => l.source.kind === 'ai').length} AI-drafted line(s), labelled in the PDF.</p>}
        {rules.missing.length > 0 && <p className="text-amber-800 mt-1">Still not documented: {rules.missing.join('; ')}</p>}
        {approval && <p className="text-green-800 mt-1" data-testid="approved-line">Version {approval.version} approved by {approval.byName || 'clinician'} on {format(new Date(approval.at), 'd MMM yyyy HH:mm')}{changed ? ' — the plan has changed since' : ''}</p>}
        <button type="button" disabled={!!busy || (!!approval && !changed)} onClick={approve} className="mt-2 w-full py-2 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50" data-testid="approve-plan">
          {busy === 'approve' ? 'Approving…' : approval ? (changed ? `Approve changes (version ${approval.version + 1})` : 'Approved') : 'Approve plan'}
        </button>
      </div>

      {!approval && <p className="text-gray-600 bg-gray-50 rounded p-2">Nothing is sent to the patient and no appointment is booked until the plan is approved.</p>}

      {approval && record && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!!busy} onClick={() => run('cpdf', () => downloadClinicianPdf(record.id, user!), 'Clinician PDF downloaded')} className="py-2 rounded-lg border border-gray-400 font-semibold">Clinician PDF</button>
            <button type="button" disabled={!!busy} onClick={previewPatientCopy} className="py-2 rounded-lg border border-blue-600 text-blue-700 font-semibold">Patient copy PDF</button>
          </div>
          <button type="button" disabled={!!busy || !patient?.phone} onClick={() => run('wa', () => shareWithPatient(record.id, 'whatsapp', user!), "Sent to the patient's WhatsApp")}
            className="w-full py-2 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-50" data-testid="send-whatsapp">
            Send to patient's WhatsApp{patient?.phone ? ` (${patient.phone})` : ' — no phone on record'}
          </button>

          <div className="rounded-lg border bg-white p-2" data-testid="appointment-confirm">
            <p className="font-semibold text-gray-900">Follow-up appointments</p>
            {proposals.length === 0 && <p className="text-gray-500">{record.appointments.length ? 'Every dated visit in the plan is booked.' : 'No dated follow-up in the plan.'}</p>}
            <ul className="space-y-1 mt-1">
              {proposals.map(p => {
                const off = excluded.has(p.key);
                return (
                  <li key={p.key} className={`border rounded p-1.5 ${off ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span><strong>{p.purpose}</strong><span className="block text-gray-500">Plan: {p.when}</span></span>
                      <button type="button" className="text-red-600" onClick={() => setExcluded(s => { const n = new Set(s); n.has(p.key) ? n.delete(p.key) : n.add(p.key); return n; })}>{off ? 'Keep' : 'Skip'}</button>
                    </div>
                    <input type="date" disabled={off} value={dates[p.key] ?? p.date} onChange={e => setDates(d => ({ ...d, [p.key]: e.target.value }))} className="mt-1 border rounded px-1.5 py-1" aria-label={`Date for ${p.purpose}`} />
                  </li>
                );
              })}
            </ul>
            {undated.length > 0 && <p className="mt-1 text-gray-500">Not dated yet (book when it applies): {undated.join('; ')}</p>}
            {proposals.length > 0 && (
              <button type="button" disabled={!!busy || !patient} onClick={book} className="mt-2 w-full py-2 rounded-lg bg-indigo-700 text-white font-semibold disabled:opacity-50" data-testid="book-appointments">
                Book {proposals.filter(p => !excluded.has(p.key)).length} visit(s)
              </button>
            )}
            {record.appointments.length > 0 && (
              <ul className="mt-2 text-gray-700 space-y-0.5">{record.appointments.map(a => <li key={a.key}>Booked {format(parseISO(a.date), 'EEE d MMM yyyy')} 09:00 — {a.purpose}</li>)}</ul>
            )}
          </div>

          {record.shares.length > 0 && (
            <ul className="text-gray-600 space-y-0.5">{[...record.shares].reverse().slice(0, 5).map(s => <li key={s.id}>{s.audience === 'patient' ? 'Patient copy' : 'Clinician PDF'} {s.via === 'whatsapp' ? 'sent by WhatsApp' : 'downloaded'} {format(new Date(s.at), 'd MMM HH:mm')} by {s.byName || 'clinician'} (v{s.planVersion})</li>)}</ul>
          )}
        </>
      )}
    </div>
  );
};
