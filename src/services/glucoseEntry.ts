/**
 * Accepting a blood glucose the way the clinician measured it.
 *
 * The app stores glucose canonically in mmol/L. That is a storage decision, not
 * an entry decision: a meter that reads in mg/dL should be typed in mg/dL, and
 * a glucose dictated as "126" should not be quietly halved by a regex that only
 * captures two digits.
 *
 * Two failure modes this module exists to prevent:
 *
 *   1. Rejecting a valid reading. A single mmol/L-shaped range check (0–50)
 *      refuses every normal mg/dL value, so the unit selector beside the field
 *      does nothing. Limits have to follow the selected unit.
 *
 *   2. Accepting an invalid one. Typing a mg/dL number with mmol/L selected is
 *      the classic glucose error and it is dangerous in both directions: 7
 *      read as mg/dL is a coma, 126 read as mmol/L is not survivable. We can
 *      tell, because the plausible ranges barely overlap — so we ask, and never
 *      convert on the patient's behalf.
 *
 * Nothing here interprets the reading clinically; interpretGlucose in
 * bloodGlucoseService does that, and it normalises units itself.
 */

import { convertGlucose, type GlucoseUnit } from './bloodGlucoseService';

export type { GlucoseUnit };

export const GLUCOSE_UNITS: GlucoseUnit[] = ['mmol/L', 'mg/dL'];

/**
 * The widest values a human blood glucose can take and still be a measurement
 * rather than a typing slip. Defined once in mmol/L and converted, so the two
 * unit variants cannot drift apart.
 *
 * Low end: survivable hypoglycaemia goes below 1 mmol/L.
 * High end: hyperosmolar states are reported well above 40 mmol/L; meters stop
 * at 33.3 but laboratory values do not.
 */
const HARD_MIN_MMOL = 0.5;
const HARD_MAX_MMOL = 60;

/**
 * The range a reading normally falls in. Used only to decide whether to ask a
 * question — never to reject. Values outside it are accepted.
 */
const TYPICAL_MIN_MMOL = 1.5;
const TYPICAL_MAX_MMOL = 35;

const inUnit = (mmol: number, unit: GlucoseUnit): number =>
  unit === 'mmol/L' ? mmol : convertGlucose(mmol, 'mmol/L', 'mg/dL');

/** Entry limits for a unit — what the number input and validator should use. */
export function glucoseLimits(unit: GlucoseUnit): { min: number; max: number; step: number } {
  return unit === 'mmol/L'
    ? { min: HARD_MIN_MMOL, max: HARD_MAX_MMOL, step: 0.1 }
    : { min: Math.round(inUnit(HARD_MIN_MMOL, 'mg/dL')), max: Math.round(inUnit(HARD_MAX_MMOL, 'mg/dL')), step: 1 };
}

/** Normal fasting range, for the hint under the field. */
export function fastingHint(unit: GlucoseUnit): string {
  return unit === 'mmol/L' ? '4.0 – 5.4 mmol/L' : '72 – 99 mg/dL';
}

export function placeholderFor(unit: GlucoseUnit): string {
  return unit === 'mmol/L' ? 'e.g. 5.5' : 'e.g. 99';
}

const isTypicalFor = (value: number, unit: GlucoseUnit): boolean =>
  value >= inUnit(TYPICAL_MIN_MMOL, unit) && value <= inUnit(TYPICAL_MAX_MMOL, unit);

const other = (unit: GlucoseUnit): GlucoseUnit => (unit === 'mmol/L' ? 'mg/dL' : 'mmol/L');

export interface GlucoseEntry {
  /** 'empty' is not an error — blood glucose is an optional vital. */
  status: 'empty' | 'error' | 'ok';
  /** The number as typed, in the unit selected. */
  value: number | null;
  /** Canonical value for storage. Present only when status is 'ok'. */
  mmolL: number | null;
  /** The same reading in mg/dL, for display. */
  mgDl: number | null;
  /** Set when the entry must be corrected before it can be saved. */
  error: string | null;
  /** Accepted, but worth a second look before saving. */
  warning: string | null;
  /**
   * Set when the number reads like the other unit. The UI should offer to
   * switch to it — and must not switch by itself, because both readings of an
   * ambiguous number are clinically meaningful.
   */
  suggestUnit: GlucoseUnit | null;
}

const EMPTY: GlucoseEntry = {
  status: 'empty', value: null, mmolL: null, mgDl: null,
  error: null, warning: null, suggestUnit: null,
};

/**
 * Validate and convert one blood glucose entry.
 *
 * Accepts the raw field value in whatever shape the form hands over: a string
 * from an uncontrolled input, a number from valueAsNumber (which produces NaN
 * for a cleared field), null, or undefined. A blank field is 'empty', never an
 * error.
 */
export function parseGlucoseEntry(
  raw: string | number | null | undefined,
  unit: GlucoseUnit,
): GlucoseEntry {
  if (raw === null || raw === undefined) return EMPTY;
  if (typeof raw === 'string' && raw.trim() === '') return EMPTY;

  const value = typeof raw === 'number' ? raw : Number(raw.trim());
  if (!Number.isFinite(value)) {
    // NaN from a cleared numeric input is a blank field, not bad input.
    return typeof raw === 'number'
      ? EMPTY
      : { ...EMPTY, status: 'error', error: `“${String(raw).trim()}” is not a number.` };
  }

  const { min, max } = glucoseLimits(unit);

  if (value < min || value > max) {
    // Before calling it out of range, check whether it is simply the other
    // unit — that is the more likely explanation and the more useful message.
    if (isTypicalFor(value, other(unit))) {
      return {
        ...EMPTY,
        status: 'error',
        value,
        error: `${value} is outside the possible range for ${unit}, but is a normal ${other(unit)} reading. Switch the unit to ${other(unit)} if that is what the meter showed.`,
        suggestUnit: other(unit),
      };
    }
    return {
      ...EMPTY,
      status: 'error',
      value,
      error: `Blood glucose must be between ${min} and ${max} ${unit}.`,
    };
  }

  const mmolL = unit === 'mmol/L' ? value : convertGlucose(value, 'mg/dL', 'mmol/L');
  const mgDl = unit === 'mg/dL' ? value : convertGlucose(value, 'mmol/L', 'mg/dL');

  const entry: GlucoseEntry = {
    status: 'ok', value, mmolL, mgDl, error: null, warning: null, suggestUnit: null,
  };

  if (isTypicalFor(value, unit)) return entry;

  // In range but unusual. If it reads as a normal value in the other unit, the
  // unit is the likely mistake; otherwise it is just an extreme reading.
  if (isTypicalFor(value, other(unit))) {
    return {
      ...entry,
      warning: `${value} is an unusual ${unit} reading but a typical ${other(unit)} one. Confirm the unit before saving.`,
      suggestUnit: other(unit),
    };
  }

  return {
    ...entry,
    warning: value < inUnit(TYPICAL_MIN_MMOL, unit)
      ? `${value} ${unit} is critically low — confirm the reading.`
      : `${value} ${unit} is critically high — confirm the reading.`,
  };
}

const UNIT_PATTERNS: { re: RegExp; unit: GlucoseUnit }[] = [
  { re: /mg\s*[/\\.]?\s*d\s*l/i, unit: 'mg/dL' },
  { re: /mmol\s*[/\\.]?\s*l/i, unit: 'mmol/L' },
];

export interface ParsedGlucoseText {
  value: number;
  unit: GlucoseUnit;
  /** True when no unit was written and the unit was guessed from magnitude. */
  inferred: boolean;
}

/**
 * Pull a blood glucose out of dictated or pasted text.
 *
 * The digit count is deliberately not capped: a pattern that matches at most
 * two digits turns "glucose 126 mg/dL" into 12, which is both a valid-looking
 * mmol/L number and completely wrong. Better to read the whole number and, if
 * no unit was written, say that the unit was inferred so a human confirms it.
 */
export function parseGlucoseFromText(text: string): ParsedGlucoseText | null {
  const match = text.match(
    /(?:blood\s*glucose|glucose|glu|rbs|rbg|fbs|fbg|cbg|bsl|bg)\b\D{0,12}?(\d+(?:\.\d+)?)\s*([a-zA-Z/\\.]{0,8})/i,
  );
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const trailing = match[2] ?? '';
  const written = UNIT_PATTERNS.find(p => p.re.test(trailing))?.unit;
  if (written) {
    return parseGlucoseEntry(value, written).status === 'ok'
      ? { value, unit: written, inferred: false }
      : null;
  }

  // No unit written. Magnitude is the only signal, and it is a good one: the
  // plausible ranges hardly overlap. Flagged as inferred so the UI can ask.
  const guess: GlucoseUnit = isTypicalFor(value, 'mmol/L') ? 'mmol/L' : 'mg/dL';
  return parseGlucoseEntry(value, guess).status === 'ok'
    ? { value, unit: guess, inferred: true }
    : null;
}

/** Render a stored (mmol/L) reading in whichever unit the user is working in. */
export function displayGlucose(mmolL: number, unit: GlucoseUnit): string {
  return unit === 'mmol/L'
    ? `${mmolL.toFixed(1)} mmol/L`
    : `${Math.round(convertGlucose(mmolL, 'mmol/L', 'mg/dL'))} mg/dL`;
}

const PREF_KEY = 'carebridge.glucoseUnit';

/** The unit the user last worked in, so they are not re-selecting it all day. */
export function loadGlucoseUnitPreference(): GlucoseUnit {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    return saved === 'mg/dL' || saved === 'mmol/L' ? saved : 'mmol/L';
  } catch {
    return 'mmol/L';
  }
}

export function saveGlucoseUnitPreference(unit: GlucoseUnit): void {
  try {
    localStorage.setItem(PREF_KEY, unit);
  } catch {
    // A blocked or full localStorage must not stop a vitals entry.
  }
}
