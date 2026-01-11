// Appointment Diary Service
// Handles CRUD operations, reminders, and notifications for the appointment module

import { v4 as uuidv4 } from 'uuid';
import { format, subHours, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { db } from '../database';
import { syncRecord } from './cloudSyncService';
import type {
  Appointment,
  AppointmentType,
  AppointmentStatus,
  AppointmentPriority,
  AppointmentLocation,
  AppointmentReminder,
  AppointmentSlot,
  ClinicSession,
  ReminderSchedule,
  ReminderChannel,
} from '../types';

// ============================================
// APPOINTMENT NUMBER GENERATION
// ============================================

/**
 * Generates a unique appointment number in format APT-YYYY-XXXXXX
 */
export async function generateAppointmentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.appointments.count();
  const sequence = String(count + 1).padStart(6, '0');
  return `APT-${year}-${sequence}`;
}

// ============================================
// APPOINTMENT CRUD OPERATIONS
// ============================================

export interface CreateAppointmentInput {
  patientId: string;
  hospitalId: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration?: number;
  type: AppointmentType;
  priority?: AppointmentPriority;
  location: AppointmentLocation;
  reasonForVisit: string;
  notes?: string;
  clinicianId?: string; // Optional - can be assigned later
  clinicianName?: string;
  patientWhatsApp: string;
  patientPhone?: string;
  patientEmail?: string;
  reminderEnabled?: boolean;
  bookedBy: string;
  relatedEncounterId?: string;
  relatedSurgeryId?: string;
  relatedWoundId?: string;
}

/**
 * Creates a new appointment with automatic reminder scheduling
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const appointmentNumber = await generateAppointmentNumber();
  
  // Build reminder schedule based on appointment date
  const reminderSchedule = input.reminderEnabled !== false 
    ? buildReminderSchedule(input.appointmentDate, input.appointmentTime)
    : [];
  
  const now = new Date();
  const appointment: Appointment = {
    id: uuidv4(),
    appointmentNumber,
    patientId: input.patientId,
    hospitalId: input.hospitalId,
    appointmentDate: input.appointmentDate,
    appointmentTime: input.appointmentTime,
    duration: input.duration || 30,
    type: input.type,
    priority: input.priority || 'routine',
    status: 'scheduled',
    location: input.location,
    reasonForVisit: input.reasonForVisit,
    notes: input.notes,
    relatedEncounterId: input.relatedEncounterId,
    relatedSurgeryId: input.relatedSurgeryId,
    relatedWoundId: input.relatedWoundId,
    clinicianId: input.clinicianId || '', // Can be assigned later
    clinicianName: input.clinicianName,
    patientWhatsApp: input.patientWhatsApp,
    patientPhone: input.patientPhone,
    patientEmail: input.patientEmail,
    reminderEnabled: input.reminderEnabled !== false,
    reminderSchedule,
    bookedBy: input.bookedBy,
    bookedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.appointments.add(appointment);

  // Sync to cloud immediately
  await syncRecord('appointments', appointment as unknown as Record<string, unknown>);

  // Create reminder records for tracking
  if (reminderSchedule.length > 0) {
    await createAppointmentReminders(appointment);
  }

  return appointment;
}

/**
 * Updates an existing appointment
 */
export async function updateAppointment(
  id: string,
  updates: Partial<Appointment>,
  modifiedBy: string
): Promise<Appointment | null> {
  const existing = await db.appointments.get(id);
  if (!existing) return null;

  const updated: Appointment = {
    ...existing,
    ...updates,
    lastModifiedBy: modifiedBy,
    updatedAt: new Date(),
  };

  await db.appointments.put(updated);
  
  // Sync to cloud immediately
  await syncRecord('appointments', updated as unknown as Record<string, unknown>);
  
  return updated;
}

/**
 * Gets an appointment by ID
 */
export async function getAppointment(id: string): Promise<Appointment | undefined> {
  return db.appointments.get(id);
}

/**
 * Cancels an appointment
 */
export async function cancelAppointment(
  id: string,
  cancelledBy: string,
  reason?: string
): Promise<Appointment | null> {
  const appointment = await db.appointments.get(id);
  if (!appointment) return null;

  const updated = await updateAppointment(id, {
    status: 'cancelled',
    notes: reason ? `${appointment.notes || ''}\n\nCancellation Reason: ${reason}` : appointment.notes,
  }, cancelledBy);

  // Cancel pending reminders
  await db.appointmentReminders
    .where('appointmentId')
    .equals(id)
    .and(r => r.status === 'pending')
    .modify({ status: 'failed', failureReason: 'Appointment cancelled' });

  return updated;
}

/**
 * Marks appointment as no-show
 */
export async function markNoShow(id: string, markedBy: string): Promise<Appointment | null> {
  return updateAppointment(id, { status: 'no_show' }, markedBy);
}

/**
 * Checks in a patient for their appointment
 */
export async function checkInPatient(id: string, checkedInBy: string): Promise<Appointment | null> {
  return updateAppointment(id, {
    status: 'checked_in',
    checkedInAt: new Date(),
  }, checkedInBy);
}

/**
 * Completes an appointment
 */
export async function completeAppointment(
  id: string,
  completedBy: string,
  outcomeNotes?: string,
  nextAppointmentId?: string
): Promise<Appointment | null> {
  return updateAppointment(id, {
    status: 'completed',
    completedAt: new Date(),
    outcomeNotes,
    nextAppointmentId,
  }, completedBy);
}

// ============================================
// APPOINTMENT QUERIES
// ============================================

/**
 * Gets appointments for a specific date range
 */
export async function getAppointmentsByDateRange(
  startDate: Date,
  endDate: Date,
  hospitalId?: string,
  clinicianId?: string
): Promise<Appointment[]> {
  let query = db.appointments.where('appointmentDate').between(
    startOfDay(startDate),
    endOfDay(endDate),
    true,
    true
  );

  const appointments = await query.toArray();
  
  return appointments.filter(apt => {
    if (hospitalId && apt.hospitalId !== hospitalId) return false;
    if (clinicianId && apt.clinicianId !== clinicianId) return false;
    return true;
  });
}

/**
 * Gets today's appointments
 */
export async function getTodaysAppointments(
  hospitalId?: string,
  clinicianId?: string
): Promise<Appointment[]> {
  const today = new Date();
  return getAppointmentsByDateRange(today, today, hospitalId, clinicianId);
}

/**
 * Gets appointments for a specific patient
 */
export async function getPatientAppointments(
  patientId: string,
  includeCompleted = true
): Promise<Appointment[]> {
  const appointments = await db.appointments
    .where('patientId')
    .equals(patientId)
    .toArray();

  if (!includeCompleted) {
    return appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  }

  return appointments.sort((a, b) => 
    new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
  );
}

/**
 * Gets upcoming appointments for a clinician
 */
export async function getClinicianAppointments(
  clinicianId: string,
  fromDate?: Date
): Promise<Appointment[]> {
  const appointments = await db.appointments
    .where('clinicianId')
    .equals(clinicianId)
    .toArray();

  const startDate = fromDate || new Date();
  return appointments
    .filter(a => new Date(a.appointmentDate) >= startOfDay(startDate))
    .sort((a, b) => 
      new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
    );
}

/**
 * Gets appointments by status
 */
export async function getAppointmentsByStatus(
  status: AppointmentStatus,
  hospitalId?: string
): Promise<Appointment[]> {
  let query = db.appointments.where('status').equals(status);
  const appointments = await query.toArray();

  if (hospitalId) {
    return appointments.filter(a => a.hospitalId === hospitalId);
  }

  return appointments;
}

/**
 * Gets home visit appointments
 */
export async function getHomeVisitAppointments(
  fromDate?: Date,
  toDate?: Date
): Promise<Appointment[]> {
  const appointments = await db.appointments
    .where('type')
    .equals('home_visit')
    .toArray();

  return appointments.filter(a => {
    const aptDate = new Date(a.appointmentDate);
    if (fromDate && aptDate < startOfDay(fromDate)) return false;
    if (toDate && aptDate > endOfDay(toDate)) return false;
    return true;
  });
}

// ============================================
// REMINDER MANAGEMENT
// ============================================

/**
 * Builds a reminder schedule based on appointment datetime
 */
function buildReminderSchedule(appointmentDate: Date, appointmentTime: string): ReminderSchedule[] {
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  const aptDateTime = new Date(appointmentDate);
  aptDateTime.setHours(hours, minutes, 0, 0);

  const reminders: ReminderSchedule[] = [];
  const now = new Date();

  // 48 hours before - WhatsApp reminder
  const reminder48h = subHours(aptDateTime, 48);
  if (isAfter(reminder48h, now)) {
    reminders.push({
      id: uuidv4(),
      offsetHours: 48,
      channel: 'whatsapp',
      status: 'pending',
      scheduledFor: reminder48h,
    });
  }

  // 24 hours before - WhatsApp + Push notification
  const reminder24h = subHours(aptDateTime, 24);
  if (isAfter(reminder24h, now)) {
    reminders.push({
      id: uuidv4(),
      offsetHours: 24,
      channel: 'whatsapp',
      status: 'pending',
      scheduledFor: reminder24h,
    });
    reminders.push({
      id: uuidv4(),
      offsetHours: 24,
      channel: 'push_notification',
      status: 'pending',
      scheduledFor: reminder24h,
    });
  }

  // 2 hours before - Push notification
  const reminder2h = subHours(aptDateTime, 2);
  if (isAfter(reminder2h, now)) {
    reminders.push({
      id: uuidv4(),
      offsetHours: 2,
      channel: 'push_notification',
      status: 'pending',
      scheduledFor: reminder2h,
    });
  }

  // 1 hour before - Final WhatsApp reminder
  const reminder1h = subHours(aptDateTime, 1);
  if (isAfter(reminder1h, now)) {
    reminders.push({
      id: uuidv4(),
      offsetHours: 1,
      channel: 'whatsapp',
      status: 'pending',
      scheduledFor: reminder1h,
    });
  }

  return reminders;
}

/**
 * Creates reminder records for an appointment
 */
async function createAppointmentReminders(appointment: Appointment): Promise<void> {
  const reminders: AppointmentReminder[] = appointment.reminderSchedule.map(schedule => ({
    id: uuidv4(),
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    hospitalId: appointment.hospitalId,
    channel: schedule.channel,
    scheduledFor: schedule.scheduledFor,
    status: 'pending',
    messageTemplate: getMessageTemplate(schedule.channel, schedule.offsetHours),
    messageContent: '', // Will be generated when sending
    whatsAppNumber: schedule.channel === 'whatsapp' ? appointment.patientWhatsApp : undefined,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.appointmentReminders.bulkAdd(reminders);
}

/**
 * Gets message template based on channel and timing
 */
function getMessageTemplate(channel: ReminderChannel, offsetHours: number): string {
  if (channel === 'whatsapp') {
    if (offsetHours >= 24) {
      return 'APPOINTMENT_REMINDER_24H';
    } else {
      return 'APPOINTMENT_REMINDER_1H';
    }
  }
  return 'PUSH_NOTIFICATION_REMINDER';
}

/**
 * Gets pending reminders that need to be sent
 */
export async function getPendingReminders(): Promise<AppointmentReminder[]> {
  const now = new Date();
  const reminders = await db.appointmentReminders
    .where('status')
    .equals('pending')
    .toArray();

  return reminders.filter(r => 
    isBefore(new Date(r.scheduledFor), now) || 
    new Date(r.scheduledFor).getTime() - now.getTime() < 60000 // Within 1 minute
  );
}

/**
 * Marks a reminder as sent
 */
export async function markReminderSent(
  reminderId: string,
  messageContent: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  const now = new Date();
  await db.appointmentReminders.update(reminderId, {
    status: success ? 'sent' : 'failed',
    sentAt: now,
    messageContent,
    failureReason,
    updatedAt: now,
  });
  
  // Sync the updated reminder to cloud
  const updatedReminder = await db.appointmentReminders.get(reminderId);
  if (updatedReminder) {
    syncRecord('appointmentReminders', updatedReminder as unknown as Record<string, unknown>);
  }
}

// ============================================
// WHATSAPP MESSAGE GENERATION
// ============================================

export interface WhatsAppMessageData {
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  hospitalName: string;
  clinicianName: string;
  reasonForVisit: string;
  location: AppointmentLocation;
  appointmentNumber: string;
}

/**
 * Generates WhatsApp reminder message
 */
export function generateWhatsAppMessage(data: WhatsAppMessageData, offsetHours: number): string {
  const greeting = getTimeBasedGreeting();
  const locationInfo = getLocationInfo(data.location);
  
  if (offsetHours >= 24) {
    return `${greeting} ${data.patientName}! 📅

*APPOINTMENT REMINDER*
━━━━━━━━━━━━━━━━━━

📋 *Appointment Details:*
• Reference: ${data.appointmentNumber}
• Date: ${data.appointmentDate}
• Time: ${data.appointmentTime}
• Doctor: Dr. ${data.clinicianName}

🏥 *Location:*
${locationInfo}

📌 *Reason:* ${data.reasonForVisit}

━━━━━━━━━━━━━━━━━━

Please confirm your attendance by replying:
✅ *YES* - I will attend
❌ *NO* - I need to reschedule

If you need to reschedule, please call us at least 24 hours before.

Thank you for choosing our services! 🙏

_This is an automated reminder from CareBridge._`;
  }

  // For same-day reminders (1-2 hours before)
  return `${greeting} ${data.patientName}! ⏰

*YOUR APPOINTMENT IS TODAY*
━━━━━━━━━━━━━━━━━━

⏰ *Time:* ${data.appointmentTime}
👨‍⚕️ *Doctor:* Dr. ${data.clinicianName}

🏥 *Location:*
${locationInfo}

━━━━━━━━━━━━━━━━━━

Please arrive 15 minutes early for check-in.

📋 Remember to bring:
• Valid ID
• Previous medical records
• List of current medications

See you soon! 🙏

_CareBridge Health_`;
}

/**
 * Gets appropriate greeting based on time of day
 */
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Formats location information for message
 */
function getLocationInfo(location: AppointmentLocation): string {
  if (location.type === 'hospital') {
    let info = `• ${location.hospitalName || 'Hospital'}`;
    if (location.department) info += `\n• Department: ${location.department}`;
    if (location.room) info += `\n• Room: ${location.room}`;
    return info;
  }

  if (location.type === 'home') {
    return `🏠 *Home Visit*
${location.homeAddress || 'Your registered address'}
${location.homeCity ? `${location.homeCity}, ${location.homeState}` : ''}`;
  }

  if (location.type === 'telemedicine') {
    return `💻 *Telemedicine Consultation*
You will receive a call/video link at your appointment time.`;
  }

  return 'To be confirmed';
}

/**
 * Generates WhatsApp share URL
 */
export function generateWhatsAppUrl(phoneNumber: string, message: string): string {
  // Format phone number (remove non-digits, add country code if needed)
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  
  // Add Nigeria country code if not present
  if (!formattedPhone.startsWith('234')) {
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1);
    } else {
      formattedPhone = '234' + formattedPhone;
    }
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

// ============================================
// APPOINTMENT SLOTS & SESSIONS
// ============================================

/**
 * Creates appointment slot template
 */
export async function createAppointmentSlot(slot: Omit<AppointmentSlot, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppointmentSlot> {
  const now = new Date();
  const newSlot: AppointmentSlot = {
    ...slot,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.appointmentSlots.add(newSlot);
  syncRecord('appointmentSlots', newSlot as unknown as Record<string, unknown>);
  return newSlot;
}

/**
 * Gets available slots for a clinician on a specific date
 */
export async function getAvailableSlots(
  clinicianId: string,
  date: Date,
  hospitalId?: string
): Promise<string[]> {
  const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  
  // Get slot templates for this day
  const slots = await db.appointmentSlots
    .where('clinicianId')
    .equals(clinicianId)
    .filter(s => s.dayOfWeek === dayOfWeek && s.isActive)
    .toArray();

  if (hospitalId) {
    slots.filter(s => s.hospitalId === hospitalId);
  }

  // Get existing appointments for this date
  const existingAppointments = await getAppointmentsByDateRange(date, date, hospitalId, clinicianId);
  const bookedTimes = existingAppointments
    .filter(a => a.status !== 'cancelled')
    .map(a => a.appointmentTime);

  // Generate available time slots
  const availableSlots: string[] = [];
  
  for (const slot of slots) {
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const slotDuration = slot.slotDuration;

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime + slotDuration <= endTime) {
      const timeStr = `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`;
      
      if (!bookedTimes.includes(timeStr)) {
        availableSlots.push(timeStr);
      }
      
      currentTime += slotDuration;
    }
  }

  return [...new Set(availableSlots)].sort();
}

/**
 * Creates a clinic session
 */
export async function createClinicSession(session: Omit<ClinicSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClinicSession> {
  const now = new Date();
  const newSession: ClinicSession = {
    ...session,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.clinicSessions.add(newSession);
  syncRecord('clinicSessions', newSession as unknown as Record<string, unknown>);
  return newSession;
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * Gets appointment statistics for a date range
 */
export async function getAppointmentStats(
  startDate: Date,
  endDate: Date,
  hospitalId?: string
): Promise<{
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  attendanceRate: number;
  byType: Record<AppointmentType, number>;
}> {
  const appointments = await getAppointmentsByDateRange(startDate, endDate, hospitalId);

  const stats = {
    total: appointments.length,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    rescheduled: 0,
    attendanceRate: 0,
    byType: {} as Record<AppointmentType, number>,
  };

  for (const apt of appointments) {
    // Count by status
    switch (apt.status) {
      case 'completed':
        stats.completed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShow++;
        break;
      case 'rescheduled':
        stats.rescheduled++;
        break;
    }

    // Count by type
    stats.byType[apt.type] = (stats.byType[apt.type] || 0) + 1;
  }

  // Calculate attendance rate
  const attendable = stats.total - stats.cancelled;
  if (attendable > 0) {
    stats.attendanceRate = Math.round((stats.completed / attendable) * 100);
  }

  return stats;
}

// ============================================
// PUSH NOTIFICATION HELPERS
// ============================================

/**
 * Generates push notification payload for appointment reminder
 */
export function generatePushNotificationPayload(appointment: Appointment): {
  title: string;
  body: string;
  icon: string;
  tag: string;
  data: Record<string, string>;
} {
  return {
    title: '📅 Appointment Reminder',
    body: `Your appointment is scheduled for ${format(new Date(appointment.appointmentDate), 'MMM dd')} at ${appointment.appointmentTime}`,
    icon: '/icons/icon-192x192.png',
    tag: `appointment-${appointment.id}`,
    data: {
      type: 'appointment_reminder',
      appointmentId: appointment.id,
      url: `/appointments/${appointment.id}`,
    },
  };
}

export default {
  generateAppointmentNumber,
  createAppointment,
  updateAppointment,
  getAppointment,
  cancelAppointment,
  markNoShow,
  checkInPatient,
  completeAppointment,
  getAppointmentsByDateRange,
  getTodaysAppointments,
  getPatientAppointments,
  getClinicianAppointments,
  getAppointmentsByStatus,
  getHomeVisitAppointments,
  getPendingReminders,
  markReminderSent,
  generateWhatsAppMessage,
  generateWhatsAppUrl,
  createAppointmentSlot,
  getAvailableSlots,
  createClinicSession,
  getAppointmentStats,
  generatePushNotificationPayload,
};
