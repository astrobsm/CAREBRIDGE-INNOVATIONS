import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Users,
  Stethoscope,
  Scissors,
  Receipt,
  TrendingUp,
  Calendar,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

// Role-specific dashboards
import DoctorDashboard from '../components/DoctorDashboard';
import NurseDashboard from '../components/NurseDashboard';
import LabScientistDashboard from '../components/LabScientistDashboard';
import AccountantDashboard from '../components/AccountantDashboard';
import PharmacistDashboard from '../components/PharmacistDashboard';
import AdminDashboard from '../components/AdminDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  // Route to role-specific dashboard
  const getRoleDashboard = () => {
    if (!user?.role) return null;
    
    switch (user.role) {
      case 'super_admin':
      case 'hospital_admin':
        return <AdminDashboard />;
      case 'surgeon':
      case 'doctor':
      case 'plastic_surgeon':
      case 'anaesthetist':
        return <DoctorDashboard />;
      case 'nurse':
      case 'home_care_giver':
        return <NurseDashboard />;
      case 'lab_scientist':
        return <LabScientistDashboard />;
      case 'pharmacist':
        return <PharmacistDashboard />;
      case 'accountant':
        return <AccountantDashboard />;
      // Default dashboard for other roles (receptionist, dietician, physiotherapist, driver, etc.)
      default:
        return null;
    }
  };

  // If there's a role-specific dashboard, render it
  const roleDashboard = getRoleDashboard();
  if (roleDashboard) {
    return roleDashboard;
  }

  // Live queries for dashboard statistics
  const patientsCount = useLiveQuery(() => db.patients.count(), []);
  const encountersToday = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.clinicalEncounters
      .where('createdAt')
      .aboveOrEqual(today)
      .count();
  }, []);
  const scheduledSurgeries = useLiveQuery(() =>
    db.surgeries.where('status').equals('scheduled').count()
  , []);
  const pendingInvoices = useLiveQuery(() =>
    db.invoices.where('status').equals('pending').count()
  , []);

  const recentPatients = useLiveQuery(() =>
    db.patients.orderBy('createdAt').reverse().limit(5).toArray()
  , []);

  const upcomingSurgeries = useLiveQuery(() =>
    db.surgeries
      .where('status')
      .equals('scheduled')
      .limit(5)
      .toArray()
  , []);

  const stats = [
    {
      name: 'Total Patients',
      value: patientsCount ?? 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-sky-500',
      change: '+12%',
    },
    {
      name: 'Encounters Today',
      value: encountersToday ?? 0,
      icon: <Stethoscope className="w-6 h-6" />,
      color: 'bg-emerald-500',
      change: '+5%',
    },
    {
      name: 'Scheduled Surgeries',
      value: scheduledSurgeries ?? 0,
      icon: <Scissors className="w-6 h-6" />,
      color: 'bg-purple-500',
      change: '+3%',
    },
    {
      name: 'Pending Invoices',
      value: pendingInvoices ?? 0,
      icon: <Receipt className="w-6 h-6" />,
      color: 'bg-amber-500',
      change: '-8%',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {getGreeting()}, {user?.firstName}!
          </h1>
          <p className="page-subtitle">
            Here's what's happening at CareBridge today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={16} />
          <span className="hidden xs:inline">{format(new Date(), 'EEEE, ')}</span>
          {format(new Date(), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2 sm:p-3 rounded-xl ${stat.color} text-white`}>
                {stat.icon}
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs sm:text-sm font-medium">
                <TrendingUp size={14} />
                {stat.change}
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-label">{stat.name}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Patients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Patients</h2>
            <a href="/patients" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </a>
          </div>
          <div className="divide-y divide-gray-200">
            {recentPatients && recentPatients.length > 0 ? (
              recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {patient.hospitalNumber}
                    </p>
                  </div>
                  <span className="badge badge-primary">
                    {patient.gender}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <p className="empty-state-title">No patients registered yet</p>
                <a href="/patients/new" className="text-sky-600 text-sm hover:underline">
                  Register first patient
                </a>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Surgeries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Upcoming Surgeries</h2>
            <a href="/surgery" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </a>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingSurgeries && upcomingSurgeries.length > 0 ? (
              upcomingSurgeries.map((surgery) => (
                <div
                  key={surgery.id}
                  className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {surgery.procedureName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(surgery.scheduledDate), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <span className={`badge ${
                      surgery.type === 'emergency' ? 'badge-danger' : 'badge-info'
                    }`}>
                      {surgery.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming surgeries</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="card p-6 lg:col-span-2"
        >
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <a
              href="/patients/new"
              className="flex flex-col items-center gap-2 p-4 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors"
            >
              <Users className="w-8 h-8 text-sky-600" />
              <span className="text-sm font-medium text-sky-700">New Patient</span>
            </a>
            <a
              href="/surgery"
              className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <Scissors className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Schedule Surgery</span>
            </a>
            <a
              href="/laboratory"
              className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Activity className="w-8 h-8 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Lab Request</span>
            </a>
            <a
              href="/billing"
              className="flex flex-col items-center gap-2 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <Receipt className="w-8 h-8 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Create Invoice</span>
            </a>
          </div>
        </motion.div>

        {/* System Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          className="card p-6"
        >
          <h2 className="font-semibold text-gray-900 mb-4">System Alerts</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Sync Pending</p>
                <p className="text-xs text-amber-600">3 records awaiting sync</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-sky-50 rounded-lg">
              <Activity className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-sky-800">System Online</p>
                <p className="text-xs text-sky-600">All services running</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
