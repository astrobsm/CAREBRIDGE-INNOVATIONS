// Child self-service auth — separate from AstroHEALTH user auth.
// Each child has username + PIN (4–8 digits). PIN is hashed client-side with
// SHA-256 and compared to family.children.pin_hash.
import { getFamilyClient } from './familyClient';
import type { Child } from '../domains/family/types';

const SESSION_KEY = 'family_child_session_v1';

export interface ChildSession {
  child_id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  username: string;
  signed_in_at: number;
}

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getChildSession(): ChildSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChildSession;
  } catch { return null; }
}

export function setChildSession(s: ChildSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearChildSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function childLogin(username: string, pin: string): Promise<{ ok: true; session: ChildSession } | { ok: false; error: string }> {
  const fam = getFamilyClient();
  const u = username.trim().toLowerCase();
  if (!u || !pin) return { ok: false, error: 'Enter username and PIN.' };
  const { data, error } = await fam
    .from('children')
    .select('id, parent_id, first_name, last_name, username, pin_hash, can_login, is_active')
    .ilike('username', u)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const row = data as (Child & { pin_hash?: string | null; can_login?: boolean; is_active?: boolean }) | null;
  if (!row) return { ok: false, error: 'No child found with that username.' };
  if (row.is_active === false) return { ok: false, error: 'This account is archived.' };
  if (!row.can_login || !row.pin_hash) return { ok: false, error: 'Login not enabled. Ask your parent to set it up.' };
  const hash = await hashPin(pin);
  if (hash !== row.pin_hash) return { ok: false, error: 'Wrong PIN.' };

  const session: ChildSession = {
    child_id: row.id,
    parent_id: row.parent_id,
    first_name: row.first_name,
    last_name: row.last_name,
    username: row.username || u,
    signed_in_at: Date.now(),
  };
  setChildSession(session);
  // Stamp last_login_at (fire-and-forget)
  fam.from('children').update({ last_login_at: new Date().toISOString() }).eq('id', row.id).then(() => undefined);
  return { ok: true, session };
}
