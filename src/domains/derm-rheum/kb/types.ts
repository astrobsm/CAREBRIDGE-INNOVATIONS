/**
 * The dermatology and rheumatology knowledge base: types.
 *
 * Every condition is cited, versioned configuration, not prose in a prompt.
 * The rules plan, the atypical-ulcer screen, the hard rules and the Claude
 * consult all read the same entries. Anything not yet checked against a
 * source by a clinician carries `pendingValidation` and is shown as
 * "pending clinical validation" wherever it appears.
 */

export type KbCategory =
  | 'neutrophilic' | 'vasculitis' | 'connective_tissue' | 'vasculopathy' | 'metabolic'
  | 'malignant' | 'infective' | 'haematological' | 'follicular' | 'drug' | 'fibrotic';

export const KB_CATEGORY_LABEL: Record<KbCategory, string> = {
  neutrophilic: 'Neutrophilic dermatosis', vasculitis: 'Vasculitis', connective_tissue: 'Connective tissue disease',
  vasculopathy: 'Occlusive vasculopathy', metabolic: 'Metabolic / degenerative', malignant: 'Malignant',
  infective: 'Infective (tropical / mycobacterial / fungal)', haematological: 'Haematological', follicular: 'Follicular / inflammatory',
  drug: 'Drug reaction', fibrotic: 'Fibrous / scar-like tumour',
};

export type Specialty = 'dermatology' | 'rheumatology' | 'oncology' | 'infectious_disease' | 'haematology' | 'nephrology'
  | 'ophthalmology' | 'burns_icu' | 'gastroenterology' | 'tb_leprosy_programme' | 'vascular';

export const SPECIALTY_LABEL: Record<Specialty, string> = {
  dermatology: 'Dermatology', rheumatology: 'Rheumatology', oncology: 'Oncology / tumour board', infectious_disease: 'Infectious diseases',
  haematology: 'Haematology', nephrology: 'Nephrology', ophthalmology: 'Ophthalmology', burns_icu: 'Burns unit / intensive care',
  gastroenterology: 'Gastroenterology', tb_leprosy_programme: 'National TB and Leprosy Control Programme (DOTS clinic)', vascular: 'Vascular surgery',
};

/** One investigation, in the investigation catalogue's terms where the catalogue has it. */
export interface KbInvestigation {
  /** Stable id within the KB ("dif", "ana"). */
  id: string;
  text: string;
  why: string;
  /** Code in services/investigationRequestService INVESTIGATION_CATALOG, when it exists. */
  catalogueCode?: string;
  urgency?: 'urgent' | 'soon' | 'routine';
  kind: 'biopsy' | 'serology' | 'blood' | 'microbiology' | 'imaging' | 'bedside';
}

export interface KbReferral {
  to: Specialty;
  when: string;
  urgency: 'urgent' | 'soon' | 'routine';
}

export interface KbCondition {
  id: string;
  label: string;
  category: KbCategory;
  synonyms: string[];
  /** Key history features. */
  history: string[];
  /** Key examination features. */
  exam: string[];
  /** How the condition looks on dark (Fitzpatrick V–VI) skin, and the dyspigmentation to expect. */
  skinOfColour: string[];
  redFlags: string[];
  /** Diagnostic or classification criteria, and the score tool that computes them (scores.ts), if any. */
  criteria?: { name: string; source: string; toolId?: string; classificationOnly?: boolean };
  /** Biopsy: what kind, where, and how the specimen is handled. */
  biopsy?: { type: string; site: string; handling: string };
  investigations: KbInvestigation[];
  management: { immediate: string[]; definitive: string[] };
  /** Clinically critical warnings: always shown with the condition. */
  warnings: string[];
  /** Specific things not to do. */
  doNot: string[];
  refer: KbReferral[];
  sources: string[];
  /** What is not yet checked against a source by a clinician. Empty = cited throughout. */
  pendingValidation: string[];
}
