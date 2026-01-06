// Activity Billing Service - Tracks billable activities and revenue sharing
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import type { 
  ActivityBillingRecord, 
  StaffPatientAssignment, 
  PayrollPeriod,
  StaffPayrollRecord,
  UserRole,
  BillingCategory,
  StaffDashboardStats,
} from '../types';
import { 
  billableActivities, 
  getActivityById, 
  getActivitiesByRole,
  REVENUE_SHARE_CONFIG,
  type BillableActivity,
} from '../data/billingActivities';

// ============================================
// STAFF PATIENT ASSIGNMENT FUNCTIONS
// ============================================

export async function assignStaffToPatient(
  admissionId: string,
  patientId: string,
  patientName: string,
  hospitalNumber: string,
  staffId: string,
  staffName: string,
  staffRole: UserRole,
  assignmentType: 'primary' | 'secondary' | 'consultant' | 'nurse' | 'on_call',
  assignedBy: string,
  hospitalId: string,
  notes?: string
): Promise<StaffPatientAssignment> {
  const assignment: StaffPatientAssignment = {
    id: uuidv4(),
    admissionId,
    patientId,
    patientName,
    hospitalNumber,
    hospitalId,
    staffId,
    staffName,
    staffRole,
    assignmentType,
    assignedBy,
    assignedAt: new Date(),
    isActive: true,
    notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.staffPatientAssignments.add(assignment);
  return assignment;
}

export async function releaseStaffAssignment(
  assignmentId: string,
  relievedBy: string
): Promise<void> {
  await db.staffPatientAssignments.update(assignmentId, {
    isActive: false,
    relievedAt: new Date(),
    relievedBy,
    updatedAt: new Date(),
  });
}

export async function getActiveAssignmentsForPatient(
  patientId: string
): Promise<StaffPatientAssignment[]> {
  return db.staffPatientAssignments
    .where('patientId')
    .equals(patientId)
    .filter(a => a.isActive)
    .toArray();
}

export async function getActiveAssignmentsForStaff(
  staffId: string
): Promise<StaffPatientAssignment[]> {
  return db.staffPatientAssignments
    .where('staffId')
    .equals(staffId)
    .filter(a => a.isActive)
    .toArray();
}

export async function getAssignmentsByAdmission(
  admissionId: string
): Promise<StaffPatientAssignment[]> {
  return db.staffPatientAssignments
    .where('admissionId')
    .equals(admissionId)
    .toArray();
}

// ============================================
// ACTIVITY BILLING FUNCTIONS
// ============================================

export async function recordBillableActivity(
  activityId: string,
  patientId: string,
  patientName: string,
  hospitalNumber: string,
  performedBy: string,
  performedByName: string,
  performedByRole: UserRole,
  hospitalId: string,
  fee: number,
  options?: {
    encounterId?: string;
    admissionId?: string;
    wardRoundId?: string;
    labRequestId?: string;
    prescriptionId?: string;
    woundCareId?: string;
    notes?: string;
  }
): Promise<ActivityBillingRecord> {
  const activity = getActivityById(activityId);
  if (!activity) {
    throw new Error(`Activity ${activityId} not found`);
  }

  const staffShare = fee * REVENUE_SHARE_CONFIG.staffPercentage;
  const hospitalShare = fee * REVENUE_SHARE_CONFIG.hospitalPercentage;

  const record: ActivityBillingRecord = {
    id: uuidv4(),
    activityId,
    activityCode: activity.code,
    activityName: activity.name,
    category: activity.category as BillingCategory,
    patientId,
    patientName,
    hospitalNumber,
    encounterId: options?.encounterId,
    admissionId: options?.admissionId,
    wardRoundId: options?.wardRoundId,
    labRequestId: options?.labRequestId,
    prescriptionId: options?.prescriptionId,
    woundCareId: options?.woundCareId,
    performedBy,
    performedByName,
    performedByRole,
    fee,
    staffShare,
    hospitalShare,
    paymentStatus: 'pending',
    amountPaid: 0,
    staffAmountPaid: 0,
    hospitalAmountPaid: 0,
    performedAt: new Date(),
    billedAt: new Date(),
    notes: options?.notes,
    hospitalId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.activityBillingRecords.add(record);
  return record;
}

export async function recordPaymentForActivity(
  recordId: string,
  amountPaid: number,
  invoiceId?: string,
  invoiceItemId?: string
): Promise<void> {
  const record = await db.activityBillingRecords.get(recordId);
  if (!record) throw new Error('Billing record not found');

  const newAmountPaid = record.amountPaid + amountPaid;
  const staffAmountPaid = newAmountPaid * REVENUE_SHARE_CONFIG.staffPercentage;
  const hospitalAmountPaid = newAmountPaid * REVENUE_SHARE_CONFIG.hospitalPercentage;
  
  let paymentStatus: 'pending' | 'partial' | 'paid' | 'waived' = 'pending';
  if (newAmountPaid >= record.fee) {
    paymentStatus = 'paid';
  } else if (newAmountPaid > 0) {
    paymentStatus = 'partial';
  }

  await db.activityBillingRecords.update(recordId, {
    amountPaid: newAmountPaid,
    staffAmountPaid,
    hospitalAmountPaid,
    paymentStatus,
    paidAt: paymentStatus === 'paid' ? new Date() : undefined,
    invoiceId,
    invoiceItemId,
    updatedAt: new Date(),
  });
}

export async function waiveActivityFee(
  recordId: string,
  notes?: string
): Promise<void> {
  await db.activityBillingRecords.update(recordId, {
    paymentStatus: 'waived',
    notes: notes || 'Fee waived',
    updatedAt: new Date(),
  });
}

export async function getBillingRecordsForPatient(
  patientId: string
): Promise<ActivityBillingRecord[]> {
  return db.activityBillingRecords
    .where('patientId')
    .equals(patientId)
    .reverse()
    .sortBy('performedAt');
}

export async function getBillingRecordsForStaff(
  staffId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ActivityBillingRecord[]> {
  let records = await db.activityBillingRecords
    .where('performedBy')
    .equals(staffId)
    .toArray();
  
  if (startDate) {
    records = records.filter(r => r.performedAt >= startDate);
  }
  if (endDate) {
    records = records.filter(r => r.performedAt <= endDate);
  }
  
  return records.sort((a, b) => 
    new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );
}

export async function getPendingBillingRecords(
  hospitalId: string
): Promise<ActivityBillingRecord[]> {
  return db.activityBillingRecords
    .where('hospitalId')
    .equals(hospitalId)
    .filter(r => r.paymentStatus === 'pending' || r.paymentStatus === 'partial')
    .toArray();
}

// ============================================
// PAYROLL FUNCTIONS
// ============================================

export async function createPayrollPeriod(
  hospitalId: string,
  periodName: string,
  startDate: Date,
  endDate: Date
): Promise<PayrollPeriod> {
  const period: PayrollPeriod = {
    id: uuidv4(),
    hospitalId,
    periodName,
    startDate,
    endDate,
    status: 'open',
    totalBilled: 0,
    totalPaid: 0,
    totalStaffEarnings: 0,
    totalHospitalEarnings: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.payrollPeriods.add(period);
  return period;
}

export async function calculatePayrollForPeriod(
  payrollPeriodId: string
): Promise<StaffPayrollRecord[]> {
  const period = await db.payrollPeriods.get(payrollPeriodId);
  if (!period) throw new Error('Payroll period not found');

  // Get all billing records for the period
  const allRecords = await db.activityBillingRecords
    .where('hospitalId')
    .equals(period.hospitalId)
    .filter(r => 
      r.performedAt >= period.startDate && 
      r.performedAt <= period.endDate
    )
    .toArray();

  // Group by staff
  const staffRecords = new Map<string, ActivityBillingRecord[]>();
  for (const record of allRecords) {
    const existing = staffRecords.get(record.performedBy) || [];
    existing.push(record);
    staffRecords.set(record.performedBy, existing);
  }

  const payrollRecords: StaffPayrollRecord[] = [];
  let totalBilled = 0;
  let totalPaid = 0;
  let totalStaffEarnings = 0;

  for (const [staffId, records] of staffRecords) {
    const firstRecord = records[0];
    
    // Calculate totals
    const staffTotalBilled = records.reduce((sum, r) => sum + r.fee, 0);
    const staffTotalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
    const grossEarnings = staffTotalPaid * REVENUE_SHARE_CONFIG.staffPercentage;
    
    // Activities by category
    const activitiesByCategory: Record<BillingCategory, number> = {} as Record<BillingCategory, number>;
    for (const record of records) {
      activitiesByCategory[record.category] = (activitiesByCategory[record.category] || 0) + 1;
    }

    const payrollRecord: StaffPayrollRecord = {
      id: uuidv4(),
      payrollPeriodId,
      staffId,
      staffName: firstRecord.performedByName,
      staffRole: firstRecord.performedByRole,
      hospitalId: period.hospitalId,
      totalActivities: records.length,
      activitiesByCategory,
      totalBilled: staffTotalBilled,
      totalPaid: staffTotalPaid,
      grossEarnings,
      deductions: 0,
      netEarnings: grossEarnings,
      paymentStatus: 'pending',
      paidAmount: 0,
      activityRecords: records.map(r => r.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    payrollRecords.push(payrollRecord);
    await db.staffPayrollRecords.add(payrollRecord);

    totalBilled += staffTotalBilled;
    totalPaid += staffTotalPaid;
    totalStaffEarnings += grossEarnings;
  }

  // Update period totals
  await db.payrollPeriods.update(payrollPeriodId, {
    totalBilled,
    totalPaid,
    totalStaffEarnings,
    totalHospitalEarnings: totalPaid - totalStaffEarnings,
    status: 'processing',
    updatedAt: new Date(),
  });

  return payrollRecords;
}

export async function closePayrollPeriod(
  payrollPeriodId: string,
  closedBy: string
): Promise<void> {
  await db.payrollPeriods.update(payrollPeriodId, {
    status: 'closed',
    closedAt: new Date(),
    closedBy,
    updatedAt: new Date(),
  });
}

export async function markPayrollAsPaid(
  payrollRecordId: string,
  paymentReference?: string
): Promise<void> {
  const record = await db.staffPayrollRecords.get(payrollRecordId);
  if (!record) throw new Error('Payroll record not found');

  await db.staffPayrollRecords.update(payrollRecordId, {
    paymentStatus: 'paid',
    paidAmount: record.netEarnings,
    paidAt: new Date(),
    paymentReference,
    updatedAt: new Date(),
  });
}

// ============================================
// STAFF DASHBOARD STATS
// ============================================

export async function getStaffDashboardStats(
  staffId: string,
  period: 'today' | 'week' | 'month' | 'all' = 'month'
): Promise<StaffDashboardStats> {
  const now = new Date();
  let startDate: Date | undefined;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
      startDate = undefined;
      break;
  }

  // Get assigned patients
  const assignments = await getActiveAssignmentsForStaff(staffId);
  
  // Get billing records
  const billingRecords = await getBillingRecordsForStaff(staffId, startDate);
  
  // Calculate activity counts by category
  const activitiesByCategory: Record<string, number> = {};
  let encountersCompleted = 0;
  let wardRoundsCompleted = 0;
  let proceduresPerformed = 0;

  for (const record of billingRecords) {
    activitiesByCategory[record.category] = (activitiesByCategory[record.category] || 0) + 1;
    
    if (record.encounterId) encountersCompleted++;
    if (record.wardRoundId) wardRoundsCompleted++;
    if (record.category === 'procedure') proceduresPerformed++;
  }

  // Calculate earnings
  const totalBilled = billingRecords.reduce((sum, r) => sum + r.fee, 0);
  const paidRecords = billingRecords.filter(r => r.paymentStatus === 'paid');
  const paidAmount = paidRecords.reduce((sum, r) => sum + r.amountPaid, 0);
  const pendingPayment = billingRecords
    .filter(r => r.paymentStatus !== 'paid' && r.paymentStatus !== 'waived')
    .reduce((sum, r) => sum + r.fee - r.amountPaid, 0);
  const earnedAmount = paidAmount * REVENUE_SHARE_CONFIG.staffPercentage;

  return {
    staffId,
    period,
    assignedPatients: assignments.length,
    activePatients: assignments.filter(a => a.isActive).length,
    totalActivities: billingRecords.length,
    activitiesByCategory,
    totalBilled,
    pendingPayment,
    paidAmount,
    earnedAmount,
    encountersCompleted,
    wardRoundsCompleted,
    proceduresPerformed,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAvailableActivitiesForRole(role: UserRole): BillableActivity[] {
  return getActivitiesByRole(role);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export { billableActivities, REVENUE_SHARE_CONFIG };
