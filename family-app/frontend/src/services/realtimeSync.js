// =============================================================================
// realtimeSync.js — Supabase Realtime listener for cross-device sync
// =============================================================================
// Subscribes to every family.* table. Whenever a remote device writes to
// Postgres, we receive a push within ~1s, drain our offline outbox to the
// server, then pull the fresh rows. Components also receive a window event
// ('family-realtime') so they can refresh visible UI.
// =============================================================================
import { createClient } from '@supabase/supabase-js';
import { syncEngine } from './syncEngine';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

let client = null;
let channel = null;
let debounceTimer = null;

function debouncedSync(table, evt, row) {
  // Fan out an immediate UI hint so components can refresh themselves.
  try {
    window.dispatchEvent(new CustomEvent('family-realtime', {
      detail: { table, event: evt, row },
    }));
  } catch (_) { /* no-op */ }

  // Relay to the AstroHEALTH parent (iframe host) so Part C can toast etc.
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: 'family-realtime', table, event: evt },
        '*'
      );
    }
  } catch (_) { /* no-op */ }

  // Debounce the heavier sync (covers burst updates from the same writer).
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (syncEngine && typeof syncEngine.sync === 'function') {
      syncEngine.sync().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[realtimeSync] sync after realtime push failed:', err);
      });
    }
  }, 400);
}

export function startRealtimeSync() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // eslint-disable-next-line no-console
    console.info('[realtimeSync] REACT_APP_SUPABASE_URL / _ANON_KEY not set — realtime disabled.');
    return null;
  }
  if (channel) return channel; // already started

  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
    db: { schema: 'family' },
  });

  channel = client
    .channel('family-cross-device-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'family' }, // every table, every event
      (payload) => {
        debouncedSync(payload.table, payload.eventType, payload.new || payload.old);
      }
    )
    .subscribe((status) => {
      // eslint-disable-next-line no-console
      console.info('[realtimeSync] channel status:', status);
    });

  // When the tab/device comes back online, force a one-shot sync.
  window.addEventListener('online', () => {
    if (syncEngine && typeof syncEngine.sync === 'function') {
      syncEngine.sync().catch(() => {});
    }
  });

  // Receive sync hints from the AstroHEALTH parent (postMessage from /family).
  window.addEventListener('message', (evt) => {
    if (evt && evt.data && evt.data.type === 'astrohealth-trigger-family-sync') {
      if (syncEngine && typeof syncEngine.sync === 'function') {
        syncEngine.sync().catch(() => {});
      }
    }
  });

  return channel;
}

export function stopRealtimeSync() {
  if (channel && client) {
    client.removeChannel(channel);
    channel = null;
  }
}
