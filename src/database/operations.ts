// ============================================================
// AstroHEALTH Database Operations
// Comprehensive data access functions for all modules
// ============================================================

import { db } from './db';
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
  Admission,
  AdmissionNote,
  TreatmentPlan,
  TreatmentProgress,
  ChatRoom,
  ChatMessage,
  VideoConference,
  WardRound,
  DoctorPatientAssignment,
  NursePatientAssignment,
  Investigation,
  DischargeSummary,
  ConsumableBOM,
  HistopathologyRequest,
  BloodTransfusion,
  MDTMeeting,
  NutritionPlan,
  LimbSalvageAssessment,
  MeetingMinutes,
} from '../types';

// ============================================================
// PATIENT OPERATIONS
// ============================================================

export const PatientOps = {
  // Get all patients
  async getAll(): Promise<Patient[]> {
    return db.patients.filter(p => p.isActive === true).toArray();
  },

  // Get patient by ID
  async getById(id: string): Promise<Patient | undefined> {
    return db.patients.get(id);
  },

  // Get patient by hospital number
  async getByHospitalNumber(hospitalNumber: string): Promise<Patient | undefined> {
    return db.patients.where('hospitalNumber').equals(hospitalNumber).first();
  },

  // Search patients by name
  async searchByName(query: string): Promise<Patient[]> {
    const lowerQuery = query.toLowerCase();
    return db.patients
      .filter(p => 
        (p.firstName || '').toLowerCase().includes(lowerQuery) ||
        (p.lastName || '').toLowerCase().includes(lowerQuery) ||
        (p.hospitalNumber?.toLowerCase().includes(lowerQuery) ?? false)
      )
      .toArray();
  },

  // Get patients by hospital
  async getByHospital(hospitalId: string): Promise<Patient[]> {
    return db.patients.where('registeredHospitalId').equals(hospitalId).toArray();
  },

  // Create patient
  async create(patient: Patient): Promise<string> {
    try {
      const id = await db.patients.add(patient);
      console.log('[DB] Patient created successfully:', id);
      return id;
    } catch (error) {
      console.error('[DB] Error creating patient:', error);
      throw new Error(`Failed to create patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Update patient
  async update(id: string, updates: Partial<Patient>): Promise<number> {
    return db.patients.update(id, { ...updates, updatedAt: new Date() });
  },

  // Delete patient (soft delete)
  async delete(id: string): Promise<number> {
    return db.patients.update(id, { isActive: false, updatedAt: new Date() });
  },

  // Get patient with all related data
  async getWithDetails(id: string): Promise<{
    patient: Patient | undefined;
    vitals: VitalSigns[];
    encounters: ClinicalEncounter[];
    surgeries: Surgery[];
    admissions: Admission[];
    prescriptions: Prescription[];
    labRequests: LabRequest[];
    investigations: Investigation[];
  }> {
    const patient = await db.patients.get(id);
    const [vitalsRaw, encountersRaw, surgeriesRaw, admissionsRaw, prescriptionsRaw, labRequestsRaw, investigationsRaw] = await Promise.all([
      db.vitalSigns.where('patientId').equals(id).toArray(),
      db.clinicalEncounters.where('patientId').equals(id).toArray(),
      db.surgeries.where('patientId').equals(id).toArray(),
      db.admissions.where('patientId').equals(id).toArray(),
      db.prescriptions.where('patientId').equals(id).toArray(),
      db.labRequests.where('patientId').equals(id).toArray(),
      db.investigations.where('patientId').equals(id).toArray(),
    ]);
    
    // Sort all arrays by their respective date fields in descending order (newest first)
    const vitals = vitalsRaw.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const encounters = encountersRaw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const surgeries = surgeriesRaw.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    const admissions = admissionsRaw.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
    const prescriptions = prescriptionsRaw.sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime());
    const labRequests = labRequestsRaw.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    const investigations = investigationsRaw.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    
    return { patient, vitals, encounters, surgeries, admissions, prescriptions, labRequests, investigations };
  },
};

// ============================================================
// VITAL SIGNS OPERATIONS
// ============================================================

export const VitalSignsOps = {
  async getByPatient(patientId: string): Promise<VitalSigns[]> {
    const vitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
    // Sort by recordedAt descending (newest first)
    return vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  },

  async getLatest(patientId: string): Promise<VitalSigns | undefined> {
    const vitals = await db.vitalSigns
      .where('patientId')
      .equals(patientId)
      .toArray();
    // Sort by recordedAt descending (newest first) and get first
    vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    return vitals[0];
  },

  async create(vitals: VitalSigns): Promise<string> {
    return db.vitalSigns.add(vitals);
  },

  async update(id: string, updates: Partial<VitalSigns>): Promise<number> {
    return db.vitalSigns.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// CLINICAL ENCOUNTER OPERATIONS
// ============================================================

export const EncounterOps = {
  async getAll(): Promise<ClinicalEncounter[]> {
    return db.clinicalEncounters.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<ClinicalEncounter | undefined> {
    return db.clinicalEncounters.get(id);
  },

  async getByPatient(patientId: string): Promise<ClinicalEncounter[]> {
    return db.clinicalEncounters.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getByStatus(status: string): Promise<ClinicalEncounter[]> {
    return db.clinicalEncounters.where('status').equals(status).toArray();
  },

  async create(encounter: ClinicalEncounter): Promise<string> {
    return db.clinicalEncounters.add(encounter);
  },

  async update(id: string, updates: Partial<ClinicalEncounter>): Promise<number> {
    return db.clinicalEncounters.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// SURGERY OPERATIONS
// ============================================================

export const SurgeryOps = {
  async getAll(): Promise<Surgery[]> {
    return db.surgeries.reverse().sortBy('scheduledDate');
  },

  async getById(id: string): Promise<Surgery | undefined> {
    return db.surgeries.get(id);
  },

  async getByPatient(patientId: string): Promise<Surgery[]> {
    return db.surgeries.where('patientId').equals(patientId).reverse().sortBy('scheduledDate');
  },

  async getByStatus(status: string): Promise<Surgery[]> {
    return db.surgeries.where('status').equals(status).toArray();
  },

  async getScheduledToday(): Promise<Surgery[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return db.surgeries
      .where('scheduledDate')
      .between(today, tomorrow)
      .toArray();
  },

  async create(surgery: Surgery): Promise<string> {
    return db.surgeries.add(surgery);
  },

  async update(id: string, updates: Partial<Surgery>): Promise<number> {
    return db.surgeries.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// ADMISSION OPERATIONS
// ============================================================

export const AdmissionOps = {
  async getAll(): Promise<Admission[]> {
    return db.admissions.reverse().sortBy('admissionDate');
  },

  async getById(id: string): Promise<Admission | undefined> {
    return db.admissions.get(id);
  },

  async getByPatient(patientId: string): Promise<Admission[]> {
    return db.admissions.where('patientId').equals(patientId).reverse().sortBy('admissionDate');
  },

  async getActive(): Promise<Admission[]> {
    return db.admissions.where('status').equals('active').toArray();
  },

  async getActiveByPatient(patientId: string): Promise<Admission | undefined> {
    return db.admissions
      .where(['patientId', 'status'])
      .equals([patientId, 'active'])
      .first();
  },

  async getByWard(wardName: string): Promise<Admission[]> {
    return db.admissions
      .where('status').equals('active')
      .filter(a => a.wardName === wardName)
      .toArray();
  },

  async create(admission: Admission): Promise<string> {
    return db.admissions.add(admission);
  },

  async update(id: string, updates: Partial<Admission>): Promise<number> {
    return db.admissions.update(id, { ...updates, updatedAt: new Date() });
  },

  async discharge(id: string, dischargeData: Partial<Admission>): Promise<number> {
    return db.admissions.update(id, {
      ...dischargeData,
      status: 'discharged',
      dischargeDate: new Date(),
      updatedAt: new Date(),
    });
  },
};

// ============================================================
// ADMISSION NOTES OPERATIONS
// ============================================================

export const AdmissionNotesOps = {
  async getByAdmission(admissionId: string): Promise<AdmissionNote[]> {
    return db.admissionNotes.where('admissionId').equals(admissionId).reverse().sortBy('createdAt');
  },

  async create(note: AdmissionNote): Promise<string> {
    return db.admissionNotes.add(note);
  },

  async update(id: string, updates: Partial<AdmissionNote>): Promise<number> {
    return db.admissionNotes.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// WOUND OPERATIONS
// ============================================================

export const WoundOps = {
  async getAll(): Promise<Wound[]> {
    return db.wounds.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<Wound | undefined> {
    return db.wounds.get(id);
  },

  async getByPatient(patientId: string): Promise<Wound[]> {
    return db.wounds.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async create(wound: Wound): Promise<string> {
    return db.wounds.add(wound);
  },

  async update(id: string, updates: Partial<Wound>): Promise<number> {
    return db.wounds.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// BURN ASSESSMENT OPERATIONS
// ============================================================

export const BurnOps = {
  async getAll(): Promise<BurnAssessment[]> {
    return db.burnAssessments.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<BurnAssessment | undefined> {
    return db.burnAssessments.get(id);
  },

  async getByPatient(patientId: string): Promise<BurnAssessment[]> {
    return db.burnAssessments.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async create(burn: BurnAssessment): Promise<string> {
    return db.burnAssessments.add(burn);
  },

  async update(id: string, updates: Partial<BurnAssessment>): Promise<number> {
    return db.burnAssessments.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// LAB REQUEST OPERATIONS
// ============================================================

export const LabRequestOps = {
  async getAll(): Promise<LabRequest[]> {
    return db.labRequests.reverse().sortBy('requestedAt');
  },

  async getById(id: string): Promise<LabRequest | undefined> {
    return db.labRequests.get(id);
  },

  async getByPatient(patientId: string): Promise<LabRequest[]> {
    return db.labRequests.where('patientId').equals(patientId).reverse().sortBy('requestedAt');
  },

  async getByStatus(status: string): Promise<LabRequest[]> {
    return db.labRequests.where('status').equals(status).toArray();
  },

  async getPending(): Promise<LabRequest[]> {
    return db.labRequests.where('status').anyOf(['pending', 'collected', 'processing']).toArray();
  },

  async create(request: LabRequest): Promise<string> {
    return db.labRequests.add(request);
  },

  async update(id: string, updates: Partial<LabRequest>): Promise<number> {
    return db.labRequests.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// INVESTIGATION OPERATIONS
// ============================================================

export const InvestigationOps = {
  async getAll(): Promise<Investigation[]> {
    return db.investigations.reverse().sortBy('requestedAt');
  },

  async getById(id: string): Promise<Investigation | undefined> {
    return db.investigations.get(id);
  },

  async getByPatient(patientId: string): Promise<Investigation[]> {
    return db.investigations.where('patientId').equals(patientId).reverse().sortBy('requestedAt');
  },

  async getByStatus(status: string): Promise<Investigation[]> {
    return db.investigations.where('status').equals(status).toArray();
  },

  async getByCategory(category: string): Promise<Investigation[]> {
    return db.investigations.where('category').equals(category).toArray();
  },

  async getPending(): Promise<Investigation[]> {
    return db.investigations.where('status').anyOf(['requested', 'collected', 'processing']).toArray();
  },

  async create(investigation: Investigation): Promise<string> {
    return db.investigations.add(investigation);
  },

  async update(id: string, updates: Partial<Investigation>): Promise<number> {
    return db.investigations.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// PRESCRIPTION OPERATIONS
// ============================================================

export const PrescriptionOps = {
  async getAll(): Promise<Prescription[]> {
    return db.prescriptions.reverse().sortBy('prescribedAt');
  },

  async getById(id: string): Promise<Prescription | undefined> {
    return db.prescriptions.get(id);
  },

  async getByPatient(patientId: string): Promise<Prescription[]> {
    return db.prescriptions.where('patientId').equals(patientId).reverse().sortBy('prescribedAt');
  },

  async getByStatus(status: string): Promise<Prescription[]> {
    return db.prescriptions.where('status').equals(status).toArray();
  },

  async getPending(): Promise<Prescription[]> {
    return db.prescriptions.where('status').anyOf(['pending', 'partially_dispensed']).toArray();
  },

  async create(prescription: Prescription): Promise<string> {
    return db.prescriptions.add(prescription);
  },

  async update(id: string, updates: Partial<Prescription>): Promise<number> {
    return db.prescriptions.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// NUTRITION OPERATIONS
// ============================================================

export const NutritionOps = {
  // Assessments
  async getAllAssessments(): Promise<NutritionAssessment[]> {
    return db.nutritionAssessments.reverse().sortBy('assessedAt');
  },

  async getAssessmentById(id: string): Promise<NutritionAssessment | undefined> {
    return db.nutritionAssessments.get(id);
  },

  async getAssessmentsByPatient(patientId: string): Promise<NutritionAssessment[]> {
    return db.nutritionAssessments.where('patientId').equals(patientId).reverse().sortBy('assessedAt');
  },

  async createAssessment(assessment: NutritionAssessment): Promise<string> {
    return db.nutritionAssessments.add(assessment);
  },

  async updateAssessment(id: string, updates: Partial<NutritionAssessment>): Promise<number> {
    return db.nutritionAssessments.update(id, { ...updates, updatedAt: new Date() });
  },

  // Plans
  async getAllPlans(): Promise<NutritionPlan[]> {
    return db.nutritionPlans.reverse().sortBy('createdAt');
  },

  async getPlanById(id: string): Promise<NutritionPlan | undefined> {
    return db.nutritionPlans.get(id);
  },

  async getPlansByPatient(patientId: string): Promise<NutritionPlan[]> {
    return db.nutritionPlans.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getActivePlan(patientId: string): Promise<NutritionPlan | undefined> {
    return db.nutritionPlans
      .where('patientId').equals(patientId)
      .filter(p => p.status === 'active')
      .first();
  },

  async createPlan(plan: NutritionPlan): Promise<string> {
    return db.nutritionPlans.add(plan);
  },

  async updatePlan(id: string, updates: Partial<NutritionPlan>): Promise<number> {
    return db.nutritionPlans.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// TREATMENT PLAN OPERATIONS
// ============================================================

export const TreatmentPlanOps = {
  async getAll(): Promise<TreatmentPlan[]> {
    return db.treatmentPlans.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<TreatmentPlan | undefined> {
    return db.treatmentPlans.get(id);
  },

  async getByPatient(patientId: string): Promise<TreatmentPlan[]> {
    return db.treatmentPlans.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getActive(): Promise<TreatmentPlan[]> {
    return db.treatmentPlans.where('status').equals('active').toArray();
  },

  async getByRelatedEntity(entityId: string, entityType: string): Promise<TreatmentPlan[]> {
    return db.treatmentPlans
      .where('relatedEntityId').equals(entityId)
      .filter(p => p.relatedEntityType === entityType)
      .toArray();
  },

  async create(plan: TreatmentPlan): Promise<string> {
    return db.treatmentPlans.add(plan);
  },

  async update(id: string, updates: Partial<TreatmentPlan>): Promise<number> {
    return db.treatmentPlans.update(id, { ...updates, updatedAt: new Date() });
  },

  // Progress
  async getProgress(planId: string): Promise<TreatmentProgress[]> {
    return db.treatmentProgress.where('treatmentPlanId').equals(planId).reverse().sortBy('recordedAt');
  },

  async addProgress(progress: TreatmentProgress): Promise<string> {
    return db.treatmentProgress.add(progress);
  },
};

// ============================================================
// INVOICE OPERATIONS
// ============================================================

export const InvoiceOps = {
  async getAll(): Promise<Invoice[]> {
    return db.invoices.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<Invoice | undefined> {
    return db.invoices.get(id);
  },

  async getByPatient(patientId: string): Promise<Invoice[]> {
    return db.invoices.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getByStatus(status: string): Promise<Invoice[]> {
    return db.invoices.where('status').equals(status).toArray();
  },

  async getPending(): Promise<Invoice[]> {
    return db.invoices.where('status').anyOf(['pending', 'partial', 'overdue']).toArray();
  },

  async create(invoice: Invoice): Promise<string> {
    return db.invoices.add(invoice);
  },

  async update(id: string, updates: Partial<Invoice>): Promise<number> {
    return db.invoices.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// WARD ROUND OPERATIONS
// ============================================================

export const WardRoundOps = {
  async getAll(): Promise<WardRound[]> {
    return db.wardRounds.reverse().sortBy('roundDate');
  },

  async getById(id: string): Promise<WardRound | undefined> {
    return db.wardRounds.get(id);
  },

  async getByWard(wardName: string): Promise<WardRound[]> {
    return db.wardRounds.where('wardName').equals(wardName).reverse().sortBy('roundDate');
  },

  async getToday(): Promise<WardRound[]> {
    const today = new Date().toISOString().split('T')[0];
    return db.wardRounds.where('roundDate').equals(today).toArray();
  },

  async create(round: WardRound): Promise<string> {
    return db.wardRounds.add(round);
  },

  async update(id: string, updates: Partial<WardRound>): Promise<number> {
    return db.wardRounds.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// DISCHARGE SUMMARY OPERATIONS
// ============================================================

export const DischargeSummaryOps = {
  async getAll(): Promise<DischargeSummary[]> {
    return db.dischargeSummaries.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<DischargeSummary | undefined> {
    return db.dischargeSummaries.get(id);
  },

  async getByPatient(patientId: string): Promise<DischargeSummary[]> {
    return db.dischargeSummaries.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getByAdmission(admissionId: string): Promise<DischargeSummary | undefined> {
    return db.dischargeSummaries.where('admissionId').equals(admissionId).first();
  },

  async create(summary: DischargeSummary): Promise<string> {
    return db.dischargeSummaries.add(summary);
  },

  async update(id: string, updates: Partial<DischargeSummary>): Promise<number> {
    return db.dischargeSummaries.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// BLOOD TRANSFUSION OPERATIONS
// ============================================================

export const BloodTransfusionOps = {
  async getAll(): Promise<BloodTransfusion[]> {
    return db.bloodTransfusions.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<BloodTransfusion | undefined> {
    return db.bloodTransfusions.get(id);
  },

  async getByPatient(patientId: string): Promise<BloodTransfusion[]> {
    return db.bloodTransfusions.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getByStatus(status: string): Promise<BloodTransfusion[]> {
    return db.bloodTransfusions.where('status').equals(status).toArray();
  },

  async getPending(): Promise<BloodTransfusion[]> {
    return db.bloodTransfusions.where('status').anyOf(['requested', 'crossmatched', 'ready']).toArray();
  },

  async create(transfusion: BloodTransfusion): Promise<string> {
    return db.bloodTransfusions.add(transfusion);
  },

  async update(id: string, updates: Partial<BloodTransfusion>): Promise<number> {
    return db.bloodTransfusions.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// MDT MEETING OPERATIONS
// ============================================================

export const MDTMeetingOps = {
  async getAll(): Promise<MDTMeeting[]> {
    return db.mdtMeetings.reverse().sortBy('meetingDate');
  },

  async getById(id: string): Promise<MDTMeeting | undefined> {
    return db.mdtMeetings.get(id);
  },

  async getByPatient(patientId: string): Promise<MDTMeeting[]> {
    return db.mdtMeetings.where('patientId').equals(patientId).reverse().sortBy('meetingDate');
  },

  async getUpcoming(): Promise<MDTMeeting[]> {
    const now = new Date();
    return db.mdtMeetings
      .where('status').equals('scheduled')
      .filter(m => new Date(m.meetingDate) >= now)
      .toArray();
  },

  async create(meeting: MDTMeeting): Promise<string> {
    return db.mdtMeetings.add(meeting);
  },

  async update(id: string, updates: Partial<MDTMeeting>): Promise<number> {
    return db.mdtMeetings.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// HISTOPATHOLOGY OPERATIONS
// ============================================================

export const HistopathologyOps = {
  async getAll(): Promise<HistopathologyRequest[]> {
    return db.histopathologyRequests.reverse().sortBy('createdAt');
  },

  async getById(id: string): Promise<HistopathologyRequest | undefined> {
    return db.histopathologyRequests.get(id);
  },

  async getByPatient(patientId: string): Promise<HistopathologyRequest[]> {
    return db.histopathologyRequests.where('patientId').equals(patientId).reverse().sortBy('createdAt');
  },

  async getByStatus(status: string): Promise<HistopathologyRequest[]> {
    return db.histopathologyRequests.where('status').equals(status).toArray();
  },

  async getPending(): Promise<HistopathologyRequest[]> {
    return db.histopathologyRequests.where('status').anyOf(['pending', 'received', 'processing']).toArray();
  },

  async create(request: HistopathologyRequest): Promise<string> {
    return db.histopathologyRequests.add(request);
  },

  async update(id: string, updates: Partial<HistopathologyRequest>): Promise<number> {
    return db.histopathologyRequests.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// CONSUMABLE BOM OPERATIONS
// ============================================================

export const ConsumableBOMOps = {
  async getAll(): Promise<ConsumableBOM[]> {
    return db.consumableBOMs.reverse().sortBy('performedAt');
  },

  async getById(id: string): Promise<ConsumableBOM | undefined> {
    return db.consumableBOMs.get(id);
  },

  async getByPatient(patientId: string): Promise<ConsumableBOM[]> {
    return db.consumableBOMs.where('patientId').equals(patientId).reverse().sortBy('performedAt');
  },

  async getByServiceType(serviceType: string): Promise<ConsumableBOM[]> {
    return db.consumableBOMs.where('serviceType').equals(serviceType).toArray();
  },

  async create(bom: ConsumableBOM): Promise<string> {
    return db.consumableBOMs.add(bom);
  },

  async update(id: string, updates: Partial<ConsumableBOM>): Promise<number> {
    return db.consumableBOMs.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// HOSPITAL OPERATIONS
// ============================================================

export const HospitalOps = {
  async getAll(): Promise<Hospital[]> {
    return db.hospitals.filter(h => h.isActive === true).toArray();
  },

  async getById(id: string): Promise<Hospital | undefined> {
    return db.hospitals.get(id);
  },

  async create(hospital: Hospital): Promise<string> {
    return db.hospitals.add(hospital);
  },

  async update(id: string, updates: Partial<Hospital>): Promise<number> {
    return db.hospitals.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// USER OPERATIONS
// ============================================================

export const UserOps = {
  async getAll(): Promise<User[]> {
    return db.users.filter(u => u.isActive === true).toArray();
  },

  async getById(id: string): Promise<User | undefined> {
    return db.users.get(id);
  },

  async getByEmail(email: string): Promise<User | undefined> {
    return db.users.where('email').equals(email).first();
  },

  async getByRole(role: string): Promise<User[]> {
    return db.users.where('role').equals(role).toArray();
  },

  async getByHospital(hospitalId: string): Promise<User[]> {
    return db.users.where('hospitalId').equals(hospitalId).toArray();
  },

  async getDoctors(): Promise<User[]> {
    return db.users.where('role').anyOf(['surgeon', 'anaesthetist']).toArray();
  },

  async getNurses(): Promise<User[]> {
    return db.users.where('role').equals('nurse').toArray();
  },

  async create(user: User): Promise<string> {
    return db.users.add(user);
  },

  async update(id: string, updates: Partial<User>): Promise<number> {
    return db.users.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// CHAT OPERATIONS
// ============================================================

export const ChatOps = {
  // Rooms
  async getAllRooms(): Promise<ChatRoom[]> {
    const rooms = await db.chatRooms.filter(r => r.isArchived === false).toArray();
    return rooms.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
  },

  async getRoomById(id: string): Promise<ChatRoom | undefined> {
    return db.chatRooms.get(id);
  },

  async getRoomsByPatient(patientId: string): Promise<ChatRoom[]> {
    return db.chatRooms.where('patientId').equals(patientId).toArray();
  },

  async createRoom(room: ChatRoom): Promise<string> {
    return db.chatRooms.add(room);
  },

  async updateRoom(id: string, updates: Partial<ChatRoom>): Promise<number> {
    return db.chatRooms.update(id, { ...updates, updatedAt: new Date() });
  },

  // Messages
  async getMessages(roomId: string): Promise<ChatMessage[]> {
    return db.chatMessages.where('roomId').equals(roomId).sortBy('createdAt');
  },

  async sendMessage(message: ChatMessage): Promise<string> {
    const messageId = await db.chatMessages.add(message);
    await db.chatRooms.update(message.roomId, { lastMessageAt: new Date(), updatedAt: new Date() });
    return messageId;
  },
};

// ============================================================
// VIDEO CONFERENCE OPERATIONS
// ============================================================

export const VideoConferenceOps = {
  async getAll(): Promise<VideoConference[]> {
    return db.videoConferences.reverse().sortBy('scheduledStart');
  },

  async getById(id: string): Promise<VideoConference | undefined> {
    return db.videoConferences.get(id);
  },

  async getByRoomCode(roomCode: string): Promise<VideoConference | undefined> {
    return db.videoConferences.where('roomCode').equals(roomCode).first();
  },

  async getUpcoming(): Promise<VideoConference[]> {
    const now = new Date();
    return db.videoConferences
      .where('status').anyOf(['scheduled', 'in-progress'])
      .filter(v => v.scheduledStart ? new Date(v.scheduledStart) >= now : false)
      .toArray();
  },

  async create(conference: VideoConference): Promise<string> {
    return db.videoConferences.add(conference);
  },

  async update(id: string, updates: Partial<VideoConference>): Promise<number> {
    return db.videoConferences.update(id, { ...updates, updatedAt: new Date() });
  },
};

// ============================================================
// DOCTOR/NURSE ASSIGNMENT OPERATIONS
// ============================================================

export const AssignmentOps = {
  // Doctor assignments
  async getDoctorAssignments(doctorId: string): Promise<DoctorPatientAssignment[]> {
    return db.doctorAssignments.where('doctorId').equals(doctorId).toArray();
  },

  async getPatientDoctors(patientId: string): Promise<DoctorPatientAssignment[]> {
    return db.doctorAssignments.where('patientId').equals(patientId).toArray();
  },

  async createDoctorAssignment(assignment: DoctorPatientAssignment): Promise<string> {
    return db.doctorAssignments.add(assignment);
  },

  // Nurse assignments
  async getNurseAssignments(nurseId: string): Promise<NursePatientAssignment[]> {
    return db.nurseAssignments.where('nurseId').equals(nurseId).toArray();
  },

  async getPatientNurses(patientId: string): Promise<NursePatientAssignment[]> {
    return db.nurseAssignments.where('patientId').equals(patientId).toArray();
  },

  async createNurseAssignment(assignment: NursePatientAssignment): Promise<string> {
    return db.nurseAssignments.add(assignment);
  },
};

// ============================================================
// DASHBOARD STATISTICS
// ============================================================

export const DashboardOps = {
  async getStats(): Promise<{
    totalPatients: number;
    activeAdmissions: number;
    todaySurgeries: number;
    pendingLabs: number;
    pendingInvestigations: number;
    pendingPrescriptions: number;
  }> {
    const [
      totalPatients,
      activeAdmissions,
      todaySurgeries,
      pendingLabs,
      pendingInvestigations,
      pendingPrescriptions,
    ] = await Promise.all([
      db.patients.filter(p => p.isActive === true).count(),
      db.admissions.where('status').equals('active').count(),
      SurgeryOps.getScheduledToday().then(s => s.length),
      db.labRequests.where('status').anyOf(['pending', 'collected', 'processing']).count(),
      db.investigations.where('status').anyOf(['requested', 'collected', 'processing']).count(),
      db.prescriptions.where('status').anyOf(['pending', 'partially_dispensed']).count(),
    ]);

    return {
      totalPatients,
      activeAdmissions,
      todaySurgeries,
      pendingLabs,
      pendingInvestigations,
      pendingPrescriptions,
    };
  },

  async getRecentActivity(): Promise<{
    recentAdmissions: Admission[];
    recentSurgeries: Surgery[];
    recentEncounters: ClinicalEncounter[];
  }> {
    const [recentAdmissions, recentSurgeries, recentEncounters] = await Promise.all([
      db.admissions.reverse().sortBy('createdAt').then(a => a.slice(0, 5)),
      db.surgeries.reverse().sortBy('createdAt').then(s => s.slice(0, 5)),
      db.clinicalEncounters.reverse().sortBy('createdAt').then(e => e.slice(0, 5)),
    ]);

    return { recentAdmissions, recentSurgeries, recentEncounters };
  },
};

// ============================================================
// LIMB SALVAGE OPERATIONS
// ============================================================

export const LimbSalvageOps = {
  // Get all assessments
  async getAll(): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments.reverse().sortBy('assessmentDate');
  },

  // Get assessment by ID
  async getById(id: string): Promise<LimbSalvageAssessment | undefined> {
    return db.limbSalvageAssessments.get(id);
  },

  // Get assessments by patient ID
  async getByPatient(patientId: string): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments
      .where('patientId')
      .equals(patientId)
      .reverse()
      .sortBy('assessmentDate');
  },

  // Get assessments by status
  async getByStatus(status: 'draft' | 'completed' | 'reviewed'): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments
      .where('status')
      .equals(status)
      .reverse()
      .sortBy('assessmentDate');
  },

  // Get high-risk assessments
  async getHighRisk(): Promise<LimbSalvageAssessment[]> {
    return db.limbSalvageAssessments
      .filter(a => 
        a.limbSalvageScore?.riskCategory === 'high' || 
        a.limbSalvageScore?.riskCategory === 'very_high'
      )
      .toArray();
  },

  // Get pending follow-ups
  async getPendingFollowUps(): Promise<LimbSalvageAssessment[]> {
    const now = new Date();
    return db.limbSalvageAssessments
      .filter(a => 
        a.followUpDate !== undefined && 
        new Date(a.followUpDate) <= now &&
        a.actualOutcome === undefined
      )
      .toArray();
  },

  // Create assessment
  async create(assessment: LimbSalvageAssessment): Promise<string> {
    return db.limbSalvageAssessments.add(assessment);
  },

  // Update assessment
  async update(id: string, updates: Partial<LimbSalvageAssessment>): Promise<number> {
    return db.limbSalvageAssessments.update(id, { ...updates, updatedAt: new Date() });
  },

  // Delete assessment
  async delete(id: string): Promise<void> {
    return db.limbSalvageAssessments.delete(id);
  },

  // Get assessment with patient details
  async getWithPatient(id: string): Promise<{
    assessment: LimbSalvageAssessment | undefined;
    patient: Patient | undefined;
  }> {
    const assessment = await db.limbSalvageAssessments.get(id);
    if (!assessment) return { assessment: undefined, patient: undefined };
    
    const patient = await db.patients.get(assessment.patientId);
    return { assessment, patient };
  },

  // Get statistics
  async getStatistics(): Promise<{
    total: number;
    byRisk: Record<string, number>;
    byOutcome: Record<string, number>;
    salvageRate: number;
  }> {
    const all = await db.limbSalvageAssessments.toArray();
    const total = all.length;
    
    const byRisk: Record<string, number> = { low: 0, moderate: 0, high: 0, very_high: 0 };
    const byOutcome: Record<string, number> = { healed: 0, improved: 0, stable: 0, worsened: 0, amputated: 0 };
    
    let completedWithOutcome = 0;
    let salvaged = 0;
    
    for (const a of all) {
      if (a.limbSalvageScore?.riskCategory) {
        byRisk[a.limbSalvageScore.riskCategory] = (byRisk[a.limbSalvageScore.riskCategory] || 0) + 1;
      }
      if (a.actualOutcome) {
        byOutcome[a.actualOutcome] = (byOutcome[a.actualOutcome] || 0) + 1;
        completedWithOutcome++;
        if (['healed', 'improved', 'stable'].includes(a.actualOutcome)) {
          salvaged++;
        }
      }
    }
    
    const salvageRate = completedWithOutcome > 0 ? (salvaged / completedWithOutcome) * 100 : 0;
    
    return { total, byRisk, byOutcome, salvageRate };
  },
};

// ============================================================
// MEETING MINUTES OPERATIONS
// ============================================================

export const MeetingMinutesOps = {
  async getAll(): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.reverse().sortBy('meetingDate');
  },

  async getById(id: string): Promise<MeetingMinutes | undefined> {
    return db.meetingMinutes.get(id);
  },

  async getByConferenceId(conferenceId: string): Promise<MeetingMinutes | undefined> {
    return db.meetingMinutes.where('conferenceId').equals(conferenceId).first();
  },

  async getByHospital(hospitalId: string): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.where('hospitalId').equals(hospitalId).toArray();
  },

  async getByPatient(patientId: string): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.where('patientId').equals(patientId).toArray();
  },

  async getByHost(hostId: string): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.where('hostId').equals(hostId).toArray();
  },

  async getByStatus(status: 'draft' | 'finalized' | 'shared'): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.where('status').equals(status).toArray();
  },

  async getByMeetingType(meetingType: string): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.where('meetingType').equals(meetingType).toArray();
  },

  async getRecent(limit: number = 10): Promise<MeetingMinutes[]> {
    return db.meetingMinutes.orderBy('meetingDate').reverse().limit(limit).toArray();
  },

  async create(minutes: MeetingMinutes): Promise<string> {
    return db.meetingMinutes.add(minutes);
  },

  async update(id: string, updates: Partial<MeetingMinutes>): Promise<number> {
    return db.meetingMinutes.update(id, { ...updates, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    await db.meetingMinutes.delete(id);
  },

  async finalize(id: string, finalizedBy: string): Promise<number> {
    return db.meetingMinutes.update(id, {
      status: 'finalized',
      finalizedAt: new Date(),
      finalizedBy,
      updatedAt: new Date(),
    });
  },

  async markShared(id: string, format: 'pdf' | 'docx' | 'email' | 'whatsapp', sharedWithUserIds?: string[]): Promise<number> {
    const minutes = await db.meetingMinutes.get(id);
    if (!minutes) return 0;
    
    const exportedFormats = [...(minutes.exportedFormats || [])];
    if (!exportedFormats.includes(format)) {
      exportedFormats.push(format);
    }
    
    const sharedWith = [...(minutes.sharedWith || [])];
    if (sharedWithUserIds) {
      sharedWithUserIds.forEach(userId => {
        if (!sharedWith.includes(userId)) {
          sharedWith.push(userId);
        }
      });
    }
    
    return db.meetingMinutes.update(id, {
      status: 'shared',
      exportedFormats,
      sharedWith,
      sharedAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async addTranscriptSegment(
    id: string, 
    segment: { speakerName: string; text: string; startTime: number; endTime: number; confidence: number }
  ): Promise<number> {
    const minutes = await db.meetingMinutes.get(id);
    if (!minutes) return 0;

    const newSegment = {
      id: `segment-${Date.now()}`,
      ...segment,
      isEdited: false,
    };

    return db.meetingMinutes.update(id, {
      transcript: [...minutes.transcript, newSegment],
      rawTranscriptText: minutes.rawTranscriptText + ' ' + segment.text,
      updatedAt: new Date(),
    });
  },
};

// ============================================================
// EXPORT ALL OPERATIONS
// ============================================================

export const dbOps = {
  patients: PatientOps,
  vitals: VitalSignsOps,
  encounters: EncounterOps,
  surgeries: SurgeryOps,
  admissions: AdmissionOps,
  admissionNotes: AdmissionNotesOps,
  wounds: WoundOps,
  burns: BurnOps,
  labRequests: LabRequestOps,
  investigations: InvestigationOps,
  prescriptions: PrescriptionOps,
  nutrition: NutritionOps,
  treatmentPlans: TreatmentPlanOps,
  invoices: InvoiceOps,
  wardRounds: WardRoundOps,
  dischargeSummaries: DischargeSummaryOps,
  bloodTransfusions: BloodTransfusionOps,
  mdtMeetings: MDTMeetingOps,
  histopathology: HistopathologyOps,
  consumableBOMs: ConsumableBOMOps,
  hospitals: HospitalOps,
  users: UserOps,
  chat: ChatOps,
  videoConferences: VideoConferenceOps,
  assignments: AssignmentOps,
  dashboard: DashboardOps,
  limbSalvage: LimbSalvageOps,
  meetingMinutes: MeetingMinutesOps,
};
