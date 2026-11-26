/**
 * Formatting shared by every calculator report: numbers to display strings,
 * engine correction plans to report plans, and a checker for the things that
 * must never reach a clinician's screen (NaN, undefined, [object Object]).
 */
import type { CorrectionPlan, CorrectionStep } from '../../clinician-assistant/services/engine/replacement';
import { ROUTE_LABEL } from '../../clinician-assistant/services/engine/replacement';
import type { CalculatorReport, DeterministicPlan, ReportField, ReportSection, ReportStep } from './types';

/** A finite number, or null. Strings are parsed; blanks are null, not zero. */
export function finiteOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** "12.3 mmol/L", or "—" when the value is missing or not a finite number. */
export function fmtNum(v: unknown, unit = '', dp = 1): string {
  const n = finiteOrNull(v);
  if (n === null) return '—';
  const s = Number.isInteger(n) && dp > 0 ? String(n) : n.toFixed(dp);
  return unit ? `${s} ${unit}` : s;
}

/** A field, skipping nothing: a missing value shows as "—". */
export function field(label: string, value: unknown, unit = '', dp = 1): ReportField {
  if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && /^-?\d+(\.\d+)?$/.test(value.trim()))) {
    return { label, value: fmtNum(value, unit, dp) };
  }
  const s = value === null || value === undefined ? '' : String(value).trim();
  return { label, value: s ? (unit ? `${s} ${unit}` : s) : '—' };
}

/** Only fields that actually have a value (for optional inputs). */
export function presentFields(fields: ReportField[]): ReportField[] {
  return fields.filter(f => f.value !== '—' && f.value !== '');
}

export const yesNo = (b: boolean | undefined | null) => (b ? 'Yes' : 'No');

export function section(title: string, items: Array<string | null | undefined | false>, tone?: ReportSection['tone']): ReportSection | null {
  const clean = items.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  return clean.length ? { title, items: clean, ...(tone ? { tone } : {}) } : null;
}

export function sections(...s: Array<ReportSection | null>): ReportSection[] {
  return s.filter((x): x is ReportSection => x !== null);
}

export function emptyPlan(over: Partial<DeterministicPlan> = {}): DeterministicPlan {
  return { steps: [], hardLimits: [], monitoring: [], prerequisites: [], sections: [], ...over };
}

/**
 * One engine correction step, as the panel and the PDF show it: the
 * indication as the heading, then route, preparation, dose, administration
 * and access as labelled lines, then the cautions. Empty fields are dropped
 * rather than printed as blank labels.
 */
export function formatCorrectionStep(step: CorrectionStep): ReportStep {
  const lines: ReportField[] = [
    { label: 'Route', value: ROUTE_LABEL[step.route] ?? String(step.route ?? '') },
    { label: 'Preparation', value: step.preparation },
    { label: 'Dose', value: step.dose },
    { label: 'Administration', value: step.administration },
    { label: 'Access', value: step.access ?? '' },
  ].filter(l => typeof l.value === 'string' && l.value.trim() !== '');
  return {
    heading: step.indication?.trim() || 'Step',
    lines,
    cautions: (step.cautions ?? []).filter(c => typeof c === 'string' && c.trim() !== ''),
  };
}

/** An engine CorrectionPlan as a report plan, nothing dropped. */
export function correctionPlanToReportPlan(plan: CorrectionPlan): DeterministicPlan {
  const deficit = plan.deficit
    ? section(plan.deficit.label, [plan.deficit.value, plan.deficit.note])
    : null;
  return emptyPlan({
    title: plan.title,
    target: plan.target,
    steps: plan.steps.map(formatCorrectionStep),
    hardLimits: plan.hardLimits.filter(Boolean),
    monitoring: plan.monitoring.filter(Boolean),
    prerequisites: (plan.prerequisites ?? []).filter(Boolean),
    sections: sections(deficit),
  });
}

/** A step as one line of plain text (PDF, WhatsApp text, AI prompt). */
export function stepToText(s: ReportStep): string {
  const body = s.lines.map(l => `${l.label}: ${l.value}`).join('; ');
  const cautions = s.cautions.length ? ` Cautions: ${s.cautions.join(' ')}` : '';
  return `${s.heading} — ${body}.${cautions}`;
}

const BAD = /\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b|\bnull\b/;

/**
 * Every displayed string in a report that contains NaN, undefined, null,
 * Infinity or [object Object], or is empty. Used by tests and nothing else:
 * a calculator that fails this would show the clinician a broken figure.
 */
export function reportProblems(r: CalculatorReport): string[] {
  const problems: string[] = [];
  const check = (where: string, s: unknown) => {
    if (typeof s !== 'string') { problems.push(`${where}: not a string (${typeof s})`); return; }
    if (s.trim() === '') problems.push(`${where}: empty`);
    else if (BAD.test(s)) problems.push(`${where}: "${s}"`);
  };
  check('calculatorName', r.calculatorName);
  r.inputs.forEach((f, i) => { check(`inputs[${i}].label`, f.label); check(`inputs[${i}] ${f.label}`, f.value); });
  r.results.forEach((f, i) => { check(`results[${i}].label`, f.label); check(`results[${i}] ${f.label}`, f.value); });
  (r.notes ?? []).forEach((n, i) => check(`notes[${i}]`, n));
  const p = r.plan;
  if (p) {
    if (p.title !== undefined) check('plan.title', p.title);
    if (p.target !== undefined) check('plan.target', p.target);
    p.steps.forEach((s, i) => {
      check(`steps[${i}].heading`, s.heading);
      s.lines.forEach((l, j) => check(`steps[${i}].${l.label}`, l.value));
      s.cautions.forEach((c, j) => check(`steps[${i}].cautions[${j}]`, c));
    });
    p.hardLimits.forEach((h, i) => check(`hardLimits[${i}]`, h));
    p.monitoring.forEach((h, i) => check(`monitoring[${i}]`, h));
    p.prerequisites.forEach((h, i) => check(`prerequisites[${i}]`, h));
    p.sections.forEach((s, i) => {
      check(`sections[${i}].title`, s.title);
      s.items.forEach((it, j) => check(`sections[${i}] ${s.title}[${j}]`, it));
    });
    const hasContent = p.steps.length + p.hardLimits.length + p.monitoring.length + p.prerequisites.length + p.sections.length > 0;
    if (!hasContent) problems.push('plan: present but empty');
  }
  return problems;
}
