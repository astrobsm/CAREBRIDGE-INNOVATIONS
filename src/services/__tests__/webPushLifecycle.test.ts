// ---------------------------------------------------------------------------
// Push notifications on shared ward phones: signing out stops this device
// getting the signed-out person's alerts, signing back in restores only an
// opt-in made on this device, turning push off affects this device only, and a
// subscription made with another server key is replaced rather than trusted.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sameServerKey } from '../webPushService';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** base64url of the bytes, as a VAPID public key is written. */
const b64url = (bytes: number[]) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('sameServerKey', () => {
  const key = [4, 1, 2, 3, 250, 251, 252, 253];

  it('matches the key the subscription was made with', () => {
    expect(sameServerKey(new Uint8Array(key).buffer, b64url(key))).toBe(true);
  });

  it('rejects a different key, a missing key, or garbage', () => {
    expect(sameServerKey(new Uint8Array([4, 1, 2, 3, 250, 251, 252, 0]).buffer, b64url(key))).toBe(false);
    expect(sameServerKey(new Uint8Array(key).buffer, b64url(key.slice(1)))).toBe(false);
    expect(sameServerKey(null, b64url(key))).toBe(false);
    expect(sameServerKey(new Uint8Array(key).buffer, '')).toBe(false);
    expect(sameServerKey(new Uint8Array(key).buffer, '***')).toBe(false);
  });
});

describe('subscription lifecycle wiring', () => {
  const svc = read('src/services/webPushService.ts');
  const auth = read('src/contexts/AuthContext.tsx');

  it('resubscribes when the existing subscription used another key', () => {
    expect(svc).toMatch(/!sameServerKey\(subscription\.options\?\.applicationServerKey, VAPID_PUBLIC_KEY\)\) \{\s*await subscription\.unsubscribe\(\)/);
  });

  it('a previous user\'s record for this device no longer blocks the next person subscribing', () => {
    expect(svc).toMatch(/await removeLocalSubscriptionsForEndpoint\(subscriptionData\.endpoint, userId\);\s*await saveSubscriptionLocally\(subscriptionData\)/);
  });

  it('turning push off removes this device only', () => {
    expect(svc).toMatch(/removeSubscriptionFromCloud\(userId, subscription\?\.endpoint\)/);
    expect(svc).toMatch(/if \(endpoint\) q = q\.eq\('endpoint', endpoint\)/);
  });

  it('sign-out releases and sign-in restores', () => {
    expect(auth).toMatch(/void releasePushOnSignOut\(current\.id\)/);
    // Every way of becoming signed in (online, offline, restored) goes through
    // completeSignIn, which restores push once.
    expect(auth.match(/void restorePushOnSignIn\(/g)?.length).toBe(1);
    expect(auth.slice(auth.indexOf('const completeSignIn'), auth.indexOf('const clearLocalSession'))).toMatch(/void restorePushOnSignIn\(signedIn\.id, signedIn\.hospitalId\)/);
    const restore = svc.slice(svc.indexOf('export async function restorePushOnSignIn'));
    // Never prompts, never subscribes someone who has not opted in here.
    expect(restore).toMatch(/Notification\.permission !== 'granted'\) return;/);
    expect(restore).toMatch(/if \(!local\) return;/);
    expect(restore.slice(0, restore.indexOf('// CLOUD STORAGE'))).not.toMatch(/requestPermission|pushManager\.subscribe/);
  });
});
