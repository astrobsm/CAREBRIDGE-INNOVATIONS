/**
 * Anthropometric regression equations for config v1.
 *
 * Inputs: kneeHeightCm, ulnaLengthCm, ageYears, muacCm, calfCm,
 * subscapularSkinfoldMm. Output: heightCm or weightKg.
 *
 * A slot with coefficients: null is deliberate. It records that the equation
 * exists and was wanted, but its coefficients could not be confirmed, so none
 * were entered. The engine reports "equation not configured" for it.
 */

import type { EquationDefaults, RegressionEquation } from './types';

const lin = (intercept: number, terms: Record<string, number>) => ({ intercept, terms });

export const HEIGHT_EQUATIONS_V1: RegressionEquation[] = [
  // ── Knee height: Chumlea 1994, adults 18–59, by ancestry ──
  { id: 'kh_chumlea1994_white_m', label: 'Chumlea 1994, white men', predicts: 'heightCm', inputs: ['kneeHeightCm'],
    sex: 'male', population: 'non_hispanic_white', ageMinYears: 18, ageBelowYears: 60,
    coefficients: lin(71.85, { kneeHeightCm: 1.88 }), sourceId: 'chumlea1994' },
  { id: 'kh_chumlea1994_black_m', label: 'Chumlea 1994, black men', predicts: 'heightCm', inputs: ['kneeHeightCm'],
    sex: 'male', population: 'non_hispanic_black', ageMinYears: 18, ageBelowYears: 60,
    coefficients: lin(73.42, { kneeHeightCm: 1.79 }), sourceId: 'chumlea1994' },
  { id: 'kh_chumlea1994_white_f', label: 'Chumlea 1994, white women', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'female', population: 'non_hispanic_white', ageMinYears: 18, ageBelowYears: 60,
    coefficients: lin(70.25, { kneeHeightCm: 1.87, ageYears: -0.06 }), sourceId: 'chumlea1994' },
  { id: 'kh_chumlea1994_black_f', label: 'Chumlea 1994, black women', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'female', population: 'non_hispanic_black', ageMinYears: 18, ageBelowYears: 60,
    coefficients: lin(68.10, { kneeHeightCm: 1.86, ageYears: -0.06 }), sourceId: 'chumlea1994' },

  // ── Knee height: Chumlea 1998 (NHANES III), age 60+, by ancestry ──
  { id: 'kh_chumlea1998_nhw_m', label: 'Chumlea 1998 NHANES III, non-Hispanic white men', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'male', population: 'non_hispanic_white', ageMinYears: 60, ageBelowYears: null,
    coefficients: lin(78.31, { kneeHeightCm: 1.94, ageYears: -0.14 }), sourceId: 'chumlea1998' },
  { id: 'kh_chumlea1998_nhb_m', label: 'Chumlea 1998 NHANES III, non-Hispanic black men', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'male', population: 'non_hispanic_black', ageMinYears: 60, ageBelowYears: null,
    coefficients: lin(79.69, { kneeHeightCm: 1.85, ageYears: -0.14 }), sourceId: 'chumlea1998' },
  { id: 'kh_chumlea1998_ma_m', label: 'Chumlea 1998 NHANES III, Mexican-American men', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'male', population: 'mexican_american', ageMinYears: 60, ageBelowYears: null,
    coefficients: lin(82.77, { kneeHeightCm: 1.83, ageYears: -0.16 }), sourceId: 'chumlea1998' },
  { id: 'kh_chumlea1998_nhw_f', label: 'Chumlea 1998 NHANES III, non-Hispanic white women', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'female', population: 'non_hispanic_white', ageMinYears: 60, ageBelowYears: null,
    coefficients: lin(82.21, { kneeHeightCm: 1.85, ageYears: -0.21 }), sourceId: 'chumlea1998' },
  { id: 'kh_chumlea1998_nhb_f', label: 'Chumlea 1998 NHANES III, non-Hispanic black women', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'female', population: 'non_hispanic_black', ageMinYears: 60, ageBelowYears: null,
    coefficients: lin(89.58, { kneeHeightCm: 1.61, ageYears: -0.17 }), sourceId: 'chumlea1998' },
  { id: 'kh_chumlea1998_ma_f', label: 'Chumlea 1998 NHANES III, Mexican-American women', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'female', population: 'mexican_american', ageMinYears: 60, ageBelowYears: null,
    coefficients: lin(84.25, { kneeHeightCm: 1.82, ageYears: -0.26 }), sourceId: 'chumlea1998' },

  // ── Knee height: Chumlea 1985, age 60–90 (population-nonspecific use) ──
  { id: 'kh_chumlea1985_m', label: 'Chumlea 1985, men 60–90', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'male', population: 'general', ageMinYears: 60, ageBelowYears: 91,
    coefficients: lin(64.19, { kneeHeightCm: 2.02, ageYears: -0.04 }), sourceId: 'chumlea1985' },
  { id: 'kh_chumlea1985_f', label: 'Chumlea 1985, women 60–90', predicts: 'heightCm', inputs: ['kneeHeightCm', 'ageYears'],
    sex: 'female', population: 'general', ageMinYears: 60, ageBelowYears: 91,
    coefficients: lin(84.88, { kneeHeightCm: 1.83, ageYears: -0.24 }), sourceId: 'chumlea1985' },

  // ── Knee height: Nigerian — slot only ──
  { id: 'kh_nigerian_m', label: 'Nigerian adult men (knee height)', predicts: 'heightCm', inputs: ['kneeHeightCm'],
    sex: 'male', population: 'nigerian', ageMinYears: 18, ageBelowYears: null,
    coefficients: null, sourceId: 'nigerianAnthropometry',
    todo: 'Enter a published Nigerian knee-height equation after verifying it against the primary paper.' },
  { id: 'kh_nigerian_f', label: 'Nigerian adult women (knee height)', predicts: 'heightCm', inputs: ['kneeHeightCm'],
    sex: 'female', population: 'nigerian', ageMinYears: 18, ageBelowYears: null,
    coefficients: null, sourceId: 'nigerianAnthropometry',
    todo: 'Enter a published Nigerian knee-height equation after verifying it against the primary paper.' },

  // ── Ulna length: BAPEN MUST table (linear fit), population-nonspecific ──
  { id: 'ulna_bapen_m_lt65', label: 'BAPEN ulna table, men under 65', predicts: 'heightCm', inputs: ['ulnaLengthCm'],
    sex: 'male', population: 'general', ageMinYears: 18, ageBelowYears: 65,
    coefficients: lin(79.2, { ulnaLengthCm: 3.60 }), sourceId: 'bapenMust2003' },
  { id: 'ulna_bapen_m_ge65', label: 'BAPEN ulna table, men 65 and over', predicts: 'heightCm', inputs: ['ulnaLengthCm'],
    sex: 'male', population: 'general', ageMinYears: 65, ageBelowYears: null,
    coefficients: lin(86.3, { ulnaLengthCm: 3.15 }), sourceId: 'bapenMust2003' },
  { id: 'ulna_bapen_f_lt65', label: 'BAPEN ulna table, women under 65', predicts: 'heightCm', inputs: ['ulnaLengthCm'],
    sex: 'female', population: 'general', ageMinYears: 18, ageBelowYears: 65,
    coefficients: lin(95.6, { ulnaLengthCm: 2.77 }), sourceId: 'bapenMust2003' },
  { id: 'ulna_bapen_f_ge65', label: 'BAPEN ulna table, women 65 and over', predicts: 'heightCm', inputs: ['ulnaLengthCm'],
    sex: 'female', population: 'general', ageMinYears: 65, ageBelowYears: null,
    coefficients: lin(80.4, { ulnaLengthCm: 3.25 }), sourceId: 'bapenMust2003' },
  { id: 'ulna_nigerian_m', label: 'Nigerian adult men (ulna length)', predicts: 'heightCm', inputs: ['ulnaLengthCm'],
    sex: 'male', population: 'nigerian', ageMinYears: 18, ageBelowYears: null,
    coefficients: null, sourceId: 'nigerianAnthropometry', todo: 'Enter a published Nigerian ulna-length equation.' },
  { id: 'ulna_nigerian_f', label: 'Nigerian adult women (ulna length)', predicts: 'heightCm', inputs: ['ulnaLengthCm'],
    sex: 'female', population: 'nigerian', ageMinYears: 18, ageBelowYears: null,
    coefficients: null, sourceId: 'nigerianAnthropometry', todo: 'Enter a published Nigerian ulna-length equation.' },
];

const weightSlot = (id: string, label: string, sex: 'male' | 'female', population: RegressionEquation['population'],
  ageMinYears: number, ageBelowYears: number | null, sourceId: string): RegressionEquation => ({
  id, label, predicts: 'weightKg', inputs: ['kneeHeightCm', 'muacCm'], sex, population, ageMinYears, ageBelowYears,
  coefficients: null, sourceId,
  todo: 'Coefficients not entered: not confirmed against the primary source.',
});

export const WEIGHT_EQUATIONS_V1: RegressionEquation[] = [
  // ── Chumlea 1988, non-ambulatory elderly (65–104) ──
  { id: 'wt_chumlea1988_m', label: 'Chumlea 1988, men 65+', predicts: 'weightKg',
    inputs: ['calfCm', 'kneeHeightCm', 'muacCm', 'subscapularSkinfoldMm'],
    sex: 'male', population: 'general', ageMinYears: 65, ageBelowYears: 105,
    coefficients: lin(-81.69, { calfCm: 0.98, kneeHeightCm: 1.16, muacCm: 1.73, subscapularSkinfoldMm: 0.37 }),
    sourceId: 'chumlea1988' },
  { id: 'wt_chumlea1988_f', label: 'Chumlea 1988, women 65+', predicts: 'weightKg',
    inputs: ['calfCm', 'kneeHeightCm', 'muacCm', 'subscapularSkinfoldMm'],
    sex: 'female', population: 'general', ageMinYears: 65, ageBelowYears: 105,
    coefficients: lin(-62.35, { calfCm: 1.27, kneeHeightCm: 0.87, muacCm: 0.98, subscapularSkinfoldMm: 0.4 }),
    sourceId: 'chumlea1988' },
  // ── Race/age-specific knee height + MUAC — slots only ──
  weightSlot('wt_ross_black_m_19_59', 'Knee height + MUAC, black men 19–59', 'male', 'non_hispanic_black', 18, 60, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_black_m_60_80', 'Knee height + MUAC, black men 60–80', 'male', 'non_hispanic_black', 60, 81, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_black_f_19_59', 'Knee height + MUAC, black women 19–59', 'female', 'non_hispanic_black', 18, 60, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_black_f_60_80', 'Knee height + MUAC, black women 60–80', 'female', 'non_hispanic_black', 60, 81, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_white_m_19_59', 'Knee height + MUAC, white men 19–59', 'male', 'non_hispanic_white', 18, 60, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_white_m_60_80', 'Knee height + MUAC, white men 60–80', 'male', 'non_hispanic_white', 60, 81, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_white_f_19_59', 'Knee height + MUAC, white women 19–59', 'female', 'non_hispanic_white', 18, 60, 'rossRaceSpecificWeight'),
  weightSlot('wt_ross_white_f_60_80', 'Knee height + MUAC, white women 60–80', 'female', 'non_hispanic_white', 60, 81, 'rossRaceSpecificWeight'),
  weightSlot('wt_nigerian_m', 'Nigerian adult men (weight estimation)', 'male', 'nigerian', 18, null, 'nigerianAnthropometry'),
  weightSlot('wt_nigerian_f', 'Nigerian adult women (weight estimation)', 'female', 'nigerian', 18, null, 'nigerianAnthropometry'),
];

/** Shorthand: same candidates for both sexes, with _m / _f suffixes. */
const both = (...stems: string[]) => ({
  male: stems.map(x => `${x}_m`),
  female: stems.map(x => `${x}_f`),
});

/**
 * Candidate order per population. The first equation whose age range fits AND
 * whose coefficients are configured is used. A candidate from a different
 * population than the one requested is reported as an assumption.
 */
export const KNEE_HEIGHT_DEFAULTS_V1: EquationDefaults = {
  nigerian: both('kh_nigerian'),
  black_african: { male: [], female: [] },
  non_hispanic_black: both('kh_chumlea1994_black', 'kh_chumlea1998_nhb'),
  non_hispanic_white: both('kh_chumlea1994_white', 'kh_chumlea1998_nhw'),
  mexican_american: both('kh_chumlea1998_ma'),
  general: both('kh_chumlea1985'),
};

const bapenUlna = {
  male: ['ulna_bapen_m_lt65', 'ulna_bapen_m_ge65'],
  female: ['ulna_bapen_f_lt65', 'ulna_bapen_f_ge65'],
};

export const ULNA_DEFAULTS_V1: EquationDefaults = {
  nigerian: both('ulna_nigerian'),
  black_african: bapenUlna,
  non_hispanic_black: bapenUlna,
  non_hispanic_white: bapenUlna,
  mexican_american: bapenUlna,
  general: bapenUlna,
};

export const WEIGHT_DEFAULTS_V1: EquationDefaults = {
  nigerian: both('wt_nigerian'),
  black_african: { male: [], female: [] },
  non_hispanic_black: {
    male: ['wt_ross_black_m_19_59', 'wt_ross_black_m_60_80', 'wt_chumlea1988_m'],
    female: ['wt_ross_black_f_19_59', 'wt_ross_black_f_60_80', 'wt_chumlea1988_f'],
  },
  non_hispanic_white: {
    male: ['wt_ross_white_m_19_59', 'wt_ross_white_m_60_80', 'wt_chumlea1988_m'],
    female: ['wt_ross_white_f_19_59', 'wt_ross_white_f_60_80', 'wt_chumlea1988_f'],
  },
  mexican_american: both('wt_chumlea1988'),
  general: both('wt_chumlea1988'),
};
