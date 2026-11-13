/**
 * What the stage 3 meal-plan optimiser may put on a plate, and how it may
 * portion it. Only the PLANNING attributes live here: nutrients always come
 * from WAFCT 2019 or the standard recipes through services/foodRepository.
 *
 * Every attribute below (role, meal slots, portion unit and limits, texture,
 * cost tier, availability) is a working estimate for South-East Nigeria,
 * pending dietitian review, exactly like the recipes and household measures.
 *
 * Portion units:
 *   - 'g'        grams of the food as WAFCT describes it (a cooked entry is
 *                weighed cooked), rounded to `step` (default 5 g);
 *   - 'piece'    whole pieces (an egg, a piece of fish or meat, a slice of
 *                bread, an orange) of the stated cooked/edible grams;
 *   - 'portion'  whole standard-recipe portions, or half portions where the
 *                dish is served by the ladle or spoon (step 0.5). A dish whose
 *                portion includes a piece of meat or fish is whole portions
 *                only, so the piece is never halved.
 *
 * min/max are in those units. Foods carry no costTier/availability in the
 * generated WAFCT rows, so they are given here; recipes use their own unless
 * overridden.
 *
 * Igbo names are given only where certain (stage 3 spec: never guessed).
 * Recipes carry theirs on the Recipe (data/recipes.ts).
 */

import type { CostTier, FoodAvailability } from '../types';

export type PlanSlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type PlanRole =
  | 'breakfast_main' | 'staple' | 'swallow' | 'soup' | 'one_pot'
  | 'protein' | 'legume' | 'dairy' | 'vegetable' | 'fruit' | 'snack' | 'drink' | 'fat';

/** Finest texture a component suits (with the preparation note, if any). Order: regular < soft < minced < pureed < liquid. */
export type TextureLevel = 'regular' | 'soft' | 'minced' | 'pureed' | 'liquid';
export const TEXTURE_ORDER: readonly TextureLevel[] = ['regular', 'soft', 'minced', 'pureed', 'liquid'];

export type DietTag =
  | 'pork' | 'alcohol' | 'beef' | 'goat' | 'poultry' | 'fish' | 'shellfish' | 'offal'
  | 'egg' | 'milk' | 'groundnut' | 'tree_nut' | 'gluten'
  | 'fried' | 'added_sugar' | 'sugary_drink' | 'raw_vegetable';

export type ProteinSource = 'beef' | 'goat' | 'poultry' | 'fish' | 'egg' | 'legume' | 'dairy' | 'offal' | 'pork';

export type PlanUnitSpec =
  | { kind: 'g'; step?: number }
  | { kind: 'piece'; grams: number; singular: string; plural: string }
  | { kind: 'portion'; step?: 0.5 | 1 };

export interface PlanComponentSpec {
  id: string;
  source: { food: string } | { recipe: string };
  /** Plain-English name (recipes default to the recipe name). */
  name?: string;
  igboName?: string;
  role: PlanRole;
  slots: PlanSlotKind[];
  unit: PlanUnitSpec;
  /** In the unit's own terms (grams, pieces or portions). */
  min: number;
  max: number;
  /** Household measure used to describe the amount (data/householdMeasures.ts). */
  measureId?: string;
  texture: TextureLevel;
  preparationNote?: string;
  /** Tags beyond those derived from the ingredients (INGREDIENT_TAGS). */
  tags?: DietTag[];
  /** The protein the dish is built on, for rotating protein sources. */
  proteinSource?: ProteinSource;
  costTier?: CostTier;
  availability?: FoodAvailability[];
  /** Goal hints: lean protein / vegetable-rich (weight loss), energy-dense addition (weight gain). */
  lean?: boolean;
  energyDense?: boolean;
  /** Eaten with a staple (pepper soup with yam). */
  needsStaple?: boolean;
}

/**
 * Diet tags carried by each WAFCT code, so a recipe's tags follow its
 * ingredients (an allergy to fish excludes every soup with stockfish).
 * Conservative: refined groundnut oil is tagged groundnut, oats gluten,
 * coconut a tree nut, the beef stock cube beef.
 */
export const INGREDIENT_TAGS: Record<string, DietTag[]> = {
  // fish and shellfish
  '09_053': ['fish'], '09_003': ['fish'], '09_060': ['fish'], '09_081': ['fish'], '09_037': ['fish'], '09_089': ['fish'], '09_043': ['fish'],
  '09_057': ['shellfish'],
  // eggs, milk
  '08_001': ['egg'], '08_002': ['egg'], '08_003': ['egg'],
  '10_016': ['milk'], '10_002': ['milk'], '10_022': ['milk'], '10_001': ['milk'], '10_005': ['milk'],
  // groundnut, tree nuts
  '06_028': ['groundnut'], '06_026': ['groundnut'], '06_010': ['groundnut'], '11_003': ['groundnut'], '11_022': ['groundnut'],
  '06_001': ['tree_nut'], '06_002': ['tree_nut'],
  // gluten
  '01_046': ['gluten'], '01_089': ['gluten'], '01_082': ['gluten'], '01_133': ['gluten'],
  // meat
  '07_001': ['beef', 'offal'], '07_089': ['beef', 'offal'], '07_021': ['beef', 'offal'],
  '07_023': ['beef'], '07_009': ['beef'], '07_017': ['beef'], '07_002': ['beef'], '07_086': ['beef'], '13_008': ['beef'],
  '07_030': ['poultry'], '07_037': ['poultry'], '07_038': ['poultry'], '07_035': ['poultry'],
  '07_112': ['goat'],
  '07_121': ['pork'], '07_120': ['pork'],
  // alcohol
  '12_006': ['alcohol'],
};

/** Grams of white sugar (13_002) per portion from which a recipe counts as containing added sugar. */
export const ADDED_SUGAR_FROM_G = 5;

const ALL: FoodAvailability[] = ['hospital_kitchen', 'home', 'market'];
const HOME: FoodAvailability[] = ['home', 'market'];
const g = (step = 5): PlanUnitSpec => ({ kind: 'g', step });
const piece = (grams: number, singular: string, plural: string): PlanUnitSpec => ({ kind: 'piece', grams, singular, plural });
const half: PlanUnitSpec = { kind: 'portion', step: 0.5 };
const whole: PlanUnitSpec = { kind: 'portion', step: 1 };
const MAIN: PlanSlotKind[] = ['lunch', 'dinner'];

const food = (id: string, code: string, s: Omit<PlanComponentSpec, 'id' | 'source'>): PlanComponentSpec => ({ id, source: { food: code }, ...s });
const dish = (recipe: string, s: Omit<PlanComponentSpec, 'id' | 'source'>): PlanComponentSpec => ({ id: recipe, source: { recipe }, ...s });

export const PLANNER_COMPONENTS: PlanComponentSpec[] = [
  // ── Breakfast mains ────────────────────────────────────────────────────
  dish('akamu-fortified', { role: 'breakfast_main', slots: ['breakfast', 'snack'], unit: half, min: 0.5, max: 2, texture: 'pureed', energyDense: true, proteinSource: 'dairy' }),
  food('pap-plain', '01_100', { name: 'Pap (akamu), plain', igboName: 'Akamu', role: 'breakfast_main', slots: ['breakfast', 'snack'], unit: g(), min: 200, max: 500,
    measureId: 'cup-pap', texture: 'pureed', costTier: 'low', availability: ALL }),
  dish('okpa', { role: 'breakfast_main', slots: ['breakfast'], unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'legume' }),
  dish('moi-moi', { role: 'breakfast_main', slots: ['breakfast', 'lunch', 'dinner', 'snack'], unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'legume', lean: true }),
  dish('akara', { role: 'breakfast_main', slots: ['breakfast', 'snack'], unit: whole, min: 1, max: 2, texture: 'regular', tags: ['fried'], proteinSource: 'legume' }),
  food('oat-porridge', '01_133', { name: 'Oat porridge', role: 'breakfast_main', slots: ['breakfast'], unit: g(), min: 150, max: 400,
    measureId: 'cup-liquid', texture: 'pureed', costTier: 'medium', availability: ALL }),

  // ── Staples ────────────────────────────────────────────────────────────
  food('rice-boiled', '01_135', { name: 'Boiled white rice', igboName: 'Osikapa', role: 'staple', slots: ['lunch', 'dinner'], unit: g(), min: 100, max: 400,
    measureId: 'serving-spoon-rice', texture: 'soft', costTier: 'medium', availability: ALL }),
  food('yam-boiled', '02_078', { name: 'Boiled yam', igboName: 'Ji', role: 'staple', slots: ['breakfast', 'lunch', 'dinner'], unit: g(), min: 100, max: 350,
    measureId: 'piece-yam', texture: 'soft', preparationNote: 'mash for a soft diet', costTier: 'medium', availability: ALL }),
  food('plantain-boiled', '02_065', { name: 'Boiled unripe plantain', role: 'staple', slots: ['breakfast', 'lunch', 'dinner'], unit: g(), min: 100, max: 300,
    texture: 'soft', costTier: 'low', availability: ALL }),
  food('bread', '01_046', { name: 'White bread', role: 'staple', slots: ['breakfast', 'snack'], unit: piece(30, 'slice', 'slices'), min: 1, max: 4,
    measureId: 'slice-bread', texture: 'regular', costTier: 'low', availability: ALL }),

  // ── Swallows ───────────────────────────────────────────────────────────
  dish('eba', { role: 'swallow', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'wrap-swallow', texture: 'soft' }),
  dish('akpu', { role: 'swallow', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'wrap-swallow', texture: 'soft' }),
  dish('pounded-yam', { role: 'swallow', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'wrap-swallow', texture: 'soft' }),
  dish('amala', { role: 'swallow', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'wrap-swallow', texture: 'soft' }),
  dish('semovita', { role: 'swallow', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'wrap-swallow', texture: 'soft' }),

  // ── Soups (eaten with a swallow) ───────────────────────────────────────
  dish('ofe-onugbu', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('ofe-oha', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('egusi-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('ogbono-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('okra-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef', lean: true }),
  dish('nsala-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'fish', lean: true }),
  dish('ofe-akwu', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('afang-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef', lean: true }),
  dish('vegetable-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef', lean: true }),
  dish('groundnut-soup', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('efo-riro', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef', lean: true }),
  dish('gbegiri', { role: 'soup', slots: MAIN, unit: half, min: 0.5, max: 2, texture: 'pureed', proteinSource: 'legume', lean: true }),
  dish('miyan-kuka', { role: 'soup', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),

  // ── One-pot dishes ─────────────────────────────────────────────────────
  dish('jollof-rice', { role: 'one_pot', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'cup-cooked-rice', texture: 'soft' }),
  dish('white-rice-stew', { role: 'one_pot', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'soft', proteinSource: 'beef' }),
  dish('fried-rice', { role: 'one_pot', slots: MAIN, unit: half, min: 0.5, max: 2, measureId: 'cup-cooked-rice', texture: 'regular', tags: ['fried'], proteinSource: 'offal' }),
  dish('ofada-ayamase', { role: 'one_pot', slots: MAIN, unit: whole, min: 1, max: 1, texture: 'regular', proteinSource: 'beef' }),
  dish('beans-porridge', { role: 'one_pot', slots: ['breakfast', 'lunch', 'dinner'], unit: half, min: 0.5, max: 2, measureId: 'cup-beans-porridge', texture: 'soft', proteinSource: 'legume', lean: true }),
  dish('yam-pottage', { role: 'one_pot', slots: MAIN, unit: half, min: 0.5, max: 2, texture: 'soft' }),
  dish('abacha', { role: 'one_pot', slots: ['lunch', 'dinner', 'snack'], unit: half, min: 0.5, max: 1.5, texture: 'regular', proteinSource: 'fish' }),
  dish('catfish-pepper-soup', { role: 'one_pot', slots: MAIN, unit: whole, min: 1, max: 1, texture: 'soft', proteinSource: 'fish', lean: true, needsStaple: true }),

  // ── Protein sides (whole pieces) ───────────────────────────────────────
  food('egg-boiled', '08_002', { name: 'Boiled egg', igboName: 'Akwa', role: 'protein', slots: ['breakfast', 'lunch', 'dinner', 'snack'], unit: piece(50, 'egg', 'eggs'), min: 1, max: 3,
    measureId: 'egg', texture: 'soft', preparationNote: 'mash for a minced diet', proteinSource: 'egg', lean: true, energyDense: true, costTier: 'low', availability: ALL }),
  food('tilapia-grilled', '09_043', { name: 'Grilled tilapia', igboName: 'Azu', role: 'protein', slots: MAIN, unit: piece(60, 'piece', 'pieces'), min: 1, max: 3,
    measureId: 'piece-fish', texture: 'soft', preparationNote: 'flake, bones removed', proteinSource: 'fish', lean: true, costTier: 'medium', availability: ALL }),
  food('catfish-grilled', '09_081', { name: 'Grilled catfish', igboName: 'Azu', role: 'protein', slots: MAIN, unit: piece(60, 'piece', 'pieces'), min: 1, max: 3,
    measureId: 'piece-fish', texture: 'soft', preparationNote: 'flake, bones removed', proteinSource: 'fish', lean: true, costTier: 'high', availability: ALL }),
  food('sardine-canned', '09_037', { name: 'Sardines (canned in oil, drained)', role: 'protein', slots: ['breakfast', 'lunch', 'dinner'], unit: g(), min: 40, max: 120,
    texture: 'soft', proteinSource: 'fish', costTier: 'medium', availability: HOME }),
  food('beef-stewed', '07_086', { name: 'Stewed beef', igboName: 'Anu ehi', role: 'protein', slots: MAIN, unit: piece(40, 'piece', 'pieces'), min: 1, max: 4,
    measureId: 'piece-meat', texture: 'regular', proteinSource: 'beef', costTier: 'medium', availability: ALL }),
  food('goat-stewed', '07_112', { name: 'Stewed goat meat', igboName: 'Anu ewu', role: 'protein', slots: MAIN, unit: piece(40, 'piece', 'pieces'), min: 1, max: 3,
    measureId: 'piece-meat', texture: 'regular', proteinSource: 'goat', costTier: 'high', availability: HOME }),
  food('chicken-boiled', '07_037', { name: 'Boiled chicken', igboName: 'Okuko', role: 'protein', slots: MAIN, unit: piece(80, 'piece', 'pieces'), min: 1, max: 2,
    measureId: 'piece-chicken', texture: 'soft', preparationNote: 'skin and bone removed, cut small', proteinSource: 'poultry', lean: true, costTier: 'medium', availability: ALL }),
  food('liver-stewed', '07_089', { name: 'Stewed beef liver', role: 'protein', slots: MAIN, unit: g(), min: 40, max: 100,
    texture: 'soft', proteinSource: 'offal', costTier: 'medium', availability: ALL }),
  food('pork-stewed', '07_121', { name: 'Stewed lean pork', igboName: 'Anu ezi', role: 'protein', slots: MAIN, unit: piece(40, 'piece', 'pieces'), min: 1, max: 3,
    measureId: 'piece-meat', texture: 'regular', proteinSource: 'pork', costTier: 'medium', availability: HOME }),
  dish('fried-fish', { role: 'protein', slots: MAIN, unit: whole, min: 1, max: 2, texture: 'regular', tags: ['fried'], proteinSource: 'fish' }),
  dish('fried-chicken', { role: 'protein', slots: MAIN, unit: whole, min: 1, max: 1, texture: 'regular', tags: ['fried'], proteinSource: 'poultry' }),
  dish('suya', { role: 'protein', slots: ['dinner', 'snack'], unit: whole, min: 1, max: 1, texture: 'regular', proteinSource: 'beef' }),

  // ── Legumes, dairy ─────────────────────────────────────────────────────
  food('beans-boiled', '03_096', { name: 'Boiled beans (cowpea)', igboName: 'Agwa', role: 'legume', slots: ['lunch', 'dinner'], unit: g(), min: 100, max: 300,
    measureId: 'cup-beans-porridge', texture: 'soft', preparationNote: 'mash for a minced diet', proteinSource: 'legume', lean: true, costTier: 'low', availability: ALL }),
  food('milk', '10_001', { name: 'Milk (whole)', role: 'dairy', slots: ['breakfast', 'snack'], unit: g(), min: 100, max: 400,
    measureId: 'cup-liquid', texture: 'liquid', proteinSource: 'dairy', energyDense: true, costTier: 'medium', availability: ALL }),
  food('yoghurt', '10_005', { name: 'Plain yoghurt', role: 'dairy', slots: ['breakfast', 'snack'], unit: g(), min: 100, max: 250,
    measureId: 'cup-liquid', texture: 'pureed', proteinSource: 'dairy', costTier: 'medium', availability: HOME }),

  // ── Vegetables ─────────────────────────────────────────────────────────
  food('greens-boiled', '04_116', { name: 'Boiled pumpkin leaves (in place of ugu)', role: 'vegetable', slots: MAIN, unit: g(), min: 50, max: 150,
    measureId: 'serving-spoon-veg', texture: 'pureed', preparationNote: 'chop finely for a soft diet; blend smooth for a pureed diet', lean: true, costTier: 'low', availability: ALL }),
  food('cabbage-raw', '04_005', { name: 'Raw cabbage salad', role: 'vegetable', slots: MAIN, unit: g(), min: 40, max: 100,
    measureId: 'handful-salad', texture: 'regular', tags: ['raw_vegetable'], lean: true, costTier: 'low', availability: ALL }),
  food('cucumber', '04_032', { name: 'Cucumber', role: 'vegetable', slots: ['lunch', 'dinner', 'snack'], unit: g(), min: 40, max: 120,
    measureId: 'handful-salad', texture: 'regular', tags: ['raw_vegetable'], lean: true, costTier: 'low', availability: ALL }),
  food('carrot-raw', '04_006', { name: 'Raw carrot', role: 'vegetable', slots: ['lunch', 'dinner', 'snack'], unit: g(), min: 30, max: 80,
    measureId: 'handful-salad', texture: 'regular', tags: ['raw_vegetable'], lean: true, costTier: 'low', availability: ALL }),
  food('tomato-raw', '04_021', { name: 'Fresh tomato', role: 'vegetable', slots: MAIN, unit: g(), min: 40, max: 100,
    measureId: 'handful-salad', texture: 'regular', tags: ['raw_vegetable'], lean: true, costTier: 'low', availability: ALL }),
  dish('coleslaw', { role: 'vegetable', slots: MAIN, unit: whole, min: 1, max: 1, texture: 'regular', tags: ['raw_vegetable'] }),

  // ── Fruit ──────────────────────────────────────────────────────────────
  food('orange', '05_016', { name: 'Orange', igboName: 'Oroma', role: 'fruit', slots: ['breakfast', 'snack'], unit: piece(130, 'orange', 'oranges'), min: 1, max: 2,
    measureId: 'orange-fruit', texture: 'regular', lean: true, costTier: 'low', availability: ALL }),
  food('pawpaw', '05_017', { name: 'Pawpaw (ripe)', igboName: 'Okwuru bekee', role: 'fruit', slots: ['breakfast', 'snack'], unit: g(), min: 100, max: 300,
    measureId: 'cup-cut-fruit', texture: 'pureed', preparationNote: 'mash for a pureed diet', lean: true, costTier: 'low', availability: ALL }),
  food('watermelon', '05_022', { name: 'Watermelon', role: 'fruit', slots: ['breakfast', 'snack'], unit: g(), min: 150, max: 400,
    measureId: 'cup-cut-fruit', texture: 'soft', preparationNote: 'seeds removed', lean: true, costTier: 'low', availability: ALL }),
  food('banana', '05_028', { name: 'Banana', role: 'fruit', slots: ['breakfast', 'snack'], unit: piece(100, 'banana', 'bananas'), min: 1, max: 2,
    measureId: 'banana-fruit', texture: 'pureed', preparationNote: 'mash for a pureed diet', costTier: 'low', availability: ALL }),

  // ── Snacks, drinks ─────────────────────────────────────────────────────
  food('groundnut', '06_010', { name: 'Groundnuts', igboName: 'Ahuekere', role: 'snack', slots: ['snack'], unit: g(), min: 15, max: 60,
    measureId: 'handful-groundnut', texture: 'regular', energyDense: true, costTier: 'low', availability: ALL }),
  food('cashew', '06_001', { name: 'Cashew nuts', role: 'snack', slots: ['snack'], unit: g(), min: 15, max: 50,
    texture: 'regular', energyDense: true, costTier: 'high', availability: HOME }),
  dish('puff-puff', { role: 'snack', slots: ['snack'], unit: whole, min: 1, max: 1, texture: 'regular', tags: ['fried'] }),
  dish('chin-chin', { role: 'snack', slots: ['snack'], unit: whole, min: 1, max: 1, texture: 'regular', tags: ['fried'] }),
  dish('buns', { role: 'snack', slots: ['snack'], unit: whole, min: 1, max: 1, texture: 'regular', tags: ['fried'] }),
  dish('meat-pie', { role: 'snack', slots: ['snack'], unit: whole, min: 1, max: 1, texture: 'regular', proteinSource: 'beef' }),
  dish('sausage-roll', { role: 'snack', slots: ['snack'], unit: whole, min: 1, max: 1, texture: 'regular', proteinSource: 'beef' }),
  dish('zobo', { role: 'drink', slots: ['snack'], unit: whole, min: 1, max: 1, measureId: 'cup-zobo', texture: 'liquid', tags: ['sugary_drink'] }),
  dish('kunu', { role: 'drink', slots: ['snack'], unit: whole, min: 1, max: 2, measureId: 'cup-kunu', texture: 'liquid', tags: ['sugary_drink'] }),
  dish('tiger-nut-milk', { role: 'drink', slots: ['snack'], unit: whole, min: 1, max: 2, measureId: 'cup-tiger-nut-milk', texture: 'liquid', tags: ['sugary_drink'], energyDense: true }),

  // ── Energy-dense additions (weight gain) ───────────────────────────────
  food('palm-oil', '11_004', { name: 'Red palm oil (added)', igboName: 'Mmanu nkwu', role: 'fat', slots: ['lunch', 'dinner'], unit: g(), min: 5, max: 20,
    measureId: 'teaspoon-oil', texture: 'liquid', energyDense: true, costTier: 'low', availability: ALL }),
  food('groundnut-paste', '06_026', { name: 'Groundnut paste (added)', role: 'fat', slots: ['breakfast', 'snack'], unit: g(), min: 10, max: 30,
    texture: 'pureed', preparationNote: 'stir into pap or spread on bread', energyDense: true, costTier: 'low', availability: ALL }),
  food('milk-powder', '10_002', { name: 'Milk powder (added)', role: 'fat', slots: ['breakfast', 'snack'], unit: g(), min: 10, max: 30,
    texture: 'liquid', preparationNote: 'stir into pap, porridge or drinks', energyDense: true, proteinSource: 'dairy', costTier: 'medium', availability: ALL }),
];
