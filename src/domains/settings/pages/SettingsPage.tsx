import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Cloud,
  Save,
  RefreshCw,
  Download,
  Trash2,
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
import PushNotificationSettings from '../../../components/settings/PushNotificationSettings';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database';
import { useOfflineState, offlineDataManager } from '../../../services/offlineDataManager';
import { fullSync, testSupabaseConnection } from '../../../services/cloudSyncService';
import { isSupabaseConfigured, supabase } from '../../../services/supabaseClient';
import { requestBackgroundSync, clearServiceWorkerCache } from '../../../services/pwaService';
import { UpdatePrompt } from '../../../components/pwa';
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
  { id: 'offline', label: 'Offline & Sync', icon: Cloud },
  { id: 'data', label: 'Data Management', icon: Database },
];

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const offlineState = useOfflineState();
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });
  const [syncDebugInfo, setSyncDebugInfo] = useState<{
    supabaseConfigured: boolean;
    connectionTest: { success: boolean; message: string } | null;
    localCounts: Record<string, number>;
    cloudCounts: Record<string, number>;
    testing: boolean;
    forcePulling: boolean;
  }>({
    supabaseConfigured: isSupabaseConfigured(),
    connectionTest: null,
    localCounts: {},
    cloudCounts: {},
    testing: false,
    forcePulling: false,
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
    specialty: user?.specialty || user?.specialization || '',
  });

  // Saves for real. This used to wait a second and report success without
  // writing anything. The email is the sign-in identity and is changed by an
  // administrator in User Management, where duplicates are refused.
  const handleSaveProfile = async () => {
    const firstName = profileSettings.firstName.trim();
    const lastName = profileSettings.lastName.trim();
    if (!firstName || !lastName) {
      toast.error('First and last name are required');
      return;
    }
    setIsSaving(true);
    try {
      const specialty = profileSettings.specialty.trim();
      await updateUser({
        firstName,
        lastName,
        phone: profileSettings.phone.trim() || undefined,
        specialization: specialty || undefined,
        specialty: specialty || undefined,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
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
      const localCounts: Record<string, number> = {};
      localCounts.patients = await db.patients.count();
      localCounts.admissions = await db.admissions.count();
      localCounts.users = await db.users.count();
      localCounts.hospitals = await db.hospitals.count();
      localCounts.surgeries = await db.surgeries.count();
      localCounts.encounters = await db.clinicalEncounters.count();
      localCounts.wardRounds = await db.wardRounds.count();
      localCounts.vitals = await db.vitalSigns.count();
      
      // Test Supabase connection
      const connectionTest = await testSupabaseConnection();
      
      // Get cloud record counts if connected
      const cloudCounts: Record<string, number> = {};
      if (connectionTest.success && supabase) {
        try {
          const tables = ['patients', 'admissions', 'users', 'hospitals', 'surgeries', 'clinical_encounters', 'ward_rounds', 'vital_signs'];
          const displayNames = ['patients', 'admissions', 'users', 'hospitals', 'surgeries', 'encounters', 'wardRounds', 'vitals'];
          
          for (let i = 0; i < tables.length; i++) {
            const { count, error } = await supabase.from(tables[i]).select('*', { count: 'exact', head: true });
            if (!error && count !== null) {
              cloudCounts[displayNames[i]] = count;
            }
          }
        } catch (e) {
          console.warn('Failed to get cloud counts:', e);
        }
      }
      
      setSyncDebugInfo({
        supabaseConfigured: isSupabaseConfigured(),
        connectionTest,
        localCounts,
        cloudCounts,
        testing: false,
        forcePulling: false,
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

  // Force pull all data from cloud (useful for new devices)
  const handleForcePullFromCloud = async () => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase is not configured. Cannot pull from cloud.');
      return;
    }
    
    setSyncDebugInfo(prev => ({ ...prev, forcePulling: true }));
    toast.loading('Pulling all data from cloud...', { id: 'force-pull' });
    
    try {
      // Clear sync state to force fresh pull
      await fullSync();
      
      // Get updated local counts
      const localCounts: Record<string, number> = {};
      localCounts.patients = await db.patients.count();
      localCounts.admissions = await db.admissions.count();
      localCounts.users = await db.users.count();
      localCounts.hospitals = await db.hospitals.count();
      localCounts.surgeries = await db.surgeries.count();
      localCounts.encounters = await db.clinicalEncounters.count();
      localCounts.wardRounds = await db.wardRounds.count();
      localCounts.vitals = await db.vitalSigns.count();
      
      setSyncDebugInfo(prev => ({ 
        ...prev, 
        localCounts,
        forcePulling: false 
      }));
      
      const patientCount = localCounts.patients || 0;
      toast.success(`Sync complete! ${patientCount} patients now available.`, { id: 'force-pull' });
      
      // Show alert for user
      if (patientCount === 0) {
        toast('No patients found in cloud. Make sure RLS policies allow access.', { 
          icon: '⚠️', 
          duration: 5000 
        });
      }
    } catch (error) {
      console.error('Force pull failed:', error);
      setSyncDebugInfo(prev => ({ ...prev, forcePulling: false }));
      toast.error(`Pull failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'force-pull' });
    }
  };

  // Discarding pending changes loses work that exists only on this device.
  // It was a bare trash icon with no confirmation.
  const handleDiscardPending = async () => {
    const n = offlineState.pendingChanges;
    if (!window.confirm(
      `Discard ${n} unsynced ${n === 1 ? 'change' : 'changes'}?\n\n` +
      'They exist only on this device and will never reach the cloud or other devices. This cannot be undone.'
    )) return;
    await offlineDataManager.clearAllPending();
    toast.success('Unsynced changes discarded');
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
    // The cache holds the app itself. Cleared offline, the app cannot load
    // again until the device is back online.
    if (!offlineState.isOnline) {
      toast.error('You are offline. Clearing the cache now would stop the app opening until you reconnect.');
      return;
    }
    if (window.confirm('Clear the app cache? Your records are not affected; the app files download again on next load.')) {
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
                    title="Enter first name"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={profileSettings.lastName}
                    onChange={(e) => setProfileSettings({ ...profileSettings, lastName: e.target.value })}
                    className="input"
                    title="Enter last name"
                    placeholder="Last Name"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={profileSettings.email}
                    disabled
                    className="input bg-gray-100"
                    title="Sign-in email (read-only)"
                    placeholder="Email"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your sign-in address. An administrator can change it in User Management.</p>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={profileSettings.phone}
                    onChange={(e) => setProfileSettings({ ...profileSettings, phone: e.target.value })}
                    className="input"
                    title="Enter phone number"
                    placeholder="Phone"
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
                    title="User role (read-only)"
                    placeholder="Role"
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
                    title="Enter your specialty"
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

            {/* Web Push Notifications - Advanced Settings */}
            <PushNotificationSettings />
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
              <div className="card border p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  Passwords are set and reset by an administrator in User Management. If you have
                  forgotten yours, or think someone else knows it, ask an administrator to reset it.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">This Device</h3>
              <div className="card border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Monitor className="w-8 h-8 text-gray-400" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">Signed in as {user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  On a shared device, sign out when you finish so the next person cannot see your patients
                  or receive your alerts.
                </p>
                <button onClick={logout} className="btn btn-danger-outline text-sm">
                  Sign Out of This Device
                </button>
              </div>
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

            {/* How sync works. These were toggles (auto-sync, interval, cache
                images) that changed nothing; this says what actually happens. */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How Sync Works</h3>
              <ul className="list-disc ml-5 space-y-1 text-sm text-gray-600">
                <li>Every change is saved on this device first, then sent to the cloud.</li>
                <li>While online, the app syncs about every 30 seconds and receives other devices&rsquo; changes as they happen.</li>
                <li>After repeated failures it backs off, up to every 5 minutes, and resumes when the connection returns.</li>
              </ul>
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
                  onClick={handleDiscardPending}
                  className="btn btn-danger-outline"
                  title="Discard unsynced changes (they will never be synced)"
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

            {/* App Updates Section */}
            <UpdatePrompt variant="card" />

            {/* Sync Debug Section */}
            <div className="card border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                Sync Diagnostics
              </h3>
              
              {/* Supabase Configuration Status */}
              <div className={`mb-4 p-3 rounded-lg border ${syncDebugInfo.supabaseConfigured ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'}`}>
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
                <div className={`mb-4 p-3 rounded-lg border ${syncDebugInfo.connectionTest.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'}`}>
                  <p className={`font-medium ${syncDebugInfo.connectionTest.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncDebugInfo.connectionTest.message}
                  </p>
                </div>
              )}
              
              {/* Local Data Counts */}
              {Object.keys(syncDebugInfo.localCounts).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Data Comparison (Local vs Cloud):</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(syncDebugInfo.localCounts).map(([table, localCount]) => {
                      const cloudCount = syncDebugInfo.cloudCounts[table];
                      const hasCloudData = cloudCount !== undefined;
                      const isMismatch = hasCloudData && cloudCount !== localCount;
                      const needsSync = hasCloudData && cloudCount > localCount;
                      
                      return (
                        <div 
                          key={table} 
                          className={`p-2 rounded text-center border ${
                            needsSync ? 'bg-yellow-50 border-yellow-300' : 
                            isMismatch ? 'bg-orange-50 border-orange-300' : 
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <p className="text-xs text-gray-500 capitalize">{table}</p>
                          <p className="font-bold text-gray-900">{localCount}</p>
                          {hasCloudData && (
                            <p className={`text-xs ${needsSync ? 'text-yellow-700 font-medium' : 'text-gray-400'}`}>
                              Cloud: {cloudCount}
                            </p>
                          )}
                          {needsSync && (
                            <p className="text-xs text-yellow-600 font-medium">⚠️ Sync needed</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Warning if cloud has more data */}
                  {Object.entries(syncDebugInfo.localCounts).some(([table, localCount]) => {
                    const cloudCount = syncDebugInfo.cloudCounts[table];
                    return cloudCount !== undefined && cloudCount > localCount;
                  }) && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium">
                        ⚠️ Cloud has more data than this device. Click "Force Pull from Cloud" below to sync.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Buttons */}
              <div className="space-y-3">
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
                
                {/* Force Pull from Cloud Button */}
                <button
                  onClick={handleForcePullFromCloud}
                  disabled={syncDebugInfo.forcePulling || !syncDebugInfo.supabaseConfigured || !offlineState.isOnline}
                  className="btn btn-primary w-full"
                >
                  {syncDebugInfo.forcePulling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Pulling Data from Cloud...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Force Pull from Cloud
                    </>
                  )}
                </button>
                
                {!offlineState.isOnline && (
                  <p className="text-sm text-center text-red-600">
                    <WifiOff className="w-4 h-4 inline mr-1" />
                    You are offline. Connect to the internet to sync.
                  </p>
                )}
              </div>
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
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}  // Dynamic width requires inline style
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
                    <p className="text-sm text-gray-500">Download this device&rsquo;s patients, encounters and surgeries as JSON</p>
                  </div>
                  <button onClick={handleExportData} className="btn btn-secondary">
                    <Download size={18} />
                    Export
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
                    <p className="text-sm text-gray-500">Remove the downloaded app files; your records are kept</p>
                  </div>
                  <button onClick={handleClearCache} className="btn btn-warning-outline">
                    <Trash2 size={18} />
                    Clear Cache
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
