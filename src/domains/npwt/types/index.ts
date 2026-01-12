/**
 * NPWT (Negative Pressure Wound Therapy) Types
 * AstroHEALTH Innovations in Healthcare
 */

export type WoundType = 
  | 'acute_traumatic'
  | 'surgical_dehiscence'
  | 'pressure_ulcer'
  | 'diabetic_ulcer'
  | 'venous_ulcer'
  | 'arterial_ulcer'
  | 'burn_wound'
  | 'chronic_wound'
  | 'post_operative'
  | 'other';

export type WoundClass = 
  | 'clean'
  | 'clean_contaminated'
  | 'contaminated'
  | 'dirty_infected';

export type NPWTCycleType = '4_day' | '7_day';

export interface WoundDimensions {
  length: number; // cm
  width: number; // cm
  depth: number; // cm
  undermining?: string; // description of undermining if present
  tunneling?: string; // description of tunneling if present
}

export interface NPWTAgentsUsed {
  heraGel: boolean;
  honeycareGauze: boolean;
  sofratule: boolean;
  other?: string;
}

export interface CleaningAgentsUsed {
  saline: boolean;
  woundClex: boolean;
  hydrogenPeroxide: boolean;
  povidoneIodine: boolean;
  other?: string;
}

export interface NPWTMaterials {
  foamsUsed: number;
  opsiteFilmsUsed: number;
  otherMaterials?: string;
}

export interface NPWTSession {
  id: string;
  patientId: string;
  hospitalId: string;
  
  // Wound Information
  woundType: WoundType;
  woundClass: WoundClass;
  woundLocation: string;
  dimensions: WoundDimensions;
  
  // NPWT Settings
  machineCode: string;
  timerCode: string;
  cycleType: NPWTCycleType;
  cycleNumber: number; // 1st, 2nd, 3rd cycle etc.
  pressureSetting: number; // mmHg
  therapyMode: 'continuous' | 'intermittent';
  
  // Session Details
  sessionDate: Date;
  nextChangeDate: Date;
  notificationSent: boolean;
  
  // Materials Used
  agentsUsed: NPWTAgentsUsed;
  cleaningAgents: CleaningAgentsUsed;
  materials: NPWTMaterials;
  
  // Progress Tracking
  imageUrl?: string;
  imageBase64?: string;
  woundCondition: 'improving' | 'stable' | 'deteriorating';
  exudateAmount: 'none' | 'scant' | 'moderate' | 'heavy';
  exudateType: 'serous' | 'serosanguinous' | 'sanguinous' | 'purulent';
  granulationPercent: number;
  
  // Clinical Notes
  clinicalNotes?: string;
  complications?: string;
  
  // Audit
  performedBy: string;
  performedByName: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface NPWTNotification {
  id: string;
  sessionId: string;
  patientId: string;
  scheduledTime: Date;
  notificationType: '24_hour' | '2_hour' | 'overdue';
  sent: boolean;
  sentAt?: Date;
}

export const WOUND_TYPES: { value: WoundType; label: string }[] = [
  { value: 'acute_traumatic', label: 'Acute Traumatic Wound' },
  { value: 'surgical_dehiscence', label: 'Surgical Dehiscence' },
  { value: 'pressure_ulcer', label: 'Pressure Ulcer' },
  { value: 'diabetic_ulcer', label: 'Diabetic Foot Ulcer' },
  { value: 'venous_ulcer', label: 'Venous Ulcer' },
  { value: 'arterial_ulcer', label: 'Arterial Ulcer' },
  { value: 'burn_wound', label: 'Burn Wound' },
  { value: 'chronic_wound', label: 'Chronic Non-Healing Wound' },
  { value: 'post_operative', label: 'Post-Operative Wound' },
  { value: 'other', label: 'Other' },
];

export const WOUND_CLASSES: { value: WoundClass; label: string; description: string }[] = [
  { value: 'clean', label: 'Class I - Clean', description: 'Uninfected operative wound' },
  { value: 'clean_contaminated', label: 'Class II - Clean-Contaminated', description: 'Operative wound with controlled contamination' },
  { value: 'contaminated', label: 'Class III - Contaminated', description: 'Open, fresh, accidental wounds' },
  { value: 'dirty_infected', label: 'Class IV - Dirty/Infected', description: 'Old traumatic wounds with infection' },
];
