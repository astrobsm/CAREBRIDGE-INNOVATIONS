/**
 * Burns — pure assessment and plan for the /calculators hub.
 *
 * Fluids: calculationEngine.calculateParkland (ABA starting dose 2 mL/kg/%TBSA,
 * with classic Parkland 4 mL/kg/%TBSA as the upper bound).
 * Nutrition: burnCareService.calculateNutritionTargets — the consolidated
 * Curreri (TBSA capped at 50%) and burns protein from the nutrition config,
 * the same figures the Bedside Burns tab shows. The hub used to compute its
 * own (25 kcal/kg + 40 kcal/%TBSA uncapped; 1.5 g/kg + 3 g/%TBSA protein).
 * Prognosis: calculationEngine.calculateABSI's own survival band (the hub had
 * a second, shifted table under which a score of 8 read "<1% survival"), and
 * calculateBaux for the revised Baux score.
 *
 * ABSI CAVEAT: calculateABSI does not follow Tobiasen 1982 (age 1-8 bands
 * where Tobiasen has 1-5, male +1 where Tobiasen gives female +1, TBSA 1-11
 * where Tobiasen has 1-10), so its scores run several points high and its
 * survival bands read too pessimistic. The engine is shared with procedure
 * review and is not changed here; the score is shown with a warning and the
 * revised Baux score alongside. Owner decision.
 */
import { calculateABSI, calculateBaux, calculateParkland, toSex } from '../calculationEngine';
import { burnCareService } from '../../../clinician-assistant/services/burnCalculators';
import type { BurnsResult, PatientCalculatorInfo } from '../../types';
import { emptyPlan, field, finiteOrNull, section, sections, yesNo } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';

export type BodyPart = 'head' | 'chestAbdomen' | 'back' | 'rightArm' | 'leftArm' | 'genitalia' | 'rightLeg' | 'leftLeg';
export type BodyParts = Record<BodyPart, number>;
export type BurnDepth = 'superficial' | 'partial' | 'full';

export const ADULT_RULE_OF_NINES: Record<BodyPart, { name: string; percentage: number }> = {
  head: { name: 'Head & Neck', percentage: 9 },
  chestAbdomen: { name: 'Anterior Trunk (Chest & Abdomen)', percentage: 18 },
  back: { name: 'Posterior Trunk (Back)', percentage: 18 },
  rightArm: { name: 'Right Arm', percentage: 9 },
  leftArm: { name: 'Left Arm', percentage: 9 },
  genitalia: { name: 'Genitalia/Perineum', percentage: 1 },
  rightLeg: { name: 'Right Leg', percentage: 18 },
  leftLeg: { name: 'Left Leg', percentage: 18 },
};

export const CHILD_RULE_OF_NINES: Record<BodyPart, { name: string; percentage: number }> = {
  head: { name: 'Head & Neck', percentage: 18 },
  chestAbdomen: { name: 'Anterior Trunk', percentage: 18 },
  back: { name: 'Posterior Trunk', percentage: 18 },
  rightArm: { name: 'Right Arm', percentage: 9 },
  leftArm: { name: 'Left Arm', percentage: 9 },
  genitalia: { name: 'Genitalia/Perineum', percentage: 1 },
  rightLeg: { name: 'Right Leg', percentage: 13.5 },
  leftLeg: { name: 'Left Leg', percentage: 13.5 },
};

export const EMPTY_BODY_PARTS: BodyParts = {
  head: 0, chestAbdomen: 0, back: 0, rightArm: 0, leftArm: 0, genitalia: 0, rightLeg: 0, leftLeg: 0,
};

/** The paediatric chart applies under 10 years (as the hub always intended). */
export const isChildAge = (age: string | number | null | undefined): boolean => {
  const n = finiteOrNull(typeof age === 'number' ? age : age ?? '');
  return n !== null && n >= 0 && n < 10;
};

/** Every region held to its maximum on the chart in use (adult/child switch). */
export function clampBodyParts(parts: BodyParts, child: boolean): BodyParts {
  const chart = child ? CHILD_RULE_OF_NINES : ADULT_RULE_OF_NINES;
  const out = { ...parts };
  (Object.keys(chart) as BodyPart[]).forEach(k => { out[k] = Math.max(0, Math.min(parts[k] || 0, chart[k].percentage)); });
  return out;
}

export const tbsaOf = (parts: BodyParts) => Object.values(parts).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);

export interface BurnsInput {
  weight: string;
  age: string;
  isChild: boolean;
  timeSinceBurn: string;
  bodyParts: BodyParts;
  burnDepth: BurnDepth;
  inhalationInjury: boolean;
  gender: string;
}

export interface BurnsExtras {
  /** ABSI as computed by the shared engine — see the module caveat. */
  absiCaveat: string;
  revisedBaux: number;
  fluidTimingNote: string;
  nutritionFormula: string;
}

export const ABSI_CAVEAT =
  'ABSI here comes from the shared engine, whose scoring does not match Tobiasen (1982): its age, sex and TBSA points run high, so the survival band reads too pessimistic. Do not use it to counsel the family — use the revised Baux score and senior judgement.';

export function computeBurns(input: BurnsInput): { result: BurnsResult; extras: BurnsExtras } | { errors: string[] } {
  const errors: string[] = [];
  const weightKg = finiteOrNull(input.weight);
  const ageValue = finiteOrNull(input.age);
  const time = input.timeSinceBurn.trim() === '' ? 0 : finiteOrNull(input.timeSinceBurn);
  if (weightKg === null) errors.push('Enter the weight in kg.');
  else if (!(weightKg > 0 && weightKg <= 400)) errors.push('Weight should be between 1 and 400 kg.');
  if (ageValue === null) errors.push('Enter the age in years.');
  else if (ageValue < 0 || ageValue > 120) errors.push('Age should be between 0 and 120 years.');
  if (time === null || time < 0 || time > 72) errors.push('Time since burn should be between 0 and 72 hours.');
  const parts = clampBodyParts(input.bodyParts, input.isChild);
  const tbsa = tbsaOf(parts);
  if (!(tbsa > 0)) errors.push('Mark the burned area on at least one region — TBSA is 0%.');
  if (errors.length || weightKg === null || ageValue === null || time === null) return { errors };

  const { burnDepth, inhalationInjury } = input;
  const timeSince = time;
  const parkland = calculateParkland(weightKg, tbsa)!;
  const absi = calculateABSI(tbsa, ageValue, toSex(input.gender), burnDepth === 'full', inhalationInjury);
  const { revisedBaux } = calculateBaux(ageValue, tbsa, inhalationInjury);

  // Severity classification
  let severity: 'Minor' | 'Moderate' | 'Major' | 'Critical';
  if (tbsa < 10 && burnDepth !== 'full' && !inhalationInjury) severity = 'Minor';
  else if (tbsa < 20 && burnDepth !== 'full') severity = 'Moderate';
  else if (tbsa < 40) severity = 'Major';
  else severity = 'Critical';

  // Referral criteria
  const referralCriteria: string[] = [];
  if (tbsa >= 10) referralCriteria.push('TBSA ≥10%');
  if (burnDepth === 'full') referralCriteria.push('Full-thickness burns present');
  if (inhalationInjury) referralCriteria.push('Inhalation injury suspected');
  if (parts.genitalia > 0) referralCriteria.push('Perineal/genital burns');
  if (ageValue < 5 || ageValue > 55) referralCriteria.push('Age extremes (<5 or >55 years)');

  // Time since injury. The first half is due within 8 h of the BURN, not of
  // arrival. The hub used to subtract the volume "already given" at the full
  // rate — which is only true if fluid was running from the moment of injury.
  let fluidTimingNote = '';
  if (timeSince > 0 && timeSince < 8) {
    const remaining = 8 - timeSince;
    fluidTimingNote = `${timeSince} h since the burn: the first-8-hour volume (${parkland.first8Hours} mL) is due by hour 8. If no fluid has been given yet, give it over the remaining ${remaining} h (about ${Math.round(parkland.first8Hours / remaining)} mL/h); subtract any fluid already given.`;
  } else if (timeSince >= 8 && timeSince < 24) {
    fluidTimingNote = `${timeSince} h since the burn: the first-8-hour window has passed. Give whatever of the first-half volume is outstanding plus the second half over the time left to 24 h, with senior input, titrating to urine output.`;
  } else if (timeSince >= 24) {
    fluidTimingNote = 'More than 24 hours since the burn: the Parkland/ABA calculation covers the first 24 hours only. Plan ongoing fluid on losses, maintenance and urine output.';
  }

  const painManagement = burnDepth === 'superficial'
    ? ['Paracetamol 1g PO q6h', 'Ibuprofen 400mg PO q8h if no contraindications']
    : ['IV Morphine 0.1mg/kg titrated to pain control', 'OR Tramadol 50-100mg IV/IM q6h', 'Consider Ketamine 0.5-1mg/kg IV for dressing changes'];

  const nutrition = burnCareService.calculateNutritionTargets(weightKg, tbsa);

  const woundCare = burnDepth === 'superficial'
    ? ['Clean with normal saline', 'Apply Silver sulfadiazine 1% cream', 'Cover with non-adherent dressing', 'Change dressing daily']
    : burnDepth === 'partial'
      ? ['Debride loose skin', 'Clean with chlorhexidine 0.5%', 'Apply Silver sulfadiazine 1% or MEBO', 'Apply petrolatum gauze + absorbent layer', 'Change dressing every 2-3 days', 'Consider honey-based dressings if available']
      : ['Early surgical referral required', 'Escharotomy if circumferential', 'Tangential excision and grafting needed', 'Temporary coverage with biological dressings'];

  // Paediatric maintenance: 4-2-1 rule ADDED to resuscitation fluid for children.
  const isPaediatric = input.isChild || ageValue < 14;
  const maint421 = weightKg <= 10 ? 4 * weightKg : weightKg <= 20 ? 40 + 2 * (weightKg - 10) : 60 + (weightKg - 20);
  const monitoring = [
    `Urine output target: ${isPaediatric ? '1-2 mL/kg/h (paediatric)' : '0.5-1 mL/kg/h (adult)'} — titrate fluids to this endpoint`,
    'For HIGH-VOLTAGE ELECTRICAL injury or rhabdomyolysis (CK >5000): target UO 1-1.5 mL/kg/h; consider sodium bicarbonate to alkalinise urine pH >6.5',
    isPaediatric ? `Paediatric maintenance fluid (4-2-1 rule) IN ADDITION to resuscitation: ~${maint421.toFixed(0)} mL/h` : 'No additional maintenance for adults during first 24 h',
    'Vital signs (HR, BP, RR, SpO2, temp) every 1 h; arterial line if TBSA >20%',
    'Daily weights and strict fluid balance; monitor lactate q4h — falling lactate indicates adequate resuscitation',
    'FBC, U&E, creatinine, CK (if electrical), ABG, lactate every 6-12 h initially',
    'Capillary glucose 4-hourly in burns >20% TBSA (insulin resistance & hypermetabolic state)',
    `Calculated UO target range: ${Math.round((isPaediatric ? 1 : 0.5) * weightKg)}-${Math.round((isPaediatric ? 2 : 1) * weightKg)} mL/h`,
    'AVOID over-resuscitation ("fluid creep"): reduce hourly rate by 25% if UO consistently >1.5 mL/kg/h (adult) or >2 mL/kg/h (paeds)',
  ];
  if (inhalationInjury) {
    monitoring.unshift('Inhalation injury often needs more fluid than calculated — expect to titrate UP on urine output; the volumes shown are not pre-increased.');
  }

  const tetanus = tbsa > 5 || burnDepth !== 'superficial'
    ? 'Tetanus toxoid 0.5mL IM if not vaccinated in past 5 years. Give TIG 250-500 units if unknown vaccination status.'
    : 'Update tetanus vaccination if >5 years since last dose';

  const antibiotics = tbsa > 30 || burnDepth === 'full'
    ? 'Consider prophylactic antibiotics: Amoxicillin-clavulanate OR Ceftriaxone if signs of sepsis'
    : 'Prophylactic antibiotics not routinely recommended. Monitor for infection signs.';

  const result: BurnsResult = {
    tbsa,
    severity,
    parklandTotal: parkland.totalFluid24h,
    parklandFirst8Hours: parkland.first8Hours,
    parklandNext16Hours: parkland.next16Hours,
    hourlyRateFirst8: parkland.hourlyFirst8,
    hourlyRateNext16: parkland.hourlyNext16,
    absiScore: absi.score,
    absiMortality: absi.survival,
    recommendations: referralCriteria.length > 0 ? referralCriteria : ['Continue standard burn care'],
    resuscitationEndpoints: monitoring,
    parklandFluid: parkland,
    absiSurvival: absi.survival,
    absiPrognosis: absi.survival,
    referralCriteria,
    fluidAdjustment: fluidTimingNote,
    painManagement,
    woundCare,
    monitoring,
    tetanusRecommendation: tetanus,
    antibioticGuidance: antibiotics,
    nutritionNeeds: { calories: nutrition.caloriesPerDay, protein: nutrition.proteinPerDay },
    burnDepth,
    inhalationInjury,
  };
  return {
    result,
    extras: { absiCaveat: ABSI_CAVEAT, revisedBaux, fluidTimingNote, nutritionFormula: nutrition.formula },
  };
}

const REGION_NAME = ADULT_RULE_OF_NINES;

export function burnsReport(
  result: BurnsResult, extras: BurnsExtras,
  inputs: { weightKg: number; ageYears: number; timeSinceBurn: number; bodyParts: BodyParts; isChild: boolean; gender: string },
  patientInfo?: PatientCalculatorInfo,
): CalculatorReport {
  const p = result.parklandFluid!;
  const chart = inputs.isChild ? CHILD_RULE_OF_NINES : REGION_NAME;
  return {
    calculatorId: 'burns',
    calculatorName: 'Burns assessment',
    inputs: [
      field('Weight', inputs.weightKg, 'kg'),
      field('Age', inputs.ageYears, 'years', 0),
      { label: 'Sex', value: toSex(inputs.gender) === 'female' ? 'Female' : 'Male' },
      field('Time since burn', inputs.timeSinceBurn, 'h'),
      { label: 'Chart', value: inputs.isChild ? 'Paediatric rule of nines' : 'Adult rule of nines' },
      ...(Object.keys(chart) as BodyPart[]).filter(k => inputs.bodyParts[k] > 0).map(k => field(chart[k].name, inputs.bodyParts[k], '% TBSA')),
      { label: 'Depth', value: result.burnDepth ?? '—' },
      { label: 'Inhalation injury', value: yesNo(result.inhalationInjury) },
    ],
    results: [
      field('TBSA', result.tbsa, '%'),
      { label: 'Severity', value: result.severity },
      field('24-h fluid, ABA starting dose (2 mL/kg/%TBSA)', p.totalFluid24h, 'mL', 0),
      field('Classic Parkland upper bound (4 mL/kg/%TBSA)', p.parklandUpperBound24h, 'mL', 0),
      { label: 'First 8 h', value: `${p.first8Hours} mL (${p.hourlyFirst8} mL/h)` },
      { label: 'Next 16 h', value: `${p.next16Hours} mL (${p.hourlyNext16} mL/h)` },
      field('Revised Baux', extras.revisedBaux, '', 0),
      { label: 'ABSI (engine — see caveat)', value: `${result.absiScore} (${result.absiSurvival})` },
      field('Energy', result.nutritionNeeds?.calories ?? null, 'kcal/day', 0),
      field('Protein', result.nutritionNeeds?.protein ?? null, 'g/day', 1),
    ],
    notes: [extras.absiCaveat, `Nutrition: ${extras.nutritionFormula}.`],
    plan: emptyPlan({
      sections: sections(
        section('Fluid resuscitation (Lactated Ringer\'s / Hartmann\'s)', [
          `Start at ${p.totalFluid24h} mL over 24 h (ABA 2 mL/kg/%TBSA): ${p.first8Hours} mL in the first 8 h from injury, ${p.next16Hours} mL over the next 16 h. Classic Parkland upper bound ${p.parklandUpperBound24h} mL.`,
          extras.fluidTimingNote,
          'Titrate the hourly rate to urine output; the formula sets the starting rate only.',
        ]),
        section('Burns centre referral criteria met', result.referralCriteria ?? [], 'warn'),
        section('Wound care', result.woundCare ?? []),
        section('Pain management', result.painManagement ?? []),
        section('Tetanus', [result.tetanusRecommendation]),
        section('Antibiotics', [result.antibioticGuidance]),
        section('Nutrition', [`${result.nutritionNeeds?.calories} kcal/day and ${result.nutritionNeeds?.protein} g protein/day (${extras.nutritionFormula}).`]),
      ),
      monitoring: result.monitoring ?? [],
    }),
    patient: patientInfoToReportPatient(patientInfo, { weightKg: inputs.weightKg, ageYears: inputs.ageYears }),
  };
}
