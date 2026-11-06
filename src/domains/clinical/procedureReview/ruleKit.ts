/**
 * The small toolkit plan rules are written with — core rules and procedure
 * modules alike. Use these rather than building objects by hand, so every
 * line has a reason and contributions combine the same way everywhere.
 */
import type { CounsellingPoint, PlanContribution, PlanHeading, RuleLine } from './types';

/** A plan line with its reason (and optional priority). */
export const L = (text: string, why: string, priority?: 'urgent' | 'routine'): RuleLine => ({ text, why, priority });

/** Lines under one of the fixed general headings. */
export const G = (heading: PlanHeading, ...items: RuleLine[]) => ({ heading, items });

/** A counselling point. */
export const P = (topic: string, text: string, why: string): CounsellingPoint => ({ topic, text, why });

/**
 * Combine partial contributions into one (null when nothing was given).
 * Lets a rule build its answer in parts: `return merge(a && {...}, b && {...})`.
 */
export function merge(...cs: (PlanContribution | null | undefined | false)[]): PlanContribution | null {
  const out: PlanContribution = {};
  let any = false;
  for (const c of cs) {
    if (!c) continue;
    any = true;
    if (c.problem) {
      out.problem ??= {};
      for (const [k, v] of Object.entries(c.problem)) {
        const key = k as keyof NonNullable<PlanContribution['problem']>;
        out.problem[key] = [...(out.problem[key] ?? []), ...(v ?? [])];
      }
    }
    for (const k of ['problems', 'comorbidities', 'general', 'cautions', 'counselling', 'followUp', 'dischargeCriteria'] as const) {
      const v = c[k] as unknown[] | undefined;
      if (v?.length) (out as Record<string, unknown[]>)[k] = [...((out as Record<string, unknown[]>)[k] ?? []), ...v];
    }
  }
  return any ? out : null;
}
