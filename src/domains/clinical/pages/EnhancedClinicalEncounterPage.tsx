/**
 * Enhanced Clinical Encounter Page
 * 
 * Differentiates between:
 * - First Encounter: Comprehensive assessment with full history
 * - Follow-up Encounter: Builds on previous encounters, focused assessment
 * 
 * Also includes:
 * - Age-appropriate dynamic form fields
 * - Pregnancy considerations
 * - GFR-based recommendations
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
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
  History,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Baby,
  Users,
  Heart,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import { usePatientContext } from '../../../hooks/usePatientContext';
import {
  PatientCategoryBadge,
  ClinicalConsiderations,
  VitalSignsReference,
  DynamicFormSection,
  PregnancyFields,
  PediatricFields,
  GeriatricFields,
} from '../../../components/common/DynamicFormComponents';
import type { 
  ClinicalEncounter, 
  Diagnosis, 
  EncounterType, 
  PhysicalExamination 
} from '../../../types';

// ============================================
// Schema Definitions
// ============================================

// First encounter schema - comprehensive
const firstEncounterSchema = z.object({
  type: z.enum(['outpatient', 'inpatient', 'emergency', 'surgical', 'follow_up', 'home_visit']),
  chiefComplaint: z.string().min(5, 'Chief complaint is required'),
  historyOfPresentIllness: z.string().min(10, 'History of present illness is required for first encounter'),
  pastMedicalHistory: z.string().optional(),
  pastSurgicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
  allergyHistory: z.string().optional(),
  medicationHistory: z.string().optional(),
  immunizationHistory: z.string().optional(),
  obstetricHistory: z.string().optional(),
  developmentalHistory: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
  // GFR-related
  creatinine: z.number().optional(),
  creatinineUnit: z.enum(['mg/dL', 'μmol/L']).optional(),
});

// Follow-up encounter schema - focused
const followUpSchema = z.object({
  type: z.enum(['outpatient', 'inpatient', 'emergency', 'surgical', 'follow_up', 'home_visit']),
  chiefComplaint: z.string().min(5, 'Chief complaint is required'),
  intervalHistory: z.string().min(5, 'Interval history since last visit is required'),
  complianceAssessment: z.string().optional(),
  treatmentResponse: z.string().optional(),
  newSymptoms: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
});

type FirstEncounterFormData = z.infer<typeof firstEncounterSchema>;
type FollowUpFormData = z.infer<typeof followUpSchema>;

const encounterTypes: { value: EncounterType; label: string }[] = [
  { value: 'outpatient', label: 'Outpatient Visit' },
  { value: 'inpatient', label: 'Inpatient Admission' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'surgical', label: 'Surgical Consultation' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'home_visit', label: 'Home Visit' },
];

// ============================================
// Previous Encounters Summary Component
// ============================================

interface PreviousEncountersSummaryProps {
  encounters: ClinicalEncounter[];
  onViewEncounter: (encounter: ClinicalEncounter) => void;
}

function PreviousEncountersSummary({ encounters, onViewEncounter }: PreviousEncountersSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (encounters.length === 0) return null;

  const sortedEncounters = [...encounters].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  const latestEncounter = sortedEncounters[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-6 border-l-4 border-l-blue-500"
    >
      <div 
        className="card-header flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Previous Encounters ({encounters.length})</h2>
            <p className="text-xs text-gray-500">
              Last visit: {new Date(latestEncounter.createdAt || '').toLocaleDateString()}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="card-body"
          >
            {/* Latest Encounter Summary */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-blue-800 mb-2">Latest Encounter Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Chief Complaint:</span>
                  <p className="text-gray-900">{latestEncounter.chiefComplaint}</p>
                </div>
                {latestEncounter.diagnosis && latestEncounter.diagnosis.length > 0 && (
                  <div>
                    <span className="text-gray-600">Diagnosis:</span>
                    <ul className="text-gray-900">
                      {latestEncounter.diagnosis.slice(0, 3).map((d, i) => (
                        <li key={i}>• {d.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {latestEncounter.treatmentPlan && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Treatment Plan:</span>
                    <p className="text-gray-900">{latestEncounter.treatmentPlan}</p>
                  </div>
                )}
              </div>
            </div>

            {/* List of all encounters */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sortedEncounters.map((enc) => (
                <button
                  key={enc.id}
                  onClick={() => onViewEncounter(enc)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {enc.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="text-sm text-gray-600">{enc.chiefComplaint}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(enc.createdAt || '').toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// First Encounter Form Component
// ============================================

interface FirstEncounterFormProps {
  patientId: string;
  patientContext: ReturnType<typeof usePatientContext>;
  onSubmit: (data: FirstEncounterFormData, diagnoses: Diagnosis[], physicalExam: PhysicalExamination) => void;
  isLoading: boolean;
}

function FirstEncounterForm({ patientId, patientContext, onSubmit, isLoading }: FirstEncounterFormProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'examination' | 'diagnosis'>('history');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState<{ description: string; type: 'primary' | 'secondary' | 'differential' }>({ description: '', type: 'primary' });
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamination>({});

  const { category, pregnancy } = patientContext;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FirstEncounterFormData>({
    resolver: zodResolver(firstEncounterSchema),
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
  const allergyHistory = watch('allergyHistory') || '';
  const medicationHistory = watch('medicationHistory') || '';
  const treatmentPlan = watch('treatmentPlan') || '';
  const notes = watch('notes') || '';
  const obstetricHistory = watch('obstetricHistory') || '';
  const developmentalHistory = watch('developmentalHistory') || '';
  const immunizationHistory = watch('immunizationHistory') || '';

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

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data, diagnoses, physicalExam))} className="space-y-6">
      {/* Encounter Type and Chief Complaint */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="card-header flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-sky-500" />
          <h2 className="font-semibold text-gray-900">First Encounter - Comprehensive Assessment</h2>
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

      {/* Tabs for History, Examination, Diagnosis */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Complete History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('examination')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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
          className="space-y-6"
        >
          {/* Present Illness - Always Required */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">History of Present Illness *</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={historyOfPresentIllness}
                onChange={(value) => setValue('historyOfPresentIllness', value)}
                placeholder="Detailed history of the presenting complaint (onset, duration, character, relieving/aggravating factors...)"
                rows={4}
                medicalContext="clinical_notes"
                showAIEnhance={true}
                error={errors.historyOfPresentIllness?.message}
              />
            </div>
          </div>

          {/* Past Medical History */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Past Medical History</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={pastMedicalHistory}
                onChange={(value) => setValue('pastMedicalHistory', value)}
                placeholder="Previous medical conditions, chronic diseases, hospitalizations..."
                rows={3}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Past Surgical History */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Past Surgical History</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={pastSurgicalHistory}
                onChange={(value) => setValue('pastSurgicalHistory', value)}
                placeholder="Previous surgeries, dates, complications..."
                rows={3}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Allergy History - Important for all ages */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <h3 className="font-medium text-gray-900">Allergy History</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={allergyHistory}
                onChange={(value) => setValue('allergyHistory', value)}
                placeholder="Drug allergies, food allergies, environmental allergies and reactions..."
                rows={2}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Medication History */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Current Medications</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={medicationHistory}
                onChange={(value) => setValue('medicationHistory', value)}
                placeholder="Current medications with doses, over-the-counter drugs, herbal supplements..."
                rows={3}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Family History */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Family History</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={familyHistory}
                onChange={(value) => setValue('familyHistory', value)}
                placeholder="Family history of diseases, genetic conditions..."
                rows={3}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Social History */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Social History</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={socialHistory}
                onChange={(value) => setValue('socialHistory', value)}
                placeholder="Occupation, smoking, alcohol use, living situation..."
                rows={3}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Pediatric-specific: Developmental and Immunization History */}
          {category?.isPediatric && (
            <>
              <div className="card border-l-4 border-l-blue-400">
                <div className="card-header flex items-center gap-2">
                  <Baby className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium text-gray-900">Developmental History</h3>
                </div>
                <div className="card-body">
                  <VoiceDictation
                    value={developmentalHistory}
                    onChange={(value) => setValue('developmentalHistory', value)}
                    placeholder="Milestones achieved (sitting, walking, talking), any developmental concerns..."
                    rows={3}
                    medicalContext="clinical_notes"
                    showAIEnhance={true}
                  />
                </div>
              </div>

              <div className="card border-l-4 border-l-blue-400">
                <div className="card-header flex items-center gap-2">
                  <Baby className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium text-gray-900">Immunization History</h3>
                </div>
                <div className="card-body">
                  <VoiceDictation
                    value={immunizationHistory}
                    onChange={(value) => setValue('immunizationHistory', value)}
                    placeholder="Immunizations received, dates, any missed vaccinations..."
                    rows={3}
                    medicalContext="clinical_notes"
                    showAIEnhance={true}
                  />
                </div>
              </div>
            </>
          )}

          {/* Obstetric History for females of childbearing age */}
          {pregnancy?.isPregnant || (category?.isAdult && patientContext.patient?.sex === 'female') ? (
            <div className="card border-l-4 border-l-pink-400">
              <div className="card-header flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                <h3 className="font-medium text-gray-900">Obstetric & Gynecological History</h3>
              </div>
              <div className="card-body">
                <VoiceDictation
                  value={obstetricHistory}
                  onChange={(value) => setValue('obstetricHistory', value)}
                  placeholder="Gravida, para, abortions, menstrual history, contraception, pregnancy status..."
                  rows={3}
                  medicalContext="clinical_notes"
                  showAIEnhance={true}
                />
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Examination Tab */}
      {activeTab === 'examination' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Physical Examination Findings</h3>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VoiceDictation
                  label="General Appearance"
                  value={physicalExam.generalAppearance || ''}
                  onChange={(value) => updatePhysicalExam('generalAppearance', value)}
                  placeholder="Alert, oriented, well-nourished..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Head & Neck"
                  value={physicalExam.head || ''}
                  onChange={(value) => updatePhysicalExam('head', value)}
                  placeholder="HEENT examination findings..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Cardiovascular"
                  value={physicalExam.cardiovascular || ''}
                  onChange={(value) => updatePhysicalExam('cardiovascular', value)}
                  placeholder="Heart sounds, pulses, JVP..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Respiratory"
                  value={physicalExam.respiratory || ''}
                  onChange={(value) => updatePhysicalExam('respiratory', value)}
                  placeholder="Breath sounds, chest expansion..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Abdomen"
                  value={physicalExam.abdomen || ''}
                  onChange={(value) => updatePhysicalExam('abdomen', value)}
                  placeholder="Soft, non-tender, bowel sounds..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Musculoskeletal"
                  value={physicalExam.musculoskeletal || ''}
                  onChange={(value) => updatePhysicalExam('musculoskeletal', value)}
                  placeholder="Range of motion, deformities..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Neurological"
                  value={physicalExam.neurological || ''}
                  onChange={(value) => updatePhysicalExam('neurological', value)}
                  placeholder="Cranial nerves, motor, sensory..."
                  rows={2}
                  medicalContext="physical_exam"
                />
                <VoiceDictation
                  label="Skin/Integumentary"
                  value={physicalExam.skin || ''}
                  onChange={(value) => updatePhysicalExam('skin', value)}
                  placeholder="Skin color, lesions, wounds..."
                  rows={2}
                  medicalContext="physical_exam"
                />
              </div>

              {/* Pediatric-specific examinations */}
              {category?.isPediatric && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                    <Baby className="w-4 h-4" />
                    Pediatric-Specific Examination
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.isNeonate && (
                      <VoiceDictation
                        label="Fontanelle Assessment"
                        value={(physicalExam as any).fontanelle || ''}
                        onChange={(value) => updatePhysicalExam('fontanelle' as any, value)}
                        placeholder="Anterior fontanelle: flat, soft..."
                        rows={2}
                        medicalContext="physical_exam"
                      />
                    )}
                    <VoiceDictation
                      label="Growth Parameters"
                      value={(physicalExam as any).growthParameters || ''}
                      onChange={(value) => updatePhysicalExam('growthParameters' as any, value)}
                      placeholder="Weight, height, head circumference percentiles..."
                      rows={2}
                      medicalContext="physical_exam"
                    />
                  </div>
                </div>
              )}

              {/* Geriatric-specific examinations */}
              {category?.isGeriatric && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-purple-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Geriatric Assessment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VoiceDictation
                      label="Cognitive Assessment"
                      value={(physicalExam as any).cognitive || ''}
                      onChange={(value) => updatePhysicalExam('cognitive' as any, value)}
                      placeholder="MMSE score, orientation, memory..."
                      rows={2}
                      medicalContext="physical_exam"
                    />
                    <VoiceDictation
                      label="Gait & Balance"
                      value={(physicalExam as any).gaitBalance || ''}
                      onChange={(value) => updatePhysicalExam('gaitBalance' as any, value)}
                      placeholder="Steady gait, Romberg test, fall risk..."
                      rows={2}
                      medicalContext="physical_exam"
                    />
                  </div>
                </div>
              )}
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
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Diagnoses</h3>
            </div>
            <div className="card-body space-y-4">
              {/* Add Diagnosis */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newDiagnosis.description}
                  onChange={(e) => setNewDiagnosis({ ...newDiagnosis, description: e.target.value })}
                  placeholder="Enter diagnosis..."
                  className="input flex-1"
                />
                <select
                  value={newDiagnosis.type}
                  onChange={(e) => setNewDiagnosis({ ...newDiagnosis, type: e.target.value as any })}
                  className="input w-full sm:w-40"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="differential">Differential</option>
                </select>
                <button
                  type="button"
                  onClick={addDiagnosis}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {/* Diagnoses List */}
              {diagnoses.length > 0 && (
                <div className="space-y-2">
                  {diagnoses.map((diagnosis) => (
                    <div
                      key={diagnosis.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        diagnosis.type === 'primary'
                          ? 'bg-blue-50 border-blue-200'
                          : diagnosis.type === 'secondary'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            diagnosis.type === 'primary'
                              ? 'bg-blue-100 text-blue-700'
                              : diagnosis.type === 'secondary'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {diagnosis.type}
                        </span>
                        <span className="font-medium">{diagnosis.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDiagnosis(diagnosis.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Treatment Plan */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Treatment Plan</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
                value={treatmentPlan}
                onChange={(value) => setValue('treatmentPlan', value)}
                placeholder="Medications, investigations, follow-up plan..."
                rows={4}
                medicalContext="clinical_notes"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">Additional Notes</h3>
            </div>
            <div className="card-body">
              <VoiceDictation
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
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save First Encounter
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================
// Follow-up Encounter Form Component
// ============================================

interface FollowUpEncounterFormProps {
  patientId: string;
  patientContext: ReturnType<typeof usePatientContext>;
  previousEncounters: ClinicalEncounter[];
  onSubmit: (data: FollowUpFormData, diagnoses: Diagnosis[], physicalExam: PhysicalExamination) => void;
  isLoading: boolean;
}

function FollowUpEncounterForm({ 
  patientId, 
  patientContext, 
  previousEncounters,
  onSubmit, 
  isLoading 
}: FollowUpEncounterFormProps) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState<{ description: string; type: 'primary' | 'secondary' | 'differential' }>({ description: '', type: 'primary' });
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamination>({});

  const latestEncounter = useMemo(() => {
    return [...previousEncounters].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
  }, [previousEncounters]);

  // Pre-populate diagnoses from previous encounter
  useEffect(() => {
    if (latestEncounter?.diagnosis) {
      setDiagnoses(latestEncounter.diagnosis.map(d => ({
        ...d,
        id: uuidv4(), // New IDs for this encounter
        status: 'ongoing' as const,
      })));
    }
  }, [latestEncounter]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      type: 'follow_up',
    },
  });

  const chiefComplaint = watch('chiefComplaint') || '';
  const intervalHistory = watch('intervalHistory') || '';
  const complianceAssessment = watch('complianceAssessment') || '';
  const treatmentResponse = watch('treatmentResponse') || '';
  const newSymptoms = watch('newSymptoms') || '';
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

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data, diagnoses, physicalExam))} className="space-y-6">
      {/* Follow-up Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card border-l-4 border-l-green-500"
      >
        <div className="card-header flex items-center gap-3">
          <Calendar className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-gray-900">Follow-up Encounter</h2>
        </div>
        <div className="card-body">
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>Last Visit:</strong> {new Date(latestEncounter?.createdAt || '').toLocaleDateString()}
              {' - '}
              <strong>Chief Complaint:</strong> {latestEncounter?.chiefComplaint}
            </p>
            {latestEncounter?.diagnosis && latestEncounter.diagnosis.length > 0 && (
              <p className="text-sm text-green-800 mt-1">
                <strong>Previous Diagnosis:</strong>{' '}
                {latestEncounter.diagnosis.map(d => d.description).join(', ')}
              </p>
            )}
          </div>

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
                label="Chief Complaint Today *"
                value={chiefComplaint}
                onChange={(value) => setValue('chiefComplaint', value)}
                placeholder="Why is the patient returning today?"
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

      {/* Interval History */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Interval History *</h3>
          <p className="text-xs text-gray-500">What has happened since the last visit?</p>
        </div>
        <div className="card-body">
          <VoiceDictation
            value={intervalHistory}
            onChange={(value) => setValue('intervalHistory', value)}
            placeholder="Changes since last visit, symptom progression, new developments..."
            rows={4}
            medicalContext="clinical_notes"
            showAIEnhance={true}
            required={true}
            error={errors.intervalHistory?.message}
          />
        </div>
      </div>

      {/* Treatment Compliance */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Treatment Compliance</h3>
        </div>
        <div className="card-body">
          <VoiceDictation
            value={complianceAssessment}
            onChange={(value) => setValue('complianceAssessment', value)}
            placeholder="Has the patient been taking medications as prescribed? Any issues with compliance?"
            rows={3}
            medicalContext="clinical_notes"
            showAIEnhance={true}
          />
        </div>
      </div>

      {/* Treatment Response */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Treatment Response</h3>
        </div>
        <div className="card-body">
          <VoiceDictation
            value={treatmentResponse}
            onChange={(value) => setValue('treatmentResponse', value)}
            placeholder="How has the patient responded to the previous treatment? Any improvement or worsening?"
            rows={3}
            medicalContext="clinical_notes"
            showAIEnhance={true}
          />
        </div>
      </div>

      {/* New Symptoms */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <h3 className="font-medium text-gray-900">New Symptoms or Concerns</h3>
        </div>
        <div className="card-body">
          <VoiceDictation
            value={newSymptoms}
            onChange={(value) => setValue('newSymptoms', value)}
            placeholder="Any new symptoms, side effects, or concerns since last visit?"
            rows={3}
            medicalContext="clinical_notes"
            showAIEnhance={true}
          />
        </div>
      </div>

      {/* Focused Physical Examination */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Focused Examination</h3>
          <p className="text-xs text-gray-500">Examination relevant to the presenting problem</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VoiceDictation
              label="General Appearance"
              value={physicalExam.generalAppearance || ''}
              onChange={(value) => updatePhysicalExam('generalAppearance', value)}
              placeholder="Compared to last visit..."
              rows={2}
              medicalContext="physical_exam"
            />
            <VoiceDictation
              label="System-Specific Findings"
              value={(physicalExam as any).focusedExam || ''}
              onChange={(value) => updatePhysicalExam('focusedExam' as any, value)}
              placeholder="Findings relevant to the chief complaint..."
              rows={2}
              medicalContext="physical_exam"
            />
          </div>
        </div>
      </div>

      {/* Updated Diagnoses */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Updated Diagnoses</h3>
          <p className="text-xs text-gray-500">Carried forward from previous encounter - update as needed</p>
        </div>
        <div className="card-body space-y-4">
          {/* Existing Diagnoses */}
          {diagnoses.length > 0 && (
            <div className="space-y-2">
              {diagnoses.map((diagnosis) => (
                <div
                  key={diagnosis.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    diagnosis.type === 'primary'
                      ? 'bg-blue-50 border-blue-200'
                      : diagnosis.type === 'secondary'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        diagnosis.type === 'primary'
                          ? 'bg-blue-100 text-blue-700'
                          : diagnosis.type === 'secondary'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {diagnosis.type}
                    </span>
                    <span className="font-medium">{diagnosis.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDiagnosis(diagnosis.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Diagnosis */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newDiagnosis.description}
              onChange={(e) => setNewDiagnosis({ ...newDiagnosis, description: e.target.value })}
              placeholder="Add new diagnosis..."
              className="input flex-1"
            />
            <select
              value={newDiagnosis.type}
              onChange={(e) => setNewDiagnosis({ ...newDiagnosis, type: e.target.value as any })}
              className="input w-full sm:w-40"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="differential">Differential</option>
            </select>
            <button
              type="button"
              onClick={addDiagnosis}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Updated Treatment Plan */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Updated Treatment Plan</h3>
        </div>
        <div className="card-body">
          <VoiceDictation
            value={treatmentPlan}
            onChange={(value) => setValue('treatmentPlan', value)}
            placeholder="Continue, modify, or change treatment plan..."
            rows={4}
            medicalContext="clinical_notes"
            showAIEnhance={true}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-medium text-gray-900">Additional Notes</h3>
        </div>
        <div className="card-body">
          <VoiceDictation
            value={notes}
            onChange={(value) => setValue('notes', value)}
            placeholder="Any additional notes..."
            rows={3}
            medicalContext="clinical_notes"
            showAIEnhance={true}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Follow-up Encounter
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================
// Main Enhanced Clinical Encounter Page
// ============================================

export default function EnhancedClinicalEncounterPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreviousEncounter, setSelectedPreviousEncounter] = useState<ClinicalEncounter | null>(null);

  // Get patient context (age-based, pregnancy, GFR)
  const patientContext = usePatientContext(patientId);

  // Fetch patient
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Fetch previous encounters
  const previousEncounters = useLiveQuery(
    async () => {
      if (!patientId) return [];
      return db.clinicalEncounters.where('patientId').equals(patientId).toArray();
    },
    [patientId]
  ) || [];

  // Fetch latest vitals
  const latestVitals = useLiveQuery(
    async () => {
      if (!patientId) return undefined;
      const allVitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
      allVitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      return allVitals[0];
    },
    [patientId]
  );

  // Determine if this is a first encounter or follow-up
  const isFirstEncounter = previousEncounters.length === 0;

  const handleFirstEncounterSubmit = async (
    data: FirstEncounterFormData,
    diagnoses: Diagnosis[],
    physicalExam: PhysicalExamination
  ) => {
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
        isFirstEncounter: true,
        // Additional first encounter fields
        allergyHistory: data.allergyHistory,
        medicationHistory: data.medicationHistory,
        immunizationHistory: data.immunizationHistory,
        obstetricHistory: data.obstetricHistory,
        developmentalHistory: data.developmentalHistory,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ClinicalEncounter;

      await db.clinicalEncounters.add(encounter);
      await syncRecord('clinicalEncounters', encounter as unknown as Record<string, unknown>);
      toast.success('First encounter saved successfully!');
      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error('Error saving encounter:', error);
      toast.error('Failed to save encounter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpSubmit = async (
    data: FollowUpFormData,
    diagnoses: Diagnosis[],
    physicalExam: PhysicalExamination
  ) => {
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
        intervalHistory: data.intervalHistory,
        complianceAssessment: data.complianceAssessment,
        treatmentResponse: data.treatmentResponse,
        newSymptoms: data.newSymptoms,
        physicalExamination: physicalExam,
        diagnosis: diagnoses,
        treatmentPlan: data.treatmentPlan,
        notes: data.notes,
        attendingClinician: user.id,
        isFirstEncounter: false,
        previousEncounterId: previousEncounters[previousEncounters.length - 1]?.id,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ClinicalEncounter;

      await db.clinicalEncounters.add(encounter);
      await syncRecord('clinicalEncounters', encounter as unknown as Record<string, unknown>);
      toast.success('Follow-up encounter saved successfully!');
      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error('Error saving encounter:', error);
      toast.error('Failed to save encounter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewEncounter = (encounter: ClinicalEncounter) => {
    setSelectedPreviousEncounter(encounter);
    // Could open a modal or navigate to view page
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
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Stethoscope className="w-7 h-7 text-sky-500" />
              {isFirstEncounter ? 'First Clinical Encounter' : 'Follow-up Encounter'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
            <div className="mt-2 flex items-center gap-2">
              <PatientCategoryBadge 
                category={patientContext.category} 
                pregnancy={patientContext.pregnancy}
                showDetails 
              />
            </div>
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

      {/* Clinical Considerations Alert */}
      <ClinicalConsiderations context={patientContext} variant="compact" />

      {/* Latest Vitals */}
      {latestVitals && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6 mt-4"
        >
          <div className="card-header flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Latest Vitals</h2>
          </div>
          <div className="card-body">
            <VitalSignsReference context={patientContext} currentVitals={{
              heartRate: latestVitals.pulse,
              respiratoryRate: latestVitals.respiratoryRate,
              systolicBP: latestVitals.bloodPressureSystolic,
              diastolicBP: latestVitals.bloodPressureDiastolic,
              temperature: latestVitals.temperature,
              oxygenSaturation: latestVitals.oxygenSaturation,
            }} />
          </div>
        </motion.div>
      )}

      {/* Previous Encounters Summary (for follow-up) */}
      {!isFirstEncounter && (
        <PreviousEncountersSummary 
          encounters={previousEncounters} 
          onViewEncounter={handleViewEncounter}
        />
      )}

      {/* Form - First Encounter or Follow-up */}
      {isFirstEncounter ? (
        <FirstEncounterForm
          patientId={patientId!}
          patientContext={patientContext}
          onSubmit={handleFirstEncounterSubmit}
          isLoading={isLoading}
        />
      ) : (
        <FollowUpEncounterForm
          patientId={patientId!}
          patientContext={patientContext}
          previousEncounters={previousEncounters}
          onSubmit={handleFollowUpSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
