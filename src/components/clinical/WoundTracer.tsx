/**
 * Trace a wound margin on a calibrated photograph, and get its true area.
 *
 * The clinician draws the boundary; the app does the arithmetic. Nobody types a
 * length, a width or a percentage — this is digital planimetry, the same method
 * as tracing onto acetate, which has been the clinical reference standard for
 * irregular wound area for decades.
 *
 * A real wound surface is not one thing. A donor site at day seven is patches
 * of new epithelium, patches still raw, and patches under slough, scattered
 * across the harvest. So the outline is traced once, and then each patch is
 * traced and labelled — as many as there are, in any order, added one at a time
 * with a running total visible throughout.
 *
 * Coordinates are kept in IMAGE pixel space, never display space. The canvas is
 * scaled by CSS to fit the screen, and a trace recorded in display pixels would
 * silently change area with the size of the window it was drawn in.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Redo2, Trash2, Undo2 } from 'lucide-react';
import {
  computePlanimetry,
  measureTrace,
  simplify,
  type Point,
  type SurfaceKind,
  type Trace,
  type TraceRole,
} from '../../services/planimetry';

export interface WoundTracerProps {
  /** The calibrated photograph, as a data URL or object URL. */
  imageSrc: string;
  /** Scale from calibration. Without it, areas cannot be given in cm². */
  pixelsPerCm: number | null;
  /**
   * Which patch types to offer. Defaults suit a plain wound; a donor site
   * wants raw/slough/epithelialised, a graft wants necrotic/slough.
   * Pass an empty array for outline-only tracing.
   */
  surfaceKinds?: SurfaceKind[];
  /** Existing traces, so an assessment can be reopened and added to. */
  initialTraces?: Trace[];
  /**
   * What the outline represents, when it is not a wound.
   *
   * The scar module traces a scar boundary, a patch of reference skin and an
   * original wound margin through this same component; labelling them all
   * 'Wound outline' would be wrong on screen and wrong in the stored trace.
   */
  outlineLabel?: string;
  /** Instruction shown while the outline is being drawn. */
  outlineInstruction?: string;
  onCancel: () => void;
  onComplete: (result: { traces: Trace[]; annotatedDataUrl: string }) => void;
}

const STYLE: Record<TraceRole, { stroke: string; fill: string; label: string }> = {
  // Cyan for the outline, matching the automatic contour overlay elsewhere in
  // the app, and safely distinct from the green calibration marker.
  total: { stroke: '#00E5FF', fill: 'rgba(0,229,255,0.10)', label: 'Wound outline' },
  raw: { stroke: '#FF5252', fill: 'rgba(255,82,82,0.24)', label: 'Raw' },
  slough: { stroke: '#FFD740', fill: 'rgba(255,215,64,0.24)', label: 'Slough' },
  epithelialised: { stroke: '#69F0AE', fill: 'rgba(105,240,174,0.22)', label: 'Epithelialised' },
  granulation: { stroke: '#FF80AB', fill: 'rgba(255,128,171,0.22)', label: 'Granulation' },
  necrotic: { stroke: '#B388FF', fill: 'rgba(179,136,255,0.24)', label: 'Necrotic' },
};

const DEFAULT_KINDS: SurfaceKind[] = ['raw', 'slough', 'epithelialised'];

export default function WoundTracer({
  imageSrc,
  pixelsPerCm,
  surfaceKinds = DEFAULT_KINDS,
  initialTraces,
  outlineLabel,
  outlineInstruction,
  onCancel,
  onComplete,
}: WoundTracerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);

  const [traces, setTraces] = useState<Trace[]>(initialTraces ?? []);
  const [current, setCurrent] = useState<Point[]>([]);
  const [role, setRole] = useState<TraceRole>(
    initialTraces?.some(t => t.role === 'total') ? (surfaceKinds[0] ?? 'total') : 'total',
  );
  const [redoStack, setRedoStack] = useState<Trace[]>([]);
  const [imageReady, setImageReady] = useState(false);

  const hasTotal = traces.some(t => t.role === 'total');

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setImageReady(true); };
    img.onerror = () => setImageReady(false);
    img.src = imageSrc;
  }, [imageSrc]);

  /**
   * Pointer event to image pixel coordinates.
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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Line weight scales with the image so a trace reads the same on a 1280px
    // frame and a 4000px one.
    const weight = Math.max(2, canvas.width / 400);

    const drawRing = (points: Point[], style: typeof STYLE[TraceRole], closed: boolean) => {
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
      // Dark casing under the colour so the line reads on pale skin and on dark
      // eschar alike.
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = weight * 2;
      ctx.stroke();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = weight;
      ctx.stroke();
    };

    // Outline first so patch fills sit above it.
    for (const t of traces.filter(t => t.role === 'total')) drawRing(t.points, STYLE.total, true);
    for (const t of traces.filter(t => t.role !== 'total')) drawRing(t.points, STYLE[t.role], true);
    if (current.length) drawRing(current, STYLE[role], false);
  }, [traces, current, role]);

  useEffect(() => { if (imageReady) redraw(); }, [imageReady, redraw]);

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
      // Drop sub-pixel moves: a finger produces many events in the same place
      // and they add nothing but storage.
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
          id: crypto.randomUUID(), role, points: simplified,
          label: role === 'total' ? (outlineLabel ?? STYLE.total.label) : STYLE[role].label,
        },
      ]);
      setRedoStack([]);
      return [];
    });

    // After the outline, patches are the likely next action. The chosen patch
    // type then STAYS selected, so several patches of the same surface can be
    // added one after another without reselecting each time.
    setRole(prev => (prev === 'total' ? (surfaceKinds[0] ?? 'total') : prev));
  }, [role, surfaceKinds]);

  const result = useMemo(
    () => computePlanimetry(traces, pixelsPerCm),
    [traces, pixelsPerCm],
  );

  const totalGeometry = useMemo(() => {
    const total = traces.find(t => t.role === 'total');
    return total ? measureTrace(total.points, pixelsPerCm) : null;
  }, [traces, pixelsPerCm]);

  const undo = () => setTraces(prev => {
    if (!prev.length) return prev;
    setRedoStack(r => [...r, prev[prev.length - 1]]);
    return prev.slice(0, -1);
  });

  const redo = () => setRedoStack(prev => {
    if (!prev.length) return prev;
    setTraces(t => [...t, prev[prev.length - 1]]);
    return prev.slice(0, -1);
  });

  const complete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onComplete({ traces, annotatedDataUrl: canvas.toDataURL('image/jpeg', 0.8) });
  };

  const fmtArea = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)} cm²`);
  const tracedKinds = surfaceKinds.filter(k => result.surfaces[k].patches > 0);

  return (
    <div className="space-y-3">
      {/* Palette. The outline is drawn once; patch types stay selected so
          several patches of the same surface can be added in succession. */}
      <div className="flex flex-wrap items-center gap-2">
        <PaletteButton
          active={role === 'total'} disabled={hasTotal}
          style={STYLE.total} onClick={() => setRole('total')}
          count={hasTotal ? 1 : 0}
        />
        {surfaceKinds.map(k => (
          <PaletteButton
            key={k}
            active={role === k}
            disabled={!hasTotal}
            style={STYLE[k]}
            onClick={() => setRole(k)}
            count={result.surfaces[k].patches}
          />
        ))}

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
          <button
            onClick={() => { setTraces([]); setRedoStack([]); setCurrent([]); setRole('total'); }}
            disabled={!traces.length}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            title="Clear all traces">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {!hasTotal
          ? (outlineInstruction
              ?? 'Draw around the edge of the whole wound. Release to close the outline.')
          : surfaceKinds.length
            ? `Now draw around each patch of ${STYLE[role as SurfaceKind]?.label.toLowerCase() ?? 'tissue'} — one at a time, as many as there are. A patch drawn inside another is treated as an island within it.`
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

      {/* Running totals — the numbers that will be recorded. */}
      <div className="rounded-xl border bg-white p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Metric label="Total area" value={fmtArea(result.totalAreaCm2)} strong />
          <Metric
            label="Perimeter"
            value={totalGeometry?.perimeterCm != null ? `${totalGeometry.perimeterCm.toFixed(1)} cm` : '—'}
          />
          <Metric
            label="Traced patches"
            value={result.classifiedAreaCm2 === null ? '—' : fmtArea(result.classifiedAreaCm2)}
          />
          <Metric
            label="Not traced"
            value={result.unclassifiedPercent === null ? '—' : `${result.unclassifiedPercent}%`}
          />
        </div>

        {tracedKinds.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            {tracedKinds.map(k => {
              const s = result.surfaces[k];
              return (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: STYLE[k].stroke }} />
                  <span className="text-gray-700">{STYLE[k].label}</span>
                  <span className="text-gray-400">
                    {s.patches} patch{s.patches === 1 ? '' : 'es'}
                  </span>
                  <span className="ml-auto tabular-nums text-gray-800">
                    {fmtArea(s.areaCm2)}{s.percent !== null ? ` · ${s.percent}%` : ''}
                  </span>
                </div>
              );
            })}
            {result.unclassifiedPercent !== null && result.unclassifiedPercent > 0 && (
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-gray-300" />
                <span className="text-gray-500">Not traced</span>
                <span className="ml-auto tabular-nums text-gray-500">
                  {fmtArea(result.unclassifiedAreaCm2)} · {result.unclassifiedPercent}%
                </span>
              </div>
            )}
          </div>
        )}

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

const PaletteButton: React.FC<{
  active: boolean;
  disabled?: boolean;
  style: { stroke: string; label: string };
  onClick: () => void;
  count: number;
}> = ({ active, disabled, style, onClick, count }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium border flex items-center gap-1.5 disabled:opacity-40 ${
      active ? 'border-transparent text-gray-900' : 'bg-white text-gray-700 border-gray-300'
    }`}
    style={active ? { backgroundColor: style.stroke } : undefined}
  >
    <Circle className="w-3 h-3" fill={style.stroke} strokeWidth={0} />
    {style.label}
    {count > 0 && (
      <span className={`text-[11px] tabular-nums ${active ? 'text-gray-700' : 'text-gray-400'}`}>
        ×{count}
      </span>
    )}
  </button>
);

const Metric: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
    <div className={`tabular-nums ${strong ? 'text-base font-semibold text-gray-900' : 'text-gray-700'}`}>
      {value}
    </div>
  </div>
);
