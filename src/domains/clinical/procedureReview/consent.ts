/**
 * Consent and counselling for a procedure review.
 *
 * Informed consent in the Montgomery sense (Montgomery v Lanarkshire [2015]
 * UKSC 11; GMC Decision making and consent 2020; RCS Consent: supported
 * decision-making 2018) is not a list of every complication of an operation:
 * it is the risks that matter to THIS patient, the reasonable alternatives
 * (including doing nothing), and a dialogue that is recorded. So the consent
 * draft is built from three layers:
 *
 *   1. buildSurgicalDocument — the existing consent + education document
 *      (extended, not forked) — with the procedure's education record
 *      (src/data/patientEducation, complications with frequencies);
 *   2. the module's ConsentSpec, for what that record lacks;
 *   3. RiskModifiers that fire on this patient's own answers and scores
 *      ("because you smoke, graft loss is more likely").
 *
 * The CounsellingRecord stores what was actually discussed, how the patient
 * showed understanding (teach-back), capacity, language and interpreter, the
 * decision, the consenting clinician (from the session) and the witness.
 * Capacity, language and interpreter are ASKED ONCE, in the assessment, and
 * copied here — never asked twice.
 */
import type { PDFPatientInfo } from '../../../utils/pdfUtils';
import { buildSurgicalDocument } from '../../surgery/utils/surgicalDocumentGenerator';
import { procedureEducationDatabase, type ProcedureEducation } from '../../../data/patientEducation';
import type {
  ConsentDraft, CounsellingPoint, CounsellingRecord, PatientRisk, PlanContext, RiskModifier,
} from './types';
import { hasAny, isOneOf, isYes, labelOf, numOf } from './core/answers';
import { anaemiaThreshold } from './engine';
import { ANAESTHETIC } from './core/perioperative';

// ── Patient-specific risk modifiers (core) ──────────────────────────────────

const smoker = (c: PlanContext) => isOneOf(c.answers, 'core.smoking', 'current', 'vaping', 'smokeless', 'ex_under_4w');

/** Risks raised by the patient's own factors, whatever the procedure. */
export const CORE_RISK_MODIFIERS: readonly RiskModifier[] = [
  { id: 'smoking', when: smoker,
    text: 'Because you smoke or use nicotine, wound infection, wound breakdown and loss of any skin graft or flap are more likely.',
    why: 'Smoking / nicotine (WHO 2020)' },
  { id: 'diabetes', when: c => isOneOf(c.answers, 'core.diabetes', 'diet', 'oral', 'insulin'),
    text: 'Diabetes increases the risk of wound infection and slow healing, more so when blood sugar is high.',
    why: 'Diabetes' },
  { id: 'radiotherapy', when: c => isYes(c.answers, 'core.radiotherapy_site'),
    text: 'Because this area has had radiotherapy, the wound is more likely to heal slowly or break down, and a graft is less likely to take.',
    why: 'Previous radiotherapy to the site' },
  { id: 'obesity', when: c => (c.patient.bmi ?? 0) >= 30,
    text: 'Your weight increases the risk of wound infection, wound breakdown, blood clots and anaesthetic problems.',
    why: 'BMI 30 or more' },
  { id: 'steroids', when: c => hasAny(c.answers, 'core.immune', 'steroids', 'chemo', 'immunosuppressant', 'transplant'),
    text: 'Steroids and medicines that lower immunity slow healing and increase the risk of infection.',
    why: 'Immunosuppression / steroids' },
  { id: 'malnutrition', when: c => (c.scores.must?.total ?? 0) >= 2,
    text: 'Poor nutrition slows healing and increases infection; improving it before and after surgery helps.',
    why: 'MUST 2 or more' },
  { id: 'anaemia', when: c => {
      const hb = numOf(c.answers, 'core.hb'), t = anaemiaThreshold(c.patient, c.answers);
      return hb != null && t != null && hb < t;
    },
    text: 'Because your blood count is low, you are more likely to need a blood transfusion.',
    why: 'Anaemia (WHO)' },
  { id: 'anticoagulant', when: c => (c.answers['core.anticoagulant'] as string[] | undefined)?.some(d => d !== 'none') ?? false,
    text: 'Blood-thinning medicine increases bleeding and bruising; it will be stopped and restarted as planned, and clots are possible while it is stopped.',
    why: 'Anticoagulant / antiplatelet' },
  { id: 'sickle', when: c => isOneOf(c.answers, 'core.haemoglobinopathy', 'ss_sc'),
    text: 'Sickle cell disease raises the risk of a sickle crisis, chest problems and blood clots around the time of surgery.',
    why: 'Sickle cell disease' },
  { id: 'perfusion', when: c => isOneOf(c.answers, 'core.perfusion', 'doubtful', 'poor') || isOneOf(c.answers, 'core.pvd', 'suspected', 'confirmed'),
    text: 'Reduced circulation to this area makes healing slower and the wound, graft or flap more likely to fail.',
    why: 'Impaired perfusion / arterial disease' },
  { id: 'keloid', when: c => /keloid/.test(`${String(c.answers['core.other_conditions'] ?? '')} ${c.patient.comorbidities.join(' ')}`.toLowerCase()),
    text: 'You have formed keloid scars before, so a thick or keloid scar is more likely.',
    why: 'Previous keloids' },
  { id: 'frailty', when: c => (c.scores.cfs?.total ?? 0) >= 5,
    text: 'Frailty raises the risk of confusion (delirium), falls and a slower recovery after surgery.',
    why: 'Clinical Frailty Scale 5 or more' },
  { id: 'osa', when: c => (c.scores.stopbang?.total ?? 0) >= 5,
    text: 'Possible sleep apnoea increases the risk of breathing problems after anaesthesia and strong painkillers.',
    why: 'STOP-BANG 5 or more' },
  { id: 'asa', when: c => (c.scores.asa?.total ?? 0) >= 3,
    text: 'Your other medical conditions increase the risks of the anaesthetic and of complications after surgery.',
    why: 'ASA 3 or more' },
  { id: 'alcohol', when: c => isOneOf(c.answers, 'core.alcohol', 'dependent'),
    text: 'Regular heavy drinking increases the risk of complications, including alcohol withdrawal in hospital.',
    why: 'Alcohol dependence' },
];

/** Topics every consent discussion covers (RCS 2018; GMC 2020). */
export const CORE_COUNSELLING_TOPICS: readonly string[] = [
  'The diagnosis and why treatment is recommended',
  'What the procedure involves (including any donor site, drains and dressings)',
  'The intended benefits and a realistic outcome',
  'Material risks, including those specific to this patient',
  'Reasonable alternatives, including no treatment',
  'The anaesthetic and its risks',
  'Scars and their long-term care',
  'Recovery: time in hospital, time off work, when to drive',
  'The cost of treatment and what is covered',
  'Clinical photography',
  'The right to take time, ask questions, seek a second opinion or change their mind',
];

// ── The draft ───────────────────────────────────────────────────────────────

const dedupeBy = <T>(xs: T[], key: (x: T) => string) => {
  const seen = new Set<string>();
  return xs.filter(x => { const k = key(x).trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
};

/** The procedure's education record, by its exact id — never a guessed or generic one. */
export function educationRecord(id: string | null | undefined): ProcedureEducation | undefined {
  return id ? procedureEducationDatabase.find(p => p.procedureId === id) : undefined;
}

/** Patient-specific risks that apply, core first, then the module's. */
export function patientRisks(ctx: PlanContext): PatientRisk[] {
  const mods = [...CORE_RISK_MODIFIERS, ...(ctx.module.consent?.modifiers ?? [])];
  return dedupeBy(mods.filter(m => m.when(ctx)).map(m => ({ text: m.text, why: m.why })), r => r.text);
}

/** Whether consent is taken at this phase for this module. */
export const consentApplies = (ctx: Pick<PlanContext, 'module' | 'phase'>) =>
  !!ctx.module.consent && (ctx.module.consent.phases ?? ['pre_op']).includes(ctx.phase);

/**
 * The consent draft for this patient, or null when the module takes no
 * consent at this phase.
 */
export function buildConsentDraft(
  ctx: PlanContext,
  counselling: CounsellingPoint[],
  doc: { patient: PDFPatientInfo; surgeonName?: string; hospitalName?: string; indication?: string },
): ConsentDraft | null {
  const spec = ctx.module.consent;
  if (!spec || !consentApplies(ctx)) return null;
  const edu = educationRecord(ctx.module.catalog.educationId);
  const known = new Set((edu?.specificComplications ?? []).map(c => c.name.toLowerCase()));
  const procedureRisks = spec.risks
    .filter(r => !known.has(r.name.toLowerCase()))
    .map(r => `${r.name}: ${r.description}${r.frequency ? ` (about ${r.frequency})` : ''}`);
  const risks = patientRisks(ctx);
  const planned = ctx.answers['core.anaesthesia_planned'];
  const anaesthesia = typeof planned === 'string'
    ? labelOf(ANAESTHETIC.fields.find(f => f.id === 'core.anaesthesia_planned'), planned).toLowerCase()
    : spec.anaesthesiaOptions[0];
  const procedureName = spec.procedureName ?? ctx.module.name;
  const bloodProducts = spec.bloodProducts ?? 'unlikely';
  const photography = spec.photography ?? true;
  const sections = buildSurgicalDocument({
    procedureName,
    indication: doc.indication,
    anaesthesiaType: anaesthesia,
    patient: doc.patient,
    surgeonName: doc.surgeonName,
    hospitalName: doc.hospitalName,
    procedureEducation: edu,
    intendedBenefits: spec.intendedBenefits,
    procedureRisks,
    patientSpecificRisks: risks.map(r => r.text),
    alternatives: spec.alternatives,
    riskOfNotTreating: spec.riskOfNotTreating,
    additionalProcedures: spec.additionalProcedures,
    consentMatters: { photography, bloodProducts, specimen: !!spec.specimen },
  });
  return {
    procedureName,
    sections,
    patientRisks: risks,
    anaesthesiaOptions: spec.anaesthesiaOptions,
    photography,
    bloodProducts,
    specimen: !!spec.specimen,
    topics: dedupeBy([...CORE_COUNSELLING_TOPICS, ...spec.counsellingTopics, ...counselling.map(c => `${c.topic}: ${c.text}`)], t => t),
  };
}

// ── The counselling record ──────────────────────────────────────────────────

export const emptyCounselling = (): CounsellingRecord => ({
  topicsDiscussed: [], questionsAsked: '', understanding: '', capacity: '', capacityNote: '',
  language: '', interpreterUsed: false, interpreterName: '', decision: '', decisionNote: '',
  anaesthesiaAgreed: '', photographyConsent: '', bloodConsent: '', leafletGiven: false, witnessName: '',
});

/**
 * The record as saved: capacity, language and interpreter copied from the
 * assessment (asked once), and the consenting clinician from the session.
 */
export function finaliseCounselling(
  record: CounsellingRecord,
  answers: PlanContext['answers'],
  clinician: { id: string; name?: string; role?: string },
  at: string,
): CounsellingRecord {
  const cap = answers['core.capacity'];
  const lang = answers['core.language'];
  return {
    ...record,
    capacity: cap === 'has_capacity' || cap === 'lacks_capacity' || cap === 'fluctuating' ? cap : record.capacity,
    language: typeof lang === 'string' ? lang : record.language,
    interpreterUsed: record.interpreterUsed || isYes(answers, 'core.interpreter_needed'),
    clinicianId: clinician.id,
    clinicianName: clinician.name,
    clinicianRole: clinician.role,
    recordedAt: at,
  };
}

/** What is still missing before the consent record is complete. Never blocks saving. */
export function counsellingGaps(record: CounsellingRecord, draft: ConsentDraft | null): string[] {
  const gaps: string[] = [];
  if (!record.decision) gaps.push('The patient\'s decision');
  if (!record.understanding) gaps.push('How understanding was checked (teach-back)');
  if (draft) {
    const missing = draft.topics.filter(t => !record.topicsDiscussed.includes(t));
    if (missing.length) gaps.push(`${missing.length} counselling topic(s) not ticked`);
    if (draft.photography && !record.photographyConsent) gaps.push('Photography consent');
    if (draft.bloodProducts !== 'unlikely' && !record.bloodConsent) gaps.push('Blood-product consent');
  }
  if (record.interpreterUsed && !record.interpreterName.trim()) gaps.push('Interpreter\'s name');
  if (record.decision === 'consents' && !record.witnessName.trim()) gaps.push('Witness name');
  return gaps;
}
