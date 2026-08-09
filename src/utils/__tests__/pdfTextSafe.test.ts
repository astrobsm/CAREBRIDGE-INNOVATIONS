import { describe, it, expect, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { pdfSafe, sanitizePdfDocument, createSafePDF } from '../pdfTextSafe';

/**
 * Tests for the jsPDF text guard.
 *
 * The bug these exist to prevent: an earlier version patched
 * `jsPDF.prototype.text`, which is undefined, so it installed nothing and every
 * PDF the app produced went out unsanitised — silently, with no error. The
 * "wiring" tests below assert that sanitisation is actually reaching a real
 * document, not merely that the transform function works in isolation.
 */

describe('pdfSafe transform', () => {
  it('preserves accented Latin letters — WinAnsi covers them', () => {
    // Mangling a patient or staff name is worse than dropping a decoration.
    expect(pdfSafe('Björn Adébáyò Müller')).toBe('Björn Adébáyò Müller');
  });

  it('converts clinical operators to text rather than dropping them', () => {
    // Dropping these changes what the document says.
    expect(pdfSafe('Na >= 135')).toBe('Na >= 135');
    expect(pdfSafe('K ≤ 3.5')).toBe('K <= 3.5');
    expect(pdfSafe('≥ 40')).toBe('>= 40');
    expect(pdfSafe('5 ± 2')).toBe('5 +/- 2');
    expect(pdfSafe('37 °C')).toBe('37 degC');
    expect(pdfSafe('98 °F')).toBe('98 degF');
    expect(pdfSafe('turn 45°')).toBe('turn 45 deg');
  });

  it('normalises micrograms — both micro sign and Greek mu', () => {
    expect(pdfSafe('50 µg')).toBe('50 ug');
    expect(pdfSafe('50 μg')).toBe('50 ug');
  });

  it('keeps unit superscripts legible', () => {
    expect(pdfSafe('12 cm²')).toBe('12 cm2');
    expect(pdfSafe('3 m³')).toBe('3 m3');
  });

  it('turns warning and status glyphs into words', () => {
    expect(pdfSafe('⚠️ Warning Signs')).toBe('Warning: Warning Signs');
    expect(pdfSafe('✓ done')).toBe('[x] done');
    expect(pdfSafe('☐ pending')).toBe('[ ] pending');
  });

  it('replaces currency and pharmacy glyphs outside cp1252', () => {
    expect(pdfSafe('₦5,000')).toBe('NGN 5,000');
    expect(pdfSafe('℞ only')).toBe('Rx only');
  });

  it('normalises smart quotes and dashes', () => {
    expect(pdfSafe('“quoted”')).toBe('"quoted"');
    expect(pdfSafe("it’s")).toBe("it's");
    expect(pdfSafe('a — b')).toBe('a - b');
  });

  it('strips leftover emoji without leaving a double space', () => {
    // A dropped glyph must not print as a stray gap mid-sentence.
    expect(pdfSafe('Patient 🙂 stable')).toBe('Patient stable');
  });

  it('handles null, undefined and non-strings without throwing', () => {
    expect(pdfSafe(null)).toBe('');
    expect(pdfSafe(undefined)).toBe('');
    expect(pdfSafe(42)).toBe('42');
  });
});

describe('sanitizePdfDocument wiring', () => {
  it('sanitises the content argument of text() but not coordinates', () => {
    const spy = vi.fn();
    const doc = { text: spy, splitTextToSize: (s: unknown) => s } as Record<string, unknown>;
    sanitizePdfDocument(doc);
    (doc.text as (...a: unknown[]) => unknown)('⚠️ Alert', 10, 20, { align: 'center' });
    expect(spy).toHaveBeenCalledWith('Warning: Alert', 10, 20, { align: 'center' });
  });

  it('sanitises arrays of lines passed to text()', () => {
    const spy = vi.fn();
    const doc = { text: spy } as Record<string, unknown>;
    sanitizePdfDocument(doc);
    (doc.text as (...a: unknown[]) => unknown)(['✓ one', '₦2'], 0, 0);
    expect(spy).toHaveBeenCalledWith(['[x] one', 'NGN 2'], 0, 0);
  });

  it('also sanitises splitTextToSize, so wrapping measures what is printed', () => {
    const spy = vi.fn(() => []);
    const doc = { splitTextToSize: spy } as Record<string, unknown>;
    sanitizePdfDocument(doc);
    (doc.splitTextToSize as (...a: unknown[]) => unknown)('≥ 40 mg', 100);
    expect(spy).toHaveBeenCalledWith('>= 40 mg', 100);
  });

  it('is idempotent — double wrapping does not double-transform', () => {
    const spy = vi.fn();
    const doc = { text: spy } as Record<string, unknown>;
    sanitizePdfDocument(doc);
    sanitizePdfDocument(doc);
    (doc.text as (...a: unknown[]) => unknown)('a - b', 0, 0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a - b', 0, 0);
  });
});

describe('createSafePDF', () => {
  it('documents why instance wrapping is required', () => {
    // If this ever becomes a function, jsPDF moved text() onto the prototype and
    // the approach in pdfTextSafe.ts should be re-evaluated.
    expect(typeof (jsPDF as unknown as { prototype: { text?: unknown } }).prototype.text).toBe('undefined');
  });

  it('returns a real jsPDF document that sanitises on the way through', () => {
    const doc = createSafePDF('p', 'mm', 'a4');
    // splitTextToSize is the observable proof the wrap is live on a genuine
    // document: the returned lines must not contain the original glyph.
    const lines = doc.splitTextToSize('⚠️ Warning ≥ 40', 200) as string[];
    const joined = lines.join(' ');
    expect(joined).toContain('Warning:');
    expect(joined).toContain('>=');
    expect(joined).not.toContain('⚠');
    expect(joined).not.toContain('≥');
  });

  it('accepts the object-options constructor overload', () => {
    const doc = createSafePDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight());
  });
});
