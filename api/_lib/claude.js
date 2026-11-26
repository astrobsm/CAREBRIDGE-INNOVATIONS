// ---------------------------------------------------------------------------
// Claude (Anthropic) — the one AI provider behind every AstroHEALTH AI feature.
// ---------------------------------------------------------------------------
// Both serverless proxies (/api/ai-chat, /api/ai-vision) call Claude through
// this module, so the model, the budget and the error handling live in one
// place. The key stays on the server: set ANTHROPIC_API_KEY (NOT a VITE_ var)
// in the Vercel project. ANTHROPIC_MODEL optionally overrides the model.
//
// Requests stream and are collected with finalMessage(), so a long clinical
// answer cannot hit an HTTP timeout part-way. If Claude's safety classifier
// declines a request, the API retries it on a fallback model inside the same
// call (server-side fallback, "default" routing).
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = 'claude-opus-5-5';
export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** Answer budget. Thinking counts against max_tokens, so the floor is generous. */
export const MIN_COMPLETION_TOKENS = 4000;
export const DEFAULT_COMPLETION_TOKENS = 8000;
export const MAX_COMPLETION_TOKENS = 16000;

/** A caller asks for a budget; the server keeps it inside [MIN, MAX]. */
export function clampTokens(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_COMPLETION_TOKENS;
  return Math.min(Math.max(n, MIN_COMPLETION_TOKENS), MAX_COMPLETION_TOKENS);
}

export const JSON_INSTRUCTION =
  'Reply with one JSON object only: no prose before or after it, and no Markdown code fences.';

/** Error with an HTTP status the proxy can pass straight to the browser. */
export class ClaudeError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

let cachedClient = null;
function defaultClient(env) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ClaudeError(501, 'AI is not configured on the server (ANTHROPIC_API_KEY is not set).');
  }
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 55_000, maxRetries: 1 });
  return cachedClient;
}

/**
 * Pull the JSON object out of a reply. Claude is told to answer with bare JSON,
 * but a stray code fence or sentence must not break the caller's JSON.parse.
 * Returns the JSON text, or throws a 502 if there is no parseable object.
 */
export function extractJson(text) {
  const t = String(text || '').trim();
  const candidates = [t];
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(t.slice(first, last + 1));
  for (const c of candidates) {
    try {
      JSON.parse(c);
      return c;
    } catch {
      /* try the next shape */
    }
  }
  throw new ClaudeError(502, 'The AI reply was not valid JSON. Please try again.');
}

/**
 * Ask Claude. `content` is a string or an array of content blocks (text/image).
 * Returns { text, model }.
 *
 * deps.client (an Anthropic client) and deps.env are injectable for tests.
 */
export async function askClaude(
  { system = '', content, maxTokens, json = false, effort = 'medium' },
  deps = {},
) {
  const env = deps.env ?? process.env;
  const client = deps.client ?? defaultClient(env);
  const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const systemText = [system, json ? JSON_INSTRUCTION : ''].filter(Boolean).join('\n\n');

  let message;
  try {
    const stream = client.beta.messages.stream({
      model,
      max_tokens: clampTokens(maxTokens),
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort },
      ...(systemText ? { system: systemText } : {}),
      messages: [{ role: 'user', content }],
    });
    message = await stream.finalMessage();
  } catch (e) {
    if (e instanceof ClaudeError) throw e;
    if (e instanceof Anthropic.RateLimitError) {
      throw new ClaudeError(429, 'The AI service is busy. Please try again in a minute.');
    }
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new ClaudeError(502, 'The server\'s Anthropic key was refused. Check ANTHROPIC_API_KEY.');
    }
    if (e instanceof Anthropic.BadRequestError) {
      throw new ClaudeError(400, 'The AI service could not accept this request.', String(e.message).slice(0, 300));
    }
    if (e instanceof Anthropic.APIConnectionError) {
      throw new ClaudeError(504, 'Could not reach the AI service. Check the connection and try again.');
    }
    if (e instanceof Anthropic.APIError) {
      throw new ClaudeError(502, `AI service error (${e.status ?? 'unknown'}).`, String(e.message).slice(0, 300));
    }
    throw e;
  }

  if (message.stop_reason === 'refusal') {
    throw new ClaudeError(422, 'The AI declined this request. Rephrase it or complete this part manually.',
      message.stop_details?.explanation ?? undefined);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ClaudeError(502, 'The AI reply was too long and was cut off. Try a shorter request.');
  }

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return { text: json ? extractJson(text) : text, model: message.model };
}

/** Write a ClaudeError (or an unexpected error) as the proxy's JSON response. */
export function sendClaudeError(res, e) {
  if (e instanceof ClaudeError) {
    res.status(e.status).json({ error: e.message, ...(e.detail ? { detail: e.detail } : {}) });
    return;
  }
  res.status(500).json({ error: 'AI request failed on the server.', detail: String(e).slice(0, 300) });
}

/** Split a data URL into the image block Claude takes. Throws 400/413 when unusable. */
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
/** The Messages API refuses a base64 image over 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function imageBlock(dataUrl) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(String(dataUrl || ''));
  if (!m) throw new ClaudeError(400, 'Missing "imageDataUrl" (must be a base64 data URL).');
  const mediaType = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.includes(mediaType)) {
    throw new ClaudeError(415, 'Use a JPEG, PNG, GIF or WebP image.');
  }
  const data = m[2];
  if (Math.floor((data.length * 3) / 4) > MAX_IMAGE_BYTES) {
    throw new ClaudeError(413, 'Image too large (maximum 5 MB). Retake the photo at a lower resolution.');
  }
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
}
