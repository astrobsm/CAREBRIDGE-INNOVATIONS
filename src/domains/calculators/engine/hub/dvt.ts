/**
 * Caprini VTE risk — pure scoring and plan for the /calculators hub.
 *
 * The total comes from calculationEngine.calculateCapriniScore. The tiers
 * (0 / 1-2 / 3-4 / 5-8 / 9+) are the engine's; the hub labels the top tier
 * "Very High Risk" where the engine says "Highest Risk".
 *
 * Pregnancy and postpartum are one Caprini item. The engine scores them as
 * two, so the form treats them as either/or (see DvtFlags.pregnancy) rather
 * than letting both be ticked and counted twice.
 */
import { calculateCapriniScore } from '../calculationEngine';
import type { DVTRiskResult, PatientCalculatorInfo } from '../../types';
import { emptyPlan, field, section, sections } from '../../report/format';
import { hasComorbidity, patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';

export interface DvtFlags {
  minorSurgery: boolean;
  bmi30Plus: boolean;
  swollenLegs: boolean;
  varicoseVeins: boolean;
  pregnancy: boolean;
  postpartum: boolean;
  ocp: boolean;
  bedrest: boolean;
  plasterCast: boolean;
  sepsis: boolean;
  lungDisease: boolean;
  mi: boolean;
  chf: boolean;
  inflammatory: boolean;
  arthroscopic: boolean;
  majorSurgery: boolean;
  laparoscopic: boolean;
  centralLine: boolean;
  bedridden: boolean;
  paralysis: boolean;
  previousDVT: boolean;
  familyHistory: boolean;
  thrombophilia: boolean;
  elevatedHomocysteine: boolean;
  heparinThrombocytopenia: boolean;
  stroke: boolean;
  elective: boolean;
  hipPelvisFracture: boolean;
  acuteSpinal: boolean;
  cancer: boolean;
  chemotherapy: boolean;
}

export interface DvtInput {
  ageYears: number;
  flags: DvtFlags;
  comorbidities: string[];
}

export const NO_DVT_FLAGS: DvtFlags = {
  minorSurgery: false,
  bmi30Plus: false,
  swollenLegs: false,
  varicoseVeins: false,
  pregnancy: false,
  postpartum: false,
  ocp: false,
  bedrest: false,
  plasterCast: false,
  sepsis: false,
  lungDisease: false,
  mi: false,
  chf: false,
  inflammatory: false,
  arthroscopic: false,
  majorSurgery: false,
  laparoscopic: false,
  centralLine: false,
  bedridden: false,
  paralysis: false,
  previousDVT: false,
  familyHistory: false,
  thrombophilia: false,
  elevatedHomocysteine: false,
  heparinThrombocytopenia: false,
  stroke: false,
  elective: false,
  hipPelvisFracture: false,
  acuteSpinal: false,
  cancer: false,
  chemotherapy: false,
};

export function computeDvt(raw: { age: string | number; flags: DvtFlags; comorbidities?: string[] }): { result: DVTRiskResult } | { errors: string[] } {
  const ageNum = typeof raw.age === 'number' ? raw.age : raw.age.trim() === '' ? NaN : Number(raw.age);
  if (!Number.isFinite(ageNum)) return { errors: ['Enter the age — Caprini scores age bands.'] };
  if (ageNum < 0 || ageNum > 120) return { errors: ['Age should be between 0 and 120 years.'] };
  const errors: string[] = [];
  if (raw.flags.pregnancy && raw.flags.postpartum) errors.push('Pregnancy and postpartum are one Caprini item — tick only one.');
  if (errors.length) return { errors };
  const input: DvtInput = { ageYears: Math.floor(ageNum), flags: raw.flags, comorbidities: raw.comorbidities ?? [] };
  const {
    minorSurgery,
    bmi30Plus,
    swollenLegs,
    varicoseVeins,
    pregnancy,
    postpartum,
    ocp,
    bedrest,
    plasterCast,
    sepsis,
    lungDisease,
    mi,
    chf,
    inflammatory,
    arthroscopic,
    majorSurgery,
    laparoscopic,
    centralLine,
    bedridden,
    paralysis,
    previousDVT,
    familyHistory,
    thrombophilia,
    elevatedHomocysteine,
    heparinThrombocytopenia,
    stroke,
    elective,
    hipPelvisFracture,
    acuteSpinal,
    cancer,
    chemotherapy,
  } = input.flags;

  const scoreBreakdown: DVTRiskResult['scoreBreakdown'] = {
    '5-point': [],
    '3-point': [],
    '2-point': [],
    '1-point': [],
  };

  const ageValue = input.ageYears;

  // Total score comes from the shared calculation engine (single source of truth).
  const score = calculateCapriniScore({
    age: ageValue,
    minorSurgery,
    bmiOver30: bmi30Plus,
    swollenLegs,
    varicoseVeins,
    pregnancy,
    postpartum,
    ocpOrHrt: ocp,
    bedRestMedical: bedrest,
    plasterCast,
    sepsis,
    lungDisease,
    acuteMI: mi,
    chf,
    inflammatoryBowelDisease: inflammatory,
    arthroscopicSurgery: arthroscopic,
    majorSurgeryOver45min: majorSurgery,
    laparoscopicOver45min: laparoscopic,
    centralVenousAccess: centralLine,
    bedriddenOver72h: bedridden,
    paralysis,
    cancer,
    onChemotherapy: chemotherapy,
    previousDVTorPE: previousDVT,
    familyHistoryThrombosis: familyHistory,
    thrombophilia,
    elevatedHomocysteine,
    heparinInducedThrombocytopenia: heparinThrombocytopenia,
    stroke,
    electiveArthroplasty: elective,
    hipPelvisLegFracture: hipPelvisFracture,
    acuteSpinalCordInjury: acuteSpinal,
  }).score;

  // Labelled breakdown for display (point value implied by its category).
  if (ageValue >= 41 && ageValue <= 60) scoreBreakdown['1-point'].push('Age 41-60 years');
  else if (ageValue >= 61 && ageValue <= 74) scoreBreakdown['2-point'].push('Age 61-74 years');
  else if (ageValue >= 75) scoreBreakdown['3-point'].push('Age ≥75 years');

  // 1 Point factors
  if (minorSurgery) scoreBreakdown['1-point'].push('Minor surgery planned');
  if (bmi30Plus) scoreBreakdown['1-point'].push('BMI > 30 kg/m²');
  if (swollenLegs) scoreBreakdown['1-point'].push('Swollen legs (current)');
  if (varicoseVeins) scoreBreakdown['1-point'].push('Varicose veins');
  if (pregnancy) scoreBreakdown['1-point'].push('Pregnancy');
  if (postpartum) scoreBreakdown['1-point'].push('Postpartum (<1 month)');
  if (ocp) scoreBreakdown['1-point'].push('Oral contraceptives/HRT');
  if (bedrest) scoreBreakdown['1-point'].push('Medical patient on bed rest');
  if (plasterCast) scoreBreakdown['1-point'].push('Plaster cast/brace');
  if (sepsis) scoreBreakdown['1-point'].push('Sepsis (<1 month)');
  if (lungDisease) scoreBreakdown['1-point'].push('Serious lung disease');
  if (mi) scoreBreakdown['1-point'].push('Acute MI');
  if (chf) scoreBreakdown['1-point'].push('CHF (<1 month)');
  if (inflammatory) scoreBreakdown['1-point'].push('Inflammatory bowel disease');

  // 2 Point factors
  if (arthroscopic) scoreBreakdown['2-point'].push('Arthroscopic surgery');
  if (majorSurgery) scoreBreakdown['2-point'].push('Major surgery >45 min');
  if (laparoscopic) scoreBreakdown['2-point'].push('Laparoscopic surgery >45 min');
  if (centralLine) scoreBreakdown['2-point'].push('Central venous access');
  if (bedridden) scoreBreakdown['2-point'].push('Confined to bed >72 hours');
  if (paralysis) scoreBreakdown['2-point'].push('Paralysis/paresis');

  // 3 Point factors
  if (previousDVT) scoreBreakdown['3-point'].push('History of DVT/PE');
  if (familyHistory) scoreBreakdown['3-point'].push('Family history of thrombosis');
  if (thrombophilia) scoreBreakdown['3-point'].push('Known thrombophilia');
  if (elevatedHomocysteine) scoreBreakdown['3-point'].push('Elevated homocysteine');
  if (heparinThrombocytopenia) scoreBreakdown['3-point'].push('Heparin-induced thrombocytopenia');

  // 5 Point factors
  if (stroke) scoreBreakdown['5-point'].push('Stroke (<1 month)');
  if (elective) scoreBreakdown['5-point'].push('Elective lower extremity arthroplasty');
  if (hipPelvisFracture) scoreBreakdown['5-point'].push('Hip/pelvis/leg fracture');
  if (acuteSpinal) scoreBreakdown['5-point'].push('Acute spinal cord injury');

  // Cancer
  if (cancer) {
    scoreBreakdown['2-point'].push('Cancer (current or within 6 months)');
    if (chemotherapy) {
      scoreBreakdown['1-point'].push('Currently on chemotherapy');
    }
  }

  // Determine risk level
  let riskLevel: string;
  let riskPercentage: string;
  let recommendations: string[] = [];
  let prophylaxis: string[] = [];
  let specificProtocols: string[] = [];
  let additionalRecommendations: string[] = [];

  if (score === 0) {
    riskLevel = 'Very Low Risk';
    riskPercentage = '<0.5% VTE risk';
    recommendations = [
      'Early ambulation encouraged',
      'No pharmacological prophylaxis needed',
      'Adequate hydration',
    ];
    prophylaxis = [
      'Early ambulation only',
      'No anticoagulation required',
    ];
  } else if (score <= 2) {
    riskLevel = 'Low Risk';
    riskPercentage = '~1.5% VTE risk';
    recommendations = [
      'Early and frequent ambulation',
      'Graduated compression stockings (GCS) optional',
      'Intermittent pneumatic compression (IPC) if immobile',
    ];
    prophylaxis = [
      'Mechanical prophylaxis recommended',
      'GCS (18-21 mmHg) or IPC',
      'Consider pharmacological if additional risk factors',
    ];
  } else if (score <= 4) {
    riskLevel = 'Moderate Risk';
    riskPercentage = '~3% VTE risk';
    recommendations = [
      'Pharmacological prophylaxis recommended',
      'Plus mechanical prophylaxis',
      'Early ambulation when possible',
      'Assess bleeding risk before anticoagulation',
    ];
    prophylaxis = [
      'Enoxaparin 40mg SC daily (preferred)',
      'OR Heparin 5000 units SC q8-12h',
      'PLUS graduated compression stockings',
      'Duration: Until fully mobile or discharge',
    ];
    specificProtocols = [
      'Renal impairment (CrCl <30): Use UFH instead of LMWH',
      'Obesity (BMI >40): Consider enoxaparin 40mg SC q12h',
    ];
  } else if (score <= 8) {
    riskLevel = 'High Risk';
    riskPercentage = '~6% VTE risk';
    recommendations = [
      'Pharmacological prophylaxis essential',
      'Combination mechanical + pharmacological',
      'Extended prophylaxis for high-risk surgery',
      'Close monitoring for signs of DVT/PE',
    ];
    prophylaxis = [
      'Enoxaparin 40mg SC daily (or 30mg SC q12h)',
      'OR Fondaparinux 2.5mg SC daily',
      'OR Rivaroxaban 10mg PO daily (post-surgery)',
      'PLUS IPC devices',
      'PLUS graduated compression stockings',
      'Duration: 7-10 days or until ambulatory',
      'Consider extended prophylaxis (28-35 days) for major orthopedic/cancer surgery',
    ];
    specificProtocols = [
      'Orthopedic surgery: Extend prophylaxis to 35 days',
      'Cancer surgery: Extend prophylaxis to 28 days',
      'Spinal anesthesia: Wait 12h after LMWH before catheter removal',
    ];
  } else {
    riskLevel = 'Very High Risk';
    riskPercentage = '>6% VTE risk';
    recommendations = [
      '⚠️ Maximum prophylaxis required',
      'Pharmacological + mechanical combination mandatory',
      'Extended prophylaxis after discharge',
      'Consider IVC filter if anticoagulation contraindicated',
      'Vigilant monitoring for VTE symptoms',
    ];
    prophylaxis = [
      'Enoxaparin 40mg SC q12h (higher dose for very high risk)',
      'OR Fondaparinux 2.5mg SC daily',
      'IPC devices continuously when in bed',
      'Graduated compression stockings',
      'Extended prophylaxis: 4-6 weeks post-discharge',
      'Daily lower limb assessment',
    ];
    specificProtocols = [
      'Cancer + surgery: LMWH preferred over warfarin',
      'Hip/knee replacement: Extended prophylaxis 35 days',
      'Major trauma: IPC until ambulatory, then add LMWH',
      'If bleeding risk: IPC alone until bleeding risk acceptable',
    ];
    additionalRecommendations = [
      'Screen for occult DVT if high clinical suspicion',
      'Serial lower limb Doppler ultrasound may be warranted',
      'Consider retrievable IVC filter if cannot anticoagulate',
    ];
  }

  // Additional considerations based on comorbidities
  if (hasComorbidity({ comorbidities: input.comorbidities }, /kidney|renal|ckd/i)) {
    additionalRecommendations.push('CKD present: Prefer unfractionated heparin over LMWH if CrCl <30');
  }
  if (hasComorbidity({ comorbidities: input.comorbidities }, /liver|cirrhosis|hepat/i)) {
    additionalRecommendations.push('Liver disease: Bleeding risk increased - consider mechanical only or reduced dose');
  }

  const availableMedications = [
    'Enoxaparin (Clexane) 40mg/0.4mL - Most common in Nigeria',
    'Enoxaparin (Clexane) 60mg/0.6mL',
    'Unfractionated Heparin 5000 IU/mL',
    'Fondaparinux (Arixtra) 2.5mg - May not be readily available',
    'Rivaroxaban (Xarelto) 10mg - For post-op, DOACs increasing availability',
    'Graduated Compression Stockings (18-21 mmHg)',
  ];

  const warningSigns = [
    '🦵 Unilateral leg swelling, pain, warmth, redness',
    '💨 Sudden shortness of breath',
    '💔 Chest pain (especially pleuritic)',
    '🫀 Rapid heart rate with no other cause',
    '😵 Syncope or presyncope',
    '🩸 Coughing blood (hemoptysis)',
    '',
    '⚠️ IF ANY OF THESE OCCUR: Emergency evaluation for PE/DVT needed',
  ];

  const educationPoints = [
    'Stay well hydrated (2-3L water daily unless fluid restricted)',
    'Early mobilization - walk as soon as medically safe',
    'Ankle pumping exercises when in bed',
    'Avoid crossing legs for prolonged periods',
    'Report any leg swelling or breathing difficulty immediately',
    'Continue prophylaxis medications as prescribed',
  ];

  const calculationResult: DVTRiskResult = {
    score,
    riskLevel,
    riskPercentage,
    scoreBreakdown,
    recommendations,
    prophylaxis,
    specificProtocols,
    additionalRecommendations,
    availableMedications,
    warningSigns,
    educationPoints,
  };

  return { result: calculationResult };
}

export function dvtReport(result: DVTRiskResult, ageYears: number | null, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  const factors = (['5-point', '3-point', '2-point', '1-point'] as const)
    .flatMap(k => result.scoreBreakdown[k].map(f => ({ label: f, value: `+${k[0]}` })));
  return {
    calculatorId: 'dvt',
    calculatorName: 'Caprini VTE risk (DVT)',
    inputs: [field('Age', ageYears, 'years', 0), ...(factors.length ? factors : [{ label: 'Risk factors', value: 'None ticked' }])],
    results: [
      { label: 'Caprini score', value: String(result.score) },
      { label: 'Risk', value: result.riskLevel },
      { label: 'VTE risk', value: result.riskPercentage },
    ],
    notes: ['Prophylaxis choice also depends on bleeding risk, which this score does not measure.'],
    plan: emptyPlan({
      sections: sections(
        section('Recommendations', result.recommendations),
        section('Prophylaxis protocol', result.prophylaxis),
        section('Special dosing & protocols', result.specificProtocols ?? []),
        section('Additional considerations', result.additionalRecommendations ?? [], 'warn'),
        section('Warning signs — seek emergency care', result.warningSigns, 'danger'),
        section('Patient education', result.educationPoints ?? []),
        section('Available medications (Nigeria)', result.availableMedications),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo, { ageYears }),
  };
}
