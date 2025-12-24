import Dexie, { Table } from 'dexie';
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
} from '../types';

export class CareBridgeDatabase extends Dexie {
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
  // New tables for ward rounds and investigations
  wardRounds!: Table<WardRound, string>;
  doctorAssignments!: Table<DoctorPatientAssignment, string>;
  nurseAssignments!: Table<NursePatientAssignment, string>;
  investigations!: Table<Investigation, string>;
  enhancedVideoConferences!: Table<EnhancedVideoConference, string>;

  constructor() {
    super('CareBridgeDB');

    this.version(52).stores({
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
      // New tables
      wardRounds: 'id, hospitalId, wardName, roundDate, roundType, status, leadDoctorId, createdAt',
      doctorAssignments: 'id, hospitalId, doctorId, patientId, assignmentType, status, assignedAt, createdAt',
      nurseAssignments: 'id, hospitalId, nurseId, patientId, shiftType, assignmentDate, status, createdAt',
      investigations: 'id, patientId, hospitalId, type, category, status, requestedBy, requestedAt, createdAt',
      enhancedVideoConferences: 'id, roomId, hostId, hospitalId, type, status, scheduledAt, createdAt',
    });
  }
}

export const db = new CareBridgeDatabase();

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
      name: 'CareBridge General Hospital',
      address: '123 Healthcare Avenue',
      city: 'Lagos',
      state: 'Lagos',
      phone: '+234 800 123 4567',
      email: 'info@carebridge-hospital.ng',
      type: 'tertiary',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
