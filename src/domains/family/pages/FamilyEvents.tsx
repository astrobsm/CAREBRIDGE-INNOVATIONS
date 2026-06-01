import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, EventType, FamilyEvent } from '../types';

const TYPES: EventType[] = ['birthday','baptism','anniversary','holiday','medical','school','other'];

export default function FamilyEvents() {
  const { parent } = useFamilyCtx();
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'other' as EventType,
    event_date: '', child_id: '', is_recurring: true,
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [evRes, kidsRes] = await Promise.all([
      fam.from('events').select('*').eq('parent_id', parent.id).order('event_date'),
      fam.from('children').select('id,first_name,last_name,parent_id,date_of_birth,is_active').eq('parent_id', parent.id).eq('is_active', true),
    ]);
    setEvents((evRes.data as FamilyEvent[]) || []);
    setChildren((kidsRes.data as Child[]) || []);
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
    if (!form.title || !form.event_date) return;
    setBusy(true);
    const fam = getFamilyClient();
    const { error } = await fam.from('events').insert({
      parent_id: parent.id,
      child_id: form.child_id || null,
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      event_date: form.event_date,
      is_recurring: form.is_recurring,
    });
    if (error) toast.error(error.message); else toast.success('Event added');
    setForm({ title: '', description: '', event_type: 'other', event_date: '', child_id: '', is_recurring: true });
    setShow(false); setBusy(false); load();
  }
  async function remove(id: string) {
    if (!window.confirm('Delete event?')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('events').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  const today = new Date().toISOString().slice(0,10);
  const upcoming = events.filter(e=>e.event_date >= today);
  const past = events.filter(e=>e.event_date < today);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Events</h2>
        <button onClick={()=>setShow(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
          <Plus size={14}/> {show?'Cancel':'Add event'}
        </button>
      </div>
      {show && (
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm md:col-span-2">Title *
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required/>
            </label>
            <label className="text-sm">Date *
              <input type="date" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.event_date} onChange={(e)=>setForm({...form,event_date:e.target.value})} required/>
            </label>
            <label className="text-sm">Type
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.event_type} onChange={(e)=>setForm({...form,event_type:e.target.value as EventType})}>
                {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm md:col-span-2">For child (optional)
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.child_id} onChange={(e)=>setForm({...form,child_id:e.target.value})}>
                <option value="">— Whole family —</option>
                {children.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
            </label>
            <label className="text-sm md:col-span-2">Description
              <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/>
            </label>
            <label className="text-sm flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={form.is_recurring} onChange={(e)=>setForm({...form,is_recurring:e.target.checked})}/>
              Recurring annually
            </label>
          </div>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save event'}</button>
        </form>
      )}

      <Section title="Upcoming" items={upcoming} children={children} loading={loading} onRemove={remove}/>
      <Section title="Past" items={past} children={children} loading={false} onRemove={remove}/>
    </div>
  );
}

function Section({ title, items, children, loading, onRemove }: {
  title: string; items: FamilyEvent[]; children: Child[]; loading: boolean; onRemove: (id:string)=>void
}) {
  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">No {title.toLowerCase()} events.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {items.map(e=>{
            const c = children.find(k=>k.id===e.child_id);
            return (
              <li key={e.id} className="px-4 py-3 flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{e.title}</div>
                  <div className="text-xs text-gray-500">
                    {e.event_date} · {e.event_type} {c && <>· for {c.first_name}</>} {e.is_recurring && '· yearly'}
                  </div>
                  {e.description && <div className="text-xs text-gray-600 mt-1">{e.description}</div>}
                </div>
                <button onClick={()=>onRemove(e.id)} className="text-gray-400 hover:text-red-600 p-1" title="Delete"><Trash2 size={14}/></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
