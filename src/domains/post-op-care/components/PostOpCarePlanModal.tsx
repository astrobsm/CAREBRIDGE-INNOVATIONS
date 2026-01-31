/**
 * Post-Op Care Plan Modal
 * AstroHEALTH Innovations in Healthcare
 * 
 * Modal for viewing and creating post-operative care plans
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  ClipboardList,
  Activity,
  Heart,
  AlertTriangle,
  Target,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { VoiceDictation } from '../../../components/common';
import type { Surgery, Patient, Admission } from '../../../types';
import type { PostOpCarePlan } from '../types';

const carePlanSchema = z.object({
  vitalSignsFrequency: z.enum(['hourly', '2_hourly', '4_hourly', '6_hourly', '8_hourly', '12_hourly', 'daily']),
  woundCareInstructions: z.string().min(1, 'Wound care instructions are required'),
  nursingInstructions: z.string().optional(),
  doctorInstructions: z.string().optional(),
  patientInstructions: z.string().optional(),
  warningSignsToWatch: z.array(z.string()).optional(),
  specialMonitoring: z.array(z.string()).optional(),
});

type CarePlanFormData = z.infer<typeof carePlanSchema>;

interface PostOpCarePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  surgery: Surgery;
  admission?: Admission;
  existingPlan?: PostOpCarePlan;
  onSave?: (plan: PostOpCarePlan) => void;
}

const vitalFrequencyOptions = [
  { value: 'hourly', label: 'Hourly' },
  { value: '2_hourly', label: 'Every 2 Hours' },
  { value: '4_hourly', label: 'Every 4 Hours' },
  { value: '6_hourly', label: 'Every 6 Hours' },
  { value: '8_hourly', label: 'Every 8 Hours' },
  { value: '12_hourly', label: 'Every 12 Hours' },
  { value: 'daily', label: 'Daily' },
];

const commonWarnings = [
  'Fever > 38.5°C',
  'Increasing wound pain or redness',
  'Wound discharge or bleeding',
  'Shortness of breath',
  'Chest pain',
  'Leg swelling or pain',
  'Nausea and vomiting',
  'Unable to pass urine',
  'Abdominal distension',
  'Change in consciousness',
];

const commonMonitoring = [
  'Blood glucose monitoring',
  'Urine output monitoring',
  'Drain output monitoring',
  'Neurological observations',
  'Blood pressure monitoring (hypertensive)',
  'Oxygen saturation monitoring',
  'DVT prophylaxis assessment',
  'Pain score assessment',
];

export default function PostOpCarePlanModal({
  isOpen,
  onClose,
  patient,
  surgery,
  admission,
  existingPlan,
  onSave,
}: PostOpCarePlanModalProps) {
  const { user } = useAuth();
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>(existingPlan?.warningSignsToWatch || []);
  const [selectedMonitoring, setSelectedMonitoring] = useState<string[]>(existingPlan?.specialMonitoring || []);
  const [customWarning, setCustomWarning] = useState('');
  const [customMonitoring, setCustomMonitoring] = useState('');

  const form = useForm<CarePlanFormData>({
    resolver: zodResolver(carePlanSchema),
    defaultValues: {
      vitalSignsFrequency: existingPlan?.vitalSignsFrequency || '4_hourly',
      woundCareInstructions: existingPlan?.woundCareInstructions || '',
      nursingInstructions: existingPlan?.nursingInstructions || '',
      doctorInstructions: existingPlan?.doctorInstructions || '',
      patientInstructions: existingPlan?.patientInstructions || '',
    },
  });

  const woundCare = form.watch('woundCareInstructions');
  const nursingInstructions = form.watch('nursingInstructions');
  const doctorInstructions = form.watch('doctorInstructions');
  const patientInstructions = form.watch('patientInstructions');

  useEffect(() => {
    if (existingPlan) {
      setSelectedWarnings(existingPlan.warningSignsToWatch || []);
      setSelectedMonitoring(existingPlan.specialMonitoring || []);
    }
  }, [existingPlan]);

  const handleAddCustomWarning = () => {
    if (customWarning.trim() && !selectedWarnings.includes(customWarning.trim())) {
      setSelectedWarnings([...selectedWarnings, customWarning.trim()]);
      setCustomWarning('');
    }
  };

  const handleAddCustomMonitoring = () => {
    if (customMonitoring.trim() && !selectedMonitoring.includes(customMonitoring.trim())) {
      setSelectedMonitoring([...selectedMonitoring, customMonitoring.trim()]);
      setCustomMonitoring('');
    }
  };

  const handleSubmit = async (data: CarePlanFormData) => {
    if (!user) return;

    try {
      // Get surgeon info - surgeonId may be undefined
      const surgeonId = surgery.surgeonId || '';
      const surgeon = surgeonId ? await db.users.get(surgeonId) : undefined;
      
      const carePlan: PostOpCarePlan = {
        id: existingPlan?.id || uuidv4(),
        patientId: patient.id,
        surgeryId: surgery.id,
        surgeryDate: new Date(surgery.scheduledDate),
        surgeryName: surgery.procedureName,
        surgeonId: surgeonId,
        surgeonName: surgeon ? `${surgeon.firstName} ${surgeon.lastName}` : surgery.surgeon || 'Unknown',
        hospitalId: surgery.hospitalId,
        
        vitalSignsFrequency: data.vitalSignsFrequency,
        painManagementProtocol: {
          primaryAnalgesic: 'Paracetamol',
          dosage: '1g',
          frequency: data.vitalSignsFrequency === 'hourly' ? 'Every 4 hours PRN' : 'Every 6 hours PRN',
          route: 'oral',
          rescueMedication: 'Tramadol 50mg',
          rescueDosage: '50-100mg',
          maxDailyDose: '400mg',
        },
        woundCareInstructions: data.woundCareInstructions,
        mobilizationPlan: [
          { day: 0, activity: 'Bed rest with position changes every 2 hours', instructions: 'Prevent pressure sores' },
          { day: 1, activity: 'Sit at edge of bed, assisted to chair', instructions: 'Early mobilization' },
          { day: 2, activity: 'Walk with assistance', instructions: 'Increase mobility progressively' },
          { day: 3, activity: 'Walk independently if stable', instructions: 'Aim for independence' },
        ],
        dietProgression: [
          { day: 0, dietType: 'Nil by mouth', instructions: '6-12 hours post-op' },
          { day: 0, dietType: 'Sips of water', instructions: 'If no nausea after initial period' },
          { day: 1, dietType: 'Clear fluids', instructions: 'As tolerated' },
          { day: 1, dietType: 'Light diet', instructions: 'Progress if tolerating fluids' },
          { day: 2, dietType: 'Regular diet', instructions: 'When tolerating light diet' },
        ],
        medicationSchedule: [],
        
        specialMonitoring: selectedMonitoring,
        warningSignsToWatch: selectedWarnings,
        expectedRecoveryMilestones: [
          { day: 1, milestone: 'Mobilize to chair', expectedBy: 'Day 1 post-op', achieved: false },
          { day: 2, milestone: 'Walk with assistance', expectedBy: 'Day 2 post-op', achieved: false },
          { day: 3, milestone: 'Tolerate regular diet', expectedBy: 'Day 3 post-op', achieved: false },
          { day: 5, milestone: 'Independent mobility', expectedBy: 'Day 5 post-op', achieved: false },
        ],
        
        nursingInstructions: data.nursingInstructions || '',
        doctorInstructions: data.doctorInstructions || '',
        patientInstructions: data.patientInstructions || '',
        
        status: 'active',
        createdBy: user.id,
        createdAt: existingPlan?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      if (existingPlan) {
        await db.table('postOpCarePlans').update(existingPlan.id, carePlan);
      } else {
        await db.table('postOpCarePlans').add(carePlan);
      }
      
      syncRecord('postOpCarePlans', carePlan as unknown as Record<string, unknown>);
      
      toast.success(existingPlan ? 'Care plan updated' : 'Care plan created');
      onSave?.(carePlan);
      onClose();
    } catch (error) {
      console.error('Error saving care plan:', error);
      toast.error('Failed to save care plan');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 rounded-xl">
                  <ClipboardList className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {existingPlan ? 'Edit Care Plan' : 'Create Post-Op Care Plan'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {patient.firstName} {patient.lastName} • {surgery.procedureName}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close modal" title="Close">
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
            {/* Surgery Info Card */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Surgery Date</span>
                  <p className="font-medium">{format(new Date(surgery.scheduledDate), 'PPP')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Procedure</span>
                  <p className="font-medium">{surgery.procedureName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Ward</span>
                  <p className="font-medium">{admission?.wardName || 'Not assigned'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Bed</span>
                  <p className="font-medium">{admission?.bedNumber || 'Not assigned'}</p>
                </div>
              </div>
            </div>

            {/* Vital Signs Monitoring */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Vital Signs Monitoring</h3>
              </div>
              <select {...form.register('vitalSignsFrequency')} className="input">
                {vitalFrequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Wound Care Instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">Wound Care Instructions *</h3>
              </div>
              <VoiceDictation
                value={woundCare}
                onChange={(val) => form.setValue('woundCareInstructions', val)}
                placeholder="Enter wound care instructions..."
                rows={3}
                medicalContext="wound_assessment"
              />
              {form.formState.errors.woundCareInstructions && (
                <p className="text-sm text-red-500">{form.formState.errors.woundCareInstructions.message}</p>
              )}
            </div>

            {/* Warning Signs to Watch */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Warning Signs to Watch</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonWarnings.map((warning) => (
                  <label key={warning} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedWarnings.includes(warning)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWarnings([...selectedWarnings, warning]);
                        } else {
                          setSelectedWarnings(selectedWarnings.filter(w => w !== warning));
                        }
                      }}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    {warning}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customWarning}
                  onChange={(e) => setCustomWarning(e.target.value)}
                  placeholder="Add custom warning sign..."
                  className="input flex-1"
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomWarning}
                  className="btn btn-secondary"
                  aria-label="Add custom warning sign"
                  title="Add warning"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Special Monitoring */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <h3 className="font-semibold text-gray-900">Special Monitoring Requirements</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonMonitoring.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMonitoring.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMonitoring([...selectedMonitoring, item]);
                        } else {
                          setSelectedMonitoring(selectedMonitoring.filter(m => m !== item));
                        }
                      }}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    {item}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMonitoring}
                  onChange={(e) => setCustomMonitoring(e.target.value)}
                  placeholder="Add custom monitoring requirement..."
                  className="input flex-1"
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomMonitoring}
                  className="btn btn-secondary"
                  aria-label="Add custom monitoring requirement"
                  title="Add monitoring"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="label">Nursing Instructions</label>
                <VoiceDictation
                  value={nursingInstructions || ''}
                  onChange={(val) => form.setValue('nursingInstructions', val)}
                  placeholder="Special nursing care..."
                  rows={3}
                  medicalContext="clinical_notes"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Doctor Instructions</label>
                <VoiceDictation
                  value={doctorInstructions || ''}
                  onChange={(val) => form.setValue('doctorInstructions', val)}
                  placeholder="Medical orders..."
                  rows={3}
                  medicalContext="clinical_notes"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Patient Instructions</label>
                <VoiceDictation
                  value={patientInstructions || ''}
                  onChange={(val) => form.setValue('patientInstructions', val)}
                  placeholder="Patient education..."
                  rows={3}
                  medicalContext="clinical_notes"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1">
                <Save size={18} />
                {existingPlan ? 'Update Care Plan' : 'Create Care Plan'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
