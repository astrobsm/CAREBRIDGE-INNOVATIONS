/**
 * One patient's whole story, newest first, from every table that records
 * something about them. Pure: the hub reads the tables and passes them in.
 * Every item carries the href of the existing page that shows it.
 */

import type {
  Admission, Appointment, ClinicalEncounter, DischargeSummary, Investigation, LabRequest,
  PatientEducationRecord, PostOperativeNote, Prescription, ScannedDocument, Surgery, TreatmentPlan,
} from '../../types';
import type { WoundAssessment } from '../wounds/monitorTypes';
import { toValidDate } from '../../utils/safeDate';
import { appointmentStart } from '../dashboard/today';
import { REVIEW_PHASES } from '../clinical/procedureReview/phases';
import type { ClerkingPlanRecord } from '../clinical/clerkingPlan/records';

export type TimelineKind =
  | 'visit' | 'clerking' | 'procedure_review' | 'surgery' | 'post_op_note' | 'investigation'
  | 'lab_request' | 'wound_assessment' | 'treatment_plan' | 'appointment' | 'admission'
  | 'discharge' | 'prescription' | 'document' | 'education';

/** Which hub tab each kind belongs to (besides Timeline, which shows all). */
export type HubTab = 'timeline' | 'visits' | 'surgery' | 'wounds' | 'results' | 'plans' | 'appointments' | 'documents';

export const TAB_OF_KIND: Record<TimelineKind, Exclude<HubTab, 'timeline'>> = {
  visit: 'visits', clerking: 'visits', procedure_review: 'visits', prescription: 'visits',
  admission: 'visits', discharge: 'visits',
  surgery: 'surgery', post_op_note: 'surgery',
  wound_assessment: 'wounds',
  investigation: 'results', lab_request: 'results',
  treatment_plan: 'plans',
  appointment: 'appointments',
  document: 'documents', education: 'documents',
};

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  at: Date;
  title: string;
  detail?: string;
  status?: string;
  href: string;
  /** Scheduled in the future (appointments, operations). */
  upcoming?: boolean;
}

export interface PatientRecords {
  patientId: string;
  encounters?: ClinicalEncounter[];
  surgeries?: Surgery[];
  postOpNotes?: PostOperativeNote[];
  investigations?: Investigation[];
  labRequests?: LabRequest[];
  woundAssessments?: WoundAssessment[];
  treatmentPlans?: TreatmentPlan[];
  /** Clerking treatment plans (stage 5). */
  clerkingPlans?: ClerkingPlanRecord[];
  appointments?: Appointment[];
  admissions?: Admission[];
  dischargeSummaries?: DischargeSummary[];
  prescriptions?: Prescription[];
  scannedDocuments?: ScannedDocument[];
  educationRecords?: PatientEducationRecord[];
}

type DateLike = Date | string | number | null | undefined;
const words = (s?: string) => (s || '').replace(/[_-]+/g, ' ').trim();
const cap = (s?: string) => { const w = words(s); return w ? w[0].toUpperCase() + w.slice(1) : ''; };
const first = (...vals: DateLike[]): Date | null => {
  for (const v of vals) { const d = toValidDate(v); if (d) return d; }
  return null;
};
const join = (...parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join(' · ') || undefined;

/** Where the patient hub itself shows a tab. */
export const hubHref = (patientId: string, tab: HubTab) => `/patients/${encodeURIComponent(patientId)}?tab=${tab}`;

export function buildPatientTimeline(r: PatientRecords, now: Date = new Date()): TimelineItem[] {
  const pid = r.patientId;
  const out: TimelineItem[] = [];
  const push = (item: Omit<TimelineItem, 'at'> & { at: Date | null }) => {
    if (item.at) out.push(item as TimelineItem);
  };

  for (const e of r.encounters ?? []) {
    if (e.procedureReview) {
      const pr = e.procedureReview;
      const phase = REVIEW_PHASES.find(p => p.id === pr.phase)?.label || cap(pr.phase) || 'Review';
      push({
        id: e.id, kind: 'procedure_review', at: first(e.createdAt),
        title: phase,
        detail: join(cap(pr.moduleId), e.chiefComplaint), status: pr.status || e.status,
        href: `/patients/${pid}/procedure-review?encounter=${encodeURIComponent(e.id)}`,
      });
    } else if (e.clerking) {
      const c = e.clerking;
      if (c.status === 'entered_in_error') continue;
      push({
        id: e.id, kind: 'clerking', at: first(e.createdAt),
        title: c.kind === 'initial' ? 'Initial clerking' : 'Follow-up visit',
        detail: e.chiefComplaint || undefined, status: c.status,
        href: hubHref(pid, 'visits'),
      });
    } else {
      push({
        id: e.id, kind: 'visit', at: first(e.createdAt),
        title: `${cap(e.type) || 'Clinic'} visit`,
        detail: e.chiefComplaint || undefined, status: e.status,
        href: `/patients/${pid}/clinical-summary`,
      });
    }
  }

  for (const s of r.surgeries ?? []) {
    const at = first(s.actualStartTime, s.scheduledDate, (s as { createdAt?: DateLike }).createdAt);
    push({
      id: s.id, kind: 'surgery', at,
      title: s.procedureName || 'Operation',
      detail: join(cap(s.type), cap(s.category), s.surgeon && `Surgeon ${s.surgeon}`), status: s.status,
      href: `/surgery/workflow/${pid}/${s.id}`,
      upcoming: !!at && at > now && s.status !== 'completed' && s.status !== 'cancelled',
    });
  }

  for (const n of r.postOpNotes ?? []) {
    push({
      id: n.id, kind: 'post_op_note', at: first(n.procedureDate, (n as { createdAt?: DateLike }).createdAt),
      title: `Post-op note: ${n.procedureName || 'operation'}`,
      status: (n as { status?: string }).status,
      href: `/surgery/post-op-note/${n.surgeryId}`,
    });
  }

  for (const i of r.investigations ?? []) {
    const done = i.status === 'completed';
    push({
      id: i.id, kind: 'investigation', at: first(done ? i.completedAt : null, i.requestedAt),
      title: `${done ? 'Result' : 'Requested'}: ${i.typeName || i.name || cap(String(i.type || 'investigation'))}`,
      detail: join(cap(i.category), i.priority !== 'routine' && i.priority?.toUpperCase()), status: i.status,
      href: '/investigations',
    });
  }

  for (const l of r.labRequests ?? []) {
    const tests = (l.tests || []).map(t => t.name).filter(Boolean);
    const done = l.status === 'completed';
    push({
      id: l.id, kind: 'lab_request', at: first(done ? l.completedAt : null, l.requestedAt),
      title: `${done ? 'Lab results' : 'Lab request'}: ${tests.slice(0, 3).join(', ') || 'tests'}${tests.length > 3 ? ` +${tests.length - 3}` : ''}`,
      status: l.status,
      href: '/laboratory',
    });
  }

  for (const w of r.woundAssessments ?? []) {
    const area = typeof w.areaCm2 === 'number' ? `${w.areaCm2.toFixed(1)} cm²` : undefined;
    push({
      id: w.id, kind: 'wound_assessment', at: first(w.assessedAt, (w as { createdAt?: DateLike }).createdAt),
      title: 'Wound assessment',
      detail: join(area, cap(w.healingStage)),
      href: `/wound-monitor?patientId=${encodeURIComponent(pid)}`,
    });
  }

  for (const t of r.treatmentPlans ?? []) {
    push({
      id: t.id, kind: 'treatment_plan', at: first(t.startDate, (t as { createdAt?: DateLike }).createdAt),
      title: `Treatment plan: ${t.title || 'plan'}`, status: t.status,
      href: `/treatment-planning/${t.id}`,
    });
  }

  for (const p of r.clerkingPlans ?? []) {
    const approved = p.approvals[p.approvals.length - 1];
    push({
      id: p.id, kind: 'treatment_plan', at: first(approved?.at, p.updatedAt, p.createdAt),
      title: `Treatment plan: ${p.conditions.map(c => c.label).join(', ') || 'clerking plan'}`,
      detail: join(approved ? `v${approved.version} approved by ${approved.byName || 'clinician'}` : 'draft, not approved',
        p.shares.length ? `shared ${p.shares.length}×` : null, p.appointments.length ? `${p.appointments.length} visit(s) booked` : null),
      status: p.status, href: `/patients/${encodeURIComponent(pid)}/plan/${encodeURIComponent(p.id)}`,
    });
  }

  for (const a of r.appointments ?? []) {
    const at = appointmentStart(a);
    push({
      id: a.id, kind: 'appointment', at,
      title: `Appointment: ${cap(a.type) || 'clinic'}`,
      detail: a.reasonForVisit || undefined, status: a.status,
      href: `/appointments?view=${encodeURIComponent(a.id)}`,
      upcoming: !!at && at > now && !['cancelled', 'rescheduled', 'completed', 'no_show'].includes(a.status),
    });
  }

  for (const a of r.admissions ?? []) {
    push({
      id: a.id, kind: 'admission', at: first(a.admissionDate),
      title: `Admitted${a.wardName ? ` to ${a.wardName}` : ''}`,
      detail: a.admissionDiagnosis || undefined, status: a.status,
      href: '/admissions',
    });
  }

  for (const d of r.dischargeSummaries ?? []) {
    push({
      id: d.id, kind: 'discharge', at: first(d.dischargeDate),
      title: 'Discharged',
      detail: (d.finalDiagnosis || []).slice(0, 2).join(', ') || undefined,
      href: '/discharge',
    });
  }

  for (const p of r.prescriptions ?? []) {
    const meds = (p.medications || []).map(m => m.name).filter(Boolean);
    push({
      id: p.id, kind: 'prescription', at: first(p.prescribedAt),
      title: `Prescription: ${meds.slice(0, 3).join(', ') || 'medications'}${meds.length > 3 ? ` +${meds.length - 3}` : ''}`,
      status: p.status,
      href: '/pharmacy',
    });
  }

  for (const d of r.scannedDocuments ?? []) {
    push({
      id: d.id, kind: 'document', at: first(d.createdAt),
      title: `Document: ${d.title || cap(d.documentType) || 'scan'}`,
      href: hubHref(pid, 'documents'),
    });
  }

  for (const e of r.educationRecords ?? []) {
    const rec = e as PatientEducationRecord & { deliveredAt?: DateLike; createdAt?: DateLike };
    push({
      id: e.id, kind: 'education', at: first(rec.deliveredAt, rec.createdAt),
      title: `Education given: ${e.topicTitle || 'topic'}`,
      detail: cap(e.category),
      href: `/patient-education?patientId=${encodeURIComponent(pid)}`,
    });
  }

  return out.sort((a, b) => b.at.getTime() - a.at.getTime() || a.kind.localeCompare(b.kind));
}

/** Address parts joined without empty commas ("5 Ogui Road, Enugu"). */
export function joinAddress(...parts: (string | null | undefined)[]): string {
  return parts.map(p => (p || '').trim().replace(/^,+|,+$/g, '').trim()).filter(Boolean).join(', ');
}

/**
 * A phone number as wa.me wants it: digits only, international. Nigerian
 * local numbers (0803…) become 234803…. Null if it is not a usable number.
 */
export function whatsappNumber(phone?: string | null): string | null {
  const raw = (phone || '').trim();
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('00')) digits = digits.slice(2);
  else if (!raw.startsWith('+') && digits.length === 11 && digits.startsWith('0')) digits = `234${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}
