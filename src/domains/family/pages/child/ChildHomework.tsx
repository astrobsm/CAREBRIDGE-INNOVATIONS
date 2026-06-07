import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, BookOpen, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../../services/familyClient';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import type { Homework } from '../../types';
import { useChildCtx } from './childCtx';

export default function ChildHomework() {
  const { session } = useChildCtx();
  const [rows, setRows] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'open'|'done'|'all'>('open');
  const [form, setForm] = useState({ subject: '', title: '', description: '', due_date: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const { data, error } = await fam.from('homework')
      .select('*').eq('child_id', session.child_id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Homework[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(session.parent_id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.child_id]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    const fam = getFamilyClient();
    const { error } = await fam.from('homework').insert({
      child_id: session.child_id,
      subject: form.subject.trim() || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      status: 'pending',
      source: 'child',
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Assignment added');
    setForm({ subject: '', title: '', description: '', due_date: '' });
    setShowForm(false);
    load();
  }

  async function setStatus(id: string, status: Homework['status']) {
    const fam = getFamilyClient();
    const patch: Partial<Homework> = { status };
    if (status === 'done') patch.completed_at = new Date().toISOString();
    const { error } = await fam.from('homework').update(patch).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  async function remove(id: string, src: Homework['source']) {
    if (src !== 'child') { toast.error('Only your own assignments can be removed.'); return; }
    if (!window.confirm('Delete this assignment?')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('homework').delete().eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  const filtered = rows.filter(r => filter === 'all' ? true : filter === 'done' ? r.status === 'done' : r.status !== 'done');

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2"><BookOpen size={18} className="text-pink-600"/> School assignments</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
            {(['open','done','all'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`px-2.5 py-1 ${filter===f?'bg-pink-600 text-white':'bg-white text-gray-700 hover:bg-gray-50'}`}>
                {f === 'open' ? 'To do' : f === 'done' ? 'Done' : 'All'}
              </button>
            ))}
          </div>
          <button onClick={()=>setShowForm(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
            <Plus size={14}/> {showForm ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">Subject
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.subject} onChange={(e)=>setForm({...form, subject:e.target.value})} placeholder="Maths, English…"/>
            </label>
            <label className="text-sm">Due date
              <input type="date" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.due_date} onChange={(e)=>setForm({...form, due_date:e.target.value})}/>
            </label>
            <label className="text-sm sm:col-span-2">Title *
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} required placeholder="What is the assignment?"/>
            </label>
            <label className="text-sm sm:col-span-2">Details
              <textarea className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" rows={2} value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} placeholder="Pages, instructions…"/>
            </label>
          </div>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save assignment'}</button>
        </form>
      )}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          {filter === 'open' ? 'No open assignments. ' : 'Nothing here yet.'}
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.map(h=>{
            const overdue = h.status !== 'done' && h.due_date && new Date(h.due_date) < new Date(new Date().toDateString());
            return (
              <li key={h.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{h.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                    {h.subject && <span>{h.subject}</span>}
                    {h.due_date && <span className={overdue?'text-red-600 font-medium':''}>· due {h.due_date}</span>}
                    {h.source === 'parent' && <span className="text-amber-700">· set by parent</span>}
                  </div>
                  {h.description && <div className="text-xs text-gray-600 mt-1">{h.description}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {h.status === 'done' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                      <CheckCircle2 size={12}/> done
                    </span>
                  ) : (
                    <>
                      {h.status === 'pending' && (
                        <button onClick={()=>setStatus(h.id,'in_progress')} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Start</button>
                      )}
                      <button onClick={()=>setStatus(h.id,'done')} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">I did it!</button>
                    </>
                  )}
                  {h.source === 'child' && (
                    <button onClick={()=>remove(h.id, h.source)} className="text-gray-400 hover:text-red-600 p-1" title="Delete">
                      <Trash2 size={12}/>
                    </button>
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
