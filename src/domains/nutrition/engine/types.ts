/**
 * Input types shared across the nutrition engine. Every field is optional:
 * the engine reports what it could not compute rather than requiring a full
 * record up front.
 */

import type { EquationPopulation } from './config/types';

export type Sex = 'male' | 'female';

/** Where a weight came from. Estimated and reported weights are labelled as such in every output. */
export type WeightSource = 'measured' | 'reported' | 'estimated';

export interface NutritionPatient {
  ageYears?: number | null;
  sex?: Sex | null;
  /** Actual body weight, kg. */
  weightKg?: number | null;
  weightSource?: WeightSource;
  heightCm?: number | null;
  heightSource?: 'measured' | 'reported' | 'estimated';
  pregnant?: boolean | null;
  lactating?: boolean | null;
  dialysis?: boolean | null;
  parenteralNutrition?: boolean | null;
  /** Population whose anthropometric equations should be used. Defaults to config. */
  equationPopulation?: EquationPopulation;
}

export interface WeightPoint {
  /** ISO date or date-time. */
  at: string;
  weightKg: number;
}

/** Clinical context that changes which estimates apply. */
export interface ClinicalContext {
  setting?: 'ward' | 'icu' | 'outpatient';
  ventilated?: boolean;
  /** Days since ICU admission (day 1 = admission day). */
  icuDay?: number | null;
  burns?: {
    tbsaPercent?: number | null;
    postBurnDay?: number | null;
  } | null;
  largeOrHeavilyExudingWound?: boolean;
  sepsis?: boolean;
  majorWound?: boolean;
  ckdNonDialysis?: boolean;
  diabetes?: boolean;
  /** Maximum temperature in the last 24 h, °C. */
  tmaxC?: number | null;
  temperatureC?: number | null;
  minuteVentilationLMin?: number | null;
  /** Indirect calorimetry measured energy expenditure, kcal/day. */
  measuredEnergyKcal?: number | null;
  /** Energy intake over the previous 24 h, kcal (Toronto formula). */
  previousDayIntakeKcal?: number | null;
  /** Abnormal losses (fistula, drains, diarrhoea, vomiting). */
  abnormalFluidLosses?: boolean;
  alcoholExcess?: boolean;
}

/** Recorded override of a safety rule. Both fields are required. */
export interface ClinicianOverride {
  by: string;
  reason: string;
}

export function isValidOverride(o: ClinicianOverride | null | undefined): o is ClinicianOverride {
  return !!o && typeof o.by === 'string' && o.by.trim() !== '' && typeof o.reason === 'string' && o.reason.trim() !== '';
}

/** Catabolic states in which a weight-loss plan is not offered without an override. */
export function catabolicStates(ctx: ClinicalContext | undefined): string[] {
  if (!ctx) return [];
  const out: string[] = [];
  if (ctx.burns && (ctx.burns.tbsaPercent ?? 0) > 0) out.push('burns');
  if (ctx.sepsis) out.push('sepsis');
  if (ctx.majorWound || ctx.largeOrHeavilyExudingWound) out.push('major wound');
  return out;
}
