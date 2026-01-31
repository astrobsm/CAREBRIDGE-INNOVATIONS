/**
 * GFR-Based Medication Dosing Service
 * 
 * Provides dose adjustments and contraindication warnings based on
 * patient's estimated GFR using CKD-EPI (2021 race-free) formula.
 * 
 * References: BNF (British National Formulary), WHO Essential Medicines
 */

// ============================================================
// TYPES
// ============================================================

export interface GFRCalculationInput {
  creatinine: number; // mg/dL
  age: number;
  gender: 'male' | 'female';
  weight?: number; // kg (for Cockcroft-Gault)
}

export interface GFRResult {
  gfrCKDEPI: number;
  gfrCockcroftGault?: number;
  ckdStage: CKDStage;
  stageDescription: string;
  renalDosingCategory: RenalDosingCategory;
}

export type CKDStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

export type RenalDosingCategory = 
  | 'normal'      // GFR ≥90
  | 'mild'        // GFR 60-89
  | 'moderate'    // GFR 30-59
  | 'severe'      // GFR 15-29
  | 'dialysis';   // GFR <15

export interface MedicationDosingInfo {
  name: string;
  genericName: string;
  category: MedicationCategory;
  normalDose: string;
  renalAdjustments: Record<RenalDosingCategory, DoseAdjustment>;
  contraindications: {
    absoluteGFRThreshold?: number;
    relativeGFRThreshold?: number;
    conditions?: string[];
  };
  monitoringRequired?: string[];
  dialysisRemoval?: 'yes' | 'no' | 'partial';
  notes?: string;
}

export interface DoseAdjustment {
  dose: string;
  frequency?: string;
  warning?: string;
  isContraindicated?: boolean;
  requiresMonitoring?: boolean;
}

export type MedicationCategory =
  | 'antibiotic'
  | 'analgesic'
  | 'antidiabetic'
  | 'antihypertensive'
  | 'anticoagulant'
  | 'opioid'
  | 'nsaid'
  | 'diuretic'
  | 'cardiac'
  | 'antiepileptic'
  | 'immunosuppressant'
  | 'antiemetic'
  | 'sedative'
  | 'other';

export interface DosingRecommendation {
  medication: string;
  patientGFR: number;
  ckdStage: CKDStage;
  originalDose: string;
  recommendedDose: string;
  adjustmentReason: string;
  warnings: string[];
  isContraindicated: boolean;
  requiresMonitoring: boolean;
  monitoringInstructions?: string[];
  alternatives?: string[];
}

// ============================================================
// GFR CALCULATION FUNCTIONS
// ============================================================

/**
 * Calculate eGFR using CKD-EPI 2021 equation (race-free)
 * This is the recommended equation for most clinical applications
 */
export function calculateCKDEPI(input: GFRCalculationInput): number {
  const { creatinine, age, gender } = input;
  
  if (creatinine <= 0 || age <= 0) return 0;
  
  const kappa = gender === 'female' ? 0.7 : 0.9;
  const crKappa = creatinine / kappa;
  
  let gfr: number;
  
  if (gender === 'female') {
    if (creatinine <= 0.7) {
      gfr = 142 * Math.pow(crKappa, -0.241) * Math.pow(0.9938, age);
    } else {
      gfr = 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, age);
    }
    gfr *= 1.012; // Sex coefficient for females
  } else {
    if (creatinine <= 0.9) {
      gfr = 142 * Math.pow(crKappa, -0.302) * Math.pow(0.9938, age);
    } else {
      gfr = 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, age);
    }
  }
  
  return Math.round(gfr * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate CrCl using Cockcroft-Gault equation
 * Preferred for drug dosing in some medications
 */
export function calculateCockcroftGault(input: GFRCalculationInput): number | null {
  const { creatinine, age, gender, weight } = input;
  
  if (!weight || creatinine <= 0 || age <= 0 || weight <= 0) return null;
  
  let crcl = ((140 - age) * weight) / (72 * creatinine);
  if (gender === 'female') {
    crcl *= 0.85;
  }
  
  return Math.round(crcl * 10) / 10;
}

/**
 * Determine CKD Stage from GFR value
 */
export function getCKDStage(gfr: number): { stage: CKDStage; description: string } {
  if (gfr >= 90) {
    return { stage: 'G1', description: 'Normal or high' };
  } else if (gfr >= 60) {
    return { stage: 'G2', description: 'Mildly decreased' };
  } else if (gfr >= 45) {
    return { stage: 'G3a', description: 'Mild-moderate decrease' };
  } else if (gfr >= 30) {
    return { stage: 'G3b', description: 'Moderate-severe decrease' };
  } else if (gfr >= 15) {
    return { stage: 'G4', description: 'Severely decreased' };
  } else {
    return { stage: 'G5', description: 'Kidney failure' };
  }
}

/**
 * Get renal dosing category from GFR
 */
export function getRenalDosingCategory(gfr: number): RenalDosingCategory {
  if (gfr >= 90) return 'normal';
  if (gfr >= 60) return 'mild';
  if (gfr >= 30) return 'moderate';
  if (gfr >= 15) return 'severe';
  return 'dialysis';
}

/**
 * Calculate full GFR result with all derived values
 */
export function calculateGFR(input: GFRCalculationInput): GFRResult {
  const gfrCKDEPI = calculateCKDEPI(input);
  const gfrCockcroftGault = calculateCockcroftGault(input);
  const { stage, description } = getCKDStage(gfrCKDEPI);
  const renalDosingCategory = getRenalDosingCategory(gfrCKDEPI);
  
  return {
    gfrCKDEPI,
    gfrCockcroftGault: gfrCockcroftGault || undefined,
    ckdStage: stage,
    stageDescription: description,
    renalDosingCategory,
  };
}

// ============================================================
// MEDICATION DATABASE WITH RENAL DOSING
// ============================================================

/**
 * Comprehensive medication database with renal dose adjustments
 * Following BNF and WHO guidelines
 */
export const MEDICATIONS_DATABASE: MedicationDosingInfo[] = [
  // ====== ANTIBIOTICS ======
  {
    name: 'Amoxicillin',
    genericName: 'amoxicillin',
    category: 'antibiotic',
    normalDose: '500mg 8-hourly',
    renalAdjustments: {
      normal: { dose: '500mg 8-hourly' },
      mild: { dose: '500mg 8-hourly' },
      moderate: { dose: '500mg 12-hourly', warning: 'Reduce frequency' },
      severe: { dose: '500mg 24-hourly', warning: 'Reduce to once daily', requiresMonitoring: true },
      dialysis: { dose: '500mg after dialysis', warning: 'Give after haemodialysis session' },
    },
    contraindications: {},
    dialysisRemoval: 'yes',
  },
  {
    name: 'Amoxicillin-Clavulanate (Augmentin)',
    genericName: 'co-amoxiclav',
    category: 'antibiotic',
    normalDose: '625mg 8-hourly',
    renalAdjustments: {
      normal: { dose: '625mg 8-hourly' },
      mild: { dose: '625mg 8-hourly' },
      moderate: { dose: '625mg 12-hourly', warning: 'Risk of crystalluria - ensure hydration' },
      severe: { dose: '625mg 24-hourly', warning: 'Increased risk of CNS toxicity', requiresMonitoring: true },
      dialysis: { dose: '625mg after dialysis', warning: 'Supplement after haemodialysis' },
    },
    contraindications: {},
    dialysisRemoval: 'yes',
  },
  {
    name: 'Ciprofloxacin',
    genericName: 'ciprofloxacin',
    category: 'antibiotic',
    normalDose: '500mg 12-hourly',
    renalAdjustments: {
      normal: { dose: '500mg 12-hourly' },
      mild: { dose: '500mg 12-hourly' },
      moderate: { dose: '250-500mg 12-hourly', warning: 'May need dose reduction' },
      severe: { dose: '250-500mg 24-hourly', warning: 'Reduce dose and frequency', requiresMonitoring: true },
      dialysis: { dose: '250-500mg 24-hourly after dialysis', warning: 'Give after haemodialysis' },
    },
    contraindications: {},
    monitoringRequired: ['QT interval if concurrent QT-prolonging drugs'],
    dialysisRemoval: 'partial',
  },
  {
    name: 'Metronidazole',
    genericName: 'metronidazole',
    category: 'antibiotic',
    normalDose: '400-500mg 8-hourly',
    renalAdjustments: {
      normal: { dose: '400-500mg 8-hourly' },
      mild: { dose: '400-500mg 8-hourly' },
      moderate: { dose: '400-500mg 8-hourly' },
      severe: { dose: '400-500mg 8-12 hourly', warning: 'No major adjustment needed' },
      dialysis: { dose: 'Normal dose, supplement after HD', warning: 'Partially removed by dialysis' },
    },
    contraindications: {},
    dialysisRemoval: 'partial',
  },
  {
    name: 'Gentamicin',
    genericName: 'gentamicin',
    category: 'antibiotic',
    normalDose: '5-7mg/kg once daily',
    renalAdjustments: {
      normal: { dose: '5-7mg/kg once daily' },
      mild: { dose: '5-7mg/kg once daily', warning: 'Monitor levels', requiresMonitoring: true },
      moderate: { dose: '5-7mg/kg every 24-36h', warning: 'MUST monitor trough levels', requiresMonitoring: true },
      severe: { dose: '5-7mg/kg every 48h', warning: 'High nephrotoxicity risk - levels essential', requiresMonitoring: true },
      dialysis: { dose: '2mg/kg after dialysis', warning: 'Give after HD, monitor levels', requiresMonitoring: true },
    },
    contraindications: {
      conditions: ['Avoid if alternatives available in severe CKD'],
    },
    monitoringRequired: ['Trough levels before 3rd dose', 'Peak levels if MIC known', 'Renal function daily'],
    dialysisRemoval: 'yes',
    notes: 'Nephrotoxic and ototoxic. Use with extreme caution in renal impairment.',
  },
  {
    name: 'Ceftriaxone',
    genericName: 'ceftriaxone',
    category: 'antibiotic',
    normalDose: '1-2g once daily',
    renalAdjustments: {
      normal: { dose: '1-2g once daily' },
      mild: { dose: '1-2g once daily' },
      moderate: { dose: '1-2g once daily' },
      severe: { dose: '1-2g once daily', warning: 'No adjustment usually needed' },
      dialysis: { dose: '1-2g once daily', warning: 'Not removed by haemodialysis' },
    },
    contraindications: {},
    dialysisRemoval: 'no',
  },
  {
    name: 'Vancomycin',
    genericName: 'vancomycin',
    category: 'antibiotic',
    normalDose: '15-20mg/kg 12-hourly',
    renalAdjustments: {
      normal: { dose: '15-20mg/kg 12-hourly', requiresMonitoring: true },
      mild: { dose: '15-20mg/kg 12-hourly', warning: 'Monitor trough levels', requiresMonitoring: true },
      moderate: { dose: '15-20mg/kg 24-48h', warning: 'Adjust based on levels', requiresMonitoring: true },
      severe: { dose: '15-20mg/kg 48-72h', warning: 'Trough-guided dosing essential', requiresMonitoring: true },
      dialysis: { dose: '15-25mg/kg after dialysis', warning: 'Monitor pre-dialysis level', requiresMonitoring: true },
    },
    contraindications: {},
    monitoringRequired: ['Trough levels (target 10-20 mg/L)', 'Renal function', 'Signs of ototoxicity'],
    dialysisRemoval: 'partial',
  },
  
  // ====== ANALGESICS ======
  {
    name: 'Paracetamol (Acetaminophen)',
    genericName: 'paracetamol',
    category: 'analgesic',
    normalDose: '1g 4-6 hourly (max 4g/day)',
    renalAdjustments: {
      normal: { dose: '1g 4-6 hourly (max 4g/day)' },
      mild: { dose: '1g 4-6 hourly (max 4g/day)' },
      moderate: { dose: '1g 6-hourly (max 3g/day)', warning: 'Reduce maximum daily dose' },
      severe: { dose: '500mg-1g 6-8 hourly (max 2g/day)', warning: 'Reduce dose and increase interval', requiresMonitoring: true },
      dialysis: { dose: '500mg-1g 6-8 hourly', warning: 'Not removed by dialysis' },
    },
    contraindications: {},
    dialysisRemoval: 'partial',
  },
  {
    name: 'Ibuprofen',
    genericName: 'ibuprofen',
    category: 'nsaid',
    normalDose: '400mg 8-hourly',
    renalAdjustments: {
      normal: { dose: '400mg 8-hourly' },
      mild: { dose: '400mg 8-hourly', warning: 'Use with caution' },
      moderate: { dose: 'AVOID', warning: 'NSAIDs can worsen renal function', isContraindicated: true },
      severe: { dose: 'CONTRAINDICATED', warning: 'NSAIDs contraindicated in severe CKD', isContraindicated: true },
      dialysis: { dose: 'CONTRAINDICATED', warning: 'Avoid in dialysis patients', isContraindicated: true },
    },
    contraindications: {
      relativeGFRThreshold: 60,
      absoluteGFRThreshold: 30,
      conditions: ['Active peptic ulcer', 'Heart failure', 'Dehydration'],
    },
    notes: 'All NSAIDs reduce renal blood flow. Use paracetamol as alternative.',
    dialysisRemoval: 'no',
  },
  {
    name: 'Diclofenac',
    genericName: 'diclofenac',
    category: 'nsaid',
    normalDose: '50mg 8-hourly',
    renalAdjustments: {
      normal: { dose: '50mg 8-hourly' },
      mild: { dose: '50mg 8-hourly', warning: 'Use lowest effective dose for shortest duration' },
      moderate: { dose: 'AVOID', warning: 'NSAIDs can cause acute kidney injury', isContraindicated: true },
      severe: { dose: 'CONTRAINDICATED', isContraindicated: true },
      dialysis: { dose: 'CONTRAINDICATED', isContraindicated: true },
    },
    contraindications: {
      relativeGFRThreshold: 60,
      absoluteGFRThreshold: 30,
    },
    dialysisRemoval: 'no',
  },
  
  // ====== OPIOIDS ======
  {
    name: 'Morphine',
    genericName: 'morphine',
    category: 'opioid',
    normalDose: '5-10mg 4-hourly PRN',
    renalAdjustments: {
      normal: { dose: '5-10mg 4-hourly PRN' },
      mild: { dose: '5-10mg 4-hourly PRN' },
      moderate: { dose: '2.5-5mg 4-6 hourly', warning: 'Active metabolites accumulate', requiresMonitoring: true },
      severe: { dose: 'AVOID - use alternatives', warning: 'M6G metabolite causes prolonged sedation and respiratory depression', isContraindicated: true },
      dialysis: { dose: 'AVOID - use alternatives', warning: 'Metabolites not cleared by dialysis', isContraindicated: true },
    },
    contraindications: {
      absoluteGFRThreshold: 30,
    },
    notes: 'Prefer fentanyl or hydromorphone in severe renal impairment.',
    dialysisRemoval: 'no',
  },
  {
    name: 'Tramadol',
    genericName: 'tramadol',
    category: 'opioid',
    normalDose: '50-100mg 6-hourly',
    renalAdjustments: {
      normal: { dose: '50-100mg 6-hourly' },
      mild: { dose: '50-100mg 6-hourly' },
      moderate: { dose: '50-100mg 12-hourly', warning: 'Reduce frequency', requiresMonitoring: true },
      severe: { dose: '50mg 12-hourly max', warning: 'Avoid sustained-release preparations', requiresMonitoring: true },
      dialysis: { dose: '50mg 12-hourly max', warning: 'Not effectively removed by dialysis' },
    },
    contraindications: {},
    dialysisRemoval: 'no',
  },
  {
    name: 'Fentanyl',
    genericName: 'fentanyl',
    category: 'opioid',
    normalDose: '25-50mcg IV/IM',
    renalAdjustments: {
      normal: { dose: '25-50mcg IV/IM' },
      mild: { dose: '25-50mcg IV/IM' },
      moderate: { dose: '25-50mcg IV/IM', warning: 'No major accumulation - preferred in CKD' },
      severe: { dose: '25-50mcg IV/IM', warning: 'Preferred opioid in severe CKD' },
      dialysis: { dose: '25-50mcg IV/IM', warning: 'Safe in dialysis - no active metabolites' },
    },
    contraindications: {},
    notes: 'Preferred opioid in renal impairment as no active metabolites.',
    dialysisRemoval: 'no',
  },
  
  // ====== ANTIDIABETICS ======
  {
    name: 'Metformin',
    genericName: 'metformin',
    category: 'antidiabetic',
    normalDose: '500-1000mg twice daily',
    renalAdjustments: {
      normal: { dose: '500-1000mg twice daily' },
      mild: { dose: '500-1000mg twice daily', warning: 'Monitor renal function 3-6 monthly' },
      moderate: { dose: '500mg twice daily max', warning: 'GFR 30-45: max 1g/day. Review need.', requiresMonitoring: true },
      severe: { dose: 'CONTRAINDICATED', warning: 'Risk of lactic acidosis', isContraindicated: true },
      dialysis: { dose: 'CONTRAINDICATED', isContraindicated: true },
    },
    contraindications: {
      absoluteGFRThreshold: 30,
      relativeGFRThreshold: 45,
      conditions: ['Lactic acidosis risk', 'Acute illness', 'Dehydration', 'IV contrast within 48h'],
    },
    monitoringRequired: ['Renal function every 3-6 months', 'B12 levels annually'],
    notes: 'Withhold 48h before and after IV contrast administration.',
    dialysisRemoval: 'yes',
  },
  {
    name: 'Gliclazide',
    genericName: 'gliclazide',
    category: 'antidiabetic',
    normalDose: '40-160mg twice daily',
    renalAdjustments: {
      normal: { dose: '40-160mg twice daily' },
      mild: { dose: '40-160mg twice daily' },
      moderate: { dose: '40-80mg twice daily', warning: 'Start low, increased hypoglycaemia risk', requiresMonitoring: true },
      severe: { dose: '40-80mg once daily', warning: 'Use with caution - hypoglycaemia risk', requiresMonitoring: true },
      dialysis: { dose: 'Avoid or use with extreme caution', warning: 'Prolonged hypoglycaemia risk' },
    },
    contraindications: {},
    monitoringRequired: ['Blood glucose', 'HbA1c'],
  },
  
  // ====== ANTICOAGULANTS ======
  {
    name: 'Enoxaparin',
    genericName: 'enoxaparin',
    category: 'anticoagulant',
    normalDose: '1mg/kg 12-hourly (treatment) or 40mg daily (prophylaxis)',
    renalAdjustments: {
      normal: { dose: '1mg/kg 12-hourly (treatment)' },
      mild: { dose: '1mg/kg 12-hourly' },
      moderate: { dose: '1mg/kg 12-hourly', warning: 'Consider anti-Xa monitoring', requiresMonitoring: true },
      severe: { dose: '1mg/kg once daily', warning: 'Reduce to once daily dosing. Monitor anti-Xa.', requiresMonitoring: true },
      dialysis: { dose: '0.5mg/kg once daily', warning: 'Significantly reduced dose. Monitor anti-Xa.', requiresMonitoring: true },
    },
    contraindications: {
      conditions: ['Active bleeding', 'Heparin-induced thrombocytopenia'],
    },
    monitoringRequired: ['Anti-Xa levels (peak 0.6-1.0 U/mL treatment)', 'Platelet count'],
    dialysisRemoval: 'no',
  },
  {
    name: 'Rivaroxaban',
    genericName: 'rivaroxaban',
    category: 'anticoagulant',
    normalDose: '20mg daily (AF) or 15mg 12-hourly then 20mg daily (DVT/PE)',
    renalAdjustments: {
      normal: { dose: '20mg daily' },
      mild: { dose: '20mg daily' },
      moderate: { dose: '15mg daily', warning: 'Reduce dose if GFR 15-50' },
      severe: { dose: 'AVOID', warning: 'Limited data in severe renal impairment', isContraindicated: true },
      dialysis: { dose: 'CONTRAINDICATED', isContraindicated: true },
    },
    contraindications: {
      absoluteGFRThreshold: 15,
    },
    dialysisRemoval: 'no',
  },
  
  // ====== CARDIAC ======
  {
    name: 'Digoxin',
    genericName: 'digoxin',
    category: 'cardiac',
    normalDose: '125-250mcg once daily',
    renalAdjustments: {
      normal: { dose: '125-250mcg once daily' },
      mild: { dose: '125-250mcg once daily' },
      moderate: { dose: '62.5-125mcg once daily', warning: 'Reduce dose', requiresMonitoring: true },
      severe: { dose: '62.5mcg once daily or alternate days', warning: 'High toxicity risk. Monitor levels.', requiresMonitoring: true },
      dialysis: { dose: '62.5mcg after dialysis 3x/week', warning: 'Not removed by dialysis', requiresMonitoring: true },
    },
    contraindications: {},
    monitoringRequired: ['Serum digoxin levels (1-2 ng/mL)', 'Potassium', 'Renal function'],
    notes: 'Toxicity risk increases with hypokalaemia.',
    dialysisRemoval: 'no',
  },
  {
    name: 'Atenolol',
    genericName: 'atenolol',
    category: 'cardiac',
    normalDose: '25-100mg once daily',
    renalAdjustments: {
      normal: { dose: '25-100mg once daily' },
      mild: { dose: '25-100mg once daily' },
      moderate: { dose: '25-50mg once daily', warning: 'Reduce dose' },
      severe: { dose: '25mg once daily or alternate days', warning: 'Accumulation occurs', requiresMonitoring: true },
      dialysis: { dose: '25-50mg after dialysis', warning: 'Dialysable - give post-HD' },
    },
    contraindications: {},
    dialysisRemoval: 'yes',
  },
  
  // ====== DIURETICS ======
  {
    name: 'Furosemide',
    genericName: 'furosemide',
    category: 'diuretic',
    normalDose: '40-80mg daily',
    renalAdjustments: {
      normal: { dose: '40-80mg daily' },
      mild: { dose: '40-80mg daily' },
      moderate: { dose: '80-120mg daily', warning: 'May need higher doses for effect' },
      severe: { dose: '120-250mg daily', warning: 'Higher doses often required. IV may be needed.', requiresMonitoring: true },
      dialysis: { dose: 'Usually ineffective', warning: 'Unlikely to produce diuresis in anuric patients' },
    },
    contraindications: {},
    monitoringRequired: ['Electrolytes', 'Renal function'],
    dialysisRemoval: 'no',
  },
  {
    name: 'Spironolactone',
    genericName: 'spironolactone',
    category: 'diuretic',
    normalDose: '25-100mg daily',
    renalAdjustments: {
      normal: { dose: '25-100mg daily' },
      mild: { dose: '25-50mg daily', warning: 'Monitor potassium' },
      moderate: { dose: '12.5-25mg daily', warning: 'High hyperkalaemia risk', requiresMonitoring: true },
      severe: { dose: 'AVOID', warning: 'Severe hyperkalaemia risk', isContraindicated: true },
      dialysis: { dose: 'AVOID', isContraindicated: true },
    },
    contraindications: {
      absoluteGFRThreshold: 30,
      conditions: ['Hyperkalaemia', 'Addison\'s disease'],
    },
    monitoringRequired: ['Potassium within 1 week of starting', 'Renal function'],
    dialysisRemoval: 'no',
  },
  
  // ====== ANTIEPILEPTICS ======
  {
    name: 'Gabapentin',
    genericName: 'gabapentin',
    category: 'antiepileptic',
    normalDose: '300mg 8-hourly (titrate up)',
    renalAdjustments: {
      normal: { dose: '300-600mg 8-hourly' },
      mild: { dose: '300-600mg 8-hourly' },
      moderate: { dose: '200-300mg 12-hourly', warning: 'Reduce dose and frequency' },
      severe: { dose: '100-300mg once daily', warning: 'Significant accumulation', requiresMonitoring: true },
      dialysis: { dose: '100-300mg after dialysis', warning: 'Removed by dialysis - supplement post-HD' },
    },
    contraindications: {},
    dialysisRemoval: 'yes',
  },
  {
    name: 'Pregabalin',
    genericName: 'pregabalin',
    category: 'antiepileptic',
    normalDose: '75-150mg 12-hourly',
    renalAdjustments: {
      normal: { dose: '75-150mg 12-hourly' },
      mild: { dose: '75-150mg 12-hourly' },
      moderate: { dose: '75mg 12-hourly max', warning: 'Reduce dose' },
      severe: { dose: '25-75mg once daily', warning: 'Significant dose reduction required', requiresMonitoring: true },
      dialysis: { dose: '25-75mg after dialysis', warning: 'Supplement after haemodialysis' },
    },
    contraindications: {},
    dialysisRemoval: 'yes',
  },
  
  // ====== ANTIEMETICS ======
  {
    name: 'Ondansetron',
    genericName: 'ondansetron',
    category: 'antiemetic',
    normalDose: '4-8mg 8-hourly PRN',
    renalAdjustments: {
      normal: { dose: '4-8mg 8-hourly PRN' },
      mild: { dose: '4-8mg 8-hourly PRN' },
      moderate: { dose: '4-8mg 8-hourly PRN' },
      severe: { dose: '4-8mg 8-hourly PRN', warning: 'No dose adjustment required' },
      dialysis: { dose: '4-8mg 8-hourly PRN', warning: 'No adjustment needed' },
    },
    contraindications: {},
    dialysisRemoval: 'no',
  },
  {
    name: 'Metoclopramide',
    genericName: 'metoclopramide',
    category: 'antiemetic',
    normalDose: '10mg 8-hourly',
    renalAdjustments: {
      normal: { dose: '10mg 8-hourly' },
      mild: { dose: '10mg 8-hourly' },
      moderate: { dose: '5-10mg 8-hourly', warning: 'Reduce dose' },
      severe: { dose: '5mg 8-12 hourly', warning: 'Reduce dose and frequency', requiresMonitoring: true },
      dialysis: { dose: '5mg 8-12 hourly', warning: 'Partially removed by dialysis' },
    },
    contraindications: {},
    notes: 'Max 5 days use due to extrapyramidal effects.',
    dialysisRemoval: 'partial',
  },
];

// ============================================================
// DOSING RECOMMENDATION FUNCTIONS
// ============================================================

/**
 * Find medication in database (case-insensitive, partial match)
 */
export function findMedication(searchTerm: string): MedicationDosingInfo | undefined {
  const term = searchTerm.toLowerCase().trim();
  return MEDICATIONS_DATABASE.find(med => 
    med.name.toLowerCase().includes(term) ||
    med.genericName.toLowerCase().includes(term)
  );
}

/**
 * Get all medications matching a search term
 */
export function searchMedications(searchTerm: string): MedicationDosingInfo[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];
  
  return MEDICATIONS_DATABASE.filter(med => 
    med.name.toLowerCase().includes(term) ||
    med.genericName.toLowerCase().includes(term) ||
    med.category.toLowerCase().includes(term)
  );
}

/**
 * Get dosing recommendation for a medication based on patient GFR
 */
export function getDosingRecommendation(
  medicationName: string,
  gfrInput: GFRCalculationInput
): DosingRecommendation | null {
  const medication = findMedication(medicationName);
  if (!medication) return null;
  
  const gfrResult = calculateGFR(gfrInput);
  const adjustment = medication.renalAdjustments[gfrResult.renalDosingCategory];
  
  const warnings: string[] = [];
  const alternatives: string[] = [];
  
  // Check contraindications
  if (medication.contraindications.absoluteGFRThreshold !== undefined &&
      gfrResult.gfrCKDEPI < medication.contraindications.absoluteGFRThreshold) {
    warnings.push(`Contraindicated at GFR <${medication.contraindications.absoluteGFRThreshold} mL/min`);
  }
  
  if (medication.contraindications.relativeGFRThreshold !== undefined &&
      gfrResult.gfrCKDEPI < medication.contraindications.relativeGFRThreshold) {
    warnings.push(`Use with caution at GFR <${medication.contraindications.relativeGFRThreshold} mL/min`);
  }
  
  // Add adjustment warning if present
  if (adjustment.warning) {
    warnings.push(adjustment.warning);
  }
  
  // Add general notes
  if (medication.notes) {
    warnings.push(medication.notes);
  }
  
  // Suggest alternatives for contraindicated medications
  if (adjustment.isContraindicated) {
    if (medication.category === 'nsaid') {
      alternatives.push('Paracetamol', 'Tramadol (with dose adjustment)');
    }
    if (medication.category === 'opioid' && medication.genericName === 'morphine') {
      alternatives.push('Fentanyl (preferred in renal impairment)', 'Hydromorphone');
    }
    if (medication.genericName === 'metformin') {
      alternatives.push('Insulin', 'Gliclazide (with caution)', 'DPP-4 inhibitors (sitagliptin - dose adjust)');
    }
  }
  
  // Determine adjustment reason
  let adjustmentReason = '';
  if (adjustment.isContraindicated) {
    adjustmentReason = `Contraindicated in ${gfrResult.stageDescription} renal function (CKD Stage ${gfrResult.ckdStage})`;
  } else if (adjustment.dose !== medication.normalDose) {
    adjustmentReason = `Dose adjusted for ${gfrResult.stageDescription} renal function (GFR ${gfrResult.gfrCKDEPI} mL/min/1.73m²)`;
  } else {
    adjustmentReason = 'No dose adjustment required for current renal function';
  }
  
  return {
    medication: medication.name,
    patientGFR: gfrResult.gfrCKDEPI,
    ckdStage: gfrResult.ckdStage,
    originalDose: medication.normalDose,
    recommendedDose: adjustment.dose,
    adjustmentReason,
    warnings,
    isContraindicated: adjustment.isContraindicated || false,
    requiresMonitoring: adjustment.requiresMonitoring || false,
    monitoringInstructions: medication.monitoringRequired,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

/**
 * Get all medication recommendations for a patient
 */
export function getAllDosingRecommendations(
  medications: string[],
  gfrInput: GFRCalculationInput
): DosingRecommendation[] {
  return medications
    .map(med => getDosingRecommendation(med, gfrInput))
    .filter((rec): rec is DosingRecommendation => rec !== null);
}

/**
 * Check if any prescribed medications have contraindications
 */
export function checkMedicationContraindications(
  medications: string[],
  gfrInput: GFRCalculationInput
): { 
  hasContraindications: boolean;
  contraindicated: DosingRecommendation[];
  needsAdjustment: DosingRecommendation[];
  safe: DosingRecommendation[];
} {
  const recommendations = getAllDosingRecommendations(medications, gfrInput);
  
  const contraindicated = recommendations.filter(r => r.isContraindicated);
  const needsAdjustment = recommendations.filter(r => !r.isContraindicated && r.recommendedDose !== r.originalDose);
  const safe = recommendations.filter(r => !r.isContraindicated && r.recommendedDose === r.originalDose);
  
  return {
    hasContraindications: contraindicated.length > 0,
    contraindicated,
    needsAdjustment,
    safe,
  };
}

/**
 * Get summary text for GFR-based prescribing
 */
export function getGFRPrescribingSummary(gfr: number): string {
  const { stage, description } = getCKDStage(gfr);
  const category = getRenalDosingCategory(gfr);
  
  const summaries: Record<RenalDosingCategory, string> = {
    normal: 'Normal renal function. Standard drug doses typically appropriate.',
    mild: 'Mild renal impairment. Most drugs can be used at normal doses. Monitor renal function periodically.',
    moderate: 'Moderate renal impairment. Many drugs require dose adjustment. Avoid NSAIDs. Use nephrotoxic drugs with caution.',
    severe: 'Severe renal impairment. Significant dose adjustments required for most renally-cleared drugs. Avoid nephrotoxic agents. Consider referral to nephrology.',
    dialysis: 'End-stage renal disease. Complex drug dosing - many drugs require post-dialysis dosing. Consult pharmacy/nephrology for all prescriptions.',
  };
  
  return `CKD Stage ${stage} (${description}, eGFR ${gfr} mL/min/1.73m²): ${summaries[category]}`;
}

export default {
  calculateGFR,
  calculateCKDEPI,
  calculateCockcroftGault,
  getCKDStage,
  getRenalDosingCategory,
  findMedication,
  searchMedications,
  getDosingRecommendation,
  getAllDosingRecommendations,
  checkMedicationContraindications,
  getGFRPrescribingSummary,
  MEDICATIONS_DATABASE,
};
