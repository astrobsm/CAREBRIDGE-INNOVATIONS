// User Roles
export type UserRole =
  | 'super_admin'
  | 'hospital_admin'
  | 'surgeon'
  | 'anaesthetist'
  | 'nurse'
  | 'pharmacist'
  | 'lab_scientist'
  | 'dietician'
  | 'physiotherapist'
  | 'accountant'
  | 'home_care_giver'
  | 'driver';

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
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  physicalExamination?: PhysicalExamination;
  diagnosis: Diagnosis[];
  treatmentPlan?: string;
  notes?: string;
  attendingClinician: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EncounterType = 
  | 'outpatient'
  | 'inpatient'
  | 'emergency'
  | 'surgical'
  | 'follow_up'
  | 'home_visit';

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
  category: 'minor' | 'major';
  preOperativeAssessment: PreOperativeAssessment;
  scheduledDate: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'postponed' | 'cancelled';
  surgeon: string;
  assistant?: string;
  anaesthetist?: string;
  scrubNurse?: string;
  circulatingNurse?: string;
  anaesthesiaType?: AnaesthesiaType;
  operativeNotes?: string;
  complications?: string;
  bloodLoss?: number;
  specimenSent?: boolean;
  specimenType?: string;
  postOperativeInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
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
  | 'otic';

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
  consultants?: string[]; // User IDs of consulting specialists
  
  // Treatment Plan Link
  treatmentPlanId?: string;
  
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
// PREOPERATIVE MODULE
// ==========================================

export interface PreoperativeAssessment {
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
  participants: ConferenceParticipant[];
  invitedUsers: string[]; // User IDs
  patientId?: string; // For case presentations
  scheduledStart: Date;
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
  userId: string;
  userName: string;
  userRole: UserRole;
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
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'system';
  isPrivate: boolean;
  recipientId?: string;
  createdAt: Date;
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
