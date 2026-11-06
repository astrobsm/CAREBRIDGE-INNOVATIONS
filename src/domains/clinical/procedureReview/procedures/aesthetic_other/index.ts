/**
 * Aesthetic and other procedures: breast reduction, abdominoplasty,
 * liposuction, cleft, scar revision. (Keloid excision is in
 * oncology/keloidManagement.ts.) Export each module from its own file in this
 * folder and list it below - nothing else needs editing.
 */
import type { ProcedureModule } from '../../types';
import { cleftLipPalate } from './cleftLipPalate';
import { breastBodyContouring } from './breastBodyContouring';

export const AESTHETIC_OTHER_MODULES: ProcedureModule[] = [cleftLipPalate, breastBodyContouring];
