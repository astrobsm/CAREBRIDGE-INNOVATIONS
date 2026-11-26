/** Write a surgery patch locally and push the row to the cloud straight away. */
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import type { Surgery } from '../../../types';

export async function updateSurgery(id: string, patch: Partial<Surgery>): Promise<Surgery | undefined> {
  await db.surgeries.update(id, { ...patch, updatedAt: new Date() });
  const row = await db.surgeries.get(id);
  if (row) void syncRecord('surgeries', row as unknown as Record<string, unknown>);
  return row;
}

export const actorName = (u: { firstName?: string; lastName?: string } | null | undefined) =>
  `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || undefined;
