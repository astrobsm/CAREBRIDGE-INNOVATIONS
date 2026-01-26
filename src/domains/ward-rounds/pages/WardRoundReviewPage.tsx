/**
 * Ward Round Review Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Allows doctors to conduct ward round reviews for admitted patients
 * Shows patient summary, allows documenting current condition, modifying treatment plans,
 * and deferring ward rounds with reasons
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInYears, differenceInDays } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Clock,
  User,
  Stethoscope,
  Activity,
  FileText,
  AlertTriangle,
  BedDouble,
  Heart,
  Droplet,
  Thermometer,
  Wind,
  Pill,
  FlaskConical,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardList,
  Edit3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import VitalsChart from '../../../components/clinical/VitalsChart';
import type { ClinicalEncounter, WardRound } from '../../../types';

// Form Schema
const wardRoundReviewSchema = z.object({
  generalCondition: z.enum(['stable', 'improving', 'unchanged', 'deteriorating', 'critical']),
  consciousness: z.enum(['alert', 'drowsy', 'confused', 'unresponsive']),
  painLevel: z.number().min(0).max(10),
  clinicalFindings: z.string().min(10, 'Please provide clinical findings'),
  assessment: z.string().min(10, 'Please provide your assessment'),
  plan: z.string().min(10, 'Please provide the plan'),
  treatmentPlanModified: z.boolean(),
  treatmentPlanChanges: z.string().optional(),
  medicationChanges: z.string().optional(),
  investigationsOrdered: z.string().optional(),
  consultationsRequested: z.string().optional(),
  nursingInstructions: z.string().optional(),
  dietaryInstructions: z.string().optional(),
  dischargeConsideration: z.enum(['not_ready', 'planning', 'within_24h', 'within_48h', 'within_week']),
  notes: z.string().optional(),
});

type WardRoundReviewFormData = z.infer<typeof wardRoundReviewSchema>;

// Defer reasons
const deferReasons = [
  { value: 'patient_in_procedure', label: 'Patient in procedure/surgery' },
  { value: 'patient_asleep', label: 'Patient asleep - rest needed' },
  { value: 'awaiting_results', label: 'Awaiting investigation results' },
  { value: 'family_meeting', label: 'Family meeting in progress' },
  { value: 'consultant_unavailable', label: 'Consultant unavailable' },
  { value: 'emergency_elsewhere', label: 'Emergency elsewhere' },
  { value: 'time_constraint', label: 'Time constraint' },
  { value: 'other', label: 'Other reason' },
];

export default function WardRoundReviewPage() {
  const { patientId, admissionId } = useParams<{ patientId: string; admissionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [deferReason, setDeferReason] = useState('');
  const [deferNotes, setDeferNotes] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'vitals', 'review']);

  // Fetch patient data
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Fetch admission data
  const admission = useLiveQuery(
    () => admissionId 
      ? db.admissions.get(admissionId)
      : patientId 
        ? db.admissions.where('patientId').equals(patientId).filter(a => a.status === 'active').first()
        : undefined,
    [patientId, admissionId]
  );

  // Fetch vital signs (last 20)
  const vitals = useLiveQuery(
    () => patientId
      ? db.vitalSigns.where('patientId').equals(patientId).reverse().limit(20).toArray()
      : [],
    [patientId]
  );

  // Fetch recent encounters
  const encounters = useLiveQuery(
    () => patientId
      ? db.clinicalEncounters.where('patientId').equals(patientId).reverse().limit(5).toArray()
      : [],
    [patientId]
  );

  // Fetch active prescriptions
  const prescriptions = useLiveQuery(
    () => patientId
      ? db.prescriptions.where('patientId').equals(patientId)
        .filter(p => p.status === 'pending' || p.status === 'dispensed' || p.status === 'partially_dispensed')
        .toArray()
      : [],
    [patientId]
  );

  // Fetch recent investigations
  const investigations = useLiveQuery(
    () => patientId
      ? db.investigations.where('patientId').equals(patientId).reverse().limit(10).toArray()
      : [],
    [patientId]
  );

  // Fetch treatment plans
  const treatmentPlans = useLiveQuery(
    () => patientId
      ? db.treatmentPlans.where('patientId').equals(patientId)
        .filter(tp => tp.status === 'active')
        .toArray()
      : [],
    [patientId]
  );

  // Fetch primary consultant info
  const primaryDoctor = useLiveQuery(
    () => admission?.primaryDoctor ? db.users.get(admission.primaryDoctor) : undefined,
    [admission?.primaryDoctor]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WardRoundReviewFormData>({
    resolver: zodResolver(wardRoundReviewSchema),
    defaultValues: {
      generalCondition: 'stable',
      consciousness: 'alert',
      painLevel: 0,
      treatmentPlanModified: false,
      dischargeConsideration: 'not_ready',
    },
  });

  // Watch form values
  const clinicalFindings = watch('clinicalFindings') || '';
  const assessment = watch('assessment') || '';
  const plan = watch('plan') || '';
  const treatmentPlanModified = watch('treatmentPlanModified');
  const treatmentPlanChanges = watch('treatmentPlanChanges') || '';
  const medicationChanges = watch('medicationChanges') || '';
  const investigationsOrdered = watch('investigationsOrdered') || '';
  const consultationsRequested = watch('consultationsRequested') || '';
  const nursingInstructions = watch('nursingInstructions') || '';
  const dietaryInstructions = watch('dietaryInstructions') || '';
  const notes = watch('notes') || '';

  // Calculate patient age
  const patientAge = patient?.dateOfBirth 
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : null;

  // Calculate admission duration
  const admissionDays = admission?.admissionDate
    ? differenceInDays(new Date(), new Date(admission.admissionDate))
    : null;

  // Latest vitals
  const latestVitals = vitals && vitals.length > 0 ? vitals[0] : null;

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Handle form submission
  const onSubmit = async (data: WardRoundReviewFormData) => {
    if (!patientId || !user || !patient) return;
    setIsSubmitting(true);

    try {
      // Create clinical encounter for ward round
      const encounter: ClinicalEncounter = {
        id: uuidv4(),
        patientId,
        hospitalId: user.hospitalId || admission?.hospitalId || 'hospital-1',
        type: 'inpatient',
        status: 'completed',
        chiefComplaint: `Ward Round Review - ${format(new Date(), 'PPP')}`,
        historyOfPresentIllness: `General Condition: ${data.generalCondition}\nConsciousness: ${data.consciousness}\nPain Level: ${data.painLevel}/10`,
        physicalExamination: {
          generalAppearance: data.clinicalFindings,
        },
        diagnosis: [{
          id: uuidv4(),
          description: admission?.admissionDiagnosis || 'Ward round assessment',
          type: 'primary',
          status: 'confirmed',
        }],
        treatmentPlan: data.plan,
        notes: `
Assessment: ${data.assessment}

Plan: ${data.plan}

${data.treatmentPlanModified ? `Treatment Plan Changes: ${data.treatmentPlanChanges}` : ''}
${data.medicationChanges ? `Medication Changes: ${data.medicationChanges}` : ''}
${data.investigationsOrdered ? `Investigations Ordered: ${data.investigationsOrdered}` : ''}
${data.consultationsRequested ? `Consultations Requested: ${data.consultationsRequested}` : ''}
${data.nursingInstructions ? `Nursing Instructions: ${data.nursingInstructions}` : ''}
${data.dietaryInstructions ? `Dietary Instructions: ${data.dietaryInstructions}` : ''}
${data.notes ? `Additional Notes: ${data.notes}` : ''}

Discharge Consideration: ${data.dischargeConsideration.replace(/_/g, ' ')}
        `.trim(),
        attendingClinician: user.id,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.clinicalEncounters.add(encounter);
      await syncRecord('clinicalEncounters', encounter as unknown as Record<string, unknown>);

      // Create ward round note
      const wardRoundNote = {
        id: uuidv4(),
        admissionId: admission?.id,
        noteType: 'ward_round' as const,
        content: JSON.stringify({
          ...data,
          reviewedBy: `${user.firstName} ${user.lastName}`,
          reviewedAt: new Date().toISOString(),
        }),
        authorId: user.id,
        authorRole: user.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.admissionNotes?.add?.(wardRoundNote);

      toast.success('Ward round review completed successfully!');
      navigate('/ward-rounds');
    } catch (error) {
      console.error('Error saving ward round review:', error);
      toast.error('Failed to save ward round review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle defer ward round
  const handleDeferRound = async () => {
    if (!deferReason) {
      toast.error('Please select a reason for deferring');
      return;
    }

    try {
      // Log deferral in admission notes
      const deferralNote = {
        id: uuidv4(),
        admissionId: admission?.id,
        noteType: 'ward_round' as const,
        content: JSON.stringify({
          type: 'deferred',
          reason: deferReason,
          notes: deferNotes,
          deferredBy: `${user?.firstName} ${user?.lastName}`,
          deferredAt: new Date().toISOString(),
        }),
        authorId: user?.id || '',
        authorRole: user?.role || 'doctor',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.admissionNotes?.add?.(deferralNote);

      toast.success('Ward round deferred');
      setShowDeferModal(false);
      navigate('/ward-rounds');
    } catch (error) {
      console.error('Error deferring ward round:', error);
      toast.error('Failed to defer ward round');
    }
  };

  if (!patient) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading patient details...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/ward-rounds')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={18} />
            Back to Ward Rounds
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-sky-500" />
            Ward Round Review
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeferModal(true)}
            className="btn btn-secondary"
          >
            <Clock size={18} />
            Defer Round
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Complete Review
              </>
            )}
          </button>
        </div>
      </div>

      {/* Patient Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => toggleSection('summary')}
          className="w-full p-4 flex items-center justify-between hover:bg-white/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div className="text-left">
              <h2 className="font-bold text-gray-900 text-lg">
                {patient.firstName} {patient.middleName || ''} {patient.lastName}
              </h2>
              <p className="text-sm text-gray-600">
                {patient.hospitalNumber} • {patientAge} years • {patient.gender}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {admission && (
              <div className="text-right">
                <span className="badge badge-success">Admitted</span>
                <p className="text-xs text-gray-500 mt-1">
                  {admission.wardName} • Bed {admission.bedNumber}
                </p>
              </div>
            )}
            {expandedSections.includes('summary') ? <ChevronUp /> : <ChevronDown />}
          </div>
        </button>

        <AnimatePresence>
          {expandedSections.includes('summary') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-sky-200"
            >
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Admission Info */}
                {admission && (
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <BedDouble className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-semibold text-gray-900">Admission</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{admissionDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ward:</span>
                        <span className="font-medium">{admission.wardName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Severity:</span>
                        <span className={`font-medium capitalize ${
                          admission.severity === 'critical' ? 'text-red-600' :
                          admission.severity === 'severe' ? 'text-orange-600' :
                          admission.severity === 'moderate' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>{admission.severity}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">Diagnosis:</p>
                      <p className="text-sm font-medium text-gray-900">{admission.admissionDiagnosis}</p>
                    </div>
                  </div>
                )}

                {/* Primary Doctor */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Care Team</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Primary Doctor:</span>
                      <p className="font-medium">{primaryDoctor ? `Dr. ${primaryDoctor.firstName} ${primaryDoctor.lastName}` : 'Not assigned'}</p>
                    </div>
                    {admission?.consultants && admission.consultants.length > 0 && (
                      <div>
                        <span className="text-gray-500">Consultants:</span>
                        <p className="font-medium">{admission.consultants.length} specialist(s)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Allergies & Conditions */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-gray-900">Alerts</h3>
                  </div>
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="mb-2">
                      <p className="text-xs text-red-600 font-medium mb-1">Allergies:</p>
                      <div className="flex flex-wrap gap-1">
                        {patient.allergies.map((allergy, idx) => (
                          <span key={idx} className="badge badge-danger text-xs">{allergy}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No known allergies</p>
                  )}
                  {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-amber-600 font-medium mb-1">Chronic Conditions:</p>
                      <div className="flex flex-wrap gap-1">
                        {patient.chronicConditions.slice(0, 3).map((condition, idx) => (
                          <span key={idx} className="badge badge-warning text-xs">{condition}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Medications */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Pill className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Medications</h3>
                  </div>
                  {prescriptions && prescriptions.length > 0 ? (
                    <div className="space-y-1">
                      {prescriptions.slice(0, 4).map((rx) => (
                        <p key={rx.id} className="text-xs text-gray-700 truncate">
                          • {rx.medicationName} {rx.dose}
                        </p>
                      ))}
                      {prescriptions.length > 4 && (
                        <p className="text-xs text-sky-600">+{prescriptions.length - 4} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No active medications</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Vitals Section with Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <button
          onClick={() => toggleSection('vitals')}
          className="w-full card-header flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Vital Signs Trend</h2>
            {latestVitals && (
              <span className="text-xs text-gray-500">
                Last recorded: {format(new Date(latestVitals.recordedAt), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
          {expandedSections.includes('vitals') ? <ChevronUp /> : <ChevronDown />}
        </button>

        <AnimatePresence>
          {expandedSections.includes('vitals') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t"
            >
              <div className="p-4">
                <VitalsChart vitals={vitals || []} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent Investigations */}
      {investigations && investigations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-cyan-500" />
            <h2 className="font-semibold text-gray-900">Recent Investigations</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {investigations.slice(0, 6).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{inv.typeName || inv.type}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(inv.requestedAt || inv.createdAt), 'MMM d')}
                    </p>
                  </div>
                  <span className={`badge text-xs ${
                    inv.status === 'completed' ? 'badge-success' :
                    inv.status === 'processing' ? 'badge-warning' :
                    'badge-secondary'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Ward Round Review Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <button
          onClick={() => toggleSection('review')}
          className="w-full card-header flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Ward Round Assessment</h2>
          </div>
          {expandedSections.includes('review') ? <ChevronUp /> : <ChevronDown />}
        </button>

        <AnimatePresence>
          {expandedSections.includes('review') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <form className="p-6 space-y-6">
                {/* General Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">General Condition *</label>
                    <select {...register('generalCondition')} className="input">
                      <option value="stable">Stable</option>
                      <option value="improving">Improving</option>
                      <option value="unchanged">Unchanged</option>
                      <option value="deteriorating">Deteriorating</option>
                      <option value="critical">Critical</option>
                    </select>
                    {errors.generalCondition && (
                      <p className="text-sm text-red-500 mt-1">{errors.generalCondition.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Consciousness Level *</label>
                    <select {...register('consciousness')} className="input">
                      <option value="alert">Alert & Oriented</option>
                      <option value="drowsy">Drowsy</option>
                      <option value="confused">Confused</option>
                      <option value="unresponsive">Unresponsive</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Pain Level (0-10) *</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      {...register('painLevel', { valueAsNumber: true })}
                      className="input"
                    />
                    {errors.painLevel && (
                      <p className="text-sm text-red-500 mt-1">{errors.painLevel.message}</p>
                    )}
                  </div>
                </div>

                {/* Clinical Findings */}
                <div>
                  <label className="label">Clinical Findings *</label>
                  <VoiceDictation
                    value={clinicalFindings}
                    onChange={(value) => setValue('clinicalFindings', value)}
                    placeholder="Document your clinical findings from examination..."
                    rows={4}
                    medicalContext="clinical_notes"
                    showAIEnhance={true}
                  />
                  {errors.clinicalFindings && (
                    <p className="text-sm text-red-500 mt-1">{errors.clinicalFindings.message}</p>
                  )}
                </div>

                {/* Assessment */}
                <div>
                  <label className="label">Assessment *</label>
                  <VoiceDictation
                    value={assessment}
                    onChange={(value) => setValue('assessment', value)}
                    placeholder="Your clinical assessment and impression..."
                    rows={3}
                    medicalContext="clinical_notes"
                    showAIEnhance={true}
                  />
                  {errors.assessment && (
                    <p className="text-sm text-red-500 mt-1">{errors.assessment.message}</p>
                  )}
                </div>

                {/* Plan */}
                <div>
                  <label className="label">Plan *</label>
                  <VoiceDictation
                    value={plan}
                    onChange={(value) => setValue('plan', value)}
                    placeholder="Management plan for today..."
                    rows={3}
                    medicalContext="clinical_notes"
                    showAIEnhance={true}
                  />
                  {errors.plan && (
                    <p className="text-sm text-red-500 mt-1">{errors.plan.message}</p>
                  )}
                </div>

                {/* Treatment Plan Modification */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      {...register('treatmentPlanModified')}
                      className="w-5 h-5 text-amber-600 rounded"
                    />
                    <label className="font-medium text-amber-900">
                      Treatment Plan Requires Modification
                    </label>
                  </div>

                  {treatmentPlanModified && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="label">Treatment Plan Changes</label>
                        <VoiceDictation
                          value={treatmentPlanChanges}
                          onChange={(value) => setValue('treatmentPlanChanges', value)}
                          placeholder="Describe changes to the treatment plan..."
                          rows={2}
                          medicalContext="treatment_plan"
                          showAIEnhance={true}
                        />
                      </div>

                      <div>
                        <label className="label">Medication Changes</label>
                        <VoiceDictation
                          value={medicationChanges}
                          onChange={(value) => setValue('medicationChanges', value)}
                          placeholder="Any medication additions, modifications, or discontinuations..."
                          rows={2}
                          medicalContext="prescription"
                          showAIEnhance={true}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Orders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Investigations to Order</label>
                    <VoiceDictation
                      value={investigationsOrdered}
                      onChange={(value) => setValue('investigationsOrdered', value)}
                      placeholder="Labs, imaging, etc..."
                      rows={2}
                      medicalContext="investigation"
                      showAIEnhance={true}
                    />
                  </div>

                  <div>
                    <label className="label">Consultations Requested</label>
                    <VoiceDictation
                      value={consultationsRequested}
                      onChange={(value) => setValue('consultationsRequested', value)}
                      placeholder="Specialty consultations needed..."
                      rows={2}
                      medicalContext="referral"
                      showAIEnhance={true}
                    />
                  </div>
                </div>

                {/* Nursing & Dietary Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nursing Instructions</label>
                    <VoiceDictation
                      value={nursingInstructions}
                      onChange={(value) => setValue('nursingInstructions', value)}
                      placeholder="Special nursing care instructions..."
                      rows={2}
                      medicalContext="nursing"
                      showAIEnhance={true}
                    />
                  </div>

                  <div>
                    <label className="label">Dietary Instructions</label>
                    <VoiceDictation
                      value={dietaryInstructions}
                      onChange={(value) => setValue('dietaryInstructions', value)}
                      placeholder="Diet modifications, restrictions..."
                      rows={2}
                      medicalContext="nutrition"
                      showAIEnhance={true}
                    />
                  </div>
                </div>

                {/* Discharge Planning */}
                <div>
                  <label className="label">Discharge Consideration</label>
                  <select {...register('dischargeConsideration')} className="input">
                    <option value="not_ready">Not Ready for Discharge</option>
                    <option value="planning">Discharge Planning Started</option>
                    <option value="within_24h">Possible within 24 hours</option>
                    <option value="within_48h">Possible within 48 hours</option>
                    <option value="within_week">Possible within the week</option>
                  </select>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="label">Additional Notes (Optional)</label>
                  <VoiceDictation
                    value={notes}
                    onChange={(value) => setValue('notes', value)}
                    placeholder="Any other observations or notes..."
                    rows={2}
                    medicalContext="clinical_notes"
                    showAIEnhance={true}
                  />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Defer Ward Round Modal */}
      <AnimatePresence>
        {showDeferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowDeferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-amber-500" />
                  Defer Ward Round
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Provide a reason for deferring this ward round review
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="label">Reason for Deferral *</label>
                  <select
                    value={deferReason}
                    onChange={(e) => setDeferReason(e.target.value)}
                    className="input"
                  >
                    <option value="">Select a reason...</option>
                    {deferReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Additional Notes (Optional)</label>
                  <textarea
                    value={deferNotes}
                    onChange={(e) => setDeferNotes(e.target.value)}
                    placeholder="Add any additional context..."
                    rows={3}
                    className="input"
                  />
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowDeferModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeferRound}
                  className="btn btn-warning flex-1"
                >
                  <Clock size={18} />
                  Defer Round
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
