/**
 * The theatre gate: Start Surgery only when the readiness model says ready
 * and the WHO Sign in is done.
 *
 * EMERGENCY OVERRIDE. When the operation cannot wait (an emergency, a
 * deteriorating patient), the clinician may start without full readiness by
 * giving a reason. The override is stored on the surgery — who, when, why,
 * and exactly which readiness items were missing — so the audit can see it.
 * It never bypasses the WHO Sign in: the checklist takes a minute and is the
 * part of safety that matters most in an emergency.
 */
import type { Surgery, WhoSurgicalSafetyChecklist } from '../../../types';
import type { Readiness } from './readiness';
import { theatreStepBlockers } from './whoChecklist';

export const MIN_OVERRIDE_REASON = 10;

export interface StartDecision {
  allowed: boolean;
  /** Readiness items missing (an override can cover these). */
  readinessMissing: string[];
  /** WHO checklist steps missing (an override cannot cover these). */
  checklistMissing: string[];
  overridden: boolean;
}

export function startSurgeryDecision(
  readiness: Readiness | null | undefined,
  checklist: WhoSurgicalSafetyChecklist | undefined,
  overrideReason?: string,
): StartDecision {
  const readinessMissing = readiness ? readiness.missing : ['Readiness could not be read'];
  const checklistMissing = theatreStepBlockers('start', checklist);
  const overridden = readinessMissing.length > 0 && (overrideReason ?? '').trim().length >= MIN_OVERRIDE_REASON;
  return {
    allowed: checklistMissing.length === 0 && (readinessMissing.length === 0 || overridden),
    readinessMissing, checklistMissing, overridden,
  };
}

/** The override record stored on the surgery. */
export function overrideRecord(d: StartDecision, reason: string, who: { id: string; name?: string }, at: Date): Surgery['readinessOverride'] {
  return { at, by: who.id, byName: who.name, reason: reason.trim(), missing: d.readinessMissing };
}
