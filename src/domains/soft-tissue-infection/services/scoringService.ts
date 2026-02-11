// ============================================
// STI/NEC Scoring & Calculation Service
// LRINEC, qSOFA, SOFA, NEWS2 calculators
// ============================================

import type { LRINECScore } from '../types';

// ============================================
// LRINEC Score Calculator
// Wong CH, et al. Crit Care Med. 2004
// ============================================
export function calculateLRINEC(labs: {
  crp: number;       // mg/L
  wbc: number;       // ×10³/µL
  hemoglobin: number; // g/dL
  sodium: number;     // mmol/L
  creatinine: number; // µmol/L
  glucose: number;    // mmol/L
}): LRINECScore {
  let crpScore = labs.crp >= 150 ? 4 : 0;
  let wbcScore = labs.wbc > 25 ? 2 : labs.wbc >= 15 ? 1 : 0;
  let hbScore = labs.hemoglobin < 11 ? 2 : labs.hemoglobin <= 13.5 ? 1 : 0;
  let naScore = labs.sodium < 135 ? 2 : 0;
  let crScore = labs.creatinine > 141 ? 2 : 0;
  let glucScore = labs.glucose > 10 ? 1 : 0;

  const totalScore = crpScore + wbcScore + hbScore + naScore + crScore + glucScore;

  let riskCategory: 'low' | 'moderate' | 'high';
  let interpretation: string;

  if (totalScore <= 5) {
    riskCategory = 'low';
    interpretation = `LRINEC ${totalScore}: Low risk (<50% probability of NSTI). Monitor closely and consider alternative diagnoses. Repeat in 6-12 hours if not improving.`;
  } else if (totalScore <= 7) {
    riskCategory = 'moderate';
    interpretation = `LRINEC ${totalScore}: Moderate risk (50-75% probability of NSTI). Urgent surgical consultation required. Repeat labs in 6 hours. Consider imaging.`;
  } else {
    riskCategory = 'high';
    interpretation = `LRINEC ${totalScore}: HIGH RISK (>75% probability of NSTI, PPV 93.4%). EMERGENCY surgical exploration within 1 hour. Do NOT delay for imaging.`;
  }

  return {
    crp: crpScore,
    wbc: wbcScore,
    hemoglobin: hbScore,
    sodium: naScore,
    creatinine: crScore,
    glucose: glucScore,
    totalScore,
    riskCategory,
    interpretation,
  };
}

// ============================================
// qSOFA Score Calculator
// ============================================
export function calculateQSOFA(params: {
  alteredMentation: boolean; // GCS < 15
  systolicBP: number;
  respiratoryRate: number;
}): { score: number; interpretation: string; sepsisLikely: boolean } {
  let score = 0;
  if (params.alteredMentation) score += 1;
  if (params.systolicBP <= 100) score += 1;
  if (params.respiratoryRate >= 22) score += 1;

  return {
    score,
    interpretation: score >= 2
      ? `qSOFA ${score}/3: HIGH RISK of sepsis. Activate sepsis pathway. ICU assessment recommended.`
      : `qSOFA ${score}/3: Lower risk. Continue monitoring. Reassess if clinical picture changes.`,
    sepsisLikely: score >= 2,
  };
}

// ============================================
// NEWS2 Score Calculator
// ============================================
export function calculateNEWS2(params: {
  respiratoryRate: number;
  spo2: number;
  onOxygen: boolean;
  temperature: number;
  systolicBP: number;
  heartRate: number;
  consciousness: 'alert' | 'confused' | 'voice' | 'pain' | 'unresponsive';
}): { score: number; risk: string; action: string } {
  let score = 0;

  // Respiratory Rate
  if (params.respiratoryRate <= 8) score += 3;
  else if (params.respiratoryRate <= 11) score += 1;
  else if (params.respiratoryRate <= 20) score += 0;
  else if (params.respiratoryRate <= 24) score += 2;
  else score += 3;

  // SpO2 Scale 1 (if not on oxygen target)
  if (params.spo2 <= 91) score += 3;
  else if (params.spo2 <= 93) score += 2;
  else if (params.spo2 <= 95) score += 1;
  else score += 0;

  // Supplemental oxygen
  if (params.onOxygen) score += 2;

  // Temperature
  if (params.temperature <= 35.0) score += 3;
  else if (params.temperature <= 36.0) score += 1;
  else if (params.temperature <= 38.0) score += 0;
  else if (params.temperature <= 39.0) score += 1;
  else score += 2;

  // Systolic BP
  if (params.systolicBP <= 90) score += 3;
  else if (params.systolicBP <= 100) score += 2;
  else if (params.systolicBP <= 110) score += 1;
  else if (params.systolicBP <= 219) score += 0;
  else score += 3;

  // Heart rate
  if (params.heartRate <= 40) score += 3;
  else if (params.heartRate <= 50) score += 1;
  else if (params.heartRate <= 90) score += 0;
  else if (params.heartRate <= 110) score += 1;
  else if (params.heartRate <= 130) score += 2;
  else score += 3;

  // Consciousness
  if (params.consciousness === 'alert') score += 0;
  else score += 3;

  let risk: string;
  let action: string;
  if (score >= 7) {
    risk = 'HIGH';
    action = 'Emergency response – continuous monitoring, urgent clinical review, consider ICU transfer';
  } else if (score >= 5) {
    risk = 'MEDIUM-HIGH';
    action = 'Urgent clinical review within 30 minutes. Increase monitoring to minimum hourly.';
  } else if (score >= 3) {
    risk = 'MEDIUM';
    action = 'Urgent ward-based review. Increase monitoring frequency to 4-hourly minimum.';
  } else {
    risk = 'LOW';
    action = 'Continue routine monitoring every 4-6 hours.';
  }

  return { score, risk, action };
}

// ============================================
// Determine STI Classification from clinical features
// ============================================
export function determineClassification(assessment: {
  painOutOfProportion: boolean;
  crepitus: boolean;
  bullae: boolean;
  skinNecrosis: boolean;
  dishwaterDischarge: boolean;
  rapidSpread: boolean;
  fluctuance: boolean;
  systemicSigns: boolean;
  location: string;
  lrinecScore?: number;
}): { classification: string; severity: string; stage: string; urgency: string } {
  // Gas gangrene / Clostridial
  if (assessment.crepitus && (assessment.skinNecrosis || assessment.rapidSpread)) {
    return {
      classification: 'gas_gangrene',
      severity: 'critical',
      stage: 'necrotizing',
      urgency: 'EMERGENCY – OR within 1 hour',
    };
  }

  // Fournier's gangrene
  if (assessment.location === 'perineum' && (assessment.skinNecrosis || assessment.crepitus)) {
    return {
      classification: 'fournier_gangrene',
      severity: 'critical',
      stage: 'necrotizing',
      urgency: 'EMERGENCY – OR within 1 hour',
    };
  }

  // Necrotizing fasciitis
  if (assessment.painOutOfProportion || assessment.bullae || assessment.dishwaterDischarge || assessment.skinNecrosis ||
      (assessment.lrinecScore !== undefined && assessment.lrinecScore >= 8)) {
    const isType2 = !assessment.crepitus; // Type II is monomicrobial, no gas
    return {
      classification: isType2 ? 'necrotizing_fasciitis_type2' : 'necrotizing_fasciitis_type1',
      severity: 'severe',
      stage: assessment.systemicSigns ? 'systemic_sepsis' : 'necrotizing',
      urgency: 'EMERGENCY – Surgical exploration urgently',
    };
  }

  // Abscess
  if (assessment.fluctuance) {
    return {
      classification: 'abscess',
      severity: 'moderate',
      stage: 'suppurative',
      urgency: 'Urgent – same-day I&D',
    };
  }

  // Complicated cellulitis
  if (assessment.systemicSigns || assessment.rapidSpread) {
    return {
      classification: 'complicated_cellulitis',
      severity: 'moderate',
      stage: 'advancing_infection',
      urgency: 'Urgent – IV antibiotics, admission',
    };
  }

  // Simple cellulitis
  return {
    classification: 'simple_cellulitis',
    severity: 'mild',
    stage: 'early_cellulitis',
    urgency: 'Routine – Outpatient oral antibiotics',
  };
}

// ============================================
// Generate recommended lab panel based on severity
// ============================================
export function getRecommendedLabs(severity: string): string[] {
  const baseLabs = ['FBC', 'CRP', 'Blood Glucose', 'Wound Swab MCS'];

  if (severity === 'mild') return baseLabs;

  const moderateLabs = [...baseLabs, 'U&E/Creatinine', 'LFT', 'Blood Culture (×2)', 'ESR', 'Urinalysis'];
  if (severity === 'moderate') return moderateLabs;

  const severeLabs = [...moderateLabs, 'Lactate', 'Procalcitonin', 'ABG', 'Tissue MCS', 'Coagulation Profile', 'D-Dimer', 'HbA1c'];
  if (severity === 'severe') return severeLabs;

  return [...severeLabs, 'Serial Lactate (q4h)', 'Serial CRP', 'Troponin', 'Pro-BNP', 'Cortisol', 'TEG/ROTEM'];
}

// ============================================
// Generate recommended antibiotics based on classification
// ============================================
export function getRecommendedAntibiotics(classification: string, hasDiabetes: boolean, renalImpairment: boolean) {
  const protocols: Record<string, { name: string; dose: string; route: string; frequency: string; duration: string }[]> = {
    simple_cellulitis: [
      { name: 'Flucloxacillin', dose: '500mg', route: 'PO', frequency: '6-hourly', duration: '7-10 days' },
    ],
    complicated_cellulitis: [
      { name: 'Flucloxacillin', dose: '1-2g', route: 'IV', frequency: '6-hourly', duration: '5-7 days IV then step-down' },
      { name: 'Benzylpenicillin', dose: '1.2g (2MU)', route: 'IV', frequency: '6-hourly', duration: '5-7 days' },
    ],
    abscess: [
      { name: 'Flucloxacillin', dose: '500mg-1g', route: 'PO/IV', frequency: '6-hourly', duration: '5-7 days' },
      { name: 'Metronidazole', dose: '400mg', route: 'PO', frequency: '8-hourly', duration: '5-7 days' },
    ],
    necrotizing_fasciitis_type1: [
      { name: 'Meropenem', dose: '1g', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Clindamycin', dose: '600-900mg', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Vancomycin', dose: '15-20mg/kg', route: 'IV', frequency: '12-hourly', duration: '14-21 days' },
    ],
    necrotizing_fasciitis_type2: [
      { name: 'Meropenem', dose: '1g', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Clindamycin', dose: '600-900mg', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Vancomycin', dose: '15-20mg/kg', route: 'IV', frequency: '12-hourly', duration: '14-21 days' },
    ],
    gas_gangrene: [
      { name: 'Benzylpenicillin', dose: '2.4g (4MU)', route: 'IV', frequency: '4-hourly', duration: '14-21 days' },
      { name: 'Clindamycin', dose: '900mg', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Metronidazole', dose: '500mg', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
    ],
    fournier_gangrene: [
      { name: 'Meropenem', dose: '1g', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Clindamycin', dose: '600-900mg', route: 'IV', frequency: '8-hourly', duration: '14-21 days' },
      { name: 'Vancomycin', dose: '15-20mg/kg', route: 'IV', frequency: '12-hourly', duration: '14-21 days' },
    ],
  };

  let antibiotics = protocols[classification] || protocols.simple_cellulitis;

  // Add metronidazole for diabetics
  if (hasDiabetes && !antibiotics.find(a => a.name === 'Metronidazole')) {
    antibiotics = [...antibiotics, { name: 'Metronidazole', dose: '500mg', route: 'IV', frequency: '8-hourly', duration: 'Course dependent' }];
  }

  // Add renal adjustment notes
  if (renalImpairment) {
    antibiotics = antibiotics.map(a => ({
      ...a,
      dose: a.name === 'Meropenem' ? '500mg-1g (adjust for GFR)' :
            a.name === 'Vancomycin' ? 'Per trough levels (extend interval)' :
            a.dose,
    }));
  }

  return antibiotics;
}
