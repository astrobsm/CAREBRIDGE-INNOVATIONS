/**
 * Tumour Board — multidisciplinary oncology assessment and planning.
 *
 * Covers soft tissue malignancy and all skin cancers (melanoma and non-melanoma),
 * carrying a case from staging through to a ratified multimodality plan,
 * subspecialty referrals, a surveillance schedule and patient counselling.
 *
 * The clinical logic is NOT here. Staging, plan generation, letters, surveillance
 * and counselling are pure functions in services/oncology/*, unit-tested without
 * a browser and running unchanged offline. This file is the workflow around them.
 *
 * Views:
 *   board  → worklist across all open cases; overdue and awaiting-histology first
 *   assess → staging form; APPENDS a new version, never overwrites
 *   case   → one case: staging timeline, plan, referrals, surveillance, counselling
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, FileText,
  FlaskConical, Loader2, Plus, RefreshCw, Search, Send, ShieldCheck, Stethoscope,
  Users, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient } from '../../../types';
import {
  getBoard, getCaseDetail, createCase, recordAssessment, stageFromAssessment,
  buildPlanForCase, savePlan, ratifyPlan, buildLetters, saveReferrals,
  buildSurveillance, saveSurveillance, buildCounselling, completeSurveillanceItem,
  markReferralSent,
} from '../services/tumourBoardService';
import type {
  BoardSummary, CaseDetail, TumourBoardAssessment, TumourBoardCaseRow,
} from '../tumourBoardTypes';
import { computeStage } from '../services/oncology/stagingEngine';
import type {
  StagingInput, TumorFamily, StagingBasis, SarcomaGrade, SarcomaSite,
} from '../services/oncology/stagingEngine';
import { SPECIALTY_LABELS } from '../services/oncology/managementPlan';
import {
  generateBoardSummaryPdf, generateAllReferralLettersPdf,
  generateSurveillancePdf, generateCounsellingPdf,
} from '../services/tumourBoardPdfService';

const TUMOR_FAMILIES: { value: TumorFamily; label: string; hint: string }[] = [
  { value: 'cutaneous_melanoma', label: 'Cutaneous melanoma', hint: 'Staged on Breslow thickness and ulceration' },
  { value: 'cutaneous_scc', label: 'Cutaneous squamous cell carcinoma', hint: 'AJCC staging validated for head & neck' },
  { value: 'cutaneous_bcc', label: 'Basal cell carcinoma', hint: 'Managed mainly by NCCN risk stratification' },
  { value: 'merkel_cell', label: 'Merkel cell carcinoma', hint: 'Sentinel node biopsy in all node-negative cases' },
  { value: 'soft_tissue_sarcoma', label: 'Soft tissue sarcoma', hint: 'Refer to a sarcoma centre before biopsy' },
];

const BASIS_OPTIONS: { value: StagingBasis; label: string }[] = [
  { value: 'clinical', label: 'Clinical (before surgery/histology)' },
  { value: 'pathological', label: 'Pathological (histology available)' },
  { value: 'post_neoadjuvant', label: 'Post-neoadjuvant (yp)' },
  { value: 'restaging', label: 'Restaging (recurrence/progression)' },
];

const MET_SITES = ['skin_soft_tissue_nodal', 'lung', 'visceral_non_cns', 'cns', 'bone'] as const;

/**
 * Only consultant-level clinicians may ratify a plan. The generator produces a
 * draft; ratification is the human step that makes it actionable.
 */
const RATIFYING_ROLES = new Set([
  'consultant', 'surgeon', 'plastic_surgeon', 'super_admin', 'hospital_admin',
]);

type View = 'board' | 'case' | 'assess';

const stageTone = (group?: string): string => {
  if (!group) return 'bg-gray-100 text-gray-700';
  if (group === '0' || group.startsWith('IA') || group === 'I') return 'bg-green-100 text-green-800';
  if (group.startsWith('IV')) return 'bg-red-100 text-red-800';
  if (group.startsWith('III')) return 'bg-orange-100 text-orange-800';
  if (group.startsWith('II')) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
};

const patientLabel = (p?: { firstName?: string; lastName?: string } | null): string =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Patient';

// ════════════════════════════════════════════════════════════════════════════

const TumourBoardPage: React.FC = () => {
  const [view, setView] = useState<View>('board');
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<TumourBoardCaseRow[]>([]);
  const [summary, setSummary] = useState<BoardSummary>({ total: 0, awaitingHistology: 0, overdueSurveillance: 0 });
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBoard();
      setCases(res.cases);
      setSummary(res.summary);
    } catch {
      toast.error('Could not load the tumour board worklist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const openCase = useCallback(async (caseId: string) => {
    setBusy(true);
    try {
      const d = await getCaseDetail(caseId);
      if (!d) { toast.error('Case not found'); return; }
      setDetail(d);
      setView('case');
    } finally {
      setBusy(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(c =>
      `${c.firstName || ''} ${c.lastName || ''} ${c.diagnosis || ''} ${c.patientHospitalNumber || ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [cases, search]);

  return (
    <div className="min-h-screen bg-gray-50 -m-4 sm:-m-6 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tumour Board</h1>
              <p className="text-sm text-gray-500">
                Soft tissue malignancy and skin cancer — staging, multimodality planning and surveillance
              </p>
            </div>
          </div>
        </header>

        {view === 'board' && (
          <BoardView
            cases={filtered}
            summary={summary}
            loading={loading}
            search={search}
            onSearch={setSearch}
            onRefresh={loadBoard}
            onNew={() => { setDetail(null); setView('assess'); }}
            onOpen={openCase}
          />
        )}

        {view === 'assess' && (
          <AssessmentForm
            existingDetail={detail}
            onCancel={() => setView(detail ? 'case' : 'board')}
            onSaved={async caseId => { await loadBoard(); await openCase(caseId); }}
          />
        )}

        {view === 'case' && detail && (
          <CaseDetailView
            detail={detail}
            busy={busy}
            setBusy={setBusy}
            onBack={() => { setDetail(null); setView('board'); loadBoard(); }}
            onReassess={() => setView('assess')}
            onRefresh={async () => { const d = await getCaseDetail(detail.case.id); if (d) setDetail(d); }}
          />
        )}
      </div>
    </div>
  );
};

// ── Board worklist ─────────────────────────────────────────────────────────

const BoardView: React.FC<{
  cases: TumourBoardCaseRow[];
  summary: BoardSummary;
  loading: boolean;
  search: string;
  onSearch: (v: string) => void;
  onRefresh: () => void;
  onNew: () => void;
  onOpen: (caseId: string) => void;
}> = ({ cases, summary, loading, search, onSearch, onRefresh, onNew, onOpen }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> New case
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard icon={<ClipboardList className="w-5 h-5" />} label="Open cases" value={summary.total} tone="bg-blue-50 text-blue-700" />
      <StatCard icon={<FlaskConical className="w-5 h-5" />} label="Awaiting histology" value={summary.awaitingHistology} tone="bg-amber-50 text-amber-700" />
      <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Overdue surveillance" value={summary.overdueSurveillance} tone="bg-red-50 text-red-700" />
    </div>

    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search by patient, hospital number or diagnosis…"
        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </div>

    {loading ? (
      <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}</div>
    ) : !cases.length ? (
      <div className="bg-white rounded-xl border p-10 text-center text-gray-500">
        <Stethoscope className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        No open tumour board cases. Create one to stage a patient and generate a plan.
      </div>
    ) : (
      <ul className="space-y-2">
        {cases.map(c => (
          <li key={c.id}>
            <button
              onClick={() => onOpen(c.id)}
              className="w-full text-left bg-white border rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {patientLabel(c)}
                    {c.patientHospitalNumber && <span className="ml-2 text-xs font-normal text-gray-500">{c.patientHospitalNumber}</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    {c.diagnosis || TUMOR_FAMILIES.find(f => f.value === c.tumorFamily)?.label}
                  </div>
                  {c.primarySite && <div className="text-xs text-gray-500 mt-0.5">{c.primarySite}</div>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {c.currentStageGroup && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stageTone(c.currentStageGroup)}`}>
                      Stage {c.currentStageGroup}
                    </span>
                  )}
                  {!c.histologyAvailable && (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">Histology pending</span>
                  )}
                  {!!c.overdueSurveillanceCount && (
                    <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                      {c.overdueSurveillanceCount} overdue
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{c.assessmentCount || 0} assessment(s)</span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; tone: string }> = ({ icon, label, value, tone }) => (
  <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>{icon}</div>
    <div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  </div>
);

// ── Assessment form ────────────────────────────────────────────────────────

const AssessmentForm: React.FC<{
  existingDetail: CaseDetail | null;
  onCancel: () => void;
  onSaved: (caseId: string) => void;
}> = ({ existingDetail, onCancel, onSaved }) => {
  const { user } = useAuth();
  const existingCase = existingDetail?.case;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [family, setFamily] = useState<TumorFamily>(existingCase?.tumorFamily || 'cutaneous_melanoma');
  const [diagnosis, setDiagnosis] = useState(existingCase?.diagnosis || '');
  const [primarySite, setPrimarySite] = useState(existingCase?.primarySite || '');
  const [basis, setBasis] = useState<StagingBasis>('clinical');
  const [saving, setSaving] = useState(false);

  // Staging inputs
  const [breslowMm, setBreslowMm] = useState('');
  const [sizeCm, setSizeCm] = useState('');
  const [ulceration, setUlceration] = useState(false);
  const [inSitu, setInSitu] = useState(false);
  const [deepInvasion, setDeepInvasion] = useState(false);
  const [perineural, setPerineural] = useState(false);
  const [nodesInvolved, setNodesInvolved] = useState('0');
  const [nodesDetected, setNodesDetected] = useState(false);
  const [inTransit, setInTransit] = useState(false);
  const [extranodal, setExtranodal] = useState(false);
  const [largestNodeCm, setLargestNodeCm] = useState('');
  const [distantMets, setDistantMets] = useState(false);
  const [metSites, setMetSites] = useState<string[]>([]);
  const [ldhElevated, setLdhElevated] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [grade, setGrade] = useState<SarcomaGrade>('GX');
  const [sarcomaSite, setSarcomaSite] = useState<SarcomaSite>(existingCase?.sarcomaSite || 'trunk_extremity');
  const [histologyAvailable, setHistologyAvailable] = useState(existingCase?.histologyAvailable ?? false);
  const [histologicType, setHistologicType] = useState(existingCase?.histologicType || '');
  const [localSpread, setLocalSpread] = useState('');
  const [regionalSpread, setRegionalSpread] = useState('');
  const [metastaticSpread, setMetastaticSpread] = useState('');
  const [margins, setMargins] = useState('');
  const [notes, setNotes] = useState('');

  const isMelanoma = family === 'cutaneous_melanoma';
  const isSarcoma = family === 'soft_tissue_sarcoma';
  const isKeratinocyte = family === 'cutaneous_scc' || family === 'cutaneous_bcc';

  const stagingInput: StagingInput = useMemo(() => ({
    family,
    basis,
    breslowMm: breslowMm ? parseFloat(breslowMm) : null,
    sizeCm: sizeCm ? parseFloat(sizeCm) : null,
    ulceration,
    inSitu,
    deepInvasion,
    perineuralInvasion: perineural,
    nodesInvolved: parseInt(nodesInvolved, 10) || 0,
    nodesClinicallyDetected: nodesDetected,
    inTransitOrSatellite: inTransit,
    extranodalExtension: extranodal,
    largestNodeCm: largestNodeCm ? parseFloat(largestNodeCm) : null,
    distantMets,
    metSites: metSites as StagingInput['metSites'],
    ldhElevated: ldhElevated === 'unknown' ? null : ldhElevated === 'yes',
    grade,
    sarcomaSite,
    histologyAvailable,
  }), [family, basis, breslowMm, sizeCm, ulceration, inSitu, deepInvasion, perineural, nodesInvolved,
       nodesDetected, inTransit, extranodal, largestNodeCm, distantMets, metSites, ldhElevated,
       grade, sarcomaSite, histologyAvailable]);

  // Live preview so the clinician sees the stage change as they type — the
  // staging engine is pure, so this costs nothing.
  const preview = useMemo(() => computeStage(stagingInput), [stagingInput]);

  const submit = async () => {
    if (!existingCase && !patient) { toast.error('Select a patient first'); return; }
    setSaving(true);
    try {
      const caseRecord = existingCase || await createCase({
        patientId: patient!.id,
        hospitalId: user?.hospitalId,
        hospitalNumber: patient!.hospitalNumber,
        tumorFamily: family,
        diagnosis: diagnosis || TUMOR_FAMILIES.find(f => f.value === family)?.label,
        primarySite,
        sarcomaSite: isSarcoma ? sarcomaSite : undefined,
        histologyAvailable,
        histologicType: histologicType || null,
        createdBy: user?.id,
      });

      await recordAssessment(caseRecord, stagingInput, {
        assessedBy: user?.id,
        localSpread,
        regionalSpread,
        metastaticSpread,
        histologicType: histologicType || null,
        histologicGrade: isSarcoma ? grade : null,
        margins,
        perineuralInvasion: perineural,
        notes,
      });

      toast.success('Assessment recorded');
      onSaved(caseRecord.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <button onClick={onCancel} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {existingCase ? 'New staging assessment' : 'New tumour board case'}
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        {existingCase
          ? 'This is appended as a new version. Previous assessments are preserved.'
          : 'Record the initial assessment. Histology can be added later as a further version.'}
      </p>

      <div className="space-y-4">
        {!existingCase && (
          <Section title="Case">
            <Field label="Patient">
              <button
                onClick={() => setShowPicker(true)}
                className="w-full text-left px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span className={patient ? 'text-gray-900' : 'text-gray-400'}>
                  {patient ? `${patientLabel(patient)} · ${patient.hospitalNumber}` : 'Select a patient…'}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>
            </Field>
            <Field label="Tumour type">
              <select value={family} onChange={e => setFamily(e.target.value as TumorFamily)} className="w-full px-3 py-2 border rounded-lg text-sm">
                {TUMOR_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">{TUMOR_FAMILIES.find(f => f.value === family)?.hint}</p>
            </Field>
            <Field label="Diagnosis">
              <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </Field>
            <Field label="Primary site">
              <input value={primarySite} onChange={e => setPrimarySite(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. left calf, right pinna" />
            </Field>
          </Section>
        )}

        <Section title="Staging basis">
          <Field label="Basis">
            <select value={basis} onChange={e => setBasis(e.target.value as StagingBasis)} className="w-full px-3 py-2 border rounded-lg text-sm">
              {BASIS_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </Field>
          <Check label="Histology available" checked={histologyAvailable} onChange={setHistologyAvailable} />
          {histologyAvailable && (
            <Field label="Histologic type">
              <input value={histologicType} onChange={e => setHistologicType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. superficial spreading melanoma; myxoid liposarcoma" />
            </Field>
          )}
        </Section>

        <Section title="Primary tumour">
          {isMelanoma ? (
            <>
              <Field label="Breslow thickness (mm)">
                <input type="number" step="0.01" value={breslowMm} onChange={e => setBreslowMm(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </Field>
              <Check label="Ulceration present" checked={ulceration} onChange={setUlceration} />
              <Check label="In situ (no invasion)" checked={inSitu} onChange={setInSitu} />
            </>
          ) : (
            <Field label="Greatest dimension (cm)">
              <input type="number" step="0.1" value={sizeCm} onChange={e => setSizeCm(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </Field>
          )}
          {isKeratinocyte && (
            <>
              <Check label="Deep invasion (>6 mm or beyond subcutaneous fat)" checked={deepInvasion} onChange={setDeepInvasion} />
              <Check label="Perineural invasion" checked={perineural} onChange={setPerineural} />
            </>
          )}
          {isSarcoma && (
            <>
              <Field label="Anatomical site">
                <select value={sarcomaSite} onChange={e => setSarcomaSite(e.target.value as SarcomaSite)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="trunk_extremity">Trunk / extremity</option>
                  <option value="retroperitoneal">Retroperitoneal</option>
                  <option value="head_neck">Head &amp; neck</option>
                  <option value="viscera">Visceral</option>
                </select>
              </Field>
              <Field label="FNCLCC grade">
                <select value={grade} onChange={e => setGrade(e.target.value as SarcomaGrade)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="GX">GX — not assessed</option>
                  <option value="G1">G1 — low grade</option>
                  <option value="G2">G2 — intermediate</option>
                  <option value="G3">G3 — high grade</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Local spread (free text)">
            <textarea value={localSpread} onChange={e => setLocalSpread(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Depth, structures involved, fixity" />
          </Field>
        </Section>

        <Section title="Regional spread">
          <Field label="Number of involved nodes">
            <input type="number" min="0" value={nodesInvolved} onChange={e => setNodesInvolved(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </Field>
          <Check label="Nodes clinically or radiologically detected (macroscopic)" checked={nodesDetected} onChange={setNodesDetected} />
          {(isMelanoma || family === 'merkel_cell') && (
            <Check label="In-transit, satellite or microsatellite disease" checked={inTransit} onChange={setInTransit} />
          )}
          {isKeratinocyte && (
            <>
              <Check label="Extranodal extension" checked={extranodal} onChange={setExtranodal} />
              <Field label="Largest node (cm)">
                <input type="number" step="0.1" value={largestNodeCm} onChange={e => setLargestNodeCm(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </Field>
            </>
          )}
          <Field label="Regional spread (free text)">
            <textarea value={regionalSpread} onChange={e => setRegionalSpread(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
          </Field>
        </Section>

        <Section title="Metastatic spread">
          <Check label="Distant metastases present" checked={distantMets} onChange={setDistantMets} />
          {distantMets && (
            <>
              <div className="flex flex-wrap gap-2 mt-2">
                {MET_SITES.map(site => (
                  <label key={site} className="flex items-center gap-1.5 text-sm border rounded px-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metSites.includes(site)}
                      onChange={e => setMetSites(prev => e.target.checked ? [...prev, site] : prev.filter(s => s !== site))}
                    />
                    {site.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
              {isMelanoma && (
                <Field label="Serum LDH">
                  <select value={ldhElevated} onChange={e => setLdhElevated(e.target.value as 'unknown' | 'yes' | 'no')} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="unknown">Not recorded</option>
                    <option value="no">Not elevated</option>
                    <option value="yes">Elevated</option>
                  </select>
                </Field>
              )}
            </>
          )}
          <Field label="Metastatic spread (free text)">
            <textarea value={metastaticSpread} onChange={e => setMetastaticSpread(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
          </Field>
        </Section>

        <Section title="Pathology & notes">
          <Field label="Margins">
            <input value={margins} onChange={e => setMargins(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. clear, 8 mm closest deep margin" />
          </Field>
          <Field label="Notes">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
          </Field>
        </Section>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-indigo-700 font-semibold mb-1">Computed stage</div>
          <div className="text-lg font-bold text-gray-900 font-mono">{preview.formatted}</div>
          <div className="text-sm text-gray-600 mt-1">{preview.stageDescription}</div>
          <div className="text-xs text-gray-500 mt-1">{preview.stagingSystem}</div>
          {preview.caveats.length > 0 && (
            <ul className="mt-3 space-y-1">
              {preview.caveats.map((c, i) => (
                <li key={i} className="text-xs text-amber-800 flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 pb-8">
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save assessment
          </button>
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
        </div>
      </div>

      {showPicker && (
        <PatientPickerModal
          onClose={() => setShowPicker(false)}
          onPick={p => { setPatient(p); setShowPicker(false); }}
        />
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white border rounded-xl p-4">
    <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded" />
    {label}
  </label>
);

// ── Case detail ────────────────────────────────────────────────────────────

const CaseDetailView: React.FC<{
  detail: CaseDetail;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onBack: () => void;
  onReassess: () => void;
  onRefresh: () => Promise<void>;
}> = ({ detail, busy, setBusy, onBack, onReassess, onRefresh }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'timeline' | 'plan' | 'referrals' | 'surveillance' | 'counselling'>('timeline');

  const c = detail.case;
  const latest: TumourBoardAssessment | undefined = detail.assessments[0];
  const name = patientLabel(c);
  const canRatify = !!user && RATIFYING_ROLES.has(user.role);

  // The most recent saved plan is the one the board acts on.
  const savedPlan = detail.plans[0];
  const isRatified = !!savedPlan?.ratified;

  const stage = useMemo(() => (latest ? stageFromAssessment(latest) : null), [latest]);
  const plan = useMemo(
    () => (stage ? buildPlanForCase(c, stage, latest?.inputs) : null),
    [c, stage, latest],
  );
  const letters = useMemo(() => {
    if (!stage || !plan) return [];
    return buildLetters({
      patient: { name, hospitalNumber: c.patientHospitalNumber },
      stage,
      plan,
      diagnosis: c.diagnosis || '',
      histologicType: c.histologicType,
      primarySite: c.primarySite,
      boardDate: c.lastBoardDate,
      comorbidities: c.comorbidities,
      performanceStatus: c.performanceStatus,
    });
  }, [stage, plan, c, name]);
  const surveillance = useMemo(
    () => (stage ? buildSurveillance(c, stage, { grade: (latest?.histologicGrade as string) || undefined }) : null),
    [c, stage, latest],
  );
  const counselling = useMemo(
    () => (stage && plan ? buildCounselling(c, stage, plan, name) : null),
    [c, stage, plan, name],
  );

  const pdfMeta = {
    title: '',
    patientName: name,
    hospitalNumber: c.patientHospitalNumber,
    diagnosis: c.diagnosis,
    boardDate: c.lastBoardDate,
    ratified: isRatified,
  };

  const persistPlan = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const saved = await savePlan(c, plan, {
        assessmentId: latest?.id,
        boardDate: new Date().toISOString().slice(0, 10),
        createdBy: user?.id,
      });
      if (letters.length) await saveReferrals(c, letters, saved.id);
      if (surveillance) await saveSurveillance(c, surveillance);
      toast.success('Plan, referrals and surveillance saved as a draft for the board');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the plan');
    } finally {
      setBusy(false);
    }
  };

  const ratify = async () => {
    if (!savedPlan) return;
    setBusy(true);
    try {
      await ratifyPlan(savedPlan.id, user?.id);
      toast.success('Plan ratified by the board');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not ratify the plan');
    } finally {
      setBusy(false);
    }
  };

  const TABS = [
    { id: 'timeline', label: 'Staging timeline', icon: Activity },
    { id: 'plan', label: 'Management plan', icon: ClipboardList },
    { id: 'referrals', label: 'Referrals', icon: Send },
    { id: 'surveillance', label: 'Surveillance', icon: RefreshCw },
    { id: 'counselling', label: 'Counselling', icon: Users },
  ] as const;

  return (
    <div className="max-w-6xl">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to board
      </button>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{name}</h2>
            <p className="text-sm text-gray-600">{c.diagnosis}{c.primarySite ? ` — ${c.primarySite}` : ''}</p>
            {stage && <p className="text-sm font-mono mt-1 text-gray-800">{stage.formatted}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onReassess} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Add assessment
            </button>
            <button
              onClick={persistPlan}
              disabled={busy || !plan}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save plan
            </button>
          </div>
        </div>

        {savedPlan && (
          <div className={`mt-3 rounded-lg p-3 text-sm flex flex-wrap items-center gap-2 border ${
            isRatified ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            {isRatified
              ? `Plan ratified${savedPlan.ratifiedAt ? ` on ${savedPlan.ratifiedAt.slice(0, 10)}` : ''}.`
              : 'This plan is a decision-support draft awaiting board ratification.'}
            {!isRatified && (
              canRatify ? (
                <button onClick={ratify} disabled={busy} className="ml-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                  Ratify plan
                </button>
              ) : (
                <span className="ml-auto text-xs opacity-75">A consultant must ratify this plan.</span>
              )
            )}
          </div>
        )}

        {!c.histologyAvailable && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
            <FlaskConical className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Histology pending — this plan is provisional. Add a pathological assessment when the report arrives.
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
              tab === t.id ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'timeline' && (
        <div className="space-y-3">
          {stage && plan && (
            <ExportButton
              label="Export board summary (PDF)"
              onClick={() => generateBoardSummaryPdf({
                case: c,
                assessments: detail.assessments,
                stage,
                plan,
                patientName: name,
                hospitalNumber: c.patientHospitalNumber,
                boardDate: c.lastBoardDate,
                ratified: isRatified,
              })}
            />
          )}
          {!detail.assessments.length && <Empty text="No assessments recorded yet." />}
          {detail.assessments.map(a => (
            <div key={a.id} className="bg-white border rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">Version {a.version} — {a.basis} staging</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stageTone(a.stageGroup)}`}>Stage {a.stageGroup}</span>
              </div>
              <div className="text-sm font-mono text-gray-700 mt-1">{a.stageFormatted}</div>
              <div className="text-xs text-gray-500 mt-1">
                {a.stagingSystem}{a.assessedAt ? ` · ${a.assessedAt.slice(0, 10)}` : ''}
              </div>
              {a.histologicType && <Detail label="Histology" value={a.histologicType} />}
              {a.histologicGrade && <Detail label="Grade" value={String(a.histologicGrade)} />}
              {a.localSpread && <Detail label="Local spread" value={a.localSpread} />}
              {a.regionalSpread && <Detail label="Regional spread" value={a.regionalSpread} />}
              {a.metastaticSpread && <Detail label="Metastatic spread" value={a.metastaticSpread} />}
              {a.margins && <Detail label="Margins" value={a.margins} />}
              {a.notes && <Detail label="Notes" value={a.notes} />}
              {!!a.caveats?.length && (
                <ul className="mt-2 space-y-1">
                  {a.caveats.map((cv, i) => (
                    <li key={i} className="text-xs text-amber-800 flex gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{cv}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'plan' && (plan ? (
        <div className="space-y-3">
          <div className="bg-white border rounded-xl p-4 text-sm text-gray-600">{plan.summary}</div>
          {plan.items.map((item, i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-gray-900">{item.title}</div>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${
                  item.strength === 'required' ? 'bg-red-100 text-red-800'
                  : item.strength === 'recommend' ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700'
                }`}>{item.strength}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{item.detail}</p>
              <div className="text-xs text-gray-500 mt-2">{SPECIALTY_LABELS[item.owner]} · {item.basis}</div>
            </div>
          ))}
          {plan.caveats.map((cv, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{cv}
            </div>
          ))}
        </div>
      ) : <Empty text="Record an assessment to generate a management plan." />)}

      {tab === 'referrals' && (letters.length ? (
        <div className="space-y-3">
          <ExportButton label="Export all letters (PDF)" onClick={() => generateAllReferralLettersPdf(letters, pdfMeta)} />
          {letters.map((l, i) => {
            const saved = detail.referrals.find(r => r.specialty === l.specialty);
            return (
              <details key={i} className="bg-white border rounded-xl p-4">
                <summary className="cursor-pointer font-semibold text-gray-900 flex items-center justify-between gap-2">
                  <span>{l.specialtyLabel}</span>
                  <span className="flex items-center gap-2">
                    {saved?.status === 'sent' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">Sent</span>
                    )}
                    {l.urgency !== 'routine' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                        {l.urgency === 'two_week' ? 'Cancer pathway' : 'Urgent'}
                      </span>
                    )}
                  </span>
                </summary>
                <pre className="mt-3 text-xs whitespace-pre-wrap font-sans text-gray-700 border-t pt-3">{l.body}</pre>
                {saved && saved.status !== 'sent' && (
                  <button
                    onClick={async () => { await markReferralSent(saved.id); toast.success('Referral marked as sent'); await onRefresh(); }}
                    className="mt-3 px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Mark as sent
                  </button>
                )}
              </details>
            );
          })}
        </div>
      ) : <Empty text="Record an assessment to generate referral letters." />)}

      {tab === 'surveillance' && (surveillance ? (
        <div className="space-y-3">
          <ExportButton label="Export schedule (PDF)" onClick={() => generateSurveillancePdf(surveillance, pdfMeta)} />
          <div className="bg-white border rounded-xl p-4 text-sm text-gray-700">{surveillance.narrative}</div>
          {detail.surveillance.length ? (
            <div className="bg-white border rounded-xl divide-y">
              {detail.surveillance.map(s => {
                const overdue = s.status === 'scheduled' && s.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <div key={s.id} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.detail}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs whitespace-nowrap ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                        {s.dueDate}{overdue ? ' · overdue' : ''}
                      </div>
                      {s.status === 'completed' ? (
                        <span className="text-xs text-green-700">Completed</span>
                      ) : (
                        <button
                          onClick={async () => { await completeSurveillanceItem(s.id); toast.success('Marked complete'); await onRefresh(); }}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Mark done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border rounded-xl divide-y">
              {surveillance.items.slice(0, 60).map((s, i) => (
                <div key={i} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.detail}</div>
                  </div>
                  <div className="text-xs text-gray-600 whitespace-nowrap shrink-0">{s.dueDate}</div>
                </div>
              ))}
              <div className="p-3 text-xs text-gray-500">
                Preview only — save the plan to schedule and track these items.
              </div>
            </div>
          )}
        </div>
      ) : <Empty text="Record an assessment to generate a surveillance schedule." />)}

      {tab === 'counselling' && (counselling ? (
        <div className="space-y-3">
          <ExportButton label="Export patient information (PDF)" onClick={() => generateCounsellingPdf(counselling, pdfMeta)} />
          {counselling.sections.map((s, i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{s.heading}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{s.body}</p>
            </div>
          ))}
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Questions you may want to ask us</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {counselling.questionsToAsk.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-semibold text-red-900 mb-2">When to contact us urgently</h3>
            <ul className="list-disc pl-5 text-sm text-red-900 space-y-1">
              {counselling.redFlags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <p className="text-xs text-gray-500 pb-8">{counselling.disclaimer}</p>
        </div>
      ) : <Empty text="Record an assessment to generate patient information." />)}
    </div>
  );
};

// ── Shared bits ────────────────────────────────────────────────────────────

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-sm text-gray-700 mt-1"><span className="text-gray-500">{label}:</span> {value}</div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-white border rounded-xl p-10 text-center text-gray-500 text-sm">{text}</div>
);

const ExportButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button onClick={onClick} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 bg-white">
    <FileText className="w-4 h-4" /> {label}
  </button>
);

const PatientPickerModal: React.FC<{ onClose: () => void; onPick: (p: Patient) => void }> = ({ onClose, onPick }) => {
  const [q, setQ] = useState('');
  const all = useLiveQuery(() => db.patients.toArray(), []);
  const loading = all === undefined;

  const filtered = useMemo(() => {
    const list = (all || []).filter(p => p.isActive !== false);
    const term = q.trim().toLowerCase();
    if (!term) return list.slice(0, 30);
    return list
      .filter(p => [p.firstName, p.lastName, p.hospitalNumber].filter(Boolean).join(' ').toLowerCase().includes(term))
      .slice(0, 30);
  }, [q, all]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4 sm:my-8 max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Select patient</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search name or hospital number…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {loading ? (
            <div className="h-40 bg-gray-50 rounded animate-pulse" />
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y">
              {filtered.map(p => (
                <li key={p.id}>
                  <button onClick={() => onPick(p)} className="w-full text-left px-2 py-2.5 hover:bg-gray-50 rounded flex items-center justify-between">
                    <span className="text-sm text-gray-800">{patientLabel(p)}</span>
                    <span className="text-xs text-gray-400">{p.hospitalNumber}</span>
                  </button>
                </li>
              ))}
              {!filtered.length && <li className="py-6 text-center text-sm text-gray-400">No patients found.</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TumourBoardPage;
