/**
 * Investigation Requests Page
 * Lists bundles for a patient and links to /request/new.
 */

import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, FileText, ClipboardList } from 'lucide-react';
import { db } from '../../../database';
import { PatientOps } from '../../../database/operations';
import type { InvestigationRequestBundle } from '../../../types';

const statusBadge = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-200 text-gray-700',
    requested: 'bg-blue-100 text-blue-700',
    partial: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100';
};

const InvestigationRequestsPage = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const patient = useLiveQuery(() => (patientId ? PatientOps.getById(patientId) : undefined), [patientId]);
  const bundles = useLiveQuery(
    () =>
      patientId
        ? db
            .table<InvestigationRequestBundle>('investigationRequestBundles')
            .where('patientId')
            .equals(patientId)
            .reverse()
            .sortBy('createdAt')
        : [],
    [patientId]
  );

  if (!patient) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-xl font-bold">Investigation Requests</h1>
            <p className="text-sm text-gray-500">
              {patient.firstName} {patient.lastName} · {patient.hospitalNumber}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/patients/${patientId}/investigations/request/new`)}
          className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {(!bundles || bundles.length === 0) && (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            No investigation requests yet.
          </div>
        )}
        {bundles?.map((b) => (
          <Link
            key={b.id}
            to={`/investigation-requests/${b.id}`}
            className="block p-3 hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">
                  {b.diagnosis || 'Investigation Request'}{' '}
                  <span className="text-xs text-gray-500">· {b.items.filter((it) => it.ticked).length} item(s)</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(b.requestDate).toLocaleString()} · {b.priority.toUpperCase()}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${statusBadge(b.status)}`}>{b.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default InvestigationRequestsPage;
