// ---------------------------------------------------------------------------
// Archiving a patient.
//
// The patients list used to hard-delete the row from this device only. The
// cloud copy was untouched (and the sync ignores remote DELETEs by design), so
// the next pull put the patient straight back, and meanwhile the clinical
// records pointed at nobody. A patient is never deleted: it is archived with
// the app's existing soft-delete flag (isActive = false, as PatientAPI.delete
// and the merge flow do), stamped with updatedAt so the change wins on sync,
// and pushed to the cloud.
// ---------------------------------------------------------------------------

import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import type { Patient } from '../../../types';

export { isArchivedPatient, listablePatients } from './patientArchiveRules';

async function setActive(id: string, isActive: boolean): Promise<Patient> {
  const updated = await db.patients.update(id, { isActive, updatedAt: new Date() });
  if (!updated) throw new Error(`Patient ${id} not found`);
  const patient = await db.patients.get(id);
  if (!patient) throw new Error(`Patient ${id} not found`);
  await syncRecord('patients', patient as unknown as Record<string, unknown>);
  return patient;
}

/** Archive (soft-delete) a patient everywhere. Clinical records are untouched. */
export function archivePatient(id: string): Promise<Patient> {
  return setActive(id, false);
}

export function restorePatient(id: string): Promise<Patient> {
  return setActive(id, true);
}
