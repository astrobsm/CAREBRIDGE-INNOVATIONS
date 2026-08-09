/**
 * Bedside risk scores for the Clinician Assistant panels: Caprini (VTE),
 * Braden (pressure injury) and MUST (malnutrition).
 *
 * AstroHEALTH has assessment *components* for these (DVTCapriniAssessment,
 * PressureSoreAssessment, NutritionalRiskAssessment) but no shared scoring
 * service — the arithmetic is embedded in each form. These are the pure scoring
 * functions extracted so the assistant can compute a score without mounting a
 * form or writing an assessment record.
 *
 * The async signatures are kept because the panels call them with `.then()`,
 * and because a future version may need to look up patient data to prefill.
 *
 * Scoring only — deliberately no persistence and no prophylaxis prescribing.
 * The interpretation strings say what the score means, not what to give.
 */

export type RiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export interface RiskResult {
  score: number;
  riskLevel: RiskLevel | string;
  interpretation: string;
}

/** Caprini risk factor flags, keyed as in the panel's checkbox groups. */
export type CapriniFactors = Record<string, boolean | undefined>;

export interface BradenSubscores {
  sensory_perception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  friction_shear: number;
}

export interface MustComponents {
  bmi_score?: number;
  weight_loss_score?: number;
  acute_disease_score?: number;
}

/** Caprini point values. Grouped by weight, exactly as the score is published. */
const CAPRINI_POINTS: Array<[number, string[]]> = [
  [1, [
    'age_41_60', 'minor_surgery', 'bmi_over_25', 'swollen_legs', 'varicose_veins',
    'pregnancy_postpartum', 'oral_contraceptives', 'sepsis_1month', 'serious_lung_disease',
    'abnormal_pulmonary', 'acute_mi', 'chf_1month', 'inflammatory_bowel',
    'medical_patient_bedrest',
  ]],
  [2, [
    'age_61_74', 'arthroscopic_surgery', 'malignancy', 'major_surgery_45min',
    'laparoscopic_45min', 'patient_confined_bed', 'immobilizing_cast', 'central_venous_access',
  ]],
  [3, [
    'age_over_75', 'personal_history_vte', 'family_history_vte', 'factor_v_leiden',
    'prothrombin_mutation', 'elevated_homocysteine', 'lupus_anticoagulant',
    'anticardiolipin_antibodies', 'heparin_thrombocytopenia', 'other_thrombophilia',
  ]],
  [5, ['stroke_1month', 'elective_arthroplasty', 'hip_pelvis_fracture', 'acute_spinal_injury']],
];

export function scoreCaprini(factors: CapriniFactors): number {
  let score = 0;
  for (const [points, keys] of CAPRINI_POINTS) {
    for (const key of keys) if (factors[key]) score += points;
  }
  return score;
}

export function interpretCaprini(score: number): RiskResult {
  if (score >= 5) {
    return {
      score,
      riskLevel: 'high',
      interpretation: 'High VTE risk (Caprini >= 5). Strong recommendation for pharmacological prophylaxis.',
    };
  }
  if (score >= 3) {
    return {
      score,
      riskLevel: 'moderate',
      interpretation: 'Moderate VTE risk (Caprini 3-4). Pharmacological prophylaxis recommended.',
    };
  }
  if (score >= 1) {
    return {
      score,
      riskLevel: 'low',
      interpretation: 'Low VTE risk (Caprini 1-2). Mechanical prophylaxis usually sufficient.',
    };
  }
  return {
    score,
    riskLevel: 'very_low',
    interpretation: 'Very low VTE risk (Caprini 0). No specific VTE prophylaxis required.',
  };
}

export function scoreBraden(s: BradenSubscores): number {
  return (
    s.sensory_perception + s.moisture + s.activity + s.mobility + s.nutrition + s.friction_shear
  );
}

export function interpretBraden(totalScore: number): RiskResult {
  // Lower Braden = higher risk, which is the opposite direction to Caprini and
  // a common source of misreading.
  if (totalScore <= 9) {
    return {
      score: totalScore,
      riskLevel: 'very_high',
      interpretation: 'Very high risk for pressure injury development. Implement comprehensive prevention protocol immediately.',
    };
  }
  if (totalScore <= 12) {
    return {
      score: totalScore,
      riskLevel: 'high',
      interpretation: 'High risk for pressure injury. Implement intensive prevention measures.',
    };
  }
  if (totalScore <= 14) {
    return {
      score: totalScore,
      riskLevel: 'moderate',
      interpretation: 'Moderate risk for pressure injury. Implement standard prevention measures.',
    };
  }
  return {
    score: totalScore,
    riskLevel: 'low',
    interpretation: 'Low risk for pressure injury. Continue routine skin assessment and basic prevention measures.',
  };
}

export function scoreMust(c: MustComponents): number {
  return (c.bmi_score || 0) + (c.weight_loss_score || 0) + (c.acute_disease_score || 0);
}

export function interpretMust(totalScore: number): RiskResult {
  if (totalScore >= 2) {
    return {
      score: totalScore,
      riskLevel: 'high',
      interpretation: 'High risk of malnutrition. Refer to dietitian and implement nutritional care plan.',
    };
  }
  if (totalScore === 1) {
    return {
      score: totalScore,
      riskLevel: 'moderate',
      interpretation: 'Medium risk of malnutrition. Observe and reassess weekly.',
    };
  }
  return {
    score: totalScore,
    riskLevel: 'low',
    interpretation: 'Low risk of malnutrition. Routine clinical care and reassess weekly.',
  };
}

/**
 * Service-shaped facade, so the panels keep the call style they were written
 * with. The pure functions above are what tests should target.
 */
export const riskAssessmentService = {
  async calculateDVTRisk(assessment: { risk_factors?: CapriniFactors }): Promise<RiskResult> {
    return interpretCaprini(scoreCaprini(assessment.risk_factors || {}));
  },

  async calculatePressureSoreRisk(assessment: { braden_subscores?: BradenSubscores }): Promise<RiskResult> {
    const s = assessment.braden_subscores;
    if (!s) return interpretBraden(0);
    return interpretBraden(scoreBraden(s));
  },

  async calculateNutritionalRisk(assessment: {
    must_components?: MustComponents;
    must_scores?: MustComponents;
  }): Promise<RiskResult> {
    const components = assessment.must_components || assessment.must_scores || {};
    return interpretMust(scoreMust(components));
  },
};
