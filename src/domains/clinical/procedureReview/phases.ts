/** The four review phases and the encounter type each is recorded as. */
import type { EncounterType } from '../../../types';
import type { ReviewPhase } from './types';

export interface ReviewPhaseDefinition {
  id: ReviewPhase;
  label: string;
  encounterType: EncounterType;
  description: string;
}

export const REVIEW_PHASES: readonly ReviewPhaseDefinition[] = [
  { id: 'wound_review', label: 'Wound review', encounterType: 'wound_review',
    description: 'Structured TIMERS wound assessment, infection staging and a dressing plan.' },
  { id: 'pre_op', label: 'Pre-operative review', encounterType: 'pre_operative',
    description: 'Fitness, risk, optimisation, counselling and consent before the procedure.' },
  { id: 'post_op', label: 'Post-operative review', encounterType: 'post_operative',
    description: 'Observations, the operative site, complications and discharge readiness.' },
  { id: 'follow_up', label: 'Follow-up', encounterType: 'follow_up',
    description: 'Interval events, adherence, function, scar and psychology, compared with the last review.' },
];

export const phaseDefinition = (id: ReviewPhase) => REVIEW_PHASES.find(p => p.id === id)!;

/** The phase an encounter type is reviewed with, if any. */
export const phaseForEncounterType = (t: string | undefined): ReviewPhase | undefined =>
  REVIEW_PHASES.find(p => p.encounterType === t)?.id;
