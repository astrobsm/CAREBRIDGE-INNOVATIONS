// Appointment Calendar View Component
// Professional diary/calendar view with day, week, and month views

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Building2,
  Home,
  Video,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  UserX,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../database';
import type { Appointment, AppointmentStatus, AppointmentType } from '../../../types';

type ViewMode = 'day' | 'week' | 'month';

interface AppointmentCalendarProps {
  hospitalId?: string;
  clinicianId?: string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onQuickAction?: (action: string, appointment: Appointment) => void;
}

const statusColors: Record<AppointmentStatus, { bg: string; text: string; border: string }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  checked_in: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  no_show: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },
  rescheduled: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
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

export default function AppointmentCalendar({
  hospitalId,
  clinicianId,
  onAppointmentClick,
  onQuickAction,
}: AppointmentCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { start: currentDate, end: currentDate };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  }, [viewMode, currentDate]);

  // Fetch appointments for the date range
  const appointments = useLiveQuery(async () => {
    let query = db.appointments.where('appointmentDate').between(
      dateRange.start,
      dateRange.end,
      true,
      true
    );

    const results = await query.toArray();
    
    return results.filter(apt => {
      if (hospitalId && apt.hospitalId !== hospitalId) return false;
      if (clinicianId && apt.clinicianId !== clinicianId) return false;
      return true;
    });
  }, [dateRange, hospitalId, clinicianId]);

  // Fetch patients for names
  const patientMap = useLiveQuery(async () => {
    const patients = await db.patients.toArray();
    const map: Record<string, { name: string; hospitalNumber: string }> = {};
    patients.forEach(p => {
      map[p.id] = {
        name: `${p.firstName} ${p.lastName}`,
        hospitalNumber: p.hospitalNumber,
      };
    });
    return map;
  }, []);

  // Generate days for the calendar
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [viewMode, currentDate, dateRange]);

  // Time slots for day/week view
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 20; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments?.forEach(apt => {
      const dateKey = format(new Date(apt.appointmentDate), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(apt);
    });
    // Sort appointments by time within each day
    Object.values(grouped).forEach(dayApts => {
      dayApts.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
    });
    return grouped;
  }, [appointments]);

  // Navigation handlers
  const navigate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(d => (direction === 'prev' ? subDays(d, 1) : addDays(d, 1)));
        break;
      case 'week':
        setCurrentDate(d => (direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1)));
        break;
      case 'month':
        setCurrentDate(d => (direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1)));
        break;
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'hospital': return <Building2 className="w-3.5 h-3.5" />;
      case 'home': return <Home className="w-3.5 h-3.5" />;
      case 'telemedicine': return <Video className="w-3.5 h-3.5" />;
      default: return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  const renderAppointmentCard = (appointment: Appointment, compact = false) => {
    const colors = statusColors[appointment.status];
    const patient = patientMap?.[appointment.patientId];

    if (compact) {
      return (
        <motion.div
          key={appointment.id}
          layoutId={appointment.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${colors.bg} ${colors.border} border rounded-lg p-2 cursor-pointer hover:shadow-md transition-all text-xs`}
          onClick={() => onAppointmentClick?.(appointment)}
        >
          <div className="flex items-center gap-1">
            <span>{typeIcons[appointment.type]}</span>
            <span className={`font-medium ${colors.text}`}>
              {appointment.appointmentTime}
            </span>
          </div>
          <p className="truncate font-medium mt-0.5">
            {patient?.name || 'Unknown Patient'}
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={appointment.id}
        layoutId={appointment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${colors.bg} ${colors.border} border rounded-xl p-3 cursor-pointer hover:shadow-lg transition-all relative group`}
        onClick={() => onAppointmentClick?.(appointment)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{typeIcons[appointment.type]}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                {appointment.status.replace('_', ' ')}
              </span>
              {appointment.priority === 'urgent' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                  Urgent
                </span>
              )}
              {appointment.priority === 'emergency' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  Emergency
                </span>
              )}
            </div>

            <h4 className="font-semibold text-gray-900">
              {patient?.name || 'Unknown Patient'}
            </h4>
            <p className="text-xs text-gray-500">
              {patient?.hospitalNumber}
            </p>

            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {appointment.appointmentTime}
              </span>
              <span className="flex items-center gap-1">
                {getLocationIcon(appointment.location.type)}
                {appointment.location.type === 'hospital' 
                  ? appointment.location.department || 'Hospital'
                  : appointment.location.type === 'home'
                  ? 'Home Visit'
                  : 'Telemedicine'
                }
              </span>
            </div>

            <p className="text-sm text-gray-600 mt-2 line-clamp-1">
              {appointment.reasonForVisit}
            </p>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActionMenu(showActionMenu === appointment.id ? null : appointment.id);
              }}
              className="p-1.5 rounded-lg hover:bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity"
              title="More options"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            <AnimatePresence>
              {showActionMenu === appointment.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-20 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onQuickAction?.('view', appointment);
                      setShowActionMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction?.('check_in', appointment);
                      setShowActionMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                  >
                    <CheckCircle className="w-4 h-4" /> Check In
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction?.('complete', appointment);
                      setShowActionMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-emerald-600"
                  >
                    <CheckCircle className="w-4 h-4" /> Complete
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction?.('no_show', appointment);
                      setShowActionMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                  >
                    <UserX className="w-4 h-4" /> No Show
                  </button>
                  <button
                    onClick={() => {
                      onQuickAction?.('whatsapp', appointment);
                      setShowActionMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                  >
                    <MessageCircle className="w-4 h-4" /> Send WhatsApp
                  </button>
                  <div className="border-t my-1" />
                  <button
                    onClick={() => {
                      onQuickAction?.('cancel', appointment);
                      setShowActionMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  };

  // Render Day View
  const renderDayView = () => (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[80px_1fr] border-b">
        <div className="p-3 text-center border-r bg-gray-50">
          <span className="text-xs text-gray-500 uppercase">Time</span>
        </div>
        <div className="p-3 text-center bg-emerald-50">
          <div className="text-sm font-semibold text-gray-700">
            {format(currentDate, 'EEEE')}
          </div>
          <div className={`text-2xl font-bold ${isToday(currentDate) ? 'text-emerald-600' : 'text-gray-900'}`}>
            {format(currentDate, 'd')}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map(time => {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          const slotAppointments = appointmentsByDate[dateKey]?.filter(
            apt => apt.appointmentTime.startsWith(time.split(':')[0])
          ) || [];

          return (
            <div key={time} className="grid grid-cols-[80px_1fr] border-b min-h-[80px]">
              <div className="p-2 text-right pr-4 border-r bg-gray-50 text-sm text-gray-500">
                {time}
              </div>
              <div className="p-2 space-y-2">
                {slotAppointments.map(apt => renderAppointmentCard(apt))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Week View
  const renderWeekView = () => (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
        <div className="p-3 text-center border-r bg-gray-50">
          <span className="text-xs text-gray-500 uppercase">Time</span>
        </div>
        {calendarDays.map(day => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-r ${isToday(day) ? 'bg-emerald-50' : 'bg-gray-50'}`}
          >
            <div className="text-xs text-gray-500 uppercase">
              {format(day, 'EEE')}
            </div>
            <div className={`text-lg font-bold ${isToday(day) ? 'text-emerald-600' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {timeSlots.map(time => (
          <div key={time} className="grid grid-cols-[80px_repeat(7,1fr)] border-b min-h-[60px]">
            <div className="p-1 text-right pr-2 border-r bg-gray-50 text-xs text-gray-500">
              {time}
            </div>
            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const slotAppointments = appointmentsByDate[dateKey]?.filter(
                apt => apt.appointmentTime.startsWith(time.split(':')[0])
              ) || [];

              return (
                <div key={day.toISOString()} className="p-1 border-r space-y-1 min-h-full">
                  {slotAppointments.map(apt => renderAppointmentCard(apt, true))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // Render Month View
  const renderMonthView = () => (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="p-3 text-center bg-gray-50 border-r text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6 auto-rows-fr">
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-b p-1 min-h-[100px] ${
                !isCurrentMonth ? 'bg-gray-50' : ''
              } ${isToday(day) ? 'bg-emerald-50' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday(day) 
                  ? 'bg-emerald-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                  : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {dayAppointments.slice(0, 3).map(apt => renderAppointmentCard(apt, true))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('prev')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            Today
          </button>

          <h2 className="text-lg font-semibold text-gray-800">
            {viewMode === 'day' && format(currentDate, 'MMMM d, yyyy')}
            {viewMode === 'week' && `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-gray-200 p-1 rounded-lg">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>

      {/* Status Legend */}
      <div className="px-4 py-2 border-t bg-gray-50 flex flex-wrap gap-3">
        <span className="text-xs text-gray-500 font-medium">Status:</span>
        {Object.entries(statusColors).slice(0, 5).map(([status, colors]) => (
          <span key={status} className={`px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}>
            {status.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}
