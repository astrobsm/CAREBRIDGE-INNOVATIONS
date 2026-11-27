/**
 * The comprehensive patient summary a review link shares, built from ONE
 * patient's records on this device.
 *
 * Pure: loadPatientRecords.ts reads the device database and hands the rows
 * in; this file only shapes them. The owner asked for everything, always, so
 * each section shows its key fields first and then every other non-empty
 * clinical field of the record (internal ids, sync markers and fees left out).
 * Tables with no section of their own still appear under "Other records".
 *
 * Photos are not embedded here: every image in the record is collected as a
 * candidate (with where it came from), newest first, and the share flow
 * compresses and uploads as many as fit (photoPolicy below).
 */

import { format } from 'date-fns';
import type {
  Admission, Appointment, ClinicalEncounter, DischargeSummary, Investigation, LabRequest, Patient,
  PostOperativeNote, Prescription, ScannedDocument, Surgery, TreatmentPlan, VitalSigns,
} from '../../types';
import type { MonitoredWound, WoundAssessment } from '../wounds/monitorTypes';
import { computeHealingAnalytics } from '../wounds/services/woundAnalytics';
import type { ClerkingPlanRecord } from '../clinical/clerkingPlan/records';
import { PLAN_SECTIONS } from '../clinical/clerkingPlan/types';
import { REVIEW_PHASES } from '../clinical/procedureReview/phases';
import { appointmentStart } from '../dashboard/today';
import { SNAPSHOT_VERSION, type ReviewSnapshot, type SnapField, type SnapItem, type SnapSection } from './snapshotTypes';

type Rec = Record<string, unknown>;

/** Everything recorded about one patient, as the loader read it. */
export interface PatientRecordBundle {
  patient: Patient;
  hospitalName?: string;
  /** user id -> display name, for "seen by" lines. */
  userNames?: Map<string, string>;
  encounters?: ClinicalEncounter[];
  vitals?: VitalSigns[];
  clinicalProblems?: Rec[];
  clerkingPlans?: ClerkingPlanRecord[];
  investigations?: Investigation[];
  labRequests?: LabRequest[];
  prescriptions?: Prescription[];
  surgeries?: Surgery[];
  postOpNotes?: PostOperativeNote[];
  surgicalOutcomes?: Rec[];
  postOpCarePlans?: Rec[];
  monitoredWounds?: MonitoredWound[];
  woundAssessments?: WoundAssessment[];
  admissions?: Admission[];
  dischargeSummaries?: DischargeSummary[];
  appointments?: Appointment[];
  treatmentPlans?: TreatmentPlan[];
  scannedDocuments?: ScannedDocument[];
  /** Every other patient table with rows: shown generically. */
  other?: { table: string; label: string; rows: Rec[] }[];
}

/** An image found in the record, before compression. */
export interface PhotoCandidate {
  dataUrl: string;
  caption?: string;
  /** Where it came from ("Wound assessment · Left leg"). */
  source: string;
  /** ISO, when known. */
  takenAt?: string;
  /** Lower sorts first: clinical photos before scanned paperwork. */
  priority: number;
}

/** How many photos a link carries, and how many bytes (after compression). */
export const PHOTO_POLICY = {
  maxPhotos: 20,
  maxTotalBytes: 6 * 1024 * 1024,
  maxEdgePx: 1024,
  jpegQuality: 0.8,
} as const;

/** Rows per generic table before "N older not shown". */
const MAX_ROWS_PER_TABLE = 50;
const MAX_VALUE_CHARS = 4000;

// ── Formatting ────────────────────────────────────────────────────────────

const isDateLike = (v: unknown): v is Date | string =>
  v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(v));

export function toIso(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const d = v instanceof Date ? v : typeof v === 'string' || typeof v === 'number' ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
}

export function fmtDate(v: unknown, withTime = true): string {
  const iso = toIso(v);
  if (!iso) return '';
  const d = new Date(iso);
  const dateOnly = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return format(d, withTime && !dateOnly && (d.getHours() || d.getMinutes()) ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy');
}

const words = (s?: unknown) => String(s ?? '').replace(/[_-]+/g, ' ').trim();
const cap = (s?: unknown) => { const w = words(s); return w ? w[0].toUpperCase() + w.slice(1) : ''; };

/** "historyOfPresentIllness" -> "History of present illness". */
export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().trim();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : key;
}

const clip = (s: string) => (s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS)}…` : s);
const isImageString = (s: string) => /^data:image\//i.test(s) || /^data:application\/pdf/i.test(s);
const looksBinary = (s: string) => s.length > 400 && /^[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 400));

/**
 * Keys never shown: identifiers and sync bookkeeping, credentials, money,
 * and the image payloads (photos travel separately).
 */
const SKIP_KEY = /^(id|localId|_.*|syncedAt|syncStatus|lastSyncedAt|deviceId|version|password.*|token.*|.*Hash|fee|fees|price|cost|totalAmount|amountPaid|billing.*|invoice.*|payment.*)$|[a-z]Ids?$|[a-z](Fee|Fees|Price|Cost)$|FeePercentage$/;
const SKIP_IMAGE_KEY = /^(imageData|imageDataUrl|annotatedImageDataUrl|photo|photos|clinicalPhotos|imageUrl|url|thumbnailUrl|pdfDataUrl|dataUrl|contourCm|contour)$/i;

/** One value as text, or '' when there is nothing worth showing. */
export function valueText(v: unknown, depth = 0): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '';
  if (v instanceof Date || isDateLike(v)) return fmtDate(v);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || isImageString(s) || looksBinary(s)) return '';
    return clip(s);
  }
  if (Array.isArray(v)) {
    const parts = v.map(x => valueText(x, depth + 1)).filter(Boolean);
    if (!parts.length) return '';
    const anyObject = v.some(x => x && typeof x === 'object' && !(x instanceof Date));
    return clip(parts.join(anyObject ? '\n' : ', '));
  }
  if (typeof v === 'object') {
    if (depth > 2) return '';
    const parts = Object.entries(v as Rec)
      .filter(([k]) => !SKIP_KEY.test(k) && !SKIP_IMAGE_KEY.test(k))
      .map(([k, x]) => { const t = valueText(x, depth + 1); return t ? `${humanize(k)}: ${t.replace(/\n/g, '; ')}` : ''; })
      .filter(Boolean);
    return clip(parts.join('; '));
  }
  return '';
}

/**
 * Every non-empty clinical field of a record: `first` keys in that order,
 * then the rest in their own order, minus `skip` and the always-skipped keys.
 */
export function recordFields(rec: unknown, opts: { first?: string[]; skip?: string[]; labels?: Record<string, string> } = {}): SnapField[] {
  if (!rec || typeof rec !== 'object') return [];
  const r = rec as Rec;
  const skip = new Set(['patientId', 'hospitalId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'patientName', 'hospitalNumber', 'hospitalName', ...(opts.skip ?? [])]);
  const keys = [...(opts.first ?? []).filter(k => k in r), ...Object.keys(r).filter(k => !(opts.first ?? []).includes(k))];
  const out: SnapField[] = [];
  for (const k of keys) {
    if (skip.has(k) || SKIP_KEY.test(k) || SKIP_IMAGE_KEY.test(k)) continue;
    const value = valueText(r[k]);
    if (value) out.push({ label: opts.labels?.[k] ?? humanize(k), value });
  }
  return out;
}

const byDateDesc = <T>(get: (x: T) => unknown) => (a: T, b: T) =>
  (new Date(toIso(get(b)) ?? 0).getTime()) - (new Date(toIso(get(a)) ?? 0).getTime());

const nameOf = (b: PatientRecordBundle, id?: unknown) => (typeof id === 'string' && id ? b.userNames?.get(id) ?? '' : '');

function ageYears(dob: unknown, now: Date): number | null {
  const iso = toIso(dob);
  if (!iso) return null;
  const d = new Date(iso);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export const patientDisplayName = (p: Pick<Patient, 'firstName' | 'lastName'> & { middleName?: string }) =>
  [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim() || 'Unnamed patient';

// ── Sections ──────────────────────────────────────────────────────────────

function patientBlock(b: PatientRecordBundle, now: Date): ReviewSnapshot['patient'] {
  const p = b.patient;
  const age = ageYears(p.dateOfBirth, now);
  const ageText = age === null ? 'Age not recorded' : `${age} y${p.dobEstimated ? ' (estimated)' : ''}`;
  const nok = p.nextOfKin;
  const fields: SnapField[] = [];
  const add = (label: string, v: unknown) => { const t = valueText(v); if (t) fields.push({ label, value: t }); };
  add('Hospital number', p.hospitalNumber);
  add('Date of birth', p.dateOfBirth ? `${fmtDate(p.dateOfBirth, false)}${p.dobEstimated ? ' (estimated)' : ''}` : '');
  add('Sex', cap(p.gender));
  add('Blood group', p.bloodGroup);
  add('Genotype', p.genotype);
  add('Marital status', cap(p.maritalStatus));
  add('Phone', p.phone);
  add('Alternate phone', p.alternatePhone);
  add('Email', p.email);
  add('Address', [p.address, p.city, p.state].map(x => (x || '').trim()).filter(Boolean).join(', '));
  add('Occupation', p.occupation);
  add('Religion', p.religion);
  add('Tribe', p.tribe);
  if (nok && (nok.name || nok.phone)) add('Next of kin', [nok.name, nok.relationship && `(${nok.relationship})`, nok.phone].filter(Boolean).join(' '));
  add('Care setting', cap(p.careType));
  add('Registered at', b.hospitalName || p.hospitalName);
  add('Ward', p.ward);
  if (p.dvtRiskAssessment) add('DVT risk (Caprini)', `${p.dvtRiskAssessment.score} — ${cap(p.dvtRiskAssessment.riskLevel)}${p.dvtRiskAssessment.prophylaxisRecommended ? `; ${p.dvtRiskAssessment.prophylaxisRecommended}` : ''}`);
  if (p.pressureSoreRiskAssessment) add('Pressure sore risk (Braden)', `${p.pressureSoreRiskAssessment.score} — ${cap(p.pressureSoreRiskAssessment.riskLevel)}`);
  add('Registered on', p.createdAt);
  return { name: patientDisplayName(p), summary: [ageText, cap(p.gender)].filter(Boolean).join(' · '), fields };
}

function alertsBlock(b: PatientRecordBundle): ReviewSnapshot['alerts'] {
  const p = b.patient;
  const uniq = (xs: string[]) => [...new Map(xs.map(x => x.trim()).filter(Boolean).map(x => [x.toLowerCase(), x])).values()];
  const conditions = [
    ...(p.comorbidities ?? []).map(c => [c.condition, c.severity && `(${c.severity})`, c.currentlyManaged === false ? '— not currently managed' : '', c.notes && `— ${c.notes}`].filter(Boolean).join(' ')),
    ...(p.chronicConditions ?? []),
  ];
  const latestRx = [...(b.prescriptions ?? [])].filter(r => r.status !== 'cancelled').sort(byDateDesc(r => r.prescribedAt))[0];
  const medicines = [
    ...(p.comorbidities ?? []).flatMap(c => (c.medications ?? []).map(m => `${m} (for ${c.condition})`)),
    ...(latestRx?.medications ?? []).map(m => `${medicationLine(m)} — prescribed ${fmtDate(latestRx.prescribedAt, false)}`),
  ];
  return { allergies: uniq(p.allergies ?? []), conditions: uniq(conditions), medicines: uniq(medicines) };
}

function medicationLine(m: Prescription['medications'][number] | Rec): string {
  const r = m as Rec;
  return [r.name || r.drug || r.genericName, r.dosage || r.dose, r.route, r.frequency, r.duration && `for ${r.duration}`, r.instructions && `— ${r.instructions}`]
    .map(x => (x === undefined || x === null ? '' : String(x).trim())).filter(Boolean).join(' ');
}

function problemsSection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  const seen = new Map<string, SnapItem>();
  const encs = [...(b.encounters ?? [])].filter(e => e.clerking?.status !== 'entered_in_error').sort(byDateDesc(e => e.createdAt));
  for (const e of encs) {
    for (const d of e.diagnosis ?? []) {
      const key = (d.description || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      const item: SnapItem = {
        title: d.description,
        status: cap(d.status),
        subtitle: [cap(d.type), d.code || d.icdCode, `recorded ${fmtDate(e.createdAt, false)}`].filter(Boolean).join(' · '),
        date: toIso(e.createdAt),
      };
      seen.set(key, item);
      items.push(item);
    }
  }
  for (const pr of [...(b.clinicalProblems ?? [])].sort(byDateDesc(x => x.updatedAt ?? x.createdAt))) {
    const label = String(pr.label ?? pr.title ?? pr.description ?? '').trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    const item: SnapItem = {
      title: label, status: cap(pr.status), date: toIso(pr.updatedAt ?? pr.createdAt),
      subtitle: pr.dangerous ? 'Flagged as dangerous — must not miss' : undefined,
      lines: Array.isArray(pr.reasons) ? (pr.reasons as unknown[]).map(String) : undefined,
    };
    seen.set(label.toLowerCase(), item);
    items.push(item);
  }
  for (const a of b.admissions ?? []) {
    const label = (a.admissionDiagnosis || '').trim();
    if (label && !seen.has(label.toLowerCase())) {
      seen.set(label.toLowerCase(), { title: label });
      items.push({ title: label, subtitle: `Admission diagnosis, ${fmtDate(a.admissionDate, false)}`, date: toIso(a.admissionDate) });
    }
  }
  for (const d of b.dischargeSummaries ?? []) {
    for (const label of d.finalDiagnosis ?? []) {
      if (label && !seen.has(label.trim().toLowerCase())) {
        seen.set(label.trim().toLowerCase(), { title: label });
        items.push({ title: label, subtitle: `Final diagnosis at discharge, ${fmtDate(d.dischargeDate, false)}`, date: toIso(d.dischargeDate) });
      }
    }
  }
  return { id: 'problems', title: 'Diagnoses and problem list', items };
}

const ENCOUNTER_FIRST = [
  'chiefComplaint', 'historyOfPresentIllness', 'intervalHistory', 'newSymptoms', 'treatmentResponse', 'complianceAssessment',
  'pastMedicalHistory', 'pastSurgicalHistory', 'medicationHistory', 'allergyHistory', 'familyHistory', 'socialHistory',
  'immunizationHistory', 'obstetricHistory', 'lmp', 'developmentalHistory', 'physicalExamination', 'diagnosis', 'treatmentPlan', 'notes',
];
const ENCOUNTER_LABELS: Record<string, string> = {
  historyOfPresentIllness: 'History of presenting illness', lmp: 'LMP', physicalExamination: 'Examination', diagnosis: 'Diagnoses', treatmentPlan: 'Plan',
};

function encounterTitle(e: ClinicalEncounter): string {
  if (e.procedureReview) {
    const phase = REVIEW_PHASES.find(p => p.id === e.procedureReview!.phase)?.label || cap(e.procedureReview.phase) || 'Review';
    return `${phase}${e.procedureReview.moduleId ? ` — ${cap(e.procedureReview.moduleId)}` : ''}`;
  }
  if (e.clerking) return e.clerking.kind === 'initial' ? 'Initial clerking' : 'Follow-up visit';
  return `${cap(e.type) || 'Clinic'} visit`;
}

function encountersSection(b: PatientRecordBundle): SnapSection {
  const encs = [...(b.encounters ?? [])].filter(e => e.clerking?.status !== 'entered_in_error').sort(byDateDesc(e => e.createdAt));
  const items = encs.map<SnapItem>(e => {
    const fields = recordFields({
      ...e,
      diagnosis: (e.diagnosis ?? []).map(d => [d.description, d.type && `(${d.type}`, d.status && `${d.status})`, d.code && `[${d.code}]`].filter(Boolean).join(' ')),
    }, {
      first: ENCOUNTER_FIRST, labels: ENCOUNTER_LABELS,
      skip: ['type', 'status', 'attendingClinician', 'startedAt', 'completedAt', 'isFirstEncounter', 'structuredHistory', 'clerking', 'procedureReview', 'previousEncounterId'],
    });
    const status = e.clerking?.status ?? e.procedureReview?.status ?? e.status;
    return {
      title: encounterTitle(e),
      date: toIso(e.createdAt),
      status: cap(status),
      subtitle: [nameOf(b, e.attendingClinician) && `Seen by ${nameOf(b, e.attendingClinician)}`, e.clinicalPhotos?.length ? `${e.clinicalPhotos.length} photo(s)` : ''].filter(Boolean).join(' · ') || undefined,
      fields,
    };
  });
  return { id: 'encounters', title: 'Clerkings and encounters', items };
}

function vitalsSection(b: PatientRecordBundle): SnapSection {
  const vs = [...(b.vitals ?? [])].sort(byDateDesc(v => v.recordedAt));
  const shown = vs.slice(0, 30);
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? String(Math.round(x * 10) / 10) : '');
  const items: SnapItem[] = shown.length ? [{
    title: `Last ${shown.length} recorded`,
    table: {
      columns: ['When', 'Temp °C', 'Pulse', 'BP', 'RR', 'SpO₂ %', 'Pain', 'Weight kg', 'Glucose', 'Notes'],
      rows: shown.map(v => [
        fmtDate(v.recordedAt), n(v.temperature), n(v.pulse ?? v.heartRate),
        v.bloodPressureSystolic ? `${n(v.bloodPressureSystolic)}/${n(v.bloodPressureDiastolic)}` : '',
        n(v.respiratoryRate), n(v.oxygenSaturation), n(v.painScore), n(v.weight), n(v.bloodGlucose), v.notes || '',
      ]),
    },
  }] : [];
  return { id: 'vitals', title: 'Vital signs', items, note: vs.length > shown.length ? `${vs.length - shown.length} older readings not shown.` : undefined };
}

const sectionLabel = (id: string) => PLAN_SECTIONS.find(s => s.id === id)?.label ?? cap(id);

function plansSection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  for (const p of [...(b.clerkingPlans ?? [])].sort(byDateDesc(x => x.updatedAt))) {
    const conditions = (p.conditions ?? []).map(c => c.label).join(', ') || 'Clerking plan';
    const approved = p.approvals?.[p.approvals.length - 1];
    if (p.status !== 'approved' || !approved) {
      items.push({ title: `Treatment plan: ${conditions}`, status: 'Draft — not approved', date: toIso(p.updatedAt), subtitle: 'Not yet approved; its lines are not shown.' });
      continue;
    }
    const lines: string[] = [];
    for (const s of PLAN_SECTIONS) {
      for (const l of approved.lines.filter(x => x.section === s.id)) {
        lines.push(`${s.label}: ${l.text}${l.urgency && l.urgency !== 'routine' ? ` [${l.urgency}]` : ''}${l.why ? ` — ${l.why}` : ''}`);
      }
    }
    for (const l of approved.lines.filter(x => !PLAN_SECTIONS.some(s => s.id === x.section))) lines.push(`${sectionLabel(l.section)}: ${l.text}`);
    const fields: SnapField[] = [];
    if (approved.hardRules?.length) fields.push({ label: 'Hard rules', value: approved.hardRules.join('\n') });
    const results = (p.results ?? []).filter(r => r.confirmed !== false);
    if (results.length) {
      fields.push({
        label: 'Results entered on the plan',
        value: results.map(r => `${cap(r.testId)}${r.analyte ? ` ${r.analyte}` : ''}: ${r.text ?? `${r.value ?? ''} ${r.unit ?? ''}`.trim()}${r.flag && r.flag !== 'normal' ? ` (${r.flag})` : ''} — ${fmtDate(r.at, false)}`).join('\n'),
      });
    }
    const interp = p.interpretation?.deterministic as unknown;
    const interpText = valueText(interp);
    if (interpText) fields.push({ label: 'Interpretation', value: interpText });
    items.push({
      title: `Treatment plan: ${conditions}`,
      status: `Approved v${approved.version}`,
      date: toIso(approved.at),
      subtitle: `Approved by ${approved.byName || 'clinician'}${approved.byRole ? ` (${cap(approved.byRole)})` : ''}`,
      lines, fields,
    });
  }
  return { id: 'plans', title: 'Approved treatment plans', items };
}

function dermRheumSection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  for (const p of b.clerkingPlans ?? []) {
    for (const c of p.dermRheum ?? []) {
      const k = c.consult;
      const lines: string[] = [];
      for (const d of k.differential ?? []) lines.push(`Differential: ${d.diagnosis} (${d.likelihood}) — ${d.reasoning}`);
      for (const m of k.mustNotMiss ?? []) lines.push(`Must not miss: ${m.diagnosis} — ${m.why}; exclude by ${m.howToExclude}`);
      for (const i of k.investigations ?? []) lines.push(`Investigation: ${i.test} [${i.urgency}]${i.biopsySite ? ` — biopsy site ${i.biopsySite}` : ''} — ${i.why}`);
      for (const m of k.management?.immediate ?? []) lines.push(`Immediate: ${m}`);
      for (const m of k.management?.definitive ?? []) lines.push(`Definitive: ${m}`);
      for (const m of k.doNot ?? []) lines.push(`Do not: ${m}`);
      for (const r of k.referrals ?? []) lines.push(`Refer: ${r.to} [${r.urgency}] — ${r.why}`);
      for (const o of k.photoObservations ?? []) lines.push(`Photo: ${o}`);
      const fields: SnapField[] = [];
      if (c.description) fields.push({ label: 'Lesion description', value: c.description });
      if (c.checks?.length) fields.push({ label: 'Hard-rule checks', value: valueText(c.checks) });
      if (k.wouldChangeConfidence?.length) fields.push({ label: 'Would change confidence', value: k.wouldChangeConfidence.join(', ') });
      items.push({
        title: k.summary || 'Dermatology & rheumatology review',
        date: toIso(c.at),
        status: `Urgency: ${cap(k.urgency)} · confidence ${k.confidence}`,
        subtitle: [c.byName && `By ${c.byName}`, `Plan: ${(p.conditions ?? []).map(x => x.label).join(', ') || 'clerking plan'}`].filter(Boolean).join(' · '),
        lines, fields,
      });
    }
  }
  items.sort((a, b2) => (b2.date ?? '').localeCompare(a.date ?? ''));
  return { id: 'derm_rheum', title: 'Dermatology & rheumatology consults', items };
}

function resultLine(r: Rec): string {
  const name = r.parameterName ?? r.parameter ?? r.name ?? 'Result';
  const flag = r.flag && r.flag !== 'normal' ? ` [${String(r.flag).toUpperCase()}]` : r.isAbnormal ? ' [abnormal]' : '';
  return `${name}: ${valueText(r.value)}${r.unit ? ` ${r.unit}` : ''}${r.referenceRange ? ` (ref ${r.referenceRange})` : ''}${flag}${r.interpretation ? ` — ${r.interpretation}` : ''}`;
}

function investigationsSection(b: PatientRecordBundle): SnapSection {
  const inv = [...(b.investigations ?? [])].sort(byDateDesc(i => i.completedAt ?? i.requestedAt));
  const items: SnapItem[] = inv.map(i => ({
    title: i.typeName || i.name || cap(String(i.type || 'Investigation')),
    date: toIso(i.completedAt ?? i.requestedAt),
    status: cap(i.status),
    subtitle: [cap(i.category), i.priority && i.priority !== 'routine' ? i.priority.toUpperCase() : '', (i.requestedByName || nameOf(b, i.requestedBy)) && `Requested by ${i.requestedByName || nameOf(b, i.requestedBy)}`].filter(Boolean).join(' · ') || undefined,
    lines: (i.results ?? []).map(r => resultLine(r as unknown as Rec)),
    fields: recordFields(i, {
      first: ['interpretation', 'clinicalDetails', 'clinicalInfo', 'description', 'notes', 'requestedAt', 'completedAt'],
      skip: ['type', 'typeName', 'name', 'category', 'status', 'priority', 'results', 'requestedBy', 'requestedByName', 'attachments'],
    }),
  }));
  const labs = [...(b.labRequests ?? [])].sort(byDateDesc(l => l.completedAt ?? l.requestedAt));
  for (const l of labs) {
    items.push({
      title: `Lab request: ${(l.tests ?? []).map(t => t.name).filter(Boolean).join(', ') || 'tests'}`,
      date: toIso(l.completedAt ?? l.requestedAt),
      status: cap(l.status),
      subtitle: [l.priority && l.priority !== 'routine' ? l.priority.toUpperCase() : '', nameOf(b, l.requestedBy) && `Requested by ${nameOf(b, l.requestedBy)}`].filter(Boolean).join(' · ') || undefined,
      lines: (l.tests ?? []).map(t => `${t.name}${t.specimen ? ` (${t.specimen})` : ''}: ${t.result ? `${t.result}${t.unit ? ` ${t.unit}` : ''}${t.referenceRange ? ` (ref ${t.referenceRange})` : ''}${t.isAbnormal ? ' [abnormal]' : ''}` : 'no result yet'}${t.notes ? ` — ${t.notes}` : ''}`),
      fields: recordFields(l, { skip: ['tests', 'status', 'priority', 'requestedBy', 'encounterId'] }),
    });
  }
  items.sort((a, c) => (c.date ?? '').localeCompare(a.date ?? ''));
  return { id: 'investigations', title: 'Investigations and results', items };
}

function prescriptionsSection(b: PatientRecordBundle): SnapSection {
  const rx = [...(b.prescriptions ?? [])].sort(byDateDesc(r => r.prescribedAt));
  return {
    id: 'prescriptions', title: 'Prescriptions',
    items: rx.map(r => ({
      title: `Prescription — ${(r.medications ?? []).length} medicine(s)`,
      date: toIso(r.prescribedAt),
      status: cap(r.status),
      subtitle: nameOf(b, r.prescribedBy) ? `Prescribed by ${nameOf(b, r.prescribedBy)}` : undefined,
      lines: (r.medications ?? []).map(m => medicationLine(m)),
      fields: recordFields(r, { skip: ['medications', 'status', 'prescribedAt', 'prescribedBy', 'dispensedBy', 'encounterId'] }),
    })),
  };
}

const SURGERY_FIRST = [
  'procedureName', 'type', 'category', 'scheduledDate', 'actualStartTime', 'actualEndTime', 'surgeon', 'assistant', 'anaesthetist',
  'anaesthesiaType', 'preOperativeAssessment', 'operativeNotes', 'complications', 'complicationEntries', 'bloodLoss', 'specimenSent',
  'specimenType', 'woundClass', 'implantPlaced', 'postOperativeInstructions', 'intraOpRecord', 'dischargedAt', 'dischargeType',
];

function surgerySection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  const notes = b.postOpNotes ?? [];
  const outcomes = b.surgicalOutcomes ?? [];
  const care = b.postOpCarePlans ?? [];
  for (const s of [...(b.surgeries ?? [])].sort(byDateDesc(x => x.actualStartTime ?? x.scheduledDate))) {
    items.push({
      title: s.procedureName || 'Operation',
      date: toIso(s.actualStartTime ?? s.scheduledDate),
      status: cap(s.status),
      subtitle: [cap(s.type), cap(s.category), s.surgeon && `Surgeon ${s.surgeon}`].filter(Boolean).join(' · ') || undefined,
      fields: recordFields(s, {
        first: SURGERY_FIRST,
        skip: ['procedureName', 'status', 'surgeon', 'outstandingItems', 'patientPack', 'bookingApproval', 'followUpPlan', 'whoChecklist', 'readinessOverride', 'redFlagReview', 'dischargeSummaryId', 'assistantFeePercentage'],
        labels: { preOperativeAssessment: 'Pre-operative assessment', intraOpRecord: 'Intra-operative record', complicationEntries: 'Complications (Clavien–Dindo)', bloodLoss: 'Blood loss (mL)' },
      }).concat(s.whoChecklist ? [{ label: 'WHO safety checklist', value: valueText(s.whoChecklist) || 'Recorded' }] : []),
    });
    for (const n of notes.filter(x => x.surgeryId === s.id)) items.push(postOpNoteItem(n));
    for (const o of outcomes.filter(x => x.surgeryId === s.id)) items.push(outcomeItem(o));
    for (const c of care.filter(x => x.surgeryId === s.id)) items.push({ title: `Post-op care plan: ${s.procedureName || 'operation'}`, date: toIso(c.createdAt), status: cap(c.status), fields: recordFields(c, { skip: ['surgeryId', 'status'] }) });
  }
  const known = new Set((b.surgeries ?? []).map(s => s.id));
  for (const n of notes.filter(x => !known.has(x.surgeryId))) items.push(postOpNoteItem(n));
  for (const o of outcomes.filter(x => !known.has(String(x.surgeryId)))) items.push(outcomeItem(o));
  for (const c of care.filter(x => !known.has(String(x.surgeryId)))) items.push({ title: 'Post-op care plan', date: toIso(c.createdAt), status: cap(c.status), fields: recordFields(c, { skip: ['surgeryId', 'status'] }) });
  return { id: 'surgery', title: 'Surgery, operation notes and outcomes', items };
}

function postOpNoteItem(n: PostOperativeNote): SnapItem {
  return {
    title: `Operation note: ${n.procedureName || 'operation'}`,
    date: toIso(n.procedureDate),
    status: cap((n as unknown as Rec).status),
    fields: recordFields(n, {
      first: ['preOperativeDiagnosis', 'postOperativeDiagnosis', 'indication', 'procedurePerformed', 'findings', 'complications', 'bloodLoss', 'bloodTransfused', 'duration', 'surgeon', 'assistant', 'anaesthetist', 'anaesthesiaType', 'specimens', 'medications', 'monitoringInstructions', 'dietInstructions', 'drainCare'],
      skip: ['procedureName', 'procedureDate', 'surgeryId', 'status', 'labRequests'],
      labels: { bloodLoss: 'Blood loss (mL)', duration: 'Duration (min)' },
    }),
  };
}

function outcomeItem(o: Rec): SnapItem {
  return {
    title: `Outcome: ${String(o.procedureName ?? 'operation')}`,
    date: toIso(o.recordedAt ?? o.operationDate),
    subtitle: o.recordedByName ? `Recorded by ${String(o.recordedByName)}` : undefined,
    fields: recordFields(o, {
      first: ['windowDays', 'ssi', 'ssiDetectedOn', 'complications', 'returnToTheatre', 'readmission', 'vte', 'death', 'notes'],
      skip: ['procedureName', 'surgeryId', 'recordedBy', 'recordedByName', 'scarCaseId'],
      labels: { ssi: 'Surgical site infection (CDC)', windowDays: 'Surveillance window (days)', vte: 'VTE' },
    }),
  };
}

const num = (x: unknown, d = 1) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '');

function woundsSection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  const all = b.woundAssessments ?? [];
  const wounds = [...(b.monitoredWounds ?? [])].sort(byDateDesc(w => w.updatedAt));
  const ids = new Set(wounds.map(w => w.id));
  const orphanIds = [...new Set(all.filter(a => !ids.has(a.woundId)).map(a => a.woundId))];
  for (const w of [...wounds, ...orphanIds.map(id => ({ id, label: 'Wound', patientId: b.patient.id, createdAt: '', updatedAt: '' } as MonitoredWound))]) {
    const series = all.filter(a => a.woundId === w.id).sort((a, c) => (toIso(a.assessedAt ?? a.createdAt) ?? '').localeCompare(toIso(c.assessedAt ?? c.createdAt) ?? ''));
    const fields = recordFields(w, { first: ['woundType', 'etiology', 'anatomicalLocation', 'bodySide', 'stage', 'cause', 'dateOfInjury', 'dateFirstSeen', 'status'], skip: ['label', 'sourceWoundId'] });
    const areas = series.filter(a => typeof a.areaCm2 === 'number');
    if (areas.length >= 2) {
      const an = computeHealingAnalytics(series);
      const first = areas[0].areaCm2 as number;
      const last = areas[areas.length - 1].areaCm2 as number;
      fields.unshift({
        label: 'Trend',
        value: `Area ${first.toFixed(1)} → ${last.toFixed(1)} cm² (${an.percentAreaReduction >= 0 ? '−' : '+'}${Math.abs(an.percentAreaReduction).toFixed(0)}%) over ${an.assessmentCount} assessments; ${cap(an.status)}; ${an.velocityCm2PerWeek.toFixed(2)} cm²/week${an.projectedDaysToClosure ? `; projected closure in ~${Math.round(an.projectedDaysToClosure)} days` : ''}${an.hasUnreliableScale ? '; some measurements lacked a reliable scale' : ''}`,
      });
    }
    const rows = [...series].reverse().map(a => [
      fmtDate(a.assessedAt ?? a.createdAt),
      [num(a.lengthCm), num(a.widthCm), num(a.depthCm)].some(Boolean) ? `${num(a.lengthCm) || '–'} × ${num(a.widthCm) || '–'} × ${num(a.depthCm) || '–'}` : '',
      num(a.areaCm2),
      [a.granulationPct != null && `G ${a.granulationPct}%`, a.sloughPct != null && `S ${a.sloughPct}%`, a.necroticPct != null && `N ${a.necroticPct}%`, a.epithelialPct != null && `E ${a.epithelialPct}%`].filter(Boolean).join(' ') || (a.tissueTypes ?? []).join(', '),
      [a.exudateAmount, a.exudateType].filter(Boolean).join(' '),
      a.painLevel != null ? String(a.painLevel) : '',
      [a.odor ? 'malodour' : '', ...(a.infectionSigns ?? [])].filter(Boolean).join(', '),
      [a.dressingType, a.dressingFrequency].filter(Boolean).join(', '),
      [a.healingStage, a.periWoundCondition && `peri-wound: ${a.periWoundCondition}`, a.clinicalDescription].filter(Boolean).join('; '),
    ]);
    items.push({
      title: [w.label || cap(w.woundType) || 'Wound', w.anatomicalLocation].filter(Boolean).join(' — '),
      date: toIso(series[series.length - 1]?.assessedAt ?? w.updatedAt),
      status: cap(w.status),
      subtitle: `${series.length} assessment(s)`,
      fields,
      table: rows.length ? { columns: ['When', 'L × W × D cm', 'Area cm²', 'Tissue', 'Exudate', 'Pain', 'Infection signs', 'Dressing', 'Notes'], rows } : undefined,
    });
  }
  return { id: 'wounds', title: 'Wounds, measurements and trend', items };
}

function admissionsSection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  for (const a of [...(b.admissions ?? [])].sort(byDateDesc(x => x.admissionDate))) {
    items.push({
      title: `Admission${a.wardName ? ` — ${a.wardName}` : ''}${a.bedNumber ? `, bed ${a.bedNumber}` : ''}`,
      date: toIso(a.admissionDate),
      status: cap(a.status),
      subtitle: [a.admissionNumber, a.primaryManagingConsultantName && `Consultant ${a.primaryManagingConsultantName}`].filter(Boolean).join(' · ') || undefined,
      fields: recordFields(a, {
        first: ['admissionDiagnosis', 'chiefComplaint', 'indicationForAdmission', 'severity', 'provisionalDiagnosis', 'comorbidities', 'allergies', 'admittedFrom', 'admissionTime', 'dischargeDate'],
        skip: ['wardName', 'bedNumber', 'status', 'admissionNumber', 'admittedBy', 'primaryDoctor', 'primaryNurse', 'primaryManagingConsultant', 'primaryManagingConsultantName', 'consultants', 'treatmentPlanId', 'encounterId'],
      }),
    });
  }
  for (const d of [...(b.dischargeSummaries ?? [])].sort(byDateDesc(x => x.dischargeDate))) {
    items.push({
      title: 'Discharge summary',
      date: toIso(d.dischargeDate),
      status: cap(d.status),
      subtitle: [d.attendingPhysicianName && `Attending ${d.attendingPhysicianName}`, d.preparedByName && `Prepared by ${d.preparedByName}`].filter(Boolean).join(' · ') || undefined,
      lines: (d.dischargeMedications ?? []).map(m => `Discharge medicine: ${medicationLine(m as unknown as Rec)}`),
      fields: recordFields(d, {
        first: ['admissionDate', 'admittingDiagnosis', 'finalDiagnosis', 'comorbidities', 'hospitalCourse', 'proceduresPerformed', 'consultations', 'conditionAtDischarge', 'dischargeDisposition', 'medicationsDiscontinued', 'dietaryInstructions', 'activityRestrictions', 'woundCareInstructions', 'warningSignsToWatch', 'followUpAppointments', 'pendingTests', 'pendingReferrals'],
        skip: ['dischargeDate', 'status', 'dischargeMedications', 'preparedBy', 'preparedByName', 'attendingPhysician', 'attendingPhysicianName', 'followUpTracking', 'encounterId', 'emergencyContact', 'clinicContact'],
      }),
    });
  }
  return { id: 'admissions', title: 'Admissions and discharge summaries', items };
}

function appointmentsSection(b: PatientRecordBundle, now: Date): SnapSection {
  const upcoming = (b.appointments ?? [])
    .map(a => ({ a, at: appointmentStart(a) }))
    .filter(({ a, at }) => !!at && at.getTime() >= now.getTime() - 3_600_000 && !['cancelled', 'rescheduled', 'completed', 'no_show'].includes(a.status))
    .sort((x, y) => x.at!.getTime() - y.at!.getTime());
  return {
    id: 'appointments', title: 'Upcoming appointments',
    items: upcoming.map(({ a, at }) => ({
      title: `${cap(a.type) || 'Clinic'} appointment`,
      date: at!.toISOString(),
      status: cap(a.status),
      subtitle: [a.clinicianName && `With ${a.clinicianName}`, valueText(a.location)].filter(Boolean).join(' · ') || undefined,
      fields: recordFields(a, { first: ['reasonForVisit', 'notes', 'duration', 'priority'], skip: ['appointmentDate', 'appointmentTime', 'type', 'status', 'location', 'clinicianName', 'patientWhatsApp', 'patientPhone', 'patientEmail', 'reminderEnabled', 'reminderSchedule', 'bookedBy', 'bookedAt', 'lastModifiedBy', 'appointmentNumber'] }),
    })),
  };
}

function treatmentPlansSection(b: PatientRecordBundle): SnapSection {
  return {
    id: 'treatment_plans', title: 'Other treatment plans',
    items: [...(b.treatmentPlans ?? [])].sort(byDateDesc(t => t.startDate ?? (t as unknown as Rec).createdAt)).map(t => ({
      title: t.title || 'Treatment plan',
      date: toIso(t.startDate ?? (t as unknown as Rec).createdAt),
      status: cap(t.status),
      fields: recordFields(t, { skip: ['title', 'status'] }),
    })),
  };
}

function documentsSection(b: PatientRecordBundle): SnapSection {
  return {
    id: 'documents', title: 'Scanned documents',
    items: [...(b.scannedDocuments ?? [])].sort(byDateDesc(d => d.createdAt)).map(d => ({
      title: d.title || cap(d.documentType) || 'Document',
      date: toIso(d.createdAt),
      subtitle: [cap(d.documentType), `${(d.pages ?? []).length} page(s)`, d.createdByName && `Scanned by ${d.createdByName}`].filter(Boolean).join(' · '),
      fields: [
        ...(d.extractedFields ?? []).map(f => ({ label: humanize(String((f as unknown as Rec).label ?? (f as unknown as Rec).key ?? 'Field')), value: valueText((f as unknown as Rec).value) })).filter(f => f.value),
        ...(valueText(d.fullText) ? [{ label: 'Text (OCR)', value: valueText(d.fullText) }] : []),
      ],
    })),
  };
}

function otherSection(b: PatientRecordBundle): SnapSection {
  const items: SnapItem[] = [];
  let hidden = 0;
  for (const t of b.other ?? []) {
    const rows = [...t.rows].sort(byDateDesc(r => r.updatedAt ?? r.createdAt ?? r.recordedAt ?? r.assessedAt ?? r.date));
    hidden += Math.max(0, rows.length - MAX_ROWS_PER_TABLE);
    for (const r of rows.slice(0, MAX_ROWS_PER_TABLE)) {
      const fields = recordFields(r);
      if (!fields.length) continue;
      items.push({
        title: t.label,
        date: toIso(r.updatedAt ?? r.createdAt ?? r.recordedAt ?? r.assessedAt ?? r.date),
        status: r.status ? cap(r.status) : undefined,
        fields,
      });
    }
  }
  return { id: 'other', title: 'Other records', items, note: hidden ? `${hidden} older entries not shown.` : undefined };
}

// ── Photos ────────────────────────────────────────────────────────────────

const CAPTION_KEYS = ['caption', 'description', 'bodyLocation', 'label', 'title', 'anatomicalLocation', 'procedureName'];
const DATE_KEYS = ['takenAt', 'capturedAt', 'assessedAt', 'recordedAt', 'createdAt', 'date'];

/**
 * Every image in a record: walks objects and arrays for data:image/ strings,
 * carrying the nearest caption and date found on the way down.
 */
export function harvestImages(rec: unknown, source: string, priority: number, out: PhotoCandidate[], ctx: { caption?: string; takenAt?: string } = {}, depth = 0): void {
  if (!rec || depth > 6) return;
  if (typeof rec === 'string') {
    if (/^data:image\/(jpe?g|png|webp|gif|bmp|heic|heif)/i.test(rec)) out.push({ dataUrl: rec, caption: ctx.caption, source, takenAt: ctx.takenAt, priority });
    return;
  }
  if (Array.isArray(rec)) { for (const x of rec) harvestImages(x, source, priority, out, ctx, depth + 1); return; }
  if (typeof rec !== 'object' || rec instanceof Date) return;
  const r = rec as Rec;
  const caption = CAPTION_KEYS.map(k => r[k]).find(v => typeof v === 'string' && v.trim() && !isImageString(v)) as string | undefined;
  const taken = DATE_KEYS.map(k => toIso(r[k])).find(Boolean);
  const next = { caption: caption ?? ctx.caption, takenAt: taken ?? ctx.takenAt };
  for (const v of Object.values(r)) harvestImages(v, source, priority, out, next, depth + 1);
}

function photoCandidates(b: PatientRecordBundle): PhotoCandidate[] {
  const out: PhotoCandidate[] = [];
  for (const e of b.encounters ?? []) if (e.clerking?.status !== 'entered_in_error') harvestImages(e, `${encounterTitle(e)}, ${fmtDate(e.createdAt, false)}`, 0, out);
  const woundName = new Map((b.monitoredWounds ?? []).map(w => [w.id, [w.label || cap(w.woundType) || 'Wound', w.anatomicalLocation].filter(Boolean).join(' — ')]));
  for (const a of b.woundAssessments ?? []) harvestImages(a, `Wound assessment · ${woundName.get(a.woundId) ?? 'wound'}`, 0, out);
  for (const s of b.surgeries ?? []) harvestImages(s, `Surgery · ${s.procedureName || 'operation'}`, 0, out);
  for (const n of b.postOpNotes ?? []) harvestImages(n, `Operation note · ${n.procedureName || 'operation'}`, 0, out);
  for (const p of b.clerkingPlans ?? []) harvestImages(p, 'Treatment plan', 0, out);
  for (const a of b.admissions ?? []) harvestImages(a, 'Admission', 0, out);
  for (const t of b.treatmentPlans ?? []) harvestImages(t, `Treatment plan · ${t.title || ''}`.trim(), 0, out);
  for (const t of b.other ?? []) for (const r of t.rows) harvestImages(r, t.label, 0, out);
  for (const d of b.scannedDocuments ?? []) harvestImages(d.pages ?? [], `Scanned document · ${d.title || cap(d.documentType)}`, 1, out, { caption: d.title, takenAt: toIso(d.createdAt) });
  // The same image saved in two places travels once.
  const seen = new Set<string>();
  return out.filter(p => { const k = `${p.dataUrl.length}:${p.dataUrl.slice(-120)}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, c) => a.priority - c.priority || (c.takenAt ?? '').localeCompare(a.takenAt ?? ''));
}

/** Words for the snapshot when not every photo fits. */
export function photoNote(included: number, total: number, reason?: 'count' | 'size' | 'failed'): string | undefined {
  if (total === 0) return undefined;
  if (included >= total) return undefined;
  const left = total - included;
  const why = reason === 'size'
    ? `the size limit (${Math.round(PHOTO_POLICY.maxTotalBytes / 1024 / 1024)} MB)`
    : reason === 'failed' ? 'they could not be read on the sharing device'
      : `the limit of the ${PHOTO_POLICY.maxPhotos} most recent`;
  return `${left} older photo${left === 1 ? ' was' : 's were'} left out because of ${why}. Ask the sharing clinician if you need ${left === 1 ? 'it' : 'them'}.`;
}

// ── The whole snapshot ────────────────────────────────────────────────────

export function buildReviewSnapshot(b: PatientRecordBundle, now: Date = new Date()): { snapshot: ReviewSnapshot; photos: PhotoCandidate[] } {
  const sections = [
    problemsSection(b),
    encountersSection(b),
    plansSection(b),
    dermRheumSection(b),
    investigationsSection(b),
    prescriptionsSection(b),
    surgerySection(b),
    woundsSection(b),
    admissionsSection(b),
    appointmentsSection(b, now),
    vitalsSection(b),
    treatmentPlansSection(b),
    documentsSection(b),
    otherSection(b),
  ];
  const photos = photoCandidates(b);
  return {
    snapshot: {
      version: SNAPSHOT_VERSION,
      snapshotAt: now.toISOString(),
      patient: patientBlock(b, now),
      alerts: alertsBlock(b),
      sections,
      photos: { included: 0, total: photos.length, omitted: photos.length },
    },
    photos,
  };
}
