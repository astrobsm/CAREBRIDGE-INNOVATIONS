// Sync Status Indicator Component
import { useEffect, useId, useState } from 'react';
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
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { describeConnection, type ConnectionStatus } from './connectionStatus';

// SyncStatus type for compatibility, plus 'local': signed in offline or no
// cloud configured, so nothing syncs even with a network.
type SyncStatus = SyncState['status'] | 'local';

interface SyncIndicatorProps {
  compact?: boolean;
}

const getStatusConfig = (status: SyncStatus, connection: ConnectionStatus) => {
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
    case 'local':
      return {
        icon: <CloudOff className="w-4 h-4" />,
        text: connection.label,
        color: 'text-amber-700',
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

export default function SyncIndicator({ compact = false }: SyncIndicatorProps) {
  const syncState = useSyncState();
  const { sessionMode } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const panelId = useId();

  const connection = describeConnection({
    networkOnline: syncState.isOnline,
    sessionMode,
    cloudConfigured: isSupabaseConfigured(),
  });
  // Online network but nothing can sync: say so instead of "Ready"/"Synced".
  const status: SyncStatus =
    connection.kind === 'local' && syncState.status !== 'syncing' ? 'local' : syncState.status;
  const config = getStatusConfig(status, connection);
  const canSync = connection.kind === 'cloud';

  // Escape closes the panel
  useEffect(() => {
    if (!showDetails) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDetails(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showDetails]);

  const handleForceSync = async () => {
    await syncService.forceSync();
  };

  const trigger = compact ? (
    <button
      type="button"
      onClick={() => setShowDetails(!showDetails)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${config.bg} ${config.color} ${config.border} border`}
      title={`Sync status: ${config.text}`}
      aria-label={`Sync status: ${config.text}${syncState.pendingChanges > 0 ? `, ${syncState.pendingChanges} pending` : ''}`}
      aria-expanded={showDetails}
      aria-haspopup="dialog"
      aria-controls={showDetails ? panelId : undefined}
    >
      {config.icon}
      {syncState.pendingChanges > 0 && (
        <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
          {syncState.pendingChanges}
        </span>
      )}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setShowDetails(!showDetails)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${config.bg} ${config.color} border ${config.border} hover:shadow-sm`}
      aria-expanded={showDetails}
      aria-haspopup="dialog"
      aria-controls={showDetails ? panelId : undefined}
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
  );

  return (
    <div className="relative">
      {trigger}

      <AnimatePresence>
        {showDetails && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDetails(false)}
              aria-hidden="true"
            />

            {/* Dropdown. On a phone the compact trigger sits mid-header, so
                anchor the panel to the viewport edge instead of the button. */}
            <motion.div
              id={panelId}
              role="dialog"
              aria-label="Sync status"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`${compact ? 'fixed left-2 right-2 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-72' : 'absolute right-0 top-full w-72'} mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden`}
            >
              {/* Header */}
              <div className={`p-4 ${config.bg} border-b ${config.border}`}>
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span className={`font-medium ${config.color}`}>{config.text}</span>
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
                  <span className={`font-medium flex items-center gap-1 ${connection.kind === 'cloud' ? 'text-green-600' : 'text-amber-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${connection.kind === 'cloud' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                    {connection.label}
                  </span>
                </div>

                {/* Error Message */}
                {syncState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600">{syncState.error}</p>
                  </div>
                )}

                {/* Not syncing: offline, offline session or no cloud */}
                {connection.kind !== 'cloud' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">{connection.detail}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={!canSync || syncState.status === 'syncing'}
                  className="w-full btn btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  title={canSync ? 'Sync now' : connection.detail}
                >
                  <RefreshCw className={`w-4 h-4 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncState.status === 'syncing' ? 'Syncing…' : 'Sync now'}
                </button>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Data is stored on this device first and syncs when signed in online
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
