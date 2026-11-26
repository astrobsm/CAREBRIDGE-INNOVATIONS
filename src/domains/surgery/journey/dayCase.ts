/**
 * Day cases after theatre. Post-op Care used to list only admitted patients
 * and discharge needed an admission, so a day case vanished the moment it
 * left theatre. Here: the post-op list includes completed operations of
 * patients who are not admitted (for DAY_CASE_WINDOW days), and a day case
 * is discharged from the surgery itself with the same discharge summary
 * (DischargeSummary, the discharge PDF generator). Pure.
 */
import { differenceInDays, differenceInHours } from 'date-fns';
import type { Admission, DischargeSummary, Patient, PostOperativeNote, Surgery, User } from '../../../types';
import { procedureFromSurgery } from '../../discharge/services/dischargeProcedures';
import { operationDate } from './procedureLink';

/** How long a day case stays on the Post-op Care list after the operation. */
export const DAY_CASE_WINDOW_DAYS = 14;
/** Admitted patients stay listed for 30 days after the operation (as before). */
export const ADMITTED_WINDOW_DAYS = 30;

export interface PostOpListSurgery extends Surgery { dayPostOp: number; hoursPostOp: number; postOpNote?: PostOperativeNote }

export interface PostOpListEntry {
  patient: Patient;
  admission?: Admission;
  dayCase: boolean;
  surgeries: PostOpListSurgery[];
}

export function selectPostOpList(input: {
  patients: Patient[];
  activeAdmissions: Admission[];
  surgeries: Surgery[];
  postOpNotes: PostOperativeNote[];
  now: Date;
}): PostOpListEntry[] {
  const { patients, activeAdmissions, surgeries, postOpNotes, now } = input;
  const admissionOf = new Map(activeAdmissions.map(a => [a.patientId, a]));
  const out: PostOpListEntry[] = [];
  for (const patient of patients) {
    const admission = admissionOf.get(patient.id);
    const window = admission ? ADMITTED_WINDOW_DAYS : DAY_CASE_WINDOW_DAYS;
    const list = surgeries
      .filter(s => s.patientId === patient.id && s.status === 'completed')
      .map(s => {
        const d = operationDate(s);
        return { ...s, dayPostOp: differenceInDays(now, d), hoursPostOp: differenceInHours(now, d), postOpNote: postOpNotes.find(n => n.surgeryId === s.id) };
      })
      .filter(s => s.dayPostOp >= 0 && s.dayPostOp <= window)
      .sort((a, b) => a.dayPostOp - b.dayPostOp);
    if (list.length) out.push({ patient, admission, dayCase: !admission, surgeries: list });
  }
  return out;
}

export interface DayCaseDischargeInput {
  surgery: Surgery;
  note?: PostOperativeNote;
  condition: DischargeSummary['conditionAtDischarge'];
  woundCare: string;
  activity: string;
  warningSigns: string[];
  medications: DischargeSummary['dischargeMedications'];
  /** Day-surgery discharge criteria confirmed (BADS / AAGBI day-case guidance). */
  escortConfirmed: boolean;
  clinicContact: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName'>;
  users?: Pick<User, 'id' | 'firstName' | 'lastName'>[];
  now: Date;
  id: string;
}

/** The discharge summary of a day case: no admission; admitted and discharged the day of the operation. */
export function buildDayCaseDischargeSummary(i: DayCaseDischargeInput): DischargeSummary {
  const op = operationDate(i.surgery);
  const name = `${i.user.firstName ?? ''} ${i.user.lastName ?? ''}`.trim();
  return {
    id: i.id,
    patientId: i.surgery.patientId,
    encounterId: i.surgery.id,
    admissionDate: op,
    dischargeDate: i.now,
    admittingDiagnosis: i.note?.preOperativeDiagnosis || i.surgery.intraOpRecord?.preOperativeDiagnosis || i.surgery.procedureName,
    finalDiagnosis: [i.note?.postOperativeDiagnosis || i.surgery.intraOpRecord?.postOperativeDiagnosis || i.surgery.procedureName].filter(Boolean),
    comorbidities: [],
    hospitalCourse: [
      `Day-case ${i.surgery.procedureName}${i.surgery.anaesthesiaType ? ` under ${i.surgery.anaesthesiaType} anaesthesia` : ''}.`,
      i.note?.findings || i.surgery.intraOpRecord?.findings,
      i.escortConfirmed ? 'Day-case discharge criteria met; discharged home with a responsible adult.' : 'Discharged home.',
    ].filter(Boolean).join(' '),
    proceduresPerformed: [procedureFromSurgery(i.surgery, i.users ?? [])],
    consultations: [],
    conditionAtDischarge: i.condition,
    dischargeDisposition: 'home',
    dischargeMedications: i.medications,
    medicationsDiscontinued: [],
    dietaryInstructions: 'Normal diet as tolerated.',
    activityRestrictions: i.activity,
    woundCareInstructions: i.woundCare,
    warningSignsToWatch: i.warningSigns,
    followUpAppointments: [],
    pendingTests: (i.note?.specimens ?? []).length ? ['Histology / specimen results'] : [],
    pendingReferrals: [],
    emergencyContact: i.clinicContact,
    clinicContact: i.clinicContact,
    preparedBy: i.user.id,
    preparedByName: name,
    attendingPhysician: i.surgery.surgeonId || i.user.id,
    attendingPhysicianName: i.surgery.surgeon || name,
    followUpTracking: [],
    status: 'completed',
    createdAt: i.now,
    updatedAt: i.now,
  };
}

/** Day-surgery discharge checks (British Association of Day Surgery / AAGBI 2011 day case guidance). */
export const DAY_CASE_DISCHARGE_CHECKS = [
  'Observations stable and back to baseline',
  'Pain controlled with oral analgesia',
  'Nausea controlled; drinking',
  'Wound checked: no bleeding',
  'Passed urine (when required by the procedure or anaesthetic)',
  'A responsible adult escorts the patient home and stays for the first 24 hours (general anaesthesia or sedation)',
  'Written instructions and the clinic contact number given',
];
