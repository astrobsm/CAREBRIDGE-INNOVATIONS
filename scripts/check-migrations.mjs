#!/usr/bin/env node
/**
 * Verify that every migration is safe to re-run.
 *
 * WHY THIS EXISTS
 * These migrations have been applied by hand through the Supabase SQL editor,
 * so the CLI's migration-history table does not know about them. The first
 * automated `supabase db push` therefore replays the whole folder. That is fine
 * — provided every statement is idempotent.
 *
 * The dangerous ones are CREATE POLICY and CREATE TRIGGER: Postgres has no
 * `CREATE POLICY IF NOT EXISTS`, so re-running an unguarded one raises
 * 42710 duplicate_object and aborts the entire push. One unguarded policy in an
 * old migration is enough to block every new migration behind it, which is
 * exactly the failure that is easy to introduce and hard to notice until the
 * day you rely on the automation.
 *
 * A statement counts as guarded when it is preceded by a DROP ... IF EXISTS for
 * the same object, or sits inside a `SELECT 1 FROM pg_policies` existence check.
 *
 * Run with `npm run db:check`. Exits non-zero on a problem, so CI can gate on it.
 * Also importable, so the migrate script can gate on it without spawning a
 * second Node process — one fewer thing to get wrong on a Windows path.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = 'supabase/migrations';

/** Either "a quoted name with spaces" or a bare identifier. */
const NAME = '(?:"([^"]+)"|([A-Za-z0-9_]+))';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Check every migration.
 *
 * Returns what it found rather than printing and exiting, so callers can decide
 * what to do about it.
 */
export function checkMigrations(dir = DIR) {
  const problems = [];
  const stats = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const lines = readFileSync(join(dir, file), 'utf8').split(/\r?\n/);
    let checked = 0;

    lines.forEach((line, i) => {
      const m = line.match(new RegExp(`^\\s*CREATE\\s+(POLICY|TRIGGER)\\s+${NAME}`, 'i'));
      if (!m) return;

      checked++;
      const kind = m[1].toUpperCase();
      const name = m[2] ?? m[3];
      const before = lines.slice(0, i).join('\n');
      const esc = escapeRe(name);

      const dropped = new RegExp(
        `DROP\\s+${kind}\\s+IF\\s+EXISTS\\s+(?:"${esc}"|${esc})(?![A-Za-z0-9_])`,
        'i',
      ).test(before);

      // The other accepted form: a DO block that checks pg_policies first.
      const inExistenceGuard = /SELECT 1 FROM pg_policies/i.test(before.slice(-1500));

      if (!dropped && !inExistenceGuard) {
        problems.push(`${file}:${i + 1}  CREATE ${kind} ${name} — no DROP ... IF EXISTS before it`);
      }
    });

    // A bare CREATE TABLE / CREATE INDEX without IF NOT EXISTS fails the same way.
    lines.forEach((line, i) => {
      if (/^\s*CREATE\s+(TABLE|INDEX|UNIQUE\s+INDEX)\s+(?!IF NOT EXISTS)/i.test(line)) {
        problems.push(`${file}:${i + 1}  ${line.trim().slice(0, 70)} — missing IF NOT EXISTS`);
      }
    });

    stats.push(`  ${file} — ${checked} policy/trigger statement${checked === 1 ? '' : 's'}`);
  }

  return { problems, stats, ok: problems.length === 0 };
}

/** Print a result. Returns true when everything is safe. */
export function reportMigrations(result = checkMigrations()) {
  if (!result.ok) {
    console.error('Migrations that are NOT safe to re-run:\n');
    for (const p of result.problems) console.error(`  ${p}`);
    console.error(
      '\nEvery migration is replayed on a fresh migration history, so each statement '
      + 'must be idempotent.\nPrecede CREATE POLICY/TRIGGER with DROP ... IF EXISTS, '
      + 'and add IF NOT EXISTS to CREATE TABLE/INDEX.',
    );
    return false;
  }
  console.log('All migrations are safe to re-run.');
  console.log(result.stats.join('\n'));
  return true;
}

// CLI entry: only when run directly, not when imported.
const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked && resolve(fileURLToPath(import.meta.url)) === invoked) {
  process.exit(reportMigrations() ? 0 : 1);
}
