/**
 * The acute limb ischaemia screen.
 *
 * WHY THIS RUNS FIRST AND SEPARATELY
 * Acute limb ischaemia is measured in hours. Everything else in this module —
 * indices, WIfI, trends — assumes there is time to measure things carefully,
 * and that assumption is exactly wrong here. So the screen sits before the
 * assessment, completes in seconds, and never requires the rest of the form.
 *
 * WHAT IT WILL NOT DO
 * It will not stand a limb down. A palpable pulse, an audible Doppler signal or
 * a reassuring index does not exclude acute ischaemia, and a screen that
 * returned "no acute ischaemia" would be read as clearance by someone in a
 * hurry. The only outputs are "concerning features present" and "none of the
 * screened features recorded" — the second being an absence of findings, not a
 * negative result.
 *
 * The Rutherford category is offered because it maps directly onto urgency, but
 * it is presented as a suggestion for clinician confirmation: the sensory and
 * motor findings it rests on are examination judgements, not measurements.
 */

import type { AcuteIschaemiaScreen } from '../types';

export const ACUTE_SCREEN_VERSION = 'acute-ischaemia-1.0.0';

/** The six Ps, in the order they are usually elicited. */
export const SIX_PS: { key: keyof AcuteIschaemiaScreen; label: string; hint: string }[] = [
  { key: 'suddenOnsetPain', label: 'Pain', hint: 'Sudden onset, often severe and out of proportion' },
  { key: 'pallor', label: 'Pallor', hint: 'Sudden pallor or mottling' },
  { key: 'pulselessness', label: 'Pulselessness', hint: 'New absence of a previously present pulse' },
  { key: 'paraesthesia', label: 'Paraesthesia', hint: 'New numbness or altered sensation' },
  { key: 'paralysis', label: 'Paralysis', hint: 'New weakness — a late and ominous sign' },
  { key: 'poikilothermia', label: 'Poikilothermia', hint: 'The limb has taken the temperature of the room' },
];

/**
 * Rutherford categories for acute limb ischaemia.
 *
 * Held as data so the criteria are visible beside the suggestion rather than
 * buried in branching.
 */
export const RUTHERFORD_CATEGORIES = [
  {
    category: 'I',
    label: 'Viable',
    meaning: 'Not immediately threatened.',
    sensory: 'No sensory loss',
    motor: 'No motor deficit',
    arterialDoppler: 'Audible',
    venousDoppler: 'Audible',
    urgency: 'Urgent assessment, but not an immediate threat to the limb.',
  },
  {
    category: 'IIa',
    label: 'Marginally threatened',
    meaning: 'Salvageable if promptly treated.',
    sensory: 'Minimal — toes only',
    motor: 'No motor deficit',
    arterialDoppler: 'Often inaudible',
    venousDoppler: 'Audible',
    urgency: 'Salvageable if treated promptly.',
  },
  {
    category: 'IIb',
    label: 'Immediately threatened',
    meaning: 'Salvageable only with immediate revascularisation.',
    sensory: 'More than toes, with rest pain',
    motor: 'Mild to moderate deficit',
    arterialDoppler: 'Usually inaudible',
    venousDoppler: 'Audible',
    urgency: 'Salvageable only with immediate revascularisation.',
  },
  {
    category: 'III',
    label: 'Irreversible',
    meaning: 'Major tissue loss or permanent nerve damage inevitable.',
    sensory: 'Profound, anaesthetic',
    motor: 'Profound paralysis, rigor',
    arterialDoppler: 'Inaudible',
    venousDoppler: 'Inaudible',
    urgency: 'Major tissue loss or permanent nerve damage is inevitable.',
  },
] as const;

export type RutherfordCategory = typeof RUTHERFORD_CATEGORIES[number]['category'];

export interface AcuteScreenResult {
  /** True when any screened feature was recorded as present. */
  concerning: boolean;
  /** Which of the six Ps were positive. */
  positiveFeatures: string[];
  /** Everything else that was recorded and raises concern. */
  supportingFindings: string[];
  /** Suggested Rutherford category, for clinician confirmation. */
  suggestedCategory: RutherfordCategory | null;
  categoryBasis: string[];
  headline: string;
  action: string;
  /** Always present. The screen never clears a limb. */
  caveats: string[];
}

const CAVEATS = [
  'This is a screen, not a diagnosis. A palpable pulse, an audible Doppler signal or a normal '
  + 'index does not exclude acute limb ischaemia.',
  'The absence of recorded features means those features were not documented — not that the limb '
  + 'has been cleared.',
];

/**
 * Read the screen.
 *
 * The Rutherford suggestion is offered only when the findings it depends on
 * were actually recorded. Guessing a category from a partial examination would
 * attach an urgency to a limb on the basis of fields nobody filled in.
 */
export function readAcuteScreen(screen: AcuteIschaemiaScreen | undefined): AcuteScreenResult {
  const empty: AcuteScreenResult = {
    concerning: false,
    positiveFeatures: [],
    supportingFindings: [],
    suggestedCategory: null,
    categoryBasis: [],
    headline: 'Acute ischaemia screen not completed.',
    action: 'Complete the screen before proceeding — it takes seconds and it is time-critical.',
    caveats: CAVEATS,
  };
  if (!screen) return empty;

  const positiveFeatures = SIX_PS
    .filter(p => screen[p.key] === true)
    .map(p => p.label);

  const supporting: string[] = [];
  if (screen.newAbsentPulse) supporting.push('New absent pulse.');
  if (screen.newLossOfDopplerSignal) supporting.push('New loss of Doppler signal.');
  if (screen.rapidlyProgressive) supporting.push('Rapidly progressive symptoms.');
  if (screen.knownEmbolicSource) supporting.push('Known embolic source.');
  if (screen.recentVascularProcedure) supporting.push('Recent vascular procedure.');
  if (screen.recentTrauma) supporting.push('Recent trauma.');
  if (screen.sensoryLoss && screen.sensoryLoss !== 'none') {
    supporting.push(`Sensory loss: ${screen.sensoryLoss.replace(/_/g, ' ')}.`);
  }
  if (screen.motorDeficit && screen.motorDeficit !== 'none') {
    supporting.push(`Motor deficit: ${screen.motorDeficit.replace(/_/g, ' ')}.`);
  }
  if (screen.arterialDopplerAudible === false) supporting.push('Arterial Doppler signal inaudible.');
  if (screen.venousDopplerAudible === false) supporting.push('Venous Doppler signal inaudible.');

  const concerning = positiveFeatures.length > 0 || supporting.length > 0;

  // ── Rutherford suggestion ────────────────────────────────────────────────
  let suggestedCategory: RutherfordCategory | null = null;
  const categoryBasis: string[] = [];

  const haveSensory = screen.sensoryLoss != null;
  const haveMotor = screen.motorDeficit != null;

  if (haveSensory && haveMotor) {
    const sensory = screen.sensoryLoss as NonNullable<AcuteIschaemiaScreen['sensoryLoss']>;
    const motor = screen.motorDeficit as NonNullable<AcuteIschaemiaScreen['motorDeficit']>;

    if (motor === 'profound_paralysis' && sensory === 'profound_anaesthesia') {
      suggestedCategory = 'III';
      categoryBasis.push('Profound anaesthesia with profound paralysis.');
      if (screen.venousDopplerAudible === false) {
        categoryBasis.push('Venous Doppler also inaudible, which supports category III.');
      } else if (screen.venousDopplerAudible === true) {
        categoryBasis.push(
          'Venous Doppler is audible, which is not typical of category III — confirm the category '
          + 'clinically before acting on it.',
        );
      }
    } else if (motor !== 'none' || sensory === 'more_than_toes') {
      suggestedCategory = 'IIb';
      categoryBasis.push(
        motor !== 'none'
          ? `Motor deficit recorded (${motor.replace(/_/g, ' ')}).`
          : 'Sensory loss extending beyond the toes.',
      );
    } else if (sensory === 'toes_only') {
      suggestedCategory = 'IIa';
      categoryBasis.push('Sensory loss confined to the toes with no motor deficit.');
    } else {
      suggestedCategory = 'I';
      categoryBasis.push('No sensory loss and no motor deficit recorded.');
      if (screen.arterialDopplerAudible === false) {
        categoryBasis.push(
          'Arterial Doppler is inaudible, which sits oddly with category I — reassess before '
          + 'treating the limb as viable.',
        );
      }
    }
  } else {
    categoryBasis.push(
      'No Rutherford category is suggested: it depends on the sensory and motor findings, which '
      + 'have not both been recorded.',
    );
  }

  if (!concerning) {
    return {
      ...empty,
      headline: 'None of the screened features were recorded.',
      action:
        'Proceed with the routine assessment. Re-screen if the limb changes — this records an '
        + 'absence of documented features, not a cleared limb.',
      categoryBasis,
      suggestedCategory,
    };
  }

  const urgent = suggestedCategory === 'IIb' || suggestedCategory === 'III'
    || positiveFeatures.includes('Paralysis')
    || screen.newLossOfDopplerSignal === true;

  return {
    concerning: true,
    positiveFeatures,
    supportingFindings: supporting,
    suggestedCategory,
    categoryBasis,
    headline: 'Possible acute limb ischaemia — urgent vascular assessment required.',
    action: urgent
      ? 'Contact vascular surgery now. Do not wait for the rest of this assessment, imaging or '
        + 'laboratory results.'
      : 'Contact vascular surgery urgently. Do not wait for the rest of this assessment to be '
        + 'completed.',
    caveats: CAVEATS,
  };
}
