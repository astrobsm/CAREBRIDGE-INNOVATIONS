/**
 * Every post-operative and follow-up visit in every procedure module carries a
 * structured booking schedule, and the schedule agrees with the template text.
 *
 * The booking reads `schedule` only; the text parser below exists for THIS
 * test, to check that whoever wrote a schedule booked the START of the window
 * the text gives ("Day 10–14" -> day 10). Units: days; weeks x7; months x30;
 * years x365; hours /24.
 */
import { describe, it, expect } from 'vitest';
import { PROCEDURE_MODULES } from '../registry';
import type { FollowUpVisit } from '../types';

const UNIT_DAYS: Record<string, number> = { hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };
const unitOf = (u: string) => UNIT_DAYS[u.toLowerCase().replace(/s$/, '')];

/** The lower bound of each number (or range) in a `when` text, in days, in order. */
export function lowerBoundsInDays(text: string): number[] {
  const t = text.replace(/[–—]/g, '-');
  // "Day 10-14", "Days 3-5", "Week 2-3", "Weeks 2-3": the unit comes first.
  const prefix = t.match(/^\s*(?:about\s+)?(days?|weeks?)\s+(\d+)/i);
  if (prefix) return [Number(prefix[2]) * unitOf(prefix[1])];
  // "3, 6 and 12 months", "2 and 6 weeks", "6-12 months", "6 weeks and 3 months".
  const out: number[] = [];
  const re = /(\d+(?:\s*-\s*\d+)?)((?:\s*,\s*\d+(?:\s*-\s*\d+)?)*)(?:\s+and\s+(\d+(?:\s*-\s*\d+)?))?\s*(hours?|days?|weeks?|months?|years?)\b/gi;
  for (const m of t.matchAll(re)) {
    const parts = [m[1], ...(m[2] ? m[2].split(',').map(s => s.trim()).filter(Boolean) : []), ...(m[3] ? [m[3]] : [])];
    for (const p of parts) out.push(Number(p.split('-')[0].trim()) * unitOf(m[4]));
  }
  return out;
}

const visits = PROCEDURE_MODULES.flatMap(m =>
  (['post_op', 'follow_up'] as const).flatMap(phase =>
    (m.followUp?.[phase] ?? []).map((v: FollowUpVisit) => ({ module: m.id, phase, v }))));

describe('the test-only when-text parser', () => {
  it.each([
    ['Day 10–14', [10]],
    ['Weeks 2–3', [14]],
    ['6–12 months', [180]],
    ['3, 6 and 12 months', [90, 180, 360]],
    ['2 and 6 weeks after discharge', [14, 42]],
    ['6 weeks and 3 months', [42, 90]],
    ['24–72 hours', [1]],
    ['Every 3 months for at least 12–24 months', [90, 360]],
  ])('%s', (text, days) => {
    expect(lowerBoundsInDays(text)).toEqual(days);
  });
});

describe('follow-up schedules', () => {
  it('covers every module visit (there are visits to check)', () => {
    expect(PROCEDURE_MODULES.length).toBeGreaterThanOrEqual(21);
    expect(visits.length).toBeGreaterThan(80);
  });

  it('gives every post_op and follow_up visit a schedule', () => {
    const missing = visits.filter(x => !x.v.schedule).map(x => `${x.module} ${x.phase}: ${x.v.when}`);
    expect(missing).toEqual([]);
  });

  it('books each window at its start: startDay / days equal the lower bounds in the text', () => {
    const wrong: string[] = [];
    for (const { module, phase, v } of visits) {
      const s = v.schedule!;
      const bounds = lowerBoundsInDays(v.when);
      if (s.kind === 'once' || s.kind === 'next') {
        if (bounds[0] !== s.startDay) wrong.push(`${module} ${phase} "${v.when}": startDay ${s.startDay}, text says ${bounds[0]}`);
      } else if (s.kind === 'multi') {
        if (JSON.stringify(bounds.slice(0, s.days.length)) !== JSON.stringify(s.days)) {
          wrong.push(`${module} ${phase} "${v.when}": days ${s.days}, text says ${bounds}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('never auto-books ward frequencies, and books "after discharge" visits from the discharge', () => {
    const ward = /^(daily|every \d+\s*[–-]\s*\d+ hours|twice weekly|immediately after surgery|first 72 hours)/i;
    for (const { module, v } of visits) {
      if (ward.test(v.when)) expect(v.schedule, `${module}: ${v.when}`).toEqual({ kind: 'ward' });
      if (/after discharge/i.test(v.when)) expect((v.schedule as { from?: string }).from, `${module}: ${v.when}`).toBe('discharge');
    }
  });

  it('keeps conditional and branching visits on recall', () => {
    const conditional = /^(BCC|cSCC|Stage|Benign|DFSP|Angiosarcoma|Albinism|Piecemeal|After healing|Age |Weekly \(expansion\))|propranolol|sclerotherapy session|if planned|staged excision/i;
    for (const { module, v } of visits) {
      if (conditional.test(v.when) || conditional.test(v.purpose.slice(0, 40)) && /if planned/i.test(v.purpose)) {
        expect(v.schedule?.kind, `${module}: ${v.when}`).toBe('recall');
      }
    }
  });

  it('uses positive, increasing days', () => {
    for (const { module, v } of visits) {
      const s = v.schedule!;
      if (s.kind === 'once') expect(s.startDay, module).toBeGreaterThan(0);
      if (s.kind === 'next') { expect(s.startDay, module).toBeGreaterThan(0); expect(s.everyDays, module).toBeGreaterThan(0); }
      if (s.kind === 'multi') {
        expect(s.days.length, module).toBeGreaterThan(1);
        expect([...s.days].sort((a, b) => a - b), module).toEqual(s.days);
      }
    }
  });
});
