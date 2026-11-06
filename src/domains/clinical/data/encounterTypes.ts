/**
 * Encounter types: the one definition.
 *
 * There used to be a list per screen — the encounter page, the (unrouted)
 * enhanced encounter page, the clinical summary's labels and colours, the MDT
 * badges and the PDF subtitle — and they had drifted (one omitted 'initial',
 * one printed the raw id). Every consumer now reads this list, so adding a type
 * here adds it everywhere.
 */
import type { EncounterType } from '../../../types';

export interface EncounterTypeDefinition {
  id: EncounterType;
  /** As offered in a picker. */
  label: string;
  /** As shown on a badge or in a list. */
  shortLabel: string;
  /** Tailwind badge classes (background + text). */
  colour: string;
  /** One line explaining when to use it. */
  description: string;
  /** Recorded with a procedure review template (clinical/procedureReview). */
  procedureReview?: boolean;
}

export const ENCOUNTER_TYPES: readonly EncounterTypeDefinition[] = [
  { id: 'initial', label: 'Initial Encounter (New Patient)', shortLabel: 'Initial', colour: 'bg-emerald-100 text-emerald-800',
    description: 'First clinical encounter: full history and examination.' },
  { id: 'follow_up', label: 'Follow-up Visit', shortLabel: 'Follow-up', colour: 'bg-green-100 text-green-800',
    description: 'Review after an earlier encounter or procedure.', procedureReview: true },
  { id: 'outpatient', label: 'Outpatient Visit', shortLabel: 'Outpatient', colour: 'bg-blue-100 text-blue-800',
    description: 'Clinic consultation.' },
  { id: 'inpatient', label: 'Inpatient Admission', shortLabel: 'Inpatient', colour: 'bg-purple-100 text-purple-800',
    description: 'Admission clerking or ward review.' },
  { id: 'emergency', label: 'Emergency', shortLabel: 'Emergency', colour: 'bg-red-100 text-red-800',
    description: 'Emergency presentation.' },
  { id: 'surgical', label: 'Surgical Consultation', shortLabel: 'Surgical', colour: 'bg-orange-100 text-orange-800',
    description: 'Surgical opinion or consultation.' },
  { id: 'home_visit', label: 'Home Visit', shortLabel: 'Home Visit', colour: 'bg-teal-100 text-teal-800',
    description: 'Seen at home (homecare).' },
  { id: 'pre_operative', label: 'Pre-operative Review', shortLabel: 'Pre-op', colour: 'bg-indigo-100 text-indigo-800',
    description: 'Fitness, optimisation, counselling and consent before a procedure.', procedureReview: true },
  { id: 'post_operative', label: 'Post-operative Review', shortLabel: 'Post-op', colour: 'bg-violet-100 text-violet-800',
    description: 'Early review after a procedure: observations, wound, complications.', procedureReview: true },
  { id: 'wound_review', label: 'Wound Review', shortLabel: 'Wound', colour: 'bg-rose-100 text-rose-800',
    description: 'Structured wound assessment (TIME/TIMERS) and dressing plan.', procedureReview: true },
];

const BY_ID = new Map<string, EncounterTypeDefinition>(ENCOUNTER_TYPES.map(t => [t.id, t]));

export const encounterTypeDefinition = (id: string | undefined | null) => (id ? BY_ID.get(id) : undefined);

/** Picker label; an unknown id is shown humanised rather than raw. */
export const encounterTypeLabel = (id: string | undefined | null): string =>
  encounterTypeDefinition(id)?.label ?? humanise(id);

/** Short badge label. */
export const encounterTypeShortLabel = (id: string | undefined | null): string =>
  encounterTypeDefinition(id)?.shortLabel ?? humanise(id);

/** Badge classes; neutral grey for an unknown id. */
export const encounterTypeColour = (id: string | undefined | null): string =>
  encounterTypeDefinition(id)?.colour ?? 'bg-gray-100 text-gray-700';

function humanise(id: string | undefined | null): string {
  if (!id) return 'Encounter';
  const s = id.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Every id, as a non-empty tuple — for z.enum() in the encounter forms. */
export const ENCOUNTER_TYPE_IDS = ENCOUNTER_TYPES.map(t => t.id) as [EncounterType, ...EncounterType[]];
