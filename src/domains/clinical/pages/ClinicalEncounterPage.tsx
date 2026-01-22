import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import type { ClinicalEncounter, Diagnosis, EncounterType, PhysicalExamination } from '../../../types';

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

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const latestVitals = useLiveQuery(
    () => patientId
      ? db.vitalSigns.where('patientId').equals(patientId).reverse().first()
      : undefined,
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
      toast.success('Clinical encounter saved successfully!');
      navigate(`/patients/${patientId}`);
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
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}/clinical-summary`)}
            className="btn btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <UserCheck size={18} />
            Patient Summary
          </button>
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
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="differential">Differential</option>
                  </select>
                  <button
                    type="button"
                    onClick={addDiagnosis}
                    className="btn btn-primary"
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
    </div>
  );
}
