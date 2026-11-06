/**
 * One encounter-type definition, read by every screen that lists, badges or
 * prints encounter types. A consumer that grows its own list again fails here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ENCOUNTER_TYPES, ENCOUNTER_TYPE_IDS, encounterTypeColour, encounterTypeLabel, encounterTypeShortLabel,
} from '../data/encounterTypes';
import { REVIEW_PHASES, phaseForEncounterType } from '../procedureReview/phases';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** The members of the EncounterType union, read from the source. */
function encounterTypeUnion(): string[] {
  const src = read('src/types/index.ts');
  const m = /export type EncounterType =([\s\S]*?);/.exec(src)!;
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1]);
}

describe('ENCOUNTER_TYPES', () => {
  it('defines every EncounterType exactly once, with label, colour and description', () => {
    expect([...ENCOUNTER_TYPE_IDS].sort()).toEqual(encounterTypeUnion().sort());
    for (const t of ENCOUNTER_TYPES) {
      expect(t.label && t.shortLabel && t.description).toBeTruthy();
      expect(t.colour).toMatch(/^bg-\S+ text-\S+$/);
    }
  });

  it('includes the procedure-review types, and every review phase maps to one', () => {
    for (const id of ['pre_operative', 'post_operative', 'wound_review', 'follow_up']) expect(ENCOUNTER_TYPE_IDS).toContain(id);
    for (const p of REVIEW_PHASES) {
      expect(ENCOUNTER_TYPE_IDS).toContain(p.encounterType);
      expect(phaseForEncounterType(p.encounterType)).toBe(p.id);
    }
  });

  it('humanises an unknown id instead of printing it raw', () => {
    expect(encounterTypeLabel('pre_operative')).toBe('Pre-operative Review');
    expect(encounterTypeShortLabel('some_new_type')).toBe('Some new type');
    expect(encounterTypeColour('nonsense')).toBe('bg-gray-100 text-gray-700');
  });
});

describe('every consumer reads ENCOUNTER_TYPES', () => {
  const consumers = [
    'src/domains/clinical/pages/ClinicalEncounterPage.tsx',
    'src/domains/clinical/pages/EnhancedClinicalEncounterPage.tsx',
    'src/domains/clinical/pages/PatientClinicalSummaryPage.tsx',
    'src/domains/clinical/pages/MDTPage.tsx',
    'src/utils/clinicalPdfGenerators.ts',
  ];
  it.each(consumers)('%s imports the shared definition', file => {
    expect(read(file)).toMatch(/from '(\.\.\/)+(domains\/clinical\/)?data\/encounterTypes'/);
  });

  it.each(consumers)('%s has no hard-coded list of its own', file => {
    const src = read(file);
    expect(src).not.toMatch(/\{ value: 'home_visit', label:/);
    expect(src).not.toMatch(/home_visit: '/);
    expect(src).not.toMatch(/z\.enum\(\[[^\]]*'home_visit'/);
    expect(src).not.toMatch(/enc\.type === 'surgical' \?/);
  });
});
