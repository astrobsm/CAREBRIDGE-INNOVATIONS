/**
 * Persistent storage and usage on this browser.
 *
 * Without persistence the browser may clear the tool's data when the phone is
 * short of space. navigator.storage.persist() asks it not to; Chrome usually
 * grants it silently for a site that is used or installed, Firefox asks.
 */

export interface StorageState {
  supported: boolean;
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
}

type StorageLike = {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
};

function storageApi(): StorageLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { storage?: StorageLike }).storage ?? null;
}

export async function readStorageState(): Promise<StorageState> {
  const s = storageApi();
  if (!s) return { supported: false, persisted: null, usageBytes: null, quotaBytes: null };
  let persisted: boolean | null = null;
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  try { persisted = s.persisted ? await s.persisted() : null; } catch { /* unknown */ }
  try {
    const e = s.estimate ? await s.estimate() : null;
    usageBytes = typeof e?.usage === 'number' ? e.usage : null;
    quotaBytes = typeof e?.quota === 'number' ? e.quota : null;
  } catch { /* unknown */ }
  return { supported: Boolean(s.persist), persisted, usageBytes, quotaBytes };
}

/** Ask the browser to keep this site's data. Resolves to whether it agreed. */
export async function requestPersistence(): Promise<boolean> {
  const s = storageApi();
  if (!s?.persist) return false;
  try {
    if (s.persisted && (await s.persisted())) return true;
    return await s.persist();
  } catch {
    return false;
  }
}

export function formatBytes(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return 'unknown';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const LAST_BACKUP_KEY = 'astrohealth-wound-tool.lastBackupAt';

export function getLastBackupAt(): string | null {
  try { return localStorage.getItem(LAST_BACKUP_KEY); } catch { return null; }
}

export function setLastBackupAt(iso: string): void {
  try { localStorage.setItem(LAST_BACKUP_KEY, iso); } catch { /* private mode */ }
}

/** Save a Blob as a download on this device. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
