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

// All clinic locations with their schedules
export const CLINIC_LOCATIONS: ClinicLocationConfig[] = [
  {
    id: 'raymond-anikwe',
    hospitalName: 'Raymond Anikwe Hospital',
    hospitalCode: 'RAH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 4, // Thursday
    dayName: 'Thursday',
    startTime: '12:00',
    endTime: '16:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'st-gabriels-damija',
    hospitalName: "St. Gabriel's Hospital (Damija)",
    hospitalCode: 'SGH',
    address: 'Damija, Enugu, Nigeria',
    dayOfWeek: 6, // Saturday
    dayName: 'Saturday',
    startTime: '16:00',
    endTime: '17:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'roza-mystica',
    hospitalName: 'Roza-Mystica Hospital',
    hospitalCode: 'RMH',
    address: 'Enugu, Nigeria',
    dayOfWeek: 6, // Saturday
    dayName: 'Saturday',
    startTime: '17:30',
    endTime: '19:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
  {
    id: 'st-patricks-independence',
    hospitalName: "St. Patrick's Hospital, Independence Layout",
    hospitalCode: 'SPH',
    address: 'Independence Layout, Enugu, Nigeria',
    dayOfWeek: 1, // Monday
    dayName: 'Monday',
    startTime: '16:00',
    endTime: '18:00',
    slotDuration: DEFAULT_SLOT_DURATION,
    isActive: true,
  },
];

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
