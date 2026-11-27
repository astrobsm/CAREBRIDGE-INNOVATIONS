/**
 * The public review viewer must never load the EMR: no device database, no
 * cloud sync, no Supabase client or supabase-js, no EMR auth. Walks its
 * import graph (static and dynamic, through every shared module) from its
 * start-up and fails if any of them is reachable.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

const ROOT = process.cwd();
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

function specifiers(code: string): string[] {
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const out: string[] = [];
  for (const re of [
    /\b(?:import|export)\s[^'"`;]*?\sfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) for (const m of noComments.matchAll(re)) out.push(m[1]);
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

const graph = walk(['src/domains/review-share/viewer/boot.tsx']);
const code = (f: string) => readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('the review viewer does not reach the EMR', () => {
  it('finds the viewer modules (the walker itself works)', () => {
    for (const f of [
      'src/domains/review-share/viewer/ReviewViewerApp.tsx',
      'src/domains/review-share/viewer/SnapshotView.tsx',
      'src/domains/review-share/viewer/api.ts',
      'src/domains/review-share/route.ts',
    ]) expect(graph.files, f).toContain(f);
  });

  it.each([
    [/^src\/database\//, 'the EMR database (db.ts)'],
    [/^src\/services\/cloudSync/, 'cloud sync'],
    [/^src\/services\/supabaseClient/, 'the Supabase client'],
    [/^src\/contexts\/AuthContext/, 'the EMR auth'],
    [/^src\/services\//, 'any EMR service'],
    [/^src\/bootEmr/, 'the EMR start-up'],
    [/^src\/App\.tsx$/, 'the EMR app'],
    [/^src\/components\/layouts\//, 'the EMR layout'],
    [/^src\/domains\/review-share\/(shareService|loadPatientRecords|summaryBuilder|photoCompress)/, 'the sharing side'],
  ] as const)('never imports %s (%s)', (pattern, what) => {
    expect(graph.files.filter(f => pattern.test(f)), `${what} is reachable from the viewer`).toEqual([]);
  });

  it('uses no packages beyond React and icons — not supabase-js, not Dexie', () => {
    expect(graph.packages.filter(p => /supabase|dexie/.test(p))).toEqual([]);
    expect(graph.packages).toEqual(['lucide-react', 'react', 'react-dom/client']);
  });

  it('calls only the two anonymous RPCs, and never the REST tables or the app API', () => {
    for (const f of graph.files.filter(x => /\.tsx?$/.test(x))) {
      const c = code(f);
      expect(c, f).not.toMatch(/createClient\(|['"`]\/api\//);
      expect(c, f).not.toMatch(/rest\/v1\/(?!rpc\/)/);
    }
    const api = code('src/domains/review-share/viewer/api.ts');
    expect([...api.matchAll(/'(app_[a-z_]+)'/g)].map(m => m[1]).sort()).toEqual(['app_open_review_share', 'app_review_share_status']);
    expect(api).toMatch(/\/rest\/v1\/rpc\/\$\{fn\}/);
    expect(api).toMatch(/cache: 'no-store'/);
    expect(api).toMatch(/credentials: 'omit'/);
  });

  it('keeps the record in memory only: no storage, no IndexedDB', () => {
    for (const f of graph.files.filter(x => /\.tsx?$/.test(x))) {
      expect(code(f), f).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\.open/);
    }
  });

  it('never renders snapshot text as HTML', () => {
    for (const f of graph.files.filter(x => /\.tsx$/.test(x))) expect(code(f), f).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });
});
