/**
 * Notification permission and the reminder schedulers that depend on it.
 *
 * The browser permission prompt is only ever raised from a tap (see
 * NotificationPermissionCard): never on launch and never before sign-in.
 * Schedulers start at launch only when permission was granted earlier.
 */
import { startNotificationScheduler } from './scheduledNotificationService';
import { startReminderProcessor } from './treatmentSchedulerService';
import { startReminderScheduler, setupNotificationClickHandler } from './appointmentNotificationService';

const ANSWER_KEY = 'astrohealth.notificationPrompt';

let started = false;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

/** Start the push-reminder schedulers once, if (and only if) permission is granted. */
export function startNotificationServicesIfPermitted(): boolean {
  if (started || currentPermission() !== 'granted') return started;
  started = true;
  startNotificationScheduler();
  startReminderProcessor(30);
  startReminderScheduler();
  setupNotificationClickHandler();
  return true;
}

/** The person already answered or dismissed our card (remembered on this device). */
export function hasAnsweredNotificationPrompt(): boolean {
  try {
    return localStorage.getItem(ANSWER_KEY) !== null;
  } catch {
    return false;
  }
}

export function rememberNotificationPromptAnswer(answer: 'granted' | 'denied' | 'default' | 'dismissed'): void {
  try {
    localStorage.setItem(ANSWER_KEY, answer);
  } catch {
    /* private mode / storage full: the card may show again next time */
  }
}

/** Whether to show the "turn on reminders" card. */
export function shouldOfferNotificationPrompt(): boolean {
  return currentPermission() === 'default' && !hasAnsweredNotificationPrompt();
}

/** Call ONLY from a click handler: browsers require a user gesture. */
export async function requestNotificationsFromGesture(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  rememberNotificationPromptAnswer(result);
  if (result === 'granted') startNotificationServicesIfPermitted();
  return result;
}
