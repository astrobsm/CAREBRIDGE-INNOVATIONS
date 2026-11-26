/**
 * Readiness from the database: gathers the records surgicalReadiness reads.
 * Exposed for other screens (Today, patient page) as useSurgeryReadiness /
 * useReadinessMap and the async loadReadiness.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import type { Surgery } from '../../../types';
import { surgicalReadiness, type Readiness, type ReadinessStage } from './readiness';
import { preOpReviewFor } from './procedureLink';

async function inputsFor(patientIds: string[]) {
  const ids = [...new Set(patientIds)];
  const [encounters, investigations, preAnaesthetic] = await Promise.all([
    db.clinicalEncounters.where('patientId').anyOf(ids).toArray(),
    db.investigations.where('patientId').anyOf(ids).toArray(),
    db.preoperativeAssessments.where('patientId').anyOf(ids).toArray(),
  ]);
  return { encounters, investigations, preAnaesthetic };
}

/** Readiness for several surgeries at once (one query per table). */
export async function loadReadinessMap(surgeries: Surgery[], stage: ReadinessStage = 'theatre'): Promise<Map<string, Readiness>> {
  const out = new Map<string, Readiness>();
  if (!surgeries.length) return out;
  const { encounters, investigations, preAnaesthetic } = await inputsFor(surgeries.map(s => s.patientId));
  const documents = await db.scannedDocuments.where('encounterId').anyOf(surgeries.map(s => s.id)).toArray();
  for (const surgery of surgeries) {
    const rev = preOpReviewFor(surgery, encounters);
    out.set(surgery.id, surgicalReadiness({
      surgery,
      review: rev ? { encounterId: rev.id, review: rev.procedureReview } : null,
      investigations: investigations.filter(i => i.patientId === surgery.patientId),
      documents: documents.filter(d => d.encounterId === surgery.id),
      preAnaesthetic: preAnaesthetic.filter(a => a.surgeryId === surgery.id),
      stage,
    }));
  }
  return out;
}

export async function loadReadiness(surgeryId: string, stage: ReadinessStage = 'theatre'): Promise<Readiness | null> {
  const s = await db.surgeries.get(surgeryId);
  if (!s) return null;
  return (await loadReadinessMap([s], stage)).get(s.id) ?? null;
}

/** Live readiness of one surgery (undefined while loading, null when there is no surgery). */
export function useSurgeryReadiness(surgeryId: string | undefined, stage: ReadinessStage = 'theatre'): Readiness | null | undefined {
  return useLiveQuery(async () => (surgeryId ? loadReadiness(surgeryId, stage) : null), [surgeryId, stage]);
}

/** Live readiness of many surgeries, keyed by surgery id. */
export function useReadinessMap(surgeries: Surgery[] | undefined, stage: ReadinessStage = 'theatre'): Map<string, Readiness> | undefined {
  const key = (surgeries ?? []).map(s => `${s.id}:${new Date(s.updatedAt).getTime()}`).join(',');
  return useLiveQuery(async () => loadReadinessMap(surgeries ?? [], stage), [key, stage]);
}
