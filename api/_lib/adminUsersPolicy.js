// ---------------------------------------------------------------------------
// Who may administer which account — the decision behind /api/admin-users,
// kept pure so every rule is unit-tested.
//
//  - super_admin: any account at any hospital, any role.
//  - hospital_admin: accounts at their OWN hospital only; never creates a
//    super_admin, never touches an existing super_admin account.
//  - everyone else: nothing.
//  - Nobody deactivates their own account (an administrator locking
//    themselves out leaves a hospital with no one to fix it).
//
// The database trigger from 20261019090000_auth_accounts.sql enforces the
// same role rules for direct table writes; this is the server-side check for
// the operations that need the service role (Supabase Auth accounts).
// ---------------------------------------------------------------------------

export const ACTIONS = ['create', 'reset_password', 'set_active'];

const isActive = (u) => u?.is_active === true;
const sameHospital = (a, b) => !!a && !!b && String(a) === String(b);

const deny = (status, error) => ({ allow: false, status, error });

/**
 * Decide whether `caller` (their users row, snake_case) may perform `action`.
 *
 * @param caller  the caller's users row
 * @param action  'create' | 'reset_password' | 'set_active'
 * @param target  the users row acted on (null for create)
 * @param input   for create: { role, hospital_id }; for set_active: { active }
 * @returns {{ allow: true, hospitalId?: string|null } | { allow: false, status: number, error: string }}
 *          For create, `hospitalId` is the hospital the new account must get.
 */
export function decideAdminAction(caller, action, target, input = {}) {
  if (!ACTIONS.includes(action)) return deny(400, `Unknown action "${action}".`);
  if (!caller || !isActive(caller)) return deny(403, 'Your account is not active.');

  const role = caller.role;
  if (role !== 'super_admin' && role !== 'hospital_admin') {
    return deny(403, 'Only administrators can manage user accounts.');
  }
  const isSuper = role === 'super_admin';

  if (action === 'create') {
    const newRole = String(input.role || '').trim();
    if (!newRole) return deny(400, 'A role is required.');
    if (newRole === 'super_admin' && !isSuper) {
      return deny(403, 'Only a super administrator can create a super administrator.');
    }
    if (isSuper) return { allow: true, hospitalId: input.hospital_id || null };
    if (!caller.hospital_id) return deny(403, 'Your administrator account is not assigned to a hospital.');
    if (input.hospital_id && !sameHospital(input.hospital_id, caller.hospital_id)) {
      return deny(403, 'You can only add users to your own hospital.');
    }
    return { allow: true, hospitalId: caller.hospital_id };
  }

  // reset_password / set_active act on an existing account.
  if (!target) return deny(404, 'User not found.');

  if (action === 'set_active') {
    if (typeof input.active !== 'boolean') return deny(400, '"active" must be true or false.');
    if (String(target.id) === String(caller.id)) {
      return deny(400, 'You cannot change whether your own account is active.');
    }
  }

  if (isSuper) return { allow: true };

  if (target.role === 'super_admin') {
    return deny(403, 'Only a super administrator can manage a super administrator account.');
  }
  // A self-registration awaiting approval has no hospital yet. A hospital
  // administrator may approve it, which brings the account into their hospital.
  if (
    action === 'set_active' && input.active === true && !target.hospital_id &&
    target.is_active !== true && target.role !== 'hospital_admin' && caller.hospital_id
  ) {
    return { allow: true, hospitalId: caller.hospital_id };
  }
  if (!sameHospital(target.hospital_id, caller.hospital_id)) {
    return deny(403, 'You can only manage users at your own hospital.');
  }
  return { allow: true };
}

// ---------------------------------------------------------------------------
// Extra hospitals (public.user_hospitals, read by hospital scoping —
// supabase/manual/20261020100000_hospital_scoping.sql).
//
//  - super_admin: grants or revokes any hospital, for any account.
//  - hospital_admin: only their OWN hospital (users.hospital_id — never one
//    they were granted, so a grant cannot be passed along), for any account
//    except a super_admin's. That is how a visiting surgeon from another
//    hospital is let in to see this hospital's patients.
//  - everyone else: nothing. Members cannot write the table at all (no RLS
//    write policy), so this function is the only way in.
//  - A user's primary hospital is not a grant: change it by editing the user.
//  - Anyone who may grant may list an account's hospitals.
// ---------------------------------------------------------------------------

export const MEMBERSHIP_ACTIONS = ['list_hospitals', 'grant_hospital', 'revoke_hospital'];

/**
 * @param caller  the caller's users row
 * @param action  'list_hospitals' | 'grant_hospital' | 'revoke_hospital'
 * @param target  the users row whose hospitals change
 * @param input   { hospital_id } for grant/revoke
 * @returns {{ allow: true } | { allow: false, status: number, error: string }}
 */
export function decideMembershipAction(caller, action, target, input = {}) {
  if (!MEMBERSHIP_ACTIONS.includes(action)) return deny(400, `Unknown action "${action}".`);
  if (!caller || !isActive(caller)) return deny(403, 'Your account is not active.');
  const role = caller.role;
  if (role !== 'super_admin' && role !== 'hospital_admin') {
    return deny(403, 'Only administrators can change which hospitals a user belongs to.');
  }
  if (!target) return deny(404, 'User not found.');
  const isSuper = role === 'super_admin';
  if (!isSuper && !caller.hospital_id) {
    return deny(403, 'Your administrator account is not assigned to a hospital.');
  }
  if (action === 'list_hospitals') return { allow: true };

  const hospitalId = typeof input.hospital_id === 'string' ? input.hospital_id.trim() : '';
  if (!hospitalId) return deny(400, 'A hospital is required.');
  if (action === 'grant_hospital' && sameHospital(hospitalId, target.hospital_id)) {
    return deny(400, 'That is already this user\'s own hospital.');
  }
  if (isSuper) return { allow: true };

  if (target.role === 'super_admin') {
    return deny(403, 'A super administrator already sees every hospital.');
  }
  if (!sameHospital(hospitalId, caller.hospital_id)) {
    return deny(403, 'You can only grant or remove your own hospital.');
  }
  return { allow: true };
}
