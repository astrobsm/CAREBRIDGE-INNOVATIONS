// Family Routines — generate per-day logs, evaluate completion, auto-apply
// wallet rewards/penalties.
//
// Lifecycle:
//   1. Child opens Routines tab → ensureTodaysLogs() upserts a routine_log
//      for every active routine whose days_of_week includes today's DOW
//      and which targets this child (child_id NULL or matches).
//   2. Child toggles items → toggleItem() updates routine_item_logs and
//      recomputes the parent log's status/score.
//   3. When every required item is done, the log auto-settles:
//        - on/before deadline → status=completed_on_time, full reward
//        - after deadline    → status=completed_late, reward * partial_reward_pct%
//   4. settlePastUnsettled() runs on every login: any routine_log with
//      log_date < today and settled=false becomes status=missed and the
//      penalty is debited from the wallet.
//
// All wallet adjustments go through family.transactions so the running balance
// stays in sync (we update wallet.balance and write a transaction row).

import { getFamilyClient } from './familyClient';
import { creditWithSplit, debitFromBucket } from './familyWallets';
import type {
  Routine, RoutineItem, RoutineLog, RoutineItemLog, RoutineStatus,
} from '../domains/family/types';

const NG_TZ_OFFSET_MIN = 60; // WAT = UTC+1, no DST. Used for local-day arithmetic.

function localToday(now: Date = new Date()): string {
  const d = new Date(now.getTime() + NG_TZ_OFFSET_MIN * 60_000);
  return d.toISOString().slice(0, 10);
}

function localDow(now: Date = new Date()): number {
  const d = new Date(now.getTime() + NG_TZ_OFFSET_MIN * 60_000);
  return d.getUTCDay();
}

function buildDeadlineISO(logDate: string, deadlineTime?: string | null): string | null {
  if (!deadlineTime) return null;
  const [hStr, mStr] = deadlineTime.split(':');
  const h = Number(hStr || 0);
  const m = Number(mStr || 0);
  const [y, mo, da] = logDate.split('-').map(Number);
  // Build a Date at local WAT then shift back to UTC ISO
  const localMs = Date.UTC(y, mo - 1, da, h, m, 0) - NG_TZ_OFFSET_MIN * 60_000;
  return new Date(localMs).toISOString();
}

// ---------------------------------------------------------------------------
// Fetch routines applicable to a child today
// ---------------------------------------------------------------------------
export interface RoutineWithItems extends Routine {
  items: RoutineItem[];
}

export async function fetchApplicableRoutines(
  parentId: string,
  childId: string,
  dow: number = localDow(),
): Promise<RoutineWithItems[]> {
  const fam = getFamilyClient();
  const { data, error } = await fam
    .from('routines')
    .select('*, items:routine_items(*)')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .or(`child_id.is.null,child_id.eq.${childId}`)
    .order('sort_order', { ascending: true })
    .order('deadline_time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  const list = (data as RoutineWithItems[]) || [];
  return list
    .filter(r => Array.isArray(r.days_of_week) && r.days_of_week.includes(dow))
    .map(r => ({ ...r, items: (r.items || []).sort((a, b) => a.sort_order - b.sort_order) }));
}

// ---------------------------------------------------------------------------
// Ensure a routine_log + per-item rows exist for today
// ---------------------------------------------------------------------------
export async function ensureTodaysLogs(parentId: string, childId: string): Promise<void> {
  const fam = getFamilyClient();
  const today = localToday();
  const routines = await fetchApplicableRoutines(parentId, childId);

  for (const r of routines) {
    const deadline = buildDeadlineISO(today, r.deadline_time);
    // Upsert log
    const { data: existing } = await fam
      .from('routine_logs')
      .select('id')
      .eq('routine_id', r.id)
      .eq('child_id', childId)
      .eq('log_date', today)
      .maybeSingle();

    let logId = existing?.id as string | undefined;
    if (!logId) {
      const ins = await fam
        .from('routine_logs')
        .insert({
          routine_id: r.id,
          child_id: childId,
          log_date: today,
          deadline_at: deadline,
          status: 'pending',
        })
        .select('id')
        .single();
      if (ins.error) continue;
      logId = ins.data!.id as string;
    }

    if (!logId) continue;

    // Ensure item rows exist
    const { data: existingItems } = await fam
      .from('routine_item_logs')
      .select('item_id')
      .eq('log_id', logId);
    const have = new Set((existingItems || []).map((x: { item_id: string }) => x.item_id));
    const missing = r.items.filter(it => !have.has(it.id));
    if (missing.length > 0) {
      await fam.from('routine_item_logs').insert(
        missing.map(it => ({ log_id: logId, item_id: it.id, done: false }))
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Load today's logs (with embeds) for display
// ---------------------------------------------------------------------------
export interface RoutineLogFull extends RoutineLog {
  routine: Routine & { items: RoutineItem[] };
  item_logs: RoutineItemLog[];
}

export async function loadTodaysLogs(childId: string): Promise<RoutineLogFull[]> {
  const fam = getFamilyClient();
  const today = localToday();
  const { data, error } = await fam
    .from('routine_logs')
    .select('*, routine:routines(*, items:routine_items(*)), item_logs:routine_item_logs(*)')
    .eq('child_id', childId)
    .eq('log_date', today)
    .order('deadline_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  const rows = (data as RoutineLogFull[]) || [];
  return rows.map(r => ({
    ...r,
    routine: {
      ...r.routine,
      items: (r.routine?.items || []).sort((a, b) => a.sort_order - b.sort_order),
    },
  }));
}

export async function loadRecentLogs(childId: string, days = 7): Promise<RoutineLogFull[]> {
  const fam = getFamilyClient();
  const today = localToday();
  const [y, m, d] = today.split('-').map(Number);
  const since = new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
  const { data, error } = await fam
    .from('routine_logs')
    .select('*, routine:routines(*), item_logs:routine_item_logs(*)')
    .eq('child_id', childId)
    .gte('log_date', since)
    .order('log_date', { ascending: false });
  if (error) throw error;
  return (data as RoutineLogFull[]) || [];
}

// ---------------------------------------------------------------------------
// Toggle one item, recompute status, auto-settle if fully complete
// ---------------------------------------------------------------------------
export async function toggleItem(
  itemLogId: string,
  done: boolean,
  logId: string,
  childId: string,
): Promise<void> {
  const fam = getFamilyClient();
  await fam
    .from('routine_item_logs')
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq('id', itemLogId);
  await recomputeAndMaybeSettle(logId, childId);
}

async function recomputeAndMaybeSettle(logId: string, childId: string): Promise<void> {
  const fam = getFamilyClient();
  const { data: logRow } = await fam
    .from('routine_logs')
    .select('*, routine:routines(*, items:routine_items(*)), item_logs:routine_item_logs(*)')
    .eq('id', logId)
    .single();
  if (!logRow) return;
  const log = logRow as RoutineLogFull;
  if (log.settled) return;

  const items = log.routine?.items || [];
  const required = items.filter(i => i.is_required !== false);
  const itemLogMap = new Map(log.item_logs.map(il => [il.item_id, il]));
  const requiredDone = required.filter(i => itemLogMap.get(i.id)?.done).length;
  const allDone = required.length > 0 && requiredDone === required.length;
  const anyDone = log.item_logs.some(i => i.done);
  const score = required.length === 0 ? 100 : Math.round((requiredDone / required.length) * 100);

  if (!allDone) {
    const status: RoutineStatus = anyDone ? 'in_progress' : 'pending';
    await fam.from('routine_logs').update({
      status, score_pct: score,
      started_at: anyDone && !log.started_at ? new Date().toISOString() : log.started_at,
    }).eq('id', logId);
    return;
  }

  // All required items done → settle
  const now = new Date();
  const deadline = log.deadline_at ? new Date(log.deadline_at) : null;
  const onTime = !deadline || now <= deadline;
  const reward = Number(log.routine?.reward_amount || 0);
  const pct = log.routine?.partial_reward_pct ?? 50;
  const payout = onTime ? reward : Math.round(reward * (pct / 100) * 100) / 100;

  await fam.from('routine_logs').update({
    status: onTime ? 'completed_on_time' : 'completed_late',
    score_pct: score,
    completed_at: now.toISOString(),
    reward_paid: payout,
    settled: true,
  }).eq('id', logId);

  if (payout > 0) {
    await creditWithSplit(
      childId,
      payout,
      'bonus',
      `${onTime ? 'On-time' : 'Late'} routine: ${log.routine?.name}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Settle past unsettled logs as 'missed' and debit penalty
// ---------------------------------------------------------------------------
export async function settlePastUnsettled(childId: string): Promise<number> {
  const fam = getFamilyClient();
  const today = localToday();
  const { data, error } = await fam
    .from('routine_logs')
    .select('*, routine:routines(*)')
    .eq('child_id', childId)
    .eq('settled', false)
    .lt('log_date', today);
  if (error || !data) return 0;
  const rows = data as RoutineLogFull[];

  let count = 0;
  for (const r of rows) {
    const isDone = r.status === 'completed_on_time' || r.status === 'completed_late';
    if (isDone) {
      // partially done before — just mark settled with no penalty
      await fam.from('routine_logs').update({ settled: true }).eq('id', r.id);
      continue;
    }
    const penalty = Number(r.routine?.penalty_amount || 0);
    await fam.from('routine_logs').update({
      status: 'missed',
      penalty_paid: penalty,
      settled: true,
    }).eq('id', r.id);
    if (penalty > 0) {
      await debitFromBucket(
        childId,
        'personal',
        penalty,
        'penalty',
        `Missed: ${r.routine?.name} (${r.log_date})`,
      );
    }
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Convenience: countdown text for a deadline
// ---------------------------------------------------------------------------
export function deadlineCountdown(deadlineISO?: string | null, now: Date = new Date()): string {
  if (!deadlineISO) return '';
  const ms = new Date(deadlineISO).getTime() - now.getTime();
  if (ms <= 0) {
    const overdueMin = Math.floor(-ms / 60_000);
    if (overdueMin < 60) return `overdue by ${overdueMin}m`;
    return `overdue by ${Math.floor(overdueMin / 60)}h ${overdueMin % 60}m`;
  }
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m left`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  bedtime: 'Bedtime',
  morning: 'Morning',
  school_readiness: 'School readiness',
  church_readiness: 'Church readiness',
  weekend_chores: 'Weekend chores',
  homework: 'Homework',
  general: 'General',
};
