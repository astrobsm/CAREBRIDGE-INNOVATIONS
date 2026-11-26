/**
 * The action bar every calculator shows under its result: Export PDF, Share
 * (WhatsApp / the phone's share sheet) and, where the calculator produces a
 * management plan, "AI plan".
 *
 * The AI card sits alongside the deterministic plan, never in place of it,
 * and repeats the engine's hard limits at its top whatever the model said.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2, Share2, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { sharePDFOnWhatsApp } from '../../../../utils/whatsappShareUtils';
import {
  aiUnavailableReason, requestAiPlan, type AiPlan, type AiPlanResult,
} from '../../ai/calculatorAiPlan';
import { buildCalculatorPdf, calculatorPdfFileName } from '../pdf';
import type { CalculatorReport } from '../types';
import { HardLimitsBox } from './DeterministicPlanView';

// Shared across every calculator on the page: once the server has said it
// has no key, no other button should invite another attempt.
let serverNotConfigured = false;
const listeners = new Set<() => void>();
function markNotConfigured() {
  serverNotConfigured = true;
  listeners.forEach(l => l());
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function useClinicianName(): string {
  let name = '';
  try {
    const { user } = useAuth();
    if (user) name = [user.firstName, user.lastName].filter(Boolean).join(' ') + (user.role ? ` (${String(user.role).replace(/_/g, ' ')})` : '');
  } catch {
    /* rendered outside the auth provider (tests, previews) */
  }
  return name;
}

type AiState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; plan: AiPlan; missingHardLimits: string[]; forKey: string }
  | { kind: 'error'; message: string };

export default function CalculatorReportActions({
  report, className = '',
}: { report: CalculatorReport | null; className?: string }) {
  const online = useOnline();
  const clinician = useClinicianName();
  const [, force] = useState(0);
  const [ai, setAi] = useState<AiState>({ kind: 'idle' });
  const [busy, setBusy] = useState<'pdf' | 'share' | null>(null);

  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const key = useMemo(() => (report ? JSON.stringify(report) : ''), [report]);
  const aiStale = ai.kind === 'ok' && ai.forKey !== key;
  const freshAi = ai.kind === 'ok' && !aiStale ? ai : null;

  if (!report) return null;

  const hasPlan = !!report.plan;
  const unavailable = aiUnavailableReason(online, serverNotConfigured);

  const makePdf = () => buildCalculatorPdf(report, {
    aiPlan: freshAi?.plan ?? null,
    aiMissingHardLimits: freshAi?.missingHardLimits,
    clinician,
  });

  const exportPdf = () => {
    setBusy('pdf');
    try {
      makePdf().save(calculatorPdfFileName(report));
    } catch (e) {
      toast.error(`Could not build the PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    try {
      const doc = makePdf();
      await sharePDFOnWhatsApp(doc.output('blob'), calculatorPdfFileName(report));
    } finally {
      setBusy(null);
    }
  };

  const runAi = async () => {
    if (unavailable) return;
    setAi({ kind: 'loading' });
    const forKey = key;
    const r: AiPlanResult = await requestAiPlan(report);
    if (r.status === 'ok') setAi({ kind: 'ok', plan: r.plan, missingHardLimits: r.missingHardLimits, forKey });
    else {
      if (r.notConfigured) markNotConfigured();
      setAi({ kind: 'error', message: r.message });
    }
  };

  return (
    <div className={`space-y-3 pt-3 border-t print:hidden ${className}`} data-testid="calculator-actions">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportPdf} disabled={busy !== null}
          className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
          {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export PDF
        </button>
        <button type="button" onClick={share} disabled={busy !== null}
          className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          {busy === 'share' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share
        </button>
        {hasPlan && (
          <button type="button" onClick={runAi} disabled={!!unavailable || ai.kind === 'loading'}
            title={unavailable ?? 'Ask Claude for a patient-specific plan within the hard limits'}
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {ai.kind === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {ai.kind === 'ok' ? 'Regenerate AI plan' : 'AI plan'}
          </button>
        )}
      </div>

      {hasPlan && unavailable && (
        <p className="text-xs text-gray-600" data-testid="ai-unavailable">AI plan not available: {unavailable}</p>
      )}

      {ai.kind === 'loading' && (
        <p className="text-sm text-violet-800 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Asking Claude for a plan…</p>
      )}

      {ai.kind === 'error' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 break-words">{ai.message}</div>
          <button type="button" onClick={() => setAi({ kind: 'idle' })} aria-label="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      )}

      {ai.kind === 'ok' && (
        <AiPlanCard plan={ai.plan} hardLimits={report.plan?.hardLimits ?? []} missing={ai.missingHardLimits} stale={aiStale} />
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-semibold text-sm text-gray-900 mb-1">{title}</p>
      <ul className="list-disc pl-5 text-sm text-gray-800 space-y-0.5 break-words">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

export function AiPlanCard({ plan, hardLimits, missing, stale }: { plan: AiPlan; hardLimits: string[]; missing: string[]; stale?: boolean }) {
  return (
    <div className="rounded-xl border-2 border-violet-300 bg-violet-50/40 p-3 sm:p-4 space-y-3" data-testid="ai-plan-card">
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-violet-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-violet-900">AI-drafted plan — check before use</p>
          <p className="text-xs text-violet-800">Drafted by Claude from the de-identified calculator output. It sits beside the deterministic plan, which takes precedence.</p>
        </div>
      </div>

      {stale && (
        <p className="text-sm font-medium text-amber-800 bg-amber-100 rounded p-2">The inputs have changed since this draft was made. Regenerate before relying on it; it is left out of the PDF until then.</p>
      )}

      <HardLimitsBox limits={hardLimits} title="Engine hard limits — these apply whatever the draft says" />
      {missing.length > 0 && (
        <p className="text-xs font-medium text-red-800">The draft did not restate {missing.length} of these limit{missing.length === 1 ? '' : 's'} verbatim. Treat any dose or rate in it with extra care.</p>
      )}

      <div>
        <p className="font-semibold text-sm text-gray-900 mb-1">Assessment</p>
        <p className="text-sm text-gray-800 break-words">{plan.assessmentSummary}</p>
      </div>
      <List title="Immediate actions" items={plan.immediateActions.map(a => a.timing ? `${a.action} (${a.timing})` : a.action)} />
      {plan.fluidsAndDrugs.length > 0 && (
        <div>
          <p className="font-semibold text-sm text-gray-900 mb-1">Fluids and drugs</p>
          <ul className="space-y-1.5 text-sm text-gray-800">
            {plan.fluidsAndDrugs.map((d, i) => (
              <li key={i} className="rounded border border-violet-200 bg-white p-2 break-words">
                <p className="font-medium">{d.item}</p>
                <p>{[d.dose, d.route, d.rateOrFrequency, d.duration].filter(Boolean).join(' · ')}</p>
                {d.notes && <p className="text-xs text-gray-600 mt-0.5">{d.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <List title="Monitoring" items={plan.monitoring.map(m => `${m.what}: ${m.frequency}${m.target ? ` (target ${m.target})` : ''}`)} />
      <List title="Escalate if" items={plan.escalationCriteria} />
      <List title="Patient and family counselling" items={plan.counsellingPoints} />
      <List title="Follow-up" items={plan.followUp} />
      <List title="Not known / to obtain" items={plan.unknowns} />
    </div>
  );
}
