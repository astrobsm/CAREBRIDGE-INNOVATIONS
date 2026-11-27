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

/**
 * Owner decision 2026-11-27: child anaemia cut-offs (haemoglobin lower
 * limits, g/dL; anaemia is Hb BELOW the limit). They replace the WHO 2011
 * cut-offs used before. Adults keep the protocol's own rule (Hb below 10 g/dL).
 *
 *   under 6 months   no cut-off: interpret against neonatal / infant ranges
 *   6–11 months      10.5   WHO 2024
 *   1–4 years        10.5   Buseri 2010
 *   5–8 years        11.5   Buseri 2010
 *   9–13 years       12.5   Buseri 2010
 *   14–17 years      13.0 boys, 12.0 girls (12.0 when sex is not recorded)   Buseri 2010
 */
export const CHILD_HB_SOURCES = {
  who2024: 'WHO guideline on haemoglobin cutoffs to define anaemia in individuals and populations (2024): 6–23 months, below 10.5 g/dL',
  buseri2010: 'Buseri FI, Siaminabo IJ, Jeremiah ZA. Reference values of hematological indices of infants, children, and adolescents in Port Harcourt, Nigeria. Pathol Lab Med Int 2010;2:65–70. doi:10.2147/PLMI.S9988 (lower 95% limits, Tables 3 and 4)',
} as const;

export interface ChildHbLimit {
  /** Anaemia is Hb below this (g/dL); null when no cut-off is applied (under 6 months). */
  belowGdl: number | null;
  band: string;
  source: string;
  /** Said with the result: no cut-off under 6 months, or sex not recorded at 14–17. */
  note?: string;
}

export const CHILD_HB_UNDER_6_MONTHS_NOTE = 'Under 6 months: no anaemia cut-off is applied; interpret against neonatal / infant ranges.';

export function childHbLimit(ageMonths: number, sex: 'male' | 'female' | null): ChildHbLimit {
  const B = CHILD_HB_SOURCES.buseri2010;
  if (ageMonths < 6) return { belowGdl: null, band: 'under 6 months', source: 'Owner decision 2026-11-27', note: CHILD_HB_UNDER_6_MONTHS_NOTE };
  if (ageMonths < 12) return { belowGdl: 10.5, band: '6–11 months', source: CHILD_HB_SOURCES.who2024 };
  if (ageMonths < 60) return { belowGdl: 10.5, band: '1–4 years', source: B };
  if (ageMonths < 108) return { belowGdl: 11.5, band: '5–8 years', source: B };
  if (ageMonths < 168) return { belowGdl: 12.5, band: '9–13 years', source: B };
  if (sex === 'male') return { belowGdl: 13, band: '14–17 years, boys', source: B };
  if (sex === 'female') return { belowGdl: 12, band: '14–17 years, girls', source: B };
  return { belowGdl: 12, band: '14–17 years', source: B, note: 'Sex not recorded: the girls\' limit (12.0 g/dL) is used.' };
}
