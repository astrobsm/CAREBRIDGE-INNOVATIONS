/**
 * Integrated Risk Assessments for Admission Form
 * AstroHEALTH Innovations in Healthcare
 * 
 * Combines all risk assessments into a tabbed interface for the admission form:
 * - DVT (Caprini)
 * - Pressure Sore (Braden Scale)
 * - Nutritional Risk (MUST)
 * - Drug Allergies
 * - 7-Day Meal Plan
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Pill,
  Apple,
  Heart,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

// Import individual assessment components
import DVTCapriniAssessment, { type DVTAssessmentResult } from './DVTCapriniAssessment';
import PressureSoreAssessment, { type PressureSoreAssessmentResult } from './PressureSoreAssessment';
import NutritionalRiskAssessment, { type NutritionalAssessmentResult } from './NutritionalRiskAssessment';
import MealPlanGenerator, { type WeeklyMealPlan } from './MealPlanGenerator';
import DrugAllergyAssessment, { type AllergyAssessmentResult } from './DrugAllergyAssessment';

// ============================================
// TYPES
// ============================================

export interface PatientBasicInfo {
  id: string;
  name: string;
  hospitalNumber: string;
  age: number;
  gender: 'Male' | 'Female';
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface AdmissionRiskAssessments {
  dvtCaprini?: DVTAssessmentResult;
  pressureSore?: PressureSoreAssessmentResult;
  nutritional?: NutritionalAssessmentResult;
  mealPlan?: WeeklyMealPlan;
  drugAllergies?: AllergyAssessmentResult;
  completedAt?: Date;
}

type AssessmentTab = 'dvt' | 'pressure' | 'nutrition' | 'mealplan' | 'allergies';

interface Props {
  patientInfo: PatientBasicInfo;
  onAssessmentsComplete?: (assessments: AdmissionRiskAssessments) => void;
  initialAssessments?: AdmissionRiskAssessments;
  compact?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export default function AdmissionRiskAssessments({
  patientInfo,
  onAssessmentsComplete,
  initialAssessments = {},
  compact = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<AssessmentTab>('dvt');
  const [assessments, setAssessments] = useState<AdmissionRiskAssessments>(initialAssessments);
  const [completedTabs, setCompletedTabs] = useState<Set<AssessmentTab>>(new Set());

  const tabs: { id: AssessmentTab; label: string; icon: typeof Activity; color: string }[] = [
    { id: 'dvt', label: 'DVT Risk', icon: Heart, color: 'text-red-600' },
    { id: 'pressure', label: 'Pressure Sore', icon: Activity, color: 'text-orange-600' },
    { id: 'nutrition', label: 'Nutrition', icon: Apple, color: 'text-green-600' },
    { id: 'mealplan', label: 'Meal Plan', icon: Apple, color: 'text-emerald-600' },
    { id: 'allergies', label: 'Drug Allergies', icon: Pill, color: 'text-purple-600' },
  ];

  const handleCapriniComplete = (result: DVTAssessmentResult) => {
    const updated = { ...assessments, dvtCaprini: result };
    setAssessments(updated);
    setCompletedTabs(prev => new Set([...prev, 'dvt']));
    if (onAssessmentsComplete) onAssessmentsComplete({ ...updated, completedAt: new Date() });
  };

  const handleBradenComplete = (result: PressureSoreAssessmentResult) => {
    const updated = { ...assessments, pressureSore: result };
    setAssessments(updated);
    setCompletedTabs(prev => new Set([...prev, 'pressure']));
    if (onAssessmentsComplete) onAssessmentsComplete({ ...updated, completedAt: new Date() });
  };

  const handleMUSTComplete = (result: NutritionalAssessmentResult) => {
    const updated = { ...assessments, nutritional: result };
    setAssessments(updated);
    setCompletedTabs(prev => new Set([...prev, 'nutrition']));
    if (onAssessmentsComplete) onAssessmentsComplete({ ...updated, completedAt: new Date() });
  };

  const handleMealPlanComplete = (plan: WeeklyMealPlan) => {
    const updated = { ...assessments, mealPlan: plan };
    setAssessments(updated);
    setCompletedTabs(prev => new Set([...prev, 'mealplan']));
    if (onAssessmentsComplete) onAssessmentsComplete({ ...updated, completedAt: new Date() });
  };

  const handleAllergyComplete = (result: AllergyAssessmentResult) => {
    const updated = { ...assessments, drugAllergies: result };
    setAssessments(updated);
    setCompletedTabs(prev => new Set([...prev, 'allergies']));
    if (onAssessmentsComplete) onAssessmentsComplete({ ...updated, completedAt: new Date() });
  };

  // Get summary for quick view
  const getSummaryBadge = (tab: AssessmentTab) => {
    if (!completedTabs.has(tab)) return null;

    switch (tab) {
      case 'dvt':
        if (assessments.dvtCaprini) {
          const risk = assessments.dvtCaprini.riskLevel;
          return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              risk === 'High' ? 'bg-red-100 text-red-700' :
              risk === 'Moderate' ? 'bg-orange-100 text-orange-700' :
              risk === 'Low' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {risk} ({assessments.dvtCaprini.score})
            </span>
          );
        }
        break;
      case 'pressure':
        if (assessments.pressureSore) {
          const risk = assessments.pressureSore.riskLevel;
          return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              risk === 'Very High' || risk === 'High' ? 'bg-red-100 text-red-700' :
              risk === 'Moderate' ? 'bg-orange-100 text-orange-700' :
              risk === 'Mild' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {risk} ({assessments.pressureSore.totalScore})
            </span>
          );
        }
        break;
      case 'nutrition':
        if (assessments.nutritional) {
          const risk = assessments.nutritional.riskLevel;
          return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              risk === 'High' ? 'bg-red-100 text-red-700' :
              risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {risk} ({assessments.nutritional.mustScore})
            </span>
          );
        }
        break;
      case 'mealplan':
        if (assessments.mealPlan) {
          return (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              Generated
            </span>
          );
        }
        break;
      case 'allergies':
        if (assessments.drugAllergies) {
          const count = assessments.drugAllergies.allergies.length;
          return (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              assessments.drugAllergies.nkda 
                ? 'bg-green-100 text-green-700' 
                : count > 0 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-gray-100 text-gray-700'
            }`}>
              {assessments.drugAllergies.nkda ? 'NKDA' : `${count} allergies`}
            </span>
          );
        }
        break;
    }
    return null;
  };

  // Calculate overall risk summary
  const getOverallRiskSummary = () => {
    const risks: string[] = [];
    
    if (assessments.dvtCaprini?.riskLevel === 'High') {
      risks.push('High DVT Risk');
    }
    if (assessments.pressureSore?.riskLevel === 'Very High' || assessments.pressureSore?.riskLevel === 'High') {
      risks.push('Pressure Ulcer Risk');
    }
    if (assessments.nutritional?.riskLevel === 'High') {
      risks.push('Malnutrition Risk');
    }
    if (assessments.drugAllergies?.highRiskPatient) {
      risks.push('Drug Allergy Alert');
    }

    return risks;
  };

  const overallRisks = getOverallRiskSummary();

  return (
    <div className="space-y-4">
      {/* Risk Summary Alert (if any high risks) */}
      {overallRisks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">High Risk Alerts</p>
              <ul className="text-sm text-red-700 mt-1">
                {overallRisks.map((risk, i) => (
                  <li key={i}>• {risk}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isComplete = completedTabs.has(tab.id);
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} className={isActive ? tab.color : 'text-gray-400'} />
              <span className={compact ? 'hidden sm:inline' : ''}>{tab.label}</span>
              {isComplete && (
                <CheckCircle2 size={14} className="text-green-500" />
              )}
              {!compact && getSummaryBadge(tab.id)}
            </button>
          );
        })}
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {completedTabs.size} of {tabs.length} assessments completed
        </span>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`w-8 h-1 rounded-full ${
                completedTabs.has(tab.id) ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="min-h-[400px]"
        >
          {activeTab === 'dvt' && (
            <DVTCapriniAssessment
              patientAge={patientInfo.age}
              patientBMI={patientInfo.bmi}
              patientInfo={{
                name: patientInfo.name,
                hospitalNumber: patientInfo.hospitalNumber,
                gender: patientInfo.gender,
              }}
              onAssessmentComplete={handleCapriniComplete}
              initialSelectedFactors={assessments.dvtCaprini?.selectedFactors}
            />
          )}

          {activeTab === 'pressure' && (
            <PressureSoreAssessment
              patientInfo={{
                name: patientInfo.name,
                hospitalNumber: patientInfo.hospitalNumber,
                gender: patientInfo.gender,
              }}
              onAssessmentComplete={handleBradenComplete}
              initialScores={assessments.pressureSore?.categoryScores}
            />
          )}

          {activeTab === 'nutrition' && (
            <NutritionalRiskAssessment
              patientWeight={patientInfo.weight}
              patientHeight={patientInfo.height}
              patientInfo={{
                name: patientInfo.name,
                hospitalNumber: patientInfo.hospitalNumber,
                gender: patientInfo.gender,
                age: patientInfo.age,
              }}
              onAssessmentComplete={handleMUSTComplete}
              initialScores={assessments.nutritional?.categoryScores}
            />
          )}

          {activeTab === 'mealplan' && (
            <MealPlanGenerator
              patientInfo={{
                name: patientInfo.name,
                hospitalNumber: patientInfo.hospitalNumber,
              }}
              targetCalories={assessments.nutritional?.caloricTarget || 2000}
              targetProtein={assessments.nutritional?.proteinTarget || 60}
              mustScore={assessments.nutritional?.mustScore}
              onMealPlanGenerated={handleMealPlanComplete}
            />
          )}

          {activeTab === 'allergies' && (
            <DrugAllergyAssessment
              patientInfo={{
                name: patientInfo.name,
                hospitalNumber: patientInfo.hospitalNumber,
                gender: patientInfo.gender,
              }}
              onAssessmentComplete={handleAllergyComplete}
              initialAllergies={assessments.drugAllergies?.allergies}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next Tab Button */}
      {activeTab !== 'allergies' && (
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => {
              const currentIndex = tabs.findIndex(t => t.id === activeTab);
              if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1].id);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Next Assessment
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Complete All Button */}
      {completedTabs.size === tabs.length && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="font-medium text-green-800">All Risk Assessments Completed</p>
          <p className="text-sm text-green-600 mt-1">
            Assessment data will be saved with the admission record
          </p>
        </div>
      )}
    </div>
  );
}
