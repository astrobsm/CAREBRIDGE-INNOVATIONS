/**
 * ============================================================
 * AstroHEALTH Post-Operative Note Service
 * ============================================================
 * 
 * Service for managing post-operative notes including:
 * - Creating and updating post-op notes
 * - Auto-generating patient education based on procedure type
 * - Auto-generating lab request forms for specimens
 * - Recording billing for surgical team
 * 
 * ============================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import type { 
  PostOperativeNote, 
  PostOperativePatientEducation,
  PostOperativeSpecimen,
  PostOperativeLabRequest,
  PostoperativeMedication,
  Surgery,
  Patient,
  SpecimenType,
} from '../types';
import { recordBillableActivity } from './activityBillingService';
import { syncRecord } from './cloudSyncService';

// ============================================
// PATIENT EDUCATION TEMPLATES BY PROCEDURE TYPE
// ============================================

interface ProcedureEducationTemplate {
  procedureKeywords: string[];
  recoveryDays: number;
  template: Partial<PostOperativePatientEducation>;
}

const educationTemplates: ProcedureEducationTemplate[] = [
  // General Surgery
  {
    procedureKeywords: ['hernia', 'inguinal', 'umbilical', 'ventral'],
    recoveryDays: 14,
    template: {
      recoveryTimeline: 'Most hernia repairs heal within 2-4 weeks. You may experience some discomfort for the first few days.',
      ambulation: {
        day0: 'Rest in bed, gentle movement to prevent blood clots',
        day1: 'Walk slowly with assistance to the bathroom',
        week1: 'Light walking around the house, avoid stairs if possible',
        week2: 'Gradually increase walking distance',
        ongoingCare: 'Return to normal activities over 4-6 weeks',
      },
      oralIntake: {
        immediatePostOp: 'Sips of water when fully awake',
        day1: 'Light diet - soup, toast, soft foods',
        normalDiet: 'Resume normal diet as tolerated within 2-3 days',
        restrictions: ['Avoid heavy meals for first week', 'Stay well hydrated'],
      },
      woundCare: {
        initialDressing: 'Keep dressing dry for 48 hours',
        dressingChanges: 'Change dressing daily after first 48 hours',
        signsOfInfection: ['Increasing redness around wound', 'Pus or foul-smelling discharge', 'Fever above 38°C', 'Increasing pain after day 2'],
        whenToSeekHelp: ['Wound opens up', 'Severe pain not relieved by medications', 'Unable to pass urine'],
      },
      activityRestrictions: {
        lifting: 'No lifting over 5kg for 4-6 weeks',
        driving: 'No driving for 1-2 weeks or while taking pain medications',
        work: 'Desk work in 1-2 weeks, manual labor in 4-6 weeks',
        exercise: 'No strenuous exercise for 6 weeks',
        bathing: 'Sponge bath for first 48 hours, then shower (no tub baths for 2 weeks)',
      },
    },
  },
  // Wound Surgery / Debridement
  {
    procedureKeywords: ['debridement', 'wound', 'ulcer', 'pressure sore'],
    recoveryDays: 21,
    template: {
      recoveryTimeline: 'Wound healing depends on wound size and your overall health. Expect regular dressing changes for several weeks.',
      ambulation: {
        day0: 'Rest with affected limb elevated if applicable',
        day1: 'Gentle movement as tolerated, avoid pressure on wound',
        week1: 'Gradual increase in mobility, protect wound area',
        week2: 'Normal mobility with wound protection',
        ongoingCare: 'Continue wound care until fully healed',
      },
      oralIntake: {
        immediatePostOp: 'Clear fluids when awake',
        day1: 'Normal diet encouraged - high protein for healing',
        normalDiet: 'High protein diet (eggs, meat, beans) to promote healing',
        restrictions: ['Limit sugary foods if diabetic', 'Stay well hydrated'],
      },
      woundCare: {
        initialDressing: 'Specialized wound dressing applied in theater',
        dressingChanges: 'As prescribed - may be daily or every 2-3 days',
        signsOfInfection: ['Increased redness spreading beyond wound', 'Green or yellow pus', 'Bad smell from wound', 'Fever or chills'],
        whenToSeekHelp: ['Wound getting larger', 'Black tissue appearing', 'Severe pain', 'Bleeding that won\'t stop'],
      },
      activityRestrictions: {
        lifting: 'Avoid activities that strain the wound',
        driving: 'Depends on wound location',
        work: 'Discuss with your surgeon',
        exercise: 'Avoid exercise that affects wound area',
        bathing: 'Keep wound dry unless otherwise instructed',
      },
    },
  },
  // Burns Surgery
  {
    procedureKeywords: ['burn', 'escharotomy', 'skin graft', 'grafting'],
    recoveryDays: 28,
    template: {
      recoveryTimeline: 'Burn healing takes time. Skin grafts typically take 2-3 weeks to heal fully. Expect regular follow-up visits.',
      ambulation: {
        day0: 'Complete bed rest with affected areas elevated',
        day1: 'Minimal movement, protect grafted areas',
        week1: 'Gentle movement with physical therapy guidance',
        week2: 'Gradual increase as grafts heal',
        ongoingCare: 'Progressive rehabilitation, avoid sun exposure',
      },
      oralIntake: {
        immediatePostOp: 'Clear fluids, advance as tolerated',
        day1: 'High calorie, high protein diet crucial for healing',
        normalDiet: 'Nutritionist-planned diet for optimal healing',
        restrictions: ['No alcohol', 'Avoid inflammatory foods'],
      },
      woundCare: {
        initialDressing: 'Specialized burn dressings, do not remove',
        dressingChanges: 'Performed by healthcare team only initially',
        signsOfInfection: ['Fever above 38°C', 'Unusual smell from burns', 'Graft turning dark/black', 'Increased swelling'],
        whenToSeekHelp: ['Graft coming off', 'High fever', 'Difficulty breathing', 'Severe pain'],
      },
      activityRestrictions: {
        lifting: 'No lifting until cleared by surgeon',
        driving: 'Not until fully healed and off pain medications',
        work: 'Extended leave typically required',
        exercise: 'Physical therapy as prescribed',
        bathing: 'Only as instructed by burn team',
      },
    },
  },
  // Amputation
  {
    procedureKeywords: ['amputation', 'ray amputation', 'above knee', 'below knee', 'toe', 'finger'],
    recoveryDays: 42,
    template: {
      recoveryTimeline: 'Healing after amputation takes 4-8 weeks. Physical therapy and prosthetic fitting may follow.',
      ambulation: {
        day0: 'Bed rest, residual limb elevated',
        day1: 'Sit up in bed, transfer to chair with assistance',
        week1: 'Begin physical therapy, wheelchair mobility',
        week2: 'Progressive mobility training',
        ongoingCare: 'Prosthetic evaluation when healed, ongoing rehabilitation',
      },
      oralIntake: {
        immediatePostOp: 'Clear fluids when alert',
        day1: 'Regular diet as tolerated',
        normalDiet: 'Balanced diet for healing, control diabetes if applicable',
        restrictions: ['Diabetic diet if applicable', 'Avoid excessive salt'],
      },
      woundCare: {
        initialDressing: 'Compression bandage or rigid dressing in place',
        dressingChanges: 'As directed by surgical team',
        signsOfInfection: ['Fever', 'Increased redness', 'Pus drainage', 'Worsening pain'],
        whenToSeekHelp: ['Wound opening', 'Bleeding through bandage', 'Severe pain', 'Color change in residual limb'],
      },
      activityRestrictions: {
        lifting: 'Follow physical therapy guidance',
        driving: 'Special assessment required',
        work: 'Discuss with rehabilitation team',
        exercise: 'Prescribed rehabilitation exercises',
        bathing: 'Keep residual limb dry until cleared',
      },
    },
  },
  // Plastic Surgery / Reconstruction
  {
    procedureKeywords: ['flap', 'reconstruction', 'keloid', 'scar', 'z-plasty', 'skin', 'graft'],
    recoveryDays: 21,
    template: {
      recoveryTimeline: 'Plastic surgery recovery varies by procedure. Expect some swelling for 1-2 weeks.',
      ambulation: {
        day0: 'Rest with surgical site protected and elevated',
        day1: 'Gentle walking, avoid straining surgical site',
        week1: 'Normal light activities, protect surgical area',
        week2: 'Gradual return to routine activities',
        ongoingCare: 'Scar management begins after suture removal',
      },
      oralIntake: {
        immediatePostOp: 'Clear fluids when alert',
        day1: 'Normal diet',
        normalDiet: 'Healthy diet rich in vitamins A and C for healing',
        restrictions: ['Avoid alcohol for 2 weeks'],
      },
      woundCare: {
        initialDressing: 'Light dressing, keep dry',
        dressingChanges: 'As instructed, typically daily',
        signsOfInfection: ['Increased swelling after day 3', 'Red streaking', 'Pus', 'Fever'],
        whenToSeekHelp: ['Flap changing color', 'Numbness worsening', 'Severe swelling', 'Wound breakdown'],
      },
      activityRestrictions: {
        lifting: 'No heavy lifting for 2-4 weeks',
        driving: 'After 1 week if not on pain medications',
        work: 'Desk work in 1-2 weeks',
        exercise: 'No exercise for 4 weeks',
        bathing: 'Shower after 48 hours, pat dry surgical site',
      },
    },
  },
];

// Default template for procedures not matching specific templates
const defaultEducationTemplate: PostOperativePatientEducation = {
  procedureType: 'General Surgery',
  recoveryTimeline: 'Recovery time varies based on the procedure performed. Follow your surgeon\'s specific instructions.',
  expectedRecoveryDays: 14,
  ambulation: {
    day0: 'Rest in bed, gentle movement as tolerated',
    day1: 'Sit up and walk with assistance',
    week1: 'Increase walking gradually',
    week2: 'Return to light activities',
    ongoingCare: 'Full recovery over 2-6 weeks',
  },
  oralIntake: {
    immediatePostOp: 'Clear fluids when fully awake',
    day1: 'Light diet, advance as tolerated',
    normalDiet: 'Resume normal diet when comfortable',
    restrictions: [],
  },
  woundCare: {
    initialDressing: 'Keep dry for 48 hours',
    dressingChanges: 'Change daily or as instructed',
    signsOfInfection: ['Redness', 'Swelling', 'Pus', 'Fever', 'Increasing pain'],
    whenToSeekHelp: ['Wound opening', 'Bleeding', 'High fever', 'Severe pain'],
  },
  medications: {
    painManagement: 'Take prescribed pain medications as directed',
    antibiotics: 'Complete the full course of antibiotics if prescribed',
    otherMeds: [],
    duration: 'As prescribed by your surgeon',
  },
  activityRestrictions: {
    lifting: 'Avoid heavy lifting for 2-4 weeks',
    driving: 'No driving while on pain medications',
    work: 'Return to work based on job requirements',
    exercise: 'No strenuous activity for 2-4 weeks',
    bathing: 'Shower after 48 hours',
  },
  followUp: {
    firstAppointment: 'Within 1-2 weeks of surgery',
    subsequentCare: 'As scheduled by your surgeon',
    suturRemoval: '7-14 days depending on wound location',
    investigations: [],
  },
  emergencyContact: 'Contact the hospital emergency line or go to the nearest emergency room',
  emergencySigns: ['Severe bleeding', 'High fever (>38.5°C)', 'Difficulty breathing', 'Severe uncontrolled pain'],
};

// Function to generate patient education based on procedure
export function generatePatientEducation(
  procedureName: string,
  _surgeonNotes?: string
): PostOperativePatientEducation {
  const lowerProcedure = procedureName.toLowerCase();
  
  // Find matching template
  let matchedTemplate: ProcedureEducationTemplate | undefined;
  for (const template of educationTemplates) {
    for (const keyword of template.procedureKeywords) {
      if (lowerProcedure.includes(keyword)) {
        matchedTemplate = template;
        break;
      }
    }
    if (matchedTemplate) break;
  }
  
  // Build education object
  const education: PostOperativePatientEducation = {
    ...defaultEducationTemplate,
    procedureType: procedureName,
    expectedRecoveryDays: matchedTemplate?.recoveryDays || 14,
    ...matchedTemplate?.template,
  };
  
  return education;
}

// ============================================
// LAB REQUEST GENERATION
// ============================================

export function generateLabRequestsForSpecimens(
  specimens: PostOperativeSpecimen[],
  _patientId: string,
  surgeryId: string,
  requestedBy: string
): PostOperativeLabRequest[] {
  const labRequests: PostOperativeLabRequest[] = [];
  
  for (const specimen of specimens) {
    if (specimen.labRequestGenerated) continue;
    
    const testNameMap: Record<SpecimenType, string> = {
      histology: 'Histopathological Examination',
      mcs: 'Microscopy, Culture & Sensitivity',
      biochemistry: 'Biochemical Analysis',
      cytology: 'Cytological Examination',
      frozen_section: 'Frozen Section Analysis',
      other: 'Laboratory Analysis',
    };
    
    const request: PostOperativeLabRequest = {
      id: uuidv4(),
      specimenId: specimen.id,
      requestType: specimen.type,
      testName: testNameMap[specimen.type],
      urgency: specimen.type === 'frozen_section' ? 'stat' : 'routine',
      clinicalDetails: `Specimen from: ${specimen.site}\nDescription: ${specimen.description}\nSurgery ID: ${surgeryId}`,
      status: 'pending',
      requestedAt: new Date(),
      requestedBy,
    };
    
    labRequests.push(request);
    specimen.labRequestId = request.id;
    specimen.labRequestGenerated = true;
  }
  
  return labRequests;
}

// ============================================
// POST-OPERATIVE NOTE CRUD OPERATIONS
// ============================================

export async function createPostOperativeNote(
  surgery: Surgery,
  patient: Patient,
  operativeDetails: {
    preOperativeDiagnosis: string;
    postOperativeDiagnosis: string;
    indication: string;
    procedurePerformed: string;
    findings: string;
    complications: string[];
    bloodLoss: number;
    bloodTransfused?: number;
    duration: number;
    specimens: PostOperativeSpecimen[];
  },
  postOpOrders: {
    vitalSignsFrequency: string;
    monitoringInstructions: string[];
    position: string;
    dietInstructions: string;
    ivFluids?: string;
    medications: PostoperativeMedication[];
    drainCare?: string;
    catheterCare?: string;
  },
  recoveryPlan: {
    expectedRecoveryDays: number;
    ambulation: { day0: string; day1: string; ongoing: string };
    oralIntake: { timing: string; type: string; progression: string };
    followUpDate?: Date;
    followUpInstructions: string;
    suturRemovalDate?: Date;
    warningSigns: string[];
    whenToSeekHelp: string[];
  },
  whoChecklist: {
    signInCompleted: boolean;
    timeOutCompleted: boolean;
    signOutCompleted: boolean;
  },
  userId: string,
  hospitalId: string
): Promise<PostOperativeNote> {
  // Generate patient education
  const patientEducation = generatePatientEducation(surgery.procedureName);
  
  // Generate lab requests for specimens
  const labRequests = generateLabRequestsForSpecimens(
    operativeDetails.specimens,
    patient.id,
    surgery.id,
    userId
  );
  
  // Calculate assistant fee (20% of surgeon fee)
  const assistantFee = surgery.surgeonFee && surgery.assistantId 
    ? surgery.surgeonFee * 0.20 
    : undefined;
  
  const note: PostOperativeNote = {
    id: uuidv4(),
    surgeryId: surgery.id,
    patientId: patient.id,
    hospitalId,
    
    // Basic Details
    procedureName: surgery.procedureName,
    procedureCode: surgery.procedureCode,
    procedureDate: surgery.actualStartTime || surgery.scheduledDate,
    
    // WHO Checklist
    whoChecklistCompleted: whoChecklist.signInCompleted && whoChecklist.timeOutCompleted && whoChecklist.signOutCompleted,
    signInCompleted: whoChecklist.signInCompleted,
    timeOutCompleted: whoChecklist.timeOutCompleted,
    signOutCompleted: whoChecklist.signOutCompleted,
    
    // Surgical Team
    surgeon: surgery.surgeon,
    surgeonId: surgery.surgeonId || '',
    surgeonFee: surgery.surgeonFee || 0,
    assistant: surgery.assistant,
    assistantId: surgery.assistantId,
    assistantFee,
    anaesthetist: surgery.anaesthetist,
    anaesthetistId: surgery.anaesthetistId,
    anaesthesiaType: surgery.anaesthesiaType || 'local',
    anaesthesiaFee: surgery.anaesthesiaFee,
    scrubNurse: surgery.scrubNurse,
    scrubNurseId: surgery.scrubNurseId,
    circulatingNurse: surgery.circulatingNurse,
    circulatingNurseId: surgery.circulatingNurseId,
    
    // Operative Details
    preOperativeDiagnosis: operativeDetails.preOperativeDiagnosis,
    postOperativeDiagnosis: operativeDetails.postOperativeDiagnosis,
    indication: operativeDetails.indication,
    procedurePerformed: operativeDetails.procedurePerformed,
    findings: operativeDetails.findings,
    complications: operativeDetails.complications,
    bloodLoss: operativeDetails.bloodLoss,
    bloodTransfused: operativeDetails.bloodTransfused,
    duration: operativeDetails.duration,
    
    // Specimens
    specimensCollected: operativeDetails.specimens.length > 0,
    specimens: operativeDetails.specimens,
    labRequests,
    
    // Post-Op Orders
    vitalSignsFrequency: postOpOrders.vitalSignsFrequency,
    monitoringInstructions: postOpOrders.monitoringInstructions,
    position: postOpOrders.position,
    dietInstructions: postOpOrders.dietInstructions,
    ivFluids: postOpOrders.ivFluids,
    medications: postOpOrders.medications,
    drainCare: postOpOrders.drainCare,
    catheterCare: postOpOrders.catheterCare,
    
    // Recovery Plan
    expectedRecoveryDays: recoveryPlan.expectedRecoveryDays,
    ambulation: recoveryPlan.ambulation,
    oralIntake: recoveryPlan.oralIntake,
    
    // Patient Education
    patientEducation,
    educationDelivered: false,
    
    // Follow-up
    followUpDate: recoveryPlan.followUpDate,
    followUpInstructions: recoveryPlan.followUpInstructions,
    suturRemovalDate: recoveryPlan.suturRemovalDate,
    
    // Warning Signs
    warningSigns: recoveryPlan.warningSigns,
    whenToSeekHelp: recoveryPlan.whenToSeekHelp,
    
    // Billing
    totalProcedureFee: (surgery.surgeonFee || 0) + (assistantFee || 0) + (surgery.anaesthesiaFee || 0),
    billingRecorded: false,
    activityBillingRecordIds: [],
    
    // Status
    status: 'draft',
    completedBy: userId,
    completedAt: new Date(),
    
    // PDF & Sharing
    pdfGenerated: false,
    sharedViaWhatsApp: false,
    
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.postOperativeNotes.add(note);
  syncRecord('postOperativeNotes', note as unknown as Record<string, unknown>);
  return note;
}

export async function updatePostOperativeNote(
  noteId: string,
  updates: Partial<PostOperativeNote>
): Promise<void> {
  await db.postOperativeNotes.update(noteId, {
    ...updates,
    updatedAt: new Date(),
  });
  const updated = await db.postOperativeNotes.get(noteId);
  if (updated) syncRecord('postOperativeNotes', updated as unknown as Record<string, unknown>);
}

export async function approvePostOperativeNote(
  noteId: string,
  approvedBy: string
): Promise<void> {
  await db.postOperativeNotes.update(noteId, {
    status: 'approved',
    approvedBy,
    approvedAt: new Date(),
    updatedAt: new Date(),
  });
  const updated = await db.postOperativeNotes.get(noteId);
  if (updated) syncRecord('postOperativeNotes', updated as unknown as Record<string, unknown>);
}

export async function getPostOperativeNote(
  noteId: string
): Promise<PostOperativeNote | undefined> {
  return db.postOperativeNotes.get(noteId);
}

export async function getPostOperativeNotesBySurgery(
  surgeryId: string
): Promise<PostOperativeNote[]> {
  return db.postOperativeNotes
    .where('surgeryId')
    .equals(surgeryId)
    .toArray();
}

export async function getPostOperativeNotesByPatient(
  patientId: string
): Promise<PostOperativeNote[]> {
  return db.postOperativeNotes
    .where('patientId')
    .equals(patientId)
    .reverse()
    .sortBy('procedureDate');
}

// Record billing for surgical team
export async function recordSurgeryBilling(
  note: PostOperativeNote,
  patient: Patient,
  hospitalId: string
): Promise<string[]> {
  const billingRecordIds: string[] = [];
  
  // Record surgeon billing
  if (note.surgeonId && note.surgeonFee) {
    const record = await recordBillableActivity(
      'PROC-001', // Procedure code
      patient.id,
      `${patient.firstName} ${patient.lastName}`,
      patient.hospitalNumber,
      note.surgeonId,
      note.surgeon,
      'surgeon',
      hospitalId,
      note.surgeonFee,
      { notes: `Surgery: ${note.procedureName}` }
    );
    billingRecordIds.push(record.id);
  }
  
  // Record assistant billing (20% of surgeon fee)
  if (note.assistantId && note.assistantFee) {
    const record = await recordBillableActivity(
      'SA-001', // Surgeon Assistant code
      patient.id,
      `${patient.firstName} ${patient.lastName}`,
      patient.hospitalNumber,
      note.assistantId,
      note.assistant || '',
      'surgeon',
      hospitalId,
      note.assistantFee,
      { notes: `Assisted: ${note.procedureName}` }
    );
    billingRecordIds.push(record.id);
  }
  
  // Record anaesthetist billing
  if (note.anaesthetistId && note.anaesthesiaFee) {
    const record = await recordBillableActivity(
      'ANES-001', // Anaesthesia code
      patient.id,
      `${patient.firstName} ${patient.lastName}`,
      patient.hospitalNumber,
      note.anaesthetistId,
      note.anaesthetist || '',
      'anaesthetist',
      hospitalId,
      note.anaesthesiaFee,
      { notes: `Anaesthesia: ${note.anaesthesiaType}` }
    );
    billingRecordIds.push(record.id);
  }
  
  // Update note with billing records
  await updatePostOperativeNote(note.id, {
    billingRecorded: true,
    activityBillingRecordIds: billingRecordIds,
  });
  
  return billingRecordIds;
}

// Mark education as delivered
export async function markEducationDelivered(
  noteId: string,
  deliveredBy: string
): Promise<void> {
  await db.postOperativeNotes.update(noteId, {
    educationDelivered: true,
    educationDeliveredBy: deliveredBy,
    educationDeliveredAt: new Date(),
    updatedAt: new Date(),
  });
  const updated = await db.postOperativeNotes.get(noteId);
  if (updated) syncRecord('postOperativeNotes', updated as unknown as Record<string, unknown>);
}

// Mark PDF as generated
export async function markPdfGenerated(
  noteId: string,
  pdfUrl?: string
): Promise<void> {
  await db.postOperativeNotes.update(noteId, {
    pdfGenerated: true,
    pdfUrl,
    updatedAt: new Date(),
  });
  const updated = await db.postOperativeNotes.get(noteId);
  if (updated) syncRecord('postOperativeNotes', updated as unknown as Record<string, unknown>);
}

// Mark as shared via WhatsApp
export async function markSharedViaWhatsApp(
  noteId: string
): Promise<void> {
  await db.postOperativeNotes.update(noteId, {
    sharedViaWhatsApp: true,
    sharedAt: new Date(),
    updatedAt: new Date(),
  });
  const updated = await db.postOperativeNotes.get(noteId);
  if (updated) syncRecord('postOperativeNotes', updated as unknown as Record<string, unknown>);
}
