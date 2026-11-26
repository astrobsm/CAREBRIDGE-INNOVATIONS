/**
 * Helpers for the /calculators hub, whose calculators share one
 * PatientCalculatorInfo (strings, and a gender that folds in "elderly").
 */
import type { PatientCalculatorInfo } from '../types';
import { toSex } from '../engine/calculationEngine';
import type { ReportPatient } from './types';

/** The hub's patient as a report patient. Values entered in a calculator override the banner's. */
export function patientInfoToReportPatient(
  info: PatientCalculatorInfo | undefined,
  overrides: Partial<Pick<ReportPatient, 'ageYears' | 'weightKg' | 'heightCm' | 'sex'>> = {},
): ReportPatient | undefined {
  if (!info) return undefined;
  const n = (v: string | undefined) => {
    const x = v === undefined || v === '' ? NaN : Number(v);
    return Number.isFinite(x) && x > 0 ? x : null;
  };
  const p: ReportPatient = {
    name: info.name?.trim() || undefined,
    hospitalNumber: info.hospitalNumber?.trim() || undefined,
    diagnosis: info.diagnosis?.trim() || undefined,
    comorbidities: info.comorbidities?.length ? info.comorbidities : undefined,
    ageYears: overrides.ageYears ?? n(info.age),
    sex: overrides.sex ?? (info.name || info.age ? toSex(info.gender) : undefined),
    weightKg: overrides.weightKg ?? n(info.weight),
    heightCm: overrides.heightCm ?? n(info.height),
  };
  const any = p.name || p.hospitalNumber || p.ageYears || p.weightKg || p.heightCm || p.comorbidities || p.diagnosis;
  return any ? p : undefined;
}

/**
 * Whether a comorbidity is on the list. The list holds names such as
 * "Diabetes Mellitus", so an exact `includes('Diabetes')` never matched;
 * this matches on the word.
 */
export function hasComorbidity(info: Pick<PatientCalculatorInfo, 'comorbidities'> | undefined, pattern: RegExp): boolean {
  return !!info?.comorbidities?.some(c => pattern.test(c));
}
