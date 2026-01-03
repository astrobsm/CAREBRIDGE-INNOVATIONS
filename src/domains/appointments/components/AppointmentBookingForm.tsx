// Appointment Booking Form Component
// Comprehensive form for scheduling new appointments with all necessary details

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  Phone,
  MessageCircle,
  FileText,
  Bell,
  Home,
  Video,
  Stethoscope,
  AlertCircle,
  X,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import { HospitalSelector } from '../../../components/hospital';
import { createAppointment, getAvailableSlots } from '../../../services/appointmentService';
import type { AppointmentType, AppointmentPriority, AppointmentLocation, Patient, Hospital } from '../../../types';

// Form validation schema
const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Please select a patient'),
  hospitalId: z.string().min(1, 'Please select a hospital'),
  appointmentDate: z.string().min(1, 'Please select a date'),
  appointmentTime: z.string().min(1, 'Please select a time'),
  duration: z.number().min(15).max(120).default(30),
  type: z.enum([
    'follow_up', 'fresh_consultation', 'review', 'procedure',
    'dressing_change', 'suture_removal', 'home_visit', 'telemedicine',
    'pre_operative', 'post_operative', 'emergency', 'other'
  ] as const),
  priority: z.enum(['routine', 'urgent', 'emergency'] as const).default('routine'),
  locationType: z.enum(['hospital', 'home', 'telemedicine'] as const),
  department: z.string().optional(),
  room: z.string().optional(),
  homeAddress: z.string().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().optional(),
  homeLandmarks: z.string().optional(),
  assignedDriverId: z.string().optional(),
  assignedHomeCareGiverId: z.string().optional(),
  clinicianId: z.string().optional(), // Made optional - can be assigned later
  reasonForVisit: z.string().min(1, 'Please provide reason for visit'),
  notes: z.string().optional(),
  patientWhatsApp: z.string().min(10, 'Valid WhatsApp number required'),
  patientPhone: z.string().optional(),
  patientEmail: z.string().email().optional().or(z.literal('')),
  reminderEnabled: z.boolean().default(true),
  relatedEncounterId: z.string().optional(),
  relatedSurgeryId: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentBookingFormProps {
  onClose: () => void;
  onSuccess?: (appointmentId: string) => void;
  preselectedPatientId?: string;
  preselectedType?: AppointmentType;
}

const appointmentTypes: { value: AppointmentType; label: string; icon: string }[] = [
  { value: 'fresh_consultation', label: 'Fresh Consultation', icon: '🆕' },
  { value: 'follow_up', label: 'Follow-up Visit', icon: '🔄' },
  { value: 'review', label: 'Routine Review', icon: '📋' },
  { value: 'procedure', label: 'Minor Procedure', icon: '🩺' },
  { value: 'dressing_change', label: 'Dressing Change', icon: '🩹' },
  { value: 'suture_removal', label: 'Suture Removal', icon: '✂️' },
  { value: 'home_visit', label: 'Home Visit', icon: '🏠' },
  { value: 'telemedicine', label: 'Telemedicine', icon: '💻' },
  { value: 'pre_operative', label: 'Pre-operative Assessment', icon: '📝' },
  { value: 'post_operative', label: 'Post-operative Check', icon: '✅' },
  { value: 'emergency', label: 'Emergency', icon: '🚨' },
  { value: 'other', label: 'Other', icon: '📌' },
];

const priorityOptions: { value: AppointmentPriority; label: string; color: string }[] = [
  { value: 'routine', label: 'Routine', color: 'bg-blue-100 text-blue-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
  { value: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-700' },
];

const durationOptions = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

export default function AppointmentBookingForm({
  onClose,
  onSuccess,
  preselectedPatientId,
  preselectedType,
}: AppointmentBookingFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Get hospitals for selection
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive === true).toArray(), []);

  // Get clinicians (doctors/surgeons)
  const clinicians = useLiveQuery(() => 
    db.users
      .where('role')
      .anyOf(['surgeon', 'anaesthetist', 'nurse', 'dietician', 'physiotherapist'])
      .filter(u => u.isActive)
      .toArray(),
    []
  );

  // Get drivers and home care givers for home visits
  const drivers = useLiveQuery(() =>
    db.users.where('role').equals('driver').filter(u => u.isActive).toArray(),
    []
  );

  const homeCareGivers = useLiveQuery(() =>
    db.users.where('role').equals('home_care_giver').filter(u => u.isActive).toArray(),
    []
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema) as any,
    defaultValues: {
      patientId: preselectedPatientId || '',
      type: preselectedType || 'follow_up',
      priority: 'routine',
      locationType: 'hospital',
      duration: 30,
      reminderEnabled: true,
      hospitalId: user?.hospitalId || '',
    },
  });

  const watchedType = watch('type');
  const watchedLocationType = watch('locationType');
  const watchedDate = watch('appointmentDate');
  const watchedClinicianId = watch('clinicianId');
  const watchedHospitalId = watch('hospitalId');

  // Auto-switch location type based on appointment type
  useEffect(() => {
    if (watchedType === 'home_visit') {
      setValue('locationType', 'home');
    } else if (watchedType === 'telemedicine') {
      setValue('locationType', 'telemedicine');
    }
  }, [watchedType, setValue]);

  // Load available slots when date and clinician are selected
  useEffect(() => {
    const loadSlots = async () => {
      if (watchedDate && watchedClinicianId) {
        setLoadingSlots(true);
        try {
          const slots = await getAvailableSlots(
            watchedClinicianId,
            new Date(watchedDate),
            watchedHospitalId
          );
          setAvailableSlots(slots);
          
          // If no predefined slots, generate default slots
          if (slots.length === 0) {
            const defaultSlots = [];
            for (let h = 8; h <= 17; h++) {
              defaultSlots.push(`${String(h).padStart(2, '0')}:00`);
              defaultSlots.push(`${String(h).padStart(2, '0')}:30`);
            }
            setAvailableSlots(defaultSlots);
          }
        } catch (error) {
          console.error('Error loading slots:', error);
          // Fallback to default slots
          const defaultSlots = [];
          for (let h = 8; h <= 17; h++) {
            defaultSlots.push(`${String(h).padStart(2, '0')}:00`);
            defaultSlots.push(`${String(h).padStart(2, '0')}:30`);
          }
          setAvailableSlots(defaultSlots);
        }
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [watchedDate, watchedClinicianId, watchedHospitalId]);

  // Load patient details when selected
  useEffect(() => {
    const loadPatient = async () => {
      const patientId = watch('patientId');
      if (patientId) {
        const patient = await db.patients.get(patientId);
        if (patient) {
          setSelectedPatient(patient);
          // Pre-fill contact details
          setValue('patientWhatsApp', patient.phone || '');
          setValue('patientPhone', patient.alternatePhone || patient.phone || '');
          setValue('patientEmail', patient.email || '');
          
          // Pre-fill home address for home visits
          if (watchedLocationType === 'home') {
            setValue('homeAddress', patient.address || '');
            setValue('homeCity', patient.city || '');
            setValue('homeState', patient.state || '');
          }
        }
      }
    };
    loadPatient();
  }, [watch('patientId'), watchedLocationType, setValue, watch]);

  const onSubmit = async (data: AppointmentFormData) => {
    if (!user) {
      toast.error('You must be logged in to book appointments');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build location object
      const location: AppointmentLocation = {
        type: data.locationType,
        hospitalId: data.hospitalId,
        hospitalName: hospitals?.find(h => h.id === data.hospitalId)?.name,
        department: data.department,
        room: data.room,
      };

      if (data.locationType === 'home') {
        location.homeAddress = data.homeAddress;
        location.homeCity = data.homeCity;
        location.homeState = data.homeState;
        location.homeLandmarks = data.homeLandmarks;
        location.assignedDriverId = data.assignedDriverId;
        location.assignedHomeCareGiverId = data.assignedHomeCareGiverId;
        location.homeContactPhone = data.patientPhone || data.patientWhatsApp;
      }

      if (data.locationType === 'telemedicine') {
        location.meetingPlatform = 'video_conference';
      }

      const clinician = data.clinicianId ? clinicians?.find(c => c.id === data.clinicianId) : null;

      const appointment = await createAppointment({
        patientId: data.patientId,
        hospitalId: data.hospitalId,
        appointmentDate: new Date(data.appointmentDate),
        appointmentTime: data.appointmentTime,
        duration: data.duration,
        type: data.type,
        priority: data.priority,
        location,
        reasonForVisit: data.reasonForVisit,
        notes: data.notes,
        clinicianId: data.clinicianId || undefined,
        clinicianName: clinician ? `${clinician.firstName} ${clinician.lastName}` : undefined,
        patientWhatsApp: data.patientWhatsApp,
        patientPhone: data.patientPhone,
        patientEmail: data.patientEmail || undefined,
        reminderEnabled: data.reminderEnabled,
        bookedBy: user.id,
        relatedEncounterId: data.relatedEncounterId,
        relatedSurgeryId: data.relatedSurgeryId,
      });

      toast.success(`Appointment booked successfully! Ref: ${appointment.appointmentNumber}`);
      onSuccess?.(appointment.id);
      onClose();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form validation errors
  const onFormError = (formErrors: any) => {
    console.log('Form validation errors:', formErrors);
    const errorMessages = Object.values(formErrors)
      .map((err: any) => err?.message)
      .filter(Boolean);
    if (errorMessages.length > 0) {
      toast.error(`Please fix: ${errorMessages[0]}`);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Book New Appointment
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Step {step} of 3: {step === 1 ? 'Patient & Type' : step === 2 ? 'Schedule & Location' : 'Contact & Reminders'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit as any, onFormError)} className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Patient & Appointment Type */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Patient Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Select Patient *
                    </label>
                    <Controller
                      name="patientId"
                      control={control}
                      render={({ field }) => (
                        <PatientSelector
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Search for patient..."
                        />
                      )}
                    />
                    {errors.patientId && (
                      <p className="text-red-500 text-sm mt-1">{errors.patientId.message}</p>
                    )}
                    {selectedPatient && (
                      <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="font-medium text-emerald-800">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-sm text-emerald-600">
                          Hospital No: {selectedPatient.hospitalNumber} | Phone: {selectedPatient.phone}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hospital Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline mr-2" />
                      Hospital *
                    </label>
                    <Controller
                      name="hospitalId"
                      control={control}
                      render={({ field }) => (
                        <HospitalSelector
                          value={field.value}
                          onChange={(hospitalId) => field.onChange(hospitalId || '')}
                          placeholder="Search hospital..."
                          required
                          error={errors.hospitalId?.message}
                          showAddNew={true}
                        />
                      )}
                    />
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Stethoscope className="w-4 h-4 inline mr-2" />
                      Appointment Type *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {appointmentTypes.map(type => (
                        <label
                          key={type.value}
                          className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${
                            watchedType === type.value
                              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            {...register('type')}
                            value={type.value}
                            className="sr-only"
                          />
                          <span className="text-lg">{type.icon}</span>
                          <span className="text-sm font-medium">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Priority
                    </label>
                    <div className="flex gap-3">
                      {priorityOptions.map(option => (
                        <label
                          key={option.value}
                          className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-all ${
                            watch('priority') === option.value
                              ? `${option.color} border-current ring-2`
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            {...register('priority')}
                            value={option.value}
                            className="sr-only"
                          />
                          <span className="font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Reason for Visit */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-2" />
                      Reason for Visit *
                    </label>
                    <textarea
                      {...register('reasonForVisit')}
                      rows={3}
                      placeholder="Describe the reason for this appointment..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {errors.reasonForVisit && (
                      <p className="text-red-500 text-sm mt-1">{errors.reasonForVisit.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Schedule & Location */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Clinician Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Clinician/Doctor <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      {...register('clinicianId')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">No specific clinician (assign later)</option>
                      {clinicians?.map(clinician => (
                        <option key={clinician.id} value={clinician.id}>
                          Dr. {clinician.firstName} {clinician.lastName} 
                          {clinician.specialization && ` - ${clinician.specialization}`}
                        </option>
                      ))}
                    </select>
                    {clinicians?.length === 0 && (
                      <p className="text-amber-600 text-sm mt-1">No clinicians registered. Appointment can be assigned later.</p>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Appointment Date *
                      </label>
                      <input
                        type="date"
                        {...register('appointmentDate')}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      {errors.appointmentDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.appointmentDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Appointment Time *
                      </label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span className="text-gray-500">Loading available slots...</span>
                        </div>
                      ) : (
                        <select
                          {...register('appointmentTime')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">Select time...</option>
                          {availableSlots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>
                      )}
                      {errors.appointmentTime && (
                        <p className="text-red-500 text-sm mt-1">{errors.appointmentTime.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Duration
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {durationOptions.map(option => (
                        <label
                          key={option.value}
                          className={`px-4 py-2 border rounded-xl cursor-pointer transition-all ${
                            watch('duration') === option.value
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            {...register('duration', { valueAsNumber: true })}
                            value={option.value}
                            className="sr-only"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Location Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location Type
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <label
                        className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                          watchedLocationType === 'hospital'
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('locationType')}
                          value="hospital"
                          className="sr-only"
                        />
                        <Building2 className="w-6 h-6 text-emerald-600" />
                        <span className="font-medium">Hospital</span>
                      </label>
                      <label
                        className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                          watchedLocationType === 'home'
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('locationType')}
                          value="home"
                          className="sr-only"
                        />
                        <Home className="w-6 h-6 text-orange-600" />
                        <span className="font-medium">Home Visit</span>
                      </label>
                      <label
                        className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                          watchedLocationType === 'telemedicine'
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('locationType')}
                          value="telemedicine"
                          className="sr-only"
                        />
                        <Video className="w-6 h-6 text-blue-600" />
                        <span className="font-medium">Telemedicine</span>
                      </label>
                    </div>
                  </div>

                  {/* Hospital-specific fields */}
                  {watchedLocationType === 'hospital' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          {...register('department')}
                          placeholder="e.g., Surgery OPD"
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Room/Office
                        </label>
                        <input
                          type="text"
                          {...register('room')}
                          placeholder="e.g., Room 201"
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Home visit fields */}
                  {watchedLocationType === 'home' && (
                    <div className="space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Home Visit Details
                      </h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Home Address *
                        </label>
                        <textarea
                          {...register('homeAddress')}
                          rows={2}
                          placeholder="Full home address..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            {...register('homeCity')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            type="text"
                            {...register('homeState')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Landmarks/Directions
                        </label>
                        <input
                          type="text"
                          {...register('homeLandmarks')}
                          placeholder="Any helpful landmarks or directions..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign Driver
                          </label>
                          <select
                            {...register('assignedDriverId')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                          >
                            <option value="">Select driver...</option>
                            {drivers?.map(driver => (
                              <option key={driver.id} value={driver.id}>
                                {driver.firstName} {driver.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Home Care Giver
                          </label>
                          <select
                            {...register('assignedHomeCareGiverId')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                          >
                            <option value="">Select care giver...</option>
                            {homeCareGivers?.map(cg => (
                              <option key={cg.id} value={cg.id}>
                                {cg.firstName} {cg.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Contact & Reminders */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                      <MessageCircle className="w-4 h-4" />
                      Contact Details for Reminders
                    </h4>
                    <p className="text-sm text-blue-600 mb-4">
                      These details will be used to send appointment reminders via WhatsApp and SMS.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          <Phone className="w-4 h-4 inline mr-1" />
                          WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          {...register('patientWhatsApp')}
                          placeholder="e.g., 08012345678"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        />
                        {errors.patientWhatsApp && (
                          <p className="text-red-500 text-sm mt-1">{errors.patientWhatsApp.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alternative Phone
                        </label>
                        <input
                          type="tel"
                          {...register('patientPhone')}
                          placeholder="Alternative contact number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          {...register('patientEmail')}
                          placeholder="patient@email.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reminder Settings */}
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                      <Bell className="w-4 h-4" />
                      Reminder Settings
                    </h4>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('reminderEnabled')}
                        className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-medium text-gray-700">Enable Automatic Reminders</span>
                        <p className="text-sm text-gray-500">
                          Patient will receive reminders at 48h, 24h, and 1h before the appointment
                        </p>
                      </div>
                    </label>

                    {watch('reminderEnabled') && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-200">
                        <p className="text-sm font-medium text-emerald-700 mb-2">
                          Scheduled Reminders:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                            WhatsApp: 48 hours before
                          </li>
                          <li className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                            WhatsApp + Push: 24 hours before
                          </li>
                          <li className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-500" />
                            Push Notification: 2 hours before
                          </li>
                          <li className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                            Final WhatsApp: 1 hour before
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-2" />
                      Additional Notes
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      placeholder="Any additional notes or special instructions..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <button
              type="button"
              onClick={step === 1 ? onClose : prevStep}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>

            <div className="flex gap-3">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Book Appointment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
