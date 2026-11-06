/**
 * Every procedure module, registered in one place.
 *
 * Each group folder under procedures/ exports its own array; this file only
 * concatenates them. A phase-2 author adds a module to their group's
 * index.ts and never edits this file, so parallel work cannot collide here.
 * The registry test (__tests__/registry.test.ts) checks every module against
 * the contract.
 */
import type { ProcedureGroup, ProcedureModule, ReviewPhase } from './types';
import { WOUND_MODULES } from './procedures/wound';
import { RECONSTRUCTION_MODULES } from './procedures/reconstruction';
import { ONCOLOGY_MODULES } from './procedures/oncology';
import { LIMB_HAND_BURNS_MODULES } from './procedures/limb_hand_burns';
import { AESTHETIC_OTHER_MODULES } from './procedures/aesthetic_other';

export const PROCEDURE_MODULES: readonly ProcedureModule[] = [
  ...WOUND_MODULES,
  ...RECONSTRUCTION_MODULES,
  ...ONCOLOGY_MODULES,
  ...LIMB_HAND_BURNS_MODULES,
  ...AESTHETIC_OTHER_MODULES,
];

export const GROUP_LABELS: Record<ProcedureGroup, string> = {
  wound: 'Wounds',
  reconstruction: 'Reconstruction (grafts and flaps)',
  oncology: 'Skin and soft-tissue oncology',
  hand: 'Hand surgery',
  diabetic_foot: 'Diabetic foot and limb salvage',
  pressure: 'Pressure injuries',
  burns: 'Burns',
  aesthetic: 'Aesthetic',
  other: 'Other',
};

export const getModule = (id: string): ProcedureModule | undefined => PROCEDURE_MODULES.find(m => m.id === id);

/** Modules offered at a phase, grouped for the picker, groups in GROUP_LABELS order. */
export function modulesByGroup(phase?: ReviewPhase): { group: ProcedureGroup; label: string; modules: ProcedureModule[] }[] {
  return (Object.keys(GROUP_LABELS) as ProcedureGroup[])
    .map(group => ({
      group, label: GROUP_LABELS[group],
      modules: PROCEDURE_MODULES.filter(m => m.group === group && (!phase || m.phases.includes(phase))),
    }))
    .filter(g => g.modules.length);
}

/** Modules linked to a surgical-fee catalogue id (e.g. from a booked surgery). */
export const modulesForFeeId = (feeId: string) => PROCEDURE_MODULES.filter(m => m.catalog.feeIds?.includes(feeId));
