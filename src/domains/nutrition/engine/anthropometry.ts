/**
 * Anthropometry: BMI, IBW/AdjBW, height and weight when they cannot be
 * measured, amputation adjustment, MAMC, weight change and grip strength.
 *
 * BMI, IBW and AdjBW are the canonical calculationEngine functions; this module
 * wraps them in transparent Estimates rather than re-implementing them.
 */

import {
  calculateBMI, bmiCategory, calculateIdealBodyWeight, calculateAdjustedBodyWeight,
} from '../../calculators/engine/calculationEngine';
import { safePercentChange } from '../../../services/longitudinalMath';
import { ACTIVE_NUTRITION_CONFIG, equationById } from './config';
import type { EquationDefaults, EquationPopulation, NutritionConfig, RegressionEquation } from './config/types';
import {
  computed, notComputable, positive, finite, r1, type Estimate, type InputValue,
} from './estimate';
import type { Sex, WeightPoint } from './types';

const C = ACTIVE_NUTRITION_CONFIG;

// ───────────────────────────── BMI / IBW / AdjBW ─────────────────────────────

/** WHO class, with the underweight grades the planner used split out. Delegates to the canonical bmiCategory otherwise. */
export function bmiClass(bmi: number): string {
  if (bmi >= 16 && bmi < 17) return 'Moderate underweight';
  if (bmi >= 17 && bmi < 18.5) return 'Mild underweight';
  return bmiCategory(bmi);
}

export function bmiEstimate(weightKg: number | null | undefined, heightCm: number | null | undefined,
  config: NutritionConfig = C, weightLabel = 'actual body weight'): Estimate {
  const w = positive(weightKg); const h = positive(heightCm);
  const base = { unit: 'kg/m²', method: 'Body mass index', formula: 'weight (kg) ÷ height (m)²', sourceIds: ['canonicalEngine'],
    inputsUsed: { weightKg: w, heightCm: h } };
  const missing = [...(w ? [] : ['weightKg']), ...(h ? [] : ['heightCm'])];
  if (missing.length) return notComputable(config, missing, base);
  const value = calculateBMI(w!, h!);
  if (value === null) return notComputable(config, ['weightKg', 'heightCm'], base);
  return computed(config, value, { ...base, assumptions: [`Uses ${weightLabel}.`, `Class: ${bmiClass(value)}.`] });
}

export function idealBodyWeight(heightCm: number | null | undefined, sex: Sex | null | undefined,
  config: NutritionConfig = C): Estimate {
  const h = positive(heightCm);
  const d = config.anthropometry.devine.value;
  const base = { unit: 'kg', method: 'Ideal body weight (Devine)',
    formula: `${d.maleBaseKg} kg (male) / ${d.femaleBaseKg} kg (female) + ${d.kgPerInchOver60} kg per inch over 60 in`,
    sourceIds: ['devine1974', 'canonicalEngine'], inputsUsed: { heightCm: h, sex: sex ?? null } };
  const missing = [...(h ? [] : ['heightCm']), ...(sex ? [] : ['sex'])];
  if (missing.length) return notComputable(config, missing, base);
  const v = calculateIdealBodyWeight(h!, sex!);
  if (v === null) return notComputable(config, ['heightCm'], base);
  const warnings = h! < 152.4 ? ['Height under 152.4 cm (60 in): Devine is extrapolated below its range.'] : [];
  return computed(config, v, { ...base, warnings });
}

/**
 * AdjBW = IBW + 0.4 × (ABW − IBW) (canonical). `indicated` reports whether the
 * config's threshold (% of IBW) for using AdjBW is met; the value is computed either way.
 */
export function adjustedBodyWeight(weightKg: number | null | undefined, heightCm: number | null | undefined,
  sex: Sex | null | undefined, config: NutritionConfig = C): Estimate & { indicated: boolean | null } {
  const w = positive(weightKg); const h = positive(heightCm);
  const cfg = config.anthropometry.adjustedBodyWeight;
  const base = { unit: 'kg', method: 'Adjusted body weight', formula: `IBW + ${cfg.value.fraction} × (ABW − IBW); ABW if ABW ≤ IBW`,
    sourceIds: [cfg.sourceId, 'devine1974'], inputsUsed: { weightKg: w, heightCm: h, sex: sex ?? null } };
  const missing = [...(w ? [] : ['weightKg']), ...(h ? [] : ['heightCm']), ...(sex ? [] : ['sex'])];
  if (missing.length) return { ...notComputable(config, missing, base), indicated: null };
  const ibw = calculateIdealBodyWeight(h!, sex!)!;
  const v = calculateAdjustedBodyWeight(w!, h!, sex!)!;
  const indicated = w! > ibw * (cfg.value.indicatedAbovePercentIbw / 100);
  return {
    ...computed(config, v, { ...base, inputsUsed: { ...base.inputsUsed, ibwKg: ibw },
      assumptions: [indicated
        ? `ABW exceeds ${cfg.value.indicatedAbovePercentIbw}% of IBW: AdjBW indicated.`
        : `ABW is not above ${cfg.value.indicatedAbovePercentIbw}% of IBW: AdjBW not indicated.`] }),
    indicated,
  };
}

// ───────────────────────────── Regression equations ─────────────────────────────

export function formulaText(eq: RegressionEquation): string {
  if (!eq.coefficients) return `${eq.label}: coefficients not configured`;
  const { intercept, terms } = eq.coefficients;
  const parts = Object.entries(terms).map(([k, c]) => `${c < 0 ? '−' : '+'} ${Math.abs(c)} × ${k}`);
  return `${intercept} ${parts.join(' ')}`;
}

export function evaluateEquation(eq: RegressionEquation, inputs: Record<string, number | null | undefined>): number | null {
  if (!eq.coefficients) return null;
  let v = eq.coefficients.intercept;
  for (const [k, c] of Object.entries(eq.coefficients.terms)) {
    const x = finite(inputs[k]);
    if (x === null) return null;
    v += c * x;
  }
  return v;
}

const ageFits = (eq: RegressionEquation, age: number) =>
  age >= eq.ageMinYears && (eq.ageBelowYears === null || age < eq.ageBelowYears);

interface EquationRequest {
  table: EquationDefaults;
  method: string;
  unit: string;
  inputs: Record<string, number | null | undefined>;
  ageYears: number | null | undefined;
  sex: Sex | null | undefined;
  population?: EquationPopulation;
  /** Use this equation id instead of the population default. */
  equationId?: string;
}

function runEquation(req: EquationRequest, config: NutritionConfig): Estimate & { equationId: string | null } {
  const population = req.population ?? config.population.defaultEquationPopulation;
  const age = finite(req.ageYears);
  const inputsUsed: Record<string, InputValue> = { population, ageYears: age, sex: req.sex ?? null };
  for (const [k, v] of Object.entries(req.inputs)) inputsUsed[k] = finite(v);
  const base = { unit: req.unit, method: req.method, formula: '', sourceIds: [] as string[], inputsUsed };
  const fail = (missing: string[], extra: Partial<typeof base> & { status?: 'equation_not_configured' | 'not_applicable'; warnings?: string[] }) =>
    ({ ...notComputable(config, missing, { ...base, ...extra }), equationId: null });

  const pre = [...(age === null ? ['ageYears'] : []), ...(req.sex ? [] : ['sex'])];
  if (pre.length) return fail(pre, {});

  let candidates: RegressionEquation[];
  if (req.equationId) {
    const eq = equationById(config, req.equationId);
    if (!eq) return fail([], { status: 'equation_not_configured', warnings: [`Unknown equation "${req.equationId}".`] });
    candidates = [eq];
  } else {
    candidates = (req.table[population]?.[req.sex!] ?? [])
      .map(id => equationById(config, id)).filter((e): e is RegressionEquation => !!e);
  }
  if (!candidates.length) {
    return fail([], { status: 'equation_not_configured',
      warnings: [`No ${req.method.toLowerCase()} equation is configured for population "${population}".`] });
  }

  const fitting = candidates.filter(e => ageFits(e, age!) && e.sex === req.sex);
  const eq = fitting.find(e => e.coefficients !== null);
  const skipped = fitting.filter(e => e.coefficients === null);
  if (!eq) {
    if (skipped.length) {
      return fail([], { status: 'equation_not_configured', formula: formulaText(skipped[0]),
        sourceIds: skipped.map(e => e.sourceId),
        warnings: skipped.map(e => `${e.label}: ${e.todo ?? 'coefficients not configured'}`) });
    }
    return fail([], { status: 'not_applicable',
      warnings: [`No configured equation covers age ${age} for ${req.sex} (${population}).`] });
  }

  const missing = eq.inputs.filter(k => finite(req.inputs[k] ?? (k === 'ageYears' ? age : undefined)) === null);
  const allInputs = { ...req.inputs, ageYears: age };
  if (missing.length) return { ...notComputable(config, missing, { ...base, formula: formulaText(eq), sourceIds: [eq.sourceId] }), equationId: eq.id };

  const value = evaluateEquation(eq, allInputs);
  const assumptions = [`Equation: ${eq.label}.`];
  if (eq.population !== population) {
    assumptions.push(`Requested population "${population}"; equation derived in "${eq.population}" population.`);
  }
  for (const s of skipped) assumptions.push(`${s.label} not configured; next configured candidate used.`);
  const warnings = ['Predicted, not measured: carries the regression\'s standard error.'];
  if (!config.sources[eq.sourceId]?.verifiedAgainstPrimary) {
    warnings.push('Coefficients not yet verified against the primary source (pending clinical validation).');
  }
  return {
    ...computed(config, r1(value!), { ...base, formula: formulaText(eq), sourceIds: [eq.sourceId], assumptions, warnings }),
    equationId: eq.id,
  };
}

export interface StatureInput {
  ageYears?: number | null;
  sex?: Sex | null;
  population?: EquationPopulation;
  equationId?: string;
}

export function heightFromKneeHeight(input: StatureInput & { kneeHeightCm?: number | null }, config: NutritionConfig = C) {
  return runEquation({ table: config.anthropometry.kneeHeightDefaults, method: 'Height from knee height', unit: 'cm',
    inputs: { kneeHeightCm: positive(input.kneeHeightCm) }, ageYears: input.ageYears, sex: input.sex,
    population: input.population, equationId: input.equationId }, config);
}

export function heightFromUlna(input: StatureInput & { ulnaLengthCm?: number | null }, config: NutritionConfig = C) {
  return runEquation({ table: config.anthropometry.ulnaDefaults, method: 'Height from ulna length', unit: 'cm',
    inputs: { ulnaLengthCm: positive(input.ulnaLengthCm) }, ageYears: input.ageYears, sex: input.sex,
    population: input.population, equationId: input.equationId }, config);
}

export function weightFromAnthropometry(input: StatureInput & {
  kneeHeightCm?: number | null; muacCm?: number | null; calfCm?: number | null; subscapularSkinfoldMm?: number | null;
}, config: NutritionConfig = C) {
  return runEquation({ table: config.anthropometry.weightDefaults, method: 'Weight from anthropometry', unit: 'kg',
    inputs: { kneeHeightCm: positive(input.kneeHeightCm), muacCm: positive(input.muacCm), calfCm: positive(input.calfCm),
      subscapularSkinfoldMm: positive(input.subscapularSkinfoldMm) },
    ageYears: input.ageYears, sex: input.sex, population: input.population, equationId: input.equationId }, config);
}

// ───────────────────────────── MUAC → BMI band ─────────────────────────────

export type MuacBmiBand = 'bmi_likely_below_20' | 'bmi_likely_above_30' | 'indeterminate';

export function bmiBandFromMuac(muacCm: number | null | undefined, config: NutritionConfig = C): Estimate<MuacBmiBand> {
  const m = positive(muacCm);
  const t = config.anthropometry.muacBmi;
  const base = { unit: 'BMI band', method: 'BMI category estimated from MUAC',
    formula: `MUAC < ${t.value.lowCm} cm → BMI likely < ${t.value.lowImpliesBmiBelow}; MUAC > ${t.value.highCm} cm → BMI likely > ${t.value.highImpliesBmiAbove}`,
    sourceIds: [t.sourceId], inputsUsed: { muacCm: m } };
  if (m === null) return notComputable(config, ['muacCm'], base);
  const band: MuacBmiBand = m < t.value.lowCm ? 'bmi_likely_below_20' : m > t.value.highCm ? 'bmi_likely_above_30' : 'indeterminate';
  return computed(config, band, { ...base,
    warnings: ['An estimate of BMI category only, not a BMI value.',
      ...(band === 'indeterminate' ? ['MUAC in the middle band: BMI category cannot be inferred.'] : [])] });
}

// ───────────────────────────── Amputation ─────────────────────────────

/** A key of config.anthropometry.amputationSegmentsPercent (e.g. 'lower_leg_with_foot'). */
export type AmputationSegment = string;

function amputatedPercent(segments: AmputationSegment[], config: NutritionConfig): { pct: number; unknown: string[] } {
  const table = config.anthropometry.amputationSegmentsPercent.value;
  let pct = 0; const unknown: string[] = [];
  for (const s of segments) { if (table[s] === undefined) unknown.push(s); else pct += table[s]; }
  return { pct, unknown };
}

/** Estimated weight had the limb(s) been present: current ÷ (1 − amputated fraction). */
export function amputationAdjustedWeight(currentWeightKg: number | null | undefined, segments: AmputationSegment[],
  config: NutritionConfig = C): Estimate {
  const w = positive(currentWeightKg);
  const { pct, unknown } = amputatedPercent(segments, config);
  const base = { unit: 'kg', method: 'Amputation-adjusted (whole-body equivalent) weight',
    formula: 'current weight ÷ (1 − Σ segment % / 100)', sourceIds: [config.anthropometry.amputationSegmentsPercent.sourceId],
    inputsUsed: { currentWeightKg: w, segments: segments.join(', '), amputatedPercent: pct } };
  if (unknown.length) return notComputable(config, unknown.map(u => `segment percentage for "${u}"`), { ...base, status: 'equation_not_configured' });
  if (w === null) return notComputable(config, ['currentWeightKg'], base);
  return computed(config, r1(w / (1 - pct / 100)), { ...base,
    assumptions: ['Use for BMI and comparison with norms; base energy and protein on current weight.'] });
}

/** IBW reduced by the amputated fraction. */
export function amputationAdjustedIbw(ibwKg: number | null | undefined, segments: AmputationSegment[],
  config: NutritionConfig = C): Estimate {
  const i = positive(ibwKg);
  const { pct, unknown } = amputatedPercent(segments, config);
  const base = { unit: 'kg', method: 'Amputation-adjusted IBW', formula: 'IBW × (1 − Σ segment % / 100)',
    sourceIds: [config.anthropometry.amputationSegmentsPercent.sourceId], inputsUsed: { ibwKg: i, amputatedPercent: pct } };
  if (unknown.length) return notComputable(config, unknown.map(u => `segment percentage for "${u}"`), { ...base, status: 'equation_not_configured' });
  if (i === null) return notComputable(config, ['ibwKg'], base);
  return computed(config, r1(i * (1 - pct / 100)), base);
}

// ───────────────────────────── MAMC ─────────────────────────────

/** MAMC (cm) = MUAC (cm) − π × TSF (cm). TSF is entered in mm and converted. */
export function midArmMuscleCircumference(muacCm: number | null | undefined, tsfMm: number | null | undefined,
  config: NutritionConfig = C): Estimate {
  const m = positive(muacCm); const t = positive(tsfMm);
  const base = { unit: 'cm', method: 'Mid-arm muscle circumference', formula: 'MUAC (cm) − π × (TSF (mm) ÷ 10)',
    sourceIds: ['blackburn1977'], inputsUsed: { muacCm: m, tsfMm: t } };
  const missing = [...(m ? [] : ['muacCm']), ...(t ? [] : ['tsfMm'])];
  if (missing.length) return notComputable(config, missing, base);
  const v = m! - Math.PI * (t! / 10);
  const warnings = config.anthropometry.mamcNorms.value === null ? ['No MAMC reference centiles configured: value not interpreted.'] : [];
  if (v <= 0) return notComputable(config, ['plausible MUAC/TSF pair'], { ...base, warnings: ['TSF too large for MUAC — check units (TSF in mm, MUAC in cm).'] });
  return computed(config, r1(v), { ...base, warnings });
}

// ───────────────────────────── Weight change ─────────────────────────────

const DAY = 86_400_000;

export type WeightChangeWindow = 'oneWeek' | 'oneMonth' | 'threeToSixMonths';

/**
 * Percent weight change over each window (negative = loss), from the latest
 * reading back to the EARLIEST reading inside the window. Uses
 * longitudinalMath.safePercentChange.
 */
export function weightChanges(series: WeightPoint[], config: NutritionConfig = C): Record<WeightChangeWindow, Estimate> {
  const pts = series
    .filter(p => positive(p.weightKg) !== null && Number.isFinite(new Date(p.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const windows = config.anthropometry.weightChangeWindows;
  const out = {} as Record<WeightChangeWindow, Estimate>;
  const latest = pts[pts.length - 1];
  for (const key of Object.keys(windows.value) as WeightChangeWindow[]) {
    const { minDays, maxDays } = windows.value[key];
    const base = { unit: '%', method: `Weight change (${key})`, formula: '(latest − earlier) ÷ earlier × 100',
      sourceIds: [windows.sourceId], inputsUsed: {} as Record<string, InputValue> };
    if (!latest) { out[key] = notComputable(config, ['weight series'], base); continue; }
    const t1 = new Date(latest.at).getTime();
    const earlier = pts.find(p => { const d = (t1 - new Date(p.at).getTime()) / DAY; return d >= minDays && d <= maxDays; });
    if (!earlier) {
      out[key] = notComputable(config, [`weight recorded ${minDays}–${maxDays} days before ${latest.at}`], base);
      continue;
    }
    const pct = safePercentChange(earlier.weightKg, latest.weightKg, config.anthropometry.weightPercentFloorKg);
    const inputsUsed = { fromKg: earlier.weightKg, fromAt: earlier.at, toKg: latest.weightKg, toAt: latest.at,
      days: Math.round((t1 - new Date(earlier.at).getTime()) / DAY) };
    out[key] = pct === null
      ? notComputable(config, ['plausible baseline weight'], { ...base, inputsUsed })
      : computed(config, pct, { ...base, inputsUsed });
  }
  return out;
}

// ───────────────────────────── Grip strength ─────────────────────────────

export function gripStrength(gripKg: number | null | undefined, sex: Sex | null | undefined, ageYears: number | null | undefined,
  config: NutritionConfig = C): Estimate<{ low: boolean; cutoffKg: number; ageSexCentile: null | 'below_p10' | 'p10_to_p50' | 'above_p50' }> {
  const g = positive(gripKg);
  const cut = config.anthropometry.gripStrength.lowCutoffKg;
  const base = { unit: 'kg', method: 'Handgrip strength vs cut-off', formula: `low if grip < ${cut.value.male} kg (men) / ${cut.value.female} kg (women)`,
    sourceIds: [cut.sourceId], inputsUsed: { gripKg: g, sex: sex ?? null, ageYears: finite(ageYears) } };
  const missing = [...(g ? [] : ['gripKg']), ...(sex ? [] : ['sex'])];
  if (missing.length) return notComputable(config, missing, base);
  const cutoffKg = cut.value[sex!];
  const norms = config.anthropometry.gripStrength.ageSexNorms.value;
  const a = finite(ageYears);
  let ageSexCentile: null | 'below_p10' | 'p10_to_p50' | 'above_p50' = null;
  const warnings: string[] = [];
  const band = norms && a !== null ? norms.find(n => n.sex === sex && a >= n.ageMin && a < n.ageMax) : undefined;
  if (band) ageSexCentile = g! < band.p10Kg ? 'below_p10' : g! < band.p50Kg ? 'p10_to_p50' : 'above_p50';
  else warnings.push('Age/sex grip-strength norms not configured: compared with the fixed cut-off only.');
  return computed(config, { low: g! < cutoffKg, cutoffKg, ageSexCentile }, { ...base, warnings });
}

