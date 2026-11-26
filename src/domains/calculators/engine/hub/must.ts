/**
 * MUST (Malnutrition Universal Screening Tool) for the /calculators hub.
 *
 * Pure: the component calls computeMust and renders the result; the report
 * builder turns the same result into the shared CalculatorReport. Step scores
 * come from the nutrition engine (mustBmiScore, mustWeightLossScore,
 * weightLossPercent) and BMI from the canonical calculateBMI.
 */
import type { MUSTResult, PatientCalculatorInfo } from '../../types';
import { calculateBMI, bmiCategory } from '../calculationEngine';
import { mustBmiScore, mustWeightLossScore, weightLossPercent } from '../../../nutrition/engine/screening';
import { emptyPlan, field, presentFields, section, sections, yesNo } from '../../report/format';
import { hasComorbidity, patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';

export interface MustInput {
  weightKg: string | number;
  heightCm: string | number;
  previousWeightKg?: string | number;
  weightLossDuration: string;
  acutelyIll: boolean;
  npoOrReduced: boolean;
  comorbidities?: string[];
}

export interface MustComputed extends MUSTResult {
  bmi: number;
  bmiCategory: string;
  weightLossPercent: number | null;
}

export type MustOutcome = { result: MustComputed } | { errors: string[] };

const toNum = (v: string | number | undefined): number | null => {
  if (v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function validateMust(input: MustInput): string[] {
  const errors: string[] = [];
  const w = toNum(input.weightKg), h = toNum(input.heightCm), p = toNum(input.previousWeightKg);
  if (w === null) errors.push('Enter the current weight.');
  else if (w < 20 || w > 400) errors.push('Weight should be between 20 and 400 kg.');
  if (h === null) errors.push('Enter the height.');
  else if (h < 100 || h > 250) errors.push('Height should be between 100 and 250 cm (MUST is for adults).');
  if (p !== null && (p < 20 || p > 400)) errors.push('Previous weight should be between 20 and 400 kg, or left blank.');
  return errors;
}

export function computeMust(input: MustInput): MustOutcome {
  const errors = validateMust(input);
  if (errors.length) return { errors };
  const weight = toNum(input.weightKg)!;
  const heightCm = toNum(input.heightCm)!;
  const prev = toNum(input.previousWeightKg);
  const hasPrevWeight = prev !== null && prev > 0;

  const bmi = calculateBMI(weight, heightCm)!;
  const bmiScore = mustBmiScore(bmi);

  // A weight GAIN is not unplanned weight loss and scores 0.
  const lossPct = hasPrevWeight ? weightLossPercent(prev, weight) : null;
  const weightLossScore = lossPct === null ? 0 : mustWeightLossScore(lossPct);
  const acuteDiseaseScore = input.acutelyIll && input.npoOrReduced ? 2 : 0;
  const totalScore = bmiScore + weightLossScore + acuteDiseaseScore;

  let riskCategory: 'Low' | 'Medium' | 'High';
  let managementPlan: string[];
  let monitoringFrequency: string;
  let dietaryRecommendations: string[];
  let supplementRecommendations: string[] = [];

  if (totalScore === 0) {
    riskCategory = 'Low';
    monitoringFrequency = 'Weekly in hospital, Monthly in community, Annually if outpatient';
    managementPlan = [
      'Routine clinical care',
      'Repeat screening: Weekly (hospital), Monthly (care homes), Annually (outpatients)',
      'Encourage healthy, balanced diet',
      'Document nutritional status in notes',
    ];
    dietaryRecommendations = [
      'Maintain regular meal patterns (3 meals + 2-3 snacks)',
      'Include protein with each meal',
      'Encourage fruits and vegetables',
      'Adequate fluid intake (2-3L daily)',
    ];
  } else if (totalScore === 1) {
    riskCategory = 'Medium';
    monitoringFrequency = 'Weekly in all settings';
    managementPlan = [
      'Observe and document dietary intake for 3 days',
      'If intake adequate: Repeat screening weekly (hospital), monthly (community)',
      'If intake inadequate: Follow High Risk protocol',
      'Consider food fortification strategies',
      'Set achievable goals for improvement',
    ];
    dietaryRecommendations = [
      'Fortify foods (add butter, cream, cheese to meals)',
      'High-protein, high-energy snacks between meals',
      'Nourishing drinks (milky drinks, smoothies)',
      'Smaller, more frequent meals if appetite poor',
      'Consider local high-energy foods: Groundnuts, palm oil-enriched dishes',
    ];
    supplementRecommendations = [
      'Consider oral nutritional supplements if dietary measures insufficient',
      'Multivitamin supplementation',
    ];
  } else {
    riskCategory = 'High';
    monitoringFrequency = 'Every 2-3 days initially, then weekly';
    managementPlan = [
      '⚠️ REFER TO DIETITIAN/NUTRITION TEAM',
      'Implement high-energy, high-protein diet immediately',
      'Oral nutritional supplements (ONS) - 2-3 per day',
      'Consider nasogastric feeding if oral intake <50% requirements',
      'Address underlying causes (pain, infection, swallowing difficulties)',
      'Weekly weight monitoring',
      'Document comprehensive nutritional care plan',
      'Review and update care plan every 2-3 days',
    ];
    dietaryRecommendations = [
      '⚡ High-energy, high-protein diet essential',
      'Food fortification (add oils, butter, milk powder to foods)',
      'Protein supplements: 1.2-1.5g protein/kg body weight daily',
      'Small, frequent meals (6-8 times daily)',
      'Nourishing fluids instead of tea/water',
      'Locally available energy-dense foods: groundnut soup, palm oil dishes, beans and plantain, ogi enriched with soybeans, eggs, fish and meat when available',
    ];
    supplementRecommendations = [
      '1st Line: Oral Nutritional Supplements (ONS) 2-3 per day',
      'Plumpy\'nut or therapeutic foods if available',
      'Multivitamin + Zinc supplementation',
      'Iron if anaemic',
      'Consider NG tube feeding if oral intake <50% for >5 days',
      'Vitamin D 800-1000 IU daily',
    ];
  }

  const info = { comorbidities: input.comorbidities ?? [] };
  const additionalConsiderations: string[] = [];
  if (hasComorbidity(info, /diabet/i)) {
    additionalConsiderations.push('Diabetes present: Monitor glucose with nutritional supplements. May need diabetes-specific ONS.');
  }
  if (hasComorbidity(info, /kidney|renal|ckd/i)) {
    additionalConsiderations.push('CKD present: Protein restriction may be needed (0.6-0.8g/kg in pre-dialysis). Consult renal dietitian.');
  }
  if (hasComorbidity(info, /heart failure/i)) {
    additionalConsiderations.push('Heart failure present: Fluid restriction may apply. Monitor sodium intake.');
  }
  if (input.acutelyIll) {
    additionalConsiderations.push('Acute illness: Increased metabolic demands. May need 25-35 kcal/kg/day.');
  }

  const estimatedCalories = Math.round((riskCategory === 'High' ? 35 : 30) * weight);
  const estimatedProtein = Math.round((riskCategory === 'High' ? 1.5 : 1.0) * weight);

  return {
    result: {
      bmi,
      bmiCategory: bmiCategory(bmi),
      weightLossPercent: lossPct,
      bmiScore,
      weightLossScore,
      acuteIllnessScore: acuteDiseaseScore,
      totalScore,
      riskLevel: riskCategory === 'High' ? 'high' : riskCategory === 'Medium' ? 'medium' : 'low',
      riskCategory,
      recommendations: managementPlan,
      referralNeeded: riskCategory === 'High',
      nutritionalPlan: dietaryRecommendations,
      managementPlan,
      monitoringFrequency,
      dietaryRecommendations,
      supplementRecommendations,
      additionalConsiderations,
      estimatedCalories,
      estimatedProtein,
      scoreBreakdown: {
        bmi: `BMI ${bmi.toFixed(1)} kg/m² → Score ${bmiScore}`,
        weightLoss: lossPct === null
          ? 'No previous weight recorded — weight-loss step not assessed (scored 0, so the total is a minimum)'
          : lossPct < 0
            ? `Weight GAIN ${Math.abs(lossPct).toFixed(1)}% over ${input.weightLossDuration} → Score 0 (not unplanned loss)`
            : `Weight loss ${lossPct.toFixed(1)}% over ${input.weightLossDuration} → Score ${weightLossScore}`,
        acuteDisease: acuteDiseaseScore ? 'Acutely ill with reduced/no intake → Score 2' : 'No acute disease effect → Score 0',
      },
    },
  };
}

export function mustReport(r: MustComputed, input: MustInput, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  const strip = (s: string) => s.replace(/^[⚠️⚡\s]+/u, '').trim();
  return {
    calculatorId: 'must',
    calculatorName: 'MUST malnutrition screening',
    inputs: presentFields([
      field('Weight', input.weightKg, 'kg'),
      field('Height', input.heightCm, 'cm', 0),
      field('Previous weight', input.previousWeightKg ?? null, 'kg'),
      { label: 'Weight-loss period', value: input.weightLossDuration },
      { label: 'Acutely ill', value: yesNo(input.acutelyIll) },
      { label: 'No intake > 5 days', value: yesNo(input.npoOrReduced) },
    ]),
    results: [
      { label: 'MUST score', value: String(r.totalScore) },
      { label: 'Risk', value: `${r.riskCategory} risk` },
      field('BMI', r.bmi, `kg/m² (${r.bmiCategory})`),
      { label: 'Step 1 (BMI)', value: String(r.scoreBreakdown?.bmi ?? '—') },
      { label: 'Step 2 (weight loss)', value: String(r.scoreBreakdown?.weightLoss ?? '—') },
      { label: 'Step 3 (acute disease)', value: String(r.scoreBreakdown?.acuteDisease ?? '—') },
      field('Estimated energy', r.estimatedCalories, 'kcal/day', 0),
      field('Estimated protein', r.estimatedProtein, 'g/day', 0),
    ],
    notes: [`Monitoring: ${r.monitoringFrequency}`],
    plan: emptyPlan({
      monitoring: r.monitoringFrequency ? [r.monitoringFrequency] : [],
      sections: sections(
        section('Management plan (steps 4 and 5)', (r.managementPlan ?? []).map(strip), r.riskCategory === 'High' ? 'warn' : undefined),
        section('Dietary recommendations', (r.dietaryRecommendations ?? []).map(strip)),
        section('Supplement recommendations', r.supplementRecommendations ?? []),
        section('Special considerations', r.additionalConsiderations ?? []),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo, { weightKg: Number(input.weightKg) || null, heightCm: Number(input.heightCm) || null }),
  };
}
