/**
 * Manual scale calibration — drag a line across a reference object of known
 * size, and the app derives pixels-per-centimetre exactly.
 *
 * WHY THIS EXISTS
 * Tracing reads the scale from the printed green marker. When that marker is
 * not in frame, the trace could only be recorded in pixels — an area with no
 * real size. Automatic coin and card detection is possible but unreliable on a
 * wound photo (shadow, angle and skin tone all defeat circle finding), whereas
 * dragging across an object whose size is known exactly is both simple and
 * accurate.
 *
 * ACCURACY NOTES, which the UI states plainly rather than hiding:
 *  - The marker must lie in the SAME PLANE as the wound. A coin resting on the
 *    trunk while the wound is on a limb is nearer the camera and will
 *    over-estimate scale.
 *  - Photograph square to the surface. An oblique angle foreshortens the marker
 *    and inflates every measurement derived from it.
 *
 * Drawn from the decoded photograph when given one: re-loading a photo from an
 * object URL can fail silently on Android, which left this canvas black.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, Move, RotateCcw, X } from 'lucide-react';

/**
 * Real-world sizes in centimetres. The card figures are the ISO/IEC 7810 ID-1
 * dimensions used by every bank and ID card, which makes a card the most
 * reliably available object in a clinic.
 *
 * Cards and rulers only, by clinical decision (2026-10-20). Coins are absent:
 * the published Nigerian diameters disagree between sources, foreign coins are
 * not to hand, and a reference that is 10% off makes every area ~20% off.
 * "Other — enter size" remains for any object whose size has been measured.
 */
export const REFERENCE_OBJECTS: { id: string; label: string; cm: number; hint: string }[] = [
  { id: 'card', label: 'Bank / ID card (long edge)', cm: 8.56, hint: 'ISO ID-1 — 85.6 mm. The most dependable everyday marker.' },
  { id: 'card_short', label: 'Bank / ID card (short edge)', cm: 5.398, hint: 'ISO ID-1 — 53.98 mm.' },
  { id: 'ruler1', label: 'Ruler — 1 cm', cm: 1, hint: 'Mark exactly one centimetre.' },
  { id: 'ruler5', label: 'Ruler — 5 cm', cm: 5, hint: 'Longer spans give a more accurate scale.' },
  { id: 'ruler10', label: 'Ruler — 10 cm', cm: 10, hint: 'Best accuracy if a ruler is available.' },
  { id: 'custom', label: 'Other — enter size', cm: 0, hint: 'Any object whose real size you know.' },
];

/** Shorter than this on screen, and placement error dominates the scale. */
export const MIN_LINE_DISPLAY_PX = 20;

/**
 * Pixels per cm from a line drawn on a preview.
 *
 * The line is measured in DISPLAYED pixels and converted back to source pixels,
 * so the scale does not depend on how large the preview happened to be.
 */
export function scaleFromLine(
  displayLengthPx: number,
  displayWidthPx: number,
  naturalWidthPx: number,
  referenceCm: number,
): number {
  if (!(displayLengthPx > 0) || !(referenceCm > 0) || !(displayWidthPx > 0)) return 0;
  return (displayLengthPx * (naturalWidthPx / displayWidthPx)) / referenceCm;
}

interface Point { x: number; y: number }

interface Props {
  /** The decoded photograph. Preferred: drawing from it cannot fail. */
  source?: ImageBitmap | HTMLCanvasElement | null;
  /** Fallback when no decoded image is available. */
  imageUrl?: string | null;
  /** Natural pixel dimensions of the source image, for scaling the drawn line. */
  naturalWidth: number;
  naturalHeight: number;
  onCancel: () => void;
  /** Called with the derived scale. pixelsPerCm is in SOURCE image pixels. */
  onCalibrated: (result: { pixelsPerCm: number; referenceLabel: string; referenceCm: number }) => void;
}

export default function WoundCalibrationPicker({
  source, imageUrl, naturalWidth, naturalHeight, onCancel, onCalibrated,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<CanvasImageSource | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [refId, setRefId] = useState('card');
  const [customCm, setCustomCm] = useState('');

  const reference = REFERENCE_OBJECTS.find(r => r.id === refId)!;
  const referenceCm = refId === 'custom' ? parseFloat(customCm) || 0 : reference.cm;

  // Displayed size, so the drawn line can be mapped back to source pixels.
  const [display, setDisplay] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (source) { imgRef.current = source; setLoadError(false); draw(); return; }
    if (!imageUrl) { setLoadError(true); return; }
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (cancelled) return; imgRef.current = img; setLoadError(false); draw(); };
    img.onerror = () => { if (!cancelled) setLoadError(true); };
    img.src = imageUrl;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, imageUrl]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { draw(); }, [start, end, display]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !(naturalWidth > 0)) return;

    const maxW = Math.min(canvas.parentElement?.clientWidth || 480, 640);
    const scale = maxW / naturalWidth;
    const w = Math.round(naturalWidth * scale);
    const h = Math.round(naturalHeight * scale);
    if (w !== display.w || h !== display.h) setDisplay({ w, h });

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    if (start && end) {
      ctx.strokeStyle = '#0E9F6E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // End caps, so the exact endpoints are visible against a busy photo.
      for (const p of [start, end]) {
        ctx.fillStyle = '#0E9F6E';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // Pointer events: one code path for finger, stylus and mouse. Separate touch
  // and mouse handlers could reset the line on phones that also emit mouse events.
  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (display.w && rect.width ? display.w / rect.width : 1),
      y: (e.clientY - rect.top) * (display.h && rect.height ? display.h / rect.height : 1),
    };
  };

  const beginDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointFrom(e);
    setStart(p);
    setEnd(p);
    setDragging(true);
  };
  const moveDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    e.preventDefault();
    setEnd(pointFrom(e));
  };
  const endDrag = () => setDragging(false);

  const displayLength = start && end ? Math.hypot(end.x - start.x, end.y - start.y) : 0;
  const sourceLength = display.w > 0 ? displayLength * (naturalWidth / display.w) : 0;
  const pixelsPerCm = scaleFromLine(displayLength, display.w, naturalWidth, referenceCm);

  const tooShort = displayLength > 0 && displayLength < MIN_LINE_DISPLAY_PX;
  const canConfirm = pixelsPerCm > 0 && !tooShort;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Set the scale">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[96vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-900">Set the scale</h2>
          <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 sm:p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 flex gap-2">
            <Move className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Drag a line across your reference object.</p>
              <p className="text-xs mt-1">
                For a coin, drag across its full diameter. For a card, along the edge you select below.
                The marker must be lying on the same surface as the wound, and the photo taken square
                to that surface — an angled shot makes everything measure larger than it is.
              </p>
            </div>
          </div>

          {loadError && (
            <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              The photograph could not be displayed. Close this and take or upload the photo again.
            </p>
          )}
          <div className="border rounded-lg overflow-hidden bg-gray-900 flex justify-center">
            <canvas
              ref={canvasRef}
              className="touch-none cursor-crosshair max-w-full"
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference object</label>
              <select value={refId} onChange={e => setRefId(e.target.value)} className="input">
                {REFERENCE_OBJECTS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">{reference.hint}</p>
            </div>
            {refId === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Its real size (cm)</label>
                <input type="number" step="0.01" min="0" value={customCm} onChange={e => setCustomCm(e.target.value)} className="input" />
              </div>
            )}
          </div>

          {displayLength > 0 && (
            <div className={`rounded-lg p-3 text-sm ${tooShort ? 'bg-amber-50 border border-amber-300 text-amber-900' : 'bg-green-50 border border-green-200 text-green-900'}`}>
              {tooShort ? (
                <>The line is very short, so small errors in placement become large errors in size.
                  Use a longer reference such as a card edge or ruler.</>
              ) : pixelsPerCm > 0 ? (
                <>Scale: <span className="font-semibold">{pixelsPerCm.toFixed(1)} pixels per cm</span>
                  {' — '}a {referenceCm} cm reference measured {Math.round(sourceLength)} px.</>
              ) : (
                <>Enter the reference object's real size to set the scale.</>
              )}
            </div>
          )}

          {!displayLength && !loadError && (
            <p className="text-xs text-gray-500">Drag across the marker on the photograph above to continue.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCalibrated({ pixelsPerCm, referenceLabel: reference.label, referenceCm })}
              disabled={!canConfirm}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" /> Use this scale
            </button>
            <button
              type="button"
              onClick={() => { setStart(null); setEnd(null); }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border text-sm inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Redraw
            </button>
            <button type="button" onClick={onCancel} className="flex-1 sm:flex-none px-4 py-2 rounded-lg border text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
