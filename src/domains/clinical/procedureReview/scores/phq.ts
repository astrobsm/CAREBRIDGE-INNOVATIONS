/**
 * PHQ-9 and its first two items, the PHQ-2.
 *
 * Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief
 * depression severity measure. J Gen Intern Med 2001;16:606-13.
 * Kroenke K, Spitzer RL, Williams JBW. The Patient Health Questionnaire-2.
 * Med Care 2003;41:1284-92 (cut-point 3 or more).
 * Item wording as published by Pfizer (PHQ Screeners): no permission required
 * to reproduce, translate, display or distribute.
 *
 * Item 9 is a risk question, not merely a severity item: ANY answer above
 * "Not at all" is an urgent safety flag regardless of the total.
 */
import { FREQUENCY_OPTIONS, type InstrumentBand, type ScreeningInstrument } from './instrument';

const item = (id: string, label: string) => ({ id, label, source: 'patient' as const, options: FREQUENCY_OPTIONS });

export const PHQ9: ScreeningInstrument = {
  id: 'phq9',
  name: 'Patient Health Questionnaire-9',
  abbreviation: 'PHQ-9',
  version: '1999 (Pfizer)',
  stem: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
  items: [
    item('q1', 'Little interest or pleasure in doing things'),
    item('q2', 'Feeling down, depressed, or hopeless'),
    item('q3', 'Trouble falling or staying asleep, or sleeping too much'),
    item('q4', 'Feeling tired or having little energy'),
    item('q5', 'Poor appetite or overeating'),
    item('q6', 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down'),
    item('q7', 'Trouble concentrating on things, such as reading the newspaper or watching television'),
    item('q8', 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual'),
    item('q9', 'Thoughts that you would be better off dead or of hurting yourself in some way'),
  ],
  totalRange: [0, 27],
  lowerIsBetter: true,
  citation: 'Kroenke K, Spitzer RL, Williams JBW. J Gen Intern Med 2001;16:606-13',
  licence: 'PHQ Screeners (Pfizer): no permission required to reproduce, translate, display or distribute.',
  notes: ['A screen and severity measure, not a diagnosis. Confirm with a clinical interview.'],
  bands: [
    { min: 0, max: 4, band: { label: 'Minimal', level: 'none', interpretation: 'Minimal depressive symptoms.' } },
    { min: 5, max: 9, band: { label: 'Mild', level: 'low', interpretation: 'Mild depressive symptoms: support, watchful waiting, repeat at follow-up.' } },
    { min: 10, max: 14, band: { label: 'Moderate', level: 'moderate', interpretation: 'Moderate depression: refer for psychological assessment and treatment.' } },
    { min: 15, max: 19, band: { label: 'Moderately severe', level: 'high', interpretation: 'Moderately severe depression: active treatment — refer to psychiatry / clinical psychology.' } },
    { min: 20, max: 27, band: { label: 'Severe', level: 'very_high', interpretation: 'Severe depression: prompt psychiatric referral.' } },
  ],
};

export const PHQ2_ITEMS = ['q1', 'q2'];
/** PHQ-2 positive at a total of 3 or more (Kroenke 2003). */
export const PHQ2_CUTOFF = 3;

export const PHQ2_BANDS: InstrumentBand[] = [
  { min: 0, max: 2, band: { label: 'Negative screen', level: 'none', interpretation: 'PHQ-2 below 3: depression screen negative.' } },
  { min: 3, max: 6, band: { label: 'Positive screen', level: 'moderate', interpretation: 'PHQ-2 3 or more: complete the PHQ-9.' } },
];

export const PHQ9_SAFETY_ITEM = 'q9';
