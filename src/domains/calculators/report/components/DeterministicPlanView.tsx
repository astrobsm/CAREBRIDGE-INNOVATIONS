/**
 * The app's own plan, rendered the same way on both calculator surfaces and
 * from the same object the PDF prints.
 */
import { AlertTriangle, Info } from 'lucide-react';
import type { DeterministicPlan, ReportSection } from '../types';

const TONE: Record<NonNullable<ReportSection['tone']>, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warn: 'bg-amber-50 border-amber-300 text-amber-900',
  danger: 'bg-red-50 border-red-300 text-red-900',
};

export function HardLimitsBox({ limits, title = 'Hard limits — do not exceed, whatever the deficit suggests' }: { limits: string[]; title?: string }) {
  if (!limits.length) return null;
  return (
    <div className="rounded-lg border p-3 text-sm flex gap-2 bg-red-50 border-red-300 text-red-900" data-testid="hard-limits">
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
          {limits.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function DeterministicPlanView({ plan, heading = 'Plan' }: { plan: DeterministicPlan; heading?: string }) {
  return (
    <div className="space-y-3" data-testid="deterministic-plan">
      {(plan.title || plan.target) && (
        <div>
          {plan.title && <h3 className="font-semibold text-gray-900">{plan.title}</h3>}
          {plan.target && <p className="text-sm text-gray-600 break-words">Target: {plan.target}</p>}
        </div>
      )}

      {plan.prerequisites.length > 0 && (
        <div className={`rounded-lg border p-3 text-sm flex gap-2 ${TONE.warn}`}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-medium">Correct or check first:</span>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {plan.prerequisites.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>
      )}

      {plan.steps.length > 0 && (
        <div>
          <p className="font-semibold text-sm text-gray-900 mb-1">{heading}</p>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-3">
            {plan.steps.map((s, i) => (
              <li key={i} className="break-words">
                <p className="font-medium text-gray-900">{s.heading}</p>
                <dl className="mt-1 space-y-0.5">
                  {s.lines.map((l, j) => (
                    <div key={j}>
                      <dt className="inline font-medium text-gray-800">{l.label}: </dt>
                      <dd className="inline">{l.value}</dd>
                    </div>
                  ))}
                </dl>
                {s.cautions.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 text-amber-800 space-y-0.5">
                    {s.cautions.map((c, j) => <li key={j}>{c}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      <HardLimitsBox limits={plan.hardLimits} />

      {plan.monitoring.length > 0 && (
        <div>
          <p className="font-semibold text-sm text-gray-900 mb-1">Monitoring</p>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
            {plan.monitoring.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {plan.sections.map((s, i) => (
        s.tone ? (
          <div key={i} className={`rounded-lg border p-3 text-sm flex gap-2 ${TONE[s.tone]}`}>
            {s.tone === 'info' ? <Info className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className="font-medium">{s.title}</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            </div>
          </div>
        ) : (
          <div key={i}>
            <p className="font-semibold text-sm text-gray-900 mb-1">{s.title}</p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5 break-words">
              {s.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          </div>
        )
      ))}
    </div>
  );
}
