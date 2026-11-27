/**
 * The dermatology and rheumatology knowledge base: every condition, its
 * version, and lookups. Pure data; no AI.
 */
import { RHEUM_CONDITIONS } from './rheum';
import { DERM_CONDITIONS } from './derm';
import type { KbCondition } from './types';

/** Bump when any entry changes; recorded on every consult. */
export const KB_VERSION = '1.0.0';
export const KB_DATE = '2026-11-28';

export const KB: readonly KbCondition[] = [...RHEUM_CONDITIONS, ...DERM_CONDITIONS];
export const KB_BY_ID: Record<string, KbCondition> = Object.fromEntries(KB.map(c => [c.id, c]));

/** Free text ("PG", "Marjolin ulcer") → the KB entry, if any. */
export function findKb(text: string): KbCondition | undefined {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  return KB.find(c => c.id === q || c.label.toLowerCase() === q || c.synonyms.some(s => s.toLowerCase() === q))
    ?? KB.find(c => c.synonyms.some(s => s.length >= 5 && q.includes(s.toLowerCase())));
}

/** A compact, citable copy of the entries for the Claude consult (reference, not instructions). */
export function kbReference(ids: string[]) {
  return ids.map(id => KB_BY_ID[id]).filter(Boolean).map(c => ({
    kb_id: c.id, condition: c.label, key_history: c.history, key_exam: c.exam, skin_of_colour: c.skinOfColour,
    red_flags: c.redFlags, criteria: c.criteria?.name, biopsy: c.biopsy,
    investigations: c.investigations.map(i => ({ test: i.text, catalogue_code: i.catalogueCode ?? null, why: i.why })),
    management: c.management, warnings: c.warnings, do_not: c.doNot,
    refer: c.refer.map(r => `${r.to}: ${r.when} (${r.urgency})`), sources: c.sources,
    pending_validation: c.pendingValidation,
  }));
}

export type { KbCondition, KbInvestigation, KbReferral, KbCategory, Specialty } from './types';
export { KB_CATEGORY_LABEL, SPECIALTY_LABEL } from './types';
