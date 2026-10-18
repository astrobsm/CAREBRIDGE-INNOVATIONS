/**
 * Carrying out an approved scribe plan, item by item.
 *
 * Every step is a ScribePlanAction carrying who (the signed-in user, never a
 * typed name), when, and where (the device's location with its accuracy,
 * plus the ward / theatre / clinic named). A medication item becomes a real
 * Prescription in the pharmacy queue; an investigation item becomes a real
 * Investigation request; its result goes onto that Investigation — value,
 * report, OCR text and the photographed / scanned / uploaded files — and onto
 * the log. Nothing here can log against a plan that is not approved.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { logAuditEvent } from '../../../services/auditService';
import { categoryToInvestigationFields, type CatalogItem } from '../../../services/investigationRequestService';
import type { BNFDrug, DrugFormulation } from '../../../data/bnfDrugDatabase';
import type { Investigation, InvestigationAttachment, InvestigationCategory, Prescription, User } from '../../../types';
import { actorOf } from '../services/clerkingService';
import { assertCanLog } from './approval';
import { medicationRoute } from './catalogMatch';
import type {
  ActionInvestigation, ActionPrescription, ActionResult, ScribePlanAction, ScribePlanAttachment,
} from './records';

const nowIso = () => new Date().toISOString();
const asRecord = (r: unknown) => r as Record<string, unknown>;

export interface LocationFix { latitude?: number; longitude?: number; accuracy?: number; status: 'gps' | 'denied' | 'unavailable' | 'pending'; label: string }

export interface LogInput {
  itemKey: string;
  itemText?: string;
  itemKind?: string;
  status: string;
  note?: string | null;
  prescription?: ActionPrescription | null;
  investigation?: ActionInvestigation | null;
  result?: ActionResult | null;
  location?: Partial<LocationFix>;
  attachments?: { name?: string; data: string }[];
}

const num = (v: unknown) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

/** Log one step of an approved plan. Who and when come from the session, not the form. */
export async function logAction(planId: string, input: LogInput, user: User): Promise<ScribePlanAction> {
  const actor = actorOf(user);
  const plan = await db.scribeTreatmentPlans.get(planId);
  assertCanLog(actor, plan, input);
  const ts = nowIso();
  const id = uuidv4();
  const files: ScribePlanAttachment[] = (input.attachments || []).map(f => ({
    id: uuidv4(), actionId: id, patientId: plan!.patientId, name: f.name || 'result',
    mime: /^data:([^;]+)/.exec(f.data)?.[1] || 'application/octet-stream',
    sizeBytes: Math.round(f.data.length * 0.75), data: f.data, createdAt: ts, updatedAt: ts,
  }));
  const loc = input.location || {};
  const action: ScribePlanAction = {
    id, scribePlanId: planId, patientId: plan!.patientId,
    itemKey: String(input.itemKey), itemText: input.itemText, itemKind: input.itemKind,
    status: input.status as ScribePlanAction['status'], note: input.note ? String(input.note).trim() : null,
    prescription: input.prescription || null, investigation: input.investigation || null, result: input.result || null,
    latitude: num(loc.latitude), longitude: num(loc.longitude), accuracyM: num(loc.accuracy),
    locationLabel: loc.label ? String(loc.label).slice(0, 200) : null, locationStatus: loc.status ? String(loc.status).slice(0, 20) : null,
    userId: actor.id, userName: actor.name, userRole: actor.role,
    loggedAt: ts,
    attachments: files.map(f => ({ id: f.id, name: f.name, mime: f.mime, size: f.sizeBytes })),
    createdAt: ts, updatedAt: ts,
  };
  await db.transaction('rw', db.scribePlanActions, db.scribePlanAttachments, async () => {
    await db.scribePlanActions.put(action);
    if (files.length) await db.scribePlanAttachments.bulkPut(files);
  });
  await syncRecord('scribePlanActions', asRecord(action));
  for (const f of files) await syncRecord('scribePlanAttachments', asRecord(f));
  void logAuditEvent(user.id, 'scribe_plan_logged', 'scribe_plan_actions', id, { newValue: { planId, itemKey: action.itemKey, status: action.status } });
  return action;
}

export async function getAttachment(id: string): Promise<ScribePlanAttachment | undefined> {
  return db.scribePlanAttachments.get(id);
}

// ── Prescribing ────────────────────────────────────────────────────────────


/** A real prescription in the pharmacy queue, from a plan line. */
export async function prescribeForPlanItem(p: {
  patientId: string; hospitalId?: string; drug: BNFDrug; formulation?: DrugFormulation;
  dose: string; frequency: string; duration?: string; instructions?: string; indication: string;
}, user: User): Promise<Prescription> {
  const now = new Date();
  const rx: Prescription = {
    id: uuidv4(), patientId: p.patientId, hospitalId: p.hospitalId || user.hospitalId || 'hospital-1',
    medications: [{
      id: uuidv4(), name: p.drug.genericName, genericName: p.drug.genericName, dosage: p.dose,
      frequency: p.frequency, route: medicationRoute(p.formulation?.route), duration: p.duration || '',
      quantity: 1, instructions: p.instructions, isDispensed: false,
    }],
    status: 'pending', prescribedBy: user.id, prescribedAt: now,
    notes: `From the approved treatment plan: ${p.indication}`,
  };
  await db.prescriptions.put(rx);
  await syncRecord('prescriptions', asRecord(rx));
  return rx;
}

// ── Investigations ─────────────────────────────────────────────────────────

/** A real investigation request, from a plan line. */
export async function requestInvestigationForPlanItem(p: {
  patientId: string; hospitalId?: string; category: InvestigationCategory; item: CatalogItem;
  priority: 'routine' | 'urgent' | 'stat'; clinicalNotes: string;
}, user: User): Promise<Investigation> {
  const now = new Date();
  const fields = categoryToInvestigationFields(p.category);
  const inv = {
    id: uuidv4(), patientId: p.patientId, hospitalId: p.hospitalId || user.hospitalId || 'hospital-1',
    type: fields.type, category: fields.category, name: p.item.name, clinicalInfo: p.clinicalNotes,
    priority: p.priority, status: 'requested', approvalStatus: 'pending',
    requestedBy: user.id, requestedByName: actorOf(user).name, requestedAt: now,
    results: [], createdAt: now, updatedAt: now,
  } as Investigation;
  await db.investigations.put(inv);
  await syncRecord('investigations', asRecord(inv));
  return inv;
}

/** The result onto the investigation itself, so the lab views and trends see it. */
export async function recordInvestigationResult(
  investigationId: string, result: ActionResult, files: { name: string; data: string }[], user: User,
): Promise<void> {
  const inv = await db.investigations.get(investigationId);
  if (!inv) return;
  const now = new Date();
  const attachments: InvestigationAttachment[] = files.map(f => {
    const mime = /^data:([^;]+)/.exec(f.data)?.[1] || 'application/octet-stream';
    return {
      id: uuidv4(), type: mime === 'application/pdf' ? 'pdf' : 'image', fileName: f.name, fileType: mime, mimeType: mime,
      fileSize: Math.round(f.data.length * 0.75), url: f.data, uploadedBy: user.id, uploadedAt: now, description: result.test,
    };
  });
  const next: Investigation = {
    ...inv, status: 'completed', completedAt: now, completedBy: user.id, completedByName: actorOf(user).name,
    results: [...(inv.results || []), ...(result.value ? [{ parameter: result.test, parameterName: result.test, value: result.value, unit: result.unit || undefined }] : [])],
    interpretation: [inv.interpretation, result.text, result.ocrText && `Scanned report:\n${result.ocrText}`].filter(Boolean).join('\n\n') || undefined,
    attachments: [...(inv.attachments || []), ...attachments],
    updatedAt: now,
  };
  await db.investigations.put(next);
  await syncRecord('investigations', asRecord(next));
}
