// ---------------------------------------------------------------------------
// Web Push: VAPID signing (RFC 8292) and payload encryption (RFC 8291,
// aes128gcm content coding, RFC 8188). WebCrypto only, so it runs unchanged in
// the Supabase Edge Runtime (Deno) and under Vitest (Node).
//
// The implementation this replaces had never sent a notification: it imported
// the raw VAPID private key as PKCS#8 (always throws), swapped HKDF's salt and
// key material, used the pre-RFC "Content-Encoding: auth" key schedule, padded
// in the old aesgcm style, and measured the payload in UTF-16 units. Verified
// against the reference implementation (web-push / http_ece): see
// src/services/__tests__/webPush.test.ts.
// ---------------------------------------------------------------------------

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();

export function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? enc.encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  const clean = String(str).trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * The bytes of a view as a standalone ArrayBuffer. WebCrypto and fetch accept a
 * Uint8Array at runtime, but newer TypeScript lib types reject one whose buffer
 * may be shared; a copied ArrayBuffer satisfies every checker (tsc and Deno).
 */
function ab(view: Uint8Array): ArrayBuffer {
  return view.slice().buffer as ArrayBuffer;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

/** HKDF-SHA-256 (RFC 5869) for outputs of at most 32 bytes. */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  // Extract: PRK = HMAC(key = salt, data = IKM)
  const saltKey = await subtle.importKey('raw', ab(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await subtle.sign('HMAC', saltKey, ab(ikm)));
  // Expand, one block: T(1) = HMAC(PRK, info || 0x01)
  const prkKey = await subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const t1 = new Uint8Array(await subtle.sign('HMAC', prkKey, ab(concat(info, new Uint8Array([1])))));
  return t1.slice(0, length);
}

/** Split an uncompressed P-256 public key (0x04 || X || Y) into JWK coordinates. */
function publicKeyCoordinates(publicKey: Uint8Array): { x: string; y: string } {
  if (publicKey.length !== 65 || publicKey[0] !== 0x04) {
    throw new Error(`Expected a 65-byte uncompressed P-256 public key, got ${publicKey.length} bytes`);
  }
  return { x: base64UrlEncode(publicKey.slice(1, 33)), y: base64UrlEncode(publicKey.slice(33, 65)) };
}

/**
 * VAPID JWT (RFC 8292). Keys are as `web-push generate-vapid-keys` prints them:
 * the public key a base64url uncompressed point, the private key the raw 32-byte
 * scalar d. WebCrypto cannot import a bare d, so it goes in as a JWK with the
 * public coordinates.
 */
export async function createVapidJwt(
  vapidPublicKey: string,
  vapidPrivateKey: string,
  audience: string,
  subject: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const { x, y } = publicKeyCoordinates(base64UrlDecode(vapidPublicKey));
  const d = base64UrlDecode(vapidPrivateKey);
  if (d.length !== 32) throw new Error(`Expected a 32-byte VAPID private key, got ${d.length} bytes`);
  const key = await subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: base64UrlEncode(d), ext: false },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  // Push services cap exp at 24 h ahead; 12 h leaves room for clock skew.
  const claims = base64UrlEncode(JSON.stringify({ aud: audience, exp: nowSeconds + 12 * 60 * 60, sub: subject }));
  const unsigned = `${header}.${claims}`;
  // WebCrypto's ECDSA output is already the raw r || s that JWS ES256 wants.
  const signature = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)));
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export interface EncryptOptions {
  /** Test hooks: a fixed salt and application-server key pair (RFC 8291 vectors). */
  salt?: Uint8Array;
  serverKeys?: CryptoKeyPair;
}

/**
 * Encrypt a push message body for one subscription (RFC 8291 §3.4, a single
 * aes128gcm record). Returns the complete request body: the RFC 8188 header
 * (salt, record size, key id = the server's ephemeral public key) then the
 * ciphertext.
 */
export async function encryptPayload(
  plaintext: string | Uint8Array,
  p256dh: string,
  authSecret: string,
  options: EncryptOptions = {},
): Promise<Uint8Array> {
  const uaPublic = base64UrlDecode(p256dh);
  const auth = base64UrlDecode(authSecret);
  if (uaPublic.length !== 65) throw new Error(`Bad subscription p256dh (${uaPublic.length} bytes)`);
  if (auth.length < 16) throw new Error(`Bad subscription auth secret (${auth.length} bytes)`);

  const serverKeys = options.serverKeys
    ?? await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPublic = new Uint8Array(await subtle.exportKey('raw', serverKeys.publicKey));
  const uaKey = await subtle.importKey('raw', ab(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverKeys.privateKey, 256));

  // IKM = HKDF(salt = auth_secret, ikm = ecdh_secret, info = "WebPush: info" 0x00 ua_public as_public, 32)
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(auth, ecdhSecret, keyInfo, 32);

  const salt = options.salt ?? globalThis.crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // One record: plaintext || 0x02 (last-record delimiter), no extra padding.
  const body = typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext;
  const recordSize = 4096;
  if (body.length + 1 + 16 > recordSize) throw new Error(`Push payload too large (${body.length} bytes)`);
  const aesKey = await subtle.importKey('raw', ab(cek), { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv: ab(nonce), tagLength: 128 }, aesKey, ab(concat(body, new Uint8Array([2]))),
  ));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize, false);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ciphertext);
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send one push. Throws an Error carrying `status` when the push service refuses it. */
export async function sendWebPush(
  target: PushTarget,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<true> {
  const endpoint = new URL(target.endpoint);
  const jwt = await createVapidJwt(vapidPublicKey, vapidPrivateKey, `${endpoint.protocol}//${endpoint.host}`, vapidSubject);
  const body = await encryptPayload(payload, target.p256dh, target.auth);
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
      Urgency: 'high',
    },
    body: ab(body),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    const error = new Error(`Push service refused (${response.status})${detail ? `: ${detail}` : ''}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return true;
}
