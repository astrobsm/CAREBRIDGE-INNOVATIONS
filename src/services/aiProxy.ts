// ---------------------------------------------------------------------------
// Client helper for the server-side AI proxy (/api/ai-chat, /api/ai-vision).
// Every AI feature in AstroHEALTH is answered by Claude (Anthropic); the model
// and the key live on the server (api/_lib/claude.js), never in the browser.
// Every call carries the signed-in person's Supabase access token, which the
// functions verify before spending anything (see api/_lib/requireUser.js).
// ---------------------------------------------------------------------------

import { withAuthHeaders } from './authToken';

export interface ProxyChatArgs {
  prompt: string;
  system?: string;
  /** Upper bound on the reply; the server keeps it inside its own limits. */
  maxTokens?: number;
  /** Ask for a single JSON object back (the server extracts and validates it). */
  responseFormat?: { type: 'json_object' };
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const j = await res.json();
    if (j?.error) return j.error as string;
  } catch {
    /* ignore */
  }
  return `${fallback} (${res.status})`;
}

/** Send a text request to Claude through the server proxy. Returns the text content. */
export async function proxyChat(args: ProxyChatArgs): Promise<string> {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      system: args.system ?? '',
      prompt: args.prompt,
      max_tokens: args.maxTokens,
      response_format: args.responseFormat,
    }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'AI request failed'));
  const data = await res.json();
  return (data.content || '').trim();
}

/**
 * Claude reads images at up to about 1568 px on the long edge and refuses
 * anything over 5 MB, so a phone photo is resized and re-encoded as JPEG
 * before upload. That also makes the upload far quicker on mobile data.
 * Outside a browser (tests) the data URL is returned unchanged.
 */
export const AI_IMAGE_MAX_EDGE = 1568;

export async function prepareImageForAI(dataUrl: string, maxEdge = AI_IMAGE_MAX_EDGE): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    // Already small and already JPEG: send as is.
    if (scale === 1 && /^data:image\/jpe?g;/i.test(dataUrl) && dataUrl.length < 4_000_000) return dataUrl;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.fillStyle = '#fff'; // transparent PNG regions become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return dataUrl; // the server still validates type and size
  }
}

/** Read the text in an image (handwritten or printed) with Claude vision. Returns '' if none. */
export async function proxyVision(imageDataUrl: string, medicalContext = true): Promise<string> {
  const res = await fetch('/api/ai-vision', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ imageDataUrl: await prepareImageForAI(imageDataUrl), medicalContext }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Vision request failed'));
  const data = await res.json();
  return (data.text || '').trim();
}

/**
 * Ask a structured question about an image and get parsed JSON back.
 *
 * Unlike `proxyVision` (which is OCR — "what text is in this image"), this
 * sends a caller-supplied system prompt and asks Claude for a JSON document.
 * Used by the Wound Progress Monitor to enrich an on-device measurement with a
 * qualitative wound-bed assessment.
 *
 * Throws on transport/HTTP failure or unparseable output, so callers can decide
 * whether to degrade — the wound monitor treats any failure as "no enrichment"
 * and keeps its on-device result.
 */
export async function proxyVisionJson<T = unknown>(
  imageDataUrl: string,
  system: string,
  userText?: string,
  opts: { signal?: AbortSignal } = {}
): Promise<T> {
  const res = await fetch('/api/ai-vision', {
    method: 'POST',
    headers: await withAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ imageDataUrl: await prepareImageForAI(imageDataUrl), system, userText, jsonMode: true }),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Vision analysis failed'));
  const data = await res.json();
  const raw = (data.text || '').trim();
  if (!raw) throw new Error('Vision analysis returned an empty response');
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('Vision analysis returned malformed JSON');
  }
}
