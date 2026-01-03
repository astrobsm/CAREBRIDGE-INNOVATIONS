// Admissions Management Page
// Handles patient admissions with duration tracking, treatment plan linking, and risk assessments

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  BedDouble,
  Search,
  User,
  X,
  Save,
  Building2,
  Stethoscope,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  FileText,
  ArrowRight,
  Activity,
  UserCheck,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Admission, WardType, AdmissionStatus } from '../../../types';
import AdmissionDurationClock from '../components/AdmissionDurationClock';
import AdmissionRiskAssessments from '../components/AdmissionRiskAssessments';
import type { AdmissionRiskAssessments as AdmissionRiskData } from '../components/AdmissionRiskAssessments';
import { generateAdmissionPDFFromEntity } from '../../../utils/clinicalPdfGenerators';
import { PatientSelector } from '../../../components/patient';
import { usePatientMap } from '../../../services/patientHooks';

const admissionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  admittedFrom: z.enum(['emergency', 'outpatient', 'transfer', 'direct', 'referral']),
  wardType: z.enum(['general', 'private', 'semi-private', 'icu', 'hdu', 'pediatric', 'maternity', 'surgical', 'orthopedic', 'burns', 'isolation']),
  wardName: z.string().min(1, 'Ward name is required'),
  bedNumber: z.string().min(1, 'Bed number is required'),
  admissionDiagnosis: z.string().min(1, 'Admission diagnosis is required'),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  indicationForAdmission: z.string().min(1, 'Indication for admission is required'),
  severity: z.enum(['mild', 'moderate', 'severe', 'critical']),
  provisionalDiagnosis: z.string().optional(),
  comorbidities: z.string().optional(),
  allergies: z.string().optional(),
  primaryDoctor: z.string().optional(),
  primaryNurse: z.string().optional(),
  estimatedStayDays: z.number().min(1).optional(),
});

type AdmissionFormData = z.infer<typeof admissionSchema>;

const wardTypes: { value: WardType; label: string; icon: string }[] = [
  { value: 'general', label: 'General Ward', icon: '🏥' },
  { value: 'private', label: 'Private Ward', icon: '🛏️' },
  { value: 'semi-private', label: 'Semi-Private', icon: '🛌' },
  { value: 'icu', label: 'ICU', icon: '🚨' },
  { value: 'hdu', label: 'HDU', icon: '⚡' },
  { value: 'pediatric', label: 'Pediatric', icon: '👶' },
  { value: 'maternity', label: 'Maternity', icon: '🤰' },
  { value: 'surgical', label: 'Surgical', icon: '⚕️' },
  { value: 'orthopedic', label: 'Orthopedic', icon: '🦴' },
  { value: 'burns', label: 'Burns Unit', icon: '🔥' },
  { value: 'isolation', label: 'Isolation', icon: '🔒' },
];

const severityColors: Record<string, string> = {
  mild: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  severe: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusColors: Record<AdmissionStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  discharged: 'bg-blue-100 text-blue-700',
  transferred: 'bg-purple-100 text-purple-700',
  deceased: 'bg-gray-100 text-gray-700',
  absconded: 'bg-red-100 text-red-700',
};

type AdmissionStep = 'details' | 'assessments';

interface AdmissionsPageProps {
  embedded?: boolean;
}

export default function AdmissionsPage({ embedded = false }: AdmissionsPageProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | 'all'>('active');
  const [wardFilter, setWardFilter] = useState<WardType | 'all'>('all');
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  
  // Multi-step admission form state
  const [admissionStep, setAdmissionStep] = useState<AdmissionStep>('details');
  const [riskAssessments, setRiskAssessments] = useState<AdmissionRiskData>({});

  const admissions = useLiveQuery(
    () => db.admissions.orderBy('admissionDate').reverse().toArray(),
    []
  );
  const users = useLiveQuery(() => db.users.toArray(), []);

  // Use the new patient map hook for efficient lookups
  const patientMap = usePatientMap();

  const userMap = useMemo(() => {
    const map = new Map();
    users?.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  const doctors = useMemo(() => {
    return users?.filter(u => ['surgeon', 'anaesthetist'].includes(u.role)) || [];
  }, [users]);

  const nurses = useMemo(() => {
    return users?.filter(u => u.role === 'nurse') || [];
  }, [users]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      admittedFrom: 'emergency',
      wardType: 'general',
      severity: 'moderate',
      estimatedStayDays: 3,
    },
  });

  const selectedPatientId = watch('patientId');
  const selectedPatient = patientMap.get(selectedPatientId);

  const filteredAdmissions = useMemo(() => {
    if (!admissions) return [];
    return admissions.filter((admission) => {
      const patient = patientMap.get(admission.patientId);
      const matchesSearch = searchQuery === '' ||
        admission.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admission.wardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admission.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || admission.status === statusFilter;
      const matchesWard = wardFilter === 'all' || admission.wardType === wardFilter;
      return matchesSearch && matchesStatus && matchesWard;
    });
  }, [admissions, searchQuery, statusFilter, wardFilter, patientMap]);

  // Statistics
  const stats = useMemo(() => {
    if (!admissions) return { total: 0, active: 0, icu: 0, critical: 0 };
    
    const active = admissions.filter(a => a.status === 'active').length;
    const icu = admissions.filter(a => a.status === 'active' && (a.wardType === 'icu' || a.wardType === 'hdu')).length;
    const critical = admissions.filter(a => a.status === 'active' && a.severity === 'critical').length;
    
    return { total: admissions.length, active, icu, critical };
  }, [admissions]);

  const generateAdmissionNumber = () => {
    const date = new Date();
    const prefix = 'ADM';
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}${random}`;
  };

  const onSubmit = async (data: AdmissionFormData) => {
    if (!user) return;

    try {
      const admission: Admission = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        admissionNumber: generateAdmissionNumber(),
        admissionDate: new Date(),
        admissionTime: format(new Date(), 'HH:mm'),
        admittedFrom: data.admittedFrom,
        admittedBy: user.id,
        wardType: data.wardType,
        wardName: data.wardName,
        bedNumber: data.bedNumber,
        admissionDiagnosis: data.admissionDiagnosis,
        chiefComplaint: data.chiefComplaint,
        indicationForAdmission: data.indicationForAdmission,
        severity: data.severity,
        provisionalDiagnosis: data.provisionalDiagnosis ? data.provisionalDiagnosis.split(',').map(d => d.trim()) : [],
        comorbidities: data.comorbidities ? data.comorbidities.split(',').map(c => c.trim()) : [],
        allergies: data.allergies ? data.allergies.split(',').map(a => a.trim()) : [],
        primaryDoctor: data.primaryDoctor || user.id,
        primaryNurse: data.primaryNurse,
        estimatedStayDays: data.estimatedStayDays,
        status: 'active',
        // Include risk assessments data
        riskAssessments: riskAssessments.completedAt ? riskAssessments : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.admissions.add(admission);
      toast.success(`Patient admitted successfully! Admission #${admission.admissionNumber}`);
      setShowModal(false);
      setAdmissionStep('details');
      setRiskAssessments({});
      reset();
    } catch (error) {
      console.error('Error creating admission:', error);
      toast.error('Failed to admit patient');
    }
  };

  // Handle proceeding to risk assessments step
  const handleProceedToAssessments = () => {
    setAdmissionStep('assessments');
  };

  // Handle going back to details step
  const handleBackToDetails = () => {
    setAdmissionStep('details');
  };

  const handleDischarge = async (admission: Admission) => {
    try {
      await db.admissions.update(admission.id, {
        status: 'discharged',
        dischargeDate: new Date(),
        dischargeTime: format(new Date(), 'HH:mm'),
        dischargedBy: user?.id,
        dischargeType: 'routine',
        updatedAt: new Date(),
      });
      toast.success('Patient discharged successfully!');
      setShowDetailModal(false);
      setSelectedAdmission(null);
    } catch (error) {
      console.error('Error discharging patient:', error);
      toast.error('Failed to discharge patient');
    }
  };

  const openDetails = (admission: Admission) => {
    setSelectedAdmission(admission);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <BedDouble className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500" />
            Admissions
          </h1>
          <p className="page-subtitle">
            Manage patient admissions with real-time duration tracking
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus size={18} />
          New Admission
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card card-compact p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BedDouble className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              <p className="text-xs text-gray-600">Active Admissions</p>
            </div>
          </div>
        </div>
        <div className="card card-compact p-3 sm:p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Activity className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.icu}</p>
              <p className="text-xs text-gray-600">ICU/HDU</p>
            </div>
          </div>
        </div>
        <div className="card card-compact p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-yellow-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.critical}</p>
              <p className="text-xs text-gray-600">Critical Patients</p>
            </div>
          </div>
        </div>
        <div className="card card-compact p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-600">Total Records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient, admission #, ward, or bed..."
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdmissionStatus | 'all')}
          className="input w-full sm:w-40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="discharged">Discharged</option>
          <option value="transferred">Transferred</option>
        </select>
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value as WardType | 'all')}
          className="input w-full sm:w-40"
        >
          <option value="all">All Wards</option>
          {wardTypes.map(ward => (
            <option key={ward.value} value={ward.value}>{ward.label}</option>
          ))}
        </select>
      </div>

      {/* Admissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredAdmissions.map((admission) => {
          const patient = patientMap.get(admission.patientId);
          const doctor = userMap.get(admission.primaryDoctor);
          const nurse = userMap.get(admission.primaryNurse);

          return (
            <motion.div
              key={admission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openDetails(admission)}
            >
              {/* Header with Status */}
              <div className={`px-4 py-2 ${
                admission.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
              } text-white flex items-center justify-between`}>
                <span className="font-medium text-sm">{admission.admissionNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[admission.status]}`}>
                  {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
                </span>
              </div>

              <div className="p-4 space-y-3">
                {/* Patient Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {patient?.hospitalNumber} • {patient?.gender}, {patient?.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : '?'} yrs
                    </p>
                  </div>
                </div>

                {/* Duration Clock (for active admissions) */}
                {admission.status === 'active' && (
                  <AdmissionDurationClock
                    admissionDate={admission.admissionDate}
                    estimatedStayDays={admission.estimatedStayDays}
                    size="sm"
                  />
                )}

                {/* Ward & Bed Info */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{admission.wardName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BedDouble className="w-4 h-4 text-gray-400" />
                    <span>Bed {admission.bedNumber}</span>
                  </div>
                </div>

                {/* Diagnosis & Severity */}
                <div className="space-y-1">
                  <p className="text-sm text-gray-700 line-clamp-1">
                    <strong>Dx:</strong> {admission.admissionDiagnosis}
                  </p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${severityColors[admission.severity]}`}>
                    {admission.severity.charAt(0).toUpperCase() + admission.severity.slice(1)}
                  </span>
                </div>

                {/* Care Team */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {doctor && (
                    <div className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      <span>Dr. {doctor.lastName}</span>
                    </div>
                  )}
                  {nurse && (
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      <span>Nurse {nurse.firstName}</span>
                    </div>
                  )}
                </div>

                {/* Treatment Plan Link */}
                {admission.treatmentPlanId && (
                  <div className="pt-2 border-t">
                    <a
                      href={`/treatment-plans/${admission.treatmentPlanId}`}
                      className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ClipboardList className="w-4 h-4" />
                      View Treatment Plan
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredAdmissions.length === 0 && (
        <div className="text-center py-12">
          <BedDouble className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No admissions found</p>
        </div>
      )}

      {/* New Admission Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowModal(false); setAdmissionStep('details'); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-emerald-500" />
                    New Patient Admission
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className={`px-3 py-1 rounded-full ${admissionStep === 'details' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      1. Admission Details
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className={`px-3 py-1 rounded-full ${admissionStep === 'assessments' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      2. Risk Assessments
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setShowModal(false); setAdmissionStep('details'); }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Step 1: Admission Details Form */}
              {admissionStep === 'details' && (
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* Patient Selection */}
                <div>
                  <PatientSelector
                    value={watch('patientId')}
                    onChange={(patientId) => setValue('patientId', patientId || '')}
                    label="Select Patient"
                    required
                    error={errors.patientId?.message}
                  />
                </div>

                {/* Admission Source */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {['emergency', 'outpatient', 'transfer', 'direct', 'referral'].map((source) => (
                    <label
                      key={source}
                      className={`p-3 border rounded-lg cursor-pointer text-center text-sm transition-all ${
                        watch('admittedFrom') === source
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('admittedFrom')}
                        value={source}
                        className="sr-only"
                      />
                      {source.charAt(0).toUpperCase() + source.slice(1)}
                    </label>
                  ))}
                </div>

                {/* Ward & Bed */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Ward Type *</label>
                    <select {...register('wardType')} className="input">
                      {wardTypes.map((ward) => (
                        <option key={ward.value} value={ward.value}>
                          {ward.icon} {ward.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Ward Name *</label>
                    <input {...register('wardName')} placeholder="e.g., Ward A" className="input" />
                    {errors.wardName && <p className="text-red-500 text-sm mt-1">{errors.wardName.message}</p>}
                  </div>
                  <div>
                    <label className="label">Bed Number *</label>
                    <input {...register('bedNumber')} placeholder="e.g., B-12" className="input" />
                    {errors.bedNumber && <p className="text-red-500 text-sm mt-1">{errors.bedNumber.message}</p>}
                  </div>
                </div>

                {/* Clinical Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Clinical Information
                  </h3>
                  
                  <div>
                    <label className="label">Chief Complaint *</label>
                    <textarea {...register('chiefComplaint')} rows={2} className="input" placeholder="What brought the patient in..." />
                    {errors.chiefComplaint && <p className="text-red-500 text-sm mt-1">{errors.chiefComplaint.message}</p>}
                  </div>

                  <div>
                    <label className="label">Admission Diagnosis *</label>
                    <input {...register('admissionDiagnosis')} className="input" placeholder="Primary diagnosis" />
                    {errors.admissionDiagnosis && <p className="text-red-500 text-sm mt-1">{errors.admissionDiagnosis.message}</p>}
                  </div>

                  <div>
                    <label className="label">Indication for Admission *</label>
                    <textarea {...register('indicationForAdmission')} rows={2} className="input" placeholder="Why does the patient need to be admitted..." />
                    {errors.indicationForAdmission && <p className="text-red-500 text-sm mt-1">{errors.indicationForAdmission.message}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Severity *</label>
                      <select {...register('severity')} className="input">
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Estimated Stay (days)</label>
                      <input
                        type="number"
                        {...register('estimatedStayDays', { valueAsNumber: true })}
                        className="input"
                        min={1}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Provisional Diagnoses (comma-separated)</label>
                    <input {...register('provisionalDiagnosis')} className="input" placeholder="e.g., Appendicitis, Peritonitis" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Comorbidities (comma-separated)</label>
                      <input {...register('comorbidities')} className="input" placeholder="e.g., Diabetes, Hypertension" />
                    </div>
                    <div>
                      <label className="label">Allergies (comma-separated)</label>
                      <input {...register('allergies')} className="input" placeholder="e.g., Penicillin, NSAIDs" />
                    </div>
                  </div>
                </div>

                {/* Care Team Assignment */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Care Team Assignment
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Primary Doctor</label>
                      <select {...register('primaryDoctor')} className="input">
                        <option value="">Select doctor...</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.firstName} {doc.lastName} ({doc.specialization || doc.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Primary Nurse</label>
                      <select {...register('primaryNurse')} className="input">
                        <option value="">Select nurse...</option>
                        {nurses.map((nurse) => (
                          <option key={nurse.id} value={nurse.id}>
                            {nurse.firstName} {nurse.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Step 1 */}
                <div className="flex justify-between gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setAdmissionStep('details'); }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleProceedToAssessments}
                      disabled={!watch('patientId')}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Shield size={18} />
                      Proceed to Risk Assessments
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </form>
              )}

              {/* Step 2: Risk Assessments */}
              {admissionStep === 'assessments' && selectedPatient && (
                <div className="p-6 space-y-6">
                  {/* Patient Summary */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-emerald-900">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-sm text-emerald-700">
                          {selectedPatient.hospitalNumber} • {selectedPatient.gender} • {selectedPatient.dateOfBirth ? `${new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()} yrs` : 'Age unknown'}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-600">Ward: {watch('wardName')}</p>
                        <p className="text-gray-600">Bed: {watch('bedNumber')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessments Component */}
                  <AdmissionRiskAssessments
                    patientInfo={{
                      id: selectedPatient.id,
                      name: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
                      hospitalNumber: selectedPatient.hospitalNumber,
                      age: selectedPatient.dateOfBirth 
                        ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear() 
                        : 0,
                      gender: selectedPatient.gender as 'Male' | 'Female',
                    }}
                    onAssessmentsComplete={(assessments) => setRiskAssessments(assessments)}
                    initialAssessments={riskAssessments}
                  />

                  {/* Action Buttons - Step 2 */}
                  <div className="flex justify-between gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleBackToDetails}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <ArrowRight className="rotate-180" size={18} />
                      Back to Details
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save size={18} />
                      Complete Admission
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admission Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedAdmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`px-6 py-4 ${
                selectedAdmission.status === 'active' ? 'bg-emerald-500' : 'bg-gray-500'
              } text-white flex items-center justify-between rounded-t-2xl`}>
                <div>
                  <h2 className="text-xl font-semibold">Admission #{selectedAdmission.admissionNumber}</h2>
                  <p className="text-sm opacity-90">
                    Admitted: {format(new Date(selectedAdmission.admissionDate), 'PPp')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const patient = patientMap.get(selectedAdmission.patientId);
                      generateAdmissionPDFFromEntity(selectedAdmission, patient);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                    title="Export as PDF"
                  >
                    <FileText size={18} />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Duration Clock for Active Admissions */}
                {selectedAdmission.status === 'active' && (
                  <AdmissionDurationClock
                    admissionDate={selectedAdmission.admissionDate}
                    estimatedStayDays={selectedAdmission.estimatedStayDays}
                    size="lg"
                  />
                )}

                {/* Patient Info */}
                {patientMap.get(selectedAdmission.patientId) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Patient Information
                    </h3>
                    {(() => {
                      const patient = patientMap.get(selectedAdmission.patientId);
                      return (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Name:</span>
                            <span className="ml-2 font-medium">{patient?.firstName} {patient?.lastName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Hospital No:</span>
                            <span className="ml-2 font-medium">{patient?.hospitalNumber}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Gender:</span>
                            <span className="ml-2">{patient?.gender}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Blood Group:</span>
                            <span className="ml-2">{patient?.bloodGroup || 'Unknown'}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Clinical Details */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Clinical Details
                  </h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-start">
                      <span className="w-40 text-gray-500">Diagnosis:</span>
                      <span className="flex-1">{selectedAdmission.admissionDiagnosis}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-40 text-gray-500">Chief Complaint:</span>
                      <span className="flex-1">{selectedAdmission.chiefComplaint}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-40 text-gray-500">Indication:</span>
                      <span className="flex-1">{selectedAdmission.indicationForAdmission}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-40 text-gray-500">Severity:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${severityColors[selectedAdmission.severity]}`}>
                        {selectedAdmission.severity}
                      </span>
                    </div>
                    {selectedAdmission.comorbidities && selectedAdmission.comorbidities.length > 0 && (
                      <div className="flex items-start">
                        <span className="w-40 text-gray-500">Comorbidities:</span>
                        <span className="flex-1">{selectedAdmission.comorbidities.join(', ')}</span>
                      </div>
                    )}
                    {selectedAdmission.allergies && selectedAdmission.allergies.length > 0 && (
                      <div className="flex items-start">
                        <span className="w-40 text-gray-500">Allergies:</span>
                        <span className="flex-1 text-red-600">{selectedAdmission.allergies.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Location
                  </h3>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Ward:</span>
                      <span className="ml-2 font-medium">{selectedAdmission.wardName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Bed:</span>
                      <span className="ml-2 font-medium">{selectedAdmission.bedNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 capitalize">{selectedAdmission.wardType}</span>
                    </div>
                  </div>
                </div>

                {/* Care Team */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Care Team
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                      <Stethoscope className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-gray-500">Primary Doctor</p>
                        <p className="font-medium">
                          {userMap.get(selectedAdmission.primaryDoctor)
                            ? `Dr. ${userMap.get(selectedAdmission.primaryDoctor)?.firstName} ${userMap.get(selectedAdmission.primaryDoctor)?.lastName}`
                            : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Primary Nurse</p>
                        <p className="font-medium">
                          {userMap.get(selectedAdmission.primaryNurse || '')
                            ? `${userMap.get(selectedAdmission.primaryNurse || '')?.firstName} ${userMap.get(selectedAdmission.primaryNurse || '')?.lastName}`
                            : 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <button
                    onClick={() => window.location.href = `/treatment-plans/new?admissionId=${selectedAdmission.id}`}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <ClipboardList size={18} />
                    Create Treatment Plan
                  </button>
                  {selectedAdmission.status === 'active' && (
                    <button
                      onClick={() => handleDischarge(selectedAdmission)}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Discharge Patient
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
