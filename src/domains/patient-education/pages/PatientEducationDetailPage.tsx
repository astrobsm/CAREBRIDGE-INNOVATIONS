/**
 * Patient Education Detail Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Displays detailed education material for a specific procedure or condition
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Download,
  AlertTriangle,
  Clock,
  Target,
  Stethoscope,
  Activity,
  Calendar,
  ShieldCheck,
  Heart,
  CheckCircle,
  AlertCircle,
  Home,
  ChevronRight,
  Syringe,
  Users,
  ClipboardList,
} from 'lucide-react';
import { getProcedureEducation, complicationLikelihood, type ProcedureEducation } from '../../../data/patientEducation';
import { allBurnsConditions, allWoundsConditions, allPressureInjuriesConditions, allReconstructiveSurgeryConditions, allHerniaConditions, allPediatricSurgeryConditions, allVascularConditions, allBreastConditions, allCosmeticConditions, allGenitalReconstructionConditions, allReconstructiveTechniquesConditions, allSystemicConditions, allDrNnadiBurnsEducation } from '../data';
import type { EducationCondition } from '../types';
import { downloadPatientEducationPDF, downloadProcedureEducationPDF } from '../../../utils/educationPdfGenerator';
import { EDUCATION_CATEGORIES } from '../types';

// Combine all education conditions for search
const allEducationConditions: EducationCondition[] = [
  ...allBurnsConditions,
  ...allWoundsConditions,
  ...allPressureInjuriesConditions,
  ...allReconstructiveSurgeryConditions,
  ...allHerniaConditions,
  ...allPediatricSurgeryConditions,
  ...allVascularConditions,
  ...allBreastConditions,
  ...allCosmeticConditions,
  ...allGenitalReconstructionConditions,
  ...allReconstructiveTechniquesConditions,
  ...allSystemicConditions,
  ...allDrNnadiBurnsEducation,
];

const PatientEducationDetailPage: React.FC = () => {
  const { conditionId } = useParams<{ conditionId: string }>();
  const navigate = useNavigate();

  // First try to find in procedure education database, then in condition education
  const { procedureEducation, educationCondition } = useMemo(() => {
    if (!conditionId) return { procedureEducation: null, educationCondition: null };

    // Try procedure education first (from src/data/patientEducation.ts)
    const procEd = getProcedureEducation(conditionId);
    if (procEd && procEd.procedureId !== `GEN-${Date.now()}`.substring(0, 4)) {
      return { procedureEducation: procEd, educationCondition: null };
    }

    // Try to find in education conditions (from src/domains/patient-education/data/)
    const edCond = allEducationConditions.find(
      c => c.id === conditionId || 
           c.id.toLowerCase() === conditionId.toLowerCase() ||
           c.name.toLowerCase().replace(/\s+/g, '-') === conditionId.toLowerCase()
    );
    if (edCond) {
      return { procedureEducation: null, educationCondition: edCond };
    }

    // Fallback to generic procedure education
    return { procedureEducation: procEd, educationCondition: null };
  }, [conditionId]);

  // Handle download
  const handleDownload = () => {
    if (educationCondition) {
      const baseCat = EDUCATION_CATEGORIES.find(c => 
        c.name.toLowerCase() === educationCondition.category?.toLowerCase()
      ) || EDUCATION_CATEGORIES[0];
      // Create category with conditions property
      const category = {
        ...baseCat,
        conditions: [educationCondition]
      };
      downloadPatientEducationPDF(educationCondition, category);
    }
    // For procedure education, we'd need a separate PDF generator
  };

  // Handle download for procedure education
  const handleProcedureDownload = () => {
    if (procedureEducation) {
      downloadProcedureEducationPDF(procedureEducation);
    }
  };

  // Not found state
  if (!procedureEducation && !educationCondition) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Education Material Not Found</h1>
          <p className="text-gray-600 mb-6">
            The education material you're looking for could not be found. It may have been removed or the link is incorrect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <Link
              to="/patient-education"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Browse All Education
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Procedure Education (from patientEducation.ts)
  if (procedureEducation) {
    return <ProcedureEducationView education={procedureEducation} onBack={() => navigate(-1)} onDownload={handleProcedureDownload} />;
  }

  // Render Education Condition (from patient-education domain)
  if (educationCondition) {
    return <EducationConditionView condition={educationCondition} onBack={() => navigate(-1)} onDownload={handleDownload} />;
  }

  return null;
};

// Component to display ProcedureEducation
const ProcedureEducationView: React.FC<{ education: ProcedureEducation; onBack: () => void; onDownload: () => void }> = ({ education, onBack, onDownload }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-blue-100 mb-1">{education.category}</div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{education.procedureName}</h1>
              <p className="mt-2 text-blue-50 max-w-2xl">{education.overview}</p>
            </div>
            {/* Download Button */}
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-lg"
              title="Download PDF to share on WhatsApp"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Healing Time</span>
            </div>
            <p className="font-semibold text-gray-900">{education.healingTime}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Home className="h-4 w-4" />
              <span className="text-sm">Hospital Stay</span>
            </div>
            <p className="font-semibold text-gray-900">{education.hospitalStay}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-sm">Success Rate</span>
            </div>
            <p className="font-semibold text-gray-900">{education.successRate}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Syringe className="h-4 w-4" />
              <span className="text-sm">Anesthesia</span>
            </div>
            <p className="font-semibold text-gray-900 capitalize">{education.preferredAnesthesia}</p>
          </div>
        </div>

        {/* Aims */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Aims of Surgery
          </h2>
          <ul className="space-y-2">
            {education.aims.map((aim, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{aim}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Indications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            When This Surgery is Recommended
          </h2>
          <ul className="space-y-2">
            {education.indications.map((indication, index) => (
              <li key={index} className="flex items-start gap-3">
                <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{indication}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Anesthesia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Syringe className="h-5 w-5 text-purple-600" />
            Anesthesia Information
          </h2>
          <p className="text-gray-700 mb-4">{education.anesthesiaDescription}</p>
          <div className="flex flex-wrap gap-2">
            {education.anesthesiaTypes.map((type, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-full text-sm capitalize ${
                  type === education.preferredAnesthesia
                    ? 'bg-purple-100 text-purple-800 font-medium'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {type === education.preferredAnesthesia && '★ '}
                {type}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Expected Outcomes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Expected Outcomes
          </h2>
          <ul className="space-y-2">
            {education.expectedOutcomes.map((outcome, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{outcome}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Complications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Possible Complications
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            All surgeries carry some risk. Your surgeon takes every precaution to minimize these risks.
          </p>
          
          {/* General Complications */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">General Surgical Risks</h3>
            <div className="grid gap-3">
              {education.generalComplications.slice(0, 5).map((complication, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`text-xs font-medium px-2 py-1 rounded ${
                    complication.likelihood === 'rare' ? 'bg-green-100 text-green-800' :
                    complication.likelihood === 'uncommon' ? 'bg-yellow-100 text-yellow-800' :
                    complication.likelihood === 'common' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {complicationLikelihood[complication.likelihood].percentage}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{complication.name}</p>
                    <p className="text-sm text-gray-600">{complication.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specific Complications */}
          {education.specificComplications.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-800 mb-3">Procedure-Specific Risks</h3>
              <div className="grid gap-3">
                {education.specificComplications.map((complication, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className={`text-xs font-medium px-2 py-1 rounded ${
                      complication.likelihood === 'rare' ? 'bg-green-100 text-green-800' :
                      complication.likelihood === 'uncommon' ? 'bg-yellow-100 text-yellow-800' :
                      complication.likelihood === 'common' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {complication.percentage}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{complication.name}</p>
                      <p className="text-sm text-gray-600">{complication.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Lifestyle Changes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Recovery & Lifestyle Changes
          </h2>
          <div className="grid gap-3">
            {education.lifestyleChanges.map((change, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className={`text-xs font-medium px-2 py-1 rounded ${
                  change.importance === 'essential' ? 'bg-red-100 text-red-800' :
                  change.importance === 'recommended' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {change.importance}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{change.category}</p>
                  <p className="text-sm text-gray-600">{change.recommendation}</p>
                  {change.duration && (
                    <p className="text-xs text-gray-500 mt-1">Duration: {change.duration}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Patient Responsibilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Your Responsibilities
          </h2>
          <div className="space-y-4">
            {['pre_operative', 'immediate_post_op', 'recovery', 'long_term'].map(phase => {
              const phaseResponsibilities = education.patientResponsibilities.filter(r => r.phase === phase);
              if (phaseResponsibilities.length === 0) return null;
              
              const phaseLabels: Record<string, string> = {
                pre_operative: 'Before Surgery',
                immediate_post_op: 'Immediately After Surgery',
                recovery: 'During Recovery',
                long_term: 'Long-Term Care'
              };
              
              return (
                <div key={phase}>
                  <h3 className="font-medium text-gray-800 mb-2">{phaseLabels[phase]}</h3>
                  <ul className="space-y-2">
                    {phaseResponsibilities.map((resp, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          resp.importance === 'critical' ? 'bg-red-100 text-red-800' :
                          resp.importance === 'important' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {resp.importance}
                        </span>
                        <span className="text-gray-700">{resp.responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Follow-up Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Follow-up Schedule
          </h2>
          <ul className="space-y-2">
            {education.followUpSchedule.map((visit, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-700">{visit}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Warning Signs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-red-50 border border-red-200 rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Warning Signs - Seek Medical Help Immediately
          </h2>
          <ul className="space-y-2">
            {education.warningSignsToReport.map((sign, index) => (
              <li key={index} className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-800">{sign}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Alternative Treatments */}
        {education.alternativeTreatments && education.alternativeTreatments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-600" />
              Alternative Treatment Options
            </h2>
            <ul className="space-y-2">
              {education.alternativeTreatments.map((alt, index) => (
                <li key={index} className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{alt}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Risk of Not Treating */}
        {education.riskOfNotTreating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Risk of Not Having Surgery
            </h2>
            <p className="text-amber-800">{education.riskOfNotTreating}</p>
          </motion.div>
        )}

        {/* Back Button */}
        <div className="flex justify-center gap-4 pt-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Previous Page
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            title="Download PDF to share with patient on WhatsApp"
          >
            <Download className="h-5 w-5" />
            Download PDF for Patient
          </button>
        </div>
      </div>
    </div>
  );
};

// Component to display EducationCondition
const EducationConditionView: React.FC<{ 
  condition: EducationCondition; 
  onBack: () => void; 
  onDownload: () => void;
}> = ({ condition, onBack, onDownload }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-white/80">{condition.category}</span>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/80">ICD: {condition.icdCode}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{condition.name}</h1>
              <p className="mt-2 text-white/90 max-w-2xl">{condition.description}</p>
            </div>
          </div>
          
          {/* Download Button */}
          <div className="mt-4">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Download className="h-5 w-5" />
              Download Patient Education PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Overview Section */}
        {condition.overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Overview
            </h2>
            
            {condition.overview.definition && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">What is it?</h3>
                <p className="text-gray-700">{condition.overview.definition}</p>
              </div>
            )}

            {condition.overview.causes && condition.overview.causes.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Causes</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {condition.overview.causes.map((cause, index) => (
                    <li key={index}>{cause}</li>
                  ))}
                </ul>
              </div>
            )}

            {condition.overview.symptoms && condition.overview.symptoms.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Symptoms</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {condition.overview.symptoms.map((symptom, index) => (
                    <li key={index}>{symptom}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Treatment Phases */}
        {condition.treatmentPhases && condition.treatmentPhases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Treatment Phases
            </h2>
            <div className="space-y-4">
              {condition.treatmentPhases.map((phase, index) => (
                <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                      Phase {phase.phase}
                    </span>
                    <span className="text-sm text-gray-500">{phase.duration}</span>
                  </div>
                  <h3 className="font-medium text-gray-900">{phase.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                  
                  {phase.goals && phase.goals.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-500">Goals:</span>
                      <ul className="mt-1 space-y-1">
                        {phase.goals.map((goal, gIndex) => (
                          <li key={gIndex} className="text-sm text-gray-700 flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Expected Outcomes */}
        {condition.expectedOutcomes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Expected Outcomes
            </h2>
            
            {condition.expectedOutcomes.shortTerm && condition.expectedOutcomes.shortTerm.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Short-Term</h3>
                <div className="space-y-2">
                  {condition.expectedOutcomes.shortTerm.map((outcome, index) => (
                    <div key={index} className="bg-purple-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-purple-800">{outcome.timeframe}</div>
                      <p className="text-gray-700">{outcome.expectation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {condition.expectedOutcomes.longTerm && condition.expectedOutcomes.longTerm.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Long-Term</h3>
                <div className="space-y-2">
                  {condition.expectedOutcomes.longTerm.map((outcome, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-800">{outcome.timeframe}</div>
                      <p className="text-gray-700">{outcome.expectation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Warning Signs */}
        {condition.warningSigns && condition.warningSigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-red-50 border border-red-200 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Warning Signs - Seek Medical Help
            </h2>
            <ul className="space-y-2">
              {condition.warningSigns.map((sign, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800">{sign}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Emergency Signs */}
        {condition.emergencySigns && condition.emergencySigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-red-100 border-2 border-red-400 rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-700" />
              EMERGENCY - Call for Help Immediately
            </h2>
            <ul className="space-y-2">
              {condition.emergencySigns.map((sign, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
                  <span className="text-red-900 font-medium">{sign}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Compliance Requirements */}
        {condition.complianceRequirements && condition.complianceRequirements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              Important Instructions to Follow
            </h2>
            <div className="space-y-3">
              {condition.complianceRequirements.map((req, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  req.importance === 'critical' ? 'bg-red-50 border border-red-200' :
                  req.importance === 'important' ? 'bg-amber-50 border border-amber-200' :
                  'bg-gray-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      req.importance === 'critical' ? 'bg-red-200 text-red-800' :
                      req.importance === 'important' ? 'bg-amber-200 text-amber-800' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {req.importance}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{req.requirement}</p>
                      {req.consequence && (
                        <p className="text-sm text-gray-600 mt-1">If not followed: {req.consequence}</p>
                      )}
                      {req.tips && req.tips.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {req.tips.map((tip, tIndex) => (
                            <li key={tIndex} className="text-sm text-gray-600 flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Back and Download Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Previous Page
          </button>
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientEducationDetailPage;
