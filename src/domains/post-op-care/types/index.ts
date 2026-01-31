/**
 * Post-Operative Care Types
 * AstroHEALTH Innovations in Healthcare
 */

export interface PostOpCarePlan {
  id: string;
  patientId: string;
  surgeryId: string;
  surgeryDate: Date;
  surgeryName: string;
  surgeonId: string;
  surgeonName: string;
  hospitalId: string;
  
  // Care plan details
  vitalSignsFrequency: 'hourly' | '2_hourly' | '4_hourly' | '6_hourly' | '8_hourly' | '12_hourly' | 'daily';
  painManagementProtocol: PainManagementProtocol;
  woundCareInstructions: string;
  mobilizationPlan: MobilizationStep[];
  dietProgression: DietProgressionStep[];
  medicationSchedule: PostOpMedication[];
  drainManagement?: DrainCare[];
  catheterCare?: CatheterCare;
  ivLineManagement?: IVLineManagement;
  
  // Monitoring parameters
  specialMonitoring: string[];
  warningSignsToWatch: string[];
  expectedRecoveryMilestones: RecoveryMilestone[];
  
  // Instructions
  nursingInstructions: string;
  doctorInstructions: string;
  patientInstructions: string;
  
  // Status
  status: 'active' | 'completed' | 'discontinued';
  completedAt?: Date;
  discontinuedReason?: string;
  
  // Entry tracking
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostOpMonitoringRecord {
  id: string;
  carePlanId: string;
  patientId: string;
  surgeryId: string;
  
  // Timing
  recordedAt: Date;
  dayPostOp: number; // Days since surgery
  hourPostOp: number; // Hours since surgery
  shift: 'morning' | 'afternoon' | 'night';
  
  // Vital Signs
  vitalSigns: {
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    heartRate: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
    gcs?: number;
  };
  
  // Pain Assessment
  painScore: number; // 0-10
  painLocation?: string;
  painCharacter?: string;
  painRelievedBy?: string;
  
  // Wound Status
  woundAssessment?: {
    appearance: 'clean' | 'inflamed' | 'discharging' | 'dehisced' | 'infected';
    dressingStatus: 'intact' | 'soiled' | 'changed';
    drainage: 'none' | 'serous' | 'serosanguinous' | 'bloody' | 'purulent';
  };
  
  // Drains
  drainOutputs?: {
    drainId: string;
    drainName: string;
    outputMl: number;
    outputCharacter: string;
  }[];
  
  // Fluid Balance
  fluidIntake?: {
    oral: number;
    iv: number;
    total: number;
  };
  fluidOutput?: {
    urine: number;
    drain: number;
    other: number;
    total: number;
  };
  fluidBalance?: number;
  
  // Bowel and Bladder
  bowelMovement?: boolean;
  flatus?: boolean;
  urineOutput?: 'normal' | 'reduced' | 'anuria' | 'catheterized';
  
  // Mobility
  mobilityStatus: 'bed_rest' | 'sitting' | 'standing' | 'walking_assisted' | 'walking_independent';
  mobilityNotes?: string;
  
  // Diet
  dietStatus: 'nil_by_mouth' | 'sips' | 'clear_fluids' | 'soft_diet' | 'regular_diet';
  dietToleranceNotes?: string;
  
  // Complications
  complications?: string[];
  interventions?: string[];
  
  // Notes
  nursingNotes: string;
  doctorReview?: string;
  
  // Entry tracking
  recordedBy: string;
  recordedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PainManagementProtocol {
  primaryAnalgesic: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'iv' | 'im' | 'subcutaneous' | 'pca' | 'epidural';
  rescueMedication?: string;
  rescueDosage?: string;
  maxDailyDose?: string;
}

export interface MobilizationStep {
  day: number;
  activity: string;
  instructions: string;
  precautions?: string[];
}

export interface DietProgressionStep {
  day: number;
  dietType: string;
  instructions: string;
  restrictions?: string[];
}

export interface PostOpMedication {
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  purpose: string;
  startDay: number;
  endDay?: number;
}

export interface DrainCare {
  drainName: string;
  drainType: string;
  location: string;
  expectedOutput: string;
  removalCriteria: string;
  careProcedure: string;
}

export interface CatheterCare {
  type: 'urinary' | 'suprapubic' | 'nephrostomy';
  insertedDate: Date;
  expectedRemoval: Date;
  careInstructions: string;
  trialVoidingDate?: Date;
}

export interface IVLineManagement {
  type: 'peripheral' | 'central' | 'picc' | 'port';
  insertedDate: Date;
  site: string;
  fluidOrder: string;
  changeSchedule: string;
}

export interface RecoveryMilestone {
  day: number;
  milestone: string;
  expectedBy: string;
  achieved?: boolean;
  achievedDate?: Date;
}

export interface PostOpSummary {
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  surgeries: {
    surgeryId: string;
    surgeryName: string;
    surgeryDate: Date;
    dayPostOp: number;
    carePlanId: string;
    status: 'active' | 'completed' | 'discontinued';
    lastMonitoring?: PostOpMonitoringRecord;
  }[];
  totalDaysAdmitted: number;
  currentStatus: 'stable' | 'improving' | 'concerning' | 'critical';
}
