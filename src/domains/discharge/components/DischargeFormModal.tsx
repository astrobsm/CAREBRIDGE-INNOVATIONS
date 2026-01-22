// Discharge Form Modal Component
// Comprehensive form for creating discharge summaries

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import {
  X,
  Save,
  FileText,
  Pill,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Activity,
  Stethoscope,
  ClipboardList,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { VoiceDictation } from '../../../components/common';
import type { Admission, Patient, DischargeSummary, DischargeMedication, FollowUpAppointment } from '../../../types';
import { generateDischargeSummaryPDF } from '../../../utils/dischargePdfGenerator';

const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name required'),
  dose: z.string().min(1, 'Dose required'),
  route: z.string().min(1, 'Route required'),
  frequency: z.string().min(1, 'Frequency required'),
  duration: z.string().min(1, 'Duration required'),
  purpose: z.string().min(1, 'Purpose required'),
  isNew: z.boolean(),
  specialInstructions: z.string().optional(),
});

const followUpSchema = z.object({
  type: z.string().min(1, 'Type required'),
  department: z.string().min(1, 'Department required'),
  scheduledDate: z.string().min(1, 'Date required'),
  doctor: z.string().optional(),
  instructions: z.string().optional(),
});

const dischargeFormSchema = z.object({
  // Diagnosis
  admittingDiagnosis: z.string().min(1, 'Admitting diagnosis required'),
  finalDiagnosis: z.string().min(1, 'Final diagnosis required'),
  comorbidities: z.string().optional(),
  
  // Hospital Course
  hospitalCourse: z.string().min(10, 'Please provide detailed hospital course'),
  proceduresPerformed: z.string().optional(),
  consultations: z.string().optional(),
  
  // Condition at Discharge
  conditionAtDischarge: z.enum(['improved', 'stable', 'unchanged', 'deteriorated']),
  dischargeDisposition: z.enum(['home', 'facility', 'hospice', 'transfer', 'against-advice', 'deceased']),
  
  // Medications
  dischargeMedications: z.array(medicationSchema),
  medicationsDiscontinued: z.string().optional(),
  
  // Instructions
  dietaryInstructions: z.string().min(1, 'Dietary instructions required'),
  activityRestrictions: z.string().min(1, 'Activity instructions required'),
  woundCareInstructions: z.string().optional(),
  warningSignsToWatch: z.string().min(1, 'Warning signs required'),
  
  // Follow-up
  followUpAppointments: z.array(followUpSchema),
  pendingTests: z.string().optional(),
  pendingReferrals: z.string().optional(),
  
  // Contact
  emergencyContact: z.string().min(1, 'Emergency contact required'),
  clinicContact: z.string().min(1, 'Clinic contact required'),
});

type DischargeFormData = z.infer<typeof dischargeFormSchema>;

interface Props {
  admission: Admission;
  patient?: Patient;
  onClose: () => void;
  onComplete: () => void;
}

const steps = [
  { id: 1, title: 'Diagnosis', icon: Stethoscope },
  { id: 2, title: 'Hospital Course', icon: Activity },
  { id: 3, title: 'Medications', icon: Pill },
  { id: 4, title: 'Instructions', icon: ClipboardList },
  { id: 5, title: 'Follow-up', icon: Calendar },
  { id: 6, title: 'Review', icon: CheckCircle },
];

const routes = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Rectal', 'Sublingual'];
const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'At bedtime'];

export default function DischargeFormModal({ admission, patient, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useLiveQuery(() => db.users.toArray(), []);
  
  const doctors = useMemo(() => {
    return users?.filter(u => ['surgeon', 'anaesthetist'].includes(u.role)) || [];
  }, [users]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DischargeFormData>({
    resolver: zodResolver(dischargeFormSchema),
    defaultValues: {
      admittingDiagnosis: admission.admissionDiagnosis,
      finalDiagnosis: admission.admissionDiagnosis,
      comorbidities: admission.comorbidities?.join(', ') || '',
      conditionAtDischarge: 'improved',
      dischargeDisposition: 'home',
      dischargeMedications: [],
      followUpAppointments: [],
      dietaryInstructions: 'Regular diet as tolerated',
      activityRestrictions: 'Light activities for 2 weeks. Avoid strenuous activities.',
      warningSignsToWatch: 'Fever, severe pain, bleeding, wound discharge, difficulty breathing',
      emergencyContact: '112 (Emergency)',
      clinicContact: '',
    },
  });

  const {
    fields: medicationFields,
    append: appendMedication,
    remove: removeMedication,
  } = useFieldArray({
    control,
    name: 'dischargeMedications',
  });

  const {
    fields: followUpFields,
    append: appendFollowUp,
    remove: removeFollowUp,
  } = useFieldArray({
    control,
    name: 'followUpAppointments',
  });

  const formValues = watch();
  
  // Watch values for VoiceDictation
  const hospitalCourse = watch('hospitalCourse') || '';
  const proceduresPerformed = watch('proceduresPerformed') || '';
  const dietaryInstructions = watch('dietaryInstructions') || '';
  const activityRestrictions = watch('activityRestrictions') || '';
  const woundCareInstructions = watch('woundCareInstructions') || '';
  const warningSignsToWatch = watch('warningSignsToWatch') || '';

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onSubmit = async (data: DischargeFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const summaryId = uuidv4();
      
      // Create follow-up appointments with IDs
      const followUpAppointments: FollowUpAppointment[] = data.followUpAppointments.map(f => ({
        id: uuidv4(),
        type: f.type,
        department: f.department,
        scheduledDate: new Date(f.scheduledDate),
        doctor: f.doctor,
        instructions: f.instructions,
        status: 'scheduled' as const,
        reminderSent: false,
      }));

      // Create discharge medications
      const dischargeMedications: DischargeMedication[] = data.dischargeMedications.map(m => ({
        ...m,
        specialInstructions: m.specialInstructions || undefined,
      }));

      // Create discharge summary
      const summary: DischargeSummary = {
        id: summaryId,
        patientId: admission.patientId,
        encounterId: admission.encounterId || '',
        admissionDate: new Date(admission.admissionDate),
        dischargeDate: new Date(),
        
        admittingDiagnosis: data.admittingDiagnosis,
        finalDiagnosis: data.finalDiagnosis.split(',').map(d => d.trim()),
        comorbidities: data.comorbidities ? data.comorbidities.split(',').map(c => c.trim()) : [],
        
        hospitalCourse: data.hospitalCourse,
        proceduresPerformed: data.proceduresPerformed 
          ? data.proceduresPerformed.split('\n').map(p => ({
              name: p.trim(),
              date: new Date(admission.admissionDate),
              surgeon: `${user.firstName} ${user.lastName}`,
              outcome: 'Successful',
            }))
          : [],
        consultations: data.consultations ? data.consultations.split(',').map(c => c.trim()) : [],
        
        conditionAtDischarge: data.conditionAtDischarge,
        dischargeDisposition: data.dischargeDisposition,
        
        dischargeMedications,
        medicationsDiscontinued: data.medicationsDiscontinued 
          ? data.medicationsDiscontinued.split(',').map(m => m.trim()) 
          : [],
        
        dietaryInstructions: data.dietaryInstructions,
        activityRestrictions: data.activityRestrictions,
        woundCareInstructions: data.woundCareInstructions,
        warningSignsToWatch: data.warningSignsToWatch.split(',').map(w => w.trim()),
        
        followUpAppointments,
        pendingTests: data.pendingTests ? data.pendingTests.split(',').map(t => t.trim()) : [],
        pendingReferrals: data.pendingReferrals ? data.pendingReferrals.split(',').map(r => r.trim()) : [],
        
        emergencyContact: data.emergencyContact,
        clinicContact: data.clinicContact,
        
        preparedBy: user.id,
        preparedByName: `${user.firstName} ${user.lastName}`,
        attendingPhysician: admission.primaryDoctor,
        attendingPhysicianName: (() => { const doc = doctors.find(d => d.id === admission.primaryDoctor); return doc ? `${doc.firstName} ${doc.lastName}` : ''; })(),
        
        followUpTracking: [],
        
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save discharge summary
      await db.dischargeSummaries.add(summary);
      syncRecord('dischargeSummaries', summary as unknown as Record<string, unknown>);

      // Update admission status
      await db.admissions.update(admission.id, {
        status: 'discharged',
        dischargeDate: new Date(),
        dischargeTime: format(new Date(), 'HH:mm'),
        dischargedBy: user.id,
        dischargeType: data.dischargeDisposition === 'against-advice' ? 'against_advice' : 'routine',
        dischargeSummaryId: summaryId,
        updatedAt: new Date(),
      });
      const updatedAdmission = await db.admissions.get(admission.id);
      if (updatedAdmission) syncRecord('admissions', updatedAdmission as unknown as Record<string, unknown>);

      onComplete();
    } catch (error) {
      console.error('Error creating discharge summary:', error);
      toast.error('Failed to process discharge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!patient) return;
    
    try {
      const data = formValues;
      const summary: Partial<DischargeSummary> = {
        id: 'preview',
        patientId: admission.patientId,
        encounterId: admission.encounterId || '',
        admissionDate: new Date(admission.admissionDate),
        dischargeDate: new Date(),
        admittingDiagnosis: data.admittingDiagnosis,
        finalDiagnosis: data.finalDiagnosis.split(',').map(d => d.trim()),
        comorbidities: data.comorbidities ? data.comorbidities.split(',').map(c => c.trim()) : [],
        hospitalCourse: data.hospitalCourse,
        conditionAtDischarge: data.conditionAtDischarge,
        dischargeDisposition: data.dischargeDisposition,
        dischargeMedications: data.dischargeMedications as DischargeMedication[],
        dietaryInstructions: data.dietaryInstructions,
        activityRestrictions: data.activityRestrictions,
        woundCareInstructions: data.woundCareInstructions,
        warningSignsToWatch: data.warningSignsToWatch.split(',').map(w => w.trim()),
        emergencyContact: data.emergencyContact,
        clinicContact: data.clinicContact,
        preparedByName: user ? `${user.firstName} ${user.lastName}` : '',
        status: 'draft',
      };
      
      await generateDischargeSummaryPDF(summary as DischargeSummary, patient);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Discharge Summary</h2>
              <p className="text-sm text-white/80">
                {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'} • {admission.admissionNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1 ${
                    currentStep === step.id
                      ? 'text-indigo-600'
                      : currentStep > step.id
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentStep === step.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : currentStep > step.id
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <step.icon size={16} />
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-1 ${
                      currentStep > step.id ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-220px)]">
          <div className="p-6">
            {/* Step 1: Diagnosis */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-500" />
                  Diagnosis Information
                </h3>
                
                <div>
                  <label className="label">Admitting Diagnosis *</label>
                  <input
                    {...register('admittingDiagnosis')}
                    className="input w-full"
                    placeholder="Primary diagnosis at admission"
                  />
                  {errors.admittingDiagnosis && (
                    <p className="text-red-500 text-sm mt-1">{errors.admittingDiagnosis.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Final Diagnosis * (comma-separated for multiple)</label>
                  <textarea
                    {...register('finalDiagnosis')}
                    className="input w-full"
                    rows={2}
                    placeholder="Final diagnosis at discharge (separate multiple with commas)"
                  />
                  {errors.finalDiagnosis && (
                    <p className="text-red-500 text-sm mt-1">{errors.finalDiagnosis.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Comorbidities (comma-separated)</label>
                  <input
                    {...register('comorbidities')}
                    className="input w-full"
                    placeholder="Hypertension, Diabetes, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Condition at Discharge *</label>
                    <select {...register('conditionAtDischarge')} className="input w-full">
                      <option value="improved">Improved</option>
                      <option value="stable">Stable</option>
                      <option value="unchanged">Unchanged</option>
                      <option value="deteriorated">Deteriorated</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Discharge Disposition *</label>
                    <select {...register('dischargeDisposition')} className="input w-full">
                      <option value="home">Discharged Home</option>
                      <option value="facility">To Skilled Facility</option>
                      <option value="hospice">To Hospice</option>
                      <option value="transfer">Transfer to Another Hospital</option>
                      <option value="against-advice">Against Medical Advice</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Hospital Course */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Hospital Course
                </h3>

                <div>
                  <label className="label">Hospital Course Summary *</label>
                  <VoiceDictation
                    value={hospitalCourse}
                    onChange={(value) => setValue('hospitalCourse', value)}
                    placeholder="Detailed summary of patient's hospital stay, treatments given, response to treatment, complications if any..."
                    rows={6}
                    medicalContext="discharge"
                    showAIEnhance={true}
                    error={errors.hospitalCourse?.message}
                  />
                </div>

                <div>
                  <label className="label">Procedures Performed (one per line)</label>
                  <VoiceDictation
                    value={proceduresPerformed}
                    onChange={(value) => setValue('proceduresPerformed', value)}
                    placeholder="List any surgeries or procedures performed..."
                    rows={3}
                    medicalContext="surgical_notes"
                    showAIEnhance={true}
                  />
                </div>

                <div>
                  <label className="label">Consultations (comma-separated)</label>
                  <input
                    {...register('consultations')}
                    className="input w-full"
                    placeholder="Cardiology, Infectious Disease, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Medications */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-indigo-500" />
                    Discharge Medications
                  </h3>
                  <button
                    type="button"
                    onClick={() => appendMedication({
                      name: '',
                      dose: '',
                      route: 'Oral',
                      frequency: 'Once daily',
                      duration: '',
                      purpose: '',
                      isNew: true,
                    })}
                    className="btn btn-secondary btn-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Medication
                  </button>
                </div>

                {medicationFields.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Pill className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No medications added yet</p>
                    <p className="text-sm text-gray-400">Click "Add Medication" to add discharge medications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicationFields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Medication {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeMedication(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="col-span-2 md:col-span-1">
                            <input
                              {...register(`dischargeMedications.${index}.name`)}
                              className="input w-full"
                              placeholder="Medication name"
                            />
                          </div>
                          <div>
                            <input
                              {...register(`dischargeMedications.${index}.dose`)}
                              className="input w-full"
                              placeholder="Dose (e.g., 500mg)"
                            />
                          </div>
                          <div>
                            <select
                              {...register(`dischargeMedications.${index}.route`)}
                              className="input w-full"
                            >
                              {routes.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <select
                              {...register(`dischargeMedications.${index}.frequency`)}
                              className="input w-full"
                            >
                              {frequencies.map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              {...register(`dischargeMedications.${index}.duration`)}
                              className="input w-full"
                              placeholder="Duration (e.g., 7 days)"
                            />
                          </div>
                          <div>
                            <input
                              {...register(`dischargeMedications.${index}.purpose`)}
                              className="input w-full"
                              placeholder="Purpose"
                            />
                          </div>
                          <div className="col-span-2 md:col-span-3">
                            <input
                              {...register(`dischargeMedications.${index}.specialInstructions`)}
                              className="input w-full"
                              placeholder="Special instructions (optional)"
                            />
                          </div>
                          <div className="col-span-2 md:col-span-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                {...register(`dischargeMedications.${index}.isNew`)}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-600">New medication (not taken before admission)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="label">Medications Discontinued (comma-separated)</label>
                  <input
                    {...register('medicationsDiscontinued')}
                    className="input w-full"
                    placeholder="List medications that were stopped during admission"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Instructions */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" />
                  Discharge Instructions
                </h3>

                <div>
                  <label className="label">Dietary Instructions *</label>
                  <VoiceDictation
                    value={dietaryInstructions}
                    onChange={(value) => setValue('dietaryInstructions', value)}
                    placeholder="Specific dietary recommendations or restrictions"
                    rows={2}
                    medicalContext="discharge"
                    showAIEnhance={true}
                    error={errors.dietaryInstructions?.message}
                  />
                </div>

                <div>
                  <label className="label">Activity Restrictions *</label>
                  <VoiceDictation
                    value={activityRestrictions}
                    onChange={(value) => setValue('activityRestrictions', value)}
                    placeholder="Physical activity guidelines and restrictions"
                    rows={2}
                    medicalContext="discharge"
                    showAIEnhance={true}
                    error={errors.activityRestrictions?.message}
                  />
                </div>

                <div>
                  <label className="label">Wound Care Instructions</label>
                  <VoiceDictation
                    value={woundCareInstructions}
                    onChange={(value) => setValue('woundCareInstructions', value)}
                    placeholder="Instructions for wound care if applicable"
                    rows={2}
                    medicalContext="wound_assessment"
                    showAIEnhance={true}
                  />
                </div>

                <div>
                  <label className="label">Warning Signs to Watch For * (comma-separated)</label>
                  <VoiceDictation
                    value={warningSignsToWatch}
                    onChange={(value) => setValue('warningSignsToWatch', value)}
                    placeholder="Symptoms that require immediate medical attention"
                    rows={2}
                    medicalContext="discharge"
                    showAIEnhance={true}
                    error={errors.warningSignsToWatch?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Emergency Contact *</label>
                    <input
                      {...register('emergencyContact')}
                      className="input w-full"
                      placeholder="Emergency phone number"
                    />
                    {errors.emergencyContact && (
                      <p className="text-red-500 text-sm mt-1">{errors.emergencyContact.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Clinic Contact *</label>
                    <input
                      {...register('clinicContact')}
                      className="input w-full"
                      placeholder="Clinic or hospital phone"
                    />
                    {errors.clinicContact && (
                      <p className="text-red-500 text-sm mt-1">{errors.clinicContact.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Follow-up */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Follow-up Appointments
                  </h3>
                  <button
                    type="button"
                    onClick={() => appendFollowUp({
                      type: 'Clinic Review',
                      department: 'Surgery',
                      scheduledDate: '',
                      doctor: '',
                      instructions: '',
                    })}
                    className="btn btn-secondary btn-sm flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Appointment
                  </button>
                </div>

                {followUpFields.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No follow-up appointments scheduled</p>
                    <p className="text-sm text-gray-400">Click "Add Appointment" to schedule follow-ups</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {followUpFields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Appointment {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeFollowUp(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              {...register(`followUpAppointments.${index}.type`)}
                              className="input w-full"
                              placeholder="Appointment type"
                            />
                          </div>
                          <div>
                            <input
                              {...register(`followUpAppointments.${index}.department`)}
                              className="input w-full"
                              placeholder="Department"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              {...register(`followUpAppointments.${index}.scheduledDate`)}
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <select
                              {...register(`followUpAppointments.${index}.doctor`)}
                              className="input w-full"
                            >
                              <option value="">Select Doctor (optional)</option>
                              {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <input
                              {...register(`followUpAppointments.${index}.instructions`)}
                              className="input w-full"
                              placeholder="Special instructions for appointment"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="label">Pending Tests (comma-separated)</label>
                  <input
                    {...register('pendingTests')}
                    className="input w-full"
                    placeholder="Any tests with pending results"
                  />
                </div>

                <div>
                  <label className="label">Pending Referrals (comma-separated)</label>
                  <input
                    {...register('pendingReferrals')}
                    className="input w-full"
                    placeholder="Any referrals that need to be followed up"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-indigo-500" />
                  Review & Complete
                </h3>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Patient</h4>
                      <p className="font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Admission #</h4>
                      <p className="font-medium">{admission.admissionNumber}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Final Diagnosis</h4>
                      <p className="font-medium">{formValues.finalDiagnosis || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Condition</h4>
                      <p className="font-medium capitalize">{formValues.conditionAtDischarge}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Disposition</h4>
                      <p className="font-medium capitalize">{formValues.dischargeDisposition?.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Discharge Medications</h4>
                      <p className="font-medium">{formValues.dischargeMedications?.length || 0} medication(s)</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Follow-up Appointments</h4>
                      <p className="font-medium">{formValues.followUpAppointments?.length || 0} appointment(s)</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Discharge Date</h4>
                      <p className="font-medium">{format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Please review all information carefully before completing the discharge. 
                    This action will update the patient's admission status and generate the discharge summary.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="btn btn-secondary flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep === 6 && (
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  className="btn btn-secondary flex items-center gap-1"
                >
                  <Download size={16} />
                  Preview PDF
                </button>
              )}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn btn-primary flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Complete Discharge
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
