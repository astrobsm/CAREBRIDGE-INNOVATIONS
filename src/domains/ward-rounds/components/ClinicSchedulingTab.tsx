// Clinic Scheduling Component
// Manages clinic sessions with doctor and nurse assignments across hospitals

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Save,
  Calendar,
  Clock,
  Building2,
  Users,
  Stethoscope,
  MapPin,
  Play,
  CheckCircle,
  Edit2,
  Trash2,
  Bell,
  UserCheck,
  UserPlus,
  FileText,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isTomorrow, isPast, addDays, isSameDay } from 'date-fns';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { HospitalSelector } from '../../../components/hospital';
import { VoiceDictation } from '../../../components/common';
import type { ClinicSession } from '../../../types';

// Clinic session schema - updated for multiple clinicians and single nurse
const clinicSessionSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital is required'),
  clinicianIds: z.array(z.string()).min(1, 'At least one doctor/surgeon is required'),
  assignedNurseId: z.string().optional(),
  sessionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  clinicType: z.string().min(1, 'Clinic type is required'),
  location: z.string().min(1, 'Location is required'),
  maxPatients: z.number().min(1, 'At least 1 patient slot required').max(100),
  notes: z.string().optional(),
});

type ClinicSessionFormData = z.infer<typeof clinicSessionSchema>;

const clinicTypes = [
  { value: 'surgical_outpatient', label: 'Surgical Outpatient', icon: '🏥' },
  { value: 'wound_clinic', label: 'Wound Clinic', icon: '🩹' },
  { value: 'burn_clinic', label: 'Burn Clinic', icon: '🔥' },
  { value: 'plastic_surgery', label: 'Plastic Surgery Clinic', icon: '✨' },
  { value: 'reconstructive', label: 'Reconstructive Surgery', icon: '🔧' },
  { value: 'pediatric', label: 'Pediatric Clinic', icon: '👶' },
  { value: 'emergency', label: 'Emergency Clinic', icon: '🚨' },
  { value: 'dressing_change', label: 'Dressing Change Clinic', icon: '🩹' },
  { value: 'follow_up', label: 'Follow-up Clinic', icon: '📋' },
  { value: 'pre_operative', label: 'Pre-operative Assessment', icon: '📝' },
  { value: 'post_operative', label: 'Post-operative Review', icon: '✅' },
  { value: 'telemedicine', label: 'Telemedicine Clinic', icon: '💻' },
  { value: 'other', label: 'Other', icon: '📌' },
];

interface ClinicSchedulingTabProps {
  searchQuery: string;
  selectedHospital: string;
}

export default function ClinicSchedulingTab({ searchQuery, selectedHospital }: ClinicSchedulingTabProps) {
  useAuth(); // For authentication check
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ClinicSession | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('week');
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Fetch data - include records where isActive is true or undefined (backward compatibility)
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive !== false).toArray(), []);
  const users = useLiveQuery(() => db.users.filter(u => u.isActive !== false).toArray(), []);
  const clinicSessions = useLiveQuery(() => db.clinicSessions.orderBy('sessionDate').reverse().toArray(), []);
  const allPatients = useLiveQuery(() => db.patients.filter(p => p.isActive !== false).toArray(), []);
  const allEncounters = useLiveQuery(() => db.clinicalEncounters.toArray(), []);

  // Build a map: sessionDate+hospitalId → encounters on that day at that hospital
  const encountersBySession = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!allEncounters || !clinicSessions) return map;

    for (const session of clinicSessions) {
      const sessionDate = new Date(session.sessionDate);
      const matching = allEncounters.filter(enc => {
        const encDate = new Date(enc.createdAt);
        return enc.hospitalId === session.hospitalId && isSameDay(encDate, sessionDate);
      });
      map.set(session.id, matching);
    }
    return map;
  }, [allEncounters, clinicSessions]);

  // Build patient lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, any>();
    allPatients?.forEach(p => map.set(p.id!, p));
    return map;
  }, [allPatients]);

  // Get doctors for clinicians
  const doctors = useMemo(() => 
    users?.filter(u => ['surgeon', 'doctor', 'plastic_surgeon', 'anaesthetist'].includes(u.role)) || [],
    [users]
  );

  // Get nurses for assignments
  const nurses = useMemo(() => 
    users?.filter(u => u.role === 'nurse') || [],
    [users]
  );

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!clinicSessions) return [];
    
    let filtered = clinicSessions;
    
    // Hospital filter
    if (selectedHospital !== 'all') {
      filtered = filtered.filter(s => s.hospitalId === selectedHospital);
    }
    
    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(s => isToday(new Date(s.sessionDate)));
    } else if (dateFilter === 'week') {
      const weekEnd = addDays(now, 7);
      filtered = filtered.filter(s => {
        const date = new Date(s.sessionDate);
        return date >= now && date <= weekEnd;
      });
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.clinicType.toLowerCase().includes(query) ||
        s.location.toLowerCase().includes(query) ||
        (getClinicianNames(s.clinicianIds || [])?.toLowerCase().includes(query))
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
  }, [clinicSessions, selectedHospital, dateFilter, searchQuery]);

  // Helper functions
  const getClinicianName = (id: string) => {
    const doc = doctors.find(d => d.id === id);
    return doc ? `Dr. ${doc.firstName} ${doc.lastName}` : 'Unknown';
  };

  // Get multiple clinician names
  const getClinicianNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'No clinicians assigned';
    return ids.map(id => getClinicianName(id)).join(', ');
  };

  // Get nurse name
  const getNurseName = (id?: string) => {
    if (!id) return null;
    const nurse = nurses.find(n => n.id === id);
    return nurse ? `${nurse.firstName} ${nurse.lastName}` : 'Unknown Nurse';
  };

  const getHospitalName = (id: string) => {
    const hospital = hospitals?.find(h => h.id === id);
    return hospital?.name || 'Unknown Hospital';
  };

  const getClinicTypeLabel = (type: string) => {
    const clinic = clinicTypes.find(c => c.value === type);
    return clinic ? `${clinic.icon} ${clinic.label}` : type;
  };

  const getStatusBadge = (status: ClinicSession['status']) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Form setup
  const form = useForm<ClinicSessionFormData>({
    resolver: zodResolver(clinicSessionSchema),
    defaultValues: {
      maxPatients: 20,
      clinicianIds: [],
      assignedNurseId: '',
    },
  });

  // Watch values for UI
  const selectedClinicianIds = form.watch('clinicianIds') || [];
  const notes = form.watch('notes') || '';

  // Open modal for new or edit
  const openModal = (session?: ClinicSession) => {
    if (session) {
      setEditingSession(session);
      form.reset({
        hospitalId: session.hospitalId,
        clinicianIds: session.clinicianIds || (session.clinicianId ? [session.clinicianId] : []),
        assignedNurseId: session.assignedNurseId || '',
        sessionDate: format(new Date(session.sessionDate), 'yyyy-MM-dd'),
        startTime: session.startTime,
        endTime: session.endTime,
        clinicType: session.clinicType,
        location: session.location,
        maxPatients: session.maxPatients,
        notes: session.notes || '',
      });
    } else {
      setEditingSession(null);
      form.reset({
        maxPatients: 20,
        clinicianIds: [],
        assignedNurseId: '',
      });
    }
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (data: ClinicSessionFormData) => {
    try {
      setIsSendingNotifications(true);
      
      const sessionData: ClinicSession = {
        id: editingSession?.id || uuidv4(),
        hospitalId: data.hospitalId,
        clinicianIds: data.clinicianIds,
        clinicianId: data.clinicianIds[0], // Backward compatibility
        assignedNurseId: data.assignedNurseId || undefined,
        sessionDate: new Date(data.sessionDate),
        startTime: data.startTime,
        endTime: data.endTime,
        clinicType: data.clinicType,
        location: data.location,
        maxPatients: data.maxPatients,
        bookedCount: editingSession?.bookedCount || 0,
        status: editingSession?.status || 'scheduled',
        notes: data.notes,
        notificationsSent: false,
        createdAt: editingSession?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingSession) {
        await db.clinicSessions.update(editingSession.id, sessionData);
        syncRecord('clinicSessions', sessionData as unknown as Record<string, unknown>);
        toast.success('Clinic session updated');
      } else {
        await db.clinicSessions.add(sessionData);
        syncRecord('clinicSessions', sessionData as unknown as Record<string, unknown>);
        toast.success('Clinic session scheduled');
      }

      // Send push notifications to assigned personnel
      const assignedUserIds = [...data.clinicianIds];
      if (data.assignedNurseId) {
        assignedUserIds.push(data.assignedNurseId);
      }

      if (assignedUserIds.length > 0) {
        await sendClinicSessionNotifications(sessionData, assignedUserIds, data);
      }

      setShowModal(false);
      form.reset();
    } catch (error) {
      console.error('Error saving clinic session:', error);
      toast.error('Failed to save clinic session');
    } finally {
      setIsSendingNotifications(false);
    }
  };

  // Send push notifications to assigned personnel
  const sendClinicSessionNotifications = async (
    session: ClinicSession, 
    userIds: string[],
    formData: ClinicSessionFormData
  ) => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    // Request permission if needed
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        toast.error('Notification permission required to alert assigned staff');
        return;
      }
    }

    const hospitalName = getHospitalName(session.hospitalId);
    const clinicTypeLabel = clinicTypes.find(c => c.value === session.clinicType)?.label || session.clinicType;
    const sessionDateFormatted = format(new Date(session.sessionDate), 'EEEE, MMMM d, yyyy');
    
    let notificationsSentCount = 0;

    // Get service worker registration
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;

        for (const userId of userIds) {
          const user = users?.find(u => u.id === userId);
          if (!user) continue;

          const isDoctor = formData.clinicianIds.includes(userId);
          const roleLabel = isDoctor ? 'Doctor/Surgeon' : 'Nurse';
          
          // Create notification options with extended properties
          const notificationOptions: NotificationOptions & { 
            vibrate?: number[]; 
            renotify?: boolean;
          } = {
            body: `You have been assigned to ${clinicTypeLabel} at ${hospitalName}.\n📅 ${sessionDateFormatted}\n⏰ ${session.startTime} - ${session.endTime}\n📍 ${session.location}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [300, 100, 300], // Vibration pattern
            tag: `clinic-session-${session.id}-${userId}`,
            requireInteraction: true,
            renotify: true,
            data: {
              type: 'clinic_assignment',
              sessionId: session.id,
              userId: userId,
              url: '/ward-rounds',
            },
          };

          await registration.showNotification(
            `🏥 Clinic Assignment - ${roleLabel}`,
            notificationOptions
          );
          
          notificationsSentCount++;
          console.log(`[ClinicScheduling] Notification sent to ${user.firstName} ${user.lastName}`);
        }

        if (notificationsSentCount > 0) {
          // Update session to mark notifications as sent
          await db.clinicSessions.update(session.id, {
            notificationsSent: true,
            notificationSentAt: new Date(),
          });
          
          toast.success(`📲 Notifications sent to ${notificationsSentCount} staff member(s)`);
        }
      } catch (error) {
        console.error('[ClinicScheduling] Error sending notifications:', error);
        toast.error('Failed to send some notifications');
      }
    }
  };

  // Update session status
  const updateStatus = async (session: ClinicSession, newStatus: ClinicSession['status']) => {
    try {
      await db.clinicSessions.update(session.id, { 
        status: newStatus,
        updatedAt: new Date(),
      });
      syncRecord('clinicSessions', { ...session, status: newStatus, updatedAt: new Date() } as unknown as Record<string, unknown>);
      toast.success(`Session ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating session status:', error);
      toast.error('Failed to update session');
    }
  };

  // Delete session
  const deleteSession = async (session: ClinicSession) => {
    if (!confirm('Are you sure you want to delete this clinic session?')) return;
    
    try {
      await db.clinicSessions.delete(session.id);
      toast.success('Clinic session deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-600" />
          <h3 className="font-semibold text-gray-900">Clinic Sessions</h3>
          <span className="text-sm text-gray-500">
            ({filteredSessions.length} sessions)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Date filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['today', 'week', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === filter
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : 'All'}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => openModal()}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Schedule Clinic
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const isPastSession = isPast(new Date(session.sessionDate)) && !isToday(new Date(session.sessionDate));
            
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl border p-4 ${
                  isPastSession ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {getClinicTypeLabel(session.clinicType)}
                      </h4>
                      {getStatusBadge(session.status)}
                      {isToday(new Date(session.sessionDate)) && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Today
                        </span>
                      )}
                      {isTomorrow(new Date(session.sessionDate)) && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">
                          Tomorrow
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {format(new Date(session.sessionDate), 'EEE, MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={14} className="text-gray-400" />
                        {session.startTime} - {session.endTime}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 size={14} className="text-gray-400" />
                        {getHospitalName(session.hospitalId)}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        {session.location}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <Stethoscope size={14} className="text-sky-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {getClinicianNames(session.clinicianIds || (session.clinicianId ? [session.clinicianId] : []))}
                        </span>
                      </div>
                      {session.assignedNurseId && (
                        <div className="flex items-center gap-2">
                          <UserCheck size={14} className="text-green-500" />
                          <span className="text-sm text-gray-600">
                            {getNurseName(session.assignedNurseId)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {session.bookedCount}/{session.maxPatients} patients
                        </span>
                        {session.bookedCount >= session.maxPatients && (
                          <span className="text-xs text-red-500 font-medium">FULL</span>
                        )}
                      </div>
                      {session.notificationsSent && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Bell size={12} />
                          <span className="text-xs">Notified</span>
                        </div>
                      )}
                    </div>
                    
                    {session.notes && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {session.status === 'scheduled' && !isPastSession && (
                      <button
                        onClick={() => updateStatus(session, 'in_progress')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Start Session"
                      >
                        <Play size={18} />
                      </button>
                    )}
                    {session.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(session, 'completed')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Complete Session"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => openModal(session)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => deleteSession(session)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons — Register Patient & Clinic Encounters */}
                {(session.status === 'scheduled' || session.status === 'in_progress') && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/patients/new?clinicSessionId=${session.id}&hospitalId=${session.hospitalId}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
                    >
                      <UserPlus size={15} />
                      Register New Patient
                    </button>
                    <button
                      onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ClipboardList size={15} />
                      Clinic Encounters ({encountersBySession.get(session.id)?.length || 0})
                      {expandedSessionId === session.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {session.bookedCount < session.maxPatients && (
                      <span className="text-xs text-emerald-600 font-medium ml-auto">
                        {session.maxPatients - session.bookedCount} slot{session.maxPatients - session.bookedCount !== 1 ? 's' : ''} available
                      </span>
                    )}
                  </div>
                )}

                {/* Expanded Encounters Panel */}
                <AnimatePresence>
                  {expandedSessionId === session.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FileText size={14} className="text-sky-500" />
                          Encounters on {format(new Date(session.sessionDate), 'MMM d, yyyy')}
                        </h5>

                        {(() => {
                          const sessionEncounters = encountersBySession.get(session.id) || [];

                          if (sessionEncounters.length === 0) {
                            return (
                              <div className="text-center py-6 bg-gray-50 rounded-lg">
                                <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No encounters yet for this clinic session</p>
                                <button
                                  onClick={() => navigate(`/patients/new?clinicSessionId=${session.id}&hospitalId=${session.hospitalId}`)}
                                  className="mt-2 inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 font-medium"
                                >
                                  <UserPlus size={14} />
                                  Register a patient to get started
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {sessionEncounters.map((enc: any) => {
                                const pt = patientMap.get(enc.patientId);
                                const statusStyles: Record<string, string> = {
                                  'in-progress': 'bg-amber-100 text-amber-700',
                                  completed: 'bg-green-100 text-green-700',
                                  cancelled: 'bg-red-100 text-red-700',
                                };

                                return (
                                  <div
                                    key={enc.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="p-1.5 bg-sky-100 rounded-full flex-shrink-0">
                                        <Users size={14} className="text-sky-600" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {pt ? `${pt.firstName} ${pt.lastName}` : 'Unknown Patient'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {pt?.hospitalNumber || 'No ID'} &bull; {enc.chiefComplaint || enc.type || 'Encounter'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[enc.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {enc.status === 'in-progress' ? 'In Progress' : enc.status?.charAt(0).toUpperCase() + enc.status?.slice(1)}
                                      </span>
                                      <button
                                        onClick={() => navigate(`/patients/${enc.patientId}/encounter`)}
                                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg"
                                        title="View / Continue Encounter"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        onClick={() => navigate(`/patients/${enc.patientId}`)}
                                        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg"
                                        title="View Patient Details"
                                      >
                                        <FileText size={16} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Add another patient button at bottom of list */}
                              <button
                                onClick={() => navigate(`/patients/new?clinicSessionId=${session.id}&hospitalId=${session.hospitalId}`)}
                                className="w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:text-sky-600 hover:border-sky-300 transition-colors"
                              >
                                <UserPlus size={14} />
                                Register Another Patient
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clinic Sessions Found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || selectedHospital !== 'all' 
              ? 'Try adjusting your filters'
              : 'Schedule your first clinic session to get started'}
          </p>
          <button
            onClick={() => openModal()}
            className="btn btn-primary"
          >
            <Plus size={18} />
            Schedule Clinic
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSession ? 'Edit Clinic Session' : 'Schedule Clinic Session'}
                </h2>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-5">
                {/* Hospital */}
                <div>
                  <label className="label">Hospital *</label>
                  <Controller
                    name="hospitalId"
                    control={form.control}
                    render={({ field }) => (
                      <HospitalSelector
                        value={field.value}
                        onChange={(hospitalId) => field.onChange(hospitalId || '')}
                        placeholder="Select hospital..."
                        showAddNew={false}
                      />
                    )}
                  />
                  {form.formState.errors.hospitalId && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.hospitalId.message}</p>
                  )}
                </div>

                {/* Clinic Type */}
                <div>
                  <label className="label">Clinic Type *</label>
                  <select {...form.register('clinicType')} className="input">
                    <option value="">Select clinic type</option>
                    {clinicTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.clinicType && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.clinicType.message}</p>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Date *</label>
                    <input 
                      type="date" 
                      {...form.register('sessionDate')} 
                      className="input"
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                    {form.formState.errors.sessionDate && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.sessionDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Start Time *</label>
                    <input type="time" {...form.register('startTime')} className="input" />
                    {form.formState.errors.startTime && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.startTime.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">End Time *</label>
                    <input type="time" {...form.register('endTime')} className="input" />
                    {form.formState.errors.endTime && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.endTime.message}</p>
                    )}
                  </div>
                </div>

                {/* Clinicians (Doctors/Surgeons) - Multi-select */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Stethoscope size={16} className="text-sky-600" />
                    Doctors/Surgeons * <span className="text-xs font-normal text-gray-500">(Select one or more)</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                    {doctors.length > 0 ? (
                      <div className="space-y-1">
                        {doctors.map((doctor) => (
                          <label 
                            key={doctor.id} 
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                              selectedClinicianIds.includes(doctor.id) 
                                ? 'bg-sky-50 border border-sky-200' 
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={doctor.id}
                              checked={selectedClinicianIds.includes(doctor.id)}
                              onChange={(e) => {
                                const current = form.getValues('clinicianIds') || [];
                                if (e.target.checked) {
                                  form.setValue('clinicianIds', [...current, doctor.id]);
                                } else {
                                  form.setValue('clinicianIds', current.filter(id => id !== doctor.id));
                                }
                              }}
                              className="w-4 h-4 text-sky-600 rounded"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-800">
                                Dr. {doctor.firstName} {doctor.lastName}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {doctor.specialization || doctor.role}
                              </span>
                            </div>
                            {selectedClinicianIds.includes(doctor.id) && (
                              <CheckCircle size={16} className="text-sky-600" />
                            )}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No doctors available</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {selectedClinicianIds.length} doctor(s) selected
                    </p>
                    {selectedClinicianIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => form.setValue('clinicianIds', [])}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  {form.formState.errors.clinicianIds && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.clinicianIds.message}</p>
                  )}
                </div>

                {/* Location and Max Patients */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Location/Room *</label>
                    <input 
                      type="text" 
                      {...form.register('location')} 
                      className="input"
                      placeholder="e.g., Clinic Room 3, OPD Hall B"
                    />
                    {form.formState.errors.location && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.location.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Max Patients *</label>
                    <input 
                      type="number" 
                      {...form.register('maxPatients', { valueAsNumber: true })} 
                      className="input"
                      min={1}
                      max={100}
                    />
                    {form.formState.errors.maxPatients && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.maxPatients.message}</p>
                    )}
                  </div>
                </div>

                {/* Assigned Nurse - Single select */}
                <div>
                  <label className="label flex items-center gap-2">
                    <UserCheck size={16} className="text-green-600" />
                    Assigned Nurse <span className="text-xs font-normal text-gray-500">(for notifications)</span>
                  </label>
                  <select 
                    {...form.register('assignedNurseId')} 
                    className="input"
                  >
                    <option value="">Select a nurse (optional)</option>
                    {nurses.map((nurse) => (
                      <option key={nurse.id} value={nurse.id}>
                        {nurse.firstName} {nurse.lastName}
                        {nurse.specialization ? ` - ${nurse.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Nurse will receive push notification when session is scheduled
                  </p>
                </div>

                {/* Notification Info */}
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="text-sky-600 mt-0.5" size={18} />
                    <div>
                      <h4 className="font-medium text-sky-900 text-sm">Push Notifications</h4>
                      <p className="text-xs text-sky-700 mt-1">
                        All selected doctors/surgeons and the assigned nurse will receive a push notification 
                        when this clinic session is scheduled. Make sure browser notifications are enabled.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="label">Notes (Optional)</label>
                  <VoiceDictation
                    value={notes}
                    onChange={(value) => form.setValue('notes', value)}
                    placeholder="Add any special instructions or notes..."
                    rows={3}
                    medicalContext="clinical_notes"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="btn btn-secondary flex-1"
                    disabled={isSendingNotifications}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary flex-1"
                    disabled={isSendingNotifications}
                  >
                    {isSendingNotifications ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Notifications...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {editingSession ? 'Update Session' : 'Schedule & Notify'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
