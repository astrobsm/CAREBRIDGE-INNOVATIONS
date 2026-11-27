/**
 * Clinical defaults the practice owner decided on 27 Nov 2026, where the
 * Wound Clinic Protocol (protocols/woundClinic.v1.ts, the owner's text,
 * unchanged) is silent or the code needed a number. Each constant names its
 * source. The rules plan and the results interpretation read these; the
 * protocol file is never edited to hold them.
 */

/**
 * Owner decision 2026-11-27: child iron follows the protocol's child table,
 * "3 mg/kg once daily; up to 6 mg/kg/day in severe anaemia (maximum
 * 200 mg/day)". The table's own maximum (200 mg/day) is the cap; iron is NOT
 * capped at the 65 mg adult dose. Zinc keeps its 40 mg/day maximum, and the
 * other child nutrients with no stated maximum stay "never above the adult dose".
 */
export const CHILD_IRON_OWNER_DECISION = {
  decided: '2026-11-27',
  capAtAdultDose: false,
  hardRule: 'Child iron: dose by weight up to the child table maximum of 200 mg/day; it is not capped at the 65 mg adult dose (owner decision 2026-11-27).',
  source: 'Wound clinic protocol child table (iron row); owner decision 2026-11-27',
} as const;

/**
 * Owner decision 2026-11-27: "severe anaemia" (child iron, up to 6 mg/kg/day)
 * is not defined in the protocol; Hb below 7 g/dL is used, the WHO severe
 * anaemia threshold (WHO 2011, Haemoglobin concentrations for the diagnosis
 * of anaemia and assessment of severity, Table 1: under 7 g/dL at 6–59 months
 * and in pregnancy; WHO puts it at under 8 g/dL from 5 years). 7 g/dL is
 * used at every child age, so the higher dose is kept for the most anaemic.
 */
export const SEVERE_ANAEMIA_HB_BELOW_GDL = 7;
export const SEVERE_ANAEMIA_SOURCE = 'WHO severe anaemia threshold, Hb below 7 g/dL (owner decision 2026-11-27)';

/**
 * Owner decision 2026-11-27: CRP above 5 mg/L counts as "high" wherever the
 * protocol says "high CRP" (ferritin below 100 ng/mL with high CRP suggests
 * iron deficiency; serum zinc is falsely low when CRP is high). Source: WHO
 * guideline on the use of ferritin concentrations to assess iron status in
 * individuals and populations (2020), which takes CRP above 5 mg/L as
 * inflammation. The protocol's thresholds.highCrpAboveMgL holds the same
 * number; a test keeps the two equal.
 */
export const HIGH_CRP_OWNER_DECISION = {
  decided: '2026-11-27',
  highAboveMgL: 5,
  source: 'WHO 2020 guideline on ferritin concentrations to assess iron status: CRP above 5 mg/L = inflammation (owner decision 2026-11-27)',
} as const;

/**
 * Owner decision 2026-11-27: a "major burn" (the protocol's "large burns":
 * minerals, burn nutrition targets, zinc and vitamin C) is TBSA 15% or more
 * in adults and 10% or more in children: the British Burn Association / NICE
 * threshold for formal IV fluid resuscitation. (It was 20% in adults.)
 */
export const MAJOR_BURN_TBSA_OWNER_DECISION = {
  decided: '2026-11-27',
  adultFromPercent: 15,
  childFromPercent: 10,
  source: 'British Burn Association / NICE: formal IV fluid resuscitation from 15% TBSA in adults, 10% in children (owner decision 2026-11-27)',
} as const;

export const isMajorBurnTbsa = (tbsaPercent: number, isChild: boolean): boolean =>
  tbsaPercent >= (isChild ? MAJOR_BURN_TBSA_OWNER_DECISION.childFromPercent : MAJOR_BURN_TBSA_OWNER_DECISION.adultFromPercent);
