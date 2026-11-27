/**
 * The viewer's only server calls: two Postgres functions through PostgREST,
 * with plain fetch and the public anon key. No supabase-js, no session, no
 * cookies, nothing stored on the device.
 *
 * The anon role has no access to any table; these SECURITY DEFINER functions
 * are all it can reach (supabase/migrations/20261128130000_patient_review_shares.sql).
 */

import type { ReviewPhoto, ReviewSnapshot } from '../snapshotTypes';

export interface ReviewShareMeta {
  patient_name: string | null;
  shared_by: string | null;
  invitee_name: string | null;
  created_at: string;
  expires_at: string;
  snapshot_at: string | null;
}

export type StatusResult = { needs_pin: boolean; expired_or_invalid: boolean };

export type OpenResult =
  | { ok: true; share: ReviewShareMeta; snapshot: ReviewSnapshot; photos: ReviewPhoto[] }
  | { ok: false; error: 'invalid' | 'pin_required' | 'wrong_pin' | 'locked'; attempts_left?: number; locked_until?: string };

export interface ReviewApiConfig {
  url: string;
  anonKey: string;
  fetchImpl?: typeof fetch;
}

export class ReviewApiError extends Error {
  constructor(message: string, readonly offline: boolean) {
    super(message);
    this.name = 'ReviewApiError';
  }
}

export const RPC_STATUS = 'app_review_share_status';
export const RPC_OPEN = 'app_open_review_share';

export function envConfig(): ReviewApiConfig {
  return {
    url: String(import.meta.env.VITE_SUPABASE_URL || ''),
    anonKey: String(import.meta.env.VITE_SUPABASE_ANON_KEY || ''),
  };
}

export function createReviewApi(cfg: ReviewApiConfig) {
  const base = cfg.url.replace(/\/+$/, '');
  const doFetch = cfg.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  async function rpc<T>(fn: typeof RPC_STATUS | typeof RPC_OPEN, body: Record<string, unknown>): Promise<T> {
    if (!base || !cfg.anonKey) throw new ReviewApiError('This page is not connected to the AstroHEALTH server.', false);
    let res: Response;
    try {
      res = await doFetch(`${base}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
    } catch {
      throw new ReviewApiError('No connection. This page needs the internet to open — check your connection and try again.', true);
    }
    if (!res.ok) throw new ReviewApiError(`The server could not answer (${res.status}). Please try again in a moment.`, false);
    return (await res.json()) as T;
  }

  return {
    status: (token: string) => rpc<StatusResult>(RPC_STATUS, { p_token: token }),
    open: (token: string, pin: string | null) => rpc<OpenResult>(RPC_OPEN, { p_token: token, p_pin: pin }),
  };
}

export type ReviewApi = ReturnType<typeof createReviewApi>;

/** Only raster images become <img> sources (the database allows only these too). */
export const SAFE_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function photoSrc(p: Pick<ReviewPhoto, 'mime' | 'data'>): string | null {
  if (!SAFE_PHOTO_MIME.has(p.mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(p.data || '')) return null;
  return `data:${p.mime};base64,${p.data}`;
}
