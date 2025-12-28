// ============================================================
// COMPREHENSIVE BURN CARE SCORING SERVICE
// Based on WHO/ISBI Guidelines (2024)
// ============================================================

import type {
  TBSACalculation,
  BauxScore,
  RevisedBauxScore,
  ABSIScore,
  qSOFAScore,
  SOFAScore,
  FluidResuscitationPlan,
  ResuscitationFormula,
  LundBrowderEntry,
  BurnDepthType,
  AlertThreshold,
  BurnAlert,
  AlertPriority,
  BurnVitalSigns,
  LabValues,
  UrineOutput,
  LUND_BROWDER_CHART,
} from '../types';

// ==========================================
// TBSA CALCULATION
// ==========================================

/**
 * Calculate TBSA using Lund-Browder Chart (WHO/ISBI preferred method)
 */
export function calculateTBSALundBrowder(
  entries: LundBrowderEntry[],
  ageGroup: 'infant' | 'child_1' | 'child_5' | 'child_10' | 'adult'
): TBSACalculation {
  let totalTBSA = 0;
  let superficialTBSA = 0;
  let partialThicknessTBSA = 0;
  let fullThicknessTBSA = 0;

  entries.forEach(entry => {
    if (entry.percentBurned > 0) {
      totalTBSA += entry.percentBurned;
      
      switch (entry.depth) {
        case 'superficial':
          superficialTBSA += entry.percentBurned;
          break;
        case 'superficial_partial':
        case 'deep_partial':
          partialThicknessTBSA += entry.percentBurned;
          break;
        case 'full_thickness':
          fullThicknessTBSA += entry.percentBurned;
          break;
      }
    }
  });

  return {
    method: 'lund_browder',
    entries,
    totalTBSA: Math.round(totalTBSA * 10) / 10,
    superficialTBSA: Math.round(superficialTBSA * 10) / 10,
    partialThicknessTBSA: Math.round(partialThicknessTBSA * 10) / 10,
    fullThicknessTBSA: Math.round(fullThicknessTBSA * 10) / 10,
    calculatedAt: new Date(),
    calculatedBy: '',
  };
}

/**
 * Calculate TBSA using Rule of Nines (quick estimation for adults)
 */
export function calculateTBSARuleOfNines(
  areas: { region: string; percent: number; depth: BurnDepthType }[]
): TBSACalculation {
  // Rule of 9s percentages for adults
  const ruleOfNines: Record<string, number> = {
    head: 9,
    anterior_trunk: 18,
    posterior_trunk: 18,
    right_arm: 9,
    left_arm: 9,
    genitalia: 1,
    right_leg: 18,
    left_leg: 18,
  };

  let totalTBSA = 0;
  let superficialTBSA = 0;
  let partialThicknessTBSA = 0;
  let fullThicknessTBSA = 0;

  const entries: LundBrowderEntry[] = [];

  areas.forEach(area => {
    const maxPercent = ruleOfNines[area.region] || 0;
    const burnedPercent = Math.min(area.percent, maxPercent);
    
    totalTBSA += burnedPercent;
    
    switch (area.depth) {
      case 'superficial':
        superficialTBSA += burnedPercent;
        break;
      case 'superficial_partial':
      case 'deep_partial':
        partialThicknessTBSA += burnedPercent;
        break;
      case 'full_thickness':
        fullThicknessTBSA += burnedPercent;
        break;
    }

    entries.push({
      region: area.region,
      regionName: area.region.replace(/_/g, ' '),
      ageGroup: 'adult',
      percentBurned: burnedPercent,
      depth: area.depth,
      maxPercent,
    });
  });

  return {
    method: 'rule_of_nines',
    entries,
    totalTBSA: Math.round(totalTBSA * 10) / 10,
    superficialTBSA: Math.round(superficialTBSA * 10) / 10,
    partialThicknessTBSA: Math.round(partialThicknessTBSA * 10) / 10,
    fullThicknessTBSA: Math.round(fullThicknessTBSA * 10) / 10,
    calculatedAt: new Date(),
    calculatedBy: '',
  };
}

/**
 * Get age group for Lund-Browder based on age
 */
export function getAgeGroup(ageYears: number): 'infant' | 'child_1' | 'child_5' | 'child_10' | 'adult' {
  if (ageYears < 1) return 'infant';
  if (ageYears < 5) return 'child_1';
  if (ageYears < 10) return 'child_5';
  if (ageYears < 15) return 'child_10';
  return 'adult';
}

// ==========================================
// BAUX SCORE
// ==========================================

/**
 * Calculate Baux Score (Age + TBSA)
 * Used for mortality estimation
 */
export function calculateBauxScore(age: number, tbsa: number): BauxScore {
  const score = age + tbsa;
  
  let mortalityRisk: string;
  if (score < 50) mortalityRisk = 'Low (<10%)';
  else if (score < 75) mortalityRisk = 'Moderate (10-30%)';
  else if (score < 100) mortalityRisk = 'High (30-60%)';
  else if (score < 125) mortalityRisk = 'Very High (60-90%)';
  else mortalityRisk = 'Extremely High (>90%)';

  return {
    age,
    tbsa,
    score,
    mortalityRisk,
  };
}

/**
 * Calculate Revised Baux Score (Age + TBSA + 17 if inhalation injury)
 */
export function calculateRevisedBauxScore(
  age: number,
  tbsa: number,
  inhalationInjury: boolean
): RevisedBauxScore {
  const score = age + tbsa + (inhalationInjury ? 17 : 0);
  
  let mortalityRisk: string;
  if (score < 50) mortalityRisk = 'Low (<10%)';
  else if (score < 75) mortalityRisk = 'Moderate (10-30%)';
  else if (score < 100) mortalityRisk = 'High (30-60%)';
  else if (score < 125) mortalityRisk = 'Very High (60-90%)';
  else mortalityRisk = 'Extremely High (>90%)';

  return {
    age,
    tbsa,
    inhalationInjury,
    score,
    mortalityRisk,
  };
}

// ==========================================
// ABSI SCORE
// ==========================================

/**
 * Calculate ABSI (Abbreviated Burn Severity Index)
 * Composite score for mortality estimation
 */
export function calculateABSIScore(
  age: number,
  gender: 'male' | 'female',
  tbsa: number,
  hasInhalationInjury: boolean,
  hasFullThickness: boolean
): ABSIScore {
  // Age points
  let agePoints = 1;
  if (age > 20 && age <= 40) agePoints = 2;
  else if (age > 40 && age <= 60) agePoints = 3;
  else if (age > 60 && age <= 80) agePoints = 4;
  else if (age > 80) agePoints = 5;

  // Gender points (female = 1)
  const genderPoints = gender === 'female' ? 1 : 0;

  // TBSA points
  let tbsaPoints = 1;
  if (tbsa > 10 && tbsa <= 20) tbsaPoints = 2;
  else if (tbsa > 20 && tbsa <= 30) tbsaPoints = 3;
  else if (tbsa > 30 && tbsa <= 40) tbsaPoints = 4;
  else if (tbsa > 40 && tbsa <= 50) tbsaPoints = 5;
  else if (tbsa > 50 && tbsa <= 60) tbsaPoints = 6;
  else if (tbsa > 60 && tbsa <= 70) tbsaPoints = 7;
  else if (tbsa > 70 && tbsa <= 80) tbsaPoints = 8;
  else if (tbsa > 80 && tbsa <= 90) tbsaPoints = 9;
  else if (tbsa > 90) tbsaPoints = 10;

  // Inhalation injury points
  const inhalationPoints = hasInhalationInjury ? 1 : 0;

  // Full thickness burn points
  const fullThicknessPoints = hasFullThickness ? 1 : 0;

  const totalScore = agePoints + genderPoints + tbsaPoints + inhalationPoints + fullThicknessPoints;

  // Survival probability and threat level
  let survivalProbability: string;
  let threatLevel: 'very_low' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe';

  if (totalScore <= 2) {
    survivalProbability = '>99%';
    threatLevel = 'very_low';
  } else if (totalScore <= 3) {
    survivalProbability = '98%';
    threatLevel = 'very_low';
  } else if (totalScore <= 4) {
    survivalProbability = '90%';
    threatLevel = 'moderate';
  } else if (totalScore <= 5) {
    survivalProbability = '80%';
    threatLevel = 'moderate';
  } else if (totalScore <= 6) {
    survivalProbability = '60%';
    threatLevel = 'moderately_severe';
  } else if (totalScore <= 7) {
    survivalProbability = '40%';
    threatLevel = 'severe';
  } else if (totalScore <= 8) {
    survivalProbability = '20%';
    threatLevel = 'severe';
  } else if (totalScore <= 9) {
    survivalProbability = '10%';
    threatLevel = 'very_severe';
  } else {
    survivalProbability = '<5%';
    threatLevel = 'very_severe';
  }

  return {
    age,
    gender,
    tbsa,
    hasInhalationInjury,
    hasFullThickness,
    agePoints,
    genderPoints,
    tbsaPoints,
    inhalationPoints,
    fullThicknessPoints,
    totalScore,
    survivalProbability,
    threatLevel,
  };
}

// ==========================================
// qSOFA & SOFA SCORES
// ==========================================

/**
 * Calculate qSOFA (Quick SOFA) for sepsis screening
 */
export function calculateQSOFA(
  respiratoryRate: number,
  systolicBP: number,
  gcs: number
): qSOFAScore {
  let score = 0;
  
  // RR ≥22 = 1 point
  if (respiratoryRate >= 22) score += 1;
  
  // SBP ≤100 = 1 point
  if (systolicBP <= 100) score += 1;
  
  // GCS <15 (altered mentation) = 1 point
  const alteredMentation = gcs < 15;
  if (alteredMentation) score += 1;

  return {
    respiratoryRate,
    alteredMentation,
    systolicBP,
    score,
    sepsisRisk: score >= 2 ? 'high' : 'low',
  };
}

/**
 * Calculate SOFA (Sequential Organ Failure Assessment) score
 */
export function calculateSOFA(
  pao2Fio2Ratio: number | null,
  platelets: number | null,
  bilirubin: number | null, // mg/dL
  map: number | null,
  onVasopressors: boolean,
  vasopressorDose: number | null, // mcg/kg/min for dopamine/dobutamine
  gcs: number,
  creatinine: number | null, // mg/dL
  urineOutput24h: number | null // mL/day
): SOFAScore {
  // Respiration (PaO2/FiO2)
  let respirationScore = 0;
  if (pao2Fio2Ratio !== null) {
    if (pao2Fio2Ratio >= 400) respirationScore = 0;
    else if (pao2Fio2Ratio >= 300) respirationScore = 1;
    else if (pao2Fio2Ratio >= 200) respirationScore = 2;
    else if (pao2Fio2Ratio >= 100) respirationScore = 3;
    else respirationScore = 4;
  }

  // Coagulation (Platelets)
  let coagulationScore = 0;
  if (platelets !== null) {
    if (platelets >= 150) coagulationScore = 0;
    else if (platelets >= 100) coagulationScore = 1;
    else if (platelets >= 50) coagulationScore = 2;
    else if (platelets >= 20) coagulationScore = 3;
    else coagulationScore = 4;
  }

  // Liver (Bilirubin)
  let liverScore = 0;
  if (bilirubin !== null) {
    if (bilirubin < 1.2) liverScore = 0;
    else if (bilirubin < 2.0) liverScore = 1;
    else if (bilirubin < 6.0) liverScore = 2;
    else if (bilirubin < 12.0) liverScore = 3;
    else liverScore = 4;
  }

  // Cardiovascular (MAP or vasopressors)
  let cardiovascularScore = 0;
  if (map !== null) {
    if (map >= 70 && !onVasopressors) cardiovascularScore = 0;
    else if (map < 70 && !onVasopressors) cardiovascularScore = 1;
    else if (onVasopressors && vasopressorDose !== null && vasopressorDose <= 5) cardiovascularScore = 2;
    else if (onVasopressors && vasopressorDose !== null && vasopressorDose <= 15) cardiovascularScore = 3;
    else cardiovascularScore = 4;
  }

  // CNS (GCS)
  let cnsScore = 0;
  if (gcs === 15) cnsScore = 0;
  else if (gcs >= 13) cnsScore = 1;
  else if (gcs >= 10) cnsScore = 2;
  else if (gcs >= 6) cnsScore = 3;
  else cnsScore = 4;

  // Renal (Creatinine or UO)
  let renalScore = 0;
  if (creatinine !== null) {
    if (creatinine < 1.2) renalScore = 0;
    else if (creatinine < 2.0) renalScore = 1;
    else if (creatinine < 3.5) renalScore = 2;
    else if (creatinine < 5.0) renalScore = 3;
    else renalScore = 4;
  }
  // Override with UO criteria if very low
  if (urineOutput24h !== null && urineOutput24h < 200) renalScore = 4;
  else if (urineOutput24h !== null && urineOutput24h < 500) renalScore = Math.max(renalScore, 3);

  const totalScore = respirationScore + coagulationScore + liverScore + cardiovascularScore + cnsScore + renalScore;

  // Mortality risk estimation
  let mortalityRisk: string;
  if (totalScore <= 1) mortalityRisk = '<10%';
  else if (totalScore <= 4) mortalityRisk = '10-20%';
  else if (totalScore <= 7) mortalityRisk = '20-30%';
  else if (totalScore <= 10) mortalityRisk = '30-50%';
  else if (totalScore <= 14) mortalityRisk = '50-70%';
  else mortalityRisk = '>70%';

  return {
    respirationScore,
    coagulationScore,
    liverScore,
    cardiovascularScore,
    cnsScore,
    renalScore,
    totalScore,
    mortalityRisk,
  };
}

// ==========================================
// FLUID RESUSCITATION
// ==========================================

/**
 * Calculate fluid resuscitation requirements
 * Parkland: 4 mL × kg × %TBSA
 * Modified Brooke: 2 mL × kg × %TBSA
 */
export function calculateFluidResuscitation(
  weight: number,
  tbsa: number,
  timeOfBurn: Date,
  formula: ResuscitationFormula = 'parkland'
): FluidResuscitationPlan {
  // Calculate multiplier based on formula
  let multiplier: number;
  switch (formula) {
    case 'parkland':
      multiplier = 4;
      break;
    case 'modified_brooke':
      multiplier = 2;
      break;
    case 'evans':
      multiplier = 2; // Modified - traditionally includes colloid
      break;
    default:
      multiplier = 4;
  }

  // Total 24-hour crystalloid requirement
  const totalFluid24h = multiplier * weight * tbsa;
  
  // First half in first 8 hours FROM TIME OF BURN (not admission)
  const firstHalfVolume = totalFluid24h / 2;
  const secondHalfVolume = totalFluid24h / 2;

  // Calculate hours since burn
  const now = new Date();
  const hoursSinceBurn = Math.max(0, (now.getTime() - timeOfBurn.getTime()) / (1000 * 60 * 60));
  
  // Adjust first half window
  const hoursRemainingFirstHalf = Math.max(0, 8 - hoursSinceBurn);
  const firstHalfRate = hoursRemainingFirstHalf > 0 ? firstHalfVolume / hoursRemainingFirstHalf : 0;
  
  // Second half rate (over 16 hours)
  const secondHalfRate = secondHalfVolume / 16;

  // Urine output target based on age/weight
  // Adults: 0.5-1.0 mL/kg/hr, Children: 1-1.5 mL/kg/hr
  const urineOutputTarget = 0.5; // Default adult

  return {
    id: '',
    burnAssessmentId: '',
    patientWeight: weight,
    tbsa,
    timeOfBurn,
    formula,
    totalFluid24h: Math.round(totalFluid24h),
    firstHalfVolume: Math.round(firstHalfVolume),
    secondHalfVolume: Math.round(secondHalfVolume),
    firstHalfRate: Math.round(firstHalfRate),
    secondHalfRate: Math.round(secondHalfRate),
    currentInfusionRate: hoursSinceBurn < 8 ? Math.round(firstHalfRate) : Math.round(secondHalfRate),
    currentHour: Math.floor(hoursSinceBurn),
    fluidAdministered: 0,
    fluidRemaining: Math.round(totalFluid24h),
    urineOutputTarget,
    adjustments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Adjust fluid rate based on urine output
 * WHO/ISBI recommendation: titrate to UO 0.5-1.0 mL/kg/hr
 */
export function calculateFluidAdjustment(
  currentRate: number,
  urineOutputPerKg: number,
  targetMin: number = 0.5,
  targetMax: number = 1.0
): { newRate: number; adjustment: string; reason: string } {
  if (urineOutputPerKg < targetMin) {
    // Inadequate output - increase by 20-30%
    const newRate = Math.round(currentRate * 1.25);
    return {
      newRate,
      adjustment: '+25%',
      reason: `UO ${urineOutputPerKg.toFixed(2)} mL/kg/hr below target (${targetMin} mL/kg/hr)`,
    };
  } else if (urineOutputPerKg > targetMax * 1.5) {
    // Excessive output - consider decreasing
    const newRate = Math.round(currentRate * 0.9);
    return {
      newRate,
      adjustment: '-10%',
      reason: `UO ${urineOutputPerKg.toFixed(2)} mL/kg/hr above target, consider reducing`,
    };
  }
  
  return {
    newRate: currentRate,
    adjustment: 'No change',
    reason: 'UO within target range',
  };
}

// ==========================================
// NUTRITION CALCULATIONS
// ==========================================

/**
 * Calculate caloric requirements for burn patients
 * Curreri formula: 25 kcal/kg + 40 kcal/%TBSA (adults)
 * Harris-Benedict with activity/stress factors alternative
 */
export function calculateBurnNutrition(
  weight: number,
  tbsa: number,
  age?: number,
  height?: number,
  gender?: 'male' | 'female'
): {
  caloricTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  vitaminC: number;
  vitaminE: number;
  zinc: number;
  selenium: number;
} {
  // Curreri formula for burns
  const caloricTarget = Math.round((25 * weight) + (40 * tbsa));
  
  // Protein: 1.5-2.0 g/kg/day for major burns
  const proteinTarget = Math.round(weight * 2);
  
  // Macronutrient distribution
  // Protein calories = proteinTarget * 4
  const proteinCals = proteinTarget * 4;
  const remainingCals = caloricTarget - proteinCals;
  
  // Carbs: ~50-60% of remaining, Fat: ~40-50%
  const carbCals = remainingCals * 0.55;
  const fatCals = remainingCals * 0.45;
  
  const carbTarget = Math.round(carbCals / 4);
  const fatTarget = Math.round(fatCals / 9);

  return {
    caloricTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    vitaminC: 1000, // mg (500-1000mg)
    vitaminE: 400, // IU
    zinc: 220, // mg
    selenium: 200, // mcg
  };
}

// ==========================================
// ALERT GENERATION
// ==========================================

/**
 * Check vital signs against thresholds and generate alerts
 */
export function checkVitalsForAlerts(
  vitals: BurnVitalSigns,
  weight: number,
  recentUO?: UrineOutput[]
): BurnAlert[] {
  const alerts: BurnAlert[] = [];
  const now = new Date();

  // Check MAP
  if (vitals.meanArterialPressure < 65) {
    alerts.push({
      id: `alert-map-${now.getTime()}`,
      burnAssessmentId: vitals.burnAssessmentId,
      timestamp: now,
      type: 'hypovolemic_shock',
      priority: 'critical',
      status: 'active',
      title: 'Hypotension - MAP <65 mmHg',
      description: `MAP is ${vitals.meanArterialPressure} mmHg indicating inadequate perfusion`,
      triggerValue: `MAP ${vitals.meanArterialPressure}`,
      threshold: '<65 mmHg',
      suggestedActions: [
        'Give crystalloid fluid bolus 250-500 mL',
        'Reassess in 15 minutes',
        'Consider vasopressors if no response',
        'Escalate to ICU',
      ],
    });
  }

  // Check SpO2
  if (vitals.oxygenSaturation < 90) {
    alerts.push({
      id: `alert-spo2-${now.getTime()}`,
      burnAssessmentId: vitals.burnAssessmentId,
      timestamp: now,
      type: 'ards',
      priority: 'critical',
      status: 'active',
      title: 'Hypoxia - SpO2 <90%',
      description: `Oxygen saturation is ${vitals.oxygenSaturation}%`,
      triggerValue: `SpO2 ${vitals.oxygenSaturation}%`,
      threshold: '<90%',
      suggestedActions: [
        'Increase supplemental oxygen',
        'Check airway patency',
        'Obtain ABG',
        'Consider intubation if deteriorating',
        'Chest X-ray',
      ],
    });
  }

  // Check temperature - fever
  if (vitals.temperature > 38) {
    alerts.push({
      id: `alert-fever-${now.getTime()}`,
      burnAssessmentId: vitals.burnAssessmentId,
      timestamp: now,
      type: 'sepsis',
      priority: 'high',
      status: 'active',
      title: 'Fever >38°C - Possible Infection',
      description: `Temperature is ${vitals.temperature}°C`,
      triggerValue: `Temp ${vitals.temperature}°C`,
      threshold: '>38°C',
      suggestedActions: [
        'Obtain blood cultures x2',
        'Review wound for infection signs',
        'Consider starting empiric antibiotics',
        'Order sepsis workup (lactate, CBC, CRP)',
      ],
    });
  }

  // Check temperature - hypothermia
  if (vitals.temperature < 36) {
    alerts.push({
      id: `alert-hypothermia-${now.getTime()}`,
      burnAssessmentId: vitals.burnAssessmentId,
      timestamp: now,
      type: 'hypothermia',
      priority: 'medium',
      status: 'active',
      title: 'Hypothermia <36°C',
      description: `Temperature is ${vitals.temperature}°C`,
      triggerValue: `Temp ${vitals.temperature}°C`,
      threshold: '<36°C',
      suggestedActions: [
        'Active warming measures',
        'Warm IV fluids',
        'Increase room temperature',
        'Warm blankets',
      ],
    });
  }

  // Check heart rate
  if (vitals.heartRate > 120) {
    alerts.push({
      id: `alert-tachy-${now.getTime()}`,
      burnAssessmentId: vitals.burnAssessmentId,
      timestamp: now,
      type: 'custom',
      priority: 'medium',
      status: 'active',
      title: 'Tachycardia HR >120',
      description: `Heart rate is ${vitals.heartRate} bpm`,
      triggerValue: `HR ${vitals.heartRate}`,
      threshold: '>120 bpm',
      suggestedActions: [
        'Assess fluid status',
        'Rule out pain',
        'Rule out sepsis',
        'ECG if arrhythmia suspected',
      ],
    });
  }

  // Check recent urine output
  if (recentUO && recentUO.length >= 2) {
    const lastTwo = recentUO.slice(-2);
    const avgUOPerKg = lastTwo.reduce((sum, uo) => sum + uo.ratePerKg, 0) / 2;
    
    if (avgUOPerKg < 0.5) {
      alerts.push({
        id: `alert-uo-${now.getTime()}`,
        burnAssessmentId: vitals.burnAssessmentId,
        timestamp: now,
        type: 'aki',
        priority: 'high',
        status: 'active',
        title: 'Low Urine Output <0.5 mL/kg/hr',
        description: `Average UO for last 2 hours is ${avgUOPerKg.toFixed(2)} mL/kg/hr`,
        triggerValue: `UO ${avgUOPerKg.toFixed(2)} mL/kg/hr`,
        threshold: '<0.5 mL/kg/hr for 2 hours',
        suggestedActions: [
          'Increase crystalloid infusion by 20-30%',
          'Reassess hourly',
          'Check for urinary obstruction',
          'Notify senior if no improvement after 2 hours',
          'Consider ICU if persistent',
        ],
      });
    }
  }

  return alerts;
}

/**
 * Check lab values against thresholds and generate alerts
 */
export function checkLabsForAlerts(labs: LabValues): BurnAlert[] {
  const alerts: BurnAlert[] = [];
  const now = new Date();

  // Check lactate
  if (labs.lactate && labs.lactate > 2) {
    alerts.push({
      id: `alert-lactate-${now.getTime()}`,
      burnAssessmentId: labs.burnAssessmentId,
      timestamp: now,
      type: 'hypovolemic_shock',
      priority: 'high',
      status: 'active',
      title: 'Elevated Lactate >2 mmol/L',
      description: `Lactate is ${labs.lactate} mmol/L indicating tissue hypoperfusion`,
      triggerValue: `Lactate ${labs.lactate}`,
      threshold: '>2 mmol/L',
      suggestedActions: [
        'Optimize fluid resuscitation',
        'Check hemoglobin',
        'Consider blood transfusion if anemic',
        'Reassess perfusion',
      ],
    });
  }

  // Check hemoglobin
  if (labs.hemoglobin && labs.hemoglobin < 7) {
    alerts.push({
      id: `alert-hb-${now.getTime()}`,
      burnAssessmentId: labs.burnAssessmentId,
      timestamp: now,
      type: 'anemia',
      priority: 'high',
      status: 'active',
      title: 'Severe Anemia - Hb <7 g/dL',
      description: `Hemoglobin is ${labs.hemoglobin} g/dL`,
      triggerValue: `Hb ${labs.hemoglobin}`,
      threshold: '<7 g/dL',
      suggestedActions: [
        'Type and crossmatch',
        'Transfuse PRBCs',
        'Check for bleeding source',
        'Repeat Hb in 4-6 hours post-transfusion',
      ],
    });
  }

  // Check potassium
  if (labs.potassium && labs.potassium > 6) {
    alerts.push({
      id: `alert-k-${now.getTime()}`,
      burnAssessmentId: labs.burnAssessmentId,
      timestamp: now,
      type: 'custom',
      priority: 'critical',
      status: 'active',
      title: 'Severe Hyperkalemia K+ >6 mmol/L',
      description: `Potassium is ${labs.potassium} mmol/L - arrhythmia risk!`,
      triggerValue: `K+ ${labs.potassium}`,
      threshold: '>6 mmol/L',
      suggestedActions: [
        'STAT ECG',
        'IV Calcium gluconate 10mL 10%',
        'Insulin 10U + Dextrose 50mL 50%',
        'Kayexalate if stable',
        'Consider dialysis if refractory',
      ],
    });
  }

  // Check creatinine (if baseline known, check rise)
  if (labs.creatinine && labs.creatinine > 2) {
    alerts.push({
      id: `alert-cr-${now.getTime()}`,
      burnAssessmentId: labs.burnAssessmentId,
      timestamp: now,
      type: 'aki',
      priority: 'high',
      status: 'active',
      title: 'Elevated Creatinine - Possible AKI',
      description: `Creatinine is ${labs.creatinine} mg/dL`,
      triggerValue: `Cr ${labs.creatinine}`,
      threshold: '>2 mg/dL',
      suggestedActions: [
        'Review urine output trend',
        'Avoid nephrotoxic medications',
        'Nephrology consultation',
        'Consider renal replacement therapy if indicated',
      ],
    });
  }

  // Check P/F ratio
  if (labs.pao2Fio2Ratio && labs.pao2Fio2Ratio < 300) {
    const severity = labs.pao2Fio2Ratio < 200 ? 'Moderate-Severe' : 'Mild';
    alerts.push({
      id: `alert-pf-${now.getTime()}`,
      burnAssessmentId: labs.burnAssessmentId,
      timestamp: now,
      type: 'ards',
      priority: 'high',
      status: 'active',
      title: `${severity} ARDS - P/F Ratio <300`,
      description: `PaO2/FiO2 ratio is ${labs.pao2Fio2Ratio}`,
      triggerValue: `P/F ${labs.pao2Fio2Ratio}`,
      threshold: '<300',
      suggestedActions: [
        'Serial ABG monitoring',
        'Chest imaging',
        'Lung-protective ventilation strategy',
        'Consider prone positioning if severe',
      ],
    });
  }

  // Check CK for rhabdomyolysis
  if (labs.creatineKinase && labs.creatineKinase > 5000) {
    alerts.push({
      id: `alert-ck-${now.getTime()}`,
      burnAssessmentId: labs.burnAssessmentId,
      timestamp: now,
      type: 'rhabdomyolysis',
      priority: 'high',
      status: 'active',
      title: 'Elevated CK - Rhabdomyolysis',
      description: `Creatine kinase is ${labs.creatineKinase} U/L`,
      triggerValue: `CK ${labs.creatineKinase}`,
      threshold: '>5000 U/L',
      suggestedActions: [
        'Aggressive IV fluid resuscitation',
        'Target UO >200 mL/hr',
        'Consider bicarbonate to alkalinize urine',
        'Monitor potassium closely',
        'Nephrology consult',
      ],
    });
  }

  return alerts;
}

// ==========================================
// BURN CENTER REFERRAL CRITERIA
// ==========================================

/**
 * Check if patient meets burn center referral criteria
 * Based on American Burn Association guidelines
 */
export function checkBurnCenterCriteria(
  tbsa: number,
  fullThicknessTBSA: number,
  hasInhalationInjury: boolean,
  age: number,
  burnLocations: string[],
  mechanism: string,
  hasChemicalBurn: boolean,
  hasElectricalBurn: boolean,
  hasCircumferentialBurn: boolean,
  hasSignificantComorbidities: boolean
): { meetsCriteria: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Partial thickness burns >10% TBSA
  if (tbsa > 10) {
    reasons.push(`TBSA >10% (${tbsa}%)`);
  }

  // Any full thickness burn
  if (fullThicknessTBSA > 0) {
    reasons.push('Full thickness burn present');
  }

  // Burns involving special areas
  const specialAreas = ['face', 'hands', 'feet', 'genitalia', 'perineum', 'major_joints'];
  const affectedSpecialAreas = burnLocations.filter(loc => 
    specialAreas.some(area => loc.toLowerCase().includes(area))
  );
  if (affectedSpecialAreas.length > 0) {
    reasons.push(`Burns to special areas: ${affectedSpecialAreas.join(', ')}`);
  }

  // Inhalation injury
  if (hasInhalationInjury) {
    reasons.push('Inhalation injury present');
  }

  // Chemical burns
  if (hasChemicalBurn) {
    reasons.push('Chemical burn');
  }

  // Electrical burns (including lightning)
  if (hasElectricalBurn) {
    reasons.push('Electrical/lightning burn');
  }

  // Circumferential burns
  if (hasCircumferentialBurn) {
    reasons.push('Circumferential burn (limb/chest)');
  }

  // Age extremes
  if (age < 10 || age > 50) {
    reasons.push(`Age extremes (<10 or >50 years): ${age} years`);
  }

  // Significant comorbidities
  if (hasSignificantComorbidities) {
    reasons.push('Significant pre-existing medical conditions');
  }

  return {
    meetsCriteria: reasons.length > 0,
    reasons,
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate Mean Arterial Pressure
 */
export function calculateMAP(systolic: number, diastolic: number): number {
  return Math.round(diastolic + (systolic - diastolic) / 3);
}

/**
 * Calculate GCS total from components
 */
export function calculateGCS(eye: number, verbal: number, motor: number): number {
  return eye + verbal + motor;
}

/**
 * Get burn severity classification
 */
export function getBurnSeverity(
  tbsa: number,
  hasFullThickness: boolean,
  hasInhalationInjury: boolean,
  age: number
): 'minor' | 'moderate' | 'major' | 'critical' {
  // Critical
  if (tbsa > 40 || (hasInhalationInjury && tbsa > 20)) {
    return 'critical';
  }
  
  // Major
  if (
    tbsa > 20 ||
    (hasFullThickness && tbsa > 10) ||
    hasInhalationInjury ||
    age < 10 ||
    age > 50
  ) {
    return 'major';
  }
  
  // Moderate
  if (tbsa > 10 || (hasFullThickness && tbsa > 2)) {
    return 'moderate';
  }
  
  return 'minor';
}

/**
 * Get recommended disposition based on burn severity
 */
export function getRecommendedDisposition(
  severity: 'minor' | 'moderate' | 'major' | 'critical',
  meetsBurnCenterCriteria: boolean
): 'outpatient' | 'ward' | 'hdu' | 'icu' | 'burn_center' {
  if (meetsBurnCenterCriteria) {
    return 'burn_center';
  }
  
  switch (severity) {
    case 'critical':
      return 'icu';
    case 'major':
      return 'hdu';
    case 'moderate':
      return 'ward';
    default:
      return 'outpatient';
  }
}
