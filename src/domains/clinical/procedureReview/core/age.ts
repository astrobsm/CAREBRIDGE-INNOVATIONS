/**
 * Age: which core questions and plan lines apply to this patient.
 *
 * Several core instruments are validated only in adults (MUST, 4AT, Caprini
 * and NICE NG89) or only from a given age (PHQ-9, GAD-7, the Clinical
 * Frailty Scale). The composed review leaves out a core field this patient is
 * outside the validated age for, and shows the paediatric replacement
 * instead, so completeness never counts a question that was not asked.
 *
 * An unknown age is treated as adult (the questions asked before age gating
 * existed), except in a module marked `paediatric` (cleft), where it is
 * treated as a child.
 */
import type { ProcedureModule, ReviewPatient } from '../types';

type Aged = Pick<ReviewPatient, 'ageYears' | 'ageMonths'>;

/** Published lower age bounds, in years. */
export const AGE_LIMITS = {
  /**
   * PHQ-9: validated in adolescents aged 13–17 (Richardson LP et al.
   * Evaluation of the PHQ-9 item for detecting major depression among
   * adolescents. Pediatrics 2010;126:1117-23).
   */
  phq9: 13,
  /**
   * GAD-7: validated in adolescents aged 12–17 (Mossman SA et al. The
   * Generalized Anxiety Disorder 7-item scale in adolescents with generalized
   * anxiety disorder. Ann Clin Psychiatry 2017;29:227-34A).
   */
  gad7: 12,
  /** MUST is a screening tool for adults (BAPEN 2003, revised 2011); 4AT is validated in adults. */
  adult: 18,
  /** NICE NG89 (VTE) covers people aged 16 and over; Caprini was derived in adults. */
  vte: 16,
  /** Clinical Frailty Scale: validated in people aged 65 and over (Rockwood 2005; CFS v2.0 2020). */
  cfs: 65,
  /** NEWS2 is not for use in children under 16 (RCP NEWS2 2017): use a paediatric early warning score. */
  news2: 16,
} as const;

/** Age in whole months: ageMonths when known, else ageYears x 12 (a lower bound); null when unknown. */
export function ageInMonths(p: Aged): number | null {
  if (p.ageMonths != null && Number.isFinite(p.ageMonths)) return p.ageMonths;
  if (p.ageYears != null && Number.isFinite(p.ageYears)) return p.ageYears * 12;
  return null;
}

/**
 * Whether the patient is younger than `years`. An unknown age counts as
 * younger only in a paediatric module.
 */
export function isUnder(p: Aged, years: number, module?: Pick<ProcedureModule, 'paediatric'>): boolean {
  const m = ageInMonths(p);
  if (m == null) return !!module?.paediatric;
  return m < years * 12;
}

/** A child for the purposes of adult-only tools (under 18). */
export const isChild = (p: Aged, module?: Pick<ProcedureModule, 'paediatric'>) => isUnder(p, AGE_LIMITS.adult, module);

/** Shown from `minYears` (inclusive) and / or under `maxYears`. */
export interface AgeGate { minYears?: number; maxYears?: number }

/** Core fields asked only within an age range. Everything else is asked at every age. */
export function coreFieldAgeGate(id: string): AgeGate | undefined {
  if (id.startsWith('core.phq.')) return { minYears: AGE_LIMITS.phq9 };
  if (id.startsWith('core.gad.')) return { minYears: AGE_LIMITS.gad7 };
  if (id.startsWith('core.cfs.')) return { minYears: AGE_LIMITS.cfs };
  switch (id) {
    // MUST steps (adults); the paediatric growth question replaces them
    case 'core.muac_cm':
    case 'core.weight_loss':
    case 'core.acute_disease':
      return { minYears: AGE_LIMITS.adult };
    case 'core.paed_growth':
      return { maxYears: AGE_LIMITS.adult };
    // Below the PHQ-9 age: a brief wellbeing prompt
    case 'core.child_wellbeing':
    case 'core.caregiver_coping':
      return { maxYears: AGE_LIMITS.phq9 };
    // Safeguarding: every child, i.e. under 18 (Child's Rights Act 2003;
    // NICE CG89 covers under-18s) — adolescents are not screened by the PHQ.
    case 'core.child_safeguarding':
      return { maxYears: AGE_LIMITS.adult };
    case 'core.caprini':
      return { minYears: AGE_LIMITS.vte };
    default:
      return undefined;
  }
}

/** Whether a field with this gate is asked of this patient. */
export function ageAllows(gate: AgeGate | undefined, p: Aged, module?: Pick<ProcedureModule, 'paediatric'>): boolean {
  if (!gate) return true;
  if (gate.minYears != null && isUnder(p, gate.minYears, module)) return false;
  if (gate.maxYears != null && !isUnder(p, gate.maxYears, module)) return false;
  return true;
}
