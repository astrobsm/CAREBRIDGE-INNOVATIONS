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
  Activity,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Scale,
  Ruler,
  AlertCircle,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord, fullSync } from '../../../services/cloudSyncService';
import { recordVitalSignsEarning } from '../../../services/staffEarningsService';
import { EntryTrackingBadge } from '../../../components/common';
import type { EntryTrackingInfo } from '../../../components/common';
import type { VitalSigns, User } from '../../../types';
import { format } from 'date-fns';
import { convertGlucose, type GlucoseUnit } from '../../../services/bloodGlucoseService';

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
  const [showCharts, setShowCharts] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bloodGlucoseUnit, setBloodGlucoseUnit] = useState<GlucoseUnit>('mmol/L');

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Get more vitals for charting (last 20 readings), sorted by recordedAt descending (newest first)
  const previousVitals = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const allVitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
      // Sort by recordedAt descending (newest first) and limit to 20
      return allVitals
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .slice(0, 20);
    },
    [patientId]
  );

  // Fetch users for entry tracking display
  const users = useLiveQuery(() => db.users.toArray(), []);
  
  // Create a map for quick user lookup
  const usersMap = useMemo(() => {
    const map = new Map<string, User>();
    if (users) {
      users.forEach(u => map.set(u.id!, u));
    }
    return map;
  }, [users]);

  // Helper to get entry tracking info for a vital sign
  const getEntryTracking = (vital: VitalSigns): EntryTrackingInfo | undefined => {
    const recordedByUser = usersMap.get(vital.recordedBy);
    if (recordedByUser) {
      return {
        userId: recordedByUser.id!,
        userName: `${recordedByUser.firstName} ${recordedByUser.lastName}`,
        userRole: recordedByUser.role,
        timestamp: vital.recordedAt,
      };
    }
    return undefined;
  };

  // Trigger sync on mount and periodically to ensure cross-device consistency
  useEffect(() => {
    const triggerSync = async () => {
      try {
        await fullSync();
      } catch (err) {
        console.warn('Background sync failed:', err);
      }
    };
    
    // Sync on mount
    triggerSync();
    
    // Set up polling every 15 seconds for this page
    const interval = setInterval(triggerSync, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Manual sync function
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fullSync();
      toast.success('Data synced successfully!');
    } catch (err) {
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Prepare chart data (reverse to show chronological order)
  const chartData = previousVitals
    ? [...previousVitals].reverse().map((v, index) => ({
        index: index + 1,
        time: format(new Date(v.recordedAt), 'MMM d HH:mm'),
        temperature: v.temperature,
        pulse: v.pulse,
        systolic: v.bloodPressureSystolic,
        diastolic: v.bloodPressureDiastolic,
        spo2: v.oxygenSaturation,
        rr: v.respiratoryRate,
      }))
    : [];

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
      const vitalsId = uuidv4();

      const vitals: VitalSigns = {
        id: vitalsId,
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
        // Store blood glucose in mmol/L (convert if entered in mg/dL)
        bloodGlucose: data.bloodGlucose 
          ? (bloodGlucoseUnit === 'mg/dL' 
              ? convertGlucose(data.bloodGlucose, 'mg/dL', 'mmol/L') 
              : data.bloodGlucose)
          : undefined,
        notes: data.notes,
        recordedBy: user.id,
        recordedAt: new Date(),
      };

      await db.vitalSigns.add(vitals);
      await syncRecord('vitalSigns', vitals as unknown as Record<string, unknown>);

      // Record staff earnings for vital signs entry (₦500)
      // Tracking info (user, time, location) is stored in the billing record
      try {
        await recordVitalSignsEarning(
          vitalsId,
          patientId,
          user.id!,
          `${user.firstName} ${user.lastName}`,
          user.role,
          patient?.registeredHospitalId || user.hospitalId || 'hospital-1'
        );
      } catch (earningsError) {
        console.warn('Failed to record vital signs earnings:', earningsError);
      }

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
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-7 h-7 text-emerald-500" />
              Record Vital Signs
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`btn ${showCharts ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
            >
              <BarChart3 size={18} />
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn btn-secondary flex items-center gap-2"
              title="Sync with cloud"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Vital Signs Trend Charts */}
      <AnimatePresence>
        {showCharts && chartData.length > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h2 className="font-semibold text-gray-900">Vital Signs Trends</h2>
                <span className="text-sm text-gray-500">({chartData.length} readings)</span>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Heart Rate & Blood Pressure Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Heart size={16} className="text-red-500" />
                      Heart Rate & Blood Pressure
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="time" 
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                          />
                          <YAxis 
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                            domain={[40, 180]}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: 'none', 
                              borderRadius: '8px',
                              color: 'white'
                            }}
                          />
                          <Legend fontSize={10} />
                          <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" opacity={0.5} />
                          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} />
                          <Line 
                            type="monotone" 
                            dataKey="pulse" 
                            name="Pulse (bpm)"
                            stroke="#ef4444" 
                            strokeWidth={2}
                            dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="systolic" 
                            name="Systolic BP"
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="diastolic" 
                            name="Diastolic BP"
                            stroke="#06b6d4" 
                            strokeWidth={2}
                            dot={{ fill: '#06b6d4', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Temperature & SpO2 Chart */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Thermometer size={16} className="text-orange-500" />
                      Temperature & Oxygen Saturation
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="time" 
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                          />
                          <YAxis 
                            yAxisId="temp"
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                            domain={[35, 40]}
                            orientation="left"
                          />
                          <YAxis 
                            yAxisId="spo2"
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                            domain={[85, 100]}
                            orientation="right"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: 'none', 
                              borderRadius: '8px',
                              color: 'white'
                            }}
                          />
                          <Legend fontSize={10} />
                          <ReferenceLine yAxisId="temp" y={37.5} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} />
                          <ReferenceLine yAxisId="spo2" y={95} stroke="#22c55e" strokeDasharray="5 5" opacity={0.5} />
                          <Line 
                            yAxisId="temp"
                            type="monotone" 
                            dataKey="temperature" 
                            name="Temp (°C)"
                            stroke="#f97316" 
                            strokeWidth={2}
                            dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            yAxisId="spo2"
                            type="monotone" 
                            dataKey="spo2" 
                            name="SpO2 (%)"
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Respiratory Rate Chart */}
                  <div className="bg-gray-50 rounded-lg p-4 lg:col-span-2">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Wind size={16} className="text-blue-500" />
                      Respiratory Rate Trend
                    </h3>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="time" 
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                          />
                          <YAxis 
                            fontSize={10} 
                            tick={{ fill: '#6b7280' }}
                            tickLine={false}
                            domain={[8, 30]}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: 'none', 
                              borderRadius: '8px',
                              color: 'white'
                            }}
                          />
                          <Legend fontSize={10} />
                          <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} />
                          <ReferenceLine y={12} stroke="#22c55e" strokeDasharray="5 5" opacity={0.5} />
                          <Line 
                            type="monotone" 
                            dataKey="rr" 
                            name="Resp. Rate (breaths/min)"
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Legend for reference lines */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-amber-500 opacity-50" style={{ borderStyle: 'dashed' }}></div>
                    <span>Warning threshold</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-green-500 opacity-50" style={{ borderStyle: 'dashed' }}></div>
                    <span>Normal threshold</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {chartData.length <= 1 && showCharts && (
        <div className="mb-6 card">
          <div className="card-body text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Charts will appear after recording at least 2 vital sign entries.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Vitals Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
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
              <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <div className="sm:col-span-2 p-4 bg-gray-50 rounded-lg">
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
                  <label className="label">Blood Glucose</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step={bloodGlucoseUnit === 'mmol/L' ? '0.1' : '1'}
                      {...register('bloodGlucose', { valueAsNumber: true })}
                      className="input flex-1"
                      placeholder={bloodGlucoseUnit === 'mmol/L' ? '4.0 - 7.0' : '72 - 126'}
                    />
                    <select
                      value={bloodGlucoseUnit}
                      onChange={(e) => setBloodGlucoseUnit(e.target.value as GlucoseUnit)}
                      className="input w-28"
                      title="Blood glucose unit"
                    >
                      <option value="mmol/L">mmol/L</option>
                      <option value="mg/dL">mg/dL</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Normal fasting: {bloodGlucoseUnit === 'mmol/L' ? '4.0 - 5.4 mmol/L' : '72 - 99 mg/dL'}
                  </p>
                </div>

                <div className="sm:col-span-2">
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
                    <p className="text-xs text-gray-500 mb-1">
                      {format(new Date(vital.recordedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                    {/* Entry Tracking Badge */}
                    {getEntryTracking(vital) && (
                      <div className="mb-2">
                        <EntryTrackingBadge 
                          tracking={getEntryTracking(vital)!} 
                          mode="compact" 
                        />
                      </div>
                    )}
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
