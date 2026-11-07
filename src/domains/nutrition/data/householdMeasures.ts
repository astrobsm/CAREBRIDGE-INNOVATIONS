/**
 * Household measures used on Nigerian wards and in homes, as grams per
 * measure. EVERY value is a working estimate to be verified by local
 * weighing (the hospital kitchen weighing what a ward cup, a serving spoon
 * or a wrap actually holds). Grams depend on the food, so each measure says
 * what it applies to; the range is what is commonly seen.
 */

import type { HouseholdMeasure } from '../types';

const VERIFY = 'Working estimate: to be verified by local weighing in the hospital kitchen.';

const m = (id: string, name: string, appliesTo: string, grams: number, low: number, high: number, note: string, localName?: string): HouseholdMeasure => ({
  id, name, appliesTo, grams, gramsRange: { low, high }, localName,
  verificationStatus: 'to_be_verified_by_local_weighing',
  note: `${note} ${VERIFY}`,
});

export const SEED_HOUSEHOLD_MEASURES: HouseholdMeasure[] = [
  m('cup-cooked-rice', 'Cup (250 mL) of cooked rice', 'rice', 160, 140, 200, 'Level 250 mL cup of cooked rice or jollof.'),
  m('cup-beans-porridge', 'Cup (250 mL) of beans porridge', 'beans', 220, 200, 260, 'Level 250 mL cup of beans porridge.'),
  m('cup-pap', 'Cup (250 mL) of pap / akamu', 'akamu-fortified', 250, 240, 260, 'Liquid pap, about 1 g per mL.'),
  m('cup-liquid', 'Cup (250 mL) of a drink, milk or soup', 'any', 250, 240, 260, 'Liquid, about 1 g per mL.'),
  m('tablespoon-oil', 'Tablespoon of oil (palm or vegetable)', 'oil', 14, 12, 15, '15 mL; oil about 0.9 g per mL.'),
  m('tablespoon-gari', 'Tablespoon of dry gari', '02_039', 10, 8, 12, 'Heaped vs level differs a lot.'),
  m('tablespoon-crayfish', 'Tablespoon of ground crayfish', '09_057', 7, 5, 9, 'Ground dried crayfish.'),
  m('serving-spoon-rice', 'Serving spoon of cooked rice', 'rice', 70, 50, 90, 'Ward serving spoon (kitchen ladle-spoon).', 'Ngaji'),
  m('serving-spoon-stew', 'Serving spoon of stew or soup', 'soup', 60, 40, 80, 'Including oil, without meat.'),
  m('wrap-swallow', 'Wrap (one ball) of swallow', 'swallow', 250, 150, 350, 'Eba, akpu, pounded yam, amala or semovita; wrap size varies widely.', 'Okpu'),
  m('wrap-moi-moi', 'Wrap / leaf of moi moi', 'moi-moi', 150, 120, 200, 'One leaf or nylon wrap.'),
  m('piece-meat', 'Piece of meat (cooked)', 'meat', 40, 25, 60, 'One piece of stewed beef or goat as served in soup.'),
  m('piece-fish', 'Piece of fish (cooked)', 'fish', 60, 40, 100, 'One cross-section piece of catfish or mackerel.'),
  m('piece-yam', 'Slice of boiled yam', '02_078', 70, 50, 100, 'One round slice, about 2 cm thick.'),
  m('derica-rice', 'Derica of raw rice', '01_036', 300, 250, 350, 'Derica: the small painted-milk-tin measure used in markets (raw grain).', 'Derica'),
  m('derica-beans', 'Derica of raw beans', '03_027', 280, 240, 320, 'Derica of dry cowpea.', 'Derica'),
  m('derica-gari', 'Derica of gari', '02_039', 220, 180, 260, 'Derica of dry gari.', 'Derica'),
  m('mudu-rice', 'Mudu of raw rice', '01_036', 1300, 1100, 1600, 'Mudu: the larger market bowl measure (raw grain); sizes vary by market.', 'Mudu'),
  m('mudu-beans', 'Mudu of raw beans', '03_027', 1200, 1000, 1500, 'Mudu of dry cowpea.', 'Mudu'),
  m('mudu-gari', 'Mudu of gari', '02_039', 1000, 850, 1200, 'Mudu of dry gari.', 'Mudu'),
];

export const MEASURES_BY_ID: ReadonlyMap<string, HouseholdMeasure> = new Map(SEED_HOUSEHOLD_MEASURES.map(x => [x.id, x]));
