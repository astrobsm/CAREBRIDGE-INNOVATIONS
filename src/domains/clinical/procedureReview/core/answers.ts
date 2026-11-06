/**
 * Reading answers — the helpers every rule and score uses.
 *
 * Answers are stored as the encounter model stores them: a select's value is
 * a string, a multiselect's an array of strings, a boolean a boolean, a number
 * a number. These helpers make a rule read as the clinical sentence it is
 * ("if the patient smokes…") rather than as type juggling.
 */
import type { EncounterAnswers, EncounterField } from '../../data/encounterModel';

/** The raw answer. */
export const val = (a: EncounterAnswers, id: string) => a[id];

/** True for a boolean yes, or a select answered '1' / 'yes'. */
export const isYes = (a: EncounterAnswers, id: string): boolean => {
  const v = a[id];
  return v === true || v === 'yes' || v === '1';
};

/** The select's value is one of these. */
export const isOneOf = (a: EncounterAnswers, id: string, ...values: string[]): boolean => {
  const v = a[id];
  return typeof v === 'string' && values.includes(v);
};

/** The multiselect (or select) contains any of these. */
export const hasAny = (a: EncounterAnswers, id: string, ...values: string[]): boolean => {
  const v = a[id];
  if (Array.isArray(v)) return v.some(x => values.includes(String(x)));
  return typeof v === 'string' && values.includes(v);
};

/** Values chosen in a multiselect, excluding 'none'. */
export const chosen = (a: EncounterAnswers, id: string): string[] => {
  const v = a[id];
  const list = Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? [v] : [];
  return list.filter(x => x !== 'none');
};

/** A finite number, or null. */
export const numOf = (a: EncounterAnswers, id: string): number | null => {
  const v = a[id];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** Whether the field has any answer at all. */
export const answered = (a: EncounterAnswers, id: string): boolean => {
  const v = a[id];
  if (v == null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

/** The label of a select/multiselect answer, for use in a `why`. */
export function labelOf(field: EncounterField | undefined, value: string): string {
  return field?.options?.find(o => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

/**
 * Namespace a shared field (e.g. PAIN_FIELDS, SYSTEMIC_FIELD) for use in a
 * review: prefixes its id and its showWhen dependency.
 */
export function namespaced(prefix: string, field: EncounterField): EncounterField {
  return {
    ...field,
    id: `${prefix}.${field.id}`,
    showWhen: field.showWhen ? { ...field.showWhen, field: `${prefix}.${field.showWhen.field}` } : undefined,
  };
}

/** Yes/No as select options, for questions where "not asked" must differ from "no". */
export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];
