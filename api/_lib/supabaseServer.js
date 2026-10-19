// ---------------------------------------------------------------------------
// Server-side Supabase access for the serverless functions.
// ---------------------------------------------------------------------------
// Configure in Vercel (Project -> Settings -> Environment Variables):
//   SUPABASE_URL               the project URL (falls back to VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY  server only. NEVER prefix it with VITE_: Vite
//                              inlines every VITE_* variable into the browser
//                              bundle, and this key bypasses every RLS policy.
//
// The service-role client is only ever created here, inside a function, and
// is used only after the caller's own access token has been verified.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function supabaseUrl(env = process.env) {
  return env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
}

/** The service-role client, or null when the key is not configured. */
export function getServiceClient(env = process.env) {
  const url = supabaseUrl(env);
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, NO_SESSION);
}

/**
 * A client that acts AS the caller (anon key + their access token), so the
 * database's own RLS applies. Used to look the caller up when the service key
 * is not configured.
 */
export function getCallerClient(token, env = process.env) {
  const url = supabaseUrl(env);
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key || !token) return null;
  return createClient(url, key, {
    ...NO_SESSION,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** The bearer token from an Authorization header, or null. */
export function bearerToken(req) {
  const header = req?.headers?.authorization ?? req?.headers?.Authorization ?? '';
  const m = /^Bearer\s+(\S+)\s*$/i.exec(String(header));
  return m ? m[1] : null;
}

/** Strip anything secret from a users row before it leaves the server. */
export function publicUserRow(row) {
  if (!row || typeof row !== 'object') return row;
  const { password: _p, password_hash: _h, ...rest } = row;
  return rest;
}
