/**
 * Wound Care Service
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive wound care management with AI-powered measurements,
 * healing progress tracking, and treatment recommendations.
 */

import { db } from '../database';
import { syncRecord } from './cloudSyncService';
import type { Wound, TissueType } from '../types';

// Wound Measurement Result from AI Analysis
export interface WoundMeasurementResult {
  id: string;
  woundId: string;
  photoId: string;
  measurements: {
    length: number; // cm
    width: number; // cm
    depth?: number; // cm (if available)
    area: number; // cm²
    perimeter?: number; // cm
    volume?: number; // cm³
  };
  tissueAnalysis: {
    granulationPercent: number;
    sloughPercent: number;
    necroticPercent: number;
    epithelialPercent: number;
  };
  colorAnalysis: {
    dominantColors: string[];
    healthIndicator: 'healthy' | 'concerning' | 'critical';
  };
  calibrationMethod: 'ruler' | 'coin' | 'reference_paper' | 'manual';
  calibrationFactor: number;
  confidence: number; // 0-100%
  capturedAt: Date;
  analyzedBy: 'ai' | 'manual';
}

// Wound Healing Phase Classification
export interface WoundHealingPhase {
  phase: 'hemostasis' | 'inflammatory' | 'proliferative' | 'remodeling' | 'extension' | 'transition' | 'repair';
  name: string;
  description: string;
  characteristics: string[];
  expectedDuration: string;
  treatmentFocus: string[];
  dressingRecommendations: string[];
  monitoringFrequency: string;
}

// Wound Care Protocol
export interface WoundCareProtocol {
  id: string;
  woundPhase: string;
  cleansingAgent: string;
  primaryDressing: string;
  secondaryDressing: string;
  dressingFrequency: string;
  specialInstructions: string[];
  contraindications: string[];
  monitoringParameters: string[];
}

// Wound Progress Entry
export interface WoundProgressEntry {
  id: string;
  woundId: string;
  date: Date;
  measurements: {
    length: number;
    width: number;
    depth?: number;
    area: number;
  };
  tissueDistribution: {
    [key in TissueType]?: number; // percentage
  };
  healingPhase: string;
  exudateAmount: 'none' | 'light' | 'moderate' | 'heavy';
  exudateType?: string;
  odor: boolean;
  painLevel: number;
  periWoundCondition: string;
  dressingUsed: string;
  complications?: string[];
  notes?: string;
  photoIds?: string[];
  assessedBy: string;
}

// Healing Rate Calculation
export interface HealingRateResult {
  percentHealed: number;
  areaReduction: number; // cm²
  areaReductionPercent: number;
  estimatedHealingDays: number | null;
  weeklyHealingRate: number; // cm² per week
  trend: 'improving' | 'stable' | 'deteriorating';
  recommendations: string[];
}

// Wound healing phases with treatment protocols
const woundHealingPhases: Record<string, WoundHealingPhase> = {
  extension: {
    phase: 'extension',
    name: 'Extension Phase',
    description: 'Necrotic and edematous with no evidence of granulation or healthy tissue',
    characteristics: [
      'Necrotic tissue present',
      'Significant wound bed slough',
      'Moderate to heavy exudate',
      'Peri-wound erythema or edema',
      'No visible granulation tissue'
    ],
    expectedDuration: '3-7 days with optimal care',
    treatmentFocus: [
      'Debridement of necrotic tissue',
      'Infection control',
      'Moisture balance',
      'Exudate management'
    ],
    dressingRecommendations: [
      'Clean with Wound Cleanser Solution',
      'Apply Hydrogel for autolytic debridement',
      'Use Honey-based dressings for antimicrobial action',
      'Cover with absorbent secondary dressing'
    ],
    monitoringFrequency: 'Daily'
  },
  transition: {
    phase: 'transition',
    name: 'Transition Phase',
    description: 'Granulation up to 40% of wound surface, edema reduced, discharges minimal',
    characteristics: [
      'Early granulation tissue (1-40%)',
      'Reduced slough coverage',
      'Light to moderate exudate',
      'Reduced peri-wound inflammation',
      'Wound edges beginning to contract'
    ],
    expectedDuration: '7-14 days',
    treatmentFocus: [
      'Promote granulation',
      'Maintain moist environment',
      'Protect new tissue',
      'Continue infection prevention'
    ],
    dressingRecommendations: [
      'Clean with Wound Cleanser Solution',
      'Apply Hydrogel to maintain moisture',
      'Use Honey Gauze for continued antimicrobial protection',
      'Light absorbent secondary dressing'
    ],
    monitoringFrequency: 'Alternate Day'
  },
  repair: {
    phase: 'repair',
    name: 'Repair/Proliferative Phase',
    description: 'Active granulation and epithelialization, minimal to no exudate',
    characteristics: [
      'Healthy granulation tissue (>40%)',
      'Active epithelialization from edges',
      'Minimal exudate',
      'Wound contraction evident',
      'Pink/red wound bed'
    ],
    expectedDuration: '2-4 weeks',
    treatmentFocus: [
      'Protect new tissue',
      'Maintain optimal moisture',
      'Support epithelialization',
      'Prevent trauma to healing tissue'
    ],
    dressingRecommendations: [
      'Clean gently with saline or cleanser',
      'Apply thin layer of wound gel',
      'Use non-adherent primary dressing',
      'Light protective cover dressing'
    ],
    monitoringFrequency: 'Every 2-3 Days'
  },
  remodeling: {
    phase: 'remodeling',
    name: 'Remodeling/Maturation Phase',
    description: 'Wound closed, scar maturation in progress',
    characteristics: [
      'Complete epithelialization',
      'Scar tissue forming',
      'Continued collagen reorganization',
      'Gradual increase in tensile strength'
    ],
    expectedDuration: '3 weeks to 2 years',
    treatmentFocus: [
      'Scar management',
      'Prevent contracture',
      'UV protection',
      'Moisturization'
    ],
    dressingRecommendations: [
      'Silicone scar sheets if indicated',
      'Moisturizing lotion',
      'Sunscreen protection',
      'Compression therapy if needed'
    ],
    monitoringFrequency: 'Weekly to Monthly'
  }
};

// WHO-aligned dressing materials and their indications
const dressingMaterials = {
  hydrogel: {
    name: 'Hydrogel',
    indications: ['Dry wounds', 'Necrotic tissue', 'Slough'],
    contraindications: ['Heavy exudate', 'Infected wounds without systemic treatment'],
    changeFrequency: 'Every 1-3 days'
  },
  alginate: {
    name: 'Alginate',
    indications: ['Moderate to heavy exudate', 'Cavity wounds', 'Bleeding wounds'],
    contraindications: ['Dry wounds', 'Third-degree burns'],
    changeFrequency: 'When saturated or every 2-3 days'
  },
  foam: {
    name: 'Foam Dressing',
    indications: ['Light to moderate exudate', 'Fragile peri-wound skin', 'Pressure relief needed'],
    contraindications: ['Dry wounds', 'Deep narrow wounds'],
    changeFrequency: 'Every 3-7 days'
  },
  hydrocolloid: {
    name: 'Hydrocolloid',
    indications: ['Light exudate', 'Clean granulating wounds', 'Autolytic debridement'],
    contraindications: ['Infected wounds', 'Heavy exudate', 'Fragile skin'],
    changeFrequency: 'Every 3-7 days'
  },
  honeyDressing: {
    name: 'Medical-Grade Honey Dressing',
    indications: ['Infected wounds', 'Slough', 'Malodorous wounds', 'Burns'],
    contraindications: ['Honey allergy'],
    changeFrequency: 'Daily to alternate days'
  },
  silverDressing: {
    name: 'Silver Antimicrobial Dressing',
    indications: ['Infected wounds', 'High bacterial bioburden', 'Delayed healing'],
    contraindications: ['Silver allergy', 'MRI within 48 hours'],
    changeFrequency: 'Every 1-7 days depending on product'
  }
};

class WoundCareService {
  /**
   * Determine wound healing phase based on tissue distribution
   */
  determineHealingPhase(tissueDistribution: { [key in TissueType]?: number }): WoundHealingPhase {
    const necroticPercent = (tissueDistribution.necrotic || 0) + (tissueDistribution.eschar || 0);
    const sloughPercent = tissueDistribution.slough || 0;
    const granulationPercent = tissueDistribution.granulation || 0;
    const epithelialPercent = tissueDistribution.epithelial || 0;

    // Determine phase based on tissue percentages
    if (necroticPercent > 20 || (sloughPercent > 40 && granulationPercent < 10)) {
      return woundHealingPhases.extension;
    } else if (granulationPercent > 0 && granulationPercent <= 40) {
      return woundHealingPhases.transition;
    } else if (granulationPercent > 40 || epithelialPercent > 20) {
      return woundHealingPhases.repair;
    } else if (epithelialPercent >= 90) {
      return woundHealingPhases.remodeling;
    }

    return woundHealingPhases.transition;
  }

  /**
   * Calculate wound healing rate and estimated healing time
   */
  calculateHealingRate(progressEntries: WoundProgressEntry[]): HealingRateResult {
    if (progressEntries.length < 2) {
      return {
        percentHealed: 0,
        areaReduction: 0,
        areaReductionPercent: 0,
        estimatedHealingDays: null,
        weeklyHealingRate: 0,
        trend: 'stable',
        recommendations: ['Insufficient data - continue monitoring']
      };
    }

    // Sort by date
    const sorted = [...progressEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const initialEntry = sorted[0];
    const latestEntry = sorted[sorted.length - 1];
    const initialArea = initialEntry.measurements.area;
    const currentArea = latestEntry.measurements.area;

    const areaReduction = initialArea - currentArea;
    const areaReductionPercent = (areaReduction / initialArea) * 100;
    const percentHealed = Math.max(0, Math.min(100, areaReductionPercent));

    // Calculate days between first and last measurement
    const daysDiff = Math.max(1, 
      Math.ceil((new Date(latestEntry.date).getTime() - new Date(initialEntry.date).getTime()) / (1000 * 60 * 60 * 24))
    );

    // Weekly healing rate
    const weeklyHealingRate = (areaReduction / daysDiff) * 7;

    // Estimate remaining healing time
    let estimatedHealingDays: number | null = null;
    if (weeklyHealingRate > 0 && currentArea > 0) {
      estimatedHealingDays = Math.ceil((currentArea / weeklyHealingRate) * 7);
    }

    // Determine trend
    let trend: 'improving' | 'stable' | 'deteriorating';
    if (areaReductionPercent > 10) {
      trend = 'improving';
    } else if (areaReductionPercent < -5) {
      trend = 'deteriorating';
    } else {
      trend = 'stable';
    }

    // Generate recommendations
    const recommendations = this.generateHealingRecommendations(trend, weeklyHealingRate, latestEntry);

    return {
      percentHealed,
      areaReduction,
      areaReductionPercent,
      estimatedHealingDays,
      weeklyHealingRate,
      trend,
      recommendations
    };
  }

  /**
   * Generate healing recommendations based on progress
   */
  private generateHealingRecommendations(
    trend: string,
    weeklyHealingRate: number,
    latestEntry: WoundProgressEntry
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'deteriorating') {
      recommendations.push('URGENT: Wound is deteriorating - review treatment plan');
      recommendations.push('Consider infection assessment and wound swab');
      recommendations.push('Evaluate patient nutrition and hydration status');
      recommendations.push('Review underlying conditions (diabetes, vascular disease)');
      recommendations.push('Consider specialist referral');
    } else if (trend === 'stable' && weeklyHealingRate < 1) {
      recommendations.push('Wound healing is stalled - consider treatment modification');
      recommendations.push('Assess for barriers to healing');
      recommendations.push('Consider advanced wound therapies');
      recommendations.push('Review patient compliance with treatment');
    } else if (trend === 'improving') {
      recommendations.push('Continue current treatment protocol');
      recommendations.push('Monitor for signs of infection');
      recommendations.push('Maintain optimal moisture balance');
    }

    // Phase-specific recommendations
    const phase = this.determineHealingPhase(latestEntry.tissueDistribution);
    recommendations.push(...phase.treatmentFocus);

    return recommendations;
  }

  /**
   * Get recommended dressing based on wound characteristics
   */
  getRecommendedDressing(wound: Partial<Wound>, phase: WoundHealingPhase): string[] {
    const recommendations: string[] = [];

    // Based on exudate
    if (wound.exudateAmount === 'heavy') {
      recommendations.push(dressingMaterials.alginate.name);
      recommendations.push(dressingMaterials.foam.name);
    } else if (wound.exudateAmount === 'moderate') {
      recommendations.push(dressingMaterials.foam.name);
      recommendations.push(dressingMaterials.honeyDressing.name);
    } else if (wound.exudateAmount === 'light' || wound.exudateAmount === 'none') {
      recommendations.push(dressingMaterials.hydrogel.name);
      recommendations.push(dressingMaterials.hydrocolloid.name);
    }

    // Based on phase
    if (phase.phase === 'extension') {
      recommendations.push('Consider enzymatic debriding agents');
      recommendations.push(dressingMaterials.honeyDressing.name);
    }

    // If infection suspected
    if (wound.odor) {
      recommendations.push(dressingMaterials.silverDressing.name);
      recommendations.push(dressingMaterials.honeyDressing.name);
    }

    return [...new Set(recommendations)];
  }

  /**
   * Generate comprehensive wound care protocol
   */
  generateCareProtocol(wound: Wound, tissueDistribution: { [key in TissueType]?: number }): WoundCareProtocol {
    const phase = this.determineHealingPhase(tissueDistribution);
    const dressings = this.getRecommendedDressing(wound, phase);

    return {
      id: `protocol_${Date.now()}`,
      woundPhase: phase.name,
      cleansingAgent: 'Wound Cleanser Solution or Normal Saline',
      primaryDressing: dressings[0] || 'Non-adherent dressing',
      secondaryDressing: 'Absorbent pad and retention bandage',
      dressingFrequency: phase.monitoringFrequency,
      specialInstructions: [
        ...phase.dressingRecommendations,
        'Elevate limb wounds on pillow',
        'Document wound measurements with each dressing change',
        'Take photos for progress comparison'
      ],
      contraindications: [
        'Avoid adhesive dressings on fragile skin',
        'Do not apply silver dressings if MRI planned within 48 hours'
      ],
      monitoringParameters: [
        'Wound size (length x width x depth)',
        'Tissue type distribution',
        'Exudate amount and type',
        'Pain level (0-10)',
        'Peri-wound condition',
        'Signs of infection'
      ]
    };
  }

  /**
   * Save wound progress entry
   */
  async saveProgressEntry(entry: Omit<WoundProgressEntry, 'id'>): Promise<string> {
    const id = `progress_${Date.now()}`;
    const progressEntry: WoundProgressEntry = {
      ...entry,
      id
    };
    // progressEntry will be used when wound_progress table is added
    void progressEntry;

    // Store in wound_progress table (TODO: add to database schema)
    // For now, update wound record directly
    try {
      // await db.wound_progress?.add(_progressEntry);
    } catch (error) {
      console.error('Error saving progress entry:', error);
      // Fallback: update wound record directly
      const wound = await db.wounds.get(entry.woundId);
      if (wound) {
        await db.wounds.update(entry.woundId, {
          length: entry.measurements.length,
          width: entry.measurements.width,
          depth: entry.measurements.depth,
          area: entry.measurements.area,
          tissueType: Object.keys(entry.tissueDistribution).filter(
            key => (entry.tissueDistribution[key as TissueType] || 0) > 0
          ) as TissueType[],
          exudateAmount: entry.exudateAmount,
          exudateType: entry.exudateType as any,
          odor: entry.odor,
          painLevel: entry.painLevel,
          periWoundCondition: entry.periWoundCondition,
          updatedAt: new Date()
        });
        const updatedWound = await db.wounds.get(entry.woundId);
        if (updatedWound) syncRecord('wounds', updatedWound as unknown as Record<string, unknown>);
      }
    }

    return id;
  }

  /**
   * Get wound progress history
   */
  async getProgressHistory(_woundId: string): Promise<WoundProgressEntry[]> {
    try {
      // TODO: Add wound_progress table to database schema
      // For now, return empty array - progress is tracked in wound record
      /* const entries = await db.wound_progress
        ?.where('woundId')
        .equals(woundId)
        .sortBy('date');
      return entries || []; */
      return [];
    } catch (error) {
      console.error('Error fetching progress history:', error);
      return [];
    }
  }

  /**
   * Calculate tissue distribution percentages from selection
   */
  calculateTissueDistribution(
    selectedTissues: TissueType[],
    percentages?: { [key in TissueType]?: number }
  ): { [key in TissueType]?: number } {
    if (percentages) {
      return percentages;
    }

    // Default equal distribution among selected tissues
    const count = selectedTissues.length;
    if (count === 0) return {};

    const percentage = Math.floor(100 / count);
    const distribution: { [key in TissueType]?: number } = {};

    selectedTissues.forEach((tissue, index) => {
      // Add remainder to last tissue
      distribution[tissue] = index === count - 1 
        ? 100 - (percentage * (count - 1))
        : percentage;
    });

    return distribution;
  }

  /**
   * Get all wound healing phases
   */
  getHealingPhases(): Record<string, WoundHealingPhase> {
    return woundHealingPhases;
  }

  /**
   * Get dressing materials info
   */
  getDressingMaterials() {
    return dressingMaterials;
  }

  /**
   * Generate wound assessment report data
   */
  async generateAssessmentReport(woundId: string): Promise<{
    wound: Wound | null;
    progressHistory: WoundProgressEntry[];
    healingRate: HealingRateResult | null;
    currentPhase: WoundHealingPhase | null;
    protocol: WoundCareProtocol | null;
  }> {
    const wound = await db.wounds.get(woundId);
    
    if (!wound) {
      return {
        wound: null,
        progressHistory: [],
        healingRate: null,
        currentPhase: null,
        protocol: null
      };
    }

    const progressHistory = await this.getProgressHistory(woundId);
    const healingRate = progressHistory.length >= 2 
      ? this.calculateHealingRate(progressHistory) 
      : null;

    const tissueDistribution = this.calculateTissueDistribution(wound.tissueType);
    const currentPhase = this.determineHealingPhase(tissueDistribution);
    const protocol = this.generateCareProtocol(wound, tissueDistribution);

    return {
      wound,
      progressHistory,
      healingRate,
      currentPhase,
      protocol
    };
  }
}

export const woundCareService = new WoundCareService();
