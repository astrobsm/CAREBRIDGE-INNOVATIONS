/**
 * Run the stage 1 engine on a patient's own data and save a traceable
 * assessment.
 *
 * Where each input comes from:
 *   - weight / height: the latest of nutritionMeasurements and vitalSigns
 *     (the vital-signs pattern of calculators/components/ClinicalCalcCard);
 *     knee height, ulna, MUAC, calf, skinfolds, grip: nutritionMeasurements;
 *   - labs: clinician-assistant patientBridge, whose analyteMapping matches
 *     test names with the engine's synonym dictionary and converts units to
 *     canonical (albumin g/L; K, phosphate, Mg mmol/L);
 *   - age and sex: the patient record (DOB, gender).
 * Every value used is listed in `engine.inputSources` with its record id and
 * time, and the full engine output is stored on the assessment.
 */

import { v4 as uuidv4 } from 'uuid';
import { assessNutrition, type NutritionAssessmentInput } from '../engine/assess';
import { ACTIVE_NUTRITION_CONFIG } from '../engine/config';
import type { ClinicalContext, NutritionPatient, WeightSource } from '../engine/types';
import type { AssessmentInputSource, MUSTScore, NutritionAssessmentRecord, NutritionMeasurement, MeasurementKind } from '../types';
import { latestOf, weightHistory, type VitalsLike } from './measurementService';

export interface PatientLike { id: string; dateOfBirth?: Date | string | null; gender?: string | null; hospitalId?: string; registeredHospitalId?: string }
/** A lab value already unit-converted to the engine's canonical unit. */
export interface LabValue { key: string; value: number; unit: string; recordedAt?: string }

export interface AssessmentData {
  patient: PatientLike;
  vitals: VitalsLike[];
  measurements: NutritionMeasurement[];
  labs: LabValue[];
}

export interface AssessmentExtras extends Omit<Partial<NutritionAssessmentInput>, 'patient'> {
  patient?: Partial<NutritionPatient>;
  context?: ClinicalContext;
}

export function ageOn(dob: Date | string | null | undefined, on: Date): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = on.getFullYear() - d.getFullYear();
  const m = on.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

function sexOf(g: unknown): 'male' | 'female' | null {
  const s = String(g ?? '').toLowerCase();
  return s.startsWith('m') ? 'male' : s.startsWith('f') ? 'female' : null;
}

const methodToSource = (m: NutritionMeasurement['method']): WeightSource =>
  m === 'reported' ? 'reported' : m === 'estimated' ? 'estimated' : 'measured';

/**
 * Pure: assemble the engine input from patient data, with the source of
 * every value. Clinician-entered extras override and are listed as such.
 */
export function buildAssessmentInput(data: AssessmentData, extras: AssessmentExtras = {}, now = new Date()): {
  input: NutritionAssessmentInput; sources: AssessmentInputSource[];
} {
  const sources: AssessmentInputSource[] = [];
  const at = (d: Date | string) => new Date(d).toISOString();

  const ageYears = ageOn(data.patient.dateOfBirth, now);
  const sex = sexOf(data.patient.gender);
  sources.push({ field: 'ageYears', value: ageYears, unit: 'years', source: 'patient_record', recordId: data.patient.id, note: 'from date of birth' });
  sources.push({ field: 'sex', value: sex, source: 'patient_record', recordId: data.patient.id });

  // Latest weight / height across nutrition measurements and vital signs.
  const pick = (kind: 'weight' | 'height') => {
    const m = latestOf(data.measurements.filter(x => x.kind === kind));
    const v = [...data.vitals].filter(x => typeof x[kind] === 'number' && (x[kind] as number) > 0)
      .sort((a, b) => at(b.recordedAt).localeCompare(at(a.recordedAt)))[0];
    if (m && (!v || m.measuredAt >= at(v.recordedAt))) {
      return { value: m.value, source: 'nutrition_measurement' as const, id: m.id, when: m.measuredAt, how: methodToSource(m.method), note: `method: ${m.method}` };
    }
    if (v) return { value: v[kind] as number, source: 'vital_signs' as const, id: v.id, when: at(v.recordedAt), how: 'measured' as WeightSource, note: undefined };
    return null;
  };
  const w = pick('weight');
  const h = pick('height');
  if (w) sources.push({ field: 'weightKg', value: w.value, unit: 'kg', source: w.source, recordId: w.id, recordedAt: w.when, note: w.note });
  if (h) sources.push({ field: 'heightCm', value: h.value, unit: 'cm', source: h.source, recordId: h.id, recordedAt: h.when, note: h.note });

  const anth = (kind: MeasurementKind, field: string) => {
    const m = latestOf(data.measurements.filter(x => x.kind === kind));
    if (!m) return null;
    sources.push({ field, value: m.value, unit: m.unit, source: 'nutrition_measurement', recordId: m.id, recordedAt: m.measuredAt, note: `method: ${m.method}` });
    return m.value;
  };

  const lab = (key: string, field: string) => {
    const l = data.labs.filter(x => x.key === key).sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''))[0];
    if (!l) return null;
    sources.push({ field, value: l.value, unit: l.unit, source: 'lab', recordedAt: l.recordedAt, note: 'unit-converted by clinician-assistant analyteMapping' });
    return l.value;
  };

  const patient: NutritionPatient = {
    ageYears, sex,
    weightKg: w?.value ?? null, weightSource: w?.how,
    heightCm: h?.value ?? null, heightSource: h ? (h.how === 'estimated' ? 'estimated' : h.how) : undefined,
    ...extras.patient,
  };
  for (const [k, v] of Object.entries(extras.patient ?? {})) {
    sources.push({ field: k, value: v as AssessmentInputSource['value'], source: 'clinician_entry' });
  }

  const potassium = lab('k', 'refeeding.labs.potassium');
  const phosphate = lab('phosphate', 'refeeding.labs.phosphate');
  const magnesium = lab('magnesium', 'refeeding.labs.magnesium');
  lab('albumin', 'albumin'); // recorded for the assessment row; the engine does not use albumin for screening

  const input: NutritionAssessmentInput = {
    ...extras,
    patient,
    context: extras.context,
    anthropometry: {
      kneeHeightCm: anth('knee_height', 'anthropometry.kneeHeightCm'),
      ulnaLengthCm: anth('ulna_length', 'anthropometry.ulnaLengthCm'),
      muacCm: anth('muac', 'anthropometry.muacCm'),
      calfCm: anth('calf_circumference', 'anthropometry.calfCm'),
      tsfMm: anth('triceps_skinfold', 'anthropometry.tsfMm'),
      subscapularSkinfoldMm: anth('subscapular_skinfold', 'anthropometry.subscapularSkinfoldMm'),
      gripKg: anth('grip_strength', 'anthropometry.gripKg'),
      ...extras.anthropometry,
    },
    weightHistory: extras.weightHistory ?? weightHistory(data.measurements, data.vitals),
    refeeding: {
      ...extras.refeeding,
      labs: extras.refeeding?.labs ?? { potassium, phosphate, magnesium, units: { potassium: 'mmol/L', phosphate: 'mmol/L', magnesium: 'mmol/L' } },
    },
  };
  return { input, sources };
}

/** Pure: run the engine and shape the stored, traceable assessment. */
export function buildAssessmentRecord(data: AssessmentData, extras: AssessmentExtras, meta: { assessedBy: string; hospitalId?: string; encounterId?: string; admissionId?: string },
  now = new Date()): NutritionAssessmentRecord {
  const { input, sources } = buildAssessmentInput(data, extras, now);
  const result = assessNutrition(input);
  const ts = now.toISOString();
  const record: NutritionAssessmentRecord = {
    id: uuidv4(),
    patientId: data.patient.id,
    hospitalId: meta.hospitalId ?? data.patient.registeredHospitalId ?? data.patient.hospitalId,
    encounterId: meta.encounterId,
    admissionId: meta.admissionId,
    assessedBy: meta.assessedBy,
    assessedAt: ts,
    createdAt: ts,
    updatedAt: ts,
    engine: {
      method: 'assessNutrition',
      configVersion: result.configVersion,
      validationStatus: result.status === 'refer' ? ACTIVE_NUTRITION_CONFIG.validationStatus : result.validationStatus,
      input, inputSources: sources, result, ranAt: ts,
    },
    engineMethod: 'assessNutrition',
    configVersion: result.configVersion,
    validationStatus: result.status === 'refer' ? ACTIVE_NUTRITION_CONFIG.validationStatus : result.validationStatus,
  };
  const albumin = data.labs.find(l => l.key === 'albumin');
  if (albumin) record.albumin = albumin.value;
  if (result.status === 'refer') {
    record.notes = result.population.reason;
    return record;
  }
  if (result.weight.value !== null) record.weight = result.weight.value;
  if (result.height.value !== null) record.height = result.height.value;
  if (result.bmi.value !== null) record.bmi = Math.round(result.bmi.value * 10) / 10;
  if (result.ibw.value !== null) record.idealBodyWeight = result.ibw.value;
  if (result.adjustedBodyWeight.value !== null && result.adjustedBodyWeight.indicated) record.adjustedBodyWeight = result.adjustedBodyWeight.value;
  const must = result.screening.must.value;
  // Only a complete MUST is stored as the integer score; a partial one is a minimum and stays in engine output.
  if (must && must.complete) {
    record.mustScore = must.total;
    const c = must.components;
    if (c.bmi_score !== null && c.weight_loss_score !== null && c.acute_disease_score !== null) {
      record.mustBreakdown = {
        bmiScore: c.bmi_score, weightLossScore: c.weight_loss_score, acuteIllnessScore: c.acute_disease_score,
        totalScore: must.total, riskLevel: must.risk.riskLevel as MUSTScore['riskLevel'],
      };
    }
  }
  if (result.muacBmiBand.value) record.midArmCircumference = input.anthropometry?.muacCm ?? undefined;
  if (input.anthropometry?.tsfMm) record.tricepsSkinfold = input.anthropometry.tsfMm;
  if (input.anthropometry?.gripKg) record.handGripStrength = input.anthropometry.gripKg;
  return record;
}

/** Read everything for one patient from the local database (works offline). */
export async function loadAssessmentData(patientId: string): Promise<AssessmentData & { unmappedLabs: number }> {
  const { db } = await import('../../../database/db');
  const { buildFromPatientRecord } = await import('../../clinician-assistant/services/patientBridge');
  const [patient, vitals, measurements, bridge] = await Promise.all([
    db.patients.get(patientId),
    db.vitalSigns.where('patientId').equals(patientId).toArray(),
    db.nutritionMeasurements.where('patientId').equals(patientId).toArray(),
    buildFromPatientRecord(patientId),
  ]);
  if (!patient) throw new Error(`Patient ${patientId} not found on this device`);
  const labs: LabValue[] = bridge.extraction.analytes.map(a => ({ key: a.key, value: a.value, unit: a.unit }));
  return {
    patient: { id: patient.id, dateOfBirth: patient.dateOfBirth, gender: patient.gender, registeredHospitalId: (patient as { registeredHospitalId?: string }).registeredHospitalId },
    vitals: vitals as unknown as VitalsLike[], measurements, labs, unmappedLabs: bridge.unmapped.length,
  };
}

/** Run the engine on the patient's data and save the assessment. */
export async function runAndSaveAssessment(patientId: string, extras: AssessmentExtras,
  meta: { assessedBy: string; hospitalId?: string; encounterId?: string; admissionId?: string }): Promise<NutritionAssessmentRecord> {
  const data = await loadAssessmentData(patientId);
  const record = buildAssessmentRecord(data, extras, meta);
  const { db } = await import('../../../database/db');
  await db.nutritionAssessments.add(record);
  const { syncRecord } = await import('../../../services/cloudSyncService');
  await syncRecord('nutritionAssessments', record as unknown as Record<string, unknown>);
  return record;
}
