// User Roles
export type UserRole =
  | 'super_admin'
  | 'hospital_admin'
  | 'surgeon'
  | 'doctor'
  | 'plastic_surgeon'
  | 'anaesthetist'
  | 'nurse'
  | 'pharmacist'
  | 'lab_scientist'
  | 'dietician'
  | 'physiotherapist'
  | 'accountant'
  | 'home_care_giver'
  | 'driver'
  | 'consultant'
  | 'resident'
  | 'registrar'
  | 'senior_registrar'
  | 'medical_officer'
  | 'house_officer'
  | 'endocrinologist'
  | 'cardiologist'
  | 'nephrologist'
  | 'neurologist'
  | 'gastroenterologist'
  | 'obstetrician'
  | 'radio_oncologist'
  | 'pathologist';

// User
export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalId?: string;
  phone?: string;
  avatar?: string;
  specialization?: string;
  specialty?: string; // Alias for specialization
  licenseNumber?: string;
  isActive: boolean;
  // Agreement tracking
  hasAcceptedAgreement?: boolean;
  agreementAcceptedAt?: string;
  agreementVersion?: string;
  agreementDeviceInfo?: string;
  mustChangePassword?: boolean;
  // Bank Account Details (for payroll)
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankCode?: string; // Nigerian bank sort code
  createdAt: Date;
  updatedAt: Date;
}

// Hospital
export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  type: 'primary' | 'secondary' | 'tertiary';
  logo?: string;
  website?: string;
  bedCapacity?: number;
  icuBeds?: number;
  operatingTheatres?: number;
  is24Hours?: boolean;
  hasEmergency?: boolean;
  hasLaboratory?: boolean;
  hasPharmacy?: boolean;
  hasRadiology?: boolean;
  specialties?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Patient
export interface Patient {
  id: string;
  hospitalNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female';
  bloodGroup?: BloodGroup;
  genotype?: Genotype;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  occupation?: string;
  religion?: string;
  tribe?: string;
  nextOfKin: NextOfKin;
  allergies: string[];
  chronicConditions: string[];
  // Risk Assessments (required at registration)
  dvtRiskAssessment?: DVTRiskAssessment;
  pressureSoreRiskAssessment?: PressureSoreRiskAssessment;
  comorbidities?: Comorbidity[];
  photo?: string;
  registeredHospitalId: string;
  // Care Setting fields
  careType?: 'hospital' | 'homecare';
  hospitalId?: string;
  hospitalName?: string;
  ward?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DVT Risk Assessment (Caprini Score)
export interface DVTRiskAssessment {
  score: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  riskFactors: string[];
  prophylaxisRecommended: string;
  assessedBy: string;
  assessedAt: Date;
}

// Pressure Sore Risk Assessment (Braden Scale)
export interface PressureSoreRiskAssessment {
  score: number;
  riskLevel: 'no_risk' | 'mild_risk' | 'moderate_risk' | 'high_risk' | 'very_high_risk';
  sensoryPerception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  frictionShear: number;
  interventionsRequired: string[];
  assessedBy: string;
  assessedAt: Date;
}

// Comorbidity
export interface Comorbidity {
  condition: string;
  diagnosedDate?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  currentlyManaged: boolean;
  medications?: string[];
  notes?: string;
}

export interface NextOfKin {
  name: string;
  relationship: string;
  phone: string;
  address: string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type Genotype = 'AA' | 'AS' | 'SS' | 'AC' | 'SC';

// Vital Signs
export interface VitalSigns {
  id: string;
  patientId: string;
  encounterId?: string;
  temperature: number; // Celsius
  pulse: number; // bpm
  respiratoryRate: number; // breaths/min
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation: number; // SpO2 %
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  painScore?: number; // 0-10
  bloodGlucose?: number; // mmol/L
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
}

// Clinical Encounter
export interface ClinicalEncounter {
  id: string;
  patientId: string;
  hospitalId: string;
  type: EncounterType;
  status: 'in-progress' | 'completed' | 'cancelled';
  
  // Flag to distinguish initial vs follow-up encounters
  isFirstEncounter?: boolean;
  
  // Common fields
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  physicalExamination?: PhysicalExamination;
  clinicalPhotos?: ClinicalPhoto[];
  diagnosis: Diagnosis[];
  treatmentPlan?: string;
  notes?: string;
  
  // Initial encounter specific - comprehensive history
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  allergyHistory?: string;
  medicationHistory?: string;
  immunizationHistory?: string;
  obstetricHistory?: string;        // For female patients
  developmentalHistory?: string;    // For pediatric patients
  
  // Follow-up encounter specific
  intervalHistory?: string;          // Changes since last visit
  complianceAssessment?: string;     // Medication/treatment compliance
  treatmentResponse?: string;        // How patient is responding to treatment
  newSymptoms?: string;              // New symptoms since last visit
  previousEncounterId?: string;      // Reference to previous encounter (for follow-ups)
  
  // Clinician and timing
  attendingClinician: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Sync tracking
  syncedAt?: Date;
  localId?: string;
}

// ==================== INVESTIGATION APPROVAL WORKFLOW ====================

// Approval action types
export type InvestigationApprovalAction = 'approved' | 'rejected' | 'auto_requested' | 'cancelled';

// Investigation Approval Log - tracks all approval workflow actions
export interface InvestigationApprovalLog {
  id: string;
  investigationId: string;
  patientId: string;
  hospitalId: string;
  
  // Approval action
  action: InvestigationApprovalAction;
  reason?: string;
  
  // Performer info
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  performedAt: Date;
  
  // Auto-request tracking
  sourceInvestigationId?: string;
  autoRequestTriggered?: boolean;
  labRequestId?: string;
  
  // Timestamps
  createdAt: Date;
  
  // Sync tracking
  syncedAt?: Date;
  localId?: string;
}

// Clinical Photo for encounter documentation
export interface ClinicalPhoto {
  id: string;
  imageData: string; // Base64 encoded image
  description?: string;
  bodyLocation?: string;
  capturedAt: Date;
}

export type EncounterType = 
  | 'initial'
  | 'follow_up'
  | 'outpatient'
  | 'inpatient'
  | 'emergency'
  | 'surgical'
  | 'home_visit';

// Encounter Category for UI grouping
export type EncounterCategory = 'initial' | 'follow_up';

// Investigation Result with tracking for flagging
export interface InvestigationResult {
  parameterId: string;
  parameterName: string;
  value: number | string;
  unit?: string;
  referenceRange?: string;
  isAbnormal: boolean;
  abnormalityType?: 'high' | 'low' | 'critical_high' | 'critical_low';
  recommendation?: string;
}

export interface PhysicalExamination {
  generalAppearance?: string;
  head?: string;
  eyes?: string;
  ears?: string;
  nose?: string;
  throat?: string;
  neck?: string;
  chest?: string;
  cardiovascular?: string;
  abdomen?: string;
  genitourinary?: string;
  musculoskeletal?: string;
  neurological?: string;
  skin?: string;
  additionalFindings?: string;
}

export interface Diagnosis {
  id: string;
  code?: string; // ICD-10 code
  description: string;
  type: 'primary' | 'secondary' | 'differential';
  status: 'suspected' | 'confirmed' | 'ruled_out';
}

// Surgery
export interface Surgery {
  id: string;
  patientId: string;
  hospitalId: string;
  procedureName: string;
  procedureCode?: string;
  type: 'elective' | 'emergency';
  category: 'minor' | 'intermediate' | 'major' | 'super_major';
  preOperativeAssessment: PreOperativeAssessment;
  scheduledDate: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: 'incomplete_preparation' | 'ready_for_preanaesthetic_review' | 'scheduled' | 'in-progress' | 'completed' | 'postponed' | 'cancelled';
  outstandingItems?: OutstandingPreparationItem[];
  surgeon: string;
  surgeonId?: string; // User ID for billing
  surgeonFee?: number; // Fee charged for surgeon
  assistant?: string;
  assistantId?: string; // User ID of surgeon assistant for billing
  assistantFeePercentage?: number; // Typically 20% of surgeon fee
  assistantFee?: number; // Calculated assistant fee
  anaesthetist?: string;
  anaesthetistId?: string; // User ID for billing
  scrubNurse?: string;
  scrubNurseId?: string; // User ID for billing
  circulatingNurse?: string;
  circulatingNurseId?: string; // User ID for billing
  anaesthesiaType?: AnaesthesiaType;
  anaesthesiaFee?: number;
  operativeNotes?: string;
  complications?: string;
  bloodLoss?: number;
  specimenSent?: boolean;
  specimenType?: string;
  postOperativeInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutstandingPreparationItem {
  id: string;
  type: 'risk_assessment' | 'investigations' | 'consent' | 'blood_typing' | 'team_assignment' | 'npo_status';
  label: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface PreOperativeAssessment {
  asaScore: 1 | 2 | 3 | 4 | 5;
  capriniScore?: number;
  mallampatiScore?: 1 | 2 | 3 | 4;
  npoStatus: boolean;
  consentSigned: boolean;
  bloodTyped: boolean;
  investigations: string[];
  riskFactors: string[];
  specialInstructions?: string;
}

export type AnaesthesiaType = 
  | 'general'
  | 'spinal'
  | 'epidural'
  | 'local'
  | 'regional'
  | 'sedation';

// Wound
export interface Wound {
  id: string;
  patientId: string;
  encounterId?: string;
  location: string;
  type: WoundType;
  etiology: string;
  length: number; // cm
  width: number; // cm
  depth?: number; // cm
  area?: number; // cm²
  tissueType: TissueType[];
  exudateAmount: 'none' | 'light' | 'moderate' | 'heavy';
  exudateType?: 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent';
  odor: boolean;
  periWoundCondition?: string;
  painLevel: number; // 0-10
  photos: WoundPhoto[];
  healingProgress: 'improving' | 'stable' | 'deteriorating';
  dressingType?: string;
  dressingFrequency?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WoundType = 
  | 'surgical'
  | 'traumatic'
  | 'pressure_ulcer'
  | 'diabetic_ulcer'
  | 'venous_ulcer'
  | 'arterial_ulcer'
  | 'burn'
  | 'other';

export type TissueType = 
  | 'epithelial'
  | 'granulation'
  | 'slough'
  | 'necrotic'
  | 'eschar';

export interface WoundPhoto {
  id: string;
  url: string;
  measurements?: {
    length: number;
    width: number;
    area: number;
  };
  capturedAt: Date;
  aiAnalysis?: string;
}

// Burns
export interface BurnAssessment {
  id: string;
  patientId: string;
  encounterId?: string;
  burnType: 'thermal' | 'chemical' | 'electrical' | 'radiation' | 'friction';
  mechanism: string;
  timeOfInjury: Date;
  tbsaPercentage: number; // Total Body Surface Area
  burnDepth: BurnDepth[];
  affectedAreas: BurnArea[];
  parklandFormula: {
    fluidRequirement24h: number; // mL
    firstHalfRate: number; // mL/hr
    secondHalfRate: number; // mL/hr
  };
  absiScore?: {
    score: number;
    survivalProbability: string;
    age: number;
    gender: 'male' | 'female';
    hasInhalationInjury: boolean;
    hasFullThickness: boolean;
    threatLevel: 'very_low' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe';
  };
  inhalationInjury: boolean;
  associatedInjuries?: string;
  tetanusStatus: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BurnDepth = 
  | 'superficial'
  | 'superficial_partial'
  | 'deep_partial'
  | 'full_thickness';

export interface BurnArea {
  bodyPart: string;
  percentage: number;
  depth: BurnDepth;
}

// Treatment Plan - for wounds, burns, and other clinical care
export interface TreatmentPlan {
  id: string;
  patientId: string;
  relatedEntityId?: string; // woundId, burnId, surgeryId, etc.
  relatedEntityType?: 'wound' | 'burn' | 'surgery' | 'general';
  title: string;
  description?: string;
  clinicalGoals: TreatmentGoal[];
  orders: TreatmentOrder[];
  frequency: string; // 'daily', 'alternate_day', 'twice_daily', 'weekly', etc.
  startDate: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;
  status: 'active' | 'completed' | 'on_hold' | 'discontinued';
  phase?: string; // 'initial', 'week_1', 'week_2', 'week_3', 'week_4', 'monthly_follow_up'
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentGoal {
  id: string;
  description: string;
  targetDate?: Date;
  achievedDate?: Date;
  status: 'pending' | 'in_progress' | 'achieved' | 'not_achieved';
  metrics?: string; // measurable indicator
  notes?: string;
}

export interface TreatmentOrder {
  id: string;
  category: 'medication' | 'dressing' | 'procedure' | 'nutrition' | 'activity' | 'monitoring' | 'other';
  order: string;
  instructions?: string;
  frequency: string;
  duration: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'active' | 'completed' | 'discontinued';
  startDate: Date;
  endDate?: Date;
}

export interface TreatmentProgress {
  id: string;
  treatmentPlanId: string;
  date: Date;
  observations: string;
  measurements?: Record<string, number | string>; // wound size, vital signs, etc.
  ordersExecuted: string[]; // IDs of orders executed
  outcomeAssessment?: 'improved' | 'stable' | 'deteriorated';
  clinicianNotes?: string;
  photos?: string[];
  recordedBy: string;
  recordedAt: Date;
}

// Laboratory
export interface LabRequest {
  id: string;
  patientId: string;
  encounterId?: string;
  hospitalId: string;
  tests: LabTest[];
  priority: 'routine' | 'urgent' | 'stat';
  clinicalInfo?: string;
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
  requestedBy: string;
  requestedAt: Date;
  collectedAt?: Date;
  completedAt?: Date;
}

export interface LabTest {
  id: string;
  name: string;
  category: LabCategory;
  specimen: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  notes?: string;
}

export type LabCategory = 
  | 'haematology'
  | 'biochemistry'
  | 'microbiology'
  | 'serology'
  | 'urinalysis'
  | 'histopathology'
  | 'imaging';

// Pharmacy
export interface Prescription {
  id: string;
  patientId: string;
  encounterId?: string;
  hospitalId: string;
  medications: Medication[];
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  prescribedBy: string;
  prescribedAt: Date;
  dispensedBy?: string;
  dispensedAt?: Date;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  duration: string;
  quantity: number;
  instructions?: string;
  isDispensed: boolean;
}

export type MedicationRoute = 
  | 'oral'
  | 'intravenous'
  | 'intramuscular'
  | 'subcutaneous'
  | 'topical'
  | 'rectal'
  | 'inhalation'
  | 'sublingual'
  | 'ophthalmic'
  | 'otic'
  | 'nasal'
  | 'transdermal'
  | 'epidural'
  | 'spinal'
  | 'intrathecal'
  | 'nebulizer'
  | 'vaginal'
  | 'buccal'
  | 'intradermal'
  | 'intranasal'
  | 'intravesical'
  | 'intraarticular';

// Nutrition
export interface NutritionAssessment {
  id: string;
  patientId: string;
  encounterId?: string;
  hospitalId?: string;
  weight?: number;
  height?: number;
  mustScore: MUSTScore | number;
  bmi?: number;
  sgaGrade?: 'A' | 'B' | 'C';
  anthropometrics?: {
    weight: number;
    height: number;
    bmi: number;
    waistCircumference?: number;
    midArmCircumference?: number;
  };
  dietaryHistory?: string;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  allergies?: string[];
  nutritionalDiagnosis?: string;
  mealPlan?: MealPlan;
  supplementation?: string[];
  notes?: string;
  assessedBy: string;
  assessedAt: Date;
}

export interface MUSTScore {
  bmiScore: 0 | 1 | 2;
  weightLossScore: 0 | 1 | 2;
  acuteIllnessScore: 0 | 2;
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MealPlan {
  id: string;
  targetCalories: number;
  proteinRequirement: number; // g/day
  meals: Meal[];
  specialInstructions?: string;
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: string[];
  calories: number;
  notes?: string;
}

// Billing
export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  items: InvoiceItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  totalAmount?: number; // Alias for total
  amountPaid?: number;
  paidAmount?: number; // Alias for amountPaid
  balance?: number;
  status: 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paymentMethod?: PaymentMethod;
  dueDate?: Date;
  paidAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'medication' | 'laboratory' | 'imaging' | 'room' | 'other' | string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  total?: number; // Alias for amount
}

export type PaymentMethod = 
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'mobile_money'
  | 'insurance'
  | 'hmo';

// Audit Log
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Sync Status
export interface SyncStatus {
  id: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'synced' | 'failed';
  lastSyncedAt?: Date;
  errorMessage?: string;
}

// ==========================================
// ADMISSION MODULE
// ==========================================

export type AdmissionStatus = 'active' | 'discharged' | 'transferred' | 'deceased' | 'absconded';

export type WardType = 
  | 'general'
  | 'private'
  | 'semi-private'
  | 'icu'
  | 'hdu'
  | 'pediatric'
  | 'maternity'
  | 'surgical'
  | 'orthopedic'
  | 'burns'
  | 'isolation';

export interface Admission {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  
  // Admission Details
  admissionNumber: string;
  admissionDate: Date;
  admissionTime: string;
  admittedFrom: 'emergency' | 'outpatient' | 'transfer' | 'direct' | 'referral';
  admittedBy: string; // User ID of admitting clinician
  
  // Ward/Bed Information
  wardType: WardType;
  wardName: string;
  bedNumber: string;
  
  // Clinical Information
  admissionDiagnosis: string;
  chiefComplaint: string;
  indicationForAdmission: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  provisionalDiagnosis?: string[];
  comorbidities?: string[];
  allergies?: string[];
  
  // Care Team Assignment
  primaryDoctor: string; // User ID
  primaryNurse?: string; // User ID
  primaryManagingConsultant?: string; // User ID - Primary consultant who approves MDT plans
  primaryManagingConsultantName?: string; // Name for display
  consultants?: string[]; // User IDs of consulting specialists
  
  // Treatment Plan Link
  treatmentPlanId?: string;
  
  // Risk Assessments (DVT, Pressure Sore, Nutritional, Drug Allergies)
  riskAssessments?: {
    dvtCaprini?: any;
    pressureSore?: any;
    nutritional?: any;
    mealPlan?: any;
    drugAllergies?: any;
    completedAt?: Date;
  };
  
  // Status Tracking
  status: AdmissionStatus;
  estimatedStayDays?: number;
  
  // Discharge Information (populated when discharged)
  dischargeDate?: Date;
  dischargeTime?: string;
  dischargedBy?: string;
  dischargeType?: 'routine' | 'against_advice' | 'transfer' | 'death' | 'absconded';
  dischargeSummaryId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AdmissionNote {
  id: string;
  admissionId: string;
  noteType: 'progress' | 'nursing' | 'consultant' | 'procedure' | 'ward_round' | 'handover';
  content: string;
  authorId: string;
  authorRole: UserRole;
  createdAt: Date;
}

export interface BedAssignment {
  id: string;
  admissionId: string;
  wardName: string;
  bedNumber: string;
  assignedFrom: Date;
  assignedTo?: Date;
  reason?: string; // Reason for transfer if moved
}

// ==========================================
// COMMUNICATION MODULE - See extended types at end of file
// ==========================================

// ==========================================
// TREATMENT PLANNING MODULE (Encounter-based)
// ==========================================

export interface EncounterTreatmentPlan {
  id: string;
  patientId: string;
  encounterId: string;
  title: string;
  diagnosis: string;
  objectives: string[];
  assignedDoctorId: string;
  assignedNurseId: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  startDate: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;
  items: TreatmentPlanItem[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TreatmentItemType = 
  | 'investigation'
  | 'procedure'
  | 'surgery'
  | 'wound-review'
  | 'medication'
  | 'therapy'
  | 'follow-up'
  | 'referral';

export interface TreatmentPlanItem {
  id: string;
  type: TreatmentItemType;
  title: string;
  description: string;
  scheduledDate: Date;
  scheduledTime?: string;
  dueDate?: Date;
  assignedToId?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  reminderSent: boolean;
  reminderDate?: Date;
}

export interface EncounterTreatmentNotification {
  id: string;
  treatmentPlanId: string; // References EncounterTreatmentPlan
  treatmentItemId: string;
  userId: string;
  patientId: string;
  title: string;
  message: string;
  type: 'reminder' | 'overdue' | 'update' | 'assignment';
  isRead: boolean;
  isPushed: boolean;
  scheduledAt: Date;
  createdAt: Date;
}

// ==========================================
// PATIENT TIMELINE & SUMMARY
// ==========================================

export interface PatientTimelineEvent {
  id: string;
  patientId: string;
  eventType: 'encounter' | 'vitals' | 'investigation' | 'procedure' | 'medication' | 'surgery' | 'note' | 'admission' | 'discharge';
  title: string;
  description: string;
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  hospitalId: string;
  hospitalName: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ==========================================
// CONSENT FORMS MODULE
// ==========================================

export type ConsentType = 
  | 'general-treatment'
  | 'surgical-procedure'
  | 'blood-transfusion'
  | 'anesthesia'
  | 'photography'
  | 'research'
  | 'discharge-against-advice';

export interface ConsentForm {
  id: string;
  patientId: string;
  encounterId?: string;
  surgeryId?: string;
  type: ConsentType;
  title: string;
  procedureName?: string;
  procedureDescription?: string;
  risks: string[];
  benefits: string[];
  alternatives: string[];
  additionalInfo?: string;
  witnessName: string;
  witnessSignature?: string;
  patientSignature?: string;
  guardianName?: string;
  guardianSignature?: string;
  guardianRelationship?: string;
  doctorId: string;
  doctorName: string;
  doctorSignature?: string;
  consentGiven: boolean;
  consentDate: Date;
  expiryDate?: Date;
  status: 'pending' | 'signed' | 'declined' | 'expired' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// PREOPERATIVE MODULE (Legacy - deprecated, use PreoperativeAssessment instead)
// ==========================================

export interface PreoperativeAssessmentLegacy {
  id: string;
  patientId: string;
  surgeryId: string;
  assessedBy: string;
  assessedAt: Date;
  
  // Patient Details
  weight: number;
  height: number;
  bmi: number;
  asaScore: 1 | 2 | 3 | 4 | 5;
  
  // Comorbidities
  comorbidities: PreoperativeComorbidity[];
  
  // Current Medications
  currentMedications: PreoperativeMedication[];
  
  // Allergies
  allergies: string[];
  
  // Previous Surgeries
  previousSurgeries: PreviousSurgery[];
  
  // Anesthesia History
  anesthesiaHistory: AnesthesiaHistory;
  
  // Fasting Status
  fastingStatus: {
    lastSolidFood: Date;
    lastClearFluid: Date;
    isAdequate: boolean;
  };
  
  // WHO Checklist Items
  whoChecklist: WHOPreoperativeChecklist;
  
  // Required Investigations
  requiredInvestigations: PreoperativeInvestigation[];
  
  // Risk Assessment
  cardiacRisk: string;
  pulmonaryRisk: string;
  renalRisk: string;
  bleedingRisk: string;
  vteRisk: string;
  
  // Optimization Required
  optimizationNeeded: boolean;
  optimizationPlan?: string;
  
  // Clearance
  isCleared: boolean;
  clearanceNotes?: string;
  
  status: 'pending' | 'in-progress' | 'cleared' | 'not-cleared' | 'postponed';
  createdAt: Date;
  updatedAt: Date;
}

export interface PreoperativeComorbidity {
  condition: string;
  severity: 'mild' | 'moderate' | 'severe';
  controlled: boolean;
  medications: string[];
  lastAssessment?: Date;
  relevantTests?: string;
  surgicalImplications: string[];
}

export interface PreoperativeMedication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  indication: string;
  stopBeforeSurgery: boolean;
  daysToStopBefore?: number;
  bridgingRequired?: boolean;
  bridgingPlan?: string;
  resumeAfterSurgery?: string;
  surgicalRisk: string;
}

export interface PreviousSurgery {
  procedure: string;
  year: number;
  complications?: string;
  anesthesiaType?: string;
}

export interface AnesthesiaHistory {
  previousAnesthesia: boolean;
  anesthesiaType?: string;
  complications?: string;
  familyHistory?: string;
  mallampatiScore?: 1 | 2 | 3 | 4;
  airwayAssessment?: string;
}

export interface WHOPreoperativeChecklist {
  patientIdentityConfirmed: boolean;
  procedureConfirmed: boolean;
  siteMarked: boolean;
  consentSigned: boolean;
  anesthesiaMachineChecked: boolean;
  pulseOximeterWorking: boolean;
  allergiesChecked: boolean;
  difficultAirwayRisk: boolean;
  aspirationRisk: boolean;
  bloodLossRisk: boolean;
  ivAccessEstablished: boolean;
  antibioticProphylaxisGiven: boolean;
  antibioticProphylaxisNotApplicable: boolean;
  vteProhylaxisGiven: boolean;
  bloodProductsAvailable: boolean;
  imagingDisplayed: boolean;
}

export interface PreoperativeInvestigation {
  id: string;
  name: string;
  type: 'laboratory' | 'imaging' | 'cardiac' | 'pulmonary' | 'other';
  indication: string;
  priority: 'routine' | 'urgent';
  status: 'ordered' | 'pending' | 'completed' | 'reviewed';
  result?: string;
  isNormal?: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

// ==========================================
// INTRAOPERATIVE MODULE
// ==========================================

export interface IntraoperativeRecord {
  id: string;
  patientId: string;
  surgeryId: string;
  
  // Timing
  patientInTime: Date;
  anesthesiaStartTime: Date;
  surgeryStartTime: Date;
  surgeryEndTime: Date;
  anesthesiaEndTime: Date;
  patientOutTime: Date;
  
  // Team
  leadSurgeon: SurgicalTeamMember;
  assistantSurgeons: SurgicalTeamMember[];
  anesthetist: SurgicalTeamMember;
  anesthesiaNurse?: SurgicalTeamMember;
  scrubNurse: SurgicalTeamMember;
  circulatingNurse: SurgicalTeamMember;
  
  // Positioning
  position: string;
  positioningAids: string[];
  pressurePointsProtected: boolean;
  
  // Preparation
  skinPreparation: string;
  preparationSolution: string;
  draping: string;
  
  // Anesthesia
  anesthesiaType: 'general' | 'spinal' | 'epidural' | 'regional' | 'local' | 'sedation' | 'combined';
  anesthesiaDetails: string;
  airwayManagement?: string;
  intubationType?: string;
  
  // Incision
  incisionType: string;
  incisionLocation: string;
  incisionTime: Date;
  
  // Intraoperative Findings
  findings: string;
  diagnosisConfirmed: boolean;
  unexpectedFindings?: string;
  
  // Procedure Details
  procedurePerformed: string;
  procedureDetails: string;
  specimens: OperativeSpecimen[];
  
  // Hemostasis & Closure
  hemostasisMethod: string;
  bloodLoss: number; // mL
  bloodTransfused?: number;
  closureLayers: ClosureLayer[];
  drains: Drain[];
  dressingType: string;
  
  // Counts
  spongeCountCorrect: boolean;
  instrumentCountCorrect: boolean;
  needleCountCorrect: boolean;
  countDiscrepancy?: string;
  
  // Complications
  intraoperativeComplications: string[];
  
  // WHO Sign Out
  whoSignOut: WHOSignOut;
  
  // Notes
  operativeNotes: string;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurgicalTeamMember {
  userId: string;
  name: string;
  role: string;
  specialization?: string;
}

export interface OperativeSpecimen {
  id: string;
  type: string;
  site: string;
  description: string;
  sentForHistology: boolean;
  labId?: string;
}

export interface ClosureLayer {
  layer: string;
  sutureMaterial: string;
  sutureSize: string;
  technique: string;
}

export interface Drain {
  type: string;
  site: string;
  secured: boolean;
}

export interface WHOSignOut {
  procedureRecorded: boolean;
  specimenLabeled: boolean;
  equipmentProblems: boolean;
  equipmentProblemsDetails?: string;
  recoveryPlanConfirmed: boolean;
}

// ==========================================
// POSTOPERATIVE MODULE
// ==========================================

export interface PostoperativeInstructions {
  id: string;
  patientId: string;
  surgeryId: string;
  intraoperativeRecordId: string;
  
  // Monitoring
  vitalSignsFrequency: string;
  specialMonitoring: string[];
  inputOutputMonitoring: boolean;
  
  // Position & Activity
  position: string;
  activityLevel: string;
  mobilizationPlan: string;
  
  // Diet
  dietInstructions: string;
  npoUntil?: Date;
  fluidRestriction?: string;
  
  // Medications
  medications: PostoperativeMedication[];
  
  // Wound Care
  woundCareInstructions: string;
  dressingChangeFrequency?: string;
  drainCare?: string;
  
  // Warning Signs
  warningSigns: string[];
  callDoctorIf: string[];
  
  // Follow-up
  followUpPlan: string;
  nextReviewDate?: Date;
  
  // VTE Prophylaxis
  vteProphylaxis: string;
  
  // Pain Management
  painManagementPlan: string;
  
  // Special Instructions
  specialInstructions: string[];
  
  // Approved By
  approvedBy: string;
  approvedAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PostoperativeMedication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  indication: string;
  specialInstructions?: string;
}

// ==========================================
// DISCHARGE SUMMARY MODULE
// ==========================================

export interface DischargeSummary {
  id: string;
  patientId: string;
  encounterId: string;
  admissionDate: Date;
  dischargeDate: Date;
  
  // Admission Details
  admittingDiagnosis: string;
  finalDiagnosis: string[];
  comorbidities: string[];
  
  // Hospital Course
  hospitalCourse: string;
  proceduresPerformed: DischargeProcedure[];
  consultations: string[];
  
  // Condition at Discharge
  conditionAtDischarge: 'improved' | 'stable' | 'unchanged' | 'deteriorated';
  dischargeDisposition: 'home' | 'facility' | 'hospice' | 'transfer' | 'against-advice' | 'deceased';
  
  // Discharge Medications
  dischargeMedications: DischargeMedication[];
  medicationsDiscontinued: string[];
  
  // Instructions
  dietaryInstructions: string;
  activityRestrictions: string;
  woundCareInstructions?: string;
  warningSignsToWatch: string[];
  
  // Follow-up
  followUpAppointments: FollowUpAppointment[];
  pendingTests: string[];
  pendingReferrals: string[];
  
  // Contact Information
  emergencyContact: string;
  clinicContact: string;
  
  // Prepared By
  preparedBy: string;
  preparedByName: string;
  attendingPhysician: string;
  attendingPhysicianName: string;
  
  // Tracking
  followUpTracking: FollowUpTracking[];
  
  status: 'draft' | 'completed' | 'exported';
  createdAt: Date;
  updatedAt: Date;
}

export interface DischargeProcedure {
  name: string;
  date: Date;
  surgeon: string;
  outcome: string;
}

export interface DischargeMedication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  purpose: string;
  isNew: boolean;
  specialInstructions?: string;
}

export interface FollowUpAppointment {
  id: string;
  type: string;
  department: string;
  scheduledDate: Date;
  doctor?: string;
  instructions?: string;
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  reminderSent: boolean;
}

export interface FollowUpTracking {
  appointmentId: string;
  status: 'pending' | 'attended' | 'missed' | 'rescheduled';
  notes?: string;
  remindersSent: number;
  lastReminderDate?: Date;
  updatedAt: Date;
}

// ============ COMMUNICATION TYPES ============

// Chat Room Types
export type ChatRoomType = 'direct' | 'group' | 'department' | 'case_discussion' | 'emergency';

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  description?: string;
  hospitalId?: string;
  participants: ChatParticipant[];
  admins: string[]; // User IDs
  patientId?: string; // For case discussions
  isArchived: boolean;
  lastMessageAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  userId: string;
  userName: string;
  userRole: UserRole;
  avatar?: string;
  joinedAt: Date;
  lastReadAt?: Date;
  isOnline?: boolean;
  isMuted?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'system' | 'urgent';
  attachments?: ChatAttachment[];
  replyTo?: string; // Message ID
  reactions?: ChatReaction[];
  isEdited: boolean;
  isDeleted: boolean;
  readBy: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface ChatReaction {
  emoji: string;
  userId: string;
  userName: string;
}

// Video Conference Types
export type ConferenceStatus = 'scheduled' | 'waiting' | 'active' | 'ended' | 'cancelled';

export interface VideoConference {
  id: string;
  title: string;
  description?: string;
  hospitalId?: string;
  hostId: string;
  hostName: string;
  coHostIds?: string[]; // Array of co-host user IDs
  roomId?: string; // Room identifier
  participants: ConferenceParticipant[];
  invitedUsers: string[]; // User IDs
  patientId?: string; // For case presentations
  scheduledStart?: Date; // Made optional for on-demand meetings
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: ConferenceStatus;
  roomCode: string; // For joining
  settings: ConferenceSettings;
  presentation?: PresentationState;
  recordings?: ConferenceRecording[];
  chatEnabled: boolean;
  chatMessages: ConferenceChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConferenceParticipant {
  id: string;
  oderId: string;
  odId?: string; // WebRTC offer/answer ID for signaling
  odSdp?: string; // SDP offer/answer
  userId: string;
  userName: string;
  userRole: UserRole;
  role?: 'host' | 'co_host' | 'presenter' | 'participant'; // Conference-specific role
  avatar?: string;
  joinedAt?: Date;
  leftAt?: Date;
  isHost: boolean;
  isCoHost: boolean;
  isPresenter: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  admissionStatus: 'waiting' | 'admitted' | 'rejected'; // For waiting room
}

// WebRTC Signaling types for peer-to-peer video
export interface RTCSignalingMessage {
  id: string;
  conferenceId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string; // 'all' for broadcast
  type: 'offer' | 'answer' | 'ice-candidate' | 'participant-update';
  payload: string; // JSON stringified SDP or ICE candidate
  createdAt: Date;
}

export interface ConferenceSettings {
  allowParticipantsToUnmute: boolean;
  allowParticipantsToShareScreen: boolean;
  allowParticipantsToChat: boolean;
  muteOnEntry: boolean;
  videoOffOnEntry: boolean;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  maxParticipants: number;
}

export interface PresentationState {
  isActive: boolean;
  presenterId?: string;
  presenterName?: string;
  slides: PresentationSlide[];
  currentSlideIndex: number;
  totalSlides: number;
  startedAt?: Date;
}

export interface PresentationSlide {
  id: string;
  index: number;
  title?: string;
  imageUrl: string; // Base64 or URL
  thumbnailUrl?: string;
  notes?: string;
  duration?: number; // Time spent on slide in seconds
}

export interface ConferenceRecording {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size?: number;
  url?: string;
  status: 'recording' | 'processing' | 'available' | 'failed';
}

export interface ConferenceChatMessage {
  id: string;
  conferenceId?: string; // Conference ID for message association
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'system' | 'reaction' | 'poll' | 'private';
  isPrivate: boolean;
  recipientId?: string;
  recipientName?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  reactions?: MessageReaction[];
  pollId?: string;
  createdAt: Date;
}

// Message Reactions
export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

// Meeting Reactions (hand raise, applause, etc.)
export interface MeetingReaction {
  id: string;
  participantId: string;
  participantName: string;
  type: 'raise_hand' | 'applause' | 'thumbs_up' | 'thumbs_down' | 'heart' | 'laugh' | 'surprised' | 'thinking';
  createdAt: Date;
  expiresAt?: Date; // For temporary reactions like applause
}

// Polls
export interface ConferencePoll {
  id: string;
  conferenceId: string;
  createdBy: string;
  createdByName: string;
  question: string;
  options: PollOption[];
  votes?: PollVote[]; // Array of all votes cast
  isAnonymous: boolean;
  allowMultiple: boolean;
  status: 'active' | 'closed' | 'ended';
  createdAt: Date;
  closedAt?: Date;
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters?: string[]; // User IDs (only if not anonymous)
}

export interface PollVote {
  pollId: string;
  optionId: string;
  voterId: string;
  voterName: string;
  createdAt: Date;
}

// Q&A Session
export interface ConferenceQA {
  id: string;
  conferenceId: string;
  askerId: string;
  askerName: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredByName?: string;
  isAnswered: boolean;
  isPinned: boolean;
  upvotes: number;
  upvoters: string[];
  createdAt: Date;
  answeredAt?: Date;
}

// Enhanced Conference Settings
export interface EnhancedConferenceSettings {
  // Permissions
  allowParticipantsToUnmute: boolean;
  allowParticipantsToShareScreen: boolean;
  allowParticipantsToChat: boolean;
  allowParticipantsToRaiseHand: boolean;
  allowParticipantsToReact: boolean;
  allowPrivateChat: boolean;
  
  // Entry settings
  muteOnEntry: boolean;
  videoOffOnEntry: boolean;
  waitingRoomEnabled: boolean;
  
  // Meeting controls
  recordingEnabled: boolean;
  transcriptionEnabled: boolean;
  isMeetingLocked: boolean;
  maxParticipants: number;
  
  // Layout
  defaultLayout: 'grid' | 'speaker' | 'presentation';
  hideNonVideoParticipants: boolean;
}

// ==================== WARD ROUNDS ====================

export interface WardRound {
  id: string;
  hospitalId: string;
  wardName: string;
  roundDate: Date;
  roundTime: string;
  roundType: 'morning' | 'evening' | 'night' | 'consultant' | 'teaching' | 'emergency';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  leadDoctorId: string;
  leadDoctorName: string;
  leadDoctorDesignation?: 'consultant' | 'senior_registrar' | 'registrar' | 'resident' | 'house_officer';
  teamMembers: WardRoundTeamMember[];
  patients: WardRoundPatient[];
  notes?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WardRoundTeamMember {
  userId: string;
  name: string;
  role: UserRole;
  specialty?: string;
  isPresent: boolean;
  joinedAt?: Date;
}

export interface WardRoundPatient {
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  bedNumber: string;
  admissionId?: string;
  diagnosis: string;
  status: 'pending' | 'reviewed' | 'skipped';
  notes?: string;
  orders?: string[];
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface DoctorPatientAssignment {
  id: string;
  hospitalId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  wardName?: string;
  bedNumber?: string;
  assignmentType: 'primary' | 'consultant' | 'covering' | 'on_call';
  priority: 'routine' | 'high' | 'urgent' | 'critical';
  status: 'active' | 'completed' | 'transferred';
  notes?: string;
  assignedBy: string;
  assignedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NursePatientAssignment {
  id: string;
  hospitalId: string;
  nurseId: string;
  nurseName: string;
  nurseSpecialty?: string;
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  wardName?: string;
  bedNumber?: string;
  shiftType: 'morning' | 'afternoon' | 'night';
  assignmentDate: Date;
  status: 'active' | 'completed' | 'handover';
  careLevel: 'routine' | 'intermediate' | 'intensive' | 'critical';
  tasks?: NursingTask[];
  notes?: string;
  assignedBy: string;
  handoverNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NursingTask {
  id: string;
  task: string;
  frequency: string;
  lastCompleted?: Date;
  nextDue?: Date;
  status: 'pending' | 'completed' | 'overdue';
}

// ==================== INVESTIGATION RESULTS TRACKING ====================

export interface Investigation {
  id: string;
  patientId: string;
  patientName?: string;
  hospitalNumber?: string;
  hospitalId: string;
  hospitalName?: string;
  encounterId?: string;
  admissionId?: string;
  type: InvestigationType | string;
  typeName?: string;
  category: 'laboratory' | 'radiology' | 'pathology' | 'cardiology' | 'other' | 'hematology' | 'biochemistry' | 'microbiology' | 'imaging' | 'histopathology';
  name?: string;
  description?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'requested' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  fasting?: boolean;
  clinicalDetails?: string;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: Date;
  
  // Approval Workflow Fields
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  autoRequested?: boolean; // True if auto-created after approval
  sourceApprovalId?: string; // Link to the approval that triggered auto-request
  
  collectedAt?: Date;
  sampleCollectedAt?: Date;
  collectedBy?: string;
  processingStartedAt?: Date;
  processedAt?: Date;
  processedBy?: string;
  completedAt?: Date;
  completedBy?: string;
  completedByName?: string;
  reportedBy?: string;
  results?: InvestigationResult[];
  attachments?: InvestigationAttachment[];
  interpretation?: string;
  notes?: string;
  clinicalInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InvestigationType =
  | 'full_blood_count'
  | 'liver_function'
  | 'renal_function'
  | 'electrolytes'
  | 'blood_glucose'
  | 'hba1c'
  | 'lipid_profile'
  | 'thyroid_function'
  | 'cardiac_markers'
  | 'coagulation'
  | 'urinalysis'
  | 'stool_analysis'
  | 'blood_culture'
  | 'urine_culture'
  | 'xray'
  | 'ultrasound'
  | 'ct_scan'
  | 'mri'
  | 'ecg'
  | 'echocardiogram'
  | 'biopsy'
  | 'cytology'
  | 'other';

export interface InvestigationResult {
  id: string;
  investigationId?: string;
  parameter: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  status?: 'normal' | 'low' | 'high' | 'critical' | 'abnormal';
  flag?: 'L' | 'H' | 'LL' | 'HH' | 'A' | 'normal' | 'low' | 'high' | 'critical';
  interpretation?: string;
  previousValue?: string | number;
  previousDate?: Date;
  trend?: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  resultDate?: Date;
  recordedAt?: Date;
}

export interface InvestigationAttachment {
  id: string;
  type?: 'image' | 'pdf' | 'report' | 'scan';
  fileName: string;
  fileType?: string;
  fileSize: number;
  mimeType?: string;
  url: string; // Base64 or URL
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
}

export interface InvestigationTrend {
  patientId: string;
  parameter: string;
  investigationType: InvestigationType;
  dataPoints: TrendDataPoint[];
  overallTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
  lastUpdated: Date;
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  status: 'normal' | 'low' | 'high' | 'critical';
  investigationId: string;
}

// ==================== ENHANCED VIDEO CONFERENCE ====================

export interface EnhancedVideoConference {
  id: string;
  roomId: string;
  title: string;
  type: 'consultation' | 'ward_round' | 'case_discussion' | 'teaching' | 'presentation' | 'team_meeting';
  hostId: string;
  hostName: string;
  hospitalId?: string;
  status: 'scheduled' | 'waiting' | 'active' | 'ended';
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  participants: EnhancedParticipant[];
  settings: EnhancedConferenceSettings;
  presentation?: EnhancedPresentationState;
  recordings: ConferenceRecordingInfo[];
  chat: ConferenceChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EnhancedParticipant {
  id: string;
  odId: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isHost: boolean;
  isCoHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  isPresenting: boolean;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  deviceInfo?: DeviceInfo;
  virtualBackground?: VirtualBackground;
  joinedAt: Date;
  leftAt?: Date;
}

export interface DeviceInfo {
  cameraId?: string;
  cameraName?: string;
  microphoneId?: string;
  microphoneName?: string;
  speakerId?: string;
  speakerName?: string;
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt';
  microphonePermission: 'granted' | 'denied' | 'prompt';
}

export interface VirtualBackground {
  isEnabled: boolean;
  type: 'none' | 'blur' | 'image' | 'video';
  blurLevel?: 'light' | 'medium' | 'heavy';
  imageUrl?: string;
  videoUrl?: string;
  customImages?: string[];
}

export interface EnhancedConferenceSettings {
  allowParticipantsToUnmute: boolean;
  allowParticipantsToShareScreen: boolean;
  allowParticipantsToChat: boolean;
  allowParticipantsToPresent: boolean;
  muteOnEntry: boolean;
  videoOffOnEntry: boolean;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  autoRecordEnabled: boolean;
  maxParticipants: number;
  allowVirtualBackgrounds: boolean;
  defaultVirtualBackground?: string;
  presenterModeEnabled: boolean;
  layoutMode: 'gallery' | 'speaker' | 'presenter' | 'sidebar';
}

export interface EnhancedPresentationState {
  isActive: boolean;
  mode: 'slides' | 'screen_share' | 'presenter_view';
  presenterId: string;
  presenterName: string;
  presenterVideoEnabled: boolean;
  slides: PresentationSlide[];
  currentSlideIndex: number;
  totalSlides: number;
  layout: 'full' | 'split_horizontal' | 'split_vertical' | 'picture_in_picture';
  presenterPosition: 'left' | 'right' | 'top' | 'bottom' | 'corner';
  startedAt: Date;
  annotations?: PresentationAnnotation[];
}

export interface PresentationAnnotation {
  id: string;
  slideIndex: number;
  type: 'pointer' | 'highlight' | 'drawing' | 'text';
  data: string;
  createdBy: string;
  createdAt: Date;
}

export interface ConferenceRecordingInfo {
  id: string;
  type: 'full' | 'presentation_only' | 'audio_only';
  status: 'recording' | 'paused' | 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  fileSize?: number;
  url?: string;
  thumbnailUrl?: string;
  recordedBy: string;
  includesPresentation: boolean;
  includesChat: boolean;
}
// ==========================================
// ENHANCED DISCHARGE MODULE (v2)
// ==========================================

export type DischargeType = 
  | 'routine'
  | 'against_advice'
  | 'transfer'
  | 'death'
  | 'absconded';

export interface EnhancedDischargeSummary {
  id: string;
  patientId: string;
  admissionId: string;
  hospitalId: string;
  
  // Basic Info
  dischargeDate: Date;
  dischargeTime: string;
  dischargeType: DischargeType;
  dischargedBy: string;
  
  // Clinical Summary
  admissionDiagnosis: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  proceduresPerformed: string[];
  
  // Hospital Course
  briefHospitalCourse: string;
  keyFindings: string[];
  investigationsSummary: string;
  treatmentGiven: string;
  complications: string[];
  
  // Condition at Discharge
  conditionAtDischarge: 'improved' | 'stable' | 'unchanged' | 'worse' | 'deceased';
  vitalSignsAtDischarge: {
    bloodPressure: string;
    pulse: number;
    temperature: number;
    respiratoryRate: number;
    oxygenSaturation: number;
  };
  functionalStatus: string;
  
  // Take-Home Medications
  takeHomeMedications: TakeHomeMedication[];
  
  // Instructions & Plans
  takeHomeInstructions: TakeHomeInstruction[];
  dietaryRecommendations: DietaryRecommendation[];
  lifestyleModifications: LifestyleModification[];
  activityRestrictions: string[];
  woundCareInstructions?: string;
  
  // Follow-up
  followUpAppointments: EnhancedFollowUpAppointment[];
  referrals: DischargeReferral[];
  warningSignsToWatch: string[];
  emergencyContact: string;
  
  // Generated Plans
  mealPlan?: GeneratedMealPlan;
  recoveryPlan?: RecoveryPlan;
  
  // Signatures
  doctorSignature?: string;
  patientAcknowledgement: boolean;
  patientSignature?: string;
  patientSignatureDate?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface TakeHomeMedication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  instructions: string;
  purpose: string;
  isNewMedication: boolean;
  refillsAllowed: number;
}

export interface TakeHomeInstruction {
  id: string;
  category: 'wound_care' | 'medication' | 'activity' | 'diet' | 'hygiene' | 'warning_signs' | 'follow_up' | 'other';
  title: string;
  instruction: string;
  priority: 'essential' | 'important' | 'recommended';
  timing?: string;
}

export interface DietaryRecommendation {
  id: string;
  category: 'foods_to_eat' | 'foods_to_avoid' | 'fluid_intake' | 'supplements' | 'meal_timing';
  recommendation: string;
  reason: string;
  duration?: string;
}

export interface LifestyleModification {
  id: string;
  category: 'exercise' | 'smoking' | 'alcohol' | 'sleep' | 'stress' | 'work' | 'driving' | 'sexual_activity' | 'other';
  recommendation: string;
  duration: string;
  importance: 'critical' | 'important' | 'helpful';
  startDate?: string;
}

export interface EnhancedFollowUpAppointment {
  id: string;
  specialty: string;
  doctorName?: string;
  purpose: string;
  recommendedDate: Date;
  location?: string;
  notes?: string;
  isBooked: boolean;
}

export interface DischargeReferral {
  id: string;
  specialty: string;
  reason: string;
  urgency: 'routine' | 'soon' | 'urgent';
  facilityName?: string;
  contactInfo?: string;
}

export interface GeneratedMealPlan {
  id: string;
  duration: string;
  calorieTarget: number;
  proteinTarget: number;
  meals: MealPlanDay[];
  specialConsiderations: string[];
  supplements: string[];
}

export interface MealPlanDay {
  day: number;
  breakfast: MealItem;
  midMorningSnack?: MealItem;
  lunch: MealItem;
  afternoonSnack?: MealItem;
  dinner: MealItem;
  eveningSnack?: MealItem;
}

export interface MealItem {
  name: string;
  ingredients: string[];
  calories: number;
  protein: number;
  preparation?: string;
  alternatives?: string[];
}

export interface RecoveryPlan {
  id: string;
  phases: RecoveryPhase[];
  milestones: RecoveryMilestone[];
  expectedFullRecovery: string;
}

export interface RecoveryPhase {
  name: string;
  duration: string;
  startDay: number;
  endDay: number;
  goals: string[];
  activities: string[];
  restrictions: string[];
  expectedProgress: string;
}

export interface RecoveryMilestone {
  name: string;
  expectedDay: number;
  description: string;
  criteria: string[];
}

// ==========================================
// CONSUMABLE BOM (Bill of Materials) MODULE
// ==========================================

export interface ConsumableBOM {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  
  // Service Details
  serviceType: 'wound_care' | 'dressing' | 'debridement' | 'suturing' | 'catheter' | 'injection' | 'other';
  serviceName: string;
  procedureCode?: string;
  
  // Wound-specific details
  woundDetails?: WoundBOMDetails;
  
  // Items
  consumables: ConsumableItem[];
  professionalFees: ProfessionalFee[];
  
  // Totals
  consumablesTotal: number;
  professionalFeesTotal: number;
  grandTotal: number;
  
  // Metadata
  performedBy: string;
  performedAt: Date;
  notes?: string;
  
  // Invoice
  invoiceGenerated: boolean;
  invoiceId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface WoundBOMDetails {
  woundId?: string;
  woundType: string;
  woundSize: 'small' | 'medium' | 'large';
  woundLocation: string;
  proceduresPerformed: WoundProcedure[];
}

export type WoundProcedure = 
  | 'inspection'
  | 'cleaning'
  | 'dressing'
  | 'debridement_sharp'
  | 'debridement_mechanical'
  | 'debridement_enzymatic'
  | 'negative_pressure'
  | 'suturing'
  | 'skin_grafting';

export interface ConsumableItem {
  id: string;
  name: string;
  category: 'dressing' | 'antiseptic' | 'suture' | 'gloves' | 'instruments' | 'irrigation' | 'other';
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isReusable: boolean;
}

export interface ProfessionalFee {
  id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'nursing' | 'specialty' | 'after_hours';
  woundSize?: 'small' | 'medium' | 'large';
  baseAmount: number;
  modifiers: ProfessionalFeeModifier[];
  finalAmount: number;
}

export interface ProfessionalFeeModifier {
  type: 'complexity' | 'after_hours' | 'emergency' | 'specialist' | 'equipment';
  description: string;
  percentage: number;
}

// ==========================================
// HISTOPATHOLOGY REQUEST (WHO Standards)
// ==========================================

export interface HistopathologyRequest {
  id: string;
  patientId: string;
  encounterId?: string;
  surgeryId?: string;
  
  // Request Info
  requestDate: Date;
  requestedBy: string;
  requestingDepartment: string;
  priority: 'routine' | 'urgent' | 'frozen_section';
  
  // Clinical Information (WHO Required)
  clinicalHistory: string;
  clinicalDiagnosis: string;
  relevantInvestigations: string;
  previousBiopsies?: string;
  familyHistory?: string;
  riskFactors?: string[];
  
  // Specimen Details (WHO Required)
  specimenType: HistopathologySpecimenType;
  specimenSite: string;
  specimenLaterality?: 'left' | 'right' | 'bilateral' | 'midline' | 'not_applicable';
  specimenSize?: string;
  specimenWeight?: string;
  numberOfSpecimens: number;
  specimenOrientation?: string;
  
  // Collection Details
  collectionMethod: 'excision' | 'incision' | 'punch' | 'shave' | 'curettage' | 'aspiration' | 'other';
  collectionDate: Date;
  collectionTime: string;
  collector: string;
  
  // Fixation (WHO Required)
  fixative: 'formalin_10' | 'formalin_buffered' | 'alcohol' | 'fresh' | 'other';
  fixationTime?: string;
  
  // Special Requirements
  specialStains?: string[];
  immunohistochemistry?: string[];
  molecularStudies?: string[];
  electronMicroscopy: boolean;
  frozenSection: boolean;
  
  // Operative Findings (if surgical)
  operativeFindings?: string;
  surgicalMargins?: string;
  lymphNodesSubmitted?: number;
  
  // Additional WHO Fields
  tumorMarkers?: string[];
  stagingInfo?: string;
  treatmentHistory?: string;
  radiationHistory?: string;
  chemotherapyHistory?: string;
  
  // Status
  status: 'pending' | 'received' | 'processing' | 'reported' | 'amended';
  receivedAt?: Date;
  reportedAt?: Date;
  
  // Results
  grossDescription?: string;
  microscopicDescription?: string;
  diagnosis?: string;
  synopticReport?: HistopathologySynoptic;
  stageClassification?: string;
  gradeClassification?: string;
  margins?: string;
  
  // Pathologist
  pathologist?: string;
  pathologistSignature?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export type HistopathologySpecimenType = 
  | 'biopsy'
  | 'excision'
  | 'resection'
  | 'amputation'
  | 'curettage'
  | 'aspiration'
  | 'fluid'
  | 'smear'
  | 'frozen_section';

export interface HistopathologySynoptic {
  tumorType?: string;
  histologicGrade?: string;
  tumorSize?: string;
  margins?: string;
  lymphNodes?: {
    examined: number;
    positive: number;
  };
  vascularInvasion?: boolean;
  perineuralInvasion?: boolean;
  stage?: string;
  additionalFindings?: string[];
}

// ==========================================
// BLOOD TRANSFUSION MODULE
// ==========================================

export interface BloodTransfusion {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  surgeryId?: string;
  hospitalId?: string;
  
  // Request Details
  requestDate: Date;
  requestedBy: string;
  indication: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  
  // Patient Blood Info
  patientBloodGroup: BloodGroup;
  patientRhFactor: 'positive' | 'negative';
  patientAntibodies?: string[];
  
  // Blood Product Details
  productType: BloodProductType;
  unitNumber: string;
  donorBloodGroup: BloodGroup;
  donorRhFactor: 'positive' | 'negative';
  volumeMl: number;
  expiryDate: Date;
  
  // Crossmatch
  crossmatchResult: 'compatible' | 'incompatible' | 'pending';
  crossmatchDate?: Date;
  crossmatchBy?: string;
  
  // Transfusion Details
  transfusionStart?: Date;
  transfusionEnd?: Date;
  transfusionRate?: number;
  administeredBy?: string;
  witnessedBy?: string;
  
  // Vitals
  preVitals?: TransfusionVitals;
  monitoringVitals?: TransfusionVitals[];
  postVitals?: TransfusionVitals;
  
  // Reactions
  reactionOccurred: boolean;
  reactionType?: TransfusionReactionType;
  reactionTime?: Date;
  reactionSeverity?: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reactionManagement?: string;
  
  // Outcome
  outcome?: 'completed' | 'stopped' | 'reaction';
  notes?: string;
  
  // Status
  status: 'requested' | 'crossmatched' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  
  createdAt: Date;
  updatedAt: Date;
}

export type BloodProductType = 
  | 'whole_blood'
  | 'packed_red_cells'
  | 'fresh_frozen_plasma'
  | 'platelets'
  | 'cryoprecipitate'
  | 'albumin'
  | 'immunoglobulin';

export type TransfusionReactionType = 
  | 'febrile'
  | 'allergic'
  | 'hemolytic_acute'
  | 'hemolytic_delayed'
  | 'anaphylactic'
  | 'trali'
  | 'taco'
  | 'septic'
  | 'other';

export interface TransfusionVitals {
  time: Date;
  temperature: number;
  pulse: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  notes?: string;
}

// Transfusion Record (for tracking actual transfusion process)
export interface TransfusionRecord {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  unitId: string;
  productType: string;
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
  reaction?: {
    id: string;
    transfusionId: string;
    detectedAt: Date;
    type: string;
    severity: string;
    symptoms: string[];
    vitalsAtReaction: TransfusionVitals;
    transfusionStopped: boolean;
    stoppedAt?: Date;
    interventions: string[];
    outcome: string;
  };
  notes?: string;
}

// ==========================================
// MDT (MULTIDISCIPLINARY TEAM) MEETING MODULE
// ==========================================

export interface MDTMeeting {
  id: string;
  patientId: string;
  hospitalId?: string;
  
  // Meeting Details
  meetingDate: Date;
  meetingTime?: string;
  meetingType: 'tumor_board' | 'case_conference' | 'mortality_morbidity' | 'grand_rounds' | 'other';
  location?: string;
  
  // Case Presentation
  casePresenter?: string;
  caseSummary?: string;
  
  // Attendees
  attendees: MDTAttendee[];
  specialtiesRepresented: string[];
  
  // Clinical Details
  diagnosis?: string;
  staging?: {
    t?: string;
    n?: string;
    m?: string;
    stage?: string;
    grading?: string;
  };
  relevantInvestigations?: string[];
  imagingReviewed?: string[];
  pathologyReviewed?: string[];
  
  // Discussion
  discussionPoints?: string[];
  treatmentOptions?: MDTTreatmentOption[];
  
  // Recommendations
  mdtRecommendation?: string;
  treatmentPlan?: string;
  clinicalTrialEligibility?: boolean;
  clinicalTrialDetails?: string;
  
  // Follow-up
  followUpRequired?: boolean;
  followUpDate?: Date;
  followUpActions?: string[];
  
  // Documentation
  minutes?: string;
  recordedBy?: string;
  
  // Status
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface MDTAttendee {
  id: string;
  name: string;
  role: string;
  specialty: string;
  present: boolean;
  contribution?: string;
}

export interface MDTTreatmentOption {
  option: string;
  pros: string[];
  cons: string[];
  recommendation?: 'recommended' | 'alternative' | 'not_recommended';
}

// ==========================================
// NUTRITION PLAN MODULE
// ==========================================

export interface NutritionPlan {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  hospitalId?: string;
  
  // Patient Metrics
  weight: number;
  height: number;
  bmi: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  clinicalCondition?: string;
  stressFactor?: number;
  
  // Calculated Requirements
  bmr: number;
  tdee: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  fluidTarget: number;
  
  // Plan Details
  mealFrequency: number;
  snacksPerDay: number;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  foodPreferences?: string[];
  
  // Meal Plans
  mealPlans?: NutritionMealPlan[];
  weeklyMenu?: WeeklyMenu;
  
  // Special Considerations
  enteralFeeding?: boolean;
  enteralFormula?: string;
  enteralRate?: number;
  parenteralNutrition?: boolean;
  parenteralDetails?: {
    type: string;
    volume: number;
    rate: number;
    composition: string;
  };
  
  // Supplements
  supplements?: NutritionSupplement[];
  
  // Monitoring
  monitoringParameters?: string[];
  weightGoals?: {
    targetWeight: number;
    weeklyChange: number;
    targetDate: Date;
  };
  
  // Metadata
  planType: 'standard' | 'weight_loss' | 'weight_gain' | 'renal' | 'diabetic' | 'cardiac' | 'oncology' | 'pediatric' | 'geriatric' | 'custom';
  status: 'active' | 'completed' | 'on_hold' | 'discontinued';
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionMealPlan {
  dayOfWeek: number;
  meals: NutritionMeal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface NutritionMeal {
  type: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';
  time: string;
  foods: NutritionFoodItem[];
  totalCalories: number;
  notes?: string;
}

export interface NutritionFoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface WeeklyMenu {
  [key: string]: NutritionMealPlan; // 'monday', 'tuesday', etc.
}

export interface NutritionSupplement {
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  duration?: string;
}

// ============================================================
// LIMB SALVAGE MODULE - Diabetic Foot Assessment
// ============================================================

// Wagner Classification for Diabetic Foot Ulcers
export type WagnerGrade = 0 | 1 | 2 | 3 | 4 | 5;

// University of Texas Classification
export interface TexasClassification {
  grade: 0 | 1 | 2 | 3; // 0=pre/post ulcerative, 1=superficial, 2=tendon/capsule, 3=bone/joint
  stage: 'A' | 'B' | 'C' | 'D'; // A=clean, B=infected, C=ischemic, D=infected+ischemic
}

// WIFI Classification (Wound, Ischemia, foot Infection)
export interface WIFIClassification {
  wound: 0 | 1 | 2 | 3; // 0=no ulcer, 1=small shallow, 2=deeper, 3=extensive
  ischemia: 0 | 1 | 2 | 3; // 0=ABI≥0.8, 1=0.6-0.79, 2=0.4-0.59, 3=<0.4
  footInfection: 0 | 1 | 2 | 3; // 0=none, 1=mild, 2=moderate, 3=severe
}

// SINBAD Score (Site, Ischemia, Neuropathy, Bacterial infection, Area, Depth)
export interface SINBADScore {
  site: 0 | 1; // 0=forefoot, 1=midfoot/hindfoot
  ischemia: 0 | 1; // 0=pedal pulses present, 1=absent
  neuropathy: 0 | 1; // 0=protective sensation intact, 1=absent
  bacterialInfection: 0 | 1; // 0=absent, 1=present
  area: 0 | 1; // 0=<1cm², 1=≥1cm²
  depth: 0 | 1; // 0=superficial, 1=deep
  total: number; // 0-6
}

// Doppler Ultrasound Findings
export interface DopplerFindings {
  // Arterial Assessment
  arterial: {
    femoralArtery: 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
    poplitealArtery: 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
    anteriorTibialArtery: 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
    posteriorTibialArtery: 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
    dorsalisPedisArtery: 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
    peronealArtery: 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
    abi: number; // Ankle-Brachial Index
    tbi?: number; // Toe-Brachial Index
    waveform: 'triphasic' | 'biphasic' | 'monophasic' | 'absent';
    calcification: boolean;
    notes?: string;
  };
  // Venous Assessment
  venous: {
    greatSaphenousVein: 'normal' | 'reflux' | 'occluded' | 'not_assessed';
    smallSaphenousVein: 'normal' | 'reflux' | 'occluded' | 'not_assessed';
    poplitealVein: 'normal' | 'reflux' | 'occluded' | 'not_assessed';
    femoralVein: 'normal' | 'reflux' | 'occluded' | 'not_assessed';
    deepVeinThrombosis: boolean;
    chronicVenousInsufficiency: boolean;
    notes?: string;
  };
}

// Osteomyelitis Assessment
export interface OsteomyelitisAssessment {
  suspected: boolean;
  probeToBone: boolean; // Positive probe-to-bone test
  radiographicChanges: boolean;
  mriFindings?: 'negative' | 'suspicious' | 'positive' | 'not_done';
  boneBiopsy?: 'negative' | 'positive' | 'not_done';
  affectedBones: string[];
  duration?: string; // How long suspected
  
  // Chronicity Assessment - CRITICAL for amputation decision
  // Chronic osteomyelitis (>6 weeks) has significantly worse prognosis
  // and is a strong indicator for considering limb ablation
  chronicity?: 'acute' | 'subacute' | 'chronic';
  durationInWeeks?: number; // Numeric duration for scoring
  previousAntibiotic?: boolean; // Prior antibiotic treatment attempts
  previousDebridement?: boolean; // Prior surgical debridement
  recurrent?: boolean; // Has recurred after previous treatment
  involvedCortex?: 'superficial' | 'deep' | 'full_thickness';
  sequestrum?: boolean; // Dead bone within viable bone
  involucrum?: boolean; // New bone formation around sequestrum
  cloacae?: boolean; // Drainage tracts through bone
  
  notes?: string;
}

// Sepsis Assessment
export interface SepsisAssessment {
  // Clinical Features (qSOFA)
  clinicalFeatures: {
    alteredMentalStatus: boolean; // GCS < 15
    respiratoryRate: number; // ≥22/min
    systolicBP: number; // ≤100 mmHg
    temperature: number;
    heartRate: number;
    qsofaScore: number; // 0-3
  };
  // Laboratory Features
  laboratoryFeatures: {
    wbc: number;
    neutrophils?: number;
    bands?: number;
    lactate?: number;
    procalcitonin?: number;
    crp?: number;
    esr?: number;
    plateletCount?: number;
    creatinine?: number;
    bilirubin?: number;
  };
  // SIRS Criteria
  sirsScore: number; // 0-4
  sepsisSeverity: 'none' | 'sirs' | 'sepsis' | 'severe_sepsis' | 'septic_shock';
}

// Renal Status
export interface RenalStatus {
  creatinine: number;
  bun?: number;
  egfr: number;
  ckdStage: 1 | 2 | 3 | 4 | 5; // CKD Stage
  onDialysis: boolean;
  dialysisType?: 'hemodialysis' | 'peritoneal';
  dialysisFrequency?: string;
}

// Comorbidities Assessment
export interface DiabeticFootComorbidities {
  diabetesType: 'type1' | 'type2' | 'other';
  diabetesDuration: number; // years
  hba1c?: number;
  lastFastingGlucose?: number;
  onInsulin: boolean;
  oralHypoglycemics: string[];
  
  // Cardiovascular
  hypertension: boolean;
  coronaryArteryDisease: boolean;
  heartFailure: boolean;
  previousMI: boolean;
  previousStroke: boolean;
  peripheralVascularDisease: boolean;
  
  // Other Comorbidities
  chronicKidneyDisease: boolean;
  retinopathy: boolean;
  neuropathy: boolean;
  previousAmputation: boolean;
  previousAmputationLevel?: string;
  smoking: boolean;
  smokingPackYears?: number;
  
  // Charlson Comorbidity Index
  charlsonIndex?: number;
}

// Amputation Levels
export type AmputationLevel = 
  | 'none'
  | 'toe_disarticulation'
  | 'ray_amputation'
  | 'transmetatarsal'
  | 'lisfranc'
  | 'chopart'
  | 'syme'
  | 'bka' // Below Knee Amputation
  | 'through_knee'
  | 'aka'; // Above Knee Amputation

// Limb Salvage Score
export interface LimbSalvageScore {
  // Individual Component Scores
  woundScore: number;
  ischemiaScore: number;
  infectionScore: number;
  renalScore: number;
  comorbidityScore: number;
  ageScore: number;
  nutritionalScore: number;
  
  // Total Score
  totalScore: number;
  maxScore: number;
  percentage: number;
  
  // Risk Category
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high';
  
  // Limb Salvage Probability
  salvageProbability: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
}

// Treatment Recommendations
export interface LimbSalvageRecommendation {
  category: 'immediate' | 'short_term' | 'long_term';
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  timeframe?: string;
}

// ==========================================
// COMPREHENSIVE BURN MONITORING TYPES
// Based on WHO/ISBI Guidelines (2024)
// ==========================================

// Burn Monitoring Record - Comprehensive hourly monitoring
export interface BurnMonitoringRecord {
  id: string;
  patientId: string;
  burnAssessmentId: string;
  admissionId?: string;
  hospitalId?: string;
  
  // Timestamp
  recordedAt: Date;
  recordedBy: string;
  recordedByName?: string;
  
  // Vital Signs
  vitals: BurnMonitoringVitals;
  
  // Urine Output
  urineOutput: BurnUrineOutput;
  
  // Fluid Administered
  fluidAdministered: BurnFluidAdministered;
  
  // Neurological
  gcsScore: GCSScore;
  
  // Pain Assessment
  painScore: number; // 0-10
  painLocation?: string;
  
  // Wound Status
  woundStatus?: BurnWoundStatus;
  
  // Labs (if available at this time)
  labs?: BurnMonitoringLabs;
  
  // Alerts Generated
  alerts: BurnMonitoringAlert[];
  
  // Notes
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Burn Monitoring Vitals
export interface BurnMonitoringVitals {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  map: number; // Mean Arterial Pressure
  respiratoryRate: number;
  oxygenSaturation: number;
  temperature: number;
  
  // Respiratory
  fiO2?: number;
  peep?: number;
  ventMode?: 'room_air' | 'nasal_cannula' | 'face_mask' | 'niv' | 'mechanical_ventilation';
}

// Burn Urine Output Monitoring
export interface BurnUrineOutput {
  volume: number; // mL
  hourlyRate: number; // mL/kg/hr
  color: 'clear' | 'straw' | 'yellow' | 'amber' | 'tea' | 'cola' | 'red' | 'brown';
  specific_gravity?: number;
  
  // Derived
  isBelowTarget: boolean; // <0.5 mL/kg/hr = concerning
  adjustmentRecommended?: 'increase_fluids' | 'decrease_fluids' | 'maintain';
}

// Burn Fluid Administration
export interface BurnFluidAdministered {
  fluidType: string;
  volumeGiven: number; // mL
  rate: number; // mL/hr
  runningTotal24h: number;
  targetRemaining: number;
  percentOfTarget: number;
  
  // Calculation Reference
  parklandTarget24h: number;
  brookeTarget24h: number;
  formula: 'parkland' | 'modified_brooke';
  currentPhase: 'first_8h' | 'next_16h' | 'day_2' | 'ongoing';
}

// GCS Score Components
export interface GCSScore {
  eyeOpening: 1 | 2 | 3 | 4;
  verbalResponse: 1 | 2 | 3 | 4 | 5;
  motorResponse: 1 | 2 | 3 | 4 | 5 | 6;
  total: number;
  isIntubated: boolean;
  intubatedScore?: string; // e.g., "10T"
}

// Burn Wound Status (for monitoring rounds)
export interface BurnWoundStatus {
  dressingIntact: boolean;
  strikeThrough: boolean;
  odor: boolean;
  increasedPain: boolean;
  periWoundErythema: boolean;
  escharStatus?: 'intact' | 'separating' | 'debrided';
  graftStatus?: 'n/a' | 'adherent' | 'partial_loss' | 'complete_loss';
  notes?: string;
}

// Burn Monitoring Labs
export interface BurnMonitoringLabs {
  timestamp: Date;
  
  // Metabolic
  sodium?: number;
  potassium?: number;
  chloride?: number;
  bicarbonate?: number;
  glucose?: number;
  lactate?: number;
  
  // Renal
  bun?: number;
  creatinine?: number;
  
  // Hematology
  hemoglobin?: number;
  hematocrit?: number;
  wbc?: number;
  platelets?: number;
  
  // Coagulation
  pt?: number;
  inr?: number;
  aptt?: number;
  
  // Inflammatory
  crp?: number;
  procalcitonin?: number;
  
  // ABG
  ph?: number;
  pco2?: number;
  po2?: number;
  baseExcess?: number;
}

// Burn Monitoring Alert
export interface BurnMonitoringAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'vitals' | 'fluids' | 'renal' | 'respiratory' | 'sepsis' | 'compartment' | 'labs';
  message: string;
  value?: number;
  threshold?: number;
  suggestedAction: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// Escharotomy Record
export interface EscharotomyRecord {
  id: string;
  patientId: string;
  burnAssessmentId: string;
  
  // Procedure Details
  performedAt: Date;
  performedBy: string;
  performedByName?: string;
  
  // Location
  location: string;
  side: 'left' | 'right' | 'bilateral' | 'midline';
  
  // Indications
  indications: string[];
  compartmentPressure?: number;
  
  // Technique
  incisionLength: number; // cm
  deepFasciotomy: boolean;
  
  // Outcome
  immediateResult: 'restored_perfusion' | 'improved_perfusion' | 'no_change';
  complications?: string[];
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Skin Graft Record
export interface SkinGraftRecord {
  id: string;
  patientId: string;
  burnAssessmentId: string;
  surgeryId?: string;
  
  // Procedure Details
  performedAt: Date;
  performedBy: string;
  performedByName?: string;
  
  // Graft Type
  graftType: 'stsg' | 'ftsg' | 'composite' | 'allograft' | 'xenograft' | 'cultured_epithelium';
  meshRatio?: string; // e.g., "1:1.5", "1:3"
  
  // Donor Site
  donorSite: string;
  donorArea: number; // cm²
  
  // Recipient Site
  recipientSite: string;
  recipientArea: number; // cm²
  
  // Fixation
  fixationMethod: 'sutures' | 'staples' | 'fibrin_glue' | 'negative_pressure' | 'combination';
  dressingType: string;
  
  // Follow-up
  assessments: GraftAssessment[];
  
  // Final Outcome
  finalTakePercentage?: number;
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Graft Assessment
export interface GraftAssessment {
  id: string;
  assessedAt: Date;
  assessedBy: string;
  postOpDay: number;
  
  takePercentage: number;
  appearance: 'healthy_pink' | 'pale' | 'cyanotic' | 'necrotic' | 'infected';
  edema: 'none' | 'mild' | 'moderate' | 'severe';
  hematoma: boolean;
  seroma: boolean;
  infection: boolean;
  
  donorSiteStatus: 'healing' | 'delayed_healing' | 'infected' | 'healed';
  
  interventionRequired: boolean;
  intervention?: string;
  
  notes?: string;
}

// Comprehensive Burn Care Plan
export interface BurnCarePlan {
  id: string;
  patientId: string;
  burnAssessmentId: string;
  admissionId?: string;
  hospitalId?: string;
  
  // Phase
  currentPhase: 'resuscitation' | 'acute' | 'grafting' | 'rehabilitation';
  
  // Goals
  resuscitationGoals?: ResuscitationGoals;
  woundCareGoals?: string[];
  nutritionGoals?: string[];
  rehabilitationGoals?: string[];
  
  // Orders
  fluidOrders?: FluidOrder[];
  medicationOrders?: BurnMedicationOrder[];
  woundCareOrders?: WoundCareOrder[];
  
  // Team
  primarySurgeon: string;
  primaryNurse?: string;
  dietitian?: string;
  physiotherapist?: string;
  occupationalTherapist?: string;
  psychologist?: string;
  
  // Status
  status: 'active' | 'completed' | 'modified';
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Resuscitation Goals
export interface ResuscitationGoals {
  urineOutputTarget: number; // mL/kg/hr
  mapTarget: number;
  lactateTarget: number;
  baseExcessTarget: number;
  targetFluid24h: number;
}

// Fluid Order
export interface FluidOrder {
  id: string;
  fluidType: string;
  rate: number;
  startTime: Date;
  endTime?: Date;
  totalVolume?: number;
  titrationRules?: string;
}

// Burn Medication Order
export interface BurnMedicationOrder {
  id: string;
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  indication: string;
  startDate: Date;
  endDate?: Date;
}

// Wound Care Order
export interface WoundCareOrder {
  id: string;
  area: string;
  dressingType: string;
  frequency: string;
  technique: string;
  specialInstructions?: string;
}

// Main Limb Salvage Assessment Interface
export interface LimbSalvageAssessment {
  id: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  hospitalId?: string;
  
  // Assessment Date/Time
  assessmentDate: Date;
  assessedBy: string;
  assessedByName?: string;
  
  // Patient Demographics for Scoring
  patientAge: number;
  patientGender: 'male' | 'female';
  
  // Affected Limb
  affectedSide: 'left' | 'right' | 'bilateral';
  
  // Wound Classification
  wagnerGrade: WagnerGrade;
  texasClassification: TexasClassification;
  wifiClassification: WIFIClassification;
  sinbadScore: SINBADScore;
  
  // Wound Details
  woundLocation: string;
  woundSize: {
    length: number;
    width: number;
    depth: number;
    area: number;
  };
  woundShape?: 'rectangle' | 'ellipse' | 'circle' | 'irregular';
  woundDuration: number; // days
  wounds?: Array<{
    id: string;
    location: string;
    shape: 'rectangle' | 'ellipse' | 'circle' | 'irregular';
    length: number;
    width: number;
    depth: number;
    area: number;
    duration: number;
  }>;
  previousDebridement: boolean;
  debridementCount?: number;
  woundPhotos?: string[];
  
  // Vascular Assessment
  dopplerFindings: DopplerFindings;
  angiogramPerformed: boolean;
  angiogramFindings?: string;
  previousRevascularization: boolean;
  revascularizationDetails?: string;
  
  // Neuropathy Assessment
  monofilamentTest: boolean; // true = protective sensation absent
  vibrationSense: boolean; // true = absent
  ankleReflexes: 'present' | 'diminished' | 'absent';
  neuropathySymptoms: string[];
  
  // Osteomyelitis
  osteomyelitis: OsteomyelitisAssessment;
  
  // Sepsis Assessment
  sepsis: SepsisAssessment;
  
  // Renal Status
  renalStatus: RenalStatus;
  
  // Comorbidities
  comorbidities: DiabeticFootComorbidities;
  
  // Nutritional Status
  albumin?: number;
  prealbumin?: number;
  bmi?: number;
  mustScore?: number;
  
  // Calculated Scores
  limbSalvageScore: LimbSalvageScore;
  
  // Decision
  recommendedManagement: 'conservative' | 'revascularization' | 'minor_amputation' | 'major_amputation';
  recommendedAmputationLevel?: AmputationLevel;
  
  // Generated Recommendations
  recommendations: LimbSalvageRecommendation[];
  
  // Treatment Plan
  treatmentPlan?: string;
  
  // Progress Monitoring
  followUpDate?: Date;
  progressNotes?: string;
  
  // Outcome Tracking
  actualOutcome?: 'healed' | 'improved' | 'stable' | 'worsened' | 'amputated';
  actualAmputationLevel?: AmputationLevel;
  outcomeDate?: Date;
  
  // Metadata
  status: 'draft' | 'completed' | 'reviewed';
  reviewedBy?: string;
  reviewedAt?: Date;
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ====== TRANSFUSION ORDER & MONITORING TYPES ======

export type ScreeningTestResult = 'negative' | 'positive' | 'not_done';

export interface TransfusionScreeningTests {
  hiv: ScreeningTestResult;
  hbsAg: ScreeningTestResult;
  hcv: ScreeningTestResult;
  vdrl: ScreeningTestResult;
  malaria?: ScreeningTestResult;
}

export interface TransfusionOrder {
  id: string;
  orderId: string;
  patientId: string;
  hospitalId: string;
  requestId?: string;
  
  // Order Details
  orderDate: Date;
  orderedBy: string;
  ordererDesignation?: string;
  urgency: 'routine' | 'urgent' | 'emergency' | 'massive_transfusion';
  
  // Patient Blood Details
  patientBloodGroup: string;
  patientRhFactor: string;
  patientGenotype?: string;
  antibodyScreenResult?: string;
  crossmatchResult?: string;
  crossmatchDate?: Date;
  
  // Indication
  indication: string;
  hemoglobinLevel?: number;
  plateletCount?: number;
  inr?: number;
  fibrinogen?: number;
  
  // Product Details
  productType: string;
  productCode?: string;
  numberOfUnits: number;
  volumePerUnit?: number;
  bloodGroupOfProduct?: string;
  donorId?: string;
  collectionDate?: Date;
  expiryDate?: Date;
  
  // Product Source
  bloodBankName?: string;
  bloodBankAddress?: string;
  bloodBankPhone?: string;
  
  // Screening Tests
  screeningTests: TransfusionScreeningTests;
  
  // Transfusion Details
  rateOfTransfusion: number;
  estimatedDuration: string;
  
  // Pre-transfusion Vitals
  preTransfusionVitals?: {
    temperature: number;
    pulse: number;
    bp: string;
    respiratoryRate: number;
    spo2: number;
  };
  
  // Consent
  consentObtained: boolean;
  consentDate?: Date;
  consentWitness?: string;
  
  // Verification
  verifyingNurse1?: string;
  verifyingNurse2?: string;
  
  // Ward/Bed Info
  wardBed: string;
  diagnosis: string;
  
  // Status
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface TransfusionMonitoringEntry {
  time: string;
  temperature?: number;
  pulse?: number;
  bp?: string;
  respiratoryRate?: number;
  spo2?: number;
  volumeInfused?: number;
  symptoms?: string;
  nurseInitials?: string;
}

export interface TransfusionMonitoringChart {
  id: string;
  chartId: string;
  patientId: string;
  hospitalId?: string;
  transfusionOrderId?: string;
  
  // Patient Info (denormalized for easy access)
  patientName: string;
  hospitalNumber: string;
  wardBed: string;
  
  // Transfusion Details
  chartDate: Date;
  productType: string;
  unitNumber: string;
  startTime?: string;
  endTime?: string;
  
  // Monitoring Entries
  entries: TransfusionMonitoringEntry[];
  
  // Summary
  totalVolumeTransfused?: number;
  complications?: string;
  outcome?: 'completed_uneventful' | 'completed_with_reaction' | 'stopped_due_to_reaction';
  
  // Signatures
  nurseSignature?: string;
  doctorReview?: string;
  
  // Upload/OCR Support
  uploadedChartUrl?: string;
  uploadedChartBase64?: string;
  ocrText?: string;
  ocrProcessedAt?: Date;
  
  // Status
  status: 'template' | 'in_progress' | 'completed' | 'uploaded';
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// APPOINTMENT DIARY MODULE
// ============================================

// Appointment Types
export type AppointmentType = 
  | 'follow_up'          // Post-operative/treatment follow-up
  | 'fresh_consultation' // New patient consultation
  | 'review'             // Routine review
  | 'procedure'          // Minor procedures
  | 'dressing_change'    // Wound dressing
  | 'suture_removal'     // Post-surgical suture removal
  | 'home_visit'         // Home care visit
  | 'telemedicine'       // Video/phone consultation
  | 'pre_operative'      // Pre-op assessment
  | 'post_operative'     // Post-op check
  | 'emergency'          // Emergency appointment
  | 'other';

export type AppointmentStatus = 
  | 'scheduled'          // Appointment is booked
  | 'confirmed'          // Patient confirmed attendance
  | 'checked_in'         // Patient has arrived
  | 'in_progress'        // Currently seeing patient
  | 'completed'          // Appointment completed
  | 'no_show'            // Patient didn't attend
  | 'cancelled'          // Cancelled by patient/clinic
  | 'rescheduled';       // Moved to new date/time

export type AppointmentPriority = 'routine' | 'urgent' | 'emergency';

export type ReminderStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged';

export type ReminderChannel = 'push_notification' | 'whatsapp' | 'sms' | 'email';

// Main Appointment Interface
export interface Appointment {
  id: string;
  appointmentNumber: string;         // Unique appointment reference (e.g., APT-2025-001234)
  patientId: string;
  hospitalId: string;                // Hospital where appointment is scheduled
  
  // Scheduling
  appointmentDate: Date;
  appointmentTime: string;           // HH:mm format (24hr)
  duration: number;                  // Duration in minutes (default 30)
  
  // Appointment Details
  type: AppointmentType;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  
  // Location
  location: AppointmentLocation;
  
  // Clinical Context
  reasonForVisit: string;            // Primary reason for the appointment
  notes?: string;                    // Additional notes
  relatedEncounterId?: string;       // Link to previous encounter
  relatedSurgeryId?: string;         // Link to related surgery
  relatedWoundId?: string;           // Link to wound care
  
  // Staff Assignment
  clinicianId: string;               // Assigned doctor/clinician
  clinicianName?: string;            // Denormalized for quick display
  
  // Patient Contact (for reminders)
  patientWhatsApp: string;           // WhatsApp number for reminders
  patientPhone?: string;             // Alternative phone
  patientEmail?: string;             // Email for confirmation
  
  // Reminder Configuration
  reminderEnabled: boolean;
  reminderSchedule: ReminderSchedule[];
  
  // Booking Details
  bookedBy: string;                  // User who created appointment
  bookedAt: Date;
  lastModifiedBy?: string;
  
  // Completion Details
  checkedInAt?: Date;
  seenAt?: Date;
  completedAt?: Date;
  outcomeNotes?: string;
  nextAppointmentId?: string;        // Link to follow-up if scheduled
  
  // Sync & Audit
  syncStatus?: 'pending' | 'synced' | 'conflict';
  createdAt: Date;
  updatedAt: Date;
}

// Appointment Location
export interface AppointmentLocation {
  type: 'hospital' | 'home' | 'telemedicine';
  hospitalId?: string;
  hospitalName?: string;
  department?: string;
  room?: string;
  
  // For home visits
  homeAddress?: string;
  homeCity?: string;
  homeState?: string;
  homeLandmarks?: string;
  homeContactPhone?: string;
  assignedDriverId?: string;
  assignedHomeCareGiverId?: string;
  
  // For telemedicine
  meetingLink?: string;
  meetingPlatform?: 'video_conference' | 'phone' | 'whatsapp_video';
}

// Reminder Schedule
export interface ReminderSchedule {
  id: string;
  offsetHours: number;               // Hours before appointment (e.g., 24, 2, 1)
  channel: ReminderChannel;
  status: ReminderStatus;
  scheduledFor: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  messageContent?: string;           // Generated message content
}

// Appointment Reminder Record (for tracking sent reminders)
export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  
  // Reminder Details
  channel: ReminderChannel;
  scheduledFor: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  status: ReminderStatus;
  
  // Message Content
  messageTemplate: string;
  messageContent: string;
  
  // WhatsApp Specific
  whatsAppNumber?: string;
  whatsAppMessageId?: string;
  
  // Response Tracking
  patientResponse?: 'confirmed' | 'cancelled' | 'rescheduled' | 'no_response';
  responseReceivedAt?: Date;
  
  // Error Handling
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  
  createdAt: Date;
  updatedAt: Date;
}

// Appointment Slot Template (for managing available slots)
export interface AppointmentSlot {
  id: string;
  hospitalId: string;
  clinicianId: string;
  
  // Schedule Pattern
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  startTime: string;                     // HH:mm
  endTime: string;                       // HH:mm
  slotDuration: number;                  // Minutes per slot
  
  // Capacity
  maxAppointments: number;
  
  // Availability
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  // Location
  locationType: 'hospital' | 'home' | 'telemedicine';
  
  createdAt: Date;
  updatedAt: Date;
}

// Clinic/Outpatient Session
export interface ClinicSession {
  id: string;
  hospitalId: string;
  clinicianId?: string;                   // Deprecated - use clinicianIds instead
  clinicianIds: string[];                 // Multiple doctors/surgeons can be assigned
  assignedNurseId?: string;               // Single nurse assignment (required for notifications)
  
  sessionDate: Date;
  startTime: string;
  endTime: string;
  
  clinicType: string;                    // e.g., "Surgical Outpatient", "Wound Clinic"
  location: string;
  
  maxPatients: number;
  bookedCount: number;
  
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  
  // Notification tracking
  notificationsSent?: boolean;
  notificationSentAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// Appointment Summary/Statistics
export interface AppointmentStats {
  totalScheduled: number;
  totalCompleted: number;
  totalNoShow: number;
  totalCancelled: number;
  averageWaitTime?: number;              // Minutes
  attendanceRate?: number;               // Percentage
}

// ============================================
// BILLING & PAYROLL TYPES
// ============================================

export type BillingCategory = 
  | 'doctor_consultation'
  | 'surgeon_review'
  | 'plastic_surgeon_review'
  | 'wound_care'
  | 'nursing_service'
  | 'laboratory'
  | 'pharmacy'
  | 'physiotherapy'
  | 'dietetics'
  | 'anaesthesia'
  | 'procedure'
  | 'ward_round'
  | 'home_care'
  | 'administrative';

// Staff Assignment to Patient (per admission)
export interface StaffPatientAssignment {
  id: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  hospitalId: string;
  
  // Assigned Staff
  staffId: string;
  staffName: string;
  staffRole: UserRole;
  role?: UserRole; // Alias for staffRole
  
  // Assignment Details
  assignmentType: 'primary' | 'secondary' | 'consultant' | 'nurse' | 'on_call';
  assignedBy: string;
  assignedAt: Date;
  
  // Status
  isActive: boolean;
  relievedAt?: Date;
  relievedBy?: string;
  
  // Notes
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Activity Billing Record - Tracks each billable activity
export interface ActivityBillingRecord {
  id: string;
  
  // Activity Details
  activityId: string;
  activityCode: string;
  activityName: string;
  category: BillingCategory;
  
  // Patient Info
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  
  // Related Records
  encounterId?: string;
  admissionId?: string;
  wardRoundId?: string;
  labRequestId?: string;
  prescriptionId?: string;
  woundCareId?: string;
  
  // Staff who performed the activity
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  
  // Billing Details
  fee: number;
  originalFee?: number;          // Fee before discount (for billing transparency)
  discountAmount?: number;       // Amount discounted
  discountRate?: number;         // Discount percentage applied
  staffShare: number;           // 50% of fee
  hospitalShare: number;        // 50% of fee
  
  // Additional Service Links
  npwtSessionId?: string;       // If activity is NPWT-related
  transfusionId?: string;       // If activity is transfusion-related
  
  // Payment Status
  paymentStatus: 'pending' | 'partial' | 'paid' | 'waived';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'insurance';
  paymentEvidenceUrl?: string;  // Receipt/proof of payment
  amountPaid: number;
  staffAmountPaid: number;      // 50% of amount paid
  hospitalAmountPaid: number;   // 50% of amount paid
  
  // Linked to Invoice
  invoiceId?: string;
  invoiceItemId?: string;
  
  // Timestamps
  performedAt: Date;
  billedAt: Date;
  paidAt?: Date;
  
  notes?: string;
  hospitalId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payroll Period
export interface PayrollPeriod {
  id: string;
  hospitalId: string;
  
  // Period Details
  periodName: string;           // e.g., "January 2026"
  startDate: Date;
  endDate: Date;
  
  // Status
  status: 'open' | 'processing' | 'closed' | 'paid';
  
  // Summary
  totalBilled: number;
  totalPaid: number;
  totalStaffEarnings: number;
  totalHospitalEarnings: number;
  
  // Timestamps
  closedAt?: Date;
  closedBy?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Staff Payroll Record - Monthly/Period earnings per staff
export interface StaffPayrollRecord {
  id: string;
  payrollPeriodId: string;
  staffId: string;
  staffName: string;
  staffRole: UserRole;
  hospitalId: string;
  
  // Activity Summary
  totalActivities: number;
  activitiesByCategory: Record<BillingCategory, number>;
  
  // Earnings
  totalBilled: number;          // Total amount billed for activities
  totalPaid: number;            // Total amount paid by patients
  grossEarnings: number;        // 50% of total paid
  
  // Deductions (if any)
  deductions: number;
  deductionNotes?: string;
  
  // Net Pay
  netEarnings: number;
  
  // Payment Status
  paymentStatus: 'pending' | 'processing' | 'paid';
  paidAmount: number;
  paidAt?: Date;
  paymentReference?: string;
  
  // Activity Details (for breakdown)
  activityRecords: string[];    // Array of ActivityBillingRecord IDs
  
  createdAt: Date;
  updatedAt: Date;
}

// Staff Dashboard Stats
export interface StaffDashboardStats {
  staffId: string;
  period: 'today' | 'week' | 'month' | 'all';
  
  // Patients
  assignedPatients: number;
  activePatients: number;
  
  // Activities
  totalActivities: number;
  activitiesByCategory: Record<string, number>;
  
  // Earnings
  totalBilled: number;
  pendingPayment: number;
  paidAmount: number;
  earnedAmount: number;         // 50% of paid
  
  // Performance
  encountersCompleted: number;
  wardRoundsCompleted: number;
  proceduresPerformed: number;
}

// Lab Investigation Visibility
export interface LabInvestigationVisibility {
  id: string;
  labRequestId: string;
  patientId: string;
  hospitalId: string;
  
  // Who can see this
  requestingDoctor: string;
  assignedLabScientist?: string;
  assignedNurses: string[];
  
  // Status
  status: 'pending' | 'collected' | 'processing' | 'completed';
  
  // Results uploaded by
  resultsUploadedBy?: string;
  resultsUploadedAt?: Date;
  resultsUploadedByRole?: UserRole;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// POST-OPERATIVE NOTE MODULE (WHO Standards)
// ============================================

export type SpecimenType = 
  | 'histology'
  | 'mcs'  // Microscopy, Culture & Sensitivity
  | 'biochemistry'
  | 'cytology'
  | 'frozen_section'
  | 'other';

export interface PostOperativeSpecimen {
  id: string;
  type: SpecimenType;
  description: string;
  site: string;
  sampleNumber?: string;
  containerId?: string;
  preservative?: string;
  labRequestId?: string; // Auto-generated lab request
  labRequestGenerated: boolean;
  notes?: string;
}

export interface PostOperativeLabRequest {
  id: string;
  specimenId: string;
  requestType: SpecimenType;
  testName: string;
  urgency: 'routine' | 'urgent' | 'stat';
  clinicalDetails: string;
  status: 'pending' | 'collected' | 'processing' | 'completed';
  requestedAt: Date;
  requestedBy: string;
  completedAt?: Date;
  resultSummary?: string;
}

export interface PostOperativePatientEducation {
  procedureType: string;
  recoveryTimeline: string;
  expectedRecoveryDays: number;
  ambulation: {
    day0: string;
    day1: string;
    week1: string;
    week2: string;
    ongoingCare: string;
  };
  oralIntake: {
    immediatePostOp: string;
    day1: string;
    normalDiet: string;
    restrictions?: string[];
  };
  woundCare: {
    initialDressing: string;
    dressingChanges: string;
    signsOfInfection: string[];
    whenToSeekHelp: string[];
  };
  medications: {
    painManagement: string;
    antibiotics?: string;
    otherMeds?: string[];
    duration: string;
  };
  activityRestrictions: {
    lifting: string;
    driving: string;
    work: string;
    exercise: string;
    bathing: string;
  };
  followUp: {
    firstAppointment: string;
    subsequentCare: string;
    suturRemoval?: string;
    investigations?: string[];
  };
  emergencyContact: string;
  emergencySigns: string[];
}

export interface PostOperativeNote {
  id: string;
  surgeryId: string;
  patientId: string;
  hospitalId: string;
  admissionId?: string;
  
  // Basic Details
  procedureName: string;
  procedureCode?: string;
  procedureDate: Date;
  
  // WHO Surgical Safety Checklist Compliance
  whoChecklistCompleted: boolean;
  signInCompleted: boolean;
  timeOutCompleted: boolean;
  signOutCompleted: boolean;
  
  // Surgical Team
  surgeon: string;
  surgeonId: string;
  surgeonFee: number;
  assistant?: string;
  assistantId?: string;
  assistantFee?: number;  // 20% of surgeon fee
  anaesthetist?: string;
  anaesthetistId?: string;
  anaesthesiaType: AnaesthesiaType;
  anaesthesiaFee?: number;
  scrubNurse?: string;
  scrubNurseId?: string;
  circulatingNurse?: string;
  circulatingNurseId?: string;
  
  // Operative Details
  preOperativeDiagnosis: string;
  postOperativeDiagnosis: string;
  indication: string;
  procedurePerformed: string;
  findings: string;
  complications: string[];
  bloodLoss: number; // mL
  bloodTransfused?: number; // units
  duration: number; // minutes
  
  // Specimens & Lab Requests
  specimensCollected: boolean;
  specimens: PostOperativeSpecimen[];
  labRequests: PostOperativeLabRequest[];
  
  // Immediate Post-Op Orders
  vitalSignsFrequency: string;
  monitoringInstructions: string[];
  position: string;
  dietInstructions: string;
  ivFluids?: string;
  medications: PostoperativeMedication[];
  drainCare?: string;
  catheterCare?: string;
  
  // Recovery Plan (WHO Standards)
  expectedRecoveryDays: number;
  ambulation: {
    day0: string;
    day1: string;
    ongoing: string;
  };
  oralIntake: {
    timing: string;
    type: string;
    progression: string;
  };
  
  // Patient Education (Auto-generated based on procedure)
  patientEducation: PostOperativePatientEducation;
  educationDelivered: boolean;
  educationDeliveredBy?: string;
  educationDeliveredAt?: Date;
  
  // Follow-up
  followUpDate?: Date;
  followUpInstructions: string;
  suturRemovalDate?: Date;
  
  // Warning Signs
  warningSigns: string[];
  whenToSeekHelp: string[];
  
  // Billing
  totalProcedureFee: number;
  billingRecorded: boolean;
  activityBillingRecordIds: string[];
  
  // Status & Approvals
  status: 'draft' | 'completed' | 'approved';
  completedBy: string;
  completedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  
  // PDF & Sharing
  pdfGenerated: boolean;
  pdfUrl?: string;
  sharedViaWhatsApp: boolean;
  sharedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PAYSLIP TYPE
// ============================================

export interface Payslip {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: UserRole;
  hospitalId: string;
  
  // Period
  periodId: string;
  periodName: string;
  startDate: Date;
  endDate: Date;
  
  // Bank Details
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  
  // Earnings Breakdown
  activities: {
    category: BillingCategory;
    categoryLabel: string;
    count: number;
    totalBilled: number;
    amountPaid: number;
    staffEarning: number;  // 50%
  }[];
  
  // Surgery Assistant Earnings (if applicable)
  surgeryAssistantEarnings?: {
    surgeryId: string;
    procedureName: string;
    surgeonFee: number;
    assistantFee: number;  // 20% of surgeon fee
    staffShare: number;    // 50% of assistant fee
  }[];
  
  // Totals
  grossEarnings: number;
  deductions: number;
  deductionDetails?: {
    description: string;
    amount: number;
  }[];
  netEarnings: number;
  
  // Payment Status
  paymentStatus: 'pending' | 'processing' | 'paid';
  paidAt?: Date;
  paymentReference?: string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check';
  
  // PDF
  pdfGenerated: boolean;
  pdfUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Preoperative Assessment Types
export interface PreoperativeAssessment {
  id: string;
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  
  // Surgery Details
  surgeryName: string;
  surgeryType: 'minor' | 'intermediate' | 'major';
  scheduledDate: Date;
  
  // ASA Classification
  asaClass: 1 | 2 | 3 | 4 | 5 | 6;
  asaEmergency: boolean;
  
  // Airway Assessment
  airwayAssessment: {
    mallampatiScore: 1 | 2 | 3 | 4;
    mouthOpening: number; // cm
    thyromentalDistance: number; // cm
    neckMobility: 'normal' | 'limited' | 'fixed';
    previousDifficultIntubation: boolean;
    predictedDifficulty: 'easy' | 'potentially_difficult' | 'anticipated_difficult';
  };
  
  // Cardiac Risk (RCRI)
  cardiacRisk: {
    rcriScore: number;
    rcriRisk: string;
    selectedFactors: string[];
    functionalCapacity: number; // METs
  };
  
  // VTE Risk (Caprini)
  vteRisk: {
    capriniScore: number;
    riskCategory: 'very_low' | 'low' | 'moderate' | 'high';
    prophylaxisRecommendation: string;
    selectedFactors: string[];
  };
  
  // Bleeding Risk
  bleedingRisk: {
    onAnticoagulant: boolean;
    anticoagulantType?: string;
    bleedingHistory: boolean;
  };
  
  // Status
  status: 'draft' | 'pending' | 'completed';
  clearanceStatus: 'pending_review' | 'cleared' | 'deferred';
  clearanceNotes?: string;
  
  // Assessor
  assessedBy: string;
  assessedAt?: Date;
  
  // Review
  reviewedBy?: string;
  reviewedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// External Review - Admin only module for tracking external patient services
export interface ExternalReview {
  id: string;
  patientId: string;
  patientName: string; // Denormalized for reporting
  hospitalId: string;
  hospitalName: string; // Denormalized for reporting
  folderNumber: string;
  servicesRendered: string;
  fee: number;
  serviceDate: string; // ISO date string
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

// ============================================
// REFERRALS MODULE
// ============================================

export type ReferralType = 
  | 'internal'    // Within same hospital
  | 'external'    // To another hospital
  | 'specialist'  // To specialist
  | 'emergency';  // Emergency transfer

export type ReferralStatus = 
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';

export type ReferralPriority = 'routine' | 'urgent' | 'emergency';

export interface Referral {
  id: string;
  referralNumber: string;
  patientId: string;
  patientName?: string; // Denormalized for quick display
  fromHospitalId: string;
  fromHospitalName?: string;
  toHospitalId?: string;
  toHospitalName?: string;
  toSpecialty?: string;
  toSpecialistId?: string;
  toSpecialistName?: string;
  referralType: ReferralType;
  status: ReferralStatus;
  priority: ReferralPriority;
  referralDate: string;
  reason: string;
  clinicalSummary: string;
  currentDiagnosis?: string;
  relevantInvestigations?: string;
  currentTreatment?: string;
  referralQuestions?: string; // Specific questions for receiving specialist
  urgencyJustification?: string;
  attachments?: string[]; // File URLs
  referredBy: string;
  referredByName?: string;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedAt?: string;
  completedAt?: string;
  responseNotes?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PATIENT EDUCATION RECORDS MODULE
// ============================================

export type EducationDeliveryMethod = 
  | 'verbal'
  | 'written'
  | 'video'
  | 'demonstration'
  | 'interactive'
  | 'group_session';

export type EducationComprehensionLevel = 
  | 'understood_fully'
  | 'understood_partially'
  | 'needs_reinforcement'
  | 'barrier_identified';

export interface PatientEducationRecord {
  id: string;
  patientId: string;
  patientName?: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;
  topicId: string; // Reference to education topic from patientEducation.ts
  topicTitle: string;
  category: string;
  deliveryMethod: EducationDeliveryMethod;
  comprehensionLevel: EducationComprehensionLevel;
  comprehensionNotes?: string;
  barriers?: string[]; // e.g., language, literacy, cognitive, hearing
  barriersMitigated?: string;
  teachBackPerformed: boolean;
  teachBackSuccessful?: boolean;
  materialsProvided?: string[]; // e.g., pamphlet, video link, QR code
  familyMemberPresent?: boolean;
  familyMemberName?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
  educatorId: string;
  educatorName?: string;
  educatorRole?: string;
  deliveredAt: string;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CALCULATOR RESULTS MODULE
// ============================================

export type CalculatorType = 
  | 'bmi'
  | 'bsa'
  | 'gfr'
  | 'parkland'
  | 'caprini'
  | 'wells_dvt'
  | 'wells_pe'
  | 'apache_ii'
  | 'sofa'
  | 'qsofa'
  | 'gcs'
  | 'braden'
  | 'must'
  | 'waterlow'
  | 'news2'
  | 'mews'
  | 'sickle_cell'
  | 'corrected_calcium'
  | 'anion_gap'
  | 'creatinine_clearance'
  | 'other';

export interface CalculatorResult {
  id: string;
  patientId?: string;
  patientName?: string;
  hospitalId?: string;
  encounterId?: string;
  calculatorType: CalculatorType;
  calculatorName: string;
  inputValues: Record<string, number | string | boolean>;
  resultValue: number | string;
  resultInterpretation: string;
  riskLevel?: 'low' | 'moderate' | 'high' | 'very_high' | 'critical';
  recommendations?: string[];
  calculatedBy: string;
  calculatedByName?: string;
  calculatedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// USER & HOSPITAL SETTINGS MODULE
// ============================================

export interface UserSettings {
  id: string;
  userId: string;
  // Notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  // Alert preferences
  criticalAlertsOnly: boolean;
  appointmentReminders: boolean;
  wardRoundReminders: boolean;
  medicationReminders: boolean;
  labResultAlerts: boolean;
  // Display preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultLandingPage?: string;
  // Clinical preferences
  defaultHospitalId?: string;
  defaultWard?: string;
  autoSaveInterval?: number; // in seconds
  voiceDictationLanguage?: string;
  // Accessibility
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reduceMotion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalSettings {
  id: string;
  hospitalId: string;
  // Branding
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  // Operational settings
  defaultConsultationFee?: number;
  defaultCurrency: string;
  taxRate?: number;
  // Ward configuration
  wards?: { name: string; type: string; bedCount: number }[];
  // Appointment settings
  appointmentSlotDuration: number; // in minutes
  appointmentLeadTime: number; // hours before appointment for reminders
  maxAdvanceBookingDays: number;
  // Clinical protocols
  defaultDVTProphylaxis?: string;
  defaultAntibioticProtocol?: string;
  requireTwoFactorAuth: boolean;
  sessionTimeoutMinutes: number;
  // Sync settings
  syncIntervalMinutes: number;
  offlineStorageLimitMB: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== MEETING MINUTES & TRANSCRIPTION ====================

export interface MeetingTranscriptSegment {
  id: string;
  speakerId?: string;
  speakerName: string;
  text: string;
  startTime: number; // seconds from meeting start
  endTime: number;
  confidence: number; // 0-1 speech recognition confidence
  isEdited: boolean;
}

export interface MeetingKeyPoint {
  id: string;
  type: 'decision' | 'action_item' | 'discussion' | 'question' | 'follow_up';
  content: string;
  assignee?: string;
  assigneeName?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  relatedTranscriptIds: string[];
}

export interface MeetingAgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter?: string;
  duration?: number; // minutes
  status: 'pending' | 'discussed' | 'deferred';
  notes?: string;
}

export interface MeetingMinutes {
  id: string;
  conferenceId: string;
  hospitalId?: string;
  
  // Meeting details
  title: string;
  meetingType: 'consultation' | 'case_discussion' | 'ward_round' | 'team_meeting' | 'teaching' | 'presentation' | 'mdt' | 'other';
  meetingDate: Date;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  location?: string;
  roomCode: string;
  
  // Participants
  hostId: string;
  hostName: string;
  attendees: MeetingAttendee[];
  absentees?: string[];
  
  // Agenda
  agenda: MeetingAgendaItem[];
  
  // Full transcript
  transcript: MeetingTranscriptSegment[];
  rawTranscriptText: string;
  
  // AI-Generated Content
  aiSummary: string;
  keyPoints: MeetingKeyPoint[];
  actionItems: MeetingKeyPoint[];
  decisionsReached: string[];
  discussionHighlights: string[];
  nextSteps: string[];
  
  // Patient-related (for clinical meetings)
  patientId?: string;
  patientName?: string;
  clinicalNotes?: string;
  
  // Recording info
  hasRecording: boolean;
  recordingUrl?: string;
  recordingDuration?: number;
  
  // Status & sharing
  status: 'draft' | 'finalized' | 'shared';
  sharedWith: string[]; // user IDs
  sharedAt?: Date;
  exportedFormats: ('pdf' | 'docx' | 'email' | 'whatsapp')[];
  
  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
  finalizedBy?: string;
}

export interface MeetingAttendee {
  id: string;
  oderId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  specialty?: string;
  joinedAt: Date;
  leftAt?: Date;
  participationDuration?: number; // minutes
  contributions: number; // number of transcript segments
}

// ==================== SUBSTANCE USE DISORDER ASSESSMENT & DETOXIFICATION MODULE (CSUD-DSM) ====================

// Substance Types
export type SubstanceCategory = 
  | 'opioids'
  | 'cannabinoids'
  | 'sedatives'
  | 'stimulants'
  | 'alcohol'
  | 'hallucinogens'
  | 'inhalants'
  | 'tobacco'
  | 'other';

export type RouteOfAdministration = 
  | 'oral'
  | 'intravenous'
  | 'intramuscular'
  | 'subcutaneous'
  | 'inhalation'
  | 'intranasal'
  | 'transdermal'
  | 'sublingual'
  | 'rectal'
  | 'other';

export type AddictionSeverity = 'mild' | 'moderate' | 'severe' | 'complicated';

export type WithdrawalSeverity = 'minimal' | 'mild' | 'moderate' | 'severe' | 'life_threatening';

export type WithdrawalPhase = 'early' | 'peak' | 'late' | 'post_acute';

export type CareSettingRecommendation = 
  | 'outpatient_detox'
  | 'supervised_outpatient'
  | 'inpatient_admission'
  | 'icu_hdu_alert';

export type PainType = 'nociceptive' | 'neuropathic' | 'mixed' | 'psychogenic' | 'unknown';

export type DetoxStatus = 
  | 'assessment_pending'
  | 'in_assessment'
  | 'detox_planned'
  | 'detox_in_progress'
  | 'detox_completed'
  | 'transferred'
  | 'discharged'
  | 'relapsed'
  | 'abandoned';

// Substance Intake Record
export interface SubstanceIntake {
  id: string;
  substanceCategory: SubstanceCategory;
  substanceName: string; // e.g., "Pentazocine", "Tramadol", "Indian Hemp"
  durationOfUseMonths: number;
  averageDailyDose: string;
  doseUnit: string; // mg, ml, tabs, etc.
  routeOfAdministration: RouteOfAdministration;
  escalationPattern: 'stable' | 'increasing' | 'decreasing' | 'erratic';
  lastUseDateTime: Date;
  frequencyPerDay: number;
  isPrimaryConcern: boolean;
  notes?: string;
}

// Physical Dependence Score Components
export interface PhysicalDependenceScore {
  tolerance: number; // 0-4
  withdrawalSymptoms: number; // 0-4
  compulsiveUse: number; // 0-4
  physicalCravings: number; // 0-4
  totalScore: number; // 0-16
}

// Psychological Dependence Score Components
export interface PsychologicalDependenceScore {
  emotionalReliance: number; // 0-4
  copingMechanism: number; // 0-4
  preoccupation: number; // 0-4
  anxietyWithoutSubstance: number; // 0-4
  totalScore: number; // 0-16
}

// Behavioral Dysfunction Score
export interface BehavioralDysfunctionScore {
  prioritizingSubstance: number; // 0-4
  failedAttemptsToCut: number; // 0-4
  timeSpentObtaining: number; // 0-4
  givingUpActivities: number; // 0-4
  totalScore: number; // 0-16
}

// Social Impairment Score
export interface SocialImpairmentScore {
  occupationalImpact: number; // 0-4
  relationshipImpact: number; // 0-4
  financialImpact: number; // 0-4
  legalIssues: number; // 0-4
  totalScore: number; // 0-16
}

// Medical Complications Score
export interface MedicalComplicationsScore {
  liverDysfunction: number; // 0-4
  renalDysfunction: number; // 0-4
  cardiacComplications: number; // 0-4
  neurologicalComplications: number; // 0-4
  infectiousComplications: number; // 0-4
  psychiatricComorbidity: number; // 0-4
  totalScore: number; // 0-24
}

// Composite Addiction Severity Score
export interface AddictionSeverityScore {
  physicalDependence: PhysicalDependenceScore;
  psychologicalDependence: PsychologicalDependenceScore;
  behavioralDysfunction: BehavioralDysfunctionScore;
  socialImpairment: SocialImpairmentScore;
  medicalComplications: MedicalComplicationsScore;
  totalCompositeScore: number; // 0-88
  severityLevel: AddictionSeverity;
  interpretationNotes: string;
}

// Expected Withdrawal Symptoms
export interface WithdrawalSymptom {
  symptom: string;
  phase: WithdrawalPhase;
  expectedOnsetHours: number;
  expectedPeakHours: number;
  expectedDurationDays: number;
  severity: WithdrawalSeverity;
  isRedFlag: boolean;
  managementNotes: string;
}

// Withdrawal Risk Prediction
export interface WithdrawalRiskPrediction {
  overallRisk: WithdrawalSeverity;
  riskScore: number; // 0-100
  expectedSymptoms: WithdrawalSymptom[];
  earlyPhaseSymptoms: string[];
  peakPhaseSymptoms: string[];
  latePhaseSymptoms: string[];
  redFlagComplications: string[];
  timelineDescription: string;
  monitoringRecommendations: string[];
  pharmacologicalSupport: string[];
}

// Pain Context Assessment
export interface PainContextAssessment {
  hasPainCondition: boolean;
  painType: PainType;
  painCause: string; // e.g., "Sickle Cell Disease", "Cancer", "Chronic Wound"
  currentPainScore: number; // 0-10
  averagePainScore: number; // 0-10
  worstPainScore: number; // 0-10
  currentAnalgesics: string[];
  analgesicMisuseRisk: 'low' | 'moderate' | 'high';
  analgesicMisuseIndicators: string[];
}

// Analgesic Replacement Recommendation
export interface AnalgesicRecommendation {
  category: 'primary' | 'adjuvant' | 'non_pharmacological' | 'escalation';
  recommendation: string;
  rationale: string;
  cautions: string[];
  requiresClinicianConfirmation: boolean;
  contraindications?: string[];
}

// Pain Management Decision Support
export interface PainManagementSupport {
  painContext: PainContextAssessment;
  nonOpioidPrimaryOptions: AnalgesicRecommendation[];
  adjuvantTherapies: AnalgesicRecommendation[];
  nonPharmacologicalStrategies: AnalgesicRecommendation[];
  escalationCriteria: string[];
  highRiskCombinationsWarning: string[];
  monitoringRequirements: string[];
}

// Comorbidity-Aware Modifications
export interface ComorbidityModification {
  condition: string;
  affectsWithdrawal: boolean;
  withdrawalModifications: string[];
  affectsAnalgesics: boolean;
  analgesicModifications: string[];
  affectsInpatientThreshold: boolean;
  inpatientThresholdNotes: string;
  specialConsiderations: string[];
}

// Care Setting Recommendation
export interface CareSettingDecision {
  recommendation: CareSettingRecommendation;
  confidenceLevel: 'low' | 'medium' | 'high';
  triggerFactors: string[];
  supportingEvidence: string[];
  alternativeOptions: CareSettingRecommendation[];
  escalationCriteria: string[];
  clinicianOverrideReason?: string;
  clinicianOverrideBy?: string;
  clinicianOverrideAt?: Date;
}

// Informed Consent Document
export interface SubstanceUseConsent {
  id: string;
  assessmentId: string;
  diagnosisExplanation: string;
  detoxificationRisks: string[];
  possibleWithdrawalEffects: string[];
  painManagementPlan: string;
  monitoringRequirements: string[];
  patientAcknowledged: boolean;
  witnessName?: string;
  witnessSignature?: string;
  consentTimestamp?: Date;
  consentDeviceInfo?: string;
  documentVersion: string;
}

// Patient Information Leaflet
export interface PatientInfoLeaflet {
  id: string;
  assessmentId: string;
  dayByDayExpectations: Array<{
    day: number;
    description: string;
    symptoms: string[];
    selfCareAdvice: string[];
  }>;
  warningSymptoms: string[];
  complianceExpectations: string[];
  familyInvolvement: string[];
  followUpSchedule: Array<{
    date: Date;
    purpose: string;
    location: string;
  }>;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    role: string;
  }>;
  generatedAt: Date;
  generatedBy: string;
}

// Detox Monitoring Record
export interface DetoxMonitoringRecord {
  id: string;
  assessmentId: string;
  patientId: string;
  recordedAt: Date;
  recordedBy: string;
  // Vital Signs
  temperature: number;
  pulse: number;
  bloodPressure: string;
  respiratoryRate: number;
  oxygenSaturation: number;
  // Withdrawal Assessment
  withdrawalSymptoms: string[];
  ciwaScore?: number; // Clinical Institute Withdrawal Assessment (for alcohol)
  cowsScore?: number; // Clinical Opiate Withdrawal Scale
  pawsPresent: boolean; // Post-Acute Withdrawal Syndrome
  // Pain & Discomfort
  painScore: number;
  painLocation?: string;
  // Mental Status
  anxietyLevel: 'none' | 'mild' | 'moderate' | 'severe';
  agitationLevel: 'none' | 'mild' | 'moderate' | 'severe';
  sleepQuality: 'good' | 'fair' | 'poor' | 'none';
  hallucinationsPresent: boolean;
  suicidalIdeation: boolean;
  // Compliance
  medicationCompliance: boolean;
  fluidIntakeAdequate: boolean;
  nutritionIntakeAdequate: boolean;
  // Actions Taken
  interventions: string[];
  medicationsGiven: Array<{
    medication: string;
    dose: string;
    route: string;
    time: Date;
  }>;
  // Clinical Notes
  notes: string;
  alertsTriggered: string[];
  requiresEscalation: boolean;
  escalationReason?: string;
}

// Follow-up Record
export interface DetoxFollowUp {
  id: string;
  assessmentId: string;
  patientId: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  followUpType: 'phone' | 'in_person' | 'video' | 'home_visit';
  // Assessment at follow-up
  currentStatus?: 'abstinent' | 'reduced_use' | 'same_level' | 'increased_use' | 'relapsed';
  relapseRiskLevel?: 'low' | 'moderate' | 'high';
  adherenceToRecommendations?: 'full' | 'partial' | 'none';
  withdrawalSymptomsResolved?: boolean;
  // Support & Resources
  supportSystemStrength?: 'strong' | 'moderate' | 'weak' | 'none';
  referralsProvided?: string[];
  counselingRecommended?: boolean;
  // Notes
  clinicalNotes?: string;
  nextSteps?: string[];
  conductedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Main Substance Use Assessment
export interface SubstanceUseAssessment {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  admissionId?: string;
  
  // Assessment Status
  status: DetoxStatus;
  assessmentDate: Date;
  assessedBy: string;
  assessedByName: string;
  
  // Patient Context
  demographics: {
    age: number;
    sex: 'male' | 'female';
    weight: number;
    occupation?: string;
  };
  socialFactors: {
    housingStability: 'stable' | 'unstable' | 'homeless';
    employmentStatus: 'employed' | 'unemployed' | 'retired' | 'student' | 'disabled';
    familySupportLevel: 'strong' | 'moderate' | 'minimal' | 'none';
    legalIssues: boolean;
    legalIssuesDetails?: string;
  };
  previousDetoxAttempts: number;
  previousDetoxDetails?: string;
  psychiatricHistory: string[];
  psychiatricHistoryNotes?: string;
  
  // Substance Intake
  substances: SubstanceIntake[];
  primarySubstance: string;
  polySubstanceUse: boolean;
  
  // Addiction Severity
  addictionSeverityScore: AddictionSeverityScore;
  
  // Withdrawal Risk
  withdrawalRiskPrediction: WithdrawalRiskPrediction;
  
  // Pain Management
  painManagementSupport?: PainManagementSupport;
  
  // Comorbidity Considerations
  relevantComorbidities: string[];
  comorbidityModifications: ComorbidityModification[];
  
  // Care Setting Decision
  careSettingDecision: CareSettingDecision;
  
  // Clinical Override
  clinicianOverride?: {
    originalRecommendation: CareSettingRecommendation;
    overriddenTo: CareSettingRecommendation;
    reason: string;
    overriddenBy: string;
    overriddenAt: Date;
  };
  
  // Consent & Documentation
  consent?: SubstanceUseConsent;
  patientInfoLeaflet?: PatientInfoLeaflet;
  
  // Exclusion Criteria Check
  exclusionCriteriaFlags: {
    isPregnant: boolean;
    isPediatric: boolean; // < 18 years
    hasSeverePsychiatricIllness: boolean;
    requiresSpecialistReferral: boolean;
    exclusionReason?: string;
  };
  
  // Audit Trail
  auditLog: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: string;
  }>;
  
  // Metadata
  clinicalSummary?: string;
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  completedBy?: string;
}

// Clinical Summary Document (for PDF generation)
export interface SubstanceUseClinicalSummary {
  id: string;
  assessmentId: string;
  patientId: string;
  patientName: string;
  hospitalName: string;
  assessmentDate: Date;
  addictionScoreSummary: {
    compositeScore: number;
    severityLevel: AddictionSeverity;
    interpretation: string;
  };
  riskClassification: WithdrawalSeverity;
  recommendedPathway: CareSettingRecommendation;
  keyFindings: string[];
  recommendedInterventions: string[];
  monitoringChecklist: string[];
  followUpSchedule: string[];
  disclaimers: string[];
  generatedAt: Date;
  generatedBy: string;
}

// ============================================
// CLINICAL COMMENTS (Post-Submission Notes)
// ============================================

// Entity types that can have comments attached
export type CommentableEntityType = 
  | 'clinical_encounter'
  | 'investigation'
  | 'prescription'
  | 'surgery'
  | 'admission'
  | 'wound'
  | 'burn_assessment'
  | 'lab_request'
  | 'treatment_plan';

// Priority/urgency level of comment
export type CommentPriority = 'normal' | 'important' | 'urgent' | 'critical';

// Clinical Comment interface for post-submission notes/emphasis
export interface ClinicalComment {
  id: string;
  // Entity reference
  entityType: CommentableEntityType;
  entityId: string;
  patientId: string;
  hospitalId: string;
  
  // Comment content
  comment: string;
  priority: CommentPriority;
  
  // Optional categorization
  category?: 'clarification' | 'update' | 'correction' | 'follow_up' | 'warning' | 'instruction' | 'other';
  
  // Flags
  isResolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedByName?: string;
  
  // Related to another comment (for threaded replies)
  parentCommentId?: string;
  
  // Author information
  authorId: string;
  authorName: string;
  authorRole: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Sync tracking
  syncedAt?: Date;
  localId?: string;
}
