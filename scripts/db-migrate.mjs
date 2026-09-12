#!/usr/bin/env node
/**
 * Apply pending migrations to the Supabase project.
 *
 *   npm run db:migrate           apply anything not yet recorded as applied
 *   npm run db:migrate -- --dry  show what would run, change nothing
 *   npm run db:status            list local migrations against the remote history
 *
 * Runs the same `supabase db push` that CI runs, so a local run and an
 * automated run cannot drift apart. The CLI is fetched by npx when absent, so
 * nothing has to be installed first.
 *
 * SAFETY
 * Every migration is checked for re-runnability before anything is applied —
 * see check-migrations.mjs for why that matters here specifically. All output is
 * redacted, because the CLI echoes the connection URI on a failed connect and
 * that URI carries the password.
 */

import {
  resolveDbUrl, safeLog, safeError, describeUrl, runSupabase,
} from './lib/dbConnection.mjs';
import { checkMigrations, reportMigrations } from './check-migrations.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry') || args.includes('--dry-run');
const statusOnly = args.includes('--status');

/** Run the CLI, streaming its (already redacted) output. */
function run(args, label) {
  safeLog(`\n→ ${label}`);
  return runSupabase(args, { onOutput: (text) => process.stdout.write(text) });
}

async function main() {
  safeLog('Supabase migrations\n' + '─'.repeat(52));

  // ── 1. Refuse to run migrations that are not safe to replay ──────────────
  //
  // The remote history is empty when migrations have been applied by hand, in
  // which case db push replays the whole folder. One non-idempotent statement
  // anywhere would abort the run partway through.
  safeLog('\n→ Checking migrations are safe to re-run');
  if (!reportMigrations(checkMigrations())) {
    safeError('\nNothing was applied.');
    process.exit(1);
  }

  // ── 2. Credentials ───────────────────────────────────────────────────────
  let resolved;
  try {
    resolved = await resolveDbUrl({ allowPrompt: !process.env.CI });
  } catch (err) {
    safeError(`\n${err.message}`);
    process.exit(1);
  }
  if (!resolved) {
    safeError(
      '\nNo database credential available and no terminal to ask on.\n'
      + 'Set SUPABASE_DB_URL in the environment, or run this interactively.',
    );
    process.exit(1);
  }

  safeLog(`\nConnecting as ${describeUrl(resolved.url)}`);
  safeLog(`Credential source: ${resolved.source}`);

  // ── 3. What is already applied ───────────────────────────────────────────
  const list = await run(
    ['migration', 'list', '--db-url', resolved.url],
    'Comparing local migrations against the remote history',
  );

  if (list.code !== 0) {
    safeError(
      list.spawnFailed
        ? '\nCould not start the Supabase CLI. Is Node installed and on PATH?'
        : '\nCould not reach the database.\n'
          + 'Check the password, and that the project is not paused in the Supabase dashboard.',
    );
    process.exit(1);
  }

  if (statusOnly) {
    safeLog('\nStatus only — nothing was applied.');
    return;
  }

  if (dryRun) {
    safeLog(
      '\nDry run — nothing was applied.\n'
      + 'In the table above, a row with a Local version and an empty Remote column is a '
      + 'migration that `npm run db:migrate` would apply.',
    );
    return;
  }

  // ── 4. Apply ─────────────────────────────────────────────────────────────
  const push = await run(
    ['db', 'push', '--db-url', resolved.url, '--include-all'],
    'Applying pending migrations',
  );

  if (push.code !== 0) {
    safeError(
      '\nMigration failed. Each migration runs in its own transaction, so any migration '
      + 'that did not complete left the database unchanged.',
    );
    process.exit(1);
  }

  // ── 5. Confirm the history now matches ───────────────────────────────────
  await run(
    ['migration', 'list', '--db-url', resolved.url],
    'Verifying the remote migration history',
  );

  safeLog(
    '\nDone. Every local migration is now recorded as applied.\n'
    + 'To have this happen automatically on every push to main: npm run db:setup',
  );
}

main().catch((err) => {
  safeError('\nUnexpected failure:', err?.message ?? String(err));
  process.exit(1);
});
