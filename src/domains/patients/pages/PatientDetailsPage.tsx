import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Stethoscope,
  Activity,
  Scissors,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Heart,
  AlertTriangle,
  Droplet,
  BedDouble,
  X,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { format, differenceInYears } from 'date-fns';
import AdmissionDurationClock, { AdmissionDurationBadge } from '../../admissions/components/AdmissionDurationClock';
import { generateEncounterPDFFromEntity } from '../../../utils/clinicalPdfGenerators';
import { EntryTrackingBadge } from '../../../components/common';
import { syncRecord } from '../../../services/cloudSyncService';
import type { EntryTrackingInfo } from '../../../components/common';
import type { User as UserType, VitalSigns, ClinicalEncounter, Patient, BloodGroup, Genotype } from '../../../types';

// Blood groups and genotypes for select options
const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genotypes: Genotype[] = ['AA', 'AS', 'SS', 'AC', 'SC'];

// Edit Patient Modal Component
interface EditPatientModalProps {
  patient: Patient;
  onClose: () => void;
  onSave: (updates: Partial<Patient>) => Promise<void>;
}

function EditPatientModal({ patient, onClose, onSave }: EditPatientModalProps) {
  const getDateString = (date: Date | string) => {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    return format(new Date(date), 'yyyy-MM-dd');
  };

  const [formData, setFormData] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    middleName: patient.middleName || '',
    dateOfBirth: getDateString(patient.dateOfBirth),
    gender: patient.gender,
    bloodGroup: patient.bloodGroup || '',
    genotype: patient.genotype || '',
    maritalStatus: patient.maritalStatus,
    phone: patient.phone,
    alternatePhone: patient.alternatePhone || '',
    email: patient.email || '',
    address: patient.address || '',
    city: patient.city || '',
    state: patient.state || '',
    occupation: patient.occupation || '',
    religion: patient.religion || '',
    tribe: patient.tribe || '',
    nextOfKinName: patient.nextOfKin?.name || '',
    nextOfKinRelationship: patient.nextOfKin?.relationship || '',
    nextOfKinPhone: patient.nextOfKin?.phone || '',
    nextOfKinAddress: patient.nextOfKin?.address || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName || undefined,
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender as 'male' | 'female',
        bloodGroup: formData.bloodGroup as BloodGroup || undefined,
        genotype: formData.genotype as Genotype || undefined,
        maritalStatus: formData.maritalStatus as 'single' | 'married' | 'divorced' | 'widowed',
        phone: formData.phone,
        alternatePhone: formData.alternatePhone || undefined,
        email: formData.email || undefined,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        occupation: formData.occupation || undefined,
        religion: formData.religion || undefined,
        tribe: formData.tribe || undefined,
        nextOfKin: {
          name: formData.nextOfKinName,
          relationship: formData.nextOfKinRelationship,
          phone: formData.nextOfKinPhone,
          address: formData.nextOfKinAddress,
        },
        updatedAt: new Date(),
      });
      toast.success('Patient details updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Failed to update patient details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold">Edit Patient Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Personal Information */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="input"
                  required
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="label">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="input"
                  placeholder="Middle name"
                />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input"
                  required
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="label">Date of Birth *</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="input"
                  required
                  title="Select date of birth"
                />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                  className="input"
                  required
                  title="Select gender"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="label">Marital Status *</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as 'single' | 'married' | 'divorced' | 'widowed' })}
                  className="input"
                  required
                  title="Select marital status"
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="input"
                  title="Select blood group"
                >
                  <option value="">Select blood group</option>
                  {bloodGroups.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Genotype</label>
                <select
                  value={formData.genotype}
                  onChange={(e) => setFormData({ ...formData, genotype: e.target.value })}
                  className="input"
                  title="Select genotype"
                >
                  <option value="">Select genotype</option>
                  {genotypes.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  required
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>
              <div>
                <label className="label">Alternate Phone</label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="input"
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="patient@example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Address</h4>
            <div>
              <label className="label">Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                placeholder="Enter address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="input"
                  placeholder="State"
                />
              </div>
            </div>
          </div>

          {/* Other Details */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Other Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Occupation</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="input"
                  placeholder="Occupation"
                />
              </div>
              <div>
                <label className="label">Religion</label>
                <input
                  type="text"
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  className="input"
                  placeholder="Religion"
                />
              </div>
              <div>
                <label className="label">Tribe</label>
                <input
                  type="text"
                  value={formData.tribe}
                  onChange={(e) => setFormData({ ...formData, tribe: e.target.value })}
                  className="input"
                  placeholder="Tribe"
                />
              </div>
            </div>
          </div>

          {/* Next of Kin */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Next of Kin</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={formData.nextOfKinName}
                  onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                  className="input"
                  placeholder="Next of kin name"
                />
              </div>
              <div>
                <label className="label">Relationship</label>
                <input
                  type="text"
                  value={formData.nextOfKinRelationship}
                  onChange={(e) => setFormData({ ...formData, nextOfKinRelationship: e.target.value })}
                  className="input"
                  placeholder="e.g., Spouse, Parent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={formData.nextOfKinPhone}
                  onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                  className="input"
                  placeholder="+234 xxx xxx xxxx"
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  value={formData.nextOfKinAddress}
                  onChange={(e) => setFormData({ ...formData, nextOfKinAddress: e.target.value })}
                  className="input"
                  placeholder="Next of kin address"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const vitals = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const allVitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
      // Sort by recordedAt descending (newest first) and limit to 5
      return allVitals
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
        .slice(0, 5);
    },
    [patientId]
  );

  const encounters = useLiveQuery(
    () => patientId
      ? db.clinicalEncounters.where('patientId').equals(patientId).reverse().limit(5).toArray()
      : [],
    [patientId]
  );

  // Check if patient is currently admitted
  const activeAdmission = useLiveQuery(
    () => patientId
      ? db.admissions.where('patientId').equals(patientId).filter(a => a.status === 'active').first()
      : undefined,
    [patientId]
  );

  // Fetch users for entry tracking display
  const users = useLiveQuery(() => db.users.toArray(), []);
  
  // Create a map for quick user lookup
  const usersMap = useMemo(() => {
    const map = new Map<string, UserType>();
    if (users) {
      users.forEach(u => map.set(u.id!, u));
    }
    return map;
  }, [users]);

  // Helper to get entry tracking info for a vital sign
  const getVitalTracking = (vital: VitalSigns): EntryTrackingInfo | undefined => {
    const recordedByUser = usersMap.get(vital.recordedBy);
    if (recordedByUser) {
      return {
        userId: recordedByUser.id!,
        userName: `${recordedByUser.firstName} ${recordedByUser.lastName}`,
        userRole: recordedByUser.role,
        timestamp: vital.recordedAt,
      };
    }
    return undefined;
  };

  // Helper to get entry tracking info for an encounter
  const getEncounterTracking = (encounter: ClinicalEncounter): EntryTrackingInfo | undefined => {
    const clinicianUser = usersMap.get(encounter.attendingClinician);
    if (clinicianUser) {
      return {
        userId: clinicianUser.id!,
        userName: `${clinicianUser.firstName} ${clinicianUser.lastName}`,
        userRole: clinicianUser.role,
        timestamp: encounter.createdAt,
      };
    }
    return undefined;
  };

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading patient details...</p>
      </div>
    );
  }

  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Patients
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/patients/${patientId}/vitals`} className="btn btn-secondary">
            <Activity size={18} />
            Record Vitals
          </Link>
          <Link to={`/patients/${patientId}/encounter`} className="btn btn-primary">
            <Stethoscope size={18} />
            Start Encounter
          </Link>
        </div>
      </div>

      {/* Patient Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.firstName} {patient.middleName || ''} {patient.lastName}
                </h1>
                <span className={`badge ${patient.gender === 'male' ? 'badge-info' : 'badge-primary'}`}>
                  {patient.gender}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText size={16} className="text-gray-400" />
                  <span className="font-mono">{patient.hospitalNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{age} years ({format(new Date(patient.dateOfBirth), 'MMM d, yyyy')})</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} className="text-gray-400" />
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col gap-4">
              {/* Admission Status Badge */}
              {activeAdmission && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BedDouble className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Currently Admitted</span>
                  </div>
                  <p className="text-xs text-emerald-600 mb-2">
                    {activeAdmission.wardName} • Bed {activeAdmission.bedNumber}
                  </p>
                  <AdmissionDurationBadge admissionDate={activeAdmission.admissionDate} />
                </div>
              )}
              
              <div className="flex gap-4">
                {patient.bloodGroup && (
                  <div className="text-center p-3 bg-red-50 rounded-xl">
                    <Droplet className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-700">{patient.bloodGroup}</p>
                    <p className="text-xs text-red-500">Blood</p>
                  </div>
                )}
                {patient.genotype && (
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <Heart className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-purple-700">{patient.genotype}</p>
                    <p className="text-xs text-purple-500">Genotype</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active Admission Section with Full Duration Clock */}
      {activeAdmission && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
        >
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <BedDouble className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Currently Admitted</h2>
                    <p className="text-sm text-gray-600">Admission #{activeAdmission.admissionNumber}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Ward:</span>
                    <p className="font-medium">{activeAdmission.wardName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Bed:</span>
                    <p className="font-medium">{activeAdmission.bedNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Diagnosis:</span>
                    <p className="font-medium truncate">{activeAdmission.admissionDiagnosis}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Severity:</span>
                    <p className={`font-medium capitalize ${
                      activeAdmission.severity === 'critical' ? 'text-red-600' :
                      activeAdmission.severity === 'severe' ? 'text-orange-600' :
                      activeAdmission.severity === 'moderate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>{activeAdmission.severity}</p>
                  </div>
                </div>
              </div>
              
              <div className="md:w-72">
                <AdmissionDurationClock
                  admissionDate={activeAdmission.admissionDate}
                  estimatedStayDays={activeAdmission.estimatedStayDays}
                  size="md"
                />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-200 flex flex-wrap gap-3">
              <Link
                to={`/admissions`}
                className="btn btn-secondary text-sm"
              >
                View Admission Details
              </Link>
              {activeAdmission.treatmentPlanId && (
                <Link
                  to={`/treatment-plans/new?patientId=${patientId}`}
                  className="btn btn-primary text-sm"
                >
                  View Treatment Plan
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Allergies & Conditions */}
          {(patient.allergies.length > 0 || patient.chronicConditions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Medical Alerts</h2>
              </div>
              <div className="card-body space-y-4">
                {patient.allergies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, index) => (
                        <span key={index} className="badge badge-danger">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {patient.chronicConditions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.chronicConditions.map((condition, index) => (
                        <span key={index} className="badge badge-warning">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Recent Vitals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-900">Recent Vital Signs</h2>
              </div>
              <Link to={`/patients/${patientId}/vitals`} className="text-sm text-sky-600 hover:text-sky-700">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              {vitals && vitals.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Temp</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">BP</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pulse</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SpO2</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vitals.map((vital) => (
                      <tr key={vital.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {format(new Date(vital.recordedAt), 'MMM d, h:mm a')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vital.temperature}°C</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vital.pulse} bpm</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vital.oxygenSaturation}%</td>
                        <td className="px-4 py-3 text-sm">
                          {getVitalTracking(vital) ? (
                            <EntryTrackingBadge 
                              tracking={getVitalTracking(vital)!} 
                              mode="compact" 
                              showTimestamp={false}
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No vital signs recorded yet</p>
                  <Link to={`/patients/${patientId}/vitals`} className="text-sky-600 text-sm hover:underline mt-1 inline-block">
                    Record first vitals
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Encounters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-sky-500" />
                <h2 className="font-semibold text-gray-900">Recent Encounters</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {encounters && encounters.length > 0 ? (
                encounters.map((encounter) => (
                  <div key={encounter.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 capitalize">
                          {encounter.type.replace('_', ' ')} Visit
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {encounter.chiefComplaint}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(encounter.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                        {/* Entry Tracking Badge */}
                        {getEncounterTracking(encounter) && (
                          <div className="mt-2">
                            <EntryTrackingBadge 
                              tracking={getEncounterTracking(encounter)!} 
                              mode="compact"
                              showTimestamp={false}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generateEncounterPDFFromEntity(encounter, patient)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Export as PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <span className={`badge ${
                          encounter.status === 'completed' ? 'badge-success' :
                          encounter.status === 'in-progress' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {encounter.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No encounters recorded yet</p>
                  <Link to={`/patients/${patientId}/encounter`} className="text-sky-600 text-sm hover:underline mt-1 inline-block">
                    Start first encounter
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-header flex items-center gap-3">
              <User className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-gray-900">Personal Details</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin size={16} className="text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-900">
                    {patient.address}, {patient.city}, {patient.state}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Marital Status</p>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{patient.maritalStatus}</p>
                </div>
                {patient.occupation && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Occupation</p>
                    <p className="text-sm text-gray-900 mt-1">{patient.occupation}</p>
                  </div>
                )}
                {patient.religion && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Religion</p>
                    <p className="text-sm text-gray-900 mt-1">{patient.religion}</p>
                  </div>
                )}
                {patient.tribe && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Tribe</p>
                    <p className="text-sm text-gray-900 mt-1">{patient.tribe}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Next of Kin */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-header flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-gray-900">Next of Kin</h2>
            </div>
            <div className="card-body space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Name</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Relationship</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.relationship}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.address}</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/surgery/planning/${patientId}`}
                className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Scissors className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Schedule Surgery</span>
              </Link>
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Edit Patient</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      <AnimatePresence>
        {showEditModal && patient && (
          <EditPatientModal
            patient={patient}
            onClose={() => setShowEditModal(false)}
            onSave={async (updates) => {
              await db.patients.update(patient.id, updates as unknown as Record<string, unknown>);
              // Sync to cloud
              const updatedPatient = await db.patients.get(patient.id);
              if (updatedPatient) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await syncRecord('patients', updatedPatient as any);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
