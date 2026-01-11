// Against Medical Advice (AMA) Discharge Form Component
// Handles discharge against medical advice with proper documentation and legal requirements

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import {
  X,
  AlertTriangle,
  FileText,
  User,
  CheckSquare,
  Square,
  Pen,
  Shield,
  AlertCircle,
  Save,
  Printer,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import type { Admission, Patient } from '../../../types';

const amaFormSchema = z.object({
  patientStatement: z.string().min(10, 'Patient statement required'),
  reasonsForLeaving: z.string().min(10, 'Reasons for leaving required'),
  risksExplained: z.array(z.string()).min(1, 'At least one risk must be documented'),
  alternativesOffered: z.string().min(10, 'Alternatives offered must be documented'),
  patientUnderstandsRisks: z.boolean().refine(val => val === true, {
    message: 'Patient must acknowledge understanding of risks',
  }),
  patientRefusedTreatment: z.boolean().refine(val => val === true, {
    message: 'Patient must confirm refusal of continued treatment',
  }),
  patientCapableOfDecision: z.boolean().refine(val => val === true, {
    message: 'Patient capacity must be confirmed',
  }),
  witnessName: z.string().min(2, 'Witness name required'),
  witnessDesignation: z.string().min(2, 'Witness designation required'),
  patientSignature: z.string().optional(),
  witnessSignature: z.string().optional(),
  physicianSignature: z.string().optional(),
  followUpInstructions: z.string().optional(),
  medicationsGiven: z.boolean(),
  dischargeSummaryProvided: z.boolean(),
  returnInstructionsGiven: z.boolean(),
});

type AMAFormData = z.infer<typeof amaFormSchema>;

interface Props {
  admission: Admission;
  patient: Patient;
  onClose: () => void;
  onComplete: () => void;
}

const commonRisks = [
  'Worsening of current medical condition',
  'Development of complications requiring emergency treatment',
  'Permanent disability or disfigurement',
  'Need for more extensive surgery or treatment',
  'Increased risk of infection',
  'Bleeding or hemorrhage',
  'Pain and suffering',
  'Prolonged hospital stay if readmitted',
  'Higher treatment costs if condition worsens',
  'Death',
];

export default function AMADischargeForm({ admission, patient, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [customRisk, setCustomRisk] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AMAFormData>({
    resolver: zodResolver(amaFormSchema),
    defaultValues: {
      risksExplained: [],
      patientUnderstandsRisks: false,
      patientRefusedTreatment: false,
      patientCapableOfDecision: false,
      medicationsGiven: false,
      dischargeSummaryProvided: false,
      returnInstructionsGiven: false,
    },
  });

  const formValues = watch();
  void formValues; // Reserved for form validation display

  const toggleRisk = (risk: string) => {
    const newRisks = selectedRisks.includes(risk)
      ? selectedRisks.filter(r => r !== risk)
      : [...selectedRisks, risk];
    setSelectedRisks(newRisks);
    setValue('risksExplained', newRisks);
  };

  const addCustomRisk = () => {
    if (customRisk.trim() && !selectedRisks.includes(customRisk.trim())) {
      const newRisks = [...selectedRisks, customRisk.trim()];
      setSelectedRisks(newRisks);
      setValue('risksExplained', newRisks);
      setCustomRisk('');
    }
  };

  const onSubmit = async (data: AMAFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Create AMA discharge record
      const amaRecord = {
        id: uuidv4(),
        admissionId: admission.id,
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        
        dischargeDate: new Date(),
        dischargeTime: format(new Date(), 'HH:mm'),
        
        patientStatement: data.patientStatement,
        reasonsForLeaving: data.reasonsForLeaving,
        risksExplained: data.risksExplained,
        alternativesOffered: data.alternativesOffered,
        
        patientUnderstandsRisks: data.patientUnderstandsRisks,
        patientRefusedTreatment: data.patientRefusedTreatment,
        patientCapableOfDecision: data.patientCapableOfDecision,
        
        witnessName: data.witnessName,
        witnessDesignation: data.witnessDesignation,
        
        followUpInstructions: data.followUpInstructions,
        medicationsGiven: data.medicationsGiven,
        dischargeSummaryProvided: data.dischargeSummaryProvided,
        returnInstructionsGiven: data.returnInstructionsGiven,
        
        physicianId: user.id,
        physicianName: `${user.firstName} ${user.lastName}`,
        
        createdAt: new Date(),
      };

      // Save AMA record (you'd need to add this table to the database)
      // await db.amaDischarges.add(amaRecord);

      // Update admission status
      await db.admissions.update(admission.id, {
        status: 'discharged',
        dischargeDate: new Date(),
        dischargeTime: format(new Date(), 'HH:mm'),
        dischargedBy: user.id,
        dischargeType: 'against_advice',
        amaDocumentation: amaRecord,
        updatedAt: new Date(),
      });
      const updatedAdmission = await db.admissions.get(admission.id);
      if (updatedAdmission) syncRecord('admissions', updatedAdmission as unknown as Record<string, unknown>);

      toast.success('AMA discharge documented successfully');
      onComplete();
    } catch (error) {
      console.error('Error processing AMA discharge:', error);
      toast.error('Failed to process AMA discharge');
    } finally {
      setIsSubmitting(false);
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
        {/* Header - Red to indicate critical nature */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-500 to-rose-500 text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Discharge Against Medical Advice (DAMA/AMA)</h2>
              <p className="text-sm text-white/80">
                {patient.firstName} {patient.lastName} • {patient.hospitalNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">
                Important Legal Document
              </h3>
              <p className="text-sm text-red-700 mt-1">
                This form documents a patient's voluntary decision to leave the hospital against medical advice.
                Ensure all sections are completed accurately and signed by all parties. This document may be used
                as legal evidence of informed refusal of treatment.
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-250px)]">
          <div className="p-6 space-y-6">
            {/* Patient Information */}
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-500">Patient Name:</span>
                <p className="font-medium">{patient.firstName} {patient.lastName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Hospital Number:</span>
                <p className="font-medium">{patient.hospitalNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Admission Date:</span>
                <p className="font-medium">{format(new Date(admission.admissionDate), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">AMA Discharge Date:</span>
                <p className="font-medium">{format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm text-gray-500">Diagnosis:</span>
                <p className="font-medium">{admission.admissionDiagnosis}</p>
              </div>
            </div>

            {/* Patient's Statement */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <FileText size={16} className="text-gray-500" />
                Patient's Statement *
              </label>
              <textarea
                {...register('patientStatement')}
                className="input w-full"
                rows={3}
                placeholder="I, [patient name], hereby state that I have decided to leave [hospital name] against the advice of my doctors..."
              />
              {errors.patientStatement && (
                <p className="text-red-500 text-sm">{errors.patientStatement.message}</p>
              )}
            </div>

            {/* Reasons for Leaving */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <User size={16} className="text-gray-500" />
                Reasons for Leaving Against Medical Advice *
              </label>
              <textarea
                {...register('reasonsForLeaving')}
                className="input w-full"
                rows={2}
                placeholder="Document patient's stated reasons for leaving..."
              />
              {errors.reasonsForLeaving && (
                <p className="text-red-500 text-sm">{errors.reasonsForLeaving.message}</p>
              )}
            </div>

            {/* Risks Explained */}
            <div className="space-y-3">
              <label className="label flex items-center gap-2">
                <AlertTriangle size={16} className="text-gray-500" />
                Risks Explained to Patient *
              </label>
              <p className="text-sm text-gray-500">Select all risks that were explained to the patient:</p>
              <div className="grid md:grid-cols-2 gap-2">
                {commonRisks.map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => toggleRisk(risk)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                      selectedRisks.includes(risk)
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {selectedRisks.includes(risk) ? (
                      <CheckSquare className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 flex-shrink-0" />
                    )}
                    {risk}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRisk}
                  onChange={e => setCustomRisk(e.target.value)}
                  placeholder="Add custom risk..."
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={addCustomRisk}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>
              {errors.risksExplained && (
                <p className="text-red-500 text-sm">{errors.risksExplained.message}</p>
              )}
            </div>

            {/* Alternatives Offered */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Shield size={16} className="text-gray-500" />
                Alternatives Offered to Patient *
              </label>
              <textarea
                {...register('alternativesOffered')}
                className="input w-full"
                rows={2}
                placeholder="Document alternatives offered (e.g., continued hospitalization, outpatient treatment, transfer to another facility)..."
              />
              {errors.alternativesOffered && (
                <p className="text-red-500 text-sm">{errors.alternativesOffered.message}</p>
              )}
            </div>

            {/* Acknowledgments */}
            <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <CheckSquare size={18} />
                Patient Acknowledgments
              </h3>
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('patientCapableOfDecision')}
                  className="mt-1 rounded"
                />
                <span className="text-sm text-yellow-900">
                  <strong>Capacity Confirmed:</strong> I confirm that the patient has been assessed and is capable
                  of making informed decisions about their medical care.
                </span>
              </label>
              {errors.patientCapableOfDecision && (
                <p className="text-red-500 text-sm">{errors.patientCapableOfDecision.message}</p>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('patientUnderstandsRisks')}
                  className="mt-1 rounded"
                />
                <span className="text-sm text-yellow-900">
                  <strong>Risks Understood:</strong> The patient acknowledges understanding the risks of leaving
                  against medical advice, including the possibility of serious harm or death.
                </span>
              </label>
              {errors.patientUnderstandsRisks && (
                <p className="text-red-500 text-sm">{errors.patientUnderstandsRisks.message}</p>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('patientRefusedTreatment')}
                  className="mt-1 rounded"
                />
                <span className="text-sm text-yellow-900">
                  <strong>Treatment Refused:</strong> The patient confirms voluntary refusal of further
                  recommended medical treatment and hospitalisation.
                </span>
              </label>
              {errors.patientRefusedTreatment && (
                <p className="text-red-500 text-sm">{errors.patientRefusedTreatment.message}</p>
              )}
            </div>

            {/* Witness Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="label">Witness Name *</label>
                <input
                  {...register('witnessName')}
                  className="input w-full"
                  placeholder="Full name of witness"
                />
                {errors.witnessName && (
                  <p className="text-red-500 text-sm">{errors.witnessName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="label">Witness Designation *</label>
                <input
                  {...register('witnessDesignation')}
                  className="input w-full"
                  placeholder="e.g., Registered Nurse, Security Officer"
                />
                {errors.witnessDesignation && (
                  <p className="text-red-500 text-sm">{errors.witnessDesignation.message}</p>
                )}
              </div>
            </div>

            {/* Discharge Provisions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Discharge Provisions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('medicationsGiven')}
                    className="rounded"
                  />
                  <span className="text-sm">Medications provided</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('dischargeSummaryProvided')}
                    className="rounded"
                  />
                  <span className="text-sm">Discharge summary given</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('returnInstructionsGiven')}
                    className="rounded"
                  />
                  <span className="text-sm">Return instructions given</span>
                </label>
              </div>
            </div>

            {/* Follow-up Instructions */}
            <div className="space-y-2">
              <label className="label">Follow-up Instructions (if accepted by patient)</label>
              <textarea
                {...register('followUpInstructions')}
                className="input w-full"
                rows={2}
                placeholder="Any follow-up care instructions provided to the patient..."
              />
            </div>

            {/* Signature Areas */}
            <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div className="text-center p-4 border-b md:border-b-0 md:border-r">
                <Pen className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 mb-2">Patient Signature</p>
                <div className="h-16 border-b-2 border-gray-300" />
                <p className="text-xs text-gray-400 mt-1">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
              <div className="text-center p-4 border-b md:border-b-0 md:border-r">
                <Pen className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 mb-2">Witness Signature</p>
                <div className="h-16 border-b-2 border-gray-300" />
                <p className="text-xs text-gray-400 mt-1">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
              <div className="text-center p-4">
                <Pen className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 mb-2">Physician Signature</p>
                <div className="h-16 border-b-2 border-gray-300" />
                <p className="text-xs text-gray-400 mt-1">{user ? `${user.firstName} ${user.lastName}` : 'Physician'}</p>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
              <p className="font-semibold mb-2">LEGAL DISCLAIMER</p>
              <p>
                By signing this form, the patient acknowledges that they are leaving the hospital against the
                explicit medical advice of the attending physician(s). The patient releases the hospital, its
                staff, and physicians from any liability for consequences that may result from this decision.
                The patient has been informed that they may return at any time if they change their mind or if
                their condition worsens.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary flex items-center gap-2">
                <Printer size={16} />
                Print Form
              </button>
              <button type="button" className="btn btn-secondary flex items-center gap-2">
                <Download size={16} />
                Download PDF
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Complete AMA Discharge
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
