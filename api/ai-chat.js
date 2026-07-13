// ---------------------------------------------------------------------------
// Serverless proxy: LLM chat completions
// ---------------------------------------------------------------------------
// Keeps the OpenAI / Anthropic API keys server-side so they are never shipped
// to the browser. Configure server env vars (NON-VITE): OPENAI_API_KEY and,
// optionally, ANTHROPIC_API_KEY.
// ---------------------------------------------------------------------------

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const {
      provider = 'openai',
      model,
      system = '',
      prompt = '',
      temperature = 0.3,
      max_tokens = 1500,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing "prompt".' });
      return;
    }

    if (provider === 'anthropic') {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) {
        res.status(501).json({ error: 'Anthropic is not configured on the server.' });
        return;
      }
      const r = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) {
        const detail = (await r.text()).slice(0, 300);
        res.status(r.status).json({ error: `Anthropic error: ${r.status}`, detail });
        return;
      }
      const data = await r.json();
      res.status(200).json({ content: (data.content?.[0]?.text || '').trim(), provider: 'anthropic' });
      return;
    }

    // Default: OpenAI
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      res.status(501).json({ error: 'OpenAI is not configured on the server.' });
      return;
    }
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: model || 'gpt-4o', messages, temperature, max_tokens }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      res.status(r.status).json({ error: `OpenAI error: ${r.status}`, detail });
      return;
    }
    const data = await r.json();
    res.status(200).json({ content: (data.choices?.[0]?.message?.content || '').trim(), provider: 'openai' });
  } catch (e) {
    res.status(500).json({ error: 'Proxy failure', detail: String(e).slice(0, 300) });
  }
}
