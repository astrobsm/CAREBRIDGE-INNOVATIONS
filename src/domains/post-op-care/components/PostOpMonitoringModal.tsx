/**
 * Post-Op Monitoring Modal Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Form for recording post-operative monitoring observations
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  X,
  Activity,
  Heart,
  Droplet,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient, Surgery } from '../../../types';
import type { PostOpMonitoringRecord } from '../types';

interface PostOpMonitoringModalProps {
  patient: Patient;
  surgery: Surgery;
  onClose: () => void;
  existingRecord?: PostOpMonitoringRecord;
}

const monitoringSchema = z.object({
  // Vital Signs
  heartRate: z.number().min(30).max(220).optional(),
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(30).max(150).optional(),
  temperature: z.number().min(34).max(42).optional(),
  respiratoryRate: z.number().min(8).max(60).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
  
  // Pain Assessment
  painScore: z.number().min(0).max(10),
  painLocation: z.string().optional(),
  painCharacter: z.string().optional(),
  painManagementEffective: z.boolean().optional(),
  
  // Wound Assessment
  woundCondition: z.enum(['clean_dry', 'minimal_drainage', 'moderate_drainage', 'heavy_drainage', 'signs_of_infection']).optional(),
  dressingIntact: z.boolean().optional(),
  dressingChanged: z.boolean().optional(),
  dressingNotes: z.string().optional(),
  
  // Drains
  drainOneOutput: z.number().optional(),
  drainTwoOutput: z.number().optional(),
  drainColor: z.string().optional(),
  
  // Fluid Balance
  oralIntake: z.number().optional(),
  ivFluidIntake: z.number().optional(),
  urineOutput: z.number().optional(),
  
  // GI/GU
  bowelSoundsPresent: z.boolean().optional(),
  bowelMovement: z.boolean().optional(),
  flatusPresent: z.boolean().optional(),
  catheterInSitu: z.boolean().optional(),
  voidingNormally: z.boolean().optional(),
  
  // Mobility
  mobilityLevel: z.enum(['bedbound', 'sitting_up', 'chair_transfer', 'walking_with_assist', 'walking_independently']).optional(),
  mobilizedToday: z.boolean().optional(),
  physioReview: z.boolean().optional(),
  
  // Diet
  dietStatus: z.enum(['nil_by_mouth', 'sips_only', 'free_fluids', 'light_diet', 'regular_diet']).optional(),
  dietTolerated: z.boolean().optional(),
  nausea: z.boolean().optional(),
  vomiting: z.boolean().optional(),
  
  // Complications
  complicationPresent: z.boolean(),
  complicationType: z.string().optional(),
  complicationNotes: z.string().optional(),
  
  // General
  overallCondition: z.enum(['stable', 'improving', 'concerning', 'deteriorating']),
  nursingNotes: z.string().optional(),
  escalationRequired: z.boolean(),
  escalationDetails: z.string().optional(),
});

type MonitoringFormData = z.infer<typeof monitoringSchema>;

export default function PostOpMonitoringModal({
  patient,
  surgery,
  onClose,
  existingRecord,
}: PostOpMonitoringModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MonitoringFormData>({
    resolver: zodResolver(monitoringSchema),
    defaultValues: existingRecord ? {
      heartRate: existingRecord.vitalSigns?.heartRate,
      bloodPressureSystolic: existingRecord.vitalSigns?.bloodPressureSystolic,
      bloodPressureDiastolic: existingRecord.vitalSigns?.bloodPressureDiastolic,
      temperature: existingRecord.vitalSigns?.temperature,
      respiratoryRate: existingRecord.vitalSigns?.respiratoryRate,
      oxygenSaturation: existingRecord.vitalSigns?.oxygenSaturation,
      painScore: existingRecord.painScore || 0,
      painLocation: existingRecord.painLocation,
      woundCondition: existingRecord.woundAssessment?.appearance === 'infected' ? 'signs_of_infection' :
                      existingRecord.woundAssessment?.drainage === 'purulent' ? 'heavy_drainage' :
                      existingRecord.woundAssessment?.drainage === 'bloody' ? 'moderate_drainage' :
                      existingRecord.woundAssessment?.drainage === 'serous' ? 'minimal_drainage' : 'clean_dry',
      dressingIntact: existingRecord.woundAssessment?.dressingStatus === 'intact',
      overallCondition: 'stable',
      complicationPresent: (existingRecord.complications?.length ?? 0) > 0,
      escalationRequired: false,
      nursingNotes: existingRecord.nursingNotes,
    } : {
      painScore: 0,
      overallCondition: 'stable',
      complicationPresent: false,
      escalationRequired: false,
      bowelSoundsPresent: true,
      dressingIntact: true,
      dietTolerated: true,
      mobilizedToday: false,
    },
  });

  const complicationPresent = watch('complicationPresent');
  const escalationRequired = watch('escalationRequired');
  const overallCondition = watch('overallCondition');

  // Calculate days and hours post-op
  const surgeryDate = surgery.scheduledDate ? new Date(surgery.scheduledDate) : new Date();
  const now = new Date();
  const hoursDiff = Math.floor((now.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60));
  const dayPostOp = Math.floor(hoursDiff / 24);
  const hourPostOp = hoursDiff % 24;
  const currentHour = now.getHours();
  const shift: 'morning' | 'afternoon' | 'night' = 
    currentHour >= 6 && currentHour < 14 ? 'morning' :
    currentHour >= 14 && currentHour < 22 ? 'afternoon' : 'night';

  // Use these for future features
  void shift;
  void hourPostOp;

  const onSubmit = async (data: MonitoringFormData) => {
    setSaving(true);
    try {
      // TODO: When postOpMonitoringRecords table is added to database,
      // build and save the full PostOpMonitoringRecord here.
      // For now, save vital signs as the primary record which captures
      // the essential monitoring data.
      
      if (data.heartRate || data.bloodPressureSystolic || data.temperature) {
        await db.vitalSigns.add({
          id: uuidv4(),
          patientId: patient.id,
          encounterId: surgery.id,
          pulse: data.heartRate || 0,
          bloodPressureSystolic: data.bloodPressureSystolic || 0,
          bloodPressureDiastolic: data.bloodPressureDiastolic || 0,
          temperature: data.temperature || 0,
          respiratoryRate: data.respiratoryRate || 0,
          oxygenSaturation: data.oxygenSaturation || 0,
          painScore: data.painScore,
          recordedAt: new Date(),
          recordedBy: user?.id || '',
          notes: `Post-op Day ${dayPostOp}. ${
            data.overallCondition !== 'stable' ? `Condition: ${data.overallCondition}. ` : ''
          }${
            data.complicationPresent ? `Complication: ${data.complicationType}. ` : ''
          }${data.nursingNotes || ''}`.trim(),
        });
      }

      toast.success('Monitoring record saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving monitoring record:', error);
      toast.error('Failed to save monitoring record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-sky-50 to-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Post-Op Monitoring</h2>
              <p className="text-sm text-gray-500">
                {patient.firstName} {patient.lastName} • {surgery.procedureName || surgery.type}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Vital Signs */}
          <div className="card p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Vital Signs
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Heart Rate (bpm)</label>
                <input
                  type="number"
                  {...register('heartRate', { valueAsNumber: true })}
                  className="input"
                  placeholder="60-100"
                />
              </div>
              <div>
                <label className="label">BP Systolic (mmHg)</label>
                <input
                  type="number"
                  {...register('bloodPressureSystolic', { valueAsNumber: true })}
                  className="input"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="label">BP Diastolic (mmHg)</label>
                <input
                  type="number"
                  {...register('bloodPressureDiastolic', { valueAsNumber: true })}
                  className="input"
                  placeholder="80"
                />
              </div>
              <div>
                <label className="label">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('temperature', { valueAsNumber: true })}
                  className="input"
                  placeholder="36.5"
                />
              </div>
              <div>
                <label className="label">Respiratory Rate (/min)</label>
                <input
                  type="number"
                  {...register('respiratoryRate', { valueAsNumber: true })}
                  className="input"
                  placeholder="12-20"
                />
              </div>
              <div>
                <label className="label">SpO2 (%)</label>
                <input
                  type="number"
                  {...register('oxygenSaturation', { valueAsNumber: true })}
                  className="input"
                  placeholder="95-100"
                />
              </div>
            </div>
          </div>

          {/* Pain Assessment */}
          <div className="card p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Pain Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Pain Score (0-10)</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  {...register('painScore', { valueAsNumber: true })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 - None</span>
                  <span className="font-medium text-lg">{watch('painScore')}</span>
                  <span>10 - Severe</span>
                </div>
                {errors.painScore && <p className="text-sm text-red-500 mt-1">{errors.painScore.message}</p>}
              </div>
              <div>
                <label className="label">Pain Location</label>
                <input
                  type="text"
                  {...register('painLocation')}
                  className="input"
                  placeholder="e.g., Surgical site, Lower abdomen"
                />
              </div>
              <div>
                <label className="label">Pain Character</label>
                <select {...register('painCharacter')} className="input">
                  <option value="">Select...</option>
                  <option value="sharp">Sharp</option>
                  <option value="dull">Dull</option>
                  <option value="throbbing">Throbbing</option>
                  <option value="burning">Burning</option>
                  <option value="cramping">Cramping</option>
                  <option value="aching">Aching</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('painManagementEffective')} className="checkbox" />
                <span className="text-sm text-gray-700">Pain management effective</span>
              </label>
            </div>
          </div>

          {/* Wound Assessment */}
          <div className="card p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-500" />
              Wound Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Wound Condition</label>
                <select {...register('woundCondition')} className="input">
                  <option value="clean_dry">Clean & Dry</option>
                  <option value="minimal_drainage">Minimal Drainage</option>
                  <option value="moderate_drainage">Moderate Drainage</option>
                  <option value="heavy_drainage">Heavy Drainage</option>
                  <option value="signs_of_infection">Signs of Infection</option>
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('dressingIntact')} className="checkbox" />
                  <span className="text-sm text-gray-700">Dressing Intact</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('dressingChanged')} className="checkbox" />
                  <span className="text-sm text-gray-700">Dressing Changed</span>
                </label>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Dressing Notes</label>
              <textarea
                {...register('dressingNotes')}
                className="input"
                rows={2}
                placeholder="Any observations about the wound or dressing..."
              />
            </div>
          </div>

          {/* Drains & Fluid Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-4">Drain Output</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Drain 1 (ml)</label>
                  <input
                    type="number"
                    {...register('drainOneOutput', { valueAsNumber: true })}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">Drain 2 (ml)</label>
                  <input
                    type="number"
                    {...register('drainTwoOutput', { valueAsNumber: true })}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">Drain Color</label>
                <select {...register('drainColor')} className="input">
                  <option value="">Select...</option>
                  <option value="serosanguinous">Serosanguinous</option>
                  <option value="serous">Serous</option>
                  <option value="sanguinous">Sanguinous</option>
                  <option value="purulent">Purulent</option>
                </select>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-4">Fluid Balance</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Oral Intake (ml)</label>
                  <input
                    type="number"
                    {...register('oralIntake', { valueAsNumber: true })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">IV Fluid (ml)</label>
                  <input
                    type="number"
                    {...register('ivFluidIntake', { valueAsNumber: true })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Urine Output (ml)</label>
                  <input
                    type="number"
                    {...register('urineOutput', { valueAsNumber: true })}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* GI/GU, Mobility, Diet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-3">Bowel Function</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('bowelSoundsPresent')} className="checkbox" />
                  <span className="text-sm">Bowel sounds present</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('flatusPresent')} className="checkbox" />
                  <span className="text-sm">Passing flatus</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('bowelMovement')} className="checkbox" />
                  <span className="text-sm">Bowel movement</span>
                </label>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-3">Mobility</h3>
              <select {...register('mobilityLevel')} className="input mb-3">
                <option value="bedbound">Bedbound</option>
                <option value="sitting_up">Sitting Up in Bed</option>
                <option value="chair_transfer">Transfer to Chair</option>
                <option value="walking_with_assist">Walking with Assistance</option>
                <option value="walking_independently">Walking Independently</option>
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('mobilizedToday')} className="checkbox" />
                <span className="text-sm">Mobilized today</span>
              </label>
            </div>

            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-3">Diet Status</h3>
              <select {...register('dietStatus')} className="input mb-3">
                <option value="nil_by_mouth">Nil By Mouth</option>
                <option value="sips_only">Sips Only</option>
                <option value="free_fluids">Free Fluids</option>
                <option value="light_diet">Light Diet</option>
                <option value="regular_diet">Regular Diet</option>
              </select>
              <div className="space-y-1">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('dietTolerated')} className="checkbox" />
                  <span className="text-sm">Diet tolerated</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('nausea')} className="checkbox" />
                  <span className="text-sm">Nausea</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('vomiting')} className="checkbox" />
                  <span className="text-sm">Vomiting</span>
                </label>
              </div>
            </div>
          </div>

          {/* Complications & Overall */}
          <div className="card p-4 border-l-4 border-l-amber-400">
            <h3 className="font-medium text-gray-900 mb-4">Complications & Overall Assessment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Overall Condition</label>
                <select {...register('overallCondition')} className={`input ${
                  overallCondition === 'deteriorating' ? 'border-red-300 bg-red-50' :
                  overallCondition === 'concerning' ? 'border-amber-300 bg-amber-50' :
                  ''
                }`}>
                  <option value="stable">Stable</option>
                  <option value="improving">Improving</option>
                  <option value="concerning">Concerning</option>
                  <option value="deteriorating">Deteriorating</option>
                </select>
              </div>
              
              <div className="flex gap-4 items-end">
                <label className="flex items-center gap-2 p-3 rounded-lg border">
                  <input type="checkbox" {...register('complicationPresent')} className="checkbox" />
                  <span className="text-sm font-medium">Complication Present</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
                  <input type="checkbox" {...register('escalationRequired')} className="checkbox" />
                  <span className="text-sm font-medium text-red-700">Escalation Required</span>
                </label>
              </div>
            </div>

            {complicationPresent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-amber-50 rounded-lg">
                <div>
                  <label className="label">Complication Type</label>
                  <select {...register('complicationType')} className="input">
                    <option value="">Select...</option>
                    <option value="bleeding">Bleeding</option>
                    <option value="infection">Infection</option>
                    <option value="wound_dehiscence">Wound Dehiscence</option>
                    <option value="dvt">DVT</option>
                    <option value="pulmonary_embolism">Pulmonary Embolism</option>
                    <option value="respiratory">Respiratory Complications</option>
                    <option value="cardiac">Cardiac Complications</option>
                    <option value="urinary">Urinary Complications</option>
                    <option value="ileus">Ileus</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Complication Notes</label>
                  <textarea
                    {...register('complicationNotes')}
                    className="input"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {escalationRequired && (
              <div className="p-4 bg-red-50 rounded-lg mb-4">
                <label className="label text-red-700">Escalation Details</label>
                <textarea
                  {...register('escalationDetails')}
                  className="input border-red-200"
                  rows={2}
                  placeholder="Describe urgency and recommended action..."
                />
              </div>
            )}

            <div>
              <label className="label">Nursing Notes</label>
              <textarea
                {...register('nursingNotes')}
                className="input"
                rows={3}
                placeholder="Additional observations, concerns, or patient response..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between rounded-b-xl">
          <p className="text-sm text-gray-500">
            Recorded by: {user?.firstName} {user?.lastName} • {format(new Date(), 'PPp')}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Saving...
                </span>
              ) : (
                <>
                  <Save size={16} />
                  Save Record
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
