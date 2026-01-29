import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  CreditCard,
  FileText,
  PiggyBank,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Receipt,
  Wallet,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../services/activityBillingService';
import { REVENUE_SHARE_CONFIG } from '../../../data/billingActivities';

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [selectedHospital, setSelectedHospital] = useState<string>('all');

  // Get date range based on period
  const getDateRange = () => {
    const now = new Date();
    if (selectedPeriod === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { start: today, end: new Date() };
    } else if (selectedPeriod === 'week') {
      return { start: startOfWeek(now), end: endOfWeek(now) };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  };

  // All hospitals
  const hospitals = useLiveQuery(async () => {
    return db.hospitals.toArray();
  }, []);

  // All activity billing records for the period
  const billingRecords = useLiveQuery(async () => {
    const { start, end } = getDateRange();
    let records = await db.activityBillingRecords
      .filter(r => new Date(r.performedAt) >= start && new Date(r.performedAt) <= end)
      .toArray();
    
    if (selectedHospital !== 'all') {
      records = records.filter(r => r.hospitalId === selectedHospital);
    }
    
    return records;
  }, [selectedPeriod, selectedHospital]);

  // Calculate financial summary
  const financialSummary = useLiveQuery(async () => {
    if (!billingRecords) return null;
    
    const totalBilled = billingRecords.reduce((sum, r) => sum + r.fee, 0);
    const totalPaid = billingRecords.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.fee, 0);
    const totalPending = billingRecords.filter(r => r.paymentStatus === 'pending').reduce((sum, r) => sum + r.fee, 0);
    const totalWaived = billingRecords.filter(r => r.paymentStatus === 'waived').reduce((sum, r) => sum + r.fee, 0);
    
    const hospitalShare = totalPaid * REVENUE_SHARE_CONFIG.hospitalPercentage;
    const staffShare = totalPaid * REVENUE_SHARE_CONFIG.staffPercentage;
    
    return {
      totalBilled,
      totalPaid,
      totalPending,
      totalWaived,
      hospitalShare,
      staffShare,
      recordCount: billingRecords.length,
    };
  }, [billingRecords]);

  // Staff earnings summary
  const staffEarnings = useLiveQuery(async () => {
    if (!billingRecords) return [];
    
    const staffMap = new Map<string, { userId: string; name: string; earnings: number; activities: number }>();
    
    for (const record of billingRecords.filter(r => r.paymentStatus === 'paid')) {
      const existing = staffMap.get(record.performedBy);
      if (existing) {
        existing.earnings += record.staffShare;
        existing.activities += 1;
      } else {
        // Get user name
        const user = await db.users.get(record.performedBy);
        staffMap.set(record.performedBy, {
          userId: record.performedBy,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          earnings: record.staffShare,
          activities: 1,
        });
      }
    }
    
    return Array.from(staffMap.values()).sort((a, b) => b.earnings - a.earnings);
  }, [billingRecords]);

  // Payroll periods - used for future implementation
  const payrollPeriods = useLiveQuery(async () => {
    return db.payrollPeriods.orderBy('startDate').reverse().limit(6).toArray();
  }, []);
  // Suppress unused warning
  void payrollPeriods;

  // Pending payroll
  const pendingPayroll = useLiveQuery(async () => {
    return db.staffPayrollRecords
      .where('paymentStatus')
      .equals('pending')
      .toArray();
  }, []);

  // Outstanding patient bills
  const outstandingBills = useLiveQuery(async () => {
    const admissions = await db.admissions
      .filter(a => a.status === 'active' || a.status === 'discharged')
      .toArray();
    
    // Get billing records for these admissions
    const admissionIds = admissions.map(a => a.id);
    const bills = await db.activityBillingRecords
      .filter(r => Boolean(r.admissionId && admissionIds.includes(r.admissionId) && r.paymentStatus === 'pending'))
      .toArray();
    
    // Group by admission
    const billsByAdmission = new Map<string, number>();
    for (const bill of bills) {
      if (bill.admissionId) {
        const current = billsByAdmission.get(bill.admissionId) || 0;
        billsByAdmission.set(bill.admissionId, current + bill.fee);
      }
    }
    
    // Get patient info for names
    const patientIds = [...new Set(admissions.map(a => a.patientId))];
    const patients = await db.patients.where('id').anyOf(patientIds).toArray();
    const patientMap = new Map(patients.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
    
    return admissions
      .map(a => ({
        ...a,
        patientName: patientMap.get(a.patientId) || 'Unknown Patient',
        outstandingAmount: billsByAdmission.get(a.id!) || 0,
      }))
      .filter(a => a.outstandingAmount > 0)
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount);
  }, []);

  const dashboardStats = [
    {
      name: 'Total Billed',
      value: formatCurrency(financialSummary?.totalBilled || 0),
      icon: <Receipt className="w-5 h-5" />,
      color: 'bg-blue-500',
      trend: '+12%',
      trendUp: true,
    },
    {
      name: 'Collected',
      value: formatCurrency(financialSummary?.totalPaid || 0),
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-emerald-500',
      trend: '+8%',
      trendUp: true,
    },
    {
      name: 'Pending',
      value: formatCurrency(financialSummary?.totalPending || 0),
      icon: <Clock className="w-5 h-5" />,
      color: financialSummary && financialSummary.totalPending > 0 ? 'bg-amber-500' : 'bg-gray-400',
      trend: '-5%',
      trendUp: false,
    },
    {
      name: 'Hospital Revenue',
      value: formatCurrency(financialSummary?.hospitalShare || 0),
      icon: <Building2 className="w-5 h-5" />,
      color: 'bg-purple-500',
      trend: '+10%',
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Finance Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Welcome, {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-sky-500"
            title="Filter by hospital"
          >
            <option value="all">All Hospitals</option>
            {hospitals?.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            {format(new Date(), 'MMM d, yyyy')}
          </div>
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
                ? 'bg-white text-sky-600 shadow-sm'
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
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                  {stat.icon}
                </div>
                <div className={`flex items-center gap-1 text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stat.trend}
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

      {/* Revenue Split Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 sm:p-6 text-white"
      >
        <h2 className="text-lg font-semibold mb-4">Revenue Split (50/50)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-emerald-100 text-sm">Total Collected</p>
            <p className="text-2xl font-bold">{formatCurrency(financialSummary?.totalPaid || 0)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Hospital Share (50%)</p>
            <p className="text-2xl font-bold">{formatCurrency(financialSummary?.hospitalShare || 0)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Staff Share (50%)</p>
            <p className="text-2xl font-bold">{formatCurrency(financialSummary?.staffShare || 0)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Activities</p>
            <p className="text-2xl font-bold">{financialSummary?.recordCount || 0}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Staff Earnings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-purple-500" />
              Staff Earnings
            </h2>
            <Link to="/billing/payroll" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {staffEarnings && staffEarnings.length > 0 ? (
              staffEarnings.slice(0, 5).map((staff, index) => (
                <div key={staff.userId} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{staff.name}</p>
                    <p className="text-xs text-gray-500">{staff.activities} activities</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">{formatCurrency(staff.earnings)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <Wallet size={32} className="mx-auto mb-2 text-gray-400" />
                <p>No earnings this period</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Outstanding Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              Outstanding Bills
            </h2>
            <Link to="/billing/outstanding" className="text-sm text-sky-600 hover:text-sky-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {outstandingBills && outstandingBills.length > 0 ? (
              outstandingBills.slice(0, 5).map((bill) => (
                <Link
                  key={bill.id}
                  to={`/billing/patient/${bill.patientId}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{bill.patientName}</p>
                      <p className="text-xs text-gray-500">{bill.wardName} - Bed {bill.bedNumber}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-amber-600">{formatCurrency(bill.outstandingAmount)}</p>
                      <p className="text-xs text-gray-500">Outstanding</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                <p>No outstanding bills</p>
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
            to="/billing/receive-payment"
            className="flex flex-col items-center p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <CreditCard size={24} className="text-emerald-600 mb-2" />
            <span className="text-sm text-emerald-700 text-center">Receive Payment</span>
          </Link>
          <Link
            to="/billing/payroll"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Users size={24} className="text-purple-600 mb-2" />
            <span className="text-sm text-purple-700 text-center">Staff Payroll</span>
          </Link>
          <Link
            to="/billing/invoices"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FileText size={24} className="text-blue-600 mb-2" />
            <span className="text-sm text-blue-700 text-center">Generate Invoice</span>
          </Link>
          <Link
            to="/billing/reports"
            className="flex flex-col items-center p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <PiggyBank size={24} className="text-amber-600 mb-2" />
            <span className="text-sm text-amber-700 text-center">Financial Reports</span>
          </Link>
        </div>
      </motion.div>

      {/* Pending Payroll Alert */}
      {pendingPayroll && pendingPayroll.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <Wallet size={24} className="text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Pending Staff Payments</h3>
              <p className="text-sm text-amber-600">
                {pendingPayroll.length} staff payment(s) pending approval
              </p>
            </div>
            <Link
              to="/billing/payroll/pending"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Review
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
