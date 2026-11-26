/**
 * The anaesthetic and operation record, written to the database.
 *
 * Before: the pre-anaesthetic review's airway, notes and fitness, the
 * intra-operative anaesthesia / vitals log, fluids, specimens and findings
 * lived only in a localStorage draft, and the workflow's post-op tab wrote
 * surgery.operativeNotes while Post-op Care read db.postOperativeNotes. Now:
 *   - the pre-anaesthetic review writes db.preoperativeAssessments (linked by
 *     surgeryId), which the conference "Anaesthetist comments" slide and
 *     /surgery/preop/:id read;
 *   - the intra-op record is stored on the surgery (intraOpRecord);
 *   - both post-op note screens write ONE db.postOperativeNotes record per
 *     surgery (upsertPostOpNote), and mark the operation done.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { createPostOperativeNote, generateLabRequestsForSpecimens } from '../../../services/postOperativeNoteService';
import type {
  GradedComplication, IntraOperativeRecord, Patient, PostOperativeNote, PostOperativeSpecimen,
  PreoperativeAssessment, SpecimenType, Surgery,
} from '../../../types';
import { updateSurgery } from './surgeryWrite';
import { complicationText } from './clavienDindo';

// ── Pre-anaesthetic review ──────────────────────────────────────────────────

export interface PreAnaestheticInput {
  asaClass: 1 | 2 | 3 | 4 | 5;
  mallampati: 1 | 2 | 3 | 4;
  airwayNotes: string;
  notes: string;
  fitness: 'fit' | 'optimize' | 'defer';
}

/** The assessment row for a surgery (pure): updates `existing` or makes a new one. */
export function buildPreAnaestheticAssessment(
  existing: PreoperativeAssessment | undefined,
  surgery: Surgery,
  patient: Pick<Patient, 'id' | 'firstName' | 'lastName' | 'hospitalNumber'>,
  input: PreAnaestheticInput,
  who: { id: string },
  now: Date,
  newId: string,
): PreoperativeAssessment {
  const base = existing ?? {
    id: newId,
    patientId: patient.id,
    createdAt: now,
    cardiacRisk: { rcriScore: 0, rcriRisk: '', selectedFactors: [], functionalCapacity: 0 },
    vteRisk: { capriniScore: surgery.preOperativeAssessment?.capriniScore ?? 0, riskCategory: 'low', prophylaxisRecommendation: '', selectedFactors: [] },
    bleedingRisk: { onAnticoagulant: false, bleedingHistory: false },
  };
  return {
    ...base,
    patientName: `${patient.firstName} ${patient.lastName}`.trim(),
    hospitalNumber: patient.hospitalNumber || '',
    hospitalId: surgery.hospitalId,
    surgeryId: surgery.id,
    surgeryName: surgery.procedureName,
    // The cloud column only allows minor / intermediate / major.
    surgeryType: surgery.category === 'super_major' ? 'major' : surgery.category,
    scheduledDate: surgery.scheduledDate,
    asaClass: input.asaClass,
    asaEmergency: surgery.type === 'emergency',
    airwayAssessment: {
      mallampatiScore: input.mallampati,
      mouthOpening: existing?.airwayAssessment?.mouthOpening ?? 0,
      thyromentalDistance: existing?.airwayAssessment?.thyromentalDistance ?? 0,
      neckMobility: existing?.airwayAssessment?.neckMobility ?? 'normal',
      previousDifficultIntubation: existing?.airwayAssessment?.previousDifficultIntubation ?? false,
      predictedDifficulty: input.mallampati >= 3 ? 'potentially_difficult' : 'easy',
    },
    airwayNotes: input.airwayNotes,
    preAnaestheticNotes: input.notes,
    fitnessGrade: input.fitness,
    status: 'completed',
    clearanceStatus: input.fitness === 'fit' ? 'cleared' : input.fitness === 'defer' ? 'deferred' : 'pending_review',
    clearanceNotes: [input.notes, input.airwayNotes && `Airway: ${input.airwayNotes}`].filter(Boolean).join('\n') || undefined,
    assessedBy: who.id,
    assessedAt: now,
    updatedAt: now,
  } as PreoperativeAssessment;
}

export async function savePreAnaestheticReview(
  surgery: Surgery, patient: Patient, input: PreAnaestheticInput, who: { id: string },
): Promise<PreoperativeAssessment> {
  const now = new Date();
  const existing = (await db.preoperativeAssessments.where('patientId').equals(patient.id).toArray())
    .find(a => a.surgeryId === surgery.id);
  const row = buildPreAnaestheticAssessment(existing, surgery, patient, input, who, now, uuidv4());
  await db.preoperativeAssessments.put(row);
  void syncRecord('preoperativeAssessments', row as unknown as Record<string, unknown>);
  // "Fit" no longer books the case: only an approved booking is 'scheduled'.
  const status: Surgery['status'] = input.fitness !== 'fit' ? 'incomplete_preparation'
    : surgery.bookingApproval ? 'scheduled' : surgery.status;
  await updateSurgery(surgery.id, {
    status,
    preOperativeAssessment: { ...surgery.preOperativeAssessment, asaScore: input.asaClass, mallampatiScore: input.mallampati },
  });
  return row;
}

// ── Intra-operative record ─────────────────────────────────────────────────

export async function saveIntraOpRecord(surgeryId: string, record: IntraOperativeRecord): Promise<void> {
  await updateSurgery(surgeryId, {
    intraOpRecord: record,
    bloodLoss: record.bloodLoss,
    specimenSent: record.specimens.length > 0,
    specimenType: record.specimens.map(s => s.type).filter(Boolean).join(', ') || undefined,
  });
}

// ── The one post-op note ───────────────────────────────────────────────────

export interface PostOpNoteFields {
  preOperativeDiagnosis: string;
  postOperativeDiagnosis: string;
  indication?: string;
  procedurePerformed: string;
  findings: string;
  /** Graded complications; undefined keeps what the note already has (the full form sends plain text). */
  complications?: GradedComplication[];
  /** Plain complication lines (the full post-op note form). */
  complicationLines?: string[];
  bloodLoss: number;
  durationMinutes?: number;
  specimens: { type: string; site: string; notes: string }[];
}

const SPECIMEN_TYPES: SpecimenType[] = ['histology', 'mcs', 'biochemistry', 'cytology', 'frozen_section', 'other'];
const specimenType = (t: string): SpecimenType => {
  const k = t.trim().toLowerCase();
  if (SPECIMEN_TYPES.includes(k as SpecimenType)) return k as SpecimenType;
  if (/histo|biopsy|tissue|excis/.test(k)) return 'histology';
  if (/culture|swab|pus|m\s*c\s*s/.test(k)) return 'mcs';
  if (/cyto|fna/.test(k)) return 'cytology';
  if (/frozen/.test(k)) return 'frozen_section';
  return 'other';
};

export function toNoteSpecimens(list: PostOpNoteFields['specimens']): PostOperativeSpecimen[] {
  return list.filter(s => s.type.trim() || s.site.trim()).map((s, i) => ({
    id: `spec_${i + 1}`, type: specimenType(s.type), description: s.type, site: s.site, notes: s.notes || undefined, labRequestGenerated: false,
  }));
}

/** The WHO checklist flags on the note, from the surgery's checklist (never hard-coded true). */
export function noteChecklistFlags(s: Pick<Surgery, 'whoChecklist'>) {
  const signIn = !!s.whoChecklist?.signIn?.completedAt;
  const timeOut = !!s.whoChecklist?.timeOut?.completedAt;
  const signOut = !!s.whoChecklist?.signOut?.completedAt;
  return { signInCompleted: signIn, timeOutCompleted: timeOut, signOutCompleted: signOut, whoChecklistCompleted: signIn && timeOut && signOut };
}

/** Mark the operation done: status completed, end time if missing. Idempotent. */
export async function markOperationDone(surgeryId: string): Promise<Surgery | undefined> {
  const s = await db.surgeries.get(surgeryId);
  if (!s) return undefined;
  if (s.status === 'completed' && s.actualEndTime) return s;
  return updateSurgery(surgeryId, { status: 'completed', actualEndTime: s.actualEndTime ?? new Date() });
}

/**
 * Create or update THE post-op note of a surgery (db.postOperativeNotes, one
 * per surgery) and mark the operation done. Both the workflow's post-op tab
 * and the full post-op note form call this.
 */
export async function upsertPostOpNote(
  surgery: Surgery, patient: Patient, fields: PostOpNoteFields, userId: string,
  full?: Parameters<typeof createPostOperativeNote>,
): Promise<PostOperativeNote> {
  const existing = (await db.postOperativeNotes.where('surgeryId').equals(surgery.id).toArray())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const specimens = toNoteSpecimens(fields.specimens);
  const complications = fields.complications ? fields.complications.map(complicationText) : (fields.complicationLines ?? []);
  const checklist = noteChecklistFlags(surgery);
  const now = new Date();
  let note: PostOperativeNote;
  if (!existing) {
    const args = full ?? defaultNoteArgs(surgery, patient, fields, specimens, complications, userId);
    note = await createPostOperativeNote(...args);
    // createPostOperativeNote adds and syncs; correct the checklist flags.
    note = { ...note, ...checklist };
    await db.postOperativeNotes.put(note);
  } else {
    const labRequests = [
      ...(existing.labRequests ?? []),
      ...generateLabRequestsForSpecimens(specimens.filter(sp => !existing.specimens?.some(e => e.site === sp.site && e.description === sp.description)), patient.id, surgery.id, userId),
    ];
    note = {
      ...existing,
      preOperativeDiagnosis: fields.preOperativeDiagnosis,
      postOperativeDiagnosis: fields.postOperativeDiagnosis,
      indication: fields.indication ?? existing.indication,
      procedurePerformed: fields.procedurePerformed,
      findings: fields.findings,
      complications: fields.complications || fields.complicationLines ? complications : existing.complications,
      bloodLoss: fields.bloodLoss,
      duration: fields.durationMinutes ?? existing.duration,
      specimens: specimens.length ? specimens : existing.specimens,
      specimensCollected: specimens.length > 0 || existing.specimensCollected,
      labRequests,
      ...checklist,
      updatedAt: now,
    };
    await db.postOperativeNotes.put(note);
  }
  void syncRecord('postOperativeNotes', note as unknown as Record<string, unknown>);
  await updateSurgery(surgery.id, {
    operativeNotes: fields.findings,
    complications: note.complications.join('; ') || undefined,
    ...(fields.complications ? {
      complicationEntries: [
        ...(surgery.complicationEntries ?? []).filter(c => c.source !== 'operation'),
        ...fields.complications,
      ],
    } : {}),
    bloodLoss: fields.bloodLoss,
  });
  await markOperationDone(surgery.id);
  return note;
}

function defaultNoteArgs(
  surgery: Surgery, patient: Patient, f: PostOpNoteFields, specimens: PostOperativeSpecimen[], complications: string[], userId: string,
): Parameters<typeof createPostOperativeNote> {
  const start = surgery.actualStartTime ? new Date(surgery.actualStartTime).getTime() : NaN;
  const end = surgery.actualEndTime ? new Date(surgery.actualEndTime).getTime() : Date.now();
  const duration = f.durationMinutes ?? (Number.isNaN(start) ? 0 : Math.max(0, Math.round((end - start) / 60000)));
  return [
    surgery, patient,
    {
      preOperativeDiagnosis: f.preOperativeDiagnosis, postOperativeDiagnosis: f.postOperativeDiagnosis,
      indication: f.indication ?? f.preOperativeDiagnosis, procedurePerformed: f.procedurePerformed,
      findings: f.findings, complications, bloodLoss: f.bloodLoss, duration, specimens,
    },
    { vitalSignsFrequency: '', monitoringInstructions: [], position: '', dietInstructions: '', medications: [] },
    {
      expectedRecoveryDays: 0, ambulation: { day0: '', day1: '', ongoing: '' }, oralIntake: { timing: '', type: '', progression: '' },
      followUpInstructions: '', warningSigns: [], whenToSeekHelp: [],
    },
    noteChecklistFlags(surgery),
    userId, surgery.hospitalId,
  ];
}
