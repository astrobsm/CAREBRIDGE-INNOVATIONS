/**
 * Seed standard recipes for Enugu / South-East Nigeria, built from WAFCT 2019
 * food codes. Nutrients are never stored here: services/foodRepository
 * calculates them from the ingredients (raw grams × WAFCT composition ×
 * WAFCT retention factor).
 *
 * EVERY recipe is pending dietitian verification. Ingredient grams are
 * typical-recipe estimates per ONE portion, not weighed recipes from the
 * hospital kitchen. Cooking water is not listed (it carries no nutrients
 * here); the cooked weight of a portion therefore needs a measured yield
 * factor, which is null until the kitchen weighs the recipe.
 *
 * Ingredients absent from WAFCT 2019 are either
 *   - stood in for by a similar WAFCT food (`substituteFor` says so), or
 *   - left unresolved (foodCode UNRESOLVED): they count for nothing, and the
 *     calculated totals are reported as incomplete for that recipe.
 */

import type { Recipe, RecipeIngredient } from '../types';

/** Marks an ingredient with no WAFCT 2019 entry and no stand-in. */
export const UNRESOLVED = 'unresolved';

/** Retention factor sets (ids from WAFCT sheet 08, see the generated dataset). */
export const RET = {
  leavesStewed: 'leafy_vegetables|stewed',
  leavesBoiled: 'leafy_vegetables|boiled',
  rootStewed: 'starchy_root_and_potato|cooked_with_moist_heat_with_cooking_liquid',
  rootBoiled: 'starchy_root_and_potato|boiled',
  bulbStewed: 'root_tuber_and_bulb_vegetables|stewed',
  fruitVegStewed: 'stem_flower_fruit_corn_seed|stewed',
  beefSauce: 'beef_with_sauce|cooked_with_moist_heat_boiled_steamed_stewed_braised',
  fishSauce: 'lean_fish_with_sauce|cooked_with_moist_heat_boiled_steamed_stewed',
  pulsesStewed: 'pulses|stewed_unsoaked',
  pulsesSoakedStewed: 'pulses|stewed_soaked_and_cooked_in_different_water',
  riceWithLiquid: 'rice_and_other_grain_polished|boiled_with_cooking_liquid_consumed',
  grainStewed: 'grain_and_grain_product|stewed',
  eggBoiled: 'egg_and_egg_product|cooked_with_moist_heat_boiled',
} as const;

const ESTIMATE = 'Typical-recipe estimate for one portion (South-East Nigeria), not a weighed recipe. Ingredient grams to be verified by the dietitian against the hospital kitchen and local practice.';
const NO_YIELD = 'Not measured. TODO: weigh the cooked recipe (cooked weight ÷ total raw weight) in the hospital kitchen.';

const i = (foodCode: string, rawGrams: number, retentionId: string | null = null, extra: Partial<RecipeIngredient> = {}): RecipeIngredient =>
  ({ foodCode, rawGrams, retentionId, ...extra });

// Stand-ins for South-East ingredients not in WAFCT 2019.
const UGU = (g: number, ret: string = RET.leavesStewed) => i('04_053', g, ret, {
  substituteFor: { intended: 'Fluted pumpkin leaves (ugu, Telfairia occidentalis)', reason: 'not in WAFCT 2019; pumpkin leaves (Cucurbita) used' },
});
const STOCKFISH = (g: number) => i('09_053', g, RET.fishSauce, {
  substituteFor: { intended: 'Stockfish (dried cod, okporoko) / dried smoked fish', reason: 'WAFCT 2019 has "Fish, whole, dried" only' },
});
const OGIRI = (g: number) => i(UNRESOLVED, g, null, { note: 'Ogiri (fermented castor/melon seed): not in WAFCT 2019' });

// Common seasoning per soup portion.
const SEASON = [i('09_057', 5), i('04_046', 3), i('13_015', 1), i('13_008', 2)];
const BEEF = (g = 50) => i('07_002', g, RET.beefSauce);

function recipe(r: Omit<Recipe, 'verificationStatus' | 'estimateNote' | 'yieldFactor' | 'yieldFactorNote'> & Partial<Pick<Recipe, 'yieldFactor' | 'yieldFactorNote'>>): Recipe {
  return {
    yieldFactor: null,
    yieldFactorNote: NO_YIELD,
    verificationStatus: 'pending_dietitian_verification',
    estimateNote: ESTIMATE,
    region: 'South-East Nigeria (Enugu)',
    ...r,
  };
}

export const SEED_RECIPES: Recipe[] = [
  // ── Soups (one portion = the soup served with one wrap of swallow) ──────
  recipe({ id: 'ofe-onugbu', name: 'Bitterleaf soup', localNames: ['Ofe onugbu'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i('04_022', 20, RET.leavesStewed, { note: 'washed bitterleaf' }), i('02_005', 40, RET.rootStewed, { note: 'cocoyam thickener' }),
      i('11_004', 15), BEEF(), STOCKFISH(15), OGIRI(3), ...SEASON],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'ofe-oha', name: 'Oha soup', localNames: ['Ofe oha', 'Ora soup'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i(UNRESOLVED, 40, null, { note: 'Oha leaves (Pterocarpus mildbraedii): not in WAFCT 2019' }),
      i('02_005', 40, RET.rootStewed, { note: 'cocoyam thickener' }), i('11_004', 15), BEEF(), STOCKFISH(15), OGIRI(3), ...SEASON],
    costTier: 'medium', availability: ['home'], seasonality: 'oha leaves mainly in the rainy season' }),
  recipe({ id: 'egusi-soup', name: 'Egusi soup', localNames: ['Ofe egusi'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i('06_035', 30, null, { note: 'ground melon seed' }), i('11_004', 15), UGU(30), BEEF(), STOCKFISH(15),
      i('04_018', 10, RET.bulbStewed), ...SEASON],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'ogbono-soup', name: 'Ogbono soup', localNames: ['Ofe ogbono', 'Draw soup'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i('06_008', 15, null, { note: 'ground ogbono (Irvingia gabonensis kernel)' }), i('11_004', 12), UGU(20), BEEF(), STOCKFISH(15), ...SEASON],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'okra-soup', name: 'Okra soup', localNames: ['Ofe okwuru', 'Okro soup'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i('04_017', 80, RET.fruitVegStewed), i('11_004', 10), UGU(20), BEEF(), STOCKFISH(10), i('04_018', 10, RET.bulbStewed), ...SEASON],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'okra cheapest in the rainy season' }),
  recipe({ id: 'nsala-soup', name: 'Nsala (white) soup with catfish', localNames: ['Ofe nsala', 'White soup'], category: 'soup', portionLabel: '1 serving (1 piece of catfish)',
    ingredients: [i('09_060', 100, RET.fishSauce, { note: 'fresh catfish' }), i('02_034', 40, RET.rootStewed, { note: 'yam thickener' }),
      i('04_018', 10, RET.bulbStewed), i(UNRESOLVED, 3, null, { note: 'Uziza/utazi leaves: not in WAFCT 2019' }), ...SEASON],
    costTier: 'high', availability: ['home'], seasonality: 'all year' }),
  recipe({ id: 'ofe-akwu', name: 'Palm-nut soup', localNames: ['Ofe akwu', 'Banga soup'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i('05_040', 60, null, { note: 'palm fruit pulp; the extract (not the fibre) is eaten, so this overstates intake until a yield is measured' }),
      i('07_002', 40, RET.beefSauce), STOCKFISH(15), i('04_018', 10, RET.bulbStewed), ...SEASON],
    costTier: 'medium', availability: ['home'], seasonality: 'all year' }),
  recipe({ id: 'afang-soup', name: 'Afang / ukazi soup', localNames: ['Afang', 'Ofe ukazi', 'Okazi soup'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [i('04_080', 40, RET.leavesStewed, { note: 'afang/okazi (Gnetum africanum)' }), i('04_078', 60, RET.leavesStewed, { note: 'waterleaf' }),
      i('11_004', 15), BEEF(), STOCKFISH(15), ...SEASON],
    costTier: 'high', availability: ['home'], seasonality: 'waterleaf mainly in the rainy season' }),
  recipe({ id: 'vegetable-soup', name: 'Vegetable soup (edikang ikong style)', localNames: ['Edikang ikong', 'Ofe akwukwo nri'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)',
    ingredients: [UGU(60), i('04_078', 60, RET.leavesStewed, { note: 'waterleaf' }), i('11_004', 15), BEEF(), STOCKFISH(15), ...SEASON],
    costTier: 'high', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'catfish-pepper-soup', name: 'Catfish pepper soup', localNames: ['Point and kill', 'Ofe nsala ezi'], category: 'soup', portionLabel: '1 bowl (1 large piece of catfish)',
    ingredients: [i('09_060', 150, RET.fishSauce), i('04_018', 15, RET.bulbStewed), i('04_046', 5), i('13_026', 1, null, { note: 'uda' }),
      i('09_057', 3), i('13_015', 1), i('13_008', 2)],
    costTier: 'high', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),

  // ── Swallows (one portion = one wrap) ──────────────────────────────────
  recipe({ id: 'eba', name: 'Eba (garri swallow)', localNames: ['Eba', 'Utara garri'], category: 'swallow', portionLabel: '1 wrap',
    ingredients: [i('02_039', 85, null, { note: 'white gari, stirred into hot water' })],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year', minPortionG: 150, maxPortionG: 350 }),
  recipe({ id: 'akpu', name: 'Akpu / fufu (fermented cassava)', localNames: ['Akpu', 'Fufu', 'Santana'], category: 'swallow', portionLabel: '1 wrap',
    ingredients: [i('02_041', 250, RET.rootBoiled, { note: 'wet fermented cassava paste, cooked and pounded' })],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year', minPortionG: 150, maxPortionG: 350 }),
  recipe({ id: 'pounded-yam', name: 'Pounded yam', localNames: ['Ji akpuru akpu', 'Iyan'], category: 'swallow', portionLabel: '1 wrap',
    ingredients: [i('02_034', 280, RET.rootBoiled, { note: 'peeled yam, boiled and pounded' })],
    costTier: 'medium', availability: ['home'], seasonality: 'new yam from August; cheaper after harvest', minPortionG: 150, maxPortionG: 350 }),
  recipe({ id: 'amala', name: 'Amala (yam flour swallow)', localNames: ['Amala', 'Elubo'], category: 'swallow', portionLabel: '1 wrap',
    ingredients: [i('02_036', 75)],
    costTier: 'low', availability: ['home'], seasonality: 'all year' }),
  recipe({ id: 'semovita', name: 'Semovita / wheat swallow', localNames: ['Semo', 'Semolina'], category: 'swallow', portionLabel: '1 wrap',
    ingredients: [i('01_089', 75, RET.grainStewed, { substituteFor: { intended: 'Wheat semolina (Semovita)', reason: 'WAFCT 2019 has fortified Nigerian wheat flour, not semolina' } })],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),

  // ── Bean dishes, snacks, breakfast ─────────────────────────────────────
  recipe({ id: 'moi-moi', name: 'Moi moi (steamed bean pudding)', localNames: ['Moi moi', 'Mai mai'], category: 'main', portionLabel: '1 wrap / leaf',
    ingredients: [i('03_045', 70, RET.pulsesSoakedStewed, { note: 'dehulled cowpea, soaked and blended' }), i('11_003', 10), i('04_018', 15, RET.bulbStewed),
      i('04_047', 15, RET.fruitVegStewed), i('09_057', 3), i('08_001', 25, RET.eggBoiled, { note: 'half an egg' }), i('13_015', 1), i('13_008', 1)],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'akara', name: 'Akara (bean fritters)', localNames: ['Akara', 'Kosai'], category: 'snack', portionLabel: '3 balls',
    ingredients: [i('03_045', 50, null, { note: 'dehulled cowpea paste' }), i('04_018', 10), i('04_046', 3), i('13_015', 0.5),
      i('11_003', 12, null, { note: 'frying oil absorbed: estimate' })],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),
  recipe({ id: 'okpa', name: 'Okpa (steamed bambara nut pudding)', localNames: ['Okpa'], category: 'breakfast', portionLabel: '1 wrap',
    ingredients: [i('03_001', 80, RET.pulsesStewed, { note: 'bambara groundnut flour' }), i('11_004', 12), i('04_046', 3), i('13_015', 1)],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year (Enugu staple breakfast)' }),
  recipe({ id: 'akamu-fortified', name: 'Akamu (pap) fortified with milk and groundnut', localNames: ['Akamu', 'Ogi', 'Pap'], category: 'breakfast', portionLabel: '1 large bowl (about 300 mL)',
    ingredients: [i('01_100', 300, null, { note: 'cooked fermented maize porridge (ogi)' }), i('10_002', 15, null, { note: 'whole milk powder' }),
      i('06_026', 15, null, { note: 'groundnut paste' }), i('13_002', 10)],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'abacha', name: 'Abacha (African salad)', localNames: ['Abacha', 'Abacha ncha'], category: 'main', portionLabel: '1 plate',
    ingredients: [i('02_002', 100, null, { note: 'dried cassava shreds, soaked' }), i('11_004', 20), i(UNRESOLVED, 30, null, { note: 'Ugba (African oil bean, Pentaclethra macrophylla): not in WAFCT 2019' }),
      i('09_057', 5), i('04_018', 15), i('04_013', 15, null, { note: 'garden egg leaves' }), i('13_024', 0.5, null, { note: 'potash (akanwu)' }),
      STOCKFISH(20), i('04_046', 3), i('13_015', 1), i('13_008', 1)],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),

  // ── Rice, beans, plantain, yam ─────────────────────────────────────────
  recipe({ id: 'jollof-rice', name: 'Jollof rice', localNames: ['Jollof'], category: 'main', portionLabel: '1 plate',
    ingredients: [i('01_036', 90, RET.riceWithLiquid, { note: 'raw parboiled/polished rice' }), i('11_031', 12, null, { note: 'vegetable oil (vitamin A fortified, as sold in Nigeria)' }),
      i('04_021', 50, RET.fruitVegStewed), i('04_066', 10), i('04_047', 30, RET.fruitVegStewed), i('04_018', 20, RET.bulbStewed), i('04_046', 5), i('13_015', 1), i('13_008', 2)],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'white-rice-stew', name: 'White rice with tomato stew and beef', localNames: ['Rice and stew'], category: 'main', portionLabel: '1 plate with 1 piece of beef',
    ingredients: [i('01_036', 90, RET.riceWithLiquid), i('04_021', 60, RET.fruitVegStewed), i('04_047', 30, RET.fruitVegStewed), i('04_018', 20, RET.bulbStewed),
      i('11_031', 12), BEEF(60), i('13_015', 1), i('13_008', 2)],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'beans-porridge', name: 'Beans porridge', localNames: ['Agwa', 'Ewa'], category: 'main', portionLabel: '1 plate',
    ingredients: [i('03_027', 80, RET.pulsesStewed, { note: 'brown cowpea (oloyin type)' }), i('11_004', 12), i('04_018', 15, RET.bulbStewed), i('04_046', 3),
      i('09_057', 4), i('13_015', 1), i('13_008', 1)],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'boiled-plantain', name: 'Boiled unripe plantain', localNames: ['Ogede'], category: 'side', portionLabel: '1 medium plantain',
    ingredients: [i('02_045', 180, RET.rootBoiled)],
    costTier: 'low', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  recipe({ id: 'yam-pottage', name: 'Yam pottage', localNames: ['Awa ji', 'Asaro'], category: 'main', portionLabel: '1 plate',
    ingredients: [i('02_034', 250, RET.rootStewed), i('11_004', 15), i('04_018', 20, RET.bulbStewed), i('04_021', 30, RET.fruitVegStewed), i('04_046', 5),
      i('09_057', 5), UGU(20), i('13_015', 1), i('13_008', 2)],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'new yam from August' }),
];

export const RECIPES_BY_ID: ReadonlyMap<string, Recipe> = new Map(SEED_RECIPES.map(r => [r.id, r]));
