/**
 * Braden scale — pure scoring and plan for the /calculators hub.
 *
 * The total comes from riskCalculators.scoreBraden (shared with the Bedside
 * tab). The hub's five bands are kept: they split 15-18 ("mild") from 19+
 * ("no risk"), where interpretBraden folds everything from 15 up into "low";
 * the 9 / 12 / 14 cut-offs are the same in both.
 */
import { scoreBraden } from '../../../clinician-assistant/services/riskCalculators';
import type { BradenResult, PatientCalculatorInfo } from '../../types';
import { emptyPlan, section, sections } from '../../report/format';
import { patientInfoToReportPatient } from '../../report/hubPatient';
import type { CalculatorReport } from '../../report/types';

export const sensoryOptions = [
  { value: 1, label: 'Completely Limited', description: 'Unresponsive to painful stimuli, limited ability to feel pain over most of body' },
  { value: 2, label: 'Very Limited', description: 'Responds only to painful stimuli. Cannot communicate discomfort except by moaning or restlessness' },
  { value: 3, label: 'Slightly Limited', description: 'Responds to verbal commands, but cannot always communicate discomfort or the need to be turned' },
  { value: 4, label: 'No Impairment', description: 'Responds to verbal commands. Has no sensory deficit which would limit ability to feel or voice pain/discomfort' },
];

export const moistureOptions = [
  { value: 1, label: 'Constantly Moist', description: 'Skin is kept moist almost constantly by perspiration, urine, etc. Dampness detected every time patient is moved/turned' },
  { value: 2, label: 'Very Moist', description: 'Skin is often, but not always, moist. Linen must be changed at least once a shift' },
  { value: 3, label: 'Occasionally Moist', description: 'Skin is occasionally moist, requiring an extra linen change approximately once a day' },
  { value: 4, label: 'Rarely Moist', description: 'Skin is usually dry; linen requires changing only at routine intervals' },
];

export const activityOptions = [
  { value: 1, label: 'Bedfast', description: 'Confined to bed' },
  { value: 2, label: 'Chairfast', description: 'Ability to walk severely limited or non-existent. Cannot bear own weight and/or must be assisted into chair/wheelchair' },
  { value: 3, label: 'Walks Occasionally', description: 'Walks occasionally during day, but for very short distances, with or without assistance. Spends majority of shift in bed/chair' },
  { value: 4, label: 'Walks Frequently', description: 'Walks outside room at least twice a day and inside room at least once every two hours during waking hours' },
];

export const mobilityOptions = [
  { value: 1, label: 'Completely Immobile', description: 'Does not make even slight changes in body or extremity position without assistance' },
  { value: 2, label: 'Very Limited', description: 'Makes occasional slight changes in body or extremity position but unable to make frequent or significant changes independently' },
  { value: 3, label: 'Slightly Limited', description: 'Makes frequent though slight changes in body or extremity position independently' },
  { value: 4, label: 'No Limitation', description: 'Makes major and frequent changes in position without assistance' },
];

export const nutritionOptions = [
  { value: 1, label: 'Very Poor', description: 'Never eats a complete meal. Rarely eats more than 1/3 of any food offered. Eats 2 servings or less of protein (meat/dairy) per day. Takes fluids poorly. Does not take a liquid dietary supplement OR is NPO and/or maintained on clear liquids or IVs for >5 days' },
  { value: 2, label: 'Probably Inadequate', description: 'Rarely eats a complete meal and generally eats only about 1/2 of any food offered. Protein intake includes only 3 servings of meat/dairy per day. Occasionally will take a dietary supplement OR receives less than optimum amount of liquid diet or tube feeding' },
  { value: 3, label: 'Adequate', description: 'Eats over half of most meals. Eats 4 servings of protein (meat/dairy) per day. Occasionally will refuse a meal, but will usually take a supplement when offered OR is on a tube feeding/TPN regimen which probably meets most of nutritional needs' },
  { value: 4, label: 'Excellent', description: 'Eats most of every meal. Never refuses a meal. Usually eats 4 or more servings of meat/dairy. Occasionally eats between meals. Does not require supplementation' },
];

export const frictionOptions = [
  { value: 1, label: 'Problem', description: 'Requires moderate to maximum assistance in moving. Complete lifting without sliding against sheets is impossible. Frequently slides down in bed/chair, requiring frequent repositioning with maximum assistance. Spasticity, contractures or agitation leads to almost constant friction' },
  { value: 2, label: 'Potential Problem', description: 'Moves feebly or requires minimum assistance. During a move, skin probably slides to some extent against sheets, chair, restraints or other devices. Maintains relatively good position in chair/bed most of time but occasionally slides down' },
  { value: 3, label: 'No Apparent Problem', description: 'Moves in bed and in chair independently and has sufficient muscle strength to lift up completely during move. Maintains good position in bed/chair' },
];


export interface BradenInput {
  sensoryPerception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  frictionShear: number;
}

export function computeBraden(input: BradenInput): { result: BradenResult } | { errors: string[] } {
  const { sensoryPerception, moisture, activity, mobility, nutrition, frictionShear } = input;
  const errors: string[] = [];
  const four: Array<[string, number]> = [
    ['Sensory perception', sensoryPerception], ['Moisture', moisture], ['Activity', activity],
    ['Mobility', mobility], ['Nutrition', nutrition],
  ];
  for (const [label, v] of four) {
    if (!Number.isInteger(v) || v < 1 || v > 4) errors.push(`${label} must be scored 1–4.`);
  }
  if (!Number.isInteger(frictionShear) || frictionShear < 1 || frictionShear > 3) errors.push('Friction & shear must be scored 1–3.');
  if (errors.length) return { errors };

  // The total through the shared Braden scorer, the one the Bedside tab and
  // the risk-assessment module use.
  const totalScore = scoreBraden({
    sensory_perception: sensoryPerception, moisture, activity, mobility, nutrition, friction_shear: frictionShear,
  });
  
  // Risk stratification
  let riskLevel: 'No Risk' | 'Mild Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk';
  let turningSchedule: string;
  let interventions: string[] = [];
  let preventionMeasures: string[] = [];
  let supportSurfaces: string[] = [];
  let nutritionRecommendations: string[] = [];
  let skinCare: string[] = [];
  
  if (totalScore >= 19) {
    riskLevel = 'No Risk';
    turningSchedule = 'Standard care - reposition every 4 hours or as needed';
    interventions = [
      'Continue standard nursing care',
      'Maintain current nutrition and hydration',
      'Encourage mobility as tolerated',
      'Re-assess weekly or with condition change',
    ];
    preventionMeasures = [
      'Standard hospital mattress acceptable',
      'Routine skin inspection during care',
      'Maintain good hygiene',
    ];
  } else if (totalScore >= 15 && totalScore <= 18) {
    riskLevel = 'Mild Risk';
    turningSchedule = 'Reposition every 2-4 hours';
    interventions = [
      'Increase repositioning frequency',
      'Consider pressure-relieving mattress overlay',
      'Optimize nutrition',
      'Re-assess twice weekly',
    ];
    preventionMeasures = [
      'Foam mattress overlay recommended',
      'Heel protection for bedridden patients',
      'Use pillows for positioning',
      'Avoid prolonged sitting (>2 hours)',
    ];
    supportSurfaces = [
      'Foam overlay mattress',
      'Heel protectors/pillows',
    ];
  } else if (totalScore >= 13 && totalScore <= 14) {
    riskLevel = 'Moderate Risk';
    turningSchedule = 'Reposition every 2 hours minimum';
    interventions = [
      'Strict 2-hourly repositioning protocol',
      'Pressure-redistributing mattress essential',
      'Nutritional assessment and supplementation',
      'Daily skin assessment and documentation',
      'Consider dietitian referral',
    ];
    preventionMeasures = [
      'Pressure-redistributing mattress required',
      'Heel elevation mandatory',
      'Use 30° lateral positions',
      'Avoid head of bed >30° unless medically necessary',
      'Chair cushion for sitting periods',
    ];
    supportSurfaces = [
      'Static pressure redistribution mattress',
      'Foam or gel chair cushion',
      'Heel elevation devices',
    ];
    nutritionRecommendations = [
      'Protein supplementation: 1.25-1.5 g/kg/day',
      'Consider oral nutritional supplements',
      'Vitamin C 500mg daily',
      'Zinc 15-20mg daily',
    ];
  } else if (totalScore >= 10 && totalScore <= 12) {
    riskLevel = 'High Risk';
    turningSchedule = 'Reposition every 1-2 hours';
    interventions = [
      '⚠️ High-risk pressure injury prevention protocol',
      'Strict 1-2 hourly repositioning',
      'Dynamic/alternating pressure mattress',
      'Comprehensive nutritional support',
      'Daily multidisciplinary skin rounds',
      'Document all interventions meticulously',
    ];
    preventionMeasures = [
      'Alternating pressure air mattress (APAM)',
      'Floating heels at all times',
      'Barrier cream for moisture management',
      'Reduce friction with transfer sheets',
      'Limit chair sitting to 1 hour maximum',
      'Silicone foam dressings on high-risk areas prophylactically',
    ];
    supportSurfaces = [
      'Alternating pressure air mattress (priority)',
      'Low air loss mattress',
      'Specialized wheelchair cushion',
      'Prophylactic silicone dressings (sacrum, heels)',
    ];
    nutritionRecommendations = [
      'High-protein diet: 1.5-2 g/kg/day',
      'Oral nutritional supplements 2-3 times daily',
      'Vitamin C 1000mg daily',
      'Zinc 40mg daily',
      'Consider enteral feeding if oral intake inadequate',
    ];
    skinCare = [
      'Inspect skin at every repositioning',
      'Apply barrier cream/ointment to moisture-prone areas',
      'Keep skin clean and dry',
      'Use pH-balanced cleansers',
      'Apply moisturizer to dry areas',
    ];
  } else {
    riskLevel = 'Very High Risk';
    turningSchedule = 'Continuous repositioning - every 1 hour or more frequently';
    interventions = [
      '🚨 CRITICAL - Maximum pressure injury prevention',
      'Hourly repositioning or more frequent',
      'Specialty bed/mattress mandatory',
      'Intensive nutritional support',
      'Consider turning team/mechanical aids',
      'Daily wound/tissue viability specialist review',
      'Continuous skin monitoring',
    ];
    preventionMeasures = [
      'Low air loss or fluidized bed',
      'Specialty turning/positioning system',
      'Comprehensive moisture management',
      'Prophylactic dressings on ALL bony prominences',
      'Minimize all pressure, friction, and shear',
      'Air-fluidized therapy if available',
    ];
    supportSurfaces = [
      'Low air loss bed (1st choice)',
      'Air-fluidized therapy bed if available',
      'Specialty positioning devices',
      'Full heel offloading devices',
      'Prophylactic silicone foam on sacrum, heels, elbows, occiput',
    ];
    nutritionRecommendations = [
      '⚡ Aggressive nutritional support essential',
      'Protein: 2 g/kg/day minimum',
      'Multiple oral supplements or tube feeding',
      'Vitamin C 1000-2000mg daily',
      'Zinc 40mg daily',
      'Arginine supplementation if tolerated',
      'Consider parenteral nutrition if enteral fails',
    ];
    skinCare = [
      'Inspect skin continuously',
      'Document any changes immediately',
      'Barrier products on all at-risk areas',
      'Incontinence management critical',
      'Consider urinary catheter if incontinence uncontrolled',
      'Maintain skin pH balance',
    ];
  }

  // High-risk body sites
  const highRiskSites = [
    'Sacrum/coccyx (most common)',
    'Heels (especially lateral)',
    'Ischial tuberosities (sitting)',
    'Greater trochanters (side-lying)',
    'Occiput (especially in ICU patients)',
    'Ears (oxygen mask/tubing)',
    'Shoulders/scapulae',
    'Elbows',
    'Malleoli (ankles)',
  ];

  // Score breakdown
  const scoreBreakdown = {
    sensoryPerception: { score: sensoryPerception, label: sensoryOptions.find(o => o.value === sensoryPerception)?.label || '' },
    moisture: { score: moisture, label: moistureOptions.find(o => o.value === moisture)?.label || '' },
    activity: { score: activity, label: activityOptions.find(o => o.value === activity)?.label || '' },
    mobility: { score: mobility, label: mobilityOptions.find(o => o.value === mobility)?.label || '' },
    nutrition: { score: nutrition, label: nutritionOptions.find(o => o.value === nutrition)?.label || '' },
    frictionShear: { score: frictionShear, label: frictionOptions.find(o => o.value === frictionShear)?.label || '' },
  };

  // Identify problem areas (score ≤2)
  const problemAreas: string[] = [];
  if (sensoryPerception <= 2) problemAreas.push('Sensory Perception');
  if (moisture <= 2) problemAreas.push('Moisture');
  if (activity <= 2) problemAreas.push('Activity');
  if (mobility <= 2) problemAreas.push('Mobility');
  if (nutrition <= 2) problemAreas.push('Nutrition');
  if (frictionShear <= 1) problemAreas.push('Friction & Shear');

  const calculationResult: BradenResult = {
    totalScore,
    riskLevel,
    scoreBreakdown,
    problemAreas,
    turningSchedule,
    interventions,
    preventionMeasures,
    supportSurfaces,
    nutritionRecommendations,
    skinCare,
    highRiskSites,
    reassessmentFrequency: riskLevel === 'Very High Risk' ? 'Daily' : 
                           riskLevel === 'High Risk' ? 'Every 2-3 days' :
                           riskLevel === 'Moderate Risk' ? 'Twice weekly' :
                           riskLevel === 'Mild Risk' ? 'Weekly' : 'With condition change',
  };
  
  return { result: calculationResult };
}

const BREAKDOWN_LABEL: Record<string, string> = {
  sensoryPerception: 'Sensory perception', moisture: 'Moisture', activity: 'Activity',
  mobility: 'Mobility', nutrition: 'Nutrition', frictionShear: 'Friction & shear',
};

export function bradenReport(result: BradenResult, patientInfo?: PatientCalculatorInfo): CalculatorReport {
  const breakdown = Object.entries(result.scoreBreakdown ?? {});
  return {
    calculatorId: 'pressuresore',
    calculatorName: 'Braden pressure sore risk',
    inputs: breakdown.map(([k, v]) => ({ label: BREAKDOWN_LABEL[k] ?? k, value: `${v.score} — ${v.label}` })),
    results: [
      { label: 'Braden total', value: `${result.totalScore}/23` },
      { label: 'Risk', value: result.riskLevel },
      { label: 'Reassess', value: result.reassessmentFrequency ?? '—' },
    ],
    notes: [
      'Lower scores mean higher risk. The score guides how intensively to prevent; it does not replace looking at the skin.',
    ],
    plan: emptyPlan({
      sections: sections(
        section('Priority problem areas (score ≤2)', result.problemAreas ?? [], 'warn'),
        section('Repositioning schedule', [result.turningSchedule]),
        section('Interventions', result.interventions ?? []),
        section('Support surfaces', result.supportSurfaces ?? []),
        section('Prevention measures', result.preventionMeasures ?? []),
        section('Nutrition for wound healing', result.nutritionRecommendations ?? []),
        section('Skin care protocol', result.skinCare ?? []),
        section('High-risk body sites to monitor', result.highRiskSites ?? []),
      ),
    }),
    patient: patientInfoToReportPatient(patientInfo),
  };
}
