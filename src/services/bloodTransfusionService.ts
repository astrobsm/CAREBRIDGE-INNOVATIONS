/**
 * Blood Transfusion Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive blood transfusion management including:
 * - Blood typing and crossmatching
 * - Transfusion reactions monitoring
 * - Blood product management
 * - Massive transfusion protocols
 * - Transfusion triggers and thresholds
 */

import { v4 as uuidv4 } from 'uuid';

// Blood Types
export type BloodGroup = 'A' | 'B' | 'AB' | 'O';
export type RhFactor = 'positive' | 'negative';
export type BloodType = `${BloodGroup}${'+' | '-'}`;

export type BloodProduct = 
  | 'packed_red_cells'
  | 'whole_blood'
  | 'fresh_frozen_plasma'
  | 'platelets'
  | 'cryoprecipitate'
  | 'albumin'
  | 'immunoglobulin';

export type TransfusionUrgency = 'routine' | 'urgent' | 'emergency' | 'massive_transfusion';
export type TransfusionStatus = 'requested' | 'crossmatched' | 'issued' | 'in_progress' | 'completed' | 'cancelled' | 'reaction';
export type ReactionSeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';
export type ReactionType = 
  | 'febrile_non_hemolytic'
  | 'allergic_urticarial'
  | 'anaphylactic'
  | 'acute_hemolytic'
  | 'delayed_hemolytic'
  | 'transfusion_related_acute_lung_injury'
  | 'transfusion_associated_circulatory_overload'
  | 'bacterial_contamination'
  | 'hypothermia'
  | 'hypocalcemia'
  | 'hyperkalemia';

// Interfaces
export interface PatientBloodProfile {
  patientId: string;
  bloodGroup: BloodGroup;
  rhFactor: RhFactor;
  bloodType: BloodType;
  antibodyScreen: AntibodyScreen;
  previousTransfusions: number;
  previousReactions: TransfusionReaction[];
  specialRequirements: string[];
  lastTypedDate: Date;
  lastCrossmatchDate?: Date;
}

export interface AntibodyScreen {
  result: 'negative' | 'positive';
  antibodiesIdentified?: string[];
  titer?: string;
  clinicalSignificance?: string;
  datePerformed: Date;
}

export interface TransfusionRequest {
  id: string;
  patientId: string;
  requestedBy: string;
  requestedAt: Date;
  urgency: TransfusionUrgency;
  status: TransfusionStatus;
  
  // Clinical indication
  indication: string;
  hemoglobinLevel?: number;
  plateletCount?: number;
  inr?: number;
  fibrinogen?: number;
  
  // Blood products requested
  products: RequestedProduct[];
  
  // Crossmatch info
  crossmatchType: 'electronic' | 'immediate_spin' | 'full_crossmatch';
  crossmatchResult?: CrossmatchResult;
  
  // Consent
  consentObtained: boolean;
  consentDate?: Date;
  consentWitnessedBy?: string;
  
  // Special requirements
  specialRequirements: string[];
  
  notes?: string;
}

export interface RequestedProduct {
  id: string;
  productType: BloodProduct;
  units: number;
  specialProcessing?: ('irradiated' | 'leukoreduced' | 'washed' | 'cmv_negative' | 'antigen_negative')[];
}

export interface CrossmatchResult {
  compatible: boolean;
  donorUnits: DonorUnit[];
  performedBy: string;
  performedAt: Date;
  expiresAt: Date;
  method: string;
}

export interface DonorUnit {
  unitId: string;
  productType: BloodProduct;
  bloodType: BloodType;
  collectionDate: Date;
  expiryDate: Date;
  volume: number;
  compatible: boolean;
  issued: boolean;
  issuedAt?: Date;
  transfusionStarted?: Date;
  transfusionCompleted?: Date;
}

export interface TransfusionRecord {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  unitId: string;
  productType: BloodProduct;
  productName: string;
  
  // Pre-transfusion
  preVitals: TransfusionVitals;
  verifiedBy: { nurse1: string; nurse2: string };
  startTime: Date;
  
  // During transfusion
  flowRate: number; // mL/hr
  duringVitals: TransfusionVitals[];
  vitals?: TransfusionVitals[]; // Alias for duringVitals for backward compatibility
  
  // Post-transfusion
  endTime?: Date;
  postVitals?: TransfusionVitals;
  volumeTransfused: number;
  
  // Outcome
  status: 'in_progress' | 'completed' | 'stopped';
  reaction?: TransfusionReaction;
  notes?: string;
}

export interface TransfusionVitals {
  timestamp: Date;
  temperature: number;
  pulse: number;
  bloodPressure: { systolic: number; diastolic: number };
  respiratoryRate: number;
  oxygenSaturation: number;
  symptoms?: string[];
}

export interface TransfusionReaction {
  id: string;
  transfusionId: string;
  detectedAt: Date;
  type: ReactionType;
  severity: ReactionSeverity;
  symptoms: string[];
  vitalsAtReaction: TransfusionVitals;
  
  // Management
  transfusionStopped: boolean;
  stoppedAt?: Date;
  interventions: string[];
  medicationsGiven: { name: string; dose: string; time: Date }[];
  
  // Investigation
  bloodBankNotified: boolean;
  samplesCollected: string[];
  investigationResults?: string;
  
  // Outcome
  outcome: 'resolved' | 'ongoing' | 'fatal';
  reportedToHemovigilance: boolean;
}

export interface MassiveTransfusionProtocol {
  id: string;
  patientId: string;
  activatedAt: Date;
  activatedBy: string;
  indication: string;
  
  // Protocol ratios (typically 1:1:1)
  prcToPlasmaRatio: string;
  prcToPlateletsRatio: string;
  
  // Products issued
  rounds: MTPRound[];
  
  // Lab monitoring
  labValues: MTPLabMonitoring[];
  
  // Status
  status: 'active' | 'deactivated';
  deactivatedAt?: Date;
  deactivatedBy?: string;
  totalUnitsTransfused: {
    packedRedCells: number;
    plasma: number;
    platelets: number;
    cryoprecipitate: number;
  };
}

export interface MTPRound {
  roundNumber: number;
  issuedAt: Date;
  products: {
    packedRedCells: number;
    plasma: number;
    platelets: number;
    cryoprecipitate: number;
  };
}

export interface MTPLabMonitoring {
  timestamp: Date;
  hemoglobin: number;
  platelets: number;
  pt: number;
  inr: number;
  aptt: number;
  fibrinogen: number;
  calcium: number;
  potassium: number;
  lactate?: number;
  baseDeficit?: number;
}

// Blood product definitions
export const bloodProductInfo: Record<BloodProduct, {
  name: string;
  description: string;
  indications: string[];
  dose: string;
  expectedResponse: string;
  shelfLife: string;
  storage: string;
  infusionTime: string;
}> = {
  packed_red_cells: {
    name: 'Packed Red Blood Cells (PRBC)',
    description: 'Concentrated red cells with most plasma removed',
    indications: [
      'Acute blood loss with hemodynamic instability',
      'Symptomatic anemia (Hb < 7-8 g/dL)',
      'Perioperative anemia in high-risk patients',
    ],
    dose: '1 unit (approximately 300mL)',
    expectedResponse: 'Increase Hb by 1 g/dL per unit',
    shelfLife: '35-42 days',
    storage: '1-6°C',
    infusionTime: '1-4 hours (max 4 hours)',
  },
  whole_blood: {
    name: 'Whole Blood',
    description: 'Unprocessed blood containing all components',
    indications: [
      'Massive hemorrhage',
      'Exchange transfusion',
      'When component therapy unavailable',
    ],
    dose: '1 unit (450-500mL)',
    expectedResponse: 'Increase Hb by 1 g/dL, provides coagulation factors',
    shelfLife: '21-35 days',
    storage: '1-6°C',
    infusionTime: '2-4 hours',
  },
  fresh_frozen_plasma: {
    name: 'Fresh Frozen Plasma (FFP)',
    description: 'Plasma separated and frozen within 8 hours',
    indications: [
      'Coagulopathy with active bleeding',
      'Warfarin reversal (if PCC unavailable)',
      'Massive transfusion',
      'TTP/plasma exchange',
      'DIC with bleeding',
    ],
    dose: '10-15 mL/kg',
    expectedResponse: 'Increase factor levels by 15-25%',
    shelfLife: '1 year frozen, 24 hours after thawing',
    storage: '-18°C or colder',
    infusionTime: '30 minutes per unit',
  },
  platelets: {
    name: 'Platelet Concentrate',
    description: 'Concentrated platelets from whole blood or apheresis',
    indications: [
      'Thrombocytopenia with bleeding',
      'Prophylaxis: platelets < 10,000/µL',
      'Pre-procedure: platelets < 50,000/µL',
      'Platelet dysfunction with bleeding',
    ],
    dose: '1 adult dose (pool of 4-6 units or 1 apheresis)',
    expectedResponse: 'Increase by 30,000-50,000/µL',
    shelfLife: '5 days with agitation',
    storage: '20-24°C with continuous agitation',
    infusionTime: '30 minutes to 1 hour',
  },
  cryoprecipitate: {
    name: 'Cryoprecipitate',
    description: 'Cold-insoluble portion of plasma rich in fibrinogen, Factor VIII, vWF, Factor XIII',
    indications: [
      'Hypofibrinogenemia (< 100 mg/dL) with bleeding',
      'DIC with low fibrinogen',
      'vWD (when DDAVP/vWF concentrate unavailable)',
      'Factor XIII deficiency',
    ],
    dose: '1 unit per 5kg body weight',
    expectedResponse: 'Increase fibrinogen by 50-100 mg/dL',
    shelfLife: '1 year frozen, 6 hours after thawing',
    storage: '-18°C or colder',
    infusionTime: '15-30 minutes',
  },
  albumin: {
    name: 'Human Albumin',
    description: 'Plasma-derived albumin solution (5% or 25%)',
    indications: [
      'Hypoalbuminemia with edema',
      'Large volume paracentesis',
      'Spontaneous bacterial peritonitis',
      'Hepatorenal syndrome',
    ],
    dose: '25g (100mL of 25% or 500mL of 5%)',
    expectedResponse: 'Increase albumin by 0.5-1 g/dL',
    shelfLife: '3-5 years',
    storage: 'Room temperature',
    infusionTime: '1-2 hours',
  },
  immunoglobulin: {
    name: 'Intravenous Immunoglobulin (IVIG)',
    description: 'Pooled IgG from plasma donors',
    indications: [
      'Primary immunodeficiency',
      'ITP',
      'Kawasaki disease',
      'Guillain-Barré syndrome',
      'CIDP',
    ],
    dose: '0.4-2 g/kg depending on indication',
    expectedResponse: 'Varies by indication',
    shelfLife: '2-3 years',
    storage: '2-8°C',
    infusionTime: 'Start slow, increase gradually over 4-6 hours',
  },
};

// Transfusion triggers
export const transfusionTriggers = {
  hemoglobin: {
    restrictive: {
      threshold: 7,
      target: 9,
      indication: 'Stable, non-bleeding patients, ICU patients',
    },
    liberal: {
      threshold: 8,
      target: 10,
      indication: 'Acute coronary syndrome, cardiac surgery, symptomatic anemia',
    },
    critical: {
      threshold: 10,
      target: 12,
      indication: 'Severe hypoxemia, active massive hemorrhage',
    },
  },
  platelets: {
    prophylactic: {
      threshold: 10000,
      indication: 'Stable patients, no bleeding',
    },
    therapeuticLow: {
      threshold: 20000,
      indication: 'Fever, sepsis, minor procedures',
    },
    therapeuticModerate: {
      threshold: 50000,
      indication: 'Major surgery, lumbar puncture, epidural',
    },
    therapeuticHigh: {
      threshold: 100000,
      indication: 'CNS surgery, ophthalmic surgery',
    },
  },
  plasma: {
    inr: {
      threshold: 1.5,
      indication: 'Bleeding or pre-procedure with elevated INR',
    },
    fibrinogen: {
      threshold: 100,
      indication: 'Hypofibrinogenemia with bleeding',
    },
  },
};

// Blood compatibility matrix
export const compatibilityMatrix: Record<BloodType, {
  canReceiveRBC: BloodType[];
  canReceivePlasma: BloodType[];
  canDonateTo: BloodType[];
}> = {
  'O-': {
    canReceiveRBC: ['O-'],
    canReceivePlasma: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    canDonateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  },
  'O+': {
    canReceiveRBC: ['O-', 'O+'],
    canReceivePlasma: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    canDonateTo: ['O+', 'A+', 'B+', 'AB+'],
  },
  'A-': {
    canReceiveRBC: ['O-', 'A-'],
    canReceivePlasma: ['A-', 'A+', 'AB-', 'AB+'],
    canDonateTo: ['A-', 'A+', 'AB-', 'AB+'],
  },
  'A+': {
    canReceiveRBC: ['O-', 'O+', 'A-', 'A+'],
    canReceivePlasma: ['A-', 'A+', 'AB-', 'AB+'],
    canDonateTo: ['A+', 'AB+'],
  },
  'B-': {
    canReceiveRBC: ['O-', 'B-'],
    canReceivePlasma: ['B-', 'B+', 'AB-', 'AB+'],
    canDonateTo: ['B-', 'B+', 'AB-', 'AB+'],
  },
  'B+': {
    canReceiveRBC: ['O-', 'O+', 'B-', 'B+'],
    canReceivePlasma: ['B-', 'B+', 'AB-', 'AB+'],
    canDonateTo: ['B+', 'AB+'],
  },
  'AB-': {
    canReceiveRBC: ['O-', 'A-', 'B-', 'AB-'],
    canReceivePlasma: ['AB-', 'AB+'],
    canDonateTo: ['AB-', 'AB+'],
  },
  'AB+': {
    canReceiveRBC: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    canReceivePlasma: ['AB-', 'AB+'],
    canDonateTo: ['AB+'],
  },
};

// Transfusion reaction protocols
export const reactionProtocols: Record<ReactionType, {
  name: string;
  symptoms: string[];
  immediateActions: string[];
  investigations: string[];
  treatment: string[];
  preventionStrategies: string[];
}> = {
  febrile_non_hemolytic: {
    name: 'Febrile Non-Hemolytic Transfusion Reaction (FNHTR)',
    symptoms: ['Temperature rise ≥1°C', 'Chills', 'Rigors', 'No hemolysis'],
    immediateActions: [
      'Stop transfusion',
      'Maintain IV access with normal saline',
      'Check vital signs',
      'Rule out hemolytic reaction',
    ],
    investigations: ['Direct Coombs test', 'Visual inspection of plasma/urine for hemolysis'],
    treatment: ['Antipyretics (paracetamol)', 'Meperidine for severe rigors'],
    preventionStrategies: ['Use leukoreduced products', 'Pre-medication with antipyretics'],
  },
  allergic_urticarial: {
    name: 'Allergic/Urticarial Reaction',
    symptoms: ['Urticaria', 'Pruritus', 'Flushing', 'Localized angioedema'],
    immediateActions: [
      'Stop transfusion temporarily',
      'Assess for anaphylaxis',
      'Administer antihistamines',
    ],
    investigations: ['Clinical assessment', 'Tryptase if severe'],
    treatment: ['Diphenhydramine 25-50mg IV', 'Hydrocortisone if persistent'],
    preventionStrategies: ['Pre-medication with antihistamines', 'Washed products for recurrent reactions'],
  },
  anaphylactic: {
    name: 'Anaphylactic Reaction',
    symptoms: [
      'Hypotension',
      'Bronchospasm',
      'Angioedema (generalized)',
      'Respiratory distress',
      'Cardiovascular collapse',
    ],
    immediateActions: [
      'STOP transfusion immediately',
      'Call for help',
      'Maintain airway',
      'Epinephrine 0.3-0.5mg IM',
      'High flow oxygen',
      'IV fluids',
    ],
    investigations: ['Tryptase levels', 'IgA levels', 'Anti-IgA antibodies'],
    treatment: [
      'Epinephrine (repeat q5-15min PRN)',
      'IV fluids',
      'Corticosteroids',
      'H1 and H2 blockers',
      'Bronchodilators',
    ],
    preventionStrategies: ['Washed products', 'IgA-deficient donor products for IgA-deficient patients'],
  },
  acute_hemolytic: {
    name: 'Acute Hemolytic Transfusion Reaction (AHTR)',
    symptoms: [
      'Fever',
      'Chills',
      'Flank/back pain',
      'Hypotension',
      'Hemoglobinuria (red/brown urine)',
      'DIC',
      'Renal failure',
    ],
    immediateActions: [
      'STOP transfusion immediately',
      'Maintain IV access',
      'Notify blood bank STAT',
      'Recheck patient ID and blood unit',
      'Send samples for investigation',
    ],
    investigations: [
      'Direct Coombs test',
      'Plasma hemoglobin',
      'Urine hemoglobin',
      'Bilirubin',
      'LDH',
      'Haptoglobin',
      'Repeat crossmatch',
      'DIC screen',
    ],
    treatment: [
      'IV fluids to maintain urine output >100mL/hr',
      'Furosemide if oliguric',
      'Treat DIC if present',
      'Dialysis if renal failure',
    ],
    preventionStrategies: ['Strict patient identification', 'Electronic verification systems'],
  },
  delayed_hemolytic: {
    name: 'Delayed Hemolytic Transfusion Reaction (DHTR)',
    symptoms: [
      'Unexplained drop in hemoglobin 3-14 days post-transfusion',
      'Fever',
      'Jaundice',
      'Positive DAT',
    ],
    immediateActions: [
      'Obtain blood samples',
      'Notify blood bank',
      'Type and screen with extended phenotype',
    ],
    investigations: [
      'Direct Coombs test',
      'Antibody identification',
      'Extended red cell phenotype',
      'Bilirubin',
      'LDH',
    ],
    treatment: ['Supportive care', 'Transfuse antigen-negative units if needed'],
    preventionStrategies: ['Antibody screening', 'Extended crossmatch for previously transfused patients'],
  },
  transfusion_related_acute_lung_injury: {
    name: 'Transfusion-Related Acute Lung Injury (TRALI)',
    symptoms: [
      'Acute respiratory distress within 6 hours',
      'Hypoxemia',
      'Bilateral pulmonary infiltrates',
      'No evidence of circulatory overload',
      'Fever',
    ],
    immediateActions: [
      'Stop transfusion',
      'Supportive respiratory care',
      'May need mechanical ventilation',
      'Notify blood bank',
    ],
    investigations: [
      'CXR',
      'ABG',
      'BNP (to rule out TACO)',
      'Anti-HLA/anti-HNA antibodies in donor',
    ],
    treatment: [
      'Supplemental oxygen',
      'Mechanical ventilation if needed',
      'Supportive care',
      'Diuretics NOT helpful (unlike TACO)',
    ],
    preventionStrategies: ['Male-only plasma donors', 'Screen donors for anti-HLA antibodies'],
  },
  transfusion_associated_circulatory_overload: {
    name: 'Transfusion-Associated Circulatory Overload (TACO)',
    symptoms: [
      'Respiratory distress',
      'Orthopnea',
      'Elevated JVP',
      'Hypertension',
      'Peripheral edema',
      'Elevated BNP',
    ],
    immediateActions: [
      'Stop or slow transfusion',
      'Sit patient upright',
      'Administer diuretics',
      'Supplemental oxygen',
    ],
    investigations: ['CXR', 'BNP/NT-proBNP', 'Echocardiogram'],
    treatment: [
      'Furosemide IV',
      'Oxygen',
      'Slow transfusion rate',
      'Consider splitting units over time',
    ],
    preventionStrategies: [
      'Slow transfusion rate (1mL/kg/hr)',
      'Prophylactic diuretics',
      'Split units in at-risk patients',
      'Single unit transfusions with reassessment',
    ],
  },
  bacterial_contamination: {
    name: 'Bacterial Contamination/Septic Transfusion Reaction',
    symptoms: [
      'High fever (>2°C rise)',
      'Rigors',
      'Hypotension/shock',
      'Rapid onset during or shortly after transfusion',
    ],
    immediateActions: [
      'Stop transfusion immediately',
      'Maintain IV access',
      'Blood cultures from patient AND unit',
      'Gram stain of unit',
      'Broad-spectrum antibiotics STAT',
    ],
    investigations: [
      'Blood cultures (patient)',
      'Culture of blood unit',
      'Gram stain of unit contents',
    ],
    treatment: [
      'Broad-spectrum IV antibiotics',
      'Vasopressors if needed',
      'ICU admission',
    ],
    preventionStrategies: [
      'Bacterial testing of platelets',
      'Proper storage and handling',
      'Visual inspection before transfusion',
    ],
  },
  hypothermia: {
    name: 'Hypothermia',
    symptoms: ['Core temperature < 35°C', 'Shivering', 'Arrhythmias'],
    immediateActions: ['Slow or stop transfusion', 'Use blood warmer'],
    investigations: ['Core temperature monitoring'],
    treatment: ['Active warming', 'Blood warmer for subsequent units'],
    preventionStrategies: ['Blood warmer for rapid/large volume transfusions'],
  },
  hypocalcemia: {
    name: 'Citrate Toxicity/Hypocalcemia',
    symptoms: ['Perioral numbness', 'Paresthesias', 'Muscle cramps', 'Prolonged QT', 'Tetany'],
    immediateActions: ['Slow transfusion', 'Check ionized calcium'],
    investigations: ['Ionized calcium', 'ECG'],
    treatment: ['Calcium gluconate 10% 10mL IV', 'Monitor calcium during massive transfusion'],
    preventionStrategies: ['Prophylactic calcium during massive transfusion', 'Monitor q4-6 units'],
  },
  hyperkalemia: {
    name: 'Hyperkalemia',
    symptoms: ['Muscle weakness', 'Arrhythmias', 'ECG changes (peaked T waves, widened QRS)'],
    immediateActions: ['Stop transfusion if severe', 'ECG', 'Check potassium'],
    investigations: ['Serum potassium', 'ECG'],
    treatment: [
      'Calcium gluconate for cardiac protection',
      'Insulin + glucose',
      'Sodium bicarbonate',
      'Kayexalate',
      'Dialysis if severe',
    ],
    preventionStrategies: ['Fresh units', 'Washed products', 'Irradiated units within 24 hours'],
  },
};

// Blood Transfusion Service Class
class BloodTransfusionService {
  // Create transfusion request
  createRequest(data: Partial<TransfusionRequest>): TransfusionRequest {
    return {
      id: uuidv4(),
      patientId: data.patientId || '',
      requestedBy: data.requestedBy || '',
      requestedAt: new Date(),
      urgency: data.urgency || 'routine',
      status: 'requested',
      indication: data.indication || '',
      hemoglobinLevel: data.hemoglobinLevel,
      plateletCount: data.plateletCount,
      inr: data.inr,
      fibrinogen: data.fibrinogen,
      products: data.products || [],
      crossmatchType: this.determineCrossmatchType(data.urgency || 'routine'),
      consentObtained: data.consentObtained || false,
      specialRequirements: data.specialRequirements || [],
      notes: data.notes,
    };
  }

  // Determine crossmatch type based on urgency
  determineCrossmatchType(urgency: TransfusionUrgency): 'electronic' | 'immediate_spin' | 'full_crossmatch' {
    switch (urgency) {
      case 'massive_transfusion':
      case 'emergency':
        return 'immediate_spin';
      case 'urgent':
        return 'immediate_spin';
      default:
        return 'full_crossmatch';
    }
  }

  // Check blood compatibility
  isCompatible(
    recipientType: BloodType,
    donorType: BloodType,
    product: 'rbc' | 'plasma'
  ): boolean {
    const compatibility = compatibilityMatrix[recipientType];
    if (product === 'rbc') {
      return compatibility.canReceiveRBC.includes(donorType);
    }
    return compatibility.canReceivePlasma.includes(donorType);
  }

  // Get compatible blood types for a patient
  getCompatibleTypes(
    patientType: BloodType,
    product: 'rbc' | 'plasma'
  ): BloodType[] {
    const compatibility = compatibilityMatrix[patientType];
    return product === 'rbc' ? compatibility.canReceiveRBC : compatibility.canReceivePlasma;
  }

  // Calculate units needed based on target
  calculateUnitsNeeded(
    currentHb: number,
    targetHb: number,
    patientWeight: number
  ): { units: number; expectedIncrease: number } {
    // Each unit increases Hb by approximately 1 g/dL in 70kg adult
    const hbDeficit = targetHb - currentHb;
    const weightFactor = patientWeight / 70;
    const units = Math.ceil(hbDeficit * weightFactor);
    
    return {
      units: Math.max(1, units),
      expectedIncrease: units / weightFactor,
    };
  }

  // Assess transfusion need based on triggers
  assessTransfusionNeed(
    hemoglobin: number,
    platelets: number | undefined,
    inr: number | undefined,
    clinicalContext: 'stable' | 'bleeding' | 'perioperative' | 'cardiac'
  ): {
    needsRBC: boolean;
    needsPlatelets: boolean;
    needsPlasma: boolean;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let needsRBC = false;
    let needsPlatelets = false;
    let needsPlasma = false;

    // RBC assessment
    if (clinicalContext === 'cardiac' && hemoglobin < 8) {
      needsRBC = true;
      recommendations.push('Transfuse to maintain Hb > 8 g/dL (cardiac patient)');
    } else if (clinicalContext === 'bleeding' && hemoglobin < 9) {
      needsRBC = true;
      recommendations.push('Transfuse to maintain Hb > 9 g/dL (active bleeding)');
    } else if (hemoglobin < 7) {
      needsRBC = true;
      recommendations.push('Transfuse for Hb < 7 g/dL (restrictive threshold)');
    }

    // Platelet assessment
    if (platelets !== undefined) {
      if (clinicalContext === 'bleeding' && platelets < 50000) {
        needsPlatelets = true;
        recommendations.push('Transfuse platelets for active bleeding with count < 50,000');
      } else if (clinicalContext === 'perioperative' && platelets < 50000) {
        needsPlatelets = true;
        recommendations.push('Transfuse platelets pre-procedure (count < 50,000)');
      } else if (platelets < 10000) {
        needsPlatelets = true;
        recommendations.push('Prophylactic platelet transfusion for count < 10,000');
      }
    }

    // Plasma assessment
    if (inr !== undefined && inr > 1.5) {
      if (clinicalContext === 'bleeding' || clinicalContext === 'perioperative') {
        needsPlasma = true;
        recommendations.push('Consider FFP for elevated INR with bleeding/procedure');
      }
    }

    return { needsRBC, needsPlatelets, needsPlasma, recommendations };
  }

  // Start transfusion record
  startTransfusion(
    requestId: string,
    patientId: string,
    unitId: string,
    productType: BloodProduct,
    preVitals: TransfusionVitals,
    verifiedBy: { nurse1: string; nurse2: string }
  ): TransfusionRecord {
    return {
      id: uuidv4(),
      requestId,
      patientId,
      patientName: '', // To be filled by caller
      unitId,
      productType,
      productName: bloodProductInfo[productType]?.name || productType,
      preVitals,
      verifiedBy,
      startTime: new Date(),
      flowRate: this.getRecommendedFlowRate(productType),
      duringVitals: [],
      volumeTransfused: 0,
      status: 'in_progress',
    };
  }

  // Get recommended flow rate
  getRecommendedFlowRate(productType: BloodProduct): number {
    switch (productType) {
      case 'packed_red_cells':
        return 150; // mL/hr standard, can go up to 300 mL/hr
      case 'fresh_frozen_plasma':
        return 200;
      case 'platelets':
        return 300;
      case 'cryoprecipitate':
        return 300;
      default:
        return 150;
    }
  }

  // Detect potential reaction
  detectReaction(
    preVitals: TransfusionVitals,
    currentVitals: TransfusionVitals
  ): { hasReaction: boolean; possibleTypes: ReactionType[]; severity: ReactionSeverity } {
    const possibleTypes: ReactionType[] = [];
    let severity: ReactionSeverity = 'mild';

    // Temperature change
    const tempChange = currentVitals.temperature - preVitals.temperature;
    if (tempChange >= 2) {
      possibleTypes.push('bacterial_contamination');
      severity = 'severe';
    } else if (tempChange >= 1) {
      possibleTypes.push('febrile_non_hemolytic');
    }

    // Blood pressure drop
    const bpDrop = preVitals.bloodPressure.systolic - currentVitals.bloodPressure.systolic;
    if (bpDrop >= 30 || currentVitals.bloodPressure.systolic < 90) {
      possibleTypes.push('anaphylactic', 'acute_hemolytic');
      severity = 'life_threatening';
    }

    // Respiratory distress
    if (currentVitals.respiratoryRate > 25 || currentVitals.oxygenSaturation < 92) {
      possibleTypes.push('transfusion_related_acute_lung_injury', 'transfusion_associated_circulatory_overload');
      severity = 'severe';
    }

    // Check symptoms
    if (currentVitals.symptoms) {
      if (currentVitals.symptoms.includes('urticaria') || currentVitals.symptoms.includes('pruritus')) {
        possibleTypes.push('allergic_urticarial');
      }
      if (currentVitals.symptoms.includes('back pain') || currentVitals.symptoms.includes('hemoglobinuria')) {
        possibleTypes.push('acute_hemolytic');
        severity = 'life_threatening';
      }
    }

    return {
      hasReaction: possibleTypes.length > 0,
      possibleTypes,
      severity,
    };
  }

  // Activate massive transfusion protocol
  activateMTP(
    patientId: string,
    activatedBy: string,
    indication: string
  ): MassiveTransfusionProtocol {
    return {
      id: uuidv4(),
      patientId,
      activatedAt: new Date(),
      activatedBy,
      indication,
      prcToPlasmaRatio: '1:1',
      prcToPlateletsRatio: '1:1',
      rounds: [],
      labValues: [],
      status: 'active',
      totalUnitsTransfused: {
        packedRedCells: 0,
        plasma: 0,
        platelets: 0,
        cryoprecipitate: 0,
      },
    };
  }

  // Get MTP round products
  getMTPRound(roundNumber: number): MTPRound {
    // Standard MTP pack: 6 PRBC, 6 FFP, 1 apheresis platelets, 10 cryo
    return {
      roundNumber,
      issuedAt: new Date(),
      products: {
        packedRedCells: 6,
        plasma: 6,
        platelets: 1,
        cryoprecipitate: 10,
      },
    };
  }

  // Get transfusion checklist
  getPreTransfusionChecklist(): { item: string; critical: boolean }[] {
    return [
      { item: 'Verify patient identity (name, date of birth, hospital number)', critical: true },
      { item: 'Verify blood unit details match request', critical: true },
      { item: 'Check blood type compatibility', critical: true },
      { item: 'Check unit expiry date', critical: true },
      { item: 'Inspect unit for abnormalities (clots, discoloration, leaks)', critical: true },
      { item: 'Confirm informed consent obtained', critical: true },
      { item: 'Document baseline vital signs', critical: true },
      { item: 'Ensure IV access is patent (18G or larger for PRBC)', critical: false },
      { item: 'Two qualified staff verify at bedside', critical: true },
      { item: 'Blood warmer ready if rapid transfusion or large volume', critical: false },
      { item: 'Emergency equipment accessible', critical: false },
    ];
  }

  // Get monitoring schedule
  getMonitoringSchedule(_productType: BloodProduct): {
    timepoint: string;
    checks: string[];
  }[] {
    return [
      {
        timepoint: 'Pre-transfusion (baseline)',
        checks: ['Temperature', 'Pulse', 'Blood pressure', 'Respiratory rate', 'SpO2'],
      },
      {
        timepoint: '15 minutes after start',
        checks: ['Temperature', 'Pulse', 'Blood pressure', 'Respiratory rate', 'SpO2', 'Ask about symptoms'],
      },
      {
        timepoint: 'Every 30-60 minutes during transfusion',
        checks: ['Temperature', 'Pulse', 'Blood pressure', 'Visual check of patient'],
      },
      {
        timepoint: 'End of transfusion',
        checks: ['Temperature', 'Pulse', 'Blood pressure', 'Respiratory rate', 'SpO2'],
      },
      {
        timepoint: '1 hour post-transfusion',
        checks: ['Temperature', 'Pulse', 'Blood pressure'],
      },
    ];
  }
}

export const bloodTransfusionService = new BloodTransfusionService();
export default bloodTransfusionService;
