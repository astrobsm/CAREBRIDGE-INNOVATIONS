/**
 * One day's quantities as a linear / mixed-integer programme
 * (javascript-lp-solver), and the exact re-check of a rounded answer.
 *
 * Variables (all ≥ 0), one per menu item, in "variable units":
 *   - grams of a gram-weighed food: continuous in the first solve; integer
 *     counts of the 5 g rounding step in a repair solve ('grid');
 *   - whole pieces and recipe portion steps: integer;
 *   - optional items (snacks, extra protein, additions): x with a binary y,
 *     min·y ≤ x ≤ max·y, so a served item is never below its minimum portion;
 *   - ONS units (integer) and enteral mL (continuous), when offered.
 *
 * Hard constraints, grouped (a group is what an infeasibility report names):
 *   energy_band       T(1−tol) ≤ Σ kcal ≤ T(1+tol)
 *   protein_min/max   Σ protein ≥ min (≤ max when set)
 *   carb_pct_max      Σ (4·carb − high%·kcal) ≤ 0           (diabetic_carb_pct when diabetic)
 *   fat_pct_max       Σ (9·fat − high%·kcal) ≤ 0
 *   diabetic_meal_carb  each meal's carbohydrate ≤ share × the day's
 *   fat_g_max, sodium_max, potassium_max, phosphorus_max, fluid_max
 *   oral_fraction     food kcal ≤ fraction × T (rest from ONS/enteral)
 *   portion_min / portion_max   per-food limits
 * Soft (penalised in the objective, never infeasible):
 *   energy_target     |Σ kcal − T|                 weight 1 per kcal
 *   meal_<slot>       |meal kcal − share × T|      weight 0.25 per kcal
 *   carb/fat_pct_min  shortfall below the lower % limit
 * plus a small cost per kcal of each item from its ranking (cost tier, goal,
 * restriction densities), so cheaper and better-fitting foods carry the plan.
 */

import solver from 'javascript-lp-solver';
import { NUTRIENT_KEYS, type NutrientKey } from '../types';
import type { PlanComponent } from './catalogue';
import type { DayMenu, MenuItem } from './menu';
import type { ResolvedRestrictions } from './restrictions';
import type { Bounds, ConstraintRecord, EnteralProduct, MealSlot, OnsProduct } from './types';

export interface DayProblem {
  day: number;
  menu: DayMenu;
  energyKcal: number;
  protein: Bounds;
  macro: { carbohydrate: { low: number; high: number }; fat: { low: number; high: number } };
  rr: ResolvedRestrictions;
  /** 1 = no limit on food. */
  oralFraction: number;
  ons: OnsProduct | null;
  enteral: EnteralProduct | null;
  /** Cost per kcal of ONS/enteral relative to food (low when supplements are 'always'). */
  supplementCostPerKcal: number;
  /** Per-item ranking score (lower is better), used as a small cost. */
  score: (c: PlanComponent) => number;
  /** Weight gain: penalise volume (grams) so energy-dense foods carry the surplus. */
  volumePenalty: boolean;
}

export type SolveMode = 'mixed' | 'grid';

export interface BuildOptions {
  tolerance: number;
  mode: SolveMode;
  /** Variables fixed to a value (repair: whole units fixed). */
  fixed?: Map<string, number>;
  /** Hard groups left out (infeasibility search). */
  drop?: ReadonlySet<string>;
  /** Hard groups given slack variables; objective becomes the total slack. */
  elastic?: ReadonlySet<string>;
  /** Solve the LP relaxation (no integer variables). */
  relaxIntegers?: boolean;
  /** Elastic energy/protein/limits with a heavy penalty (legacy best-effort). */
  bestEffort?: boolean;
  /** Branch-and-bound time limit, ms (default 1500). */
  timeoutMs?: number;
}

export interface VarInfo {
  name: string;
  kind: 'item' | 'ons' | 'enteral';
  item?: MenuItem;
  integer: boolean;
  /** Grams (or units) per solver unit: the 5 g step in grid mode for gram foods. */
  scale: number;
  binary?: string;
}

export interface BuiltModel {
  model: {
    optimize: string; opType: 'min';
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    ints: Record<string, 1>;
    binaries: Record<string, 1>;
    options: { timeout: number; tolerance: number };
    /** Whether the model has integer or binary variables. */
    hasIntegers?: boolean;
  };
  vars: VarInfo[];
  groups: Map<string, string[]>;
  records: ConstraintRecord[];
}

export const HARD_GROUP_LABEL: Record<string, string> = {
  energy_band: 'daily energy within ±tolerance of the target',
  protein_min: 'protein at least the target',
  protein_max: 'protein at most the upper limit (CKD)',
  carb_pct_max: 'carbohydrate at most the upper % of energy',
  diabetic_carb_pct: 'diabetic carbohydrate cap (% of energy)',
  diabetic_meal_carb: 'diabetic carbohydrate spread across meals',
  fat_pct_max: 'fat at most the upper % of energy',
  fat_g_max: 'fat restriction (g/day)',
  sodium_max: 'sodium limit',
  potassium_max: 'potassium limit (CKD)',
  phosphorus_max: 'phosphate limit (CKD)',
  fluid_max: 'fluid restriction',
  oral_fraction: 'oral intake limited to a fraction of the target',
  portion_min: 'minimum portion sizes',
  portion_max: 'maximum portion sizes',
};

/** Order the infeasibility search tests groups in: portion limits first, so a clinical limit is named when one is involved. */
export const GROUP_SEARCH_ORDER = ['portion_max', 'portion_min', 'diabetic_meal_carb', 'carb_pct_max', 'fat_pct_max', 'oral_fraction',
  'fluid_max', 'fat_g_max', 'sodium_max', 'phosphorus_max', 'potassium_max', 'diabetic_carb_pct', 'protein_max', 'protein_min', 'energy_band'];

const N = (c: PlanComponent, k: NutrientKey) => c.perVar[k];

/**
 * Coefficients are rounded to 6 decimals and near-zeros dropped before they
 * reach the solver: javascript-lp-solver's simplex can cycle without end on
 * degenerate models with ~1e-12 coefficients (seen on an elastic CKD model),
 * and it has no time limit outside branch-and-bound.
 */
const clean = (x: number) => { const r = Math.round(x * 1e6) / 1e6; return Math.abs(r) < 1e-9 ? 0 : r; };
const cleanBound = (b: { min?: number; max?: number; equal?: number }) =>
  Object.fromEntries(Object.entries(b).map(([k, v]) => [k, clean(v as number)])) as typeof b;

export function buildDayModel(p: DayProblem, o: BuildOptions): BuiltModel {
  const constraints: BuiltModel['model']['constraints'] = {};
  const variables: BuiltModel['model']['variables'] = {};
  const ints: Record<string, 1> = {};
  const binaries: Record<string, 1> = {};
  const groups = new Map<string, string[]>();
  const records: ConstraintRecord[] = [];
  const drop = o.drop ?? new Set<string>();
  const elastic = o.elastic ?? new Set<string>();
  const minSlackObjective = elastic.size > 0;
  const T = p.energyKcal;

  const v = (name: string) => (variables[name] ??= { cost: 0 });
  const setCost = (name: string, cost: number) => { v(name).cost = minSlackObjective ? 0 : clean(cost); };

  // Variables
  const vars: VarInfo[] = [];
  p.menu.meals.forEach((meal, mi) => meal.items.forEach((it, ii) => {
    const c = it.component;
    const grid = o.mode === 'grid' && c.unitKind === 'g';
    const scale = grid ? c.gramStep : 1;
    const name = `x${mi}_${ii}`;
    const info: VarInfo = { name, kind: 'item', item: it, integer: c.unitKind !== 'g' || grid, scale };
    if (it.optional) info.binary = `y${mi}_${ii}`;
    vars.push(info);
    let cost = c.perVar.energyKcal * scale * 0.01 * (2 + p.score(c));
    if (p.volumePenalty && c.unitKind === 'g') cost += 0.004 * scale;
    setCost(name, cost);
    if (info.binary) setCost(info.binary, 0.5);
  }));
  if (p.ons) { vars.push({ name: 'ons', kind: 'ons', integer: true, scale: 1 }); setCost('ons', p.ons.kcalPerUnit * p.supplementCostPerKcal); }
  if (p.enteral) { vars.push({ name: 'ent', kind: 'enteral', integer: false, scale: 1 }); setCost('ent', p.enteral.kcalPerMl * p.supplementCostPerKcal); }

  const coef = (vi: VarInfo, k: NutrientKey): number => {
    if (vi.kind === 'item') return N(vi.item!.component, k) * vi.scale;
    if (vi.kind === 'ons') return k === 'energyKcal' ? p.ons!.kcalPerUnit : k === 'protein' ? p.ons!.proteinGPerUnit : k === 'water' ? (p.ons!.mlPerUnit ?? 0) : 0;
    return k === 'energyKcal' ? p.enteral!.kcalPerMl : k === 'protein' ? p.enteral!.proteinGPerMl : k === 'water' ? 1 : 0;
  };

  let slackN = 0;
  const add = (group: string | null, name: string, bound: { min?: number; max?: number; equal?: number }, terms: [string, number][]) => {
    if (group && drop.has(group)) return;
    constraints[name] = cleanBound(bound);
    for (const [vn, cf] of terms) {
      const x = clean((v(vn)[name] ?? 0) + cf);
      if (x !== 0) v(vn)[name] = x; else delete v(vn)[name];
    }
    if (group) {
      (groups.get(group) ?? groups.set(group, []).get(group)!).push(name);
      const isElastic = elastic.has(group) || (o.bestEffort && group !== 'portion_min' && group !== 'portion_max' && group !== 'fixed');
      if (isElastic && bound.equal === undefined) {
        const s = `s${slackN++}`;
        v(s)[name] = bound.min !== undefined ? 1 : -1;
        v(s).cost = minSlackObjective ? 1 : 50;
      }
    }
  };
  const sum = (k: NutrientKey, filter: (vi: VarInfo) => boolean = () => true, factor = 1): [string, number][] =>
    vars.filter(filter).map(vi => [vi.name, coef(vi, k) * factor]);
  const combo = (parts: [NutrientKey, number][], filter: (vi: VarInfo) => boolean = () => true): [string, number][] =>
    vars.filter(filter).map(vi => [vi.name, parts.reduce((a, [k, f]) => a + coef(vi, k) * f, 0)]);
  const rec = (id: string, kind: 'hard' | 'soft', bound: string) => records.push({ id, label: HARD_GROUP_LABEL[id] ?? id, kind, bound });

  // Energy
  const tol = o.tolerance;
  add('energy_band', 'energy_band', { min: T * (1 - tol), max: T * (1 + tol) }, sum('energyKcal'));
  rec('energy_band', 'hard', `${Math.round(T * (1 - tol))}–${Math.round(T * (1 + tol))} kcal`);
  add(null, 'energy_target', { equal: T }, [...sum('energyKcal'), ['dneg', 1], ['dpos', -1]]);
  setCost('dneg', 1); setCost('dpos', 1);
  rec('energy_target', 'soft', `${Math.round(T)} kcal (deviation penalised)`);

  // Protein
  add('protein_min', 'protein_min', { min: p.protein.min }, sum('protein'));
  rec('protein_min', 'hard', `≥ ${p.protein.min} g`);
  if (p.protein.max) { add('protein_max', 'protein_max', { max: p.protein.max }, sum('protein')); rec('protein_max', 'hard', `≤ ${p.protein.max} g`); }

  // Macronutrient distribution
  const rr = p.rr;
  const carbHigh = rr.carbPercentMax !== null ? Math.min(rr.carbPercentMax, p.macro.carbohydrate.high) : p.macro.carbohydrate.high;
  const carbGroup = rr.carbPercentMax !== null ? 'diabetic_carb_pct' : 'carb_pct_max';
  add(carbGroup, carbGroup, { max: 0 }, combo([['carbohydrate', 4], ['energyKcal', -carbHigh / 100]]));
  rec(carbGroup, 'hard', `carbohydrate ≤ ${carbHigh}% of energy`);
  add('fat_pct_max', 'fat_pct_max', { max: 0 }, combo([['fat', 9], ['energyKcal', -p.macro.fat.high / 100]]));
  rec('fat_pct_max', 'hard', `fat ≤ ${p.macro.fat.high}% of energy`);
  add(null, 'carb_pct_min', { min: 0 }, [...combo([['carbohydrate', 4], ['energyKcal', -p.macro.carbohydrate.low / 100]]), ['cs', 1]]);
  add(null, 'fat_pct_min', { min: 0 }, [...combo([['fat', 9], ['energyKcal', -p.macro.fat.low / 100]]), ['fs', 1]]);
  setCost('cs', 0.3); setCost('fs', 0.3);
  rec('carb_pct_min', 'soft', `carbohydrate ≥ ${p.macro.carbohydrate.low}% of energy (shortfall penalised)`);
  rec('fat_pct_min', 'soft', `fat ≥ ${p.macro.fat.low}% of energy (shortfall penalised)`);

  if (rr.mealCarbShareMax !== null) {
    const share = rr.mealCarbShareMax;
    p.menu.meals.forEach((m, mi) => {
      add('diabetic_meal_carb', `meal_carb_${mi}`, { max: 0 },
        vars.map(vi => [vi.name, coef(vi, 'carbohydrate') * ((vi.item && vi.item.slot === m.slot ? 1 : 0) - share)]));
    });
    rec('diabetic_meal_carb', 'hard', `no meal above ${Math.round(share * 100)}% of the day's carbohydrate`);
  }

  // Limits
  const cap = (group: string, k: NutrientKey, max: number | null, unit: string) => {
    if (max === null) return;
    add(group, group, { max }, sum(k));
    rec(group, 'hard', `≤ ${max} ${unit}`);
  };
  cap('fat_g_max', 'fat', rr.fatGMax, 'g');
  cap('sodium_max', 'sodium', rr.sodiumMgMax, 'mg');
  cap('potassium_max', 'potassium', rr.potassiumMgMax, 'mg');
  cap('phosphorus_max', 'phosphorus', rr.phosphorusMgMax, 'mg');
  cap('fluid_max', 'water', rr.fluidMlMax, 'mL (food water, drinks and feeds)');
  if (p.oralFraction < 1) {
    add('oral_fraction', 'oral_fraction', { max: p.oralFraction * T }, sum('energyKcal', vi => vi.kind === 'item'));
    rec('oral_fraction', 'hard', `food ≤ ${Math.round(p.oralFraction * 100)}% of the energy target`);
  }

  // Meal split (soft)
  p.menu.meals.forEach((m, mi) => {
    add(null, `meal_${mi}`, { equal: m.share * T }, [...sum('energyKcal', vi => vi.item?.slot === m.slot), [`mn${mi}`, 1], [`mp${mi}`, -1]]);
    setCost(`mn${mi}`, 0.25); setCost(`mp${mi}`, 0.25);
  });
  rec('meal_split', 'soft', p.menu.meals.map(m => `${m.slot} ${Math.round(m.share * 100)}%`).join(', '));

  // Portions
  for (const vi of vars) {
    if (vi.kind === 'ons') { add('portion_max', 'ons_max', { max: p.ons!.maxUnitsPerDay }, [['ons', 1]]); continue; }
    if (vi.kind === 'enteral') { add('portion_max', 'ent_max', { max: p.enteral!.maxMlPerDay }, [['ent', 1]]); continue; }
    const it = vi.item!;
    const lo = it.minVar / vi.scale; const hi = it.maxVar / vi.scale;
    if (vi.binary) {
      add('portion_min', `lo_${vi.name}`, { min: 0 }, [[vi.name, 1], [vi.binary, -lo]]);
      add('portion_max', `hi_${vi.name}`, { max: 0 }, [[vi.name, 1], [vi.binary, -hi]]);
      add(null, `yb_${vi.name}`, { max: 1 }, [[vi.binary, 1]]);
      if (!o.relaxIntegers) binaries[vi.binary] = 1;
      v(vi.binary);
    } else {
      add('portion_min', `lo_${vi.name}`, { min: lo }, [[vi.name, 1]]);
      add('portion_max', `hi_${vi.name}`, { max: hi }, [[vi.name, 1]]);
    }
    if (vi.integer && !o.relaxIntegers) ints[vi.name] = 1;
  }
  rec('portion_min', 'hard', 'each served item at least its minimum portion');
  rec('portion_max', 'hard', 'each item at most its maximum portion');

  // Fixed values (repair)
  for (const [name, val] of o.fixed ?? []) add('fixed', `fix_${name}`, { equal: val }, [[name, 1]]);

  return {
    // Gap tolerance 0.5% of the objective: the objective is a penalty, not the clinical target, so a near-optimal plan is as good.
    model: { optimize: 'cost', opType: 'min', constraints, variables, ints, binaries, options: { timeout: o.timeoutMs ?? 1500, tolerance: 0.005 },
      hasIntegers: Object.keys(ints).length + Object.keys(binaries).length > 0 },
    vars, groups, records,
  };
}

export interface SolveOutput { feasible: boolean; values: Map<string, number>; objective: number; ms: number }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ── Simplex guard ─────────────────────────────────────────────────────────
// javascript-lp-solver's simplex phases loop until done and its timeout only
// covers branch-and-bound, so a degenerate model can make one Solve() spin
// for ever (seen on small elastic CKD models). Each simplex phase is
// therefore capped at PIVOTS_PER_PHASE pivots (a healthy phase on these
// ~50-row models needs well under a hundred). On the cap the solve is
// retried once with every inequality tightened by a tiny, distinct amount
// (lexicographic perturbation, which breaks the tie that cycles) and a tiny
// cost jitter; tightening keeps any solution valid for the exact re-check.
// If that also cycles, the model is reported as not solved.

const PIVOTS_PER_PHASE = 5000;
class SimplexCycling extends Error {}
let pivots = 0;
let guarded = false;
function guardSimplex(): void {
  if (guarded) return;
  guarded = true;
  const proto = (solver as unknown as { Tableau: { prototype: Record<string, (...a: unknown[]) => unknown> } }).Tableau.prototype;
  for (const phase of ['phase1', 'phase2']) {
    const orig = proto[phase];
    proto[phase] = function (this: unknown, ...a: unknown[]) { pivots = 0; return orig.apply(this, a); };
  }
  const pivot = proto.pivot;
  proto.pivot = function (this: unknown, ...a: unknown[]) {
    if (++pivots > PIVOTS_PER_PHASE) throw new SimplexCycling('simplex cycling');
    return pivot.apply(this, a);
  };
}

function perturbed(model: Omit<BuiltModel['model'], 'hasIntegers'>): typeof model {
  let i = 0;
  const constraints = Object.fromEntries(Object.entries(model.constraints).map(([k, b]) => {
    i++;
    const e = 1e-7 * i;
    return [k, b.equal !== undefined ? b : { ...(b.min !== undefined ? { min: b.min + e } : {}), ...(b.max !== undefined ? { max: b.max - e } : {}) }];
  }));
  let j = 0;
  const variables = Object.fromEntries(Object.entries(model.variables).map(([k, v]) => [k, { ...v, cost: (v.cost ?? 0) + 1e-8 * ++j }]));
  return { ...model, constraints, variables };
}

export function runSolver(built: BuiltModel): SolveOutput {
  guardSimplex();
  const t = now();
  const { hasIntegers, ...model } = built.model;
  let res: Record<string, number | boolean | undefined> = { feasible: false };
  try {
    res = solver.Solve(model as never) as typeof res;
  } catch (e) {
    if (!(e instanceof SimplexCycling)) throw e;
    try { res = solver.Solve(perturbed(model) as never) as typeof res; } catch (e2) {
      if (!(e2 instanceof SimplexCycling)) throw e2;
      res = { feasible: false };
    }
  }
  const ms = now() - t;
  const values = new Map<string, number>();
  for (const [k, val] of Object.entries(res)) if (typeof val === 'number' && k !== 'result') values.set(k, val);
  // A branch-and-bound that ran out of time without an integral incumbent is not a solution.
  const integral = !hasIntegers || res.isIntegral !== false;
  return { feasible: res.feasible === true && (res.bounded ?? true) !== false && integral, values, objective: Number(res.result ?? 0), ms };
}

// ── Rounding and the exact re-check ──────────────────────────────────────

/** Amounts per variable, in the component's variable units (grams, pieces, portion steps), ONS units and enteral mL. */
export type Amounts = Map<string, number>;

/** Solver values → amounts in variable units (undoing the grid scale). */
export function amountsOf(built: BuiltModel, values: Map<string, number>): Amounts {
  const out: Amounts = new Map();
  for (const vi of built.vars) {
    let a = (values.get(vi.name) ?? 0) * vi.scale;
    if (vi.binary && (values.get(vi.binary) ?? 0) < 0.5) a = 0;
    out.set(vi.name, a);
  }
  return out;
}

/** Round to practical units: gram foods to their 5 g step (kept inside the portion limits), pieces/portions/ONS to whole units, feeds to 10 mL. */
export function roundAmounts(built: BuiltModel, amounts: Amounts, enteralStepMl: number): Amounts {
  const out: Amounts = new Map();
  for (const vi of built.vars) {
    const a = amounts.get(vi.name) ?? 0;
    if (vi.kind === 'ons') { out.set(vi.name, Math.round(a)); continue; }
    if (vi.kind === 'enteral') { out.set(vi.name, Math.round(a / enteralStepMl) * enteralStepMl); continue; }
    const it = vi.item!; const c = it.component;
    if (a <= 1e-9) { out.set(vi.name, 0); continue; }
    if (c.unitKind === 'g') {
      const step = c.gramStep;
      const lo = Math.ceil(it.minVar / step - 1e-9) * step;
      const hi = Math.floor(it.maxVar / step + 1e-9) * step;
      out.set(vi.name, Math.min(hi, Math.max(lo, Math.round(a / step) * step)));
    } else {
      out.set(vi.name, Math.min(it.maxVar, Math.max(it.minVar, Math.round(a))));
    }
  }
  return out;
}

export type Profile = Record<NutrientKey, number>;
export const zeroProfile = (): Profile => Object.fromEntries(NUTRIENT_KEYS.map(k => [k, 0])) as Profile;

export interface DayEvaluation {
  day: Profile;
  meals: Map<MealSlot, Profile>;
  supplement: Profile;
  failures: string[];
  energyPercent: number;
  proteinPercent: number;
  portionsOk: boolean;
  restrictionsOk: boolean;
}

/** Exact totals of an amount set and every hard rule re-checked (the spec's ±5% after rounding). */
export function evaluateDay(p: DayProblem, built: BuiltModel, amounts: Amounts, tolerance: number): DayEvaluation {
  const day = zeroProfile();
  const meals = new Map<MealSlot, Profile>();
  const supplement = zeroProfile();
  const failures: string[] = [];
  let portionsOk = true;
  let foodKcal = 0;
  for (const vi of built.vars) {
    const a = amounts.get(vi.name) ?? 0;
    if (vi.kind === 'item') {
      const it = vi.item!; const c = it.component;
      const mp = meals.get(it.slot) ?? meals.set(it.slot, zeroProfile()).get(it.slot)!;
      for (const k of NUTRIENT_KEYS) { const x = c.perVar[k] * a; mp[k] += x; day[k] += x; }
      foodKcal += c.perVar.energyKcal * a;
      const served = a > 1e-9;
      if ((served || !it.optional) && (a < it.minVar - 1e-6 || a > it.maxVar + 1e-6)) {
        portionsOk = false;
        failures.push(`${c.name}: ${a} outside its portion limits ${it.minVar}–${it.maxVar}`);
      }
    } else {
      const add = (k: NutrientKey, x: number) => { supplement[k] += x; day[k] += x; };
      if (vi.kind === 'ons') { add('energyKcal', p.ons!.kcalPerUnit * a); add('protein', p.ons!.proteinGPerUnit * a); add('water', (p.ons!.mlPerUnit ?? 0) * a);
        if (a > p.ons!.maxUnitsPerDay) { portionsOk = false; failures.push(`ONS: ${a} units above the ${p.ons!.maxUnitsPerDay} allowed`); } }
      else { add('energyKcal', p.enteral!.kcalPerMl * a); add('protein', p.enteral!.proteinGPerMl * a); add('water', a);
        if (a > p.enteral!.maxMlPerDay + 1e-6) { portionsOk = false; failures.push(`Enteral feed: ${a} mL above the ${p.enteral!.maxMlPerDay} mL allowed`); } }
    }
  }
  const T = p.energyKcal;
  const e = day.energyKcal;
  const energyPercent = (e / T) * 100;
  const proteinPercent = (day.protein / p.protein.min) * 100;
  const eps = 1e-6;
  if (e < T * (1 - tolerance) - eps || e > T * (1 + tolerance) + eps) failures.push(`energy ${Math.round(e)} kcal is outside ±${tolerance * 100}% of ${Math.round(T)} kcal`);
  if (day.protein < p.protein.min - eps) failures.push(`protein ${round1(day.protein)} g is below the ${p.protein.min} g target`);
  const before = failures.length;
  if (p.protein.max && day.protein > p.protein.max + eps) failures.push(`protein ${round1(day.protein)} g is above the ${p.protein.max} g limit`);
  const rr = p.rr;
  const carbHigh = rr.carbPercentMax !== null ? Math.min(rr.carbPercentMax, p.macro.carbohydrate.high) : p.macro.carbohydrate.high;
  if (e > 0 && (4 * day.carbohydrate * 100) / e > carbHigh + eps) failures.push(`carbohydrate ${round1((400 * day.carbohydrate) / e)}% of energy is above ${carbHigh}%`);
  if (e > 0 && (9 * day.fat * 100) / e > p.macro.fat.high + eps) failures.push(`fat ${round1((900 * day.fat) / e)}% of energy is above ${p.macro.fat.high}%`);
  if (rr.mealCarbShareMax !== null && day.carbohydrate > 0) {
    for (const [slot, mp] of meals) if (mp.carbohydrate > rr.mealCarbShareMax * day.carbohydrate + eps) failures.push(`${slot} carries ${Math.round((mp.carbohydrate / day.carbohydrate) * 100)}% of the day's carbohydrate (limit ${Math.round(rr.mealCarbShareMax * 100)}%)`);
  }
  const capCheck = (label: string, x: number, max: number | null, unit: string) => { if (max !== null && x > max + eps) failures.push(`${label} ${Math.round(x)} ${unit} is above the ${max} ${unit} limit`); };
  capCheck('fat', day.fat, rr.fatGMax, 'g');
  capCheck('sodium', day.sodium, rr.sodiumMgMax, 'mg');
  capCheck('potassium', day.potassium, rr.potassiumMgMax, 'mg');
  capCheck('phosphorus', day.phosphorus, rr.phosphorusMgMax, 'mg');
  capCheck('fluid', day.water, rr.fluidMlMax, 'mL');
  if (p.oralFraction < 1 && foodKcal > p.oralFraction * T + eps) failures.push(`food ${Math.round(foodKcal)} kcal is above the oral-intake limit of ${Math.round(p.oralFraction * T)} kcal`);
  const restrictionsOk = failures.length === before;
  return { day, meals, supplement, failures, energyPercent, proteinPercent, portionsOk, restrictionsOk };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
