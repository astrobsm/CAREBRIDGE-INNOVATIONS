/**
 * The app's one Toaster: frosted cards that spring in from the top and stack
 * like phone notifications. react-hot-toast keeps doing the stacking and the
 * icon morph (a loading spinner becomes a drawn tick or cross when the same
 * toast id is updated); this only restyles the card and its entrance, and adds
 * a calm progress sweep under a loading toast.
 *
 * Phones get top-centre (like iOS), wider screens top-right (like macOS).
 */
import { Toaster, ToastBar, type Toast } from 'react-hot-toast';
import { useReducedMotion } from 'framer-motion';
import { useIsPhone } from './Sheet';

function animationFor(t: Toast, reduce: boolean): string {
  if (reduce) return t.visible ? 'cb-toast-fade-in 160ms ease-out forwards' : 'cb-toast-fade-out 160ms ease-in forwards';
  return t.visible
    ? 'cb-toast-in var(--spring-sheet-ms, 350ms) var(--spring-sheet, cubic-bezier(0.18, 1.12, 0.3, 1)) forwards'
    : 'cb-toast-out 200ms cubic-bezier(0.4, 0, 1, 1) forwards';
}

export function MotionToaster() {
  const phone = useIsPhone();
  const reduce = !!useReducedMotion();
  return (
    <Toaster
      position={phone ? 'top-center' : 'top-right'}
      gutter={8}
      containerStyle={{ top: 'max(12px, env(safe-area-inset-top))' }}
      toastOptions={{
        duration: 4000,
        className: 'cb-toast',
        success: { className: 'cb-toast cb-toast--success', iconTheme: { primary: '#10B981', secondary: '#fff' } },
        error: { className: 'cb-toast cb-toast--error', iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        loading: { className: 'cb-toast cb-toast--loading', iconTheme: { primary: '#4F46E5', secondary: '#E0E7FF' } },
      }}
    >
      {t => (
        <ToastBar
          toast={t}
          // Until react-hot-toast has measured the card, keep it hidden (as
          // its own default does); then run our entrance / exit.
          style={t.height ? { animation: animationFor(t, reduce) } : { opacity: 0 }}
        >
          {({ icon, message }) => (
            <>
              {icon}
              {message}
              {t.type === 'loading' && <span className="cb-toast__sweep" aria-hidden="true" />}
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

export default MotionToaster;
