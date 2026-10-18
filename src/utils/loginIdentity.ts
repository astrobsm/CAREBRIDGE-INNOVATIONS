// ---------------------------------------------------------------------------
// One definition of "the same email address" for sign-in and for the user
// administration screens.
//
// The sign-in screen lower-cased what was typed and looked it up with an exact
// IndexedDB match, but accounts added from User Management (and bulk import)
// were stored exactly as typed. "Ada.Obi@unth.edu.ng" could therefore never
// sign in: the lookup was for "ada.obi@unth.edu.ng" and IndexedDB keys are
// case-sensitive. Emails copied from WhatsApp or SMS also carry invisible
// characters — zero-width spaces, a non-breaking space, a trailing newline —
// which made a correct address look like an unknown one.
//
// Nothing visible is ever changed here: only case, outer whitespace and
// characters nobody can see.
// ---------------------------------------------------------------------------

/** Zero-width space/joiners, word joiner, BOM and soft hyphen. */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

/** An email as stored and compared: invisible characters removed, trimmed, lower case. */
export function normaliseEmail(value: unknown): string {
  return String(value ?? '')
    .replace(INVISIBLE, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase();
}

interface AccountLike {
  id: string;
  email?: string;
  isActive?: boolean | number;
}

const isActiveAccount = (a: AccountLike) => a.isActive === true || a.isActive === 1;

/**
 * Choose the account to sign in as from every row matching the email.
 *
 * Duplicate rows for one address exist (an account added twice, or once on
 * two devices before they synced). Taking whichever row IndexedDB returned
 * first meant a deactivated duplicate could lock the person out of the active
 * one. The active account wins; with several active, the most recently
 * updated one.
 */
export function pickSignInAccount<T extends AccountLike & { updatedAt?: Date | string }>(
  matches: T[]
): T | undefined {
  const active = matches.filter(isActiveAccount);
  if (active.length === 0) return undefined;
  const time = (a: T) => {
    const t = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };
  return [...active].sort((a, b) => time(b) - time(a))[0];
}

/**
 * The account, other than `excludeId`, that already uses this email — or
 * undefined. Used when adding a user and when an administrator edits one, so
 * an edit can no longer silently give two people the same sign-in address.
 */
export function findEmailOwner<T extends AccountLike>(
  users: T[],
  email: string,
  excludeId?: string
): T | undefined {
  const wanted = normaliseEmail(email);
  if (!wanted) return undefined;
  return users.find(u => u.id !== excludeId && normaliseEmail(u.email) === wanted);
}

/**
 * A user's active flag as the boolean every list expects.
 *
 * User Management once stored 1/0. A deactivated user (0) then passed the
 * `isActive !== false` checks of the staff pickers and could still be
 * assigned patients, and an edited one (1) failed `isActive === true` and
 * vanished from chat contacts. Anything that is not a recognised value is
 * returned unchanged.
 */
export function toActiveFlag(value: unknown): unknown {
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return value;
}
