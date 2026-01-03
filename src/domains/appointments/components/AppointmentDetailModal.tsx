// Appointment Detail Modal
// Shows full appointment details with action buttons

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, differenceInMinutes, differenceInHours, isPast } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  Home,
  Video,
  Bell,
  CheckCircle,
  XCircle,
  UserX,
  AlertTriangle,
  Activity,
  Stethoscope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import {
  checkInPatient,
  completeAppointment,
  markNoShow,
  cancelAppointment,
} from '../../../services/appointmentService';
import type { Appointment, AppointmentStatus } from '../../../types';
import WhatsAppReminder from './WhatsAppReminder';

interface AppointmentDetailModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate?: () => void;
}

const statusColors: Record<AppointmentStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Calendar className="w-4 h-4" /> },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  checked_in: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <User className="w-4 h-4" /> },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Activity className="w-4 h-4" /> },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle className="w-4 h-4" /> },
  no_show: { bg: 'bg-red-100', text: 'text-red-700', icon: <UserX className="w-4 h-4" /> },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <XCircle className="w-4 h-4" /> },
  rescheduled: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Calendar className="w-4 h-4" /> },
};

const typeLabels: Record<string, string> = {
  follow_up: 'Follow-up Visit',
  fresh_consultation: 'Fresh Consultation',
  review: 'Routine Review',
  procedure: 'Minor Procedure',
  dressing_change: 'Dressing Change',
  suture_removal: 'Suture Removal',
  home_visit: 'Home Visit',
  telemedicine: 'Telemedicine',
  pre_operative: 'Pre-operative Assessment',
  post_operative: 'Post-operative Check',
  emergency: 'Emergency',
  other: 'Other',
};

export default function AppointmentDetailModal({
  appointment,
  onClose,
  onUpdate,
}: AppointmentDetailModalProps) {
  const { user } = useAuth();
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch patient details
  const patient = useLiveQuery(() => 
    db.patients.get(appointment.patientId),
    [appointment.patientId]
  );

  // Fetch hospital details
  const hospital = useLiveQuery(() => 
    db.hospitals.get(appointment.hospitalId),
    [appointment.hospitalId]
  );

  // Calculate time until appointment
  const getTimeStatus = () => {
    const aptDateTime = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.appointmentTime.split(':').map(Number);
    aptDateTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    
    if (isPast(aptDateTime)) {
      const hoursAgo = differenceInHours(now, aptDateTime);
      if (hoursAgo < 1) {
        return { text: 'Started', color: 'text-yellow-600', urgent: true };
      }
      return { text: `${hoursAgo}h ago`, color: 'text-red-600', urgent: true };
    }

    const minutesUntil = differenceInMinutes(aptDateTime, now);
    const hoursUntil = differenceInHours(aptDateTime, now);

    if (minutesUntil < 30) {
      return { text: `In ${minutesUntil} min`, color: 'text-orange-600', urgent: true };
    }
    if (hoursUntil < 2) {
      return { text: `In ${minutesUntil} min`, color: 'text-yellow-600', urgent: false };
    }
    if (hoursUntil < 24) {
      return { text: `In ${hoursUntil}h`, color: 'text-blue-600', urgent: false };
    }
    return { text: format(aptDateTime, 'MMM d'), color: 'text-gray-600', urgent: false };
  };

  const timeStatus = getTimeStatus();
  const statusInfo = statusColors[appointment.status];

  const handleCheckIn = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await checkInPatient(appointment.id, user.id);
      toast.success('Patient checked in successfully');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to check in patient');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await completeAppointment(appointment.id, user.id);
      toast.success('Appointment completed');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to complete appointment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNoShow = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await markNoShow(appointment.id, user.id);
      toast.success('Marked as no-show');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to mark as no-show');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await cancelAppointment(appointment.id, user.id, cancelReason);
      toast.success('Appointment cancelled');
      setShowCancelConfirm(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      toast.error('Failed to cancel appointment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getLocationDisplay = () => {
    const loc = appointment.location;
    if (loc.type === 'hospital') {
      return (
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-medium">{loc.hospitalName || hospital?.name}</p>
            {loc.department && <p className="text-sm text-gray-500">{loc.department}</p>}
            {loc.room && <p className="text-sm text-gray-500">Room: {loc.room}</p>}
          </div>
        </div>
      );
    }
    if (loc.type === 'home') {
      return (
        <div className="flex items-start gap-3">
          <Home className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <p className="font-medium">Home Visit</p>
            <p className="text-sm text-gray-500">{loc.homeAddress}</p>
            <p className="text-sm text-gray-500">{loc.homeCity}, {loc.homeState}</p>
            {loc.homeLandmarks && (
              <p className="text-sm text-gray-400">Landmarks: {loc.homeLandmarks}</p>
            )}
          </div>
        </div>
      );
    }
    if (loc.type === 'telemedicine') {
      return (
        <div className="flex items-start gap-3">
          <Video className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium">Telemedicine Consultation</p>
            <p className="text-sm text-gray-500">Video/Phone call at scheduled time</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Appointment Details
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {appointment.appointmentNumber}
                </p>
              </div>
            </div>

            {/* Status & Time */}
            <div className="flex items-center gap-3 mt-4">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusInfo.bg} ${statusInfo.text}`}>
                {statusInfo.icon}
                {appointment.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 text-white ${timeStatus.urgent ? 'animate-pulse' : ''}`}>
                <Clock className="w-4 h-4 inline mr-1" />
                {timeStatus.text}
              </span>
              {appointment.priority !== 'routine' && (
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  appointment.priority === 'emergency' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                }`}>
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {appointment.priority}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-6 space-y-6">
            {/* Patient Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-emerald-600" />
                Patient Information
              </h3>
              {patient ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Hospital No: {patient.hospitalNumber}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {appointment.patientWhatsApp}
                    </p>
                    {appointment.patientEmail && (
                      <p className="text-sm flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        {appointment.patientEmail}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading patient details...</p>
              )}
            </div>

            {/* Appointment Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Date & Time</label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {appointment.appointmentTime} ({appointment.duration} mins)
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
                  <p className="font-medium flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    {typeLabels[appointment.type] || appointment.type}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Clinician</label>
                  <p className="font-medium">
                    Dr. {appointment.clinicianName || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Location</label>
                  {getLocationDisplay()}
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Reminders</label>
                  <p className="flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${appointment.reminderEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                    {appointment.reminderEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason for Visit */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Reason for Visit</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{appointment.reasonForVisit}</p>
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Additional Notes</label>
                <div className="mt-1 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-gray-700">{appointment.notes}</p>
                </div>
              </div>
            )}

            {/* Outcome Notes (if completed) */}
            {appointment.outcomeNotes && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Outcome Notes</label>
                <div className="mt-1 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-gray-700">{appointment.outcomeNotes}</p>
                </div>
              </div>
            )}

            {/* Reminder Schedule */}
            {appointment.reminderSchedule && appointment.reminderSchedule.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Reminder Schedule</label>
                <div className="mt-2 space-y-2">
                  {appointment.reminderSchedule.map((reminder, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        reminder.status === 'sent' ? 'bg-green-50' :
                        reminder.status === 'pending' ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {reminder.channel === 'whatsapp' ? (
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-sm">
                          {reminder.offsetHours}h before - {reminder.channel.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        reminder.status === 'sent' ? 'bg-green-100 text-green-700' :
                        reminder.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {reminder.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t space-y-3">
            {/* Quick Actions based on status */}
            {['scheduled', 'confirmed'].includes(appointment.status) && (
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  Check In Patient
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNoShow}
                  disabled={isProcessing}
                  className="px-4 py-2.5 border border-orange-300 text-orange-600 rounded-xl font-medium hover:bg-orange-50"
                >
                  <UserX className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {appointment.status === 'checked_in' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                Complete Appointment
              </motion.button>
            )}

            {/* Communication Actions */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowWhatsApp(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
              >
                <MessageCircle className="w-5 h-5" />
                Send WhatsApp
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = `tel:${appointment.patientWhatsApp}`}
                className="px-4 py-2.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
              >
                <Phone className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Cancel Button */}
            {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-2 text-red-600 hover:text-red-700 font-medium"
              >
                Cancel Appointment
              </button>
            )}
          </div>

          {/* WhatsApp Modal */}
          {showWhatsApp && patient && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
              <WhatsAppReminder
                appointment={appointment}
                patient={patient}
                hospital={hospital}
                onClose={() => setShowWhatsApp(false)}
              />
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {showCancelConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              >
                <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <XCircle className="w-6 h-6" />
                  Cancel Appointment?
                </h3>
                <p className="text-gray-600 mt-2">
                  Are you sure you want to cancel this appointment? This action cannot be undone.
                </p>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for cancellation
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    placeholder="Optional: Provide a reason..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Keep Appointment
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
