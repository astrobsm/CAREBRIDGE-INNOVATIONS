/**
 * Quick Add Hospital: build the record, save it on this device, push it to
 * the cloud, then select it in the form that asked. The steps are injected so
 * the whole path is tested without a database.
 *
 * Only the name is required. The address used to be required too; a clinic
 * being added mid-registration often has no address to hand.
 */

import type { Hospital } from '../../types';

export interface QuickAddHospitalInput {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  type?: Hospital['type'];
}

export type BuildResult = { ok: true; hospital: Hospital } | { ok: false; error: string };

export function buildQuickAddHospital(input: QuickAddHospitalInput, id: string, now: Date = new Date()): BuildResult {
  const name = (input.name || '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Enter the hospital name' };
  return {
    ok: true,
    hospital: {
      id,
      name,
      address: (input.address || '').trim(),
      city: (input.city || '').trim(),
      state: (input.state || '').trim(),
      phone: (input.phone || '').trim(),
      email: '',
      type: input.type || 'secondary',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export interface QuickAddDeps {
  newId: () => string;
  /** Save on this device (Dexie). Must succeed. */
  save: (h: Hospital) => Promise<unknown>;
  /** Push to the cloud. A failure leaves it queued for the next sync. */
  sync: (h: Hospital) => Promise<unknown>;
  /** Select it in the form that opened the panel. */
  select: (h: Hospital) => void;
  /** Existing hospitals, to reuse one with the same name instead of duplicating. */
  existing?: Hospital[];
}

export type QuickAddResult =
  | { ok: true; hospital: Hospital; reused: boolean; synced: boolean }
  | { ok: false; error: string };

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export async function quickAddHospital(input: QuickAddHospitalInput, deps: QuickAddDeps): Promise<QuickAddResult> {
  const built = buildQuickAddHospital(input, deps.newId());
  if (!built.ok) return built;

  const same = deps.existing?.find(h => key(h.name) === key(built.hospital.name) && h.isActive !== false);
  if (same) {
    deps.select(same);
    return { ok: true, hospital: same, reused: true, synced: true };
  }

  try {
    await deps.save(built.hospital);
  } catch (e) {
    return { ok: false, error: `Could not save the hospital on this device${e instanceof Error ? `: ${e.message}` : ''}` };
  }
  let synced = true;
  try {
    await deps.sync(built.hospital);
  } catch {
    synced = false;
  }
  deps.select(built.hospital);
  return { ok: true, hospital: built.hospital, reused: false, synced };
}

/** "City, State" without empty commas. */
export function hospitalPlace(h: Pick<Hospital, 'city' | 'state' | 'address'>): string {
  return [h.city, h.state].map(s => (s || '').trim()).filter(s => s && s !== 'Not specified').join(', ');
}
