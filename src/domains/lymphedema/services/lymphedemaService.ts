// ============================================================
// COMPREHENSIVE LYMPHEDEMA MANAGEMENT SERVICE
// Based on ISL Consensus (2024), WHO Guidelines, ILF Best Practice
// ============================================================
//
// ⚠️ CLINICAL DECISION SUPPORT ONLY
// Final clinical responsibility rests with the licensed clinician.
// All recommendations must be reviewed and approved by qualified medical personnel.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  LymphedemaAssessment,
  LymphedemaSeverityScore,
  LymphedemaSeverity,
  FunctionalImpactScore,
  QualityOfLifeScore,
  ISLStage,
  CampisiStage,
  SkinCondition,
  TissueConsistency,
  PittingGrade,
  StemmerSignResult,
  LimbMeasurement,
  LimbVolumeCalculation,
  LymphedemaTreatmentPlan,
  CDTIntensivePlan,
  CDTMaintenancePlan,
  InfectionControlPlan,
  SurgicalCandidacyAssessment,
  DebulkingCriteria,
  SurgicalPlan,
  SurgicalProcedureType,
  PostOperativeProtocol,
  TreatmentTimeline,
  TimelinePhase,
  TimelineMilestone,
  LymphedemaExercise,
  BandagingLayer,
  CDTMilestone,
  PostOperativeComplication,
  LymphedemaMonitoringRecord,
  LymphedemaAlert,
  LymphedemaEtiology,
  LymphedemaLimb,
  FollowUpAppointment,
  TreatmentPhase,
} from '../types';

// ==================== ISL STAGING ====================

/**
 * Determine ISL Stage based on clinical findings
 * Stage 0: Subclinical - impaired lymph transport, no visible swelling
 * Stage 1: Early - pitting edema, reduces with elevation
 * Stage 2: Moderate - pitting may/may not be present, does not resolve with elevation alone
 * Stage 2 late: Fibrotic - tissue fibrosis, non-pitting
 * Stage 3: Lymphostatic elephantiasis - marked increase, skin changes, trophic changes
 */
export function determineISLStage(
  pittingGrade: PittingGrade,
  tissueConsistency: TissueConsistency,
  limbElevationResponse: 'reduces_significantly' | 'reduces_partially' | 'no_change',
  skinConditions: SkinCondition[],
  volumeExcessPercent: number,
  stemmerSign: StemmerSignResult
): ISLStage {
  const hasTrophicChanges = skinConditions.some(s =>
    ['papillomatosis', 'elephantiasis_verrucosa', 'lymphorrhea'].includes(s)
  );
  const hasFibrosis = tissueConsistency === 'fibrotic' || tissueConsistency === 'woody_hard';
  const hasSignificantSkinChanges = skinConditions.some(s =>
    ['papillomatosis', 'elephantiasis_verrucosa', 'hyperkeratotic', 'lymphorrhea'].includes(s)
  );

  // Stage 3: Elephantiasis
  if (
    (volumeExcessPercent > 40 && hasTrophicChanges) ||
    skinConditions.includes('elephantiasis_verrucosa') ||
    (hasFibrosis && hasSignificantSkinChanges && volumeExcessPercent > 40)
  ) {
    return 3;
  }

  // Stage 2 late: Fibrotic
  if (
    hasFibrosis &&
    limbElevationResponse === 'no_change' &&
    (pittingGrade === 0 || pittingGrade === 1)
  ) {
    return '2_late';
  }

  // Stage 2: Pitting or non-pitting, doesn't fully resolve with elevation
  if (
    limbElevationResponse !== 'reduces_significantly' &&
    volumeExcessPercent >= 20
  ) {
    return 2;
  }

  // Stage 1: Pitting, reduces with elevation
  if (
    pittingGrade >= 1 &&
    limbElevationResponse === 'reduces_significantly' &&
    stemmerSign !== 'negative'
  ) {
    return 1;
  }

  // Stage 0: Subclinical
  return 0;
}

// ==================== CAMPISI STAGING ====================

/**
 * Determine Campisi Clinical Stage
 * IA: No visible edema, lymphedema reported by patient
 * IB: Slight edema, regresses spontaneously
 * II: Persistent edema, regresses with elevation
 * IIIA: Persistent edema, doesn't regress with elevation, recurrent infections
 * IIIB: Fibrolymphedema, column-shaped limb
 * IV: Elephantiasis with severe skin changes
 * V: Elephantiasis with functional deformity
 */
export function determineCampisiStage(
  islStage: ISLStage,
  volumeExcessPercent: number,
  limbElevationResponse: 'reduces_significantly' | 'reduces_partially' | 'no_change',
  episodesOfCellulitis: number,
  tissueConsistency: TissueConsistency,
  skinConditions: SkinCondition[],
  functionalImpairment: number // 0-4
): CampisiStage {
  const hasSevereElephant = skinConditions.includes('elephantiasis_verrucosa');

  if (hasSevereElephant && functionalImpairment >= 3) return 'V';
  if (hasSevereElephant || (islStage === 3 && volumeExcessPercent > 60)) return 'IV';
  if (
    (tissueConsistency === 'fibrotic' || tissueConsistency === 'woody_hard') &&
    limbElevationResponse === 'no_change'
  ) return 'IIIB';
  if (
    limbElevationResponse === 'no_change' &&
    (episodesOfCellulitis >= 2 || volumeExcessPercent > 30)
  ) return 'IIIA';
  if (
    limbElevationResponse !== 'no_change' &&
    volumeExcessPercent >= 10
  ) return 'II';
  if (volumeExcessPercent > 0 && volumeExcessPercent < 10) return 'IB';
  return 'IA';
}

// ==================== VOLUME CALCULATION ====================

/**
 * Calculate limb volume using truncated cone (frustum) formula
 * V = h/12π × (C₁² + C₁C₂ + C₂²)
 * where C₁, C₂ are adjacent circumferences and h is distance between them
 */
export function calculateLimbVolume(
  measurements: LimbMeasurement[],
  contralateralMeasurements?: LimbMeasurement[]
): LimbVolumeCalculation {
  // Sort by distance from landmark
  const sorted = [...measurements].sort((a, b) => a.distanceFromLandmarkCm - b.distanceFromLandmarkCm);
  
  let totalVolume = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const c1 = sorted[i].circumferenceCm;
    const c2 = sorted[i + 1].circumferenceCm;
    const h = Math.abs(sorted[i + 1].distanceFromLandmarkCm - sorted[i].distanceFromLandmarkCm);
    
    // Truncated cone formula: V = h/(12π) × (C1² + C1×C2 + C2²)
    const segmentVolume = (h / (12 * Math.PI)) * (c1 * c1 + c1 * c2 + c2 * c2);
    totalVolume += segmentVolume;
  }

  let contralateralVolume = 0;
  if (contralateralMeasurements && contralateralMeasurements.length > 1) {
    const sortedContra = [...contralateralMeasurements].sort(
      (a, b) => a.distanceFromLandmarkCm - b.distanceFromLandmarkCm
    );
    for (let i = 0; i < sortedContra.length - 1; i++) {
      const c1 = sortedContra[i].circumferenceCm;
      const c2 = sortedContra[i + 1].circumferenceCm;
      const h = Math.abs(sortedContra[i + 1].distanceFromLandmarkCm - sortedContra[i].distanceFromLandmarkCm);
      const segmentVolume = (h / (12 * Math.PI)) * (c1 * c1 + c1 * c2 + c2 * c2);
      contralateralVolume += segmentVolume;
    }
  }

  const volumeDiff = totalVolume - contralateralVolume;
  const volumeDiffPercent = contralateralVolume > 0
    ? ((volumeDiff / contralateralVolume) * 100)
    : 0;

  return {
    method: 'truncated_cone',
    affectedLimbVolumeMl: Math.round(totalVolume),
    contralateralVolumeMl: contralateralVolume > 0 ? Math.round(contralateralVolume) : undefined,
    volumeDifferenceMl: Math.round(volumeDiff),
    volumeDifferencePercent: Math.round(volumeDiffPercent * 10) / 10,
    calculatedAt: new Date(),
    measurements: sorted,
  };
}

// ==================== SEVERITY SCORING ====================

/**
 * Calculate Lymphedema Severity Score (composite)
 * Total: 0-20 points
 * 0-4: Minimal | 5-8: Mild | 9-12: Moderate | 13-16: Severe | 17-20: Elephantiasis
 */
export function calculateSeverityScore(
  volumeExcessPercent: number,
  skinConditions: SkinCondition[],
  tissueConsistency: TissueConsistency,
  episodesOfCellulitisPerYear: number,
  functionalLimitation: number // 0-4
): LymphedemaSeverityScore {
  // Volume excess score (0-4)
  let volumeScore: number;
  if (volumeExcessPercent < 10) volumeScore = 0;
  else if (volumeExcessPercent < 20) volumeScore = 1;
  else if (volumeExcessPercent < 30) volumeScore = 2;
  else if (volumeExcessPercent < 50) volumeScore = 3;
  else volumeScore = 4;

  // Skin changes score (0-4)
  let skinScore = 0;
  if (skinConditions.includes('dry_hyperkeratotic')) skinScore = 1;
  if (skinConditions.includes('fungal_infection')) skinScore = Math.max(skinScore, 1);
  if (skinConditions.includes('papillomatosis')) skinScore = Math.max(skinScore, 2);
  if (skinConditions.includes('lymphorrhea')) skinScore = Math.max(skinScore, 3);
  if (skinConditions.includes('cellulitis_active')) skinScore = Math.max(skinScore, 3);
  if (skinConditions.includes('ulceration')) skinScore = Math.max(skinScore, 3);
  if (skinConditions.includes('elephantiasis_verrucosa')) skinScore = 4;
  if (skinConditions.includes('lymphangiosarcoma_suspected')) skinScore = 4;

  // Tissue consistency score (0-4)
  let tissueScore: number;
  switch (tissueConsistency) {
    case 'soft_pitting': tissueScore = 1; break;
    case 'firm_non_pitting': tissueScore = 2; break;
    case 'fibrotic': tissueScore = 3; break;
    case 'woody_hard': tissueScore = 4; break;
    case 'mixed': tissueScore = 2; break;
    default: tissueScore = 0;
  }

  // Infection frequency score (0-4)
  let infectionScore: number;
  if (episodesOfCellulitisPerYear === 0) infectionScore = 0;
  else if (episodesOfCellulitisPerYear === 1) infectionScore = 1;
  else if (episodesOfCellulitisPerYear <= 2) infectionScore = 2;
  else if (episodesOfCellulitisPerYear <= 4) infectionScore = 3;
  else infectionScore = 4;

  const totalScore = volumeScore + skinScore + tissueScore + infectionScore + functionalLimitation;

  let severity: LymphedemaSeverity;
  let interpretation: string;

  if (totalScore <= 4) {
    severity = 'minimal';
    interpretation = 'Minimal lymphedema. Subclinical or early changes. Preventive measures and monitoring recommended.';
  } else if (totalScore <= 8) {
    severity = 'mild';
    interpretation = 'Mild lymphedema. CDT Phase 1 (intensive) recommended with close monitoring. Good prognosis with compliance.';
  } else if (totalScore <= 12) {
    severity = 'moderate';
    interpretation = 'Moderate lymphedema. Structured CDT intensive phase essential. Consider investigation for underlying cause. Infection prophylaxis if recurrent cellulitis.';
  } else if (totalScore <= 16) {
    severity = 'severe';
    interpretation = 'Severe lymphedema with significant tissue changes. Prolonged CDT intensive phase required. Evaluate for surgical candidacy after adequate conservative trial.';
  } else {
    severity = 'elephantiasis';
    interpretation = 'Elephantiasis / lymphostatic dermatopathy. Multimodal approach: infection control → CDT → likely surgical debulking. MDT discussion essential.';
  }

  return {
    volumeExcessPercent,
    skinChangesScore: skinScore,
    tissueConsistencyScore: tissueScore,
    infectionFrequencyScore: infectionScore,
    functionalLimitationScore: functionalLimitation,
    totalScore,
    severity,
    interpretation,
  };
}

// ==================== FUNCTIONAL IMPACT SCORING ====================

export function calculateFunctionalImpactScore(
  rangeOfMotion: number,
  gripOrAmbulation: number,
  adl: number,
  occupation: number
): FunctionalImpactScore {
  const total = rangeOfMotion + gripOrAmbulation + adl + occupation;
  let interpretation: string;

  if (total <= 4) {
    interpretation = 'Minimal functional limitation. Patient can perform most activities with minor adaptations.';
  } else if (total <= 8) {
    interpretation = 'Moderate functional limitation. Some activities restricted. Occupational therapy assessment recommended.';
  } else if (total <= 12) {
    interpretation = 'Significant functional limitation. Major impact on daily activities and occupation. Priority for treatment.';
  } else {
    interpretation = 'Severe functional limitation. Unable to perform many daily activities. Urgent treatment & surgical evaluation indicated.';
  }

  return {
    rangeOfMotion,
    grip_strength: gripOrAmbulation,
    ambulation: gripOrAmbulation,
    activitiesOfDailyLiving: adl,
    occupation,
    totalScore: total,
    interpretation,
  };
}

// ==================== QUALITY OF LIFE SCORING (LYMQOL) ====================

export function calculateQualityOfLifeScore(
  appearance: number, // 0-4
  symptoms: number,   // 0-4
  emotions: number,   // 0-4
  functionScore: number, // 0-4
  overallQoL: number  // 0-10 VAS
): QualityOfLifeScore {
  const total = appearance + symptoms + emotions + functionScore;
  let interpretation: string;

  if (overallQoL >= 8 && total <= 4) {
    interpretation = 'Good quality of life. Minor lymphedema-related concerns. Continue maintenance and supportive care.';
  } else if (overallQoL >= 5 && total <= 8) {
    interpretation = 'Moderate quality of life impact. Lymphedema affects some aspects of daily life. Consider psychological support.';
  } else if (overallQoL >= 3 && total <= 12) {
    interpretation = 'Significant quality of life impairment. Multi-disciplinary approach including psychological support recommended.';
  } else {
    interpretation = 'Severe quality of life impairment. Urgent comprehensive intervention needed. Psychological assessment essential.';
  }

  return {
    appearance,
    symptoms,
    emotions,
    function: functionScore,
    overallQoL,
    totalScore: total,
    interpretation,
  };
}

// ==================== CDT INTENSIVE PHASE PROTOCOL ====================

/**
 * Generate CDT Phase 1 (Intensive) protocol based on assessment
 */
export function generateCDTIntensivePlan(
  assessment: {
    islStage: ISLStage;
    affectedLimb: LymphedemaLimb;
    volumeExcessPercent: number;
    skinConditions: SkinCondition[];
    tissueConsistency: TissueConsistency;
    severity: LymphedemaSeverity;
    comorbidities: string[];
  }
): CDTIntensivePlan {
  const isUpper = assessment.affectedLimb.includes('upper');
  
  // Duration depends on severity
  let durationWeeks: number;
  let sessionsPerWeek: number;
  switch (assessment.severity) {
    case 'minimal': durationWeeks = 2; sessionsPerWeek = 3; break;
    case 'mild': durationWeeks = 3; sessionsPerWeek = 5; break;
    case 'moderate': durationWeeks = 4; sessionsPerWeek = 5; break;
    case 'severe': durationWeeks = 5; sessionsPerWeek = 5; break;
    case 'elephantiasis': durationWeeks = 6; sessionsPerWeek = 5; break;
    default: durationWeeks = 4; sessionsPerWeek = 5;
  }

  // MLD drainage sequence
  const upperLimbDrainageSequence = [
    'Abdominal breathing (diaphragmatic)',
    'Cervical lymph nodes — supraclavicular fossa',
    'Axillary nodes (unaffected side first)',
    'Trunk — lateral thorax to unaffected axilla (Anastomotic pathways)',
    'Upper arm — proximal to distal, medial then lateral',
    'Forearm — proximal to distal',
    'Hand & fingers — dorsum then palm',
    'Repeat in reverse — distal to proximal',
  ];
  
  const lowerLimbDrainageSequence = [
    'Abdominal breathing (diaphragmatic)',
    'Cervical lymph nodes — supraclavicular fossa',
    'Inguinal nodes (unaffected side first)',
    'Trunk — abdominal to contralateral inguinal (Anastomotic pathways)',
    'Thigh — proximal to distal, medial then lateral',
    'Knee — popliteal region',
    'Lower leg — proximal to distal',
    'Ankle & foot — dorsum then plantar',
    'Repeat in reverse — distal to proximal',
  ];

  const mldContraindications = [
    'Active cellulitis or acute infection (relative — defer MLD until antibiotics ×48h)',
    'Active malignancy in treatment area (absolute)',
    'Acute deep vein thrombosis',
    'Congestive cardiac failure (decompensated)',
    'Acute renal failure',
    'Superior vena cava obstruction (for upper limb)',
  ];

  // Multi-Layer Lymphedema Bandaging
  const bandagingLayers: BandagingLayer[] = [
    {
      layer: 1,
      material: 'Tubular stockinette',
      purpose: 'Skin protection, absorbs moisture',
      applicationNotes: 'Apply smoothly over entire limb with no wrinkles',
    },
    {
      layer: 2,
      material: 'Soft foam padding (Komprex/Rolta)',
      purpose: 'Even pressure distribution, protects bony prominences',
      applicationNotes: 'Extra padding over bony prominences (malleoli, fibular head). Fill concavities for even contour.',
    },
    {
      layer: 3,
      material: 'Foam chips/channeling pieces (if ISL Stage ≥2)',
      purpose: 'Break fibrotic tissue, channel fluid away',
      applicationNotes: 'Place over areas of fibrosis and tissue induration. Secure with stockinette.',
    },
    {
      layer: 4,
      material: 'Short-stretch bandages (6-8-10-12 cm widths)',
      purpose: 'Provide working pressure during muscle contraction, low resting pressure',
      applicationNotes: 'Apply distal to proximal in figure-of-8 or spiral. 50% overlap. Graduated pressure (highest distally). Fingers/toes wrapped individually.',
    },
    {
      layer: 5,
      material: 'Cohesive outer bandage',
      purpose: 'Secure all layers, maintain position',
      applicationNotes: 'Gentle spiral wrap from distal to proximal',
    },
  ];

  // Skin & Nail Care
  const skinCare = {
    cleansingProtocol: 'Wash with pH-balanced soap substitute (e.g., aqueous cream). Pat dry gently, especially between digits. Inspect all skin folds.',
    moisturizer: 'Apply low-pH emollient (aqueous cream or emollient with urea 10%) to entire limb after bathing, avoiding interdigital spaces.',
    antifungalProphylaxis: assessment.skinConditions.includes('fungal_infection') || assessment.islStage >= 2,
    woundCareIfNeeded: assessment.skinConditions.includes('ulceration')
      ? 'Clean with saline, apply appropriate wound dressing (non-adherent), re-assess at each session'
      : undefined,
    nailCare: 'Keep nails short and clean. Treat any onychomycosis. Avoid injury to nail bed.',
    inspectionFrequency: 'Every CDT session — document skin condition changes',
  };

  // Exercises
  const upperLimbExercises: LymphedemaExercise[] = [
    {
      name: 'Diaphragmatic Breathing',
      description: 'Lie supine. Inhale slowly through nose, expanding abdomen. Exhale through mouth. This activates the thoracic duct.',
      repetitions: '10 breaths',
      sets: 1,
      frequency: 'Start and end of each exercise session',
      category: 'breathing',
      precautions: ['Avoid Valsalva maneuver'],
    },
    {
      name: 'Shoulder Shrugs',
      description: 'Raise shoulders toward ears, hold 3 seconds, relax. Activates cervical lymph flow.',
      repetitions: '10',
      sets: 2,
      frequency: 'Twice daily with bandaging on',
      category: 'proximal_joint',
      precautions: ['Avoid if acute shoulder pathology'],
    },
    {
      name: 'Shoulder Circles',
      description: 'Slowly circle shoulders forward then backward.',
      repetitions: '10 each direction',
      sets: 2,
      frequency: 'Twice daily',
      category: 'proximal_joint',
      precautions: [],
    },
    {
      name: 'Elbow Flexion/Extension',
      description: 'With arm supported, slowly bend and straighten elbow.',
      repetitions: '15',
      sets: 2,
      frequency: 'Twice daily',
      category: 'proximal_joint',
      precautions: ['Move within comfortable range'],
    },
    {
      name: 'Wrist Pumps',
      description: 'Flex and extend wrist rhythmically.',
      repetitions: '20',
      sets: 2,
      frequency: 'Every 2 hours while awake',
      category: 'distal_joint',
      precautions: [],
    },
    {
      name: 'Finger Squeeze',
      description: 'Open and close fist firmly. Use soft ball if tolerated.',
      repetitions: '15',
      sets: 3,
      frequency: 'Every 2 hours while awake',
      category: 'distal_joint',
      precautions: ['Avoid if hand wounds present'],
    },
    {
      name: 'Wall Push-ups',
      description: 'Stand arm\'s length from wall. Lean toward wall bending elbows, push back.',
      repetitions: '10',
      sets: 2,
      frequency: 'Once daily',
      category: 'resistance',
      precautions: ['Progress gradually', 'Maintain bandaging during exercise'],
    },
  ];

  const lowerLimbExercises: LymphedemaExercise[] = [
    {
      name: 'Diaphragmatic Breathing',
      description: 'Lie supine. Inhale slowly through nose, expanding abdomen. Exhale through mouth.',
      repetitions: '10 breaths',
      sets: 1,
      frequency: 'Start and end of each exercise session',
      category: 'breathing',
      precautions: [],
    },
    {
      name: 'Ankle Pumps (Dorsi/Plantar flexion)',
      description: 'Pull toes toward shin, then point toes away. Critical calf-muscle pump activator.',
      repetitions: '30',
      sets: 3,
      frequency: 'Every 2 hours while awake',
      category: 'distal_joint',
      precautions: [],
    },
    {
      name: 'Ankle Circles',
      description: 'Rotate foot clockwise then counterclockwise.',
      repetitions: '10 each direction',
      sets: 2,
      frequency: 'Twice daily',
      category: 'distal_joint',
      precautions: [],
    },
    {
      name: 'Knee Flexion/Extension (Seated)',
      description: 'Sitting, slowly straighten knee, hold 5 seconds, lower.',
      repetitions: '15 each leg',
      sets: 2,
      frequency: 'Twice daily',
      category: 'proximal_joint',
      precautions: ['Avoid locking knee at full extension'],
    },
    {
      name: 'Hip Abduction (Lying)',
      description: 'Lie on back, slide affected leg outward along bed, then back.',
      repetitions: '10',
      sets: 2,
      frequency: 'Once daily',
      category: 'proximal_joint',
      precautions: ['Support leg if heavy'],
    },
    {
      name: 'Marching in Place',
      description: 'Lift knees alternately while standing (hold support if needed).',
      repetitions: '2 minutes',
      sets: 3,
      frequency: 'Twice daily',
      category: 'aerobic',
      precautions: ['With bandaging/garment on', 'Stop if dizzy'],
    },
    {
      name: 'Stationary Cycling',
      description: 'Low resistance cycling for 10-15 minutes.',
      repetitions: '10-15 minutes',
      sets: 1,
      frequency: 'Daily if available',
      category: 'aerobic',
      precautions: ['Low resistance only', 'With compression on'],
    },
  ];

  const exercises = isUpper ? upperLimbExercises : lowerLimbExercises;

  // Volume reduction target
  let volumeReductionTarget: number;
  switch (assessment.severity) {
    case 'minimal': volumeReductionTarget = 80; break;
    case 'mild': volumeReductionTarget = 60; break;
    case 'moderate': volumeReductionTarget = 50; break;
    case 'severe': volumeReductionTarget = 40; break;
    case 'elephantiasis': volumeReductionTarget = 30; break;
    default: volumeReductionTarget = 50;
  }

  // Weekly milestones
  const milestones: CDTMilestone[] = [];
  for (let week = 1; week <= durationWeeks; week++) {
    const expectedReduction = Math.round((volumeReductionTarget / durationWeeks) * week);
    milestones.push({
      weekNumber: week,
      expectedVolumeReductionPercent: expectedReduction,
      assessmentChecklist: [
        'Circumferential measurements at all standard points',
        'Skin condition assessment',
        'Patient compliance review',
        'Pain and heaviness scores',
        ...(week === 1 ? ['Baseline photos'] : []),
        ...(week === durationWeeks ? ['Final photos', 'Garment measurement for Phase 2'] : []),
      ],
      adjustmentCriteria: [
        `<${Math.round(expectedReduction * 0.5)}% reduction → Increase session frequency or duration`,
        'New skin breakdown → Modify bandaging technique',
        'Infection signs → Pause CDT, treat infection first',
        ...(week >= 3 ? ['Plateau in reduction → Evaluate for additional interventions'] : []),
      ],
    });
  }

  return {
    durationWeeks,
    sessionsPerWeek,
    mld: {
      technique: 'vodder',
      sessionDurationMinutes: isUpper ? 40 : 50,
      drainageSequence: isUpper ? upperLimbDrainageSequence : lowerLimbDrainageSequence,
      contraindications: mldContraindications,
      precautions: [
        'Light pressure only (≈30-40 mmHg working pressure)',
        'Slow, rhythmic movements',
        'Always clear proximal regions before distal',
        'Observe for patient discomfort',
      ],
    },
    bandaging: {
      type: 'multi_layer',
      layers: bandagingLayers,
      applicationProtocol: 'Applied after each MLD session. Patient wears until next session.',
      wearSchedule: '23 hours/day — remove only for bathing and MLD session',
      pressureGradient: 'Graduated distal-to-proximal pressure (highest at fingers/toes, decreasing proximally)',
      paddingMaterials: ['Stockinette', 'Foam padding', 'Foam chips', 'Short-stretch bandages', 'Cohesive bandage'],
      recheckFrequency: 'At each CDT session — assess for slippage, pressure areas, neurovascular compromise',
    },
    skinCare,
    exercises: {
      exerciseList: exercises,
      frequency: '2× daily during CDT Phase 1 (with bandages on)',
      precautions: [
        'Always exercise WITH compression bandaging on',
        'Stop if pain or numbness occurs',
        'Gradual progression only',
        'Report any new swelling to therapist',
      ],
      progressionCriteria: [
        'Tolerated current level for ≥3 sessions',
        'No increase in limb measurements post-exercise',
        'Patient reports manageable fatigue only',
      ],
    },
    volumeReductionTargetPercent: volumeReductionTarget,
    expectedOutcome: `Expected ${volumeReductionTarget}% reduction of excess volume over ${durationWeeks} weeks of intensive CDT. Actual outcome depends on tissue composition (fluid vs fibrotic), patient compliance, and comorbidities.`,
    milestonesWeekly: milestones,
  };
}

// ==================== CDT MAINTENANCE PHASE PROTOCOL ====================

export function generateCDTMaintenancePlan(
  assessment: {
    affectedLimb: LymphedemaLimb;
    severity: LymphedemaSeverity;
    islStage: ISLStage;
    bmi: number;
  }
): CDTMaintenancePlan {
  const isUpper = assessment.affectedLimb.includes('upper');

  // Compression class based on severity
  let compressionClass: 'class1_15_21' | 'class2_23_32' | 'class3_34_46' | 'class4_49_plus';
  let garmentType: 'flat_knit' | 'circular_knit' | 'custom_made';
  
  switch (assessment.severity) {
    case 'minimal':
    case 'mild':
      compressionClass = 'class2_23_32';
      garmentType = 'circular_knit';
      break;
    case 'moderate':
      compressionClass = 'class2_23_32';
      garmentType = 'flat_knit';
      break;
    case 'severe':
      compressionClass = 'class3_34_46';
      garmentType = 'flat_knit';
      break;
    case 'elephantiasis':
      compressionClass = 'class4_49_plus';
      garmentType = 'custom_made';
      break;
    default:
      compressionClass = 'class2_23_32';
      garmentType = 'flat_knit';
  }

  const garmentDescription = isUpper
    ? `${garmentType === 'flat_knit' ? 'Flat-knit' : garmentType === 'custom_made' ? 'Custom-made' : 'Circular-knit'} compression sleeve with gauntlet/glove`
    : `${garmentType === 'flat_knit' ? 'Flat-knit' : garmentType === 'custom_made' ? 'Custom-made' : 'Circular-knit'} compression stocking (thigh-high or pantyhose style)`;

  const followUpSchedule: FollowUpAppointment[] = [
    { weekNumber: 2, purpose: 'Garment fit check & compliance review', assessments: ['Circumferential measurements', 'Garment assessment'], location: 'Lymphedema clinic' },
    { weekNumber: 4, purpose: 'Month 1 review', assessments: ['Full measurements', 'Skin assessment', 'QoL score'], location: 'Lymphedema clinic' },
    { weekNumber: 8, purpose: 'Month 2 review', assessments: ['Measurements', 'Treatment compliance'], location: 'Lymphedema clinic' },
    { weekNumber: 12, purpose: 'Month 3 comprehensive review', assessments: ['Full measurements', 'Volume calculation', 'Skin assessment', 'Functional assessment', 'QoL assessment', 'Treatment plan review'], location: 'Lymphedema clinic' },
    { weekNumber: 24, purpose: 'Month 6 review', assessments: ['Full measurements', 'Garment replacement if needed', 'Surgical candidacy re-evaluation if indicated'], location: 'Lymphedema clinic' },
    { weekNumber: 52, purpose: 'Annual comprehensive review', assessments: ['Complete re-staging', 'All scoring', 'Investigations if needed', 'Long-term plan revision'], location: 'Lymphedema clinic' },
  ];

  return {
    compressionGarment: {
      type: garmentType,
      compressionClass,
      garmentDescription,
      wearSchedule: 'All waking hours. Consider night garment (lower compression) for severe cases.',
      replacementFrequencyMonths: 4,
      fitCheckFrequency: 'At each follow-up visit, or sooner if ill-fitting',
    },
    selfMLD: {
      technique: 'Simplified self-drainage taught during Phase 1',
      frequency: 'Daily, ideally in the evening before bed',
      durationMinutes: isUpper ? 15 : 20,
      bodyRegions: isUpper
        ? ['Neck/supraclavicular', 'Trunk', 'Upper arm', 'Forearm', 'Hand']
        : ['Abdomen', 'Trunk', 'Thigh', 'Lower leg', 'Foot'],
      instructionProvided: true,
    },
    exerciseProgram: {
      exercises: generateCDTIntensivePlan({
        islStage: assessment.islStage,
        affectedLimb: assessment.affectedLimb,
        volumeExcessPercent: 0,
        skinConditions: [],
        tissueConsistency: 'soft_pitting',
        severity: assessment.severity,
        comorbidities: [],
      }).exercises.exerciseList,
      frequency: 'Daily, with compression garment on',
      activityRestrictions: [
        'Avoid heavy lifting with affected limb (upper) / prolonged standing (lower)',
        'Avoid extreme heat (saunas, hot tubs)',
        'Avoid restrictive clothing/jewelry on affected limb',
        'Avoid blood draws, injections, BP measurement on affected arm (upper limb)',
      ],
      encouragedActivities: [
        'Swimming (compression after exiting water)',
        'Walking',
        'Low-impact cycling',
        'Yoga (modified)',
        'Light resistance training (progressive)',
      ],
    },
    skinCareRegimen: {
      dailySkinCare: 'Wash with pH-balanced soap substitute. Pat dry. Moisturize within 3 minutes of bathing.',
      moisturizerType: 'Low-pH emollient (aqueous cream, urea 10% cream). Avoid fragranced products.',
      signToWatch: [
        'Redness / warmth (cellulitis)',
        'Breaks in skin',
        'Fungal infection between toes/fingers',
        'Increasing hardness of skin',
        'Weeping lymph fluid',
        'New lumps or swellings',
      ],
      skinInspectionFrequency: 'Daily — inspect entire affected limb',
    },
    weightManagement: {
      targetBMI: assessment.bmi > 30 ? 25 : assessment.bmi,
      dietaryGuidance: [
        'Balanced diet rich in fruits, vegetables, lean protein',
        'Reduce sodium intake (<2g/day) to minimize fluid retention',
        'Adequate protein for tissue health (1g/kg/day)',
        'Stay well-hydrated (≥2L water/day)',
        'Avoid excess alcohol',
      ],
      exerciseAdvice: '150 minutes/week moderate activity with compression garment',
    },
    followUpSchedule,
    escalationCriteria: [
      'Limb circumference increase >2cm at any point',
      'Volume increase >10% from maintenance baseline',
      'New episode of cellulitis',
      'Skin breakdown or persistent lymphorrhea',
      'Severe pain or functional decline',
      'Non-response to self-management for >2 weeks',
      'Garment no longer fits despite replacement',
    ],
  };
}

// ==================== SURGICAL CANDIDACY - DEBULKING CRITERIA ====================

/**
 * Evaluate surgical debulking candidacy
 * Based on ISL, ILF, and published debulking criteria
 */
export function evaluateDebulkingCandidacy(
  assessment: {
    islStage: ISLStage;
    tissueConsistency: TissueConsistency;
    volumeExcessPercent: number;
    volumeExcessMl: number;
    episodesOfCellulitisPerYear: number;
    functionalImpairment: number;
    psychosocialImpact: string;
    bmi: number;
    hasActiveInfection: boolean;
    abpiIfLower?: number;
    cdtMonths: number;
    cdtVolumeReductionPercent: number;
    patientMotivated: boolean;
  }
): DebulkingCriteria {
  const criteria = {
    cdtCompletedMinimum6Months: assessment.cdtMonths >= 6,
    failedToRespondToCDT: assessment.cdtVolumeReductionPercent < 20,
    islStage2LateOrAbove: assessment.islStage === '2_late' || assessment.islStage === 3,
    predominantlyFibrous: assessment.tissueConsistency === 'fibrotic' || assessment.tissueConsistency === 'woody_hard',
    significantFunctionalImpairment: assessment.functionalImpairment >= 2,
    recurrentInfectionsDespiteProphylaxis: assessment.episodesOfCellulitisPerYear >= 3,
    bmiBelow40: assessment.bmi < 40,
    noActiveInfection: !assessment.hasActiveInfection,
    adequateArterialSupply: assessment.abpiIfLower ? assessment.abpiIfLower > 0.8 : true,
    patientMotivatedForPostOpCompression: assessment.patientMotivated,
  };

  const criteriaMet = Object.values(criteria).filter(Boolean).length;
  const totalRequired = 7;
  const meetsThreshold = criteriaMet >= totalRequired;

  return {
    ...criteria,
    skinChangesScore: 0,
    volumeExcessMl: assessment.volumeExcessMl,
    volumeExcessPercent: assessment.volumeExcessPercent,
    frequencyOfCellulitisPerYear: assessment.episodesOfCellulitisPerYear,
    functionalDebt: `Functional impairment score: ${assessment.functionalImpairment}/4`,
    psychosocialImpact: assessment.psychosocialImpact,
    totalCriteriaMet: criteriaMet,
    totalCriteriaRequired: totalRequired,
    meetsThreshold,
    clinicianJustification: meetsThreshold
      ? `Patient meets ${criteriaMet}/${Object.keys(criteria).length} debulking criteria (threshold: ${totalRequired}). Surgical debulking is recommended after MDT discussion.`
      : `Patient meets ${criteriaMet}/${Object.keys(criteria).length} debulking criteria (threshold: ${totalRequired}). Continue conservative management. Re-evaluate in 3 months.`,
  };
}

// ==================== SURGICAL PLAN GENERATION ====================

export function generateSurgicalPlan(
  procedureType: SurgicalProcedureType,
  assessment: {
    affectedLimb: LymphedemaLimb;
    islStage: ISLStage;
    volumeExcessMl: number;
    volumeExcessPercent: number;
    skinConditions: SkinCondition[];
    severity: LymphedemaSeverity;
  },
  surgeonName: string
): SurgicalPlan {
  const isLower = assessment.affectedLimb.includes('lower');

  // Procedure-specific details
  const procDetailsMap: Record<SurgicalProcedureType, string> = {
    debulking_charles: 'Charles procedure: Radical excision of all skin and subcutaneous tissue down to deep fascia. Split-thickness skin graft applied from excised tissue or donor site. Reserved for severe elephantiasis.',
    debulking_thompson: 'Thompson (modified) procedure: Excision of subcutaneous tissue with buried dermal flap into muscle compartment to create lymphatic drainage bridge. Preserves skin where possible.',
    debulking_sistrunk: 'Staged excision: Sequential removal of subcutaneous tissue in controlled stages (medial then lateral, or proximal then distal). Allows tissue adaptation between stages.',
    debulking_suction_assisted: 'Suction-assisted lipectomy (SAL): Circumferential liposuction under tourniquet control to remove fibrotic/adipose tissue. Requires lifelong compression garment post-operatively.',
    physiological_lva: 'Lymphovenous anastomosis (LVA): Microsurgical connection of lymphatic vessels to nearby venules. Bypasses obstructed lymphatic pathways. Requires ICG lymphography to identify patent lymphatics.',
    physiological_vlnt: 'Vascularized lymph node transfer (VLNT): Transfer of healthy lymph nodes (from groin, submental, lateral thoracic) to affected area with microvascular anastomosis. Aims to restore lymphatic function.',
    combined: 'Combined approach: Debulking procedure with physiological reconstruction. Staged as appropriate.',
  };

  // Pre-operative investigations
  const preOpInvestigations = [
    'Full blood count, U&E, LFT, coagulation screen',
    'Chest X-ray, ECG (if >40 years or cardiac history)',
    'Duplex ultrasound (exclude DVT, assess venous competence)',
    ...(isLower ? ['ABPI measurement (>0.8 required)'] : []),
    'Group and Save (crossmatch if extensive debulking)',
    'Wound swab if active skin lesions',
    ...(procedureType.includes('physiological') ? ['ICG lymphography', 'MRI lymphangiography'] : []),
    'Lymphoscintigraphy (if not already done)',
    'Nutritional assessment (albumin ≥30g/L)',
    'Anaesthetic assessment',
  ];

  // Post-operative protocol
  const postOpProtocol: PostOperativeProtocol = {
    immediateCare: {
      positioningInstructions: `Elevate affected limb 30° above heart level. ${isLower ? 'Bed rest with leg elevation for first 48 hours.' : 'Arm supported on pillows at heart level or above.'}`,
      drainManagement: 'Closed suction drains in situ. Monitor output hourly for first 6h, then 4-hourly. Record volume and character.',
      woundCareProtocol: 'Bulky non-adherent dressing. Do NOT apply compression over fresh surgical site for first 24-48h. Check dressings for strike-through.',
      painManagement: 'Multimodal: Regular paracetamol + NSAID (if no contraindication) + PCA/PRN opioid for first 24-48h. Transition to oral analgesics when tolerating oral intake.',
      antibioticRegimen: 'IV Co-amoxiclav 1.2g TDS for 48h → PO Amoxicillin-clavulanate 625mg TDS × 7 days. Flucloxacillin 1g QDS if penicillin-sensitive cellulitis history.',
      thromboprophylaxis: `LMWH (Enoxaparin 40mg SC OD) + ${isLower ? 'contralateral TED stocking' : 'bilateral TED stockings'}. Continue until fully mobile.`,
      monitoringFrequency: 'twice_daily',
      vitalSignsFrequency: 'Q4h for first 24h, then Q8h if stable',
      limbCheckFrequency: 'Q2h for first 12h — assess colour, warmth, capillary refill, sensation, pulses distal to surgical site',
    },
    earlyCare: {
      woundCareContinued: 'Clean dressings every 48h or as needed. Inspect for infection, haematoma, wound edge necrosis.',
      drainRemovalCriteria: 'Remove when output <30mL/24h for 2 consecutive days. Typically Day 3-7.',
      mobilizationProtocol: isLower
        ? 'Day 1: Ankle pumps in bed. Day 2: Sit out of bed. Day 3: Short walks with support and compression. Progressive increase.'
        : 'Day 1: Gentle finger/wrist exercises. Day 2: Elbow exercises. Shoulder exercises from Day 3.',
      compressionInitiation: 'Light compression (Class 1) once wounds assessed as healing (typically Day 2-5). Graduated increase over 2 weeks.',
      physioReferral: true,
      sutureRemovalDay: procedureType === 'debulking_charles' ? 14 : 10,
    },
    intermediateCare: {
      woundHealingAssessment: 'Week 2: Suture/staple removal. Assess wound edges, any areas of delayed healing. Photograph.',
      compressionGarmentFitting: 'Week 3-4: Measure and order definitive compression garment (flat-knit, custom). Interim bandaging continues.',
      exerciseProgression: 'Gradual return to CDT exercise program. Supervised initially, then independent.',
      returnToActivities: 'Light ADLs from Week 2. Moderate activity from Week 4. Full activity from Week 6-8 (individualized).',
      followUpSchedule: 'Weekly wound check × 4 weeks post-op',
    },
    lateCare: {
      garmentReview: 'Month 2: Definitive garment fitting. Ensure correct compression class and fit.',
      volumeReassessment: 'Month 3: Full circumferential measurements. Compare to pre-operative and immediate post-operative baseline.',
      functionalAssessment: 'Month 3: Functional impact scoring. ROM assessment.',
      furtherSurgeryAssessment: procedureType.includes('sistrunk')
        ? 'Month 3: Assess readiness for next stage if staged procedure planned.'
        : 'Month 6: Evaluate need for revision or additional procedure.',
      longTermCompressionPlan: 'Lifelong compression garment use is MANDATORY after surgical debulking. Non-compliance leads to recurrence. Replace garments every 4-6 months.',
    },
    complications: [
      { complication: 'Wound infection', riskLevel: 'medium', prevention: 'Prophylactic antibiotics, meticulous skin prep', monitoring: 'Daily wound inspection, temperature', management: 'Wound swab, targeted antibiotics, wound care' },
      { complication: 'Haematoma / seroma', riskLevel: 'medium', prevention: 'Meticulous haemostasis, drain placement', monitoring: 'Drain output, limb swelling', management: 'Ultrasound-guided aspiration if significant' },
      { complication: 'Skin graft failure (Charles)', riskLevel: 'high', prevention: 'Adequate haemostasis, secure dressing, immobilization', monitoring: 'Graft colour, adherence (Day 5 first look)', management: 'Re-grafting if >30% graft loss' },
      { complication: 'Wound dehiscence', riskLevel: 'medium', prevention: 'Tension-free closure, nutritional optimization', monitoring: 'Daily wound assessment', management: 'Secondary intention healing or re-closure' },
      { complication: 'Deep vein thrombosis', riskLevel: 'medium', prevention: 'LMWH, TED stockings, early mobilization', monitoring: 'Clinical signs, D-dimer if suspicious', management: 'Duplex US → anticoagulation' },
      { complication: 'Lymphorrhea (persistent)', riskLevel: 'medium', prevention: 'Careful lymphatic ligation', monitoring: 'Wound output character', management: 'Compression, wound care, may need surgical exploration' },
      { complication: 'Recurrence of swelling', riskLevel: 'high', prevention: 'Lifelong compression compliance', monitoring: 'Regular measurements', management: 'Return to CDT intensive phase, garment review' },
      { complication: 'Skin necrosis', riskLevel: 'medium', prevention: 'Atraumatic tissue handling, adequate blood supply', monitoring: 'Skin colour and viability checks', management: 'Debridement, VAC therapy, possible re-grafting' },
    ],
    redFlags: [
      '🔴 Signs of compartment syndrome: increasing pain, tense limb, pain on passive stretch',
      '🔴 Absent distal pulses or sudden colour change',
      '🔴 Temperature >38.5°C with wound erythema spreading >2cm/hour',
      '🔴 Unexpected large drain output (>200mL in 4 hours)',
      '🔴 Acute onset dyspnoea (rule out PE)',
      '🔴 Wound dehiscence with exposed deep structures',
      '🔴 Acute deterioration in mental status',
    ],
  };

  // Staged plan for staged procedures
  const stages = procedureType === 'debulking_sistrunk'
    ? [
      { stageNumber: 1, description: 'Medial aspect excision', areaToAddress: 'Medial limb', intervalWeeks: 12, plannedDate: undefined, completedDate: undefined, outcome: undefined },
      { stageNumber: 2, description: 'Lateral aspect excision', areaToAddress: 'Lateral limb', intervalWeeks: 12, plannedDate: undefined, completedDate: undefined, outcome: undefined },
      { stageNumber: 3, description: 'Revision if needed', areaToAddress: 'Any residual excess or contour irregularity', intervalWeeks: 24, plannedDate: undefined, completedDate: undefined, outcome: undefined },
    ]
    : undefined;

  return {
    procedureType,
    procedureDetails: procDetailsMap[procedureType],
    stages,
    preOperativeRequirements: [
      'Minimum 6 months of CDT (documented)',
      'Active infection resolved ≥4 weeks prior',
      'Optimized nutrition (albumin ≥30g/L)',
      'BMI <40 (ideally <35)',
      'Smoking cessation ≥6 weeks (if applicable)',
      'Written informed consent',
      'Compression garments ordered for post-operative use',
      'MDT agreement documented',
    ],
    preOperativeCDTWeeks: 4,
    preOperativeInvestigations: preOpInvestigations,
    estimatedDurationHours: procedureType === 'debulking_charles' ? 4 : procedureType.includes('physiological') ? 6 : 3,
    anesthesiaType: procedureType.includes('physiological') ? 'General anaesthesia' : isLower ? 'Spinal/Epidural or General' : 'General anaesthesia',
    antibioticProphylaxis: 'IV Co-amoxiclav 1.2g at induction + 2 further doses at 8h intervals',
    expectedBloodLoss: procedureType === 'debulking_charles' ? '500-1500mL (crossmatch 2 units)' : '200-600mL (group & save)',
    drainageRequired: true,
    postOperativePlan: postOpProtocol,
    surgeonName,
    plannedDate: undefined,
  };
}

// ==================== INFECTION CONTROL PROTOCOL ====================

export function generateInfectionControlPlan(
  skinConditions: SkinCondition[],
  episodesOfCellulitisPerYear: number,
  etiology: LymphedemaEtiology
): InfectionControlPlan {
  const hasActiveCellulitis = skinConditions.includes('cellulitis_active');
  const hasFungal = skinConditions.includes('fungal_infection');
  const hasUlcer = skinConditions.includes('ulceration');
  const hasLymphorrhea = skinConditions.includes('lymphorrhea');
  
  const hasAnyInfection = hasActiveCellulitis || hasFungal || hasUlcer;

  let infectionType: 'cellulitis' | 'fungal' | 'lymphorrhea' | 'ulcer_infection' | 'multiple' = 'cellulitis';
  if ((hasActiveCellulitis && (hasFungal || hasUlcer)) || (hasFungal && hasUlcer)) {
    infectionType = 'multiple';
  } else if (hasFungal) {
    infectionType = 'fungal';
  } else if (hasLymphorrhea) {
    infectionType = 'lymphorrhea';
  } else if (hasUlcer) {
    infectionType = 'ulcer_infection';
  }

  return {
    hasActiveInfection: hasAnyInfection,
    infectionType,
    antibioticRegimen: hasActiveCellulitis
      ? 'Amoxicillin-clavulanate 625mg TDS × 14 days (or IV if severe). ALTERNATIVE: Clindamycin 300mg QDS if penicillin allergy'
      : 'Not currently indicated',
    antifungalRegimen: hasFungal
      ? 'Terbinafine cream BD to affected areas × 2 weeks, then OD × 2 weeks. Oral terbinafine 250mg OD × 6 weeks if extensive.'
      : undefined,
    woundCareProtocol: hasUlcer || hasLymphorrhea
      ? 'Saline cleansing → non-adherent dressing → absorbent pad → light compression. Re-dress every 1-2 days.'
      : undefined,
    skinHygieneProtocol: 'Wash with pH-balanced soap substitute. Pat dry thoroughly (especially between digits). Moisturize with low-pH emollient.',
    durationDays: hasActiveCellulitis ? 14 : hasFungal ? 28 : hasUlcer ? 14 : 7,
    prophylaxisRecommended: episodesOfCellulitisPerYear >= 2,
    prophylaxisRegimen: episodesOfCellulitisPerYear >= 2
      ? 'Phenoxymethylpenicillin (Penicillin V) 250mg BD long-term (minimum 2 years). ALTERNATIVE: Erythromycin 250mg BD if penicillin allergy.'
      : undefined,
    notes: [
      hasActiveCellulitis ? '⚠️ CDT must be DEFERRED until cellulitis resolved (usually ≥48h on antibiotics with improving symptoms). Elevation and antibiotics first.' : '',
      hasFungal ? 'Treat tinea pedis/interdigital fungal infection BEFORE starting CDT bandaging.' : '',
      etiology === 'secondary_infection' ? 'Consider filariasis testing (blood film, antigen test) if in endemic area.' : '',
      episodesOfCellulitisPerYear >= 2 ? '⚠️ Recurrent cellulitis (≥2/year) — long-term antibiotic prophylaxis indicated per CREST/BLS guidelines.' : '',
    ].filter(Boolean).join(' '),
  };
}

// ==================== TREATMENT TIMELINE GENERATION ====================

/**
 * Generate complete treatment timeline from assessment through long-term maintenance
 */
export function generateTreatmentTimeline(
  assessment: {
    islStage: ISLStage;
    severity: LymphedemaSeverity;
    hasActiveInfection: boolean;
    skinConditions: SkinCondition[];
    cdtIntensiveWeeks: number;
    isSurgicalCandidate: boolean;
    surgicalProcedure?: SurgicalProcedureType;
  }
): TreatmentTimeline {
  const phases: TimelinePhase[] = [];
  const milestones: TimelineMilestone[] = [];
  let currentWeek = 0;

  // Phase 0: Infection Control (if active)
  if (assessment.hasActiveInfection) {
    phases.push({
      phase: 'infection_control',
      label: 'Phase 0: Infection Control',
      startWeek: currentWeek,
      durationWeeks: 2,
      description: 'Treat active cellulitis/fungal infection before starting CDT. Limb elevation, antibiotics, skin hygiene.',
      goals: [
        'Resolve active infection',
        'Reduce inflammation',
        'Prepare skin for CDT',
      ],
      activities: [
        'Systemic antibiotics (oral or IV depending on severity)',
        'Antifungal treatment if indicated',
        'Limb elevation',
        'Skin hygiene protocol',
        'Wound care if ulceration present',
      ],
      monitoringFrequency: 'daily',
      exitCriteria: [
        'No clinical signs of active infection for ≥48 hours',
        'Temperature normal for ≥48 hours',
        'Skin integrity sufficient for bandaging',
        'Antibiotic course completed (or at minimum 48h with improvement)',
      ],
    });
    milestones.push({
      weekNumber: currentWeek + 1,
      milestone: 'Infection control review — can CDT begin?',
      assessmentRequired: true,
      decisionPoint: true,
      description: 'Clinical assessment to determine if infection is sufficiently controlled to begin CDT.',
    });
    currentWeek += 2;
  }

  // Phase 1: CDT Intensive
  const cdtWeeks = assessment.cdtIntensiveWeeks;
  phases.push({
    phase: 'cdt_intensive',
    label: 'Phase 1: CDT Intensive (Decongestive Phase)',
    startWeek: currentWeek,
    durationWeeks: cdtWeeks,
    description: `${cdtWeeks} weeks of daily CDT sessions: Manual Lymphatic Drainage (MLD), Multi-Layer Lymphedema Bandaging (MLLB), skin care, and remedial exercises.`,
    goals: [
      `Achieve ≥40-60% reduction of excess limb volume`,
      'Soften fibrotic tissue',
      'Improve skin condition',
      'Educate patient in self-management',
      'Determine garment requirements',
    ],
    activities: [
      'MLD: 40-50 minutes, 5 days/week',
      'MLLB: Applied after each MLD session, worn 23h/day',
      'Skin care: At each session',
      'Exercises: 2× daily with bandages on',
      'Weekly circumferential measurements',
      'Patient education on self-MLD and bandaging',
    ],
    monitoringFrequency: 'daily',
    exitCriteria: [
      'Volume reduction plateau (no further reduction over 2 consecutive weeks)',
      'Target volume reduction achieved',
      'All assigned sessions completed',
      'Patient competent in self-management skills',
      'Compression garment measured and ordered',
    ],
  });
  milestones.push(
    {
      weekNumber: currentWeek + 1,
      milestone: 'Week 1 CDT review — early response assessment',
      assessmentRequired: true,
      decisionPoint: false,
      description: 'Baseline measurements comparison. Adjust bandaging technique if needed.',
    },
    {
      weekNumber: currentWeek + Math.floor(cdtWeeks / 2),
      milestone: 'Mid-CDT review — treatment response evaluation',
      assessmentRequired: true,
      decisionPoint: true,
      description: 'If <20% volume reduction at midpoint, review technique, compliance, and consider investigation for underlying obstruction.',
    },
    {
      weekNumber: currentWeek + cdtWeeks,
      milestone: 'End of CDT Intensive — transition to maintenance',
      assessmentRequired: true,
      decisionPoint: true,
      description: 'Full re-assessment. Garment fitting. Decision: maintenance CDT vs surgical evaluation.',
    }
  );
  currentWeek += cdtWeeks;

  // Phase 2: CDT Maintenance
  phases.push({
    phase: 'cdt_maintenance',
    label: 'Phase 2: CDT Maintenance (Self-Management Phase)',
    startWeek: currentWeek,
    durationWeeks: assessment.isSurgicalCandidate ? 20 : 52, // If surgical, 5 months; otherwise ongoing 1yr cycle
    description: 'Patient-led self-management with compression garment, daily self-MLD, exercises, and skin care. Regular clinical follow-up.',
    goals: [
      'Maintain volume reduction achieved in Phase 1',
      'Prevent complications (cellulitis, skin breakdown)',
      'Optimize limb function',
      'Monitor for progression',
    ],
    activities: [
      'Compression garment worn all waking hours',
      'Self-MLD: 15-20 minutes daily',
      'Exercise program: Daily with compression',
      'Skin care: Daily',
      'Weight management',
    ],
    monitoringFrequency: 'monthly',
    exitCriteria: assessment.isSurgicalCandidate
      ? [
        'CDT maintenance established ≥5 months',
        'Surgical candidacy re-confirmed',
        'Pre-operative preparation complete',
      ]
      : [
        'Stable measurements for ≥3 months',
        'Good compliance maintained',
        'No complications',
        '(This phase is lifelong with annual comprehensive review)',
      ],
  });
  
  if (assessment.isSurgicalCandidate) {
    milestones.push({
      weekNumber: currentWeek + 12,
      milestone: 'Month 3 maintenance review — surgical candidacy re-evaluation',
      assessmentRequired: true,
      decisionPoint: true,
      description: 'Full re-assessment. If volume reduction <20% despite compliance, confirm surgical pathway.',
    });
  }

  milestones.push({
    weekNumber: currentWeek + 24,
    milestone: 'Month 6 comprehensive review',
    assessmentRequired: true,
    decisionPoint: true,
    description: 'Full staging, scoring, and treatment plan review. Surgical evaluation if indicated.',
  });
  currentWeek += assessment.isSurgicalCandidate ? 20 : 52;

  // Surgical pathway phases (if applicable)
  if (assessment.isSurgicalCandidate) {
    // Pre-operative phase
    phases.push({
      phase: 'pre_operative',
      label: 'Pre-Operative Preparation',
      startWeek: currentWeek,
      durationWeeks: 4,
      description: 'Final pre-operative CDT, investigations, nutrition optimization, and surgical planning.',
      goals: [
        'Maximize limb volume reduction before surgery',
        'Clear all investigations',
        'Optimize nutritional status',
        'Informed consent',
      ],
      activities: [
        'Intensive CDT (4 weeks)',
        'Pre-operative investigations',
        'Anaesthetic review',
        'Nutritional optimization',
        'Compression garment ordered for post-op',
        'Patient education on post-op expectations',
      ],
      monitoringFrequency: 'daily',
      exitCriteria: [
        'All investigations satisfactory',
        'No active infection',
        'Albumin ≥30g/L',
        'Informed consent signed',
        'Post-operative compression ordered',
      ],
    });
    currentWeek += 4;

    // Surgery week
    phases.push({
      phase: 'intra_operative',
      label: 'Surgical Debulking',
      startWeek: currentWeek,
      durationWeeks: 1,
      description: `Surgical procedure: ${assessment.surgicalProcedure || 'To be determined'}`,
      goals: ['Safe excision of fibrotic/excess tissue', 'Preservation of viable skin and function'],
      activities: ['Surgical procedure', 'Immediate post-operative care'],
      monitoringFrequency: 'twice_daily',
      exitCriteria: ['Surgery completed without complication', 'Stable in immediate post-operative period'],
    });
    currentWeek += 1;

    // Post-operative acute
    phases.push({
      phase: 'post_operative_acute',
      label: 'Post-Operative Acute Recovery',
      startWeek: currentWeek,
      durationWeeks: 2,
      description: 'Wound management, drain care, early mobilization, and initiation of gentle compression.',
      goals: [
        'Wound healing',
        'Drain management',
        'Pain control',
        'DVT prophylaxis',
        'Early mobilization',
      ],
      activities: [
        'Wound care every 48h',
        'Drain monitoring and removal when criteria met',
        'Limb elevation',
        'Gentle exercises',
        'Light compression from Day 2-5',
        'LMWH thromboprophylaxis',
      ],
      monitoringFrequency: 'twice_daily',
      exitCriteria: [
        'Drains removed',
        'Wounds healing',
        'No signs of infection',
        'Patient mobilizing',
        'Tolerating light compression',
      ],
    });
    milestones.push({
      weekNumber: currentWeek + 2,
      milestone: 'Post-op Day 14 — suture removal & wound assessment',
      assessmentRequired: true,
      decisionPoint: false,
      description: 'Suture/staple removal. Wound assessment. Begin garment fitting process.',
    });
    currentWeek += 2;

    // Post-operative rehabilitation
    phases.push({
      phase: 'post_operative_rehabilitation',
      label: 'Post-Operative Rehabilitation',
      startWeek: currentWeek,
      durationWeeks: 10,
      description: 'Progressive return to CDT maintenance program. Compression garment fitting. Functional rehabilitation.',
      goals: [
        'Complete wound healing',
        'Definitive compression garment fitted',
        'Return to full CDT self-management',
        'Functional recovery',
        'Volume stabilization',
      ],
      activities: [
        'Weekly wound checks × 4 weeks',
        'Garment measurement and fitting (Week 3-4 post-op)',
        'Progressive exercise program',
        'Self-MLD restarted when wounds healed',
        'Return to normal activities from Week 6-8',
      ],
      monitoringFrequency: 'weekly',
      exitCriteria: [
        'Wounds fully healed',
        'Compression garment in use',
        'Patient independent in self-management',
        'Functional goals met',
      ],
    });
    milestones.push({
      weekNumber: currentWeek + 4,
      milestone: 'Month 1 post-op — garment fitting',
      assessmentRequired: true,
      decisionPoint: false,
      description: 'Fit definitive compression garment. Assess wound healing progress.',
    },
    {
      weekNumber: currentWeek + 10,
      milestone: 'Month 3 post-op — comprehensive review',
      assessmentRequired: true,
      decisionPoint: true,
      description: 'Full measurement comparison (pre-op vs post-op). Functional assessment. Evaluate for further staging if applicable.',
    });
    currentWeek += 10;
  }

  // Long-term maintenance (always final phase)
  phases.push({
    phase: 'long_term_maintenance',
    label: 'Long-Term Maintenance (Lifelong)',
    startWeek: currentWeek,
    durationWeeks: 52,
    description: 'Lifelong self-management with regular clinical review. Compression garment, self-MLD, exercise, skin care, weight management.',
    goals: [
      'Maintain treatment gains',
      'Prevent recurrence',
      'Prevent complications',
      'Optimize quality of life',
    ],
    activities: [
      'Compression garment: All waking hours',
      'Self-MLD: Daily',
      'Exercise: 150 min/week with compression',
      'Skin care: Daily inspection and moisturizing',
      'Weight management',
      'Garment replacement every 4-6 months',
    ],
    monitoringFrequency: 'quarterly',
    exitCriteria: [
      'This phase is lifelong',
      'Return to intensive CDT if escalation criteria met',
    ],
  });
  milestones.push({
    weekNumber: currentWeek + 52,
    milestone: 'Annual comprehensive review',
    assessmentRequired: true,
    decisionPoint: true,
    description: 'Complete re-staging, all scoring, investigations if needed. Long-term plan revision.',
  });

  const totalWeeks = phases.reduce((sum, p) => sum + p.durationWeeks, 0);

  return {
    phases,
    totalEstimatedDurationWeeks: totalWeeks,
    criticalMilestones: milestones.sort((a, b) => a.weekNumber - b.weekNumber),
  };
}

// ==================== MONITORING ALERT GENERATION ====================

export function generateMonitoringAlerts(
  currentRecord: {
    limbMeasurements: LimbMeasurement[];
    previousMeasurements?: LimbMeasurement[];
    baselineVolumeMl?: number;
    currentVolumeMl?: number;
    skinConditions: SkinCondition[];
    pittingGrade: PittingGrade;
    painScore: number;
    compressionCompliance: string;
    exerciseCompliance: string;
    signsOfInfection: boolean;
    temperature?: number;
  }
): LymphedemaAlert[] {
  const alerts: LymphedemaAlert[] = [];

  // Volume increase alert
  if (currentRecord.baselineVolumeMl && currentRecord.currentVolumeMl) {
    const changePct = ((currentRecord.currentVolumeMl - currentRecord.baselineVolumeMl) / currentRecord.baselineVolumeMl) * 100;
    if (changePct > 10) {
      alerts.push({
        type: 'volume_increase',
        severity: changePct > 20 ? 'urgent' : 'warning',
        message: `Volume increase of ${changePct.toFixed(1)}% from baseline`,
        actionRequired: changePct > 20
          ? 'Return to CDT intensive phase. Investigate for infection, tumour recurrence, or non-compliance.'
          : 'Review compliance. Consider short course of intensive CDT. Re-measure in 1 week.',
      });
    }
  }

  // Circumference increase
  if (currentRecord.previousMeasurements && currentRecord.limbMeasurements) {
    for (const current of currentRecord.limbMeasurements) {
      const previous = currentRecord.previousMeasurements.find(p => p.locationName === current.locationName);
      if (previous && current.circumferenceCm - previous.circumferenceCm > 2) {
        alerts.push({
          type: 'volume_increase',
          severity: 'warning',
          message: `${current.locationName}: +${(current.circumferenceCm - previous.circumferenceCm).toFixed(1)}cm since last measurement`,
          actionRequired: 'Investigate cause. Adjust treatment plan.',
        });
      }
    }
  }

  // Infection
  if (currentRecord.signsOfInfection) {
    alerts.push({
      type: 'infection',
      severity: 'urgent',
      message: 'Signs of infection detected',
      actionRequired: 'PAUSE CDT. Start antibiotics. Elevate limb. Review within 48 hours.',
    });
  }

  if (currentRecord.temperature && currentRecord.temperature > 38) {
    alerts.push({
      type: 'infection',
      severity: currentRecord.temperature > 38.5 ? 'critical' : 'urgent',
      message: `Temperature elevated: ${currentRecord.temperature}°C`,
      actionRequired: 'Assess for cellulitis. Consider admission if systemically unwell.',
    });
  }

  // Skin breakdown
  if (currentRecord.skinConditions.includes('ulceration') || currentRecord.skinConditions.includes('lymphorrhea')) {
    alerts.push({
      type: 'skin_breakdown',
      severity: 'warning',
      message: 'Skin breakdown / lymphorrhea detected',
      actionRequired: 'Wound care protocol. Modify bandaging. Continue compression with wound dressing underneath.',
    });
  }

  // Pain escalation
  if (currentRecord.painScore >= 7) {
    alerts.push({
      type: 'pain_escalation',
      severity: 'warning',
      message: `Pain score ${currentRecord.painScore}/10`,
      actionRequired: 'Review cause of pain. Adjust bandaging pressure. Consider analgesia. Rule out infection or DVT.',
    });
  }

  // Compliance issues
  if (currentRecord.compressionCompliance === 'poor' || currentRecord.compressionCompliance === 'non_compliant') {
    alerts.push({
      type: 'non_compliance',
      severity: 'warning',
      message: 'Poor compression compliance',
      actionRequired: 'Explore barriers (comfort, dexterity, understanding). Consider garment change. Re-educate on importance.',
    });
  }
  if (currentRecord.exerciseCompliance === 'poor' || currentRecord.exerciseCompliance === 'non_compliant') {
    alerts.push({
      type: 'non_compliance',
      severity: 'info',
      message: 'Poor exercise compliance',
      actionRequired: 'Review exercise program suitability. Simplify if needed. Reinforce importance.',
    });
  }

  return alerts;
}

// ==================== MEASUREMENT POINTS DEFINITIONS ====================

/** Standard measurement points for upper limb lymphedema */
export const UPPER_LIMB_MEASUREMENT_POINTS: { locationName: string; landmark: string; distanceFromLandmarkCm: number }[] = [
  { locationName: 'Metacarpals (knuckles)', landmark: 'metacarpal heads', distanceFromLandmarkCm: 0 },
  { locationName: 'Wrist', landmark: 'wrist crease', distanceFromLandmarkCm: 0 },
  { locationName: '10cm above wrist', landmark: 'wrist crease', distanceFromLandmarkCm: 10 },
  { locationName: '20cm above wrist (forearm)', landmark: 'wrist crease', distanceFromLandmarkCm: 20 },
  { locationName: 'Olecranon (elbow)', landmark: 'olecranon', distanceFromLandmarkCm: 0 },
  { locationName: '10cm above olecranon', landmark: 'olecranon', distanceFromLandmarkCm: 10 },
  { locationName: '20cm above olecranon', landmark: 'olecranon', distanceFromLandmarkCm: 20 },
  { locationName: '30cm above olecranon (upper arm)', landmark: 'olecranon', distanceFromLandmarkCm: 30 },
];

/** Standard measurement points for lower limb lymphedema */
export const LOWER_LIMB_MEASUREMENT_POINTS: { locationName: string; landmark: string; distanceFromLandmarkCm: number }[] = [
  { locationName: 'Metatarsals (ball of foot)', landmark: 'metatarsal heads', distanceFromLandmarkCm: 0 },
  { locationName: 'Ankle (malleolus)', landmark: 'lateral malleolus', distanceFromLandmarkCm: 0 },
  { locationName: '10cm above malleolus', landmark: 'lateral malleolus', distanceFromLandmarkCm: 10 },
  { locationName: '20cm above malleolus', landmark: 'lateral malleolus', distanceFromLandmarkCm: 20 },
  { locationName: '30cm above malleolus (calf)', landmark: 'lateral malleolus', distanceFromLandmarkCm: 30 },
  { locationName: 'Patella (knee)', landmark: 'patella superior pole', distanceFromLandmarkCm: 0 },
  { locationName: '10cm above patella', landmark: 'patella superior pole', distanceFromLandmarkCm: 10 },
  { locationName: '20cm above patella', landmark: 'patella superior pole', distanceFromLandmarkCm: 20 },
  { locationName: '30cm above patella (thigh)', landmark: 'patella superior pole', distanceFromLandmarkCm: 30 },
];

// ==================== EXPORT SERVICE OBJECT ====================

export const lymphedemaService = {
  // Staging
  determineISLStage,
  determineCampisiStage,
  
  // Volume
  calculateLimbVolume,
  
  // Scoring
  calculateSeverityScore,
  calculateFunctionalImpactScore,
  calculateQualityOfLifeScore,
  
  // Protocols
  generateCDTIntensivePlan,
  generateCDTMaintenancePlan,
  generateInfectionControlPlan,
  
  // Surgical
  evaluateDebulkingCandidacy,
  generateSurgicalPlan,
  
  // Timeline
  generateTreatmentTimeline,
  
  // Monitoring
  generateMonitoringAlerts,
  
  // Measurement reference
  UPPER_LIMB_MEASUREMENT_POINTS,
  LOWER_LIMB_MEASUREMENT_POINTS,
};
