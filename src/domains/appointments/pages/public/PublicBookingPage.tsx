/**
 * Public Clinic Appointment Booking Page
 * 
 * This page is accessible without login for patients to book
 * clinic appointments across multiple hospital locations.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../database';
import { 
  CLINIC_LOCATIONS, 
  getAvailableDates,
  generateTimeSlots,
  calculateSlotEndTime,
  formatDateForDisplay,
  formatDateForStorage,
  formatTime12Hour,
  generateBookingNumber,
  validatePhoneNumber,
  formatPhoneForWhatsApp,
} from '../../../../data/clinicLocations';
import type { ClinicLocationConfig, PublicClinicBooking, ClinicTimeSlot } from '../../../../types';
import toast from 'react-hot-toast';

// Terms and Conditions Content
const TERMS_AND_CONDITIONS = `
CAREBRIDGE – CLINIC APPOINTMENT TERMS AND CONDITIONS

1. Appointment Scheduling
By booking an appointment through the CareBridge platform, the patient agrees to attend the selected hospital, date, and time as scheduled.

2. Punctuality Requirement
Patients are required to arrive not earlier than 5 minutes before and not later than 5 minutes after their scheduled appointment time.
Failure to comply shall result in loss of appointment priority.

3. Missed and Late Appointments
• Patients arriving later than 5 minutes after their scheduled time shall be considered late.
• Such patients may:
  - Be attended to only after all scheduled patients have been seen, or
  - Be required to reschedule to another available date
• The attending clinician reserves full discretion in this regard.

4. No Guarantee of Immediate Consultation
Patients who miss their time slot are not entitled to immediate consultation and may experience delays or cancellation.

5. Communication Consent
By providing a phone number, the patient consents to receiving WhatsApp notifications for appointment confirmation, reminders, and rescheduling updates.

6. Accuracy of Information
Patients are responsible for ensuring that their name and phone number are accurate and active.
Failure may result in missed communication without liability to the clinic.

7. Clinical Discretion
The clinic reserves the right to:
• Reschedule appointments where necessary
• Adjust timing due to clinical exigencies
• Decline consultation where operational rules are not followed

8. System Integrity
Any attempt to double book, manipulate scheduling, or provide false information may result in cancellation of appointments and restriction from future bookings.

9. Acceptance of Terms
By proceeding with the booking, the patient confirms that they have read, understood, and agreed to these Terms and Conditions in full.
`;

type BookingStep = 'hospital' | 'date' | 'time' | 'details' | 'terms' | 'confirmation';

const PublicBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedHospital = searchParams.get('hospital');
  
  // Booking flow state
  const [currentStep, setCurrentStep] = useState<BookingStep>('hospital');
  const [selectedClinic, setSelectedClinic] = useState<ClinicLocationConfig | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<ClinicTimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  
  // Loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<PublicClinicBooking | null>(null);
  
  // Pre-select hospital from URL parameter
  useEffect(() => {
    if (preselectedHospital) {
      const clinic = CLINIC_LOCATIONS.find(c => 
        c.hospitalCode.toLowerCase() === preselectedHospital.toLowerCase() ||
        c.id === preselectedHospital
      );
      if (clinic) {
        handleSelectClinic(clinic);
      }
    }
  }, [preselectedHospital]);
  
  // Handle clinic selection
  const handleSelectClinic = (clinic: ClinicLocationConfig) => {
    setSelectedClinic(clinic);
    const dates = getAvailableDates(clinic.dayOfWeek, 4);
    setAvailableDates(dates);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCurrentStep('date');
  };
  
  // Handle date selection
  const handleSelectDate = async (date: Date) => {
    if (!selectedClinic) return;
    
    setSelectedDate(date);
    setIsLoading(true);
    
    try {
      // Generate all possible time slots
      const allSlots = generateTimeSlots(
        selectedClinic.startTime,
        selectedClinic.endTime,
        selectedClinic.slotDuration
      );
      
      // Get existing bookings for this date and hospital
      const dateStr = formatDateForStorage(date);
      const existingBookings = await db.publicClinicBookings
        .where('[hospitalCode+appointmentDate]')
        .equals([selectedClinic.hospitalCode, dateStr])
        .filter(b => b.status !== 'cancelled')
        .toArray();
      
      const bookedSlots = new Set(existingBookings.map(b => b.timeSlot));
      
      // Mark slots as available or unavailable
      const slotsWithAvailability: ClinicTimeSlot[] = allSlots.map(slot => ({
        time: slot,
        endTime: calculateSlotEndTime(slot, selectedClinic.slotDuration),
        isAvailable: !bookedSlots.has(slot),
        bookingId: existingBookings.find(b => b.timeSlot === slot)?.id,
      }));
      
      setTimeSlots(slotsWithAvailability);
      setSelectedSlot(null);
      setCurrentStep('time');
    } catch (error) {
      console.error('Error loading time slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle time slot selection
  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setCurrentStep('details');
  };
  
  // Handle form submission
  const handleSubmitDetails = () => {
    // Validate inputs
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid Nigerian phone number');
      return;
    }
    
    setCurrentStep('terms');
  };
  
  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!termsAccepted) {
      toast.error('Please accept the Terms and Conditions');
      return;
    }
    
    if (!selectedClinic || !selectedDate || !selectedSlot) {
      toast.error('Missing booking information');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Double-check slot availability (prevent race conditions)
      const dateStr = formatDateForStorage(selectedDate);
      const existingBooking = await db.publicClinicBookings
        .where('[hospitalCode+appointmentDate+timeSlot]')
        .equals([selectedClinic.hospitalCode, dateStr, selectedSlot])
        .filter(b => b.status !== 'cancelled')
        .first();
      
      if (existingBooking) {
        toast.error('This time slot was just booked. Please select another slot.');
        setCurrentStep('time');
        // Refresh available slots
        handleSelectDate(selectedDate);
        return;
      }
      
      // Create the booking
      const booking: PublicClinicBooking = {
        id: uuidv4(),
        bookingNumber: generateBookingNumber(),
        fullName: fullName.trim(),
        phoneNumber: formatPhoneForWhatsApp(phoneNumber),
        hospitalCode: selectedClinic.hospitalCode,
        hospitalName: selectedClinic.hospitalName,
        appointmentDate: dateStr,
        timeSlot: selectedSlot,
        slotEndTime: calculateSlotEndTime(selectedSlot, selectedClinic.slotDuration),
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.publicClinicBookings.add(booking);
      
      setBookingResult(booking);
      setCurrentStep('confirmation');
      toast.success('Appointment booked successfully!');
      
      // Send WhatsApp confirmation (placeholder - would integrate with WhatsApp API)
      sendWhatsAppConfirmation(booking);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send WhatsApp confirmation
  const sendWhatsAppConfirmation = (booking: PublicClinicBooking) => {
    const message = encodeURIComponent(
      `✅ APPOINTMENT CONFIRMED\n\n` +
      `Booking Reference: ${booking.bookingNumber}\n` +
      `Name: ${booking.fullName}\n` +
      `Hospital: ${booking.hospitalName}\n` +
      `Date: ${formatDateForDisplay(new Date(booking.appointmentDate))}\n` +
      `Time: ${formatTime12Hour(booking.timeSlot)} - ${formatTime12Hour(booking.slotEndTime)}\n\n` +
      `⚠️ Please arrive within 5 minutes of your scheduled time.\n\n` +
      `CareBridge Health`
    );
    
    // Open WhatsApp with pre-filled message (for self-confirmation)
    // In production, this would be sent via WhatsApp Business API
    const whatsappUrl = `https://wa.me/${booking.phoneNumber.replace('+', '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };
  
  // Go back to previous step
  const handleBack = () => {
    switch (currentStep) {
      case 'date':
        setCurrentStep('hospital');
        break;
      case 'time':
        setCurrentStep('date');
        break;
      case 'details':
        setCurrentStep('time');
        break;
      case 'terms':
        setCurrentStep('details');
        break;
    }
  };
  
  // Reset and start new booking
  const handleNewBooking = () => {
    setCurrentStep('hospital');
    setSelectedClinic(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setFullName('');
    setPhoneNumber('');
    setTermsAccepted(false);
    setBookingResult(null);
  };
  
  // Render hospital selection step
  const renderHospitalSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Select Clinic Location</h2>
        <p className="text-gray-600 mt-2">Choose where you'd like to book your appointment</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {CLINIC_LOCATIONS.filter(c => c.isActive).map(clinic => (
          <button
            key={clinic.id}
            onClick={() => handleSelectClinic(clinic)}
            className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">{clinic.hospitalName}</h3>
                {clinic.address && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {clinic.address}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                    {clinic.dayName}
                  </span>
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatTime12Hour(clinic.startTime)} - {formatTime12Hour(clinic.endTime)}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
  
  // Render date selection step
  const renderDateSelection = () => (
    <div className="space-y-6">
      <button 
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clinics
      </button>
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Select Date</h2>
        <p className="text-gray-600 mt-2">
          {selectedClinic?.hospitalName} - {selectedClinic?.dayName}s
        </p>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {availableDates.map(date => (
          <button
            key={date.toISOString()}
            onClick={() => handleSelectDate(date)}
            className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-md transition-all text-left flex items-center gap-4"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {formatDateForDisplay(date)}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
  
  // Render time slot selection step
  const renderTimeSelection = () => (
    <div className="space-y-6">
      <button 
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dates
      </button>
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Select Time Slot</h2>
        <p className="text-gray-600 mt-2">
          {selectedDate && formatDateForDisplay(selectedDate)}
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          {timeSlots.map(slot => (
            <button
              key={slot.time}
              onClick={() => slot.isAvailable && handleSelectSlot(slot.time)}
              disabled={!slot.isAvailable}
              className={`p-4 rounded-xl text-center transition-all ${
                slot.isAvailable
                  ? 'bg-white border-2 border-gray-200 hover:border-primary hover:shadow-md'
                  : 'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Clock className={`h-5 w-5 mx-auto mb-2 ${
                slot.isAvailable ? 'text-primary' : 'text-gray-300'
              }`} />
              <div className="font-semibold">
                {formatTime12Hour(slot.time)}
              </div>
              <div className="text-xs text-gray-500">
                to {formatTime12Hour(slot.endTime)}
              </div>
              {!slot.isAvailable && (
                <span className="text-xs text-red-500 mt-1 block">Booked</span>
              )}
            </button>
          ))}
        </div>
      )}
      
      {timeSlots.length > 0 && !timeSlots.some(s => s.isAvailable) && (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
          <p>All slots are booked for this date.</p>
          <p className="text-sm mt-1">Please select a different date.</p>
        </div>
      )}
    </div>
  );
  
  // Render patient details form
  const renderDetailsForm = () => (
    <div className="space-y-6">
      <button 
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to time slots
      </button>
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Your Details</h2>
        <p className="text-gray-600 mt-2">Enter your information to complete the booking</p>
      </div>
      
      {/* Booking Summary */}
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
        <h3 className="font-semibold text-gray-900 mb-3">Appointment Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>{selectedClinic?.hospitalName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{selectedDate && formatDateForDisplay(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              {selectedSlot && formatTime12Hour(selectedSlot)} - {' '}
              {selectedSlot && selectedClinic && formatTime12Hour(
                calculateSlotEndTime(selectedSlot, selectedClinic.slotDuration)
              )}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-1" />
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="h-4 w-4 inline mr-1" />
            Phone Number (WhatsApp) *
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="08012345678"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <p className="text-xs text-gray-500 mt-1">
            This number will be used for appointment confirmations and reminders
          </p>
        </div>
      </div>
      
      <button
        onClick={handleSubmitDetails}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 flex items-center justify-center gap-2"
      >
        Continue to Terms
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
  
  // Render terms and conditions
  const renderTerms = () => (
    <div className="space-y-6">
      <button 
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to details
      </button>
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
        <p className="text-gray-600 mt-2">Please read and accept our terms to complete your booking</p>
      </div>
      
      {/* Terms Content */}
      <div className="bg-gray-50 p-4 rounded-xl max-h-96 overflow-y-auto border">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
          {TERMS_AND_CONDITIONS}
        </pre>
      </div>
      
      {/* Accept Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">
          I have read, understood, and agree to the <strong>Terms and Conditions</strong> above. 
          I understand that late arrival may result in loss of my appointment slot.
        </span>
      </label>
      
      <button
        onClick={handleConfirmBooking}
        disabled={!termsAccepted || isLoading}
        className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
          termsAccepted
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            Confirming...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Confirm Appointment
          </>
        )}
      </button>
    </div>
  );
  
  // Render confirmation
  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex p-4 bg-green-100 rounded-full">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
        <p className="text-gray-600 mt-2">Your appointment has been successfully scheduled</p>
      </div>
      
      {bookingResult && (
        <div className="bg-white p-6 rounded-xl border-2 border-green-200 text-left space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Booking Reference</span>
            <span className="font-mono font-bold text-lg text-primary">{bookingResult.bookingNumber}</span>
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <span className="font-medium">{bookingResult.fullName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span>{bookingResult.hospitalName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span>{formatDateForDisplay(new Date(bookingResult.appointmentDate))}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <span>
                {formatTime12Hour(bookingResult.timeSlot)} - {formatTime12Hour(bookingResult.slotEndTime)}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
        <AlertCircle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
        <p className="text-sm text-amber-800 font-medium">
          Kindly arrive within 5 minutes before or after your scheduled appointment time.
        </p>
      </div>
      
      <div className="flex gap-4 justify-center pt-4">
        <button
          onClick={handleNewBooking}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
        >
          Book Another Appointment
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CareBridge</h1>
              <p className="text-xs text-gray-500">Clinic Appointment Booking</p>
            </div>
          </div>
          
          {/* Progress indicator */}
          {currentStep !== 'confirmation' && (
            <div className="hidden sm:flex items-center gap-2">
              {['hospital', 'date', 'time', 'details', 'terms'].map((step, index) => (
                <div 
                  key={step}
                  className={`w-2 h-2 rounded-full transition-all ${
                    ['hospital', 'date', 'time', 'details', 'terms'].indexOf(currentStep) >= index
                      ? 'bg-primary'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {currentStep === 'hospital' && renderHospitalSelection()}
          {currentStep === 'date' && renderDateSelection()}
          {currentStep === 'time' && renderTimeSelection()}
          {currentStep === 'details' && renderDetailsForm()}
          {currentStep === 'terms' && renderTerms()}
          {currentStep === 'confirmation' && renderConfirmation()}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} CareBridge Health. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicBookingPage;
