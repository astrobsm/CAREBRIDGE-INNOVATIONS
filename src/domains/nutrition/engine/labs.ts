/**
 * Laboratory-derived nutrition indices: nitrogen balance, prealbumin/CRP
 * ratio, and albumin unit normalisation.
 *
 * Units go through the shared converter (clinician-assistant engine/units.ts)
 * so a g/L albumin is never read as g/dL. A missing lab is missing: it is
 * never replaced with a normal value.
 */

import { toCanonical, UNIT_RULES, normaliseUnitToken } from '../../clinician-assistant/services/engine/units';
import { ANALYTE_BY_KEY } from '../../clinician-assistant/services/engine/referenceRanges';
import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, positive, finite, r1, r2, type Estimate } from './estimate';

const C = ACTIVE_NUTRITION_CONFIG;

/** True when the shared converter knows this unit for this analyte. */
export function unitRecognised(ruleKey: string, unit: string | null | undefined): boolean {
  if (!unit || !unit.trim()) return false;
  const rule = UNIT_RULES[ruleKey];
  return !!rule && rule.convert[normaliseUnitToken(unit)] !== undefined;
}

export interface LabValue {
  value: number | null | undefined;
  unit?: string | null;
}

// ───────────────────────────── Albumin ─────────────────────────────

export interface NormalisedAlbumin {
  gPerL: number | null;
  /** How the unit was decided. */
  unitBasis: 'stated' | 'inferred_from_magnitude' | 'missing' | 'implausible';
  note: string;
}

/**
 * Albumin in g/L. With a stated unit the shared converter is used. Without
 * one, a value under 10 can only be g/dL (albumin below 10 g/L is not
 * survivable), and 10 or more can only be g/L — so the unit is inferred and
 * the inference reported. Missing or implausible values return null.
 */
export function normaliseAlbumin(value: number | null | undefined, unit?: string | null): NormalisedAlbumin {
  const v = positive(value);
  if (v === null) return { gPerL: null, unitBasis: 'missing', note: 'Albumin not recorded.' };
  let gPerL: number; let unitBasis: NormalisedAlbumin['unitBasis']; let note: string;
  if (unit && unit.trim() && unitRecognised('albumin', unit)) {
    const c = toCanonical('albumin', v, unit);
    gPerL = c.value; unitBasis = 'stated'; note = `${v} ${unit} = ${c.value} g/L.`;
  } else {
    const why = unit && unit.trim() ? `Unit "${unit}" not recognised` : 'No unit';
    if (v < 10) { gPerL = v * 10; note = `${why}: ${v} read as g/dL (= ${gPerL} g/L).`; }
    else { gPerL = v; note = `${why}: ${v} read as g/L.`; }
    unitBasis = 'inferred_from_magnitude';
  }
  const pl = ANALYTE_BY_KEY.albumin?.plausible;
  if (pl && ((pl.low != null && gPerL < pl.low) || (pl.high != null && gPerL > pl.high))) {
    return { gPerL: null, unitBasis: 'implausible', note: `Albumin ${gPerL} g/L is outside the plausible range — check the value and unit.` };
  }
  return { gPerL: r1(gPerL), unitBasis, note };
}

// ───────────────────────────── Nitrogen balance ─────────────────────────────

export interface NitrogenBalanceInput {
  proteinIntakeG?: number | null;
  /** Urinary urea nitrogen, g/24 h. */
  uunGPerDay?: number | null;
  /** Alternative to UUN: 24-h urinary urea, mmol/day. */
  urinaryUreaMmolPerDay?: number | null;
  /** Optional measured or estimated nitrogen lost through wounds/exudate, g/day. */
  woundNitrogenLossG?: number | null;
  burnsOrHeavilyExudingWound?: boolean;
}

/** N balance (g/day) = protein ÷ 6.25 − (UUN + 4) − wound loss. */
export function nitrogenBalance(input: NitrogenBalanceInput, config: NutritionConfig = C): Estimate {
  const k = config.labs.nitrogen.value;
  const protein = finite(input.proteinIntakeG);
  let uun = finite(input.uunGPerDay);
  const assumptions: string[] = []; const warnings: string[] = [];
  const urea = finite(input.urinaryUreaMmolPerDay);
  if (uun === null && urea !== null) {
    uun = urea * k.ureaMmolToNitrogenG;
    assumptions.push(`UUN derived from urinary urea: ${urea} mmol × ${k.ureaMmolToNitrogenG} g/mmol = ${r2(uun)} g.`);
  }
  const wound = finite(input.woundNitrogenLossG);
  const base = { unit: 'g N/day', method: 'Nitrogen balance',
    formula: `protein (g) ÷ ${k.proteinToNitrogen} − (UUN (g) + ${k.insensibleLossG})${wound !== null ? ' − wound N loss (g)' : ''}`,
    sourceIds: [config.labs.nitrogen.sourceId], inputsUsed: { proteinIntakeG: protein, uunGPerDay: uun === null ? null : r2(uun), woundNitrogenLossG: wound } };
  if (input.burnsOrHeavilyExudingWound) {
    warnings.push(wound === null
      ? 'Burns / heavily exuding wound: exudate nitrogen losses are NOT included, so the balance is overestimated. Add a wound-loss term if available.'
      : 'Burns / heavily exuding wound: wound-loss term included; exudate losses are hard to measure and may still be underestimated.');
  }
  const missing = [...(protein === null ? ['proteinIntakeG'] : []), ...(uun === null ? ['uunGPerDay (or urinaryUreaMmolPerDay)'] : [])];
  if (missing.length) return notComputable(config, missing, { ...base, warnings });
  const v = protein! / k.proteinToNitrogen - (uun! + k.insensibleLossG) - (wound ?? 0);
  return computed(config, r1(v), { ...base, assumptions: [...assumptions, `Insensible/faecal losses assumed ${k.insensibleLossG} g/day.`], warnings });
}

// ───────────────────────────── Prealbumin / CRP ─────────────────────────────

export function prealbuminCrpRatio(prealbumin: LabValue, crp: LabValue, config: NutritionConfig = C): Estimate {
  const pv = finite(prealbumin.value); const cv = finite(crp.value);
  const base = { unit: 'ratio (mg/L ÷ mg/L)', method: 'Prealbumin/CRP ratio', formula: 'prealbumin (mg/L) ÷ CRP (mg/L)',
    sourceIds: [config.labs.prealbuminCrpRatioThreshold.sourceId], inputsUsed: { prealbumin: pv, prealbuminUnit: prealbumin.unit ?? null, crp: cv, crpUnit: crp.unit ?? null } };
  const missing = [...(pv === null ? ['prealbumin'] : []), ...(cv === null ? ['crp'] : []),
    ...(pv !== null && !unitRecognised('prealbumin', prealbumin.unit) ? ['prealbumin unit (mg/L, mg/dL or g/L)'] : []),
    ...(cv !== null && !unitRecognised('crp', crp.unit) ? ['crp unit (mg/L or mg/dL)'] : [])];
  if (missing.length) return notComputable(config, missing, base);
  const pa = toCanonical('prealbumin', pv!, prealbumin.unit!); const c = toCanonical('crp', cv!, crp.unit!);
  if (c.value <= 0) return notComputable(config, ['CRP above zero'], { ...base, warnings: ['CRP is zero or below detection: ratio undefined.'] });
  const threshold = config.labs.prealbuminCrpRatioThreshold.value;
  return computed(config, r2(pa.value / c.value), { ...base,
    inputsUsed: { ...base.inputsUsed, prealbuminMgL: pa.value, crpMgL: c.value },
    warnings: threshold === null ? ['No validated threshold configured: use for trend only.'] : [] });
}
