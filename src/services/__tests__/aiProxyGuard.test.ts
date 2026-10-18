// ---------------------------------------------------------------------------
// The AI proxies spend the server's OpenAI / Anthropic / Google keys. They must
// answer this app's own origin only (no wildcard CORS), cap what one request
// may spend, and never be cached or queued for replay by the service worker.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

// The api/ folder is plain JS outside the TypeScript project; load it untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let guard: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chat: any;
beforeAll(async () => {
  const sameOriginPath = '../../../api/_lib/sameOrigin.js';
  const chatPath = '../../../api/ai-chat.js';
  guard = await import(/* @vite-ignore */ sameOriginPath);
  chat = await import(/* @vite-ignore */ chatPath);
});

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    setHeader(k: string, v: string) { headers[k] = v; },
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { this.body = b; this.ended = true; return this; },
    end() { this.ended = true; return this; },
  };
}

const PROD = { VERCEL_ENV: 'production' };
const req = (origin: string | undefined, method = 'POST', host = 'astrohealth.vercel.app') => ({
  method,
  headers: { host, ...(origin ? { origin } : {}) },
});

describe('same-origin guard', () => {
  it('allows the deployment\'s own origin and echoes it, never "*"', () => {
    const res = fakeRes();
    expect(guard.guardSameOrigin(req('https://astrohealth.vercel.app'), res, PROD)).toBe(false);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://astrohealth.vercel.app');
    expect(res.headers['Vary']).toBe('Origin');
    expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  it('refuses another site with 403 and no CORS headers', () => {
    const res = fakeRes();
    expect(guard.guardSameOrigin(req('https://evil.example'), res, PROD)).toBe(true);
    expect(res.statusCode).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('refuses a cross-origin preflight, answers our own with 204', () => {
    const bad = fakeRes();
    expect(guard.guardSameOrigin(req('https://evil.example', 'OPTIONS'), bad, PROD)).toBe(true);
    expect(bad.statusCode).toBe(403);
    const ok = fakeRes();
    expect(guard.guardSameOrigin(req('https://astrohealth.vercel.app', 'OPTIONS'), ok, PROD)).toBe(true);
    expect(ok.statusCode).toBe(204);
  });

  it('honours ALLOWED_ORIGINS and the proxy host header; localhost only outside production', () => {
    const r = req('https://app.unth.example');
    expect(guard.isAllowedOrigin('https://app.unth.example', r, { ...PROD, ALLOWED_ORIGINS: 'https://app.unth.example, https://x.y' })).toBe(true);
    expect(guard.isAllowedOrigin('https://preview.vercel.app', { headers: { host: 'internal', 'x-forwarded-host': 'preview.vercel.app' } }, PROD)).toBe(true);
    expect(guard.isAllowedOrigin('http://localhost:3000', r, PROD)).toBe(false);
    expect(guard.isAllowedOrigin('http://localhost:3000', r, { NODE_ENV: 'development' })).toBe(true);
    expect(guard.isAllowedOrigin('not a url', r, PROD)).toBe(false);
  });

  it('a lookalike host is not our host', () => {
    expect(guard.isAllowedOrigin('https://astrohealth.vercel.app.evil.example', req(undefined), PROD)).toBe(false);
  });
});

describe('ai-chat budget', () => {
  it('caps max_tokens and defaults nonsense', () => {
    expect(chat.clampTokens(1500)).toBe(1500);
    expect(chat.clampTokens(1_000_000)).toBe(chat.MAX_COMPLETION_TOKENS);
    expect(chat.clampTokens(-5)).toBe(1500);
    expect(chat.clampTokens('abc')).toBe(1500);
  });

  it('refuses a foreign origin before touching the upstream', async () => {
    const res = fakeRes();
    await chat.default({ ...req('https://evil.example'), body: { prompt: 'hi' } }, res);
    expect(res.statusCode).toBe(403);
  });
});

describe('deployment config', () => {
  it('vercel.json no longer opens /api to every origin', () => {
    expect(read('vercel.json')).not.toMatch(/"Access-Control-Allow-Origin",\s*"value":\s*"\*"/);
  });

  it('both proxies run the guard first', () => {
    for (const f of ['api/ai-chat.js', 'api/ai-vision.js']) {
      expect(read(f), f).toMatch(/if \(guardSameOrigin\(req, res\)\) return;/);
    }
  });

  it('the service worker never caches or queues AI requests, and drops ones older builds queued', () => {
    const sw = read('public/sw.js');
    expect(sw).toMatch(/LIVE_API_PREFIXES = \['\/api\/ai-chat', '\/api\/ai-vision'\]/);
    expect(sw).toMatch(/request\.method !== 'GET' && !isLiveApi\(url\)/);
    expect(sw).toMatch(/request\.method === 'GET' && !isLiveApi\(url\)/);
    expect(sw).toMatch(/if \(isLiveApi\(new URL\(item\.url, self\.location\.origin\)\)\)/);
  });
});
