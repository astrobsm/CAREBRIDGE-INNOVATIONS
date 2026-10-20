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

/** Migrations from this version on must not create policies open to everyone. */
export const OPEN_POLICY_CUTOFF = '20261019090000';

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

    // From the Supabase Auth migration on, no new policy may be open to anyone.
    // Older migrations created "Allow all access" (USING (true), or TO anon /
    // public), and copying that pattern would put a table outside the RLS
    // lockdown. A policy that really is meant for the public says so on the
    // line above it: `-- public-access: <why>`.
    if (file.slice(0, 14) >= OPEN_POLICY_CUTOFF) {
      lines.forEach((line, i) => {
        if (!/^\s*CREATE\s+POLICY\b/i.test(line)) return;
        const end = lines.findIndex((l, j) => j >= i && l.includes(';'));
        const statement = lines.slice(i, end === -1 ? undefined : end + 1).join(' ');
        const open = /\b(USING|WITH\s+CHECK)\s*\(\s*true\s*\)/i.test(statement)
          || /\bTO\s+(?:[A-Za-z_, ]*\b)?(anon|public)\b/i.test(statement);
        const declared = /--\s*public-access:/i.test(lines[i - 1] ?? '');
        if (open && !declared) {
          problems.push(`${file}:${i + 1}  ${line.trim().slice(0, 60)} — open to everyone; use public.is_app_member() (or mark it -- public-access: <why>)`);
        }
      });
    }

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
export const SCOPING_FILE = 'supabase/manual/20261020100000_hospital_scoping.sql';

/**
 * Every table a migration creates must be classified in the hospital-scoping
 * file (patient / hospital / parent / members ...). The scoping refuses to
 * apply with an unclassified table in the database, and a table created after
 * it was applied stays members-wide until it is re-applied — so the class is
 * decided when the table is written, not discovered in production.
 *
 * @returns {{ ok: boolean, problems: string[], classified: Set<string> }}
 */
export function checkScopingClassification(dir = DIR, scopingFile = SCOPING_FILE) {
  const classified = classifiedTables(readFileSync(scopingFile, 'utf8'));
  const problems = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8').replace(/--.*$/gm, '');
    for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([A-Za-z0-9_]+)"?\s*\(/gi)) {
      const name = m[1].toLowerCase();
      if (name.startsWith('family_')) continue;
      if (!classified.has(name)) {
        problems.push(`${file}  CREATE TABLE ${name} — not classified in ${scopingFile}; add it to hospital_scoping_classes`);
      }
    }
  }
  return { ok: problems.length === 0, problems, classified };
}

/** The table names in the scoping file's classification list. */
export function classifiedTables(scopingSql) {
  const list = String(scopingSql).match(/INSERT INTO app_private\.hospital_scoping_classes[^;]*?VALUES([\s\S]*?\));\s*$/m);
  if (!list) throw new Error('No hospital_scoping_classes list found in the scoping file.');
  return new Set([...list[1].matchAll(/^\s*\(\s*'([a-z0-9_]+)'\s*,/gm)].map((m) => m[1]));
}

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
  const safe = reportMigrations();
  const scoping = checkScopingClassification();
  if (!scoping.ok) {
    console.error('\nTables with no hospital-scoping class:\n');
    for (const p of scoping.problems) console.error(`  ${p}`);
  } else {
    console.log(`Every table the migrations create is classified for hospital scoping (${scoping.classified.size} classified).`);
  }
  process.exit(safe && scoping.ok ? 0 : 1);
}
