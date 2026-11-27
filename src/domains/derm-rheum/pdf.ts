/**
 * The derm & rheum consult as two documents, drawn by the plan PDF renderer
 * (procedureReview renderReviewDocument):
 *
 *   clinician  screen, hard rules and their check against the consult,
 *              Claude's differential, investigations, management, do-nots,
 *              referrals and confidence — labelled AI-drafted — and the
 *              knowledge-base sources;
 *   patient    a plain-English leaflet section: possible causes (plain names
 *              from the locale), tests in plain words, the counselling points
 *              and warning signs. No likelihoods, scores, doses per kilogram,
 *              "e.g." or "elemental": the patient-copy filters drop any line
 *              that would carry them.
 */
import { format } from 'date-fns';
import type { PDFPatientInfo } from '../../utils/pdfUtils';
import { PATIENT_COPY_EXCLUDE, type ReviewDocSection, type ReviewDocument } from '../clinical/procedureReview/pdf';
import { SCORE_TERMS } from '../patient-pack/patientPack';
import { PATIENT_MEDICINE_BANNED } from '../clinical/clerkingPlan/patientMedicine';
import { patientText } from '../patient-pack/locale/en';
import { ymd } from '../surgery/journey/followUpPlan';
import { KB, KB_BY_ID } from './kb';
import type { DermRheumConsultRecord } from './store';

const P = patientText.plan;
const DR = P.dermRheum;
/** The plan copy's filters, plus the medicine-line words (owner decision 2026-11-27). */
export const patientSafe = (t: string | undefined): t is string =>
  !!t && !PATIENT_COPY_EXCLUDE.test(t) && !SCORE_TERMS.test(t) && !PATIENT_MEDICINE_BANNED.test(t) && !/likelihood|\bmg\b.*\/|\bdose\b.*kg/i.test(t);

export interface ConsultDocInput {
  record: DermRheumConsultRecord;
  patient: PDFPatientInfo;
  hospitalName?: string;
  date: Date;
}

const STATUS = { ok: 'respected', omitted: 'NOT ADDRESSED by the AI draft', contradicted: 'CONTRADICTED by the AI draft' } as const;

export function buildConsultClinicianDocument(i: ConsultDocInput): ReviewDocument {
  const { record: r } = i;
  const c = r.consult;
  const sections: ReviewDocSection[] = [
    { kind: 'summary', title: 'About this review',
      body: `Dermatology & rheumatology review of ${format(new Date(r.at), 'd MMMM yyyy HH:mm')} by ${r.byName || 'clinician'}. Knowledge base v${r.kbVersion}, screen v${r.screenVersion}. `
        + `The consult below is AI-DRAFTED by Claude (Anthropic) — check before use; ${r.photosSent ? `${r.photosSent} photo(s) were sent without the patient's name` : 'no photos were sent'}. Only lines the clinician accepted enter the treatment plan.` },
    { kind: 'flags', title: 'Atypical ulcer screen (deterministic)', bullets: r.deterministic.flags.length ? r.deterministic.flags.map(f => `${f.text} (${f.kind})`) : ['No atypical feature recorded'] },
  ];
  if (r.deterministic.hardRules.length) {
    sections.push({ kind: 'flags', title: 'Hard rules (always apply)', bullets: r.deterministic.hardRules.map(h => {
      const chk = r.checks.find(x => x.rule.id === h.id);
      return `${h.text} — because: ${h.because}. AI draft: ${STATUS[chk?.status ?? 'ok']}${chk?.detail ? ` (${chk.detail})` : ''}.`;
    }) });
  }
  sections.push(
    { kind: 'assessment', title: 'Claude consult — AI-DRAFTED, check before use', body: `${c.summary} Urgency: ${c.urgency}. Confidence: ${c.confidence}.` },
    { kind: 'scores', title: 'Differential (ranked)', table: { headers: ['Diagnosis', 'Likelihood', 'For', 'Against'], rows: c.differential.map(d => [d.diagnosis, d.likelihood, d.supporting.join('; ') || d.reasoning, d.against.join('; ') || '—']) } },
  );
  if (c.mustNotMiss.length) sections.push({ kind: 'flags', title: 'Must not miss', bullets: c.mustNotMiss.map(m => `${m.diagnosis}: ${m.why}${m.howToExclude ? ` Exclude by: ${m.howToExclude}` : ''}`) });
  sections.push({ kind: 'plan', title: 'Investigations', bullets: c.investigations.map(x => `${x.urgency === 'urgent' ? 'URGENT: ' : ''}${x.test}${x.biopsySite ? ` (site: ${x.biopsySite})` : ''}${x.catalogueCode ? ` [${x.catalogueCode}]` : ''}${x.why ? ` — ${x.why}` : ''}`) });
  sections.push({ kind: 'plan', title: 'Management', bullets: [...c.management.immediate.map(m => `Immediate: ${m}`), ...c.management.definitive.map(m => `Definitive: ${m}`)] });
  if (c.doNot.length) sections.push({ kind: 'flags', title: 'Do not', bullets: c.doNot });
  if (c.referrals.length) sections.push({ kind: 'plan', title: 'Referrals', bullets: c.referrals.map(x => `${x.to} (${x.urgency})${x.why ? `: ${x.why}` : ''}`) });
  if (c.photoObservations.length) sections.push({ kind: 'assessment', title: 'Photo observations (AI; never a substitute for examination or histology)', bullets: c.photoObservations });
  if (c.wouldChangeConfidence.length) sections.push({ kind: 'barriers', title: 'What would change the confidence', bullets: c.wouldChangeConfidence });
  if (r.missingHardRules.length) sections.push({ kind: 'barriers', title: 'Hard rules the draft did not quote verbatim (they apply regardless)', bullets: r.missingHardRules });
  const ids = [...new Set([...r.deterministic.candidates.map(x => x.id), ...c.differential.map(d => d.kbId).filter((x): x is string => !!x)])];
  const pending = ids.flatMap(id => (KB_BY_ID[id]?.pendingValidation ?? []).map(p => `${KB_BY_ID[id].label}: ${p}`));
  if (pending.length) sections.push({ kind: 'barriers', title: 'Pending clinical validation', bullets: pending });
  sections.push({ kind: 'summary', title: 'Sources', bullets: [...new Set(ids.flatMap(id => KB_BY_ID[id]?.sources ?? []))] });

  const safeName = (i.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    title: 'DERMATOLOGY & RHEUMATOLOGY REVIEW', subtitle: c.differential[0]?.diagnosis ?? 'Skin lesion / ulcer',
    hospitalName: i.hospitalName || 'AstroHEALTH', patient: i.patient,
    meta: { Date: ymd(i.date), 'Knowledge base': `v${r.kbVersion}`, AI: 'Claude, AI-drafted' },
    sections, fileName: `derm-rheum-review-${safeName}-${ymd(i.date)}.pdf`, audience: 'clinician',
    footer: 'Decision support. AI-drafted content is labelled and must be checked by the treating clinician.',
  };
}

/** Plain words for an investigation, by its knowledge-base kind (catalogue code → kind), or by its name. */
function testWord(code: string | null, test: string): string {
  const kb = KB.flatMap(c => c.investigations).find(x => code && x.catalogueCode === code);
  const kind = kb?.kind ?? (/biops/i.test(test) ? 'biopsy' : /urin|blood pressure/i.test(test) ? 'bedside' : /x-ray|scan|ultrasound|mri|ct\b|imaging/i.test(test) ? 'imaging' : /culture|swab|pcr|smear|afb/i.test(test) ? 'microbiology' : /ana|anca|antibod|complement|serolog|factor|ccp/i.test(test) ? 'serology' : 'blood');
  return DR.testWords[kind];
}

/** The patient leaflet section (also usable inside the plan's patient copy). */
export function consultPatientSections(r: DermRheumConsultRecord): ReviewDocSection[] {
  const c = r.consult;
  const names = [...new Set(c.differential.map(d => (d.kbId ? DR.names[d.kbId] : undefined)).filter(patientSafe))];
  const tests = [...new Set(c.investigations.map(x => testWord(x.catalogueCode, x.test)).filter(patientSafe))];
  const advice = [...new Set(c.patientCounselling.filter(patientSafe))];
  const warning = [...P.conditions.atypical_ulcer.warning, ...(c.differential.some(d => d.kbId === 'sjs_ten') ? P.conditions.sjs_ten.warning : []), P.copy.contactLine].filter(patientSafe);
  const out: ReviewDocSection[] = [{ kind: 'summary', title: DR.leafletTitle, body: `${DR.intro}${r.photosSent ? ` ${DR.photosNote}` : ''}` }];
  if (names.length) out.push({ kind: 'assessment', title: DR.possibleCauses, bullets: names });
  if (tests.length) out.push({ kind: 'plan', title: DR.tests, bullets: tests });
  if (advice.length) out.push({ kind: 'counselling', title: DR.advice, bullets: advice });
  out.push({ kind: 'warning_signs', title: DR.warning, bullets: warning });
  return out;
}

export function buildConsultPatientDocument(i: ConsultDocInput): ReviewDocument {
  const sections = consultPatientSections(i.record);
  for (const s of sections) { if (s.bullets) s.bullets = s.bullets.filter(patientSafe); if (s.body && !patientSafe(s.body)) s.body = undefined; }
  const safeName = (i.patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return {
    title: DR.leafletTitle, subtitle: 'Your skin review', hospitalName: i.hospitalName || 'AstroHEALTH',
    patient: { name: i.patient.name, hospitalNumber: i.patient.hospitalNumber, age: i.patient.age, gender: i.patient.gender },
    meta: { Date: format(i.date, 'd MMMM yyyy') }, sections, fileName: `skin-review-${safeName}-${ymd(i.date)}.pdf`, audience: 'patient',
    footer: P.copy.footer,
  };
}
