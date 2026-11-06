/**
 * Reconstruction: grafts and flaps (local / regional / free flap, pressure-sore
 * flap, scalp flap, contracture release…). Add a module by exporting it from
 * its own file in this folder and listing it here — nothing else needs editing.
 */
import type { ProcedureModule } from '../../types';
import { skinGraft } from './skinGraft';

export const RECONSTRUCTION_MODULES: ProcedureModule[] = [skinGraft];
