/**
 * /calculators GFR: validation, stage-keyed advice and report. The eGFR,
 * Cockcroft-Gault and CKD stage are calculationEngine.calculateGFR's own
 * (CKD-EPI 2021, race-free); nothing is re-staged here.
 */
import { calculateGFR, type CKDStage } from '../calculationEngine';
import type { PatientCalculatorInfo } from '../../types';
import { emptyPlan, field, section, sections } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport, DeterministicPlan } from '../../report/types';

export interface GfrHubInput {
  creatinine: string;
  creatinineUnit: 'mg/dL' | 'umol/L';
  age: string;
  gender: 'male' | 'female';
  weight: string;
}

export interface GfrHubResult {
  creatinine: number;
  creatinineUnit: 'mg/dL' | 'umol/L';
  ageYears: number;
  gender: 'male' | 'female';
  weightKg: number | null;
  gfrCKDEPI: number;
  /** Null when no weight was entered. */
  gfrCockcroftGault: number | null;
  ckdStage: CKDStage;
  stageDescription: string;
  recommendations: string[];
  drugDosingAdjustments: string[];
  referralCriteria: string[];
}

export type GfrCompute = { result: GfrHubResult; errors?: undefined } | { result?: undefined; errors: string[] };

const ADVICE: Record<CKDStage, { recommendations: string[]; drugs: string[]; referral: string[] }> = {
  G1: {
    recommendations: ['No specific kidney-related restrictions.', 'Manage cardiovascular risk factors.', 'Annual monitoring if diabetes or hypertension is present.', 'Maintain a healthy lifestyle.'],
    drugs: [], referral: [],
  },
  G2: {
    recommendations: ['Control blood pressure (target < 130/80 mmHg).', 'Optimise diabetes control if applicable.', 'Annual GFR and urine albumin monitoring.', 'ACE inhibitor or ARB if proteinuria is present.', 'Avoid nephrotoxins (NSAIDs, contrast, aminoglycosides).'],
    drugs: ['Most medications: no adjustment needed.', 'Metformin: monitor renal function.'],
    referral: [],
  },
  G3a: {
    recommendations: ['Refer to a nephrologist for co-management.', 'Blood pressure control (target < 130/80).', 'Electrolytes every 6 months.', 'Check PTH, calcium, phosphate, vitamin D.', 'Dietary protein 0.8 g/kg/day.', 'Avoid nephrotoxic medicines.'],
    drugs: ['Metformin: reduce the dose by 50%.', 'Gabapentin: reduce the dose.', 'Allopurinol: start at a lower dose.', 'Avoid NSAIDs.'],
    referral: [],
  },
  G3b: {
    recommendations: ['Nephrology referral essential.', 'Strict blood pressure control.', 'Monitor for anaemia (Hb, iron studies).', 'Consider erythropoietin if Hb < 10 g/dL.', 'Dietary phosphate restriction.', 'Vitamin D supplementation if deficient.', 'Prepare for possible renal replacement therapy.'],
    drugs: ['Metformin: generally avoid, or use with caution.', 'Many antibiotics: reduce the dose or frequency.', 'Digoxin: reduce the dose by 25–50%.', 'Opioids: use with caution; prefer fentanyl over morphine.', 'Avoid gadolinium contrast (NSF risk).'],
    referral: ['GFR < 45 — nephrology referral recommended.'],
  },
  G4: {
    recommendations: ['Urgent nephrology referral if not already followed.', 'Discuss renal replacement therapy options.', 'Consider AV fistula creation if dialysis is likely.', 'Transplant work-up if an appropriate candidate.', 'Strict fluid and electrolyte management.', 'Phosphate binders may be needed.', 'Erythropoietin for anaemia.', 'Avoid potassium-sparing diuretics.'],
    drugs: ['Metformin: contraindicated.', 'Most renally cleared drugs: significant dose reduction.', 'Avoid NSAIDs and aminoglycosides.', 'Morphine: avoid (active metabolites accumulate).', 'Enoxaparin: avoid or reduce the dose significantly.'],
    referral: ['GFR < 30 — nephrology care essential.', 'Prepare for dialysis or transplant.'],
  },
  G5: {
    recommendations: ['Kidney failure — renal replacement therapy is needed.', 'Immediate nephrology consultation if this is a new diagnosis.', 'Start dialysis on symptoms (uraemia, fluid overload, hyperkalaemia).', 'Continue transplant work-up if appropriate.', 'Strict dietary restriction (potassium, phosphate, fluid).', 'Palliative care discussion if renal replacement is not appropriate.'],
    drugs: ['All renally cleared medicines: major adjustment or avoid.', 'Many drugs are removed by dialysis — time doses accordingly.', 'Consult pharmacy or nephrology for every new medicine.'],
    referral: ['GFR < 15 — dialysis evaluation required.', 'Consider transplant referral.'],
  },
};

const opt = (v: string) => (v.trim() === '' ? null : Number(v));

export function computeGfr(input: GfrHubInput): GfrCompute {
  const errors: string[] = [];
  const cr = opt(input.creatinine), age = opt(input.age), wt = opt(input.weight);
  const [lo, hi] = input.creatinineUnit === 'mg/dL' ? [0.1, 25] : [10, 2200];
  if (cr === null) errors.push('Enter the serum creatinine.');
  else if (!Number.isFinite(cr) || cr <= 0) errors.push('Creatinine must be a number greater than zero.');
  else if (cr < lo || cr > hi) errors.push(`Creatinine ${cr} ${input.creatinineUnit === 'mg/dL' ? 'mg/dL' : 'µmol/L'} is outside ${lo}–${hi} — check the unit selected.`);
  if (age === null) errors.push('Enter the age.');
  else if (!Number.isFinite(age) || age < 18 || age > 120) errors.push('CKD-EPI is validated for adults: age must be 18–120 years.');
  if (wt !== null && (!Number.isFinite(wt) || wt <= 0 || wt > 400)) errors.push('Weight, if entered, must be between 1 and 400 kg.');
  if (errors.length) return { errors };

  const g = calculateGFR({ creatinine: cr!, creatinineUnit: input.creatinineUnit, ageYears: age!, sex: input.gender, weightKg: wt ?? undefined });
  if (!g || !Number.isFinite(g.gfrCKDEPI)) return { errors: ['eGFR could not be calculated from these values.'] };
  const a = ADVICE[g.ckdStage];
  return {
    result: {
      creatinine: cr!, creatinineUnit: input.creatinineUnit, ageYears: age!, gender: input.gender, weightKg: wt,
      gfrCKDEPI: g.gfrCKDEPI,
      gfrCockcroftGault: wt !== null && g.gfrCockcroftGault !== null && Number.isFinite(g.gfrCockcroftGault) ? g.gfrCockcroftGault : null,
      ckdStage: g.ckdStage, stageDescription: g.stageDescription,
      recommendations: a.recommendations, drugDosingAdjustments: a.drugs, referralCriteria: a.referral,
    },
  };
}

export function gfrPlan(r: GfrHubResult): DeterministicPlan {
  return emptyPlan({
    sections: sections(
      section('Recommendations', r.recommendations),
      section('Drug dosing adjustments', r.drugDosingAdjustments),
      section('Referral needed', r.referralCriteria, 'danger'),
      section('Caution', ['A single creatinine cannot distinguish acute kidney injury from CKD — compare with a baseline; CKD staging needs two results at least 3 months apart.']),
    ),
  });
}

export function gfrReport(r: GfrHubResult, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  return {
    calculatorId: 'hub-gfr',
    calculatorName: 'GFR (CKD-EPI 2021)',
    inputs: [
      field('Creatinine', r.creatinine, r.creatinineUnit === 'mg/dL' ? 'mg/dL' : 'µmol/L', 2),
      field('Age', r.ageYears, 'years', 0),
      { label: 'Sex', value: r.gender === 'female' ? 'Female' : 'Male' },
      ...(r.weightKg !== null ? [field('Weight', r.weightKg, 'kg')] : []),
    ],
    results: [
      field('eGFR (CKD-EPI 2021)', r.gfrCKDEPI, 'mL/min/1.73m²'),
      ...(r.gfrCockcroftGault !== null ? [field('Creatinine clearance (Cockcroft-Gault)', r.gfrCockcroftGault, 'mL/min')] : []),
      { label: 'CKD stage', value: `${r.ckdStage} — ${r.stageDescription}` },
    ],
    notes: ['Race-free 2021 equation.'],
    plan: gfrPlan(r),
    patient: patientInfoToReportPatient(patientInfo, { ageYears: r.ageYears, sex: r.gender, weightKg: r.weightKg }),
  };
}
