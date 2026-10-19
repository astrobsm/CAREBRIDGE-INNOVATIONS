// ---------------------------------------------------------------------------
// What may leave the device for the users table.
//
// Passwords belong to Supabase Auth and are never stored on a users row. The
// app no longer writes one, but old rows (and old devices) still carry a
// `password` field, so every users push strips it here as defence in depth —
// and the database trigger from 20261019090000_auth_accounts.sql drops any
// that still arrive.
//
// A non-administrator's device pushes only its own users row. Pushing the
// whole table from every device used to replay stale copies of other people's
// accounts over an administrator's newer change; under the locked-down RLS
// policies those writes are refused anyway.
// ---------------------------------------------------------------------------

import type { CloudSession } from './cloudSession';

/** Column names (cloud and local spelling) that must never be pushed. */
export const SECRET_USER_FIELDS = ['password', 'password_hash', 'passwordHash'] as const;

/** Remove secret columns from a record bound for `cloudTableName`. */
export function stripSecretColumns<T extends Record<string, unknown>>(cloudTableName: string, record: T): T {
  if (cloudTableName !== 'users') return record;
  let copy: Record<string, unknown> | null = null;
  for (const field of SECRET_USER_FIELDS) {
    if (field in record) {
      copy = copy ?? { ...record };
      delete copy[field];
    }
  }
  return (copy ?? record) as T;
}

/** May this session push this users row? */
export function canPushUserRow(session: CloudSession | null, record: { id?: unknown }): boolean {
  if (!session) return false;
  if (session.isAdmin) return true;
  return String(record.id ?? '') === session.appUserId;
}

/** The users rows this session may push, without secrets. */
export function prepareUserRowsForPush<T extends Record<string, unknown>>(
  session: CloudSession | null,
  rows: T[],
): T[] {
  return rows.filter(r => canPushUserRow(session, r)).map(r => stripSecretColumns('users', r));
}
