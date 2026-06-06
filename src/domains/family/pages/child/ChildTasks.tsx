import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../../services/familyClient';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import type { Task, TaskAssignment } from '../../types';
import { useChildCtx } from './childCtx';

interface Row extends TaskAssignment { task?: Task }

export default function ChildTasks() {
  const { session } = useChildCtx();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');

  async function load() {
    const fam = getFamilyClient();
    const { data, error } = await fam
      .from('task_assignments')
      .select('*, task:tasks(*)')
      .eq('child_id', session.child_id)
      .order('due_date', { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(session.parent_id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.child_id]);

  async function setStatus(id: string, status: TaskAssignment['status']) {
    const fam = getFamilyClient();
    const patch: Partial<TaskAssignment> = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await fam.from('task_assignments').update(patch).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  const filtered = rows.filter(r => filter === 'all' ? true : filter === 'done' ? r.status === 'completed' : r.status !== 'completed');

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">My tasks</h2>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
          {(['open','done','all'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-2.5 py-1 ${filter===f?'bg-pink-600 text-white':'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {f === 'open' ? 'To do' : f === 'done' ? 'Done' : 'All'}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          {filter === 'open' ? 'No tasks to do right now. ' : 'Nothing here yet.'}
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.map(r=>{
            const t = r.task;
            const tl: string[] = [];
            if (t?.scheduled_time) tl.push(t.scheduled_time.slice(0,5));
            if (t?.duration_minutes) tl.push(`${t.duration_minutes}m`);
            return (
              <li key={r.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{t?.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                    <span>{t?.category}</span>
                    <span>· {t?.priority}</span>
                    {tl.length > 0 && <span className="font-mono">· {tl.join(' · ')}</span>}
                    {r.due_date && <span>· due {new Date(r.due_date).toLocaleString()}</span>}
                    {t?.reward_amount ? <span className="text-emerald-700">· ₦{Number(t.reward_amount).toLocaleString()}</span> : null}
                  </div>
                  {t?.description && <div className="text-xs text-gray-600 mt-1">{t.description}</div>}
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
                      <button onClick={()=>setStatus(r.id,'completed')} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">I did it!</button>
                    </>
                  )}
                  {r.status === 'in_progress' && <Clock size={14} className="text-amber-500"/>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
