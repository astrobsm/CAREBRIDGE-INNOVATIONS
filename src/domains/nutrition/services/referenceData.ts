/**
 * Seed the food, recipe and household-measure reference tables into Dexie on
 * first use (not on schema upgrade, and not in the main bundle: the full food
 * table is loaded lazily).
 *
 * Seeded rows carry NO updatedAt. The sync pushes by the updatedAt index, so
 * shipped reference data is never pushed from a ward device; a row a
 * dietitian adds or edits gets updatedAt and syncs (the database lets only
 * dietitians and administrators write these tables). An existing row, seeded
 * or edited, is never overwritten by the seed.
 */

import { loadFullFoodTable } from '../data/foods';
import { SEED_RECIPES } from '../data/recipes';
import { SEED_HOUSEHOLD_MEASURES } from '../data/householdMeasures';

export const REFERENCE_SEED_KEY = 'astrohealth.nutrition.referenceSeed';

export async function ensureReferenceDataSeeded(): Promise<{ foods: number; recipes: number; measures: number; datasetVersion: string }> {
  const [{ db, suppressAudit, resumeAudit }, table] = await Promise.all([import('../../../database/db'), loadFullFoodTable()]);
  const version = table.meta.datasetVersion;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(REFERENCE_SEED_KEY) === version) {
      return { foods: 0, recipes: 0, measures: 0, datasetVersion: version };
    }
  } catch { /* storage unavailable: seed check falls through to the database */ }

  const strip = <T extends { updatedAt?: string }>(r: T): T => { const { updatedAt, ...rest } = r; return rest as T; };
  const addMissing = async <T extends { id: string; updatedAt?: string }>(t: { bulkGet(ids: string[]): Promise<(T | undefined)[]>; bulkAdd(rows: T[]): Promise<unknown> }, rows: T[]) => {
    const existing = await t.bulkGet(rows.map(r => r.id));
    const missing = rows.filter((_, i) => !existing[i]).map(strip);
    if (missing.length) await t.bulkAdd(missing);
    return missing.length;
  };

  suppressAudit();
  try {
    const foods = await addMissing(db.foods, table.foods);
    const recipes = await addMissing(db.recipes, SEED_RECIPES);
    const measures = await addMissing(db.householdMeasures, SEED_HOUSEHOLD_MEASURES);
    try { localStorage.setItem(REFERENCE_SEED_KEY, version); } catch { /* ignore */ }
    return { foods, recipes, measures, datasetVersion: version };
  } finally {
    resumeAudit();
  }
}
