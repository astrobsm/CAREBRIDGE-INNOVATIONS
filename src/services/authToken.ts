// ---------------------------------------------------------------------------
// The signed-in person's Supabase access token, for calls to this app's own
// serverless functions (/api/ai-chat, /api/ai-vision, /api/admin-users). The
// functions verify it server-side; without one they answer 401.
// ---------------------------------------------------------------------------

import { supabase } from './supabaseClient';

/** The current access token, or null when there is no live session. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** `headers` plus `Authorization: Bearer <token>` when signed in. */
export async function withAuthHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
}
