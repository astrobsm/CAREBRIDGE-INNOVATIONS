/**
 * Clinic Location Configurations for Public Appointment Booking
 * 
 * This file contains the configuration for all clinic locations where
 * patients can book appointments without logging in.
 * 
 * Day of Week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 *              4 = Thursday, 5 = Friday, 6 = Saturday
 */

import type { ClinicLocationConfig } from '../types';

// Slot duration in minutes
export const DEFAULT_SLOT_DURATION = 20;

/**
 * What kind of session occupies a slot in the working week.
 * Only `clinic` sessions are bookable by patients; ward rounds and theatre
 * lists live here too so the whole week has one definition rather than being
 * rediscovered from ad-hoc records.
 */
export type SessionType = 'clinic' | 'ward_round' | 'theatre';

export interface WeeklySession extends ClinicLocationConfig {
  type: SessionType;
}

/**
 * The standing weekly timetable — single source of truth for clinics, ward
 * rounds and theatre lists.
 *
 * Thursday runs as one continuous circuit:
 *   10:00 Raymond Anikwe clinic -> 12:30 Niger Foundation ward round
 *   -> 15:00 St Mary's -> 16:30 Roza-Mystica -> 17:30 Mercy.
 */
export const WEEKLY_SESSIONS: WeeklySession[] = [
  // ── Monday ────────────────────────────────────────────────────────────────
  {
    id: 'niger-foundation-ward-round-mon',
    type: 'ward_round',
    hospitalName: 'Niger Foundation Hospital',
    hospitalCode: 'NFH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 1,
    dayName: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'st-patricks-independence',
    type: 'clinic',
    hospitalName: "St. Patrick's Hospital, Independence Layout",
    hospitalCode: 'SPH',
    address: 'Independence Layout, Enugu, Nigeria',
    dayOfWeek: 1,
    dayName: 'Monday',
    startTime: '16:00',
    endTime: '17:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'st-gabriels-damija',
    type: 'clinic',
    hospitalName: "St. Gabriel's Hospital (Damija)",
    hospitalCode: 'SGH',
    address: 'Damija, Enugu, Nigeria',
    dayOfWeek: 1,
    dayName: 'Monday',
    startTime: '17:30',
    endTime: '19:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },

  // ── Thursday circuit ──────────────────────────────────────────────────────
  {
    id: 'raymond-anikwe',
    type: 'clinic',
    hospitalName: 'Raymond Anikwe Hospital',
    hospitalCode: 'RAH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 4,
    dayName: 'Thursday',
    startTime: '10:00',
    endTime: '12:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'niger-foundation-ward-round-thu',
    type: 'ward_round',
    hospitalName: 'Niger Foundation Hospital',
    hospitalCode: 'NFH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 4,
    dayName: 'Thursday',
    startTime: '12:30',
    endTime: '14:30',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'st-marys',
    type: 'clinic',
    hospitalName: "St. Mary's Hospital",
    hospitalCode: 'SMH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 4,
    dayName: 'Thursday',
    startTime: '15:00',
    endTime: '16:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'roza-mystica',
    type: 'clinic',
    hospitalName: 'Roza-Mystica Hospital',
    hospitalCode: 'RMH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 4,
    dayName: 'Thursday',
    startTime: '16:30',
    endTime: '17:30',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'mercy',
    type: 'clinic',
    hospitalName: 'Mercy Hospital',
    hospitalCode: 'MCH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 4,
    dayName: 'Thursday',
    startTime: '17:30',
    endTime: '18:30',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },

  // ── Friday ────────────────────────────────────────────────────────────────
  {
    id: 'niger-foundation-clinic',
    type: 'clinic',
    hospitalName: 'Niger Foundation Hospital',
    hospitalCode: 'NFH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 5,
    dayName: 'Friday',
    startTime: '09:30',
    endTime: '16:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },

  // ── Saturday ──────────────────────────────────────────────────────────────
  {
    id: 'niger-foundation-theatre',
    type: 'theatre',
    hospitalName: 'Niger Foundation Hospital',
    hospitalCode: 'NFH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 6,
    dayName: 'Saturday',
    startTime: '10:00',
    endTime: '17:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },

];

/**
 * Patient-bookable clinics, derived from the timetable above. Ward rounds and
 * theatre lists are deliberately excluded — patients must never be offered a
 * slot in one.
 */
export const CLINIC_LOCATIONS: ClinicLocationConfig[] =
  WEEKLY_SESSIONS.filter(s => s.type === 'clinic');

/** Active ward rounds in the standing timetable. */
export const WARD_ROUND_SESSIONS: WeeklySession[] =
  WEEKLY_SESSIONS.filter(s => s.type === 'ward_round' && s.isActive);

/** Active theatre lists in the standing timetable. */
export const THEATRE_SESSIONS: WeeklySession[] =
  WEEKLY_SESSIONS.filter(s => s.type === 'theatre' && s.isActive);

/** Every active session, ordered by day then start time. */
export function getWeeklyTimetable(): WeeklySession[] {
  return WEEKLY_SESSIONS
    .filter(s => s.isActive)
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
}

// Get all active clinic locations
export function getActiveClinicLocations(): ClinicLocationConfig[] {
  return CLINIC_LOCATIONS.filter(loc => loc.isActive);
}

// Get clinic by hospital code
export function getClinicByCode(hospitalCode: string): ClinicLocationConfig | undefined {
  return CLINIC_LOCATIONS.find(loc => loc.hospitalCode === hospitalCode);
}

// Get clinic by ID
export function getClinicById(id: string): ClinicLocationConfig | undefined {
  return CLINIC_LOCATIONS.find(loc => loc.id === id);
}

// Generate time slots for a clinic session
export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  while (currentMinutes + durationMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += durationMinutes;
  }
  
  return slots;
}

// Calculate end time for a slot
export function calculateSlotEndTime(startTime: string, durationMinutes: number): string {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

// Format time to 12-hour format
export function formatTime12Hour(time24: string): string {
  const [hours, mins] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Get next available date for a clinic
export function getNextAvailableDate(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilNext = dayOfWeek - currentDay;
  
  // If the day has passed this week, get next week's date
  if (daysUntilNext <= 0) {
    daysUntilNext += 7;
  }
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntilNext);
  return nextDate;
}

// Get available dates for a clinic (next 4 weeks)
export function getAvailableDates(dayOfWeek: number, weeksAhead: number = 4): Date[] {
  const dates: Date[] = [];
  let nextDate = getNextAvailableDate(dayOfWeek);
  
  for (let i = 0; i < weeksAhead; i++) {
    dates.push(new Date(nextDate));
    nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return dates;
}

// Format date for display
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format date for database storage (YYYY-MM-DD)
export function formatDateForStorage(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Generate unique booking number
export function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `CBK-${year}-${random}${timestamp}`;
}

// Validate Nigerian phone number
export function validatePhoneNumber(phone: string): boolean {
  // Nigerian phone numbers: +234 or 0 followed by 10 digits
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const nigeriaPattern = /^(\+234|234|0)?[789][01]\d{8}$/;
  return nigeriaPattern.test(cleanPhone);
}

// Format phone number for WhatsApp (international format)
export function formatPhoneForWhatsApp(phone: string): string {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with 0, replace with +234
  if (cleanPhone.startsWith('0')) {
    return '+234' + cleanPhone.substring(1);
  }
  
  // If starts with 234, add +
  if (cleanPhone.startsWith('234')) {
    return '+' + cleanPhone;
  }
  
  // If already has +234, return as is
  if (cleanPhone.startsWith('+234')) {
    return cleanPhone;
  }
  
  // Default: assume Nigerian and add +234
  return '+234' + cleanPhone;
}
