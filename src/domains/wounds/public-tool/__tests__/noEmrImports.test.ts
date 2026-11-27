/**
 * The public wound tool must never load the EMR's database, auth, cloud sync,
 * Supabase client or the authenticated AI proxy. Walks the tool's import graph
 * (static and dynamic imports, followed through every shared module it
 * reuses) from its entry, and fails if any of them is reachable.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');

const ALIASES: Record<string, string> = {
  '@/': 'src/', '@components/': 'src/components/', '@domains/': 'src/domains/', '@database/': 'src/database/',
  '@services/': 'src/services/', '@hooks/': 'src/hooks/', '@utils/': 'src/utils/', '@types/': 'src/types/', '@assets/': 'src/assets/',
};

function resolveLocal(from: string, spec: string): string | null {
  let base: string | null = null;
  if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else {
    const alias = Object.keys(ALIASES).find(a => spec.startsWith(a));
    if (alias) base = join(ROOT, ALIASES[alias], spec.slice(alias.length));
  }
  if (!base) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Every module specifier in a file: import/export ... from, import(), side-effect imports. */
function specifiers(code: string): string[] {
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const out: string[] = [];
  const patterns = [
    /\b(?:import|export)\s[^'"`;]*?\sfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) for (const m of noComments.matchAll(re)) out.push(m[1]);
  return out;
}

function walk(entries: string[]) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const stack = entries.map(e => join(ROOT, e));
  while (stack.length) {
    const file = stack.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    if (!/\.(t|j)sx?$/.test(file)) continue;
    for (const spec of specifiers(readFileSync(file, 'utf8'))) {
      const local = resolveLocal(file, spec);
      if (local) stack.push(local);
      else if (!spec.startsWith('.')) packages.add(spec);
    }
  }
  return { files: [...files].map(rel).sort(), packages: [...packages].sort() };
}

const graph = walk(['src/domains/wounds/public-tool/boot.tsx']);

const FORBIDDEN_FILES: Array<[RegExp, string]> = [
  [/^src\/database\//, 'the EMR database (db.ts)'],
  [/^src\/services\/cloudSyncService/, 'cloud sync'],
  [/^src\/services\/supabaseClient/, 'the Supabase client'],
  [/^src\/services\/aiProxy/, 'the authenticated AI proxy'],
  [/^src\/services\/authToken/, 'the auth token'],
  [/^src\/contexts\/AuthContext/, 'the EMR auth'],
  [/^src\/domains\/wounds\/services\/aiWoundVision/, 'the Claude vision call'],
  [/^src\/domains\/wounds\/services\/woundMonitorService/, 'the EMR monitor service (db + sync)'],
  [/^src\/bootEmr/, 'the EMR start-up'],
  [/^src\/App\.tsx$/, 'the EMR app'],
  [/^src\/components\/layouts\//, 'the EMR layout'],
];

describe('the public wound tool does not reach the EMR', () => {
  it('finds the tool and the shared measurement code it reuses', () => {
    // Guards the walker itself: if it stopped following imports this test
    // would pass vacuously.
    for (const f of [
      'src/domains/wounds/public-tool/WoundToolApp.tsx',
      'src/domains/wounds/public-tool/toolDb.ts',
      'src/domains/wounds/public-tool/components/AssessmentForm.tsx',
      'src/domains/wounds/components/CalibratedWoundCapture.tsx',
      'src/domains/wounds/components/WoundCalibrationPicker.tsx',
      'src/domains/wounds/components/MonitorTrendChart.tsx',
      'src/domains/wounds/services/aiWoundMeasurement.ts',
      'src/domains/wounds/services/woundAnalytics.ts',
      'src/domains/wounds/services/capturedFrame.ts',
      'src/services/woundMeasurementEngine.ts',
      'src/components/clinical/WoundTracer.tsx',
      'src/utils/pdfUtils.ts',
    ]) {
      expect(graph.files, f).toContain(f);
    }
  });

  it.each(FORBIDDEN_FILES.map(([pattern, what]) => ({ pattern, what })))('never imports $what', ({ pattern, what }) => {
    const hits = graph.files.filter(f => pattern.test(f));
    expect(hits, `${what} is reachable from the wound tool`).toEqual([]);
  });

  it('never imports supabase-js', () => {
    expect(graph.packages.filter(p => p.includes('supabase'))).toEqual([]);
  });

  it('no module it loads calls the server', () => {
    for (const f of graph.files) {
      const code = readFileSync(join(ROOT, f), 'utf8');
      expect(code, f).not.toMatch(/['"`]\/api\//);
      expect(code, f).not.toMatch(/supabase\.co|createClient\(/);
    }
  });

  it('the measurement no longer reaches the AI proxy, which lives in aiWoundVision', () => {
    const ai = readFileSync(join(SRC, 'domains/wounds/services/aiWoundMeasurement.ts'), 'utf8');
    expect(ai).not.toMatch(/aiProxy|analyzeWithAI|WOUND_ANALYSIS_PROMPT/);
    const vision = readFileSync(join(SRC, 'domains/wounds/services/aiWoundVision.ts'), 'utf8');
    expect(vision).toMatch(/export async function analyzeWoundWithAI/);
    const page = readFileSync(join(SRC, 'domains/wounds/pages/WoundProgressMonitorPage.tsx'), 'utf8');
    expect(page).toMatch(/analyzeWoundWithAI\(dataUrl, wound\.patientId/);
  });

  it('uses its own IndexedDB database, not the EMR one', () => {
    const toolDb = readFileSync(join(SRC, 'domains/wounds/public-tool/toolDb.ts'), 'utf8');
    expect(toolDb).toMatch(/WOUND_TOOL_DB_NAME = 'astrohealth-wound-tool'/);
    const emrDb = readFileSync(join(SRC, 'database/db.ts'), 'utf8');
    expect(emrDb).toMatch(/super\('AstroHEALTHDB'\)/);
    expect(emrDb).not.toMatch(/astrohealth-wound-tool/);
  });
});
