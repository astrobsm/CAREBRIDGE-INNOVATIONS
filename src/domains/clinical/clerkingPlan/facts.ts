/**
 * What the plan rules need to know about the patient, read from the clerking
 * (and from any results already entered). Pure.
 *
 * Unknown is kept apart from no: pregnancy that was never asked is
 * 'unknown', and the vitamin A rule treats 'unknown' as "may be pregnant".
 */
import type { ClerkingData } from '../clerking/types';
import type { PatientContext } from '../clerking/engine';
import { ACTIVE_WOUND_PROTOCOL as P } from './protocols/woundClinic.v1';

export type Pregnancy = 'confirmed' | 'possible' | 'excluded' | 'unknown' | 'not_applicable';

export interface PatientFacts {
  ageYears: number | null;
  ageMonths: number | null;
  isChild: boolean;
  /** Under 1 month: neonatal / paediatric input, no micronutrient doses. */
  isNeonate: boolean;
  sex: 'male' | 'female' | null;
  weightKg: number | null;
  heightCm: number | null;
  pregnancy: Pregnancy;
  breastfeeding: boolean;
  diabetes: boolean;
  sickleCell: boolean;
  ckd: boolean;
  liverDisease: boolean;
  hiv: boolean;
  steroids: boolean;
  immunosuppressed: boolean;
  smoker: boolean;
  poorIntake: boolean;
  malnourished: boolean;
  elderly: boolean;
  febrile: boolean;
  /** Systemic features: fever with tachycardia / hypotension / altered mentation. */
  sepsis: boolean;
  penicillinAllergy: boolean;
  nsaidAllergy: boolean;
  anticoagulated: boolean;
  thyroidDisease: boolean;
  /** Latest result for each analyte, canonical units (hb g/dL, ferritin ng/mL, crp mg/L, zinc mcg/dL, vitaminD ng/mL, hba1c %, egfr). */
  labs: Record<string, number>;
  /** Qualitative results by test id (genotype, hiv, urinalysis). */
  qualitative: Record<string, string>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

export interface FactsInput {
  data: ClerkingData;
  ctx: PatientContext;
  labs?: Record<string, number>;
  qualitative?: Record<string, string>;
}

export function patientFacts({ data, ctx, labs = {}, qualitative = {} }: FactsInput): PatientFacts {
  const h = data.history || {};
  const pmh = h.pmh || {};
  const yes = (id: string) => pmh[id]?.status === 'Yes';
  const months = ctx.ageMonths ?? (ctx.ageYears != null ? ctx.ageYears * 12 : null);
  const ageYears = months != null ? months / 12 : null;
  const sex = (ctx.sex || '').toLowerCase().startsWith('f') ? 'female' : (ctx.sex || '').toLowerCase().startsWith('m') ? 'male' : null;
  const v = data.vitals || {};

  let pregnancy: Pregnancy = 'not_applicable';
  if (sex === 'female' && (ageYears == null || (ageYears >= 10 && ageYears <= 55))) {
    const g = h.gyn?.pregnancy_possible;
    pregnancy = g === 'Pregnancy confirmed' ? 'confirmed' : g === 'Yes' ? 'possible' : g === 'No' ? 'excluded' : 'unknown';
  }
  const meds = data.medications.map(m => `${m.name} ${m.indication || ''}`.toLowerCase()).join(' | ');
  const highRisk: string[] = h.drug_high_risk || [];
  const allergies = data.allergies.map(a => a.substance.toLowerCase()).join(' | ');
  const t = num(v.temperature), p = num(v.pulse), sbp = num(v.bp_systolic);
  const febrile = t != null && t >= 38;
  const consciousness = String(v.consciousness || '');
  const genotype = qualitative.genotype || '';

  return {
    ageYears,
    ageMonths: months,
    isChild: ageYears != null && ageYears < P.thresholds.adultFromYears,
    isNeonate: months != null && months < P.thresholds.childFromMonths,
    sex,
    weightKg: num(v.weight),
    heightCm: num(v.height),
    pregnancy,
    breastfeeding: h.gyn?.breastfeeding === 'Yes',
    diabetes: yes('diabetes') || (labs.hba1c != null && labs.hba1c >= 6.5),
    sickleCell: yes('sickle_cell') || /^(SS|SC)$/.test(genotype),
    ckd: yes('ckd') || (labs.egfr != null && labs.egfr < 60),
    liverDisease: yes('liver_disease'),
    hiv: yes('hiv') || qualitative.hiv === 'Positive',
    steroids: /prednis|dexameth|hydrocort|steroid|methylpred/.test(meds) || highRisk.includes('Corticosteroid') || yes('immunosuppression'),
    immunosuppressed: yes('immunosuppression') || highRisk.includes('Immunosuppressant'),
    smoker: h.social?.smoking === 'Current smoker',
    poorIntake: h.social?.diet === 'Poor intake',
    malnourished: yes('malnutrition') || data.exam?.general?.nutrition === 'Wasted / cachectic' || data.exam?.general?.nutrition === 'Underweight',
    elderly: ageYears != null && ageYears >= 65,
    febrile,
    sepsis: febrile && ((p != null && p > 100) || (sbp != null && sbp < 90) || (!!consciousness && consciousness !== 'Alert')),
    penicillinAllergy: /penicillin|amoxicillin|ampicillin|flucloxacillin|augmentin|co-amoxiclav/.test(allergies),
    nsaidAllergy: /nsaid|aspirin|ibuprofen|diclofenac/.test(allergies),
    anticoagulated: /warfarin|rivaroxaban|apixaban|heparin|enoxaparin|dabigatran/.test(meds) || highRisk.includes('Anticoagulant (warfarin, rivaroxaban, heparin)'),
    thyroidDisease: yes('thyroid_disease'),
    labs,
    qualitative,
  };
}
