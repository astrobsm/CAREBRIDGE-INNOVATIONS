import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  X,
  Save,
  Edit,
  Stethoscope,
  Bed,
  Clock,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Hospital } from '../../../types';

// Nigerian states for address
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const hospitalTypes = [
  { value: 'general', label: 'General Hospital' },
  { value: 'specialist', label: 'Specialist Hospital' },
  { value: 'teaching', label: 'Teaching Hospital' },
  { value: 'private', label: 'Private Hospital' },
  { value: 'federal', label: 'Federal Medical Centre' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'maternity', label: 'Maternity Centre' },
];

const availableSpecialties = [
  'General Surgery',
  'Orthopaedics',
  'Neurosurgery',
  'Cardiothoracic Surgery',
  'Plastic Surgery',
  'Urology',
  'Paediatric Surgery',
  'Obstetrics & Gynaecology',
  'ENT',
  'Ophthalmology',
  'Anaesthesiology',
  'Emergency Medicine',
  'Internal Medicine',
  'Cardiology',
  'Nephrology',
  'Gastroenterology',
  'Pulmonology',
  'Dermatology',
  'Psychiatry',
  'Radiology',
  'Pathology',
];

const hospitalSchema = z.object({
  name: z.string().min(1, 'Hospital name is required'),
  type: z.enum(['primary', 'secondary', 'tertiary']),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').or(z.literal('')).transform(v => v || 'info@hospital.com'),
  website: z.string().optional(),
  bedCapacity: z.number().min(0).optional(),
  icuBeds: z.number().min(0).optional(),
  operatingTheatres: z.number().min(0).optional(),
  is24Hours: z.boolean().optional(),
  hasEmergency: z.boolean().optional(),
  hasLaboratory: z.boolean().optional(),
  hasPharmacy: z.boolean().optional(),
  hasRadiology: z.boolean().optional(),
});

type HospitalFormData = z.infer<typeof hospitalSchema>;

export default function HospitalsPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch: _watch,
    formState: { errors },
  } = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      is24Hours: false,
      hasEmergency: false,
      hasLaboratory: false,
      hasPharmacy: false,
      hasRadiology: false,
    },
  });

  const filteredHospitals = useMemo(() => {
    if (!hospitals) return [];
    return hospitals.filter((hospital) => {
      const matchesSearch = searchQuery === '' ||
        hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = stateFilter === 'all' || hospital.state === stateFilter;
      const matchesType = typeFilter === 'all' || hospital.type === typeFilter;
      return matchesSearch && matchesState && matchesType;
    });
  }, [hospitals, searchQuery, stateFilter, typeFilter]);

  const stats = useMemo(() => {
    if (!hospitals) return { total: 0, active: 0, totalBeds: 0, totalICU: 0 };
    return {
      total: hospitals.length,
      active: hospitals.filter(h => h.isActive).length,
      totalBeds: hospitals.reduce((sum, h) => sum + (h.bedCapacity || 0), 0),
      totalICU: hospitals.reduce((sum, h) => sum + (h.icuBeds || 0), 0),
    };
  }, [hospitals]);

  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const openEditModal = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setValue('name', hospital.name);
    setValue('type', hospital.type || 'general');
    setValue('address', hospital.address);
    setValue('city', hospital.city || '');
    setValue('state', hospital.state || '');
    setValue('phone', hospital.phone);
    setValue('email', hospital.email || '');
    setValue('website', hospital.website || '');
    setValue('bedCapacity', hospital.bedCapacity || 0);
    setValue('icuBeds', hospital.icuBeds || 0);
    setValue('operatingTheatres', hospital.operatingTheatres || 0);
    setValue('is24Hours', hospital.is24Hours || false);
    setValue('hasEmergency', hospital.hasEmergency || false);
    setValue('hasLaboratory', hospital.hasLaboratory || false);
    setValue('hasPharmacy', hospital.hasPharmacy || false);
    setValue('hasRadiology', hospital.hasRadiology || false);
    setSelectedSpecialties(hospital.specialties || []);
    setShowModal(true);
  };

  const onSubmit = async (data: HospitalFormData) => {
    if (!user) return;

    try {
      const hospitalData: Hospital = {
        id: editingHospital?.id || uuidv4(),
        name: data.name,
        type: data.type,
        address: data.address,
        city: data.city,
        state: data.state,
        phone: data.phone,
        email: data.email,
        website: data.website,
        bedCapacity: data.bedCapacity,
        icuBeds: data.icuBeds,
        operatingTheatres: data.operatingTheatres,
        is24Hours: data.is24Hours,
        hasEmergency: data.hasEmergency,
        hasLaboratory: data.hasLaboratory,
        hasPharmacy: data.hasPharmacy,
        hasRadiology: data.hasRadiology,
        specialties: selectedSpecialties,
        isActive: true,
        createdAt: editingHospital?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingHospital) {
        await db.hospitals.update(editingHospital.id, hospitalData);
        toast.success('Hospital updated successfully!');
      } else {
        await db.hospitals.add(hospitalData);
        toast.success('Hospital added successfully!');
      }

      setShowModal(false);
      setEditingHospital(null);
      setSelectedSpecialties([]);
      reset();
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast.error('Failed to save hospital');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHospital(null);
    setSelectedSpecialties([]);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-blue-500" />
            Hospital Registry
          </h1>
          <p className="text-gray-600 mt-1">
            Manage hospitals and their service capabilities
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          Add Hospital
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hospitals</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bed className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Beds</p>
              <p className="text-xl font-bold text-purple-600">{stats.totalBeds}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Stethoscope className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ICU Beds</p>
              <p className="text-xl font-bold text-red-600">{stats.totalICU}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or address..."
              className="input pl-10"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All States</option>
            {nigerianStates.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Types</option>
            {hospitalTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospital Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHospitals.length > 0 ? (
          filteredHospitals.map((hospital) => (
            <motion.div
              key={hospital.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
                    <span className="text-xs text-gray-500 capitalize">
                      {hospitalTypes.find(t => t.value === hospital.type)?.label || hospital.type}
                    </span>
                  </div>
                  <button
                    onClick={() => openEditModal(hospital)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{hospital.address}, {hospital.city}, {hospital.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span>{hospital.phone}</span>
                  </div>
                  {hospital.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} className="text-gray-400" />
                      <span>{hospital.email}</span>
                    </div>
                  )}
                </div>

                {/* Facilities */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {hospital.is24Hours && (
                    <span className="badge badge-success text-xs">
                      <Clock size={10} /> 24/7
                    </span>
                  )}
                  {hospital.hasEmergency && (
                    <span className="badge badge-danger text-xs">Emergency</span>
                  )}
                  {hospital.hasLaboratory && (
                    <span className="badge badge-info text-xs">Lab</span>
                  )}
                  {hospital.hasPharmacy && (
                    <span className="badge badge-secondary text-xs">Pharmacy</span>
                  )}
                  {hospital.hasRadiology && (
                    <span className="badge badge-warning text-xs">Radiology</span>
                  )}
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Beds</p>
                    <p className="font-semibold text-gray-900">{hospital.bedCapacity || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">ICU</p>
                    <p className="font-semibold text-gray-900">{hospital.icuBeds || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Theatres</p>
                    <p className="font-semibold text-gray-900">{hospital.operatingTheatres || 0}</p>
                  </div>
                </div>

                {/* Specialties */}
                {hospital.specialties && hospital.specialties.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-1">
                      {hospital.specialties.slice(0, 4).map((specialty) => (
                        <span key={specialty} className="badge bg-blue-50 text-blue-600 text-xs">
                          {specialty}
                        </span>
                      ))}
                      {hospital.specialties.length > 4 && (
                        <span className="badge bg-gray-100 text-gray-500 text-xs">
                          +{hospital.specialties.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hospitals found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Hospital Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(90vh-80px)]">
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Hospital Name *</label>
                      <input
                        {...register('name')}
                        className={`input ${errors.name ? 'input-error' : ''}`}
                        placeholder="Enter hospital name"
                      />
                    </div>
                    <div>
                      <label className="label">Type *</label>
                      <select {...register('type')} className="input">
                        <option value="">Select type</option>
                        {hospitalTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="label">Address *</label>
                    <input
                      {...register('address')}
                      className={`input ${errors.address ? 'input-error' : ''}`}
                      placeholder="Enter street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">City *</label>
                      <input
                        {...register('city')}
                        className={`input ${errors.city ? 'input-error' : ''}`}
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="label">State *</label>
                      <select {...register('state')} className="input">
                        <option value="">Select state</option>
                        {nigerianStates.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Phone *</label>
                      <input
                        {...register('phone')}
                        className={`input ${errors.phone ? 'input-error' : ''}`}
                        placeholder="+234..."
                      />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        {...register('email')}
                        type="email"
                        className="input"
                        placeholder="hospital@example.com"
                      />
                    </div>
                    <div>
                      <label className="label">Website</label>
                      <input
                        {...register('website')}
                        className="input"
                        placeholder="www.hospital.com"
                      />
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Bed Capacity</label>
                      <input
                        type="number"
                        {...register('bedCapacity', { valueAsNumber: true })}
                        className="input"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="label">ICU Beds</label>
                      <input
                        type="number"
                        {...register('icuBeds', { valueAsNumber: true })}
                        className="input"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="label">Operating Theatres</label>
                      <input
                        type="number"
                        {...register('operatingTheatres', { valueAsNumber: true })}
                        className="input"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Facilities */}
                  <div>
                    <label className="label">Facilities & Services</label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('is24Hours')} className="w-4 h-4" />
                        <span className="text-sm">24/7 Operations</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('hasEmergency')} className="w-4 h-4" />
                        <span className="text-sm">Emergency Services</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('hasLaboratory')} className="w-4 h-4" />
                        <span className="text-sm">Laboratory</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('hasPharmacy')} className="w-4 h-4" />
                        <span className="text-sm">Pharmacy</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('hasRadiology')} className="w-4 h-4" />
                        <span className="text-sm">Radiology/Imaging</span>
                      </label>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <label className="label">Available Specialties</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {availableSpecialties.map((specialty) => (
                        <button
                          key={specialty}
                          type="button"
                          onClick={() => toggleSpecialty(specialty)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedSpecialties.includes(specialty)
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {specialty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={18} />
                    {editingHospital ? 'Update Hospital' : 'Add Hospital'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
