/**
 * Condition templates: a presenting condition's own history questions and
 * examination fields (in the clerking's Question / QuestionModule / ExamSection
 * shapes, so the existing forms, narrative, red flags and completeness check
 * read them unchanged), its classification, and the rule that turns the
 * answers into plan lines.
 *
 * Every question id is prefixed with the template's `prefix` so answers from
 * two conditions never collide in a complaint's answer map.
 */
import type { ExamSection, QuestionModule } from '../../clerking/types';
import type { PatientFacts } from '../facts';
import type { PlanLine } from '../types';

/** A plan line as a template writes it; the registry adds the source. */
export type TemplateLine = Omit<PlanLine, 'source'> & { sourceLabel?: string };

export interface ConditionContext {
  /** An answer from any complaint's history or any examination section. */
  a: (id: string) => string | string[] | number | undefined;
  /** True when the answer (or any of a multi-answer) is one of `values`. */
  is: (id: string, ...values: string[]) => boolean;
  /** A numeric answer, or null. */
  num: (id: string) => number | null;
  /** Answered at all. */
  has: (id: string) => boolean;
  facts: PatientFacts;
}

export interface ConditionTemplate {
  id: string;
  label: string;
  group: 'Congenital hand' | 'Hand' | 'Skin and soft tissue' | 'Scars and burns' | 'Wounds' | 'Face' | 'Breast' | 'Limb' | 'Genital';
  /** Question-id prefix ("syn_"). */
  prefix: string;
  synonyms: string[];
  /** Existing complaints this template refines (its fields are added to them). */
  complaintIds: string[];
  /** Generic complaints for which the plan panel suggests this template. */
  suggestFor?: string[];
  history: QuestionModule;
  exam: ExamSection;
  /** Standard classification and its citation, when one exists. */
  classification?: { name: string; source: string };
  /** The wound clinic protocol applies (baseline panel, micronutrients, monitoring). */
  woundProtocol?: boolean;
  /** Citations for the template's history, examination and plan. */
  sources: string[];
  /** Plan lines for this patient. Pure. */
  plan: (c: ConditionContext) => TemplateLine[];
  /** Verbatim hard rules this condition always carries. */
  hardRules?: (c: ConditionContext) => string[];
  /** What this template's answers say about the wound, for the protocol's targeted tests. */
  woundSignals?: (c: ConditionContext) => Partial<WoundSignals>;
}

/** The situations in the protocol's "Targeted investigations" table. */
export interface WoundSignals {
  infected: boolean;
  febrile: boolean;
  boneInvolved: boolean;
  diabeticFootNonHealing: boolean;
  legOrFootUlcer: boolean;
  venousSuspected: boolean;
  /** Over 3 months, rolled / heaped edge, or unusual look. */
  biopsyIndicated: boolean;
  vasculitisSuspected: boolean;
  largeBurnOrPoorIntake: boolean;
  b12FolateSuspected: boolean;
  copperSuspected: boolean;
  thyroidSuspected: boolean;
  childPoorGrowth: boolean;
  /** Pressure injury stage 2 or worse (arginine). */
  pressureInjuryStage2Plus: boolean;
  largeExudingWound: boolean;
  majorBurn: boolean;
  /** For the nutrition engine: large or deep wound (adult protein up to 2 g/kg). */
  largeOrDeep: boolean;
}
