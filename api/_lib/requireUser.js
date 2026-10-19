// ---------------------------------------------------------------------------
// Authentication for the serverless functions.
// ---------------------------------------------------------------------------
// The caller must send `Authorization: Bearer <Supabase access token>`. The
// token is verified with Supabase Auth (auth.getUser — a server round trip,
// so a forged, expired or revoked token is refused), and the Supabase account
// must be linked to an ACTIVE row in public.users: a self-registered account
// awaiting approval, or a deactivated one, gets 403.
//
// Fails closed: if the server cannot verify (not configured, Supabase down)
// the request is refused, never waved through.
// ---------------------------------------------------------------------------

import { bearerToken, getCallerClient, getServiceClient } from './supabaseServer.js';

/**
 * Verify the caller. Returns `{ authUser, appUser }`, or null after writing
 * the error response.
 *
 * `deps.verifier` checks the token (needs `auth.getUser(token)`); `deps.lookup`
 * reads public.users (needs `from()`). Both default to real clients and are
 * injectable for tests.
 */
export async function requireAppUser(req, res, deps = {}) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in to use this feature.' });
    return null;
  }

  const env = deps.env || process.env;
  const service = deps.verifier === undefined ? getServiceClient(env) : null;
  const verifier = deps.verifier ?? service ?? getCallerClient(token, env);
  if (!verifier) {
    res.status(503).json({ error: 'Sign-in verification is not configured on the server.' });
    return null;
  }

  let authUser = null;
  try {
    const { data, error } = await verifier.auth.getUser(token);
    if (!error) authUser = data?.user ?? null;
  } catch {
    res.status(503).json({ error: 'Could not verify your sign-in. Please try again.' });
    return null;
  }
  if (!authUser) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return null;
  }

  const lookup = deps.lookup ?? service ?? getCallerClient(token, env);
  let appUser = null;
  try {
    const { data, error } = await lookup
      .from('users')
      .select('id, email, role, hospital_id, is_active, auth_user_id')
      .eq('auth_user_id', authUser.id)
      .limit(1);
    if (error) throw error;
    appUser = Array.isArray(data) ? data[0] ?? null : data ?? null;
  } catch {
    res.status(503).json({ error: 'Could not verify your account. Please try again.' });
    return null;
  }
  if (!appUser || appUser.is_active !== true) {
    res.status(403).json({ error: 'Your account is not active.' });
    return null;
  }

  return { authUser, appUser, token };
}
