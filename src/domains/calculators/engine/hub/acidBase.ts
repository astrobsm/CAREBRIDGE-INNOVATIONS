/**
 * /calculators Acid-base: validation, interpretation and report.
 *
 * The primary disorder, compensation and anion gap come from the same engine
 * the Bedside calculator uses (clinicalCalculators.acidBase → abg.ts
 * interpretAcidBase), so the two surfaces always name the same disorder. It
 * works in kPa, detects mixed disorders, and accepts albumin in g/L or g/dL.
 * The hub's differential, treatment and monitoring lists are kept, keyed off
 * the engine's disorder.
 */
import { acidBase, KPA_PER_MMHG, type AcidBaseOutput } from '../../../clinician-assistant/services/clinicalCalculators';
import type { PatientCalculatorInfo } from '../../types';
import { emptyPlan, field, section, sections } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport, DeterministicPlan, ReportSection } from '../../report/types';

export interface AcidBaseHubInput {
  ph: string;
  pco2: string;
  pco2Unit: 'mmHg' | 'kPa';
  hco3: string;
  sodium: string;
  chloride: string;
  /** g/dL or g/L — a value above 10 is read as g/L. */
  albumin: string;
}

type Primary = NonNullable<AcidBaseOutput['interpretation']>['primary'];

export interface AcidBaseHubResult {
  ph: number;
  pco2MmHg: number;
  pco2Kpa: number;
  hco3: number;
  sodium: number | null;
  chloride: number | null;
  albuminGdL: number | null;
  primary: Primary;
  primaryLabel: string;
  compensation: string;
  anionGap: number | null;
  correctedAnionGap: number | null;
  interpretation: string[];
  differential: ReportSection[];
  treatment: string[];
  monitoring: string[];
}

export type AcidBaseCompute = { result: AcidBaseHubResult; errors?: undefined } | { result?: undefined; errors: string[] };

const PRIMARY_LABEL: Record<Primary, string> = {
  'respiratory acidosis': 'Respiratory acidosis',
  'respiratory alkalosis': 'Respiratory alkalosis',
  'metabolic acidosis': 'Metabolic acidosis',
  'metabolic alkalosis': 'Metabolic alkalosis',
  normal: 'Normal',
  mixed: 'Mixed disorder',
};

const COMPENSATION_LABEL: Record<string, string> = {
  appropriate: 'Appropriate compensation',
  inadequate: 'Inadequate compensation',
  excessive: 'Excessive compensation (a second disorder)',
  none: 'Uncompensated (acute)',
  'not-assessable': 'Compensation not assessable',
};

const opt = (v: string) => (v.trim() === '' ? null : Number(v));

export function computeAcidBase(input: AcidBaseHubInput): AcidBaseCompute {
  const errors: string[] = [];
  const ph = opt(input.ph), pco2 = opt(input.pco2), hco3 = opt(input.hco3);
  const na = opt(input.sodium), cl = opt(input.chloride), alb = opt(input.albumin);

  if (ph === null) errors.push('Enter the pH.');
  else if (!Number.isFinite(ph) || ph < 6.5 || ph > 8.0) errors.push('pH must be between 6.50 and 8.00.');
  if (pco2 === null) errors.push('Enter the PCO₂.');
  else if (input.pco2Unit === 'mmHg' && (!Number.isFinite(pco2) || pco2 < 5 || pco2 > 200)) errors.push('PCO₂ must be between 5 and 200 mmHg — or switch the unit to kPa.');
  else if (input.pco2Unit === 'kPa' && (!Number.isFinite(pco2) || pco2 < 0.7 || pco2 > 27)) errors.push('PCO₂ must be between 0.7 and 27 kPa — or switch the unit to mmHg.');
  if (hco3 === null) errors.push('Enter the bicarbonate.');
  else if (!Number.isFinite(hco3) || hco3 < 2 || hco3 > 60) errors.push('Bicarbonate must be between 2 and 60 mmol/L.');
  if (na !== null && (!Number.isFinite(na) || na < 90 || na > 200)) errors.push('Sodium, if entered, must be between 90 and 200 mmol/L.');
  if (cl !== null && (!Number.isFinite(cl) || cl < 50 || cl > 150)) errors.push('Chloride, if entered, must be between 50 and 150 mmol/L.');
  if (alb !== null && (!Number.isFinite(alb) || alb <= 0 || alb > 60)) errors.push('Albumin, if entered, must be in g/dL (e.g. 3.5) or g/L (e.g. 35).');
  if (errors.length) return { errors };

  const r = acidBase({ ph, paco2: pco2, paco2Unit: input.pco2Unit, hco3, sodium: na, chloride: cl, albumin: alb });
  const interp = r.interpretation!; // all three inputs are present
  const pco2Kpa = r.paco2Kpa!;
  const pco2MmHg = input.pco2Unit === 'mmHg' ? pco2! : pco2Kpa / KPA_PER_MMHG;
  const gap = r.correctedAnionGap ?? r.anionGap;

  const interpretation = [
    `pH ${ph!.toFixed(2)} — ${ph! < 7.35 ? 'acidaemia' : ph! > 7.45 ? 'alkalaemia' : 'within 7.35–7.45'}.`,
    `PaCO₂ ${pco2MmHg.toFixed(0)} mmHg (${pco2Kpa.toFixed(1)} kPa); bicarbonate ${hco3} mmol/L.`,
    interp.narrative,
    ...r.notes,
  ];

  let differential: ReportSection[] = [];
  let treatment: string[] = [];
  switch (interp.primary) {
    case 'respiratory acidosis':
      differential = sections(section('Differential diagnosis', [
        'COPD exacerbation', 'Severe asthma', 'Pneumonia / ARDS', 'Drug overdose (opioids, sedatives)',
        'Neuromuscular disease (Guillain-Barré, myasthenia)', 'Obesity hypoventilation syndrome', 'Airway obstruction',
      ]));
      treatment = [
        'Treat the underlying cause.', 'Ensure adequate ventilation; consider non-invasive ventilation (NIV/BiPAP).',
        'Bronchodilators if obstructive disease.', 'Naloxone if opioid overdose is suspected.',
        'Avoid rapid correction of chronic hypercapnia (risk of post-hypercapnic alkalosis).',
      ];
      break;
    case 'metabolic acidosis': {
      const high = section('Raised anion gap (MUDPILES)', [
        'Methanol', 'Uraemia (renal failure)', 'Diabetic ketoacidosis', 'Propylene glycol / paraldehyde',
        'Isoniazid / iron', 'Lactic acidosis (sepsis, shock, metformin)', 'Ethylene glycol', 'Salicylates',
      ]);
      const normal = section('Normal anion gap (hyperchloraemic)', [
        'Diarrhoea (gastrointestinal bicarbonate loss)', 'Renal tubular acidosis (types 1, 2, 4)', 'Early renal failure',
        'Carbonic anhydrase inhibitors (acetazolamide)', 'Ureteric diversion', 'Large-volume saline', "Addison's disease",
      ]);
      differential = gap === null
        ? sections(section('Anion gap', ['Enter sodium and chloride to classify by anion gap — both groups are listed.']), high, normal)
        : gap > 12 ? sections(high) : sections(normal);
      treatment = [
        'Treat the underlying cause (most important).', 'Volume resuscitation if dehydrated.',
        'Consider sodium bicarbonate only if pH < 7.1 and haemodynamically unstable.',
        'Dialysis for toxic ingestion or severe uraemia.', 'Insulin and fluids for DKA.',
        'Antibiotics and source control for sepsis-related lactic acidosis.',
      ];
      break;
    }
    case 'respiratory alkalosis':
      differential = sections(section('Differential diagnosis', [
        'Anxiety / panic (a diagnosis of exclusion)', 'Pain', 'Fever / sepsis', 'Hypoxaemia (any cause)',
        'CNS disease (stroke, tumour, meningitis)', 'Pulmonary embolism', 'Pregnancy', 'Salicylate toxicity (early)',
        'Hepatic encephalopathy',
      ]));
      treatment = [
        'Treat the underlying cause.', 'Supplemental oxygen if hypoxaemic.', 'Analgesia for pain.',
        'Reassurance for anxiety-related hyperventilation once organic causes are excluded.',
        'Do NOT use paper-bag rebreathing (hypoxia risk).',
      ];
      break;
    case 'metabolic alkalosis':
      differential = sections(
        section('Chloride-responsive (urine chloride < 20 mmol/L)', ['Vomiting / NG suction', 'Diuretics (after stopping)', 'Post-hypercapnic alkalosis']),
        section('Chloride-resistant (urine chloride > 20 mmol/L)', ['Hyperaldosteronism', 'Cushing syndrome', 'Severe hypokalaemia', 'Current diuretic use', 'Liquorice ingestion', 'Bartter / Gitelman syndrome']),
      );
      treatment = [
        'Treat the underlying cause.', 'Replace chloride and potassium deficits.',
        '0.9% saline for chloride-responsive alkalosis.', 'Potassium chloride supplementation.',
        'Stop diuretics if possible.', 'Spironolactone or amiloride for hyperaldosteronism.',
        'Acetazolamide may help if unresponsive.',
      ];
      break;
    case 'mixed':
      differential = sections(section('Mixed disorder', [
        'The respiratory and metabolic components are deranged in directions that one primary disorder does not explain.',
        'Consider, for example, sepsis with respiratory failure, or vomiting with renal failure.',
      ]));
      treatment = ['Identify and treat each component separately.', 'Repeat the gas after initial treatment to see which component persists.'];
      break;
    default:
      break;
  }

  const monitoring = interp.primary === 'normal' ? [] : [
    'Repeat ABG in 2–4 hours to assess response.',
    'Serum electrolytes (K⁺, Cl⁻, Na⁺).',
    'Continuous pulse oximetry.',
    'Cardiac monitoring if severe.',
  ];

  return {
    result: {
      ph: ph!, pco2MmHg, pco2Kpa, hco3: hco3!, sodium: na, chloride: cl,
      albuminGdL: alb === null ? null : alb > 10 ? alb / 10 : alb,
      primary: interp.primary,
      primaryLabel: PRIMARY_LABEL[interp.primary],
      compensation: COMPENSATION_LABEL[interp.compensation] ?? interp.compensation,
      anionGap: r.anionGap, correctedAnionGap: r.correctedAnionGap,
      interpretation, differential, treatment, monitoring,
    },
  };
}

export function acidBasePlan(r: AcidBaseHubResult): DeterministicPlan | undefined {
  if (r.primary === 'normal') return undefined;
  return emptyPlan({
    monitoring: r.monitoring,
    sections: sections(section('Treatment approach', r.treatment), ...r.differential),
  });
}

export function acidBaseReport(r: AcidBaseHubResult, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  return {
    calculatorId: 'hub-acidbase',
    calculatorName: 'Acid-base (ABG)',
    inputs: [
      field('pH', r.ph, '', 2),
      { label: 'PaCO₂', value: `${r.pco2MmHg.toFixed(0)} mmHg (${r.pco2Kpa.toFixed(1)} kPa)` },
      field('Bicarbonate', r.hco3, 'mmol/L'),
      ...(r.sodium !== null ? [field('Sodium', r.sodium, 'mmol/L', 0)] : []),
      ...(r.chloride !== null ? [field('Chloride', r.chloride, 'mmol/L', 0)] : []),
      ...(r.albuminGdL !== null ? [field('Albumin', r.albuminGdL, 'g/dL')] : []),
    ],
    results: [
      { label: 'Primary disorder', value: r.primaryLabel },
      { label: 'Compensation', value: r.compensation },
      ...(r.anionGap !== null ? [field('Anion gap', r.anionGap, 'mmol/L')] : []),
      ...(r.correctedAnionGap !== null ? [field('Albumin-corrected anion gap', r.correctedAnionGap, 'mmol/L')] : []),
    ],
    notes: r.interpretation,
    plan: acidBasePlan(r),
    patient: patientInfoToReportPatient(patientInfo),
  };
}
