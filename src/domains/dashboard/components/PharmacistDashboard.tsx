import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Pill,
  Package,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Truck,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { getStaffDashboardStats, formatCurrency } from '../../../services/activityBillingService';
import type { StaffDashboardStats } from '../../../types';

export default function PharmacistDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StaffDashboardStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [filter, setFilter] = useState<'pending' | 'dispensed' | 'all'>('pending');

  // Fetch staff dashboard stats
  useEffect(() => {
    if (user?.id) {
      getStaffDashboardStats(user.id, statsPeriod).then(setStats);
    }
  }, [user?.id, statsPeriod]);

  // Pending prescriptions
  const pendingPrescriptions = useLiveQuery(async () => {
    return db.prescriptions
      .where('status')
      .equals('pending')
      .toArray();
  }, []);

  // Dispensed today
  const dispensedToday = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return db.prescriptions
      .where('status')
      .equals('dispensed')
      .filter(p => Boolean(p.dispensedAt && new Date(p.dispensedAt) >= today))
      .toArray();
  }, []);

  // Low stock alerts - inventory table not yet implemented
  const lowStockItems: Array<{ id: string; name: string; currentStock: number; reorderLevel: number }> = [];

  // Expiring soon - inventory table not yet implemented
  const expiringSoon: Array<{ id: string; name: string; expiryDate: Date }> = [];

  // Controlled substances pending - property not yet on Prescription type
  const controlledSubstancesPending = 0;

  // Get prescriptions based on filter
  const displayedPrescriptions = useLiveQuery(async () => {
    if (filter === 'pending') {
      return db.prescriptions.where('status').equals('pending').toArray();
    } else if (filter === 'dispensed') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return db.prescriptions
        .where('status')
        .equals('dispensed')
        .filter(p => Boolean(p.dispensedAt && new Date(p.dispensedAt) >= today))
        .toArray();
    }
    return db.prescriptions.limit(50).toArray();
  }, [filter]);

  const dashboardStats = [
    {
      name: 'Pending Scripts',
      value: pendingPrescriptions?.length ?? 0,
      icon: <Clock className="w-5 h-5" />,
      color: pendingPrescriptions && pendingPrescriptions.length > 0 ? 'bg-amber-500' : 'bg-emerald-500',
    },
    {
      name: 'Dispensed Today',
      value: dispensedToday?.length ?? 0,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-emerald-500',
    },
    {
      name: 'Low Stock',
      value: lowStockItems?.length ?? 0,
      icon: <Package className="w-5 h-5" />,
      color: lowStockItems && lowStockItems.length > 0 ? 'bg-red-500' : 'bg-gray-400',
    },
    {
      name: 'Expiring Soon',
      value: expiringSoon?.length ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: expiringSoon && expiringSoon.length > 0 ? 'bg-orange-500' : 'bg-gray-400',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Pharmacy Dashboard
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
          className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 sm:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Earnings</h2>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value as 'today' | 'week' | 'month')}
              className="bg-white/20 text-white text-sm rounded-lg px-3 py-1 border-0 focus:ring-2 focus:ring-white/50"
              title="Select earnings period"
            >
              <option value="today" className="text-gray-900">Today</option>
              <option value="week" className="text-gray-900">This Week</option>
              <option value="month" className="text-gray-900">This Month</option>
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-purple-100 text-sm">Scripts Dispensed</p>
              <p className="text-2xl font-bold">{stats.totalActivities}</p>
            </div>
            <div>
              <p className="text-purple-100 text-sm">Total Billed</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</p>
            </div>
            <div>
              <p className="text-purple-100 text-sm">Pending Payment</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayment)}</p>
            </div>
            <div>
              <p className="text-purple-100 text-sm">My Earnings (50%)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.earnedAmount)}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Prescriptions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Pill size={18} className="text-purple-500" />
                Prescriptions
              </h2>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                {(['pending', 'dispensed', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                      filter === f
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {displayedPrescriptions && displayedPrescriptions.length > 0 ? (
              displayedPrescriptions.map((prescription) => (
                <Link
                  key={prescription.id}
                  to={`/pharmacy/prescription/${prescription.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                      <Pill size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          Patient ID: {prescription.patientId?.slice(0, 8) || 'Unknown'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {prescription.medications?.length || 0} medication(s)
                      </p>
                      <p className="text-xs text-gray-400">
                        {prescription.prescribedAt 
                          ? formatDistanceToNow(new Date(prescription.prescribedAt), { addSuffix: true })
                          : 'recently'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      prescription.status === 'pending' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {prescription.status}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
                <p className="font-medium">No {filter === 'all' ? '' : filter} prescriptions</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Inventory Alerts
            </h2>
            <Link to="/pharmacy/inventory" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {(lowStockItems && lowStockItems.length > 0) || (expiringSoon && expiringSoon.length > 0) ? (
              <>
                {lowStockItems?.slice(0, 3).map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Package size={16} className="text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-red-600">
                          Stock: {item.currentStock} / Reorder: {item.reorderLevel}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                        Low Stock
                      </span>
                    </div>
                  </div>
                ))}
                {expiringSoon?.slice(0, 3).map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertTriangle size={16} className="text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-orange-600">
                          Expires: {item.expiryDate ? format(new Date(item.expiryDate), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                        Expiring
                      </span>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                <p>No inventory alerts</p>
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
            to="/pharmacy/dispense"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Pill size={24} className="text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 text-center">Dispense</span>
          </Link>
          <Link
            to="/pharmacy/inventory"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Package size={24} className="text-blue-600 mb-2" />
            <span className="text-sm text-blue-700 text-center">Inventory</span>
          </Link>
          <Link
            to="/pharmacy/orders"
            className="flex flex-col items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Truck size={24} className="text-amber-600 mb-2" />
            <span className="text-sm text-amber-700 text-center">Orders</span>
          </Link>
          <Link
            to="/pharmacy/reports"
            className="flex flex-col items-center p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileText size={24} className="text-emerald-600 mb-2" />
            <span className="text-sm text-emerald-700 text-center">Reports</span>
          </Link>
        </div>
      </motion.div>

      {/* Controlled Substances Alert */}
      {controlledSubstancesPending && controlledSubstancesPending > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Controlled Substances</h3>
              <p className="text-sm text-red-600">
                {controlledSubstancesPending} controlled substance prescription(s) pending verification
              </p>
            </div>
            <Link
              to="/pharmacy/controlled"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Review
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
