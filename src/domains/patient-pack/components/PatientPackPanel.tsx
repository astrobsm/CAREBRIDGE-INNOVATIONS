/**
 * "Send everything to the patient": one plain-English PDF (diagnosis and
 * plan, what to buy, cost, before and after the operation, follow-up dates),
 * by WhatsApp or download, with an editable fasting text and the log of
 * packs given. Usable on the surgery and from the procedure review.
 */
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Send, Download, Package } from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { givePatientPack } from '../patientPackService';
import { defaultFastingLines } from '../beforeSurgery';

export default function PatientPackPanel({ surgeryId, compact }: { surgeryId: string; compact?: boolean }) {
  const { user } = useAuth();
  const surgery = useLiveQuery(() => db.surgeries.get(surgeryId), [surgeryId]);
  const [fasting, setFasting] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!surgery) return;
    setFasting(surgery.patientPack?.fastingText || defaultFastingLines(surgery.anaesthesiaType).join('\n'));
  }, [surgery?.id, surgery?.anaesthesiaType, surgery?.patientPack?.fastingText]);
  if (!surgery) return null;

  const give = async (via: 'whatsapp' | 'download') => {
    if (!user) return;
    setBusy(true);
    try {
      const edited = fasting.trim() !== defaultFastingLines(surgery.anaesthesiaType).join('\n').trim() ? fasting : undefined;
      await givePatientPack(surgery.id, via, user, edited);
      toast.success(via === 'whatsapp' ? 'Patient pack shared' : 'Patient pack downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Could not make the patient pack');
    } finally { setBusy(false); }
  };
  const log = surgery.patientPack?.log ?? [];

  return (
    <div className={`border rounded-lg ${compact ? 'p-3' : 'p-4'} bg-white`} data-testid="patient-pack">
      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Package className="w-4 h-4 text-blue-600" />Send everything to the patient</h3>
      <p className="text-xs text-gray-500 mt-1">
        One plain-English PDF: diagnosis and plan, what to buy, cost, before and after the operation, and the follow-up dates. No scores.
      </p>
      <button type="button" onClick={() => setEditing(e => !e)} className="text-xs text-blue-600 underline mt-2">
        {editing ? 'Hide' : 'Check / edit'} the fasting instructions
      </button>
      {editing && (
        <textarea value={fasting} onChange={e => setFasting(e.target.value)} rows={5} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
      )}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button type="button" disabled={busy} onClick={() => give('whatsapp')} className="bg-green-600 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
          <Send className="w-4 h-4" />WhatsApp
        </button>
        <button type="button" disabled={busy} onClick={() => give('download')} className="border border-blue-600 text-blue-700 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
          <Download className="w-4 h-4" />Download
        </button>
      </div>
      {log.length > 0 && (
        <ul className="mt-3 text-xs text-gray-600 space-y-1">
          {[...log].reverse().slice(0, 5).map(l => (
            <li key={l.id}>Given {format(new Date(l.at), 'd MMM yyyy HH:mm')} by {l.byName || 'clinician'} ({l.via}): {l.contents.length} parts</li>
          ))}
        </ul>
      )}
    </div>
  );
}
