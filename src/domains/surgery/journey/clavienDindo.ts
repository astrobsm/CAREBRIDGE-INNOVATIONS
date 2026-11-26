/**
 * Clavien–Dindo classification of surgical complications.
 *
 * Dindo D, Demartines N, Clavien PA. Classification of surgical
 * complications: a new proposal with evaluation in a cohort of 6336 patients
 * and results of a survey. Ann Surg 2004;240:205-13.
 * Clavien PA, Barkun J, de Oliveira ML, et al. The Clavien-Dindo
 * classification of surgical complications: five-year experience.
 * Ann Surg 2009;250:187-96.
 *
 * Suffix "d" (disability): the complication is still present at discharge
 * (here: at the outcome check) — recorded as `ongoing`.
 */
import type { ClavienDindoGrade, GradedComplication } from '../../../types';

export const CLAVIEN_DINDO: { grade: ClavienDindoGrade; label: string; definition: string }[] = [
  { grade: 'I', label: 'Grade I', definition: 'Any deviation from the normal post-operative course without the need for drugs (other than antiemetics, antipyretics, analgesics, diuretics, electrolytes, physiotherapy), surgical, endoscopic or radiological intervention. Includes wound infections opened at the bedside.' },
  { grade: 'II', label: 'Grade II', definition: 'Requiring drugs beyond those allowed for grade I (e.g. antibiotics), blood transfusion or total parenteral nutrition.' },
  { grade: 'IIIa', label: 'Grade IIIa', definition: 'Requiring surgical, endoscopic or radiological intervention NOT under general anaesthesia.' },
  { grade: 'IIIb', label: 'Grade IIIb', definition: 'Requiring surgical, endoscopic or radiological intervention under general anaesthesia.' },
  { grade: 'IVa', label: 'Grade IVa', definition: 'Life-threatening complication requiring intermediate / intensive care: single-organ dysfunction (including dialysis).' },
  { grade: 'IVb', label: 'Grade IVb', definition: 'Life-threatening complication requiring intermediate / intensive care: multi-organ dysfunction.' },
  { grade: 'V', label: 'Grade V', definition: 'Death of the patient.' },
];

export const GRADE_ORDER: ClavienDindoGrade[] = CLAVIEN_DINDO.map(g => g.grade);

/** The highest grade in a list (null when there is none). */
export function highestGrade(list: Pick<GradedComplication, 'grade'>[]): ClavienDindoGrade | null {
  let best = -1;
  for (const c of list) best = Math.max(best, GRADE_ORDER.indexOf(c.grade));
  return best < 0 ? null : GRADE_ORDER[best];
}

/** "Grade II: wound infection (ongoing)". */
export const complicationText = (c: Pick<GradedComplication, 'grade' | 'description' | 'ongoing'>) =>
  `Clavien-Dindo ${c.grade}${c.ongoing ? 'd' : ''}: ${c.description}`;
