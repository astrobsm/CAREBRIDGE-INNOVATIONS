/**
 * The structured encounter: field model and template shape.
 *
 * WHY STRUCTURE AT ALL
 * A free-text history is fast to write and almost useless to compare. Two
 * clinicians recording the same diabetic foot ulcer produce two paragraphs that
 * no query can group, no trend can follow, and no checklist can audit. The
 * fields below turn the parts of a history that are genuinely categorical —
 * duration, mechanism, tetanus status, monofilament — into values, while
 * leaving the parts that are genuinely narrative as narrative.
 *
 * WHAT STRUCTURE MUST NOT COST
 * Structured input must not make the note worse to read. Every template
 * generates prose from its answers, and that prose is written into the existing
 * free-text fields, so the letter, the PDF and the discharge summary read as
 * they always did. Nobody downstream has to know the history was typed into
 * dropdowns.
 *
 * WHY RED FLAGS LIVE ON THE TEMPLATE
 * The clinical value of asking a structured question is that the answer can be
 * acted on. A template declares which answers should stop the clinician —
 * pain out of proportion, an ischaemic foot, a rapidly growing lump — and the
 * engine surfaces them at the point of entry rather than in a report nobody
 * reads until afterwards.
 */

// ── Fields ──────────────────────────────────────────────────────────────────

export type FieldKind =
  | 'select'        // one from a list
  | 'multiselect'   // several from a list
  | 'boolean'       // yes / no
  | 'number'        // a measured quantity
  | 'scale'         // 0–10
  | 'date'
  | 'text';         // genuinely narrative, kept deliberately short

export interface FieldOption {
  value: string;
  label: string;
  /** Shown beneath the option when it needs explaining. */
  hint?: string;
  /**
   * Choosing this answer raises a flag of this severity.
   *
   * On the option rather than the field, because it is the *answer* that is
   * concerning, not the question: "pain out of proportion to the wound" is a
   * red flag; "pain proportionate" is reassurance.
   */
  flag?: 'red' | 'amber';
  flagReason?: string;
}

export interface EncounterField {
  id: string;
  label: string;
  kind: FieldKind;
  options?: FieldOption[];
  /** For number fields. */
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  /**
   * How this field is named in the generated prose.
   *
   * Form labels are often questions — 'How long has this been present?' — which
   * read badly in a note as 'How long has this been present?: 6 weeks'. The
   * form asks; the narrative states.
   */
  narrativeLabel?: string;
  /** Shown under the label — one line, to teach rather than to nag. */
  help?: string;
  /** Only shown when another field holds one of these values. */
  showWhen?: { field: string; equals: string[] };
  /**
   * Whether the note is incomplete without it.
   *
   * Used to compute completeness, never to block saving. A clinician
   * interrupted mid-consultation must still be able to store what they have.
   */
  important?: boolean;
  /** Free text permitted alongside the choice, for the case that does not fit. */
  allowOther?: boolean;
}

export interface EncounterSection {
  id: string;
  title: string;
  /** One line explaining what this section is for. */
  intent?: string;
  fields: EncounterField[];
}

// ── Templates ───────────────────────────────────────────────────────────────

export type TemplateId = string;

export interface EncounterTemplate {
  id: TemplateId;
  name: string;
  /** What this template is for, in the clinician's words. */
  summary: string;
  /** Chief complaint ids this template is offered for. */
  complaints: string[];
  /** The clinical framework it follows, shown so the structure is accountable. */
  basis?: string;
  sections: EncounterSection[];
  /**
   * Modules this history should hand off to.
   *
   * A diabetic foot history that has established neuropathy and absent pulses
   * should send the clinician to the PAD module rather than re-asking for an
   * ankle pressure here.
   */
  handoffs?: { label: string; route: string; when?: string }[];
}

/** One completed template: answers keyed by field id. */
export type EncounterAnswers = Record<string, string | string[] | number | boolean | null>;

export interface StructuredEncounter {
  templateId: TemplateId;
  templateVersion: string;
  complaintId: string;
  /** Free text when the complaint was not in the list. */
  complaintOther?: string;
  answers: EncounterAnswers;
  /** Values the clinician typed into an `allowOther` field. */
  otherText?: Record<string, string>;
  completedAt: string;
}

// ── Reusable field groups ───────────────────────────────────────────────────

/**
 * Duration, asked as a band rather than a number.
 *
 * Bands because that is how patients answer and how the answer is used: the
 * clinically meaningful distinction for a wound is "under six weeks" versus
 * "over three months", not 41 days versus 44.
 */
export const DURATION_FIELD: EncounterField = {
  id: 'duration',
  label: 'How long has this been present?',
  narrativeLabel: 'Duration',
  kind: 'select',
  important: true,
  options: [
    { value: 'under_24h', label: 'Less than 24 hours' },
    { value: 'days', label: 'A few days' },
    { value: 'under_2w', label: 'Under 2 weeks' },
    { value: '2_6w', label: '2 to 6 weeks' },
    { value: '6w_3m', label: '6 weeks to 3 months' },
    {
      value: 'over_3m', label: 'Over 3 months',
      flag: 'amber',
      flagReason: 'A wound open beyond three months is a chronic wound — reassess the diagnosis, '
        + 'perfusion, infection and offloading rather than continuing the same regime.',
    },
    { value: 'over_1y', label: 'Over a year', flag: 'amber',
      flagReason: 'Very long-standing. Consider malignant change in a chronic ulcer (Marjolin).' },
  ],
};

/**
 * Pain, following SOCRATES.
 *
 * The mnemonic is used because it is what surgical trainees are taught, so the
 * fields map onto how the history is already taken rather than imposing a new
 * order on it.
 */
export const PAIN_FIELDS: EncounterField[] = [
  {
    id: 'pain_present', label: 'Pain', kind: 'select', important: true,
    options: [
      { value: 'none', label: 'No pain' },
      { value: 'mild', label: 'Mild' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'severe', label: 'Severe' },
      {
        value: 'out_of_proportion', label: 'Out of proportion to the findings',
        flag: 'red',
        flagReason: 'Pain out of proportion to the visible wound is a cardinal early sign of '
          + 'necrotising soft tissue infection, and of compartment syndrome after trauma. '
          + 'Assess urgently.',
      },
    ],
  },
  {
    id: 'pain_score', label: 'Pain score now', kind: 'scale', min: 0, max: 10,
    showWhen: { field: 'pain_present', equals: ['mild', 'moderate', 'severe', 'out_of_proportion'] },
  },
  {
    id: 'pain_character', label: 'Character', kind: 'select',
    showWhen: { field: 'pain_present', equals: ['mild', 'moderate', 'severe', 'out_of_proportion'] },
    options: [
      { value: 'burning', label: 'Burning' },
      { value: 'throbbing', label: 'Throbbing' },
      { value: 'sharp', label: 'Sharp' },
      { value: 'aching', label: 'Aching' },
      { value: 'cramping', label: 'Cramping' },
      {
        value: 'night_pain', label: 'Worse at night, relieved by hanging the limb down',
        flag: 'red',
        flagReason: 'This is ischaemic rest pain until proven otherwise. Assess perfusion and '
          + 'consider chronic limb-threatening ischaemia.',
      },
    ],
    allowOther: true,
  },
];

/** Systemic upset — the same question wherever infection might be present. */
export const SYSTEMIC_FIELD: EncounterField = {
  id: 'systemic',
  label: 'Systemic upset',
  kind: 'multiselect',
  options: [
    { value: 'none', label: 'None' },
    { value: 'fever', label: 'Fever or rigors', flag: 'amber',
      flagReason: 'Systemic features with a soft tissue focus warrant urgent assessment.' },
    { value: 'malaise', label: 'Malaise' },
    { value: 'confusion', label: 'New confusion', flag: 'red',
      flagReason: 'New confusion with infection suggests sepsis. Escalate now.' },
    { value: 'tachycardia', label: 'Tachycardia', flag: 'amber',
      flagReason: 'Tachycardia with a soft tissue focus is an early systemic sign and often precedes the rest.' },
    { value: 'hypotension', label: 'Hypotension', flag: 'red',
      flagReason: 'Hypotension with a soft tissue focus suggests septic shock. Escalate now.' },
    { value: 'vomiting', label: 'Vomiting' },
    { value: 'poor_glycaemic', label: 'Sudden loss of glycaemic control', flag: 'amber',
      flagReason: 'Unexplained hyperglycaemia is often the first sign of infection in diabetes.' },
  ],
};

export const TETANUS_FIELD: EncounterField = {
  id: 'tetanus',
  label: 'Tetanus status',
  kind: 'select',
  important: true,
  help: 'Ask on every wound with any breach of skin — it is the item most often missed.',
  options: [
    { value: 'up_to_date', label: 'Up to date' },
    { value: 'given_today', label: 'Given today' },
    { value: 'due', label: 'Due — not yet given', flag: 'amber',
      flagReason: 'Tetanus prophylaxis is outstanding for this wound.' },
    { value: 'unknown', label: 'Unknown', flag: 'amber',
      flagReason: 'Treat an unknown immunisation history as incomplete.' },
  ],
};
