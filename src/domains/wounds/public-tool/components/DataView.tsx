import { useEffect, useRef, useState } from 'react';
import { Download, HardDrive, ShieldCheck, ShieldAlert, Table, Upload } from 'lucide-react';
import { getWoundStore, isMemoryOnly } from '../toolDb';
import { backupFileName, buildBackup, BackupError, parseBackup } from '../backup';
import { buildCsv, csvFileName } from '../csv';
import {
  downloadBlob, formatBytes, getLastBackupAt, readStorageState, requestPersistence, setLastBackupAt,
  type StorageState,
} from '../deviceStorage';
import { Button, Card, fmtDate } from './ui';

export function StorageBadge({ state }: { state: StorageState | null }) {
  if (!state) return null;
  if (isMemoryOnly()) {
    return <span className="text-sm text-red-700">This browser cannot store data. Records are lost when you close it.</span>;
  }
  return state.persisted
    ? <span className="inline-flex items-center gap-1.5 text-sm text-green-800"><ShieldCheck className="w-4 h-4" /> Storage kept by the browser</span>
    : <span className="inline-flex items-center gap-1.5 text-sm text-amber-800"><ShieldAlert className="w-4 h-4" /> Browser may clear data if the phone is full</span>;
}

export default function DataView({ onChanged }: { onChanged: () => void }) {
  const [state, setState] = useState<StorageState | null>(null);
  const [counts, setCounts] = useState({ wounds: 0, assessments: 0, photos: 0 });
  const [lastBackup, setLastBackup] = useState<string | null>(getLastBackupAt());
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    readStorageState().then(setState);
    getWoundStore().counts().then(setCounts);
  }, [version]);

  const keep = async () => {
    const ok = await requestPersistence();
    setMessage(ok
      ? { text: 'The browser will keep this data.', tone: 'ok' }
      : { text: 'The browser did not agree. Add this page to your home screen, use it regularly, and keep backups.', tone: 'err' });
    setVersion(v => v + 1);
  };

  const exportJson = async () => {
    setBusy(true);
    try {
      const data = await getWoundStore().dumpAll();
      const backup = await buildBackup(data);
      downloadBlob(new Blob([JSON.stringify(backup)], { type: 'application/json' }), backupFileName());
      setLastBackupAt(backup.exportedAt);
      setLastBackup(backup.exportedAt);
      setMessage({ text: `Backup saved: ${data.wounds.length} wounds, ${data.assessments.length} assessments, ${data.photos.length} photos. Keep the file somewhere safe.`, tone: 'ok' });
    } catch (e) {
      console.error('[WoundTool] Backup failed:', e);
      setMessage({ text: 'Could not make the backup.', tone: 'err' });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    const { wounds, assessments } = await getWoundStore().dumpAll();
    downloadBlob(new Blob([buildCsv(wounds, assessments)], { type: 'text/csv;charset=utf-8' }), csvFileName());
    setMessage({ text: `CSV saved: ${assessments.length} assessments.`, tone: 'ok' });
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const parsed = parseBackup(await file.text());
      await getWoundStore().loadAll(parsed, 'merge');
      setMessage({
        text: `Imported ${parsed.wounds.length} wounds, ${parsed.assessments.length} assessments and ${parsed.photos.length} photos${parsed.exportedAt ? ` (backup of ${fmtDate(parsed.exportedAt)})` : ''}. Records already here with the same ID were replaced.`,
        tone: 'ok',
      });
      void requestPersistence();
      setVersion(v => v + 1);
      onChanged();
    } catch (e) {
      setMessage({ text: e instanceof BackupError ? e.message : 'Could not import this file.', tone: 'err' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Backup and data</h2>

      <Card className="space-y-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><HardDrive className="w-5 h-5" /> On this phone</h3>
        <p className="text-gray-700 tabular-nums">
          {counts.wounds} wounds · {counts.assessments} assessments · {counts.photos} photos
        </p>
        <p className="text-sm text-gray-600">Space used by this site: {formatBytes(state?.usageBytes ?? null)}{state?.quotaBytes ? ` of ${formatBytes(state.quotaBytes)} available` : ''}</p>
        <StorageBadge state={state} />
        {state && !state.persisted && state.supported && (
          <Button variant="secondary" className="w-full" onClick={keep}>Ask the browser to keep this data</Button>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold text-gray-900">Backup</h3>
        <p className="text-sm text-gray-600">
          Last backup: {lastBackup ? fmtDate(lastBackup) : 'never'}. A backup file holds everything, photos included.
          Open it on a new phone with “Import backup”.
        </p>
        <Button className="w-full" onClick={exportJson} disabled={busy}><Download className="w-5 h-5" /> Export backup (JSON)</Button>
        <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={busy}><Upload className="w-5 h-5" /> Import backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" data-testid="import-input"
          onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        <p className="text-xs text-gray-500">Importing adds to what is here. It does not delete anything.</p>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-semibold text-gray-900">Spreadsheet</h3>
        <p className="text-sm text-gray-600">One row per assessment, without photos.</p>
        <Button variant="secondary" className="w-full" onClick={exportCsv}><Table className="w-5 h-5" /> Export CSV</Button>
      </Card>

      {message && (
        <p role="status" className={`text-sm rounded-xl p-3 ${message.tone === 'ok' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
