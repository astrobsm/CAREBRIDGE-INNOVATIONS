/**
 * New assessment: photograph, calibrate, measure, confirm, save.
 *
 * Reuses the EMR monitor's on-device measurement as-is:
 *   - trace:  detectCalibrationMarker + WoundTracer (+ WoundCalibrationPicker
 *             when no marker is found), measured by planimetry
 *   - auto:   aiWoundMeasurement.measureWound (TensorFlow.js + native CV)
 *   - guided: CalibratedWoundCapture
 *   - manual: length x width typed in
 * There is no AI/Claude step here: nothing leaves the phone.
 */

import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { AlertTriangle, Camera, Loader2, Ruler } from 'lucide-react';
import type { CalibratedMeasurement } from '../../../../services/woundMeasurementEngine';
import {
  computePlanimetry, measureTrace, tissueComposition, traceDimensionsCm,
  type Point, type SurfaceKind, type Trace, type TissueRemainder,
} from '../../../../services/planimetry';
import {
  REFERENCE_PHOTO_MAX_PX, TRACE_FRAME_MAX_PX,
  contourCmFromPx, downscaleDataUrl, prepareTraceFrame, renderReferencePhoto,
} from '../../services/capturedFrame';
import { base64ToBlob } from '../backup';
import { getWoundStore } from '../toolDb';
import { ellipseAreaCm2, ValidationError } from '../store';
import type {
  ExudateAmount, ExudateType, MeasureMethod, NewAssessmentInput, NewPhotoInput, TissueType, ToolWound,
} from '../types';
import { Button, Chip, Field, NumberInput, inputClass } from './ui';

const WoundTracer = lazy(() => import('../../../../components/clinical/WoundTracer'));
const WoundCalibrationPicker = lazy(() => import('../../components/WoundCalibrationPicker'));
const CalibratedWoundCapture = lazy(() => import('../../components/CalibratedWoundCapture'));

const WOUND_TRACE_KINDS: SurfaceKind[] = ['granulation', 'slough', 'necrotic', 'epithelialised'];
const TISSUE_TYPES: TissueType[] = ['epithelial', 'granulation', 'slough', 'necrotic', 'eschar'];
const EXUDATE_AMOUNTS: ExudateAmount[] = ['none', 'light', 'moderate', 'heavy'];
const EXUDATE_TYPES: ExudateType[] = ['serous', 'sanguineous', 'serosanguineous', 'purulent'];

const MODES: Array<{ id: MeasureMethod; label: string }> = [
  { id: 'trace', label: 'Photo + trace' },
  { id: 'auto', label: 'Photo + auto' },
  { id: 'guided', label: 'Guided' },
  { id: 'manual', label: 'Type it in' },
];

interface TraceSource {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  pxPerCm: number | null;
  scaleLabel?: string;
  suggestedOutline?: Point[] | null;
}

/** The photo that will be saved, as a data URL until saving. */
interface PendingPhoto {
  dataUrl: string;
  widthPx?: number;
  heightPx?: number;
  pixelsPerCm?: number | null;
  hasContourOverlay?: boolean;
}

type Fields = Partial<Omit<NewAssessmentInput, 'woundId' | 'assessedAt' | 'method' | 'scaleReliable'>>;

const round = (v: number) => Math.round(v * 10) / 10;

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The chosen day as an ISO time: now if today, otherwise midday that day. */
function assessedAtFor(day: string): string {
  if (day === todayLocal()) return new Date().toISOString();
  return new Date(`${day}T12:00:00`).toISOString();
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] || 'image/jpeg';
  return base64ToBlob(dataUrl.slice(comma + 1), mime);
}

async function decodeFile(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read the photo.');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return canvas;
}

export default function AssessmentForm({
  wound, onSaved, onCancel,
}: { wound: ToolWound; onSaved: () => void; onCancel: () => void }) {
  const [mode, setMode] = useState<MeasureMethod>('trace');
  const [method, setMethod] = useState<MeasureMethod>('manual');
  const [day, setDay] = useState(todayLocal());
  const [f, setF] = useState<Fields>({});
  const [scaleReliable, setScaleReliable] = useState(false);
  const [calibType, setCalibType] = useState('none');
  const [photo, setPhoto] = useState<PendingPhoto | null>(null);
  const [traceSource, setTraceSource] = useState<TraceSource | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [areaTouched, setAreaTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tracingPxPerCm = traceSource?.pxPerCm ?? null;

  const set = (patch: Fields) => setF(prev => ({ ...prev, ...patch }));

  /** Photo for tracing: only the scale is automatic; the clinician draws the edge. */
  const prepareTrace = useCallback(async (file: File) => {
    setBusy('Reading the marker…');
    setError('');
    setWarnings([]);
    try {
      const canvas = await decodeFile(file);
      let pxPerCm: number | null = null;
      let calibMethod = 'none';
      try {
        const { detectCalibrationMarker } = await import('../../../../services/woundMeasurementEngine');
        const cal = await detectCalibrationMarker(canvas);
        if (cal?.pixelsPerCm) { pxPerCm = cal.pixelsPerCm; calibMethod = cal.method; }
      } catch (e) {
        console.warn('[WoundTool] Calibration failed:', e);
      }
      if (!pxPerCm) {
        setWarnings(['No green marker found. Tap “Set scale” and drag across a card or ruler in the photo.']);
      }
      setScaleReliable(Boolean(pxPerCm));
      setCalibType(calibMethod);
      const frame = prepareTraceFrame(canvas, TRACE_FRAME_MAX_PX);
      const ratio = frame.width / canvas.width;
      setTraceSource({ ...frame, pxPerCm: pxPerCm ? round(pxPerCm * ratio) : null, scaleLabel: pxPerCm ? calibMethod : undefined });
    } catch (e) {
      setError((e as Error)?.message || 'Could not read the photo.');
    } finally {
      setBusy(null);
    }
  }, []);

  /** Photo measured automatically on the phone. */
  const autoMeasure = useCallback(async (file: File) => {
    setBusy('Measuring on this phone…');
    setError('');
    setWarnings([]);
    try {
      const canvas = await decodeFile(file);
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { aiWoundMeasurement } = await import('../../services/aiWoundMeasurement');
      await aiWoundMeasurement.initialize();
      const result = await aiWoundMeasurement.measureWound(imageData);
      setScaleReliable(Boolean(result.scaleReliable));
      setCalibType(result.calibrationMethod || 'none');
      setWarnings(result.warnings || []);
      const shot = renderReferencePhoto(canvas, result.contourPoints, result.measurements?.calibrationFactor ?? null, REFERENCE_PHOTO_MAX_PX);
      const ratio = shot.width / canvas.width;
      setPhoto({
        dataUrl: shot.dataUrl, widthPx: shot.width, heightPx: shot.height,
        pixelsPerCm: result.measurements?.calibrationFactor ? round(result.measurements.calibrationFactor * ratio) : null,
        hasContourOverlay: shot.contourDrawn,
      });
      // Keep the frame so the outline can be checked by tracing.
      const frame = prepareTraceFrame(canvas, TRACE_FRAME_MAX_PX);
      const tRatio = frame.width / canvas.width;
      const autoScale = result.scaleReliable && result.measurements?.calibrationFactor
        ? result.measurements.calibrationFactor * tRatio : null;
      setTraceSource({
        ...frame,
        pxPerCm: autoScale ? round(autoScale) : null,
        scaleLabel: autoScale ? result.calibrationMethod : undefined,
        suggestedOutline: result.contourPoints?.length > 2
          ? result.contourPoints.map(p => ({ x: p.x * tRatio, y: p.y * tRatio })) : null,
      });
      setF(prev => ({
        ...prev,
        lengthCm: round(result.length), widthCm: round(result.width),
        areaCm2: round(result.area), perimeterCm: round(result.perimeter),
        granulationPct: result.tissue ? round(result.tissue.granulation) : prev.granulationPct,
        sloughPct: result.tissue ? round(result.tissue.slough) : prev.sloughPct,
        necroticPct: result.tissue ? round(result.tissue.necrotic) : prev.necroticPct,
        epithelialPct: result.tissue ? round(result.tissue.epithelial) : prev.epithelialPct,
        contourCm: result.contourCm,
      }));
      setMethod('auto');
    } catch (e) {
      setError((e as Error)?.message || 'Could not measure the photo. Try tracing or type the size in.');
    } finally {
      setBusy(null);
    }
  }, []);

  const applyTrace = useCallback(
    ({ traces, annotatedDataUrl, remainder }: { traces: Trace[]; annotatedDataUrl: string; remainder?: TissueRemainder }) => {
      const total = traces.find(t => t.role === 'total');
      if (!total) return;
      const geometry = measureTrace(total.points, tracingPxPerCm);
      const planimetry = computePlanimetry(traces, tracingPxPerCm);
      const dims = traceDimensionsCm(total.points, tracingPxPerCm);
      const tissueTraced = traces.some(t => t.role !== 'total');
      const composition = tissueTraced || (remainder && remainder !== 'unassigned')
        ? tissueComposition(traces, tracingPxPerCm, remainder ?? 'unassigned') : null;
      setF(prev => ({
        ...prev,
        areaCm2: planimetry.totalAreaCm2 ?? prev.areaCm2,
        perimeterCm: geometry.perimeterCm ?? prev.perimeterCm,
        lengthCm: dims ? round(dims.lengthCm) : prev.lengthCm,
        widthCm: dims ? round(dims.widthCm) : prev.widthCm,
        contourCm: tracingPxPerCm ? contourCmFromPx(total.points, tracingPxPerCm) : prev.contourCm,
        ...(composition ? {
          granulationPct: composition.percent.granulation,
          sloughPct: composition.percent.slough,
          necroticPct: composition.percent.necrotic,
          epithelialPct: composition.percent.epithelialised,
        } : {}),
      }));
      // Compress the annotated frame for storage, like the other paths.
      downscaleDataUrl(annotatedDataUrl, REFERENCE_PHOTO_MAX_PX).then(shot => {
        const ratio = shot ? shot.width / Math.max(1, shot.originalWidth) : 1;
        setPhoto({
          dataUrl: shot?.dataUrl ?? annotatedDataUrl,
          widthPx: shot?.width, heightPx: shot?.height,
          pixelsPerCm: tracingPxPerCm ? round(tracingPxPerCm * ratio) : null,
          hasContourOverlay: true,
        });
      }).catch(() => setPhoto({ dataUrl: annotatedDataUrl, pixelsPerCm: tracingPxPerCm, hasContourOverlay: true }));
      setMethod('trace');
      setTraceSource(null);
    },
    [tracingPxPerCm],
  );

  const applyManualScale = useCallback(({ pixelsPerCm, referenceLabel }: { pixelsPerCm: number; referenceLabel: string }) => {
    setShowCalibration(false);
    setTraceSource(prev => (prev ? { ...prev, pxPerCm: round(pixelsPerCm), scaleLabel: referenceLabel } : prev));
    setScaleReliable(true);
    setCalibType(`manual:${referenceLabel}`);
    setWarnings([]);
  }, []);

  const applyGuided = useCallback((result: CalibratedMeasurement) => {
    const t = result.tissueComposition;
    setScaleReliable(true);
    setCalibType(result.calibration?.method || 'manual_points');
    setF(prev => ({
      ...prev,
      lengthCm: round(result.lengthCm), widthCm: round(result.widthCm),
      areaCm2: round(result.areaCm2), perimeterCm: round(result.perimeterCm),
      depthCm: result.depthCm != null ? round(result.depthCm) : prev.depthCm,
      granulationPct: t ? round(t.granulationPercent) : prev.granulationPct,
      sloughPct: t ? round(t.sloughPercent) : prev.sloughPct,
      necroticPct: t ? round(t.necroticPercent) : prev.necroticPct,
      epithelialPct: t ? round(t.epithelialPercent) : prev.epithelialPct,
    }));
    const source = result.annotatedImageDataUrl || result.imageDataUrl;
    if (source) {
      downscaleDataUrl(source, REFERENCE_PHOTO_MAX_PX).then(shot => {
        if (!shot) return;
        const ratio = shot.width / Math.max(1, shot.originalWidth);
        setPhoto({
          dataUrl: shot.dataUrl, widthPx: shot.width, heightPx: shot.height,
          pixelsPerCm: result.calibration?.pixelsPerCm ? round(result.calibration.pixelsPerCm * ratio) : null,
          hasContourOverlay: Boolean(result.annotatedImageDataUrl),
        });
      }).catch(() => { /* keep the numbers without the photo */ });
    }
    setMethod('guided');
    setMode('manual');
  }, []);

  const pickPhoto = () => fileRef.current?.click();
  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (mode === 'auto') void autoMeasure(file);
    else void prepareTrace(file);
  };

  // Typed length and width give an ellipse area until the area is typed.
  const setLW = (patch: Pick<Fields, 'lengthCm' | 'widthCm'>) => {
    setF(prev => {
      const next = { ...prev, ...patch };
      if (!areaTouched && method === 'manual' && next.lengthCm && next.widthCm) {
        next.areaCm2 = ellipseAreaCm2(next.lengthCm, next.widthCm);
      }
      return next;
    });
  };

  const toggleTissue = (t: TissueType) =>
    setF(prev => {
      const cur = prev.tissueTypes ?? [];
      const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t];
      return { ...prev, tissueTypes: next.length ? next : undefined };
    });

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const input: NewAssessmentInput = {
        woundId: wound.id,
        assessedAt: assessedAtFor(day),
        areaCm2: Number(f.areaCm2),
        lengthCm: f.lengthCm, widthCm: f.widthCm, perimeterCm: f.perimeterCm, depthCm: f.depthCm,
        granulationPct: f.granulationPct, sloughPct: f.sloughPct, necroticPct: f.necroticPct, epithelialPct: f.epithelialPct,
        tissueTypes: f.tissueTypes, exudateAmount: f.exudateAmount, exudateType: f.exudateType, notes: f.notes,
        method,
        calibrationMethod: method === 'manual' ? 'ruler (typed)' : calibType,
        // A typed measurement is the clinician's own ruler reading.
        scaleReliable: method === 'manual' ? true : scaleReliable,
        contourCm: method === 'manual' ? undefined : f.contourCm,
      };
      const photoInput: NewPhotoInput | null = photo && method !== 'manual'
        ? {
          blob: dataUrlToBlob(photo.dataUrl), widthPx: photo.widthPx, heightPx: photo.heightPx,
          pixelsPerCm: photo.pixelsPerCm, hasContourOverlay: photo.hasContourOverlay,
        }
        : null;
      await getWoundStore().addAssessment(input, photoInput);
      onSaved();
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Could not save on this phone. Check storage space.');
      setSaving(false);
    }
  };

  const measured = method !== 'manual' && Number(f.areaCm2) > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">New assessment</h2>
        <p className="text-sm text-gray-600">{wound.patientLabel} · {wound.site}</p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="How to measure">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => { setMode(m.id); setError(''); }}
            className={`min-h-[48px] rounded-xl text-sm font-semibold border ${
              mode === m.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="photo-input"
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }}
      />

      {(mode === 'trace' || mode === 'auto') && !traceSource && (
        <button
          type="button"
          onClick={pickPhoto}
          disabled={Boolean(busy)}
          className="w-full py-8 border-2 border-dashed border-teal-400 rounded-2xl text-teal-800 bg-teal-50/40 flex flex-col items-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
          <span className="text-base font-semibold">{busy ?? 'Take or choose a photo'}</span>
          <span className="text-sm text-gray-600 px-4 text-center">
            Put the green marker or a ruler flat beside the wound. It sets the scale.
          </span>
        </button>
      )}

      {mode === 'trace' && traceSource && (
        <div className="space-y-3">
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">
              <b>Scale:</b>{' '}
              {tracingPxPerCm
                ? <span className="text-green-800">set ({tracingPxPerCm.toFixed(1)} px/cm{traceSource.scaleLabel ? `, ${traceSource.scaleLabel}` : ''})</span>
                : <span className="text-amber-800">not set</span>}
            </span>
            <Button variant={tracingPxPerCm ? 'secondary' : 'primary'} className="!min-h-[44px] text-sm" onClick={() => setShowCalibration(true)}>
              <Ruler className="w-4 h-4" /> {tracingPxPerCm ? 'Reset scale' : 'Set scale'}
            </Button>
          </div>
          <p className="text-sm text-gray-600">Draw round the wound edge, then any tissue areas if you wish.</p>
          <Suspense fallback={<div className="h-48 bg-gray-100 rounded-xl animate-pulse" />}>
            <WoundTracer
              source={traceSource.canvas}
              imageSrc={traceSource.dataUrl}
              pixelsPerCm={tracingPxPerCm}
              surfaceKinds={WOUND_TRACE_KINDS}
              suggestedOutline={traceSource.suggestedOutline}
              assignRemainder
              onCancel={() => setTraceSource(null)}
              onComplete={applyTrace}
            />
          </Suspense>
          {showCalibration && (
            <Suspense fallback={null}>
              <WoundCalibrationPicker
                source={traceSource.canvas}
                imageUrl={traceSource.dataUrl}
                naturalWidth={traceSource.width}
                naturalHeight={traceSource.height}
                onCancel={() => setShowCalibration(false)}
                onCalibrated={applyManualScale}
              />
            </Suspense>
          )}
        </div>
      )}

      {mode === 'auto' && traceSource && (
        <div className="space-y-2">
          <Button variant="secondary" className="w-full" onClick={pickPhoto} disabled={Boolean(busy)}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />} {busy ?? 'Use another photo'}
          </Button>
          <Button variant="ghost" className="w-full border border-gray-300" onClick={() => setMode('trace')}>
            Check the outline by tracing
          </Button>
        </div>
      )}

      {mode === 'guided' && (
        <Suspense fallback={<div className="h-48 bg-gray-100 rounded-xl animate-pulse" />}>
          <div className="max-w-full overflow-x-hidden">
            <CalibratedWoundCapture
              woundId={wound.id}
              onCancel={() => setMode('trace')}
              onMeasurementComplete={applyGuided}
            />
          </div>
        </Suspense>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((w, i) => (
            <li key={i} className="text-sm text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{w}
            </li>
          ))}
        </ul>
      )}

      {measured && (
        <p className={`text-sm font-medium ${scaleReliable ? 'text-green-800' : 'text-amber-800'}`}>
          {scaleReliable ? 'Measured against the scale in the photo.' : 'No reliable scale: the size is approximate. Check it below.'}
        </p>
      )}

      {photo && method !== 'manual' && (
        <div className="flex gap-3 items-start">
          <img src={photo.dataUrl} alt="Photo saved with this assessment" className="w-28 h-28 object-cover rounded-xl border" />
          <p className="text-sm text-gray-600">
            This photo is saved with the assessment, on this phone only.
            {photo.hasContourOverlay ? ' Check the outline follows the wound edge.' : ''}
          </p>
        </div>
      )}

      <section className="space-y-3 border-t pt-4">
        <h3 className="text-base font-semibold text-gray-900">
          Measurements {mode === 'manual' && method === 'manual' ? '(type them in)' : '(check or correct)'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Length (cm)"><NumberInput ariaLabel="Length (cm)" value={f.lengthCm} onChange={v => { if (method !== 'manual') set({ lengthCm: v }); else setLW({ lengthCm: v }); }} /></Field>
          <Field label="Width (cm)"><NumberInput ariaLabel="Width (cm)" value={f.widthCm} onChange={v => { if (method !== 'manual') set({ widthCm: v }); else setLW({ widthCm: v }); }} /></Field>
          <Field label="Area (cm²) *" hint={mode === 'manual' && method === 'manual' && !areaTouched ? 'Worked out from L × W (ellipse)' : undefined}>
            <NumberInput ariaLabel="Area (cm²)" step="0.01" value={f.areaCm2} onChange={v => { setAreaTouched(true); set({ areaCm2: v ?? undefined }); }} />
          </Field>
          <Field label="Perimeter (cm)"><NumberInput ariaLabel="Perimeter (cm)" value={f.perimeterCm} onChange={v => set({ perimeterCm: v })} /></Field>
          <Field label="Depth (cm)"><NumberInput ariaLabel="Depth (cm)" value={f.depthCm} onChange={v => set({ depthCm: v })} placeholder="optional" /></Field>
          <Field label="Date">
            <input type="date" className={inputClass} value={day} max={todayLocal()} onChange={e => setDay(e.target.value || todayLocal())} />
          </Field>
        </div>
      </section>

      <section className="space-y-3 border-t pt-4">
        <h3 className="text-base font-semibold text-gray-900">Wound bed</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Granulation %"><NumberInput ariaLabel="Granulation %" step="1" value={f.granulationPct} onChange={v => set({ granulationPct: v })} /></Field>
          <Field label="Slough %"><NumberInput ariaLabel="Slough %" step="1" value={f.sloughPct} onChange={v => set({ sloughPct: v })} /></Field>
          <Field label="Necrotic %"><NumberInput ariaLabel="Necrotic %" step="1" value={f.necroticPct} onChange={v => set({ necroticPct: v })} /></Field>
          <Field label="Epithelial %"><NumberInput ariaLabel="Epithelial %" step="1" value={f.epithelialPct} onChange={v => set({ epithelialPct: v })} /></Field>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-800 mb-1">Tissue present</span>
          <div className="flex flex-wrap gap-2">
            {TISSUE_TYPES.map(t => (
              <Chip key={t} active={Boolean(f.tissueTypes?.includes(t))} onClick={() => toggleTissue(t)}>{t}</Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exudate amount">
            <select className={inputClass} value={f.exudateAmount ?? ''} onChange={e => set({ exudateAmount: (e.target.value || undefined) as ExudateAmount | undefined })}>
              <option value="">Not recorded</option>
              {EXUDATE_AMOUNTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Exudate type">
            <select className={inputClass} value={f.exudateType ?? ''} onChange={e => set({ exudateType: (e.target.value || undefined) as ExudateType | undefined })}>
              <option value="">Not recorded</option>
              {EXUDATE_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className={`${inputClass} py-2 min-h-[88px]`}
            value={f.notes ?? ''}
            onChange={e => set({ notes: e.target.value })}
            placeholder="Edges, peri-wound skin, dressing…"
          />
        </Field>
      </section>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sticky bottom-0 bg-gray-50 py-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving || Boolean(busy)}>
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Save
        </Button>
      </div>
    </div>
  );
}
