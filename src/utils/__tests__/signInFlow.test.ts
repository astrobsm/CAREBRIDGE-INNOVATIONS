// ---------------------------------------------------------------------------
// Sign-in decisions: when the offline verifier may be used (only when Supabase
// cannot be reached — never after it answered "wrong password"), and how the
// app user is found and linked.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  classifySignInError,
  cloudRowForResolution,
  isAdminRole,
  resolveAppUser,
  shouldTryOffline,
  signInMessage,
} from '../signInFlow';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// Shapes of what supabase-js returns (AuthApiError, AuthRetryableFetchError, …)
const invalid = { name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' };
const legacyInvalid = { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' };
const banned = { name: 'AuthApiError', status: 400, code: 'user_banned', message: 'User is banned' };
const unconfirmed = { name: 'AuthApiError', status: 400, code: 'email_not_confirmed', message: 'Email not confirmed' };
const rateLimited = { name: 'AuthApiError', status: 429, code: 'over_request_rate_limit', message: 'Too many' };
const retryable = { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' };
const typeError = Object.assign(new TypeError('Failed to fetch'), {});
const gateway = { name: 'AuthRetryableFetchError', status: 503, message: 'Service Unavailable' };
const unknown400 = { name: 'AuthApiError', status: 400, code: 'validation_failed', message: 'bad email' };

describe('classifySignInError', () => {
  it('an answer about the credentials is final', () => {
    expect(classifySignInError(invalid)).toBe('invalid_credentials');
    expect(classifySignInError(legacyInvalid)).toBe('invalid_credentials');
    expect(classifySignInError(banned)).toBe('inactive');
    expect(classifySignInError(unconfirmed)).toBe('email_not_confirmed');
    expect(classifySignInError(rateLimited)).toBe('rate_limited');
  });

  it('no answer at all is "unreachable"', () => {
    expect(classifySignInError(retryable)).toBe('unreachable');
    expect(classifySignInError(typeError)).toBe('unreachable');
    expect(classifySignInError(gateway)).toBe('unreachable');
    expect(classifySignInError({ status: 502, message: 'Bad gateway' })).toBe('unreachable');
    expect(classifySignInError(new Error('NetworkError when attempting to fetch resource.'))).toBe('unreachable');
  });

  it('anything else is a plain error, not a reason to go offline', () => {
    expect(classifySignInError(unknown400)).toBe('error');
    expect(classifySignInError(undefined)).toBe('error');
    expect(classifySignInError({})).toBe('error');
  });

  it('an invalid-credentials answer wins even if it also looks like a network error', () => {
    expect(classifySignInError({ ...invalid, name: 'AuthRetryableFetchError', status: 0 })).toBe('invalid_credentials');
  });
});

describe('shouldTryOffline (offline vs invalid credentials)', () => {
  it('offline device: use the verifier', () => {
    expect(shouldTryOffline(false)).toBe(true);
  });

  it('online and the server could not be reached: use the verifier', () => {
    expect(shouldTryOffline(true, retryable)).toBe(true);
    expect(shouldTryOffline(true, gateway)).toBe(true);
  });

  it('online and the server said no: NEVER the verifier', () => {
    for (const e of [invalid, legacyInvalid, banned, unconfirmed, rateLimited, unknown400]) {
      expect(shouldTryOffline(true, e)).toBe(false);
    }
    expect(shouldTryOffline(true)).toBe(false);
  });

  it('AuthContext falls back to the verifier only in the unreachable branch', () => {
    const auth = read('src/contexts/AuthContext.tsx');
    const signIn = auth.slice(auth.indexOf('const signIn = useCallback'), auth.indexOf('/** A Supabase session appeared'));
    // Exactly the three fallbacks: no Supabase configured, device offline, server unreachable.
    expect(signIn.match(/signInOffline\(/g)?.length).toBe(3);
    expect(signIn).toMatch(/if \(kind === 'unreachable'\) \{\s*return allowOffline \? signInOffline\(loginEmail, password\)/);
    expect(signIn).toMatch(/return fail\(kind\);/);
    // An online sign-in stores the verifier only after the server said yes.
    expect(signIn.indexOf('saveOfflineVerifier(')).toBeGreaterThan(signIn.indexOf('signInWithPassword('));
    expect(signIn.indexOf('saveOfflineVerifier(')).toBeGreaterThan(signIn.indexOf("if (resolved.status !== 'ok')"));
  });

  it('an offline session never starts cloud sync', () => {
    const auth = read('src/contexts/AuthContext.tsx');
    const complete = auth.slice(auth.indexOf('const completeSignIn'), auth.indexOf('const clearLocalSession'));
    expect(complete).toMatch(/if \(mode === 'online' && authUserId\) \{\s*startCloudSync\(/);
    expect(auth.match(/startCloudSync\(/g)?.length).toBe(1);
  });
});

describe('resolveAppUser (user resolution and linking)', () => {
  const t = (iso: string) => new Date(iso);
  const rows = [
    { id: 'linked', email: 'ada@x.ng', isActive: true, authUserId: 'auth-1', updatedAt: t('2026-01-01') },
    { id: 'unlinked', email: 'ADA@x.ng ', isActive: true, authUserId: null, updatedAt: t('2026-06-01') },
  ];

  it('the row linked to the Supabase account wins', () => {
    const r = resolveAppUser('auth-1', 'ada@x.ng', rows);
    expect(r).toEqual({ status: 'ok', user: rows[0], needsLink: false });
  });

  it('a deactivated linked row refuses, even with an active unlinked twin', () => {
    const r = resolveAppUser('auth-1', 'ada@x.ng', [{ ...rows[0], isActive: false }, rows[1]]);
    expect(r).toEqual({ status: 'inactive' });
  });

  it('no linked row: the active row with this email, to be linked', () => {
    const r = resolveAppUser('auth-2', '​ada@X.ng', [rows[1]], true);
    expect(r).toEqual({ status: 'ok', user: rows[1], needsLink: true });
  });

  it('an unconfirmed email never claims an existing account', () => {
    expect(resolveAppUser('auth-2', 'ada@x.ng', [rows[1]], false)).toEqual({ status: 'none' });
    expect(resolveAppUser('auth-2', 'ada@x.ng', [rows[1]])).toEqual({ status: 'none' });
    // ...but an account already linked to this Supabase user still signs in.
    expect(resolveAppUser('auth-1', 'ada@x.ng', rows, false)).toMatchObject({ status: 'ok', needsLink: false });
  });

  it('duplicates: the active one, most recently updated', () => {
    const dupes = [
      { id: 'old', email: 'b@x.ng', isActive: true, updatedAt: t('2025-01-01') },
      { id: 'off', email: 'b@x.ng', isActive: false, updatedAt: t('2026-09-01') },
      { id: 'new', email: 'B@x.ng', isActive: 1, updatedAt: t('2026-03-01') },
    ];
    const r = resolveAppUser('auth-9', 'b@x.ng', dupes, true);
    expect(r.status === 'ok' && r.user.id).toBe('new');
  });

  it('a row linked to SOMEONE ELSE is never taken over by email', () => {
    expect(resolveAppUser('auth-2', 'ada@x.ng', [rows[0]])).toEqual({ status: 'none' });
  });

  it('only inactive rows: inactive; nothing at all: none', () => {
    expect(resolveAppUser('a', 'c@x.ng', [{ id: '1', email: 'c@x.ng', isActive: false }], true)).toEqual({ status: 'inactive' });
    expect(resolveAppUser('a', 'd@x.ng', rows, true)).toEqual({ status: 'none' });
    expect(resolveAppUser('a', '', rows, true)).toEqual({ status: 'none' });
  });

  it('reads PostgREST rows', () => {
    const row = cloudRowForResolution({ id: 7, email: 'e@x.ng', is_active: true, auth_user_id: null, updated_at: '2026-01-01' });
    expect(row).toMatchObject({ id: '7', email: 'e@x.ng', isActive: true, authUserId: null });
    expect(resolveAppUser('z', 'e@x.ng', [row], true)).toMatchObject({ status: 'ok', needsLink: true });
  });

  it('AuthContext links through the server first (claim_app_user), the email fallback only before the migration', () => {
    const auth = read('src/contexts/AuthContext.tsx');
    expect(auth).toMatch(/\.eq\('auth_user_id', authUser\.id\)/);
    expect(auth).toMatch(/sb\.rpc\('claim_app_user'\)/);
    expect(auth).not.toMatch(/update\(\{ auth_user_id/); // linking is the server's job
  });
});

describe('messages and roles', () => {
  it('has a message for every refusal', () => {
    for (const r of ['invalid_credentials', 'inactive', 'pending', 'no_account', 'offline_unavailable', 'unreachable', 'error'] as const) {
      expect(signInMessage(r).length).toBeGreaterThan(10);
    }
    expect(signInMessage('invalid_credentials')).toBe('Invalid email or password');
  });

  it('administrator roles are recognised', () => {
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('hospital_admin')).toBe(true);
    expect(isAdminRole('nurse')).toBe(false);
  });
});
