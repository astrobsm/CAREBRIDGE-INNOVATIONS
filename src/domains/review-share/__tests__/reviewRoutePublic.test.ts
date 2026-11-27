/**
 * /review/<token> is public: it starts without the EMR, sits outside the login
 * guard, is never cached or indexed, and the service worker never caches its
 * server calls.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { isPublicReviewPath, REVIEW_PATH, reviewTokenFromPath } from '../route';
import { createReviewApi, photoSrc, ReviewApiError } from '../viewer/api';
import SnapshotView from '../viewer/SnapshotView';
import ReviewViewerApp, { INVALID_MESSAGE, InvalidScreen, STAFF_SIGN_IN_URL } from '../viewer/ReviewViewerApp';
import { buildReviewSnapshot } from '../summaryBuilder';
import { bundle, NOW } from './fixtures';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const TOKEN = 'A'.repeat(20) + 'b_c-' + 'Z'.repeat(19);

describe('the route', () => {
  it('matches /review and below, nothing else', () => {
    expect(REVIEW_PATH).toBe('/review');
    for (const p of ['/review', `/review/${TOKEN}`, '/Review/x']) expect(isPublicReviewPath(p), p).toBe(true);
    for (const p of ['/', '/reviews', '/patients/review', '/procedure-review', '']) expect(isPublicReviewPath(p), p).toBe(false);
  });

  it('reads only a well-formed token from the path', () => {
    expect(reviewTokenFromPath(`/review/${TOKEN}`)).toBe(TOKEN);
    expect(reviewTokenFromPath(`/review/${TOKEN}/`)).toBe(TOKEN);
    for (const p of ['/review', '/review/', '/review/short', `/review/${TOKEN}/extra`, `/review/${TOKEN.slice(0, 20)}%27`]) expect(reviewTokenFromPath(p), p).toBeNull();
  });

  it('the route module imports nothing', () => {
    expect(read('src/domains/review-share/route.ts')).not.toMatch(/^import\s/m);
  });
});

describe('start-up', () => {
  it('main.tsx switches to the viewer before anything of the EMR loads', () => {
    const main = read('src/main.tsx');
    expect(main).toMatch(/\} else if \(isPublicReviewPath\(window\.location\.pathname\)\) \{\s*void import\('\.\/domains\/review-share\/viewer\/boot'\);\s*\} else \{\s*void import\('\.\/bootEmr'\);/);
  });

  it('the viewer start-up has no auth, sync, demo data or router', () => {
    const boot = read('src/domains/review-share/viewer/boot.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(boot).not.toMatch(/AuthProvider|initCloudSync|fullSync|initializeDemoData|BrowserRouter|supabase/);
    expect(boot).toMatch(/meta\('robots', 'noindex, nofollow, noarchive'\)/);
    expect(boot).toMatch(/meta\('referrer', 'no-referrer'\)/);
    expect(boot).toMatch(/querySelectorAll\('link\[rel="manifest"\]'\)\.forEach\(l => l\.remove\(\)\)/);
  });

  it('App.tsx has a lazy /review route outside the login guard and layout', () => {
    const app = read('src/App.tsx');
    const route = app.indexOf('<Route path="/review/*"');
    const guard = app.indexOf('<Route element={isAuthenticated ? <AgreementGuard><MainLayout />');
    expect(route).toBeGreaterThan(0);
    expect(route).toBeLessThan(guard);
    expect(app.slice(route, app.indexOf('\n', route))).not.toMatch(/isAuthenticated|MainLayout|AgreementGuard|Navigate/);
    expect(app).toMatch(/const PublicReviewViewerApp = lazy\(\(\) => import\('\.\/domains\/review-share\/viewer\/ReviewViewerApp'\)\)/);
    expect(app).not.toMatch(/^import .*review-share\/viewer/m);
  });
});

describe('served without caching or indexing', () => {
  const vercel = JSON.parse(read('vercel.json'));
  it('vercel.json sends no-store, noindex and no-referrer for /review/*', () => {
    const rule = vercel.headers.find((h: { source: string }) => h.source === '/review/(.*)');
    const hv = Object.fromEntries(rule.headers.map((h: { key: string; value: string }) => [h.key, h.value]));
    expect(hv['Cache-Control']).toBe('no-store');
    expect(hv['X-Robots-Tag']).toBe('noindex, nofollow');
    expect(hv['Referrer-Policy']).toBe('no-referrer');
    expect(hv['X-Frame-Options']).toBe('DENY');
    // After the catch-all rule, so its Referrer-Policy / X-Frame-Options win for these paths.
    const idx = (s: string) => vercel.headers.findIndex((h: { source: string }) => h.source === s);
    expect(idx('/review/(.*)')).toBeGreaterThan(idx('/(.*)'));
    expect(vercel.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
  });

  it('the service worker caches no Supabase or RPC response', () => {
    const sw = read('public/sw.js');
    // Every route that caches (a Workbox strategy) matches nothing on Supabase.
    const routes = sw.split('registerRoute(').slice(1).map(r => r.slice(0, 400)).filter(r => /new (CacheFirst|NetworkFirst|StaleWhileRevalidate)/.test(r));
    expect(routes.length).toBeGreaterThan(3);
    for (const r of routes) expect(r).not.toMatch(/supabase|rest\/v1|rpc/i);
    // Navigations to Supabase are not even answered from the app shell.
    expect(sw).toContain(String.raw`denylist: [/^\/api\//, /\/supabase/]`);
    // Runtime caching of API responses is limited to this site's own /api/ GETs.
    expect(sw).toMatch(/url\.pathname\.startsWith\('\/api\/'\) && request\.method === 'GET'/);
    // The one data route that is not /api/ is images (destination 'image'); the viewer's photos are data: URLs, never fetched.
    expect(read('src/domains/review-share/viewer/api.ts')).toMatch(/return `data:\$\{p\.mime\};base64,\$\{p\.data\}`/);
  });
});

describe('the RPC client', () => {
  const fetchSpy = (reply: () => Promise<Response>) => {
    const calls: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return reply(); }) as unknown as typeof fetch;
    return { f, calls };
  };

  it('POSTs to /rest/v1/rpc/<fn> with the anon key, no cookies, no cache', async () => {
    const { f, calls } = fetchSpy(async () => new Response(JSON.stringify({ needs_pin: true, expired_or_invalid: false }), { status: 200 }));
    const api = createReviewApi({ url: 'https://proj.supabase.co/', anonKey: 'anon-key', fetchImpl: f });
    expect(await api.status(TOKEN)).toEqual({ needs_pin: true, expired_or_invalid: false });
    await api.open(TOKEN, '1234');
    expect(calls[0].url).toBe('https://proj.supabase.co/rest/v1/rpc/app_review_share_status');
    expect(calls[1].url).toBe('https://proj.supabase.co/rest/v1/rpc/app_open_review_share');
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ p_token: TOKEN, p_pin: '1234' });
    const h = calls[0].init.headers as Record<string, string>;
    expect(h.apikey).toBe('anon-key');
    expect(h.Authorization).toBe('Bearer anon-key');
    expect(calls[0].init).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  });

  it('a network failure is "offline", a server error is not', async () => {
    const down = createReviewApi({ url: 'https://p', anonKey: 'k', fetchImpl: (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch });
    await expect(down.status(TOKEN)).rejects.toMatchObject({ offline: true });
    const five = createReviewApi({ url: 'https://p', anonKey: 'k', fetchImpl: (async () => new Response('x', { status: 503 })) as unknown as typeof fetch });
    await expect(five.status(TOKEN)).rejects.toBeInstanceOf(ReviewApiError);
    await expect(createReviewApi({ url: '', anonKey: '' }).status(TOKEN)).rejects.toThrow(/not connected/);
  });

  it('only raster photos become image sources', () => {
    expect(photoSrc({ mime: 'image/jpeg', data: 'QUJD' })).toBe('data:image/jpeg;base64,QUJD');
    expect(photoSrc({ mime: 'image/svg+xml', data: 'PHN2Zz4=' })).toBeNull();
    expect(photoSrc({ mime: 'text/html', data: 'QUJD' })).toBeNull();
    expect(photoSrc({ mime: 'image/png', data: 'abc"><script>' })).toBeNull();
  });
});

describe('what the viewer shows', () => {
  const { snapshot } = buildReviewSnapshot(bundle(), NOW);
  const share = { patient_name: 'Ngozi Ada Eze', shared_by: 'Dr Kene Owner', invitee_name: 'Dr Ada', created_at: NOW.toISOString(), expires_at: '2026-12-04T10:00:00Z', snapshot_at: NOW.toISOString() };

  it('the summary: confidential banner, every section, the photos, staff sign-in only', () => {
    const html = renderToStaticMarkup(createElement(SnapshotView, {
      share, snapshot: { ...snapshot, photos: { included: 1, total: 3, omitted: 2, note: '2 older photos were left out.' } },
      photos: [{ seq: 0, caption: 'Week 3', source: 'Wound assessment', mime: 'image/jpeg', data: 'QUJD' }],
    }));
    expect(html).toContain('<strong>Confidential</strong> — shared by Dr Kene Owner for clinical review · view only · link expires 4 Dec 2026');
    for (const s of snapshot.sections) expect(html).toContain(s.title.replace(/&/g, '&amp;'));
    expect(html).toContain('src="data:image/jpeg;base64,QUJD"');
    expect(html).not.toContain('loading="lazy"'); // lazy images print blank
    expect(html).toContain('2 older photos were left out.');
    expect(html).toContain('Penicillin');
    const links = [...html.matchAll(/href="([^"#][^"]*)"/g)].map(m => m[1]);
    expect(links).toEqual([STAFF_SIGN_IN_URL]);
    expect(html).not.toMatch(/<(input|textarea|select)\b/);
  });

  it('escapes whatever the record contains', () => {
    const evil = { ...snapshot, patient: { ...snapshot.patient, name: '<img src=x onerror=alert(1)>' } };
    const html = renderToStaticMarkup(createElement(SnapshotView, { share, snapshot: evil, photos: [] }));
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('one generic message for an unknown, expired or revoked link', () => {
    const html = renderToStaticMarkup(createElement(InvalidScreen));
    expect(html).toContain(INVALID_MESSAGE);
    expect(INVALID_MESSAGE).not.toMatch(/revoked|wrong|PIN/i);
  });

  it('starts on "opening" (nothing shown before the server answers)', () => {
    const api = { status: async () => ({ needs_pin: false, expired_or_invalid: true }), open: async () => ({ ok: false as const, error: 'invalid' as const }) };
    const html = renderToStaticMarkup(createElement(ReviewViewerApp, { api, pathname: `/review/${TOKEN}` }));
    expect(html).toContain('Opening the shared record');
  });
});
