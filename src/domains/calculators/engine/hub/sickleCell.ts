/**
 * /calculators Sickle cell crisis: the hub's crisis plan, extracted from the
 * component unchanged in content, with three logic bugs fixed:
 *
 *  - a pain score of 4 or less overwrote "Critical" and "Severe" with "Mild",
 *    so a stroke or Hb < 5 with mild pain read as a mild crisis (and lost
 *    the hydroxyurea indication);
 *  - choosing "Acute Chest Syndrome", "Stroke/TIA", "Splenic Sequestration",
 *    "Aplastic Crisis" or "Priapism" as the crisis type changed nothing — only
 *    the checkboxes did. The crisis type now counts as that complication;
 *  - a blank haemoglobin was silently treated as 8 g/dL. It is now "not
 *    entered": anaemia is not assessed and the plan says so.
 */
import type { PatientCalculatorInfo, SickleCellResult } from '../../types';
import { emptyPlan, field, section, sections, yesNo } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport, DeterministicPlan, ReportSection } from '../../report/types';

export interface SickleWoundInput {
  hasWound: boolean;
  woundType: string;
  woundLocation: string;
  woundDuration: string;
  woundSize: string;
  currentTreatment: string;
  zincLevel: string;
  albuminLevel: string;
  nutritionStatus: string;
}

export interface SickleHubInput {
  weight: string;
  age: string;
  hbLevel: string;
  hbS: string;
  reticulocyteCount: string;
  crisisType: string;
  painScore: number;
  hasFever: boolean;
  hasACS: boolean;
  hasStroke: boolean;
  hasPriapism: boolean;
  hasSplenic: boolean;
  hasAplastic: boolean;
  onHydroxyurea: boolean;
  currentHUDose: string;
  transfusionHistory: string;
  wound: SickleWoundInput;
}

export const CRISIS_TYPES = [
  { value: 'vaso-occlusive', label: 'Vaso-Occlusive Crisis (VOC)', description: 'Pain crisis - most common' },
  { value: 'acs', label: 'Acute Chest Syndrome', description: 'Pulmonary complication - emergency' },
  { value: 'aplastic', label: 'Aplastic Crisis', description: 'Parvovirus B19 - severe anemia' },
  { value: 'sequestration', label: 'Splenic Sequestration', description: 'Splenic pooling - children' },
  { value: 'hemolytic', label: 'Hemolytic Crisis', description: 'Acute hemolysis' },
  { value: 'stroke', label: 'Stroke/TIA', description: 'Cerebrovascular event - emergency' },
  { value: 'priapism', label: 'Priapism', description: 'Urological emergency' },
];

export interface SickleHubResult extends SickleCellResult {
  input: SickleHubInput;
  weightKg: number;
  ageYears: number;
  hb: number | null;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
}

export type SickleCompute = { result: SickleHubResult; errors?: undefined } | { result?: undefined; errors: string[] };

const opt = (v: string) => (v.trim() === '' ? null : Number(v));

type Severity = SickleHubResult['severity'];
const RANK: Record<Severity, number> = { Mild: 0, Moderate: 1, Severe: 2, Critical: 3 };
/** Never lowers a severity. */
const raised = (cur: Severity, to: Severity): Severity => (RANK[to] > RANK[cur] ? to : cur);

export function computeSickle(input: SickleHubInput): SickleCompute {
  const errors: string[] = [];
  const weightKg = opt(input.weight), ageYears = opt(input.age);
  const hb = opt(input.hbLevel), hbsRaw = opt(input.hbS), retic = opt(input.reticulocyteCount);
  if (weightKg === null) errors.push('Enter the weight (kg).');
  else if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 400) errors.push('Weight must be between 1 and 400 kg.');
  if (ageYears === null) errors.push('Enter the age (years).');
  else if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 120) errors.push('Age must be between 0 and 120 years.');
  if (hb !== null && (!Number.isFinite(hb) || hb < 1 || hb > 20)) errors.push('Haemoglobin, if entered, must be between 1 and 20 g/dL.');
  if (hbsRaw !== null && (!Number.isFinite(hbsRaw) || hbsRaw < 0 || hbsRaw > 100)) errors.push('HbS, if entered, must be 0–100%.');
  if (retic !== null && (!Number.isFinite(retic) || retic < 0 || retic > 50)) errors.push('Reticulocytes, if entered, must be 0–50%.');
  if (!Number.isFinite(input.painScore) || input.painScore < 0 || input.painScore > 10) errors.push('Pain score must be 0–10.');
  if (errors.length) return { errors };

  const wt = weightKg!, age = ageYears!;
  const painScore = input.painScore;
  const hbsPercent = hbsRaw ?? 0;

  // The crisis type is a complication in its own right.
  const hasACS = input.hasACS || input.crisisType === 'acs';
  const hasStroke = input.hasStroke || input.crisisType === 'stroke';
  const hasSplenic = input.hasSplenic || input.crisisType === 'sequestration';
  const hasAplastic = input.hasAplastic || input.crisisType === 'aplastic';
  const hasPriapism = input.hasPriapism || input.crisisType === 'priapism';
  const hasFever = input.hasFever;

  // Severity: the worst feature wins. Mild pain only makes an otherwise
  // uncomplicated crisis mild — it never downgrades a complication.
  let severity = 'Moderate' as Severity;
  const severityFactors: string[] = [];
  if (hasStroke || hasACS || hasSplenic) {
    severity = raised(severity, 'Critical');
    severityFactors.push(`Life-threatening complication present: ${[hasStroke && 'stroke', hasACS && 'acute chest syndrome', hasSplenic && 'splenic sequestration'].filter(Boolean).join(', ')}`);
  }
  if (hb === null) {
    severityFactors.push('Haemoglobin not entered — anaemia not assessed');
  } else if (hb < 5) {
    severity = raised(severity, 'Critical');
    severityFactors.push('Severe anaemia (Hb < 5 g/dL)');
  } else if (hb < 6) {
    severity = raised(severity, 'Severe');
    severityFactors.push('Significant anaemia (Hb < 6 g/dL)');
  }
  if (hasAplastic) { severity = raised(severity, 'Severe'); severityFactors.push('Aplastic crisis'); }
  if (hasPriapism) { severity = raised(severity, 'Severe'); severityFactors.push('Priapism — urological emergency'); }
  if (painScore >= 8) {
    severity = raised(severity, 'Severe');
    severityFactors.push('Severe pain (score ≥ 8)');
  }
  if (hasFever) severityFactors.push('Fever present - rule out infection/ACS');
  const complicated = hasStroke || hasACS || hasSplenic || hasAplastic || hasPriapism || (hb !== null && hb < 6) || painScore >= 8;
  if (severity === 'Moderate' && painScore <= 4 && !complicated) severity = 'Mild';

  // Fluid management
  const maintenanceFluid = Math.round(((wt * 30) + 70));
  const hydrationRecommendation = [
    `Maintenance IV fluids: ${maintenanceFluid} mL/day (Normal Saline or D5NS)`,
    'Bolus: 10-20 mL/kg NS if dehydrated',
    'Oral hydration: 2-3L/day if tolerated',
    'Avoid over-hydration (risk of ACS)',
    'Target euvolemia - monitor fluid balance',
  ];

  // Pain management (WHO ladder adapted)
  const painManagement: string[] = [];
  if (painScore <= 3) {
    painManagement.push('Step 1: Paracetamol 1g PO q6h');
    painManagement.push('± NSAIDs (Ibuprofen 400mg TDS) if not contraindicated');
  } else if (painScore <= 6) {
    painManagement.push('Step 2: Tramadol 50-100mg PO/IV q6h');
    painManagement.push('+ Paracetamol 1g PO q6h');
    painManagement.push('Consider weak opioids');
  } else {
    painManagement.push('Step 3: Strong opioids indicated');
    painManagement.push(`Morphine 0.1-0.15 mg/kg IV/SC q3-4h PRN (${(0.1 * wt).toFixed(1)}–${(0.15 * wt).toFixed(1)} mg for ${wt} kg)`);
    painManagement.push('OR PCA morphine if available');
    painManagement.push('+ Paracetamol 1g q6h');
    painManagement.push('+ Consider adjuvants (gabapentin, amitriptyline)');
    painManagement.push('Laxatives prophylactically with opioids');
  }

  // Transfusion guidelines
  const transfusionGuidelines: string[] = [];
  let transfusionIndicated = false;
  let exchangeTransfusion = false;

  if (hasStroke) {
    exchangeTransfusion = true;
    transfusionIndicated = true;
    transfusionGuidelines.push('EMERGENCY EXCHANGE TRANSFUSION INDICATED (stroke)');
    transfusionGuidelines.push('Target HbS < 30%');
    transfusionGuidelines.push('Maintain Hb 10-11 g/dL');
  }
  if (hasACS && ((hb !== null && hb < 9) || hbsPercent > 30)) {
    exchangeTransfusion = true;
    transfusionIndicated = true;
    transfusionGuidelines.push('Exchange transfusion for severe ACS');
    transfusionGuidelines.push('Target HbS < 30%');
  } else if (hasACS) {
    transfusionIndicated = true;
    transfusionGuidelines.push('Simple transfusion to Hb 10-11 g/dL');
    if (hb === null || hbsRaw === null) transfusionGuidelines.push('Check Hb and HbS: exchange rather than simple transfusion if Hb < 9 g/dL or HbS > 30%');
  }
  if (hasSplenic && (hb === null || hb < 6)) {
    transfusionIndicated = true;
    transfusionGuidelines.push(hb === null ? 'Splenic sequestration: check Hb urgently — transfuse if < 6 g/dL' : 'Urgent transfusion for splenic sequestration');
    transfusionGuidelines.push('Transfuse cautiously - splenic autotransfusion may occur');
  }
  if (hasAplastic && (hb === null || hb < 6)) {
    transfusionIndicated = true;
    transfusionGuidelines.push(hb === null ? 'Aplastic crisis: check Hb urgently — transfuse if < 6 g/dL' : 'Transfusion for aplastic crisis');
    transfusionGuidelines.push('Check reticulocyte count - expect recovery in 7-10 days');
  }
  if (hb !== null && hb < 5 && !transfusionIndicated) {
    transfusionIndicated = true;
    transfusionGuidelines.push('Severe symptomatic anemia - transfusion needed');
  }
  if (!transfusionIndicated) {
    transfusionGuidelines.push('Transfusion not routinely indicated');
    transfusionGuidelines.push('Simple VOC: Avoid transfusion unless Hb drops significantly');
    transfusionGuidelines.push('Target Hb should not exceed 10-11 g/dL (hyperviscosity risk)');
  }

  // Exchange volume: 70 mL/kg adults, 80 mL/kg children; 1.5 blood volumes.
  let exchangeVolume = 0;
  if (exchangeTransfusion) {
    const bloodVolume = age < 18 ? 80 * wt : 70 * wt;
    exchangeVolume = Math.round(1.5 * bloodVolume);
  }

  // Hydroxyurea dosing
  const hydroxyureaDosing: string[] = [];
  const initialHUDose = Math.round(15 * wt);
  const maxHUDose = Math.round(35 * wt);
  if (input.onHydroxyurea) {
    hydroxyureaDosing.push(`Current dose: ${input.currentHUDose.trim() ? `${input.currentHUDose.trim()} mg/day` : 'not recorded'}`);
    hydroxyureaDosing.push('Continue during crisis unless myelosuppression');
    hydroxyureaDosing.push('May need dose adjustment based on FBC');
  } else {
    hydroxyureaDosing.push('Hydroxyurea is disease-modifying therapy');
    hydroxyureaDosing.push(`Starting dose: ${initialHUDose} mg/day (15 mg/kg)`);
    hydroxyureaDosing.push(`Maximum dose: ${maxHUDose} mg/day (35 mg/kg)`);
    hydroxyureaDosing.push('Titrate every 8 weeks based on FBC');
    hydroxyureaDosing.push('Target: MCV >100fL, neutrophils >2.0, platelets >80');
    hydroxyureaDosing.push('Monitor FBC every 2 weeks initially, then monthly');
  }

  // Infection management
  const infectionManagement: string[] = [];
  if (hasFever) {
    infectionManagement.push('FEVER IS AN EMERGENCY in SCD');
    infectionManagement.push('Blood cultures before antibiotics');
    infectionManagement.push('Empirical antibiotics within 1 hour: ceftriaxone 2 g IV (covers encapsulated organisms); add vancomycin if severely ill');
    infectionManagement.push('Malaria film if in endemic area');
    infectionManagement.push('Urinalysis and chest X-ray');
  } else {
    infectionManagement.push('No fever - low threshold to investigate if unwell');
    infectionManagement.push('Functional asplenia increases infection risk');
    infectionManagement.push('Ensure vaccinations up to date');
  }

  // ACS-specific
  const acsManagement: string[] = [];
  if (hasACS) {
    acsManagement.push('Oxygen to maintain SpO2 > 94%');
    acsManagement.push('Antibiotics: Ceftriaxone + Azithromycin (atypicals)');
    acsManagement.push('Incentive spirometry every 2 hours');
    acsManagement.push('Pain control (avoid over-sedation)');
    acsManagement.push('Bronchodilators if wheeze');
    acsManagement.push('Transfusion as above');
    acsManagement.push('ICU admission if SpO2 <90% on O2 or deteriorating');
  }

  const monitoring = [
    'Vital signs every 4 hours (every 1-2h if severe)',
    'Pain scores regularly (every 4 hours)',
    'Oxygen saturation continuous if ACS',
    'Daily FBC, reticulocytes, LDH, bilirubin',
    'U&E if dehydrated or on IV fluids',
    'Blood group and crossmatch if transfusion likely',
    'Chest X-ray if respiratory symptoms or fever',
  ];

  const dischargeCriteria = [
    'Pain controlled on oral analgesia',
    'Afebrile for 24 hours',
    'Adequate oral intake',
    'Stable hemoglobin',
    'No respiratory distress',
    'Social circumstances appropriate',
    'Follow-up arranged within 1-2 weeks',
  ];

  const longTermRecommendations = [
    'Hydroxyurea for recurrent crises (≥3/year)',
    'Pneumococcal, meningococcal, Haemophilus vaccines',
    'Daily penicillin prophylaxis (or erythromycin if allergic)',
    'Folic acid 5mg daily',
    'Annual transcranial Doppler in children',
    'Regular ophthalmology screening',
    'Avoid dehydration, cold, hypoxia',
    'Consider chronic transfusion program if indicated',
  ];

  const w = input.wound;
  const woundHealingRecommendations: string[] = [];
  if (w.hasWound) {
    woundHealingRecommendations.push('SICKLE CELL WOUND HEALING PROTOCOL');
    woundHealingRecommendations.push('');
    woundHealingRecommendations.push('-- Pathophysiology --');
    woundHealingRecommendations.push('SCD wounds result from chronic microvascular occlusion, endothelial dysfunction, and tissue hypoxia.');
    woundHealingRecommendations.push('Impaired nitric oxide bioavailability reduces blood flow to wound margins.');
    woundHealingRecommendations.push('');
    woundHealingRecommendations.push('-- Wound Care --');
    woundHealingRecommendations.push('Moist wound healing: Hydrocolloid or foam dressings (change every 2-3 days)');
    woundHealingRecommendations.push('Gentle debridement of necrotic tissue if present');
    woundHealingRecommendations.push('Avoid compression bandaging if arterial insufficiency suspected');
    woundHealingRecommendations.push('Consider topical zinc oxide preparations');
    woundHealingRecommendations.push('Biofilm management: Apply antimicrobial dressings (silver or PHMB-based)');
    const durationWeeks = parseInt(w.woundDuration) || 0;
    if (durationWeeks > 12) {
      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- Chronic Wound (>12 weeks) --');
      woundHealingRecommendations.push('Consider biopsy to rule out malignant transformation (Marjolin ulcer)');
      woundHealingRecommendations.push('Referral to wound care specialist / plastic surgeon');
      woundHealingRecommendations.push('Consider skin grafting if wound bed prepared');
      woundHealingRecommendations.push('Negative Pressure Wound Therapy (NPWT) if appropriate');
    }
    woundHealingRecommendations.push('');
    woundHealingRecommendations.push('-- Nutrition for Wound Healing --');
    woundHealingRecommendations.push('High-protein diet: 1.5-2g protein/kg/day');
    woundHealingRecommendations.push('Zinc supplementation: 220mg zinc sulfate daily (contains 50mg elemental zinc)');
    woundHealingRecommendations.push('Vitamin C: 500mg twice daily (collagen synthesis)');
    woundHealingRecommendations.push('Vitamin A: 10,000 IU daily for 10 days (epithelial cell growth)');
    woundHealingRecommendations.push('Iron supplementation if ferritin low and not on chronic transfusions');
    woundHealingRecommendations.push('Folic acid: 5mg daily (cell proliferation)');
    woundHealingRecommendations.push('Ensure adequate caloric intake: 30-35 kcal/kg/day');
    const albRaw = parseFloat(w.albuminLevel) || 0;
    // g/L entered in a g/dL field reads as 10× too high; a value above 10 can only be g/L.
    const albumin = albRaw > 10 ? albRaw / 10 : albRaw;
    if (albumin > 0 && albumin < 3.5) {
      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- Hypoalbuminemia Detected --');
      woundHealingRecommendations.push(`Serum albumin: ${albumin} g/dL (low - impairs wound healing)`);
      woundHealingRecommendations.push('Increase oral protein supplements (Ensure Plus, Complan)');
      woundHealingRecommendations.push('Consider parenteral nutrition if oral intake inadequate');
    }
    woundHealingRecommendations.push('');
    woundHealingRecommendations.push('-- SCD-Specific Wound Management --');
    woundHealingRecommendations.push('Optimize hemoglobin: Target Hb 9-10 g/dL (chronic transfusion if needed)');
    woundHealingRecommendations.push('Hydroxyurea: Increases HbF, improves microvascular flow to wound');
    woundHealingRecommendations.push('Avoid tourniquets and tight dressings on affected limb');
    woundHealingRecommendations.push('Leg elevation when resting to reduce edema');
    woundHealingRecommendations.push('Ankle-brachial pressure index (ABPI) if lower limb wound');
    woundHealingRecommendations.push('Pain management: Adequate analgesia improves wound healing');
    woundHealingRecommendations.push('Smoking cessation counseling (further impairs microcirculation)');
    woundHealingRecommendations.push('');
    woundHealingRecommendations.push('-- Monitoring --');
    woundHealingRecommendations.push('Weekly wound measurement (length x width x depth)');
    woundHealingRecommendations.push('Wound photography for progress documentation');
    woundHealingRecommendations.push('Wound swab if signs of infection (increasing pain, erythema, exudate)');
    woundHealingRecommendations.push('Monthly: FBC, reticulocytes, CRP, albumin, zinc levels');
    woundHealingRecommendations.push('Review at 4 weeks - reassess if <30% reduction in wound area');
  }

  const referralReasons = [
    severity === 'Critical' ? 'Critical severity crisis' : '',
    hasStroke ? 'Stroke — emergency exchange transfusion and neurology' : '',
    hasACS ? 'Acute chest syndrome — HDU/ICU review' : '',
    hasSplenic ? 'Splenic sequestration — urgent transfusion and surgical review' : '',
    hasPriapism ? 'Priapism — urgent urology review' : '',
    hb !== null && hb < 5 ? 'Severe anaemia (Hb < 5 g/dL)' : '',
  ].filter(Boolean);
  const emergencyReferral = referralReasons.length > 0;

  return {
    result: {
      input,
      weightKg: wt, ageYears: age, hb,
      severity,
      severityFactors,
      crisisType: CRISIS_TYPES.find(c => c.value === input.crisisType)?.label || input.crisisType,
      hydrationRecommendation,
      hydrationRequirement: maintenanceFluid,
      painManagement,
      transfusionNeeded: transfusionIndicated,
      exchangeTransfusion,
      exchangeVolume,
      transfusionGuidelines,
      antibioticProphylaxis: infectionManagement,
      hydroxyureaIndicated: !input.onHydroxyurea && severity !== 'Mild',
      hydroxyureaDose: input.onHydroxyurea ? input.currentHUDose : `${initialHUDose} mg/day`,
      hydroxyureaDosing,
      infectionManagement,
      acsManagement,
      monitoring,
      emergencyReferral,
      referralReasons,
      dischargeCriteria,
      longTermRecommendations,
      woundHealingRecommendations,
    },
  };
}

/** The wound protocol's flat list ('' spacers, '-- Heading --' markers) as sections. */
export function woundSections(lines: string[]): ReportSection[] {
  const out: ReportSection[] = [];
  let cur: ReportSection | null = null;
  for (const l of lines) {
    if (!l.trim() || l === 'SICKLE CELL WOUND HEALING PROTOCOL') continue;
    if (l.startsWith('--')) { cur = { title: `Wound healing — ${l.replace(/--/g, '').trim()}`, items: [] }; out.push(cur); continue; }
    if (!cur) { cur = { title: 'Wound healing', items: [] }; out.push(cur); }
    cur.items.push(l);
  }
  return out.filter(s => s.items.length > 0);
}

export function sicklePlan(r: SickleHubResult): DeterministicPlan {
  return emptyPlan({
    monitoring: r.monitoring,
    sections: sections(
      r.emergencyReferral ? section('Emergency referral', r.referralReasons ?? [], 'danger') : null,
      r.exchangeTransfusion
        ? section(`Exchange transfusion — about ${r.exchangeVolume?.toLocaleString()} mL (1.5 blood volumes)`, r.transfusionGuidelines ?? [], 'danger')
        : section('Transfusion', r.transfusionGuidelines ?? []),
      section('Acute chest syndrome protocol', r.acsManagement ?? []),
      section('Pain management', r.painManagement),
      section('Fluid management', r.hydrationRecommendation ?? []),
      section('Infection management', r.infectionManagement ?? []),
      section('Hydroxyurea (disease-modifying therapy)', r.hydroxyureaDosing ?? []),
      section('Discharge criteria', r.dischargeCriteria ?? []),
      section('Long-term recommendations', r.longTermRecommendations ?? []),
      ...woundSections(r.woundHealingRecommendations ?? []),
    ),
  });
}

export function sickleReport(r: SickleHubResult, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  const i = r.input;
  const opt = (label: string, v: string, unit: string) => (v.trim() ? [field(label, Number(v), unit)] : []);
  return {
    calculatorId: 'hub-sickle',
    calculatorName: 'Sickle cell crisis',
    inputs: [
      field('Weight', r.weightKg, 'kg'),
      field('Age', r.ageYears, 'years', 0),
      { label: 'Haemoglobin', value: r.hb !== null ? `${r.hb} g/dL` : 'Not entered' },
      ...opt('HbS', i.hbS, '%'),
      ...opt('Reticulocytes', i.reticulocyteCount, '%'),
      { label: 'Crisis type', value: r.crisisType },
      field('Pain score', i.painScore, '/10', 0),
      { label: 'Fever', value: yesNo(i.hasFever) },
      { label: 'Acute chest syndrome', value: yesNo(i.hasACS || i.crisisType === 'acs') },
      { label: 'Stroke/TIA', value: yesNo(i.hasStroke || i.crisisType === 'stroke') },
      { label: 'Priapism', value: yesNo(i.hasPriapism || i.crisisType === 'priapism') },
      { label: 'Splenic sequestration', value: yesNo(i.hasSplenic || i.crisisType === 'sequestration') },
      { label: 'Aplastic crisis', value: yesNo(i.hasAplastic || i.crisisType === 'aplastic') },
      { label: 'On hydroxyurea', value: i.onHydroxyurea ? `Yes${i.currentHUDose.trim() ? ` (${i.currentHUDose.trim()} mg/day)` : ''}` : 'No' },
      { label: 'Transfusion history', value: i.transfusionHistory },
      ...(i.wound.hasWound ? [{ label: 'Wound', value: [i.wound.woundType, i.wound.woundLocation, i.wound.woundDuration && `${i.wound.woundDuration} weeks`, i.wound.woundSize && `${i.wound.woundSize} cm²`].filter(Boolean).join(', ').replace(/_/g, ' ') }] : []),
    ],
    results: [
      { label: 'Severity', value: `${r.severity} crisis` },
      field('Maintenance fluid', r.hydrationRequirement, 'mL/day', 0),
      { label: 'Transfusion', value: r.exchangeTransfusion ? `Exchange (about ${r.exchangeVolume} mL)` : r.transfusionNeeded ? 'Indicated' : 'Not routinely indicated' },
      { label: 'Hydroxyurea', value: i.onHydroxyurea ? 'Continue' : r.hydroxyureaIndicated ? `Indicated — start ${r.hydroxyureaDose}` : 'Not indicated for this episode' },
      { label: 'Emergency referral', value: r.emergencyReferral ? 'Yes' : 'No' },
    ],
    notes: r.severityFactors ?? [],
    plan: sicklePlan(r),
    patient: patientInfoToReportPatient(patientInfo, { weightKg: r.weightKg, ageYears: r.ageYears }),
  };
}
