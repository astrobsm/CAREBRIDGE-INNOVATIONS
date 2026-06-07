// Web Notifications bridge: subscribes to family.notifications inserts for
// the given user_id and shows a browser/PWA notification. Idempotent — calling
// twice with the same userId is safe.
import { useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (permissionRequested) return false;
  permissionRequested = true;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

async function show(title: string, body: string): Promise<void> {
  if (!(await ensurePermission())) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
      return;
    }
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

interface NotifPayload {
  new?: { user_id?: string; title?: string; body?: string };
}

export function useFamilyNotifications(userId: string | null | undefined): void {
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!supabase || !userId) return;
    ensurePermission();
    const channel = supabase
      .channel(`family-notif-${userId}`)
      .on(
        // @ts-expect-error postgres_changes is supported at runtime
        'postgres_changes',
        { event: 'INSERT', schema: 'family', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: NotifPayload) => {
          const row = payload?.new;
          if (!row) return;
          const key = `${row.user_id}-${row.title}-${row.body}`;
          if (seen.current.has(key)) return;
          seen.current.add(key);
          show(row.title || 'Family update', row.body || '');
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [userId]);
}
