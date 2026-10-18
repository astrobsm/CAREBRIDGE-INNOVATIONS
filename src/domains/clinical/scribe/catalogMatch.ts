/**
 * Which formulary drug, and which catalogue investigation, a plan line names
 * — so the implementation dialog opens with them pre-selected. Only a
 * suggestion: the clinician still chooses the category and the item.
 *
 * Reads this app's own catalogues: the BNF-style formulary
 * (data/bnfDrugDatabase) and the investigation request catalogue
 * (services/investigationRequestService).
 */
import { BNF_DRUG_DATABASE, type BNFDrug, type DrugRoute } from '../../../data/bnfDrugDatabase';
import { INVESTIGATION_CATALOG, type CatalogItem } from '../../../services/investigationRequestService';
import type { InvestigationCategory, MedicationRoute } from '../../../types';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * First words that are not a drug on their own ("Oral rehydration salts",
 * "Sodium chloride"), so "swallow screen before oral intake" names no drug.
 */
const NOT_A_DRUG_WORD = new Set(['oral', 'sodium', 'potassium', 'calcium', 'magnesium', 'vitamin', 'normal', 'water', 'human', 'compound']);

/** The drug the plan line names, if the formulary has it: the full generic name, else its first word. */
export function drugFromText(text: string): BNFDrug | undefined {
  const t = text.toLowerCase();
  const has = (term: string) => new RegExp(`\\b${escapeRe(term)}\\b`).test(t);
  return BNF_DRUG_DATABASE.find(d => has(d.genericName.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim()))
    || BNF_DRUG_DATABASE.find(d => {
      const first = d.genericName.toLowerCase().split(/[ (]/)[0];
      return first.length > 2 && !NOT_A_DRUG_WORD.has(first) && has(first);
    });
}

export interface CatalogMatch { category: InvestigationCategory; title: string; item: CatalogItem }

/** Abbreviations a catalogue name carries in brackets: "Full Blood Count (FBC) with Differential" → FBC. */
const abbreviationsOf = (name: string) => [...name.matchAll(/\(([^)]+)\)/g)].flatMap(m => m[1].split(/[/,]/)).map(s => s.trim()).filter(s => /^[A-Z][A-Za-z0-9&-]{1,9}$/.test(s));

/** The investigation the plan line names: an abbreviation match first, then a full-name match. */
export function investigationFromText(text: string): CatalogMatch | undefined {
  const all = INVESTIGATION_CATALOG.flatMap(c => c.groups.flatMap(g => g.items.map(item => ({ category: c.category, title: c.title, item }))));
  const byAbbr = all.find(m => abbreviationsOf(m.item.name).some(a => new RegExp(`(^|[^A-Za-z0-9])${escapeRe(a)}([^A-Za-z0-9]|$)`).test(text)));
  if (byAbbr) return byAbbr;
  const t = ` ${text.toLowerCase()} `;
  return all.find(m => t.includes(` ${m.item.name.toLowerCase().replace(/\s*\([^)]*\)/g, '')} `));
}

/** Formulary route → prescription route. */
const ROUTES: Record<DrugRoute, MedicationRoute> = {
  oral: 'oral', IV: 'intravenous', IM: 'intramuscular', SC: 'subcutaneous', topical: 'topical', rectal: 'rectal',
  inhaled: 'inhalation', sublingual: 'sublingual', intrathecal: 'intrathecal', ophthalmic: 'ophthalmic',
};
export const medicationRoute = (r: DrugRoute | undefined): MedicationRoute => (r && ROUTES[r]) || 'oral';
