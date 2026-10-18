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
  /** Safety notes on the plan (late presentation, rate capped, paediatrics). */
  notes: string[];
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
   *
   * The catch-up is capped, though. Giving the whole remaining half in the
   * time left becomes a huge bolus near the 8-hour mark (7.9 h gave 80x the
   * scheduled rate), so the rate is held at twice the scheduled rate and the
   * plan says so; beyond 24 h Parkland no longer applies at all.
   */
  calculateParklandFormula(
    weightKg: number,
    tbsa: number,
    timeOfBurn: Date,
    currentTime: Date = new Date(),
    ageYears?: number | null,
  ): ResuscitationPlan {
    const notes: string[] = ['Parkland is a starting estimate — titrate hourly to urine output (ABA / ATLS).'];
    const totalVolume24h = 4 * weightKg * tbsa;
    const firstHalfVolume = totalVolume24h / 2;
    const secondHalfVolume = totalVolume24h / 2;

    const burnTime = new Date(timeOfBurn);
    const firstHalfEndTime = new Date(burnTime.getTime() + 8 * 60 * 60 * 1000);
    const resuscitationEndTime = new Date(burnTime.getTime() + 24 * 60 * 60 * 1000);

    const hoursElapsed = (currentTime.getTime() - burnTime.getTime()) / (1000 * 60 * 60);

    const capAt = (rate: number, scheduled: number, phase: string): number => {
      if (rate <= scheduled * 2) return rate;
      notes.push(
        `Presented late in the ${phase}: catching up would need ${Math.round(rate)} mL/h. `
        + `Rate capped at 2× the scheduled ${Math.round(scheduled)} mL/h — titrate to urine output; senior review.`,
      );
      return scheduled * 2;
    };

    let currentRate = 0;
    if (hoursElapsed < 0) {
      notes.push('Burn time is in the future — check the time of injury.');
    } else if (hoursElapsed < 8) {
      currentRate = capAt(firstHalfVolume / (8 - hoursElapsed), firstHalfVolume / 8, 'first 8 hours');
    } else if (hoursElapsed < 24) {
      currentRate = capAt(secondHalfVolume / (24 - hoursElapsed), secondHalfVolume / 16, 'second 16 hours');
    } else {
      notes.push('More than 24 h since the burn — Parkland no longer applies; give maintenance fluid guided by urine output and ongoing losses.');
    }

    // Children: higher urine-output target, and resuscitation fluid is given
    // on top of dextrose-containing maintenance fluid.
    const child = (ageYears != null && ageYears < 14) || weightKg < 30;
    if (child) {
      notes.push('Child: add maintenance fluid (Holliday–Segar, with dextrose) to the resuscitation volume; target urine output 1.0–1.5 mL/kg/h.');
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
      urineOutputTarget: child ? { min: 1.0, max: 1.5 } : { min: 0.5, max: 1.0 },
      notes,
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
