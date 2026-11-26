/**
 * "Multi-site / hospital features": shows the modules that only make sense
 * across several hospitals (hospitals, payroll, MDT, tumour board, referrals,
 * pharmacy, communication ...). Default OFF: this deployment is one private
 * practice. Stored per device in localStorage, like the app's other settings
 * (voice alarms, install prompt); the routes stay reachable by URL either way.
 */

import { useSyncExternalStore } from 'react';

export const MULTI_SITE_KEY = 'carebridge_multi_site_features';
const EVENT = 'carebridge:practice-settings';

export function isMultiSiteEnabled(): boolean {
  try {
    return localStorage.getItem(MULTI_SITE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMultiSiteEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(MULTI_SITE_KEY, enabled ? 'true' : 'false');
  } catch {
    /* storage unavailable: the menu simply stays as it was */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === MULTI_SITE_KEY) cb(); };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

/** Live value; re-renders when toggled here or in another tab. */
export function useMultiSiteEnabled(): boolean {
  return useSyncExternalStore(subscribe, isMultiSiteEnabled, () => false);
}
