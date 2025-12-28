/**
 * NPWT (Negative Pressure Wound Therapy) Page
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive NPWT tracking with cycle management,
 * material tracking, and progress monitoring.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays } from 'date-fns';
import {
  Wind,
  Plus,
  Search,
  User,
  Calendar,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell,
  X,
  Activity,
  Layers,
  Settings,
  FileText,
  TrendingUp,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import type { Patient } from '../../../types';
import type { 
  NPWTSession, 
  WoundType, 
  WoundClass, 
  NPWTCycleType,
  NPWTAgentsUsed,
  CleaningAgentsUsed,
} from '../types';
import { WOUND_TYPES, WOUND_CLASSES } from '../types';

// Form validation schema
const npwtFormSchema = z.object({
  woundType: z.string().min(1, 'Wound type is required'),
  woundClass: z.string().min(1, 'Wound class is required'),
  woundLocation: z.string().min(1, 'Wound location is required'),
  length: z.number().min(0.1, 'Length is required'),
  width: z.number().min(0.1, 'Width is required'),
  depth: z.number().min(0, 'Depth is required'),
  undermining: z.string().optional(),
  tunneling: z.string().optional(),
  machineCode: z.string().min(1, 'Machine code is required'),
  timerCode: z.string().min(1, 'Timer code is required'),
  cycleType: z.enum(['4_day', '7_day']),
  cycleNumber: z.number().min(1, 'Cycle number is required'),
  pressureSetting: z.number().min(50).max(200),
  therapyMode: z.enum(['continuous', 'intermittent']),
  sessionDate: z.string().min(1, 'Session date is required'),
  woundCondition: z.enum(['improving', 'stable', 'deteriorating']),
  exudateAmount: z.enum(['none', 'scant', 'moderate', 'heavy']),
  exudateType: z.enum(['serous', 'serosanguinous', 'sanguinous', 'purulent']),
  granulationPercent: z.number().min(0).max(100),
  clinicalNotes: z.string().optional(),
  complications: z.string().optional(),
  foamsUsed: z.number().min(0),
  opsiteFilmsUsed: z.number().min(0),
  otherMaterials: z.string().optional(),
});

type NPWTFormData = z.infer<typeof npwtFormSchema>;

export default function NPWTPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<NPWTSession[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCycle, setFilterCycle] = useState<'all' | '4_day' | '7_day'>('all');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);

  // Agents checkboxes state
  const [agentsUsed, setAgentsUsed] = useState<NPWTAgentsUsed>({
    heraGel: false,
    honeycareGauze: false,
    sofratule: false,
  });
  const [cleaningAgents, setCleaningAgents] = useState<CleaningAgentsUsed>({
    saline: false,
    woundClex: false,
    hydrogenPeroxide: false,
    povidoneIodine: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NPWTFormData>({
    resolver: zodResolver(npwtFormSchema),
    defaultValues: {
      cycleType: '4_day',
      cycleNumber: 1,
      pressureSetting: 125,
      therapyMode: 'continuous',
      woundCondition: 'stable',
      exudateAmount: 'moderate',
      exudateType: 'serous',
      granulationPercent: 50,
      foamsUsed: 1,
      opsiteFilmsUsed: 1,
    },
  });

  const cycleType = watch('cycleType');

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch NPWT sessions from IndexedDB
        const allSessions = await db.table('npwtSessions').toArray();
        setSessions(allSessions as NPWTSession[]);

        // Fetch active patients
        const activePatients = await db.patients.filter(p => p.isActive === true).toArray();
        setPatients(activePatients);
      } catch (error) {
        console.error('Error fetching NPWT data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Calculate next change date
  const calculateNextChangeDate = (sessionDate: string, cycleType: NPWTCycleType): Date => {
    const date = new Date(sessionDate);
    const daysToAdd = cycleType === '4_day' ? 4 : 7;
    return addDays(date, daysToAdd);
  };

  // Submit new session
  const onSubmit = async (data: NPWTFormData) => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      const nextChangeDate = calculateNextChangeDate(data.sessionDate, data.cycleType as NPWTCycleType);

      const newSession: NPWTSession = {
        id: uuidv4(),
        patientId: selectedPatient.id,
        hospitalId: user?.hospitalId || 'hospital-1',
        woundType: data.woundType as WoundType,
        woundClass: data.woundClass as WoundClass,
        woundLocation: data.woundLocation,
        dimensions: {
          length: data.length,
          width: data.width,
          depth: data.depth,
          undermining: data.undermining,
          tunneling: data.tunneling,
        },
        machineCode: data.machineCode,
        timerCode: data.timerCode,
        cycleType: data.cycleType as NPWTCycleType,
        cycleNumber: data.cycleNumber,
        pressureSetting: data.pressureSetting,
        therapyMode: data.therapyMode,
        sessionDate: new Date(data.sessionDate),
        nextChangeDate,
        notificationSent: false,
        agentsUsed,
        cleaningAgents,
        materials: {
          foamsUsed: data.foamsUsed,
          opsiteFilmsUsed: data.opsiteFilmsUsed,
          otherMaterials: data.otherMaterials,
        },
        imageBase64: imagePreview || undefined,
        woundCondition: data.woundCondition,
        exudateAmount: data.exudateAmount,
        exudateType: data.exudateType,
        granulationPercent: data.granulationPercent,
        clinicalNotes: data.clinicalNotes,
        complications: data.complications,
        performedBy: user?.id || '',
        performedByName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
      };

      // Save to database
      await db.table('npwtSessions').add(newSession);

      // Schedule notification (would integrate with service worker)
      scheduleNotification(newSession);

      setSessions(prev => [newSession, ...prev]);
      toast.success('NPWT session recorded successfully!');
      resetForm();
    } catch (error) {
      console.error('Error saving NPWT session:', error);
      toast.error('Failed to save NPWT session');
    }
  };

  // Schedule push notification
  const scheduleNotification = (session: NPWTSession) => {
    // This would integrate with the service worker for push notifications
    // For now, we'll just log the scheduled notification
    console.log('Notification scheduled for:', session.nextChangeDate);
    
    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationTime = new Date(session.nextChangeDate);
      notificationTime.setHours(notificationTime.getHours() - 24);
      
      const timeUntilNotification = notificationTime.getTime() - Date.now();
      if (timeUntilNotification > 0) {
        setTimeout(() => {
          new Notification('NPWT Dressing Change Reminder', {
            body: `Patient ${selectedPatient?.firstName} ${selectedPatient?.lastName} is due for NPWT dressing change tomorrow.`,
            icon: '/icons/icon-192x192.png',
          });
        }, timeUntilNotification);
      }
    }
  };

  // Reset form
  const resetForm = () => {
    reset();
    setSelectedPatient(null);
    setImagePreview(null);
    setAgentsUsed({ heraGel: false, honeycareGauze: false, sofratule: false });
    setCleaningAgents({ saline: false, woundClex: false, hydrogenPeroxide: false, povidoneIodine: false });
    setShowNewSession(false);
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const patient = patients.find(p => p.id === session.patientId);
    const matchesSearch = !searchTerm || 
      patient?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.machineCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCycle = filterCycle === 'all' || session.cycleType === filterCycle;
    return matchesSearch && matchesCycle;
  });

  // Get upcoming changes (within 48 hours)
  const upcomingChanges = sessions.filter(session => {
    const now = new Date();
    const changeDate = new Date(session.nextChangeDate);
    const hoursUntilChange = (changeDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilChange > 0 && hoursUntilChange <= 48;
  });

  // Get overdue changes
  const overdueChanges = sessions.filter(session => {
    const now = new Date();
    const changeDate = new Date(session.nextChangeDate);
    return changeDate < now;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Wind className="w-7 h-7 text-purple-600" />
            NPWT Management
          </h1>
          <p className="text-gray-600 mt-1">Negative Pressure Wound Therapy tracking and monitoring</p>
        </div>
        <button
          onClick={() => setShowNewSession(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New NPWT Session
        </button>
      </div>

      {/* Alert Cards */}
      {(upcomingChanges.length > 0 || overdueChanges.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueChanges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">Overdue Changes</h3>
                  <p className="text-sm text-red-600">{overdueChanges.length} patient(s) overdue for dressing change</p>
                </div>
              </div>
            </motion.div>
          )}
          {upcomingChanges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800">Upcoming Changes</h3>
                  <p className="text-sm text-amber-600">{upcomingChanges.length} patient(s) due within 48 hours</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wind className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              <p className="text-xs text-gray-500">Total Sessions</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.woundCondition === 'improving').length}
              </p>
              <p className="text-xs text-gray-500">Improving</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.cycleType === '4_day').length}
              </p>
              <p className="text-xs text-gray-500">4-Day Cycles</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.cycleType === '7_day').length}
              </p>
              <p className="text-xs text-gray-500">7-Day Cycles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name or machine code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={filterCycle}
          onChange={(e) => setFilterCycle(e.target.value as any)}
          className="input w-full md:w-48"
        >
          <option value="all">All Cycles</option>
          <option value="4_day">4-Day Cycle</option>
          <option value="7_day">7-Day Cycle</option>
        </select>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="card p-8 text-center">
            <Wind className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No NPWT Sessions Found</h3>
            <p className="text-gray-500 mt-1">Start by creating a new NPWT session</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const patient = patients.find(p => p.id === session.patientId);
            const isOverdue = new Date(session.nextChangeDate) < new Date();
            const woundTypeLabel = WOUND_TYPES.find(w => w.value === session.woundType)?.label || session.woundType;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card p-4 hover:shadow-md transition-shadow ${
                  isOverdue ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {session.imageBase64 ? (
                      <img
                        src={session.imageBase64}
                        alt="Wound"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                      </h3>
                      <p className="text-sm text-gray-600">{woundTypeLabel} - {session.woundLocation}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          session.cycleType === '4_day' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {session.cycleType === '4_day' ? '4-Day' : '7-Day'} Cycle #{session.cycleNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          session.woundCondition === 'improving' 
                            ? 'bg-green-100 text-green-700'
                            : session.woundCondition === 'stable'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {session.woundCondition.charAt(0).toUpperCase() + session.woundCondition.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {format(new Date(session.sessionDate), 'MMM d, yyyy')}
                    </p>
                    <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {isOverdue ? 'OVERDUE' : `Next: ${format(new Date(session.nextChangeDate), 'MMM d')}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Machine: {session.machineCode}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* New Session Modal */}
      <AnimatePresence>
        {showNewSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8"
            onClick={() => setShowNewSession(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-xl w-full max-w-4xl mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Wind className="w-6 h-6 text-purple-600" />
                  New NPWT Session
                </h2>
                <button onClick={() => setShowNewSession(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Patient Selection */}
                <div className="card p-4 bg-gray-50">
                  <label className="label flex items-center gap-2">
                    <User size={16} />
                    Select Patient *
                  </label>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-sm text-gray-500">{selectedPatient.hospitalNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPatientSelector(true)}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    >
                      <User className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">Click to select a patient</p>
                    </button>
                  )}
                </div>

                {/* Wound Information */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Layers size={18} />
                    Wound Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Wound Type *</label>
                      <select {...register('woundType')} className={`input ${errors.woundType ? 'input-error' : ''}`}>
                        <option value="">Select wound type</option>
                        {WOUND_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {errors.woundType && <p className="text-sm text-red-500 mt-1">{errors.woundType.message}</p>}
                    </div>
                    <div>
                      <label className="label">Wound Class *</label>
                      <select {...register('woundClass')} className={`input ${errors.woundClass ? 'input-error' : ''}`}>
                        <option value="">Select wound class</option>
                        {WOUND_CLASSES.map((cls) => (
                          <option key={cls.value} value={cls.value}>{cls.label}</option>
                        ))}
                      </select>
                      {errors.woundClass && <p className="text-sm text-red-500 mt-1">{errors.woundClass.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Wound Location *</label>
                      <input
                        {...register('woundLocation')}
                        placeholder="e.g., Left lower limb, anterior aspect"
                        className={`input ${errors.woundLocation ? 'input-error' : ''}`}
                      />
                      {errors.woundLocation && <p className="text-sm text-red-500 mt-1">{errors.woundLocation.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Wound Dimensions */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Wound Dimensions (cm)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Length *</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('length', { valueAsNumber: true })}
                        className={`input ${errors.length ? 'input-error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="label">Width *</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('width', { valueAsNumber: true })}
                        className={`input ${errors.width ? 'input-error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="label">Depth *</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('depth', { valueAsNumber: true })}
                        className={`input ${errors.depth ? 'input-error' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="label">Undermining (if present)</label>
                      <input {...register('undermining')} placeholder="e.g., 2cm at 3 o'clock" className="input" />
                    </div>
                    <div>
                      <label className="label">Tunneling (if present)</label>
                      <input {...register('tunneling')} placeholder="e.g., 1.5cm at 9 o'clock" className="input" />
                    </div>
                  </div>
                </div>

                {/* NPWT Settings */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings size={18} />
                    NPWT Settings
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="label">Machine Code *</label>
                      <input
                        {...register('machineCode')}
                        placeholder="e.g., VAC-001"
                        className={`input ${errors.machineCode ? 'input-error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="label">Timer Code *</label>
                      <input
                        {...register('timerCode')}
                        placeholder="e.g., T-2024-001"
                        className={`input ${errors.timerCode ? 'input-error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="label">Pressure (mmHg) *</label>
                      <input
                        type="number"
                        {...register('pressureSetting', { valueAsNumber: true })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Therapy Mode *</label>
                      <select {...register('therapyMode')} className="input">
                        <option value="continuous">Continuous</option>
                        <option value="intermittent">Intermittent</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cycle Information */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={18} />
                    Cycle Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="label">Cycle Type *</label>
                      <select {...register('cycleType')} className="input">
                        <option value="4_day">4-Day Cycle</option>
                        <option value="7_day">7-Day Cycle</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Cycle Number *</label>
                      <select {...register('cycleNumber', { valueAsNumber: true })} className="input">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <option key={n} value={n}>{n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} Cycle</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Session Date *</label>
                      <input
                        type="date"
                        {...register('sessionDate')}
                        className={`input ${errors.sessionDate ? 'input-error' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="label">Next Change</label>
                      <p className="input bg-gray-50">
                        {watch('sessionDate') 
                          ? format(calculateNextChangeDate(watch('sessionDate'), cycleType as NPWTCycleType), 'MMM d, yyyy')
                          : 'Select date'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agents Used */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package size={18} />
                    Agents & Materials Used
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Wound Agents */}
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="font-medium text-purple-800 mb-3">Wound Dressing Agents</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={agentsUsed.heraGel}
                            onChange={(e) => setAgentsUsed(prev => ({ ...prev, heraGel: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span>Hera Gel</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={agentsUsed.honeycareGauze}
                            onChange={(e) => setAgentsUsed(prev => ({ ...prev, honeycareGauze: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span>Honeycare Gauze</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={agentsUsed.sofratule}
                            onChange={(e) => setAgentsUsed(prev => ({ ...prev, sofratule: e.target.checked }))}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span>Sofratule</span>
                        </label>
                      </div>
                    </div>

                    {/* Cleaning Agents */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-800 mb-3">Cleaning Agents</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cleaningAgents.saline}
                            onChange={(e) => setCleaningAgents(prev => ({ ...prev, saline: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Normal Saline</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cleaningAgents.woundClex}
                            onChange={(e) => setCleaningAgents(prev => ({ ...prev, woundClex: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Wound Clex</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cleaningAgents.hydrogenPeroxide}
                            onChange={(e) => setCleaningAgents(prev => ({ ...prev, hydrogenPeroxide: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Hydrogen Peroxide</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={cleaningAgents.povidoneIodine}
                            onChange={(e) => setCleaningAgents(prev => ({ ...prev, povidoneIodine: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span>Povidone Iodine</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Materials Count */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="label">Number of Foams Used</label>
                      <input
                        type="number"
                        {...register('foamsUsed', { valueAsNumber: true })}
                        className="input"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="label">Number of Opsite Films Used</label>
                      <input
                        type="number"
                        {...register('opsiteFilmsUsed', { valueAsNumber: true })}
                        className="input"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="label">Other Materials</label>
                      <input {...register('otherMaterials')} className="input" placeholder="Specify other materials" />
                    </div>
                  </div>
                </div>

                {/* Wound Assessment */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity size={18} />
                    Wound Assessment
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="label">Wound Condition</label>
                      <select {...register('woundCondition')} className="input">
                        <option value="improving">Improving</option>
                        <option value="stable">Stable</option>
                        <option value="deteriorating">Deteriorating</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Exudate Amount</label>
                      <select {...register('exudateAmount')} className="input">
                        <option value="none">None</option>
                        <option value="scant">Scant</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Exudate Type</label>
                      <select {...register('exudateType')} className="input">
                        <option value="serous">Serous (Clear)</option>
                        <option value="serosanguinous">Serosanguinous (Pink)</option>
                        <option value="sanguinous">Sanguinous (Bloody)</option>
                        <option value="purulent">Purulent (Pus)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Granulation %</label>
                      <input
                        type="number"
                        {...register('granulationPercent', { valueAsNumber: true })}
                        className="input"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Camera size={18} />
                    Progress Photo
                  </h3>
                  <div className="flex items-start gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Wound" className="w-32 h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setImagePreview(null)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">
                        Upload a clear photo of the wound to track healing progress over time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clinical Notes */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText size={18} />
                    Clinical Notes
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Session Notes</label>
                      <textarea
                        {...register('clinicalNotes')}
                        rows={3}
                        className="input"
                        placeholder="Document any observations, patient response, etc."
                      />
                    </div>
                    <div>
                      <label className="label">Complications (if any)</label>
                      <textarea
                        {...register('complications')}
                        rows={2}
                        className="input"
                        placeholder="Document any complications encountered"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={resetForm} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Save NPWT Session
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Selector Modal */}
      {showPatientSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Select Patient</h3>
              <button onClick={() => setShowPatientSelector(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <PatientSelector
              onChange={(_patientId, patient) => {
                if (patient) {
                  setSelectedPatient(patient);
                  setShowPatientSelector(false);
                }
              }}
              placeholder="Search for a patient..."
              showAddNew={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
