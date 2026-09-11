/**
 * Trace a wound margin on a calibrated photograph, and get its true area.
 *
 * The clinician draws the boundary; the app does the arithmetic. Nobody types a
 * length, a width or a percentage — this is digital planimetry, the same method
 * as tracing onto acetate, which has been the clinical reference standard for
 * irregular wound area for decades.
 *
 * Used for any wound: a raw wound outline gives total surface area and the
 * derived dimensions; a graft or donor site adds inner regions, so non-viable
 * graft and still-raw donor areas are subtracted from the whole.
 *
 * Coordinates are kept in IMAGE pixel space throughout, never display space.
 * The canvas is scaled by CSS to fit the screen, and a trace recorded in
 * display pixels would silently change area with the size of the window it was
 * drawn in.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Redo2, Trash2, Undo2 } from 'lucide-react';
import {
  computePlanimetry,
  measureTrace,
  simplify,
  type Point,
  type Trace,
  type TraceRole,
} from '../../services/planimetry';

export interface WoundTracerProps {
  /** The calibrated photograph, as a data URL or object URL. */
  imageSrc: string;
  /** Scale from calibration. Without it, areas cannot be given in cm². */
  pixelsPerCm: number | null;
  /**
   * What the inner regions mean for this site, which differs by context:
   * still-raw areas on a donor site, non-viable graft on a recipient site.
   * Omit for a plain wound, where only the outline is traced.
   */
  subregionLabel?: string;
  /** Existing traces, so an assessment can be reopened and adjusted. */
  initialTraces?: Trace[];
  onCancel: () => void;
  onComplete: (result: { traces: Trace[]; annotatedDataUrl: string }) => void;
}

const ROLE_STYLE: Record<TraceRole, { stroke: string; fill: string; label: string }> = {
  // Cyan for the outline, matching the automatic contour overlay elsewhere in
  // the app, and safely distinct from the green calibration marker.
  total: { stroke: '#00E5FF', fill: 'rgba(0,229,255,0.12)', label: 'Whole wound' },
  subregion: { stroke: '#FF5252', fill: 'rgba(255,82,82,0.22)', label: 'Inner region' },
  island: { stroke: '#FFD740', fill: 'rgba(255,215,64,0.22)', label: 'Healed island' },
};

export default function WoundTracer({
  imageSrc,
  pixelsPerCm,
  subregionLabel,
  initialTraces,
  onCancel,
  onComplete,
}: WoundTracerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);

  const [traces, setTraces] = useState<Trace[]>(initialTraces ?? []);
  const [current, setCurrent] = useState<Point[]>([]);
  const [role, setRole] = useState<TraceRole>(initialTraces?.length ? 'subregion' : 'total');
  const [redoStack, setRedoStack] = useState<Trace[]>([]);
  const [imageReady, setImageReady] = useState(false);

  const hasTotal = traces.some(t => t.role === 'total');

  // ── Image ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setImageReady(true); };
    img.onerror = () => setImageReady(false);
    img.src = imageSrc;
  }, [imageSrc]);

  /**
   * Convert a pointer event to image pixel coordinates.
   *
   * The canvas backing store is the image's natural size while CSS scales it to
   * fit; without this conversion every trace would be recorded at whatever size
   * the element happened to be rendered at.
   */
  const toImagePoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  // ── Rendering ────────────────────────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Line weight scales with the image so a trace is equally visible on a
    // 1280px frame and a 4000px one.
    const weight = Math.max(2, canvas.width / 400);

    const drawRing = (points: Point[], style: typeof ROLE_STYLE[TraceRole], closed: boolean) => {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (closed) {
        ctx.closePath();
        ctx.fillStyle = style.fill;
        ctx.fill();
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // Dark casing under the colour so the line reads on pale skin and on
      // dark eschar alike.
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = weight * 2;
      ctx.stroke();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = weight;
      ctx.stroke();
    };

    for (const t of traces) drawRing(t.points, ROLE_STYLE[t.role], true);
    if (current.length) drawRing(current, ROLE_STYLE[role], false);
  }, [traces, current, role]);

  useEffect(() => { if (imageReady) redraw(); }, [imageReady, redraw]);

  // ── Drawing ──────────────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toImagePoint(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setCurrent([p]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const p = toImagePoint(e);
    if (!p) return;
    setCurrent(prev => {
      const last = prev[prev.length - 1];
      // Drop points closer than a pixel: a finger produces many events in the
      // same place and they add nothing but storage.
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1) return prev;
      return [...prev, p];
    });
  };

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    setCurrent(points => {
      // A closed ring needs three distinct points; a tap or a stray drag is
      // discarded rather than stored as a zero-area trace.
      if (points.length < 3) return [];
      const simplified = simplify(points);
      if (simplified.length < 3) return [];

      setTraces(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role,
          points: simplified,
          label: role === 'subregion' ? subregionLabel : ROLE_STYLE[role].label,
        },
      ]);
      setRedoStack([]);
      return [];
    });

    // After the outline, inner regions are the likely next action.
    setRole(prev => (prev === 'total' ? 'subregion' : prev));
  }, [role, subregionLabel]);

  // ── Derived measurements, live ───────────────────────────────────────────

  const result = useMemo(
    () => computePlanimetry(traces, pixelsPerCm),
    [traces, pixelsPerCm],
  );

  /** Dimensions of the outline, for the wounds that only need an outline. */
  const totalGeometry = useMemo(() => {
    const total = traces.find(t => t.role === 'total');
    return total ? measureTrace(total.points, pixelsPerCm) : null;
  }, [traces, pixelsPerCm]);

  const undo = () => {
    setTraces(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setTraces(t => [...t, last]);
      return prev.slice(0, -1);
    });
  };

  const complete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onComplete({ traces, annotatedDataUrl: canvas.toDataURL('image/jpeg', 0.8) });
  };

  const fmtArea = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)} cm²`);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['total', 'subregion'] as const).map(r => {
          if (r === 'subregion' && !subregionLabel) return null;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              disabled={r === 'total' && hasTotal}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-1.5 disabled:opacity-40 ${
                role === r ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300'
              }`}
              style={role === r ? { backgroundColor: ROLE_STYLE[r].stroke, color: '#00323a' } : undefined}
            >
              <Circle className="w-3 h-3" fill={ROLE_STYLE[r].stroke} strokeWidth={0} />
              {r === 'total' ? 'Wound outline' : subregionLabel}
            </button>
          );
        })}

        <div className="ml-auto flex gap-1">
          <button onClick={undo} disabled={!traces.length}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            title="Undo last trace">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={!redoStack.length}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            title="Redo">
            <Redo2 className="w-4 h-4" />
          </button>
          <button onClick={() => { setTraces([]); setRedoStack([]); setCurrent([]); setRole('total'); }}
            disabled={!traces.length}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            title="Clear all traces">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {!hasTotal
          ? 'Draw around the edge of the wound. Release to close the outline.'
          : subregionLabel
            ? `Outline traced. Now draw around any ${subregionLabel.toLowerCase()}, or save.`
            : 'Outline traced. Adjust it, or save.'}
      </p>

      <div className="rounded-xl overflow-hidden border bg-gray-900">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          // touch-none stops the browser scrolling the page while a finger is
          // drawing, which otherwise makes tracing on a phone impossible.
          className="w-full touch-none cursor-crosshair block"
        />
      </div>

      {/* Live measurements. These are the numbers that will be recorded. */}
      <div className="rounded-xl border bg-white p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Metric label="Total area" value={fmtArea(result.totalAreaCm2)} strong />
          {subregionLabel ? (
            <>
              <Metric label={subregionLabel} value={fmtArea(result.subregionAreaCm2)} />
              <Metric label="Remaining" value={fmtArea(result.remainderAreaCm2)} />
              <Metric
                label="Proportion"
                value={result.remainderPercent === null ? '—' : `${result.remainderPercent}%`}
                strong
              />
            </>
          ) : (
            <>
              <Metric label="Perimeter"
                value={totalGeometry?.perimeterCm === null || !totalGeometry
                  ? '—' : `${totalGeometry.perimeterCm!.toFixed(1)} cm`} />
              <Metric label="Traces" value={String(traces.length)} />
              <Metric label="Scale"
                value={pixelsPerCm ? `${pixelsPerCm.toFixed(1)} px/cm` : 'not calibrated'} />
            </>
          )}
        </div>

        {result.problems.length > 0 && (
          <ul className="mt-2 space-y-1">
            {result.problems.map((p, i) => (
              <li key={i} className="text-xs text-amber-700">{p}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={complete}
          disabled={!result.valid}
          className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> Use these measurements
        </button>
      </div>
    </div>
  );
}

const Metric: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
    <div className={`tabular-nums ${strong ? 'text-base font-semibold text-gray-900' : 'text-gray-700'}`}>
      {value}
    </div>
  </div>
);
