// ---------------------------------------------------------------------------
// The guided rollout (scripts/rollout.mjs): step ordering, the Supabase Auth
// settings it writes, and the guards that stop a migration re-opening data
// after the RLS lockdown.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

interface Step { id: string; title: string; needs: string[] }

/* eslint-disable @typescript-eslint/no-explicit-any */
// scripts/ is plain JS outside the TypeScript project; load it untyped.
let STEPS: Step[];
let GUARDED: Record<string, string>;
let missingPrerequisites: (id: string, done: Record<string, string>) => string[];
let nextStep: (done: Record<string, string>) => Step | null;
let authSettingsPatch: (opts: any) => Record<string, any>;
let normaliseSiteUrl: (raw: string) => string | null;
let isProjectRef: (ref: string) => boolean;
let passwordCsvName: (prefix: string, now?: Date) => string;
let PRODUCTION_REF: string;
let describeServiceKey: (raw: string, ref: string) => { ok: boolean; key: string; kind?: string; problem?: string };
let checkMigrations: (dir: string) => { ok: boolean; problems: string[] };
let OPEN_POLICY_CUTOFF: string;

beforeAll(async () => {
  const planPath = '../../../scripts/lib/rolloutPlan.mjs';
  const checkPath = '../../../scripts/check-migrations.mjs';
  const plan: any = await import(/* @vite-ignore */ planPath);
  const check: any = await import(/* @vite-ignore */ checkPath);
  ({ STEPS, GUARDED, missingPrerequisites, nextStep, authSettingsPatch,
    normaliseSiteUrl, isProjectRef, passwordCsvName, PRODUCTION_REF, describeServiceKey } = plan);
  ({ checkMigrations, OPEN_POLICY_CUTOFF } = check);
});

const allDoneExcept = (...ids: string[]) =>
  Object.fromEntries(STEPS.filter(s => !ids.includes(s.id)).map(s => [s.id, '2026-10-19']));

describe('rollout ordering', () => {
  it('never merges before the database and users are ready', () => {
    expect(missingPrerequisites('merge', {})).toEqual(['vercel', 'auth-settings', 'migrations', 'users']);
    expect(missingPrerequisites('merge', allDoneExcept('users', 'merge'))).toEqual(['users']);
    expect(missingPrerequisites('merge', allDoneExcept('merge'))).toEqual([]);
  });

  it('never locks the database before the new build is live and sign-in is verified', () => {
    expect(missingPrerequisites('lockdown', allDoneExcept('verify-signin', 'lockdown'))).toEqual(['verify-signin']);
    expect(missingPrerequisites('lockdown', allDoneExcept('merge', 'verify-signin', 'lockdown'))).toEqual(['merge', 'verify-signin']);
  });

  it('moves users only after the migrations that add auth_user_id', () => {
    expect(missingPrerequisites('users', {})).toEqual(['migrations']);
  });

  it('every prerequisite comes earlier in the list', () => {
    STEPS.forEach((s, i) => s.needs.forEach(n => {
      expect(STEPS.findIndex(x => x.id === n)).toBeLessThan(i);
    }));
  });

  it('merging and locking need a typed word to override', () => {
    expect(GUARDED).toEqual({ merge: 'MERGE', lockdown: 'LOCK' });
  });

  it('resumes at the first step not done', () => {
    expect(nextStep({})?.id).toBe('preflight');
    expect(nextStep(allDoneExcept('rotate', 'lockdown'))?.id).toBe('rotate');
    expect(nextStep(allDoneExcept())).toBeNull();
  });

  it('rejects unknown steps', () => {
    expect(() => missingPrerequisites('nope', {})).toThrow();
  });
});

describe('Supabase Auth settings patch', () => {
  it('always turns email confirmation on and keeps existing redirect URLs', () => {
    const p = authSettingsPatch({ siteUrl: 'https://astrohealth.vercel.app/', existingAllowList: 'http://localhost:5173/**' });
    expect(p.mailer_autoconfirm).toBe(false);
    expect(p.site_url).toBe('https://astrohealth.vercel.app');
    expect(p.uri_allow_list.split(',')).toEqual(['http://localhost:5173/**', 'https://astrohealth.vercel.app/**']);
    expect(p).not.toHaveProperty('smtp_host');
  });

  it('does not duplicate the site in the allow-list', () => {
    const p = authSettingsPatch({ siteUrl: 'https://a.example.com', existingAllowList: 'https://a.example.com/**' });
    expect(p.uri_allow_list).toBe('https://a.example.com/**');
  });

  it('adds SMTP only when complete', () => {
    const smtp = { host: 'smtp.gmail.com', port: '587', user: 'u', pass: 'p', adminEmail: 'no-reply@x.ng' };
    expect(authSettingsPatch({ siteUrl: 'https://a.example.com', smtp })).toMatchObject({
      smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_sender_name: 'AstroHEALTH',
    });
    expect(() => authSettingsPatch({ siteUrl: 'https://a.example.com', smtp: { ...smtp, pass: '' } })).toThrow();
    expect(() => authSettingsPatch({ siteUrl: 'https://a.example.com', smtp: { ...smtp, port: 'x' } })).toThrow();
  });

  it('refuses a plain-http or malformed site URL', () => {
    expect(() => authSettingsPatch({ siteUrl: 'http://astrohealth.vercel.app' })).toThrow();
    expect(normaliseSiteUrl('not a url')).toBeNull();
    expect(normaliseSiteUrl('http://localhost:5173/x')).toBe('http://localhost:5173');
  });
});

describe('which key was pasted', () => {
  // Made-up keys with the right shape; none is a real credential.
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (payload: object) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.${'s'.repeat(43)}`;
  const ref = 'mgblgewvpzcaimqaeqcp';

  it('accepts a legacy service_role key for this project, and a secret key', () => {
    expect(describeServiceKey(jwt({ iss: 'supabase', ref, role: 'service_role' }), ref)).toMatchObject({ ok: true, kind: 'legacy' });
    expect(describeServiceKey(`sb_secret_${'x'.repeat(40)}`, ref)).toMatchObject({ ok: true, kind: 'secret' });
  });

  it('cleans quotes and surrounding whitespace from the paste', () => {
    const key = jwt({ ref, role: 'service_role' });
    expect(describeServiceKey(`  "${key}"\r\n`, ref)).toMatchObject({ ok: true, key });
  });

  it('names each look-alike mistake', () => {
    expect(describeServiceKey(jwt({ ref, role: 'anon' }), ref).problem).toMatch(/anon/);
    expect(describeServiceKey(jwt({ ref: 'abcdefghijklmnopqrst', role: 'service_role' }), ref).problem).toMatch(/different Supabase project/);
    expect(describeServiceKey('sbp_0123456789abcdef', ref).problem).toMatch(/access token/);
    expect(describeServiceKey('sb_publishable_abc', ref).problem).toMatch(/publishable/);
    expect(describeServiceKey('sb_secret_abc', ref).problem).toMatch(/cut short/);
    expect(describeServiceKey(jwt({ ref, role: 'service_role' }).slice(0, 60), ref).problem).toMatch(/cut short/);
    expect(describeServiceKey('eyJ only.half', ref).problem).toMatch(/space|cut short/);
    expect(describeServiceKey('hello', ref).problem).toMatch(/does not look like/);
    expect(describeServiceKey('', ref).problem).toMatch(/Nothing/);
  });
});

describe('rollout helpers', () => {
  it('recognises project refs', () => {
    expect(isProjectRef(PRODUCTION_REF)).toBe(true);
    expect(isProjectRef('https://x.supabase.co')).toBe(false);
  });

  it('names password files with a timestamp', () => {
    expect(passwordCsvName('p', new Date(2026, 9, 19, 8, 5))).toBe('p-20261019-0805.csv');
  });
});

describe('migrations can never quietly re-open data', () => {
  const write = (dir: string, name: string, sql: string) => writeFileSync(join(dir, name), sql);

  it('a new migration with an open policy fails the check', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    write(dir, '20261101000000_new_table.sql', [
      'DROP POLICY IF EXISTS "Allow all access" ON public.thing;',
      'CREATE POLICY "Allow all access" ON public.thing',
      '  FOR ALL USING (true) WITH CHECK (true);',
    ].join('\n'));
    const r = checkMigrations(dir);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/open to everyone/);
  });

  it('policies for anon need an explicit public-access note', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    const body = (note: string) => [
      'DROP POLICY IF EXISTS "book" ON public.bookings;',
      note,
      'CREATE POLICY "book" ON public.bookings FOR INSERT TO anon WITH CHECK (status = \'confirmed\');',
    ].join('\n');
    write(dir, '20261101000000_a.sql', body(''));
    expect(checkMigrations(dir).ok).toBe(false);
    write(dir, '20261101000000_a.sql', body('-- public-access: patients book without an account'));
    expect(checkMigrations(dir).ok).toBe(true);
  });

  it('members-only policies pass, and older migrations are left alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mig-'));
    write(dir, '20261101000000_ok.sql', [
      'DROP POLICY IF EXISTS "members" ON public.thing;',
      'CREATE POLICY "members" ON public.thing FOR ALL TO authenticated',
      '  USING (public.is_app_member()) WITH CHECK (public.is_app_member());',
    ].join('\n'));
    write(dir, '20260101000000_old.sql', [
      'DROP POLICY IF EXISTS "Allow all access" ON public.old;',
      'CREATE POLICY "Allow all access" ON public.old FOR ALL USING (true);',
    ].join('\n'));
    expect(checkMigrations(dir).ok).toBe(true);
    expect(OPEN_POLICY_CUTOFF).toBe('20261019090000');
  });

  it('the real migrations pass', () => {
    expect(checkMigrations(join(__dirname, '../../../supabase/migrations')).problems).toEqual([]);
  });

  it('the lockdown records that it is in force, and the rollback switches it off', () => {
    const lock = readFileSync(join(__dirname, '../../../supabase/manual/20261019100000_rls_lockdown.sql'), 'utf8');
    const undo = readFileSync(join(__dirname, '../../../supabase/manual/20261019100000_rls_lockdown_rollback.sql'), 'utf8');
    expect(lock).toMatch(/rls_lockdown_state[\s\S]*VALUES \(TRUE, TRUE, now\(\)\)[\s\S]*in_force = TRUE/);
    expect(undo).toMatch(/rls_lockdown_state[\s\S]*VALUES \(TRUE, FALSE, now\(\)\)[\s\S]*in_force = FALSE/);
  });

  it('db:sql --with-lockdown re-applies it inside the same transaction', () => {
    const src = readFileSync(join(__dirname, '../../../scripts/db-sql.mjs'), 'utf8');
    // Its own BEGIN/COMMIT are stripped, and it is pushed before the final COMMIT.
    expect(src).toMatch(/--with-lockdown/);
    expect(src).toMatch(/\(BEGIN\|COMMIT\)/);
    expect(src.indexOf("includes('--with-lockdown')")).toBeLessThan(src.indexOf("parts.push('', 'COMMIT;', '')"));
  });
});

describe('rollout script safety', () => {
  const src = readFileSync(join(__dirname, '../../../scripts/rollout.mjs'), 'utf8');

  it('passes secrets through the environment, never on a command line', () => {
    for (const secret of ['serviceKey', 'session.dbUrl', 'token']) {
      // No spawn/run argument array interpolates a secret.
      expect(src).not.toMatch(new RegExp(`run\\([^)]*\\[[^\\]]*\\b${secret.replace('.', '\\.')}\\b[^\\]]*\\]`));
    }
    expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY: await serviceKey\(\)/);
  });

  it('reads secrets with echo off', () => {
    expect(src).toMatch(/promptHidden\('  Service-role key: '\)/);
    expect(src).toMatch(/promptHidden\('  Personal access token: '\)/);
  });

  it('writes password files outside the repository only', () => {
    expect(src).toMatch(/isInsideRepo\(path\)/);
  });

  it('applies the lockdown by hand, never through the auto-applied migrations folder', () => {
    expect(src).toMatch(/supabase', 'manual', '20261019100000_rls_lockdown\.sql'/);
  });
});
