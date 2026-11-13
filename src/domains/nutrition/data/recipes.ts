/**
 * Seed standard recipes for Enugu / South-East Nigeria, plus commonly eaten
 * Nigerian dishes restored from the retired food lists (RESTORED_RECIPES),
 * built from WAFCT 2019 food codes. Nutrients are never stored here:
 * services/foodRepository calculates them from the ingredients (raw grams ×
 * WAFCT composition × WAFCT retention factor).
 *
 * EVERY recipe is pending dietitian verification. Ingredient grams are
 * typical-recipe estimates per ONE portion, not weighed recipes from the
 * hospital kitchen. Cooking water is not listed (it carries no nutrients
 * here), except in drinks, where it makes up the cup; the cooked weight of a
 * portion therefore needs a measured yield factor, which is null until the
 * kitchen weighs the recipe.
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
  riceWholeBoiled: 'rice_and_other_grain_whole|boiled',
  grainBoiled: 'grain_and_grain_product|boiled_steamed',
  bulbSauteed: 'root_tuber_and_bulb_vegetables|sauteed_stir_fried',
  fruitVegSauteed: 'stem_flower_fruit_corn_seed|sauteed_stir_fried',
  meatSauce: 'meat_and_meat_product_with_sauce|stewed_braised',
  beefGrilled: 'beef|broiled_or_grilled',
  // WAFCT 2019 has no frying retention set for meat, poultry, fish or offal;
  // the dry-heat (broiled/grilled) set is the nearest and is used for frying.
  poultryDryHeat: 'poultry|broiled_or_grilled',
  fattyFishDryHeat: 'fatty_fish|broiled_or_grilled',
  offalDryHeat: 'offal|broiled_or_grilled',
  // Nearest WAFCT set for a deep-fried wheat dough (puff puff, buns, chin chin).
  grainFried: 'pasta|fried_in_oil',
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

const STAGE2_RECIPES: Recipe[] = [
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

// ── Restored dishes ────────────────────────────────────────────────────────
// Commonly eaten foods dropped from the retired hard-coded lists because no
// source covered them as dishes. WAFCT 2019 was searched first for each as a
// composite food; none is in it (the nearest composites are Burkina Faso
// recipes, e.g. 14_008 groundnut sauce and 14_020 dried baobab leaf sauce,
// with different ingredients and proportions), so each is a standard recipe.
//
// Frying: the oil the food takes up is an ingredient of its own, never
// assumed away. Stir-fried dishes count all the oil used; deep-fried foods
// count the oil ABSORBED, an estimate stated on the oil line (the oil left in
// the pan is not eaten). The kitchen should check it by weighing oil before
// and after frying a batch.

const RESTORED_ESTIMATE = 'Typical-recipe estimate for one portion (common Nigerian home, canteen or street recipe), not a weighed recipe. Ingredient grams, and the oil absorbed in frying, to be verified by the dietitian against the hospital kitchen and local practice.';
const restored = (r: Parameters<typeof recipe>[0]): Recipe => ({ ...recipe(r), estimateNote: RESTORED_ESTIMATE });

const FLOUR = (g: number, ret: string | null = null) => i('01_089', g, ret, { note: 'wheat flour (Nigerian flour is fortified)' });
const IRU = (g: number) => i('03_042', g, null, { note: 'iru / dawadawa (fermented African locust bean)' });
const CUBE = (g = 2) => i('13_008', g);
const SALT = (g = 1) => i('13_015', g);
const DEEP_FRY_OIL = (g: number, assumption: string) => i('11_031', g, null, { note: `oil absorbed in deep frying: ${assumption}` });
const STRAINED = 'strained after soaking/infusing: the discarded pulp is counted here, so energy and fibre are overstated until the strained drink is analysed or an extraction yield is measured';

export const RESTORED_RECIPES: Recipe[] = [
  // ── Rice dishes ────────────────────────────────────────────────────────
  restored({ id: 'fried-rice', name: 'Nigerian fried rice', localNames: ['Fried rice'], category: 'main', portionLabel: '1 plate', region: 'Nationwide',
    ingredients: [i('01_036', 90, RET.riceWithLiquid, { note: 'raw rice, parboiled in stock that it absorbs' }),
      i('11_031', 15, null, { note: 'stir-frying oil: all of it is eaten with the rice' }),
      i('07_001', 20, RET.offalDryHeat, { note: 'beef liver, diced and fried' }), i('04_006', 20, RET.bulbSauteed), i('04_003', 15, RET.fruitVegSauteed, { note: 'green beans' }),
      i(UNRESOLVED, 10, null, { note: 'Green peas: not in WAFCT 2019' }), i(UNRESOLVED, 10, null, { note: 'Sweetcorn: not in WAFCT 2019' }),
      i('04_018', 15, RET.bulbSauteed), i('13_022', 1, null, { note: 'curry powder' }), i('04_083', 0.5, null, { note: 'dried thyme' }), CUBE(), SALT()],
    costTier: 'medium', availability: ['home', 'hospital_kitchen', 'market'], seasonality: 'all year' }),
  restored({ id: 'ofada-ayamase', name: 'Ofada rice with ayamase (green pepper stew)', localNames: ['Ofada and ayamase', 'Designer stew'], category: 'main',
    portionLabel: '1 plate (rice, ayamase and assorted meat)', region: 'South-West Nigeria',
    ingredients: [i('01_065', 90, RET.riceWholeBoiled, { substituteFor: { intended: 'Ofada rice (local unpolished Nigerian rice)', reason: 'not named in WAFCT 2019; "Rice, red native, hulled" used' } }),
      i('04_049', 40, RET.fruitVegStewed, { note: 'green bell pepper (tatashe)' }), i('04_046', 10, RET.fruitVegStewed, { note: 'green scotch bonnet' }), i('04_018', 20, RET.bulbStewed),
      i('11_007', 25, null, { substituteFor: { intended: 'Bleached palm oil (heat-clarified red palm oil)', reason: 'not in WAFCT 2019; refined decoloured palm oil used (bleaching destroys the carotenoids, as refining does)' } }),
      IRU(5), i('09_057', 3), BEEF(40), i('07_021', 20, RET.meatSauce, { note: 'tripe (shaki)' }),
      i(UNRESOLVED, 15, null, { note: 'Cow skin (ponmo): not in WAFCT 2019' }), i('08_001', 25, RET.eggBoiled, { note: 'half a boiled egg' }), CUBE(), SALT()],
    costTier: 'medium', availability: ['home', 'market'], seasonality: 'all year' }),

  // ── Soups ──────────────────────────────────────────────────────────────
  restored({ id: 'groundnut-soup', name: 'Groundnut soup', localNames: ['Ofe ahu', 'Miyan gyada', 'Peanut soup'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)', region: 'Nationwide',
    ingredients: [i('06_026', 30, null, { note: 'groundnut paste (or roasted groundnut, ground)' }), i('11_004', 8), i('04_021', 40, RET.fruitVegStewed), i('04_018', 15, RET.bulbStewed),
      i('04_046', 3), BEEF(), STOCKFISH(10), i('09_057', 5), UGU(15), CUBE(), SALT()],
    costTier: 'medium', availability: ['home'], seasonality: 'all year' }),
  restored({ id: 'efo-riro', name: 'Efo riro (stewed spinach in pepper sauce)', localNames: ['Efo riro', 'Efo tete'], category: 'soup', portionLabel: '1 serving (with 1 piece of meat)', region: 'South-West Nigeria',
    // Not the same dish as vegetable-soup (ugu and waterleaf, no pepper base):
    // amaranth leaves stewed in a blended pepper base with more palm oil and iru.
    ingredients: [i('04_023', 100, RET.leavesStewed, { note: 'amaranth leaves (efo tete)' }), i('04_047', 40, RET.fruitVegStewed, { note: 'red bell pepper (tatashe)' }),
      i('04_021', 20, RET.fruitVegStewed), i('04_046', 5, RET.fruitVegStewed, { note: 'scotch bonnet (ata rodo)' }), i('04_018', 15, RET.bulbStewed),
      i('11_004', 20), IRU(5), i('09_057', 5), BEEF(), STOCKFISH(10), CUBE(), SALT()],
    costTier: 'medium', availability: ['home', 'hospital_kitchen'], seasonality: 'all year' }),
  restored({ id: 'gbegiri', name: 'Gbegiri (bean soup)', localNames: ['Gbegiri'], category: 'soup', portionLabel: '1 bowl', region: 'South-West Nigeria',
    ingredients: [i('03_045', 40, RET.pulsesSoakedStewed, { note: 'peeled (dehulled) cowpea, cooked and mashed' }), i('11_004', 10), IRU(3), i('09_057', 3),
      i('04_018', 10, RET.bulbStewed), i('04_046', 3), CUBE(1), SALT()],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),
  restored({ id: 'miyan-kuka', name: 'Miyan kuka (baobab leaf soup)', localNames: ['Miyan kuka'], category: 'soup', portionLabel: '1 bowl (with 1 piece of meat)', region: 'Northern Nigeria',
    ingredients: [i('04_002', 15, RET.leavesStewed, { note: 'dried baobab leaf powder (kuka)' }), IRU(5), i('11_022', 10, null, { note: 'groundnut oil (vitamin A fortified, as sold in Nigeria)' }),
      i('09_053', 10, RET.fishSauce, { note: 'dried fish' }), BEEF(30), i('04_018', 15, RET.bulbStewed), i('04_046', 3), CUBE(), SALT()],
    costTier: 'low', availability: ['home'], seasonality: 'all year' }),

  // ── Fried and grilled proteins ─────────────────────────────────────────
  restored({ id: 'fried-fish', name: 'Fried fish (mackerel)', localNames: ['Fried Titus', 'Eja dindin'], category: 'side', portionLabel: '1 piece (about 120 g raw fish, edible part)', region: 'Nationwide',
    ingredients: [i('09_003', 120, RET.fattyFishDryHeat, { note: 'mackerel (Titus), raw edible portion; frying retention: dry-heat set (WAFCT has no frying set for fish)' }),
      SALT(), CUBE(1), DEEP_FRY_OIL(6, 'about 5% of the raw fish weight')],
    costTier: 'medium', availability: ['home', 'hospital_kitchen', 'market'], seasonality: 'all year' }),
  restored({ id: 'fried-chicken', name: 'Fried chicken', localNames: ['Fried chicken'], category: 'side', portionLabel: '1 piece (about 120 g raw, edible part with skin)', region: 'Nationwide',
    ingredients: [i('07_030', 120, RET.poultryDryHeat, { note: 'chicken thigh/drumstick with skin, raw edible portion; seasoned, parboiled then fried; retention: dry-heat set (WAFCT has no frying set for poultry)' }),
      i('04_018', 10, RET.bulbStewed), i('13_022', 0.5), i('04_083', 0.5), CUBE(), SALT(), DEEP_FRY_OIL(6, 'about 5% of the raw chicken weight')],
    costTier: 'high', availability: ['home', 'market'], seasonality: 'all year' }),
  restored({ id: 'suya', name: 'Suya (spiced grilled beef)', localNames: ['Suya', 'Tsire'], category: 'side', portionLabel: '1 wrap (about 5 sticks, 100 g raw beef)', region: 'Northern Nigeria (eaten nationwide)',
    ingredients: [i('07_009', 100, RET.beefGrilled, { note: 'lean beef, thin slices' }),
      i('06_028', 10, null, { substituteFor: { intended: 'Kuli-kuli (groundnut cake) in yaji spice', reason: 'not in WAFCT 2019; partially defatted groundnut flour used (kuli-kuli is pressed, defatted groundnut)' } }),
      i('13_006', 2, null, { note: 'dried chilli (yaji)' }), i('13_011', 1, null, { note: 'dried ginger (yaji)' }), CUBE(), SALT(),
      i('11_022', 4, null, { note: 'groundnut oil brushed on while grilling' }), i('04_018', 20, null, { note: 'raw onion served with it' }),
      i('04_021', 20, null, { note: 'raw tomato served with it' }), i('04_005', 15, null, { note: 'raw cabbage served with it' })],
    costTier: 'medium', availability: ['market'], seasonality: 'all year' }),

  // ── Side salad ─────────────────────────────────────────────────────────
  restored({ id: 'coleslaw', name: 'Coleslaw', localNames: ['Coleslaw'], category: 'side', portionLabel: '1 serving (about 100 g)', region: 'Nationwide',
    ingredients: [i('04_005', 60, null, { note: 'raw white cabbage' }), i('04_006', 15, null, { note: 'raw carrot' }),
      i('11_031', 15, null, { substituteFor: { intended: 'Mayonnaise (20 g)', reason: 'not in WAFCT 2019; built from its main parts: 15 g vegetable oil + 3 g egg + 2 g vinegar' } }),
      i('08_001', 3, null, { note: 'egg: part of the mayonnaise stand-in' }), i('13_003', 2, null, { note: 'vinegar: part of the mayonnaise stand-in' }), i('13_002', 3)],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),

  // ── Pastries and fried snacks ──────────────────────────────────────────
  restored({ id: 'puff-puff', name: 'Puff puff', localNames: ['Puff puff', 'Bofrot'], category: 'snack', portionLabel: '5 balls (about 80 g)', region: 'Nationwide',
    ingredients: [FLOUR(50, RET.grainFried), i('13_002', 10), i('13_017', 1.5, null, { note: 'dried yeast' }), SALT(0.5),
      DEEP_FRY_OIL(12, 'about 15% of the fried weight')],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),
  restored({ id: 'chin-chin', name: 'Chin chin', localNames: ['Chin chin'], category: 'snack', portionLabel: '50 g (a small pack)', region: 'Nationwide',
    ingredients: [FLOUR(30, RET.grainFried), i('13_002', 6), i('11_029', 4, null, { note: 'margarine rubbed into the flour' }), i('08_001', 4), i('10_016', 3, null, { note: 'evaporated milk' }),
      SALT(0.3), DEEP_FRY_OIL(6, 'about 12% of the fried weight')],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year (more at festive seasons)' }),
  restored({ id: 'buns', name: 'Buns (Nigerian fried dough)', localNames: ['Buns'], category: 'snack', portionLabel: '2 buns (about 100 g)', region: 'Nationwide',
    ingredients: [FLOUR(50, RET.grainFried), i('13_002', 12), i('11_029', 4), i('08_001', 8), i('10_002', 4, null, { note: 'milk powder' }),
      i('13_019', 1, null, { substituteFor: { intended: 'Baking powder', reason: 'not in WAFCT 2019; baking soda used (carries the sodium; no energy)' } }), SALT(0.5),
      DEEP_FRY_OIL(10, 'about 10% of the fried weight')],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),
  restored({ id: 'meat-pie', name: 'Meat pie', localNames: ['Meat pie'], category: 'snack', portionLabel: '1 pie (about 130 g)', region: 'Nationwide',
    // Baked: WAFCT 2019 has no baking retention set for grain products, so
    // none is applied to the pastry.
    ingredients: [FLOUR(52, null), i('11_029', 22, null, { note: 'margarine in the shortcrust' }), i('08_001', 6, null, { note: 'egg in the pastry and egg wash' }),
      i('07_023', 25, RET.meatSauce, { note: 'minced beef filling' }), i('02_009', 15, RET.rootStewed, { note: 'diced Irish potato' }), i('04_006', 8, RET.bulbStewed),
      i('04_018', 5, RET.bulbStewed), CUBE(1), SALT(0.5)],
    costTier: 'medium', availability: ['market', 'home'], seasonality: 'all year' }),
  restored({ id: 'sausage-roll', name: 'Sausage roll', localNames: ['Sausage roll', 'Gala'], category: 'snack', portionLabel: '1 roll (about 70 g)', region: 'Nationwide',
    ingredients: [FLOUR(28, null), i('11_029', 14, null, { note: 'margarine in the pastry' }), i('08_001', 3, null, { note: 'egg wash' }),
      i('07_023', 22, RET.meatSauce, { substituteFor: { intended: 'Seasoned beef sausage meat', reason: 'no raw sausage meat in WAFCT 2019; minced beef (ca. 10% fat) used, the rusk/binder is not counted' } }),
      i('04_018', 3), CUBE(0.5), SALT(0.3)],
    costTier: 'low', availability: ['market'], seasonality: 'all year' }),

  // ── Drinks (one portion = one 250 mL cup; water listed so the cup weighs right) ─
  restored({ id: 'zobo', name: 'Zobo (hibiscus drink, sweetened)', localNames: ['Zobo', 'Zoborodo', 'Sobolo'], category: 'beverage', portionLabel: '1 cup (250 mL)', region: 'Nationwide',
    ingredients: [i(UNRESOLVED, 4, null, { note: 'Dried roselle calyces (Hibiscus sabdariffa): not in WAFCT 2019 (only the leaves are), infused and strained' }),
      i('13_002', 20, null, { note: 'added sugar (commercial and home zobo is usually sweetened)' }), i('04_082', 3, null, { note: `fresh ginger, ${STRAINED}` }), i('12_019', 230)],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),
  restored({ id: 'kunu', name: 'Kunu (kunun zaki, millet drink, sweetened)', localNames: ['Kunu', 'Kunun zaki'], category: 'beverage', portionLabel: '1 cup (250 mL)', region: 'Northern Nigeria (eaten nationwide)',
    ingredients: [i('01_017', 25, RET.grainBoiled, { note: `pearl millet grain, steeped, ground and part-cooked with hot water; ${STRAINED}` }),
      i('13_011', 1, null, { note: 'dried ginger' }), i('13_002', 15, null, { note: 'added sugar' }), i('12_019', 210)],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'all year' }),
  restored({ id: 'tiger-nut-milk', name: 'Tiger nut milk (kunun aya)', localNames: ['Kunun aya', 'Ofio', 'Tiger nut drink'], category: 'beverage', portionLabel: '1 cup (250 mL)', region: 'Northern Nigeria (eaten nationwide)',
    ingredients: [i('02_026', 30, null, { note: `dried tiger nuts, soaked and blended; ${STRAINED}` }), i('06_002', 10, null, { note: 'fresh coconut, blended with the nuts and strained' }),
      i('05_030', 10, null, { note: 'dates, blended in as the sweetener (no added sugar)' }), i('12_019', 200)],
    costTier: 'low', availability: ['home', 'market'], seasonality: 'tiger nuts most available in the dry season' }),
];

export const SEED_RECIPES: Recipe[] = [...STAGE2_RECIPES, ...RESTORED_RECIPES];

export const RECIPES_BY_ID: ReadonlyMap<string, Recipe> = new Map(SEED_RECIPES.map(r => [r.id, r]));
