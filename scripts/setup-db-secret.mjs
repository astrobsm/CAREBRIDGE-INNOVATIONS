#!/usr/bin/env node
/**
 * One-time setup: hand the database credential to GitHub Actions so migrations
 * apply themselves from then on.
 *
 *   npm run db:setup
 *
 * After this runs once, every push to main that touches supabase/migrations
 * applies itself. Nobody opens the SQL editor again.
 *
 * WHAT IT DOES
 *   1. Asks for the database password, with echo off.
 *   2. Proves the credential works before storing it — storing an untested
 *      secret just moves the failure into CI, where it is slower to diagnose.
 *   3. Stores it as the SUPABASE_DB_URL repository secret via the gh CLI.
 *   4. Offers to apply the currently pending migrations straight away.
 *
 * The password is held in memory, passed to gh over stdin rather than as an
 * argument (arguments are visible to other processes in the process table), and
 * never written to disk or echoed. GitHub encrypts it on receipt and it cannot
 * be read back afterwards, only overwritten.
 */

import { spawn } from 'node:child_process';
import {
  resolveDbUrl, redact, safeLog, safeError, describeUrl, confirm, resolveCommand,
} from './lib/dbConnection.mjs';

function run(command, argv, { label, input, quiet } = {}) {
  return new Promise((resolve) => {
    if (label) safeLog(`\n→ ${label}`);
    // No shell: see resolveCommand. A shell would split any path containing a
    // space and would put the connection URI into shell history.
    const child = spawn(resolveCommand(command), argv, {
      shell: false,
      stdio: [input !== undefined ? 'pipe' : 'inherit', 'pipe', 'pipe'],
    });

    let out = '';
    const capture = (chunk) => {
      const text = chunk.toString();
      out += text;
      if (!quiet) process.stdout.write(redact(text));
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);

    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('error', (err) => resolve({ code: 1, out: redact(err.message) }));
    child.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

async function main() {
  safeLog('Automatic migrations — setup\n' + '─'.repeat(50));

  // ── gh must be present and authenticated ─────────────────────────────────
  const ghVersion = await run('gh', ['--version'], { quiet: true });
  if (ghVersion.code !== 0) {
    safeError(
      '\nThe GitHub CLI is not installed.\n\n'
      + 'Install it from https://cli.github.com, then run this again.\n\n'
      + 'Alternatively, set the secret by hand:\n'
      + '  GitHub → Settings → Secrets and variables → Actions → New repository secret\n'
      + '  Name:  SUPABASE_DB_URL\n'
      + '  Value: the connection string shown by `npm run db:url`',
    );
    process.exit(1);
  }

  const authed = await run('gh', ['auth', 'status'], { quiet: true });
  if (authed.code !== 0) {
    safeLog('\nYou are not signed in to GitHub. Starting sign-in…');
    const login = await run('gh', ['auth', 'login'], { label: 'GitHub sign-in' });
    if (login.code !== 0) {
      safeError('\nSign-in did not complete. Run `gh auth login` yourself, then try again.');
      process.exit(1);
    }
  }

  // ── Credential ───────────────────────────────────────────────────────────
  let resolved;
  try {
    resolved = await resolveDbUrl({ allowPrompt: true });
  } catch (err) {
    safeError(`\n${err.message}`);
    process.exit(1);
  }
  if (!resolved) {
    safeError('\nNo database password supplied.');
    process.exit(1);
  }

  // ── Prove it works before storing it ─────────────────────────────────────
  safeLog(`\nTesting the connection to ${describeUrl(resolved.url)}…`);
  const test = await run('npx', [
    '--yes', 'supabase@latest', 'migration', 'list', '--db-url', resolved.url,
  ], { label: 'Connecting', quiet: false });

  if (test.code !== 0) {
    safeError(
      '\nThat credential did not work, so nothing was stored.\n'
      + 'Check the password in Supabase → Project Settings → Database, and that the '
      + 'project is not paused.',
    );
    process.exit(1);
  }
  safeLog('\nConnection confirmed.');

  // ── Store it ─────────────────────────────────────────────────────────────
  // Passed over stdin: an argument would be visible in the process table to
  // anything else running on this machine.
  const set = await run('gh', ['secret', 'set', 'SUPABASE_DB_URL'], {
    label: 'Storing the SUPABASE_DB_URL repository secret',
    input: resolved.url,
  });

  if (set.code !== 0) {
    safeError(
      '\nCould not store the secret. You may not have admin rights on the repository.\n'
      + 'Ask an admin to add SUPABASE_DB_URL, or add it yourself at:\n'
      + '  Settings → Secrets and variables → Actions → New repository secret',
    );
    process.exit(1);
  }

  safeLog(
    '\nStored. From now on, any push to main that changes supabase/migrations '
    + 'applies itself automatically.\n'
    + 'GitHub encrypts the secret on receipt; it cannot be read back, only replaced.',
  );

  // ── Offer to catch up now ────────────────────────────────────────────────
  const now = await confirm('\nApply the currently pending migrations now?');
  if (!now) {
    safeLog(
      '\nNothing applied. Run `npm run db:migrate` when ready, or trigger the workflow '
      + 'from the Actions tab (Supabase migrations → Run workflow).',
    );
    return;
  }

  const push = await run('npx', [
    '--yes', 'supabase@latest', 'db', 'push', '--db-url', resolved.url, '--include-all',
  ], { label: 'Applying pending migrations' });

  if (push.code !== 0) {
    safeError('\nMigration failed. The secret is stored, so CI can retry once the cause is fixed.');
    process.exit(1);
  }
  safeLog('\nDone — the database is up to date and future migrations are automatic.');
}

main().catch((err) => {
  safeError('\nUnexpected failure:', err?.message ?? String(err));
  process.exit(1);
});
