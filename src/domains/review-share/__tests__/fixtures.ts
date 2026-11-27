/** One patient's record touching every section of the review snapshot. */
import type { PatientRecordBundle } from '../summaryBuilder';

export const PID = 'pt-ngozi';
export const NOW = new Date('2026-11-27T10:00:00Z');
/** A tiny but valid PNG, as a data URL. */
export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
export const png = (n: number) => `${PNG}${'A'.repeat(n)}`; // distinct strings for dedupe

const iso = (d: string) => new Date(d).toISOString();

export function bundle(overrides: Partial<PatientRecordBundle> = {}): PatientRecordBundle {
  return {
    patient: {
      id: PID, hospitalNumber: 'APS/2026/0042', firstName: 'Ngozi', middleName: 'Ada', lastName: 'Eze',
      dateOfBirth: new Date('1981-04-03'), gender: 'female', bloodGroup: 'O+', genotype: 'AS', maritalStatus: 'married',
      phone: '08031230000', email: 'ngozi@example.com', address: '5 Ogui Road', city: 'Enugu', state: 'Enugu', occupation: 'Trader',
      nextOfKin: { name: 'Chukwu Eze', relationship: 'husband', phone: '08030001111', address: '' },
      allergies: ['Penicillin', 'Sulfonamides'], chronicConditions: ['Sickle cell trait'],
      comorbidities: [{ condition: 'Type 2 diabetes', severity: 'moderate', currentlyManaged: true, medications: ['Metformin 500 mg bd'] }],
      registeredHospitalId: 'h1', isActive: true, createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-11-01'),
      photo: PNG,
    },
    hospitalName: 'AstroHEALTH Services',
    userNames: new Map([['u-owner', 'Kene Owner']]),
    encounters: [{
      id: 'e1', patientId: PID, hospitalId: 'h1', type: 'initial', status: 'completed',
      chiefComplaint: 'Non-healing leg ulcer for 4 months', historyOfPresentIllness: 'Started after minor trauma.',
      physicalExamination: { skin: 'Undermined violaceous edge, 6 x 4 cm' },
      diagnosis: [{ id: 'd1', description: 'Pyoderma gangrenosum', type: 'primary', status: 'suspected', code: 'L88' }],
      treatmentPlan: 'Biopsy edge; no sharp debridement.',
      clinicalPhotos: [{ id: 'cp1', imageData: png(1), description: 'Left leg ulcer, day 0', capturedAt: new Date('2026-11-01T09:00:00Z') }],
      attendingClinician: 'u-owner', startedAt: new Date('2026-11-01T09:00:00Z'), createdAt: new Date('2026-11-01T09:00:00Z'), updatedAt: new Date('2026-11-01T09:00:00Z'),
    } as never],
    vitals: [{ id: 'v1', patientId: PID, temperature: 37.2, pulse: 88, respiratoryRate: 18, bloodPressureSystolic: 128, bloodPressureDiastolic: 82, oxygenSaturation: 98, painScore: 6, recordedBy: 'u-owner', recordedAt: new Date('2026-11-01T09:05:00Z') }],
    clinicalProblems: [{ id: 'cpb1', patientId: PID, label: 'Atypical ulcer — biopsy needed', reasons: ['Older than 3 months'], dangerous: true, status: 'active', createdAt: iso('2026-11-01'), updatedAt: iso('2026-11-01') }],
    clerkingPlans: [
      {
        id: 'plan1', patientId: PID, source: 'initial', status: 'approved', planVersion: 1,
        conditions: [{ id: 'pg', label: 'Pyoderma gangrenosum' }], clerking: {} as never, ctx: {} as never, conditionIds: ['pg'], woundProtocol: true,
        rulesPlan: { engineVersion: '1', protocolVersion: null, conditions: [], woundProtocolApplied: true, lines: [], hardRules: [] } as never,
        decisions: [], manualLines: [], results: [{ testId: 'crp', value: 48, unit: 'mg/L', flag: 'high', via: 'direct', confirmed: true, at: iso('2026-11-03') }],
        approvals: [{
          version: 1, at: iso('2026-11-02T12:00:00Z'), by: 'u-owner', byName: 'Dr Kene Owner', byRole: 'plastic_surgeon',
          lines: [
            { id: 'l1', section: 'investigations', text: 'Edge biopsy with DIF', urgency: 'soon', source: { kind: 'rules' } },
            { id: 'l2', section: 'medications', text: 'Prednisolone 40 mg once daily', source: { kind: 'manual' } },
          ] as never,
          hardRules: ['No sharp debridement in suspected PG'], rulesInputsHash: 'x', protocolVersion: null, engineVersion: '1', includesAi: false,
        }],
        dermRheum: [{
          id: 'dr1', at: iso('2026-11-02T11:00:00Z'), byName: 'Dr Kene Owner', kbVersion: '1', screenVersion: '1', inputsHash: 'h', photosSent: 1,
          deterministic: { flags: [], candidates: [], hardRules: [] },
          consult: {
            summary: 'Pyoderma gangrenosum is most likely.', urgency: 'urgent',
            differential: [{ diagnosis: 'Pyoderma gangrenosum', kbId: 'pg', likelihood: 'high', reasoning: 'Undermined violaceous edge', supporting: [], against: [] }],
            mustNotMiss: [{ diagnosis: 'Buruli ulcer', why: 'Mimic', howToExclude: 'PCR' }], investigations: [], management: { immediate: ['Moist dressings'], definitive: [] },
            doNot: ['Do not debride'], referrals: [], patientCounselling: [], confidence: 'moderate', wouldChangeConfidence: [], photoObservations: [], hardRulesQuoted: [],
          },
          lines: [], checks: [], missingHardRules: [],
        }] as never,
        shares: [], appointments: [], createdBy: 'u-owner', createdAt: iso('2026-11-01'), updatedAt: iso('2026-11-02'),
      },
      {
        id: 'plan2', patientId: PID, source: 'follow_up', status: 'draft', planVersion: 0, conditions: [{ id: 'k', label: 'Keloid' }],
        clerking: {} as never, ctx: {} as never, conditionIds: [], woundProtocol: null,
        rulesPlan: { lines: [{ id: 'secret-draft-line', section: 'medications', text: 'DRAFT LINE NOT FOR SHARING', source: { kind: 'rules' } }] } as never,
        decisions: [], manualLines: [], results: [], approvals: [], shares: [], appointments: [], createdBy: 'u-owner', createdAt: iso('2026-11-20'), updatedAt: iso('2026-11-20'),
      },
    ],
    investigations: [{
      id: 'i1', patientId: PID, hospitalId: 'h1', type: 'full_blood_count', typeName: 'Full blood count', category: 'haematology', priority: 'routine', status: 'completed',
      requestedBy: 'u-owner', requestedAt: new Date('2026-11-01'), completedAt: new Date('2026-11-02'),
      results: [{ parameterName: 'Haemoglobin', value: 9.8, unit: 'g/dL', referenceRange: '12–16', flag: 'L' }],
      interpretation: 'Mild anaemia', createdAt: new Date('2026-11-01'), updatedAt: new Date('2026-11-02'),
    }],
    labRequests: [{ id: 'lr1', patientId: PID, hospitalId: 'h1', tests: [{ id: 't1', name: 'Wound swab MCS', category: 'microbiology', specimen: 'swab', result: 'Staph aureus, MSSA' }], priority: 'urgent', status: 'completed', requestedBy: 'u-owner', requestedAt: new Date('2026-11-01') }],
    prescriptions: [{
      id: 'rx1', patientId: PID, hospitalId: 'h1', status: 'dispensed', prescribedBy: 'u-owner', prescribedAt: new Date('2026-11-02'),
      medications: [{ id: 'm1', name: 'Prednisolone', dosage: '40 mg', frequency: 'once daily', route: 'oral', duration: '2 weeks', quantity: 14, isDispensed: true }],
    }],
    surgeries: [{
      id: 's1', patientId: PID, hospitalId: 'h1', procedureName: 'Split-thickness skin graft, left leg', type: 'elective', category: 'major',
      preOperativeAssessment: { asaScore: 2, npoStatus: true, consentSigned: true, bloodTyped: true, investigations: [], riskFactors: [] },
      scheduledDate: new Date('2026-11-10T08:00:00Z'), status: 'completed', surgeon: 'Dr Kene Owner', surgeonFee: 250000, anaesthesiaType: 'spinal',
      operativeNotes: 'Graft harvested from right thigh, meshed 1.5:1.', bloodLoss: 150, createdAt: new Date('2026-11-05'), updatedAt: new Date('2026-11-10'),
    } as never],
    postOpNotes: [{ id: 'pon1', surgeryId: 's1', patientId: PID, hospitalId: 'h1', procedureName: 'STSG', procedureDate: new Date('2026-11-10'), findings: 'Healthy granulation bed', complications: [], bloodLoss: 150, duration: 75, surgeonFee: 250000 } as never],
    surgicalOutcomes: [{ id: 'o1', surgeryId: 's1', patientId: PID, procedureName: 'STSG', operationDate: iso('2026-11-10'), windowDays: 30, ssi: 'none', complications: [], returnToTheatre: false, readmission: false, vte: false, death: false, recordedBy: 'u-owner', recordedAt: iso('2026-11-20') }],
    postOpCarePlans: [],
    monitoredWounds: [{ id: 'w1', patientId: PID, label: 'Left leg ulcer', anatomicalLocation: 'Left lateral leg', woundType: 'ulcer', status: 'active', createdAt: iso('2026-10-01'), updatedAt: iso('2026-11-20') }],
    woundAssessments: [
      { id: 'wa1', woundId: 'w1', patientId: PID, assessedAt: iso('2026-10-01'), lengthCm: 6, widthCm: 4, areaCm2: 20, exudateAmount: 'moderate', createdAt: iso('2026-10-01'), updatedAt: iso('2026-10-01'), photos: [{ id: 'p1', imageData: png(2), caption: 'Week 0', takenAt: iso('2026-10-01') }] },
      { id: 'wa2', woundId: 'w1', patientId: PID, assessedAt: iso('2026-10-22'), lengthCm: 5, widthCm: 3, areaCm2: 12, exudateAmount: 'light', createdAt: iso('2026-10-22'), updatedAt: iso('2026-10-22'), photos: [{ id: 'p2', imageData: png(3), caption: 'Week 3', takenAt: iso('2026-10-22') }] },
    ],
    admissions: [{ id: 'a1', patientId: PID, hospitalId: 'h1', admissionNumber: 'ADM-1', admissionDate: new Date('2026-11-09'), admissionTime: '10:00', admittedFrom: 'outpatient', admittedBy: 'u-owner', wardType: 'surgical', wardName: 'Ward A', bedNumber: '3', admissionDiagnosis: 'Chronic leg ulcer for grafting', chiefComplaint: 'Ulcer', indicationForAdmission: 'Surgery', severity: 'moderate', primaryDoctor: 'u-owner', status: 'discharged' } as never],
    dischargeSummaries: [{ id: 'ds1', patientId: PID, encounterId: 'e1', admissionDate: new Date('2026-11-09'), dischargeDate: new Date('2026-11-14'), admittingDiagnosis: 'Leg ulcer', finalDiagnosis: ['Pyoderma gangrenosum, grafted'], comorbidities: [], hospitalCourse: 'Uneventful; graft take 95%.', proceduresPerformed: [], consultations: [], conditionAtDischarge: 'improved', dischargeDisposition: 'home', dischargeMedications: [{ name: 'Paracetamol', dose: '1 g', frequency: 'tds' }], medicationsDiscontinued: [], dietaryInstructions: 'Normal', activityRestrictions: 'Elevate leg', warningSignsToWatch: ['Fever'], followUpAppointments: [], pendingTests: [], pendingReferrals: [], emergencyContact: '', clinicContact: '', preparedBy: 'u-owner', preparedByName: 'Dr Kene Owner', attendingPhysician: 'u-owner', attendingPhysicianName: 'Dr Kene Owner', followUpTracking: [], status: 'completed', createdAt: new Date('2026-11-14'), updatedAt: new Date('2026-11-14') } as never],
    appointments: [
      { id: 'ap1', patientId: PID, hospitalId: 'h1', appointmentDate: new Date('2026-12-02T00:00:00'), appointmentTime: '10:30', duration: 30, type: 'follow_up', priority: 'routine', status: 'scheduled', reasonForVisit: 'Graft review', clinicianId: 'u-owner', clinicianName: 'Dr Kene Owner' } as never,
      { id: 'ap0', patientId: PID, hospitalId: 'h1', appointmentDate: new Date('2026-10-02T00:00:00'), appointmentTime: '10:30', duration: 30, type: 'follow_up', priority: 'routine', status: 'completed', reasonForVisit: 'PAST VISIT', clinicianId: 'u-owner' } as never,
    ],
    treatmentPlans: [],
    scannedDocuments: [{ id: 'sd1', patientId: PID, documentType: 'lab_result', title: 'Outside histology report', pages: [{ id: 'pg1', imageDataUrl: png(4), ocrText: 'Neutrophilic dermatosis', confidence: 90 }], fullText: 'Neutrophilic dermatosis, consistent with PG', extractedFields: [], createdBy: 'u-owner', createdAt: new Date('2026-11-05'), updatedAt: new Date('2026-11-05') } as never],
    other: [{ table: 'burnAssessments', label: 'Burn assessment', rows: [{ id: 'b1', patientId: PID, tbsaPercentage: 4, createdAt: iso('2026-09-02'), notes: 'Old scald, healed' }] }],
    ...overrides,
  };
}
