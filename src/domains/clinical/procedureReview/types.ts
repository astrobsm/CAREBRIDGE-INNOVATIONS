/**
 * Procedure reviews — THE CONTRACT.
 *
 * A procedure review is a structured plastic-surgery encounter for one
 * procedure at one phase of care: a wound review, a pre-operative review, a
 * post-operative review or a follow-up. It is composed of
 *
 *   1. CORE sections, written once (core/), that every review of that phase
 *      needs whatever the procedure — comorbidity risk, healing barriers,
 *      nutrition, anaesthetic fitness, pressure risk, pain, psychology,
 *      social circumstances, post-operative status, interval history, the
 *      wound itself — and
 *   2. MODULE sections, which hold only what is specific to the procedure
 *      (a skin graft's donor site, a flap's perfusion monitoring…).
 *
 * The engine (engine.ts) composes the two, computes every score with the
 * app's existing calculators, raises flags with reasons, measures
 * completeness and writes the narrative. The plan builder (planBuilder.ts)
 * runs the core rules and the module's rules and returns a ScribePlan — the
 * same draft the medical scribe produces — so the plan goes through the
 * existing consultant approval → TreatmentPlan → implementation log. The
 * consent builder (consent.ts) extends buildSurgicalDocument with the
 * module's ConsentSpec and the patient's own risk modifiers.
 *
 * A NEW PROCEDURE IS DATA. Write a ProcedureModule, add it to its group's
 * index file under procedures/, and the registry test checks it. See
 * docs/PROCEDURE_REVIEW_TEMPLATES.md for the step-by-step guide.
 *
 * Decision support only: everything generated here is a draft for the
 * clinician to edit and a consultant to approve.
 */
import type {
  EncounterAnswers, EncounterField, EncounterSection,
} from '../data/encounterModel';
import type { RaisedFlag } from '../services/templateEngine';
import type { ScribePlan, ProblemPlan } from '../scribe/scribePlan';
import type { ClerkingStatus } from '../clerking/records';
import type { DocumentSection } from '../../surgery/utils/surgicalDocumentGenerator';

// ── Phases and groups ───────────────────────────────────────────────────────

/** The four kinds of review. Each maps to one EncounterType (see REVIEW_PHASES). */
export type ReviewPhase = 'wound_review' | 'pre_op' | 'post_op' | 'follow_up';

/**
 * How procedures are grouped in the picker and in the registry. Each group
 * corresponds to a folder (or a shared folder) under procedures/.
 */
export type ProcedureGroup =
  | 'wound' | 'reconstruction' | 'oncology' | 'hand' | 'diabetic_foot'
  | 'pressure' | 'burns' | 'aesthetic' | 'other';

/**
 * Ids of the core sections (core/). A module can add a core section to a
 * phase that does not include it by default (`includeCore`) or leave one out
 * (`excludeCore`) — e.g. a wound follow-up re-assesses the wound.
 */
export type CoreSectionId =
  | 'wound_assessment'      // aetiology, TIMERS, measurements, surrounding skin
  | 'wound_infection'       // IWII 2022 continuum
  | 'tetanus'               // immunisation status + wound risk (Green Book / WHO); opt-in
  | 'post_op_status'        // observations, wound, drain, complications
  | 'follow_up_interval'    // interval history, adherence, function, comparison
  | 'patient_factors'       // comorbidity risk
  | 'healing_barriers'      // everything that interferes with healing
  | 'nutrition'             // MUST + biochemistry + intake
  | 'anaesthetic'           // ASA, airway, RCRI, STOP-BANG, METs, CFS, Apfel, fasting, bleeding
  | 'vte'                   // Caprini
  | 'pressure'              // Braden
  | 'pain'                  // SOCRATES (PAIN_FIELDS)
  | 'psychology'            // PHQ-2/9, GAD-2/7, body image, expectations, capacity
  | 'social'                // carer, mobility, work, finances, transport, remedies
  | 'wound_dressing';       // dressing plan and goal of care

// ── Patient and scores ──────────────────────────────────────────────────────

/** What the review knows about the patient beyond its own answers. */
export interface ReviewPatient {
  /** Whole years, from the date of birth. */
  ageYears: number | null;
  /**
   * Whole months, from the date of birth when the record has one, so infants
   * are not all "0 years". Optional: when absent, age-dependent rules use
   * ageYears (see core/age.ts).
   */
  ageMonths?: number | null;
  sex: 'male' | 'female' | null;
  /** Lower-case free text from the registration (chronic conditions, comorbidities). */
  comorbidities: string[];
  /** Current medicines, lower-case free text. */
  medications: string[];
  allergies: string[];
  /** From the review's own weight/height when recorded, else null. */
  bmi: number | null;
}

/** A band of a scored instrument, as published. */
export interface ScoreBand {
  label: string;
  level: 'none' | 'low' | 'moderate' | 'high' | 'very_high';
  interpretation: string;
}

/**
 * One computed score. Produced by the engine from the existing calculators
 * (riskCalculators, preoperativeService, calculationEngine, scoringService…)
 * or the new screening instruments (scores/), never re-implemented here.
 */
export interface ComputedScore {
  /** Stable id, e.g. 'caprini', 'must', 'phq9', or `${moduleId}.<score>`. */
  id: string;
  name: string;
  abbreviation: string;
  /** Null when an item needed for the total is unanswered. */
  total: number | null;
  /** Upper bound of the scale, for display. */
  max?: number;
  /** For scores where a higher total is safer (Braden). */
  lowerIsWorse?: boolean;
  band: ScoreBand | null;
  /** Labels of the items still unanswered. */
  incomplete: string[];
  /** Where the scoring comes from: the citation and the implementation used. */
  source: string;
  /** A score-derived flag, e.g. PHQ-9 item 9 > 0. */
  flag?: { level: 'red' | 'amber'; reason: string };
  /** Free detail lines (e.g. RCRI recommendations from preoperativeService). */
  detail?: string[];
}

/** A flag raised by an answer, a number or a score. */
export interface ReviewFlag extends RaisedFlag {
  source: 'answer' | 'score';
}

/** Scores keyed by id, as rules read them. */
export type ScoreMap = Record<string, ComputedScore>;

/**
 * A module's own score: computed from the answers (and the patient and
 * earlier reviews), returned as a ComputedScore, or null when it does not
 * apply. Call the app's existing calculators — do not re-implement one.
 */
export type ScoreRule = (input: {
  phase: ReviewPhase;
  answers: EncounterAnswers;
  patient: ReviewPatient;
  prior: PriorReview[];
}) => ComputedScore | null;

// ── Rules and their output ──────────────────────────────────────────────────

/** An earlier signed or saved review of the same patient, newest first. */
export interface PriorReview {
  encounterId: string;
  at: string;
  moduleId: string;
  phase: ReviewPhase;
  answers: EncounterAnswers;
  scores: ComputedScore[];
}

/** Everything a plan rule may read. Pure data — rules must be pure functions. */
export interface PlanContext {
  module: ProcedureModule;
  phase: ReviewPhase;
  answers: EncounterAnswers;
  scores: ScoreMap;
  flags: ReviewFlag[];
  patient: ReviewPatient;
  /** Earlier reviews (any module), newest first — for follow-up comparison. */
  prior: PriorReview[];
  /**
   * Comorbidity facts not asked at this phase, filled into `answers` from an
   * earlier review (engine.planAnswers), with the date they were recorded.
   */
  carried?: { field: string; from: string }[];
}

/**
 * A plan line WITH its reason. `why` is required: every line must be
 * traceable to an answer, a score or a guideline. Use the answer's label or
 * the score's band in the reason, not a generic phrase.
 */
export interface RuleLine {
  text: string;
  why: string;
  priority?: 'urgent' | 'routine';
}

/**
 * The fixed, ordered vocabulary of general-plan headings. Contributions are
 * merged under these, in this order, so two rules writing "Analgesia" land in
 * one list. Headings matching /VTE|Analgesia/ become medication orders when
 * the plan is approved (scribe/approval.toTreatmentPlan).
 */
export const PLAN_HEADINGS = [
  'Optimisation before surgery',
  'Anaesthesia and theatre',
  'VTE prophylaxis',
  'Antibiotic prophylaxis and infection',
  'Analgesia',
  'Wound care and dressings',
  'Nutrition',
  'Pressure care',
  'Psychology and wellbeing',
  'Rehabilitation (physiotherapy / OT)',
  'Social and financial support',
  'Patient education',
  'Red flags — return immediately if',
] as const;
export type PlanHeading = typeof PLAN_HEADINGS[number];

/** A point to cover with the patient, shown in the counselling checklist. */
export interface CounsellingPoint {
  topic: string;
  text: string;
  why: string;
}

/** A follow-up visit: when, and what it is for. */
export interface FollowUpVisit {
  when: string;
  purpose: string;
  why?: string;
}

/**
 * A risk that applies to THIS patient and belongs on the consent form
 * ("As you smoke, the risk of the graft not taking is higher"). Produced
 * only by RiskModifiers (consent.ts core modifiers + ConsentSpec.modifiers),
 * so the same risk is never written in two places.
 */
export interface PatientRisk {
  text: string;
  why: string;
}

/**
 * What a rule adds to the plan. Every field is optional; return null when the
 * rule does not apply. The builder merges, orders and de-duplicates.
 */
export interface PlanContribution {
  /** Lines added to the module's primary problem. */
  problem?: Partial<Record<'goals' | 'investigations' | 'treatment' | 'monitoring' | 'referrals', RuleLine[]>>;
  /** Further problems (e.g. "Spreading wound infection"). Merged by name. */
  problems?: { problem: string; code?: string; lines: Partial<Record<'goals' | 'investigations' | 'treatment' | 'monitoring' | 'referrals', RuleLine[]>> }[];
  /** Comorbidity-specific actions, merged by condition. */
  comorbidities?: { condition: string; actions: RuleLine[] }[];
  /** General-plan lines under the fixed headings. */
  general?: { heading: PlanHeading; items: RuleLine[] }[];
  cautions?: string[];
  counselling?: CounsellingPoint[];
  followUp?: FollowUpVisit[];
  dischargeCriteria?: string[];
}

/** A plan rule: pure, deterministic, null when it does not apply. */
export type PlanRule = (ctx: PlanContext) => PlanContribution | null;

// ── Consent ─────────────────────────────────────────────────────────────────

/** A procedure-specific risk, phrased for the patient, with its frequency where published. */
export interface ConsentRisk {
  name: string;
  description: string;
  /** e.g. '5-20%', '<1%'. Only a published or education-database figure. */
  frequency?: string;
}

/**
 * A patient-specific risk modifier: when it applies, its text is added to the
 * consent form under "Risks that apply to you in particular". Core modifiers
 * (smoking, diabetes, radiotherapy, obesity, steroids, malnutrition…) live in
 * consent.ts; a module adds ones that change THIS procedure's risks.
 */
export interface RiskModifier {
  id: string;
  when: (ctx: PlanContext) => boolean;
  text: string;
  why: string;
}

/**
 * The procedure's consent content. Used together with (not instead of) the
 * education database: anything the database already says is not repeated.
 */
export interface ConsentSpec {
  /** As written on the consent form. Defaults to the module name. */
  procedureName?: string;
  /** Phases at which consent is taken. Default ['pre_op']. */
  phases?: ReviewPhase[];
  intendedBenefits: string[];
  risks: ConsentRisk[];
  /** Include the non-operative alternative explicitly. */
  alternatives: string[];
  riskOfNotTreating: string;
  anaesthesiaOptions: string[];
  /** Procedures that may become necessary (donor site, return to theatre…). */
  additionalProcedures?: string[];
  /** Clinical photography is asked for. Default true. */
  photography?: boolean;
  bloodProducts?: 'unlikely' | 'possible' | 'likely';
  /** Tissue goes for histology. */
  specimen?: boolean;
  /** Items for the counselling checklist, beyond the core ones. */
  counsellingTopics: string[];
  modifiers?: RiskModifier[];
}

/** The consent form as drafted for this patient. */
export interface ConsentDraft {
  procedureName: string;
  /** Sections from buildSurgicalDocument (explanation, risks, alternatives…). */
  sections: DocumentSection[];
  patientRisks: PatientRisk[];
  anaesthesiaOptions: string[];
  photography: boolean;
  bloodProducts: 'unlikely' | 'possible' | 'likely';
  specimen: boolean;
  /** The counselling checklist offered (core + module + plan points). */
  topics: string[];
}

/** What was discussed and decided, recorded at the review. */
export interface CounsellingRecord {
  topicsDiscussed: string[];
  questionsAsked: string;
  /** Teach-back: the patient explained it back. */
  understanding: '' | 'good' | 'partial' | 'poor';
  capacity: '' | 'has_capacity' | 'lacks_capacity' | 'fluctuating';
  capacityNote: string;
  language: string;
  interpreterUsed: boolean;
  interpreterName: string;
  decision: '' | 'consents' | 'declines' | 'wants_time';
  decisionNote: string;
  anaesthesiaAgreed: string;
  photographyConsent: '' | 'yes' | 'no';
  bloodConsent: '' | 'yes' | 'no' | 'not_applicable';
  leafletGiven: boolean;
  witnessName: string;
  /** Filled from the session when saved. */
  clinicianId?: string;
  clinicianName?: string;
  clinicianRole?: string;
  recordedAt?: string;
}

// ── The module ──────────────────────────────────────────────────────────────

/**
 * A link to the module that owns a measurement or a decision: an app route,
 * or another procedure review (`moduleId`), opened on this patient's
 * procedure-review page with that module and phase preselected
 * (`?module=<id>&phase=<phase>`). Give `route` or `moduleId`.
 */
export interface ReviewHandoff {
  label: string;
  route?: string;
  /** Another procedure module, by id — reviewed for the same patient. */
  moduleId?: string;
  /** The phase to open it at. Default: the current review's phase. */
  targetPhase?: ReviewPhase;
  /** Shown only in these phases (all when absent). */
  phases?: ReviewPhase[];
  /** One line saying when to go there. */
  when?: string;
}

/**
 * One procedure. Pure data plus pure rule functions. See the guide in
 * docs/PROCEDURE_REVIEW_TEMPLATES.md.
 */
export interface ProcedureModule {
  /** snake_case, unique. Prefix of every field id: `${id}.<field>`. */
  id: string;
  name: string;
  /** One sentence, shown in the picker. */
  summary: string;
  group: ProcedureGroup;
  /** Phases this module is offered for. */
  phases: ReviewPhase[];
  /** Guideline citations the content follows (shown on the form and the PDF). */
  basis: string[];
  /** Links into the existing catalogues — never a second procedure list. */
  catalog: {
    /** Ids in src/data/surgicalFees.ts surgicalProcedures. */
    feeIds?: string[];
    /** procedureId in src/data/patientEducation.ts, or null with a reason. */
    educationId?: string | null;
    educationNote?: string;
    /** Ids of EducationConditions in domains/patient-education/data. */
    patientEducationIds?: string[];
  };
  /** Name of the primary problem in the plan, e.g. "Split-thickness skin graft". */
  problemLabel?: string;
  /** Procedure-specific sections ONLY, per phase. Field ids `${id}.<field>`. */
  sections: Partial<Record<ReviewPhase, EncounterSection[]>>;
  /**
   * Phases that deliberately add no module sections and rely on the core
   * alone. Every phase in `phases` must have sections or be listed here.
   */
  coreOnlyPhases?: ReviewPhase[];
  /** Extra core sections for a phase that does not include them by default. */
  includeCore?: Partial<Record<ReviewPhase, CoreSectionId[]>>;
  /**
   * Show a core field only when one of this module's answers allows it, e.g.
   * the core tetanus question only for a traumatic amputation:
   * `{ 'core.tetanus': { field: '<id>.indication', equals: ['trauma'] } }`.
   * The field must be in the same phase's template.
   */
  coreShowWhen?: Partial<Record<string, EncounterField['showWhen']>>;
  /** Core sections to leave out for this module at a phase. */
  excludeCore?: Partial<Record<ReviewPhase, CoreSectionId[]>>;
  /**
   * Single core fields to leave out at a phase because the module asks the
   * same question more fully (e.g. burns asks the NICE CG89 alerting
   * features, so the core safeguarding question is not asked twice). The
   * module's own field must cover what the core field asked.
   */
  excludeCoreFields?: Partial<Record<ReviewPhase, string[]>>;
  /**
   * The reason NSAIDs are to be avoided for this procedure and patient, or
   * null. The core analgesia rule then says "Avoid NSAIDs" with this reason
   * instead of offering one (e.g. necrotising infection: masks progression,
   * AKI is common).
   */
  avoidNsaids?: (ctx: PlanContext) => string | null;
  /**
   * Why this is emergency surgery (e.g. necrotising infection), or null. With
   * ASA "E" it makes the core use the emergency fasting wording (no 6-hour
   * line; rapid-sequence induction per the anaesthetist).
   */
  emergencySurgery?: (ctx: PlanContext) => string | null;
  /**
   * Why therapeutic antibiotics are part of this patient's care (bite, open
   * fracture, infected diabetic foot, NSTI), or null. The core then qualifies
   * its single-dose / 24-hour prophylaxis line instead of contradicting them.
   */
  therapeuticAntibiotics?: (ctx: PlanContext) => string | null;
  /**
   * The patients are children (e.g. cleft lip and palate). When the record
   * has no date of birth, the core asks its paediatric questions instead of
   * the adult-only ones (core/age.ts). With a known age, age always decides.
   */
  paediatric?: boolean;
  /**
   * Field ids pre-filled from the newest earlier review of this module (e.g.
   * the graft type recorded pre-operatively, shown again post-operatively),
   * so a fact is entered once. A field shared by several phases must be the
   * same field object in each.
   */
  carryForward?: string[];
  /** Module-specific scores (call existing calculators). */
  scores?: ScoreRule[];
  planRules: PlanRule[];
  consent?: ConsentSpec;
  /** Default follow-up schedule per phase. */
  followUp?: Partial<Record<ReviewPhase, FollowUpVisit[]>>;
  handoffs?: ReviewHandoff[];
}

// ── The composed template and the stored review ─────────────────────────────

/** A section in a composed template, marked with where it came from. */
export interface ReviewSection extends EncounterSection {
  origin: 'core' | 'module';
  coreId?: CoreSectionId;
}

/** Plan output: the ScribePlan plus what belongs to counselling and consent. */
export interface ReviewPlanOutput {
  plan: ScribePlan;
  counselling: CounsellingPoint[];
  followUp: FollowUpVisit[];
}

/** The clinician's edits to the generated plan, kept so they survive regeneration. */
export interface PlanEdits {
  /** Keys as scribe/planItems uses them (`p0.treatment|2`, `g1|0`…). */
  excluded: string[];
  /** Lines the clinician added, one per entry. */
  additions: string[];
  /**
   * Why an URGENT line was unticked, by key. Required: an urgent line without
   * a reason is never removed, and with one it stays struck through.
   */
  reasons?: Record<string, string>;
}

/** The review as stored on ClinicalEncounter.procedureReview. */
export interface StoredProcedureReview {
  moduleId: string;
  phase: ReviewPhase;
  templateVersion: string;
  answers: EncounterAnswers;
  otherText?: Record<string, string>;
  scores: ComputedScore[];
  flags: ReviewFlag[];
  /** The plan after the clinician's edits. */
  plan: ScribePlan;
  planEdits?: PlanEdits;
  counsellingPoints: CounsellingPoint[];
  counselling: CounsellingRecord;
  consent: ConsentDraft | null;
  followUp: FollowUpVisit[];
  narrative: string;
  /** Lifecycle — the same vocabulary and rules as the structured clerking. */
  status: ClerkingStatus;
  version: number;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  submittedAt?: string;
  signedBy?: string;
  signedByName?: string;
  signedAt?: string;
  errorReason?: string;
  /** Set when the plan was submitted for consultant approval. */
  scribePlanId?: string;
  scribePlanVersion?: number;
  /** A WoundProgress Monitor wound the review read measurements from. */
  linkedWoundId?: string;
}

export type { ProblemPlan };
