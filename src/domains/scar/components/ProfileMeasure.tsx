/**
 * Measure scar elevation from a tangential photograph.
 *
 * Two marks, in the order a clinician would make them:
 *   1. tap either side of the lesion along the skin line — the reference surface
 *   2. trace the raised outline standing above it
 *
 * The skin line is marked rather than assumed because the alternative is to
 * guess it, and every way of guessing fails on exactly the lesion this is for.
 * Taking the widest chord of the outline works for a broad flat scar and is
 * badly wrong for a pedunculated earlobe keloid, where the longest dimension is
 * the stalk, not the base. Two taps cost a second and remove the guess.
 *
 * Height is drawn on the image as it is measured, so the number on screen can
 * be checked against the picture rather than taken on trust.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Move, Ruler, RotateCcw, Undo2 } from 'lucide-react';
import type { Point } from '../../../services/planimetry';
import { simplify } from '../../../services/planimetry';
import { measureProfile, describeProfile, type ProfileMeasurement } from '../services/profileElevation';

interface Props {
  imageSrc: string;
  pixelsPerCm: number | null;
  /** From the en-face photograph, for the volume estimate. */
  planAreaCm2?: number | null;
  onCancel: () => void;
  onComplete: (result: {
    baseline: [Point, Point];
    outline: Point[];
    tangentialConfirmed: boolean;
    measurement: ProfileMeasurement;
    annotatedDataUrl: string;
  }) => void;
}

type Stage = 'baseline' | 'outline' | 'done';

const SKIN_LINE = '#FFD740';
const OUTLINE = '#00E5FF';
const HEIGHT_LINE = '#FF4081';

const ProfileMeasure: React.FC<Props> = ({
  imageSrc, pixelsPerCm, planAreaCm2, onCancel, onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState<Stage>('baseline');

  const [baseline, setBaseline] = useState<Point[]>([]);
  const [outline, setOutline] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [tangential, setTangential] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // ── Live measurement ──────────────────────────────────────────────────────
  const measurement = useMemo<ProfileMeasurement | null>(() => {
    if (baseline.length < 2 || outline.length < 6) return null;
    return measureProfile({
      baseline: [baseline[0], baseline[1]],
      profile: outline,
      pixelsPerCm,
      planAreaCm2,
    });
  }, [baseline, outline, pixelsPerCm, planAreaCm2]);

  /**
   * Where the tallest point sits, so the height can be drawn on the picture.
   * Recomputed here rather than returned from the measurement so the service
   * stays free of anything to do with rendering.
   */
  const peak = useMemo(() => {
    if (baseline.length < 2 || outline.length < 3) return null;
    const [a, b] = baseline;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1) return null;

    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let nx = -uy, ny = ux;

    const mean = outline.reduce(
      (s, p) => s + ((p.x - a.x) * nx + (p.y - a.y) * ny), 0,
    ) / outline.length;
    if (mean < 0) { nx = -nx; ny = -ny; }

    let best: Point | null = null;
    let bestH = 0;
    let foot: Point | null = null;
    for (const p of outline) {
      const dx = p.x - a.x, dy = p.y - a.y;
      const h = dx * nx + dy * ny;
      if (h > bestH) {
        bestH = h;
        best = p;
        const t = dx * ux + dy * uy;
        foot = { x: a.x + ux * t, y: a.y + uy * t };
      }
    }
    return best && foot ? { apex: best, foot } : null;
  }, [baseline, outline]);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !natural.w) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = canvas.width / natural.w;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const P = (p: Point) => ({ x: p.x * s, y: p.y * s });

    // Skin line, extended across the frame so it reads as a reference plane.
    if (baseline.length >= 2) {
      const a = P(baseline[0]);
      const b = P(baseline[1]);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ex = (dx / len) * canvas.width;
      const ey = (dy / len) * canvas.width;

      ctx.strokeStyle = SKIN_LINE;
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x - ex, a.y - ey);
      ctx.lineTo(b.x + ex, b.y + ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const p of baseline) {
      const q = P(p);
      ctx.fillStyle = SKIN_LINE;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Raised outline.
    if (outline.length > 1) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(0,229,255,0.16)';
      ctx.beginPath();
      const first = P(outline[0]);
      ctx.moveTo(first.x, first.y);
      for (const p of outline.slice(1)) {
        const q = P(p);
        ctx.lineTo(q.x, q.y);
      }
      if (!drawing) { ctx.closePath(); ctx.fill(); }
      ctx.stroke();
    }

    // The measured height, drawn where it was taken.
    if (peak && !drawing) {
      const apex = P(peak.apex);
      const foot = P(peak.foot);
      ctx.strokeStyle = HEIGHT_LINE;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(foot.x, foot.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.stroke();

      if (measurement?.maxElevationMm != null) {
        const label = `${measurement.maxElevationMm} mm`;
        ctx.font = 'bold 16px system-ui, sans-serif';
        const w = ctx.measureText(label).width;
        const mx = (apex.x + foot.x) / 2 + 10;
        const my = (apex.y + foot.y) / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(mx - 4, my - 14, w + 8, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, mx, my);
      }
    }
  }, [natural, baseline, outline, drawing, peak, measurement]);

  useEffect(() => { draw(); }, [draw]);

  // ── Input, in image-pixel space ───────────────────────────────────────────
  const toImage = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    const scale = natural.w / box.width;
    return { x: (e.clientX - box.left) * scale, y: (e.clientY - box.top) * scale };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!natural.w) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toImage(e);

    if (stage === 'baseline') {
      const next = [...baseline, p].slice(-2);
      setBaseline(next);
      if (next.length === 2) setStage('outline');
      return;
    }
    setDrawing(true);
    setOutline([p]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing || stage !== 'outline') return;
    setOutline(prev => [...prev, toImage(e)]);
  };

  const onPointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    // Same simplification the wound tracer uses, so a traced ring here has the
    // same point density as one traced anywhere else in the app.
    setOutline(prev => (prev.length > 3 ? simplify(prev) : prev));
    setStage('done');
  };

  // ── Finish ────────────────────────────────────────────────────────────────
  const finish = () => {
    if (!measurement?.measured || baseline.length < 2) return;
    const canvas = canvasRef.current;
    onComplete({
      baseline: [baseline[0], baseline[1]],
      outline,
      tangentialConfirmed: tangential,
      measurement,
      annotatedDataUrl: canvas ? canvas.toDataURL('image/jpeg', 0.85) : '',
    });
  };

  const undo = () => {
    if (stage === 'done' || outline.length) { setOutline([]); setStage('outline'); return; }
    setBaseline(prev => prev.slice(0, -1));
    setStage('baseline');
  };

  const reset = () => { setBaseline([]); setOutline([]); setStage('baseline'); };

  const instruction = stage === 'baseline'
    ? `Tap the skin line on ${baseline.length === 0 ? 'one side' : 'the other side'} of the lesion.`
    : stage === 'outline'
      ? 'Now trace around the raised part, from skin to skin. Release to close it.'
      : 'Check the height drawn on the image, then confirm the view.';

  const displayWidth = 900;

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-sm text-amber-900 font-medium">{instruction}</p>
        <p className="text-xs text-amber-800 mt-1">
          The skin line is the reference the height is measured from. Marking it yourself is what
          keeps this right on a lesion whose tallest dimension is not its widest — a pedunculated
          keloid being exactly that case.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border bg-gray-900">
        <canvas
          ref={canvasRef}
          width={displayWidth}
          height={natural.h > 0 ? Math.round((displayWidth * natural.h) / natural.w) : 600}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="w-full touch-none cursor-crosshair block"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={undo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Start again
        </button>
        <span className="ml-auto self-center text-xs text-gray-500">
          {pixelsPerCm != null
            ? `Calibrated: ${pixelsPerCm.toFixed(1)} px/cm`
            : 'Not calibrated — no height in millimetres'}
        </span>
      </div>

      {measurement && (
        <div className={`rounded-xl border p-3 ${
          measurement.measured ? 'bg-white' : 'bg-amber-50 border-amber-200'
        }`}>
          {measurement.measured ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Max elevation" value={measurement.maxElevationMm} unit="mm" bold />
                <Stat label="Mean elevation" value={measurement.meanElevationMm} unit="mm" />
                <Stat label="Cross-section" value={measurement.crossSectionAreaCm2} unit="cm²" />
                <Stat label="Volume (estimated)" value={measurement.estimatedVolumeCm3} unit="cm³" />
              </div>
              <ul className="mt-2 space-y-0.5">
                {describeProfile(measurement).map((l, i) => (
                  <li key={i} className="text-xs text-gray-600">{l}</li>
                ))}
              </ul>
            </>
          ) : null}
          <ul className="mt-2 space-y-0.5">
            {measurement.limitations.map((l, i) => (
              <li key={i} className="text-xs text-amber-700">{l}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The one thing the software cannot check for itself. */}
      <label className="flex items-start gap-2 bg-gray-50 border rounded-lg p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={tangential}
          onChange={e => setTangential(e.target.checked)}
          className="mt-0.5 accent-indigo-600"
        />
        <span className="text-sm text-gray-700">
          This photograph was taken edge-on to the lesion.
          <span className="block text-xs text-gray-500 mt-0.5">
            An oblique view foreshortens the height, and nothing in the image reveals that it
            happened. Without this confirmation the measurement is recorded as low quality and no
            elevation is published to the trend.
          </span>
        </span>
      </label>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={finish}
          disabled={!measurement?.measured}
          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" /> Use this measurement
        </button>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        {stage === 'baseline' ? <Move className="w-3 h-3" /> : <Ruler className="w-3 h-3" />}
        Elevation is measured perpendicular to the skin line you marked, converted by the green marker.
      </p>
    </div>
  );
};

const Stat: React.FC<{
  label: string; value: number | null; unit: string; bold?: boolean;
}> = ({ label, value, unit, bold }) => (
  <div>
    <div className="text-xs text-gray-400">{label}</div>
    <div className={`tabular-nums text-gray-900 ${bold ? 'text-xl font-semibold' : 'text-base'}`}>
      {value == null ? <span className="text-gray-300 text-sm">—</span> : value}
      {value != null && <span className="text-xs text-gray-400 ml-1">{unit}</span>}
    </div>
  </div>
);

export default ProfileMeasure;
