import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Hospital,
  Patient,
  VitalSigns,
  ClinicalEncounter,
  Surgery,
  Wound,
  BurnAssessment,
  LabRequest,
  Prescription,
  NutritionAssessment,
  Invoice,
  AuditLog,
  SyncStatus,
  Admission,
  AdmissionNote,
  BedAssignment,
  TreatmentPlan,
  TreatmentProgress,
  ChatRoom,
  ChatMessage,
  VideoConference,
  WardRound,
  DoctorPatientAssignment,
  NursePatientAssignment,
  Investigation,
  EnhancedVideoConference,
  DischargeSummary,
  ConsumableBOM,
  HistopathologyRequest,
  BloodTransfusion,
  MDTMeeting,
  NutritionPlan,
  LimbSalvageAssessment,
  BurnMonitoringRecord,
  EscharotomyRecord,
  SkinGraftRecord,
  BurnCarePlan,
  TransfusionOrder,
  TransfusionMonitoringChart,
  Appointment,
  AppointmentReminder,
  AppointmentSlot,
  ClinicSession,
  StaffPatientAssignment,
  ActivityBillingRecord,
  PayrollPeriod,
  StaffPayrollRecord,
  PostOperativeNote,
  Payslip,
  PreoperativeAssessment,
  ExternalReview,
  // New types for complete sync coverage
  Referral,
  PatientEducationRecord,
  CalculatorResult,
  UserSettings,
  HospitalSettings,
  MeetingMinutes,
  // Substance Use Disorder Assessment types
  SubstanceUseAssessment,
  DetoxMonitoringRecord,
  DetoxFollowUp,
  SubstanceUseConsent,
  SubstanceUseClinicalSummary,
  // Clinical Comments (Post-Submission Notes)
  ClinicalComment,
  // Investigation Approval Workflow
  InvestigationApprovalLog,
  // Keloid Care Planning
  KeloidCarePlanRecord,
  // Soft Tissue Infection
  STIAssessment,
  STIDebridementRecord,
} from '../types';
import type { DailyMedicationChart } from '../domains/medication-chart/types';
import type { NPWTSession, NPWTNotification } from '../domains/npwt/types';

// Re-export types for convenient access
export type { NPWTSession, NPWTNotification } from '../domains/npwt/types';

export class AstroHEALTHDatabase extends Dexie {
  users!: Table<User, string>;
  hospitals!: Table<Hospital, string>;
  patients!: Table<Patient, string>;
  vitalSigns!: Table<VitalSigns, string>;
  clinicalEncounters!: Table<ClinicalEncounter, string>;
  surgeries!: Table<Surgery, string>;
  wounds!: Table<Wound, string>;
  burnAssessments!: Table<BurnAssessment, string>;
  labRequests!: Table<LabRequest, string>;
  prescriptions!: Table<Prescription, string>;
  nutritionAssessments!: Table<NutritionAssessment, string>;
  invoices!: Table<Invoice, string>;
  auditLogs!: Table<AuditLog, string>;
  syncStatus!: Table<SyncStatus, string>;
  admissions!: Table<Admission, string>;
  admissionNotes!: Table<AdmissionNote, string>;
  bedAssignments!: Table<BedAssignment, string>;
  treatmentPlans!: Table<TreatmentPlan, string>;
  treatmentProgress!: Table<TreatmentProgress, string>;
  chatRooms!: Table<ChatRoom, string>;
  chatMessages!: Table<ChatMessage, string>;
  videoConferences!: Table<VideoConference, string>;
  // Ward rounds and investigations
  wardRounds!: Table<WardRound, string>;
  doctorAssignments!: Table<DoctorPatientAssignment, string>;
  nurseAssignments!: Table<NursePatientAssignment, string>;
  investigations!: Table<Investigation, string>;
  enhancedVideoConferences!: Table<EnhancedVideoConference, string>;
  // Discharge, consumables, and histopathology
  dischargeSummaries!: Table<DischargeSummary, string>;
  consumableBOMs!: Table<ConsumableBOM, string>;
  histopathologyRequests!: Table<HistopathologyRequest, string>;
  // Blood transfusion, MDT, and nutrition plans
  bloodTransfusions!: Table<BloodTransfusion, string>;
  mdtMeetings!: Table<MDTMeeting, string>;
  nutritionPlans!: Table<NutritionPlan, string>;
  // Limb Salvage Assessments
  limbSalvageAssessments!: Table<LimbSalvageAssessment, string>;
  // Burn Care Monitoring Tables
  burnMonitoringRecords!: Table<BurnMonitoringRecord, string>;
  escharotomyRecords!: Table<EscharotomyRecord, string>;
  skinGraftRecords!: Table<SkinGraftRecord, string>;
  burnCarePlans!: Table<BurnCarePlan, string>;
  // NPWT (Negative Pressure Wound Therapy)
  npwtSessions!: Table<NPWTSession, string>;
  npwtNotifications!: Table<NPWTNotification, string>;
  // Nurse Patient Assignments for Medication Charts
  nursePatientAssignments!: Table<NursePatientAssignment, string>;
  // Transfusion Orders and Monitoring Charts
  transfusionOrders!: Table<TransfusionOrder, string>;
  transfusionMonitoringCharts!: Table<TransfusionMonitoringChart, string>;
  // Appointment Diary Module
  appointments!: Table<Appointment, string>;
  appointmentReminders!: Table<AppointmentReminder, string>;
  appointmentSlots!: Table<AppointmentSlot, string>;
  clinicSessions!: Table<ClinicSession, string>;
  // Billing & Payroll
  staffPatientAssignments!: Table<StaffPatientAssignment, string>;
  activityBillingRecords!: Table<ActivityBillingRecord, string>;
  payrollPeriods!: Table<PayrollPeriod, string>;
  staffPayrollRecords!: Table<StaffPayrollRecord, string>;
  // Post-Operative Notes & Payslips
  postOperativeNotes!: Table<PostOperativeNote, string>;
  payslips!: Table<Payslip, string>;
  // Preoperative Assessments
  preoperativeAssessments!: Table<PreoperativeAssessment, string>;
  // Medication Charts
  medicationCharts!: Table<DailyMedicationChart, string>;
  // External Reviews (Admin only)
  externalReviews!: Table<ExternalReview, string>;
  // Referrals Module
  referrals!: Table<Referral, string>;
  // Patient Education Records
  patientEducationRecords!: Table<PatientEducationRecord, string>;
  // Calculator Results
  calculatorResults!: Table<CalculatorResult, string>;
  // User & Hospital Settings
  userSettings!: Table<UserSettings, string>;
  hospitalSettings!: Table<HospitalSettings, string>;
  // Meeting Minutes & Transcriptions
  meetingMinutes!: Table<MeetingMinutes, string>;
  // Substance Use Disorder Assessment & Detoxification
  substanceUseAssessments!: Table<SubstanceUseAssessment, string>;
  detoxMonitoringRecords!: Table<DetoxMonitoringRecord, string>;
  detoxFollowUps!: Table<DetoxFollowUp, string>;
  substanceUseConsents!: Table<SubstanceUseConsent, string>;
  substanceUseClinicalSummaries!: Table<SubstanceUseClinicalSummary, string>;
  // Clinical Comments (Post-Submission Notes)
  clinicalComments!: Table<ClinicalComment, string>;
  // Investigation Approval Workflow
  investigationApprovalLogs!: Table<InvestigationApprovalLog, string>;
  // Keloid Care Planning
  keloidCarePlans!: Table<KeloidCarePlanRecord, string>;
  // Soft Tissue Infection Assessments
  stiAssessments!: Table<STIAssessment, string>;
  stiDebridementRecords!: Table<STIDebridementRecord, string>;

  constructor() {
    super('AstroHEALTHDB');

    this.version(73).stores({
      users: 'id, email, role, hospitalId, isActive, createdAt',
      hospitals: 'id, name, city, state, type, isActive, createdAt',
      patients: 'id, hospitalNumber, firstName, lastName, phone, registeredHospitalId, isActive, createdAt',
      vitalSigns: 'id, patientId, encounterId, recordedAt',
      clinicalEncounters: 'id, patientId, hospitalId, type, status, attendingClinician, createdAt',
      surgeries: 'id, patientId, hospitalId, status, scheduledDate, surgeon, createdAt',
      wounds: 'id, patientId, encounterId, type, createdAt',
      burnAssessments: 'id, patientId, encounterId, createdAt',
      labRequests: 'id, patientId, hospitalId, status, requestedAt',
      prescriptions: 'id, patientId, hospitalId, status, prescribedAt',
      nutritionAssessments: 'id, patientId, assessedAt',
      invoices: 'id, invoiceNumber, patientId, hospitalId, status, createdAt',
      auditLogs: 'id, userId, entityType, entityId, timestamp',
      syncStatus: 'id, entityType, entityId, status',
      admissions: 'id, admissionNumber, patientId, hospitalId, status, wardType, primaryDoctor, primaryNurse, admissionDate, createdAt',
      admissionNotes: 'id, admissionId, noteType, authorId, createdAt',
      bedAssignments: 'id, admissionId, wardName, bedNumber, assignedFrom',
      treatmentPlans: 'id, patientId, relatedEntityId, relatedEntityType, status, startDate, createdAt',
      treatmentProgress: 'id, treatmentPlanId, date, recordedAt',
      chatRooms: 'id, type, hospitalId, patientId, lastMessageAt, createdBy, createdAt, isArchived',
      chatMessages: 'id, roomId, senderId, type, createdAt',
      videoConferences: 'id, hostId, status, roomCode, scheduledStart, hospitalId, patientId, createdAt',
      wardRounds: 'id, patientId, hospitalId, wardName, roundDate, roundType, status, leadDoctorId, createdAt',
      doctorAssignments: 'id, hospitalId, doctorId, patientId, assignmentType, status, assignedAt, createdAt',
      nurseAssignments: 'id, hospitalId, nurseId, patientId, shiftType, assignmentDate, status, createdAt',
      investigations: 'id, patientId, hospitalId, type, category, status, approvalStatus, requestedBy, requestedAt, approvedBy, approvedAt, createdAt',
      enhancedVideoConferences: 'id, roomId, hostId, hospitalId, type, status, scheduledAt, createdAt',
      // Discharge, consumables, and histopathology
      dischargeSummaries: 'id, patientId, admissionId, hospitalId, dischargeDate, dischargeType, dischargedBy, createdAt',
      consumableBOMs: 'id, patientId, encounterId, admissionId, serviceType, performedBy, performedAt, createdAt',
      histopathologyRequests: 'id, patientId, encounterId, surgeryId, status, requestedBy, requestDate, createdAt',
      // Blood transfusion, MDT, and nutrition plans
      bloodTransfusions: 'id, patientId, encounterId, admissionId, surgeryId, status, requestDate, createdAt',
      mdtMeetings: 'id, patientId, hospitalId, meetingType, status, meetingDate, createdAt',
      nutritionPlans: 'id, patientId, encounterId, admissionId, planType, status, startDate, createdAt',
      // Limb Salvage Assessments
      limbSalvageAssessments: 'id, patientId, encounterId, admissionId, hospitalId, status, assessmentDate, assessedBy, createdAt',
      // Burn Care Monitoring Tables
      burnMonitoringRecords: 'id, patientId, burnAssessmentId, admissionId, recordedAt, createdAt',
      escharotomyRecords: 'id, patientId, burnAssessmentId, performedAt, createdAt',
      skinGraftRecords: 'id, patientId, burnAssessmentId, surgeryId, performedAt, createdAt',
      burnCarePlans: 'id, patientId, burnAssessmentId, admissionId, status, createdAt',
      // NPWT (Negative Pressure Wound Therapy) Sessions
      npwtSessions: 'id, patientId, hospitalId, woundType, cycleType, cycleNumber, sessionDate, nextChangeDate, performedBy, createdAt',
      npwtNotifications: 'id, sessionId, patientId, scheduledTime, sent, createdAt',
      // Medication Charts (MAR)
      medicationCharts: 'id, patientId, hospitalId, admissionId, chartDate, shiftType, assignedNurseId, isCompleted, createdAt',
      nursePatientAssignments: 'id, nurseId, hospitalId, patientId, shiftDate, shiftType, isActive, createdAt',
      // Transfusion Orders and Monitoring Charts
      transfusionOrders: 'id, patientId, hospitalId, orderId, requestId, status, orderDate, orderedBy, createdAt',
      transfusionMonitoringCharts: 'id, patientId, transfusionOrderId, chartDate, status, uploadedChartUrl, ocrText, createdAt',
      // Appointment Diary Module
      appointments: 'id, appointmentNumber, patientId, hospitalId, appointmentDate, type, status, priority, clinicianId, bookedBy, createdAt',
      appointmentReminders: 'id, appointmentId, patientId, hospitalId, channel, scheduledFor, status, sentAt, createdAt',
      appointmentSlots: 'id, hospitalId, clinicianId, dayOfWeek, isActive, createdAt',
      clinicSessions: 'id, hospitalId, clinicianId, sessionDate, status, createdAt',
      // Billing & Payroll
      staffPatientAssignments: 'id, admissionId, patientId, staffId, staffRole, assignmentType, isActive, hospitalId, createdAt',
      activityBillingRecords: 'id, patientId, performedBy, performedByRole, category, paymentStatus, invoiceId, hospitalId, performedAt, createdAt',
      payrollPeriods: 'id, hospitalId, status, startDate, endDate, createdAt',
      staffPayrollRecords: 'id, payrollPeriodId, staffId, staffRole, paymentStatus, hospitalId, createdAt',
      // Post-Operative Notes & Payslips
      postOperativeNotes: 'id, surgeryId, patientId, hospitalId, admissionId, status, procedureDate, surgeonId, completedBy, createdAt',
      payslips: 'id, staffId, staffRole, hospitalId, periodId, paymentStatus, createdAt',
      // Preoperative Assessments
      preoperativeAssessments: 'id, patientId, surgeryName, surgeryType, scheduledDate, asaClass, status, clearanceStatus, assessedBy, createdAt',
      // External Reviews (Admin only)
      externalReviews: 'id, patientId, hospitalId, folderNumber, serviceDate, createdBy, createdAt',
      // Referrals Module
      referrals: 'id, referralNumber, patientId, fromHospitalId, toHospitalId, referralType, status, priority, referralDate, referredBy, createdAt',
      // Patient Education Records
      patientEducationRecords: 'id, patientId, hospitalId, encounterId, admissionId, topicId, category, educatorId, deliveredAt, createdAt',
      // Calculator Results
      calculatorResults: 'id, patientId, hospitalId, encounterId, calculatorType, calculatedBy, calculatedAt, createdAt',
      // User & Hospital Settings
      userSettings: 'id, userId, createdAt',
      hospitalSettings: 'id, hospitalId, createdAt',
      // Meeting Minutes & Transcriptions
      meetingMinutes: 'id, conferenceId, hospitalId, patientId, hostId, status, meetingDate, meetingType, createdAt',
      // Substance Use Disorder Assessment & Detoxification (CSUD-DSM)
      substanceUseAssessments: 'id, patientId, hospitalId, encounterId, admissionId, status, primarySubstance, assessedBy, assessmentDate, createdAt',
      detoxMonitoringRecords: 'id, assessmentId, patientId, recordedBy, recordedAt, createdAt',
      detoxFollowUps: 'id, assessmentId, patientId, status, scheduledDate, actualDate, createdAt',
      substanceUseConsents: 'id, assessmentId, consentTimestamp, createdAt',
      substanceUseClinicalSummaries: 'id, assessmentId, patientId, generatedAt, createdAt',
      // Clinical Comments (Post-Submission Notes)
      clinicalComments: 'id, entityType, entityId, [entityType+entityId], patientId, hospitalId, priority, authorId, isResolved, createdAt',
      // Investigation Approval Workflow
      investigationApprovalLogs: 'id, investigationId, patientId, hospitalId, action, performedBy, performedAt, labRequestId, createdAt',
      // Keloid Care Planning
      keloidCarePlans: 'id, patientId, hospitalId, status, createdBy, createdAt, updatedAt',
      // Soft Tissue Infection Assessments
      stiAssessments: 'id, patientId, hospitalId, classification, severity, status, assessedBy, createdAt, updatedAt',
      stiDebridementRecords: 'id, assessmentId, patientId, hospitalId, debridementNumber, debridementDate, surgeon, createdAt',
    });
  }
}

export const db = new AstroHEALTHDatabase();

// ============================================================
// AUTOMATIC AUDIT LOGGING
// Patches core Dexie Table methods (add, put, update, delete)
// to log all write operations to the auditLogs table.
// ============================================================

// Tables to skip auditing (avoid infinite loops and noise)
const AUDIT_SKIP_TABLES = new Set([
  'auditLogs',
  'syncStatus',
  'chatMessages',
  'webrtcSignaling',
]);

// Flag to suppress audit during bulk sync operations
let _auditSuppressed = false;

/** Suppress audit logging (e.g., during cloud sync pulls) */
export function suppressAudit() { _auditSuppressed = true; }

/** Re-enable audit logging */
export function resumeAudit() { _auditSuppressed = false; }

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 */
function writeAuditLog(
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  details?: { oldValue?: Record<string, unknown>; newValue?: Record<string, unknown> }
): void {
  if (_auditSuppressed) return;
  if (AUDIT_SKIP_TABLES.has(entityType)) return;

  try {
    const userId = localStorage.getItem('AstroHEALTH_user_id') || 'system';
    const entry = {
      id: uuidv4(),
      userId,
      action,
      entityType,
      entityId: String(entityId || 'unknown'),
      oldValue: details?.oldValue ? summarizeRecord(details.oldValue) : undefined,
      newValue: details?.newValue ? summarizeRecord(details.newValue) : undefined,
      timestamp: new Date(),
    };

    // Use a fresh transaction outside any current one
    db.transaction('rw!', db.auditLogs, async () => {
      await db.auditLogs.add(entry);
    }).catch((err) => {
      console.warn('[Audit] Failed to write log:', err?.message || err);
    });
  } catch (err) {
    console.warn('[Audit] Error preparing log:', err);
  }
}

/**
 * Patch all Dexie Table methods to automatically log write operations.
 */
function patchTablesForAudit() {
  let patchedCount = 0;

  for (const table of db.tables) {
    const tableName = table.name;
    if (AUDIT_SKIP_TABLES.has(tableName)) continue;

    // Save original methods
    const originalAdd = table.add.bind(table);
    const originalPut = table.put.bind(table);
    const originalUpdate = table.update.bind(table);
    const originalDelete = table.delete.bind(table);
    const originalBulkAdd = table.bulkAdd.bind(table);
    const originalBulkPut = table.bulkPut.bind(table);
    const originalBulkDelete = table.bulkDelete.bind(table);

    // Patch add()
    (table as any).add = async function (obj: any, key?: any) {
      const result = await originalAdd(obj, key);
      writeAuditLog('create', tableName, obj?.id || result, { newValue: obj });
      return result;
    };

    // Patch put()
    (table as any).put = async function (obj: any, key?: any) {
      const result = await originalPut(obj, key);
      writeAuditLog('update', tableName, obj?.id || key || result, { newValue: obj });
      return result;
    };

    // Patch update()
    (table as any).update = async function (key: any, changes: any) {
      const result = await originalUpdate(key, changes);
      if (result > 0) {
        writeAuditLog('update', tableName, key, { newValue: changes });
      }
      return result;
    };

    // Patch delete()
    (table as any).delete = async function (key: any) {
      const result = await originalDelete(key);
      writeAuditLog('delete', tableName, key);
      return result;
    };

    // Patch bulkAdd()
    (table as any).bulkAdd = async function (objects: any[], keys?: any, options?: any) {
      const result = await originalBulkAdd(objects, keys, options);
      for (const obj of objects) {
        writeAuditLog('create', tableName, obj?.id || 'bulk', { newValue: obj });
      }
      return result;
    };

    // Patch bulkPut()
    (table as any).bulkPut = async function (objects: any[], keys?: any, options?: any) {
      const result = await originalBulkPut(objects, keys, options);
      // Only log first 5 items of bulk ops to avoid flooding
      const logItems = objects.slice(0, 5);
      for (const obj of logItems) {
        writeAuditLog('update', tableName, obj?.id || 'bulk', { newValue: obj });
      }
      return result;
    };

    // Patch bulkDelete()
    (table as any).bulkDelete = async function (keys: any[]) {
      const result = await originalBulkDelete(keys);
      for (const key of keys.slice(0, 5)) {
        writeAuditLog('delete', tableName, key);
      }
      return result;
    };

    patchedCount++;
  }

  console.log('[Audit] Patched', patchedCount, 'tables for automatic activity logging');
}

/**
 * Create a concise summary of a record for audit logging.
 */
function summarizeRecord(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const summary: Record<string, unknown> = {};
  const MAX_FIELDS = 15;
  let count = 0;

  for (const [key, value] of Object.entries(obj)) {
    if (count >= MAX_FIELDS) {
      summary._truncated = true;
      break;
    }
    if (value instanceof ArrayBuffer || value instanceof Blob || value instanceof Uint8Array) {
      summary[key] = '[binary data]';
    } else if (typeof value === 'string' && value.length > 200) {
      summary[key] = value.substring(0, 200) + '...';
    } else if (Array.isArray(value) && value.length > 10) {
      summary[key] = `[Array(${value.length})]`;
    } else {
      summary[key] = value;
    }
    count++;
  }
  return summary;
}

// Patch tables immediately
patchTablesForAudit();

// Database utility functions
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

export async function exportData(): Promise<Record<string, unknown[]>> {
  const data: Record<string, unknown[]> = {};
  
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  
  return data;
}

export async function importData(data: Record<string, unknown[]>): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const [tableName, records] of Object.entries(data)) {
      const table = db.table(tableName);
      if (table) {
        await table.bulkPut(records);
      }
    }
  });
}

// Initialize with demo data if empty
export async function initializeDemoData(): Promise<void> {
  const hospitalCount = await db.hospitals.count();
  
  if (hospitalCount === 0) {
    // Add demo hospital
    await db.hospitals.add({
      id: 'hospital-1',
      name: 'AstroHEALTH General Hospital',
      address: '123 Healthcare Avenue',
      city: 'Lagos',
      state: 'Lagos',
      phone: '+234 902 872 4839',
      email: 'info.astrohealth@gmail.com',
      type: 'tertiary',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Ensure super admin user exists
  try {
    const superAdminEmail = 'douglas@carebridge.edu.ng';
    const existingSuperAdmin = await db.users.where('email').equals(superAdminEmail).first();
    
    if (!existingSuperAdmin) {
      await db.users.add({
        id: crypto.randomUUID(),
        email: superAdminEmail,
        password: 'BLACK@2velvet',
        firstName: 'Douglas',
        lastName: 'Admin',
        role: 'super_admin',
        hospitalId: 'hospital-1',
        isActive: true,
        hasAcceptedAgreement: true,
        agreementAcceptedAt: new Date().toISOString(),
        agreementVersion: '1.0',
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('[Database] Super admin user created: douglas@carebridge.edu.ng');
    }
  } catch (error) {
    // Ignore constraint errors - user may already exist from cloud sync
    console.log('[Database] Super admin already exists or could not be created');
  }
}
