/**
 * Post-Operative Care Management Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Central hub for managing post-operative patients with:
 * - Days post-surgery counter
 * - Multiple surgery support
 * - Care plans, monitoring, and implementations
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Search,
  Plus,
  Calendar,
  User,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Heart,
  Thermometer,
  ClipboardList,
  BarChart3,
  Stethoscope,
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
// HospitalSelector removed - not currently used in this page
import PostOpDayCounter from '../components/PostOpDayCounter';
import PostOpMonitoringModal from '../components/PostOpMonitoringModal';
import PostOpCarePlanModal from '../components/PostOpCarePlanModal';
import type { Surgery, Patient, PostOperativeNote, Admission } from '../../../types';

interface PostOpPatient {
  patient: Patient;
  admission: Admission;
  surgeries: (Surgery & { 
    dayPostOp: number; 
    hoursPostOp: number;
    postOpNote?: PostOperativeNote;
    latestVitals?: {
      bloodPressure: string;
      heartRate: number;
      temperature: number;
      oxygenSaturation: number;
    };
  })[];
  overallStatus: 'stable' | 'improving' | 'concerning' | 'critical';
  daysAdmitted: number;
}

const statusColors = {
  stable: 'bg-green-100 text-green-700 border-green-200',
  improving: 'bg-blue-100 text-blue-700 border-blue-200',
  concerning: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const statusIcons = {
  stable: <CheckCircle className="w-4 h-4" />,
  improving: <TrendingUp className="w-4 h-4" />,
  concerning: <AlertTriangle className="w-4 h-4" />,
  critical: <AlertTriangle className="w-4 h-4" />,
};

export default function PostOpCarePage() {
  useAuth(); // Ensure authenticated
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);
  const [showCarePlanModal, setShowCarePlanModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PostOpPatient | null>(null);
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
  const [_viewMode, _setViewMode] = useState<'grid' | 'list'>('grid'); // Reserved for future use
  const [filterDays, setFilterDays] = useState<'all' | '3' | '7' | '14' | '30'>('all');

  // Fetch data
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive === true).toArray(), []);
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const admissions = useLiveQuery(() => db.admissions.where('status').equals('active').toArray(), []);
  const surgeries = useLiveQuery(() => db.surgeries.where('status').equals('completed').toArray(), []);
  const postOpNotes = useLiveQuery(() => db.postOperativeNotes.toArray(), []);
  const vitalSigns = useLiveQuery(() => db.vitalSigns.orderBy('recordedAt').reverse().toArray(), []);
  const users = useLiveQuery(() => db.users.toArray(), []);

  // Build post-op patients list
  const postOpPatients = useMemo(() => {
    if (!patients || !admissions || !surgeries) return [];

    const now = new Date();
    const result: PostOpPatient[] = [];

    // Get admitted patients with completed surgeries
    admissions.forEach(admission => {
      const patient = patients.find(p => p.id === admission.patientId);
      if (!patient) return;

      // Get surgeries for this patient that are completed
      const patientSurgeries = surgeries
        .filter(s => s.patientId === patient.id && s.status === 'completed')
        .map(s => {
          const surgeryDate = new Date(s.scheduledDate);
          const dayPostOp = differenceInDays(now, surgeryDate);
          const hoursPostOp = differenceInHours(now, surgeryDate);
          const postOpNote = postOpNotes?.find((n: PostOperativeNote) => n.surgeryId === s.id);
          
          // Get latest vitals for this patient
          const patientVitals = vitalSigns?.filter(v => v.patientId === patient.id)?.[0];
          
          return {
            ...s,
            dayPostOp,
            hoursPostOp,
            postOpNote,
            latestVitals: patientVitals ? {
              bloodPressure: `${patientVitals.bloodPressureSystolic || 0}/${patientVitals.bloodPressureDiastolic || 0}`,
              heartRate: patientVitals.pulse || 0,
              temperature: patientVitals.temperature || 0,
              oxygenSaturation: patientVitals.oxygenSaturation || 0,
            } : undefined,
          };
        })
        .filter(s => s.dayPostOp >= 0 && s.dayPostOp <= 30) // Only show surgeries within last 30 days
        .sort((a, b) => b.dayPostOp - a.dayPostOp);

      if (patientSurgeries.length === 0) return;

      // Determine overall status based on latest vitals and days post-op
      let overallStatus: PostOpPatient['overallStatus'] = 'stable';
      const latestVitals = patientSurgeries[0].latestVitals;
      if (latestVitals) {
        if (latestVitals.oxygenSaturation < 90 || latestVitals.heartRate > 120 || latestVitals.temperature > 38.5) {
          overallStatus = 'critical';
        } else if (latestVitals.oxygenSaturation < 94 || latestVitals.heartRate > 100 || latestVitals.temperature > 38) {
          overallStatus = 'concerning';
        }
      }

      const daysAdmitted = differenceInDays(now, new Date(admission.admissionDate));

      result.push({
        patient,
        admission,
        surgeries: patientSurgeries,
        overallStatus,
        daysAdmitted,
      });
    });

    return result.sort((a, b) => {
      // Sort by status priority then by most recent surgery
      const statusPriority = { critical: 0, concerning: 1, stable: 2, improving: 3 };
      const priorityDiff = statusPriority[a.overallStatus] - statusPriority[b.overallStatus];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.surgeries[0]?.dayPostOp || 0) - (b.surgeries[0]?.dayPostOp || 0);
    });
  }, [patients, admissions, surgeries, postOpNotes, vitalSigns]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    let filtered = postOpPatients;

    // Hospital filter
    if (selectedHospital !== 'all') {
      filtered = filtered.filter(p => p.admission.hospitalId === selectedHospital);
    }

    // Days filter
    if (filterDays !== 'all') {
      const maxDays = parseInt(filterDays);
      filtered = filtered.filter(p => 
        p.surgeries.some(s => s.dayPostOp <= maxDays)
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        `${p.patient.firstName} ${p.patient.lastName}`.toLowerCase().includes(query) ||
        p.patient.hospitalNumber.toLowerCase().includes(query) ||
        p.surgeries.some(s => s.procedureName?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [postOpPatients, selectedHospital, filterDays, searchQuery]);

  // Statistics
  const stats = useMemo(() => ({
    total: filteredPatients.length,
    critical: filteredPatients.filter(p => p.overallStatus === 'critical').length,
    concerning: filteredPatients.filter(p => p.overallStatus === 'concerning').length,
    stable: filteredPatients.filter(p => p.overallStatus === 'stable').length,
    todaySurgeries: filteredPatients.filter(p => 
      p.surgeries.some(s => s.dayPostOp === 0)
    ).length,
  }), [filteredPatients]);

  const openMonitoring = (patient: PostOpPatient, surgery: Surgery) => {
    setSelectedPatient(patient);
    setSelectedSurgery(surgery);
    setShowMonitoringModal(true);
  };

  const openCarePlan = (patient: PostOpPatient, surgery: Surgery) => {
    setSelectedPatient(patient);
    setSelectedSurgery(surgery);
    setShowCarePlanModal(true);
  };

  // Get hospital name (used in expanded views)
  const getHospitalName = (id: string) => {
    return hospitals?.find(h => h.id === id)?.name || 'Unknown';
  };
  // Prevent unused warning
  void getHospitalName;

  const getSurgeonName = (id: string) => {
    const surgeon = users?.find(u => u.id === id);
    return surgeon ? `Dr. ${surgeon.firstName} ${surgeon.lastName}` : 'Unknown';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-sky-500" />
            Post-Operative Care
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Monitor and manage post-operative patients with care plans and tracking
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 bg-gradient-to-br from-sky-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
              <User className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Patients</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-xs text-gray-500">Critical</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.concerning}</p>
              <p className="text-xs text-gray-500">Concerning</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.stable}</p>
              <p className="text-xs text-gray-500">Stable</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4 bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.todaySurgeries}</p>
              <p className="text-xs text-gray-500">POD 0 (Today)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients, procedures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        <select
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="input w-full sm:w-48"
          title="Filter by hospital"
          aria-label="Filter by hospital"
        >
          <option value="all">All Hospitals</option>
          {hospitals?.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['all', '3', '7', '14', '30'] as const).map((days) => (
            <button
              key={days}
              onClick={() => setFilterDays(days)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterDays === days
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {days === 'all' ? 'All' : `≤${days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards */}
      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPatients.map((postOpPatient) => (
            <motion.div
              key={postOpPatient.patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card overflow-hidden border-l-4 ${
                postOpPatient.overallStatus === 'critical' ? 'border-l-red-500' :
                postOpPatient.overallStatus === 'concerning' ? 'border-l-amber-500' :
                'border-l-green-500'
              }`}
            >
              {/* Patient Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {postOpPatient.patient.firstName} {postOpPatient.patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {postOpPatient.patient.hospitalNumber}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${statusColors[postOpPatient.overallStatus]}`}>
                    {statusIcons[postOpPatient.overallStatus]}
                    {postOpPatient.overallStatus}
                  </span>
                </div>
                
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Day {postOpPatient.daysAdmitted} admitted
                  </span>
                  <span className="flex items-center gap-1">
                    <Stethoscope size={12} />
                    {postOpPatient.surgeries.length} procedure(s)
                  </span>
                </div>
              </div>

              {/* Surgeries List */}
              <div className="divide-y">
                {postOpPatient.surgeries.map((surgery) => (
                  <div key={surgery.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {surgery.procedureName || surgery.type}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {format(new Date(surgery.scheduledDate), 'MMM d, yyyy')} • {getSurgeonName(surgery.surgeonId || '')}
                        </p>
                      </div>
                      <PostOpDayCounter 
                        dayPostOp={surgery.dayPostOp} 
                        hoursPostOp={surgery.hoursPostOp}
                      />
                    </div>

                    {/* Latest Vitals */}
                    {surgery.latestVitals && (
                      <div className="grid grid-cols-4 gap-2 mt-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <Heart size={12} className="mx-auto text-red-500 mb-1" />
                          <p className="text-xs font-medium">{surgery.latestVitals.heartRate}</p>
                          <p className="text-[10px] text-gray-400">HR</p>
                        </div>
                        <div className="text-center">
                          <Activity size={12} className="mx-auto text-blue-500 mb-1" />
                          <p className="text-xs font-medium">{surgery.latestVitals.bloodPressure}</p>
                          <p className="text-[10px] text-gray-400">BP</p>
                        </div>
                        <div className="text-center">
                          <Thermometer size={12} className="mx-auto text-orange-500 mb-1" />
                          <p className="text-xs font-medium">{surgery.latestVitals.temperature}°C</p>
                          <p className="text-[10px] text-gray-400">Temp</p>
                        </div>
                        <div className="text-center">
                          <Activity size={12} className="mx-auto text-green-500 mb-1" />
                          <p className="text-xs font-medium">{surgery.latestVitals.oxygenSaturation}%</p>
                          <p className="text-[10px] text-gray-400">SpO2</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openMonitoring(postOpPatient, surgery)}
                        className="btn btn-sm btn-primary flex-1"
                      >
                        <Plus size={14} />
                        Record
                      </button>
                      <button
                        onClick={() => navigate(`/post-op-care/charts/${postOpPatient.patient.id}/${surgery.id}`)}
                        className="btn btn-sm btn-secondary flex-1"
                      >
                        <BarChart3 size={14} />
                        Charts
                      </button>
                      <button
                        onClick={() => openCarePlan(postOpPatient, surgery)}
                        className="btn btn-sm btn-secondary"
                        title="Care Plan"
                        aria-label="View Care Plan"
                      >
                        <ClipboardList size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* View Patient */}
              <div className="p-3 bg-gray-50 border-t">
                <button
                  onClick={() => navigate(`/patients/${postOpPatient.patient.id}`)}
                  className="w-full btn btn-ghost text-sm"
                >
                  View Full Patient Record
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Post-Operative Patients</h3>
          <p className="text-gray-500">
            {searchQuery || selectedHospital !== 'all' || filterDays !== 'all'
              ? 'Try adjusting your filters'
              : 'Post-operative patients will appear here after surgery completion'}
          </p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showMonitoringModal && selectedPatient && selectedSurgery && (
          <PostOpMonitoringModal
            patient={selectedPatient.patient}
            surgery={selectedSurgery}
            onClose={() => {
              setShowMonitoringModal(false);
              setSelectedPatient(null);
              setSelectedSurgery(null);
            }}
          />
        )}
        {showCarePlanModal && selectedPatient && selectedSurgery && (
          <PostOpCarePlanModal
            patient={selectedPatient.patient}
            surgery={selectedSurgery}
            onClose={() => {
              setShowCarePlanModal(false);
              setSelectedPatient(null);
              setSelectedSurgery(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
