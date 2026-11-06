/**
 * The WoundProgress Monitor owns wound measurement. A review does not measure
 * twice: it reads the latest monitored assessment into its own fields, and
 * the clinician confirms or corrects them. Pure mapping; the form fetches.
 */
import type { EncounterAnswers } from '../data/encounterModel';
import type { WoundAssessment } from '../../wounds/monitorTypes';

const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Answers taken from a monitored assessment — only what it actually recorded. */
export function answersFromWoundAssessment(w: WoundAssessment): EncounterAnswers {
  const out: EncounterAnswers = {};
  const set = (id: string, v: EncounterAnswers[string] | undefined) => { if (v !== undefined && v !== null && !(Array.isArray(v) && !v.length)) out[id] = v; };
  set('core.wound_length', n(w.lengthCm));
  set('core.wound_width', n(w.widthCm));
  set('core.wound_depth', n(w.depthCm));
  set('core.wound_area', n(w.areaCm2));
  set('core.wound_tissue', w.tissueTypes?.length ? [...w.tissueTypes] : undefined);
  const nonviable = (n(w.sloughPct) ?? 0) + (n(w.necroticPct) ?? 0);
  if (w.sloughPct != null || w.necroticPct != null) {
    set('core.wound_nonviable', nonviable === 0 ? '0' : nonviable < 25 ? 'lt25' : nonviable <= 50 ? '25_50' : 'gt50');
  }
  set('core.wound_exudate', w.exudateAmount);
  set('core.wound_exudate_type', w.exudateType);
  if (typeof w.odor === 'boolean') set('core.wound_odour', w.odor ? 'present' : 'none');
  if (typeof w.painLevel === 'number') set('core.pain_score', w.painLevel);
  return out;
}

/** "Measured 12.4 cm2 on 2 Nov" — what the form tells the clinician it pulled in. */
export const describeAssessment = (w: WoundAssessment) =>
  `${w.areaCm2 != null ? `${w.areaCm2} cm2` : `${w.lengthCm ?? '?'} x ${w.widthCm ?? '?'} cm`} on ${(w.assessedAt || w.createdAt).slice(0, 10)}${w.scaleReliable === false ? ' (scale not reliable)' : ''}`;
