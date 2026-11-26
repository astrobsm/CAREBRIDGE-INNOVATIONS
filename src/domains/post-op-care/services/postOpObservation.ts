// ---------------------------------------------------------------------------
// Post-op monitoring: what gets written when the nurse presses Save.
//
// The monitoring modal used to write only a vitalSigns row, and only when a
// pulse / BP / temperature was entered. Wound condition, drain outputs, fluid
// balance, complications and escalation were dropped, and the success toast
// fired even when nothing at all was written. These builders turn the whole
// form into a PostOpObservation, plus the vitals row the charts read.
// ---------------------------------------------------------------------------

import { z } from 'zod';
import type { VitalSigns } from '../../../types';
import type { PostOpCarePlan, PostOpObservation } from '../types';

export const monitoringSchema = z.object({
  // Vital Signs
  heartRate: z.number().min(30).max(220).optional(),
  bloodPressureSystolic: z.number().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().min(30).max(150).optional(),
  temperature: z.number().min(34).max(42).optional(),
  respiratoryRate: z.number().min(8).max(60).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),

  // Pain Assessment
  painScore: z.number().min(0).max(10),
  painLocation: z.string().optional(),
  painCharacter: z.string().optional(),
  painManagementEffective: z.boolean().optional(),

  // Wound Assessment
  woundCondition: z.enum(['clean_dry', 'minimal_drainage', 'moderate_drainage', 'heavy_drainage', 'signs_of_infection']).optional(),
  dressingIntact: z.boolean().optional(),
  dressingChanged: z.boolean().optional(),
  dressingNotes: z.string().optional(),

  // Drains
  drainOneOutput: z.number().optional(),
  drainTwoOutput: z.number().optional(),
  drainColor: z.string().optional(),

  // Fluid Balance
  oralIntake: z.number().optional(),
  ivFluidIntake: z.number().optional(),
  urineOutput: z.number().optional(),

  // GI/GU
  bowelSoundsPresent: z.boolean().optional(),
  bowelMovement: z.boolean().optional(),
  flatusPresent: z.boolean().optional(),
  catheterInSitu: z.boolean().optional(),
  voidingNormally: z.boolean().optional(),

  // Mobility
  mobilityLevel: z.enum(['bedbound', 'sitting_up', 'chair_transfer', 'walking_with_assist', 'walking_independently']).optional(),
  mobilizedToday: z.boolean().optional(),
  physioReview: z.boolean().optional(),

  // Diet
  dietStatus: z.enum(['nil_by_mouth', 'sips_only', 'free_fluids', 'light_diet', 'regular_diet']).optional(),
  dietTolerated: z.boolean().optional(),
  nausea: z.boolean().optional(),
  vomiting: z.boolean().optional(),

  // Complications
  complicationPresent: z.boolean(),
  complicationType: z.string().optional(),
  complicationNotes: z.string().optional(),

  // General
  overallCondition: z.enum(['stable', 'improving', 'concerning', 'deteriorating']),
  nursingNotes: z.string().optional(),
  escalationRequired: z.boolean(),
  escalationDetails: z.string().optional(),
});

export type MonitoringFormData = z.infer<typeof monitoringSchema>;

export interface ObservationContext {
  id: string;
  vitalSignsId: string;
  patientId: string;
  surgeryId: string;
  carePlanId?: string;
  hospitalId?: string;
  surgeryDate: Date;
  now: Date;
  recordedBy: string;
  recordedByName: string;
}

export function shiftOf(d: Date): 'morning' | 'afternoon' | 'night' {
  const h = d.getHours();
  return h >= 6 && h < 14 ? 'morning' : h >= 14 && h < 22 ? 'afternoon' : 'night';
}

/** Drop undefined, NaN (empty number inputs) and blank strings. */
function cleanForm(data: MonitoringFormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' && Number.isNaN(v)) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}

export function hasVitals(data: MonitoringFormData): boolean {
  return [data.heartRate, data.bloodPressureSystolic, data.temperature, data.respiratoryRate, data.oxygenSaturation]
    .some(v => typeof v === 'number' && !Number.isNaN(v) && v > 0);
}

/** The full observation, every field the form collected. */
export function buildPostOpObservation(data: MonitoringFormData, ctx: ObservationContext): PostOpObservation {
  const hours = Math.max(0, Math.floor((ctx.now.getTime() - ctx.surgeryDate.getTime()) / 3_600_000));
  return {
    id: ctx.id,
    patientId: ctx.patientId,
    surgeryId: ctx.surgeryId,
    carePlanId: ctx.carePlanId,
    hospitalId: ctx.hospitalId,
    vitalSignsId: hasVitals(data) ? ctx.vitalSignsId : undefined,
    recordedAt: ctx.now,
    dayPostOp: Math.floor(hours / 24),
    hourPostOp: hours % 24,
    shift: shiftOf(ctx.now),
    observation: cleanForm(data),
    overallCondition: data.overallCondition,
    complicationPresent: data.complicationPresent,
    escalationRequired: data.escalationRequired,
    recordedBy: ctx.recordedBy,
    recordedByName: ctx.recordedByName,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}

/** The vitals row the post-op charts read, or null when no vital was entered. */
export function buildObservationVitals(data: MonitoringFormData, obs: PostOpObservation): VitalSigns | null {
  if (!hasVitals(data) || !obs.vitalSignsId) return null;
  const num = (v: number | undefined) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  const notes = [
    `Post-op Day ${obs.dayPostOp}.`,
    data.overallCondition !== 'stable' ? `Condition: ${data.overallCondition}.` : '',
    data.complicationPresent && data.complicationType ? `Complication: ${data.complicationType}.` : '',
    data.nursingNotes || '',
  ].filter(Boolean).join(' ');
  return {
    id: obs.vitalSignsId,
    patientId: obs.patientId,
    encounterId: obs.surgeryId,
    pulse: num(data.heartRate),
    bloodPressureSystolic: num(data.bloodPressureSystolic),
    bloodPressureDiastolic: num(data.bloodPressureDiastolic),
    temperature: num(data.temperature),
    respiratoryRate: num(data.respiratoryRate),
    oxygenSaturation: num(data.oxygenSaturation),
    painScore: data.painScore,
    recordedAt: obs.recordedAt,
    recordedBy: obs.recordedBy,
    notes,
  };
}

/** The care plan a new observation belongs to / the plan to edit: newest active one. */
export function latestActivePlan(plans: PostOpCarePlan[]): PostOpCarePlan | undefined {
  return plans
    .filter(p => p.status === 'active')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}
