import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Users,
  Clock,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Plus,
  Trash2,
  LogIn,
  LogOut,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, isToday, isYesterday } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { AuditLog, User as UserType } from '../../../types';

// Activity type icons and colors
const activityConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  login: { icon: <LogIn size={16} />, color: 'text-green-600', bgColor: 'bg-green-100' },
  logout: { icon: <LogOut size={16} />, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  create: { icon: <Plus size={16} />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  update: { icon: <Edit size={16} />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  delete: { icon: <Trash2 size={16} />, color: 'text-red-600', bgColor: 'bg-red-100' },
  view: { icon: <Eye size={16} />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  download: { icon: <FileText size={16} />, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  default: { icon: <Activity size={16} />, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

// Entity type labels
const entityLabels: Record<string, string> = {
  patients: 'Patient',
  surgeries: 'Surgery',
  prescriptions: 'Prescription',
  encounters: 'Encounter',
  admissions: 'Admission',
  vitals: 'Vital Signs',
  wounds: 'Wound',
  burns: 'Burn Assessment',
  labRequests: 'Lab Request',
  invoices: 'Invoice',
  users: 'User',
  hospitals: 'Hospital',
  wardRounds: 'Ward Round',
  appointments: 'Appointment',
  medications: 'Medication',
  auth: 'Authentication',
};

export default function UserActivityAnalyticsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('today');
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Only super_admin can access this page
  if (user?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  // Auto-refresh every 10 seconds when live mode is enabled
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Fetch all users for the filter dropdown
  const users = useLiveQuery(() => db.users.toArray(), [lastRefresh]);

  // Create a user map for quick lookup
  const usersMap = useMemo(() => {
    const map = new Map<string, UserType>();
    if (users) {
      users.forEach(u => map.set(u.id!, u));
    }
    return map;
  }, [users]);

  // Fetch audit logs with filters
  const auditLogs = useLiveQuery(async () => {
    let query = db.auditLogs.orderBy('timestamp').reverse();
    
    // Get date range filter
    let startDate: Date | null = null;
    const now = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = subDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
        break;
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
    }
    
    let logs = await query.toArray();
    
    // Apply date filter
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate!);
    }
    
    // Apply user filter
    if (selectedUser !== 'all') {
      logs = logs.filter(log => log.userId === selectedUser);
    }
    
    // Apply action filter
    if (selectedAction !== 'all') {
      logs = logs.filter(log => log.action === selectedAction);
    }
    
    // Apply entity filter
    if (selectedEntity !== 'all') {
      logs = logs.filter(log => log.entityType === selectedEntity);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(log => {
        const userName = usersMap.get(log.userId);
        const userFullName = userName ? `${userName.firstName} ${userName.lastName}`.toLowerCase() : '';
        return (
          log.action.toLowerCase().includes(query) ||
          log.entityType.toLowerCase().includes(query) ||
          log.entityId.toLowerCase().includes(query) ||
          userFullName.includes(query)
        );
      });
    }
    
    return logs;
  }, [dateRange, selectedUser, selectedAction, selectedEntity, searchQuery, lastRefresh, usersMap]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!auditLogs) return { total: 0, creates: 0, updates: 0, logins: 0, activeUsers: 0 };
    
    const uniqueUsers = new Set(auditLogs.map(log => log.userId));
    
    return {
      total: auditLogs.length,
      creates: auditLogs.filter(log => log.action === 'create').length,
      updates: auditLogs.filter(log => log.action === 'update').length,
      logins: auditLogs.filter(log => log.action === 'login').length,
      activeUsers: uniqueUsers.size,
    };
  }, [auditLogs]);

  // Get unique actions and entities for filters
  const uniqueActions = useMemo(() => {
    if (!auditLogs) return [];
    return [...new Set(auditLogs.map(log => log.action))].sort();
  }, [auditLogs]);

  const uniqueEntities = useMemo(() => {
    if (!auditLogs) return [];
    return [...new Set(auditLogs.map(log => log.entityType))].sort();
  }, [auditLogs]);

  // Group logs by time
  const groupedLogs = useMemo(() => {
    if (!auditLogs) return [];
    
    const groups: { label: string; logs: AuditLog[] }[] = [];
    let currentGroup: { label: string; logs: AuditLog[] } | null = null;
    
    auditLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      let label: string;
      
      if (isToday(logDate)) {
        const hour = logDate.getHours();
        if (hour < 12) label = 'This Morning';
        else if (hour < 17) label = 'This Afternoon';
        else label = 'This Evening';
      } else if (isYesterday(logDate)) {
        label = 'Yesterday';
      } else {
        label = format(logDate, 'EEEE, MMM d');
      }
      
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, logs: [] };
        groups.push(currentGroup);
      }
      currentGroup.logs.push(log);
    });
    
    return groups;
  }, [auditLogs]);

  const formatActivityMessage = (log: AuditLog) => {
    const userName = usersMap.get(log.userId);
    const userDisplay = userName ? `${userName.firstName} ${userName.lastName}` : 'Unknown User';
    const entity = entityLabels[log.entityType] || log.entityType;
    
    switch (log.action) {
      case 'login':
        return `${userDisplay} logged in`;
      case 'logout':
        return `${userDisplay} logged out`;
      case 'create':
        return `${userDisplay} created a new ${entity}`;
      case 'update':
        return `${userDisplay} updated ${entity}`;
      case 'delete':
        return `${userDisplay} deleted ${entity}`;
      case 'view':
        return `${userDisplay} viewed ${entity}`;
      case 'download':
        return `${userDisplay} downloaded ${entity} document`;
      default:
        return `${userDisplay} performed ${log.action} on ${entity}`;
    }
  };

  const getActivityConfig = (action: string) => {
    return activityConfig[action] || activityConfig.default;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
            User Activity Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Real-time monitoring of all user activities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLive 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => setLastRefresh(new Date())}
            className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Activities</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.creates}</p>
              <p className="text-xs text-gray-500">Records Created</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Edit size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.updates}</p>
              <p className="text-xs text-gray-500">Updates Made</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <LogIn size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.logins}</p>
              <p className="text-xs text-gray-500">Logins</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              <p className="text-xs text-gray-500">Active Users</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            title="Select date range"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* User Filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            title="Filter by user"
          >
            <option value="all">All Users</option>
            {users?.map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            title="Filter by action"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            title="Filter by entity"
          >
            <option value="all">All Entities</option>
            {uniqueEntities.map(entity => (
              <option key={entity} value={entity}>
                {entityLabels[entity] || entity}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Activity Feed</h2>
          <span className="text-sm text-gray-500">
            Last updated: {format(lastRefresh, 'h:mm:ss a')}
          </span>
        </div>

        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {groupedLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Activity size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No activities found</p>
              <p className="text-sm text-gray-400 mt-1">
                Activities will appear here as users interact with the system
              </p>
            </div>
          ) : (
            groupedLogs.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Time Group Header */}
                <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">{group.label}</span>
                </div>

                {/* Activities in this group */}
                <AnimatePresence>
                  {group.logs.map((log, logIdx) => {
                    const config = getActivityConfig(log.action);
                    const userName = usersMap.get(log.userId);
                    
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: logIdx * 0.02 }}
                        className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* Activity Icon */}
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <span className={config.color}>{config.icon}</span>
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {formatActivityMessage(log)}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              {format(new Date(log.timestamp), 'h:mm:ss a')}
                            </span>
                            {log.entityId && log.entityId !== 'N/A' && (
                              <span className="text-xs text-gray-400">
                                ID: {log.entityId.slice(0, 8)}...
                              </span>
                            )}
                            {userName && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                {userName.role.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Relative Time */}
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full shadow-lg"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">Live Updates Active</span>
          </motion.div>
        </div>
      )}
    </div>
  );
}
