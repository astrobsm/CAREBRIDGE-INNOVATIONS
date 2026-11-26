import { describe, it, expect } from 'vitest';
import { syncBannerFor, type SyncSnapshot } from '../syncBanner';

const online = { sessionMode: 'online' as const, cloudConfigured: true };
const idle: SyncSnapshot = { isSyncing: false, lastSyncAt: null, error: null };
const syncing: SyncSnapshot = { isSyncing: true, lastSyncAt: null, error: null };
const done: SyncSnapshot = { isSyncing: false, lastSyncAt: new Date('2026-11-26T10:00:00Z'), error: null };

describe('syncBannerFor', () => {
  it('shows nothing on page load', () => {
    expect(syncBannerFor(null, idle, online)).toBeNull();
    expect(syncBannerFor(null, done, online)).toBeNull();
  });

  it('shows nothing when no sync ran (idle to idle, e.g. reconnect without a session sync)', () => {
    expect(syncBannerFor(idle, idle, online)).toBeNull();
    expect(syncBannerFor(done, done, online)).toBeNull();
  });

  it('reports success only after a sync finished without error', () => {
    expect(syncBannerFor(syncing, done, online)).toMatchObject({ kind: 'success' });
  });

  it('does not report success when the sync ended without a new completion time', () => {
    expect(syncBannerFor({ ...done, isSyncing: true }, done, online)).toBeNull();
    expect(syncBannerFor(syncing, idle, online)).toBeNull();
  });

  it('reports a failure when a sync finished with an error', () => {
    const r = syncBannerFor(syncing, { ...idle, error: 'network down' }, online);
    expect(r).toMatchObject({ kind: 'failure' });
    expect(r?.message).toContain('network down');
    expect(r?.message).toMatch(/failed/i);
  });

  it('reports a failure when sync is refused without starting (e.g. HTTP 402 pause)', () => {
    expect(syncBannerFor(idle, { ...idle, error: 'HTTP 402' }, online)).toMatchObject({ kind: 'failure' });
    // ...but not again for the same, already-shown error
    expect(syncBannerFor({ ...idle, error: 'HTTP 402' }, { ...idle, error: 'HTTP 402' }, online)).toBeNull();
  });

  it('never speaks for an offline (device-only) session', () => {
    const ctx = { sessionMode: 'offline' as const, cloudConfigured: true };
    expect(syncBannerFor(syncing, done, ctx)).toBeNull();
    expect(syncBannerFor(syncing, { ...idle, error: 'x' }, ctx)).toBeNull();
  });

  it('never speaks when Supabase is not configured or nobody is signed in', () => {
    expect(syncBannerFor(syncing, done, { sessionMode: 'online', cloudConfigured: false })).toBeNull();
    expect(syncBannerFor(syncing, done, { sessionMode: null, cloudConfigured: true })).toBeNull();
  });
});
