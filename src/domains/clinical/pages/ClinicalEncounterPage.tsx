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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
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
    formState: { errors },
  } = useForm<EncounterFormData>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      type: 'outpatient',
    },
  });

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
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Stethoscope className="w-7 h-7 text-sky-500" />
              Clinical Encounter
            </h1>
            <p className="text-gray-600 mt-1">
              Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
          </div>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="md:col-span-2">
                <label className="label">Chief Complaint *</label>
                <textarea
                  {...register('chiefComplaint')}
                  rows={2}
                  className={`input ${errors.chiefComplaint ? 'input-error' : ''}`}
                  placeholder="What brings the patient in today?"
                />
                {errors.chiefComplaint && (
                  <p className="text-sm text-red-500 mt-1">{errors.chiefComplaint.message}</p>
                )}
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
              <div>
                <label className="label">History of Present Illness</label>
                <textarea
                  {...register('historyOfPresentIllness')}
                  rows={4}
                  className="input"
                  placeholder="Describe the onset, duration, character, and progression of symptoms..."
                />
              </div>
              <div>
                <label className="label">Past Medical History</label>
                <textarea
                  {...register('pastMedicalHistory')}
                  rows={3}
                  className="input"
                  placeholder="Previous medical conditions, hospitalizations, chronic diseases..."
                />
              </div>
              <div>
                <label className="label">Past Surgical History</label>
                <textarea
                  {...register('pastSurgicalHistory')}
                  rows={2}
                  className="input"
                  placeholder="Previous surgeries with dates and outcomes..."
                />
              </div>
              <div>
                <label className="label">Family History</label>
                <textarea
                  {...register('familyHistory')}
                  rows={2}
                  className="input"
                  placeholder="Relevant family medical history..."
                />
              </div>
              <div>
                <label className="label">Social History</label>
                <textarea
                  {...register('socialHistory')}
                  rows={2}
                  className="input"
                  placeholder="Smoking, alcohol, occupation, living situation..."
                />
              </div>
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
            <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">General Appearance</label>
                <textarea
                  value={physicalExam.generalAppearance || ''}
                  onChange={(e) => updatePhysicalExam('generalAppearance', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Alert, oriented, well-nourished..."
                />
              </div>
              <div>
                <label className="label">Head/HEENT</label>
                <textarea
                  value={physicalExam.head || ''}
                  onChange={(e) => updatePhysicalExam('head', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Normocephalic, atraumatic..."
                />
              </div>
              <div>
                <label className="label">Neck</label>
                <textarea
                  value={physicalExam.neck || ''}
                  onChange={(e) => updatePhysicalExam('neck', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Supple, no lymphadenopathy..."
                />
              </div>
              <div>
                <label className="label">Chest/Respiratory</label>
                <textarea
                  value={physicalExam.chest || ''}
                  onChange={(e) => updatePhysicalExam('chest', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Clear to auscultation bilaterally..."
                />
              </div>
              <div>
                <label className="label">Cardiovascular</label>
                <textarea
                  value={physicalExam.cardiovascular || ''}
                  onChange={(e) => updatePhysicalExam('cardiovascular', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Regular rate and rhythm, no murmurs..."
                />
              </div>
              <div>
                <label className="label">Abdomen</label>
                <textarea
                  value={physicalExam.abdomen || ''}
                  onChange={(e) => updatePhysicalExam('abdomen', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Soft, non-tender, no masses..."
                />
              </div>
              <div>
                <label className="label">Musculoskeletal</label>
                <textarea
                  value={physicalExam.musculoskeletal || ''}
                  onChange={(e) => updatePhysicalExam('musculoskeletal', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Full range of motion, no deformities..."
                />
              </div>
              <div>
                <label className="label">Neurological</label>
                <textarea
                  value={physicalExam.neurological || ''}
                  onChange={(e) => updatePhysicalExam('neurological', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Alert, oriented x3, cranial nerves intact..."
                />
              </div>
              <div>
                <label className="label">Skin</label>
                <textarea
                  value={physicalExam.skin || ''}
                  onChange={(e) => updatePhysicalExam('skin', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Warm, dry, no rashes or lesions..."
                />
              </div>
              <div>
                <label className="label">Additional Findings</label>
                <textarea
                  value={physicalExam.additionalFindings || ''}
                  onChange={(e) => updatePhysicalExam('additionalFindings', e.target.value)}
                  rows={2}
                  className="input"
                  placeholder="Any other relevant findings..."
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
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
                <div>
                  <label className="label">Treatment Plan</label>
                  <textarea
                    {...register('treatmentPlan')}
                    rows={4}
                    className="input"
                    placeholder="Medications, procedures, referrals, follow-up instructions..."
                  />
                </div>
                <div>
                  <label className="label">Additional Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input"
                    placeholder="Any additional clinical notes..."
                  />
                </div>
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
