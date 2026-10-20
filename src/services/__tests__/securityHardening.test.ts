// ---------------------------------------------------------------------------
// October 2026 security audit (docs/SECURITY_AUDIT_2026-10.md): the shape of
// the fixes, checked from source because there is no Postgres or Deno here.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const SQL = 'supabase/manual/20261020110000_security_hardening.sql';
const ROLLBACK = 'supabase/manual/20261020110000_security_hardening_rollback.sql';

describe('security hardening SQL', () => {
  const sql = read(SQL);
  const rollback = read(ROLLBACK);

  it('is hand-applied, not an auto-applied migration', () => {
    expect(readdirSync('supabase/migrations').some(f => f.includes('security_hardening'))).toBe(false);
    expect(existsSync(ROLLBACK)).toBe(true);
  });

  it('runs in one transaction, both ways', () => {
    for (const s of [sql, rollback]) {
      expect(s.match(/^BEGIN;$/gm)).toHaveLength(1);
      expect(s.match(/^COMMIT;$/gm)).toHaveLength(1);
    }
  });

  it('takes app_secrets and the push internals away from clients', () => {
    expect(sql).toMatch(/ARRAY\['app_secrets', 'push_notification_log', 'push_notification_queue', 'notification_logs'\]/);
    expect(sql).toMatch(/REVOKE ALL ON public\.%I FROM PUBLIC, anon, authenticated/);
    // Named app_* so the lockdown's re-apply does not drop it.
    expect(sql).toMatch(/CREATE POLICY app_server_only ON public\.%I AS RESTRICTIVE FOR ALL TO anon, authenticated/);
  });

  it('push-subscription lookups become service-role only; hospital-number helpers lose anon', () => {
    for (const f of ['get_user_subscriptions', 'get_hospital_subscriptions', 'get_subscriptions_by_role']) {
      expect(sql).toContain(`'${f}'`);
    }
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon'/);
    expect(sql).toMatch(/'ensure_patient_hospital_number_unique'\]/);
  });

  it('never touches the family app, the booking table, or the auth helpers', () => {
    const body = sql.replace(/^--.*$/gm, '');
    expect(body).not.toMatch(/family\./i);
    expect(body).not.toMatch(/public_clinic_bookings/);
    expect(body).not.toMatch(/CREATE OR REPLACE FUNCTION public\.(is_app_member|app_user_id|claim_app_user)/);
    expect(body).not.toMatch(/ON public\.users\b/);
  });

  it('guards objects that may not exist', () => {
    expect(sql).toMatch(/to_regclass\(format\('public\.%I', t\)\) IS NULL/);
    expect(sql).toMatch(/to_regclass\('storage\.buckets'\) IS NULL/);
    expect(sql).toMatch(/server_version_num/);
  });

  it('records what it changes for the rollback', () => {
    for (const kind of ['table_acl', 'function', 'view', 'bucket', 'storage_policy']) {
      expect(sql, kind).toContain(`'${kind}'`);
      expect(rollback, kind).toContain(`kind = '${kind}'`);
    }
  });
});

describe('push notification edge function', () => {
  const fn = read('supabase/functions/send-push-notification/index.ts');

  it('verifies a signed-in, active user before reading secrets or sending', () => {
    const auth = fn.indexOf('supabase.auth.getUser(token)');
    const active = fn.indexOf("caller.is_active !== true");
    const secrets = fn.indexOf(".from('app_secrets')");
    const body = fn.indexOf('await req.json()');
    expect(auth).toBeGreaterThan(-1);
    expect(active).toBeGreaterThan(auth);
    expect(secrets).toBeGreaterThan(active);
    expect(body).toBeGreaterThan(active);
  });

  it('keeps non-super-admins to their own hospital and drops off-site links', () => {
    expect(fn).toMatch(/caller\.role !== 'super_admin' && String\(hospitalId\) !== String\(caller\.hospital_id/);
    expect(fn).toMatch(/delete payload\.data\.url/);
  });
});

describe('service worker notification clicks', () => {
  const sw = read('public/sw.js');

  it('only ever opens same-origin paths', () => {
    expect(sw).toMatch(/async function openAppWindow\(rawUrl\) \{\n\s*const url = sameOriginPath\(rawUrl\);/);
    expect(sw).toMatch(/if \(resolved\.origin !== self\.location\.origin\) return '\/';/);
  });
});

describe('response headers', () => {
  const vercel = JSON.parse(read('vercel.json')) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
  const forSource = (s: string) => vercel.headers.find(h => h.source === s)?.headers ?? [];

  it('sets basic hardening headers and never caches the API', () => {
    const all = forSource('/(.*)').map(h => `${h.key}: ${h.value}`);
    expect(all).toContain('X-Content-Type-Options: nosniff');
    expect(all).toContain('X-Frame-Options: SAMEORIGIN');
    expect(forSource('/api/(.*)')).toContainEqual({ key: 'Cache-Control', value: 'no-store' });
  });
});
