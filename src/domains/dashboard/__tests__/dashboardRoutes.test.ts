// ---------------------------------------------------------------------------
// Every literal link on the doctor / nurse dashboards, and every URL a push
// notification opens, must land on a route App.tsx declares. Several pointed
// at /clinical, /clinical/new, /clinical/vitals, /investigations/request and
// /laboratory/:id, none of which exist, so the button dropped the user on the
// Not Found page (the catch-all route) instead of doing what it said.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { scheduledEventUrl } from '../../../services/notificationUrls';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** Full path patterns of every <Route> in App.tsx, nesting resolved. */
function appRoutes(src: string): string[] {
  const out: string[] = [];
  const stack: string[] = [];
  const token = /<Route\b|<\/Route>/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(src))) {
    if (m[0] === '</Route>') { stack.pop(); continue; }
    // Find the end of this opening tag, skipping over {...} expressions.
    let depth = 0;
    let i = m.index;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    const tag = src.slice(m.index, i + 1);
    const selfClosing = src[i - 1] === '/';
    // Only the tag's own attributes, not JSX inside element={...}.
    const own = tag.replace(/\{[\s\S]*\}/g, '{}');
    const path = own.match(/\bpath="([^"]*)"/)?.[1];
    const parent = stack.filter(Boolean).join('/');
    if (path !== undefined) {
      const full = path.startsWith('/') ? path : `/${[parent, path].filter(Boolean).join('/')}`;
      out.push(full.replace(/\/+/g, '/'));
    } else if (/\bindex\b/.test(own)) {
      out.push(`/${parent}`.replace(/\/+/g, '/'));
    }
    if (!selfClosing) stack.push(path ?? '');
    token.lastIndex = i + 1;
  }
  return out;
}

const ROUTES = appRoutes(read('src/App.tsx')).filter(r => r !== '/*');

function matchesRoute(url: string): boolean {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const segs = path.split('/').filter(Boolean);
  return ROUTES.some(r => {
    const rs = r.split('/').filter(Boolean);
    return rs.length === segs.length && rs.every((s, i) => s.startsWith(':') || s === segs[i]);
  });
}

/** Literal paths in a source file: to="/x", to={`/x/${id}`}, navigate('/x'), link: '/x', url: '/x'. */
function literalPaths(src: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bto="(\/[^"]*)"/g,
    /\bto=\{\s*`(\/[^`]*)`\s*\}/g,
    /\bto=\{\s*'(\/[^']*)'\s*\}/g,
    /navigate\(\s*['"`](\/[^'"`]*)['"`]/g,
    /\blink:\s*['"`](\/[^'"`]*)['"`]/g,
    /\burl:\s*['"`](\/[^'"`]*)['"`]/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) out.push(m[1].replace(/\$\{[^}]*\}/g, 'X'));
  // Conditional links: `cond ? '/a' : '/b'` inside to={...}
  for (const m of src.matchAll(/\bto=\{[^}]*\?\s*`(\/[^`]*)`\s*:\s*'(\/[^']*)'\s*\}/g)) out.push(m[1].replace(/\$\{[^}]*\}/g, 'X'), m[2]);
  return out;
}

describe('App.tsx route parser', () => {
  it('resolves nested and index routes', () => {
    expect(ROUTES).toContain('/patients');
    expect(ROUTES).toContain('/patients/:patientId/encounter');
    expect(ROUTES).toContain('/surgery/workflow');
    expect(ROUTES).toContain('/laboratory');
    expect(matchesRoute('/clinical/new')).toBe(false);
  });
});

describe.each([
  'src/domains/dashboard/components/DoctorDashboard.tsx',
  'src/domains/dashboard/components/NurseDashboard.tsx',
  'src/services/scheduledNotificationService.ts',
])('%s links', file => {
  const paths = literalPaths(read(file));
  it('has links to check', () => expect(paths.length).toBeGreaterThan(0));
  it('every literal path matches a route in App.tsx', () => {
    expect(paths.filter(p => !matchesRoute(p))).toEqual([]);
  });
});

describe('scheduled reminder URLs', () => {
  it('open real routes for every event type', () => {
    for (const type of ['surgery', 'appointment', 'treatment_plan'] as const) {
      const url = scheduledEventUrl({ type, id: 'abc-123', patientId: 'p1' });
      expect(matchesRoute(url), `${type}: ${url}`).toBe(true);
    }
    expect(scheduledEventUrl({ type: 'surgery', id: 's1', patientId: 'p1' })).toBe('/surgery/workflow?edit=s1');
  });
});
