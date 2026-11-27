/**
 * Small builders the condition templates share, so every template writes its
 * questions and plan lines the same way.
 */
import type { Question } from '../../clerking/types';
import type { PlanMedication } from '../types';
import type { TemplateLine } from './types';
import { patientText } from '../../../patient-pack/locale/en';

export const P = patientText.plan;
export const YNU = ['Yes', 'No', 'Unknown'];
const NE = 'Not examined';

export const sel = (id: string, label: string, options: string[], extra: Partial<Question> = {}): Question =>
  ({ id, label, type: 'select', options, ...extra });
export const multi = (id: string, label: string, options: string[], extra: Partial<Question> = {}): Question =>
  ({ id, label, type: 'multiselect', options, ...extra });
export const numQ = (id: string, label: string, unit: string, extra: Partial<Question> = {}): Question =>
  ({ id, label, type: 'number', unit, ...extra });
export const text = (id: string, label: string, extra: Partial<Question> = {}): Question => ({ id, label, type: 'text', ...extra });
/** An examination finding: "Not examined" is always offered. */
export const exSel = (id: string, label: string, options: string[], extra: Partial<Question> = {}): Question =>
  sel(id, label, [...options, NE], extra);
export const exMulti = (id: string, label: string, options: string[], extra: Partial<Question> = {}): Question =>
  multi(id, label, [...options, NE], extra);

type Opts = Partial<Omit<TemplateLine, 'id' | 'section' | 'text'>>;

export const problem = (id: string, text: string, o: Opts = {}): TemplateLine => ({ id: `pr:${id}`, section: 'problems', text, ...o });
export const inv = (id: string, text: string, why: string, o: Opts & { testId?: string; analytes?: string[]; options?: string[] } = {}): TemplateLine => {
  const { testId, analytes, options, ...rest } = o;
  return {
    id: `inv:${id}`, section: 'investigations', text, why,
    test: { id: testId ?? id, analytes, qualitative: analytes?.length ? undefined : { options } },
    patient: rest.patient ?? (P.tests as Record<string, string>)[testId ?? id],
    ...rest,
  };
};
export const med = (id: string, m: PlanMedication, o: Opts = {}): TemplateLine => ({
  id: `med:${id}`, section: 'medications', text: `${m.drug} ${m.dose} ${m.route} ${m.frequency}${m.duration ? `, ${m.duration}` : ''}`.replace(/\s+/g, ' ').trim(),
  medication: m, ...o,
});
export const proc = (id: string, text: string, why: string, o: Opts = {}): TemplateLine => ({ id: `proc:${id}`, section: 'procedures', text, why, ...o });
export const counsel = (id: string, text: string, o: Opts = {}): TemplateLine => ({ id: `co:${id}`, section: 'counselling', text, patient: o.patient ?? text, ...o });
export const monitor = (id: string, text: string, o: Opts = {}): TemplateLine => ({ id: `mon:${id}`, section: 'monitoring', text, ...o });
export const followUp = (id: string, when: string, purpose: string, days: number | undefined, o: Opts = {}): TemplateLine => ({
  id: `fu:${id}`, section: 'follow_up', text: `${when}: ${purpose}`, followUp: { when, purpose, days }, ...o,
});
export const refer = (id: string, text: string, why: string, o: Opts = {}): TemplateLine => ({ id: `ref:${id}`, section: 'referrals', text, why, ...o });

/** Every counselling point of a condition's locale entry, as lines. */
export const counselAll = (prefix: string, points: readonly string[]): TemplateLine[] =>
  points.map((t, i) => counsel(`${prefix}${i + 1}`, t));

/** Days from now until the child reaches `months` of age (at least `min`). */
export function daysUntilAgeMonths(ageMonths: number | null, months: number, min = 14): number | undefined {
  if (ageMonths == null) return undefined;
  return Math.max(min, Math.round((months - ageMonths) * 30.4));
}

export const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === '' ? [] : [String(v)]);
