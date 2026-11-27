/**
 * Choose and compress the photos a review link carries.
 *
 * Each image is redrawn on a canvas at most 1024 px on its long edge and
 * saved as JPEG (quality 0.8): ~100–400 kB, and redrawing drops any EXIF
 * (GPS, device) the original carried. Newest first, until 20 photos or
 * ~6 MB, whichever comes first; the rest are counted and named in the
 * snapshot so the reviewer knows they exist.
 */

import { PHOTO_POLICY, photoNote, type PhotoCandidate } from './summaryBuilder';

export interface CompressedPhoto {
  caption?: string;
  source: string;
  takenAt?: string;
  mime: 'image/jpeg';
  /** base64 without the data: prefix. */
  data: string;
  width: number;
  height: number;
  bytes: number;
}

export type Compressor = (dataUrl: string) => Promise<{ dataUrl: string; width: number; height: number }>;

/** Browser compressor: draw on a canvas, export JPEG. */
export const canvasCompressor: Compressor = (dataUrl) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, PHOTO_POLICY.maxEdgePx / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('No canvas')); return; }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    resolve({ dataUrl: canvas.toDataURL('image/jpeg', PHOTO_POLICY.jpegQuality), width, height });
  };
  img.onerror = () => reject(new Error('Image could not be read'));
  img.src = dataUrl;
});

const base64Bytes = (b64: string) => Math.floor((b64.length * 3) / 4);

export async function selectAndCompressPhotos(
  candidates: PhotoCandidate[],
  compress: Compressor = canvasCompressor,
  onProgress?: (done: number, of: number) => void,
): Promise<{ photos: CompressedPhoto[]; total: number; note?: string }> {
  const total = candidates.length;
  const photos: CompressedPhoto[] = [];
  let bytes = 0;
  let reason: 'count' | 'size' | 'failed' | undefined;
  const tryList = candidates.slice(0, PHOTO_POLICY.maxPhotos + 10);
  for (let i = 0; i < tryList.length; i++) {
    if (photos.length >= PHOTO_POLICY.maxPhotos) { reason = 'count'; break; }
    const c = tryList[i];
    onProgress?.(photos.length, Math.min(total, PHOTO_POLICY.maxPhotos));
    try {
      const out = await compress(c.dataUrl);
      const data = out.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      if (data === out.dataUrl || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) { reason ??= 'failed'; continue; }
      const size = base64Bytes(data);
      if (bytes + size > PHOTO_POLICY.maxTotalBytes) { reason = 'size'; break; }
      bytes += size;
      photos.push({ caption: c.caption, source: c.source, takenAt: c.takenAt, mime: 'image/jpeg', data, width: out.width, height: out.height, bytes: size });
    } catch {
      reason ??= 'failed';
    }
  }
  if (photos.length < total && !reason) reason = 'count';
  return { photos, total, note: photoNote(photos.length, total, reason) };
}
