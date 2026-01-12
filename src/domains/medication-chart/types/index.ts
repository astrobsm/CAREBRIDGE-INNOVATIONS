/**
 * Medication Chart (MAR) Types
 * AstroHEALTH Innovations in Healthcare
 */

export type AdministrationRoute = 
  | 'oral'
  | 'iv'
  | 'im'
  | 'sc'
  | 'topical'
  | 'rectal'
  | 'sublingual'
  | 'inhalation'
  | 'ophthalmic'
  | 'otic'
  | 'nasal'
  | 'transdermal'
  | 'other';

export type AdministrationStatus = 
  | 'given'
  | 'withheld'
  | 'refused'
  | 'not_available'
  | 'patient_away'
  | 'self_administered';

export type MedicationFrequency = 
  | 'stat'
  | 'once_daily'
  | 'twice_daily'
  | 'thrice_daily'
  | 'four_times_daily'
  | 'every_4_hours'
  | 'every_6_hours'
  | 'every_8_hours'
  | 'every_12_hours'
  | 'before_meals'
  | 'after_meals'
  | 'at_bedtime'
  | 'as_needed'
  | 'weekly'
  | 'other';

export interface ScheduledMedication {
  id: string;
  prescriptionId: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  route: AdministrationRoute;
  frequency: MedicationFrequency;
  scheduledTimes: string[]; // e.g., ['08:00', '14:00', '20:00']
  startDate: Date;
  endDate?: Date;
  specialInstructions?: string;
  prescribedBy: string;
  prescribedByName: string;
}

export interface MedicationAdministration {
  id: string;
  chartId: string;
  scheduledMedicationId: string;
  medicationName: string;
  dosage: string;
  route: AdministrationRoute;
  
  // Administration Details
  scheduledTime: string; // e.g., '08:00'
  actualTime: string; // actual time given
  status: AdministrationStatus;
  
  // If withheld or refused
  reasonNotGiven?: string;
  
  // Verification
  administeredBy: string;
  administeredByName: string;
  witnessedBy?: string;
  witnessedByName?: string;
  
  // Clinical Observations
  vitalSignsBefore?: {
    bloodPressure?: string;
    pulse?: number;
    temperature?: number;
  };
  patientResponse?: string;
  adverseReaction?: boolean;
  adverseReactionDetails?: string;
  
  notes?: string;
  createdAt: Date;
}

export interface DailyMedicationChart {
  id: string;
  patientId: string;
  hospitalId: string;
  admissionId: string;
  
  // Chart Details
  chartDate: Date;
  shiftType: 'morning' | 'afternoon' | 'night';
  
  // Assigned Nurse
  assignedNurseId: string;
  assignedNurseName: string;
  
  // Medications for the day
  scheduledMedications: ScheduledMedication[];
  administrations: MedicationAdministration[];
  
  // Compliance Tracking
  totalScheduled: number;
  totalAdministered: number;
  complianceRate: number; // percentage
  
  // Sign-off
  isCompleted: boolean;
  completedAt?: Date;
  supervisorReview?: {
    reviewedBy: string;
    reviewedByName: string;
    reviewedAt: Date;
    comments?: string;
  };
  
  // Notes
  generalNotes?: string;
  handoverNotes?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface NurseAssignment {
  id: string;
  nurseId: string;
  nurseName: string;
  hospitalId: string;
  wardId?: string;
  patientIds: string[];
  shiftDate: Date;
  shiftType: 'morning' | 'afternoon' | 'night';
  isActive: boolean;
  createdAt: Date;
}

export const ADMINISTRATION_ROUTES: { value: AdministrationRoute; label: string; abbreviation: string }[] = [
  { value: 'oral', label: 'Oral (PO)', abbreviation: 'PO' },
  { value: 'iv', label: 'Intravenous (IV)', abbreviation: 'IV' },
  { value: 'im', label: 'Intramuscular (IM)', abbreviation: 'IM' },
  { value: 'sc', label: 'Subcutaneous (SC)', abbreviation: 'SC' },
  { value: 'topical', label: 'Topical', abbreviation: 'TOP' },
  { value: 'rectal', label: 'Rectal (PR)', abbreviation: 'PR' },
  { value: 'sublingual', label: 'Sublingual (SL)', abbreviation: 'SL' },
  { value: 'inhalation', label: 'Inhalation (INH)', abbreviation: 'INH' },
  { value: 'ophthalmic', label: 'Ophthalmic (Eye)', abbreviation: 'OPH' },
  { value: 'otic', label: 'Otic (Ear)', abbreviation: 'OTC' },
  { value: 'nasal', label: 'Nasal', abbreviation: 'NAS' },
  { value: 'transdermal', label: 'Transdermal', abbreviation: 'TD' },
  { value: 'other', label: 'Other', abbreviation: 'OTH' },
];

export const ADMINISTRATION_STATUSES: { value: AdministrationStatus; label: string; color: string }[] = [
  { value: 'given', label: 'Given', color: 'green' },
  { value: 'withheld', label: 'Withheld', color: 'yellow' },
  { value: 'refused', label: 'Refused by Patient', color: 'orange' },
  { value: 'not_available', label: 'Medication Not Available', color: 'red' },
  { value: 'patient_away', label: 'Patient Away', color: 'gray' },
  { value: 'self_administered', label: 'Self-Administered', color: 'blue' },
];

export const MEDICATION_FREQUENCIES: { value: MedicationFrequency; label: string; timesPerDay: number }[] = [
  { value: 'stat', label: 'STAT (Immediately)', timesPerDay: 1 },
  { value: 'once_daily', label: 'Once Daily (OD)', timesPerDay: 1 },
  { value: 'twice_daily', label: 'Twice Daily (BD)', timesPerDay: 2 },
  { value: 'thrice_daily', label: 'Three Times Daily (TDS)', timesPerDay: 3 },
  { value: 'four_times_daily', label: 'Four Times Daily (QDS)', timesPerDay: 4 },
  { value: 'every_4_hours', label: 'Every 4 Hours (Q4H)', timesPerDay: 6 },
  { value: 'every_6_hours', label: 'Every 6 Hours (Q6H)', timesPerDay: 4 },
  { value: 'every_8_hours', label: 'Every 8 Hours (Q8H)', timesPerDay: 3 },
  { value: 'every_12_hours', label: 'Every 12 Hours (Q12H)', timesPerDay: 2 },
  { value: 'before_meals', label: 'Before Meals (AC)', timesPerDay: 3 },
  { value: 'after_meals', label: 'After Meals (PC)', timesPerDay: 3 },
  { value: 'at_bedtime', label: 'At Bedtime (HS)', timesPerDay: 1 },
  { value: 'as_needed', label: 'As Needed (PRN)', timesPerDay: 0 },
  { value: 'weekly', label: 'Weekly', timesPerDay: 0 },
  { value: 'other', label: 'Other', timesPerDay: 0 },
];
