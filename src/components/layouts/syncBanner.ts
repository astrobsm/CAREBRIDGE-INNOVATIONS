/**
 * When the layout may tell the user that their work reached the cloud.
 *
 * The old banner said "All changes synced successfully!" on every load and on
 * every reconnect, even for an offline-only session or with no Supabase at
 * all. It now speaks only about a sync that actually ran: success when a
 * sync finished without an error, failure when it finished with one.
 */

/** The parts of the cloud sync state this decision reads. */
export interface SyncSnapshot {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
}

export interface SyncBannerContext {
  /** 'online' only for a real Supabase session; 'offline' for a device-only sign-in. */
  sessionMode: 'online' | 'offline' | null;
  /** False when Supabase is not configured: nothing can ever sync. */
  cloudConfigured: boolean;
}

export type SyncBanner =
  | { kind: 'success'; message: string }
  | { kind: 'failure'; message: string };

const time = (d: Date | null): number | null => (d ? new Date(d).getTime() : null);

/**
 * Compare two consecutive sync states and decide whether a sync just ended,
 * and how. `prev` is null for the first state seen (page load): that is never
 * a completion, so nothing is shown.
 */
export function syncBannerFor(
  prev: SyncSnapshot | null,
  next: SyncSnapshot,
  ctx: SyncBannerContext,
): SyncBanner | null {
  if (!ctx.cloudConfigured || ctx.sessionMode !== 'online') return null;
  if (!prev) return null;

  const finished = prev.isSyncing && !next.isSyncing;
  const newError = !!next.error && next.error !== prev.error && !next.isSyncing;

  if ((finished && next.error) || newError) {
    return { kind: 'failure', message: `Sync failed: ${next.error}. Your changes are kept on this device.` };
  }
  if (finished && next.lastSyncAt && time(next.lastSyncAt) !== time(prev.lastSyncAt)) {
    return { kind: 'success', message: 'All changes synced to the cloud.' };
  }
  return null;
}
