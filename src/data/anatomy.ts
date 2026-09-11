/**
 * Anatomical sites and wound aetiologies, for structured recording.
 *
 * Free text defeats the point of a wound registry. "Left heel", "L heel",
 * "heel (left)" and "lt. heel" are one site to a clinician and four to a
 * database, so no site can be counted, compared across visits, or audited.
 * These lists exist so the same wound is written the same way every time.
 *
 * Chosen for the case mix of a plastic surgery and burns unit rather than a
 * generic body atlas — which is why Buruli and tropical ulcer, Fournier's
 * gangrene, machete injury, snake bite and traditional-treatment injury appear,
 * and why the foot and hand are broken down far more finely than the trunk.
 *
 * Every list ends in `Other`, which reveals a free-text field. Recording
 * something uncommon must never be harder than recording something common, or
 * it gets forced into the nearest wrong option and the data is worse than if
 * there had been no list at all.
 */

export interface OptionGroup {
  label: string;
  options: string[];
}

/** Sentinel that switches a select to free text. */
export const OTHER_OPTION = 'Other';

/**
 * Anatomical sites, grouped by region.
 *
 * Laterality is recorded separately, so sites are not duplicated left and
 * right — that would double the list and let the two fields contradict.
 */
export const ANATOMICAL_SITES: OptionGroup[] = [
  {
    label: 'Head and neck',
    options: [
      'Scalp', 'Occiput', 'Forehead', 'Temple', 'Eyebrow', 'Upper eyelid', 'Lower eyelid',
      'Periorbital', 'Nose', 'Nasal ala', 'Nasal tip', 'Cheek', 'Malar / zygoma',
      'Ear — helix', 'Ear — lobule', 'Pre-auricular', 'Post-auricular',
      'Upper lip', 'Lower lip', 'Perioral', 'Chin', 'Mandible / jaw',
      'Anterior neck', 'Lateral neck', 'Posterior neck', 'Submental',
    ],
  },
  {
    label: 'Chest and abdomen',
    options: [
      'Anterior chest wall', 'Sternum', 'Breast', 'Inframammary fold', 'Axillary fold',
      'Epigastrium', 'Periumbilical', 'Upper abdomen', 'Lower abdomen',
      'Flank', 'Suprapubic', 'Inguinal / groin',
    ],
  },
  {
    label: 'Back and pressure areas',
    options: [
      'Upper back', 'Interscapular', 'Scapular', 'Mid back', 'Lumbar',
      'Sacrum', 'Coccyx', 'Ischial tuberosity', 'Gluteal / buttock', 'Natal cleft',
      'Greater trochanter',
    ],
  },
  {
    label: 'Perineum and genitalia',
    options: [
      'Perineum', 'Perianal', 'Scrotum', 'Penis', 'Vulva', 'Groin crease',
    ],
  },
  {
    label: 'Shoulder and arm',
    options: [
      'Shoulder', 'Deltoid', 'Axilla', 'Upper arm — anterior', 'Upper arm — posterior',
      'Elbow', 'Olecranon', 'Antecubital fossa',
      'Forearm — volar', 'Forearm — dorsal',
    ],
  },
  {
    label: 'Wrist and hand',
    options: [
      'Wrist — volar', 'Wrist — dorsal', 'Dorsum of hand', 'Palm',
      'Thenar eminence', 'Hypothenar eminence', 'First web space', 'Finger web space',
      'Thumb', 'Index finger', 'Middle finger', 'Ring finger', 'Little finger',
      'Fingertip / pulp', 'Nail bed', 'Multiple digits',
    ],
  },
  {
    label: 'Hip, thigh and knee',
    options: [
      'Hip', 'Thigh — anterior', 'Thigh — posterior', 'Thigh — medial', 'Thigh — lateral',
      'Knee', 'Patella', 'Popliteal fossa',
    ],
  },
  {
    label: 'Leg, ankle and foot',
    options: [
      'Pretibial / shin', 'Leg — lateral', 'Leg — posterior', 'Calf',
      'Medial malleolus', 'Lateral malleolus', 'Ankle — anterior', 'Achilles tendon',
      'Heel', 'Dorsum of foot', 'Plantar — forefoot', 'Plantar — midfoot',
      'Plantar arch', 'Metatarsal head', 'Hallux', 'Lesser toe',
      'Toe web space', 'Amputation stump — foot',
    ],
  },
  {
    label: 'Extensive or multiple',
    options: [
      'Multiple sites', 'Circumferential — limb', 'Amputation stump — above knee',
      'Amputation stump — below knee', 'Amputation stump — upper limb',
      'Skin graft donor site', 'Flap donor site',
    ],
  },
];

/**
 * Wound aetiologies, grouped by mechanism.
 *
 * Mechanism rather than appearance, because the cause is what determines
 * management and what a registry is later asked about.
 */
export const WOUND_ETIOLOGIES: OptionGroup[] = [
  {
    label: 'Trauma',
    options: [
      'Road traffic accident', 'Fall', 'Assault', 'Gunshot', 'Stab / laceration',
      'Machete / cut', 'Crush injury', 'Degloving injury', 'Blast injury',
      'Industrial / machinery injury', 'Animal bite', 'Human bite', 'Snake bite',
      'Insect bite or sting',
    ],
  },
  {
    label: 'Burns',
    options: [
      'Flame burn', 'Scald', 'Contact burn', 'Chemical burn', 'Electrical burn',
      'Friction burn', 'Radiation burn', 'Sunburn', 'Petrol / fuel burn',
    ],
  },
  {
    label: 'Pressure and immobility',
    options: [
      'Prolonged pressure / immobility', 'Device-related pressure',
      'Plaster or cast pressure', 'Tourniquet injury',
    ],
  },
  {
    label: 'Vascular',
    options: [
      'Venous insufficiency', 'Arterial insufficiency / ischaemia',
      'Mixed arterial and venous', 'Lymphoedema-related', 'Vasculitis',
      'Sickle cell ulcer', 'Extravasation injury',
    ],
  },
  {
    label: 'Diabetes',
    options: [
      'Diabetic foot — neuropathic', 'Diabetic foot — ischaemic',
      'Diabetic foot — neuroischaemic', 'Diabetic foot — infected',
    ],
  },
  {
    label: 'Infection',
    options: [
      'Abscess / post incision and drainage', 'Necrotising fasciitis',
      "Fournier's gangrene", 'Cellulitis', 'Osteomyelitis-related',
      'Buruli ulcer', 'Tropical ulcer', 'Tuberculous ulcer', 'Fungal infection',
      'Post-injection abscess',
    ],
  },
  {
    label: 'Surgical and iatrogenic',
    options: [
      'Surgical wound — healing by secondary intention', 'Wound dehiscence',
      'Skin graft donor site', 'Flap donor site', 'Post-debridement defect',
      'Post-tumour excision defect', 'Amputation stump', 'Stoma-related',
      'Graft or flap failure',
    ],
  },
  {
    label: 'Oncological',
    options: [
      'Malignant ulcer — squamous cell carcinoma', 'Malignant ulcer — basal cell carcinoma',
      'Malignant ulcer — melanoma', "Marjolin's ulcer", 'Fungating tumour',
    ],
  },
  {
    label: 'Other causes',
    options: [
      'Traditional or native treatment injury', 'Keloid or hypertrophic scar breakdown',
      'Contracture release defect', 'Congenital', 'Self-inflicted', 'Idiopathic',
    ],
  },
];

/** Flat list of every site, for search and validation. */
export function allAnatomicalSites(): string[] {
  return ANATOMICAL_SITES.flatMap(g => g.options);
}

/** Flat list of every aetiology. */
export function allEtiologies(): string[] {
  return WOUND_ETIOLOGIES.flatMap(g => g.options);
}

/**
 * Is this value one of the listed options?
 *
 * Used to decide whether a stored value should select an option or populate the
 * free-text field — so reopening a wound recorded as something uncommon shows
 * what was actually written rather than silently resetting it.
 */
export function isListedOption(value: string | undefined, groups: OptionGroup[]): boolean {
  if (!value) return false;
  return groups.some(g => g.options.includes(value));
}
