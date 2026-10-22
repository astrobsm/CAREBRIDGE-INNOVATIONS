// ---------------------------------------------------------------------------
// Hospital scoping (supabase/manual/20261020100000_hospital_scoping.sql).
//
// There is no Postgres here, so the SQL is checked by reading it:
//  - every table the app syncs, and every table any SQL in the repo creates,
//    has an explicit class;
//  - the script is one idempotent transaction with its preconditions;
//  - its rollback puts back exactly what the lockdown makes;
//  - re-applying the lockdown (alone, or via db-sql) re-applies the scoping;
// plus the pure parts: the admin rules for granting hospitals, the purge of
// out-of-scope rows on a shared device, and the registration guard.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  planScopePurge, isPendingPush, recordTimestamp, EPOCH_ISO, shouldReconcile, purgeKey,
  parseAccessPolicy, registrationHospitalProblem, PURGE_RETRY_MS, keptUnsyncedMessage,
  type AccessPolicy, type CachedAccessPolicy,
} from '../scopePurge';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const SCOPING = read('supabase/manual/20261020100000_hospital_scoping.sql');
const ROLLBACK = read('supabase/manual/20261020100000_hospital_scoping_rollback.sql');
const VERIFY = read('supabase/manual/20261020100000_hospital_scoping_verify.sql');
const LOCKDOWN = read('supabase/manual/20261019100000_rls_lockdown.sql');
const LOCKDOWN_ROLLBACK = read('supabase/manual/20261019100000_rls_lockdown_rollback.sql');
const CLIENT = read('src/services/supabaseClient.ts');

const CLASSES = ['patients', 'patient', 'hospital', 'parent', 'members', 'users', 'user_hospitals', 'service_only', 'lockdown_own'];

interface Klass { table: string; cls: string; patientCol: string | null; hospitalCol: string | null; parentCol: string | null; parentTable: string | null }

const unq = (v: string) => (v === 'NULL' ? null : v.replace(/^'|'$/g, ''));

function classification(): Klass[] {
  const block = SCOPING.match(/INSERT INTO app_private\.hospital_scoping_classes[^;]*?VALUES([\s\S]*?\));\s*$/m);
  if (!block) throw new Error('classification list not found');
  return [...block[1].matchAll(/^\s*\(\s*('[a-z0-9_]+')\s*,\s*('[a-z_]+')\s*,\s*('[a-z_]+'|NULL)\s*,\s*('[a-z_]+'|NULL)\s*,\s*('[a-z_]+'|NULL)\s*,\s*('[a-z_]+'|NULL)\s*\)/gm)]
    .map((m) => ({
      table: unq(m[1])!, cls: unq(m[2])!, patientCol: unq(m[3]), hospitalCol: unq(m[4]), parentCol: unq(m[5]), parentTable: unq(m[6]),
    }));
}

function syncedTables(): string[] {
  const m = CLIENT.match(/export const TABLES\s*=\s*\{([\s\S]*?)\n\} as const;/);
  if (!m) throw new Error('TABLES not found');
  return [...m[1].matchAll(/:\s*'([a-z0-9_]+)'/g)].map((x) => x[1]);
}

/** Every table created by any SQL file in the repository, with its columns. */
function sqlTables(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (t: string, c?: string) => {
    const key = t.toLowerCase();
    if (!out.has(key)) out.set(key, new Set());
    if (c) out.get(key)!.add(c.toLowerCase());
  };
  const walk = (dir: string) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', '.combined'].includes(e.name)) continue;
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.sql')) {
        const sql = read(rel).replace(/--.*$/gm, '');
        for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi)) {
          add(m[1]);
          for (const line of m[2].split('\n')) {
            const c = line.trim().match(/^"?([a-z_][a-z0-9_]*)"?\s+[A-Za-z]/i);
            if (c && !/^(PRIMARY|UNIQUE|CONSTRAINT|FOREIGN|CHECK)$/i.test(c[1])) add(m[1], c[1]);
          }
        }
        for (const m of sql.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?([a-zA-Z0-9_]+)"?([\s\S]*?);/gi)) {
          for (const c of m[2].matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) add(m[1], c[1]);
        }
      }
    }
  };
  walk('.');
  return out;
}

const isFamily = (t: string) => t === 'family' || t.startsWith('family_');

// ── classification ─────────────────────────────────────────────────────────

describe('hospital scoping: every table has an explicit class', () => {
  const list = classification();
  const byTable = new Map(list.map((k) => [k.table, k]));

  it('parses the whole list, with no duplicates and only known classes', () => {
    expect(list.length).toBeGreaterThan(100);
    expect(new Set(list.map((k) => k.table)).size).toBe(list.length);
    expect(list.filter((k) => !CLASSES.includes(k.cls))).toEqual([]);
  });

  it('covers every table the app syncs (supabaseClient TABLES)', () => {
    expect(syncedTables().filter((t) => !byTable.has(t))).toEqual([]);
  });

  it('covers every table created by any SQL in the repository', () => {
    const created = [...sqlTables().keys()].filter((t) => !isFamily(t));
    expect(created.filter((t) => !byTable.has(t))).toEqual([]);
  });

  it('gives each class the columns it needs', () => {
    for (const k of list) {
      if (k.cls === 'patient') expect(k.patientCol, k.table).toBeTruthy();
      if (k.cls === 'hospital' || k.cls === 'patients') expect(k.hospitalCol, k.table).toBeTruthy();
      if (k.cls === 'parent') {
        expect(k.parentCol, k.table).toBeTruthy();
        expect(byTable.get(k.parentTable!)?.cls, `${k.table} -> ${k.parentTable}`).toBe('patient');
      }
    }
  });

  it('the columns named exist in the repository schema (where the table is defined)', () => {
    const cols = sqlTables();
    const missing: string[] = [];
    for (const k of list) {
      const have = cols.get(k.table);
      if (!have || have.size === 0) continue;
      for (const c of [k.patientCol, k.cls === 'users' ? null : k.hospitalCol, k.parentCol]) {
        if (c && !have.has(c)) missing.push(`${k.table}.${c}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('a table with patient_id in the schema is scoped by patient, never left members-wide by accident', () => {
    const cols = sqlTables();
    const deliberate = new Set(['chat_rooms', 'enhanced_video_conferences']); // documented: chat stays members-only
    const leaks = list
      .filter((k) => k.cls === 'members' && cols.get(k.table)?.has('patient_id') && !deliberate.has(k.table))
      .map((k) => k.table);
    expect(leaks).toEqual([]);
  });

  it('the special tables have their special classes', () => {
    expect(byTable.get('patients')?.cls).toBe('patients');
    expect(byTable.get('users')?.cls).toBe('users');
    expect(byTable.get('user_hospitals')?.cls).toBe('user_hospitals');
    expect(byTable.get('app_secrets')?.cls).toBe('service_only');
    expect(byTable.get('public_clinic_bookings')?.cls).toBe('lockdown_own');
    expect(byTable.get('hospitals')?.cls).toBe('members');
  });

  it('every visit and cross-hospital link is on a patient-scoped table', () => {
    const block = SCOPING.match(/INSERT INTO app_private\.hospital_scoping_links[^;]*?VALUES([\s\S]*?\));\s*$/m)!;
    const linked = [...block[1].matchAll(/^\s*\(\s*'([a-z0-9_]+)'\s*,\s*'(visit|cross)'/gm)].map((m) => m[1]);
    expect(linked.length).toBeGreaterThan(8);
    for (const t of linked) expect(byTable.get(t)?.cls, t).toBe('patient');
    // The encounter tables from commit c1ae8ac and the referral / MDT / tumour board features.
    for (const t of ['clinical_encounters', 'scar_cases', 'skin_graft_episodes', 'pad_assessments', 'referrals', 'mdt_meetings', 'tumour_board_cases']) {
      expect(linked, t).toContain(t);
    }
  });

  it('check-migrations refuses a migration that creates an unclassified table', async () => {
    const check: any = await import(/* @vite-ignore */ String('../../../scripts/check-migrations.mjs'));
    expect(check.checkScopingClassification('supabase/migrations').problems).toEqual([]);
    const dir = mkdtempSync(join(tmpdir(), 'scope-'));
    writeFileSync(join(dir, '20270101000000_new.sql'), 'CREATE TABLE IF NOT EXISTS public.brand_new_thing (id TEXT PRIMARY KEY, patient_id TEXT);\n');
    const result = check.checkScopingClassification(dir);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toMatch(/brand_new_thing/);
    expect(check.classifiedTables(SCOPING).has('vital_signs')).toBe(true);
  });
});

// ── the SQL ────────────────────────────────────────────────────────────────

const body = (sql: string) => sql.replace(/--.*$/gm, '');

describe('hospital scoping SQL', () => {
  const sql = body(SCOPING);

  it('is one transaction', () => {
    expect(sql.match(/^\s*BEGIN\s*;/gm)?.length).toBe(1);
    expect(sql.match(/^\s*COMMIT\s*;/gm)?.length).toBe(1);
    // Nothing but the notify and a read-only report after COMMIT.
    const after = sql.slice(sql.search(/^\s*COMMIT\s*;/m) + 8);
    expect(after).not.toMatch(/\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|TRUNCATE)\b/i);
  });

  it('checks its preconditions before changing anything', () => {
    const pre = sql.indexOf('rls_lockdown_state');
    expect(pre).toBeGreaterThan(-1);
    expect(pre).toBeLessThan(sql.indexOf('CREATE SCHEMA'));
    expect(sql).toMatch(/in_force IS TRUE[\s\S]*RAISE EXCEPTION/);
    expect(sql).toMatch(/role = 'super_admin' AND is_active IS TRUE AND auth_user_id IS NOT NULL/);
    expect(sql).toMatch(/to_regprocedure\('public\.is_app_member\(\)'\)/);
  });

  it('is idempotent: guarded creates, drops before policies and triggers', () => {
    for (const m of sql.matchAll(/^\s*CREATE\s+(TABLE|INDEX|SCHEMA)\s+(?!IF NOT EXISTS)/gim)) {
      throw new Error(`unguarded: ${m[0]}`);
    }
    for (const m of sql.matchAll(/CREATE\s+(?!OR\s+REPLACE)(FUNCTION|VIEW)/gi)) throw new Error(`not OR REPLACE: ${m[0]}`);
    for (const m of sql.matchAll(/CREATE POLICY (\w+) ON ([\w.]+)/g)) {
      expect(sql.slice(0, m.index), m[0]).toMatch(new RegExp(`DROP POLICY IF EXISTS ${m[1]} ON ${m[2].replace('.', '\\.')}`));
    }
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS hospitals_grant_creator ON public\.hospitals;\s*CREATE TRIGGER hospitals_grant_creator/);
    // Generated policies are dropped before they are created, too.
    expect(sql).toMatch(/DROP POLICY IF EXISTS app_scoped_all ON public\.%I', k\.tablename\);\s*EXECUTE format\(\s*'CREATE POLICY app_scoped_all/);
    // Indexes, generated or not.
    expect(sql).not.toMatch(/CREATE INDEX (?!IF NOT EXISTS)/);
    // The classification and links are replaced wholesale.
    expect(sql).toMatch(/TRUNCATE app_private\.hospital_scoping_classes;/);
    expect(sql).toMatch(/TRUNCATE app_private\.hospital_scoping_links;/);
  });

  it('guards tables that may not exist', () => {
    expect(sql.match(/CONTINUE WHEN to_regclass\(format\('public\.%I'/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('fails loudly on an unclassified table, naming it, before changing any policy', () => {
    const fail = sql.indexOf('these public tables are not classified');
    expect(fail).toBeGreaterThan(-1);
    expect(fail).toBeLessThan(sql.indexOf('CREATE POLICY app_scoped_all'));
    expect(sql).toMatch(/c\.relname NOT LIKE 'family\\_%'/);
  });

  it('helpers are SECURITY DEFINER, STABLE and pin search_path', () => {
    for (const fn of ['app_user_hospital_ids', 'app_can_access_hospital', 'app_can_see_user', 'app_can_access_patient', 'app_can_write_patient', 'app_can_access_via_parent', 'app_access_policy']) {
      const at = sql.indexOf(`FUNCTION public.${fn}(`);
      expect(at, fn).toBeGreaterThan(-1);
      const head = sql.slice(at, at + 400);
      expect(head, fn).toMatch(/STABLE/);
      expect(head, fn).toMatch(/SECURITY DEFINER/);
      expect(head, fn).toMatch(/SET search_path = ''/);
    }
  });

  it('includes users.hospital_id and granted hospitals, and super admins see everything', () => {
    expect(sql).toMatch(/FUNCTION public\.app_user_hospital_ids\(\)[\s\S]*?u\.hospital_id[\s\S]*?UNION[\s\S]*?public\.user_hospitals/);
    expect(sql).toMatch(/IF v_role = 'super_admin' THEN RETURN TRUE; END IF;/);
    expect(sql).toMatch(/app_is_unscoped_hospital[\s\S]*?btrim\(p_hospital\) IN \('', 'global'\)/);
  });

  it('nobody but the service role writes memberships', () => {
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.user_hospitals FROM authenticated/);
    expect(sql).not.toMatch(/CREATE POLICY \w+ ON public\.user_hospitals\s+FOR (INSERT|UPDATE|DELETE|ALL)/);
  });

  it('drops every other permissive policy on scoped tables (backed up), so none widens them', () => {
    expect(sql).toMatch(/permissive = 'PERMISSIVE'[\s\S]*?INSERT INTO app_private\.hospital_scoping_policies[\s\S]*?DROP POLICY %I ON public\.%I/);
  });

  it('stops views bypassing row security', () => {
    expect(sql).toMatch(/ALTER VIEW public\.%I SET \(security_invoker = true\)/);
  });

  it('records that scoping is on', () => {
    expect(sql).toMatch(/access_policy_state[\s\S]*hospital_scoped BOOLEAN NOT NULL/);
    expect(sql).toMatch(/INSERT INTO app_private\.access_policy_state \(id, hospital_scoped, changed_at\)\s*VALUES \(TRUE, TRUE, now\(\)\)/);
  });

  it('indexes the columns the checks use', () => {
    expect(sql).toMatch(/idx_hs_patients_registered_hospital ON public\.patients \(registered_hospital_id\)/);
    expect(sql).toMatch(/'idx_hs_' \|\| k\.tablename \|\| '_patient'/);
    expect(sql).toMatch(/'idx_hs_' \|\| k\.tablename \|\| '_hospital'/);
    expect(sql).toMatch(/'idx_hs_' \|\| l\.tablename \|\| '_visit'/);
  });

  it('ends with the count of legacy patients the rule leaves visible to all', () => {
    const after = SCOPING.slice(SCOPING.search(/^\s*COMMIT\s*;/m));
    expect(after).toMatch(/no registered hospital[\s\S]*FROM public\.patients/);
    expect(VERIFY).toMatch(/patients with no registered hospital/);
    expect(body(VERIFY).replace(/'[^']*'/g, "''")).not.toMatch(/\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|TRUNCATE)\b/i);
  });
});

describe('hospital scoping rollback: back to the members-only lockdown, exactly', () => {
  const sql = body(ROLLBACK);
  const lock = body(LOCKDOWN);

  it('is one transaction with preconditions', () => {
    expect(sql.match(/^\s*BEGIN\s*;/gm)?.length).toBe(1);
    expect(sql.match(/^\s*COMMIT\s*;/gm)?.length).toBe(1);
    expect(sql.indexOf('RAISE EXCEPTION')).toBeLessThan(sql.indexOf('DROP POLICY'));
  });

  it('recreates the very members-wide policy the lockdown creates, on the same tables', () => {
    const members = /'CREATE POLICY app_members_all ON public\.%I FOR ALL TO authenticated '\s*'USING \(public\.is_app_member\(\)\) WITH CHECK \(public\.is_app_member\(\)\)'/;
    expect(lock).toMatch(members);
    expect(sql).toMatch(members);
    for (const guard of [
      "c.relkind IN ('r', 'p')", "c.relname NOT LIKE 'family\\_%'", "c.relname <> 'public_clinic_bookings'",
      "t.name IN ('user_hospitals', 'app_secrets', 'push_notification_log', 'push_notification_queue', 'notification_logs')",
      "ELSIF t.name <> 'users' THEN",
    ]) {
      expect(lock, guard).toContain(guard);
      expect(sql, guard).toContain(guard);
    }
    expect(sql).toMatch(/DROP POLICY IF EXISTS app_scoped_all ON public\.%I/);
  });

  it('restores the lockdown users read policy word for word', () => {
    const policy = /CREATE POLICY app_users_select ON public\.users\s+FOR SELECT TO authenticated\s+USING \(public\.is_app_member\(\) OR auth_user_id = auth\.uid\(\)\);/;
    expect(lock).toMatch(policy);
    expect(sql).toMatch(policy);
  });

  it('restores dropped policies and views, removes the trigger, and switches scoping off', () => {
    expect(sql).toMatch(/FROM app_private\.hospital_scoping_policies/);
    expect(sql).toMatch(/FROM app_private\.hospital_scoping_views/);
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS hospitals_grant_creator/);
    expect(sql).toMatch(/VALUES \(TRUE, FALSE, now\(\)\)[\s\S]*hospital_scoped = FALSE/);
  });

  it('never gives members write access to memberships', () => {
    expect(sql).not.toMatch(/GRANT[^;]*(INSERT|UPDATE|DELETE)[^;]*user_hospitals/i);
  });
});

describe('re-applying the lockdown never widens scoping', () => {
  const lock = body(LOCKDOWN);

  it('the lockdown re-applies scoping in its own transaction while the flag is on', () => {
    const reapply = lock.indexOf('PERFORM app_private.apply_hospital_scoping()');
    expect(reapply).toBeGreaterThan(lock.indexOf("CREATE POLICY app_members_all"));
    expect(reapply).toBeLessThan(lock.search(/^\s*COMMIT\s*;/m));
    expect(lock).toMatch(/access_policy_state WHERE hospital_scoped IS TRUE/);
    // Missing function while on: fail, never carry on wider.
    expect(lock).toMatch(/apply_hospital_scoping\(\)'\) IS NULL THEN\s*RAISE EXCEPTION/);
  });

  it('the lockdown drops only open policies; restrictive and conditional ones keep their intent', () => {
    // Only "literally true" policies are dropped; a conditional permissive
    // PUBLIC/anon policy is moved to authenticated; RESTRICTIVE ones are not
    // selected at all (unless open, which is a no-op anyway).
    expect(lock).toMatch(/OR \(permissive = 'PERMISSIVE' AND roles && ARRAY\['public', 'anon'\]::name\[\]\)\)/);
    expect(lock).toMatch(/= 'true' THEN\s*EXECUTE format\('DROP POLICY %I ON public\.%I'[\s\S]*?ELSE\s*EXECUTE format\('ALTER POLICY %I ON public\.%I TO authenticated'/);
    // The hardening's RESTRICTIVE app_server_only policies are app_*: never touched.
    expect(lock).toMatch(/policyname NOT LIKE 'app\\_%'/);
  });

  it('server-only tables get no client policy, and scoping keeps restrictive policies', () => {
    const k = new Map(classification().map((c) => [c.table, c.cls]));
    for (const t of ['app_secrets', 'push_notification_log', 'push_notification_queue', 'notification_logs']) {
      expect(k.get(t), t).toBe('service_only');
    }
    // The client registers its own push subscriptions: not server-only.
    expect(k.get('push_subscriptions')).toBe('members');
    expect(body(SCOPING)).toMatch(/permissive = 'PERMISSIVE'\s*AND NOT \(policyname = ANY \(keep\)\)/);
  });

  it('the scoping rollback leaves views the security hardening secured', () => {
    expect(body(ROLLBACK)).toMatch(/security_hardening_backup h\s*WHERE h\.kind = 'view' AND h\.name = v\.viewname\) THEN[\s\S]*?CONTINUE;/);
  });

  it('verification lists tables wider than their pre-lockdown policies', () => {
    expect(VERIFY).toMatch(/'wider than original'/);
    expect(VERIFY).toMatch(/FROM app_private\.rls_lockdown_policies b/);
    expect(VERIFY).toMatch(/'CLIENT ACCESS'/);
  });

  it('the lockdown rollback refuses while scoping is on', () => {
    expect(body(LOCKDOWN_ROLLBACK)).toMatch(/hospital_scoped IS TRUE\) THEN\s*RAISE EXCEPTION/);
  });

  it('db-sql: guard first, then migrations, lockdown, scoping, one COMMIT', async () => {
    const dbsql: any = await import(/* @vite-ignore */ String('../../../scripts/db-sql.mjs'));
    const out: string = dbsql.buildCombinedSql({
      migrations: [{ file: '20260101000000_a.sql', sql: 'CREATE TABLE IF NOT EXISTS a (id TEXT);' }],
      lockdown: LOCKDOWN,
      scoping: SCOPING,
      generatedAt: new Date('2026-10-20T00:00:00Z'),
    });
    const at = (s: string) => out.indexOf(s);
    expect(out.match(/^BEGIN;$/gm)?.length).toBe(1);
    expect(out.match(/^\s*COMMIT\s*;\s*$/gm)?.length).toBe(1);
    expect(at('BEGIN;')).toBeLessThan(at('SET LOCAL app.hospital_scoping_follows'));
    expect(at('SET LOCAL app.hospital_scoping_follows')).toBeLessThan(at('CREATE TABLE IF NOT EXISTS a'));
    expect(at('CREATE TABLE IF NOT EXISTS a')).toBeLessThan(at('CREATE POLICY app_members_all'));
    expect(at('CREATE POLICY app_members_all')).toBeLessThan(at('SELECT app_private.apply_hospital_scoping();'));
    expect(at('SELECT app_private.apply_hospital_scoping();')).toBeLessThan(at('COMMIT;'));
    // The scoping file's post-COMMIT report is not carried inside.
    expect(out).not.toMatch(/AS registration/);
  });

  it('db-sql: a file built without the protection in force refuses to run', async () => {
    const dbsql: any = await import(/* @vite-ignore */ String('../../../scripts/db-sql.mjs'));
    const plain: string = dbsql.buildCombinedSql({ migrations: [] });
    expect(plain.indexOf('The RLS lockdown is in force on this database')).toBeLessThan(plain.indexOf('COMMIT;'));
    expect(plain).toMatch(/Hospital scoping is on but cannot be re-applied/);
    const locked: string = dbsql.buildCombinedSql({ migrations: [], lockdown: LOCKDOWN });
    expect(locked).not.toMatch(/Regenerate this file with: node scripts\/db-sql\.mjs --with-lockdown \(/);
    expect(() => dbsql.buildCombinedSql({ migrations: [], scoping: SCOPING })).toThrow();
  });

  it('rollout: the scoping step comes after the lockdown, and migrations re-apply both', async () => {
    const plan: any = await import(/* @vite-ignore */ String('../../../scripts/lib/rolloutPlan.mjs'));
    const ids = plan.STEPS.map((s: any) => s.id);
    expect(ids.indexOf('scoping')).toBe(ids.indexOf('lockdown') + 1);
    expect(plan.stepById('scoping').title).toBe('Limit staff to their own hospitals');
    expect(plan.missingPrerequisites('scoping', {})).toEqual(['lockdown']);
    expect(plan.GUARDED.scoping).toBe('SCOPE');
    expect(plan.migrationSqlFlags({})).toEqual([]);
    expect(plan.migrationSqlFlags({ lockdown: 'x' })).toEqual(['--with-lockdown']);
    expect(plan.migrationSqlFlags({ lockdown: 'x', scoping: 'y' })).toEqual(['--with-lockdown', '--with-scoping']);
    const src = read('scripts/rollout.mjs');
    expect(src).toMatch(/async scoping\(\)/);
    expect(src).toMatch(/pasteIntoSqlEditor\(SCOPING_SQL/);
    expect(src).toMatch(/pasteIntoSqlEditor\(SCOPING_ROLLBACK_SQL/);
    expect(src).toMatch(/runScript\('db-sql\.mjs', flags\)/);
  });
});

// ── granting hospitals (api/admin-users.js) ────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
let policy: any;
let handlerMod: any;
beforeAll(async () => {
  policy = await import(/* @vite-ignore */ String('../../../api/_lib/adminUsersPolicy.js'));
  handlerMod = await import(/* @vite-ignore */ String('../../../api/admin-users.js'));
});

const superAdmin = { id: 's1', role: 'super_admin', hospital_id: 'h1', is_active: true };
const hospAdmin = { id: 'a1', role: 'hospital_admin', hospital_id: 'h1', is_active: true };
const nurse = { id: 'n1', role: 'nurse', hospital_id: 'h1', is_active: true };
const visitor = { id: 'v1', role: 'surgeon', hospital_id: 'h2', is_active: true };

describe('who may grant extra hospitals', () => {
  const decide = (...a: unknown[]) => policy.decideMembershipAction(...a);

  it('non-administrators, inactive callers and unknown targets get nothing', () => {
    expect(decide(nurse, 'grant_hospital', visitor, { hospital_id: 'h1' })).toMatchObject({ allow: false, status: 403 });
    expect(decide({ ...superAdmin, is_active: false }, 'grant_hospital', visitor, { hospital_id: 'h1' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(superAdmin, 'grant_hospital', null, { hospital_id: 'h1' })).toMatchObject({ allow: false, status: 404 });
    expect(decide(superAdmin, 'grant_everything', visitor)).toMatchObject({ allow: false, status: 400 });
  });

  it('a super admin grants and revokes any hospital', () => {
    expect(decide(superAdmin, 'grant_hospital', visitor, { hospital_id: 'h9' })).toEqual({ allow: true });
    expect(decide(superAdmin, 'revoke_hospital', visitor, { hospital_id: 'h9' })).toEqual({ allow: true });
    expect(decide(superAdmin, 'list_hospitals', visitor)).toEqual({ allow: true });
  });

  it('a hospital admin grants only their own hospital, to anyone but a super admin', () => {
    expect(decide(hospAdmin, 'grant_hospital', visitor, { hospital_id: 'h1' })).toEqual({ allow: true });
    expect(decide(hospAdmin, 'revoke_hospital', visitor, { hospital_id: 'h1' })).toEqual({ allow: true });
    expect(decide(hospAdmin, 'grant_hospital', visitor, { hospital_id: 'h3' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(hospAdmin, 'revoke_hospital', visitor, { hospital_id: 'h3' })).toMatchObject({ allow: false, status: 403 });
    expect(decide(hospAdmin, 'grant_hospital', { ...superAdmin, id: 's2', hospital_id: 'h2' }, { hospital_id: 'h1' })).toMatchObject({ allow: false, status: 403 });
    expect(decide({ ...hospAdmin, hospital_id: null }, 'grant_hospital', visitor, { hospital_id: 'h1' })).toMatchObject({ allow: false, status: 403 });
  });

  it('a granted hospital cannot be passed along: only the admin\'s own users.hospital_id counts', () => {
    // hospAdmin was (say) granted h2 too; they still cannot grant h2.
    expect(decide(hospAdmin, 'grant_hospital', nurse, { hospital_id: 'h2' })).toMatchObject({ allow: false, status: 403 });
  });

  it('needs a hospital, and the user\'s own hospital is not a grant', () => {
    expect(decide(superAdmin, 'grant_hospital', visitor, {})).toMatchObject({ allow: false, status: 400 });
    expect(decide(superAdmin, 'grant_hospital', visitor, { hospital_id: 'h2' })).toMatchObject({ allow: false, status: 400 });
  });
});

function fakeAdmin() {
  const tables: Record<string, any[]> = {
    users: [
      { ...superAdmin, email: 'boss@x.ng', auth_user_id: 'auth-super', first_name: 'Boss', last_name: 'One' },
      { ...hospAdmin, email: 'admin@x.ng', auth_user_id: 'auth-admin', first_name: 'Ada', last_name: 'Admin' },
      { ...nurse, email: 'nurse@x.ng', auth_user_id: 'auth-nurse' },
      { ...visitor, email: 'visitor@y.ng', auth_user_id: 'auth-visitor', first_name: 'Vic', last_name: 'Visitor' },
    ],
    hospitals: [{ id: 'h1' }, { id: 'h2' }, { id: 'h3' }],
    user_hospitals: [],
  };
  const tokens: Record<string, string> = { 'tok-super': 'auth-super', 'tok-admin': 'auth-admin', 'tok-nurse': 'auth-nurse' };
  function query(table: string) {
    let op = 'select';
    let payload: any = null;
    const filters: ((r: any) => boolean)[] = [];
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => { filters.push((r) => String(r[c]) === String(v)); return b; },
      ilike: (c: string, v: string) => { const plain = v.replace(/\\(.)/g, '$1').toLowerCase(); filters.push((r) => String(r[c] ?? '').toLowerCase() === plain); return b; },
      limit: () => b,
      upsert: (row: any) => { op = 'upsert'; payload = row; return b; },
      delete: () => { op = 'delete'; return b; },
      then: (resolve: any) => {
        const rows = tables[table];
        if (op === 'upsert') {
          if (!rows.some((r) => r.user_id === payload.user_id && r.hospital_id === payload.hospital_id)) rows.push({ ...payload, created_at: 'now' });
          return resolve({ data: null, error: null });
        }
        if (op === 'delete') {
          tables[table] = rows.filter((r) => !filters.every((f) => f(r)));
          return resolve({ data: null, error: null });
        }
        return resolve({ data: rows.filter((r) => filters.every((f) => f(r))).map((r) => ({ ...r })), error: null });
      },
    };
    return b;
  }
  return {
    tables,
    from: (t: string) => query(t),
    auth: {
      getUser: async (token: string) => (tokens[token] ? { data: { user: { id: tokens[token] } }, error: null } : { data: { user: null }, error: { message: 'bad' } }),
      admin: {},
    },
  };
}

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined as any,
    setHeader() { /* noop */ },
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { this.body = b; return this; },
  };
}
const post = (token: string, body: unknown) => ({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body });

describe('admin-users: grant / revoke / list hospitals', () => {
  it('a hospital admin lets a visiting surgeon in by email, granted_by set by the server', async () => {
    const admin = fakeAdmin();
    const res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'grant_hospital', email: ' Visitor@Y.ng ', hospitalId: 'h1', granted_by: 'forged' }), res, { admin });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ userId: 'v1', name: 'Vic Visitor', primaryHospitalId: 'h2', hospitals: [{ hospital_id: 'h1', granted_by: 'a1' }] });
    expect(admin.tables.user_hospitals).toHaveLength(1);
  });

  it('revoke removes it; list shows what is left', async () => {
    const admin = fakeAdmin();
    admin.tables.user_hospitals.push({ user_id: 'v1', hospital_id: 'h1', granted_by: 's1' }, { user_id: 'v1', hospital_id: 'h3', granted_by: 's1' });
    let res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'revoke_hospital', userId: 'v1', hospitalId: 'h1' }), res, { admin });
    expect(res.statusCode).toBe(200);
    expect(res.body.hospitals.map((h: any) => h.hospital_id)).toEqual(['h3']);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'revoke_hospital', userId: 'v1', hospitalId: 'h3' }), res, { admin });
    expect(res.statusCode).toBe(403);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-super', { action: 'list_hospitals', userId: 'v1' }), res, { admin });
    expect(res.body.hospitals.map((h: any) => h.hospital_id)).toEqual(['h3']);
  });

  it('refuses members, unknown hospitals, and other hospitals for a hospital admin', async () => {
    const admin = fakeAdmin();
    let res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-nurse', { action: 'grant_hospital', userId: 'v1', hospitalId: 'h1' }), res, { admin });
    expect(res.statusCode).toBe(403);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-super', { action: 'grant_hospital', userId: 'v1', hospitalId: 'nowhere' }), res, { admin });
    expect(res.statusCode).toBe(404);
    res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-admin', { action: 'grant_hospital', userId: 'v1', hospitalId: 'h3' }), res, { admin });
    expect(res.statusCode).toBe(403);
    expect(admin.tables.user_hospitals).toEqual([]);
  });

  it('says plainly when the table has not been created yet', async () => {
    const admin = fakeAdmin();
    const from = admin.from;
    admin.from = (t: string) => (t === 'user_hospitals'
      ? { select: () => ({ eq: () => Promise.resolve({ data: null, error: { code: '42P01', message: 'relation "user_hospitals" does not exist' } }) }) } as any
      : from(t));
    const res = fakeRes();
    await handlerMod.handleAdminUsers(post('tok-super', { action: 'list_hospitals', userId: 'v1' }), res, { admin });
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/hospital_scoping\.sql/);
  });
});

// ── purging out-of-scope rows on a shared device ───────────────────────────

describe('out-of-scope purge', () => {
  const lastPush = '2026-10-20T10:00:00.000Z';
  const old = '2026-10-20T09:00:00.000Z';
  const newer = '2026-10-20T11:00:00.000Z';

  it('deletes only synced rows the server did not return', () => {
    const rows = [
      { id: 'mine', updatedAt: old },        // visible
      { id: 'theirs', updatedAt: old },      // invisible, synced -> purge
      { id: 'pending', updatedAt: newer },   // invisible, not uploaded -> keep
    ];
    expect(planScopePurge(rows, new Set(['mine']), lastPush)).toEqual({ purge: ['theirs'], keptUnsynced: ['pending'] });
  });

  it('never deletes the signed-in user\'s own row, or rows without an id', () => {
    const rows = [{ id: 'me', updatedAt: old }, { updatedAt: old } as any, { id: 7, updatedAt: old }];
    expect(planScopePurge(rows, new Set(), lastPush, new Set(['me']))).toEqual({ purge: ['7'], keptUnsynced: [] });
  });

  it('treats a table that was never pushed as all unsynced', () => {
    expect(planScopePurge([{ id: 'a', updatedAt: old }, { id: 'b' }] as Array<Record<string, unknown>>, new Set(), EPOCH_ISO))
      .toEqual({ purge: [], keptUnsynced: ['a', 'b'] });
  });

  it('agrees with the push engine on what is pending, and errs towards keeping', () => {
    expect(isPendingPush({ updatedAt: newer }, lastPush)).toBe(true);
    expect(isPendingPush({ updatedAt: old }, lastPush)).toBe(false);
    expect(isPendingPush({ updatedAt: new Date(newer) }, lastPush)).toBe(true);
    expect(isPendingPush({ recordedAt: newer }, lastPush)).toBe(true);
    expect(isPendingPush({}, lastPush)).toBe(false);
    expect(isPendingPush({}, EPOCH_ISO)).toBe(true);
    // A non-ISO string that sorts after the watermark as text is pending even if it parses earlier.
    expect(isPendingPush({ updatedAt: '2026-10-20 09:00:00+00' }, '2026-10-20 08:59')).toBe(true);
    expect(recordTimestamp({ timestamp: old })).toBe(old);
    expect(recordTimestamp({ updatedAt: 'not a date' })).toBeNull();
  });

  it('the push engine uses the same definition', () => {
    const src = read('src/services/cloudSyncService.ts');
    expect(src).toMatch(/import \{[\s\S]*recordTimestamp[\s\S]*\} from '\.\/scopePurge'/);
    expect(src).not.toMatch(/function recordTimestamp/);
    // The purge runs after pull and push, and leaves a table alone if its ids could not be fetched.
    expect(src).toMatch(/await pushAllToCloud\(\);\s*\/\/ Hospital scoping/);
    expect(src).toMatch(/if \(!visible\) \{ complete = false; continue; \}/);
    // Paging stops at an empty page, never a short one.
    expect(src).toMatch(/if \(!data \|\| data\.length === 0\) return ids;/);
  });

  const policy: AccessPolicy = { hospitalScoped: true, changedAt: '2026-10-20T08:00:00Z', hospitalIds: ['h2', 'h1'] };

  it('runs once per user, hospital set and switch-on of scoping; never while scoping is off', () => {
    expect(shouldReconcile('u1', { ...policy, hospitalScoped: false }, null)).toBe(false);
    expect(shouldReconcile(null, policy, null)).toBe(false);
    expect(shouldReconcile('u1', null, null)).toBe(false);
    expect(shouldReconcile('u1', policy, null)).toBe(true);
    const done = { key: purgeKey('u1', policy), at: 1000, complete: true };
    expect(purgeKey('u1', policy)).toBe(purgeKey('u1', { ...policy, hospitalIds: ['h1', 'h2'] }));
    expect(shouldReconcile('u1', policy, done, 10_000_000)).toBe(false);
    expect(shouldReconcile('u2', policy, done)).toBe(true);                                     // another user on the device
    expect(shouldReconcile('u1', { ...policy, hospitalIds: ['h1'] }, done)).toBe(true);         // a hospital removed
    expect(shouldReconcile('u1', { ...policy, changedAt: '2026-11-01' }, done)).toBe(true);    // re-applied after a rollback
    const partial = { ...done, complete: false };
    expect(shouldReconcile('u1', policy, partial, 1000 + PURGE_RETRY_MS - 1)).toBe(false);
    expect(shouldReconcile('u1', policy, partial, 1000 + PURGE_RETRY_MS)).toBe(true);
  });

  it('parses the server\'s answer', () => {
    expect(parseAccessPolicy([{ hospital_scoped: true, changed_at: 'x', hospital_ids: ['h1'] }])).toEqual({ hospitalScoped: true, changedAt: 'x', hospitalIds: ['h1'] });
    expect(parseAccessPolicy([])).toBeNull();
    expect(parseAccessPolicy(null)).toBeNull();
    expect(keptUnsyncedMessage(1)).toMatch(/^1 record on this device belongs/);
    expect(keptUnsyncedMessage(3)).toMatch(/^3 records on this device belong /);
  });
});

describe('registering a patient at a hospital you do not belong to', () => {
  const cached: CachedAccessPolicy = { userId: 'u1', fetchedAt: Date.parse('2026-10-20T10:00:00Z'), policy: { hospitalScoped: true, changedAt: null, hospitalIds: ['h1'] } };

  it('is refused with an explanation once scoping is on', () => {
    expect(registrationHospitalProblem('h2', { role: 'surgeon', cached, hospitalName: 'Other' })).toMatch(/not a member of Other/);
  });

  it('is fine at your own hospitals, for super admins, with no hospital, before scoping, or for a hospital you just added', () => {
    expect(registrationHospitalProblem('h1', { role: 'surgeon', cached })).toBeNull();
    expect(registrationHospitalProblem('h2', { role: 'super_admin', cached })).toBeNull();
    expect(registrationHospitalProblem('', { role: 'surgeon', cached })).toBeNull();
    expect(registrationHospitalProblem('h2', { role: 'surgeon', cached: null })).toBeNull();
    expect(registrationHospitalProblem('h2', { role: 'surgeon', cached: { ...cached, policy: { ...cached.policy, hospitalScoped: false } } })).toBeNull();
    expect(registrationHospitalProblem('h2', { role: 'surgeon', cached, hospitalCreatedAt: '2026-10-20T10:05:00Z' })).toBeNull();
    expect(registrationHospitalProblem('h2', { role: 'surgeon', cached, hospitalCreatedAt: '2026-10-19T10:05:00Z' })).not.toBeNull();
  });

  it('both registration forms check it before saving', () => {
    for (const page of ['src/domains/patients/pages/NewPatientPage.tsx', 'src/domains/patients/pages/SlimNewPatientPage.tsx']) {
      const src = read(page);
      expect(src, page).toMatch(/registrationScopeProblem\(data\.hospitalId, user\)/);
      expect(src.indexOf('registrationScopeProblem(data.hospitalId'), page).toBeLessThan(src.indexOf('setIsLoading(true)'));
    }
  });
});

