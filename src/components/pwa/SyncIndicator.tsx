// Sync Status Indicator Component
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ChevronDown,
  Smartphone,
  Clock
} from 'lucide-react';
import { useSyncState, syncService, type SyncState } from '../../services/cloudSyncService';

// SyncStatus type for compatibility
type SyncStatus = SyncState['status'];

interface SyncIndicatorProps {
  compact?: boolean;
}

export default function SyncIndicator({ compact = false }: SyncIndicatorProps) {
  const syncState = useSyncState();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'syncing':
        return {
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Syncing...',
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
          border: 'border-indigo-200'
        };
      case 'success':
        return {
          icon: <Check className="w-4 h-4" />,
          text: 'Synced',
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Sync Error',
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        };
      case 'offline':
        return {
          icon: <CloudOff className="w-4 h-4" />,
          text: 'Offline',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200'
        };
      default:
        return {
          icon: <Cloud className="w-4 h-4" />,
          text: 'Ready',
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig(syncState.status);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  const handleForceSync = async () => {
    await syncService.forceSync();
  };

  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${config.bg} ${config.color} ${config.border} border`}
        title={`Sync Status: ${config.text}`}
      >
        {config.icon}
        {syncState.pendingChanges > 0 && (
          <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
            {syncState.pendingChanges}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${config.bg} ${config.color} border ${config.border} hover:shadow-sm`}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.text}</span>
        {syncState.pendingChanges > 0 && (
          <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs">
            {syncState.pendingChanges}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showDetails && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDetails(false)} 
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className={`p-4 ${config.bg} border-b ${config.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span className={`font-medium ${config.color}`}>{config.text}</span>
                  </div>
                  {syncState.isOnline && (
                    <button
                      onClick={handleForceSync}
                      disabled={syncState.status === 'syncing'}
                      className="p-2 hover:bg-white/50 rounded-lg transition-colors disabled:opacity-50"
                      title="Force Sync"
                    >
                      <RefreshCw className={`w-4 h-4 ${config.color} ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                {/* Last Sync */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Last synced</span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatLastSync(syncState.lastSyncAt)}
                  </span>
                </div>

                {/* Pending Changes */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Cloud className="w-4 h-4" />
                    <span>Pending changes</span>
                  </div>
                  <span className={`font-medium ${syncState.pendingChanges > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {syncState.pendingChanges}
                  </span>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Smartphone className="w-4 h-4" />
                    <span>Connection</span>
                  </div>
                  <span className={`font-medium flex items-center gap-1 ${syncState.isOnline ? 'text-green-600' : 'text-amber-600'}`}>
                    {syncState.isOnline ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Online
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-amber-500 rounded-full" />
                        Offline
                      </>
                    )}
                  </span>
                </div>

                {/* Error Message */}
                {syncState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600">{syncState.error}</p>
                  </div>
                )}

                {/* Offline Notice */}
                {!syncState.isOnline && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      You're working offline. Changes will automatically sync when you're back online.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Data is stored locally and syncs automatically
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
