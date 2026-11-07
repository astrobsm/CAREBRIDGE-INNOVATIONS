/**
 * assessmentService: engine inputs from patient data, with their sources,
 * and the traceable stored assessment.
 */
import { describe, it, expect } from 'vitest';
import { buildAssessmentInput, buildAssessmentRecord, ageOn, type AssessmentData } from '../services/assessmentService';
import { buildMeasurement, validateMeasurement, weightHistory } from '../services/measurementService';
import { ACTIVE_NUTRITION_CONFIG } from '../engine/config';

const NOW = new Date('2026-11-07T10:00:00Z');
const m = (kind: Parameters<typeof buildMeasurement>[0]['kind'], value: number, measuredAt: string, method: Parameters<typeof buildMeasurement>[0]['method'] = 'measured') =>
  buildMeasurement({ patientId: 'p1', kind, value, measuredAt, method }, NOW);

const data = (): AssessmentData => ({
  patient: { id: 'p1', dateOfBirth: '1970-05-01', gender: 'female', registeredHospitalId: 'h1' },
  vitals: [
    { id: 'v1', weight: 64, height: 162, recordedAt: '2026-07-01T08:00:00Z' },
    { id: 'v2', weight: 60, recordedAt: '2026-10-01T08:00:00Z' },
  ],
  measurements: [m('weight', 55, '2026-11-06T08:00:00Z', 'bed_scale'), m('muac', 22.5, '2026-11-06T08:00:00Z')],
  labs: [{ key: 'k', value: 3.1, unit: 'mmol/L' }, { key: 'phosphate', value: 0.6, unit: 'mmol/L' }, { key: 'albumin', value: 28, unit: 'g/L' }],
});

describe('measurements', () => {
  it('validates kind, method, unit and adult plausibility', () => {
    expect(validateMeasurement({ patientId: 'p', kind: 'weight', value: 70, measuredAt: '2026-11-01', method: 'hoist' })).toEqual([]);
    expect(validateMeasurement({ patientId: 'p', kind: 'weight', value: 700, measuredAt: '2026-11-01', method: 'hoist' })[0]).toMatch(/outside/);
    expect(validateMeasurement({ patientId: 'p', kind: 'weight', value: 70, unit: 'lb', measuredAt: '2026-11-01', method: 'measured' })[0]).toMatch(/kg, not lb/);
    expect(validateMeasurement({ patientId: 'p', kind: 'weight', value: 70, measuredAt: 'x', method: 'guess' as never }).length).toBe(2);
    expect(() => buildMeasurement({ patientId: 'p', kind: 'height', value: 9, measuredAt: '2026-11-01', method: 'measured' })).toThrow(/not recorded/);
    expect(m('weight', 55, '2026-11-06').unit).toBe('kg');
  });

  it('weight history merges vitals and measurements and leaves out estimated weights', () => {
    const h = weightHistory([m('weight', 55, '2026-11-06T08:00:00Z'), m('weight', 50, '2026-11-07T08:00:00Z', 'estimated')],
      [{ weight: 64, recordedAt: '2026-07-01T08:00:00Z' }]);
    expect(h).toEqual([{ at: '2026-07-01T08:00:00.000Z', weightKg: 64 }, { at: '2026-11-06T08:00:00.000Z', weightKg: 55 }]);
  });
});

describe('assessment inputs from patient data', () => {
  it('takes the latest weight and height from either source, age/sex from the record, labs unit-converted', () => {
    const { input, sources } = buildAssessmentInput(data(), {}, NOW);
    expect(ageOn('1970-05-01', NOW)).toBe(56);
    expect(input.patient).toMatchObject({ ageYears: 56, sex: 'female', weightKg: 55, weightSource: 'measured', heightCm: 162 });
    expect(input.anthropometry?.muacCm).toBe(22.5);
    expect(input.refeeding?.labs).toMatchObject({ potassium: 3.1, phosphate: 0.6, magnesium: null });
    expect(input.weightHistory?.map(p => p.weightKg)).toEqual([64, 60, 55]);
    const w = sources.find(s => s.field === 'weightKg')!;
    expect(w).toMatchObject({ source: 'nutrition_measurement', value: 55, note: 'method: bed_scale' });
    expect(sources.find(s => s.field === 'heightCm')).toMatchObject({ source: 'vital_signs', recordId: 'v1' });
    expect(sources.find(s => s.field === 'refeeding.labs.potassium')).toMatchObject({ source: 'lab', unit: 'mmol/L' });
  });

  it('a reported weight is labelled reported; clinician entries are listed as such', () => {
    const d = data();
    d.measurements = [m('weight', 58, '2026-11-06T08:00:00Z', 'reported')];
    const { input, sources } = buildAssessmentInput(d, { patient: { pregnant: false } }, NOW);
    expect(input.patient.weightSource).toBe('reported');
    expect(sources).toContainEqual({ field: 'pregnant', value: false, source: 'clinician_entry' });
  });

  it('stores the full engine output with method, inputs and config version', () => {
    const rec = buildAssessmentRecord(data(), { must: { acuteDiseaseEffect: false } }, { assessedBy: 'u1' }, NOW);
    expect(rec.engine?.method).toBe('assessNutrition');
    expect(rec.engine?.configVersion).toBe(ACTIVE_NUTRITION_CONFIG.version);
    expect(rec.configVersion).toBe(ACTIVE_NUTRITION_CONFIG.version);
    expect(rec.engine?.inputSources.length).toBeGreaterThan(5);
    expect(rec.engine?.result.status).not.toBe('refer');
    expect(rec.hospitalId).toBe('h1');
    expect(rec.weight).toBe(55);
    expect(rec.bmi).toBeCloseTo(55 / 1.62 ** 2, 1);
    expect(rec.albumin).toBe(28);
    expect(Number.isInteger(rec.mustScore)).toBe(true); // cloud column INTEGER
    expect(rec.mustBreakdown?.totalScore).toBe(rec.mustScore);
    expect(JSON.parse(JSON.stringify(rec)).engine.result.energy.length).toBeGreaterThan(0); // serialisable for JSONB
  });

  it('an incomplete MUST is not stored as the integer score', () => {
    const rec = buildAssessmentRecord(data(), {}, { assessedBy: 'u1' }, NOW); // acute disease effect not assessed
    expect(rec.mustScore).toBeUndefined();
    expect(rec.engine?.result.status === 'refer' ? null : rec.engine?.result.screening.must.value?.complete).toBe(false);
  });

  it('a patient outside the adult engine is referred, and says why', () => {
    const d = data();
    d.patient.dateOfBirth = '2015-01-01';
    const rec = buildAssessmentRecord(d, {}, { assessedBy: 'u1' }, NOW);
    expect(rec.engine?.result.status).toBe('refer');
    expect(rec.notes).toBeTruthy();
    expect(rec.mustScore).toBeUndefined();
  });
});
