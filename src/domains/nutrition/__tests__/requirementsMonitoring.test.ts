/**
 * Unit tests: remaining energy/protein branches, refeeding risk edge cases,
 * missing-input behaviour, and monitoring alerts.
 */
import { describe, it, expect } from 'vitest';
import {
  estimateEnergy, indirectCalorimetry, icuEspen, obesityAspen, harrisBenedict, pennState, curreri, estimateProtein,
  assessRefeedingRisk, electrolyteMmolL,
  intakeBelowTargetAlert, circumferenceDeclineAlert, prealbuminCrpAlert, negativeNitrogenAlert, refeedingLabAlert,
  weightFasterThanPlannedAlert, monitoringSchedule,
} from '../engine';

const man = { ageYears: 40, sex: 'male' as const, weightKg: 70, heightCm: 175 };

describe('energy', () => {
  it('indirect calorimetry is preferred over every equation', () => {
    const e = estimateEnergy({ patient: man, context: { measuredEnergyKcal: 1900, burns: { tbsaPercent: 20, postBurnDay: 2 },
      temperatureC: 38, previousDayIntakeKcal: 1500 } });
    expect(e.filter(x => x.preferred).map(x => x.id)).toEqual(['indirect_calorimetry']);
    expect(e[0].value).toBe(1900);
  });

  it('ICU calorimetry: ≤ 70% early (1900 × 0.7 = 1330); 80–100% after day 3 (1520–1900)', () => {
    expect(indirectCalorimetry({ measuredEnergyKcal: 1900, setting: 'icu', icuDay: 2 }).value).toBe(1330);
    expect(indirectCalorimetry({ measuredEnergyKcal: 1900, setting: 'icu', icuDay: 5 }).value).toEqual({ low: 1520, high: 1900 });
  });

  it('ESPEN ICU: 20–25 kcal/kg early (1400–1750), 25–30 later (1750–2100)', () => {
    expect(icuEspen(man, { setting: 'icu', icuDay: 1 }).value).toEqual({ low: 1400, high: 1750 });
    expect(icuEspen(man, { setting: 'icu', icuDay: 6 }).value).toEqual({ low: 1750, high: 2100 });
    expect(icuEspen(man, { setting: 'icu' }).warnings.join(' ')).toMatch(/ICU day not given/);
  });

  it('ASPEN super-obese (BMI > 50): 22–25 kcal/kg IBW', () => {
    // 170 cm man, 150 kg → BMI 51.9; IBW 65.9 → 22 × 65.9 = 1449.8 → 1450; 25 × 65.9 = 1647.5 → 1648
    expect(obesityAspen({ ageYears: 40, sex: 'male', weightKg: 150, heightCm: 170 }).value).toEqual({ low: 1450, high: 1648 });
  });

  it('Harris-Benedict with stress factor: BEE 1667.28 (35 y) × 1.2 (bed) × 1.6 (sepsis) = 3201.2 → 3201', () => {
    const e = harrisBenedict({ ...man, ageYears: 35 }, { activity: 'bed_bound', stress: 'major_sepsis' });
    expect(e.value).toBe(3201);
    expect(e.warnings).toEqual([]);
  });

  it('unknown factor key is reported', () => {
    expect(harrisBenedict(man, { activity: 'marathon' }).missing).toEqual(['activity factor "marathon" (not in config)']);
  });

  it('Penn State is not applicable unless ventilated, and names missing VE/Tmax', () => {
    expect(pennState(man, {})[0].status).toBe('not_applicable');
    expect(pennState(man, { ventilated: true })[0].missing).toEqual(['minuteVentilationLMin', 'tmaxC']);
  });

  it('Curreri missing TBSA → not computable', () => {
    expect(curreri(man, {}).missing).toEqual(['burns.tbsaPercent']);
  });

  it('every estimate carries the transparency fields', () => {
    for (const e of estimateEnergy({ patient: man, context: { setting: 'icu', ventilated: true, minuteVentilationLMin: 8, tmaxC: 37.5 } })) {
      expect(e).toEqual(expect.objectContaining({ unit: expect.any(String), method: expect.any(String), formula: expect.any(String),
        configVersion: '1.0.0', sources: expect.any(Array), assumptions: expect.any(Array), warnings: expect.any(Array) }));
      expect(e.sources.length).toBeGreaterThan(0);
    }
  });

  it('missing everything: each method says what it needs', () => {
    const e = estimateEnergy({ patient: {} });
    expect(e.every(x => x.value === null && x.missing.length > 0)).toBe(true);
  });
});

describe('protein', () => {
  it('ward 1.0–1.5 g/kg: 70 kg → 70–105 g', () => {
    expect(estimateProtein({ patient: man, context: { setting: 'ward' } })[0].value).toEqual({ low: 70, high: 105 });
  });

  it('ICU ≥ 1.3 g/kg: 70 kg → ≥ 91 g, a minimum', () => {
    const [p] = estimateProtein({ patient: man, context: { setting: 'icu' } });
    expect(p.value).toBe(91);
    expect(p.assumptions.join(' ')).toMatch(/Minimum/);
  });

  it('CKD not on dialysis, not catabolic: 0.55–0.6 g/kg (non-diabetic) → 38.5–42 → 39–42 g, physician to confirm', () => {
    const [p] = estimateProtein({ patient: man, context: { ckdNonDialysis: true } });
    expect(p.id).toBe('ckd_non_dialysis');
    expect(p.value).toEqual({ low: 39, high: 42 });
    expect(p.warnings[0]).toMatch(/physician to confirm/);
  });

  it('CKD with diabetes: 0.6–0.8 g/kg → 42–56 g', () => {
    expect(estimateProtein({ patient: man, context: { ckdNonDialysis: true, diabetes: true } })[0].value).toEqual({ low: 42, high: 56 });
  });

  it('CKD while catabolic: protein NOT reduced, flagged', () => {
    const [p] = estimateProtein({ patient: man, context: { ckdNonDialysis: true, sepsis: true } });
    expect(p.id).toBe('ward');
    expect(p.warnings.join(' ')).toMatch(/NOT reduced/);
  });

  it('weight missing → not computable; height missing → obesity cannot be excluded', () => {
    expect(estimateProtein({ patient: { ageYears: 40, sex: 'male' } })[0].missing).toEqual(['weightKg']);
    expect(estimateProtein({ patient: { ageYears: 40, sex: 'male', weightKg: 70 } })[0].warnings.join(' ')).toMatch(/obesity cannot be excluded/);
  });
});

describe('refeeding risk', () => {
  const labs = { potassium: 4.0, phosphate: 1.0, magnesium: 0.85 };

  it('two minor criteria → high (BMI 18 and intake 7 days)', () => {
    const r = assessRefeedingRisk({ bmi: 18, weightLossPercent3to6m: 2, littleOrNoIntakeDays: 7, labs, alcoholOrDrugHistory: false });
    expect(r.value?.level).toBe('high');
    expect(r.value?.minorCriteria.length).toBe(2);
  });

  it('one minor criterion, all assessed → not high; > 5 days little intake → 50% for 2 days rule', () => {
    const r = assessRefeedingRisk({ bmi: 22, weightLossPercent3to6m: 0, littleOrNoIntakeDays: 7, labs, alcoholOrDrugHistory: false });
    expect(r.value?.level).toBe('not_high');
    expect(r.value?.limitedIntakeRule).toBe(true);
    expect(r.warnings.join(' ')).toMatch(/no more than 50%/);
  });

  it('missing pre-feeding labs: high risk cannot be excluded (indeterminate), never "normal"', () => {
    const r = assessRefeedingRisk({ bmi: 22, weightLossPercent3to6m: 0, littleOrNoIntakeDays: 0, alcoholOrDrugHistory: false });
    expect(r.value?.level).toBe('indeterminate');
    expect(r.missing).toEqual(['potassium (pre-feeding)', 'phosphate (pre-feeding)', 'magnesium (pre-feeding)']);
  });

  it('electrolyte units: phosphate 2.0 mg/dL → 0.65 mmol/L; K mEq/L = mmol/L; unknown unit → not measured', () => {
    expect(electrolyteMmolL('phosphate', 2.0, 'mg/dL')).toBeCloseTo(0.646, 3);
    expect(electrolyteMmolL('potassium', 3.2, 'mEq/L')).toBe(3.2);
    expect(electrolyteMmolL('potassium', 3.2, 'mg/dL')).toBeNull();
    expect(electrolyteMmolL('magnesium', 1.5, 'bananas')).toBeNull();
  });
});

describe('monitoring alerts', () => {
  it('intake < 60% of target for 3 consecutive days', () => {
    const days = [
      { at: '2026-11-01', intakeKcal: 1500, targetKcal: 2000 },
      { at: '2026-11-02', intakeKcal: 1000, targetKcal: 2000 },
      { at: '2026-11-03', intakeKcal: 900, targetKcal: 2000 },
      { at: '2026-11-04', intakeKcal: 1100, targetKcal: 2000 },
    ];
    const r = intakeBelowTargetAlert(days);
    expect(r.alerts.length).toBe(1);
    expect(r.alerts[0].at).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  });

  it('a missing day breaks the run and is reported as a gap', () => {
    const r = intakeBelowTargetAlert([
      { at: '2026-11-01', intakeKcal: 500, targetKcal: 2000 },
      { at: '2026-11-02', intakeKcal: 500, targetKcal: 2000 },
      { at: '2026-11-04', intakeKcal: 500, targetKcal: 2000 },
    ]);
    expect(r.alerts).toEqual([]);
    expect(r.gaps).toEqual(['No intake recorded on 2026-11-03']);
  });

  it('MUAC down ≥ 5% from baseline: 24 → 22.6 = −5.8%', () => {
    const r = circumferenceDeclineAlert([{ at: '2026-10-01', value: 24 }, { at: '2026-10-15', value: 23.5 }, { at: '2026-11-01', value: 22.6 }], 'MUAC');
    expect(r.alerts[0].message).toMatch(/down 5.8%/);
    expect(circumferenceDeclineAlert([{ at: '2026-10-01', value: 24 }, { at: '2026-11-01', value: 23 }], 'calf circumference').alerts).toEqual([]);
  });

  it('prealbumin falling while CRP falling or stable → alert; CRP rising → no alert', () => {
    const pa = [{ at: '2026-10-01', value: 200 }, { at: '2026-10-08', value: 150 }];
    expect(prealbuminCrpAlert(pa, [{ at: '2026-10-01', value: 40 }, { at: '2026-10-08', value: 20 }]).alerts.length).toBe(1);
    expect(prealbuminCrpAlert(pa, [{ at: '2026-10-01', value: 40 }, { at: '2026-10-08', value: 41 }]).alerts.length).toBe(1);
    expect(prealbuminCrpAlert(pa, [{ at: '2026-10-01', value: 40 }, { at: '2026-10-08', value: 120 }]).alerts).toEqual([]);
    expect(prealbuminCrpAlert(pa, []).gaps).toEqual(['CRP: need at least 2 readings']);
  });

  it('negative nitrogen balance on 2 consecutive measurements', () => {
    expect(negativeNitrogenAlert([{ at: '2026-11-01', value: -2 }, { at: '2026-11-03', value: 1 }, { at: '2026-11-05', value: -1 }]).alerts).toEqual([]);
    expect(negativeNitrogenAlert([{ at: '2026-11-01', value: 1 }, { at: '2026-11-03', value: -1.5 }, { at: '2026-11-05', value: -0.4 }]).alerts.length).toBe(1);
  });

  it('refeeding labs: low is urgent, missing is itself an alert', () => {
    const r = refeedingLabAlert({ at: '2026-11-02', potassium: 3.1, phosphate: 0.5 });
    expect(r.alerts.map(a => [a.kind, a.severity])).toEqual([
      ['refeeding_lab_low', 'urgent'], ['refeeding_lab_low', 'urgent'], ['refeeding_lab_missing', 'warning'],
    ]);
  });

  it('weight falling faster than planned (−0.5 kg/week planned, −1.0 observed)', () => {
    const series = [{ at: '2026-10-04', weightKg: 90 }, { at: '2026-11-01', weightKg: 86 }]; // 4 kg in 4 weeks
    expect(weightFasterThanPlannedAlert(series, -0.5).alerts.length).toBe(1);
    expect(weightFasterThanPlannedAlert(series, -0.9).alerts).toEqual([]); // within 25% tolerance
  });

  it('schedule by risk level; refeeding adds lab checks to the high-risk schedule', () => {
    expect(monitoringSchedule('low').items.length).toBe(2);
    const rf = monitoringSchedule('refeeding_high');
    expect(rf.items.some(i => /phosphate/.test(i.item))).toBe(true);
    expect(rf.items.length).toBe(monitoringSchedule('high').items.length + 4);
  });
});
