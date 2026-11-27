/**
 * The secrets of a review link, made on the sharing device with Web Crypto.
 *
 *  - token: 32 random bytes, base64url (43 characters). It exists only in the
 *    link; the database stores sha256(token) as hex, which is what
 *    app_open_review_share() computes with the built-in sha256().
 *  - PIN: 4 digits, uniform (no modulo bias). Stored as
 *    sha256(salt + ':' + PIN) with a 16-byte hex salt per link.
 *
 * No imports: shared by the EMR side and its tests.
 */

const cryptoApi = (): Crypto => {
  const c = globalThis.crypto;
  if (!c?.getRandomValues || !c.subtle) throw new Error('This browser cannot create a secure link (Web Crypto is missing).');
  return c;
};

const toHex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export function base64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 random bytes as base64url: the link token. */
export function generateToken(): string {
  return base64Url(cryptoApi().getRandomValues(new Uint8Array(32)));
}

/** A per-link salt for the PIN hash: 16 random bytes, hex. */
export function generateSalt(): string {
  return toHex(cryptoApi().getRandomValues(new Uint8Array(16)));
}

/** A uniformly random 4-digit PIN ("0000"–"9999"). */
export function generatePin(): string {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % 10_000);
  const buf = new Uint32Array(1);
  for (;;) {
    cryptoApi().getRandomValues(buf);
    if (buf[0] < limit) return String(buf[0] % 10_000).padStart(4, '0');
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await cryptoApi().subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}

/** What the server compares: sha256(salt + ':' + pin), hex. */
export function hashPin(salt: string, pin: string): Promise<string> {
  return sha256Hex(`${salt}:${pin}`);
}

export const isValidPin = (pin: string) => /^[0-9]{4}$/.test(pin);
export const isValidToken = (token: string) => /^[A-Za-z0-9_-]{32,128}$/.test(token);

/** The link the invitee opens. */
export function reviewLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/review/${token}`;
}

export type ExpiryChoice = '24h' | '7d' | '30d';

export const EXPIRY_OPTIONS: { id: ExpiryChoice; label: string; hours: number }[] = [
  { id: '24h', label: '24 hours', hours: 24 },
  { id: '7d', label: '7 days', hours: 7 * 24 },
  { id: '30d', label: '30 days', hours: 30 * 24 },
];

export const DEFAULT_EXPIRY: ExpiryChoice = '7d';

export function expiryDate(choice: ExpiryChoice, now: Date = new Date()): Date {
  const opt = EXPIRY_OPTIONS.find(o => o.id === choice) ?? EXPIRY_OPTIONS[1];
  return new Date(now.getTime() + opt.hours * 3_600_000);
}

/**
 * wa.me link carrying the review link only — never the PIN, which goes by
 * another route. With no usable number WhatsApp asks whom to send it to.
 */
export function whatsAppLinkMessage(link: string, opts: { inviteeName?: string; sharedBy?: string; expiresAt: Date; phoneDigits?: string | null }): string {
  const who = opts.inviteeName?.trim() ? `Dear ${opts.inviteeName.trim()}, ` : '';
  const by = opts.sharedBy?.trim() ? ` from ${opts.sharedBy.trim()}` : '';
  const until = opts.expiresAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const text = `${who}here is a confidential, view-only patient summary${by} for your clinical review. It opens until ${until}.\n${link}`;
  const to = opts.phoneDigits ? opts.phoneDigits : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
