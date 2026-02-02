import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Stethoscope,
  ClipboardList,
  FileText,
  Activity,
  Plus,
  Trash2,
  CheckCircle,
  UserCheck,
  FlaskConical,
  Pill,
  Scissors,
  Download,
  Printer,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation, ExportOptionsModal } from '../../../components/common';
import { createSimpleThermalPDF } from '../../../utils/thermalPdfGenerator';
import type { ClinicalEncounter, Diagnosis, EncounterType, PhysicalExamination, Investigation, Prescription } from '../../../types';

const encounterSchema = z.object({
  type: z.enum(['outpatient', 'inpatient', 'emergency', 'surgical', 'follow_up', 'home_visit']),
  chiefComplaint: z.string().min(5, 'Chief complaint is required'),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  pastSurgicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
});

type EncounterFormData = z.infer<typeof encounterSchema>;

const encounterTypes: { value: EncounterType; label: string }[] = [
  { value: 'outpatient', label: 'Outpatient Visit' },
  { value: 'inpatient', label: 'Inpatient Admission' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'surgical', label: 'Surgical Consultation' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'home_visit', label: 'Home Visit' },
];

export default function ClinicalEncounterPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'examination' | 'diagnosis'>('history');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState<{ description: string; type: 'primary' | 'secondary' | 'differential' }>({ description: '', type: 'primary' });
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamination>({});
  
  // Post-submission state for showing export options
  const [showPostSubmitModal, setShowPostSubmitModal] = useState(false);
  const [savedEncounter, setSavedEncounter] = useState<ClinicalEncounter | null>(null);
  const [showInvestigationExport, setShowInvestigationExport] = useState(false);
  const [showPrescriptionExport, setShowPrescriptionExport] = useState(false);
  const [patientInvestigations, setPatientInvestigations] = useState<Investigation[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const latestVitals = useLiveQuery(
    async () => {
      if (!patientId) return undefined;
      const allVitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
      // Sort by recordedAt descending (newest first) and get first
      allVitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      return allVitals[0];
    },
    [patientId]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EncounterFormData>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      type: 'outpatient',
    },
  });

  // Watch form values for VoiceDictation
  const chiefComplaint = watch('chiefComplaint') || '';
  const historyOfPresentIllness = watch('historyOfPresentIllness') || '';
  const pastMedicalHistory = watch('pastMedicalHistory') || '';
  const pastSurgicalHistory = watch('pastSurgicalHistory') || '';
  const familyHistory = watch('familyHistory') || '';
  const socialHistory = watch('socialHistory') || '';
  const treatmentPlan = watch('treatmentPlan') || '';
  const notes = watch('notes') || '';

  const addDiagnosis = () => {
    if (newDiagnosis.description.trim()) {
      setDiagnoses([
        ...diagnoses,
        {
          id: uuidv4(),
          description: newDiagnosis.description,
          type: newDiagnosis.type,
          status: 'suspected',
        },
      ]);
      setNewDiagnosis({ description: '', type: 'primary' });
    }
  };

  const removeDiagnosis = (id: string) => {
    setDiagnoses(diagnoses.filter((d) => d.id !== id));
  };

  const updatePhysicalExam = (field: keyof PhysicalExamination, value: string) => {
    setPhysicalExam({ ...physicalExam, [field]: value });
  };

  const onSubmit = async (data: EncounterFormData) => {
    if (!patientId || !user) return;
    setIsLoading(true);

    try {
      const encounter: ClinicalEncounter = {
        id: uuidv4(),
        patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        type: data.type,
        status: 'completed',
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        pastMedicalHistory: data.pastMedicalHistory,
        pastSurgicalHistory: data.pastSurgicalHistory,
        familyHistory: data.familyHistory,
        socialHistory: data.socialHistory,
        physicalExamination: physicalExam,
        diagnosis: diagnoses,
        treatmentPlan: data.treatmentPlan,
        notes: data.notes,
        attendingClinician: user.id,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.clinicalEncounters.add(encounter);
      await syncRecord('clinicalEncounters', encounter as unknown as Record<string, unknown>);
      
      // Fetch recent investigations and prescriptions for this patient
      const recentInvestigations = await db.investigations
        .where('patientId')
        .equals(patientId)
        .filter(inv => inv.status === 'requested')
        .toArray();
      
      const recentPrescriptions = await db.prescriptions
        .where('patientId')
        .equals(patientId)
        .filter(rx => rx.status === 'pending')
        .toArray();
      
      setPatientInvestigations(recentInvestigations);
      setPatientPrescriptions(recentPrescriptions);
      setSavedEncounter(encounter);
      setShowPostSubmitModal(true);
      
      toast.success('Clinical encounter saved successfully!');
    } catch (error) {
      console.error('Error saving encounter:', error);
      toast.error('Failed to save encounter');
    } finally {
      setIsLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading patient...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Patient
        </button>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Stethoscope className="w-7 h-7 text-sky-500" />
              Clinical Encounter
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(`/patients/${patientId}/clinical-summary`)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <UserCheck size={18} />
              Patient Summary
            </button>
          </div>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/investigations"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <FlaskConical size={16} />
            Investigations
          </Link>
          <Link
            to="/pharmacy"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <Pill size={16} />
            Pharmacy / Prescriptions
          </Link>
          <Link
            to={`/patients/${patientId}/wounds`}
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <Scissors size={16} />
            Wound Assessment
          </Link>
        </div>
      </div>

      {/* Latest Vitals Summary */}
      {latestVitals && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="card-header flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Latest Vitals</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.temperature}°C</p>
                <p className="text-xs text-gray-500">Temperature</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.pulse}</p>
                <p className="text-xs text-gray-500">Pulse (bpm)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}</p>
                <p className="text-xs text-gray-500">BP (mmHg)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.respiratoryRate}</p>
                <p className="text-xs text-gray-500">RR (breaths/min)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.oxygenSaturation}%</p>
                <p className="text-xs text-gray-500">SpO2</p>
              </div>
              {latestVitals.painScore !== undefined && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{latestVitals.painScore}/10</p>
                  <p className="text-xs text-gray-500">Pain Score</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Encounter Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Encounter Details</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Encounter Type *</label>
                <select {...register('type')} className="input">
                  {encounterTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <VoiceDictation
                  label="Chief Complaint *"
                  value={chiefComplaint}
                  onChange={(value) => setValue('chiefComplaint', value)}
                  placeholder="What brings the patient in today?"
                  rows={2}
                  medicalContext="clinical_notes"
                  showAIEnhance={true}
                  required={true}
                  error={errors.chiefComplaint?.message}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('examination')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'examination'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Physical Examination
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnosis')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'diagnosis'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Diagnosis & Plan
          </button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Clinical History</h2>
            </div>
            <div className="card-body space-y-4">
              <VoiceDictation
                label="History of Present Illness"
                value={historyOfPresentIllness}
                onChange={(value) => setValue('historyOfPresentIllness', value)}
                placeholder="Describe the onset, duration, character, and progression of symptoms..."
                rows={4}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Past Medical History"
                value={pastMedicalHistory}
                onChange={(value) => setValue('pastMedicalHistory', value)}
                placeholder="Previous medical conditions, hospitalizations, chronic diseases..."
                rows={3}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Past Surgical History"
                value={pastSurgicalHistory}
                onChange={(value) => setValue('pastSurgicalHistory', value)}
                placeholder="Previous surgeries with dates and outcomes..."
                rows={2}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Family History"
                value={familyHistory}
                onChange={(value) => setValue('familyHistory', value)}
                placeholder="Relevant family medical history..."
                rows={2}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Social History"
                value={socialHistory}
                onChange={(value) => setValue('socialHistory', value)}
                placeholder="Smoking, alcohol, occupation, living situation..."
                rows={2}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
            </div>
          </motion.div>
        )}

        {/* Physical Examination Tab */}
        {activeTab === 'examination' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Physical Examination</h2>
            </div>
            <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
              <VoiceDictation
                label="General Appearance"
                value={physicalExam.generalAppearance || ''}
                onChange={(value) => updatePhysicalExam('generalAppearance', value)}
                placeholder="Alert, oriented, well-nourished..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Head/HEENT"
                value={physicalExam.head || ''}
                onChange={(value) => updatePhysicalExam('head', value)}
                placeholder="Normocephalic, atraumatic..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Neck"
                value={physicalExam.neck || ''}
                onChange={(value) => updatePhysicalExam('neck', value)}
                placeholder="Supple, no lymphadenopathy..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Chest/Respiratory"
                value={physicalExam.chest || ''}
                onChange={(value) => updatePhysicalExam('chest', value)}
                placeholder="Clear to auscultation bilaterally..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Cardiovascular"
                value={physicalExam.cardiovascular || ''}
                onChange={(value) => updatePhysicalExam('cardiovascular', value)}
                placeholder="Regular rate and rhythm, no murmurs..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Abdomen"
                value={physicalExam.abdomen || ''}
                onChange={(value) => updatePhysicalExam('abdomen', value)}
                placeholder="Soft, non-tender, no masses..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Musculoskeletal"
                value={physicalExam.musculoskeletal || ''}
                onChange={(value) => updatePhysicalExam('musculoskeletal', value)}
                placeholder="Full range of motion, no deformities..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Neurological"
                value={physicalExam.neurological || ''}
                onChange={(value) => updatePhysicalExam('neurological', value)}
                placeholder="Alert, oriented x3, cranial nerves intact..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Skin"
                value={physicalExam.skin || ''}
                onChange={(value) => updatePhysicalExam('skin', value)}
                placeholder="Warm, dry, no rashes or lesions..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Additional Findings"
                value={physicalExam.additionalFindings || ''}
                onChange={(value) => updatePhysicalExam('additionalFindings', value)}
                placeholder="Any other relevant findings..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
            </div>
          </motion.div>
        )}

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Diagnoses */}
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900">Diagnoses</h2>
              </div>
              <div className="card-body space-y-4">
                {/* Add Diagnosis */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDiagnosis.description}
                    onChange={(e) => setNewDiagnosis({ ...newDiagnosis, description: e.target.value })}
                    placeholder="Enter diagnosis..."
                    className="input flex-1"
                  />
                  <select
                    value={newDiagnosis.type}
                    onChange={(e) => setNewDiagnosis({ ...newDiagnosis, type: e.target.value as 'primary' | 'secondary' | 'differential' })}
                    className="input w-auto"
                    title="Select diagnosis type"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="differential">Differential</option>
                  </select>
                  <button
                    type="button"
                    onClick={addDiagnosis}
                    className="btn btn-primary"
                    title="Add diagnosis"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Diagnosis List */}
                {diagnoses.length > 0 ? (
                  <div className="space-y-2">
                    {diagnoses.map((diagnosis) => (
                      <div
                        key={diagnosis.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <div>
                            <p className="font-medium text-gray-900">{diagnosis.description}</p>
                            <span className={`badge ${
                              diagnosis.type === 'primary' ? 'badge-primary' :
                              diagnosis.type === 'secondary' ? 'badge-secondary' : 'badge-warning'
                            }`}>
                              {diagnosis.type}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDiagnosis(diagnosis.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove diagnosis"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No diagnoses added yet</p>
                )}
              </div>
            </div>

            {/* Treatment Plan */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <FileText className="w-5 h-5 text-sky-500" />
                <h2 className="font-semibold text-gray-900">Treatment Plan</h2>
              </div>
              <div className="card-body space-y-4">
                <VoiceDictation
                  label="Treatment Plan"
                  value={treatmentPlan}
                  onChange={(value) => setValue('treatmentPlan', value)}
                  placeholder="Medications, procedures, referrals, follow-up instructions..."
                  rows={4}
                  medicalContext="treatment_plan"
                  showAIEnhance={true}
                />
                <VoiceDictation
                  label="Additional Notes"
                  value={notes}
                  onChange={(value) => setValue('notes', value)}
                  placeholder="Any additional clinical notes..."
                  rows={3}
                  medicalContext="clinical_notes"
                  showAIEnhance={true}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}`)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Encounter
              </>
            )}
          </button>
        </div>
      </form>

      {/* Post-Submission Modal */}
      <AnimatePresence>
        {showPostSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  Encounter Saved!
                </h3>
                <button
                  onClick={() => {
                    setShowPostSubmitModal(false);
                    navigate(`/patients/${patientId}`);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                The clinical encounter has been saved successfully. What would you like to do next?
              </p>

              <div className="space-y-3">
                {/* Investigations Section */}
                {patientInvestigations.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">
                          {patientInvestigations.length} Pending Investigation{patientInvestigations.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowInvestigationExport(true)}
                        className="btn btn-sm btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      <Link
                        to="/investigations"
                        className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <FlaskConical size={14} />
                        Go to Lab
                      </Link>
                    </div>
                  </div>
                )}

                {/* Prescriptions Section */}
                {patientPrescriptions.length > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium text-emerald-900">
                          {patientPrescriptions.length} Pending Prescription{patientPrescriptions.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowPrescriptionExport(true)}
                        className="btn btn-sm btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      <Link
                        to="/pharmacy"
                        className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <Pill size={14} />
                        Go to Pharmacy
                      </Link>
                    </div>
                  </div>
                )}

                {/* Wound Assessment Link */}
                <Link
                  to={`/patients/${patientId}/wounds`}
                  className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Scissors className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="font-medium text-amber-900">Wound Assessment</span>
                    <p className="text-sm text-amber-700">If patient has wounds, click here to document</p>
                  </div>
                </Link>

                {/* Done Button */}
                <button
                  onClick={() => {
                    setShowPostSubmitModal(false);
                    navigate(`/patients/${patientId}`);
                  }}
                  className="btn btn-primary w-full mt-4"
                >
                  Done - Back to Patient
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Investigation Export Modal */}
      {showInvestigationExport && patientInvestigations.length > 0 && (
        <ExportOptionsModal
          isOpen={showInvestigationExport}
          onClose={() => setShowInvestigationExport(false)}
          title="Export Investigation Requests"
          generateA4PDF={() => {
            const doc = new jsPDF('p', 'mm', 'a4');
            let y = 20;
            
            doc.setFont('times', 'bold');
            doc.setFontSize(18);
            doc.text('INVESTIGATION REQUESTS', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.text(`Patient: ${patient?.firstName} ${patient?.lastName}`, 20, y);
            y += 7;
            doc.text(`Hospital No: ${patient?.hospitalNumber}`, 20, y);
            y += 7;
            doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, y);
            y += 12;
            
            doc.setLineWidth(0.5);
            doc.line(20, y, 190, y);
            y += 10;
            
            patientInvestigations.forEach((inv, idx) => {
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
              doc.setFont('times', 'bold');
              doc.text(`${idx + 1}. ${inv.typeName || inv.type}`, 20, y);
              y += 6;
              doc.setFont('times', 'normal');
              doc.text(`   Category: ${inv.category}`, 20, y);
              y += 6;
              doc.text(`   Priority: ${inv.priority.toUpperCase()}`, 20, y);
              y += 6;
              if (inv.clinicalDetails) {
                doc.text(`   Details: ${inv.clinicalDetails}`, 20, y);
                y += 6;
              }
              y += 4;
            });
            
            return doc;
          }}
          generateThermalPDF={() => {
            return createSimpleThermalPDF({
              title: 'INVESTIGATION REQUESTS',
              patientName: `${patient?.firstName} ${patient?.lastName}`,
              patientId: patient?.hospitalNumber,
              date: new Date(),
              items: patientInvestigations.map(inv => ({
                label: inv.typeName || inv.type,
                value: `${inv.category} - ${inv.priority.toUpperCase()}`
              })),
            });
          }}
          fileNamePrefix={`investigations_${patient?.hospitalNumber || 'patient'}`}
        />
      )}

      {/* Prescription Export Modal */}
      {showPrescriptionExport && patientPrescriptions.length > 0 && (
        <ExportOptionsModal
          isOpen={showPrescriptionExport}
          onClose={() => setShowPrescriptionExport(false)}
          title="Export Prescriptions"
          generateA4PDF={() => {
            const doc = new jsPDF('p', 'mm', 'a4');
            let y = 20;
            
            doc.setFont('times', 'bold');
            doc.setFontSize(18);
            doc.text('PRESCRIPTIONS', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.text(`Patient: ${patient?.firstName} ${patient?.lastName}`, 20, y);
            y += 7;
            doc.text(`Hospital No: ${patient?.hospitalNumber}`, 20, y);
            y += 7;
            doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, y);
            y += 12;
            
            doc.setLineWidth(0.5);
            doc.line(20, y, 190, y);
            y += 10;
            
            patientPrescriptions.forEach((rx) => {
              rx.medications?.forEach((med, idx) => {
                if (y > 270) {
                  doc.addPage();
                  y = 20;
                }
                doc.setFont('times', 'bold');
                doc.text(`${idx + 1}. ${med.name}`, 20, y);
                y += 6;
                doc.setFont('times', 'normal');
                doc.text(`   Dose: ${med.dose} ${med.unit}`, 20, y);
                y += 6;
                doc.text(`   Frequency: ${med.frequency}`, 20, y);
                y += 6;
                doc.text(`   Duration: ${med.duration}`, 20, y);
                y += 6;
                if (med.instructions) {
                  doc.text(`   Instructions: ${med.instructions}`, 20, y);
                  y += 6;
                }
                y += 4;
              });
            });
            
            return doc;
          }}
          generateThermalPDF={() => {
            const allMeds = patientPrescriptions.flatMap(rx => rx.medications || []);
            return createSimpleThermalPDF({
              title: 'PRESCRIPTIONS',
              patientName: `${patient?.firstName} ${patient?.lastName}`,
              patientId: patient?.hospitalNumber,
              date: new Date(),
              items: allMeds.map(med => ({
                label: med.name,
                value: `${med.dose} ${med.unit} - ${med.frequency}`
              })),
            });
          }}
          fileNamePrefix={`prescriptions_${patient?.hospitalNumber || 'patient'}`}
        />
      )}
    </div>
  );
}

