import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import initPWA from './services/pwaService';
import { initCloudSync } from './services/cloudSyncService';
import './index.css';

// Initialize PWA (service worker, install prompt)
initPWA();

// Note: Cloud sync is now initialized AFTER React mounts to avoid state update issues
// initCloudSync() will be called after the first render

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
