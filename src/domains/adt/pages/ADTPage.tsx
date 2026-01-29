import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble,
  LogOut,
  ArrowRightLeft,
  Users,
  Search,
  Filter,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Activity,
  ChevronRight,
  FileText,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { db } from '../../../database';
import type { Patient } from '../../../types';

// Import admission components
import AdmissionsPage from '../../admissions/pages/AdmissionsPage';
import DischargePage from '../../discharge/pages/DischargePage';

type ADTTab = 'overview' | 'admissions' | 'inpatients' | 'discharges' | 'transfers';

interface ADTStats {
  totalAdmissions: number;
  todayAdmissions: number;
  currentInpatients: number;
  pendingDischarges: number;
  todayDischarges: number;
  pendingTransfers: number;
  averageLOS: number;
  bedOccupancy: number;
  criticalPatients: number;
}

const ADTPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ADTTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedAdmissionId, setSelectedAdmissionId] = useState<string | null>(null);

  // Fetch all admissions
  const admissions = useLiveQuery(() => db.admissions.toArray()) || [];
  const patients = useLiveQuery(() => db.patients.toArray()) || [];

  // Create patient map for quick lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach(p => map.set(p.id!, p));
    return map;
  }, [patients]);

  // Calculate ADT statistics
  const stats = useMemo<ADTStats>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAdmissions = admissions.filter(a => a.status === 'active');
    const todayAdmitted = admissions.filter(a => {
      const admitDate = new Date(a.admissionDate);
      admitDate.setHours(0, 0, 0, 0);
      return admitDate.getTime() === today.getTime();
    });

    const dischargedToday = admissions.filter(a => {
      if (a.status !== 'discharged' || !a.dischargeDate) return false;
      const dischargeDate = new Date(a.dischargeDate);
      dischargeDate.setHours(0, 0, 0, 0);
      return dischargeDate.getTime() === today.getTime();
    });

    // For pending discharges, use estimatedStayDays to calculate expected discharge
    const pendingDischarges = admissions.filter(a => {
      if (a.status !== 'active' || !a.estimatedStayDays) return false;
      const expectedDate = new Date(a.admissionDate);
      expectedDate.setDate(expectedDate.getDate() + a.estimatedStayDays);
      return expectedDate <= new Date();
    });

    const criticalPatients = activeAdmissions.filter(a => a.severity === 'critical');

    // Calculate average length of stay for discharged patients
    const dischargedWithDates = admissions.filter(a => 
      a.status === 'discharged' && a.dischargeDate
    );
    const totalLOS = dischargedWithDates.reduce((sum, a) => {
      const days = differenceInDays(new Date(a.dischargeDate!), new Date(a.admissionDate));
      return sum + days;
    }, 0);
    const averageLOS = dischargedWithDates.length > 0 
      ? totalLOS / dischargedWithDates.length 
      : 0;

    // Estimate bed occupancy (assuming 100 beds total for demo)
    const totalBeds = 100;
    const bedOccupancy = (activeAdmissions.length / totalBeds) * 100;

    return {
      totalAdmissions: admissions.length,
      todayAdmissions: todayAdmitted.length,
      currentInpatients: activeAdmissions.length,
      pendingDischarges: pendingDischarges.length,
      todayDischarges: dischargedToday.length,
      pendingTransfers: 0, // Will be populated when transfers are implemented
      averageLOS: Math.round(averageLOS * 10) / 10,
      bedOccupancy: Math.round(bedOccupancy),
      criticalPatients: criticalPatients.length,
    };
  }, [admissions]);

  // Filter inpatients based on search
  const filteredInpatients = useMemo(() => {
    const inpatients = admissions.filter(a => a.status === 'active');
    if (!searchTerm) return inpatients;
    
    return inpatients.filter(a => {
      const patient = patientMap.get(a.patientId);
      const searchLower = searchTerm.toLowerCase();
      return (
        (patient?.firstName || '').toLowerCase().includes(searchLower) ||
        (patient?.lastName || '').toLowerCase().includes(searchLower) ||
        (patient?.hospitalNumber || '').toLowerCase().includes(searchLower) ||
        (a.wardName || '').toLowerCase().includes(searchLower) ||
        (a.bedNumber || '').toLowerCase().includes(searchLower)
      );
    });
  }, [admissions, searchTerm, patientMap]);

  const tabs: { id: ADTTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'admissions', label: 'Admissions', icon: <BedDouble size={18} />, count: stats.todayAdmissions },
    { id: 'inpatients', label: 'In-Patients', icon: <Users size={18} />, count: stats.currentInpatients },
    { id: 'discharges', label: 'Discharges', icon: <LogOut size={18} />, count: stats.pendingDischarges },
    { id: 'transfers', label: 'Transfers', icon: <ArrowRightLeft size={18} />, count: stats.pendingTransfers },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'severe': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getWardTypeColor = (wardType: string) => {
    const colors: Record<string, string> = {
      icu: 'bg-red-500',
      hdu: 'bg-orange-500',
      surgical: 'bg-blue-500',
      burns: 'bg-amber-500',
      pediatric: 'bg-pink-500',
      maternity: 'bg-purple-500',
      general: 'bg-gray-500',
    };
    return colors[wardType] || 'bg-gray-500';
  };

  const getLOSStatus = (admissionDate: Date) => {
    const days = differenceInDays(new Date(), new Date(admissionDate));
    if (days > 14) return { color: 'text-red-600', label: 'Extended' };
    if (days > 7) return { color: 'text-yellow-600', label: 'Prolonged' };
    return { color: 'text-green-600', label: 'Normal' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="page-header">
          <div>
            <h1 className="page-title">ADT Management</h1>
            <p className="page-subtitle">
              Admission, Discharge & Transfer - Unified Patient Flow Management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Last updated: {format(new Date(), 'HH:mm')}
            </span>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh data">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BedDouble className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.currentInpatients}</p>
                      <p className="text-xs text-gray-500">Current Inpatients</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Plus className="text-green-600" size={24} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.todayAdmissions}</p>
                      <p className="text-xs text-gray-500">Today's Admissions</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <LogOut className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.todayDischarges}</p>
                      <p className="text-xs text-gray-500">Today's Discharges</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageLOS}</p>
                      <p className="text-xs text-gray-500">Avg LOS (days)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="text-red-600" size={24} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.criticalPatients}</p>
                      <p className="text-xs text-gray-500">Critical Patients</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bed Occupancy & Pending Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Bed Occupancy */}
                <div className="card card-compact p-4 sm:p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bed Occupancy</h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#e5e7eb"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke={stats.bedOccupancy > 90 ? '#ef4444' : stats.bedOccupancy > 75 ? '#f59e0b' : '#22c55e'}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(stats.bedOccupancy / 100) * 352} 352`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{stats.bedOccupancy}%</span>
                        <span className="text-xs text-gray-500">Occupied</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center gap-4 text-sm">
                    <span className="text-gray-500">{stats.currentInpatients} occupied</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">{100 - stats.currentInpatients} available</span>
                  </div>
                </div>

                {/* Pending Discharges */}
                <div className="card card-compact p-4 sm:p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Pending Discharges</h3>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      {stats.pendingDischarges}
                    </span>
                  </div>
                  {stats.pendingDischarges === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="mx-auto mb-2" size={32} />
                      <p>No pending discharges</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredInpatients
                        .filter(a => {
                          if (!a.estimatedStayDays) return false;
                          const expectedDate = new Date(a.admissionDate);
                          expectedDate.setDate(expectedDate.getDate() + a.estimatedStayDays);
                          return expectedDate <= new Date();
                        })
                        .slice(0, 5)
                        .map(admission => {
                          const patient = patientMap.get(admission.patientId);
                          return (
                            <div key={admission.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {patient?.firstName} {patient?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {admission.wardName} - Bed {admission.bedNumber}
                                </p>
                              </div>
                              <button 
                                onClick={() => setActiveTab('discharges')}
                                className="text-orange-600 hover:text-orange-800"
                                title="View discharge details"
                              >
                                <ChevronRight size={20} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Critical Patients */}
                <div className="card card-compact p-4 sm:p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Critical Patients</h3>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {stats.criticalPatients}
                    </span>
                  </div>
                  {stats.criticalPatients === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                      <p>No critical patients</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredInpatients
                        .filter(a => a.severity === 'critical')
                        .slice(0, 5)
                        .map(admission => {
                          const patient = patientMap.get(admission.patientId);
                          return (
                            <div key={admission.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {patient?.firstName} {patient?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {admission.wardName} - {admission.admissionDiagnosis}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                ICU
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              {/* Ward Distribution & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Ward Distribution */}
                <div className="card card-compact p-4 sm:p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ward Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(
                      filteredInpatients.reduce((acc, a) => {
                        acc[a.wardType] = (acc[a.wardType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([ward, count]) => (
                        <div key={ward} className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getWardTypeColor(ward)}`} />
                          <span className="flex-1 capitalize text-gray-700">{ward.replace('-', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getWardTypeColor(ward)}`}
                                style={{ width: `${(count / stats.currentInpatients) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card card-compact p-4 sm:p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {admissions
                      .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
                      .slice(0, 6)
                      .map(admission => {
                        const patient = patientMap.get(admission.patientId);
                        const isNew = differenceInHours(new Date(), new Date(admission.admissionDate)) < 24;
                        return (
                          <div key={admission.id} className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              admission.status === 'active' ? 'bg-green-500' : 
                              admission.status === 'discharged' ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 truncate">
                                  {patient?.firstName} {patient?.lastName}
                                </p>
                                {isNew && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">New</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {admission.status === 'active' ? 'Admitted to' : 'Discharged from'} {admission.wardName}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {format(new Date(admission.admissionDate), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card card-compact p-4 sm:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab('admissions')}
                    className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Plus className="text-blue-600" size={24} />
                    </div>
                    <span className="text-sm font-medium text-blue-700">New Admission</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('discharges')}
                    className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                  >
                    <div className="p-3 bg-purple-100 rounded-full">
                      <LogOut className="text-purple-600" size={24} />
                    </div>
                    <span className="text-sm font-medium text-purple-700">Process Discharge</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('transfers')}
                    className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                  >
                    <div className="p-3 bg-orange-100 rounded-full">
                      <ArrowRightLeft className="text-orange-600" size={24} />
                    </div>
                    <span className="text-sm font-medium text-orange-700">Transfer Patient</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('inpatients')}
                    className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
                  >
                    <div className="p-3 bg-green-100 rounded-full">
                      <Eye className="text-green-600" size={24} />
                    </div>
                    <span className="text-sm font-medium text-green-700">View Inpatients</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Admissions Tab - Use existing AdmissionsPage */}
          {activeTab === 'admissions' && (
            <motion.div
              key="admissions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdmissionsPage embedded />
            </motion.div>
          )}

          {/* In-Patients Tab */}
          {activeTab === 'inpatients' && (
            <motion.div
              key="inpatients"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Search and Filters */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by patient name, hospital number, ward, or bed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter size={20} />
                  Filters
                </button>
              </div>

              {/* Inpatients Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInpatients.map(admission => {
                  const patient = patientMap.get(admission.patientId);
                  const losStatus = getLOSStatus(admission.admissionDate);
                  const los = differenceInDays(new Date(), new Date(admission.admissionDate));
                  
                  return (
                    <div 
                      key={admission.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Header */}
                      <div className={`px-4 py-2 ${getWardTypeColor(admission.wardType)} bg-opacity-10 border-b border-gray-100`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getWardTypeColor(admission.wardType)}`} />
                            <span className="text-sm font-medium text-gray-700">{admission.wardName}</span>
                          </div>
                          <span className="text-sm text-gray-500">Bed {admission.bedNumber}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {patient?.firstName} {patient?.lastName}
                            </h4>
                            <p className="text-sm text-gray-500">{patient?.hospitalNumber}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(admission.severity)}`}>
                            {admission.severity}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {admission.admissionDiagnosis}
                        </p>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar size={14} />
                            <span>Day {los}</span>
                            <span className={`ml-1 ${losStatus.color}`}>({losStatus.label})</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                          <button 
                            onClick={() => {
                              setSelectedAdmissionId(admission.id!);
                              setShowTransferModal(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft size={16} />
                            Transfer
                          </button>
                          <button 
                            onClick={() => setActiveTab('discharges')}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <LogOut size={16} />
                            Discharge
                          </button>
                          <button className="flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="View patient file">
                            <FileText size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredInpatients.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <Users className="mx-auto mb-4 text-gray-300" size={48} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Inpatients Found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'Try adjusting your search criteria' : 'There are no current inpatients'}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Discharges Tab - Use existing DischargePage */}
          {activeTab === 'discharges' && (
            <motion.div
              key="discharges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DischargePage embedded />
            </motion.div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <motion.div
              key="transfers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Transfer Actions Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Patient Transfers</h2>
                  <p className="text-sm text-gray-500">Manage inter-ward and inter-facility patient transfers</p>
                </div>
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  New Transfer
                </button>
              </div>

              {/* Transfer Request Cards */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-center py-12">
                  <ArrowRightLeft className="mx-auto mb-4 text-gray-300" size={48} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Transfers</h3>
                  <p className="text-gray-500 mb-4">
                    Create a new transfer request to move a patient between wards or facilities
                  </p>
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} />
                    Create Transfer Request
                  </button>
                </div>
              </div>

              {/* Transfer Guidelines */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Transfer Guidelines</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-blue-600" />
                    Verify patient identity and confirm transfer destination availability
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-blue-600" />
                    Complete medication reconciliation before transfer
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-blue-600" />
                    Ensure all critical information is handed over to receiving team
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-blue-600" />
                    Document reason for transfer and patient condition at time of transfer
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="mt-0.5 text-blue-600" />
                    Obtain necessary approvals for inter-facility transfers
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">New Transfer Request</h2>
                <p className="text-sm text-gray-500 mt-1">Request patient transfer to another ward or facility</p>
              </div>

              <form className="p-6 space-y-4">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Select patient">
                    <option value="">Select patient...</option>
                    {filteredInpatients.map(admission => {
                      const patient = patientMap.get(admission.patientId);
                      return (
                        <option key={admission.id} value={admission.id}>
                          {patient?.firstName} {patient?.lastName} - {admission.wardName} (Bed {admission.bedNumber})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Transfer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="transferType" value="internal" defaultChecked className="text-blue-600" />
                      <span className="text-sm">Internal (Same Facility)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="transferType" value="external" className="text-blue-600" />
                      <span className="text-sm">External (Another Facility)</span>
                    </label>
                  </div>
                </div>

                {/* Destination Ward */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Ward</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Select destination ward">
                    <option value="">Select destination ward...</option>
                    <option value="icu">Intensive Care Unit (ICU)</option>
                    <option value="hdu">High Dependency Unit (HDU)</option>
                    <option value="surgical">Surgical Ward</option>
                    <option value="general">General Ward</option>
                    <option value="orthopedic">Orthopedic Ward</option>
                    <option value="burns">Burns Unit</option>
                    <option value="pediatric">Pediatric Ward</option>
                    <option value="maternity">Maternity Ward</option>
                  </select>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" title="Select urgency level">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent (Within 4 hours)</option>
                    <option value="emergency">Emergency (Immediate)</option>
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Transfer</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the reason for patient transfer..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Handover Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Key clinical information for receiving team..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ADTPage;
