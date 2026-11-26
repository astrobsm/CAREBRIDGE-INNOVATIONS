// The registration form used form-input / form-label / form-error, which no
// stylesheet defined, so it rendered as bare browser inputs. Every form-*
// class used in a className must be defined in src/index.css.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir))) {
    const p = join(dir, name);
    if (statSync(join(root, p)).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') out.push(...tsxFiles(p));
    } else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const css = readFileSync(join(root, 'src/index.css'), 'utf8');
const defined = (cls: string) => new RegExp(`\\.${cls}(?![a-z0-9-])`).test(css);

describe('form-* component classes', () => {
  const used = new Set<string>();
  for (const f of tsxFiles('src')) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|'([^']*)')/g)) {
      for (const tok of (m[1] ?? m[2] ?? m[3] ?? '').split(/\s+/)) if (/^form-[a-z0-9-]+$/.test(tok)) used.add(tok);
    }
  }

  it('finds the registration form classes', () => {
    for (const c of ['form-input', 'form-label', 'form-error']) expect(used.has(c), c).toBe(true);
  });

  it('every form-* class used is defined in index.css', () => {
    expect([...used].filter(c => !defined(c))).toEqual([]);
  });

  it('form-error is red', () => {
    expect(css).toMatch(/\.form-error\s*\{[^}]*text-red-/);
  });
});
