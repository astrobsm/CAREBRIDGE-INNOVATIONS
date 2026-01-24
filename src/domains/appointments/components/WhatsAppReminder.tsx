// WhatsApp Reminder Component
// Generates and shares appointment reminders via WhatsApp

import { useState } from 'react';
import {
  MessageCircle,
  Send,
  Copy,
  ExternalLink,
  Check,
  Phone,
  Calendar,
  Clock,
  User,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  generateWhatsAppMessage,
  generateWhatsAppUrl,
  type WhatsAppMessageData,
} from '../../../services/appointmentService';
import type { Appointment, Patient, Hospital } from '../../../types';

interface WhatsAppReminderProps {
  appointment: Appointment;
  patient: Patient;
  hospital?: Hospital;
  onClose?: () => void;
}

export default function WhatsAppReminder({
  appointment,
  patient,
  hospital,
  onClose,
}: WhatsAppReminderProps) {
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);

  // Build message data
  const messageData: WhatsAppMessageData = {
    patientName: `${patient.firstName} ${patient.lastName}`,
    appointmentDate: format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy'),
    appointmentTime: appointment.appointmentTime,
    hospitalName: hospital?.name || appointment.location.hospitalName || 'Hospital',
    clinicianName: appointment.clinicianName || 'Your Doctor',
    reasonForVisit: appointment.reasonForVisit,
    location: appointment.location,
    appointmentNumber: appointment.appointmentNumber,
  };

  // Generate message
  const message = useCustomMessage && customMessage
    ? customMessage
    : generateWhatsAppMessage(messageData, 24);

  // Generate WhatsApp URL
  const whatsAppUrl = generateWhatsAppUrl(appointment.patientWhatsApp, message);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleSendWhatsApp = () => {
    window.open(whatsAppUrl, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleCallPatient = () => {
    window.location.href = `tel:${appointment.patientWhatsApp}`;
  };

  const regenerateMessage = (offsetHours: number) => {
    const newMessage = generateWhatsAppMessage(messageData, offsetHours);
    setCustomMessage(newMessage);
    setUseCustomMessage(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 rounded-t-2xl flex-shrink-0">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          WhatsApp Reminder
        </h3>
        <p className="text-green-100 text-sm mt-1">
          Send appointment reminder to {patient.firstName}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
      {/* Appointment Summary */}
      <div className="p-4 bg-green-50 border-b">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-green-600" />
            <span>{patient.firstName} {patient.lastName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4 text-green-600" />
            <span>{appointment.patientWhatsApp}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-green-600" />
            <span>{format(new Date(appointment.appointmentDate), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-green-600" />
            <span>{appointment.appointmentTime}</span>
          </div>
        </div>
      </div>

      {/* Message Templates */}
      <div className="px-6 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Template
        </label>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => regenerateMessage(48)}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            48h Reminder
          </button>
          <button
            onClick={() => regenerateMessage(24)}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            24h Reminder
          </button>
          <button
            onClick={() => regenerateMessage(1)}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Same Day
          </button>
          <button
            onClick={() => setUseCustomMessage(false)}
            className="px-3 py-1.5 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Message Preview */}
      <div className="px-6 pb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <input
            type="checkbox"
            checked={useCustomMessage}
            onChange={(e) => {
              setUseCustomMessage(e.target.checked);
              if (e.target.checked && !customMessage) {
                setCustomMessage(message);
              }
            }}
            className="w-4 h-4 text-green-600 rounded"
          />
          Edit message
        </label>
        
        {useCustomMessage ? (
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-mono"
          />
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {message}
            </pre>
          </div>
        )}
      </div>
      </div>

      {/* Actions - Fixed Footer */}
      <div className="px-6 pb-6 pt-4 space-y-3 flex-shrink-0 border-t bg-white rounded-b-2xl">
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSendWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            <Send className="w-5 h-5" />
            Send via WhatsApp
            <ExternalLink className="w-4 h-4 opacity-50" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyMessage}
            className="px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
          </motion.button>
        </div>

        <button
          onClick={handleCallPatient}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call Patient Instead
        </button>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// Compact inline WhatsApp button component
export function WhatsAppButton({
  phoneNumber,
  message,
  size = 'md',
}: {
  phoneNumber: string;
  message: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const url = generateWhatsAppUrl(phoneNumber, message);

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`inline-flex items-center justify-center ${sizeClasses[size]} bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors`}
      title="Send WhatsApp message"
    >
      <MessageCircle className={iconSizes[size]} />
    </motion.a>
  );
}
