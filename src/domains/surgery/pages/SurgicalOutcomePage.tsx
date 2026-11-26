/**
 * /surgery/outcome/:surgeryId — the 30-day (90 with an implant) outcome of
 * one operation: CDC SSI category, Clavien–Dindo graded complications,
 * return to theatre, readmission, VTE, death, and a link to the scar score.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ChevronLeft, Save } from 'lucide-react';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import type { GradedComplication, SurgicalOutcome } from '../../../types';
import ComplicationsEditor from '../components/ComplicationsEditor';
import { SSI_CATEGORIES, outcomeState, outcomeWindowDays } from '../journey/outcomes';
import { operationDate } from '../journey/procedureLink';
import { actorName } from '../journey/surgeryWrite';

export default function SurgicalOutcomePage() {
  const { surgeryId = '' } = useParams<{ surgeryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const surgery = useLiveQuery(() => db.surgeries.get(surgeryId), [surgeryId]);
  const patient = useLiveQuery(() => (surgery ? db.patients.get(surgery.patientId) : undefined), [surgery?.patientId]);
  const existing = useLiveQuery(async () => (await db.surgicalOutcomes.where('surgeryId').equals(surgeryId).first()) ?? null, [surgeryId]);
  const scarCases = useLiveQuery(() => (surgery ? db.scarCases.where('patientId').equals(surgery.patientId).toArray() : []), [surgery?.patientId]);

  const [ssi, setSsi] = useState<SurgicalOutcome['ssi']>('none');
  const [ssiDate, setSsiDate] = useState('');
  const [complications, setComplications] = useState<GradedComplication[]>([]);
  const [flags, setFlags] = useState({ returnToTheatre: false, readmission: false, vte: false, death: false });
  const [scarCaseId, setScarCaseId] = useState('');
  const [notes, setNotes] = useState('');
  const [loadedFor, setLoadedFor] = useState('');

  useEffect(() => {
    if (!surgery || existing === undefined || loadedFor === surgery.id) return;
    if (existing) {
      setSsi(existing.ssi); setSsiDate(existing.ssiDetectedOn ? format(new Date(existing.ssiDetectedOn), 'yyyy-MM-dd') : '');
      setComplications(existing.complications); setFlags({ returnToTheatre: existing.returnToTheatre, readmission: existing.readmission, vte: existing.vte, death: existing.death });
      setScarCaseId(existing.scarCaseId ?? ''); setNotes(existing.notes ?? '');
    } else {
      // Start from the complications recorded at operation.
      setComplications((surgery.complicationEntries ?? []).map(c => ({ ...c })));
    }
    setLoadedFor(surgery.id);
  }, [surgery, existing, loadedFor]);

  if (!surgery) return <div className="p-6 text-sm text-gray-500">{surgery === null ? 'Surgery not found.' : 'Loading…'}</div>;
  const st = outcomeState(surgery, existing ?? undefined, new Date());

  const save = async () => {
    if (!user) return;
    if (ssi !== 'none' && !ssiDate) { toast.error('Give the date the infection was found'); return; }
    const now = new Date();
    const row: SurgicalOutcome = {
      id: existing?.id ?? uuidv4(),
      surgeryId: surgery.id, patientId: surgery.patientId, hospitalId: surgery.hospitalId,
      procedureName: surgery.procedureName, operationDate: operationDate(surgery), windowDays: outcomeWindowDays(surgery),
      ssi, ssiDetectedOn: ssi !== 'none' && ssiDate ? new Date(ssiDate) : undefined,
      complications: complications.map(c => ({ ...c, source: c.source ?? 'outcome' })),
      ...flags,
      scarCaseId: scarCaseId || undefined, notes: notes.trim() || undefined,
      recordedBy: user.id, recordedByName: actorName(user), recordedAt: now,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    };
    await db.surgicalOutcomes.put(row);
    void syncRecord('surgicalOutcomes', row as unknown as Record<string, unknown>);
    toast.success('Outcome saved');
    navigate('/surgery/outcomes');
  };

  const box = 'bg-white rounded-lg shadow p-4 space-y-3';
  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-4" data-testid="outcome-form">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-600"><ChevronLeft className="w-4 h-4" />Back</button>
      <div>
        <h1 className="text-xl font-bold text-gray-900">{st.state === 'recorded' ? 'Outcome' : `${outcomeWindowDays(surgery)}-day outcome`}</h1>
        <p className="text-sm text-gray-600">{surgery.procedureName}{patient ? ` — ${patient.firstName} ${patient.lastName}` : ''}</p>
        <p className="text-xs text-gray-500">Operated {format(operationDate(surgery), 'd MMM yyyy')} · day {st.daysSinceOperation} · window ends {format(st.dueDate, 'd MMM yyyy')}{surgery.implantPlaced ? ' (implant: 90 days)' : ''}</p>
      </div>

      <section className={box}>
        <h2 className="text-sm font-semibold">Surgical site infection (CDC)</h2>
        {SSI_CATEGORIES.map(c => (
          <label key={c.value} className="flex items-start gap-2 text-sm">
            <input type="radio" name="ssi" className="mt-1" checked={ssi === c.value} onChange={() => setSsi(c.value)} />
            <span><span className="font-medium">{c.label}</span>{c.help && <span className="block text-xs text-gray-500">{c.help}</span>}</span>
          </label>
        ))}
        {ssi !== 'none' && (
          <label className="block text-sm">Date found
            <input type="date" value={ssiDate} onChange={e => setSsiDate(e.target.value)} className="block border rounded px-2 py-1 mt-1" />
          </label>
        )}
      </section>

      <section className={box}>
        <h2 className="text-sm font-semibold">Complications (Clavien–Dindo)</h2>
        <ComplicationsEditor value={complications} onChange={setComplications} source="outcome" />
      </section>

      <section className={box}>
        <h2 className="text-sm font-semibold">Within the window</h2>
        {([['returnToTheatre', 'Return to theatre'], ['readmission', 'Readmission'], ['vte', 'Venous thromboembolism (DVT / PE)'], ['death', 'Death']] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={flags[k]} onChange={e => setFlags(f => ({ ...f, [k]: e.target.checked }))} />{label}
          </label>
        ))}
        {flags.death && !complications.some(c => c.grade === 'V') && <p className="text-xs text-amber-700">Add the complication that led to death as grade V.</p>}
      </section>

      <section className={box}>
        <h2 className="text-sm font-semibold">Scar (VSS / POSAS)</h2>
        <p className="text-xs text-gray-500">Scar scores are recorded in the Scar Monitor; link the scar here.</p>
        <select value={scarCaseId} onChange={e => setScarCaseId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
          <option value="">No scar linked</option>
          {(scarCases ?? []).map(sc => <option key={sc.id} value={sc.id}>{sc.label || sc.anatomicalSite}</option>)}
        </select>
        <Link to="/scar-monitor" className="text-sm text-blue-600 underline">Open the Scar Monitor</Link>
      </section>

      <section className={box}>
        <h2 className="text-sm font-semibold">Notes</h2>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
      </section>

      <button type="button" onClick={save} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
        <Save className="w-4 h-4" />Save outcome
      </button>
    </div>
  );
}
