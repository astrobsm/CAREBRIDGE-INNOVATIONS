/**
 * Wound core sections: the wound itself (TIMERS), infection (IWII 2022) and
 * the dressing plan.
 *
 * TIMERS (Atkin L et al. Implementing TIMERS: the race against hard-to-heal
 * wounds. J Wound Care 2019;28(3 Suppl 3):S1-S50) extends TIME (Schultz 2003)
 * with Regeneration/Repair and Social/patient factors. The S is asked once,
 * in the holistic sections (patient factors, barriers, nutrition, social), so
 * it is not repeated here.
 *
 * Measurement belongs to the WoundProgress Monitor: these fields hold the
 * numbers for the note, and the form offers to pull the latest monitored
 * assessment rather than ask the clinician to measure twice.
 *
 * Tissue and exudate vocabularies are the Monitor's own (wounds/monitorTypes),
 * so a review and a monitored assessment describe a wound in the same words.
 */
import type { EncounterSection } from '../../data/encounterModel';
import { DURATION_FIELD, SYSTEMIC_FIELD } from '../../data/encounterModel';
import type { ExudateAmount, ExudateType, TissueType } from '../../../wounds/monitorTypes';
import { namespaced } from './answers';

const TISSUE: { value: TissueType; label: string }[] = [
  { value: 'epithelial', label: 'Epithelial' },
  { value: 'granulation', label: 'Granulation' },
  { value: 'slough', label: 'Slough' },
  { value: 'necrotic', label: 'Necrotic' },
  { value: 'eschar', label: 'Eschar' },
];
const EXUDATE_AMOUNT: { value: ExudateAmount; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
];
const EXUDATE_TYPE: { value: ExudateType; label: string; flag?: 'amber'; flagReason?: string }[] = [
  { value: 'serous', label: 'Serous' },
  { value: 'sanguineous', label: 'Sanguineous' },
  { value: 'serosanguineous', label: 'Serosanguineous' },
  { value: 'purulent', label: 'Purulent', flag: 'amber', flagReason: 'Purulent exudate is an overt sign of local infection (IWII 2022).' },
];

export const WOUND_ASSESSMENT: EncounterSection = {
  id: 'core.wound_assessment',
  title: 'Wound assessment (TIMERS)',
  intent: 'Cause, size, tissue, moisture, edge and readiness for repair. Measure on the WoundProgress Monitor and pull the result in.',
  fields: [
    {
      id: 'core.wound_aetiology', label: 'Wound aetiology', kind: 'select', important: true,
      options: [
        { value: 'traumatic', label: 'Traumatic (acute)' },
        { value: 'surgical', label: 'Surgical / dehisced surgical wound' },
        { value: 'pressure', label: 'Pressure injury' },
        { value: 'venous', label: 'Venous leg ulcer' },
        { value: 'arterial', label: 'Arterial ulcer' },
        { value: 'mixed', label: 'Mixed arterial / venous' },
        { value: 'diabetic', label: 'Diabetic foot ulcer' },
        { value: 'burn', label: 'Burn' },
        { value: 'infective', label: 'Infective (abscess, necrotising infection, Buruli)' },
        { value: 'malignant', label: 'Malignant / fungating', flag: 'amber', flagReason: 'Malignant wound: histology, staging and Tumour Board; the goal may be symptom control.' },
        { value: 'radiation', label: 'Radiation injury' },
        { value: 'atypical', label: 'Atypical / uncertain', flag: 'amber', flagReason: 'Uncertain cause: biopsy and consider vasculitis, pyoderma gangrenosum, malignancy and infection.' },
      ],
    },
    { id: 'core.wound_site', label: 'Site', kind: 'text', important: true, placeholder: 'e.g. left lateral malleolus' },
    namespaced('core.wound', DURATION_FIELD),
    { id: 'core.wound_length', label: 'Length', kind: 'number', unit: 'cm', min: 0, max: 100, important: true },
    { id: 'core.wound_width', label: 'Width', kind: 'number', unit: 'cm', min: 0, max: 100, important: true },
    { id: 'core.wound_depth', label: 'Depth', kind: 'number', unit: 'cm', min: 0, max: 30 },
    { id: 'core.wound_area', label: 'Area (from the Monitor)', kind: 'number', unit: 'cm2', min: 0, max: 5000 },
    {
      id: 'core.wound_undermining', label: 'Undermining / tunnelling', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Undermining or tunnelling: probe and record its extent; it hides dead space and infection.' },
    },
    {
      id: 'core.wound_exposed', label: 'Exposed structures', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'tendon', label: 'Tendon' },
        { value: 'bone', label: 'Bone', flag: 'amber', flagReason: 'Exposed or probe-able bone: assume osteomyelitis until excluded (X-ray / MRI, bone biopsy); needs flap-level cover.' },
        { value: 'joint', label: 'Joint', flag: 'amber', flagReason: 'Open joint: orthopaedic input and early cover.' },
        { value: 'hardware', label: 'Implant / hardware', flag: 'amber', flagReason: 'Exposed hardware: joint plan with the implanting team — salvage needs early debridement and well-vascularised cover.' },
        { value: 'vessels', label: 'Major vessels', flag: 'red', flagReason: 'Exposed major vessel: risk of catastrophic bleed — urgent cover; bleeding plan at the bedside.' },
      ],
    },
    {
      id: 'core.wound_tissue', label: 'T — Tissue in the wound bed', kind: 'multiselect', important: true,
      options: TISSUE,
    },
    {
      id: 'core.wound_nonviable', label: 'Non-viable tissue (slough + necrosis)', kind: 'select',
      options: [
        { value: '0', label: 'None' },
        { value: 'lt25', label: 'Under 25%' },
        { value: '25_50', label: '25–50%' },
        { value: 'gt50', label: 'Over 50%', flag: 'amber', flagReason: 'Over half the bed is non-viable: debridement is the first treatment.' },
      ],
    },
    { id: 'core.wound_exudate', label: 'M — Exudate amount', kind: 'select', important: true, options: EXUDATE_AMOUNT },
    {
      id: 'core.wound_exudate_type', label: 'Exudate type', kind: 'select', options: EXUDATE_TYPE,
      showWhen: { field: 'core.wound_exudate', equals: ['light', 'moderate', 'heavy'] },
    },
    {
      id: 'core.wound_periwound', label: 'Surrounding skin', kind: 'multiselect',
      options: [
        { value: 'healthy', label: 'Healthy' },
        { value: 'macerated', label: 'Macerated', flag: 'amber', flagReason: 'Maceration: exudate is not being managed — more absorbent dressing, barrier film, change frequency.' },
        { value: 'excoriated', label: 'Excoriated' },
        { value: 'dry_scaly', label: 'Dry / scaly' },
        { value: 'eczema', label: 'Eczema / contact dermatitis' },
        { value: 'callus', label: 'Callus' },
        { value: 'erythema', label: 'Erythema' },
        { value: 'indurated', label: 'Indurated' },
      ],
    },
    {
      id: 'core.wound_edge', label: 'E — Edge', kind: 'select', important: true,
      options: [
        { value: 'advancing', label: 'Advancing, attached' },
        { value: 'non_advancing', label: 'Not advancing', flag: 'amber', flagReason: 'Edge not advancing: re-check the TIMERS factors; consider biopsy and advanced therapy.' },
        { value: 'rolled', label: 'Rolled (epibole)', flag: 'amber', flagReason: 'Rolled edge: refresh the edge (debridement) — epithelium cannot migrate over it.' },
        { value: 'undermined', label: 'Undermined' },
        { value: 'raised_irregular', label: 'Raised, everted or irregular', flag: 'red',
          flagReason: 'A raised, everted or irregular edge in a chronic wound is malignancy (e.g. Marjolin ulcer) until biopsy says otherwise.' },
      ],
    },
    {
      id: 'core.wound_repair', label: 'R — Readiness for repair', kind: 'select',
      options: [
        { value: 'not_ready', label: 'Not ready — bed preparation continues' },
        { value: 'ready', label: 'Ready — clean, healthy granulation: consider closure, graft or flap' },
        { value: 'adjunct', label: 'Needs an adjunct (NPWT, skin substitute)' },
        { value: 'not_healable', label: 'Not expected to heal (maintenance / palliative)' },
      ],
    },
    {
      id: 'core.wound_odour', label: 'Odour after cleansing', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'present', label: 'Present', flag: 'amber', flagReason: 'Malodour after cleansing suggests infection or necrosis (IWII 2022).' },
      ],
    },
    {
      id: 'core.wound_biopsy', label: 'Biopsy', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'indicated', label: 'Indicated — not yet done', flag: 'amber', flagReason: 'Biopsy indicated: a wound open over 3 months, atypical, or with a suspicious edge.' },
        { value: 'done', label: 'Done — result pending' },
        { value: 'benign', label: 'Done — benign' },
        { value: 'malignant', label: 'Done — malignant', flag: 'red', flagReason: 'Malignancy confirmed: staging and Tumour Board.' },
      ],
    },
  ],
};

export const WOUND_INFECTION: EncounterSection = {
  id: 'core.wound_infection',
  title: 'I — Infection (IWII 2022)',
  intent: 'Where the wound sits on the International Wound Infection Institute continuum: local (covert, overt), spreading, systemic.',
  fields: [
    {
      id: 'core.iwii_covert', label: 'Local infection — covert (subtle) signs', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'hypergranulation', label: 'Hypergranulation' },
        { value: 'friable_granulation', label: 'Bleeding, friable granulation' },
        { value: 'bridging', label: 'Epithelial bridging and pocketing in granulation' },
        { value: 'increasing_exudate', label: 'Increasing exudate' },
        { value: 'delayed_healing', label: 'Delayed healing beyond expectations' },
      ],
    },
    {
      id: 'core.iwii_overt', label: 'Local infection — overt (classic) signs', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'erythema', label: 'Erythema' },
        { value: 'warmth', label: 'Local warmth' },
        { value: 'swelling', label: 'Swelling' },
        { value: 'purulent', label: 'Purulent discharge' },
        { value: 'breakdown', label: 'Wound breakdown and enlargement' },
        { value: 'pain', label: 'New or increasing pain' },
        { value: 'malodour', label: 'Increasing malodour' },
      ],
    },
    {
      id: 'core.iwii_spreading', label: 'Spreading infection', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'extending_erythema', label: 'Extending induration / erythema', flag: 'amber', flagReason: 'Spreading infection: systemic antibiotics guided by tissue culture (IWII 2022).' },
        { value: 'lymphangitis', label: 'Lymphangitis', flag: 'amber', flagReason: 'Lymphangitis: spreading infection — systemic antibiotics.' },
        { value: 'satellite', label: 'Satellite breakdown / lesions', flag: 'amber', flagReason: 'Satellite breakdown: spreading infection.' },
        { value: 'crepitus', label: 'Crepitus', flag: 'red', flagReason: 'Crepitus suggests gas-forming necrotising infection: emergency surgical assessment.' },
      ],
    },
    namespaced('core.iwii', SYSTEMIC_FIELD),
    {
      id: 'core.nsti_concern', label: 'Features of necrotising infection (pain out of proportion, skin necrosis, bullae, crepitus)', kind: 'boolean',
      flagWhenTrue: {
        level: 'red',
        reason: 'Possible necrotising soft-tissue infection: a surgical emergency. LRINEC (Soft Tissue Infection module) supports but must never delay exploration.',
      },
    },
    {
      id: 'core.culture', label: 'Microbiology', kind: 'select',
      options: [
        { value: 'not_taken', label: 'Not taken' },
        { value: 'tissue', label: 'Tissue sample sent (after debridement)' },
        { value: 'levine', label: 'Levine-technique swab sent' },
        { value: 'result', label: 'Result available' },
      ],
    },
    { id: 'core.culture_result', label: 'Culture result / sensitivities', kind: 'text', showWhen: { field: 'core.culture', equals: ['result'] } },
  ],
};

export const WOUND_DRESSING: EncounterSection = {
  id: 'core.wound_dressing',
  title: 'Goal of care and dressing',
  intent: 'Healable, maintenance or palliative (Sibbald) — the goal decides the dressing. Who will dress it, and where.',
  fields: [
    {
      id: 'core.goal_of_care', label: 'Goal of care', kind: 'select', important: true,
      options: [
        { value: 'healing', label: 'Healing' },
        { value: 'maintenance', label: 'Maintenance — healing not possible yet (cause not yet corrected)' },
        { value: 'palliative', label: 'Symptom control — non-healable wound' },
      ],
    },
    { id: 'core.current_dressing', label: 'Current dressing', kind: 'text', placeholder: 'e.g. saline gauze, honey, alginate, foam, NPWT' },
    {
      id: 'core.dressing_frequency', label: 'Dressing frequency', kind: 'select',
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'alternate', label: 'Alternate days' },
        { value: 'twice_weekly', label: 'Twice weekly' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'npwt', label: 'NPWT changes (every 48–72 h)' },
      ],
    },
    {
      id: 'core.who_dresses', label: 'Who does the dressings', kind: 'select', important: true,
      options: [
        { value: 'clinic', label: 'This clinic / ward' },
        { value: 'phc', label: 'Nearest primary health centre / nurse' },
        { value: 'carer', label: 'Carer at home' },
        { value: 'self', label: 'Patient' },
      ],
    },
    {
      id: 'core.cleansing', label: 'Cleansing', kind: 'select',
      options: [
        { value: 'saline', label: 'Normal saline' },
        { value: 'potable_water', label: 'Clean (potable) tap water' },
        { value: 'antiseptic', label: 'Antiseptic solution (e.g. PHMB, dilute povidone-iodine)' },
      ],
    },
  ],
};
