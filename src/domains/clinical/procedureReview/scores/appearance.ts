/**
 * Appearance-concern screen — a clinician-asked SCREEN, not a diagnosis.
 *
 * Its logic follows the published structure of the Body Dysmorphic Disorder
 * Questionnaire (Phillips KA. The Broken Mirror, 1996; Dufresne RG et al.
 * Dermatol Surg 2001;27:457-62; Dey JK et al. JAMA Facial Plast Surg
 * 2015;17:137-43 — BDDQ in aesthetic surgery): a concern about appearance,
 * preoccupation with it, and distress or impairment caused by it. The BDDQ's
 * own item wording is copyrighted and its licensing for embedding is unclear,
 * so these are plain clinician questions that ask the same three things. They
 * are NOT the BDDQ and must never be reported as a BDDQ score.
 *
 * A positive screen means "assess properly", not "has BDD": refer for
 * specialist mental-health assessment, and do not proceed with ELECTIVE
 * aesthetic surgery until that assessment is done.
 */
import { YES_NO_SCORE, type ScreeningInstrument } from './instrument';
import type { ScoreBand } from '../types';

export const APPEARANCE_SCREEN: ScreeningInstrument = {
  id: 'appearance',
  name: 'Appearance-concern screen (clinician-asked)',
  abbreviation: 'Appearance screen',
  version: '1.0 (BDDQ-structured, original wording)',
  items: [
    { id: 'concern', label: 'Is the patient very worried about how part (or parts) of their body looks?', source: 'patient', options: YES_NO_SCORE },
    { id: 'preoccupied', label: 'Do they think about it a lot — about an hour a day or more — or wish they could think about it less?', source: 'patient', options: YES_NO_SCORE },
    { id: 'distress', label: 'Has it caused a lot of distress, or interfered with work, school, relationships or daily life?', source: 'patient', options: YES_NO_SCORE },
    { id: 'avoidance', label: 'Do they avoid people, places, mirrors or photographs, or repeatedly check or hide the area, because of it?', source: 'patient', options: YES_NO_SCORE },
    { id: 'disproportion', label: 'Clinician: is the concern out of proportion to the visible defect (or about a defect you cannot see)?', source: 'clinician', options: YES_NO_SCORE },
  ],
  totalRange: [0, 5],
  lowerIsBetter: true,
  citation: 'Structure after the BDDQ (Phillips 1996; Dufresne 2001; Dey 2015). A screen, not a diagnosis.',
  licence: 'Original clinician questions; the BDDQ item text is not reproduced.',
  notes: ['Positive when concern AND preoccupation AND (distress or avoidance) are all present.'],
  bands: [],
};

export const APPEARANCE_NEGATIVE: ScoreBand = {
  label: 'Screen negative', level: 'none',
  interpretation: 'No significant appearance-related preoccupation reported.',
};
export const APPEARANCE_POSITIVE: ScoreBand = {
  label: 'Screen positive', level: 'high',
  interpretation: 'Possible body dysmorphic concern: refer for specialist mental-health assessment; do not proceed with elective aesthetic surgery until assessed.',
};

/**
 * Positive when concern and preoccupation and (distress or avoidance).
 * "No" to the first question is a complete, negative screen. Otherwise null
 * until the four patient questions are answered.
 */
export function appearanceScreenResult(r: Record<string, number>): { positive: boolean | null; band: ScoreBand | null } {
  if (r.concern === 0) return { positive: false, band: APPEARANCE_NEGATIVE };
  const core = ['concern', 'preoccupied', 'distress', 'avoidance'];
  if (core.some(k => typeof r[k] !== 'number')) return { positive: null, band: null };
  const positive = r.concern === 1 && r.preoccupied === 1 && (r.distress === 1 || r.avoidance === 1);
  return { positive, band: positive ? APPEARANCE_POSITIVE : APPEARANCE_NEGATIVE };
}
