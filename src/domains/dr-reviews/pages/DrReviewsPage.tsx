// Dr. Nnadi's Reviews & Analytics Dashboard
// Password-protected access for patient review management and billing analytics
// Access Password: blackvelvet

import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Star,
  Download,
  Plus,
  Search,
  BarChart3,
  PieChart,
  Activity,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

const DR_REVIEWS_PASSWORD = 'blackvelvet';
const SESSION_KEY = 'dr_reviews_auth';

export default function DrReviewsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // IMPORTANT: All hooks must be called before any conditional returns
  // Fetch clinical encounters for reviews
  const encounters = useLiveQuery(() => 
    db.clinicalEncounters.orderBy('createdAt').reverse().toArray(),
    []
  );

  // Fetch invoices for billing analytics
  const invoices = useLiveQuery(() => 
    db.invoices.orderBy('createdAt').reverse().toArray(),
    []
  );

  // Check session storage for existing authentication
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem(SESSION_KEY);
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === DR_REVIEWS_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(SESSION_KEY, 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  // Password authentication screen
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Dr. Nnadi's Reviews</h2>
            <p className="text-gray-600">Enter password to access analytics dashboard</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Access Password
              </label>
              <input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900"
                placeholder="Enter password"
                autoFocus
              />
              {passwordError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-sm text-red-600 font-medium"
                >
                  {passwordError}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Access Dashboard
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Logged in as: <span className="font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown'}</span>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!encounters || !invoices) return null;

    const totalReviews = encounters.length;
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.totalAmount || inv.total || 0), 0);
    
    const pendingReviews = encounters.filter(e => !e.completedAt).length;
    const completedReviews = encounters.filter(e => e.completedAt).length;

    return {
      totalReviews,
      completedReviews,
      pendingReviews,
      totalRevenue,
      avgRevenuePerReview: totalReviews > 0 ? Math.round(totalRevenue / totalReviews) : 0
    };
  }, [encounters, invoices]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            Dr. Nnadi's Reviews Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Patient review management and billing analytics
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary">
            <Download className="w-4 h-4" />
            Export Reports
          </button>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4" />
            New Review
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Reviews</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {analytics.totalReviews}
                </p>
              </div>
              <FileText className="w-12 h-12 text-purple-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {analytics.completedReviews}
                </p>
              </div>
              <Star className="w-12 h-12 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">
                  {analytics.pendingReviews}
                </p>
              </div>
              <Activity className="w-12 h-12 text-orange-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  ₦{analytics.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Search Reviews</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, diagnosis..."
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input"
              title="Select date range"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <div>
            <label className="label">Status Filter</label>
            <select className="input" title="Filter by review status">
              <option value="all">All Reviews</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Revenue Trend
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-2" />
              <p>Revenue chart will be displayed here</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              Review Distribution
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <PieChart className="w-16 h-16 mx-auto mb-2" />
              <p>Distribution chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reviews Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Reviews</h3>
          <button className="btn btn-secondary btn-sm">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnosis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {encounters && encounters.length > 0 ? (
                encounters.slice(0, 10).map((encounter) => (
                  <tr key={encounter.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {format(new Date(encounter.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {encounter.patientId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {encounter.chiefComplaint || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      ₦0
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${encounter.completedAt ? 'badge-success' : 'badge-warning'}`}>
                        {encounter.completedAt ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>No reviews found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
