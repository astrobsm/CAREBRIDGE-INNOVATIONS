// ---------------------------------------------------------------------------
// Procedures on a discharge summary, from the real surgery records.
//
// The discharge form used to invent every procedure's details: date = the
// admission date, surgeon = whoever was logged in, outcome = "Successful".
// That went onto a signed medico-legal document. These helpers take the
// details from db.surgeries for the patient's admission instead, and leave a
// field empty when the record does not say, for the clinician to complete.
// ---------------------------------------------------------------------------

import type { DischargeProcedure, Surgery, User } from '../../../types';

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXCLUDED_STATUSES = new Set<Surgery['status']>(['cancelled', 'postponed']);

function toTime(d: unknown): number | null {
  if (!d) return null;
  const t = new Date(d as string).getTime();
  return Number.isNaN(t) ? null : t;
}

/** When the operation happened: actual start if recorded, else the scheduled date. */
export function surgeryDate(s: Pick<Surgery, 'actualStartTime' | 'scheduledDate'>): Date | undefined {
  const t = toTime(s.actualStartTime) ?? toTime(s.scheduledDate);
  return t === null ? undefined : new Date(t);
}

/**
 * The patient's operations during this admission: from the admission date to
 * the discharge date (or now), excluding cancelled and postponed bookings.
 */
export function surgeriesForAdmission(
  surgeries: Surgery[],
  admission: { patientId: string; admissionDate: Date | string; dischargeDate?: Date | string },
  now: Date = new Date(),
): Surgery[] {
  const from = toTime(admission.admissionDate);
  const to = toTime(admission.dischargeDate) ?? now.getTime();
  if (from === null) return [];
  // An operation booked for the morning of admission can carry a date-only
  // timestamp earlier than the admission time; allow the whole admission day.
  const fromDay = new Date(from);
  fromDay.setHours(0, 0, 0, 0);
  return surgeries
    .filter(s => s.patientId === admission.patientId && !EXCLUDED_STATUSES.has(s.status))
    .filter(s => {
      const t = surgeryDate(s)?.getTime();
      return t !== undefined && t >= fromDay.getTime() && t <= to;
    })
    .sort((a, b) => (surgeryDate(a)!.getTime()) - (surgeryDate(b)!.getTime()));
}

export function surgeonNameOf(s: Pick<Surgery, 'surgeon' | 'surgeonId'>, users: Pick<User, 'id' | 'firstName' | 'lastName'>[] = []): string {
  const u = s.surgeonId ? users.find(x => x.id === s.surgeonId) : undefined;
  if (u) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  const name = (s.surgeon || '').trim();
  // Some records hold an id or the string "undefined undefined" here.
  if (!name || UUID_LIKE.test(name) || /^(undefined|null)(\s+(undefined|null))?$/i.test(name)) return '';
  return name;
}

/** What the record says about how it went. Empty when it does not say. */
export function surgeryOutcome(s: Pick<Surgery, 'status' | 'complications'>): string {
  const complications = (s.complications || '').trim();
  if (s.status === 'completed') {
    return complications && !/^(none|nil|no|n\/a)$/i.test(complications)
      ? `Completed; complications: ${complications}`
      : complications ? 'Completed; no complications recorded' : 'Completed';
  }
  if (s.status === 'in-progress') return 'In progress';
  if (s.status === 'scheduled') return 'Scheduled (not yet performed)';
  return '';
}

export function procedureFromSurgery(s: Surgery, users: Pick<User, 'id' | 'firstName' | 'lastName'>[] = []): DischargeProcedure {
  return {
    name: s.procedureName,
    date: surgeryDate(s),
    surgeon: surgeonNameOf(s, users),
    outcome: surgeryOutcome(s),
    surgeryId: s.id,
  };
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Turn the form's "one per line" procedure text into DischargeProcedure rows.
 * A line naming one of the admission's surgeries takes that record's date,
 * surgeon and outcome; any other line carries only its name.
 */
export function buildDischargeProcedures(
  text: string | undefined,
  admissionSurgeries: Surgery[],
  users: Pick<User, 'id' | 'firstName' | 'lastName'>[] = [],
): DischargeProcedure[] {
  if (!text) return [];
  const used = new Set<string>();
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const n = norm(line);
      const match = admissionSurgeries.find(s => {
        if (used.has(s.id)) return false;
        const p = norm(s.procedureName || '');
        return !!p && (n === p || n.includes(p) || p.includes(n));
      });
      if (!match) return { name: line, surgeon: '', outcome: '' };
      used.add(match.id);
      return { ...procedureFromSurgery(match, users), name: line };
    });
}

/** The default text for the form's procedures box: one surgery per line. */
export function procedureLinesFor(admissionSurgeries: Surgery[]): string {
  return admissionSurgeries.map(s => s.procedureName).filter(Boolean).join('\n');
}
