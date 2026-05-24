import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Phone, MapPin, Users, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import type { Patient } from '../../../types';

/**
 * SLIM Patient Registration
 * ─────────────────────────
 * Captures ONLY the essential demographic fields needed to create a record.
 * Clinical data (allergies, comorbidities, DVT/Caprini, Braden pressure-sore,
 * risk assessments, etc.) are now captured in the first encounter / admission,
 * not at registration. This keeps the front desk flow fast.
 *
 * Fields kept:
 *  - First name, Last name, Other (middle) names
 *  - Date of Birth
 *  - Sex
 *  - Phone
 *  - Email (optional)
 *  - Address
 *  - Hospital Number (auto-generated if blank)
 *  - Next-of-Kin name + Next-of-Kin phone
 *  - Marital status
 *  - Occupation
 */

const slimSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Sex is required' }) }),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().min(3, 'Address is required'),
  folderNumber: z.string().optional(),
  nextOfKinName: z.string().min(2, 'Next-of-kin name is required'),
  nextOfKinPhone: z.string().min(7, 'Next-of-kin phone is required'),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  occupation: z.string().min(2, 'Occupation is required'),
});

type SlimFormData = z.infer<typeof slimSchema>;

const generateHospitalNumber = (): string => {
  const prefix = 'CB';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${year}${random}`;
};

export default function SlimNewPatientPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SlimFormData>({
    resolver: zodResolver(slimSchema),
    defaultValues: { maritalStatus: 'single' },
  });

  const onSubmit = async (data: SlimFormData) => {
    setIsLoading(true);
    try {
      const hospitalNumber = data.folderNumber?.trim() || generateHospitalNumber();

      const patient: Patient = {
        id: uuidv4(),
        hospitalNumber,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName?.trim() || undefined,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        phone: data.phone.trim(),
        email: data.email?.trim() || undefined,
        address: data.address.trim(),
        city: '',
        state: '',
        occupation: data.occupation.trim(),
        allergies: [],
        chronicConditions: [],
        nextOfKin: {
          name: data.nextOfKinName.trim(),
          relationship: '',
          phone: data.nextOfKinPhone.trim(),
          address: '',
        },
        careType: 'hospital',
        hospitalId: user?.hospitalId,
        hospitalName: undefined,
        registeredHospitalId: user?.hospitalId || 'global',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Patient;

      try {
        await db.patients.add(patient);
      } catch (dbError) {
        console.error('[SlimPatientRegistration] DB error:', dbError);
        throw new Error('Failed to save patient locally');
      }

      try {
        if (navigator.onLine) {
          await syncRecord('patients', patient as unknown as Record<string, unknown>);
        }
      } catch (syncError) {
        console.warn('[SlimPatientRegistration] Cloud sync deferred:', syncError);
      }

      toast.success(
        navigator.onLine
          ? `Patient registered — ${hospitalNumber}`
          : `Patient registered (offline) — will sync when online`
      );
      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error('[SlimPatientRegistration] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to register patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 min-h-touch"
        >
          <ArrowLeft size={18} />
          Back to Patients
        </button>
        <h1 className="page-title">Register New Patient</h1>
        <p className="page-subtitle">
          Quick demographic registration — clinical history & risk assessments are captured at the first encounter.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-0.5">Slim registration</p>
          <p>
            Allergies, comorbidities, DVT/Caprini, pressure-sore (Braden) and other risk scores are now captured during the first clinical encounter or admission. Need the comprehensive form?{' '}
            <button
              type="button"
              onClick={() => navigate('/patients/new-comprehensive')}
              className="underline font-semibold hover:text-blue-700"
            >
              Switch to comprehensive registration
            </button>
            .
          </p>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Personal */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name *</label>
              <input {...register('firstName')} className="form-input" placeholder="John" />
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input {...register('lastName')} className="form-input" placeholder="Doe" />
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="form-label">Other Names</label>
              <input {...register('middleName')} className="form-input" placeholder="Other / middle names" />
            </div>
            <div>
              <label className="form-label">Hospital Number</label>
              <input
                {...register('folderNumber')}
                className="form-input"
                placeholder="Leave blank to auto-generate"
              />
              <p className="text-xs text-gray-500 mt-1">Format: CB + YY + 5 digits (e.g. CB2612345)</p>
            </div>
            <div>
              <label className="form-label">Date of Birth *</label>
              <input type="date" {...register('dateOfBirth')} className="form-input" />
              {errors.dateOfBirth && <p className="form-error">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <label className="form-label">Sex *</label>
              <select {...register('gender')} className="form-input">
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="form-error">{errors.gender.message}</p>}
            </div>
            <div>
              <label className="form-label">Marital Status *</label>
              <select {...register('maritalStatus')} className="form-input">
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Occupation *</label>
              <input {...register('occupation')} className="form-input" placeholder="Teacher, Farmer, Trader…" />
              {errors.occupation && <p className="form-error">{errors.occupation.message}</p>}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Contact Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone *</label>
              <input type="tel" {...register('phone')} className="form-input" placeholder="08012345678" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" {...register('email')} className="form-input" placeholder="patient@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="form-label flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Address *
              </label>
              <textarea
                {...register('address')}
                rows={2}
                className="form-input"
                placeholder="Street, area, town, state"
              />
              {errors.address && <p className="form-error">{errors.address.message}</p>}
            </div>
          </div>
        </div>

        {/* Next of Kin */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Next of Kin</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name *</label>
              <input {...register('nextOfKinName')} className="form-input" placeholder="Full name" />
              {errors.nextOfKinName && <p className="form-error">{errors.nextOfKinName.message}</p>}
            </div>
            <div>
              <label className="form-label">Phone *</label>
              <input type="tel" {...register('nextOfKinPhone')} className="form-input" placeholder="08012345678" />
              {errors.nextOfKinPhone && <p className="form-error">{errors.nextOfKinPhone.message}</p>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow'
            }`}
          >
            <Save size={18} />
            {isLoading ? 'Registering…' : 'Register Patient'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
