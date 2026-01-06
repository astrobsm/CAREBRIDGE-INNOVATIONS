import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  TestTubes,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Upload,
  ChevronRight,
  FileText,
  Droplet,
  Activity,
  Timer,
  User,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { getStaffDashboardStats, formatCurrency } from '../../../services/activityBillingService';
import type { StaffDashboardStats } from '../../../types';

export default function LabScientistDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('pending');

  // Fetch staff dashboard stats
  useEffect(() => {
    if (user?.id) {
      getStaffDashboardStats(user.id, statsPeriod).then(setStats);
    }
  }, [user?.id, statsPeriod]);

  // All lab investigations
  const allInvestigations = useLiveQuery(async () => {
    return db.investigations.toArray();
  }, []);

  // Pending investigations (requested but not started)
  const pendingInvestigations = useLiveQuery(async () => {
    return db.investigations
      .where('status')
      .equals('requested')
      .toArray();
  }, []);

  // In-progress investigations
  const inProgressInvestigations = useLiveQuery(async () => {
    return db.investigations
      .where('status')
      .equals('in_progress')
      .toArray();
  }, []);

  // Completed today
  const completedToday = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.investigations
      .where('status')
      .equals('completed')
      .filter(inv => inv.completedAt && new Date(inv.completedAt) >= today)
      .toArray();
  }, []);

  // Critical/Urgent results
  const urgentResults = useLiveQuery(async () => {
    return db.investigations
      .filter(inv => inv.urgency === 'urgent' && inv.status !== 'completed')
      .toArray();
  }, []);

  // Blood typing pending
  const bloodTypingPending = useLiveQuery(async () => {
    return db.transfusionMonitoringCharts
      .filter(t => t.status === 'pending' && !t.bloodTypeConfirmed)
      .count();
  }, []);

  // Get investigations based on filter
  const displayedInvestigations = useLiveQuery(async () => {
    if (filter === 'pending') {
      return db.investigations.where('status').equals('requested').toArray();
    } else if (filter === 'in_progress') {
      return db.investigations.where('status').equals('in_progress').toArray();
    } else if (filter === 'completed') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return db.investigations
        .where('status')
        .equals('completed')
        .filter(inv => inv.completedAt && new Date(inv.completedAt) >= today)
        .toArray();
    }
    return db.investigations.toArray();
  }, [filter]);

  const dashboardStats = [
    {
      name: 'Pending Tests',
      value: pendingInvestigations?.length ?? 0,
      icon: <Clock className="w-5 h-5" />,
      color: pendingInvestigations && pendingInvestigations.length > 0 ? 'bg-amber-500' : 'bg-emerald-500',
    },
    {
      name: 'In Progress',
      value: inProgressInvestigations?.length ?? 0,
      icon: <Timer className="w-5 h-5" />,
      color: 'bg-blue-500',
    },
    {
      name: 'Completed Today',
      value: completedToday?.length ?? 0,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-emerald-500',
    },
    {
      name: 'Urgent',
      value: urgentResults?.length ?? 0,
      icon: <AlertCircle className="w-5 h-5" />,
      color: urgentResults && urgentResults.length > 0 ? 'bg-red-500' : 'bg-gray-400',
    },
  ];

  const getPriorityColor = (urgency?: string) => {
    switch (urgency) {
      case 'urgent':
      case 'stat':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'routine':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock size={14} className="text-amber-500" />;
      case 'in_progress':
        return <Timer size={14} className="text-blue-500" />;
      case 'completed':
        return <CheckCircle size={14} className="text-green-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Lab Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Welcome, {user?.firstName} {user?.lastName}
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
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                  {stat.icon}
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-xs text-gray-500">{stat.name}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Earnings Section */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl p-4 sm:p-6 text-white"
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
              <p className="text-teal-100 text-sm">Tests Processed</p>
              <p className="text-2xl font-bold">{stats.totalActivities}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Total Billed</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">Pending Payment</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayment)}</p>
            </div>
            <div>
              <p className="text-teal-100 text-sm">My Earnings (50%)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.earnedAmount)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Investigations List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100"
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TestTubes size={18} className="text-teal-500" />
              Lab Investigations
            </h2>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
              {(['pending', 'in_progress', 'completed', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    filter === f
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'Processing' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {displayedInvestigations && displayedInvestigations.length > 0 ? (
            displayedInvestigations.map((investigation) => (
              <Link
                key={investigation.id}
                to={`/investigations/${investigation.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <TestTubes size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {investigation.testName || 'Lab Test'}
                      </p>
                      {getStatusIcon(investigation.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User size={12} />
                      <span className="truncate">{investigation.patientName || 'Unknown Patient'}</span>
                      <span className={`px-1.5 py-0.5 rounded-full border ${getPriorityColor(investigation.urgency)}`}>
                        {investigation.urgency || 'routine'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Requested {investigation.requestedAt ? formatDistanceToNow(new Date(investigation.requestedAt), { addSuffix: true }) : 'recently'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
              <p className="font-medium">No {filter === 'all' ? '' : filter} investigations</p>
              <p className="text-sm">
                {filter === 'pending' ? 'All caught up!' : 'No tests found for this filter'}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
      >
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/investigations/new-result"
            className="flex flex-col items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Upload size={24} className="text-teal-600 mb-2" />
            <span className="text-sm text-teal-700 text-center">Upload Result</span>
          </Link>
          <Link
            to="/investigations"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <TestTubes size={24} className="text-blue-600 mb-2" />
            <span className="text-sm text-blue-700 text-center">All Tests</span>
          </Link>
          <Link
            to="/blood-transfusion/crossmatch"
            className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Droplet size={24} className="text-red-600 mb-2" />
            <span className="text-sm text-red-700 text-center">Blood Bank</span>
          </Link>
          <Link
            to="/investigations/reports"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <FileText size={24} className="text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 text-center">Reports</span>
          </Link>
        </div>
      </motion.div>

      {/* Urgent Tests Alert */}
      {urgentResults && urgentResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Urgent Tests Pending</h3>
              <p className="text-sm text-red-600">
                You have {urgentResults.length} urgent test(s) that need immediate attention
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
