/**
 * Limb, hand and burns: diabetic foot debridement, ray / below-knee
 * amputation, tendon and nerve repair, burn excision and grafting, NPWT,
 * fasciotomy. Phase 2 adds modules here: export each from its own file in this
 * folder and list it below — nothing else needs editing.
 */
import type { ProcedureModule } from '../../types';
import { diabeticFootDebridement } from './diabeticFootDebridement';
import { lowerLimbAmputation } from './lowerLimbAmputation';
import { tendonRepair } from './tendonRepair';
import { nerveRepairHandTrauma } from './nerveRepairHandTrauma';
import { burnsExcisionGrafting } from './burnsExcisionGrafting';
import { necrotisingSoftTissueInfection } from './necrotisingSoftTissueInfection';
import { npwt } from './npwt';

export const LIMB_HAND_BURNS_MODULES: ProcedureModule[] = [
  diabeticFootDebridement,
  lowerLimbAmputation,
  tendonRepair,
  nerveRepairHandTrauma,
  burnsExcisionGrafting,
  necrotisingSoftTissueInfection,
  npwt,
];
