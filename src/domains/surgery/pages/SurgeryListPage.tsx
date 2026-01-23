import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Scissors,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  MoreVertical,
  Stethoscope,
  FileText,
  XCircle,
  CalendarClock,
  MessageSquare,
  Eye,
  X,
} from 'lucide-react';
import { db } from '../../../database';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { Surgery } from '../../../types';

// Action dropdown component for each surgery row
function SurgeryActionDropdown({ 
  surgery, 
  patientName,
  onCancel,
  onReschedule,
  onSendReminder,
}: { 
  surgery: Surgery; 
  patientName: string;
  onCancel: (surgery: Surgery) => void;
  onReschedule: (surgery: Surgery) => void;
  onSendReminder: (surgery: Surgery, patientName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    switch (action) {
      case 'preop':
        navigate('/surgery/preoperative');
        break;
      case 'postop':
        navigate(`/surgery/post-op-note/create/${surgery.id}`);
        break;
      case 'view-postop':
        navigate(`/surgery/post-op-note/${surgery.id}`);
        break;
      case 'cancel':
        onCancel(surgery);
        break;
      case 'reschedule':
        onReschedule(surgery);
        break;
      case 'reminder':
        onSendReminder(surgery, patientName);
        break;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Surgery actions"
        aria-label="Surgery actions menu"
      >
        <MoreVertical size={18} className="text-gray-500" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          >
            <button
              onClick={() => handleAction('preop')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
            >
              <Stethoscope size={16} className="text-blue-500" />
              Pre-Anaesthetic Review
            </button>
            
            {surgery.status === 'completed' ? (
              <button
                onClick={() => handleAction('view-postop')}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Eye size={16} className="text-green-500" />
                View Post-Op Notes
              </button>
            ) : (
              <button
                onClick={() => handleAction('postop')}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <FileText size={16} className="text-purple-500" />
                Post-Operative Notes
              </button>
            )}
            
            <div className="border-t border-gray-100 my-1" />
            
            <button
              onClick={() => handleAction('reschedule')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              disabled={surgery.status === 'completed' || surgery.status === 'cancelled'}
            >
              <CalendarClock size={16} className="text-amber-500" />
              Reschedule Surgery
            </button>
            
            <button
              onClick={() => handleAction('reminder')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              disabled={surgery.status === 'completed' || surgery.status === 'cancelled'}
            >
              <MessageSquare size={16} className="text-cyan-500" />
              Send Reminder Message
            </button>
            
            <div className="border-t border-gray-100 my-1" />
            
            <button
              onClick={() => handleAction('cancel')}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-red-600"
              disabled={surgery.status === 'completed' || surgery.status === 'cancelled'}
            >
              <XCircle size={16} />
              Cancel Surgery
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SurgeryListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');

  const surgeries = useLiveQuery(
    () => db.surgeries.orderBy('scheduledDate').reverse().toArray(),
    []
  );

  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  const filteredSurgeries = useMemo(() => {
    if (!surgeries) return [];

    return surgeries.filter((surgery) => {
      const patient = patientMap.get(surgery.patientId);
      const matchesSearch = searchQuery === '' ||
        surgery.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || surgery.status === statusFilter;
      const matchesType = typeFilter === 'all' || surgery.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [surgeries, searchQuery, statusFilter, typeFilter, patientMap]);

  const getStatusBadge = (status: Surgery['status']) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge badge-info"><Clock size={12} /> Scheduled</span>;
      case 'in-progress':
        return <span className="badge badge-warning"><AlertTriangle size={12} /> In Progress</span>;
      case 'completed':
        return <span className="badge badge-success"><CheckCircle size={12} /> Completed</span>;
      case 'postponed':
        return <span className="badge badge-secondary">Postponed</span>;
      case 'cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return null;
    }
  };

  // Action handlers
  const handleCancelSurgery = (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleRescheduleSurgery = (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    setNewScheduledDate('');
    setShowRescheduleModal(true);
  };

  const handleSendReminder = (surgery: Surgery, patientName: string) => {
    setSelectedSurgery(surgery);
    setSelectedPatientName(patientName);
    const defaultMessage = `Dear ${patientName},\n\nThis is a reminder for your upcoming surgery:\n\nProcedure: ${surgery.procedureName}\nDate: ${format(new Date(surgery.scheduledDate), 'MMMM d, yyyy')}\nTime: ${format(new Date(surgery.scheduledDate), 'h:mm a')}\n\nPlease remember to:\n- Fast for 6 hours before surgery (no food)\n- Stop clear fluids 2 hours before surgery\n- Bring your medications and medical records\n- Arrive 1 hour before scheduled time\n\nIf you have any questions, please contact us.\n\nBest regards,\nDr Nnadi-Burns Plastic & Reconstructive Surgery`;
    setReminderMessage(defaultMessage);
    setShowReminderModal(true);
  };

  const confirmCancelSurgery = async () => {
    if (!selectedSurgery || !cancelReason.trim()) return;
    
    try {
      const updatedSurgery = {
        ...selectedSurgery,
        status: 'cancelled' as const,
        cancellationReason: cancelReason,
        updatedAt: new Date(),
      };
      
      await db.surgeries.update(selectedSurgery.id, updatedSurgery);
      
      toast.success('Surgery cancelled successfully');
      setShowCancelModal(false);
      setSelectedSurgery(null);
      setCancelReason('');
    } catch (error) {
      console.error('Error cancelling surgery:', error);
      toast.error('Failed to cancel surgery');
    }
  };

  const confirmRescheduleSurgery = async () => {
    if (!selectedSurgery || !newScheduledDate) return;
    
    try {
      const updatedSurgery = {
        ...selectedSurgery,
        scheduledDate: new Date(newScheduledDate),
        status: 'scheduled' as const,
        updatedAt: new Date(),
      };
      
      await db.surgeries.update(selectedSurgery.id, updatedSurgery);
      
      toast.success('Surgery rescheduled successfully');
      setShowRescheduleModal(false);
      setSelectedSurgery(null);
      setNewScheduledDate('');
    } catch (error) {
      console.error('Error rescheduling surgery:', error);
      toast.error('Failed to reschedule surgery');
    }
  };

  const confirmSendReminder = async () => {
    if (!selectedSurgery || !reminderMessage.trim()) return;
    
    try {
      // For now, just show success - in production, this would integrate with SMS/WhatsApp API
      toast.success(`Reminder sent to ${selectedPatientName}`);
      setShowReminderModal(false);
      setSelectedSurgery(null);
      setReminderMessage('');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };

  const stats = useMemo(() => {
    if (!surgeries) return { scheduled: 0, inProgress: 0, completed: 0, today: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      scheduled: surgeries.filter(s => s.status === 'scheduled').length,
      inProgress: surgeries.filter(s => s.status === 'in-progress').length,
      completed: surgeries.filter(s => s.status === 'completed').length,
      today: surgeries.filter(s => {
        const scheduledDate = new Date(s.scheduledDate);
        return scheduledDate >= today && scheduledDate < tomorrow;
      }).length,
    };
  }, [surgeries]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Scissors className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
            Surgery Schedule
          </h1>
          <p className="page-subtitle">
            Manage surgical procedures and operating room schedules
          </p>
        </div>
        <Link to="/patients" className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          Schedule Surgery
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-compact p-3 sm:p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-compact p-3 sm:p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card card-compact p-3 sm:p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-compact p-3 sm:p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card card-compact p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by procedure or patient name..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
              title="Filter by status"
              aria-label="Filter surgeries by status"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="postponed">Postponed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto"
              title="Filter by surgery type"
              aria-label="Filter surgeries by type"
            >
              <option value="all">All Types</option>
              <option value="elective">Elective</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Surgery List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Procedure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ASA Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSurgeries.length > 0 ? (
                filteredSurgeries.map((surgery, index) => {
                  const patient = patientMap.get(surgery.patientId);
                  return (
                    <motion.tr
                      key={surgery.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Scissors className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{surgery.procedureName}</p>
                            <p className="text-sm text-gray-500">{surgery.category} surgery</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {format(new Date(surgery.scheduledDate), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${surgery.type === 'emergency' ? 'badge-danger' : 'badge-info'}`}>
                          {surgery.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(surgery.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          surgery.preOperativeAssessment.asaScore === 1 ? 'bg-emerald-100 text-emerald-700' :
                          surgery.preOperativeAssessment.asaScore === 2 ? 'bg-sky-100 text-sky-700' :
                          surgery.preOperativeAssessment.asaScore === 3 ? 'bg-amber-100 text-amber-700' :
                          surgery.preOperativeAssessment.asaScore === 4 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {surgery.preOperativeAssessment.asaScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <SurgeryActionDropdown
                            surgery={surgery}
                            patientName={patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                            onCancel={handleCancelSurgery}
                            onReschedule={handleRescheduleSurgery}
                            onSendReminder={handleSendReminder}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Scissors className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No surgeries found</p>
                      <p className="text-sm mt-1">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try adjusting your search criteria'
                          : 'Schedule your first surgery to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Surgery Modal */}
      <AnimatePresence>
        {showCancelModal && selectedSurgery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                  <XCircle size={20} />
                  Cancel Surgery
                </h3>
                <button 
                  onClick={() => setShowCancelModal(false)} 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Close"
                  aria-label="Close cancel surgery modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to cancel the surgery <strong>{selectedSurgery.procedureName}</strong>?
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="input w-full h-24"
                    placeholder="Enter reason for cancellation..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="btn btn-outline"
                  >
                    No, Keep Surgery
                  </button>
                  <button
                    onClick={confirmCancelSurgery}
                    className="btn btn-danger"
                    disabled={!cancelReason.trim()}
                  >
                    Yes, Cancel Surgery
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule Surgery Modal */}
      <AnimatePresence>
        {showRescheduleModal && selectedSurgery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowRescheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-amber-600 flex items-center gap-2">
                  <CalendarClock size={20} />
                  Reschedule Surgery
                </h3>
                <button 
                  onClick={() => setShowRescheduleModal(false)} 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Close"
                  aria-label="Close reschedule surgery modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Current Date: <strong>{format(new Date(selectedSurgery.scheduledDate), 'MMM d, yyyy h:mm a')}</strong>
                </p>
                <div className="mb-4">
                  <label htmlFor="newScheduledDate" className="block text-sm font-medium text-gray-700 mb-2">New Date & Time</label>
                  <input
                    id="newScheduledDate"
                    type="datetime-local"
                    value={newScheduledDate}
                    onChange={(e) => setNewScheduledDate(e.target.value)}
                    className="input w-full"
                    title="Select new date and time for surgery"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowRescheduleModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRescheduleSurgery}
                    className="btn btn-primary"
                    disabled={!newScheduledDate}
                  >
                    Reschedule Surgery
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && selectedSurgery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowReminderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-cyan-600 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Send Reminder
                </h3>
                <button 
                  onClick={() => setShowReminderModal(false)} 
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Close"
                  aria-label="Close send reminder modal"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-2">
                  Send reminder to: <strong>{selectedPatientName}</strong>
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Surgery: {selectedSurgery.procedureName} on {format(new Date(selectedSurgery.scheduledDate), 'MMM d, yyyy h:mm a')}
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="input w-full h-32"
                    placeholder="Enter reminder message..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowReminderModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSendReminder}
                    className="btn btn-primary"
                    disabled={!reminderMessage.trim()}
                  >
                    Send Reminder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
