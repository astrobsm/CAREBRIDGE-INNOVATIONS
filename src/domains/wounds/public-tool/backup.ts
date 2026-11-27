/**
 * Backup file: everything on this phone as one JSON file, so a clinician can
 * move to a new phone or keep a copy. Photos are embedded as base64.
 */

import type { ToolAssessment, ToolPhoto, ToolWound } from './types';

export const BACKUP_FORMAT = 'astrohealth-wound-measure-backup';
export const BACKUP_VERSION = 1;

/** A photo inside a backup file. */
export type BackupPhoto = Omit<ToolPhoto, 'blob'> & { base64: string };

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  app: string;
  wounds: ToolWound[];
  assessments: ToolAssessment[];
  photos: BackupPhoto[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function buildBackup(data: {
  wounds: ToolWound[];
  assessments: ToolAssessment[];
  photos: ToolPhoto[];
}, exportedAt = new Date()): Promise<BackupFile> {
  const photos: BackupPhoto[] = [];
  for (const p of data.photos) {
    const { blob, ...meta } = p;
    photos.push({ ...meta, base64: await blobToBase64(blob) });
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    app: 'AstroHEALTH Wound Measure',
    wounds: data.wounds,
    assessments: data.assessments,
    photos,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Read a backup file's text back into records. Throws BackupError with a
 * plain message when the file is not a backup from this tool.
 */
export function parseBackup(text: string): {
  wounds: ToolWound[];
  assessments: ToolAssessment[];
  photos: ToolPhoto[];
  exportedAt: string;
} {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('This file is not a Wound Measure backup (it is not valid JSON).');
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) {
    throw new BackupError('This file is not a Wound Measure backup.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version. Open the tool online to update it, then try again.');
  }
  const wounds = Array.isArray(raw.wounds) ? raw.wounds : [];
  const assessments = Array.isArray(raw.assessments) ? raw.assessments : [];
  const photos = Array.isArray(raw.photos) ? raw.photos : [];

  const woundRows = wounds.filter((w): w is ToolWound =>
    isObj(w) && isStr(w.id) && typeof w.patientLabel === 'string' && typeof w.site === 'string');
  const woundIds = new Set(woundRows.map(w => w.id));
  const assessmentRows = assessments.filter((a): a is ToolAssessment =>
    isObj(a) && isStr(a.id) && isStr(a.woundId) && woundIds.has(a.woundId) &&
    typeof a.areaCm2 === 'number' && isStr(a.assessedAt));
  const assessmentIds = new Set(assessmentRows.map(a => a.id));

  const photoRows: ToolPhoto[] = [];
  for (const p of photos) {
    if (!isObj(p) || !isStr(p.id) || !isStr(p.assessmentId) || !assessmentIds.has(p.assessmentId)) continue;
    if (!isStr(p.base64)) continue;
    const { base64, ...meta } = p as unknown as BackupPhoto;
    try {
      const mimeType = isStr(meta.mimeType) ? meta.mimeType : 'image/jpeg';
      photoRows.push({ ...meta, mimeType, blob: base64ToBlob(base64, mimeType) });
    } catch {
      // A damaged photo is skipped; its measurements are still imported.
    }
  }

  // An assessment whose photo did not survive keeps its numbers, not the link.
  const photoIds = new Set(photoRows.map(p => p.id));
  for (const a of assessmentRows) {
    if (a.photoId && !photoIds.has(a.photoId)) delete a.photoId;
  }

  return {
    wounds: woundRows,
    assessments: assessmentRows,
    photos: photoRows,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
  };
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `wound-measure-backup-${d}.json`;
}
