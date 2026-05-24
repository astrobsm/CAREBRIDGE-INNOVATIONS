/**
 * pdfTextSafe.ts — jsPDF text sanitizer
 *
 * jsPDF default font (Helvetica) uses WinAnsi (cp1252) encoding which does NOT
 * support emoji (⚠️), check marks (✓☑), boxes (☐), bullets (•), arrows (→), or
 * even ₦ (Naira) and ℞ (Rx). When these characters are passed to doc.text(),
 * jsPDF emits raw UTF-16 bytes that the PDF viewer renders as garbled output
 * such as "& þ W a r n i n g  S i g n s" instead of "⚠️ Warning Signs".
 *
 * Fix:
 *   1. Replace common Unicode glyphs with ASCII equivalents that ARE in cp1252.
 *   2. Strip any remaining non-Latin-1 characters as a safety net.
 *   3. Monkey-patch jsPDF.prototype.text once at app start so every existing
 *      generator benefits without touching 40+ call sites.
 */

import { jsPDF } from 'jspdf';

const REPLACEMENTS: Array<[RegExp, string]> = [
  // Warning / alert glyphs (include variation selector U+FE0F)
  [/⚠\uFE0F?/g, '!'],
  // Check / tick marks
  [/[✓✔☑]\uFE0F?/g, '[x]'],
  // Empty checkbox
  [/[☐]/g, '[ ]'],
  // Cross / X marks
  [/[✗✘❌]\uFE0F?/g, 'X'],
  // Bullets / dots
  [/[•●◦∙·]/g, '-'],
  // Arrows
  [/[→➔➜]/g, '->'],
  [/[←⬅]/g, '<-'],
  [/↑/g, '^'],
  [/↓/g, 'v'],
  // Smart quotes
  [/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"'],
  [/[\u2018\u2019\u201A]/g, "'"],
  // Dashes
  [/[\u2013\u2014\u2015]/g, '-'],
  // Ellipsis
  [/…/g, '...'],
  // Currency / pharmacy not in cp1252
  [/₦/g, 'NGN '],
  [/℞/g, 'Rx'],
  // Greek micro / degree-like
  [/μ/g, 'u'],
];

export function pdfSafe(input: unknown): string {
  if (input === null || input === undefined) return '';
  let s = typeof input === 'string' ? input : String(input);
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  // Strip any remaining glyphs outside Latin-1 to prevent garbled output.
  // (Spaces/tabs/newlines and all cp1252 chars are kept.)
  s = s.replace(/[^\x00-\xFF]/g, '');
  return s;
}

let installed = false;

/**
 * Install a one-time sanitizer on jsPDF.prototype.text so every PDF generator
 * receives sanitized strings. Idempotent.
 */
export function installJsPdfTextSanitizer(): void {
  if (installed) return;
  const proto = (jsPDF as unknown as { prototype: { text: (...a: unknown[]) => unknown } }).prototype;
  const original = proto.text;
  if (!original) return;
  const marker = '__astrohealthSanitized';
  if ((original as unknown as Record<string, unknown>)[marker]) {
    installed = true;
    return;
  }
  const wrapped = function (this: unknown, ...args: unknown[]) {
    if (Array.isArray(args[0])) {
      args[0] = (args[0] as unknown[]).map((v) => pdfSafe(v));
    } else if (typeof args[0] === 'string') {
      args[0] = pdfSafe(args[0]);
    }
    return (original as (...a: unknown[]) => unknown).apply(this, args);
  };
  (wrapped as unknown as Record<string, unknown>)[marker] = true;
  proto.text = wrapped as typeof proto.text;
  installed = true;
}
