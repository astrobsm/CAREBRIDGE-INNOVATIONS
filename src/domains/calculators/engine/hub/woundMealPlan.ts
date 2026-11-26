/**
 * Wound-healing nutrition for the /calculators hub.
 *
 * BMR is the canonical Mifflin-St Jeor (the equation the hub already used),
 * times activity and a wound factor. The seven-day plan comes from the
 * meal-plan optimiser against the computed energy and protein, honouring
 * diabetes and CKD; the fixed seven-day menu it replaces did not change with
 * the targets at all.
 */
import type { PatientCalculatorInfo } from '../../types';
import { calculateMifflinStJeorBMR, type Sex } from '../calculationEngine';
import type { DayPlan } from '../../../../data/nigerianFoods';
import { emptyPlan, field, presentFields, section, sections, yesNo } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';
import { mealPlanSections } from '../../../clinician-assistant/services/bedsideReports';
import { NO_PLAN_MESSAGE, parseNum, sevenDayPlan, validateBody } from './nutritionCommon';

export const WOUND_TYPES = [
  'Surgical wound',
  'Pressure ulcer',
  'Diabetic foot ulcer',
  'Venous leg ulcer',
  'Burn wound',
  'Trauma/Laceration',
  'Chronic wound (>4 weeks)',
  'Skin graft donor site',
];

const ACTIVITY: Record<string, number> = { bedridden: 1.2, sedentary: 1.3, ambulatory: 1.4, active: 1.55 };

export interface WoundMealInput {
  weightKg: string | number;
  heightCm: string | number;
  ageYears: string | number;
  sex: Sex;
  woundType: string;
  woundSize: 'small' | 'medium' | 'large';
  woundDepth: 'superficial' | 'partial' | 'full';
  healingStage: 'inflammatory' | 'proliferative' | 'remodeling';
  activityLevel: string;
  diabetic: boolean;
  pvd: boolean;
  malnourished: boolean;
  infected: boolean;
  steroids: boolean;
  /** From the patient's comorbidity list: caps nothing here, but restricts the plan and warns. */
  ckd: boolean;
}

export interface WoundMealResult {
  calorieNeeds: number;
  proteinNeeds: number;
  proteinPerKg: number;
  fluidNeeds: number;
  fluidLitres: string;
  vitaminCTarget: string;
  zincNeeds: number;
  woundGrade: string;
  healingStage: string;
  estimatedHealingTime: string;
  proteinRichFoods: string[];
  vitaminCFoods: string[];
  zincFoods: string[];
  foodsToAvoid: string[];
  supplements: string[];
  hydrationTips: string[];
  warnings: string[];
  diabetic: boolean;
  ckd: boolean;
}

export type WoundMealOutcome = { result: WoundMealResult } | { errors: string[] };

export function computeWoundMeal(input: WoundMealInput): WoundMealOutcome {
  const errors: string[] = [];
  const body = validateBody(input, errors);
  if (!input.woundType) errors.push('Select the wound type.');
  if (!(input.activityLevel in ACTIVITY)) errors.push('Choose an activity level.');
  if (errors.length || !body) return { errors };
  const { weightKg, heightCm, ageYears } = body;

  const bmr = calculateMifflinStJeorBMR(input.sex, weightKg, heightCm, ageYears);

  let woundFactor = input.woundSize === 'small' ? 1.1 : input.woundSize === 'medium' ? 1.2 : 1.5;
  if (input.woundDepth === 'full') woundFactor += 0.1;
  if (input.infected) woundFactor += 0.2;
  if (input.malnourished) woundFactor += 0.2;
  const calorieNeeds = Math.round(bmr * ACTIVITY[input.activityLevel] * woundFactor);

  let proteinPerKg = 1.2;
  if (input.woundSize === 'large') proteinPerKg = 1.5;
  if (input.woundDepth === 'full') proteinPerKg = 1.5;
  if (input.malnourished) proteinPerKg = 1.8;
  if (input.infected) proteinPerKg = 1.8;
  const proteinNeeds = Math.round(weightKg * proteinPerKg);

  const fluidNeeds = Math.round(weightKg * 35 + (input.woundSize === 'large' ? 500 : input.woundSize === 'medium' ? 250 : 0));
  const fluidLitres = (fluidNeeds / 1000).toFixed(1);

  let woundGrade = 'Moderate';
  if (input.woundSize === 'small' && input.woundDepth === 'superficial') woundGrade = 'Mild';
  if (input.woundSize === 'large' || input.woundDepth === 'full' || input.infected) woundGrade = 'Severe';

  let healingTime = woundGrade === 'Mild' ? '1-2 weeks' : woundGrade === 'Severe' ? '4-8+ weeks' : '2-4 weeks';
  if (input.diabetic || input.pvd) healingTime += ' (may be prolonged)';

  const proteinRichFoods = [
    'Eggs - Scrambled, boiled, or in dishes (7g protein each)',
    'Fish - Fresh, smoked, or dried (stockfish, ponmo) - 20g/100g',
    'Chicken - Grilled or in stews - 25g/100g',
    'Beef - Suya, stew, or pepper soup - 26g/100g',
    'Goat meat - Pepper soup, stew - 27g/100g',
    'Beans - Akara, moi-moi, porridge - 21g/100g',
    'Groundnuts - Snack or in soups - 26g/100g',
    'Milk - Fresh or powdered in pap - 3g/100ml',
    'Snails - High protein delicacy - 16g/100g',
    'Crayfish - Add to all soups - 65g/100g',
  ];
  const vitaminCFoods = [
    'Oranges - Very abundant in Nigeria',
    'Mango (seasonal) - High Vitamin C',
    'Lime/Lemon - Add to foods/drinks',
    'Guava - One of the highest Vitamin C sources',
    'Pawpaw (Papaya) - Readily available',
    'Tomatoes - Fresh or in stews',
    'Bell peppers (tatashe/rodo)',
    'Ugu (fluted pumpkin leaves)',
    'Bitter leaf and other vegetables',
    'Pineapple - Fresh or juice',
  ];
  const zincFoods = [
    'Red meat (beef, goat) - Best source',
    'Oysters/seafood (if available)',
    'Pumpkin seeds (egusi)',
    'Beans and lentils',
    'Chicken and turkey',
    'Groundnuts (peanuts)',
    'Eggs',
    'Whole grains (guinea corn, millet)',
  ];
  const foodsToAvoid = [
    'Excess sugar - impairs immune function',
    'Alcohol - delays healing',
    'Excess salt - causes fluid retention',
    'Processed foods - low nutritional value',
    'Fried foods in excess - inflammatory',
  ];
  if (input.diabetic) foodsToAvoid.push('High glycemic foods - white bread, ripe plantain, white rice in excess');
  if (input.ckd) foodsToAvoid.push('High-potassium and high-phosphate foods (bananas, oranges, tomatoes, dairy, nuts, beans) - CKD');

  const supplements = [
    'Vitamin C 500mg twice daily (1000 mg/day, the top of the 500-1000 mg target)',
    'Zinc 25mg daily',
    'Multivitamin with minerals',
  ];
  if (input.malnourished) {
    supplements.push('High-protein oral nutrition supplements if available');
    supplements.push('Iron supplementation if anemic');
  }
  if (input.diabetic) supplements.push('Consider Omega-3 fatty acids');
  if (input.steroids) supplements.push('Vitamin A supplementation (under medical supervision)');

  const hydrationTips = [
    `Drink at least ${fluidLitres} litres of fluids daily`,
    'Water is best - drink regularly throughout the day',
    'Include soups (pepper soup, egusi soup) - contribute to fluid intake',
    'Fresh fruit juices without added sugar',
    'Avoid excess caffeine (coffee, strong tea)',
    'Monitor urine color - should be light yellow',
  ];

  const warnings: string[] = [];
  if (input.diabetic) {
    warnings.push('Diabetic patient: Monitor blood glucose closely - wound healing requires good glycemic control');
    warnings.push('Target HbA1c <7% for optimal healing');
  }
  if (input.pvd) warnings.push('Peripheral vascular disease: Nutrition alone may not be sufficient - ensure adequate blood supply');
  if (input.malnourished) warnings.push('Malnourished patient: Consider enteral nutrition support if oral intake insufficient; assess refeeding risk before feeding to the full target');
  if (input.infected) warnings.push('Infected wound: Nutrition supports healing but antibiotics needed - consult physician');
  // Uses this calculation's protein (it used to read the PREVIOUS result, so
  // the warning never appeared on the first calculation).
  if (proteinNeeds > 100) warnings.push('High protein needs - ensure adequate kidney function before high protein diet');
  if (input.ckd) warnings.push(`Chronic kidney disease: ${proteinPerKg} g/kg protein (${proteinNeeds} g/day) needs nephrology agreement before use; the meal plan keeps potassium and phosphate within CKD limits.`);
  if (input.steroids) warnings.push('On steroids: healing is slower; review the need for steroids with the prescriber');

  return {
    result: {
      calorieNeeds, proteinNeeds, proteinPerKg, fluidNeeds, fluidLitres,
      vitaminCTarget: '500-1000 mg/day',
      zincNeeds: 25,
      woundGrade,
      healingStage: input.healingStage.charAt(0).toUpperCase() + input.healingStage.slice(1),
      estimatedHealingTime: healingTime,
      proteinRichFoods, vitaminCFoods, zincFoods, foodsToAvoid, supplements, hydrationTips, warnings,
      diabetic: input.diabetic, ckd: input.ckd,
    },
  };
}

export function woundMealDays(r: WoundMealResult): DayPlan[] {
  return sevenDayPlan(r.calorieNeeds, r.proteinNeeds, { goal: 'maintain', diabetes: r.diabetic, ckd: r.ckd });
}

export function woundMealHubReport(r: WoundMealResult, input: WoundMealInput, patientInfo?: PatientCalculatorInfo, days?: DayPlan[] | null): CalculatorReport {
  return {
    calculatorId: 'woundmealplan',
    calculatorName: 'Wound healing meal plan',
    inputs: presentFields([
      field('Weight', input.weightKg, 'kg'), field('Height', input.heightCm, 'cm', 0), field('Age', input.ageYears, 'years', 0),
      { label: 'Sex', value: input.sex === 'male' ? 'Male' : 'Female' },
      { label: 'Wound type', value: input.woundType },
      { label: 'Size / depth', value: `${input.woundSize} / ${input.woundDepth}` },
      { label: 'Healing stage', value: r.healingStage },
      { label: 'Activity', value: input.activityLevel },
      { label: 'Diabetes', value: yesNo(input.diabetic) }, { label: 'PVD', value: yesNo(input.pvd) },
      { label: 'Malnourished', value: yesNo(input.malnourished) }, { label: 'Infected', value: yesNo(input.infected) },
      { label: 'On steroids', value: yesNo(input.steroids) }, { label: 'CKD', value: yesNo(input.ckd) },
    ]),
    results: [
      field('Energy', r.calorieNeeds, 'kcal/day', 0),
      { label: 'Protein', value: `${r.proteinNeeds} g/day (${r.proteinPerKg} g/kg)` },
      { label: 'Fluid', value: `${r.fluidNeeds} mL/day (${r.fluidLitres} L)` },
      { label: 'Vitamin C', value: r.vitaminCTarget },
      field('Zinc', r.zincNeeds, 'mg/day', 0),
      { label: 'Wound severity', value: r.woundGrade },
      { label: 'Estimated healing', value: r.estimatedHealingTime },
    ],
    plan: emptyPlan({
      sections: sections(
        section('Clinical considerations', r.warnings, r.warnings.length ? 'warn' : undefined),
        section('Supplements', r.supplements),
        section('Hydration', r.hydrationTips),
        section('Protein-rich foods', r.proteinRichFoods),
        section('Vitamin C sources', r.vitaminCFoods),
        section('Zinc-rich foods', r.zincFoods),
        section('Foods to limit / avoid', r.foodsToAvoid),
        ...(days == null ? [] : days.length ? mealPlanSections(days) : [section('Seven-day meal plan', [NO_PLAN_MESSAGE])]),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo, {
      weightKg: parseNum(input.weightKg), heightCm: parseNum(input.heightCm), ageYears: parseNum(input.ageYears), sex: input.sex,
    }),
  };
}
