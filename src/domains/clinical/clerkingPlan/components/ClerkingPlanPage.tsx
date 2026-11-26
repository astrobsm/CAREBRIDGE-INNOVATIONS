/**
 * /patients/:patientId/plan/:planId — a saved clerking plan on its own page:
 * results that arrive after the visit, interpretation, re-approval, sharing
 * and booking. The clerking it was built from is shown read-only; changes to
 * the history belong in a follow-up encounter.
 */
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../../../database';
import { patientIdentifiers, patientLabelOf } from '../../services/clerkingService';
import { ClerkingPlanPanel } from './ClerkingPlanPanel';

export default function ClerkingPlanPage() {
  const { patientId = '', planId = '' } = useParams<{ patientId: string; planId: string }>();
  const record = useLiveQuery(() => db.clerkingPlans.get(planId), [planId]);
  const patient = useLiveQuery(() => db.patients.get(patientId), [patientId]);
  if (record === undefined) return <p className="p-4 text-sm text-gray-500">Loading plan…</p>;
  if (!record) return <p className="p-4 text-sm text-gray-600">Plan not found on this device. It may not have synced yet.</p>;
  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-5 space-y-3">
      <Link to={`/patients/${encodeURIComponent(patientId)}?tab=plans`} className="inline-flex items-center gap-1 text-sm text-indigo-700"><ArrowLeft size={16} /> {patientLabelOf(patient)}</Link>
      <p className="text-xs text-gray-500">Built from the clerking of {new Date(record.createdAt).toLocaleDateString()} by {record.createdByName || 'clinician'}. Complaints: {record.clerking.complaints.map(c => c.label).join(', ') || 'none'}.</p>
      <div className="bg-white rounded-xl border p-3">
        <ClerkingPlanPanel patientId={record.patientId} hospitalId={record.hospitalId} encounterId={record.encounterId} source={record.source}
          data={record.clerking} ctx={record.ctx} identifiers={patientIdentifiers(patient)} planId={record.id} onPlanId={() => undefined} readOnlyClerking />
      </div>
    </div>
  );
}
