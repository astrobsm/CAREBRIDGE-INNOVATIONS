// ---------------------------------------------------------------------------
// Client for /api/admin-users: creating accounts, issuing temporary passwords
// and (de)activating accounts. These need the Supabase service role, which
// only the serverless function holds; the caller's own access token proves who
// is asking, and the function decides whether they may (adminUsersPolicy.js).
//
// After each call the returned users row is written to this device's copy, so
// User Management shows the change at once. No password is ever stored: a
// temporary password is returned to the caller once, to show to the admin.
// ---------------------------------------------------------------------------

import { db } from '../database';
import type { User, UserRole } from '../types';
import { withAuthHeaders } from './authToken';
import { userFromCloudRow } from './cloudSyncService';

export interface CreateAccountInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalId?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
}

export interface IssuedCredentials {
  user: User;
  temporaryPassword: string;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You are offline. Managing accounts needs an internet connection.');
  }
  const headers = await withAuthHeaders({ 'Content-Type': 'application/json' });
  if (!headers.Authorization) {
    throw new Error('Sign in online to manage accounts (this session was opened offline).');
  }
  let res: Response;
  try {
    res = await fetch('/api/admin-users', { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new Error('Could not reach the server. Check the connection and try again.');
  }
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

/** Save the server's copy of a users row on this device and return it. */
async function storeLocally(row: Record<string, unknown>): Promise<User> {
  const user = userFromCloudRow(row) as unknown as User;
  await db.users.put(user);
  return user;
}

export async function createAccount(input: CreateAccountInput): Promise<IssuedCredentials> {
  const data = await call<{ user: Record<string, unknown>; temporaryPassword: string }>({ action: 'create', ...input });
  return { user: await storeLocally(data.user), temporaryPassword: data.temporaryPassword };
}

export async function resetAccountPassword(userId: string): Promise<IssuedCredentials> {
  const data = await call<{ user: Record<string, unknown>; temporaryPassword: string }>({ action: 'reset_password', userId });
  return { user: await storeLocally(data.user), temporaryPassword: data.temporaryPassword };
}

export async function setAccountActive(userId: string, active: boolean): Promise<User> {
  const data = await call<{ user: Record<string, unknown> }>({ action: 'set_active', userId, active });
  return storeLocally(data.user);
}

// ── Extra hospitals (hospital scoping) ─────────────────────────────────────

export interface HospitalMembership {
  hospital_id: string;
  granted_by: string | null;
  created_at: string | null;
}

export interface UserHospitals {
  userId: string;
  name: string | null;
  primaryHospitalId: string | null;
  hospitals: HospitalMembership[];
}

/** Grant a hospital to staff found by their sign-in email (e.g. a visiting surgeon from another hospital). */
export function grantHospitalByEmail(email: string, hospitalId: string): Promise<UserHospitals> {
  return call<UserHospitals>({ action: 'grant_hospital', email, hospitalId });
}

/** The hospitals a user belongs to beyond their own (users.hospitalId). */
export function listUserHospitals(userId: string): Promise<UserHospitals> {
  return call<UserHospitals>({ action: 'list_hospitals', userId });
}

/** Let a user see a hospital's patients (super admin: any; hospital admin: their own). */
export function grantUserHospital(userId: string, hospitalId: string): Promise<UserHospitals> {
  return call<UserHospitals>({ action: 'grant_hospital', userId, hospitalId });
}

export function revokeUserHospital(userId: string, hospitalId: string): Promise<UserHospitals> {
  return call<UserHospitals>({ action: 'revoke_hospital', userId, hospitalId });
}
