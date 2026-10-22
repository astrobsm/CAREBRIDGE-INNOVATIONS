// ---------------------------------------------------------------------------
// Shown instead of the app when the device database will not open.
// ---------------------------------------------------------------------------
// It never deletes anything by itself. In order it offers: try again; update
// the app (when an old cached copy is running); save a copy of every readable
// table to a JSON file; and only then, behind a typed confirmation, delete the
// device database. Decisions live in database/recovery/dbOpenRecovery.ts.
// Plain markup and Tailwind only: it must work when most of the app cannot.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import {
  DELETE_CONFIRMATION_PHRASE,
  buildExportParts,
  canDeleteLocalDatabase,
  countUnsyncedRecords,
  exportFileName,
  lastPushFromStorage,
  recoveryPlan,
  summariseExport,
  type DbOpenFailure,
  type UnsyncedCount,
} from '../../database/recovery/dbOpenRecovery';
import {
  clearCachedApp,
  deleteLocalDatabase,
  readAllTables,
  saveExportFile,
} from '../../database/recovery/rawIndexedDbExport';

interface Props {
  failure: DbOpenFailure;
  /** Close the Dexie connection (if any) before a delete. */
  closeDatabase?: () => void;
}

type ExportState =
  | { status: 'idle' }
  | { status: 'working'; table: string; index: number; total: number }
  | { status: 'done'; records: number; tablesRead: number; tablesFailed: string[]; how: 'downloaded' | 'shared'; fileName: string }
  | { status: 'empty' }
  | { status: 'failed'; message: string };

const btn = 'w-full min-h-[48px] rounded-lg px-4 py-3 text-base font-semibold disabled:opacity-50';

function storageOrNull(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export default function DatabaseRecoveryScreen({ failure, closeDatabase }: Props) {
  const plan = recoveryPlan(failure.kind);
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });
  const [unsynced, setUnsynced] = useState<UnsyncedCount | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<null | 'update' | 'delete'>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const retry = () => window.location.reload();

  const update = async () => {
    setBusy('update');
    await clearCachedApp();
    window.location.reload();
  };

  const exportData = async () => {
    setExportState({ status: 'working', table: '', index: 0, total: 0 });
    try {
      const raw = await readAllTables((table, index, total) =>
        setExportState({ status: 'working', table, index, total }),
      );
      if (raw.missing) {
        setExportState({ status: 'empty' });
        return;
      }
      setUnsynced(countUnsyncedRecords(raw.results, lastPushFromStorage(storageOrNull())));
      const fileName = exportFileName();
      const parts = await buildExportParts(raw.results, {
        exportedAt: new Date().toISOString(),
        databaseVersion: raw.databaseVersion,
        reason: `${failure.kind}: ${failure.detail}`,
      });
      const how = await saveExportFile(parts, fileName);
      const s = summariseExport(raw.results);
      setExportState({ status: 'done', records: s.records, tablesRead: s.tablesRead, tablesFailed: s.tablesFailed, how, fileName });
    } catch (e) {
      setExportState({ status: 'failed', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const confirmDelete = async () => {
    if (!canDeleteLocalDatabase(failure.kind, typed)) return;
    setBusy('delete');
    setDeleteError(null);
    try {
      closeDatabase?.();
      const result = await deleteLocalDatabase();
      if (result === 'blocked') {
        setDeleteError('Another AstroHEALTH tab or window is still open. Close it; the deletion finishes when it closes, then reload.');
        setBusy(null);
        return;
      }
      window.location.reload();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  const exportDone = exportState.status === 'done';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{plan.explanation}</p>
          <p className="mt-3 text-sm font-medium text-gray-800">
            Nothing has been deleted. Records that have not reached the cloud exist only on this device.
          </p>
        </div>

        <div className="space-y-3">
          {plan.offerUpdate && (
            <button type="button" className={`${btn} bg-blue-600 text-white`} onClick={update} disabled={busy !== null}>
              {busy === 'update' ? 'Updating…' : 'Update the app (keeps your data)'}
            </button>
          )}
          <button
            type="button"
            className={`${btn} ${plan.offerUpdate ? 'border border-gray-300 bg-white text-gray-900' : 'bg-blue-600 text-white'}`}
            onClick={retry}
            disabled={busy !== null}
          >
            Try again
          </button>
        </div>

        {plan.offerExport && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Save a copy of this device's data</h2>
            <p className="mt-1 text-sm text-gray-700">
              Reads every table that can still be read and saves it as a file. Keep it safe: it contains patient records.
            </p>
            <button
              type="button"
              className={`${btn} mt-3 bg-emerald-600 text-white`}
              onClick={exportData}
              disabled={exportState.status === 'working' || busy !== null}
            >
              {exportState.status === 'working' ? 'Saving…' : exportDone ? 'Save another copy' : 'Save a copy (JSON file)'}
            </button>
            {exportState.status === 'working' && exportState.total > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Reading {exportState.table} ({exportState.index + 1} of {exportState.total})…
              </p>
            )}
            {exportState.status === 'done' && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                {exportState.how === 'shared' ? 'Shared' : 'Downloaded'} <span className="break-all font-mono">{exportState.fileName}</span>:{' '}
                {exportState.records} records from {exportState.tablesRead} tables.
                {exportState.tablesFailed.length > 0 && (
                  <span className="mt-1 block text-red-700">
                    Could not read: {exportState.tablesFailed.join(', ')}.
                  </span>
                )}
              </div>
            )}
            {exportState.status === 'empty' && (
              <p className="mt-3 text-sm text-gray-700">There is no AstroHEALTH database on this device.</p>
            )}
            {exportState.status === 'failed' && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                The data could not be read: {exportState.message}. Close other AstroHEALTH tabs and try again, or ask
                support for help before deleting anything.
              </p>
            )}
            {unsynced && (
              <p className="mt-3 text-sm text-gray-800">
                {unsynced.determinable
                  ? unsynced.total === 0
                    ? 'No records appear to have changed since this device last synced.'
                    : `${unsynced.total} record${unsynced.total === 1 ? '' : 's'} changed since this device last synced and may not be in the cloud.`
                  : 'This device has no sync history, so it cannot tell which records reached the cloud.'}
                {unsynced.unknownTables.length > 0 && unsynced.determinable && (
                  <span className="block text-gray-600">Sync status unknown for: {unsynced.unknownTables.join(', ')}.</span>
                )}
              </p>
            )}
          </div>
        )}

        {plan.offerDelete && (
          <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
            {!showDelete ? (
              <button type="button" className="text-sm font-medium text-red-700 underline" onClick={() => setShowDelete(true)}>
                Delete this device's data and start again…
              </button>
            ) : (
              <>
                <h2 className="text-base font-semibold text-red-800">Delete this device's data</h2>
                <p className="mt-1 text-sm text-gray-700">
                  This permanently removes every record stored on this device. Anything not yet synced is lost
                  {exportDone ? ' except what is in the file you saved' : ''}. Records already in the cloud download again
                  when you sign in. Try again first.
                </p>
                {!exportDone && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    You have not saved a copy of this device's data.
                  </p>
                )}
                <label className="mt-3 block text-sm text-gray-800" htmlFor="db-delete-confirm">
                  Type <span className="font-mono font-semibold">{DELETE_CONFIRMATION_PHRASE}</span> to confirm
                </label>
                <input
                  id="db-delete-confirm"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className={`${btn} mt-3 bg-red-600 text-white`}
                  onClick={confirmDelete}
                  disabled={!canDeleteLocalDatabase(failure.kind, typed) || busy !== null}
                >
                  {busy === 'delete' ? 'Deleting…' : 'Delete and start again'}
                </button>
                {deleteError && <p className="mt-2 text-sm text-red-800">{deleteError}</p>}
              </>
            )}
          </div>
        )}

        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Technical details</summary>
          <p className="mt-1 break-all font-mono">{failure.kind}: {failure.detail}</p>
        </details>
      </div>
    </div>
  );
}
