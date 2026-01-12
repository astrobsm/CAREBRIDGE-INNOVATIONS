/**
 * Real-Time Billing Service
 * 
 * Automatically tracks all billable activities and updates patient billing in real-time.
 * Applies standard 25% discount to all fees.
 */

import { db } from '../database';
import { syncRecord } from './cloudSyncService';
import { v4 as uuidv4 } from 'uuid';
import type { ActivityBillingRecord } from '../types';

// Standard 25% discount rate
const STANDARD_DISCOUNT_RATE = 0.25;

// Apply 25% discount to fee
export function applyDiscount(originalFee: number): number {
  return Math.round(originalFee * (1 - STANDARD_DISCOUNT_RATE));
}

/**
 * Record a ward round activity for billing
 */
export async function recordWardRoundBilling(
  wardRoundId: string,
  patientId: string,
  performedBy: string,
  isConsultant: boolean = false
): Promise<void> {
  try {
    const patient = await db.patients.get(patientId);
    const performer = await db.users.get(performedBy);
    
    if (!patient || !performer) return;

    // Determine ward round fee based on role
    const activityCode = isConsultant ? 'WARD-CONS' : 'WARD-RES';
    const activityName = isConsultant ? 'Consultant Ward Round' : 'Resident Ward Round';
    const originalFee = isConsultant ? 20000 : 10000;
    const discountedFee = applyDiscount(originalFee);

    const billingRecord: ActivityBillingRecord = {
      id: uuidv4(),
      activityId: `activity_${activityCode}`,
      activityCode: activityCode,
      activityName: activityName,
      category: 'consultation' as any,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      hospitalId: patient.registeredHospitalId || '',
      performedBy,
      performedByName: `${performer.firstName} ${performer.lastName}`,
      performedByRole: performer.role,
      fee: discountedFee,
      originalFee: originalFee,
      discountRate: STANDARD_DISCOUNT_RATE,
      discountAmount: originalFee - discountedFee,
      staffShare: discountedFee * 0.5,
      hospitalShare: discountedFee * 0.5,
      paymentStatus: 'pending',
      amountPaid: 0,
      staffAmountPaid: 0,
      hospitalAmountPaid: 0,
      performedAt: new Date(),
      billedAt: new Date(),
      wardRoundId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.activityBillingRecords.add(billingRecord);
    await syncRecord('activityBillingRecords', billingRecord as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Error recording ward round billing:', error);
  }
}

/**
 * Record nursing review activity for billing
 */
export async function recordNursingReviewBilling(
  patientId: string,
  nurseId: string,
  activityType: 'assessment' | 'wound_care' | 'medication_admin' | 'vital_signs'
): Promise<void> {
  try {
    const patient = await db.patients.get(patientId);
    const nurse = await db.users.get(nurseId);
    
    if (!patient || !nurse) return;

    // Map activity types to billing codes
    const activityMap: Record<string, { code: string; name: string; fee: number }> = {
      'assessment': { code: 'NURS-ASS', name: 'Nursing Assessment', fee: 5000 },
      'wound_care': { code: 'NURS-WOUND', name: 'Wound Care', fee: 8000 },
      'medication_admin': { code: 'NURS-MED', name: 'Medication Administration', fee: 3000 },
      'vital_signs': { code: 'NURS-VS', name: 'Vital Signs Monitoring', fee: 2000 },
    };

    const activity = activityMap[activityType] || activityMap.assessment;
    const originalFee = activity.fee;
    const discountedFee = applyDiscount(originalFee);

    const billingRecord: ActivityBillingRecord = {
      id: uuidv4(),
      activityId: `activity_${activity.code}`,
      activityCode: activity.code,
      activityName: activity.name,
      category: 'nursing_service' as any,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      hospitalId: patient.registeredHospitalId || '',
      performedBy: nurseId,
      performedByName: `${nurse.firstName} ${nurse.lastName}`,
      performedByRole: nurse.role,
      fee: discountedFee,
      originalFee: originalFee,
      discountRate: STANDARD_DISCOUNT_RATE,
      discountAmount: originalFee - discountedFee,
      staffShare: discountedFee * 0.5,
      hospitalShare: discountedFee * 0.5,
      paymentStatus: 'pending',
      amountPaid: 0,
      staffAmountPaid: 0,
      hospitalAmountPaid: 0,
      performedAt: new Date(),
      billedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.activityBillingRecords.add(billingRecord);
    await syncRecord('activityBillingRecords', billingRecord as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Error recording nursing review billing:', error);
  }
}

/**
 * Record laboratory request for billing
 */
export async function recordLaboratoryBilling(
  labRequestId: string,
  patientId: string,
  requestedBy: string,
  tests: Array<{ name: string; category: string; }>
): Promise<void> {
  try {
    const patient = await db.patients.get(patientId);
    const requester = await db.users.get(requestedBy);
    
    if (!patient || !requester) return;

    // Calculate total lab fee based on number and types of tests
    let totalOriginalFee = 0;
    
    for (const test of tests) {
      // Base fees by category
      const categoryFees: Record<string, number> = {
        'haematology': 3000,
        'biochemistry': 4000,
        'microbiology': 5000,
        'immunology': 6000,
        'histopathology': 15000,
        'cytology': 10000,
      };
      
      totalOriginalFee += categoryFees[test.category] || 3000;
    }

    const discountedFee = applyDiscount(totalOriginalFee);

    const billingRecord: ActivityBillingRecord = {
      id: uuidv4(),
      activityId: 'LAB-REQ',
      activityCode: 'LAB-REQ',
      activityName: `Laboratory Tests (${tests.length} tests)`,
      category: 'laboratory',
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      hospitalId: patient.registeredHospitalId || '',
      performedBy: requestedBy,
      performedByName: `${requester.firstName} ${requester.lastName}`,
      performedByRole: requester.role,
      fee: discountedFee,
      originalFee: totalOriginalFee,
      discountRate: STANDARD_DISCOUNT_RATE,
      discountAmount: totalOriginalFee - discountedFee,
      staffShare: discountedFee * 0.5,
      hospitalShare: discountedFee * 0.5,
      paymentStatus: 'pending',
      amountPaid: 0,
      staffAmountPaid: 0,
      hospitalAmountPaid: 0,
      performedAt: new Date(),
      billedAt: new Date(),
      labRequestId,
      notes: `Tests: ${tests.map(t => t.name).join(', ')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.activityBillingRecords.add(billingRecord);
    await syncRecord('activityBillingRecords', billingRecord as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Error recording lab billing:', error);
  }
}

/**
 * Record NPWT session with consumables for billing
 */
export async function recordNPWTSessionBilling(
  npwtSessionId: string,
  patientId: string,
  performedBy: string,
  consumablesTotal: number
): Promise<void> {
  try {
    const patient = await db.patients.get(patientId);
    const performer = await db.users.get(performedBy);
    
    if (!patient || !performer) return;

    // NPWT session base fee + consumables
    const npwtBaseFee = 25000; // Base session fee
    const originalFee = npwtBaseFee + consumablesTotal;
    const discountedFee = applyDiscount(originalFee);

    const billingRecord: ActivityBillingRecord = {
      id: uuidv4(),
      activityId: 'NPWT-SESSION',
      activityCode: 'NPWT-SESSION',
      activityName: 'NPWT Dressing Change Session',
      category: 'wound_care',
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      hospitalId: patient.registeredHospitalId || '',
      performedBy,
      performedByName: `${performer.firstName} ${performer.lastName}`,
      performedByRole: performer.role,
      fee: discountedFee,
      originalFee: originalFee,
      discountRate: STANDARD_DISCOUNT_RATE,
      discountAmount: originalFee - discountedFee,
      staffShare: discountedFee * 0.5,
      hospitalShare: discountedFee * 0.5,
      paymentStatus: 'pending',
      amountPaid: 0,
      staffAmountPaid: 0,
      hospitalAmountPaid: 0,
      performedAt: new Date(),
      billedAt: new Date(),
      npwtSessionId,
      notes: `Base fee: ₦${npwtBaseFee.toLocaleString()}, Consumables: ₦${consumablesTotal.toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.activityBillingRecords.add(billingRecord);
    await syncRecord('activityBillingRecords', billingRecord as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Error recording NPWT billing:', error);
  }
}

/**
 * Record blood transfusion for billing
 */
export async function recordBloodTransfusionBilling(
  transfusionId: string,
  patientId: string,
  performedBy: string,
  unitsTransfused: number,
  bloodType: string
): Promise<void> {
  try {
    const patient = await db.patients.get(patientId);
    const performer = await db.users.get(performedBy);
    
    if (!patient || !performer) return;

    // Blood transfusion fee per unit
    const feePerUnit = 50000;
    const originalFee = feePerUnit * unitsTransfused;
    const discountedFee = applyDiscount(originalFee);

    const billingRecord: ActivityBillingRecord = {
      id: uuidv4(),
      activityId: 'BLOOD-TRANS',
      activityCode: 'BLOOD-TRANS',
      activityName: `Blood Transfusion - ${bloodType}`,
      category: 'procedure',
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      hospitalId: patient.registeredHospitalId || '',
      performedBy,
      performedByName: `${performer.firstName} ${performer.lastName}`,
      performedByRole: performer.role,
      fee: discountedFee,
      originalFee: originalFee,
      discountRate: STANDARD_DISCOUNT_RATE,
      discountAmount: originalFee - discountedFee,
      staffShare: discountedFee * 0.5,
      hospitalShare: discountedFee * 0.5,
      paymentStatus: 'pending',
      amountPaid: 0,
      staffAmountPaid: 0,
      hospitalAmountPaid: 0,
      performedAt: new Date(),
      billedAt: new Date(),
      transfusionId,
      notes: `${unitsTransfused} unit(s) of ${bloodType}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.activityBillingRecords.add(billingRecord);
    await syncRecord('activityBillingRecords', billingRecord as unknown as Record<string, unknown>);
  } catch (error) {
    console.error('Error recording blood transfusion billing:', error);
  }
}

/**
 * Get patient's current bill summary
 */
export async function getPatientBillingSummary(patientId: string): Promise<{
  totalCharges: number;
  totalPaid: number;
  balance: number;
  discountSavings: number;
  recordCount: number;
  pendingItems: ActivityBillingRecord[];
}> {
  try {
    const records = await db.activityBillingRecords
      .where('patientId')
      .equals(patientId)
      .toArray();

    const totalCharges = records.reduce((sum, r) => sum + r.fee, 0);
    const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
    const discountSavings = records.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
    const pendingItems = records.filter(r => r.paymentStatus === 'pending');

    return {
      totalCharges,
      totalPaid,
      balance: totalCharges - totalPaid,
      discountSavings,
      recordCount: records.length,
      pendingItems,
    };
  } catch (error) {
    console.error('Error getting billing summary:', error);
    return {
      totalCharges: 0,
      totalPaid: 0,
      balance: 0,
      discountSavings: 0,
      recordCount: 0,
      pendingItems: [],
    };
  }
}

/**
 * Record payment with evidence upload
 */
export async function recordPayment(
  recordIds: string[],
  amountPaid: number,
  paymentMethod: 'cash' | 'card' | 'transfer' | 'insurance',
  evidenceUrl?: string,
  notes?: string
): Promise<void> {
  try {
    for (const recordId of recordIds) {
      const record = await db.activityBillingRecords.get(recordId);
      if (!record) continue;

      const newAmountPaid = record.amountPaid + amountPaid;
      const isFullyPaid = newAmountPaid >= record.fee;

      await db.activityBillingRecords.update(recordId, {
        amountPaid: newAmountPaid,
        staffAmountPaid: newAmountPaid * 0.5,
        hospitalAmountPaid: newAmountPaid * 0.5,
        paymentStatus: isFullyPaid ? 'paid' : 'partial',
        paidAt: isFullyPaid ? new Date() : record.paidAt,
        paymentMethod,
        paymentEvidenceUrl: evidenceUrl,
        notes: notes || record.notes,
        updatedAt: new Date(),
      });

      const updated = await db.activityBillingRecords.get(recordId);
      if (updated) {
        await syncRecord('activityBillingRecords', updated as unknown as Record<string, unknown>);
      }
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Generate patient billing statement
 */
export async function generateBillingStatement(patientId: string): Promise<{
  patient: any;
  records: ActivityBillingRecord[];
  summary: Awaited<ReturnType<typeof getPatientBillingSummary>>;
}> {
  const patient = await db.patients.get(patientId);
  const records = await db.activityBillingRecords
    .where('patientId')
    .equals(patientId)
    .reverse()
    .sortBy('performedAt');
  const summary = await getPatientBillingSummary(patientId);

  return {
    patient,
    records,
    summary,
  };
}
