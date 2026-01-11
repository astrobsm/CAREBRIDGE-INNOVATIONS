/**
 * Preoperative Anaesthetic Review Service
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive preoperative assessment for surgical patients including:
 * - ASA Classification
 * - Airway Assessment (Mallampati, thyromental distance)
 * - Cardiac Risk Assessment (RCRI)
 * - Pulmonary Risk Assessment
 * - VTE Risk (Caprini Score)
 * - Bleeding Risk Assessment
 * - Fasting Guidelines
 * - Medication Management
 */

// ==================== TYPES ====================

// This interface is for the service-level comprehensive assessment with all nested types
// For the simplified version used by the UI, import PreoperativeAssessment from types/index.ts
export interface PreoperativeAssessmentService {
  id: string;
  patientId: string;
  surgeryId?: string;
  assessedBy: string;
  assessedByName?: string;
  assessedAt: Date;
  
  // ASA Classification
  asaClass: ASAClassification;
  asaEmergency: boolean;
  
  // Airway Assessment
  airwayAssessment: AirwayAssessment;
  
  // Cardiac Risk
  cardiacRisk: CardiacRiskAssessment;
  
  // Pulmonary Risk
  pulmonaryRisk: PulmonaryRiskAssessment;
  
  // VTE Risk
  vteRisk: VTERiskAssessment;
  
  // Bleeding Risk
  bleedingRisk: BleedingRiskAssessment;
  
  // Fasting Status
  fastingStatus: FastingStatus;
  
  // Medications
  medicationReview: MedicationReview;
  
  // Investigations
  requiredInvestigations: string[];
  
  // Overall Assessment
  riskSummary: string;
  anaestheticPlan: AnaestheticPlan;
  
  // Consent
  informedConsentObtained: boolean;
  consentNotes?: string;
  
  status: 'pending' | 'reviewed' | 'approved' | 'deferred';
  deferralReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export type ASAClassification = 1 | 2 | 3 | 4 | 5 | 6;

export interface ASADetails {
  class: ASAClassification;
  description: string;
  examples: string[];
  mortalityRisk: string;
}

export interface AirwayAssessment {
  mallampatiScore: 1 | 2 | 3 | 4;
  mouthOpening: number; // cm
  thyromentalDistance: number; // cm
  neckMobility: 'normal' | 'limited' | 'fixed';
  dentition: 'intact' | 'loose_teeth' | 'edentulous' | 'dentures';
  beardPresent: boolean;
  previousDifficultIntubation: boolean;
  predictedDifficulty: 'easy' | 'potentially_difficult' | 'anticipated_difficult';
  notes: string;
}

export interface CardiacRiskAssessment {
  rcriScore: number;
  rcriFactors: {
    highRiskSurgery: boolean;
    ischemicHeartDisease: boolean;
    heartFailure: boolean;
    cerebrovascularDisease: boolean;
    insulinDependentDiabetes: boolean;
    renalInsufficiency: boolean;
  };
  functionalCapacity: 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown';
  metsValue: number;
  recentMI: boolean;
  activeCardiacConditions: string[];
  riskCategory: 'low' | 'intermediate' | 'high';
  recommendations: string[];
}

export interface PulmonaryRiskAssessment {
  chronicLungDisease: boolean;
  currentSmoker: boolean;
  packYears?: number;
  recentUrti: boolean;
  asthmaControl: 'well_controlled' | 'partially_controlled' | 'uncontrolled' | 'none';
  oxygenTherapy: boolean;
  sleepApnea: boolean;
  stopBangScore?: number;
  pulmonaryRisk: 'low' | 'intermediate' | 'high';
  recommendations: string[];
}

export interface VTERiskAssessment {
  capriniScore: number;
  riskFactors: CapriniRiskFactor[];
  riskCategory: 'very_low' | 'low' | 'moderate' | 'high';
  prophylaxisRecommendation: string;
  mechanicalProphylaxis: boolean;
  chemicalProphylaxis: boolean;
  prophylaxisDrug?: string;
  duration?: string;
}

export interface CapriniRiskFactor {
  factor: string;
  points: number;
  present: boolean;
}

export interface BleedingRiskAssessment {
  anticoagulantUse: boolean;
  anticoagulantType?: string;
  lastDose?: Date;
  antiplateletUse: boolean;
  antiplateletType?: string;
  bleedingHistory: boolean;
  bleedingHistoryDetails?: string;
  familyBleedingHistory: boolean;
  coagulationResults: {
    pt?: number;
    inr?: number;
    aptt?: number;
    platelets?: number;
    fibrinogen?: number;
  };
  bleedingRisk: 'low' | 'moderate' | 'high';
  bridgingRequired: boolean;
  recommendations: string[];
}

export interface FastingStatus {
  npoSolidsFrom: Date;
  npoLiquidsFrom: Date;
  lastMealTime?: Date;
  lastClearFluidTime?: Date;
  fastingAdequate: boolean;
  specialInstructions: string[];
}

export interface MedicationReview {
  currentMedications: MedicationInstruction[];
  allergies: string[];
  adverseReactions: string[];
  herbalsSupplements: string[];
  preoperativeInstructions: string[];
}

export interface MedicationInstruction {
  medication: string;
  dose: string;
  frequency: string;
  indication: string;
  preoperativeInstruction: 'continue' | 'hold' | 'modify' | 'bridge';
  holdDuration?: string;
  restartInstruction?: string;
}

export interface AnaestheticPlan {
  technique: 'general' | 'regional' | 'combined' | 'local_mac';
  specificTechnique?: string;
  airwayManagement?: string;
  inductionAgent?: string;
  maintenanceAgent?: string;
  muscleRelaxant?: string;
  analgesiaPlan: string;
  postoperativeDestination: 'ward' | 'hdu' | 'icu' | 'day_surgery';
  specialConsiderations: string[];
  equipmentRequired: string[];
  bloodProducts: {
    crossmatchUnits: number;
    cellSaverRequired: boolean;
  };
}

// ==================== ASA CLASSIFICATION ====================

export const asaClassifications: ASADetails[] = [
  {
    class: 1,
    description: 'A normal healthy patient',
    examples: ['Healthy, non-smoking, no or minimal alcohol use'],
    mortalityRisk: '0.1%',
  },
  {
    class: 2,
    description: 'A patient with mild systemic disease',
    examples: ['Smoker', 'Social alcohol', 'Pregnancy', 'Obesity BMI 30-40', 'Well-controlled DM/HTN', 'Mild lung disease'],
    mortalityRisk: '0.2%',
  },
  {
    class: 3,
    description: 'A patient with severe systemic disease',
    examples: ['Poorly controlled DM/HTN', 'COPD', 'Morbid obesity BMI >40', 'Active hepatitis', 'Alcohol dependence', 'Implanted pacemaker', 'Moderate reduction in EF', 'ESRD on dialysis', 'Premature infant <60 weeks'],
    mortalityRisk: '1.8%',
  },
  {
    class: 4,
    description: 'A patient with severe systemic disease that is a constant threat to life',
    examples: ['Recent MI/CVA <3 months', 'Ongoing cardiac ischemia', 'Severe valve dysfunction', 'Severe reduction in EF', 'Shock', 'Sepsis', 'DIC', 'ARD'],
    mortalityRisk: '7.8%',
  },
  {
    class: 5,
    description: 'A moribund patient who is not expected to survive without the operation',
    examples: ['Ruptured abdominal/thoracic aneurysm', 'Massive trauma', 'Intracranial bleed with mass effect', 'Ischemic bowel with cardiac pathology'],
    mortalityRisk: '9.4%',
  },
  {
    class: 6,
    description: 'A declared brain-dead patient whose organs are being removed for donor purposes',
    examples: ['Organ donor'],
    mortalityRisk: 'N/A',
  },
];

// ==================== MALLAMPATI SCORING ====================

export const mallampatiScores = [
  { score: 1, description: 'Soft palate, fauces, uvula, anterior and posterior pillars visible', difficulty: 'Easy intubation expected' },
  { score: 2, description: 'Soft palate, fauces, uvula visible', difficulty: 'Usually easy intubation' },
  { score: 3, description: 'Soft palate, base of uvula visible', difficulty: 'Potentially difficult' },
  { score: 4, description: 'Soft palate not visible at all', difficulty: 'Anticipated difficult airway' },
];

// ==================== CAPRINI RISK FACTORS ====================

export const capriniRiskFactors: CapriniRiskFactor[] = [
  // 1 point factors
  { factor: 'Age 41-60 years', points: 1, present: false },
  { factor: 'Minor surgery planned', points: 1, present: false },
  { factor: 'BMI > 25 kg/m²', points: 1, present: false },
  { factor: 'Swollen legs (current)', points: 1, present: false },
  { factor: 'Varicose veins', points: 1, present: false },
  { factor: 'Pregnancy or postpartum', points: 1, present: false },
  { factor: 'History of unexplained stillborn', points: 1, present: false },
  { factor: 'Oral contraceptives or HRT', points: 1, present: false },
  { factor: 'Sepsis (<1 month)', points: 1, present: false },
  { factor: 'Serious lung disease incl pneumonia (<1 month)', points: 1, present: false },
  { factor: 'Abnormal pulmonary function', points: 1, present: false },
  { factor: 'Acute MI', points: 1, present: false },
  { factor: 'CHF (<1 month)', points: 1, present: false },
  { factor: 'History of IBD', points: 1, present: false },
  { factor: 'Medical patient currently at bed rest', points: 1, present: false },
  
  // 2 point factors
  { factor: 'Age 61-74 years', points: 2, present: false },
  { factor: 'Arthroscopic surgery', points: 2, present: false },
  { factor: 'Major surgery (>45 minutes)', points: 2, present: false },
  { factor: 'Laparoscopic surgery (>45 minutes)', points: 2, present: false },
  { factor: 'Malignancy (present or previous)', points: 2, present: false },
  { factor: 'Central venous access', points: 2, present: false },
  { factor: 'Immobilizing plaster cast (<1 month)', points: 2, present: false },
  { factor: 'Confined to bed (>72 hours)', points: 2, present: false },
  
  // 3 point factors
  { factor: 'Age ≥75 years', points: 3, present: false },
  { factor: 'History of DVT/PE', points: 3, present: false },
  { factor: 'Family history of DVT/PE', points: 3, present: false },
  { factor: 'Factor V Leiden', points: 3, present: false },
  { factor: 'Prothrombin 20210A', points: 3, present: false },
  { factor: 'Lupus anticoagulant', points: 3, present: false },
  { factor: 'Anticardiolipin antibodies', points: 3, present: false },
  { factor: 'Elevated serum homocysteine', points: 3, present: false },
  { factor: 'Heparin-induced thrombocytopenia', points: 3, present: false },
  { factor: 'Other congenital or acquired thrombophilia', points: 3, present: false },
  
  // 5 point factors
  { factor: 'Stroke (<1 month)', points: 5, present: false },
  { factor: 'Elective major lower extremity arthroplasty', points: 5, present: false },
  { factor: 'Hip, pelvis or leg fracture (<1 month)', points: 5, present: false },
  { factor: 'Acute spinal cord injury (<1 month)', points: 5, present: false },
];

// ==================== RCRI FACTORS ====================

export const rcriFactors = [
  { factor: 'High-risk surgery (intraperitoneal, intrathoracic, or suprainguinal vascular)', points: 1 },
  { factor: 'Ischemic heart disease (MI, positive exercise test, current chest pain, nitrate use, ECG with Q waves)', points: 1 },
  { factor: 'History of congestive heart failure', points: 1 },
  { factor: 'History of cerebrovascular disease (stroke or TIA)', points: 1 },
  { factor: 'Insulin-dependent diabetes mellitus', points: 1 },
  { factor: 'Preoperative creatinine >2.0 mg/dL (177 µmol/L)', points: 1 },
];

// ==================== FASTING GUIDELINES ====================

export const fastingGuidelines = {
  solids: { hours: 6, description: 'Solid food, milk, formula' },
  lightMeal: { hours: 6, description: 'Toast, tea (no milk)' },
  breastMilk: { hours: 4, description: 'Breast milk (infants)' },
  clearFluids: { hours: 2, description: 'Water, clear juices, black coffee/tea' },
  formula: { hours: 6, description: 'Infant formula' },
};

// ==================== SERVICE CLASS ====================

class PreoperativeService {
  // ==================== ASA CLASSIFICATION ====================

  getASAClassification(asaClass: ASAClassification): ASADetails {
    return asaClassifications.find(a => a.class === asaClass) || asaClassifications[0];
  }

  // ==================== AIRWAY ASSESSMENT ====================

  assessAirway(assessment: Partial<AirwayAssessment>): AirwayAssessment['predictedDifficulty'] {
    let difficultFactors = 0;

    if (assessment.mallampatiScore && assessment.mallampatiScore >= 3) difficultFactors++;
    if (assessment.mouthOpening && assessment.mouthOpening < 3) difficultFactors++;
    if (assessment.thyromentalDistance && assessment.thyromentalDistance < 6) difficultFactors++;
    if (assessment.neckMobility === 'limited' || assessment.neckMobility === 'fixed') difficultFactors++;
    if (assessment.previousDifficultIntubation) difficultFactors += 2;
    if (assessment.beardPresent) difficultFactors++;

    if (difficultFactors >= 3) return 'anticipated_difficult';
    if (difficultFactors >= 1) return 'potentially_difficult';
    return 'easy';
  }

  getMallampatiDescription(score: 1 | 2 | 3 | 4): typeof mallampatiScores[0] {
    return mallampatiScores[score - 1];
  }

  // ==================== CARDIAC RISK ====================

  calculateRCRI(factors: CardiacRiskAssessment['rcriFactors']): { score: number; risk: string; recommendations: string[] } {
    let score = 0;
    const recommendations: string[] = [];

    if (factors.highRiskSurgery) score++;
    if (factors.ischemicHeartDisease) score++;
    if (factors.heartFailure) score++;
    if (factors.cerebrovascularDisease) score++;
    if (factors.insulinDependentDiabetes) score++;
    if (factors.renalInsufficiency) score++;

    let risk: string;
    if (score === 0) {
      risk = 'Very low (0.4%)';
      recommendations.push('Proceed with surgery');
    } else if (score === 1) {
      risk = 'Low (0.9%)';
      recommendations.push('Proceed with surgery');
      recommendations.push('Consider beta-blocker if high-risk surgery');
    } else if (score === 2) {
      risk = 'Intermediate (6.6%)';
      recommendations.push('Consider cardiology consult');
      recommendations.push('Optimize medical therapy');
      recommendations.push('Consider functional testing if poor functional capacity');
    } else {
      risk = 'High (11%)';
      recommendations.push('Cardiology consult recommended');
      recommendations.push('Consider non-invasive cardiac testing');
      recommendations.push('Optimize medical therapy before surgery');
      recommendations.push('Consider postponing elective surgery');
    }

    return { score, risk, recommendations };
  }

  assessFunctionalCapacity(mets: number): CardiacRiskAssessment['functionalCapacity'] {
    if (mets >= 10) return 'excellent';
    if (mets >= 7) return 'good';
    if (mets >= 4) return 'moderate';
    return 'poor';
  }

  // ==================== VTE RISK (CAPRINI) ====================

  calculateCapriniScore(selectedFactors: string[]): VTERiskAssessment {
    let score = 0;
    const riskFactors: CapriniRiskFactor[] = [];

    capriniRiskFactors.forEach(factor => {
      const present = selectedFactors.includes(factor.factor);
      if (present) {
        score += factor.points;
      }
      riskFactors.push({ ...factor, present });
    });

    let riskCategory: VTERiskAssessment['riskCategory'];
    let prophylaxisRecommendation: string;
    let mechanicalProphylaxis = false;
    let chemicalProphylaxis = false;
    let prophylaxisDrug: string | undefined;
    let duration: string | undefined;

    if (score === 0) {
      riskCategory = 'very_low';
      prophylaxisRecommendation = 'Early ambulation only';
    } else if (score <= 2) {
      riskCategory = 'low';
      prophylaxisRecommendation = 'Intermittent pneumatic compression (IPC)';
      mechanicalProphylaxis = true;
    } else if (score <= 4) {
      riskCategory = 'moderate';
      prophylaxisRecommendation = 'LMWH or UFH + IPC';
      mechanicalProphylaxis = true;
      chemicalProphylaxis = true;
      prophylaxisDrug = 'Enoxaparin 40mg SC daily or UFH 5000u SC BD';
      duration = '7-10 days or until ambulatory';
    } else {
      riskCategory = 'high';
      prophylaxisRecommendation = 'LMWH or UFH + IPC; consider extended prophylaxis';
      mechanicalProphylaxis = true;
      chemicalProphylaxis = true;
      prophylaxisDrug = 'Enoxaparin 40mg SC daily';
      duration = 'Extended 28 days for major surgery';
    }

    return {
      capriniScore: score,
      riskFactors,
      riskCategory,
      prophylaxisRecommendation,
      mechanicalProphylaxis,
      chemicalProphylaxis,
      prophylaxisDrug,
      duration,
    };
  }

  // ==================== PULMONARY RISK ====================

  calculateSTOPBANG(answers: {
    snoring: boolean;
    tired: boolean;
    observed: boolean;
    pressure: boolean;
    bmi: number;
    age: number;
    neckCircumference: number;
    gender: 'male' | 'female';
  }): { score: number; risk: string; recommendations: string[] } {
    let score = 0;
    const recommendations: string[] = [];

    if (answers.snoring) score++;
    if (answers.tired) score++;
    if (answers.observed) score++;
    if (answers.pressure) score++;
    if (answers.bmi > 35) score++;
    if (answers.age > 50) score++;
    if (answers.neckCircumference > 40) score++;
    if (answers.gender === 'male') score++;

    let risk: string;
    if (score <= 2) {
      risk = 'Low risk for OSA';
    } else if (score <= 4) {
      risk = 'Intermediate risk for OSA';
      recommendations.push('Consider sleep study');
      recommendations.push('Avoid heavy sedation postoperatively');
    } else {
      risk = 'High risk for OSA';
      recommendations.push('Refer for sleep study and CPAP evaluation');
      recommendations.push('Plan for postoperative monitoring in HDU');
      recommendations.push('Consider regional anesthesia if appropriate');
      recommendations.push('Minimize opioids; use multimodal analgesia');
    }

    return { score, risk, recommendations };
  }

  // ==================== BLEEDING RISK ====================

  assessBleedingRisk(
    coagResults: BleedingRiskAssessment['coagulationResults'],
    anticoagulant?: string,
    bleeding_history?: boolean
  ): BleedingRiskAssessment['bleedingRisk'] {
    let riskScore = 0;

    // Check INR
    if (coagResults.inr) {
      if (coagResults.inr > 1.5) riskScore += 2;
      else if (coagResults.inr > 1.3) riskScore += 1;
    }

    // Check platelets
    if (coagResults.platelets) {
      if (coagResults.platelets < 50) riskScore += 2;
      else if (coagResults.platelets < 100) riskScore += 1;
    }

    // Anticoagulant use
    if (anticoagulant) riskScore += 1;

    // Bleeding history
    if (bleeding_history) riskScore += 2;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'moderate';
    return 'low';
  }

  getAnticoagulantManagement(drug: string, surgeryType: 'minor' | 'major'): MedicationInstruction {
    const management: Record<string, { hold: string; restart: string; bridge?: boolean }> = {
      warfarin: { hold: '5 days', restart: '12-24 hours post-op', bridge: true },
      rivaroxaban: { hold: surgeryType === 'major' ? '48 hours' : '24 hours', restart: '24-48 hours post-op' },
      apixaban: { hold: surgeryType === 'major' ? '48 hours' : '24 hours', restart: '24-48 hours post-op' },
      dabigatran: { hold: surgeryType === 'major' ? '72 hours' : '24-48 hours', restart: '48-72 hours post-op' },
      enoxaparin: { hold: '24 hours', restart: '24 hours post-op' },
      aspirin: { hold: surgeryType === 'major' ? '7 days' : 'Continue', restart: '24 hours post-op' },
      clopidogrel: { hold: '5-7 days', restart: '24 hours post-op' },
    };

    const mgmt = management[drug.toLowerCase()] || { hold: 'Consult haematology', restart: 'Consult haematology' };

    return {
      medication: drug,
      dose: '',
      frequency: '',
      indication: 'Anticoagulation/antiplatelet',
      preoperativeInstruction: mgmt.hold === 'Continue' ? 'continue' : 'hold',
      holdDuration: mgmt.hold,
      restartInstruction: mgmt.restart,
    };
  }

  // ==================== FASTING ASSESSMENT ====================

  assessFastingStatus(
    surgeryTime: Date,
    lastSolidsTime?: Date,
    lastClearFluidsTime?: Date
  ): FastingStatus {
    let fastingAdequate = true;
    const specialInstructions: string[] = [];

    // Calculate NPO times
    const npoSolidsFrom = new Date(surgeryTime.getTime() - 6 * 60 * 60 * 1000);
    const npoLiquidsFrom = new Date(surgeryTime.getTime() - 2 * 60 * 60 * 1000);

    if (lastSolidsTime) {
      const hoursSinceSolids = (surgeryTime.getTime() - lastSolidsTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSolids < 6) {
        fastingAdequate = false;
        specialInstructions.push(`Inadequate fasting for solids (${hoursSinceSolids.toFixed(1)} hours). Minimum 6 hours required.`);
      }
    }

    if (lastClearFluidsTime) {
      const hoursSinceFluids = (surgeryTime.getTime() - lastClearFluidsTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFluids < 2) {
        fastingAdequate = false;
        specialInstructions.push(`Inadequate fasting for clear fluids (${hoursSinceFluids.toFixed(1)} hours). Minimum 2 hours required.`);
      }
    }

    if (fastingAdequate) {
      specialInstructions.push('Fasting adequate - patient cleared for surgery');
    }

    return {
      npoSolidsFrom,
      npoLiquidsFrom,
      lastMealTime: lastSolidsTime,
      lastClearFluidTime: lastClearFluidsTime,
      fastingAdequate,
      specialInstructions,
    };
  }

  generateFastingInstructions(surgeryDateTime: Date, isChild: boolean = false): string[] {
    const instructions: string[] = [];
    const solidsDeadline = new Date(surgeryDateTime.getTime() - 6 * 60 * 60 * 1000);
    const clearFluidsDeadline = new Date(surgeryDateTime.getTime() - 2 * 60 * 60 * 1000);

    instructions.push(`Surgery scheduled for: ${surgeryDateTime.toLocaleString()}`);
    instructions.push('');
    instructions.push('FASTING INSTRUCTIONS:');
    instructions.push(`❌ NO solid food or milk after: ${solidsDeadline.toLocaleString()}`);
    instructions.push(`✓ Clear fluids (water, clear juice, black coffee/tea) until: ${clearFluidsDeadline.toLocaleString()}`);
    
    if (isChild) {
      const breastMilkDeadline = new Date(surgeryDateTime.getTime() - 4 * 60 * 60 * 1000);
      instructions.push(`🍼 Breast milk until: ${breastMilkDeadline.toLocaleString()}`);
    }

    instructions.push('');
    instructions.push('MEDICATIONS:');
    instructions.push('• Take morning medications with small sip of water unless advised otherwise');
    instructions.push('• Hold diabetic medications on morning of surgery');
    instructions.push('• Bring all medications to hospital');
    instructions.push('');
    instructions.push('IMPORTANT:');
    instructions.push('• Remove all jewelry and piercings');
    instructions.push('• No makeup or nail polish');
    instructions.push('• Bring comfortable clothing');
    instructions.push('• Arrange transport home (no driving for 24 hours)');

    return instructions;
  }

  // ==================== REQUIRED INVESTIGATIONS ====================

  getRequiredInvestigations(
    asaClass: ASAClassification,
    surgeryType: 'minor' | 'intermediate' | 'major',
    age: number,
    conditions: string[]
  ): string[] {
    const investigations: string[] = [];

    // Age-based
    if (age >= 50 || asaClass >= 3) {
      investigations.push('ECG');
    }

    if (age >= 60 || asaClass >= 3) {
      investigations.push('Full Blood Count');
      investigations.push('Urea, Electrolytes, Creatinine');
    }

    // Surgery-based
    if (surgeryType === 'major' || surgeryType === 'intermediate') {
      investigations.push('Full Blood Count');
      investigations.push('Urea, Electrolytes, Creatinine');
      investigations.push('Blood Group and Save');
    }

    if (surgeryType === 'major') {
      investigations.push('Coagulation Profile (PT/INR/APTT)');
      investigations.push('Liver Function Tests');
      investigations.push('Chest X-Ray');
      investigations.push('Cross-match blood units');
    }

    // Condition-based
    if (conditions.includes('diabetes')) {
      investigations.push('Fasting Blood Glucose');
      investigations.push('HbA1c');
    }

    if (conditions.includes('cardiac')) {
      investigations.push('ECG');
      investigations.push('Echocardiogram');
    }

    if (conditions.includes('respiratory')) {
      investigations.push('Chest X-Ray');
      investigations.push('Pulmonary Function Tests');
    }

    if (conditions.includes('liver_disease')) {
      investigations.push('Liver Function Tests');
      investigations.push('Coagulation Profile');
    }

    if (conditions.includes('renal_disease')) {
      investigations.push('Urea, Electrolytes, Creatinine');
      investigations.push('eGFR');
    }

    // Remove duplicates
    return [...new Set(investigations)];
  }

  // ==================== DATABASE OPERATIONS ====================

  async saveAssessment(assessment: PreoperativeAssessmentService): Promise<void> {
    // This would save to the database
    // For now, we'll use the existing encounters or create a new table
    console.log('Saving preoperative assessment:', assessment);
  }

  async getPatientAssessments(): Promise<PreoperativeAssessmentService[]> {
    // This would fetch from database
    return [];
  }
}

export const preoperativeService = new PreoperativeService();
