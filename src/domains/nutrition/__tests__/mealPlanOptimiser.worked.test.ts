/**
 * Stage 3 optimiser: worked plans, end to end from the stage 1 engine
 * (buildPlanTargets) to the draft plan, the patient plan and the stored
 * NutritionPlan record. Plus the safety gates and the infeasibility report.
 */
import { describe, it, expect } from 'vitest';
import { buildPlanTargets, type TargetsInput } from '../planner/targets';
import { planWeeklyMeals } from '../planner/plan';
import { checkVariety } from '../planner/variety';
import { toPatientPlan } from '../planner/patientPlan';
import { toNutritionPlanRecord } from '../planner/persist';
import { plannerCatalogue } from '../planner/catalogue';
import { DRAFT_NOTICE } from '../planner/config';
import type { MealPlanRequest, PlanRestrictions, SupplementOptions, WeeklyMealPlan } from '../planner/types';

const ONS = { product: 'Example ONS (label: 300 kcal, 12 g protein per 200 mL bottle)', kcalPerUnit: 300, proteinGPerUnit: 12, unitLabel: '200 mL bottle', mlPerUnit: 200, maxUnitsPerDay: 2 };
const ADULT = { dialysis: false, parenteralNutrition: false } as const;

function run(t: TargetsInput, restrictions: PlanRestrictions = {}, supplements?: SupplementOptions) {
  const targets = buildPlanTargets(t);
  if (targets.status !== 'ok') throw new Error(`targets: ${JSON.stringify(targets)}`);
  const req: MealPlanRequest = { patient: t.patient, context: t.context, targets: targets.targets, goal: targets.goal, restrictions, supplements };
  const r = planWeeklyMeals(req);
  if (r.status !== 'draft') throw new Error(`plan: ${JSON.stringify(r).slice(0, 2000)}`);
  return { plan: r.plan, req, targets: targets.targets };
}

const items = (p: WeeklyMealPlan) => p.days.flatMap(d => d.meals.flatMap(m => m.items));
const byId = plannerCatalogue().byId;

/** One line per plan: targets vs achieved, for the report. */
function summary(name: string, p: WeeklyMealPlan): string {
  const w = p.weekly;
  return `${name}: energy ${w.averages.kcal} kcal/day (${w.vsTargets.energyPercent}% of target), protein ${w.averages.proteinG} g (${w.vsTargets.proteinPercent}%), ` +
    `carb ${w.vsTargets.carbohydratePercentEnergy}% / fat ${w.vsTargets.fatPercentEnergy}% / protein ${w.vsTargets.proteinPercentEnergy}% of energy, ` +
    `Na ${w.averages.sodiumMg} mg, K ${w.averages.potassiumMg} mg, P ${w.averages.phosphorusMg} mg; ${p.trace.timings.totalMs} ms (slowest day ${p.trace.timings.maxDayMs} ms)`;
}

function commonChecks(p: WeeklyMealPlan) {
  expect(p.status).toBe('draft');
  expect(p.notice).toBe(DRAFT_NOTICE);
  expect(p.days).toHaveLength(7);
  for (const d of p.days) {
    expect(d.checks.failures, d.label).toEqual([]);
    expect(Math.abs(d.checks.energyPercentOfTarget - 100)).toBeLessThanOrEqual(5);
    expect(d.totals.proteinG).toBeGreaterThanOrEqual(d.protein.min - 0.05);
  }
  expect(checkVariety(p).problems).toEqual([]);
  expect(p.trace.plannerVersion).toMatch(/^planner-/);
  expect(p.trace.solverInputs).toHaveLength(7);
  // eslint-disable-next-line no-console
}

const reports: string[] = [];

describe('worked plans', () => {
  it('diabetic outpatient on weight loss: deficit from stage 1, high protein, carbohydrate controlled, no sugar', () => {
    const { plan, targets } = run({
      patient: { ...ADULT, ageYears: 52, sex: 'female', weightKg: 92, heightCm: 160, pregnant: false, lactating: false },
      context: { setting: 'outpatient', diabetes: true }, goal: { direction: 'loss', targetWeightKg: 80 },
    }, { diabetes: true });
    commonChecks(plan);
    expect(plan.goal.direction).toBe('loss');
    expect(plan.goal.trajectory.length).toBeGreaterThan(1);
    expect(plan.goal.projectedKgPerWeek).toBeLessThan(0);
    expect(targets.derivation.join(' ')).toMatch(/high protein for weight loss/);
    for (const d of plan.days) {
      expect((d.totals.carbohydrateG * 400) / d.totals.kcal).toBeLessThanOrEqual(45.5);
      for (const m of d.meals) for (const i of m.items) {
        const c = byId.get(i.componentId)!;
        expect(c.tags.has('added_sugar') || c.tags.has('sugary_drink'), i.name).toBe(false);
        if (c.role === 'swallow') expect(i.amount.value).toBeLessThanOrEqual(1);
        if (c.role === 'fat') throw new Error('no oil added for weight loss');
      }
    }
    expect(plan.relevantNutrients).toContain('fibre');
    reports.push(summary('Diabetic, weight loss', plan));
  });

  it('cachectic patient on stepped refeeding: day N at that day\'s energy, small frequent meals', () => {
    const { plan, targets } = run({
      patient: { ...ADULT, ageYears: 38, sex: 'male', weightKg: 44, heightCm: 172 },
      context: { setting: 'ward' }, goal: { direction: 'gain', targetWeightKg: 55 },
      refeeding: { bmi: 14.9, weightLossPercent3to6m: 18, littleOrNoIntakeDays: 12, labs: { potassium: 3.2, phosphate: 0.7, magnesium: 0.75 } },
    }, {}, { mode: 'if_needed', ons: ONS });
    commonChecks(plan);
    expect(plan.goal.refeeding?.level).toBe('high');
    const schedule = targets.energyByDay!;
    expect(schedule[0]).toBe(440); // 10 kcal/kg × 44 kg
    plan.days.forEach((d, i) => expect(d.energyTargetKcal).toBe(schedule[i]));
    expect(plan.structure.snacksPerDay).toBe(3);
    expect(plan.warnings.join(' ')).toMatch(/potassium, phosphate and magnesium/i);
    expect(plan.relevantNutrients).toEqual(expect.arrayContaining(['potassium', 'phosphorus', 'magnesium']));
    reports.push(summary('Refeeding (high risk)', plan) + ` — days ${plan.days.map(d => `${d.totals.kcal}/${d.energyTargetKcal}`).join(', ')}`);
  });

  it('30% TBSA burns: protein and energy first (Curreri, high end of the burns protein range), no weight loss', () => {
    const t: TargetsInput = { patient: { ...ADULT, ageYears: 30, sex: 'male', weightKg: 70, heightCm: 175 }, context: { setting: 'ward', burns: { tbsaPercent: 30, postBurnDay: 5 } } };
    const { plan, targets } = run(t, {}, { mode: 'if_needed', ons: ONS });
    commonChecks(plan);
    expect(targets.energyKcal).toBe(2950); // Curreri 25 × 70 + 40 × 30
    expect(targets.protein.min).toBe(140); // 2.0 g/kg × 70
    expect(plan.goal.text.join(' ')).toMatch(/Catabolic/);
    expect(plan.relevantNutrients).toEqual(expect.arrayContaining(['zinc', 'vitaminC']));
    // A weight-loss plan is refused without an override...
    const blocked = buildPlanTargets({ ...t, goal: { direction: 'loss' } });
    expect(blocked.status).toBe('blocked');
    const direct = planWeeklyMeals({ patient: t.patient, context: t.context, targets: targets, goal: { direction: 'loss' } });
    expect(direct.status).toBe('blocked');
    // ...and allowed with one (stage 1 override type).
    const withOverride = planWeeklyMeals({ patient: t.patient, context: t.context, targets: { ...targets, energyKcal: 2500 },
      goal: { direction: 'loss', clinicianOverride: { by: 'Dr A', reason: 'obesity, healed burns review' } }, structure: { days: 1 } });
    expect(withOverride.status).toBe('draft');
    reports.push(summary('Burns 30% TBSA', plan));
  });

  it('CKD not on dialysis: protein within the KDOQI range, potassium and phosphate limits kept', () => {
    const { plan, targets } = run({
      patient: { ...ADULT, ageYears: 60, sex: 'male', weightKg: 68, heightCm: 170 },
      context: { setting: 'outpatient', ckdNonDialysis: true }, energy: { kcal: 2040 },
    }, { ckd: { potassiumMgMax: 2400, phosphorusMgMax: 900 }, sodiumMgMax: 2300 });
    commonChecks(plan);
    expect(targets.protein.max).toBeDefined();
    for (const d of plan.days) {
      expect(d.totals.proteinG).toBeLessThanOrEqual(targets.protein.max! + 0.05);
      expect(d.totals.potassiumMg).toBeLessThanOrEqual(2400);
      expect(d.totals.phosphorusMg).toBeLessThanOrEqual(900);
      expect(d.totals.sodiumMg).toBeLessThanOrEqual(2300);
      for (const m of d.meals) for (const i of m.items) expect(i.micronutrients).toHaveProperty('potassium');
    }
    expect(plan.relevantNutrients).toEqual(expect.arrayContaining(['potassium', 'phosphorus', 'sodium']));
    reports.push(summary('CKD (K ≤ 2400, P ≤ 900, Na ≤ 2300)', plan));
  });

  it('Muslim patient: no pork (or alcohol) anywhere in the week', () => {
    const { plan } = run({ patient: { ...ADULT, ageYears: 40, sex: 'male', weightKg: 75, heightCm: 178 }, context: { setting: 'ward' } }, { religious: ['halal'] });
    commonChecks(plan);
    for (const i of items(plan)) {
      const c = byId.get(i.componentId)!;
      expect(c.tags.has('pork') || c.tags.has('alcohol'), i.name).toBe(false);
    }
    expect(plan.warnings.join(' ')).toMatch(/halal-slaughtered/);
    // Without the restriction, pork can appear (the restriction does work).
    expect(byId.get('pork-stewed')!.tags.has('pork')).toBe(true);
    reports.push(summary('Halal', plan));
  });

  it('low budget tier, family preparing: only low-cost foods', () => {
    const { plan } = run({ patient: { ...ADULT, ageYears: 35, sex: 'female', weightKg: 60, heightCm: 162, pregnant: false, lactating: false }, context: { setting: 'ward' } },
      { budget: 'low', preparer: 'family' });
    commonChecks(plan);
    for (const i of items(plan)) {
      const c = byId.get(i.componentId)!;
      expect(c.costTier, i.name).toBe('low');
      expect(c.availability.some(a => a === 'home' || a === 'market'), i.name).toBe(true);
    }
    reports.push(summary('Low budget', plan));
  });

  it('soft texture, hospital kitchen: only soft-or-finer foods the kitchen makes', () => {
    const { plan } = run({ patient: { ...ADULT, ageYears: 75, sex: 'female', weightKg: 55, heightCm: 158 }, context: { setting: 'ward' } },
      { texture: 'soft', preparer: 'hospital_kitchen' });
    commonChecks(plan);
    for (const i of items(plan)) {
      const c = byId.get(i.componentId)!;
      expect(c.spec.texture, i.name).not.toBe('regular');
      expect(c.availability, i.name).toContain('hospital_kitchen');
    }
    const patient = toPatientPlan(plan);
    expect(patient.tips.join(' ')).toMatch(/soft/);
    reports.push(summary('Soft texture', plan));
  });

  it('prints the worked-plan summaries', () => {
    // eslint-disable-next-line no-console
    console.log(reports.join('\n'));
    expect(reports).toHaveLength(7);
  });
});

describe('output model', () => {
  const { plan, req } = run({ patient: { ...ADULT, ageYears: 45, sex: 'male', weightKg: 70, heightCm: 172 }, context: { setting: 'ward' } });

  it('every item has raw and cooked weights (or says which is unknown), a household measure, kcal, protein', () => {
    for (const i of items(plan)) {
      expect(i.rawGrams !== null || i.cookedGrams !== null, i.name).toBe(true);
      expect(i.weightNote.length).toBeGreaterThan(10);
      if (i.cookedGrams === null) expect(i.weightNote).toMatch(/not known|not measured/);
      expect(i.householdMeasure.length).toBeGreaterThan(0);
      expect(typeof i.kcal).toBe('number');
      expect(typeof i.proteinG).toBe('number');
      expect(typeof i.igboName).toBe('string');
    }
    // Igbo names only where set (recipes and foods), never invented.
    const eba = items(plan).find(i => i.componentId === 'eba');
    if (eba) expect(eba.igboName).toBe('Eba');
  });

  it('meal totals add to day totals; weekly averages vs targets', () => {
    for (const d of plan.days) {
      const sum = d.meals.reduce((a, m) => a + m.totals.kcal, 0);
      expect(Math.abs(sum - d.totals.kcal)).toBeLessThanOrEqual(d.meals.length);
    }
    expect(plan.weekly.vsTargets.energyPercent).toBeGreaterThan(95);
    expect(plan.weekly.vsTargets.energyPercent).toBeLessThan(105);
  });

  it('patient plan is plain English with household measures and the source line', () => {
    const p = toPatientPlan(plan);
    expect(p.status).toBe('draft');
    expect(p.notice).toBe(DRAFT_NOTICE);
    expect(p.days).toHaveLength(7);
    expect(p.days[0].meals[0].lines[0].text).toMatch(/—/);
    expect(p.source).toMatch(/FAO\/INFOODS/);
    const noIgbo = toPatientPlan(plan, { igboLabels: false });
    expect(noIgbo.days.flatMap(d => d.meals.flatMap(m => m.lines)).every(l => l.igboName === '')).toBe(true);
  });

  it('saves through the nutritionPlans model as a versioned draft with inputs and trace', () => {
    const rec = toNutritionPlanRecord(plan, req, { patientId: 'p1', createdBy: 'u1', now: new Date('2026-11-13T08:00:00Z') });
    expect(rec.status).toBe('draft');
    expect(rec.approvalStatus).toBe('draft');
    expect(rec.version).toBe(1);
    expect(rec.notes).toBe(DRAFT_NOTICE);
    expect(rec.mealPlans).toHaveLength(7);
    expect(Object.keys(rec.weeklyMenu!)).toHaveLength(7);
    expect(rec.optimiser?.request).toBe(req);
    expect(rec.optimiser?.plan.trace.constraints.length).toBeGreaterThan(5);
    expect(rec.optimiser?.engineConfigVersion).toBeTruthy();
    const rev = toNutritionPlanRecord(plan, req, { patientId: 'p1', createdBy: 'u1', revisionOf: { id: rec.id, version: rec.version } });
    expect(rev.version).toBe(2);
    expect(rev.optimiser?.revisionOf).toBe(rec.id);
  });
});

describe('safety gates and infeasibility', () => {
  const base = { energyKcal: 2000, protein: { min: 70 }, derivation: [] };
  it.each([
    ['child', { ageYears: 12 }],
    ['pregnancy', { ageYears: 28, sex: 'female' as const, pregnant: true }],
    ['dialysis', { ageYears: 50, dialysis: true }],
    ['parenteral nutrition', { ageYears: 50, parenteralNutrition: true }],
  ])('never plans for a refer population: %s', (_n, patient) => {
    const r = planWeeklyMeals({ patient, targets: base });
    expect(r.status).toBe('refer');
    expect(buildPlanTargets({ patient: { ...patient, weightKg: 60, heightCm: 165 } }).status).toBe('refer');
  });

  it('an impossible combination is explained by a minimal conflicting set with suggestions', () => {
    // 3500 kcal with protein ≥ 60 g but at most 62 g and potassium ≤ 1200 mg.
    const r = planWeeklyMeals({ patient: { ageYears: 50, sex: 'male', ...ADULT }, targets: { energyKcal: 3500, protein: { min: 60, max: 62 }, derivation: [] },
      restrictions: { ckd: { potassiumMgMax: 1200, phosphorusMgMax: 600 } }, structure: { days: 1 } });
    expect(r.status).toBe('infeasible');
    if (r.status !== 'infeasible') return;
    const c = r.conflicts[0];
    expect(c.conflictingConstraints.length).toBeGreaterThan(0);
    expect(c.suggestions.length).toBeGreaterThan(0);
    expect(r.summary).toMatch(/Day 1/);
  });

  it('a restriction set that leaves nothing to serve names the restrictions', () => {
    const r = planWeeklyMeals({ patient: { ageYears: 50, sex: 'male', ...ADULT }, targets: { ...base }, restrictions: { texture: 'liquid' }, structure: { days: 1 } });
    expect(r.status).toBe('infeasible');
    if (r.status !== 'infeasible') return;
    expect(r.conflicts[0].emptyRoles?.length).toBeGreaterThan(0);
    expect(r.conflicts[0].emptyRoles!.some(e => e.restrictions.includes('texture modification'))).toBe(true);
  });

  it('suggests ONS when energy/protein cannot be met and none is configured; uses it when allowed', () => {
    const hard = { patient: { ageYears: 50, sex: 'male' as const, ...ADULT }, targets: { energyKcal: 2600, protein: { min: 190 }, derivation: [] },
      restrictions: { allergies: ['fish' as const], religious: ['vegetarian' as const] }, structure: { days: 1 } };
    const r = planWeeklyMeals(hard);
    expect(r.status).toBe('infeasible');
    if (r.status === 'infeasible') expect(r.conflicts[0].suggestions.join(' ')).toMatch(/oral nutritional supplement/i);
    const withOns = planWeeklyMeals({ ...hard, supplements: { mode: 'if_needed', ons: { ...ONS, proteinGPerUnit: 30, maxUnitsPerDay: 3 } } });
    expect(withOns.status).toBe('draft');
    if (withOns.status === 'draft') {
      expect(withOns.plan.supplementsUsed).toBe(true);
      expect(withOns.plan.trace.relaxations.some(x => /ONS/.test(x.what))).toBe(true);
    }
  });
});
