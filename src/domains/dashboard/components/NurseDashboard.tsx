import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Users,
  Heart,
  Pill,
  Clock,
  Calendar,
  Activity,
  ClipboardCheck,
  HeartPulse,
  Syringe,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Bell,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { getStaffDashboardStats, formatCurrency } from '../../../services/activityBillingService';
import type { StaffDashboardStats } from '../../../types';

export default function NurseDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [currentShift, setCurrentShift] = useState<'morning' | 'afternoon' | 'night'>('morning');

  // Determine current shift based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 14) {
      setCurrentShift('morning');
    } else if (hour >= 14 && hour < 21) {
      setCurrentShift('afternoon');
    } else {
      setCurrentShift('night');
    }
  }, []);

  // Fetch staff dashboard stats
  useEffect(() => {
    if (user?.id) {
      getStaffDashboardStats(user.id, statsPeriod).then(setStats);
    }
  }, [user?.id, statsPeriod]);

  // My assigned patients (nurse assignments)
  const myPatientAssignments = useLiveQuery(async () => {
    if (!user?.id) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.nurseAssignments
      .where('nurseId')
      .equals(user.id)
      .filter(a => a.status === 'active' && new Date(a.assignmentDate) >= today)
      .toArray();
  }, [user?.id]);

  // Get patient details
  const patientDetails = useLiveQuery(async () => {
    const patientIds = myPatientAssignments?.map(a => a.patientId) || [];
    if (patientIds.length === 0) return [];
    return db.patients.where('id').anyOf(patientIds).toArray();
  }, [myPatientAssignments]);

  // Get admissions for assigned patients
  const patientAdmissions = useLiveQuery(async () => {
    const patientIds = myPatientAssignments?.map(a => a.patientId) || [];
    if (patientIds.length === 0) return [];
    return db.admissions
      .filter(a => patientIds.includes(a.patientId) && a.status === 'active')
      .toArray();
  }, [myPatientAssignments]);

  // Today's medication charts for my patients
  const medicationCharts = useLiveQuery(async () => {
    if (!user?.id) return [];
    const today = new Date().toISOString().split('T')[0];
    return db.medicationCharts
      .where('assignedNurseId')
      .equals(user.id)
      .filter(m => {
        const chartDateStr = m.chartDate instanceof Date 
          ? m.chartDate.toISOString().split('T')[0] 
          : String(m.chartDate).split('T')[0];
        return chartDateStr === today;
      })
      .toArray();
  }, [user?.id]);

  // Pending vital signs (not recorded in last 4 hours)
  const pendingVitals = useLiveQuery(async () => {
    const patientIds = myPatientAssignments?.map(a => a.patientId) || [];
    if (patientIds.length === 0) return 0;
    
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    
    let count = 0;
    for (const patientId of patientIds) {
      const lastVitals = await db.vitalSigns
        .where('patientId')
        .equals(patientId)
        .filter(v => new Date(v.recordedAt) >= fourHoursAgo)
        .first();
      if (!lastVitals) count++;
    }
    return count;
  }, [myPatientAssignments]);

  // Pending wound dressings
  const pendingDressings = useLiveQuery(async () => {
    const patientIds = myPatientAssignments?.map(a => a.patientId) || [];
    if (patientIds.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count active wounds that need dressing (wounds with dressing frequency set)
    return db.wounds
      .filter(w => 
        patientIds.includes(w.patientId) && 
        w.healingProgress !== 'improving' &&
        w.dressingFrequency != null
      )
      .count();
  }, [myPatientAssignments]);

  // Blood transfusions in progress
  const activeTransfusions = useLiveQuery(async () => {
    const patientIds = myPatientAssignments?.map(a => a.patientId) || [];
    if (patientIds.length === 0) return [];
    return db.transfusionMonitoringCharts
      .filter(t => patientIds.includes(t.patientId) && t.status === 'in_progress')
      .toArray();
  }, [myPatientAssignments]);

  const dashboardStats = [
    {
      name: 'My Patients',
      value: myPatientAssignments?.length ?? 0,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-sky-500',
      link: '/patients',
    },
    {
      name: 'Vital Signs Due',
      value: pendingVitals ?? 0,
      icon: <Heart className="w-5 h-5" />,
      color: pendingVitals && pendingVitals > 0 ? 'bg-red-500' : 'bg-emerald-500',
      link: '/clinical',
    },
    {
      name: 'Dressings Due',
      value: pendingDressings ?? 0,
      icon: <HeartPulse className="w-5 h-5" />,
      color: pendingDressings && pendingDressings > 0 ? 'bg-amber-500' : 'bg-emerald-500',
      link: '/wounds',
    },
    {
      name: 'Med Charts',
      value: medicationCharts?.length ?? 0,
      icon: <Pill className="w-5 h-5" />,
      color: 'bg-purple-500',
      link: '/medication-chart',
    },
  ];

  const shiftColors = {
    morning: 'bg-amber-100 text-amber-800 border-amber-200',
    afternoon: 'bg-blue-100 text-blue-800 border-blue-200',
    night: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome, Nurse {user?.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-3 py-1 text-sm rounded-full border ${shiftColors[currentShift]}`}>
              {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift
            </span>
            <span className="text-gray-500 text-sm">
              {myPatientAssignments?.length ?? 0} patients assigned
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={16} />
          {format(new Date(), 'EEEE, MMM d, yyyy')}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {dashboardStats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link to={stat.link} className="block">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                    {stat.icon}
                  </div>
                  {stat.value > 0 && stat.name.includes('Due') && (
                    <Bell size={16} className="text-red-500 animate-pulse" />
                  )}
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <p className="text-xs text-gray-500">{stat.name}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Earnings Section */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl p-4 sm:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Earnings</h2>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value as 'today' | 'week' | 'month')}
              className="bg-white/20 text-white text-sm rounded-lg px-3 py-1 border-0 focus:ring-2 focus:ring-white/50"
            >
              <option value="today" className="text-gray-900">Today</option>
              <option value="week" className="text-gray-900">This Week</option>
              <option value="month" className="text-gray-900">This Month</option>
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-pink-100 text-sm">Activities</p>
              <p className="text-2xl font-bold">{stats.totalActivities}</p>
            </div>
            <div>
              <p className="text-pink-100 text-sm">Total Billed</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</p>
            </div>
            <div>
              <p className="text-pink-100 text-sm">Pending</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayment)}</p>
            </div>
            <div>
              <p className="text-pink-100 text-sm">My Earnings (50%)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.earnedAmount)}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* My Patients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-sky-500" />
              My Assigned Patients
            </h2>
            <span className="text-sm text-gray-500">
              {currentShift} shift
            </span>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {myPatientAssignments && myPatientAssignments.length > 0 ? (
              myPatientAssignments.map((assignment) => {
                const patient = patientDetails?.find(p => p.id === assignment.patientId);
                const admission = patientAdmissions?.find(a => a.patientId === assignment.patientId);
                return (
                  <Link
                    key={assignment.id}
                    to={`/patients/${assignment.patientId}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {admission && (
                            <>
                              <span>{admission.wardName} - Bed {admission.bedNumber}</span>
                              <span className={`px-1.5 py-0.5 rounded-full ${
                                assignment.careLevel === 'critical' ? 'bg-red-100 text-red-700' :
                                assignment.careLevel === 'intensive' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {assignment.careLevel}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Users size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No patients assigned</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Active Transfusions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Syringe size={18} className="text-red-500" />
              Active Blood Transfusions
            </h2>
            <Link to="/blood-transfusion" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {activeTransfusions && activeTransfusions.length > 0 ? (
              activeTransfusions.map((transfusion) => (
                <Link
                  key={transfusion.id}
                  to={`/blood-transfusion/${transfusion.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{transfusion.patientName || 'Patient'}</p>
                      <p className="text-sm text-gray-500">
                        {transfusion.productType} - Unit {transfusion.unitNumber}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-red-600 text-sm animate-pulse">
                      <Activity size={14} />
                      In Progress
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                <p>No active transfusions</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
      >
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/clinical/vitals"
            className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Heart size={24} className="text-red-600 mb-2" />
            <span className="text-sm text-red-700 text-center">Record Vitals</span>
          </Link>
          <Link
            to="/medication-chart"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Pill size={24} className="text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 text-center">Med Chart</span>
          </Link>
          <Link
            to="/wounds"
            className="flex flex-col items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <HeartPulse size={24} className="text-amber-600 mb-2" />
            <span className="text-sm text-amber-700 text-center">Wound Dressing</span>
          </Link>
          <Link
            to="/blood-transfusion"
            className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Syringe size={24} className="text-red-600 mb-2" />
            <span className="text-sm text-red-700 text-center">Transfusion</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
