/**
 * Bridge between the WHO-aligned preoperative protocol library and the app's
 * own investigation/anaesthesia vocabularies.
 *
 * The protocol library (domains/preoperative-planning/data/protocols.ts) is the
 * clinical source of truth: it knows which tests a given comorbidity, procedure
 * category, anaesthesia type and age demand, and why. It has its own, finer
 * vocabulary — `fbc`, `chest_xray`, `sickling_test`, `hiv_screening` — which
 * does not line up with the `InvestigationType` union the rest of the app
 * stores on an Investigation record.
 *
 * Rather than water the protocols down to the app's coarser list, or silently
 * mis-file tests, this module maps between them explicitly. Where the app has
 * no matching member the test falls to `other`, and the caller is expected to
 * carry `displayName` into the record's clinical details so the order still
 * says which test was requested.
 */

import type {
  InvestigationType as ProtocolInvestigationType,
  AnaesthesiaType as ProtocolAnaesthesiaType,
  ProcedureCategory,
  RequirementLevel,
} from '../../preoperative-planning/types';
import type {
  InvestigationType as AppInvestigationType,
  AnaesthesiaType as AppAnaesthesiaType,
} from '../../../types';

export interface MappedInvestigation {
  /** The type stored on the Investigation record. */
  type: AppInvestigationType;
  /** The record's category field. */
  category: 'laboratory' | 'radiology' | 'cardiology' | 'pathology';
  /**
   * True when the app has no dedicated member for this test and it falls to
   * `other`. Callers must then preserve the protocol's name in the order text,
   * or the request becomes an untraceable "other".
   */
  isGeneric: boolean;
}

const MAP: Record<ProtocolInvestigationType, MappedInvestigation> = {
  fbc: { type: 'full_blood_count', category: 'laboratory', isGeneric: false },
  electrolytes: { type: 'electrolytes', category: 'laboratory', isGeneric: false },
  renal_function: { type: 'renal_function', category: 'laboratory', isGeneric: false },
  liver_function: { type: 'liver_function', category: 'laboratory', isGeneric: false },
  coagulation: { type: 'coagulation', category: 'laboratory', isGeneric: false },
  blood_glucose: { type: 'blood_glucose', category: 'laboratory', isGeneric: false },
  hba1c: { type: 'hba1c', category: 'laboratory', isGeneric: false },
  urinalysis: { type: 'urinalysis', category: 'laboratory', isGeneric: false },
  thyroid_function: { type: 'thyroid_function', category: 'laboratory', isGeneric: false },
  ecg: { type: 'ecg', category: 'cardiology', isGeneric: false },
  echo: { type: 'echocardiogram', category: 'cardiology', isGeneric: false },
  chest_xray: { type: 'xray', category: 'radiology', isGeneric: false },
  // Both are cardiac biomarkers; the app has one bucket for them.
  cardiac_enzymes: { type: 'cardiac_markers', category: 'cardiology', isGeneric: false },
  bnp: { type: 'cardiac_markers', category: 'cardiology', isGeneric: false },

  // No dedicated member in the app's union — filed as `other`, name preserved
  // by the caller.
  abg: { type: 'other', category: 'laboratory', isGeneric: true },
  lactate: { type: 'other', category: 'laboratory', isGeneric: true },
  blood_group: { type: 'other', category: 'laboratory', isGeneric: true },
  pregnancy_test: { type: 'other', category: 'laboratory', isGeneric: true },
  sickling_test: { type: 'other', category: 'laboratory', isGeneric: true },
  pulmonary_function: { type: 'other', category: 'cardiology', isGeneric: true },
  hiv_screening: { type: 'other', category: 'laboratory', isGeneric: true },
  hbsag_screening: { type: 'other', category: 'laboratory', isGeneric: true },
  hcv_screening: { type: 'other', category: 'laboratory', isGeneric: true },
};

/** Map a protocol investigation onto the record type the app stores. */
export function toAppInvestigation(type: ProtocolInvestigationType): MappedInvestigation {
  return MAP[type] ?? { type: 'other', category: 'laboratory', isGeneric: true };
}

/**
 * Narrow the app's anaesthesia vocabulary to the protocol's.
 *
 * The app additionally offers `regional`, which the protocol library does not
 * model. A peripheral regional block sits alongside spinal/epidural for
 * preoperative workup purposes (neuraxial-equivalent screening, no airway
 * instrumentation), so it maps to `spinal` rather than defaulting to `general`
 * — defaulting up would demand a heavier workup than the technique warrants.
 */
export function toProtocolAnaesthesia(type: AppAnaesthesiaType | undefined): ProtocolAnaesthesiaType {
  switch (type) {
    case 'regional': return 'spinal';
    case 'spinal': return 'spinal';
    case 'epidural': return 'epidural';
    case 'local': return 'local';
    case 'sedation': return 'sedation';
    case 'general':
    default: return 'general';
  }
}

/**
 * Map the workflow's surgery category onto a protocol procedure category.
 * An emergency case is graded by its own urgency, not the planned category,
 * because the protocol library keys emergency workup separately.
 */
export function toProcedureCategory(
  surgeryCategory: 'minor' | 'intermediate' | 'major' | 'super_major',
  isEmergency: boolean,
): ProcedureCategory {
  return isEmergency ? 'emergency' : surgeryCategory;
}

/** Display order and styling for a requirement level. */
export const REQUIREMENT_META: Record<RequirementLevel, { label: string; rank: number; className: string }> = {
  mandatory: { label: 'Mandatory', rank: 0, className: 'bg-red-100 text-red-800 border-red-200' },
  recommended: { label: 'Recommended', rank: 1, className: 'bg-amber-100 text-amber-800 border-amber-200' },
  if_indicated: { label: 'If indicated', rank: 2, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  not_required: { label: 'Not required', rank: 3, className: 'bg-gray-100 text-gray-600 border-gray-200' },
};
