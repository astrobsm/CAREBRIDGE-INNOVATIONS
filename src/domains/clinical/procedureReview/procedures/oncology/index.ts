/**
 * Oncology: tumour excision, melanoma wide local excision, BCC / SCC, scalp
 * tumour, sarcoma, lipoma, biopsy. Phase 2 adds modules here: export each from
 * its own file in this folder and list it below — nothing else needs editing.
 */
import type { ProcedureModule } from '../../types';
import { skinTumourExcision } from './skinTumourExcision';
import { melanomaWle } from './melanomaWle';
import { scalpTumourExcision } from './scalpTumourExcision';
import { softTissueLesionExcision } from './softTissueLesionExcision';
import { keloidManagement } from './keloidManagement';
import { vascularAnomaly } from './vascularAnomaly';

export const ONCOLOGY_MODULES: ProcedureModule[] = [skinTumourExcision, melanomaWle, scalpTumourExcision, softTissueLesionExcision, keloidManagement, vascularAnomaly];
