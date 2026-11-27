/**
 * Keyboard focus for dialogs: move focus in on open, keep Tab inside, close on
 * Escape, and give focus back to whatever had it when the dialog closes.
 */
import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.getAttribute('aria-hidden') !== 'true' && (el.offsetParent !== null || el === document.activeElement));
}

/**
 * Open traps, oldest first. Only the newest (a dialog opened from a dialog)
 * handles Escape and Tab, so one Escape closes one layer.
 */
const trapStack: object[] = [];
export const isTopTrap = (token: object) => trapStack[trapStack.length - 1] === token;
export const openTrapCount = () => trapStack.length;

export function useFocusTrap(
  active: boolean,
  panelRef: RefObject<HTMLElement>,
  opts: { onEscape?: () => void; initialFocusRef?: RefObject<HTMLElement> } = {},
): void {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    if (!panel) return;
    const returnTo = document.activeElement as HTMLElement | null;

    // Focus after the first frame so the entrance animation has started and the
    // element is focusable (not inside a still-hidden layer).
    const raf = requestAnimationFrame(() => {
      if (panel.contains(document.activeElement)) return; // an autoFocus input already has it
      const target = optsRef.current.initialFocusRef?.current ?? focusableIn(panel)[0] ?? panel;
      target.focus({ preventScroll: true });
    });

    const token = {};
    trapStack.push(token);

    const onKey = (e: KeyboardEvent) => {
      // A dialog opened from this one is on top: it answers the keys.
      if (!isTopTrap(token)) return;
      if (e.key === 'Escape' && optsRef.current.onEscape) {
        e.stopPropagation();
        optsRef.current.onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusableIn(panel);
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (current === first || !panel.contains(current))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (current === last || !panel.contains(current))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey, true);
      const at = trapStack.indexOf(token);
      if (at >= 0) trapStack.splice(at, 1);
      // Give focus back, unless the user has already moved it elsewhere.
      if (returnTo && document.contains(returnTo) && (!document.activeElement || document.activeElement === document.body || panel.contains(document.activeElement))) {
        returnTo.focus({ preventScroll: true });
      }
    };
  }, [active, panelRef]);
}
