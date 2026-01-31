/**
 * GFR Calculation Service
 * 
 * Provides comprehensive GFR (Glomerular Filtration Rate) calculation
 * using CKD-EPI 2021 (race-free) and Cockcroft-Gault equations.
 * 
 * Designed for Nigerian clinical context with WHO-adapted protocols.
 * 
 * Supports multiple units for creatinine and other parameters:
 * - Creatinine: mg/dL (US) or μmol/L (SI/International)
 * - Weight: kg or lb
 * - Height: cm or inches
 */

export type CKDStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';

// Unit types for various parameters
export type CreatinineUnit = 'mg/dL' | 'μmol/L' | 'umol/L' | 'µmol/L';
export type WeightUnit = 'kg' | 'lb' | 'lbs';
export type HeightUnit = 'cm' | 'in' | 'inches' | 'm' | 'ft';

// Unit conversion constants
export const UNIT_CONVERSIONS = {
  creatinine: {
    // μmol/L to mg/dL = divide by 88.4
    // mg/dL to μmol/L = multiply by 88.4
    umolL_to_mgdL: 1 / 88.4,
    mgdL_to_umolL: 88.4,
  },
  weight: {
    // lb to kg = multiply by 0.453592
    // kg to lb = multiply by 2.20462
    lb_to_kg: 0.453592,
    kg_to_lb: 2.20462,
  },
  height: {
    // inches to cm = multiply by 2.54
    // cm to inches = divide by 2.54
    // ft to cm = multiply by 30.48
    // m to cm = multiply by 100
    in_to_cm: 2.54,
    cm_to_in: 1 / 2.54,
    ft_to_cm: 30.48,
    m_to_cm: 100,
  },
} as const;

export interface GFRCalculationInput {
  creatinine: number;
  creatinineUnit?: CreatinineUnit; // Default: mg/dL
  age: number; // years
  gender: 'male' | 'female';
  weight?: number;
  weightUnit?: WeightUnit; // Default: kg
  height?: number;
  heightUnit?: HeightUnit; // Default: cm
}

export interface GFRResult {
  gfrCKDEPI: number;
  gfrCockcroftGault: number | null; // null if weight not provided
  ckdStage: CKDStage;
  stageDescription: string;
  recommendations: string[];
  drugDosingCategory: 'normal' | 'mild_reduction' | 'moderate_reduction' | 'severe_reduction' | 'avoid_nephrotoxic';
  drugDosingAdjustments: string[];
  referralCriteria: string[];
  // Normalized values used in calculation (for reference)
  normalizedCreatinine?: number; // Always in mg/dL
  normalizedWeight?: number; // Always in kg
}

export interface RenalDosingRecommendation {
  adjustedDose: string;
  adjustmentReason: string;
  isContraindicated: boolean;
  alternativeRecommendation?: string;
  monitoringRequired: string[];
}

/**
 * Calculate GFR using CKD-EPI 2021 (race-free) equation
 * Reference: Inker LA, et al. N Engl J Med 2021
 */
export function calculateCKDEPI(
  creatinine: number, // mg/dL
  age: number,
  gender: 'male' | 'female'
): number {
  const kappa = gender === 'female' ? 0.7 : 0.9;
  const alpha = gender === 'female' ? -0.241 : -0.302;
  const crKappa = creatinine / kappa;
  
  let gfr: number;
  
  if (gender === 'female') {
    if (creatinine <= 0.7) {
      gfr = 142 * Math.pow(crKappa, -0.241) * Math.pow(0.9938, age) * 1.012;
    } else {
      gfr = 142 * Math.pow(crKappa, -1.2) * Math.pow(0.9938, age) * 1.012;
    }
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
 * Calculate GFR using Cockcroft-Gault equation
 * Preferred for drug dosing in clinical practice
 */
export function calculateCockcroftGault(
  creatinine: number, // mg/dL
  age: number,
  gender: 'male' | 'female',
  weight: number // kg
): number {
  let gfr = ((140 - age) * weight) / (72 * creatinine);
  
  if (gender === 'female') {
    gfr *= 0.85;
  }
  
  return Math.round(gfr * 10) / 10; // Round to 1 decimal
}

/**
 * Convert creatinine from µmol/L to mg/dL
 */
export function convertCreatinineToMgDL(creatinineUmolL: number): number {
  return creatinineUmolL * UNIT_CONVERSIONS.creatinine.umolL_to_mgdL;
}

/**
 * Convert creatinine from mg/dL to µmol/L
 */
export function convertCreatinineToUmolL(creatinineMgDL: number): number {
  return creatinineMgDL * UNIT_CONVERSIONS.creatinine.mgdL_to_umolL;
}

/**
 * Convert weight to kg based on input unit
 */
export function convertWeightToKg(weight: number, unit: WeightUnit = 'kg'): number {
  switch (unit) {
    case 'lb':
    case 'lbs':
      return weight * UNIT_CONVERSIONS.weight.lb_to_kg;
    case 'kg':
    default:
      return weight;
  }
}

/**
 * Convert height to cm based on input unit
 */
export function convertHeightToCm(height: number, unit: HeightUnit = 'cm'): number {
  switch (unit) {
    case 'in':
    case 'inches':
      return height * UNIT_CONVERSIONS.height.in_to_cm;
    case 'ft':
      return height * UNIT_CONVERSIONS.height.ft_to_cm;
    case 'm':
      return height * UNIT_CONVERSIONS.height.m_to_cm;
    case 'cm':
    default:
      return height;
  }
}

/**
 * Normalize creatinine to mg/dL for calculations
 */
export function normalizeCreatinine(creatinine: number, unit: CreatinineUnit = 'mg/dL'): number {
  switch (unit) {
    case 'μmol/L':
    case 'umol/L':
    case 'µmol/L':
      return convertCreatinineToMgDL(creatinine);
    case 'mg/dL':
    default:
      return creatinine;
  }
}

/**
 * Get reference ranges for creatinine based on gender and unit
 */
export function getCreatinineReferenceRange(gender: 'male' | 'female', unit: CreatinineUnit = 'mg/dL'): { min: number; max: number; unit: string } {
  // Reference ranges in mg/dL
  const ranges = {
    male: { min: 0.7, max: 1.3 },
    female: { min: 0.6, max: 1.1 },
  };
  
  const range = ranges[gender];
  
  if (unit === 'mg/dL') {
    return { min: range.min, max: range.max, unit: 'mg/dL' };
  }
  
  // Convert to μmol/L
  return {
    min: Math.round(range.min * UNIT_CONVERSIONS.creatinine.mgdL_to_umolL),
    max: Math.round(range.max * UNIT_CONVERSIONS.creatinine.mgdL_to_umolL),
    unit: 'μmol/L',
  };
}

/**
 * Check if creatinine is within normal range
 */
export function isCreatinineNormal(creatinine: number, gender: 'male' | 'female', unit: CreatinineUnit = 'mg/dL'): boolean {
  const normalized = normalizeCreatinine(creatinine, unit);
  const range = getCreatinineReferenceRange(gender, 'mg/dL');
  return normalized >= range.min && normalized <= range.max;
}

/**
 * Get formatted creatinine value with unit
 */
export function formatCreatinineWithUnit(creatinine: number, unit: CreatinineUnit = 'mg/dL'): string {
  if (unit === 'mg/dL') {
    return `${creatinine.toFixed(2)} mg/dL`;
  }
  return `${Math.round(creatinine)} μmol/L`;
}

/**
 * Convert creatinine between units
 */
export function convertCreatinine(value: number, fromUnit: CreatinineUnit, toUnit: CreatinineUnit): number {
  if (fromUnit === toUnit) return value;
  
  // First normalize to mg/dL
  const mgdL = normalizeCreatinine(value, fromUnit);
  
  // Then convert to target unit
  if (toUnit === 'mg/dL') {
    return Math.round(mgdL * 100) / 100;
  }
  
  return Math.round(mgdL * UNIT_CONVERSIONS.creatinine.mgdL_to_umolL);
}

/**
 * Determine CKD Stage based on GFR value
 */
export function getCKDStage(gfr: number): CKDStage {
  if (gfr >= 90) return 'G1';
  if (gfr >= 60) return 'G2';
  if (gfr >= 45) return 'G3a';
  if (gfr >= 30) return 'G3b';
  if (gfr >= 15) return 'G4';
  return 'G5';
}

/**
 * Get CKD stage description
 */
export function getCKDStageDescription(stage: CKDStage): string {
  const descriptions: Record<CKDStage, string> = {
    'G1': 'Normal or high kidney function',
    'G2': 'Mildly decreased kidney function',
    'G3a': 'Mild to moderate decrease',
    'G3b': 'Moderate to severe decrease',
    'G4': 'Severe decrease - prepare for RRT',
    'G5': 'Kidney failure - RRT needed',
  };
  return descriptions[stage];
}

/**
 * Get drug dosing category based on GFR
 * Used for automatic dose adjustments
 */
export function getDrugDosingCategory(gfr: number): GFRResult['drugDosingCategory'] {
  if (gfr >= 60) return 'normal';
  if (gfr >= 45) return 'mild_reduction';
  if (gfr >= 30) return 'moderate_reduction';
  if (gfr >= 15) return 'severe_reduction';
  return 'avoid_nephrotoxic';
}

/**
 * Get general drug dosing adjustments based on GFR
 */
export function getGeneralDosingAdjustments(gfr: number): string[] {
  if (gfr >= 90) {
    return [
      'Most medications: No adjustment needed',
      'Metformin: Safe to use, monitor renal function',
    ];
  }
  
  if (gfr >= 60) {
    return [
      'Most medications: No adjustment needed',
      'Metformin: Monitor renal function regularly',
      'Avoid nephrotoxic combinations when possible',
    ];
  }
  
  if (gfr >= 45) {
    return [
      'Metformin: Reduce dose by 50%, max 1000mg/day',
      'Gabapentin/Pregabalin: Reduce dose',
      'Allopurinol: Start at lower dose',
      'Avoid NSAIDs',
      'ACE inhibitors/ARBs: Use with caution, monitor potassium',
    ];
  }
  
  if (gfr >= 30) {
    return [
      'Metformin: Generally avoid or use with extreme caution',
      'Many antibiotics: Reduce dose or frequency',
      'Digoxin: Reduce dose by 25-50%',
      'Opioids: Use with caution, prefer fentanyl over morphine',
      'Enoxaparin: Reduce to once daily dosing',
      'Avoid gadolinium contrast (NSF risk)',
      'Avoid NSAIDs',
    ];
  }
  
  if (gfr >= 15) {
    return [
      'Metformin: CONTRAINDICATED',
      'Most renally-cleared drugs: Significant dose reduction',
      'Avoid NSAIDs, aminoglycosides',
      'Morphine: Avoid (active metabolites accumulate)',
      'Enoxaparin: Avoid or reduce dose significantly',
      'ACE inhibitors/ARBs: Monitor closely, may need to stop',
      'Potassium-sparing diuretics: Avoid',
    ];
  }
  
  return [
    'All renally-cleared medications: Major adjustments or avoid',
    'Many drugs removed by dialysis - time doses appropriately',
    'Consult pharmacy/nephrology for all new medications',
    'AVOID: NSAIDs, aminoglycosides, contrast agents',
    'Metformin, morphine, enoxaparin: CONTRAINDICATED',
  ];
}

/**
 * Get clinical recommendations based on GFR
 */
export function getClinicalRecommendations(gfr: number): string[] {
  const ckdStage = getCKDStage(gfr);
  
  const recommendations: Record<CKDStage, string[]> = {
    'G1': [
      'No specific kidney-related restrictions',
      'Manage cardiovascular risk factors',
      'Annual monitoring if diabetes or hypertension present',
      'Maintain healthy lifestyle',
    ],
    'G2': [
      'Control blood pressure (target <130/80 mmHg)',
      'Optimize diabetes control if applicable',
      'Annual GFR and urine albumin monitoring',
      'ACE inhibitor or ARB if proteinuria present',
      'Avoid nephrotoxins (NSAIDs, contrast, aminoglycosides)',
    ],
    'G3a': [
      'Refer to nephrologist for co-management',
      'Blood pressure control (target <130/80)',
      'Monitor electrolytes every 6 months',
      'Check PTH, calcium, phosphorus, vitamin D',
      'Dietary protein: 0.8 g/kg/day',
      'Avoid nephrotoxic medications',
    ],
    'G3b': [
      'Nephrology referral essential',
      'Strict blood pressure control',
      'Monitor for anemia (check Hb, iron studies)',
      'Consider erythropoietin if Hb <10 g/dL',
      'Dietary phosphorus restriction',
      'Vitamin D supplementation if deficient',
      'Prepare for possible RRT in future',
    ],
    'G4': [
      'Urgent nephrology referral if not already followed',
      'Discuss renal replacement therapy options',
      'Consider AV fistula creation if dialysis likely',
      'Transplant workup if appropriate candidate',
      'Strict fluid and electrolyte management',
      'Phosphate binders may be needed',
      'Erythropoietin therapy for anemia',
    ],
    'G5': [
      '⚠️ KIDNEY FAILURE - Renal replacement therapy needed',
      'Immediate nephrology consultation if new diagnosis',
      'Dialysis initiation based on symptoms',
      'Continue transplant workup if appropriate',
      'Strict dietary restrictions (K+, phosphorus, fluid)',
      'Palliative care discussion if RRT not appropriate',
    ],
  };
  
  return recommendations[ckdStage];
}

/**
 * Get referral criteria based on GFR
 */
export function getReferralCriteria(gfr: number): string[] {
  if (gfr >= 60) return [];
  if (gfr >= 45) return ['GFR <60 with progressive decline - consider nephrology referral'];
  if (gfr >= 30) return ['GFR <45 - Nephrology referral recommended'];
  if (gfr >= 15) return ['GFR <30 - Nephrology care essential', 'Prepare for dialysis or transplant'];
  return ['GFR <15 - Dialysis evaluation required', 'Consider transplant referral'];
}

/**
 * Calculate comprehensive GFR result with all clinical recommendations
 * Automatically handles unit conversions for all input parameters
 */
export function calculateGFR(input: GFRCalculationInput): GFRResult {
  // Normalize creatinine to mg/dL
  const creatinineMgDL = normalizeCreatinine(input.creatinine, input.creatinineUnit || 'mg/dL');
  
  // Normalize weight to kg if provided
  const weightKg = input.weight 
    ? convertWeightToKg(input.weight, input.weightUnit || 'kg')
    : undefined;
  
  // Calculate GFR using normalized values
  const gfrCKDEPI = calculateCKDEPI(creatinineMgDL, input.age, input.gender);
  
  const gfrCockcroftGault = weightKg 
    ? calculateCockcroftGault(creatinineMgDL, input.age, input.gender, weightKg)
    : null;
  
  const ckdStage = getCKDStage(gfrCKDEPI);
  const stageDescription = getCKDStageDescription(ckdStage);
  const recommendations = getClinicalRecommendations(gfrCKDEPI);
  const drugDosingCategory = getDrugDosingCategory(gfrCKDEPI);
  const drugDosingAdjustments = getGeneralDosingAdjustments(gfrCKDEPI);
  const referralCriteria = getReferralCriteria(gfrCKDEPI);
  
  return {
    gfrCKDEPI,
    gfrCockcroftGault,
    ckdStage,
    stageDescription,
    recommendations,
    drugDosingCategory,
    drugDosingAdjustments,
    referralCriteria,
    // Include the normalized values used for calculation
    normalizedCreatinine: creatinineMgDL,
    normalizedWeight: weightKg,
  };
}

/**
 * Get the effective GFR for drug dosing
 * Uses Cockcroft-Gault if available (preferred for drug dosing),
 * otherwise falls back to CKD-EPI
 */
export function getGFRForDrugDosing(result: GFRResult): number {
  return result.gfrCockcroftGault ?? result.gfrCKDEPI;
}

/**
 * Check if a patient's GFR requires dose adjustment for a specific threshold
 */
export function requiresDoseAdjustment(gfr: number, threshold: number): boolean {
  return gfr < threshold;
}

/**
 * Get color coding for GFR display (for UI)
 */
export function getGFRColorClass(gfr: number): string {
  if (gfr >= 90) return 'text-green-600 bg-green-50';
  if (gfr >= 60) return 'text-green-500 bg-green-50';
  if (gfr >= 45) return 'text-yellow-600 bg-yellow-50';
  if (gfr >= 30) return 'text-orange-600 bg-orange-50';
  if (gfr >= 15) return 'text-red-600 bg-red-50';
  return 'text-red-700 bg-red-100';
}

/**
 * Get CKD stage color for badges
 */
export function getCKDStageBadgeClass(stage: CKDStage): string {
  const classes: Record<CKDStage, string> = {
    'G1': 'bg-green-100 text-green-800',
    'G2': 'bg-green-50 text-green-700',
    'G3a': 'bg-yellow-100 text-yellow-800',
    'G3b': 'bg-orange-100 text-orange-800',
    'G4': 'bg-red-100 text-red-700',
    'G5': 'bg-red-200 text-red-800',
  };
  return classes[stage];
}

/**
 * Get GFR for a patient by fetching their latest lab results
 * Requires database access to retrieve patient data and lab results
 */
export async function getGFRForPatient(patientId: string): Promise<GFRResult | null> {
  try {
    // Dynamic import to avoid circular dependencies
    const { db } = await import('../database');
    
    // Get the patient
    const patient = await db.patients.get(patientId);
    if (!patient) {
      console.warn(`Patient ${patientId} not found`);
      return null;
    }
    
    // Calculate age from DOB
    if (!patient.dateOfBirth) {
      console.warn('Patient date of birth not available');
      return null;
    }
    
    const birthDate = new Date(patient.dateOfBirth);
    const today = new Date();
    const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Get latest lab results with creatinine
    const labResults = await db.labResults
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('collectedAt');
    
    // Find the most recent creatinine result
    let creatinine: number | null = null;
    let creatinineUnit: CreatinineUnit = 'mg/dL';
    
    for (const lab of labResults) {
      // Check if this lab has creatinine results
      if (lab.results) {
        const results = typeof lab.results === 'string' ? JSON.parse(lab.results) : lab.results;
        
        // Look for creatinine in various formats
        if (results.creatinine !== undefined) {
          creatinine = typeof results.creatinine === 'number' 
            ? results.creatinine 
            : parseFloat(results.creatinine);
          break;
        }
        
        // Check for individual result items
        if (Array.isArray(results)) {
          const creatResult = results.find((r: any) => 
            r.name?.toLowerCase().includes('creatinine') || 
            r.test?.toLowerCase().includes('creatinine')
          );
          if (creatResult?.value) {
            creatinine = parseFloat(creatResult.value);
            if (creatResult.unit?.toLowerCase().includes('umol') || creatResult.unit?.toLowerCase().includes('μmol')) {
              creatinineUnit = 'μmol/L';
            }
            break;
          }
        }
      }
    }
    
    // If no lab results, try to get from vital signs or other sources
    if (creatinine === null) {
      const vitals = await db.vitalSigns
        .where('patientId')
        .equals(patientId)
        .reverse()
        .limit(10)
        .toArray();
      
      for (const vital of vitals) {
        if ((vital as any).creatinine !== undefined) {
          creatinine = parseFloat((vital as any).creatinine);
          break;
        }
      }
    }
    
    // Still no creatinine, return null
    if (creatinine === null) {
      return null;
    }
    
    // Calculate GFR
    const gfrResult = calculateGFR({
      creatinine,
      creatinineUnit,
      age,
      gender: patient.gender as 'male' | 'female',
      weight: patient.weight,
      height: patient.height,
    });
    
    return gfrResult;
  } catch (error) {
    console.error('Error calculating GFR for patient:', error);
    return null;
  }
}

export default {
  // Core calculation functions
  calculateGFR,
  calculateCKDEPI,
  calculateCockcroftGault,
  
  // Unit conversion functions
  convertCreatinineToMgDL,
  convertCreatinineToUmolL,
  convertCreatinine,
  convertWeightToKg,
  convertHeightToCm,
  normalizeCreatinine,
  
  // Reference range functions
  getCreatinineReferenceRange,
  isCreatinineNormal,
  formatCreatinineWithUnit,
  
  // CKD staging functions
  getCKDStage,
  getCKDStageDescription,
  getDrugDosingCategory,
  getGeneralDosingAdjustments,
  getClinicalRecommendations,
  getReferralCriteria,
  
  // Drug dosing helpers
  getGFRForDrugDosing,
  requiresDoseAdjustment,
  
  // Patient GFR lookup
  getGFRForPatient,
  
  // UI helpers
  getGFRColorClass,
  getCKDStageBadgeClass,
  
  // Constants
  UNIT_CONVERSIONS,
};
