/**
 * Post-Operative Note Form Page
 * 
 * Comprehensive form for surgeons to create post-operative notes.
 * Includes medication harmonization with existing medication chart.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  FileText,
  Scissors,
  Activity,
  Pill,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { createPostOperativeNote } from '../../../services/postOperativeNoteService';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import type { PostoperativeMedication } from '../../../types';

// Form schema
const postOpNoteSchema = z.object({
  preOperativeDiagnosis: z.string().min(1, 'Required'),
  postOperativeDiagnosis: z.string().min(1, 'Required'),
  indication: z.string().min(1, 'Required'),
  procedurePerformed: z.string().min(1, 'Required'),
  findings: z.string().min(1, 'Required'),
  complications: z.array(z.string()),
  bloodLoss: z.number().min(0),
  bloodTransfused: z.number().min(0).optional(),
  duration: z.number().min(1),
  specimens: z.array(z.object({
    type: z.string(),
    description: z.string(),
    site: z.string(),
    histopathologyRequest: z.boolean(),
    microbiologyRequest: z.boolean(),
  })),
  vitalSignsFrequency: z.string(),
  monitoringInstructions: z.array(z.string()),
  position: z.string(),
  dietInstructions: z.string(),
  ivFluids: z.string().optional(),
  medications: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    route: z.string(),
    frequency: z.string(),
    duration: z.string(),
    indication: z.string(),
  })),
  drainCare: z.string().optional(),
  catheterCare: z.string().optional(),
  expectedRecoveryDays: z.number().min(1),
  day0Ambulation: z.string(),
  day1Ambulation: z.string(),
  ongoingAmbulation: z.string(),
  oralIntakeTiming: z.string(),
  oralIntakeType: z.string(),
  oralIntakeProgression: z.string(),
  followUpDate: z.string().optional(),
  followUpInstructions: z.string(),
  suturRemovalDate: z.string().optional(),
  warningSigns: z.array(z.string()),
  whenToSeekHelp: z.array(z.string()),
});

type PostOpNoteFormData = z.infer<typeof postOpNoteSchema>;

export default function PostOpNoteFormPage() {
  const { surgeryId } = useParams<{ surgeryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complicationInput, setComplicationInput] = useState('');
  const [monitoringInput, setMonitoringInput] = useState('');
  const [warningSignInput, setWarningSignInput] = useState('');
  const [seekHelpInput, setSeekHelpInput] = useState('');

  // Check if user is a surgeon
  useEffect(() => {
    if (user && user.role !== 'surgeon') {
      toast.error('Only surgeons can create post-operative notes');
      navigate(-1);
    }
  }, [user, navigate]);

  // Fetch surgery
  const surgery = useLiveQuery(async () => {
    if (!surgeryId) return null;
    return db.surgeries.get(surgeryId);
  }, [surgeryId]);

  // Fetch patient
  const patient = useLiveQuery(async () => {
    if (!surgery?.patientId) return null;
    return db.patients.get(surgery.patientId);
  }, [surgery?.patientId]);

  // Fetch existing medication chart for harmonization
  const existingMedicationChart = useLiveQuery(async () => {
    if (!patient?.id) return null;
    const charts = await db.medicationCharts
      .where('patientId')
      .equals(patient.id)
      .toArray();
    // Get the most recent chart
    return charts.length > 0 ? charts[charts.length - 1] : null;
  }, [patient?.id]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostOpNoteFormData>({
    resolver: zodResolver(postOpNoteSchema),
    defaultValues: {
      preOperativeDiagnosis: '',
      postOperativeDiagnosis: '',
      indication: '',
      procedurePerformed: surgery?.procedureName || '',
      findings: '',
      complications: [],
      bloodLoss: 0,
      duration: 60,
      specimens: [],
      vitalSignsFrequency: 'Every 4 hours for 24 hours',
      monitoringInstructions: ['Monitor vital signs', 'Assess pain level', 'Check wound site'],
      position: 'Head elevated 30-45 degrees',
      dietInstructions: 'Clear fluids when fully awake, advance as tolerated',
      medications: [],
      expectedRecoveryDays: 14,
      day0Ambulation: 'Sit up with assistance',
      day1Ambulation: 'Walk with assistance',
      ongoingAmbulation: 'Increase activity gradually',
      oralIntakeTiming: 'When fully awake',
      oralIntakeType: 'Clear fluids initially',
      oralIntakeProgression: 'Advance to regular diet as tolerated',
      followUpInstructions: 'Follow-up in 1-2 weeks for wound review',
      warningSigns: ['High fever (>38.5°C)', 'Severe pain', 'Wound bleeding', 'Signs of infection'],
      whenToSeekHelp: ['If any warning signs occur', 'Difficulty breathing', 'Chest pain'],
    },
  });

  const { fields: specimenFields, append: appendSpecimen, remove: removeSpecimen } = useFieldArray({
    control,
    name: 'specimens',
  });

  const { fields: medicationFields, append: appendMedication, remove: removeMedication } = useFieldArray({
    control,
    name: 'medications',
  });

  const complications = watch('complications') || [];
  const monitoringInstructions = watch('monitoringInstructions') || [];
  const warningSigns = watch('warningSigns') || [];
  const whenToSeekHelp = watch('whenToSeekHelp') || [];
  
  // Watch values for VoiceDictation
  const indication = watch('indication') || '';
  const procedurePerformed = watch('procedurePerformed') || '';
  const findings = watch('findings') || '';
  const drainCare = watch('drainCare') || '';
  const catheterCare = watch('catheterCare') || '';
  const followUpInstructions = watch('followUpInstructions') || '';

  // Harmonize medications with existing chart
  const harmonizeMedications = async (postOpMedications: PostoperativeMedication[]) => {
    if (!existingMedicationChart || !patient) return;

    try {
      const currentMeds = existingMedicationChart.scheduledMedications || [];
      const newMeds: any[] = [];
      const conflicts: string[] = [];

      // Check each post-op medication against existing medications
      for (const postOpMed of postOpMedications) {
        const existing = currentMeds.find(
          (med: any) => med.genericName?.toLowerCase() === postOpMed.name.toLowerCase()
        );

        if (existing) {
          // Check for dosage conflicts
          if (existing.dosage !== postOpMed.dose || existing.frequency !== postOpMed.frequency) {
            conflicts.push(
              `${postOpMed.name}: Existing dose ${existing.dosage} ${existing.frequency} differs from post-op ${postOpMed.dose} ${postOpMed.frequency}`
            );
          }
        } else {
          // New medication - add to chart
          newMeds.push({
            id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            genericName: postOpMed.name,
            brandName: postOpMed.name,
            dose: postOpMed.dose,
            route: postOpMed.route,
            frequency: postOpMed.frequency,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
            indication: postOpMed.indication,
            prescribedBy: user?.id || '',
            administrationTimes: [],
          });
        }
      }

      // Update medication chart if there are new meds
      if (newMeds.length > 0) {
        await db.medicationCharts.update(existingMedicationChart.id, {
          medications: [...currentMeds, ...newMeds],
          updatedAt: new Date(),
        });
        
        await syncRecord('medicationCharts', {
          ...existingMedicationChart,
          medications: [...currentMeds, ...newMeds],
        } as unknown as Record<string, unknown>);

        toast.success(`${newMeds.length} new medication(s) added to chart`);
      }

      // Show conflicts if any
      if (conflicts.length > 0) {
        toast.error(
          `Dosage conflicts detected:\n${conflicts.join('\n')}`,
          { duration: 8000 }
        );
      }

      if (newMeds.length === 0 && conflicts.length === 0) {
        toast.success('All post-op medications already in chart');
      }
    } catch (error) {
      console.error('Error harmonizing medications:', error);
      toast.error('Failed to harmonize medications');
    }
  };

  const onSubmit = async (data: PostOpNoteFormData) => {
    if (!surgery || !patient || !user) {
      toast.error('Missing required data');
      return;
    }

    setIsSubmitting(true);

    try {
      const postOpNote = await createPostOperativeNote(
        surgery,
        patient,
        {
          preOperativeDiagnosis: data.preOperativeDiagnosis,
          postOperativeDiagnosis: data.postOperativeDiagnosis,
          indication: data.indication,
          procedurePerformed: data.procedurePerformed,
          findings: data.findings,
          complications: data.complications,
          bloodLoss: data.bloodLoss,
          bloodTransfused: data.bloodTransfused,
          duration: data.duration,
          specimens: data.specimens.map((spec: any) => ({
            ...spec,
            id: `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            labRequestGenerated: spec.histopathologyRequest || spec.microbiologyRequest,
          })),
        },
        {
          vitalSignsFrequency: data.vitalSignsFrequency,
          monitoringInstructions: data.monitoringInstructions,
          position: data.position,
          dietInstructions: data.dietInstructions,
          ivFluids: data.ivFluids,
          medications: data.medications,
          drainCare: data.drainCare,
          catheterCare: data.catheterCare,
        },
        {
          expectedRecoveryDays: data.expectedRecoveryDays,
          ambulation: {
            day0: data.day0Ambulation,
            day1: data.day1Ambulation,
            ongoing: data.ongoingAmbulation,
          },
          oralIntake: {
            timing: data.oralIntakeTiming,
            type: data.oralIntakeType,
            progression: data.oralIntakeProgression,
          },
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
          followUpInstructions: data.followUpInstructions,
          suturRemovalDate: data.suturRemovalDate ? new Date(data.suturRemovalDate) : undefined,
          warningSigns: data.warningSigns,
          whenToSeekHelp: data.whenToSeekHelp,
        },
        {
          signInCompleted: true,
          timeOutCompleted: true,
          signOutCompleted: true,
        },
        user.id,
        surgery.hospitalId
      );

      // Save to database
      await db.postOperativeNotes.add(postOpNote);
      await syncRecord('postOperativeNotes', postOpNote as unknown as Record<string, unknown>);

      // Harmonize medications with existing chart
      if (data.medications.length > 0) {
        await harmonizeMedications(data.medications);
      }

      toast.success('Post-operative note created successfully');
      navigate(`/surgery/post-op-note/${surgery.id}`);
    } catch (error) {
      console.error('Error creating post-op note:', error);
      toast.error('Failed to create post-operative note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!surgery || !patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading surgery details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Post-Operative Note</h1>
          <p className="text-gray-600 mt-1">
            {surgery.procedureName} • {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
          </p>
        </div>
      </div>

      {/* Medication Harmonization Notice */}
      {existingMedicationChart && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Medication Chart Harmonization</h3>
              <p className="text-sm text-blue-700 mt-1">
                Post-operative medications will be automatically synchronized with the patient's existing medication chart.
                Conflicts will be flagged for review.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Operative Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-purple-600" />
            Operative Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Pre-Operative Diagnosis *</label>
              <input
                {...register('preOperativeDiagnosis')}
                className={`input ${errors.preOperativeDiagnosis ? 'input-error' : ''}`}
              />
              {errors.preOperativeDiagnosis && (
                <p className="text-sm text-red-500 mt-1">{errors.preOperativeDiagnosis.message}</p>
              )}
            </div>
            <div>
              <label className="label">Post-Operative Diagnosis *</label>
              <input
                {...register('postOperativeDiagnosis')}
                className={`input ${errors.postOperativeDiagnosis ? 'input-error' : ''}`}
              />
              {errors.postOperativeDiagnosis && (
                <p className="text-sm text-red-500 mt-1">{errors.postOperativeDiagnosis.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <VoiceDictation
                label="Indication *"
                value={indication}
                onChange={(value) => setValue('indication', value)}
                placeholder="Indicate reason for surgery..."
                rows={2}
                medicalContext="surgical_notes"
                showAIEnhance={true}
                error={errors.indication?.message}
              />
            </div>
            <div className="md:col-span-2">
              <VoiceDictation
                label="Procedure Performed *"
                value={procedurePerformed}
                onChange={(value) => setValue('procedurePerformed', value)}
                placeholder="Describe the procedure performed..."
                rows={2}
                medicalContext="intraoperative"
                showAIEnhance={true}
                error={errors.procedurePerformed?.message}
              />
            </div>
            <div className="md:col-span-2">
              <VoiceDictation
                label="Intraoperative Findings *"
                value={findings}
                onChange={(value) => setValue('findings', value)}
                placeholder="Describe surgical findings..."
                rows={3}
                medicalContext="intraoperative"
                showAIEnhance={true}
                error={errors.findings?.message}
              />
            </div>
            <div>
              <label className="label">Blood Loss (mL) *</label>
              <input
                type="number"
                {...register('bloodLoss', { valueAsNumber: true })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Blood Transfused (units)</label>
              <input
                type="number"
                {...register('bloodTransfused', { valueAsNumber: true })}
                className="input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Duration (minutes) *</label>
              <input
                type="number"
                {...register('duration', { valueAsNumber: true })}
                className="input"
              />
            </div>
          </div>

          {/* Complications */}
          <div className="mt-4">
            <label className="label">Complications</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={complicationInput}
                onChange={(e) => setComplicationInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (complicationInput.trim()) {
                      const current = watch('complications') || [];
                      register('complications').onChange({
                        target: { value: [...current, complicationInput.trim()] },
                      });
                      setComplicationInput('');
                    }
                  }
                }}
                placeholder="Type complication and press Enter"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (complicationInput.trim()) {
                    const current = watch('complications') || [];
                    register('complications').onChange({
                      target: { value: [...current, complicationInput.trim()] },
                    });
                    setComplicationInput('');
                  }
                }}
                className="btn btn-secondary"
              >
                <Plus size={16} />
              </button>
            </div>
            {complications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {complications.map((comp, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-sm"
                  >
                    {comp}
                    <button
                      type="button"
                      onClick={() => {
                        register('complications').onChange({
                          target: { value: complications.filter((_, i) => i !== index) },
                        });
                      }}
                      className="hover:bg-red-200 rounded-full p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Specimens */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Specimens
            </h2>
            <button
              type="button"
              onClick={() => appendSpecimen({
                type: '',
                description: '',
                site: '',
                histopathologyRequest: false,
                microbiologyRequest: false,
              })}
              className="btn btn-sm btn-secondary"
            >
              <Plus size={16} />
              Add Specimen
            </button>
          </div>
          {specimenFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-3">
              <div>
                <label className="label">Type</label>
                <select {...register(`specimens.${index}.type`)} className="input">
                  <option value="">Select type</option>
                  <option value="tissue">Tissue</option>
                  <option value="fluid">Fluid</option>
                  <option value="swab">Swab</option>
                  <option value="biopsy">Biopsy</option>
                  <option value="aspiration">Aspiration</option>
                </select>
              </div>
              <div>
                <label className="label">Site</label>
                <input {...register(`specimens.${index}.site`)} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea {...register(`specimens.${index}.description`)} rows={2} className="input" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register(`specimens.${index}.histopathologyRequest`)} />
                  <span className="text-sm">Histopathology</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register(`specimens.${index}.microbiologyRequest`)} />
                  <span className="text-sm">Microbiology</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeSpecimen(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Post-Op Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Post-Operative Orders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vital Signs Frequency</label>
              <input {...register('vitalSignsFrequency')} className="input" />
            </div>
            <div>
              <label className="label">Position</label>
              <input {...register('position')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Diet Instructions</label>
              <input {...register('dietInstructions')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">IV Fluids</label>
              <input {...register('ivFluids')} className="input" placeholder="e.g., Normal Saline 1L over 8 hours" />
            </div>
            <div className="md:col-span-2">
              <VoiceDictation
                label="Drain Care"
                value={drainCare}
                onChange={(value) => setValue('drainCare', value)}
                placeholder="Describe drain care instructions..."
                rows={2}
                medicalContext="postoperative"
                showAIEnhance={true}
              />
            </div>
            <div className="md:col-span-2">
              <VoiceDictation
                label="Catheter Care"
                value={catheterCare}
                onChange={(value) => setValue('catheterCare', value)}
                placeholder="Describe catheter care instructions..."
                rows={2}
                medicalContext="postoperative"
                showAIEnhance={true}
              />
            </div>
          </div>

          {/* Monitoring Instructions */}
          <div className="mt-4">
            <label className="label">Monitoring Instructions</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={monitoringInput}
                onChange={(e) => setMonitoringInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (monitoringInput.trim()) {
                      const current = watch('monitoringInstructions') || [];
                      register('monitoringInstructions').onChange({
                        target: { value: [...current, monitoringInput.trim()] },
                      });
                      setMonitoringInput('');
                    }
                  }
                }}
                placeholder="Type instruction and press Enter"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (monitoringInput.trim()) {
                    const current = watch('monitoringInstructions') || [];
                    register('monitoringInstructions').onChange({
                      target: { value: [...current, monitoringInput.trim()] },
                    });
                    setMonitoringInput('');
                  }
                }}
                className="btn btn-secondary"
              >
                <Plus size={16} />
              </button>
            </div>
            {monitoringInstructions.length > 0 && (
              <div className="space-y-1">
                {monitoringInstructions.map((instruction, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{instruction}</span>
                    <button
                      type="button"
                      onClick={() => {
                        register('monitoringInstructions').onChange({
                          target: { value: monitoringInstructions.filter((_, i) => i !== index) },
                        });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" />
              Post-Operative Medications
            </h2>
            <button
              type="button"
              onClick={() => appendMedication({
                name: '',
                dose: '',
                route: 'oral',
                frequency: '',
                duration: '',
                indication: '',
              })}
              className="btn btn-sm btn-secondary"
            >
              <Plus size={16} />
              Add Medication
            </button>
          </div>
          {medicationFields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-3">
              <div>
                <label className="label">Medication Name</label>
                <input {...register(`medications.${index}.name`)} className="input" />
              </div>
              <div>
                <label className="label">Dose</label>
                <input {...register(`medications.${index}.dose`)} className="input" placeholder="e.g., 500mg" />
              </div>
              <div>
                <label className="label">Route</label>
                <select {...register(`medications.${index}.route`)} className="input">
                  <option value="oral">Oral</option>
                  <option value="iv">IV</option>
                  <option value="im">IM</option>
                  <option value="sc">SC</option>
                  <option value="topical">Topical</option>
                </select>
              </div>
              <div>
                <label className="label">Frequency</label>
                <input {...register(`medications.${index}.frequency`)} className="input" placeholder="e.g., TDS" />
              </div>
              <div>
                <label className="label">Duration</label>
                <input {...register(`medications.${index}.duration`)} className="input" placeholder="e.g., 7 days" />
              </div>
              <div>
                <label className="label">Indication</label>
                <input {...register(`medications.${index}.indication`)} className="input" placeholder="e.g., Pain relief" />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeMedication(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recovery Plan */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recovery Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Expected Recovery (days)</label>
              <input
                type="number"
                {...register('expectedRecoveryDays', { valueAsNumber: true })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input type="date" {...register('followUpDate')} className="input" />
            </div>
            <div className="md:col-span-2">
              <VoiceDictation
                label="Follow-up Instructions"
                value={followUpInstructions}
                onChange={(value) => setValue('followUpInstructions', value)}
                placeholder="Describe follow-up care instructions..."
                rows={2}
                medicalContext="postoperative"
                showAIEnhance={true}
              />
            </div>
            <div>
              <label className="label">Suture Removal Date</label>
              <input type="date" {...register('suturRemovalDate')} className="input" />
            </div>
            <div>
              <label className="label">Day 0 Ambulation</label>
              <input {...register('day0Ambulation')} className="input" />
            </div>
            <div>
              <label className="label">Day 1 Ambulation</label>
              <input {...register('day1Ambulation')} className="input" />
            </div>
            <div>
              <label className="label">Ongoing Ambulation</label>
              <input {...register('ongoingAmbulation')} className="input" />
            </div>
            <div>
              <label className="label">Oral Intake Timing</label>
              <input {...register('oralIntakeTiming')} className="input" />
            </div>
            <div>
              <label className="label">Oral Intake Type</label>
              <input {...register('oralIntakeType')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Oral Intake Progression</label>
              <input {...register('oralIntakeProgression')} className="input" />
            </div>
          </div>

          {/* Warning Signs */}
          <div className="mt-4">
            <label className="label">Warning Signs</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={warningSignInput}
                onChange={(e) => setWarningSignInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (warningSignInput.trim()) {
                      const current = watch('warningSigns') || [];
                      register('warningSigns').onChange({
                        target: { value: [...current, warningSignInput.trim()] },
                      });
                      setWarningSignInput('');
                    }
                  }
                }}
                placeholder="Type warning sign and press Enter"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (warningSignInput.trim()) {
                    const current = watch('warningSigns') || [];
                    register('warningSigns').onChange({
                      target: { value: [...current, warningSignInput.trim()] },
                    });
                    setWarningSignInput('');
                  }
                }}
                className="btn btn-secondary"
              >
                <Plus size={16} />
              </button>
            </div>
            {warningSigns.length > 0 && (
              <div className="space-y-1">
                {warningSigns.map((sign, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span className="text-sm">{sign}</span>
                    <button
                      type="button"
                      onClick={() => {
                        register('warningSigns').onChange({
                          target: { value: warningSigns.filter((_, i) => i !== index) },
                        });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* When to Seek Help */}
          <div className="mt-4">
            <label className="label">When to Seek Help</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={seekHelpInput}
                onChange={(e) => setSeekHelpInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (seekHelpInput.trim()) {
                      const current = watch('whenToSeekHelp') || [];
                      register('whenToSeekHelp').onChange({
                        target: { value: [...current, seekHelpInput.trim()] },
                      });
                      setSeekHelpInput('');
                    }
                  }
                }}
                placeholder="Type instruction and press Enter"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (seekHelpInput.trim()) {
                    const current = watch('whenToSeekHelp') || [];
                    register('whenToSeekHelp').onChange({
                      target: { value: [...current, seekHelpInput.trim()] },
                    });
                    setSeekHelpInput('');
                  }
                }}
                className="btn btn-secondary"
              >
                <Plus size={16} />
              </button>
            </div>
            {whenToSeekHelp.length > 0 && (
              <div className="space-y-1">
                {whenToSeekHelp.map((help, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-sm">{help}</span>
                    <button
                      type="button"
                      onClick={() => {
                        register('whenToSeekHelp').onChange({
                          target: { value: whenToSeekHelp.filter((_, i) => i !== index) },
                        });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create Post-Op Note
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
