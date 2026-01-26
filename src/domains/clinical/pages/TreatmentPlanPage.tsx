import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import TreatmentPlanCard from '../../../components/clinical/TreatmentPlanCard';
import LoadingScreen from '../../../components/common/LoadingScreen';

export default function TreatmentPlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const admissionId = searchParams.get('admissionId');
  const patientId = searchParams.get('patientId');
  const woundId = searchParams.get('woundId');
  const burnId = searchParams.get('burnId');
  const surgeryId = searchParams.get('surgeryId');

  // Get patient information
  const admission = useLiveQuery(
    () => admissionId ? db.admissions.get(admissionId) : Promise.resolve(undefined),
    [admissionId]
  );

  const patient = useLiveQuery(
    () => {
      const pid = patientId || admission?.patientId;
      return pid ? db.patients.get(pid) : Promise.resolve(undefined);
    },
    [patientId, admission]
  );

  // Determine related entity
  const relatedEntityId = admissionId || woundId || burnId || surgeryId;
  const relatedEntityType = admissionId 
    ? 'general' 
    : woundId 
    ? 'wound' 
    : burnId 
    ? 'burn' 
    : surgeryId 
    ? 'surgery' 
    : 'general';

  if (!patient) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <div className="p-6 text-center">Please log in to create a treatment plan</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Treatment Plan</h1>
              <p className="text-sm text-gray-600 mt-1">
                Patient: {patient.firstName} {patient.lastName}
                {admission && ` • Admission: ${admission.admissionNumber}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Plan Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TreatmentPlanCard
          patientId={patient.id}
          relatedEntityId={relatedEntityId}
          relatedEntityType={relatedEntityType as 'wound' | 'burn' | 'surgery' | 'general'}
          clinicianId={user.id}
          clinicianName={`${user.firstName} ${user.lastName}`}
        />
      </div>
    </div>
  );
}
