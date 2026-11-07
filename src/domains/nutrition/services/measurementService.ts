/**
 * Anthropometry series (Dexie nutritionMeasurements / cloud
 * nutrition_measurements): validation, recording, and reading the series
 * back alongside the weights and heights that live on vital signs.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MEASUREMENT_UNITS, type MeasurementKind, type MeasurementMethod, type NutritionMeasurement,
} from '../types';
import type { WeightPoint } from '../engine/types';

const KINDS = Object.keys(MEASUREMENT_UNITS) as MeasurementKind[];
const METHODS: MeasurementMethod[] = ['measured', 'bed_scale', 'hoist', 'chair_scale', 'reported', 'estimated'];

/** Adult plausibility limits: a value outside them is refused, not stored. */
const PLAUSIBLE: Record<MeasurementKind, [number, number]> = {
  weight: [20, 350], height: [100, 230], muac: [10, 60], calf_circumference: [15, 70], knee_height: [35, 70],
  ulna_length: [18, 35], triceps_skinfold: [1, 70], subscapular_skinfold: [2, 80], grip_strength: [1, 100],
  waist_circumference: [40, 200],
};

export type MeasurementInput = Omit<NutritionMeasurement, 'id' | 'unit' | 'createdAt' | 'updatedAt'> & { id?: string; unit?: string };

export function validateMeasurement(m: Partial<MeasurementInput>): string[] {
  const p: string[] = [];
  if (!m.patientId) p.push('patientId is required');
  if (!m.kind || !KINDS.includes(m.kind)) p.push(`kind must be one of ${KINDS.join(', ')}`);
  if (!m.method || !METHODS.includes(m.method)) p.push(`method must be one of ${METHODS.join(', ')}`);
  if (!m.measuredAt || Number.isNaN(new Date(m.measuredAt).getTime())) p.push('measuredAt must be a date');
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) p.push('value must be a number');
  if (m.kind && KINDS.includes(m.kind)) {
    const unit = MEASUREMENT_UNITS[m.kind];
    if (m.unit && m.unit !== unit) p.push(`${m.kind} is recorded in ${unit}, not ${m.unit}`);
    const [lo, hi] = PLAUSIBLE[m.kind];
    if (typeof m.value === 'number' && (m.value < lo || m.value > hi)) p.push(`${m.kind} ${m.value} ${unit} is outside ${lo}–${hi} ${unit}`);
  }
  return p;
}

export function buildMeasurement(input: MeasurementInput, now = new Date()): NutritionMeasurement {
  const problems = validateMeasurement(input);
  if (problems.length) throw new Error(`Measurement not recorded: ${problems.join('; ')}`);
  const ts = now.toISOString();
  return {
    ...input,
    id: input.id ?? uuidv4(),
    measuredAt: new Date(input.measuredAt).toISOString(),
    unit: MEASUREMENT_UNITS[input.kind],
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function recordMeasurement(input: MeasurementInput): Promise<NutritionMeasurement> {
  const record = buildMeasurement(input);
  const { db } = await import('../../../database/db');
  await db.nutritionMeasurements.add(record);
  const { syncRecord } = await import('../../../services/cloudSyncService');
  await syncRecord('nutritionMeasurements', record as unknown as Record<string, unknown>);
  return record;
}

export async function measurementSeries(patientId: string, kind?: MeasurementKind): Promise<NutritionMeasurement[]> {
  const { db } = await import('../../../database/db');
  const rows = kind
    ? await db.nutritionMeasurements.where('[patientId+kind]').equals([patientId, kind]).toArray()
    : await db.nutritionMeasurements.where('patientId').equals(patientId).toArray();
  return rows.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function latestOf<T extends { measuredAt: string }>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
}

/** A vital-signs row as far as weight and height go. */
export interface VitalsLike { id?: string; weight?: number | null; height?: number | null; recordedAt: Date | string }

/**
 * Weight history from both sources (nutrition measurements and vital signs),
 * oldest first, one point per timestamp. Estimated weights are left out:
 * weight change must be calculated from weighed or reported values.
 */
export function weightHistory(measurements: NutritionMeasurement[], vitals: VitalsLike[]): WeightPoint[] {
  const pts = new Map<string, number>();
  for (const v of vitals) {
    if (typeof v.weight === 'number' && v.weight > 0) pts.set(new Date(v.recordedAt).toISOString(), v.weight);
  }
  for (const m of measurements) {
    if (m.kind === 'weight' && m.method !== 'estimated') pts.set(new Date(m.measuredAt).toISOString(), m.value);
  }
  return [...pts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([at, weightKg]) => ({ at, weightKg }));
}
