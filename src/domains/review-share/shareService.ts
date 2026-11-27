/**
 * Create, refresh, list and revoke view-only review links.
 *
 * Sharing is online-only: the link is a cloud row (patient_review_shares).
 * The summary is built on THIS device from its own records (the cloud copy
 * may lag), frozen, and uploaded:
 *
 *   1. build the snapshot and compress the photos (here, on the device);
 *   2. insert the link row with the snapshot, photo batch not yet set — the
 *      link does not open until step 4;
 *   3. upload each photo as its own row (small requests on a weak network);
 *   4. point the link at that photo batch. Only now does it open.
 *
 * A refresh repeats 1, 3 and 4 against the same row with a new batch, then
 * deletes the old batch, so the invitee's link never shows half a snapshot.
 * If anything fails after step 2 the new link is revoked, never left half made.
 *
 * The raw token and PIN are returned to the caller once and kept nowhere.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../../services/supabaseClient';
import { loadPatientRecords } from './loadPatientRecords';
import { buildReviewSnapshot, patientDisplayName, type PatientRecordBundle } from './summaryBuilder';
import { selectAndCompressPhotos, type CompressedPhoto, type Compressor } from './photoCompress';
import { expiryDate, generatePin, generateSalt, generateToken, hashPin, reviewLink, sha256Hex, type ExpiryChoice } from './shareCrypto';
import type { ReviewSnapshot } from './snapshotTypes';

export const SHARES_TABLE = 'patient_review_shares';
export const PHOTOS_TABLE = 'patient_review_share_photos';
export const LOG_TABLE = 'patient_review_share_access_log';
export const MIGRATION_FILE = 'supabase/migrations/20261128130000_patient_review_shares.sql';
/** The snapshot JSON (no photos) must stay well under the database check (4 MB). */
export const MAX_SNAPSHOT_BYTES = 3_500_000;

/** The columns a member may read (the token / PIN hashes are not among them). */
export const SHARE_COLUMNS = 'id, patient_id, patient_name, created_by, created_by_name, invitee_name, invitee_note, created_at, expires_at, revoked_at, revoked_reason, snapshot_at, snapshot_batch, photo_count, access_count, last_accessed_at, has_pin, locked_until, pin_failures_total';

export interface ReviewShareRow {
  id: string;
  patient_id: string;
  patient_name: string | null;
  created_by: string;
  created_by_name: string | null;
  invitee_name: string | null;
  invitee_note: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  snapshot_at: string | null;
  snapshot_batch: string | null;
  photo_count: number;
  access_count: number;
  last_accessed_at: string | null;
  has_pin: boolean;
  locked_until: string | null;
  pin_failures_total: number;
}

export interface AccessLogRow {
  id: string;
  share_id: string;
  at: string;
  ok: boolean;
  reason: string;
  ip: string | null;
  user_agent: string | null;
}

export type ShareStage = 'building' | 'photos' | 'uploading' | 'finishing';

export interface ShareDeps {
  supabase: Pick<SupabaseClient, 'from'> | null;
  loadRecords: (patientId: string) => Promise<PatientRecordBundle | null>;
  compress?: Compressor;
  now?: () => Date;
  origin?: string;
  online?: () => boolean;
  newId?: () => string;
}

const defaultDeps = (): ShareDeps => ({
  supabase: defaultSupabase,
  loadRecords: loadPatientRecords,
  origin: typeof window !== 'undefined' ? window.location.origin : '',
  online: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
});

const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export class ShareError extends Error {
  constructor(message: string, readonly kind: 'offline' | 'not_configured' | 'not_signed_in' | 'not_installed' | 'too_large' | 'not_found' | 'server') {
    super(message);
    this.name = 'ShareError';
  }
}

export const OFFLINE_MESSAGE = 'Sharing for review needs an internet connection. Connect and try again — nothing was shared.';

interface PgError { code?: string; message?: string; details?: string; hint?: string; status?: number }

/** A PostgREST / network error in words the clinician can act on. */
export function explainError(e: unknown): ShareError {
  if (e instanceof ShareError) return e;
  const err = (e ?? {}) as PgError;
  const msg = String(err.message ?? e ?? '');
  if (err.code === '42501' || /permission denied|row-level security|JWT|not authorized|401|403/i.test(msg)) {
    return new ShareError('Your session is not signed in to the cloud, so the link could not be created. Sign out and sign in again while online, then retry.', 'not_signed_in');
  }
  if (err.code === 'PGRST205' || err.code === '42P01' || err.code === 'PGRST202' || /does not exist|schema cache/i.test(msg)) {
    return new ShareError(`Review links are not set up on the server yet. An administrator must run ${MIGRATION_FILE} in Supabase.`, 'not_installed');
  }
  if (/Failed to fetch|NetworkError|network|timeout|ECONN/i.test(msg)) return new ShareError(OFFLINE_MESSAGE, 'offline');
  if (/expire within 30 days/i.test(msg)) return new ShareError('A review link can last at most 30 days.', 'server');
  if (/revoked/i.test(msg)) return new ShareError('This link has been revoked; create a new one instead.', 'server');
  return new ShareError(`The link could not be saved: ${msg || 'unknown error'}`, 'server');
}

function ready(d: ShareDeps) {
  if (d.online && !d.online()) throw new ShareError(OFFLINE_MESSAGE, 'offline');
  if (!d.supabase) throw new ShareError('Review links need the cloud connection, which is not configured on this installation.', 'not_configured');
  return d.supabase;
}

async function check<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let res: { data: T; error: unknown };
  try { res = await p; } catch (e) { throw explainError(e); }
  if (res.error) throw explainError(res.error);
  return res.data;
}

/** Build the frozen summary and its compressed photos on this device. */
export async function buildShareContent(patientId: string, d: ShareDeps, onStage?: (s: ShareStage, detail?: string) => void) {
  onStage?.('building');
  const bundle = await d.loadRecords(patientId);
  if (!bundle) throw new ShareError('This patient is not on this device.', 'not_found');
  const now = d.now?.() ?? new Date();
  const { snapshot, photos: candidates } = buildReviewSnapshot(bundle, now);
  onStage?.('photos', candidates.length ? `0 of ${Math.min(candidates.length, 20)}` : undefined);
  const { photos, total, note } = await selectAndCompressPhotos(candidates, d.compress, (done, of) => onStage?.('photos', `${done} of ${of}`));
  const finished: ReviewSnapshot = { ...snapshot, photos: { included: photos.length, total, omitted: total - photos.length, note } };
  const json = JSON.stringify(finished);
  if (new TextEncoder().encode(json).length > MAX_SNAPSHOT_BYTES) {
    throw new ShareError('This record is too large to share as one link. Please tell the developer.', 'too_large');
  }
  return { bundle, snapshot: finished, photos, patientName: patientDisplayName(bundle.patient), now };
}

async function uploadPhotos(sb: NonNullable<ShareDeps['supabase']>, shareId: string, batch: string, photos: CompressedPhoto[], newId: () => string, onStage?: (s: ShareStage, detail?: string) => void) {
  for (let i = 0; i < photos.length; i++) {
    onStage?.('uploading', `photo ${i + 1} of ${photos.length}`);
    const p = photos[i];
    await check(sb.from(PHOTOS_TABLE).insert({
      id: newId(), share_id: shareId, batch, seq: i, caption: p.caption ?? null, source: p.source,
      taken_at: p.takenAt ?? null, mime: p.mime, data: p.data, width: p.width, height: p.height,
    }));
  }
}

export interface CreateShareInput {
  patientId: string;
  hospitalId?: string | null;
  inviteeName?: string;
  inviteeNote?: string;
  expiry: ExpiryChoice;
  withPin: boolean;
  /** The patient agreed to this doctor seeing their record (NDPA 2023). */
  consent: boolean;
  sharedBy: { id: string; name: string };
}

export interface CreatedShare {
  shareId: string;
  link: string;
  pin: string | null;
  expiresAt: Date;
  photoCount: number;
  photoTotal: number;
  photoNote?: string;
}

export async function createReviewShare(input: CreateShareInput, deps: Partial<ShareDeps> = {}, onStage?: (s: ShareStage, detail?: string) => void): Promise<CreatedShare> {
  const d = { ...defaultDeps(), ...deps };
  if (!input.consent) throw new ShareError('Confirm that the patient has agreed to this share first.', 'server');
  const sb = ready(d);
  const newId = d.newId ?? uuid;
  const { snapshot, photos, patientName, bundle, now } = await buildShareContent(input.patientId, d, onStage);

  const token = generateToken();
  const pin = input.withPin ? generatePin() : null;
  const salt = pin ? generateSalt() : null;
  const expiresAt = expiryDate(input.expiry, now);
  const shareId = newId();
  const batch = newId();

  onStage?.('uploading');
  await check(sb.from(SHARES_TABLE).insert({
    id: shareId,
    token_hash: await sha256Hex(token),
    pin_hash: pin && salt ? await hashPin(salt, pin) : null,
    pin_salt: salt,
    patient_id: input.patientId,
    hospital_id: input.hospitalId ?? bundle.patient.registeredHospitalId ?? null,
    patient_name: patientName,
    created_by: input.sharedBy.id,
    created_by_name: input.sharedBy.name,
    invitee_name: input.inviteeName?.trim() || null,
    invitee_note: input.inviteeNote?.trim() || null,
    consent_confirmed_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    snapshot,
    snapshot_at: snapshot.snapshotAt,
    snapshot_batch: null,
    photo_count: photos.length,
  }));
  try {
    await uploadPhotos(sb, shareId, batch, photos, newId, onStage);
    onStage?.('finishing');
    await check(sb.from(SHARES_TABLE).update({ snapshot_batch: batch }).eq('id', shareId));
  } catch (e) {
    // Never leave a half-made link behind.
    try { await sb.from(SHARES_TABLE).update({ revoked_at: new Date().toISOString(), revoked_reason: 'upload_failed' }).eq('id', shareId); } catch { /* best effort */ }
    throw explainError(e);
  }
  return {
    shareId, link: reviewLink(d.origin ?? '', token), pin, expiresAt,
    photoCount: photos.length, photoTotal: snapshot.photos.total, photoNote: snapshot.photos.note,
  };
}

/** Re-upload the current summary to the same link (same token, same PIN). */
export async function refreshReviewShare(share: Pick<ReviewShareRow, 'id' | 'patient_id'>, deps: Partial<ShareDeps> = {}, onStage?: (s: ShareStage, detail?: string) => void) {
  const d = { ...defaultDeps(), ...deps };
  const sb = ready(d);
  const newId = d.newId ?? uuid;
  const { snapshot, photos } = await buildShareContent(share.patient_id, d, onStage);
  const batch = newId();
  await uploadPhotos(sb, share.id, batch, photos, newId, onStage);
  onStage?.('finishing');
  await check(sb.from(SHARES_TABLE).update({
    snapshot, snapshot_at: snapshot.snapshotAt, snapshot_batch: batch, photo_count: photos.length,
  }).eq('id', share.id));
  // The old batch is no longer shown; remove it (a failure here only leaves unused rows).
  try { await sb.from(PHOTOS_TABLE).delete().eq('share_id', share.id).neq('batch', batch); } catch { /* best effort */ }
  return { snapshotAt: snapshot.snapshotAt, photoCount: photos.length, photoNote: snapshot.photos.note };
}

export async function listReviewShares(patientId: string, deps: Partial<ShareDeps> = {}): Promise<ReviewShareRow[]> {
  const d = { ...defaultDeps(), ...deps };
  const sb = ready(d);
  return (await check(sb.from(SHARES_TABLE).select(SHARE_COLUMNS).eq('patient_id', patientId).order('created_at', { ascending: false }))) as unknown as ReviewShareRow[];
}

export async function listAccessLog(shareId: string, deps: Partial<ShareDeps> = {}): Promise<AccessLogRow[]> {
  const d = { ...defaultDeps(), ...deps };
  const sb = ready(d);
  return (await check(sb.from(LOG_TABLE).select('id, share_id, at, ok, reason, ip, user_agent').eq('share_id', shareId).order('at', { ascending: false }).limit(50))) as unknown as AccessLogRow[];
}

export async function revokeReviewShare(shareId: string, deps: Partial<ShareDeps> = {}) {
  const d = { ...defaultDeps(), ...deps };
  const sb = ready(d);
  await check(sb.from(SHARES_TABLE).update({ revoked_at: new Date().toISOString(), revoked_reason: 'revoked' }).eq('id', shareId));
}

/** Where a link stands, for the manage list. */
export function shareState(s: Pick<ReviewShareRow, 'revoked_at' | 'revoked_reason' | 'expires_at' | 'snapshot_batch' | 'locked_until'>, now: Date = new Date()): 'active' | 'locked' | 'expired' | 'revoked' | 'incomplete' {
  if (s.revoked_at) return 'revoked';
  if (new Date(s.expires_at).getTime() <= now.getTime()) return 'expired';
  if (!s.snapshot_batch) return 'incomplete';
  if (s.locked_until && new Date(s.locked_until).getTime() > now.getTime()) return 'locked';
  return 'active';
}

export const ACCESS_REASON_LABEL: Record<string, string> = {
  opened: 'Opened', wrong_pin: 'Wrong PIN', pin_required: 'Asked for PIN', locked: 'Refused (locked)',
  expired: 'Refused (expired)', revoked: 'Refused (revoked)', not_ready: 'Refused (not ready)',
};
