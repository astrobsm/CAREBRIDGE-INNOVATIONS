/**
 * Wound-clinic nutrition targets and paediatric nutrition screening.
 *
 * The practice's Wound Clinic Protocol ("Protein and calories come first")
 * gives the energy, protein and fluid targets by group; this is the one place
 * those numbers are turned into a patient's figures. Children's fluid uses
 * Holliday–Segar and children are screened with STRONGkids, both as the
 * protocol asks. Numbers come from config (woundProtocol, hollidaySegar,
 * strongKids), never from here.
 *
 * STRONGkids is new to this engine: pending clinical validation in this
 * practice, like the rest of config v1.
 */

import { ACTIVE_NUTRITION_CONFIG } from './config';
import type { NutritionConfig } from './config/types';
import { computed, notComputable, positive, r0, type Estimate, type Range } from './estimate';

const C = ACTIVE_NUTRITION_CONFIG;

export type WoundNutritionGroup = 'adult_chronic' | 'adult_major_burn' | 'child';

export interface WoundTargetInput {
  ageYears?: number | null;
  weightKg?: number | null;
  /** Large or deep wound: adult protein "up to 2 g/kg". */
  largeOrDeepWound?: boolean;
  majorBurn?: boolean;
  /** eGFR low and not on dialysis: the protocol says reduce protein, with the physician / dietitian. */
  ckdNonDialysis?: boolean;
  /** For a child: the age-based energy requirement (kcal/day) from a paediatric reference or dietitian. */
  childAgeBasedKcal?: number | null;
}

export interface WoundTargets {
  group: WoundNutritionGroup | null;
  energy: Estimate<Range>;
  protein: Estimate<Range>;
  fluid: Estimate<Range>;
  /** Protocol notes that always travel with the figures. */
  notes: string[];
}

export function woundNutritionGroup(i: Pick<WoundTargetInput, 'ageYears' | 'majorBurn'>, config: NutritionConfig = C): WoundNutritionGroup | null {
  const age = typeof i.ageYears === 'number' && Number.isFinite(i.ageYears) ? i.ageYears : null;
  if (age === null) return null;
  if (age < config.woundProtocol.value.adultFromYears) return 'child';
  return i.majorBurn ? 'adult_major_burn' : 'adult_chronic';
}

/** Holliday–Segar maintenance fluid, mL/day. */
export function hollidaySegarMl(weightKg: number, config: NutritionConfig = C): number {
  const h = config.hollidaySegar.value;
  const first = Math.min(weightKg, 10) * h.first10;
  const next = Math.min(Math.max(weightKg - 10, 0), 10) * h.next10;
  const rest = Math.max(weightKg - 20, 0) * h.above20;
  return r0(first + next + rest);
}

export function woundNutritionTargets(i: WoundTargetInput, config: NutritionConfig = C): WoundTargets {
  const P = config.woundProtocol.value;
  const src = [config.woundProtocol.sourceId];
  const w = positive(i.weightKg);
  const group = woundNutritionGroup(i, config);
  const inputsUsed = { weightKg: w, ageYears: i.ageYears ?? null, group, largeOrDeepWound: !!i.largeOrDeepWound, ckdNonDialysis: !!i.ckdNonDialysis };
  const notes: string[] = [
    'No vitamin makes up for too little protein and energy.',
    'Local foods that help: eggs, beans and moi moi, fish (including crayfish and stockfish), chicken, milk, groundnuts, and soya.',
    'Use a high-protein drink between meals if intake stays poor.',
  ];
  if (i.ckdNonDialysis) notes.push('Kidney disease: reduce protein if eGFR is low and not on dialysis; involve the physician or dietitian.');

  const none = (unit: string, method: string, formula: string, missing: string[], extra: string[] = []) =>
    notComputable<Range>(config, missing, { unit, method, formula, sourceIds: src, inputsUsed, warnings: extra });

  if (group === null) {
    const m = ['ageYears'];
    return {
      group, notes,
      energy: none('kcal/day', 'Wound protocol energy', 'by age group', m),
      protein: none('g/day', 'Wound protocol protein', 'by age group', m),
      fluid: none('mL/day', 'Wound protocol fluid', 'by age group', m),
    };
  }

  if (group === 'child') {
    const up = P.child.energyUpliftPercent;
    const base = positive(i.childAgeBasedKcal);
    const energy = base === null
      ? none('kcal/day', 'Child, wound or malnourished: age-based needs plus 10–20%', `age-based requirement × ${1 + up.low / 100}–${1 + up.high / 100}`,
        ['childAgeBasedKcal'], ['Age-based energy needs are not configured in this engine: take them from the paediatric reference or the dietitian.'])
      : computed<Range>(config, { low: r0(base * (1 + up.low / 100)), high: r0(base * (1 + up.high / 100)) },
        { unit: 'kcal/day', method: 'Child, wound or malnourished: age-based needs plus 10–20%', formula: `${base} kcal × ${1 + up.low / 100}–${1 + up.high / 100}`, sourceIds: src, inputsUsed });
    const protein = w === null
      ? none('g/day', 'Child, wound or malnourished', `${P.child.proteinGPerKg.low}–${P.child.proteinGPerKg.high} g/kg/day`, ['weightKg'])
      : computed<Range>(config, { low: r0(P.child.proteinGPerKg.low * w), high: r0(P.child.proteinGPerKg.high * w) }, {
        unit: 'g/day', method: 'Child, wound or malnourished', formula: `about ${P.child.proteinGPerKg.low}–${P.child.proteinGPerKg.high} g/kg/day × ${w} kg`,
        sourceIds: src, inputsUsed, assumptions: ['Higher in infants and burns (protocol).'],
      });
    const fluid = w === null
      ? none('mL/day', 'Per weight (Holliday–Segar)', '100 / 50 / 20 mL/kg/day', ['weightKg'])
      : computed<Range>(config, { low: hollidaySegarMl(w, config), high: hollidaySegarMl(w, config) }, {
        unit: 'mL/day', method: 'Per weight (Holliday–Segar)', formula: '100 mL/kg for the first 10 kg, 50 mL/kg for the next 10 kg, 20 mL/kg above 20 kg',
        sourceIds: [...src, config.hollidaySegar.sourceId], inputsUsed,
      });
    return { group, energy, protein, fluid, notes };
  }

  if (group === 'adult_major_burn') {
    const g = P.adultMajorBurn.proteinGPerKg;
    return {
      group, notes,
      energy: none('kcal/day', 'Adult, major burn', 'Specialist estimate (often higher)', [], ['Specialist estimate (often higher): use the burns energy calculator / dietitian.']),
      protein: w === null ? none('g/day', 'Adult, major burn', `${g.low}–${g.high} g/kg/day`, ['weightKg'])
        : computed<Range>(config, { low: r0(g.low * w), high: r0(g.high * w) }, { unit: 'g/day', method: 'Adult, major burn', formula: `${g.low}–${g.high} g/kg/day × ${w} kg`, sourceIds: src, inputsUsed }),
      fluid: none('mL/day', 'Adult, major burn', 'Per burn protocol', [], ['Per burn protocol (resuscitation and losses are not a maintenance figure).']),
    };
  }

  // Adult, chronic wound or malnourished.
  const A = P.adultChronic;
  if (w === null) {
    return {
      group, notes,
      energy: none('kcal/day', 'Adult, chronic wound or malnourished', `${A.kcalPerKg.low}–${A.kcalPerKg.high} kcal/kg/day`, ['weightKg']),
      protein: none('g/day', 'Adult, chronic wound or malnourished', `${A.proteinGPerKg.low}–${A.proteinGPerKg.high} g/kg/day`, ['weightKg']),
      fluid: none('mL/day', 'Adult, chronic wound or malnourished', `about ${A.fluidMlPerKcal} mL/kcal/day`, ['weightKg']),
    };
  }
  const kcal = { low: r0(A.kcalPerKg.low * w), high: r0(A.kcalPerKg.high * w) };
  const proteinHigh = i.largeOrDeepWound ? A.proteinLargeDeepUpToGPerKg : A.proteinGPerKg.high;
  const proteinWarnings = i.ckdNonDialysis ? ['Kidney disease: reduce protein if eGFR is low and not on dialysis; involve the physician or dietitian.'] : [];
  return {
    group, notes,
    energy: computed<Range>(config, kcal, { unit: 'kcal/day', method: 'Adult, chronic wound or malnourished', formula: `${A.kcalPerKg.low}–${A.kcalPerKg.high} kcal/kg/day × ${w} kg`, sourceIds: [...src, 'npiap2019'], inputsUsed }),
    protein: computed<Range>(config, { low: r0(A.proteinGPerKg.low * w), high: r0(proteinHigh * w) }, {
      unit: 'g/day', method: 'Adult, chronic wound or malnourished',
      formula: `${A.proteinGPerKg.low}–${proteinHigh} g/kg/day × ${w} kg${i.largeOrDeepWound ? ' (up to 2 g/kg for large or deep wounds)' : ''}`,
      sourceIds: [...src, 'npiap2019'], inputsUsed, warnings: proteinWarnings,
    }),
    fluid: computed<Range>(config, { low: r0(kcal.low * A.fluidMlPerKcal), high: r0(kcal.high * A.fluidMlPerKcal) }, {
      unit: 'mL/day', method: 'Adult, chronic wound or malnourished', formula: `about ${A.fluidMlPerKcal} mL/kcal/day`, sourceIds: src, inputsUsed,
      warnings: i.ckdNonDialysis ? ['CKD: fluid allowance may need restriction — clinician review.'] : [],
    }),
  };
}

// ── STRONGkids ─────────────────────────────────────────────────────────────

export interface StrongKidsInput {
  ageYears?: number | null;
  /** Underlying illness with a risk of malnutrition, or expected major surgery. */
  highRiskDisease?: boolean | null;
  /** Poor nutritional status on subjective clinical assessment (wasting, reduced fat / muscle, hollow face). */
  poorNutritionalStatus?: boolean | null;
  /** Diarrhoea (≥ 5 a day), vomiting (> 3 a day), reduced intake, earlier nutritional intervention, or unable to eat enough because of pain. */
  intakeOrLosses?: boolean | null;
  /** Weight loss, or no weight gain in an infant under 1 year, in recent weeks or months. */
  weightLossOrNoGain?: boolean | null;
}

export interface StrongKidsResult {
  score: number;
  risk: 'low' | 'medium' | 'high';
  action: string;
}

const STRONG_ITEMS = ['highRiskDisease', 'poorNutritionalStatus', 'intakeOrLosses', 'weightLossOrNoGain'] as const;

export function screenStrongKids(i: StrongKidsInput, config: NutritionConfig = C): Estimate<StrongKidsResult> {
  const S = config.strongKids.value;
  const base = { unit: 'score', method: 'STRONGkids nutritional risk screening', formula: 'disease 2 + status 1 + intake/losses 1 + weight 1 (0–5)', sourceIds: [config.strongKids.sourceId] };
  const age = typeof i.ageYears === 'number' && Number.isFinite(i.ageYears) ? i.ageYears : null;
  if (age !== null && (age < 1 / 12 || age >= 18)) {
    return notComputable(config, [], { ...base, status: 'not_applicable', warnings: ['STRONGkids is for children aged 1 month to 17 years (use MUST for adults).'] });
  }
  const missing = STRONG_ITEMS.filter(k => i[k] == null);
  if (missing.length) return notComputable(config, missing, base);
  const score = (i.highRiskDisease ? S.points.highRiskDisease : 0) + (i.poorNutritionalStatus ? S.points.poorNutritionalStatus : 0)
    + (i.intakeOrLosses ? S.points.intakeOrLosses : 0) + (i.weightLossOrNoGain ? S.points.weightLossOrNoGain : 0);
  const risk = score <= S.bands.lowMax ? 'low' : score <= S.bands.mediumMax ? 'medium' : 'high';
  const action = risk === 'high' ? 'High risk: consult the doctor and dietitian for a full diagnosis and an individual nutrition plan; check weight twice a week.'
    : risk === 'medium' ? 'Medium risk: consider nutritional intervention; check weight twice a week and re-screen after 1 week.'
      : 'Low risk: no intervention; check weight regularly and re-screen weekly.';
  return computed(config, { score, risk, action }, { ...base, inputsUsed: Object.fromEntries(STRONG_ITEMS.map(k => [k, !!i[k]])),
    assumptions: ['STRONGkids is pending clinical validation in this practice.'] });
}
