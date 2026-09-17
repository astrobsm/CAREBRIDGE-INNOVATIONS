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
 *   1. Checks the gh CLI is present and authenticated.
 *   2. Asks for the database password, with echo off.
 *   3. Proves the credential works before storing it — storing an untested
 *      secret just moves the failure into CI, where it is slower to diagnose.
 *   4. Stores it as the SUPABASE_DB_URL repository secret.
 *   5. Offers to apply the currently pending migrations straight away.
 *
 * The password is held in memory, passed to gh over stdin rather than as an
 * argument (arguments are visible to other processes in the process table), and
 * never written to disk or echoed. GitHub encrypts it on receipt and it cannot
 * be read back afterwards, only overwritten.
 */

import { spawn } from 'node:child_process';
import {
  resolveDbUrl, redact, safeLog, safeError, describeUrl, confirm, runSupabase,
} from './lib/dbConnection.mjs';

/**
 * Run the gh CLI.
 *
 * No shell: gh ships as a real executable on every platform it supports, so it
 * spawns directly and each argument stays its own array element. That matters
 * here more than anywhere else in these scripts — the connection URI goes to
 * `gh secret set` over stdin, and a shell in the middle would be one more place
 * for it to be logged or mangled.
 */
function runGh(argv, { input, quiet, label } = {}) {
  return new Promise((resolve) => {
    if (label) safeLog(`\n→ ${label}`);
    const child = spawn('gh', argv, {
      shell: false,
      stdio: [input !== undefined ? 'pipe' : 'inherit', 'pipe', 'pipe'],
    });

    let out = '';
    const capture = (chunk) => {
      const text = redact(chunk.toString());
      out += text;
      if (!quiet) process.stdout.write(text);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);

    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('error', (err) => resolve({
      code: 1, out: redact(err.message), spawnFailed: true,
    }));
    child.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

const runCli = (args, label) => {
  safeLog(`\n→ ${label}`);
  return runSupabase(args, { onOutput: (text) => process.stdout.write(text) });
};

async function main() {
  safeLog('Automatic migrations — setup\n' + '─'.repeat(52));

  // ── gh must be present and authenticated ─────────────────────────────────
  const version = await runGh(['--version'], { quiet: true });
  if (version.spawnFailed || version.code !== 0) {
    safeError(
      '\nThe GitHub CLI is not installed, or is not on PATH.\n\n'
      + 'Install it from https://cli.github.com, then run this again.\n\n'
      + 'Or skip CI entirely: `npm run db:sql` writes a single file to paste into the\n'
      + 'Supabase SQL editor, and needs no credentials at all.',
    );
    process.exit(1);
  }

  const authed = await runGh(['auth', 'status'], { quiet: true });
  if (authed.code !== 0) {
    safeError(
      '\nThe GitHub CLI is installed but not signed in.\n\n'
      + 'Run `gh auth login` first — it is interactive, so it has to be you.\n'
      + 'Then run `npm run db:setup` again.',
    );
    process.exit(1);
  }
  safeLog('\nGitHub CLI is signed in.');

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
  const test = await runCli(
    ['migration', 'list', '--db-url', resolved.url],
    'Connecting',
  );

  if (test.code !== 0) {
    safeError(
      '\nThat credential did not work, so nothing was stored.\n'
      + 'Check the password under Supabase → Project Settings → Database, and that the\n'
      + 'project is not paused.',
    );
    process.exit(1);
  }
  safeLog('\nConnection confirmed.');

  // ── Store it ─────────────────────────────────────────────────────────────
  const set = await runGh(['secret', 'set', 'SUPABASE_DB_URL'], {
    label: 'Storing the SUPABASE_DB_URL repository secret',
    input: resolved.url,
  });

  if (set.code !== 0) {
    safeError(
      '\nCould not store the secret. You may not have admin rights on the repository.\n'
      + 'Ask an admin to add SUPABASE_DB_URL, or add it yourself at:\n'
      + '  Settings → Secrets and variables → Actions → New repository secret\n'
      + '  The value is printed by `npm run db:url`.',
    );
    process.exit(1);
  }

  safeLog(
    '\nStored. From now on, any push to main that changes supabase/migrations applies\n'
    + 'itself automatically. GitHub encrypts the secret on receipt; it cannot be read\n'
    + 'back, only replaced.',
  );

  // ── Offer to catch up now ────────────────────────────────────────────────
  const now = await confirm('\nApply the currently pending migrations now?');
  if (!now) {
    safeLog(
      '\nNothing applied. Run `npm run db:migrate` when ready, or trigger the workflow\n'
      + 'from the Actions tab (Supabase migrations → Run workflow).',
    );
    return;
  }

  const push = await runCli(
    ['db', 'push', '--db-url', resolved.url, '--include-all'],
    'Applying pending migrations',
  );

  if (push.code !== 0) {
    safeError(
      '\nMigration failed. The secret is stored, so CI can retry once the cause is fixed.\n'
      + 'Each migration runs in its own transaction, so any that did not complete left\n'
      + 'the database unchanged.',
    );
    process.exit(1);
  }

  await runCli(
    ['migration', 'list', '--db-url', resolved.url],
    'Verifying the remote migration history',
  );

  safeLog('\nDone — the database is up to date and future migrations are automatic.');
}

main().catch((err) => {
  safeError('\nUnexpected failure:', err?.message ?? String(err));
  process.exit(1);
});
