/**
 * Post-Op Monitoring Charts Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Dedicated page for viewing post-operative monitoring charts
 */

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, BarChart3, User, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../../database';
import PostOpMonitoringCharts from '../components/PostOpMonitoringCharts';
import type { PostOpMonitoringRecord } from '../types';
import LoadingScreen from '../../../components/common/LoadingScreen';

const PostOpMonitoringChartsPage: React.FC = () => {
  const { patientId, surgeryId } = useParams<{ patientId: string; surgeryId: string }>();
  const navigate = useNavigate();

  // Load patient
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Load surgery
  const surgery = useLiveQuery(
    () => surgeryId ? db.surgeries.get(surgeryId) : undefined,
    [surgeryId]
  );

  // Load monitoring records for this surgery
  const monitoringRecords = useLiveQuery(async () => {
    if (!surgeryId || !patientId) return [];
    
    // Query vitals and other records associated with this patient after surgery date
    const records = await db.vitalSigns
      .where('patientId')
      .equals(patientId)
      .toArray();
    
    // Convert to PostOpMonitoringRecord format
    const surgeryDate = surgery?.actualEndTime || surgery?.scheduledDate;
    if (!surgeryDate) return [];

    const surgeryDateTime = new Date(surgeryDate);
    
    // Filter records after surgery and transform to PostOpMonitoringRecord format
    const postOpRecords: PostOpMonitoringRecord[] = records
      .filter(r => new Date(r.recordedAt) >= surgeryDateTime)
      .map(r => ({
        id: r.id,
        patientId: r.patientId,
        surgeryId: surgeryId,
        carePlanId: '',
        recordedAt: r.recordedAt,
        recordedBy: r.recordedBy || '',
        recordedByName: r.recordedBy || 'Unknown',
        postOpDay: Math.floor((new Date(r.recordedAt).getTime() - surgeryDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        dayPostOp: Math.floor((new Date(r.recordedAt).getTime() - surgeryDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        hourPostOp: Math.floor((new Date(r.recordedAt).getTime() - surgeryDateTime.getTime()) / (1000 * 60 * 60)) % 24,
        shift: 'morning' as const,
        vitalSigns: {
          heartRate: r.pulse,
          bloodPressureSystolic: r.bloodPressureSystolic,
          bloodPressureDiastolic: r.bloodPressureDiastolic,
          temperature: r.temperature,
          respiratoryRate: r.respiratoryRate,
          oxygenSaturation: r.oxygenSaturation,
        },
        painScore: r.painScore || 0,
        painLocation: '',
        painCharacter: '',
        drainOutputs: [],
        mobilityStatus: 'bed_rest' as const,
        dietStatus: 'nil_by_mouth' as const,
        nursingNotes: r.notes || '',
        createdAt: r.recordedAt,
        updatedAt: r.recordedAt,
      }));

    return postOpRecords;
  }, [patientId, surgeryId, surgery]);

  // Loading state
  if (patient === undefined || surgery === undefined || monitoringRecords === undefined) {
    return <LoadingScreen />;
  }

  // Not found state
  if (!patient || !surgery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Not Found</h1>
          <p className="text-gray-600 mb-6">
            The patient or surgery information could not be found.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <Link
              to="/post-op-care"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Post-Op Care
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const surgeryDate = surgery.actualEndTime 
    ? new Date(surgery.actualEndTime) 
    : surgery.scheduledDate 
      ? new Date(surgery.scheduledDate) 
      : new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Post-Op Monitoring Charts</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Surgery: {format(surgeryDate, 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Surgery Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">{surgery.procedureName}</h2>
          <div className="text-sm text-gray-600">
            {surgery.status === 'completed' ? (
              <span className="text-green-600">✓ Completed on {format(surgeryDate, 'MMMM d, yyyy')}</span>
            ) : (
              <span>Status: {surgery.status}</span>
            )}
          </div>
        </div>

        {/* Charts */}
        {monitoringRecords.length > 0 ? (
          <PostOpMonitoringCharts 
            records={monitoringRecords} 
            surgeryDate={surgeryDate} 
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Monitoring Data Available</h3>
            <p className="text-gray-600 mb-4">
              There are no post-operative monitoring records for this patient yet.
            </p>
            <Link
              to="/post-op-care"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Record Monitoring Data
            </Link>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Post-Op Care
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostOpMonitoringChartsPage;
