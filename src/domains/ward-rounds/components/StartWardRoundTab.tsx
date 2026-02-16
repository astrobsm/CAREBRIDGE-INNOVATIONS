/**
 * Start Ward Round Tab
 * Reviews admitted patients with wound care needs, wound assessments, and progress tracking
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clipboard,
  Calendar,
  Bed,
  Search,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Ruler,
  Clock,
  Stethoscope,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { syncRecord } from '../../../services/cloudSyncService';
import { v4 as uuidv4 } from 'uuid';

interface StartWardRoundTabProps {
  searchQuery: string;
  selectedHospital: string;
}

export default function StartWardRoundTab({ searchQuery, selectedHospital }: StartWardRoundTabProps) {
  const { user } = useAuth();
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [roundNotes, setRoundNotes] = useState<Record<string, string>>({});
  const [reviewedPatients, setReviewedPatients] = useState<Set<string>>(new Set());

  // Fetch admitted patients
  const admissions = useLiveQuery(
    () => db.admissions.where('status').equals('active').toArray(),
    []
  );

  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive !== false).toArray(), []);
  const wounds = useLiveQuery(() => db.wounds.toArray(), []);
  const vitals = useLiveQuery(() => db.vitalSigns.toArray(), []);

  // Build patient map
  const patientMap = useMemo(() => {
    const map = new Map<string, any>();
    patients?.forEach(p => map.set(p.id!, p));
    return map;
  }, [patients]);

  // Get admitted patients with their wound data
  const admittedPatients = useMemo(() => {
    if (!admissions || !patients) return [];

    return admissions
      .map(admission => {
        const patient = patientMap.get(admission.patientId);
        if (!patient) return null;

        // Filter by hospital
        if (selectedHospital !== 'all' && admission.hospitalId !== selectedHospital) return null;

        // Filter by search
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) &&
            !(patient.hospitalNumber || '').toLowerCase().includes(searchQuery.toLowerCase())) {
          return null;
        }

        // Get patient's wounds
        const patientWounds = wounds?.filter(w => w.patientId === patient.id) || [];
        const activeWounds = patientWounds.filter(w => w.healingProgress !== 'healed');

        // Get latest vitals
        const patientVitals = vitals
          ?.filter(v => v.patientId === patient.id)
          .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        const latestVitals = patientVitals?.[0];

        // Calculate days admitted
        const daysAdmitted = differenceInDays(new Date(), new Date(admission.admissionDate));

        return {
          patient,
          admission,
          wounds: patientWounds,
          activeWounds,
          latestVitals,
          daysAdmitted,
          hasWoundCareNeeds: activeWounds.length > 0,
          priority: activeWounds.length > 0 ? (activeWounds.some(w => w.healingProgress === 'deteriorating') ? 'high' : 'medium') : 'low',
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Priority: high > medium > low, then by wound count
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const pDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
        if (pDiff !== 0) return pDiff;
        return (b.activeWounds?.length || 0) - (a.activeWounds?.length || 0);
      });
  }, [admissions, patients, wounds, vitals, selectedHospital, searchQuery, patientMap]);

  const getProgressIcon = (progress?: string) => {
    switch (progress) {
      case 'improving': return <TrendingUp className="text-green-500" size={16} />;
      case 'deteriorating': return <TrendingDown className="text-red-500" size={16} />;
      case 'static': return <Minus className="text-amber-500" size={16} />;
      default: return <Activity className="text-gray-400" size={16} />;
    }
  };

  const handleMarkReviewed = (patientId: string) => {
    setReviewedPatients(prev => new Set(prev).add(patientId));
    toast.success('Patient marked as reviewed');
  };

  const handleStartFullRound = async () => {
    if (reviewedPatients.size === 0) {
      toast.error('Review at least one patient before completing the round');
      return;
    }

    try {
      const roundId = uuidv4();
      const roundData = {
        id: roundId,
        hospitalId: selectedHospital !== 'all' ? selectedHospital : user?.hospitalId || '',
        wardName: 'All Wards',
        roundDate: format(new Date(), 'yyyy-MM-dd'),
        roundTime: format(new Date(), 'HH:mm'),
        roundType: 'morning' as const,
        status: 'completed' as const,
        leadDoctorId: user?.id || '',
        leadDoctorName: `${user?.firstName} ${user?.lastName}`,
        leadDoctorDesignation: 'consultant' as const,
        teamMemberIds: [],
        patients: Array.from(reviewedPatients).map(patientId => {
          const patientData = admittedPatients.find((p: any) => p?.patient?.id === patientId);
          return {
            patientId,
            notes: roundNotes[patientId] || '',
            woundStatus: patientData?.activeWounds?.length ? 'Active wounds reviewed' : 'No active wounds',
          };
        }),
        notes: `Ward round completed. ${reviewedPatients.size} patients reviewed with wound care assessment.`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.wardRounds.put(roundData as any);
      await syncRecord('wardRounds', roundId);

      toast.success(`Ward round completed: ${reviewedPatients.size} patients reviewed`);
      setReviewedPatients(new Set());
      setRoundNotes({});
    } catch (err) {
      console.error('Failed to save ward round:', err);
      toast.error('Failed to save ward round');
    }
  };

  const totalAdmitted = admittedPatients.length;
  const withWounds = admittedPatients.filter((p: any) => p?.hasWoundCareNeeds).length;
  const reviewed = reviewedPatients.size;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Bed size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalAdmitted}</p>
              <p className="text-xs text-gray-500">Admitted Patients</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg"><CircleDot size={20} className="text-rose-600" /></div>
            <div>
              <p className="text-2xl font-bold">{withWounds}</p>
              <p className="text-xs text-gray-500">With Active Wounds</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{reviewed}</p>
              <p className="text-xs text-gray-500">Reviewed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalAdmitted - reviewed}</p>
              <p className="text-xs text-gray-500">Pending Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Round Button */}
      {reviewed > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">Ward Round Progress</p>
            <p className="text-sm text-green-600">{reviewed} of {totalAdmitted} patients reviewed</p>
          </div>
          <button onClick={handleStartFullRound} className="btn btn-success">
            <CheckCircle size={18} />
            Complete Ward Round
          </button>
        </motion.div>
      )}

      {/* Patient List */}
      <div className="space-y-3">
        {admittedPatients.length === 0 ? (
          <div className="card p-12 text-center">
            <Bed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No admitted patients found</p>
            <p className="text-sm text-gray-400 mt-1">Admit patients to start ward rounds</p>
          </div>
        ) : (
          admittedPatients.map((data: any) => {
            if (!data) return null;
            const { patient, admission, activeWounds, latestVitals, daysAdmitted, hasWoundCareNeeds, priority } = data;
            const isExpanded = expandedPatientId === patient.id;
            const isReviewed = reviewedPatients.has(patient.id);

            return (
              <motion.div key={patient.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-sm border ${
                  isReviewed ? 'border-green-300 bg-green-50/30' :
                  priority === 'high' ? 'border-red-200' :
                  priority === 'medium' ? 'border-amber-200' : 'border-gray-100'
                } overflow-hidden`}
              >
                {/* Patient Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedPatientId(isExpanded ? null : patient.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        priority === 'high' ? 'bg-red-100' :
                        priority === 'medium' ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        <User size={20} className={
                          priority === 'high' ? 'text-red-600' :
                          priority === 'medium' ? 'text-amber-600' : 'text-gray-600'
                        } />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                          {isReviewed && <CheckCircle className="inline ml-2 text-green-500" size={16} />}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {patient.hospitalNumber} • Ward: {admission.wardName} • Bed: {admission.bedNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasWoundCareNeeds && (
                        <span className="badge badge-danger text-xs">
                          <CircleDot size={12} /> {activeWounds.length} wound{activeWounds.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{daysAdmitted}d admitted</span>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Quick Info Row */}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span><Calendar size={12} className="inline mr-1" />
                      Admitted: {format(new Date(admission.admissionDate), 'dd MMM yyyy')}</span>
                    <span><Stethoscope size={12} className="inline mr-1" />
                      {admission.admissionDiagnosis}</span>
                    {latestVitals && (
                      <span><Activity size={12} className="inline mr-1" />
                        BP: {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic},
                        Temp: {latestVitals.temperature}°C,
                        SpO2: {latestVitals.oxygenSaturation}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-100">
                        {/* Wound Assessments */}
                        {activeWounds.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <CircleDot size={16} className="text-rose-500" />
                              Active Wounds ({activeWounds.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {activeWounds.map((wound: any) => (
                                <div key={wound.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{wound.location}</span>
                                    <span className="flex items-center gap-1 text-xs">
                                      {getProgressIcon(wound.healingProgress)}
                                      {wound.healingProgress || 'Unknown'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center p-2 bg-white rounded">
                                      <p className="font-bold">{wound.length}×{wound.width}</p>
                                      <p className="text-gray-500">L×W (cm)</p>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                      <p className="font-bold">{wound.area ? Number(wound.area).toFixed(1) : (wound.length * wound.width).toFixed(1)}</p>
                                      <p className="text-gray-500">Area (cm²)</p>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded">
                                      <p className="font-bold">{wound.painLevel}/10</p>
                                      <p className="text-gray-500">Pain</p>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {wound.tissueType?.map((t: string) => (
                                      <span key={t} className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">{t}</span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    <Ruler size={10} className="inline mr-1" />
                                    Exudate: {wound.exudateAmount} • Odor: {wound.odor ? 'Yes' : 'No'}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Assessed: {format(new Date(wound.createdAt), 'dd MMM yyyy')} 
                                    ({differenceInDays(new Date(), new Date(wound.createdAt))} days ago)
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Round Notes */}
                        <div className="mt-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            <Clipboard size={14} className="inline mr-1" />
                            Ward Round Notes
                          </label>
                          <textarea
                            value={roundNotes[patient.id] || ''}
                            onChange={(e) => setRoundNotes(prev => ({ ...prev, [patient.id]: e.target.value }))}
                            placeholder="Enter notes for this patient's review..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          {!isReviewed ? (
                            <button
                              onClick={() => handleMarkReviewed(patient.id)}
                              className="btn btn-sm btn-primary"
                            >
                              <CheckCircle size={14} />
                              Mark as Reviewed
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                              <CheckCircle size={14} /> Reviewed
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
