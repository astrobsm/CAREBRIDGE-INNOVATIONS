#!/usr/bin/env node
/**
 * Guided rollout of Supabase Auth and the ported features.
 *
 *   node scripts/rollout.mjs
 *
 * A menu: run every step in order, or pick one. Each step offers its options
 * (do it automatically, do it by hand with the SQL copied for you, or skip),
 * and steps that must not run early — merging, locking the database — refuse
 * until what they depend on is done, unless you type a confirmation word.
 *
 * Progress is remembered per Supabase project in supabase/.combined/ (git-
 * ignored). Secrets — the service-role key, database password, access token,
 * SMTP password — are typed with echo off, held in memory for this run only,
 * and handed to child scripts through their environment, never their command
 * line. The one file that holds passwords is the temporary-password CSV, which
 * is always written outside the repository.
 *
 * docs/AUTH_ROLLOUT.md explains every step; this script carries them out.
 */

import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, openSync, writeSync, closeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { promptHidden, safeLog, safeError } from './lib/dbConnection.mjs';
import { isInsideRepo } from './migrate-users-to-auth.mjs';
import { generateTempPassword } from '../api/_lib/tempPassword.js';
import {
  STEPS, GUARDED, stepById, missingPrerequisites, nextStep,
  PRODUCTION_REF, DEFAULT_SITE_URL, supabaseUrlFor, sqlEditorUrlFor, isProjectRef,
  normaliseSiteUrl, authSettingsPatch, LEAKED_ACCOUNTS, passwordCsvName, describeServiceKey,
} from './lib/rolloutPlan.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = join(REPO_ROOT, 'supabase', '.combined');
const STATE_FILE = join(STATE_DIR, 'rollout-state.json');
const COMBINED_SQL = join(STATE_DIR, 'all-migrations.sql');
const VERIFY_SQL = join(STATE_DIR, 'verify.sql');
const LOCKDOWN_SQL = join(REPO_ROOT, 'supabase', 'manual', '20261019100000_rls_lockdown.sql');
const ROLLBACK_SQL = join(REPO_ROOT, 'supabase', 'manual', '20261019100000_rls_lockdown_rollback.sql');
const PR_NUMBER = '1';
const BRANCH = 'port/unth-48h';

// ── Session (in memory only) ──────────────────────────────────────────────
const session = { ref: null, siteUrl: DEFAULT_SITE_URL, serviceKey: null, dbUrl: null };

// ── Terminal helpers ──────────────────────────────────────────────────────

function ask(question, fallback = '') {
  return new Promise((done) => {
    if (!process.stdin.isTTY) { done(fallback); return; }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const hint = fallback ? ` [${fallback}]` : '';
    rl.question(`${question}${hint}: `, (answer) => { rl.close(); done(answer.trim() || fallback); });
  });
}

/** Offer numbered options; returns the chosen option's key. */
async function choose(question, options) {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${i + 1}) ${o.label}${o.recommended ? '  (recommended)' : ''}`));
  for (;;) {
    const answer = await ask('Choose', String(options.findIndex((o) => o.recommended) + 1 || 1));
    const n = Number(answer);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1].key;
    console.log(`  Enter a number from 1 to ${options.length}.`);
  }
}

async function yes(question) {
  return /^y(es)?$/i.test(await ask(`${question} (y/n)`, 'n'));
}

const heading = (text) => console.log(`\n${'═'.repeat(70)}\n ${text}\n${'═'.repeat(70)}`);

/** Run a command with the terminal attached; secrets go in `env`, never argv. */
function run(command, args, { env = {}, input = null } = {}) {
  return new Promise((done) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: [input === null ? 'inherit' : 'pipe', 'inherit', 'inherit'],
      shell: false,
    });
    if (input !== null) { child.stdin.write(input); child.stdin.end(); }
    child.on('error', (e) => { safeError(`  Could not start ${command}: ${e.message}`); done(1); });
    child.on('close', (code) => done(code ?? 1));
  });
}

/** Run one of this repo's node scripts. */
const runScript = (script, args = [], env = {}) => run(process.execPath, [join(REPO_ROOT, 'scripts', script), ...args], { env });

/** npx without the Windows .cmd shim problem (see lib/dbConnection.mjs). */
function npxArgs(pkgAndArgs) {
  const candidates = [
    process.env.npm_execpath && join(dirname(process.env.npm_execpath), 'npx-cli.js'),
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ].filter(Boolean);
  const cli = candidates.find((p) => existsSync(p));
  if (!cli) throw new Error('Could not find npx, which ships with Node.js. Reinstall Node.js and try again.');
  return [process.execPath, [cli, ...pkgAndArgs]];
}

/** Put a file's text on the clipboard. UTF-8 safe on Windows (clip.exe is not). */
async function copyFileToClipboard(path) {
  if (process.platform === 'win32') {
    const ps = `Set-Clipboard -Value ([System.IO.File]::ReadAllText($env:ROLLOUT_COPY_PATH, [System.Text.Encoding]::UTF8))`;
    return (await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { env: { ROLLOUT_COPY_PATH: path } })) === 0;
  }
  const text = readFileSync(path, 'utf8');
  if (process.platform === 'darwin') return (await run('pbcopy', [], { input: text })) === 0;
  return (await run('xclip', ['-selection', 'clipboard'], { input: text })) === 0;
}

function openInBrowser(url) {
  const [cmd, args] = process.platform === 'win32' ? ['explorer.exe', [url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref(); } catch { /* the URL is printed anyway */ }
}

/** Copy an SQL file, open the SQL editor, and wait for the person to run it. */
async function pasteIntoSqlEditor(path, what) {
  const copied = await copyFileToClipboard(path);
  const url = sqlEditorUrlFor(session.ref);
  console.log(copied
    ? `\n  ✓ ${what} is on your clipboard.`
    : `\n  Could not use the clipboard. Open this file and copy all of it:\n    ${path}`);
  console.log(`  Opening the Supabase SQL editor: ${url}`);
  openInBrowser(url);
  console.log('  Paste it (Ctrl+V), click Run, and wait for it to finish.');
  return yes('  Did it finish with "Success"?');
}

// ── State ─────────────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function doneFor(ref) { return loadState()[ref]?.done ?? {}; }
function markDone(id) {
  const state = loadState();
  state[session.ref] ??= { done: {} };
  state[session.ref].done[id] = new Date().toISOString();
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function clearDone(id) {
  const state = loadState();
  if (state[session.ref]?.done) delete state[session.ref].done[id];
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Secrets, asked for once per run ───────────────────────────────────────

/** Ask Supabase whether it accepts the key, reading nothing (limit=0). */
async function keyAccepted(key, kind) {
  const headers = { apikey: key };
  // A legacy key is a JWT and also goes in Authorization; a new sb_secret_ key
  // is not a JWT and is sent as apikey only.
  if (kind === 'legacy') headers.Authorization = `Bearer ${key}`;
  try {
    const res = await fetch(`${supabaseUrlFor(session.ref)}/rest/v1/users?select=id&limit=0`, { headers });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => '');
    return { ok: false, why: `Supabase refused it (${res.status}${/invalid api key/i.test(body) ? ': Invalid API key' : ''}).` };
  } catch (e) {
    return { ok: false, why: `Could not reach Supabase to check it (${e?.message || e}).` };
  }
}

async function serviceKey() {
  if (session.serviceKey) return session.serviceKey;
  console.log('\n  The service-role key is needed. Find it at:');
  console.log(`  https://supabase.com/dashboard/project/${session.ref}/settings/api-keys`);
  console.log('    • "Legacy API keys" tab → service_role → Reveal → Copy   (starts with eyJ…), or');
  console.log('    • "Secret keys" → Copy                                   (starts with sb_secret_…)');
  console.log('  Use the page\'s Copy button. It is read with echo off — nothing shows while you paste.');
  for (let attempt = 1; attempt <= 3; attempt++) {
    const described = describeServiceKey(await promptHidden('  Service-role key: '), session.ref);
    if (!described.ok) { console.log(`  ✗ ${described.problem}`); continue; }
    const check = await keyAccepted(described.key, described.kind);
    if (!check.ok) { console.log(`  ✗ ${check.why} Copy it again in full.`); continue; }
    console.log(`  ✓ Key accepted (${described.kind === 'legacy' ? 'service_role' : 'secret key'}).`);
    session.serviceKey = described.key;
    return described.key;
  }
  throw new Error('No working service-role key after three tries.');
}

const adminClient = async () => createClient(supabaseUrlFor(session.ref), await serviceKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** The CSV for temporary passwords: always outside the repository. */
async function passwordCsvPath(prefix) {
  const suggested = join(homedir(), 'Documents', passwordCsvName(prefix));
  for (;;) {
    const path = resolve(await ask('  Save the temporary passwords to', suggested));
    if (isInsideRepo(path)) { console.log('  That is inside the repository — choose somewhere else.'); continue; }
    if (existsSync(path)) { console.log('  That file exists — choose a new name.'); continue; }
    mkdirSync(dirname(path), { recursive: true });
    return path;
  }
}

// ── The steps ─────────────────────────────────────────────────────────────

const steps = {
  async preflight() {
    const git = (args) => new Promise((done) => {
      const child = spawn('git', args, { cwd: REPO_ROOT });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.on('close', () => done(out.trim()));
      child.on('error', () => done(''));
    });
    const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
    const dirty = await git(['status', '--porcelain', '--untracked-files=no']);
    console.log(`  Branch: ${branch || '(unknown)'}${branch === BRANCH ? '  ✓' : `  — expected ${BRANCH}`}`);
    console.log(`  Uncommitted changes: ${dirty ? 'yes — commit or stash them first' : 'none  ✓'}`);
    const checkOk = (await runScript('check-migrations.mjs')) === 0;
    console.log(`  Migrations safe to re-run: ${checkOk ? '✓' : '✗'}`);
    if (branch !== BRANCH && !(await yes(`  You are not on ${BRANCH}. Continue anyway?`))) return false;
    return checkOk && !dirty;
  },

  async vercel() {
    const how = await choose('How should Vercel get SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY?', [
      { key: 'cli', label: 'Set them with the Vercel CLI (you log in once in the browser)', recommended: true },
      { key: 'manual', label: 'Show me how to add them in the Vercel dashboard' },
      { key: 'skip', label: 'Skip — they are already set' },
    ]);
    if (how === 'skip') return true;
    const url = supabaseUrlFor(session.ref);

    if (how === 'manual') {
      console.log('\n  Vercel → your project → Settings → Environment Variables → Add:');
      console.log(`    SUPABASE_URL               = ${url}`);
      console.log('    SUPABASE_SERVICE_ROLE_KEY  = (the service_role key — mark it Sensitive)');
      console.log('  Tick Production and Preview. Do NOT prefix either with VITE_.');
      openInBrowser('https://vercel.com/dashboard');
      return yes('  Added both?');
    }

    const key = await serviceKey();
    const [node, base] = npxArgs(['--yes', 'vercel@latest']);
    const vercel = (args, opts) => run(node, [...base, ...args], opts);
    console.log('\n  Linking this folder to the Vercel project (pick the AstroHEALTH project)...');
    if ((await vercel(['link'])) !== 0) return false;
    let ok = true;
    for (const [name, value] of [['SUPABASE_URL', url], ['SUPABASE_SERVICE_ROLE_KEY', key]]) {
      await vercel(['env', 'rm', name, 'production', '--yes']); // replace, if present; fails harmlessly if not
      const code = await vercel(['env', 'add', name, 'production'], { input: value });
      console.log(`  ${name} (production): ${code === 0 ? '✓' : '✗'}`);
      ok &&= code === 0;
    }
    console.log('\n  For pull-request previews, also add both under Preview in the Vercel dashboard.');
    return ok;
  },

  async ['auth-settings']() {
    const how = await choose('How should the Supabase Auth settings be applied?', [
      { key: 'api', label: 'Automatically, with a Supabase personal access token', recommended: true },
      { key: 'manual', label: 'Show me what to set in the dashboard' },
      { key: 'skip', label: 'Skip — already configured' },
    ]);
    if (how === 'skip') return true;

    const site = normaliseSiteUrl(await ask('  Production site URL', session.siteUrl));
    if (!site) { console.log('  That is not an https URL.'); return false; }
    session.siteUrl = site;

    if (how === 'manual') {
      console.log(`\n  1. URL Configuration → Site URL: ${site}; add ${site}/** to Redirect URLs.`);
      console.log('  2. Sign In / Providers → Email: enabled, "Confirm email" ON.');
      console.log('  3. Emails → SMTP Settings: your email provider (the built-in sender allows only a few emails an hour).');
      openInBrowser(`https://supabase.com/dashboard/project/${session.ref}/auth/url-configuration`);
      return yes('  Done?');
    }

    console.log('\n  Create a token at https://supabase.com/dashboard/account/tokens (it starts with sbp_).');
    const token = await promptHidden('  Personal access token: ');
    if (!token) return false;
    const endpoint = `https://api.supabase.com/v1/projects/${session.ref}/config/auth`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const current = await fetch(endpoint, { headers });
    if (!current.ok) { console.log(`  Could not read the settings (${current.status}). Check the token.`); return false; }
    const cfg = await current.json();
    console.log(`\n  Now: site_url=${cfg.site_url || '(none)'}, confirm email=${cfg.mailer_autoconfirm ? 'OFF' : 'ON'}, SMTP=${cfg.smtp_host || '(built-in)'}`);

    let smtp = null;
    const smtpChoice = await choose('Email sending (needed for sign-up confirmations and invites):', [
      { key: 'set', label: 'Set up my SMTP provider now (e.g. Gmail, Zoho, Brevo, Resend)', recommended: !cfg.smtp_host },
      { key: 'keep', label: cfg.smtp_host ? `Keep the current SMTP (${cfg.smtp_host})` : 'Leave the built-in sender for now', recommended: !!cfg.smtp_host },
    ]);
    if (smtpChoice === 'set') {
      smtp = {
        host: await ask('  SMTP host', 'smtp.gmail.com'),
        port: await ask('  SMTP port', '587'),
        user: await ask('  SMTP username'),
        pass: await promptHidden('  SMTP password (for Gmail, an app password): '),
        adminEmail: await ask('  Send from address'),
        senderName: await ask('  Sender name', 'AstroHEALTH'),
      };
    }

    let patch;
    try { patch = authSettingsPatch({ siteUrl: site, existingAllowList: cfg.uri_allow_list, smtp }); }
    catch (e) { console.log(`  ${e.message}`); return false; }
    const res = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify(patch) });
    if (!res.ok) { console.log(`  Supabase refused the change (${res.status}): ${(await res.text()).slice(0, 300)}`); return false; }
    console.log(`  ✓ Site URL ${site}, email confirmation ON${smtp ? `, SMTP ${smtp.host}` : ''}.`);
    return true;
  },

  async migrations() {
    const how = await choose('How should the migrations be applied?', [
      { key: 'paste', label: 'Copy one SQL script for me to run in the Supabase SQL editor (no password needed)', recommended: true },
      { key: 'cli', label: 'Apply them automatically with the database password (also records migration history)' },
    ]);
    if (how === 'cli') {
      const env = session.dbUrl ? { SUPABASE_DB_URL: session.dbUrl } : {};
      if ((await runScript('db-migrate.mjs', [], env)) !== 0) return false;
      if (!doneFor(session.ref).lockdown) return true;
      // With an empty migration history, db push replays every file, old open
      // policies included. Put the lockdown straight back.
      console.log('\n  The lockdown is in force here; re-applying it after the migrations.');
      return pasteIntoSqlEditor(LOCKDOWN_SQL, 'The lockdown script');
    }
    // Replaying the migrations recreates old "Allow all access" policies; once
    // the lockdown is in force, it is re-applied in the same transaction.
    const locked = !!doneFor(session.ref).lockdown;
    if (locked) console.log('  The lockdown is in force here, so the script re-applies it at the end.');
    if ((await runScript('db-sql.mjs', locked ? ['--with-lockdown'] : [])) !== 0) return false;
    console.log(`  The combined script is at:\n    ${COMBINED_SQL}`);
    return pasteIntoSqlEditor(COMBINED_SQL, 'The migration script');
  },

  async ['verify-db']() {
    if ((await runScript('db-verify.mjs')) !== 0) return false;
    const ok = await pasteIntoSqlEditor(VERIFY_SQL, 'The verification query');
    if (!ok) return false;
    return yes('  Does every row read "ok"? (Anything MISSING is listed first.)');
  },

  async users() {
    const env = { SUPABASE_URL: supabaseUrlFor(session.ref), SUPABASE_SERVICE_ROLE_KEY: await serviceKey(), AUTH_REDIRECT_URL: session.siteUrl };
    console.log('\n  First, a dry run — this shows the plan and changes nothing:');
    if ((await runScript('migrate-users-to-auth.mjs', [], env)) !== 0) return false;

    const how = await choose('How should people get their first password?', [
      { key: 'csv', label: 'Temporary passwords saved to a CSV for you to hand out', recommended: true },
      { key: 'invite', label: 'Email each person an invitation link (needs working SMTP)' },
      { key: 'cancel', label: 'Not now' },
    ]);
    if (how === 'cancel') return false;
    const out = await passwordCsvPath('carebridge-temp-passwords');
    const args = ['--apply', '--out', out, ...(how === 'invite' ? ['--invite'] : [])];
    const code = await runScript('migrate-users-to-auth.mjs', args, env);
    console.log(`\n  The list is in ${out}. Hand passwords out privately, then delete the file.`);
    return code === 0;
  },

  async rotate() {
    const admin = await adminClient();
    console.log('\n  These passwords were in the source code and are in git history:');
    LEAKED_ACCOUNTS.forEach((e) => console.log(`    ${e}`));
    if (!(await yes('  Give each a new temporary password now?'))) return false;

    const out = await passwordCsvPath('carebridge-rotated-admins');
    const fd = openSync(out, 'wx', 0o600);
    writeSync(fd, 'email,status,temporary_password\n');
    let ok = true;
    for (const email of LEAKED_ACCOUNTS) {
      const { data, error } = await admin.from('users').select('id, auth_user_id').ilike('email', email).not('auth_user_id', 'is', null).limit(1);
      const row = data?.[0];
      if (error || !row) {
        console.log(`  ${email}: no linked account (never synced, or not migrated) — nothing to rotate`);
        writeSync(fd, `${email},no account,\n`);
        continue;
      }
      const password = generateTempPassword();
      const { error: authError } = await admin.auth.admin.updateUserById(row.auth_user_id, { password });
      if (authError) { ok = false; console.log(`  ${email}: ✗ ${authError.message}`); continue; }
      writeSync(fd, `${email},rotated,${password}\n`);
      await admin.from('users').update({ must_change_password: true }).eq('id', row.id);
      console.log(`  ${email}: ✓ new temporary password`);
    }
    closeSync(fd);
    console.log(`\n  Saved to ${out}. Also change these passwords anywhere else they were used.`);
    return ok;
  },

  async merge() {
    const how = await choose('Merge pull request #1 now? This deploys the new sign-in to everyone.', [
      { key: 'merge', label: 'Mark it ready and merge it', recommended: true },
      { key: 'open', label: 'Open it in the browser — I will merge it myself' },
      { key: 'cancel', label: 'Not yet' },
    ]);
    if (how === 'cancel') return false;
    if (how === 'open') {
      await run('gh', ['pr', 'view', PR_NUMBER, '--web']);
      return yes('  Merged?');
    }
    if ((await run('gh', ['pr', 'ready', PR_NUMBER])) !== 0) return false;
    const code = await run('gh', ['pr', 'merge', PR_NUMBER, '--merge']);
    if (code === 0) {
      console.log('\n  ✓ Merged. Vercel is deploying; the migration workflow re-applies the');
      console.log('    migrations (harmless — they are idempotent). Give the deploy a few minutes.');
    }
    return code === 0;
  },

  async ['verify-signin']() {
    console.log(`\n  Opening ${session.siteUrl}. Check, in order:`);
    console.log('   1. An admin signs in with their temporary password and is asked to choose a new one.');
    console.log('   2. A wrong password is refused.');
    console.log('   3. A clinician signs in and sees patients; a new patient saves and syncs.');
    console.log('   4. A new self-registration shows "awaiting approval"; an admin approves it in User Management.');
    console.log('   5. The public booking page and the family child login still work.');
    openInBrowser(session.siteUrl);
    return yes('  Did all five work?');
  },

  async lockdown() {
    const how = await choose('Lock the database so only signed-in members can read or change data?', [
      { key: 'lock', label: 'Copy the lockdown script for the SQL editor', recommended: true },
      { key: 'rollback', label: 'Undo a lockdown already applied (rollback script)' },
      { key: 'cancel', label: 'Not yet' },
    ]);
    if (how === 'cancel') return false;
    if (how === 'rollback') {
      const ok = await pasteIntoSqlEditor(ROLLBACK_SQL, 'The rollback script');
      if (ok) clearDone('lockdown');
      return false;
    }
    const ok = await pasteIntoSqlEditor(LOCKDOWN_SQL, 'The lockdown script');
    if (ok) console.log('\n  Sign in again on the live site and open a patient to confirm data still loads.');
    return ok;
  },
};

// ── Driver ────────────────────────────────────────────────────────────────

async function runStep(id) {
  const step = stepById(id);
  heading(`${STEPS.indexOf(step) + 1}. ${step.title}`);
  const missing = missingPrerequisites(id, doneFor(session.ref));
  if (missing.length) {
    console.log(`  Not done yet: ${missing.map((m) => stepById(m).title).join('; ')}.`);
    const word = GUARDED[id];
    if (word) {
      if ((await ask(`  Running this early can lock people out. Type ${word} to run it anyway`)) !== word) return false;
    } else if (!(await yes('  Run it anyway?'))) return false;
  }
  try {
    const ok = await steps[id]();
    if (ok) { markDone(id); console.log(`\n  ✓ ${step.title}`); }
    else console.log(`\n  ✗ Not marked done. You can run this step again from the menu.`);
    return ok;
  } catch (e) {
    safeError(`\n  ✗ ${e?.message || e}`);
    return false;
  }
}

async function chooseTarget() {
  const target = await choose('Which Supabase project?', [
    { key: 'prod', label: `Production (${PRODUCTION_REF})`, recommended: true },
    { key: 'other', label: 'Another project — e.g. a staging copy to rehearse on first' },
  ]);
  if (target === 'prod') { session.ref = PRODUCTION_REF; return; }
  for (;;) {
    const ref = await ask('  Project ref (20 letters, from its dashboard URL)');
    if (isProjectRef(ref)) { session.ref = ref; break; }
    console.log('  That is not a project ref.');
  }
  console.log('  For the automatic migration option, the database connection string is needed');
  console.log('  (Project Settings → Database → Connection string → URI). Leave blank to use the SQL editor.');
  session.dbUrl = (await promptHidden('  Connection string (optional): ')) || null;
}

async function main() {
  // Without a person at the keyboard every question would take its default,
  // which would walk the steps unattended. This only ever runs interactively.
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    safeError('The rollout is interactive. Run it in a terminal: node scripts/rollout.mjs');
    process.exit(1);
  }
  heading('AstroHEALTH — authentication rollout');
  console.log('  Every step is explained in docs/AUTH_ROLLOUT.md. Nothing happens without you choosing it.');
  await chooseTarget();

  for (;;) {
    const done = doneFor(session.ref);
    console.log(`\n  Project ${session.ref}${session.ref === PRODUCTION_REF ? ' (PRODUCTION)' : ''}`);
    STEPS.forEach((s, i) => console.log(`   ${done[s.id] ? '✓' : ' '} ${String(i + 1).padStart(2)}. ${s.title}`));
    const next = nextStep(done);
    const action = await choose('What next?', [
      ...(next ? [{ key: 'all', label: `Run every remaining step in order (from "${next.title}")`, recommended: true }] : []),
      { key: 'pick', label: 'Run one step' },
      { key: 'sql', label: 'Just give me the SQL scripts (migrations, verification, lockdown, rollback)' },
      { key: 'quit', label: 'Quit', recommended: !next },
    ]);

    if (action === 'quit') break;
    if (action === 'sql') {
      await runScript('db-sql.mjs');
      await runScript('db-verify.mjs');
      console.log('\n  Run these in the Supabase SQL editor, in this order:');
      console.log(`   1. Migrations:    ${COMBINED_SQL}`);
      console.log(`   2. Verification:  ${VERIFY_SQL}`);
      console.log(`   3. Lockdown, only after the new build is live and sign-in works:\n                     ${LOCKDOWN_SQL}`);
      console.log(`   Undo the lockdown: ${ROLLBACK_SQL}`);
      continue;
    }
    if (action === 'pick') {
      const id = await choose('Which step?', STEPS.map((s, i) => ({ key: s.id, label: `${i + 1}. ${s.title}${done[s.id] ? '  ✓' : ''}` })));
      await runStep(id);
      continue;
    }
    // Run every remaining step, stopping at the first that is not completed.
    for (let step = nextStep(doneFor(session.ref)); step; step = nextStep(doneFor(session.ref))) {
      if (!(await runStep(step.id))) {
        console.log('\n  Stopped here. Choose "Run every remaining step" again to resume.');
        break;
      }
    }
  }
  safeLog('\nBye. Progress is saved; run `node scripts/rollout.mjs` to carry on.');
}

main().catch((e) => { safeError(`Rollout failed: ${e?.message || e}`); process.exit(1); });
