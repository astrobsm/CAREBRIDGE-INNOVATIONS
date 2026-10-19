// ---------------------------------------------------------------------------
// Offline sign-in verifier.
//
// Clinics lose connectivity for hours at a time, and a clinician who cannot
// sign in cannot see the patients already on the device. After every
// successful ONLINE sign-in (Supabase Auth said yes) the device keeps a
// PBKDF2-SHA256 hash of the password it was given; offline, sign-in checks the
// typed password against that hash instead of the server.
//
// The hash is never the password, never leaves the device and never syncs (it
// lives in its own IndexedDB database — see services/offlineCredentialStore).
// The work factor follows the OWASP recommendation for PBKDF2-HMAC-SHA256.
//
// Pure apart from WebCrypto, so it is unit-tested directly.
// ---------------------------------------------------------------------------

export const VERIFIER_ALGORITHM = 'PBKDF2-SHA256';
/** OWASP 2023 minimum for PBKDF2-HMAC-SHA256. Never lower this. */
export const VERIFIER_ITERATIONS = 210_000;
export const VERIFIER_SALT_BYTES = 16;
const HASH_BITS = 256;

/**
 * An offline verifier stops being accepted after this long without an online
 * sign-in on the device, so a deactivated account cannot go on signing in
 * offline indefinitely.
 */
export const VERIFIER_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface OfflineVerifier {
  /** Normalised email — the key. */
  email: string;
  algorithm: typeof VERIFIER_ALGORITHM;
  iterations: number;
  /** base64 */
  salt: string;
  /** base64 */
  hash: string;
  /** The users row this password signed in as. */
  appUserId: string;
  /** auth.users id of the Supabase account. */
  authUserId?: string;
  /** ISO time of the online sign-in that produced this verifier. */
  createdAt: string;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('WebCrypto is not available on this device');
  return c.subtle;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const s = atob(value);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await subtle().importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Compare without stopping at the first differing byte. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Hash a password that Supabase has just accepted. */
export async function createVerifier(
  email: string,
  password: string,
  ids: { appUserId: string; authUserId?: string },
  opts: { iterations?: number; salt?: Uint8Array; now?: Date } = {},
): Promise<OfflineVerifier> {
  const iterations = Math.max(opts.iterations ?? VERIFIER_ITERATIONS, VERIFIER_ITERATIONS);
  const salt = opts.salt ?? globalThis.crypto.getRandomValues(new Uint8Array(VERIFIER_SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return {
    email,
    algorithm: VERIFIER_ALGORITHM,
    iterations,
    salt: toBase64(salt),
    hash: toBase64(hash),
    appUserId: ids.appUserId,
    authUserId: ids.authUserId,
    createdAt: (opts.now ?? new Date()).toISOString(),
  };
}

/** Is this verifier still acceptable for an offline sign-in? */
export function isVerifierUsable(v: OfflineVerifier | undefined | null, now = new Date()): v is OfflineVerifier {
  if (!v || v.algorithm !== VERIFIER_ALGORITHM) return false;
  if (!(v.iterations >= VERIFIER_ITERATIONS)) return false;
  const at = new Date(v.createdAt).getTime();
  if (Number.isNaN(at)) return false;
  return now.getTime() - at <= VERIFIER_MAX_AGE_MS;
}

/** Does `password` match the verifier? False for an unusable verifier. */
export async function verifyPassword(
  v: OfflineVerifier | undefined | null,
  password: string,
  now = new Date(),
): Promise<boolean> {
  if (!isVerifierUsable(v, now)) return false;
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(v.salt);
    expected = fromBase64(v.hash);
  } catch {
    return false;
  }
  const actual = await derive(password, salt, v.iterations);
  return constantTimeEqual(actual, expected);
}
