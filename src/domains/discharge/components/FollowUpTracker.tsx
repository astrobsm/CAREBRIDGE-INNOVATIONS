// Follow-up Tracker Component
// Tracks and manages follow-up appointments for discharged patients

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  X,
  Calendar,
  User,
  Phone,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Bell,
} from 'lucide-react';
import { format, isBefore, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import type { DischargeSummary, FollowUpAppointment, FollowUpTracking } from '../../../types';

interface Props {
  onClose: () => void;
}

type FilterStatus = 'all' | 'scheduled' | 'overdue' | 'completed' | 'missed';
type FilterPeriod = 'all' | 'today' | 'week' | 'month';

export default function FollowUpTracker({ onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('week');
  const [selectedSummary, setSelectedSummary] = useState<DischargeSummary | null>(null);
  void selectedSummary; void setSelectedSummary; // Reserved for detail modal
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch data
  const dischargeSummaries = useLiveQuery(
    () => db.dischargeSummaries.orderBy('dischargeDate').reverse().toArray(),
    []
  );

  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  // Get all follow-up appointments with patient info
  const allFollowUps = useMemo(() => {
    if (!dischargeSummaries) return [];

    const followUps: Array<{
      appointment: FollowUpAppointment;
      summary: DischargeSummary;
      patientName: string;
      patientPhone: string;
      isOverdue: boolean;
      daysUntil: number;
    }> = [];

    const now = new Date();

    dischargeSummaries.forEach(summary => {
      const patient = patientMap.get(summary.patientId);
      
      summary.followUpAppointments.forEach(appt => {
        const appointmentDate = new Date(appt.scheduledDate);
        const isOverdue = appt.status === 'scheduled' && isBefore(appointmentDate, now);
        const daysUntil = differenceInDays(appointmentDate, now);

        followUps.push({
          appointment: appt,
          summary,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
          patientPhone: patient?.phone || 'N/A',
          isOverdue,
          daysUntil,
        });
      });
    });

    // Sort by date (closest first for scheduled, most recent for completed)
    return followUps.sort((a, b) => {
      if (a.appointment.status === 'scheduled' && b.appointment.status === 'scheduled') {
        return new Date(a.appointment.scheduledDate).getTime() - new Date(b.appointment.scheduledDate).getTime();
      }
      return new Date(b.appointment.scheduledDate).getTime() - new Date(a.appointment.scheduledDate).getTime();
    });
  }, [dischargeSummaries, patientMap]);

  // Apply filters
  const filteredFollowUps = useMemo(() => {
    let list = allFollowUps;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.patientName.toLowerCase().includes(query) ||
        f.appointment.type.toLowerCase().includes(query) ||
        f.appointment.department.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === 'scheduled') {
      list = list.filter(f => f.appointment.status === 'scheduled' && !f.isOverdue);
    } else if (statusFilter === 'overdue') {
      list = list.filter(f => f.isOverdue);
    } else if (statusFilter === 'completed') {
      list = list.filter(f => f.appointment.status === 'completed');
    } else if (statusFilter === 'missed') {
      list = list.filter(f => f.appointment.status === 'missed');
    }

    // Period filter
    const now = new Date();
    if (periodFilter === 'today') {
      list = list.filter(f => 
        format(new Date(f.appointment.scheduledDate), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
      );
    } else if (periodFilter === 'week') {
      list = list.filter(f => {
        const apptDate = new Date(f.appointment.scheduledDate);
        return Math.abs(differenceInDays(apptDate, now)) <= 7;
      });
    } else if (periodFilter === 'month') {
      list = list.filter(f => {
        const apptDate = new Date(f.appointment.scheduledDate);
        return Math.abs(differenceInDays(apptDate, now)) <= 30;
      });
    }

    return list;
  }, [allFollowUps, searchQuery, statusFilter, periodFilter]);

  // Statistics
  const stats = useMemo(() => {
    const scheduled = allFollowUps.filter(f => f.appointment.status === 'scheduled' && !f.isOverdue).length;
    const overdue = allFollowUps.filter(f => f.isOverdue).length;
    const todayCount = allFollowUps.filter(f => 
      format(new Date(f.appointment.scheduledDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length;
    const completed = allFollowUps.filter(f => f.appointment.status === 'completed').length;

    return { scheduled, overdue, todayCount, completed };
  }, [allFollowUps]);

  const handleUpdateStatus = async (
    summaryId: string,
    appointmentId: string,
    newStatus: 'completed' | 'missed' | 'rescheduled'
  ) => {
    setUpdatingId(appointmentId);

    try {
      const summary = dischargeSummaries?.find(s => s.id === summaryId);
      if (!summary) return;

      const updatedAppointments = summary.followUpAppointments.map(appt => {
        if (appt.id === appointmentId) {
          return { ...appt, status: newStatus };
        }
        return appt;
      });

      const trackingEntry: FollowUpTracking = {
        appointmentId,
        status: newStatus === 'completed' ? 'attended' : newStatus === 'missed' ? 'missed' : 'rescheduled',
        notes: `Status updated to ${newStatus}`,
        remindersSent: 0,
        updatedAt: new Date(),
      };

      await db.dischargeSummaries.update(summaryId, {
        followUpAppointments: updatedAppointments,
        followUpTracking: [...(summary.followUpTracking || []), trackingEntry],
        updatedAt: new Date(),
      });
      const updatedSummary = await db.dischargeSummaries.get(summaryId);
      if (updatedSummary) syncRecord('dischargeSummaries', updatedSummary as unknown as Record<string, unknown>);

      toast.success(`Appointment marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendReminder = async (patientName: string, phone: string, _appointmentDate: Date) => {
    // In a real app, this would integrate with SMS/notification service
    toast.success(`Reminder sent to ${patientName} at ${phone}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Follow-up Tracker</h2>
              <p className="text-sm text-white/80">Monitor and manage patient follow-up appointments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500">Scheduled</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.scheduled}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-500">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-500">Today</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.todayCount}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-500">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient, appointment type, or department..."
                className="input pl-9 w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="input w-full md:w-40"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as FilterPeriod)}
              className="input w-full md:w-36"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Follow-up List */}
        <div className="overflow-y-auto max-h-[calc(90vh-320px)] p-4">
          {filteredFollowUps.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Follow-ups Found</h3>
              <p className="text-gray-500">
                {statusFilter !== 'all' || periodFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No follow-up appointments have been scheduled yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFollowUps.map((item, index) => (
                <motion.div
                  key={`${item.summary.id}-${item.appointment.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    item.isOverdue ? 'border-l-4 border-l-red-400' :
                    item.appointment.status === 'completed' ? 'border-l-4 border-l-green-400' :
                    item.appointment.status === 'missed' ? 'border-l-4 border-l-gray-400' :
                    'border-l-4 border-l-blue-400'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Patient & Appointment Info */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.patientName}</h4>
                        <p className="text-sm text-gray-500">
                          {item.appointment.type} • {item.appointment.department}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{item.patientPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Date & Status */}
                    <div className="flex flex-col md:items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {format(new Date(item.appointment.scheduledDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.isOverdue ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Overdue by {Math.abs(item.daysUntil)} days
                          </span>
                        ) : item.appointment.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Completed
                          </span>
                        ) : item.appointment.status === 'missed' ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1">
                            Missed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Clock size={12} />
                            {item.daysUntil === 0 ? 'Today' : 
                             item.daysUntil === 1 ? 'Tomorrow' : 
                             `In ${item.daysUntil} days`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {item.appointment.status === 'scheduled' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReminder(
                            item.patientName,
                            item.patientPhone,
                            new Date(item.appointment.scheduledDate)
                          )}
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          title="Send Reminder"
                        >
                          <Bell size={14} />
                          <span className="hidden md:inline">Remind</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(
                            item.summary.id,
                            item.appointment.id,
                            'completed'
                          )}
                          disabled={updatingId === item.appointment.id}
                          className="btn btn-primary btn-sm flex items-center gap-1"
                          title="Mark as Attended"
                        >
                          {updatingId === item.appointment.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          <span className="hidden md:inline">Attended</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(
                            item.summary.id,
                            item.appointment.id,
                            'missed'
                          )}
                          disabled={updatingId === item.appointment.id}
                          className="btn btn-secondary btn-sm text-red-600 hover:bg-red-50"
                          title="Mark as Missed"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {item.appointment.instructions && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Instructions:</span> {item.appointment.instructions}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
