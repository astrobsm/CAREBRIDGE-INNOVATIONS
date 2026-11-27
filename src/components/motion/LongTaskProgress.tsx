/**
 * A calm progress strip for long tasks (Claude writing a plan, a scan, a PDF,
 * a sync). With known stages it shows "Step 2 of 3 · Reading the results" and
 * a bar that fills by stage; otherwise an indeterminate shimmer with a
 * reassuring hint. It never shows an invented percentage.
 */
export interface LongTaskProgressProps {
  /** What is happening, e.g. "Writing the plan…". */
  label: string;
  /** Expectation-setting line, e.g. "This usually takes 20–40 seconds". */
  hint?: string;
  /** Known stages, in order, and the index of the current one. */
  stages?: string[];
  current?: number;
  tone?: 'indigo' | 'purple' | 'emerald' | 'white';
  /** Keep the label for screen readers only (the surrounding UI already says it). */
  labelHidden?: boolean;
  className?: string;
}

const TONES = {
  indigo: { text: 'text-indigo-900', sub: 'text-indigo-700', track: 'bg-indigo-100', bar: 'bg-indigo-500' },
  purple: { text: 'text-purple-900', sub: 'text-purple-700', track: 'bg-purple-100', bar: 'bg-purple-500' },
  emerald: { text: 'text-emerald-900', sub: 'text-emerald-700', track: 'bg-emerald-100', bar: 'bg-emerald-500' },
  white: { text: 'text-white', sub: 'text-white/85', track: 'bg-white/25', bar: 'bg-white' },
} as const;

/** Fraction (0..1) of the bar to fill for a staged task: stages done + half of the current. */
export function stageFraction(stages: number, current: number): number {
  if (stages <= 0) return 0;
  const i = Math.max(0, Math.min(stages - 1, current));
  return (i + 0.5) / stages;
}

export function LongTaskProgress({ label, hint, stages, current = 0, tone = 'indigo', labelHidden = false, className = '' }: LongTaskProgressProps) {
  const t = TONES[tone];
  const staged = !!stages && stages.length > 0;
  const i = staged ? Math.max(0, Math.min(stages!.length - 1, current)) : 0;
  return (
    <div className={`space-y-1.5 ${className}`} role="status" aria-live="polite" data-testid="long-task-progress">
      <p className={labelHidden ? 'sr-only' : `text-xs font-medium ${t.text}`}>
        {staged ? <>Step {i + 1} of {stages!.length} · {stages![i]}</> : label}
      </p>
      <div
        className={`cb-progress relative h-1.5 w-full overflow-hidden rounded-full ${t.track}`}
        role="progressbar"
        aria-label={label}
        {...(staged ? { 'aria-valuemin': 0, 'aria-valuemax': stages!.length, 'aria-valuenow': i + 1, 'aria-valuetext': `Step ${i + 1} of ${stages!.length}: ${stages![i]}` } : {})}
      >
        {staged
          ? <span className={`cb-progress__fill absolute inset-y-0 left-0 w-full rounded-full ${t.bar}`} style={{ transform: `scaleX(${stageFraction(stages!.length, i)})` }} />
          : <span className={`cb-progress__sweep absolute inset-y-0 left-0 w-2/5 rounded-full ${t.bar}`} />}
      </div>
      {hint && <p className={`text-[11px] ${t.sub}`}>{hint}</p>}
    </div>
  );
}

export default LongTaskProgress;
