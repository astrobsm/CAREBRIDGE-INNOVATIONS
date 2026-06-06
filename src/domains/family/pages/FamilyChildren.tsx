import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { hashPin } from '../../../services/childAuth';
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
  const [credChild, setCredChild] = useState<Child | null>(null);
  const [credForm, setCredForm] = useState({ username: '', pin: '', pin2: '' });
  const [credBusy, setCredBusy] = useState(false);

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

  function openCred(c: Child) {
    setCredChild(c);
    setCredForm({ username: c.username || '', pin: '', pin2: '' });
  }

  async function saveCred(e: React.FormEvent) {
    e.preventDefault();
    if (!credChild) return;
    const u = credForm.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) { toast.error('Username: 3–30 chars, letters/digits/._-'); return; }
    const setPin = credForm.pin || credForm.pin2;
    if (setPin) {
      if (!/^\d{4,8}$/.test(credForm.pin)) { toast.error('PIN must be 4–8 digits'); return; }
      if (credForm.pin !== credForm.pin2) { toast.error('PINs do not match'); return; }
    } else if (!credChild.pin_hash) {
      toast.error('Set a PIN to enable login');
      return;
    }
    setCredBusy(true);
    const fam = getFamilyClient();
    const patch: Partial<Child> = { username: u, can_login: true };
    if (setPin) patch.pin_hash = await hashPin(credForm.pin);
    const { error } = await fam.from('children').update(patch).eq('id', credChild.id);
    setCredBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Login enabled for ${credChild.first_name}`);
    setCredChild(null);
    load();
  }

  async function disableLogin(c: Child) {
    if (!window.confirm(`Disable login for ${c.first_name}?`)) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('children').update({ can_login: false }).eq('id', c.id);
    if (error) toast.error(error.message); else { toast.success('Login disabled'); load(); }
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
              <div className="min-w-0">
                <div className="font-medium text-gray-900 text-sm">{c.first_name} {c.last_name}</div>
                <div className="text-xs text-gray-500">{age(c.date_of_birth)} · {c.gender || 'unknown'} · DOB {c.date_of_birth}</div>
                {c.can_login && c.username && (
                  <div className="text-[11px] text-emerald-700 mt-0.5 inline-flex items-center gap-1">
                    <KeyRound size={11}/> login: <span className="font-mono">{c.username}</span>
                    {c.last_login_at && <span className="text-gray-400">· last seen {new Date(c.last_login_at).toLocaleDateString()}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openCred(c)}
                  className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                  title={c.can_login ? 'Change credentials' : 'Enable self-login'}
                >
                  <KeyRound size={12}/> {c.can_login ? 'Login' : 'Enable login'}
                </button>
                {c.can_login && (
                  <button onClick={() => disableLogin(c)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50" title="Disable login">
                    Disable
                  </button>
                )}
                <button onClick={()=>removeChild(c.id)} className="text-gray-400 hover:text-red-600 p-1" title="Archive">
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {credChild && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={()=>setCredChild(null)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={saveCred} className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Self-login for {credChild.first_name}</h3>
              <p className="text-xs text-gray-500">Share these credentials with your child. They sign in at <span className="font-mono">/family/me/login</span> on any device.</p>
            </div>
            <label className="block text-sm">Username
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm font-mono"
                value={credForm.username}
                onChange={(e)=>setCredForm({...credForm, username:e.target.value})}
                placeholder="e.g. chioma2015"
                autoComplete="off"
                required
              />
              <span className="text-[11px] text-gray-500">3–30 chars · letters, digits, . _ -</span>
            </label>
            <label className="block text-sm">PIN (4–8 digits) {credChild.pin_hash && <span className="text-[11px] text-gray-500">— leave blank to keep current</span>}
              <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm tracking-widest"
                value={credForm.pin}
                onChange={(e)=>setCredForm({...credForm, pin:e.target.value})}
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm">Confirm PIN
              <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm tracking-widest"
                value={credForm.pin2}
                onChange={(e)=>setCredForm({...credForm, pin2:e.target.value})}
                autoComplete="new-password"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={()=>setCredChild(null)} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={credBusy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700 disabled:opacity-60">
                {credBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
