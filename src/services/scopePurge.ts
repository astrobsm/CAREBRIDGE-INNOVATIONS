// ---------------------------------------------------------------------------
// Removing, from this device, records the signed-in user may no longer see.
//
// Under hospital scoping (supabase/manual/20261020100000_hospital_scoping.sql)
// the server only returns the rows of the user's hospitals. Pulls never delete
// local rows, so without this a shared ward device would go on showing the
// previous user's patients — and every device would keep the other hospitals'
// data it pulled while everything was visible to every member.
//
// The rule, per synced table:
//   * the server is the judge: the ids the user can see are fetched from it
//     (RLS applies); nothing is worked out on the device;
//   * a local row whose id the server did not return is out of scope;
//   * it is deleted only if it is SYNCED — exactly the test the push engine
//     uses (cloudSyncService.pushTable): a row the engine would push again is
//     unsynced work and is KEPT, counted, and reported instead;
//   * a table whose ids could not all be fetched is left alone entirely;
//   * the signed-in user's own users row is never removed.
// Deleting a synced row loses nothing: the server has it, and anyone who may
// see it pulls it again.
//
// Pure functions only; the I/O is in cloudSyncService.reconcileLocalScope().
// ---------------------------------------------------------------------------

export const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

/**
 * A record's effective "modified" timestamp, as an ISO string. Many tables
 * have no updatedAt (auditLogs -> timestamp, vitalSigns -> recordedAt,
 * labRequests -> requestedAt), so the common alternatives are tried in turn.
 * The push engine and the purge share this one definition.
 */
export function recordTimestamp(r: unknown): string | null {
  const rec = r as Record<string, unknown> | null | undefined;
  const ts = rec?.updatedAt || rec?.createdAt || rec?.timestamp || rec?.recordedAt || rec?.requestedAt || rec?.modifiedAt;
  if (!ts) return null;
  const d = new Date(String(ts));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Would the push engine still upload this record? `lastPush` is the table's
 * watermark (only advanced after a push in which nothing failed).
 * Errs towards "yes": a raw string updatedAt compared as text (the indexed
 * path) and the parsed timestamp (the scan path) must BOTH say it is older.
 */
export function isPendingPush(record: unknown, lastPush: string): boolean {
  const rec = record as Record<string, unknown> | null | undefined;
  const raw = rec?.updatedAt;
  if (typeof raw === 'string' && raw > lastPush) return true;
  const ts = recordTimestamp(record);
  if (!ts) return lastPush === EPOCH_ISO;
  return ts > lastPush;
}

export interface PurgePlan {
  /** Out of scope and synced: safe to delete. */
  purge: string[];
  /** Out of scope but not yet uploaded: kept, and reported. */
  keptUnsynced: string[];
}

/**
 * Decide, for one table, which local rows go.
 *
 * @param localRows   every row of the table on this device
 * @param visibleIds  every id the server returned for the signed-in user
 * @param lastPush    the table's push watermark
 * @param protect     ids never to remove (the signed-in user's own row)
 */
export function planScopePurge(
  localRows: ReadonlyArray<{ id?: unknown }>,
  visibleIds: ReadonlySet<string>,
  lastPush: string,
  protect: ReadonlySet<string> = new Set(),
): PurgePlan {
  const purge: string[] = [];
  const keptUnsynced: string[] = [];
  for (const row of localRows) {
    if (row?.id === undefined || row?.id === null) continue;
    const id = String(row.id);
    if (visibleIds.has(id) || protect.has(id)) continue;
    if (isPendingPush(row, lastPush)) keptUnsynced.push(id);
    else purge.push(id);
  }
  return { purge, keptUnsynced };
}

/** What the server says about the caller (public.app_access_policy()). */
export interface AccessPolicy {
  hospitalScoped: boolean;
  changedAt: string | null;
  hospitalIds: string[];
}

/** The last reconciliation this device completed. */
export interface PurgeMark {
  key: string;
  at: number;
  complete: boolean;
}

/** Retry an incomplete reconciliation (unsynced rows kept, a table failed) at most this often. */
export const PURGE_RETRY_MS = 30 * 60 * 1000;

/**
 * What a reconciliation is "for": this user, this switch-on of scoping, these
 * hospitals. Any change (another user signs in on the device, a hospital is
 * granted or removed, scoping re-applied after a rollback) runs it again.
 */
export function purgeKey(appUserId: string, policy: AccessPolicy): string {
  return [appUserId, policy.changedAt ?? '', [...policy.hospitalIds].sort().join(',')].join('|');
}

/** Whether to reconcile now. Never while scoping is off: everyone sees everything then. */
export function shouldReconcile(
  appUserId: string | null | undefined,
  policy: AccessPolicy | null,
  last: PurgeMark | null,
  now: number = Date.now(),
): boolean {
  if (!appUserId || !policy || !policy.hospitalScoped) return false;
  if (!last || last.key !== purgeKey(appUserId, policy)) return true;
  return !last.complete && now - last.at >= PURGE_RETRY_MS;
}

/** Parse what supabase.rpc('app_access_policy') returned (a one-row set). */
export function parseAccessPolicy(data: unknown): AccessPolicy | null {
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined;
  if (!row || typeof row !== 'object') return null;
  return {
    hospitalScoped: row.hospital_scoped === true,
    changedAt: row.changed_at ? String(row.changed_at) : null,
    hospitalIds: Array.isArray(row.hospital_ids) ? row.hospital_ids.map(String) : [],
  };
}

/** The message shown when unsynced out-of-scope work had to stay on the device. */
export function keptUnsyncedMessage(count: number): string {
  return `${count} record${count === 1 ? '' : 's'} on this device belong${count === 1 ? 's' : ''} to patients outside your hospitals `
    + 'and have not been uploaded yet. They were kept so no work is lost: ask the person who recorded them '
    + 'to sign in on this device and sync, or an administrator to give you access.';
}

/** The access policy this device last read from the server, for one user. */
export interface CachedAccessPolicy {
  userId: string;
  fetchedAt: number;
  policy: AccessPolicy;
}

/**
 * Registering a patient at a hospital the user does not belong to would be
 * refused by the server once scoping is on (the patient could never be
 * uploaded, and would vanish from everyone else's view). Say so before saving.
 * Returns the reason, or null when registering there is fine.
 *
 * A hospital created on this device after the policy was read is allowed: the
 * server makes whoever creates a hospital a member of it.
 */
export function registrationHospitalProblem(
  hospitalId: string | null | undefined,
  opts: { role?: string | null; cached: CachedAccessPolicy | null; hospitalCreatedAt?: Date | string | null; hospitalName?: string | null },
): string | null {
  const { role, cached } = opts;
  if (!cached || !cached.policy.hospitalScoped) return null;
  if (role === 'super_admin') return null;
  const id = String(hospitalId ?? '').trim();
  if (id === '' || id === 'global') return null;
  if (cached.policy.hospitalIds.includes(id)) return null;
  const created = opts.hospitalCreatedAt ? new Date(opts.hospitalCreatedAt).getTime() : NaN;
  if (!Number.isNaN(created) && created >= cached.fetchedAt) return null;
  return `You are not a member of ${opts.hospitalName || 'that hospital'}, so a patient registered there could not be saved to the cloud `
    + 'and you would lose sight of it. Choose one of your hospitals, or ask an administrator to add you to this one '
    + '(User Management -> Hospitals).';
}
