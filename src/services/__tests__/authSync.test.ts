// ---------------------------------------------------------------------------
// Passwords never leave a device or sit in the source, and cloud sync runs
// only with a real Supabase session.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { canPushUserRow, prepareUserRowsForPush, stripSecretColumns } from '../userSyncRules';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const admin = { appUserId: 'a', authUserId: 'auth-a', isAdmin: true };
const nurse = { appUserId: 'n', authUserId: 'auth-n', isAdmin: false };

describe('users push strips passwords', () => {
  it('removes password / password_hash from users rows, in either spelling', () => {
    const row = { id: 'n', email: 'n@x.ng', password: 'plain', password_hash: 'h', passwordHash: 'h2', first_name: 'N' };
    expect(stripSecretColumns('users', row)).toEqual({ id: 'n', email: 'n@x.ng', first_name: 'N' });
    // The input is not mutated.
    expect(row.password).toBe('plain');
  });

  it('leaves other tables alone', () => {
    const row = { id: 'p', password: 'not a users row' };
    expect(stripSecretColumns('patients', row)).toBe(row);
  });

  it('a non-administrator pushes only their own users row; an administrator any', () => {
    const rows = [{ id: 'n', password: 'x' }, { id: 'someone-else' }];
    expect(prepareUserRowsForPush(nurse, rows)).toEqual([{ id: 'n' }]);
    expect(prepareUserRowsForPush(admin, rows)).toEqual([{ id: 'n' }, { id: 'someone-else' }]);
    expect(canPushUserRow(null, { id: 'n' })).toBe(false);
  });

  it('every users write path in the sync engine strips secrets', () => {
    const sync = read('src/services/cloudSyncService.ts');
    // pushTable
    expect(sync).toMatch(/stripExcludedColumns\(cloudTableName, stripSecretColumns\(cloudTableName, convertToSupabase\(record\)\)\)/);
    expect(sync).toMatch(/localRecords = localRecords\.filter\(\(u: any\) => canPushUserRow\(getCloudSession\(\), u\)\)/);
    // syncRecord
    expect(sync).toMatch(/stripSecretColumns\(cloudTableName, convertToSupabase\(record\)\),/);
    expect(sync).toMatch(/if \(cloudTableName === TABLES\.users && !canPushUserRow\(getCloudSession\(\), record\)\) return;/);
    // forcePushUsers
    expect(sync).toMatch(/stripSecretColumns\(TABLES\.users, convertToSupabase\(user as Record<string, unknown>\)\)/);
    // pulls never store a legacy password locally
    expect(sync).toMatch(/cloudTableName === TABLES\.users \? userFromCloudRow\(record\) : convertFromSupabase\(record\)/);
    const api = read('src/services/apiService.ts');
    expect(api.match(/stripSecretColumns\(/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('Dexie v92 drops passwords older builds copied onto the device', () => {
    expect(read('src/database/db.ts')).toMatch(/this\.version\(92\)[\s\S]*if \('password' in u\) delete u\.password;/);
  });
});

describe('cloud sync needs a real session', () => {
  const sync = read('src/services/cloudSyncService.ts');
  const auth = read('src/contexts/AuthContext.tsx');

  it('fullSync, syncRecord, deletes and realtime all check for a session', () => {
    const fn = (name: string) => sync.slice(sync.indexOf(name), sync.indexOf('\n}\n', sync.indexOf(name)));
    expect(fn('export async function fullSync')).toMatch(/if \(!hasCloudSession\(\)\) \{/);
    expect(fn('export async function syncRecord')).toMatch(/!hasCloudSession\(\)/);
    expect(fn('export async function deleteRecordFromCloud')).toMatch(/!hasCloudSession\(\)/);
    expect(fn('function setupRealtimeSubscriptions')).toMatch(/if \(!supabase \|\| !hasCloudSession\(\)\) return;/);
  });

  it('initCloudSync no longer starts a sync by itself', () => {
    const init = sync.slice(sync.indexOf('export function initCloudSync'), sync.indexOf('function beginSessionSync'));
    expect(init).not.toMatch(/fullSync\(\)\.then/);
    expect(init).toMatch(/if \(hasCloudSession\(\)\) beginSessionSync\(\);/);
    expect(init).toMatch(/if \(isSupabaseConfigured\(\) && hasCloudSession\(\)\) \{\s*fullSync\(\);/);
  });

  it('sign-out stops sync and ends the Supabase session; sign-in starts it', () => {
    const logout = auth.slice(auth.indexOf('const logout = useCallback'), auth.indexOf('const changePassword'));
    expect(logout).toMatch(/clearLocalSession\(\);/);
    // Pending work is uploaded (bounded) while the session still exists, then
    // the session ends whatever happened.
    expect(logout).toMatch(/void flushPendingChanges\(\d+\)\.finally\(\(\) => endSupabaseSession\(\)\);/);
    expect(logout.indexOf('clearLocalSession();')).toBeLessThan(logout.indexOf('flushPendingChanges('));
    const clear = auth.slice(auth.indexOf('const clearLocalSession'), auth.indexOf('/** Sign in against'));
    expect(clear).toMatch(/stopCloudSync\(\);/);
    expect(auth).toMatch(/supabase\.auth\.signOut\(\{ scope: 'local' \}\)/);
    expect(auth).toMatch(/localStorage\.removeItem\(AUTH_STORAGE_KEY\)/);
  });

  it('the session is restored from Supabase, not from a bare stored user id', () => {
    expect(auth).toMatch(/supabase\.auth\.getSession\(\)/);
    expect(auth).toMatch(/supabase\.auth\.onAuthStateChange\(/);
    expect(auth).not.toMatch(/localStorage\.getItem\('AstroHEALTH_user_id'\)/);
  });

  it('the API service queues instead of writing without a session', () => {
    const api = read('src/services/apiService.ts');
    expect(api).toMatch(/if \(!isSupabaseConfigured\(\) \|\| !supabase \|\| !hasCloudSession\(\)\) \{\s*\/\/ Queue for later sync/);
  });
});

describe('sign-in no longer destroys local data', () => {
  it('the login path never deletes the database', () => {
    const auth = read('src/contexts/AuthContext.tsx');
    const signIn = auth.slice(auth.indexOf('const signIn = useCallback'), auth.indexOf('/** A Supabase session appeared'));
    expect(signIn).not.toMatch(/Dexie\.delete|deleteDatabase/);
    expect(signIn).toMatch(/Never delete the database from here/);
  });
});

// ── No plaintext passwords in the source ────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === '__tests__') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

describe('no plaintext password literals', () => {
  const files = [...walk(join(root, 'src')), ...walk(join(root, 'api')), ...walk(join(root, 'scripts'))];

  it('the passwords that used to be hard-coded are gone', () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const leaked of ['blackvelvet', 'BLACK@2velvet']) {
        expect(text.toLowerCase().includes(leaked.toLowerCase()), `${relative(root, f)} contains a leaked password`).toBe(false);
      }
    }
  });

  it('no password is assigned a string literal anywhere', () => {
    // `password: 'x'`, `password = "x"`, `PASSWORD = 'x'` ... (an empty string
    // for a form field's initial value is fine).
    const literal = /\b\w*password\w*\s*[:=]\s*(['"`])(?!\1)[^'"`\n]+\1/i;
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;
        // `show ? newPassword : '••••'` is a masked display, not an assignment.
        const code = line
          .replace(/\?\s*\w*password\w*\s*:/gi, '?')
          // The family app's parent record marks AstroHEALTH sign-in with a
          // fixed sentinel, not a password (family auth is out of scope).
          .replace("password_hash: 'astrohealth_sso'", '');
        expect(literal.test(code), `${relative(root, f)}:${i + 1}: ${line.trim()}`).toBe(false);
      });
    }
  });

  it('no seeded administrators, and the seed creates no user', () => {
    expect(read('src/contexts/AuthContext.tsx')).not.toMatch(/SEEDED_ADMINS/);
    const seed = read('src/database/db.ts');
    const fn = seed.slice(seed.indexOf('export async function initializeDemoData'));
    expect(fn).not.toMatch(/db\.users\.(add|put)/);
  });

  it('the User type has no password field', () => {
    const types = read('src/types/index.ts');
    const user = types.slice(types.indexOf('export interface User {'), types.indexOf('}', types.indexOf('export interface User {')));
    expect(user).not.toMatch(/^\s*password\??:/m);
  });

  it('no screen writes a password onto a user record', () => {
    for (const f of [
      'src/domains/auth/pages/UsersManagementPage.tsx',
      'src/domains/auth/pages/UserAgreementPage.tsx',
      'src/domains/auth/pages/RegisterPage.tsx',
      'src/components/common/BulkImportModal.tsx',
    ]) {
      expect(read(f), f).not.toMatch(/password: (formData\.password|newPassword|tempPassword|userData\.password)/);
    }
    expect(read('src/domains/auth/pages/UserAgreementPage.tsx')).toMatch(/await changePassword\(newPassword\);/);
    expect(read('src/contexts/AuthContext.tsx')).toMatch(/supabase\.auth\.updateUser\(\{ password: newPassword \}\)/);
    // The only places AuthContext handles a password: Supabase Auth calls and
    // the device-local verifier. The users row it creates for a sign-up has none.
    const auth = read('src/contexts/AuthContext.tsx');
    const pending = auth.slice(auth.indexOf('async function createPendingRow'), auth.indexOf('async function resolveOnlineAppUser'));
    expect(pending).not.toMatch(/\bpassword\s*:/);
    expect(auth.match(/\bpassword: [a-zA-Z.]+/g)?.filter(m => m !== 'password: string').sort()).toEqual([
      'password: newPassword', // supabase.auth.updateUser
      'password: userData.password', // supabase.auth.signUp
    ]);
  });
});
