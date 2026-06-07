import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Trophy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child } from '../types';

interface LogRow {
  id: string;
  child_id: string;
  log_date: string;
  status: string;
  reward_paid: number | string | null;
  penalty_paid: number | string | null;
  routine?: { name: string; category?: string } | null;
}

interface Stats {
  total: number;
  onTime: number;
  late: number;
  missed: number;
  inProgress: number;
  reward: number;
  penalty: number;
}

function blank(): Stats {
  return { total: 0, onTime: 0, late: 0, missed: 0, inProgress: 0, reward: 0, penalty: 0 };
}

export default function FamilyComplianceDashboard() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [window, setWindow] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);

  async function load() {
    const fam = getFamilyClient();
    const sinceMs = Date.now() - window * 24 * 3_600_000;
    const since = new Date(sinceMs).toISOString().slice(0, 10);
    const [cRes, lRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('routine_logs')
        .select('id, child_id, log_date, status, reward_paid, penalty_paid, routine:routines(name, category, parent_id)')
        .gte('log_date', since)
        .order('log_date', { ascending: false }),
    ]);
    if (cRes.error) toast.error(cRes.error.message);
    if (lRes.error) toast.error(lRes.error.message);
    const all = (lRes.data as LogRow[]) || [];
    // Filter to this parent's routines (PostgREST returns the embed; we drop rows whose routine.parent_id mismatches)
    const filtered = all.filter(r => {
      // routine embed may be missing for rows after deletion; keep them out
      const rr = (r as unknown as { routine?: { parent_id?: string } }).routine;
      return rr?.parent_id === parent.id;
    });
    setChildren((cRes.data as Child[]) || []);
    setLogs(filtered);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id, window]);

  const perChild = useMemo(() => {
    const map = new Map<string, Stats>();
    for (const c of children) map.set(c.id, blank());
    for (const l of logs) {
      const s = map.get(l.child_id);
      if (!s) continue;
      s.total++;
      if (l.status === 'completed_on_time') s.onTime++;
      else if (l.status === 'completed_late') s.late++;
      else if (l.status === 'missed') s.missed++;
      else if (l.status === 'in_progress' || l.status === 'pending') s.inProgress++;
      s.reward += Number(l.reward_paid || 0);
      s.penalty += Number(l.penalty_paid || 0);
    }
    return map;
  }, [logs, children]);

  const family = useMemo(() => {
    const agg = blank();
    perChild.forEach(s => {
      agg.total += s.total;
      agg.onTime += s.onTime;
      agg.late += s.late;
      agg.missed += s.missed;
      agg.inProgress += s.inProgress;
      agg.reward += s.reward;
      agg.penalty += s.penalty;
    });
    return agg;
  }, [perChild]);

  function pct(n: number, d: number): number {
    return d === 0 ? 0 : Math.round((n / d) * 100);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
          <BarChart3 size={18} className="text-pink-600"/> Compliance dashboard
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
            {[7, 30].map(n => (
              <button key={n} onClick={() => setWindow(n as 7 | 30)}
                className={`px-3 py-1.5 ${window === n ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                Last {n}d
              </button>
            ))}
          </div>
          <button onClick={load} title="Refresh" className="text-xs px-2 py-1 rounded border border-gray-300 inline-flex items-center gap-1 hover:bg-gray-50">
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </div>

      {/* Family summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Total routines" value={family.total} icon={<BarChart3 size={16}/>} color="text-gray-700"/>
        <Tile label="On-time %" value={`${pct(family.onTime, family.total)}%`} icon={<Trophy size={16}/>} color="text-emerald-700"/>
        <Tile label="Missed" value={family.missed} icon={<AlertTriangle size={16}/>} color="text-red-700"/>
        <Tile label="Net ₦" value={`${family.reward - family.penalty >= 0 ? '+' : ''}₦${(family.reward - family.penalty).toLocaleString()}`} icon={<TrendingUp size={16}/>} color={(family.reward - family.penalty) >= 0 ? 'text-emerald-700' : 'text-red-700'}/>
      </div>

      {/* Per-child cards */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : children.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          Add children first.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {children.map(c => {
            const s = perChild.get(c.id) || blank();
            const onTimePct = pct(s.onTime, s.total);
            const completionPct = pct(s.onTime + s.late, s.total);
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{c.first_name} {c.last_name}</div>
                    <div className="text-[11px] text-gray-500">{s.total} routine{s.total === 1 ? '' : 's'} in last {window} days</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-pink-600">{onTimePct}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">on time</div>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${pct(s.onTime, s.total)}%` }} title={`${s.onTime} on time`}/>
                  <div className="bg-amber-400 h-full" style={{ width: `${pct(s.late, s.total)}%` }} title={`${s.late} late`}/>
                  <div className="bg-red-500 h-full" style={{ width: `${pct(s.missed, s.total)}%` }} title={`${s.missed} missed`}/>
                  <div className="bg-gray-300 h-full" style={{ width: `${pct(s.inProgress, s.total)}%` }} title={`${s.inProgress} pending`}/>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                  <span>Completion: {completionPct}%</span>
                  <span>Pending: {s.inProgress}</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                  <Stat label="On time" v={s.onTime} c="text-emerald-700"/>
                  <Stat label="Late"    v={s.late}   c="text-amber-700"/>
                  <Stat label="Missed"  v={s.missed} c="text-red-700"/>
                  <Stat label="Pending" v={s.inProgress} c="text-gray-700"/>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                  <span className="text-emerald-700">+ ₦{s.reward.toLocaleString()} earned</span>
                  <span className="text-red-700">− ₦{s.penalty.toLocaleString()} penalty</span>
                  <span className={(s.reward - s.penalty) >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                    net {(s.reward - s.penalty) >= 0 ? '+' : ''}₦{(s.reward - s.penalty).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent missed list */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 inline-flex items-center gap-1">
          <AlertTriangle size={14} className="text-red-600"/> Recent missed
        </h3>
        {(() => {
          const missed = logs.filter(l => l.status === 'missed').slice(0, 10);
          if (missed.length === 0) return <div className="text-xs text-gray-500">No misses in this period. </div>;
          return (
            <ul className="divide-y divide-gray-100 text-sm">
              {missed.map(m => {
                const child = children.find(c => c.id === m.child_id);
                return (
                  <li key={m.id} className="py-1.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-gray-900">{m.routine?.name || 'Routine'}</span>
                      <span className="text-gray-500 text-xs"> — {child?.first_name || '—'} on {m.log_date}</span>
                    </div>
                    <span className="text-xs text-red-700">−₦{Number(m.penalty_paid || 0).toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </div>
    </div>
  );
}

function Tile({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="text-[11px] text-gray-500 inline-flex items-center gap-1">{icon} {label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Stat({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <div>
      <div className={`text-lg font-semibold ${c}`}>{v}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
