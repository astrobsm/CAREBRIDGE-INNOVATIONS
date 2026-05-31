import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { startRealtimeSync } from './services/realtimeSync';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Kick off Supabase Realtime — pushes remote writes to this device in <1s
// and triggers syncEngine.sync() automatically. Safe no-op if env not set.
startRealtimeSync();

serviceWorkerRegistration.unregister();
