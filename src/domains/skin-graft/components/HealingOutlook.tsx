/**
 * Time to complete healing, and what to do about it.
 *
 * The prediction is shown with its confidence and its caveats attached, never
 * as a bare date. A projected POD with nothing beside it invites a surgeon to
 * treat a straight-line fit through four ward photographs as a plan; the
 * caveats are what make it a prompt instead.
 *
 * Recommendations each carry the finding that produced them, so a clinician can
 * see why one was raised and overrule it on that basis rather than dismissing
 * the list wholesale.
 */

import React, { useState } from 'react';
import {
  AlertOctagon, AlertTriangle, CalendarClock, ChevronDown, Info, Stethoscope,
} from 'lucide-react';
import type { HealingPrediction, Trajectory } from '../types';
import type { HealingRecommendation, GuidancePriority } from '../services/healingGuidance';

const TRAJECTORY_STYLE: Record<Trajectory, { label: string; className: string }> = {
  improving: { label: 'Improving', className: 'bg-emerald-100 text-emerald-800' },
  stable: { label: 'Stable', className: 'bg-sky-100 text-sky-800' },
  delayed: { label: 'Slower than expected', className: 'bg-amber-100 text-amber-800' },
  deteriorating: { label: 'Deteriorating', className: 'bg-red-100 text-red-800' },
  insufficient_data: { label: 'Not enough data', className: 'bg-gray-100 text-gray-600' },
};

const PRIORITY_STYLE: Record<GuidancePriority, { label: string; row: string; chip: string; Icon: typeof AlertTriangle }> = {
  urgent: {
    label: 'Urgent',
    row: 'border-red-200 bg-red-50',
    chip: 'bg-red-600 text-white',
    Icon: AlertOctagon,
  },
  important: {
    label: 'Important',
    row: 'border-amber-200 bg-amber-50',
    chip: 'bg-amber-500 text-white',
    Icon: AlertTriangle,
  },
  routine: {
    label: 'Routine',
    row: 'border-gray-200 bg-white',
    chip: 'bg-gray-200 text-gray-700',
    Icon: Info,
  },
};

// ── Prediction ──────────────────────────────────────────────────────────────

export const HealingPredictionCard: React.FC<{
  prediction: HealingPrediction;
  /** POD of the most recent assessment, to express the projection as a wait. */
  latestPod?: number | null;
}> = ({ prediction, latestPod }) => {
  const style = TRAJECTORY_STYLE[prediction.trajectory];
  const { predictedClosurePodFrom: from, predictedClosurePodTo: to } = prediction;
  const daysAway = from !== null && latestPod != null ? from - latestPod : null;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-700">Time to complete healing</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
          {style.label}
        </span>
      </div>

      {from !== null ? (
        <>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            POD {from}{to !== null && to !== from ? `–${to}` : ''}
          </p>
          <p className="text-sm text-gray-500">
            {daysAway !== null && daysAway > 0
              ? `About ${daysAway}${to !== null && to !== from ? `–${to - (latestPod as number)}` : ''} more days at the measured rate`
              : 'Projected from the measured rate'}
            {prediction.ratePerDay != null && ` · closing ${prediction.ratePerDay} %/day`}
          </p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-gray-700">No closure date projected</p>
          <p className="text-sm text-gray-500">
            {prediction.basedOnAssessments === 0
              ? 'Nothing measured yet.'
              : `From ${prediction.basedOnAssessments} measured assessment${prediction.basedOnAssessments === 1 ? '' : 's'}.`}
          </p>
        </>
      )}

      <div className="mt-3 pt-3 border-t space-y-1">
        <p className="text-xs font-medium text-gray-600">
          Confidence: <span className="capitalize">{prediction.confidence}</span>
          <span className="text-gray-400 font-normal ml-2">
            {prediction.basedOnAssessments} assessment{prediction.basedOnAssessments === 1 ? '' : 's'} · {prediction.modelVersion}
          </span>
        </p>
        {prediction.caveats.map((c, i) => (
          <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
            <span className="text-gray-300 mt-0.5">•</span>{c}
          </p>
        ))}
      </div>
    </div>
  );
};

// ── Recommendations ─────────────────────────────────────────────────────────

export const HealingRecommendations: React.FC<{
  recommendations: HealingRecommendation[];
}> = ({ recommendations }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(
    // What is urgent is expanded by default; nobody should have to click to
    // discover that a graft is failing.
    recommendations.filter(r => r.priority === 'urgent').map(r => r.id),
  ));

  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (!recommendations.length) return null;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-gray-700">Recommendations for healing</h3>
        <span className="text-xs text-gray-400">{recommendations.length}</span>
      </div>

      <ul className="space-y-2">
        {recommendations.map(r => {
          const s = PRIORITY_STYLE[r.priority];
          const isOpen = open.has(r.id);
          return (
            <li key={r.id} className={`border rounded-lg ${s.row}`}>
              <button
                onClick={() => toggle(r.id)}
                aria-expanded={isOpen}
                className="w-full flex items-start gap-2.5 p-3 text-left"
              >
                <s.Icon className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{r.title}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{r.basis}</span>
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${s.chip}`}>
                  {s.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <p className="px-3 pb-3 -mt-1 ml-6 text-sm text-gray-700">{r.detail}</p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-400 mt-3">
        Decision support from what was measured in the photographs and recorded in the patient’s
        notes. It has not examined the patient — treat every line as a prompt, not an instruction.
      </p>
    </div>
  );
};
