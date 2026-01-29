/**
 * Burn Care Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive burn management service with:
 * - TBSA Calculation (Lund-Browder, Rule of 9s)
 * - Fluid Resuscitation (Parkland, Modified Brooke)
 * - ABSI Prognostic Scoring
 * - Wound Care Protocols
 * - Nutrition Assessment
 * - Rehabilitation Planning
 */

import { db } from '../database';
import type { BurnAssessment, BurnDepth } from '../types';

// ==================== TYPES ====================

export interface BurnBodyArea {
  id: string;
  name: string;
  adultPercent: number;
  childPercent: number;
  infantPercent: number;
}

export interface FluidCalculation {
  formula: 'parkland' | 'modified_brooke' | 'evans' | 'muir_barclay';
  totalVolume24h: number;
  first8h: number;
  next16h: number;
  hourlyRate8h: number;
  hourlyRate16h: number;
  crystalloidVolume: number;
  colloidVolume?: number;
  maintenanceFluids?: number;
  urineOutputTarget: number;
  recommendations: string[];
}

export interface ABSIScore {
  score: number;
  survivalProbability: string;
  riskCategory: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | 'severe';
  components: {
    age: number;
    tbsa: number;
    inhalation: number;
    fullThickness: number;
    gender: number;
  };
}

export interface BurnNutrition {
  caloriesPerDay: number;
  proteinPerDay: number;
  formula: string;
  vitamins: {
    vitaminC: number;
    vitaminA: number;
    zinc: number;
    selenium: number;
  };
  feedingRoute: 'oral' | 'enteral' | 'parenteral';
  recommendations: string[];
}

export interface BurnWoundCareProtocol {
  dressingType: string;
  frequency: string;
  cleansingSolution: string;
  topicalAgent: string;
  debridementMethod?: string;
  specialInstructions: string[];
  painManagement: string[];
  grafting?: {
    indicated: boolean;
    timing: string;
    type: string;
  };
}

export interface BurnPrognosisFactors {
  age: number;
  tbsa: number;
  depthDistribution: Record<BurnDepth, number>;
  inhalationInjury: boolean;
  associatedInjuries: string[];
  comorbidities: string[];
  mechanism: string;
  prognosticIndex: number;
  expectedLOS: number; // Length of stay in days
  surgicalNeeds: string[];
  rehabilitationNeeds: string[];
}

// ==================== BODY AREA DEFINITIONS ====================

// Lund-Browder chart values by age
export const lundBrowderChart: Record<string, Record<string, number>> = {
  head: { '0': 19, '1': 17, '5': 13, '10': 11, '15': 9, 'adult': 7 },
  neck: { '0': 2, '1': 2, '5': 2, '10': 2, '15': 2, 'adult': 2 },
  anteriorTrunk: { '0': 13, '1': 13, '5': 13, '10': 13, '15': 13, 'adult': 13 },
  posteriorTrunk: { '0': 13, '1': 13, '5': 13, '10': 13, '15': 13, 'adult': 13 },
  rightButtock: { '0': 2.5, '1': 2.5, '5': 2.5, '10': 2.5, '15': 2.5, 'adult': 2.5 },
  leftButtock: { '0': 2.5, '1': 2.5, '5': 2.5, '10': 2.5, '15': 2.5, 'adult': 2.5 },
  genitalia: { '0': 1, '1': 1, '5': 1, '10': 1, '15': 1, 'adult': 1 },
  rightUpperArm: { '0': 4, '1': 4, '5': 4, '10': 4, '15': 4, 'adult': 4 },
  leftUpperArm: { '0': 4, '1': 4, '5': 4, '10': 4, '15': 4, 'adult': 4 },
  rightLowerArm: { '0': 3, '1': 3, '5': 3, '10': 3, '15': 3, 'adult': 3 },
  leftLowerArm: { '0': 3, '1': 3, '5': 3, '10': 3, '15': 3, 'adult': 3 },
  rightHand: { '0': 2.5, '1': 2.5, '5': 2.5, '10': 2.5, '15': 2.5, 'adult': 2.5 },
  leftHand: { '0': 2.5, '1': 2.5, '5': 2.5, '10': 2.5, '15': 2.5, 'adult': 2.5 },
  rightThigh: { '0': 5.5, '1': 6.5, '5': 8, '10': 8.5, '15': 9, 'adult': 9.5 },
  leftThigh: { '0': 5.5, '1': 6.5, '5': 8, '10': 8.5, '15': 9, 'adult': 9.5 },
  rightLeg: { '0': 5, '1': 5, '5': 5.5, '10': 6, '15': 6.5, 'adult': 7 },
  leftLeg: { '0': 5, '1': 5, '5': 5.5, '10': 6, '15': 6.5, 'adult': 7 },
  rightFoot: { '0': 3.5, '1': 3.5, '5': 3.5, '10': 3.5, '15': 3.5, 'adult': 3.5 },
  leftFoot: { '0': 3.5, '1': 3.5, '5': 3.5, '10': 3.5, '15': 3.5, 'adult': 3.5 },
};

// Rule of 9s for adults
export const ruleOfNines: BurnBodyArea[] = [
  { id: 'head', name: 'Head & Neck', adultPercent: 9, childPercent: 18, infantPercent: 18 },
  { id: 'anteriorTrunk', name: 'Anterior Trunk', adultPercent: 18, childPercent: 18, infantPercent: 18 },
  { id: 'posteriorTrunk', name: 'Posterior Trunk', adultPercent: 18, childPercent: 18, infantPercent: 18 },
  { id: 'rightArm', name: 'Right Arm', adultPercent: 9, childPercent: 9, infantPercent: 9 },
  { id: 'leftArm', name: 'Left Arm', adultPercent: 9, childPercent: 9, infantPercent: 9 },
  { id: 'rightLeg', name: 'Right Leg', adultPercent: 18, childPercent: 14, infantPercent: 14 },
  { id: 'leftLeg', name: 'Left Leg', adultPercent: 18, childPercent: 14, infantPercent: 14 },
  { id: 'genitalia', name: 'Genitalia/Perineum', adultPercent: 1, childPercent: 1, infantPercent: 1 },
];

// ==================== SERVICE CLASS ====================

class BurnCareService {
  // ==================== TBSA CALCULATIONS ====================

  /**
   * Calculate TBSA using Lund-Browder chart (more accurate for all ages)
   */
  calculateTBSALundBrowder(
    burntAreas: Record<string, { percent: number; depth: BurnDepth }>,
    ageYears: number
  ): { totalTBSA: number; byDepth: Record<BurnDepth, number> } {
    let totalTBSA = 0;
    const byDepth: Record<BurnDepth, number> = {
      superficial: 0,
      superficial_partial: 0,
      deep_partial: 0,
      full_thickness: 0,
    };

    // Determine age bracket
    let ageKey = 'adult';
    if (ageYears < 1) ageKey = '0';
    else if (ageYears < 5) ageKey = '1';
    else if (ageYears < 10) ageKey = '5';
    else if (ageYears < 15) ageKey = '10';
    else if (ageYears < 18) ageKey = '15';

    Object.entries(burntAreas).forEach(([area, data]) => {
      if (data.percent > 0) {
        const maxPercent = lundBrowderChart[area]?.[ageKey] || 0;
        const actualPercent = Math.min(data.percent, maxPercent);
        totalTBSA += actualPercent;
        byDepth[data.depth] += actualPercent;
      }
    });

    return { totalTBSA: Math.round(totalTBSA * 10) / 10, byDepth };
  }

  /**
   * Calculate TBSA using Rule of 9s (quick assessment)
   */
  calculateTBSARuleOfNines(
    burntAreas: Record<string, { percent: number; depth: BurnDepth }>,
    isChild: boolean = false
  ): { totalTBSA: number; byDepth: Record<BurnDepth, number> } {
    let totalTBSA = 0;
    const byDepth: Record<BurnDepth, number> = {
      superficial: 0,
      superficial_partial: 0,
      deep_partial: 0,
      full_thickness: 0,
    };

    Object.entries(burntAreas).forEach(([areaId, data]) => {
      if (data.percent > 0) {
        const bodyArea = ruleOfNines.find(a => a.id === areaId);
        if (bodyArea) {
          const maxPercent = isChild ? bodyArea.childPercent : bodyArea.adultPercent;
          const actualPercent = (data.percent / 100) * maxPercent;
          totalTBSA += actualPercent;
          byDepth[data.depth] += actualPercent;
        }
      }
    });

    return { totalTBSA: Math.round(totalTBSA * 10) / 10, byDepth };
  }

  /**
   * Palm method for scattered burns (1% TBSA per palm)
   */
  calculateTBSAPalm(numberOfPalms: number): number {
    return numberOfPalms; // Each palm = 1% TBSA
  }

  // ==================== FLUID RESUSCITATION ====================

  /**
   * Calculate fluid requirements using Parkland formula
   * 4 mL x kg x %TBSA, half in first 8 hours from time of burn
   */
  calculateParklandFormula(weight: number, tbsa: number, hoursSinceBurn: number = 0): FluidCalculation {
    const totalVolume = 4 * weight * tbsa;
    const first8h = totalVolume / 2;
    const next16h = totalVolume / 2;
    
    // Adjust for time already elapsed
    const remainingFirst8h = Math.max(0, 8 - hoursSinceBurn);
    const adjustedFirst8hRate = remainingFirst8h > 0 ? first8h / remainingFirst8h : 0;

    return {
      formula: 'parkland',
      totalVolume24h: Math.round(totalVolume),
      first8h: Math.round(first8h),
      next16h: Math.round(next16h),
      hourlyRate8h: Math.round(adjustedFirst8hRate),
      hourlyRate16h: Math.round(next16h / 16),
      crystalloidVolume: Math.round(totalVolume), // Lactated Ringer's
      urineOutputTarget: weight > 30 ? 0.5 : 1, // mL/kg/hr
      recommendations: [
        'Use Lactated Ringer\'s solution',
        `Target urine output: ${weight > 30 ? '0.5-1' : '1-2'} mL/kg/hr`,
        'Monitor and adjust based on clinical response',
        'Watch for compartment syndrome if edema significant',
        'Consider colloids after 24 hours if needed',
      ],
    };
  }

  /**
   * Calculate Modified Brooke formula
   * 2 mL x kg x %TBSA in first 24 hours
   */
  calculateModifiedBrooke(weight: number, tbsa: number): FluidCalculation {
    const totalVolume = 2 * weight * tbsa;
    const first8h = totalVolume / 2;
    const next16h = totalVolume / 2;

    return {
      formula: 'modified_brooke',
      totalVolume24h: Math.round(totalVolume),
      first8h: Math.round(first8h),
      next16h: Math.round(next16h),
      hourlyRate8h: Math.round(first8h / 8),
      hourlyRate16h: Math.round(next16h / 16),
      crystalloidVolume: Math.round(totalVolume),
      urineOutputTarget: weight > 30 ? 0.5 : 1,
      recommendations: [
        'Use Lactated Ringer\'s solution',
        'More conservative than Parkland formula',
        'Appropriate for smaller burns or elderly patients',
        'Monitor urine output closely',
      ],
    };
  }

  /**
   * Calculate Muir-Barclay formula (UK)
   * Uses 4-hour periods with colloid
   */
  calculateMuirBarclay(weight: number, tbsa: number): FluidCalculation {
    // %TBSA x weight / 2 = volume per period
    const volumePerPeriod = (tbsa * weight) / 2;
    const totalVolume = volumePerPeriod * 6; // 6 periods in 36 hours

    return {
      formula: 'muir_barclay',
      totalVolume24h: Math.round(volumePerPeriod * 4), // First 4 periods
      first8h: Math.round(volumePerPeriod * 2),
      next16h: Math.round(volumePerPeriod * 2),
      hourlyRate8h: Math.round(volumePerPeriod / 4),
      hourlyRate16h: Math.round(volumePerPeriod / 4),
      crystalloidVolume: 0,
      colloidVolume: Math.round(totalVolume), // Human Albumin Solution
      urineOutputTarget: weight > 30 ? 0.5 : 1,
      recommendations: [
        'Use Human Albumin Solution (4.5%)',
        'Give in 6 periods: 4hr, 4hr, 4hr, 6hr, 6hr, 12hr',
        'Common in UK practice',
        'Add maintenance crystalloid as needed',
      ],
    };
  }

  // ==================== ABSI SCORING ====================

  /**
   * Calculate Abbreviated Burn Severity Index
   */
  calculateABSI(
    age: number,
    tbsa: number,
    inhalationInjury: boolean,
    hasFullThickness: boolean,
    gender: 'male' | 'female'
  ): ABSIScore {
    const components = {
      age: 0,
      tbsa: 0,
      inhalation: 0,
      fullThickness: 0,
      gender: 0,
    };

    // Age scoring
    if (age <= 20) components.age = 1;
    else if (age <= 40) components.age = 2;
    else if (age <= 60) components.age = 3;
    else if (age <= 80) components.age = 4;
    else components.age = 5;

    // TBSA scoring
    if (tbsa <= 10) components.tbsa = 1;
    else if (tbsa <= 20) components.tbsa = 2;
    else if (tbsa <= 30) components.tbsa = 3;
    else if (tbsa <= 40) components.tbsa = 4;
    else if (tbsa <= 50) components.tbsa = 5;
    else if (tbsa <= 60) components.tbsa = 6;
    else if (tbsa <= 70) components.tbsa = 7;
    else if (tbsa <= 80) components.tbsa = 8;
    else if (tbsa <= 90) components.tbsa = 9;
    else components.tbsa = 10;

    // Other factors
    if (inhalationInjury) components.inhalation = 1;
    if (hasFullThickness) components.fullThickness = 1;
    if (gender === 'female') components.gender = 1;

    const score = Object.values(components).reduce((a, b) => a + b, 0);

    // Survival probability and risk category
    let survivalProbability = '';
    let riskCategory: ABSIScore['riskCategory'] = 'very_low';

    if (score <= 2) { survivalProbability = '>99%'; riskCategory = 'very_low'; }
    else if (score <= 3) { survivalProbability = '98%'; riskCategory = 'very_low'; }
    else if (score <= 4) { survivalProbability = '90%'; riskCategory = 'low'; }
    else if (score <= 5) { survivalProbability = '80%'; riskCategory = 'moderate'; }
    else if (score <= 6) { survivalProbability = '60%'; riskCategory = 'moderate'; }
    else if (score <= 7) { survivalProbability = '40%'; riskCategory = 'high'; }
    else if (score <= 8) { survivalProbability = '20%'; riskCategory = 'high'; }
    else if (score <= 9) { survivalProbability = '10%'; riskCategory = 'very_high'; }
    else { survivalProbability = '<5%'; riskCategory = 'severe'; }

    return { score, survivalProbability, riskCategory, components };
  }

  // ==================== NUTRITION ASSESSMENT ====================

  /**
   * Calculate nutritional requirements for burn patients
   */
  calculateNutrition(weight: number, tbsa: number, age: number): BurnNutrition {
    // Use Curreri formula for adults, modified for children
    let caloriesPerDay: number;
    let formula: string;

    if (age >= 18) {
      // Curreri adult: 25 kcal/kg + 40 kcal/% TBSA
      caloriesPerDay = (25 * weight) + (40 * tbsa);
      formula = 'Curreri Formula (Adult)';
    } else if (age >= 4) {
      // Curreri pediatric: 60 kcal/kg + 35 kcal/% TBSA
      caloriesPerDay = (60 * weight) + (35 * tbsa);
      formula = 'Curreri Formula (Pediatric)';
    } else {
      // Infants: 2100 kcal/m² + 1000 kcal/m² burned
      // Approximating BSA from weight
      const bsa = 0.1 * Math.pow(weight, 0.67);
      caloriesPerDay = (2100 * bsa) + (1000 * bsa * (tbsa / 100));
      formula = 'Galveston Formula (Infant)';
    }

    // Protein: 1.5-2g/kg for burns >20% TBSA
    const proteinPerDay = tbsa > 20 ? weight * 2 : weight * 1.5;

    // Determine feeding route
    let feedingRoute: BurnNutrition['feedingRoute'] = 'oral';
    if (tbsa > 40) feedingRoute = 'enteral';
    if (tbsa > 70) feedingRoute = 'parenteral';

    return {
      caloriesPerDay: Math.round(caloriesPerDay),
      proteinPerDay: Math.round(proteinPerDay),
      formula,
      vitamins: {
        vitaminC: 1000, // mg/day
        vitaminA: 10000, // IU/day
        zinc: 220, // mg elemental zinc
        selenium: 100, // mcg/day
      },
      feedingRoute,
      recommendations: [
        'Start enteral nutrition within 6 hours if possible',
        'Use high-protein, high-calorie formula',
        'Glutamine supplementation beneficial',
        'Monitor glucose closely - hyperglycemia common',
        'Weekly indirect calorimetry if available',
        'Vitamin C promotes wound healing',
        'Zinc deficiency impairs healing - supplement',
      ],
    };
  }

  // ==================== WOUND CARE PROTOCOLS ====================

  /**
   * Generate wound care protocol based on burn characteristics
   */
  generateWoundCareProtocol(
    depth: BurnDepth,
    tbsa: number,
    location: string,
    daysSinceInjury: number
  ): BurnWoundCareProtocol {
    const protocol: BurnWoundCareProtocol = {
      dressingType: '',
      frequency: '',
      cleansingSolution: 'Sterile saline or chlorhexidine 0.05%',
      topicalAgent: '',
      specialInstructions: [],
      painManagement: [],
    };

    // Dressing based on depth
    switch (depth) {
      case 'superficial':
        protocol.dressingType = 'Paraffin gauze or hydrogel';
        protocol.frequency = 'Every 3-5 days';
        protocol.topicalAgent = 'Aloe vera or moisturizer';
        protocol.painManagement = ['Paracetamol', 'Topical anaesthetic spray'];
        break;

      case 'superficial_partial':
        protocol.dressingType = 'Silver foam dressing (Mepilex Ag) or Biobrane';
        protocol.frequency = 'Every 2-3 days';
        protocol.topicalAgent = 'Silver sulfadiazine 1% or Acticoat';
        protocol.painManagement = ['Paracetamol', 'NSAIDs', 'Tramadol PRN'];
        protocol.specialInstructions = [
          'Debride loose blisters',
          'Leave intact blisters if <2cm',
          'Monitor for infection daily',
        ];
        break;

      case 'deep_partial':
        protocol.dressingType = 'Silver-impregnated dressing (Acticoat, Aquacel Ag)';
        protocol.frequency = 'Every 1-3 days depending on exudate';
        protocol.topicalAgent = 'Mafenide acetate for eschar penetration';
        protocol.painManagement = ['Morphine', 'Ketamine for dressing changes', 'Gabapentin'];
        protocol.debridementMethod = 'Enzymatic (Collagenase) or surgical';
        protocol.grafting = {
          indicated: true,
          timing: 'After demarcation (7-14 days)',
          type: 'Split-thickness skin graft',
        };
        protocol.specialInstructions = [
          'Serial examination to assess conversion to full thickness',
          'Consider early excision if conversion suspected',
          'Prepare for grafting',
        ];
        break;

      case 'full_thickness':
        protocol.dressingType = 'Antimicrobial dressing with absorptive layer';
        protocol.frequency = 'Daily initially, then based on wound status';
        protocol.topicalAgent = 'Mafenide acetate (penetrates eschar) or nystatin for fungal prevention';
        protocol.painManagement = ['Opioids', 'Ketamine', 'Regional anesthesia for dressing changes'];
        protocol.debridementMethod = 'Early surgical excision recommended';
        protocol.grafting = {
          indicated: true,
          timing: 'Early excision within 3-5 days',
          type: tbsa > 40 ? 'Consider cultured skin, Integra, or allograft' : 'Split-thickness autograft',
        };
        protocol.specialInstructions = [
          'Early surgical excision and grafting improves outcomes',
          'Watch for eschar constriction in circumferential burns',
          'Escharotomy may be needed',
        ];
        break;
    }

    // Location-specific instructions
    if (location.toLowerCase().includes('face')) {
      protocol.specialInstructions.push(
        'Ophthalmology consult for periorbital burns',
        'Use open technique or specialized facial dressings',
        'Frequent lubrication of eyes'
      );
    }

    if (location.toLowerCase().includes('hand')) {
      protocol.specialInstructions.push(
        'Early hand therapy referral',
        'Splint in position of safety (intrinsic plus)',
        'Aggressive early mobilization when possible'
      );
    }

    if (location.toLowerCase().includes('perineum') || location.toLowerCase().includes('genital')) {
      protocol.specialInstructions.push(
        'Foley catheter for major burns',
        'Careful positioning',
        'Frequent cleansing'
      );
    }

    // Day-specific adjustments
    if (daysSinceInjury > 14 && protocol.grafting?.indicated) {
      protocol.specialInstructions.push('Wound bed preparation for delayed grafting');
    }

    return protocol;
  }

  // ==================== DATABASE OPERATIONS ====================

  /**
   * Get all burn assessments for a patient
   */
  async getPatientBurns(patientId: string): Promise<BurnAssessment[]> {
    return db.burnAssessments
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('createdAt');
  }

  /**
   * Get active burns requiring follow-up
   */
  async getActiveBurns(): Promise<BurnAssessment[]> {
    const burns = await db.burnAssessments.toArray();
    return burns.filter(b => (b as BurnAssessment & { status?: string }).status !== 'healed' && (b as BurnAssessment & { status?: string }).status !== 'grafted');
  }

  /**
   * Calculate expected healing time
   */
  estimateHealingTime(depth: BurnDepth, _tbsa: number): { minDays: number; maxDays: number; notes: string } {
    switch (depth) {
      case 'superficial':
        return { minDays: 5, maxDays: 10, notes: 'Should heal without scarring' };
      case 'superficial_partial':
        return { minDays: 10, maxDays: 21, notes: 'Usually heals without grafting; minimal scarring' };
      case 'deep_partial':
        return { minDays: 21, maxDays: 35, notes: 'May require grafting; significant scarring likely' };
      case 'full_thickness':
        return { 
          minDays: 28, 
          maxDays: 90, 
          notes: 'Requires surgical excision and grafting; scarring and contracture expected' 
        };
      default:
        return { minDays: 14, maxDays: 42, notes: 'Variable based on depth' };
    }
  }

  /**
   * Determine if burn meets criteria for specialized burn center referral
   * Based on ABA/ISBI criteria
   */
  requiresBurnCenterReferral(
    tbsa: number,
    depth: BurnDepth,
    locations: string[],
    age: number,
    inhalationInjury: boolean,
    electricalBurn: boolean,
    chemicalBurn: boolean,
    hasComorbidities: boolean
  ): { required: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // TBSA criteria
    if (tbsa > 10 && depth !== 'superficial') {
      reasons.push(`>10% TBSA with partial/full thickness burns (${tbsa}%)`);
    }
    if (age < 10 && tbsa > 10) {
      reasons.push('Pediatric patient with >10% TBSA');
    }
    if (age > 50 && tbsa > 10) {
      reasons.push('Patient >50 years with >10% TBSA');
    }

    // Depth criteria
    if (depth === 'full_thickness' && tbsa > 5) {
      reasons.push('Full thickness burns >5% TBSA');
    }

    // Location criteria
    const criticalLocations = ['face', 'hands', 'feet', 'genitalia', 'perineum', 'joint'];
    locations.forEach(loc => {
      if (criticalLocations.some(crit => loc.toLowerCase().includes(crit))) {
        reasons.push(`Burns to ${loc} - functional/cosmetic area`);
      }
    });

    // Special criteria
    if (inhalationInjury) {
      reasons.push('Inhalation injury suspected');
    }
    if (electricalBurn) {
      reasons.push('Electrical burn - cardiac monitoring and fasciotomy may be needed');
    }
    if (chemicalBurn) {
      reasons.push('Chemical burn - specialized decontamination needed');
    }
    if (hasComorbidities) {
      reasons.push('Significant comorbidities that could affect healing');
    }

    return {
      required: reasons.length > 0,
      reasons,
    };
  }
}

export const burnCareService = new BurnCareService();
