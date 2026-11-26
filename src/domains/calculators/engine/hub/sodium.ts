/**
 * /calculators Sodium: input validation, the hub's quantitative figures and
 * its report.
 *
 * The figures (TBW, sodium deficit, free water deficit, Adrogué–Madias ΔNa
 * per litre) come from calculationEngine.calculateSodiumCorrection. The
 * management plan — steps, hard limits, monitoring — comes from the ONE
 * electrolyte engine (clinician-assistant replacement.ts via
 * electrolyteCorrection), the same plan the Bedside calculator shows, so the
 * two surfaces cannot disagree on how fast sodium may be corrected.
 */
import { calculateSodiumCorrection, toSex } from '../calculationEngine';
import { electrolyteCorrection } from '../../../clinician-assistant/services/clinicalCalculators';
import type { CorrectionPlan } from '../../../clinician-assistant/services/engine/replacement';
import type { Gender, PatientCalculatorInfo, VolumeStatus } from '../../types';
import { correctionPlanToReportPlan, field, section, sections, yesNo } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport, DeterministicPlan } from '../../report/types';

export interface SodiumHubInput {
  currentNa: string;
  targetNa: string;
  weight: string;
  gender: Gender;
  volumeStatus: VolumeStatus;
  isAcute: boolean;
  hasSymptoms: boolean;
  /** From the patient banner, if entered. */
  ageYears?: number | null;
}

export interface SodiumHubResult {
  current: number;
  target: number;
  weight: number;
  gender: Gender;
  volumeStatus: VolumeStatus;
  isAcute: boolean;
  hasSymptoms: boolean;
  severity: string;
  isHypo: boolean;
  isHyper: boolean;
  tbwL: number;
  /** mmol, hyponatraemia only. */
  sodiumDeficitMmol: number | null;
  /** L, hypernatraemia only. */
  waterDeficitL: number | null;
  /** mmol/L change per litre of 0.9% NaCl. */
  changePerLiterNS: number;
  /**
   * mL/h of 0.9% NaCl for a 0.5 mmol/L/h rise — only where 0.9% saline is
   * the recommended fluid (hypovolaemic hyponatraemia without severe
   * symptoms). Null otherwise: the figure means nothing for 3% saline or
   * fluid restriction.
   */
  nsRateMlPerHr: number | null;
  fluidType: string;
  fluidStrategy: string;
  /** The engine's correction plan; null when the sodium is within range. */
  plan: CorrectionPlan | null;
  additionalGuidance: string[];
}

export type SodiumCompute = { result: SodiumHubResult; errors?: undefined } | { result?: undefined; errors: string[] };

const parse = (v: string) => (v.trim() === '' ? null : Number(v));

/** Hub protocol content the engine does not carry. Shown separately, never as a limit. */
const ADDITIONAL_GUIDANCE_HYPO = [
  'Over-correction rescue: if sodium rises more than the limit, stop hypertonic saline and give 5% dextrose 6 mL/kg over 1–2 h, with desmopressin (DDAVP) 2–4 micrograms IV 6–8-hourly on senior/renal advice.',
  'Patients under 50 kg: a 3% saline bolus of 2 mL/kg rather than a fixed 150 mL.',
  'If 3% saline is unavailable, refer urgently — 0.9% saline is not a substitute in symptomatic or SIAD hyponatraemia.',
  'Insert a urinary catheter and watch for a water diuresis (urine output > 100 mL/h signals autocorrection risk).',
];

const RESOURCE_LIMITED = [
  'Making 0.45% saline: 500 mL 0.9% saline + 500 mL 5% dextrose = 1 L (77 mmol/L sodium).',
  'Making 0.225% saline: 250 mL 0.9% saline + 750 mL 5% dextrose = 1 L (38 mmol/L sodium).',
  'Minimum monitoring where frequent testing is unavailable: sodium at 6, 12 and 24 h.',
  'With limited monitoring, aim for the slower end: about 0.25 mmol/L per hour.',
];

export function computeSodium(input: SodiumHubInput): SodiumCompute {
  const errors: string[] = [];
  const current = parse(input.currentNa);
  const target = parse(input.targetNa);
  const weight = parse(input.weight);

  if (current === null) errors.push('Enter the current sodium (mmol/L).');
  else if (!Number.isFinite(current) || current < 90 || current > 200) errors.push('Current sodium must be between 90 and 200 mmol/L — check the value and unit.');
  if (target === null) errors.push('Enter a target sodium (mmol/L).');
  else if (!Number.isFinite(target) || target < 120 || target > 160) errors.push('Target sodium must be between 120 and 160 mmol/L.');
  if (weight === null) errors.push('Enter the body weight (kg).');
  else if (!Number.isFinite(weight) || weight <= 0 || weight > 400) errors.push('Weight must be between 1 and 400 kg.');
  if (errors.length) return { errors };

  const na = current!, tgt = target!, wt = weight!;
  const isHypo = na < 135, isHyper = na > 145;
  if (isHypo && tgt <= na) errors.push(`For hyponatraemia the target must be above the current sodium (${na}).`);
  if (isHyper && tgt >= na) errors.push(`For hypernatraemia the target must be below the current sodium (${na}).`);
  if (errors.length) return { errors };

  const calc = calculateSodiumCorrection({ currentNa: na, targetNa: tgt, weightKg: wt, gender: input.gender })!;

  // Fluid for this volume status (the hub's recommendation, kept). Where a
  // detail is also in the engine plan, it defers to the plan.
  let fluidType = 'No sodium correction needed';
  let fluidStrategy = 'Sodium is within 135–145 mmol/L.';
  const severeSymptomatic = isHypo && na < 125 && input.hasSymptoms;
  if (isHypo) {
    if (input.volumeStatus === 'hypovolemic') {
      fluidType = '0.9% sodium chloride IV';
      fluidStrategy = 'Volume resuscitation with isotonic saline. Recheck sodium every 2–4 hours: once volume is restored the sodium can rise abruptly.';
    } else {
      fluidType = 'Fluid restriction (800–1000 mL/day)';
      fluidStrategy = input.volumeStatus === 'hypervolemic'
        ? 'Volume overload: restrict fluid and sodium, consider a loop diuretic, and treat the cause.'
        : 'SIAD protocol: restrict fluid and treat the cause.';
    }
    if (severeSymptomatic) {
      fluidType = '3% sodium chloride — emergency bolus (plan step 1), ICU/HDU';
      fluidStrategy = 'Severe symptoms: give hypertonic saline as in step 1 of the plan, recheck the sodium after each bolus, and stop active correction once symptoms resolve or the sodium has risen by 5 mmol/L.';
    }
  } else if (isHyper) {
    if (na > 154 && input.volumeStatus === 'hypovolemic') {
      fluidType = '0.9% sodium chloride initially (hypotonic relative to serum)';
      fluidStrategy = 'Restore circulating volume first, then switch to 0.45% saline or 5% dextrose.';
    } else {
      fluidType = '0.45% saline or 5% dextrose (preferred), or enteral water';
      fluidStrategy = 'Mix 0.9% saline with 5% dextrose 1:1 if 0.45% saline is unavailable. Correct slowly to prevent cerebral oedema.';
    }
  }

  const nsRateMlPerHr = isHypo && input.volumeStatus === 'hypovolemic' && !severeSymptomatic && calc.changePerLiterNS > 0
    ? Math.round((0.5 / calc.changePerLiterNS) * 1000)
    : null;

  // The engine reads age only for total body water: an "elderly" category
  // with no recorded age is passed as 65 so its TBW matches the category.
  const elderly = input.gender === 'elderly-male' || input.gender === 'elderly-female';
  const age = input.ageYears && input.ageYears > 0 ? input.ageYears : elderly ? 65 : null;

  const plan = isHypo || isHyper ? electrolyteCorrection({
    finding: isHypo ? 'lyte.hyponatraemia' : 'lyte.hypernatraemia',
    values: { na },
    weightKg: wt,
    ageYears: elderly && age !== null ? Math.max(age, 65) : age,
    sex: toSex(input.gender),
    severity: input.hasSymptoms ? 'severe' : 'moderate',
  }) : null;

  return {
    result: {
      current: na, target: tgt, weight: wt, gender: input.gender, volumeStatus: input.volumeStatus,
      isAcute: input.isAcute, hasSymptoms: input.hasSymptoms,
      severity: calc.severity, isHypo, isHyper,
      tbwL: calc.tbw,
      sodiumDeficitMmol: isHypo ? Math.abs(Math.round(calc.sodiumDeficit)) : null,
      waterDeficitL: calc.waterDeficit,
      changePerLiterNS: calc.changePerLiterNS,
      nsRateMlPerHr,
      fluidType, fluidStrategy,
      plan,
      additionalGuidance: isHypo ? ADDITIONAL_GUIDANCE_HYPO : [],
    },
  };
}

const CATEGORY: Record<Gender, string> = {
  male: 'Adult male (TBW 60%)', female: 'Adult female (TBW 50%)',
  'elderly-male': 'Elderly male (TBW 50%)', 'elderly-female': 'Elderly female (TBW 45%)',
};

/** The engine plan, without its own deficit (the hub's figures are shown instead), plus the hub's sections. */
export function sodiumPlan(r: SodiumHubResult): DeterministicPlan | undefined {
  if (!r.plan) return undefined;
  const base = correctionPlanToReportPlan(r.plan);
  return {
    ...base,
    sections: sections(
      section(`Recommended fluid for ${r.volumeStatus} status: ${r.fluidType}`, [r.fluidStrategy]),
      section('Additional guidance (hub protocol — not limits)', r.additionalGuidance),
      section('Resource-limited settings', RESOURCE_LIMITED),
    ),
  };
}

export function sodiumReport(r: SodiumHubResult, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  return {
    calculatorId: 'hub-sodium',
    calculatorName: 'Sodium disorder',
    inputs: [
      field('Current sodium', r.current, 'mmol/L', 1),
      field('Target sodium', r.target, 'mmol/L', 1),
      field('Weight', r.weight, 'kg'),
      { label: 'Patient category', value: CATEGORY[r.gender] },
      { label: 'Volume status', value: r.volumeStatus },
      { label: 'Acute onset (< 48 h)', value: yesNo(r.isAcute) },
      { label: 'Severe symptoms', value: yesNo(r.hasSymptoms) },
    ],
    results: [
      { label: 'Severity', value: r.severity },
      field('Total body water', r.tbwL, 'L'),
      ...(r.sodiumDeficitMmol !== null ? [field(`Sodium deficit to ${r.target} mmol/L`, r.sodiumDeficitMmol, 'mmol', 0)] : []),
      ...(r.waterDeficitL !== null ? [field('Free water deficit', r.waterDeficitL, 'L')] : []),
      field('Na⁺ change per litre of 0.9% saline (Adrogué–Madias)', r.changePerLiterNS, 'mmol/L', 2),
      ...(r.nsRateMlPerHr !== null ? [field('0.9% saline rate for a 0.5 mmol/L/h rise', r.nsRateMlPerHr, 'mL/hr', 0)] : []),
      { label: 'Recommended fluid', value: r.fluidType },
    ],
    notes: r.plan ? [] : ['Sodium is within the reference interval; no correction plan.'],
    plan: sodiumPlan(r),
    patient: patientInfoToReportPatient(patientInfo, { weightKg: r.weight, sex: toSex(r.gender) }),
  };
}
