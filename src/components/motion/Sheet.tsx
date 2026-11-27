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
 *
 * Rendered into document.body, so a page transition's transform can never
 * misplace it. Pass `open` (rather than mounting it conditionally) to get the
 * exit animation too.
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
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

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name: give one of these. */
  label?: string;
  labelledBy?: string;
  /** 'auto': sheet on phones, dialog on wider screens. */
  placement?: 'auto' | 'center' | 'bottom';
  /** Allow pulling the phone sheet down to close. Off by default (forms). */
  dragToDismiss?: boolean;
  /** Close when the backdrop is tapped (default true). */
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  /** Classes for the panel (width, padding, max-height...). */
  className?: string;
  /** Tailwind z-index class for the layer (default z-[60]). */
  zClassName?: string;
}

export function Sheet({
  open, onClose, children, label, labelledBy, placement = 'auto', dragToDismiss = false,
  closeOnBackdrop = true, initialFocusRef, className = '', zClassName = 'z-[60]',
}: SheetProps) {
  const phone = useIsPhone();
  const reduce = useReducedMotion();
  const bottom = placement === 'bottom' || (placement === 'auto' && phone);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const canDrag = bottom && dragToDismiss && !reduce;

  useFocusTrap(open, panelRef, { onEscape: onClose, initialFocusRef });

  const panelMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : bottom
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: springTransition(SPRING_SHEET) }
      : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 }, transition: springTransition(SPRING_SNAPPY) };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (shouldDismiss(info.offset.y, info.velocity.y)) onClose();
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${zClassName} flex ${bottom ? 'items-end' : 'items-center p-4'} justify-center`} data-motion="sheet">
          <motion.div
            className="absolute inset-0 bg-black/45 cb-backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={`relative bg-white shadow-2xl focus:outline-none ${bottom ? 'w-full rounded-t-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]' : 'w-full rounded-2xl max-h-[90vh] overflow-y-auto'} ${className}`}
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
                className={`flex justify-center pt-2 pb-1 ${canDrag ? 'cursor-grab touch-none' : ''}`}
                onPointerDown={canDrag ? e => drag.start(e) : undefined}
                aria-hidden="true"
              >
                <span className="block h-1.5 w-10 rounded-full bg-gray-300" />
              </div>
            )}
            {children}
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
