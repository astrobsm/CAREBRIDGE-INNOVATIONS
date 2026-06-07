import { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Trophy, ShieldAlert, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  loadDefaultConfig, loadActiveItems, loadTodayLogs, loadTodayEvent,
  checkItem, uncheckItem, evaluateToday, summarise, todayISO,
} from '../../services/compliance';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import type {
  ChecklistItem, ChecklistLog, ComplianceConfig, ComplianceEvent, DayStatus,
} from '../../types';
import { useChildCtx } from './childCtx';

function fmtTimeLeft(ms: number): string {
  if (ms <= 0) return 'past deadline';
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default function ChildReadiness() {
  const { session } = useChildCtx();
  const [cfg, setCfg] = useState<ComplianceConfig | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [logs, setLogs] = useState<ChecklistLog[]>([]);
  const [event, setEvent] = useState<ComplianceEvent | null>(null);
  const [status, setStatus] = useState<DayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  const reload = useCallback(async () => {
    const c = await loadDefaultConfig(session.child_id, session.parent_id);
    const [its, lgs, ev] = await Promise.all([
      loadActiveItems(session.child_id),
      loadTodayLogs(session.child_id),
      loadTodayEvent(session.child_id),
    ]);
    setCfg(c); setItems(its); setLogs(lgs); setEvent(ev);
    setStatus(summarise(c, its, lgs, ev, new Date()));
    setLoading(false);
    // Evaluate: maybe credit reward (all checked, before deadline) or apply penalty (past deadline, incomplete)
    const fresh = await evaluateToday(c, its, lgs, new Date());
    if (fresh && !ev) {
      setEvent(fresh);
      setStatus(summarise(c, its, lgs, fresh, new Date()));
      if (fresh.kind === 'day_passed') toast.success(`Great job! +₦${Number(fresh.amount).toLocaleString()} reward.`);
      else toast.error(`Missed the deadline. -₦${Number(fresh.amount).toLocaleString()}.`);
    }
  }, [session.child_id, session.parent_id]);

  useEffect(() => {
    reload();
    const unsub = subscribeFamilyChanges(session.parent_id, reload);
    const tick = setInterval(() => setNow(new Date()), 30000); // refresh countdown
    return () => { unsub(); clearInterval(tick); };
  }, [reload, session.parent_id]);

  useEffect(() => {
    if (cfg) setStatus(summarise(cfg, items, logs, event, now));
  }, [cfg, items, logs, event, now]);

  async function toggle(it: ChecklistItem) {
    if (!status) return;
    if (event) { toast('Today is already decided.', { icon: '🔒' }); return; }
    const isChecked = logs.some(l => l.item_id === it.id);
    if (isChecked) {
      await uncheckItem(session.child_id, it.id);
    } else {
      await checkItem(session.child_id, it.id);
    }
    // Optimistic refresh
    const fresh = await loadTodayLogs(session.child_id);
    setLogs(fresh);
    // Re-evaluate (may award if last item ticked before deadline)
    if (cfg && items.length > 0) {
      const ev = await evaluateToday(cfg, items, fresh, new Date());
      if (ev && !event) {
        setEvent(ev);
        if (ev.kind === 'day_passed') toast.success(`Great job! +₦${Number(ev.amount).toLocaleString()} reward.`);
      }
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  if (!cfg) return <div className="p-4 text-sm text-red-600">Could not load readiness config.</div>;

  const checkedIds = new Set(logs.map(l => l.item_id));
  const msLeft = status ? status.deadline.getTime() - now.getTime() : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500"/> Ready for tomorrow
      </h2>

      {/* Status banner */}
      {!status?.isActiveDay ? (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-900">
          Today is not a school-night. Enjoy your day! Your readiness checklist runs on
          <span className="font-medium"> {cfg.active_days.map(d=>d.toUpperCase()).join(', ')}</span>.
        </div>
      ) : event ? (
        event.kind === 'day_passed' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold"><Trophy size={18}/> Reward earned today</div>
            <div className="text-sm text-emerald-700 mt-1">+₦{Number(event.amount).toLocaleString()} added to your wallet.</div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800 font-semibold"><ShieldAlert size={18}/> Penalty applied</div>
            <div className="text-sm text-red-700 mt-1">−₦{Number(event.amount).toLocaleString()} taken from your wallet for missing the deadline.</div>
          </div>
        )
      ) : (
        <div className={`rounded-xl p-4 border ${msLeft <= 0 ? 'bg-red-50 border-red-200 text-red-900' : msLeft < 30*60000 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-pink-50 border-pink-200 text-pink-900'}`}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            {msLeft <= 0 ? <AlertTriangle size={16}/> : <Clock size={16}/>}
            Deadline {cfg.deadline_time?.slice(0,5)} — <span className="font-mono">{fmtTimeLeft(msLeft)}</span>
          </div>
          <div className="text-xs mt-1">
            Tick everything before the deadline to earn ₦{Number(cfg.reward_amount).toLocaleString()}.
            Miss it and ₦{Number(cfg.penalty_amount).toLocaleString()} is taken.
          </div>
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          Your parent has not set up any readiness items yet.
        </div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {items.map(it=>{
            const done = checkedIds.has(it.id);
            const locked = !!event || !status?.isActiveDay;
            return (
              <li key={it.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <button
                  onClick={()=>toggle(it)}
                  disabled={locked}
                  className={`flex items-center gap-3 flex-1 text-left ${locked?'opacity-70 cursor-not-allowed':''}`}
                >
                  <span className={`w-6 h-6 inline-flex items-center justify-center rounded-md border ${done?'bg-emerald-600 border-emerald-600 text-white':'border-gray-300 bg-white'}`}>
                    {done && <CheckCircle2 size={14}/>}
                  </span>
                  <span className={`text-sm ${done?'line-through text-gray-500':'text-gray-900'}`}>{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status && items.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {status.checkedItems} of {status.totalItems} done
          {status.allChecked && !event && ' — you can submit by just leaving everything ticked.'}
        </div>
      )}
    </div>
  );
}
