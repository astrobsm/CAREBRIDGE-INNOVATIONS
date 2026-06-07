// Readiness compliance — evaluates daily checklist + applies rewards/penalties.
// All idempotent via UNIQUE constraint on family.compliance_events(child_id, event_date, kind).
import { getFamilyClient } from '../../../services/familyClient';
import type {
  ChecklistItem, ChecklistLog, ComplianceConfig, ComplianceEvent, DayCode, Wallet,
} from '../types';

const DAY_CODES: DayCode[] = ['sun','mon','tue','wed','thu','fri','sat'];

export function todayISO(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

export function todayDayCode(d: Date = new Date()): DayCode {
  return DAY_CODES[d.getDay()];
}

export function deadlineDateForToday(cfg: ComplianceConfig, d: Date = new Date()): Date {
  const [h, m] = (cfg.deadline_time || '21:30').split(':').map(Number);
  const dl = new Date(d);
  dl.setHours(h || 21, m || 30, 0, 0);
  return dl;
}

export async function loadDefaultConfig(childId: string, parentId: string): Promise<ComplianceConfig> {
  const fam = getFamilyClient();
  const { data } = await fam.from('compliance_config').select('*').eq('child_id', childId).maybeSingle();
  if (data) return data as ComplianceConfig;
  // Auto-create defaults
  const ins = await fam.from('compliance_config').insert({
    child_id: childId, parent_id: parentId,
  }).select('*').single();
  return ins.data as ComplianceConfig;
}

export async function loadActiveItems(childId: string): Promise<ChecklistItem[]> {
  const fam = getFamilyClient();
  const { data } = await fam.from('checklist_items')
    .select('*').eq('child_id', childId).eq('is_active', true)
    .order('sort_order').order('created_at');
  return (data as ChecklistItem[]) || [];
}

export async function loadTodayLogs(childId: string, date: string = todayISO()): Promise<ChecklistLog[]> {
  const fam = getFamilyClient();
  const { data } = await fam.from('checklist_logs')
    .select('*').eq('child_id', childId).eq('log_date', date);
  return (data as ChecklistLog[]) || [];
}

export async function checkItem(childId: string, itemId: string, date: string = todayISO()): Promise<void> {
  const fam = getFamilyClient();
  await fam.from('checklist_logs').insert({
    child_id: childId, item_id: itemId, log_date: date,
  });
  // UNIQUE violation = already checked; ignore silently.
}

export async function uncheckItem(childId: string, itemId: string, date: string = todayISO()): Promise<void> {
  const fam = getFamilyClient();
  await fam.from('checklist_logs').delete()
    .eq('child_id', childId).eq('item_id', itemId).eq('log_date', date);
}

export async function loadTodayEvent(childId: string, date: string = todayISO()): Promise<ComplianceEvent | null> {
  const fam = getFamilyClient();
  const { data } = await fam.from('compliance_events')
    .select('*').eq('child_id', childId).eq('event_date', date).maybeSingle();
  return (data as ComplianceEvent) || null;
}

async function applyWalletDelta(childId: string, amount: number, kind: 'bonus'|'penalty', note: string): Promise<string | null> {
  const fam = getFamilyClient();
  const { data: w } = await fam.from('wallets').select('*').eq('child_id', childId).maybeSingle();
  if (!w) return null;
  const wallet = w as Wallet;
  const delta = kind === 'bonus' ? amount : -amount;
  const newBal = Number(wallet.balance || 0) + delta;
  await fam.from('wallets').update({ balance: newBal }).eq('id', wallet.id);
  const tx = await fam.from('transactions').insert({
    child_id: childId, wallet_id: wallet.id,
    type: kind, amount, balance_after: newBal, description: note,
  }).select('id').single();
  return (tx.data?.id as string) || null;
}

/** Evaluates today, awarding/penalising if the situation calls for it.
 *  Returns the current event (passed/failed) or null if undecided. */
export async function evaluateToday(
  cfg: ComplianceConfig,
  items: ChecklistItem[],
  logs: ChecklistLog[],
  now: Date = new Date(),
): Promise<ComplianceEvent | null> {
  if (!cfg.enabled) return null;
  const date = todayISO(now);
  const day = todayDayCode(now);
  const isActive = cfg.active_days.includes(day);
  if (!isActive) return null;

  const existing = await loadTodayEvent(cfg.child_id, date);
  if (existing) return existing;

  const checkedIds = new Set(logs.map(l => l.item_id));
  const allChecked = items.length > 0 && items.every(i => checkedIds.has(i.id));
  const deadline = deadlineDateForToday(cfg, now);

  const fam = getFamilyClient();

  // Success: all done before deadline
  if (allChecked && now <= deadline) {
    const amt = Number(cfg.reward_amount) || 0;
    const txId = amt > 0 ? await applyWalletDelta(cfg.child_id, amt, 'bonus', 'Readiness reward (all checklist items by deadline)') : null;
    const ins = await fam.from('compliance_events').insert({
      child_id: cfg.child_id, event_date: date, kind: 'day_passed', amount: amt,
      transaction_id: txId, note: 'Auto-awarded',
    }).select('*').single();
    return (ins.data as ComplianceEvent) || null;
  }

  // Failure: past deadline and not all checked
  if (!allChecked && now > deadline) {
    const amt = Number(cfg.penalty_amount) || 0;
    const txId = amt > 0 ? await applyWalletDelta(cfg.child_id, amt, 'penalty', 'Readiness penalty (checklist incomplete by deadline)') : null;
    const ins = await fam.from('compliance_events').insert({
      child_id: cfg.child_id, event_date: date, kind: 'day_failed', amount: amt,
      transaction_id: txId, note: 'Auto-penalised',
    }).select('*').single();
    return (ins.data as ComplianceEvent) || null;
  }

  return null;
}

export interface DayStatus {
  isActiveDay: boolean;
  totalItems: number;
  checkedItems: number;
  allChecked: boolean;
  deadline: Date;
  now: Date;
  beforeDeadline: boolean;
  event: ComplianceEvent | null;
}

export function summarise(cfg: ComplianceConfig, items: ChecklistItem[], logs: ChecklistLog[], event: ComplianceEvent | null, now: Date = new Date()): DayStatus {
  const day = todayDayCode(now);
  const isActiveDay = cfg.active_days.includes(day);
  const checkedIds = new Set(logs.map(l => l.item_id));
  const checkedItems = items.filter(i => checkedIds.has(i.id)).length;
  const deadline = deadlineDateForToday(cfg, now);
  return {
    isActiveDay,
    totalItems: items.length,
    checkedItems,
    allChecked: items.length > 0 && checkedItems === items.length,
    deadline,
    now,
    beforeDeadline: now <= deadline,
    event,
  };
}
