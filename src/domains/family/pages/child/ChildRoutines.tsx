import { useEffect, useState } from 'react';
import { Moon, Sun, Church, Sparkles, Briefcase, BookOpen, ListChecks, CheckCircle2, Clock, AlertTriangle, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ensureTodaysLogs, loadTodaysLogs, loadRecentLogs, toggleItem, settlePastUnsettled,
  deadlineCountdown, CATEGORY_LABEL,
} from '../../../../services/familyRoutines';
import type { RoutineLogFull } from '../../../../services/familyRoutines';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import { useChildCtx } from './childCtx';

const CAT_ICON: Record<string, JSX.Element> = {
  bedtime: <Moon size={14} className="text-indigo-500"/>,
  morning: <Sun size={14} className="text-amber-500"/>,
  school_readiness: <Sparkles size={14} className="text-sky-500"/>,
  church_readiness: <Church size={14} className="text-rose-500"/>,
  weekend_chores: <Briefcase size={14} className="text-emerald-500"/>,
  homework: <BookOpen size={14} className="text-fuchsia-500"/>,
  general: <ListChecks size={14} className="text-gray-500"/>,
};

function statusBadge(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-amber-100 text-amber-800',
    completed_on_time: 'bg-emerald-100 text-emerald-800',
    completed_late: 'bg-yellow-100 text-yellow-800',
    missed: 'bg-red-100 text-red-800',
  };
  const label: Record<string, string> = {
    pending: 'To do',
    in_progress: 'In progress',
    completed_on_time: 'Done ✓',
    completed_late: 'Done (late)',
    missed: 'Missed',
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${map[s] || 'bg-gray-100 text-gray-700'}`}>{label[s] || s}</span>;
}

export default function ChildRoutines() {
  const { session } = useChildCtx();
  const [logs, setLogs] = useState<RoutineLogFull[]>([]);
  const [recent, setRecent] = useState<RoutineLogFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now());

  async function refresh() {
    try {
      await settlePastUnsettled(session.child_id);
      await ensureTodaysLogs(session.parent_id, session.child_id);
      const [today, hist] = await Promise.all([
        loadTodaysLogs(session.child_id),
        loadRecentLogs(session.child_id, 7),
      ]);
      setLogs(today);
      setRecent(hist.filter(h => h.log_date !== today[0]?.log_date));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const unsub = subscribeFamilyChanges(session.parent_id, refresh);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { unsub(); window.clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.child_id]);

  async function onToggle(logId: string, itemLogId: string, currentDone: boolean) {
    try {
      await toggleItem(itemLogId, !currentDone, logId, session.child_id);
      if (!currentDone) toast.success('Nice!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const byCategory = logs.reduce<Record<string, RoutineLogFull[]>>((acc, l) => {
    const c = l.routine?.category || 'general';
    (acc[c] ||= []).push(l);
    return acc;
  }, {});
  const orderedCats = ['morning','school_readiness','church_readiness','homework','weekend_chores','general','bedtime']
    .filter(c => byCategory[c]?.length);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles size={18} className="text-pink-600"/> My routines today
        </h2>
        <button onClick={refresh} className="text-xs text-gray-500 hover:text-gray-700">refresh</button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          No routines set up for today. Ask your parent to add some in Family · Routines.
        </div>
      ) : (
        orderedCats.map(cat => (
          <section key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
              {CAT_ICON[cat]} {CATEGORY_LABEL[cat] || cat}
            </h3>
            {byCategory[cat].map(log => {
              const r = log.routine;
              const items = r?.items || [];
              const itemLogMap = new Map(log.item_logs.map(il => [il.item_id, il]));
              const reward = Number(r?.reward_amount || 0);
              const penalty = Number(r?.penalty_amount || 0);
              const cd = log.deadline_at ? deadlineCountdown(log.deadline_at, new Date(now)) : '';
              const overdue = cd.startsWith('overdue');
              const isDone = log.status === 'completed_on_time' || log.status === 'completed_late';
              return (
                <div key={log.id} className={`bg-white border rounded-xl p-3 ${isDone ? 'border-emerald-200' : overdue ? 'border-red-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{r?.name}</div>
                      <div className="text-[11px] text-gray-500 flex flex-wrap gap-2 mt-0.5">
                        {log.deadline_at && (
                          <span className={`inline-flex items-center gap-1 ${overdue && !isDone ? 'text-red-600 font-medium' : ''}`}>
                            <Clock size={11}/> by {new Date(log.deadline_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                            {!isDone && cd && <span>· {cd}</span>}
                          </span>
                        )}
                        {reward > 0 && <span className="inline-flex items-center gap-1 text-emerald-700"><Trophy size={11}/> ₦{reward.toLocaleString()}</span>}
                        {penalty > 0 && <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle size={11}/> -₦{penalty.toLocaleString()} if missed</span>}
                      </div>
                    </div>
                    {statusBadge(log.status)}
                  </div>
                  <ul className="space-y-1">
                    {items.map(it => {
                      const il = itemLogMap.get(it.id);
                      const done = !!il?.done;
                      return (
                        <li key={it.id}>
                          <button
                            disabled={isDone}
                            onClick={() => il && onToggle(log.id, il.id, done)}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition ${
                              done ? 'bg-emerald-50 text-emerald-800 line-through' : 'hover:bg-gray-50 text-gray-800'
                            } ${isDone ? 'cursor-default opacity-80' : ''}`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'}`}>
                              {done && <CheckCircle2 size={12}/>}
                            </span>
                            <span className="flex-1">{it.label}</span>
                            {it.is_required === false && <span className="text-[10px] text-gray-400">optional</span>}
                            {done && il?.done_at && (
                              <span className="text-[10px] text-emerald-600">{new Date(il.done_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {isDone && Number(log.reward_paid || 0) > 0 && (
                    <div className="mt-2 text-[11px] text-emerald-700 inline-flex items-center gap-1">
                      <Trophy size={11}/> earned ₦{Number(log.reward_paid).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}

      {recent.length > 0 && (
        <section className="pt-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Last 7 days</h3>
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
            {recent.slice(0, 14).map(r => (
              <li key={r.id} className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-gray-800 truncate">{r.routine?.name}</div>
                  <div className="text-[11px] text-gray-500">{r.log_date} · {CATEGORY_LABEL[r.routine?.category || 'general'] || r.routine?.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(r.status)}
                  {Number(r.reward_paid || 0) > 0 && <span className="text-[11px] text-emerald-700 font-mono">+₦{Number(r.reward_paid).toLocaleString()}</span>}
                  {Number(r.penalty_paid || 0) > 0 && <span className="text-[11px] text-red-700 font-mono">-₦{Number(r.penalty_paid).toLocaleString()}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
