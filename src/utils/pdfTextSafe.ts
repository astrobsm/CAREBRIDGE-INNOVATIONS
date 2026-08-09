/**
 * pdfTextSafe.ts — jsPDF text sanitiser.
 *
 * THE PROBLEM
 * jsPDF's built-in fonts (helvetica/times/courier) are WinAnsi (cp1252)
 * encoded. Any codepoint outside that set renders as a wrong glyph, a blank
 * box, or — worst — spaced-out garbage like "& þ W a r n i n g  S i g n s"
 * where "⚠️ Warning Signs" was intended. Emoji, arrows, typographic dashes,
 * ≥/≤, ₦ and ℞ are the usual offenders in this codebase.
 *
 * WHY INSTANCE-LEVEL, NOT PROTOTYPE-LEVEL
 * An earlier version of this file patched `jsPDF.prototype.text`. That silently
 * did nothing: jsPDF assigns `text` and `splitTextToSize` as OWN PROPERTIES of
 * each document inside the constructor, so `jsPDF.prototype.text` is undefined
 * (verified on 2.5.2, and `jsPDF.API.text` is undefined too — there is no
 * global hook). The old installer hit `if (!original) return;` and installed
 * nothing, so every PDF the app produced went out unsanitised. Wrapping each
 * document instance is the only thing that actually works.
 *
 * HOW IT IS APPLIED
 * `createSafePDF()` constructs a document and wraps it in one step. Every
 * generator in the app builds its document through it, so nothing has to
 * remember to sanitise. If you add a PDF export, use createSafePDF() rather
 * than `new jsPDF()`.
 *
 * WHAT IS PRESERVED
 * Accented Latin letters are NOT transliterated — WinAnsi covers them, so
 * "Björn" and "Adébáyọ̀"'s base letters print correctly. Only characters
 * genuinely outside the encoding are mapped to words or dropped. Symbols that
 * carry clinical meaning (≥, ≤, ≠, µ, °) become their text equivalents rather
 * than disappearing, because dropping them changes what the document says.
 */

import { jsPDF, type jsPDFOptions } from 'jspdf';

/**
 * Ordered symbol → text map. Meaningful symbols become words or ASCII
 * equivalents; decorative ones are dropped by the final catch-all.
 *
 * Order matters: variation selectors (U+FE0F) are consumed alongside their
 * base glyph so they do not survive as a stray box.
 */
const REPLACEMENTS: Array<[RegExp, string]> = [
  // ── Clinical / mathematical operators (dropping these changes meaning) ──
  [/≥/g, '>='],
  [/≤/g, '<='],
  [/≠/g, '!='],
  [/≈/g, '~'],
  [/±/g, '+/-'],
  [/×/g, 'x'],
  [/÷/g, '/'],
  [/√/g, 'sqrt'],
  [/∞/g, 'infinity'],
  [/[µμ]/g, 'u'],          // micro sign AND Greek mu — both used for micrograms
  // Temperature units are handled as a unit so the space lands correctly:
  // "37 °C" -> "37 degC", not "37  degC" collapsed to "37 degC" by accident.
  [/°C\b/g, 'degC'],
  [/°F\b/g, 'degF'],
  [/°/g, ' deg'],
  [/‰/g, ' per mille'],

  // ── Superscripts commonly used in units (cm², m³) ──
  [/²/g, '2'],
  [/³/g, '3'],
  [/¹/g, '1'],

  // ── Warning / alert glyphs ──
  [/⚠️?/g, 'Warning:'],
  [/❗️?/g, 'Important:'],
  [/❕/g, '!'],

  // ── Status marks ──
  [/[✓✔✅]️?/g, '[x]'],
  [/[☑☒]/g, '[x]'],
  [/☐/g, '[ ]'],
  [/[✗✘❌]️?/g, 'X'],

  // ── Contact glyphs ──
  [/[\u{1F4DE}☎☎]️?/gu, 'Tel:'],
  [/\u{1F4F1}️?/gu, 'Mobile:'],
  [/[✉\u{1F4E7}]️?/gu, 'Email:'],

  // ── Bullets / dots ──
  [/[•●○◦∙·▪▫■□]/g, '-'],

  // ── Arrows ──
  [/[→➔➜⇒]/g, '->'],
  [/[←⬅⇐]/g, '<-'],
  [/[↑⇑]/g, '^'],
  [/[↓⇓]/g, 'v'],

  // ── Typographic punctuation (outside cp1252 as codepoints) ──
  [/[“”„«»]/g, '"'],
  [/[‘’‚]/g, "'"],
  [/[‐-―−]/g, '-'],
  [/…/g, '...'],

  // ── Currency / pharmacy not in cp1252 ──
  [/₦/g, 'NGN '],
  [/℞/g, 'Rx'],
  [/[™]/g, '(TM)'],
  [/℅/g, 'c/o'],
];

/**
 * Convert a value to something jsPDF's standard fonts can actually render.
 * Safe to call on any type; non-strings are coerced, null/undefined become ''.
 */
export function pdfSafe(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = typeof input === 'string' ? input : String(input);
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  // Catch-all: drop anything still outside Latin-1. Accented letters survive;
  // remaining emoji and exotic symbols do not.
  s = s.replace(/[^\x00-\xFF]/g, '');
  // Dropping a glyph leaves its surrounding space behind, which prints as a
  // stray indent or a double gap mid-sentence.
  s = s.replace(/[^\S\r\n]{2,}/g, ' ');
  return s;
}

/** Apply to a string, or element-wise to an array, leaving other types alone. */
function sanitizeArg<T>(arg: T): T {
  if (typeof arg === 'string') return pdfSafe(arg) as unknown as T;
  if (Array.isArray(arg)) {
    return arg.map(item => (typeof item === 'string' ? pdfSafe(item) : item)) as unknown as T;
  }
  return arg;
}

/** Marks a document already wrapped, so double-wrapping is a no-op. */
const WRAPPED = Symbol.for('astrohealth.pdfTextSanitized');

/**
 * Wrap ONE jsPDF document so its text output is sanitised.
 *
 * Idempotent — safe to call on a document that has already been wrapped, which
 * matters because some generators pass a document between helpers.
 */
export function sanitizePdfDocument<T>(doc: T): T {
  const d = doc as unknown as Record<string | symbol, unknown>;
  if (!d || d[WRAPPED]) return doc;

  if (typeof d.text === 'function') {
    const originalText = (d.text as (...a: unknown[]) => unknown).bind(doc);
    // Signature is text(text, x, y, options) — only the first argument carries
    // content; the rest are coordinates and options and must pass through.
    d.text = (...args: unknown[]) => {
      if (args.length) args[0] = sanitizeArg(args[0]);
      return originalText(...args);
    };
  }

  // splitTextToSize measures a string in order to wrap it. If it measured the
  // raw text while text() rendered the sanitised version, line breaks would be
  // computed for characters that never appear and the wrap width would drift.
  if (typeof d.splitTextToSize === 'function') {
    const originalSplit = (d.splitTextToSize as (...a: unknown[]) => unknown).bind(doc);
    d.splitTextToSize = (...args: unknown[]) => {
      if (args.length) args[0] = sanitizeArg(args[0]);
      return originalSplit(...args);
    };
  }

  d[WRAPPED] = true;
  return doc;
}

/**
 * Construct a jsPDF document with text sanitisation already applied.
 *
 * Use this everywhere instead of `new jsPDF()`. Both jsPDF constructor
 * overloads are mirrored so it is a genuine drop-in replacement — and so object
 * literals stay contextually typed against jsPDFOptions rather than widening to
 * `string` and failing to match.
 */
export function createSafePDF(options?: jsPDFOptions): jsPDF;
export function createSafePDF(
  orientation?: 'p' | 'portrait' | 'l' | 'landscape',
  unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc',
  format?: string | number[],
  compressPdf?: boolean,
): jsPDF;
export function createSafePDF(...args: unknown[]): jsPDF {
  const Ctor = jsPDF as unknown as new (...a: unknown[]) => jsPDF;
  return sanitizePdfDocument(new Ctor(...args));
}

/**
 * Boot-time diagnostic, kept so main.tsx has one obvious call site.
 *
 * Sanitisation itself happens per document in createSafePDF. This only reports
 * if a future jsPDF version moves `text` back onto the prototype — in which
 * case instance wrapping still works, but the assumption above should be
 * re-checked rather than silently relied upon.
 */
export function installJsPdfTextSanitizer(): void {
  const proto = (jsPDF as unknown as { prototype?: Record<string, unknown> })?.prototype;
  if (proto && typeof proto.text === 'function' && import.meta.env?.DEV) {
    console.info('[pdf] jsPDF now exposes text() on the prototype; instance wrapping still applies.');
  }
}
