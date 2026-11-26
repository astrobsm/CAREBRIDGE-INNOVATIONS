/**
 * /follow-ups/recall — patients whose follow-up has slipped or waits for the
 * clinician: missed and no-show appointments, conditional template visits not
 * yet booked, the next visit of a recurring series, and "after discharge"
 * visits. One tap sends a WhatsApp recall; Book opens a date.
 */
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { MessageCircle, CalendarPlus, AlertTriangle } from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { generateWhatsAppUrl } from '../../../services/appointmentService';
import { selectRecallList, type RecallEntry, type RecallKind } from '../journey/recall';
import { bookPlanItem, closePlanItem } from '../journey/followUpBooking';
import { patientText } from '../../patient-pack/locale/en';

const KIND_LABEL: Record<RecallKind, string> = {
  missed: 'Missed', no_show: 'No-show', template_recall: 'To confirm', next_due: 'Next visit due', awaiting_booking: 'After discharge',
};
const KIND_STYLE: Record<RecallKind, string> = {
  missed: 'bg-red-100 text-red-700', no_show: 'bg-red-100 text-red-700', template_recall: 'bg-amber-100 text-amber-800',
  next_due: 'bg-sky-100 text-sky-700', awaiting_booking: 'bg-purple-100 text-purple-700',
};

export default function RecallListPage() {
  const { user } = useAuth();
  const appointments = useLiveQuery(() => db.appointments.toArray(), []);
  const surgeries = useLiveQuery(() => db.surgeries.toArray(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const hospital = useLiveQuery(() => (user?.hospitalId ? db.hospitals.get(user.hospitalId) : undefined), [user?.hospitalId]);
  const [filter, setFilter] = useState<'all' | RecallKind>('all');
  const [dates, setDates] = useState<Record<string, string>>({});

  const list = useMemo(() => (appointments && surgeries && patients
    ? selectRecallList({ appointments, surgeries, patients, now: new Date() }) : undefined), [appointments, surgeries, patients]);
  const shown = (list ?? []).filter(e => filter === 'all' || e.kind === filter);
  const clinic = hospital?.name || 'the clinic';

  const whatsapp = (e: RecallEntry) => {
    if (!e.phone) { toast.error('No phone number recorded for this patient'); return; }
    const first = e.patientName.split(' ')[0] || e.patientName;
    const msg = e.kind === 'missed' || e.kind === 'no_show'
      ? patientText.recall.missed(first, e.dueDate ? format(parseISO(e.dueDate), 'd MMMM yyyy') : '', clinic)
      : patientText.recall.whatsapp(first, e.title, clinic);
    window.open(generateWhatsAppUrl(e.phone, msg), '_blank');
  };

  const book = async (e: RecallEntry) => {
    const date = dates[e.id] || e.dueDate;
    if (!date || !user) { toast.error('Pick a date'); return; }
    const patient = await db.patients.get(e.patientId);
    if (!patient) return;
    if (e.surgeryId && e.itemKey) {
      await bookPlanItem(e.surgeryId, e.itemKey, date, patient, user);
      toast.success('Visit booked');
    }
  };

  return (
    <div className="p-3 sm:p-6 w-full min-w-0 max-w-3xl mx-auto" data-testid="recall-page">
      <h1 className="text-xl font-bold text-gray-900">Follow-up recall</h1>
      <p className="text-sm text-gray-500 mb-3">Missed visits, and follow-up waiting for you to confirm or book.</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {(['all', 'missed', 'no_show', 'template_recall', 'next_due', 'awaiting_booking'] as const).map(k => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${filter === k ? 'bg-gray-900 text-white' : 'bg-white'}`}>
            {k === 'all' ? `All (${list?.length ?? 0})` : `${KIND_LABEL[k]} (${(list ?? []).filter(e => e.kind === k).length})`}
          </button>
        ))}
      </div>
      {!list && <p className="text-sm text-gray-500">Loading…</p>}
      {list && shown.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-lg p-6 text-center">Nobody to recall.</p>}
      <ul className="space-y-2">
        {shown.map(e => (
          <li key={e.id} className="bg-white rounded-lg shadow-sm border p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{e.patientName}</p>
                <p className="text-sm text-gray-700 break-words">{e.title}</p>
                {e.templateText && <p className="text-xs text-gray-500">Template: {e.templateText}</p>}
                {e.procedureName && <p className="text-xs text-gray-400">{e.procedureName}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full ${KIND_STYLE[e.kind]}`}>{KIND_LABEL[e.kind]}</span>
                <p className="text-xs text-gray-600 mt-1">{e.dueDate ? format(parseISO(e.dueDate), 'd MMM yyyy') : 'Date to be set'}</p>
                {e.overdueDays !== undefined && e.overdueDays > 0 && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 justify-end"><AlertTriangle className="w-3 h-3" />{e.overdueDays} d overdue</p>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => whatsapp(e)} className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg">
                <MessageCircle className="w-4 h-4" />WhatsApp
              </button>
              {e.itemKey && e.surgeryId ? (
                <>
                  <input type="date" value={dates[e.id] ?? e.dueDate ?? ''} onChange={ev => setDates(d => ({ ...d, [e.id]: ev.target.value }))}
                    className="border rounded px-2 py-1 text-sm" aria-label="Date" />
                  <button type="button" onClick={() => book(e)} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">
                    <CalendarPlus className="w-4 h-4" />Book
                  </button>
                  {e.kind === 'next_due' && (
                    <button type="button" onClick={() => closePlanItem(e.surgeryId!, e.itemKey!, 'stopped')} className="text-xs text-gray-600 underline">Healed: stop</button>
                  )}
                  {e.kind === 'template_recall' && (
                    <button type="button" onClick={() => closePlanItem(e.surgeryId!, e.itemKey!, 'cancelled')} className="text-xs text-gray-600 underline">Not needed</button>
                  )}
                </>
              ) : (
                <Link to={`/appointments/new?patientId=${e.patientId}`} className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">
                  <CalendarPlus className="w-4 h-4" />Book
                </Link>
              )}
              {e.surgeryId && <Link to={`/surgery/follow-ups/${e.surgeryId}`} className="text-xs text-blue-600 underline">Plan</Link>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
