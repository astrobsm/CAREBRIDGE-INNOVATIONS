/**
 * Staff Earnings Service
 * 
 * Implements activity-based earnings for all staff members with the following rules:
 * - Surgeon encounter outside Niger Foundation Hospital: Bills patient ₦25,000, surgeon earns ₦10,000
 * - Surgeon encounter at Niger Foundation Hospital: Surgeon earns ₦3,500
 * - Surgeon assistant: Earnings based on surgical estimate
 * - Scrub nurse: ₦3,000 per surgery when assigned
 * - Circulating nurse: ₦3,000 per surgery when assigned
 * - Vital signs recording: ₦500 per entry to the recording user
 * - Lab result upload: ₦500 per entry to the uploading user
 * - Medication record: ₦500 per DAY to the recording user (not per medication)
 * 
 * All entries track: user details, location (if available), and timestamp
 */

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { db } from '../database';
import { syncRecord } from './cloudSyncService';
import type { ActivityBillingRecord, UserRole } from '../types';

// Fee constants
export const BILLING_RATES = {
  // Encounter fees
  ENCOUNTER_FEE_OUTSIDE_NIGER: 25000, // Billed to patient
  SURGEON_EARNING_OUTSIDE_NIGER: 10000, // Surgeon earns
  SURGEON_EARNING_AT_NIGER: 3500, // Surgeon earns at Niger Foundation

  // Surgery team fees
  SCRUB_NURSE_FEE: 3000, // Per surgery
  CIRCULATING_NURSE_FEE: 3000, // Per surgery

  // Activity fees (per entry)
  VITAL_SIGNS_FEE: 500,
  LAB_RESULT_UPLOAD_FEE: 500,
  MEDICATION_RECORD_FEE: 500,

  // Surgeon assistant gets calculated from surgical estimate
  ASSISTANT_PERCENTAGE: 0.20, // 20% of surgical estimate
} as const;

// User tracking information for entries
export interface EntryTracking {
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: Date;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  deviceInfo?: string;
}

// Get current user location (if browser supports geolocation)
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(undefined);
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

// Get device info
export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  return `${platform} - ${ua.substring(0, 100)}`;
}

// Create entry tracking object
export async function createEntryTracking(
  userId: string,
  userName: string,
  userRole: UserRole,
  includeLocation: boolean = false
): Promise<EntryTracking> {
  const tracking: EntryTracking = {
    userId,
    userName,
    userRole,
    timestamp: new Date(),
    deviceInfo: getDeviceInfo(),
  };

  if (includeLocation) {
    const location = await getCurrentLocation();
    if (location) {
      tracking.location = location;
    }
  }

  return tracking;
}

// Check if hospital is Niger Foundation
export async function isNigerFoundationHospital(hospitalId: string): Promise<boolean> {
  try {
    const hospital = await db.hospitals.get(hospitalId);
    if (!hospital) return false;
    return hospital.name.toLowerCase().includes('niger foundation');
  } catch {
    return false;
  }
}

// Helper to get hospital name
export async function getHospitalName(hospitalId: string): Promise<string> {
  try {
    const hospital = await db.hospitals.get(hospitalId);
    return hospital?.name || 'Unknown Hospital';
  } catch {
    return 'Unknown Hospital';
  }
}

/**
 * Record surgeon encounter billing
 * Bills patient ₦25,000 outside Niger Foundation
 * Surgeon earns ₦10,000 outside Niger Foundation, ₦3,500 at Niger Foundation
 */
export async function recordSurgeonEncounterEarning(
  encounterId: string,
  patientId: string,
  surgeonId: string,
  surgeonName: string,
  hospitalId: string
): Promise<ActivityBillingRecord> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  const isNigerFoundation = await isNigerFoundationHospital(hospitalId);
  
  // Calculate fees based on hospital
  const patientFee = isNigerFoundation ? 0 : BILLING_RATES.ENCOUNTER_FEE_OUTSIDE_NIGER;
  const surgeonEarning = isNigerFoundation 
    ? BILLING_RATES.SURGEON_EARNING_AT_NIGER 
    : BILLING_RATES.SURGEON_EARNING_OUTSIDE_NIGER;

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'ENC-SURGEON',
    activityCode: 'ENC-SURGEON',
    activityName: isNigerFoundation ? 'Surgeon Encounter (Niger Foundation)' : 'Surgeon Encounter',
    category: 'doctor_consultation',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    encounterId,
    performedBy: surgeonId,
    performedByName: surgeonName,
    performedByRole: 'surgeon',
    fee: patientFee, // Amount billed to patient
    staffShare: surgeonEarning, // Amount surgeon earns
    hospitalShare: patientFee - surgeonEarning, // Hospital keeps the rest
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: isNigerFoundation 
      ? 'Niger Foundation Hospital - Internal encounter' 
      : 'External encounter - Full billing applies',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record surgeon assistant earning based on surgical estimate
 */
export async function recordSurgeonAssistantEarning(
  surgeryId: string,
  patientId: string,
  assistantId: string,
  assistantName: string,
  hospitalId: string,
  surgicalEstimate: number // The total surgical fee estimate
): Promise<ActivityBillingRecord> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  const assistantEarning = surgicalEstimate * BILLING_RATES.ASSISTANT_PERCENTAGE;

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'SURG-ASSISTANT',
    activityCode: 'SURG-ASSISTANT',
    activityName: 'Surgeon Assistant Fee',
    category: 'procedure',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    encounterId: surgeryId,
    performedBy: assistantId,
    performedByName: assistantName,
    performedByRole: 'doctor',
    fee: assistantEarning, // Billed based on surgical estimate
    staffShare: assistantEarning, // Full amount to assistant
    hospitalShare: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: `Assistant fee (20% of surgical estimate: ₦${surgicalEstimate.toLocaleString()})`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record scrub nurse earning for surgery
 */
export async function recordScrubNurseEarning(
  surgeryId: string,
  patientId: string,
  nurseId: string,
  nurseName: string,
  hospitalId: string,
  procedureName: string
): Promise<ActivityBillingRecord> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'SURG-SCRUB',
    activityCode: 'SURG-SCRUB',
    activityName: 'Scrub Nurse - Surgery',
    category: 'nursing_service',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    encounterId: surgeryId,
    performedBy: nurseId,
    performedByName: nurseName,
    performedByRole: 'nurse',
    fee: BILLING_RATES.SCRUB_NURSE_FEE,
    staffShare: BILLING_RATES.SCRUB_NURSE_FEE, // Full amount to nurse
    hospitalShare: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: `Scrub nurse for: ${procedureName}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record circulating nurse earning for surgery
 */
export async function recordCirculatingNurseEarning(
  surgeryId: string,
  patientId: string,
  nurseId: string,
  nurseName: string,
  hospitalId: string,
  procedureName: string
): Promise<ActivityBillingRecord> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'SURG-CIRC',
    activityCode: 'SURG-CIRC',
    activityName: 'Circulating Nurse - Surgery',
    category: 'nursing_service',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    encounterId: surgeryId,
    performedBy: nurseId,
    performedByName: nurseName,
    performedByRole: 'nurse',
    fee: BILLING_RATES.CIRCULATING_NURSE_FEE,
    staffShare: BILLING_RATES.CIRCULATING_NURSE_FEE, // Full amount to nurse
    hospitalShare: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: `Circulating nurse for: ${procedureName}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record vital signs entry earning
 * ₦500 per entry to the recording user
 */
export async function recordVitalSignsEarning(
  vitalSignsId: string,
  patientId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  hospitalId: string
): Promise<ActivityBillingRecord> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'VITALS-ENTRY',
    activityCode: 'VITALS-ENTRY',
    activityName: 'Vital Signs Recording',
    category: 'nursing_service',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    performedBy: userId,
    performedByName: userName,
    performedByRole: userRole,
    fee: BILLING_RATES.VITAL_SIGNS_FEE,
    staffShare: BILLING_RATES.VITAL_SIGNS_FEE, // Full amount to user
    hospitalShare: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: `Vital signs record ID: ${vitalSignsId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record lab result upload earning
 * ₦500 per entry to the uploading user
 */
export async function recordLabResultUploadEarning(
  labRequestId: string,
  patientId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  hospitalId: string,
  testName?: string
): Promise<ActivityBillingRecord> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'LAB-UPLOAD',
    activityCode: 'LAB-UPLOAD',
    activityName: 'Lab Result Upload',
    category: 'laboratory',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    labRequestId,
    performedBy: userId,
    performedByName: userName,
    performedByRole: userRole,
    fee: BILLING_RATES.LAB_RESULT_UPLOAD_FEE,
    staffShare: BILLING_RATES.LAB_RESULT_UPLOAD_FEE, // Full amount to user
    hospitalShare: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: testName ? `Lab result: ${testName}` : `Lab request ID: ${labRequestId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record medication chart entry earning
 * ₦500 per DAY (not per medication) to the recording user
 * Only records once per user per day per patient
 */
export async function recordMedicationEntryEarning(
  medicationChartId: string,
  patientId: string,
  userId: string,
  userName: string,
  userRole: UserRole,
  hospitalId: string,
  _medicationName?: string // Kept for backward compatibility, not used
): Promise<ActivityBillingRecord | null> {
  const patient = await db.patients.get(patientId);
  if (!patient) throw new Error('Patient not found');

  // Check if earning already recorded for this user, patient, and date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingRecord = await db.activityBillingRecords
    .where('performedBy')
    .equals(userId)
    .filter(r => 
      r.activityCode === 'MED-ENTRY-DAILY' &&
      r.patientId === patientId &&
      r.performedAt &&
      new Date(r.performedAt) >= today &&
      new Date(r.performedAt) < tomorrow
    )
    .first();

  // Already recorded for this user/patient/day - skip
  if (existingRecord) {
    return null;
  }

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId: 'MED-ENTRY-DAILY',
    activityCode: 'MED-ENTRY-DAILY',
    activityName: 'Daily Medication Administration Record',
    category: 'nursing_service',
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hospitalNumber: patient.hospitalNumber,
    prescriptionId: medicationChartId,
    performedBy: userId,
    performedByName: userName,
    performedByRole: userRole,
    fee: BILLING_RATES.MEDICATION_RECORD_FEE,
    staffShare: BILLING_RATES.MEDICATION_RECORD_FEE, // Full amount to user
    hospitalShare: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    hospitalId,
    notes: `Daily medication record for ${patient.firstName} ${patient.lastName} - ${format(new Date(), 'PPP')}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  syncRecord('activityBillingRecords', record as unknown as Record<string, unknown>);
  
  return record;
}

/**
 * Record all surgical team earnings for a completed surgery
 */
export async function recordSurgeryTeamEarnings(
  surgeryId: string,
  patientId: string,
  hospitalId: string,
  procedureName: string,
  surgicalEstimate: number,
  team: {
    surgeonId?: string;
    surgeonName?: string;
    assistantId?: string;
    assistantName?: string;
    scrubNurseId?: string;
    scrubNurseName?: string;
    circulatingNurseId?: string;
    circulatingNurseName?: string;
  }
): Promise<void> {
  const records: Promise<ActivityBillingRecord>[] = [];

  // Record assistant earnings (20% of surgical estimate)
  if (team.assistantId && team.assistantName) {
    records.push(
      recordSurgeonAssistantEarning(
        surgeryId,
        patientId,
        team.assistantId,
        team.assistantName,
        hospitalId,
        surgicalEstimate
      )
    );
  }

  // Record scrub nurse earnings (₦3,000)
  if (team.scrubNurseId && team.scrubNurseName) {
    records.push(
      recordScrubNurseEarning(
        surgeryId,
        patientId,
        team.scrubNurseId,
        team.scrubNurseName,
        hospitalId,
        procedureName
      )
    );
  }

  // Record circulating nurse earnings (₦3,000)
  if (team.circulatingNurseId && team.circulatingNurseName) {
    records.push(
      recordCirculatingNurseEarning(
        surgeryId,
        patientId,
        team.circulatingNurseId,
        team.circulatingNurseName,
        hospitalId,
        procedureName
      )
    );
  }

  await Promise.all(records);
}

/**
 * Get total earnings for a staff member
 */
export async function getStaffTotalEarnings(
  staffId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEarnings: number;
  totalActivities: number;
  byCategory: Record<string, number>;
}> {
  let records = await db.activityBillingRecords
    .where('performedBy')
    .equals(staffId)
    .toArray();

  if (startDate) {
    records = records.filter(r => new Date(r.performedAt) >= startDate);
  }
  if (endDate) {
    records = records.filter(r => new Date(r.performedAt) <= endDate);
  }

  const totalEarnings = records.reduce((sum, r) => sum + (r.staffShare || 0), 0);
  const totalActivities = records.length;

  const byCategory: Record<string, number> = {};
  for (const record of records) {
    const category = record.category || 'other';
    byCategory[category] = (byCategory[category] || 0) + (record.staffShare || 0);
  }

  return { totalEarnings, totalActivities, byCategory };
}

/**
 * Get patient's total outstanding bill
 */
export async function getPatientOutstandingBill(patientId: string): Promise<{
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  records: ActivityBillingRecord[];
}> {
  const records = await db.activityBillingRecords
    .where('patientId')
    .equals(patientId)
    .toArray();

  const totalBilled = records.reduce((sum, r) => sum + (r.fee || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const outstanding = totalBilled - totalPaid;

  return { totalBilled, totalPaid, outstanding, records };
}

/**
 * Generate automatic bill summary for discharge
 */
export async function generateDischargeBillSummary(
  patientId: string,
  admissionId: string
): Promise<{
  admissionCharges: ActivityBillingRecord[];
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  summary: {
    encounters: number;
    surgeries: number;
    nursingCare: number;
    laboratory: number;
    medications: number;
    other: number;
  };
}> {
  // Get all billing records for this patient during admission
  const allRecords = await db.activityBillingRecords
    .where('patientId')
    .equals(patientId)
    .toArray();

  // Filter by admission ID if available, or get all unpaid
  const admissionCharges = admissionId 
    ? allRecords.filter(r => r.admissionId === admissionId || !r.admissionId)
    : allRecords.filter(r => r.paymentStatus !== 'paid');

  const totalBilled = admissionCharges.reduce((sum, r) => sum + (r.fee || 0), 0);
  const totalPaid = admissionCharges.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const outstanding = totalBilled - totalPaid;

  // Categorize charges
  const summary = {
    encounters: 0,
    surgeries: 0,
    nursingCare: 0,
    laboratory: 0,
    medications: 0,
    other: 0,
  };

  for (const record of admissionCharges) {
    const category = record.category || 'other';
    const amount = record.fee || 0;

    if (category.includes('consultation') || category.includes('doctor')) {
      summary.encounters += amount;
    } else if (category.includes('procedure') || category.includes('surgery')) {
      summary.surgeries += amount;
    } else if (category.includes('nursing')) {
      summary.nursingCare += amount;
    } else if (category.includes('laboratory') || category.includes('lab')) {
      summary.laboratory += amount;
    } else if (category.includes('pharmacy') || category.includes('medication')) {
      summary.medications += amount;
    } else {
      summary.other += amount;
    }
  }

  return { admissionCharges, totalBilled, totalPaid, outstanding, summary };
}
