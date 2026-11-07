/**
 * Pure helpers for stored nutrition assessments. No database import: the
 * Dexie v93 upgrade (src/database/db.ts) uses normaliseLegacyMust.
 */

import type { MUSTScore } from '../types';

const step = <T extends number>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === 'number' && (allowed as readonly number[]).includes(v) ? (v as T) : null;

/**
 * An older assessment may hold the MUST breakdown object in `mustScore`
 * ({ bmiScore, weightLossScore, acuteIllnessScore, totalScore, riskLevel|risk }).
 * Move it to `mustBreakdown` and keep the integer total in `mustScore`.
 * Returns true when the record was changed. Mutates in place (Dexie modify).
 */
export function normaliseLegacyMust(a: Record<string, unknown>): boolean {
  const m = a.mustScore;
  if (m === null || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  const total = typeof o.totalScore === 'number' ? o.totalScore : typeof o.total === 'number' ? o.total : null;
  const bmi = step(o.bmiScore, [0, 1, 2] as const);
  const wl = step(o.weightLossScore, [0, 1, 2] as const);
  const acute = step(o.acuteIllnessScore, [0, 2] as const);
  const riskRaw = o.riskLevel ?? o.risk;
  const risk = riskRaw === 'low' || riskRaw === 'medium' || riskRaw === 'high' ? riskRaw : null;
  if (total !== null && bmi !== null && wl !== null && acute !== null && risk !== null && !a.mustBreakdown) {
    const breakdown: MUSTScore = { bmiScore: bmi, weightLossScore: wl, acuteIllnessScore: acute, totalScore: total, riskLevel: risk };
    a.mustBreakdown = breakdown;
  }
  if (total !== null && Number.isInteger(total)) {
    a.mustScore = total;
  } else {
    // Not a usable integer: never send an object to the INTEGER column, but
    // keep what was there (cloud column must_score_legacy JSONB).
    a.mustScoreLegacy = m;
    delete a.mustScore;
  }
  return true;
}
