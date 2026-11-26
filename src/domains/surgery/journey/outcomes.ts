/**
 * The outcome registry: one 30-day outcome per operation (90 days when an
 * implant was left in place), and the audit summary.
 *
 * SSI categories: CDC/NHSN Patient Safety Component Manual, chapter 9
 * (Surgical Site Infection Event): superficial incisional (skin and
 * subcutaneous tissue, within 30 days), deep incisional (fascia and muscle,
 * within 30 or 90 days), organ/space (any part deeper than fascia/muscle
 * opened or manipulated, within 30 or 90 days). NHSN uses 90-day surveillance
 * for implant-related procedures; here an implant left in place extends the
 * window to 90 days.
 * Complications: Clavien–Dindo (Dindo 2004; Clavien 2009) — see clavienDindo.ts.
 * Scar outcome: VSS / POSAS in the Scar Monitor (linked, not copied).
 * No licensed PROMs.
 */
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { ClavienDindoGrade, Surgery, SurgicalOutcome } from '../../../types';
import { GRADE_ORDER, highestGrade } from './clavienDindo';
import { operationDate } from './procedureLink';

export const SSI_CATEGORIES: { value: SurgicalOutcome['ssi']; label: string; help: string }[] = [
  { value: 'none', label: 'No surgical site infection', help: '' },
  { value: 'superficial_incisional', label: 'Superficial incisional SSI', help: 'Skin and subcutaneous tissue of the incision, within 30 days: purulent drainage, organism isolated, or pain/tenderness, swelling, redness or heat with the incision opened, or a diagnosis by the surgeon.' },
  { value: 'deep_incisional', label: 'Deep incisional SSI', help: 'Deep soft tissues of the incision (fascia, muscle), within 30 days (90 with an implant): purulent drainage from the deep incision, dehiscence or deliberate opening with fever or local pain, or an abscess.' },
  { value: 'organ_space', label: 'Organ / space SSI', help: 'Any part deeper than fascia or muscle that was opened or manipulated, within 30 days (90 with an implant): purulent drainage from a drain into the space, organism isolated, or an abscess.' },
];

export const outcomeWindowDays = (s: Pick<Surgery, 'implantPlaced'>): 30 | 90 => (s.implantPlaced ? 90 : 30);

export type OutcomeState = 'recorded' | 'open' | 'due' | 'overdue';

/**
 * Where the outcome check stands: 'open' while inside the window, 'due' in
 * the last 7 days of it and the week after, 'overdue' later; 'recorded' when done.
 */
export function outcomeState(s: Surgery, outcome: SurgicalOutcome | undefined, now: Date): { state: OutcomeState; dueDate: Date; daysSinceOperation: number } {
  const op = startOfDay(operationDate(s));
  const dueDate = addDays(op, outcomeWindowDays(s));
  const daysSinceOperation = differenceInCalendarDays(startOfDay(now), op);
  if (outcome) return { state: 'recorded', dueDate, daysSinceOperation };
  const toDue = differenceInCalendarDays(dueDate, startOfDay(now));
  return { state: toDue > 7 ? 'open' : toDue >= -7 ? 'due' : 'overdue', dueDate, daysSinceOperation };
}

/** Completed operations whose outcome check is due or overdue (for the Today screen). */
export function outcomesDue(surgeries: Surgery[], outcomes: SurgicalOutcome[], now: Date) {
  const by = new Map(outcomes.map(o => [o.surgeryId, o]));
  return surgeries
    .filter(s => s.status === 'completed')
    .map(s => ({ surgery: s, ...outcomeState(s, by.get(s.id), now) }))
    .filter(x => x.state === 'due' || x.state === 'overdue')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export interface OutcomeCounts {
  operations: number;
  recorded: number;
  ssi: number;
  /** SSI / recorded outcomes (null when nothing is recorded). */
  ssiRate: number | null;
  ssiByCategory: Record<Exclude<SurgicalOutcome['ssi'], 'none'>, number>;
  /** Operations with at least one complication. */
  withComplication: number;
  /** Operations by their highest Clavien–Dindo grade. */
  byHighestGrade: Record<ClavienDindoGrade, number>;
  returnToTheatre: number;
  readmission: number;
  vte: number;
  death: number;
}

export interface OutcomeSummary extends OutcomeCounts {
  byProcedure: ({ procedure: string } & OutcomeCounts)[];
  byWoundClass: { woundClass: string; recorded: number; ssi: number; ssiRate: number | null }[];
}

const zeroGrades = () => Object.fromEntries(GRADE_ORDER.map(g => [g, 0])) as Record<ClavienDindoGrade, number>;

function count(ops: Surgery[], outs: SurgicalOutcome[]): OutcomeCounts {
  const c: OutcomeCounts = {
    operations: ops.length, recorded: outs.length, ssi: 0, ssiRate: null,
    ssiByCategory: { superficial_incisional: 0, deep_incisional: 0, organ_space: 0 },
    withComplication: 0, byHighestGrade: zeroGrades(), returnToTheatre: 0, readmission: 0, vte: 0, death: 0,
  };
  for (const o of outs) {
    if (o.ssi !== 'none') { c.ssi++; c.ssiByCategory[o.ssi]++; }
    const g = highestGrade(o.complications) ?? (o.death ? 'V' : null);
    if (g) { c.withComplication++; c.byHighestGrade[g]++; }
    if (o.returnToTheatre) c.returnToTheatre++;
    if (o.readmission) c.readmission++;
    if (o.vte) c.vte++;
    if (o.death) c.death++;
  }
  c.ssiRate = outs.length ? c.ssi / outs.length : null;
  return c;
}

/** The audit summary over completed operations and their recorded outcomes. Pure. */
export function summariseOutcomes(surgeries: Surgery[], outcomes: SurgicalOutcome[], range?: { from?: Date; to?: Date }): OutcomeSummary {
  const inRange = (d: Date) => (!range?.from || d >= range.from) && (!range?.to || d <= range.to);
  const ops = surgeries.filter(s => s.status === 'completed' && inRange(operationDate(s)));
  const ids = new Set(ops.map(s => s.id));
  const outs = outcomes.filter(o => ids.has(o.surgeryId));
  const outBy = new Map(outs.map(o => [o.surgeryId, o]));
  const procs = [...new Set(ops.map(s => s.procedureName))].sort();
  const classes = [...new Set(ops.map(s => s.woundClass ?? 'not recorded'))].sort();
  return {
    ...count(ops, outs),
    byProcedure: procs.map(p => {
      const ps = ops.filter(s => s.procedureName === p);
      return { procedure: p, ...count(ps, ps.map(s => outBy.get(s.id)).filter((o): o is SurgicalOutcome => !!o)) };
    }),
    byWoundClass: classes.map(w => {
      const os = ops.filter(s => (s.woundClass ?? 'not recorded') === w).map(s => outBy.get(s.id)).filter((o): o is SurgicalOutcome => !!o);
      const ssi = os.filter(o => o.ssi !== 'none').length;
      return { woundClass: w, recorded: os.length, ssi, ssiRate: os.length ? ssi / os.length : null };
    }),
  };
}

export const pct = (r: number | null) => (r == null ? '—' : `${(r * 100).toFixed(1)}%`);
