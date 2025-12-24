// Offline Fallback Page - shown when completely offline with no cached data
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface OfflinePageProps {
  onRetry?: () => void;
}

export default function OfflinePage({ onRetry }: OfflinePageProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        {/* Offline Icon */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <WifiOff className="w-12 h-12 text-amber-600" />
          </div>
        </motion.div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img 
            src="/icons/logo.png" 
            alt="CareBridge" 
            className="w-12 h-12 rounded-xl bg-white p-1 shadow-md"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">
            CareBridge
          </span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          You're Offline
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. Don't worry - 
          CareBridge works offline! Your data is safely stored on this device.
        </p>

        {/* Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 text-left">
          <h3 className="font-medium text-gray-900 mb-4">While offline you can:</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              </span>
              <span>View all previously loaded patients and records</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              </span>
              <span>Add new patients and clinical notes</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              </span>
              <span>Use all clinical calculators</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
              </span>
              <span>Generate PDF reports</span>
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
            All changes will automatically sync when you're back online.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </a>
        </div>

        {/* Connection status */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span>Waiting for connection...</span>
        </div>
      </motion.div>
    </div>
  );
}
