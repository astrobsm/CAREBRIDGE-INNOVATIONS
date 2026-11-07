/**
 * Stage 2 schema: Dexie v93, the Supabase migration, hospital-scoping
 * classification and the sync mapping for every new table. Like the repo's
 * other schema tests, the sources are read (no IndexedDB or Postgres here);
 * the v93 upgrade itself is a pure function and is run directly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normaliseLegacyMust } from '../services/assessmentRecord';
import { mustTotal, plannerAssessmentToRecord } from '../types';
import { nutritionPlannerService } from '../../../services/nutritionPlannerService';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const DB = read('src/database/db.ts');
const CLIENT = read('src/services/supabaseClient.ts');
const SYNC = read('src/services/cloudSyncService.ts');
const MIGRATION = read('supabase/migrations/20261107120000_nutrition_module.sql');
const SCOPING = read('supabase/manual/20261020100000_hospital_scoping.sql');

const NEW: Record<string, string> = {
  nutritionMeasurements: 'nutrition_measurements',
  nutritionIntake: 'nutrition_intake',
  nutritionApprovals: 'nutrition_approvals',
  foods: 'nutrition_foods',
  recipes: 'nutrition_recipes',
  householdMeasures: 'nutrition_household_measures',
};
const PATIENT_TABLES = ['nutrition_measurements', 'nutrition_intake', 'nutrition_approvals'];
const REFERENCE_TABLES = ['nutrition_foods', 'nutrition_recipes', 'nutrition_household_measures'];

describe('Dexie v93', () => {
  const v93 = DB.match(/this\.version\(93\)\.stores\(\{([\s\S]*?)\}\)\.upgrade/);

  it('is the newest version and declares every new store with patientId/updatedAt indexes', () => {
    const versions = [...DB.matchAll(/this\.version\((\d+)\)/g)].map(m => Number(m[1]));
    expect(Math.max(...versions)).toBe(93);
    expect(v93).toBeTruthy();
    const stores = Object.fromEntries([...v93![1].matchAll(/^\s*(\w+):\s*'([^']+)'/gm)].map(m => [m[1], m[2].split(/,\s*/)]));
    expect(Object.keys(stores).sort()).toEqual(Object.keys(NEW).sort());
    for (const s of Object.values(stores)) { expect(s[0]).toBe('id'); expect(s).toContain('updatedAt'); }
    for (const t of ['nutritionMeasurements', 'nutritionIntake', 'nutritionApprovals']) expect(stores[t]).toContain('patientId');
    expect(stores.nutritionIntake).toContain('[patientId+date]');
    for (const t of Object.keys(NEW)) expect(DB, t).toMatch(new RegExp(`^\\s*${t}!: Table<`, 'm'));
  });

  it('leaves the existing nutrition stores as they were (their indexes are unchanged)', () => {
    expect(DB).toContain("nutritionAssessments: 'id, patientId, assessedAt'");
    expect(DB).toContain("nutritionPlans: 'id, patientId, encounterId, admissionId, planType, status, startDate, createdAt'");
    expect(v93![1]).not.toMatch(/nutritionAssessments|nutritionPlans/);
  });

  it('the upgrade moves an old MUST object out of the INTEGER mustScore', () => {
    expect(DB).toMatch(/version\(93\)[\s\S]*?tx\.table\('nutritionAssessments'\)\.toCollection\(\)\.modify\([\s\S]*?normaliseLegacyMust/);
    const old: Record<string, unknown> = { id: 'a', updatedAt: 'T', mustScore: { bmiScore: 1, weightLossScore: 2, acuteIllnessScore: 0, totalScore: 3, riskLevel: 'high' } };
    expect(normaliseLegacyMust(old)).toBe(true);
    expect(old).toEqual({ id: 'a', updatedAt: 'T', mustScore: 3, mustBreakdown: { bmiScore: 1, weightLossScore: 2, acuteIllnessScore: 0, totalScore: 3, riskLevel: 'high' } });
    // The planner's shape ('risk' rather than 'riskLevel').
    const planner: Record<string, unknown> = { mustScore: { bmiScore: 0, weightLossScore: 0, acuteIllnessScore: 2, totalScore: 2, risk: 'high' } };
    normaliseLegacyMust(planner);
    expect(planner.mustScore).toBe(2);
    expect((planner.mustBreakdown as { riskLevel: string }).riskLevel).toBe('high');
    // Already an integer: untouched.
    const ok: Record<string, unknown> = { mustScore: 1 };
    expect(normaliseLegacyMust(ok)).toBe(false);
    expect(ok).toEqual({ mustScore: 1 });
    // Unusable: kept aside, never sent to the INTEGER column.
    const odd: Record<string, unknown> = { mustScore: { foo: 1 } };
    normaliseLegacyMust(odd);
    expect(odd).toEqual({ mustScoreLegacy: { foo: 1 } });
  });

  it('mustTotal reads old and new shapes; the planner result converts to the stored record', () => {
    expect(mustTotal({ mustScore: 2 })).toBe(2);
    expect(mustTotal({ mustScore: { totalScore: 1 } })).toBe(1);
    expect(mustTotal({})).toBeNull();
    const a = nutritionPlannerService.createAssessment({ patientId: 'p', assessedBy: 'u', weight: 50, height: 170, age: 40, isMale: true,
      appetiteLevel: 'poor', currentFeedingRoute: 'oral', estimatedIntake: 50 });
    const rec = plannerAssessmentToRecord(a);
    expect(rec.mustScore).toBe(a.mustScore.totalScore);
    expect(rec.mustBreakdown?.riskLevel).toBe(a.mustScore.risk);
  });
});

describe('sync mapping for each new table', () => {
  const block = (re: RegExp) => CLIENT.match(re)![1];
  const TABLES = block(/export const TABLES\s*=\s*\{([\s\S]*?)\n\} as const;/);
  const L2C = block(/export const LOCAL_TO_CLOUD_TABLE: Record<string, string> = \{([\s\S]*?)\n\};/);
  for (const [local, cloud] of Object.entries(NEW)) {
    it(`${local} ↔ ${cloud}`, () => {
      expect(TABLES).toContain(`  ${local}: '${cloud}',`);
      expect(L2C).toContain(`  ${local}: '${cloud}',`);
      expect(SYNC).toContain(`await pullTable(TABLES.${local}, '${local}');`);
      expect(SYNC).toContain(`await pushTable('${local}', TABLES.${local});`);
      expect(MIGRATION).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${cloud} \\(`));
    });
  }
  it('approvals are pushed after the plans they sign off', () => {
    expect(SYNC.indexOf("pushTable('nutritionApprovals'")).toBeGreaterThan(SYNC.indexOf("pushTable('nutritionPlans'"));
  });
});

describe('migration 20261107120000_nutrition_module.sql', () => {
  it('is additive and idempotent: no DROP TABLE / DROP COLUMN / ALTER TYPE', () => {
    expect(MIGRATION).not.toMatch(/DROP\s+(TABLE|COLUMN)|ALTER\s+COLUMN|TRUNCATE|DELETE\s+FROM/i);
    for (const m of MIGRATION.matchAll(/^\s*ALTER TABLE[^;]*ADD COLUMN\s+(?!IF NOT EXISTS)/gim)) throw new Error(`unguarded: ${m[0]}`);
  });

  it('enables RLS on every new table and opens none of them', () => {
    for (const t of REFERENCE_TABLES) expect(MIGRATION).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
    expect(MIGRATION).toMatch(/FOREACH t IN ARRAY ARRAY\['nutrition_measurements', 'nutrition_intake', 'nutrition_approvals'\][\s\S]*?ENABLE ROW LEVEL SECURITY/);
    expect(MIGRATION).not.toMatch(/USING\s*\(\s*true\s*\)|WITH CHECK\s*\(\s*true\s*\)|TO\s+(anon|public)\b/i);
  });

  it('reference data: members read, only dietitians/admins write (restrictive, app_* so the lockdown keeps it)', () => {
    expect(MIGRATION).toMatch(/u\.role IN \('super_admin', 'hospital_admin', 'dietician', 'dietitian'\)/);
    for (const t of REFERENCE_TABLES) {
      for (const cmd of ['INSERT', 'UPDATE', 'DELETE']) {
        expect(MIGRATION).toMatch(new RegExp(`CREATE POLICY app_nutrition_ref_${cmd.toLowerCase()} ON public\\.${t} AS RESTRICTIVE FOR ${cmd} TO authenticated`));
      }
    }
  });

  it('every new table is classified for hospital scoping: patient tables by patient, reference tables members', () => {
    const list = SCOPING.match(/INSERT INTO app_private\.hospital_scoping_classes[^;]*?VALUES([\s\S]*?\));\s*$/m)![1];
    for (const t of PATIENT_TABLES) expect(list).toMatch(new RegExp(`\\('${t}',\\s+'patient',\\s+'patient_id',\\s+'hospital_id'`));
    for (const t of REFERENCE_TABLES) expect(list).toMatch(new RegExp(`\\('${t}',\\s+'members',`));
  });

  it('passes scripts/check-migrations.mjs', async () => {
    const check: any = await import(/* @vite-ignore */ String('../../../../scripts/check-migrations.mjs'));
    expect(check.checkMigrations('supabase/migrations').problems).toEqual([]);
    expect(check.checkScopingClassification('supabase/migrations').problems).toEqual([]);
  });

  it('nutrition_assessments gains the engine output and MUST breakdown columns', () => {
    for (const c of ['must_breakdown JSONB', 'must_score_legacy JSONB', 'engine JSONB', 'config_version TEXT', 'engine_method TEXT', 'validation_status TEXT']) {
      expect(MIGRATION).toContain(`ALTER TABLE public.nutrition_assessments ADD COLUMN IF NOT EXISTS ${c}`);
    }
    expect(MIGRATION).toContain('ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS version INTEGER');
  });
});
