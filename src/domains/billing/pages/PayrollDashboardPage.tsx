import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  Check,
  Clock,
  Search,
  CreditCard,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  formatCurrency, 
  createPayrollPeriod, 
  calculatePayrollForPeriod,
  markPayrollAsPaid 
} from '../../../services/activityBillingService';
import { REVENUE_SHARE_CONFIG } from '../../../data/billingActivities';

export default function PayrollDashboardPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);

  // All payroll periods
  const payrollPeriods = useLiveQuery(async () => {
    return db.payrollPeriods
      .orderBy('startDate')
      .reverse()
      .toArray();
  }, []);

  // Select current month's period by default
  useEffect(() => {
    if (payrollPeriods && payrollPeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(payrollPeriods[0].id!);
    }
  }, [payrollPeriods, selectedPeriod]);

  // Staff payroll records for selected period
  const staffRecords = useLiveQuery(async () => {
    if (!selectedPeriod) return [];
    
    let records = await db.staffPayrollRecords
      .where('payrollPeriodId')
      .equals(selectedPeriod)
      .toArray();
    
    // Apply filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      records = records.filter(r => 
        (r.staffName || '').toLowerCase().includes(query)
      );
    }
    
    if (filterRole !== 'all') {
      records = records.filter(r => r.staffRole === filterRole);
    }
    
    return records.sort((a, b) => b.netEarnings - a.netEarnings);
  }, [selectedPeriod, searchQuery, filterRole]);

  // Summary statistics
  const periodSummary = useLiveQuery(async () => {
    if (!selectedPeriod) return null;
    
    const records = await db.staffPayrollRecords
      .where('payrollPeriodId')
      .equals(selectedPeriod)
      .toArray();
    
    const totalStaff = records.length;
    const totalEarnings = records.reduce((sum, r) => sum + r.netEarnings, 0);
    const totalPaid = records.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.netEarnings, 0);
    const totalPending = records.filter(r => r.paymentStatus === 'pending').reduce((sum, r) => sum + r.netEarnings, 0);
    const totalActivitiesCount = records.reduce((sum, r) => sum + r.totalActivities, 0);
    
    return {
      totalStaff,
      totalEarnings,
      totalPaid,
      totalPending,
      totalActivities: totalActivitiesCount,
    };
  }, [selectedPeriod]);

  // Get current period info
  const currentPeriod = payrollPeriods?.find(p => p.id === selectedPeriod);

  const handleCreateNewPeriod = async () => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const periodName = format(now, 'MMMM yyyy');
      
      const newPeriod = await createPayrollPeriod(
        user?.hospitalId || '',
        periodName,
        startOfMonth(now),
        endOfMonth(now)
      );
      
      // Calculate payroll for this period
      await calculatePayrollForPeriod(newPeriod.id);
      
      setSelectedPeriod(newPeriod.id);
      setShowNewPeriodModal(false);
    } catch (error) {
      console.error('Failed to create payroll period:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async (recordId: string) => {
    if (!confirm('Mark this staff member as paid for this period?')) return;
    
    try {
      await markPayrollAsPaid(recordId, user?.id);
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const handleMarkAllAsPaid = async () => {
    if (!confirm('Mark all pending payments as paid?')) return;
    
    setIsProcessing(true);
    try {
      const pendingRecords = staffRecords?.filter(r => r.paymentStatus === 'pending') || [];
      for (const record of pendingRecords) {
        await markPayrollAsPaid(record.id!, user?.id);
      }
    } catch (error) {
      console.error('Failed to mark all as paid:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      surgeon: 'bg-blue-100 text-blue-700',
      doctor: 'bg-sky-100 text-sky-700',
      plastic_surgeon: 'bg-indigo-100 text-indigo-700',
      nurse: 'bg-pink-100 text-pink-700',
      pharmacist: 'bg-purple-100 text-purple-700',
      lab_scientist: 'bg-teal-100 text-teal-700',
      physiotherapist: 'bg-orange-100 text-orange-700',
      dietician: 'bg-lime-100 text-lime-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const stats = [
    {
      name: 'Total Staff',
      value: periodSummary?.totalStaff ?? 0,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Earnings',
      value: formatCurrency(periodSummary?.totalEarnings ?? 0),
      icon: <DollarSign className="w-5 h-5" />,
      color: 'bg-emerald-500',
    },
    {
      name: 'Paid Out',
      value: formatCurrency(periodSummary?.totalPaid ?? 0),
      icon: <Check className="w-5 h-5" />,
      color: 'bg-green-500',
    },
    {
      name: 'Pending',
      value: formatCurrency(periodSummary?.totalPending ?? 0),
      icon: <Clock className="w-5 h-5" />,
      color: periodSummary?.totalPending && periodSummary.totalPending > 0 ? 'bg-amber-500' : 'bg-gray-400',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Payroll</h1>
          <p className="text-gray-500 text-sm">
            {REVENUE_SHARE_CONFIG.staffPercentage * 100}% Revenue Share Model
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod || ''}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-sky-500"
            title="Select payroll period"
          >
            {payrollPeriods?.map((period) => (
              <option key={period.id} value={period.id}>
                {period.periodName}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewPeriodModal(true)}
            className="btn-primary text-sm"
          >
            New Period
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, index) => (
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
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-xs text-gray-500">{stat.name}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Period Info */}
      {currentPeriod && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{currentPeriod.periodName}</h2>
              <p className="text-indigo-100 text-sm">
                {format(new Date(currentPeriod.startDate), 'MMM d')} - {format(new Date(currentPeriod.endDate), 'MMM d, yyyy')}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              currentPeriod.status === 'closed' 
                ? 'bg-green-500/20 text-green-100' 
                : 'bg-white/20 text-white'
            }`}>
              {currentPeriod.status}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-indigo-100 text-sm">Activities</p>
              <p className="text-2xl font-bold">{periodSummary?.totalActivities ?? 0}</p>
            </div>
            <div>
              <p className="text-indigo-100 text-sm">Staff Revenue (50%)</p>
              <p className="text-2xl font-bold">{formatCurrency(periodSummary?.totalEarnings ?? 0)}</p>
            </div>
            <div>
              <p className="text-indigo-100 text-sm">Hospital Revenue (50%)</p>
              <p className="text-2xl font-bold">{formatCurrency(periodSummary?.totalEarnings ?? 0)}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-sky-500"
            title="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="surgeon">Surgeons</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="lab_scientist">Lab Scientists</option>
            <option value="physiotherapist">Physiotherapists</option>
            <option value="dietician">Dieticians</option>
          </select>
        </div>
        {periodSummary && periodSummary.totalPending > 0 && (
          <button
            onClick={handleMarkAllAsPaid}
            disabled={isProcessing}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <CreditCard size={16} />
            Pay All Pending
          </button>
        )}
      </div>

      {/* Staff Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Billed</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings (50%)</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffRecords && staffRecords.length > 0 ? (
                staffRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {(record.staffName || '??').split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium text-gray-900">{record.staffName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(record.staffRole)}`}>
                        {record.staffRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {record.totalActivities}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(record.totalBilled)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(record.netEarnings)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                        record.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {record.paymentStatus === 'paid' ? <Check size={12} /> : <Clock size={12} />}
                        {record.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.paymentStatus === 'pending' ? (
                        <button
                          onClick={() => handleMarkAsPaid(record.id!)}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          {record.paidAt ? format(new Date(record.paidAt), 'MMM d') : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No payroll records found</p>
                    <p className="text-sm">
                      {selectedPeriod ? 'No staff activities for this period' : 'Select a payroll period'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Period Modal */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Payroll Period</h2>
            <p className="text-gray-600 mb-6">
              This will create a payroll period for <strong>{format(new Date(), 'MMMM yyyy')}</strong> and calculate earnings for all staff based on their recorded activities.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNewPeriodModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewPeriod}
                disabled={isProcessing}
                className="btn-primary flex items-center gap-2"
              >
                {isProcessing ? 'Processing...' : 'Create & Calculate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
