// ---------------------------------------------------------------------------
// Sign-in compares email addresses the way they are stored: case, outer
// whitespace and invisible characters copied from WhatsApp/SMS do not count,
// a deactivated duplicate never locks someone out of their active account, and
// an administrator cannot give two accounts the same address.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { findEmailOwner, normaliseEmail, pickSignInAccount, toActiveFlag } from '../loginIdentity';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('normaliseEmail', () => {
  it('ignores case, outer whitespace and invisible characters', () => {
    expect(normaliseEmail('Ada.Obi@UNTH.edu.ng')).toBe('ada.obi@unth.edu.ng');
    expect(normaliseEmail('  ada@x.ng \n')).toBe('ada@x.ng');
    expect(normaliseEmail('\u200Bada@x.ng\uFEFF')).toBe('ada@x.ng');
    expect(normaliseEmail('ada@x.ng\u00A0')).toBe('ada@x.ng');
    expect(normaliseEmail(undefined)).toBe('');
  });

  it('never changes a visible character', () => {
    expect(normaliseEmail('ada.obi+theatre@x.ng')).toBe('ada.obi+theatre@x.ng');
    expect(normaliseEmail('ada@x.ng')).not.toBe(normaliseEmail('ada1@x.ng'));
  });
});

describe('pickSignInAccount', () => {
  it('prefers the active row when a deactivated duplicate shares the email', () => {
    const rows = [
      { id: 'old', email: 'Ada@x.ng', isActive: false, updatedAt: '2026-10-01' },
      { id: 'live', email: 'ada@x.ng ', isActive: true, updatedAt: '2026-09-01' },
    ];
    expect(pickSignInAccount(rows)?.id).toBe('live');
  });

  it('accepts the 0/1 flags older builds wrote, and picks the newest active row', () => {
    const rows = [
      { id: 'a', isActive: 1, updatedAt: '2026-01-01' },
      { id: 'b', isActive: 1, updatedAt: '2026-06-01' },
      { id: 'c', isActive: 0, updatedAt: '2026-12-01' },
    ];
    expect(pickSignInAccount(rows)?.id).toBe('b');
  });

  it('refuses when every matching row is deactivated', () => {
    expect(pickSignInAccount([{ id: 'x', isActive: false }, { id: 'y', isActive: 0 }])).toBeUndefined();
    expect(pickSignInAccount([])).toBeUndefined();
  });
});

describe('findEmailOwner', () => {
  const users = [
    { id: '1', email: 'Ada@x.ng', firstName: 'Ada' },
    { id: '2', email: 'bayo@x.ng', firstName: 'Bayo' },
  ];

  it('finds another account using the address in any case', () => {
    expect(findEmailOwner(users, ' ADA@x.ng', '2')?.id).toBe('1');
  });

  it('does not count the account being edited', () => {
    expect(findEmailOwner(users, 'ada@x.ng', '1')).toBeUndefined();
  });

  it('ignores an empty address', () => {
    expect(findEmailOwner(users, '  ')).toBeUndefined();
  });
});

describe('wiring', () => {
  it('sign-in, registration, User Management and bulk import all compare through normaliseEmail', () => {
    const auth = read('src/contexts/AuthContext.tsx');
    expect(auth).toMatch(/normaliseEmail\(u\.email\) === loginEmail/);
    // The duplicate-row choice now lives in the pure sign-in resolver.
    expect(auth).toMatch(/resolveAppUser\(/);
    expect(read('src/utils/signInFlow.ts')).toMatch(/pickSignInAccount\(matches\)/);
    expect(auth).not.toMatch(/\.equals\(email\.toLowerCase\(\)\)/);
    expect(read('src/domains/auth/pages/UsersManagementPage.tsx')).toMatch(/findEmailOwner\(await db\.users\.toArray\(\), email, userId\)/);
    expect(read('src/components/common/BulkImportModal.tsx')).toMatch(/normaliseEmail\(u\.email\) === email/);
  });

  it('records the last sign-in without pushing the whole user row', () => {
    const auth = read('src/contexts/AuthContext.tsx');
    const fn = auth.slice(auth.indexOf('function recordLastLogin'), auth.indexOf('export function AuthProvider'));
    expect(fn).toMatch(/update\(\{ last_login_at:/);
    expect(fn).not.toMatch(/syncRecord/);
    expect(fn).not.toMatch(/updatedAt/);
  });
});

describe('active flag', () => {
  it('turns the 1/0 User Management used to store into booleans, leaving the rest alone', () => {
    expect(toActiveFlag(1)).toBe(true);
    expect(toActiveFlag(0)).toBe(false);
    expect(toActiveFlag('0')).toBe(false);
    expect(toActiveFlag(true)).toBe(true);
    expect(toActiveFlag(false)).toBe(false);
    expect(toActiveFlag(undefined)).toBeUndefined();
  });

  it('User Management writes booleans, and Dexie v91 rewrites the old numbers', () => {
    const page = read('src/domains/auth/pages/UsersManagementPage.tsx');
    expect(page).not.toMatch(/isActive: formData\.isActive \? 1 : 0/);
    expect(page).not.toMatch(/isActive: 0,/);
    // (De)activation goes through /api/admin-users with a real boolean.
    expect(page).toMatch(/setAccountActive\(userId, !!isActive\)/);
    expect(page).toMatch(/setAccountActive\(target\.id, active\)/);
    const db = read('src/database/db.ts');
    expect(db).toMatch(/this\.version\(91\)[\s\S]*toActiveFlag\(u\.isActive\)/);
  });
});
