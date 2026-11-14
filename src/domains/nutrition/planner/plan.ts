/**
 * planWeeklyMeals: the stage 3 weekly meal-plan optimiser.
 *
 * Per day (the decomposition that keeps each solve small enough for a
 * phone): pick a menu (menu.ts), solve the quantities (solve.ts), round to
 * practical units, re-check every rule exactly, and repair if rounding broke
 * one. A day that cannot be fitted gets other menus, then ONS (if allowed),
 * and is otherwise explained (explain.ts).
 *
 * Safety: never for a refer population (children, pregnancy, lactation,
 * dialysis, PN); no weight-loss plan in a catabolic state without a clinician
 * override; every plan is a draft carrying DRAFT_NOTICE and a full trace.
 */

import { NUTRIENT_KEYS, type NutrientKey } from '../types';
import { checkPopulation } from '../engine/guards';
import { catabolicStates, isValidOverride } from '../engine/types';
import { ACTIVE_NUTRITION_CONFIG } from '../engine/config';
import { REFEEDING_ALERTS } from '../engine/refeeding';
import { CORE_FOOD_TABLE } from '../data/foods';
import { FOOD_COMPOSITION_ACKNOWLEDGEMENT } from '../data/foodSourceAcknowledgement';
import { round } from '../services/foodRepository';
import { ACTIVE_PLANNER_CONFIG, DRAFT_NOTICE, type EnergySplit, type PlannerConfig } from './config';
import { describeAmount, plannerCatalogue, type PlanComponent } from './catalogue';
import { exclusionsFor, resolveRestrictions, type ResolvedRestrictions } from './restrictions';
import { buildDayMenu, newWeekUsage, rankScore, recordUsage, type DayMenu, type EmptyRole, type MenuContext } from './menu';
import {
  amountsOf, buildDayModel, evaluateDay, roundAmounts, runSolver,
  type Amounts, type BuiltModel, type DayEvaluation, type DayProblem, type Profile,
} from './solve';
import { explainEmptyRoles, explainSolverConflict } from './explain';
import type {
  Bounds, ConflictExplanation, ConstraintRecord, DaySolveInfo, GoalSummary, MealPlanRequest, MealPlanResult, MealSlot,
  NutrientTotals, PlanDay, PlanItem, PlanMeal, PlanTrace, RelaxationRecord, WeeklyMealPlan, WeeklySummary,
} from './types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast', mid_morning: 'Mid-morning snack', lunch: 'Lunch', afternoon: 'Afternoon snack',
  dinner: 'Dinner', evening: 'Evening snack', supplement: 'Supplements (ONS / enteral feed)',
};

interface SolvedDay {
  menu: DayMenu;
  problem: DayProblem;
  built: BuiltModel;
  amounts: Amounts;
  evaluation: DayEvaluation;
  info: DaySolveInfo;
  stage: string;
}

function validSplit(s: EnergySplit): boolean {
  const vals = [s.breakfast, s.lunch, s.dinner, s.snacks];
  return vals.every(v => Number.isFinite(v) && v >= 0) && Math.abs(vals.reduce((a, b) => a + b, 0) - 1) < 0.001;
}

/** Relevant micronutrients for the patient (shown per item and in totals). */
export function relevantNutrients(req: MealPlanRequest, rr: ResolvedRestrictions): NutrientKey[] {
  const out = new Set<NutrientKey>();
  const r = req.restrictions ?? {};
  if (r.ckd) { out.add('potassium'); out.add('phosphorus'); out.add('sodium'); }
  if (r.heartFailure || rr.sodiumMgMax !== null) out.add('sodium');
  if (r.diabetes) out.add('fibre');
  if (req.goal?.refeeding) { out.add('potassium'); out.add('phosphorus'); out.add('magnesium'); }
  const ctx = req.context ?? {};
  if ((ctx.burns && (ctx.burns.tbsaPercent ?? 0) > 0) || ctx.majorWound || ctx.largeOrHeavilyExudingWound) {
    out.add('zinc'); out.add('vitaminC'); out.add('vitaminARae');
  }
  if (rr.fluidMlMax !== null) out.add('water');
  return NUTRIENT_KEYS.filter(k => out.has(k));
}

function totalsOf(p: Profile, relevant: NutrientKey[], lowerBound: Set<NutrientKey>): NutrientTotals {
  return {
    kcal: round(p.energyKcal), proteinG: round(p.protein, 1), carbohydrateG: round(p.carbohydrate, 1), fatG: round(p.fat, 1),
    fibreG: round(p.fibre, 1), waterMl: round(p.water), sodiumMg: round(p.sodium), potassiumMg: round(p.potassium), phosphorusMg: round(p.phosphorus),
    micronutrients: Object.fromEntries(relevant.map(k => [k, round(p[k], 1)])),
    lowerBound: NUTRIENT_KEYS.filter(k => lowerBound.has(k)),
  };
}

function itemOf(c: PlanComponent, amount: number, relevant: NutrientKey[]): PlanItem {
  const d = describeAmount(c, amount);
  const n = (k: NutrientKey) => c.perVar[k] * amount;
  return {
    componentId: c.id, name: c.name, igboName: c.igboName, role: c.role,
    amount: { value: d.value, unit: d.unit, label: d.label },
    rawGrams: c.rawGramsPerVar === null ? null : round(c.rawGramsPerVar * amount),
    cookedGrams: c.cookedGramsPerVar === null ? null : round(c.cookedGramsPerVar * amount),
    weightNote: c.weightNote, householdMeasure: d.household, preparationNote: c.preparationNote,
    kcal: round(n('energyKcal')), proteinG: round(n('protein'), 1), carbohydrateG: round(n('carbohydrate'), 1), fatG: round(n('fat'), 1),
    micronutrients: Object.fromEntries(relevant.map(k => [k, c.unknown.includes(k) ? null : round(n(k), 1)])),
    lowerBound: c.unknown, pendingVerification: c.pendingVerification, source: c.source,
  };
}

function solveDay(problem: DayProblem, cfg: PlannerConfig): Omit<SolvedDay, 'menu' | 'info'> & { ms: { solve: number; rounding: number; repair: number }; outcome: DaySolveInfo['outcome']; broke: boolean } | null {
  const tol = cfg.energyTolerance.value;
  const step = cfg.rounding.value.enteralStepMl;
  let t = now();
  // Fast reject: if even the LP relaxation (no whole units) is infeasible, no menu-level MILP can succeed.
  if (!runSolver(buildDayModel(problem, { tolerance: tol, mode: 'mixed', relaxIntegers: true })).feasible) return null;
  let b1 = buildDayModel(problem, { tolerance: cfg.solveTolerance.value, mode: 'mixed' });
  let s1 = runSolver(b1);
  if (!s1.feasible) { b1 = buildDayModel(problem, { tolerance: tol, mode: 'mixed' }); s1 = runSolver(b1); }
  const solveMs = now() - t;
  if (!s1.feasible) return null;
  t = now();
  const a1 = roundAmounts(b1, amountsOf(b1, s1.values), step);
  const e1 = evaluateDay(problem, b1, a1, tol);
  const roundMs = now() - t;
  if (!e1.failures.length) return { problem, built: b1, amounts: a1, evaluation: e1, stage: 'milp', ms: { solve: solveMs, rounding: roundMs, repair: 0 }, outcome: 'milp', broke: false };

  // Repair 1: whole units (pieces, portions, ONS, on/off) fixed; gram foods re-solved on the 5 g grid.
  t = now();
  const fixed = new Map<string, number>();
  for (const vi of b1.vars) {
    const a = a1.get(vi.name) ?? 0;
    if (vi.kind === 'ons' || (vi.kind === 'item' && vi.item!.component.unitKind !== 'g')) fixed.set(vi.name, a);
    if (vi.binary) fixed.set(vi.binary, a > 0 ? 1 : 0);
  }
  for (const [mode, fx, outcome] of [['grid', fixed, 'repaired_fixed'], ['grid', undefined, 'repaired_grid']] as const) {
    const b = buildDayModel(problem, { tolerance: tol, mode, fixed: fx });
    const s = runSolver(b);
    if (!s.feasible) continue;
    const a = roundAmounts(b, amountsOf(b, s.values), step);
    const e = evaluateDay(problem, b, a, tol);
    if (!e.failures.length) {
      return { problem, built: b, amounts: a, evaluation: e, stage: outcome, ms: { solve: solveMs, rounding: roundMs, repair: now() - t }, outcome, broke: true };
    }
  }
  return null;
}

export function planWeeklyMeals(req: MealPlanRequest, config: PlannerConfig = ACTIVE_PLANNER_CONFIG): MealPlanResult {
  const t0 = now();
  // ── Safety gates ──
  const population = checkPopulation(req.patient ?? {});
  if (population.status === 'refer') return { status: 'refer', reason: population.reason, population };
  const direction = req.goal?.direction ?? 'maintain';
  const catabolic = catabolicStates(req.context);
  const override = isValidOverride(req.goal?.clinicianOverride) ? req.goal!.clinicianOverride! : null;
  if (direction === 'loss' && catabolic.length && !override) {
    return { status: 'blocked', reason: `No weight-loss plan while catabolic (${catabolic.join(', ')}) without a clinician override { by, reason }. Plan for maintenance (protein and energy first) instead.` };
  }
  const T = req.targets;
  if (!(T.energyKcal > 0) || !(T.protein.min >= 0)) return { status: 'blocked', reason: 'Energy and protein targets are required (energy > 0).' };
  const split = req.structure?.energySplit ?? config.defaultEnergySplit.value;
  if (!validSplit(split)) return { status: 'blocked', reason: 'The energy split must be non-negative fractions that add up to 1.' };

  const days = Math.max(1, Math.min(7, Math.round(req.structure?.days ?? 7)));
  const refeeding = req.goal?.refeeding ?? null;
  const snacks = req.structure?.snacksPerDay ?? (direction === 'gain' || refeeding ? config.frequentMeals.value.snacksPerDay : 2);
  const rr = resolveRestrictions(req.restrictions ?? {}, config);
  const relevant = relevantNutrients(req, rr);
  const { list } = plannerCatalogue();
  const excluded: PlanTrace['excluded'] = [];
  const allowed: PlanComponent[] = [];
  for (const c of list) {
    const ex = exclusionsFor(c, rr);
    if (ex.length) excluded.push({ componentId: c.id, reasons: ex.map(e => e.text) }); else allowed.push(c);
  }
  const ctx: MenuContext = {
    allowed, rr, goal: direction, refeeding: !!refeeding,
    energyAdditions: direction === 'gain' || !!refeeding || (!!rr.raw.ckd && T.protein.max != null), lowProtein: T.protein.max != null, proteinMax: T.protein.max ?? null,
    swallowMaxPortions: direction === 'loss' ? config.weightLoss.value.swallowMaxPortionsPerMeal : null,
    snacks, split,
  };
  const supp = req.supplements ?? {};
  const mode = supp.mode ?? 'never';
  const oralFraction = Math.min(1, Math.max(0.05, supp.oralIntakeFraction ?? 1));
  const macro = T.macroPercent ?? config.macroPercent.value;
  const seed = req.seed ?? 0;
  const usage = newWeekUsage();
  const relaxations: RelaxationRecord[] = [];
  const warnings: string[] = [...population.warnings, ...rr.notes];
  if (population.status === 'insufficient') warnings.push(`Population check incomplete (${population.missing.join(', ')} not given): confirm the patient is an adult, not pregnant or lactating, not on dialysis or PN.`);
  const conflicts: ConflictExplanation[] = [];
  const planDays: PlanDay[] = [];
  const solverInputs: PlanTrace['solverInputs'] = [];
  const constraintRecords = new Map<string, ConstraintRecord>();
  const perDayMs: number[] = [];
  let supplementsUsed = false;

  for (let d = 0; d < days; d++) {
    const dayStart = now();
    const energy = T.energyByDay?.[d] ?? T.energyKcal;
    const protein: Bounds = T.proteinByDay?.[d] ?? T.protein;
    const makeProblem = (menu: DayMenu, withSupp: boolean): DayProblem => ({
      day: d + 1, menu, energyKcal: energy, protein, macro, rr, oralFraction,
      ons: withSupp ? supp.ons ?? null : null, enteral: withSupp ? supp.enteral ?? null : null,
      supplementCostPerKcal: mode === 'always' ? 0.002 : 0.05,
      score: (c: PlanComponent) => rankScore(c, ctx), volumePenalty: direction === 'gain' || !!refeeding,
    });

    let solved: SolvedDay | null = null;
    // Held in an object: it is set inside tryMenus (a closure), which TypeScript's narrowing does not see.
    const st: { first: DayProblem | null } = { first: null };
    let empty: EmptyRole[] = [];
    let menuMs = 0;
    const tryMenus = (withSupp: boolean): SolvedDay | null => {
      // A menu that had to repeat a protein source is kept only as a fallback
      // while other menus are tried. Attempts stop at the per-day time budget.
      let fallback: SolvedDay | null = null;
      const started = now();
      for (let a = 0; a < config.menuAttempts; a++) {
        if (a > 0 && now() - started > config.dayTimeBudgetMs) break;
        const tm = now();
        const { menu, emptyRoles } = buildDayMenu(ctx, d, energy, usage, a, seed);
        menuMs += now() - tm;
        if (!menu) { empty = emptyRoles; if (a >= 1) break; continue; }
        // Cheap reject before any solve: the compulsory minimum portions alone overshoot the day, or every maximum falls short.
        const lo = menu.meals.reduce((t, m) => t + m.items.filter(i => !i.optional).reduce((x, i) => x + i.component.perVar.energyKcal * i.minVar, 0), 0);
        const hi = menu.meals.reduce((t, m) => t + m.items.reduce((x, i) => x + i.component.perVar.energyKcal * i.maxVar, 0), 0);
        const supMax = withSupp ? (supp.ons ? supp.ons.kcalPerUnit * supp.ons.maxUnitsPerDay : 0) + (supp.enteral ? supp.enteral.kcalPerMl * supp.enteral.maxMlPerDay : 0) : 0;
        const problem = makeProblem(menu, withSupp);
        st.first ??= problem;
        if (lo > energy * (1 + config.energyTolerance.value) || hi + supMax < energy * (1 - config.energyTolerance.value)) continue;
        if (menu.rotationRelaxed && fallback) continue;
        const r = solveDay(problem, config);
        if (r) {
          const out: SolvedDay = { ...r, menu, info: { attempts: a + 1, outcome: r.outcome, roundingBrokeTolerance: r.broke,
            ms: { menu: menuMs, solve: r.ms.solve, rounding: r.ms.rounding, repair: r.ms.repair, total: 0 } } };
          if (!menu.rotationRelaxed) return out;
          fallback = out;
        }
      }
      return fallback;
    };
    const withSuppFirst = mode === 'always' || (mode === 'if_needed' && oralFraction < 1);
    solved = tryMenus(withSuppFirst);
    if (!solved && mode === 'if_needed' && !withSuppFirst && (supp.ons || supp.enteral)) {
      st.first = null;
      solved = tryMenus(true);
      if (solved) relaxations.push({ day: d + 1, what: 'ONS/enteral feed added', why: 'food alone could not meet the targets within the limits' });
    }
    if (solved && solved.info.attempts > 1) relaxations.push({ day: d + 1, what: `menu attempt ${solved.info.attempts} used`, why: 'earlier menus could not be fitted to the targets' });
    if (solved?.menu.rotationRelaxed) relaxations.push({ day: d + 1, what: 'protein rotation relaxed: lunch and dinner share a protein source', why: 'no menu that the restrictions and the twice-a-week rule allow keeps them different' });
    if (solved?.info.roundingBrokeTolerance) relaxations.push({ day: d + 1, what: `rounding repaired (${solved.info.outcome})`, why: 'rounding to practical units broke a limit; re-solved on the rounding grid' });

    if (!solved) {
      const cx = !st.first ? explainEmptyRoles(d + 1, empty, list, rr) : explainSolverConflict(st.first, config.energyTolerance.value, supp);
      conflicts.push(cx);
      perDayMs.push(now() - dayStart);
      if (req.bestEffort && st.first) {
        const b = buildDayModel(st.first, { tolerance: config.energyTolerance.value, mode: 'grid', bestEffort: true });
        const s = runSolver(b);
        if (s.feasible) {
          const a = roundAmounts(b, amountsOf(b, s.values), config.rounding.value.enteralStepMl);
          solved = { menu: st.first.menu, problem: st.first, built: b, amounts: a, evaluation: evaluateDay(st.first, b, a, config.energyTolerance.value),
            stage: 'best_effort', info: { attempts: config.menuAttempts, outcome: 'best_effort', roundingBrokeTolerance: false, ms: { menu: menuMs, solve: s.ms, rounding: 0, repair: 0, total: 0 } } };
        }
      }
      if (!solved) continue;
    }

    // ── Assemble the day ──
    const { menu, problem, built, amounts, evaluation } = solved;
    built.records.forEach(r => { if (!constraintRecords.has(r.id)) constraintRecords.set(r.id, r); });
    solverInputs.push({ day: d + 1, stage: solved.stage, model: built.model });
    const served = new Set<string>();
    const meals: PlanMeal[] = [];
    const dayLower = new Set<NutrientKey>();
    for (const m of menu.meals) {
      const items: PlanItem[] = [];
      const lower = new Set<NutrientKey>();
      for (const vi of built.vars) {
        if (vi.kind !== 'item' || vi.item!.slot !== m.slot) continue;
        const a = amounts.get(vi.name) ?? 0;
        if (a <= 0) continue;
        served.add(vi.item!.key);
        const it = itemOf(vi.item!.component, a, relevant);
        it.lowerBound.forEach(k => { lower.add(k); dayLower.add(k); });
        items.push(it);
      }
      meals.push({ slot: m.slot, label: SLOT_LABEL[m.slot], time: config.mealTimes[m.slot], energyShare: m.share,
        mainDish: m.mainDish, proteinSource: m.proteinSource, items,
        totals: totalsOf(evaluation.meals.get(m.slot) ?? emptyProfile(), relevant, lower) });
    }
    const suppItems: PlanItem[] = [];
    for (const vi of built.vars) {
      const a = amounts.get(vi.name) ?? 0;
      if (vi.kind === 'item' || a <= 0) continue;
      supplementsUsed = true;
      const ons = vi.kind === 'ons';
      const kcal = ons ? problem.ons!.kcalPerUnit * a : problem.enteral!.kcalPerMl * a;
      const prot = ons ? problem.ons!.proteinGPerUnit * a : problem.enteral!.proteinGPerMl * a;
      const label = ons ? `${a} × ${problem.ons!.unitLabel}` : `${a} mL`;
      relevant.forEach(k => dayLower.add(k));
      suppItems.push({
        componentId: ons ? 'ons' : 'enteral', name: ons ? problem.ons!.product : problem.enteral!.product, igboName: '', role: ons ? 'ons' : 'enteral',
        amount: { value: a, unit: ons ? 'unit' : 'mL', label }, rawGrams: null, cookedGrams: null,
        weightNote: ons ? 'Label values; volume from the label when given.' : 'Label values; volume delivered.',
        householdMeasure: label, kcal: round(kcal), proteinG: round(prot, 1), carbohydrateG: 0, fatG: 0,
        micronutrients: Object.fromEntries(relevant.map(k => [k, null])), lowerBound: [...relevant],
        pendingVerification: false, source: { kind: 'product', ref: ons ? problem.ons!.product : problem.enteral!.product },
      });
    }
    if (suppItems.length) {
      meals.push({ slot: 'supplement', label: SLOT_LABEL.supplement, time: config.mealTimes.supplement, energyShare: 0, mainDish: null, proteinSource: null,
        items: suppItems, totals: totalsOf(evaluation.supplement, relevant, new Set(relevant)) });
    }
    recordUsage(usage, menu, served);
    menu.notes.forEach(n => { if (!warnings.includes(n)) warnings.push(n); });
    const fluidLow = T.fluidMl?.low ?? null;
    const drinkingWaterMl = rr.fluidMlMax !== null || fluidLow === null ? 0 : Math.max(0, Math.round((fluidLow - evaluation.day.water) / 50) * 50);
    const ms = now() - dayStart;
    perDayMs.push(ms);
    planDays.push({
      day: d + 1, label: req.structure?.dayLabels?.[d] ?? `Day ${d + 1}`,
      energyTargetKcal: round(energy), protein, meals,
      totals: totalsOf(evaluation.day, relevant, dayLower), drinkingWaterMl,
      checks: {
        energyWithinTolerance: !evaluation.failures.some(f => f.startsWith('energy')),
        energyPercentOfTarget: round(evaluation.energyPercent, 1),
        proteinMet: !evaluation.failures.some(f => f.startsWith('protein') && f.includes('below')),
        proteinPercentOfTarget: round(evaluation.proteinPercent, 1),
        restrictionsMet: evaluation.restrictionsOk, portionsWithinLimits: evaluation.portionsOk,
        failures: evaluation.failures,
      },
      solve: { ...solved.info, ms: { ...solved.info.ms, total: ms } },
    });
  }

  const totalMs = now() - t0;
  const trace: PlanTrace = {
    plannerVersion: config.version, engineConfigVersion: ACTIVE_NUTRITION_CONFIG.version,
    datasetVersion: CORE_FOOD_TABLE.meta.datasetVersion, validationStatus: config.validationStatus,
    constraints: [...constraintRecords.values()], relaxations, solverInputs,
    timings: { totalMs: round(totalMs, 1), perDayMs: perDayMs.map(x => round(x, 1)), maxDayMs: round(Math.max(0, ...perDayMs), 1) },
    excluded, seed,
  };

  const plan = (): WeeklyMealPlan => ({
    status: 'draft', notice: DRAFT_NOTICE, generatedAt: new Date().toISOString(),
    targets: T, restrictions: req.restrictions ?? {}, structure: { days, snacksPerDay: snacks, energySplit: split },
    goal: goalSummary(req, direction, catabolic, override), relevantNutrients: relevant,
    days: planDays, weekly: weeklySummary(planDays), supplementsUsed,
    warnings: [...warnings, ...(refeeding ? Object.values(REFEEDING_ALERTS).map(a => (typeof a === 'function' ? a(3) : a)) : [])],
    assumptions: [
      ...T.derivation,
      FOOD_COMPOSITION_ACKNOWLEDGEMENT,
      'Recipe quantities and household measures are working estimates pending dietitian verification and local weighing.',
      'Recipe dishes give the raw ingredient weight; the cooked weight is not known until each recipe\'s yield is measured.',
      `Energy within ±${config.energyTolerance.value * 100}% of target and protein at least the target are re-checked after rounding to practical units.`,
    ],
    trace,
  });

  if (conflicts.length) {
    const summary = conflicts.map(c => `Day ${c.day}: ${c.emptyRoles?.length
      ? `nothing to serve for ${c.emptyRoles.map(e => `${e.slot} (${e.role})`).join(', ')}`
      : c.conflictingConstraints.length ? `conflict between ${c.conflictingConstraints.map(x => x.label).join(' + ')}` : 'no feasible menu'}`).join('; ');
    return { status: 'infeasible', conflicts, summary, trace, ...(req.bestEffort && planDays.length === days ? { bestEffort: plan() } : {}) };
  }
  return { status: 'draft', plan: plan() };
}

const emptyProfile = (): Profile => Object.fromEntries(NUTRIENT_KEYS.map(k => [k, 0])) as Profile;

function weeklySummary(days: PlanDay[]): WeeklySummary {
  const n = Math.max(1, days.length);
  const avg = (f: (d: PlanDay) => number) => days.reduce((a, d) => a + f(d), 0) / n;
  const keys = new Set(days.flatMap(d => Object.keys(d.totals.micronutrients))) as Set<NutrientKey>;
  const averages: NutrientTotals = {
    kcal: round(avg(d => d.totals.kcal)), proteinG: round(avg(d => d.totals.proteinG), 1), carbohydrateG: round(avg(d => d.totals.carbohydrateG), 1),
    fatG: round(avg(d => d.totals.fatG), 1), fibreG: round(avg(d => d.totals.fibreG), 1), waterMl: round(avg(d => d.totals.waterMl)),
    sodiumMg: round(avg(d => d.totals.sodiumMg)), potassiumMg: round(avg(d => d.totals.potassiumMg)), phosphorusMg: round(avg(d => d.totals.phosphorusMg)),
    micronutrients: Object.fromEntries([...keys].map(k => [k, round(avg(d => d.totals.micronutrients[k] ?? 0), 1)])),
    lowerBound: [...new Set(days.flatMap(d => d.totals.lowerBound))],
  };
  const targetE = avg(d => d.energyTargetKcal);
  const targetP = avg(d => d.protein.min);
  const e = averages.kcal || 1;
  return {
    days: days.length, averages,
    vsTargets: {
      energyPercent: round((averages.kcal / targetE) * 100, 1),
      proteinPercent: targetP > 0 ? round((averages.proteinG / targetP) * 100, 1) : 100,
      carbohydratePercentEnergy: round((averages.carbohydrateG * 400) / e, 1),
      fatPercentEnergy: round((averages.fatG * 900) / e, 1),
      proteinPercentEnergy: round((averages.proteinG * 400) / e, 1),
    },
  };
}

function goalSummary(req: MealPlanRequest, direction: 'maintain' | 'loss' | 'gain', catabolic: string[], override: { by: string; reason: string } | null): GoalSummary {
  const g = req.goal?.weightGoal ?? null;
  const text: string[] = [];
  const refeeding = req.goal?.refeeding ?? null;
  if (direction === 'loss') {
    text.push(g ? `Weight loss: ${Math.abs(g.dailyDeltaKcal)} kcal/day below maintenance (stage 1 weight goal), ${g.projectedKgPerWeek} kg/week projected.` : 'Weight loss.');
    text.push('High protein held at the target; vegetables, legumes and lean protein favoured; swallow limited to one wrap per meal and no oil added.');
    if (catabolic.length && override) text.push(`Catabolic (${catabolic.join(', ')}): weight-loss plan by clinician override (${override.by}: ${override.reason}).`);
  } else if (direction === 'gain') {
    text.push(g ? `Weight gain: ${g.dailyDeltaKcal} kcal/day above maintenance, ${g.projectedKgPerWeek} kg/week projected.` : 'Weight gain.');
    text.push('Energy-dense additions (palm oil, groundnut, eggs, milk, akamu fortified with milk and groundnut) and frequent small meals.');
  } else if (catabolic.length) {
    text.push(`Catabolic state (${catabolic.join(', ')}): protein and energy targets first; no weight loss.`);
  }
  if (refeeding) text.push(`Refeeding (${refeeding.level} risk): energy follows the stepped schedule, day N at that day's energy, full target from day ${refeeding.schedule.length}.`);
  return {
    direction, text, projectedKgPerWeek: g?.projectedKgPerWeek ?? null, trajectory: g?.trajectory ?? [],
    refeeding: refeeding ? { level: refeeding.level, days: refeeding.schedule.length } : null,
  };
}
