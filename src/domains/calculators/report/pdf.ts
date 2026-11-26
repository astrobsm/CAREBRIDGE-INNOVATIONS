/**
 * The one PDF every calculator exports: inputs, result, the deterministic plan
 * (every step field, hard limits, monitoring), the AI draft if one was
 * generated (labelled as such), patient details when a patient is selected,
 * the clinician, the date and time, and "Decision support — verify before
 * acting" on every page.
 *
 * Built with the app's branded header/footer and createSafePDF (which maps
 * ≥, ≤, µ and the like to text the PDF fonts can show).
 */
import type jsPDF from 'jspdf';
import { addBrandedHeader, addBrandedFooter } from '../../../utils/pdfUtils';
import { PDF_FONTS } from '../../../utils/pdfConfig';
import { createSafePDF } from '../../../utils/pdfTextSafe';
import type { AiPlan } from '../ai/calculatorAiPlan';
import type { CalculatorReport, ReportField } from './types';

export const PDF_FOOTER_TEXT = 'Decision support — verify before acting.';

export interface CalculatorPdfOptions {
  aiPlan?: AiPlan | null;
  /** AI hard-limit gaps, printed with the AI draft. */
  aiMissingHardLimits?: string[];
  clinician?: string;
  hospitalName?: string;
  generatedAt?: Date;
}

const M = 15;          // left/right margin, mm
const BOTTOM = 26;     // space kept for the footer

class Writer {
  y: number;
  readonly width: number;
  readonly height: number;
  constructor(readonly doc: jsPDF, y: number) {
    this.y = y;
    this.width = doc.internal.pageSize.getWidth();
    this.height = doc.internal.pageSize.getHeight();
  }
  ensure(h: number) {
    if (this.y + h > this.height - BOTTOM) {
      this.doc.addPage();
      this.y = 20;
    }
  }
  heading(text: string, color: [number, number, number] = [0, 0, 0]) {
    this.ensure(12);
    this.y += 3;
    this.doc.setFont(PDF_FONTS.primary, 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(...color);
    this.doc.text(text, M, this.y);
    this.y += 2;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setLineWidth(0.2);
    this.doc.line(M, this.y, this.width - M, this.y);
    this.y += 5;
    this.doc.setTextColor(0, 0, 0);
  }
  para(text: string, { bold = false, size = 9.5, indent = 0, color = [0, 0, 0] as [number, number, number] } = {}) {
    this.doc.setFont(PDF_FONTS.primary, bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...color);
    const lines = this.doc.splitTextToSize(text, this.width - 2 * M - indent) as string[];
    const lh = size * 0.42;
    for (const line of lines) {
      this.ensure(lh + 1);
      this.doc.text(line, M + indent, this.y);
      this.y += lh;
    }
    this.y += 1;
    this.doc.setTextColor(0, 0, 0);
  }
  bullets(items: string[], opts: { indent?: number; color?: [number, number, number] } = {}) {
    for (const it of items) this.para(`- ${it}`, { indent: opts.indent ?? 2, color: opts.color });
  }
  fields(fields: ReportField[]) {
    for (const f of fields) this.para(`${f.label}: ${f.value}`, { indent: 2 });
  }
}

/** Build the document. Pure apart from jsPDF itself; works in node tests. */
export function buildCalculatorPdf(report: CalculatorReport, opts: CalculatorPdfOptions = {}): jsPDF {
  const doc = createSafePDF('p', 'mm', 'a4');
  const when = opts.generatedAt ?? new Date();
  const startY = addBrandedHeader(doc, {
    title: `${report.calculatorName} — calculator report`,
    subtitle: 'Clinical calculator',
    hospitalName: opts.hospitalName || 'AstroHEALTH',
  }, { includeDate: false });
  const w = new Writer(doc, startY);

  w.para(`Date and time: ${when.toLocaleString('en-GB')}`, { size: 9 });
  w.para(`Clinician: ${opts.clinician?.trim() || 'Not recorded'}`, { size: 9 });

  const p = report.patient;
  if (p && (p.name || p.hospitalNumber || p.ageYears || p.sex || p.weightKg)) {
    w.heading('Patient');
    const pf: ReportField[] = [];
    if (p.name) pf.push({ label: 'Name', value: p.name });
    if (p.hospitalNumber) pf.push({ label: 'Hospital number', value: p.hospitalNumber });
    if (p.ageYears) pf.push({ label: 'Age', value: `${p.ageYears} years` });
    if (p.sex) pf.push({ label: 'Sex', value: p.sex });
    if (p.weightKg) pf.push({ label: 'Weight', value: `${p.weightKg} kg` });
    if (p.heightCm) pf.push({ label: 'Height', value: `${p.heightCm} cm` });
    if (p.diagnosis) pf.push({ label: 'Diagnosis', value: p.diagnosis });
    if (p.comorbidities?.length) pf.push({ label: 'Comorbidities', value: p.comorbidities.join(', ') });
    w.fields(pf);
  }

  if (report.inputs.length) { w.heading('Inputs'); w.fields(report.inputs); }
  if (report.results.length) { w.heading('Result'); w.fields(report.results); }
  if (report.notes?.length) { w.heading('Interpretation'); w.bullets(report.notes); }

  const plan = report.plan;
  if (plan) {
    w.heading(plan.title ? `Plan — ${plan.title}` : 'Plan');
    if (plan.target) w.para(`Target: ${plan.target}`);
    if (plan.prerequisites.length) { w.para('Correct or check first:', { bold: true }); w.bullets(plan.prerequisites); }
    plan.steps.forEach((s, i) => {
      w.para(`${i + 1}. ${s.heading}`, { bold: true });
      for (const l of s.lines) w.para(`${l.label}: ${l.value}`, { indent: 4 });
      if (s.cautions.length) { w.para('Cautions:', { indent: 4, bold: true }); w.bullets(s.cautions, { indent: 6 }); }
    });
    if (plan.hardLimits.length) {
      w.para('HARD LIMITS — do not exceed:', { bold: true, color: [185, 28, 28] });
      w.bullets(plan.hardLimits, { color: [185, 28, 28] });
    }
    if (plan.monitoring.length) { w.para('Monitoring:', { bold: true }); w.bullets(plan.monitoring); }
    for (const s of plan.sections) { w.para(`${s.title}:`, { bold: true }); w.bullets(s.items); }
  }

  const ai = opts.aiPlan;
  if (ai) {
    w.heading('AI-DRAFTED PLAN — check before use', [146, 64, 14]);
    w.para('Drafted by Claude (Anthropic) from the de-identified calculator output. It is a draft for a clinician to check, not an order. The deterministic plan and hard limits above take precedence.', { size: 8.5, color: [90, 90, 90] });
    if (plan?.hardLimits.length) {
      w.para('Engine hard limits (always apply):', { bold: true, color: [185, 28, 28] });
      w.bullets(plan.hardLimits, { color: [185, 28, 28] });
    }
    if (opts.aiMissingHardLimits?.length) {
      w.para(`The AI draft did not restate ${opts.aiMissingHardLimits.length} of these limit(s) verbatim. They apply regardless.`, { color: [185, 28, 28] });
    }
    w.para('Assessment:', { bold: true }); w.para(ai.assessmentSummary, { indent: 2 });
    if (ai.immediateActions.length) { w.para('Immediate actions:', { bold: true }); w.bullets(ai.immediateActions.map(a => a.timing ? `${a.action} (${a.timing})` : a.action)); }
    if (ai.fluidsAndDrugs.length) {
      w.para('Fluids and drugs:', { bold: true });
      w.bullets(ai.fluidsAndDrugs.map(d => [d.item, d.dose, d.route, d.rateOrFrequency, d.duration].filter(Boolean).join(' — ') + (d.notes ? `. ${d.notes}` : '')));
    }
    if (ai.monitoring.length) { w.para('Monitoring:', { bold: true }); w.bullets(ai.monitoring.map(m => `${m.what}: ${m.frequency}${m.target ? ` (target ${m.target})` : ''}`)); }
    if (ai.escalationCriteria.length) { w.para('Escalate if:', { bold: true }); w.bullets(ai.escalationCriteria); }
    if (ai.counsellingPoints.length) { w.para('Patient and family counselling:', { bold: true }); w.bullets(ai.counsellingPoints); }
    if (ai.followUp.length) { w.para('Follow-up:', { bold: true }); w.bullets(ai.followUp); }
    if (ai.unknowns.length) { w.para('Not known / to obtain:', { bold: true }); w.bullets(ai.unknowns); }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, pages, PDF_FOOTER_TEXT);
  }
  return doc;
}

export function calculatorPdfFileName(report: CalculatorReport, when = new Date()): string {
  const slug = report.calculatorName.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}_${pad(when.getHours())}${pad(when.getMinutes())}`;
  return `${slug || 'Calculator'}_${stamp}.pdf`;
}
