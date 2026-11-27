/**
 * Saved derm & rheum consults. They live on the clerking plan record
 * (Dexie clerkingPlans, cloud clerking_plans.derm_rheum JSONB), not in a
 * table of their own: a consult belongs to the plan its lines are accepted
 * into. Photos are never stored here, only how many were sent.
 */
import type { PlanLine } from '../clinical/clerkingPlan/types';
import type { LineDecision } from '../clinical/clerkingPlan/finalPlan';
import type { DermConsult } from './consult';
import type { DermHardRule, RuleCheck } from './hardRules';
import type { Candidate, ScreenFlag } from './screen';

export interface DermRheumConsultRecord {
  id: string;
  at: string;
  by?: string;
  byName?: string;
  kbVersion: string;
  screenVersion: string;
  /** Rules-plan inputs hash when the consult was made (stale marker). */
  inputsHash: string;
  photosSent: number;
  description?: string;
  deterministic: { flags: ScreenFlag[]; candidates: Candidate[]; hardRules: DermHardRule[] };
  consult: DermConsult;
  lines: PlanLine[];
  checks: RuleCheck[];
  missingHardRules: string[];
}

/** Lines the plan shows: the latest consult's, plus any accepted from older consults. */
export function dermRheumLines(consults: DermRheumConsultRecord[] | null | undefined, decisions: LineDecision[]): PlanLine[] {
  const list = consults ?? [];
  if (!list.length) return [];
  const latest = list[list.length - 1];
  const accepted = new Set(decisions.filter(d => d.decision === 'accepted').map(d => d.lineId));
  const out = [...latest.lines];
  for (const c of list.slice(0, -1)) for (const l of c.lines) if (accepted.has(l.id) && !out.some(x => x.id === l.id)) out.push(l);
  return out;
}

export const latestConsult = (consults: DermRheumConsultRecord[] | null | undefined) => (consults?.length ? consults[consults.length - 1] : undefined);
