// ---------------------------------------------------------------------------
// The server-side twin of src/utils/loginIdentity.ts: one definition of "the
// same email address" for the serverless functions and the migration script.
// A test (src/services/__tests__/authAccounts.test.ts) keeps the two in step.
// ---------------------------------------------------------------------------

/** Zero-width space/joiners, word joiner, BOM and soft hyphen. */
const INVISIBLE = /[​-‍⁠﻿­]/g;

/** An email as stored and compared: invisible characters removed, trimmed, lower case. */
export function normaliseEmail(value) {
  return String(value ?? '')
    .replace(INVISIBLE, '')
    .replace(/ /g, ' ')
    .trim()
    .toLowerCase();
}

const isActive = (a) => a?.is_active === true || a?.is_active === 1 || a?.isActive === true || a?.isActive === 1;
const updatedAt = (a) => {
  const t = new Date(a?.updated_at ?? a?.updatedAt ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** pickSignInAccount for snake_case rows: the active one, most recently updated. */
export function pickSignInAccount(rows) {
  const active = rows.filter(isActive);
  if (active.length === 0) return undefined;
  return [...active].sort((a, b) => updatedAt(b) - updatedAt(a))[0];
}

/** Most recently updated row, active or not. */
export function mostRecent(rows) {
  return [...rows].sort((a, b) => updatedAt(b) - updatedAt(a))[0];
}

/** Escape LIKE wildcards so an ilike lookup is an exact, case-insensitive match. */
export function likeExact(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

export const isPlausibleEmail = (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
