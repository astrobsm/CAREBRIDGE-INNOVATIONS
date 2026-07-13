import { useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Sparkles,
  X,
  Loader2,
  Copy,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import {
  AI_DRAFT_MODES,
  generateAIDraft,
  getAIAvailability,
  type AIDraftMode,
  type AIDraftResult,
} from '../services/aiClinicalAssistantService';

interface Props {
  patientId: string;
  patientName?: string;
  onClose: () => void;
}

export default function AIClinicalAssistant({ patientId, patientName, onClose }: Props) {
  const [mode, setMode] = useState<AIDraftMode>('summary');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDraftResult | null>(null);
  const availability = getAIAvailability();

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const draft = await generateAIDraft(patientId, mode);
      setResult(draft);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      toast.success('Draft copied. Review before adding to the record.');
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[86vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <Sparkles className="text-violet-600" size={20} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">AI Clinical Assistant</h2>
            <p className="text-xs text-gray-500">
              {patientName ? `${patientName} · ` : ''}Draft support — not a substitute for clinical judgement
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Draft safety banner */}
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            AI-generated content is a <strong>draft only</strong> and may be incomplete or wrong.
            A qualified clinician must review, verify and edit it before it is used or entered into
            the medical record. Nothing here is saved automatically.
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-2 border-b border-gray-100 px-4 py-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-gray-700">Output type</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as AIDraftMode)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {AI_DRAFT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={run}
            disabled={!availability.available || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {result ? 'Regenerate' : 'Generate draft'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!availability.available && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{availability.reason}</span>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="mt-3 text-sm">Synthesising the patient record…</p>
            </div>
          )}

          {!loading && result && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                  Draft · {result.label}
                </span>
                <span className="text-[10px] text-gray-400">via {result.source}</span>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={run}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
                {result.content}
              </pre>
              <p className="mt-2 text-[11px] text-gray-400">
                Generated {result.generatedAt.toLocaleString()}. Review and edit before clinical use.
              </p>
            </div>
          )}

          {!loading && !result && availability.available && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <Sparkles size={32} />
              <p className="mt-3 max-w-xs text-sm">
                Choose an output type and generate a draft synthesised from this patient&apos;s
                encounters, vitals, medications and investigations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
