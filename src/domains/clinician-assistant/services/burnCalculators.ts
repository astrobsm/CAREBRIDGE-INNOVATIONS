/**
 * Burn resuscitation calculators for the Clinician Assistant bedside panels.
 *
 * WHY THIS IS SEPARATE FROM src/services/burnCareService.ts
 * AstroHEALTH already has a burnCareService, but its API diverged from the one
 * these panels were written against: it has no revised Baux, no Curreri
 * nutrition targets and no ABA disposition helper, and its Parkland takes
 * `hoursSinceBurn` rather than a burn timestamp. Rewiring the existing service
 * to match would change behaviour for the Burns domain that already depends on
 * it. These are pure functions with no persistence, so keeping a second, small,
 * self-contained copy here is the safer trade — the Burns module is untouched
 * and the assistant behaves exactly as specified.
 *
 * All functions are pure and unit-testable without a DB or a browser.
 */

export type BurnMechanism = 'flame' | 'scald' | 'contact' | 'electrical' | 'chemical' | 'radiation';

export interface ResuscitationPlan {
  protocol: 'parkland';
  fluidType: 'lactated_ringers';
  /** Total crystalloid for the first 24 h from the time of injury (mL). */
  totalVolume24h: number;
  /** First half, due within 8 h of INJURY — not of arrival. */
  firstHalfVolume: number;
  /** Second half, spread over the following 16 h. */
  secondHalfVolume: number;
  /** Rate needed right now to stay on schedule (mL/h). */
  currentRate: number;
  resuscitationStartTime: Date;
  firstHalfEndTime: Date;
  resuscitationEndTime: Date;
  urineOutputTarget: { min: number; max: number };
}

export interface NutritionTargets {
  caloriesPerDay: number;
  proteinPerDay: number;
  formula: string;
}

export type Disposition = 'ward' | 'icu' | 'burn_center' | 'outpatient';

const round = (n: number): number => Math.round(n);

export const burnCareService = {
  /**
   * Parkland formula: 4 mL x weight(kg) x %TBSA over 24 h, half in the first
   * 8 hours.
   *
   * Anchored to the time of INJURY, not presentation. A patient arriving 5
   * hours after a burn has only 3 hours left to receive the first half, so the
   * current rate rises accordingly — that catch-up is the entire reason the
   * formula is specified from injury, and getting it wrong under-resuscitates
   * exactly the patients who present late.
   */
  calculateParklandFormula(
    weightKg: number,
    tbsa: number,
    timeOfBurn: Date,
    currentTime: Date = new Date(),
  ): ResuscitationPlan {
    const totalVolume24h = 4 * weightKg * tbsa;
    const firstHalfVolume = totalVolume24h / 2;
    const secondHalfVolume = totalVolume24h / 2;

    const burnTime = new Date(timeOfBurn);
    const firstHalfEndTime = new Date(burnTime.getTime() + 8 * 60 * 60 * 1000);
    const resuscitationEndTime = new Date(burnTime.getTime() + 24 * 60 * 60 * 1000);

    const hoursElapsed = (currentTime.getTime() - burnTime.getTime()) / (1000 * 60 * 60);

    let currentRate = 0;
    if (hoursElapsed < 8) {
      currentRate = firstHalfVolume / Math.max(8 - hoursElapsed, 1e-6);
    } else if (hoursElapsed < 24) {
      currentRate = secondHalfVolume / Math.max(24 - hoursElapsed, 1e-6);
    }

    return {
      protocol: 'parkland',
      fluidType: 'lactated_ringers',
      totalVolume24h: round(totalVolume24h),
      firstHalfVolume: round(firstHalfVolume),
      secondHalfVolume: round(secondHalfVolume),
      currentRate: round(currentRate),
      resuscitationStartTime: burnTime,
      firstHalfEndTime,
      resuscitationEndTime,
      urineOutputTarget: { min: 0.5, max: 1.0 },
    };
  },

  /** Baux score: age + %TBSA. */
  calculateBauxScore(age: number, tbsa: number): number {
    return age + tbsa;
  },

  /**
   * Revised Baux: age + %TBSA + 17 if inhalation injury.
   * A score approaching 100 indicates roughly 50% predicted mortality, which is
   * why the panel flags >= 100 in red.
   */
  calculateRevisedBauxScore(age: number, tbsa: number, inhalationInjury: boolean): number {
    return age + tbsa + (inhalationInjury ? 17 : 0);
  },

  /** Curreri formula for burn hypermetabolism. */
  calculateNutritionTargets(weightKg: number, tbsa: number): NutritionTargets {
    return {
      caloriesPerDay: round(25 * weightKg + 40 * tbsa),
      proteinPerDay: Math.round(1.5 * weightKg * 10) / 10, // 1.5-2.0 g/kg/day
      formula: `Curreri: 25x${weightKg}kg + 40x${tbsa}%TBSA`,
    };
  },

  /** ABA burn centre referral criteria. */
  determineDisposition(
    tbsa: number,
    hasInhalationInjury: boolean,
    hasFullThickness: boolean,
    age: number,
    mechanism: BurnMechanism,
    hasCircumferentialBurn: boolean,
  ): { disposition: Disposition; reasons: string[] } {
    const reasons: string[] = [];
    let disposition: Disposition = 'outpatient';

    if (tbsa >= 10) {
      disposition = 'burn_center';
      reasons.push(`TBSA >=10% (${tbsa}%)`);
    }
    if (hasFullThickness && tbsa >= 5) {
      disposition = 'burn_center';
      reasons.push('Full-thickness burns >=5% TBSA');
    }
    // Inhalation injury outranks the others: it is an airway problem, and the
    // airway is lost long before the burn itself becomes the issue.
    if (hasInhalationInjury) {
      disposition = 'icu';
      reasons.push('Inhalation injury');
    }
    if (mechanism === 'electrical' || mechanism === 'chemical') {
      disposition = disposition === 'outpatient' ? 'burn_center' : disposition;
      reasons.push(`${mechanism.charAt(0).toUpperCase() + mechanism.slice(1)} burn mechanism`);
    }
    if (hasCircumferentialBurn) {
      disposition = disposition === 'outpatient' ? 'burn_center' : disposition;
      reasons.push('Circumferential burn - escharotomy may be needed');
    }
    if ((age < 2 || age > 60) && disposition === 'outpatient' && tbsa >= 5) {
      disposition = 'ward';
      reasons.push(`Age extremes (${age} years) with significant burn`);
    }

    if (disposition === 'outpatient' && tbsa < 5 && !hasFullThickness) {
      reasons.push('Minor burn - suitable for outpatient management');
    } else if (disposition === 'outpatient' && tbsa >= 5) {
      disposition = 'ward';
      reasons.push(`TBSA ${tbsa}% requires inpatient monitoring`);
    }

    return { disposition, reasons };
  },
};
