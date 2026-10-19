// ---------------------------------------------------------------------------
// Sign-in decisions, kept pure so every branch is unit-tested.
//
// Two rules matter more than the rest:
//
//  1. Only a failure to REACH Supabase may fall back to the offline verifier.
//     A wrong-password answer from the server is final — falling through to
//     the offline check would let an old (since-changed) password keep working
//     on any device that still remembers it, and would make offline sign-in a
//     way around a deactivation.
//
//  2. The app user (the public.users row) is found by the Supabase account it
//     is linked to. Only when no row is linked yet does the email decide, with
//     the same normalisation and duplicate handling the old sign-in used
//     (utils/loginIdentity), and that row is then linked.
// ---------------------------------------------------------------------------

import { normaliseEmail, pickSignInAccount } from './loginIdentity';

export type SignInErrorKind =
  | 'unreachable'          // network down, DNS, timeout, Supabase 5xx: try offline
  | 'invalid_credentials'  // the server said the password (or email) is wrong
  | 'email_not_confirmed'
  | 'inactive'             // the Supabase account is banned (deactivated)
  | 'rate_limited'
  | 'error';               // anything else: refuse, never offline

interface ErrorLike {
  name?: string;
  status?: number;
  code?: string;
  message?: string;
}

/** What a failed signInWithPassword (or a thrown error) means for the user. */
export function classifySignInError(error: unknown): SignInErrorKind {
  if (!error) return 'error';
  const e = (typeof error === 'object' ? error : { message: String(error) }) as ErrorLike;
  const message = String(e.message ?? '');

  // Credential verdicts first: a 400 with one of these codes is an answer from
  // the server, whatever else is true.
  if (e.code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return 'invalid_credentials';
  if (e.code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'email_not_confirmed';
  if (e.code === 'user_banned' || /user is banned/i.test(message)) return 'inactive';
  if (e.code === 'over_request_rate_limit' || e.status === 429) return 'rate_limited';

  // Could not get an answer at all.
  if (e.name === 'AuthRetryableFetchError') return 'unreachable';
  if (e.name === 'TypeError' && /fetch|network|load failed/i.test(message)) return 'unreachable';
  if (/failed to fetch|networkerror|network request failed|load failed|timed? ?out/i.test(message)) return 'unreachable';
  if (e.status === 0) return 'unreachable';
  if (typeof e.status === 'number' && e.status >= 500) return 'unreachable';

  return 'error';
}

/** Should this attempt use the offline verifier? */
export function shouldTryOffline(online: boolean, error?: unknown): boolean {
  if (!online) return true;
  if (error === undefined) return false;
  return classifySignInError(error) === 'unreachable';
}

/** The fields of a users row that sign-in needs, in either naming. */
export interface AppUserRow {
  id: string;
  email?: string;
  isActive?: boolean | number;
  authUserId?: string | null;
  updatedAt?: Date | string;
}

export type AppUserResolution<T> =
  | { status: 'ok'; user: T; needsLink: boolean }
  | { status: 'inactive' }
  | { status: 'none' };

/**
 * Find the app account for a Supabase user among candidate users rows.
 *
 * - A row linked to this Supabase account decides on its own: if it is
 *   deactivated the person is deactivated, even when an unlinked active row
 *   with the same email exists.
 * - Otherwise the rows with this email that are not linked to some OTHER
 *   Supabase account are considered, and the active one wins (most recently
 *   updated among several) — it must then be linked.
 */
export function resolveAppUser<T extends AppUserRow>(
  authUserId: string,
  email: string,
  rows: T[],
): AppUserResolution<T> {
  const linked = rows.filter(r => r.authUserId === authUserId);
  if (linked.length > 0) {
    const user = pickSignInAccount(linked);
    return user ? { status: 'ok', user, needsLink: false } : { status: 'inactive' };
  }

  const loginEmail = normaliseEmail(email);
  if (!loginEmail) return { status: 'none' };
  const matches = rows.filter(r => !r.authUserId && normaliseEmail(r.email) === loginEmail);
  if (matches.length === 0) return { status: 'none' };
  const user = pickSignInAccount(matches);
  return user ? { status: 'ok', user, needsLink: true } : { status: 'inactive' };
}

/** A users row from PostgREST (snake_case) in the shape resolveAppUser reads. */
export function cloudRowForResolution(row: Record<string, unknown>): AppUserRow & { row: Record<string, unknown> } {
  return {
    id: String(row.id),
    email: row.email as string | undefined,
    isActive: row.is_active as boolean | undefined,
    authUserId: (row.auth_user_id as string | null | undefined) ?? null,
    updatedAt: row.updated_at as string | undefined,
    row,
  };
}

/** The messages a person sees for each refusal. */
export type SignInFailure =
  | SignInErrorKind
  | 'no_account'
  | 'pending'
  | 'offline_unavailable'
  | 'not_configured';

export const SIGN_IN_MESSAGES: Record<Exclude<SignInFailure, 'unreachable'>, string> = {
  invalid_credentials: 'Invalid email or password',
  email_not_confirmed: 'Please confirm your email address first — check your inbox for the link.',
  inactive: 'This account is not active. Contact your administrator.',
  pending: 'Your account is awaiting approval by an administrator.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  no_account: 'No AstroHEALTH account is set up for this email. Contact your administrator.',
  offline_unavailable:
    'You are offline and this device has no saved sign-in for this account. Connect to the internet to sign in.',
  not_configured: 'Sign-in is not configured on this installation.',
  error: 'Sign-in failed. Please try again.',
};

export function signInMessage(reason: SignInFailure): string {
  if (reason === 'unreachable') return SIGN_IN_MESSAGES.offline_unavailable;
  return SIGN_IN_MESSAGES[reason];
}

/** Roles nobody may give themselves at registration. */
export const ADMIN_ROLES = ['super_admin', 'hospital_admin'] as const;
export function isAdminRole(role: unknown): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(String(role));
}
