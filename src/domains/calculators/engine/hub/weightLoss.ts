/**
 * Weight-loss planning for the /calculators hub.
 *
 * BMR is the canonical Mifflin-St Jeor (calculateMifflinStJeorBMR), the same
 * equation the hub's inline copy used. The calorie floor (1500 kcal men,
 * 1200 women) is applied as before, but the timeline now follows the deficit
 * actually prescribed: when the floor cuts the deficit, the weekly rate and
 * the weeks needed say so instead of promising the rate that was asked for.
 */
import type { PatientCalculatorInfo, WeightManagementResult } from '../../types';
import { calculateBMI, calculateMifflinStJeorBMR, type Sex } from '../calculationEngine';
import type { DayPlan } from '../../../../data/nigerianFoods';
import { emptyPlan, field, presentFields, section, sections } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';
import { mealPlanSections } from '../../../clinician-assistant/services/bedsideReports';
import { NO_PLAN_MESSAGE, parseNum, sevenDayPlan, validateBody } from './nutritionCommon';

export const LOSS_ACTIVITY: Record<string, { label: string; factor: number }> = {
  sedentary: { label: 'Sedentary (little/no exercise)', factor: 1.2 },
  light: { label: 'Light (1-3 days/week)', factor: 1.375 },
  moderate: { label: 'Moderate (3-5 days/week)', factor: 1.55 },
  active: { label: 'Active (6-7 days/week)', factor: 1.725 },
  veryActive: { label: 'Very Active (twice/day)', factor: 1.9 },
};

export const LOSS_RATES: Record<string, { label: string; kgPerWeek: number; description: string }> = {
  slow: { label: 'Slow & Steady', kgPerWeek: 0.25, description: '0.25 kg/week - Most sustainable' },
  moderate: { label: 'Moderate', kgPerWeek: 0.5, description: '0.5 kg/week - Recommended' },
  fast: { label: 'Faster', kgPerWeek: 0.75, description: '0.75 kg/week - Requires dedication' },
  aggressive: { label: 'Aggressive', kgPerWeek: 1.0, description: '1 kg/week - Medical supervision advised' },
};

const KCAL_PER_KG = 7700;

export interface WeightLossInput {
  currentWeightKg: string | number;
  targetWeightKg: string | number;
  heightCm: string | number;
  ageYears: string | number;
  sex: Sex;
  activityLevel: string;
  rate: string;
  diabetes: boolean;
  hypertension: boolean;
}

export interface WeightHubResult extends WeightManagementResult {
  /** The deficit the rate asked for, before the calorie floor. */
  requestedDailyDeficit: number;
  /** False when the floor leaves no deficit at this activity level. */
  timelineAchievable: boolean;
  diabetes: boolean;
}

export type WeightLossOutcome = { result: WeightHubResult } | { errors: string[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Months from weeks, never 0 for a non-zero number of weeks. */
export const monthsFromWeeks = (weeks: number) => (weeks > 0 ? Math.max(0.5, Math.round((weeks / 4.345) * 2) / 2) : 0);

export function computeWeightLoss(input: WeightLossInput): WeightLossOutcome {
  const errors: string[] = [];
  const body = validateBody({ weightKg: input.currentWeightKg, heightCm: input.heightCm, ageYears: input.ageYears }, errors);
  const target = parseNum(input.targetWeightKg);
  if (target === null) errors.push('Enter the target weight.');
  else if (target < 30 || target > 400) errors.push('Target weight should be between 30 and 400 kg.');
  else if (body && target >= body.weightKg) errors.push('Target weight must be less than the current weight for weight loss.');
  if (!LOSS_ACTIVITY[input.activityLevel]) errors.push('Choose an activity level.');
  if (!LOSS_RATES[input.rate]) errors.push('Choose a rate of loss.');
  if (errors.length || !body || target === null) return { errors };

  const { weightKg: current, heightCm, ageYears } = body;
  const heightM = heightCm / 100;
  const currentBMI = calculateBMI(current, heightCm)!;
  const targetBMI = calculateBMI(target, heightCm)!;
  const idealWeight = round1(22 * heightM * heightM); // BMI 22

  const bmr = calculateMifflinStJeorBMR(input.sex, current, heightCm, ageYears);
  const tdee = bmr * LOSS_ACTIVITY[input.activityLevel].factor;

  const weightToLose = round1(current - target);
  const requestedRate = LOSS_RATES[input.rate].kgPerWeek;
  const requestedDailyDeficit = Math.round((requestedRate * KCAL_PER_KG) / 7);
  const floor = input.sex === 'male' ? 1500 : 1200;
  const targetCalories = Math.max(Math.round(tdee - requestedDailyDeficit), floor);

  // The deficit actually prescribed once the floor is applied, and the rate
  // and timeline that follow from it.
  const dailyDeficit = Math.max(0, Math.round(tdee) - targetCalories);
  const weeklyRate = Math.round(((dailyDeficit * 7) / KCAL_PER_KG) * 100) / 100;
  const timelineAchievable = dailyDeficit > 0;
  const weeksNeeded = timelineAchievable ? Math.ceil(weightToLose / ((dailyDeficit * 7) / KCAL_PER_KG)) : 0;
  const monthsNeeded = monthsFromWeeks(weeksNeeded);

  const proteinTarget = Math.round(1.8 * target);

  const exerciseRecommendations: string[] = [];
  if (currentBMI >= 40) {
    exerciseRecommendations.push('Start with low-impact activities (swimming, water aerobics)');
    exerciseRecommendations.push('Walking: Start with 10 minutes, build to 30 minutes daily');
    exerciseRecommendations.push('Chair exercises if mobility limited');
  } else if (currentBMI >= 30) {
    exerciseRecommendations.push('Walking: 30-45 minutes, 5 days/week');
    exerciseRecommendations.push('Low-impact cardio: cycling, swimming');
    exerciseRecommendations.push('Resistance training 2-3 times/week');
  } else {
    exerciseRecommendations.push('Moderate cardio: 150-300 minutes/week');
    exerciseRecommendations.push('HIIT: 2-3 sessions/week');
    exerciseRecommendations.push('Strength training: 3-4 times/week');
  }
  exerciseRecommendations.push('Daily target: 8,000-10,000 steps');
  exerciseRecommendations.push('Include flexibility work (stretching, yoga)');

  const dietarySuggestions = {
    toEat: [
      'Vegetables: Efo riro, edikaikong, vegetable soup (portion-controlled)',
      'Lean proteins: Grilled fish, chicken (skinless), turkey',
      'Complex carbs: Ofada rice, beans, unripe plantain (in moderation)',
      'Fruits: Oranges, pawpaw, watermelon, garden eggs',
      'Healthy fats: Groundnuts (small portions), avocado',
      'Protein-rich: Eggs, moi-moi (steamed, not fried)',
    ],
    toLimit: [
      'Fried foods: Puff-puff, akara, fried plantain',
      'White carbs: White rice, eba, pounded yam (reduce portions)',
      'Sugary drinks: Soft drinks, malt, sweetened zobo',
      'Palm oil: Use sparingly',
      'Fried meat/fish',
      'Snacks: Chin-chin, biscuits, cakes',
    ],
    mealTiming: [
      'Eat breakfast within 1-2 hours of waking',
      'Have largest meal at lunch if possible',
      'Light dinner, at least 3 hours before bed',
      'Avoid late-night eating',
      'Stay hydrated - 8-10 glasses of water daily',
    ],
  };

  const medicalConsiderations: string[] = [];
  if (currentBMI >= 40) {
    medicalConsiderations.push('Class III Obesity - Consider bariatric surgery evaluation');
    medicalConsiderations.push('Screen for: Diabetes, hypertension, sleep apnea');
  } else if (currentBMI >= 35) {
    medicalConsiderations.push('Class II Obesity - Medical supervision recommended');
    medicalConsiderations.push('Screen for metabolic syndrome');
  }
  if (input.diabetes) medicalConsiderations.push('Diabetes: Adjust medications as weight decreases. Monitor glucose closely.');
  if (input.hypertension) medicalConsiderations.push('Hypertension: May need medication adjustments as weight decreases.');
  if (dailyDeficit > 750) medicalConsiderations.push('Aggressive deficit - Regular medical monitoring advised');

  const warnings: string[] = [];
  if (currentBMI < 25) warnings.push('BMI already in healthy range - weight loss may not be necessary');
  if (targetBMI < 18.5) warnings.push(`Target BMI ${targetBMI} is underweight — choose a higher target.`);
  if (!timelineAchievable) {
    warnings.push(`Maintenance energy at this activity level (${Math.round(tdee)} kcal) is at or below the ${floor} kcal minimum intake, so diet alone gives no deficit. Increase activity, or plan with a dietitian under medical supervision.`);
  } else if (dailyDeficit < requestedDailyDeficit) {
    warnings.push(`The ${floor} kcal minimum intake limits the deficit to ${dailyDeficit} kcal/day (the ${requestedRate} kg/week rate needs ${requestedDailyDeficit}). The timeline uses the achievable ${weeklyRate} kg/week.`);
  }

  const milestones = [
    { weight: Math.round(current * 0.95), achievement: '5% loss - Metabolic improvements begin' },
    { weight: Math.round(current * 0.90), achievement: '10% loss - Significant health benefits' },
    { weight: Math.round(current * 0.85), achievement: '15% loss - Major risk reduction' },
    { weight: target, achievement: 'Target reached!' },
  ].filter(m => m.weight >= target);

  return {
    result: {
      direction: 'loss',
      currentWeight: current,
      targetWeight: target,
      currentBMI,
      targetBMI,
      idealWeight,
      weightChange: weightToLose,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      dailyDeficit,
      requestedDailyDeficit,
      proteinTarget,
      weeksNeeded,
      monthsNeeded,
      weeklyRate,
      timelineAchievable,
      exerciseRecommendations,
      dietarySuggestions,
      medicalConsiderations,
      milestones,
      warnings,
      diabetes: input.diabetes,
    },
  };
}

export function weightLossDays(r: WeightHubResult): DayPlan[] {
  return sevenDayPlan(r.targetCalories, r.proteinTarget, { goal: 'loss', diabetes: r.diabetes });
}

export function weightLossReport(r: WeightHubResult, input: WeightLossInput, patientInfo?: PatientCalculatorInfo, days?: DayPlan[] | null): CalculatorReport {
  return {
    calculatorId: 'weightloss',
    calculatorName: 'Weight loss plan',
    inputs: presentFields([
      field('Current weight', r.currentWeight, 'kg'), field('Target weight', r.targetWeight, 'kg'),
      field('Height', input.heightCm, 'cm', 0), field('Age', input.ageYears, 'years', 0),
      { label: 'Sex', value: input.sex === 'male' ? 'Male' : 'Female' },
      { label: 'Activity', value: LOSS_ACTIVITY[input.activityLevel].label },
      { label: 'Requested rate', value: LOSS_RATES[input.rate].description },
    ]),
    results: [
      field('To lose', r.weightChange, 'kg'),
      { label: 'BMI', value: `${r.currentBMI} now → ${r.targetBMI} at target` },
      field('BMR (Mifflin-St Jeor)', r.bmr, 'kcal/day', 0),
      field('Maintenance (TDEE)', r.tdee, 'kcal/day', 0),
      field('Daily deficit', r.dailyDeficit, 'kcal', 0),
      field('Target intake', r.targetCalories, 'kcal/day', 0),
      field('Protein', r.proteinTarget, 'g/day', 0),
      r.timelineAchievable
        ? { label: 'Timeline', value: `${r.weeksNeeded} weeks (about ${r.monthsNeeded} months) at ${r.weeklyRate} kg/week` }
        : { label: 'Timeline', value: 'Not achievable by diet alone at this activity level' },
    ],
    notes: r.warnings,
    plan: emptyPlan({
      sections: sections(
        section('Warnings', r.warnings, 'warn'),
        section('Medical considerations', r.medicalConsiderations, r.medicalConsiderations.length ? 'warn' : undefined),
        section('Exercise', r.exerciseRecommendations),
        section('Foods to eat', r.dietarySuggestions.toEat),
        section('Foods to limit', r.dietarySuggestions.toLimit),
        section('Meal timing', r.dietarySuggestions.mealTiming),
        section('Milestones', r.milestones.map(m => `${m.weight} kg — ${m.achievement}`)),
        ...(days == null ? [] : days.length ? mealPlanSections(days) : [section('Seven-day meal plan', [NO_PLAN_MESSAGE])]),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo, {
      weightKg: r.currentWeight, heightCm: parseNum(input.heightCm), ageYears: parseNum(input.ageYears), sex: input.sex,
    }),
  };
}
