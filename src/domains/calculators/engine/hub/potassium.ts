/**
 * /calculators Potassium: validation, severity label and report.
 *
 * The management plan is the ONE electrolyte engine's (clinician-assistant
 * replacement.ts via electrolyteCorrection) — the plan the Bedside calculator
 * shows. The hub's own replacement lists and infusion-rate card were removed
 * because they disagreed with it (oral doses, calcium dose, deficit). What is
 * kept is educational (expected ECG findings) or adds a caution the engine
 * does not state, listed separately and never as a limit.
 */
import { electrolyteCorrection } from '../../../clinician-assistant/services/clinicalCalculators';
import type { CorrectionPlan } from '../../../clinician-assistant/services/engine/replacement';
import type { PatientCalculatorInfo } from '../../types';
import { correctionPlanToReportPlan, field, section, sections, yesNo } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import { toSex } from '../calculationEngine';
import type { CalculatorReport, DeterministicPlan } from '../../report/types';

export interface PotassiumHubInput {
  currentK: string;
  weight: string;
  hasRenalImpairment: boolean;
  onDigoxin: boolean;
  hasEcgChanges: boolean;
  hasMuscleWeakness: boolean;
  oralIntakeOk: boolean;
}

export interface PotassiumHubResult {
  current: number;
  weightKg: number | null;
  flags: Omit<PotassiumHubInput, 'currentK' | 'weight'>;
  severity: string;
  tone: 'normal' | 'mild' | 'moderate' | 'severe';
  ecgFindings: string[];
  additionalCautions: string[];
  plan: CorrectionPlan | null;
}

export type PotassiumCompute = { result: PotassiumHubResult; errors?: undefined } | { result?: undefined; errors: string[] };

/** The hub's reference interval. */
export const K_LOW = 3.5;
export const K_HIGH = 5.0;

export function computePotassium(input: PotassiumHubInput, patientInfo?: PatientCalculatorInfo): PotassiumCompute {
  const errors: string[] = [];
  const k = input.currentK.trim() === '' ? null : Number(input.currentK);
  const w = input.weight.trim() === '' ? null : Number(input.weight);
  if (k === null) errors.push('Enter the current potassium (mmol/L).');
  else if (!Number.isFinite(k) || k < 1 || k > 10) errors.push('Potassium must be between 1.0 and 10.0 mmol/L — check the value (and that the sample is not haemolysed).');
  if (w !== null && (!Number.isFinite(w) || w <= 0 || w > 400)) errors.push('Weight, if entered, must be between 1 and 400 kg.');
  if (errors.length) return { errors };

  const K = k!;
  const hypo = K < K_LOW, hyper = K > K_HIGH;
  const f = input;

  let severity = 'Normal potassium';
  let tone: PotassiumHubResult['tone'] = 'normal';
  if (hypo) {
    if (K >= 3.0) { severity = 'Mild hypokalaemia'; tone = 'mild'; }
    else if (K >= 2.5) { severity = 'Moderate hypokalaemia'; tone = 'moderate'; }
    else { severity = 'Severe hypokalaemia'; tone = 'severe'; }
  } else if (hyper) {
    if (K <= 5.5) { severity = 'Mild hyperkalaemia'; tone = 'mild'; }
    else if (K <= 6.5) { severity = 'Moderate hyperkalaemia'; tone = 'moderate'; }
    else { severity = 'Severe hyperkalaemia'; tone = 'severe'; }
  }
  // ECG changes make any abnormal potassium an emergency, whatever the number.
  if ((hypo || hyper) && f.hasEcgChanges && tone !== 'severe') {
    severity = `${hypo ? 'Hypokalaemia' : 'Hyperkalaemia'} with ECG changes — treat as severe`;
    tone = 'severe';
  }

  const ecgFindings = hypo
    ? (K < 2.5
      ? ['Severe T-wave flattening or inversion', 'Prominent U waves (may exceed the T wave)', 'Marked QT prolongation', 'ST depression', 'Risk of torsades de pointes and ventricular arrhythmia']
      : K < 3.0 ? ['Flattened T waves', 'ST depression', 'Prominent U waves', 'Prolonged QT interval'] : [])
    : hyper
      ? (K > 6.5
        ? ['Tall, peaked T waves', 'Loss of P waves', 'Widened QRS (> 0.12 s)', 'Sine-wave pattern (pre-arrest)', 'Risk of ventricular fibrillation or asystole']
        : K > 5.5 ? ['Peaked T waves (earliest sign)', 'Prolonged PR interval', 'Flattened P waves', 'Widened QRS'] : [])
      : [];

  const additionalCautions: string[] = [];
  if (hypo) {
    additionalCautions.push('Avoid dextrose-containing diluents for potassium — the insulin response drives potassium into cells and worsens the level.');
    additionalCautions.push('Do not give intravenous potassium to an anuric patient without dialysis back-up.');
    if (f.onDigoxin) additionalCautions.push('On digoxin: hypokalaemia potentiates toxicity — aim for potassium above 4.0 mmol/L.');
    if (f.hasRenalImpairment) additionalCautions.push('Renal impairment: excretion is reduced — replace cautiously and recheck the level more often.');
    if (f.hasMuscleWeakness) additionalCautions.push('Muscle weakness: assess respiratory muscle strength and watch for ileus.');
    if (!f.oralIntakeOk) additionalCautions.push('No oral intake: the oral route in the plan is unavailable — use the intravenous step.');
  } else if (hyper) {
    if (K <= 5.5 && !f.hasEcgChanges) {
      additionalCautions.push('Mild (5.1–5.5 mmol/L) with a normal ECG: stop contributing drugs and potassium supplements, low-potassium diet, and recheck within 24 hours. The emergency steps in the plan apply from 6.0 mmol/L or with ECG changes.');
    }
    additionalCautions.push('Exclude pseudohyperkalaemia (haemolysed or old sample, very high white cell or platelet count) — but never delay treatment when the ECG is abnormal.');
    additionalCautions.push('Avoid Hartmann\'s / lactated Ringer\'s while hyperkalaemic — it contains potassium.');
    additionalCautions.push('Sodium bicarbonate only if there is significant acidosis (pH < 7.2 or bicarbonate < 15 mmol/L); it is not first-line.');
    additionalCautions.push('After insulin–glucose, a 10% dextrose infusion (about 50–75 mL/h for 5–6 h) can prevent delayed hypoglycaemia where glucose cannot be checked hourly.');
    if (f.hasRenalImpairment) additionalCautions.push('Renal impairment: involve nephrology early — dialysis may be the definitive treatment.');
    if (f.onDigoxin) additionalCautions.push('On digoxin: give calcium slowly (over 20 minutes, diluted) and consider digoxin toxicity as the cause.');
  }

  const severityForEngine = f.hasEcgChanges ? 'critical' : (tone === 'severe' || f.onDigoxin || f.hasMuscleWeakness) ? 'severe' : 'moderate';
  const age = Number(patientInfo?.age);
  const plan = hypo || hyper ? electrolyteCorrection({
    finding: hypo ? 'lyte.hypokalaemia' : 'lyte.hyperkalaemia',
    values: { k: K },
    weightKg: w,
    ageYears: Number.isFinite(age) && age > 0 ? age : null,
    sex: patientInfo ? toSex(patientInfo.gender) : 'unspecified',
    severity: severityForEngine,
  }) : null;

  return {
    result: {
      current: K, weightKg: w,
      flags: {
        hasRenalImpairment: f.hasRenalImpairment, onDigoxin: f.onDigoxin, hasEcgChanges: f.hasEcgChanges,
        hasMuscleWeakness: f.hasMuscleWeakness, oralIntakeOk: f.oralIntakeOk,
      },
      severity, tone, ecgFindings, additionalCautions, plan,
    },
  };
}

export function potassiumPlan(r: PotassiumHubResult): DeterministicPlan | undefined {
  if (!r.plan) return undefined;
  const base = correctionPlanToReportPlan(r.plan);
  return {
    ...base,
    sections: sections(
      ...base.sections,
      section('Expected ECG findings at this level', r.ecgFindings),
      section('Additional cautions for this patient', r.additionalCautions, 'warn'),
    ),
  };
}

export function potassiumReport(r: PotassiumHubResult, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  return {
    calculatorId: 'hub-potassium',
    calculatorName: 'Potassium disorder',
    inputs: [
      field('Current potassium', r.current, 'mmol/L', 1),
      ...(r.weightKg !== null ? [field('Weight', r.weightKg, 'kg')] : []),
      { label: 'Renal impairment', value: yesNo(r.flags.hasRenalImpairment) },
      { label: 'On digoxin', value: yesNo(r.flags.onDigoxin) },
      { label: 'ECG changes', value: yesNo(r.flags.hasEcgChanges) },
      { label: 'Muscle weakness', value: yesNo(r.flags.hasMuscleWeakness) },
      { label: 'Oral intake possible', value: yesNo(r.flags.oralIntakeOk) },
    ],
    results: [
      { label: 'Severity', value: r.severity },
      ...(r.plan?.deficit ? [{ label: r.plan.deficit.label, value: r.plan.deficit.value }] : []),
    ],
    notes: r.plan ? [] : [`Potassium ${r.current} mmol/L is within ${K_LOW}–${K_HIGH} mmol/L; no correction plan.`],
    plan: potassiumPlan(r),
    patient: patientInfoToReportPatient(patientInfo, { weightKg: r.weightKg }),
  };
}
