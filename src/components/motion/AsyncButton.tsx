/**
 * A button that shows its own progress: label -> spinner "Saving..." ->
 * tick "Saved" -> back to the label, and a gentle shake on error.
 *
 * It does not run the action itself, so existing submit handlers keep their
 * exact behaviour. The page keeps its own busy flag and tells the button the
 * outcome:
 *
 *   const save = useActionStatus();
 *   ...on success: save.done();   ...on failure: save.error();
 *   <AsyncButton type="submit" busy={isLoading} status={save.status}
 *                workingLabel="Saving..." doneLabel="Saved">Save</AsyncButton>
 *
 * All three faces are stacked in one grid cell, so the button never changes
 * width (no layout jump); only opacity and transform animate. aria-busy is set
 * while working, and the outcome is announced through an aria-live region.
 */
import { forwardRef, useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { haptic } from './environment';

export type ActionStatus = 'idle' | 'working' | 'done' | 'error';

/** How long the "Saved" face and the error shake stay before returning to idle. */
export const DONE_MS = 1600;
export const ERROR_MS = 650;

export interface ActionStatusApi {
  status: ActionStatus;
  /** Show the working face (when there is no busy flag of your own). */
  start: () => void;
  /** Show the done face briefly, with a light haptic tap. */
  done: () => void;
  /** Shake briefly. */
  error: () => void;
  reset: () => void;
}

export function useActionStatus(): ActionStatusApi {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; clearTimeout(timer.current); }, []);

  const settle = useCallback((s: ActionStatus, ms: number) => {
    clearTimeout(timer.current);
    if (!mounted.current) return;
    setStatus(s);
    timer.current = setTimeout(() => { if (mounted.current) setStatus('idle'); }, ms);
  }, []);

  const start = useCallback(() => { clearTimeout(timer.current); if (mounted.current) setStatus('working'); }, []);
  const done = useCallback(() => { haptic('confirm'); settle('done', DONE_MS); }, [settle]);
  const error = useCallback(() => { haptic('error'); settle('error', ERROR_MS); }, [settle]);
  const reset = useCallback(() => { clearTimeout(timer.current); if (mounted.current) setStatus('idle'); }, []);
  return { status, start, done, error, reset };
}

/** The face to show: a page's busy flag wins over the remembered outcome. */
export function effectiveStatus(busy: boolean | undefined, status: ActionStatus | undefined): ActionStatus {
  if (busy) return 'working';
  return status ?? 'idle';
}

export interface AsyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The page's own busy flag (e.g. isSaving). */
  busy?: boolean;
  /** From useActionStatus(). */
  status?: ActionStatus;
  workingLabel?: ReactNode;
  doneLabel?: ReactNode;
  /** Announced to screen readers on error (the toast carries the detail). */
  errorLabel?: string;
  /** Disable while working (default true; pass false to keep old behaviour). */
  disableWhileWorking?: boolean;
}

const Spinner = () => <span className="cb-spinner" aria-hidden="true" />;
const Tick = () => (
  <svg className="cb-tick" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(function AsyncButton(
  { busy, status, workingLabel = 'Saving…', doneLabel = 'Saved', errorLabel = 'Not saved', disableWhileWorking = true,
    children, className = '', disabled, ...rest },
  ref,
) {
  const s = effectiveStatus(busy, status);
  const working = s === 'working';
  const live = s === 'done' ? (typeof doneLabel === 'string' ? doneLabel : 'Done') : s === 'error' ? errorLabel : '';
  return (
    <>
      <button
        ref={ref}
        {...rest}
        className={`cb-async ${className}`}
        data-status={s}
        aria-busy={working || undefined}
        disabled={disabled || (disableWhileWorking && working)}
      >
        <span className="cb-async__stack">
          <span className="cb-async__face" data-face="idle" aria-hidden={s === 'working' || s === 'done' || undefined}>{children}</span>
          <span className="cb-async__face" data-face="working" aria-hidden={!working || undefined}><Spinner />{workingLabel}</span>
          <span className="cb-async__face" data-face="done" aria-hidden={s !== 'done' || undefined}><Tick />{doneLabel}</span>
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{live}</span>
    </>
  );
});

export default AsyncButton;
