import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { NavigationType } from 'react-router-dom';
import { join } from 'path';
import { sampleSpring, SPRING_SNAPPY, SPRING_GENTLE, SPRING_SHEET } from '../springs';
import { directionFor, historyIndex } from '../usePageTransition';
import { effectiveStatus } from '../AsyncButton';
import { stageFraction } from '../LongTaskProgress';
import { shouldDismiss } from '../Sheet';
import { isLowEndDevice } from '../environment';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('springs', () => {
  it('settle in the short, calm range (about 200-450 ms)', () => {
    for (const p of [SPRING_SNAPPY, SPRING_GENTLE, SPRING_SHEET]) {
      const s = sampleSpring(p);
      expect(s.duration).toBeGreaterThanOrEqual(180);
      expect(s.duration).toBeLessThanOrEqual(450);
    }
  });

  it('produce a CSS linear() easing that starts at 0 and ends at 1', () => {
    const s = sampleSpring(SPRING_SNAPPY);
    expect(s.linear).toMatch(/^linear\(0, /);
    expect(s.linear).toMatch(/, 1\)$/);
    expect(s.linear.length).toBeLessThan(800);
  });

  it('near-critical damping: little or no overshoot', () => {
    const s = sampleSpring(SPRING_GENTLE);
    const peak = Math.max(...s.linear.slice(7, -1).split(', ').map(x => parseFloat(x)));
    expect(peak).toBeLessThan(1.03);
  });
});

describe('page direction', () => {
  it('push is forward, replace fades, back pops slide the other way', () => {
    expect(directionFor(NavigationType.Push, 3, 4)).toBe('forward');
    expect(directionFor(NavigationType.Replace, 3, 3)).toBe('fade');
    expect(directionFor(NavigationType.Pop, 4, 3)).toBe('back');
    expect(directionFor(NavigationType.Pop, 3, 4)).toBe('forward');
    expect(directionFor(NavigationType.Pop, null, null)).toBe('back');
  });

  it('reads the history index react-router keeps in history.state', () => {
    expect(historyIndex({ idx: 7, key: 'x' })).toBe(7);
    expect(historyIndex(null)).toBeNull();
    expect(historyIndex({})).toBeNull();
  });
});

describe('async button status', () => {
  it("the page's busy flag wins; otherwise the remembered outcome shows", () => {
    expect(effectiveStatus(true, 'done')).toBe('working');
    expect(effectiveStatus(false, 'done')).toBe('done');
    expect(effectiveStatus(false, 'error')).toBe('error');
    expect(effectiveStatus(undefined, undefined)).toBe('idle');
  });
});

describe('long task progress', () => {
  it('fills by stage, never to 100% before the task ends', () => {
    expect(stageFraction(3, 0)).toBeCloseTo(1 / 6);
    expect(stageFraction(3, 2)).toBeCloseTo(5 / 6);
    expect(stageFraction(3, 9)).toBeCloseTo(5 / 6);
    expect(stageFraction(0, 0)).toBe(0);
  });
});

describe('sheet drag to dismiss', () => {
  it('needs a real pull or a flick', () => {
    expect(shouldDismiss(30, 100)).toBe(false);
    expect(shouldDismiss(130, 0)).toBe(true);
    expect(shouldDismiss(40, 900)).toBe(true);
    expect(shouldDismiss(10, 2000)).toBe(false);
  });
});

describe('low-end detection', () => {
  it('flags small memory, few cores or Data Saver', () => {
    expect(isLowEndDevice({ hardwareConcurrency: 8, deviceMemory: 8 } as unknown as Navigator)).toBe(false);
    expect(isLowEndDevice({ hardwareConcurrency: 8, deviceMemory: 2 } as unknown as Navigator)).toBe(true);
    expect(isLowEndDevice({ hardwareConcurrency: 4 } as unknown as Navigator)).toBe(true);
    expect(isLowEndDevice({ hardwareConcurrency: 8, connection: { saveData: true } } as unknown as Navigator)).toBe(true);
  });
});

describe('motion wiring', () => {
  it('the app boots inside MotionProvider with the shared toaster', () => {
    const boot = read('src/bootEmr.tsx');
    expect(boot).toMatch(/<MotionProvider>/);
    expect(boot).toMatch(/<MotionToaster \/>/);
    expect(boot).toMatch(/installMotionEnvironment\(\)/);
    expect(boot).not.toMatch(/<Toaster\b/);
  });

  it('the layout animates the entering page only (no AnimatePresence around the Outlet)', () => {
    const layout = read('src/components/layouts/MainLayout.tsx');
    expect(layout).toMatch(/usePageTransition\(pageRef, scrollRef\)/);
    expect(layout).not.toMatch(/AnimatePresence/);
    expect(layout).toMatch(/<Outlet \/>/);
  });

  it('reduced motion honoured everywhere: framer config and a CSS branch', () => {
    expect(read('src/components/motion/MotionProvider.tsx')).toMatch(/reducedMotion="user"/);
    expect(read('src/components/motion/motion.css')).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('drag-to-dismiss is opt-in, so a form is never swiped away', () => {
    expect(read('src/components/motion/Sheet.tsx')).toMatch(/dragToDismiss = false/);
  });
});
