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
import { startNotificationScheduler, initVoiceAlarm } from './services/scheduledNotificationService';
import { requestNotificationPermission, startReminderScheduler, setupNotificationClickHandler } from './services/appointmentNotificationService';
import './index.css';

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
    if (wasOffline) {
      toast.success('You\'re back online! Syncing data...', {
        icon: '🌐',
        duration: 3000
      });
      // Trigger sync when coming back online
      setTimeout(() => fullSync(), 1000);
    }
    wasOffline = false;
  });
  
  window.addEventListener('offline', () => {
    console.log('[App] Device went offline');
    wasOffline = true;
    toast('You\'re offline. Don\'t worry - your changes are saved locally.', {
      icon: '📱',
      duration: 5000,
      style: {
        background: '#f59e0b',
        color: '#fff',
      }
    });
  });
  
  // Listen for service worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, synced, failed, remaining } = event.data || {};
      
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
  initCloudSync();
  
  // Initialize notification system
  initVoiceAlarm();
  
  // Request notification permission and start schedulers
  requestNotificationPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('[App] Notification permission granted');
      // Start the scheduled notification service (surgeries, appointments, treatment plans)
      startNotificationScheduler();
      // Start appointment reminder scheduler
      startReminderScheduler();
      // Setup notification click handlers
      setupNotificationClickHandler();
      
      toast.success('Notifications enabled! You\'ll receive reminders for upcoming events.', {
        icon: '🔔',
        duration: 4000
      });
    } else {
      console.log('[App] Notification permission:', permission);
      toast('Enable notifications to receive reminders for surgeries and appointments', {
        icon: '🔔',
        duration: 5000
      });
    }
  });
}, 100);
