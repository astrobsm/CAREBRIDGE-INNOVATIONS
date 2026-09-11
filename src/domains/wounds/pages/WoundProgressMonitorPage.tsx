/**
 * WoundProgress Monitor — longitudinal wound tracking & healing analytics.
 *
 * A CONSOLIDATING module, not a re-implementation. It adds the one thing the
 * existing wound suite lacked — a first-class wound identity followed over time
 * — and reuses everything already built:
 *   - aiWoundMeasurement (on-device CV) for photo measurement
 *   - WoundHealingMap for the serial spatial overlay
 *   - MonitorTrendChart + aiWoundMeasurement.generateProgressReport for trends
 *   - the shared Dexie + Supabase sync layer for offline-first storage
 *
 * Views:
 *   dashboard  → aggregate across all monitored wounds, worsening surfaced first
 *   patient    → a patient's wounds; register a new wound
 *   wound      → three-panel detail: map | timeline+capture | analytics
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Camera, ChevronLeft, ChevronRight, Download, FileText,
  Image as ImageIcon,
  LineChart, Plus, Printer, RefreshCw, Ruler, Search, TrendingDown, TrendingUp,
  Minus, Loader2, X,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import type { Patient } from '../../../types';
import { aiWoundMeasurement, type WoundProgressEntry, type AiWoundAssessment } from '../services/aiWoundMeasurement';
import {
  printDressingProtocol,
  exportDressingProtocolPDF,
  determineWoundPhase as getDressingPhase,
  type DressingProtocolData,
} from '../../../utils/dressingProtocolPrint';
import { generateCalibrationRulerPDF } from '../../../utils/calibrationRulerPdf';
import {
  generateWoundAssessmentPDF,
  type WoundAssessmentPDFOptions,
} from '../../../utils/clinicalPdfGenerators';
import type { CalibratedMeasurement } from '../../../services/woundMeasurementEngine';
import { detectCalibrationMarker } from '../../../services/woundMeasurementEngine';
import { computePlanimetry, measureTrace, type Trace } from '../../../services/planimetry';
import GroupedSelect from '../../../components/common/GroupedSelect';
import { ANATOMICAL_SITES, WOUND_ETIOLOGIES } from '../../../data/anatomy';
import {
  listWounds, getWoundTimeline, getMonitorDashboard, createWound, addAssessment,
  importLegacyWounds,
  computeHealingAnalytics, healingAlerts, HEALING_STATUS_META, INFECTION_SIGNS,
  type MonitoredWound, type WoundAssessment, type HealingStatus, type MonitoredWoundSummary,
  type MonitorDashboard, type ExudateAmount, type ExudateType, type TissueType,
  type WoundAssessmentPhoto,
  type HealingAnalytics,
} from '../services/woundMonitorService';

const WoundHealingMap = lazy(() => import('../components/WoundHealingMap'));
const MonitorTrendChart = lazy(() => import('../components/MonitorTrendChart'));
// Heavy (pulls TensorFlow via the measurement engine) and only needed when the
// clinician chooses the guided path, so it stays out of the main chunk.
const CalibratedWoundCapture = lazy(() => import('../components/CalibratedWoundCapture'));
// Only loaded when the clinician chooses to trace.
const WoundTracer = lazy(() => import('../../../components/clinical/WoundTracer'));

const WOUND_TYPES = [
  'Burn', 'Pressure Injury', 'Venous Ulcer', 'Diabetic Foot Ulcer', 'Surgical Wound',
  'Traumatic Wound', 'Skin Graft Donor Site', 'Flap', 'Necrotizing Fasciitis', "Fournier's Gangrene",
];
const BODY_SIDES = ['Left', 'Right', 'Midline', 'Bilateral'];
const TISSUE_TYPES: TissueType[] = ['epithelial', 'granulation', 'slough', 'necrotic', 'eschar'];
const EXUDATE_AMOUNTS: ExudateAmount[] = ['none', 'light', 'moderate', 'heavy'];
const EXUDATE_TYPES: ExudateType[] = ['serous', 'sanguineous', 'serosanguineous', 'purulent'];

type View =
  | { kind: 'dashboard' }
  | { kind: 'patient'; patient: Patient }
  | { kind: 'wound'; patient: Patient; wound: MonitoredWound };

// ── assessment → chart entry (reuse existing viz) ───────────────────────────
function toProgressEntries(assessments: WoundAssessment[]): WoundProgressEntry[] {
  return assessments
    .filter(a => a.assessedAt)
    .slice()
    .sort((a, b) => new Date(a.assessedAt!).getTime() - new Date(b.assessedAt!).getTime())
    .map(a => ({
      date: a.assessedAt!,
      length: Number(a.lengthCm) || 0,
      width: Number(a.widthCm) || 0,
      area: Number(a.areaCm2) || 0,
      perimeter: Number(a.perimeterCm) || undefined,
      granulation_percentage: Number(a.granulationPct) || undefined,
      healing_phase: a.healingStage,
      contourCm: Array.isArray(a.contourCm) && a.contourCm.length ? a.contourCm : undefined,
      tissue: (a.granulationPct != null || a.sloughPct != null) ? {
        granulation: Number(a.granulationPct) || 0,
        slough: Number(a.sloughPct) || 0,
        necrotic: Number(a.necroticPct) || 0,
        epithelial: Number(a.epithelialPct) || 0,
      } : undefined,
    }));
}

const fmtArea = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? '—' : `${Number(v).toFixed(1)} cm²`;

const patientName = (p?: { firstName?: string; lastName?: string } | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Patient';

// ════════════════════════════════════════════════════════════════════════════

const WoundProgressMonitorPage: React.FC = () => {
  const [view, setView] = useState<View>({ kind: 'dashboard' });

  return (
    <div className="min-h-screen bg-gray-50 -m-4 sm:-m-6 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">WoundProgress Monitor</h1>
              <p className="text-sm text-gray-500">AI wound assessment & longitudinal healing analytics</p>
            </div>
          </div>
        </header>

        {view.kind === 'dashboard' && (
          <DashboardView
            onOpenWound={(patient, wound) => setView({ kind: 'wound', patient, wound })}
            onPickPatient={patient => setView({ kind: 'patient', patient })}
          />
        )}
        {view.kind === 'patient' && (
          <PatientView
            patient={view.patient}
            onBack={() => setView({ kind: 'dashboard' })}
            onOpenWound={wound => setView({ kind: 'wound', patient: view.patient, wound })}
          />
        )}
        {view.kind === 'wound' && (
          <WoundDetailView
            patient={view.patient}
            wound={view.wound}
            onBack={() => setView({ kind: 'patient', patient: view.patient })}
          />
        )}
      </div>
    </div>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────────────

const DashboardView: React.FC<{
  onOpenWound: (patient: Patient, wound: MonitoredWound) => void;
  onPickPatient: (patient: Patient) => void;
}> = ({ onOpenWound, onPickPatient }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<MonitorDashboard | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [imported, setImported] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Pull across anything still sitting in the old Wounds module — including
      // legacy rows that only arrive later via cloud sync. Idempotent, so a
      // failure here must never block the dashboard.
      try {
        const n = await importLegacyWounds();
        if (n) setImported(n);
      } catch (e) {
        console.warn('[WoundMonitor] Legacy import skipped:', e);
      }
      setData(await getMonitorDashboard());
    } catch (e: any) {
      setError(e?.message || 'Could not load the monitor dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = [
    { label: 'Active wounds', value: data?.totalActive ?? 0, tone: 'text-gray-900', Icon: Ruler },
    { label: 'Improving', value: data?.improving ?? 0, tone: 'text-green-600', Icon: TrendingDown },
    { label: 'Stalled', value: data?.stagnant ?? 0, tone: 'text-amber-600', Icon: Minus },
    { label: 'Worsening', value: data?.worsening ?? 0, tone: 'text-red-600', Icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {imported > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm text-blue-800">
          Brought {imported} wound{imported === 1 ? '' : 's'} across from the previous Wounds
          module. Each opens with its recorded measurements as the first assessment.
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Monitored wounds</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New wound
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, tone, Icon }) => (
          <div key={label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon className={`w-4 h-4 ${tone}`} />
            </div>
            <div className={`text-2xl font-bold mt-1 tabular-nums ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      {data?.avgVelocityCm2PerWeek != null && (
        <div className="bg-white rounded-xl border p-4 text-sm text-gray-600">
          Mean healing velocity across active wounds:{' '}
          <strong className={data.avgVelocityCm2PerWeek < 0 ? 'text-green-600' : 'text-red-600'}>
            {data.avgVelocityCm2PerWeek < 0 ? '' : '+'}{data.avgVelocityCm2PerWeek.toFixed(2)} cm²/week
          </strong>{' '}
          {data.avgVelocityCm2PerWeek < 0 ? '(shrinking — healing)' : '(growing — review)'}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          <button onClick={load} className="ml-auto underline">Retry</button>
        </div>
      ) : !data?.wounds.length ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-500">
          <Ruler className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          No wounds are currently being monitored. Register a wound to begin tracking healing.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.wounds.map(w => (
            <WoundRow
              key={w.id}
              wound={w}
              onClick={async () => {
                const patient = await db.patients.get(w.patientId);
                if (patient) onOpenWound(patient, w);
              }}
            />
          ))}
        </ul>
      )}

      {showPicker && (
        <PatientPickerModal
          onClose={() => setShowPicker(false)}
          onPick={patient => { setShowPicker(false); onPickPatient(patient); }}
        />
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status?: HealingStatus }> = ({ status }) => {
  const meta = HEALING_STATUS_META[status || 'insufficient_data'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> {meta.label}
    </span>
  );
};

const WoundRow: React.FC<{ wound: MonitoredWoundSummary; onClick: () => void }> = ({ wound, onClick }) => {
  const name = patientName(wound);
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 bg-white rounded-xl border p-4 hover:border-teal-300 hover:shadow-sm transition text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{wound.label || wound.woundType || 'Wound'}</span>
            <StatusBadge status={wound.healingStatus} />
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            {name}{wound.hospitalNumber ? ` • ${wound.hospitalNumber}` : ''}
            {wound.anatomicalLocation ? ` • ${wound.anatomicalLocation}` : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-gray-900 tabular-nums">{fmtArea(wound.latestAreaCm2)}</div>
          <div className="text-xs text-gray-400 tabular-nums">
            {wound.healingVelocityCm2PerWeek != null
              ? `${Number(wound.healingVelocityCm2PerWeek) < 0 ? '' : '+'}${Number(wound.healingVelocityCm2PerWeek).toFixed(2)}/wk`
              : `${wound.assessmentCount || 0} assessment${(wound.assessmentCount || 0) === 1 ? '' : 's'}`}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </button>
    </li>
  );
};

// ── Patient view ────────────────────────────────────────────────────────────

const PatientView: React.FC<{
  patient: Patient;
  onBack: () => void;
  onOpenWound: (wound: MonitoredWound) => void;
}> = ({ patient, onBack, onOpenWound }) => {
  const [wounds, setWounds] = useState<MonitoredWound[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setWounds(await listWounds(patient.id));
    setLoading(false);
  }, [patient.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Monitor dashboard
      </button>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{patientName(patient)}</h2>
          {patient.hospitalNumber && <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Register wound
        </button>
      </div>

      {loading ? (
        <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
      ) : !wounds.length ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          No wounds recorded for this patient yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {wounds.map(w => <WoundRow key={w.id} wound={w as MonitoredWoundSummary} onClick={() => onOpenWound(w)} />)}
        </ul>
      )}

      {showForm && (
        <NewWoundModal
          patient={patient}
          onClose={() => setShowForm(false)}
          onCreated={w => { setShowForm(false); load(); onOpenWound(w); }}
        />
      )}
    </div>
  );
};

// ── Wound detail: three panels + trend ──────────────────────────────────────

const WoundDetailView: React.FC<{ patient: Patient; wound: MonitoredWound; onBack: () => void }> = ({ patient, wound, onBack }) => {
  const [assessments, setAssessments] = useState<WoundAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setAssessments(await getWoundTimeline(wound.id));
    setLoading(false);
  }, [wound.id]);

  useEffect(() => { load(); }, [load]);

  const entries = useMemo(() => toProgressEntries(assessments), [assessments]);
  const analytics = useMemo(() => computeHealingAnalytics(assessments), [assessments]);
  const report = useMemo(
    () => (entries.length >= 2 ? aiWoundMeasurement.generateProgressReport(entries) : null),
    [entries],
  );
  const alerts = healingAlerts(analytics);
  const latest = assessments.find(a => a.assessedAt) || assessments[0];

  // Every photograph across the wound's timeline, oldest first, each still
  // paired with the assessment it was measured from.
  const photoRecords = useMemo<PhotoRecord[]>(() => {
    const out: PhotoRecord[] = [];
    for (const a of assessments) {
      for (const photo of a.photos || []) {
        if (photo?.imageData || photo?.url) out.push({ photo, assessment: a });
      }
    }
    return out.sort((x, y) =>
      new Date(x.assessment.assessedAt || x.assessment.createdAt).getTime() -
      new Date(y.assessment.assessedAt || y.assessment.createdAt).getTime());
  }, [assessments]);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> {patientName(patient)}
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">{wound.label || wound.woundType || 'Wound'}</h2>
            <StatusBadge status={analytics.status} />
          </div>
          <p className="text-sm text-gray-500">
            {[wound.woundType, wound.anatomicalLocation, wound.bodySide].filter(Boolean).join(' • ')}
          </p>
        </div>
        <button
          onClick={() => setCapturing(true)}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
        >
          <Camera className="w-4 h-4" /> New assessment
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Three panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: serial healing map */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-teal-600" /> Serial healing map
          </h3>
          {loading ? (
            <div className="h-64 bg-gray-50 rounded animate-pulse" />
          ) : entries.length ? (
            <Suspense fallback={<div className="h-64 bg-gray-50 rounded animate-pulse" />}>
              <WoundHealingMap measurements={entries} height={280} />
            </Suspense>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 text-center px-4">
              Capture the first assessment to start the healing map.
            </div>
          )}
        </div>

        {/* Center: analytics */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-teal-600" /> Healing analytics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Current area" value={fmtArea(latest?.areaCm2)} />
            <Metric label="Baseline" value={fmtArea(entries[0]?.area)} />
            <Metric
              label="Area reduction"
              value={`${analytics.percentAreaReduction >= 0 ? '' : '+'}${analytics.percentAreaReduction.toFixed(0)}%`}
              tone={analytics.percentAreaReduction > 0 ? 'text-green-600' : analytics.percentAreaReduction < 0 ? 'text-red-600' : undefined}
            />
            <Metric
              label="Velocity"
              value={`${analytics.velocityCm2PerWeek < 0 ? '' : '+'}${analytics.velocityCm2PerWeek.toFixed(2)} cm²/wk`}
              tone={analytics.velocityCm2PerWeek < 0 ? 'text-green-600' : analytics.velocityCm2PerWeek > 0 ? 'text-red-600' : undefined}
            />
            <Metric
              label="Projected closure"
              value={analytics.projectedDaysToClosure != null ? `${analytics.projectedDaysToClosure} days` : '—'}
            />
            <Metric label="Assessments" value={String(analytics.assessmentCount)} />
          </div>
          {latest && (latest.granulationPct != null || latest.sloughPct != null) && (
            <TissueBar latest={latest} />
          )}
        </div>

        {/* Right: latest clinical assessment */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Latest clinical assessment</h3>
          {latest ? (
            <div className="space-y-2.5">
              {latest.infectionSigns?.length ? (
                <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Infection signs: {latest.infectionSigns.join(', ')}</span>
                </div>
              ) : null}

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                <ClinicalFact label="Exudate" value={
                  [latest.exudateAmount, latest.exudateType].filter(Boolean).join(' · ')
                } />
                <ClinicalFact label="Pain" value={latest.painLevel != null ? `${latest.painLevel}/10` : ''} />
                <ClinicalFact label="Odour" value={latest.odor === undefined ? '' : latest.odor ? 'Present' : 'Absent'} />
                <ClinicalFact label="Peri-wound" value={latest.periWoundCondition} />
                <ClinicalFact label="Dressing" value={latest.dressingType} />
                <ClinicalFact label="Frequency" value={latest.dressingFrequency} />
              </dl>

              {latest.tissueTypes?.length ? (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {latest.tissueTypes.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] capitalize">{t}</span>
                  ))}
                </div>
              ) : null}

              {latest.clinicalDescription && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pt-1 border-t">
                  {latest.clinicalDescription}
                </p>
              )}
              {latest.assessedAt && (
                <p className="text-xs text-gray-400">Assessed {new Date(latest.assessedAt).toLocaleString()}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No assessment recorded yet.</p>
          )}
        </div>
      </div>

      {/* Clinical outputs — carried over from the Wounds module */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Clinical documents</h3>
        <div className="flex flex-wrap gap-2">
          <DocButton icon={<Printer className="w-4 h-4" />} disabled={!latest}
            onClick={() => latest && printDressingProtocol(dressingData(patient, wound, latest, user))}>
            Print dressing protocol
          </DocButton>
          <DocButton icon={<Download className="w-4 h-4" />} disabled={!latest}
            onClick={() => latest && exportDressingProtocolPDF(dressingData(patient, wound, latest, user))}>
            Dressing protocol PDF
          </DocButton>
          <DocButton icon={<FileText className="w-4 h-4" />} disabled={!latest}
            onClick={() => latest && generateWoundAssessmentPDF(
              woundReportOptions(patient, wound, latest, analytics, user),
            )}>
            Assessment report PDF
          </DocButton>
          <DocButton icon={<Ruler className="w-4 h-4" />} onClick={() => generateCalibrationRulerPDF()}>
            Print calibration markers
          </DocButton>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Page 1 carries the green markers the photo measurement calibrates from. Print at 100%
          scale, cut one out, and lay it flat beside the wound when photographing.
        </p>
        {!latest && (
          <p className="text-xs text-gray-400 mt-2">
            Capture an assessment to generate a dressing protocol.
          </p>
        )}
      </div>

      {/* Serial photographs — the evidence behind the numbers */}
      {photoRecords.length > 0 && (
        <PhotoStrip records={photoRecords} onOpen={setViewerIndex} />
      )}

      {/* Trend chart */}
      {report && (
        <Suspense fallback={<div className="h-72 bg-white rounded-xl border animate-pulse" />}>
          <MonitorTrendChart measurements={entries} report={report} />
        </Suspense>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Assessment history</h3>
        {loading ? (
          <div className="h-20 bg-gray-50 rounded animate-pulse" />
        ) : !assessments.length ? (
          <p className="text-sm text-gray-400">No assessments yet.</p>
        ) : (
          <ul className="divide-y">
            {assessments.map(a => (
              <li key={a.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 tabular-nums">{fmtArea(a.areaCm2)}</div>
                  <div className="text-xs text-gray-400">
                    {a.assessedAt ? new Date(a.assessedAt).toLocaleString() : '—'}
                    {a.scaleReliable === false && ' • uncalibrated'}
                  </div>
                  {/* Clinical shorthand, so the timeline reads as a record of
                      care and not just a column of areas. */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {a.exudateAmount && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {a.exudateAmount} exudate
                      </span>
                    )}
                    {a.painLevel != null && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        pain {a.painLevel}/10
                      </span>
                    )}
                    {a.odor && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">odour</span>
                    )}
                    {!!a.infectionSigns?.length && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        infection ×{a.infectionSigns.length}
                      </span>
                    )}
                    {!!a.photos?.length && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {a.photos.length} photo{a.photos.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
                {a.lengthCm != null && a.widthCm != null && (
                  <div className="text-xs text-gray-500 tabular-nums shrink-0">
                    {Number(a.lengthCm).toFixed(1)} × {Number(a.widthCm).toFixed(1)} cm
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {capturing && (
        <CaptureAssessmentModal
          wound={wound}
          onClose={() => setCapturing(false)}
          onSaved={() => { setCapturing(false); load(); }}
        />
      )}

      {viewerIndex !== null && (
        <PhotoViewer
          records={photoRecords}
          index={viewerIndex}
          onIndex={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
};

/** One photograph plus the assessment it belongs to, for the gallery. */
interface PhotoRecord {
  photo: WoundAssessmentPhoto;
  assessment: WoundAssessment;
}

/**
 * Serial photographs for a wound, oldest first.
 *
 * The visual counterpart to the trend chart: the chart says the area fell from
 * 9 cm2 to 4, and these show the wound bed that produced those numbers, with
 * the calibration marker still in frame.
 */
const PhotoStrip: React.FC<{
  records: PhotoRecord[];
  onOpen: (index: number) => void;
}> = ({ records, onOpen }) => (
  <div className="bg-white rounded-xl border p-4">
    <div className="flex items-baseline justify-between gap-3 mb-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-teal-600" /> Photographs
      </h3>
      <span className="text-xs text-gray-400">
        {records.length} image{records.length === 1 ? '' : 's'} · oldest first
      </span>
    </div>

    <div className="flex gap-3 overflow-x-auto pb-1">
      {records.map((r, i) => (
        <button
          key={r.photo.id}
          onClick={() => onOpen(i)}
          className="group shrink-0 w-32 text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border bg-gray-50">
            <img
              src={r.photo.imageData || r.photo.url}
              alt={`Wound on ${r.assessment.assessedAt ? new Date(r.assessment.assessedAt).toLocaleDateString() : 'an unknown date'}`}
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            {/* Whether the frame was calibrated decides how far the measurement
                drawn from it can be trusted, so it sits on the thumbnail rather
                than a click away. */}
            <span className={`absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${
              r.photo.scaleReliable ? 'bg-green-600/90 text-white' : 'bg-amber-500/90 text-white'
            }`}>
              {r.photo.scaleReliable ? 'calibrated' : 'uncalibrated'}
            </span>
            {/* A frame with no traced margin produced an area from nothing
                identifiable, so it is flagged separately from calibration. */}
            {r.photo.hasContourOverlay === false && (
              <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-red-600/90 text-white">
                no outline
              </span>
            )}
          </div>
          <div className="mt-1.5">
            <div className="text-xs font-medium text-gray-700 tabular-nums">{fmtArea(r.assessment.areaCm2)}</div>
            <div className="text-[11px] text-gray-400">
              {r.assessment.assessedAt ? new Date(r.assessment.assessedAt).toLocaleDateString() : '—'}
            </div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

/** Full-size photograph with the measurement and calibration it produced. */
const PhotoViewer: React.FC<{
  records: PhotoRecord[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}> = ({ records, index, onIndex, onClose }) => {
  // Arrow keys step through the series, which is how the images are actually
  // reviewed — one visit against the next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < records.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, records.length, onIndex, onClose]);

  const record = records[index];
  if (!record) return null;
  const { photo, assessment } = record;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {assessment.assessedAt ? new Date(assessment.assessedAt).toLocaleString() : 'Undated'}
          </div>
          <div className="text-xs text-white/60">Image {index + 1} of {records.length}</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-2 relative">
        <button
          onClick={() => onIndex(index - 1)} disabled={index === 0}
          className="absolute left-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-0"
          aria-label="Previous photograph"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <img
          src={photo.imageData || photo.url}
          alt="Wound photograph with calibration marker"
          className="max-h-full max-w-full object-contain rounded-lg"
        />
        <button
          onClick={() => onIndex(index + 1)} disabled={index === records.length - 1}
          className="absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-0"
          aria-label="Next photograph"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Provenance. A photograph is only evidence if it says what was measured
          from it and how the scale was obtained. */}
      <div className="bg-black/60 text-white px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <ViewerFact label="Area" value={fmtArea(assessment.areaCm2)} />
          <ViewerFact
            label="Dimensions"
            value={assessment.lengthCm != null && assessment.widthCm != null
              ? `${Number(assessment.lengthCm).toFixed(1)} x ${Number(assessment.widthCm).toFixed(1)} cm`
              : '—'}
          />
          <ViewerFact label="Calibration" value={(photo.calibrationMethod || '—').replace(/_/g, ' ')} />
          <ViewerFact
            label="Scale"
            value={photo.pixelsPerCm ? `${photo.pixelsPerCm} px/cm` : '—'}
            tone={photo.scaleReliable ? 'text-green-300' : 'text-amber-300'}
          />
        </div>

        {photo.hasContourOverlay && (
          <p className="text-[11px] text-cyan-300 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-cyan-300 rounded" aria-hidden />
            The cyan outline is the margin this area was measured from
            {photo.contourPointCount ? ` (${photo.contourPointCount} points)` : ''}.
          </p>
        )}
        {photo.hasContourOverlay === false && (
          <p className="text-[11px] text-red-300 mt-2">
            No wound margin was detected in this frame — its dimensions cannot be relied on.
          </p>
        )}
        {!photo.scaleReliable && (
          <p className="text-[11px] text-amber-300 mt-2">
            This frame was not reliably calibrated — treat its dimensions as approximate.
          </p>
        )}
        {assessment.clinicalDescription && (
          <p className="text-xs text-white/70 mt-2">{assessment.clinicalDescription}</p>
        )}
      </div>
    </div>
  );
};

const ViewerFact: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div>
    <div className="text-white/50 uppercase tracking-wide text-[10px]">{label}</div>
    <div className={`capitalize ${tone || 'text-white'}`}>{value}</div>
  </div>
);

const ClinicalFact: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
    <dd className={`text-sm capitalize ${value ? 'text-gray-800' : 'text-gray-300'}`}>{value || '—'}</dd>
  </div>
);

const DocButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ icon, onClick, disabled, children }) => (
  <button
    onClick={onClick} disabled={disabled}
    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {icon} {children}
  </button>
);

/**
 * Build the dressing-protocol payload from a monitored wound + its latest
 * assessment. The phase is derived from the tissue actually recorded, falling
 * back to the granulation percentage when the clinician did not tick tissue
 * types — so a photo-only assessment still yields the right protocol.
 */
function dressingData(
  patient: Patient,
  wound: MonitoredWound,
  a: WoundAssessment,
  user: { firstName?: string; lastName?: string } | null,
): DressingProtocolData {
  const tissues = a.tissueTypes?.length
    ? a.tissueTypes
    : inferTissueTypes(a);
  return {
    patientName: patientName(patient),
    hospitalNumber: patient.hospitalNumber || wound.hospitalNumber || '',
    woundLocation: [wound.anatomicalLocation, wound.bodySide].filter(Boolean).join(' ') || '—',
    woundType: wound.woundType || '—',
    woundDimensions: {
      length: Number(a.lengthCm) || 0,
      width: Number(a.widthCm) || 0,
      depth: a.depthCm ?? undefined,
      area: a.areaCm2 ?? undefined,
    },
    tissueTypes: tissues,
    exudateAmount: a.exudateAmount || 'Not recorded',
    exudateType: a.exudateType,
    phase: getDressingPhase(tissues, a.granulationPct ?? undefined),
    painLevel: a.painLevel ?? undefined,
    assessedBy: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Clinician',
    assessedAt: a.assessedAt ? new Date(a.assessedAt) : new Date(),
  };
}

/**
 * Build the wound assessment report from the monitored wound, its latest
 * assessment and the derived healing picture. Rendered through the shared
 * generator, which builds on createSafePDF — so no unencodable glyph reaches
 * the page.
 */
function woundReportOptions(
  patient: Patient,
  wound: MonitoredWound,
  a: WoundAssessment,
  analytics: HealingAnalytics,
  user: { firstName?: string; lastName?: string } | null,
): WoundAssessmentPDFOptions {
  const tissues = a.tissueTypes?.length ? a.tissueTypes : inferTissueTypes(a);
  return {
    woundId: wound.id,
    assessmentDate: a.assessedAt ? new Date(a.assessedAt) : new Date(),
    patient: {
      name: patientName(patient),
      hospitalNumber: patient.hospitalNumber || wound.hospitalNumber || 'N/A',
      age: ageFrom(patient.dateOfBirth),
      gender: patient.gender,
    },
    hospitalName: 'AstroHEALTH',
    assessedBy: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Clinical Staff',
    woundType: wound.woundType || 'Not recorded',
    location: [wound.anatomicalLocation, wound.bodySide].filter(Boolean).join(' ') || 'Not recorded',
    etiology: wound.etiology || 'Not recorded',
    dimensions: {
      length: Number(a.lengthCm) || 0,
      width: Number(a.widthCm) || 0,
      depth: a.depthCm ?? undefined,
      area: a.areaCm2 ?? undefined,
    },
    phase: getDressingPhase(tissues, a.granulationPct ?? undefined),
    tissueTypes: tissues,
    exudateAmount: a.exudateAmount || 'Not recorded',
    exudateType: a.exudateType,
    odor: Boolean(a.odor),
    periWoundCondition: a.periWoundCondition,
    painLevel: Number(a.painLevel) || 0,
    dressingType: a.dressingType,
    dressingFrequency: a.dressingFrequency,
    // The report states the trend the timeline actually shows, rather than a
    // clinician's impression typed at a single visit.
    healingProgress: HEALING_TO_REPORT[analytics.status],
    notes: a.clinicalDescription,
  };
}

/** Map the Monitor's healing status onto the report's narrower vocabulary. */
const HEALING_TO_REPORT: Record<HealingStatus, 'improving' | 'static' | 'deteriorating' | undefined> = {
  improving: 'improving',
  healed: 'improving',
  stagnant: 'static',
  worsening: 'deteriorating',
  insufficient_data: undefined,
};

/** Whole years between a date of birth and today, or undefined if unknown. */
function ageFrom(dob?: Date | string): number | undefined {
  if (!dob) return undefined;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years >= 0 ? Math.floor(years) : undefined;
}

/** Derive tissue types from the measured percentages when none were ticked. */
function inferTissueTypes(a: WoundAssessment): TissueType[] {
  const present: TissueType[] = [];
  if (Number(a.necroticPct) > 0) present.push('necrotic');
  if (Number(a.sloughPct) > 0) present.push('slough');
  if (Number(a.granulationPct) > 0) present.push('granulation');
  if (Number(a.epithelialPct) > 0) present.push('epithelial');
  return present;
}

const Metric: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div>
    <div className="text-xs text-gray-500">{label}</div>
    <div className={`text-base font-semibold tabular-nums ${tone || 'text-gray-900'}`}>{value}</div>
  </div>
);

const TissueBar: React.FC<{ latest: WoundAssessment }> = ({ latest }) => {
  const seg = [
    { pct: Number(latest.granulationPct) || 0, color: 'bg-red-400', label: 'Granulation' },
    { pct: Number(latest.sloughPct) || 0, color: 'bg-yellow-400', label: 'Slough' },
    { pct: Number(latest.necroticPct) || 0, color: 'bg-gray-800', label: 'Necrotic' },
    { pct: Number(latest.epithelialPct) || 0, color: 'bg-pink-300', label: 'Epithelial' },
  ].filter(s => s.pct > 0);
  const total = seg.reduce((s, x) => s + x.pct, 0) || 1;
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">Wound bed composition</div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {seg.map((s, i) => <div key={i} className={s.color} style={{ width: `${(s.pct / total) * 100}%` }} title={`${s.label} ${s.pct}%`} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {seg.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <span className={`w-2 h-2 rounded-full ${s.color}`} /> {s.label} {Math.round(s.pct)}%
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Patient picker ──────────────────────────────────────────────────────────

/** Folder number for a patient registered without one. */
function generateHospitalNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CB${year}${random}`;
}

const PatientPickerModal: React.FC<{ onClose: () => void; onPick: (p: Patient) => void }> = ({ onClose, onPick }) => {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [registering, setRegistering] = useState(false);
  const all = useLiveQuery(() => db.patients.toArray(), []);
  const loading = all === undefined;

  const filtered = useMemo(() => {
    const list = (all || []).filter(p => p.isActive !== false);
    const term = q.trim().toLowerCase();
    if (!term) return list.slice(0, 30);
    return list.filter(p =>
      [p.firstName, p.lastName, p.hospitalNumber].filter(Boolean).join(' ').toLowerCase().includes(term)
    ).slice(0, 30);
  }, [q, all]);

  if (registering) {
    return (
      <QuickRegisterPatient
        initialName={q}
        hospitalId={user?.hospitalId}
        onCancel={() => setRegistering(false)}
        onCreated={onPick}
      />
    );
  }

  return (
    <Modal title="Select patient" onClose={onClose}>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search name or hospital number…"
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
        />
      </div>

      {/* Registering from here keeps the clinician in the flow. A wound is
          often the reason a patient is first entered at all, and being sent
          away to the full registration form loses the wound they came to
          record. The rest of the profile can be completed later. */}
      <button
        onClick={() => setRegistering(true)}
        className="w-full mb-3 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-teal-300 text-teal-700 hover:bg-teal-50 text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        {q.trim() ? `Register "${q.trim()}" as a new patient` : 'Register a new patient'}
      </button>

      {loading ? (
        <div className="h-40 bg-gray-50 rounded animate-pulse" />
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y">
          {filtered.map(p => (
            <li key={p.id}>
              <button onClick={() => onPick(p)} className="w-full text-left px-2 py-2.5 hover:bg-gray-50 rounded flex items-center justify-between">
                <span className="text-sm text-gray-800">{patientName(p)}</span>
                <span className="text-xs text-gray-400">{p.hospitalNumber}</span>
              </button>
            </li>
          ))}
          {!filtered.length && (
            <li className="py-6 text-center text-sm text-gray-400">
              No patients match “{q.trim()}”.
            </li>
          )}
        </ul>
      )}
    </Modal>
  );
};

/**
 * Minimal patient registration: name, folder number, gender.
 *
 * Everything else on the Patient record is optional here and completed later
 * from the patient's profile. The record is marked so it is obvious downstream
 * that the profile is still a stub rather than a fully registered patient.
 */
const QuickRegisterPatient: React.FC<{
  initialName: string;
  hospitalId?: string;
  onCancel: () => void;
  onCreated: (p: Patient) => void;
}> = ({ initialName, hospitalId, onCancel, onCreated }) => {
  // A typed search term is usually "SURNAME Firstname" or just a name; seed the
  // first field with it so nothing is retyped.
  const seeded = initialName.trim();
  const [firstName, setFirstName] = useState(seeded.split(/\s+/)[0] || '');
  const [lastName, setLastName] = useState(seeded.split(/\s+/).slice(1).join(' '));
  const [hospitalNumber, setHospitalNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (saving) return;
    if (!firstName.trim() && !lastName.trim()) { setError('Enter the patient’s name.'); return; }
    if (!gender) { setError('Select a gender.'); return; }

    setSaving(true);
    setError('');
    try {
      const folder = hospitalNumber.trim() || generateHospitalNumber();

      // A folder number is how staff find the patient, so a duplicate would
      // create two records that look identical on every list in the app.
      const clash = await db.patients
        .filter(p => (p.hospitalNumber || '').toLowerCase() === folder.toLowerCase())
        .first();
      if (clash) {
        setError(`Folder number ${folder} already belongs to ${patientName(clash)}.`);
        setSaving(false);
        return;
      }

      const now = new Date();
      const patient = {
        id: crypto.randomUUID(),
        hospitalNumber: folder,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        // Unknown for now. Recorded as-is rather than invented, so nothing
        // downstream mistakes a placeholder for a real date of birth.
        dateOfBirth: undefined,
        maritalStatus: undefined,
        phone: '',
        address: '',
        city: '',
        state: '',
        allergies: [],
        chronicConditions: [],
        nextOfKin: { name: '', relationship: '', phone: '', address: '' },
        careType: 'hospital',
        hospitalId,
        registeredHospitalId: hospitalId || 'global',
        isActive: true,
        // Flags the record as a stub so the profile can be completed later.
        registrationComplete: false,
        createdAt: now,
        updatedAt: now,
      } as unknown as Patient;

      await db.patients.add(patient);
      syncRecord('patients', patient as unknown as Record<string, unknown>);
      onCreated(patient);
    } catch (e: any) {
      console.error('[WoundMonitor] Quick registration failed:', e);
      setError(e?.message || 'Could not register the patient.');
      setSaving(false);
    }
  };

  return (
    <Modal title="Register a new patient" onClose={onCancel}>
      <p className="text-xs text-gray-500 mb-3">
        Just enough to record a wound now. The rest of the profile can be completed later
        from the patient’s record.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="First name">
          <input
            autoFocus value={firstName} onChange={e => setFirstName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Given name"
          />
        </Field>
        <Field label="Surname">
          <input
            value={lastName} onChange={e => setLastName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Family name"
          />
        </Field>
      </div>

      <Field label="Folder number">
        <input
          value={hospitalNumber} onChange={e => setHospitalNumber(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Leave blank to generate one"
        />
      </Field>

      <div className="mt-3">
        <span className="text-xs font-medium text-gray-600 mb-1.5 block">Gender</span>
        <div className="flex gap-2">
          {(['female', 'male'] as const).map(g => (
            <button
              key={g} type="button" onClick={() => setGender(g)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                gender === g
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex gap-2 pt-4">
        <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
          Back
        </button>
        <button
          onClick={save} disabled={saving}
          className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Register &amp; continue
        </button>
      </div>
    </Modal>
  );
};

// ── New wound ───────────────────────────────────────────────────────────────

const NewWoundModal: React.FC<{ patient: Patient; onClose: () => void; onCreated: (w: MonitoredWound) => void }> = ({ patient, onClose, onCreated }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<MonitoredWound>>({
    woundType: WOUND_TYPES[0], bodySide: 'Left', dateFirstSeen: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<MonitoredWound>) => setForm(f => ({ ...f, ...patch }));

  const submit = async () => {
    if (saving) return;
    if (!form.anatomicalLocation?.trim()) { setError('Anatomical location is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const wound = await createWound({
        patientId: patient.id,
        hospitalId: patient.registeredHospitalId,
        hospitalNumber: patient.hospitalNumber,
        label: form.label || `${form.anatomicalLocation} ${form.woundType}`.trim(),
        woundType: form.woundType,
        anatomicalLocation: form.anatomicalLocation,
        bodySide: form.bodySide,
        etiology: form.etiology,
        stage: form.stage,
        dateFirstSeen: form.dateFirstSeen,
        dateOfInjury: form.dateOfInjury,
        cause: form.cause,
        createdBy: user?.id,
      });
      onCreated(wound);
    } catch (e: any) {
      setError(e?.message || 'Could not create the wound.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Register wound" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Wound type">
          <select value={form.woundType} onChange={e => set({ woundType: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            {WOUND_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Site is picked from a list so the same wound is written the same
              way at every visit. "Left heel", "L heel" and "lt. heel" are one
              site to a clinician and three to a database. */}
          <div className="sm:col-span-2">
            <Field label="Anatomical location *">
              <GroupedSelect
                value={form.anatomicalLocation || ''}
                onChange={v => set({ anatomicalLocation: v })}
                groups={ANATOMICAL_SITES}
                placeholder="Select the site…"
                otherPlaceholder="Describe the site"
              />
            </Field>
          </div>
          <Field label="Body side">
            <select value={form.bodySide} onChange={e => set({ bodySide: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              {BODY_SIDES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date first seen"><input type="date" value={form.dateFirstSeen || ''} onChange={e => set({ dateFirstSeen: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
          <Field label="Date of injury"><input type="date" value={form.dateOfInjury || ''} onChange={e => set({ dateOfInjury: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></Field>
        </div>
        <Field label="Etiology / cause">
          <GroupedSelect
            value={form.cause || ''}
            onChange={v => set({ cause: v })}
            groups={WOUND_ETIOLOGIES}
            placeholder="Select the cause…"
            otherPlaceholder="Describe the cause"
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Register
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Capture assessment (reuses aiWoundMeasurement) ──────────────────────────

const CaptureAssessmentModal: React.FC<{ wound: MonitoredWound; onClose: () => void; onSaved: () => void }> = ({ wound, onClose, onSaved }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'trace' | 'photo' | 'guided' | 'manual'>('trace');

  // Tracing: the captured frame and the scale read from its marker.
  const [traceSource, setTraceSource] = useState<{ dataUrl: string; pxPerCm: number | null } | null>(null);
  const traceFileRef = useRef<HTMLInputElement>(null);
  const photoDataUrlForTracing = traceSource?.dataUrl ?? null;
  const tracingPixelsPerCm = traceSource?.pxPerCm ?? null;
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Editable measurement fields (auto-filled by AI, clinician confirms).
  const [m, setM] = useState<Partial<WoundAssessment>>({});
  const [scaleReliable, setScaleReliable] = useState(false);
  const [calibType, setCalibType] = useState('reference-card');
  // Optional Vision enrichment layer — supplements the on-device measurement.
  const [visionState, setVisionState] = useState<'idle' | 'running' | 'done' | 'unavailable'>('idle');
  const [vision, setVision] = useState<AiWoundAssessment | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // The captured frame, kept as the reference behind the measurement.
  const [photo, setPhoto] = useState<WoundAssessmentPhoto | null>(null);
  // Set once the clinician edits a field, so the async enrichment never
  // overwrites something a human has already typed.
  const editedRef = useRef(false);

  const analyzePhoto = async (file: File) => {
    setAnalyzing(true);
    setError('');
    setVision(null);
    setVisionState('idle');
    setWarnings([]);
    editedRef.current = false;

    let result: Awaited<ReturnType<typeof aiWoundMeasurement.measureWound>>;
    let dataUrl = '';
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Full resolution for the Vision pass, which reads wound-bed detail.
      dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      await aiWoundMeasurement.initialize();
      // measureWound auto-detects the calibration marker internally (green
      // marker → grid → ruler → fallback) and reports scaleReliable, so no
      // manual calibration step is needed here.
      result = await aiWoundMeasurement.measureWound(imageData);
      setScaleReliable(Boolean(result.scaleReliable));
      setCalibType(result.calibrationMethod || 'reference-card');
      setWarnings(result.warnings || []);

      // Keep the frame as the evidence behind the number: the marker that set
      // the scale, and the margin the area was computed from, drawn on top.
      // Downscaled, because the raw frame is several megabytes of base64 and
      // this rides a synced JSONB column.
      const shot = renderReferencePhoto(
        canvas,
        result.contourPoints,
        result.measurements?.calibrationFactor ?? null,
        REFERENCE_PHOTO_MAX_PX,
      );
      const ratio = shot.width / canvas.width;
      setPhoto({
        id: crypto.randomUUID(),
        imageData: shot.dataUrl,
        takenAt: new Date().toISOString(),
        widthPx: shot.width,
        heightPx: shot.height,
        pixelsPerCm: result.measurements?.calibrationFactor
          ? round(result.measurements.calibrationFactor * ratio)
          : null,
        calibrationMethod: result.calibrationMethod,
        scaleReliable: Boolean(result.scaleReliable),
        hasContourOverlay: shot.contourDrawn,
        contourPointCount: shot.points,
      });
      setM({
        lengthCm: round(result.length),
        widthCm: round(result.width),
        areaCm2: round(result.area),
        perimeterCm: round(result.perimeter),
        granulationPct: result.tissue ? round(result.tissue.granulation) : undefined,
        sloughPct: result.tissue ? round(result.tissue.slough) : undefined,
        necroticPct: result.tissue ? round(result.tissue.necrotic) : undefined,
        epithelialPct: result.tissue ? round(result.tissue.epithelial) : undefined,
        aiConfidence: result.confidence,
        contourCm: result.contourCm,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not analyse the image. Try manual entry.');
      setMode('manual');
      setAnalyzing(false);
      return;
    }
    // The measurement is complete and editable from here — the enrichment pass
    // below must never block the clinician.
    setAnalyzing(false);

    setVisionState('running');
    const ai = await aiWoundMeasurement.analyzeWithAI(dataUrl, wound.patientId, {
      woundRecordId: wound.id,
      calibrationType: result.calibrationMethod,
      calibrationValue: result.scaleReliable ? 'calibrated on-device' : undefined,
    });
    if (!ai) { setVisionState('unavailable'); return; }

    // Geometry stays with the calibrated on-device result; mergeAiAssessment
    // takes only the qualitative read and flags any size disagreement.
    const merged = aiWoundMeasurement.mergeAiAssessment(result, ai);
    setVision(ai);
    setWarnings(merged.warnings || []);
    setVisionState('done');

    // The Vision pass already reads exudate, peri-wound skin and infection
    // signs. Previously those were only rendered for the clinician to retype;
    // now they pre-fill the clinical fields, which stay fully editable.
    if (!editedRef.current) {
      setM(prev => ({
        ...prev,
        ...(merged.tissue ? {
          granulationPct: round(merged.tissue.granulation),
          sloughPct: round(merged.tissue.slough),
          necroticPct: round(merged.tissue.necrotic),
          epithelialPct: round(merged.tissue.epithelial),
        } : {}),
        healingStage: ai.healing_stage || prev.healingStage,
        clinicalDescription: prev.clinicalDescription || visionSummary(ai),
        exudateAmount: prev.exudateAmount ?? matchExudateAmount(ai.exudate),
        exudateType: prev.exudateType ?? matchExudateType(ai.exudate_type),
        periWoundCondition: prev.periWoundCondition || ai.surrounding_skin || undefined,
        infectionSigns: prev.infectionSigns ?? matchInfectionSigns(ai.signs_of_infection),
        odor: prev.odor ?? mentionsOdour(ai),
      }));
    }
  };

  const save = async () => {
    if (saving) return;
    const area = Number(m.areaCm2);
    // Zero is what an uncalibrated photo now yields, and a wound recorded as
    // 0 cm² would read as healed on the trend. Require a real number.
    if (!Number.isFinite(area) || area <= 0) {
      setError('A wound area is required. Photograph with the green marker, use Guided capture, or enter the size manually.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addAssessment({
        woundId: wound.id,
        patientId: wound.patientId,
        assessedBy: user?.id,
        lengthCm: numOrNull(m.lengthCm),
        widthCm: numOrNull(m.widthCm),
        areaCm2: area,
        perimeterCm: numOrNull(m.perimeterCm),
        granulationPct: numOrNull(m.granulationPct),
        sloughPct: numOrNull(m.sloughPct),
        necroticPct: numOrNull(m.necroticPct),
        epithelialPct: numOrNull(m.epithelialPct),
        healingStage: m.healingStage,
        clinicalDescription: m.clinicalDescription,
        aiConfidence: Number(m.aiConfidence) || 0,
        calibrationType: calibType,
        scaleReliable,
        contourCm: m.contourCm,
        // Bedside clinical layer
        tissueTypes: m.tissueTypes,
        exudateAmount: m.exudateAmount,
        exudateType: m.exudateType,
        odor: m.odor,
        painLevel: numOrNull(m.painLevel),
        periWoundCondition: m.periWoundCondition,
        infectionSigns: m.infectionSigns,
        dressingType: m.dressingType,
        dressingFrequency: m.dressingFrequency,
        photos: photo ? [photo] : undefined,
        assessedAt: new Date().toISOString(),
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save the assessment.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Fold a guided-capture result into the form. The clinician calibrated and
   * outlined this one by hand, so it is treated as edited — the async Vision
   * pass must not overwrite it — and the calibration is taken as reliable.
   */
  const applyGuidedMeasurement = useCallback((result: CalibratedMeasurement) => {
    editedRef.current = true;
    const t = result.tissueComposition;
    setScaleReliable(true);
    setCalibType(result.calibration?.method || 'manual_points');
    setM(prev => ({
      ...prev,
      lengthCm: round(result.lengthCm),
      widthCm: round(result.widthCm),
      areaCm2: round(result.areaCm2),
      perimeterCm: round(result.perimeterCm),
      depthCm: result.depthCm != null ? round(result.depthCm) : prev.depthCm,
      granulationPct: t ? round(t.granulationPercent) : prev.granulationPct,
      sloughPct: t ? round(t.sloughPercent) : prev.sloughPct,
      necroticPct: t ? round(t.necroticPercent) : prev.necroticPct,
      epithelialPct: t ? round(t.epithelialPercent) : prev.epithelialPct,
    }));

    // Keep the guided frame too, on the same terms as the AI path: the
    // annotated copy already carries the traced margin, so the evidence behind
    // a hand-calibrated measurement is preserved exactly like an automatic one.
    const source = result.annotatedImageDataUrl || result.imageDataUrl;
    if (source) {
      downscaleDataUrl(source, REFERENCE_PHOTO_MAX_PX)
        .then(shot => {
          if (!shot) return;
          const ratio = shot.width / Math.max(1, shot.originalWidth);
          setPhoto({
            id: crypto.randomUUID(),
            imageData: shot.dataUrl,
            takenAt: new Date().toISOString(),
            widthPx: shot.width,
            heightPx: shot.height,
            pixelsPerCm: result.calibration?.pixelsPerCm
              ? round(result.calibration.pixelsPerCm * ratio)
              : null,
            calibrationMethod: result.calibration?.method || 'manual_points',
            scaleReliable: true,
            // The outline is baked into annotatedImageDataUrl by the guided
            // component itself; the unannotated fallback carries none.
            hasContourOverlay: Boolean(result.annotatedImageDataUrl),
          });
        })
        .catch(e => console.warn('[WoundMonitor] Could not keep guided frame:', e));
    }

    // Drop back to the form so the clinician confirms and adds the clinical layer.
    setMode('manual');
  }, []);

  /**
   * Capture a frame for tracing and read its calibration marker.
   *
   * Only calibration is automatic here. The boundary is the clinician's, so the
   * frame is not segmented — which is the point: a colour threshold's guess at
   * where the wound ends is exactly what tracing replaces.
   */
  const prepareTraceImage = useCallback(async (file: File) => {
    setAnalyzing(true);
    setError('');
    setWarnings([]);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not read the photograph.');
      ctx.drawImage(bitmap, 0, 0);

      let pxPerCm: number | null = null;
      let method = 'none';
      try {
        const calibration = await detectCalibrationMarker(canvas);
        if (calibration?.pixelsPerCm) {
          pxPerCm = calibration.pixelsPerCm;
          method = calibration.method;
        }
      } catch (e) {
        console.warn('[WoundMonitor] Calibration failed on traced frame:', e);
      }

      if (!pxPerCm) {
        setWarnings([
          'No green calibration marker was found, so the trace can only be recorded in pixels. ' +
          'Re-shoot with the marker flat beside the wound to get an area in cm².',
        ]);
      }

      setScaleReliable(Boolean(pxPerCm));
      setCalibType(method);

      // Downscaled for tracing: a 4000px frame is slow to redraw on every
      // pointer move, and 1600px is more than enough to follow a wound edge.
      const shot = renderReferencePhoto(canvas, undefined, null, 1600);
      const ratio = shot.width / canvas.width;

      setTraceSource({
        dataUrl: shot.dataUrl,
        pxPerCm: pxPerCm ? round(pxPerCm * ratio) : null,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not read the photograph.');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  /**
   * Fold a traced measurement into the assessment.
   *
   * Area, perimeter and the derived dimensions all come from the outline the
   * clinician drew, measured against the marker — so these are the one set of
   * numbers in the module that rest on geometry rather than estimation.
   */
  const applyTracedMeasurement = useCallback(
    ({ traces, annotatedDataUrl }: { traces: Trace[]; annotatedDataUrl: string }) => {
      editedRef.current = true;
      const total = traces.find(t => t.role === 'total');
      if (!total) return;

      const geometry = measureTrace(total.points, tracingPixelsPerCm);
      const planimetry = computePlanimetry(traces, tracingPixelsPerCm);

      // Length and width come from the traced outline's extent, converted by
      // the same scale as the area, so every dimension is consistent with it.
      const xs = total.points.map(p => p.x);
      const ys = total.points.map(p => p.y);
      const spanX = Math.max(...xs) - Math.min(...xs);
      const spanY = Math.max(...ys) - Math.min(...ys);
      const toCm = (px: number) =>
        tracingPixelsPerCm ? round(px / tracingPixelsPerCm) : undefined;

      setM(prev => ({
        ...prev,
        areaCm2: planimetry.totalAreaCm2 ?? prev.areaCm2,
        perimeterCm: geometry.perimeterCm ?? prev.perimeterCm,
        lengthCm: toCm(Math.max(spanX, spanY)) ?? prev.lengthCm,
        widthCm: toCm(Math.min(spanX, spanY)) ?? prev.widthCm,
      }));

      setPhoto({
        id: crypto.randomUUID(),
        imageData: annotatedDataUrl,
        takenAt: new Date().toISOString(),
        pixelsPerCm: tracingPixelsPerCm,
        calibrationMethod: calibType,
        scaleReliable,
        // The outline is drawn into the saved frame by the tracer itself.
        hasContourOverlay: true,
        contourPointCount: total.points.length,
      });

      setTraceSource(null);
      // Back to the form to confirm and add the clinical layer.
      setMode('manual');
    },
    [tracingPixelsPerCm, calibType, scaleReliable],
  );

  const setField = (k: keyof WoundAssessment, v: string) => {
    editedRef.current = true;
    setM(prev => ({ ...prev, [k]: v === '' ? undefined : Number(v) }));
  };

  /** Set a non-numeric field, marking the record as clinician-edited. */
  const setValue = <K extends keyof WoundAssessment>(k: K, v: WoundAssessment[K]) => {
    editedRef.current = true;
    setM(prev => ({ ...prev, [k]: v }));
  };

  /** Toggle membership of one of the multi-select clinical lists. */
  const toggleIn = (k: 'tissueTypes' | 'infectionSigns', value: string) => {
    editedRef.current = true;
    setM(prev => {
      const current = (prev[k] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter(x => x !== value)
        : [...current, value];
      return { ...prev, [k]: next.length ? next : undefined };
    });
  };

  return (
    <Modal title="New assessment" onClose={onClose} wide>
      <div className="flex flex-wrap gap-2 mb-4">
        {(['trace', 'photo', 'guided', 'manual'] as const).map(t => (
          <button key={t} onClick={() => setMode(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t === 'trace' ? 'Trace the margin'
              : t === 'photo' ? 'Auto measure'
                : t === 'guided' ? 'Guided capture' : 'Manual entry'}
          </button>
        ))}
      </div>

      {/* Trace the margin: photograph, then draw round the wound edge. The area
          is exact geometry over what the clinician outlined, rather than a
          colour threshold's guess at where the wound ends — which is why this
          is offered first. */}
      {mode === 'trace' && (
        photoDataUrlForTracing ? (
          <div className="mb-4">
            <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
              <WoundTracer
                imageSrc={photoDataUrlForTracing}
                pixelsPerCm={tracingPixelsPerCm}
                onCancel={() => setTraceSource(null)}
                onComplete={applyTracedMeasurement}
              />
            </Suspense>
          </div>
        ) : (
          <div className="mb-4">
            <input
              ref={traceFileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) prepareTraceImage(f); }}
            />
            <button
              onClick={() => traceFileRef.current?.click()}
              disabled={analyzing}
              className="w-full py-6 border-2 border-dashed border-teal-300 rounded-xl text-teal-700 hover:bg-teal-50 flex flex-col items-center gap-2 disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              <span className="text-sm font-medium">
                {analyzing ? 'Reading the marker…' : 'Capture or upload wound photo'}
              </span>
              <span className="text-xs text-gray-500">
                Include the printed green marker — it sets the scale the traced area is measured in
              </span>
            </button>
            {warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      {/* Guided capture: step-by-step calibration and manual tracing, for when
          the one-shot AI pass cannot find a marker or gets the outline wrong. */}
      {mode === 'guided' && (
        <div className="mb-4">
          <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
            <CalibratedWoundCapture
              patientId={wound.patientId}
              woundId={wound.id}
              onCancel={() => setMode('photo')}
              onMeasurementComplete={applyGuidedMeasurement}
            />
          </Suspense>
        </div>
      )}

      {mode === 'photo' && (
        <div className="mb-4">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) analyzePhoto(f); }} />
          <button
            onClick={() => fileRef.current?.click()} disabled={analyzing}
            className="w-full py-6 border-2 border-dashed border-teal-300 rounded-xl text-teal-700 hover:bg-teal-50 flex flex-col items-center gap-2 disabled:opacity-60"
          >
            {analyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            <span className="text-sm font-medium">{analyzing ? 'Analysing…' : 'Capture or upload wound photo'}</span>
            <span className="text-xs text-gray-500">
              Place the printed green marker flat beside the wound — it is what gives an accurate size
            </span>
          </button>
          {!analyzing && m.areaCm2 != null && (
            <p className={`text-xs mt-2 ${
              scaleReliable ? 'text-green-600' : Number(m.areaCm2) > 0 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {scaleReliable
                ? '✓ Calibrated measurement'
                : Number(m.areaCm2) > 0
                  ? '⚠ Weak calibration — size is approximate. Confirm below.'
                  : '✗ No scale reference found. The outline was measured but its real size is unknown — re-shoot with the green marker, switch to Guided capture, or enter the size yourself.'}
            </p>
          )}

          {/* Vision enrichment status. Absence is normal (offline / not
              configured), so it is stated plainly rather than as an error. */}
          {visionState === 'running' && (
            <p className="text-xs mt-1 text-gray-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Adding clinical assessment…
            </p>
          )}
          {visionState === 'unavailable' && (
            <p className="text-xs mt-1 text-gray-400">
              Clinical assessment unavailable offline — on-device measurement only.
            </p>
          )}

          {warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w}
                </li>
              ))}
            </ul>
          )}

          {/* What will be kept. Shown so it is obvious whether the marker made
              it into frame — the one thing that decides if this measurement
              can be trusted or re-checked later. */}
          {photo?.imageData && (
            <div className="mt-3 flex gap-3 items-start">
              <img
                src={photo.imageData}
                alt="Photograph that will be saved with this assessment"
                className="w-24 h-24 object-cover rounded-lg border"
              />
              <div className="text-xs text-gray-500 space-y-0.5">
                <p className="text-gray-700 font-medium">Saved with this assessment</p>
                <p>{photo.widthPx}×{photo.heightPx} px · {formatBytes(dataUrlBytes(photo.imageData))}</p>
                {photo.pixelsPerCm ? <p>{photo.pixelsPerCm} px/cm</p> : null}
                <p className={photo.scaleReliable ? 'text-green-600' : 'text-amber-600'}>
                  {photo.scaleReliable
                    ? 'Calibration marker found in frame'
                    : 'No reliable marker in frame'}
                </p>
                {/* The outline is the thing to check before saving: if the cyan
                    line does not follow the wound edge, the area is wrong no
                    matter how good the calibration was. */}
                <p className={photo.hasContourOverlay ? 'text-teal-600' : 'text-red-600'}>
                  {photo.hasContourOverlay
                    ? `Margin traced (${photo.contourPointCount} points) — check it follows the wound edge`
                    : 'No wound margin detected — do not rely on this measurement'}
                </p>
              </div>
            </div>
          )}

          {vision && (
            <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/60 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-800">Clinical assessment (AI — confirm before saving)</span>
                {vision.confidence != null && (
                  <span className="text-xs text-teal-700">{Math.round(Number(vision.confidence) * 100)}% confidence</span>
                )}
              </div>
              {vision.healing_stage && <VisionRow label="Healing stage" value={vision.healing_stage} />}
              {vision.edges && <VisionRow label="Edges" value={vision.edges} />}
              {vision.exudate && <VisionRow label="Exudate" value={[vision.exudate, vision.exudate_type].filter(Boolean).join(' · ')} />}
              {vision.surrounding_skin && <VisionRow label="Periwound skin" value={vision.surrounding_skin} />}
              {!!vision.signs_of_infection?.length && (
                <p className="text-xs text-red-700 flex gap-1.5 pt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Possible infection: {vision.signs_of_infection.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Editable measurements (shared by both modes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <NumField label="Length (cm)" value={m.lengthCm} onChange={v => setField('lengthCm', v)} />
        <NumField label="Width (cm)" value={m.widthCm} onChange={v => setField('widthCm', v)} />
        <NumField label="Area (cm²) *" value={m.areaCm2} onChange={v => setField('areaCm2', v)} />
        <NumField label="Perimeter (cm)" value={m.perimeterCm} onChange={v => setField('perimeterCm', v)} />
        <NumField label="Granulation %" value={m.granulationPct} onChange={v => setField('granulationPct', v)} />
        <NumField label="Slough %" value={m.sloughPct} onChange={v => setField('sloughPct', v)} />
        <NumField label="Necrotic %" value={m.necroticPct} onChange={v => setField('necroticPct', v)} />
        <NumField label="Epithelial %" value={m.epithelialPct} onChange={v => setField('epithelialPct', v)} />
      </div>

      {/* ── Bedside clinical assessment (merged in from the Wounds module) ── */}
      <div className="border-t pt-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Clinical assessment</h4>

        <div className="mb-3">
          <span className="text-xs font-medium text-gray-600 mb-1.5 block">Tissue types present</span>
          <div className="flex flex-wrap gap-1.5">
            {TISSUE_TYPES.map(t => (
              <Chip key={t} active={!!m.tissueTypes?.includes(t)} onClick={() => toggleIn('tissueTypes', t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Exudate amount">
            <select
              value={m.exudateAmount || ''}
              onChange={e => setValue('exudateAmount', (e.target.value || undefined) as ExudateAmount | undefined)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Not recorded</option>
              {EXUDATE_AMOUNTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Exudate type">
            <select
              value={m.exudateType || ''}
              onChange={e => setValue('exudateType', (e.target.value || undefined) as ExudateType | undefined)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Not recorded</option>
              {EXUDATE_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label={`Pain score — ${m.painLevel ?? 0}/10`}>
            <input
              type="range" min={0} max={10} step={1}
              value={m.painLevel ?? 0}
              onChange={e => setValue('painLevel', Number(e.target.value))}
              className="w-full"
            />
          </Field>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox" checked={!!m.odor}
              onChange={e => setValue('odor', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Malodour present</span>
          </label>
        </div>

        <div className="mb-3">
          <span className="text-xs font-medium text-gray-600 mb-1.5 block">Signs of infection</span>
          <div className="flex flex-wrap gap-1.5">
            {INFECTION_SIGNS.map(s => (
              <Chip key={s} tone="red" active={!!m.infectionSigns?.includes(s)} onClick={() => toggleIn('infectionSigns', s)}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <Field label="Peri-wound skin">
          <input
            value={m.periWoundCondition || ''}
            onChange={e => setValue('periWoundCondition', e.target.value || undefined)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Intact / macerated / erythematous / excoriated…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Dressing in use">
            <input
              value={m.dressingType || ''}
              onChange={e => setValue('dressingType', e.target.value || undefined)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Hera Gel + foam"
            />
          </Field>
          <Field label="Change frequency">
            <input
              value={m.dressingFrequency || ''}
              onChange={e => setValue('dressingFrequency', e.target.value || undefined)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Daily"
            />
          </Field>
        </div>
      </div>

      <Field label="Clinical description (optional)">
        <textarea
          value={m.clinicalDescription || ''}
          onChange={e => { editedRef.current = true; setM(prev => ({ ...prev, clinicalDescription: e.target.value })); }}
          rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Wound bed, edges, exudate, periwound skin…"
        />
      </Field>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 pt-3">
        <button onClick={onClose} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
        <button onClick={save} disabled={saving} className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save assessment
        </button>
      </div>
    </Modal>
  );
};

// ── Small shared primitives ─────────────────────────────────────────────────

const Chip: React.FC<{
  active: boolean;
  onClick: () => void;
  tone?: 'teal' | 'red';
  children: React.ReactNode;
}> = ({ active, onClick, tone = 'teal', children }) => {
  const on = tone === 'red'
    ? 'bg-red-600 text-white border-red-600'
    : 'bg-teal-600 text-white border-teal-600';
  return (
    <button
      type="button" onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-colors ${
        active ? on : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-xs font-medium text-gray-600 mb-1 block">{label}</span>
    {children}
  </label>
);

const NumField: React.FC<{ label: string; value: any; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Field label={label}>
    <input type="number" step="0.1" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm tabular-nums" />
  </Field>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
    <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} shadow-2xl my-4 sm:my-8 max-h-[calc(100vh-2rem)] flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const VisionRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <p className="text-xs text-gray-700"><span className="text-gray-500">{label}:</span> {value}</p>
);

/**
 * Condense the Vision assessment into a clinical description the clinician can
 * edit. Only the descriptive findings — never the AI's own size estimate, which
 * is a cross-check and not the recorded measurement.
 */
function visionSummary(ai: AiWoundAssessment): string {
  const parts = [
    ai.color_assessment ? `Wound bed: ${ai.color_assessment}.` : '',
    ai.edges ? `Edges: ${ai.edges}.` : '',
    ai.exudate ? `Exudate: ${[ai.exudate, ai.exudate_type].filter(Boolean).join(', ')}.` : '',
    ai.surrounding_skin ? `Periwound skin: ${ai.surrounding_skin}.` : '',
    ai.signs_of_infection?.length ? `Possible infection: ${ai.signs_of_infection.join(', ')}.` : '',
    ai.observations || '',
  ].filter(Boolean);
  return parts.join(' ').trim();
}

// ── Vision → clinical field matchers ────────────────────────────────────────
// The Vision layer returns free text ("moderate serous exudate"), so each value
// is matched against the closed vocabulary the form stores. Anything that does
// not match confidently is left unset for the clinician rather than guessed at.

function matchExudateAmount(text?: string): ExudateAmount | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  if (/\bnone\b|\bdry\b|absent/.test(t)) return 'none';
  if (/heavy|copious|profuse|high/.test(t)) return 'heavy';
  if (/moderate|medium/.test(t)) return 'moderate';
  if (/light|scant|minimal|small|low/.test(t)) return 'light';
  return undefined;
}

function matchExudateType(text?: string): ExudateType | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  // Check the compound term before its two constituents.
  if (/serosanguin/.test(t)) return 'serosanguineous';
  if (/purulent|pus\b/.test(t)) return 'purulent';
  if (/sanguin|blood|haemorrhag|hemorrhag/.test(t)) return 'sanguineous';
  if (/serous/.test(t)) return 'serous';
  return undefined;
}

/** Map free-text infection findings onto the INFECTION_SIGNS vocabulary. */
function matchInfectionSigns(signs?: string[]): string[] | undefined {
  if (!signs?.length) return undefined;
  const blob = signs.join(' ').toLowerCase();
  const matched = INFECTION_SIGNS.filter(sign => {
    switch (sign) {
      case 'Erythema': return /erythem|redness|red\b|inflam/.test(blob);
      case 'Warmth': return /warm|hot\b|heat/.test(blob);
      case 'Swelling': return /swell|oedema|edema/.test(blob);
      case 'Purulent discharge': return /purulent|pus\b|discharge/.test(blob);
      case 'Malodour': return /odour|odor|smell|malodor|foul/.test(blob);
      case 'Increasing pain': return /pain|tender/.test(blob);
      case 'Delayed healing': return /delay|stall|static|non-?healing/.test(blob);
      case 'Friable granulation': return /friable|bleed/.test(blob);
      default: return false;
    }
  });
  return matched.length ? [...matched] : undefined;
}

/** True when the Vision read mentions odour anywhere it reports findings. */
function mentionsOdour(ai: AiWoundAssessment): boolean | undefined {
  const blob = [ai.exudate, ai.exudate_type, ...(ai.signs_of_infection || [])]
    .filter(Boolean).join(' ').toLowerCase();
  if (!blob) return undefined;
  return /odour|odor|smell|malodor|foul/.test(blob) || undefined;
}

/**
 * Longest edge of the stored reference photograph, in pixels.
 *
 * Measurement runs on the full-resolution frame; only the kept copy is reduced.
 * 1280 px still shows the wound bed and lets the calibration marker be read by
 * eye, at roughly 120-200 KB per assessment instead of the 3-6 MB a raw phone
 * frame costs — which matters because these ride a synced JSONB column.
 */
const REFERENCE_PHOTO_MAX_PX = 1280;

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
function renderReferencePhoto(
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
function downscaleDataUrl(
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

/** Rough byte size of a data URL, for showing how much a photo costs. */
function dataUrlBytes(dataUrl?: string): number {
  if (!dataUrl) return 0;
  const i = dataUrl.indexOf(',');
  return i < 0 ? 0 : Math.floor(((dataUrl.length - i - 1) * 3) / 4);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function round(v: number): number { return Math.round(v * 10) / 10; }
function numOrNull(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null; }

export default WoundProgressMonitorPage;
