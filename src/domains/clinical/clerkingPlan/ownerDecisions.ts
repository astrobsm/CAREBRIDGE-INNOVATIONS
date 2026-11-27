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
