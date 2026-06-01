import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child } from '../types';

export default function FamilyChildren() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', gender: 'male' as 'male'|'female', stipend: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const { data, error } = await fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('created_at');
    if (error) toast.error(error.message);
    setChildren((data as Child[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.date_of_birth) return;
    setBusy(true);
    const fam = getFamilyClient();
    const ins = await fam.from('children').insert({
      parent_id: parent.id,
      first_name: form.first_name,
      last_name: form.last_name,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
    }).select('id').single();
    if (ins.error) { toast.error(ins.error.message); setBusy(false); return; }
    await fam.from('wallets').insert({
      child_id: ins.data!.id,
      balance: 0,
      base_stipend: Number(form.stipend) || 0,
    });
    toast.success('Child added');
    setForm({ first_name: '', last_name: '', date_of_birth: '', gender: 'male', stipend: '' });
    setShowForm(false);
    setBusy(false);
    load();
  }

  async function removeChild(id: string) {
    if (!window.confirm('Archive this child? Their data will be hidden.')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('children').update({ is_active: false }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Archived'); load(); }
  }

  const age = (dob: string) => {
    const yrs = (Date.now() - new Date(dob).getTime()) / (365.25 * 86400000);
    return yrs < 1 ? '<1y' : `${Math.floor(yrs)}y`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Children</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700"
        >
          <Plus size={14} /> {showForm ? 'Cancel' : 'Add child'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addChild} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">First name *
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.first_name} onChange={(e)=>setForm({...form, first_name:e.target.value})} required />
            </label>
            <label className="text-sm">Last name
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.last_name} onChange={(e)=>setForm({...form, last_name:e.target.value})} />
            </label>
            <label className="text-sm">Date of birth *
              <input type="date" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.date_of_birth} onChange={(e)=>setForm({...form, date_of_birth:e.target.value})} required />
            </label>
            <label className="text-sm">Gender
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.gender} onChange={(e)=>setForm({...form, gender:e.target.value as 'male'|'female'})}>
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">Monthly stipend (₦)
              <input type="number" min="0" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.stipend} onChange={(e)=>setForm({...form, stipend:e.target.value})} />
            </label>
          </div>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">
            {busy ? 'Saving…' : 'Save child'}
          </button>
        </form>
      )}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : children.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          No children yet. Add your first one above.
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {children.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-gray-900 text-sm">{c.first_name} {c.last_name}</div>
                <div className="text-xs text-gray-500">{age(c.date_of_birth)} · {c.gender || 'unknown'} · DOB {c.date_of_birth}</div>
              </div>
              <button onClick={()=>removeChild(c.id)} className="text-gray-400 hover:text-red-600 p-1" title="Archive">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
