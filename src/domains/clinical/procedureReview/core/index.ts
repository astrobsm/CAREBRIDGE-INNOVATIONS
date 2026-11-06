/**
 * The core sections, and which phases include them by default.
 *
 * Order in a composed review: `lead` core sections (the clinical reason for
 * this review: the wound, the post-operative state, the interval history),
 * then the procedure module's own sections, then the `holistic` core
 * sections (the patient), then `close` (the dressing plan).
 */
import type { EncounterSection } from '../../data/encounterModel';
import type { CoreSectionId, ReviewPhase } from '../types';
import { HEALING_BARRIERS, NUTRITION, PAIN, PATIENT_FACTORS, PRESSURE, PSYCHOLOGY, SOCIAL } from './holistic';
import { ANAESTHETIC, POST_OP_STATUS, VTE } from './perioperative';
import { WOUND_ASSESSMENT, WOUND_DRESSING, WOUND_INFECTION } from './wound';
import { FOLLOW_UP_INTERVAL } from './followUp';

export interface CoreSectionDefinition {
  id: CoreSectionId;
  slot: 'lead' | 'holistic' | 'close';
  section: EncounterSection;
  /** Phases that include it unless a module excludes it. */
  phases: ReviewPhase[];
}

/** In display order within each slot. */
export const CORE_SECTIONS: readonly CoreSectionDefinition[] = [
  { id: 'wound_assessment', slot: 'lead', section: WOUND_ASSESSMENT, phases: ['wound_review'] },
  { id: 'wound_infection', slot: 'lead', section: WOUND_INFECTION, phases: ['wound_review'] },
  { id: 'post_op_status', slot: 'lead', section: POST_OP_STATUS, phases: ['post_op'] },
  { id: 'follow_up_interval', slot: 'lead', section: FOLLOW_UP_INTERVAL, phases: ['follow_up'] },
  { id: 'patient_factors', slot: 'holistic', section: PATIENT_FACTORS, phases: ['pre_op', 'wound_review'] },
  { id: 'healing_barriers', slot: 'holistic', section: HEALING_BARRIERS, phases: ['pre_op', 'wound_review'] },
  { id: 'nutrition', slot: 'holistic', section: NUTRITION, phases: ['pre_op', 'wound_review', 'post_op', 'follow_up'] },
  { id: 'anaesthetic', slot: 'holistic', section: ANAESTHETIC, phases: ['pre_op'] },
  { id: 'vte', slot: 'holistic', section: VTE, phases: ['pre_op'] },
  { id: 'pressure', slot: 'holistic', section: PRESSURE, phases: ['pre_op', 'wound_review', 'post_op'] },
  { id: 'pain', slot: 'holistic', section: PAIN, phases: ['pre_op', 'wound_review', 'post_op', 'follow_up'] },
  { id: 'psychology', slot: 'holistic', section: PSYCHOLOGY, phases: ['pre_op', 'wound_review', 'follow_up'] },
  { id: 'social', slot: 'holistic', section: SOCIAL, phases: ['pre_op', 'wound_review'] },
  { id: 'wound_dressing', slot: 'close', section: WOUND_DRESSING, phases: ['wound_review'] },
];

export const coreSection = (id: CoreSectionId) => CORE_SECTIONS.find(c => c.id === id);

/** Default core section ids for a phase, in display order. */
export const defaultCoreFor = (phase: ReviewPhase): CoreSectionId[] =>
  CORE_SECTIONS.filter(c => c.phases.includes(phase)).map(c => c.id);

export * from './answers';
