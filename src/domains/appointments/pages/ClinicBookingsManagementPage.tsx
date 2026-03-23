/**
 * Clinic Bookings Management Page
 * 
 * Admin page to view and manage all public clinic bookings.
 * Includes check-in, no-show marking, cancellation, and rescheduling.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Calendar,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Eye,
  QrCode,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { db } from '../../../database';
import { CLINIC_LOCATIONS, formatTime12Hour, formatDateForDisplay } from '../../../data/clinicLocations';
import type { PublicClinicBooking } from '../../../types';
import toast from 'react-hot-toast';
import { format, isToday, isTomorrow } from 'date-fns';

type BookingStatus = PublicClinicBooking['status'];

const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rescheduled: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
};

const ClinicBookingsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Filters
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  
  // Details modal
  const [selectedBooking, setSelectedBooking] = useState<PublicClinicBooking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Get all bookings with filters
  const bookings = useLiveQuery(async () => {
    let query = db.publicClinicBookings.orderBy('createdAt').reverse();
    
    // Get all bookings and filter in memory for complex conditions
    const allBookings = await query.toArray();
    
    return allBookings.filter(booking => {
      // Filter by hospital
      if (selectedHospital !== 'all' && booking.hospitalCode !== selectedHospital) {
        return false;
      }
      
      // Filter by date
      if (selectedDate && booking.appointmentDate !== selectedDate) {
        return false;
      }
      
      // Filter by status
      if (selectedStatus !== 'all' && booking.status !== selectedStatus) {
        return false;
      }
      
      // Search query
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          booking.fullName.toLowerCase().includes(search) ||
          booking.phoneNumber.includes(search) ||
          booking.bookingNumber.toLowerCase().includes(search)
        );
      }
      
      return true;
    });
  }, [selectedHospital, selectedDate, selectedStatus, searchQuery]);
  
  // Get statistics
  const stats = useMemo(() => {
    if (!bookings) return null;
    
    return {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      checkedIn: bookings.filter(b => b.status === 'checked_in').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      noShow: bookings.filter(b => b.status === 'no_show').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };
  }, [bookings]);
  
  // Update booking status
  const updateBookingStatus = async (booking: PublicClinicBooking, newStatus: BookingStatus) => {
    try {
      const updates: Partial<PublicClinicBooking> = {
        status: newStatus,
        updatedAt: new Date(),
      };
      
      // Add timestamp based on status
      switch (newStatus) {
        case 'checked_in':
          updates.checkedInAt = new Date();
          break;
        case 'completed':
          updates.completedAt = new Date();
          break;
        case 'cancelled':
          updates.cancelledAt = new Date();
          break;
      }
      
      await db.publicClinicBookings.update(booking.id, updates);
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking status');
    }
  };
  
  // Send WhatsApp reminder
  const sendWhatsAppReminder = (booking: PublicClinicBooking) => {
    const message = encodeURIComponent(
      `⏰ APPOINTMENT REMINDER\n\n` +
      `Dear ${booking.fullName},\n\n` +
      `This is a reminder for your upcoming appointment:\n\n` +
      `📋 Reference: ${booking.bookingNumber}\n` +
      `🏥 Hospital: ${booking.hospitalName}\n` +
      `📅 Date: ${formatDateForDisplay(new Date(booking.appointmentDate))}\n` +
      `🕐 Time: ${formatTime12Hour(booking.timeSlot)} - ${formatTime12Hour(booking.slotEndTime)}\n\n` +
      `⚠️ Please arrive within 5 minutes of your scheduled time.\n\n` +
      `CareBridge Health`
    );
    
    const whatsappUrl = `https://wa.me/${booking.phoneNumber.replace('+', '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };
  
  // Get date label
  const getDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                Clinic Bookings
              </h1>
              <p className="text-gray-600 mt-2">
                Manage patient appointments across all clinic locations
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/appointments/share-booking')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <QrCode className="h-5 w-5 text-primary" />
                Share Links
              </button>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-400">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
              <div className="text-2xl font-bold text-amber-600">{stats.checkedIn}</div>
              <div className="text-sm text-gray-600">Checked In</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{stats.noShow}</div>
              <div className="text-sm text-gray-600">No Show</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-300">
              <div className="text-2xl font-bold text-gray-500">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 font-medium w-full md:w-auto"
          >
            <Filter className="h-5 w-5" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {showFilters && (
            <div className="grid md:grid-cols-4 gap-4 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, booking #..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              
              {/* Hospital Filter */}
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                title="Filter by hospital"
                aria-label="Filter by hospital"
              >
                <option value="all">All Hospitals</option>
                {CLINIC_LOCATIONS.map(clinic => (
                  <option key={clinic.hospitalCode} value={clinic.hospitalCode}>
                    {clinic.hospitalName}
                  </option>
                ))}
              </select>
              
              {/* Date Filter */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                title="Filter by date"
                aria-label="Filter by date"
              />
              
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                title="Filter by status"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Bookings List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {!bookings || bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No bookings found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Booking</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Patient</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Hospital</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date & Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-primary">
                          {booking.bookingNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{booking.fullName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {booking.phoneNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{booking.hospitalName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium">{getDateLabel(booking.appointmentDate)}</div>
                          <div className="text-gray-500">
                            {formatTime12Hour(booking.timeSlot)} - {formatTime12Hour(booking.slotEndTime)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => updateBookingStatus(booking, 'checked_in')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Check In"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => sendWhatsAppReminder(booking)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Booking Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Close details"
                  aria-label="Close details"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              {/* Booking Info */}
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-xl">
                  <div className="text-sm text-gray-600">Booking Reference</div>
                  <div className="text-xl font-mono font-bold text-primary">{selectedBooking.bookingNumber}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Patient Name</div>
                    <div className="font-medium">{selectedBooking.fullName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <div className="font-medium">{selectedBooking.phoneNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Hospital</div>
                    <div className="font-medium">{selectedBooking.hospitalName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedBooking.status]}`}>
                      {STATUS_LABELS[selectedBooking.status]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Date</div>
                    <div className="font-medium">{formatDateForDisplay(new Date(selectedBooking.appointmentDate))}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Time</div>
                    <div className="font-medium">
                      {formatTime12Hour(selectedBooking.timeSlot)} - {formatTime12Hour(selectedBooking.slotEndTime)}
                    </div>
                  </div>
                </div>
                
                {/* Timestamps */}
                <div className="border-t pt-4 text-sm text-gray-500 space-y-1">
                  <div>Booked: {format(new Date(selectedBooking.createdAt), 'PPp')}</div>
                  {selectedBooking.checkedInAt && (
                    <div>Checked In: {format(new Date(selectedBooking.checkedInAt), 'PPp')}</div>
                  )}
                  {selectedBooking.completedAt && (
                    <div>Completed: {format(new Date(selectedBooking.completedAt), 'PPp')}</div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="border-t pt-4 space-y-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Update Status</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedBooking.status === 'confirmed' && (
                      <button
                        onClick={() => updateBookingStatus(selectedBooking, 'checked_in')}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Check In
                      </button>
                    )}
                    
                    {selectedBooking.status === 'checked_in' && (
                      <button
                        onClick={() => updateBookingStatus(selectedBooking, 'completed')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Completed
                      </button>
                    )}
                    
                    {['confirmed', 'checked_in'].includes(selectedBooking.status) && (
                      <>
                        <button
                          onClick={() => updateBookingStatus(selectedBooking, 'no_show')}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          No Show
                        </button>
                        
                        <button
                          onClick={() => updateBookingStatus(selectedBooking, 'cancelled')}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* WhatsApp */}
                  <button
                    onClick={() => sendWhatsAppReminder(selectedBooking)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full justify-center"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Send WhatsApp Reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicBookingsManagementPage;
