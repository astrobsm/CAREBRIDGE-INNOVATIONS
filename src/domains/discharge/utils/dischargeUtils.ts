// Discharge Module Utilities
// Helper functions for discharge-related operations

import { differenceInDays, differenceInHours, format } from 'date-fns';
import type { FollowUpAppointment } from '../../../types';

/**
 * Calculate Length of Stay (LOS) in days
 */
export function calculateLOS(admissionDate: Date, dischargeDate?: Date): number {
  const endDate = dischargeDate || new Date();
  return differenceInDays(endDate, new Date(admissionDate)) + 1;
}

/**
 * Calculate Length of Stay in hours for short stays
 */
export function calculateLOSHours(admissionDate: Date, dischargeDate?: Date): number {
  const endDate = dischargeDate || new Date();
  return differenceInHours(endDate, new Date(admissionDate));
}

/**
 * Format LOS for display
 */
export function formatLOS(admissionDate: Date, dischargeDate?: Date): string {
  const hours = calculateLOSHours(admissionDate, dischargeDate);
  
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = calculateLOS(admissionDate, dischargeDate);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Get discharge disposition label
 */
export function getDispositionLabel(disposition: string): string {
  const labels: Record<string, string> = {
    home: 'Discharged Home',
    facility: 'To Skilled Nursing Facility',
    hospice: 'To Hospice Care',
    transfer: 'Transfer to Another Hospital',
    'against-advice': 'Against Medical Advice (AMA)',
    deceased: 'Deceased',
  };
  return labels[disposition] || disposition;
}

/**
 * Get condition at discharge label and color
 */
export function getConditionInfo(condition: string): { label: string; color: string; bgColor: string } {
  const conditions: Record<string, { label: string; color: string; bgColor: string }> = {
    improved: { label: 'Improved', color: 'text-green-700', bgColor: 'bg-green-100' },
    stable: { label: 'Stable', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    unchanged: { label: 'Unchanged', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    deteriorated: { label: 'Deteriorated', color: 'text-red-700', bgColor: 'bg-red-100' },
  };
  return conditions[condition] || { label: condition, color: 'text-gray-700', bgColor: 'bg-gray-100' };
}

/**
 * Check if follow-up appointment is overdue
 */
export function isFollowUpOverdue(appointment: FollowUpAppointment): boolean {
  if (appointment.status !== 'scheduled') return false;
  return new Date(appointment.scheduledDate) < new Date();
}

/**
 * Get days until follow-up appointment
 */
export function getDaysUntilFollowUp(appointment: FollowUpAppointment): number {
  return differenceInDays(new Date(appointment.scheduledDate), new Date());
}

/**
 * Format follow-up date with relative indicator
 */
export function formatFollowUpDate(date: Date): string {
  const days = differenceInDays(new Date(date), new Date());
  const formatted = format(new Date(date), 'dd MMM yyyy');
  
  if (days === 0) return `${formatted} (Today)`;
  if (days === 1) return `${formatted} (Tomorrow)`;
  if (days === -1) return `${formatted} (Yesterday)`;
  if (days < 0) return `${formatted} (${Math.abs(days)} days ago)`;
  if (days <= 7) return `${formatted} (In ${days} days)`;
  
  return formatted;
}

/**
 * Generate discharge summary filename
 */
export function generateDischargeFilename(
  patient: { firstName: string; lastName: string },
  dischargeDate: Date,
  type: 'summary' | 'education' | 'ama' = 'summary'
): string {
  const typeLabels = {
    summary: 'Discharge_Summary',
    education: 'Patient_Education',
    ama: 'AMA_Discharge',
  };
  
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = format(new Date(dischargeDate), 'yyyy-MM-dd');
  
  return `${typeLabels[type]}_${sanitize(patient.lastName)}_${sanitize(patient.firstName)}_${dateStr}.pdf`;
}

/**
 * Calculate readiness score percentage
 */
export function calculateReadinessPercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

/**
 * Determine if patient meets discharge criteria based on readiness score
 */
export function meetsDischargesCriteria(percentage: number, criticalIssues: number): boolean {
  return percentage >= 70 && criticalIssues <= 1;
}

/**
 * Get readiness level based on score
 */
export function getReadinessLevel(
  percentage: number, 
  criticalIssues: number
): 'ready' | 'conditional' | 'not-ready' {
  if (percentage >= 85 && criticalIssues === 0) return 'ready';
  if (percentage >= 70 && criticalIssues <= 1) return 'conditional';
  return 'not-ready';
}

/**
 * Get readiness message based on level
 */
export function getReadinessMessage(level: 'ready' | 'conditional' | 'not-ready'): string {
  const messages = {
    ready: 'Patient meets all discharge criteria',
    conditional: 'Conditional discharge - address minor concerns first',
    'not-ready': 'Patient not ready for discharge - critical issues present',
  };
  return messages[level];
}

/**
 * Format medication instructions for patient education
 */
export function formatMedicationInstructions(
  medication: { name: string; dose: string; route: string; frequency: string; duration: string; purpose: string }
): string {
  return `${medication.name} ${medication.dose}: Take ${medication.frequency.toLowerCase()} ${medication.route.toLowerCase()} for ${medication.duration}. Purpose: ${medication.purpose}`;
}

/**
 * Group follow-up appointments by status
 */
export function groupFollowUpsByStatus(appointments: FollowUpAppointment[]): {
  scheduled: FollowUpAppointment[];
  overdue: FollowUpAppointment[];
  completed: FollowUpAppointment[];
  missed: FollowUpAppointment[];
} {
  const now = new Date();
  
  return {
    scheduled: appointments.filter(a => 
      a.status === 'scheduled' && new Date(a.scheduledDate) >= now
    ),
    overdue: appointments.filter(a => 
      a.status === 'scheduled' && new Date(a.scheduledDate) < now
    ),
    completed: appointments.filter(a => a.status === 'completed'),
    missed: appointments.filter(a => a.status === 'missed'),
  };
}

/**
 * Calculate follow-up compliance rate
 */
export function calculateFollowUpComplianceRate(appointments: FollowUpAppointment[]): number {
  const pastAppointments = appointments.filter(a => 
    a.status !== 'scheduled' || new Date(a.scheduledDate) < new Date()
  );
  
  if (pastAppointments.length === 0) return 100;
  
  const attended = pastAppointments.filter(a => a.status === 'completed').length;
  return Math.round((attended / pastAppointments.length) * 100);
}

/**
 * Get days since discharge
 */
export function getDaysSinceDischarge(dischargeDate: Date): number {
  return differenceInDays(new Date(), new Date(dischargeDate));
}

/**
 * Check if within post-discharge critical period (typically 30 days)
 */
export function isInCriticalPeriod(dischargeDate: Date, criticalDays: number = 30): boolean {
  return getDaysSinceDischarge(dischargeDate) <= criticalDays;
}

/**
 * Generate warning signs list for patient education
 */
export function getStandardWarningSignsList(): string[] {
  return [
    'Fever above 38°C (100.4°F)',
    'Severe or worsening pain not relieved by medication',
    'Redness, swelling, or discharge from wound site',
    'Difficulty breathing or chest pain',
    'Persistent nausea, vomiting, or inability to eat',
    'Signs of blood clot (leg swelling, warmth, pain)',
    'Confusion or altered mental status',
    'Bleeding that won\'t stop',
    'Falls or new injuries',
    'Any symptoms that concern you',
  ];
}

/**
 * Generate activity restrictions based on surgery type
 */
export function getActivityRestrictions(surgeryType: string): string[] {
  const baseRestrictions = [
    'No heavy lifting (>5kg) for specified period',
    'Avoid strenuous activities',
    'Take short walks to prevent blood clots',
    'Rest when feeling tired',
  ];
  
  // Add surgery-specific restrictions based on type
  const surgerySpecific: Record<string, string[]> = {
    abdominal: [
      'Avoid abdominal straining',
      'Support incision when coughing',
      'No driving for 2 weeks or while on narcotic pain medications',
    ],
    orthopedic: [
      'Follow weight-bearing restrictions exactly',
      'Use assistive devices as instructed',
      'Attend physiotherapy appointments',
    ],
    cardiac: [
      'Cardiac rehabilitation program',
      'No driving for 4-6 weeks',
      'Avoid arm movements above head',
    ],
  };
  
  const specific = surgerySpecific[surgeryType.toLowerCase()] || [];
  return [...baseRestrictions, ...specific];
}
