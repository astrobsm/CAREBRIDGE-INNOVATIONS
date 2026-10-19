/**
 * Checks applied to a detox monitoring record before it is stored.
 *
 * The record carried the CIWA-Ar and COWS totals as free numbers with no range
 * check and no interpretation, and escalation was whatever the caller passed.
 * A COWS of 60 (impossible: the maximum is 48) or a CIWA-Ar of 25 with no
 * escalation flag was stored as given. Now:
 *
 *   - a total outside the scale's range is rejected;
 *   - the severity band of each score is added to the record's alerts;
 *   - escalation is PROPOSED from the score and the vital signs, and is set
 *     when either calls for it. A clinician's own escalation is never cleared.
 *
 * Ported from the UNTH substance detox audit, where the same checks run in the
 * monitoring form.
 */
import { interpretScale, vitalRedFlags, SCALE_MAX, type ScaleType } from './withdrawalScales';

export interface MonitoringScoresAndVitals {
  ciwaScore?: number | null;
  cowsScore?: number | null;
  pulse?: number | null;
  /** "systolic/diastolic", as the record stores it. */
  bloodPressure?: string | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  alertsTriggered?: string[];
  requiresEscalation?: boolean;
  escalationReason?: string;
}

export interface MonitoringReview {
  errors: string[];
  alertsTriggered: string[];
  requiresEscalation: boolean;
  escalationReason?: string;
}

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/** Systolic pressure from a "120/80" string; undefined when unreadable. */
export function systolicOf(bp?: string | null): number | undefined {
  if (!bp) return undefined;
  const m = /^\s*(\d{2,3})\s*\//.exec(bp);
  return m ? Number(m[1]) : undefined;
}

export function reviewMonitoringRecord(r: MonitoringScoresAndVitals): MonitoringReview {
  const errors: string[] = [];
  const alerts = [...(r.alertsTriggered || [])];
  const reasons: string[] = [];

  const scales: Array<[ScaleType, number | undefined]> = [
    ['CIWA-Ar', num(r.ciwaScore)],
    ['COWS', num(r.cowsScore)],
  ];
  for (const [type, score] of scales) {
    if (score === undefined) continue;
    if (score < 0 || score > SCALE_MAX[type] || !Number.isInteger(score)) {
      errors.push(`${type} must be a whole number from 0 to ${SCALE_MAX[type]} (got ${score}).`);
      continue;
    }
    const result = interpretScale(type, score);
    alerts.push(`${type} ${score}: ${result.band}`);
    if (result.escalate) reasons.push(`${type} ${score} — ${result.band}`);
  }

  const flags = vitalRedFlags({
    heartRate: num(r.pulse),
    systolic: systolicOf(r.bloodPressure),
    temperature: num(r.temperature),
    respiratoryRate: num(r.respiratoryRate),
    oxygenSaturation: num(r.oxygenSaturation),
  });
  if (flags.length) {
    alerts.push(`Vital-sign red flags: ${flags.join(', ')}`);
    reasons.push(`Vital signs: ${flags.join(', ')}`);
  }

  const proposed = reasons.length > 0;
  const requiresEscalation = !!r.requiresEscalation || proposed;
  const escalationReason = requiresEscalation
    ? [r.escalationReason?.trim(), proposed ? `Proposed: ${reasons.join('; ')}` : '']
        .filter(Boolean).join(' · ') || undefined
    : r.escalationReason;

  return { errors, alertsTriggered: [...new Set(alerts)], requiresEscalation, escalationReason };
}
