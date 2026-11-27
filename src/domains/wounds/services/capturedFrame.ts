/**
 * The captured wound frame: downscaling, the stored reference photograph and
 * the traced outline in cm.
 *
 * Browser canvas helpers, with no database, sync or auth dependency. Moved out
 * of WoundProgressMonitorPage unchanged so the public no-login wound tool
 * (src/domains/wounds/public-tool) produces exactly the same stored frame as
 * the EMR monitor.
 */

import type { Point } from '../../../services/planimetry';

/**
 * Longest edge of the stored reference photograph, in pixels.
 *
 * Measurement runs on the full-resolution frame; only the kept copy is reduced.
 * 1280 px still shows the wound bed and lets the calibration marker be read by
 * eye, at roughly 120-200 KB per assessment instead of the 3-6 MB a raw phone
 * frame costs — which matters because these ride a synced JSONB column.
 */
export const REFERENCE_PHOTO_MAX_PX = 1280;

/**
 * Build the stored reference frame: the photograph, downscaled, with the
 * detected wound margin traced on top and a 1 cm scale bar when the scale is
 * known.
 *
 * The outline is the point. An area of 5 cm2 means nothing on its own — it is
 * believable only if the boundary it was computed from actually follows the
 * wound edge. Drawing it makes that checkable at a glance, and makes a bad
 * segmentation (caught skin, missed undermined edge, split into two regions)
 * obvious instead of silently becoming a number in the record.
 *
 * The outline is drawn in cyan, deliberately: it reads clearly against red
 * granulation, yellow slough and black eschar alike, and — unlike a green line —
 * it cannot be mistaken for the calibration marker if this frame is ever passed
 * back through the detector.
 */
export function renderReferencePhoto(
  source: HTMLCanvasElement,
  contourPoints: Array<{ x: number; y: number }> | undefined,
  pxPerCmFull: number | null,
  maxEdge: number,
): { dataUrl: string; width: number; height: number; contourDrawn: boolean; points: number } {
  const longest = Math.max(source.width, source.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) {
    return {
      dataUrl: source.toDataURL('image/jpeg', 0.6),
      width: source.width, height: source.height,
      contourDrawn: false, points: 0,
    };
  }

  // Smoothing matters: a nearest-neighbour reduction would alias the marker's
  // edges, and reading the marker is half of what this photo is for.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  const pts = (contourPoints || []).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
  let contourDrawn = false;

  if (pts.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scale, pts[i].y * scale);
    ctx.closePath();

    const stroke = Math.max(1.5, width / 500);

    // Dark casing first, then the bright line over it, so the outline stays
    // readable over pale skin and over dark eschar without a fill that would
    // hide the wound bed being judged.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = stroke * 2.2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
    ctx.lineWidth = stroke;
    ctx.stroke();

    contourDrawn = true;
  }

  // A 1 cm bar makes the calibration visible too, so the frame carries both
  // halves of the claim: this is the boundary, and this is what 1 cm looked like.
  const pxPerCmScaled = pxPerCmFull && pxPerCmFull > 0 ? pxPerCmFull * scale : 0;
  if (pxPerCmScaled > 4 && pxPerCmScaled < width * 0.8) {
    const pad = Math.round(width * 0.03);
    const y = height - pad;
    const barH = Math.max(3, height / 220);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(pad - 2, y - barH - 2, pxPerCmScaled + 4, barH + 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(pad, y - barH, pxPerCmScaled, barH);

    const fontPx = Math.max(10, Math.round(height / 45));
    ctx.font = `600 ${fontPx}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = Math.max(2, fontPx / 6);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeText('1 cm', pad, y - barH - 3);
    ctx.fillText('1 cm', pad, y - barH - 3);
  }

  return { dataUrl: out.toDataURL('image/jpeg', 0.78), width, height, contourDrawn, points: pts.length };
}

/**
 * Downscale an existing data URL, for frames that arrive already rendered —
 * the guided capture hands back an annotated image rather than a canvas.
 */
export function downscaleDataUrl(
  src: string,
  maxEdge: number,
): Promise<{ dataUrl: string; width: number; height: number; originalWidth: number } | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) { resolve(null); return; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      // Reuse the same reducer so both capture paths produce identical output.
      const shot = renderReferencePhoto(canvas, undefined, null, maxEdge);
      resolve({ dataUrl: shot.dataUrl, width: shot.width, height: shot.height, originalWidth: w });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Longest edge of the frame traced on — enough to follow a wound edge, light enough to redraw. */
export const TRACE_FRAME_MAX_PX = 1600;

/**
 * A downscaled copy of the frame for tracing, kept decoded.
 *
 * The tracing and scale screens draw from this canvas directly. Re-loading the
 * photograph from an object URL failed on Android (the camera file can already
 * be released), which left those screens blank.
 */
export function prepareTraceFrame(
  source: HTMLCanvasElement,
  maxEdge: number,
): { canvas: HTMLCanvasElement; dataUrl: string; width: number; height: number } {
  const longest = Math.max(source.width, source.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const out = document.createElement('canvas');
  out.width = Math.round(source.width * scale);
  out.height = Math.round(source.height * scale);
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, out.width, out.height);
  }
  return { canvas: out, dataUrl: out.toDataURL('image/jpeg', 0.85), width: out.width, height: out.height };
}

/**
 * The traced outline in cm, centred on its area-weighted centroid — the form
 * the serial healing map overlays visit on visit.
 */
export function contourCmFromPx(points: Point[], pxPerCm: number): Point[] {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross; cx += (p.x + q.x) * cross; cy += (p.y + q.y) * cross;
  }
  let c: Point;
  if (Math.abs(a) < 1e-9) {
    c = {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  } else {
    c = { x: cx / (3 * a), y: cy / (3 * a) };
  }
  return points.map(p => ({
    x: Math.round(((p.x - c.x) / pxPerCm) * 100) / 100,
    y: Math.round(((p.y - c.y) / pxPerCm) * 100) / 100,
  }));
}

/** Rough byte size of a data URL, for showing how much a photo costs. */
export function dataUrlBytes(dataUrl?: string): number {
  if (!dataUrl) return 0;
  const i = dataUrl.indexOf(',');
  return i < 0 ? 0 : Math.floor(((dataUrl.length - i - 1) * 3) / 4);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
