// Appointments Diary Page
// Main appointment management page with calendar view, list view, and filtering

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfWeek, endOfWeek, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Calendar,
  List,
  Plus,
  Search,
  Filter,
  Building2,
  Clock,
  MapPin,
  Home,
  Video,
  Phone,
  MessageCircle,
  ChevronDown,
  UserX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import AppointmentBookingForm from '../components/AppointmentBookingForm';
import AppointmentCalendar from '../components/AppointmentCalendar';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import {
  checkInPatient,
  completeAppointment,
  markNoShow,
  generateWhatsAppUrl,
  generateWhatsAppMessage,
} from '../../../services/appointmentService';
import type { Appointment, AppointmentStatus, AppointmentType } from '../../../types';

type ViewMode = 'calendar' | 'list';
type FilterStatus = 'all' | AppointmentStatus;
type FilterType = 'all' | AppointmentType;

const statusColors: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-emerald-100 text-emerald-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rescheduled: 'bg-orange-100 text-orange-700',
};

const typeIcons: Record<AppointmentType, string> = {
  follow_up: '🔄',
  fresh_consultation: '🆕',
  review: '📋',
  procedure: '🩺',
  dressing_change: '🩹',
  suture_removal: '✂️',
  home_visit: '🏠',
  telemedicine: '💻',
  pre_operative: '📝',
  post_operative: '✅',
  emergency: '🚨',
  other: '📌',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterHospital, setFilterHospital] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Fetch all hospitals
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive === true).toArray(), []);

  // Fetch appointments
  const appointments = useLiveQuery(async () => {
    let query = db.appointments.orderBy('appointmentDate');
    return query.toArray();
  }, []);

  // Fetch patients for names
  const patientMap = useLiveQuery(async () => {
    const patients = await db.patients.toArray();
    const map: Record<string, { name: string; hospitalNumber: string; phone: string }> = {};
    patients.forEach(p => {
      map[p.id] = {
        name: `${p.firstName} ${p.lastName}`,
        hospitalNumber: p.hospitalNumber,
        phone: p.phone,
      };
    });
    return map;
  }, []);

  // Filter and search appointments
  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    let filtered = [...appointments];

    // Date range filter
    const now = new Date();
    switch (dateRange) {
      case 'today':
        filtered = filtered.filter(a => isToday(new Date(a.appointmentDate)));
        break;
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        filtered = filtered.filter(a => {
          const date = new Date(a.appointmentDate);
          return date >= weekStart && date <= weekEnd;
        });
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filtered = filtered.filter(a => {
          const date = new Date(a.appointmentDate);
          return date >= monthStart && date <= monthEnd;
        });
        break;
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // Hospital filter
    if (filterHospital !== 'all') {
      filtered = filtered.filter(a => a.hospitalId === filterHospital);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        const patient = patientMap?.[a.patientId];
        return (
          (a.appointmentNumber || '').toLowerCase().includes(query) ||
          (patient?.name || '').toLowerCase().includes(query) ||
          (patient?.hospitalNumber || '').toLowerCase().includes(query) ||
          (a.reasonForVisit || '').toLowerCase().includes(query)
        );
      });
    }

    // Sort by date and time
    return filtered.sort((a, b) => {
      const dateCompare = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.appointmentTime.localeCompare(b.appointmentTime);
    });
  }, [appointments, dateRange, filterStatus, filterType, filterHospital, searchQuery, patientMap]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!appointments) return { today: 0, pending: 0, homeVisits: 0, noShows: 0 };

    const today = appointments.filter(a => isToday(new Date(a.appointmentDate)) && a.status !== 'cancelled');
    const pending = appointments.filter(a => 
      ['scheduled', 'confirmed'].includes(a.status) && 
      !isPast(new Date(a.appointmentDate))
    );
    const homeVisits = appointments.filter(a => 
      a.type === 'home_visit' && 
      ['scheduled', 'confirmed', 'checked_in'].includes(a.status)
    );
    const noShows = appointments.filter(a => a.status === 'no_show');

    return {
      today: today.length,
      pending: pending.length,
      homeVisits: homeVisits.length,
      noShows: noShows.length,
    };
  }, [appointments]);

  const handleQuickAction = async (action: string, appointment: Appointment) => {
    if (!user) return;

    switch (action) {
      case 'view':
        setSelectedAppointment(appointment);
        break;
      case 'check_in':
        try {
          await checkInPatient(appointment.id, user.id);
          toast.success('Patient checked in');
        } catch (error) {
          toast.error('Failed to check in');
        }
        break;
      case 'complete':
        try {
          await completeAppointment(appointment.id, user.id);
          toast.success('Appointment completed');
        } catch (error) {
          toast.error('Failed to complete');
        }
        break;
      case 'no_show':
        try {
          await markNoShow(appointment.id, user.id);
          toast.success('Marked as no-show');
        } catch (error) {
          toast.error('Failed to mark no-show');
        }
        break;
      case 'whatsapp':
        const patient = patientMap?.[appointment.patientId];
        if (patient) {
          const message = generateWhatsAppMessage({
            patientName: patient.name,
            appointmentDate: format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy'),
            appointmentTime: appointment.appointmentTime,
            hospitalName: hospitals?.find(h => h.id === appointment.hospitalId)?.name || 'Hospital',
            clinicianName: appointment.clinicianName || 'Doctor',
            reasonForVisit: appointment.reasonForVisit,
            location: appointment.location,
            appointmentNumber: appointment.appointmentNumber,
          }, 24);
          const url = generateWhatsAppUrl(appointment.patientWhatsApp, message);
          window.open(url, '_blank');
        }
        break;
      case 'cancel':
        setSelectedAppointment(appointment);
        break;
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'hospital': return <Building2 className="w-4 h-4" />;
      case 'home': return <Home className="w-4 h-4 text-orange-600" />;
      case 'telemedicine': return <Video className="w-4 h-4 text-blue-600" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
            Appointment Diary
          </h1>
          <p className="page-subtitle">
            Manage appointments across all hospitals
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowBookingForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          New Appointment
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-compact p-3 sm:p-4 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.today}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-compact p-3 sm:p-4 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card card-compact p-3 sm:p-4 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Home Visits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.homeVisits}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-compact p-3 sm:p-4 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">No Shows</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.noShows}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="card card-compact shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name, hospital number, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
            {(['today', 'week', 'month', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors capitalize ${
                  dateRange === range
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-medium transition-colors ${
              showFilters || filterStatus !== 'all' || filterType !== 'all' || filterHospital !== 'all'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="form-grid pt-4 mt-4 border-t">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Types</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="fresh_consultation">Fresh Consultation</option>
                    <option value="review">Review</option>
                    <option value="home_visit">Home Visit</option>
                    <option value="telemedicine">Telemedicine</option>
                    <option value="procedure">Procedure</option>
                    <option value="dressing_change">Dressing Change</option>
                    <option value="suture_removal">Suture Removal</option>
                  </select>
                </div>

                {/* Hospital Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                  <select
                    value={filterHospital}
                    onChange={(e) => setFilterHospital(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Hospitals</option>
                    {hospitals?.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(filterStatus !== 'all' || filterType !== 'all' || filterHospital !== 'all') && (
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterType('all');
                    setFilterHospital('all');
                  }}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
        {viewMode === 'calendar' ? (
          <AppointmentCalendar
            hospitalId={filterHospital !== 'all' ? filterHospital : undefined}
            onAppointmentClick={setSelectedAppointment}
            onQuickAction={handleQuickAction}
          />
        ) : (
          <div className="divide-y">
            {/* List Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-600">
              <div className="col-span-3">Patient</div>
              <div className="col-span-2">Date & Time</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* List Items */}
            {filteredAppointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments found</p>
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="mt-3 text-emerald-600 font-medium hover:text-emerald-700"
                >
                  Book a new appointment
                </button>
              </div>
            ) : (
              filteredAppointments.map(appointment => {
                const patient = patientMap?.[appointment.patientId];
                const hospital = hospitals?.find(h => h.id === appointment.hospitalId);
                const aptDate = new Date(appointment.appointmentDate);
                const isUpcoming = !isPast(aptDate) || isToday(aptDate);

                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer items-center ${
                      !isUpcoming && appointment.status === 'scheduled' ? 'bg-red-50' : ''
                    }`}
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    {/* Patient */}
                    <div className="col-span-3">
                      <p className="font-medium text-gray-900">
                        {patient?.name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {patient?.hospitalNumber}
                      </p>
                    </div>

                    {/* Date & Time */}
                    <div className="col-span-2">
                      <p className="font-medium">
                        {isToday(aptDate) ? (
                          <span className="text-emerald-600">Today</span>
                        ) : isTomorrow(aptDate) ? (
                          <span className="text-blue-600">Tomorrow</span>
                        ) : (
                          format(aptDate, 'MMM d, yyyy')
                        )}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {appointment.appointmentTime}
                      </p>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{typeIcons[appointment.type]}</span>
                        <span className="text-sm">{appointment.type.replace('_', ' ')}</span>
                      </span>
                      {appointment.priority !== 'routine' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          appointment.priority === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {appointment.priority}
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-sm">
                        {getLocationIcon(appointment.location.type)}
                        <span className="truncate">
                          {appointment.location.type === 'hospital' 
                            ? hospital?.name || 'Hospital'
                            : appointment.location.type === 'home'
                            ? 'Home Visit'
                            : 'Telemedicine'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[appointment.status]}`}>
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const patient = patientMap?.[appointment.patientId];
                          if (patient) {
                            const message = generateWhatsAppMessage({
                              patientName: patient.name,
                              appointmentDate: format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy'),
                              appointmentTime: appointment.appointmentTime,
                              hospitalName: hospital?.name || 'Hospital',
                              clinicianName: appointment.clinicianName || 'Doctor',
                              reasonForVisit: appointment.reasonForVisit,
                              location: appointment.location,
                              appointmentNumber: appointment.appointmentNumber,
                            }, 24);
                            const url = generateWhatsAppUrl(appointment.patientWhatsApp, message);
                            window.open(url, '_blank');
                          }
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `tel:${appointment.patientWhatsApp}`;
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Call Patient"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      <AnimatePresence>
        {showBookingForm && (
          <AppointmentBookingForm
            onClose={() => setShowBookingForm(false)}
            onSuccess={() => {
              // Refresh will happen automatically via dexie-react-hooks
            }}
          />
        )}
      </AnimatePresence>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {selectedAppointment && (
          <AppointmentDetailModal
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onUpdate={() => {
              // Refresh will happen automatically
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
