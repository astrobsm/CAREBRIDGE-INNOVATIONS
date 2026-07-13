// ---------------------------------------------------------------------------
// CareBridge Shared Clinical Calculation Engine
// ---------------------------------------------------------------------------
// A single source of truth for clinical formulas used across Calculators,
// Treatment Planning and Surgical Planning. All functions here are PURE
// (no React, no side effects) so they can be unit-tested and reused anywhere.
//
// Formulas are extracted faithfully from the existing standalone calculators
// so results remain identical. Existing calculators can be migrated onto this
// engine incrementally to eliminate duplicate logic.
// ---------------------------------------------------------------------------

export type Sex = 'male' | 'female';
export type CalcGender = 'male' | 'female' | 'elderly-male' | 'elderly-female';

/** Normalise the app's gender values to a simple biological sex for formulas. */
export function toSex(gender: CalcGender | string | undefined): Sex {
  return gender === 'female' || gender === 'elderly-female' ? 'female' : 'male';
}

/** Safely parse a numeric input (string | number) → number | null. */
export function num(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// ===========================================================================
// Anthropometry
// ===========================================================================

/** Body Mass Index (kg/m²). Returns null if inputs are invalid. */
export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  if (heightM <= 0) return null;
  return round(weightKg / (heightM * heightM), 1);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 16) return 'Severe underweight';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese (Class I)';
  if (bmi < 40) return 'Obese (Class II)';
  return 'Obese (Class III)';
}

/** Devine ideal body weight (kg). heightCm required. */
export function calculateIdealBodyWeight(heightCm: number, sex: Sex): number | null {
  if (!heightCm) return null;
  const heightIn = heightCm / 2.54;
  const base = sex === 'male' ? 50 : 45.5;
  const ibw = base + 2.3 * (heightIn - 60);
  return round(Math.max(ibw, 0), 1);
}

/** Adjusted body weight (kg) — used for drug/nutrition dosing in obesity. */
export function calculateAdjustedBodyWeight(
  actualWeightKg: number,
  heightCm: number,
  sex: Sex
): number | null {
  const ibw = calculateIdealBodyWeight(heightCm, sex);
  if (ibw === null || !actualWeightKg) return null;
  if (actualWeightKg <= ibw) return round(actualWeightKg, 1);
  return round(ibw + 0.4 * (actualWeightKg - ibw), 1);
}

// ===========================================================================
// Caprini VTE (DVT) risk score
// ===========================================================================

export interface CapriniInput {
  age: number;
  // 1-point factors
  minorSurgery?: boolean;
  bmiOver30?: boolean;
  swollenLegs?: boolean;
  varicoseVeins?: boolean;
  pregnancy?: boolean;
  postpartum?: boolean;
  ocpOrHrt?: boolean;
  bedRestMedical?: boolean;
  plasterCast?: boolean;
  sepsis?: boolean;
  lungDisease?: boolean;
  acuteMI?: boolean;
  chf?: boolean;
  inflammatoryBowelDisease?: boolean;
  // 2-point factors
  arthroscopicSurgery?: boolean;
  majorSurgeryOver45min?: boolean;
  laparoscopicOver45min?: boolean;
  centralVenousAccess?: boolean;
  bedriddenOver72h?: boolean;
  paralysis?: boolean;
  cancer?: boolean;
  // extra with cancer
  onChemotherapy?: boolean;
  // 3-point factors
  previousDVTorPE?: boolean;
  familyHistoryThrombosis?: boolean;
  thrombophilia?: boolean;
  elevatedHomocysteine?: boolean;
  heparinInducedThrombocytopenia?: boolean;
  // 5-point factors
  stroke?: boolean;
  electiveArthroplasty?: boolean;
  hipPelvisLegFracture?: boolean;
  acuteSpinalCordInjury?: boolean;
}

export interface CapriniResult {
  score: number;
  riskLevel: string;
  riskPercentage: string;
  recommendation: string;
}

export function calculateCapriniScore(input: CapriniInput): CapriniResult {
  let score = 0;
  const add = (cond: boolean | undefined, points: number) => {
    if (cond) score += points;
  };

  const age = input.age || 0;
  if (age >= 41 && age <= 60) score += 1;
  else if (age >= 61 && age <= 74) score += 2;
  else if (age >= 75) score += 3;

  // 1-point
  add(input.minorSurgery, 1);
  add(input.bmiOver30, 1);
  add(input.swollenLegs, 1);
  add(input.varicoseVeins, 1);
  add(input.pregnancy, 1);
  add(input.postpartum, 1);
  add(input.ocpOrHrt, 1);
  add(input.bedRestMedical, 1);
  add(input.plasterCast, 1);
  add(input.sepsis, 1);
  add(input.lungDisease, 1);
  add(input.acuteMI, 1);
  add(input.chf, 1);
  add(input.inflammatoryBowelDisease, 1);
  // 2-point
  add(input.arthroscopicSurgery, 2);
  add(input.majorSurgeryOver45min, 2);
  add(input.laparoscopicOver45min, 2);
  add(input.centralVenousAccess, 2);
  add(input.bedriddenOver72h, 2);
  add(input.paralysis, 2);
  // cancer (2) + chemo (1)
  if (input.cancer) {
    score += 2;
    if (input.onChemotherapy) score += 1;
  }
  // 3-point
  add(input.previousDVTorPE, 3);
  add(input.familyHistoryThrombosis, 3);
  add(input.thrombophilia, 3);
  add(input.elevatedHomocysteine, 3);
  add(input.heparinInducedThrombocytopenia, 3);
  // 5-point
  add(input.stroke, 5);
  add(input.electiveArthroplasty, 5);
  add(input.hipPelvisLegFracture, 5);
  add(input.acuteSpinalCordInjury, 5);

  let riskLevel: string;
  let riskPercentage: string;
  let recommendation: string;
  if (score === 0) {
    riskLevel = 'Very Low Risk';
    riskPercentage = '<0.5% VTE risk';
    recommendation = 'Early ambulation only; no pharmacological prophylaxis needed.';
  } else if (score <= 2) {
    riskLevel = 'Low Risk';
    riskPercentage = '~1.5% VTE risk';
    recommendation = 'Mechanical prophylaxis (GCS or IPC); early ambulation.';
  } else if (score <= 4) {
    riskLevel = 'Moderate Risk';
    riskPercentage = '~3% VTE risk';
    recommendation = 'Pharmacological (LMWH e.g. enoxaparin 40mg SC daily) + mechanical prophylaxis. Assess bleeding risk.';
  } else if (score <= 8) {
    riskLevel = 'High Risk';
    riskPercentage = '~6% VTE risk';
    recommendation = 'Combined pharmacological + mechanical prophylaxis; consider extended prophylaxis for major/cancer surgery.';
  } else {
    riskLevel = 'Highest Risk';
    riskPercentage = '>6% VTE risk';
    recommendation = 'Aggressive combined prophylaxis; extended duration (28-35 days) for major orthopaedic/cancer surgery. Close DVT/PE surveillance.';
  }

  return { score, riskLevel, riskPercentage, recommendation };
}

// ===========================================================================
// Nutrition (Harris-Benedict / Mifflin-St Jeor, protein & fluid needs)
// ===========================================================================

export interface NutritionInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
  activityFactor?: number; // default 1.2 (bedridden)
  stressFactor?: number; // default 1.0
  proteinFactor?: number; // g/kg/day, default 1.0
  burnsTBSA?: number; // if provided, drives burns fluid + stress
  malnourished?: boolean;
}

export interface NutritionResult {
  bmr: number; // Harris-Benedict
  mifflinBmr: number;
  tdee: number; // total daily energy expenditure (kcal)
  proteinGramsPerDay: number;
  fluidMlPerDay: number;
  proteinCalories: number;
  fatGrams: number;
  carbGrams: number;
}

/** Basal metabolic rate — Harris-Benedict (revised) equation (kcal/day). */
export function calculateHarrisBenedictBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  return sex === 'male'
    ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears
    : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears;
}

/** Basal metabolic rate — Mifflin-St Jeor equation (kcal/day). */
export function calculateMifflinStJeorBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  return sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
}

export function calculateNutrition(input: NutritionInput): NutritionResult {
  const { weightKg, heightCm, ageYears, sex } = input;
  const activityFactor = input.activityFactor ?? 1.2;
  let stressFactor = input.stressFactor ?? 1.0;

  const bmr = calculateHarrisBenedictBMR(sex, weightKg, heightCm, ageYears);
  const mifflinBmr = calculateMifflinStJeorBMR(sex, weightKg, heightCm, ageYears);

  if (input.burnsTBSA && input.burnsTBSA > 0) {
    stressFactor = 1 + input.burnsTBSA * 0.02; // +2% per %TBSA
  }

  let tdee = bmr * activityFactor * stressFactor;
  if (input.malnourished) tdee *= 1.2;

  const proteinFactor = input.proteinFactor ?? 1.0;
  const proteinGramsPerDay = Math.round(proteinFactor * weightKg);

  let fluidMlPerDay = Math.round(30 * weightKg);
  if (input.burnsTBSA && input.burnsTBSA > 0) {
    fluidMlPerDay = Math.round(4 * weightKg * input.burnsTBSA + weightKg * 30);
  }

  const proteinCalories = proteinGramsPerDay * 4;
  const remaining = Math.round(tdee) - proteinCalories;
  const fatCalories = Math.round(remaining * 0.3);
  const carbCalories = remaining - fatCalories;

  return {
    bmr: Math.round(bmr),
    mifflinBmr: Math.round(mifflinBmr),
    tdee: Math.round(tdee),
    proteinGramsPerDay,
    fluidMlPerDay,
    proteinCalories,
    fatGrams: Math.round(fatCalories / 9),
    carbGrams: Math.round(carbCalories / 4),
  };
}

// ===========================================================================
// Renal function (GFR): CKD-EPI 2021 (race-free) + Cockcroft-Gault
// ===========================================================================

export type CKDStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export interface GFRInput {
  creatinine: number;
  creatinineUnit?: 'mg/dL' | 'umol/L';
  ageYears: number;
  sex: Sex;
  weightKg?: number;
}

export interface GFRResult {
  gfrCKDEPI: number;
  gfrCockcroftGault: number | null;
  ckdStage: CKDStage;
  stageDescription: string;
}

export function calculateGFR(input: GFRInput): GFRResult | null {
  const raw = input.creatinine;
  if (!Number.isFinite(raw) || !Number.isFinite(input.ageYears)) return null;
  const cr = input.creatinineUnit === 'umol/L' ? raw / 88.4 : raw;
  const age = input.ageYears;
  const female = input.sex === 'female';

  const kappa = female ? 0.7 : 0.9;
  const crKappa = cr / kappa;
  let gfrCKDEPI: number;
  if (female) {
    gfrCKDEPI =
      cr <= 0.7
        ? 142 * Math.pow(crKappa, -0.241) * Math.pow(0.9938, age)
        : 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, age);
    gfrCKDEPI *= 1.012;
  } else {
    gfrCKDEPI =
      cr <= 0.9
        ? 142 * Math.pow(crKappa, -0.302) * Math.pow(0.9938, age)
        : 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, age);
  }

  let gfrCockcroftGault: number | null = null;
  if (input.weightKg && Number.isFinite(input.weightKg)) {
    gfrCockcroftGault = ((140 - age) * input.weightKg) / (72 * cr);
    if (female) gfrCockcroftGault *= 0.85;
    gfrCockcroftGault = round(gfrCockcroftGault, 1);
  }

  let ckdStage: CKDStage;
  let stageDescription: string;
  if (gfrCKDEPI >= 90) {
    ckdStage = 'G1';
    stageDescription = 'Normal or high kidney function';
  } else if (gfrCKDEPI >= 60) {
    ckdStage = 'G2';
    stageDescription = 'Mildly decreased kidney function';
  } else if (gfrCKDEPI >= 45) {
    ckdStage = 'G3a';
    stageDescription = 'Mild-moderate decrease';
  } else if (gfrCKDEPI >= 30) {
    ckdStage = 'G3b';
    stageDescription = 'Moderate-severe decrease';
  } else if (gfrCKDEPI >= 15) {
    ckdStage = 'G4';
    stageDescription = 'Severely decreased kidney function';
  } else {
    ckdStage = 'G5';
    stageDescription = 'Kidney failure';
  }

  return {
    gfrCKDEPI: round(gfrCKDEPI, 1),
    gfrCockcroftGault,
    ckdStage,
    stageDescription,
  };
}

// ===========================================================================
// Burns: TBSA, Parkland fluids, ABSI, Baux / Revised Baux
// ===========================================================================

export interface ParklandResult {
  totalFluid24h: number; // ABA starting dose 2 mL/kg/%TBSA
  parklandUpperBound24h: number; // classic Parkland 4 mL/kg/%TBSA
  first8Hours: number;
  next16Hours: number;
  hourlyFirst8: number;
  hourlyNext16: number;
}

export function calculateParkland(weightKg: number, tbsa: number): ParklandResult | null {
  if (!weightKg || !tbsa) return null;
  const startingTotal = 2 * weightKg * tbsa;
  const parklandTotal = 4 * weightKg * tbsa;
  const first8Hours = startingTotal / 2;
  const next16Hours = startingTotal / 2;
  return {
    totalFluid24h: Math.round(startingTotal),
    parklandUpperBound24h: Math.round(parklandTotal),
    first8Hours: Math.round(first8Hours),
    next16Hours: Math.round(next16Hours),
    hourlyFirst8: Math.round(first8Hours / 8),
    hourlyNext16: Math.round(next16Hours / 16),
  };
}

export function calculateABSI(
  tbsa: number,
  ageYears: number,
  sex: Sex,
  fullThickness: boolean,
  inhalationInjury: boolean
): { score: number; survival: string } {
  let score = 0;
  if (ageYears <= 1) score += 1;
  else if (ageYears <= 4) score += 2;
  else if (ageYears <= 19) score += 3;
  else if (ageYears <= 34) score += 4;
  else if (ageYears <= 49) score += 5;
  else if (ageYears <= 64) score += 6;
  else if (ageYears <= 79) score += 7;
  else score += 8;

  if (sex === 'male') score += 1;

  if (tbsa <= 1) score += 1;
  else if (tbsa <= 10) score += 2;
  else if (tbsa <= 20) score += 3;
  else if (tbsa <= 30) score += 4;
  else if (tbsa <= 40) score += 5;
  else if (tbsa <= 50) score += 6;
  else if (tbsa <= 60) score += 7;
  else if (tbsa <= 70) score += 8;
  else if (tbsa <= 80) score += 9;
  else if (tbsa <= 90) score += 10;
  else score += 11;

  if (fullThickness) score += 1;
  if (inhalationInjury) score += 1;

  let survival: string;
  if (score <= 3) survival = '≥99% survival';
  else if (score <= 5) survival = '98% survival';
  else if (score <= 7) survival = '80-90% survival';
  else if (score <= 9) survival = '50-70% survival';
  else if (score <= 11) survival = '20-40% survival';
  else survival = '<10% survival';

  return { score, survival };
}

/** Baux score = age + %TBSA. Revised adds 17 for inhalation injury. */
export function calculateBaux(
  ageYears: number,
  tbsa: number,
  inhalationInjury = false
): { baux: number; revisedBaux: number } {
  const baux = ageYears + tbsa;
  return { baux, revisedBaux: baux + (inhalationInjury ? 17 : 0) };
}

// ===========================================================================
// Electrolytes: sodium deficit + Adrogué–Madias
// ===========================================================================

export interface SodiumInput {
  currentNa: number;
  targetNa: number;
  weightKg: number;
  gender: CalcGender;
}

export interface SodiumResult {
  tbw: number;
  sodiumDeficit: number; // mmol
  changePerLiterNS: number; // mmol/L per L of 0.9% NaCl (Adrogué–Madias)
  waterDeficit: number | null; // L, for hypernatremia
  severity: string;
}

export function calculateSodiumCorrection(input: SodiumInput): SodiumResult | null {
  const { currentNa, targetNa, weightKg, gender } = input;
  if (!currentNa || !weightKg) return null;

  let tbwFactor = 0.6;
  if (gender === 'female') tbwFactor = 0.5;
  if (gender === 'elderly-male') tbwFactor = 0.5;
  if (gender === 'elderly-female') tbwFactor = 0.45;

  const tbw = tbwFactor * weightKg;
  const sodiumDeficit = (targetNa - currentNa) * tbw;
  const changePerLiterNS = (154 - currentNa) / (tbw + 1);
  const waterDeficit = currentNa > 145 ? tbw * (currentNa / 140 - 1) : null;

  let severity = 'Normal';
  if (currentNa < 135) {
    severity =
      currentNa >= 130
        ? 'Mild Hyponatremia'
        : currentNa >= 125
        ? 'Moderate Hyponatremia'
        : 'Severe Hyponatremia';
  } else if (currentNa > 145) {
    severity =
      currentNa <= 150
        ? 'Mild Hypernatremia'
        : currentNa <= 160
        ? 'Moderate Hypernatremia'
        : 'Severe Hypernatremia';
  }

  return {
    tbw: round(tbw, 1),
    sodiumDeficit: round(sodiumDeficit, 1),
    changePerLiterNS: round(changePerLiterNS, 2),
    waterDeficit: waterDeficit === null ? null : round(waterDeficit, 1),
    severity,
  };
}

// ===========================================================================
// helpers
// ===========================================================================

function round(value: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
}
