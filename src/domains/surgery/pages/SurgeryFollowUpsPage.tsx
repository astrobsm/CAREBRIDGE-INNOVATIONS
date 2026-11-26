/** /surgery/follow-ups/:surgeryId — confirm, move or cancel the follow-up visits of one operation. */
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft } from 'lucide-react';
import { db } from '../../../database';
import FollowUpPlanner from '../components/FollowUpPlanner';

export default function SurgeryFollowUpsPage() {
  const { surgeryId = '' } = useParams<{ surgeryId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const surgery = useLiveQuery(() => db.surgeries.get(surgeryId), [surgeryId]);
  const patient = useLiveQuery(() => (surgery ? db.patients.get(surgery.patientId) : undefined), [surgery?.patientId]);
  const next = params.get('next');
  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-600 mb-2"><ChevronLeft className="w-4 h-4" />Back</button>
      <h1 className="text-xl font-bold text-gray-900">Follow-up visits</h1>
      <p className="text-sm text-gray-500 mb-4">
        {surgery ? `${surgery.procedureName}` : ''}{patient ? ` — ${patient.firstName} ${patient.lastName}` : ''}
      </p>
      {surgery === null || (surgery === undefined && !surgeryId)
        ? <p className="text-sm text-gray-500">Surgery not found.</p>
        : <div className="bg-white rounded-lg shadow p-4"><FollowUpPlanner surgeryId={surgeryId} onDone={() => navigate(next || '/follow-ups/recall')} /></div>}
    </div>
  );
}
