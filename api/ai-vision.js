// ---------------------------------------------------------------------------
// Serverless proxy: AI image requests, answered by Claude (Anthropic) vision.
// ---------------------------------------------------------------------------
// Keeps the Anthropic key server-side. Configure the server env var
// (NON-VITE): ANTHROPIC_API_KEY. See _lib/claude.js.
//
// Two modes:
//  1. OCR (default) — extract the text of a handwritten or printed document.
//     Body: { imageDataUrl, medicalContext? }
//  2. Structured analysis — answer a caller-supplied prompt about the image and
//     return JSON. Used by the Wound Progress Monitor's enrichment layer.
//     Body: { imageDataUrl, system, userText?, jsonMode: true }
//     or, for up to MAX_IMAGES photos in one question (the derm & rheum
//     review): { imageDataUrls: [..], system, userText, jsonMode: true }
//
// Returns: { text: string, engine: 'claude-vision' | 'claude-vision-json' }.
// In jsonMode `text` is a JSON document (the caller parses it).
// ---------------------------------------------------------------------------

import { guardSameOrigin } from './_lib/sameOrigin.js';
import { requireAppUser } from './_lib/requireUser.js';
import { askClaude, imageBlock, sendClaudeError } from './_lib/claude.js';

/** Most photos one structured request may carry. */
export const MAX_IMAGES = 3;

const MEDICAL_SYSTEM = `You are a medical document OCR specialist. Extract ALL text from this handwritten or printed medical document image.
Preserve the exact structure including:
- Patient names, IDs, dates
- Medical terminology, drug names, dosages
- Vital signs, measurements, scores
- Clinical notes and observations
Where a word cannot be read with confidence, write [illegible] rather than guessing — a misread drug name or dose is dangerous.
Return ONLY the extracted text, preserving line breaks. Do not add commentary.`;

const GENERAL_SYSTEM = `You are an OCR specialist. Extract ALL text from this handwritten or printed image exactly as written.
Preserve line breaks and structure. Write [illegible] for anything you cannot read. Return ONLY the extracted text, no commentary.`;

export default async function handler(req, res, deps = {}) {
  // Only this app's own origin may spend the server's key (see _lib/sameOrigin).
  if (guardSameOrigin(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Only a signed-in, active AstroHEALTH user may spend the server's key.
  // The origin guard above stops other web pages; this stops everyone else.
  if (!(await requireAppUser(req, res, deps.auth))) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { imageDataUrl = '', imageDataUrls, medicalContext = true, system = '', userText = '', jsonMode = false } = body;

    // Validates each data URL, the image type and Claude's 5 MB limit.
    // Several images (at most MAX_IMAGES) only in structured-analysis mode.
    if (imageDataUrls !== undefined && (!jsonMode || !Array.isArray(imageDataUrls) || imageDataUrls.length === 0 || imageDataUrls.length > MAX_IMAGES)) {
      res.status(400).json({ error: `Send 1 to ${MAX_IMAGES} images, in structured-analysis mode only.` });
      return;
    }
    const images = Array.isArray(imageDataUrls) ? imageDataUrls.map(u => imageBlock(u)) : [imageBlock(imageDataUrl)];

    const systemPrompt = jsonMode && system ? String(system) : (medicalContext ? MEDICAL_SYSTEM : GENERAL_SYSTEM);
    const instruction = jsonMode
      ? (String(userText || '') || 'Analyse this image and return the structured JSON described above.')
      : 'Extract all text from this image. Return only the raw text content.';

    const { text } = await askClaude(
      {
        system: systemPrompt,
        content: [...images, { type: 'text', text: instruction }],
        // A caller may ask for more room for a long structured answer; askClaude clamps it.
        maxTokens: jsonMode && body.max_tokens ? body.max_tokens : 8000,
        json: Boolean(jsonMode),
        // Transcription needs reading, not deliberation.
        effort: jsonMode ? 'medium' : 'low',
      },
      deps.claude,
    );
    res.status(200).json({ text, engine: jsonMode ? 'claude-vision-json' : 'claude-vision' });
  } catch (e) {
    sendClaudeError(res, e);
  }
}
