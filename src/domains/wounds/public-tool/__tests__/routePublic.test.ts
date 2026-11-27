/**
 * /wound-tool is public: it starts without the EMR (no sign-in, session
 * restore, sync or demo data), sits outside the login guard and layout, and
 * is served and cached like every other page.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isPublicWoundToolPath, parseHash, viewHash, WOUND_TOOL_PATH, type ToolView } from '../route';
import { DATA_NOTICE, PRIVACY_NOTICE, STAFF_SIGN_IN_URL, TOOL_TITLE } from '../WoundToolApp';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('the route', () => {
  it('matches /wound-tool and below, nothing else', () => {
    expect(WOUND_TOOL_PATH).toBe('/wound-tool');
    for (const p of ['/wound-tool', '/wound-tool/', '/Wound-Tool', '/wound-tool/anything']) {
      expect(isPublicWoundToolPath(p), p).toBe(true);
    }
    for (const p of ['/', '/wound-monitor', '/wound-tools', '/login', '/patients/wound-tool', '']) {
      expect(isPublicWoundToolPath(p), p).toBe(false);
    }
  });

  it('round-trips its screens through the hash', () => {
    const views: ToolView[] = [
      { name: 'list' }, { name: 'new' }, { name: 'data' },
      { name: 'wound', id: 'a-b' }, { name: 'edit', id: 'x' }, { name: 'assess', id: 'y z' },
    ];
    for (const v of views) expect(parseHash(viewHash(v))).toEqual(v);
    expect(parseHash('')).toEqual({ name: 'list' });
    expect(parseHash('#/nonsense')).toEqual({ name: 'list' });
  });
});

describe('start-up', () => {
  const main = read('src/main.tsx');

  it('main.tsx decides before loading the EMR, and imports nothing of it statically', () => {
    const staticImports = [...main.matchAll(/^import\s.*?from\s+['"]([^'"]+)['"]/gm)].map(m => m[1]);
    expect(staticImports).toEqual(['./domains/wounds/public-tool/route']);
    expect(main).toMatch(/if \(isPublicWoundToolPath\(window\.location\.pathname\)\) \{\s*void import\('\.\/domains\/wounds\/public-tool\/boot'\);\s*\} else \{\s*void import\('\.\/bootEmr'\);/);
  });

  it('the route module itself imports nothing', () => {
    expect(read('src/domains/wounds/public-tool/route.ts')).not.toMatch(/^import\s/m);
  });

  it('the EMR start-up is unchanged and still owns auth, sync and demo data', () => {
    const emr = read('src/bootEmr.tsx');
    expect(emr).toMatch(/<AuthProvider>/);
    expect(emr).toMatch(/initCloudSync\(\)/);
    expect(emr).toMatch(/initializeDemoData\(\)/);
  });

  it('the tool start-up has none of them', () => {
    const boot = read('src/domains/wounds/public-tool/boot.tsx');
    const code = boot.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/AuthProvider|initCloudSync|fullSync|initializeDemoData|initVoiceAlarm|startTreatmentReminderService|startNotificationServices/);
    expect(code).not.toMatch(/BrowserRouter/);
  });
});

describe('App.tsx', () => {
  const app = read('src/App.tsx');

  it('has a /wound-tool route outside the login guard and the main layout', () => {
    const route = app.indexOf('<Route path="/wound-tool/*"');
    const guard = app.indexOf('<Route element={isAuthenticated ? <AgreementGuard><MainLayout />');
    expect(route).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(0);
    // Top-level, beside the other public routes, before the guarded block opens.
    expect(route).toBeLessThan(guard);
    expect(route).toBeGreaterThan(app.indexOf('<Route path="/book-appointment"'));
    const line = app.slice(route, app.indexOf('\n', route));
    expect(line).not.toMatch(/isAuthenticated|MainLayout|AgreementGuard|Navigate/);
  });

  it('loads the tool lazily so it adds nothing to the EMR bundle', () => {
    expect(app).toMatch(/const PublicWoundToolApp = lazy\(\(\) => import\('\.\/domains\/wounds\/public-tool\/WoundToolApp'\)\)/);
    expect(app).not.toMatch(/^import .*public-tool/m);
  });
});

describe('served and cached like the rest of the app', () => {
  it('Vercel sends every non-API path to index.html', () => {
    const vercel = JSON.parse(read('vercel.json'));
    expect(vercel.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
  });

  it('the service worker precaches the build and answers navigations from index.html', () => {
    const sw = read('public/sw.js');
    expect(sw).toMatch(/precacheAndRoute\(self\.__WB_MANIFEST\)/);
    expect(sw).toMatch(/createHandlerBoundToURL\('\/index\.html'\)/);
  });

  it('has its own home-screen manifest that opens the tool', () => {
    const m = JSON.parse(read('public/wound-tool.webmanifest'));
    expect(m.start_url).toBe('/wound-tool');
    expect(m.scope).toBe('/wound-tool');
    expect(m.name).toBe('AstroHEALTH Wound Measure');
  });
});

describe('notices', () => {
  it('says plainly where the data is and what to type', () => {
    expect(TOOL_TITLE).toBe('AstroHEALTH Wound Measure');
    expect(DATA_NOTICE).toBe('Data stays only on this phone. Nothing is uploaded. Clearing the browser or losing the phone loses it — export a backup.');
    expect(PRIVACY_NOTICE).toMatch(/initials or a bed number, not full patient names/);
    expect(PRIVACY_NOTICE).toMatch(/photo-consent/);
    expect(STAFF_SIGN_IN_URL).toBe('/login');
  });
});
