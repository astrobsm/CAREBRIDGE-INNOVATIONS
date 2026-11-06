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
 * The exposure line every bite needs besides wound care: rabies is endemic in
 * Nigeria and fatal once symptomatic; a human bite can transmit blood-borne
 * viruses. One wording, used by every module that records a bite.
 */
export const biteExposureLine = (context: string): RuleLine => L(
  'Bite exposure, today: for any mammal bite (dog, cat, monkey, bat) a rabies risk assessment — wash the wound with soap and running water for 15 minutes, start rabies vaccine now and add rabies immunoglobulin into and around the wound for a category III exposure (it may be stopped if a dog or cat stays healthy through 10 days of observation); for a human bite, a blood-borne-virus risk assessment (hepatitis B, HIV, hepatitis C) with post-exposure prophylaxis where indicated',
  `${context} (WHO rabies position paper 2018; NCDC rabies guidance; UKHSA human and animal bites 2020)`, 'urgent');

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
