// ---------------------------------------------------------------------------
// The offline sign-in verifier: a PBKDF2-SHA256 hash (>= 210,000 iterations,
// random 16-byte salt) of a password Supabase accepted, kept on the device
// only, in its own IndexedDB database that nothing syncs.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createVerifier,
  isVerifierUsable,
  verifyPassword,
  VERIFIER_ITERATIONS,
  VERIFIER_MAX_AGE_MS,
  VERIFIER_SALT_BYTES,
} from '../offlineVerifier';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const ids = { appUserId: 'u1', authUserId: 'a1' };

describe('offline verifier hashing', () => {
  it('uses PBKDF2-SHA256 with at least 210,000 iterations and a 16-byte salt', async () => {
    const v = await createVerifier('ada@x.ng', 'Correct horse 1!', ids);
    expect(VERIFIER_ITERATIONS).toBeGreaterThanOrEqual(210_000);
    expect(v.iterations).toBe(VERIFIER_ITERATIONS);
    expect(v.algorithm).toBe('PBKDF2-SHA256');
    expect(Buffer.from(v.salt, 'base64')).toHaveLength(VERIFIER_SALT_BYTES);
    expect(Buffer.from(v.hash, 'base64')).toHaveLength(32);
    expect(v.appUserId).toBe('u1');
    expect(v.authUserId).toBe('a1');
  });

  it('never stores the password itself', async () => {
    const v = await createVerifier('ada@x.ng', 'Correct horse 1!', ids);
    expect(JSON.stringify(v)).not.toContain('Correct horse');
  });

  it('salts randomly: the same password gives different hashes', async () => {
    const a = await createVerifier('ada@x.ng', 'same-password', ids);
    const b = await createVerifier('ada@x.ng', 'same-password', ids);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('refuses to be created with fewer iterations', async () => {
    const v = await createVerifier('ada@x.ng', 'pw', ids, { iterations: 1000 });
    expect(v.iterations).toBe(VERIFIER_ITERATIONS);
  });
});

describe('offline verifier checking', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const v = await createVerifier('ada@x.ng', 'Correct horse 1!', ids);
    expect(await verifyPassword(v, 'Correct horse 1!')).toBe(true);
    expect(await verifyPassword(v, 'correct horse 1!')).toBe(false);
    expect(await verifyPassword(v, '')).toBe(false);
  });

  it('rejects a tampered or weakened record', async () => {
    const v = await createVerifier('ada@x.ng', 'pw-123456', ids);
    const otherHash = (await createVerifier('ada@x.ng', 'something else', ids)).hash;
    expect(await verifyPassword({ ...v, hash: otherHash }, 'pw-123456')).toBe(false);
    expect(await verifyPassword({ ...v, iterations: 1 }, 'pw-123456')).toBe(false);
    expect(await verifyPassword({ ...v, salt: '%%%not base64%%%' }, 'pw-123456')).toBe(false);
    expect(await verifyPassword(null, 'pw-123456')).toBe(false);
  });

  it('expires: an old verifier needs an online sign-in first', async () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const v = await createVerifier('ada@x.ng', 'pw-123456', ids, { now: created });
    const soon = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const late = new Date(created.getTime() + VERIFIER_MAX_AGE_MS + 1);
    expect(isVerifierUsable(v, soon)).toBe(true);
    expect(isVerifierUsable(v, late)).toBe(false);
    expect(await verifyPassword(v, 'pw-123456', late)).toBe(false);
  });
});

describe('offline verifier storage', () => {
  const store = read('src/services/offlineCredentialStore.ts');

  it('lives in its own IndexedDB database, keyed by normalised email', () => {
    expect(store).toMatch(/super\('AstroHEALTHLocalAuth'\)/);
    expect(store).toMatch(/verifiers: 'email, appUserId'/);
    expect(store).toMatch(/normaliseEmail\(email\)/);
  });

  it('is unknown to the sync engine and the main database', () => {
    for (const f of ['src/database/db.ts', 'src/services/supabaseClient.ts', 'src/services/cloudSyncService.ts', 'src/services/apiService.ts']) {
      expect(read(f), f).not.toMatch(/verifiers|AstroHEALTHLocalAuth|offlineCredentialStore/);
    }
  });

  it('an expired verifier counts as none, not as a wrong password', () => {
    expect(store).toMatch(/if \(!isVerifierUsable\(v\)\) return \{ status: 'none' \}/);
  });
});
