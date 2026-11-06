/**
 * GAD-7 and its first two items, the GAD-2.
 *
 * Spitzer RL, Kroenke K, Williams JBW, Lowe B. A brief measure for assessing
 * generalized anxiety disorder: the GAD-7. Arch Intern Med 2006;166:1092-7.
 * Kroenke K et al. Anxiety disorders in primary care. Ann Intern Med
 * 2007;146:317-25 (GAD-2 cut-point 3 or more).
 * PHQ Screeners (Pfizer): no permission required to reproduce.
 */
import { FREQUENCY_OPTIONS, type InstrumentBand, type ScreeningInstrument } from './instrument';

const item = (id: string, label: string) => ({ id, label, source: 'patient' as const, options: FREQUENCY_OPTIONS });

export const GAD7: ScreeningInstrument = {
  id: 'gad7',
  name: 'Generalised Anxiety Disorder-7',
  abbreviation: 'GAD-7',
  version: '2006 (Pfizer)',
  stem: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
  items: [
    item('q1', 'Feeling nervous, anxious, or on edge'),
    item('q2', 'Not being able to stop or control worrying'),
    item('q3', 'Worrying too much about different things'),
    item('q4', 'Trouble relaxing'),
    item('q5', 'Being so restless that it is hard to sit still'),
    item('q6', 'Becoming easily annoyed or irritable'),
    item('q7', 'Feeling afraid, as if something awful might happen'),
  ],
  totalRange: [0, 21],
  lowerIsBetter: true,
  citation: 'Spitzer RL, Kroenke K, Williams JBW, Lowe B. Arch Intern Med 2006;166:1092-7',
  licence: 'PHQ Screeners (Pfizer): no permission required to reproduce, translate, display or distribute.',
  notes: ['A screen and severity measure, not a diagnosis.'],
  bands: [
    { min: 0, max: 4, band: { label: 'Minimal', level: 'none', interpretation: 'Minimal anxiety.' } },
    { min: 5, max: 9, band: { label: 'Mild', level: 'low', interpretation: 'Mild anxiety: reassurance, information, repeat at follow-up.' } },
    { min: 10, max: 14, band: { label: 'Moderate', level: 'moderate', interpretation: 'Moderate anxiety: refer for psychological assessment.' } },
    { min: 15, max: 21, band: { label: 'Severe', level: 'high', interpretation: 'Severe anxiety: refer to clinical psychology / psychiatry.' } },
  ],
};

export const GAD2_ITEMS = ['q1', 'q2'];
export const GAD2_CUTOFF = 3;

export const GAD2_BANDS: InstrumentBand[] = [
  { min: 0, max: 2, band: { label: 'Negative screen', level: 'none', interpretation: 'GAD-2 below 3: anxiety screen negative.' } },
  { min: 3, max: 6, band: { label: 'Positive screen', level: 'moderate', interpretation: 'GAD-2 3 or more: complete the GAD-7.' } },
];
