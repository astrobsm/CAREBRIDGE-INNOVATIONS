import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Footprints,
  AlertTriangle,
  User,
  Calendar,
  Heart,
  Stethoscope,
  Eye,
  Trash2,
  Target,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
// Auth context available if needed
import { format } from 'date-fns';
import type { LimbSalvageAssessment } from '../../../types';
import LimbSalvageForm from '../components/LimbSalvageForm';

export default function LimbSalvagePage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<LimbSalvageAssessment | undefined>();
  const [viewAssessment, setViewAssessment] = useState<LimbSalvageAssessment | null>(null);

  // Fetch patients
  const patients = useLiveQuery(
    () => db.patients.filter(p => p.isActive === true).toArray(),
    []
  );

  // Fetch all limb salvage assessments
  const assessments = useLiveQuery(
    () => db.limbSalvageAssessments.reverse().sortBy('createdAt'),
    []
  );

  // Get risk color
  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'very_high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get patient name
  const getPatientName = (patientId: string) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown';
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this assessment?')) {
      try {
        await db.limbSalvageAssessments.delete(id);
        toast.success('Assessment deleted');
      } catch (error) {
        toast.error('Failed to delete assessment');
      }
    }
  };

  // Handle edit
  const handleEdit = (assessment: LimbSalvageAssessment) => {
    setSelectedAssessment(assessment);
    setShowForm(true);
  };

  // Stats
  const totalAssessments = assessments?.length || 0;
  const lowRisk = assessments?.filter(a => a.limbSalvageScore?.riskCategory === 'low').length || 0;
  const moderateRisk = assessments?.filter(a => a.limbSalvageScore?.riskCategory === 'moderate').length || 0;
  const highRisk = assessments?.filter(a => a.limbSalvageScore?.riskCategory === 'high').length || 0;
  const veryHighRisk = assessments?.filter(a => a.limbSalvageScore?.riskCategory === 'very_high').length || 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Footprints className="h-7 w-7 text-blue-600" />
            Diabetic Foot - Limb Salvage Module
          </h1>
          <p className="page-subtitle">
            Comprehensive scoring and decision support for diabetic foot management
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedAssessment(undefined);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto justify-center"
        >
          <Plus className="h-5 w-5" />
          New Assessment
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{totalAssessments}</p>
            </div>
            <Stethoscope className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Risk</p>
              <p className="text-2xl font-bold text-green-600">{lowRisk}</p>
            </div>
            <Heart className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Moderate</p>
              <p className="text-2xl font-bold text-yellow-600">{moderateRisk}</p>
            </div>
            <Activity className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-orange-600">{highRisk}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Very High</p>
              <p className="text-2xl font-bold text-red-600">{veryHighRisk}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Assessments</h2>
        </div>
        
        {!assessments || assessments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Footprints className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No assessments yet. Click "New Assessment" to get started.</p>
          </div>
        ) : (
          <div className="divide-y">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{getPatientName(assessment.patientId)}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>Wagner Grade {assessment.wagnerGrade}</span>
                        <span>•</span>
                        <span className="capitalize">{assessment.affectedSide} foot</span>
                        <span>•</span>
                        <span>Score: {assessment.limbSalvageScore?.totalScore || 0}/{assessment.limbSalvageScore?.maxScore || 100}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(assessment.limbSalvageScore?.riskCategory)}`}>
                      {assessment.limbSalvageScore?.riskCategory?.replace('_', ' ').toUpperCase() || 'PENDING'}
                    </span>
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(assessment.assessmentDate), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewAssessment(assessment)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(assessment)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Target className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(assessment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                {assessment.recommendedManagement && (
                  <div className="mt-2 ml-16 flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">Management:</span> {assessment.recommendedManagement.replace('_', ' ')}
                    </span>
                    {assessment.recommendedAmputationLevel && assessment.recommendedAmputationLevel !== 'none' && (
                      <span className="text-sm text-orange-600">
                        <span className="font-medium">Level:</span> {assessment.recommendedAmputationLevel.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Form Modal */}
      {showForm && (
        <LimbSalvageForm
          onClose={() => {
            setShowForm(false);
            setSelectedAssessment(undefined);
          }}
          onSave={() => {}}
          existingAssessment={selectedAssessment}
        />
      )}

      {/* View Assessment Modal */}
      {viewAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Assessment Details</h2>
              <button
                onClick={() => setViewAssessment(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Patient Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Patient Information</h3>
                <p className="text-lg font-medium">{getPatientName(viewAssessment.patientId)}</p>
                <p className="text-sm text-gray-600">
                  {viewAssessment.patientAge} years • {viewAssessment.patientGender} • {viewAssessment.affectedSide} foot
                </p>
              </div>

              {/* Score Summary */}
              <div className={`rounded-lg p-4 border-2 ${
                viewAssessment.limbSalvageScore?.riskCategory === 'low' ? 'bg-green-50 border-green-300' :
                viewAssessment.limbSalvageScore?.riskCategory === 'moderate' ? 'bg-yellow-50 border-yellow-300' :
                viewAssessment.limbSalvageScore?.riskCategory === 'high' ? 'bg-orange-50 border-orange-300' :
                'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Limb Salvage Score</h3>
                    <p className="text-3xl font-bold">
                      {viewAssessment.limbSalvageScore?.totalScore}/{viewAssessment.limbSalvageScore?.maxScore}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-4 py-2 rounded-full text-lg font-bold ${getRiskColor(viewAssessment.limbSalvageScore?.riskCategory)}`}>
                      {viewAssessment.limbSalvageScore?.riskCategory?.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="mt-2 text-sm">
                      Salvage Probability: <strong>{viewAssessment.limbSalvageScore?.salvageProbability}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Classification Scores */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Wagner</p>
                  <p className="text-2xl font-bold">Grade {viewAssessment.wagnerGrade}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Texas</p>
                  <p className="text-2xl font-bold">
                    {viewAssessment.texasClassification?.grade}{viewAssessment.texasClassification?.stage}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">WIfI</p>
                  <p className="text-2xl font-bold">
                    W{viewAssessment.wifiClassification?.wound}I{viewAssessment.wifiClassification?.ischemia}fI{viewAssessment.wifiClassification?.footInfection}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">SINBAD</p>
                  <p className="text-2xl font-bold">{viewAssessment.sinbadScore?.total}/6</p>
                </div>
              </div>

              {/* Management Recommendation */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Management Recommendation</h4>
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-lg font-medium ${
                    viewAssessment.recommendedManagement === 'conservative' ? 'bg-green-100 text-green-800' :
                    viewAssessment.recommendedManagement === 'revascularization' ? 'bg-blue-100 text-blue-800' :
                    viewAssessment.recommendedManagement === 'minor_amputation' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {viewAssessment.recommendedManagement?.replace('_', ' ').toUpperCase()}
                  </span>
                  {viewAssessment.recommendedAmputationLevel && viewAssessment.recommendedAmputationLevel !== 'none' && (
                    <span className="px-4 py-2 rounded-lg font-medium bg-orange-100 text-orange-800">
                      {viewAssessment.recommendedAmputationLevel.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
