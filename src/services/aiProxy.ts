// ---------------------------------------------------------------------------
// Client helper for the server-side AI proxy (/api/ai-chat, /api/ai-vision).
// Keeps API keys off the client — the serverless functions hold the secrets.
// ---------------------------------------------------------------------------

export interface ProxyChatArgs {
  prompt: string;
  system?: string;
  provider?: 'openai' | 'anthropic';
  model?: string;
  temperature?: number;
  maxTokens?: number;
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

/** Send a chat completion through the server proxy. Returns the text content. */
export async function proxyChat(args: ProxyChatArgs): Promise<string> {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: args.provider ?? 'openai',
      model: args.model,
      system: args.system ?? '',
      prompt: args.prompt,
      temperature: args.temperature ?? 0.3,
      max_tokens: args.maxTokens ?? 1500,
    }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'AI request failed'));
  const data = await res.json();
  return (data.content || '').trim();
}

/** Run vision OCR through the server proxy. Returns extracted text ('' if none). */
export async function proxyVision(
  imageDataUrl: string,
  provider: 'openai' | 'google' = 'openai',
  medicalContext = true
): Promise<string> {
  const res = await fetch('/api/ai-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, imageDataUrl, medicalContext }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Vision request failed'));
  const data = await res.json();
  return (data.text || '').trim();
}
