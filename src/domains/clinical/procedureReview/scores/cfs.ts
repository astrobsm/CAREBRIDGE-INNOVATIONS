/**
 * Clinical Frailty Scale, version 2.0.
 *
 * Rockwood K et al. A global clinical measure of fitness and frailty in
 * elderly people. CMAJ 2005;173:489-95. Rockwood K, Theou O. Using the
 * Clinical Frailty Scale in allocating scarce health care resources. Can
 * Geriatr J 2020;23:210-5 (version 2.0 wording). (c) 2005-2020 Rockwood,
 * Version 2.0 (EN), Dalhousie University; permission granted for clinical use.
 *
 * Validated in people aged 65 and over; not validated for younger people or
 * those with stable single-system disability. CPOC 2021 (Perioperative care
 * of people living with frailty) recommends comprehensive geriatric
 * assessment and shared decision-making from CFS 5 upwards.
 */
import type { ScreeningInstrument } from './instrument';

export const CFS: ScreeningInstrument = {
  id: 'cfs',
  name: 'Clinical Frailty Scale (v2.0)',
  abbreviation: 'CFS',
  version: '2.0 (2020)',
  items: [{
    id: 'level',
    label: 'Clinical Frailty Scale level (usual state, two weeks before any acute illness)',
    source: 'clinician',
    help: 'Judge the usual state, not the state during an acute illness. Validated for age 65 and over.',
    options: [
      { value: 1, label: '1 Very fit — robust, active, energetic, motivated; exercises regularly' },
      { value: 2, label: '2 Fit — no active disease symptoms but less fit than category 1' },
      { value: 3, label: '3 Managing well — medical problems well controlled; not regularly active beyond routine walking' },
      { value: 4, label: '4 Living with very mild frailty — not dependent, but symptoms limit activities; "slowed up"' },
      { value: 5, label: '5 Living with mild frailty — needs help with higher-order activities (finances, transport, heavy housework)' },
      { value: 6, label: '6 Living with moderate frailty — needs help with all outside activities and keeping house; help with bathing' },
      { value: 7, label: '7 Living with severe frailty — completely dependent for personal care, but stable' },
      { value: 8, label: '8 Living with very severe frailty — completely dependent, approaching end of life' },
      { value: 9, label: '9 Terminally ill — life expectancy under 6 months, not otherwise living with severe frailty' },
    ],
  }],
  totalRange: [1, 9],
  lowerIsBetter: true,
  citation: 'Rockwood K et al. CMAJ 2005;173:489-95; CFS v2.0, Dalhousie University 2020; CPOC Frailty guideline 2021',
  licence: 'Clinical Frailty Scale (c) Rockwood, Dalhousie University: permission granted for clinical use.',
  bands: [
    { min: 1, max: 3, band: { label: 'Not frail', level: 'none', interpretation: 'Not living with frailty.' } },
    { min: 4, max: 4, band: { label: 'Very mild frailty', level: 'low', interpretation: 'Very mild frailty: optimise and watch for delirium.' } },
    { min: 5, max: 6, band: { label: 'Mild to moderate frailty', level: 'moderate', interpretation: 'Frailty: comprehensive geriatric assessment, delirium prevention and shared decision-making (CPOC 2021).' } },
    { min: 7, max: 9, band: { label: 'Severe frailty or terminally ill', level: 'very_high', interpretation: 'Severe frailty: agree goals of care and ceilings of treatment before any elective procedure.' } },
  ],
};
