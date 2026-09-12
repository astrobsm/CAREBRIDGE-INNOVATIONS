/**
 * Validated scar assessment scales, as data.
 *
 * WHY THESE ARE DECLARATIVE
 * Each instrument keeps its own published item wording, its own response
 * anchors and its own scoring. They are stored independently and never mapped
 * onto one another: a VSS of 6 and a POSAS observer total of 24 are not
 * equivalent, and inventing a conversion between them would manufacture
 * clinical meaning that does not exist.
 *
 * WHAT EACH ITEM CAN ACTUALLY BE ANSWERED FROM
 * Every item declares its `source`. This is the honest core of the module.
 * Pliability is palpation; a photograph cannot supply it, and a system that
 * quietly filled it in from an image would be fabricating a clinical finding.
 * Items marked `image_assisted` may be *prefilled* from measurement as a
 * starting point, but the clinician's answer is what is stored.
 *
 * VERIFY BEFORE CLINICAL USE
 * Instruments carrying `requiresVerification` have their structure declared
 * here but not their item wording, because reproducing a published instrument
 * from memory is exactly the kind of plausible fabrication that makes a
 * clinical tool dangerous. Those must be completed from the source publication
 * by the institution before the module will score them.
 */

export type ScaleItemSource =
  | 'image_assisted'   // a measurement can propose it; the clinician confirms
  | 'clinician'        // requires examination
  | 'patient';         // the patient's own answer

export interface ScaleOption {
  value: number;
  label: string;
}

export interface ScaleItem {
  id: string;
  label: string;
  source: ScaleItemSource;
  /** Discrete options, for categorical items. */
  options?: ScaleOption[];
  /** Numeric range, for items scored on a continuous rating scale. */
  min?: number;
  max?: number;
  /** Anchors shown at either end of a numeric item. */
  minLabel?: string;
  maxLabel?: string;
  /** Which subscale total this item contributes to, where one exists. */
  subscale?: string;
  /** Excluded from the total by the instrument's own scoring rules. */
  excludedFromTotal?: boolean;
  help?: string;
}

export interface ScaleDefinition {
  id: string;
  name: string;
  abbreviation: string;
  version: string;
  /** Which kinds of scar the instrument is intended for. */
  appliesTo: 'any_scar' | 'keloid';
  items: ScaleItem[];
  /** Range of the total when every scored item is answered. */
  totalRange: [number, number] | null;
  lowerIsBetter: boolean;
  /** Named subscale totals, in display order. */
  subscales?: { id: string; label: string; range: [number, number] }[];
  /** Where the instrument comes from, shown beside the score. */
  citation: string;
  /**
   * Set when item wording could not be reproduced with confidence. The scale
   * is offered structurally but cannot be scored until an administrator enters
   * the published items.
   */
  requiresVerification?: boolean;
  verificationNote?: string;
  notes?: string[];
}

// ── Vancouver Scar Scale ────────────────────────────────────────────────────

const VSS: ScaleDefinition = {
  id: 'vss',
  name: 'Vancouver Scar Scale',
  abbreviation: 'VSS',
  version: '1.0',
  appliesTo: 'any_scar',
  lowerIsBetter: true,
  totalRange: [0, 14],
  citation: 'Sullivan T, Smith J, Kermode J, McIver E, Courtemanche DJ. Rating the burn scar. J Burn Care Rehabil. 1990;11(3):256-60.',
  notes: [
    'Pliability is a palpation item and is never derived from a photograph.',
    'Height may be prefilled from 3D reconstruction when one is available; it is measured by examination otherwise.',
  ],
  items: [
    {
      id: 'vascularity',
      label: 'Vascularity',
      source: 'image_assisted',
      help: 'Assessed by colour; blanching on pressure confirms it clinically.',
      options: [
        { value: 0, label: 'Normal — colour resembles the rest of the body' },
        { value: 1, label: 'Pink' },
        { value: 2, label: 'Red' },
        { value: 3, label: 'Purple' },
      ],
    },
    {
      id: 'pigmentation',
      label: 'Pigmentation',
      source: 'image_assisted',
      options: [
        { value: 0, label: 'Normal — colour resembles the rest of the body' },
        { value: 1, label: 'Hypopigmentation' },
        { value: 2, label: 'Mixed pigmentation' },
        { value: 3, label: 'Hyperpigmentation' },
      ],
    },
    {
      id: 'pliability',
      label: 'Pliability',
      source: 'clinician',
      help: 'Palpation only. No photographic or 3D measurement substitutes for this.',
      options: [
        { value: 0, label: 'Normal' },
        { value: 1, label: 'Supple — flexible with minimal resistance' },
        { value: 2, label: 'Yielding — giving way to pressure' },
        { value: 3, label: 'Firm — inflexible, not easily moved' },
        { value: 4, label: 'Banding — rope-like tissue that blanches on extension' },
        { value: 5, label: 'Contracture — permanent shortening producing deformity' },
      ],
    },
    {
      id: 'height',
      label: 'Height / thickness',
      source: 'clinician',
      help: 'Prefilled from 3D reconstruction when one is available and reliable.',
      options: [
        { value: 0, label: 'Flat / normal' },
        { value: 1, label: 'Less than 2 mm' },
        { value: 2, label: '2 mm to 5 mm' },
        { value: 3, label: 'More than 5 mm' },
      ],
    },
  ],
};

// ── POSAS v2.0 ──────────────────────────────────────────────────────────────

const posasNumeric = (
  id: string,
  label: string,
  source: ScaleItemSource,
  subscale: string,
  minLabel: string,
  help?: string,
): ScaleItem => ({
  id, label, source, subscale,
  min: 1, max: 10,
  minLabel,
  maxLabel: 'Worst imaginable scar',
  help,
});

const POSAS: ScaleDefinition = {
  id: 'posas',
  name: 'Patient and Observer Scar Assessment Scale',
  abbreviation: 'POSAS',
  version: '2.0',
  appliesTo: 'any_scar',
  lowerIsBetter: true,
  // The two 6-item subscales. The overall-opinion items are recorded but, per
  // the instrument's scoring, are reported separately rather than summed in.
  totalRange: [12, 120],
  citation: 'Draaijers LJ, Tempelman FRH, Botman YAM, et al. The Patient and Observer Scar Assessment Scale: a reliable and feasible tool for scar evaluation. Plast Reconstr Surg. 2004;113(7):1960-5.',
  notes: [
    'POSAS is not a photographically automated instrument. Pliability, thickness and relief are palpation items, and the entire patient scale is the patient’s own answer.',
    'The overall opinion items are recorded but excluded from the subscale totals, following the instrument’s scoring.',
    'POSAS v3.0 (2023) restructures the instrument. This is v2.0; do not mix scores between versions.',
  ],
  subscales: [
    { id: 'observer', label: 'Observer scale', range: [6, 60] },
    { id: 'patient', label: 'Patient scale', range: [6, 60] },
  ],
  items: [
    posasNumeric('obs_vascularity', 'Vascularity', 'image_assisted', 'observer', 'Normal skin'),
    posasNumeric('obs_pigmentation', 'Pigmentation', 'image_assisted', 'observer', 'Normal skin'),
    posasNumeric('obs_thickness', 'Thickness', 'clinician', 'observer', 'Normal skin'),
    posasNumeric('obs_relief', 'Relief', 'clinician', 'observer', 'Normal skin'),
    posasNumeric('obs_pliability', 'Pliability', 'clinician', 'observer', 'Normal skin',
      'Palpation only.'),
    posasNumeric('obs_surface_area', 'Surface area', 'image_assisted', 'observer', 'Normal skin'),
    {
      ...posasNumeric('obs_overall', 'Observer overall opinion', 'clinician', 'observer', 'Normal skin'),
      excludedFromTotal: true,
    },

    posasNumeric('pat_pain', 'Has the scar been painful?', 'patient', 'patient', 'No, not at all'),
    posasNumeric('pat_itch', 'Has the scar been itching?', 'patient', 'patient', 'No, not at all'),
    posasNumeric('pat_colour', 'Is the scar colour different?', 'patient', 'patient', 'No, as normal skin'),
    posasNumeric('pat_stiffness', 'Is the scar stiffer?', 'patient', 'patient', 'No, as normal skin'),
    posasNumeric('pat_thickness', 'Is the scar thicker?', 'patient', 'patient', 'No, as normal skin'),
    posasNumeric('pat_irregular', 'Is the scar more irregular?', 'patient', 'patient', 'No, as normal skin'),
    {
      ...posasNumeric('pat_overall', 'Patient overall opinion', 'patient', 'patient', 'Normal skin'),
      excludedFromTotal: true,
    },
  ],
};

// ── Manchester Scar Scale ───────────────────────────────────────────────────

const MANCHESTER: ScaleDefinition = {
  id: 'manchester',
  name: 'Manchester Scar Scale',
  abbreviation: 'MSS',
  version: '1.0',
  appliesTo: 'any_scar',
  lowerIsBetter: true,
  totalRange: [5, 18],
  citation: 'Beausang E, Floyd H, Dunn KW, Orton CI, Ferguson MWJ. A new quantitative scale for clinical scar assessment. Plast Reconstr Surg. 1998;102(6):1954-61.',
  notes: [
    'A visual analogue score accompanies the categorical items in the published instrument and is recorded separately alongside it.',
  ],
  items: [
    {
      id: 'colour', label: 'Colour', source: 'image_assisted',
      options: [
        { value: 1, label: 'Perfect' },
        { value: 2, label: 'Slight mismatch' },
        { value: 3, label: 'Obvious mismatch' },
        { value: 4, label: 'Gross mismatch' },
      ],
    },
    {
      id: 'surface', label: 'Skin surface', source: 'image_assisted',
      options: [
        { value: 1, label: 'Matte' },
        { value: 2, label: 'Shiny' },
      ],
    },
    {
      id: 'contour', label: 'Contour', source: 'clinician',
      options: [
        { value: 1, label: 'Flush with surrounding skin' },
        { value: 2, label: 'Slightly proud or indented' },
        { value: 3, label: 'Hypertrophic' },
        { value: 4, label: 'Keloid' },
      ],
    },
    {
      id: 'distortion', label: 'Distortion', source: 'clinician',
      options: [
        { value: 1, label: 'None' },
        { value: 2, label: 'Mild' },
        { value: 3, label: 'Moderate' },
        { value: 4, label: 'Severe' },
      ],
    },
    {
      id: 'texture', label: 'Texture', source: 'clinician',
      help: 'Palpation only.',
      options: [
        { value: 1, label: 'Normal' },
        { value: 2, label: 'Just palpable' },
        { value: 3, label: 'Firm' },
        { value: 4, label: 'Hard' },
      ],
    },
  ],
};

// ── Detroit Keloid Scale ────────────────────────────────────────────────────

/**
 * Declared but deliberately not populated.
 *
 * The DKS is keloid-specific and the module is built to carry it — it appears
 * in the scale list, in the data model, in the trend engine and in the report.
 * What is missing is its published item wording and response anchors, which I
 * will not reproduce from memory: a scar instrument with subtly wrong items
 * produces scores that look valid, compare cleanly against each other, and
 * mean nothing. Better an honest gap than a convincing fake.
 *
 * An administrator completes `items` from the source publication, clears
 * `requiresVerification`, and the scale scores like any other.
 */
const DKS: ScaleDefinition = {
  id: 'dks',
  name: 'Detroit Keloid Scale',
  abbreviation: 'DKS',
  version: 'unverified',
  appliesTo: 'keloid',
  lowerIsBetter: true,
  totalRange: null,
  items: [],
  requiresVerification: true,
  verificationNote:
    'Item wording and response anchors must be entered from the source publication before this scale can be scored. '
    + 'The module supports it structurally — baseline, follow-up, component scores, change from baseline and trend — '
    + 'but will not score an instrument whose items have not been verified.',
  citation: 'Detroit Keloid Scale — enter the full citation with the verified items.',
};

// ── Registry ────────────────────────────────────────────────────────────────

export const SCALE_DEFINITIONS: ScaleDefinition[] = [VSS, POSAS, MANCHESTER, DKS];

export const getScale = (id: string): ScaleDefinition | undefined =>
  SCALE_DEFINITIONS.find(s => s.id === id);

/** Scales offered for a scar of this classification. */
export function scalesFor(isKeloid: boolean): ScaleDefinition[] {
  return SCALE_DEFINITIONS.filter(s => s.appliesTo === 'any_scar' || isKeloid);
}

export interface ScoreResult {
  total: number | null;
  subscales: Record<string, number>;
  /** Items with no response. A total over missing items would be misleading. */
  incompleteItems: string[];
  scorable: boolean;
  reason?: string;
}

/**
 * Score a set of responses against an instrument.
 *
 * Returns a null total when any scored item is unanswered rather than summing
 * what happens to be present. A partial total is not a smaller score — it is a
 * different quantity, and comparing one against a complete total across visits
 * would read a gap in the record as clinical improvement.
 */
export function scoreScale(
  scale: ScaleDefinition,
  responses: Record<string, number>,
): ScoreResult {
  if (scale.requiresVerification) {
    return {
      total: null,
      subscales: {},
      incompleteItems: [],
      scorable: false,
      reason: scale.verificationNote ?? 'This scale has not been verified for scoring.',
    };
  }

  const scored = scale.items.filter(i => !i.excludedFromTotal);
  const incompleteItems = scored
    .filter(i => typeof responses[i.id] !== 'number' || Number.isNaN(responses[i.id]))
    .map(i => i.id);

  const subscales: Record<string, number> = {};
  for (const item of scored) {
    const v = responses[item.id];
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    if (item.subscale) {
      subscales[item.subscale] = (subscales[item.subscale] ?? 0) + v;
    }
  }

  if (incompleteItems.length) {
    return { total: null, subscales, incompleteItems, scorable: true, reason: 'Some items are unanswered.' };
  }

  const total = scored.reduce((sum, i) => sum + (responses[i.id] ?? 0), 0);
  return { total, subscales, incompleteItems: [], scorable: true };
}

/** Items a clinician must answer by examination — never inferable from an image. */
export const examinationOnlyItems = (scale: ScaleDefinition): ScaleItem[] =>
  scale.items.filter(i => i.source === 'clinician');
