/**
 * Scar & Keloid Monitor.
 *
 * Two views: the scars being followed, and one scar's longitudinal record.
 *
 * The dashboard is ordered by what a surgeon needs first — what needs
 * attention, then what changed, then the evidence, then the forecast. The
 * prediction sits below the measurements deliberately: it is the least
 * trustworthy thing on the page and should be read after the facts it rests on,
 * not instead of them.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowLeft, Info, Layers, Plus,
  RefreshCw, ScanLine, Stethoscope, Syringe, Check,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient } from '../../../types';
import { PatientSelector } from '../../../components/patient/PatientSelector';
import GroupedSelect from '../../../components/common/GroupedSelect';
import { ANATOMICAL_SITES } from '../../../data/anatomy';
import { formatDateSafe } from '../../../utils/safeDate';
import {
  createScar, listScars, overviewFor, addTreatment, finalizeAssessment,
  type ScarOverview,
} from '../services/scarService';
import { analyseDomain } from '../services/longitudinal';
import { riskBand, PREDICTION_VALIDATION_STATUS } from '../services/scarPrediction';
import { describe3DStatus } from '../services/reconstruction3d';
import {
  SCAR_CLASSIFICATIONS, type ScarCase, type ScarClassification, type Laterality,
  type ScarTreatmentKind, type ScarAlert, type ScarPrediction,
} from '../types';
import ScarChart, { TrendChip } from '../components/ScarChart';
import AssessmentWizard from '../components/AssessmentWizard';

type View =
  | { kind: 'list' }
  | { kind: 'scar'; scarId: string };

export default function ScarMonitorPage() {
  const [view, setView] = useState<View>({ kind: 'list' });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
          <ScanLine className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Scar &amp; Keloid Monitor</h1>
          <p className="text-sm text-gray-500">
            Longitudinal assessment from calibrated photographs, examination and the patient’s own report
          </p>
        </div>
      </header>

      {view.kind === 'list'
        ? <ScarList onOpen={scarId => setView({ kind: 'scar', scarId })} />
        : <ScarDashboard scarId={view.scarId} onBack={() => setView({ kind: 'list' })} />}
    </div>
  );
}

// ── List ────────────────────────────────────────────────────────────────────

const ScarList: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const [scars, setScars] = useState<ScarCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setScars(await listScars());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patientName = (id: string) => {
    const p = patients?.find(x => x.id === id);
    return p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown patient';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Scars being followed</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New scar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
      ) : !scars.length ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No scars are being followed yet.</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Register a scar, then photograph it with the green marker in frame. The first assessment
            becomes the baseline everything afterwards is measured against.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {scars.map(s => (
            <li key={s.id}>
              <button
                onClick={() => onOpen(s.id)}
                className="w-full text-left bg-white rounded-xl border p-4 hover:border-indigo-300 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">{s.label}</div>
                  <div className="text-sm text-gray-500">{patientName(s.patientId)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {s.anatomicalSite}
                    {s.laterality !== 'not_applicable' && ` · ${s.laterality}`}
                    {s.classification.clinician && ` · ${
                      SCAR_CLASSIFICATIONS.find(c => c.value === s.classification.clinician)?.label
                    }`}
                  </div>
                </div>
                <Activity className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <NewScarModal
          onClose={() => setCreating(false)}
          onCreated={s => { setCreating(false); onOpen(s.id); }}
        />
      )}
    </div>
  );
};

const LATERALITIES: { value: Laterality; label: string }[] = [
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'midline', label: 'Midline' },
  { value: 'bilateral', label: 'Bilateral' },
];

const NewScarModal: React.FC<{
  onClose: () => void;
  onCreated: (s: ScarCase) => void;
}> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [label, setLabel] = useState('');
  const [site, setSite] = useState('');
  const [laterality, setLaterality] = useState<Laterality>('not_applicable');
  const [classification, setClassification] = useState<ScarClassification>('uncertain');
  const [onsetAt, setOnsetAt] = useState('');
  const [cause, setCause] = useState('');
  const [originalArea, setOriginalArea] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!patient) { setError('Select a patient.'); return; }
    if (!site) { setError('Select the anatomical site.'); return; }
    setSaving(true);
    try {
      const scar = await createScar({
        patientId: patient.id,
        hospitalId: patient.registeredHospitalId,
        label: label.trim() || `${site} scar`,
        anatomicalSite: site,
        laterality,
        classification: classification === 'uncertain' ? undefined : classification,
        onsetAt: onsetAt ? new Date(onsetAt).toISOString() : undefined,
        causeOfScar: cause.trim() || undefined,
        originalWoundAreaCm2: originalArea ? Number(originalArea) : undefined,
        originalWoundSource: originalArea ? 'clinician_estimate' : undefined,
        createdBy: user?.id,
      });
      onCreated(scar);
    } catch (e: any) {
      setError(e?.message || 'Could not register the scar.');
      setSaving(false);
    }
  };

  return (
    <Modal title="Register a scar" onClose={onClose}>
      <div className="space-y-3">
        <PatientSelector
          label="Patient" required
          value={patient?.id}
          onChange={(_id, p) => setPatient(p ?? null)}
          placeholder="Search by name or folder number…"
        />

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Name for this scar</span>
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Left earlobe keloid"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <div>
          <span className="text-xs font-medium text-gray-600 mb-1 block">Anatomical site</span>
          <GroupedSelect
            groups={ANATOMICAL_SITES}
            value={site}
            onChange={setSite}
            placeholder="Select the site…"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Side</span>
            <select
              value={laterality} onChange={e => setLaterality(e.target.value as Laterality)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {LATERALITIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Classification</span>
            <select
              value={classification} onChange={e => setClassification(e.target.value as ScarClassification)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {SCAR_CLASSIFICATIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Date of injury or surgery</span>
            <input
              type="date" value={onsetAt} onChange={e => setOnsetAt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Cause</span>
            <input
              value={cause} onChange={e => setCause(e.target.value)}
              placeholder="Burn, incision, piercing…"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">
            Original wound area (cm²), if known
          </span>
          <input
            value={originalArea} onChange={e => setOriginalArea(e.target.value)}
            placeholder="Leave blank if unknown"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-xs text-gray-500 mt-1 block">
            Growth beyond the original wound margin is what separates a keloid from a hypertrophic
            scar. It is never inferred — leave this blank rather than estimating, and the extension
            figures are simply not produced.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
          <button
            onClick={save} disabled={saving}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            Register scar
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────────────

const ScarDashboard: React.FC<{ scarId: string; onBack: () => void }> = ({ scarId, onBack }) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<ScarOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [treating, setTreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setOverview(await overviewFor(scarId));
    setLoading(false);
  }, [scarId]);
  useEffect(() => { load(); }, [load]);

  // Rebuild the per-domain series for charting from the same assessments the
  // engine read, so the graph and the figures cannot drift apart.
  const seriesByDomain = useMemo(() => {
    if (!overview) return {};
    const out: Record<string, { at: string; value: number }[]> = {};
    for (const c of overview.changes) {
      const pts: { at: string; value: number }[] = [];
      for (const a of overview.assessments) {
        const s = analyseDomain(c.domain, []);
        void s;
        // Values are pulled the same way the service does, via the assessment.
        const v = domainValue(c.domain, a);
        if (v != null) pts.push({ at: a.assessedAt, value: v });
      }
      out[c.domain] = pts;
    }
    return out;
  }, [overview]);

  if (loading) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />;
  if (!overview) return <p className="text-sm text-gray-500">That scar could not be loaded.</p>;

  const { scar, assessments, latest, reading, intelligence, responseIndex, predictions, alerts, treatments } = overview;
  const threeD = describe3DStatus();
  const pending = assessments.filter(a => a.status === 'awaiting_review');

  if (assessing) {
    return (
      <div className="space-y-4">
        <button onClick={() => setAssessing(false)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> {scar.label}
        </button>
        <AssessmentWizard
          scar={scar}
          userId={user?.id}
          onCancel={() => setAssessing(false)}
          onSaved={() => { setAssessing(false); load(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> All scars
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{scar.label}</h2>
          <p className="text-sm text-gray-500">
            {scar.anatomicalSite}
            {scar.laterality !== 'not_applicable' && ` · ${scar.laterality}`}
            {scar.classification.clinician && ` · ${
              SCAR_CLASSIFICATIONS.find(c => c.value === scar.classification.clinician)?.label
            }`}
            {scar.onsetAt && ` · since ${formatDateSafe(scar.onsetAt, 'MMM yyyy')}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {assessments.length} assessment{assessments.length === 1 ? '' : 's'}
            {latest && ` · last ${formatDateSafe(latest.assessedAt, 'd MMM yyyy')}`}
            {treatments.length > 0 && ` · ${treatments.length} treatment${treatments.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium"
          >
            <Syringe className="w-4 h-4" /> Record treatment
          </button>
          <button
            onClick={() => setAssessing(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            <ScanLine className="w-4 h-4" /> New assessment
          </button>
        </div>
      </div>

      {/* Alerts first: anything needing attention outranks everything else. */}
      {alerts.length > 0 && <AlertList alerts={alerts} />}

      {/* Awaiting review */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-sm font-medium text-amber-900">
            {pending.length} assessment{pending.length === 1 ? '' : 's'} awaiting clinician review
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            An assessment joins the longitudinal record when it is finalized.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {pending.map(a => (
              <button
                key={a.id}
                onClick={async () => { await finalizeAssessment(a.id, user?.id ?? 'system'); load(); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium"
              >
                <Check className="w-3.5 h-3.5" />
                Finalize {formatDateSafe(a.assessedAt, 'd MMM')} ({a.quality})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The multimodal read */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start gap-2">
          <Stethoscope className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{reading.headline}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Confidence {reading.confidence.replace('_', ' ')} · read across {
                new Set(overview.changes.filter(c => c.trend !== 'indeterminate').map(c => c.origin)).size
              } independent modalit{
                new Set(overview.changes.filter(c => c.trend !== 'indeterminate').map(c => c.origin)).size === 1 ? 'y' : 'ies'
              }
            </p>
            <ul className="mt-2 space-y-0.5">
              {intelligence.whatChanged.map((s, i) => (
                <li key={i} className="text-sm text-gray-700">{s}</li>
              ))}
            </ul>
            {reading.conflicts.length > 0 && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {reading.conflicts.map((c, i) => (
                  <p key={i} className="text-xs text-amber-800">{c}</p>
                ))}
              </div>
            )}
            {intelligence.needsAttention.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {intelligence.needsAttention.map((n, i) => (
                  <p key={i} className="text-xs text-red-700 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{n}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Domain grid */}
      {overview.changes.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {overview.changes.map(c => (
            <div key={c.domain} className="bg-white rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-gray-500">{c.label}</span>
                <TrendChip trend={c.trend} />
              </div>
              <div className="text-xl font-semibold tabular-nums text-gray-900 mt-1">
                {c.currentValue ?? '—'} <span className="text-xs text-gray-400 font-normal">{c.unit}</span>
              </div>
              <div className="text-xs text-gray-400">
                {c.percentChangeFromBaseline != null
                  ? `${c.percentChangeFromBaseline > 0 ? '+' : ''}${c.percentChangeFromBaseline}% from baseline`
                  : c.baselineValue != null ? `baseline ${c.baselineValue} ${c.unit}` : 'no baseline'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <ScarChart
        changes={overview.changes}
        assessments={assessments}
        treatments={treatments}
        seriesByDomain={seriesByDomain}
      />

      {/* Response index */}
      {responseIndex.score != null && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Treatment-response index</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Experimental. Not a validated clinical scale.
              </p>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${
              responseIndex.score > 0 ? 'text-emerald-700' : responseIndex.score < 0 ? 'text-red-700' : 'text-gray-700'
            }`}>
              {responseIndex.score > 0 ? '+' : ''}{responseIndex.score}
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {responseIndex.components.map(c => (
              <div key={c.domain} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{c.domain}</span>
                <span className="text-gray-400">
                  {c.percentChange > 0 ? '+' : ''}{c.percentChange}% × weight {c.weight} ={' '}
                  <span className={c.contribution > 0 ? 'text-emerald-700' : 'text-red-700'}>
                    {c.contribution > 0 ? '+' : ''}{c.contribution}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {responseIndex.limitations.map((l, i) => (
            <p key={i} className="text-xs text-gray-500 mt-1">{l}</p>
          ))}
        </div>
      )}

      {/* Predictions last: least trustworthy, read after the facts. */}
      <div className="space-y-2">
        {predictions.map((p, i) => <PredictionCard key={i} prediction={p} />)}
      </div>

      {/* 3D status */}
      {!threeD.available && (
        <div className="bg-gray-50 border rounded-xl p-3">
          <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-gray-400" />{threeD.headline}
          </p>
          <p className="text-xs text-gray-600 mt-1">{threeD.detail}</p>
        </div>
      )}

      {/* Assessment history */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Assessment history</h3>
        {!assessments.length ? (
          <p className="text-sm text-gray-400">
            No assessments yet. The first one becomes the baseline.
          </p>
        ) : (
          <ul className="divide-y">
            {[...assessments].reverse().map(a => (
              <li key={a.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {formatDateSafe(a.assessedAt, 'd MMM yyyy')}
                    {a.isBaseline && <span className="ml-2 text-xs text-indigo-600">baseline</span>}
                    {a.status === 'awaiting_review' && (
                      <span className="ml-2 text-xs text-amber-600">awaiting review</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {a.morphometry?.areaCm2 != null ? `${a.morphometry.areaCm2} cm²` : 'not measured'}
                    {' · '}{a.completenessPercent}% complete
                    {' · quality '}{a.quality}
                  </div>
                  {a.corrections?.length ? (
                    <div className="text-xs text-purple-700 mt-0.5">
                      {a.corrections.length} correction{a.corrections.length === 1 ? '' : 's'} recorded
                    </div>
                  ) : null}
                </div>
                {a.images[0]?.annotatedDataUrl && (
                  <img
                    src={a.images[0].annotatedDataUrl}
                    alt="Traced scar"
                    className="w-16 h-16 object-cover rounded-lg border shrink-0"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {treating && (
        <TreatmentModal
          scar={scar}
          userId={user?.id}
          onClose={() => setTreating(false)}
          onSaved={() => { setTreating(false); load(); }}
        />
      )}
    </div>
  );
};

/** Pull one domain's value out of a stored assessment, for charting. */
function domainValue(domain: string, a: ScarOverview['assessments'][number]): number | null {
  switch (domain) {
    case 'area': return a.morphometry?.areaCm2 ?? null;
    case 'volume': return a.threeD?.volumeCm3 ?? null;
    case 'elevation': return a.threeD?.maxElevationMm ?? null;
    case 'erythema': return a.colour?.erythemaIndex ?? null;
    case 'pigmentation': return a.colour ? Math.abs(a.colour.pigmentationIndex) : null;
    case 'pliability': {
      const grades: Record<string, number> = {
        normal: 0, slightly_firm: 1, moderately_firm: 2, very_firm: 3, rigid: 4,
      };
      return a.exam?.pliability ? grades[a.exam.pliability] ?? null : null;
    }
    case 'symptoms': {
      const p = a.patientReported;
      const vals = [p?.pain, p?.itch, p?.tightness, p?.tenderness]
        .filter((v): v is number => typeof v === 'number');
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }
    case 'vss': return a.validatedScores?.find(s => s.scaleId === 'vss')?.total ?? null;
    case 'posas_observer':
      return a.validatedScores?.find(s => s.scaleId === 'posas')?.subscales?.observer ?? null;
    case 'posas_patient':
      return a.validatedScores?.find(s => s.scaleId === 'posas')?.subscales?.patient ?? null;
    default: return null;
  }
}

const AlertList: React.FC<{ alerts: ScarAlert[] }> = ({ alerts }) => (
  <div className="space-y-2">
    {alerts.map(a => {
      const style = a.priority === 'high'
        ? { row: 'bg-red-50 border-red-200', chip: 'bg-red-600 text-white', Icon: AlertOctagon }
        : a.priority === 'medium'
          ? { row: 'bg-amber-50 border-amber-200', chip: 'bg-amber-500 text-white', Icon: AlertTriangle }
          : { row: 'bg-gray-50 border-gray-200', chip: 'bg-gray-200 text-gray-700', Icon: Info };
      return (
        <div key={a.id} className={`border rounded-xl p-3 ${style.row}`}>
          <div className="flex items-start gap-2">
            <style.Icon className="w-4 h-4 mt-0.5 shrink-0 text-gray-600" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{a.message}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.chip}`}>
                  {a.priority}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {a.evidence.map((e, i) => (
                  <li key={i} className="text-xs text-gray-700">{e}</li>
                ))}
              </ul>
              <p className="text-[11px] text-gray-500 mt-1">{a.disclaimer}</p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const PredictionCard: React.FC<{ prediction: ScarPrediction }> = ({ prediction: p }) => {
  const title = p.kind === 'progression_risk' ? 'Progression risk'
    : p.kind === 'trajectory' ? 'Projected trajectory'
      : 'Treatment response';

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">
            {title}
            <span className="ml-2 text-xs font-normal text-gray-400">
              over {Math.round(p.horizonDays / 7)} weeks
            </span>
          </h3>
          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase">
            {PREDICTION_VALIDATION_STATUS.replace('_', ' ')}
          </span>
        </div>
        <div className="text-right">
          {p.eligible ? (
            p.probability != null ? (
              <>
                <div className="text-2xl font-bold tabular-nums text-gray-900">{riskBand(p.probability)}</div>
                <div className="text-xs text-gray-400">≈{Math.round(p.probability * 100)}%, confidence {p.confidence.replace('_', ' ')}</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold tabular-nums text-gray-900">
                  {p.projectedValue} <span className="text-sm font-normal text-gray-400">{p.unit}</span>
                </div>
                <div className="text-xs text-gray-400">
                  range {p.projectedRangeLow}–{p.projectedRangeHigh} {p.unit}
                </div>
              </>
            )
          ) : (
            <div className="text-sm font-medium text-gray-500">Not estimable</div>
          )}
        </div>
      </div>

      {p.eligible ? (
        <ul className="mt-2 space-y-0.5">
          {p.supportingFeatures.map((f, i) => (
            <li key={i} className="text-xs text-gray-700">{f}</li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {p.ineligibleReasons.map((r, i) => (
            <li key={i} className="text-xs text-gray-600">{r}</li>
          ))}
        </ul>
      )}

      <div className="mt-2 pt-2 border-t space-y-0.5">
        {p.limitations.map((l, i) => (
          <p key={i} className="text-[11px] text-gray-500">{l}</p>
        ))}
        <p className="text-[11px] text-gray-400">
          {p.modelName} {p.modelVersion} · generated {formatDateSafe(p.generatedAt, 'd MMM yyyy HH:mm')}
        </p>
      </div>
    </div>
  );
};

const TREATMENT_KINDS: { value: ScarTreatmentKind; label: string }[] = [
  { value: 'intralesional_steroid', label: 'Intralesional corticosteroid' },
  { value: 'intralesional_5fu', label: 'Intralesional 5-FU' },
  { value: 'intralesional_combination', label: 'Intralesional combination' },
  { value: 'surgical_excision', label: 'Surgical excision' },
  { value: 'pressure_therapy', label: 'Pressure therapy' },
  { value: 'silicone', label: 'Silicone' },
  { value: 'laser', label: 'Laser' },
  { value: 'cryotherapy', label: 'Cryotherapy' },
  { value: 'radiotherapy', label: 'Radiotherapy' },
  { value: 'other', label: 'Other' },
];

const TreatmentModal: React.FC<{
  scar: ScarCase;
  userId?: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ scar, userId, onClose, onSaved }) => {
  const [kind, setKind] = useState<ScarTreatmentKind>('intralesional_steroid');
  const [dose, setDose] = useState('');
  const [sessionNumber, setSessionNumber] = useState('');
  const [administeredAt, setAdministeredAt] = useState(new Date().toISOString().slice(0, 10));
  const [adverse, setAdverse] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await addTreatment({
      scarId: scar.id,
      patientId: scar.patientId,
      kind,
      dose: dose.trim() || undefined,
      sessionNumber: sessionNumber ? Number(sessionNumber) : undefined,
      administeredAt: new Date(administeredAt).toISOString(),
      administeredBy: userId,
      adverseEvents: adverse.trim() || undefined,
    });
    onSaved();
  };

  return (
    <Modal title="Record treatment" onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Treatment</span>
          <select
            value={kind} onChange={e => setKind(e.target.value as ScarTreatmentKind)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {TREATMENT_KINDS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Dose / detail</span>
            <input
              value={dose} onChange={e => setDose(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Session number</span>
            <input
              type="number" value={sessionNumber} onChange={e => setSessionNumber(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Date given</span>
          <input
            type="date" value={administeredAt} onChange={e => setAdministeredAt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Adverse events</span>
          <input
            value={adverse} onChange={e => setAdverse(e.target.value)}
            placeholder="None recorded"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-gray-500">
          Treatments appear on the trend graphs, so the measured course can be read against when the
          intervention was actually given.
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
          <button
            onClick={save} disabled={saving}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            Record treatment
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
          <Activity className="w-4 h-4 rotate-45" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
