/**
 * The approved plan as two PDFs, as section models (pure, tested without
 * pixels) drawn by the procedure review's renderer (renderReviewDocument):
 *
 *   clinician  the full plan by section with every line's source, the hard
 *              rules, results and interpretation, Claude's lines labelled
 *              AI-drafted, approver / time / version, and the references;
 *   patient    plain English only, from the locale table: what we found, the
 *              tests and why, medicines and how to take them, eating to heal,
 *              treatment options, what we talked about, warning signs and
 *              follow-up dates. No scores, flags or clinical reasoning, and
 *              any line the patient-copy filters would refuse is dropped
 *              (PATIENT_COPY_EXCLUDE, SCORE_TERMS).
 */
import { addDays, format } from 'date-fns';
import type jsPDF from 'jspdf';
import type { PDFPatientInfo } from '../../../utils/pdfUtils';
import { PATIENT_COPY_EXCLUDE, renderReviewDocument, type ReviewDocSection, type ReviewDocument } from '../procedureReview/pdf';
import { SCORE_TERMS } from '../../patient-pack/patientPack';
import { patientText } from '../../patient-pack/locale/en';
import type { Appointment } from '../../../types';
import { CONDITION_BY_ID } from './conditions';
import { ACTIVE_WOUND_PROTOCOL as WP } from './protocols/woundClinic.v1';
import { warningSigns } from './rulesPlan';
import { resultMaps } from './results';
import { ANALYTE_BY_KEY } from '../../clinician-assistant/services/engine/referenceRanges';
import { PLAN_SECTIONS } from './types';
import type { ClerkingPlanRecord, PlanApproval } from './records';

const P = patientText.plan;
const safe = (t: string | undefined): t is string => !!t && !PATIENT_COPY_EXCLUDE.test(t) && !SCORE_TERMS.test(t);
const day = (d: Date) => format(d, 'd MMMM yyyy');
/** A clinician's follow-up purpose without bracketed clinical notes. */
const plain = (t: string) => t.replace(/\s*\([^)]*\)/g, '').trim();

export interface PlanDocInput {
  record: ClerkingPlanRecord;
  approval: PlanApproval;
  patient: PDFPatientInfo;
  hospitalName?: string;
  date: Date;
  /** Booked appointments from this plan, for real dates on the patient copy. */
  appointments?: Appointment[];
}

const tag = (kind: string) => ({ protocol: 'protocol', template: 'template', guideline: 'guideline', engine: 'nutrition engine', clerking: 'clerking', ai: 'AI-drafted, accepted by clinician', clinician: 'clinician' } as Record<string, string>)[kind] ?? kind;

export function buildClinicianPlanDocument(i: PlanDocInput): ReviewDocument {
  const { record, approval } = i;
  const sections: ReviewDocSection[] = [];
  sections.push({
    kind: 'summary', title: 'About this plan',
    body: `Treatment plan version ${approval.version}, approved by ${approval.byName || 'clinician'} on ${approval.at.slice(0, 16).replace('T', ' ')}. `
      + `Conditions: ${record.conditions.map(c => c.label).join('; ') || 'not recorded'}. `
      + `Built by the rules engine v${approval.engineVersion}${approval.protocolVersion ? ` with the ${WP.source}, v${approval.protocolVersion}` : ''}. `
      + (approval.includesAi ? 'Lines marked "AI-drafted" were drafted by Claude (Anthropic) and accepted by the approving clinician.' : 'No AI-drafted lines are included.'),
  });
  if (approval.hardRules.length) sections.push({ kind: 'flags', title: 'Hard rules (always apply)', bullets: approval.hardRules });
  for (const s of PLAN_SECTIONS) {
    const lines = approval.lines.filter(l => l.section === s.id);
    if (!lines.length) continue;
    sections.push({
      kind: 'plan', title: s.label,
      bullets: lines.map(l => {
        const med = l.medication;
        const body = med ? [med.drug, med.dose, med.route, med.frequency, med.duration && `for ${med.duration}`].filter(Boolean).join(' ') + (med.weightBasis ? ` [${med.weightBasis}]` : '') + (med.cautions.length ? ` Cautions: ${med.cautions.join(' ')}` : '') : l.text;
        return `${l.urgency === 'urgent' ? 'URGENT: ' : ''}${body}${l.why ? ` (why: ${l.why})` : ''} — source: ${tag(l.source.kind)}${l.source.kind === 'ai' ? '' : ` (${l.source.label})`}${l.edited ? ' [edited by clinician]' : ''}`;
      }),
    });
  }
  const { labs, qualitative } = resultMaps(record.results);
  const rows = [
    ...Object.entries(labs).map(([k, v]) => { const r = record.results.filter(x => x.analyte === k && x.confirmed).pop(); return [ANALYTE_BY_KEY[k]?.label ?? k, `${v} ${r?.unit ?? ''}`.trim(), r?.flag ?? '', r?.via === 'scan' ? 'scanned, confirmed' : 'entered']; }),
    ...Object.entries(qualitative).map(([k, v]) => [k.replace(/_/g, ' '), v, '', 'entered']),
  ];
  if (rows.length) sections.push({ kind: 'scores', title: 'Results', table: { headers: ['Test', 'Result', 'Flag', 'How'], rows } });
  const interp = record.interpretation;
  if (interp) {
    sections.push({ kind: 'assessment', title: 'Interpretation (deterministic)', bullets: [...interp.deterministic.findings.map(f => `${f.text} (${f.source})`), ...interp.deterministic.implications] });
    if (interp.ai) sections.push({ kind: 'assessment', title: 'Interpretation — AI-DRAFTED by Claude, check before use', body: interp.ai.value.interpretation, bullets: interp.ai.value.findings.map(f => `${f.test}: ${f.meaning}`) });
  }
  if (record.aiDraft) {
    sections.push({ kind: 'assessment', title: 'Claude assessment — AI-DRAFTED, check before use', body: record.aiDraft.draft.assessment || undefined,
      bullets: [...(record.aiDraft.draft.unknowns ?? []).map(u => `Unknown: ${u}`), ...(record.aiDraft.missingHardRules.length ? [`The draft did not restate ${record.aiDraft.missingHardRules.length} hard rule(s) verbatim; they apply regardless.`] : [])] });
  }
  if (record.rulesPlan.missing.length) sections.push({ kind: 'barriers', title: 'Not documented at approval', bullets: record.rulesPlan.missing });
  const refs = [
    ...record.conditions.flatMap(c => CONDITION_BY_ID[c.id]?.sources ?? []),
    ...(approval.protocolVersion ? [WP.source, ...WP.references] : []),
  ];
  if (refs.length) sections.push({ kind: 'summary', title: 'Sources', bullets: [...new Set(refs)] });

  const safeName = (i.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    title: 'TREATMENT PLAN', subtitle: record.conditions.map(c => c.label).join(', ') || 'Clerking plan',
    hospitalName: i.hospitalName || 'AstroHEALTH', patient: i.patient,
    meta: { Version: String(approval.version), Approved: `${approval.byName || ''} ${approval.at.slice(0, 10)}`.trim(), Date: i.date.toISOString().slice(0, 10) },
    sections, fileName: `treatment-plan-${safeName}-${i.date.toISOString().slice(0, 10)}-v${approval.version}.pdf`, audience: 'clinician',
    footer: 'Decision support: approved by the clinician named above. AI-drafted lines are labelled.',
  };
}

export function buildPatientPlanDocument(i: PlanDocInput): ReviewDocument {
  const { record, approval } = i;
  const S = P.copy.sections;
  const sections: ReviewDocSection[] = [{ kind: 'summary', title: 'About this leaflet', body: P.copy.intro }];
  const lines = approval.lines;
  // A medicine the clinician approved without a locale line (e.g. accepted from Claude) is still the patient's prescription.
  const medText = (l: (typeof lines)[number]) => l.patient ?? (l.medication && l.medication.dose !== '-' ? P.copy.medicineLine(l.medication.drug, l.medication.dose, l.medication.frequency, l.medication.duration) : undefined);
  const pt = (sec: string) => lines.filter(l => l.section === sec).map(l => (sec === 'medications' ? medText(l) : l.patient)).filter(safe);

  const conditions = record.conditions.map(c => (P.conditions as Record<string, { name: string; about: string }>)[c.id] ?? (c.label ? { name: c.label, about: P.conditions.other.about } : null)).filter(Boolean) as { name: string; about: string }[];
  if (conditions.length) sections.push({ kind: 'assessment', title: S.diagnosis, bullets: conditions.map(c => `${c.name}. ${c.about}`).filter(safe) });

  const tests = [...new Set(pt('investigations'))];
  sections.push({ kind: 'plan', title: S.tests, bullets: tests.length ? tests : [P.copy.noTests] });
  if (record.results.some(r => r.confirmed)) sections.push({ kind: 'plan', title: S.results, body: P.copy.resultsIntro });
  const meds = [...new Set(pt('medications'))];
  sections.push({ kind: 'plan', title: S.medicines, bullets: meds.length ? meds : [P.copy.noMedicines] });
  const food = [...new Set(pt('nutrition'))];
  if (food.length) sections.push({ kind: 'plan', title: S.food, bullets: food });
  const options = [...new Set(pt('procedures'))];
  if (options.length) sections.push({ kind: 'consent', title: S.options, bullets: options });
  const counsel = [...new Set([...pt('counselling'), ...pt('monitoring')])];
  if (counsel.length) sections.push({ kind: 'counselling', title: S.counselling, bullets: counsel });
  sections.push({ kind: 'warning_signs', title: S.warning, bullets: [...warningSigns(record.rulesPlan).filter(safe), P.copy.contactLine] });

  const approvedOn = new Date(approval.at);
  const booked = (i.appointments ?? []).filter(a => a.status !== 'cancelled').sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  const fu = booked.length
    ? booked.map(a => P.copy.followUpLine(`${day(new Date(a.appointmentDate))} at ${a.appointmentTime}`, a.reasonForVisit.replace(/^[^:]*:\s*/, '')))
    : lines.filter(l => l.section === 'follow_up' && l.followUp).map(l => l.followUp!.days != null
      ? P.copy.followUpLine(day(addDays(approvedOn, l.followUp!.days)), l.patient ?? plain(l.followUp!.purpose))
      : P.copy.followUpUndated(l.followUp!.when, l.patient ?? plain(l.followUp!.purpose)));
  sections.push({ kind: 'follow_up', title: S.followUp, bullets: fu.filter(safe).length ? [...new Set(fu.filter(safe))] : [P.copy.followUpNone] });

  // Last line of defence: nothing the patient-copy filters refuse.
  for (const s of sections) { if (s.bullets) s.bullets = s.bullets.filter(safe); if (s.body && !safe(s.body)) s.body = undefined; }

  const safeName = (i.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    title: P.copy.title, subtitle: conditions.map(c => c.name).join(', ') || 'Your plan',
    hospitalName: i.hospitalName || 'AstroHEALTH', patient: { name: i.patient.name, hospitalNumber: i.patient.hospitalNumber, age: i.patient.age, gender: i.patient.gender },
    meta: { Date: day(i.date) }, sections, fileName: P.copy.fileName(safeName, i.date.toISOString().slice(0, 10)), audience: 'patient', footer: P.copy.footer,
  };
}

export const renderPlanDocument = (d: ReviewDocument): jsPDF => renderReviewDocument(d);
