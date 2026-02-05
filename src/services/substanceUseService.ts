/**
 * Substance Use Disorder Assessment & Detoxification Service (CSUD-DSM)
 * 
 * Provides clinical decision support for:
 * - Addiction severity scoring
 * - Withdrawal risk prediction
 * - Pain management alternatives
 * - Care setting recommendations
 * 
 * ⚠️ IMPORTANT DISCLAIMER:
 * This module provides DECISION SUPPORT ONLY.
 * Final clinical responsibility rests with the licensed clinician.
 * No autonomous prescribing is performed.
 * All recommendations must be reviewed and approved by qualified medical personnel.
 * 
 * Aligned with WHO substance use disorder frameworks.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import type {
  SubstanceUseAssessment,
  SubstanceIntake,
  AddictionSeverityScore,
  PhysicalDependenceScore,
  PsychologicalDependenceScore,
  BehavioralDysfunctionScore,
  SocialImpairmentScore,
  MedicalComplicationsScore,
  WithdrawalRiskPrediction,
  WithdrawalSymptom,
  WithdrawalSeverity,
  WithdrawalPhase,
  AddictionSeverity,
  CareSettingRecommendation,
  CareSettingDecision,
  PainManagementSupport,
  PainContextAssessment,
  AnalgesicRecommendation,
  ComorbidityModification,
  SubstanceUseConsent,
  PatientInfoLeaflet,
  SubstanceUseClinicalSummary,
  DetoxMonitoringRecord,
  DetoxFollowUp,
  SubstanceCategory,
} from '../types';

// ==================== SUBSTANCE DEFINITIONS ====================

export interface SubstanceDefinition {
  category: SubstanceCategory;
  name: string;
  commonNames: string[];
  halfLifeHours: number;
  withdrawalOnsetHours: number;
  withdrawalPeakHours: number;
  withdrawalDurationDays: number;
  withdrawalSymptoms: {
    early: string[];
    peak: string[];
    late: string[];
  };
  redFlagComplications: string[];
  pharmacologicalSupport: string[];
  monitoringParameters: string[];
}

export const substanceDefinitions: Record<string, SubstanceDefinition> = {
  // OPIOIDS
  pentazocine: {
    category: 'opioids',
    name: 'Pentazocine',
    commonNames: ['Fortwin', 'Talwin'],
    halfLifeHours: 3,
    withdrawalOnsetHours: 8,
    withdrawalPeakHours: 36,
    withdrawalDurationDays: 7,
    withdrawalSymptoms: {
      early: ['Anxiety', 'Restlessness', 'Lacrimation', 'Rhinorrhea', 'Yawning', 'Sweating'],
      peak: ['Muscle aches', 'Abdominal cramps', 'Nausea', 'Vomiting', 'Diarrhea', 'Dilated pupils', 'Piloerection', 'Insomnia', 'Tachycardia'],
      late: ['Persistent insomnia', 'Irritability', 'Dysphoria', 'Drug craving'],
    },
    redFlagComplications: ['Severe dehydration', 'Electrolyte imbalance', 'Aspiration', 'Suicide risk'],
    pharmacologicalSupport: ['Clonidine', 'Loperamide', 'NSAIDs', 'Antiemetics', 'Anxiolytics (short-term)'],
    monitoringParameters: ['Vital signs q4h', 'Hydration status', 'COWS score', 'Electrolytes'],
  },
  tramadol: {
    category: 'opioids',
    name: 'Tramadol',
    commonNames: ['Ultram', 'Tramal'],
    halfLifeHours: 6,
    withdrawalOnsetHours: 12,
    withdrawalPeakHours: 48,
    withdrawalDurationDays: 10,
    withdrawalSymptoms: {
      early: ['Anxiety', 'Sweating', 'Insomnia', 'Tremor', 'Flu-like symptoms'],
      peak: ['Severe anxiety', 'Depression', 'Confusion', 'Hallucinations', 'Seizures (risk)', 'Paraesthesias', 'Muscle spasms'],
      late: ['Depression', 'Fatigue', 'Drug craving', 'Cognitive difficulties'],
    },
    redFlagComplications: ['Seizures (higher risk than typical opioids)', 'Serotonin syndrome', 'Severe depression', 'Suicidal ideation'],
    pharmacologicalSupport: ['Anticonvulsant prophylaxis', 'Clonidine', 'Low-dose SSRI taper', 'Anxiolytics'],
    monitoringParameters: ['Seizure precautions', 'Mental status', 'Vital signs', 'Serotonin syndrome signs'],
  },
  codeine: {
    category: 'opioids',
    name: 'Codeine',
    commonNames: ['Codeine phosphate', 'Cocodamol component'],
    halfLifeHours: 3,
    withdrawalOnsetHours: 8,
    withdrawalPeakHours: 48,
    withdrawalDurationDays: 7,
    withdrawalSymptoms: {
      early: ['Restlessness', 'Lacrimation', 'Rhinorrhea', 'Yawning', 'Anxiety'],
      peak: ['Muscle aches', 'Nausea', 'Vomiting', 'Diarrhea', 'Gooseflesh', 'Dilated pupils', 'Insomnia'],
      late: ['Irritability', 'Fatigue', 'Mild depression', 'Drug craving'],
    },
    redFlagComplications: ['Dehydration', 'Electrolyte disturbance', 'Relapse risk'],
    pharmacologicalSupport: ['Clonidine', 'Loperamide', 'Paracetamol', 'Antiemetics'],
    monitoringParameters: ['Hydration', 'Vital signs', 'COWS score', 'GI symptoms'],
  },
  morphine: {
    category: 'opioids',
    name: 'Morphine',
    commonNames: ['MST', 'Oramorph'],
    halfLifeHours: 3,
    withdrawalOnsetHours: 8,
    withdrawalPeakHours: 36,
    withdrawalDurationDays: 10,
    withdrawalSymptoms: {
      early: ['Anxiety', 'Lacrimation', 'Rhinorrhea', 'Sweating', 'Yawning'],
      peak: ['Severe muscle aches', 'Abdominal cramps', 'Diarrhea', 'Nausea', 'Vomiting', 'Tachycardia', 'Hypertension', 'Fever'],
      late: ['Insomnia', 'Dysphoria', 'Anhedonia', 'Cravings'],
    },
    redFlagComplications: ['Severe dehydration', 'Cardiovascular stress', 'Suicide risk', 'Aspiration'],
    pharmacologicalSupport: ['Clonidine', 'Buprenorphine taper', 'Loperamide', 'NSAIDs', 'Anxiolytics'],
    monitoringParameters: ['COWS score q4h', 'Vital signs', 'Hydration', 'ECG if cardiac history'],
  },

  // CANNABINOIDS
  cannabis: {
    category: 'cannabinoids',
    name: 'Cannabis',
    commonNames: ['Indian hemp', 'Marijuana', 'Weed', 'Igbo'],
    halfLifeHours: 72,
    withdrawalOnsetHours: 24,
    withdrawalPeakHours: 72,
    withdrawalDurationDays: 14,
    withdrawalSymptoms: {
      early: ['Irritability', 'Anxiety', 'Decreased appetite', 'Sleep difficulties'],
      peak: ['Restlessness', 'Depressed mood', 'Headache', 'Sweating', 'Chills', 'Abdominal pain', 'Tremor'],
      late: ['Strange dreams', 'Persistent sleep disturbance', 'Mood swings'],
    },
    redFlagComplications: ['Severe anxiety/panic', 'Depression with suicidal ideation', 'Psychotic symptoms (rare)'],
    pharmacologicalSupport: ['Short-term sleep aids', 'Antiemetics if needed', 'Anxiolytics PRN'],
    monitoringParameters: ['Mental status', 'Sleep pattern', 'Appetite', 'Anxiety level'],
  },

  // SEDATIVES
  diazepam: {
    category: 'sedatives',
    name: 'Diazepam',
    commonNames: ['Valium'],
    halfLifeHours: 100,
    withdrawalOnsetHours: 48,
    withdrawalPeakHours: 120,
    withdrawalDurationDays: 21,
    withdrawalSymptoms: {
      early: ['Anxiety', 'Insomnia', 'Tremor', 'Sweating', 'Palpitations'],
      peak: ['Severe anxiety', 'Panic attacks', 'Perceptual disturbances', 'Muscle twitching', 'Hypersensitivity to stimuli', 'Seizures'],
      late: ['Protracted insomnia', 'Anxiety', 'Depression', 'Cognitive impairment'],
    },
    redFlagComplications: ['Seizures (can be fatal)', 'Delirium tremens', 'Psychosis', 'Status epilepticus'],
    pharmacologicalSupport: ['Gradual benzodiazepine taper (essential)', 'Anticonvulsants', 'Beta-blockers'],
    monitoringParameters: ['Seizure precautions (critical)', 'Vital signs', 'Mental status', 'CIWA-B score'],
  },
  clonazepam: {
    category: 'sedatives',
    name: 'Clonazepam',
    commonNames: ['Rivotril', 'Klonopin'],
    halfLifeHours: 40,
    withdrawalOnsetHours: 24,
    withdrawalPeakHours: 72,
    withdrawalDurationDays: 14,
    withdrawalSymptoms: {
      early: ['Anxiety', 'Insomnia', 'Irritability', 'Hand tremor'],
      peak: ['Severe anxiety', 'Panic', 'Seizures', 'Perceptual disturbances', 'Depersonalization'],
      late: ['Persistent anxiety', 'Depression', 'Cognitive fog'],
    },
    redFlagComplications: ['Seizures', 'Psychosis', 'Severe rebound anxiety'],
    pharmacologicalSupport: ['Convert to long-acting benzodiazepine and taper', 'Anticonvulsants'],
    monitoringParameters: ['Seizure precautions', 'Anxiety scale', 'Vital signs'],
  },

  // ALCOHOL
  alcohol: {
    category: 'alcohol',
    name: 'Alcohol',
    commonNames: ['Ethanol', 'Alcoholic beverages'],
    halfLifeHours: 4,
    withdrawalOnsetHours: 6,
    withdrawalPeakHours: 48,
    withdrawalDurationDays: 7,
    withdrawalSymptoms: {
      early: ['Tremor', 'Anxiety', 'Sweating', 'Nausea', 'Insomnia', 'Tachycardia'],
      peak: ['Severe tremor', 'Hallucinations', 'Seizures', 'Delirium tremens', 'Hyperthermia', 'Hypertension'],
      late: ['Mood disturbance', 'Sleep problems', 'Fatigue'],
    },
    redFlagComplications: ['Delirium tremens (DTs)', 'Seizures', 'Wernicke encephalopathy', 'Aspiration', 'Arrhythmias'],
    pharmacologicalSupport: ['Benzodiazepines (chlordiazepoxide/diazepam)', 'Thiamine (high-dose)', 'IV fluids', 'Multivitamins'],
    monitoringParameters: ['CIWA-Ar score q1-4h', 'Vital signs', 'Blood glucose', 'Electrolytes', 'LFTs'],
  },

  // STIMULANTS
  cocaine: {
    category: 'stimulants',
    name: 'Cocaine',
    commonNames: ['Crack', 'Coke'],
    halfLifeHours: 1,
    withdrawalOnsetHours: 12,
    withdrawalPeakHours: 48,
    withdrawalDurationDays: 10,
    withdrawalSymptoms: {
      early: ['Fatigue', 'Increased sleep', 'Increased appetite', 'Dysphoria'],
      peak: ['Depression', 'Anhedonia', 'Psychomotor retardation', 'Intense cravings', 'Irritability'],
      late: ['Intermittent cravings', 'Mood instability', 'Sleep disturbance'],
    },
    redFlagComplications: ['Severe depression', 'Suicidal ideation', 'Cardiac arrhythmias (from recent use)'],
    pharmacologicalSupport: ['Supportive care', 'Antidepressants if persistent depression', 'Sleep aids'],
    monitoringParameters: ['Mental status', 'Suicide risk assessment', 'Cardiac monitoring if recent use'],
  },
  methamphetamine: {
    category: 'stimulants',
    name: 'Methamphetamine',
    commonNames: ['Meth', 'Crystal', 'Ice'],
    halfLifeHours: 12,
    withdrawalOnsetHours: 24,
    withdrawalPeakHours: 72,
    withdrawalDurationDays: 14,
    withdrawalSymptoms: {
      early: ['Fatigue', 'Increased sleep', 'Increased appetite'],
      peak: ['Severe depression', 'Anxiety', 'Irritability', 'Intense cravings', 'Paranoia'],
      late: ['Anhedonia', 'Cognitive impairment', 'Mood swings'],
    },
    redFlagComplications: ['Severe depression', 'Psychosis', 'Suicidal behavior', 'Violence'],
    pharmacologicalSupport: ['Supportive care', 'Antipsychotics if psychotic', 'Antidepressants'],
    monitoringParameters: ['Mental status', 'Suicide/violence risk', 'Psychotic symptoms'],
  },
};

// ==================== SCORING ALGORITHMS ====================

/**
 * Calculate Physical Dependence Score
 */
export function calculatePhysicalDependenceScore(
  tolerance: number,
  withdrawalSymptoms: number,
  compulsiveUse: number,
  physicalCravings: number
): PhysicalDependenceScore {
  const totalScore = tolerance + withdrawalSymptoms + compulsiveUse + physicalCravings;
  return {
    tolerance,
    withdrawalSymptoms,
    compulsiveUse,
    physicalCravings,
    totalScore,
  };
}

/**
 * Calculate Psychological Dependence Score
 */
export function calculatePsychologicalDependenceScore(
  emotionalReliance: number,
  copingMechanism: number,
  preoccupation: number,
  anxietyWithoutSubstance: number
): PsychologicalDependenceScore {
  const totalScore = emotionalReliance + copingMechanism + preoccupation + anxietyWithoutSubstance;
  return {
    emotionalReliance,
    copingMechanism,
    preoccupation,
    anxietyWithoutSubstance,
    totalScore,
  };
}

/**
 * Calculate Behavioral Dysfunction Score
 */
export function calculateBehavioralDysfunctionScore(
  prioritizingSubstance: number,
  failedAttemptsToCut: number,
  timeSpentObtaining: number,
  givingUpActivities: number
): BehavioralDysfunctionScore {
  const totalScore = prioritizingSubstance + failedAttemptsToCut + timeSpentObtaining + givingUpActivities;
  return {
    prioritizingSubstance,
    failedAttemptsToCut,
    timeSpentObtaining,
    givingUpActivities,
    totalScore,
  };
}

/**
 * Calculate Social Impairment Score
 */
export function calculateSocialImpairmentScore(
  occupationalImpact: number,
  relationshipImpact: number,
  financialImpact: number,
  legalIssues: number
): SocialImpairmentScore {
  const totalScore = occupationalImpact + relationshipImpact + financialImpact + legalIssues;
  return {
    occupationalImpact,
    relationshipImpact,
    financialImpact,
    legalIssues,
    totalScore,
  };
}

/**
 * Calculate Medical Complications Score
 */
export function calculateMedicalComplicationsScore(
  liverDysfunction: number,
  renalDysfunction: number,
  cardiacComplications: number,
  neurologicalComplications: number,
  infectiousComplications: number,
  psychiatricComorbidity: number
): MedicalComplicationsScore {
  const totalScore = liverDysfunction + renalDysfunction + cardiacComplications + 
                     neurologicalComplications + infectiousComplications + psychiatricComorbidity;
  return {
    liverDysfunction,
    renalDysfunction,
    cardiacComplications,
    neurologicalComplications,
    infectiousComplications,
    psychiatricComorbidity,
    totalScore,
  };
}

/**
 * Calculate Composite Addiction Severity Score
 * Total possible: 88 points
 * Mild: 0-22, Moderate: 23-44, Severe: 45-66, Complicated: 67-88
 */
export function calculateAddictionSeverityScore(
  physical: PhysicalDependenceScore,
  psychological: PsychologicalDependenceScore,
  behavioral: BehavioralDysfunctionScore,
  social: SocialImpairmentScore,
  medical: MedicalComplicationsScore
): AddictionSeverityScore {
  const totalCompositeScore = 
    physical.totalScore + 
    psychological.totalScore + 
    behavioral.totalScore + 
    social.totalScore + 
    medical.totalScore;

  let severityLevel: AddictionSeverity;
  let interpretationNotes: string;

  if (totalCompositeScore <= 22) {
    severityLevel = 'mild';
    interpretationNotes = 'Mild substance use disorder. Outpatient management may be appropriate with close monitoring.';
  } else if (totalCompositeScore <= 44) {
    severityLevel = 'moderate';
    interpretationNotes = 'Moderate substance use disorder. Structured outpatient program recommended with regular follow-up.';
  } else if (totalCompositeScore <= 66) {
    severityLevel = 'severe';
    interpretationNotes = 'Severe substance use disorder. Inpatient or intensive outpatient program strongly recommended.';
  } else {
    severityLevel = 'complicated';
    interpretationNotes = 'Complicated substance use disorder with significant medical/psychiatric comorbidity. Specialist inpatient care essential.';
  }

  return {
    physicalDependence: physical,
    psychologicalDependence: psychological,
    behavioralDysfunction: behavioral,
    socialImpairment: social,
    medicalComplications: medical,
    totalCompositeScore,
    severityLevel,
    interpretationNotes,
  };
}

// ==================== WITHDRAWAL RISK PREDICTION ====================

/**
 * Predict withdrawal symptoms and timeline based on substance profile
 */
export function predictWithdrawalRisk(
  substances: SubstanceIntake[],
  patientAge: number,
  renalFunction: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment',
  hepaticFunction: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment',
  comorbidities: string[]
): WithdrawalRiskPrediction {
  const expectedSymptoms: WithdrawalSymptom[] = [];
  let earlyPhaseSymptoms: string[] = [];
  let peakPhaseSymptoms: string[] = [];
  let latePhaseSymptoms: string[] = [];
  let redFlagComplications: string[] = [];
  let monitoringRecommendations: string[] = [];
  let pharmacologicalSupport: string[] = [];
  
  let maxRiskScore = 0;
  let overallRisk: WithdrawalSeverity = 'minimal';

  // Process each substance
  for (const substance of substances) {
    const substanceKey = substance.substanceName.toLowerCase().replace(/\s+/g, '');
    const definition = substanceDefinitions[substanceKey] || 
                       Object.values(substanceDefinitions).find(d => 
                         d.commonNames.some(n => n.toLowerCase() === substance.substanceName.toLowerCase())
                       );

    if (definition) {
      // Calculate time since last use
      const hoursSinceLastUse = (Date.now() - new Date(substance.lastUseDateTime).getTime()) / (1000 * 60 * 60);
      
      // Add symptoms from definition
      earlyPhaseSymptoms = [...new Set([...earlyPhaseSymptoms, ...definition.withdrawalSymptoms.early])];
      peakPhaseSymptoms = [...new Set([...peakPhaseSymptoms, ...definition.withdrawalSymptoms.peak])];
      latePhaseSymptoms = [...new Set([...latePhaseSymptoms, ...definition.withdrawalSymptoms.late])];
      redFlagComplications = [...new Set([...redFlagComplications, ...definition.redFlagComplications])];
      monitoringRecommendations = [...new Set([...monitoringRecommendations, ...definition.monitoringParameters])];
      pharmacologicalSupport = [...new Set([...pharmacologicalSupport, ...definition.pharmacologicalSupport])];

      // Generate withdrawal symptoms
      for (const symptom of definition.withdrawalSymptoms.early) {
        expectedSymptoms.push({
          symptom,
          phase: 'early',
          expectedOnsetHours: definition.withdrawalOnsetHours,
          expectedPeakHours: definition.withdrawalPeakHours,
          expectedDurationDays: 2,
          severity: 'mild',
          isRedFlag: false,
          managementNotes: 'Supportive care, hydration, rest',
        });
      }

      for (const symptom of definition.withdrawalSymptoms.peak) {
        const isRedFlag = definition.redFlagComplications.some(rf => 
          rf.toLowerCase().includes(symptom.toLowerCase())
        );
        expectedSymptoms.push({
          symptom,
          phase: 'peak',
          expectedOnsetHours: definition.withdrawalPeakHours - 12,
          expectedPeakHours: definition.withdrawalPeakHours,
          expectedDurationDays: 3,
          severity: isRedFlag ? 'severe' : 'moderate',
          isRedFlag,
          managementNotes: isRedFlag ? 'Close monitoring required, consider escalation' : 'Active management',
        });
      }

      // Calculate risk score
      let substanceRiskScore = 30; // Base score
      
      // Adjust for duration
      if (substance.durationOfUseMonths > 12) substanceRiskScore += 20;
      else if (substance.durationOfUseMonths > 6) substanceRiskScore += 10;
      
      // Adjust for high-risk substances
      if (substance.substanceCategory === 'sedatives' || substance.substanceCategory === 'alcohol') {
        substanceRiskScore += 25; // Higher seizure risk
      }
      if (substance.substanceCategory === 'opioids') {
        substanceRiskScore += 15;
      }
      
      // Adjust for escalation pattern
      if (substance.escalationPattern === 'increasing') substanceRiskScore += 10;
      
      maxRiskScore = Math.max(maxRiskScore, substanceRiskScore);
    }
  }

  // Adjust for patient factors
  if (patientAge > 65) maxRiskScore += 10;
  if (renalFunction !== 'normal') maxRiskScore += 10;
  if (hepaticFunction !== 'normal') maxRiskScore += 15;
  if (substances.length > 1) maxRiskScore += 20; // Poly-substance use
  
  // Comorbidity adjustments
  if (comorbidities.some(c => c.toLowerCase().includes('sickle'))) maxRiskScore += 10;
  if (comorbidities.some(c => c.toLowerCase().includes('cardiac'))) maxRiskScore += 10;
  if (comorbidities.some(c => c.toLowerCase().includes('seizure') || c.toLowerCase().includes('epilepsy'))) maxRiskScore += 15;

  // Determine overall risk level
  if (maxRiskScore <= 30) overallRisk = 'minimal';
  else if (maxRiskScore <= 50) overallRisk = 'mild';
  else if (maxRiskScore <= 70) overallRisk = 'moderate';
  else if (maxRiskScore <= 85) overallRisk = 'severe';
  else overallRisk = 'life_threatening';

  // Generate timeline description
  const primarySubstance = substances.find(s => s.isPrimaryConcern) || substances[0];
  const primaryDef = primarySubstance ? 
    substanceDefinitions[primarySubstance.substanceName.toLowerCase()] : null;
  
  const timelineDescription = primaryDef
    ? `Withdrawal expected to begin ${primaryDef.withdrawalOnsetHours}h after last use, peak at ${primaryDef.withdrawalPeakHours}h, and resolve over ${primaryDef.withdrawalDurationDays} days.`
    : 'Timeline depends on specific substances used. Close monitoring recommended.';

  return {
    overallRisk,
    riskScore: Math.min(maxRiskScore, 100),
    expectedSymptoms,
    earlyPhaseSymptoms,
    peakPhaseSymptoms,
    latePhaseSymptoms,
    redFlagComplications,
    timelineDescription,
    monitoringRecommendations,
    pharmacologicalSupport,
  };
}

// ==================== PAIN MANAGEMENT DECISION SUPPORT ====================

/**
 * Generate pain management alternatives for patients with substance use history
 */
export function generatePainManagementSupport(
  painContext: PainContextAssessment,
  substanceHistory: SubstanceIntake[],
  comorbidities: string[]
): PainManagementSupport {
  const nonOpioidPrimaryOptions: AnalgesicRecommendation[] = [];
  const adjuvantTherapies: AnalgesicRecommendation[] = [];
  const nonPharmacologicalStrategies: AnalgesicRecommendation[] = [];
  const escalationCriteria: string[] = [];
  const highRiskCombinationsWarning: string[] = [];
  const monitoringRequirements: string[] = [];

  // Non-opioid primary options
  nonOpioidPrimaryOptions.push({
    category: 'primary',
    recommendation: 'Paracetamol (Acetaminophen)',
    rationale: 'First-line analgesic with favorable safety profile in SUDs',
    cautions: ['Max 4g/day in normal hepatic function', 'Reduce dose in liver impairment'],
    requiresClinicianConfirmation: false,
  });

  if (painContext.painType === 'neuropathic' || painContext.painType === 'mixed') {
    nonOpioidPrimaryOptions.push({
      category: 'primary',
      recommendation: 'Gabapentinoids (Pregabalin/Gabapentin)',
      rationale: 'Effective for neuropathic pain, lower abuse potential than opioids',
      cautions: ['Some abuse potential exists', 'Titrate slowly', 'Renal dose adjustment needed'],
      requiresClinicianConfirmation: true,
    });
  }

  nonOpioidPrimaryOptions.push({
    category: 'primary',
    recommendation: 'NSAIDs (Ibuprofen, Diclofenac, Naproxen)',
    rationale: 'Effective for inflammatory and musculoskeletal pain',
    cautions: ['GI risk', 'Renal impairment', 'Cardiovascular risk', 'Avoid in SCD crisis (controversial)'],
    requiresClinicianConfirmation: true,
    contraindications: ['Active GI bleeding', 'Severe renal impairment', 'Uncontrolled hypertension'],
  });

  // Adjuvant therapies
  adjuvantTherapies.push({
    category: 'adjuvant',
    recommendation: 'Tricyclic Antidepressants (Amitriptyline)',
    rationale: 'Useful for neuropathic pain and chronic pain syndromes',
    cautions: ['Start low, go slow', 'Anticholinergic effects', 'Cardiac effects'],
    requiresClinicianConfirmation: true,
  });

  adjuvantTherapies.push({
    category: 'adjuvant',
    recommendation: 'Duloxetine (SNRI)',
    rationale: 'Evidence for chronic pain, diabetic neuropathy, fibromyalgia',
    cautions: ['Serotonin syndrome risk with tramadol history', 'Gradual titration'],
    requiresClinicianConfirmation: true,
  });

  if (painContext.painCause?.toLowerCase().includes('sickle')) {
    adjuvantTherapies.push({
      category: 'adjuvant',
      recommendation: 'Hydroxyurea (preventive)',
      rationale: 'Reduces frequency of vaso-occlusive crises in SCD',
      cautions: ['Not for acute pain', 'Requires hematology oversight'],
      requiresClinicianConfirmation: true,
    });
  }

  // Non-pharmacological strategies
  nonPharmacologicalStrategies.push(
    {
      category: 'non_pharmacological',
      recommendation: 'Heat/Cold Therapy',
      rationale: 'Low risk, can provide relief for musculoskeletal pain',
      cautions: ['Avoid heat on acute inflammation'],
      requiresClinicianConfirmation: false,
    },
    {
      category: 'non_pharmacological',
      recommendation: 'Physiotherapy',
      rationale: 'Addresses functional causes, improves mobility',
      cautions: ['May initially worsen pain temporarily'],
      requiresClinicianConfirmation: false,
    },
    {
      category: 'non_pharmacological',
      recommendation: 'Cognitive Behavioral Therapy (CBT)',
      rationale: 'Evidence-based for chronic pain management',
      cautions: ['Requires trained therapist', 'Time investment'],
      requiresClinicianConfirmation: false,
    },
    {
      category: 'non_pharmacological',
      recommendation: 'TENS (Transcutaneous Electrical Nerve Stimulation)',
      rationale: 'Non-invasive pain modulation',
      cautions: ['Avoid over pacemakers', 'Variable efficacy'],
      requiresClinicianConfirmation: false,
    }
  );

  // Escalation criteria
  escalationCriteria.push(
    'Pain score consistently ≥7/10 despite multimodal therapy',
    'Functional impairment preventing activities of daily living',
    'Evidence of acute pathology requiring intervention',
    'Red flag symptoms (e.g., neurological deficit, suspected fracture)',
    'Patient distress compromising recovery'
  );

  // High-risk combinations
  if (substanceHistory.some(s => s.substanceCategory === 'opioids')) {
    highRiskCombinationsWarning.push(
      '⚠️ Opioid history: Avoid opioid prescriptions unless absolutely necessary',
      '⚠️ If opioids essential: Use lowest effective dose, shortest duration, with strict monitoring',
      '⚠️ Consider addiction medicine consultation before any opioid prescription'
    );
  }

  if (substanceHistory.some(s => s.substanceCategory === 'sedatives')) {
    highRiskCombinationsWarning.push(
      '⚠️ Benzodiazepine history: Avoid concurrent CNS depressants',
      '⚠️ Risk of respiratory depression with opioids + benzodiazepines'
    );
  }

  // Monitoring requirements
  monitoringRequirements.push(
    'Regular pain assessments using validated scales',
    'Functional outcome assessment',
    'Monitor for signs of medication misuse',
    'Periodic review of continued need for analgesics',
    'Document all prescribing decisions and rationale'
  );

  return {
    painContext,
    nonOpioidPrimaryOptions,
    adjuvantTherapies,
    nonPharmacologicalStrategies,
    escalationCriteria,
    highRiskCombinationsWarning,
    monitoringRequirements,
  };
}

// ==================== CARE SETTING RECOMMENDATION ====================

/**
 * Determine appropriate care setting based on clinical factors
 */
export function determineCareSettingRecommendation(
  addictionSeverity: AddictionSeverityScore,
  withdrawalRisk: WithdrawalRiskPrediction,
  substances: SubstanceIntake[],
  socialSupport: 'strong' | 'moderate' | 'minimal' | 'none',
  medicalStability: 'stable' | 'mildly_unstable' | 'unstable' | 'critical',
  psychiatricConcerns: boolean
): CareSettingDecision {
  let recommendation: CareSettingRecommendation = 'outpatient_detox';
  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
  const triggerFactors: string[] = [];
  const supportingEvidence: string[] = [];
  const alternativeOptions: CareSettingRecommendation[] = [];
  const escalationCriteria: string[] = [];

  // Check for ICU/HDU triggers
  if (
    medicalStability === 'critical' ||
    withdrawalRisk.overallRisk === 'life_threatening' ||
    (substances.some(s => s.substanceCategory === 'sedatives' || s.substanceCategory === 'alcohol') &&
     addictionSeverity.severityLevel === 'complicated')
  ) {
    recommendation = 'icu_hdu_alert';
    confidenceLevel = 'high';
    triggerFactors.push(
      'Critical medical instability',
      'Life-threatening withdrawal risk',
      'High seizure risk from benzodiazepine/alcohol dependence'
    );
    supportingEvidence.push(
      'WHO guidelines recommend intensive monitoring for severe sedative/alcohol withdrawal',
      'High risk of delirium tremens or status epilepticus'
    );
  }
  // Check for inpatient admission
  else if (
    medicalStability === 'unstable' ||
    withdrawalRisk.overallRisk === 'severe' ||
    addictionSeverity.severityLevel === 'severe' ||
    addictionSeverity.severityLevel === 'complicated' ||
    socialSupport === 'none' ||
    substances.length >= 3 || // Significant poly-substance
    psychiatricConcerns
  ) {
    recommendation = 'inpatient_admission';
    confidenceLevel = 'high';
    
    if (medicalStability === 'unstable') triggerFactors.push('Medical instability');
    if (withdrawalRisk.overallRisk === 'severe') triggerFactors.push('Severe withdrawal risk');
    if (addictionSeverity.severityLevel === 'severe') triggerFactors.push('Severe addiction severity');
    if (addictionSeverity.severityLevel === 'complicated') triggerFactors.push('Complicated addiction with comorbidities');
    if (socialSupport === 'none') triggerFactors.push('No social support system');
    if (substances.length >= 3) triggerFactors.push('Significant poly-substance use');
    if (psychiatricConcerns) triggerFactors.push('Active psychiatric concerns');
    
    supportingEvidence.push(
      'WHO recommends supervised detoxification for severe cases',
      'Inpatient setting allows 24-hour monitoring and rapid intervention'
    );
    alternativeOptions.push('supervised_outpatient');
    escalationCriteria.push('Deterioration in clinical status', 'Development of severe withdrawal symptoms');
  }
  // Check for supervised outpatient
  else if (
    medicalStability === 'mildly_unstable' ||
    withdrawalRisk.overallRisk === 'moderate' ||
    addictionSeverity.severityLevel === 'moderate' ||
    socialSupport === 'minimal'
  ) {
    recommendation = 'supervised_outpatient';
    confidenceLevel = 'medium';
    
    if (withdrawalRisk.overallRisk === 'moderate') triggerFactors.push('Moderate withdrawal risk');
    if (addictionSeverity.severityLevel === 'moderate') triggerFactors.push('Moderate addiction severity');
    if (socialSupport === 'minimal') triggerFactors.push('Limited social support');
    
    supportingEvidence.push(
      'Regular daily or frequent check-ins provide safety net',
      'Patient can benefit from structured support while maintaining community ties'
    );
    alternativeOptions.push('outpatient_detox', 'inpatient_admission');
    escalationCriteria.push(
      'Worsening symptoms despite outpatient management',
      'Non-compliance with treatment',
      'Development of red flag symptoms'
    );
  }
  // Outpatient detox
  else {
    recommendation = 'outpatient_detox';
    confidenceLevel = 'medium';
    
    triggerFactors.push(
      'Mild to moderate severity',
      'Good social support',
      'Medically stable',
      'Low-risk withdrawal profile'
    );
    supportingEvidence.push(
      'Outpatient management appropriate for mild cases with good support',
      'Cost-effective with similar outcomes to inpatient for appropriate patients'
    );
    alternativeOptions.push('supervised_outpatient');
    escalationCriteria.push(
      'Any worsening of clinical status',
      'Emergence of severe withdrawal symptoms',
      'Social support breaks down'
    );
  }

  return {
    recommendation,
    confidenceLevel,
    triggerFactors,
    supportingEvidence,
    alternativeOptions,
    escalationCriteria,
  };
}

// ==================== COMORBIDITY MODIFICATIONS ====================

/**
 * Generate comorbidity-aware clinical modifications
 */
export function getComorbidityModifications(comorbidities: string[]): ComorbidityModification[] {
  const modifications: ComorbidityModification[] = [];
  
  const comorbidityLower = comorbidities.map(c => c.toLowerCase());
  
  if (comorbidityLower.some(c => c.includes('sickle cell') || c.includes('scd'))) {
    modifications.push({
      condition: 'Sickle Cell Disease',
      affectsWithdrawal: true,
      withdrawalModifications: [
        'Hydration is critical - avoid dehydration triggers for crisis',
        'Pain may be harder to distinguish from vaso-occlusive crisis',
        'Avoid NSAIDs during crisis',
      ],
      affectsAnalgesics: true,
      analgesicModifications: [
        'Non-opioid multimodal approach preferred',
        'If opioids needed for crisis, use structured protocol with defined endpoint',
        'Hydroxyurea for crisis prevention if not already on it',
      ],
      affectsInpatientThreshold: true,
      inpatientThresholdNotes: 'Lower threshold for admission due to crisis risk during withdrawal',
      specialConsiderations: [
        'Hematology consultation recommended',
        'Blood transfusion may be needed',
        'Monitor for acute chest syndrome',
      ],
    });
  }
  
  if (comorbidityLower.some(c => c.includes('cancer') || c.includes('malignancy') || c.includes('oncology'))) {
    modifications.push({
      condition: 'Malignancy',
      affectsWithdrawal: true,
      withdrawalModifications: [
        'Consider performance status in withdrawal management',
        'Immunosuppression may mask infection signs',
        'Drug interactions with chemotherapy',
      ],
      affectsAnalgesics: true,
      analgesicModifications: [
        'Palliative pain control may require opioids despite SUD history',
        'Oncology and addiction medicine co-management',
        'Consider methadone for cancer pain (dual benefit)',
      ],
      affectsInpatientThreshold: true,
      inpatientThresholdNotes: 'Lower threshold for admission, oncology team involvement',
      specialConsiderations: [
        'Goals of care discussion important',
        'Palliative care integration',
        'Balance between addiction treatment and symptom control',
      ],
    });
  }
  
  if (comorbidityLower.some(c => c.includes('renal') || c.includes('kidney') || c.includes('ckd') || c.includes('dialysis'))) {
    modifications.push({
      condition: 'Renal Impairment',
      affectsWithdrawal: true,
      withdrawalModifications: [
        'Prolonged drug half-lives - monitor for delayed withdrawal',
        'Electrolyte monitoring critical',
        'Fluid balance needs close attention',
      ],
      affectsAnalgesics: true,
      analgesicModifications: [
        'Avoid NSAIDs (nephrotoxic)',
        'Reduce doses of renally-excreted medications',
        'Gabapentin requires dose adjustment for GFR',
        'Avoid codeine (active metabolite accumulation)',
      ],
      affectsInpatientThreshold: true,
      inpatientThresholdNotes: 'Lower threshold - electrolyte disturbances more dangerous',
      specialConsiderations: [
        'Nephrology consultation if CKD stage 4-5',
        'Dialysis timing may need adjustment',
      ],
    });
  }
  
  if (comorbidityLower.some(c => c.includes('liver') || c.includes('hepatic') || c.includes('cirrhosis'))) {
    modifications.push({
      condition: 'Hepatic Impairment',
      affectsWithdrawal: true,
      withdrawalModifications: [
        'Prolonged benzodiazepine action if used',
        'Risk of hepatic encephalopathy',
        'Coagulation abnormalities',
      ],
      affectsAnalgesics: true,
      analgesicModifications: [
        'Reduce paracetamol dose (max 2g/day in severe impairment)',
        'Avoid hepatotoxic medications',
        'Use short-acting benzodiazepines if needed (oxazepam, lorazepam)',
      ],
      affectsInpatientThreshold: true,
      inpatientThresholdNotes: 'Strong indication for inpatient management',
      specialConsiderations: [
        'Gastroenterology/hepatology input',
        'Monitor for bleeding',
        'Nutritional support essential',
      ],
    });
  }
  
  if (comorbidityLower.some(c => c.includes('elderly') || c.includes('>65') || c.includes('geriatric'))) {
    modifications.push({
      condition: 'Elderly Patient (>65 years)',
      affectsWithdrawal: true,
      withdrawalModifications: [
        'Prolonged drug half-lives',
        'Higher risk of delirium',
        'Falls risk increased',
      ],
      affectsAnalgesics: true,
      analgesicModifications: [
        'Start low, go slow with all medications',
        'Avoid long-acting opioids',
        'NSAIDs higher risk - use with caution',
      ],
      affectsInpatientThreshold: true,
      inpatientThresholdNotes: 'Lower threshold for admission due to frailty and complication risk',
      specialConsiderations: [
        'Geriatric assessment if available',
        'Social support critical for outpatient success',
        'Polypharmacy review',
      ],
    });
  }

  return modifications;
}

// ==================== DOCUMENT GENERATION ====================

/**
 * Generate informed consent document content
 */
export function generateConsentDocument(
  assessment: SubstanceUseAssessment,
  patientName: string
): SubstanceUseConsent {
  return {
    id: uuidv4(),
    assessmentId: assessment.id,
    diagnosisExplanation: `Based on our assessment, you have been diagnosed with a Substance Use Disorder (${assessment.addictionSeverityScore.severityLevel} severity) primarily involving ${assessment.primarySubstance}. This is a medical condition that affects brain function and behavior, leading to an inability to control the use of substances despite harmful consequences.`,
    detoxificationRisks: [
      'Withdrawal symptoms may occur as your body adjusts to being without the substance(s)',
      'Symptoms may range from mild discomfort to severe medical complications',
      'In rare cases, withdrawal can be life-threatening without proper medical supervision',
      'Relapse is a common part of recovery and does not mean treatment has failed',
      'Mental health symptoms may emerge or worsen during withdrawal',
    ],
    possibleWithdrawalEffects: assessment.withdrawalRiskPrediction.expectedSymptoms.map(s => s.symptom),
    painManagementPlan: assessment.painManagementSupport
      ? 'A personalized pain management plan has been developed that minimizes the risk of substance misuse while addressing your pain needs. Non-opioid alternatives will be prioritized.'
      : 'Pain management will be addressed as needed using evidence-based, low-risk approaches.',
    monitoringRequirements: [
      'Regular vital signs monitoring',
      'Symptom assessment using standardized scales',
      'Blood tests as clinically indicated',
      'Mental health monitoring',
      'Regular follow-up appointments',
    ],
    patientAcknowledged: false,
    documentVersion: '1.0',
  };
}

/**
 * Generate patient information leaflet
 */
export function generatePatientInfoLeaflet(
  assessment: SubstanceUseAssessment,
  patientName: string
): PatientInfoLeaflet {
  const primaryDef = Object.values(substanceDefinitions).find(
    d => d.name.toLowerCase() === assessment.primarySubstance.toLowerCase() ||
         d.commonNames.some(n => n.toLowerCase() === assessment.primarySubstance.toLowerCase())
  );

  const dayByDayExpectations = [];
  
  if (primaryDef) {
    dayByDayExpectations.push(
      {
        day: 1,
        description: 'Early withdrawal phase begins',
        symptoms: assessment.withdrawalRiskPrediction.earlyPhaseSymptoms.slice(0, 4),
        selfCareAdvice: ['Stay hydrated', 'Rest as much as possible', 'Take prescribed medications', 'Avoid triggers'],
      },
      {
        day: 2,
        description: 'Symptoms may intensify',
        symptoms: [...assessment.withdrawalRiskPrediction.earlyPhaseSymptoms.slice(0, 2), ...assessment.withdrawalRiskPrediction.peakPhaseSymptoms.slice(0, 2)],
        selfCareAdvice: ['Continue hydration', 'Light nutrition if tolerated', 'Report worsening symptoms', 'Use coping strategies'],
      },
      {
        day: 3,
        description: 'Peak withdrawal period',
        symptoms: assessment.withdrawalRiskPrediction.peakPhaseSymptoms.slice(0, 4),
        selfCareAdvice: ['This is typically the hardest day', 'Symptoms will improve', 'Seek support', 'Stay in contact with medical team'],
      },
      {
        day: 4,
        description: 'Symptoms begin to improve',
        symptoms: assessment.withdrawalRiskPrediction.peakPhaseSymptoms.slice(0, 2),
        selfCareAdvice: ['Gradual improvement expected', 'Begin light activity if able', 'Maintain medication compliance'],
      },
      {
        day: 5,
        description: 'Late withdrawal phase',
        symptoms: assessment.withdrawalRiskPrediction.latePhaseSymptoms.slice(0, 3),
        selfCareAdvice: ['Continue recovery activities', 'Engage with support systems', 'Plan for ongoing recovery'],
      },
      {
        day: 7,
        description: 'Post-acute phase begins',
        symptoms: ['Fatigue', 'Mood swings', 'Sleep disturbance', 'Cravings may persist'],
        selfCareAdvice: ['Recovery is ongoing', 'Attend follow-up appointments', 'Build healthy routines'],
      }
    );
  }

  return {
    id: uuidv4(),
    assessmentId: assessment.id,
    dayByDayExpectations,
    warningSymptoms: assessment.withdrawalRiskPrediction.redFlagComplications.map(c => `⚠️ ${c}`),
    complianceExpectations: [
      'Take all prescribed medications as directed',
      'Attend all scheduled appointments',
      'Be honest with your healthcare team about any substance use',
      'Report any worsening symptoms immediately',
      'Avoid environments and people associated with substance use',
    ],
    familyInvolvement: [
      'Family support significantly improves recovery outcomes',
      'Family members should learn about substance use disorders',
      'Create a supportive, non-judgmental home environment',
      'Help identify and remove triggers from the environment',
      'Participate in family therapy if recommended',
    ],
    followUpSchedule: [
      { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), purpose: 'Early withdrawal assessment', location: 'Clinic/Phone' },
      { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), purpose: 'Week 1 review', location: 'Clinic' },
      { date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), purpose: 'Week 2 follow-up', location: 'Clinic' },
      { date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), purpose: 'Month 1 comprehensive review', location: 'Clinic' },
    ],
    emergencyContacts: [
      { name: 'Hospital Emergency', phone: '199', role: 'Emergency Services' },
      { name: 'Clinic Helpline', phone: 'Contact your clinic', role: 'Medical Advice' },
    ],
    generatedAt: new Date(),
    generatedBy: assessment.assessedBy,
  };
}

// ==================== DATABASE OPERATIONS ====================

export const SubstanceUseOps = {
  // Create new assessment
  async create(assessment: Omit<SubstanceUseAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    
    await db.substanceUseAssessments.add({
      ...assessment,
      id,
      createdAt: now,
      updatedAt: now,
    } as SubstanceUseAssessment);
    
    return id;
  },

  // Get assessment by ID
  async getById(id: string): Promise<SubstanceUseAssessment | undefined> {
    return db.substanceUseAssessments.get(id);
  },

  // Get all assessments for a patient
  async getByPatientId(patientId: string): Promise<SubstanceUseAssessment[]> {
    return db.substanceUseAssessments
      .where('patientId')
      .equals(patientId)
      .reverse()
      .toArray();
  },

  // Get all assessments for a hospital
  async getByHospitalId(hospitalId: string): Promise<SubstanceUseAssessment[]> {
    return db.substanceUseAssessments
      .where('hospitalId')
      .equals(hospitalId)
      .reverse()
      .toArray();
  },

  // Get active assessments (not completed/discharged)
  async getActiveAssessments(hospitalId?: string): Promise<SubstanceUseAssessment[]> {
    let query = db.substanceUseAssessments
      .filter(a => !['discharged', 'detox_completed', 'abandoned'].includes(a.status));
    
    if (hospitalId) {
      query = query.filter(a => a.hospitalId === hospitalId);
    }
    
    return query.toArray();
  },

  // Update assessment
  async update(id: string, updates: Partial<SubstanceUseAssessment>): Promise<void> {
    await db.substanceUseAssessments.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  // Add audit log entry
  async addAuditEntry(
    assessmentId: string,
    action: string,
    performedBy: string,
    details?: string
  ): Promise<void> {
    const assessment = await db.substanceUseAssessments.get(assessmentId);
    if (assessment) {
      const auditEntry = {
        action,
        performedBy,
        performedAt: new Date(),
        details,
      };
      await db.substanceUseAssessments.update(assessmentId, {
        auditLog: [...(assessment.auditLog || []), auditEntry],
        updatedAt: new Date(),
      });
    }
  },

  // Override clinician recommendation
  async overrideRecommendation(
    assessmentId: string,
    originalRecommendation: CareSettingRecommendation,
    newRecommendation: CareSettingRecommendation,
    reason: string,
    overriddenBy: string
  ): Promise<void> {
    await this.update(assessmentId, {
      clinicianOverride: {
        originalRecommendation,
        overriddenTo: newRecommendation,
        reason,
        overriddenBy,
        overriddenAt: new Date(),
      },
    });
    await this.addAuditEntry(
      assessmentId,
      'CLINICIAN_OVERRIDE',
      overriddenBy,
      `Changed recommendation from ${originalRecommendation} to ${newRecommendation}: ${reason}`
    );
  },
};

// Monitoring Records Operations
export const DetoxMonitoringOps = {
  async create(record: Omit<DetoxMonitoringRecord, 'id'>): Promise<string> {
    const id = uuidv4();
    await db.detoxMonitoringRecords.add({
      ...record,
      id,
    } as DetoxMonitoringRecord);
    return id;
  },

  async getByAssessmentId(assessmentId: string): Promise<DetoxMonitoringRecord[]> {
    return db.detoxMonitoringRecords
      .where('assessmentId')
      .equals(assessmentId)
      .reverse()
      .toArray();
  },

  async getLatestForPatient(patientId: string): Promise<DetoxMonitoringRecord | undefined> {
    const records = await db.detoxMonitoringRecords
      .where('patientId')
      .equals(patientId)
      .reverse()
      .limit(1)
      .toArray();
    return records[0];
  },
};

// Follow-up Operations
export const DetoxFollowUpOps = {
  async create(followUp: Omit<DetoxFollowUp, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    await db.detoxFollowUps.add({
      ...followUp,
      id,
      createdAt: now,
      updatedAt: now,
    } as DetoxFollowUp);
    return id;
  },

  async getByAssessmentId(assessmentId: string): Promise<DetoxFollowUp[]> {
    return db.detoxFollowUps
      .where('assessmentId')
      .equals(assessmentId)
      .toArray();
  },

  async getUpcoming(patientId: string): Promise<DetoxFollowUp[]> {
    const now = new Date();
    return db.detoxFollowUps
      .where('patientId')
      .equals(patientId)
      .filter(f => f.status === 'scheduled' && new Date(f.scheduledDate) >= now)
      .toArray();
  },

  async update(id: string, updates: Partial<DetoxFollowUp>): Promise<void> {
    await db.detoxFollowUps.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },
};

// Clinical Summary Operations
export const ClinicalSummaryOps = {
  async generate(
    assessment: SubstanceUseAssessment,
    patientName: string,
    hospitalName: string,
    generatedBy: string
  ): Promise<SubstanceUseClinicalSummary> {
    const summary: SubstanceUseClinicalSummary = {
      id: uuidv4(),
      assessmentId: assessment.id,
      patientId: assessment.patientId,
      patientName,
      hospitalName,
      assessmentDate: assessment.assessmentDate,
      addictionScoreSummary: {
        compositeScore: assessment.addictionSeverityScore.totalCompositeScore,
        severityLevel: assessment.addictionSeverityScore.severityLevel,
        interpretation: assessment.addictionSeverityScore.interpretationNotes,
      },
      riskClassification: assessment.withdrawalRiskPrediction.overallRisk,
      recommendedPathway: assessment.clinicianOverride?.overriddenTo || assessment.careSettingDecision.recommendation,
      keyFindings: [
        `Primary substance: ${assessment.primarySubstance}`,
        `Duration of use: ${assessment.substances[0]?.durationOfUseMonths || 'Unknown'} months`,
        `Poly-substance use: ${assessment.polySubstanceUse ? 'Yes' : 'No'}`,
        `Social support: ${assessment.socialFactors.familySupportLevel}`,
        `Previous detox attempts: ${assessment.previousDetoxAttempts}`,
      ],
      recommendedInterventions: [
        ...assessment.withdrawalRiskPrediction.pharmacologicalSupport.slice(0, 5),
        ...assessment.withdrawalRiskPrediction.monitoringRecommendations.slice(0, 3),
      ],
      monitoringChecklist: assessment.withdrawalRiskPrediction.monitoringRecommendations,
      followUpSchedule: [
        'Day 3: Early withdrawal review',
        'Day 7: Week 1 assessment',
        'Day 14: Week 2 follow-up',
        'Day 30: Month 1 comprehensive review',
        'Month 3: Quarterly review',
      ],
      disclaimers: [
        '⚠️ This document is for CLINICAL DECISION SUPPORT only',
        '⚠️ Final clinical responsibility rests with the treating physician',
        '⚠️ Individual patient factors may modify recommendations',
        '⚠️ This system does not autonomously prescribe medications',
        '⚠️ All treatment decisions must be documented and justified',
      ],
      generatedAt: new Date(),
      generatedBy,
    };

    await db.substanceUseClinicalSummaries.add(summary);
    return summary;
  },

  async getByAssessmentId(assessmentId: string): Promise<SubstanceUseClinicalSummary | undefined> {
    const summaries = await db.substanceUseClinicalSummaries
      .where('assessmentId')
      .equals(assessmentId)
      .toArray();
    return summaries[0];
  },
};

// Export service
export const substanceUseService = {
  substanceDefinitions,
  calculatePhysicalDependenceScore,
  calculatePsychologicalDependenceScore,
  calculateBehavioralDysfunctionScore,
  calculateSocialImpairmentScore,
  calculateMedicalComplicationsScore,
  calculateAddictionSeverityScore,
  predictWithdrawalRisk,
  generatePainManagementSupport,
  determineCareSettingRecommendation,
  getComorbidityModifications,
  generateConsentDocument,
  generatePatientInfoLeaflet,
  SubstanceUseOps,
  DetoxMonitoringOps,
  DetoxFollowUpOps,
  ClinicalSummaryOps,
};
