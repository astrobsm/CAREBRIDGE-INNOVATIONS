import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import initPWA from './services/pwaService';
import { initCloudSync, fullSync } from './services/cloudSyncService';
import { initializeDemoData } from './database';
import { initVoiceAlarm } from './services/scheduledNotificationService';
import { startTreatmentReminderService } from './services/treatmentReminderService';
import { startNotificationServicesIfPermitted } from './services/notificationBootstrap';
import { installJsPdfTextSanitizer } from './utils/pdfTextSafe';
import './index.css';

// Install jsPDF text sanitizer EARLY so every generator emits clean cp1252 text
// (fixes "& þ W a r n i n g  S i g n s" garbled emoji/Unicode output).
installJsPdfTextSanitizer();

// Global error handler for React #310 debugging
// This catches errors that might escape React's error boundary
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('Objects are not valid as a React child')) {
    console.error('[Global Error] React #310 detected!');
    console.error('[Global Error] Error details:', event);
    console.error('[Global Error] Stack:', event.error?.stack);
    
    // Log any recent console warnings about objects
    console.error('[Global Error] Current pathname:', window.location.pathname);
    console.error('[Global Error] Check the console for [safeRender] or [CloudSync] warnings above');
  }
});

// Also catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason?.message?.includes('Objects are not valid as a React child')) {
    console.error('[Unhandled Rejection] React #310 detected!');
    console.error('[Unhandled Rejection] Reason:', reason);
    console.error('[Unhandled Rejection] Stack:', reason?.stack);
  }
});

// Initialize PWA (service worker, install prompt)
initPWA();

// Initialize demo data (seed hospitals if database is empty)
initializeDemoData().catch(console.error);

// Handle offline/online transitions with user notifications
function setupNetworkHandlers() {
  let wasOffline = !navigator.onLine;
  
  window.addEventListener('online', () => {
    console.log('[App] Device came online');
    // No toast here: the layout's top banner is the one place that reports
    // connectivity and sync outcome (it used to be banner + toast + card).
    if (wasOffline) {
      // Trigger Supabase sync when coming back online
      setTimeout(() => {
        fullSync();
      }, 1000);
    }
    wasOffline = false;
  });
  
  window.addEventListener('offline', () => {
    console.log('[App] Device went offline');
    wasOffline = true;
  });
  
  // Listen for service worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, synced, failed, remaining: _remaining } = event.data || {};
      
      switch (type) {
        case 'SW_ACTIVATED':
          console.log('[App] Service Worker activated:', event.data.version);
          break;
        case 'SYNC_COMPLETED':
          if (synced && synced > 0) {
            toast.success(`Synced ${synced} change${synced > 1 ? 's' : ''}`, {
              duration: 2000
            });
          }
          if (failed && failed > 0) {
            toast.error(`Failed to sync ${failed} change${failed > 1 ? 's' : ''}`, {
              duration: 3000
            });
          }
          break;
        case 'OFFLINE_QUEUE_UPDATED':
          console.log('[App] Offline queue updated:', event.data.pendingCount);
          break;
        case 'TREATMENT_ACKNOWLEDGED': {
          const { sessionId, reminderId } = event.data || {};
          import('./services/treatmentSchedulerService').then(async (mod) => {
            try {
              if (sessionId) await mod.acknowledgeSessionFromNotification(sessionId, reminderId);
            } catch (err) {
              console.warn('[App] Failed to acknowledge treatment:', err);
            }
          });
          break;
        }
      }
    });
  }
}

// Setup network handlers
setupNetworkHandlers();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Initialize cloud sync AFTER React has mounted
// This prevents state updates from happening before React is ready
setTimeout(() => {
  // Prepare Supabase cloud sync (listeners and local clean-up only). Nothing
  // is pushed, pulled or subscribed until AuthContext has a real Supabase
  // session for an active user and calls startCloudSync(); it stops again at
  // sign-out. The `fullSync()` on reconnect above is a no-op without one.
  initCloudSync();
  
  // Initialize notification system
  initVoiceAlarm();

  // Start the Patient-Flow radio-announcement service (in-app toast + chime
  // for upcoming/due/overdue treatment sessions). Works without push permission.
  startTreatmentReminderService();

  // Start the push-reminder schedulers only if permission was granted before.
  // Permission is never requested here: it is asked after sign-in, from a tap
  // on the dashboard's NotificationPermissionCard (a user gesture), once.
  startNotificationServicesIfPermitted();
}, 100);
