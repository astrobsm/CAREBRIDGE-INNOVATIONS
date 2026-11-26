/**
 * Weight-gain planning for the /calculators hub.
 *
 * BMR is the canonical Mifflin-St Jeor (the equation the hub already used).
 * Where the nutrition engine rates the patient at high refeeding risk (e.g.
 * BMI < 16), the full surplus is NOT started on day one: the engine's stepped
 * refeeding schedule (assessRefeedingRisk + refeedingSchedule) is part of the
 * plan, with its electrolyte and thiamine alerts.
 */
import type { PatientCalculatorInfo } from '../../types';
import { calculateBMI, calculateMifflinStJeorBMR, type Sex } from '../calculationEngine';
import { assessRefeedingRisk, refeedingSchedule } from '../../../nutrition/engine/refeeding';
import type { DayPlan } from '../../../../data/nigerianFoods';
import { emptyPlan, field, presentFields, section, sections, yesNo } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';
import { mealPlanSections } from '../../../clinician-assistant/services/bedsideReports';
import { NO_PLAN_MESSAGE, parseNum, sevenDayPlan, validateBody } from './nutritionCommon';
import { monthsFromWeeks, type WeightHubResult } from './weightLoss';

export const GAIN_ACTIVITY: Record<string, { label: string; factor: number }> = {
  bedridden: { label: 'Bedridden', factor: 1.2 },
  sedentary: { label: 'Sedentary', factor: 1.3 },
  light: { label: 'Light activity', factor: 1.4 },
  moderate: { label: 'Moderate activity', factor: 1.55 },
  active: { label: 'Active', factor: 1.7 },
};

export const GAIN_RATES: Record<string, { label: string; kgPerWeek: number; surplus: number }> = {
  slow: { label: 'Slow', kgPerWeek: 0.25, surplus: 250 },
  moderate: { label: 'Moderate', kgPerWeek: 0.5, surplus: 500 },
  fast: { label: 'Faster', kgPerWeek: 0.75, surplus: 750 },
};

export interface WeightGainInput {
  currentWeightKg: string | number;
  targetWeightKg: string | number;
  heightCm: string | number;
  ageYears: string | number;
  sex: Sex;
  activityLevel: string;
  rate: string;
  malnourished: boolean;
  postSurgery: boolean;
  chronicDisease: boolean;
  diabetes: boolean;
}

export interface WeightGainResult extends WeightHubResult {
  refeedingLevel: 'extreme' | 'high' | 'not_high' | 'indeterminate';
  /** Day-by-day energy when refeeding risk is high; empty otherwise. */
  refeedingDays: Array<{ day: number; kcal: number; kcalPerKg: number }>;
  refeedingAlerts: string[];
}

export type WeightGainOutcome = { result: WeightGainResult } | { errors: string[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeWeightGain(input: WeightGainInput): WeightGainOutcome {
  const errors: string[] = [];
  const body = validateBody({ weightKg: input.currentWeightKg, heightCm: input.heightCm, ageYears: input.ageYears }, errors);
  const target = parseNum(input.targetWeightKg);
  if (target === null) errors.push('Enter the target weight.');
  else if (target < 20 || target > 300) errors.push('Target weight should be between 20 and 300 kg.');
  else if (body && target <= body.weightKg) errors.push('Target weight must be more than the current weight for weight gain.');
  if (!GAIN_ACTIVITY[input.activityLevel]) errors.push('Choose an activity level.');
  if (!GAIN_RATES[input.rate]) errors.push('Choose a rate of gain.');
  if (errors.length || !body || target === null) return { errors };

  const { weightKg: current, heightCm, ageYears } = body;
  const heightM = heightCm / 100;
  const currentBMI = calculateBMI(current, heightCm)!;
  const targetBMI = calculateBMI(target, heightCm)!;
  const idealWeight = round1(22 * heightM * heightM);

  const bmr = calculateMifflinStJeorBMR(input.sex, current, heightCm, ageYears);
  let activityFactor = GAIN_ACTIVITY[input.activityLevel].factor;
  if (input.malnourished) activityFactor *= 1.2;
  if (input.postSurgery) activityFactor *= 1.1;
  if (input.chronicDisease) activityFactor *= 1.15;
  const tdee = bmr * activityFactor;

  const weightToGain = round1(target - current);
  const rate = GAIN_RATES[input.rate];
  const weeksNeeded = Math.ceil(weightToGain / rate.kgPerWeek);
  const monthsNeeded = monthsFromWeeks(weeksNeeded);
  const targetCalories = Math.round(tdee + rate.surplus);
  const proteinTarget = Math.round(1.8 * current);

  // Refeeding risk from the nutrition engine (NICE CG32 criteria).
  const risk = assessRefeedingRisk({ bmi: currentBMI });
  const refeedingLevel = risk.value?.level ?? 'indeterminate';
  let refeedingDays: WeightGainResult['refeedingDays'] = [];
  let refeedingAlerts: string[] = [];
  if (refeedingLevel === 'high' || refeedingLevel === 'extreme') {
    const sched = refeedingSchedule({ weightKg: current, targetKcal: targetCalories, level: refeedingLevel });
    refeedingDays = sched.value ?? [];
    refeedingAlerts = sched.alerts;
  }

  const dietarySuggestions = {
    toEat: [
      'Rice with stew and plenty of meat/fish',
      'Groundnuts and groundnut soup',
      'Ripe plantain (fried or boiled)',
      'Full-cream milk, powdered milk in pap',
      'Eggs - boiled, fried, or in dishes',
      'Beans with palm oil',
      'Yam porridge with vegetables',
      'Fish (dried or fresh) - excellent protein',
      'Avocado when in season',
      input.diabetes ? 'Unsweetened drinks (diabetes) — energy from oils, nuts and milk instead of sugar' : 'Honey in beverages',
    ],
    highCalorieMeals: [
      'Jollof rice with chicken and plantain - 800+ kcal',
      'Eba with egusi and assorted meat - 700+ kcal',
      'Beans and plantain with palm oil - 600+ kcal',
      'Moi-moi with pap and milk - 500+ kcal',
      'Suya (grilled meat) - high protein snack',
    ],
    toLimit: [
      'Avoid filling up on water before meals',
      'Don\'t skip meals',
      'Limit low-calorie vegetables at start of meals',
    ],
    mealTiming: [
      'Eat 3 main meals + 2-3 snacks',
      'Never skip breakfast',
      'Eat calorie-dense foods first',
      'Drink beverages after meals, not before',
      'Have a bedtime snack',
    ],
  };

  const supplements: string[] = [];
  if (input.malnourished) {
    supplements.push('Therapeutic foods (Plumpy\'nut) if available');
    supplements.push('Micronutrient supplementation (multivitamins)');
    supplements.push('Zinc 20mg daily for first 2 weeks');
  }
  supplements.push('Protein powder if available and affordable');
  supplements.push('Full-cream powdered milk - add to foods and drinks');
  supplements.push('Oral nutritional supplements (ONS) if prescribed');

  const medicalConsiderations: string[] = [];
  if (currentBMI < 16) {
    medicalConsiderations.push('Severe underweight (BMI <16) - Medical supervision essential');
    medicalConsiderations.push('Risk of refeeding syndrome - start slowly (see the refeeding schedule)');
    medicalConsiderations.push('Monitor phosphate, potassium, magnesium');
  } else if (currentBMI < 17) {
    medicalConsiderations.push('Moderate underweight - Medical evaluation recommended');
  }
  if (input.malnourished) {
    medicalConsiderations.push('Malnutrition: Gradual increase in calories over 7-10 days');
    medicalConsiderations.push('Monitor for refeeding syndrome');
  }
  if (input.postSurgery) medicalConsiderations.push('Post-surgical: Focus on protein for wound healing');
  if (input.diabetes) medicalConsiderations.push('Diabetes: monitor glucose as intake rises; review hypoglycaemic doses.');

  const warnings: string[] = [];
  if (currentBMI >= 25) warnings.push('BMI already in healthy/overweight range - weight gain may not be necessary');
  if (targetBMI >= 30) warnings.push(`Target BMI ${targetBMI} is in the obese range — choose a lower target.`);
  if (refeedingDays.length) {
    warnings.push(`High refeeding risk: do not start at ${targetCalories} kcal. Start at ${refeedingDays[0].kcal} kcal on day 1 and build up to the target over ${refeedingDays.length} days with daily electrolytes.`);
  }

  const milestones = [
    { weight: Math.round(current + (target - current) * 0.25), achievement: '25% progress - Keep going!' },
    { weight: Math.round(current + (target - current) * 0.5), achievement: '50% - Halfway there!' },
    { weight: Math.round(current + (target - current) * 0.75), achievement: '75% - Almost there!' },
    { weight: target, achievement: 'Target reached!' },
  ];

  const exerciseRecommendations = [
    'Resistance training 3-4 times/week for muscle building',
    'Compound exercises: Squats, deadlifts, bench press',
    'Limit excessive cardio (burns calories)',
    'Focus on strength, not endurance',
    'Rest adequately between workouts',
    'Sleep 7-9 hours for recovery and growth',
  ];

  return {
    result: {
      direction: 'gain',
      currentWeight: current,
      targetWeight: target,
      currentBMI,
      targetBMI,
      idealWeight,
      weightChange: weightToGain,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      dailyDeficit: -rate.surplus,
      requestedDailyDeficit: -rate.surplus,
      proteinTarget,
      weeksNeeded,
      monthsNeeded,
      weeklyRate: rate.kgPerWeek,
      timelineAchievable: true,
      exerciseRecommendations,
      dietarySuggestions,
      medicalConsiderations,
      milestones,
      warnings,
      supplements,
      diabetes: input.diabetes,
      refeedingLevel,
      refeedingDays,
      refeedingAlerts,
    },
  };
}

export function weightGainDays(r: WeightGainResult): DayPlan[] {
  return sevenDayPlan(r.targetCalories, r.proteinTarget, { goal: 'gain', diabetes: r.diabetes });
}

export function weightGainReport(r: WeightGainResult, input: WeightGainInput, patientInfo?: PatientCalculatorInfo, days?: DayPlan[] | null): CalculatorReport {
  return {
    calculatorId: 'weightgain',
    calculatorName: 'Weight gain plan',
    inputs: presentFields([
      field('Current weight', r.currentWeight, 'kg'), field('Target weight', r.targetWeight, 'kg'),
      field('Height', input.heightCm, 'cm', 0), field('Age', input.ageYears, 'years', 0),
      { label: 'Sex', value: input.sex === 'male' ? 'Male' : 'Female' },
      { label: 'Activity', value: GAIN_ACTIVITY[input.activityLevel].label },
      { label: 'Rate', value: `${GAIN_RATES[input.rate].label} (${GAIN_RATES[input.rate].kgPerWeek} kg/week)` },
      { label: 'Malnourished', value: yesNo(input.malnourished) },
      { label: 'Post-surgery', value: yesNo(input.postSurgery) },
      { label: 'Chronic disease', value: yesNo(input.chronicDisease) },
    ]),
    results: [
      field('To gain', r.weightChange, 'kg'),
      { label: 'BMI', value: `${r.currentBMI} now → ${r.targetBMI} at target` },
      field('BMR (Mifflin-St Jeor)', r.bmr, 'kcal/day', 0),
      field('Maintenance (TDEE)', r.tdee, 'kcal/day', 0),
      field('Daily surplus', Math.abs(r.dailyDeficit), 'kcal', 0),
      field('Target intake', r.targetCalories, 'kcal/day', 0),
      field('Protein', r.proteinTarget, 'g/day', 0),
      { label: 'Timeline', value: `${r.weeksNeeded} weeks (about ${r.monthsNeeded} months) at ${r.weeklyRate} kg/week` },
      { label: 'Refeeding risk', value: r.refeedingLevel.replace('_', ' ') },
    ],
    notes: r.warnings,
    plan: emptyPlan({
      monitoring: r.refeedingAlerts,
      sections: sections(
        section('Warnings', r.warnings, 'warn'),
        r.refeedingDays.length
          ? section('Refeeding schedule (build up to the target)', r.refeedingDays.map(d => `Day ${d.day}: ${d.kcal} kcal (${d.kcalPerKg} kcal/kg)`), 'danger')
          : null,
        section('Medical considerations', r.medicalConsiderations, r.medicalConsiderations.length ? 'warn' : undefined),
        section('Foods to prioritise', r.dietarySuggestions.toEat),
        section('High-calorie meal ideas', r.dietarySuggestions.highCalorieMeals ?? []),
        section('Eating strategies', r.dietarySuggestions.mealTiming),
        section('Supplements', r.supplements ?? []),
        section('Exercise', r.exerciseRecommendations),
        section('Milestones', r.milestones.map(m => `${m.weight} kg — ${m.achievement}`)),
        ...(days == null ? [] : days.length ? mealPlanSections(days) : [section('Seven-day meal plan', [NO_PLAN_MESSAGE])]),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo, {
      weightKg: r.currentWeight, heightCm: parseNum(input.heightCm), ageYears: parseNum(input.ageYears), sex: input.sex,
    }),
  };
}
