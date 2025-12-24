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
  Activity,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Scale,
  Ruler,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { VitalSigns } from '../../../types';
import { format } from 'date-fns';

const vitalsSchema = z.object({
  temperature: z.number().min(30).max(45),
  pulse: z.number().min(20).max(250),
  respiratoryRate: z.number().min(5).max(60),
  bloodPressureSystolic: z.number().min(50).max(300),
  bloodPressureDiastolic: z.number().min(30).max(200),
  oxygenSaturation: z.number().min(50).max(100),
  weight: z.number().min(0.5).max(500).optional(),
  height: z.number().min(20).max(300).optional(),
  painScore: z.number().min(0).max(10).optional(),
  bloodGlucose: z.number().min(0).max(50).optional(),
  notes: z.string().optional(),
});

type VitalsFormData = z.infer<typeof vitalsSchema>;

export default function VitalsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const previousVitals = useLiveQuery(
    () => patientId
      ? db.vitalSigns.where('patientId').equals(patientId).reverse().limit(10).toArray()
      : [],
    [patientId]
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VitalsFormData>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      temperature: 36.5,
      pulse: 72,
      respiratoryRate: 16,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      oxygenSaturation: 98,
    },
  });

  const weight = watch('weight');
  const height = watch('height');

  const calculateBMI = (): number | undefined => {
    if (weight && height) {
      const heightInMeters = height / 100;
      return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
    }
    return undefined;
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-600' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600' };
    return { label: 'Obese', color: 'text-red-600' };
  };

  const getVitalStatus = (type: string, value: number): 'normal' | 'warning' | 'critical' => {
    switch (type) {
      case 'temperature':
        if (value < 35 || value > 39) return 'critical';
        if (value < 36 || value > 38) return 'warning';
        return 'normal';
      case 'pulse':
        if (value < 40 || value > 150) return 'critical';
        if (value < 60 || value > 100) return 'warning';
        return 'normal';
      case 'systolic':
        if (value < 80 || value > 180) return 'critical';
        if (value < 90 || value > 140) return 'warning';
        return 'normal';
      case 'diastolic':
        if (value < 50 || value > 120) return 'critical';
        if (value < 60 || value > 90) return 'warning';
        return 'normal';
      case 'spo2':
        if (value < 90) return 'critical';
        if (value < 95) return 'warning';
        return 'normal';
      case 'rr':
        if (value < 8 || value > 30) return 'critical';
        if (value < 12 || value > 20) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const onSubmit = async (data: VitalsFormData) => {
    if (!patientId || !user) return;
    setIsLoading(true);

    try {
      const bmi = calculateBMI();

      const vitals: VitalSigns = {
        id: uuidv4(),
        patientId,
        temperature: data.temperature,
        pulse: data.pulse,
        respiratoryRate: data.respiratoryRate,
        bloodPressureSystolic: data.bloodPressureSystolic,
        bloodPressureDiastolic: data.bloodPressureDiastolic,
        oxygenSaturation: data.oxygenSaturation,
        weight: data.weight,
        height: data.height,
        bmi,
        painScore: data.painScore,
        bloodGlucose: data.bloodGlucose,
        notes: data.notes,
        recordedBy: user.id,
        recordedAt: new Date(),
      };

      await db.vitalSigns.add(vitals);
      toast.success('Vital signs recorded successfully!');
      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error('Error recording vitals:', error);
      toast.error('Failed to record vital signs');
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

  const bmi = calculateBMI();

  return (
    <div className="max-w-4xl mx-auto">
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
              <Activity className="w-7 h-7 text-emerald-500" />
              Record Vital Signs
            </h1>
            <p className="text-gray-600 mt-1">
              Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Core Vitals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <Heart className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-gray-900">Core Vital Signs</h2>
              </div>
              <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <Thermometer size={16} className="text-orange-500" />
                    Temperature (°C) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('temperature', { valueAsNumber: true })}
                    className={`input ${errors.temperature ? 'input-error' : ''}`}
                  />
                  {errors.temperature && (
                    <p className="text-sm text-red-500 mt-1">{errors.temperature.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Heart size={16} className="text-red-500" />
                    Pulse (bpm) *
                  </label>
                  <input
                    type="number"
                    {...register('pulse', { valueAsNumber: true })}
                    className={`input ${errors.pulse ? 'input-error' : ''}`}
                  />
                  {errors.pulse && (
                    <p className="text-sm text-red-500 mt-1">{errors.pulse.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Wind size={16} className="text-blue-500" />
                    Respiratory Rate (breaths/min) *
                  </label>
                  <input
                    type="number"
                    {...register('respiratoryRate', { valueAsNumber: true })}
                    className={`input ${errors.respiratoryRate ? 'input-error' : ''}`}
                  />
                  {errors.respiratoryRate && (
                    <p className="text-sm text-red-500 mt-1">{errors.respiratoryRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Droplets size={16} className="text-sky-500" />
                    Oxygen Saturation (%) *
                  </label>
                  <input
                    type="number"
                    {...register('oxygenSaturation', { valueAsNumber: true })}
                    className={`input ${errors.oxygenSaturation ? 'input-error' : ''}`}
                  />
                  {errors.oxygenSaturation && (
                    <p className="text-sm text-red-500 mt-1">{errors.oxygenSaturation.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Systolic BP (mmHg) *</label>
                  <input
                    type="number"
                    {...register('bloodPressureSystolic', { valueAsNumber: true })}
                    className={`input ${errors.bloodPressureSystolic ? 'input-error' : ''}`}
                  />
                  {errors.bloodPressureSystolic && (
                    <p className="text-sm text-red-500 mt-1">{errors.bloodPressureSystolic.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Diastolic BP (mmHg) *</label>
                  <input
                    type="number"
                    {...register('bloodPressureDiastolic', { valueAsNumber: true })}
                    className={`input ${errors.bloodPressureDiastolic ? 'input-error' : ''}`}
                  />
                  {errors.bloodPressureDiastolic && (
                    <p className="text-sm text-red-500 mt-1">{errors.bloodPressureDiastolic.message}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Additional Measurements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <Scale className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900">Additional Measurements</h2>
              </div>
              <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-2">
                    <Scale size={16} className="text-purple-500" />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('weight', { valueAsNumber: true })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <Ruler size={16} className="text-indigo-500" />
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('height', { valueAsNumber: true })}
                    className="input"
                  />
                </div>

                {bmi && (
                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Calculated BMI:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{bmi}</span>
                        <span className={`font-medium ${getBMICategory(bmi).color}`}>
                          ({getBMICategory(bmi).label})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    Pain Score (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    {...register('painScore', { valueAsNumber: true })}
                    className="input"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>No pain</span>
                    <span>Worst pain</span>
                  </div>
                </div>

                <div>
                  <label className="label">Blood Glucose (mmol/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('bloodGlucose', { valueAsNumber: true })}
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input"
                    placeholder="Any additional observations..."
                  />
                </div>
              </div>
            </motion.div>

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
                    Save Vitals
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Previous Vitals */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card sticky top-6"
          >
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Previous Readings</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {previousVitals && previousVitals.length > 0 ? (
                previousVitals.map((vital) => (
                  <div key={vital.id} className="p-4">
                    <p className="text-xs text-gray-500 mb-2">
                      {format(new Date(vital.recordedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Temp:</span>
                        <span className={`font-medium ${
                          getVitalStatus('temperature', vital.temperature) === 'critical' ? 'text-red-600' :
                          getVitalStatus('temperature', vital.temperature) === 'warning' ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {vital.temperature}°C
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pulse:</span>
                        <span className={`font-medium ${
                          getVitalStatus('pulse', vital.pulse) === 'critical' ? 'text-red-600' :
                          getVitalStatus('pulse', vital.pulse) === 'warning' ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {vital.pulse}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">BP:</span>
                        <span className="font-medium text-gray-900">
                          {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">SpO2:</span>
                        <span className={`font-medium ${
                          getVitalStatus('spo2', vital.oxygenSaturation) === 'critical' ? 'text-red-600' :
                          getVitalStatus('spo2', vital.oxygenSaturation) === 'warning' ? 'text-amber-600' :
                          'text-gray-900'
                        }`}>
                          {vital.oxygenSaturation}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No previous vitals recorded</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
