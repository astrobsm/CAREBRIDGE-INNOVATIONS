// ---------------------------------------------------------------------------
// Web Push signing and encryption used by supabase/functions/send-push-notification.
//
// The expected ciphertext below was produced by the reference implementation
// (http_ece 1.x, as used by web-push 3.6.7) for the same salt and keys, so a
// byte-for-byte match proves RFC 8291 conformance, not just self-consistency.
// All keys here are throwaway test keys.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { createPublicKey, verify, generateKeyPairSync } from 'node:crypto';
import {
  encryptPayload, createVapidJwt, base64UrlDecode, base64UrlEncode,
} from '../../../supabase/functions/send-push-notification/webpush';

const VECTOR = {
  uaPublic: 'BLDyFmVJzcUbinVpTH-0-VWpNN4YRJyCfu7PJdLQBYvIkqwtKpl8h6Tf4owlwogvSohmXr1DNFBrFGcLmESZevM',
  auth: 'zZLDzu09JVntJ8w3EPmcsw',
  salt: 'nyNu6KhJcwPiZJ6yIHbXsg',
  asJwk: {
    kty: 'EC', crv: 'P-256', ext: true,
    d: '_Nl3IhxnUBn6610Vg90RsMk_jpQ2bgKf-9TukGZFFB8',
    x: 'AZyQK2v7pYmxDiq1MTHYAOhcuqRJylqQY-CiVkJeSwI',
    y: 'GpmWed3WfupYIPLWYmervkNFPXR9RxyqZDx-FYJdT9w',
  },
  plaintext: 'Deterministic vector',
  expected: 'nyNu6KhJcwPiZJ6yIHbXsgAAEABBBAGckCtr-6WJsQ4qtTEx2ADoXLqkScpakGPgolZCXksCGpmWed3WfupYIPLWYmervkNFPXR9RxyqZDx-FYJdT9wB5-b4rchw0ilQy2JpTCKOoMz0am4bkVohJ7z0d3uujNvhRhgv',
};

async function serverKeys() {
  const subtle = globalThis.crypto.subtle;
  const privateKey = await subtle.importKey('jwk', VECTOR.asJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const { d: _d, ...pub } = VECTOR.asJwk;
  const publicKey = await subtle.importKey('jwk', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  return { privateKey, publicKey } as CryptoKeyPair;
}

describe('push payload encryption (RFC 8291, aes128gcm)', () => {
  it('matches the reference implementation byte for byte', async () => {
    const body = await encryptPayload(VECTOR.plaintext, VECTOR.uaPublic, VECTOR.auth, {
      salt: base64UrlDecode(VECTOR.salt),
      serverKeys: await serverKeys(),
    });
    expect(base64UrlEncode(body)).toBe(VECTOR.expected);
  });

  it('writes the RFC 8188 header: salt, record size 4096, 65-byte key id', async () => {
    const body = await encryptPayload('x', VECTOR.uaPublic, VECTOR.auth, { salt: base64UrlDecode(VECTOR.salt) });
    expect(base64UrlEncode(body.slice(0, 16))).toBe(VECTOR.salt);
    expect(new DataView(body.buffer, body.byteOffset).getUint32(16, false)).toBe(4096);
    expect(body[20]).toBe(65);
    expect(body[21]).toBe(0x04);
    // header 86 + plaintext 1 + delimiter 1 + GCM tag 16
    expect(body.length).toBe(86 + 1 + 1 + 16);
  });

  it('sizes the payload in bytes, so non-ASCII text is not truncated', async () => {
    const text = '₦500 🚑';
    const body = await encryptPayload(text, VECTOR.uaPublic, VECTOR.auth);
    expect(body.length).toBe(86 + new TextEncoder().encode(text).length + 1 + 16);
  });

  it('refuses malformed subscriptions and oversized payloads', async () => {
    await expect(encryptPayload('x', 'AAAA', VECTOR.auth)).rejects.toThrow(/p256dh/);
    await expect(encryptPayload('x', VECTOR.uaPublic, 'AA')).rejects.toThrow(/auth/);
    await expect(encryptPayload('x'.repeat(5000), VECTOR.uaPublic, VECTOR.auth)).rejects.toThrow(/too large/);
  });
});

describe('VAPID (RFC 8292)', () => {
  // A raw-format key pair, as `web-push generate-vapid-keys` prints it.
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pubJwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
  const privJwk = privateKey.export({ format: 'jwk' }) as { d: string };
  const vapidPublic = base64UrlEncode(new Uint8Array([4, ...base64UrlDecode(pubJwk.x), ...base64UrlDecode(pubJwk.y)]));
  const vapidPrivate = privJwk.d;

  it('imports the raw 32-byte private key and signs an ES256 JWT push services accept', async () => {
    const jwt = await createVapidJwt(vapidPublic, vapidPrivate, 'https://fcm.googleapis.com', 'mailto:ops@example.com', 1_800_000_000);
    const [h, p, s] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(h)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(p)))).toEqual({
      aud: 'https://fcm.googleapis.com', exp: 1_800_000_000 + 12 * 3600, sub: 'mailto:ops@example.com',
    });
    const ok = verify('sha256', Buffer.from(`${h}.${p}`),
      { key: createPublicKey({ key: { kty: 'EC', crv: 'P-256', ...pubJwk }, format: 'jwk' }), dsaEncoding: 'ieee-p1363' },
      Buffer.from(base64UrlDecode(s)));
    expect(ok).toBe(true);
  });

  it('rejects keys in the wrong format instead of failing at the push service', async () => {
    await expect(createVapidJwt(vapidPublic, 'AAAA', 'https://a.example', 'mailto:x@y.z')).rejects.toThrow(/32-byte/);
    await expect(createVapidJwt('AAAA', vapidPrivate, 'https://a.example', 'mailto:x@y.z')).rejects.toThrow(/65-byte/);
  });
});
