import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, CheckCircle2 } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, HealthRecord } from '../types';

interface Row extends HealthRecord { child?: Child }

export default function FamilyHealth() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    child_id: '', record_date: new Date().toISOString().slice(0,10),
    illness: '', symptoms: '', treatment: '', doctor_name: '', hospital: '',
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, hrRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('health_records').select('*, child:children!inner(*)').eq('child.parent_id', parent.id).order('record_date', { ascending: false }),
    ]);
    setChildren((kidsRes.data as Child[]) || []);
    setRows((hrRes.data as Row[]) || []);
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
    if (!form.child_id || !form.illness) { toast.error('Child and illness required'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const { error } = await fam.from('health_records').insert({
      ...form, recorded_by: parent.id,
    });
    if (error) toast.error(error.message); else toast.success('Saved');
    setForm({ child_id: '', record_date: new Date().toISOString().slice(0,10), illness: '', symptoms: '', treatment: '', doctor_name: '', hospital: '' });
    setShow(false); setBusy(false); load();
  }

  async function resolve(id: string) {
    const fam = getFamilyClient();
    const { error } = await fam.from('health_records').update({ is_resolved: true }).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Health records</h2>
        <button onClick={()=>setShow(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
          <Plus size={14}/> {show?'Cancel':'New record'}
        </button>
      </div>
      {show && (
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">Child *
            <select required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.child_id} onChange={(e)=>setForm({...form,child_id:e.target.value})}>
              <option value="">— Select —</option>
              {children.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </label>
          <label className="text-sm">Date *
            <input type="date" required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.record_date} onChange={(e)=>setForm({...form,record_date:e.target.value})}/>
          </label>
          <label className="text-sm md:col-span-2">Illness *
            <input required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.illness} onChange={(e)=>setForm({...form,illness:e.target.value})}/>
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
          {rows.map(r=>(
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{r.illness}</div>
                  <div className="text-xs text-gray-500">{r.child?.first_name} · {r.record_date} {r.doctor_name && `· Dr. ${r.doctor_name}`} {r.hospital && `· ${r.hospital}`}</div>
                  {r.symptoms && <div className="text-xs text-gray-700 mt-1"><b>Symptoms:</b> {r.symptoms}</div>}
                  {r.treatment && <div className="text-xs text-gray-700"><b>Treatment:</b> {r.treatment}</div>}
                </div>
                {r.is_resolved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                    <CheckCircle2 size={12}/> resolved
                  </span>
                ) : (
                  <button onClick={()=>resolve(r.id)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Mark resolved</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
