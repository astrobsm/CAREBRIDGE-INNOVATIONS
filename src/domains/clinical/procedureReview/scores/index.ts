/**
 * The procedure-review screening instruments, in one place.
 *
 * New scored instruments for this app belong here, as ScreeningInstruments
 * (ScaleItem model, scored by scar/data/scales.scoreScale). Existing
 * calculators (Caprini, Braden, MUST, ASA, RCRI, STOP-BANG, NEWS2, LRINEC,
 * WIfI, SINBAD…) are NOT re-implemented: the engine calls them where they live.
 */
export * from './instrument';
export * from './phq';
export * from './gad';
export * from './apfel';
export * from './cfs';
export * from './appearance';

import { PHQ9 } from './phq';
import { GAD7 } from './gad';
import { APFEL } from './apfel';
import { CFS } from './cfs';
import { APPEARANCE_SCREEN } from './appearance';

export const SCREENING_INSTRUMENTS = [PHQ9, GAD7, APFEL, CFS, APPEARANCE_SCREEN] as const;
