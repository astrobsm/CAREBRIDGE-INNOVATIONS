/**
 * The assessment workflow: capture → measure → examine → ask → score → review.
 *
 * Ordered the way the encounter actually runs. The photograph is taken while
 * the dressing is off, the examination happens with hands already on the
 * patient, and the patient answers for themselves before anyone shows them a
 * score. Nothing is finalized until a clinician has seen the whole assessment
 * and confirmed it.
 *
 * THE TWO TRACES
 * The scar boundary gives geometry. The reference skin gives colour something
 * to be measured against — without it, colour analysis is skipped entirely
 * rather than falling back to absolute values that cannot be read across skin
 * tones. The workflow asks for both, and says why.
 */

import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, Hand, Palette,
  Ruler, User, ClipboardCheck,
} from 'lucide-react';
import { assessCanvasQuality } from '../../../services/imageQualityService';
import { detectCalibrationMarker } from '../../../services/woundMeasurementEngine';
import type { Trace } from '../../../services/planimetry';
import type {
  ScarCase, ScarImage, ScarRegionTrace, ScarPhysicalExam, ScarPatientReported,
  ValidatedScoreEntry, ScarAssessment, CaptureConditions,
} from '../types';
import { measureScar, suggestClassification } from '../services/scarMorphometry';
import { analyseScarColour, describeColour } from '../services/colourAnalysis';
import { unavailableMeasurement, describe3DStatus } from '../services/reconstruction3d';
import { scalesFor } from '../data/scales';
import { buildScoreEntry, saveAssessment, completenessOf, judgeQuality } from '../services/scarService';
import ScaleForm from './ScaleForm';

const WoundTracer = lazy(() => import('../../../components/clinical/WoundTracer'));

type Step = 'capture' | 'trace_scar' | 'trace_reference' | 'exam' | 'patient' | 'scales' | 'review';

const STEP_ORDER: Step[] = ['capture', 'trace_scar', 'trace_reference', 'exam', 'patient', 'scales', 'review'];

const STEP_META: Record<Step, { label: string; Icon: typeof Camera }> = {
  capture: { label: 'Photograph', Icon: Camera },
  trace_scar: { label: 'Scar boundary', Icon: Ruler },
  trace_reference: { label: 'Reference skin', Icon: Palette },
  exam: { label: 'Examination', Icon: Hand },
  patient: { label: 'Patient report', Icon: User },
  scales: { label: 'Scales', Icon: ClipboardCheck },
  review: { label: 'Review', Icon: Check },
};

interface Props {
  scar: ScarCase;
  userId?: string;
  onCancel: () => void;
  onSaved: (assessment: ScarAssessment) => void;
}

interface Prepared {
  dataUrl: string;
  width: number;
  height: number;
  pixelsPerCm: number | null;
  quality: ReturnType<typeof assessCanvasQuality>;
  /** Kept for colour sampling; not persisted. */
  pixels: Uint8ClampedArray;
}

const AssessmentWizard: React.FC<Props> = ({ scar, userId, onCancel, onSaved }) => {
  const [step, setStep] = useState<Step>('capture');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [scarTrace, setScarTrace] = useState<Trace | null>(null);
  const [scarAnnotated, setScarAnnotated] = useState<string | null>(null);
  const [referenceTrace, setReferenceTrace] = useState<Trace | null>(null);
  const [exam, setExam] = useState<ScarPhysicalExam>({});
  const [patientReported, setPatientReported] = useState<ScarPatientReported>({});
  const [scaleResponses, setScaleResponses] = useState<Record<string, Record<string, number>>>({});
  const [notes, setNotes] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const isKeloid = scar.classification.clinician === 'keloid';
  const scales = useMemo(() => scalesFor(isKeloid), [isKeloid]);

  // ── Derived measurements, recomputed as traces arrive ─────────────────────
  const morphometry = useMemo(() => {
    if (!scarTrace || !prepared) return null;
    return measureScar({
      scarPolygon: scarTrace.points,
      pixelsPerCm: prepared.pixelsPerCm,
      originalWoundAreaCm2: scar.originalWoundAreaCm2,
      qualityGateVersion: prepared.quality.version,
    });
  }, [scarTrace, prepared, scar.originalWoundAreaCm2]);

  const colour = useMemo(() => {
    if (!scarTrace || !referenceTrace || !prepared) return null;
    return analyseScarColour({
      data: prepared.pixels,
      width: prepared.width,
      height: prepared.height,
      scarPolygon: scarTrace.points,
      referencePolygon: referenceTrace.points,
      qualityGateVersion: prepared.quality.version,
      imageQualityScore: prepared.quality.score,
    });
  }, [scarTrace, referenceTrace, prepared]);

  /**
   * Suggestions for the image-derived scale items.
   *
   * Offered, never applied. The clinician's answer is what is stored, and the
   * suggestion is shown with the measurement behind it so it can be judged
   * rather than accepted reflexively.
   */
  const suggestions = useMemo(() => {
    if (!colour) return {};
    const out: Record<string, { value: number; basis: string }> = {};

    // VSS vascularity: 0 normal, 1 pink, 2 red, 3 purple.
    const e = colour.erythemaIndex;
    const vascularity = e < 2 ? 0 : e < 5 ? 1 : e < 9 ? 2 : 3;
    out.vascularity = {
      value: vascularity,
      basis: `Scar is ${e >= 0 ? '+' : ''}${e} a* against adjacent skin.`,
    };

    // VSS pigmentation: 0 normal, 1 hypo, 2 mixed, 3 hyper.
    const p = colour.pigmentationIndex;
    const pigmentation = Math.abs(p) < 3 ? 0
      : colour.colourHeterogeneity >= 12 ? 2
        : p > 0 ? 1 : 3;
    out.pigmentation = {
      value: pigmentation,
      basis: `Scar is ${p >= 0 ? '+' : ''}${p} L* against adjacent skin, heterogeneity ${colour.colourHeterogeneity}.`,
    };

    return out;
  }, [colour]);

  // ── Capture ───────────────────────────────────────────────────────────────
  const prepare = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not read the photograph.');
      ctx.drawImage(bitmap, 0, 0);

      // The gate runs first: a frame that cannot be measured honestly should be
      // re-shot while the patient is still in front of you.
      const quality = assessCanvasQuality(canvas);

      let pixelsPerCm: number | null = null;
      try {
        const cal = await detectCalibrationMarker(canvas);
        if (cal?.pixelsPerCm) pixelsPerCm = cal.pixelsPerCm;
      } catch { /* the gate's calibration check reports this */ }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setPrepared({
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        width: canvas.width,
        height: canvas.height,
        pixelsPerCm,
        quality,
        pixels: imageData.data,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not read the photograph.');
    } finally {
      setBusy(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!prepared || !scarTrace) return;
    setBusy(true);
    setError('');
    try {
      const imageId = crypto.randomUUID();
      const conditions: CaptureConditions = {
        deviceLabel: navigator.userAgent.slice(0, 80),
        imageWidth: prepared.width,
        imageHeight: prepared.height,
        viewAngle: 'unknown',
      };

      const image: ScarImage = {
        id: imageId,
        assessmentId: '',
        scarId: scar.id,
        view: 'primary',
        dataUrl: prepared.dataUrl,
        annotatedDataUrl: scarAnnotated ?? undefined,
        quality: prepared.quality,
        conditions,
        pixelsPerCm: prepared.pixelsPerCm,
        capturedAt: new Date().toISOString(),
      };

      const regions: ScarRegionTrace[] = [
        { role: 'scar', trace: scarTrace, imageId },
      ];
      if (referenceTrace) regions.push({ role: 'reference_skin', trace: referenceTrace, imageId });

      const validatedScores = Object.entries(scaleResponses)
        .map(([scaleId, responses]) => buildScoreEntry(scaleId, responses, userId))
        .filter((s): s is ValidatedScoreEntry => s !== null);

      const assessment = await saveAssessment({
        scarId: scar.id,
        patientId: scar.patientId,
        createdBy: userId,
        assessment: {
          scarId: scar.id,
          patientId: scar.patientId,
          assessedAt: new Date().toISOString(),
          images: [image],
          regions,
          morphometry: morphometry ?? undefined,
          colour: colour ?? undefined,
          // No reconstruction engine is configured, so 3D is recorded as
          // explicitly unavailable rather than left absent or zeroed.
          threeD: unavailableMeasurement(1),
          exam: Object.keys(exam).length
            ? { ...exam, examinedBy: userId, examinedAt: new Date().toISOString() }
            : undefined,
          patientReported: Object.keys(patientReported).length
            ? { ...patientReported, recordedAt: new Date().toISOString() }
            : undefined,
          validatedScores: validatedScores.length ? validatedScores : undefined,
          status: 'awaiting_review',
          clinicianNotes: notes || undefined,
          createdBy: userId,
        },
      });
      onSaved(assessment);
    } catch (e: any) {
      setError(e?.message || 'Could not save the assessment.');
      setBusy(false);
    }
  };

  const index = STEP_ORDER.indexOf(step);
  const canAdvance = (): boolean => {
    switch (step) {
      case 'capture': return !!prepared && prepared.quality.verdict !== 'recapture';
      case 'trace_scar': return !!scarTrace;
      default: return true;
    }
  };

  const go = (delta: number) => {
    const next = STEP_ORDER[index + delta];
    if (next) { setStep(next); setError(''); }
  };

  return (
    <div className="space-y-4">
      {/* Progress rail */}
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEP_ORDER.map((s, i) => {
          const meta = STEP_META[s];
          const done = i < index;
          const active = i === index;
          return (
            <li key={s} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => i <= index && setStep(s)}
                disabled={i > index}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'bg-indigo-600 text-white'
                    : done ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <meta.Icon className="w-3.5 h-3.5" />}
                {meta.label}
              </button>
              {i < STEP_ORDER.length - 1 && <span className="text-gray-300">›</span>}
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* ── Capture ─────────────────────────────────────────────────────── */}
      {step === 'capture' && (
        <div className="space-y-3">
          {!prepared ? (
            <>
              <input
                ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) prepare(f); }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="w-full py-10 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-700 hover:bg-indigo-50 flex flex-col items-center gap-2 disabled:opacity-60"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">
                  {busy ? 'Checking the photograph…' : 'Capture or upload photograph'}
                </span>
                <span className="text-xs text-gray-500 max-w-sm text-center">
                  Square to the scar, even light, green marker flat in the same plane. Include a margin
                  of normal skin — it is what the colour is measured against.
                </span>
              </button>
            </>
          ) : prepared.quality.verdict === 'recapture' ? (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm font-medium text-red-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  This photograph cannot be measured reliably ({prepared.quality.score}%)
                </p>
                <ul className="mt-1.5 space-y-1">
                  {prepared.quality.problems.map((p, i) => (
                    <li key={i} className="text-xs text-red-700">{p}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  No measurement is taken from a rejected frame. Retake it now, while the patient is here.
                </p>
              </div>
              <img src={prepared.dataUrl} alt="Rejected frame" className="w-full rounded-lg border" />
              <button
                onClick={() => setPrepared(null)}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
              >
                Retake
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <QualityBanner quality={prepared.quality} pixelsPerCm={prepared.pixelsPerCm} />
              <img src={prepared.dataUrl} alt="Captured scar" className="w-full rounded-lg border" />
              <button
                onClick={() => setPrepared(null)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Retake this photograph
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Trace scar ──────────────────────────────────────────────────── */}
      {step === 'trace_scar' && prepared && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Draw around the scar margin. The software measures area, perimeter, length, width and
            shape from what you draw — you never type a dimension.
          </p>
          <Suspense fallback={<div className="h-64 bg-gray-50 rounded-xl animate-pulse" />}>
            <WoundTracer
              imageSrc={prepared.dataUrl}
              pixelsPerCm={prepared.pixelsPerCm}
              surfaceKinds={[]}
              outlineLabel="Scar boundary"
              outlineInstruction="Draw around the edge of the scar. Release to close the outline."
              initialTraces={scarTrace ? [scarTrace] : undefined}
              onCancel={() => go(-1)}
              onComplete={({ traces, annotatedDataUrl }) => {
                const outline = traces.find(t => t.role === 'total');
                if (outline) { setScarTrace(outline); setScarAnnotated(annotatedDataUrl); }
                go(1);
              }}
            />
          </Suspense>
          {morphometry && <MorphometrySummary m={morphometry} />}
        </div>
      )}

      {/* ── Trace reference skin ────────────────────────────────────────── */}
      {step === 'trace_reference' && prepared && (
        <div className="space-y-2">
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
            <p className="text-sm text-sky-900 font-medium">Now trace a patch of normal skin beside the scar.</p>
            <p className="text-xs text-sky-800 mt-1">
              Colour is measured as a difference against this patient’s own adjacent skin, never as an
              absolute value — that is what keeps the analysis honest across skin tones. Without it,
              colour analysis is skipped rather than guessed.
            </p>
          </div>
          <Suspense fallback={<div className="h-64 bg-gray-50 rounded-xl animate-pulse" />}>
            <WoundTracer
              imageSrc={prepared.dataUrl}
              pixelsPerCm={prepared.pixelsPerCm}
              surfaceKinds={[]}
              outlineLabel="Reference skin"
              outlineInstruction="Draw around a patch of unaffected skin near the scar, avoiding shadow and hair."
              initialTraces={referenceTrace ? [referenceTrace] : undefined}
              onCancel={() => go(-1)}
              onComplete={({ traces }) => {
                const outline = traces.find(t => t.role === 'total');
                if (outline) setReferenceTrace(outline);
                go(1);
              }}
            />
          </Suspense>
          <button onClick={() => go(1)} className="text-xs text-gray-500 hover:underline">
            Skip — colour will not be analysed for this assessment
          </button>
          {colour && <ColourSummary lines={describeColour(colour)} deltaE={colour.deltaE2000} />}
        </div>
      )}

      {/* ── Examination ─────────────────────────────────────────────────── */}
      {step === 'exam' && <ExamForm exam={exam} onChange={setExam} />}

      {/* ── Patient report ──────────────────────────────────────────────── */}
      {step === 'patient' && (
        <PatientForm value={patientReported} onChange={setPatientReported} />
      )}

      {/* ── Scales ──────────────────────────────────────────────────────── */}
      {step === 'scales' && (
        <div className="space-y-6">
          {scales.map(s => (
            <div key={s.id} className="border rounded-xl p-4">
              <ScaleForm
                scale={s}
                responses={scaleResponses[s.id] ?? {}}
                suggestions={s.id === 'vss' ? suggestions : undefined}
                onChange={r => setScaleResponses(prev => ({ ...prev, [s.id]: r }))}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Review ──────────────────────────────────────────────────────── */}
      {step === 'review' && (
        <ReviewPanel
          scar={scar}
          prepared={prepared}
          morphometry={morphometry}
          colour={colour}
          exam={exam}
          patientReported={patientReported}
          scaleResponses={scaleResponses}
          notes={notes}
          onNotes={setNotes}
        />
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <button
          onClick={() => (index === 0 ? onCancel() : go(-1))}
          className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> {index === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex-1" />
        {step === 'review' ? (
          <button
            onClick={save}
            disabled={busy || !scarTrace}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> {busy ? 'Saving…' : 'Save for review'}
          </button>
        ) : (
          <button
            onClick={() => go(1)}
            disabled={!canAdvance()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Pieces ──────────────────────────────────────────────────────────────────

const QualityBanner: React.FC<{
  quality: ReturnType<typeof assessCanvasQuality>;
  pixelsPerCm: number | null;
}> = ({ quality, pixelsPerCm }) => (
  <div className={`rounded-lg px-3 py-2 border text-xs ${
    quality.verdict === 'accept'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-amber-50 text-amber-800 border-amber-200'
  }`}>
    <div className="font-medium">
      Image quality {quality.score}% — {quality.verdict === 'accept' ? 'accepted' : 'usable with warnings'}
    </div>
    {quality.problems.slice(0, 2).map((p, i) => <div key={i} className="mt-0.5">{p}</div>)}
    <div className="mt-1">
      {pixelsPerCm != null
        ? `Calibrated: ${pixelsPerCm.toFixed(1)} px/cm from the green marker.`
        : 'No calibration marker detected — shape will be measured, but no dimension is reported.'}
    </div>
  </div>
);

const MorphometrySummary: React.FC<{ m: NonNullable<ReturnType<typeof measureScar>> }> = ({ m }) => {
  const suggestion = suggestClassification(m);
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <Stat label="Area" value={m.areaCm2} unit="cm²" />
        <Stat label="Perimeter" value={m.perimeterCm} unit="cm" />
        <Stat label="Max length" value={m.maxLengthCm} unit="cm" />
        <Stat label="Max width" value={m.maxWidthCm} unit="cm" />
        <Stat label="Border irregularity" value={m.borderIrregularity} unit="" />
        <Stat label="Circularity" value={m.circularity} unit="" />
        <Stat label="Solidity" value={m.solidity} unit="" />
        <Stat label="Extension" value={m.extensionBeyondOriginalPercent} unit="%" />
      </div>
      {suggestion.suggestion && (
        <p className="text-xs text-sky-800 mt-2 bg-sky-50 border border-sky-200 rounded px-2 py-1.5">
          Compatible with a <strong>{suggestion.suggestion}</strong> ({suggestion.confidence} confidence).
          {' '}{suggestion.basis}
        </p>
      )}
      {m.limitations.map((l, i) => (
        <p key={i} className="text-xs text-amber-700 mt-1">{l}</p>
      ))}
    </div>
  );
};

const ColourSummary: React.FC<{ lines: string[]; deltaE: number }> = ({ lines, deltaE }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="text-sm font-medium text-gray-800">
      Colour difference from adjacent skin: ΔE 2000 = {deltaE}
    </div>
    {lines.map((l, i) => <p key={i} className="text-xs text-gray-600 mt-0.5">{l}</p>)}
  </div>
);

const Stat: React.FC<{ label: string; value: number | null; unit: string }> = ({ label, value, unit }) => (
  <div>
    <div className="text-xs text-gray-400">{label}</div>
    <div className="tabular-nums text-gray-900">
      {value == null ? <span className="text-gray-300">not measured</span> : `${value}${unit ? ` ${unit}` : ''}`}
    </div>
  </div>
);

const CHOICES = {
  pliability: ['normal', 'slightly_firm', 'moderately_firm', 'very_firm', 'rigid'],
  consistency: ['soft', 'rubbery', 'firm', 'hard'],
  mobility: ['freely_mobile', 'mildly_restricted', 'moderately_restricted', 'fixed'],
  tenderness: ['none', 'mild', 'moderate', 'severe'],
  itchSeverity: ['none', 'mild', 'moderate', 'severe'],
  adherence: ['absent', 'mild', 'moderate', 'severe'],
  compressibility: ['compressible', 'partially_compressible', 'non_compressible'],
} as const;

const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

const ExamForm: React.FC<{
  exam: ScarPhysicalExam;
  onChange: (e: ScarPhysicalExam) => void;
}> = ({ exam, onChange }) => (
  <div className="space-y-3">
    <p className="text-sm text-gray-600">
      Palpation findings. These cannot be obtained from a photograph — pliability in particular is a
      Vancouver Scar Scale item that no image analysis substitutes for.
    </p>
    {(Object.keys(CHOICES) as (keyof typeof CHOICES)[]).map(field => (
      <div key={field}>
        <label className="block text-xs font-medium text-gray-600 mb-1">{pretty(field)}</label>
        <div className="flex flex-wrap gap-1.5">
          {CHOICES[field].map(opt => (
            <button
              key={opt}
              onClick={() => onChange({ ...exam, [field]: opt })}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                (exam as any)[field] === opt
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
              }`}
            >
              {pretty(opt)}
            </button>
          ))}
        </div>
      </div>
    ))}

    <div className="border-t pt-3">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!exam.contracturePresent}
          onChange={e => onChange({ ...exam, contracturePresent: e.target.checked })}
          className="accent-violet-600"
        />
        Contracture present
      </label>
      {exam.contracturePresent && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          <input
            placeholder="Joint involved" value={exam.contractureJoint ?? ''}
            onChange={e => onChange({ ...exam, contractureJoint: e.target.value })}
            className="border rounded-lg px-2.5 py-1.5 text-sm"
          />
          <input
            placeholder="Direction" value={exam.contractureDirection ?? ''}
            onChange={e => onChange({ ...exam, contractureDirection: e.target.value })}
            className="border rounded-lg px-2.5 py-1.5 text-sm"
          />
          <input
            type="number" placeholder="ROM restriction (°)"
            value={exam.romRestrictionDegrees ?? ''}
            onChange={e => onChange({ ...exam, romRestrictionDegrees: Number(e.target.value) || undefined })}
            className="border rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
      )}
    </div>

    <textarea
      placeholder="Clinician impression"
      value={exam.clinicianImpression ?? ''}
      onChange={e => onChange({ ...exam, clinicianImpression: e.target.value })}
      rows={3}
      className="w-full border rounded-lg px-3 py-2 text-sm"
    />
  </div>
);

const PATIENT_FIELDS: { key: keyof ScarPatientReported; label: string }[] = [
  { key: 'pain', label: 'Pain' },
  { key: 'itch', label: 'Itch' },
  { key: 'tenderness', label: 'Tenderness' },
  { key: 'tightness', label: 'Tightness' },
  { key: 'pullingSensation', label: 'Pulling sensation' },
  { key: 'cosmeticConcern', label: 'Concern about appearance' },
  { key: 'functionalLimitation', label: 'Limitation of movement or use' },
  { key: 'treatmentSatisfaction', label: 'Satisfaction with treatment so far' },
];

const PatientForm: React.FC<{
  value: ScarPatientReported;
  onChange: (v: ScarPatientReported) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-3">
    <p className="text-sm text-gray-600">
      The patient’s own answers, 0–10. Ask them; do not answer on their behalf — these are stored as
      patient-reported and read as such by the trend engine.
    </p>
    {PATIENT_FIELDS.map(f => {
      const v = value[f.key] as number | undefined;
      return (
        <div key={f.key as string}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">{f.label}</span>
            <span className={`tabular-nums font-semibold ${v != null ? 'text-emerald-700' : 'text-gray-300'}`}>
              {v != null ? `${v}/10` : 'not asked'}
            </span>
          </div>
          <input
            type="range" min={0} max={10} step={1}
            value={v ?? 0}
            onChange={e => onChange({ ...value, [f.key]: Number(e.target.value) })}
            className="w-full accent-emerald-600"
            aria-label={f.label}
          />
        </div>
      );
    })}
  </div>
);

/**
 * The clinician review screen.
 *
 * Everything the assessment will record, in one place, before it is committed.
 * Completeness and quality are shown side by side and never merged: a complete
 * assessment built on a poor frame is exactly the situation this screen exists
 * to make visible.
 */
const ReviewPanel: React.FC<{
  scar: ScarCase;
  prepared: Prepared | null;
  morphometry: ReturnType<typeof measureScar> | null;
  colour: ReturnType<typeof analyseScarColour> | null;
  exam: ScarPhysicalExam;
  patientReported: ScarPatientReported;
  scaleResponses: Record<string, Record<string, number>>;
  notes: string;
  onNotes: (n: string) => void;
}> = ({ scar, prepared, morphometry, colour, exam, patientReported, scaleResponses, notes, onNotes }) => {
  const draft = {
    images: prepared ? [{ pixelsPerCm: prepared.pixelsPerCm, quality: prepared.quality }] : [],
    regions: [
      ...(morphometry ? [{ role: 'scar' }] : []),
      ...(colour ? [{ role: 'reference_skin' }] : []),
    ],
    morphometry: morphometry ?? undefined,
    colour: colour ?? undefined,
    threeD: unavailableMeasurement(1),
    exam,
    patientReported,
    validatedScores: Object.keys(scaleResponses).map(id => ({ scaleId: id })),
  } as unknown as ScarAssessment;

  const completeness = completenessOf(draft);
  const quality = judgeQuality(draft);
  const threeD = describe3DStatus();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-400">Assessment completeness</div>
          <div className="text-2xl font-bold text-gray-900">{completeness.percent}%</div>
          <ul className="mt-2 space-y-0.5">
            {completeness.parts.map(p => (
              <li key={p.label} className="text-xs flex items-center gap-1.5">
                <span className={p.done ? 'text-emerald-600' : 'text-gray-300'}>{p.done ? '✓' : '○'}</span>
                <span className={p.done ? 'text-gray-700' : 'text-gray-400'}>{p.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-400">Measurement quality</div>
          <div className="text-2xl font-bold text-gray-900 capitalize">{quality.quality}</div>
          <ul className="mt-2 space-y-1">
            {quality.reasons.map((r, i) => (
              <li key={i} className="text-xs text-gray-600">{r}</li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-400 mt-2">
            Completeness is how much was captured. Quality is how far it can be trusted. They are not
            the same thing and are never combined.
          </p>
        </div>
      </div>

      {!threeD.available && (
        <div className="bg-gray-50 border rounded-xl p-3">
          <p className="text-sm font-medium text-gray-800">{threeD.headline}</p>
          <p className="text-xs text-gray-600 mt-1">{threeD.detail}</p>
        </div>
      )}

      <div className="bg-white border rounded-xl p-3 space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">What will be recorded</h4>
        <Row label="Scar" value={`${scar.label} · ${scar.anatomicalSite}`} origin="record" />
        <Row label="Area" value={morphometry?.areaCm2 != null ? `${morphometry.areaCm2} cm²` : 'not measured'} origin="Measured from photograph" />
        <Row label="Max length × width" value={
          morphometry?.maxLengthCm != null
            ? `${morphometry.maxLengthCm} × ${morphometry.maxWidthCm ?? '—'} cm`
            : 'not measured'
        } origin="Measured from photograph" />
        <Row label="Colour (ΔE 2000)" value={colour ? String(colour.deltaE2000) : 'not analysed'} origin="Measured against adjacent skin" />
        <Row label="Erythema" value={colour ? `${colour.erythemaIndex >= 0 ? '+' : ''}${colour.erythemaIndex} a*` : 'not analysed'} origin="Measured against adjacent skin" />
        <Row label="Elevation / volume" value="not measured" origin="Requires 3D reconstruction" />
        <Row label="Pliability" value={exam.pliability ? pretty(exam.pliability) : 'not examined'} origin="Physical examination" />
        <Row label="Itch" value={patientReported.itch != null ? `${patientReported.itch}/10` : 'not asked'} origin="Patient reported" />
        <Row label="Scales completed" value={Object.keys(scaleResponses).length ? Object.keys(scaleResponses).join(', ').toUpperCase() : 'none'} origin="Mixed sources" />
      </div>

      <textarea
        placeholder="Clinician notes for this assessment"
        value={notes}
        onChange={e => onNotes(e.target.value)}
        rows={3}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />

      <p className="text-xs text-gray-500">
        Saving records this as <strong>awaiting review</strong>. It becomes part of the longitudinal
        record only when a clinician finalizes it, and a finalized assessment can afterwards be
        corrected but never silently overwritten.
      </p>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; origin: string }> = ({ label, value, origin }) => (
  <div className="flex items-baseline justify-between gap-3 border-b last:border-0 pb-1.5 last:pb-0">
    <span className="text-sm text-gray-600 shrink-0">{label}</span>
    <span className="flex-1 border-b border-dotted border-gray-200 mx-1" />
    <span className="text-sm text-gray-900 text-right">{value}</span>
    <span className="text-[10px] text-gray-400 w-32 text-right shrink-0">{origin}</span>
  </div>
);

export default AssessmentWizard;
