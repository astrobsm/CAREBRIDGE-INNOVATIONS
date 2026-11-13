/**
 * Food composition data access.
 *
 * Two generated files (scripts/import-wafct.mjs, never edited by hand):
 *   - wafct2019.core.generated.json: the foods the seed recipes and the
 *     legacy adapters name, plus retention factors. Small; bundled, so recipe
 *     and adapter calculations are synchronous.
 *   - wafct2019.generated.json: the whole table (~1,000 foods, ~0.8 MB).
 *     Loaded lazily with a dynamic import, so it is a separate chunk and
 *     never in the main bundle.
 */

import type { Food, RetentionFactorSet } from '../../types';
import core from './wafct2019.core.generated.json';

export interface FoodTableMeta {
  table: string;
  version: string;
  datasetVersion: string;
  url: string;
  fileName: string;
  sha256: string;
  retrievedAt: string;
  foodCount: number;
  licence: string;
  citation: string;
  subset?: 'core';
  [k: string]: unknown;
}

export interface FoodTable {
  meta: FoodTableMeta;
  foods: Food[];
  retentionFactors: RetentionFactorSet[];
  byCode: ReadonlyMap<string, Food>;
  retentionById: ReadonlyMap<string, RetentionFactorSet>;
}

export const WAFCT_SOURCE_KEY = 'wafct2019';

type RawFood = Omit<Food, 'id'>;
interface RawTable { meta: FoodTableMeta; foods: RawFood[]; retentionFactors: RetentionFactorSet[] }

export function buildTable(raw: RawTable): FoodTable {
  const foods: Food[] = raw.foods.map(f => ({ ...f, id: `${WAFCT_SOURCE_KEY}:${f.code}` }));
  return {
    meta: raw.meta,
    foods,
    retentionFactors: raw.retentionFactors,
    byCode: new Map(foods.map(f => [f.code, f])),
    retentionById: new Map(raw.retentionFactors.map(r => [r.id, r])),
  };
}

/** The bundled core subset. */
export const CORE_FOOD_TABLE: FoodTable = buildTable(core as unknown as RawTable);

let full: Promise<FoodTable> | null = null;

/** The whole WAFCT 2019 table (lazy chunk). */
export function loadFullFoodTable(): Promise<FoodTable> {
  if (!full) {
    full = import('./wafct2019.generated.json')
      .then(m => buildTable((m.default ?? m) as unknown as RawTable))
      .catch(err => { full = null; throw err; });
  }
  return full;
}

/**
 * Secondary source slot: the Nigerian Food Composition Table. No openly
 * licensed machine-readable file was found, so it carries no values. When
 * one is obtained, import it the way scripts/import-wafct.mjs imports WAFCT
 * and give its foods ids `nfct:<code>`.
 */
export const SECONDARY_SOURCES = [
  {
    key: 'nfct',
    table: 'Nigerian Food Composition Table',
    status: 'slot_only' as const,
    note: 'No openly licensed file found; no values included. Confirm licence before importing.',
  },
];
