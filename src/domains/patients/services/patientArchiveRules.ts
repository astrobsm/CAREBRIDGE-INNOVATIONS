// Pure rules for which patients the list shows. Kept free of the database
// and sync imports so they can be unit-tested; see patientArchive.ts.

import type { Patient } from '../../../types';

/** Archived = isActive explicitly false (older rows may store 0). Unset counts as active. */
export function isArchivedPatient(p: Pick<Patient, 'isActive'>): boolean {
  return p.isActive === false || (p.isActive as unknown) === 0;
}

/** The rows the patients list shows. Merged registrations are never shown. */
export function listablePatients<T extends Pick<Patient, 'isActive' | 'mergedInto'>>(
  patients: T[],
  showArchived: boolean,
): T[] {
  return patients.filter(p => !p.mergedInto && (showArchived || !isArchivedPatient(p)));
}
