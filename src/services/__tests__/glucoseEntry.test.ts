import { describe, it, expect } from 'vitest';
import {
  parseGlucoseEntry,
  parseGlucoseFromText,
  glucoseLimits,
  displayGlucose,
} from '../glucoseEntry';

describe('glucose entry limits', () => {
  it('scales the accepted range with the unit', () => {
    expect(glucoseLimits('mmol/L').max).toBe(60);
    // The mg/dL ceiling is the same physiological limit, converted.
    expect(glucoseLimits('mg/dL').max).toBeGreaterThan(1000);
    expect(glucoseLimits('mg/dL').min).toBeLessThan(15);
  });

  it('steps in whole numbers for mg/dL and tenths for mmol/L', () => {
    expect(glucoseLimits('mg/dL').step).toBe(1);
    expect(glucoseLimits('mmol/L').step).toBe(0.1);
  });
});

describe('accepting mg/dL entries — the reported gap', () => {
  it('accepts an ordinary fasting mg/dL value the old range rejected', () => {
    // 126 failed the old .max(50) check outright.
    const entry = parseGlucoseEntry(126, 'mg/dL');
    expect(entry.status).toBe('ok');
    expect(entry.error).toBeNull();
    expect(entry.warning).toBeNull();
    expect(entry.mmolL).toBeCloseTo(6.99, 1);
  });

  it('accepts a diabetic mg/dL value', () => {
    const entry = parseGlucoseEntry(342, 'mg/dL');
    expect(entry.status).toBe('ok');
    expect(entry.mmolL).toBeCloseTo(18.98, 1);
  });

  it('still accepts mmol/L entries unchanged', () => {
    const entry = parseGlucoseEntry(5.5, 'mmol/L');
    expect(entry.status).toBe('ok');
    expect(entry.mmolL).toBe(5.5);
    expect(entry.mgDl).toBeCloseTo(99.1, 0);
  });

  it('round-trips a value through both units without drift beyond display precision', () => {
    const asMgDl = parseGlucoseEntry(180, 'mg/dL');
    const back = parseGlucoseEntry(asMgDl.mmolL!, 'mmol/L');
    expect(back.mgDl).toBeCloseTo(180, 0);
  });
});

describe('a blank field is not an error', () => {
  it.each([undefined, null, '', '   '])('treats %p as empty', raw => {
    const entry = parseGlucoseEntry(raw as string | null | undefined, 'mmol/L');
    expect(entry.status).toBe('empty');
    expect(entry.error).toBeNull();
    expect(entry.mmolL).toBeNull();
  });

  it('treats NaN from a cleared numeric input as empty, not as bad input', () => {
    // react-hook-form's valueAsNumber yields NaN for a cleared field; zod's
    // plain .optional() rejects it, which silently blocked the whole form.
    const entry = parseGlucoseEntry(NaN, 'mg/dL');
    expect(entry.status).toBe('empty');
    expect(entry.error).toBeNull();
  });

  it('does report text that is genuinely not a number', () => {
    const entry = parseGlucoseEntry('high', 'mmol/L');
    expect(entry.status).toBe('error');
    expect(entry.error).toContain('not a number');
  });
});

describe('catching the unit mix-up rather than converting silently', () => {
  it('rejects a mg/dL number typed with mmol/L selected, and names the fix', () => {
    const entry = parseGlucoseEntry(126, 'mmol/L');
    expect(entry.status).toBe('error');
    expect(entry.suggestUnit).toBe('mg/dL');
    expect(entry.error).toContain('mg/dL');
  });

  it('rejects a mmol/L number typed with mg/dL selected, and names the fix', () => {
    // 7 mg/dL is below the survivable floor, so this is a hard error rather
    // than a prompt — but the useful message is the unit, not the range.
    const entry = parseGlucoseEntry(7, 'mg/dL');
    expect(entry.status).toBe('error');
    expect(entry.suggestUnit).toBe('mmol/L');
    expect(entry.error).toContain('mmol/L');
  });

  it('asks, rather than blocks, when both readings are survivable', () => {
    // 20 mg/dL is a real severe hypoglycaemia and 20 mmol/L is a real
    // hyperglycaemia. Nothing here can tell which was meant, so it is saved as
    // typed and flagged for confirmation.
    const entry = parseGlucoseEntry(20, 'mg/dL');
    expect(entry.status).toBe('ok');
    expect(entry.suggestUnit).toBe('mmol/L');
    expect(entry.warning).toContain('mmol/L');
  });

  it('never converts on the clinician’s behalf — it only suggests', () => {
    const entry = parseGlucoseEntry(20, 'mg/dL');
    // Stored as the number typed, read in the unit chosen — not as 20 mmol/L.
    expect(entry.value).toBe(20);
    expect(entry.mmolL).toBeCloseTo(1.11, 1);

    // And a rejected entry yields no storable value at all.
    expect(parseGlucoseEntry(126, 'mmol/L').mmolL).toBeNull();
  });

  it('leaves ordinary readings alone in both units', () => {
    for (const [value, unit] of [[5.5, 'mmol/L'], [99, 'mg/dL'], [14, 'mmol/L'], [250, 'mg/dL']] as const) {
      const entry = parseGlucoseEntry(value, unit);
      expect(entry.status).toBe('ok');
      expect(entry.warning).toBeNull();
      expect(entry.suggestUnit).toBeNull();
    }
  });
});

describe('extreme but real readings', () => {
  it('accepts a hyperosmolar mmol/L value with a confirmation prompt', () => {
    const entry = parseGlucoseEntry(42, 'mmol/L');
    expect(entry.status).toBe('ok');
    expect(entry.warning).toBeTruthy();
  });

  it('accepts severe hypoglycaemia in mg/dL', () => {
    const entry = parseGlucoseEntry(38, 'mg/dL');
    expect(entry.status).toBe('ok');
    expect(entry.mmolL).toBeCloseTo(2.11, 1);
  });

  it('rejects a value no blood glucose reaches', () => {
    expect(parseGlucoseEntry(5000, 'mg/dL').status).toBe('error');
    expect(parseGlucoseEntry(0, 'mmol/L').status).toBe('error');
  });
});

describe('reading a glucose out of dictated text', () => {
  it('reads a three-digit mg/dL value whole', () => {
    // The previous pattern captured at most two digits, turning this into 12.
    const parsed = parseGlucoseFromText('BP 130/80, glucose 126 mg/dL, temp 37');
    expect(parsed).toEqual({ value: 126, unit: 'mg/dL', inferred: false });
  });

  it('reads an explicit mmol/L value', () => {
    expect(parseGlucoseFromText('RBG: 7.2 mmol/L')).toEqual({
      value: 7.2, unit: 'mmol/L', inferred: false,
    });
  });

  it('infers the unit from magnitude when none is written, and says so', () => {
    expect(parseGlucoseFromText('FBG 5.5')).toEqual({
      value: 5.5, unit: 'mmol/L', inferred: true,
    });
    expect(parseGlucoseFromText('CBG 240')).toEqual({
      value: 240, unit: 'mg/dL', inferred: true,
    });
  });

  it('returns null rather than a guess when there is no glucose in the text', () => {
    expect(parseGlucoseFromText('BP 130/80, pulse 88')).toBeNull();
  });

  it('does not accept an implausible number out of noisy text', () => {
    expect(parseGlucoseFromText('glucose 99999')).toBeNull();
  });
});

describe('displaying a stored reading', () => {
  it('shows the stored mmol/L value in whichever unit the user works in', () => {
    expect(displayGlucose(7, 'mmol/L')).toBe('7.0 mmol/L');
    expect(displayGlucose(7, 'mg/dL')).toBe('126 mg/dL');
  });
});
