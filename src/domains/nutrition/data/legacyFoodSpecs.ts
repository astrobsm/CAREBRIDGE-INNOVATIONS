/**
 * How each item of the four retired hard-coded food lists maps onto the
 * WAFCT 2019 dataset and the seed recipes. Only the MAPPING lives here (which
 * food or recipe, how many grams or portions); the numbers are calculated by
 * services/legacyFoodAdapters.ts.
 *
 * Retired lists:
 *   1. src/data/nigerianFoods.ts (F)              → NIGERIAN_FOODS_SPEC
 *   2. nutritionPlannerService.africanFoodDatabase → PLANNER_FOODS_SPEC
 *   3. NutritionPage.tsx inline list              → NUTRITION_PAGE_SPEC
 *   4. MealPlanGenerator.tsx inline list          → MEAL_GENERATOR_SPEC
 *
 * Items with no basis in WAFCT 2019 or the seed recipes are listed in
 * RETIRED_WITHOUT_SOURCE and no longer offered (no unsourced numbers).
 */

export type Part = { food: string; g: number } | { recipe: string; portions: number };

const f = (food: string, g: number): Part => ({ food, g });
const r = (recipe: string, portions = 1): Part => ({ recipe, portions });

// Shared compositions.
const EGG_SAUCE: Part[] = [f('08_003', 50), f('04_021', 40), f('04_018', 10), f('11_031', 5)];
const EGG_SARDINE_SAUCE: Part[] = [f('08_003', 50), f('09_037', 40), f('04_021', 30), f('04_018', 10), f('11_031', 5)];

// ── 1. src/data/nigerianFoods.ts ───────────────────────────────────────────
export interface NigerianFoodSpec { name: string; qty: string; parts: Part[] }

export const NIGERIAN_FOODS_SPEC = {
  pap:        { name: 'Pap / akamu', qty: '1 large bowl (300 ml)', parts: [f('01_100', 300)] },
  moimoi:     { name: 'Moi moi (beans)', qty: '1 wrap', parts: [r('moi-moi')] },
  akara:      { name: 'Akara (bean cakes)', qty: '3 balls', parts: [r('akara')] },
  bread:      { name: 'Wheat bread', qty: '2 slices (60 g)', parts: [f('01_046', 60)] },
  eggs2:      { name: 'Boiled eggs', qty: '2 eggs (100 g)', parts: [f('08_002', 100)] },
  eggSauce:   { name: 'Egg & sardine sauce', qty: '1 serving', parts: EGG_SARDINE_SAUCE },
  yamBoiled:  { name: 'Boiled yam', qty: '4 slices (200 g)', parts: [f('02_078', 200)] },
  dodo:       { name: 'Fried plantain (dodo)', qty: '1 serving (150 g)', parts: [f('02_084', 150)] },
  oatmeal:    { name: 'Oatmeal + milk', qty: '1 bowl', parts: [f('01_133', 250), f('10_001', 100)] },
  milk:       { name: 'Fresh milk', qty: '1 glass (200 ml)', parts: [f('10_001', 200)] },
  yoghurt:    { name: 'Plain yoghurt', qty: '1 cup (150 ml)', parts: [f('10_005', 150)] },
  groundnut:  { name: 'Groundnuts', qty: '1 handful (30 g)', parts: [f('06_010', 30)] },
  orange:     { name: 'Orange', qty: '1 fruit (130 g edible)', parts: [f('05_016', 130)] },
  pawpaw:     { name: 'Pawpaw (vit A/C)', qty: '1 cup (145 g)', parts: [f('05_017', 145)] },
  watermelon: { name: 'Watermelon (hydrating)', qty: '1 cup (150 g)', parts: [f('05_022', 150)] },
  banana:     { name: 'Banana', qty: '1 fruit (100 g edible)', parts: [f('05_028', 100)] },
  tigernut:   { name: 'Tigernut + coconut', qty: '1 serving', parts: [f('02_024', 30), f('06_002', 20)] },
  dates:      { name: 'Dates (iron/energy)', qty: '4 pieces (32 g)', parts: [f('05_031', 32)] },
  jollof:     { name: 'Jollof rice', qty: '1 plate', parts: [r('jollof-rice')] },
  whiteRice:  { name: 'White rice', qty: '1 plate (250 g)', parts: [f('01_135', 250)] },
  ofada:      { name: 'Ofada rice', qty: '1 plate (250 g)', parts: [f('01_136', 250)] },
  beans:      { name: 'Beans (cooked)', qty: '1 cup (200 g)', parts: [f('03_096', 200)] },
  eba:        { name: 'Eba (garri)', qty: '1 wrap', parts: [r('eba')] },
  poundedYam: { name: 'Pounded yam', qty: '1 wrap', parts: [r('pounded-yam')] },
  fufu:       { name: 'Akpu / fufu', qty: '1 wrap', parts: [r('akpu')] },
  egusi:      { name: 'Egusi soup', qty: '1 serving', parts: [r('egusi-soup')] },
  ogbono:     { name: 'Ogbono soup', qty: '1 serving', parts: [r('ogbono-soup')] },
  eforiro:    { name: 'Vegetable soup', qty: '1 serving', parts: [r('vegetable-soup')] },
  okro:       { name: 'Okro soup', qty: '1 serving', parts: [r('okra-soup')] },
  vegSoup:    { name: 'Edikang ikong (veg)', qty: '1 serving', parts: [r('vegetable-soup')] },
  pepperSoup: { name: 'Catfish pepper soup', qty: '1 bowl', parts: [r('catfish-pepper-soup')] },
  fish:       { name: 'Grilled fish (tilapia)', qty: '1 fillet (120 g)', parts: [f('09_043', 120)] },
  chicken:    { name: 'Boiled chicken', qty: '1 piece (120 g)', parts: [f('07_037', 120)] },
  beef:       { name: 'Beef (stewed)', qty: '100 g', parts: [f('07_086', 100)] },
  goat:       { name: 'Goat meat (stewed)', qty: '100 g', parts: [f('07_112', 100)] },
  ugu:        { name: 'Ugwu / vegetable side', qty: '1 serving (80 g)', parts: [f('04_116', 80)] },
  liver:      { name: 'Liver (iron/folate)', qty: '80 g', parts: [f('07_089', 80)] },
} satisfies Record<string, NigerianFoodSpec>;

// ── 2. nutritionPlannerService.africanFoodDatabase ─────────────────────────
type PlannerCategory = 'cereals' | 'legumes' | 'vegetables' | 'fruits' | 'meat' | 'fish' | 'dairy' | 'oils' | 'beverages' | 'traditional';
export interface PlannerFoodSpec {
  id: string; name: string; localName?: string; category: PlannerCategory; servingSize: string;
  parts: Part[];
  isHighProtein: boolean; isLowSodium: boolean; isLowPotassium: boolean; isDiabeticFriendly: boolean; isRenalFriendly: boolean;
  costCategory: 'low' | 'medium' | 'high'; seasonality?: string;
}

const pf = (id: string, name: string, localName: string | undefined, category: PlannerCategory, servingSize: string, parts: Part[],
  flags: [boolean, boolean, boolean, boolean, boolean], costCategory: 'low' | 'medium' | 'high', seasonality?: string): PlannerFoodSpec => ({
  id, name, localName, category, servingSize, parts,
  isHighProtein: flags[0], isLowSodium: flags[1], isLowPotassium: flags[2], isDiabeticFriendly: flags[3], isRenalFriendly: flags[4],
  costCategory, seasonality,
});
// flags: [highProtein, lowSodium, lowPotassium, diabeticFriendly, renalFriendly] — kept from the retired list (clinical labels, not composition).
export const PLANNER_FOODS_SPEC: PlannerFoodSpec[] = [
  pf('rice-white', 'White Rice (cooked)', 'Shinkafa', 'cereals', '1 cup (160 g)', [f('01_135', 160)], [false, true, true, false, true], 'low'),
  pf('garri', 'Garri (soaked)', 'Garri', 'cereals', '1 cup (60 g gari + water)', [f('02_039', 60)], [false, true, true, false, true], 'low'),
  pf('pounded-yam', 'Pounded Yam', 'Iyan', 'cereals', '1 wrap', [r('pounded-yam')], [false, true, false, false, false], 'medium'),
  pf('amala', 'Amala (Yam flour)', 'Amala', 'cereals', '1 wrap', [r('amala')], [false, true, false, false, false], 'low'),
  pf('tuwo-shinkafa', 'Tuwo Shinkafa', 'Tuwo', 'cereals', '1 serving (200 g)', [f('01_135', 200)], [false, true, true, false, true], 'low'),
  pf('eba', 'Eba (Garri swallow)', 'Eba', 'cereals', '1 wrap', [r('eba')], [false, true, true, false, true], 'low'),
  pf('semovita', 'Semovita', 'Semovita', 'cereals', '1 wrap', [r('semovita')], [false, true, true, false, true], 'low'),
  pf('wheat-fufu', 'Wheat Fufu', 'Wheat', 'cereals', '1 wrap (75 g flour)', [f('01_082', 75)], [false, true, false, true, false], 'low'),
  pf('beans-cooked', 'Beans (cooked)', 'Ewa', 'legumes', '1 cup (180 g)', [f('03_096', 180)], [true, true, false, true, false], 'low'),
  pf('moi-moi', 'Moi Moi', 'Moi Moi', 'legumes', '1 wrap', [r('moi-moi')], [true, false, false, true, false], 'low'),
  pf('akara', 'Akara (Bean cakes)', 'Akara/Kosai', 'legumes', '3 balls', [r('akara')], [true, false, false, true, false], 'low'),
  pf('groundnut', 'Groundnuts', 'Gyada', 'legumes', '1/4 cup (37 g)', [f('06_010', 37)], [true, true, false, true, false], 'low'),
  pf('chicken-breast', 'Chicken Breast (grilled)', undefined, 'meat', '100 g', [f('07_035', 100)], [true, true, false, true, false], 'medium'),
  pf('beef-stew', 'Beef (stewed)', undefined, 'meat', '100 g', [f('07_086', 100)], [true, false, false, true, false], 'high'),
  pf('goat-meat', 'Goat Meat (stewed)', 'Eran Ewure', 'meat', '100 g', [f('07_112', 100)], [true, false, false, true, false], 'high'),
  pf('dried-fish', 'Dried Fish (Stockfish)', 'Okporoko', 'fish', '50 g', [f('09_053', 50)], [true, false, false, true, false], 'medium'),
  pf('catfish', 'Catfish (grilled)', 'Eja Aro', 'fish', '100 g', [f('09_081', 100)], [true, true, false, true, false], 'medium'),
  pf('tilapia', 'Tilapia Fish (boiled)', 'Eja Cichlid', 'fish', '100 g', [f('09_089', 100)], [true, true, false, true, false], 'medium'),
  pf('eggs-boiled', 'Eggs (boiled)', undefined, 'meat', '2 eggs (100 g)', [f('08_002', 100)], [true, true, true, true, true], 'low'),
  pf('efo-riro', 'Vegetable soup (Efo / ugu)', 'Efo Riro', 'vegetables', '1 serving', [r('vegetable-soup')], [true, false, false, true, false], 'medium'),
  pf('egusi-soup', 'Egusi Soup', 'Egusi', 'traditional', '1 serving', [r('egusi-soup')], [true, false, false, true, false], 'medium'),
  pf('okra-soup', 'Okra Soup', 'Ila', 'traditional', '1 serving', [r('okra-soup')], [false, false, false, true, false], 'low'),
  pf('ogbono-soup', 'Ogbono Soup', 'Ogbono', 'traditional', '1 serving', [r('ogbono-soup')], [false, false, false, true, false], 'medium'),
  pf('vegetable-soup', 'Vegetable Soup (Edikang Ikong)', 'Edikang Ikong', 'traditional', '1 serving', [r('vegetable-soup')], [true, false, false, true, false], 'medium'),
  pf('bitter-leaf-soup', 'Bitter Leaf Soup', 'Ofe Onugbu', 'traditional', '1 serving', [r('ofe-onugbu')], [false, false, false, true, false], 'medium'),
  pf('plantain-ripe', 'Plantain (ripe, fried)', 'Dodo', 'fruits', '1 serving (150 g)', [f('02_084', 150)], [false, true, false, false, false], 'low'),
  pf('plantain-unripe', 'Plantain (unripe, boiled)', 'Plantain', 'fruits', '1 medium (150 g)', [f('02_065', 150)], [false, true, false, true, false], 'low'),
  pf('orange', 'Orange', undefined, 'fruits', '1 medium (130 g)', [f('05_016', 130)], [false, true, false, true, false], 'low'),
  pf('banana', 'Banana', undefined, 'fruits', '1 medium (118 g)', [f('05_028', 118)], [false, true, false, false, false], 'low'),
  pf('pawpaw', 'Pawpaw (Papaya)', undefined, 'fruits', '1 cup (145 g)', [f('05_017', 145)], [false, true, false, true, false], 'low'),
  pf('watermelon', 'Watermelon', undefined, 'fruits', '2 cups (280 g)', [f('05_022', 280)], [false, true, true, false, true], 'low'),
  pf('palm-wine', 'Palm Wine', 'Emu', 'beverages', '1 cup (240 g)', [f('12_006', 240)], [false, true, false, false, false], 'low'),
];

// ── 3. NutritionPage.tsx inline list ──────────────────────────────────────
export interface PageFoodSpec { name: string; portion: string; parts: Part[] }
const pg = (name: string, portion: string, parts: Part[]): PageFoodSpec => ({ name, portion, parts });

export const NUTRITION_PAGE_SPEC: Record<'grains' | 'soups' | 'proteins' | 'vegetables' | 'snacks' | 'beverages', PageFoodSpec[]> = {
  grains: [
    pg('Jollof Rice', '1 plate', [r('jollof-rice')]),
    pg('White Rice', '1 cup (200g)', [f('01_135', 200)]),
    pg('Tuwo Shinkafa', '1 ball (150g)', [f('01_135', 150)]),
    pg('Semovita', '1 wrap', [r('semovita')]),
    pg('Garri (Eba)', '1 wrap', [r('eba')]),
    pg('Pounded Yam', '1 wrap', [r('pounded-yam')]),
    pg('Amala', '1 wrap', [r('amala')]),
    pg('Akpu / Fufu', '1 wrap', [r('akpu')]),
    pg('Wheat Meal (Swallow)', '1 wrap (75g flour)', [f('01_082', 75)]),
    pg('Oat Meal', '1 cup (200g)', [f('01_133', 200)]),
    pg('Okpa', '1 wrap', [r('okpa')]),
    pg('Yam Pottage', '1 plate', [r('yam-pottage')]),
  ],
  soups: [
    pg('Egusi Soup', '1 serving', [r('egusi-soup')]),
    pg('Ogbono Soup', '1 serving', [r('ogbono-soup')]),
    pg('Okro Soup', '1 serving', [r('okra-soup')]),
    pg('Bitterleaf Soup (Ofe Onugbu)', '1 serving', [r('ofe-onugbu')]),
    pg('Afang Soup', '1 serving', [r('afang-soup')]),
    pg('Edikang Ikong / Vegetable Soup', '1 serving', [r('vegetable-soup')]),
    pg('Pepper Soup (catfish)', '1 bowl', [r('catfish-pepper-soup')]),
    pg('Ofe Akwu (Banga)', '1 serving', [r('ofe-akwu')]),
  ],
  proteins: [
    pg('Grilled Fish', '1 piece (150g)', [f('09_043', 150)]),
    pg('Stockfish / Dried Fish', '1 piece (100g)', [f('09_053', 100)]),
    pg('Beef (Stewed)', '3 pieces (150g)', [f('07_086', 150)]),
    pg('Goat Meat', '3 pieces (150g)', [f('07_112', 150)]),
    pg('Chicken (Grilled)', '1 piece (150g)', [f('07_038', 150)]),
    pg('Egg (Boiled)', '1 large egg (50g)', [f('08_002', 50)]),
    pg('Egg (Fried)', '1 large egg (50g)', [f('08_003', 50)]),
    pg('Kilishi (dried beef)', '50g', [f('07_017', 50)]),
    pg('Moi Moi', '1 wrap', [r('moi-moi')]),
    pg('Akara', '5 balls', [r('akara', 5 / 3)]),
  ],
  vegetables: [
    pg('Garden Salad', '1 bowl (150g)', [f('04_040', 60), f('04_021', 50), f('04_032', 40)]),
    pg('Plantain (Fried)', '1 plantain (150g)', [f('02_084', 150)]),
    pg('Plantain (Boiled)', '1 plantain', [r('boiled-plantain')]),
    pg('Beans (Stewed)', '1 cup (200g)', [f('03_096', 200)]),
    pg('Beans Porridge', '1 plate', [r('beans-porridge')]),
    pg('Abacha (African Salad)', '1 plate', [r('abacha')]),
  ],
  snacks: [
    pg('Groundnuts', '50g', [f('06_010', 50)]),
    pg('Cashew Nuts', '50g', [f('06_001', 50)]),
  ],
  beverages: [
    pg('Palm Wine', '1 glass (200ml)', [f('12_006', 200)]),
    pg('Fura da Nono', '1 cup (300ml)', [f('01_097', 100), f('10_022', 200)]),
    pg('Pap (Ogi)', '1 cup (250ml)', [f('01_100', 250)]),
    pg('Akamu with Milk & Groundnut', '1 large bowl', [r('akamu-fortified')]),
    pg('Orange Juice (Fresh)', '1 glass (250ml)', [f('12_011', 250)]),
  ],
};

// ── 4. MealPlanGenerator.tsx inline list ──────────────────────────────────
type GenCategory = 'cereals' | 'legumes' | 'meat' | 'fish' | 'vegetables' | 'fruits' | 'traditional' | 'beverages';
type GenMeal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface GeneratorFoodSpec {
  id: string; name: string; localName?: string; category: GenCategory; mealTypes: GenMeal[]; servingSize: string;
  parts: Part[]; isHighProtein: boolean; isDiabeticFriendly: boolean; costCategory: 'low' | 'medium' | 'high';
}
const g = (id: string, name: string, localName: string | undefined, category: GenCategory, mealTypes: GenMeal[], servingSize: string,
  parts: Part[], isHighProtein: boolean, isDiabeticFriendly: boolean, costCategory: 'low' | 'medium' | 'high'): GeneratorFoodSpec =>
  ({ id, name, localName, category, mealTypes, servingSize, parts, isHighProtein, isDiabeticFriendly, costCategory });
const LD: GenMeal[] = ['lunch', 'dinner'];

export const MEAL_GENERATOR_SPEC: GeneratorFoodSpec[] = [
  g('pap', 'Pap (Ogi/Akamu)', 'Ogi', 'cereals', ['breakfast'], '1 bowl (300 g)', [f('01_100', 300)], false, false, 'low'),
  g('akamu-fortified', 'Akamu with Milk & Groundnut', 'Akamu', 'cereals', ['breakfast'], '1 large bowl', [r('akamu-fortified')], false, false, 'low'),
  g('akara', 'Akara (Bean Cakes)', 'Kosai', 'legumes', ['breakfast', 'snack'], '4 balls', [r('akara', 4 / 3)], true, true, 'low'),
  g('moi-moi', 'Moi Moi (Steamed Beans)', 'Moi Moi', 'legumes', ['breakfast', 'lunch'], '2 wraps', [r('moi-moi', 2)], true, true, 'low'),
  g('okpa', 'Okpa', 'Okpa', 'legumes', ['breakfast'], '1 wrap', [r('okpa')], true, true, 'low'),
  g('bread-egg', 'Bread with Fried Eggs', undefined, 'cereals', ['breakfast'], '2 slices + 2 eggs', [f('01_046', 60), f('08_003', 100)], true, false, 'low'),
  g('yam-egg', 'Boiled Yam with Egg Sauce', 'Ji', 'cereals', ['breakfast', 'lunch'], '3 slices + sauce', [f('02_078', 200), ...EGG_SAUCE], true, false, 'low'),
  g('eba', 'Eba (Garri Swallow)', 'Eba', 'cereals', LD, '1 wrap', [r('eba')], false, false, 'low'),
  g('akpu', 'Akpu / Fufu', 'Akpu', 'cereals', LD, '1 wrap', [r('akpu')], false, false, 'low'),
  g('pounded-yam', 'Pounded Yam', 'Iyan', 'cereals', LD, '1 wrap', [r('pounded-yam')], false, false, 'medium'),
  g('amala', 'Amala (Yam Flour)', 'Amala', 'cereals', LD, '1 wrap', [r('amala')], false, false, 'low'),
  g('semovita', 'Semovita/Semolina', undefined, 'cereals', LD, '1 wrap', [r('semovita')], false, false, 'low'),
  g('wheat', 'Wheat Meal', undefined, 'cereals', LD, '1 wrap (75 g flour)', [f('01_082', 75)], true, true, 'low'),
  g('tuwo', 'Tuwo Shinkafa', 'Tuwo', 'cereals', LD, '1 serving (200 g)', [f('01_135', 200)], false, false, 'low'),
  g('egusi', 'Egusi Soup', 'Egusi', 'traditional', LD, '1 serving', [r('egusi-soup')], true, true, 'medium'),
  g('ogbono', 'Ogbono Soup', 'Ogbono', 'traditional', LD, '1 serving', [r('ogbono-soup')], false, true, 'medium'),
  g('okra', 'Okra Soup', 'Ila', 'traditional', LD, '1 serving', [r('okra-soup')], true, true, 'low'),
  g('efo-riro', 'Vegetable Soup (Efo)', 'Efo Riro', 'vegetables', LD, '1 serving', [r('vegetable-soup')], true, true, 'medium'),
  g('edikang', 'Edikang Ikong Soup', undefined, 'vegetables', LD, '1 serving', [r('vegetable-soup')], true, true, 'high'),
  g('bitter-leaf', 'Bitter Leaf Soup', 'Ofe Onugbu', 'traditional', LD, '1 serving', [r('ofe-onugbu')], true, true, 'medium'),
  g('banga', 'Banga Soup (Palm Nut)', 'Ofe Akwu', 'traditional', LD, '1 serving', [r('ofe-akwu')], true, true, 'medium'),
  g('afang', 'Afang Soup', 'Afang', 'vegetables', LD, '1 serving', [r('afang-soup')], true, true, 'high'),
  g('nsala', 'Nsala (White) Soup', 'Ofe Nsala', 'traditional', LD, '1 serving', [r('nsala-soup')], true, true, 'high'),
  g('jollof', 'Jollof Rice', undefined, 'cereals', LD, '1 plate', [r('jollof-rice')], false, false, 'medium'),
  g('rice-stew', 'White Rice with Stew', undefined, 'cereals', LD, '1 plate', [r('white-rice-stew')], false, false, 'low'),
  g('chicken', 'Grilled Chicken', undefined, 'meat', LD, '1 piece (120 g)', [f('07_038', 120)], true, true, 'medium'),
  g('fish-grilled', 'Grilled Fish (Tilapia)', undefined, 'fish', LD, '1 medium (150 g)', [f('09_043', 150)], true, true, 'medium'),
  g('catfish', 'Catfish Pepper Soup', 'Point and Kill', 'fish', LD, '1 bowl', [r('catfish-pepper-soup')], true, true, 'high'),
  g('goat-meat', 'Goat Meat Stew', 'Asun', 'meat', LD, '100 g', [f('07_112', 100)], true, true, 'high'),
  g('beef', 'Beef Stew', undefined, 'meat', LD, '100 g', [f('07_086', 100)], true, true, 'medium'),
  g('eggs', 'Boiled Eggs', undefined, 'meat', ['breakfast', 'lunch', 'snack'], '2 eggs (100 g)', [f('08_002', 100)], true, true, 'low'),
  g('beans-stew', 'Beans and Plantain', 'Ewa Riro', 'legumes', LD, '1 plate', [r('beans-porridge'), f('02_084', 100)], true, true, 'low'),
  g('abacha', 'Abacha (African Salad)', 'Abacha', 'traditional', ['lunch', 'snack'], '1 plate', [r('abacha')], false, false, 'low'),
  g('groundnut', 'Groundnuts', 'Gyada', 'legumes', ['snack'], '1/2 cup (70 g)', [f('06_010', 70)], true, true, 'low'),
  g('dodo', 'Fried Plantain (Dodo)', 'Dodo', 'fruits', ['snack', 'breakfast', 'lunch'], '1 serving (150 g)', [f('02_084', 150)], false, false, 'low'),
  g('fruits', 'Fresh Fruits (Orange, Pawpaw)', undefined, 'fruits', ['snack', 'breakfast'], '1 orange + 1 small cup pawpaw', [f('05_016', 130), f('05_017', 100)], false, true, 'low'),
];

/** Items of the retired lists dropped because neither WAFCT 2019 nor a seed recipe covers them. */
export const RETIRED_WITHOUT_SOURCE = {
  nutritionPlannerService: ['zobo (Zobo hibiscus drink)', 'kunu (Kunu millet drink)'],
  nutritionPage: ['Fried Rice', 'Groundnut Soup', 'Fried Fish', 'Chicken (Fried)', 'Suya', 'Coleslaw', 'Puff Puff', 'Chin Chin',
    'Meat Pie', 'Sausage Roll', 'Buns', 'Zobo (Hibiscus)', 'Kunu', 'Tiger Nut Milk (Kunun Aya)', 'Efo Riro (merged into Vegetable Soup)'],
  mealPlanGenerator: ['miyan-kuka', 'fried-rice', 'ofada (Ofada Rice with Ayamase)', 'gbegiri', 'chin-chin', 'puff-puff', 'zobo', 'kunu'],
  nigerianFoods: [] as string[],
};
