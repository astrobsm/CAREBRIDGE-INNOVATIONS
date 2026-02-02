// Push Notification Settings Component
// Allows users to manage their push notification preferences

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  Moon,
  Clock,
  Stethoscope,
  Scissors,
  Calendar,
  TestTubes,
  Pill,
  FileText,
  Activity,
  MessageSquare,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isPushSupported,
  isVapidConfigured,
  getSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  updateSubscriptionPreferences,
  type PushNotificationPreferences,
} from '../../services/webPushService';
import { useAuth } from '../../contexts/AuthContext';

interface NotificationCategory {
  key: keyof PushNotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'clinical' | 'administrative';
}

const notificationCategories: NotificationCategory[] = [
  // Clinical notifications
  {
    key: 'patientAssignments',
    label: 'Patient Assignments',
    description: 'When patients are assigned to you',
    icon: <Stethoscope size={20} />,
    category: 'clinical',
  },
  {
    key: 'surgeryReminders',
    label: 'Surgery Reminders',
    description: 'Upcoming surgeries you\'re involved in',
    icon: <Scissors size={20} />,
    category: 'clinical',
  },
  {
    key: 'appointmentReminders',
    label: 'Appointment Reminders',
    description: 'Upcoming patient appointments',
    icon: <Calendar size={20} />,
    category: 'clinical',
  },
  {
    key: 'labResults',
    label: 'Lab Results',
    description: 'When lab results are ready',
    icon: <TestTubes size={20} />,
    category: 'clinical',
  },
  {
    key: 'investigationResults',
    label: 'Investigation Results',
    description: 'When investigation results are available',
    icon: <FileText size={20} />,
    category: 'clinical',
  },
  {
    key: 'prescriptionReady',
    label: 'Prescription Ready',
    description: 'When prescriptions are ready for collection',
    icon: <Pill size={20} />,
    category: 'clinical',
  },
  {
    key: 'treatmentPlanUpdates',
    label: 'Treatment Plan Updates',
    description: 'Changes to patient treatment plans',
    icon: <FileText size={20} />,
    category: 'clinical',
  },
  {
    key: 'vitalAlerts',
    label: 'Vital Sign Alerts',
    description: 'Critical or abnormal vital signs',
    icon: <Activity size={20} />,
    category: 'clinical',
  },
  // Administrative notifications
  {
    key: 'staffMessages',
    label: 'Staff Messages',
    description: 'Messages from other staff members',
    icon: <MessageSquare size={20} />,
    category: 'administrative',
  },
  {
    key: 'systemAlerts',
    label: 'System Alerts',
    description: 'Important system notifications',
    icon: <AlertTriangle size={20} />,
    category: 'administrative',
  },
];

export default function PushNotificationSettings() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<PushNotificationPreferences>({
    patientAssignments: true,
    surgeryReminders: true,
    appointmentReminders: true,
    labResults: true,
    investigationResults: true,
    prescriptionReady: true,
    treatmentPlanUpdates: true,
    vitalAlerts: true,
    staffMessages: true,
    systemAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    setIsLoading(true);
    try {
      setIsSupported(isPushSupported());
      setIsConfigured(isVapidConfigured());

      if (user?.id) {
        const status = await getSubscriptionStatus(user.id);
        setIsSubscribed(status.isSubscribed);
        if (status.preferences) {
          setPreferences(status.preferences);
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!user?.id) {
      toast.error('Please log in to enable notifications');
      return;
    }

    setIsSaving(true);
    try {
      const result = await subscribeToPush(user.id, user.hospitalId, preferences);
      if (result) {
        setIsSubscribed(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Failed to enable notifications. Please check your browser permissions.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      await unsubscribeFromPush(user.id);
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferenceChange = async (key: keyof PushNotificationPreferences, value: boolean | string) => {
    if (!user?.id || !isSubscribed) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    setIsSaving(true);
    try {
      await updateSubscriptionPreferences(user.id, { [key]: value });
      toast.success('Preference updated');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAll = async (enabled: boolean, category: 'clinical' | 'administrative') => {
    if (!user?.id || !isSubscribed) return;

    const categoryKeys = notificationCategories
      .filter((c) => c.category === category)
      .map((c) => c.key);

    const updates: Partial<PushNotificationPreferences> = {};
    categoryKeys.forEach((key) => {
      (updates as Record<string, boolean>)[key] = enabled;
    });

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    setIsSaving(true);
    try {
      await updateSubscriptionPreferences(user.id, updates);
      toast.success(`${category === 'clinical' ? 'Clinical' : 'Administrative'} notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        <span className="ml-2 text-gray-600">Loading notification settings...</span>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle size={24} />
          <div>
            <h3 className="font-semibold">Push Notifications Not Supported</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your browser or device doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle size={24} />
          <div>
            <h3 className="font-semibold">Push Notifications Not Configured</h3>
            <p className="text-sm text-gray-600 mt-1">
              Push notifications haven't been configured for this app. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isSubscribed ? (
                <Bell className="w-6 h-6 text-green-600" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Push Notifications</h2>
              <p className="text-sm text-gray-600">
                {isSubscribed
                  ? 'You will receive notifications even when the app is closed'
                  : 'Enable to receive notifications on this device'}
              </p>
            </div>
          </div>
          <button
            onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              isSubscribed
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSubscribed ? (
              <>
                <X size={18} />
                Disable
              </>
            ) : (
              <>
                <Check size={18} />
                Enable
              </>
            )}
          </button>
        </div>

        {isSubscribed && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              Notifications are enabled on this device. You'll receive alerts even when the app is closed.
            </p>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      {isSubscribed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Clinical Notifications */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold text-gray-900">Clinical Notifications</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAll(true, 'clinical')}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Enable All
                </button>
                <button
                  onClick={() => handleToggleAll(false, 'clinical')}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Disable All
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {notificationCategories
                .filter((c) => c.category === 'clinical')
                .map((category) => (
                  <div
                    key={category.key}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500">{category.icon}</div>
                      <div>
                        <p className="font-medium text-gray-900">{category.label}</p>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[category.key] as boolean}
                        onChange={(e) => handlePreferenceChange(category.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                ))}
            </div>
          </div>

          {/* Administrative Notifications */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Administrative Notifications</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAll(true, 'administrative')}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Enable All
                </button>
                <button
                  onClick={() => handleToggleAll(false, 'administrative')}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Disable All
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {notificationCategories
                .filter((c) => c.category === 'administrative')
                .map((category) => (
                  <div
                    key={category.key}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500">{category.icon}</div>
                      <div>
                        <p className="font-medium text-gray-900">{category.label}</p>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[category.key] as boolean}
                        onChange={(e) => handlePreferenceChange(category.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Quiet Hours</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Enable Quiet Hours</p>
                  <p className="text-sm text-gray-500">
                    Mute non-critical notifications during specified hours
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quietHoursEnabled}
                    onChange={(e) => handlePreferenceChange('quietHoursEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {preferences.quietHoursEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex gap-4 items-center"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">From</span>
                    <input
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(e) => handlePreferenceChange('quietHoursStart', e.target.value)}
                      className="input w-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">To</span>
                    <input
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(e) => handlePreferenceChange('quietHoursEnd', e.target.value)}
                      className="input w-auto"
                    />
                  </div>
                </motion.div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Note: Critical alerts (vital sign alerts marked as critical) will still be delivered during quiet hours.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
