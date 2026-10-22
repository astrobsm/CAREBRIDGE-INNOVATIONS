// Under hospital scoping a patient can only be registered at one of the
// registering user's hospitals (or a hospital they just added). The rule is
// scopePurge.registrationHospitalProblem; this looks up what it needs.

import { db } from '../../../database';
import { getCachedAccessPolicy } from '../../../services/cloudSyncService';
import { registrationHospitalProblem } from '../../../services/scopePurge';

export async function registrationScopeProblem(
  hospitalId: string | null | undefined,
  user: { id: string; role?: string } | null | undefined,
): Promise<string | null> {
  const cached = getCachedAccessPolicy(user?.id);
  if (!cached?.policy.hospitalScoped) return null;
  const hospital = hospitalId ? await db.hospitals.get(hospitalId) : undefined;
  return registrationHospitalProblem(hospitalId, {
    role: user?.role,
    cached,
    hospitalCreatedAt: hospital?.createdAt ?? null,
    hospitalName: hospital?.name ?? null,
  });
}
