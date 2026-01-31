/**
 * usePatientContext Hook
 * 
 * Provides patient categorization (pediatric/adult/geriatric),
 * pregnancy status, and dynamic form field filtering based on patient demographics.
 * 
 * Usage:
 * const { category, pregnancy, requiredFields, excludedFields, dosing } = usePatientContext(patientId);
 */

import { useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import {
  categorizePatient,
  categorizePregnancy,
  getPatientContext,
  isAssessmentAppropriate,
  getDosingWeight,
  type PatientCategory,
  type PregnancyStatus,
  type PatientContext,
  type BroadCategory,
} from '../services/patientCategoryService';
import { type GFRResult } from '../services/gfrCalculationService';

// Form field definitions by category
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  required?: boolean;
  applicableCategories: BroadCategory[];
  excludedCategories?: BroadCategory[];
  pregnancyRelevant?: boolean;
  pregnancyRequired?: boolean;
  validationMessage?: string;
  options?: { value: string; label: string }[];
}

// Vital signs reference ranges by age category
export interface VitalSignsReference {
  heartRate: { min: number; max: number; unit: string };
  respiratoryRate: { min: number; max: number; unit: string };
  systolicBP: { min: number; max: number; unit: string };
  diastolicBP: { min: number; max: number; unit: string };
  temperature: { min: number; max: number; unit: string };
  oxygenSaturation: { min: number; max: number; unit: string };
}

const VITAL_SIGNS_BY_AGE: Record<string, VitalSignsReference> = {
  neonate: {
    heartRate: { min: 100, max: 160, unit: 'bpm' },
    respiratoryRate: { min: 30, max: 60, unit: '/min' },
    systolicBP: { min: 60, max: 90, unit: 'mmHg' },
    diastolicBP: { min: 30, max: 60, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  infant: {
    heartRate: { min: 80, max: 140, unit: 'bpm' },
    respiratoryRate: { min: 25, max: 50, unit: '/min' },
    systolicBP: { min: 70, max: 100, unit: 'mmHg' },
    diastolicBP: { min: 40, max: 65, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  toddler: {
    heartRate: { min: 80, max: 130, unit: 'bpm' },
    respiratoryRate: { min: 20, max: 40, unit: '/min' },
    systolicBP: { min: 80, max: 110, unit: 'mmHg' },
    diastolicBP: { min: 50, max: 75, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  preschool: {
    heartRate: { min: 70, max: 120, unit: 'bpm' },
    respiratoryRate: { min: 20, max: 30, unit: '/min' },
    systolicBP: { min: 85, max: 115, unit: 'mmHg' },
    diastolicBP: { min: 50, max: 75, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  school_age: {
    heartRate: { min: 60, max: 110, unit: 'bpm' },
    respiratoryRate: { min: 18, max: 25, unit: '/min' },
    systolicBP: { min: 90, max: 120, unit: 'mmHg' },
    diastolicBP: { min: 55, max: 80, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  adolescent: {
    heartRate: { min: 55, max: 100, unit: 'bpm' },
    respiratoryRate: { min: 12, max: 20, unit: '/min' },
    systolicBP: { min: 100, max: 135, unit: 'mmHg' },
    diastolicBP: { min: 60, max: 85, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  adult: {
    heartRate: { min: 60, max: 100, unit: 'bpm' },
    respiratoryRate: { min: 12, max: 20, unit: '/min' },
    systolicBP: { min: 90, max: 140, unit: 'mmHg' },
    diastolicBP: { min: 60, max: 90, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
  geriatric: {
    heartRate: { min: 55, max: 100, unit: 'bpm' },
    respiratoryRate: { min: 12, max: 22, unit: '/min' },
    systolicBP: { min: 100, max: 150, unit: 'mmHg' }, // Slightly higher acceptable for elderly
    diastolicBP: { min: 60, max: 90, unit: 'mmHg' },
    temperature: { min: 36.0, max: 37.2, unit: '°C' }, // Lower baseline for elderly
    oxygenSaturation: { min: 94, max: 100, unit: '%' },
  },
  pregnancy: {
    heartRate: { min: 70, max: 110, unit: 'bpm' }, // Increased in pregnancy
    respiratoryRate: { min: 12, max: 22, unit: '/min' },
    systolicBP: { min: 90, max: 130, unit: 'mmHg' }, // Lower is concerning (preeclampsia)
    diastolicBP: { min: 55, max: 85, unit: 'mmHg' },
    temperature: { min: 36.5, max: 37.5, unit: '°C' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
  },
};

// Pregnancy-specific vital sign alerts
const PREGNANCY_ALERTS = {
  systolicBP: {
    warning: 130,
    critical: 140,
    message: 'Elevated BP in pregnancy may indicate preeclampsia',
  },
  diastolicBP: {
    warning: 85,
    critical: 90,
    message: 'Elevated diastolic BP - consider preeclampsia workup',
  },
  proteinuria: {
    warning: true,
    message: 'Protein in urine with elevated BP suggests preeclampsia',
  },
};

export interface UsePatientContextResult {
  // Patient data
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: 'male' | 'female';
  } | null;
  
  // Categorization
  category: PatientCategory | null;
  pregnancy: PregnancyStatus | null;
  context: PatientContext | null;
  
  // Clinical data
  gfr: GFRResult | null;
  vitalSignsReference: VitalSignsReference;
  
  // Dynamic form helpers
  isFieldApplicable: (fieldName: string) => boolean;
  getRequiredAssessments: () => string[];
  getExcludedAssessments: () => string[];
  getOptionalAssessments: () => string[];
  
  // Dosing helpers
  dosingWeight: {
    weight: number;
    type: 'actual' | 'ibw' | 'adjusted';
    recommendation: string;
  } | null;
  
  // Clinical alerts
  clinicalConsiderations: string[];
  contraindications: string[];
  
  // Loading state
  isLoading: boolean;
}

export function usePatientContext(patientId?: string): UsePatientContextResult {
  // Fetch patient data
  const patient = useLiveQuery(
    async () => {
      if (!patientId) return null;
      return db.patients.get(patientId);
    },
    [patientId]
  );

  // Fetch latest vitals for weight/height
  const latestVitals = useLiveQuery(
    async () => {
      if (!patientId) return null;
      const vitals = await db.vitalSigns
        .where('patientId')
        .equals(patientId)
        .reverse()
        .first();
      return vitals;
    },
    [patientId]
  );

  // Fetch latest creatinine for GFR
  const latestCreatinine = useLiveQuery(
    async () => {
      if (!patientId) return null;
      const labs = await db.labRequests
        .where('patientId')
        .equals(patientId)
        .toArray();
      
      // Find most recent creatinine result from lab tests
      for (const lab of labs) {
        if (lab.tests && Array.isArray(lab.tests)) {
          const creatTest = lab.tests.find(t => 
            t.name?.toLowerCase().includes('creatinine') && t.result
          );
          if (creatTest) {
            return { result: creatTest.result, unit: creatTest.unit, requestedAt: lab.requestedAt };
          }
        }
      }
      
      return null;
    },
    [patientId]
  );

  // Calculate patient category
  const category = useMemo(() => {
    if (!patient?.dateOfBirth) return null;
    return categorizePatient(patient.dateOfBirth);
  }, [patient?.dateOfBirth]);

  // Calculate pregnancy status
  const pregnancy = useMemo(() => {
    if (!patient) return null;
    if (patient.gender !== 'female') return null;
    if (!category?.isAdult) return null;
    
    // Check if patient is marked as pregnant
    const isPregnant = (patient as any).isPregnant || false;
    const lmp = (patient as any).lastMenstrualPeriod;
    const gestationalWeeks = (patient as any).gestationalWeeks;
    
    return categorizePregnancy(isPregnant, lmp, gestationalWeeks);
  }, [patient, category]);

  // Calculate full context
  const context = useMemo(() => {
    if (!patient?.dateOfBirth) return null;
    
    return getPatientContext(
      patient.dateOfBirth,
      patient.gender === 'male' ? 'male' : 'female',
      latestVitals?.weight,
      latestVitals?.height,
      pregnancy?.isPregnant,
      (patient as any).lastMenstrualPeriod
    );
  }, [patient, latestVitals, pregnancy]);

  // Calculate GFR
  const gfr = useMemo((): GFRResult | null => {
    if (!patient?.dateOfBirth || !latestCreatinine) return null;
    
    const creatinineValue = parseFloat(latestCreatinine.result || '0');
    if (isNaN(creatinineValue) || creatinineValue <= 0) return null;
    
    // Use the synchronous calculateGFR function instead
    const { calculateGFR } = require('../services/gfrCalculationService');
    return calculateGFR({
      creatinine: creatinineValue,
      creatinineUnit: 'mg/dL',
      age: category?.ageInYears || 0,
      gender: patient.gender === 'male' ? 'male' : 'female',
      weight: latestVitals?.weight,
      height: latestVitals?.height,
    });
  }, [patient, category, latestCreatinine, latestVitals]);

  // Get vital signs reference for patient category
  const vitalSignsReference = useMemo(() => {
    if (pregnancy?.isPregnant) {
      return VITAL_SIGNS_BY_AGE.pregnancy;
    }
    if (category) {
      return VITAL_SIGNS_BY_AGE[category.ageCategory] || VITAL_SIGNS_BY_AGE.adult;
    }
    return VITAL_SIGNS_BY_AGE.adult;
  }, [category, pregnancy]);

  // Calculate dosing weight
  const dosingWeight = useMemo(() => {
    if (!context) return null;
    return getDosingWeight(context);
  }, [context]);

  // Field applicability check
  const isFieldApplicable = useCallback((fieldName: string): boolean => {
    if (!category) return true;
    
    const result = isAssessmentAppropriate(fieldName, category, pregnancy || undefined);
    return result.appropriate;
  }, [category, pregnancy]);

  // Get assessments lists
  const getRequiredAssessments = useCallback((): string[] => {
    const assessments: string[] = [];
    
    if (category) {
      assessments.push(...category.requiredAssessments);
    }
    
    if (pregnancy?.isPregnant) {
      assessments.push(...pregnancy.requiredAssessments);
    }
    
    return [...new Set(assessments)];
  }, [category, pregnancy]);

  const getExcludedAssessments = useCallback((): string[] => {
    const excluded: string[] = [];
    
    if (category) {
      excluded.push(...category.excludedAssessments);
    }
    
    if (pregnancy?.isPregnant) {
      excluded.push(...pregnancy.excludedAssessments);
    }
    
    return [...new Set(excluded)];
  }, [category, pregnancy]);

  const getOptionalAssessments = useCallback((): string[] => {
    if (!category) return [];
    return category.optionalAssessments;
  }, [category]);

  // Clinical considerations and contraindications
  const clinicalConsiderations = useMemo(() => {
    const considerations: string[] = [];
    
    if (category) {
      considerations.push(...category.clinicalConsiderations);
    }
    
    if (pregnancy?.isPregnant) {
      considerations.push(...pregnancy.clinicalConsiderations);
    }
    
    // Add GFR-specific considerations
    if (gfr && gfr.gfrCKDEPI < 60) {
      considerations.push(`Reduced kidney function (GFR: ${Math.round(gfr.gfrCKDEPI)} mL/min) - adjust renally-cleared medications`);
    }
    
    return considerations;
  }, [category, pregnancy, gfr]);

  const contraindications = useMemo(() => {
    const contras: string[] = [];
    
    if (category) {
      contras.push(...category.contraindications);
    }
    
    if (pregnancy?.isPregnant) {
      contras.push(...pregnancy.contraindications);
    }
    
    return contras;
  }, [category, pregnancy]);

  return {
    patient: patient ? {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth instanceof Date ? patient.dateOfBirth.toISOString() : String(patient.dateOfBirth),
      sex: patient.gender as 'male' | 'female',
    } : null,
    category,
    pregnancy,
    context,
    gfr,
    vitalSignsReference,
    isFieldApplicable,
    getRequiredAssessments,
    getExcludedAssessments,
    getOptionalAssessments,
    dosingWeight,
    clinicalConsiderations,
    contraindications,
    isLoading: patient === undefined,
  };
}

// Helper component props for dynamic form rendering
export interface DynamicFormFieldProps {
  field: FormFieldConfig;
  patientContext: UsePatientContextResult;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Export vital sign references
export { VITAL_SIGNS_BY_AGE, PREGNANCY_ALERTS };

export default usePatientContext;
