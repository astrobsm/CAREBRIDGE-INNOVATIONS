/**
 * Sheet / Dialog: the shared modal surface.
 *
 *  - Phone (under 640 px): a sheet that rises from the bottom edge. With
 *    `dragToDismiss` it can be pulled down by its grabber to close; the default
 *    is OFF, so a form with unsaved data is never thrown away by a swipe.
 *  - Wider screens (or placement="center"): a dialog that scales up from 0.95
 *    over a backdrop that fades in (blurred, except on low-end devices).
 *  - Reduced motion: opacity fades only.
 *  - Focus moves in on open, Tab stays inside, Escape closes, focus returns.
 *    Sheets stack: only the top one answers Escape and Tab.
 *
 * Presence. A parent may pass `open`, or mount the Sheet only while it is shown
 * (`{show && <MyDialog onClose=... />}`). Either way the exit animation plays
 * when the Sheet itself starts the close (Escape, backdrop, swipe, or the
 * `close` function handed to a render-prop child / useSheetClose()): the panel
 * animates out first and `onClose` runs when the exit has finished (at once
 * under reduced motion). A parent that flips `open` to false gets the exit
 * animation too.
 *
 * Unsaved input. Typing into any field inside the panel marks it dirty (or
 * pass `hasUnsavedInput` to say so yourself). While dirty, Escape does nothing,
 * and a backdrop tap or swipe asks before discarding. The dialog's own Cancel
 * and Close buttons still close straight away, as they always did.
 *
 * Rendered into document.body, so a page transition's transform can never
 * misplace it.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { SPRING_SHEET, SPRING_SNAPPY, springTransition } from './springs';
import { useFocusTrap } from './useFocusTrap';

const PHONE_QUERY = '(max-width: 639.98px)';

/** true while the viewport is phone-sized. */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY);
    if (!mq) return;
    const on = () => setPhone(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
}

/** Pull-down distance (px) or flick speed (px/s) that closes a sheet. */
export const DISMISS_DISTANCE = 110;
export const DISMISS_VELOCITY = 600;
export const shouldDismiss = (offsetY: number, velocityY: number) =>
  offsetY > DISMISS_DISTANCE || (offsetY > 24 && velocityY > DISMISS_VELOCITY);

/** What asked the sheet to close. 'button' is the dialog's own Cancel / Close. */
export type DismissReason = 'escape' | 'backdrop' | 'drag' | 'button';

/**
 * Whether a close request goes ahead. Pure, so it is unit-tested.
 *  - 'close'   close now;
 *  - 'confirm' ask the user first (typed data would be lost);
 *  - 'ignore'  do nothing.
 */
export function dismissDecision(o: {
  reason: DismissReason;
  dismissible: boolean;
  closeOnBackdrop: boolean;
  dirty: boolean;
}): 'close' | 'confirm' | 'ignore' {
  if (o.reason === 'button') return 'close';
  if (!o.dismissible) return 'ignore';
  if (o.reason === 'backdrop' && !o.closeOnBackdrop) return 'ignore';
  if (!o.dirty) return 'close';
  return o.reason === 'escape' ? 'ignore' : 'confirm';
}

/** Longest the exit may take before onClose runs anyway (a hidden tab pauses animations). */
export const EXIT_FALLBACK_MS = 700;

/**
 * The close sequence, kept apart from React so it can be tested without a DOM.
 * request(): reduced motion closes at once; otherwise the sheet is marked as
 * closing (its content leaves the presence tree) and onClose waits for
 * exitComplete(). Repeated requests while closing are ignored.
 */
export function createCloseController(o: {
  onClose: () => void;
  reduce: () => boolean;
  onChange: (closing: boolean) => void;
}) {
  let closing = false;
  return {
    get closing() { return closing; },
    request() {
      if (closing) return;
      if (o.reduce()) { o.onClose(); return; }
      closing = true;
      o.onChange(true);
    },
    exitComplete() {
      if (!closing) return;
      closing = false;
      o.onChange(false);
      o.onClose();
    },
    reset() {
      if (!closing) return;
      closing = false;
      o.onChange(false);
    },
  };
}

/** Panel widths on wider screens (a phone sheet is always full width). */
export const SHEET_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
} as const;
export type SheetSize = keyof typeof SHEET_SIZES;

export const DEFAULT_DISCARD_MESSAGE = 'Discard what you have typed in this form?';

const SheetCloseContext = createContext<(() => void) | null>(null);

/** Inside a Sheet: close it with the exit animation (then the Sheet's onClose runs). */
export function useSheetClose(): () => void {
  const close = useContext(SheetCloseContext);
  return close ?? (() => {});
}

export interface SheetProps {
  /** Shown or not. Leave out (true) when the parent mounts the sheet only while shown. */
  open?: boolean;
  onClose: () => void;
  /** Content, or a function given `close` (animated close, then onClose). */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Accessible name: give one of these. */
  label?: string;
  labelledBy?: string;
  /** 'auto': sheet on phones, dialog on wider screens. */
  placement?: 'auto' | 'center' | 'bottom';
  /** Allow pulling the phone sheet down to close. Off by default (forms). */
  dragToDismiss?: boolean;
  /** Close when the backdrop is tapped (default true). */
  closeOnBackdrop?: boolean;
  /** false: only the dialog's own buttons close it (no Escape, backdrop or swipe). */
  dismissible?: boolean;
  /** Typed data would be lost. Leave out to detect typing inside the panel. */
  hasUnsavedInput?: boolean;
  /** Asked before a backdrop tap or swipe discards typed data. */
  discardMessage?: string;
  /** Panel width on wider screens. */
  size?: SheetSize;
  /** 'content': the panel is a flex column that does not scroll; the content scrolls itself. */
  scroll?: 'panel' | 'content';
  initialFocusRef?: RefObject<HTMLElement>;
  /** Classes for the panel (width, padding, max-height...). */
  className?: string;
  /** Tailwind z-index class for the layer (default z-[60]). */
  zClassName?: string;
}

export function Sheet({
  open = true, onClose, children, label, labelledBy, placement = 'auto', dragToDismiss = false,
  closeOnBackdrop = true, dismissible = true, hasUnsavedInput, discardMessage = DEFAULT_DISCARD_MESSAGE,
  size, scroll = 'panel', initialFocusRef, className = '', zClassName = 'z-[60]',
}: SheetProps) {
  const phone = useIsPhone();
  const reduce = useReducedMotion();
  const bottom = placement === 'bottom' || (placement === 'auto' && phone);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const canDrag = bottom && dragToDismiss && !reduce;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  const [closing, setClosing] = useState(false);
  const controller = useMemo(() => createCloseController({
    onClose: () => onCloseRef.current(),
    reduce: () => !!reduceRef.current,
    onChange: setClosing,
  }), []);

  // Typing inside the panel since it opened.
  const typedRef = useRef(false);
  useEffect(() => {
    if (open) typedRef.current = false;
    else controller.reset();
  }, [open, controller]);

  // A hidden tab can pause the exit animation: never leave onClose waiting.
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(() => controller.exitComplete(), EXIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [closing, controller]);

  const settingsRef = useRef({ dismissible, closeOnBackdrop, hasUnsavedInput, discardMessage });
  settingsRef.current = { dismissible, closeOnBackdrop, hasUnsavedInput, discardMessage };

  const requestDismiss = useCallback((reason: DismissReason) => {
    const s = settingsRef.current;
    const dirty = s.hasUnsavedInput ?? typedRef.current;
    const d = dismissDecision({ reason, dismissible: s.dismissible, closeOnBackdrop: s.closeOnBackdrop, dirty });
    if (d === 'ignore') return;
    if (d === 'confirm' && !window.confirm(s.discardMessage)) return;
    controller.request();
  }, [controller]);

  const close = useCallback(() => requestDismiss('button'), [requestDismiss]);
  const shown = open && !closing;

  // The opener, read while rendering the opening frame: before an autoFocus field inside takes focus.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasShownRef = useRef(false);
  if (shown && !wasShownRef.current && typeof document !== 'undefined') {
    const a = document.activeElement as HTMLElement | null;
    openerRef.current = a && a !== document.body ? a : null;
  }
  wasShownRef.current = shown;

  useFocusTrap(shown, panelRef, { onEscape: () => requestDismiss('escape'), initialFocusRef, returnFocusRef: openerRef });

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : bottom
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: springTransition(SPRING_SHEET) }
      : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 }, transition: springTransition(SPRING_SNAPPY) };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (shouldDismiss(info.offset.y, info.velocity.y)) requestDismiss('drag');
  };

  const width = !bottom && size ? SHEET_SIZES[size] : '';
  const layout = scroll === 'content' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto';
  // A caller's own max-height (e.g. "max-h-[95vh] sm:max-h-[85vh]") replaces the default.
  const maxH = /(^|\s)(\w+:)*!?max-h-/.test(className) ? '' : 'max-h-[90vh]';

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence onExitComplete={() => controller.exitComplete()}>
      {shown && (
        <div className={`fixed inset-0 ${zClassName} flex ${bottom ? 'items-end' : 'items-center p-4'} justify-center`} data-motion="sheet">
          <motion.div
            className="absolute inset-0 bg-black/40 cb-backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.2 }}
            onClick={() => requestDismiss('backdrop')}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            // React events bubble out of a nested sheet's portal: count only this panel's own fields.
            onInput={e => { if (panelRef.current?.contains(e.target as Node)) typedRef.current = true; }}
            className={`relative bg-white shadow-2xl focus:outline-none w-full ${maxH} ${layout} ${bottom ? 'rounded-t-2xl pb-[env(safe-area-inset-bottom)]' : 'rounded-2xl'} ${width} ${className}`}
            {...panelMotion}
            drag={canDrag ? 'y' : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            dragMomentum={false}
            onDragEnd={canDrag ? onDragEnd : undefined}
          >
            {bottom && (
              <div
                className={`flex justify-center pt-2 pb-1 shrink-0 ${canDrag ? 'cursor-grab touch-none' : ''}`}
                onPointerDown={canDrag ? e => { e.preventDefault(); drag.start(e); } : undefined}
                aria-hidden="true"
              >
                <span className="block h-1.5 w-10 rounded-full bg-gray-300" />
              </div>
            )}
            <SheetCloseContext.Provider value={close}>
              {typeof children === 'function' ? children(close) : children}
            </SheetCloseContext.Provider>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** A centred dialog on every screen size. */
export function Dialog(props: Omit<SheetProps, 'placement'>) {
  return <Sheet {...props} placement="center" />;
}

export default Sheet;
