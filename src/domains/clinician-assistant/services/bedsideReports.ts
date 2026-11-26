/**
 * Report builders for the Bedside calculators: each turns a panel's inputs
 * into the shared CalculatorReport (PDF, share, AI plan) by calling the same
 * service functions the panel itself calls. Nothing is calculated here that
 * the panel does not show.
 */
import {
  assessSepsis, fluidDeficitMl, maintenanceFluidMlPerHour, sickleCrisisPlan,
  weightGainPlan, weightReductionPlan,
  type ActivityLevel, type DehydrationSeverity, type ResuscitationVitals, type ResuscitationLabs,
  type SickleCrisisInput, type Sex,
} from './calculators';
import {
  acidBase, electrolyteCorrection, egfrCkdEpi, woundHealingMealPlan,
  type AcidBaseInput, type ElectrolyteFinding, type WoundMealPlanInput,
} from './clinicalCalculators';
import { burnCareService } from './burnCalculators';
import type { RiskResult } from './riskCalculators';
import type { DayPlan } from '../../../data/nigerianFoods';
import {
  correctionPlanToReportPlan, emptyPlan, field, presentFields, section, sections, yesNo,
} from '../../calculators/report/format';
import type { CalculatorReport, ReportPatient, ReportSection } from '../../calculators/report/types';

const SEX_LABEL: Record<Sex, string> = { male: 'Male', female: 'Female', unspecified: 'Not specified' };

/** The seven-day plan as report sections, one per day. */
export function mealPlanSections(days: DayPlan[]): ReportSection[] {
  return days.map(d => ({
    title: `${d.day} — ${d.totalKcal} kcal, ${d.totalProtein} g protein`,
    items: ([
      ['Breakfast', d.breakfast], ['Mid-morning', d.midMorningSnack], ['Lunch', d.lunch],
      ['Afternoon', d.afternoonSnack], ['Dinner', d.dinner],
    ] as const)
      .filter(([, m]) => m.items.length > 0)
      .map(([label, m]) => `${label}: ${m.items.map(i => `${i.name} (${i.qty})`).join('; ')}`),
  })).filter(s => s.items.length > 0);
}

const withPatient = (r: CalculatorReport, patient?: ReportPatient): CalculatorReport =>
  patient ? { ...r, patient } : r;

// ── Emergency & sepsis ──────────────────────────────────────────────────────

export function resuscitationReport(input: {
  weightKg: number; vitals: ResuscitationVitals; labs: ResuscitationLabs; dehydration: DehydrationSeverity;
}, patient?: ReportPatient): CalculatorReport | null {
  const { vitals: v, labs, weightKg, dehydration } = input;
  const anyVital = [v.systolicBP, v.diastolicBP, v.heartRate, v.respiratoryRate, v.temperature, v.gcs, labs.wbc, labs.lactate]
    .some(x => x !== null && x !== undefined);
  if (!anyVital && !(weightKg > 0)) return null;
  const r = assessSepsis(v, labs);
  const maint = maintenanceFluidMlPerHour(weightKg);
  const deficit = fluidDeficitMl(weightKg, dehydration);

  const verdict = r.septicShock
    ? 'Septic shock likely — MAP < 65 and lactate > 2 (Sepsis-3: confirm vasopressor need after fluids).'
    : r.hypoperfusion && r.sepsisSuspected ? 'Sepsis with hypoperfusion — resuscitate now.'
    : r.sepsisSuspected ? 'Sepsis suspected.'
    : 'Sepsis criteria not met on the values entered.';

  return withPatient({
    calculatorId: 'resuscitation',
    calculatorName: 'Emergency & sepsis',
    inputs: presentFields([
      field('Weight', weightKg > 0 ? weightKg : null, 'kg'),
      field('Systolic BP', v.systolicBP, 'mmHg', 0), field('Diastolic BP', v.diastolicBP, 'mmHg', 0),
      field('Heart rate', v.heartRate, '/min', 0), field('Respiratory rate', v.respiratoryRate, '/min', 0),
      field('Temperature', v.temperature, '°C'), field('GCS', v.gcs, '/15', 0),
      field('WBC', labs.wbc, '×10⁹/L'), field('Lactate', labs.lactate, 'mmol/L'),
      field('Dehydration severity', dehydration),
    ]),
    results: [
      field('MAP', r.map, 'mmHg', 0),
      { label: 'qSOFA', value: `${r.qSOFA}/3` },
      { label: 'SIRS', value: `${r.sirs}/4` },
      field('Maintenance fluid', maint > 0 ? maint : null, 'mL/hr', 0),
      field('Estimated deficit', deficit > 0 ? deficit : null, 'mL', 0),
    ],
    notes: [
      verdict,
      ...(r.qSOFAComponents.length ? [`qSOFA scored on: ${r.qSOFAComponents.join('; ')}`] : []),
      ...(r.sirsComponents.length ? [`SIRS scored on: ${r.sirsComponents.join('; ')}`] : []),
      'Parameters left blank are not scored, so an incomplete set understates the score.',
    ],
    plan: emptyPlan({
      sections: sections(
        r.sepsisSuspected || r.septicShock
          ? section('Sepsis bundle', [
            'Cultures before antibiotics.',
            'Broad-spectrum antibiotics within one hour.',
            'Fluid resuscitation.',
            'Lactate measurement, repeated if raised.',
          ], r.septicShock ? 'danger' : 'warn')
          : null,
        section('Fluids', [
          maint > 0 ? `Maintenance ${maint} mL/hr (30 mL/kg/day).` : 'Enter a weight to estimate maintenance fluid.',
          deficit > 0 ? `Estimated deficit ${deficit} mL (${dehydration}: ${({ mild: 3, moderate: 6, severe: 9 })[dehydration]}% of body weight).` : null,
        ]),
      ),
    }),
  }, patient);
}

// ── Sickle cell crisis ──────────────────────────────────────────────────────

export function sickleReport(input: SickleCrisisInput, patient?: ReportPatient): CalculatorReport {
  const p = sickleCrisisPlan(input);
  return withPatient({
    calculatorId: 'sickle',
    calculatorName: 'Sickle cell crisis',
    inputs: presentFields([
      field('Weight', input.weightKg > 0 ? input.weightKg : null, 'kg'),
      field('Pain score', input.painScore, '/10', 0),
      field('Haemoglobin', input.haemoglobinGdL, 'g/dL'),
      field('Baseline Hb', input.baselineHbGdL, 'g/dL'),
      field('SpO₂', input.spo2, '%', 0),
      field('Temperature', input.temperatureC, '°C'),
      { label: 'Chest symptoms', value: yesNo(input.chestSymptoms) },
      { label: 'Previous stroke', value: yesNo(input.priorStroke) },
    ]),
    results: [
      { label: 'Pain severity', value: p.painSeverity },
      field('Crisis fluid (1.5× maintenance)', p.fluidMlPerHour > 0 ? p.fluidMlPerHour : null, 'mL/hr', 0),
      { label: 'Transfusion / exchange', value: p.exchangeConsidered ? 'Exchange' : p.transfusionConsidered ? 'Consider transfusion' : 'Not indicated' },
    ],
    notes: input.weightKg > 0 ? [] : ['Enter a weight for fluid and opioid dosing.'],
    plan: emptyPlan({
      sections: sections(
        section('Red flags', p.redFlags, 'danger'),
        section('Analgesia', p.analgesia),
        section('Fluids', [p.fluidMlPerHour > 0 ? `${p.fluidMlPerHour} mL/hr — a target, not a licence: over-hydration precipitates acute chest syndrome.` : 'Enter a weight to calculate the crisis fluid rate.']),
        section('Investigations', p.investigations),
      ),
    }),
  }, patient);
}

// ── Weight gain / reduction ─────────────────────────────────────────────────

export function weightPlanReport(input: {
  mode: 'gain' | 'reduction'; weightKg: number; heightCm: number; ageYears: number; sex: Sex;
  activity: ActivityLevel; targetChangeKg?: number; weeks?: number; days?: DayPlan[] | null;
}, patient?: ReportPatient): CalculatorReport | null {
  if (!(input.weightKg > 0 && input.heightCm > 0 && input.ageYears > 0)) return null;
  const plan = input.mode === 'gain' ? weightGainPlan(input) : weightReductionPlan(input);
  const gain = input.mode === 'gain';
  return withPatient({
    calculatorId: gain ? 'gain' : 'reduction',
    calculatorName: gain ? 'Weight gain' : 'Weight loss',
    inputs: presentFields([
      field('Weight', input.weightKg, 'kg'), field('Height', input.heightCm, 'cm', 0),
      field('Age', input.ageYears, 'years', 0), { label: 'Sex', value: SEX_LABEL[input.sex] },
      { label: 'Activity', value: input.activity },
      field(`Target ${gain ? 'gain' : 'loss'}`, input.targetChangeKg ?? null, 'kg'),
      field('Over', input.weeks ?? null, 'weeks', 0),
    ]),
    results: [
      field('BMR', plan.bmr, 'kcal/day', 0), field('Maintenance (TDEE)', plan.tdee, 'kcal/day', 0),
      field('Target intake', plan.targetCalories, 'kcal/day', 0),
      field(gain ? 'Surplus' : 'Deficit', Math.abs(plan.calorieDelta), 'kcal/day', 0),
      field('Protein', plan.proteinG, 'g/day', 0), field('Carbohydrate', plan.carbG, 'g/day', 0), field('Fat', plan.fatG, 'g/day', 0),
    ],
    notes: ['Energy requirement from the revised Harris-Benedict equation.'],
    plan: emptyPlan({
      sections: sections(
        section('Notes', plan.notes, plan.notes.length ? 'warn' : undefined),
        ...(input.days ? mealPlanSections(input.days) : [section('Meal plan', ['Open the seven-day meal plan to include it in the report.'])]),
      ),
    }),
  }, patient);
}

// ── Electrolytes ────────────────────────────────────────────────────────────

const SEVERITY_LABEL = {
  mild: 'Mild — asymptomatic', moderate: 'Moderate', severe: 'Severe — symptomatic', critical: 'Critical — seizures / arrhythmia',
} as const;

export function electrolyteReport(input: {
  analyteLabel: string; unit: string; key: string; value: number; finding: ElectrolyteFinding;
  weightKg: number; ageYears: number; sex: Sex; severity: keyof typeof SEVERITY_LABEL;
}, patient?: ReportPatient): CalculatorReport | null {
  const plan = electrolyteCorrection({
    finding: input.finding, values: { [input.key]: input.value },
    weightKg: input.weightKg || null, ageYears: input.ageYears || null, sex: input.sex, severity: input.severity,
  });
  if (!plan) return null;
  return withPatient({
    calculatorId: input.key === 'na' ? 'sodium' : input.key === 'k' ? 'potassium' : input.key,
    calculatorName: input.analyteLabel,
    inputs: presentFields([
      field(input.analyteLabel, input.value, input.unit),
      { label: 'Clinical severity', value: SEVERITY_LABEL[input.severity] },
      field('Weight', input.weightKg > 0 ? input.weightKg : null, 'kg'),
      field('Age', input.ageYears > 0 ? input.ageYears : null, 'years', 0),
      { label: 'Sex', value: SEX_LABEL[input.sex] },
    ]),
    results: [
      { label: 'Measured', value: plan.measured },
      ...(plan.deficit ? [{ label: plan.deficit.label, value: plan.deficit.value }] : []),
    ],
    plan: correctionPlanToReportPlan(plan),
  }, patient);
}

// ── Acid-base ───────────────────────────────────────────────────────────────

export function acidBaseReport(input: AcidBaseInput, patient?: ReportPatient): CalculatorReport | null {
  const r = acidBase(input);
  if (!r.interpretation && r.anionGap == null) return null;
  const gap = r.correctedAnionGap ?? r.anionGap;
  return withPatient({
    calculatorId: 'acidbase',
    calculatorName: 'Acid-base',
    inputs: presentFields([
      field('pH', input.ph, '', 2), field('PaCO₂', input.paco2, input.paco2Unit ?? 'kPa'),
      field('Bicarbonate', input.hco3, 'mmol/L'), field('Sodium', input.sodium ?? null, 'mmol/L', 0),
      field('Chloride', input.chloride ?? null, 'mmol/L', 0), field('Albumin', input.albumin ?? null, input.albumin != null && input.albumin > 10 ? 'g/L' : 'g/dL'),
    ]),
    results: presentFields([
      { label: 'Primary disorder', value: r.interpretation?.primary ?? '—' },
      { label: 'Compensation', value: r.interpretation?.compensation ?? '—' },
      field(r.correctedAnionGap != null ? 'Anion gap (albumin-corrected)' : 'Anion gap', gap, 'mmol/L'),
      field('PaCO₂ (kPa)', r.paco2Kpa, 'kPa', 2),
    ]),
    notes: [
      ...(r.interpretation?.narrative ? [r.interpretation.narrative] : []),
      ...r.notes,
    ],
    plan: r.interpretation && r.interpretation.primary !== 'normal'
      ? emptyPlan({ sections: sections(section('Interpretation and next steps', [r.interpretation.narrative, ...r.notes])) })
      : undefined,
  }, patient);
}

// ── eGFR ────────────────────────────────────────────────────────────────────

export function gfrReport(input: { creatinineUmolL: number | null; enteredValue: number | null; enteredUnit: 'umol' | 'mgdl'; ageYears: number; sex: Sex }, patient?: ReportPatient): CalculatorReport | null {
  const r = egfrCkdEpi({ creatinineUmolL: input.creatinineUmolL, ageYears: input.ageYears || null, sex: input.sex });
  if (r.egfr == null) return null;
  return withPatient({
    calculatorId: 'gfr',
    calculatorName: 'eGFR (CKD-EPI 2021)',
    inputs: [
      field('Creatinine', input.enteredValue, input.enteredUnit === 'mgdl' ? 'mg/dL' : 'µmol/L', 2),
      field('Age', input.ageYears, 'years', 0), { label: 'Sex', value: SEX_LABEL[input.sex] },
    ],
    results: [field('eGFR', r.egfr, 'mL/min/1.73m²', 0), { label: 'CKD stage', value: r.stage }],
    notes: [r.note, 'Race-free 2021 equation.'],
    plan: emptyPlan({ sections: sections(section('Recommendation', [r.note])) }),
  }, patient);
}

// ── Burns ───────────────────────────────────────────────────────────────────

export function burnsReport(input: {
  weightKg: number; ageYears: number; areas: Array<{ label: string; pct: number }>; hoursSince: number;
  inhalation: boolean; fullThickness: boolean; circumferential: boolean; now?: Date;
}, patient?: ReportPatient): CalculatorReport | null {
  const tbsa = input.areas.reduce((s, a) => s + a.pct, 0);
  if (!(tbsa > 0)) return null;
  const now = input.now ?? new Date();
  const plan = input.weightKg > 0
    ? burnCareService.calculateParklandFormula(input.weightKg, tbsa, new Date(now.getTime() - input.hoursSince * 3600_000), now, input.ageYears)
    : null;
  const baux = input.ageYears > 0 ? burnCareService.calculateRevisedBauxScore(input.ageYears, tbsa, input.inhalation) : null;
  const nutrition = input.weightKg > 0 ? burnCareService.calculateNutritionTargets(input.weightKg, tbsa) : null;
  const disposition = burnCareService.determineDisposition(tbsa, input.inhalation, input.fullThickness, input.ageYears || 30, 'flame', input.circumferential);

  return withPatient({
    calculatorId: 'burns',
    calculatorName: 'Burns',
    inputs: presentFields([
      field('Weight', input.weightKg > 0 ? input.weightKg : null, 'kg'),
      field('Age', input.ageYears > 0 ? input.ageYears : null, 'years', 0),
      ...input.areas.filter(a => a.pct > 0).map(a => field(a.label, a.pct, '% TBSA')),
      field('Hours since burn', input.hoursSince, 'h'),
      { label: 'Inhalation injury', value: yesNo(input.inhalation) },
      { label: 'Full thickness', value: yesNo(input.fullThickness) },
      { label: 'Circumferential', value: yesNo(input.circumferential) },
    ]),
    results: presentFields([
      field('TBSA', tbsa, '%'),
      field('Parkland 24 h', plan?.totalVolume24h ?? null, 'mL', 0),
      field('Current rate', plan?.currentRate ?? null, 'mL/hr', 0),
      field('Revised Baux', baux, '', 0),
      field('Energy (Curreri)', nutrition?.caloriesPerDay ?? null, 'kcal/day', 0),
      field('Protein', nutrition?.proteinPerDay ?? null, 'g/day', 0),
      { label: 'Recommended disposition', value: disposition.disposition.replace('_', ' ') },
    ]),
    notes: input.weightKg > 0 ? [] : ['Enter a weight — Parkland cannot be calculated without it.'],
    plan: emptyPlan({
      sections: sections(
        plan ? section('Fluid resuscitation (Hartmann\'s)', [
          `First 8 h from injury: ${plan.firstHalfVolume} mL; next 16 h: ${plan.secondHalfVolume} mL.`,
          `Current rate ${plan.currentRate} mL/hr.`,
          `Titrate to urine output ${plan.urineOutputTarget.min}–${plan.urineOutputTarget.max} mL/kg/hr (${Math.round(plan.urineOutputTarget.min * input.weightKg)}–${Math.round(plan.urineOutputTarget.max * input.weightKg)} mL/hr). The formula sets the starting rate; urine output sets the actual rate.`,
          ...plan.notes.slice(1),
        ]) : null,
        section(`Disposition: ${disposition.disposition.replace('_', ' ')}`, disposition.reasons,
          disposition.disposition === 'burn_center' || disposition.disposition === 'icu' ? 'warn' : undefined),
        nutrition ? section('Nutrition', [`${nutrition.caloriesPerDay} kcal/day, ${nutrition.proteinPerDay} g protein/day (${nutrition.formula}).`]) : null,
      ),
    }),
  }, patient);
}

// ── Scores (Caprini, Braden, MUST) ─────────────────────────────────────────

export function scoreReport(input: {
  id: 'dvt' | 'pressuresore' | 'must'; name: string; scoreLabel: string; scoreValue: string;
  result: RiskResult; inputs: Array<{ label: string; value: string }>; advice: string[];
}, patient?: ReportPatient): CalculatorReport {
  return withPatient({
    calculatorId: input.id,
    calculatorName: input.name,
    inputs: input.inputs,
    results: [
      { label: input.scoreLabel, value: input.scoreValue },
      { label: 'Risk', value: String(input.result.riskLevel).replace('_', ' ') },
    ],
    notes: [input.result.interpretation],
    plan: emptyPlan({ sections: sections(section('Recommendation', [input.result.interpretation, ...input.advice])) }),
  }, patient);
}

// ── Meal plans ──────────────────────────────────────────────────────────────

export function woundMealReport(input: WoundMealPlanInput, patient?: ReportPatient): CalculatorReport | null {
  if (!(input.weightKg > 0)) return null;
  const r = woundHealingMealPlan(input);
  return withPatient({
    calculatorId: 'woundmeal',
    calculatorName: 'Wound-healing meal plan',
    inputs: presentFields([
      field('Weight', input.weightKg, 'kg'), { label: 'Wound severity', value: input.severity ?? 'mild' },
      field('Albumin', input.albuminGdL ?? null, input.albuminGdL != null && input.albuminGdL > 10 ? 'g/L' : 'g/dL'),
      { label: 'Diabetes', value: yesNo(input.diabetes) }, { label: 'Chronic kidney disease', value: yesNo(input.ckd) },
      { label: 'Liver disease', value: yesNo(input.liverDisease) },
    ]),
    results: [
      field('Energy', r.targetKcal, 'kcal/day', 0), field('Protein', r.targetProtein, 'g/day', 0),
      { label: 'Per kg', value: `${r.kcalPerKg} kcal / ${r.proteinPerKg} g` }, field('Fluid', r.fluidMl, 'mL/day', 0),
    ],
    notes: r.rationale,
    plan: emptyPlan({
      sections: sections(
        section('Cautions', r.cautions, 'warn'),
        section('Dietary modifications', r.modifications),
        ...mealPlanSections(r.days),
      ),
    }),
  }, patient);
}

export function nutritionReport(input: { weightKg: number; kcal: number; proteinPerKg: number; days: DayPlan[] | null }, patient?: ReportPatient): CalculatorReport | null {
  const protein = Math.round(input.weightKg * input.proteinPerKg);
  if (!(input.weightKg > 0 && input.kcal > 0 && protein > 0)) return null;
  return withPatient({
    calculatorId: 'nutrition',
    calculatorName: 'Nutrition meal plan',
    inputs: [field('Weight', input.weightKg, 'kg'), field('Energy target', input.kcal, 'kcal/day', 0), field('Protein', input.proteinPerKg, 'g/kg/day')],
    results: [field('Protein target', protein, 'g/day', 0), field('Energy target', input.kcal, 'kcal/day', 0)],
    notes: ['Portions use West African foods with household measures. Figures are approximate and for planning, not for prescribing parenteral nutrition.'],
    plan: emptyPlan({ sections: input.days?.length ? mealPlanSections(input.days) : sections(section('Meal plan', ['No feasible plan for these targets.'])) }),
  }, patient);
}

