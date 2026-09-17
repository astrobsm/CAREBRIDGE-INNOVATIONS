/**
 * ABI, TBI and their interpretation, computed from the pressures as measured.
 *
 * THE DENOMINATOR MATTERS
 * The ABI denominator is the HIGHER of the two brachial pressures, not the
 * ipsilateral arm and not their average. In a patient with subclavian or
 * innominate disease the affected arm reads low, and dividing by it inflates
 * the index — producing a reassuring number for exactly the patient whose
 * arterial tree is most diseased. Both arms are therefore required, and the
 * function says so when only one is available.
 *
 * A NORMAL ABI DOES NOT EXCLUDE DISEASE
 * Medial calcification — common in diabetes and in renal failure — makes
 * vessels incompressible, so the cuff reads high over an artery that may be
 * severely diseased. Above 1.40 the index is not interpretable at all, and this
 * module treats it as *missing* rather than as normal, and asks for a toe
 * pressure. Toe vessels are largely spared that calcification, which is why the
 * toe-brachial index remains usable when the ankle one is not.
 *
 * Pure functions: no DOM, no database.
 */

import type { PressureSet } from '../types';

export const PERFUSION_METHOD_VERSION = 'perfusion-1.0.0';

export type AbiCategory =
  | 'abnormal'            // <= 0.90
  | 'borderline'          // 0.91 - 0.99
  | 'normal'              // 1.00 - 1.40
  | 'noncompressible';    // > 1.40

/**
 * Interpretation bands.
 *
 * As published in the 2024 AHA/ACC peripheral artery disease guideline. Held as
 * data so an institution can point at the version it follows rather than at a
 * number buried in a function.
 */
export const ABI_BANDS = {
  abnormalAtOrBelow: 0.90,
  borderlineFrom: 0.91,
  borderlineTo: 0.99,
  normalFrom: 1.00,
  normalTo: 1.40,
  source: '2024 AHA/ACC PAD guideline',
} as const;

/** TBI at or below this is abnormal, per the same guideline. */
export const TBI_ABNORMAL_AT_OR_BELOW = 0.70;

const round2 = (v: number) => Math.round(v * 100) / 100;

export interface IndexResult {
  value: number | null;
  category: AbiCategory | null;
  /** The pressure used as the denominator, and which arm it came from. */
  denominatorMmHg: number | null;
  denominatorArm?: 'right' | 'left';
  interpretation: string;
  /** Why a value is absent, or why it should not be read at face value. */
  limitations: string[];
  /** Concrete next measurements this result calls for. */
  prompts: string[];
}

const EMPTY: IndexResult = {
  value: null, category: null, denominatorMmHg: null,
  interpretation: 'Not calculable.', limitations: [], prompts: [],
};

/** The higher brachial pressure, which is the correct ABI denominator. */
export function brachialReference(p: PressureSet): {
  value: number | null; arm?: 'right' | 'left'; limitation?: string;
} {
  const r = p.rightBrachialMmHg;
  const l = p.leftBrachialMmHg;
  const has = (v?: number) => typeof v === 'number' && Number.isFinite(v) && v > 0;

  if (has(r) && has(l)) {
    return (r as number) >= (l as number)
      ? { value: r as number, arm: 'right' }
      : { value: l as number, arm: 'left' };
  }
  if (has(r)) {
    return {
      value: r as number, arm: 'right',
      limitation: 'Only the right brachial pressure was recorded. The index should use the higher '
        + 'of the two arms; with one arm missing, subclavian disease on that side cannot be excluded '
        + 'and the index may be overstated.',
    };
  }
  if (has(l)) {
    return {
      value: l as number, arm: 'left',
      limitation: 'Only the left brachial pressure was recorded. The index should use the higher '
        + 'of the two arms; with one arm missing, subclavian disease on that side cannot be excluded '
        + 'and the index may be overstated.',
    };
  }
  return { value: null };
}

export function categoriseAbi(abi: number): AbiCategory {
  if (abi > ABI_BANDS.normalTo) return 'noncompressible';
  if (abi >= ABI_BANDS.normalFrom) return 'normal';
  if (abi >= ABI_BANDS.borderlineFrom) return 'borderline';
  return 'abnormal';
}

export interface AbiContext {
  /** Diabetes or renal failure makes medial calcification likelier. */
  calcificationRisk?: boolean;
  /** Tissue loss, rest pain or gangrene — the CLTI question is live. */
  cltiSuspected?: boolean;
}

/**
 * Ankle-brachial index, with what the number can and cannot support.
 *
 * A noncompressible result returns the computed figure but categorises it as
 * uninterpretable, because hiding the number would make the reading look like a
 * measurement failure when in fact it is a finding — one that points at
 * calcification and at the need for a toe pressure.
 */
export function calculateAbi(p: PressureSet, context: AbiContext = {}): IndexResult {
  const limitations: string[] = [];
  const prompts: string[] = [];

  const ankle = p.ankleMmHg;
  if (typeof ankle !== 'number' || !Number.isFinite(ankle) || ankle <= 0) {
    return { ...EMPTY, limitations: ['No ankle pressure recorded.'] };
  }

  const ref = brachialReference(p);
  if (ref.value === null) {
    return { ...EMPTY, limitations: ['No brachial pressure recorded, so no index can be computed.'] };
  }
  if (ref.limitation) limitations.push(ref.limitation);

  const value = round2(ankle / ref.value);
  const category = categoriseAbi(value);

  let interpretation: string;
  switch (category) {
    case 'noncompressible':
      interpretation = `${value} — noncompressible (above ${ABI_BANDS.normalTo}); not interpretable as perfusion.`;
      limitations.push(
        'An ABI above 1.40 means the ankle vessels did not compress, usually from medial '
        + 'calcification. It does NOT indicate good perfusion, and severe distal disease can sit '
        + 'behind it. This index is treated as missing when grading ischaemia.',
      );
      prompts.push('Measure toe pressure and toe-brachial index — toe vessels are usually spared calcification.');
      prompts.push('Consider TcPO2 or skin perfusion pressure at the wound.');
      break;
    case 'normal':
      interpretation = `${value} — within the normal range (${ABI_BANDS.normalFrom}–${ABI_BANDS.normalTo}).`;
      break;
    case 'borderline':
      interpretation = `${value} — borderline (${ABI_BANDS.borderlineFrom}–${ABI_BANDS.borderlineTo}).`;
      break;
    default:
      interpretation = `${value} — abnormal (at or below ${ABI_BANDS.abnormalAtOrBelow}).`;
  }

  // A resting ABI in range does not settle the question when the foot is
  // telling a different story.
  if (context.cltiSuspected && (category === 'normal' || category === 'borderline')) {
    limitations.push(
      'A resting ankle index in this range does not exclude clinically significant distal disease '
      + 'when there is tissue loss or rest pain. Perfusion at the wound is the relevant measurement.',
    );
    prompts.push('Measure toe pressure/TBI, and TcPO2 or skin perfusion pressure where available.');
  }

  if (context.calcificationRisk && category !== 'noncompressible') {
    limitations.push(
      'Diabetes or renal impairment is recorded. Medial calcification can raise the ankle index '
      + 'toward or into the normal range despite significant disease.',
    );
    if (!p.toeMmHg) {
      prompts.push('A toe pressure is worth having even when the ankle index looks acceptable.');
    }
  }

  return {
    value, category,
    denominatorMmHg: ref.value,
    denominatorArm: ref.arm,
    interpretation, limitations, prompts,
  };
}

/**
 * Toe-brachial index.
 *
 * Deliberately uses the same brachial reference as the ABI so the two indices
 * are comparable, and so a discrepancy between them reflects the limb rather
 * than a change of denominator.
 */
export function calculateTbi(p: PressureSet): IndexResult {
  const limitations: string[] = [];
  const toe = p.toeMmHg;

  if (typeof toe !== 'number' || !Number.isFinite(toe) || toe < 0) {
    return { ...EMPTY, limitations: ['No toe pressure recorded.'] };
  }

  const ref = brachialReference(p);
  if (ref.value === null) {
    return { ...EMPTY, limitations: ['No brachial pressure recorded, so no index can be computed.'] };
  }
  if (ref.limitation) limitations.push(ref.limitation);

  const value = round2(toe / ref.value);
  const abnormal = value <= TBI_ABNORMAL_AT_OR_BELOW;

  return {
    value,
    category: abnormal ? 'abnormal' : 'normal',
    denominatorMmHg: ref.value,
    denominatorArm: ref.arm,
    interpretation: abnormal
      ? `${value} — abnormal (at or below ${TBI_ABNORMAL_AT_OR_BELOW}).`
      : `${value} — above the abnormal threshold of ${TBI_ABNORMAL_AT_OR_BELOW}.`,
    limitations,
    prompts: [],
  };
}

/**
 * Sanity checks before a pressure set is stored.
 *
 * Catches the transcription errors that are invisible once they become an
 * index: an ankle pressure entered in the toe field, a systolic typed as a
 * diastolic, a decimal point lost. Each returns a message rather than blocking,
 * because a genuine outlier should still be recordable by someone who means it.
 */
export function checkPressures(p: PressureSet): string[] {
  const problems: string[] = [];
  const range = (v: number | undefined, label: string, lo: number, hi: number) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    if (v < lo || v > hi) {
      problems.push(`${label} of ${v} mmHg is outside the plausible range ${lo}–${hi}.`);
    }
  };

  range(p.rightBrachialMmHg, 'Right brachial pressure', 50, 260);
  range(p.leftBrachialMmHg, 'Left brachial pressure', 50, 260);
  range(p.ankleMmHg, 'Ankle pressure', 0, 300);
  range(p.toeMmHg, 'Toe pressure', 0, 220);

  const r = p.rightBrachialMmHg;
  const l = p.leftBrachialMmHg;
  if (typeof r === 'number' && typeof l === 'number' && Math.abs(r - l) >= 20) {
    problems.push(
      `The two brachial pressures differ by ${Math.abs(r - l)} mmHg. A difference of 20 mmHg or more `
      + 'suggests subclavian disease and is itself a finding worth recording.',
    );
  }

  if (typeof p.toeMmHg === 'number' && typeof p.ankleMmHg === 'number'
      && p.toeMmHg > p.ankleMmHg + 10) {
    problems.push(
      `Toe pressure (${p.toeMmHg}) exceeds ankle pressure (${p.ankleMmHg}). Check the two have not `
      + 'been entered the wrong way round.',
    );
  }

  return problems;
}

/** Plain summary of where this limb's perfusion measurements stand. */
export function summarisePerfusion(
  p: PressureSet | undefined,
  context: AbiContext = {},
): { abi: IndexResult; tbi: IndexResult; prompts: string[]; problems: string[] } {
  if (!p) {
    return {
      abi: { ...EMPTY, limitations: ['No pressures recorded.'] },
      tbi: { ...EMPTY, limitations: ['No pressures recorded.'] },
      prompts: ['Record brachial pressures in both arms and an ankle pressure.'],
      problems: [],
    };
  }

  const abi = calculateAbi(p, context);
  const tbi = calculateTbi(p);

  // Deduplicated: the same prompt is raised by several routes on purpose, but
  // should be read once.
  const prompts = Array.from(new Set([...abi.prompts, ...tbi.prompts]));

  return { abi, tbi, prompts, problems: checkPressures(p) };
}
