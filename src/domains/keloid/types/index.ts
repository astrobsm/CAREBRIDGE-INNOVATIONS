/**
 * Keloid Care Planning Types
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive types for keloid management workflow including
 * clinical summary, risk factors, treatment planning, and monitoring
 */

// ==================== ENUMS & CONSTANTS ====================

export const KELOID_CONCERNS = [
  'Cosmesis',
  'Pain',
  'Ulceration',
  'Itching/Pruritus',
  'Functional limitation',
  'Psychological distress',
  'Growth/Enlargement',
  'Tenderness',
  'Bleeding',
  'Infection',
  'Recurrence after previous treatment',
] as const;

export const KELOID_RISK_FACTORS = [
  'Family history of keloids',
  'Dark skin (Fitzpatrick IV-VI)',
  'Previous keloid formation',
  'Age 10-30 years',
  'Hormonal changes (pregnancy/puberty)',
  'Wound tension at site',
  'Infection at wound site',
  'Foreign body reaction',
  'Ear piercing',
  'Burns/Trauma',
  'Surgical scar',
  'Vaccination site',
  'Acne',
] as const;

export const KELOID_LOCATIONS = [
  'Ear (lobule)',
  'Ear (helix)',
  'Chest/Sternum',
  'Shoulder',
  'Upper arm',
  'Jaw/Mandible',
  'Neck',
  'Back',
  'Abdomen',
  'Pubic area',
  'Extremities',
  'Face',
  'Scalp',
  'Other',
] as const;

export const COMORBIDITY_OPTIONS = [
  'None',
  'Diabetes Mellitus',
  'Hypertension',
  'HIV/AIDS',
  'Tuberculosis',
  'Sickle Cell Disease',
  'Hepatitis B',
  'Hepatitis C',
  'Asthma',
  'Autoimmune disorder',
  'Pregnancy',
  'Immunosuppression',
  'Chronic kidney disease',
  'Other',
] as const;

export const PRE_TRIAMCINOLONE_TESTS = [
  { id: 'fbc', name: 'Full Blood Count (FBC)', category: 'hematology', required: true },
  { id: 'mantoux', name: 'Mantoux Test', category: 'microbiology', required: true },
  { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', category: 'biochemistry', required: true },
  { id: 'pregnancy', name: 'Pregnancy Test (UPT)', category: 'biochemistry', requiredForFemales: true, condition: 'Female of reproductive age (15-49 years)' },
] as const;

export const RADIOTHERAPY_INDICATIONS = [
  'Recurrent keloid after surgical excision',
  'Large keloids (>2cm)',
  'Keloids in high-risk recurrence areas (chest, shoulder)',
  'Failed multimodality treatment',
  'Multiple previous recurrences',
  'Keloid with wide base',
] as const;

export const RADIOTHERAPY_SIDE_EFFECTS = [
  {
    effect: 'Skin erythema (redness)',
    timing: 'Days to weeks post-treatment',
    management: 'Topical emollients, avoid sun exposure',
  },
  {
    effect: 'Hyperpigmentation',
    timing: '2-4 weeks post-treatment',
    management: 'Usually self-resolving; photoprotection with SPF 30+',
  },
  {
    effect: 'Skin dryness/desquamation',
    timing: '1-3 weeks post-treatment',
    management: 'Regular moisturizer application, avoid harsh soaps',
  },
  {
    effect: 'Pruritus (itching)',
    timing: 'During and after treatment',
    management: 'Antihistamines (cetirizine 10mg daily), topical calamine',
  },
  {
    effect: 'Wound healing delay',
    timing: 'If given post-surgery',
    management: 'Wound care, monitor for infection, consider delayed suture removal',
  },
  {
    effect: 'Telangiectasia',
    timing: 'Months to years',
    management: 'Usually cosmetic concern only; laser therapy if needed',
  },
  {
    effect: 'Theoretical malignancy risk',
    timing: 'Long-term (very low risk with superficial radiation)',
    management: 'Use lowest effective dose, document cumulative dose, long-term follow-up',
  },
] as const;

// ==================== INTERFACES ====================

export interface KeloidAssessment {
  location: string;
  size: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm';
  };
  duration: string;
  previousTreatments?: string[];
  vascularity: 'low' | 'moderate' | 'high';
  firmness: 'soft' | 'firm' | 'hard';
  color: string;
  symptoms: string[];
  photographUrl?: string;
}

export interface TriamcinoloneSchedule {
  id: string;
  sessionNumber: number;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  dose?: string;
  concentration?: string;
  responseNotes?: string;
  administeredBy?: string;
  administeredByName?: string;
  sideEffects?: string[];
  phase: 'pre_op' | 'post_op';
}

export interface SurgerySchedule {
  plannedDate?: Date;
  actualDate?: Date;
  status: 'planned' | 'completed' | 'cancelled' | 'postponed';
  surgeonId?: string;
  surgeonName?: string;
  surgeryType: string;
  notes?: string;
  surgeryId?: string; // Link to surgery table
}

export interface SiliconeCompressionTherapy {
  commencementDate?: Date;
  siliconeSheetStartDate?: Date;
  compressionGarmentStartDate?: Date;
  siliconeInstructions: string;
  compressionInstructions: string;
  durationWeeks: number;
  complianceNotes?: string;
}

export interface RadiotherapyPlan {
  indicated: boolean;
  indications?: string[];
  timing: string; // e.g., "Within 24-72 hours post-surgery"
  totalDose?: string;
  fractions?: number;
  sideEffectsDiscussed: boolean;
  consentObtained: boolean;
  referralDate?: Date;
  referralFacility?: string;
  notes?: string;
}

export interface PreTriamcinoloneTestStatus {
  testId: string;
  testName: string;
  status: 'required' | 'ordered' | 'completed' | 'not_required';
  resultDate?: Date;
  resultSummary?: string;
  investigationId?: string;
  isNormal?: boolean;
}

export interface KeloidCarePlan {
  id: string;
  patientId: string;
  hospitalId: string;
  encounterId?: string;
  
  // Clinical Summary
  clinicalSummary: string;
  diagnosisDate?: Date;
  
  // Assessment
  keloidAssessments: KeloidAssessment[];
  
  // Identified Problems & Concerns
  identifiedProblems: string[];
  otherConcerns?: string;
  
  // Risk Factors
  riskFactors: string[];
  
  // Comorbidities
  comorbidities: string[];
  hasNoComorbidities: boolean;
  
  // Pre-Triamcinolone Tests
  preTriamcinoloneTests: PreTriamcinoloneTestStatus[];
  patientGender: 'male' | 'female';
  patientAge: number;
  allTestsCleared: boolean;
  
  // Treatment Plan
  treatmentPlan: {
    // Pre-op Triamcinolone
    preOpTriamcinolone: {
      enabled: boolean;
      numberOfSessions: number;
      intervalWeeks: number; // Default 3 weeks
      schedule: TriamcinoloneSchedule[];
      startDate?: Date;
    };
    
    // Surgery
    surgery: {
      planned: boolean;
      schedule?: SurgerySchedule;
    };
    
    // Post-op Triamcinolone
    postOpTriamcinolone: {
      enabled: boolean;
      numberOfSessions: number;
      intervalWeeks: number; // Default 3 weeks
      schedule: TriamcinoloneSchedule[];
      startDate?: Date;
    };
    
    // Silicone Sheet & Compression
    siliconeCompression: SiliconeCompressionTherapy;
    
    // Radiotherapy
    radiotherapy: RadiotherapyPlan;
  };
  
  // Multi-modality approach info
  multiModalityExplained: boolean;
  complianceImportanceExplained: boolean;
  patientConsentObtained: boolean;
  
  // Status
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  
  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Sync
  syncedAt?: Date;
  localId?: string;
}
