/**
 * "Manage shared links": every review link made for this patient — who it
 * is for, when it was made and expires, how often it was opened — with
 * Revoke, Refresh snapshot and the access log.
 */

import { useCallback, useEffect, useState } from 'react';
import { History, Link2, Plus, RefreshCw, ShieldOff, WifiOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AsyncButton, Sheet, SkeletonGroup, SkeletonRows, useActionStatus } from '../../../components/motion';
import {
  ACCESS_REASON_LABEL, listAccessLog, listReviewShares, OFFLINE_MESSAGE, refreshReviewShare, revokeReviewShare, shareState,
  type AccessLogRow, type ReviewShareRow,
} from '../shareService';
import { useOnline } from './ShareForReviewSheet';

const when = (iso?: string | null) => (iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');

const STATE_BADGE: Record<ReturnType<typeof shareState>, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800' },
  locked: { label: 'Locked (wrong PINs)', cls: 'bg-amber-100 text-amber-900' },
  expired: { label: 'Expired', cls: 'bg-gray-100 text-gray-700' },
  revoked: { label: 'Revoked', cls: 'bg-red-100 text-red-800' },
  incomplete: { label: 'Upload unfinished', cls: 'bg-gray-100 text-gray-700' },
};

function ShareRow({ s, onChanged }: { s: ReviewShareRow; onChanged: () => void }) {
  const state = shareState(s);
  const [busy, setBusy] = useState<'refresh' | 'revoke' | null>(null);
  const [stage, setStage] = useState('');
  const [log, setLog] = useState<AccessLogRow[] | null>(null);
  const refreshStatus = useActionStatus();
  const live = state === 'active' || state === 'locked';

  const refresh = async () => {
    setBusy('refresh');
    try {
      const r = await refreshReviewShare(s, {}, (st, detail) => setStage(`${st === 'building' ? 'Building' : st === 'photos' ? 'Photos' : 'Uploading'}${detail ? ` ${detail}` : '…'}`));
      refreshStatus.done();
      toast.success(`Snapshot refreshed — the same link now shows the record as of now${r.photoCount ? ` (${r.photoCount} photos)` : ''}`);
      onChanged();
    } catch (e) {
      refreshStatus.error();
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); setStage(''); }
  };

  const revoke = async () => {
    if (!window.confirm(`Revoke this link${s.invitee_name ? ` for ${s.invitee_name}` : ''}? It stops opening at once, for good. You can make a new one.`)) return;
    setBusy('revoke');
    try {
      await revokeReviewShare(s.id);
      toast.success('Link revoked');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  };

  const toggleLog = async () => {
    if (log) { setLog(null); return; }
    try { setLog(await listAccessLog(s.id)); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const badge = STATE_BADGE[state];
  return (
    <li className="rounded-xl border border-gray-200 p-3" data-testid="shared-link-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{s.invitee_name || 'Invited doctor (not named)'}{s.invitee_note ? <span className="text-gray-500 font-normal"> · {s.invitee_note}</span> : null}</p>
          <p className="text-xs text-gray-500">Shared by {s.created_by_name || 'a clinician'} · {s.has_pin ? 'PIN' : 'no PIN'} · {s.photo_count} photo(s)</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>{s.revoked_reason === 'pin_failures' ? 'Revoked (too many wrong PINs)' : badge.label}</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-sm">
        <div><dt className="text-xs text-gray-500">Created</dt><dd>{when(s.created_at)}</dd></div>
        <div><dt className="text-xs text-gray-500">{state === 'expired' ? 'Expired' : 'Expires'}</dt><dd>{when(s.expires_at)}</dd></div>
        <div><dt className="text-xs text-gray-500">Opens</dt><dd data-testid="share-opens">{s.access_count}</dd></div>
        <div><dt className="text-xs text-gray-500">Last opened</dt><dd>{when(s.last_accessed_at)}</dd></div>
      </dl>
      <p className="mt-1 text-xs text-gray-500">Snapshot as of {when(s.snapshot_at)}{s.revoked_at ? ` · revoked ${when(s.revoked_at)}` : ''}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {live && (
          <AsyncButton type="button" className="btn btn-secondary text-sm py-1.5" busy={busy === 'refresh'} status={refreshStatus.status}
            workingLabel={stage || 'Refreshing…'} doneLabel="Refreshed" onClick={() => void refresh()} disabled={busy !== null}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh snapshot
          </AsyncButton>
        )}
        {live && (
          <button type="button" className="btn text-sm py-1.5 border border-red-200 text-red-700 hover:bg-red-50" onClick={() => void revoke()} disabled={busy !== null}>
            <ShieldOff size={16} aria-hidden="true" /> {busy === 'revoke' ? 'Revoking…' : 'Revoke'}
          </button>
        )}
        <button type="button" className="btn btn-secondary text-sm py-1.5" onClick={() => void toggleLog()} aria-expanded={!!log}>
          <History size={16} aria-hidden="true" /> {log ? 'Hide access log' : 'Access log'}
        </button>
      </div>
      {log && (
        <ul className="mt-2 max-h-56 overflow-auto divide-y divide-gray-100 rounded-lg bg-gray-50 text-xs">
          {log.length === 0 && <li className="p-2 text-gray-500">Not opened yet.</li>}
          {log.map(l => (
            <li key={l.id} className="p-2 flex flex-wrap gap-x-3">
              <span className={l.ok ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{ACCESS_REASON_LABEL[l.reason] ?? l.reason}</span>
              <span>{when(l.at)}</span>
              {l.ip && <span className="text-gray-500">IP {l.ip}</span>}
              {l.user_agent && <span className="text-gray-500 truncate max-w-full">{l.user_agent}</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

interface Props {
  open: boolean;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onNewLink?: () => void;
}

export default function ManageSharedLinksSheet({ open, patientId, patientName, onClose, onNewLink }: Props) {
  const online = useOnline();
  const [rows, setRows] = useState<ReviewShareRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setRows(await listReviewShares(patientId)); } catch (e) { setRows([]); setError(e instanceof Error ? e.message : String(e)); }
  }, [patientId]);

  useEffect(() => { if (open) { setRows(null); void load(); } }, [open, load]);

  return (
    <Sheet open={open} onClose={onClose} labelledBy="manage-links-title" size="2xl" dragToDismiss>
      {close => (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 px-4 pt-2 sm:pt-4 pb-2 border-b border-gray-100">
            <div className="min-w-0">
              <h2 id="manage-links-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Link2 size={20} className="text-sky-600" aria-hidden="true" /> Manage shared links</h2>
              <p className="text-sm text-gray-500 truncate">{patientName}</p>
            </div>
            <button type="button" onClick={close} className="p-2 -mr-2 rounded-full hover:bg-gray-100" aria-label="Close"><X size={20} /></button>
          </div>
          <div className="p-4 space-y-3">
            {!online && (
              <p role="alert" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><WifiOff size={18} className="flex-none" aria-hidden="true" /> {OFFLINE_MESSAGE}</p>
            )}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {rows === null ? (
              <SkeletonGroup label="Loading shared links"><SkeletonRows count={3} /></SkeletonGroup>
            ) : rows.length === 0 && !error ? (
              <p className="text-sm text-gray-500">No review links have been made for this patient.</p>
            ) : (
              <ul className="space-y-3">{rows.map(s => <ShareRow key={s.id} s={s} onChanged={() => void load()} />)}</ul>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button type="button" className="btn btn-secondary" onClick={close}>Close</button>
              {onNewLink && <button type="button" className="btn btn-primary" onClick={onNewLink}><Plus size={18} aria-hidden="true" /> New review link</button>}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
