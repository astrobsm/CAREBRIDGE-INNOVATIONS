/**
 * Emergency Clinical Decision Support Service
 * AstroHEALTH - AI-Powered Pre-Operative Optimization
 * 
 * WHO-aligned, evidence-based, stepwise resuscitation and pre-operative
 * optimization guidance for emergency surgical debridement.
 * 
 * Based on:
 * - WHO Emergency Care Guidelines
 * - Surviving Sepsis Campaign 2021
 * - Standard Peri-operative Care Principles
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  EmergencyCDSInput,
  EmergencyCDSAssessment,
  TriageAssessment,
  ABCAssessment,
  SepsisManagement,
  GlycaemicControl,
  FluidElectrolyteManagement,
  AnaemiaManagement,
  RenalMetabolicSupport,
  PreOperativePreparation,
  SurgicalFitnessEndpoints,
  PostDebridementCare,
  CDSSection,
  CDSRecommendation,
  QSOFAScore,
  SOFAScore,
  SepsisSeverity,
} from '../domains/emergency-cds/types';

// ============================================================
// CLINICAL CONSTANTS & THRESHOLDS
// ============================================================

const CLINICAL_THRESHOLDS = {
  // Vital Signs - Critical
  systolicBPCritical: 90,
  systolicBPLow: 100,
  mapTarget: 65,
  heartRateTachycardia: 100,
  heartRateBradycardia: 60,
  respiratoryRateHigh: 22,
  respiratoryRateLow: 12,
  spo2Critical: 90,
  spo2Target: 94,
  temperatureFever: 38.3,
  temperatureHypothermia: 36.0,
  
  // Glucose (mmol/L)
  glucoseLow: 4.0,
  glucoseHigh: 10.0,
  glucoseCriticalHigh: 20.0,
  glucoseTargetMin: 7.8,
  glucoseTargetMax: 10.0,
  
  // Haemoglobin (g/dL)
  hbCritical: 7.0,
  hbTransfusionThreshold: 8.0,
  hbPreOpTarget: 8.0,
  
  // Electrolytes (mmol/L)
  sodiumLow: 135,
  sodiumHigh: 145,
  potassiumLow: 3.5,
  potassiumHigh: 5.5,
  potassiumCriticalLow: 3.0,
  potassiumCriticalHigh: 6.0,
  bicarbonateTarget: 22,
  
  // Renal (µmol/L)
  creatinineNormal: 110,
  
  // Lactate (mmol/L)
  lactateMild: 2.0,
  lactateSevere: 4.0,
  
  // Urine Output
  urineOutputTarget: 0.5, // mL/kg/hr
};

// ============================================================
// qSOFA CALCULATION
// ============================================================

export function calculateQSOFA(input: EmergencyCDSInput): QSOFAScore {
  const respiratoryRate = input.vitalSigns.respiratoryRate >= 22;
  const alteredMentation = input.mentalStatus?.gcsTotal !== undefined && input.mentalStatus.gcsTotal < 15;
  const systolicBP = input.vitalSigns.bloodPressureSystolic <= 100;
  
  const totalScore = [respiratoryRate, alteredMentation, systolicBP].filter(Boolean).length;
  
  return {
    respiratoryRate,
    alteredMentation,
    systolicBP,
    totalScore,
    sepsisSuspected: totalScore >= 2,
  };
}

// ============================================================
// SOFA SCORE CALCULATION
// ============================================================

export function calculateSOFA(input: EmergencyCDSInput): SOFAScore {
  const lab = input.laboratory || {};
  const vitals = input.vitalSigns;
  const organ = input.organDysfunction || {};
  
  // Respiration (PaO2/FiO2 approximation from SpO2)
  let respiration = 0;
  if (vitals.oxygenSaturation < 85) respiration = 4;
  else if (vitals.oxygenSaturation < 90) respiration = 3;
  else if (vitals.oxygenSaturation < 95) respiration = 2;
  else if (vitals.oxygenSaturation < 98) respiration = 1;
  
  // Coagulation
  let coagulation = 0;
  if (lab.plateletCount !== undefined) {
    if (lab.plateletCount < 20) coagulation = 4;
    else if (lab.plateletCount < 50) coagulation = 3;
    else if (lab.plateletCount < 100) coagulation = 2;
    else if (lab.plateletCount < 150) coagulation = 1;
  }
  
  // Liver
  let liver = 0;
  if (lab.bilirubin !== undefined) {
    if (lab.bilirubin >= 204) liver = 4;
    else if (lab.bilirubin >= 102) liver = 3;
    else if (lab.bilirubin >= 33) liver = 2;
    else if (lab.bilirubin >= 20) liver = 1;
  }
  
  // Cardiovascular
  let cardiovascular = 0;
  if (organ.requiresVasopressors) cardiovascular = 3;
  else if (vitals.bloodPressureSystolic < 90) cardiovascular = 2;
  else if (vitals.bloodPressureSystolic < 100) cardiovascular = 1;
  
  // CNS (GCS)
  let cns = 0;
  if (input.mentalStatus?.gcsTotal !== undefined) {
    const gcs = input.mentalStatus.gcsTotal;
    if (gcs < 6) cns = 4;
    else if (gcs < 10) cns = 3;
    else if (gcs < 13) cns = 2;
    else if (gcs < 15) cns = 1;
  }
  
  // Renal
  let renal = 0;
  if (lab.creatinine !== undefined) {
    if (lab.creatinine >= 440) renal = 4;
    else if (lab.creatinine >= 300) renal = 3;
    else if (lab.creatinine >= 171) renal = 2;
    else if (lab.creatinine >= 110) renal = 1;
  }
  
  const totalScore = respiration + coagulation + liver + cardiovascular + cns + renal;
  
  let mortalityRisk = 'Low (<10%)';
  if (totalScore >= 15) mortalityRisk = 'Very High (>90%)';
  else if (totalScore >= 12) mortalityRisk = 'High (50-80%)';
  else if (totalScore >= 9) mortalityRisk = 'Moderate (30-50%)';
  else if (totalScore >= 6) mortalityRisk = 'Increased (15-30%)';
  
  return {
    respiration,
    coagulation,
    liver,
    cardiovascular,
    cns,
    renal,
    totalScore,
    mortalityRisk,
  };
}

// ============================================================
// TRIAGE ASSESSMENT
// ============================================================

function generateTriageAssessment(input: EmergencyCDSInput): TriageAssessment {
  const lifeThreatening: string[] = [];
  const qsofa = calculateQSOFA(input);
  
  // Identify life-threatening abnormalities
  if (input.vitalSigns.bloodPressureSystolic < CLINICAL_THRESHOLDS.systolicBPCritical) {
    lifeThreatening.push('Hypotension (SBP <90 mmHg) - haemodynamic instability');
  }
  if (input.vitalSigns.oxygenSaturation < CLINICAL_THRESHOLDS.spo2Critical) {
    lifeThreatening.push('Hypoxaemia (SpO2 <90%) - respiratory compromise');
  }
  if (input.mentalStatus?.gcsTotal && input.mentalStatus.gcsTotal < 9) {
    lifeThreatening.push('Altered consciousness (GCS <9) - central nervous system depression');
  }
  if (input.laboratory?.lactate && input.laboratory.lactate >= CLINICAL_THRESHOLDS.lactateSevere) {
    lifeThreatening.push('Elevated lactate (≥4 mmol/L) - tissue hypoperfusion');
  }
  if (input.laboratory?.potassium && 
      (input.laboratory.potassium < CLINICAL_THRESHOLDS.potassiumCriticalLow || 
       input.laboratory.potassium > CLINICAL_THRESHOLDS.potassiumCriticalHigh)) {
    lifeThreatening.push('Critical potassium derangement - cardiac arrhythmia risk');
  }
  if (input.organDysfunction?.hasShock) {
    lifeThreatening.push('Shock state - requires immediate vasopressor consideration');
  }
  
  // Determine sepsis severity
  let sepsisSeverity: SepsisSeverity = 'sepsis';
  if (input.patientProfile.septicShock || 
      (input.organDysfunction?.requiresVasopressors && 
       input.laboratory?.lactate && input.laboratory.lactate > 2)) {
    sepsisSeverity = 'septic_shock';
  } else if (input.organDysfunction?.hasShock || qsofa.totalScore >= 2) {
    sepsisSeverity = 'severe_sepsis';
  }
  
  // Determine surgical urgency
  let surgicalUrgency: 'immediate' | 'within_1_hour' | 'within_6_hours' = 'within_1_hour';
  if (sepsisSeverity === 'septic_shock' || lifeThreatening.length >= 2) {
    surgicalUrgency = 'immediate';
  } else if (sepsisSeverity === 'severe_sepsis') {
    surgicalUrgency = 'within_1_hour';
  } else {
    surgicalUrgency = 'within_6_hours';
  }
  
  // Parallel resuscitation?
  const parallelResuscitationSurgery = surgicalUrgency === 'immediate' || sepsisSeverity === 'septic_shock';
  
  return {
    triagePriority: lifeThreatening.length > 0 ? 'immediate' : 'urgent',
    lifeThreatening,
    sepsisSeverity,
    surgicalUrgency,
    parallelResuscitationSurgery,
    resuscitationNote: parallelResuscitationSurgery
      ? 'Resuscitation and surgical source control should proceed in parallel. Do not delay surgery for complete optimization in septic shock.'
      : 'Initiate resuscitation immediately. Optimize patient before theatre within safe time limits.',
  };
}

// ============================================================
// ABC ASSESSMENT
// ============================================================

function generateABCAssessment(input: EmergencyCDSInput): ABCAssessment {
  const vitals = input.vitalSigns;
  const mental = input.mentalStatus;
  
  // AIRWAY
  let airwayStatus: 'patent' | 'at_risk' | 'compromised' = 'patent';
  const airwayProtectionIndicated = (mental?.gcsTotal && mental.gcsTotal < 9) || 
    mental?.avpu === 'pain' || mental?.avpu === 'unresponsive';
  
  if (airwayProtectionIndicated) {
    airwayStatus = 'compromised';
  } else if (mental?.gcsTotal && mental.gcsTotal < 12) {
    airwayStatus = 'at_risk';
  }
  
  const airwayAssessmentSteps = [
    'Assess patency: Look, listen, feel for airflow',
    'Check for obstruction: Blood, vomit, secretions, foreign body',
    'Evaluate protective reflexes: Cough, gag reflex',
    'Assess phonation: Can patient speak clearly?',
    'Position patient appropriately: Head tilt-chin lift if unconscious',
  ];
  
  const airwayInterventions: string[] = [];
  if (airwayStatus === 'compromised') {
    airwayInterventions.push('Immediate airway protection required');
    airwayInterventions.push('Call anaesthetist for endotracheal intubation');
    airwayInterventions.push('Prepare suction, bag-valve-mask, intubation equipment');
  } else if (airwayStatus === 'at_risk') {
    airwayInterventions.push('Close monitoring of airway patency');
    airwayInterventions.push('Keep suction and airway adjuncts at bedside');
    airwayInterventions.push('Consider recovery position if unconscious');
  }
  
  // BREATHING
  let breathingStatus: 'adequate' | 'compromised' | 'failing' = 'adequate';
  if (vitals.oxygenSaturation < 90 || vitals.respiratoryRate > 30 || vitals.respiratoryRate < 8) {
    breathingStatus = 'failing';
  } else if (vitals.oxygenSaturation < 94 || vitals.respiratoryRate > 25) {
    breathingStatus = 'compromised';
  }
  
  const breathingInterventions: string[] = [];
  const supplementalOxygenRequired = vitals.oxygenSaturation < CLINICAL_THRESHOLDS.spo2Target;
  const assistedVentilationIndicated = breathingStatus === 'failing';
  
  if (supplementalOxygenRequired) {
    breathingInterventions.push(`Administer supplemental oxygen to maintain SpO2 94-98%`);
    if (vitals.oxygenSaturation < 90) {
      breathingInterventions.push('High-flow oxygen via non-rebreather mask at 15 L/min');
    } else {
      breathingInterventions.push('Nasal cannula 2-4 L/min or face mask 5-10 L/min');
    }
  }
  
  if (assistedVentilationIndicated) {
    breathingInterventions.push('Prepare for assisted ventilation');
    breathingInterventions.push('Consider non-invasive ventilation (BiPAP/CPAP) if conscious');
    breathingInterventions.push('Alert anaesthetist for possible intubation');
  }
  
  // CIRCULATION
  let circulationStatus: 'stable' | 'unstable' | 'shock' = 'stable';
  if (vitals.bloodPressureSystolic < CLINICAL_THRESHOLDS.systolicBPCritical || 
      input.organDysfunction?.hasShock) {
    circulationStatus = 'shock';
  } else if (vitals.bloodPressureSystolic < CLINICAL_THRESHOLDS.systolicBPLow ||
             vitals.heartRate > 120 || (vitals.capillaryRefillTime && vitals.capillaryRefillTime > 3)) {
    circulationStatus = 'unstable';
  }
  
  const circulationInterventions: string[] = [];
  circulationInterventions.push('Establish IV access: 2 large-bore cannulae (≥18G), preferably antecubital');
  
  if (circulationStatus !== 'stable') {
    circulationInterventions.push('Initiate fluid resuscitation immediately');
    circulationInterventions.push('Take blood samples during cannulation: FBC, U&E, glucose, lactate, blood cultures, group & save');
  }
  
  return {
    airway: {
      status: airwayStatus,
      assessmentSteps: airwayAssessmentSteps,
      airwayProtectionIndicated,
      interventions: airwayInterventions,
    },
    breathing: {
      status: breathingStatus,
      oxygenTarget: '94-98%',
      currentSpO2: vitals.oxygenSaturation,
      supplementalOxygenRequired,
      assistedVentilationIndicated,
      interventions: breathingInterventions,
    },
    circulation: {
      status: circulationStatus,
      ivAccessRequired: '2 large-bore IV cannulae (≥18G) in antecubital fossae',
      fluidType: 'Crystalloid (0.9% Normal Saline or Balanced Solution e.g., Ringer\'s Lactate)',
      initialBolusVolume: 30 * (input.patientProfile.weight || 70), // 30 mL/kg
      bolusRate: 'Rapid infusion over 15-30 minutes',
      monitoringParameters: [
        'Blood pressure every 5-15 minutes',
        'Heart rate continuous monitoring',
        'Urine output via indwelling catheter',
        'Capillary refill time',
        'Mental status (GCS/AVPU)',
        'Lactate clearance (repeat in 2-4 hours)',
      ],
      interventions: circulationInterventions,
    },
  };
}

// ============================================================
// SEPSIS MANAGEMENT
// ============================================================

function generateSepsisManagement(input: EmergencyCDSInput): SepsisManagement {
  const hourOneSepsisBundle: CDSRecommendation[] = [
    {
      id: uuidv4(),
      category: 'Sepsis Hour-1 Bundle',
      priority: 'critical',
      recommendation: 'Measure lactate level. Re-measure if initial lactate >2 mmol/L.',
      target: 'Lactate <2 mmol/L',
      timeline: 'Within 1 hour of presentation',
      status: 'pending',
    },
    {
      id: uuidv4(),
      category: 'Sepsis Hour-1 Bundle',
      priority: 'critical',
      recommendation: 'Obtain blood cultures before antibiotic administration.',
      rationale: 'Blood cultures guide targeted antibiotic therapy and improve outcomes.',
      timeline: 'Before antibiotics, within 1 hour',
      status: input.bloodCulturesTaken ? 'completed' : 'pending',
    },
    {
      id: uuidv4(),
      category: 'Sepsis Hour-1 Bundle',
      priority: 'critical',
      recommendation: 'Administer broad-spectrum IV antibiotics.',
      rationale: 'Each hour of delay in antibiotics increases mortality by 7.6%.',
      timeline: 'Within 1 hour of recognition',
      status: 'pending',
    },
    {
      id: uuidv4(),
      category: 'Sepsis Hour-1 Bundle',
      priority: 'critical',
      recommendation: 'Begin rapid IV fluid resuscitation: 30 mL/kg crystalloid for hypotension or lactate ≥4 mmol/L.',
      target: 'MAP ≥65 mmHg, lactate normalization',
      timeline: 'Within first 3 hours',
      status: 'pending',
    },
    {
      id: uuidv4(),
      category: 'Sepsis Hour-1 Bundle',
      priority: 'critical',
      recommendation: 'Apply vasopressors if hypotensive during or after fluid resuscitation to maintain MAP ≥65 mmHg.',
      rationale: 'Norepinephrine is first-line vasopressor per Surviving Sepsis Campaign.',
      timeline: 'If MAP <65 mmHg despite fluids',
      status: 'pending',
    },
  ];
  
  return {
    hourOneSepsisBundle,
    empiricalAntibioticPrinciples: [
      'Broad-spectrum coverage against gram-positive and gram-negative organisms',
      'Include anaerobic coverage for diabetic foot infections',
      'Consider local resistance patterns and hospital antibiogram',
      'Adjust based on renal function',
      'De-escalate when culture results available (usually 48-72 hours)',
      'Typical coverage: Anti-staphylococcal + anti-pseudomonal + anaerobic',
    ],
    bloodCultureTiming: 'Obtain at least 2 sets of blood cultures (aerobic and anaerobic) from different sites before antibiotic administration, ideally within 45 minutes of presentation.',
    sourceControlRationale: 'Emergency surgical debridement is essential for source control in diabetic foot infection with sepsis. Removal of infected/necrotic tissue reduces bacterial load and allows antibiotics to be more effective. This is a life-saving and limb-saving intervention.',
    lactateAssessment: {
      currentLevel: input.laboratory?.lactate,
      target: '<2 mmol/L',
      reassessmentInterval: 'Every 2-4 hours until normalized',
    },
    vasopressorIndications: [
      'MAP <65 mmHg despite adequate fluid resuscitation (30 mL/kg)',
      'Persistent hypotension requiring ongoing fluid boluses',
      'Signs of end-organ hypoperfusion despite fluids',
      'Lactate >4 mmol/L with hypotension',
    ],
    perfusionTargets: [
      'MAP ≥65 mmHg',
      'Urine output ≥0.5 mL/kg/hr',
      'Lactate declining or normalized',
      'Capillary refill <3 seconds',
      'Mental status improving',
    ],
  };
}

// ============================================================
// GLYCAEMIC CONTROL
// ============================================================

function generateGlycaemicControl(input: EmergencyCDSInput): GlycaemicControl {
  const currentGlucose = input.laboratory?.randomBloodGlucose;
  const immediateStrategy: string[] = [];
  
  if (currentGlucose && currentGlucose > CLINICAL_THRESHOLDS.glucoseCriticalHigh) {
    immediateStrategy.push('Critical hyperglycaemia detected - immediate IV insulin infusion required');
    immediateStrategy.push('Start IV insulin at 0.1 units/kg/hr');
    immediateStrategy.push('Monitor glucose hourly');
    immediateStrategy.push('Check for diabetic ketoacidosis (DKA) or hyperosmolar state (HHS)');
  } else if (currentGlucose && currentGlucose > CLINICAL_THRESHOLDS.glucoseHigh) {
    immediateStrategy.push('Initiate variable rate IV insulin infusion (VRIII)');
    immediateStrategy.push('Use hospital sliding scale protocol');
    immediateStrategy.push('Monitor glucose every 1-2 hours');
  }
  
  immediateStrategy.push('Withhold oral hypoglycaemic agents peri-operatively');
  immediateStrategy.push('Ensure IV dextrose available to prevent hypoglycaemia');
  
  return {
    currentGlucose,
    immediateStrategy,
    targetGlucoseRange: {
      min: CLINICAL_THRESHOLDS.glucoseTargetMin,
      max: CLINICAL_THRESHOLDS.glucoseTargetMax,
      unit: 'mmol/L',
    },
    monitoringFrequency: 'Every 1-2 hours during resuscitation, every 2-4 hours intra-operatively',
    hypoglycaemiaPrevention: [
      'Target glucose >6 mmol/L to avoid hypoglycaemia',
      'Have 50% dextrose available at bedside',
      'Provide 5-10% dextrose infusion if insulin being used',
      'Watch for signs: sweating, tremor, confusion, palpitations',
      'Treat hypoglycaemia (<4 mmol/L): 50 mL of 50% dextrose IV',
    ],
    insulinProtocol: currentGlucose && currentGlucose > 12
      ? 'Variable Rate Intravenous Insulin Infusion (VRIII) per hospital protocol'
      : 'Monitor and initiate VRIII if glucose rises >12 mmol/L',
  };
}

// ============================================================
// FLUID & ELECTROLYTE MANAGEMENT
// ============================================================

function generateFluidElectrolyteManagement(input: EmergencyCDSInput): FluidElectrolyteManagement {
  const lab = input.laboratory || {};
  const weight = input.patientProfile.weight || 70;
  
  // Estimate dehydration severity
  let dehydrationSeverity = input.patientProfile.dehydrationSeverity || 'moderate';
  
  // Estimate fluid deficit
  let estimatedFluidDeficit = 0;
  switch (dehydrationSeverity) {
    case 'mild':
      estimatedFluidDeficit = weight * 30; // 3% body weight
      break;
    case 'moderate':
      estimatedFluidDeficit = weight * 60; // 6% body weight
      break;
    case 'severe':
      estimatedFluidDeficit = weight * 100; // 10% body weight
      break;
  }
  
  const electrolyteCorrections: FluidElectrolyteManagement['electrolyteCorrections'] = [];
  const correctionPriorities: string[] = [];
  
  // Potassium
  if (lab.potassium !== undefined) {
    if (lab.potassium < CLINICAL_THRESHOLDS.potassiumCriticalLow) {
      correctionPriorities.push('CRITICAL: Severe hypokalaemia - correct before anaesthesia');
      electrolyteCorrections.push({
        electrolyte: 'Potassium',
        currentLevel: lab.potassium,
        targetLevel: '≥3.5 mmol/L',
        correctionApproach: 'IV potassium chloride in saline. Maximum 20 mmol/hour via central line or 10 mmol/hour peripheral.',
        rate: '10-20 mmol/hour with cardiac monitoring',
      });
    } else if (lab.potassium < CLINICAL_THRESHOLDS.potassiumLow) {
      correctionPriorities.push('Hypokalaemia - requires correction');
      electrolyteCorrections.push({
        electrolyte: 'Potassium',
        currentLevel: lab.potassium,
        targetLevel: '≥4.0 mmol/L',
        correctionApproach: 'IV or oral potassium supplementation',
        rate: '10-20 mmol added to IV fluids',
      });
    } else if (lab.potassium > CLINICAL_THRESHOLDS.potassiumCriticalHigh) {
      correctionPriorities.push('CRITICAL: Severe hyperkalaemia - life-threatening arrhythmia risk');
      electrolyteCorrections.push({
        electrolyte: 'Potassium',
        currentLevel: lab.potassium,
        targetLevel: '<5.5 mmol/L',
        correctionApproach: 'Calcium gluconate (cardiac stabilization), insulin-dextrose, salbutamol nebulizer, consider dialysis',
        rate: 'Immediate intervention',
      });
    }
  }
  
  // Sodium
  if (lab.sodium !== undefined) {
    if (lab.sodium < 125 || lab.sodium > 155) {
      correctionPriorities.push(`Sodium derangement (${lab.sodium} mmol/L) - correct slowly`);
      electrolyteCorrections.push({
        electrolyte: 'Sodium',
        currentLevel: lab.sodium,
        targetLevel: '135-145 mmol/L',
        correctionApproach: lab.sodium < 125 
          ? 'Gradual correction with 0.9% saline. Do not exceed 8-10 mmol/L per 24 hours.'
          : 'Free water replacement. Monitor for cerebral oedema.',
        rate: 'Slow correction over 24-48 hours',
      });
    }
  }
  
  // Bicarbonate / Acidosis
  if (lab.bicarbonate !== undefined && lab.bicarbonate < 18) {
    correctionPriorities.push('Metabolic acidosis - address underlying cause');
    electrolyteCorrections.push({
      electrolyte: 'Bicarbonate',
      currentLevel: lab.bicarbonate,
      targetLevel: '>22 mmol/L',
      correctionApproach: 'Correct underlying cause (sepsis, dehydration). Consider sodium bicarbonate only if pH <7.1',
    });
  }
  
  if (correctionPriorities.length === 0) {
    correctionPriorities.push('Continue fluid resuscitation');
    correctionPriorities.push('Monitor electrolytes every 4-6 hours');
  }
  
  return {
    dehydrationSeverity,
    estimatedFluidDeficit,
    correctionPriorities,
    electrolyteCorrections,
    monitoringRequirements: [
      'Electrolytes (Na, K, Cl, HCO3): Every 4-6 hours during resuscitation',
      'Renal function (Cr, Urea): Every 6-12 hours',
      'Blood glucose: Every 1-2 hours',
      'Urine output: Hourly via indwelling catheter',
      'Fluid balance chart: Strict input/output monitoring',
    ],
    fluidPlan: [
      {
        phase: 'resuscitation',
        fluidType: 'Crystalloid (0.9% NaCl or balanced solution)',
        volume: 30 * weight,
        rate: 'Over 15-30 minutes',
        duration: 'Repeat up to 3 boluses as needed',
      },
      {
        phase: 'replacement',
        fluidType: 'Crystalloid with potassium as indicated',
        volume: estimatedFluidDeficit / 2,
        rate: 'Over first 6-8 hours',
        duration: '6-8 hours',
      },
      {
        phase: 'maintenance',
        fluidType: 'Crystalloid (consider dextrose-saline if glucose stable)',
        volume: 25 * weight, // 25 mL/kg/day
        rate: `${Math.round((25 * weight) / 24)} mL/hr`,
        duration: 'Ongoing',
      },
    ],
  };
}

// ============================================================
// ANAEMIA MANAGEMENT
// ============================================================

function generateAnaemiaManagement(input: EmergencyCDSInput): AnaemiaManagement {
  const hb = input.laboratory?.haemoglobin;
  
  let anaemiaSeverity: AnaemiaManagement['anaemiaSeverity'] = 'mild';
  let transfusionIndicated = false;
  let unitsRequired: number | undefined;
  
  if (hb !== undefined) {
    if (hb < 5) {
      anaemiaSeverity = 'life_threatening';
      transfusionIndicated = true;
      unitsRequired = 4;
    } else if (hb < CLINICAL_THRESHOLDS.hbCritical) {
      anaemiaSeverity = 'severe';
      transfusionIndicated = true;
      unitsRequired = 2;
    } else if (hb < CLINICAL_THRESHOLDS.hbTransfusionThreshold) {
      anaemiaSeverity = 'moderate';
      transfusionIndicated = true;
      unitsRequired = 1;
    } else if (hb < 10) {
      anaemiaSeverity = 'mild';
      transfusionIndicated = false;
    }
  }
  
  const specialConsiderations: string[] = [
    'Cross-match blood and have available in theatre',
    'Consider cell salvage if significant blood loss expected',
    'Monitor for transfusion reactions',
    'Repeat haemoglobin post-transfusion and post-surgery',
  ];
  
  if (input.patientProfile.confirmedDiabetesMellitus) {
    specialConsiderations.push('Diabetic patients may have impaired compensatory response to anaemia');
  }
  
  return {
    currentHaemoglobin: hb,
    anaemiaSeverity,
    transfusionIndicated,
    transfusionThreshold: 'Hb <8 g/dL for emergency surgery; <7 g/dL for stable patients',
    preOpHaemoglobinTarget: '≥8 g/dL for emergency surgery',
    unitsRequired,
    specialConsiderations,
  };
}

// ============================================================
// RENAL & METABOLIC SUPPORT
// ============================================================

function generateRenalMetabolicSupport(input: EmergencyCDSInput): RenalMetabolicSupport {
  const lab = input.laboratory || {};
  const weight = input.patientProfile.weight || 70;
  
  let renalStatus: RenalMetabolicSupport['renalStatus'] = 'normal';
  
  if (lab.creatinine !== undefined) {
    if (lab.creatinine >= 300 || lab.estimatedGFR !== undefined && lab.estimatedGFR < 15) {
      renalStatus = 'failure';
    } else if (lab.creatinine >= 200 || lab.estimatedGFR !== undefined && lab.estimatedGFR < 30) {
      renalStatus = 'acute_injury';
    } else if (lab.creatinine >= CLINICAL_THRESHOLDS.creatinineNormal) {
      renalStatus = 'impaired';
    }
  }
  
  const urineOutputTarget = `≥0.5 mL/kg/hr (≥${Math.round(0.5 * weight)} mL/hr for this patient)`;
  
  const renalProtectionStrategies = [
    'Maintain adequate perfusion with fluid resuscitation',
    'Avoid nephrotoxic agents (NSAIDs, aminoglycosides if possible)',
    'Adjust antibiotic dosing for renal function',
    'Monitor urine output hourly',
    'Avoid iodinated contrast if possible',
  ];
  
  const nephrotoxicAvoidance = [
    'NSAIDs (non-steroidal anti-inflammatory drugs)',
    'Aminoglycoside antibiotics (gentamicin, amikacin) - if used, use once-daily dosing and monitor levels',
    'IV contrast agents',
    'ACE inhibitors/ARBs (withhold temporarily)',
    'Metformin (withhold peri-operatively)',
  ];
  
  const glucoseAdjustmentsInRenalImpairment = [
    'Insulin clearance reduced - risk of hypoglycaemia',
    'Reduce insulin doses by 25-50% in severe renal impairment',
    'Monitor glucose more frequently',
    'Avoid metformin (contraindicated in eGFR <30)',
    'Use short-acting insulin for better control',
  ];
  
  let dialysisConsideration: string | undefined;
  if (renalStatus === 'failure') {
    dialysisConsideration = 'Consider urgent nephrology consultation for possible dialysis if: refractory hyperkalaemia, severe acidosis (pH <7.1), fluid overload unresponsive to diuretics, or uraemic symptoms.';
  }
  
  return {
    renalStatus,
    currentCreatinine: lab.creatinine,
    currentGFR: lab.estimatedGFR,
    urineOutputTarget,
    renalProtectionStrategies,
    fluidAdjustments: renalStatus === 'failure' 
      ? 'Caution with fluid loading in renal failure - risk of pulmonary oedema. Use smaller boluses with reassessment.'
      : undefined,
    glucoseAdjustmentsInRenalImpairment,
    nephrotoxicAvoidance,
    dialysisConsideration,
  };
}

// ============================================================
// PRE-OPERATIVE PREPARATION
// ============================================================

function generatePreOperativePrep(input: EmergencyCDSInput): PreOperativePreparation {
  const vitals = input.vitalSigns;
  const lab = input.laboratory || {};
  
  const minimumPhysiologicalParameters: PreOperativePreparation['minimumPhysiologicalParameters'] = [
    {
      parameter: 'Systolic Blood Pressure',
      minimumValue: '≥90 mmHg (or MAP ≥65 mmHg)',
      currentValue: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg`,
      status: vitals.bloodPressureSystolic >= 90 ? 'met' : 'not_met',
    },
    {
      parameter: 'Oxygen Saturation',
      minimumValue: '≥90% (ideally ≥94%)',
      currentValue: `${vitals.oxygenSaturation}%`,
      status: vitals.oxygenSaturation >= 90 ? 'met' : 'not_met',
    },
    {
      parameter: 'Heart Rate',
      minimumValue: '60-120 bpm',
      currentValue: `${vitals.heartRate} bpm`,
      status: vitals.heartRate >= 60 && vitals.heartRate <= 120 ? 'met' : 'borderline',
    },
    {
      parameter: 'Potassium',
      minimumValue: '3.0-6.0 mmol/L (ideally 3.5-5.5)',
      currentValue: lab.potassium ? `${lab.potassium} mmol/L` : 'Not available',
      status: lab.potassium && lab.potassium >= 3.0 && lab.potassium <= 6.0 ? 'met' : 'not_met',
    },
    {
      parameter: 'Blood Glucose',
      minimumValue: '<20 mmol/L (ideally 6-12)',
      currentValue: lab.randomBloodGlucose ? `${lab.randomBloodGlucose} mmol/L` : 'Not available',
      status: lab.randomBloodGlucose && lab.randomBloodGlucose < 20 ? 'met' : 'not_met',
    },
    {
      parameter: 'Haemoglobin',
      minimumValue: '≥7 g/dL (ideally ≥8 for surgery)',
      currentValue: lab.haemoglobin ? `${lab.haemoglobin} g/dL` : 'Not available',
      status: lab.haemoglobin && lab.haemoglobin >= 7 ? 'met' : 'not_met',
    },
  ];
  
  return {
    minimumPhysiologicalParameters,
    optimizeBeforeTheatre: [
      'Fluid resuscitation: Aim for MAP ≥65 mmHg',
      'Oxygen therapy: Target SpO2 ≥94%',
      'IV antibiotics: Must be given before surgery',
      'Blood glucose control: Target <15 mmol/L',
      'Potassium correction: Must be ≥3.0 and ≤6.0 mmol/L',
      'Blood available: Cross-match 2-4 units',
      'Urinary catheter insertion for monitoring',
      'ECG if cardiac risk factors or electrolyte disturbance',
    ],
    optimizeDuringSurgery: [
      'Haemodynamic monitoring and vasopressor support',
      'Ongoing fluid resuscitation',
      'Temperature management (avoid hypothermia)',
      'Blood transfusion as needed',
      'Glucose monitoring every 30-60 minutes',
      'Specimen collection for culture if not already done',
    ],
    anaestheticConsiderations: [
      'High-risk patient: ASA 3-4 in septic diabetic patients',
      'Difficult airway may be present (diabetic stiff joint syndrome)',
      'Cardiovascular instability: Prepare vasopressors',
      'Avoid hypotension during induction',
      'Regional anaesthesia may be contraindicated in sepsis (relative)',
      'Rapid sequence induction if aspiration risk',
      'Tight glycaemic control intra-operatively',
      'Anticipate prolonged post-op ventilation if severe sepsis',
    ],
    consentPriorities: [
      'Life-saving and limb-saving nature of surgery',
      'Risk of amputation if debridement insufficient',
      'Risk of death from sepsis',
      'Possibility of staged procedures',
      'ICU admission likely post-operatively',
      'Blood transfusion consent',
    ],
    documentationPriorities: [
      'Time of presentation and clinical state',
      'Resuscitation measures initiated and response',
      'Time of antibiotic administration',
      'Pre-operative investigations and results',
      'Consent documented with risks explained',
      'Communication with anaesthetist and ICU',
      'Theatre time and any delays with reasons',
    ],
  };
}

// ============================================================
// SURGICAL FITNESS ENDPOINTS
// ============================================================

function generateFitnessEndpoints(input: EmergencyCDSInput): SurgicalFitnessEndpoints {
  const vitals = input.vitalSigns;
  const lab = input.laboratory || {};
  const mental = input.mentalStatus;
  
  return {
    haemodynamicStability: {
      target: 'MAP ≥65 mmHg or SBP ≥90 mmHg without escalating vasopressors',
      achieved: vitals.bloodPressureSystolic >= 90,
      currentValue: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg`,
    },
    oxygenation: {
      target: 'SpO2 ≥90% (ideally ≥94%)',
      achieved: vitals.oxygenSaturation >= 90,
      currentValue: `${vitals.oxygenSaturation}%`,
    },
    glycaemicControl: {
      target: 'Blood glucose 7.8-10.0 mmol/L (maximum <15 for surgery)',
      achieved: lab.randomBloodGlucose !== undefined && lab.randomBloodGlucose < 15,
      currentValue: lab.randomBloodGlucose ? `${lab.randomBloodGlucose} mmol/L` : 'Not available',
    },
    electrolytesSafe: {
      target: 'Potassium 3.0-6.0 mmol/L, Sodium 125-155 mmol/L',
      achieved: (lab.potassium === undefined || (lab.potassium >= 3.0 && lab.potassium <= 6.0)) &&
                (lab.sodium === undefined || (lab.sodium >= 125 && lab.sodium <= 155)),
      currentValues: {
        potassium: lab.potassium ? `${lab.potassium} mmol/L` : 'Not available',
        sodium: lab.sodium ? `${lab.sodium} mmol/L` : 'Not available',
      },
    },
    urineOutput: {
      target: '≥0.5 mL/kg/hr',
      achieved: input.urineOutput?.hourlyUrineOutput !== undefined && 
                input.urineOutput.hourlyUrineOutput >= 0.5 * (input.patientProfile.weight || 70),
      currentValue: input.urineOutput?.hourlyUrineOutput 
        ? `${input.urineOutput.hourlyUrineOutput} mL/hr`
        : 'Not measured',
    },
    mentalStatus: {
      target: 'GCS ≥9 or improving',
      achieved: mental?.gcsTotal === undefined || mental.gcsTotal >= 9,
      currentValue: mental?.gcsTotal ? `GCS ${mental.gcsTotal}/15` : (mental?.avpu || 'Not assessed'),
    },
    overallFitnessDeclaration: 'Patient may proceed to emergency surgery when minimum resuscitative targets are achieved. Complete optimization is not required in life-threatening sepsis.',
    criticalStatement: 'In life-threatening sepsis, surgery should not be delayed once minimum resuscitative targets are achieved. Source control is a critical component of sepsis management.',
  };
}

// ============================================================
// POST-DEBRIDEMENT CARE
// ============================================================

function generatePostDebridementCare(): PostDebridementCare {
  return {
    immediatePostOpMonitoring: [
      'ICU or HDU admission for close monitoring',
      'Continuous vital signs monitoring (BP, HR, SpO2, RR)',
      'Hourly urine output measurement',
      'Serial lactate measurements (every 4-6 hours)',
      'Blood glucose monitoring every 2-4 hours',
      'Haemoglobin check 6 hours post-surgery',
      'Wound inspection within 24-48 hours',
      'Daily electrolyte monitoring',
    ],
    ongoingSepsisControl: [
      'Continue IV antibiotics per microbiologist guidance',
      'Review blood culture results at 48-72 hours',
      'De-escalate antibiotics when appropriate',
      'Monitor for recurrent or persistent sepsis',
      'Consider repeat debridement if clinical deterioration',
      'Watch for new source of infection (line sepsis, pneumonia)',
    ],
    glycaemicManagement: [
      'Continue VRIII until eating and drinking',
      'Transition to subcutaneous insulin when oral intake resumes',
      'Involve diabetes team if available',
      'Target glucose 6-10 mmol/L',
      'Avoid hypoglycaemia (glucose <4 mmol/L)',
      'Resume metformin only when renal function stable and eating',
    ],
    woundCarePrinciples: [
      'Keep wound clean and moist',
      'Daily inspection for signs of extension or new necrosis',
      'Appropriate dressing based on wound bed',
      'Consider negative pressure wound therapy (NPWT) if large defect',
      'Plan for staged debridement or reconstruction',
      'Offload foot to prevent pressure on wound',
      'DVT prophylaxis if not contraindicated',
    ],
  };
}

// ============================================================
// RED ZONE ALERTS
// ============================================================

function generateRedZoneAlerts(input: EmergencyCDSInput): EmergencyCDSAssessment['redZoneAlerts'] {
  const alerts: EmergencyCDSAssessment['redZoneAlerts'] = [];
  const vitals = input.vitalSigns;
  const lab = input.laboratory || {};
  const mental = input.mentalStatus;
  
  // Vital Signs
  if (vitals.bloodPressureSystolic < 90) {
    alerts.push({
      parameter: 'Systolic BP',
      value: `${vitals.bloodPressureSystolic} mmHg`,
      threshold: '<90 mmHg',
      action: 'Immediate fluid resuscitation and vasopressor consideration',
    });
  }
  
  if (vitals.oxygenSaturation < 90) {
    alerts.push({
      parameter: 'SpO2',
      value: `${vitals.oxygenSaturation}%`,
      threshold: '<90%',
      action: 'High-flow oxygen, consider assisted ventilation',
    });
  }
  
  if (vitals.heartRate > 130) {
    alerts.push({
      parameter: 'Heart Rate',
      value: `${vitals.heartRate} bpm`,
      threshold: '>130 bpm',
      action: 'Assess for hypovolaemia, pain, sepsis progression',
    });
  }
  
  // Laboratory
  if (lab.potassium !== undefined && lab.potassium < 3.0) {
    alerts.push({
      parameter: 'Potassium',
      value: `${lab.potassium} mmol/L`,
      threshold: '<3.0 mmol/L',
      action: 'CRITICAL: IV potassium replacement, cardiac monitoring',
    });
  }
  
  if (lab.potassium !== undefined && lab.potassium > 6.0) {
    alerts.push({
      parameter: 'Potassium',
      value: `${lab.potassium} mmol/L`,
      threshold: '>6.0 mmol/L',
      action: 'CRITICAL: Calcium gluconate, insulin-dextrose, ECG',
    });
  }
  
  if (lab.lactate !== undefined && lab.lactate >= 4.0) {
    alerts.push({
      parameter: 'Lactate',
      value: `${lab.lactate} mmol/L`,
      threshold: '≥4 mmol/L',
      action: 'Severe tissue hypoperfusion - aggressive resuscitation',
    });
  }
  
  if (lab.randomBloodGlucose !== undefined && lab.randomBloodGlucose > 20) {
    alerts.push({
      parameter: 'Blood Glucose',
      value: `${lab.randomBloodGlucose} mmol/L`,
      threshold: '>20 mmol/L',
      action: 'IV insulin infusion, check for DKA/HHS',
    });
  }
  
  if (lab.haemoglobin !== undefined && lab.haemoglobin < 7) {
    alerts.push({
      parameter: 'Haemoglobin',
      value: `${lab.haemoglobin} g/dL`,
      threshold: '<7 g/dL',
      action: 'Urgent blood transfusion required',
    });
  }
  
  // Mental Status
  if (mental?.gcsTotal !== undefined && mental.gcsTotal < 9) {
    alerts.push({
      parameter: 'GCS',
      value: `${mental.gcsTotal}/15`,
      threshold: '<9',
      action: 'Airway protection required, intubation consideration',
    });
  }
  
  return alerts;
}

// ============================================================
// GENERATE ALL RECOMMENDATIONS AS SECTIONS
// ============================================================

function generateAllRecommendations(
  triage: TriageAssessment,
  abc: ABCAssessment,
  sepsis: SepsisManagement,
  glycaemic: GlycaemicControl,
  fluid: FluidElectrolyteManagement,
  anaemia: AnaemiaManagement,
  renal: RenalMetabolicSupport,
  preOp: PreOperativePreparation,
  postOp: PostDebridementCare
): CDSSection[] {
  const sections: CDSSection[] = [];
  
  // Section 1: Immediate Priorities
  sections.push({
    title: '1. Immediate Triage & Prioritization',
    icon: 'alert-triangle',
    recommendations: [
      {
        id: uuidv4(),
        category: 'Triage',
        priority: 'critical',
        recommendation: `Priority: ${triage.triagePriority.toUpperCase()}`,
        rationale: triage.lifeThreatening.length > 0 
          ? `Life-threatening: ${triage.lifeThreatening.join('; ')}`
          : 'No immediate life-threatening conditions identified',
        status: 'pending',
      },
      {
        id: uuidv4(),
        category: 'Triage',
        priority: 'critical',
        recommendation: `Sepsis Severity: ${triage.sepsisSeverity.replace('_', ' ').toUpperCase()}`,
        status: 'pending',
      },
      {
        id: uuidv4(),
        category: 'Triage',
        priority: 'critical',
        recommendation: `Surgical Urgency: ${triage.surgicalUrgency.replace('_', ' ')}`,
        rationale: triage.resuscitationNote,
        status: 'pending',
      },
    ],
    isExpanded: true,
  });
  
  // Section 2: ABC
  sections.push({
    title: '2. Airway, Breathing, Circulation (WHO-Aligned)',
    icon: 'activity',
    recommendations: [
      ...abc.airway.interventions.map(i => ({
        id: uuidv4(),
        category: 'Airway',
        priority: abc.airway.status === 'compromised' ? 'critical' as const : 'high' as const,
        recommendation: i,
        status: 'pending' as const,
      })),
      ...abc.breathing.interventions.map(i => ({
        id: uuidv4(),
        category: 'Breathing',
        priority: abc.breathing.status === 'failing' ? 'critical' as const : 'high' as const,
        recommendation: i,
        target: abc.breathing.oxygenTarget,
        status: 'pending' as const,
      })),
      ...abc.circulation.interventions.map(i => ({
        id: uuidv4(),
        category: 'Circulation',
        priority: abc.circulation.status === 'shock' ? 'critical' as const : 'high' as const,
        recommendation: i,
        status: 'pending' as const,
      })),
    ],
    isExpanded: true,
  });
  
  // Section 3: Sepsis Bundle
  sections.push({
    title: '3. Sepsis Management (Hour-1 Bundle)',
    icon: 'clock',
    recommendations: sepsis.hourOneSepsisBundle,
    isExpanded: true,
  });
  
  // Section 4: Glycaemic Control
  sections.push({
    title: '4. Glycaemic Control',
    icon: 'droplet',
    recommendations: glycaemic.immediateStrategy.map(s => ({
      id: uuidv4(),
      category: 'Glucose Management',
      priority: s.includes('Critical') || s.includes('VRIII') ? 'critical' as const : 'high' as const,
      recommendation: s,
      target: `${glycaemic.targetGlucoseRange.min}-${glycaemic.targetGlucoseRange.max} ${glycaemic.targetGlucoseRange.unit}`,
      status: 'pending' as const,
    })),
    isExpanded: false,
  });
  
  // Section 5: Fluid & Electrolytes
  sections.push({
    title: '5. Fluid & Electrolyte Correction',
    icon: 'droplets',
    recommendations: [
      ...fluid.correctionPriorities.map(p => ({
        id: uuidv4(),
        category: 'Fluid/Electrolytes',
        priority: p.includes('CRITICAL') ? 'critical' as const : 'high' as const,
        recommendation: p,
        status: 'pending' as const,
      })),
      ...fluid.electrolyteCorrections.map(e => ({
        id: uuidv4(),
        category: e.electrolyte,
        priority: e.correctionApproach.includes('Immediate') ? 'critical' as const : 'high' as const,
        recommendation: `${e.electrolyte}: ${e.correctionApproach}`,
        target: e.targetLevel,
        status: 'pending' as const,
      })),
    ],
    isExpanded: false,
  });
  
  // Section 6: Anaemia
  if (anaemia.transfusionIndicated) {
    sections.push({
      title: '6. Anaemia Management',
      icon: 'heart',
      recommendations: [
        {
          id: uuidv4(),
          category: 'Transfusion',
          priority: anaemia.anaemiaSeverity === 'life_threatening' ? 'critical' : 'high',
          recommendation: `Transfuse ${anaemia.unitsRequired} unit(s) packed red blood cells`,
          target: anaemia.preOpHaemoglobinTarget,
          rationale: `Current Hb: ${anaemia.currentHaemoglobin} g/dL. Severity: ${anaemia.anaemiaSeverity}`,
          status: 'pending',
        },
      ],
      isExpanded: false,
    });
  }
  
  // Section 7: Renal
  if (renal.renalStatus !== 'normal') {
    sections.push({
      title: '7. Renal & Metabolic Support',
      icon: 'filter',
      recommendations: renal.renalProtectionStrategies.map(s => ({
        id: uuidv4(),
        category: 'Renal Protection',
        priority: 'medium' as const,
        recommendation: s,
        status: 'pending' as const,
      })),
      isExpanded: false,
    });
  }
  
  // Section 8: Pre-Op Prep
  sections.push({
    title: '8. Pre-Operative Preparation',
    icon: 'clipboard-check',
    recommendations: [
      ...preOp.optimizeBeforeTheatre.map(o => ({
        id: uuidv4(),
        category: 'Pre-Op Optimization',
        priority: 'high' as const,
        recommendation: o,
        status: 'pending' as const,
      })),
      ...preOp.consentPriorities.map(c => ({
        id: uuidv4(),
        category: 'Consent',
        priority: 'high' as const,
        recommendation: `Consent: ${c}`,
        status: 'pending' as const,
      })),
    ],
    isExpanded: false,
  });
  
  // Section 9: Fitness Declaration
  sections.push({
    title: '9. Surgical Fitness Endpoints',
    icon: 'check-circle',
    recommendations: [
      {
        id: uuidv4(),
        category: 'Declaration',
        priority: 'critical',
        recommendation: 'In life-threatening sepsis, surgery should not be delayed once minimum resuscitative targets are achieved.',
        status: 'pending',
      },
    ],
    isExpanded: false,
  });
  
  // Section 10: Post-Op
  sections.push({
    title: '10. Post-Debridement Continuity of Care',
    icon: 'clipboard-list',
    recommendations: postOp.immediatePostOpMonitoring.slice(0, 5).map(m => ({
      id: uuidv4(),
      category: 'Post-Op Monitoring',
      priority: 'high' as const,
      recommendation: m,
      status: 'pending' as const,
    })),
    isExpanded: false,
  });
  
  return sections;
}

// ============================================================
// SAFETY STATEMENTS
// ============================================================

const SAFETY_STATEMENTS = [
  'This output is clinical decision-support, not prescriptive medical advice.',
  'Final clinical decisions rest with the attending surgeon and anaesthetist.',
  'Local protocols and resource availability must be considered.',
  'All recommendations are editable, annotatable, and overridable by clinicians.',
  'Clinical judgement should override AI output where appropriate.',
  'This tool follows WHO, Surviving Sepsis Campaign, and standard peri-operative care principles.',
];

const DISCLAIMERS = [
  'This system provides guidance based on general clinical principles and may not account for all patient-specific factors.',
  'Drug dosages and specific antibiotic choices should be verified against local formulary and guidelines.',
  'The treating physician is responsible for all clinical decisions.',
  'Real-time clinical assessment takes precedence over any automated recommendations.',
];

// ============================================================
// MAIN GENERATION FUNCTION
// ============================================================

export async function generateEmergencyCDSAssessment(
  patientId: string,
  hospitalId: string,
  input: EmergencyCDSInput,
  surgeryId?: string
): Promise<EmergencyCDSAssessment> {
  // Generate all sections
  const triage = generateTriageAssessment(input);
  const abcAssessment = generateABCAssessment(input);
  const sepsisManagement = generateSepsisManagement(input);
  const glycaemicControl = generateGlycaemicControl(input);
  const fluidElectrolyte = generateFluidElectrolyteManagement(input);
  const anaemiaManagement = generateAnaemiaManagement(input);
  const renalMetabolic = generateRenalMetabolicSupport(input);
  const preOperativePrep = generatePreOperativePrep(input);
  const fitnessEndpoints = generateFitnessEndpoints(input);
  const postDebridementCare = generatePostDebridementCare();
  
  const allRecommendations = generateAllRecommendations(
    triage,
    abcAssessment,
    sepsisManagement,
    glycaemicControl,
    fluidElectrolyte,
    anaemiaManagement,
    renalMetabolic,
    preOperativePrep,
    postDebridementCare
  );
  
  const redZoneAlerts = generateRedZoneAlerts(input);
  
  return {
    id: uuidv4(),
    patientId,
    hospitalId,
    surgeryId,
    input,
    triage,
    abcAssessment,
    sepsisManagement,
    glycaemicControl,
    fluidElectrolyte,
    anaemiaManagement,
    renalMetabolic,
    preOperativePrep,
    fitnessEndpoints,
    postDebridementCare,
    allRecommendations,
    redZoneAlerts,
    safetyStatements: SAFETY_STATEMENTS,
    disclaimers: DISCLAIMERS,
    generatedAt: new Date(),
    generatedBy: 'AstroHEALTH CDS Engine v1.0',
    clinicianOverrides: [],
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function calculateMeanArterialPressure(systolic: number, diastolic: number): number {
  return Math.round(diastolic + (systolic - diastolic) / 3);
}

export function estimateFluidDeficit(weight: number, dehydrationPercent: number): number {
  return weight * 10 * dehydrationPercent; // mL
}

export function calculateParklandFluid(weight: number, tbsa: number): {
  total24h: number;
  first8hRate: number;
  next16hRate: number;
} {
  const total24h = 4 * weight * tbsa;
  return {
    total24h,
    first8hRate: Math.round(total24h / 2 / 8),
    next16hRate: Math.round(total24h / 2 / 16),
  };
}

export function assessSepsisSeverity(qsofa: QSOFAScore, hasOrganDysfunction: boolean): SepsisSeverity {
  if (qsofa.totalScore >= 2 && hasOrganDysfunction) {
    return 'septic_shock';
  } else if (qsofa.totalScore >= 2 || hasOrganDysfunction) {
    return 'severe_sepsis';
  }
  return 'sepsis';
}
