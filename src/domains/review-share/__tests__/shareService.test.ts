import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'crypto';

// The service's default dependencies reach the EMR's Supabase client and the
// device database; every test injects its own, so stub the modules out.
vi.mock('../../../services/supabaseClient', () => ({ supabase: null }));
vi.mock('../loadPatientRecords', () => ({ loadPatientRecords: async () => null }));

import {
  createReviewShare, explainError, listReviewShares, OFFLINE_MESSAGE, PHOTOS_TABLE, refreshReviewShare, revokeReviewShare,
  SHARE_COLUMNS, SHARES_TABLE, shareState, type ShareDeps,
} from '../shareService';
import { bundle, NOW, PID } from './fixtures';

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

type Call = { table: string; op: string; payload?: unknown; filters: [string, string, unknown][]; select?: string };

/** A PostgREST-shaped fake: records every call; `fail` decides which ones error. */
function fakeSupabase(fail?: (c: Call) => unknown) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const make = (op: string, payload?: unknown, select?: string) => {
      const call: Call = { table, op, payload, filters: [], select };
      const q = {
        eq: (c: string, v: unknown) => { call.filters.push(['eq', c, v]); return q; },
        neq: (c: string, v: unknown) => { call.filters.push(['neq', c, v]); return q; },
        order: () => q,
        limit: () => q,
        then: (res: (v: { data: unknown; error: unknown }) => unknown, rej?: (e: unknown) => unknown) => {
          calls.push(call);
          const error = fail?.(call) ?? null;
          return Promise.resolve({ data: op === 'select' ? [{ id: 'row' }] : null, error }).then(res, rej);
        },
      };
      return q;
    };
    return {
      insert: (p: unknown) => make('insert', p),
      update: (p: unknown) => make('update', p),
      delete: () => make('delete'),
      select: (cols: string) => make('select', undefined, cols),
    };
  };
  return { sb: { from } as unknown as ShareDeps['supabase'], calls };
}

const compress = async () => ({ dataUrl: 'data:image/jpeg;base64,QUJDRA==', width: 1024, height: 768 });
let n = 0;
const deps = (sb: ShareDeps['supabase'], extra: Partial<ShareDeps> = {}): Partial<ShareDeps> => ({
  supabase: sb, loadRecords: async (id: string) => (id === PID ? bundle() : null), compress,
  now: () => NOW, origin: 'https://carebridge-innovations.vercel.app', online: () => true, newId: () => `id-${++n}`, ...extra,
});
const input = { patientId: PID, expiry: '7d' as const, withPin: true, consent: true, inviteeName: ' Dr Ada ', sharedBy: { id: 'u-owner', name: 'Dr Kene Owner' } };

describe('creating a link', () => {
  it('uploads the snapshot, then each photo, then switches the link on', async () => {
    const { sb, calls } = fakeSupabase();
    const r = await createReviewShare(input, deps(sb));

    expect(calls.map(c => `${c.op} ${c.table}`)).toEqual([
      `insert ${SHARES_TABLE}`,
      ...Array(4).fill(`insert ${PHOTOS_TABLE}`),
      `update ${SHARES_TABLE}`,
    ]);
    const row = calls[0].payload as Record<string, unknown>;
    const token = r.link.split('/review/')[1];
    expect(r.link).toMatch(/^https:\/\/carebridge-innovations\.vercel\.app\/review\/[A-Za-z0-9_-]{43}$/);
    expect(row.token_hash).toBe(sha(token));
    expect(r.pin).toMatch(/^\d{4}$/);
    expect(row.pin_hash).toBe(sha(`${row.pin_salt}:${r.pin}`));
    expect(row.snapshot_batch).toBeNull(); // not openable until the photos are in
    expect(row.expires_at).toBe('2026-12-04T10:00:00.000Z');
    expect(row.patient_id).toBe(PID);
    expect(row.hospital_id).toBe('h1');
    expect(row.patient_name).toBe('Ngozi Ada Eze');
    expect(row.invitee_name).toBe('Dr Ada');
    expect(row.created_by_name).toBe('Dr Kene Owner');
    expect((row.snapshot as { photos: { included: number } }).photos.included).toBe(4);
    expect(row.photo_count).toBe(4);

    // Nothing sent anywhere holds the raw token or the PIN.
    const sent = JSON.stringify(calls.map(c => c.payload));
    expect(sent).not.toContain(token);
    expect(sent).not.toContain(`"${r.pin}"`);

    const photos = calls.filter(c => c.table === PHOTOS_TABLE).map(c => c.payload as Record<string, unknown>);
    const batch = photos[0].batch;
    expect(photos.every(p => p.batch === batch && p.share_id === row.id && p.mime === 'image/jpeg' && p.data === 'QUJDRA==')).toBe(true);
    expect(photos.map(p => p.seq)).toEqual([0, 1, 2, 3]);
    const last = calls[calls.length - 1];
    expect(last.payload).toEqual({ snapshot_batch: batch });
    expect(last.filters).toEqual([['eq', 'id', row.id]]);
    expect(r.photoCount).toBe(4);
  });

  it('PIN off: no PIN, no hash, no salt', async () => {
    const { sb, calls } = fakeSupabase();
    const r = await createReviewShare({ ...input, withPin: false, expiry: '24h' }, deps(sb));
    expect(r.pin).toBeNull();
    const row = calls[0].payload as Record<string, unknown>;
    expect(row.pin_hash).toBeNull();
    expect(row.pin_salt).toBeNull();
    expect(row.expires_at).toBe('2026-11-28T10:00:00.000Z');
  });

  it('refuses without the patient\'s consent, and offline, before touching the server', async () => {
    const { sb, calls } = fakeSupabase();
    await expect(createReviewShare({ ...input, consent: false }, deps(sb))).rejects.toThrow(/agreed/);
    await expect(createReviewShare(input, deps(sb, { online: () => false }))).rejects.toThrow(OFFLINE_MESSAGE);
    await expect(createReviewShare(input, deps(null))).rejects.toThrow(/not configured/);
    expect(calls).toHaveLength(0);
  });

  it('a failed photo upload revokes the half-made link', async () => {
    const { sb, calls } = fakeSupabase(c => (c.table === PHOTOS_TABLE && (c.payload as { seq: number }).seq === 2 ? { message: 'Failed to fetch' } : null));
    await expect(createReviewShare(input, deps(sb))).rejects.toThrow(OFFLINE_MESSAGE);
    const last = calls[calls.length - 1];
    expect(last.op).toBe('update');
    expect(last.payload).toMatchObject({ revoked_reason: 'upload_failed' });
    expect(calls.some(c => c.op === 'update' && (c.payload as Record<string, unknown>).snapshot_batch)).toBe(false);
  });

  it('server errors become instructions', () => {
    expect(explainError({ code: '42501', message: 'permission denied for table patient_review_shares' }).kind).toBe('not_signed_in');
    expect(explainError({ code: 'PGRST205', message: 'Could not find the table in the schema cache' }).message).toMatch(/20261128130000_patient_review_shares\.sql/);
    expect(explainError(new TypeError('Failed to fetch')).kind).toBe('offline');
    expect(explainError({ message: 'A review link must expire within 30 days.' }).message).toBe('A review link can last at most 30 days.');
  });
});

describe('managing links', () => {
  it('lists only safe columns for this patient', async () => {
    const { sb, calls } = fakeSupabase();
    await listReviewShares(PID, deps(sb));
    expect(calls[0].select).toBe(SHARE_COLUMNS);
    expect(SHARE_COLUMNS).not.toMatch(/token_hash|pin_hash|pin_salt|snapshot\b(?!_)/);
    expect(calls[0].filters).toEqual([['eq', 'patient_id', PID]]);
  });

  it('revoke is an update of revoked_at on that link', async () => {
    const { sb, calls } = fakeSupabase();
    await revokeReviewShare('share-1', deps(sb));
    expect(calls[0]).toMatchObject({ table: SHARES_TABLE, op: 'update', filters: [['eq', 'id', 'share-1']] });
    expect(Object.keys(calls[0].payload as object).sort()).toEqual(['revoked_at', 'revoked_reason']);
  });

  it('refresh uploads a new batch, switches the same link to it, then removes the old batch', async () => {
    const { sb, calls } = fakeSupabase();
    const r = await refreshReviewShare({ id: 'share-1', patient_id: PID }, deps(sb));
    expect(calls.map(c => `${c.op} ${c.table}`)).toEqual([...Array(4).fill(`insert ${PHOTOS_TABLE}`), `update ${SHARES_TABLE}`, `delete ${PHOTOS_TABLE}`]);
    const batch = (calls[0].payload as { batch: string }).batch;
    const upd = calls[4].payload as Record<string, unknown>;
    expect(upd.snapshot_batch).toBe(batch);
    expect(upd.snapshot_at).toBe(NOW.toISOString());
    expect(Object.keys(upd)).not.toContain('token_hash');
    expect(calls[5].filters).toEqual([['eq', 'share_id', 'share-1'], ['neq', 'batch', batch]]);
    expect(r.photoCount).toBe(4);
  });

  it('says where a link stands', () => {
    const base = { revoked_at: null, revoked_reason: null, expires_at: '2026-12-04T10:00:00Z', snapshot_batch: 'b', locked_until: null };
    expect(shareState(base, NOW)).toBe('active');
    expect(shareState({ ...base, revoked_at: '2026-11-20T00:00:00Z' }, NOW)).toBe('revoked');
    expect(shareState({ ...base, expires_at: '2026-11-20T00:00:00Z' }, NOW)).toBe('expired');
    expect(shareState({ ...base, snapshot_batch: null }, NOW)).toBe('incomplete');
    expect(shareState({ ...base, locked_until: '2026-11-27T10:10:00Z' }, NOW)).toBe('locked');
  });
});
