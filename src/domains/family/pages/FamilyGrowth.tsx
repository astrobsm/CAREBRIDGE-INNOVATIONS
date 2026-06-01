import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, GrowthRecord } from '../types';

interface Row extends GrowthRecord { child?: Child }

export default function FamilyGrowth() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ child_id: '', record_date: new Date().toISOString().slice(0,10), weight_kg: '', height_cm: '', notes: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, grRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('growth_records').select('*, child:children!inner(*)').eq('child.parent_id', parent.id).order('record_date', { ascending: false }),
    ]);
    setChildren((kidsRes.data as Child[]) || []);
    setRows((grRes.data as Row[]) || []);
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
    if (!form.child_id) { toast.error('Pick a child'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const w = Number(form.weight_kg) || null;
    const h = Number(form.height_cm) || null;
    const bmi = w && h ? +(w / Math.pow(h/100, 2)).toFixed(2) : null;
    const { error } = await fam.from('growth_records').insert({
      child_id: form.child_id, recorded_by: parent.id, record_date: form.record_date,
      weight_kg: w, height_cm: h, bmi, notes: form.notes || null,
    });
    if (error) toast.error(error.message); else toast.success('Saved');
    setForm({ child_id: '', record_date: new Date().toISOString().slice(0,10), weight_kg: '', height_cm: '', notes: '' });
    setShow(false); setBusy(false); load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Growth records</h2>
        <button onClick={()=>setShow(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
          <Plus size={14}/> {show?'Cancel':'Add measurement'}
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
          <label className="text-sm">Weight (kg)
            <input type="number" step="0.1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.weight_kg} onChange={(e)=>setForm({...form,weight_kg:e.target.value})}/>
          </label>
          <label className="text-sm">Height (cm)
            <input type="number" step="0.1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.height_cm} onChange={(e)=>setForm({...form,height_cm:e.target.value})}/>
          </label>
          <label className="text-sm md:col-span-2">Notes
            <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/>
          </label>
          <div className="md:col-span-2">
            <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save'}</button>
          </div>
        </form>
      )}
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No growth records yet.</div>
      ) : (
        <table className="w-full bg-white border border-gray-200 rounded-xl text-sm">
          <thead className="text-xs text-gray-500 bg-gray-50">
            <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Child</th><th className="px-3 py-2 text-right">Weight</th><th className="px-3 py-2 text-right">Height</th><th className="px-3 py-2 text-right">BMI</th></tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-3 py-2">{r.record_date}</td>
                <td className="px-3 py-2">{r.child?.first_name}</td>
                <td className="px-3 py-2 text-right">{r.weight_kg ?? '—'}</td>
                <td className="px-3 py-2 text-right">{r.height_cm ?? '—'}</td>
                <td className="px-3 py-2 text-right">{r.bmi ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
