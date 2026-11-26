/**
 * Input handling for the hub's BNF tab. Dosing itself comes from the app's
 * BNF database through the bedside BnfDrugPanel; this only turns the hub's
 * text fields into the panel's inputs. A blank eGFR or weight is UNKNOWN —
 * it used to be silently read as 100 mL/min and 70 kg.
 */
import { finiteOrNull } from '../../report/format';
import { toSex } from '../calculationEngine';
import type { PatientCalculatorInfo } from '../../types';

export interface BnfInputs {
  gfr: number | null;
  weightKg: number | null;
  ageYears: number | null;
  sex: 'male' | 'female';
  errors: string[];
}

export function parseBnfInputs(raw: { gfr: string; weight: string }, patientInfo?: PatientCalculatorInfo): BnfInputs {
  const errors: string[] = [];
  let gfr = finiteOrNull(raw.gfr);
  if (gfr !== null && (gfr < 0 || gfr > 200)) {
    errors.push('eGFR should be between 0 and 200 mL/min/1.73m² — it is treated as unknown until corrected.');
    gfr = null;
  }
  let weightKg = finiteOrNull(raw.weight);
  if (weightKg !== null && !(weightKg > 0 && weightKg <= 400)) {
    errors.push('Weight should be between 1 and 400 kg — it is treated as unknown until corrected.');
    weightKg = null;
  }
  const age = finiteOrNull(patientInfo?.age ?? '');
  return {
    gfr,
    weightKg,
    ageYears: age !== null && age > 0 && age <= 120 ? age : null,
    sex: toSex(patientInfo?.gender),
    errors,
  };
}
