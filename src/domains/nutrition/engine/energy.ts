/**
 * Energy requirements. Returns every applicable estimate; the clinician picks.
 * Indirect calorimetry, when measured, is marked preferred over all equations.
 *
 * Mifflin-St Jeor and (revised) Harris-Benedict are the canonical
 * calculationEngine functions. The Toronto formula was derived with the
 * ORIGINAL 1919 Harris-Benedict, so it uses those coefficients (from config)
 * internally — selectable via config.energy.toronto.value.harrisBenedictVariant.
 */

import {
  calculateHarrisBenedictBMR, calculateMifflinStJeorBMR, calculateBMI, calculateIdealBodyWeight,
} from '../../calculators/engine/calculationEngine';
import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, positive, finite, r0, type Estimate, type Range, type InputValue } from './estimate';
import type { ClinicalContext, NutritionPatient, Sex } from './types';

const C = ACTIVE_NUTRITION_CONFIG;

export interface EnergyEstimate extends Estimate<number | Range> {
  id: 'indirect_calorimetry' | 'mifflin_st_jeor' | 'harris_benedict' | 'penn_state_2003b' | 'penn_state_2010'
    | 'toronto' | 'curreri' | 'icu_espen' | 'obesity_aspen';
  preferred: boolean;
}

interface Basics { w: number | null; h: number | null; a: number | null; sex: Sex | null; missing: string[]; inputs: Record<string, InputValue>; assumptions: string[] }

function basics(p: NutritionPatient, need: ('w' | 'h' | 'a' | 'sex')[]): Basics {
  const w = positive(p.weightKg); const h = positive(p.heightCm); const a = finite(p.ageYears);
  const sex = p.sex === 'male' || p.sex === 'female' ? p.sex : null;
  const missing: string[] = [];
  if (need.includes('w') && w === null) missing.push('weightKg');
  if (need.includes('h') && h === null) missing.push('heightCm');
  if (need.includes('a') && a === null) missing.push('ageYears');
  if (need.includes('sex') && sex === null) missing.push('sex');
  const assumptions: string[] = [];
  if (p.weightSource && p.weightSource !== 'measured') assumptions.push(`Weight is ${p.weightSource}, not measured.`);
  if (p.heightSource && p.heightSource !== 'measured') assumptions.push(`Height is ${p.heightSource}, not measured.`);
  return { w, h, a, sex, missing, inputs: { weightKg: w, heightCm: h, ageYears: a, sex }, assumptions };
}

const tag = (e: Estimate<number | Range>, id: EnergyEstimate['id']): EnergyEstimate => ({ ...e, id, preferred: false });

// ───────────────────────────── Individual methods ─────────────────────────────

export function indirectCalorimetry(ctx: ClinicalContext, config: NutritionConfig = C): EnergyEstimate {
  const m = positive(ctx.measuredEnergyKcal);
  const cfg = config.energy.icuEspen;
  const base = { unit: 'kcal/day', method: 'Indirect calorimetry (measured)', formula: 'measured energy expenditure',
    sourceIds: ['espenIcu2019'], inputsUsed: { measuredEnergyKcal: m, setting: ctx.setting ?? null, icuDay: finite(ctx.icuDay) } };
  if (m === null) return tag(notComputable(config, ['measuredEnergyKcal'], base), 'indirect_calorimetry');
  if (ctx.setting === 'icu') {
    const day = finite(ctx.icuDay);
    const warnings = day === null ? ['ICU day not given: early-phase (≤ 70%) target shown.'] : [];
    if (day === null || day <= cfg.value.earlyPhaseDays) {
      return tag(computed(config, r0(m * cfg.value.measuredEarlyFraction), { ...base,
        formula: `measured EE × ${cfg.value.measuredEarlyFraction} (early phase, days 1–${cfg.value.earlyPhaseDays})`, warnings,
        assumptions: ['Target is the ceiling for the early phase; progress after day 3.'] }), 'indirect_calorimetry');
    }
    const f = cfg.value.measuredLaterFraction;
    return tag(computed(config, { low: r0(m * f.low), high: r0(m * f.high) }, { ...base,
      formula: `measured EE × ${f.low}–${f.high} (after day ${cfg.value.earlyPhaseDays})` }), 'indirect_calorimetry');
  }
  return tag(computed(config, r0(m), base), 'indirect_calorimetry');
}

export function mifflinStJeor(p: NutritionPatient, config: NutritionConfig = C): EnergyEstimate {
  const b = basics(p, ['w', 'h', 'a', 'sex']);
  const base = { unit: 'kcal/day', method: 'Mifflin-St Jeor (resting)',
    formula: '10W + 6.25H − 5A + 5 (men) / − 161 (women)', sourceIds: ['mifflin1990', 'canonicalEngine'], inputsUsed: b.inputs };
  if (b.missing.length) return tag(notComputable(config, b.missing, base), 'mifflin_st_jeor');
  return tag(computed(config, r0(calculateMifflinStJeorBMR(b.sex!, b.w!, b.h!, b.a!)), { ...base,
    assumptions: [...b.assumptions, 'Resting energy expenditure: an activity factor is not applied.'] }), 'mifflin_st_jeor');
}

export function harrisBenedict(p: NutritionPatient, factors: { activity?: string; stress?: string } = {},
  config: NutritionConfig = C): EnergyEstimate {
  const b = basics(p, ['w', 'h', 'a', 'sex']);
  const act = factors.activity ? config.energy.activityFactors[factors.activity] : undefined;
  const str = factors.stress ? config.energy.stressFactors[factors.stress] : undefined;
  const sourceIds = ['rozaShizgal1984', 'canonicalEngine', ...(act ? [act.sourceId] : []), ...(str ? [str.sourceId] : [])];
  const base = { unit: 'kcal/day', method: 'Harris-Benedict (revised, Roza & Shizgal 1984) × activity × stress',
    formula: 'BEE × activity factor × stress factor', sourceIds,
    inputsUsed: { ...b.inputs, activityFactor: act?.factor ?? null, stressFactor: str?.factor ?? null } };
  const missing = [...b.missing];
  if (factors.activity && !act) missing.push(`activity factor "${factors.activity}" (not in config)`);
  if (factors.stress && !str) missing.push(`stress factor "${factors.stress}" (not in config)`);
  if (missing.length) return tag(notComputable(config, missing, base), 'harris_benedict');
  const bee = calculateHarrisBenedictBMR(b.sex!, b.w!, b.h!, b.a!);
  const warnings: string[] = [];
  if (!act || !str) warnings.push(`No ${[!act && 'activity', !str && 'stress'].filter(Boolean).join(' or ')} factor selected: that factor is not applied (value is closer to basal).`);
  const value = bee * (act?.factor ?? 1) * (str?.factor ?? 1);
  return tag(computed(config, r0(value), { ...base, inputsUsed: { ...base.inputsUsed, beeKcal: r0(bee) },
    assumptions: [...b.assumptions, ...(act ? [`Activity: ${act.label} (${act.factor}).`] : []), ...(str ? [`Stress: ${str.label} (${str.factor}).`] : [])],
    warnings }), 'harris_benedict');
}

/** Penn State equations for ventilated patients. 2010 is returned (and preferred) when age ≥ 60 and BMI ≥ 30. */
export function pennState(p: NutritionPatient, ctx: ClinicalContext, config: NutritionConfig = C): EnergyEstimate[] {
  const b = basics(p, ['w', 'h', 'a', 'sex']);
  const ve = positive(ctx.minuteVentilationLMin); const tmax = positive(ctx.tmaxC);
  const missing = [...b.missing, ...(ve === null ? ['minuteVentilationLMin'] : []), ...(tmax === null ? ['tmaxC'] : [])];
  const e03 = config.energy.pennState2003b; const e10 = config.energy.pennState2010;
  const inputsUsed = { ...b.inputs, minuteVentilationLMin: ve, tmaxC: tmax };
  const f = (c: typeof e03.value) => `Mifflin × ${c.terms.mifflinKcal} + VE × ${c.terms.minuteVentilationLMin} + Tmax × ${c.terms.tmaxC} ${c.intercept}`;
  const base03 = { unit: 'kcal/day', method: 'Penn State 2003b (ventilated)', formula: f(e03.value), sourceIds: [e03.sourceId, 'mifflin1990'], inputsUsed };
  const base10 = { unit: 'kcal/day', method: 'Penn State 2010 (ventilated, age ≥ 60 and BMI ≥ 30)', formula: f(e10.value), sourceIds: [e10.sourceId, 'mifflin1990'], inputsUsed };
  if (!ctx.ventilated) return [tag(notComputable(config, [], { ...base03, status: 'not_applicable', warnings: ['Penn State applies to mechanically ventilated patients.'] }), 'penn_state_2003b')];
  if (missing.length) return [tag(notComputable(config, missing, base03), 'penn_state_2003b')];

  const mif = calculateMifflinStJeorBMR(b.sex!, b.w!, b.h!, b.a!);
  const calc = (c: typeof e03.value) => c.intercept + c.terms.mifflinKcal * mif + c.terms.minuteVentilationLMin * ve! + c.terms.tmaxC * tmax!;
  const bmi = calculateBMI(b.w!, b.h!);
  const elderlyObese = bmi !== null && b.a! >= e10.value.appliesFromAgeYears && bmi >= e10.value.appliesFromBmi;
  const out: EnergyEstimate[] = [];
  const v03 = tag(computed(config, r0(calc(e03.value)), { ...base03, inputsUsed: { ...inputsUsed, mifflinKcal: r0(mif) }, assumptions: b.assumptions,
    warnings: elderlyObese ? ['Age ≥ 60 with BMI ≥ 30: Penn State 2010 is the validated version for this patient.'] : [] }), 'penn_state_2003b');
  out.push(v03);
  if (elderlyObese) {
    out.push({ ...tag(computed(config, r0(calc(e10.value)), { ...base10, inputsUsed: { ...inputsUsed, mifflinKcal: r0(mif), bmi }, assumptions: b.assumptions }), 'penn_state_2010') });
  }
  return out;
}

export function toronto(p: NutritionPatient, ctx: ClinicalContext, config: NutritionConfig = C): EnergyEstimate {
  const cfg = config.energy.toronto;
  const b = basics(p, ['w', 'h', 'a', 'sex']);
  const tbsa = positive(ctx.burns?.tbsaPercent); const intake = finite(ctx.previousDayIntakeKcal);
  const temp = positive(ctx.temperatureC); const pbd = finite(ctx.burns?.postBurnDay);
  const missing = [...b.missing, ...(tbsa === null ? ['burns.tbsaPercent'] : []), ...(intake === null ? ['previousDayIntakeKcal'] : []),
    ...(temp === null ? ['temperatureC'] : []), ...(pbd === null ? ['burns.postBurnDay'] : [])];
  const t = cfg.value.terms;
  const base = { unit: 'kcal/day', method: 'Toronto formula (burns)',
    formula: `${cfg.value.intercept} + ${t.tbsaPercent} × %TBSA + ${t.previousDayIntakeKcal} × prior-24h kcal + ${t.harrisBenedictKcal} × HB BEE + ${t.temperatureC} × T(°C) ${t.postBurnDay} × post-burn day`,
    sourceIds: [cfg.sourceId, cfg.value.harrisBenedictVariant === 'original_1919' ? 'harrisBenedict1919' : 'rozaShizgal1984'],
    inputsUsed: { ...b.inputs, tbsaPercent: tbsa, previousDayIntakeKcal: intake, temperatureC: temp, postBurnDay: pbd } };
  if (missing.length) return tag(notComputable(config, missing, base), 'toronto');
  let hb: number;
  if (cfg.value.harrisBenedictVariant === 'original_1919') {
    const k = config.energy.harrisBenedictOriginal.value[b.sex!];
    hb = k.intercept + k.terms.weightKg * b.w! + k.terms.heightCm * b.h! + k.terms.ageYears * b.a!;
  } else hb = calculateHarrisBenedictBMR(b.sex!, b.w!, b.h!, b.a!);
  const v = cfg.value.intercept + t.tbsaPercent * tbsa! + t.previousDayIntakeKcal * intake! + t.harrisBenedictKcal * hb
    + t.temperatureC * temp! + t.postBurnDay * pbd!;
  return tag(computed(config, r0(v), { ...base, inputsUsed: { ...base.inputsUsed, harrisBenedictKcal: r0(hb) },
    assumptions: [...b.assumptions, `HB BEE uses the ${cfg.value.harrisBenedictVariant === 'original_1919' ? 'original 1919' : 'revised 1984'} equation.`,
      'Recalculate daily: intake, temperature and post-burn day change.'] }), 'toronto');
}

export function curreri(p: NutritionPatient, ctx: ClinicalContext, config: NutritionConfig = C): EnergyEstimate {
  const cfg = config.energy.curreri.value;
  const w = positive(p.weightKg); const tbsa = positive(ctx.burns?.tbsaPercent);
  const base = { unit: 'kcal/day', method: 'Curreri (burns)',
    formula: `${cfg.kcalPerKg} × W + ${cfg.kcalPerTbsaPercent} × %TBSA (TBSA capped at ${cfg.tbsaCapPercent}%)`,
    sourceIds: [config.energy.curreri.sourceId], inputsUsed: { weightKg: w, tbsaPercent: tbsa } };
  const missing = [...(w === null ? ['weightKg'] : []), ...(tbsa === null ? ['burns.tbsaPercent'] : [])];
  if (missing.length) return tag(notComputable(config, missing, base), 'curreri');
  const used = Math.min(tbsa!, cfg.tbsaCapPercent);
  const warnings = ['Curreri is known to OVERESTIMATE energy requirements; prefer indirect calorimetry or Toronto.'];
  if (tbsa! > cfg.tbsaCapPercent) warnings.push(`TBSA ${tbsa}% capped at ${cfg.tbsaCapPercent}%.`);
  return tag(computed(config, r0(cfg.kcalPerKg * w! + cfg.kcalPerTbsaPercent * used), { ...base,
    inputsUsed: { ...base.inputsUsed, tbsaUsedPercent: used }, warnings }), 'curreri');
}

/**
 * Plain-number Curreri for callers that predate Estimates (burns services).
 * Same config and TBSA cap as curreri(); null when weight or TBSA is missing.
 */
export function curreriKcal(weightKg: number | null | undefined, tbsaPercent: number | null | undefined,
  config: NutritionConfig = C): number | null {
  const e = curreri({ weightKg }, { burns: { tbsaPercent } }, config);
  return typeof e.value === 'number' ? e.value : null;
}

/** ESPEN weight-based ICU target (non-obese): 20–25 kcal/kg early, rising to 25–30. */
export function icuEspen(p: NutritionPatient, ctx: ClinicalContext, config: NutritionConfig = C): EnergyEstimate {
  const cfg = config.energy.icuEspen.value;
  const w = positive(p.weightKg); const h = positive(p.heightCm); const day = finite(ctx.icuDay);
  const early = day === null || day <= cfg.earlyPhaseDays;
  const band = early ? cfg.earlyKcalPerKg : cfg.laterKcalPerKg;
  const base = { unit: 'kcal/day', method: `ICU weight-based (ESPEN), ${early ? 'early phase' : 'after early phase'}`,
    formula: `${band.low}–${band.high} kcal/kg actual body weight`, sourceIds: ['espenIcu2006', 'espenIcu2019'],
    inputsUsed: { weightKg: w, icuDay: day } };
  if (w === null) return tag(notComputable(config, ['weightKg'], base), 'icu_espen');
  const bmi = h ? calculateBMI(w, h) : null;
  const ob = config.energy.obesityAspen.value.class1to3.bmiFrom;
  if (bmi !== null && bmi >= ob) {
    return tag(notComputable(config, [], { ...base, status: 'not_applicable', warnings: [`BMI ${bmi} ≥ ${ob}: use the obesity (ASPEN) estimate.`] }), 'icu_espen');
  }
  const warnings: string[] = [];
  if (day === null) warnings.push('ICU day not given: early-phase range shown.');
  if (bmi === null) warnings.push('Height unknown, so obesity cannot be excluded: if BMI ≥ 30 use the ASPEN obesity estimate.');
  return tag(computed(config, { low: r0(band.low * w), high: r0(band.high * w) }, { ...base, warnings,
    assumptions: early ? ['Start at the lower end and progress over the first days; avoid overfeeding early.'] : [] }), 'icu_espen');
}

/** ASPEN 2016 critically ill obese: BMI 30–50 → 11–14 kcal/kg actual; BMI > 50 → 22–25 kcal/kg IBW. */
export function obesityAspen(p: NutritionPatient, config: NutritionConfig = C): EnergyEstimate {
  const cfg = config.energy.obesityAspen.value;
  const b = basics(p, ['w', 'h', 'sex']);
  const base = { unit: 'kcal/day', method: 'Critically ill obese (ASPEN 2016)',
    formula: `BMI ${cfg.class1to3.bmiFrom}–${cfg.class1to3.bmiTo}: ${cfg.class1to3.kcalPerKgActual.low}–${cfg.class1to3.kcalPerKgActual.high} kcal/kg actual; BMI > ${cfg.superObese.bmiAbove}: ${cfg.superObese.kcalPerKgIbw.low}–${cfg.superObese.kcalPerKgIbw.high} kcal/kg IBW`,
    sourceIds: [config.energy.obesityAspen.sourceId, 'devine1974'], inputsUsed: b.inputs };
  if (b.missing.length) return tag(notComputable(config, b.missing, base), 'obesity_aspen');
  const bmi = calculateBMI(b.w!, b.h!)!;
  const inputsUsed = { ...b.inputs, bmi };
  if (bmi < cfg.class1to3.bmiFrom) {
    return tag(notComputable(config, [], { ...base, inputsUsed, status: 'not_applicable', warnings: [`BMI ${bmi} < ${cfg.class1to3.bmiFrom}.`] }), 'obesity_aspen');
  }
  if (bmi <= cfg.class1to3.bmiTo) {
    const k = cfg.class1to3.kcalPerKgActual;
    return tag(computed(config, { low: r0(k.low * b.w!), high: r0(k.high * b.w!) }, { ...base, inputsUsed,
      formula: `${k.low}–${k.high} kcal/kg actual body weight`, assumptions: [...b.assumptions, 'Hypocaloric, high-protein strategy.'] }), 'obesity_aspen');
  }
  const ibw = calculateIdealBodyWeight(b.h!, b.sex!)!;
  const k = cfg.superObese.kcalPerKgIbw;
  return tag(computed(config, { low: r0(k.low * ibw), high: r0(k.high * ibw) }, { ...base, inputsUsed: { ...inputsUsed, ibwKg: ibw },
    formula: `${k.low}–${k.high} kcal/kg IBW`, assumptions: [...b.assumptions, 'Hypocaloric, high-protein strategy.'] }), 'obesity_aspen');
}

// ───────────────────────────── All applicable ─────────────────────────────

export interface EnergyRequest {
  patient: NutritionPatient;
  context?: ClinicalContext;
  harrisBenedictFactors?: { activity?: string; stress?: string };
}

/**
 * Every applicable estimate. `preferred` marks indirect calorimetry when
 * measured; otherwise Toronto in burns and Penn State when ventilated. The
 * clinician chooses — `preferred` is guidance, not a selection.
 */
export function estimateEnergy(req: EnergyRequest, config: NutritionConfig = C): EnergyEstimate[] {
  const ctx = req.context ?? {};
  const out: EnergyEstimate[] = [];
  if (positive(ctx.measuredEnergyKcal) !== null) out.push(indirectCalorimetry(ctx, config));
  out.push(mifflinStJeor(req.patient, config));
  out.push(harrisBenedict(req.patient, req.harrisBenedictFactors, config));
  if (ctx.ventilated) out.push(...pennState(req.patient, ctx, config));
  if (ctx.burns && positive(ctx.burns.tbsaPercent) !== null) {
    out.push(toronto(req.patient, ctx, config));
    out.push(curreri(req.patient, ctx, config));
  }
  if (ctx.setting === 'icu') {
    const espen = icuEspen(req.patient, ctx, config);
    if (espen.status !== 'not_applicable') out.push(espen);
    const aspen = obesityAspen(req.patient, config);
    if (aspen.status !== 'not_applicable') out.push(aspen);
  }

  const pick = (id: EnergyEstimate['id']) => out.find(e => e.id === id && e.status === 'computed');
  const preferred = pick('indirect_calorimetry') ?? pick('toronto') ?? pick('penn_state_2010') ?? pick('penn_state_2003b');
  if (preferred) preferred.preferred = true;
  return out;
}
