/**
 * Motion environment: reduced motion, low-end devices and haptics.
 *
 * installMotionEnvironment() runs once at boot (src/bootEmr.tsx). It writes the
 * spring easings into CSS custom properties, so motion.css uses the same curves
 * as the JavaScript, and tags <html>:
 *   - `fx-low`    on low-end devices: no backdrop blur on large areas;
 *   - `fx-reduce` while the OS asks for reduced motion (CSS also checks the
 *                 media query itself; the class is for script-driven checks).
 */
import { springTiming } from './springs';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** true while the user's OS asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCE_QUERY).matches;
  } catch {
    return false;
  }
}

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/**
 * A cheap guess at a low-end phone: 3 GB of memory or less, 4 cores or fewer,
 * or Data Saver on. Used only to drop expensive effects (large blurs).
 */
export function isLowEndDevice(nav: NavigatorWithHints | undefined = typeof navigator !== 'undefined' ? navigator : undefined): boolean {
  if (!nav) return false;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 3) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) return true;
  return false;
}

/**
 * A very light haptic tap on devices that support it (Android Chrome). iOS
 * and desktops have no vibration API, so this is a no-op there. Never fires
 * when reduced motion is on.
 */
export function haptic(kind: 'confirm' | 'error' = 'confirm'): void {
  try {
    if (prefersReducedMotion()) return;
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (!nav || typeof nav.vibrate !== 'function') return;
    nav.vibrate(kind === 'error' ? [8, 40, 8] : 10);
  } catch {
    /* vibration is a nicety; never let it throw */
  }
}

let installed = false;
export function installMotionEnvironment(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const root = document.documentElement;
  for (const name of ['snappy', 'gentle', 'sheet'] as const) {
    const t = springTiming(name);
    root.style.setProperty(`--spring-${name}`, t.easing);
    root.style.setProperty(`--spring-${name}-ms`, `${t.duration}ms`);
  }
  if (isLowEndDevice()) root.classList.add('fx-low');
  try {
    const mq = window.matchMedia(REDUCE_QUERY);
    const apply = () => root.classList.toggle('fx-reduce', mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
  } catch {
    /* matchMedia missing: leave motion on */
  }
}
