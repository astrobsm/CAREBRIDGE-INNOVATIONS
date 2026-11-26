// ---------------------------------------------------------------------------
// Serverless proxy: AI text requests, answered by Claude (Anthropic).
// ---------------------------------------------------------------------------
// Keeps the Anthropic key server-side so it is never shipped to the browser.
// Configure the server env var (NON-VITE): ANTHROPIC_API_KEY. See _lib/claude.js.
//
// Body: { system?, prompt, max_tokens?, response_format?: { type: 'json_object' } }
// Returns: { content: string, provider: 'anthropic', model }
// ---------------------------------------------------------------------------

import { guardSameOrigin } from './_lib/sameOrigin.js';
import { requireAppUser } from './_lib/requireUser.js';
import { askClaude, sendClaudeError, clampTokens, MAX_COMPLETION_TOKENS } from './_lib/claude.js';

export { clampTokens, MAX_COMPLETION_TOKENS };

const MAX_PROMPT_CHARS = 200_000;

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
    const { system = '', prompt = '', max_tokens, response_format } = body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing "prompt".' });
      return;
    }
    if (prompt.length + String(system || '').length > MAX_PROMPT_CHARS) {
      res.status(413).json({ error: 'Prompt too large.' });
      return;
    }

    const { text, model } = await askClaude(
      {
        system: String(system || ''),
        content: prompt,
        maxTokens: max_tokens,
        json: response_format?.type === 'json_object',
      },
      deps.claude,
    );
    res.status(200).json({ content: text, provider: 'anthropic', model });
  } catch (e) {
    sendClaudeError(res, e);
  }
}
