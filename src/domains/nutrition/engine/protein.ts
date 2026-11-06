/**
 * Protein requirements by clinical context. Ranges come from config.
 *
 * Weight basis: actual body weight, except the obese critically ill (IBW, per
 * ASPEN) and obese ward patients (adjusted body weight, local policy). The
 * basis used is always stated in the output.
 */

import { calculateBMI, calculateIdealBodyWeight, calculateAdjustedBodyWeight } from '../../calculators/engine/calculationEngine';
import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig, NumericRange } from './config/types';
import { computed, notComputable, positive, r0, type Estimate, type Range } from './estimate';
import { catabolicStates, type ClinicalContext, type NutritionPatient } from './types';

const C = ACTIVE_NUTRITION_CONFIG;

export interface ProteinEstimate extends Estimate<number | Range> {
  id: 'ward' | 'icu' | 'burns_wounds' | 'obese_icu' | 'ckd_non_dialysis';
  /** g/kg/day applied, and the weight it was applied to. */
  gPerKg: NumericRange | { low: number; high: null };
  weightBasis: 'actual' | 'ideal' | 'adjusted' | null;
}

export interface ProteinRequest {
  patient: NutritionPatient;
  context?: ClinicalContext;
}

export function estimateProtein(req: ProteinRequest, config: NutritionConfig = C): ProteinEstimate[] {
  const p = req.patient; const ctx = req.context ?? {};
  const w = positive(p.weightKg); const h = positive(p.heightCm);
  const sex = p.sex === 'male' || p.sex === 'female' ? p.sex : null;
  const bmi = w && h ? calculateBMI(w, h) : null;
  const P = config.protein;
  const catabolic = catabolicStates(ctx);
  const burnsOrWound = catabolic.includes('burns') || !!ctx.largeOrHeavilyExudingWound || !!ctx.majorWound;
  const inputsUsed = { weightKg: w, heightCm: h, sex, bmi, setting: ctx.setting ?? null };
  const assumptions = p.weightSource && p.weightSource !== 'measured' ? [`Weight is ${p.weightSource}, not measured.`] : [];

  const make = (id: ProteinEstimate['id'], method: string, gPerKg: ProteinEstimate['gPerKg'], basis: ProteinEstimate['weightBasis'],
    basisKg: number | null, sourceIds: string[], extra: { warnings?: string[]; assumptions?: string[]; missing?: string[] } = {}): ProteinEstimate => {
    const formula = `${gPerKg.high === null ? `≥ ${gPerKg.low}` : `${gPerKg.low}–${gPerKg.high}`} g/kg/day × ${basis ?? 'weight'} body weight`;
    const base = { unit: 'g/day', method, formula, sourceIds, inputsUsed: { ...inputsUsed, weightBasisKg: basisKg } };
    if (basisKg === null) {
      return { ...notComputable<number | Range>(config, extra.missing ?? ['weightKg'], { ...base, warnings: extra.warnings }), id, gPerKg, weightBasis: basis };
    }
    const value: number | Range = gPerKg.high === null ? r0(gPerKg.low * basisKg) : { low: r0(gPerKg.low * basisKg), high: r0(gPerKg.high * basisKg) };
    return { ...computed<number | Range>(config, value, { ...base, warnings: extra.warnings,
      assumptions: [...assumptions, ...(extra.assumptions ?? []), ...(gPerKg.high === null ? ['Minimum target, not a ceiling.'] : [])] }), id, gPerKg, weightBasis: basis };
  };

  const ibw = h && sex ? calculateIdealBodyWeight(h, sex) : null;
  const adj = w && h && sex ? calculateAdjustedBodyWeight(w, h, sex) : null;
  const obeseFrom = P.wardObeseAdjustedFromBmi.value;
  const obese = bmi !== null && bmi >= obeseFrom;
  const obesityUnknownWarn = w && bmi === null ? ['Height unknown: obesity cannot be excluded, so the weight basis may be wrong.'] : [];

  // ICU
  if (ctx.setting === 'icu') {
    if (obese) {
      const g = bmi! >= 40 ? P.obeseIcu.value.bmiFrom40GPerKgIbw : P.obeseIcu.value.bmi30to40GPerKgIbw;
      return [make('obese_icu', `Critically ill obese, BMI ${bmi} (ASPEN 2016)`, { low: g, high: null }, 'ideal', ibw,
        [P.obeseIcu.sourceId, 'devine1974'], { missing: ['sex'], assumptions: [`IBW ${ibw} kg.`] })];
    }
    const out = [make('icu', 'Critically ill (ESPEN 2019)', { low: P.icu.value.minGPerKg, high: null }, 'actual', w, [P.icu.sourceId],
      { warnings: obesityUnknownWarn })];
    if (burnsOrWound) out.push(make('burns_wounds', 'Burns / large or heavily exuding wounds', P.burnsAndLargeWounds.value, 'actual', w, [P.burnsAndLargeWounds.sourceId]));
    return out;
  }

  // Ward / outpatient
  const wardBasis: ProteinEstimate['weightBasis'] = obese ? 'adjusted' : 'actual';
  const wardKg = obese ? adj : w;
  const wardExtra = { warnings: obesityUnknownWarn, assumptions: obese ? [`BMI ${bmi} ≥ ${obeseFrom}: adjusted body weight ${adj} kg used.`] : [], missing: obese ? ['sex'] : ['weightKg'] };

  if (burnsOrWound) {
    return [make('burns_wounds', 'Burns / large or heavily exuding wounds', P.burnsAndLargeWounds.value, wardBasis, wardKg,
      [P.burnsAndLargeWounds.sourceId, ...(obese ? [P.wardObeseAdjustedFromBmi.sourceId] : [])], wardExtra)];
  }
  if (ctx.ckdNonDialysis) {
    if (catabolic.length) {
      const e = make('ward', 'Hospital ward', P.ward.value, wardBasis, wardKg, [P.ward.sourceId], wardExtra);
      e.warnings.push(`CKD with a catabolic state (${catabolic.join(', ')}): protein NOT reduced — physician to confirm.`);
      return [e];
    }
    const range = ctx.diabetes ? P.ckdNonDialysis.value.diabetic : P.ckdNonDialysis.value.nonDiabetic;
    const e = make('ckd_non_dialysis', `CKD not on dialysis, metabolically stable${ctx.diabetes ? ', with diabetes' : ''} (KDOQI 2020)`,
      range, wardBasis, wardKg, [P.ckdNonDialysis.sourceId], wardExtra);
    e.warnings.unshift('Reduced protein for CKD: physician to confirm.');
    return [e];
  }
  return [make('ward', 'Hospital ward', P.ward.value, wardBasis, wardKg,
    [P.ward.sourceId, ...(obese ? [P.wardObeseAdjustedFromBmi.sourceId] : [])], wardExtra)];
}
