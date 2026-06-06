import { useEffect, useMemo, useState } from 'react';
import { Plus, CheckCircle2, Clock, Library, ListChecks, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, Task, TaskAssignment, TaskCategory, TaskPriority, TaskFrequency } from '../types';

interface AssignmentRow extends TaskAssignment {
  task?: Task;
  child?: Child;
}

const CATS: TaskCategory[] = ['chore','responsibility','academic','spiritual','health','other'];
const PRIOS: TaskPriority[] = ['low','medium','high','critical'];
const FREQS: TaskFrequency[] = ['once','daily','weekdays','weekends','weekly','monthly','custom'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const EMPTY_TPL = {
  title: '', description: '',
  category: 'chore' as TaskCategory,
  priority: 'medium' as TaskPriority,
  reward_amount: '',
  scheduled_time: '',
  duration_minutes: '',
  frequency: 'daily' as TaskFrequency,
  days_of_week: [] as number[],
};

const EMPTY_SPECIAL = {
  title: '', description: '',
  category: 'other' as TaskCategory,
  priority: 'medium' as TaskPriority,
  reward_amount: '',
  due_date: '',
  scheduled_time: '',
  duration_minutes: '',
  child_ids: [] as string[],
};

export default function FamilyTasks() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [templates, setTemplates] = useState<Task[]>([]);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'library' | 'assignments'>('library');

  // Library form
  const [showTpl, setShowTpl] = useState(false);
  const [tpl, setTpl] = useState(EMPTY_TPL);
  const [busyTpl, setBusyTpl] = useState(false);

  // Bulk assign panel
  const [assignChildId, setAssignChildId] = useState<string>('');
  const [assignDue, setAssignDue] = useState('');
  const [selectedTplIds, setSelectedTplIds] = useState<Set<string>>(new Set());
  const [busyAssign, setBusyAssign] = useState(false);

  // Special one-off task
  const [showSpecial, setShowSpecial] = useState(false);
  const [special, setSpecial] = useState(EMPTY_SPECIAL);
  const [busySpecial, setBusySpecial] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, tplRes, asRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('tasks').select('*').eq('parent_id', parent.id).eq('is_template', true).eq('is_active', true).order('category').order('title'),
      fam.from('task_assignments')
        .select('*, task:tasks!inner(*), child:children!task_assignments_child_id_fkey(*)')
        .eq('task.parent_id', parent.id)
        .order('due_date', { ascending: true, nullsFirst: false }),
    ]);
    if (asRes.error) toast.error(asRes.error.message);
    setChildren((kidsRes.data as Child[]) || []);
    setTemplates((tplRes.data as Task[]) || []);
    setRows((asRes.data as AssignmentRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  function toggleDay(d: number) {
    setTpl(t => ({
      ...t,
      days_of_week: t.days_of_week.includes(d)
        ? t.days_of_week.filter(x => x !== d)
        : [...t.days_of_week, d].sort(),
    }));
  }

  async function addTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!tpl.title) { toast.error('Title required'); return; }
    setBusyTpl(true);
    const fam = getFamilyClient();
    const { error } = await fam.from('tasks').insert({
      parent_id: parent.id,
      title: tpl.title,
      description: tpl.description || null,
      category: tpl.category,
      priority: tpl.priority,
      reward_amount: Number(tpl.reward_amount) || 0,
      is_template: true,
      is_active: true,
      scheduled_time: tpl.scheduled_time || null,
      duration_minutes: tpl.duration_minutes ? Number(tpl.duration_minutes) : null,
      frequency: tpl.frequency || null,
      days_of_week: tpl.frequency === 'custom' && tpl.days_of_week.length ? tpl.days_of_week : null,
    });
    if (error) toast.error(error.message); else toast.success('Added to library');
    setTpl(EMPTY_TPL); setShowTpl(false); setBusyTpl(false); load();
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Remove this task from the library? (Existing assignments are kept.)')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('tasks').update({ is_active: false }).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  function toggleTpl(id: string) {
    setSelectedTplIds(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllTpls() {
    setSelectedTplIds(new Set(templates.map(t => t.id)));
  }
  function clearTplSelection() { setSelectedTplIds(new Set()); }

  async function bulkAssign() {
    if (!assignChildId) { toast.error('Pick a child'); return; }
    if (selectedTplIds.size === 0) { toast.error('Pick at least one task from the library'); return; }
    setBusyAssign(true);
    const fam = getFamilyClient();
    const payload = Array.from(selectedTplIds).map(taskId => ({
      task_id: taskId,
      child_id: assignChildId,
      assigned_by: parent.id,
      due_date: assignDue || null,
    }));
    const { error } = await fam.from('task_assignments').insert(payload);
    if (error) toast.error(error.message); else toast.success(`Assigned ${payload.length} task${payload.length>1?'s':''}`);
    setSelectedTplIds(new Set());
    setBusyAssign(false);
    load();
  }

  async function assignAllToChild() {
    if (!assignChildId) { toast.error('Pick a child'); return; }
    if (templates.length === 0) { toast.error('Library is empty'); return; }
    setSelectedTplIds(new Set(templates.map(t => t.id)));
    // bulkAssign reads from state — call directly with all ids
    setBusyAssign(true);
    const fam = getFamilyClient();
    const payload = templates.map(t => ({
      task_id: t.id,
      child_id: assignChildId,
      assigned_by: parent.id,
      due_date: assignDue || null,
    }));
    const { error } = await fam.from('task_assignments').insert(payload);
    if (error) toast.error(error.message); else toast.success(`Assigned all ${payload.length} tasks`);
    setSelectedTplIds(new Set());
    setBusyAssign(false);
    load();
  }

  function toggleSpecialChild(id: string) {
    setSpecial(s => ({
      ...s,
      child_ids: s.child_ids.includes(id) ? s.child_ids.filter(x => x !== id) : [...s.child_ids, id],
    }));
  }

  async function addSpecial(e: React.FormEvent) {
    e.preventDefault();
    if (!special.title) { toast.error('Title required'); return; }
    if (special.child_ids.length === 0) { toast.error('Pick at least one child'); return; }
    setBusySpecial(true);
    const fam = getFamilyClient();
    // Create as a non-template task (one-off) so it doesn't clutter the library
    const t = await fam.from('tasks').insert({
      parent_id: parent.id,
      title: special.title,
      description: special.description || null,
      category: special.category,
      priority: special.priority,
      reward_amount: Number(special.reward_amount) || 0,
      is_template: false,
      is_active: true,
      scheduled_time: special.scheduled_time || null,
      duration_minutes: special.duration_minutes ? Number(special.duration_minutes) : null,
      frequency: 'once',
    }).select('id').single();
    if (t.error) { toast.error(t.error.message); setBusySpecial(false); return; }
    const assignments = special.child_ids.map(cid => ({
      task_id: t.data!.id,
      child_id: cid,
      assigned_by: parent.id,
      due_date: special.due_date || null,
    }));
    const a = await fam.from('task_assignments').insert(assignments);
    if (a.error) toast.error(a.error.message); else toast.success(`Special task assigned to ${assignments.length} child${assignments.length>1?'ren':''}`);
    setSpecial(EMPTY_SPECIAL); setShowSpecial(false); setBusySpecial(false); load();
  }

  async function setStatus(id: string, status: TaskAssignment['status']) {
    const fam = getFamilyClient();
    const patch: Partial<TaskAssignment> = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await fam.from('task_assignments').update(patch).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    for (const t of templates) {
      const k = t.category || 'other';
      (g[k] ||= []).push(t);
    }
    return g;
  }, [templates]);

  function freqLabel(t: Task) {
    if (!t.frequency) return '';
    if (t.frequency === 'custom' && t.days_of_week?.length) {
      return t.days_of_week.map(d => DAY_LABELS[d]).join('/');
    }
    return t.frequency;
  }
  function timeLabel(t: Task) {
    const parts: string[] = [];
    if (t.scheduled_time) parts.push(t.scheduled_time.slice(0, 5));
    if (t.duration_minutes) parts.push(`${t.duration_minutes}m`);
    return parts.join(' · ');
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          <button onClick={()=>setTab('library')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${tab==='library' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Library size={14}/> Library ({templates.length})
          </button>
          <button onClick={()=>setTab('assignments')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${tab==='assignments' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <ListChecks size={14}/> Assignments ({rows.length})
          </button>
        </div>
      </div>

      {/* LIBRARY TAB */}
      {tab === 'library' && (
        <>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>{setShowTpl(s=>!s); setShowSpecial(false);}} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
              <Plus size={14}/> {showTpl?'Cancel':'Add library task'}
            </button>
            <button onClick={()=>{setShowSpecial(s=>!s); setShowTpl(false);}} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700">
              <Plus size={14}/> {showSpecial?'Cancel':'Special / one-off task'}
            </button>
          </div>

          {showTpl && (
            <form onSubmit={addTemplate} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm md:col-span-2">Title *
                <input required placeholder="e.g. Sweep the living room" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.title} onChange={(e)=>setTpl({...tpl,title:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Description
                <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.description} onChange={(e)=>setTpl({...tpl,description:e.target.value})}/>
              </label>
              <label className="text-sm">Category
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.category} onChange={(e)=>setTpl({...tpl,category:e.target.value as TaskCategory})}>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">Priority
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.priority} onChange={(e)=>setTpl({...tpl,priority:e.target.value as TaskPriority})}>
                  {PRIOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-sm">Time of day
                <input type="time" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.scheduled_time} onChange={(e)=>setTpl({...tpl,scheduled_time:e.target.value})}/>
              </label>
              <label className="text-sm">Duration (min)
                <input type="number" min="1" placeholder="e.g. 15" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.duration_minutes} onChange={(e)=>setTpl({...tpl,duration_minutes:e.target.value})}/>
              </label>
              <label className="text-sm">Frequency
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.frequency} onChange={(e)=>setTpl({...tpl,frequency:e.target.value as TaskFrequency})}>
                  {FREQS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="text-sm">Reward (₦)
                <input type="number" min="0" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={tpl.reward_amount} onChange={(e)=>setTpl({...tpl,reward_amount:e.target.value})}/>
              </label>
              {tpl.frequency === 'custom' && (
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-600 mb-1">Days of week</div>
                  <div className="flex flex-wrap gap-1">
                    {DAY_LABELS.map((d, i)=>(
                      <button type="button" key={d} onClick={()=>toggleDay(i)} className={`px-2 py-1 rounded text-xs border ${tpl.days_of_week.includes(i) ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <button disabled={busyTpl} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busyTpl?'Saving…':'Save to library'}</button>
              </div>
            </form>
          )}

          {showSpecial && (
            <form onSubmit={addSpecial} className="bg-white border border-amber-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Special / one-off task — not saved to the library. Goes directly to the selected child(ren) as an assignment.
              </div>
              <label className="text-sm md:col-span-2">Title *
                <input required className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.title} onChange={(e)=>setSpecial({...special,title:e.target.value})}/>
              </label>
              <label className="text-sm md:col-span-2">Description
                <textarea rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.description} onChange={(e)=>setSpecial({...special,description:e.target.value})}/>
              </label>
              <label className="text-sm">Category
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.category} onChange={(e)=>setSpecial({...special,category:e.target.value as TaskCategory})}>
                  {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">Priority
                <select className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.priority} onChange={(e)=>setSpecial({...special,priority:e.target.value as TaskPriority})}>
                  {PRIOS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-sm">Time of day
                <input type="time" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.scheduled_time} onChange={(e)=>setSpecial({...special,scheduled_time:e.target.value})}/>
              </label>
              <label className="text-sm">Duration (min)
                <input type="number" min="1" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.duration_minutes} onChange={(e)=>setSpecial({...special,duration_minutes:e.target.value})}/>
              </label>
              <label className="text-sm">Due date
                <input type="datetime-local" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.due_date} onChange={(e)=>setSpecial({...special,due_date:e.target.value})}/>
              </label>
              <label className="text-sm">Reward (₦)
                <input type="number" min="0" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={special.reward_amount} onChange={(e)=>setSpecial({...special,reward_amount:e.target.value})}/>
              </label>
              <div className="md:col-span-2">
                <div className="text-xs text-gray-600 mb-1">Assign to *</div>
                <div className="flex flex-wrap gap-1">
                  {children.map(c=>(
                    <button type="button" key={c.id} onClick={()=>toggleSpecialChild(c.id)} className={`px-2 py-1 rounded text-xs border ${special.child_ids.includes(c.id) ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                      {c.first_name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <button disabled={busySpecial} className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm disabled:opacity-60">{busySpecial?'Assigning…':'Assign special task'}</button>
              </div>
            </form>
          )}

          {/* Bulk-assign bar */}
          {templates.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-600">Assign to child
                <select className="mt-1 block border rounded-md px-2 py-1.5 text-sm" value={assignChildId} onChange={e=>setAssignChildId(e.target.value)}>
                  <option value="">— Select child —</option>
                  {children.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-600">Due (optional)
                <input type="datetime-local" className="mt-1 block border rounded-md px-2 py-1.5 text-sm" value={assignDue} onChange={e=>setAssignDue(e.target.value)}/>
              </label>
              <div className="text-xs text-gray-600 flex-1">
                <div className="mb-1">Selected: <b>{selectedTplIds.size}</b> of {templates.length}</div>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllTpls} className="text-xs underline text-pink-700">select all</button>
                  <button type="button" onClick={clearTplSelection} className="text-xs underline text-gray-500">clear</button>
                </div>
              </div>
              <button disabled={busyAssign || !assignChildId || selectedTplIds.size===0} onClick={bulkAssign}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-50 hover:bg-pink-700">
                <Send size={14}/> Assign selected
              </button>
              <button disabled={busyAssign || !assignChildId} onClick={assignAllToChild}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50 hover:bg-emerald-700">
                Assign ALL
              </button>
            </div>
          )}

          {loading ? <div className="text-sm text-gray-500">Loading…</div> : templates.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
              Library is empty. Click <b>Add library task</b> to build your reusable house-task list.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.keys(grouped).sort().map(cat=>(
                <div key={cat} className="bg-white border border-gray-200 rounded-xl">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-100">{cat}</div>
                  <ul className="divide-y divide-gray-100">
                    {grouped[cat].map(t=>{
                      const checked = selectedTplIds.has(t.id);
                      const fl = freqLabel(t); const tl = timeLabel(t);
                      return (
                        <li key={t.id} className={`px-3 py-2 flex items-start gap-2 ${checked ? 'bg-pink-50' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={()=>toggleTpl(t.id)} className="mt-1" aria-label={`Select ${t.title}`}/>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-900 font-medium truncate">{t.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                              <span>{t.priority}</span>
                              {tl && <span className="font-mono">{tl}</span>}
                              {fl && <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">{fl}</span>}
                              {t.reward_amount ? <span className="text-emerald-700">₦{Number(t.reward_amount).toLocaleString()}</span> : null}
                            </div>
                            {t.description && <div className="text-xs text-gray-600 mt-0.5">{t.description}</div>}
                          </div>
                          <button type="button" onClick={()=>deleteTemplate(t.id)} title="Remove from library" aria-label="Remove from library" className="text-gray-400 hover:text-red-600 p-1">
                            <Trash2 size={14}/>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ASSIGNMENTS TAB */}
      {tab === 'assignments' && (
        loading ? <div className="text-sm text-gray-500">Loading…</div> : rows.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
            No assignments yet. Build your library, pick a child, then click <b>Assign ALL</b> or select tasks and <b>Assign selected</b>.
          </div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {rows.map(r=>{
              const t = r.task;
              const tl = t ? timeLabel(t) : '';
              const fl = t ? freqLabel(t) : '';
              return (
                <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{t?.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                      <span>{r.child?.first_name}</span>
                      <span>· {t?.category}</span>
                      <span>· {t?.priority}</span>
                      {tl && <span className="font-mono">· {tl}</span>}
                      {fl && <span>· {fl}</span>}
                      {r.due_date && <span>· due {new Date(r.due_date).toLocaleString()}</span>}
                      {t?.reward_amount ? <span className="text-emerald-700">· ₦{Number(t.reward_amount).toLocaleString()}</span> : null}
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
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
