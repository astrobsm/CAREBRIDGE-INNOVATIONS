/**
 * Patient Education Content Index
 * Categories A, B, C, D, E, F & G - Patient Education Module
 * AstroHEALTH Innovations in Healthcare
 * 
 * Combines all educational content for burns, wounds, pressure injuries, reconstructive surgery, hernia, pediatric surgery, and vascular conditions
 */

import { burnsEducationContent } from './burnsEducation';
import { burnsEducationPart2 } from './burnsEducationPart2';
import { burnsEducationPart3 } from './burnsEducationPart3';
import { woundsEducationPart1 } from './woundsEducation';
import { woundsEducationPart2 } from './woundsEducationPart2';
import { woundsEducationPart3 } from './woundsEducationPart3';
import { pressureInjuriesPart1 } from './pressureInjuries';
import { pressureInjuriesPart2 } from './pressureInjuriesPart2';
import { pressureInjuriesPart3 } from './pressureInjuriesPart3';
import { reconstructiveSurgeryPart1 } from './reconstructiveSurgery';
import { reconstructiveSurgeryPart2 } from './reconstructiveSurgeryPart2';
import { reconstructiveSurgeryPart3 } from './reconstructiveSurgeryPart3';
import { herniaEducationPart1 } from './herniaEducation';
import { herniaEducationPart2 } from './herniaEducationPart2';
import { herniaEducationPart3 } from './herniaEducationPart3';
import { pediatricSurgeryPart1 } from './pediatricSurgery';
import { pediatricSurgeryPart2 } from './pediatricSurgeryPart2';
import { pediatricSurgeryPart3 } from './pediatricSurgeryPart3';
import { vascularConditionsPart1 } from './vascularConditions';
import { vascularConditionsPart2 } from './vascularConditionsPart2';
import { vascularConditionsPart3 } from './vascularConditionsPart3';
import { breastConditionsPart1 } from './breastConditions';
import { breastConditionsPart2 } from './breastConditionsPart2';
import { breastConditionsPart3 } from './breastConditionsPart3';
import { cosmeticProceduresPart1 } from './cosmeticProcedures';
import { cosmeticProceduresPart2 } from './cosmeticProceduresPart2';
import { cosmeticProceduresPart3 } from './cosmeticProceduresPart3';
import { genitalReconstructionPart1 } from './genitalReconstruction';
import { genitalReconstructionPart2 } from './genitalReconstructionPart2';
import { genitalReconstructionPart3 } from './genitalReconstructionPart3';
import { reconstructiveTechniquesPart1 } from './reconstructiveTechniques';
import { reconstructiveTechniquesPart2 } from './reconstructiveTechniquesPart2';
import { reconstructiveTechniquesPart3 } from './reconstructiveTechniquesPart3';
import { systemicConditionsPart1 } from './systemicConditions';
import { systemicConditionsPart2 } from './systemicConditionsPart2';
import { systemicConditionsPart3 } from './systemicConditionsPart3';

// Dr Nnadi-Burns Comprehensive Patient Education Content (Category M)
import { generalCareEducationList } from './generalCareEducation';
import { acuteBurnEducationList } from './acuteBurnEducation';
import { burnGraftingEducationList } from './burnGraftingEducation';
import { flapSurgeryEducationList } from './flapSurgeryEducation';
import { contractureReleaseEducationList } from './contractureReleaseEducation';
import { cleftLipPalateEducationList } from './cleftLipPalateEducation';
import { specializedEducationList } from './specializedEducation';
import { supportiveCareEducationList } from './supportiveCareEducation';

// Day Case / Minor Procedures (Category N)
import { minorProceduresEducation as minorProceduresList } from './minorProcedures';

import type { EducationCondition, EducationCategory } from '../types';
import { EDUCATION_CATEGORIES } from '../types';

// Day Case / Minor Procedures conditions (Category N)
export const allMinorProceduresConditions: EducationCondition[] = minorProceduresList;

// Combine all burns conditions
export const allBurnsConditions: EducationCondition[] = [
  ...burnsEducationContent,
  ...burnsEducationPart2,
  ...burnsEducationPart3
];

// Combine all wounds conditions
export const allWoundsConditions: EducationCondition[] = [
  ...woundsEducationPart1,
  ...woundsEducationPart2,
  ...woundsEducationPart3
];

// Combine all pressure injuries conditions
export const allPressureInjuriesConditions: EducationCondition[] = [
  ...pressureInjuriesPart1,
  ...pressureInjuriesPart2,
  ...pressureInjuriesPart3
];

// Combine all reconstructive surgery conditions
export const allReconstructiveSurgeryConditions: EducationCondition[] = [
  ...reconstructiveSurgeryPart1,
  ...reconstructiveSurgeryPart2,
  ...reconstructiveSurgeryPart3
];

// Combine all hernia conditions
export const allHerniaConditions: EducationCondition[] = [
  ...herniaEducationPart1,
  ...herniaEducationPart2,
  ...herniaEducationPart3
];

// Combine all pediatric surgery conditions
export const allPediatricSurgeryConditions: EducationCondition[] = [
  ...pediatricSurgeryPart1,
  ...pediatricSurgeryPart2,
  ...pediatricSurgeryPart3
];

// Combine all vascular conditions
export const allVascularConditions: EducationCondition[] = [
  ...vascularConditionsPart1,
  ...vascularConditionsPart2,
  ...vascularConditionsPart3
];

// Combine all breast conditions
export const allBreastConditions: EducationCondition[] = [
  ...breastConditionsPart1,
  ...breastConditionsPart2,
  ...breastConditionsPart3
];

// Combine all cosmetic procedures conditions (Category I)
export const allCosmeticConditions: EducationCondition[] = [
  ...cosmeticProceduresPart1,
  ...cosmeticProceduresPart2,
  ...cosmeticProceduresPart3
];

// Combine all genital/perineal reconstruction conditions (Category J)
export const allGenitalReconstructionConditions: EducationCondition[] = [
  ...genitalReconstructionPart1,
  ...genitalReconstructionPart2,
  ...genitalReconstructionPart3
];

// Combine all reconstructive techniques conditions (Category K)
export const allReconstructiveTechniquesConditions: EducationCondition[] = [
  ...reconstructiveTechniquesPart1,
  ...reconstructiveTechniquesPart2,
  ...reconstructiveTechniquesPart3
];

// Combine all systemic/complicating conditions (Category L)
export const allSystemicConditions: EducationCondition[] = [
  ...systemicConditionsPart1,
  ...systemicConditionsPart2,
  ...systemicConditionsPart3
];

// Combine all Dr Nnadi-Burns Comprehensive Education (Category M)
export const allDrNnadiBurnsEducation: EducationCondition[] = [
  ...generalCareEducationList,
  ...acuteBurnEducationList,
  ...burnGraftingEducationList,
  ...flapSurgeryEducationList,
  ...contractureReleaseEducationList,
  ...cleftLipPalateEducationList,
  ...specializedEducationList,
  ...supportiveCareEducationList,
];

// Get the burns category with its conditions
export const getBurnsCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'A');
  if (!category) {
    throw new Error('Burns category not found');
  }
  return {
    ...category,
    conditions: allBurnsConditions
  };
};

// Get the wounds category with its conditions
export const getWoundsCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'B');
  if (!category) {
    throw new Error('Wounds category not found');
  }
  return {
    ...category,
    conditions: allWoundsConditions
  };
};

// Get the pressure injuries category with its conditions
export const getPressureInjuriesCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'C');
  if (!category) {
    throw new Error('Pressure Injuries category not found');
  }
  return {
    ...category,
    conditions: allPressureInjuriesConditions
  };
};

// Get the reconstructive surgery category with its conditions
export const getReconstructiveSurgeryCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'D');
  if (!category) {
    throw new Error('Reconstructive Surgery category not found');
  }
  return {
    ...category,
    conditions: allReconstructiveSurgeryConditions
  };
};

// Get the hernia category with its conditions
export const getHerniaCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'E');
  if (!category) {
    throw new Error('Hernia category not found');
  }
  return {
    ...category,
    conditions: allHerniaConditions
  };
};

// Get the pediatric surgery category with its conditions
export const getPediatricSurgeryCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'F');
  if (!category) {
    throw new Error('Pediatric Surgery category not found');
  }
  return {
    ...category,
    conditions: allPediatricSurgeryConditions
  };
};

// Get the vascular conditions category with its conditions
export const getVascularCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'G');
  if (!category) {
    throw new Error('Vascular Conditions category not found');
  }
  return {
    ...category,
    conditions: allVascularConditions
  };
};

// Get the breast conditions category with its conditions
export const getBreastCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'H');
  if (!category) {
    throw new Error('Breast Conditions category not found');
  }
  return {
    ...category,
    conditions: allBreastConditions
  };
};

// Get the cosmetic procedures category with its conditions
export const getCosmeticCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'I');
  if (!category) {
    throw new Error('Cosmetic Procedures category not found');
  }
  return {
    ...category,
    conditions: allCosmeticConditions
  };
};

// Get the genital/perineal reconstruction category with its conditions
export const getGenitalReconstructionCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'J');
  if (!category) {
    throw new Error('Genital/Perineal Reconstruction category not found');
  }
  return {
    ...category,
    conditions: allGenitalReconstructionConditions
  };
};

// Get the reconstructive techniques category with its conditions
export const getReconstructiveTechniquesCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'K');
  if (!category) {
    throw new Error('Reconstructive Techniques category not found');
  }
  return {
    ...category,
    conditions: allReconstructiveTechniquesConditions
  };
};

// Get the systemic/complicating conditions category with its conditions
export const getSystemicConditionsCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'L');
  if (!category) {
    throw new Error('Systemic Conditions category not found');
  }
  return {
    ...category,
    conditions: allSystemicConditions
  };
};

// Get the Dr Nnadi-Burns Comprehensive Education category with its conditions
export const getDrNnadiBurnsCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'M');
  if (!category) {
    throw new Error('Dr Nnadi-Burns Comprehensive Education category not found');
  }
  return {
    ...category,
    conditions: allDrNnadiBurnsEducation
  };
};

// Get the Day Case / Minor Procedures category with its conditions
export const getMinorProceduresCategory = (): EducationCategory => {
  const category = EDUCATION_CATEGORIES.find(c => c.code === 'N');
  if (!category) {
    throw new Error('Day Case / Minor Procedures category not found');
  }
  return {
    ...category,
    conditions: allMinorProceduresConditions
  };
};

// Get all available categories with their conditions
export const getAllEducationCategories = (): EducationCategory[] => {
  return [
    getBurnsCategory(),
    getWoundsCategory(),
    getPressureInjuriesCategory(),
    getReconstructiveSurgeryCategory(),
    getHerniaCategory(),
    getPediatricSurgeryCategory(),
    getVascularCategory(),
    getBreastCategory(),
    getCosmeticCategory(),
    getGenitalReconstructionCategory(),
    getReconstructiveTechniquesCategory(),
    getSystemicConditionsCategory(),
    getDrNnadiBurnsCategory(),
    getMinorProceduresCategory()
  ];
};

// Export individual parts for reference
export { burnsEducationContent } from './burnsEducation';
export { burnsEducationPart2 } from './burnsEducationPart2';
export { burnsEducationPart3 } from './burnsEducationPart3';
export { woundsEducationPart1 } from './woundsEducation';
export { woundsEducationPart2 } from './woundsEducationPart2';
export { woundsEducationPart3 } from './woundsEducationPart3';
export { pressureInjuriesPart1 } from './pressureInjuries';
export { pressureInjuriesPart2 } from './pressureInjuriesPart2';
export { pressureInjuriesPart3 } from './pressureInjuriesPart3';
export { reconstructiveSurgeryPart1 } from './reconstructiveSurgery';
export { reconstructiveSurgeryPart2 } from './reconstructiveSurgeryPart2';
export { reconstructiveSurgeryPart3 } from './reconstructiveSurgeryPart3';
export { herniaEducationPart1 } from './herniaEducation';
export { herniaEducationPart2 } from './herniaEducationPart2';
export { herniaEducationPart3 } from './herniaEducationPart3';
export { pediatricSurgeryPart1 } from './pediatricSurgery';
export { pediatricSurgeryPart2 } from './pediatricSurgeryPart2';
export { pediatricSurgeryPart3 } from './pediatricSurgeryPart3';
export { vascularConditionsPart1 } from './vascularConditions';
export { vascularConditionsPart2 } from './vascularConditionsPart2';
export { vascularConditionsPart3 } from './vascularConditionsPart3';
export { breastConditionsPart1 } from './breastConditions';
export { breastConditionsPart2 } from './breastConditionsPart2';
export { breastConditionsPart3 } from './breastConditionsPart3';
export { cosmeticProceduresPart1 } from './cosmeticProcedures';
export { cosmeticProceduresPart2 } from './cosmeticProceduresPart2';
export { cosmeticProceduresPart3 } from './cosmeticProceduresPart3';
export { genitalReconstructionPart1 } from './genitalReconstruction';
export { genitalReconstructionPart2 } from './genitalReconstructionPart2';
export { genitalReconstructionPart3 } from './genitalReconstructionPart3';
export { reconstructiveTechniquesPart1 } from './reconstructiveTechniques';
export { reconstructiveTechniquesPart2 } from './reconstructiveTechniquesPart2';
export { reconstructiveTechniquesPart3 } from './reconstructiveTechniquesPart3';
export { systemicConditionsPart1 } from './systemicConditions';
export { systemicConditionsPart2 } from './systemicConditionsPart2';
export { systemicConditionsPart3 } from './systemicConditionsPart3';

// Dr Nnadi-Burns Comprehensive Patient Education exports
export { generalCareEducationList, generalPrePostOpCare } from './generalCareEducation';
export { acuteBurnEducationList, acuteBurnInjuries } from './acuteBurnEducation';
export { burnGraftingEducationList, burnGraftingEducation } from './burnGraftingEducation';
export { flapSurgeryEducationList, flapSurgeryEducation } from './flapSurgeryEducation';
export { contractureReleaseEducationList, contractureReleaseEducation } from './contractureReleaseEducation';
export { cleftLipPalateEducationList, cleftLipPalateEducation } from './cleftLipPalateEducation';
export { specializedEducationList, breastReconstructionEducation, cosmeticProceduresEducation, keloidManagementEducation, infectedWoundsEducation, handSurgeryEducation } from './specializedEducation';
export { supportiveCareEducationList, pressureSoreEducation, prostheticsAmputationEducation, minorProceduresEducation, painManagementEducation, nutritionDiabetesEducation, infectionPreventionEducation, culturalPsychosocialEducation, followUpPlanEducation } from './supportiveCareEducation';

// Day Case / Minor Procedures exports
export { minorProceduresEducation as dayCaseProceduresList, keloidExcision, ingrownToenail, lipomaRemoval } from './minorProcedures';

export default {
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
  getBurnsCategory,
  getWoundsCategory,
  getPressureInjuriesCategory,
  getReconstructiveSurgeryCategory,
  getHerniaCategory,
  getPediatricSurgeryCategory,
  getVascularCategory,
  getBreastCategory,
  getCosmeticCategory,
  getGenitalReconstructionCategory,
  getReconstructiveTechniquesCategory,
  getSystemicConditionsCategory,
  getDrNnadiBurnsCategory,
  getMinorProceduresCategory,
  getAllEducationCategories
};
