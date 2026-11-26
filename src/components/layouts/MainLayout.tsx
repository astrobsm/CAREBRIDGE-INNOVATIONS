import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../navigation/Sidebar';
import Header from '../navigation/Header';
import { useOfflineState } from '../../services/offlineDataManager';
import { WifiOff, X, RefreshCw } from 'lucide-react';
import { AssignmentNotificationBanner } from '../notifications';
import { initVoiceNotificationService } from '../../services/voiceNotificationService';
import { subscribeSyncState } from '../../services/cloudSyncService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { syncBannerFor, type SyncBanner, type SyncSnapshot } from './syncBanner';

// Offline Banner Component
function OfflineBanner() {
  const offlineState = useOfflineState();
  const { sessionMode } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncBanner | null>(null);
  const prevSync = useRef<SyncSnapshot | null>(null);

  useEffect(() => {
    // Reset dismissed state when going offline
    if (!offlineState.isOnline) {
      setDismissed(false);
    }
  }, [offlineState.isOnline]);

  // Report the outcome of a real cloud sync only: never on load, never for an
  // offline (device-only) session, never without Supabase. See syncBanner.ts.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeSyncState((state) => {
      const next: SyncSnapshot = { isSyncing: state.isSyncing, lastSyncAt: state.lastSyncAt, error: state.error };
      const banner = syncBannerFor(prevSync.current, next, {
        sessionMode,
        cloudConfigured: isSupabaseConfigured(),
      });
      prevSync.current = next;
      if (banner) {
        setSyncResult(banner);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setSyncResult(null), banner.kind === 'success' ? 3000 : 8000);
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [sessionMode]);

  // Offline banner
  if (!offlineState.isOnline && !dismissed) {
    return (
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-full">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <span className="font-medium">You're working offline</span>
              <span className="hidden sm:inline text-white/90 ml-2">
                — All changes are saved locally and will sync when connected
              </span>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Syncing banner
  if (offlineState.isOnline && offlineState.isSyncing) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="font-medium">Syncing your data...</span>
        </div>
      </div>
    );
  }

  // Pending changes banner
  if (offlineState.isOnline && offlineState.pendingChanges > 0) {
    return (
      <div className="bg-gradient-to-r from-yellow-500 to-orange-400 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <span className="font-medium">
            {offlineState.pendingChanges} change{offlineState.pendingChanges > 1 ? 's' : ''} waiting to sync
          </span>
        </div>
      </div>
    );
  }

  // Outcome of a sync that actually ran (briefly shown)
  if (syncResult?.kind === 'success') {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2" role="status">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <span className="font-medium">✓ {syncResult.message}</span>
        </div>
      </div>
    );
  }
  if (syncResult?.kind === 'failure') {
    return (
      <div className="bg-gradient-to-r from-red-600 to-rose-500 text-white px-4 py-2" role="alert">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <span className="font-medium text-sm">{syncResult.message}</span>
          <button
            onClick={() => setSyncResult(null)}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            title="Dismiss"
            aria-label="Dismiss sync message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize voice notifications on app load. Permission is asked only from
  // a tap on NotificationPermissionCard, never on mount.
  useEffect(() => {
    initVoiceNotificationService();
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Assignment Notification Banner - for voice notifications */}
      <AssignmentNotificationBanner />
      
      {/* Offline/Sync Status Banner */}
      <OfflineBanner />
      
      <div className="flex-1 flex min-h-0">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 lg:pl-72 flex flex-col min-h-0 min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto py-6">
            <div className="px-4 sm:px-6 lg:px-8 flex flex-col gap-4 w-full max-w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
