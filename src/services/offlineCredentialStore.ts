// ---------------------------------------------------------------------------
// Device-local store for offline sign-in verifiers.
//
// Deliberately a SEPARATE IndexedDB database from AstroHEALTHDB: the sync
// engine, export/import and the corruption-recovery path all work on the main
// database, and none of them can reach this one. Nothing here is ever sent to
// the server. See utils/offlineVerifier for what is stored.
// ---------------------------------------------------------------------------

import Dexie, { type Table } from 'dexie';
import { createVerifier, isVerifierUsable, verifyPassword, type OfflineVerifier } from '../utils/offlineVerifier';
import { normaliseEmail } from '../utils/loginIdentity';

class LocalAuthDatabase extends Dexie {
  verifiers!: Table<OfflineVerifier, string>;

  constructor() {
    super('AstroHEALTHLocalAuth');
    this.version(1).stores({ verifiers: 'email, appUserId' });
  }
}

let localAuthDb: LocalAuthDatabase | null = null;
function store(): LocalAuthDatabase {
  if (!localAuthDb) localAuthDb = new LocalAuthDatabase();
  return localAuthDb;
}

/** Remember a password Supabase has just accepted, for offline sign-in later. */
export async function saveOfflineVerifier(
  email: string,
  password: string,
  ids: { appUserId: string; authUserId?: string },
): Promise<void> {
  try {
    const v = await createVerifier(normaliseEmail(email), password, ids);
    await store().verifiers.put(v);
  } catch (err) {
    // Offline sign-in is a convenience; never let it block an online sign-in.
    console.warn('[Auth] Could not store the offline sign-in verifier:', err);
  }
}

/** Check a password offline. Resolves to the verifier when it matches. */
export async function checkOfflinePassword(
  email: string,
  password: string,
): Promise<{ status: 'match'; verifier: OfflineVerifier } | { status: 'mismatch' | 'none' }> {
  let v: OfflineVerifier | undefined;
  try {
    v = await store().verifiers.get(normaliseEmail(email));
  } catch {
    return { status: 'none' };
  }
  // Missing, or too old to trust: the person has to sign in online once.
  if (!isVerifierUsable(v)) return { status: 'none' };
  return (await verifyPassword(v, password)) ? { status: 'match', verifier: v } : { status: 'mismatch' };
}

/** Forget the verifier for an email (account deactivated, or password reset). */
export async function forgetOfflineVerifier(email: string): Promise<void> {
  try {
    await store().verifiers.delete(normaliseEmail(email));
  } catch {
    /* nothing stored */
  }
}
