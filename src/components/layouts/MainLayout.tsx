import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../navigation/Sidebar';
import Header from '../navigation/Header';
import { useOfflineState } from '../../services/offlineDataManager';
import { WifiOff, X, RefreshCw } from 'lucide-react';

// Offline Banner Component
function OfflineBanner() {
  const offlineState = useOfflineState();
  const [dismissed, setDismissed] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    // Reset dismissed state when going offline
    if (!offlineState.isOnline) {
      setDismissed(false);
    }
  }, [offlineState.isOnline]);

  useEffect(() => {
    // Show sync success message briefly after coming back online
    if (offlineState.isOnline && offlineState.pendingChanges === 0 && !offlineState.isSyncing) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [offlineState.isOnline, offlineState.pendingChanges, offlineState.isSyncing]);

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

  // Sync success toast (briefly shown)
  if (showSyncSuccess) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <span className="font-medium">✓ All changes synced successfully!</span>
        </div>
      </div>
    );
  }

  return null;
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Offline/Sync Status Banner */}
      <OfflineBanner />
      
      <div className="flex-1 flex">
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
        <div className="flex-1 lg:pl-72 flex flex-col">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 py-6">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
