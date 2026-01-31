// Appointment Notification Service
// Handles push notifications for appointment reminders

import { format } from 'date-fns';
import { db } from '../database';
import {
  getPendingReminders,
  markReminderSent,
  generateWhatsAppMessage,
  generateWhatsAppUrl,
  generatePushNotificationPayload,
} from './appointmentService';
import type { Appointment } from '../types';

// ============================================
// PUSH NOTIFICATION SETUP
// ============================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Show a local notification
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  if (!isPushSupported()) return;
  
  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return;
  }

  // Use service worker if registered, otherwise show directly
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });
  } else {
    new Notification(title, options);
  }
}

// ============================================
// APPOINTMENT REMINDER NOTIFICATIONS
// ============================================

/**
 * Show appointment reminder notification
 */
export async function showAppointmentReminder(appointment: Appointment): Promise<void> {
  const patient = await db.patients.get(appointment.patientId);
  const hospital = await db.hospitals.get(appointment.hospitalId);

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
  const hospitalName = hospital?.name || 'Hospital';

  const payload = generatePushNotificationPayload(appointment);

  await showLocalNotification(payload.title, {
    body: `${patientName}'s appointment at ${hospitalName}\n${format(new Date(appointment.appointmentDate), 'MMM d')} at ${appointment.appointmentTime}`,
    icon: payload.icon,
    tag: payload.tag,
    requireInteraction: true,
    data: payload.data,
  });
}

/**
 * Process pending reminders and send notifications
 */
export async function processPendingReminders(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const pendingReminders = await getPendingReminders();

    for (const reminder of pendingReminders) {
      try {
        const appointment = await db.appointments.get(reminder.appointmentId);
        if (!appointment) {
          await markReminderSent(reminder.id, '', false, 'Appointment not found');
          results.failed++;
          continue;
        }

        // Skip if appointment is cancelled
        if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
          await markReminderSent(reminder.id, '', false, 'Appointment already cancelled/completed');
          continue;
        }

        const patient = await db.patients.get(appointment.patientId);
        const hospital = await db.hospitals.get(appointment.hospitalId);

        if (!patient) {
          await markReminderSent(reminder.id, '', false, 'Patient not found');
          results.failed++;
          continue;
        }

        if (reminder.channel === 'push_notification') {
          // Send push notification
          await showAppointmentReminder(appointment);
          await markReminderSent(reminder.id, 'Push notification sent', true);
          results.sent++;
        } else if (reminder.channel === 'whatsapp') {
          // Generate WhatsApp message and log it
          // Note: Actual sending would require integration with WhatsApp Business API
          const message = generateWhatsAppMessage({
            patientName: `${patient.firstName} ${patient.lastName}`,
            appointmentDate: format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy'),
            appointmentTime: appointment.appointmentTime,
            hospitalName: hospital?.name || 'Hospital',
            clinicianName: appointment.clinicianName || 'Doctor',
            reasonForVisit: appointment.reasonForVisit,
            location: appointment.location,
            appointmentNumber: appointment.appointmentNumber,
          }, reminder.scheduledFor.getTime());

          // Store the generated message
          await markReminderSent(reminder.id, message, true);
          results.sent++;

          // Show a notification to staff about pending WhatsApp
          await showLocalNotification('📱 WhatsApp Reminder Ready', {
            body: `Reminder for ${patient.firstName} ${patient.lastName}'s appointment is ready to send`,
            tag: `whatsapp-${reminder.id}`,
            data: {
              type: 'whatsapp_reminder',
              appointmentId: appointment.id,
              whatsAppUrl: generateWhatsAppUrl(appointment.patientWhatsApp, message),
            },
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await markReminderSent(reminder.id, '', false, errorMsg);
        results.failed++;
        results.errors.push(errorMsg);
      }
    }
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Failed to fetch reminders');
  }

  return results;
}

// ============================================
// REMINDER SCHEDULER
// ============================================

let reminderInterval: NodeJS.Timeout | null = null;

/**
 * Start the reminder scheduler
 * Checks for pending reminders every minute
 */
export function startReminderScheduler(): void {
  if (reminderInterval) return;

  // Check immediately on start
  processPendingReminders();

  // Then check every minute
  reminderInterval = setInterval(() => {
    processPendingReminders();
  }, 60000); // 1 minute

  console.log('Appointment reminder scheduler started');
}

/**
 * Stop the reminder scheduler
 */
export function stopReminderScheduler(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('Appointment reminder scheduler stopped');
  }
}

// ============================================
// UPCOMING APPOINTMENT ALERTS
// ============================================

/**
 * Check for appointments starting soon and show alerts
 */
export async function checkUpcomingAppointments(minutesBefore: number = 15): Promise<void> {
  const now = new Date();
  const checkTime = new Date(now.getTime() + minutesBefore * 60000);

  const appointments = await db.appointments
    .where('status')
    .anyOf(['scheduled', 'confirmed'])
    .toArray();

  for (const apt of appointments) {
    const aptDate = new Date(apt.appointmentDate);
    const [hours, minutes] = apt.appointmentTime.split(':').map(Number);
    aptDate.setHours(hours, minutes, 0, 0);

    // Check if appointment is within the check window
    if (aptDate > now && aptDate <= checkTime) {
      const patient = await db.patients.get(apt.patientId);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';

      await showLocalNotification('⏰ Appointment Starting Soon', {
        body: `${patientName}'s appointment starts in ${minutesBefore} minutes`,
        tag: `upcoming-${apt.id}`,
        requireInteraction: true,
      });
    }
  }
}

// ============================================
// SERVICE WORKER MESSAGE HANDLER
// ============================================

/**
 * Handle notification clicks from service worker
 */
export function setupNotificationClickHandler(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const { action, appointmentId, url } = event.data;

        if (action === 'view' && appointmentId) {
          // Navigate to appointments page with appointment ID as query param to open detail modal
          window.location.href = `/appointments?view=${appointmentId}`;
        } else if (action === 'checkin' && appointmentId) {
          // Quick check-in
          const appointment = await db.appointments.get(appointmentId);
          if (appointment && appointment.status === 'scheduled') {
            await db.appointments.update(appointmentId, {
              status: 'checked_in',
              checkedInAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } else if (url) {
          window.location.href = url;
        }
      }
    });
  }
}

export default {
  isPushSupported,
  requestNotificationPermission,
  getNotificationPermission,
  showLocalNotification,
  showAppointmentReminder,
  processPendingReminders,
  startReminderScheduler,
  stopReminderScheduler,
  checkUpcomingAppointments,
  setupNotificationClickHandler,
};
