// ---------------------------------------------------------------------------
// Serverless function: user administration that needs the service role.
// ---------------------------------------------------------------------------
// Creating a sign-in account, setting a temporary password and banning a
// deactivated account are Supabase Auth admin operations: they need the
// service-role key, which must never reach a browser. User Management and the
// bulk import call this function instead.
//
// Server env (NON-VITE): SUPABASE_URL (or VITE_SUPABASE_URL) and
// SUPABASE_SERVICE_ROLE_KEY. See docs/AUTH_ROLLOUT.md.
//
// POST, Authorization: Bearer <caller's Supabase access token>, JSON body:
//   { action: 'create', email, firstName, lastName, role, hospitalId?, phone?,
//     specialization?, licenseNumber?, id? }
//       -> { user, temporaryPassword }   (the password is returned this once)
//   { action: 'reset_password', userId }  -> { user, temporaryPassword }
//   { action: 'set_active', userId, active }  -> { user }
//   { action: 'list_hospitals', userId }
//   { action: 'grant_hospital', userId, hospitalId }
//   { action: 'revoke_hospital', userId, hospitalId }
//       -> { userId, primaryHospitalId, hospitals: [{ hospital_id, granted_by, created_at }] }
//       Extra hospitals (public.user_hospitals) for hospital scoping. Members
//       have no write access to that table; this is the only way to change it,
//       so the grant is checked and granted_by is set here, not by the client.
//
// Who may do what: _lib/adminUsersPolicy.js.
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';
import { guardSameOrigin } from './_lib/sameOrigin.js';
import { bearerToken, getServiceClient, publicUserRow } from './_lib/supabaseServer.js';
import { decideAdminAction, decideMembershipAction, MEMBERSHIP_ACTIONS } from './_lib/adminUsersPolicy.js';
import { generateTempPassword } from './_lib/tempPassword.js';
import { isPlausibleEmail, likeExact, normaliseEmail } from './_lib/email.js';

/** Supabase Auth ban length for a deactivated account (~100 years). */
export const BAN_FOREVER = '876000h';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

async function firstRow(query) {
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

function isEmailTaken(error) {
  return error?.code === 'email_exists' || error?.code === 'user_already_exists' || error?.status === 422;
}

/** The table is created by the hand-applied scoping SQL; say so if it is not there. */
function isMissingTable(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || error?.code === 'PGRST205'
    || (/user_hospitals/.test(message) && /does not exist|schema cache/.test(message));
}

async function handleMembership(admin, res, caller, action, body) {
  // By id, or — for staff of another hospital, whom a hospital admin cannot
  // see in User Management — by their exact sign-in email.
  const userId = text(body.userId);
  const email = userId ? null : normaliseEmail(body.email);
  let target = null;
  if (userId) {
    target = await firstRow(admin.from('users').select('*').eq('id', userId).limit(1));
  } else if (email && isPlausibleEmail(email)) {
    const { data, error } = await admin.from('users').select('*').ilike('email', likeExact(email));
    if (error) throw error;
    target = (data || []).find((u) => normaliseEmail(u.email) === email) ?? null;
  }
  const hospitalId = text(body.hospitalId);
  const decision = decideMembershipAction(caller, action, target, { hospital_id: hospitalId });
  if (!decision.allow) {
    res.status(decision.status).json({ error: decision.error });
    return;
  }

  try {
    if (action === 'grant_hospital') {
      const hospital = await firstRow(admin.from('hospitals').select('id').eq('id', hospitalId).limit(1));
      if (!hospital) {
        res.status(404).json({ error: 'Hospital not found. Sync the hospital list first.' });
        return;
      }
      const { error } = await admin.from('user_hospitals').upsert(
        { user_id: String(target.id), hospital_id: String(hospital.id), granted_by: String(caller.id) },
        { onConflict: 'user_id,hospital_id', ignoreDuplicates: true },
      );
      if (error) throw error;
    } else if (action === 'revoke_hospital') {
      const { error } = await admin.from('user_hospitals').delete()
        .eq('user_id', String(target.id)).eq('hospital_id', hospitalId);
      if (error) throw error;
    }
    const { data, error } = await admin.from('user_hospitals')
      .select('hospital_id, granted_by, created_at').eq('user_id', String(target.id));
    if (error) throw error;
    res.status(200).json({
      userId: String(target.id),
      name: [target.first_name, target.last_name].filter(Boolean).join(' ') || target.email || null,
      primaryHospitalId: target.hospital_id ?? null,
      hospitals: (data || []).map((r) => ({
        hospital_id: r.hospital_id, granted_by: r.granted_by ?? null, created_at: r.created_at ?? null,
      })),
    });
  } catch (e) {
    if (isMissingTable(e)) {
      res.status(503).json({
        error: 'Extra hospitals are not set up on this database yet (apply supabase/manual/20261020100000_hospital_scoping.sql).',
      });
      return;
    }
    throw e;
  }
}

export default async function handler(req, res) {
  if (guardSameOrigin(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const admin = getServiceClient();
  if (!admin) {
    res.status(503).json({
      error: 'User administration is not configured on the server (SUPABASE_SERVICE_ROLE_KEY is not set).',
    });
    return;
  }
  await handleAdminUsers(req, res, { admin });
}

/** The handler body, with the service-role client injected (tests pass a fake). */
export async function handleAdminUsers(req, res, deps) {
  const { admin, newPassword = generateTempPassword, now = () => new Date() } = deps;
  // Responses can carry a temporary password: never cache them anywhere.
  res.setHeader('Cache-Control', 'no-store');

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in to manage users.' });
    return;
  }

  let authUser = null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (!error) authUser = data?.user ?? null;
  } catch {
    res.status(503).json({ error: 'Could not verify your sign-in. Please try again.' });
    return;
  }
  if (!authUser) {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }
  const action = body.action;

  try {
    const caller = await firstRow(admin.from('users').select('*').eq('auth_user_id', authUser.id).limit(1));

    if (action === 'create') {
      const email = normaliseEmail(body.email);
      if (!isPlausibleEmail(email)) {
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }
      const firstName = text(body.firstName);
      const lastName = text(body.lastName);
      if (!firstName || !lastName) {
        res.status(400).json({ error: 'First and last name are required.' });
        return;
      }
      const decision = decideAdminAction(caller, 'create', null, { role: body.role, hospital_id: text(body.hospitalId) });
      if (!decision.allow) {
        res.status(decision.status).json({ error: decision.error });
        return;
      }

      const { data: sameEmail, error: lookupError } = await admin
        .from('users').select('id, email').ilike('email', likeExact(email));
      if (lookupError) throw lookupError;
      if ((sameEmail || []).some((u) => normaliseEmail(u.email) === email)) {
        res.status(409).json({ error: 'A user with this email already exists.' });
        return;
      }

      const temporaryPassword = newPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });
      if (createError || !created?.user) {
        if (isEmailTaken(createError)) {
          res.status(409).json({
            error: 'A sign-in account already exists for this email but has no AstroHEALTH user. '
              + 'Run the account migration (npm run auth:migrate-users) to link it.',
          });
          return;
        }
        throw createError || new Error('Supabase did not return the new account');
      }

      const at = now().toISOString();
      const row = {
        id: typeof body.id === 'string' && UUID.test(body.id) ? body.id : randomUUID(),
        email,
        first_name: firstName,
        last_name: lastName,
        role: String(body.role).trim(),
        hospital_id: decision.hospitalId,
        phone: text(body.phone),
        specialization: text(body.specialization),
        license_number: text(body.licenseNumber),
        is_active: true,
        has_accepted_agreement: false,
        must_change_password: true,
        auth_user_id: created.user.id,
        created_at: at,
        updated_at: at,
      };
      const { data: inserted, error: insertError } = await admin.from('users').insert(row).select('*');
      if (insertError) {
        // Do not leave a sign-in account with no app user behind.
        await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        throw insertError;
      }
      res.status(200).json({ user: publicUserRow(inserted?.[0] ?? row), temporaryPassword });
      return;
    }

    if (action === 'reset_password' || action === 'set_active') {
      const userId = text(body.userId);
      const target = userId
        ? await firstRow(admin.from('users').select('*').eq('id', userId).limit(1))
        : null;
      const decision = decideAdminAction(caller, action, target, { active: body.active });
      if (!decision.allow) {
        res.status(decision.status).json({ error: decision.error });
        return;
      }

      if (action === 'reset_password') {
        const temporaryPassword = newPassword();
        let authUserId = target.auth_user_id || null;
        if (authUserId) {
          const { error } = await admin.auth.admin.updateUserById(authUserId, { password: temporaryPassword });
          if (error) throw error;
        } else {
          // An account from before Supabase Auth that the migration has not
          // reached yet: give it a sign-in account now.
          const { data: created, error } = await admin.auth.admin.createUser({
            email: normaliseEmail(target.email),
            password: temporaryPassword,
            email_confirm: true,
            ...(target.is_active === true ? {} : { ban_duration: BAN_FOREVER }),
          });
          if (error || !created?.user) {
            if (isEmailTaken(error)) {
              res.status(409).json({
                error: 'A sign-in account with this email exists but is not linked yet. '
                  + 'Run the account migration (npm run auth:migrate-users).',
              });
              return;
            }
            throw error || new Error('Supabase did not return the new account');
          }
          authUserId = created.user.id;
        }
        const { data: updated, error: updateError } = await admin
          .from('users')
          .update({ must_change_password: true, auth_user_id: authUserId, password: null, updated_at: now().toISOString() })
          .eq('id', target.id)
          .select('*');
        if (updateError) throw updateError;
        res.status(200).json({ user: publicUserRow(updated?.[0] ?? target), temporaryPassword });
        return;
      }

      // set_active: the ban is what actually stops sign-in (and token refresh).
      const active = body.active === true;
      if (target.auth_user_id) {
        const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, {
          ban_duration: active ? 'none' : BAN_FOREVER,
        });
        if (error) throw error;
      }
      const patch = { is_active: active, updated_at: now().toISOString() };
      if (decision.hospitalId) patch.hospital_id = decision.hospitalId;
      const { data: updated, error: updateError } = await admin
        .from('users').update(patch).eq('id', target.id).select('*');
      if (updateError) throw updateError;
      res.status(200).json({ user: publicUserRow(updated?.[0] ?? { ...target, ...patch }) });
      return;
    }

    if (MEMBERSHIP_ACTIONS.includes(action)) {
      await handleMembership(admin, res, caller, action, body);
      return;
    }

    const decision = decideAdminAction(caller, String(action), null);
    res.status(decision.allow ? 400 : decision.status).json({ error: decision.allow ? 'Unknown action.' : decision.error });
  } catch (e) {
    res.status(500).json({ error: 'User administration failed.', detail: String(e?.message || e).slice(0, 300) });
  }
}
