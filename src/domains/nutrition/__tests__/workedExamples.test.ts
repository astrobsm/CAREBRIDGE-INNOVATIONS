/**
 * Worked clinical examples. Every expected number is hand-calculated in the
 * comments so a clinician can check the arithmetic without the code.
 */
import { describe, it, expect } from 'vitest';
import {
  assessNutrition, estimateEnergy, estimateProtein, assessRefeedingRisk, refeedingSchedule, planWeightGoal,
  screenMust, harrisBenedict, mifflinStJeor, type EnergyEstimate,
} from '../engine';

const byId = (xs: EnergyEstimate[], id: EnergyEstimate['id']) => xs.find(x => x.id === id)!;

// ─────────────────────────────────────────────────────────────────────────
describe('Worked example 1: obese ICU patient (ventilated)', () => {
  // Man, 55 y, 170 cm, 120 kg, ventilated, ICU day 2, VE 10 L/min, Tmax 38.0 °C.
  //   BMI   = 120 ÷ 1.70² = 120 ÷ 2.89 = 41.5
  //   IBW   = 50 + 2.3 × (170 ÷ 2.54 − 60) = 50 + 2.3 × 6.93 = 65.9 kg
  const patient = { ageYears: 55, sex: 'male' as const, weightKg: 120, heightCm: 170 };
  const context = { setting: 'icu' as const, ventilated: true, icuDay: 2, minuteVentilationLMin: 10, tmaxC: 38 };
  const energy = estimateEnergy({ patient, context });

  it('Mifflin = 10×120 + 6.25×170 − 5×55 + 5 = 1200 + 1062.5 − 275 + 5 = 1992.5 → 1993', () => {
    expect(byId(energy, 'mifflin_st_jeor').value).toBe(1993);
  });

  it('Penn State 2003b = 0.96×1992.5 + 31×10 + 167×38 − 6212 = 1912.8 + 310 + 6346 − 6212 = 2356.8 → 2357, preferred', () => {
    const ps = byId(energy, 'penn_state_2003b');
    expect(ps.value).toBe(2357);
    expect(ps.preferred).toBe(true);
    // Age 55 < 60: the 2010 version does not apply
    expect(energy.find(e => e.id === 'penn_state_2010')).toBeUndefined();
  });

  it('ASPEN obesity (BMI 30–50) = 11–14 kcal/kg × 120 kg actual = 1320–1680', () => {
    expect(byId(energy, 'obesity_aspen').value).toEqual({ low: 1320, high: 1680 });
  });

  it('ESPEN 20–25 kcal/kg is withheld for BMI ≥ 30 (ASPEN obesity rule applies)', () => {
    expect(energy.find(e => e.id === 'icu_espen')).toBeUndefined();
  });

  it('Harris-Benedict (revised) BEE = 88.362 + 1607.64 + 815.83 − 312.235 = 2199.6 → 2200, factors not applied', () => {
    const hb = byId(energy, 'harris_benedict');
    expect(hb.value).toBe(2200);
    expect(hb.warnings.join(' ')).toMatch(/No activity or stress factor selected/);
  });

  it('Protein BMI ≥ 40: 2.5 g/kg IBW = 2.5 × 65.9 = 164.75 → ≥ 165 g/day', () => {
    const [p] = estimateProtein({ patient, context });
    expect(p.id).toBe('obese_icu');
    expect(p.value).toBe(165);
    expect(p.weightBasis).toBe('ideal');
  });

  it('BMI 35 instead: 2.0 g/kg IBW → 2.0 × 65.9 = 131.8 → 132', () => {
    // 101 kg / 2.89 = 34.9
    const [p] = estimateProtein({ patient: { ...patient, weightKg: 101 }, context });
    expect(p.value).toBe(132);
  });

  it('Age 65 (BMI 41.5): Penn State 2010 applies and is preferred over 2003b', () => {
    // Mifflin at 65 y = 1200 + 1062.5 − 325 + 5 = 1942.5
    // 2010  = 0.71×1942.5 + 64×10 + 85×38 − 3085 = 1379.175 + 640 + 3230 − 3085 = 2164.2 → 2164
    // 2003b = 0.96×1942.5 + 310 + 6346 − 6212 = 1864.8 + 444 = 2308.8 → 2309
    const e = estimateEnergy({ patient: { ...patient, ageYears: 65 }, context });
    expect(byId(e, 'penn_state_2010').value).toBe(2164);
    expect(byId(e, 'penn_state_2010').preferred).toBe(true);
    expect(byId(e, 'penn_state_2003b').value).toBe(2309);
    expect(byId(e, 'penn_state_2003b').preferred).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Worked example 2: cachectic patient at high refeeding risk', () => {
  // Woman, 40 y, 160 cm, 38 kg → BMI 38 ÷ 2.56 = 14.8. Lost 18% in 4 months,
  // little intake for 12 days, K 3.2 mmol/L (low), PO4 0.9, Mg 0.75.
  const risk = assessRefeedingRisk({ bmi: 14.8, weightLossPercent3to6m: 18, littleOrNoIntakeDays: 12,
    labs: { potassium: 3.2, phosphate: 0.9, magnesium: 0.75 }, alcoholOrDrugHistory: false });

  it('high risk on NICE major criteria (BMI < 16, loss > 15%, intake > 10 days, low K); not extreme (BMI ≥ 14, intake ≤ 15 d)', () => {
    expect(risk.value?.level).toBe('high');
    expect(risk.value?.majorCriteria.length).toBe(4);
    expect(risk.value?.lowElectrolytes).toEqual(['potassium']);
    expect(risk.value?.startKcalPerKg).toBe(10);
  });

  it('MUST: BMI 14.8 (2) + loss 18% (2) + no acute effect (0) = 4', () => {
    expect(screenMust({ bmi: 14.8, weightLossPercent3to6m: 18, acuteDiseaseEffect: false }).value?.total).toBe(4);
  });

  it('stepped schedule over 7 days from 10 kcal/kg (380 kcal) to 1330 kcal (35 kcal/kg)', () => {
    // step = (1330 − 380) ÷ 6 = 158.33 kcal/day
    // day:  1    2       3       4     5        6        7
    // kcal: 380  538.3   696.7   855   1013.3   1171.7   1330
    const s = refeedingSchedule({ weightKg: 38, targetKcal: 1330, level: 'high' });
    expect(s.value!.map(d => d.kcal)).toEqual([380, 538, 697, 855, 1013, 1172, 1330]);
    expect(s.value!.map(d => d.kcalPerKg)).toEqual([10, 14.2, 18.3, 22.5, 26.7, 30.8, 35]);
    expect(s.alerts.join(' ')).toMatch(/BEFORE feeding/);
    expect(s.alerts.join(' ')).toMatch(/DAILY for days 1–3/);
    expect(s.alerts.join(' ')).toMatch(/per local protocol/);
  });

  it('extreme case (35 kg, BMI 13.7): 5 kcal/kg = 175 kcal, to 1050 kcal over 5 days', () => {
    // step = (1050 − 175) ÷ 4 = 218.75 → 175, 393.75, 612.5, 831.25, 1050
    const r = assessRefeedingRisk({ bmi: 13.7, weightLossPercent3to6m: 20, littleOrNoIntakeDays: 12,
      labs: { potassium: 3.6, phosphate: 0.9, magnesium: 0.8 }, alcoholOrDrugHistory: false });
    expect(r.value?.level).toBe('extreme');
    expect(r.value?.startKcalPerKg).toBe(5);
    const s = refeedingSchedule({ weightKg: 35, targetKcal: 1050, level: 'extreme', advanceDays: 5 });
    expect(s.value!.map(d => d.kcal)).toEqual([175, 394, 613, 831, 1050]);
  });

  it('advance outside 4–7 days is refused', () => {
    expect(refeedingSchedule({ weightKg: 38, targetKcal: 1330, level: 'high', advanceDays: 3 }).status).toBe('not_computable');
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Worked example 3: 30% TBSA burns', () => {
  // Man, 35 y, 175 cm, 70 kg; post-burn day 5; T 38.5 °C; prior-24 h intake 2000 kcal.
  const patient = { ageYears: 35, sex: 'male' as const, weightKg: 70, heightCm: 175 };
  const context = { setting: 'ward' as const, burns: { tbsaPercent: 30, postBurnDay: 5 }, temperatureC: 38.5, previousDayIntakeKcal: 2000 };
  const energy = estimateEnergy({ patient, context });

  it('Toronto with ORIGINAL Harris-Benedict, preferred', () => {
    // HB 1919 = 66.473 + 13.7516×70 + 5.0033×175 − 6.755×35 = 66.473 + 962.612 + 875.578 − 236.425 = 1668.24
    // REE = −4343 + 10.5×30 + 0.23×2000 + 0.84×1668.24 + 114×38.5 − 4.5×5
    //     = −4343 + 315 + 460 + 1401.32 + 4389 − 22.5 = 2199.8 → 2200
    const t = byId(energy, 'toronto');
    expect(t.value).toBe(2200);
    expect(t.inputsUsed.harrisBenedictKcal).toBe(1668);
    expect(t.preferred).toBe(true);
  });

  it('Curreri = 25×70 + 40×30 = 1750 + 1200 = 2950, flagged as overestimating', () => {
    const c = byId(energy, 'curreri');
    expect(c.value).toBe(2950);
    expect(c.warnings.join(' ')).toMatch(/OVERESTIMATE/);
  });

  it('Curreri caps TBSA at 50%: 60% → 1750 + 40×50 = 3750 (not 4150)', () => {
    const e = estimateEnergy({ patient, context: { ...context, burns: { tbsaPercent: 60, postBurnDay: 5 } } });
    const c = byId(e, 'curreri');
    expect(c.value).toBe(3750);
    expect(c.warnings.join(' ')).toMatch(/capped at 50%/);
  });

  it('also returns Mifflin (1623.75 → 1624) and Harris-Benedict for the clinician to compare', () => {
    expect(byId(energy, 'mifflin_st_jeor').value).toBe(1624);
    // HB revised = 88.362 + 937.79 + 839.825 − 198.695 = 1667.28 → 1667
    expect(byId(energy, 'harris_benedict').value).toBe(1667);
  });

  it('protein 1.5–2.0 g/kg × 70 = 105–140 g/day', () => {
    const [p] = estimateProtein({ patient, context });
    expect(p.id).toBe('burns_wounds');
    expect(p.value).toEqual({ low: 105, high: 140 });
  });

  it('Toronto names what it is missing', () => {
    const e = estimateEnergy({ patient, context: { burns: { tbsaPercent: 30 } } });
    expect(byId(e, 'toronto').missing).toEqual(['previousDayIntakeKcal', 'temperatureC', 'burns.postBurnDay']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Worked example 4: diabetic outpatient, weight-loss plan', () => {
  // Woman, 50 y, 160 cm, 95 kg (BMI 37.1), type 2 diabetes, outpatient.
  const patient = { ageYears: 50, sex: 'female' as const, weightKg: 95, heightCm: 160 };
  const context = { setting: 'outpatient' as const, diabetes: true };

  it('Mifflin = 950 + 1000 − 250 − 161 = 1539; HB × out-of-bed 1.3 = 1605.24 × 1.3 = 2086.8 → 2087', () => {
    expect(mifflinStJeor(patient).value).toBe(1539);
    expect(harrisBenedict(patient, { activity: 'out_of_bed', stress: 'none' }).value).toBe(2087);
  });

  it('protein on adjusted weight (BMI ≥ 30): IBW 52.4, AdjBW 52.4 + 0.4 × 42.6 = 69.4 → 1.0–1.5 g/kg = 69–104 g', () => {
    const [p] = estimateProtein({ patient, context });
    expect(p.weightBasis).toBe('adjusted');
    expect(p.value).toEqual({ low: 69, high: 104 });
  });

  it('1539 − 500 = 1039 is below the 1200 kcal floor for women → floored; protein preserved', () => {
    // delta = 1200 − 1539 = −339 kcal/day → −339 × 7 ÷ 7700 = −0.31 kg/week
    // weeks to 85 kg = ceil(10 ÷ 0.31) = ceil(32.3) = 33
    const plan = planWeightGoal({ direction: 'loss', currentWeightKg: 95, targetWeightKg: 85, maintenanceKcal: 1539,
      sex: 'female', dailyChangeKcal: 500, proteinGPerDay: 104, context });
    expect(plan.value).toMatchObject({ targetKcal: 1200, floorApplied: true, dailyDeltaKcal: -339, projectedKgPerWeek: -0.31,
      weeksToTarget: 33, proteinGPerDay: 104 });
    expect(plan.value!.trajectory[0]).toEqual({ week: 0, projectedWeightKg: 95 });
    expect(plan.value!.trajectory[1]).toEqual({ week: 1, projectedWeightKg: 94.7 });
    expect(plan.value!.trajectory[33].projectedWeightKg).toBe(85);
    expect(plan.warnings.join(' ')).toMatch(/hypoglycaemia/);
    expect(plan.assumptions.join(' ')).toMatch(/Protein held at 104 g/);
  });

  it('a recorded clinician override allows going below the floor', () => {
    const plan = planWeightGoal({ direction: 'loss', currentWeightKg: 95, maintenanceKcal: 1539, sex: 'female', dailyChangeKcal: 500,
      proteinGPerDay: 104, clinicianOverride: { by: 'Dr Eze', reason: 'Supervised VLCD before bariatric surgery' } });
    expect(plan.value?.targetKcal).toBe(1039);
    expect(plan.value?.floorApplied).toBe(false);
    expect(plan.warnings.join(' ')).toMatch(/overridden by Dr Eze/);
  });

  it('an override without a reason is not an override', () => {
    const plan = planWeightGoal({ direction: 'loss', currentWeightKg: 95, maintenanceKcal: 1539, sex: 'female', dailyChangeKcal: 500,
      clinicianOverride: { by: 'Dr Eze', reason: ' ' } });
    expect(plan.value?.targetKcal).toBe(1200);
  });

  it('from HB × 1.3 (2087) a 750 kcal deficit needs no floor: −750 × 7 ÷ 7700 = −0.68 kg/week', () => {
    const plan = planWeightGoal({ direction: 'loss', currentWeightKg: 95, maintenanceKcal: 2087, sex: 'female', dailyChangeKcal: 750, proteinGPerDay: 104 });
    expect(plan.value).toMatchObject({ targetKcal: 1337, floorApplied: false, projectedKgPerWeek: -0.68 });
  });

  it('no weight-loss plan while catabolic without an override', () => {
    const plan = planWeightGoal({ direction: 'loss', currentWeightKg: 95, maintenanceKcal: 2087, sex: 'female',
      context: { sepsis: true } });
    expect(plan.value).toBeNull();
    expect(plan.status).toBe('not_applicable');
    expect(plan.warnings.join(' ')).toMatch(/catabolic \(sepsis\)/);
  });

  it('weight gain: 300 kcal surplus → +300 × 7 ÷ 7700 = +0.27 kg/week; no floor', () => {
    const plan = planWeightGoal({ direction: 'gain', currentWeightKg: 50, targetWeightKg: 55, maintenanceKcal: 1800, sex: 'male', dailyChangeKcal: 300, proteinGPerDay: 75 });
    // weeks = ceil(5 ÷ 0.27) = ceil(18.5) = 19
    expect(plan.value).toMatchObject({ targetKcal: 2100, projectedKgPerWeek: 0.27, weeksToTarget: 19 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('Worked example 5: no measurable weight (MUAC and knee-height path)', () => {
  // Bed-bound man, 45 y, cannot be weighed or stood. Knee height 52 cm, MUAC 22 cm.
  const r = assessNutrition({
    patient: { ageYears: 45, sex: 'male', dialysis: false, parenteralNutrition: false },
    anthropometry: { kneeHeightCm: 52, muacCm: 22 },
    must: { acuteDiseaseEffect: false },
  });
  if (r.status === 'refer') throw new Error('unexpected referral');

  it('height from knee height (Chumlea 1994 black men): 73.42 + 1.79 × 52 = 166.5 cm', () => {
    expect(r.height.value).toBe(166.5);
    expect(r.height.method).toBe('Height from knee height');
  });

  it('IBW from the estimated height: 50 + 2.3 × (166.5 ÷ 2.54 − 60) = 62.8 kg', () => {
    expect(r.ibw.value).toBe(62.8);
  });

  it('weight: the population equation for this age is not configured — reported, not guessed', () => {
    expect(r.weight.value).toBeNull();
    expect(r.weight.status).toBe('equation_not_configured');
    expect(r.status).toBe('incomplete');
  });

  it('MUAC 22 cm < 23.5 → BMI likely < 20 → MUST BMI score 1 (minimum)', () => {
    expect(r.muacBmiBand.value).toBe('bmi_likely_below_20');
    expect(r.screening.must.value?.components.bmi_score).toBe(1);
    expect(r.screening.must.value?.complete).toBe(false); // no weight history
  });

  it('energy and protein say weight is missing rather than inventing one', () => {
    expect(r.energy.every(e => e.value === null)).toBe(true);
    expect(byId(r.energy, 'mifflin_st_jeor').missing).toEqual(['weightKg']);
    expect(r.protein[0].value).toBeNull();
  });

  it('at 70 y with calf and subscapular skinfold, weight is estimated (Chumlea 1988) and flows through', () => {
    // Height (Chumlea 1998 NH black men) = 79.69 + 1.85×52 − 0.14×70 = 166.1 cm
    // Weight (Chumlea 1988 men)          = 0.98×31 + 1.16×52 + 1.73×24 + 0.37×12 − 81.69 = 55.0 kg
    // BMI = 55.0 ÷ 1.661² = 19.9;   Mifflin = 550 + 1038.125 − 350 + 5 = 1243.1 → 1243
    const old = assessNutrition({
      patient: { ageYears: 70, sex: 'male', dialysis: false, parenteralNutrition: false },
      anthropometry: { kneeHeightCm: 52, muacCm: 24, calfCm: 31, subscapularSkinfoldMm: 12 },
    });
    if (old.status === 'refer') throw new Error('unexpected referral');
    expect(old.height.value).toBe(166.1);
    expect(old.weight.value).toBe(55);
    expect(old.bmi.value).toBe(19.9);
    const m = byId(old.energy, 'mifflin_st_jeor');
    expect(m.value).toBe(1243);
    expect(m.assumptions.join(' ')).toMatch(/Weight is estimated/);
  });
});
