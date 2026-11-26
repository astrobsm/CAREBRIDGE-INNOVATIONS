/** Test helper: every string a calculator PDF shows, as one searchable string. */
import { buildCalculatorPdf } from '../../report/pdf';
import type { CalculatorReport } from '../../report/types';

export function pdfText(r: CalculatorReport): string {
  const doc = buildCalculatorPdf(r, { clinician: 'Dr Test', generatedAt: new Date('2026-11-26T10:00:00Z') });
  const pages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages;
  const stream = pages.filter(Boolean).map(p => (Array.isArray(p) ? p.join('\n') : String(p))).join('\n');
  const shown: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stream)) !== null) shown.push(m[1].replace(/\\([()\\])/g, '$1'));
  return shown.join(' ').replace(/\s+/g, ' ');
}
