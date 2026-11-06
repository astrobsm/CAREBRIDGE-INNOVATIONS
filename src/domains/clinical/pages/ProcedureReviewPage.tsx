/**
 * /patients/:patientId/procedure-review
 *
 * Query parameters (all optional): `phase` (wound_review | pre_op | post_op |
 * follow_up), `module` (a procedure module id), `encounter` (open a saved
 * review). Lists the patient's earlier reviews so one can be reopened.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { ArrowLeft, ClipboardList, Loader2, Plus } from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { ProcedureReviewForm } from '../components/procedureReview/ProcedureReviewForm';
import { listReviews } from '../procedureReview/procedureReviewService';
import { getModule } from '../procedureReview/registry';
import { phaseDefinition, REVIEW_PHASES } from '../procedureReview/phases';
import type { ReviewPhase } from '../procedureReview/types';
import { encounterTypeColour } from '../data/encounterTypes';

const isPhase = (v: string | null): v is ReviewPhase => !!v && REVIEW_PHASES.some(p => p.id === v);

export default function ProcedureReviewPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formKey, setFormKey] = useState(0);
  // The encounter this form instance saved; its URL change must not remount the form.
  const [savedHere, setSavedHere] = useState<string | null>(null);
  const patient = useLiveQuery(() => (patientId ? db.patients.get(patientId) : undefined), [patientId]);
  const reviews = useLiveQuery(() => (patientId ? listReviews(patientId) : Promise.resolve([])), [patientId]);

  const encounterId = params.get('encounter');
  const existing = useMemo(() => reviews?.find(r => r.id === encounterId), [reviews, encounterId]);
  const phase = params.get('phase');

  if (!patientId) return null;
  if (patient === undefined || reviews === undefined) {
    return <p className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;
  }
  if (!patient) return <p className="p-6 text-gray-600">Patient not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-6 space-y-4">
      <button onClick={() => navigate(`/patients/${patientId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
        <ArrowLeft size={16} /> Back to patient
      </button>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-indigo-600" /> Procedure review</h1>
          <p className="text-sm text-gray-600">{patient.firstName} {patient.lastName} ({patient.hospitalNumber})</p>
        </div>
        {(encounterId || params.get('module')) && (
          <button onClick={() => { setParams({}); setSavedHere(null); setFormKey(k => k + 1); }} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1">
            <Plus size={14} /> New review
          </button>
        )}
      </div>

      {reviews.length > 0 && !encounterId && (
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Earlier reviews</p>
          <ul className="divide-y">
            {reviews.slice(0, 10).map(r => (
              <li key={r.id}>
                <Link to={`?encounter=${r.id}`} onClick={() => setFormKey(k => k + 1)} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-gray-50 px-1 rounded">
                  <span>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] mr-2 ${encounterTypeColour(r.type)}`}>{phaseDefinition(r.procedureReview.phase).label}</span>
                    {getModule(r.procedureReview.moduleId)?.name ?? r.procedureReview.moduleId}
                  </span>
                  <span className="text-xs text-gray-500">{format(new Date(r.createdAt), 'd MMM yyyy')} · {r.procedureReview.status.replace(/_/g, ' ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!encounterId || existing || savedHere === encounterId) && (
        <ProcedureReviewForm
          key={formKey}
          patient={patient}
          reviews={reviews}
          existing={existing}
          initialPhase={isPhase(phase) ? phase : undefined}
          initialModuleId={params.get('module') ?? undefined}
          hospitalId={user?.hospitalId}
          onSaved={enc => { setSavedHere(enc.id); if (!encounterId) setParams({ encounter: enc.id }, { replace: true }); }}
        />
      )}
    </div>
  );
}
