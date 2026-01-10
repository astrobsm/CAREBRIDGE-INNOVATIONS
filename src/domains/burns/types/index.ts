// ============================================================
// COMPREHENSIVE BURN CARE PROTOCOL TYPES
// Based on WHO/ISBI Guidelines (2024)
// ============================================================

// ==========================================
// BURN ASSESSMENT TYPES
// ==========================================

export type BurnMechanism = 
  | 'flame' 
  | 'scald' 
  | 'contact' 
  | 'chemical' 
  | 'electrical' 
  | 'radiation' 
  | 'friction';

export type BurnDepthType = 
  | 'superficial' 
  | 'superficial_partial' 
  | 'deep_partial' 
  | 'full_thickness';

export type SeverityLevel = 'minor' | 'moderate' | 'major' | 'critical';

// Lund-Browder Chart Areas (WHO/ISBI recommended)
export interface LundBrowderEntry {
  region: string;
  regionName: string;
  ageGroup: 'infant' | 'child_1' | 'child_5' | 'child_10' | 'adult';
  percentBurned: number;
  percentage?: number; // Alias for percentBurned
  depth: BurnDepthType;
  maxPercent: number;
}

// Lund-Browder age-adjusted percentages
export const LUND_BROWDER_CHART: Record<string, Record<string, number>> = {
  head: { infant: 19, child_1: 17, child_5: 13, child_10: 11, adult: 7 },
  neck: { infant: 2, child_1: 2, child_5: 2, child_10: 2, adult: 2 },
  anterior_trunk: { infant: 13, child_1: 13, child_5: 13, child_10: 13, adult: 13 },
  posterior_trunk: { infant: 13, child_1: 13, child_5: 13, child_10: 13, adult: 13 },
  buttocks: { infant: 2.5, child_1: 2.5, child_5: 2.5, child_10: 2.5, adult: 2.5 },
  genitalia: { infant: 1, child_1: 1, child_5: 1, child_10: 1, adult: 1 },
  right_upper_arm: { infant: 4, child_1: 4, child_5: 4, child_10: 4, adult: 4 },
  left_upper_arm: { infant: 4, child_1: 4, child_5: 4, child_10: 4, adult: 4 },
  right_lower_arm: { infant: 3, child_1: 3, child_5: 3, child_10: 3, adult: 3 },
  left_lower_arm: { infant: 3, child_1: 3, child_5: 3, child_10: 3, adult: 3 },
  right_hand: { infant: 2.5, child_1: 2.5, child_5: 2.5, child_10: 2.5, adult: 2.5 },
  left_hand: { infant: 2.5, child_1: 2.5, child_5: 2.5, child_10: 2.5, adult: 2.5 },
  right_thigh: { infant: 5.5, child_1: 6.5, child_5: 8, child_10: 8.5, adult: 9.5 },
  left_thigh: { infant: 5.5, child_1: 6.5, child_5: 8, child_10: 8.5, adult: 9.5 },
  right_lower_leg: { infant: 5, child_1: 5, child_5: 5.5, child_10: 6, adult: 7 },
  left_lower_leg: { infant: 5, child_1: 5, child_5: 5.5, child_10: 6, adult: 7 },
  right_foot: { infant: 3.5, child_1: 3.5, child_5: 3.5, child_10: 3.5, adult: 3.5 },
  left_foot: { infant: 3.5, child_1: 3.5, child_5: 3.5, child_10: 3.5, adult: 3.5 },
};

// ==========================================
// VITAL SIGNS & MONITORING TYPES
// ==========================================

export interface BurnVitalSigns {
  id: string;
  burnAssessmentId: string;
  timestamp: Date;
  
  // Core vitals
  heartRate: number; // beats/min - Alert: >120 or <50
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  meanArterialPressure: number; // mmHg - Alert: <65
  respiratoryRate: number; // breaths/min - Alert: >25 or <8
  oxygenSaturation: number; // % - Target: ≥92%, Alert: <90%
  temperature: number; // °C - Alert: >38°C (infection), <36°C (hypothermia)
  
  // Pain assessment
  painScore: number; // 0-10 - Alert: >4 on opioid regimen
  
  // Glasgow Coma Scale
  gcsEye: number;
  gcsVerbal: number;
  gcsMotor: number;
  gcsTotal: number;
  
  // Recorded by
  recordedBy: string;
  notes?: string;
}

export interface UrineOutput {
  id: string;
  burnAssessmentId: string;
  timestamp: Date;
  volumeML: number;
  hourlyRate: number; // mL/hr
  ratePerKg: number; // mL/kg/hr - Target: 0.5-1.0 adults, 1-1.5 children
  color?: 'clear' | 'yellow' | 'dark_yellow' | 'amber' | 'cola' | 'bloody';
  recordedBy: string;
}

export interface FluidBalance {
  id: string;
  burnAssessmentId: string;
  periodStart: Date;
  periodEnd: Date;
  
  // Inputs
  ivFluidsML: number;
  oralFluidsML: number;
  bloodProductsML: number;
  enteralFeedingML: number;
  totalInputML: number;
  
  // Outputs
  urineOutputML: number;
  drainOutputML: number;
  nasogastricOutputML: number;
  insensibleLossML: number;
  totalOutputML: number;
  
  // Balance
  netBalanceML: number;
  cumulativeBalanceML: number;
  
  recordedBy: string;
}

export interface LabValues {
  id: string;
  burnAssessmentId: string;
  timestamp: Date;
  
  // Renal function
  creatinine?: number; // mg/dL or µmol/L
  bun?: number; // mg/dL
  
  // Electrolytes
  sodium?: number; // mmol/L
  potassium?: number; // mmol/L - Critical: arrhythmia risk
  chloride?: number; // mmol/L
  bicarbonate?: number; // mmol/L
  
  // Metabolic
  lactate?: number; // mmol/L - Alert: >2
  glucose?: number; // mmol/L - Target: <10-12
  
  // Hematology
  hemoglobin?: number; // g/dL - Alert: <7-8
  hematocrit?: number; // %
  wbc?: number; // x10^9/L
  platelets?: number; // x10^9/L
  
  // Coagulation
  inr?: number;
  ptt?: number;
  
  // Inflammatory markers
  crp?: number; // mg/L
  procalcitonin?: number; // ng/mL
  
  // Muscle injury
  creatineKinase?: number; // U/L
  myoglobin?: number;
  
  // Nutrition
  albumin?: number; // g/dL
  prealbumin?: number; // mg/dL
  
  // ABG
  pH?: number;
  pao2?: number; // mmHg
  paco2?: number; // mmHg
  fio2?: number; // %
  pao2Fio2Ratio?: number; // Alert: <300 ARDS, <200 severe
  baseExcess?: number;
  
  recordedBy: string;
  notes?: string;
}

// ==========================================
// SCORING SYSTEMS
// ==========================================

export interface TBSACalculation {
  method: 'lund_browder' | 'rule_of_nines' | 'palmar';
  entries: LundBrowderEntry[];
  totalTBSA: number;
  superficialTBSA: number;
  partialThicknessTBSA: number;
  fullThicknessTBSA: number;
  deepTBSA?: number; // Alias for fullThicknessTBSA
  calculatedAt: Date;
  calculatedBy: string;
}

export interface BauxScore {
  age: number;
  tbsa: number;
  score: number; // Age + TBSA
  mortalityRisk: string;
}

export interface RevisedBauxScore {
  age: number;
  tbsa: number;
  inhalationInjury: boolean;
  score: number; // Age + TBSA + 17 (if inhalation)
  mortalityRisk: string;
}

export interface ABSIScore {
  age: number;
  gender: 'male' | 'female';
  tbsa: number;
  hasInhalationInjury: boolean;
  hasFullThickness: boolean;
  
  // Point breakdown
  agePoints: number;
  genderPoints: number;
  tbsaPoints: number;
  inhalationPoints: number;
  fullThicknessPoints: number;
  
  totalScore: number;
  score?: number; // Alias for totalScore
  survivalProbability: string;
  survivalRate?: string; // Alias for survivalProbability
  threatLevel: 'very_low' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe';
}

export interface qSOFAScore {
  respiratoryRate: number; // ≥22 = 1 point
  alteredMentation: boolean; // GCS <15 = 1 point
  systolicBP: number; // ≤100 = 1 point
  score: number; // 0-3
  sepsisRisk: 'low' | 'high';
}

export interface SOFAScore {
  // Respiration (PaO2/FiO2)
  respirationScore: number; // 0-4
  
  // Coagulation (Platelets)
  coagulationScore: number; // 0-4
  
  // Liver (Bilirubin)
  liverScore: number; // 0-4
  
  // Cardiovascular (MAP or vasopressors)
  cardiovascularScore: number; // 0-4
  
  // CNS (GCS)
  cnsScore: number; // 0-4
  
  // Renal (Creatinine or UO)
  renalScore: number; // 0-4
  
  totalScore: number; // 0-24
  mortalityRisk: string;
  
  // Additional display properties
  interpretation?: string;
  components?: {
    respiration: number;
    coagulation: number;
    liver: number;
    cardiovascular: number;
    cns: number;
    renal: number;
  };
}

// ==========================================
// FLUID RESUSCITATION
// ==========================================

export type ResuscitationFormula = 'parkland' | 'modified_brooke' | 'evans' | 'custom';

export interface FluidResuscitationPlan {
  id: string;
  burnAssessmentId: string;
  
  // Patient data
  patientWeight: number; // kg
  tbsa: number; // %
  timeOfBurn: Date;
  
  // Formula selection
  formula: ResuscitationFormula;
  
  // Calculated requirements (24hr)
  totalFluid24h: number; // mL
  totalVolume24h?: number; // Alias for totalFluid24h
  firstHalfVolume: number; // First 8 hours from burn
  phase1Volume?: number; // Alias for firstHalfVolume
  secondHalfVolume: number; // Next 16 hours
  phase2Volume?: number; // Alias for secondHalfVolume
  
  // Hourly targets
  firstHalfRate: number; // mL/hr
  secondHalfRate: number; // mL/hr
  
  // Current status
  currentInfusionRate: number;
  currentHour: number;
  fluidAdministered: number;
  fluidRemaining: number;
  
  // Urine output target
  urineOutputTarget: number; // mL/kg/hr
  targetUrineOutput?: number; // Alias for urineOutputTarget
  
  // Adjustments
  adjustments: FluidAdjustment[];
  
  // Colloid addition (after 12-24h)
  colloidStartTime?: Date;
  colloidType?: string;
  colloidRate?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface FluidAdjustment {
  id: string;
  timestamp: Date;
  previousRate: number;
  newRate: number;
  reason: string;
  urineOutputAtAdjustment: number;
  adjustedBy: string;
}

export interface HourlyResuscitationEntry {
  hour: number;
  timestamp: Date;
  targetVolume: number;
  actualVolume: number;
  infusionRate: number;
  urineOutput: number;
  urineOutputPerKg: number;
  cumulativeFluid: number;
  cumulativeUrine: number;
  adjustmentMade: boolean;
  notes?: string;
  recordedBy: string;
}

// ==========================================
// COMPLICATIONS & ALERTS
// ==========================================

export type ComplicationType = 
  | 'hypovolemic_shock'
  | 'aki'
  | 'sepsis'
  | 'ards'
  | 'compartment_syndrome'
  | 'rhabdomyolysis'
  | 'vte'
  | 'anemia'
  | 'hypothermia'
  | 'hypermetabolic_state';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'escalated';

export interface BurnAlert {
  id: string;
  burnAssessmentId: string;
  timestamp: Date;
  
  type: ComplicationType | 'custom';
  priority: AlertPriority;
  status: AlertStatus;
  
  title: string;
  description: string;
  triggerValue: string;
  threshold: string;
  
  suggestedActions: string[];
  orderSetId?: string;
  
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  
  escalatedTo?: string;
  escalatedAt?: Date;
}

export interface AlertThreshold {
  parameter: string;
  lowThreshold?: number;
  highThreshold?: number;
  duration?: number; // minutes
  priority: AlertPriority;
  message: string;
  actions: string[];
}

// Default alert thresholds per WHO/ISBI
export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  { parameter: 'urineOutputPerKg', lowThreshold: 0.5, priority: 'high', 
    message: 'Urine output <0.5 mL/kg/hr for 2 consecutive hours', 
    actions: ['Increase crystalloid infusion by 20-30%', 'Reassess hourly', 'Notify senior if no improvement'] },
  { parameter: 'meanArterialPressure', lowThreshold: 65, priority: 'critical', 
    message: 'MAP <65 mmHg - inadequate perfusion', 
    actions: ['Fluid bolus', 'Consider vasopressors', 'ICU escalation'] },
  { parameter: 'oxygenSaturation', lowThreshold: 90, priority: 'critical', 
    message: 'SpO2 <90% - hypoxia', 
    actions: ['Increase FiO2', 'Check airway', 'ABG', 'Consider intubation'] },
  { parameter: 'heartRate', highThreshold: 120, priority: 'medium', 
    message: 'Tachycardia HR >120', 
    actions: ['Check fluid status', 'Rule out pain/sepsis', 'ECG'] },
  { parameter: 'temperature', highThreshold: 38, priority: 'high', 
    message: 'Fever >38°C - possible infection', 
    actions: ['Blood cultures', 'Wound assessment', 'Consider antibiotics'] },
  { parameter: 'temperature', lowThreshold: 36, priority: 'medium', 
    message: 'Hypothermia <36°C', 
    actions: ['Active warming', 'Warm IV fluids', 'Environmental control'] },
  { parameter: 'lactate', highThreshold: 2, priority: 'high', 
    message: 'Elevated lactate >2 mmol/L - tissue hypoperfusion', 
    actions: ['Optimize fluids', 'Check hemoglobin', 'Consider transfusion'] },
  { parameter: 'hemoglobin', lowThreshold: 7, priority: 'high', 
    message: 'Hb <7 g/dL - transfusion threshold', 
    actions: ['Type and crossmatch', 'Transfuse PRBCs', 'Check for bleeding'] },
  { parameter: 'potassium', highThreshold: 6, priority: 'critical', 
    message: 'Hyperkalemia K+ >6 mmol/L - arrhythmia risk', 
    actions: ['ECG stat', 'Calcium gluconate', 'Insulin/glucose', 'Kayexalate'] },
  { parameter: 'creatinine', highThreshold: 2, priority: 'high', 
    message: 'Rising creatinine - possible AKI', 
    actions: ['Check urine output', 'Avoid nephrotoxins', 'Nephrology consult'] },
  { parameter: 'pao2Fio2Ratio', lowThreshold: 300, priority: 'high', 
    message: 'P/F ratio <300 - ARDS criteria', 
    actions: ['ABG monitoring', 'Chest imaging', 'Lung protective ventilation'] },
];

// ==========================================
// WOUND CARE & PROCEDURES
// ==========================================

export interface BurnWoundAssessment {
  id: string;
  burnAssessmentId: string;
  timestamp: Date;
  date?: Date; // Alias for timestamp
  
  // Wound location
  region?: string;
  
  // Wound characteristics
  appearance: 'clean' | 'granulating' | 'sloughy' | 'necrotic' | 'infected' | string[];
  depth?: string;
  exudateAmount: 'none' | 'minimal' | 'moderate' | 'heavy';
  exudateLevel?: 'none' | 'minimal' | 'moderate' | 'heavy'; // Alias for exudateAmount
  exudateType: 'serous' | 'serosanguinous' | 'purulent' | 'bloody';
  odor: boolean;
  surroundingSkin: 'normal' | 'erythematous' | 'indurated' | 'macerated';
  
  // Infection signs
  increasingPain: boolean;
  spreadingErythema: boolean;
  localWarmth: boolean;
  purulentDischarge: boolean;
  feverWithWound: boolean;
  infectionSigns?: string[];
  
  // Graft status (if applicable)
  graftPresent: boolean;
  graftTakePercent?: number;
  graftComplications?: string[];
  
  // Dressing
  dressingType: string;
  dressingApplied?: string; // Alias for dressingType
  dressingChangeDate: Date;
  nextDressingChange: Date;
  
  // Debridement
  debridementPerformed?: boolean;
  cultureTaken?: boolean;
  
  // Photos
  photoUrls: string[];
  
  assessedBy: string;
  notes?: string;
}

export interface EscharotomyRecord {
  id: string;
  burnAssessmentId: string;
  
  indication: 'circumferential_limb' | 'circumferential_chest' | 'abdominal_compartment' | string;
  site: string;
  location?: string; // Alias for site
  
  preOperativeFindings: {
    compartmentPressure?: number;
    pulseOximetry?: number;
    capillaryRefill?: string;
    painLevel?: number;
    respiratoryDistress?: boolean;
  };
  
  procedureDateTime: Date;
  date?: Date; // Alias for procedureDateTime
  surgeon: string;
  performer?: string; // Alias for surgeon
  assistants: string[];
  
  technique: string;
  incisionLength?: number;
  
  postOperativeFindings: {
    compartmentPressure?: number;
    pulseOximetry?: number;
    capillaryRefill?: string;
    respiratoryImprovement?: boolean;
  };
  
  complications?: string[] | string;
  
  createdAt: Date;
}

export interface GraftingRecord {
  id: string;
  burnAssessmentId: string;
  
  procedureDate: Date;
  date?: Date; // Alias for procedureDate
  surgeon: string;
  
  graftType: 'split_thickness' | 'full_thickness' | 'xenograft' | 'allograft' | 'synthetic';
  donorSite?: string;
  recipientSite: string;
  areaGraftedCm2: number;
  graftSizeCm2?: number; // Alias for areaGraftedCm2
  meshRatio?: string;
  meshingRatio?: string; // Alias for meshRatio
  
  postOpDay: number;
  graftTakePercent: number;
  takePercentage?: number; // Alias for graftTakePercent
  complications?: string[];
  
  dailyAssessments: {
    day: number;
    takePercent: number;
    appearance: string;
    notes: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// NUTRITION
// ==========================================

export interface BurnNutritionPlan {
  id: string;
  burnAssessmentId: string;
  
  patientWeight: number;
  tbsa: number;
  
  // Calculated requirements (Curreri or similar)
  caloricTarget: number; // kcal/day
  proteinTarget: number; // g/day (1.5-2 g/kg)
  carbTarget: number;
  fatTarget: number;
  fluidTarget: number;
  
  // Micronutrients
  vitaminC: number; // 500-1000mg
  vitaminE: number;
  zinc: number; // 220mg
  selenium: number;
  
  // Delivery
  feedingRoute: 'oral' | 'enteral' | 'parenteral' | 'combined';
  enteralFormula?: string;
  enteralRate?: number;
  
  // Monitoring
  dailyCaloriesDelivered: number;
  dailyProteinDelivered: number;
  percentTargetAchieved: number;
  
  // Adjustments
  dietitianConsult: boolean;
  consultDate?: Date;
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// REHABILITATION & OUTCOMES
// ==========================================

export interface RehabilitationRecord {
  id: string;
  burnAssessmentId: string;
  
  // PT/OT
  ptConsult: boolean;
  otConsult: boolean;
  consultDate?: Date;
  
  // ROM measurements
  romMeasurements: {
    joint: string;
    baseline: number;
    current: number;
    target: number;
  }[];
  
  // Mobility
  mobilityStatus: 'bed_bound' | 'chair' | 'ambulating_assistance' | 'independent';
  
  // Pressure management
  pressureGarments: boolean;
  garmentDetails?: string;
  
  // Scar management
  siliconeTherapy: boolean;
  massageTherapy: boolean;
  laserTherapy: boolean;
  
  // Psychological
  psychologyConsult: boolean;
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BurnOutcome {
  id: string;
  burnAssessmentId: string;
  
  outcome: 'survived' | 'died' | 'transferred';
  outcomeDate: Date;
  
  hospitalLOS: number; // days
  icuLOS: number; // days
  ventilatorDays: number;
  
  totalSurgeries: number;
  totalGraftArea: number;
  
  complications: ComplicationType[];
  
  // If survived
  dischargeDestination?: 'home' | 'rehabilitation' | 'ltc' | 'other';
  followUpSchedule?: Date[];
  
  // If died
  causeOfDeath?: string;
  
  notes?: string;
  createdAt: Date;
}

// ==========================================
// COMPREHENSIVE BURN ASSESSMENT (MAIN TYPE)
// ==========================================

export interface ComprehensiveBurnAssessment {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  hospitalId?: string;
  
  // Admission data
  admissionDateTime: Date;
  timeOfBurn: Date;
  mechanism: BurnMechanism;
  circumstances: string;
  firstAidProvided: string[];
  timeToPresentation: number; // hours
  referralSource?: string;
  
  // Patient demographics
  age: number;
  gender: 'male' | 'female';
  weight: number; // kg
  height?: number; // cm
  
  // TBSA calculation
  tbsaCalculation: TBSACalculation;
  
  // Inhalation injury assessment
  inhalationInjury: {
    suspected: boolean;
    enclosedSpace: boolean;
    facialBurns: boolean;
    singedNasalHairs: boolean;
    carbonaceousSputum: boolean;
    stridor: boolean;
    hoarseness: boolean;
    bronchoscopyPerformed: boolean;
    bronchoscopyFindings?: string;
    intubated: boolean;
    intubationTime?: Date;
  };
  
  // Associated injuries
  associatedInjuries: string[];
  
  // Tetanus status
  tetanusStatus: 'up_to_date' | 'needs_booster' | 'needs_immunization' | 'unknown';
  tetanusGiven: boolean;
  tetanusDateTime?: Date;
  
  // Scores
  bauxScore: BauxScore;
  revisedBauxScore: RevisedBauxScore;
  absiScore: ABSIScore;
  
  // Fluid resuscitation
  resuscitationPlan: FluidResuscitationPlan;
  
  // Disposition
  disposition: 'ward' | 'hdu' | 'icu' | 'burn_center' | 'transfer';
  burnCenterCriteria: boolean;
  
  // Monitoring data (arrays for trending)
  vitalSigns: BurnVitalSigns[];
  urineOutputs: UrineOutput[];
  fluidBalances: FluidBalance[];
  labValues: LabValues[];
  
  // Wound care
  woundAssessments: BurnWoundAssessment[];
  escharotomies: EscharotomyRecord[];
  graftings: GraftingRecord[];
  
  // Complications & alerts
  alerts: BurnAlert[];
  complications: ComplicationType[];
  
  // Nutrition
  nutritionPlan?: BurnNutritionPlan;
  
  // Rehabilitation
  rehabilitation?: RehabilitationRecord;
  
  // Prophylaxis
  vteProphylaxis: {
    mechanical: boolean;
    pharmacological: boolean;
    agent?: string;
    startDate?: Date;
  };
  stressUlcerProphylaxis: {
    given: boolean;
    agent?: string;
  };
  
  // Outcome
  outcome?: BurnOutcome;
  
  // Status
  status: 'active' | 'discharged' | 'transferred' | 'deceased';
  
  // Audit
  assessedBy: string;
  assessedByName: string;
  
  createdAt: Date;
  updatedAt: Date;
  lastReviewedAt?: Date;
  lastReviewedBy?: string;
}

// ==========================================
// ORDER SETS
// ==========================================

export interface BurnOrderSet {
  id: string;
  name: string;
  type: 'admission' | 'resuscitation' | 'sepsis' | 'wound_care' | 'nutrition' | 'discharge';
  orders: {
    category: string;
    items: {
      order: string;
      details?: string;
      frequency?: string;
      duration?: string;
      isDefault: boolean;
    }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// DASHBOARD & REPORTING
// ==========================================

export interface BurnDashboardData {
  patientId: string;
  currentHour: number;
  
  // Vitals trend (last 24h)
  vitalsTrend: {
    timestamps: Date[];
    heartRates: number[];
    maps: number[];
    spo2s: number[];
    temps: number[];
  };
  
  // Fluid balance
  fluidStatus: {
    targetFluid24h: number;
    actualFluid24h: number;
    urineOutput24h: number;
    netBalance: number;
  };
  
  // Urine output trend
  urineOutputTrend: {
    timestamps: Date[];
    values: number[];
    perKgValues: number[];
    targetLine: number;
  };
  
  // Lab trends
  labTrends: {
    timestamps: Date[];
    hemoglobin: number[];
    creatinine: number[];
    lactate: number[];
  };
  
  // Active alerts
  activeAlerts: BurnAlert[];
  
  // Scores
  currentScores: {
    tbsa: number;
    baux: number;
    revisedBaux: number;
    absi: number;
    sofa?: number;
    qsofa?: number;
  };
  
  // Next actions
  nextActions: {
    description: string;
    dueTime: Date;
    priority: AlertPriority;
  }[];
}
