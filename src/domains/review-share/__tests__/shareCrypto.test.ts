import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  DEFAULT_EXPIRY, EXPIRY_OPTIONS, expiryDate, generatePin, generateSalt, generateToken, hashPin, isValidPin, isValidToken,
  reviewLink, sha256Hex, whatsAppLinkMessage,
} from '../shareCrypto';

const nodeSha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

describe('token', () => {
  it('is 32 random bytes as base64url (43 characters), different every time', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const t = generateToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(isValidToken(t)).toBe(true);
      seen.add(t);
    }
    expect(seen.size).toBe(200);
  });

  it('is hashed exactly as the database does: sha256 of its UTF-8, hex', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const t = generateToken();
    // Postgres: encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    expect(await sha256Hex(t)).toBe(nodeSha(t));
  });

  it('rejects anything that is not a token', () => {
    for (const bad of ['', 'short', 'a'.repeat(31), 'has space'.padEnd(40, 'x'), "'; drop table x;--".padEnd(40, 'x'), 'é'.repeat(40)]) {
      expect(isValidToken(bad), bad).toBe(false);
    }
  });
});

describe('PIN', () => {
  it('is always four digits, including leading zeros, and spread over the range', () => {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 4000; i++) {
      const p = generatePin();
      expect(p).toMatch(/^\d{4}$/);
      expect(isValidPin(p)).toBe(true);
      counts[Number(p[0])]++;
    }
    // Each leading digit ~400 of 4000; a biased generator would skew badly.
    for (const c of counts) expect(c).toBeGreaterThan(250);
  });

  it('is hashed as sha256(salt + ":" + pin) with a 16-byte hex salt', async () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(generateSalt()).not.toBe(salt);
    expect(await hashPin(salt, '0472')).toBe(nodeSha(`${salt}:0472`));
    expect(await hashPin(salt, '0472')).not.toBe(await hashPin(generateSalt(), '0472'));
  });

  it('validates input', () => {
    for (const bad of ['', '123', '12345', 'abcd', '12 4', '١٢٣٤']) expect(isValidPin(bad), bad).toBe(false);
  });
});

describe('expiry', () => {
  it('offers 24 h / 7 d / 30 d with 7 days preselected', () => {
    expect(EXPIRY_OPTIONS.map(o => o.id)).toEqual(['24h', '7d', '30d']);
    expect(DEFAULT_EXPIRY).toBe('7d');
    const now = new Date('2026-11-27T10:00:00Z');
    expect(expiryDate('24h', now).toISOString()).toBe('2026-11-28T10:00:00.000Z');
    expect(expiryDate('7d', now).toISOString()).toBe('2026-12-04T10:00:00.000Z');
    expect(expiryDate('30d', now).toISOString()).toBe('2026-12-27T10:00:00.000Z');
  });
});

describe('the link and the WhatsApp message', () => {
  it('builds /review/<token> on the site', () => {
    expect(reviewLink('https://carebridge-innovations.vercel.app/', 'T'.repeat(43))).toBe(`https://carebridge-innovations.vercel.app/review/${'T'.repeat(43)}`);
  });

  it('WhatsApp carries the link only, never the PIN', () => {
    const link = reviewLink('https://x.test', generateToken());
    const pin = '8264';
    const wa = whatsAppLinkMessage(link, { inviteeName: 'Dr Ada', sharedBy: 'Dr Kene', expiresAt: new Date('2026-12-04T10:00:00Z'), phoneDigits: '2348031234567' });
    expect(wa.startsWith('https://wa.me/2348031234567?text=')).toBe(true);
    const text = decodeURIComponent(wa.split('?text=')[1]);
    expect(text).toContain(link);
    expect(text).not.toContain(pin);
    expect(text).not.toMatch(/\bPIN\b/i);
    expect(whatsAppLinkMessage(link, { expiresAt: new Date() }).startsWith('https://wa.me/?text=')).toBe(true);
  });
});
