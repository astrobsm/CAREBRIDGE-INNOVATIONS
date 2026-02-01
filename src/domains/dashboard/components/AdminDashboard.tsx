import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Users,
  Building2,
  Activity,
  Calendar,
  Shield,
  Settings,
  UserCog,
  AlertCircle,
  CheckCircle,
  FileText,
  Server,
  HardDrive,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../services/activityBillingService';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

  // Get date range based on period
  const getDateRange = () => {
    const now = new Date();
    if (selectedPeriod === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { start: today, end: new Date() };
    } else if (selectedPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: now };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  };

  // Total hospitals
  const hospitals = useLiveQuery(async () => {
    return db.hospitals.toArray();
  }, []);

  // Total users
  const users = useLiveQuery(async () => {
    return db.users.toArray();
  }, []);

  // Active users (logged in last 7 days)
  const activeUsers = useLiveQuery(async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return db.users
      .filter(u => u.updatedAt && new Date(u.updatedAt) >= weekAgo)
      .count();
  }, []);

  // Total patients
  const patients = useLiveQuery(async () => {
    return db.patients.count();
  }, []);

  // Current admissions
  const currentAdmissions = useLiveQuery(async () => {
    return db.admissions
      .where('status')
      .equals('admitted')
      .count();
  }, []);

  // Total revenue for period
  const periodRevenue = useLiveQuery(async () => {
    const { start, end } = getDateRange();
    const records = await db.activityBillingRecords
      .filter(r => 
        new Date(r.performedAt) >= start && 
        new Date(r.performedAt) <= end &&
        r.paymentStatus === 'paid'
      )
      .toArray();
    return records.reduce((sum, r) => sum + r.fee, 0);
  }, [selectedPeriod]);

  // Users by role
  const usersByRole = useLiveQuery(async () => {
    const allUsers = await db.users.toArray();
    const roleMap = new Map<string, number>();
    
    for (const user of allUsers) {
      const count = roleMap.get(user.role) || 0;
      roleMap.set(user.role, count + 1);
    }
    
    return Array.from(roleMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  // Recent system activities (simplified version)
  const recentActivities = useLiveQuery(async () => {
    const { start } = getDateRange();
    
    // Get recent patients
    const recentPatients = await db.patients
      .filter(p => p.createdAt && new Date(p.createdAt) >= start)
      .count();
    
    // Get recent admissions
    const recentAdmissions = await db.admissions
      .filter(a => a.admissionDate && new Date(a.admissionDate) >= start)
      .count();
    
    // Get recent investigations
    const recentInvestigations = await db.investigations
      .filter(i => i.requestedAt && new Date(i.requestedAt) >= start)
      .count();
    
    return {
      newPatients: recentPatients,
      newAdmissions: recentAdmissions,
      newInvestigations: recentInvestigations,
    };
  }, [selectedPeriod]);

  // Sync status
  const syncStatus = useLiveQuery(async () => {
    const pendingSync = await db.activityBillingRecords
      .filter(r => r.paymentStatus === 'pending')
      .count();
    
    return {
      pendingSync,
      lastSync: localStorage.getItem('lastSyncTime'),
    };
  }, []);

  const dashboardStats = [
    {
      name: 'Hospitals',
      value: hospitals?.length ?? 0,
      icon: <Building2 className="w-5 h-5" />,
      color: 'bg-indigo-500',
      link: '/hospitals',
    },
    {
      name: 'Total Users',
      value: users?.length ?? 0,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-sky-500',
      link: '/users',
    },
    {
      name: 'Patients',
      value: patients ?? 0,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-emerald-500',
      link: '/patients',
    },
    {
      name: 'Current Admissions',
      value: currentAdmissions ?? 0,
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-purple-500',
      link: '/admissions',
    },
  ];

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-500',
      hospital_admin: 'bg-purple-500',
      surgeon: 'bg-blue-500',
      doctor: 'bg-sky-500',
      nurse: 'bg-pink-500',
      pharmacist: 'bg-amber-500',
      lab_scientist: 'bg-teal-500',
      accountant: 'bg-emerald-500',
      receptionist: 'bg-orange-500',
      dietician: 'bg-lime-500',
      physiotherapist: 'bg-cyan-500',
      driver: 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-400';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Admin Dashboard
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

      {/* Period Selector */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        {(['today', 'week', 'month'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedPeriod === period
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
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

      {/* Revenue Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white"
      >
        <h2 className="text-lg font-semibold mb-4">System Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-indigo-100 text-sm">Period Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(periodRevenue || 0)}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">Active Users (7d)</p>
            <p className="text-2xl font-bold">{activeUsers ?? 0}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">New Patients</p>
            <p className="text-2xl font-bold">{recentActivities?.newPatients ?? 0}</p>
          </div>
          <div>
            <p className="text-indigo-100 text-sm">New Admissions</p>
            <p className="text-2xl font-bold">{recentActivities?.newAdmissions ?? 0}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Users by Role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <UserCog size={18} className="text-indigo-500" />
              Users by Role
            </h2>
            <Link to="/users" className="text-sm text-sky-600 hover:text-sky-700">
              Manage
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {usersByRole && usersByRole.length > 0 ? (
              usersByRole.map((item) => (
                <div key={item.role} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getRoleColor(item.role)}`} />
                  <span className="flex-1 text-gray-900 capitalize">
                    {item.role.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold text-gray-700">{item.count}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Users size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No users found</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Server size={18} className="text-emerald-500" />
              System Health
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <HardDrive size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Local Database</p>
                  <p className="text-xs text-gray-500">IndexedDB v60</p>
                </div>
              </div>
              <CheckCircle size={20} className="text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Cloud size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Cloud Sync</p>
                  <p className="text-xs text-gray-500">
                    {syncStatus?.pendingSync || 0} pending
                  </p>
                </div>
              </div>
              {(syncStatus?.pendingSync || 0) > 0 ? (
                <RefreshCw size={20} className="text-amber-500" />
              ) : (
                <CheckCircle size={20} className="text-emerald-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Security</p>
                  <p className="text-xs text-gray-500">RBAC Active</p>
                </div>
              </div>
              <CheckCircle size={20} className="text-emerald-500" />
            </div>
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
            to="/users"
            className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Users size={24} className="text-indigo-600 mb-2" />
            <span className="text-sm text-indigo-700 text-center">Add User</span>
          </Link>
          <Link
            to="/hospitals"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Building2 size={24} className="text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 text-center">Add Hospital</span>
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings size={24} className="text-gray-600 mb-2" />
            <span className="text-sm text-gray-700 text-center">Settings</span>
          </Link>
          <Link
            to="/billing"
            className="flex flex-col items-center p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileText size={24} className="text-emerald-600 mb-2" />
            <span className="text-sm text-emerald-700 text-center">Reports</span>
          </Link>
        </div>
      </motion.div>

      {/* Pending Sync Alert */}
      {syncStatus && syncStatus.pendingSync > 10 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Sync Pending</h3>
              <p className="text-sm text-amber-600">
                {syncStatus.pendingSync} records waiting to sync to cloud
              </p>
            </div>
            <button
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              onClick={() => window.location.reload()}
            >
              Sync Now
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
