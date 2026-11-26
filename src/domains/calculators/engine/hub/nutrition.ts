/**
 * Clinical nutrition requirements for the /calculators hub.
 *
 * The arithmetic is the canonical calculateNutrition (revised
 * Harris-Benedict x activity x stress, +2% per %TBSA in burns, x1.2 when
 * malnourished, protein g/kg, macro split): the hub's inline copy was the
 * same calculation and now calls it. The seven-day plan comes from the
 * meal-plan optimiser (generateMealPlan), not a fixed list.
 */
import type { PatientCalculatorInfo } from '../../types';
import { calculateNutrition, toSex, type Sex } from '../calculationEngine';
import type { DayPlan } from '../../../../data/nigerianFoods';
import { emptyPlan, field, presentFields, section, sections, yesNo } from '../../report/format';
import { hasComorbidity, patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';
import { mealPlanSections } from '../../../clinician-assistant/services/bedsideReports';
import { NO_PLAN_MESSAGE, parseNum, sevenDayPlan, validateBody } from './nutritionCommon';

export const ACTIVITY_FACTORS: Record<string, { label: string; factor: number; description: string }> = {
  bedridden: { label: 'Bedridden', factor: 1.2, description: 'Completely bedridden, minimal movement' },
  ambulatory: { label: 'Ambulatory', factor: 1.3, description: 'Can walk around room/ward' },
  light: { label: 'Light Activity', factor: 1.4, description: 'Light daily activities' },
  moderate: { label: 'Moderate Activity', factor: 1.5, description: 'Regular moderate exercise' },
  active: { label: 'Very Active', factor: 1.7, description: 'Heavy physical activity' },
};

export const STRESS_FACTORS: Record<string, { label: string; factor: number; description: string }> = {
  none: { label: 'None/Minimal', factor: 1.0, description: 'No significant stress' },
  mild: { label: 'Mild Stress', factor: 1.1, description: 'Minor surgery, mild infection' },
  moderate: { label: 'Moderate Stress', factor: 1.25, description: 'Major surgery, moderate infection' },
  severe: { label: 'Severe Stress', factor: 1.5, description: 'Sepsis, major trauma' },
  burns: { label: 'Burns/Critical', factor: 1.75, description: 'Major burns, critical illness' },
};

export interface NutritionHubInput {
  weightKg: string | number;
  heightCm: string | number;
  ageYears: string | number;
  sex: Sex;
  activityLevel: string;
  stressFactor: string;
  woundHealing: boolean;
  burns: boolean;
  burnsTBSA: string | number;
  sepsis: boolean;
  postSurgery: boolean;
  renalDisease: boolean;
  liverDisease: boolean;
  malnourished: boolean;
  /** From the patient's comorbidity list. */
  diabetes: boolean;
}

export interface NutritionHubResult {
  bmr: number;
  mifflinBmr: number;
  tdee: number;
  activityFactor: number;
  stressMultiplier: number;
  proteinNeeds: number;
  proteinFactor: number;
  proteinRationale: string;
  carbNeeds: number;
  fatNeeds: number;
  fluidNeeds: number;
  fluidRationale: string;
  /** Set when the fluid figure is the burns resuscitation volume. */
  fluidCaution: string | null;
  micronutrients: string[];
  highProteinOptions: string[];
  caloricBoosters: string[];
  specialConsiderations: string[];
  macroBreakdown: {
    protein: { grams: number; calories: number; percentage: number };
    carbs: { grams: number; calories: number; percentage: number };
    fat: { grams: number; calories: number; percentage: number };
  };
  diabetes: boolean;
  renal: boolean;
}

export type NutritionHubOutcome = { result: NutritionHubResult } | { errors: string[] };

export function computeNutritionHub(input: NutritionHubInput): NutritionHubOutcome {
  const errors: string[] = [];
  const body = validateBody(input, errors);
  const tbsa = parseNum(input.burnsTBSA);
  if (input.burns && tbsa === null) errors.push('Burns is ticked: enter the burned area (% TBSA), or untick it.');
  else if (input.burns && tbsa !== null && (tbsa <= 0 || tbsa > 100)) errors.push('Burned area must be between 1 and 100% TBSA.');
  if (!ACTIVITY_FACTORS[input.activityLevel]) errors.push('Choose an activity level.');
  if (!STRESS_FACTORS[input.stressFactor]) errors.push('Choose a stress factor.');
  if (errors.length || !body) return { errors };

  const { weightKg, heightCm, ageYears } = body;
  const activityFactor = ACTIVITY_FACTORS[input.activityLevel].factor;
  const burnsTBSA = input.burns ? tbsa! : undefined;

  let proteinFactor = 1.0;
  let proteinRationale = 'Standard adult requirement';
  if (input.woundHealing) { proteinFactor = 1.5; proteinRationale = 'Wound healing - increased protein synthesis'; }
  if (input.burns) { proteinFactor = 2.0; proteinRationale = 'Major burns - high catabolic state'; }
  if (input.sepsis) { proteinFactor = 1.5; proteinRationale = 'Sepsis - protein catabolism'; }
  if (input.postSurgery) { proteinFactor = Math.max(proteinFactor, 1.25); proteinRationale = 'Post-surgical recovery'; }
  if (input.renalDisease) {
    proteinFactor = 0.8;
    proteinRationale = 'CKD - protein restriction (pre-dialysis). Dialysis patients may need 1.2 g/kg';
  }

  const n = calculateNutrition({
    weightKg, heightCm, ageYears, sex: input.sex,
    activityFactor,
    stressFactor: STRESS_FACTORS[input.stressFactor].factor,
    proteinFactor,
    burnsTBSA,
    malnourished: input.malnourished,
  });
  const stressMultiplier = burnsTBSA ? 1 + burnsTBSA * 0.02 : STRESS_FACTORS[input.stressFactor].factor;

  const fluidRationale = burnsTBSA
    ? `Burns: Parkland 4 mL/kg/%TBSA (first 24 h of resuscitation) + 30 mL/kg maintenance`
    : 'Standard hydration: 30 mL/kg/day';
  const fluidCaution = burnsTBSA
    ? 'This is a first-24-hour resuscitation volume using the classic Parkland 4 mL/kg/%TBSA. The Burns calculator sets resuscitation fluids (and may start lower, at 2 mL/kg/%TBSA); use it for the resuscitation, then plan maintenance plus losses. Do not give this figure every day.'
    : null;

  const micronutrients: string[] = [];
  if (input.woundHealing || input.burns) {
    micronutrients.push('Vitamin C: 500-1000mg daily (wound healing)');
    micronutrients.push('Zinc: 25-40mg daily (tissue repair)');
    micronutrients.push('Vitamin A: 10,000 IU daily (epithelialization)');
  }
  if (input.malnourished) {
    micronutrients.push('Multivitamin/mineral supplement daily');
    micronutrients.push('Iron: 60mg elemental iron if anemic');
    micronutrients.push('Vitamin B complex');
  }
  micronutrients.push('Vitamin D: 800-1000 IU daily (general)');

  const specialConsiderations: string[] = [];
  if (input.renalDisease) {
    specialConsiderations.push('Limit potassium-rich foods (bananas, oranges, tomatoes)');
    specialConsiderations.push('Limit phosphorus (dairy, beans, nuts)');
    specialConsiderations.push('Consider renal dietitian referral');
  }
  if (input.liverDisease) {
    specialConsiderations.push('Small, frequent meals');
    specialConsiderations.push('Adequate protein despite cirrhosis (except encephalopathy)');
    specialConsiderations.push('Salt restriction if ascites present');
  }
  if (input.diabetes) {
    specialConsiderations.push('Carbohydrate counting/control');
    specialConsiderations.push('Prefer low glycemic index foods');
    specialConsiderations.push('Distribute carbs evenly throughout day');
  }
  if (input.malnourished) {
    specialConsiderations.push('Malnourished: assess refeeding-syndrome risk before feeding to the full target (NICE CG32) — start low and build up over several days with daily electrolytes.');
  }

  const pct = (kcal: number) => (n.tdee > 0 ? Math.round((kcal / n.tdee) * 100) : 0);
  const fatCal = n.fatGrams * 9, carbCal = n.carbGrams * 4;

  return {
    result: {
      bmr: n.bmr,
      mifflinBmr: n.mifflinBmr,
      tdee: n.tdee,
      activityFactor,
      stressMultiplier,
      proteinNeeds: n.proteinGramsPerDay,
      proteinFactor,
      proteinRationale,
      carbNeeds: n.carbGrams,
      fatNeeds: n.fatGrams,
      fluidNeeds: n.fluidMlPerDay,
      fluidRationale,
      fluidCaution,
      micronutrients,
      highProteinOptions: [
        'Eggs (2 large): 12g protein, 140 kcal',
        'Dried fish (50g): 35g protein, 170 kcal',
        'Grilled chicken (100g): 25g protein, 165 kcal',
        'Beans/cowpeas (1 cup cooked): 15g protein, 220 kcal',
        'Groundnuts (50g): 13g protein, 280 kcal',
        'Powdered milk (30g): 8g protein, 150 kcal',
        'Wara/Awara (tofu, 100g): 8g protein, 76 kcal',
      ],
      caloricBoosters: [
        'Add palm oil to soups for extra calories',
        'Use groundnut paste in cooking',
        input.diabetes ? 'Prefer unsweetened drinks (diabetes)' : 'Add honey or sugar to beverages',
        'Include avocado (healthy fats)',
        'Fortify pap with milk and egg',
      ],
      specialConsiderations,
      macroBreakdown: {
        protein: { grams: n.proteinGramsPerDay, calories: n.proteinCalories, percentage: pct(n.proteinCalories) },
        carbs: { grams: n.carbGrams, calories: carbCal, percentage: pct(carbCal) },
        fat: { grams: n.fatGrams, calories: fatCal, percentage: pct(fatCal) },
      },
      diabetes: input.diabetes,
      renal: input.renalDisease,
    },
  };
}

/** The seven-day plan against the computed energy and protein. */
export function nutritionHubDays(r: NutritionHubResult): DayPlan[] {
  return sevenDayPlan(r.tdee, r.proteinNeeds, { goal: 'maintain', diabetes: r.diabetes, ckd: r.renal });
}

export function nutritionHubInputFromPatient(info: PatientCalculatorInfo) {
  return { sex: toSex(info.gender), diabetes: hasComorbidity(info, /diabet/i), renal: hasComorbidity(info, /kidney|renal|ckd/i) };
}

export function nutritionHubReport(
  r: NutritionHubResult, input: NutritionHubInput, patientInfo?: PatientCalculatorInfo, days?: DayPlan[] | null,
): CalculatorReport {
  const conditions = [
    input.woundHealing && 'Wound healing', input.postSurgery && 'Post-surgery', input.sepsis && 'Sepsis/infection',
    input.malnourished && 'Malnourished', input.renalDisease && 'Renal disease', input.liverDisease && 'Liver disease',
    input.burns && `Burns ${parseNum(input.burnsTBSA)}% TBSA`, input.diabetes && 'Diabetes',
  ].filter((x): x is string => typeof x === 'string');
  return {
    calculatorId: 'nutrition',
    calculatorName: 'Clinical nutrition requirements',
    inputs: presentFields([
      field('Weight', input.weightKg, 'kg'), field('Height', input.heightCm, 'cm', 0), field('Age', input.ageYears, 'years', 0),
      { label: 'Sex', value: input.sex === 'male' ? 'Male' : 'Female' },
      { label: 'Activity', value: `${ACTIVITY_FACTORS[input.activityLevel].label} (×${r.activityFactor})` },
      { label: 'Stress', value: `${STRESS_FACTORS[input.stressFactor].label} (×${r.stressMultiplier.toFixed(2)})` },
      { label: 'Conditions', value: conditions.length ? conditions.join(', ') : 'None' },
      { label: 'Malnourished (+20%)', value: yesNo(input.malnourished) },
    ]),
    results: [
      field('BMR (Harris-Benedict, revised)', r.bmr, 'kcal/day', 0),
      field('BMR (Mifflin-St Jeor, for comparison)', r.mifflinBmr, 'kcal/day', 0),
      field('Total daily energy', r.tdee, 'kcal/day', 0),
      { label: 'Protein', value: `${r.proteinNeeds} g/day (${r.proteinFactor} g/kg)` },
      { label: 'Carbohydrate', value: `${r.carbNeeds} g/day (${r.macroBreakdown.carbs.percentage}%)` },
      { label: 'Fat', value: `${r.fatNeeds} g/day (${r.macroBreakdown.fat.percentage}%)` },
      field('Fluid', r.fluidNeeds, 'mL/day', 0),
    ],
    notes: [r.proteinRationale, r.fluidRationale],
    plan: emptyPlan({
      sections: sections(
        r.fluidCaution ? section('Burns fluid — read before use', [r.fluidCaution], 'warn') : null,
        section('Special dietary considerations', r.specialConsiderations, r.specialConsiderations.length ? 'warn' : undefined),
        section('Micronutrients', r.micronutrients),
        section('High-protein food options', r.highProteinOptions),
        section('Calorie boosters', r.caloricBoosters),
        ...(days == null ? [] : days.length ? mealPlanSections(days) : [section('Seven-day meal plan', [NO_PLAN_MESSAGE])]),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo, {
      weightKg: parseNum(input.weightKg), heightCm: parseNum(input.heightCm), ageYears: parseNum(input.ageYears), sex: input.sex,
    }),
  };
}
