// ---------------------------------------------------------------------------
// Every AI feature is answered by Claude through api/_lib/claude.js. These
// tests drive the helper and both proxies with a fake Anthropic client, so no
// request leaves the machine.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/* eslint-disable @typescript-eslint/no-explicit-any */
let claude: any;
let chat: any;
let vision: any;
beforeAll(async () => {
  const p = (f: string) => `../../../api/${f}`;
  claude = await import(/* @vite-ignore */ p('_lib/claude.js'));
  chat = await import(/* @vite-ignore */ p('ai-chat.js'));
  vision = await import(/* @vite-ignore */ p('ai-vision.js'));
});

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');

/** A fake Anthropic client that records the request and returns `reply`. */
function fakeClient(reply: Partial<{ text: string; stop_reason: string; stop_details: unknown; throws: unknown }>) {
  const calls: any[] = [];
  return {
    calls,
    beta: {
      messages: {
        stream(params: any) {
          calls.push(params);
          return {
            async finalMessage() {
              if (reply.throws) throw reply.throws;
              return {
                model: params.model,
                stop_reason: reply.stop_reason ?? 'end_turn',
                stop_details: reply.stop_details ?? null,
                content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: reply.text ?? '' }],
              };
            },
          };
        },
      },
    },
  };
}

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { this.body = b; return this; },
    end() { return this; },
  };
}

const ENV = { ANTHROPIC_API_KEY: 'test-key' };
const okAuth = {
  verifier: { auth: { getUser: async () => ({ data: { user: { id: 'auth-1' } }, error: null }) } },
  lookup: { from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: "u", is_active: true }], error: null }) }) }) }) },
};
const post = (body: unknown) => ({ method: 'POST', headers: { host: 'x', authorization: 'Bearer good' }, body });

describe('askClaude', () => {
  it('uses Claude Opus 5.5 with adaptive thinking, server-side fallback and a bounded budget', async () => {
    const client = fakeClient({ text: 'hello' });
    const out = await claude.askClaude({ system: 'S', content: 'Q', maxTokens: 999_999 }, { client, env: ENV });
    expect(out.text).toBe('hello');
    const p = client.calls[0];
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.thinking).toEqual({ type: 'adaptive' });
    expect(p.fallbacks).toBe('default');
    expect(p.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(p.max_tokens).toBe(claude.MAX_COMPLETION_TOKENS);
    expect(p.system).toBe('S');
    expect(p).not.toHaveProperty('temperature');
  });

  it('honours ANTHROPIC_MODEL', async () => {
    const client = fakeClient({ text: 'x' });
    await claude.askClaude({ content: 'Q' }, { client, env: { ...ENV, ANTHROPIC_MODEL: 'claude-sonnet-5-5' } });
    expect(client.calls[0].model).toBe('claude-sonnet-5-5');
  });

  it('in JSON mode asks for bare JSON and recovers it from fences or prose', async () => {
    for (const text of ['{"a":1}', '```json\n{"a":1}\n```', 'Here it is: {"a":1} — done.']) {
      const client = fakeClient({ text });
      const out = await claude.askClaude({ system: 'S', content: 'Q', json: true }, { client, env: ENV });
      expect(JSON.parse(out.text)).toEqual({ a: 1 });
      expect(client.calls[0].system).toContain(claude.JSON_INSTRUCTION);
    }
  });

  it('turns a non-JSON reply in JSON mode into a 502, not a crash in the caller', async () => {
    await expect(claude.askClaude({ content: 'Q', json: true }, { client: fakeClient({ text: 'sorry' }), env: ENV }))
      .rejects.toMatchObject({ status: 502 });
  });

  it('reports a refusal and a truncated reply instead of returning partial text', async () => {
    await expect(claude.askClaude({ content: 'Q' }, { client: fakeClient({ stop_reason: 'refusal' }), env: ENV }))
      .rejects.toMatchObject({ status: 422 });
    await expect(claude.askClaude({ content: 'Q' }, { client: fakeClient({ stop_reason: 'max_tokens', text: 'half' }), env: ENV }))
      .rejects.toMatchObject({ status: 502 });
  });

  it('says plainly when the key is not configured', async () => {
    await expect(claude.askClaude({ content: 'Q' }, { env: {} })).rejects.toMatchObject({ status: 501 });
  });
});

describe('imageBlock', () => {
  it('turns a data URL into a base64 image block', () => {
    expect(claude.imageBlock('data:image/jpg;base64,AAAA')).toEqual({
      type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' },
    });
  });

  it('refuses unsupported types, non-data URLs and images over 5 MB', () => {
    expect(() => claude.imageBlock('data:image/tiff;base64,AAAA')).toThrow(/JPEG, PNG/);
    expect(() => claude.imageBlock('https://x/y.png')).toThrow(/data URL/);
    expect(() => claude.imageBlock(`data:image/png;base64,${'A'.repeat(7_200_000)}`)).toThrow(/5 MB/);
  });
});

describe('the proxies', () => {
  it('/api/ai-chat answers with Claude and passes JSON mode through', async () => {
    const client = fakeClient({ text: '{"ok":true}' });
    const res = fakeRes();
    await chat.default(post({ prompt: 'p', system: 's', response_format: { type: 'json_object' } }), res, { auth: okAuth, claude: { client, env: ENV } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ content: '{"ok":true}', provider: 'anthropic', model: 'claude-opus-5-5' });
  });

  it('/api/ai-chat ignores a client-chosen provider or model', async () => {
    const client = fakeClient({ text: 'x' });
    await chat.default(post({ prompt: 'p', provider: 'openai', model: 'gpt-4o' }), fakeRes(), { auth: okAuth, claude: { client, env: ENV } });
    expect(client.calls[0].model).toBe('claude-opus-5-5');
  });

  it('/api/ai-vision sends the image to Claude, OCR at low effort, analysis as JSON', async () => {
    const ocr = fakeClient({ text: 'Paracetamol 1 g' });
    const res = fakeRes();
    await vision.default(post({ imageDataUrl: 'data:image/png;base64,AAAA' }), res, { auth: okAuth, claude: { client: ocr, env: ENV } });
    expect(res.body).toEqual({ text: 'Paracetamol 1 g', engine: 'claude-vision' });
    const content = ocr.calls[0].messages[0].content;
    expect(content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/png' } });
    expect(ocr.calls[0].output_config).toEqual({ effort: 'low' });
    expect(ocr.calls[0].system).toMatch(/\[illegible\]/);

    const json = fakeClient({ text: '{"tissue":"granulation"}' });
    const res2 = fakeRes();
    await vision.default(post({ imageDataUrl: 'data:image/jpeg;base64,AAAA', system: 'Wound prompt', jsonMode: true }), res2, { auth: okAuth, claude: { client: json, env: ENV } });
    expect(res2.body.engine).toBe('claude-vision-json');
    expect(json.calls[0].system).toMatch(/^Wound prompt/);
  });

  it('pass the helper\'s status and message to the browser', async () => {
    const res = fakeRes();
    await vision.default(post({ imageDataUrl: 'data:image/bmp;base64,AAAA' }), res, { auth: okAuth, claude: { client: fakeClient({}), env: ENV } });
    expect(res.statusCode).toBe(415);
    expect(res.body.error).toMatch(/JPEG/);
  });
});

describe('no other AI provider is left', () => {
  it('the proxies and the client helper mention no OpenAI or Google endpoint', () => {
    for (const f of ['api/ai-chat.js', 'api/ai-vision.js', 'api/_lib/claude.js', 'src/services/aiProxy.ts', 'src/services/ocrService.ts']) {
      expect(read(f), f).not.toMatch(/api\.openai\.com|vision\.googleapis\.com|OPENAI_API_KEY|GOOGLE_VISION_API_KEY|gpt-4/i);
    }
  });

  it('the Anthropic SDK is a declared dependency', () => {
    expect(JSON.parse(read('package.json')).dependencies['@anthropic-ai/sdk']).toBeTruthy();
  });
});
