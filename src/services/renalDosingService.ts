/**
 * Renal Dosing Service
 * 
 * Provides GFR-based medication dose adjustments following
 * BNF (British National Formulary) and WHO guidelines.
 * 
 * Designed for Nigerian clinical context with locally available medications.
 */

import type { CKDStage } from './gfrCalculationService';

export interface DrugRenalAdjustment {
  gfrThreshold: number; // Below this GFR, adjustment applies
  adjustedDose: string;
  adjustmentType: 'reduce_dose' | 'extend_interval' | 'reduce_both' | 'avoid' | 'contraindicated';
  notes?: string;
}

export interface DrugInformation {
  name: string;
  genericName: string;
  drugClass: string;
  standardDose: string;
  maxDose: string;
  routes: string[];
  frequency: string;
  
  // Renal considerations
  renalAdjustments: DrugRenalAdjustment[];
  isNephrotoxic: boolean;
  dialysisRemoval: 'yes' | 'no' | 'partial' | 'unknown';
  
  // Hepatic considerations
  hepaticAdjustment?: string;
  
  // Clinical guidance
  contraindications: string[];
  sideEffects: string[];
  interactions: string[];
  monitoring: string[];
  specialNotes: string[];
}

export interface RenalDosingResult {
  drug: string;
  patientGFR: number;
  ckdStage: CKDStage;
  originalDose: string;
  recommendedDose: string;
  adjustmentType: DrugRenalAdjustment['adjustmentType'];
  isAdjusted: boolean;
  isContraindicated: boolean;
  warnings: string[];
  monitoringRequired: string[];
  alternativeDrugs?: string[];
}

/**
 * Comprehensive drug database with renal adjustments
 * Based on BNF and Nigerian Essential Medicines List
 */
export const RENAL_DOSING_DATABASE: Record<string, DrugInformation> = {
  // ============================================
  // ANTIBIOTICS
  // ============================================
  metronidazole: {
    name: 'Metronidazole',
    genericName: 'Metronidazole',
    drugClass: 'Antibiotic (Nitroimidazole)',
    standardDose: '400-500mg TDS',
    maxDose: '4g/day',
    routes: ['PO', 'IV'],
    frequency: 'Every 8 hours',
    renalAdjustments: [
      { gfrThreshold: 10, adjustedDose: '50% dose or 12 hourly', adjustmentType: 'reduce_both', notes: 'Accumulation of metabolites' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    hepaticAdjustment: 'Reduce to 1/3 of normal in severe hepatic impairment',
    contraindications: ['Known hypersensitivity', 'First trimester pregnancy'],
    sideEffects: ['Metallic taste', 'Nausea', 'Peripheral neuropathy'],
    interactions: ['Alcohol', 'Warfarin', 'Phenytoin'],
    monitoring: ['LFTs if prolonged use'],
    specialNotes: ['Avoid alcohol during and 48h after treatment'],
  },
  
  ciprofloxacin: {
    name: 'Ciprofloxacin',
    genericName: 'Ciprofloxacin',
    drugClass: 'Antibiotic (Fluoroquinolone)',
    standardDose: '250-750mg BD',
    maxDose: '1.5g/day',
    routes: ['PO', 'IV'],
    frequency: 'Every 12 hours',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: '250-500mg every 12 hours', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 10, adjustedDose: '250-500mg every 18-24 hours', adjustmentType: 'extend_interval' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'partial',
    contraindications: ['Tendon disorders', 'Myasthenia gravis', 'Children'],
    sideEffects: ['Tendinitis', 'QT prolongation', 'Photosensitivity'],
    interactions: ['Theophylline', 'NSAIDs', 'Antacids', 'Warfarin'],
    monitoring: ['Tendon pain', 'QTc if at risk'],
    specialNotes: ['Take 2h before/after antacids'],
  },
  
  ceftriaxone: {
    name: 'Ceftriaxone',
    genericName: 'Ceftriaxone',
    drugClass: 'Antibiotic (3rd Gen Cephalosporin)',
    standardDose: '1-2g daily',
    maxDose: '4g/day',
    routes: ['IV', 'IM'],
    frequency: 'Once daily',
    renalAdjustments: [
      { gfrThreshold: 10, adjustedDose: 'Max 2g/day', adjustmentType: 'reduce_dose', notes: 'Avoid if combined severe renal + hepatic impairment' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'no',
    contraindications: ['Cephalosporin allergy', 'Neonates with hyperbilirubinaemia'],
    sideEffects: ['Diarrhoea', 'Rash', 'Biliary sludge', 'C. difficile'],
    interactions: ['Calcium-containing IV solutions in neonates', 'Warfarin'],
    monitoring: ['FBC', 'LFTs for prolonged use'],
    specialNotes: ['Good CSF penetration'],
  },
  
  gentamicin: {
    name: 'Gentamicin',
    genericName: 'Gentamicin',
    drugClass: 'Antibiotic (Aminoglycoside)',
    standardDose: '5-7mg/kg once daily',
    maxDose: '7mg/kg/day',
    routes: ['IV', 'IM'],
    frequency: 'Once daily',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: 'Normal dose, extend interval based on levels', adjustmentType: 'extend_interval' },
      { gfrThreshold: 40, adjustedDose: 'Every 24-36 hours, check levels', adjustmentType: 'extend_interval' },
      { gfrThreshold: 20, adjustedDose: 'Every 48 hours, check levels before each dose', adjustmentType: 'extend_interval' },
      { gfrThreshold: 10, adjustedDose: 'Avoid or every 48-72 hours with levels', adjustmentType: 'avoid' },
    ],
    isNephrotoxic: true,
    dialysisRemoval: 'yes',
    contraindications: ['Myasthenia gravis', 'Severe renal impairment'],
    sideEffects: ['Nephrotoxicity', 'Ototoxicity', 'Neuromuscular blockade'],
    interactions: ['Loop diuretics', 'Vancomycin', 'NSAIDs', 'Ciclosporin'],
    monitoring: ['Serum levels ESSENTIAL', 'Creatinine daily', 'Hearing'],
    specialNotes: ['ALWAYS check levels: Trough <1mg/L', 'Maximum 7 days'],
  },
  
  amoxicillin: {
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    drugClass: 'Antibiotic (Penicillin)',
    standardDose: '250-500mg TDS',
    maxDose: '3g/day',
    routes: ['PO'],
    frequency: 'Every 8 hours',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: '250-500mg every 8-12 hours', adjustmentType: 'extend_interval' },
      { gfrThreshold: 10, adjustedDose: '250-500mg every 12-24 hours', adjustmentType: 'extend_interval' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Penicillin allergy'],
    sideEffects: ['Diarrhoea', 'Rash', 'Nausea'],
    interactions: ['Warfarin', 'Methotrexate'],
    monitoring: ['Signs of allergy'],
    specialNotes: ['Can be taken with or without food'],
  },
  
  coamoxiclav: {
    name: 'Co-amoxiclav (Augmentin)',
    genericName: 'Amoxicillin/Clavulanic acid',
    drugClass: 'Antibiotic (Penicillin + BLI)',
    standardDose: '625mg TDS',
    maxDose: '1.2g TDS',
    routes: ['PO', 'IV'],
    frequency: 'Every 8 hours',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: '625mg BD or 375mg TDS', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 10, adjustedDose: '625mg daily or 375mg BD', adjustmentType: 'reduce_both' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Penicillin allergy', 'Previous hepatic dysfunction with amoxicillin'],
    sideEffects: ['Diarrhoea', 'Nausea', 'Hepatitis'],
    interactions: ['Warfarin', 'Methotrexate'],
    monitoring: ['LFTs in prolonged use'],
    specialNotes: ['Take with food to reduce GI effects'],
  },
  
  vancomycin: {
    name: 'Vancomycin',
    genericName: 'Vancomycin',
    drugClass: 'Antibiotic (Glycopeptide)',
    standardDose: '15-20mg/kg every 8-12 hours',
    maxDose: '2g/dose',
    routes: ['IV'],
    frequency: 'Every 8-12 hours',
    renalAdjustments: [
      { gfrThreshold: 50, adjustedDose: '15mg/kg every 12 hours, monitor levels', adjustmentType: 'extend_interval' },
      { gfrThreshold: 30, adjustedDose: '15mg/kg every 24 hours, monitor levels', adjustmentType: 'extend_interval' },
      { gfrThreshold: 20, adjustedDose: '15mg/kg every 48 hours, monitor levels closely', adjustmentType: 'extend_interval' },
      { gfrThreshold: 10, adjustedDose: 'Loading dose then level-guided dosing', adjustmentType: 'reduce_both' },
    ],
    isNephrotoxic: true,
    dialysisRemoval: 'no',
    contraindications: ['Known hypersensitivity'],
    sideEffects: ['Nephrotoxicity', 'Red man syndrome', 'Ototoxicity'],
    interactions: ['Aminoglycosides', 'Loop diuretics', 'NSAIDs'],
    monitoring: ['Trough levels ESSENTIAL', 'Creatinine', 'Hearing'],
    specialNotes: ['Target trough 10-20mg/L', 'Infuse over minimum 60 minutes'],
  },
  
  meropenem: {
    name: 'Meropenem',
    genericName: 'Meropenem',
    drugClass: 'Antibiotic (Carbapenem)',
    standardDose: '500mg-1g every 8 hours',
    maxDose: '6g/day',
    routes: ['IV'],
    frequency: 'Every 8 hours',
    renalAdjustments: [
      { gfrThreshold: 50, adjustedDose: 'Normal dose', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 26, adjustedDose: '500mg-1g every 12 hours', adjustmentType: 'extend_interval' },
      { gfrThreshold: 10, adjustedDose: '500mg-1g every 24 hours', adjustmentType: 'extend_interval' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Carbapenem/penicillin allergy'],
    sideEffects: ['Diarrhoea', 'Nausea', 'Seizures (rare)'],
    interactions: ['Valproic acid (reduces levels)'],
    monitoring: ['Signs of C. diff', 'Seizures if predisposed'],
    specialNotes: ['Reserve for serious infections'],
  },
  
  // ============================================
  // ANALGESICS
  // ============================================
  morphine: {
    name: 'Morphine',
    genericName: 'Morphine',
    drugClass: 'Opioid Analgesic',
    standardDose: '5-10mg every 4 hours',
    maxDose: 'Titrate to pain',
    routes: ['PO', 'IV', 'SC'],
    frequency: 'Every 4 hours PRN',
    renalAdjustments: [
      { gfrThreshold: 50, adjustedDose: 'Reduce dose by 25%, monitor for accumulation', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 30, adjustedDose: 'Reduce dose by 50%, extend interval', adjustmentType: 'reduce_both' },
      { gfrThreshold: 15, adjustedDose: 'AVOID - use fentanyl or hydromorphone instead', adjustmentType: 'avoid', notes: 'Active metabolite M6G accumulates' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'partial',
    contraindications: ['Respiratory depression', 'Acute asthma', 'Paralytic ileus'],
    sideEffects: ['Respiratory depression', 'Constipation', 'Nausea', 'Sedation'],
    interactions: ['Benzodiazepines', 'Alcohol', 'MAOIs'],
    monitoring: ['Respiratory rate', 'Sedation level', 'Pain score'],
    specialNotes: ['Active metabolite accumulates in renal failure - AVOID if GFR <15'],
  },
  
  tramadol: {
    name: 'Tramadol',
    genericName: 'Tramadol',
    drugClass: 'Opioid Analgesic',
    standardDose: '50-100mg every 4-6 hours',
    maxDose: '400mg/day',
    routes: ['PO', 'IV'],
    frequency: 'Every 4-6 hours',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: '50mg every 12 hours', adjustmentType: 'reduce_both' },
      { gfrThreshold: 10, adjustedDose: 'Avoid or max 100mg/day', adjustmentType: 'avoid' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'partial',
    contraindications: ['Epilepsy', 'MAOIs', 'Severe renal impairment'],
    sideEffects: ['Nausea', 'Dizziness', 'Seizures', 'Serotonin syndrome'],
    interactions: ['SSRIs', 'MAOIs', 'Carbamazepine'],
    monitoring: ['Seizure risk', 'Serotonin syndrome signs'],
    specialNotes: ['Lower seizure threshold'],
  },
  
  paracetamol: {
    name: 'Paracetamol',
    genericName: 'Acetaminophen',
    drugClass: 'Analgesic/Antipyretic',
    standardDose: '1g every 4-6 hours',
    maxDose: '4g/day',
    routes: ['PO', 'IV', 'PR'],
    frequency: 'Every 4-6 hours',
    renalAdjustments: [
      { gfrThreshold: 10, adjustedDose: 'Extend interval to every 6-8 hours', adjustmentType: 'extend_interval' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Severe hepatic impairment'],
    sideEffects: ['Rare in therapeutic doses', 'Hepatotoxicity in overdose'],
    interactions: ['Warfarin (high doses)'],
    monitoring: ['LFTs if prolonged high-dose use'],
    specialNotes: ['Safe in renal impairment at normal doses'],
  },
  
  // ============================================
  // NSAIDs
  // ============================================
  ibuprofen: {
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    drugClass: 'NSAID',
    standardDose: '400mg TDS',
    maxDose: '2.4g/day',
    routes: ['PO'],
    frequency: 'Every 6-8 hours',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: 'Use lowest effective dose, short duration', adjustmentType: 'reduce_dose', notes: 'Monitor renal function' },
      { gfrThreshold: 30, adjustedDose: 'AVOID if possible', adjustmentType: 'avoid', notes: 'High risk of AKI' },
      { gfrThreshold: 15, adjustedDose: 'CONTRAINDICATED', adjustmentType: 'contraindicated' },
    ],
    isNephrotoxic: true,
    dialysisRemoval: 'no',
    contraindications: ['Active GI bleeding', 'Severe renal impairment', 'Heart failure'],
    sideEffects: ['GI bleeding', 'AKI', 'Cardiovascular events'],
    interactions: ['ACE inhibitors', 'Warfarin', 'Lithium', 'Methotrexate'],
    monitoring: ['Renal function', 'GI symptoms', 'Blood pressure'],
    specialNotes: ['AVOID in CKD - causes further renal damage'],
  },
  
  diclofenac: {
    name: 'Diclofenac',
    genericName: 'Diclofenac',
    drugClass: 'NSAID',
    standardDose: '50mg TDS or 75mg BD',
    maxDose: '150mg/day',
    routes: ['PO', 'IM', 'PR'],
    frequency: 'Every 8-12 hours',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: 'Use lowest effective dose', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 30, adjustedDose: 'AVOID if possible', adjustmentType: 'avoid' },
      { gfrThreshold: 15, adjustedDose: 'CONTRAINDICATED', adjustmentType: 'contraindicated' },
    ],
    isNephrotoxic: true,
    dialysisRemoval: 'no',
    contraindications: ['Active GI bleeding', 'Severe renal impairment', 'Heart failure', 'Ischaemic heart disease'],
    sideEffects: ['GI bleeding', 'AKI', 'Cardiovascular events'],
    interactions: ['ACE inhibitors', 'Warfarin', 'Lithium'],
    monitoring: ['Renal function', 'Cardiovascular status'],
    specialNotes: ['Higher cardiovascular risk than other NSAIDs'],
  },
  
  // ============================================
  // DIABETES MEDICATIONS
  // ============================================
  metformin: {
    name: 'Metformin',
    genericName: 'Metformin',
    drugClass: 'Antidiabetic (Biguanide)',
    standardDose: '500-1000mg BD',
    maxDose: '3g/day',
    routes: ['PO'],
    frequency: 'Every 12 hours',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: 'Normal dose, monitor renal function', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 45, adjustedDose: 'Max 1000mg/day', adjustmentType: 'reduce_dose', notes: 'Review need for metformin' },
      { gfrThreshold: 30, adjustedDose: 'Max 500mg/day or AVOID', adjustmentType: 'reduce_dose', notes: 'Consider alternatives' },
      { gfrThreshold: 15, adjustedDose: 'CONTRAINDICATED', adjustmentType: 'contraindicated', notes: 'Lactic acidosis risk' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Severe renal impairment (GFR <30)', 'Lactic acidosis history', 'Severe infection'],
    sideEffects: ['GI upset', 'Lactic acidosis (rare)', 'B12 deficiency'],
    interactions: ['Contrast media', 'Alcohol'],
    monitoring: ['Renal function every 3-6 months', 'B12 levels annually'],
    specialNotes: ['STOP before iodinated contrast, resume 48h after if renal function stable'],
  },
  
  gliclazide: {
    name: 'Gliclazide',
    genericName: 'Gliclazide',
    drugClass: 'Antidiabetic (Sulfonylurea)',
    standardDose: '40-80mg daily (MR: 30-120mg)',
    maxDose: '320mg/day (MR: 120mg)',
    routes: ['PO'],
    frequency: 'Once or twice daily',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: 'Start with lowest dose, titrate carefully', adjustmentType: 'reduce_dose', notes: 'Increased hypoglycaemia risk' },
      { gfrThreshold: 15, adjustedDose: 'Use with extreme caution or avoid', adjustmentType: 'avoid', notes: 'High hypoglycaemia risk' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'no',
    contraindications: ['Type 1 diabetes', 'DKA'],
    sideEffects: ['Hypoglycaemia', 'Weight gain', 'GI upset'],
    interactions: ['Beta-blockers (mask hypoglycaemia)', 'Fluconazole'],
    monitoring: ['Blood glucose', 'HbA1c', 'Hypoglycaemia symptoms'],
    specialNotes: ['Shorter-acting SU, relatively safer in mild renal impairment'],
  },
  
  // ============================================
  // CARDIOVASCULAR
  // ============================================
  digoxin: {
    name: 'Digoxin',
    genericName: 'Digoxin',
    drugClass: 'Cardiac Glycoside',
    standardDose: '125-250mcg daily',
    maxDose: '250mcg/day',
    routes: ['PO', 'IV'],
    frequency: 'Once daily',
    renalAdjustments: [
      { gfrThreshold: 50, adjustedDose: '125mcg daily or alternate days', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 30, adjustedDose: '62.5-125mcg daily', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 15, adjustedDose: '62.5mcg daily or every 48 hours', adjustmentType: 'reduce_both', notes: 'Check levels frequently' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'no',
    contraindications: ['VT/VF', 'Accessory pathway', 'Hypertrophic cardiomyopathy'],
    sideEffects: ['Nausea', 'Visual disturbances', 'Arrhythmias'],
    interactions: ['Amiodarone', 'Verapamil', 'Spironolactone', 'Clarithromycin'],
    monitoring: ['Digoxin levels (target 0.5-1.0 ng/mL)', 'Potassium', 'Renal function'],
    specialNotes: ['Toxicity more common in renal impairment'],
  },
  
  enalapril: {
    name: 'Enalapril',
    genericName: 'Enalapril',
    drugClass: 'ACE Inhibitor',
    standardDose: '5-20mg daily',
    maxDose: '40mg/day',
    routes: ['PO'],
    frequency: 'Once or twice daily',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: 'Start with 2.5mg, titrate slowly', adjustmentType: 'reduce_dose', notes: 'Monitor creatinine and potassium' },
      { gfrThreshold: 10, adjustedDose: 'Use with extreme caution, low dose', adjustmentType: 'reduce_dose', notes: 'May worsen renal function' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Bilateral renal artery stenosis', 'Hyperkalaemia', 'Pregnancy'],
    sideEffects: ['Cough', 'Hyperkalaemia', 'AKI', 'Angioedema'],
    interactions: ['Potassium supplements', 'NSAIDs', 'Lithium'],
    monitoring: ['Creatinine', 'Potassium', 'Blood pressure'],
    specialNotes: ['Renoprotective in diabetic nephropathy, but monitor closely'],
  },
  
  furosemide: {
    name: 'Furosemide',
    genericName: 'Furosemide',
    drugClass: 'Loop Diuretic',
    standardDose: '20-80mg daily',
    maxDose: '600mg/day in severe oedema',
    routes: ['PO', 'IV'],
    frequency: 'Once or twice daily',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: 'Higher doses may be needed for effect', adjustmentType: 'reduce_dose', notes: 'Reduced efficacy' },
      { gfrThreshold: 15, adjustedDose: 'May need 80-200mg or more for effect', adjustmentType: 'reduce_dose', notes: 'Consult nephrology' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'no',
    contraindications: ['Anuria', 'Severe hyponatraemia', 'Hepatic encephalopathy'],
    sideEffects: ['Hyponatraemia', 'Hypokalaemia', 'Ototoxicity', 'Hyperuricaemia'],
    interactions: ['Aminoglycosides', 'Lithium', 'Digoxin'],
    monitoring: ['Electrolytes', 'Renal function', 'Fluid status'],
    specialNotes: ['Less effective in severe CKD, may need higher doses'],
  },
  
  enoxaparin: {
    name: 'Enoxaparin',
    genericName: 'Enoxaparin',
    drugClass: 'LMWH Anticoagulant',
    standardDose: '1mg/kg BD (treatment) or 40mg daily (prophylaxis)',
    maxDose: '1.5mg/kg/day',
    routes: ['SC'],
    frequency: 'Every 12 hours (treatment) or daily (prophylaxis)',
    renalAdjustments: [
      { gfrThreshold: 30, adjustedDose: 'Treatment: 1mg/kg ONCE daily. Prophylaxis: 20mg daily', adjustmentType: 'reduce_both', notes: 'Monitor anti-Xa levels' },
      { gfrThreshold: 15, adjustedDose: 'AVOID - use unfractionated heparin instead', adjustmentType: 'avoid', notes: 'High bleeding risk' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'no',
    contraindications: ['Active major bleeding', 'HIT', 'Severe renal impairment'],
    sideEffects: ['Bleeding', 'HIT', 'Injection site reactions'],
    interactions: ['NSAIDs', 'Antiplatelets', 'Warfarin'],
    monitoring: ['Anti-Xa levels in renal impairment', 'Platelet count', 'Signs of bleeding'],
    specialNotes: ['Accumulates in renal failure - use UFH if GFR <15'],
  },
  
  // ============================================
  // NEUROLOGICAL
  // ============================================
  gabapentin: {
    name: 'Gabapentin',
    genericName: 'Gabapentin',
    drugClass: 'Anticonvulsant/Neuropathic pain',
    standardDose: '300-600mg TDS',
    maxDose: '3600mg/day',
    routes: ['PO'],
    frequency: 'Every 8 hours',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: '300-900mg TDS', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 30, adjustedDose: '200-700mg BD', adjustmentType: 'reduce_both' },
      { gfrThreshold: 15, adjustedDose: '100-300mg daily', adjustmentType: 'reduce_both' },
      { gfrThreshold: 10, adjustedDose: '100-300mg every 48 hours', adjustmentType: 'reduce_both' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Known hypersensitivity'],
    sideEffects: ['Drowsiness', 'Dizziness', 'Peripheral oedema', 'Ataxia'],
    interactions: ['Opioids', 'Antacids (reduce absorption)'],
    monitoring: ['Sedation', 'Suicidal ideation'],
    specialNotes: ['Renally excreted - significant dose reduction needed in CKD'],
  },
  
  pregabalin: {
    name: 'Pregabalin',
    genericName: 'Pregabalin',
    drugClass: 'Anticonvulsant/Neuropathic pain',
    standardDose: '75-150mg BD',
    maxDose: '600mg/day',
    routes: ['PO'],
    frequency: 'Every 12 hours',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: '75-300mg BD', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 30, adjustedDose: '25-150mg BD or 50-300mg daily', adjustmentType: 'reduce_both' },
      { gfrThreshold: 15, adjustedDose: '25-75mg daily', adjustmentType: 'reduce_both' },
      { gfrThreshold: 10, adjustedDose: '25-75mg every 48 hours', adjustmentType: 'reduce_both' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Known hypersensitivity'],
    sideEffects: ['Drowsiness', 'Dizziness', 'Weight gain', 'Peripheral oedema'],
    interactions: ['Opioids', 'Alcohol'],
    monitoring: ['Sedation', 'Weight', 'Peripheral oedema'],
    specialNotes: ['Similar to gabapentin, requires renal dose adjustment'],
  },
  
  allopurinol: {
    name: 'Allopurinol',
    genericName: 'Allopurinol',
    drugClass: 'Xanthine Oxidase Inhibitor',
    standardDose: '100-300mg daily',
    maxDose: '900mg/day',
    routes: ['PO'],
    frequency: 'Once daily',
    renalAdjustments: [
      { gfrThreshold: 60, adjustedDose: 'Start 100mg, max 300mg daily', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 30, adjustedDose: 'Start 50mg, max 200mg daily', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 15, adjustedDose: 'Start 50mg, max 100mg daily', adjustmentType: 'reduce_dose' },
      { gfrThreshold: 10, adjustedDose: '50-100mg every 2-3 days', adjustmentType: 'reduce_both' },
    ],
    isNephrotoxic: false,
    dialysisRemoval: 'yes',
    contraindications: ['Acute gout attack (don\'t start during)'],
    sideEffects: ['Rash (can be severe)', 'GI upset', 'Stevens-Johnson syndrome'],
    interactions: ['Azathioprine', 'Mercaptopurine', 'Warfarin'],
    monitoring: ['Uric acid', 'LFTs', 'Rash'],
    specialNotes: ['Start low, go slow - especially in CKD'],
  },
};

/**
 * Get renal dosing recommendation for a drug
 */
export function getRenalDosingRecommendation(
  drugKey: string,
  gfr: number,
  _weight?: number // Reserved for weight-based dosing calculations
): RenalDosingResult | null {
  const drug = RENAL_DOSING_DATABASE[drugKey.toLowerCase().replace(/[\s-]/g, '')];
  
  if (!drug) {
    return null;
  }
  
  const ckdStage = getCKDStageFromGFR(gfr);
  let adjustmentApplied: DrugRenalAdjustment | null = null;
  
  // Find the applicable adjustment (first one where GFR is below threshold)
  for (const adjustment of drug.renalAdjustments) {
    if (gfr <= adjustment.gfrThreshold) {
      adjustmentApplied = adjustment;
      break;
    }
  }
  
  const isContraindicated = adjustmentApplied?.adjustmentType === 'contraindicated';
  const isAvoided = adjustmentApplied?.adjustmentType === 'avoid';
  
  const warnings: string[] = [];
  
  if (drug.isNephrotoxic) {
    warnings.push('⚠️ This medication is nephrotoxic - use with caution');
  }
  
  if (isContraindicated) {
    warnings.push('❌ CONTRAINDICATED at this GFR level');
  }
  
  if (isAvoided) {
    warnings.push('⚠️ AVOID if possible - consider alternatives');
  }
  
  if (adjustmentApplied?.notes) {
    warnings.push(adjustmentApplied.notes);
  }
  
  // Add general warnings based on CKD stage
  if (gfr < 30 && drug.isNephrotoxic) {
    warnings.push('Consider alternative non-nephrotoxic agents');
  }
  
  return {
    drug: drug.name,
    patientGFR: gfr,
    ckdStage,
    originalDose: drug.standardDose,
    recommendedDose: adjustmentApplied?.adjustedDose || drug.standardDose,
    adjustmentType: adjustmentApplied?.adjustmentType || 'reduce_dose',
    isAdjusted: !!adjustmentApplied,
    isContraindicated: isContraindicated || isAvoided,
    warnings,
    monitoringRequired: drug.monitoring,
    alternativeDrugs: isContraindicated || isAvoided ? getAlternativeDrugs(drugKey, drug.drugClass) : undefined,
  };
}

/**
 * Get CKD stage from GFR value
 */
function getCKDStageFromGFR(gfr: number): CKDStage {
  if (gfr >= 90) return 'G1';
  if (gfr >= 60) return 'G2';
  if (gfr >= 45) return 'G3a';
  if (gfr >= 30) return 'G3b';
  if (gfr >= 15) return 'G4';
  return 'G5';
}

/**
 * Get alternative drugs for a contraindicated medication
 */
function getAlternativeDrugs(drugKey: string, _drugClass?: string): string[] {
  // drugClass reserved for future class-based alternative suggestions
  const alternatives: Record<string, string[]> = {
    morphine: ['Fentanyl (no active renal metabolites)', 'Hydromorphone (less accumulation)', 'Oxycodone (use cautiously)'],
    tramadol: ['Paracetamol', 'Fentanyl patch'],
    metformin: ['Gliclazide (with caution)', 'Sitagliptin (dose-adjusted)', 'Insulin'],
    ibuprofen: ['Paracetamol', 'Topical NSAIDs (short-term)'],
    diclofenac: ['Paracetamol', 'Topical diclofenac (limited systemic absorption)'],
    enoxaparin: ['Unfractionated heparin (UFH)'],
    gentamicin: ['Consider alternative antibiotics based on culture'],
  };
  
  return alternatives[drugKey.toLowerCase()] || [];
}

/**
 * Batch check multiple medications for renal dosing
 */
export function batchCheckRenalDosing(
  medications: string[],
  gfr: number
): RenalDosingResult[] {
  return medications
    .map(med => getRenalDosingRecommendation(med, gfr))
    .filter((result): result is RenalDosingResult => result !== null);
}

/**
 * Get drugs that are contraindicated at a given GFR
 */
export function getContraindicatedDrugs(gfr: number): string[] {
  return Object.entries(RENAL_DOSING_DATABASE)
    .filter(([_, drug]) => {
      const lastAdjustment = drug.renalAdjustments[drug.renalAdjustments.length - 1];
      return lastAdjustment && 
        gfr <= lastAdjustment.gfrThreshold && 
        (lastAdjustment.adjustmentType === 'contraindicated' || lastAdjustment.adjustmentType === 'avoid');
    })
    .map(([_, drug]) => drug.name);
}

/**
 * Get drugs that are safe (no adjustment needed) at a given GFR
 */
export function getSafeDrugs(gfr: number): string[] {
  return Object.entries(RENAL_DOSING_DATABASE)
    .filter(([_, drug]) => {
      // Check if GFR is above all thresholds
      return drug.renalAdjustments.every(adj => gfr > adj.gfrThreshold);
    })
    .map(([_, drug]) => drug.name);
}

// Alias for backward compatibility
export const getDrugDosingRecommendation = getRenalDosingRecommendation;

export default {
  getRenalDosingRecommendation,
  getDrugDosingRecommendation,
  batchCheckRenalDosing,
  getContraindicatedDrugs,
  getSafeDrugs,
  RENAL_DOSING_DATABASE,
};
