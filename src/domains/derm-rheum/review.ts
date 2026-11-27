/**
 * The deterministic derm & rheum review of a clerking: features, the
 * atypical-ulcer screen, ranked knowledge-base candidates, hard rules and
 * the relevant score tools. Pure, no AI: this is what the clinician sees
 * before (and whether or not) Claude is asked.
 */
import type { ClerkingData } from '../clinical/clerking/types';
import type { PatientContext } from '../clinical/clerking/engine';
import { conditionContext } from '../clinical/clerkingPlan/rulesPlan';
import { patientFacts } from '../clinical/clerkingPlan/facts';
import { lesionFeatures, longestDurationDays, DERM_RHEUM_COMPLAINTS, type LesionFeatures } from './features';
import { screen, relevantTools, type ScreenResult } from './screen';
import { dermHardRules, type DermHardRule } from './hardRules';

export { longestDurationDays, DERM_RHEUM_COMPLAINTS };

/** Conditions whose clerking makes the derm & rheum review available. */
export const DERM_RHEUM_CONDITION_IDS = ['atypical_ulcer', 'chronic_wound', 'pigmented_lesion', 'keloid', 'sjs_ten', 'hidradenitis', 'diabetic_foot', 'pressure_injury', 'lipoma_cyst'];

export interface DeterministicReview {
  features: LesionFeatures;
  screen: ScreenResult;
  hardRules: DermHardRule[];
  /** KB entries to show / send: candidates, at most 8. */
  kbIds: string[];
  tools: string[];
}

export function deterministicReview(data: ClerkingData, ctx: PatientContext, labs?: Record<string, number>): DeterministicReview {
  const facts = patientFacts({ data, ctx, labs });
  const c = conditionContext(data, facts);
  const features = lesionFeatures(c, facts, longestDurationDays(data));
  const s = screen(features);
  const hardRules = dermHardRules(features, s.candidates);
  const kbIds = s.candidates.slice(0, 8).map(x => x.id);
  return { features, screen: s, hardRules, kbIds, tools: relevantTools(s.candidates) };
}

/** Whether to offer the review for this clerking (a skin lesion or ulcer is present). */
export function reviewApplies(data: Pick<ClerkingData, 'complaints'>, conditionIds: string[] = []): boolean {
  return data.complaints.some(c => DERM_RHEUM_COMPLAINTS.includes(c.complaintId)) || conditionIds.some(id => DERM_RHEUM_CONDITION_IDS.includes(id));
}
