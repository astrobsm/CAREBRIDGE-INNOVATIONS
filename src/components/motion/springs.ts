/**
 * Spring presets: the one place the app's motion "feel" is defined.
 *
 * Each preset is used two ways:
 *  - by framer-motion components, as { type: 'spring', stiffness, damping, mass };
 *  - by CSS and the Web Animations API, as a sampled `linear()` easing plus a
 *    duration, so compositor-run animations (page slides, dialog entrances,
 *    toasts) follow the same curve without JavaScript on every frame.
 *
 * The curves are near-critically damped (a soft settle, almost no bounce),
 * which is the calm, physical feel of iOS / macOS rather than a playful wobble.
 */

export interface SpringPreset {
  stiffness: number;
  damping: number;
  mass: number;
}

/** Buttons, dialogs, small UI: quick and firm (about 290 ms). */
export const SPRING_SNAPPY: SpringPreset = { stiffness: 960, damping: 58, mass: 1 };
/** Page pushes: a little softer (about 340 ms). */
export const SPRING_GENTLE: SpringPreset = { stiffness: 640, damping: 48, mass: 1 };
/** Bottom sheets and toasts: a touch of overshoot, like a sheet settling. */
export const SPRING_SHEET: SpringPreset = { stiffness: 540, damping: 38, mass: 1 };

/** framer-motion transition for a preset. */
export const springTransition = (p: SpringPreset) => ({ type: 'spring' as const, ...p });

export interface SampledSpring {
  /** A CSS `linear()` easing, e.g. "linear(0, 0.12 5%, ... , 1)". */
  linear: string;
  /** Milliseconds until the spring is visually at rest. */
  duration: number;
}

/**
 * Simulates a spring from 0 to 1 (starting at rest) and samples it into a CSS
 * `linear()` easing. Pure and deterministic, so it is unit-tested.
 */
export function sampleSpring(p: SpringPreset, maxMs = 900): SampledSpring {
  const dt = 1 / 240; // seconds per step
  let x = 0;
  let v = 0;
  const pts: number[] = [0];
  let t = 0;
  let restAt = maxMs / 1000;
  let restFor = 0;
  while (t < maxMs / 1000) {
    const a = (-p.stiffness * (x - 1) - p.damping * v) / p.mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    pts.push(x);
    // At rest once within 0.3% of the target and nearly still for 30 ms.
    if (Math.abs(x - 1) < 0.003 && Math.abs(v) < 0.05) {
      restFor += dt;
      if (restFor >= 0.03) { restAt = t; break; }
    } else {
      restFor = 0;
    }
  }
  const duration = Math.round(restAt * 1000);
  // Down-sample to about 40 stops: plenty for a smooth curve, short enough to
  // keep the style string small.
  const stops = 40;
  const out: string[] = [];
  for (let i = 0; i <= stops; i++) {
    const idx = Math.min(pts.length - 1, Math.round((i / stops) * (pts.length - 1)));
    const val = i === stops ? 1 : pts[idx];
    out.push(i === 0 || i === stops ? String(val) : `${val.toFixed(4)} ${((i / stops) * 100).toFixed(1)}%`);
  }
  return { linear: `linear(${out.join(', ')})`, duration };
}

/** Fallback curves where `linear()` easing is not supported (older WebViews). */
export const FALLBACK_EASE = {
  snappy: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
  gentle: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sheet: 'cubic-bezier(0.18, 1.12, 0.3, 1)',
} as const;

let linearSupport: boolean | undefined;
/** true when the browser accepts CSS `linear()` easing. */
export function supportsLinearEasing(): boolean {
  if (linearSupport !== undefined) return linearSupport;
  try {
    linearSupport = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      && CSS.supports('animation-timing-function', 'linear(0, 0.5 50%, 1)');
  } catch {
    linearSupport = false;
  }
  return linearSupport;
}

const cache = new Map<SpringPreset, SampledSpring>();
const sampled = (p: SpringPreset) => {
  let s = cache.get(p);
  if (!s) { s = sampleSpring(p); cache.set(p, s); }
  return s;
};

/** Easing + duration for a WAAPI / CSS animation of a preset, with fallback. */
export function springTiming(name: keyof typeof FALLBACK_EASE): { easing: string; duration: number } {
  const p = name === 'snappy' ? SPRING_SNAPPY : name === 'gentle' ? SPRING_GENTLE : SPRING_SHEET;
  const s = sampled(p);
  return supportsLinearEasing()
    ? { easing: s.linear, duration: s.duration }
    // A cubic-bezier ends sooner than a spring's long tail looks; trim it.
    : { easing: FALLBACK_EASE[name], duration: Math.min(380, Math.round(s.duration * 0.75)) };
}
