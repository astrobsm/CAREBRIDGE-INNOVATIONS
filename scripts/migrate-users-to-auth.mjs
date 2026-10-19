#!/usr/bin/env node
/**
 * Move every AstroHEALTH user (public.users) onto a Supabase Auth account.
 *
 *   npm run auth:migrate-users                          dry run: print the plan, change nothing
 *   npm run auth:migrate-users -- --apply --out <csv>   do it; temporary passwords go to <csv>
 *   npm run auth:migrate-users -- --apply --out <csv> --invite
 *                                                       email an invitation instead of creating
 *                                                       a password, for active accounts
 *
 * Environment (never commit these, never prefix with VITE_):
 *   SUPABASE_URL (or VITE_SUPABASE_URL)   the project URL
 *   SUPABASE_SERVICE_ROLE_KEY             Project Settings -> API -> service_role
 *   AUTH_REDIRECT_URL (optional)          where invitation links land, e.g. https://<app>/login
 *
 * What it does — see scripts/lib/authMigrationPlan.mjs for the exact rules:
 * for each users row without auth_user_id it links an existing Auth user with
 * that email, or creates one (email already confirmed) keeping the row's
 * current password when it is at least 8 characters, else with a generated
 * temporary password. Either way must_change_password = true: every legacy
 * plaintext password was readable with the public anon key, so people sign in
 * once with what they know and then must choose a new one. Then it clears the
 * row's plaintext password. Duplicate-email rows: only the active one is
 * migrated; the rest are reported. Re-running is safe: linked rows are done.
 *
 * Passwords are NEVER printed. Generated ones are written only to the --out
 * CSV, which must be outside this repository, must not exist yet, and is
 * created readable by you only. Hand them out, then delete the file.
 *
 * Requires supabase/migrations/20261019090000_auth_accounts.sql to be applied.
 */

import { existsSync, openSync, writeSync, closeSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { csvField, describeStep, planUserMigration, summarisePlan } from './lib/authMigrationPlan.mjs';
import { generateTempPassword } from '../api/_lib/tempPassword.js';

const BAN_FOREVER = '876000h';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { apply: false, invite: false, out: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--invite') args.invite = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--out') args.out = argv[++i] ?? null;
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

/** Is `path` inside the repository (where it could be committed)? */
export function isInsideRepo(path, root = REPO_ROOT) {
  const rel = relative(root, resolve(path));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/** Raised by fail(); reported once by the entry point. */
class MigrationStop extends Error {}

// Throws rather than calling process.exit(): exiting while supabase-js still
// has sockets closing trips a libuv assertion on Windows
// (`!(handle->flags & UV_HANDLE_CLOSING)`), which buries the real message.
function fail(message) {
  throw new MigrationStop(message);
}

async function fetchAllRows(admin) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await admin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, updated_at, auth_user_id, password, must_change_password')
      .order('id')
      .range(from, from + page - 1);
    if (error) {
      if (error.code === '42703') fail('public.users has no auth_user_id column yet. Apply 20261019090000_auth_accounts.sql first (npm run db:migrate).');
      fail(`Could not read public.users: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return rows;
}

async function fetchAllAuthUsers(admin) {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Could not list Supabase Auth users: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    fail(e.message);
  }
  if (args.help) {
    console.log('Usage: npm run auth:migrate-users [-- --apply --out <csv outside the repo> [--invite]]');
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');

  let outFd = null;
  if (args.apply) {
    if (!args.out) fail('--apply needs --out <path> for the temporary-password CSV (outside this repository).');
    const outPath = resolve(args.out);
    if (isInsideRepo(outPath)) fail(`Refusing to write passwords inside the repository (${outPath}). Choose a path outside ${REPO_ROOT}.`);
    if (existsSync(outPath)) fail(`${outPath} already exists. Choose a new file; an earlier run's passwords are not overwritten.`);
    outFd = openSync(outPath, 'wx', 0o600);
    writeSync(outFd, ['email', 'first_name', 'last_name', 'role', 'what_to_tell_them', 'temporary_password'].map(csvField).join(',') + '\n');
    console.log(`Temporary passwords will be written to ${outPath}`);
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('Reading users and sign-in accounts...');
  const rows = await fetchAllRows(admin);
  const authUsers = await fetchAllAuthUsers(admin);
  const steps = planUserMigration(rows, authUsers, { invite: args.invite });
  const byId = new Map(rows.map((r) => [String(r.id), r]));

  console.log(`\n${rows.length} users rows, ${authUsers.length} sign-in accounts.\n`);
  for (const s of steps) console.log(`  ${describeStep(s)}`);
  console.log(`\nPlan: ${JSON.stringify(summarisePlan(steps))}`);

  if (!args.apply) {
    console.log('\nDry run — nothing was changed. Re-run with --apply --out <csv outside the repo> to do it.');
    return;
  }

  const counts = { done: 0, failed: 0 };
  const failures = [];
  const record = (row, tell, password = '') => {
    writeSync(outFd, [row.email, row.first_name, row.last_name, row.role, tell, password].map(csvField).join(',') + '\n');
  };
  const clearPassword = async (rowId) => {
    const { error } = await admin.from('users').update({ password: null }).eq('id', rowId);
    if (error) throw error;
  };

  for (const step of steps) {
    const row = byId.get(String(step.rowId));
    try {
      if (step.kind === 'link') {
        const { error } = await admin.from('users')
          .update({ auth_user_id: step.authUserId, password: null })
          .eq('id', step.rowId).is('auth_user_id', null);
        if (error) throw error;
        if (!step.active) {
          const { error: banError } = await admin.auth.admin.updateUserById(step.authUserId, { ban_duration: BAN_FOREVER });
          if (banError) throw banError;
        }
        record(row, step.active ? 'Sign in with your existing password' : 'Account inactive (not usable)');
      } else if (step.kind === 'create') {
        let generated = step.passwordSource !== 'existing';
        let password = generated ? generateTempPassword() : row.password;
        const create = () => admin.auth.admin.createUser({
          email: step.email,
          password,
          email_confirm: true,
          user_metadata: { first_name: row.first_name ?? '', last_name: row.last_name ?? '' },
          ...(step.active ? {} : { ban_duration: BAN_FOREVER }),
        });
        let { data, error } = await create();
        if (error?.code === 'weak_password' && !generated) {
          // The project's password policy rejects the old password: issue a
          // temporary one instead.
          generated = true;
          password = generateTempPassword();
          ({ data, error } = await create());
        }
        if (error || !data?.user) throw error || new Error('no user returned');
        // Written before the row is touched, so a crash cannot lose a password
        // that is already set on the account.
        if (!step.active) record(row, 'Account inactive (not usable)');
        else if (generated) record(row, 'Temporary password — must be changed at first sign-in', password);
        else record(row, 'Sign in with your existing password, then choose a new one');
        // A kept password still has to be replaced at first sign-in: every
        // legacy plaintext password was readable with the public anon key, so
        // all of them must be treated as known to others.
        const patch = { auth_user_id: data.user.id, password: null, must_change_password: true };
        const { error: linkError } = await admin.from('users').update(patch).eq('id', step.rowId).is('auth_user_id', null);
        if (linkError) throw linkError;
      } else if (step.kind === 'invite') {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(step.email, {
          redirectTo: process.env.AUTH_REDIRECT_URL || undefined,
          data: { first_name: row.first_name ?? '', last_name: row.last_name ?? '' },
        });
        if (error || !data?.user) throw error || new Error('no user returned');
        const { error: linkError } = await admin.from('users')
          .update({ auth_user_id: data.user.id, password: null, must_change_password: true })
          .eq('id', step.rowId).is('auth_user_id', null);
        if (linkError) throw linkError;
        record(row, 'Invitation email sent — follow the link to set a password');
      } else if (step.clearPassword || step.kind === 'clear_password') {
        await clearPassword(step.rowId);
      }
      counts.done++;
    } catch (e) {
      counts.failed++;
      failures.push(`${step.kind} ${step.email ?? step.rowId}: ${String(e?.message || e).slice(0, 200)}`);
    }
  }

  closeSync(outFd);
  console.log(`\nApplied: ${counts.done} step(s) done, ${counts.failed} failed.`);
  if (failures.length) {
    console.log('Failures (re-running retries them):');
    for (const f of failures) console.log(`  ${f}`);
  }
  console.log('\nHand the temporary passwords out securely, then delete the CSV.');
  if (counts.failed) process.exitCode = 1;
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked && resolve(fileURLToPath(import.meta.url)) === invoked) {
  main().catch((e) => {
    console.error(`\n${e instanceof MigrationStop ? e.message : `Migration failed: ${e?.message || e}`}`);
    if (/invalid api key/i.test(String(e?.message))) {
      console.error('The service-role key was refused. Copy the service_role (secret) key again, in full.');
    }
    process.exitCode = 1;
  });
}
