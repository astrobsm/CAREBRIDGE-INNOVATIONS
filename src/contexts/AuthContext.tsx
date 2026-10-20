import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AuthChangeEvent, Session, User as AuthUser } from '@supabase/supabase-js';
import { db } from '../database';
import { syncRecord, startCloudSync, stopCloudSync, userFromCloudRow, flushPendingChanges } from '../services/cloudSyncService';
import { getCloudSession } from '../services/cloudSession';
import { supabase, AUTH_STORAGE_KEY } from '../services/supabaseClient';
import { normaliseEmail, toActiveFlag } from '../utils/loginIdentity';
import {
  classifySignInError,
  cloudRowForResolution,
  isAdminRole,
  resolveAppUser,
  signInMessage,
  type SignInFailure,
} from '../utils/signInFlow';
import { checkOfflinePassword, forgetOfflineVerifier, saveOfflineVerifier } from '../services/offlineCredentialStore';
import { releasePushOnSignOut, restorePushOnSignIn } from '../services/webPushService';
import { logAuthEvent } from '../services/auditService';
import type { User, UserRole } from '../types';
import Dexie from 'dexie';

// ---------------------------------------------------------------------------
// Sign-in is Supabase Auth (signInWithPassword). The person's app account is
// the public.users row linked to their Supabase account (users.auth_user_id);
// see utils/signInFlow for how it is found and linked.
//
// Offline: after every successful ONLINE sign-in the device keeps a PBKDF2
// hash of the password (services/offlineCredentialStore, never synced). When
// Supabase cannot be reached — and only then; a wrong-password answer is final
// — sign-in checks that instead. An offline session reads and writes this
// device only: cloud sync starts only with a real Supabase session.
// ---------------------------------------------------------------------------

/** How the current session was established. */
export type SessionMode = 'online' | 'offline';

export interface LoginResult {
  ok: boolean;
  mode?: SessionMode;
  reason?: SignInFailure;
  message?: string;
}

export type RegisterStatus =
  | 'pending'        // account created, awaiting an administrator's approval
  | 'confirm_email'  // confirm the email first; approval follows
  | 'exists'
  | 'invalid_role'
  | 'offline'
  | 'not_configured'
  | 'error';

export interface RegisterResult {
  ok: boolean;
  status: RegisterStatus;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** 'offline' while signed in against the local verifier only (no cloud sync). */
  sessionMode: SessionMode | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** From an offline session: sign in online as the same person to start syncing. */
  reauthenticate: (password: string) => Promise<LoginResult>;
  register: (userData: RegisterData) => Promise<RegisterResult>;
  logout: () => void;
  /** Set a new password on the Supabase account (online session only). */
  changePassword: (newPassword: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  needsAgreement: () => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalId?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
}

/** What a sign-up stores in the Supabase account until its users row exists. */
interface PendingRegistration {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  hospitalId?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based permissions mapping
const rolePermissions: Record<UserRole, string[]> = {
  super_admin: ['*'],
  hospital_admin: [
    'manage_users', 'manage_hospital', 'view_reports', 'manage_billing',
    'view_patients', 'manage_settings'
  ],
  surgeon: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds'
  ],
  doctor: [
    'view_patients', 'manage_patients', 'create_encounters', 
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_admissions'
  ],
  plastic_surgeon: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds', 
    'manage_burns', 'manage_reconstructive'
  ],
  anaesthetist: [
    'view_patients', 'create_encounters', 'manage_anaesthesia',
    'view_labs', 'view_vitals', 'prescribe'
  ],
  nurse: [
    'view_patients', 'record_vitals', 'view_labs', 'manage_wounds',
    'view_prescriptions', 'administer_medications', 'create_notes'
  ],
  pharmacist: [
    'view_patients', 'view_prescriptions', 'dispense_medications',
    'manage_inventory'
  ],
  lab_scientist: [
    'view_patients', 'view_lab_requests', 'process_labs', 'enter_results'
  ],
  dietician: [
    'view_patients', 'manage_nutrition', 'create_meal_plans'
  ],
  physiotherapist: [
    'view_patients', 'manage_rehabilitation', 'create_therapy_plans'
  ],
  accountant: [
    'manage_billing', 'view_invoices', 'process_payments', 'view_reports'
  ],
  home_care_giver: [
    'view_assigned_patients', 'record_vitals', 'create_notes', 'manage_wounds'
  ],
  driver: [
    'view_schedules', 'update_transport_status'
  ],
  consultant: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds',
    'supervise_residents', 'approve_discharges'
  ],
  resident: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds'
  ],
  registrar: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds'
  ],
  senior_registrar: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals', 'manage_wounds',
    'supervise_residents'
  ],
  medical_officer: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  house_officer: [
    'view_patients', 'create_encounters', 'view_labs', 'request_labs',
    'view_vitals', 'create_notes'
  ],
  endocrinologist: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  cardiologist: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  nephrologist: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  neurologist: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  gastroenterologist: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  obstetrician: [
    'view_patients', 'manage_patients', 'create_encounters', 'manage_surgeries',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  radio_oncologist: [
    'view_patients', 'manage_patients', 'create_encounters',
    'view_labs', 'request_labs', 'prescribe', 'view_vitals'
  ],
  pathologist: [
    'view_patients', 'view_lab_requests', 'process_labs', 'enter_results'
  ],
};

/**
 * Record when this person last signed in, for User Management.
 *
 * Deliberately narrow: only `lastLoginAt` is written, locally without bumping
 * `updatedAt` and in the cloud as a single-column update. Pushing the whole
 * user row from the signing-in device could replay a stale copy over an
 * administrator's newer change — re-activating an account that had just been
 * deactivated elsewhere. Best effort; never holds up sign-in.
 */
function recordLastLogin(userId: string): void {
  const at = new Date();
  db.users.update(userId, { lastLoginAt: at }).catch(() => { /* not critical */ });
  if (supabase) {
    Promise.resolve(
      supabase.from('users').update({ last_login_at: at.toISOString() }).eq('id', userId)
    ).catch(() => { /* offline, or column not migrated yet */ });
  }
}

// ── The session marker ──────────────────────────────────────────────────────
// Which app user this device last signed in as, and how. It is NOT a session:
// on load the Supabase session decides. The marker only lets a device that
// cannot reach Supabase at all carry on as the person who signed in on it.

const SESSION_MARKER_KEY = 'AstroHEALTH_session';

interface SessionMarker {
  appUserId: string;
  email: string;
  mode: SessionMode;
  at: string;
}

function readMarker(): SessionMarker | null {
  try {
    const raw = localStorage.getItem(SESSION_MARKER_KEY);
    const m = raw ? (JSON.parse(raw) as SessionMarker) : null;
    return m && typeof m.appUserId === 'string' ? m : null;
  } catch {
    return null;
  }
}

function writeMarker(m: SessionMarker): void {
  try { localStorage.setItem(SESSION_MARKER_KEY, JSON.stringify(m)); } catch { /* storage full or blocked */ }
}

function clearMarker(): void {
  try {
    localStorage.removeItem(SESSION_MARKER_KEY);
    // Still read by the audit log and a few services to attribute changes.
    localStorage.removeItem('AstroHEALTH_user_id');
  } catch { /* ignore */ }
}

const isActiveUser = (u: User | undefined | null): u is User => !!u && toActiveFlag(u.isActive) === true;

const fail = (reason: SignInFailure): LoginResult => ({ ok: false, reason, message: signInMessage(reason) });

/** PostgREST / Postgres "that function or column does not exist (yet)". */
function isNotMigrated(error: { code?: string } | null | undefined): boolean {
  return !!error && ['PGRST202', '42883', '42703', 'PGRST204'].includes(String(error.code));
}

/** Escape LIKE wildcards so ilike is an exact, case-insensitive match. */
const likeExact = (value: string) => value.replace(/[\\%_]/g, c => `\\${c}`);

/**
 * End the Supabase session on this device. supabase-js keeps its stored
 * session when the server cannot be reached, so it is removed by hand then —
 * a phone signed out offline must not come back signed in on the next load.
 * Scope 'local': signing out of one ward phone does not end the person's
 * sessions on their other devices.
 */
async function endSupabaseSession(): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch {
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  }
}

type Resolution =
  | { status: 'ok'; user: User }
  | { status: 'inactive' | 'pending' | 'none' | 'unreachable' };

/** This device's users rows that could belong to the Supabase account. */
async function localCandidates(authUserId: string, email: string): Promise<User[]> {
  const loginEmail = normaliseEmail(email);
  return db.users
    .filter(u => u.authUserId === authUserId || normaliseEmail(u.email) === loginEmail)
    .toArray();
}

/** Resolve from this device's copy only (the server is unreachable). */
async function resolveLocally(authUser: AuthUser): Promise<Resolution> {
  const result = resolveAppUser(
    authUser.id, authUser.email ?? '', await localCandidates(authUser.id, authUser.email ?? ''),
    !!authUser.email_confirmed_at,
  );
  if (result.status === 'ok') return { status: 'ok', user: result.user };
  return { status: result.status };
}

/** Create the users row of a self-registration: inactive until approved. */
async function createPendingRow(authUser: AuthUser, reg: PendingRegistration): Promise<boolean> {
  if (!supabase || isAdminRole(reg.role)) return false;
  const now = new Date().toISOString();
  const { error } = await supabase.from('users').insert({
    id: reg.id || uuidv4(),
    email: normaliseEmail(authUser.email),
    first_name: reg.firstName,
    last_name: reg.lastName,
    role: reg.role,
    hospital_id: reg.hospitalId ?? null,
    phone: reg.phone ?? null,
    specialization: reg.specialization ?? null,
    license_number: reg.licenseNumber ?? null,
    is_active: false,
    has_accepted_agreement: false,
    must_change_password: false,
    auth_user_id: authUser.id,
    created_at: now,
    updated_at: now,
  });
  if (error) console.warn('[Auth] Could not create the registration:', error.message);
  return !error;
}

/**
 * Find (and, the first time, link) the app user for a Supabase account,
 * asking the server. Falls back to this device's copy when the server cannot
 * be reached.
 */
async function resolveOnlineAppUser(authUser: AuthUser): Promise<Resolution> {
  if (!supabase) return resolveLocally(authUser);
  const sb = supabase;
  const email = normaliseEmail(authUser.email);
  let row: Record<string, unknown> | undefined;

  try {
    const linked = await sb.from('users').select('*').eq('auth_user_id', authUser.id).limit(1);
    if (linked.error && !isNotMigrated(linked.error)) {
      return classifySignInError(linked.error) === 'unreachable' ? resolveLocally(authUser) : { status: 'none' };
    }
    row = linked.data?.[0] as Record<string, unknown> | undefined;

    if (!row && !linked.error) {
      // Not linked yet: the server links the row with this (confirmed) email.
      const claimed = await sb.rpc('claim_app_user');
      if (!claimed.error) {
        row = (Array.isArray(claimed.data) ? claimed.data[0] : claimed.data) as Record<string, unknown> | undefined;
      } else if (!isNotMigrated(claimed.error)) {
        return classifySignInError(claimed.error) === 'unreachable' ? resolveLocally(authUser) : { status: 'none' };
      }
    }

    if (!row && linked.error) {
      // The database predates 20261019090000_auth_accounts.sql: match by
      // email the way sign-in always has, on the server's rows and ours.
      const { data } = await sb.from('users').select('*').ilike('email', likeExact(email));
      const cloud = (data ?? []).map(r => cloudRowForResolution(r as Record<string, unknown>));
      const result = resolveAppUser(authUser.id, email, cloud, !!authUser.email_confirmed_at);
      if (result.status === 'ok') row = result.user.row;
      else if (result.status === 'inactive') return { status: 'inactive' };
    }
  } catch (error) {
    return classifySignInError(error) === 'unreachable' ? resolveLocally(authUser) : { status: 'none' };
  }

  if (!row) {
    // A sign-up made while email confirmation was on had no session to create
    // its users row with; it is created now, from what the sign-up stored.
    const reg = authUser.user_metadata?.registration as PendingRegistration | undefined;
    if (reg && (await createPendingRow(authUser, reg))) return { status: 'pending' };
    return { status: 'none' };
  }

  const user = userFromCloudRow(row) as unknown as User;
  await db.users.put(user).catch(() => { /* the cloud copy is still authoritative */ });
  if (row.is_active !== true) {
    // Never signed in and never active: a registration awaiting approval.
    return { status: row.last_login_at ? 'inactive' : 'pending' };
  }
  return { status: 'ok', user };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read by the auth-state listener, which outlives any one render.
  const userRef = useRef<User | null>(null);
  const modeRef = useRef<SessionMode | null>(null);
  /** login()/register() handle their own SIGNED_IN; the listener stays out. */
  const busyRef = useRef(false);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { modeRef.current = sessionMode; }, [sessionMode]);

  /** Become `signedIn`, and start cloud sync if there is a real session. */
  const completeSignIn = useCallback((
    signedIn: User,
    mode: SessionMode,
    authUserId: string | undefined,
    announce: boolean,
  ) => {
    userRef.current = signedIn;
    modeRef.current = mode;
    setUser(signedIn);
    setSessionMode(mode);
    try { localStorage.setItem('AstroHEALTH_user_id', signedIn.id); } catch { /* ignore */ }
    writeMarker({ appUserId: signedIn.id, email: normaliseEmail(signedIn.email), mode, at: new Date().toISOString() });
    if (announce) {
      logAuthEvent(signedIn.id, 'login', { email: signedIn.email, role: signedIn.role, mode });
      if (mode === 'online') recordLastLogin(signedIn.id);
    }
    if (mode === 'online' && authUserId) {
      startCloudSync({ appUserId: signedIn.id, authUserId, isAdmin: isAdminRole(signedIn.role) });
    }
    void restorePushOnSignIn(signedIn.id, signedIn.hospitalId);
  }, []);

  /** Forget the signed-in person on this device (no audit, no push release). */
  const clearLocalSession = useCallback(() => {
    stopCloudSync();
    userRef.current = null;
    modeRef.current = null;
    setUser(null);
    setSessionMode(null);
    clearMarker();
  }, []);

  /** Sign in against this device's verifier. */
  const signInOffline = useCallback(async (
    email: string,
    password: string,
    whenNoVerifier: SignInFailure = 'offline_unavailable',
  ): Promise<LoginResult> => {
    const check = await checkOfflinePassword(email, password);
    if (check.status !== 'match') return fail(check.status === 'none' ? whenNoVerifier : 'invalid_credentials');
    const local = await db.users.get(check.verifier.appUserId);
    if (!isActiveUser(local)) return fail('inactive');
    completeSignIn(local, 'offline', check.verifier.authUserId, true);
    return { ok: true, mode: 'offline' };
  }, [completeSignIn]);

  /** The online sign-in; `allowOffline` false for an offline-to-online upgrade. */
  const signIn = useCallback(async (email: string, password: string, allowOffline: boolean): Promise<LoginResult> => {
    const loginEmail = normaliseEmail(email);
    try {
      if (!db.isOpen()) await db.open();
    } catch (error) {
      // Never delete the database from here: it holds unsynced patient data.
      console.error('[Auth] Local database unavailable during sign-in:', error);
      return fail('error');
    }

    if (!supabase) return allowOffline ? signInOffline(loginEmail, password, 'not_configured') : fail('not_configured');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return allowOffline ? signInOffline(loginEmail, password) : fail('offline_unavailable');
    }

    busyRef.current = true;
    try {
      let session: Session | null = null;
      let error: unknown = null;
      try {
        const result = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        session = result.data.session;
        error = result.error;
      } catch (thrown) {
        error = thrown;
      }

      if (error || !session) {
        const kind = error ? classifySignInError(error) : 'error';
        // Only an unreachable server may fall back to the device's verifier.
        // An answer — wrong password, banned, unconfirmed — is final.
        if (kind === 'unreachable') {
          return allowOffline ? signInOffline(loginEmail, password) : fail('offline_unavailable');
        }
        if (kind === 'inactive') void forgetOfflineVerifier(loginEmail);
        return fail(kind);
      }

      const resolved = await resolveOnlineAppUser(session.user);
      if (resolved.status !== 'ok') {
        await endSupabaseSession();
        if (resolved.status === 'inactive') void forgetOfflineVerifier(loginEmail);
        return fail(resolved.status === 'none' ? 'no_account' : resolved.status === 'unreachable' ? 'error' : resolved.status);
      }

      await saveOfflineVerifier(loginEmail, password, { appUserId: resolved.user.id, authUserId: session.user.id });
      completeSignIn(resolved.user, 'online', session.user.id, true);
      return { ok: true, mode: 'online' };
    } finally {
      busyRef.current = false;
    }
  }, [completeSignIn, signInOffline]);

  /** A Supabase session appeared or was refreshed outside login(). */
  const adoptSession = useCallback(async (session: Session) => {
    const current = userRef.current;
    if (current && modeRef.current === 'online') return;
    const resolved = await resolveOnlineAppUser(session.user);
    if (resolved.status !== 'ok') return;
    if (current && current.id !== resolved.user.id) return; // someone else's session: ignore
    // Offline session upgraded once connectivity returned, or a sign-in in
    // another tab / from an emailed link.
    completeSignIn(resolved.user, 'online', session.user.id, false);
  }, [completeSignIn]);

  // Initialize database and check for existing session on mount
  useEffect(() => {
    const initAndCheckAuth = async () => {
      try {
        // Try to open the database - this will trigger version upgrade if needed
        await db.open();
      } catch (error) {
        console.warn('[Auth] Database open failed, attempting recovery...', error);
        
        // Check for various database corruption errors
        const errorName = error instanceof Error ? error.name : String(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isCorruptionError = 
          error instanceof Dexie.VersionError || 
          error instanceof Dexie.UpgradeError ||
          errorName === 'UnknownError' ||
          errorMessage.includes('Internal error opening backing store') ||
          errorMessage.includes('corrupted') ||
          errorMessage.includes('UnknownError');
        
        if (isCorruptionError) {
          console.log('[Auth] Deleting corrupted database...');
          try {
            // Close any open connections first
            if (db.isOpen()) {
              db.close();
            }
            // Wait a moment for connections to close
            await new Promise(resolve => setTimeout(resolve, 100));
            // Delete the database
            await Dexie.delete('AstroHEALTHDB');
            console.log('[Auth] Database deleted successfully, reloading...');
          } catch (deleteError) {
            console.error('[Auth] Failed to delete database:', deleteError);
            // Try using native IndexedDB delete as fallback
            try {
              await new Promise<void>((resolve, reject) => {
                const req = indexedDB.deleteDatabase('AstroHEALTHDB');
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
                req.onblocked = () => {
                  console.warn('[Auth] Database delete blocked, will try reload anyway');
                  resolve();
                };
              });
            } catch {
              console.error('[Auth] Native delete also failed');
            }
          }
          // Reload the page to reinitialize with fresh database
          window.location.reload();
          return;
        }
      }

      // The listener below ignores the SIGNED_IN supabase-js emits while it
      // recovers the stored session: restoring it is done here, once.
      busyRef.current = true;
      try {
        await restoreSession();
      } catch (error) {
        console.error('Auth check failed:', error);
        clearMarker();
      } finally {
        busyRef.current = false;
        setIsLoading(false);
      }
    };

    /** The Supabase session decides; the marker only covers "cannot reach it". */
    const restoreSession = async () => {
      const marker = readMarker();
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (supabase) {
        let session: Session | null = null;
        let unreachable = offline;
        try {
          const { data, error } = await supabase.auth.getSession();
          session = data.session;
          if (error && classifySignInError(error) === 'unreachable') unreachable = true;
        } catch {
          unreachable = true;
        }

        if (session) {
          const resolved = offline ? await resolveLocally(session.user) : await resolveOnlineAppUser(session.user);
          if (resolved.status === 'ok') {
            completeSignIn(resolved.user, 'online', session.user.id, false);
          } else if (resolved.status !== 'unreachable') {
            await endSupabaseSession();
            clearMarker();
          }
          return;
        }

        if (!marker || !unreachable) {
          // Signed out, or the session ended (expired, revoked, deactivated).
          clearMarker();
          return;
        }
      } else if (!marker || marker.mode !== 'offline') {
        clearMarker();
        return;
      }

      // Supabase cannot be reached: carry on as the person who signed in here.
      const local = marker ? await db.users.get(marker.appUserId) : undefined;
      if (isActiveUser(local)) completeSignIn(local, 'offline', undefined, false);
      else clearMarker();
    };

    initAndCheckAuth();
  }, [completeSignIn]);

  // Session changes made outside login(): token refresh after coming back
  // online, sign-out elsewhere, deactivation (refresh refused).
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (busyRef.current) return;
      // Deferred: supabase-js must not be called back into from this callback.
      setTimeout(() => {
        if (event === 'SIGNED_OUT') {
          if (userRef.current && modeRef.current === 'online') clearLocalSession();
          return;
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          void adoptSession(session);
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [adoptSession, clearLocalSession]);

  // Back online while signed in offline: a stored Supabase session may now
  // refresh; if so, adopt it and start syncing.
  useEffect(() => {
    const onOnline = () => {
      if (!supabase || !userRef.current || modeRef.current !== 'offline') return;
      supabase.auth.getSession()
        .then(({ data }) => { if (data.session) void adoptSession(data.session); })
        .catch(() => { /* still unreachable */ });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [adoptSession]);

  const login = useCallback(
    (email: string, password: string) => signIn(email, password, true),
    [signIn],
  );

  const reauthenticate = useCallback(async (password: string): Promise<LoginResult> => {
    const current = userRef.current;
    if (!current) return fail('error');
    const result = await signIn(current.email, password, false);
    if (result.ok && userRef.current && userRef.current.id !== current.id) {
      // Signed in online as someone else (two accounts with one email?): stop.
      clearLocalSession();
      await endSupabaseSession();
      return fail('error');
    }
    return result;
  }, [signIn, clearLocalSession]);

  const register = useCallback(async (userData: RegisterData): Promise<RegisterResult> => {
    if (!supabase) return { ok: false, status: 'not_configured', message: signInMessage('not_configured') };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, status: 'offline', message: 'Creating an account needs an internet connection.' };
    }
    // Administrator roles are given by an administrator, never self-assigned
    // (the database trigger refuses them too).
    if (isAdminRole(userData.role)) {
      return { ok: false, status: 'invalid_role', message: 'That role is assigned by an administrator.' };
    }

    const email = normaliseEmail(userData.email);
    const registration: PendingRegistration = {
      id: uuidv4(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      hospitalId: userData.hospitalId,
      phone: userData.phone,
      specialization: userData.specialization,
      licenseNumber: userData.licenseNumber,
    };

    busyRef.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: userData.password,
        options: {
          data: { first_name: userData.firstName, last_name: userData.lastName, registration },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === 'user_already_exists' || code === 'email_exists') {
          return { ok: false, status: 'exists', message: 'An account with this email already exists. Sign in instead.' };
        }
        if (classifySignInError(error) === 'unreachable') {
          return { ok: false, status: 'offline', message: 'Could not reach the server. Try again when you are online.' };
        }
        return { ok: false, status: 'error', message: error.message || 'Registration failed.' };
      }

      if (!data.session || !data.user) {
        // Email confirmation is on: the users row is created at the first
        // sign-in after confirming, from `registration` above.
        return {
          ok: true,
          status: 'confirm_email',
          message: 'Check your email and confirm your address. An administrator will then approve your account.',
        };
      }

      const created = await createPendingRow(data.user, registration);
      // Nobody uses the app before approval: end the sign-up's session.
      await endSupabaseSession();
      if (!created) {
        return { ok: false, status: 'exists', message: 'An account with this email already exists. Sign in instead.' };
      }
      logAuthEvent(registration.id, 'register', { email, role: userData.role });
      return { ok: true, status: 'pending', message: signInMessage('pending') };
    } catch (error) {
      console.error('Registration failed:', error);
      return { ok: false, status: 'error', message: 'Registration failed. Please try again.' };
    } finally {
      busyRef.current = false;
    }
  }, []);

  const logout = useCallback(() => {
    const current = userRef.current;
    if (current) {
      logAuthEvent(current.id, 'logout', { email: current.email, role: current.role });
      // A shared ward phone must stop showing this person's patient alerts.
      // Best effort and never holds up sign-out.
      void releasePushOnSignOut(current.id);
    }
    clearLocalSession();
    // Upload what this person still has pending while their session exists
    // (bounded), so the next person on a shared device is not left holding
    // work they may not be allowed to see or send. Then end the session.
    void flushPendingChanges(5000).finally(() => endSupabaseSession());
  }, [clearLocalSession]);

  const changePassword = useCallback(async (newPassword: string) => {
    const current = userRef.current;
    if (!current) throw new Error('Not signed in.');
    if (!supabase || modeRef.current !== 'online') {
      throw new Error('Connect to the internet and sign in online to change your password.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const code = (error as { code?: string }).code;
      throw new Error(code === 'same_password' ? 'Choose a password different from your current one.' : error.message);
    }
    // Offline sign-in on this device now uses the new password.
    await saveOfflineVerifier(current.email, newPassword, {
      appUserId: current.id,
      authUserId: getCloudSession()?.authUserId,
    });
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };

    await db.users.put(updatedUser);
    // Sync updated user to cloud immediately
    syncRecord('users', updatedUser as unknown as Record<string, unknown>);
    setUser(updatedUser);
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    const permissions = rolePermissions[user.role];
    return permissions.includes('*') || permissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;

    // Super admin has all roles
    if (user.role === 'super_admin') return true;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;

    try {
      const freshUser = await db.users.get(user.id);
      if (freshUser) {
        setUser(freshUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [user]);

  // The agreement screen also sets a new password, so it is shown until the
  // agreement is accepted AND any temporary password has been replaced.
  const needsAgreement = useCallback((): boolean => {
    if (!user) return false;
    return !user.hasAcceptedAgreement || user.mustChangePassword === true;
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    sessionMode,
    login,
    reauthenticate,
    register,
    logout,
    changePassword,
    updateUser,
    refreshUser,
    hasPermission,
    hasRole,
    needsAgreement,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
