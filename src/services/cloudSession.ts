// ---------------------------------------------------------------------------
// Whether this device may talk to the cloud right now.
//
// Cloud sync and realtime run only while a real Supabase session exists for a
// signed-in, active app user. Before sign-in, after sign-out, and while signed
// in OFFLINE (password checked against the local verifier only) this is null
// and every push, pull and subscription is skipped — local writes simply wait
// for the next real session, when the watermark-based push picks them up.
//
// Its own module so the sync engine, the API service and AuthContext can share
// it without import cycles.
// ---------------------------------------------------------------------------

export interface CloudSession {
  /** public.users id of the signed-in person. */
  appUserId: string;
  /** auth.users id of their Supabase account. */
  authUserId: string;
  /** super_admin or hospital_admin: may push other people's users rows. */
  isAdmin: boolean;
}

let current: CloudSession | null = null;

export function setCloudSession(session: CloudSession | null): void {
  current = session;
}

export function getCloudSession(): CloudSession | null {
  return current;
}

export function hasCloudSession(): boolean {
  return current !== null;
}
