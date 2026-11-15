/**
 * Menu selection: which dishes go in which meal on which day. The solver then
 * sets the amounts. The variety rules are enforced here, by construction:
 *
 *   - the same main dish at most twice a week;
 *   - protein sources rotate: lunch and dinner on the same day are built on
 *     different protein sources (and, where possible, differ from the same
 *     meal the day before);
 *   - a vegetable every day (lunch, and dinner too for weight loss);
 *   - fruit at least once a day unless the restrictions leave none.
 *
 * Candidates are ranked for the patient (CKD: low protein, potassium and
 * phosphate per kcal; weight loss: lean, vegetable-rich, not fried; weight
 * gain: energy-dense; diabetes: less carbohydrate per kcal; plus cost and
 * preferences), then rotated by how often they have been used this week.
 * An `attempt` > 0 perturbs the ranking deterministically, so a day the solver
 * cannot fit gets a genuinely different menu.
 */

import type { PlanRole, PlanSlotKind, ProteinSource } from '../data/plannerCatalogue';
import type { PlanComponent } from './catalogue';
import type { ResolvedRestrictions } from './restrictions';
import type { EnergySplit, MealSlot } from './types';

export interface MenuItem {
  key: string;
  component: PlanComponent;
  slot: MealSlot;
  optional: boolean;
  minVar: number;
  maxVar: number;
}

export interface MenuMeal {
  slot: MealSlot;
  kind: PlanSlotKind;
  share: number;
  pattern: string;
  mainDish: string | null;
  proteinSource: ProteinSource | null;
  items: MenuItem[];
}

export interface DayMenu {
  meals: MenuMeal[];
  fruitRestricted: boolean;
  /** Lunch and dinner had to share a protein source (no alternative left on this menu). */
  rotationRelaxed: boolean;
  notes: string[];
}

export interface MenuContext {
  allowed: PlanComponent[];
  rr: ResolvedRestrictions;
  goal: 'maintain' | 'loss' | 'gain';
  refeeding: boolean;
  /** Energy-dense additions offered (weight gain; CKD, where energy must come from other than protein). */
  energyAdditions: boolean;
  /** A protein ceiling applies (CKD not on dialysis). */
  lowProtein: boolean;
  /** That ceiling, g/day (null = none). */
  proteinMax: number | null;
  swallowMaxPortions: number | null;
  snacks: 2 | 3;
  split: EnergySplit;
}

export interface WeekUsage {
  mainDish: Map<string, number>;
  component: Map<string, number>;
  /** Primary protein source of lunch and dinner on the previous day. */
  previous: { lunch: ProteinSource | null; dinner: ProteinSource | null };
}

export const newWeekUsage = (): WeekUsage => ({ mainDish: new Map(), component: new Map(), previous: { lunch: null, dinner: null } });

export const MAX_MAIN_DISH_PER_WEEK = 2;

export interface EmptyRole { slot: MealSlot; role: PlanRole | string; reason?: 'variety_limit' }

// ── Ranking ───────────────────────────────────────────────────────────────

const COST: Record<string, number> = { low: 0, medium: 0.1, high: 0.2 };

function per100kcal(c: PlanComponent, k: 'protein' | 'potassium' | 'phosphorus' | 'sodium' | 'carbohydrate' | 'fat'): number {
  const e = c.perVar.energyKcal;
  return e > 0 ? (c.perVar[k] * 100) / e : 0;
}

/** Lower is better. */
export function rankScore(c: PlanComponent, ctx: MenuContext): number {
  let s = COST[c.costTier] ?? 0.1;
  const rr = ctx.rr;
  // Fried and sugar-sweetened items are offered, but after the alternatives.
  if (c.tags.has('fried') || c.tags.has('added_sugar') || c.tags.has('sugary_drink')) s += 0.25;
  if (ctx.goal === 'loss') {
    s -= per100kcal(c, 'protein') * 0.03;
    if (c.lean) s -= 0.3;
    if (c.tags.has('fried')) s += 0.4;
    if (c.role === 'swallow') s += 0.2;
  }
  if (ctx.goal === 'gain' || ctx.refeeding) {
    if (c.energyDense) s -= 0.4;
  }
  if (rr.potassiumMgMax !== null) s += per100kcal(c, 'potassium') / 250;
  if (rr.phosphorusMgMax !== null) s += per100kcal(c, 'phosphorus') / 120;
  if (rr.raw.ckd) s += per100kcal(c, 'protein') * 0.08;
  if (rr.sodiumMgMax !== null) s += per100kcal(c, 'sodium') / 250;
  if (rr.diabetes) s += per100kcal(c, 'carbohydrate') * 0.015;
  if (rr.fatGMax !== null) s += per100kcal(c, 'fat') * 0.06;
  if (rr.preferIds.has(c.id)) s -= 0.5;
  return s;
}

/** Deterministic 0–1 hash of a string. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10007) / 10007;
}

// ── Building one day ──────────────────────────────────────────────────────

const SNACK_SLOTS: MealSlot[] = ['mid_morning', 'afternoon', 'evening'];

export function daySlots(snacks: 2 | 3, split: EnergySplit): { slot: MealSlot; kind: PlanSlotKind; share: number }[] {
  const snackShare = split.snacks / snacks;
  return [
    { slot: 'breakfast', kind: 'breakfast', share: split.breakfast },
    { slot: 'mid_morning', kind: 'snack', share: snackShare },
    { slot: 'lunch', kind: 'lunch', share: split.lunch },
    { slot: 'afternoon', kind: 'snack', share: snackShare },
    { slot: 'dinner', kind: 'dinner', share: split.dinner },
    ...(snacks === 3 ? [{ slot: SNACK_SLOTS[2], kind: 'snack' as const, share: snackShare }] : []),
  ];
}

interface PickOpts { avoidSources?: Set<ProteinSource>; mainLimit?: boolean; exclude?: Set<string>; filter?: (c: PlanComponent) => boolean }

const kcalAtMin = (c: PlanComponent) => c.perVar.energyKcal * c.minVar;

export function buildDayMenu(ctx: MenuContext, day: number, energyKcal: number, usage: WeekUsage, attempt: number, seed: number):
  { menu: DayMenu | null; emptyRoles: EmptyRole[] } {
  const notes: string[] = [];
  const emptyRoles: EmptyRole[] = [];
  const salt = `${seed}|${day}|${attempt}`;
  const dayMainUse = new Map<string, number>();
  const usedToday = new Set<string>();
  let ignoreMainLimit = false;

  const candidates = (role: PlanRole | PlanRole[], kind: PlanSlotKind): PlanComponent[] => {
    const roles = Array.isArray(role) ? role : [role];
    return ctx.allowed.filter(c => roles.includes(c.role) && c.slots.includes(kind));
  };
  const mainCount = (key: string) => (ignoreMainLimit ? 0 : (usage.mainDish.get(key) ?? 0) + (dayMainUse.get(key) ?? 0));
  const order = (list: PlanComponent[]): PlanComponent[] => {
    const jitter = attempt === 0 ? 0 : 0.4 + 0.2 * attempt;
    return [...list].map(c => ({
      c,
      k: (usage.component.get(c.id) ?? 0) * 0.35 + (usedToday.has(c.id) ? 1 : 0) + rankScore(c, ctx) + jitter * hash01(`${salt}|${c.id}`),
    })).sort((a, b) => a.k - b.k || a.c.id.localeCompare(b.c.id)).map(x => x.c);
  };
  const pick = (list: PlanComponent[], o: PickOpts = {}): PlanComponent | null => {
    let pool = list.filter(c => !(o.exclude?.has(c.id)) && (!o.filter || o.filter(c)));
    if (o.mainLimit) pool = pool.filter(c => mainCount(c.id) < MAX_MAIN_DISH_PER_WEEK);
    const ordered = order(pool);
    if (o.avoidSources?.size) return ordered.find(c => !c.proteinSource || !o.avoidSources!.has(c.proteinSource)) ?? null;
    return ordered[0] ?? null;
  };
  const item = (c: PlanComponent, slot: MealSlot, optional: boolean, maxOverride?: number): MenuItem => ({
    key: `${slot}:${c.id}`, component: c, slot, optional, minVar: c.minVar,
    maxVar: Math.max(c.minVar, Math.min(c.maxVar, maxOverride ?? Infinity)),
  });

  const fruitAny = ctx.allowed.some(c => c.role === 'fruit');
  const vegAny = ctx.allowed.some(c => c.role === 'vegetable');
  let hasFruit = false;
  let hasVeg = false;
  let rotationRelaxed = false;
  const meals: MenuMeal[] = [];
  const slots = daySlots(ctx.snacks, ctx.split);
  const primaryToday: ProteinSource[] = [];
  const swallowCap = ctx.swallowMaxPortions;
  // CKD (protein ceiling): protein sides are never compulsory, and staples can carry a meal.
  const lowProtein = ctx.lowProtein;

  for (const s of slots) {
    const target = s.share * energyKcal;
    const light = target < 250;
    const avoid = new Set<ProteinSource>(primaryToday);
    const yesterday = s.slot === 'lunch' ? usage.previous.lunch : s.slot === 'dinner' ? usage.previous.dinner : null;
    let meal: MenuMeal | null = null;
    // Energy window: a pattern whose smallest portions already overshoot the
    // meal, or whose largest cannot reach it, is skipped while another fits;
    // under it, each main is also chosen small enough for the meal.
    let strict = true;
    const small = (c: PlanComponent) => !strict || kcalAtMin(c) <= target * 1.2 + 40;
    const fits = (m: MenuMeal | null): MenuMeal | null => {
      if (!m || !strict) return m;
      const lo = m.items.filter(i => !i.optional).reduce((a, i) => a + i.component.perVar.energyKcal * i.minVar, 0);
      const hi = m.items.reduce((a, i) => a + i.component.perVar.energyKcal * i.maxVar, 0);
      if (lo > target * 1.4 + 40 || hi < target * 0.6) return null;
      // Protein ceiling (CKD): the meal's compulsory items must leave room under its share.
      if (ctx.proteinMax !== null) {
        const p = m.items.filter(i => !i.optional).reduce((a, i) => a + i.component.perVar.protein * i.minVar, 0);
        if (p > s.share * ctx.proteinMax * 1.3 + 2) return null;
      }
      return m;
    };

    // ── pattern builders ──
    const finish = (pattern: string, mainDish: string | null, proteinSource: ProteinSource | null, items: MenuItem[]): MenuMeal =>
      ({ slot: s.slot, kind: s.kind, share: s.share, pattern, mainDish, proteinSource, items });
    const addFruit = (items: MenuItem[], required: boolean) => {
      const f = pick(candidates('fruit', s.kind), { exclude: usedToday, filter: small });
      if (f) items.push(item(f, s.slot, !required));
    };
    const addVeg = (items: MenuItem[], required: boolean) => {
      const v = pick(candidates('vegetable', s.kind), { exclude: usedToday });
      if (v) items.push(item(v, s.slot, !required));
      return !!v;
    };
    const addAdditions = (items: MenuItem[]) => {
      if (!ctx.energyAdditions) return;
      const add = pick(candidates('fat', s.kind));
      if (add) items.push(item(add, s.slot, true));
    };
    const buildBreakfast = (p: string): MenuMeal | null => {
      const items: MenuItem[] = [];
      let main: PlanComponent | null;
      if (p === 'light') {
        main = pick(candidates(['breakfast_main', 'staple'], 'breakfast'), { mainLimit: true, filter: small });
        if (!main) return null;
        items.push(item(main, s.slot, false));
      } else if (p === 'main') {
        main = pick(candidates('breakfast_main', 'breakfast'), { mainLimit: true, filter: small });
        if (!main) return null;
        items.push(item(main, s.slot, false));
        const m0 = main;
        const side = pick(candidates(['protein', 'dairy'], 'breakfast'), { filter: c => c.proteinSource !== m0.proteinSource });
        if (side) items.push(item(side, s.slot, !!main.proteinSource || lowProtein));
        else if (!main.proteinSource && !lowProtein) return null;
      } else {
        main = pick(candidates('staple', 'breakfast'), { mainLimit: true, filter: small });
        if (!main) return null;
        items.push(item(main, s.slot, false));
        const prot = pick(candidates('protein', 'breakfast'));
        if (prot) items.push(item(prot, s.slot, lowProtein));
        else if (!lowProtein) return null;
      }
      addAdditions(items);
      if (fruitAny) addFruit(items, !hasFruit);
      const required = items.find(i => i.component.role === 'protein' && !i.optional);
      return finish(p, main.id, main.proteinSource ?? required?.component.proteinSource ?? null, items);
    };
    const buildSnack = (): MenuMeal | null => {
      const items: MenuItem[] = [];
      const pool = candidates(['snack', 'drink', 'dairy', 'fruit', 'breakfast_main', 'protein', 'staple'], 'snack');
      const main = pick(pool, { exclude: usedToday, filter: c => !strict || kcalAtMin(c) <= Math.max(target * 1.6, target + 120) });
      if (!main) return null;
      // A snack is served (the plan has 2–3 snacks) unless the day is so small that it may be skipped.
      items.push(item(main, s.slot, target < 75));
      return finish('snack', null, main.proteinSource, items);
    };
    const buildMain = (p: string, av: Set<ProteinSource>): MenuMeal | null => {
      const items: MenuItem[] = [];
      const needVeg = !hasVeg || ctx.goal === 'loss';
      let mainKey: string; let source: ProteinSource | null;
      const protein = (required: boolean, avoidSet: Set<ProteinSource>) => {
        const pr = pick(candidates('protein', s.kind), { avoidSources: avoidSet, exclude: usedToday });
        if (pr) items.push(item(pr, s.slot, !required || lowProtein));
        return pr;
      };
      const staples = (filter?: (c: PlanComponent) => boolean) => pick(candidates('staple', s.kind), { filter: c => small(c) && (!filter || filter(c)) });
      if (p === 'swallow_soup') {
        const soup = pick(candidates('soup', s.kind), { mainLimit: true, avoidSources: av, filter: small });
        const sw = pick(candidates('swallow', s.kind), { filter: small });
        if (!soup || !sw) return null;
        items.push(item(sw, s.slot, false, swallowCap !== null ? swallowCap / sw.varStep : undefined), item(soup, s.slot, false));
        protein(false, new Set([...av]));
        mainKey = soup.id; source = soup.proteinSource;
      } else if (p === 'one_pot') {
        const dish = pick(candidates('one_pot', s.kind), { mainLimit: true, avoidSources: av, filter: c => small(c) && !c.needsStaple });
        if (!dish) return null;
        items.push(item(dish, s.slot, false));
        if (dish.proteinSource) { protein(false, av); source = dish.proteinSource; }
        else { const pr = protein(true, av); if (!pr && !lowProtein) return null; source = pr?.proteinSource ?? null; }
        mainKey = dish.id;
      } else if (p === 'pepper_soup') {
        const dish = pick(candidates('one_pot', s.kind), { mainLimit: true, avoidSources: av, filter: c => small(c) && c.needsStaple });
        const st = staples(c => c.id !== 'rice-boiled');
        if (!dish || !st) return null;
        items.push(item(dish, s.slot, false), item(st, s.slot, false));
        mainKey = dish.id; source = dish.proteinSource;
      } else if (p === 'staple_legume') {
        const st = staples();
        const leg = pick(candidates('legume', s.kind), { avoidSources: av });
        if (!st || !leg) return null;
        mainKey = `${st.id}+${leg.id}`;
        if (mainCount(mainKey) >= MAX_MAIN_DISH_PER_WEEK) return null;
        items.push(item(st, s.slot, false), item(leg, s.slot, false));
        protein(false, new Set([...av, 'legume']));
        source = 'legume';
      } else if (p === 'staple_protein') {
        // e.g. boiled plantain or yam with egg / fish and greens.
        const st = staples();
        const pr = pick(candidates('protein', s.kind), { avoidSources: av, filter: c => c.unitKind !== 'portion' });
        if (!st || !pr) return null;
        mainKey = `${st.id}+${pr.id}`;
        if (mainCount(mainKey) >= MAX_MAIN_DISH_PER_WEEK) return null;
        items.push(item(st, s.slot, false), item(pr, s.slot, lowProtein));
        source = pr.proteinSource;
      } else if (p === 'legume_dish') {
        // moi moi (a legume dish also served at lunch) with a staple.
        const dish = pick(candidates('breakfast_main', s.kind), { mainLimit: true, avoidSources: av, filter: small });
        const st = staples();
        if (!dish || !st) return null;
        items.push(item(dish, s.slot, false), item(st, s.slot, false));
        mainKey = dish.id; source = dish.proteinSource;
      } else if (p === 'staple_veg') {
        // CKD: a staple carries the meal; protein optional.
        const st = staples();
        if (!st) return null;
        mainKey = `${st.id}+vegetables`;
        if (mainCount(mainKey) >= MAX_MAIN_DISH_PER_WEEK) return null;
        items.push(item(st, s.slot, false));
        const pr = protein(false, av);
        source = pr?.proteinSource ?? null;
      } else {
        // light: one small main (a staple, a half portion of a one-pot dish, or a protein) for low-energy days.
        const main = pick(candidates(['staple', 'legume', 'protein', 'one_pot'], s.kind), { mainLimit: true, avoidSources: av, filter: c => small(c) && !c.needsStaple });
        if (!main) return null;
        items.push(item(main, s.slot, false));
        if (!main.proteinSource) { const pr = protein(false, av); source = pr?.proteinSource ?? null; } else source = main.proteinSource;
        mainKey = main.id;
      }
      if ((needVeg || p === 'staple_veg') && vegAny) { if (!addVeg(items, true)) return null; }
      addAdditions(items);
      return finish(p, mainKey, source, items);
    };

    if (s.kind === 'breakfast') {
      // A light (low-energy) meal always tries the one-item pattern first.
      const patterns = ['main', 'staple'];
      const rot = (day + attempt) % patterns.length;
      const ordered = [...(light ? ['light'] : []), ...patterns.slice(rot), ...patterns.slice(0, rot)];
      for (strict of [true, false]) {
        for (const p of ordered) {
          meal = fits(buildBreakfast(p));
          if (meal) break;
        }
        if (meal) break;
      }
    } else if (s.kind === 'snack') {
      meal = fits(buildSnack());
      if (!meal) { strict = false; meal = buildSnack(); }
    } else {
      const patterns = ['swallow_soup', 'one_pot', 'staple_legume', 'pepper_soup', 'staple_protein', 'legume_dish', ...(lowProtein ? ['staple_veg'] : [])];
      const rot = (day * 2 + (s.slot === 'dinner' ? 1 : 0) + attempt) % patterns.length;
      const ordered = [...(light ? ['light'] : []), ...patterns.slice(rot), ...patterns.slice(0, rot)];
      // First pass: also avoid yesterday's source at this meal; second: today's only; third: none.
      const passes: Set<ProteinSource>[] = [new Set([...avoid, ...(yesterday ? [yesterday] : [])]), avoid, new Set()];
      // Each rotation pass with the energy window first, then without it (rotation outranks the window).
      const tries: { pass: number; av: Set<ProteinSource>; strict: boolean }[] = [];
      passes.forEach((av, pass) => { for (const st of [true, false]) tries.push({ pass, av, strict: st }); });
      outer: for (const t of tries) {
        strict = t.strict;
        for (const p of ordered) {
          meal = fits(buildMain(p, t.av));
          if (meal) {
            if (t.pass === 2 && avoid.size && meal.proteinSource && avoid.has(meal.proteinSource)) {
              notes.push(`Day ${day + 1} ${s.slot}: protein source repeats (${meal.proteinSource}) — the restrictions leave no alternative.`);
              rotationRelaxed = true;
            }
            break outer;
          }
        }
      }
    }
    if (!meal) {
      // Would it have worked without the twice-a-week limit? Then the variety rule, not a restriction, ran out.
      let variety = false;
      if (s.kind !== 'snack') {
        ignoreMainLimit = true; strict = false;
        variety = s.kind === 'breakfast'
          ? !!buildBreakfast('main') || !!buildBreakfast('staple')
          : ['swallow_soup', 'one_pot', 'staple_legume', 'staple_protein', 'legume_dish'].some(p => !!buildMain(p, new Set()));
        ignoreMainLimit = false;
      }
      emptyRoles.push({ slot: s.slot, role: s.kind === 'snack' ? 'snack' : s.kind, ...(variety ? { reason: 'variety_limit' as const } : {}) });
      continue;
    }
    if (meal.mainDish) dayMainUse.set(meal.mainDish, (dayMainUse.get(meal.mainDish) ?? 0) + 1);
    for (const i of meal.items) {
      usedToday.add(i.component.id);
      if (!i.optional && i.component.role === 'vegetable') hasVeg = true;
      if (!i.optional && i.component.role === 'fruit') hasFruit = true;
    }
    if ((s.slot === 'lunch' || s.slot === 'dinner') && meal.proteinSource) primaryToday.push(meal.proteinSource);
    meals.push(meal);
  }

  if (!vegAny) emptyRoles.push({ slot: 'lunch', role: 'vegetable' });
  if (emptyRoles.length) return { menu: null, emptyRoles };
  const fruitRestricted = !fruitAny;
  if (fruitRestricted) notes.push('No fruit is allowed by the restrictions: the daily fruit rule is not applied.');
  return { menu: { meals, fruitRestricted, rotationRelaxed, notes }, emptyRoles };
}

/** Record a day's menu in the week's usage (call once the day is solved). */
export function recordUsage(usage: WeekUsage, menu: DayMenu, servedIds: Set<string>): void {
  for (const m of menu.meals) {
    if (m.mainDish) usage.mainDish.set(m.mainDish, (usage.mainDish.get(m.mainDish) ?? 0) + 1);
    for (const i of m.items) if (servedIds.has(i.key)) usage.component.set(i.component.id, (usage.component.get(i.component.id) ?? 0) + 1);
  }
  usage.previous = {
    lunch: menu.meals.find(m => m.slot === 'lunch')?.proteinSource ?? null,
    dinner: menu.meals.find(m => m.slot === 'dinner')?.proteinSource ?? null,
  };
}
