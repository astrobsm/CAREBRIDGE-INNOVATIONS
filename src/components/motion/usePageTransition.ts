/**
 * Page transitions for the layout's <Outlet>.
 *
 * A forward push slides the new page in from the right, Back slides it in from
 * the left, a redirect (replace) just fades. Only the ENTERING page animates:
 * the old page unmounts at once, as it did before, so
 *   - no page is ever mounted twice (heavy pages, live queries, autosave);
 *   - an unsaved-changes guard on the old page is torn down exactly as before;
 *   - nothing waits for an exit animation before the new route renders.
 *
 * The animation runs on the compositor (Web Animations API, transform and
 * opacity only) and leaves no style behind when it ends. While a transform is
 * applied, `position: fixed` children would be placed against the page instead
 * of the screen, so a page that shows a dialog, a FAB or any fixed bar (the
 * clerking dialog opened by ?clerk=initial, for one) gets a fade only, and if
 * one appears mid-slide the slide is dropped at once.
 *
 * The layout's scroll container is not touched beyond hiding horizontal
 * overflow for the length of the slide, so scroll position behaves as before.
 */
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType, type NavigationType } from 'react-router-dom';
import { springTiming } from './springs';
import { prefersReducedMotion } from './environment';

export type PageDirection = 'forward' | 'back' | 'fade';

/** react-router's BrowserRouter keeps a history index in history.state.idx. */
export function historyIndex(state: unknown): number | null {
  const idx = (state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : null;
}

/** Which way a navigation goes, from the navigation type and history indices. */
export function directionFor(type: NavigationType, prevIdx: number | null, idx: number | null): PageDirection {
  if (type === 'PUSH') return 'forward';
  if (type === 'REPLACE') return 'fade';
  // POP: browser Back / Forward, or navigate(-1).
  if (prevIdx !== null && idx !== null && idx > prevIdx) return 'forward';
  return 'back';
}

/** Elements that must not sit inside a transformed ancestor. */
const FIXED_SELECTOR = '.fixed, .fab, [role="dialog"], [aria-modal="true"]';

/** Starts the entrance animation; returns a function that cancels it. */
export function runPageEnter(el: HTMLElement, dir: PageDirection, scroller: HTMLElement | null): () => void {
  if (typeof el.animate !== 'function') return () => {};
  const reduce = prefersReducedMotion();
  const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: reduce ? 120 : 200,
    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  });
  if (reduce || dir === 'fade' || el.querySelector(FIXED_SELECTOR)) {
    return () => fade.cancel();
  }

  const width = el.clientWidth || window.innerWidth;
  const offset = Math.round(Math.min(48, Math.max(24, width * 0.08)));
  const dx = dir === 'forward' ? offset : -offset;
  const { easing, duration } = springTiming('gentle');

  const prevOverflowX = scroller?.style.overflowX ?? '';
  if (scroller) scroller.style.overflowX = 'hidden';

  const slide = el.animate(
    [{ transform: `translate3d(${dx}px, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
    { duration, easing },
  );
  let observer: MutationObserver | null = null;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    observer?.disconnect();
    if (scroller) scroller.style.overflowX = prevOverflowX;
  };
  slide.onfinish = finish;
  slide.oncancel = finish;
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      if (el.querySelector(FIXED_SELECTOR)) slide.cancel();
    });
    observer.observe(el, { childList: true, subtree: true });
  }
  return () => {
    fade.cancel();
    slide.cancel();
    finish();
  };
}

/**
 * Animates `ref` each time the route's pathname changes. A change to the
 * search string or hash only (tabs, filters) does not animate.
 */
export function usePageTransition(ref: RefObject<HTMLElement>, scrollerRef?: RefObject<HTMLElement>): void {
  const location = useLocation();
  const navType = useNavigationType();
  const prev = useRef<{ path: string; idx: number | null } | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const idx = historyIndex(typeof window !== 'undefined' ? window.history.state : null);
    const last = prev.current;
    prev.current = { path: location.pathname, idx };
    if (!last || last.path === location.pathname) return;
    const el = ref.current;
    if (!el) return;
    cancel.current?.();
    cancel.current = runPageEnter(el, directionFor(navType, last.idx, idx), scrollerRef?.current ?? null);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => () => cancel.current?.(), []);
}
