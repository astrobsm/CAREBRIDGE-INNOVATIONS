import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import initPWA from './services/pwaService';
import { initCloudSync, fullSync } from './services/cloudSyncService';
import { initializeDemoData } from './database';
import './index.css';

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
  </React.StrictMode>
);

// Initialize cloud sync AFTER React has mounted
// This prevents state updates from happening before React is ready
setTimeout(() => {
  initCloudSync();
}, 100);
