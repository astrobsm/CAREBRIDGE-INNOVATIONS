/**
 * The follow-up confirmation list for one surgery: the template's visits,
 * dated (window start), each with Move (change the date) and Cancel, before
 * anything is booked; then the booked visits with Move / Cancel; recall items
 * shown with the template text for the clinician to book when they apply.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { CalendarCheck, CalendarClock, X, RotateCcw } from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { FollowUpProposal } from '../journey/followUpPlan';
import {
  followUpProposals, bookFollowUps, bookPlanItem, closePlanItem, moveFollowUp, cancelFollowUp,
} from '../journey/followUpBooking';

const nice = (d?: string) => (d ? format(parseISO(d), 'EEE d MMM yyyy') : 'Date to be set');

export default function FollowUpPlanner({ surgeryId, onDone }: { surgeryId: string; onDone?: () => void }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof followUpProposals>>>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState<Record<string, string>>({});

  const surgery = useLiveQuery(() => db.surgeries.get(surgeryId), [surgeryId]);
  const appointments = useLiveQuery(
    async () => (await db.appointments.where('patientId').equals(surgery?.patientId ?? '').toArray()).filter(a => a.relatedSurgeryId === surgeryId),
    [surgery?.patientId, surgeryId],
  );
  const patient = useLiveQuery(() => (surgery ? db.patients.get(surgery.patientId) : undefined), [surgery?.patientId]);

  const reload = async () => {
    const r = await followUpProposals(surgeryId);
    setLoaded(r);
    setDates(Object.fromEntries((r?.proposals ?? []).filter(p => p.dueDate).map(p => [p.key, p.dueDate!])));
  };
  useEffect(() => { void reload(); }, [surgeryId, surgery?.followUpPlan?.items.length]);

  if (!loaded) return <p className="text-sm text-gray-500">Loading follow-up plan…</p>;
  const proposals = loaded.proposals;
  const toBook = proposals.filter(p => p.action === 'book');
  const recall = proposals.filter(p => p.action === 'recall');
  const pending = proposals.filter(p => p.action === 'pending_discharge');
  const plan = surgery?.followUpPlan;

  const confirm = async () => {
    if (!user || !patient) return;
    setBusy(true);
    try {
      const withDates: FollowUpProposal[] = proposals.map(p => (p.action === 'book' ? { ...p, dueDate: dates[p.key] || p.dueDate } : p));
      await bookFollowUps(surgeryId, withDates, [...excluded], patient, user);
      const n = toBook.filter(p => !excluded.has(p.key)).length;
      toast.success(`${n} follow-up visit(s) booked${recall.length ? `; ${recall.length} on recall` : ''}`);
      await reload();
    } catch (e) {
      console.error(e);
      toast.error('Could not book the follow-up visits');
    } finally { setBusy(false); }
  };

  const bookedAppts = (appointments ?? []).filter(a => a.status !== 'cancelled')
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());

  return (
    <div className="space-y-4" data-testid="follow-up-planner">
      {!loaded.moduleName && !plan && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
          No procedure template is linked to this operation (no pre-operative procedure review, and the procedure is not in a template's catalogue).
          Book follow-up from Appointments.
        </p>
      )}
      {loaded.moduleName && <p className="text-xs text-gray-500">From the {loaded.moduleName} template. Each visit is booked at the start of its window, 09:00, with WhatsApp reminders.</p>}

      {toBook.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">To book</h4>
          <ul className="space-y-2">
            {toBook.map(p => {
              const off = excluded.has(p.key);
              return (
                <li key={p.key} className={`border rounded-lg p-2 ${off ? 'opacity-50 bg-gray-50' : 'bg-white'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{p.purpose}</p>
                      <p className="text-xs text-gray-500">Template: {p.when}{p.kind === 'next' ? ' (next visit offered when this one is done)' : ''}</p>
                    </div>
                    <button type="button" onClick={() => setExcluded(s => { const n = new Set(s); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; })}
                      className="text-xs flex items-center gap-1 text-red-600 flex-shrink-0">
                      {off ? <><RotateCcw className="w-3 h-3" />Keep</> : <><X className="w-3 h-3" />Cancel</>}
                    </button>
                  </div>
                  <label className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <CalendarClock className="w-3.5 h-3.5" /> Move to
                    <input type="date" disabled={off} value={dates[p.key] ?? ''} onChange={e => setDates(d => ({ ...d, [p.key]: e.target.value }))}
                      className="border rounded px-2 py-1 text-sm" />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Booked when the patient is discharged</h4>
          <ul className="text-sm text-gray-700 list-disc ml-5">{pending.map(p => <li key={p.key}>{p.purpose} <span className="text-xs text-gray-500">({p.when})</span></li>)}</ul>
        </div>
      )}

      {recall.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">On recall (confirm when it applies)</h4>
          <ul className="text-sm text-gray-700 space-y-1">{recall.map(p => (
            <li key={p.key} className="bg-amber-50 rounded p-2"><span className="font-medium">{p.when}</span>: {p.purpose}
              <span className="block text-xs text-gray-500">Due {nice(p.dueDate)}</span></li>
          ))}</ul>
        </div>
      )}

      {proposals.length > 0 && (
        <button type="button" disabled={busy || !patient} onClick={confirm}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <CalendarCheck className="w-4 h-4" /> Book {toBook.filter(p => !excluded.has(p.key)).length} visit(s){recall.length ? ' and keep recall items' : ''}
        </button>
      )}

      {bookedAppts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Booked</h4>
          <ul className="space-y-2">
            {bookedAppts.map(a => (
              <li key={a.id} className="border rounded-lg p-2 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{format(new Date(a.appointmentDate), 'EEE d MMM yyyy')} {a.appointmentTime}</p>
                    <p className="text-xs text-gray-600 break-words">{a.reasonForVisit}</p>
                    <p className="text-[11px] text-gray-400">{a.status}</p>
                  </div>
                  {['scheduled', 'confirmed'].includes(a.status) && (
                    <button type="button" className="text-xs text-red-600 flex items-center gap-1 flex-shrink-0"
                      onClick={async () => { if (user && window.confirm('Cancel this visit?')) { await cancelFollowUp(surgeryId, a.id, user.id); toast.success('Visit cancelled'); } }}>
                      <X className="w-3 h-3" />Cancel
                    </button>
                  )}
                </div>
                {['scheduled', 'confirmed'].includes(a.status) && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <input type="date" value={moving[a.id] ?? format(new Date(a.appointmentDate), 'yyyy-MM-dd')} onChange={e => setMoving(m => ({ ...m, [a.id]: e.target.value }))}
                      className="border rounded px-2 py-1 text-sm" />
                    {moving[a.id] && moving[a.id] !== format(new Date(a.appointmentDate), 'yyyy-MM-dd') && (
                      <button type="button" className="text-blue-600" onClick={async () => { if (user) { await moveFollowUp(a.id, moving[a.id], user.id); toast.success('Visit moved'); } }}>Move</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan?.items.some(i => i.status === 'recall') && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">Recall items</h4>
          <ul className="space-y-1">
            {plan.items.filter(i => i.status === 'recall').map(i => (
              <RecallRow key={i.key} when={i.when} purpose={i.purpose} due={i.dueDate}
                onBook={async d => { if (user && patient) { await bookPlanItem(surgeryId, i.key, d, patient, user); toast.success('Booked'); } }}
                onDrop={async () => { await closePlanItem(surgeryId, i.key, 'cancelled'); }} />
            ))}
          </ul>
        </div>
      )}

      {onDone && <button type="button" onClick={onDone} className="w-full border rounded-lg py-2 text-sm">Done</button>}
    </div>
  );
}

function RecallRow({ when, purpose, due, onBook, onDrop }: { when: string; purpose: string; due?: string; onBook: (d: string) => void; onDrop: () => void }) {
  const [d, setD] = useState(due ?? '');
  return (
    <li className="bg-amber-50 rounded p-2 text-sm">
      <span className="font-medium">{when}</span>: {purpose}
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <input type="date" value={d} onChange={e => setD(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        <button type="button" disabled={!d} onClick={() => onBook(d)} className="text-blue-600 disabled:text-gray-400">Book</button>
        <button type="button" onClick={onDrop} className="text-red-600">Not needed</button>
      </div>
    </li>
  );
}
