// PWA Service - Install prompt, Service Worker registration, and update handling
import { useState, useEffect, useCallback } from 'react';

// Types
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

// Global state
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let updateAvailable = false;

// Register Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    swRegistration = registration;

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            updateAvailable = true;
            // Dispatch custom event for update notification
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
          }
        });
      }
    });

    // Handle controller change (after update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

// Apply pending update
export async function applyUpdate(): Promise<void> {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Check if app is installed
export function isAppInstalled(): boolean {
  // Check display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check iOS standalone
  if ((navigator as Navigator & { standalone?: boolean }).standalone) {
    return true;
  }

  // Check if launched from installed app
  if (document.referrer.includes('android-app://')) {
    return true;
  }

  return false;
}

// Prompt install
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Install prompt outcome:', outcome);
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[PWA] Install prompt error:', error);
    return false;
  }
}

// Initialize PWA
export function initPWA(): void {
  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
    console.log('[PWA] Install prompt captured');
  });

  // Listen for successful install
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
    console.log('[PWA] App installed');
  });

  // Register service worker
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', () => {
      registerServiceWorker();
    });
  }
}

// React Hook for PWA state
export function usePWA(): PWAState & {
  install: () => Promise<boolean>;
  update: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
} {
  const [state, setState] = useState<PWAState>({
    isInstallable: !!deferredPrompt,
    isInstalled: isAppInstalled(),
    isUpdateAvailable: updateAvailable,
    isOffline: !navigator.onLine,
    registration: swRegistration
  });

  useEffect(() => {
    const handleInstallable = () => {
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleInstalled = () => {
      setState((prev) => ({ ...prev, isInstalled: true, isInstallable: false }));
    };

    const handleUpdateAvailable = () => {
      setState((prev) => ({ ...prev, isUpdateAvailable: true }));
    };

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result) {
      setState((prev) => ({ ...prev, isInstalled: true, isInstallable: false }));
    }
    return result;
  }, []);

  const update = useCallback(async () => {
    await applyUpdate();
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (swRegistration) {
      await swRegistration.update();
    }
  }, []);

  return {
    ...state,
    install,
    update,
    checkForUpdates
  };
}

// Export for initialization
export default initPWA;
