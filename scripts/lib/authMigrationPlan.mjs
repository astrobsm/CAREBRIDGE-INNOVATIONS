/**
 * Planning for scripts/migrate-users-to-auth.mjs, kept pure so it is tested.
 *
 * Input: every public.users row (snake_case) and every Supabase Auth user.
 * Output: one step per row saying what the script will do. Steps never carry
 * a password — only where the password will come from.
 *
 * Rules
 *  - A row that is already linked (auth_user_id set) is done; only its legacy
 *    password is cleared.
 *  - Rows are grouped by normalised email (the same normalisation sign-in
 *    uses). In a group with several unlinked rows, only one is migrated: the
 *    active one (most recently updated among several), as sign-in has always
 *    chosen — or, with none active, the most recently updated. The others are
 *    reported as duplicates. If some row of the group is already linked, every
 *    unlinked row of it is a duplicate.
 *  - The chosen row is LINKED to an existing Auth user with that email, or a
 *    new Auth user is CREATED (or INVITED with --invite, active rows only).
 *    A created account keeps the row's existing plaintext password when it is
 *    at least 8 characters, so people keep signing in with what they know;
 *    otherwise it gets a generated temporary password. Both must be changed
 *    at first sign-in (the legacy passwords were readable with the anon key).
 *  - Inactive rows get an account too, banned, so an administrator can later
 *    re-activate them from User Management.
 */

import { isPlausibleEmail, mostRecent, normaliseEmail, pickSignInAccount } from '../../api/_lib/email.js';

export const MIN_KEPT_PASSWORD_LENGTH = 8;

const hasPassword = (row) => typeof row.password === 'string' && row.password.length > 0;
const isActive = (row) => row.is_active === true;

/**
 * @param {Array<{id:string,email?:string,is_active?:boolean,updated_at?:string,auth_user_id?:string|null,password?:string|null}>} rows
 * @param {Array<{id:string,email?:string}>} authUsers
 * @param {{invite?: boolean}} [opts]
 */
export function planUserMigration(rows, authUsers, opts = {}) {
  const invite = !!opts.invite;
  const authByEmail = new Map();
  for (const a of authUsers) {
    const e = normaliseEmail(a.email);
    if (e && !authByEmail.has(e)) authByEmail.set(e, a);
  }
  const linkedAuthIds = new Set(rows.filter((r) => r.auth_user_id).map((r) => String(r.auth_user_id)));

  const groups = new Map();
  for (const r of rows) {
    const e = normaliseEmail(r.email);
    if (!groups.has(e)) groups.set(e, []);
    groups.get(e).push(r);
  }

  const steps = [];
  for (const [email, group] of groups) {
    if (!isPlausibleEmail(email)) {
      for (const r of group) {
        steps.push({ kind: 'invalid_email', rowId: r.id, email: r.email ?? '', clearPassword: hasPassword(r) });
      }
      continue;
    }

    const linked = group.filter((r) => r.auth_user_id);
    const unlinked = group.filter((r) => !r.auth_user_id);

    for (const r of linked) {
      if (hasPassword(r)) steps.push({ kind: 'clear_password', rowId: r.id, email });
    }
    if (unlinked.length === 0) continue;

    if (linked.length > 0) {
      for (const r of unlinked) {
        steps.push({ kind: 'duplicate', rowId: r.id, email, keptRowId: linked[0].id, clearPassword: hasPassword(r) });
      }
      continue;
    }

    const chosen = pickSignInAccount(unlinked) ?? mostRecent(unlinked);
    for (const r of unlinked) {
      if (r !== chosen) {
        steps.push({ kind: 'duplicate', rowId: r.id, email, keptRowId: chosen.id, clearPassword: hasPassword(r) });
      }
    }

    const active = isActive(chosen);
    const existing = authByEmail.get(email);
    if (existing) {
      if (linkedAuthIds.has(String(existing.id))) {
        // That Auth account already signs in as another row (whose email was
        // changed since). Linking it twice is impossible: a person decides.
        steps.push({ kind: 'conflict', rowId: chosen.id, email, authUserId: existing.id, clearPassword: hasPassword(chosen) });
      } else {
        steps.push({ kind: 'link', rowId: chosen.id, email, authUserId: existing.id, active, clearPassword: hasPassword(chosen) });
      }
    } else if (invite && active) {
      steps.push({ kind: 'invite', rowId: chosen.id, email, active });
    } else {
      const keep = typeof chosen.password === 'string' && chosen.password.length >= MIN_KEPT_PASSWORD_LENGTH;
      steps.push({ kind: 'create', rowId: chosen.id, email, active, passwordSource: keep ? 'existing' : 'generated' });
    }
  }
  return steps;
}

/** Counts per kind, for the summary line. */
export function summarisePlan(steps) {
  const counts = {};
  for (const s of steps) counts[s.kind] = (counts[s.kind] ?? 0) + 1;
  return counts;
}

/** One printable line per step — never a password. */
export function describeStep(step) {
  switch (step.kind) {
    case 'link':
      return `link     ${step.email} -> existing sign-in account${step.active ? '' : ' (inactive: will be banned)'}`;
    case 'create':
      return `create   ${step.email} (${step.passwordSource === 'existing' ? 'keeps current password' : 'temporary password'})${step.active ? '' : ' (inactive: banned)'}`;
    case 'invite':
      return `invite   ${step.email} (invitation email)`;
    case 'duplicate':
      return `SKIP     ${step.email} row ${step.rowId}: duplicate of row ${step.keptRowId}${step.clearPassword ? ' (password cleared)' : ''}`;
    case 'conflict':
      return `SKIP     ${step.email} row ${step.rowId}: its sign-in account is already linked to another user row`;
    case 'invalid_email':
      return `SKIP     row ${step.rowId}: not a usable email ("${step.email}")`;
    case 'clear_password':
      return `clear    ${step.email}: already linked, legacy password cleared`;
    default:
      return `${step.kind} ${step.email ?? ''}`;
  }
}

/** One CSV field, quoted. */
export function csvField(value) {
  const s = String(value ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}
