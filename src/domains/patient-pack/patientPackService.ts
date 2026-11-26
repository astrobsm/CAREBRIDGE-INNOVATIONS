/**
 * The patient pack from the database: gather, build, send (WhatsApp) or
 * download, and log it on the surgery (date, by whom, contents) so the
 * timeline can show it.
 */
import { differenceInYears } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import type { Surgery, User } from '../../types';
import { sharePDFOnWhatsApp } from '../../utils/whatsappShareUtils';
import { getProcedureEducation } from '../../data/patientEducation';
import { getModule } from '../clinical/procedureReview/registry';
import { preOpReviewFor, moduleForSurgery } from '../surgery/journey/procedureLink';
import { updateSurgery } from '../surgery/journey/surgeryWrite';
import { buildBeforeSurgery, medicinesFromReviewAnswers } from './beforeSurgery';
import { buildPatientPack, packContents, renderPatientPack, type PatientPackInput } from './patientPack';

export async function loadPatientPackInput(surgeryId: string, fastingText?: string): Promise<PatientPackInput | null> {
  const surgery = await db.surgeries.get(surgeryId);
  if (!surgery) return null;
  const [patient, encounters, boms, appointments, hospital] = await Promise.all([
    db.patients.get(surgery.patientId),
    db.clinicalEncounters.where('patientId').equals(surgery.patientId).toArray(),
    db.consumableBOMs.where('patientId').equals(surgery.patientId).toArray(),
    db.appointments.where('patientId').equals(surgery.patientId).toArray(),
    surgery.hospitalId ? db.hospitals.get(surgery.hospitalId) : Promise.resolve(undefined),
  ]);
  if (!patient) return null;
  const rev = preOpReviewFor(surgery, encounters);
  const revModule = rev ? getModule(rev.procedureReview.moduleId) : undefined;
  const module = revModule ?? moduleForSurgery(surgery, encounters);
  const educationId = module?.catalog.educationId;
  const bom = boms.filter(b => b.serviceName === surgery.procedureName)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  const medicines = [
    ...(patient.comorbidities ?? []).flatMap(c => c.medications ?? []),
    ...medicinesFromReviewAnswers(rev?.procedureReview.answers as Record<string, unknown> | undefined),
  ];
  const age = patient.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : null;
  return {
    surgery,
    patient: { name: `${patient.firstName} ${patient.lastName}`.trim(), hospitalNumber: patient.hospitalNumber || '', age: age ?? undefined, gender: patient.gender, phone: patient.phone },
    hospitalName: hospital?.name,
    clinicPhone: hospital?.phone,
    review: rev && revModule ? { module: revModule, stored: rev.procedureReview } : null,
    education: educationId ? getProcedureEducation(educationId) ?? null : null,
    bom,
    before: buildBeforeSurgery({ anaesthesiaType: surgery.anaesthesiaType, ageYears: age, medicines, fastingText: fastingText ?? surgery.patientPack?.fastingText }),
    appointments: appointments.filter(a => a.relatedSurgeryId === surgery.id || !a.relatedSurgeryId && new Date(a.appointmentDate) >= new Date()),
    now: new Date(),
  };
}

/** Build the pack, deliver it, and log what was given. */
export async function givePatientPack(surgeryId: string, via: 'whatsapp' | 'download', user: User, fastingText?: string): Promise<Surgery | undefined> {
  const input = await loadPatientPackInput(surgeryId, fastingText);
  if (!input) throw new Error('Surgery or patient not found');
  const d = buildPatientPack(input);
  const pdf = renderPatientPack(d);
  if (via === 'whatsapp') await sharePDFOnWhatsApp(pdf.output('blob'), d.fileName, input.patient.phone);
  else pdf.save(d.fileName);
  const s = input.surgery;
  return updateSurgery(s.id, {
    patientPack: {
      fastingText: fastingText ?? s.patientPack?.fastingText,
      log: [...(s.patientPack?.log ?? []), {
        id: uuidv4(), at: new Date(), by: user.id, byName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
        via, contents: packContents(d), fileName: d.fileName,
      }],
    },
  });
}

/** The surgery a pack would be for from a procedure review: the patient's next booked (or latest) operation. */
export async function surgeryForPatientPack(patientId: string): Promise<Surgery | undefined> {
  const list = (await db.surgeries.where('patientId').equals(patientId).toArray()).filter(s => s.status !== 'cancelled');
  const now = Date.now();
  const upcoming = list.filter(s => new Date(s.scheduledDate).getTime() >= now - 86_400_000)
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  return upcoming[0] ?? list.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
}
