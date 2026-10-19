// ---------------------------------------------------------------------------
// Moving existing users onto Supabase Auth: the migration script's planning
// (pure), its safety rails, and the two SQL files of the rollout.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/* eslint-disable @typescript-eslint/no-explicit-any */
let plan: any;
let script: any;
beforeAll(async () => {
  // scripts/ is plain JS outside the TypeScript project; load it untyped.
  const planPath = '../../../scripts/lib/authMigrationPlan.mjs';
  const scriptPath = '../../../scripts/migrate-users-to-auth.mjs';
  plan = await import(/* @vite-ignore */ planPath);
  script = await import(/* @vite-ignore */ scriptPath);
});

const row = (over: Record<string, unknown>) => ({
  id: 'r', email: 'a@x.ng', is_active: true, updated_at: '2026-01-01T00:00:00Z', auth_user_id: null, password: null, ...over,
});

describe('migration planning', () => {
  it('creates an account keeping a usable existing password, else a generated one', () => {
    const steps = plan.planUserMigration([
      row({ id: '1', email: 'keep@x.ng', password: 'longenough' }),
      row({ id: '2', email: 'short@x.ng', password: 'short' }),
      row({ id: '3', email: 'none@x.ng', password: null }),
    ], []);
    expect(steps).toEqual([
      { kind: 'create', rowId: '1', email: 'keep@x.ng', active: true, passwordSource: 'existing' },
      { kind: 'create', rowId: '2', email: 'short@x.ng', active: true, passwordSource: 'generated' },
      { kind: 'create', rowId: '3', email: 'none@x.ng', active: true, passwordSource: 'generated' },
    ]);
  });

  it('links to an existing Auth user with the same (normalised) email', () => {
    const steps = plan.planUserMigration([row({ id: '1', email: ' Ada@X.ng', password: 'whatever1' })], [{ id: 'auth-7', email: 'ada@x.ng' }]);
    expect(steps).toEqual([{ kind: 'link', rowId: '1', email: 'ada@x.ng', authUserId: 'auth-7', active: true, clearPassword: true }]);
  });

  it('duplicate emails: only the active row (latest among several) is migrated, the rest reported', () => {
    const steps = plan.planUserMigration([
      row({ id: 'off', email: 'd@x.ng', is_active: false, updated_at: '2026-09-01', password: 'secret-old' }),
      row({ id: 'act-old', email: 'D@x.ng', is_active: true, updated_at: '2025-01-01' }),
      row({ id: 'act-new', email: 'd@x.ng ', is_active: true, updated_at: '2026-03-01' }),
    ], []);
    const migrated = steps.filter((s: any) => s.kind === 'create');
    expect(migrated).toHaveLength(1);
    expect(migrated[0].rowId).toBe('act-new');
    const dupes = steps.filter((s: any) => s.kind === 'duplicate');
    expect(dupes.map((s: any) => s.rowId).sort()).toEqual(['act-old', 'off']);
    expect(dupes.every((s: any) => s.keptRowId === 'act-new')).toBe(true);
    expect(dupes.find((s: any) => s.rowId === 'off').clearPassword).toBe(true);
  });

  it('re-running is a no-op for linked rows (only a leftover password is cleared)', () => {
    const steps = plan.planUserMigration([
      row({ id: '1', auth_user_id: 'auth-1' }),
      row({ id: '2', email: 'b@x.ng', auth_user_id: 'auth-2', password: 'left-behind' }),
    ], [{ id: 'auth-1', email: 'a@x.ng' }, { id: 'auth-2', email: 'b@x.ng' }]);
    expect(steps).toEqual([{ kind: 'clear_password', rowId: '2', email: 'b@x.ng' }]);
  });

  it('an unlinked twin of a linked row is a duplicate, not a second account', () => {
    const steps = plan.planUserMigration([
      row({ id: 'linked', auth_user_id: 'auth-1' }),
      row({ id: 'twin', email: 'A@x.ng' }),
    ], [{ id: 'auth-1', email: 'a@x.ng' }]);
    expect(steps).toEqual([{ kind: 'duplicate', rowId: 'twin', email: 'a@x.ng', keptRowId: 'linked', clearPassword: false }]);
  });

  it('inactive rows get a (banned) account; --invite only for active ones', () => {
    const steps = plan.planUserMigration([
      row({ id: 'on', email: 'on@x.ng' }),
      row({ id: 'off', email: 'off@x.ng', is_active: false }),
    ], [], { invite: true });
    expect(steps).toEqual([
      { kind: 'invite', rowId: 'on', email: 'on@x.ng', active: true },
      { kind: 'create', rowId: 'off', email: 'off@x.ng', active: false, passwordSource: 'generated' },
    ]);
  });

  it('an Auth account already linked to another row is a conflict for a person to resolve', () => {
    const steps = plan.planUserMigration([
      row({ id: 'renamed', email: 'new@x.ng', auth_user_id: 'auth-1' }),
      row({ id: 'stale', email: 'old@x.ng' }),
    ], [{ id: 'auth-1', email: 'old@x.ng' }]);
    expect(steps).toEqual([{ kind: 'conflict', rowId: 'stale', email: 'old@x.ng', authUserId: 'auth-1', clearPassword: false }]);
  });

  it('unusable emails are skipped', () => {
    const steps = plan.planUserMigration([row({ id: 'x', email: 'not-an-email', password: 'pw123456' })], []);
    expect(steps).toEqual([{ kind: 'invalid_email', rowId: 'x', email: 'not-an-email', clearPassword: true }]);
  });

  it('no step and no printed line ever carries a password', () => {
    const rows = [
      row({ id: '1', email: 'keep@x.ng', password: 'SuperSecret-1' }),
      row({ id: '2', email: 'keep@x.ng', is_active: false, password: 'SuperSecret-2' }),
      row({ id: '3', email: 'l@x.ng', password: 'SuperSecret-3' }),
    ];
    const steps = plan.planUserMigration(rows, [{ id: 'a', email: 'l@x.ng' }]);
    const text = JSON.stringify(steps) + steps.map(plan.describeStep).join('\n');
    expect(text).not.toMatch(/SuperSecret/);
  });
});

describe('migration script safety', () => {
  const src = read('scripts/migrate-users-to-auth.mjs');

  it('is a dry run unless --apply, and --apply needs --out', () => {
    expect(src).toMatch(/if \(!args\.apply\) \{\s*console\.log\('\\nDry run/);
    expect(src).toMatch(/if \(!args\.out\) fail\('--apply needs --out/);
  });

  it('refuses to write the password CSV inside the repository', () => {
    expect(script.isInsideRepo(join(root, 'passwords.csv'), root)).toBe(true);
    expect(script.isInsideRepo(join(root, 'scripts', 'x.csv'), root)).toBe(true);
    expect(script.isInsideRepo(resolve(tmpdir(), 'passwords.csv'), root)).toBe(false);
    expect(script.isInsideRepo(resolve(root, '..', 'elsewhere.csv'), root)).toBe(false);
    expect(src).toMatch(/if \(isInsideRepo\(outPath\)\) fail\(/);
  });

  it('never overwrites an earlier CSV and creates it owner-readable only', () => {
    expect(src).toMatch(/openSync\(outPath, 'wx', 0o600\)/);
  });

  it('prints no password: console output never includes the password variables', () => {
    for (const line of src.split('\n').filter((l) => /console\.(log|error|warn)/.test(l))) {
      expect(line).not.toMatch(/\bpassword\b(?!s will)|row\.password|temporaryPassword/);
    }
  });

  it('reads its credentials from the server environment only', () => {
    expect(src).toMatch(/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/VITE_SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('is wired up as npm run auth:migrate-users', () => {
    expect(JSON.parse(read('package.json')).scripts['auth:migrate-users']).toBe('node scripts/migrate-users-to-auth.mjs');
  });
});

describe('rollout SQL', () => {
  const a = read('supabase/migrations/20261019090000_auth_accounts.sql');
  const lockdownPath = 'supabase/manual/20261019100000_rls_lockdown.sql';

  it('(A) is additive: no policy or RLS change, nothing dropped but its own trigger', () => {
    expect(a).not.toMatch(/CREATE POLICY|DROP POLICY|ENABLE ROW LEVEL SECURITY|DISABLE ROW LEVEL SECURITY/i);
    expect(a).not.toMatch(/\bDROP TABLE\b|\bDELETE FROM\b|\bTRUNCATE\b/i);
    expect(a.match(/DROP [A-Z]+ /g)).toEqual(['DROP TRIGGER ']);
    expect(a).toMatch(/ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
  });

  it('(A) helpers are SECURITY DEFINER with a pinned search_path', () => {
    for (const fn of ['app_user_id', 'is_app_member', 'is_app_admin', 'claim_app_user', 'users_guard_account_fields']) {
      const at = a.indexOf(`FUNCTION public.${fn}(`);
      expect(at, fn).toBeGreaterThan(-1);
      const head = a.slice(at, a.indexOf('AS $$', at));
      expect(head, fn).toMatch(/SECURITY DEFINER/);
      expect(head, fn).toMatch(/SET search_path = ''/);
    }
  });

  it('(A) trigger: passwords never stored, account fields guarded, old clients untouched', () => {
    const fn = a.slice(a.indexOf('FUNCTION public.users_guard_account_fields'), a.indexOf('DROP TRIGGER IF EXISTS users_guard_account_fields'));
    expect(fn).toMatch(/NEW\.password := NULL;/);
    expect(fn).toMatch(/ELSIF NEW\.password IS DISTINCT FROM OLD\.password THEN\s*NEW\.password := NULL;/);
    expect(fn).toMatch(/IF v_uid IS NULL THEN\s*RETURN NEW;/);
    for (const col of ['role', 'is_active', 'hospital_id', 'auth_user_id']) {
      expect(fn).toContain(`NEW.${col} := OLD.${col};`);
    }
    expect(fn).toMatch(/NEW\.is_active := false;/);
    expect(fn).toMatch(/IF NEW\.role IN \('super_admin', 'hospital_admin'\) THEN/);
    expect(a).toMatch(/BEFORE INSERT OR UPDATE ON public\.users/);
  });

  it('(A) only a confirmed email can claim an unlinked row', () => {
    const fn = a.slice(a.indexOf('FUNCTION public.claim_app_user'));
    expect(fn).toMatch(/a\.email_confirmed_at IS NOT NULL/);
    expect(a).toMatch(/REVOKE ALL ON FUNCTION public\.claim_app_user\(\) FROM PUBLIC, anon;/);
  });

  it('(B) is NOT in the auto-applied migrations folder, and has a rollback next to it', () => {
    expect(existsSync(join(root, lockdownPath))).toBe(true);
    expect(existsSync(join(root, 'supabase/manual/20261019100000_rls_lockdown_rollback.sql'))).toBe(true);
    expect(existsSync(join(root, 'supabase/migrations/20261019100000_rls_lockdown.sql'))).toBe(false);
    expect(read('.github/workflows/supabase-migrations.yml')).not.toMatch(/supabase\/manual/);
  });

  it('(B) spares family_* tables and the public booking table, and is re-runnable', () => {
    const b = read(lockdownPath);
    expect(b).toMatch(/c\.relname NOT LIKE 'family\\_%'/);
    expect(b).toMatch(/c\.relname <> 'public_clinic_bookings'/);
    expect(b).toMatch(/CREATE POLICY app_bookings_public_insert ON public\.public_clinic_bookings\s+FOR INSERT TO anon, authenticated/);
    expect(b).toMatch(/USING \(public\.is_app_member\(\)\) WITH CHECK \(public\.is_app_member\(\)\)/);
    for (const m of b.matchAll(/CREATE POLICY (\w+) ON ([\w.]+)/g)) {
      expect(b.slice(0, m.index), m[1]).toMatch(new RegExp(`DROP POLICY IF EXISTS ${m[1]} ON`));
    }
    expect(b).toMatch(/roles && ARRAY\['public', 'anon'\]::name\[\]/);
    expect(b).toMatch(/INSERT INTO app_private\.rls_lockdown_policies/);
  });
});
