// Discharge Management Page
// Comprehensive discharge workflow with summary generation and follow-up tracking

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Search,
  FileText,
  User,
  Calendar,
  Clock,
  CheckCircle,
  Eye,
  Building2,
  RefreshCw,
  BookOpen,
  ClipboardCheck,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Admission, DischargeSummary, User as UserType } from '../../../types';
import DischargeFormModal from '../components/DischargeFormModal';
import DischargeSummaryView from '../components/DischargeSummaryView';
import FollowUpTracker from '../components/FollowUpTracker';
import DischargeChecklist from '../components/DischargeChecklist';
import AMADischargeForm from '../components/AMADischargeForm';
import PatientEducationSheet from '../components/PatientEducationSheet';
import DischargeReadinessAssessment from '../components/DischargeReadinessAssessment';
import { usePatientMap } from '../../../services/patientHooks';
import { EntryTrackingBadge } from '../../../components/common';
import type { EntryTrackingInfo } from '../../../components/common';

// Status and color mappings for future use
// @ts-expect-error Reserved for future status display feature
const _statusColors = {
  draft: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  exported: 'bg-blue-100 text-blue-700',
};

// @ts-expect-error Reserved for future condition display feature
const _conditionColors = {
  improved: 'bg-green-100 text-green-700',
  stable: 'bg-blue-100 text-blue-700',
  unchanged: 'bg-yellow-100 text-yellow-700',
  deteriorated: 'bg-red-100 text-red-700',
};

// @ts-expect-error Reserved for future disposition labels feature
const _dispositionLabels = {
  home: 'Discharged Home',
  facility: 'To Facility',
  hospice: 'To Hospice',
  transfer: 'Transfer',
  'against-advice': 'Against Medical Advice',
  deceased: 'Deceased',
};

interface DischargePageProps {
  embedded?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DischargePage({ embedded: _embedded = false }: DischargePageProps) {
  useAuth(); // Auth context needed for re-render on auth changes
  const [showDischargeForm, setShowDischargeForm] = useState(false);
  const [showSummaryView, setShowSummaryView] = useState(false);
  const [showFollowUpTracker, setShowFollowUpTracker] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAMAForm, setShowAMAForm] = useState(false);
  const [showEducationSheet, setShowEducationSheet] = useState(false);
  const [showReadinessAssessment, setShowReadinessAssessment] = useState(false);
  const [showDischargeMenu, setShowDischargeMenu] = useState<string | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<DischargeSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Fetch data
  const admissions = useLiveQuery(
    () => db.admissions.orderBy('admissionDate').reverse().toArray(),
    []
  );

  const dischargeSummaries = useLiveQuery(
    () => db.dischargeSummaries.orderBy('createdAt').reverse().toArray(),
    []
  );

  const users = useLiveQuery(() => db.users.toArray(), []);

  // Use the new patient map hook for efficient lookups
  const patientMap = usePatientMap();

  const userMap = useMemo(() => {
    const map = new Map<string, UserType>();
    users?.forEach(u => map.set(u.id!, u));
    return map;
  }, [users]);

  // Helper to get entry tracking info for an admission (admitted by or discharged by)
  const getAdmissionTracking = (admission: Admission): EntryTrackingInfo | undefined => {
    const admittedByUser = userMap.get(admission.admittedBy);
    if (admittedByUser) {
      return {
        userId: admittedByUser.id!,
        userName: `${admittedByUser.firstName} ${admittedByUser.lastName}`,
        userRole: admittedByUser.role,
        timestamp: admission.admissionDate,
      };
    }
    return undefined;
  };

  // Helper for discharge tracking
  const getDischargeTracking = (admission: Admission): EntryTrackingInfo | undefined => {
    if (!admission.dischargedBy || !admission.dischargeDate) return undefined;
    const dischargedByUser = userMap.get(admission.dischargedBy);
    if (dischargedByUser) {
      return {
        userId: dischargedByUser.id!,
        userName: `${dischargedByUser.firstName} ${dischargedByUser.lastName}`,
        userRole: dischargedByUser.role,
        timestamp: admission.dischargeDate,
      };
    }
    return undefined;
  };

  const summaryMap = useMemo(() => {
    const map = new Map();
    dischargeSummaries?.forEach(s => map.set(s.id, s));
    return map;
  }, [dischargeSummaries]);

  // Active admissions awaiting discharge
  const pendingDischarges = useMemo(() => {
    if (!admissions) return [];
    return admissions.filter(a => a.status === 'active');
  }, [admissions]);

  // Completed discharges
  const completedDischarges = useMemo(() => {
    if (!admissions) return [];
    return admissions.filter(a => a.status === 'discharged');
  }, [admissions]);

  // Filter logic
  const filteredAdmissions = useMemo(() => {
    let list = admissions || [];

    // Status filter
    if (statusFilter === 'pending') {
      list = list.filter(a => a.status === 'active');
    } else if (statusFilter === 'completed') {
      list = list.filter(a => a.status === 'discharged');
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      list = list.filter(a => {
        const date = a.status === 'discharged' && a.dischargeDate 
          ? new Date(a.dischargeDate) 
          : new Date(a.admissionDate);
        return format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      });
    } else if (dateFilter === 'week') {
      list = list.filter(a => {
        const date = a.status === 'discharged' && a.dischargeDate 
          ? new Date(a.dischargeDate) 
          : new Date(a.admissionDate);
        return differenceInDays(now, date) <= 7;
      });
    } else if (dateFilter === 'month') {
      list = list.filter(a => {
        const date = a.status === 'discharged' && a.dischargeDate 
          ? new Date(a.dischargeDate) 
          : new Date(a.admissionDate);
        return differenceInDays(now, date) <= 30;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(a => {
        const patient = patientMap.get(a.patientId);
        return (
          a.admissionNumber.toLowerCase().includes(query) ||
          a.wardName.toLowerCase().includes(query) ||
          a.admissionDiagnosis.toLowerCase().includes(query) ||
          (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(query))
        );
      });
    }

    return list;
  }, [admissions, statusFilter, dateFilter, searchQuery, patientMap]);

  // Statistics
  const stats = useMemo(() => {
    const pending = pendingDischarges.length;
    const completed = completedDischarges.length;
    const todayDischarges = completedDischarges.filter(a => 
      a.dischargeDate && format(new Date(a.dischargeDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;
    const pendingFollowups = dischargeSummaries?.filter(s => 
      s.followUpAppointments.some(f => f.status === 'scheduled')
    ).length || 0;

    return { pending, completed, todayDischarges, pendingFollowups };
  }, [pendingDischarges, completedDischarges, dischargeSummaries]);

  const handleInitiateDischarge = (admission: Admission) => {
    setSelectedAdmission(admission);
    setShowChecklist(true);
    setShowDischargeMenu(null);
  };

  const handleChecklistComplete = () => {
    setShowChecklist(false);
    setShowDischargeForm(true);
  };

  const handleReadinessAssessment = (admission: Admission) => {
    setSelectedAdmission(admission);
    setShowReadinessAssessment(true);
    setShowDischargeMenu(null);
  };

  const handleAMADischarge = (admission: Admission) => {
    setSelectedAdmission(admission);
    setShowAMAForm(true);
    setShowDischargeMenu(null);
  };

  const handleViewEducation = (summary: DischargeSummary) => {
    setSelectedSummary(summary);
    setShowEducationSheet(true);
  };

  const handleViewSummary = (admission: Admission) => {
    if (admission.dischargeSummaryId) {
      const summary = summaryMap.get(admission.dischargeSummaryId);
      if (summary) {
        setSelectedSummary(summary);
        setShowSummaryView(true);
      }
    }
  };

  const handleDischargeComplete = () => {
    setShowDischargeForm(false);
    setShowAMAForm(false);
    setSelectedAdmission(null);
    toast.success('Patient discharged successfully!');
  };

  const toggleDischargeMenu = (admissionId: string) => {
    setShowDischargeMenu(showDischargeMenu === admissionId ? null : admissionId);
  };

  const getLOSDays = (admission: Admission) => {
    const endDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    return differenceInDays(endDate, new Date(admission.admissionDate)) + 1;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <LogOut className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
            Discharge Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Process patient discharges with comprehensive summaries and follow-up tracking
          </p>
        </div>
        <button
          onClick={() => setShowFollowUpTracker(true)}
          className="btn btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <RefreshCw size={18} />
          Follow-up Tracker
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <div className="card p-4 bg-gradient-to-br from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              <p className="text-xs text-gray-600">Pending Discharge</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.todayDischarges}</p>
              <p className="text-xs text-gray-600">Today's Discharges</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              <p className="text-xs text-gray-600">Total Discharged</p>
            </div>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-purple-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.pendingFollowups}</p>
              <p className="text-xs text-gray-600">Pending Follow-ups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, admission #, ward, or diagnosis..."
              className="input pl-10 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed')}
            className="input w-full sm:w-44"
            title="Filter by status"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Discharge</option>
            <option value="completed">Discharged</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
            className="input w-full sm:w-40"
            title="Filter by date"
            aria-label="Filter by date"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Admissions List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredAdmissions.length === 0 ? (
          <div className="card p-12 text-center">
            <LogOut className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
            <p className="text-gray-500">
              {statusFilter === 'pending' 
                ? 'No patients currently awaiting discharge'
                : 'No discharge records match your search criteria'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAdmissions.map((admission) => {
              const patient = patientMap.get(admission.patientId);
              const isActive = admission.status === 'active';
              const losDays = getLOSDays(admission);

              return (
                <motion.div
                  key={admission.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`card p-4 hover:shadow-md transition-shadow ${
                    isActive ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-green-400'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {admission.admissionNumber}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {admission.wardName} - Bed {admission.bedNumber}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            <span className="font-medium">Dx:</span> {admission.admissionDiagnosis}
                          </p>
                          {/* Entry Tracking Badges */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getAdmissionTracking(admission) && (
                              <EntryTrackingBadge 
                                tracking={getAdmissionTracking(admission)!} 
                                mode="compact"
                                showTimestamp={false}
                              />
                            )}
                            {!isActive && getDischargeTracking(admission) && (
                              <EntryTrackingBadge 
                                tracking={getDischargeTracking(admission)!} 
                                mode="compact"
                                showTimestamp={false}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admission Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Admitted: {format(new Date(admission.admissionDate), 'dd MMM yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium text-indigo-700">LOS: {losDays} days</span>
                      </div>
                      {!isActive && admission.dischargeDate && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Discharged: {format(new Date(admission.dischargeDate), 'dd MMM yyyy')}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleInitiateDischarge(admission)}
                              className="btn btn-primary flex items-center gap-2"
                            >
                              <LogOut size={16} />
                              Discharge
                            </button>
                            <button
                              onClick={() => toggleDischargeMenu(admission.id)}
                              className="btn btn-secondary p-2"
                              title="More options"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                          
                          {/* Dropdown Menu */}
                          {showDischargeMenu === admission.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                              <div className="p-2">
                                <button
                                  onClick={() => handleReadinessAssessment(admission)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                  <ClipboardCheck size={16} className="text-teal-500" />
                                  Readiness Assessment
                                </button>
                                <button
                                  onClick={() => handleAMADischarge(admission)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <XCircle size={16} />
                                  Discharge Against Advice
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {admission.dischargeSummaryId && (
                            <>
                              <button
                                onClick={() => handleViewSummary(admission)}
                                className="btn btn-secondary flex items-center gap-2"
                              >
                                <Eye size={16} />
                                Summary
                              </button>
                              <button
                                onClick={() => {
                                  const summary = summaryMap.get(admission.dischargeSummaryId!);
                                  if (summary) handleViewEducation(summary);
                                }}
                                className="btn btn-secondary flex items-center gap-2"
                                title="Patient Education Sheet"
                              >
                                <BookOpen size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showChecklist && selectedAdmission && (
          <DischargeChecklist
            admission={selectedAdmission}
            patient={patientMap.get(selectedAdmission.patientId)!}
            onComplete={handleChecklistComplete}
            onClose={() => {
              setShowChecklist(false);
              setSelectedAdmission(null);
            }}
          />
        )}

        {showReadinessAssessment && selectedAdmission && (
          <DischargeReadinessAssessment
            admission={selectedAdmission}
            patient={patientMap.get(selectedAdmission.patientId)!}
            onComplete={(assessment) => {
              setShowReadinessAssessment(false);
              if (assessment.score / assessment.maxScore >= 0.7) {
                setShowChecklist(true);
              } else {
                toast.error('Patient does not meet discharge criteria yet');
                setSelectedAdmission(null);
              }
            }}
            onClose={() => {
              setShowReadinessAssessment(false);
              setSelectedAdmission(null);
            }}
          />
        )}

        {showDischargeForm && selectedAdmission && (
          <DischargeFormModal
            admission={selectedAdmission}
            patient={patientMap.get(selectedAdmission.patientId)}
            onClose={() => {
              setShowDischargeForm(false);
              setSelectedAdmission(null);
            }}
            onComplete={handleDischargeComplete}
          />
        )}

        {showAMAForm && selectedAdmission && (
          <AMADischargeForm
            admission={selectedAdmission}
            patient={patientMap.get(selectedAdmission.patientId)!}
            onClose={() => {
              setShowAMAForm(false);
              setSelectedAdmission(null);
            }}
            onComplete={handleDischargeComplete}
          />
        )}

        {showSummaryView && selectedSummary && (
          <DischargeSummaryView
            summary={selectedSummary}
            patient={patientMap.get(selectedSummary.patientId)}
            onClose={() => {
              setShowSummaryView(false);
              setSelectedSummary(null);
            }}
          />
        )}

        {showEducationSheet && selectedSummary && (
          <PatientEducationSheet
            summary={selectedSummary}
            patient={patientMap.get(selectedSummary.patientId)!}
            onClose={() => {
              setShowEducationSheet(false);
              setSelectedSummary(null);
            }}
          />
        )}

        {showFollowUpTracker && (
          <FollowUpTracker
            onClose={() => setShowFollowUpTracker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
