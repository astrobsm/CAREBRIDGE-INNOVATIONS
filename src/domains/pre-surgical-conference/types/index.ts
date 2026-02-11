// Pre-Surgical Conference Types

export type SlideType =
  | 'clinical-summary'
  | 'comorbidities'
  | 'clinical-photographs'
  | 'laboratory-results'
  | 'current-medications'
  | 'anaesthetist-comments'
  | 'planned-procedures'
  | 'shopping-list';

export interface ConferenceSlide {
  type: SlideType;
  title: string;
  icon: string;
  order: number;
}

export const CONFERENCE_SLIDES: ConferenceSlide[] = [
  { type: 'clinical-summary', title: 'Clinical Summary', icon: 'FileText', order: 0 },
  { type: 'comorbidities', title: 'Comorbidities', icon: 'Heart', order: 1 },
  { type: 'clinical-photographs', title: 'Clinical Photographs', icon: 'Camera', order: 2 },
  { type: 'laboratory-results', title: 'Laboratory Results', icon: 'TestTube2', order: 3 },
  { type: 'current-medications', title: 'Current Medications', icon: 'Pill', order: 4 },
  { type: 'anaesthetist-comments', title: 'Anaesthetist Comments', icon: 'Stethoscope', order: 5 },
  { type: 'planned-procedures', title: 'Planned Procedures', icon: 'Scissors', order: 6 },
  { type: 'shopping-list', title: 'Shopping List / Consumables', icon: 'ShoppingCart', order: 7 },
];

export interface ConferencePatientData {
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  age: number;
  gender: string;
  bloodGroup?: string;
  genotype?: string;
  allergies: string[];
  chronicConditions: string[];
}
