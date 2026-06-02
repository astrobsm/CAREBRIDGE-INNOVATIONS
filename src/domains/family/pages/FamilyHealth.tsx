import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, CheckCircle2, Activity } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, HealthRecord } from '../types';

interface Row extends HealthRecord { child?: Child | null }

// Subject value: "child:<id>" or "parent:<id>"
type SubjectVal = string;
function parseSubject(v: SubjectVal): { kind: 'child' | 'parent'; id: string } | null {
  const [kind, id] = v.split(':');
  if ((kind === 'child' || kind === 'parent') && id) return { kind, id };
  return null;
}

const EMPTY = {
  subject: '' as SubjectVal,
  record_date: new Date().toISOString().slice(0,10),
  illness: '', symptoms: '', treatment: '', doctor_name: '', hospital: '',
  systolic_bp: '', diastolic_bp: '', heart_rate: '', fasting_blood_sugar: '', temperature_c: '',
};

export default function FamilyHealth() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    // Children-owned rows (filtered via embed) + self rows (subject_parent_id = parent.id)
    const [kidsRes, kidRowsRes, selfRowsRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('health_records').select('*, child:children!inner(*)').eq('child.parent_id', parent.id).order('record_date', { ascending: false }),
      fam.from('health_records').select('*').eq('subject_parent_id', parent.id).order('record_date', { ascending: false }),
    ]);
    setChildren((kidsRes.data as Child[]) || []);
    const combined: Row[] = [
      ...(((kidRowsRes.data as Row[]) || [])),
      ...(((selfRowsRes.data as Row[]) || []).map(r => ({ ...r, child: null }))),
    ].sort((a, b) => (b.record_date || '').localeCompare(a.record_date || ''));
    setRows(combined);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const subj = parseSubject(form.subject);
    if (!subj) { toast.error('Pick who this record is for'); return; }
    const hasVitals = form.systolic_bp || form.diastolic_bp || form.heart_rate || form.fasting_blood_sugar || form.temperature_c;
    if (!form.illness && !hasVitals) { toast.error('Enter an illness or at least one vital sign'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const payload: Record<string, unknown> = {
      child_id: subj.kind === 'child' ? subj.id : null,
      subject_parent_id: subj.kind === 'parent' ? subj.id : null,
      recorded_by: parent.id,
      record_date: form.record_date,
      illness: form.illness || null,
      symptoms: form.symptoms || null,
      treatment: form.treatment || null,
      doctor_name: form.doctor_name || null,
      hospital: form.hospital || null,
      systolic_bp: form.systolic_bp ? Number(form.systolic_bp) : null,
      diastolic_bp: form.diastolic_bp ? Number(form.diastolic_bp) : null,
      heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
      fasting_blood_sugar: form.fasting_blood_sugar ? Number(form.fasting_blood_sugar) : null,
      temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
    };
    const { error } = await fam.from('health_records').insert(payload);
    if (error) toast.error(error.message); else toast.success('Saved');
    setForm(EMPTY);
    setShow(false); setBusy(false); load();
  }

  async function resolve(id: string) {
    const fam = getFamilyClient();
    const { error } = await fam.from('health_records').update({ is_resolved: true }).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  const subjectLabel = (r: Row) => r.child
    ? `${r.child.first_name}`
    : (r.subject_parent_id === parent.id ? `${parent.first_name} (self)` : 'Parent');

  function vitalsLine(r: Row) {
    const parts: string[] = [];
    if (r.systolic_bp && r.diastolic_bp) parts.push(`BP ${r.systolic_bp}/${r.diastolic_bp}`);
    if (r.heart_rate) parts.push(`HR ${r.heart_rate}`);
    if (r.fasting_blood_sugar) parts.push(`FBS ${r.fasting_blood_sugar}`);
    if (r.temperature_c) parts.push(`T ${r.temperature_c}°C`);
    return parts.join(' · ');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Health records & vitals</h2>
        <button onClick={()=>setShow(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
          <Plus size={14}/> {show?'Cancel':'New record'}
        </button>
      </div>
      {show && (
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm md:col-span-2">For *
            <select required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})}>
              <option value="">— Select person —</option>
              <optgroup label="Parents">
                <option value={`parent:${parent.id}`}>{parent.first_name} {parent.last_name} (me)</option>
              </optgroup>
              {children.length > 0 && (
                <optgroup label="Children">
                  {children.map(c=><option key={c.id} value={`child:${c.id}`}>{c.first_name} {c.last_name}</option>)}
                </optgroup>
              )}
            </select>
          </label>
          <label className="text-sm">Date *
            <input type="date" required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.record_date} onChange={(e)=>setForm({...form,record_date:e.target.value})}/>
          </label>
          <label className="text-sm">Illness (optional if logging vitals)
            <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.illness} onChange={(e)=>setForm({...form,illness:e.target.value})}/>
          </label>

          <div className="md:col-span-2 mt-2 flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
            <Activity size={14} className="text-pink-600"/> Vitals
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label>Systolic BP
              <input type="number" placeholder="120" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.systolic_bp} onChange={(e)=>setForm({...form,systolic_bp:e.target.value})}/>
            </label>
            <label>Diastolic BP
              <input type="number" placeholder="80" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.diastolic_bp} onChange={(e)=>setForm({...form,diastolic_bp:e.target.value})}/>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label>Heart rate (bpm)
              <input type="number" placeholder="72" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.heart_rate} onChange={(e)=>setForm({...form,heart_rate:e.target.value})}/>
            </label>
            <label>Temperature (°C)
              <input type="number" step="0.1" placeholder="36.6" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.temperature_c} onChange={(e)=>setForm({...form,temperature_c:e.target.value})}/>
            </label>
          </div>
          <label className="text-sm md:col-span-2">Fasting blood sugar (mg/dL, optional)
            <input type="number" step="0.1" placeholder="90" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.fasting_blood_sugar} onChange={(e)=>setForm({...form,fasting_blood_sugar:e.target.value})}/>
          </label>

          <label className="text-sm md:col-span-2">Symptoms
            <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.symptoms} onChange={(e)=>setForm({...form,symptoms:e.target.value})}/>
          </label>
          <label className="text-sm md:col-span-2">Treatment
            <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.treatment} onChange={(e)=>setForm({...form,treatment:e.target.value})}/>
          </label>
          <label className="text-sm">Doctor
            <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.doctor_name} onChange={(e)=>setForm({...form,doctor_name:e.target.value})}/>
          </label>
          <label className="text-sm">Hospital
            <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.hospital} onChange={(e)=>setForm({...form,hospital:e.target.value})}/>
          </label>
          <div className="md:col-span-2">
            <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save'}</button>
          </div>
        </form>
      )}
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No health records yet.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {rows.map(r=>{
            const vit = vitalsLine(r);
            return (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{r.illness || (vit ? 'Vitals reading' : 'Record')}</div>
                    <div className="text-xs text-gray-500">{subjectLabel(r)} · {r.record_date}{r.doctor_name ? ` · Dr. ${r.doctor_name}` : ''}{r.hospital ? ` · ${r.hospital}` : ''}</div>
                    {vit && <div className="text-xs text-pink-700 mt-1 font-mono">{vit}</div>}
                    {r.symptoms && <div className="text-xs text-gray-700 mt-1"><b>Symptoms:</b> {r.symptoms}</div>}
                    {r.treatment && <div className="text-xs text-gray-700"><b>Treatment:</b> {r.treatment}</div>}
                  </div>
                  {r.illness && (
                    r.is_resolved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                        <CheckCircle2 size={12}/> resolved
                      </span>
                    ) : (
                      <button onClick={()=>resolve(r.id)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Mark resolved</button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
