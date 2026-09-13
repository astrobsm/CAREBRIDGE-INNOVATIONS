/**
 * Crop a clinical photograph before it is measured.
 *
 * WHY THIS MATTERS FOR MEASUREMENT, NOT JUST FRAMING
 * A photograph taken a step too close fails the quality gate because the
 * subject runs off the edge — but the scar and the marker may both still be
 * fully inside the frame, with only surrounding anatomy clipped. Cropping to
 * what is actually being measured turns a rejected frame into a usable one
 * without retaking it, and lets the clinician square the crop on the lesion so
 * the traced region fills the working area.
 *
 * THE RULE THAT KEEPS THIS HONEST
 * Cropping changes the pixels the calibration marker is detected from, so the
 * scale MUST be re-derived from the cropped image rather than carried over.
 * A crop that excludes the marker leaves the image uncalibrated, and this
 * component says so rather than letting a stale pixels-per-cm survive a crop
 * it no longer describes. The caller re-runs the gate and marker detection on
 * whatever comes out of here.
 *
 * The original photograph is never modified — the crop produces a new canvas,
 * and the untouched frame stays in the record.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crop as CropIcon, RotateCcw, Square, Maximize } from 'lucide-react';

export interface CropResult {
  canvas: HTMLCanvasElement;
  /** Where the crop sits in the original, so a trace can be mapped back. */
  rect: { x: number; y: number; width: number; height: number };
  /** Fraction of the original area kept, for the record. */
  retainedFraction: number;
}

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (result: CropResult) => void;
  /** Locks the crop to a square, which suits a lesion-centred view. */
  defaultSquare?: boolean;
}

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'move' | null;

/** Smallest crop worth allowing: below this, resolution is being thrown away. */
const MIN_SIDE_PX = 80;

const ImageCropper: React.FC<Props> = ({
  imageSrc, onCancel, onComplete, defaultSquare = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [square, setSquare] = useState(defaultSquare);

  /** Crop rectangle in IMAGE pixel space, so it survives any display scaling. */
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  const drag = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origin: { x: number; y: number; w: number; h: number };
  } | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      // Start at the middle 80%: almost always what a too-close frame needs,
      // and it makes the handles immediately visible rather than flush to the
      // edges where they are hard to grab.
      const inset = 0.1;
      setRect({
        x: Math.round(img.naturalWidth * inset),
        y: Math.round(img.naturalHeight * inset),
        w: Math.round(img.naturalWidth * (1 - inset * 2)),
        h: Math.round(img.naturalHeight * (1 - inset * 2)),
      });
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = canvas.width / natural.w;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const r = {
      x: rect.x * scale, y: rect.y * scale, w: rect.w * scale, h: rect.h * scale,
    };

    // Dim everything outside the crop so the kept region reads clearly.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, r.y);
    ctx.fillRect(0, r.y + r.h, canvas.width, canvas.height - (r.y + r.h));
    ctx.fillRect(0, r.y, r.x, r.h);
    ctx.fillRect(r.x + r.w, r.y, canvas.width - (r.x + r.w), r.h);

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Rule-of-thirds guides, which double as a squaring aid.
    ctx.strokeStyle = 'rgba(0,229,255,0.28)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r.x + (r.w / 3) * i, r.y);
      ctx.lineTo(r.x + (r.w / 3) * i, r.y + r.h);
      ctx.moveTo(r.x, r.y + (r.h / 3) * i);
      ctx.lineTo(r.x + r.w, r.y + (r.h / 3) * i);
      ctx.stroke();
    }

    // Corner handles.
    const s = 12;
    ctx.fillStyle = '#00E5FF';
    for (const [hx, hy] of [
      [r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h],
    ]) {
      ctx.fillRect(hx - s / 2, hy - s / 2, s, s);
    }
  }, [rect, natural]);

  useEffect(() => { draw(); }, [draw, loaded]);

  // ── Pointer handling, all in image-pixel space ────────────────────────────
  const toImage = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    const scale = natural.w / box.width;
    return {
      x: (e.clientX - box.left) * scale,
      y: (e.clientY - box.top) * scale,
    };
  };

  const hitHandle = (p: { x: number; y: number }): Handle => {
    // Generous in image pixels so the grab area stays finger-sized on a phone.
    const tol = Math.max(natural.w, natural.h) * 0.04;
    const near = (ax: number, ay: number) =>
      Math.abs(p.x - ax) < tol && Math.abs(p.y - ay) < tol;

    if (near(rect.x, rect.y)) return 'nw';
    if (near(rect.x + rect.w, rect.y)) return 'ne';
    if (near(rect.x, rect.y + rect.h)) return 'sw';
    if (near(rect.x + rect.w, rect.y + rect.h)) return 'se';
    if (p.x > rect.x && p.x < rect.x + rect.w && p.y > rect.y && p.y < rect.y + rect.h) {
      return 'move';
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = toImage(e);
    const handle = hitHandle(p);
    if (!handle) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { handle, startX: p.x, startY: p.y, origin: { ...rect } };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toImage(e);
    const d = drag.current;
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    const o = d.origin;

    let next = { ...rect };

    if (d.handle === 'move') {
      next = {
        x: Math.min(Math.max(0, o.x + dx), natural.w - o.w),
        y: Math.min(Math.max(0, o.y + dy), natural.h - o.h),
        w: o.w, h: o.h,
      };
    } else {
      // Corner drags move the grabbed corner and leave the opposite one fixed.
      let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
      if (d.handle === 'nw') { x0 = o.x + dx; y0 = o.y + dy; }
      if (d.handle === 'ne') { x1 = o.x + o.w + dx; y0 = o.y + dy; }
      if (d.handle === 'sw') { x0 = o.x + dx; y1 = o.y + o.h + dy; }
      if (d.handle === 'se') { x1 = o.x + o.w + dx; y1 = o.y + o.h + dy; }

      x0 = Math.max(0, Math.min(x0, x1 - MIN_SIDE_PX));
      y0 = Math.max(0, Math.min(y0, y1 - MIN_SIDE_PX));
      x1 = Math.min(natural.w, Math.max(x1, x0 + MIN_SIDE_PX));
      y1 = Math.min(natural.h, Math.max(y1, y0 + MIN_SIDE_PX));

      next = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };

      if (square) {
        // Keep the grabbed corner anchored while forcing equal sides.
        const side = Math.min(next.w, next.h);
        if (d.handle === 'nw') { next = { x: x1 - side, y: y1 - side, w: side, h: side }; }
        if (d.handle === 'ne') { next = { x: x0, y: y1 - side, w: side, h: side }; }
        if (d.handle === 'sw') { next = { x: x1 - side, y: y0, w: side, h: side }; }
        if (d.handle === 'se') { next = { x: x0, y: y0, w: side, h: side }; }
      }
    }

    setRect({
      x: Math.round(next.x), y: Math.round(next.y),
      w: Math.round(next.w), h: Math.round(next.h),
    });
  };

  const endDrag = () => { drag.current = null; };

  // ── Actions ───────────────────────────────────────────────────────────────
  const reset = () => {
    setRect({ x: 0, y: 0, w: natural.w, h: natural.h });
  };

  const makeSquare = () => {
    const side = Math.min(rect.w, rect.h);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    setRect({
      x: Math.round(Math.max(0, Math.min(cx - side / 2, natural.w - side))),
      y: Math.round(Math.max(0, Math.min(cy - side / 2, natural.h - side))),
      w: Math.round(side), h: Math.round(side),
    });
    setSquare(true);
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img) return;

    // Crop at full source resolution: downscaling here would throw away the
    // detail the marker detector and the focus check both rely on.
    const out = document.createElement('canvas');
    out.width = rect.w;
    out.height = rect.h;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

    onComplete({
      canvas: out,
      rect: { x: rect.x, y: rect.y, width: rect.w, height: rect.h },
      retainedFraction: (rect.w * rect.h) / (natural.w * natural.h),
    });
  };

  const retained = natural.w > 0 ? (rect.w * rect.h) / (natural.w * natural.h) : 1;
  const displayWidth = 900;

  return (
    <div className="space-y-3">
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
        <p className="text-sm text-sky-900 font-medium">
          Crop to the lesion and the calibration marker.
        </p>
        <p className="text-xs text-sky-800 mt-1">
          Keep the whole green marker inside the crop — the scale is measured from it again
          afterwards, so a marker left outside leaves the photograph uncalibrated and no size can
          be reported. The original photograph is kept unchanged.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={makeSquare}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
            square ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <Square className="w-3.5 h-3.5" /> Square
        </button>
        <button
          onClick={() => setSquare(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
            !square ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <Maximize className="w-3.5 h-3.5" /> Free
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Whole frame
        </button>
        <span className="ml-auto text-xs text-gray-500 self-center tabular-nums">
          {rect.w} × {rect.h} px · {Math.round(retained * 100)}% of the frame kept
        </span>
      </div>

      <div className="rounded-xl overflow-hidden border bg-gray-900">
        <canvas
          ref={canvasRef}
          width={displayWidth}
          height={natural.h > 0 ? Math.round((displayWidth * natural.h) / natural.w) : 600}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="w-full touch-none cursor-crosshair block"
        />
      </div>

      {retained < 0.08 && (
        <p className="text-xs text-amber-700">
          This is a very tight crop. Cropping does not add detail — if the lesion is only a few
          hundred pixels across, the measurement will be coarse however tightly it is framed.
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={apply}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" /> Use this crop
        </button>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <CropIcon className="w-3 h-3" />
        Drag inside the box to move it, or a corner to resize.
      </p>
    </div>
  );
};

export default ImageCropper;
