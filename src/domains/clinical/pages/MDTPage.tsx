/**
 * MDT (Multidisciplinary Team) Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive MDT management with treatment harmonization and approval workflows
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Users,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertCircle,
  Video,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Pill,
  Activity,
  Target,
  Send,
  Clipboard,
  Heart,
  Stethoscope,
  Syringe,
  FlaskConical,
  Bed,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import {
  mdtService,
  specialtyDefinitions,
  type SpecialtyType,
  type MDTMeeting,
  type SpecialtyTreatmentPlan,
  type HarmonizedCarePlan,
  type TeamMember,
  type MedicationRecommendation,
  type TreatmentRecommendation,
  type Goal,
} from '../../../services/mdtService';

type TabType = 'meetings' | 'plans' | 'harmonize' | 'approvals';

export default function MDTPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('meetings');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showHarmonizeModal, setShowHarmonizeModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  
  // Meeting form states
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [meetingDuration, setMeetingDuration] = useState<number>(60);
  const [meetingLocation, setMeetingLocation] = useState<'in-person' | 'virtual'>('in-person');
  const [meetingObjectives, setMeetingObjectives] = useState<string>('');
  const [showPatientSummary, setShowPatientSummary] = useState(false);

  // Mock data for meetings and plans (would be from database in production)
  const [meetings, setMeetings] = useState<MDTMeeting[]>([]);
  const [specialtyPlans, setSpecialtyPlans] = useState<SpecialtyTreatmentPlan[]>([]);
  const [harmonizedPlans, setHarmonizedPlans] = useState<HarmonizedCarePlan[]>([]);

  // Form states for specialty plan
  const [planSpecialty, setPlanSpecialty] = useState<SpecialtyType>('surgery');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>(['']);
  const [recommendations, setRecommendations] = useState<TreatmentRecommendation[]>([]);
  const [medications, setMedications] = useState<MedicationRecommendation[]>([]);
  const [shortTermGoals, setShortTermGoals] = useState<Goal[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<Goal[]>([]);

  // Data queries
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive === true).toArray(), []);
  
  // Patient history queries - only fetch when patient is selected
  const patientAdmissions = useLiveQuery(
    () => selectedPatientId 
      ? db.admissions.where('patientId').equals(selectedPatientId).toArray() 
      : db.admissions.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );
  
  const patientEncounters = useLiveQuery(
    () => selectedPatientId 
      ? db.clinicalEncounters.where('patientId').equals(selectedPatientId).toArray() 
      : db.clinicalEncounters.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );
  
  const patientSurgeries = useLiveQuery(
    () => selectedPatientId 
      ? db.surgeries.where('patientId').equals(selectedPatientId).toArray() 
      : db.surgeries.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );
  
  const patientInvestigations = useLiveQuery(
    () => selectedPatientId 
      ? db.investigations.where('patientId').equals(selectedPatientId).toArray() 
      : db.investigations.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );
  
  const patientPrescriptions = useLiveQuery(
    () => selectedPatientId 
      ? db.prescriptions.where('patientId').equals(selectedPatientId).toArray() 
      : db.prescriptions.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );
  
  const patientVitalSigns = useLiveQuery(
    () => selectedPatientId 
      ? db.vitalSigns.where('patientId').equals(selectedPatientId).toArray() 
      : db.vitalSigns.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  const selectedPatient = useMemo(() => {
    return patients?.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Get hospital for selected patient
  const patientHospital = useMemo(() => {
    if (!selectedPatient?.registeredHospitalId) return null;
    return hospitals?.find(h => h.id === selectedPatient.registeredHospitalId);
  }, [hospitals, selectedPatient]);

  // Calculate patient age
  const calculateAge = (dateOfBirth: Date | string): number => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Generate comprehensive patient summary
  const patientSummary = useMemo(() => {
    if (!selectedPatient) return null;

    // Get current admission (most recent active)
    const currentAdmission = patientAdmissions
      ?.filter(a => a.status === 'active')
      ?.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())[0];

    // Get all admissions sorted by date
    const sortedAdmissions = patientAdmissions
      ?.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()) || [];

    // Get recent encounters
    const recentEncounters = patientEncounters
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ?.slice(0, 5) || [];

    // Get surgeries
    const surgeryList = patientSurgeries
      ?.sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime()) || [];

    // Get recent investigations
    const recentInvestigations = patientInvestigations
      ?.sort((a, b) => new Date(b.requestedAt || b.createdAt).getTime() - new Date(a.requestedAt || a.createdAt).getTime())
      ?.slice(0, 10) || [];

    // Get current medications (pending and dispensed)
    const activeMedications = patientPrescriptions
      ?.filter(p => p.status === 'pending' || p.status === 'dispensed' || p.status === 'partially_dispensed') || [];

    // Get latest vital signs
    const latestVitals = patientVitalSigns
      ?.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

    // Calculate days since admission
    const daysSinceAdmission = currentAdmission 
      ? Math.floor((new Date().getTime() - new Date(currentAdmission.admissionDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      currentAdmission,
      sortedAdmissions,
      recentEncounters,
      surgeryList,
      recentInvestigations,
      activeMedications,
      latestVitals,
      daysSinceAdmission,
      totalAdmissions: sortedAdmissions.length,
      totalSurgeries: surgeryList.length,
      totalInvestigations: patientInvestigations?.length || 0,
    };
  }, [selectedPatient, patientAdmissions, patientEncounters, patientSurgeries, patientInvestigations, patientPrescriptions, patientVitalSigns]);

  // Filter plans for selected patient
  const patientPlans = useMemo(() => {
    return specialtyPlans.filter(p => p.patientId === selectedPatientId);
  }, [specialtyPlans, selectedPatientId]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Handle meeting creation
  const handleCreateMeeting = () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    if (!meetingObjectives.trim()) {
      toast.error('Please enter meeting objectives');
      return;
    }

    // Generate meeting agenda from objectives and patient summary
    const agendaItems = [
      {
        id: 'agenda-1',
        title: 'Patient Case Review',
        description: `Review of ${selectedPatient?.firstName} ${selectedPatient?.lastName}'s clinical history and current status`,
        presenter: user?.firstName + ' ' + user?.lastName || 'Presenter',
        duration: 15,
        completed: false,
      },
      {
        id: 'agenda-2',
        title: 'Meeting Objectives Discussion',
        description: meetingObjectives,
        presenter: 'All Team Members',
        duration: 20,
        completed: false,
      },
      {
        id: 'agenda-3',
        title: 'Treatment Plan Harmonization',
        description: 'Review and harmonize treatment recommendations from all specialties',
        presenter: 'Primary Consultant',
        duration: 15,
        completed: false,
      },
      {
        id: 'agenda-4',
        title: 'Action Items & Next Steps',
        description: 'Define action items, responsibilities, and follow-up schedule',
        presenter: 'All Team Members',
        duration: 10,
        completed: false,
      },
    ];

    // Build comprehensive patient summary text
    let summaryText = `\n=== PATIENT SUMMARY FOR MDT MEETING ===\n`;
    summaryText += `Generated: ${format(new Date(), 'PPpp')}\n\n`;
    
    summaryText += `PATIENT: ${selectedPatient?.firstName} ${selectedPatient?.lastName}\n`;
    summaryText += `Hospital No: ${selectedPatient?.hospitalNumber}\n`;
    summaryText += `Age: ${selectedPatient?.dateOfBirth ? calculateAge(selectedPatient.dateOfBirth) + ' years' : 'N/A'}\n`;
    summaryText += `Gender: ${selectedPatient?.gender}\n`;
    summaryText += `Blood Group: ${selectedPatient?.bloodGroup || 'Not specified'}\n\n`;

    if (selectedPatient?.allergies?.length) {
      summaryText += `⚠️ ALLERGIES: ${selectedPatient.allergies.join(', ')}\n\n`;
    }

    if (selectedPatient?.chronicConditions?.length) {
      summaryText += `CHRONIC CONDITIONS: ${selectedPatient.chronicConditions.join(', ')}\n\n`;
    }

    if (patientSummary?.currentAdmission) {
      const adm = patientSummary.currentAdmission;
      summaryText += `CURRENT ADMISSION:\n`;
      summaryText += `- Admission Date: ${format(new Date(adm.admissionDate), 'PPP')}\n`;
      summaryText += `- Days in Hospital: ${patientSummary.daysSinceAdmission} days\n`;
      summaryText += `- Ward: ${adm.wardName} (Bed ${adm.bedNumber})\n`;
      summaryText += `- Admission Diagnosis: ${adm.admissionDiagnosis}\n`;
      summaryText += `- Chief Complaint: ${adm.chiefComplaint}\n\n`;
    }

    if (patientSummary?.surgeryList?.length) {
      summaryText += `SURGICAL HISTORY (${patientSummary.totalSurgeries} total):\n`;
      patientSummary.surgeryList.slice(0, 5).forEach((s: any) => {
        summaryText += `- ${s.procedureName || s.type}: ${s.status} (${format(new Date(s.scheduledDate || s.createdAt), 'PP')})\n`;
      });
      summaryText += '\n';
    }

    if (patientSummary?.recentInvestigations?.length) {
      summaryText += `RECENT INVESTIGATIONS (${patientSummary.totalInvestigations} total):\n`;
      patientSummary.recentInvestigations.slice(0, 5).forEach((inv: any) => {
        summaryText += `- ${inv.typeName || inv.type}: ${inv.status}\n`;
      });
      summaryText += '\n';
    }

    if (patientSummary?.activeMedications?.length) {
      summaryText += `CURRENT MEDICATIONS:\n`;
      patientSummary.activeMedications.forEach((med: any) => {
        summaryText += `- ${med.medicationName}: ${med.dose} ${med.route} ${med.frequency}\n`;
      });
      summaryText += '\n';
    }

    if (patientSummary?.latestVitals) {
      const v = patientSummary.latestVitals;
      summaryText += `LATEST VITAL SIGNS (${format(new Date(v.recordedAt), 'PPp')}):\n`;
      summaryText += `- BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg\n`;
      summaryText += `- Pulse: ${v.pulse} bpm\n`;
      summaryText += `- Temp: ${v.temperature}°C\n`;
      summaryText += `- SpO2: ${v.oxygenSaturation}%\n`;
      summaryText += `- RR: ${v.respiratoryRate}/min\n\n`;
    }

    summaryText += `MEETING OBJECTIVES:\n${meetingObjectives}\n`;

    const newMeeting = mdtService.createMeeting({
      patientId: selectedPatientId,
      title: `MDT Meeting - ${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
      scheduledDate: meetingDate ? new Date(meetingDate) : new Date(),
      duration: meetingDuration,
      attendees: [],
      createdBy: user?.id || '',
    });

    // Add agenda and meeting details
    newMeeting.agenda = agendaItems;
    newMeeting.location = meetingLocation === 'in-person' ? 'Conference Room' : undefined;
    newMeeting.virtualLink = meetingLocation === 'virtual' ? 'https://meet.astrohealth.com/' + newMeeting.id : undefined;
    (newMeeting as any).objectives = meetingObjectives;
    (newMeeting as any).patientSummary = summaryText;

    setMeetings(prev => [...prev, newMeeting]);
    toast.success('MDT meeting scheduled with comprehensive patient summary');
    
    // Reset form
    setShowMeetingModal(false);
    setMeetingObjectives('');
    setMeetingDate('');
    setMeetingDuration(60);
    setMeetingLocation('in-person');
    setShowPatientSummary(false);
  };

  // Handle specialty plan submission
  const handleSubmitPlan = () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }

    const teamMember: TeamMember = {
      id: user?.id || '',
      userId: user?.id || '',
      name: user?.firstName + ' ' + user?.lastName || 'Unknown',
      role: user?.role || 'doctor',
      specialty: planSpecialty,
      isPrimaryConsultant: false,
    };

    const newPlan = mdtService.createSpecialtyPlan({
      patientId: selectedPatientId,
      specialty: planSpecialty,
      submittedBy: teamMember,
      clinicalFindings,
      diagnosis: diagnoses.filter(d => d.trim()),
      recommendations,
      medications,
      shortTermGoals,
      longTermGoals,
    });

    newPlan.status = 'submitted';
    setSpecialtyPlans(prev => [...prev, newPlan]);
    toast.success('Treatment plan submitted for review');
    setShowPlanModal(false);
    resetPlanForm();
  };

  const resetPlanForm = () => {
    setClinicalFindings('');
    setDiagnoses(['']);
    setRecommendations([]);
    setMedications([]);
    setShortTermGoals([]);
    setLongTermGoals([]);
  };

  // Handle harmonization
  const handleHarmonizePlans = () => {
    if (patientPlans.length < 2) {
      toast.error('Need at least 2 specialty plans to harmonize');
      return;
    }

    const primaryConsultant: TeamMember = {
      id: user?.id || '',
      userId: user?.id || '',
      name: user?.firstName + ' ' + user?.lastName || 'Primary Consultant',
      role: 'consultant',
      specialty: 'surgery',
      isPrimaryConsultant: true,
    };

    const harmonized = mdtService.harmonizeTreatmentPlans(
      patientPlans.filter(p => p.approvalStatus === 'approved' || p.status === 'submitted'),
      primaryConsultant,
      selectedPatientId,
      'meeting-1'
    );

    setHarmonizedPlans(prev => [...prev, harmonized]);
    toast.success('Treatment plans harmonized successfully');
    setShowHarmonizeModal(false);
  };

  // Approve specialty plan
  const handleApprovePlan = (planId: string) => {
    setSpecialtyPlans(prev =>
      prev.map(p =>
        p.id === planId
          ? { ...p, approvalStatus: 'approved', approvedBy: user?.id, approvalDate: new Date() }
          : p
      )
    );
    toast.success('Plan approved');
  };

  // Reject specialty plan
  const handleRejectPlan = (planId: string, reason: string) => {
    setSpecialtyPlans(prev =>
      prev.map(p =>
        p.id === planId
          ? { ...p, approvalStatus: 'rejected', rejectionReason: reason }
          : p
      )
    );
    toast.error('Plan rejected');
  };

  // Approve harmonized plan (primary consultant)
  const handleApproveHarmonized = (planId: string) => {
    const primaryConsultant: TeamMember = {
      id: user?.id || '',
      userId: user?.id || '',
      name: user?.firstName + ' ' + user?.lastName || 'Primary Consultant',
      role: 'consultant',
      specialty: 'surgery',
      isPrimaryConsultant: true,
    };

    setHarmonizedPlans(prev =>
      prev.map(p =>
        p.id === planId ? mdtService.approveCarePlan(p, primaryConsultant) : p
      )
    );
    toast.success('Harmonized care plan approved and activated');
  };

  // Add recommendation
  const addRecommendation = () => {
    setRecommendations(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        category: '',
        description: '',
        priority: 'routine',
        rationale: '',
      },
    ]);
  };

  // Add medication
  const addMedication = () => {
    setMedications(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        action: 'add',
        medicationName: '',
        dose: '',
        route: 'oral',
        frequency: '',
        indication: '',
        rationale: '',
      },
    ]);
  };

  // Add goal
  const addGoal = (type: 'short' | 'long') => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      description: '',
      targetDate: new Date(Date.now() + (type === 'short' ? 7 : 30) * 24 * 60 * 60 * 1000),
      measurableOutcome: '',
      status: 'not_started',
    };

    if (type === 'short') {
      setShortTermGoals(prev => [...prev, newGoal]);
    } else {
      setLongTermGoals(prev => [...prev, newGoal]);
    }
  };

  // Render tabs content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'meetings':
        return (
          <div className="space-y-4">
            {/* Meetings List */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">MDT Meetings</h3>
              <button
                onClick={() => setShowMeetingModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Schedule Meeting
              </button>
            </div>

            {meetings.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Calendar className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No MDT meetings scheduled</p>
                <p className="text-sm mt-1">Schedule a meeting to coordinate care</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{meeting.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {format(new Date(meeting.scheduledDate), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {meeting.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {meeting.attendees.length} attendees
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'completed' ? 'bg-green-100 text-green-700' :
                        meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {meeting.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'plans':
        return (
          <div className="space-y-4">
            {/* Patient Selection */}
            <div className="bg-white rounded-xl p-4 border">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Choose a patient...</option>
                {patients?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.hospitalNumber})
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Specialty Treatment Plans for {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </h3>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Plan
                  </button>
                </div>

                {/* Specialty Plans Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Object.entries(specialtyDefinitions).slice(0, 8).map(([key, spec]) => {
                    const plan = patientPlans.find(p => p.specialty === key);
                    return (
                      <div
                        key={key}
                        className={`bg-white rounded-xl p-4 border-2 ${
                          plan ? 'border-green-200' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: spec.color }}
                            />
                            <span className="font-medium">{spec.name}</span>
                          </div>
                          {plan && (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              plan.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              plan.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {plan.approvalStatus}
                            </span>
                          )}
                        </div>
                        {plan ? (
                          <div className="text-sm text-gray-600">
                            <p>{plan.recommendations.length} recommendations</p>
                            <p>{plan.medications.length} medications</p>
                            <p className="text-xs text-gray-400 mt-1">
                              by {plan.submittedBy.name}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No plan submitted</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Harmonize Button */}
                {patientPlans.length >= 2 && (
                  <button
                    onClick={() => setShowHarmonizeModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <RefreshCw size={18} />
                    Harmonize Treatment Plans ({patientPlans.length} plans)
                  </button>
                )}
              </>
            )}
          </div>
        );

      case 'harmonize':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Harmonized Care Plans</h3>

            {harmonizedPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <RefreshCw className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No harmonized plans yet</p>
                <p className="text-sm mt-1">Submit specialty plans and harmonize them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {harmonizedPlans.map(plan => (
                  <div key={plan.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">Harmonized Care Plan v{plan.version}</h4>
                          <p className="text-sm text-gray-600">
                            Primary: {plan.primaryDiagnosis}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Primary Consultant: {plan.primaryConsultant.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                            plan.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {plan.status.replace('_', ' ')}
                          </span>
                          {plan.status !== 'approved' && (
                            <button
                              onClick={() => handleApproveHarmonized(plan.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} />
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content Sections */}
                    <div className="divide-y">
                      {/* Reconciled Medications */}
                      <div className="p-4">
                        <button
                          onClick={() => toggleSection(`meds-${plan.id}`)}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <Pill className="text-orange-600" size={18} />
                            Reconciled Medications ({plan.reconciledMedications.length})
                          </span>
                          {expandedSections.includes(`meds-${plan.id}`) ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        
                        {expandedSections.includes(`meds-${plan.id}`) && (
                          <div className="mt-3 space-y-2">
                            {plan.reconciledMedications.map(med => (
                              <div
                                key={med.id}
                                className={`p-3 rounded-lg border ${
                                  med.status === 'discontinued' ? 'bg-red-50 border-red-200' :
                                  med.interactions.length > 0 ? 'bg-yellow-50 border-yellow-200' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-medium">{med.medicationName}</span>
                                    <span className="text-sm text-gray-500 ml-2">
                                      {med.dose} {med.route} {med.frequency}
                                    </span>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    med.finalDecision === 'discontinue' ? 'bg-red-100 text-red-700' :
                                    med.finalDecision === 'modify' ? 'bg-yellow-100 text-yellow-700' :
                                    med.finalDecision === 'add' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {med.finalDecision}
                                  </span>
                                </div>
                                
                                {/* Source specialties */}
                                <div className="text-xs text-gray-500 mt-1">
                                  Recommended by: {med.originalRecommendations.map(r =>
                                    specialtyDefinitions[r.specialty].name
                                  ).join(', ')}
                                </div>
                                
                                {/* Interactions warning */}
                                {med.interactions.length > 0 && (
                                  <div className="mt-2 p-2 bg-yellow-100 rounded text-sm">
                                    <AlertTriangle className="inline text-yellow-600 mr-1" size={14} />
                                    <span className="font-medium">Interaction:</span>{' '}
                                    {med.interactions[0].description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Treatment Plans */}
                      <div className="p-4">
                        <button
                          onClick={() => toggleSection(`treatments-${plan.id}`)}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <Activity className="text-blue-600" size={18} />
                            Harmonized Treatments ({plan.treatmentPlans.length})
                          </span>
                          {expandedSections.includes(`treatments-${plan.id}`) ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        
                        {expandedSections.includes(`treatments-${plan.id}`) && (
                          <div className="mt-3 space-y-2">
                            {plan.treatmentPlans.map(treatment => (
                              <div key={treatment.id} className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-medium capitalize">{treatment.category}</span>
                                    <p className="text-sm text-gray-600 mt-1">{treatment.description}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    treatment.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                    treatment.priority === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {treatment.priority}
                                  </span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  {treatment.sourceSpecialties.map(spec => (
                                    <span
                                      key={spec}
                                      className="px-2 py-1 rounded text-xs"
                                      style={{
                                        backgroundColor: specialtyDefinitions[spec].color + '20',
                                        color: specialtyDefinitions[spec].color,
                                      }}
                                    >
                                      {specialtyDefinitions[spec].name}
                                    </span>
                                  ))}
                                </div>
                                
                                {/* Conflict indicator */}
                                {treatment.conflicts && treatment.conflicts.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-50 rounded text-sm border border-red-200">
                                    <AlertCircle className="inline text-red-600 mr-1" size={14} />
                                    <span className="font-medium text-red-700">Conflict needs resolution</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Goals */}
                      <div className="p-4">
                        <button
                          onClick={() => toggleSection(`goals-${plan.id}`)}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <Target className="text-green-600" size={18} />
                            Patient Goals ({plan.patientGoals.length})
                          </span>
                          {expandedSections.includes(`goals-${plan.id}`) ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        
                        {expandedSections.includes(`goals-${plan.id}`) && (
                          <div className="mt-3 space-y-2">
                            {plan.patientGoals.map(goal => (
                              <div key={goal.id} className="p-3 bg-gray-50 rounded-lg border flex items-start gap-3">
                                <input type="checkbox" className="mt-1" checked={goal.status === 'achieved'} readOnly />
                                <div className="flex-1">
                                  <p className="font-medium">{goal.description}</p>
                                  <p className="text-sm text-gray-500">
                                    Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                                  </p>
                                  <p className="text-xs text-gray-400">{goal.measurableOutcome}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Team Responsibilities */}
                      <div className="p-4">
                        <button
                          onClick={() => toggleSection(`team-${plan.id}`)}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="font-medium flex items-center gap-2">
                            <Users className="text-purple-600" size={18} />
                            Team Responsibilities ({plan.teamResponsibilities.length})
                          </span>
                          {expandedSections.includes(`team-${plan.id}`) ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                        
                        {expandedSections.includes(`team-${plan.id}`) && (
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {plan.teamResponsibilities.map((team, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg border"
                                style={{
                                  borderColor: specialtyDefinitions[team.specialty].color + '50',
                                  backgroundColor: specialtyDefinitions[team.specialty].color + '10',
                                }}
                              >
                                <div className="font-medium" style={{ color: specialtyDefinitions[team.specialty].color }}>
                                  {specialtyDefinitions[team.specialty].name}
                                </div>
                                <p className="text-sm text-gray-600">Lead: {team.teamLead}</p>
                                <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
                                  {team.responsibilities.slice(0, 3).map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Approvals */}
                      <div className="p-4 bg-gray-50">
                        <h5 className="font-medium mb-2">Approval Chain</h5>
                        <div className="flex flex-wrap gap-2">
                          {plan.approvals.map((approval, idx) => (
                            <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                              <CheckCircle2 size={14} />
                              {specialtyDefinitions[approval.specialty].name}
                            </div>
                          ))}
                          {plan.finalApproval && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm">
                              <UserCheck size={14} />
                              Final Approval: {plan.finalApproval.approvedBy}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'approvals':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pending Approvals</h3>

            {specialtyPlans.filter(p => p.approvalStatus === 'pending').length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <CheckCircle2 className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {specialtyPlans
                  .filter(p => p.approvalStatus === 'pending')
                  .map(plan => (
                    <div key={plan.id} className="bg-white rounded-xl p-4 border shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: specialtyDefinitions[plan.specialty].color }}
                            />
                            <span className="font-medium">
                              {specialtyDefinitions[plan.specialty].name} Plan
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Submitted by {plan.submittedBy.name} on{' '}
                            {format(new Date(plan.submittedAt), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            {plan.recommendations.length} recommendations, {plan.medications.length} medications
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprovePlan(plan.id)}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1"
                          >
                            <ThumbsUp size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectPlan(plan.id, 'Needs revision')}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-1"
                          >
                            <ThumbsDown size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-primary-600" />
            Multidisciplinary Team (MDT)
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Coordinate care across specialties with harmonized treatment plans</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">{meetings.length}</p>
          <p className="text-sm text-gray-500">Scheduled Meetings</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">{specialtyPlans.length}</p>
          <p className="text-sm text-gray-500">Specialty Plans</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-purple-600">{harmonizedPlans.length}</p>
          <p className="text-sm text-gray-500">Harmonized Plans</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-yellow-600">
            {specialtyPlans.filter(p => p.approvalStatus === 'pending').length}
          </p>
          <p className="text-sm text-gray-500">Pending Approvals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b">
          <div className="flex">
            {[
              { id: 'meetings', label: 'Meetings', icon: Calendar },
              { id: 'plans', label: 'Specialty Plans', icon: FileText },
              { id: 'harmonize', label: 'Harmonized Care', icon: RefreshCw },
              { id: 'approvals', label: 'Approvals', icon: UserCheck },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Specialty Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Submit Specialty Treatment Plan</h2>
                <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
                {/* Specialty Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                  <select
                    value={planSpecialty}
                    onChange={(e) => setPlanSpecialty(e.target.value as SpecialtyType)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    {Object.entries(specialtyDefinitions).map(([key, spec]) => (
                      <option key={key} value={key}>{spec.name}</option>
                    ))}
                  </select>
                </div>

                {/* Clinical Findings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Findings</label>
                  <textarea
                    value={clinicalFindings}
                    onChange={(e) => setClinicalFindings(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="Document relevant clinical findings..."
                  />
                </div>

                {/* Diagnoses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diagnoses</label>
                  {diagnoses.map((diag, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={diag}
                        onChange={(e) => {
                          const newDiag = [...diagnoses];
                          newDiag[idx] = e.target.value;
                          setDiagnoses(newDiag);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                        placeholder="Enter diagnosis"
                      />
                      {idx > 0 && (
                        <button
                          onClick={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setDiagnoses([...diagnoses, ''])}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    + Add diagnosis
                  </button>
                </div>

                {/* Recommendations */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Treatment Recommendations</label>
                    <button
                      onClick={addRecommendation}
                      className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {recommendations.map((rec, idx) => (
                    <div key={rec.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={rec.category}
                          onChange={(e) => {
                            const updated = [...recommendations];
                            updated[idx] = { ...rec, category: e.target.value };
                            setRecommendations(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                          placeholder="Category"
                        />
                        <select
                          value={rec.priority}
                          onChange={(e) => {
                            const updated = [...recommendations];
                            updated[idx] = { ...rec, priority: e.target.value as any };
                            setRecommendations(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <textarea
                        value={rec.description}
                        onChange={(e) => {
                          const updated = [...recommendations];
                          updated[idx] = { ...rec, description: e.target.value };
                          setRecommendations(updated);
                        }}
                        className="w-full mt-2 px-3 py-2 border border-gray-200 rounded"
                        placeholder="Description"
                        rows={2}
                      />
                    </div>
                  ))}
                </div>

                {/* Medications */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Medication Recommendations</label>
                    <button
                      onClick={addMedication}
                      className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {medications.map((med, idx) => (
                    <div key={med.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          value={med.medicationName}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx] = { ...med, medicationName: e.target.value };
                            setMedications(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                          placeholder="Medication name"
                        />
                        <input
                          type="text"
                          value={med.dose}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx] = { ...med, dose: e.target.value };
                            setMedications(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                          placeholder="Dose"
                        />
                        <select
                          value={med.action}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx] = { ...med, action: e.target.value as any };
                            setMedications(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                        >
                          <option value="add">Add</option>
                          <option value="continue">Continue</option>
                          <option value="modify">Modify</option>
                          <option value="discontinue">Discontinue</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx] = { ...med, frequency: e.target.value };
                            setMedications(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                          placeholder="Frequency (e.g., BD, TDS)"
                        />
                        <input
                          type="text"
                          value={med.indication}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx] = { ...med, indication: e.target.value };
                            setMedications(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                          placeholder="Indication"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Goals */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Short-term Goals</label>
                      <button
                        onClick={() => addGoal('short')}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {shortTermGoals.map((goal, idx) => (
                      <div key={goal.id} className="p-2 bg-gray-50 rounded mb-2">
                        <input
                          type="text"
                          value={goal.description}
                          onChange={(e) => {
                            const updated = [...shortTermGoals];
                            updated[idx] = { ...goal, description: e.target.value };
                            setShortTermGoals(updated);
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                          placeholder="Goal description"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Long-term Goals</label>
                      <button
                        onClick={() => addGoal('long')}
                        className="text-sm text-primary-600 hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {longTermGoals.map((goal, idx) => (
                      <div key={goal.id} className="p-2 bg-gray-50 rounded mb-2">
                        <input
                          type="text"
                          value={goal.description}
                          onChange={(e) => {
                            const updated = [...longTermGoals];
                            updated[idx] = { ...goal, description: e.target.value };
                            setLongTermGoals(updated);
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                          placeholder="Goal description"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPlan}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <Send size={16} />
                  Submit Plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meeting Modal */}
      <AnimatePresence>
        {showMeetingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setShowMeetingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="text-primary-600" />
                  Schedule MDT Meeting
                </h2>
                <button onClick={() => setShowMeetingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setShowPatientSummary(false);
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select patient...</option>
                    {patients?.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.hospitalNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient Details Card - Shows when patient is selected */}
                {selectedPatient && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Patient Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-7 h-7 text-indigo-600" />
                        </div>
                      </div>
                      
                      {/* Patient Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {selectedPatient.firstName} {selectedPatient.middleName || ''} {selectedPatient.lastName}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            selectedPatient.gender === 'male' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-pink-100 text-pink-700'
                          }`}>
                            {selectedPatient.gender === 'male' ? 'Male' : 'Female'}
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Hospital No:</span>
                            <p className="font-medium text-gray-900">{selectedPatient.hospitalNumber}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Age:</span>
                            <p className="font-medium text-gray-900">
                              {selectedPatient.dateOfBirth 
                                ? `${calculateAge(selectedPatient.dateOfBirth)} years` 
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Blood Group:</span>
                            <p className="font-medium text-gray-900">
                              {selectedPatient.bloodGroup || 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Genotype:</span>
                            <p className="font-medium text-gray-900">
                              {selectedPatient.genotype || 'Not specified'}
                            </p>
                          </div>
                        </div>

                        {/* Allergies Warning */}
                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                          <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-medium text-red-700">Known Allergies:</span>
                              <p className="text-sm text-red-600">{selectedPatient.allergies.join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {/* Chronic Conditions */}
                        {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 && (
                          <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <Activity className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-medium text-amber-700">Chronic Conditions:</span>
                              <p className="text-sm text-amber-600">{selectedPatient.chronicConditions.join(', ')}</p>
                            </div>
                          </div>
                        )}

                        {/* Hospital Info */}
                        {patientHospital && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="text-gray-500">Registered Hospital:</span>{' '}
                            <span className="font-medium">{patientHospital.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View/Generate Patient Summary Button */}
                    <div className="mt-4 pt-3 border-t border-indigo-200">
                      <button
                        type="button"
                        onClick={() => setShowPatientSummary(!showPatientSummary)}
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Clipboard size={16} />
                        {showPatientSummary ? 'Hide' : 'View'} Comprehensive Patient Summary
                        {showPatientSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Comprehensive Patient Summary Section */}
                {selectedPatient && showPatientSummary && patientSummary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText size={18} />
                        Comprehensive Patient Summary
                      </h3>
                      <p className="text-xs text-green-100 mt-1">
                        Generated for MDT Meeting • {format(new Date(), 'PPP')}
                      </p>
                    </div>

                    <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                      {/* Current Admission */}
                      {patientSummary.currentAdmission && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                            <Bed size={16} />
                            Current Admission
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Admitted:</span>
                              <p className="font-medium">{format(new Date(patientSummary.currentAdmission.admissionDate), 'PPP')}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <p className="font-medium text-blue-600">{patientSummary.daysSinceAdmission} days</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Ward/Bed:</span>
                              <p className="font-medium">{patientSummary.currentAdmission.wardName} - Bed {patientSummary.currentAdmission.bedNumber}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Severity:</span>
                              <p className={`font-medium capitalize ${
                                patientSummary.currentAdmission.severity === 'critical' ? 'text-red-600' :
                                patientSummary.currentAdmission.severity === 'severe' ? 'text-orange-600' :
                                'text-gray-700'
                              }`}>{patientSummary.currentAdmission.severity}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">Admission Diagnosis:</span>
                            <p className="font-medium text-gray-900">{patientSummary.currentAdmission.admissionDiagnosis}</p>
                          </div>
                          <div className="mt-1">
                            <span className="text-gray-500 text-sm">Chief Complaint:</span>
                            <p className="text-gray-700">{patientSummary.currentAdmission.chiefComplaint}</p>
                          </div>
                        </div>
                      )}

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                          <Stethoscope className="mx-auto text-purple-600 mb-1" size={20} />
                          <p className="text-2xl font-bold text-purple-700">{patientSummary.totalAdmissions}</p>
                          <p className="text-xs text-purple-600">Total Admissions</p>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                          <Syringe className="mx-auto text-rose-600 mb-1" size={20} />
                          <p className="text-2xl font-bold text-rose-700">{patientSummary.totalSurgeries}</p>
                          <p className="text-xs text-rose-600">Surgeries</p>
                        </div>
                        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
                          <FlaskConical className="mx-auto text-cyan-600 mb-1" size={20} />
                          <p className="text-2xl font-bold text-cyan-700">{patientSummary.totalInvestigations}</p>
                          <p className="text-xs text-cyan-600">Investigations</p>
                        </div>
                      </div>

                      {/* Latest Vitals */}
                      {patientSummary.latestVitals && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h4 className="font-medium text-green-800 flex items-center gap-2 mb-2">
                            <Heart size={16} />
                            Latest Vital Signs
                            <span className="text-xs font-normal text-green-600">
                              ({format(new Date(patientSummary.latestVitals.recordedAt), 'PPp')})
                            </span>
                          </h4>
                          <div className="grid grid-cols-5 gap-2 text-sm">
                            <div className="text-center">
                              <p className="text-gray-500">BP</p>
                              <p className="font-bold">{patientSummary.latestVitals.bloodPressureSystolic}/{patientSummary.latestVitals.bloodPressureDiastolic}</p>
                              <p className="text-xs text-gray-400">mmHg</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500">Pulse</p>
                              <p className="font-bold">{patientSummary.latestVitals.pulse}</p>
                              <p className="text-xs text-gray-400">bpm</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500">Temp</p>
                              <p className="font-bold">{patientSummary.latestVitals.temperature}</p>
                              <p className="text-xs text-gray-400">°C</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500">SpO2</p>
                              <p className="font-bold">{patientSummary.latestVitals.oxygenSaturation}</p>
                              <p className="text-xs text-gray-400">%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500">RR</p>
                              <p className="font-bold">{patientSummary.latestVitals.respiratoryRate}</p>
                              <p className="text-xs text-gray-400">/min</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Surgical History */}
                      {patientSummary.surgeryList.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-3">
                          <h4 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
                            <Syringe size={16} />
                            Surgical History
                          </h4>
                          <div className="space-y-2">
                            {patientSummary.surgeryList.slice(0, 3).map((surgery: any) => (
                              <div key={surgery.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                                <div>
                                  <p className="font-medium">{surgery.procedureName || surgery.type}</p>
                                  <p className="text-xs text-gray-500">{format(new Date(surgery.scheduledDate || surgery.createdAt), 'PP')}</p>
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  surgery.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  surgery.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{surgery.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Investigations */}
                      {patientSummary.recentInvestigations.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-3">
                          <h4 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
                            <FlaskConical size={16} />
                            Recent Investigations
                          </h4>
                          <div className="space-y-1">
                            {patientSummary.recentInvestigations.slice(0, 5).map((inv: any) => (
                              <div key={inv.id} className="flex items-center justify-between text-sm">
                                <span>{inv.typeName || inv.type}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  inv.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  inv.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{inv.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current Medications */}
                      {patientSummary.activeMedications.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-3">
                          <h4 className="font-medium text-gray-800 flex items-center gap-2 mb-2">
                            <Pill size={16} />
                            Current Medications ({patientSummary.activeMedications.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {patientSummary.activeMedications.slice(0, 6).map((med: any, idx: number) => (
                              <div key={idx} className="text-sm bg-gray-50 rounded p-2">
                                <p className="font-medium">{med.medicationName}</p>
                                <p className="text-xs text-gray-500">{med.dose} {med.route} {med.frequency}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Meeting Objectives - Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Objectives *
                    <span className="text-gray-400 font-normal ml-1">(What should this MDT meeting achieve?)</span>
                  </label>
                  <textarea
                    value={meetingObjectives}
                    onChange={(e) => setMeetingObjectives(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Review surgical options, Discuss chemotherapy protocol, Coordinate rehabilitation plan, Address pain management concerns..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These objectives will guide the meeting agenda and be included in the patient summary
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <select 
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setMeetingLocation('in-person')}
                      className={`flex-1 px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        meetingLocation === 'in-person'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <MapPin size={16} />
                      In-Person
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMeetingLocation('virtual')}
                      className={`flex-1 px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                        meetingLocation === 'virtual'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Video size={16} />
                      Virtual
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowMeetingModal(false);
                    setMeetingObjectives('');
                    setMeetingDate('');
                    setShowPatientSummary(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMeeting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Schedule Meeting
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Harmonize Confirmation Modal */}
      <AnimatePresence>
        {showHarmonizeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowHarmonizeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="p-6 text-center">
                <RefreshCw className="mx-auto mb-4 text-primary-600" size={48} />
                <h2 className="text-xl font-semibold mb-2">Harmonize Treatment Plans</h2>
                <p className="text-gray-600 mb-4">
                  This will combine {patientPlans.length} specialty plans into a unified care plan.
                  The primary consultant will need to approve the final plan.
                </p>

                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {patientPlans.map(plan => (
                    <span
                      key={plan.id}
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: specialtyDefinitions[plan.specialty].color + '20',
                        color: specialtyDefinitions[plan.specialty].color,
                      }}
                    >
                      {specialtyDefinitions[plan.specialty].name}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowHarmonizeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHarmonizePlans}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg"
                  >
                    Harmonize Plans
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
