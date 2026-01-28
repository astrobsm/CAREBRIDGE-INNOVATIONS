import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Cloud,
  Palette,
  Key,
  Smartphone,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Wifi,
  WifiOff,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Clock,
  Volume2,
  VolumeX,
  Calendar,
  Stethoscope,
} from 'lucide-react';
import DataMigration from '../../../components/common/DataMigration';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database';
import { useOfflineState, offlineDataManager } from '../../../services/offlineDataManager';
import { fullSync, testSupabaseConnection } from '../../../services/cloudSyncService';
import { isSupabaseConfigured } from '../../../services/supabaseClient';
import { requestBackgroundSync, clearServiceWorkerCache } from '../../../services/pwaService';
import {
  isPushSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from '../../../services/appointmentNotificationService';
import {
  isVoiceEnabled,
  setVoiceEnabled as setVoiceEnabledGlobal,
  playVoiceAlarm,
  scheduleAllUpcomingNotifications,
} from '../../../services/scheduledNotificationService';

const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'offline', label: 'Offline & Sync', icon: Cloud },
  { id: 'data', label: 'Data Management', icon: Database },
];

export default function SettingsPage() {
  const { user, logout: _logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const offlineState = useOfflineState();
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });
  const [syncDebugInfo, setSyncDebugInfo] = useState<{
    supabaseConfigured: boolean;
    connectionTest: { success: boolean; message: string } | null;
    localCounts: Record<string, number>;
    testing: boolean;
  }>({
    supabaseConfigured: isSupabaseConfigured(),
    connectionTest: null,
    localCounts: {},
    testing: false,
  });

  // Get storage usage on mount
  useEffect(() => {
    async function getStorageUsage() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageUsage({
            used: estimate.usage || 0,
            quota: estimate.quota || 0
          });
        } catch (error) {
          console.error('Failed to get storage estimate:', error);
        }
      }
    }
    getStorageUsage();
  }, [activeTab]);

  // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    specialty: user?.specialty || '',
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    surgeryReminders: true,
    patientUpdates: true,
    labResults: true,
    systemAlerts: true,
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'system', // light, dark, system
    compactMode: false,
    fontSize: 'medium', // small, medium, large
    colorScheme: 'blue', // blue, green, purple, etc.
  });

  // Offline settings
  const [offlineSettings, setOfflineSettings] = useState({
    autoSync: true,
    syncInterval: 15, // minutes
    offlineMode: false,
    cacheImages: true,
    maxCacheSize: 500, // MB
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Notification preferences saved!');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    if (!offlineState.isOnline) {
      toast.error('You are offline. Connect to the internet to sync.');
      return;
    }
    
    try {
      toast.loading('Starting sync...', { id: 'sync-toast' });
      
      // Trigger the sync via the cloud sync service
      await fullSync();
      
      // Also request background sync registration
      await requestBackgroundSync();
      
      toast.success('Data synchronized successfully!', { id: 'sync-toast' });
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed. Will retry automatically.', { id: 'sync-toast' });
    }
  };

  const handleTestSyncConnection = async () => {
    setSyncDebugInfo(prev => ({ ...prev, testing: true }));
    
    try {
      // Get local record counts
      const counts: Record<string, number> = {};
      counts.patients = await db.patients.count();
      counts.admissions = await db.admissions.count();
      counts.users = await db.users.count();
      counts.hospitals = await db.hospitals.count();
      counts.surgeries = await db.surgeries.count();
      counts.encounters = await db.clinicalEncounters.count();
      counts.wardRounds = await db.wardRounds.count();
      counts.vitals = await db.vitalSigns.count();
      
      // Test Supabase connection
      const connectionTest = await testSupabaseConnection();
      
      setSyncDebugInfo({
        supabaseConfigured: isSupabaseConfigured(),
        connectionTest,
        localCounts: counts,
        testing: false,
      });
      
      if (connectionTest.success) {
        toast.success('Supabase connection successful!');
      } else {
        toast.error(`Connection failed: ${connectionTest.message}`);
      }
    } catch (error) {
      console.error('Sync test failed:', error);
      setSyncDebugInfo(prev => ({
        ...prev,
        testing: false,
        connectionTest: { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
      }));
      toast.error('Failed to test connection');
    }
  };

  const handleExportData = async () => {
    try {
      // Get all data from IndexedDB
      const patients = await db.patients.toArray();
      const encounters = await db.clinicalEncounters.toArray();
      const surgeries = await db.surgeries.toArray();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        patients,
        encounters,
        surgeries,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `astrohealth-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear the local cache? This will not delete your data.')) {
      try {
        // Clear service worker caches
        clearServiceWorkerCache();
        
        // Also clear via caches API
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Update storage usage display
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          setStorageUsage({
            used: estimate.usage || 0,
            quota: estimate.quota || 0
          });
        }
        
        toast.success('Cache cleared successfully!');
      } catch (error) {
        toast.error('Failed to clear cache');
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="form-grid-2">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    value={profileSettings.firstName}
                    onChange={(e) => setProfileSettings({ ...profileSettings, firstName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={profileSettings.lastName}
                    onChange={(e) => setProfileSettings({ ...profileSettings, lastName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profileSettings.email}
                    onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={profileSettings.phone}
                    onChange={(e) => setProfileSettings({ ...profileSettings, phone: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Details</h3>
              <div className="form-grid-2">
                <div>
                  <label className="label">Role</label>
                  <input
                    type="text"
                    value={user?.role || ''}
                    disabled
                    className="input bg-gray-100"
                  />
                </div>
                <div>
                  <label className="label">Specialty</label>
                  <input
                    type="text"
                    value={profileSettings.specialty}
                    onChange={(e) => setProfileSettings({ ...profileSettings, specialty: e.target.value })}
                    className="input"
                    placeholder="e.g., General Surgery"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="btn btn-primary w-full sm:w-auto"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Push Notification & Voice Alarm Settings */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                Push Notifications & Voice Alarms
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications Status</p>
                    <p className="text-sm text-gray-500">
                      {isPushSupported() 
                        ? getNotificationPermission() === 'granted' 
                          ? '✅ Notifications are enabled'
                          : getNotificationPermission() === 'denied'
                            ? '❌ Notifications are blocked'
                            : '⚠️ Permission not requested'
                        : '❌ Not supported in this browser'}
                    </p>
                  </div>
                  {isPushSupported() && getNotificationPermission() !== 'granted' && (
                    <button
                      onClick={async () => {
                        const result = await requestNotificationPermission();
                        if (result === 'granted') {
                          toast.success('Notifications enabled!');
                          scheduleAllUpcomingNotifications();
                        }
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      Enable Notifications
                    </button>
                  )}
                </div>
                
                <label className="flex items-center justify-between p-4 bg-white rounded-lg cursor-pointer border">
                  <div className="flex items-center gap-3">
                    {isVoiceEnabled() ? (
                      <Volume2 className="w-5 h-5 text-blue-600" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">Voice Alarms</p>
                      <p className="text-sm text-gray-500">Speak reminders aloud for upcoming events</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isVoiceEnabled()}
                    onChange={(e) => {
                      setVoiceEnabledGlobal(e.target.checked);
                      if (e.target.checked) {
                        playVoiceAlarm('Voice alarms are now enabled.', 'low');
                      }
                      toast.success(e.target.checked ? 'Voice alarms enabled' : 'Voice alarms disabled');
                    }}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
              </div>
              
              {/* Event Types */}
              <div className="mt-4 pt-4 border-t border-purple-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Reminder timings:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span><strong>Surgeries:</strong> 24h, 2h, 1h, 30m, 15m, 5m</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span><strong>Appointments:</strong> 24h, 2h, 30m, 15m</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <Bell className="w-4 h-4 text-green-600" />
                    <span><strong>Treatments:</strong> 1h, 30m, 15m</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-500">Browser and mobile push notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Critical alerts via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.smsNotifications}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Surgery Reminders</p>
                    <p className="text-sm text-gray-500">Upcoming surgeries and schedule changes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.surgeryReminders}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, surgeryReminders: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Patient Updates</p>
                    <p className="text-sm text-gray-500">Status changes and new admissions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.patientUpdates}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, patientUpdates: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Lab Results</p>
                    <p className="text-sm text-gray-500">New laboratory results available</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.labResults}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, labResults: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleSaveNotifications} disabled={isSaving} className="btn btn-primary">
                <Save size={18} />
                Save Preferences
              </button>
            </div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Password</h3>
              <div className="card border p-4 space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
                <button className="btn btn-primary">
                  <Key size={18} />
                  Change Password
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
              <div className="card border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">2FA Status</p>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <span className="badge badge-warning">Not Enabled</span>
                </div>
                <button className="btn btn-secondary mt-4">
                  <Smartphone size={18} />
                  Enable 2FA
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
              <div className="card border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Current Device</p>
                      <p className="text-sm text-gray-500">Windows • Chrome • Lagos, Nigeria</p>
                    </div>
                  </div>
                  <span className="badge badge-success">Active Now</span>
                </div>
                <button className="btn btn-danger-outline text-sm">
                  Sign Out All Other Devices
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 'appearance':
        return (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: theme.value })}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                      appearanceSettings.theme === theme.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <theme.icon className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 ${
                      appearanceSettings.theme === theme.value ? 'text-violet-600' : 'text-gray-400'
                    }`} />
                    <p className={`text-xs sm:text-sm font-medium ${
                      appearanceSettings.theme === theme.value ? 'text-violet-600' : 'text-gray-600'
                    }`}>
                      {theme.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Font Size</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setAppearanceSettings({ ...appearanceSettings, fontSize: size })}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                      appearanceSettings.fontSize === size
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-medium capitalize ${
                      size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                    } ${appearanceSettings.fontSize === size ? 'text-violet-600' : 'text-gray-600'}`}>
                      {size}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Compact Mode</p>
                  <p className="text-sm text-gray-500">Reduce spacing for more content on screen</p>
                </div>
                <input
                  type="checkbox"
                  checked={appearanceSettings.compactMode}
                  onChange={(e) => setAppearanceSettings({ ...appearanceSettings, compactMode: e.target.checked })}
                  className="w-5 h-5 text-violet-600 rounded"
                />
              </label>
            </div>
          </motion.div>
        );

      case 'offline':
        return (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Connection Status Card */}
            <div className={`card p-4 ${offlineState.isOnline ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'} border`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {offlineState.isOnline ? (
                    <>
                      <div className="p-2 bg-green-100 rounded-full">
                        <Wifi className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">Online</p>
                        <p className="text-sm text-green-600">Connected and ready to sync</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-orange-100 rounded-full">
                        <WifiOff className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-orange-800">Offline</p>
                        <p className="text-sm text-orange-600">Working offline - data saved locally</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-right">
                  {offlineState.isSyncing && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Syncing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sync Status Card */}
            <div className="card border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600" />
                Sync Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Status</span>
                  <div className="flex items-center gap-2">
                    {offlineState.isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="font-medium text-blue-600">Syncing</span>
                      </>
                    ) : offlineState.syncError ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-red-600">Error</span>
                      </>
                    ) : offlineState.pendingChanges > 0 ? (
                      <>
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-yellow-600">Pending</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-600">Up to date</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Pending Changes</span>
                  <span className={`font-medium ${offlineState.pendingChanges > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {offlineState.pendingChanges} {offlineState.pendingChanges === 1 ? 'change' : 'changes'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Last Synced</span>
                  <span className="font-medium text-gray-900">
                    {offlineState.lastSyncAt 
                      ? offlineState.lastSyncAt.toLocaleString() 
                      : 'Never'}
                  </span>
                </div>
                
                {offlineState.syncError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-2">
                    <p className="text-sm text-red-700">{offlineState.syncError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sync Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Auto-Sync</p>
                    <p className="text-sm text-gray-500">Automatically sync data when online</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={offlineSettings.autoSync}
                    onChange={(e) => setOfflineSettings({ ...offlineSettings, autoSync: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="label">Sync Interval (minutes)</label>
                  <select
                    value={offlineSettings.syncInterval}
                    onChange={(e) => setOfflineSettings({ ...offlineSettings, syncInterval: parseInt(e.target.value) })}
                    className="input"
                  >
                    <option value={5}>Every 5 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every hour</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Cache Images</p>
                    <p className="text-sm text-gray-500">Store images for offline access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={offlineSettings.cacheImages}
                    onChange={(e) => setOfflineSettings({ ...offlineSettings, cacheImages: e.target.checked })}
                    className="w-5 h-5 text-violet-600 rounded"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleSync} 
                disabled={offlineState.isSyncing || !offlineState.isOnline} 
                className="btn btn-primary flex-1"
              >
                {offlineState.isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <Cloud size={18} />}
                {offlineState.isSyncing ? 'Syncing...' : !offlineState.isOnline ? 'Offline' : 'Sync Now'}
              </button>
              {offlineState.pendingChanges > 0 && (
                <button 
                  onClick={() => offlineDataManager.clearAllPending()}
                  className="btn btn-danger-outline"
                  title="Clear pending changes (data will not be synced)"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Offline-First Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Offline-First Mode</h4>
              <p className="text-sm text-blue-700">
                AstroHEALTH works fully offline. All your data is stored locally on your device and will 
                automatically sync to the cloud when you're connected to the internet. You can continue 
                working even without an internet connection.
              </p>
            </div>

            {/* Sync Debug Section */}
            <div className="card border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                Sync Diagnostics
              </h3>
              
              {/* Supabase Configuration Status */}
              <div className="mb-4 p-3 rounded-lg border" style={{
                backgroundColor: syncDebugInfo.supabaseConfigured ? '#f0fdf4' : '#fef2f2',
                borderColor: syncDebugInfo.supabaseConfigured ? '#86efac' : '#fecaca'
              }}>
                <div className="flex items-center gap-2">
                  {syncDebugInfo.supabaseConfigured ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Supabase Configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-800">Supabase NOT Configured</span>
                    </>
                  )}
                </div>
                {!syncDebugInfo.supabaseConfigured && (
                  <p className="text-sm text-red-700 mt-2">
                    Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. 
                    Data will NOT sync between devices. Add these to Vercel Environment Variables.
                  </p>
                )}
              </div>
              
              {/* Connection Test Result */}
              {syncDebugInfo.connectionTest && (
                <div className="mb-4 p-3 rounded-lg border" style={{
                  backgroundColor: syncDebugInfo.connectionTest.success ? '#f0fdf4' : '#fef2f2',
                  borderColor: syncDebugInfo.connectionTest.success ? '#86efac' : '#fecaca'
                }}>
                  <p className="font-medium" style={{ 
                    color: syncDebugInfo.connectionTest.success ? '#166534' : '#991b1b' 
                  }}>
                    {syncDebugInfo.connectionTest.message}
                  </p>
                </div>
              )}
              
              {/* Local Data Counts */}
              {Object.keys(syncDebugInfo.localCounts).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Local Data Counts:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(syncDebugInfo.localCounts).map(([table, count]) => (
                      <div key={table} className="p-2 bg-gray-50 rounded text-center">
                        <p className="text-xs text-gray-500 capitalize">{table}</p>
                        <p className="font-bold text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Test Connection Button */}
              <button
                onClick={handleTestSyncConnection}
                disabled={syncDebugInfo.testing}
                className="btn btn-secondary w-full"
              >
                {syncDebugInfo.testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-4 h-4" />
                    Test Sync Connection
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );

      case 'data':
        const usedMB = Math.round(storageUsage.used / (1024 * 1024));
        const quotaMB = Math.round(storageUsage.quota / (1024 * 1024));
        const usagePercent = storageUsage.quota > 0 ? (storageUsage.used / storageUsage.quota) * 100 : 0;
        
        return (
          <motion.div
            key="data"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
              <div className="card border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <HardDrive className="w-8 h-8 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Local Storage</span>
                      <span className="text-sm font-medium text-gray-900">
                        {usedMB} MB / {quotaMB > 1000 ? `${Math.round(quotaMB / 1024)} GB` : `${quotaMB} MB`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-violet-600'}`} 
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export & Backup</h3>
              <div className="card border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Export Data</p>
                    <p className="text-sm text-gray-500">Download all your data as JSON</p>
                  </div>
                  <button onClick={handleExportData} className="btn btn-secondary">
                    <Download size={18} />
                    Export
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Import Data</p>
                    <p className="text-sm text-gray-500">Restore data from a backup file</p>
                  </div>
                  <button className="btn btn-secondary">
                    <Upload size={18} />
                    Import
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Management</h3>
              <div className="card border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Clear Cache</p>
                    <p className="text-sm text-gray-500">Remove temporary files to free up space</p>
                  </div>
                  <button onClick={handleClearCache} className="btn btn-warning-outline">
                    <Trash2 size={18} />
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>

            {/* Cloud Migration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cloud Sync</h3>
              <DataMigration />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-red-600">Danger Zone</h3>
              <div className="card border border-red-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">Delete All Local Data</p>
                    <p className="text-sm text-gray-500">Permanently delete all data stored on this device</p>
                  </div>
                  <button className="btn bg-red-600 text-white hover:bg-red-700">
                    <Trash2 size={18} />
                    Delete All
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />
          Settings
        </h1>
        <p className="page-subtitle">
          Manage your account and application preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Sidebar - Horizontal scroll on mobile */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card card-compact p-2 overflow-x-auto lg:overflow-visible">
            <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors whitespace-nowrap min-h-touch ${
                    activeTab === tab.id
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon size={20} />
                  <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card card-compact p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {renderTabContent()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
