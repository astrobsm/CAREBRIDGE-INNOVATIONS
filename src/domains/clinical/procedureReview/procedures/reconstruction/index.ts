/**
 * Reconstruction: grafts and flaps (local / regional / free flap, pressure-sore
 * flap, scalp flap, contracture release…). Add a module by exporting it from
 * its own file in this folder and listing it here — nothing else needs editing.
 * flapShared.ts holds the flap-monitoring fields and rules the flap modules share.
 */
import type { ProcedureModule } from '../../types';
import { skinGraft } from './skinGraft';
import { localRegionalFlap } from './localRegionalFlap';
import { freeFlap } from './freeFlap';
import { pressureSoreFlap } from './pressureSoreFlap';
import { scalpReconstruction } from './scalpReconstruction';
import { contractureRelease } from './contractureRelease';

export const RECONSTRUCTION_MODULES: ProcedureModule[] = [
  skinGraft, localRegionalFlap, freeFlap, pressureSoreFlap, scalpReconstruction, contractureRelease,
];
