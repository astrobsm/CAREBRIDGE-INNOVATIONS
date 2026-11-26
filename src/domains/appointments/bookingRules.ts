/**
 * Pure rules for the appointment booking form: per-step validation, clash
 * detection, and the reminder schedule (single source for the service that
 * creates reminders and the copy that describes them).
 */

// ---------------------------------------------------------------------------
// Reminder schedule
// ---------------------------------------------------------------------------

export type ReminderPlanChannel = 'whatsapp' | 'push_notification';

export interface ReminderPlanEntry {
  offsetHours: number;
  channels: ReminderPlanChannel[];
}

/** Every reminder an appointment gets (each only if still in the future). */
export const REMINDER_PLAN: readonly ReminderPlanEntry[] = [
  { offsetHours: 48, channels: ['whatsapp'] },
  { offsetHours: 24, channels: ['whatsapp', 'push_notification'] },
  { offsetHours: 2, channels: ['push_notification'] },
  { offsetHours: 1, channels: ['whatsapp'] },
];

const hoursLabel = (h: number) => (h === 1 ? '1 hour' : `${h} hours`);
const channelLabel = (c: ReminderPlanChannel) => (c === 'whatsapp' ? 'WhatsApp' : 'Push');

/** "48h, 24h, 2h and 1h" */
export function reminderOffsetsSummary(plan: readonly ReminderPlanEntry[] = REMINDER_PLAN): string {
  const parts = plan.map((p) => `${p.offsetHours}h`);
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** One line per reminder, e.g. "WhatsApp + Push: 24 hours before". */
export function reminderPlanLines(plan: readonly ReminderPlanEntry[] = REMINDER_PLAN): { text: string; channels: ReminderPlanChannel[] }[] {
  return plan.map((p) => ({
    text: `${p.channels.map(channelLabel).join(' + ')}: ${hoursLabel(p.offsetHours)} before`,
    channels: p.channels,
  }));
}

// ---------------------------------------------------------------------------
// Step validation
// ---------------------------------------------------------------------------

/** The form fields each step owns; "Next" validates these before moving on. */
export const STEP_FIELDS = {
  1: ['patientId', 'hospitalId', 'type', 'priority', 'reasonForVisit'],
  2: ['appointmentDate', 'appointmentTime', 'duration', 'locationType'],
  3: ['patientWhatsApp', 'patientPhone', 'patientEmail'],
} as const;

// ---------------------------------------------------------------------------
// Clash detection
// ---------------------------------------------------------------------------

export interface BookingSlot {
  id?: string;
  patientId: string;
  clinicianId?: string | null;
  appointmentDate: Date | string;
  appointmentTime: string; // HH:mm
  duration?: number; // minutes
  status?: string;
  patientName?: string;
  clinicianName?: string;
  appointmentNumber?: string;
}

export interface BookingClash {
  reason: 'same_patient' | 'same_clinician';
  existing: BookingSlot;
}

/** Statuses that no longer hold the slot. */
const INACTIVE = new Set(['cancelled', 'rescheduled', 'no_show', 'completed']);

function localDayKey(d: Date | string): string {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
}

function minutesOf(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Existing active appointments on the same day that overlap the candidate's
 * time and share its patient or its clinician. The user is warned and may
 * still book deliberately.
 */
export function findBookingClashes(candidate: BookingSlot, existing: BookingSlot[]): BookingClash[] {
  const day = localDayKey(candidate.appointmentDate);
  const start = minutesOf(candidate.appointmentTime);
  if (!day || start === null) return [];
  const end = start + (candidate.duration || 30);

  const clashes: BookingClash[] = [];
  for (const e of existing) {
    if (candidate.id && e.id === candidate.id) continue;
    if (e.status && INACTIVE.has(e.status)) continue;
    if (localDayKey(e.appointmentDate) !== day) continue;
    const s = minutesOf(e.appointmentTime);
    if (s === null) continue;
    const eEnd = s + (e.duration || 30);
    if (!(start < eEnd && s < end)) continue;
    if (e.patientId === candidate.patientId) {
      clashes.push({ reason: 'same_patient', existing: e });
    } else if (candidate.clinicianId && e.clinicianId === candidate.clinicianId) {
      clashes.push({ reason: 'same_clinician', existing: e });
    }
  }
  return clashes;
}

/** Identifies the slot the user accepted a clash warning for. */
export function bookingSlotKey(c: BookingSlot): string {
  return [c.patientId, c.clinicianId || '', localDayKey(c.appointmentDate), c.appointmentTime, c.duration || 30].join('|');
}

// ---------------------------------------------------------------------------
// Clinician list
// ---------------------------------------------------------------------------

export interface ClinicianLike {
  id: string;
  isActive?: boolean;
}

/**
 * The clinician picker: everyone with a clinical role, plus the signed-in
 * user if they are not already in it (a solo surgeon whose role is not in
 * the list, e.g. plastic_surgeon, still sees and is preselected as themself).
 */
export function cliniciansWithCurrentUser<T extends ClinicianLike>(clinicians: T[], currentUser: T | null | undefined): T[] {
  if (!currentUser) return clinicians;
  if (clinicians.some((c) => c.id === currentUser.id)) return clinicians;
  return [currentUser, ...clinicians];
}
