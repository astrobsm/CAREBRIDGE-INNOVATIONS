// ---------------------------------------------------------------------------
// Serverless proxy: Vision OCR (OpenAI gpt-4o vision / Google Cloud Vision)
// ---------------------------------------------------------------------------
// Keeps the OpenAI / Google Vision keys server-side. Configure server env vars
// (NON-VITE): OPENAI_API_KEY and/or GOOGLE_VISION_API_KEY.
// Body: { provider: 'openai' | 'google', imageDataUrl: string, medicalContext?: boolean }
// Returns: { text: string, engine: string }
// ---------------------------------------------------------------------------

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const MEDICAL_SYSTEM = `You are a medical document OCR specialist. Extract ALL text from this handwritten or printed medical document image.
Preserve the exact structure including:
- Patient names, IDs, dates
- Medical terminology, drug names, dosages
- Vital signs, measurements, scores
- Clinical notes and observations
Return ONLY the extracted text, preserving line breaks. Do not add commentary.`;

const GENERAL_SYSTEM = `You are an OCR specialist. Extract ALL text from this handwritten or printed image exactly as written.
Preserve line breaks and structure. Return ONLY the extracted text, no commentary.`;

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
    const { provider = 'openai', imageDataUrl = '', medicalContext = true } = body;

    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Missing "imageDataUrl" (must be a data URL).' });
      return;
    }

    if (provider === 'google') {
      const key = process.env.GOOGLE_VISION_API_KEY;
      if (!key) {
        res.status(501).json({ error: 'Google Vision is not configured on the server.' });
        return;
      }
      const base64 = imageDataUrl.split(',')[1] || '';
      const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
                { type: 'TEXT_DETECTION', maxResults: 50 },
              ],
              imageContext: { languageHints: ['en'] },
            },
          ],
        }),
      });
      if (!r.ok) {
        const detail = (await r.text()).slice(0, 300);
        res.status(r.status).json({ error: `Google Vision error: ${r.status}`, detail });
        return;
      }
      const data = await r.json();
      const ann = data.responses?.[0];
      const text = ann?.fullTextAnnotation?.text || ann?.textAnnotations?.[0]?.description || '';
      res.status(200).json({ text: text.trim(), engine: 'google-vision' });
      return;
    }

    // Default: OpenAI gpt-4o vision
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      res.status(501).json({ error: 'OpenAI is not configured on the server.' });
      return;
    }
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: medicalContext ? MEDICAL_SYSTEM : GENERAL_SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all text from this image. Return only the raw text content.' },
              { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      res.status(r.status).json({ error: `GPT-4 Vision error: ${r.status}`, detail });
      return;
    }
    const data = await r.json();
    res.status(200).json({ text: (data.choices?.[0]?.message?.content || '').trim(), engine: 'gpt4-vision' });
  } catch (e) {
    res.status(500).json({ error: 'Proxy failure', detail: String(e).slice(0, 300) });
  }
}
