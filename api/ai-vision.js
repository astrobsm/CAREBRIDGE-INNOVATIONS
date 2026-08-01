// ---------------------------------------------------------------------------
// Serverless proxy: Vision (OpenAI gpt-4o vision / Google Cloud Vision)
// ---------------------------------------------------------------------------
// Keeps the OpenAI / Google Vision keys server-side. Configure server env vars
// (NON-VITE): OPENAI_API_KEY and/or GOOGLE_VISION_API_KEY.
//
// Two modes:
//  1. OCR (default, unchanged) — extract text from a document image.
//     Body: { provider: 'openai' | 'google', imageDataUrl, medicalContext? }
//  2. Structured analysis — answer a caller-supplied prompt about the image and
//     return JSON. Used by the WoundProgress Monitor's Vision enrichment layer.
//     Body: { imageDataUrl, system, userText?, jsonMode: true }
//
// Returns: { text: string, engine: string }. In jsonMode `text` is a JSON
// document (the caller parses it), so the response shape never changes.
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
    const {
      provider = 'openai',
      imageDataUrl = '',
      medicalContext = true,
      system = '',
      userText = '',
      jsonMode = false,
    } = body;

    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Missing "imageDataUrl" (must be a data URL).' });
      return;
    }

    // Guard against oversized payloads before spending an upstream call.
    // base64 encodes 3 bytes per 4 chars.
    const approxBytes = Math.floor((imageDataUrl.length * 3) / 4);
    if (approxBytes > 15 * 1024 * 1024) {
      res.status(413).json({ error: 'Image too large. Maximum 15MB.' });
      return;
    }

    // Google Cloud Vision is OCR-only and cannot answer a structured prompt.
    if (jsonMode && provider === 'google') {
      res.status(400).json({ error: 'jsonMode requires the OpenAI provider.' });
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
    // jsonMode: caller supplies the system prompt and we ask for strict JSON.
    // Otherwise fall back to the original OCR behaviour.
    const systemPrompt = jsonMode && system
      ? system
      : (medicalContext ? MEDICAL_SYSTEM : GENERAL_SYSTEM);
    const instruction = jsonMode
      ? (userText || 'Analyse this image and return the structured JSON described above.')
      : 'Extract all text from this image. Return only the raw text content.';

    const payload = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: jsonMode ? 2048 : 4096,
      temperature: 0.1,
    };
    if (jsonMode) payload.response_format = { type: 'json_object' };

    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      res.status(r.status).json({ error: `GPT-4 Vision error: ${r.status}`, detail });
      return;
    }
    const data = await r.json();
    res.status(200).json({
      text: (data.choices?.[0]?.message?.content || '').trim(),
      engine: jsonMode ? 'gpt4-vision-json' : 'gpt4-vision',
    });
  } catch (e) {
    res.status(500).json({ error: 'Proxy failure', detail: String(e).slice(0, 300) });
  }
}
