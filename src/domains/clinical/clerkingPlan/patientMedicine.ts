/**
 * The patient-copy fallback for a medicine line that has no plain template
 * in the locale (patient-pack/locale/en.plan.ts `medicines`): a line Claude
 * drafted and the clinician accepted, a clinician's own line, or a future
 * template line. Owner decision 2026-11-27: the patient copy never carries
 * the raw protocol wording, so the clinician text is cleaned: no bracketed
 * notes, no "e.g." product notes, no "elemental", no mg/kg working, no
 * "per guideline" placeholders. Pure.
 */
import type { PlanMedication } from './types';

/** Words that must never reach the patient copy's medicine lines. */
export const PATIENT_MEDICINE_BANNED = /\belemental\b|\be\.g\.|mg\/kg|\/kg\b/i;

const clean = (t: string | undefined): string => (t ?? '')
  .replace(/\s*\([^)]*\)/g, '')
  .replace(/[,;]?\s*\be\.g\.[^,;.]*/gi, '')
  .replace(/\belemental\b\s*/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

/** A phrase that is only a placeholder, or still holds per-kg working. */
const unusable = (t: string) => !t || t === '-' || /\/\s*kg\b/i.test(t) || /^(per|as per|see)\b/i.test(t) || /\bper (local )?guideline\b/i.test(t);

export function plainMedicineLine(m: PlanMedication | undefined): string | undefined {
  if (!m || m.dose === '-') return undefined;
  const name = clean(m.drug).replace(/\s*\bper local guideline\b/i, '').trim();
  if (!name || unusable(name)) return undefined;
  const route = (m.route || '').toLowerCase();
  const verb = /topical|skin|cream/.test(route) ? 'use' : /\b(im|iv|intramuscular|intravenous|injection|subcut)/.test(route) ? 'given' : 'take';
  const dose = clean(m.dose), freq = clean(m.frequency), dur = clean(m.duration);
  const amount = unusable(dose) ? 'the dose on your prescription' : dose;
  const how = unusable(freq) ? '' : ` ${freq}`;
  const long = unusable(dur) ? '' : /^\d/.test(dur) ? ` for ${dur}` : `, ${dur}`;
  return `${name} – ${verb === 'given' ? `${amount}, given` : `${verb} ${amount}`}${how}${long}.`.replace(/\s+\./g, '.').replace(/\.\.$/, '.');
}
