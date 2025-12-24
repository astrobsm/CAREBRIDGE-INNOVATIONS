import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Phone, MapPin, Heart, AlertCircle, Building2, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import type { Patient, BloodGroup, Genotype } from '../../../types';

// Hospital options
const hospitals = [
  { id: 'niger-foundation', name: 'Niger Foundation Hospital' },
  { id: 'st-patrics', name: 'St. Patrics Hospital' },
  { id: 'regions-hospital', name: 'Regions Hospital' },
  { id: 'raymond-anikwe', name: 'Raymond Anikwe Hospital' },
  { id: 'st-marys', name: 'St. Marys Hospital' },
  { id: 'st-gabriel', name: 'St. Gabriel Hospital' },
  { id: 'roza-mystica', name: 'Roza Mystica Hospital' },
  { id: 'others', name: 'Others (Specify)' },
];

const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female']),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  occupation: z.string().optional(),
  religion: z.string().optional(),
  tribe: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  nextOfKinName: z.string().min(2, 'Next of kin name is required'),
  nextOfKinRelationship: z.string().min(2, 'Relationship is required'),
  nextOfKinPhone: z.string().min(10, 'Phone number is required'),
  nextOfKinAddress: z.string().min(5, 'Address is required'),
  // Care type and hospital fields
  careType: z.enum(['home_care', 'hospital']),
  hospitalId: z.string().optional(),
  otherHospitalName: z.string().optional(),
  ward: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genotypes: Genotype[] = ['AA', 'AS', 'SS', 'AC', 'SC'];
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function NewPatientPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      maritalStatus: 'single',
      gender: 'male',
      careType: 'hospital',
    },
  });

  const careType = watch('careType');
  const hospitalId = watch('hospitalId');

  const generateHospitalNumber = (): string => {
    const prefix = 'CB';
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${year}${random}`;
  };

  const onSubmit = async (data: PatientFormData) => {
    setIsLoading(true);
    try {
      // Determine the hospital name
      let hospitalName: string | undefined;
      if (data.careType === 'hospital') {
        if (data.hospitalId === 'others') {
          hospitalName = data.otherHospitalName;
        } else {
          const selectedHospital = hospitals.find(h => h.id === data.hospitalId);
          hospitalName = selectedHospital?.name;
        }
      }

      const patient: Patient = {
        id: uuidv4(),
        hospitalNumber: generateHospitalNumber(),
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup as BloodGroup | undefined,
        genotype: data.genotype as Genotype | undefined,
        maritalStatus: data.maritalStatus,
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        email: data.email || undefined,
        address: data.address,
        city: data.city,
        state: data.state,
        occupation: data.occupation,
        religion: data.religion,
        tribe: data.tribe,
        allergies: data.allergies ? data.allergies.split(',').map(a => a.trim()) : [],
        chronicConditions: data.chronicConditions ? data.chronicConditions.split(',').map(c => c.trim()) : [],
        nextOfKin: {
          name: data.nextOfKinName,
          relationship: data.nextOfKinRelationship,
          phone: data.nextOfKinPhone,
          address: data.nextOfKinAddress,
        },
        // Care Setting fields
        careType: data.careType as 'hospital' | 'homecare',
        hospitalId: data.careType === 'hospital' ? data.hospitalId : undefined,
        hospitalName: hospitalName,
        ward: data.careType === 'hospital' ? data.ward : undefined,
        registeredHospitalId: user?.hospitalId || 'hospital-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.patients.add(patient);
      
      // Sync to cloud immediately
      await syncRecord('patients', patient as unknown as Record<string, unknown>);
      
      toast.success('Patient registered successfully!');
      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error('Failed to register patient');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Patients
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Register New Patient</h1>
        <p className="text-gray-600 mt-1">
          Enter the patient's information to create a new medical record
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <User className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input {...register('firstName')} className={`input ${errors.firstName ? 'input-error' : ''}`} />
              {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input {...register('lastName')} className={`input ${errors.lastName ? 'input-error' : ''}`} />
              {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="label">Middle Name</label>
              <input {...register('middleName')} className="input" />
            </div>
            <div>
              <label className="label">Date of Birth *</label>
              <input type="date" {...register('dateOfBirth')} className={`input ${errors.dateOfBirth ? 'input-error' : ''}`} />
              {errors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <label className="label">Gender *</label>
              <select {...register('gender')} className="input">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Marital Status *</label>
              <select {...register('maritalStatus')} className="input">
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select {...register('bloodGroup')} className="input">
                <option value="">Select blood group</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Genotype</label>
              <select {...register('genotype')} className="input">
                <option value="">Select genotype</option>
                {genotypes.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Occupation</label>
              <input {...register('occupation')} className="input" />
            </div>
            <div>
              <label className="label">Religion</label>
              <input {...register('religion')} className="input" />
            </div>
            <div>
              <label className="label">Tribe/Ethnicity</label>
              <input {...register('tribe')} className="input" />
            </div>
          </div>
        </motion.div>

        {/* Care Setting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <Building2 className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Care Setting</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Care Type *</label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    {...register('careType')}
                    value="hospital"
                    className="w-4 h-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                  />
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Hospital Care</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    {...register('careType')}
                    value="homecare"
                    className="w-4 h-4 text-sky-600 border-gray-300 focus:ring-sky-500"
                  />
                  <Home className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Home Care</span>
                </label>
              </div>
            </div>

            {careType === 'hospital' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Hospital *</label>
                  <select {...register('hospitalId')} className={`input ${errors.hospitalId ? 'input-error' : ''}`}>
                    <option value="">Select hospital</option>
                    {hospitals.map((hospital) => (
                      <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                    ))}
                  </select>
                  {errors.hospitalId && <p className="text-sm text-red-500 mt-1">{errors.hospitalId.message}</p>}
                </div>

                {hospitalId === 'others' && (
                  <div>
                    <label className="label">Specify Hospital Name *</label>
                    <input
                      {...register('otherHospitalName')}
                      className={`input ${errors.otherHospitalName ? 'input-error' : ''}`}
                      placeholder="Enter hospital name"
                    />
                    {errors.otherHospitalName && <p className="text-sm text-red-500 mt-1">{errors.otherHospitalName.message}</p>}
                  </div>
                )}

                <div>
                  <label className="label">Ward/Unit</label>
                  <input
                    {...register('ward')}
                    className="input"
                    placeholder="e.g., Surgical Ward, ICU, Private Ward"
                  />
                </div>
              </div>
            )}

            {careType === 'homecare' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Home className="w-5 h-5" />
                  <p className="font-medium">Home Care Selected</p>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Patient will receive care at their registered address. A home care team will be assigned.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <Phone className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Contact Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone Number *</label>
              <input {...register('phone')} type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} placeholder="+234 800 123 4567" />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Alternate Phone</label>
              <input {...register('alternatePhone')} type="tel" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Email Address</label>
              <input {...register('email')} type="email" className="input" placeholder="patient@example.com" />
            </div>
          </div>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <MapPin className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Address</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Street Address *</label>
              <input {...register('address')} className={`input ${errors.address ? 'input-error' : ''}`} />
              {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>}
            </div>
            <div>
              <label className="label">City *</label>
              <input {...register('city')} className={`input ${errors.city ? 'input-error' : ''}`} />
              {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">State *</label>
              <select {...register('state')} className={`input ${errors.state ? 'input-error' : ''}`}>
                <option value="">Select state</option>
                {nigerianStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state.message}</p>}
            </div>
          </div>
        </motion.div>

        {/* Medical Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Medical Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Known Allergies</label>
              <input {...register('allergies')} className="input" placeholder="Separate multiple allergies with commas" />
              <p className="text-xs text-gray-500 mt-1">e.g., Penicillin, Peanuts, Latex</p>
            </div>
            <div className="md:col-span-2">
              <label className="label">Chronic Conditions</label>
              <input {...register('chronicConditions')} className="input" placeholder="Separate multiple conditions with commas" />
              <p className="text-xs text-gray-500 mt-1">e.g., Diabetes, Hypertension, Asthma</p>
            </div>
          </div>
        </motion.div>

        {/* Next of Kin */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <Heart className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Next of Kin</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input {...register('nextOfKinName')} className={`input ${errors.nextOfKinName ? 'input-error' : ''}`} />
              {errors.nextOfKinName && <p className="text-sm text-red-500 mt-1">{errors.nextOfKinName.message}</p>}
            </div>
            <div>
              <label className="label">Relationship *</label>
              <input {...register('nextOfKinRelationship')} className={`input ${errors.nextOfKinRelationship ? 'input-error' : ''}`} placeholder="e.g., Spouse, Parent, Sibling" />
              {errors.nextOfKinRelationship && <p className="text-sm text-red-500 mt-1">{errors.nextOfKinRelationship.message}</p>}
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input {...register('nextOfKinPhone')} type="tel" className={`input ${errors.nextOfKinPhone ? 'input-error' : ''}`} />
              {errors.nextOfKinPhone && <p className="text-sm text-red-500 mt-1">{errors.nextOfKinPhone.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Address *</label>
              <input {...register('nextOfKinAddress')} className={`input ${errors.nextOfKinAddress ? 'input-error' : ''}`} />
              {errors.nextOfKinAddress && <p className="text-sm text-red-500 mt-1">{errors.nextOfKinAddress.message}</p>}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Save size={18} />
                Register Patient
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
