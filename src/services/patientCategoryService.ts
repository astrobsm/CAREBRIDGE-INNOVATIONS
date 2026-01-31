/**
 * Patient Category Service
 * Handles age-based patient categorization (Pediatric, Adult, Geriatric)
 * and pregnancy status for dynamic form rendering and clinical decision support
 */

import { differenceInYears, differenceInMonths, differenceInDays } from 'date-fns';

// Age category definitions per WHO guidelines
export type AgeCategory = 'neonate' | 'infant' | 'toddler' | 'preschool' | 'school_age' | 'adolescent' | 'adult' | 'geriatric';
export type BroadCategory = 'pediatric' | 'adult' | 'geriatric';
export type PregnancyTrimester = 1 | 2 | 3;

export interface PatientAge {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalDays: number;
}

export interface PatientCategory {
  ageCategory: AgeCategory;
  broadCategory: BroadCategory;
  isPediatric: boolean;
  isGeriatric: boolean;
  isAdult: boolean;
  isNeonate: boolean;
  isInfant: boolean;
  ageInYears: number;
  ageDetails: PatientAge;
  displayAge: string;
  clinicalConsiderations: string[];
  contraindications: string[];
  requiredAssessments: string[];
  optionalAssessments: string[];
  excludedAssessments: string[];
}

export interface PregnancyStatus {
  isPregnant: boolean;
  trimester?: PregnancyTrimester;
  gestationalWeeks?: number;
  edd?: Date; // Expected delivery date
  lmp?: Date; // Last menstrual period
  clinicalConsiderations: string[];
  contraindications: string[];
  requiredAssessments: string[];
  excludedAssessments: string[];
  medicationCategories: PregnancyMedicationCategory[];
}

export type PregnancyMedicationCategory = 'A' | 'B' | 'C' | 'D' | 'X';

export interface PatientContext {
  category: PatientCategory;
  pregnancy?: PregnancyStatus;
  weight?: number;
  height?: number;
  bsa?: number; // Body Surface Area
  ibw?: number; // Ideal Body Weight
  adjustedWeight?: number;
}

// WHO Age Category Definitions (reference values - used for documentation)
/* eslint-disable @typescript-eslint/no-unused-vars */
const _AGE_BOUNDARIES = {
  neonate: { minDays: 0, maxDays: 28 },
  infant: { minMonths: 1, maxMonths: 12 },
  toddler: { minYears: 1, maxYears: 3 },
  preschool: { minYears: 3, maxYears: 6 },
  school_age: { minYears: 6, maxYears: 12 },
  adolescent: { minYears: 12, maxYears: 18 },
  adult: { minYears: 18, maxYears: 65 },
  geriatric: { minYears: 65, maxYears: 150 },
};
/* eslint-enable @typescript-eslint/no-unused-vars */
void _AGE_BOUNDARIES; // Suppress unused variable warning - kept for documentation

/**
 * Calculate detailed patient age
 */
export function calculatePatientAge(dateOfBirth: Date | string): PatientAge {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const now = new Date();
  
  const years = differenceInYears(now, dob);
  const totalMonths = differenceInMonths(now, dob);
  const totalDays = differenceInDays(now, dob);
  
  // Calculate remaining months after years
  const monthsAfterBirthday = totalMonths % 12;
  
  // Calculate remaining days after months
  const lastMonthDate = new Date(dob);
  lastMonthDate.setFullYear(now.getFullYear());
  lastMonthDate.setMonth(now.getMonth());
  if (lastMonthDate > now) {
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  }
  const daysAfterMonth = differenceInDays(now, lastMonthDate);
  
  return {
    years,
    months: monthsAfterBirthday,
    days: daysAfterMonth,
    totalMonths,
    totalDays,
  };
}

/**
 * Format age for display
 */
export function formatPatientAge(age: PatientAge): string {
  if (age.totalDays <= 28) {
    return `${age.totalDays} day${age.totalDays !== 1 ? 's' : ''} old`;
  } else if (age.totalMonths < 24) {
    return `${age.totalMonths} month${age.totalMonths !== 1 ? 's' : ''} old`;
  } else if (age.years < 18) {
    return `${age.years} year${age.years !== 1 ? 's' : ''} ${age.months > 0 ? `${age.months} month${age.months !== 1 ? 's' : ''}` : ''} old`;
  } else {
    return `${age.years} year${age.years !== 1 ? 's' : ''} old`;
  }
}

/**
 * Determine detailed age category
 */
export function getAgeCategory(age: PatientAge): AgeCategory {
  if (age.totalDays <= 28) return 'neonate';
  if (age.totalMonths < 12) return 'infant';
  if (age.years < 3) return 'toddler';
  if (age.years < 6) return 'preschool';
  if (age.years < 12) return 'school_age';
  if (age.years < 18) return 'adolescent';
  if (age.years < 65) return 'adult';
  return 'geriatric';
}

/**
 * Determine broad category
 */
export function getBroadCategory(ageCategory: AgeCategory): BroadCategory {
  if (['neonate', 'infant', 'toddler', 'preschool', 'school_age', 'adolescent'].includes(ageCategory)) {
    return 'pediatric';
  }
  if (ageCategory === 'geriatric') return 'geriatric';
  return 'adult';
}

/**
 * Get clinical considerations based on age category
 */
function getClinicalConsiderations(category: AgeCategory): string[] {
  const considerations: Record<AgeCategory, string[]> = {
    neonate: [
      'Immature hepatic and renal function - adjust drug doses',
      'Higher body water content - affects drug distribution',
      'Immature blood-brain barrier',
      'Temperature regulation challenges',
      'Weight-based dosing essential (mg/kg)',
      'Consider gestational age for medication dosing',
      'Avoid preservatives (benzyl alcohol) in medications',
    ],
    infant: [
      'Rapid growth phase - regular weight checks for dosing',
      'Developing hepatic metabolism',
      'Incomplete renal function maturation',
      'Higher metabolic rate',
      'Weight-based dosing essential (mg/kg)',
      'Consider developmental milestones',
    ],
    toddler: [
      'Weight-based dosing still essential',
      'Consider liquid formulations for administration',
      'High activity level affects drug metabolism',
      'Immunization schedule considerations',
    ],
    preschool: [
      'Weight-based dosing preferred',
      'May tolerate crushed tablets or chewables',
      'School readiness assessments',
    ],
    school_age: [
      'Transition to adult-like metabolism beginning',
      'Weight-based dosing for most medications',
      'Consider psychological development',
      'Growth spurts may affect drug requirements',
    ],
    adolescent: [
      'Approaching adult metabolism',
      'Consider body surface area dosing',
      'Puberty stage affects some medications',
      'Screen for substance use if appropriate',
      'Mental health screening recommended',
      'Reproductive health considerations',
    ],
    adult: [
      'Standard adult dosing applies',
      'Consider renal and hepatic function',
      'Comorbidity assessment important',
      'Lifestyle factors (smoking, alcohol) affect metabolism',
    ],
    geriatric: [
      'Reduced renal clearance - always calculate GFR',
      'Reduced hepatic metabolism',
      'Increased sensitivity to CNS medications',
      'Polypharmacy risk - check interactions',
      'Fall risk assessment essential',
      'Cognitive assessment recommended',
      'Consider frailty status',
      'Lower starting doses recommended',
      'Monitor for orthostatic hypotension',
      'Dehydration risk higher',
    ],
  };
  
  return considerations[category] || [];
}

/**
 * Get medication contraindications based on age
 */
function getAgeContraindications(category: AgeCategory): string[] {
  const contraindications: Record<AgeCategory, string[]> = {
    neonate: [
      'Avoid tetracyclines - dental staining',
      'Avoid fluoroquinolones - cartilage damage',
      'Aspirin contraindicated - Reye syndrome risk',
      'Codeine contraindicated',
      'Avoid honey-based preparations - botulism risk',
      'Benzyl alcohol-containing products contraindicated',
    ],
    infant: [
      'Avoid tetracyclines',
      'Avoid fluoroquinolones',
      'Aspirin contraindicated - Reye syndrome',
      'Codeine contraindicated under 12',
      'Avoid honey under 1 year',
    ],
    toddler: [
      'Avoid tetracyclines until 8 years',
      'Avoid fluoroquinolones',
      'Aspirin contraindicated - Reye syndrome',
      'Codeine contraindicated under 12',
    ],
    preschool: [
      'Avoid tetracyclines until 8 years',
      'Fluoroquinolones - use only if no alternative',
      'Aspirin - avoid in viral illness',
      'Codeine contraindicated under 12',
    ],
    school_age: [
      'Tetracyclines - avoid until 8 years',
      'Fluoroquinolones - caution',
      'Aspirin - avoid in viral illness',
      'Codeine contraindicated under 12',
    ],
    adolescent: [
      'Isotretinoin - pregnancy prevention essential',
      'Consider teratogenic medications in females',
    ],
    adult: [
      'Standard contraindication checking',
    ],
    geriatric: [
      'Avoid long-acting benzodiazepines',
      'Avoid anticholinergics when possible (Beers criteria)',
      'NSAIDs - use with caution (GI, renal, CV risk)',
      'Avoid muscle relaxants',
      'Avoid first-generation antihistamines',
      'Meperidine contraindicated',
      'Avoid sliding-scale insulin as sole therapy',
    ],
  };
  
  return contraindications[category] || [];
}

/**
 * Get required assessments based on age category
 */
function getRequiredAssessments(category: AgeCategory): string[] {
  const assessments: Record<AgeCategory, string[]> = {
    neonate: [
      'Gestational age assessment',
      'Birth weight and current weight',
      'APGAR score (if applicable)',
      'Neonatal reflexes',
      'Fontanelle assessment',
      'Jaundice assessment',
      'Feeding assessment',
      'Temperature stability',
      'Umbilical cord assessment',
    ],
    infant: [
      'Weight and length/height',
      'Head circumference',
      'Developmental milestones (Denver II)',
      'Fontanelle status',
      'Feeding and nutrition assessment',
      'Immunization status',
      'Vision and hearing screening',
    ],
    toddler: [
      'Weight and height',
      'Developmental milestones',
      'Language development',
      'Immunization status',
      'Nutritional assessment',
      'Dental assessment',
    ],
    preschool: [
      'Growth parameters',
      'Developmental screening',
      'Vision screening',
      'Hearing screening',
      'Immunization status',
      'School readiness assessment',
    ],
    school_age: [
      'Growth parameters',
      'BMI calculation',
      'Vision screening',
      'Blood pressure measurement',
      'Scoliosis screening',
      'Immunization status',
    ],
    adolescent: [
      'Height, weight, BMI',
      'Tanner staging (if relevant)',
      'Blood pressure',
      'Mental health screening (PHQ-A)',
      'Substance use screening (if appropriate)',
      'Sexual health assessment (if appropriate)',
      'Immunization status',
    ],
    adult: [
      'Height, weight, BMI',
      'Vital signs',
      'Cardiovascular risk assessment',
      'GFR calculation',
      'Hepatic function assessment',
      'Comorbidity assessment',
    ],
    geriatric: [
      'Height, weight, BMI',
      'Vital signs including orthostatic BP',
      'GFR calculation (mandatory)',
      'Hepatic function',
      'Cognitive screening (MMSE/MoCA)',
      'Fall risk assessment',
      'Functional status (ADL/IADL)',
      'Polypharmacy review',
      'Frailty assessment',
      'Nutritional status (MNA)',
      'Depression screening (GDS)',
      'Pressure sore risk (Waterlow)',
    ],
  };
  
  return assessments[category] || [];
}

/**
 * Get optional assessments based on age category
 */
function getOptionalAssessments(category: AgeCategory): string[] {
  const assessments: Record<AgeCategory, string[]> = {
    neonate: [
      'Genetic screening',
      'Metabolic screening',
    ],
    infant: [
      'Lead screening',
      'Anemia screening',
    ],
    toddler: [
      'Lead screening',
      'Autism screening (M-CHAT)',
    ],
    preschool: [
      'Autism follow-up if indicated',
      'Speech assessment',
    ],
    school_age: [
      'ADHD screening if indicated',
      'Learning disability assessment',
    ],
    adolescent: [
      'STI screening if sexually active',
      'Pregnancy test if applicable',
      'Sports physical',
    ],
    adult: [
      'Cancer screening per guidelines',
      'Lipid profile',
      'Diabetes screening',
    ],
    geriatric: [
      'Bone density screening',
      'Cancer screening per guidelines',
      'Advanced care planning discussion',
      'Caregiver assessment',
    ],
  };
  
  return assessments[category] || [];
}

/**
 * Get excluded assessments (not appropriate for age)
 */
function getExcludedAssessments(category: AgeCategory): string[] {
  const excluded: Record<AgeCategory, string[]> = {
    neonate: [
      'MMSE/MoCA (cognitive screening)',
      'PHQ-9 (depression)',
      'Cardiovascular risk calculators',
      'Prostate screening',
      'Mammography',
      'Colonoscopy',
      'Bone density',
      'ASA classification (use neonatal specific)',
    ],
    infant: [
      'MMSE/MoCA',
      'PHQ-9',
      'Cardiovascular risk',
      'Adult-specific cancer screening',
      'GFR (use pediatric formulas)',
    ],
    toddler: [
      'Adult cognitive assessments',
      'Depression screening (adult tools)',
      'Cardiovascular risk calculators',
    ],
    preschool: [
      'Adult assessments',
      'Tanner staging',
      'Cardiovascular risk',
    ],
    school_age: [
      'Adult assessments',
      'Prostate/breast cancer screening',
    ],
    adolescent: [
      'Geriatric assessments',
      'Prostate cancer screening',
      'Colonoscopy',
    ],
    adult: [
      'Developmental milestones',
      'Pediatric growth charts',
      'Fontanelle assessment',
    ],
    geriatric: [
      'Developmental milestones',
      'Pediatric assessments',
      'Tanner staging',
    ],
  };
  
  return excluded[category] || [];
}

/**
 * Categorize patient based on date of birth
 */
export function categorizePatient(dateOfBirth: Date | string): PatientCategory {
  const age = calculatePatientAge(dateOfBirth);
  const ageCategory = getAgeCategory(age);
  const broadCategory = getBroadCategory(ageCategory);
  
  return {
    ageCategory,
    broadCategory,
    isPediatric: broadCategory === 'pediatric',
    isGeriatric: broadCategory === 'geriatric',
    isAdult: broadCategory === 'adult',
    isNeonate: ageCategory === 'neonate',
    isInfant: ageCategory === 'infant',
    ageInYears: age.years,
    ageDetails: age,
    displayAge: formatPatientAge(age),
    clinicalConsiderations: getClinicalConsiderations(ageCategory),
    contraindications: getAgeContraindications(ageCategory),
    requiredAssessments: getRequiredAssessments(ageCategory),
    optionalAssessments: getOptionalAssessments(ageCategory),
    excludedAssessments: getExcludedAssessments(ageCategory),
  };
}

/**
 * Calculate gestational age from LMP
 */
export function calculateGestationalAge(lmp: Date | string): { weeks: number; days: number; trimester: PregnancyTrimester } {
  const lmpDate = typeof lmp === 'string' ? new Date(lmp) : lmp;
  const now = new Date();
  const totalDays = differenceInDays(now, lmpDate);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  
  let trimester: PregnancyTrimester = 1;
  if (weeks >= 28) trimester = 3;
  else if (weeks >= 14) trimester = 2;
  
  return { weeks, days, trimester };
}

/**
 * Calculate expected delivery date from LMP
 */
export function calculateEDD(lmp: Date | string): Date {
  const lmpDate = typeof lmp === 'string' ? new Date(lmp) : lmp;
  const edd = new Date(lmpDate);
  edd.setDate(edd.getDate() + 280); // 40 weeks
  return edd;
}

/**
 * Get pregnancy clinical considerations
 */
function getPregnancyConsiderations(trimester: PregnancyTrimester): string[] {
  const common = [
    'Avoid Category D and X medications',
    'Consider teratogenic risk of all medications',
    'Use lowest effective doses',
    'Monitor fetal well-being',
    'Consider altered pharmacokinetics',
    'Increased renal clearance - may need dose adjustments',
    'Folic acid supplementation essential',
  ];
  
  const byTrimester: Record<PregnancyTrimester, string[]> = {
    1: [
      ...common,
      'Highest teratogenic risk - critical organogenesis period',
      'Avoid NSAIDs if possible',
      'Screen for ectopic pregnancy if applicable',
      'Nausea/vomiting may affect oral medication absorption',
      'Consider antiemetic safety profiles',
    ],
    2: [
      ...common,
      'Monitor for gestational diabetes (24-28 weeks)',
      'Blood pressure monitoring for preeclampsia',
      'Anatomy scan around 20 weeks',
      'Consider RhoGAM if Rh-negative',
    ],
    3: [
      ...common,
      'Avoid NSAIDs - premature ductus arteriosus closure',
      'Monitor for preeclampsia',
      'Consider timing of medications near delivery',
      'Some medications may affect labor',
      'Plan for breastfeeding medication compatibility',
      'GBS screening at 35-37 weeks',
    ],
  };
  
  return byTrimester[trimester] || common;
}

/**
 * Get pregnancy contraindications
 */
function getPregnancyContraindications(trimester: PregnancyTrimester): string[] {
  const always = [
    'Warfarin (especially first trimester)',
    'Isotretinoin (Accutane)',
    'Thalidomide',
    'Methotrexate',
    'ACE inhibitors',
    'ARBs',
    'Statins',
    'Live vaccines',
    'Tetracyclines',
    'Fluoroquinolones',
    'Misoprostol (unless for induction)',
  ];
  
  const byTrimester: Record<PregnancyTrimester, string[]> = {
    1: [
      ...always,
      'Valproic acid (high neural tube defect risk)',
      'Phenytoin (fetal hydantoin syndrome)',
      'Carbamazepine (neural tube defects)',
      'Lithium (cardiac defects)',
    ],
    2: [
      ...always,
      'NSAIDs (use with caution, avoid prolonged use)',
      'Trimethoprim (folic acid antagonist)',
    ],
    3: [
      ...always,
      'NSAIDs (contraindicated - ductus arteriosus)',
      'Codeine near term (neonatal withdrawal)',
      'Benzodiazepines near term (floppy infant)',
    ],
  };
  
  return byTrimester[trimester] || always;
}

/**
 * Get pregnancy required assessments
 */
function getPregnancyAssessments(trimester: PregnancyTrimester): string[] {
  const common = [
    'Blood pressure',
    'Weight gain monitoring',
    'Urine dipstick (protein, glucose)',
    'Fetal heart rate',
    'Fundal height',
  ];
  
  const byTrimester: Record<PregnancyTrimester, string[]> = {
    1: [
      ...common,
      'Dating ultrasound',
      'Blood type and Rh status',
      'Rubella immunity',
      'Hepatitis B screening',
      'HIV screening',
      'Syphilis screening',
      'Complete blood count',
      'Urinalysis and culture',
    ],
    2: [
      ...common,
      'Anatomy ultrasound (18-22 weeks)',
      'Glucose challenge test (24-28 weeks)',
      'Hemoglobin/hematocrit',
      'RhoGAM if Rh-negative (28 weeks)',
    ],
    3: [
      ...common,
      'GBS culture (35-37 weeks)',
      'Fetal position assessment',
      'Bishop score (if near term)',
      'Non-stress test if indicated',
      'Biophysical profile if indicated',
    ],
  };
  
  return byTrimester[trimester] || common;
}

/**
 * Get pregnancy excluded assessments
 */
function getPregnancyExcludedAssessments(): string[] {
  return [
    'X-rays (unless absolutely necessary with shielding)',
    'CT scans of pelvis/abdomen',
    'Radioactive iodine studies',
    'Some MRI contrast agents',
    'Cervical cytology (defer unless abnormal)',
    'Mammography (defer unless indicated)',
  ];
}

/**
 * Categorize pregnancy status
 */
export function categorizePregnancy(
  isPregnant: boolean,
  lmp?: Date | string,
  gestationalWeeks?: number
): PregnancyStatus {
  if (!isPregnant) {
    return {
      isPregnant: false,
      clinicalConsiderations: [],
      contraindications: [],
      requiredAssessments: [],
      excludedAssessments: [],
      medicationCategories: ['A', 'B', 'C', 'D', 'X'],
    };
  }
  
  let trimester: PregnancyTrimester = 1;
  let weeks: number | undefined;
  let edd: Date | undefined;
  let lmpDate: Date | undefined;
  
  if (lmp) {
    lmpDate = typeof lmp === 'string' ? new Date(lmp) : lmp;
    const gestAge = calculateGestationalAge(lmpDate);
    weeks = gestAge.weeks;
    trimester = gestAge.trimester;
    edd = calculateEDD(lmpDate);
  } else if (gestationalWeeks) {
    weeks = gestationalWeeks;
    if (weeks >= 28) trimester = 3;
    else if (weeks >= 14) trimester = 2;
  }
  
  return {
    isPregnant: true,
    trimester,
    gestationalWeeks: weeks,
    edd,
    lmp: lmpDate,
    clinicalConsiderations: getPregnancyConsiderations(trimester),
    contraindications: getPregnancyContraindications(trimester),
    requiredAssessments: getPregnancyAssessments(trimester),
    excludedAssessments: getPregnancyExcludedAssessments(),
    medicationCategories: ['A', 'B'], // Only Category A and B are generally considered safe
  };
}

/**
 * Calculate Body Surface Area (BSA) using Du Bois formula
 */
export function calculateBSA(weightKg: number, heightCm: number): number {
  return 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725);
}

/**
 * Calculate Ideal Body Weight (IBW)
 */
export function calculateIBW(heightCm: number, isMale: boolean): number {
  const heightInches = heightCm / 2.54;
  if (isMale) {
    return 50 + 2.3 * (heightInches - 60);
  } else {
    return 45.5 + 2.3 * (heightInches - 60);
  }
}

/**
 * Calculate Adjusted Body Weight for obesity
 */
export function calculateAdjustedWeight(actualWeight: number, ibw: number): number {
  if (actualWeight <= ibw * 1.3) {
    return actualWeight; // Not obese, use actual
  }
  return ibw + 0.4 * (actualWeight - ibw);
}

/**
 * Get complete patient context for clinical decision support
 */
export function getPatientContext(
  dateOfBirth: Date | string,
  sex: 'male' | 'female',
  weight?: number,
  height?: number,
  isPregnant?: boolean,
  lmp?: Date | string
): PatientContext {
  const category = categorizePatient(dateOfBirth);
  
  let bsa: number | undefined;
  let ibw: number | undefined;
  let adjustedWeight: number | undefined;
  
  if (weight && height) {
    bsa = calculateBSA(weight, height);
    ibw = calculateIBW(height, sex === 'male');
    adjustedWeight = calculateAdjustedWeight(weight, ibw);
  }
  
  const pregnancy = sex === 'female' && category.isAdult
    ? categorizePregnancy(isPregnant || false, lmp)
    : undefined;
  
  return {
    category,
    pregnancy,
    weight,
    height,
    bsa,
    ibw,
    adjustedWeight,
  };
}

/**
 * Check if an assessment is appropriate for the patient
 */
export function isAssessmentAppropriate(
  assessmentName: string,
  category: PatientCategory,
  pregnancy?: PregnancyStatus
): { appropriate: boolean; reason?: string } {
  // Check excluded assessments
  if (category.excludedAssessments.some(a => 
    assessmentName.toLowerCase().includes(a.toLowerCase())
  )) {
    return { 
      appropriate: false, 
      reason: `Not appropriate for ${category.ageCategory} patients` 
    };
  }
  
  // Check pregnancy exclusions
  if (pregnancy?.isPregnant && pregnancy.excludedAssessments.some(a =>
    assessmentName.toLowerCase().includes(a.toLowerCase())
  )) {
    return {
      appropriate: false,
      reason: 'Not appropriate during pregnancy',
    };
  }
  
  return { appropriate: true };
}

/**
 * Get dosing weight based on patient category
 */
export function getDosingWeight(
  context: PatientContext
): { weight: number; type: 'actual' | 'ibw' | 'adjusted'; recommendation: string } {
  if (!context.weight) {
    return { weight: 0, type: 'actual', recommendation: 'Weight required for dosing' };
  }
  
  // Pediatric - always use actual weight
  if (context.category.isPediatric) {
    return { 
      weight: context.weight, 
      type: 'actual', 
      recommendation: 'Use actual body weight for pediatric dosing' 
    };
  }
  
  // Check if obese (>130% IBW)
  if (context.ibw && context.weight > context.ibw * 1.3) {
    return {
      weight: context.adjustedWeight || context.weight,
      type: 'adjusted',
      recommendation: 'Patient is obese - consider adjusted body weight for lipophilic drugs',
    };
  }
  
  // Check if underweight (<80% IBW)
  if (context.ibw && context.weight < context.ibw * 0.8) {
    return {
      weight: context.weight,
      type: 'actual',
      recommendation: 'Patient is underweight - use actual body weight, consider reduced doses',
    };
  }
  
  return { 
    weight: context.weight, 
    type: 'actual', 
    recommendation: 'Use actual body weight' 
  };
}

export default {
  calculatePatientAge,
  formatPatientAge,
  getAgeCategory,
  getBroadCategory,
  categorizePatient,
  calculateGestationalAge,
  calculateEDD,
  categorizePregnancy,
  calculateBSA,
  calculateIBW,
  calculateAdjustedWeight,
  getPatientContext,
  isAssessmentAppropriate,
  getDosingWeight,
};
