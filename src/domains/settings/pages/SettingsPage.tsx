import { useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database';

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
  const [isSyncing, setIsSyncing] = useState(false);

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
    setIsSyncing(true);
    try {
      // Simulate sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Data synchronized successfully!');
    } catch (error) {
      toast.error('Sync failed. Will retry later.');
    } finally {
      setIsSyncing(false);
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
      a.download = `carebridge-export-${new Date().toISOString().split('T')[0]}.json`;
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
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="btn btn-primary"
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
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: theme.value })}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      appearanceSettings.theme === theme.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <theme.icon className={`w-8 h-8 mx-auto mb-2 ${
                      appearanceSettings.theme === theme.value ? 'text-violet-600' : 'text-gray-400'
                    }`} />
                    <p className={`text-sm font-medium ${
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
              <div className="grid grid-cols-3 gap-4">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setAppearanceSettings({ ...appearanceSettings, fontSize: size })}
                    className={`p-4 rounded-lg border-2 transition-colors ${
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
            <div className="card bg-gradient-to-r from-blue-50 to-violet-50 p-4">
              <div className="flex items-center gap-3">
                {navigator.onLine ? (
                  <>
                    <Wifi className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">Online</p>
                      <p className="text-sm text-gray-500">Connected and syncing</p>
                    </div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="font-medium text-gray-900">Offline</p>
                      <p className="text-sm text-gray-500">Working offline, data will sync when connected</p>
                    </div>
                  </>
                )}
              </div>
            </div>

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
              <button onClick={handleSync} disabled={isSyncing} className="btn btn-primary flex-1">
                {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <Cloud size={18} />}
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </motion.div>
        );

      case 'data':
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
                      <span className="text-sm font-medium text-gray-900">45 MB / 500 MB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-violet-600 h-2 rounded-full" style={{ width: '9%' }}></div>
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-gray-500" />
          Settings
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your account and application preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card p-6">
            <AnimatePresence mode="wait">
              {renderTabContent()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
