// ---------------------------------------------------------------------------
// Where the Surgical Workflow keeps its unsaved draft.
//
// The draft (findings, complications, consent notes, anaesthesia log...) was
// stored under `astro_workflow_${patientId}`, one per PATIENT, so a patient's
// second operation opened with the first one's findings, complications and
// section ticks already filled in. It is now one draft per SURGERY, plus one
// "new case" draft per patient until the first save creates the surgery. On
// that first save the new-case draft moves to the surgery's key.
// ---------------------------------------------------------------------------

export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The old, per-patient key. Read only to migrate; never written. */
export const legacyDraftKey = (patientId: string) => `astro_workflow_${patientId}`;
export const newCaseDraftKey = (patientId: string) => `astro_workflow_${patientId}_new`;
export const surgeryDraftKey = (surgeryId: string) => `astro_workflow_surgery_${surgeryId}`;

/** The key the workflow reads and writes for this patient / surgery. */
export function draftKeyFor(patientId: string, surgeryId?: string): string {
  return surgeryId ? surgeryDraftKey(surgeryId) : newCaseDraftKey(patientId);
}

/**
 * Move an old per-patient draft somewhere unambiguous, once:
 * - the patient has no surgery yet: it is the new-case draft;
 * - the patient has exactly one surgery: it belongs to that surgery;
 * - more than one: it cannot be told which operation it belongs to, so it is
 *   left where it is and loaded into neither (returns 'ambiguous').
 * Never overwrites a draft already at the destination.
 */
export function migrateLegacyDraft(
  storage: DraftStorage,
  patientId: string,
  patientSurgeryIds: string[],
): 'none' | 'to_new' | 'to_surgery' | 'ambiguous' {
  const legacy = storage.getItem(legacyDraftKey(patientId));
  if (legacy === null) return 'none';
  let dest: string | null = null;
  if (patientSurgeryIds.length === 0) dest = newCaseDraftKey(patientId);
  else if (patientSurgeryIds.length === 1) dest = surgeryDraftKey(patientSurgeryIds[0]);
  if (!dest) return 'ambiguous';
  if (storage.getItem(dest) === null) storage.setItem(dest, legacy);
  storage.removeItem(legacyDraftKey(patientId));
  return patientSurgeryIds.length === 0 ? 'to_new' : 'to_surgery';
}

/**
 * First save of a new case: the new-case draft becomes the surgery's draft,
 * and the patient-level keys are removed so the patient's next operation
 * starts empty.
 */
export function promoteNewCaseDraft(storage: DraftStorage, patientId: string, surgeryId: string, current?: string): void {
  const draft = current ?? storage.getItem(newCaseDraftKey(patientId));
  if (draft !== null && draft !== undefined) storage.setItem(surgeryDraftKey(surgeryId), draft);
  storage.removeItem(newCaseDraftKey(patientId));
  storage.removeItem(legacyDraftKey(patientId));
}

export function readDraft<T = Record<string, unknown>>(storage: DraftStorage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
