// PWA Install Prompt Component
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor, Tablet, Check, WifiOff, RefreshCw } from 'lucide-react';
import { usePWA } from '../../services/pwaService';

export default function InstallPrompt() {
  const { isInstallable, isInstalled, isUpdateAvailable, isOffline, install, update } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissedAt = localStorage.getItem('pwa_install_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Show prompt after a delay
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowUpdateBanner(true);
    }
  }, [isUpdateAvailable]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  const handleUpdate = async () => {
    await update();
    setShowUpdateBanner(false);
  };

  // Detect device type for icon
  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod/.test(userAgent)) {
      if (/ipad|tablet/.test(userAgent)) {
        return <Tablet className="w-6 h-6" />;
      }
      return <Smartphone className="w-6 h-6" />;
    }
    return <Monitor className="w-6 h-6" />;
  };

  return (
    <>
      {/* Offline Indicator */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2"
          >
            <WifiOff className="w-4 h-4" />
            <span>You're offline. Changes will sync when you're back online.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Banner */}
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: isOffline ? 36 : 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[99] bg-indigo-600 text-white py-3 px-4"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">A new version of CareBridge is available!</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateBanner(false)}
                  className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
                >
                  Update Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Prompt Modal */}
      <AnimatePresence>
        {showPrompt && !isInstalled && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
              className="fixed inset-0 bg-black/50 z-[100]"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#5170FF] to-[#1800AC] p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/icons/logo.png" 
                      alt="CareBridge" 
                      className="w-12 h-12 rounded-xl bg-white p-1 shadow-lg"
                    />
                    <div>
                      <h3 className="font-bold text-lg">Install CareBridge</h3>
                      <p className="text-indigo-100 text-sm">Get the full app experience</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <WifiOff className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Works offline - access data anywhere</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      {getDeviceIcon()}
                    </div>
                    <span className="text-sm">Quick access from your home screen</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Automatic sync across all devices</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 px-4 py-2.5 text-gray-600 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Not Now
                  </button>
                  <button
                    onClick={handleInstall}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#5170FF] to-[#1800AC] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Installed Success Toast */}
      <AnimatePresence>
        {isInstalled && !dismissed && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg p-4 flex items-center gap-3 z-50"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">App Installed!</p>
              <p className="text-sm text-gray-500">CareBridge is ready to use</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
