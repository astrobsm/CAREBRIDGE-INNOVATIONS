// App Update Prompt Component
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  RefreshCw, 
  X, 
  CheckCircle, 
  Smartphone
} from 'lucide-react';
import { usePWA, checkForAppUpdate, forceReloadForUpdate, getAppVersion } from '../../services/pwaService';
import toast from 'react-hot-toast';

interface UpdatePromptProps {
  /** Show as a floating banner or inline card */
  variant?: 'banner' | 'card' | 'minimal';
  /** Callback when update is applied */
  onUpdateApplied?: () => void;
}

export default function UpdatePrompt({ variant = 'banner', onUpdateApplied }: UpdatePromptProps) {
  const pwa = usePWA();
  const [isChecking, setIsChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  }>({
    checked: false,
    available: pwa.isUpdateAvailable,
    message: ''
  });
  const [isDismissed, setIsDismissed] = useState(false);

  // Listen for update availability
  useEffect(() => {
    if (pwa.isUpdateAvailable) {
      setUpdateStatus({
        checked: true,
        available: true,
        message: 'A new version is available!'
      });
    }
  }, [pwa.isUpdateAvailable]);

  const handleCheckForUpdates = useCallback(async () => {
    setIsChecking(true);
    setIsDismissed(false);
    
    try {
      const result = await checkForAppUpdate();
      setUpdateStatus({
        checked: true,
        available: result.available,
        message: result.message
      });
      
      if (result.available) {
        toast.success(result.message, { icon: '🎉' });
      } else {
        toast.success(result.message, { icon: '✅' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check for updates';
      setUpdateStatus({
        checked: true,
        available: false,
        message
      });
      toast.error(message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleApplyUpdate = useCallback(async () => {
    toast.loading('Installing update...', { id: 'update-toast' });
    
    try {
      await pwa.update();
      onUpdateApplied?.();
      
      // Give time for the service worker to activate, then reload
      setTimeout(() => {
        forceReloadForUpdate();
      }, 500);
    } catch (error) {
      toast.error('Failed to apply update. Please refresh the page.', { id: 'update-toast' });
    }
  }, [pwa, onUpdateApplied]);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Minimal variant - just a button
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </button>
        
        {updateStatus.available && !isDismissed && (
          <button
            onClick={handleApplyUpdate}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install Update
          </button>
        )}
      </div>
    );
  }

  // Card variant - inline card display
  if (variant === 'card') {
    return (
      <div className="card border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-violet-600" />
            App Updates
          </h3>
          <span className="text-sm text-gray-500">v{getAppVersion()}</span>
        </div>

        <div className="space-y-4">
          {/* Update Status */}
          {updateStatus.checked && (
            <div className={`p-3 rounded-lg flex items-center gap-3 ${
              updateStatus.available 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              {updateStatus.available ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${updateStatus.available ? 'text-green-800' : 'text-gray-700'}`}>
                  {updateStatus.message}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </button>
            
            {updateStatus.available && (
              <button
                onClick={handleApplyUpdate}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install Update
              </button>
            )}
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Updates are downloaded automatically. Click "Check for Updates" to verify you have the latest version.
          </p>
        </div>
      </div>
    );
  }

  // Banner variant - floating notification
  return (
    <AnimatePresence>
      {updateStatus.available && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Update Available</h4>
                <p className="text-sm text-white/80 mt-0.5">
                  A new version of AstroHEALTH is ready to install.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleApplyUpdate}
                    className="px-4 py-1.5 bg-white text-violet-700 text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-1.5 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Dismiss update notification"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to use update check functionality elsewhere
export function useAppUpdate() {
  const pwa = usePWA();
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(pwa.isUpdateAvailable);

  useEffect(() => {
    setUpdateAvailable(pwa.isUpdateAvailable);
  }, [pwa.isUpdateAvailable]);

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkForAppUpdate();
      setUpdateAvailable(result.available);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    await pwa.update();
    setTimeout(() => {
      forceReloadForUpdate();
    }, 500);
  }, [pwa]);

  return {
    isChecking,
    updateAvailable,
    checkForUpdates,
    applyUpdate,
    version: getAppVersion()
  };
}
