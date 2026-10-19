// ---------------------------------------------------------------------------
// Same-origin guard for the serverless AI proxies.
// ---------------------------------------------------------------------------
// /api/ai-chat and /api/ai-vision spend the server's OpenAI / Anthropic /
// Google keys. They used to answer every origin (vercel.json sent
// `Access-Control-Allow-Origin: *` for /api/*), so any web page anywhere could
// run its own prompts on those keys from its visitors' browsers.
//
// The app calls these endpoints from its own origin only, so only that origin
// is allowed: the deployment's own host, plus any origins listed in the
// ALLOWED_ORIGINS env var (comma separated) and localhost outside production.
// A browser request from any other origin is refused with 403 and gets no CORS
// headers.
//
// This is not authentication: a non-browser client can send any Origin it
// likes. Authentication is requireUser.js (a verified Supabase access token
// for an active user), which every function runs after this guard; this one
// closes the drive-by, in-browser abuse that the wildcard invited.
// ---------------------------------------------------------------------------

const ALLOW_METHODS = 'POST, OPTIONS';
const ALLOW_HEADERS = 'Content-Type, Authorization';

function hostOf(origin) {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Is a browser request from `origin` allowed to call this deployment? */
export function isAllowedOrigin(origin, req, env = process.env) {
  if (!origin) return true; // same-origin GET/HEAD or a non-browser client
  const host = hostOf(origin);
  if (!host) return false;

  const own = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '')
    .split(',')[0].trim().toLowerCase();
  if (own && host === own) return true;

  const listed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => hostOf(s.trim()))
    .filter(Boolean);
  if (listed.includes(host)) return true;

  const production = env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
  if (!production && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return true;

  return false;
}

/**
 * Apply the guard. Returns true when the request has been fully answered
 * (refused, or a preflight) and the handler must stop.
 */
export function guardSameOrigin(req, res, env = process.env) {
  const origin = req.headers?.origin;
  if (!isAllowedOrigin(origin, req, env)) {
    res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    return true;
  }
  if (origin) {
    // Echo the one allowed origin — never "*", never credentials.
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
