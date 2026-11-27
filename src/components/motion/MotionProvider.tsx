/**
 * Wraps the app once (src/bootEmr.tsx). `reducedMotion="user"` makes every
 * framer-motion animation in the app (well over a hundred components) honour
 * the OS "reduce motion" setting: movement and scaling are dropped, fades kept.
 */
import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export default MotionProvider;
