import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, Task, TaskAssignment, TaskCategory, TaskPriority } from '../types';

interface AssignmentRow extends TaskAssignment {
  task?: Task;
  child?: Child;
}

export default function FamilyTasks() {
  const { parent } = useFamilyCtx();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'chore' as TaskCategory, priority: 'medium' as TaskPriority,
    reward_amount: '', child_id: '', due_date: '',
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, asRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('task_assignments')
        .select('*, task:tasks!inner(*), child:children!inner(*)')
        .eq('task.parent_id', parent.id)
        .order('due_date', { ascending: true, nullsFirst: false }),
    ]);
    if (asRes.error) toast.error(asRes.error.message);
    setChildren((kidsRes.data as Child[]) || []);
    setRows((asRes.data as AssignmentRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.child_id) { toast.error('Title and child required'); return; }
    setBusy(true);
    const fam = getFamilyClient();
    const t = await fam.from('tasks').insert({
      parent_id: parent.id,
      title: form.title,
      description: form.description || null,
      category: form.category,
      priority: form.priority,
      reward_amount: Number(form.reward_amount) || 0,
    }).select('id').single();
    if (t.error) { toast.error(t.error.message); setBusy(false); return; }
    const a = await fam.from('task_assignments').insert({
      task_id: t.data!.id,
      child_id: form.child_id,
      assigned_by: parent.id,
      due_date: form.due_date || null,
    });
    if (a.error) toast.error(a.error.message); else toast.success('Task assigned');
    setForm({ title: '', description: '', category: 'chore', priority: 'medium', reward_amount: '', child_id: '', due_date: '' });
    setShowForm(false);
    setBusy(false);
    load();
  }

  async function setStatus(id: string, status: TaskAssignment['status']) {
    const fam = getFamilyClient();
    const patch: Partial<TaskAssignment> = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await fam.from('task_assignments').update(patch).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        <button onClick={()=>setShowForm(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
          <Plus size={14}/> {showForm ? 'Cancel' : 'New task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addTask} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm md:col-span-2">Title *
              <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required/>
            </label>
            <label className="text-sm md:col-span-2">Description
              <textarea className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" rows={2} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/>
            </label>
            <label className="text-sm">Assign to *
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.child_id} onChange={(e)=>setForm({...form,child_id:e.target.value})} required>
                <option value="">— Select child —</option>
                {children.map(c=>(<option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>))}
              </select>
            </label>
            <label className="text-sm">Due date
              <input type="datetime-local" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.due_date} onChange={(e)=>setForm({...form,due_date:e.target.value})}/>
            </label>
            <label className="text-sm">Category
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.category} onChange={(e)=>setForm({...form,category:e.target.value as TaskCategory})}>
                {['chore','responsibility','academic','spiritual','health','other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Priority
              <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value as TaskPriority})}>
                {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-sm md:col-span-2">Reward (₦)
              <input type="number" min="0" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.reward_amount} onChange={(e)=>setForm({...form,reward_amount:e.target.value})}/>
            </label>
          </div>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Assign task'}</button>
        </form>
      )}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No tasks yet.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {rows.map(r=>(
            <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">{r.task?.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {r.child?.first_name} · {r.task?.category} · {r.task?.priority}
                  {r.due_date && <> · due {new Date(r.due_date).toLocaleString()}</>}
                  {r.task?.reward_amount ? <> · ₦{Number(r.task.reward_amount).toLocaleString()}</> : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {r.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                    <CheckCircle2 size={12}/> done
                  </span>
                ) : (
                  <>
                    {r.status === 'pending' && (
                      <button onClick={()=>setStatus(r.id,'in_progress')} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Start</button>
                    )}
                    <button onClick={()=>setStatus(r.id,'completed')} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Complete</button>
                  </>
                )}
                {r.status === 'in_progress' && <Clock size={14} className="text-amber-500"/>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
