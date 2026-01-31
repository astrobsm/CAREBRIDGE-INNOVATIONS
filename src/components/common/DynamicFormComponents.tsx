/**
 * Dynamic Form Components
 * 
 * Components that automatically show/hide fields based on patient age category,
 * pregnancy status, and clinical context.
 */

import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, Baby, User, Users, Heart } from 'lucide-react';
import type { PatientCategory, PregnancyStatus, BroadCategory } from '../../services/patientCategoryService';
import { type UsePatientContextResult } from '../../hooks/usePatientContext';

// ==============================================
// Patient Category Badge
// ==============================================

interface PatientCategoryBadgeProps {
  category: PatientCategory | null;
  pregnancy?: PregnancyStatus | null;
  showDetails?: boolean;
}

export function PatientCategoryBadge({ category, pregnancy, showDetails = false }: PatientCategoryBadgeProps) {
  if (!category) return null;

  const getCategoryColor = () => {
    if (pregnancy?.isPregnant) return 'bg-pink-100 text-pink-800 border-pink-300';
    switch (category.broadCategory) {
      case 'pediatric': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'geriatric': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getIcon = () => {
    if (pregnancy?.isPregnant) return <Heart className="w-4 h-4" />;
    switch (category.broadCategory) {
      case 'pediatric': return <Baby className="w-4 h-4" />;
      case 'geriatric': return <Users className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    if (pregnancy?.isPregnant) {
      return `Pregnant (T${pregnancy.trimester})`;
    }
    return category.ageCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor()}`}>
      {getIcon()}
      <span>{getLabel()}</span>
      {showDetails && (
        <span className="text-xs opacity-75">({category.displayAge})</span>
      )}
    </div>
  );
}

// ==============================================
// Clinical Considerations Alert
// ==============================================

interface ClinicalConsiderationsProps {
  context: UsePatientContextResult;
  variant?: 'compact' | 'detailed';
}

export function ClinicalConsiderations({ context, variant = 'compact' }: ClinicalConsiderationsProps) {
  const { clinicalConsiderations, contraindications, category, pregnancy, gfr } = context;

  if (!category && !pregnancy) return null;

  const hasConsiderations = clinicalConsiderations.length > 0;
  const hasContraindications = contraindications.length > 0;

  if (!hasConsiderations && !hasContraindications) return null;

  if (variant === 'compact') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Clinical Considerations for {category?.ageCategory} Patient
              {pregnancy?.isPregnant && ` (Pregnancy T${pregnancy.trimester})`}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {clinicalConsiderations.length} considerations, {contraindications.length} contraindications
            </p>
            {gfr && (
              <p className="text-xs text-amber-700 mt-1">
                GFR: {Math.round(gfr.gfrCKDEPI)} mL/min ({gfr.ckdStage} - {gfr.stageDescription})
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasConsiderations && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h4 className="text-sm font-medium text-blue-800">Clinical Considerations</h4>
          </div>
          <ul className="text-xs text-blue-700 space-y-1 ml-7">
            {clinicalConsiderations.slice(0, 5).map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
            {clinicalConsiderations.length > 5 && (
              <li className="text-blue-500">+ {clinicalConsiderations.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {hasContraindications && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h4 className="text-sm font-medium text-red-800">Contraindications</h4>
          </div>
          <ul className="text-xs text-red-700 space-y-1 ml-7">
            {contraindications.slice(0, 5).map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
            {contraindications.length > 5 && (
              <li className="text-red-500">+ {contraindications.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {gfr && (
        <div className={`border rounded-lg p-4 ${
          gfr.gfrCKDEPI < 30 ? 'bg-red-50 border-red-200' :
          gfr.gfrCKDEPI < 60 ? 'bg-amber-50 border-amber-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
              gfr.gfrCKDEPI < 30 ? 'text-red-600' :
              gfr.gfrCKDEPI < 60 ? 'text-amber-600' :
              'text-green-600'
            }`} />
            <div>
              <h4 className={`text-sm font-medium ${
                gfr.gfrCKDEPI < 30 ? 'text-red-800' :
                gfr.gfrCKDEPI < 60 ? 'text-amber-800' :
                'text-green-800'
              }`}>
                Renal Function: {gfr.stageDescription}
              </h4>
              <p className="text-xs mt-1">
                eGFR: {Math.round(gfr.gfrCKDEPI)} mL/min/1.73m² (CKD-EPI)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================
// Required Assessments Checklist
// ==============================================

interface RequiredAssessmentsProps {
  context: UsePatientContextResult;
  completedAssessments?: string[];
  onAssessmentClick?: (assessment: string) => void;
}

export function RequiredAssessments({ 
  context, 
  completedAssessments = [],
  onAssessmentClick 
}: RequiredAssessmentsProps) {
  const required = context.getRequiredAssessments();
  const optional = context.getOptionalAssessments();

  if (required.length === 0 && optional.length === 0) return null;

  const isCompleted = (assessment: string) => 
    completedAssessments.some(a => 
      a.toLowerCase().includes(assessment.toLowerCase()) ||
      assessment.toLowerCase().includes(a.toLowerCase())
    );

  return (
    <div className="space-y-4">
      {required.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Required Assessments
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {required.map((assessment, idx) => (
              <button
                key={idx}
                onClick={() => onAssessmentClick?.(assessment)}
                className={`text-left text-xs p-2 rounded border ${
                  isCompleted(assessment)
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={isCompleted(assessment) ? 'line-through' : ''}>
                  {assessment}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Optional Assessments
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {optional.map((assessment, idx) => (
              <button
                key={idx}
                onClick={() => onAssessmentClick?.(assessment)}
                className={`text-left text-xs p-2 rounded border ${
                  isCompleted(assessment)
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {assessment}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================
// Vital Signs Reference Display
// ==============================================

interface VitalSignsReferenceProps {
  context: UsePatientContextResult;
  currentVitals?: {
    heartRate?: number;
    respiratoryRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
}

export function VitalSignsReference({ context, currentVitals }: VitalSignsReferenceProps) {
  const { vitalSignsReference, category, pregnancy } = context;

  const isInRange = (value: number | undefined, range: { min: number; max: number }) => {
    if (value === undefined) return null;
    return value >= range.min && value <= range.max;
  };

  const getStatusColor = (inRange: boolean | null) => {
    if (inRange === null) return 'text-gray-400';
    return inRange ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (inRange: boolean | null) => {
    if (inRange === null) return 'bg-gray-50';
    return inRange ? 'bg-green-50' : 'bg-red-50';
  };

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        Normal Ranges for {category?.ageCategory || 'Adult'}
        {pregnancy?.isPregnant && ' (Pregnancy)'}
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        {Object.entries(vitalSignsReference).map(([key, range]) => {
          const currentValue = currentVitals?.[key as keyof typeof currentVitals];
          const inRange = isInRange(currentValue as number, range);
          
          return (
            <div 
              key={key} 
              className={`p-2 rounded ${getStatusBg(inRange)}`}
            >
              <span className="text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <div className={`font-medium ${getStatusColor(inRange)}`}>
                {currentValue !== undefined && (
                  <span className="mr-1">{currentValue}</span>
                )}
                <span className="text-gray-400">
                  ({range.min}-{range.max} {range.unit})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================
// Dynamic Form Section Wrapper
// ==============================================

interface DynamicFormSectionProps {
  title: string;
  applicableCategories?: BroadCategory[];
  excludedCategories?: BroadCategory[];
  pregnancyOnly?: boolean;
  children: React.ReactNode;
  context: UsePatientContextResult;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function DynamicFormSection({
  title,
  applicableCategories,
  excludedCategories,
  pregnancyOnly = false,
  children,
  context,
  collapsible = false,
  defaultExpanded = true,
}: DynamicFormSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const { category, pregnancy } = context;

  // Determine if section should be shown
  const shouldShow = useMemo(() => {
    if (!category) return true; // Show by default if no category

    // Check pregnancy-only sections
    if (pregnancyOnly && !pregnancy?.isPregnant) {
      return false;
    }

    // Check excluded categories
    if (excludedCategories?.includes(category.broadCategory)) {
      return false;
    }

    // Check applicable categories (if specified)
    if (applicableCategories && applicableCategories.length > 0) {
      return applicableCategories.includes(category.broadCategory);
    }

    return true;
  }, [category, pregnancy, applicableCategories, excludedCategories, pregnancyOnly]);

  if (!shouldShow) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div 
        className={`bg-gray-50 px-4 py-3 border-b flex items-center justify-between ${
          collapsible ? 'cursor-pointer hover:bg-gray-100' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {collapsible && (
          <span className="text-gray-400 text-xs">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      {(!collapsible || isExpanded) && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ==============================================
// Pregnancy-Specific Fields
// ==============================================

interface PregnancyFieldsProps {
  context: UsePatientContextResult;
  onLMPChange?: (date: string) => void;
  onEDDChange?: (date: string) => void;
  lmp?: string;
  edd?: string;
}

export function PregnancyFields({ context, onLMPChange, onEDDChange, lmp, edd }: PregnancyFieldsProps) {
  const { pregnancy, category } = context;

  // Only show for female adults
  if (category?.broadCategory !== 'adult' || context.patient?.sex !== 'female') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Menstrual Period (LMP)
          </label>
          <input
            type="date"
            value={lmp || ''}
            onChange={(e) => onLMPChange?.(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            title="Last Menstrual Period date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Delivery Date (EDD)
          </label>
          <input
            type="date"
            value={edd || ''}
            onChange={(e) => onEDDChange?.(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            readOnly={!!lmp} // Auto-calculated from LMP
          />
        </div>
      </div>

      {pregnancy?.isPregnant && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-pink-600" />
            <span className="font-medium text-pink-800">
              Trimester {pregnancy.trimester} - {pregnancy.gestationalWeeks} weeks
            </span>
          </div>
          {pregnancy.edd && (
            <p className="text-sm text-pink-700">
              EDD: {new Date(pregnancy.edd).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ==============================================
// Pediatric-Specific Fields
// ==============================================

interface PediatricFieldsProps {
  context: UsePatientContextResult;
  values?: {
    birthWeight?: number;
    headCircumference?: number;
    gestationalAge?: number;
    apgarScore?: string;
  };
  onChange?: (field: string, value: any) => void;
}

export function PediatricFields({ context, values = {}, onChange }: PediatricFieldsProps) {
  const { category } = context;

  if (!category?.isPediatric) return null;

  const isNeonate = category.isNeonate;
  const isInfant = category.isInfant;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Baby className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-blue-800">
          Pediatric Assessment ({category.ageCategory})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(isNeonate || isInfant) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={values.birthWeight || ''}
                onChange={(e) => onChange?.('birthWeight', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., 3.2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Head Circumference (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={values.headCircumference || ''}
                onChange={(e) => onChange?.('headCircumference', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., 34.5"
              />
            </div>
          </>
        )}

        {isNeonate && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gestational Age at Birth (weeks)
              </label>
              <input
                type="number"
                value={values.gestationalAge || ''}
                onChange={(e) => onChange?.('gestationalAge', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., 38"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                APGAR Score (1min/5min)
              </label>
              <input
                type="text"
                value={values.apgarScore || ''}
                onChange={(e) => onChange?.('apgarScore', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g., 8/9"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==============================================
// Geriatric-Specific Fields
// ==============================================

interface GeriatricFieldsProps {
  context: UsePatientContextResult;
  values?: {
    cognitiveScore?: number;
    fallRisk?: 'low' | 'moderate' | 'high';
    functionalStatus?: 'independent' | 'partial_assist' | 'dependent';
    frailtyScore?: number;
    polypharmacyCount?: number;
  };
  onChange?: (field: string, value: any) => void;
}

export function GeriatricFields({ context, values = {}, onChange }: GeriatricFieldsProps) {
  const { category, gfr } = context;

  if (!category?.isGeriatric) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-purple-600" />
        <span className="font-medium text-purple-800">
          Geriatric Assessment
        </span>
      </div>

      {gfr && (
        <div className={`p-3 rounded-lg ${
          gfr.gfrCKDEPI < 30 ? 'bg-red-50 border-red-200' :
          gfr.gfrCKDEPI < 60 ? 'bg-amber-50 border-amber-200' :
          'bg-green-50 border-green-200'
        } border`}>
          <p className="text-sm font-medium">
            Renal Function: eGFR {Math.round(gfr.gfrCKDEPI)} mL/min - {gfr.stageDescription}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {gfr.recommendations?.[0] || 'Continue routine monitoring'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cognitive Score (MMSE/MoCA)
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={values.cognitiveScore || ''}
            onChange={(e) => onChange?.('cognitiveScore', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="0-30"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fall Risk
          </label>
          <select
            value={values.fallRisk || ''}
            onChange={(e) => onChange?.('fallRisk', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            title="Select fall risk level"
          >
            <option value="">Select...</option>
            <option value="low">Low Risk</option>
            <option value="moderate">Moderate Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Functional Status (ADL)
          </label>
          <select
            value={values.functionalStatus || ''}
            onChange={(e) => onChange?.('functionalStatus', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            title="Select functional status for activities of daily living"
          >
            <option value="">Select...</option>
            <option value="independent">Independent</option>
            <option value="partial_assist">Needs Assistance</option>
            <option value="dependent">Dependent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Medications Count
          </label>
          <input
            type="number"
            min="0"
            value={values.polypharmacyCount || ''}
            onChange={(e) => onChange?.('polypharmacyCount', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Number of medications"
          />
          {values.polypharmacyCount && values.polypharmacyCount >= 5 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Polypharmacy - review for drug interactions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default {
  PatientCategoryBadge,
  ClinicalConsiderations,
  RequiredAssessments,
  VitalSignsReference,
  DynamicFormSection,
  PregnancyFields,
  PediatricFields,
  GeriatricFields,
};
