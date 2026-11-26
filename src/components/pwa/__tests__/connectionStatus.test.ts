import { describe, it, expect } from 'vitest';
import { describeConnection } from '../connectionStatus';

describe('describeConnection', () => {
  it('is cloud only with network, an online session and Supabase', () => {
    expect(describeConnection({ networkOnline: true, sessionMode: 'online', cloudConfigured: true }).kind).toBe('cloud');
  });

  it('is local (not green) for an offline session even with full network', () => {
    const s = describeConnection({ networkOnline: true, sessionMode: 'offline', cloudConfigured: true });
    expect(s.kind).toBe('local');
    expect(s.detail).toMatch(/sign in online/i);
  });

  it('is local when Supabase is not configured', () => {
    expect(describeConnection({ networkOnline: true, sessionMode: 'online', cloudConfigured: false }).kind).toBe('local');
  });

  it('is offline without a network, whatever the session', () => {
    expect(describeConnection({ networkOnline: false, sessionMode: 'online', cloudConfigured: true }).kind).toBe('offline');
    expect(describeConnection({ networkOnline: false, sessionMode: 'offline', cloudConfigured: true }).kind).toBe('offline');
  });
});
