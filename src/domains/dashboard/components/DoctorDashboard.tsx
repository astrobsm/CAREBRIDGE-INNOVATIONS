import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Users,
  Stethoscope,
  Scissors,
  TrendingUp,
  Calendar,
  Activity,
  ClipboardList,
  Clock,
  DollarSign,
  UserPlus,
  FileText,
  AlertCircle,
  ChevronRight,
  Bandage,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { getStaffDashboardStats, formatCurrency } from '../../../services/activityBillingService';
import type { StaffDashboardStats } from '../../../types';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('month');

  // Fetch staff dashboard stats
  useEffect(() => {
    if (user?.id) {
      getStaffDashboardStats(user.id, statsPeriod).then(setStats);
    }
  }, [user?.id, statsPeriod]);

  // My assigned patients
  const myAssignments = useLiveQuery(async () => {
    if (!user?.id) return [];
    return db.staffPatientAssignments
      .where('staffId')
      .equals(user.id)
      .filter(a => a.isActive)
      .toArray();
  }, [user?.id]);

  // My admitted patients (as primary doctor)
  const myAdmittedPatients = useLiveQuery(async () => {
    if (!user?.id) return [];
    return db.admissions
      .where('primaryDoctor')
      .equals(user.id)
      .filter(a => a.status === 'admitted')
      .toArray();
  }, [user?.id]);

  // Today's encounters
  const todaysEncounters = useLiveQuery(async () => {
    if (!user?.id) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.clinicalEncounters
      .where('attendingClinician')
      .equals(user.id)
      .filter(e => new Date(e.createdAt) >= today)
      .toArray();
  }, [user?.id]);

  // Scheduled surgeries
  const mySurgeries = useLiveQuery(async () => {
    if (!user?.id) return [];
    return db.surgeries
      .where('surgeon')
      .equals(user.id)
      .filter(s => s.status === 'scheduled')
      .limit(5)
      .toArray();
  }, [user?.id]);

  // Pending lab results for my patients
  const pendingLabResults = useLiveQuery(async () => {
    if (!user?.id) return 0;
    const myPatientIds = myAdmittedPatients?.map(a => a.patientId) || [];
    if (myPatientIds.length === 0) return 0;
    return db.labRequests
      .filter(l => myPatientIds.includes(l.patientId) && l.status === 'pending')
      .count();
  }, [myAdmittedPatients]);

  // Get patient details for assignments
  const patientDetails = useLiveQuery(async () => {
    const patientIds = myAdmittedPatients?.map(a => a.patientId) || [];
    if (patientIds.length === 0) return [];
    return db.patients.where('id').anyOf(patientIds).toArray();
  }, [myAdmittedPatients]);

  const dashboardStats = [
    {
      name: 'My Patients',
      value: myAdmittedPatients?.length ?? 0,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-sky-500',
      link: '/patients',
    },
    {
      name: "Today's Encounters",
      value: todaysEncounters?.length ?? 0,
      icon: <Stethoscope className="w-5 h-5" />,
      color: 'bg-emerald-500',
      link: '/clinical',
    },
    {
      name: 'Scheduled Surgeries',
      value: mySurgeries?.length ?? 0,
      icon: <Scissors className="w-5 h-5" />,
      color: 'bg-purple-500',
      link: '/surgery',
    },
    {
      name: 'Pending Lab Results',
      value: pendingLabResults ?? 0,
      icon: <ClipboardList className="w-5 h-5" />,
      color: 'bg-amber-500',
      link: '/investigations',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome, Dr. {user?.lastName}
          </h1>
          <p className="page-subtitle">
            {user?.specialization || 'Surgeon'} Dashboard
          </p>
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
                  <ChevronRight size={16} className="text-gray-400" />
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
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 sm:p-6 text-white"
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
              <p className="text-emerald-100 text-sm">Activities</p>
              <p className="text-2xl font-bold">{stats.totalActivities}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-sm">Total Billed</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-sm">Pending</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayment)}</p>
            </div>
            <div>
              <p className="text-emerald-100 text-sm">My Earnings (50%)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.earnedAmount)}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* My Admitted Patients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-sky-500" />
              My Admitted Patients
            </h2>
            <Link to="/admissions" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {myAdmittedPatients && myAdmittedPatients.length > 0 ? (
              myAdmittedPatients.slice(0, 5).map((admission) => {
                const patient = patientDetails?.find(p => p.id === admission.patientId);
                return (
                  <Link
                    key={admission.id}
                    to={`/patients/${admission.patientId}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                        {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : '??'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{admission.wardName} - Bed {admission.bedNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded-full ${
                            admission.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            admission.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {admission.severity}
                          </span>
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
                <p>No admitted patients</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Surgeries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Scissors size={18} className="text-purple-500" />
              Scheduled Surgeries
            </h2>
            <Link to="/surgery" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {mySurgeries && mySurgeries.length > 0 ? (
              mySurgeries.map((surgery) => (
                <Link
                  key={surgery.id}
                  to={`/surgery/${surgery.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{surgery.procedureName}</p>
                      <p className="text-sm text-gray-500">
                        {surgery.scheduledDate ? format(new Date(surgery.scheduledDate), 'MMM d, yyyy HH:mm') : 'TBD'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      surgery.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {surgery.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Scissors size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No scheduled surgeries</p>
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
            to="/clinical/new"
            className="flex flex-col items-center p-4 bg-sky-50 rounded-lg hover:bg-sky-100 transition-colors"
          >
            <FileText size={24} className="text-sky-600 mb-2" />
            <span className="text-sm text-sky-700 text-center">New Encounter</span>
          </Link>
          <Link
            to="/ward-rounds"
            className="flex flex-col items-center p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Activity size={24} className="text-emerald-600 mb-2" />
            <span className="text-sm text-emerald-700 text-center">Ward Round</span>
          </Link>
          <Link
            to="/wounds"
            className="flex flex-col items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <HeartPulse size={24} className="text-amber-600 mb-2" />
            <span className="text-sm text-amber-700 text-center">Wound Care</span>
          </Link>
          <Link
            to="/investigations/request"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ClipboardList size={24} className="text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 text-center">Request Lab</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
