/**
 * Which conditions belong to each education category.
 *
 * Category N (Day Case / Minor Procedures) showed "0 conditions": its data
 * (keloid excision, ingrown toenail, lipoma removal) existed and was tagged
 * category 'N', but the page's category switch had no case for 'N'. The map
 * below covers every category; the page also hides any that are empty.
 */
import { EDUCATION_CATEGORIES } from './types';
import type { EducationCategory, EducationCondition } from './types';
import {
  allBurnsConditions,
  allWoundsConditions,
  allPressureInjuriesConditions,
  allReconstructiveSurgeryConditions,
  allHerniaConditions,
  allPediatricSurgeryConditions,
  allVascularConditions,
  allBreastConditions,
  allCosmeticConditions,
  allGenitalReconstructionConditions,
  allReconstructiveTechniquesConditions,
  allSystemicConditions,
  allDrNnadiBurnsEducation,
  allMinorProceduresConditions,
} from './data';

export const CONDITIONS_BY_CATEGORY: Record<string, EducationCondition[]> = {
  A: allBurnsConditions,
  B: allWoundsConditions,
  C: allPressureInjuriesConditions,
  D: allReconstructiveSurgeryConditions,
  E: allHerniaConditions,
  F: allPediatricSurgeryConditions,
  G: allVascularConditions,
  H: allBreastConditions,
  I: allCosmeticConditions,
  J: allGenitalReconstructionConditions,
  K: allReconstructiveTechniquesConditions,
  L: allSystemicConditions,
  M: allDrNnadiBurnsEducation,
  N: allMinorProceduresConditions,
};

/** Every category with its conditions; empty categories are left out. */
export function buildEducationCategories(): EducationCategory[] {
  return EDUCATION_CATEGORIES
    .map((cat) => ({ ...cat, conditions: CONDITIONS_BY_CATEGORY[cat.code] ?? [] }))
    .filter((cat) => cat.conditions.length > 0);
}
