// ---------------------------------------------------------------------------
// /api/admin-users and the server-side authentication of the functions.
//
//  - who may administer which account (api/_lib/adminUsersPolicy.js, pure);
//  - the handler, against an in-memory stand-in for the service-role client:
//    token verified, temporary password returned once and never stored on the
//    users row, deactivation bans the Supabase account;
//  - requireAppUser for the AI endpoints;
//  - temporary passwords; and the server's email rules matching the client's.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normaliseEmail as clientNormalise } from '../../utils/loginIdentity';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// api/ is plain JS outside the TypeScript project; load it untyped.
/* eslint-disable @typescript-eslint/no-explicit-any */
let policy: any;
let handlerMod: any;
let requireMod: any;
let tempMod: any;
let emailMod: any;
beforeAll(async () => {
  const p = (f: string) => `../../../api/${f}`;
  policy = await import(/* @vite-ignore */ p('_lib/adminUsersPolicy.js'));
  handlerMod = await import(/* @vite-ignore */ p('admin-users.js'));
  requireMod = await import(/* @vite-ignore */ p('_lib/requireUser.js'));
  tempMod = await import(/* @vite-ignore */ p('_lib/tempPassword.js'));
  emailMod = await import(/* @vite-ignore */ p('_lib/email.js'));
});

const superAdmin = { id: 's1', role: 'super_admin', hospital_id: 'h1', is_active: true };
const hospAdmin = { id: 'a1', role: 'hospital_admin', hospital_id: 'h1', is_active: true };
const nurse = { id: 'n1', role: 'nurse', hospital_id: 'h1', is_active: true };

describe('admin-users authorisation rules', () => {
  const decide = (...args: unknown[]) => policy.decideAdminAction(...args);

  it('non-administrators and inactive callers get nothing', () => {
    expect(decide(nurse, 'create', null, { role: 'nurse' })).toMatchObject({ allow: false, status: 403 });
    expect(decide({ ...superAdmin, is_active: false }, 'create', null, { role: 'nurse' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(null, 'create', null, { role: 'nurse' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(superAdmin, 'drop_tables', null)).toMatchObject({ allow: false, status: 400 });
  });

  it('a super admin creates any role at any hospital', () => {
    expect(decide(superAdmin, 'create', null, { role: 'super_admin', hospital_id: 'h9' })).toEqual({ allow: true, hospitalId: 'h9' });
    expect(decide(superAdmin, 'create', null, { role: 'nurse' })).toEqual({ allow: true, hospitalId: null });
  });

  it('a hospital admin creates at their own hospital only, never a super admin', () => {
    expect(decide(hospAdmin, 'create', null, { role: 'nurse' })).toEqual({ allow: true, hospitalId: 'h1' });
    expect(decide(hospAdmin, 'create', null, { role: 'nurse', hospital_id: 'h1' })).toEqual({ allow: true, hospitalId: 'h1' });
    expect(decide(hospAdmin, 'create', null, { role: 'nurse', hospital_id: 'h2' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(hospAdmin, 'create', null, { role: 'super_admin' })).toMatchObject({ allow: false, status: 403 });
    expect(decide({ ...hospAdmin, hospital_id: null }, 'create', null, { role: 'nurse' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(hospAdmin, 'create', null, {})).toMatchObject({ allow: false, status: 400 });
  });

  it('a hospital admin manages their own hospital, never a super admin', () => {
    const local = { id: 'x', role: 'nurse', hospital_id: 'h1', is_active: true };
    const other = { id: 'y', role: 'nurse', hospital_id: 'h2', is_active: true };
    const boss = { id: 'z', role: 'super_admin', hospital_id: 'h1', is_active: true };
    expect(decide(hospAdmin, 'reset_password', local)).toEqual({ allow: true });
    expect(decide(hospAdmin, 'reset_password', other)).toMatchObject({ allow: false, status: 403 });
    expect(decide(hospAdmin, 'reset_password', boss)).toMatchObject({ allow: false, status: 403 });
    expect(decide(hospAdmin, 'set_active', other, { active: false })).toMatchObject({ allow: false, status: 403 });
    expect(decide(superAdmin, 'reset_password', other)).toEqual({ allow: true });
    expect(decide(superAdmin, 'set_active', boss, { active: false })).toEqual({ allow: true });
  });

  it('a hospital admin may approve an unassigned registration into their hospital', () => {
    const pending = { id: 'p', role: 'nurse', hospital_id: null, is_active: false };
    expect(decide(hospAdmin, 'set_active', pending, { active: true })).toEqual({ allow: true, hospitalId: 'h1' });
    expect(decide(hospAdmin, 'set_active', { ...pending, role: 'hospital_admin' }, { active: true })).toMatchObject({ allow: false });
    expect(decide(hospAdmin, 'set_active', pending, { active: false })).toMatchObject({ allow: false });
  });

  it('nobody changes their own active flag; the flag must be a boolean; the target must exist', () => {
    expect(decide(superAdmin, 'set_active', superAdmin, { active: false })).toMatchObject({ allow: false, status: 400 });
    expect(decide(superAdmin, 'set_active', nurse, { active: 'no' })).toMatchObject({ allow: false, status: 400 });
    expect(decide(superAdmin, 'reset_password', null)).toMatchObject({ allow: false, status: 404 });
  });
});

// ── In-memory stand-in for the service-role client ─────────────────────────

function fakeAdmin(opts: { tokens: Record<string, string>; users: any[] }) {
  const users = opts.users.map((u) => ({ ...u }));
  const calls: any[] = [];
  const authUsers: any[] = [];

  function query(table: string) {
    let rows: any[] = table === 'users' ? users : [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let patch: any = null;
    let inserted: any = null;
    const filters: ((r: any) => boolean)[] = [];
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => { filters.push((r) => String(r[c]) === String(v)); return b; },
      is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return b; },
      ilike: (c: string, v: string) => {
        const plain = v.replace(/\\(.)/g, '$1').toLowerCase();
        filters.push((r) => String(r[c] ?? '').toLowerCase() === plain);
        return b;
      },
      limit: () => b,
      insert: (row: any) => { op = 'insert'; inserted = row; return b; },
      update: (p: any) => { op = 'update'; patch = p; return b; },
      then: (resolve: any) => {
        if (op === 'insert') {
          calls.push({ insert: inserted });
          users.push({ ...inserted });
          return resolve({ data: [{ ...inserted }], error: null });
        }
        const matched = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'update') {
          calls.push({ update: patch });
          matched.forEach((r) => Object.assign(r, patch));
        }
        return resolve({ data: matched.map((r) => ({ ...r })), error: null });
      },
    };
    return b;
  }

  return {
    users,
    calls,
    authUsers,
    from: (t: string) => query(t),
    auth: {
      getUser: async (token: string) =>
        opts.tokens[token] ? { data: { user: { id: opts.tokens[token] } }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } },
      admin: {
        createUser: async (attrs: any) => {
          calls.push({ createUser: attrs });
          const u = { id: `auth-${authUsers.length + 1}`, email: attrs.email };
          authUsers.push(u);
          return { data: { user: u }, error: null };
        },
        updateUserById: async (id: string, attrs: any) => {
          calls.push({ updateUserById: [id, attrs] });
          return { data: { user: { id } }, error: null };
        },
        deleteUser: async () => ({ data: null, error: null }),
      },
    },
  };
}

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    statusCode: 200,
    body: undefined as any,
    setHeader(k: string, v: string) { headers[k] = v; },
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { this.body = b; return this; },
    end() { return this; },
  };
}

const baseUsers = () => [
  { ...superAdmin, email: 'boss@x.ng', auth_user_id: 'auth-super' },
  { ...hospAdmin, email: 'admin@x.ng', auth_user_id: 'auth-admin' },
  { ...nurse, email: 'nurse@x.ng', auth_user_id: 'auth-nurse', password: 'legacy-plain' },
  { id: 'old', role: 'nurse', hospital_id: 'h1', is_active: true, email: 'old@x.ng', auth_user_id: null },
];
const tokens = { 'tok-super': 'auth-super', 'tok-admin': 'auth-admin', 'tok-nurse': 'auth-nurse' };
const post = (token: string | null, body: unknown) => ({
  method: 'POST',
  headers: token ? { authorization: `Bearer ${token}` } : {},
  body,
});

describe('admin-users handler', () => {
  it('refuses a missing or invalid token, and non-administrators', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    let res = fakeRes();
    await handlerMod.handleAdminUsers(post(null, { action: 'create' }), res, { admin });
    expect(res.statusCode).toBe(401);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('forged', { action: 'create' }), res, { admin });
    expect(res.statusCode).toBe(401);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-nurse', { action: 'create', email: 'a@x.ng', firstName: 'A', lastName: 'B', role: 'nurse' }), res, { admin });
    expect(res.statusCode).toBe(403);
    expect(admin.calls.some((c) => c.createUser)).toBe(false);
  });

  it('create: confirmed Auth account, linked row, temporary password returned once and not stored', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    const res = fakeRes();
    await handlerMod.handleAdminUsers(
      post('tok-admin', { action: 'create', email: ' New.Nurse@X.ng', firstName: 'New', lastName: 'Nurse', role: 'nurse', hospitalId: 'h1' }),
      res,
      { admin, newPassword: () => 'Temp-Pass-123!' },
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body.temporaryPassword).toBe('Temp-Pass-123!');
    const create = admin.calls.find((c) => c.createUser).createUser;
    expect(create).toMatchObject({ email: 'new.nurse@x.ng', password: 'Temp-Pass-123!', email_confirm: true });
    const row = admin.calls.find((c) => c.insert).insert;
    expect(row).toMatchObject({ email: 'new.nurse@x.ng', role: 'nurse', hospital_id: 'h1', is_active: true, must_change_password: true, auth_user_id: 'auth-1' });
    expect(JSON.stringify(row)).not.toContain('Temp-Pass-123!');
    expect(res.body.user.password).toBeUndefined();
  });

  it('create: a duplicate email is refused before any account is made', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    const res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-super', { action: 'create', email: 'NURSE@x.ng', firstName: 'A', lastName: 'B', role: 'nurse' }), res, { admin });
    expect(res.statusCode).toBe(409);
    expect(admin.calls.some((c) => c.createUser)).toBe(false);
  });

  it('create: a hospital admin cannot create a super admin', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    const res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'create', email: 'x@x.ng', firstName: 'A', lastName: 'B', role: 'super_admin' }), res, { admin });
    expect(res.statusCode).toBe(403);
  });

  it('reset_password: new password on the Auth account, must_change_password, legacy password cleared', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    const res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'reset_password', userId: 'n1' }), res, { admin, newPassword: () => 'Reset-Pass-456!' });
    expect(res.statusCode).toBe(200);
    expect(res.body.temporaryPassword).toBe('Reset-Pass-456!');
    expect(admin.calls.find((c) => c.updateUserById).updateUserById).toEqual(['auth-nurse', { password: 'Reset-Pass-456!' }]);
    const patch = admin.calls.find((c) => c.update).update;
    expect(patch).toMatchObject({ must_change_password: true, password: null });
    expect(res.body.user.password).toBeUndefined();
  });

  it('reset_password on a not-yet-migrated row creates and links its Auth account', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    const res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-super', { action: 'reset_password', userId: 'old' }), res, { admin, newPassword: () => 'P-1' });
    expect(res.statusCode).toBe(200);
    expect(admin.calls.find((c) => c.createUser).createUser).toMatchObject({ email: 'old@x.ng', email_confirm: true });
    expect(admin.users.find((u) => u.id === 'old').auth_user_id).toBe('auth-1');
  });

  it('set_active: deactivation bans the Auth account, activation lifts the ban', async () => {
    const admin = fakeAdmin({ tokens, users: baseUsers() });
    let res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'set_active', userId: 'n1', active: false }), res, { admin });
    expect(res.statusCode).toBe(200);
    expect(admin.calls.find((c) => c.updateUserById).updateUserById).toEqual(['auth-nurse', { ban_duration: handlerMod.BAN_FOREVER }]);
    expect(admin.users.find((u) => u.id === 'n1').is_active).toBe(false);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'set_active', userId: 'n1', active: true }), res, { admin });
    expect(admin.calls.filter((c) => c.updateUserById).pop().updateUserById).toEqual(['auth-nurse', { ban_duration: 'none' }]);
    expect(admin.users.find((u) => u.id === 'n1').is_active).toBe(true);
  });

  it('runs the same-origin guard and needs the service key from the server env only', () => {
    const src = read('api/admin-users.js');
    expect(src).toMatch(/if \(guardSameOrigin\(req, res\)\) return;/);
    const server = read('api/_lib/supabaseServer.js');
    expect(server).toMatch(/env\.SUPABASE_SERVICE_ROLE_KEY/);
    expect(server).not.toMatch(/VITE_SUPABASE_SERVICE_ROLE_KEY/);
    // Nothing in the browser bundle may reference the service key.
    for (const f of ['src/services/supabaseClient.ts', 'src/services/adminUsersClient.ts', 'src/vite-env.d.ts']) {
      expect(read(f), f).not.toMatch(/SERVICE_ROLE/);
    }
  });
});

describe('requireAppUser (AI endpoints)', () => {
  const lookupWith = (row: any) => ({ from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: row ? [row] : [], error: null }) }) }) }) });
  const verifier = { auth: { getUser: async (t: string) => (t === 'good' ? { data: { user: { id: 'auth-1' } }, error: null } : { data: { user: null }, error: { message: 'bad' } }) } };

  it('no token: 401; bad token: 401', async () => {
    let res = fakeRes();
    expect(await requireMod.requireAppUser({ headers: {} }, res, { verifier, lookup: lookupWith(null) })).toBeNull();
    expect(res.statusCode).toBe(401);
    res = fakeRes();
    expect(await requireMod.requireAppUser({ headers: { authorization: 'Bearer nope' } }, res, { verifier, lookup: lookupWith(null) })).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it('a valid token for an inactive or unlinked account: 403', async () => {
    let res = fakeRes();
    expect(await requireMod.requireAppUser({ headers: { authorization: 'Bearer good' } }, res, { verifier, lookup: lookupWith(null) })).toBeNull();
    expect(res.statusCode).toBe(403);
    res = fakeRes();
    expect(await requireMod.requireAppUser({ headers: { authorization: 'Bearer good' } }, res, { verifier, lookup: lookupWith({ id: 'u', is_active: false }) })).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it('a valid token for an active user passes', async () => {
    const res = fakeRes();
    const who = await requireMod.requireAppUser({ headers: { authorization: 'Bearer good' } }, res, { verifier, lookup: lookupWith({ id: 'u', is_active: true }) });
    expect(who.appUser.id).toBe('u');
    expect(who.authUser.id).toBe('auth-1');
  });

  it('fails closed when the server cannot verify', async () => {
    const res = fakeRes();
    const broken = { auth: { getUser: async () => { throw new Error('down'); } } };
    expect(await requireMod.requireAppUser({ headers: { authorization: 'Bearer good' } }, res, { verifier: broken, lookup: lookupWith(null) })).toBeNull();
    expect(res.statusCode).toBe(503);
    const unconfigured = fakeRes();
    expect(await requireMod.requireAppUser({ headers: { authorization: 'Bearer good' } }, unconfigured, { env: {} })).toBeNull();
    expect(unconfigured.statusCode).toBe(503);
  });

  it('both AI proxies require it after the origin guard, and the client sends the token', () => {
    for (const f of ['api/ai-chat.js', 'api/ai-vision.js']) {
      const src = read(f);
      expect(src.indexOf('if (!(await requireAppUser(req, res))) return;'), f).toBeGreaterThan(src.indexOf('guardSameOrigin(req, res)'));
      expect(src.indexOf('if (!(await requireAppUser(req, res))) return;'), f).toBeLessThan(src.indexOf('process.env.OPENAI_API_KEY'));
    }
    const client = read('src/services/aiProxy.ts');
    expect(client.match(/headers: await withAuthHeaders\(/g)?.length).toBe(3);
  });

  it('an AI request without a token is refused before any upstream call', async () => {
    const res = fakeRes();
    const chatPath = '../../../api/ai-chat.js';
    const chat = await import(/* @vite-ignore */ chatPath);
    await chat.default({ method: 'POST', headers: { host: 'x' }, body: { prompt: 'hi' } }, res);
    expect(res.statusCode).toBe(401);
  });
});

describe('temporary passwords and email rules', () => {
  it('temporary passwords are long, mixed and random', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const p = tempMod.generateTempPassword();
      expect(p.length).toBeGreaterThanOrEqual(12);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[0-9]/);
      expect(p).toMatch(/[!@#$%&*?]/);
      seen.add(p);
    }
    expect(seen.size).toBe(50);
    expect(read('api/_lib/tempPassword.js')).not.toMatch(/Math\.random/);
  });

  it('the server normalises emails exactly like the client', () => {
    for (const e of [' Ada@X.ng ', '​ada@x.ng', 'ada@x.ng ', 'ADA@x.NG\n', '', 'a­b@x.ng']) {
      expect(emailMod.normaliseEmail(e)).toBe(clientNormalise(e));
    }
  });

  it('LIKE wildcards in an email are escaped for the duplicate check', () => {
    expect(emailMod.likeExact('a_b%c@x.ng')).toBe('a\\_b\\%c@x.ng');
  });
});
