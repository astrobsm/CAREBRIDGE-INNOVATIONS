/**
 * Discharge a day case from the surgery itself (no admission): day-surgery
 * discharge checks, then the same DischargeSummary record and PDF the
 * admission discharge produces; books the "after discharge" follow-up visits.
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import type { DischargeSummary, Patient, Surgery } from '../../../types';
import { generateDischargeSummaryPDF } from '../../../utils/dischargePdfGenerator';
import { buildDayCaseDischargeSummary, DAY_CASE_DISCHARGE_CHECKS } from '../journey/dayCase';
import { bookOnDischarge } from '../journey/followUpBooking';
import { updateSurgery } from '../journey/surgeryWrite';
import { patientText } from '../../patient-pack/locale/en';

export default function DayCaseDischargeModal({ surgery, patient, onClose }: { surgery: Surgery; patient: Patient; onClose: () => void }) {
  const { user } = useAuth();
  const note = useLiveQuery(() => db.postOperativeNotes.where('surgeryId').equals(surgery.id).first(), [surgery.id]);
  const hospital = useLiveQuery(() => (surgery.hospitalId ? db.hospitals.get(surgery.hospitalId) : undefined), [surgery.hospitalId]);
  const prescriptions = useLiveQuery(() => db.prescriptions.where('patientId').equals(patient.id).toArray(), [patient.id]);
  const [checks, setChecks] = useState<boolean[]>(DAY_CASE_DISCHARGE_CHECKS.map(() => false));
  const [condition, setCondition] = useState<DischargeSummary['conditionAtDischarge']>('stable');
  const [woundCare, setWoundCare] = useState<string>(surgery.postOperativeInstructions || patientText.pack.afterGeneric[0]);
  const [activity, setActivity] = useState<string>(patientText.pack.afterGeneric[2]);
  const [warnings, setWarnings] = useState<string>(patientText.pack.warningGeneric.join('\n'));
  const [busy, setBusy] = useState(false);

  const discharge = async () => {
    if (!user) return;
    if (!checks.every(Boolean) && !window.confirm('Not every discharge check is ticked. Discharge anyway?')) return;
    setBusy(true);
    try {
      const meds = (prescriptions ?? []).filter(p => p.encounterId === surgery.id).flatMap(p => p.medications ?? []).map(m => ({
        name: m.name, dose: m.dosage, route: String(m.route ?? ''), frequency: String(m.frequency ?? ''), duration: m.duration ?? '', purpose: '', isNew: true,
      }));
      const summary = buildDayCaseDischargeSummary({
        surgery, note: note ?? undefined, condition, woundCare, activity, warningSigns: warnings.split('\n').map(s => s.trim()).filter(Boolean),
        medications: meds, escortConfirmed: checks[5], clinicContact: hospital?.phone || '', user, now: new Date(), id: uuidv4(),
      });
      await db.dischargeSummaries.add(summary);
      void syncRecord('dischargeSummaries', summary as unknown as Record<string, unknown>);
      await updateSurgery(surgery.id, { dischargeSummaryId: summary.id });
      const n = await bookOnDischarge(patient.id, summary.dischargeDate, user, { surgeryIds: [surgery.id], dayCase: true });
      await generateDischargeSummaryPDF(summary, patient);
      toast.success(`Day case discharged${n ? `; ${n} follow-up visit(s) booked` : ''}`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Could not discharge');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" role="dialog" aria-label="Day-case discharge">
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Day-case discharge</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600">{surgery.procedureName} — {patient.firstName} {patient.lastName}</p>
        <div className="space-y-1">
          {DAY_CASE_DISCHARGE_CHECKS.map((c, i) => (
            <label key={c} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={checks[i]} onChange={e => setChecks(x => x.map((v, j) => (j === i ? e.target.checked : v)))} />{c}
            </label>
          ))}
        </div>
        <label className="block text-sm">Condition
          <select value={condition} onChange={e => setCondition(e.target.value as typeof condition)} className="block w-full border rounded px-2 py-1.5 mt-1">
            <option value="improved">Improved</option><option value="stable">Stable</option><option value="unchanged">Unchanged</option>
          </select>
        </label>
        <label className="block text-sm">Wound care
          <textarea value={woundCare} onChange={e => setWoundCare(e.target.value)} rows={2} className="block w-full border rounded px-2 py-1.5 mt-1" />
        </label>
        <label className="block text-sm">Activity
          <textarea value={activity} onChange={e => setActivity(e.target.value)} rows={2} className="block w-full border rounded px-2 py-1.5 mt-1" />
        </label>
        <label className="block text-sm">Warning signs (one per line)
          <textarea value={warnings} onChange={e => setWarnings(e.target.value)} rows={4} className="block w-full border rounded px-2 py-1.5 mt-1" />
        </label>
        <button type="button" disabled={busy} onClick={discharge} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">
          Discharge home and print the summary
        </button>
      </div>
    </div>
  );
}
