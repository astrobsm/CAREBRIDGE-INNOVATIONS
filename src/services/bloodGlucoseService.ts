/**
 * Blood Glucose Service
 * Handles unit conversions and interpretations for blood glucose levels
 * Supports mg/dL (US) and mmol/L (International/SI)
 */

// Conversion factor: 1 mmol/L = 18.0182 mg/dL
const GLUCOSE_CONVERSION_FACTOR = 18.0182;

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export interface GlucoseReading {
  value: number;
  unit: GlucoseUnit;
  timestamp?: Date;
  type: 'fasting' | 'random' | 'postprandial' | 'hba1c' | 'ogtt_fasting' | 'ogtt_2hr';
}

export interface GlucoseInterpretation {
  status: 'normal' | 'prediabetes' | 'diabetes' | 'hypoglycemia' | 'hyperglycemia' | 'unknown';
  label: string;
  color: string;
  recommendation: string;
  urgency: 'routine' | 'monitor' | 'urgent' | 'critical';
}

export interface PatientGlucoseContext {
  age: number;
  isPregnant: boolean;
  trimester?: 1 | 2 | 3;
  isDiabetic: boolean;
  isType1: boolean;
  isType2: boolean;
  isGestationalDiabetes: boolean;
}

// Unit conversion functions
export function convertGlucose(value: number, fromUnit: GlucoseUnit, toUnit: GlucoseUnit): number {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'mmol/L' && toUnit === 'mg/dL') {
    return Math.round(value * GLUCOSE_CONVERSION_FACTOR * 10) / 10;
  } else if (fromUnit === 'mg/dL' && toUnit === 'mmol/L') {
    return Math.round((value / GLUCOSE_CONVERSION_FACTOR) * 100) / 100;
  }
  
  return value;
}

export function normalizeToMgDL(value: number, unit: GlucoseUnit): number {
  return unit === 'mmol/L' ? convertGlucose(value, 'mmol/L', 'mg/dL') : value;
}

export function normalizeToMmolL(value: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? convertGlucose(value, 'mg/dL', 'mmol/L') : value;
}

// Reference ranges (in mg/dL for internal calculations)
const REFERENCE_RANGES = {
  adult: {
    fasting: { normal: { min: 70, max: 100 }, prediabetes: { min: 100, max: 125 }, diabetes: 126 },
    random: { normal: { min: 70, max: 140 }, prediabetes: { min: 140, max: 199 }, diabetes: 200 },
    postprandial: { normal: { min: 70, max: 140 }, prediabetes: { min: 140, max: 199 }, diabetes: 200 },
    hba1c: { normal: { min: 0, max: 5.6 }, prediabetes: { min: 5.7, max: 6.4 }, diabetes: 6.5 },
    ogtt_fasting: { normal: { min: 70, max: 100 }, prediabetes: { min: 100, max: 125 }, diabetes: 126 },
    ogtt_2hr: { normal: { min: 70, max: 140 }, prediabetes: { min: 140, max: 199 }, diabetes: 200 },
  },
  pediatric: {
    fasting: { normal: { min: 70, max: 100 }, prediabetes: { min: 100, max: 125 }, diabetes: 126 },
    random: { normal: { min: 70, max: 140 }, prediabetes: { min: 140, max: 199 }, diabetes: 200 },
    postprandial: { normal: { min: 70, max: 140 }, prediabetes: { min: 140, max: 180 }, diabetes: 180 },
    hba1c: { normal: { min: 0, max: 5.6 }, prediabetes: { min: 5.7, max: 6.4 }, diabetes: 6.5 },
    ogtt_fasting: { normal: { min: 70, max: 100 }, prediabetes: { min: 100, max: 125 }, diabetes: 126 },
    ogtt_2hr: { normal: { min: 70, max: 140 }, prediabetes: { min: 140, max: 199 }, diabetes: 200 },
  },
  // Tighter control for pregnancy - IADPSG criteria
  pregnancy: {
    trimester1: {
      fasting: { normal: { min: 70, max: 92 }, gestational: 92 },
      ogtt_1hr: { normal: { min: 70, max: 180 }, gestational: 180 },
      ogtt_2hr: { normal: { min: 70, max: 153 }, gestational: 153 },
    },
    trimester2: {
      fasting: { normal: { min: 70, max: 92 }, gestational: 92 },
      ogtt_1hr: { normal: { min: 70, max: 180 }, gestational: 180 },
      ogtt_2hr: { normal: { min: 70, max: 153 }, gestational: 153 },
    },
    trimester3: {
      fasting: { normal: { min: 70, max: 92 }, gestational: 92 },
      ogtt_1hr: { normal: { min: 70, max: 180 }, gestational: 180 },
      ogtt_2hr: { normal: { min: 70, max: 153 }, gestational: 153 },
    },
  },
  geriatric: {
    // Slightly relaxed targets for elderly (>65)
    fasting: { normal: { min: 80, max: 130 }, prediabetes: { min: 130, max: 150 }, diabetes: 150 },
    random: { normal: { min: 80, max: 180 }, prediabetes: { min: 180, max: 220 }, diabetes: 220 },
    postprandial: { normal: { min: 80, max: 180 }, prediabetes: { min: 180, max: 220 }, diabetes: 220 },
    hba1c: { normal: { min: 0, max: 7.0 }, prediabetes: { min: 7.0, max: 8.0 }, diabetes: 8.0 },
    ogtt_fasting: { normal: { min: 80, max: 130 }, prediabetes: { min: 130, max: 150 }, diabetes: 150 },
    ogtt_2hr: { normal: { min: 80, max: 180 }, prediabetes: { min: 180, max: 220 }, diabetes: 220 },
  },
};

// Hypoglycemia thresholds
const HYPOGLYCEMIA = {
  mild: { adult: 70, pediatric: 70, geriatric: 80 },
  moderate: { adult: 54, pediatric: 54, geriatric: 60 },
  severe: { adult: 40, pediatric: 40, geriatric: 50 },
};

export function interpretGlucose(
  reading: GlucoseReading,
  context: PatientGlucoseContext
): GlucoseInterpretation {
  // Normalize to mg/dL for interpretation
  const valueMgDL = normalizeToMgDL(reading.value, reading.unit);
  
  // Determine patient category
  const isPediatric = context.age < 18;
  const isGeriatric = context.age >= 65;
  
  // Check for hypoglycemia first (critical condition)
  const hypoThreshold = isPediatric ? HYPOGLYCEMIA.mild.pediatric : 
                        isGeriatric ? HYPOGLYCEMIA.mild.geriatric : 
                        HYPOGLYCEMIA.mild.adult;
  
  const severeHypoThreshold = isPediatric ? HYPOGLYCEMIA.severe.pediatric :
                              isGeriatric ? HYPOGLYCEMIA.severe.geriatric :
                              HYPOGLYCEMIA.severe.adult;
  
  if (valueMgDL < severeHypoThreshold) {
    return {
      status: 'hypoglycemia',
      label: 'Severe Hypoglycemia',
      color: 'red',
      recommendation: 'CRITICAL: Immediate treatment required. Administer 15-20g fast-acting glucose. If unconscious, consider glucagon or IV dextrose.',
      urgency: 'critical',
    };
  }
  
  if (valueMgDL < hypoThreshold) {
    return {
      status: 'hypoglycemia',
      label: 'Hypoglycemia',
      color: 'orange',
      recommendation: 'Administer 15g fast-acting carbohydrates. Recheck in 15 minutes. Review medications and meal timing.',
      urgency: 'urgent',
    };
  }
  
  // Pregnancy-specific interpretation
  if (context.isPregnant && context.trimester) {
    return interpretPregnancyGlucose(valueMgDL, reading.type, context.trimester);
  }
  
  // Get appropriate reference range
  const ranges = isPediatric ? REFERENCE_RANGES.pediatric :
                 isGeriatric ? REFERENCE_RANGES.geriatric :
                 REFERENCE_RANGES.adult;
  
  const typeRanges = ranges[reading.type as keyof typeof ranges];
  if (!typeRanges) {
    return {
      status: 'unknown',
      label: 'Unable to Interpret',
      color: 'gray',
      recommendation: 'Test type not recognized. Please consult clinical guidelines.',
      urgency: 'routine',
    };
  }
  
  // Interpret based on ranges
  if (reading.type === 'hba1c') {
    return interpretHbA1c(reading.value, typeRanges, isGeriatric);
  }
  
  if (valueMgDL >= (typeRanges as any).diabetes) {
    return {
      status: 'diabetes',
      label: 'Diabetic Range',
      color: 'red',
      recommendation: isGeriatric 
        ? 'Blood glucose elevated. Consider individualized treatment goals. Avoid aggressive treatment to prevent hypoglycemia.'
        : 'Blood glucose in diabetic range. Confirm with repeat testing. Consider referral to endocrinology.',
      urgency: 'monitor',
    };
  }
  
  if (valueMgDL >= (typeRanges as any).prediabetes.min) {
    return {
      status: 'prediabetes',
      label: 'Prediabetes Range',
      color: 'yellow',
      recommendation: 'Lifestyle modification recommended. Consider dietary counseling and increased physical activity. Retest in 3-6 months.',
      urgency: 'monitor',
    };
  }
  
  if (valueMgDL >= (typeRanges as any).normal.min && valueMgDL <= (typeRanges as any).normal.max) {
    return {
      status: 'normal',
      label: 'Normal',
      color: 'green',
      recommendation: 'Blood glucose within normal range. Continue current management.',
      urgency: 'routine',
    };
  }
  
  return {
    status: 'unknown',
    label: 'Abnormal',
    color: 'yellow',
    recommendation: 'Value outside expected range. Clinical correlation recommended.',
    urgency: 'monitor',
  };
}

function interpretPregnancyGlucose(
  valueMgDL: number,
  testType: string,
  trimester: 1 | 2 | 3
): GlucoseInterpretation {
  const trimesterKey = `trimester${trimester}` as keyof typeof REFERENCE_RANGES.pregnancy;
  const ranges = REFERENCE_RANGES.pregnancy[trimesterKey];
  
  // For fasting glucose in pregnancy
  if (testType === 'fasting' || testType === 'ogtt_fasting') {
    if (valueMgDL >= 92) {
      return {
        status: 'diabetes',
        label: 'Gestational Diabetes (Fasting)',
        color: 'red',
        recommendation: 'Fasting glucose ≥92 mg/dL meets IADPSG criteria for GDM. Initiate dietary intervention. Consider endocrinology referral.',
        urgency: 'urgent',
      };
    }
  }
  
  // For OGTT 1-hour
  if (testType === 'ogtt_1hr') {
    if (valueMgDL >= 180) {
      return {
        status: 'diabetes',
        label: 'Gestational Diabetes (1hr OGTT)',
        color: 'red',
        recommendation: '1-hour OGTT ≥180 mg/dL meets criteria for GDM. Initiate medical nutrition therapy.',
        urgency: 'urgent',
      };
    }
  }
  
  // For OGTT 2-hour
  if (testType === 'ogtt_2hr') {
    if (valueMgDL >= 153) {
      return {
        status: 'diabetes',
        label: 'Gestational Diabetes (2hr OGTT)',
        color: 'red',
        recommendation: '2-hour OGTT ≥153 mg/dL meets IADPSG criteria for GDM. Initiate treatment protocol.',
        urgency: 'urgent',
      };
    }
  }
  
  // Random glucose in pregnancy
  if (testType === 'random') {
    if (valueMgDL >= 200) {
      return {
        status: 'diabetes',
        label: 'Likely Gestational Diabetes',
        color: 'red',
        recommendation: 'Random glucose ≥200 mg/dL. Confirm with fasting glucose or OGTT. Consider urgent referral.',
        urgency: 'urgent',
      };
    }
    if (valueMgDL >= 140) {
      return {
        status: 'prediabetes',
        label: 'Elevated - Screen for GDM',
        color: 'yellow',
        recommendation: 'Random glucose elevated. Perform formal OGTT to screen for gestational diabetes.',
        urgency: 'monitor',
      };
    }
  }
  
  return {
    status: 'normal',
    label: 'Normal for Pregnancy',
    color: 'green',
    recommendation: 'Glucose within acceptable range for pregnancy. Continue routine monitoring.',
    urgency: 'routine',
  };
}

function interpretHbA1c(
  value: number,
  ranges: any,
  isGeriatric: boolean
): GlucoseInterpretation {
  if (value >= ranges.diabetes) {
    return {
      status: 'diabetes',
      label: 'Diabetic HbA1c',
      color: 'red',
      recommendation: isGeriatric
        ? `HbA1c ${value}% indicates diabetes. Target 7-8% may be appropriate for elderly. Individualize based on comorbidities.`
        : `HbA1c ${value}% indicates diabetes. Target <7% for most adults. Initiate or intensify treatment.`,
      urgency: 'monitor',
    };
  }
  
  if (value >= ranges.prediabetes.min) {
    return {
      status: 'prediabetes',
      label: 'Prediabetes',
      color: 'yellow',
      recommendation: `HbA1c ${value}% indicates prediabetes. Lifestyle intervention recommended. Consider metformin if high risk.`,
      urgency: 'monitor',
    };
  }
  
  return {
    status: 'normal',
    label: 'Normal HbA1c',
    color: 'green',
    recommendation: `HbA1c ${value}% is within normal range. Continue routine screening.`,
    urgency: 'routine',
  };
}

// Calculate estimated Average Glucose (eAG) from HbA1c
export function calculateEAG(hba1c: number, outputUnit: GlucoseUnit = 'mg/dL'): number {
  // eAG (mg/dL) = 28.7 × HbA1c − 46.7
  const eagMgDL = 28.7 * hba1c - 46.7;
  return outputUnit === 'mmol/L' ? normalizeToMmolL(eagMgDL, 'mg/dL') : Math.round(eagMgDL);
}

// Calculate HbA1c from average glucose
export function calculateHbA1cFromAG(averageGlucose: number, unit: GlucoseUnit = 'mg/dL'): number {
  const agMgDL = normalizeToMgDL(averageGlucose, unit);
  // HbA1c = (eAG + 46.7) / 28.7
  return Math.round(((agMgDL + 46.7) / 28.7) * 10) / 10;
}

// Format glucose value with unit
export function formatGlucose(value: number, unit: GlucoseUnit): string {
  if (unit === 'mmol/L') {
    return `${value.toFixed(1)} mmol/L`;
  }
  return `${Math.round(value)} mg/dL`;
}

// Get target ranges for diabetic patients
export interface DiabetesTargets {
  fastingMin: number;
  fastingMax: number;
  postprandialMax: number;
  hba1cTarget: number;
  unit: GlucoseUnit;
}

export function getDiabetesTargets(
  context: PatientGlucoseContext,
  unit: GlucoseUnit = 'mg/dL'
): DiabetesTargets {
  let targets: DiabetesTargets;
  
  if (context.isPregnant) {
    // Stricter targets for pregnancy
    targets = {
      fastingMin: 60,
      fastingMax: 95,
      postprandialMax: 140,
      hba1cTarget: 6.0,
      unit: 'mg/dL',
    };
  } else if (context.age >= 65) {
    // Relaxed targets for elderly
    targets = {
      fastingMin: 80,
      fastingMax: 130,
      postprandialMax: 180,
      hba1cTarget: 8.0,
      unit: 'mg/dL',
    };
  } else if (context.age < 18) {
    // Pediatric targets
    targets = {
      fastingMin: 70,
      fastingMax: 120,
      postprandialMax: 180,
      hba1cTarget: 7.5,
      unit: 'mg/dL',
    };
  } else {
    // Standard adult targets
    targets = {
      fastingMin: 70,
      fastingMax: 130,
      postprandialMax: 180,
      hba1cTarget: 7.0,
      unit: 'mg/dL',
    };
  }
  
  // Convert to requested unit
  if (unit === 'mmol/L') {
    return {
      fastingMin: normalizeToMmolL(targets.fastingMin, 'mg/dL'),
      fastingMax: normalizeToMmolL(targets.fastingMax, 'mg/dL'),
      postprandialMax: normalizeToMmolL(targets.postprandialMax, 'mg/dL'),
      hba1cTarget: targets.hba1cTarget,
      unit: 'mmol/L',
    };
  }
  
  return targets;
}

export default {
  convertGlucose,
  normalizeToMgDL,
  normalizeToMmolL,
  interpretGlucose,
  calculateEAG,
  calculateHbA1cFromAG,
  formatGlucose,
  getDiabetesTargets,
};
