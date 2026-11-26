/**
 * Follow-up visits from the procedure template, as dated proposals. Pure.
 *
 * Reads only the structured `schedule` on each module visit (never the
 * `when` text). Owner decisions:
 *   - a window is booked at its START (the schedule's startDay);
 *   - post_op and follow_up visits are offset from the operation, or from
 *     the discharge for "after discharge" visits (a day case is discharged
 *     the day of the operation);
 *   - ward frequencies are never booked; conditional / branching visits go
 *     on recall for the clinician to confirm, with the template text;
 *   - a recurring visit books only the next one; the one after is offered
 *     when it is completed (nextSeriesOffers).
 * Idempotent: a visit whose key is already in the surgery's plan is never
 * proposed again, so re-running never double-books.
 */
import { addDays, format, startOfDay } from 'date-fns';
import type { Appointment, Surgery, SurgeryFollowUpItem, SurgeryFollowUpPlan } from '../../../types';
import type { FollowUpVisit, ProcedureModule } from '../../clinical/procedureReview/types';

export const DEFAULT_FOLLOW_UP_TIME = '09:00';

export type ProposalAction = 'book' | 'recall' | 'pending_discharge';

export interface FollowUpProposal {
  key: string;
  moduleId: string;
  phase: 'post_op' | 'follow_up';
  when: string;
  purpose: string;
  kind: SurgeryFollowUpItem['kind'];
  from: 'operation' | 'discharge';
  day?: number;
  everyDays?: number;
  /** yyyy-MM-dd; undefined while the discharge date is unknown, or for an untimed recall. */
  dueDate?: string;
  action: ProposalAction;
}

export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function visitKey(phase: string, v: Pick<FollowUpVisit, 'when'>, occurrence = 0): string {
  return `${phase}|${v.when}|${occurrence}`;
}

export interface ProposeInput {
  module: ProcedureModule;
  operationDate: Date;
  /** Known discharge date (day case: the operation date); null while admitted. */
  dischargeDate: Date | null;
  existing?: SurgeryFollowUpPlan;
}

export function proposeFollowUps({ module, operationDate, dischargeDate, existing }: ProposeInput): FollowUpProposal[] {
  const have = new Set((existing?.items ?? []).map(i => i.key));
  const out: FollowUpProposal[] = [];
  const base = (from: 'operation' | 'discharge') => from === 'operation' ? startOfDay(operationDate) : dischargeDate ? startOfDay(dischargeDate) : null;
  for (const phase of ['post_op', 'follow_up'] as const) {
    for (const v of module.followUp?.[phase] ?? []) {
      const s = v.schedule;
      if (!s || s.kind === 'ward') continue;
      const common = { moduleId: module.id, phase, when: v.when, purpose: v.purpose, from: s.from };
      const push = (occ: number, p: Omit<FollowUpProposal, 'key' | 'moduleId' | 'phase' | 'when' | 'purpose' | 'from'>) => {
        const key = visitKey(phase, v, occ);
        if (!have.has(key)) out.push({ key, ...common, ...p });
      };
      const at = (day: number) => { const b = base(s.from); return b ? ymd(addDays(b, day)) : undefined; };
      const action = (day: number): ProposalAction => (at(day) ? 'book' : 'pending_discharge');
      if (s.kind === 'once') push(0, { kind: 'once', day: s.startDay, dueDate: at(s.startDay), action: action(s.startDay) });
      else if (s.kind === 'multi') s.days.forEach((d, i) => push(i, { kind: 'multi', day: d, dueDate: at(d), action: action(d) }));
      else if (s.kind === 'next') push(0, { kind: 'next', day: s.startDay, everyDays: s.everyDays, dueDate: at(s.startDay), action: action(s.startDay) });
      else if (s.kind === 'recall') push(0, { kind: 'recall', day: s.dueDay, dueDate: s.dueDay != null ? at(s.dueDay) : undefined, action: 'recall' });
    }
  }
  return out.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
}

/** Proposals to book grouped by date: one appointment per day, however many visits fall on it. */
export function groupByDate(proposals: FollowUpProposal[]): { date: string; proposals: FollowUpProposal[] }[] {
  const map = new Map<string, FollowUpProposal[]>();
  for (const p of proposals) {
    if (p.action !== 'book' || !p.dueDate) continue;
    map.set(p.dueDate, [...(map.get(p.dueDate) ?? []), p]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, ps]) => ({ date, proposals: ps }));
}

/** The appointment text for one day's visits: purpose + the template window, per visit. */
export function appointmentText(procedureName: string, ps: Pick<FollowUpProposal, 'purpose' | 'when'>[]) {
  return {
    reasonForVisit: `${procedureName}: ${ps.map(p => p.purpose).join('; ')}`.slice(0, 500),
    notes: ps.map(p => `${p.purpose} (template: ${p.when})`).join('\n'),
  };
}

/** The plan item for a proposal once handled. */
export function planItem(p: FollowUpProposal, status: SurgeryFollowUpItem['status'], appointmentIds: string[], now: Date, dueDate = p.dueDate): SurgeryFollowUpItem {
  return {
    key: p.key, moduleId: p.moduleId, phase: p.phase, when: p.when, purpose: p.purpose, kind: p.kind, from: p.from,
    day: p.day, dueDate, everyDays: p.everyDays, status, appointmentIds, updatedAt: now,
  };
}

/** Merge new items into a plan (existing keys win: idempotent). */
export function mergePlan(plan: SurgeryFollowUpPlan | undefined, moduleId: string, items: SurgeryFollowUpItem[], now: Date, by?: string): SurgeryFollowUpPlan {
  const base = plan ?? { moduleId, createdAt: now, createdBy: by, items: [] };
  const have = new Set(base.items.map(i => i.key));
  return { ...base, items: [...base.items, ...items.filter(i => !have.has(i.key))] };
}

/** Replace one item of a plan. */
export function updateItem(plan: SurgeryFollowUpPlan, key: string, patch: Partial<SurgeryFollowUpItem>, now: Date): SurgeryFollowUpPlan {
  return { ...plan, items: plan.items.map(i => i.key === key ? { ...i, ...patch, updatedAt: now } : i) };
}

/**
 * Pending "after discharge" items, dated now that the discharge date is
 * known, as proposals ready to book.
 */
export function dischargeProposals(plan: SurgeryFollowUpPlan | undefined, dischargeDate: Date): FollowUpProposal[] {
  return (plan?.items ?? []).filter(i => i.status === 'pending_discharge' && i.day != null).map(i => ({
    key: i.key, moduleId: i.moduleId, phase: i.phase, when: i.when, purpose: i.purpose, kind: i.kind, from: i.from,
    day: i.day, everyDays: i.everyDays, dueDate: ymd(addDays(startOfDay(dischargeDate), i.day!)), action: 'book' as const,
  }));
}

const CLOSED: Appointment['status'][] = ['completed'];
const OPEN: Appointment['status'][] = ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'rescheduled'];

export interface NextOffer { surgeryId: string; patientId: string; item: SurgeryFollowUpItem; dueDate: string; lastAppointmentId: string }

/**
 * Recurring series ("every 2 weeks until healed") whose latest visit was
 * completed and nothing later is booked: the next visit is offered,
 * everyDays after that visit.
 */
export function nextSeriesOffers(surgeries: Pick<Surgery, 'id' | 'patientId' | 'followUpPlan'>[], appointments: Appointment[]): NextOffer[] {
  const byId = new Map(appointments.map(a => [a.id, a]));
  const out: NextOffer[] = [];
  for (const s of surgeries) {
    for (const item of s.followUpPlan?.items ?? []) {
      if (item.kind !== 'next' || item.status !== 'booked' || !item.everyDays || !item.appointmentIds.length) continue;
      const appts = item.appointmentIds.map(id => byId.get(id)).filter((a): a is Appointment => !!a);
      if (appts.some(a => OPEN.includes(a.status))) continue;
      const last = appts.filter(a => CLOSED.includes(a.status))
        .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())[0];
      if (!last) continue;
      const seen = last.completedAt ? new Date(last.completedAt) : new Date(last.appointmentDate);
      out.push({ surgeryId: s.id, patientId: s.patientId, item, dueDate: ymd(addDays(startOfDay(seen), item.everyDays)), lastAppointmentId: last.id });
    }
  }
  return out;
}
