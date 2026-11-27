/**
 * Read everything this device holds about ONE patient, for the review
 * snapshot. Every query is `where('patientId').equals(id)` on that table's
 * own index, so no other patient's row is ever read.
 *
 * Tables with a section of their own are read by name; every other table
 * with a patientId index is read too and shown under "Other records", unless
 * it is billing, staffing, messaging or notification bookkeeping.
 */

import type { Table } from 'dexie';
import { db } from '../../database';
import type { PatientRecordBundle } from './summaryBuilder';

type Rec = Record<string, unknown>;

/** Read by name into their own section. */
export const CURATED_TABLES = [
  'clinicalEncounters', 'vitalSigns', 'clinicalProblems', 'clerkingPlans', 'investigations', 'labRequests', 'prescriptions',
  'surgeries', 'postOperativeNotes', 'surgicalOutcomes', 'postOpCarePlans', 'monitoredWounds', 'woundAssessments',
  'admissions', 'dischargeSummaries', 'appointments', 'treatmentPlans', 'scannedDocuments',
] as const;

/** Patient tables that are not part of the clinical record a reviewer needs. */
export const EXCLUDED_TABLES = new Set([
  'invoices', 'activityBillingRecords', 'consumableBOMs', 'auditLogs', 'syncStatus',
  'appointmentReminders', 'treatmentReminders', 'npwtNotifications', 'publicClinicBookings',
  'staffPatientAssignments', 'doctorAssignments', 'nurseAssignments', 'nursePatientAssignments', 'bedAssignments',
  'videoConferences', 'enhancedVideoConferences', 'chatRooms', 'chatMessages',
  'payslips', 'staffPayrollRecords', 'investigationApprovalLogs', 'treatmentVoiceNotes',
]);

const LABELS: Record<string, string> = {
  burnAssessments: 'Burn assessment', wounds: 'Wound record (older module)', woundMeasurements: 'Wound measurement',
  nutritionAssessments: 'Nutrition assessment', nutritionPlans: 'Nutrition plan', nutritionMeasurements: 'Nutrition measurement',
  nutritionIntake: 'Nutrition intake', nutritionApprovals: 'Nutrition approval', limbSalvageAssessments: 'Limb salvage assessment',
  burnMonitoringRecords: 'Burn monitoring', escharotomyRecords: 'Escharotomy', skinGraftRecords: 'Skin graft', burnCarePlans: 'Burn care plan',
  npwtSessions: 'NPWT session', medicationCharts: 'Medication chart', transfusionOrders: 'Transfusion order',
  transfusionMonitoringCharts: 'Transfusion monitoring', bloodTransfusions: 'Blood transfusion', histopathologyRequests: 'Histopathology request',
  mdtMeetings: 'MDT meeting', preoperativeAssessments: 'Pre-operative assessment', postOpObservations: 'Post-op observation',
  externalReviews: 'External review', referrals: 'Referral', patientEducationRecords: 'Patient education given',
  calculatorResults: 'Calculator result', meetingMinutes: 'Meeting minutes', substanceUseAssessments: 'Substance use assessment',
  detoxMonitoringRecords: 'Detox monitoring', detoxFollowUps: 'Detox follow-up', substanceUseClinicalSummaries: 'Substance use summary',
  clinicalComments: 'Clinical comment', keloidCarePlans: 'Keloid care plan', stiAssessments: 'Soft-tissue infection assessment',
  stiDebridementRecords: 'Debridement record', lymphedemaAssessments: 'Lymphoedema assessment', lymphedemaMonitoringRecords: 'Lymphoedema monitoring',
  postOpLymphedemaMonitoring: 'Post-op lymphoedema monitoring', investigationRequestBundles: 'Investigation request bundle',
  skinGraftEpisodes: 'Skin graft episode', graftSites: 'Graft site', graftPhotoAssessments: 'Graft photo assessment',
  scarCases: 'Scar case', scarAssessments: 'Scar assessment', scarTreatments: 'Scar treatment', scarAlerts: 'Scar alert',
  padAssessments: 'Peripheral arterial disease assessment', vascularInterventions: 'Vascular intervention', clinicalPlanItems: 'Plan item',
  scribeTreatmentPlans: 'Scribe treatment plan', scribePlanActions: 'Scribe plan action', scribePlanAttachments: 'Scribe plan attachment',
  tumourBoardCases: 'Tumour board case', tumourBoardAssessments: 'Tumour board assessment', tumourBoardPlans: 'Tumour board plan',
  tumourBoardReferrals: 'Tumour board referral', tumourBoardSurveillance: 'Tumour board surveillance', clinicianAnalyses: 'Clinician analysis',
  treatmentProgress: 'Treatment progress', treatmentSessions: 'Treatment session', wardRounds: 'Ward round', admissionNotes: 'Admission note',
};

export const tableLabel = (name: string) =>
  LABELS[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/s$/, '').replace(/^./, c => c.toUpperCase());

const hasPatientIndex = (t: Table) => t.schema.indexes.some(i => i.name === 'patientId' || i.keyPath === 'patientId');

async function rowsFor(name: string, patientId: string): Promise<Rec[]> {
  const t = db.tables.find(x => x.name === name);
  if (!t || !hasPatientIndex(t)) return [];
  const rows = (await t.where('patientId').equals(patientId).toArray()) as Rec[];
  // Belt and braces: the index answered, but never pass on a row for anyone else.
  return rows.filter(r => r && r.patientId === patientId);
}

export async function loadPatientRecords(patientId: string): Promise<PatientRecordBundle | null> {
  const patient = await db.patients.get(patientId);
  if (!patient) return null;

  const curated = await Promise.all(CURATED_TABLES.map(n => rowsFor(n, patientId)));
  const by = Object.fromEntries(CURATED_TABLES.map((n, i) => [n, curated[i]])) as Record<(typeof CURATED_TABLES)[number], Rec[]>;

  const curatedSet = new Set<string>(CURATED_TABLES);
  const others = db.tables.filter(t => t.name !== 'patients' && !curatedSet.has(t.name) && !EXCLUDED_TABLES.has(t.name) && hasPatientIndex(t));
  const other = (await Promise.all(others.map(async t => ({ table: t.name, label: tableLabel(t.name), rows: await rowsFor(t.name, patientId) }))))
    .filter(x => x.rows.length);

  const [users, hospital] = await Promise.all([
    db.users.toArray(),
    patient.registeredHospitalId ? db.hospitals.get(patient.registeredHospitalId) : Promise.resolve(undefined),
  ]);
  const userNames = new Map(users.filter(u => u.id).map(u => [u.id!, [u.firstName, u.lastName].filter(Boolean).join(' ').trim()]));

  const cast = <T>(rows: Rec[]) => rows as unknown as T[];
  return {
    patient,
    hospitalName: hospital?.name,
    userNames,
    encounters: cast(by.clinicalEncounters),
    vitals: cast(by.vitalSigns),
    clinicalProblems: by.clinicalProblems,
    clerkingPlans: cast(by.clerkingPlans),
    investigations: cast(by.investigations),
    labRequests: cast(by.labRequests),
    prescriptions: cast(by.prescriptions),
    surgeries: cast(by.surgeries),
    postOpNotes: cast(by.postOperativeNotes),
    surgicalOutcomes: by.surgicalOutcomes,
    postOpCarePlans: by.postOpCarePlans,
    monitoredWounds: cast(by.monitoredWounds),
    woundAssessments: cast(by.woundAssessments),
    admissions: cast(by.admissions),
    dischargeSummaries: cast(by.dischargeSummaries),
    appointments: cast(by.appointments),
    treatmentPlans: cast(by.treatmentPlans),
    scannedDocuments: cast(by.scannedDocuments),
    other,
  };
}
