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
  Activity, AlertTriangle, ArrowLeft, Camera, ChevronRight, LineChart, Plus,
  RefreshCw, Ruler, Search, TrendingDown, TrendingUp, Minus, Loader2, X,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient } from '../../../types';
import { aiWoundMeasurement, type WoundProgressEntry } from '../services/aiWoundMeasurement';
import {
  listWounds, getWoundTimeline, getMonitorDashboard, createWound, addAssessment,
  computeHealingAnalytics, healingAlerts, HEALING_STATUS_META,
  type MonitoredWound, type WoundAssessment, type HealingStatus, type MonitoredWoundSummary,
  type MonitorDashboard,
} from '../services/woundMonitorService';

const WoundHealingMap = lazy(() => import('../components/WoundHealingMap'));
const MonitorTrendChart = lazy(() => import('../components/MonitorTrendChart'));

const WOUND_TYPES = [
  'Burn', 'Pressure Injury', 'Venous Ulcer', 'Diabetic Foot Ulcer', 'Surgical Wound',
  'Traumatic Wound', 'Skin Graft Donor Site', 'Flap', 'Necrotizing Fasciitis', "Fournier's Gangrene",
];
const BODY_SIDES = ['Left', 'Right', 'Midline', 'Bilateral'];

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
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

        {/* Right: latest description */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Latest clinical description</h3>
          {latest?.clinicalDescription ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{latest.clinicalDescription}</p>
          ) : (
            <p className="text-sm text-gray-400">No description recorded on the latest assessment.</p>
          )}
          {latest?.assessedAt && (
            <p className="text-xs text-gray-400 mt-3">Assessed {new Date(latest.assessedAt).toLocaleString()}</p>
          )}
        </div>
      </div>

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
              <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 tabular-nums">{fmtArea(a.areaCm2)}</div>
                  <div className="text-xs text-gray-400">
                    {a.assessedAt ? new Date(a.assessedAt).toLocaleString() : '—'}
                    {a.scaleReliable === false && ' • uncalibrated'}
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
    </div>
  );
};

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

const PatientPickerModal: React.FC<{ onClose: () => void; onPick: (p: Patient) => void }> = ({ onClose, onPick }) => {
  const [q, setQ] = useState('');
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
          {!filtered.length && <li className="py-6 text-center text-sm text-gray-400">No patients found.</li>}
        </ul>
      )}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Anatomical location *">
            <input value={form.anatomicalLocation || ''} onChange={e => set({ anatomicalLocation: e.target.value })} placeholder="e.g. Left heel" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </Field>
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
          <input value={form.cause || ''} onChange={e => set({ cause: e.target.value })} placeholder="e.g. Prolonged pressure, immobility" className="w-full border rounded-lg px-3 py-2 text-sm" />
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
  const [mode, setMode] = useState<'photo' | 'manual'>('photo');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Editable measurement fields (auto-filled by AI, clinician confirms).
  const [m, setM] = useState<Partial<WoundAssessment>>({});
  const [scaleReliable, setScaleReliable] = useState(false);
  const [calibType, setCalibType] = useState('reference-card');

  const analyzePhoto = async (file: File) => {
    setAnalyzing(true);
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      await aiWoundMeasurement.initialize();
      // measureWound auto-detects the calibration marker internally (green
      // marker → grid → ruler → fallback) and reports scaleReliable, so no
      // manual calibration step is needed here.
      const result = await aiWoundMeasurement.measureWound(imageData);
      setScaleReliable(Boolean(result.scaleReliable));
      setCalibType(result.calibrationMethod || 'reference-card');
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
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (saving) return;
    const area = Number(m.areaCm2);
    if (!Number.isFinite(area)) { setError('A wound area is required.'); return; }
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
        clinicalDescription: m.clinicalDescription,
        aiConfidence: Number(m.aiConfidence) || 0,
        calibrationType: calibType,
        scaleReliable,
        contourCm: m.contourCm,
        assessedAt: new Date().toISOString(),
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save the assessment.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (k: keyof WoundAssessment, v: string) => setM(prev => ({ ...prev, [k]: v === '' ? undefined : Number(v) }));

  return (
    <Modal title="New assessment" onClose={onClose} wide>
      <div className="flex gap-2 mb-4">
        {(['photo', 'manual'] as const).map(t => (
          <button key={t} onClick={() => setMode(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t === 'photo' ? 'AI photo measurement' : 'Manual entry'}
          </button>
        ))}
      </div>

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
            <span className="text-xs text-gray-500">Include a calibration marker (coin / card / ruler) for accurate sizing</span>
          </button>
          {!analyzing && m.areaCm2 != null && (
            <p className={`text-xs mt-2 ${scaleReliable ? 'text-green-600' : 'text-amber-600'}`}>
              {scaleReliable ? '✓ Calibrated measurement' : '⚠ No reliable calibration marker — size is approximate. Confirm below.'}
            </p>
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

      <Field label="Clinical description (optional)">
        <textarea
          value={m.clinicalDescription || ''} onChange={e => setM(prev => ({ ...prev, clinicalDescription: e.target.value }))}
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

function round(v: number): number { return Math.round(v * 10) / 10; }
function numOrNull(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null; }

export default WoundProgressMonitorPage;
