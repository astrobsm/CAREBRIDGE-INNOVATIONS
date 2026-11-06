/**
 * Wound procedures. Add a module by exporting it from its own file in this
 * folder and listing it here — nothing else needs editing.
 */
import type { ProcedureModule } from '../../types';
import { woundCareReview } from './woundCareReview';

export const WOUND_MODULES: ProcedureModule[] = [woundCareReview];
