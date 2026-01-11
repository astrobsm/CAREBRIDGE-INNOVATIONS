// Ward Rounds Management Page
// Handles ward rounds scheduling, doctor/nurse patient assignments

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, Controller } from 'react-hook-form';
import { HospitalSelector } from '../../../components/hospital';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Clipboard,
  Search,
  X,
  Save,
  Users,
  Stethoscope,
  UserCheck,
  Calendar,
  Play,
  CheckCircle,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import type { 
  WardRound, 
  DoctorPatientAssignment, 
  NursePatientAssignment,
} from '../../../types';

// Schemas
const wardRoundSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital is required'),
  wardName: z.string().min(1, 'Ward is required'),
  roundDate: z.string().min(1, 'Date is required'),
  roundTime: z.string().min(1, 'Time is required'),
  roundType: z.enum(['morning', 'evening', 'night', 'consultant', 'teaching', 'emergency']),
  leadDoctorId: z.string().min(1, 'Lead doctor is required'),
  leadDoctorDesignation: z.enum(['consultant', 'senior_registrar', 'registrar', 'resident', 'house_officer']),
  teamMemberIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const leaderDesignations = [
  { value: 'consultant', label: 'Consultant', color: 'bg-purple-100 text-purple-800' },
  { value: 'senior_registrar', label: 'Senior Registrar', color: 'bg-blue-100 text-blue-800' },
  { value: 'registrar', label: 'Registrar', color: 'bg-sky-100 text-sky-800' },
  { value: 'resident', label: 'Resident Doctor', color: 'bg-teal-100 text-teal-800' },
  { value: 'house_officer', label: 'House Officer', color: 'bg-green-100 text-green-800' },
];

const doctorAssignmentSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  patientId: z.string().min(1, 'Patient is required'),
  assignmentType: z.enum(['primary', 'consultant', 'covering', 'on_call']),
  priority: z.enum(['routine', 'high', 'urgent', 'critical']),
  notes: z.string().optional(),
});

const nurseAssignmentSchema = z.object({
  hospitalId: z.string().min(1, 'Hospital is required'),
  nurseId: z.string().min(1, 'Nurse is required'),
  patientId: z.string().min(1, 'Patient is required'),
  shiftType: z.enum(['morning', 'afternoon', 'night']),
  careLevel: z.enum(['routine', 'intermediate', 'intensive', 'critical']),
  notes: z.string().optional(),
});

type WardRoundFormData = z.infer<typeof wardRoundSchema>;
type DoctorAssignmentFormData = z.infer<typeof doctorAssignmentSchema>;
type NurseAssignmentFormData = z.infer<typeof nurseAssignmentSchema>;

const roundTypes = [
  { value: 'morning', label: 'Morning Round', icon: '🌅', color: 'bg-amber-100 text-amber-800' },
  { value: 'evening', label: 'Evening Round', icon: '🌆', color: 'bg-orange-100 text-orange-800' },
  { value: 'night', label: 'Night Round', icon: '🌙', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'consultant', label: 'Consultant Round', icon: '👨‍⚕️', color: 'bg-sky-100 text-sky-800' },
  { value: 'teaching', label: 'Teaching Round', icon: '📚', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'emergency', label: 'Emergency Round', icon: '🚨', color: 'bg-red-100 text-red-800' },
];

const assignmentTypes = [
  { value: 'primary', label: 'Primary Care', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'consultant', label: 'Consultant', color: 'bg-sky-100 text-sky-800' },
  { value: 'covering', label: 'Covering', color: 'bg-amber-100 text-amber-800' },
  { value: 'on_call', label: 'On Call', color: 'bg-purple-100 text-purple-800' },
];

const careLevels = [
  { value: 'routine', label: 'Routine', color: 'bg-green-100 text-green-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'intensive', label: 'Intensive', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const shifts = [
  { value: 'morning', label: 'Morning (7AM-2PM)', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon (2PM-9PM)', icon: '🌤️' },
  { value: 'night', label: 'Night (9PM-7AM)', icon: '🌙' },
];

export default function WardRoundsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rounds' | 'doctor_assignments' | 'nurse_assignments'>('rounds');
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [showDoctorAssignModal, setShowDoctorAssignModal] = useState(false);
  const [showNurseAssignModal, setShowNurseAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [, setSelectedRound] = useState<WardRound | null>(null);

  // Fetch data
  const hospitals = useLiveQuery(() => db.hospitals.where('isActive').equals(1).toArray(), []);
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const admissions = useLiveQuery(() => db.admissions.where('status').equals('active').toArray(), []);
  const users = useLiveQuery(() => db.users.where('isActive').equals(1).toArray(), []);
  const wardRounds = useLiveQuery(() => db.wardRounds.orderBy('roundDate').reverse().toArray(), []);
  const doctorAssignments = useLiveQuery(() => db.doctorAssignments.where('status').equals('active').toArray(), []);
  const nurseAssignments = useLiveQuery(() => db.nurseAssignments.where('status').equals('active').toArray(), []);

  // Get doctors and nurses
  const doctors = useMemo(() => 
    users?.filter(u => ['surgeon', 'anaesthetist'].includes(u.role)) || [],
    [users]
  );
  const nurses = useMemo(() => 
    users?.filter(u => u.role === 'nurse') || [],
    [users]
  );

  // Get admitted patients
  const admittedPatients = useMemo(() => {
    if (!patients || !admissions) return [];
    const admissionMap = new Map(admissions.map(a => [a.patientId, a]));
    return patients.filter(p => admissionMap.has(p.id)).map(p => ({
      ...p,
      admission: admissionMap.get(p.id),
    }));
  }, [patients, admissions]);

  // Filter based on search and hospital
  const filteredRounds = useMemo(() => {
    if (!wardRounds) return [];
    return wardRounds.filter(r => {
      const matchesHospital = selectedHospital === 'all' || r.hospitalId === selectedHospital;
      const matchesSearch = r.wardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.leadDoctorName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesHospital && matchesSearch;
    });
  }, [wardRounds, selectedHospital, searchQuery]);

  const filteredDoctorAssignments = useMemo(() => {
    if (!doctorAssignments) return [];
    return doctorAssignments.filter(a => {
      const matchesHospital = selectedHospital === 'all' || a.hospitalId === selectedHospital;
      const matchesSearch = a.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           a.patientName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesHospital && matchesSearch;
    });
  }, [doctorAssignments, selectedHospital, searchQuery]);

  const filteredNurseAssignments = useMemo(() => {
    if (!nurseAssignments) return [];
    return nurseAssignments.filter(a => {
      const matchesHospital = selectedHospital === 'all' || a.hospitalId === selectedHospital;
      const matchesSearch = a.nurseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           a.patientName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesHospital && matchesSearch;
    });
  }, [nurseAssignments, selectedHospital, searchQuery]);

  // Form for ward rounds
  const roundForm = useForm<WardRoundFormData>({
    resolver: zodResolver(wardRoundSchema),
    defaultValues: {
      roundType: 'morning',
      leadDoctorDesignation: 'consultant',
      teamMemberIds: [],
    },
  });
  
  // Watch selected hospital to display details
  const selectedHospitalId = roundForm.watch('hospitalId');
  const selectedHospitalDetails = useMemo(() => {
    if (!selectedHospitalId || !hospitals) return null;
    return hospitals.find(h => h.id === selectedHospitalId) || null;
  }, [selectedHospitalId, hospitals]);
  
  // Watch selected team members
  const selectedTeamMemberIds = roundForm.watch('teamMemberIds') || [];

  const doctorAssignForm = useForm<DoctorAssignmentFormData>({
    resolver: zodResolver(doctorAssignmentSchema),
    defaultValues: {
      assignmentType: 'primary',
      priority: 'routine',
    },
  });

  const nurseAssignForm = useForm<NurseAssignmentFormData>({
    resolver: zodResolver(nurseAssignmentSchema),
    defaultValues: {
      shiftType: 'morning',
      careLevel: 'routine',
    },
  });

  // Handle creating ward round
  const handleCreateRound = async (data: WardRoundFormData) => {
    try {
      const leadDoctor = doctors.find(d => d.id === data.leadDoctorId);
      const hospital = hospitals?.find(h => h.id === data.hospitalId);
      
      // Build team members from selected IDs
      const teamMembersList = (data.teamMemberIds || []).map(userId => {
        const user = users?.find(u => u.id === userId);
        return {
          userId,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          role: user?.role || 'nurse' as const,
          specialty: user?.specialization,
          isPresent: false,
        };
      });
      
      const newRound: WardRound = {
        id: uuidv4(),
        hospitalId: data.hospitalId,
        wardName: data.wardName,
        roundDate: new Date(data.roundDate),
        roundTime: data.roundTime,
        roundType: data.roundType,
        status: 'scheduled',
        leadDoctorId: data.leadDoctorId,
        leadDoctorName: `${leadDoctor?.firstName} ${leadDoctor?.lastName}`,
        leadDoctorDesignation: data.leadDoctorDesignation,
        teamMembers: teamMembersList,
        patients: admittedPatients
          .filter(p => p.admission?.wardName === data.wardName)
          .map(p => ({
            patientId: p.id,
            patientName: `${p.firstName} ${p.lastName}`,
            hospitalNumber: p.hospitalNumber,
            bedNumber: p.admission?.bedNumber || '',
            diagnosis: p.admission?.admissionDiagnosis || '',
            status: 'pending',
          })),
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.wardRounds.add(newRound);
      syncRecord('wardRounds', newRound as unknown as Record<string, unknown>);
      toast.success(`Ward round scheduled for ${hospital?.name}`);
      setShowRoundModal(false);
      roundForm.reset();
    } catch (error) {
      console.error('Error creating ward round:', error);
      toast.error('Failed to schedule ward round');
    }
  };

  // Handle doctor assignment
  const handleDoctorAssignment = async (data: DoctorAssignmentFormData) => {
    try {
      const doctor = doctors.find(d => d.id === data.doctorId);
      const patient = patients?.find(p => p.id === data.patientId);
      const admission = admissions?.find(a => a.patientId === data.patientId);

      const assignment: DoctorPatientAssignment = {
        id: uuidv4(),
        hospitalId: data.hospitalId,
        doctorId: data.doctorId,
        doctorName: `${doctor?.firstName} ${doctor?.lastName}`,
        doctorSpecialty: doctor?.specialization,
        patientId: data.patientId,
        patientName: `${patient?.firstName} ${patient?.lastName}`,
        hospitalNumber: patient?.hospitalNumber || '',
        wardName: admission?.wardName,
        bedNumber: admission?.bedNumber,
        assignmentType: data.assignmentType,
        priority: data.priority,
        status: 'active',
        notes: data.notes,
        assignedBy: user?.id || '',
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.doctorAssignments.add(assignment);
      syncRecord('doctorAssignments', assignment as unknown as Record<string, unknown>);
      toast.success('Doctor assigned to patient');
      setShowDoctorAssignModal(false);
      doctorAssignForm.reset();
    } catch (error) {
      console.error('Error assigning doctor:', error);
      toast.error('Failed to assign doctor');
    }
  };

  // Handle nurse assignment
  const handleNurseAssignment = async (data: NurseAssignmentFormData) => {
    try {
      const nurse = nurses.find(n => n.id === data.nurseId);
      const patient = patients?.find(p => p.id === data.patientId);
      const admission = admissions?.find(a => a.patientId === data.patientId);

      const assignment: NursePatientAssignment = {
        id: uuidv4(),
        hospitalId: data.hospitalId,
        nurseId: data.nurseId,
        nurseName: `${nurse?.firstName} ${nurse?.lastName}`,
        nurseSpecialty: nurse?.specialization,
        patientId: data.patientId,
        patientName: `${patient?.firstName} ${patient?.lastName}`,
        hospitalNumber: patient?.hospitalNumber || '',
        wardName: admission?.wardName,
        bedNumber: admission?.bedNumber,
        shiftType: data.shiftType,
        assignmentDate: new Date(),
        status: 'active',
        careLevel: data.careLevel,
        notes: data.notes,
        assignedBy: user?.id || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.nurseAssignments.add(assignment);
      syncRecord('nurseAssignments', assignment as unknown as Record<string, unknown>);
      toast.success('Nurse assigned to patient');
      setShowNurseAssignModal(false);
      nurseAssignForm.reset();
    } catch (error) {
      console.error('Error assigning nurse:', error);
      toast.error('Failed to assign nurse');
    }
  };

  // Start ward round
  const handleStartRound = async (round: WardRound) => {
    try {
      await db.wardRounds.update(round.id, {
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success('Ward round started');
    } catch (error) {
      toast.error('Failed to start ward round');
    }
  };

  // Complete ward round
  const handleCompleteRound = async (round: WardRound) => {
    try {
      await db.wardRounds.update(round.id, {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success('Ward round completed');
    } catch (error) {
      toast.error('Failed to complete ward round');
    }
  };

  // Get date label
  const getDateLabel = (date: Date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isPast(d)) return 'Past';
    return format(d, 'MMM d');
  };

  // Get unique wards from admissions
  const wards = useMemo(() => {
    if (!admissions) return [];
    return [...new Set(admissions.map(a => a.wardName))].filter(Boolean);
  }, [admissions]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Clipboard className="w-8 h-8 text-sky-500" />
            Ward Rounds & Assignments
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Manage ward rounds, doctor and nurse patient assignments
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'rounds' && (
            <button onClick={() => setShowRoundModal(true)} className="btn btn-primary w-full sm:w-auto">
              <Plus size={18} />
              Schedule Round
            </button>
          )}
          {activeTab === 'doctor_assignments' && (
            <button onClick={() => setShowDoctorAssignModal(true)} className="btn btn-primary w-full sm:w-auto">
              <UserPlus size={18} />
              Assign Doctor
            </button>
          )}
          {activeTab === 'nurse_assignments' && (
            <button onClick={() => setShowNurseAssignModal(true)} className="btn btn-primary w-full sm:w-auto">
              <UserPlus size={18} />
              Assign Nurse
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('rounds')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'rounds'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clipboard size={18} />
            Ward Rounds
          </div>
        </button>
        <button
          onClick={() => setActiveTab('doctor_assignments')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'doctor_assignments'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Stethoscope size={18} />
            Doctor Assignments
          </div>
        </button>
        <button
          onClick={() => setActiveTab('nurse_assignments')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'nurse_assignments'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck size={18} />
            Nurse Assignments
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="input w-full sm:w-64"
        >
          <option value="all">All Hospitals</option>
          {hospitals?.map((hospital) => (
            <option key={hospital.id} value={hospital.id}>
              {hospital.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'rounds' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRounds.length > 0 ? (
            filteredRounds.map((round) => {
              const roundTypeInfo = roundTypes.find(t => t.value === round.roundType);
              const hospital = hospitals?.find(h => h.id === round.hospitalId);
              
              return (
                <motion.div
                  key={round.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{roundTypeInfo?.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{round.wardName}</h3>
                          <p className="text-sm text-gray-500">{hospital?.name}</p>
                        </div>
                      </div>
                      <span className={`badge ${
                        round.status === 'scheduled' ? 'badge-info' :
                        round.status === 'in_progress' ? 'badge-warning' :
                        round.status === 'completed' ? 'badge-success' : 'badge-secondary'
                      }`}>
                        {round.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span className="font-medium">{getDateLabel(round.roundDate)}</span>
                        <span>at {round.roundTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope size={14} />
                        <span>Lead: {round.leadDoctorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        <span>{round.patients.length} patients</span>
                      </div>
                    </div>

                    <div className={`mt-3 px-2 py-1 rounded text-xs ${roundTypeInfo?.color}`}>
                      {roundTypeInfo?.label}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      {round.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartRound(round)}
                          className="btn btn-sm btn-primary flex-1"
                        >
                          <Play size={14} />
                          Start Round
                        </button>
                      )}
                      {round.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteRound(round)}
                          className="btn btn-sm btn-success flex-1"
                        >
                          <CheckCircle size={14} />
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRound(round)}
                        className="btn btn-sm btn-secondary"
                      >
                        <ChevronRight size={14} />
                        View
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full card p-12 text-center">
              <Clipboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No ward rounds found</p>
              <p className="text-sm text-gray-400 mt-1">Schedule a new ward round to get started</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'doctor_assignments' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward/Bed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDoctorAssignments.length > 0 ? (
                  filteredDoctorAssignments.map((assignment) => {
                    const typeInfo = assignmentTypes.find(t => t.value === assignment.assignmentType);
                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                              <Stethoscope className="w-4 h-4 text-sky-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{assignment.doctorName}</p>
                              <p className="text-xs text-gray-500">{assignment.doctorSpecialty}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{assignment.patientName}</p>
                            <p className="text-xs text-gray-500">{assignment.hospitalNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {assignment.wardName} - Bed {assignment.bedNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${typeInfo?.color}`}>
                            {typeInfo?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            assignment.priority === 'critical' ? 'badge-danger' :
                            assignment.priority === 'urgent' ? 'badge-warning' :
                            assignment.priority === 'high' ? 'badge-info' : 'badge-secondary'
                          }`}>
                            {assignment.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            assignment.status === 'active' ? 'badge-success' : 'badge-secondary'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No doctor assignments found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'nurse_assignments' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nurse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward/Bed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Care Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredNurseAssignments.length > 0 ? (
                  filteredNurseAssignments.map((assignment) => {
                    const shiftInfo = shifts.find(s => s.value === assignment.shiftType);
                    const careInfo = careLevels.find(c => c.value === assignment.careLevel);
                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{assignment.nurseName}</p>
                              <p className="text-xs text-gray-500">{assignment.nurseSpecialty}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{assignment.patientName}</p>
                            <p className="text-xs text-gray-500">{assignment.hospitalNumber}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {assignment.wardName} - Bed {assignment.bedNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1">
                            <span>{shiftInfo?.icon}</span>
                            <span className="text-sm">{shiftInfo?.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${careInfo?.color}`}>
                            {careInfo?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            assignment.status === 'active' ? 'badge-success' : 'badge-secondary'
                          }`}>
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No nurse assignments found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ward Round Modal */}
      <AnimatePresence>
        {showRoundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRoundModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Schedule Ward Round</h2>
                <button onClick={() => setShowRoundModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={roundForm.handleSubmit(handleCreateRound)} className="p-6 space-y-4">
                {/* Hospital Selection */}
                <div>
                  <label className="label">Hospital *</label>
                  <Controller
                    name="hospitalId"
                    control={roundForm.control}
                    render={({ field }) => (
                      <HospitalSelector
                        value={field.value}
                        onChange={(hospitalId) => field.onChange(hospitalId || '')}
                        placeholder="Search hospital..."
                        showAddNew={true}
                      />
                    )}
                  />
                  {roundForm.formState.errors.hospitalId && (
                    <p className="text-sm text-red-500 mt-1">{roundForm.formState.errors.hospitalId.message}</p>
                  )}
                </div>
                
                {/* Hospital Details Card */}
                {selectedHospitalDetails && (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                    <h4 className="font-medium text-sky-900 mb-2 flex items-center gap-2">
                      <Clipboard size={16} />
                      Hospital Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="font-medium">{selectedHospitalDetails.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <p className="font-medium capitalize">{selectedHospitalDetails.type?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Address:</span>
                        <p className="font-medium">{selectedHospitalDetails.address}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <p className="font-medium">{selectedHospitalDetails.phone}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Ward</label>
                  <select {...roundForm.register('wardName')} className="input">
                    <option value="">Select ward</option>
                    {wards.map((ward) => (
                      <option key={ward} value={ward}>{ward}</option>
                    ))}
                  </select>
                  {roundForm.formState.errors.wardName && (
                    <p className="text-sm text-red-500 mt-1">{roundForm.formState.errors.wardName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" {...roundForm.register('roundDate')} className="input" />
                    {roundForm.formState.errors.roundDate && (
                      <p className="text-sm text-red-500 mt-1">{roundForm.formState.errors.roundDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Time</label>
                    <input type="time" {...roundForm.register('roundTime')} className="input" />
                    {roundForm.formState.errors.roundTime && (
                      <p className="text-sm text-red-500 mt-1">{roundForm.formState.errors.roundTime.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Round Type</label>
                  <select {...roundForm.register('roundType')} className="input">
                    {roundTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Lead Doctor & Designation */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
                  <h4 className="font-medium text-purple-900 flex items-center gap-2">
                    <Stethoscope size={16} />
                    Round Leader
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Lead Doctor *</label>
                      <select {...roundForm.register('leadDoctorId')} className="input">
                        <option value="">Select lead doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.firstName} {doctor.lastName}
                          </option>
                        ))}
                      </select>
                      {roundForm.formState.errors.leadDoctorId && (
                        <p className="text-sm text-red-500 mt-1">{roundForm.formState.errors.leadDoctorId.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Designation *</label>
                      <select {...roundForm.register('leadDoctorDesignation')} className="input">
                        {leaderDesignations.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Team Members Selection */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <h4 className="font-medium text-emerald-900 mb-3 flex items-center gap-2">
                    <Users size={16} />
                    Team Members (Optional)
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="label text-xs">Doctors</label>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {doctors.filter(d => d.id !== roundForm.watch('leadDoctorId')).map((doctor) => (
                          <label key={doctor.id} className="flex items-center gap-1 px-2 py-1 bg-white border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedTeamMemberIds.includes(doctor.id)}
                              onChange={(e) => {
                                const current = selectedTeamMemberIds;
                                if (e.target.checked) {
                                  roundForm.setValue('teamMemberIds', [...current, doctor.id]);
                                } else {
                                  roundForm.setValue('teamMemberIds', current.filter(id => id !== doctor.id));
                                }
                              }}
                              className="rounded text-emerald-600"
                            />
                            <span className="text-xs">{doctor.firstName} {doctor.lastName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Nurses</label>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {nurses.map((nurse) => (
                          <label key={nurse.id} className="flex items-center gap-1 px-2 py-1 bg-white border rounded cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedTeamMemberIds.includes(nurse.id)}
                              onChange={(e) => {
                                const current = selectedTeamMemberIds;
                                if (e.target.checked) {
                                  roundForm.setValue('teamMemberIds', [...current, nurse.id]);
                                } else {
                                  roundForm.setValue('teamMemberIds', current.filter(id => id !== nurse.id));
                                }
                              }}
                              className="rounded text-emerald-600"
                            />
                            <span className="text-xs">{nurse.firstName} {nurse.lastName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {selectedTeamMemberIds.length > 0 && (
                      <p className="text-xs text-emerald-700">
                        {selectedTeamMemberIds.length} team member(s) selected
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea {...roundForm.register('notes')} className="input" rows={3} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowRoundModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    <Save size={18} />
                    Schedule Round
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doctor Assignment Modal */}
      <AnimatePresence>
        {showDoctorAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowDoctorAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Assign Doctor to Patient</h2>
                <button onClick={() => setShowDoctorAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={doctorAssignForm.handleSubmit(handleDoctorAssignment)} className="p-6 space-y-4">
                <div>
                  <label className="label">Hospital</label>
                  <Controller
                    name="hospitalId"
                    control={doctorAssignForm.control}
                    render={({ field }) => (
                      <HospitalSelector
                        value={field.value}
                        onChange={(hospitalId) => field.onChange(hospitalId || '')}
                        placeholder="Search hospital..."
                        showAddNew={true}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="label">Doctor</label>
                  <select {...doctorAssignForm.register('doctorId')} className="input">
                    <option value="">Select doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.firstName} {doctor.lastName} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Patient</label>
                  <select {...doctorAssignForm.register('patientId')} className="input">
                    <option value="">Select patient</option>
                    {admittedPatients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName} - {patient.hospitalNumber} ({patient.admission?.wardName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Assignment Type</label>
                    <select {...doctorAssignForm.register('assignmentType')} className="input">
                      {assignmentTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select {...doctorAssignForm.register('priority')} className="input">
                      <option value="routine">Routine</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea {...doctorAssignForm.register('notes')} className="input" rows={2} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowDoctorAssignModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    <UserPlus size={18} />
                    Assign Doctor
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nurse Assignment Modal */}
      <AnimatePresence>
        {showNurseAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowNurseAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Assign Nurse to Patient</h2>
                <button onClick={() => setShowNurseAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={nurseAssignForm.handleSubmit(handleNurseAssignment)} className="p-6 space-y-4">
                <div>
                  <label className="label">Hospital</label>
                  <Controller
                    name="hospitalId"
                    control={nurseAssignForm.control}
                    render={({ field }) => (
                      <HospitalSelector
                        value={field.value}
                        onChange={(hospitalId) => field.onChange(hospitalId || '')}
                        placeholder="Search hospital..."
                        showAddNew={true}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="label">Nurse</label>
                  <select {...nurseAssignForm.register('nurseId')} className="input">
                    <option value="">Select nurse</option>
                    {nurses.map((nurse) => (
                      <option key={nurse.id} value={nurse.id}>
                        {nurse.firstName} {nurse.lastName} - {nurse.specialization || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Patient</label>
                  <select {...nurseAssignForm.register('patientId')} className="input">
                    <option value="">Select patient</option>
                    {admittedPatients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName} - {patient.hospitalNumber} ({patient.admission?.wardName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Shift</label>
                    <select {...nurseAssignForm.register('shiftType')} className="input">
                      {shifts.map((shift) => (
                        <option key={shift.value} value={shift.value}>{shift.icon} {shift.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Care Level</label>
                    <select {...nurseAssignForm.register('careLevel')} className="input">
                      {careLevels.map((level) => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea {...nurseAssignForm.register('notes')} className="input" rows={2} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowNurseAssignModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    <UserPlus size={18} />
                    Assign Nurse
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
