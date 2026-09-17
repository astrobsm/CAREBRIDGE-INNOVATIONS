/**
 * Peripheral arterial disease — the clinician-facing module.
 *
 * Progressive disclosure, as the specification asks: the acute screen and the
 * measurements that drive WIfI come first, and the rest expands from there. A
 * clinician at a bedside should be able to select the patient and limb, record
 * pulses and pressures, and see a graded limb in a handful of taps.
 *
 * The acute ischaemia screen sits above everything and is never gated behind
 * the rest of the form — an acutely ischaemic limb has hours.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowLeft, ChevronDown, Footprints,
  Info, Plus, RefreshCw, Stethoscope, Syringe,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database';
import type { Patient } from '../../../types';
import { PatientSelector } from '../../../components/patient/PatientSelector';
import { formatDateSafe } from '../../../utils/safeDate';
import {
  limbOverview, saveAssessment, finalizeAssessment, addIntervention,
  type LimbOverview,
} from '../services/vascularService';
import { summarisePerfusion } from '../services/perfusion';
import { SIX_PS } from '../services/acuteIschaemia';
import { READINESS_LABEL } from '../services/healingOutlook';
import {
  PAD_PRESENTATIONS, type AcuteIschaemiaScreen, type FootInfectionAssessment,
  type PadPresentation, type PressureSet, type Side, type VascularAlert,
  type VascularInterventionKind, type VascularWoundSnapshot, type LocalPerfusionRecord,
} from '../types';
import WifiPanel from '../components/WifiPanel';
import PerfusionWoundChart from '../components/PerfusionWoundChart';

export default function VascularAssessmentPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [side, setSide] = useState<Side>('left');

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
          <Footprints className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Peripheral Arterial Disease
          </h1>
          <p className="text-sm text-gray-500">
            Perfusion, limb threat and wound healing, followed over time
          </p>
        </div>
      </header>

      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          <PatientSelector
            label="Patient" required
            value={patient?.id}
            onChange={(_id, p) => setPatient(p ?? null)}
            placeholder="Search by name or folder number…"
          />
          <div>
            <span className="text-xs font-medium text-gray-600 mb-1 block">Limb</span>
            <div className="flex gap-1.5">
              {(['left', 'right'] as Side[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    side === s
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {s === 'left' ? 'Left' : 'Right'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Each limb carries its own assessments and its own trajectory. Bilateral disease is two
          records, never one averaged together.
        </p>
      </div>

      {patient
        ? <LimbView key={`${patient.id}-${side}`} patient={patient} side={side} />
        : (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Footprints className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Select a patient to begin.</p>
          </div>
        )}
    </div>
  );
}

// ── One limb ────────────────────────────────────────────────────────────────

const LimbView: React.FC<{ patient: Patient; side: Side }> = ({ patient, side }) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<LimbOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [treating, setTreating] = useState(false);

  const conditions = useMemo(
    () => (patient.chronicConditions ?? []).map(c => String(c).toLowerCase()).join(' '),
    [patient],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setOverview(await limbOverview(patient.id, side, {
      diabetes: /diabet/.test(conditions),
      smoker: /smok|tobacco/.test(conditions),
      renalImpairment: /renal|kidney|dialysis/.test(conditions),
    }));
    setLoading(false);
  }, [patient.id, side, conditions]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />;
  if (!overview) return null;

  const { assessments, latest, wifi, trends, acute, outlook, readiness, alerts,
    changeSummary, interventions } = overview;

  if (assessing) {
    return (
      <AssessmentForm
        patient={patient}
        side={side}
        onCancel={() => setAssessing(false)}
        onSaved={() => { setAssessing(false); load(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Acute screen always first. */}
      {acute.concerning && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">{acute.headline}</p>
              <p className="text-sm text-red-800 mt-0.5">{acute.action}</p>
              <ul className="mt-2 space-y-0.5">
                {[...acute.positiveFeatures, ...acute.supportingFindings].map((f, i) => (
                  <li key={i} className="text-xs text-red-800">• {f}</li>
                ))}
              </ul>
              {acute.suggestedCategory && (
                <p className="text-xs text-red-900 mt-2 font-medium">
                  Suggested Rutherford category {acute.suggestedCategory} — clinician confirmation required.
                </p>
              )}
              {acute.categoryBasis.map((b, i) => (
                <p key={i} className="text-xs text-red-700">{b}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {patient.firstName} {patient.lastName} — {side} limb
          </h2>
          <p className="text-xs text-gray-400">
            {assessments.length} assessment{assessments.length === 1 ? '' : 's'}
            {latest && ` · last ${formatDateSafe(latest.assessedAt, 'd MMM yyyy')}`}
            {interventions.length > 0 && ` · ${interventions.length} intervention${interventions.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium"
          >
            <Syringe className="w-4 h-4" /> Record intervention
          </button>
          <button
            onClick={() => setAssessing(true)}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New assessment
          </button>
        </div>
      </div>

      {alerts.length > 0 && <AlertList alerts={alerts} />}

      {!latest ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No assessments for this limb yet.</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            The first assessment becomes the baseline everything afterwards is measured against.
          </p>
        </div>
      ) : (
        <>
          {latest.status !== 'finalized' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-amber-900">
                The most recent assessment has not been finalized by a clinician.
              </p>
              <button
                onClick={async () => { await finalizeAssessment(latest.id, user?.id ?? 'system'); load(); }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium"
              >
                Confirm and finalize
              </button>
            </div>
          )}

          {wifi && <WifiPanel wifi={wifi} />}

          {changeSummary.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Change since the previous assessment</h3>
              {changeSummary.map((c, i) => (
                <p key={i} className="text-sm text-gray-700">{c}</p>
              ))}
            </div>
          )}

          <PerfusionWoundChart trends={trends} interventions={interventions} />

          {outlook && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Healing outlook</h3>
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold capitalize">
                  {outlook.outlook.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-emerald-700 mb-1">Favourable</p>
                  {outlook.favourable.length
                    ? outlook.favourable.map((f, i) => (
                      <p key={i} className="text-xs text-gray-700">• {f}</p>))
                    : <p className="text-xs text-gray-400">None recorded.</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Concerning</p>
                  {outlook.concerning.length
                    ? outlook.concerning.map((c, i) => (
                      <p key={i} className="text-xs text-gray-700">• {c}</p>))
                    : <p className="text-xs text-gray-400">None recorded.</p>}
                </div>
              </div>
              {outlook.missing.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-1">Would most improve this assessment</p>
                  {outlook.missing.map((m, i) => (
                    <p key={i} className="text-xs text-gray-500">• {m}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{outlook.statement}</p>
            </div>
          )}

          {readiness && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Reconstructive readiness</h3>
              <p className="text-base font-semibold text-gray-900">{READINESS_LABEL[readiness.readiness]}</p>
              {readiness.basis.map((b, i) => (
                <p key={i} className="text-xs text-gray-700 mt-0.5">• {b}</p>
              ))}
              {readiness.outstanding.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-1">Outstanding</p>
                  {readiness.outstanding.map((o, i) => (
                    <p key={i} className="text-xs text-gray-500">• {o}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-amber-700 mt-2">{readiness.disclaimer}</p>
            </div>
          )}

          <TrendTable trends={trends} />
        </>
      )}

      {treating && (
        <InterventionModal
          patientId={patient.id} side={side} userId={user?.id}
          onClose={() => setTreating(false)}
          onSaved={() => { setTreating(false); load(); }}
        />
      )}
    </div>
  );
};

const AlertList: React.FC<{ alerts: VascularAlert[] }> = ({ alerts }) => (
  <div className="space-y-2">
    {alerts.map(a => {
      const style = a.level === 'red'
        ? { row: 'bg-red-50 border-red-200', Icon: AlertOctagon, chip: 'bg-red-600 text-white' }
        : a.level === 'amber'
          ? { row: 'bg-amber-50 border-amber-200', Icon: AlertTriangle, chip: 'bg-amber-500 text-white' }
          : { row: 'bg-emerald-50 border-emerald-200', Icon: Info, chip: 'bg-emerald-600 text-white' };
      return (
        <div key={a.id} className={`border rounded-xl p-3 ${style.row}`}>
          <div className="flex items-start gap-2">
            <style.Icon className="w-4 h-4 mt-0.5 shrink-0 text-gray-600" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{a.title}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${style.chip}`}>
                  {a.level}
                </span>
              </div>
              {a.evidence.map((e, i) => (
                <p key={i} className="text-xs text-gray-700 mt-0.5">• {e}</p>
              ))}
              <p className="text-xs text-gray-600 mt-1 font-medium">{a.action}</p>
            </div>
          </div>
        </div>
      );
    })}
    <p className="text-xs text-gray-400">
      Decision-support alerts based on documented findings, not diagnoses.
    </p>
  </div>
);

const TrendTable: React.FC<{ trends: LimbOverview['trends'] }> = ({ trends }) => {
  const [open, setOpen] = useState(false);
  const shown = trends.filter(t => t.series.length > 0);
  if (!shown.length) return null;

  return (
    <div className="bg-white rounded-xl border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <h3 className="text-sm font-semibold text-gray-700">All measurements over time</h3>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-1.5">Measure</th>
                <th className="text-right py-1.5">Baseline</th>
                <th className="text-right py-1.5">Previous</th>
                <th className="text-right py-1.5">Current</th>
                <th className="text-right py-1.5">Trend</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(t => (
                <tr key={t.measure} className="border-b last:border-0">
                  <td className="py-1.5 text-gray-700">{t.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-500">
                    {t.baseline ?? '—'}{t.unit}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-500">
                    {t.previous ?? '—'}{t.unit}
                  </td>
                  <td className="py-1.5 text-right tabular-nums font-medium text-gray-900">
                    {t.current ?? '—'}{t.unit}
                  </td>
                  <td className={`py-1.5 text-right text-xs capitalize ${
                    t.trend === 'improving' ? 'text-emerald-700'
                      : t.trend === 'worsening' ? 'text-red-700'
                        : 'text-gray-500'
                  }`}>
                    {t.trend.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.filter(t => t.note).map(t => (
            <p key={t.measure} className="text-xs text-amber-700 mt-1.5">{t.note}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Assessment form ─────────────────────────────────────────────────────────

const AssessmentForm: React.FC<{
  patient: Patient;
  side: Side;
  onCancel: () => void;
  onSaved: () => void;
}> = ({ patient, side, onCancel, onSaved }) => {
  const { user } = useAuth();
  const [presentation, setPresentation] = useState<PadPresentation>('uncertain');
  const [acute, setAcute] = useState<AcuteIschaemiaScreen>({});
  const [pressures, setPressures] = useState<PressureSet>({});
  const [tcpo2, setTcpo2] = useState('');
  const [woundPresent, setWoundPresent] = useState(false);
  const [woundArea, setWoundArea] = useState('');
  const [exposed, setExposed] = useState<string[]>([]);
  const [gangrene, setGangrene] = useState<VascularWoundSnapshot['gangrene']>('none');
  const [infection, setInfection] = useState<FootInfectionAssessment['severity']>(undefined);
  const [restPain, setRestPain] = useState(false);
  const [saving, setSaving] = useState(false);

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const summary = useMemo(
    () => summarisePerfusion(pressures, {
      calcificationRisk: (patient.chronicConditions ?? [])
        .some(c => /diabet|renal|kidney/i.test(String(c))),
      cltiSuspected: restPain || woundPresent,
    }),
    [pressures, patient, restPain, woundPresent],
  );

  const save = async () => {
    setSaving(true);
    const local: LocalPerfusionRecord[] = tcpo2.trim()
      ? [{ kind: 'tcpo2', value: Number(tcpo2), unit: 'mmHg', site: 'wound', measuredAt: new Date().toISOString() }]
      : [];

    await saveAssessment({
      createdBy: user?.id,
      assessment: {
        patientId: patient.id,
        hospitalId: patient.registeredHospitalId,
        side,
        assessedAt: new Date().toISOString(),
        assessedBy: user?.id,
        presentation: {
          clinician: presentation,
          clinicianId: user?.id,
          confirmedAt: new Date().toISOString(),
        },
        acuteScreen: Object.keys(acute).length ? { ...acute, screenedBy: user?.id, screenedAt: new Date().toISOString() } : undefined,
        restPain: restPain ? { present: true } : undefined,
        perfusion: { side, pressures, local },
        wound: {
          present: woundPresent,
          areaCm2: num(woundArea),
          exposedStructure: exposed as VascularWoundSnapshot['exposedStructure'],
          gangrene,
        },
        infection: infection ? { severity: infection } : undefined,
        status: 'awaiting_review',
      },
    });
    onSaved();
  };

  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* ── Acute screen, first and unconditional ──────────────────────────── */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-red-900 mb-1">Acute limb ischaemia screen</h3>
        <p className="text-xs text-red-800 mb-2">
          Complete this first. It takes seconds, and an acutely ischaemic limb is measured in hours.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SIX_PS.map(p => (
            <label key={p.key as string} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acute[p.key] === true}
                onChange={e => setAcute({ ...acute, [p.key]: e.target.checked })}
                className="mt-0.5 accent-red-600"
              />
              <span className="text-sm text-red-900">
                {p.label}
                <span className="block text-xs text-red-700">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Presentation ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Clinical presentation</span>
          <select
            value={presentation}
            onChange={e => setPresentation(e.target.value as PadPresentation)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {PAD_PRESENTATIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={restPain} onChange={e => setRestPain(e.target.checked)}
            className="accent-rose-600" />
          <span className="text-sm text-gray-700">Ischaemic rest pain present</span>
        </label>
      </div>

      {/* ── Pressures ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Pressures</h3>
        <p className="text-xs text-gray-500 mb-3">
          Both arms are needed: the index divides by the higher of the two, and using one arm can
          hide subclavian disease.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['rightBrachialMmHg', 'Right brachial'],
            ['leftBrachialMmHg', 'Left brachial'],
            ['ankleMmHg', `Ankle (${side})`],
            ['toeMmHg', `Toe (${side})`],
          ] as const).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">{label} (mmHg)</span>
              <input
                type="number"
                value={(pressures[key] as number | undefined) ?? ''}
                onChange={e => setPressures({ ...pressures, [key]: num(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>

        <label className="block mt-3 max-w-xs">
          <span className="text-xs font-medium text-gray-600 mb-1 block">TcPO2 at the wound (mmHg)</span>
          <input
            type="number" value={tcpo2} onChange={e => setTcpo2(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </label>

        {/* Live interpretation, so a noncompressible index is caught at the bedside. */}
        {(summary.abi.value !== null || summary.tbi.value !== null) && (
          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1">
            {summary.abi.value !== null && (
              <p className="text-sm text-gray-800">ABI: {summary.abi.interpretation}</p>
            )}
            {summary.tbi.value !== null && (
              <p className="text-sm text-gray-800">TBI: {summary.tbi.interpretation}</p>
            )}
            {summary.abi.limitations.map((l, i) => (
              <p key={i} className="text-xs text-amber-700">{l}</p>
            ))}
            {summary.prompts.map((p, i) => (
              <p key={i} className="text-xs text-sky-800">→ {p}</p>
            ))}
          </div>
        )}
        {summary.problems.map((p, i) => (
          <p key={i} className="text-xs text-red-700 mt-1">{p}</p>
        ))}
      </div>

      {/* ── Wound and infection ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Wound and infection</h3>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={woundPresent} onChange={e => setWoundPresent(e.target.checked)}
            className="accent-rose-600" />
          <span className="text-sm text-gray-700">Ulcer or tissue loss present</span>
        </label>

        {woundPresent && (
          <>
            <label className="block max-w-xs">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Wound area (cm²)</span>
              <input
                type="number" value={woundArea} onChange={e => setWoundArea(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <div>
              <span className="text-xs font-medium text-gray-600 mb-1 block">Exposed structures</span>
              <div className="flex flex-wrap gap-1.5">
                {['tendon', 'bone', 'joint', 'muscle'].map(s => (
                  <button
                    key={s}
                    onClick={() => setExposed(prev =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                    className={`px-2.5 py-1 rounded-lg border text-xs capitalize ${
                      exposed.includes(s)
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <label className="block max-w-xs">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Gangrene</span>
          <select
            value={gangrene} onChange={e => setGangrene(e.target.value as VascularWoundSnapshot['gangrene'])}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {['none', 'dry_toe', 'wet_toe', 'forefoot', 'heel', 'midfoot', 'extensive'].map(g => (
              <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>

        <label className="block max-w-xs">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Foot infection</span>
          <select
            value={infection ?? ''}
            onChange={e => setInfection((e.target.value || undefined) as FootInfectionAssessment['severity'])}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Not assessed</option>
            <option value="none">No infection</option>
            <option value="mild_local">Local, skin and subcutaneous only</option>
            <option value="moderate_deeper">Deeper structures or extensive erythema</option>
            <option value="severe_systemic">With systemic inflammatory response</option>
          </select>
          <span className="text-xs text-gray-500 mt-1 block">
            Assessed independently of ischaemia. Leaving this unassessed leaves WIfI incomplete
            rather than assuming there is no infection.
          </span>
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={save} disabled={saving}
          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save for review'}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Saving records this as awaiting review. WIfI is computed from the measurements above and
        stored with the reason for each grade.
      </p>
    </div>
  );
};

// ── Intervention ────────────────────────────────────────────────────────────

const INTERVENTIONS: { value: VascularInterventionKind; label: string }[] = [
  { value: 'angioplasty', label: 'Angioplasty' },
  { value: 'stent', label: 'Stent' },
  { value: 'bypass', label: 'Bypass' },
  { value: 'endarterectomy', label: 'Endarterectomy' },
  { value: 'thrombectomy', label: 'Thrombectomy' },
  { value: 'thrombolysis', label: 'Thrombolysis' },
  { value: 'debridement', label: 'Debridement' },
  { value: 'minor_amputation', label: 'Minor amputation' },
  { value: 'major_amputation', label: 'Major amputation' },
  { value: 'skin_graft', label: 'Skin graft' },
  { value: 'flap', label: 'Flap' },
  { value: 'other', label: 'Other' },
];

const InterventionModal: React.FC<{
  patientId: string; side: Side; userId?: string;
  onClose: () => void; onSaved: () => void;
}> = ({ patientId, side, userId, onClose, onSaved }) => {
  const [kind, setKind] = useState<VascularInterventionKind>('angioplasty');
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [indication, setIndication] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Record intervention</h3>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Intervention</span>
          <select value={kind} onChange={e => setKind(e.target.value as VascularInterventionKind)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {INTERVENTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Date</span>
          <input type="date" value={performedAt} onChange={e => setPerformedAt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Indication</span>
          <input value={indication} onChange={e => setIndication(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </label>
        <p className="text-xs text-gray-500">
          Interventions are marked on the perfusion chart, so a change in perfusion can be read
          against what was done between the two visits.
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={async () => {
              setSaving(true);
              await addIntervention({
                patientId, side, kind,
                performedAt: new Date(performedAt).toISOString(),
                indication: indication.trim() || undefined,
                operator: userId,
              });
              onSaved();
            }}
            disabled={saving}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            Record
          </button>
        </div>
      </div>
    </div>
  );
};
