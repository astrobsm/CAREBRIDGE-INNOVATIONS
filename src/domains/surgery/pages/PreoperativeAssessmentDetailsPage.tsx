/**
 * Preoperative Assessment Details Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * View detailed preoperative assessment information for a patient
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Heart,
  Wind,
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Printer,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../../database';
import {
  asaClassifications,
  rcriFactors,
} from '../../../services/preoperativeService';

export default function PreoperativeAssessmentDetailsPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  // Fetch assessment
  const assessment = useLiveQuery(
    () => assessmentId ? db.preoperativeAssessments.get(assessmentId) : undefined,
    [assessmentId]
  );

  // Fetch patient
  const patient = useLiveQuery(
    () => assessment?.patientId ? db.patients.get(assessment.patientId) : undefined,
    [assessment?.patientId]
  );

  // Fetch assessor info
  const assessor = useLiveQuery(
    () => assessment?.assessedBy ? db.users.get(assessment.assessedBy) : undefined,
    [assessment?.assessedBy]
  );

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Loading assessment...</p>
        </div>
      </div>
    );
  }

  const getASADescription = (asaClass: number) => {
    const asa = asaClassifications.find(a => a.class === asaClass);
    return asa?.description || 'Unknown';
  };

  const getPredictedDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'anticipated_difficult': return 'text-red-600';
      case 'potentially_difficult': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getPredictedDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'anticipated_difficult': return 'ANTICIPATED DIFFICULT';
      case 'potentially_difficult': return 'POTENTIALLY DIFFICULT';
      default: return 'EASY';
    }
  };

  const getRiskCategoryColor = (category: string) => {
    switch (category) {
      case 'high':
      case 'very_high': return 'text-red-600';
      case 'moderate': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preoperative Assessment</h1>
            <p className="text-gray-500">
              {patient ? `${patient.firstName} ${patient.lastName}` : assessment.patientName || 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-sm flex items-center gap-2" title="Print assessment">
            <Printer size={16} />
            Print
          </button>
          <button className="btn btn-outline btn-sm flex items-center gap-2" title="Export as PDF">
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              assessment.clearanceStatus === 'cleared' ? 'bg-green-100' :
              assessment.clearanceStatus === 'deferred' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {assessment.clearanceStatus === 'cleared' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : assessment.clearanceStatus === 'deferred' ? (
                <XCircle className="w-8 h-8 text-red-600" />
              ) : (
                <Clock className="w-8 h-8 text-yellow-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {assessment.clearanceStatus === 'cleared' ? 'Cleared for Surgery' :
                 assessment.clearanceStatus === 'deferred' ? 'Deferred' : 'Pending Review'}
              </h3>
              <p className="text-gray-500">
                Assessed on {format(new Date(assessment.createdAt), 'MMMM d, yyyy')}
                {assessor && ` by ${assessor.firstName} ${assessor.lastName}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-bold text-lg">
              ASA {assessment.asaClass}{assessment.asaEmergency ? 'E' : ''}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Patient and Surgery Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="text-blue-500" size={20} />
            Patient Information
          </h3>
          {patient ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{patient.firstName} {patient.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hospital Number:</span>
                <span className="font-medium">{patient.hospitalNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gender:</span>
                <span className="font-medium capitalize">{patient.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date of Birth:</span>
                <span className="font-medium">
                  {format(new Date(patient.dateOfBirth), 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Blood Group:</span>
                <span className="font-medium">{patient.bloodGroup || 'Not recorded'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{assessment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hospital Number:</span>
                <span className="font-medium">{assessment.hospitalNumber}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Surgery Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="text-purple-500" size={20} />
            Surgery Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Procedure:</span>
              <span className="font-medium">{assessment.surgeryName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium capitalize">{assessment.surgeryType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled Date:</span>
              <span className="font-medium">
                {format(new Date(assessment.scheduledDate), 'MMMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ASA Classification:</span>
              <span className="font-medium">
                Class {assessment.asaClass} - {getASADescription(assessment.asaClass)}
              </span>
            </div>
            {assessment.asaEmergency && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Emergency Surgery
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Clinical Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Airway Assessment */}
        {assessment.airwayAssessment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wind className="text-cyan-500" size={20} />
              Airway Assessment
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Mallampati Score:</span>
                <span className="font-medium">Class {assessment.airwayAssessment.mallampatiScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mouth Opening:</span>
                <span className="font-medium">{assessment.airwayAssessment.mouthOpening} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Thyromental Distance:</span>
                <span className="font-medium">{assessment.airwayAssessment.thyromentalDistance} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Neck Mobility:</span>
                <span className="font-medium capitalize">{assessment.airwayAssessment.neckMobility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Predicted Difficulty:</span>
                <span className={`font-medium ${getPredictedDifficultyColor(assessment.airwayAssessment.predictedDifficulty)}`}>
                  {getPredictedDifficultyLabel(assessment.airwayAssessment.predictedDifficulty)}
                </span>
              </div>
              {assessment.airwayAssessment.previousDifficultIntubation && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                  <p className="text-red-700 font-medium flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Previous Difficult Intubation
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Cardiac Risk Assessment */}
        {assessment.cardiacRisk && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Heart className="text-red-500" size={20} />
              Cardiac Risk Assessment (RCRI)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">RCRI Score:</span>
                <span className="font-medium">{assessment.cardiacRisk.rcriScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Functional Capacity:</span>
                <span className="font-medium">{assessment.cardiacRisk.functionalCapacity} METs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Level:</span>
                <span className="font-medium">
                  {assessment.cardiacRisk.rcriRisk || 'Not assessed'}
                </span>
              </div>
              {assessment.cardiacRisk.selectedFactors && assessment.cardiacRisk.selectedFactors.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-500 mb-2">Selected Risk Factors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {assessment.cardiacRisk.selectedFactors.map((factor: string, idx: number) => {
                      const factorInfo = rcriFactors.find(f => f.factor === factor);
                      return (
                        <li key={idx} className="text-gray-700">{factorInfo?.factor || factor}</li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VTE Risk */}
        {assessment.vteRisk && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              VTE Risk Assessment (Caprini Score)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Caprini Score:</span>
                <span className="font-medium">{assessment.vteRisk.capriniScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Risk Category:</span>
                <span className={`font-medium ${getRiskCategoryColor(assessment.vteRisk.riskCategory)}`}>
                  {assessment.vteRisk.riskCategory?.replace('_', ' ').toUpperCase() || 'Not assessed'}
                </span>
              </div>
              {assessment.vteRisk.prophylaxisRecommendation && (
                <div className="mt-3">
                  <p className="text-gray-500 mb-2">Recommended Prophylaxis:</p>
                  <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">{assessment.vteRisk.prophylaxisRecommendation}</p>
                </div>
              )}
              {assessment.vteRisk.selectedFactors && assessment.vteRisk.selectedFactors.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-500 mb-2">Selected Factors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {assessment.vteRisk.selectedFactors.map((factor: string, idx: number) => (
                      <li key={idx} className="text-gray-700">{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Bleeding Risk */}
        {assessment.bleedingRisk && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="text-red-500" size={20} />
              Bleeding Risk Assessment
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">On Anticoagulant:</span>
                <span className="font-medium">{assessment.bleedingRisk.onAnticoagulant ? 'Yes' : 'No'}</span>
              </div>
              {assessment.bleedingRisk.onAnticoagulant && assessment.bleedingRisk.anticoagulantType && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Anticoagulant Type:</span>
                  <span className="font-medium">{assessment.bleedingRisk.anticoagulantType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Bleeding History:</span>
                <span className="font-medium">{assessment.bleedingRisk.bleedingHistory ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Clearance Notes */}
      {assessment.clearanceNotes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="text-gray-500" size={20} />
            Clearance Notes
          </h3>
          <p className="text-gray-700">{assessment.clearanceNotes}</p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/patients/${assessment.patientId}/clinical-summary`}
          className="btn btn-outline flex items-center gap-2"
        >
          <FileText size={16} />
          View Patient Record
        </Link>
        <Link
          to={`/surgery/preoperative`}
          className="btn btn-outline flex items-center gap-2"
        >
          <Edit size={16} />
          Back to Assessments
        </Link>
      </div>
    </div>
  );
}
