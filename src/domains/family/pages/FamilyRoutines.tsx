import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Save, X, Moon, Sun, Church, Sparkles, Briefcase, BookOpen, ListChecks, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, Routine, RoutineCategory, RoutineItem } from '../types';

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CATS: { value: RoutineCategory; icon: JSX.Element; label: string }[] = [
  { value: 'bedtime',          icon: <Moon size={14} className="text-indigo-500"/>,   label: 'Bedtime' },
  { value: 'morning',          icon: <Sun size={14} className="text-amber-500"/>,     label: 'Morning' },
  { value: 'school_readiness', icon: <Sparkles size={14} className="text-sky-500"/>,  label: 'School readiness' },
  { value: 'church_readiness', icon: <Church size={14} className="text-rose-500"/>,   label: 'Church readiness' },
  { value: 'weekend_chores',   icon: <Briefcase size={14} className="text-emerald-500"/>, label: 'Weekend chores' },
  { value: 'homework',         icon: <BookOpen size={14} className="text-fuchsia-500"/>, label: 'Homework' },
  { value: 'general',          icon: <ListChecks size={14} className="text-gray-500"/>,   label: 'General' },
];
const catMap = Object.fromEntries(CATS.map(c => [c.value, c]));

interface RoutineWithItems extends Routine {
  items: RoutineItem[];
}

interface FormState {
  id?: string;
  name: string;
  category: RoutineCategory;
  description: string;
  child_id: string;       // '' = all
  days_of_week: number[];
  deadline_time: string;  // HH:MM
  reward_amount: string;
  penalty_amount: string;
  partial_reward_pct: number;
  is_active: boolean;
  items: { id?: string; label: string; is_required: boolean }[];
}

const blankForm = (): FormState => ({
  name: '', category: 'general', description: '', child_id: '',
  days_of_week: [0,1,2,3,4,5,6], deadline_time: '',
  reward_amount: '', penalty_amount: '', partial_reward_pct: 50,
  is_active: true, items: [{ label: '', is_required: true }],
});

interface Preset { name: string; category: RoutineCategory; days: number[]; time: string; items: string[]; reward: string; penalty: string; }

const PRESETS: Preset[] = [
  { name: 'Bedtime routine',         category: 'bedtime',          days: [0,1,2,3,4,5,6], time: '21:30', items: ['Bath / wash up','Brush teeth','Lay out clothes for tomorrow','Night prayers','Lights out'], reward: '50', penalty: '50' },
  { name: 'Morning routine',         category: 'morning',          days: [0,1,2,3,4,5,6], time: '06:30', items: ['Wake up at alarm','Make bed','Brush teeth','Morning prayers','Get dressed'], reward: '50', penalty: '50' },
  { name: 'School-day readiness',    category: 'school_readiness', days: [0,1,2,3,4],     time: '21:30', items: ['Uniform ironed','School bag packed','Lunchbox ready','Homework in bag','Water bottle filled'], reward: '100', penalty: '100' },
  { name: 'Sunday church readiness', category: 'church_readiness', days: [0],             time: '08:00', items: ['Bath & dress smartly','Bible & offering ready','Memory verse reviewed','Eat breakfast','In car on time'], reward: '100', penalty: '50' },
  { name: 'Weekend chores',          category: 'weekend_chores',   days: [6],             time: '12:00', items: ['Tidy bedroom','Help with dishes','Sweep / clean area','Take out trash'], reward: '200', penalty: '0' },
  { name: 'Daily homework',          category: 'homework',         days: [0,1,2,3,4],     time: '20:00', items: ['All homework attempted','Books reviewed for tomorrow','Reading practice (15 min)'], reward: '100', penalty: '50' },
];

export default function FamilyRoutines() {
  const { parent } = useFamilyCtx();
  const [routines, setRoutines] = useState<RoutineWithItems[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [rRes, cRes] = await Promise.all([
      fam.from('routines').select('*, items:routine_items(*)').eq('parent_id', parent.id).order('sort_order').order('deadline_time', { ascending: true, nullsFirst: false }),
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
    ]);
    if (rRes.error) toast.error(rRes.error.message);
    setRoutines((rRes.data as RoutineWithItems[]) || []);
    setChildren((cRes.data as Child[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  function startNew() { setForm(blankForm()); }
  function applyPreset(p: Preset) {
    setForm(f => ({
      ...(f || blankForm()),
      name: p.name, category: p.category, days_of_week: p.days, deadline_time: p.time,
      reward_amount: p.reward, penalty_amount: p.penalty, partial_reward_pct: 50,
      items: p.items.map(label => ({ label, is_required: true })),
    }));
  }
  function startEdit(r: RoutineWithItems) {
    setForm({
      id: r.id, name: r.name, category: r.category, description: r.description || '',
      child_id: r.child_id || '',
      days_of_week: r.days_of_week || [0,1,2,3,4,5,6],
      deadline_time: (r.deadline_time || '').slice(0,5),
      reward_amount: String(r.reward_amount ?? ''),
      penalty_amount: String(r.penalty_amount ?? ''),
      partial_reward_pct: r.partial_reward_pct ?? 50,
      is_active: r.is_active ?? true,
      items: (r.items || []).sort((a,b)=>a.sort_order-b.sort_order).map(i => ({ id: i.id, label: i.label, is_required: i.is_required ?? true })),
    });
  }

  function toggleDay(d: number) {
    if (!form) return;
    setForm({ ...form, days_of_week: form.days_of_week.includes(d) ? form.days_of_week.filter(x=>x!==d) : [...form.days_of_week, d].sort() });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const items = form.items.map(i => ({ ...i, label: i.label.trim() })).filter(i => i.label);
    if (items.length === 0) { toast.error('Add at least one checklist item'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const payload = {
      parent_id: parent.id,
      child_id: form.child_id || null,
      name: form.name.trim(),
      category: form.category,
      description: form.description || null,
      days_of_week: form.days_of_week,
      deadline_time: form.deadline_time || null,
      reward_amount: form.reward_amount ? Number(form.reward_amount) : 0,
      penalty_amount: form.penalty_amount ? Number(form.penalty_amount) : 0,
      partial_reward_pct: form.partial_reward_pct,
      is_active: form.is_active,
    };

    let routineId = form.id;
    if (routineId) {
      const up = await fam.from('routines').update(payload).eq('id', routineId);
      if (up.error) { toast.error(up.error.message); setBusy(false); return; }
    } else {
      const ins = await fam.from('routines').insert(payload).select('id').single();
      if (ins.error) { toast.error(ins.error.message); setBusy(false); return; }
      routineId = ins.data!.id as string;
    }

    // Reconcile items: delete missing, upsert rest
    const existing = await fam.from('routine_items').select('id').eq('routine_id', routineId);
    const existingIds = new Set((existing.data || []).map((x: { id: string }) => x.id));
    const keptIds = new Set(items.filter(i => i.id).map(i => i.id!));
    const toDelete = [...existingIds].filter(id => !keptIds.has(id));
    if (toDelete.length > 0) await fam.from('routine_items').delete().in('id', toDelete);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.id) {
        await fam.from('routine_items').update({ label: it.label, is_required: it.is_required, sort_order: i }).eq('id', it.id);
      } else {
        await fam.from('routine_items').insert({ routine_id: routineId, label: it.label, is_required: it.is_required, sort_order: i });
      }
    }

    toast.success(form.id ? 'Routine updated' : 'Routine created');
    setForm(null);
    setBusy(false);
    load();
  }

  async function remove(r: RoutineWithItems) {
    if (!window.confirm(`Delete routine "${r.name}"? Past logs will be removed too.`)) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('routines').delete().eq('id', r.id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  }
  async function toggleActive(r: RoutineWithItems) {
    const fam = getFamilyClient();
    const { error } = await fam.from('routines').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-pink-600"/> Routines
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Bedtime · morning · school · church · weekend chores · homework. Auto reward on time, penalty if missed.
          </p>
        </div>
        {!form && (
          <button onClick={startNew} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
            <Plus size={14}/> New routine
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{form.id ? 'Edit routine' : 'New routine'}</h3>
            <button type="button" onClick={()=>setForm(null)} title="Close" className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
          </div>

          {!form.id && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-2.5">
              <div className="text-[11px] font-semibold text-pink-900 mb-1.5 inline-flex items-center gap-1"><Wand2 size={11}/> Start from a preset:</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button type="button" key={p.name} onClick={()=>applyPreset(p)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white border border-pink-200 hover:bg-pink-100 text-pink-800">
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm md:col-span-2">Name *
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required/>
            </label>
            <label className="text-sm">Category
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.category} onChange={(e)=>setForm({...form, category:e.target.value as RoutineCategory})}>
                {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="text-sm">Applies to
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.child_id} onChange={(e)=>setForm({...form, child_id:e.target.value})}>
                <option value="">All children</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </label>
            <label className="text-sm">Deadline time (24h)
              <input type="time" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.deadline_time} onChange={(e)=>setForm({...form, deadline_time:e.target.value})}/>
            </label>
            <div className="text-sm">
              <span className="block mb-1">Active days</span>
              <div className="flex gap-1">
                {DAY_LABELS.map((d, i) => (
                  <button type="button" key={d} onClick={()=>toggleDay(i)}
                    className={`text-[11px] px-2 py-1 rounded ${form.days_of_week.includes(i) ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-sm">Reward ₦ (on time)
              <input type="number" min="0" step="0.01" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.reward_amount} onChange={(e)=>setForm({...form, reward_amount:e.target.value})}/>
            </label>
            <label className="text-sm">Penalty ₦ (if missed)
              <input type="number" min="0" step="0.01" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.penalty_amount} onChange={(e)=>setForm({...form, penalty_amount:e.target.value})}/>
            </label>
            <label className="text-sm">Late-completion reward %
              <input type="number" min="0" max="100" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.partial_reward_pct} onChange={(e)=>setForm({...form, partial_reward_pct:Number(e.target.value)})}/>
            </label>
            <label className="text-sm flex items-end gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e)=>setForm({...form, is_active:e.target.checked})}/>
              Active
            </label>
            <label className="text-sm md:col-span-2">Description (optional)
              <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})}/>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Checklist items</span>
              <button type="button" onClick={()=>setForm({...form, items:[...form.items, { label:'', is_required:true }]})}
                className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
                <Plus size={11}/> Add item
              </button>
            </div>
            <ul className="space-y-1">
              {form.items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <input className="flex-1 border rounded-md px-2 py-1 text-sm" placeholder={`Item ${idx+1}`}
                    value={it.label} onChange={(e)=>{
                      const items = [...form.items]; items[idx] = { ...it, label:e.target.value }; setForm({...form, items});
                    }}/>
                  <label className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                    <input type="checkbox" checked={it.is_required} onChange={(e)=>{
                      const items = [...form.items]; items[idx] = { ...it, is_required:e.target.checked }; setForm({...form, items});
                    }}/>
                    required
                  </label>
                  <button type="button" title="Remove item" onClick={()=>{
                    const items = form.items.filter((_,i)=>i!==idx); setForm({...form, items: items.length ? items : [{ label:'', is_required:true }]});
                  }} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={()=>setForm(null)} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
            <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700 disabled:opacity-60 inline-flex items-center gap-1">
              <Save size={14}/> {busy ? 'Saving…' : (form.id ? 'Update routine' : 'Create routine')}
            </button>
          </div>
        </form>
      )}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : routines.length === 0 && !form ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          No routines yet. Click <b>New routine</b> and pick a preset to get started.
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {routines.map(r => {
            const cat = catMap[r.category] || catMap.general;
            const childLabel = r.child_id ? children.find(c=>c.id===r.child_id)?.first_name || 'one child' : 'All children';
            const days = (r.days_of_week || []).map(d => DAY_LABELS[d]).join(',');
            return (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      {cat.icon} {r.name}
                      {!r.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">paused</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {cat.label} · {childLabel} · {days || 'no days'} · deadline {r.deadline_time?.slice(0,5) || '—'}
                      {' · '}
                      <span className="text-emerald-700">+₦{Number(r.reward_amount||0).toLocaleString()}</span>
                      {' / '}
                      <span className="text-red-700">-₦{Number(r.penalty_amount||0).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {r.items?.length || 0} item{r.items?.length === 1 ? '' : 's'}: {(r.items || []).slice(0,4).map(i=>i.label).join(' · ')}{r.items && r.items.length > 4 ? ' …' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={()=>toggleActive(r)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
                      {r.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={()=>startEdit(r)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-1"><Edit3 size={12}/> Edit</button>
                    <button onClick={()=>remove(r)} title="Delete routine" className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
