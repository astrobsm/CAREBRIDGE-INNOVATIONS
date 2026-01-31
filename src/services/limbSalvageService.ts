// Limb Salvage Service - Diabetic Foot Scoring & Decision Support
// Implements validated scoring systems for limb salvage assessment

import type {
  LimbSalvageAssessment,
  LimbSalvageScore,
  LimbSalvageRecommendation,
  WagnerGrade,
  WIFIClassification,
  SINBADScore,
  DopplerFindings,
  OsteomyelitisAssessment,
  SepsisAssessment,
  RenalStatus,
  DiabeticFootComorbidities,
  AmputationLevel,
} from '../types';

// ============================================================
// SCORING ALGORITHMS
// ============================================================

/**
 * Calculate the comprehensive Limb Salvage Score
 * Higher scores indicate higher risk and lower salvage probability
 */
export function calculateLimbSalvageScore(assessment: Partial<LimbSalvageAssessment>): LimbSalvageScore {
  const woundScore = calculateWoundScore(assessment);
  const ischemiaScore = calculateIschemiaScore(assessment);
  const infectionScore = calculateInfectionScore(assessment);
  const renalScore = calculateRenalScore(assessment.renalStatus);
  const comorbidityScore = calculateComorbidityScore(assessment.comorbidities);
  const ageScore = calculateAgeScore(assessment.patientAge || 0);
  const nutritionalScore = calculateNutritionalScore(assessment);

  const totalScore = woundScore + ischemiaScore + infectionScore + renalScore + comorbidityScore + ageScore + nutritionalScore;
  const maxScore = 100; // Maximum possible score
  const percentage = (totalScore / maxScore) * 100;

  return {
    woundScore,
    ischemiaScore,
    infectionScore,
    renalScore,
    comorbidityScore,
    ageScore,
    nutritionalScore,
    totalScore,
    maxScore,
    percentage,
    riskCategory: getRiskCategory(percentage),
    salvageProbability: getSalvageProbability(percentage),
  };
}

/**
 * Calculate Wound Score (0-25 points)
 * Based on Wagner grade, WIfI, and wound characteristics
 */
function calculateWoundScore(assessment: Partial<LimbSalvageAssessment>): number {
  let score = 0;

  // Wagner Grade (0-12 points)
  const wagnerPoints: Record<WagnerGrade, number> = {
    0: 0, 1: 2, 2: 4, 3: 6, 4: 9, 5: 12
  };
  score += wagnerPoints[assessment.wagnerGrade as WagnerGrade] || 0;

  // WIfI Wound component (0-6 points)
  if (assessment.wifiClassification) {
    score += (assessment.wifiClassification.wound || 0) * 2;
  }

  // Wound duration penalty (0-4 points)
  const duration = assessment.woundDuration || 0;
  if (duration > 90) score += 4;
  else if (duration > 60) score += 3;
  else if (duration > 30) score += 2;
  else if (duration > 14) score += 1;

  // Previous debridement without healing (0-3 points)
  if (assessment.previousDebridement && (assessment.debridementCount || 0) >= 3) {
    score += 3;
  } else if (assessment.previousDebridement) {
    score += 1;
  }

  return Math.min(score, 25);
}

/**
 * Calculate Ischemia Score (0-20 points)
 * Based on Doppler findings and ABI
 */
function calculateIschemiaScore(assessment: Partial<LimbSalvageAssessment>): number {
  let score = 0;
  const doppler = assessment.dopplerFindings;

  if (!doppler?.arterial) return 0;

  // ABI scoring (0-8 points)
  const abi = doppler.arterial.abi || 1;
  if (abi < 0.4) score += 8;
  else if (abi < 0.6) score += 6;
  else if (abi < 0.8) score += 4;
  else if (abi < 0.9) score += 2;

  // Waveform (0-4 points)
  const waveformPoints: Record<string, number> = {
    triphasic: 0, biphasic: 1, monophasic: 3, absent: 4
  };
  score += waveformPoints[doppler.arterial.waveform] || 0;

  // Arterial occlusion count (0-6 points)
  let occludedCount = 0;
  const arteries = ['femoralArtery', 'poplitealArtery', 'anteriorTibialArtery', 'posteriorTibialArtery', 'dorsalisPedisArtery', 'peronealArtery'] as const;
  for (const artery of arteries) {
    if (doppler.arterial[artery] === 'occluded') occludedCount++;
    else if (doppler.arterial[artery] === 'stenosis') occludedCount += 0.5;
  }
  score += Math.min(occludedCount, 6);

  // Calcification (0-2 points)
  if (doppler.arterial.calcification) score += 2;

  return Math.min(score, 20);
}

/**
 * Calculate Infection Score (0-20 points)
 * Based on sepsis assessment and osteomyelitis
 * 
 * IMPORTANT: Chronic osteomyelitis (>6 weeks) is weighted heavily as it is
 * a critical factor in limb salvage decisions. Evidence shows that chronic
 * osteomyelitis has significantly lower cure rates with conservative treatment
 * and is often a primary indication for amputation.
 */
function calculateInfectionScore(assessment: Partial<LimbSalvageAssessment>): number {
  let score = 0;
  const sepsis = assessment.sepsis;
  const osteo = assessment.osteomyelitis;

  // Sepsis severity (0-8 points)
  if (sepsis) {
    const sepsisPoints: Record<string, number> = {
      none: 0, sirs: 2, sepsis: 4, severe_sepsis: 6, septic_shock: 8
    };
    score += sepsisPoints[sepsis.sepsisSeverity] || 0;
  }

  // qSOFA score (0-3 points)
  if (sepsis?.clinicalFeatures?.qsofaScore) {
    score += sepsis.clinicalFeatures.qsofaScore;
  }

  // ============================================================
  // OSTEOMYELITIS SCORING - Enhanced for Chronic Cases
  // Chronic osteomyelitis is a CRITICAL factor in amputation decisions
  // ============================================================
  if (osteo?.suspected) {
    // Base score for suspected osteomyelitis (2 points)
    score += 2;
    
    // Clinical evidence
    if (osteo.probeToBone) score += 1;
    
    // Imaging evidence
    if (osteo.mriFindings === 'positive') score += 2;
    else if (osteo.mriFindings === 'suspicious') score += 1;
    
    // Histological confirmation
    if (osteo.boneBiopsy === 'positive') score += 2;
    
    // Radiographic changes (chronic sign)
    if (osteo.radiographicChanges) score += 1;
    
    // ============================================================
    // CHRONICITY SCORING - CRITICAL FOR AMPUTATION DECISION
    // Chronic osteomyelitis (>6 weeks) has fundamentally different
    // prognosis and management requirements
    // ============================================================
    if (osteo.chronicity === 'chronic' || (osteo.durationInWeeks && osteo.durationInWeeks > 6)) {
      // Chronic osteomyelitis carries heavy prognostic significance
      // Studies show cure rates drop to 60-80% with surgery + antibiotics
      // vs >90% for acute cases
      score += 4; // SIGNIFICANT additional weight for chronicity
      
      // Structural bone changes in chronic OM
      if (osteo.sequestrum) score += 2; // Dead bone = poor prognosis
      if (osteo.involucrum) score += 1; // Indicates chronicity
      if (osteo.cloacae) score += 1; // Drainage tracts
      if (osteo.involvedCortex === 'full_thickness') score += 2;
      else if (osteo.involvedCortex === 'deep') score += 1;
    } else if (osteo.chronicity === 'subacute' || (osteo.durationInWeeks && osteo.durationInWeeks > 2)) {
      score += 2; // Moderate additional weight
    }
    
    // Treatment failure indicators (very poor prognosis)
    if (osteo.recurrent) score += 3; // Recurrence = high amputation likelihood
    if (osteo.previousAntibiotic && osteo.previousDebridement) {
      // Failed combined therapy = strong amputation indicator
      score += 2;
    } else if (osteo.previousAntibiotic || osteo.previousDebridement) {
      score += 1;
    }
    
    // Multiple bone involvement
    if (osteo.affectedBones && osteo.affectedBones.length >= 3) {
      score += 2; // Extensive involvement
    } else if (osteo.affectedBones && osteo.affectedBones.length >= 2) {
      score += 1;
    }
  }

  // Lab markers (0-3 points)
  if (sepsis?.laboratoryFeatures) {
    const labs = sepsis.laboratoryFeatures;
    if ((labs.wbc || 0) > 15) score += 1;
    if ((labs.crp || 0) > 100) score += 1;
    if ((labs.procalcitonin || 0) > 2) score += 1;
  }

  return Math.min(score, 20);
}

/**
 * Calculate Renal Score (0-10 points)
 * Based on CKD stage and dialysis status
 */
function calculateRenalScore(renal?: RenalStatus): number {
  if (!renal) return 0;
  let score = 0;

  // CKD Stage (0-6 points)
  const ckdPoints: Record<number, number> = {
    1: 0, 2: 1, 3: 2, 4: 4, 5: 6
  };
  score += ckdPoints[renal.ckdStage] || 0;

  // Dialysis (0-4 points)
  if (renal.onDialysis) {
    score += 4;
  }

  return Math.min(score, 10);
}

/**
 * Calculate Comorbidity Score (0-15 points)
 * Based on diabetes control and cardiovascular disease
 */
function calculateComorbidityScore(comorbidities?: DiabeticFootComorbidities): number {
  if (!comorbidities) return 0;
  let score = 0;

  // HbA1c (0-3 points)
  const hba1c = comorbidities.hba1c || 7;
  if (hba1c > 10) score += 3;
  else if (hba1c > 8.5) score += 2;
  else if (hba1c > 7.5) score += 1;

  // Diabetes duration (0-2 points)
  if (comorbidities.diabetesDuration > 20) score += 2;
  else if (comorbidities.diabetesDuration > 10) score += 1;

  // Cardiovascular (0-5 points)
  if (comorbidities.coronaryArteryDisease) score += 2;
  if (comorbidities.heartFailure) score += 2;
  if (comorbidities.previousStroke) score += 1;

  // Peripheral vascular disease (0-2 points)
  if (comorbidities.peripheralVascularDisease) score += 2;

  // Previous amputation (0-2 points)
  if (comorbidities.previousAmputation) score += 2;

  // Smoking (0-1 point)
  if (comorbidities.smoking) score += 1;

  return Math.min(score, 15);
}

/**
 * Calculate Age Score (0-5 points)
 */
function calculateAgeScore(age: number): number {
  if (age >= 80) return 5;
  if (age >= 70) return 3;
  if (age >= 60) return 2;
  if (age >= 50) return 1;
  return 0;
}

/**
 * Calculate Nutritional Score (0-5 points)
 */
function calculateNutritionalScore(assessment: Partial<LimbSalvageAssessment>): number {
  let score = 0;

  // Albumin (0-3 points)
  const albumin = assessment.albumin || 4;
  if (albumin < 2.5) score += 3;
  else if (albumin < 3.0) score += 2;
  else if (albumin < 3.5) score += 1;

  // MUST score (0-2 points)
  const must = assessment.mustScore || 0;
  if (must >= 2) score += 2;
  else if (must === 1) score += 1;

  return Math.min(score, 5);
}

/**
 * Get risk category based on percentage score
 */
function getRiskCategory(percentage: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (percentage >= 70) return 'very_high';
  if (percentage >= 50) return 'high';
  if (percentage >= 30) return 'moderate';
  return 'low';
}

/**
 * Get salvage probability based on percentage score
 */
function getSalvageProbability(percentage: number): 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor' {
  if (percentage >= 80) return 'very_poor';
  if (percentage >= 60) return 'poor';
  if (percentage >= 40) return 'fair';
  if (percentage >= 20) return 'good';
  return 'excellent';
}

// ============================================================
// RECOMMENDATION GENERATION
// ============================================================

/**
 * Generate comprehensive recommendations based on assessment
 */
export function generateRecommendations(assessment: Partial<LimbSalvageAssessment>): LimbSalvageRecommendation[] {
  const recommendations: LimbSalvageRecommendation[] = [];
  const score = assessment.limbSalvageScore;

  // Immediate/Critical recommendations
  recommendations.push(...generateImmediateRecommendations(assessment));
  
  // Short-term recommendations
  recommendations.push(...generateShortTermRecommendations(assessment));
  
  // Long-term recommendations
  recommendations.push(...generateLongTermRecommendations(assessment));

  return recommendations;
}

function generateImmediateRecommendations(assessment: Partial<LimbSalvageAssessment>): LimbSalvageRecommendation[] {
  const recommendations: LimbSalvageRecommendation[] = [];
  const sepsis = assessment.sepsis;

  // Sepsis management
  if (sepsis?.sepsisSeverity === 'septic_shock') {
    recommendations.push({
      category: 'immediate',
      priority: 'critical',
      recommendation: 'Initiate sepsis bundle protocol',
      rationale: 'Patient in septic shock - requires immediate hemodynamic support and antibiotics',
      timeframe: 'Within 1 hour',
    });
  } else if (sepsis?.sepsisSeverity === 'severe_sepsis' || sepsis?.sepsisSeverity === 'sepsis') {
    recommendations.push({
      category: 'immediate',
      priority: 'critical',
      recommendation: 'Start broad-spectrum IV antibiotics',
      rationale: 'Active sepsis requires immediate antimicrobial therapy',
      timeframe: 'Within 3 hours',
    });
  }

  // Acute limb ischemia
  const abi = assessment.dopplerFindings?.arterial?.abi || 1;
  if (abi < 0.4) {
    recommendations.push({
      category: 'immediate',
      priority: 'critical',
      recommendation: 'Urgent vascular surgery consultation',
      rationale: 'Critical limb ischemia (ABI < 0.4) - revascularization assessment needed',
      timeframe: 'Within 24 hours',
    });
  }

  // Wet gangrene
  if (assessment.wagnerGrade === 5) {
    recommendations.push({
      category: 'immediate',
      priority: 'critical',
      recommendation: 'Emergency surgical debridement or amputation',
      rationale: 'Wagner Grade 5 (gangrene involving entire foot) - source control required',
      timeframe: 'Within 24-48 hours',
    });
  }

  // Osteomyelitis with sepsis
  if (assessment.osteomyelitis?.suspected && sepsis?.sepsisSeverity !== 'none') {
    recommendations.push({
      category: 'immediate',
      priority: 'high',
      recommendation: 'Obtain cultures (blood, bone if possible) before antibiotics',
      rationale: 'Osteomyelitis with sepsis - targeted therapy requires culture data',
      timeframe: 'Before antibiotic initiation',
    });
  }

  // ============================================================
  // CHRONIC OSTEOMYELITIS - CRITICAL AMPUTATION CONSIDERATION
  // ============================================================
  const osteo = assessment.osteomyelitis;
  if (osteo?.suspected) {
    const isChronicOM = osteo.chronicity === 'chronic' || (osteo.durationInWeeks && osteo.durationInWeeks > 6);
    const hasFailedTreatment = osteo.recurrent || (osteo.previousAntibiotic && osteo.previousDebridement);
    const hasSequestrumFormation = osteo.sequestrum;
    
    if (isChronicOM) {
      // Chronic osteomyelitis requires different management approach
      recommendations.push({
        category: 'immediate',
        priority: 'critical',
        recommendation: 'CHRONIC OSTEOMYELITIS: Strongly consider primary amputation',
        rationale: `Chronic osteomyelitis (>6 weeks) has cure rates of only 60-80% even with combined surgical debridement and prolonged antibiotics. ${hasSequestrumFormation ? 'Presence of sequestrum indicates established chronic infection with dead bone that will not respond to antibiotics alone.' : ''} ${hasFailedTreatment ? 'Previous treatment failure significantly worsens prognosis.' : ''} Weigh quality of life, multiple surgery burden, and definitive cure with amputation vs prolonged limb salvage attempts.`,
        timeframe: 'Immediate MDT discussion required',
      });
      
      if (hasSequestrumFormation) {
        recommendations.push({
          category: 'immediate',
          priority: 'critical',
          recommendation: 'Sequestrum requires surgical removal or amputation',
          rationale: 'Sequestrum (dead bone) acts as a foreign body and biofilm nidus - antibiotics cannot penetrate. Without removal, infection will persist indefinitely.',
          timeframe: 'Within 48-72 hours',
        });
      }
      
      if (osteo.cloacae) {
        recommendations.push({
          category: 'immediate',
          priority: 'high',
          recommendation: 'Sinus tracts indicate chronic draining osteomyelitis',
          rationale: 'Cloacae (drainage tracts through bone) are pathognomonic of chronic osteomyelitis and rarely heal without radical surgery or amputation.',
          timeframe: 'Surgical planning required',
        });
      }
    }
    
    if (hasFailedTreatment) {
      recommendations.push({
        category: 'immediate',
        priority: 'critical',
        recommendation: 'Treatment-resistant osteomyelitis: Amputation strongly indicated',
        rationale: `${osteo.recurrent ? 'Recurrent osteomyelitis after treatment indicates antibiotic-resistant organisms or inadequate source control. ' : ''}${osteo.previousAntibiotic && osteo.previousDebridement ? 'Failure of combined antibiotic + surgical treatment carries very poor prognosis for limb salvage. ' : ''}Consider quality of life benefits of definitive amputation over prolonged treatment attempts.`,
        timeframe: 'Urgent surgical decision required',
      });
    }
    
    // Multiple bone involvement
    if (osteo.affectedBones && osteo.affectedBones.length >= 3) {
      recommendations.push({
        category: 'immediate',
        priority: 'high',
        recommendation: 'Extensive multi-bone osteomyelitis: Consider proximal amputation',
        rationale: `Involvement of ${osteo.affectedBones.length} bones (${osteo.affectedBones.join(', ')}) indicates extensive infection. Multiple debridements rarely achieve cure and amputation level should be proximal to all infected bone.`,
        timeframe: 'Surgical planning required',
      });
    }
  }

  return recommendations;
}

function generateShortTermRecommendations(assessment: Partial<LimbSalvageAssessment>): LimbSalvageRecommendation[] {
  const recommendations: LimbSalvageRecommendation[] = [];

  // Glycemic control
  if (assessment.comorbidities?.hba1c && assessment.comorbidities.hba1c > 8) {
    recommendations.push({
      category: 'short_term',
      priority: 'high',
      recommendation: 'Optimize glycemic control - target HbA1c < 8%',
      rationale: `Current HbA1c: ${assessment.comorbidities.hba1c}% - Poor glycemic control impairs wound healing`,
      timeframe: 'Within 1-2 weeks',
    });
  }

  // Vascular assessment
  if (!assessment.angiogramPerformed && assessment.dopplerFindings?.arterial?.abi && assessment.dopplerFindings.arterial.abi < 0.9) {
    recommendations.push({
      category: 'short_term',
      priority: 'high',
      recommendation: 'Perform CT or conventional angiography',
      rationale: 'ABI indicates arterial disease - detailed vascular mapping needed for revascularization planning',
      timeframe: 'Within 1 week',
    });
  }

  // Wound debridement
  if (assessment.wagnerGrade && assessment.wagnerGrade >= 2) {
    recommendations.push({
      category: 'short_term',
      priority: 'medium',
      recommendation: 'Surgical debridement of necrotic tissue',
      rationale: 'Deep wound (Wagner ≥2) requires removal of non-viable tissue',
      timeframe: 'Within 48-72 hours',
    });
  }

  // Offloading
  recommendations.push({
    category: 'short_term',
    priority: 'medium',
    recommendation: 'Implement total contact casting or offloading device',
    rationale: 'Pressure relief is essential for diabetic foot ulcer healing',
    timeframe: 'Immediate and ongoing',
  });

  // Nutritional support
  if (assessment.albumin && assessment.albumin < 3.5) {
    recommendations.push({
      category: 'short_term',
      priority: 'medium',
      recommendation: 'Nutritional supplementation - high protein diet',
      rationale: `Low albumin (${assessment.albumin} g/dL) impairs wound healing`,
      timeframe: 'Start immediately',
    });
  }

  // Renal optimization
  if (assessment.renalStatus?.ckdStage && assessment.renalStatus.ckdStage >= 4) {
    recommendations.push({
      category: 'short_term',
      priority: 'high',
      recommendation: 'Nephrology consultation',
      rationale: 'Advanced CKD (Stage 4-5) affects wound healing and surgical risk',
      timeframe: 'Within 1 week',
    });
  }

  return recommendations;
}

function generateLongTermRecommendations(assessment: Partial<LimbSalvageAssessment>): LimbSalvageRecommendation[] {
  const recommendations: LimbSalvageRecommendation[] = [];

  // Smoking cessation
  if (assessment.comorbidities?.smoking) {
    recommendations.push({
      category: 'long_term',
      priority: 'high',
      recommendation: 'Smoking cessation program',
      rationale: 'Smoking significantly impairs wound healing and increases amputation risk',
      timeframe: 'Ongoing',
    });
  }

  // Cardiovascular risk reduction
  if (assessment.comorbidities?.coronaryArteryDisease || assessment.comorbidities?.peripheralVascularDisease) {
    recommendations.push({
      category: 'long_term',
      priority: 'medium',
      recommendation: 'Optimize cardiovascular risk factors (statin, antiplatelet)',
      rationale: 'Cardiovascular disease increases limb loss risk',
      timeframe: 'Ongoing',
    });
  }

  // Regular foot surveillance
  recommendations.push({
    category: 'long_term',
    priority: 'medium',
    recommendation: 'Regular podiatric surveillance every 1-3 months',
    rationale: 'Diabetic patients with ulcer history have high recurrence risk',
    timeframe: 'After wound healing',
  });

  // Custom footwear
  recommendations.push({
    category: 'long_term',
    priority: 'medium',
    recommendation: 'Custom therapeutic footwear',
    rationale: 'Prevents recurrence by reducing pressure on vulnerable areas',
    timeframe: 'After wound healing',
  });

  // Patient education
  recommendations.push({
    category: 'long_term',
    priority: 'low',
    recommendation: 'Diabetes foot care education',
    rationale: 'Patient education reduces reulceration rates by 50%',
    timeframe: 'During hospitalization and follow-up',
  });

  return recommendations;
}

// ============================================================
// AMPUTATION LEVEL RECOMMENDATION
// ============================================================

/**
 * Recommend appropriate amputation level based on assessment
 * 
 * IMPORTANT: Chronic osteomyelitis is a KEY factor in amputation decision.
 * The presence of chronic osteomyelitis (>6 weeks), especially with:
 * - Sequestrum formation
 * - Previous treatment failure
 * - Multiple bone involvement
 * strongly favors definitive amputation over limb salvage attempts.
 */
export function recommendAmputationLevel(assessment: Partial<LimbSalvageAssessment>): AmputationLevel {
  const score = assessment.limbSalvageScore;
  const doppler = assessment.dopplerFindings;
  const osteo = assessment.osteomyelitis;
  
  // ============================================================
  // CHRONIC OSTEOMYELITIS - May override other considerations
  // ============================================================
  const isChronicOM = osteo?.suspected && (
    osteo.chronicity === 'chronic' || 
    (osteo.durationInWeeks && osteo.durationInWeeks > 6)
  );
  const hasFailedTreatment = osteo?.recurrent || (osteo?.previousAntibiotic && osteo?.previousDebridement);
  const hasSequestrumOrSevereChanges = osteo?.sequestrum || osteo?.involvedCortex === 'full_thickness';
  
  // Chronic OM with treatment failure or sequestrum = strong amputation indication
  // This can override "good" salvage probability scores
  if (isChronicOM && (hasFailedTreatment || hasSequestrumOrSevereChanges)) {
    const abi = doppler?.arterial?.abi || 1;
    const affectedBoneCount = osteo?.affectedBones?.length || 0;
    
    // Determine amputation level based on extent of bone involvement
    if (affectedBoneCount >= 3 || abi < 0.5) {
      // Extensive involvement or poor vascularity = more proximal amputation
      return abi < 0.4 ? 'bka' : 'transmetatarsal';
    }
    
    // Single/dual bone involvement - may still consider ray amputation
    const woundLocation = assessment.woundLocation?.toLowerCase() || '';
    const affectedBonesLower = osteo?.affectedBones?.map(b => b.toLowerCase()) || [];
    
    if (affectedBoneCount <= 2 && 
        (woundLocation.includes('toe') || affectedBonesLower.some(b => b.includes('phalanx')))) {
      return abi >= 0.6 ? 'ray_amputation' : 'transmetatarsal';
    }
    
    return 'transmetatarsal';
  }
  
  // Excellent/Good salvage probability - no amputation (unless chronic OM override above)
  if (score?.salvageProbability === 'excellent' || score?.salvageProbability === 'good') {
    return 'none';
  }

  // Wagner Grade determines minimum level
  const wagnerGrade = assessment.wagnerGrade || 0;
  const abi = doppler?.arterial?.abi || 1;

  // Wagner 5 with proximal ischemia
  if (wagnerGrade === 5) {
    if (abi < 0.4 && doppler?.arterial?.femoralArtery === 'occluded') {
      return 'aka';
    }
    if (abi < 0.5) {
      return 'bka';
    }
    return 'transmetatarsal';
  }

  // Wagner 4 (localized gangrene)
  if (wagnerGrade === 4) {
    // Check if single digit/ray
    const woundLocation = assessment.woundLocation?.toLowerCase() || '';
    if (woundLocation.includes('toe') || woundLocation.includes('digit')) {
      if (abi >= 0.6) {
        return 'ray_amputation';
      }
      if (abi >= 0.4) {
        return 'transmetatarsal';
      }
      return 'bka';
    }
    // Forefoot gangrene
    if (abi >= 0.5) {
      return 'transmetatarsal';
    }
    return 'bka';
  }

  // Wagner 3 with poor healing potential
  if (wagnerGrade === 3 && score?.salvageProbability === 'very_poor') {
    if (abi < 0.4) {
      return 'bka';
    }
    return 'transmetatarsal';
  }

  // Default for very poor salvage probability
  if (score?.salvageProbability === 'very_poor') {
    if (abi < 0.4) {
      return 'bka';
    }
    return 'ray_amputation';
  }

  // Fair/poor salvage - minor amputation consideration
  if (score?.salvageProbability === 'poor') {
    return 'toe_disarticulation';
  }

  return 'none';
}

/**
 * Determine recommended management strategy
 */
export function determineManagement(assessment: Partial<LimbSalvageAssessment>): 'conservative' | 'revascularization' | 'minor_amputation' | 'major_amputation' {
  const score = assessment.limbSalvageScore;
  const ampLevel = assessment.recommendedAmputationLevel || recommendAmputationLevel(assessment);
  const abi = assessment.dopplerFindings?.arterial?.abi || 1;

  // Check if revascularization is possible
  const canRevascularize = abi < 0.9 && abi >= 0.3 && !assessment.dopplerFindings?.arterial?.calcification;

  // Excellent/Good - conservative
  if (score?.salvageProbability === 'excellent' || score?.salvageProbability === 'good') {
    return canRevascularize && abi < 0.7 ? 'revascularization' : 'conservative';
  }

  // Fair - revascularization if possible
  if (score?.salvageProbability === 'fair') {
    if (canRevascularize) return 'revascularization';
    return 'conservative';
  }

  // Poor/Very Poor with minor amputation level
  if (['none', 'toe_disarticulation', 'ray_amputation', 'transmetatarsal'].includes(ampLevel)) {
    if (canRevascularize) return 'revascularization';
    return 'minor_amputation';
  }

  // BKA or higher
  return 'major_amputation';
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate SINBAD Score from assessment data
 */
export function calculateSINBADScore(assessment: Partial<LimbSalvageAssessment>): SINBADScore {
  const woundLocation = (assessment.woundLocation || '').toLowerCase();
  const isForefoot = woundLocation.includes('toe') || woundLocation.includes('metatarsal') || woundLocation.includes('forefoot');
  
  return {
    site: isForefoot ? 0 : 1,
    ischemia: (assessment.dopplerFindings?.arterial?.abi || 1) < 0.8 ? 1 : 0,
    neuropathy: assessment.monofilamentTest ? 1 : 0,
    bacterialInfection: assessment.sepsis?.sepsisSeverity !== 'none' ? 1 : 0,
    area: (assessment.woundSize?.area || 0) >= 1 ? 1 : 0,
    depth: (assessment.woundSize?.depth || 0) > 0.5 ? 1 : 0,
    total: 0, // Will be calculated
  };
}

/**
 * Get Wagner Grade description
 */
export function getWagnerDescription(grade: WagnerGrade): string {
  const descriptions: Record<WagnerGrade, string> = {
    0: 'Pre-ulcerative lesion, healed ulcer, bony deformity',
    1: 'Superficial ulcer, skin and subcutaneous tissue only',
    2: 'Deep ulcer, extending to tendon, capsule, or bone',
    3: 'Deep ulcer with abscess, osteomyelitis, or tendinitis',
    4: 'Localized gangrene (toe, forefoot, heel)',
    5: 'Gangrene of entire foot',
  };
  return descriptions[grade];
}

/**
 * Get Texas Classification description
 */
export function getTexasDescription(grade: number, stage: string): string {
  const grades: Record<number, string> = {
    0: 'Pre or post-ulcerative',
    1: 'Superficial (no tendon/capsule/bone)',
    2: 'Wound penetrating to tendon/capsule',
    3: 'Wound penetrating to bone/joint',
  };
  const stages: Record<string, string> = {
    A: 'Clean wound',
    B: 'Infected wound',
    C: 'Ischemic wound',
    D: 'Infected and ischemic',
  };
  return `${grades[grade]} - ${stages[stage]}`;
}

/**
 * Format score for display
 */
export function formatScoreDisplay(score: LimbSalvageScore): {
  summary: string;
  color: string;
  recommendation: string;
} {
  const colors: Record<string, string> = {
    low: 'text-green-600',
    moderate: 'text-yellow-600',
    high: 'text-orange-600',
    very_high: 'text-red-600',
  };

  const summaries: Record<string, string> = {
    low: 'Low Risk - Favorable prognosis for limb salvage',
    moderate: 'Moderate Risk - Guarded prognosis, aggressive treatment needed',
    high: 'High Risk - Poor prognosis, consider amputation if no improvement',
    very_high: 'Very High Risk - Limb salvage unlikely, amputation recommended',
  };

  const recommendations: Record<string, string> = {
    excellent: 'Conservative management with close monitoring',
    good: 'Aggressive wound care and optimize comorbidities',
    fair: 'Consider revascularization if feasible',
    poor: 'Evaluate for limited amputation vs palliation',
    very_poor: 'Primary amputation likely necessary',
  };

  return {
    summary: summaries[score.riskCategory],
    color: colors[score.riskCategory],
    recommendation: recommendations[score.salvageProbability],
  };
}
