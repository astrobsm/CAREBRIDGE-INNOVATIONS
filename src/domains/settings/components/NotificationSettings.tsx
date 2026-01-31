// Notification Settings Component
// Allows users to manage push notifications and voice alarms

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Calendar,
  Stethoscope,
  Pill,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isPushSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from '../../../services/appointmentNotificationService';
import {
  isVoiceEnabled,
  setVoiceEnabled,
  playVoiceAlarm,
  scheduleAllUpcomingNotifications,
} from '../../../services/scheduledNotificationService';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [voiceEnabled, setVoiceEnabledState] = useState(isVoiceEnabled());
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled!');
        // Schedule notifications
        const { scheduled } = await scheduleAllUpcomingNotifications();
        setScheduledCount(scheduled);
      } else if (result === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
      }
    } catch (error) {
      toast.error('Failed to request permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    setVoiceEnabledState(newValue);
    
    if (newValue) {
      // Test voice
      playVoiceAlarm('Voice alarms are now enabled.', 'low');
      toast.success('Voice alarms enabled');
    } else {
      toast('Voice alarms disabled', { icon: '🔇' });
    }
  };

  const handleRefreshSchedule = async () => {
    setIsLoading(true);
    try {
      const { scheduled } = await scheduleAllUpcomingNotifications();
      setScheduledCount(scheduled);
      toast.success(`Refreshed! ${scheduled} events scheduled for notifications.`);
    } catch (error) {
      toast.error('Failed to refresh notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🔔 Test Notification', {
        body: 'This is a test notification from AstroHEALTH. Notifications are working correctly!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        // Note: vibrate is not in NotificationOptions type but is supported by browsers
        tag: 'test-notification',
      } as NotificationOptions);

      if (voiceEnabled) {
        playVoiceAlarm('Test notification sent successfully.', 'low');
      }

      toast.success('Test notification sent!');
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </h2>
        <p className="text-purple-100 text-sm mt-1">
          Manage reminders for surgeries, appointments & treatments
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Push Notifications */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            {permission === 'granted' ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            Push Notifications
          </h3>
          
          {!isPushSupported() ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Push notifications are not supported in this browser.
              </p>
            </div>
          ) : permission === 'granted' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Notifications are enabled! You'll receive reminders automatically.
              </p>
            </div>
          ) : permission === 'denied' ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          ) : (
            <button
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              Enable Notifications
            </button>
          )}
        </div>

        {/* Voice Alarms */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            {voiceEnabled ? (
              <Volume2 className="w-5 h-5 text-blue-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            Voice Alarms
          </h3>
          
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div>
              <p className="font-medium text-gray-800">Voice Announcements</p>
              <p className="text-sm text-gray-500">
                Hear spoken reminders for upcoming events
              </p>
            </div>
            <button
              onClick={handleVoiceToggle}
              title="Toggle voice announcements"
              className={`w-14 h-8 rounded-full relative transition-colors ${
                voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <motion.div
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ left: voiceEnabled ? '1.75rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            Notification Types
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">Surgeries</p>
                <p className="text-xs text-gray-500">24h, 2h, 1h, 30m, 15m, 5m before</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">Appointments</p>
                <p className="text-xs text-gray-500">24h, 2h, 30m, 15m before</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
              <Pill className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">Treatment Plans</p>
                <p className="text-xs text-gray-500">1h, 30m, 15m before</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>

        {/* Schedule Status */}
        {scheduledCount !== null && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-indigo-700 text-sm">
              📅 {scheduledCount} upcoming events have notifications scheduled.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRefreshSchedule}
            disabled={isLoading || permission !== 'granted'}
            className="w-full py-2.5 px-4 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Schedule
          </button>
          
          <button
            onClick={handleTestNotification}
            disabled={permission !== 'granted'}
            className="w-full py-2.5 px-4 border border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            Send Test Notification
          </button>
        </div>

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
