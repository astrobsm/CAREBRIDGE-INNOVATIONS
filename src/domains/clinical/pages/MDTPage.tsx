/**
 * MDT (Multidisciplinary Team) Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive MDT management with treatment harmonization and approval workflows
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Mic,
  MicOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Droplets,
  Bell,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { useSpeechToText } from '../../../hooks/useSpeechToText';
import { PatientSelector } from '../../../components/patient';
import {
  mdtNotificationService,
  initMDTNotificationService,
  getPendingMDTInvitations,
  acknowledgeMDTInvitation,
  markPlanSubmittedByMeetingAndSpecialist,
  type MDTInvitation,
} from '../../../services/mdtNotificationService';
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

// Specialist selection interface
interface SelectedSpecialist {
  userId: string;
  name: string;
  specialty: string;
  email?: string;
  role: string;
}

export default function MDTPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('meetings');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showHarmonizeModal, setShowHarmonizeModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  
  // Specialist invitation states
  const [selectedSpecialists, setSelectedSpecialists] = useState<SelectedSpecialist[]>([]);
  const [specialistSearch, setSpecialistSearch] = useState<string>('');
  const [myPendingInvitations, setMyPendingInvitations] = useState<MDTInvitation[]>([]);
  
  // Meeting form states
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [meetingDuration, setMeetingDuration] = useState<number>(60);
  const [meetingLocation, setMeetingLocation] = useState<'in-person' | 'virtual'>('in-person');
  const [meetingObjectives, setMeetingObjectives] = useState<string>('');
  const [showPatientSummary, setShowPatientSummary] = useState(false);

  // Load meetings from database (persisted)
  const dbMeetings = useLiveQuery(() => db.mdtMeetings.orderBy('createdAt').reverse().toArray(), []);
  const meetings: MDTMeeting[] = (dbMeetings || []) as MDTMeeting[];
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

  // Speech-to-text state for multiple fields
  const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null);
  
  // Speech recognition hook
  const speech = useSpeechToText({
    continuous: true,
    onResult: useCallback((transcript: string) => {
      if (!activeSpeechField) return;
      
      // Handle different field types based on activeSpeechField
      if (activeSpeechField === 'clinicalFindings') {
        setClinicalFindings(prev => {
          const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + spacer + transcript;
        });
      } else if (activeSpeechField.startsWith('diagnosis-')) {
        const idx = parseInt(activeSpeechField.split('-')[1]);
        setDiagnoses(prev => {
          const updated = [...prev];
          const currentVal = updated[idx] || '';
          const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
          updated[idx] = currentVal + spacer + transcript;
          return updated;
        });
      } else if (activeSpeechField.startsWith('rec-category-')) {
        const idx = parseInt(activeSpeechField.split('-')[2]);
        setRecommendations(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].category || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], category: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('rec-desc-')) {
        const idx = parseInt(activeSpeechField.split('-')[2]);
        setRecommendations(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].description || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], description: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('med-name-')) {
        const idx = parseInt(activeSpeechField.split('-')[2]);
        setMedications(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].medicationName || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], medicationName: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('med-dose-')) {
        const idx = parseInt(activeSpeechField.split('-')[2]);
        setMedications(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].dose || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], dose: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('med-freq-')) {
        const idx = parseInt(activeSpeechField.split('-')[2]);
        setMedications(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].frequency || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], frequency: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('med-indication-')) {
        const idx = parseInt(activeSpeechField.split('-')[3]);
        setMedications(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].indication || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], indication: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('shortGoal-')) {
        const idx = parseInt(activeSpeechField.split('-')[1]);
        setShortTermGoals(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].description || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], description: currentVal + spacer + transcript };
          }
          return updated;
        });
      } else if (activeSpeechField.startsWith('longGoal-')) {
        const idx = parseInt(activeSpeechField.split('-')[1]);
        setLongTermGoals(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const currentVal = updated[idx].description || '';
            const spacer = currentVal && !currentVal.endsWith(' ') ? ' ' : '';
            updated[idx] = { ...updated[idx], description: currentVal + spacer + transcript };
          }
          return updated;
        });
      }
    }, [activeSpeechField]),
    onError: useCallback((error: string) => {
      toast.error(error);
      setActiveSpeechField(null);
    }, []),
  });

  // Toggle speech for a specific field
  const toggleSpeechForField = useCallback((fieldId: string) => {
    if (activeSpeechField === fieldId && speech.isListening) {
      speech.stopListening();
      setActiveSpeechField(null);
    } else {
      // Stop any current listening
      if (speech.isListening) {
        speech.stopListening();
      }
      setActiveSpeechField(fieldId);
      setTimeout(() => speech.startListening(), 100);
    }
  }, [activeSpeechField, speech]);

  // Stop speech when modal closes
  useEffect(() => {
    if (!showPlanModal && speech.isListening) {
      speech.stopListening();
      setActiveSpeechField(null);
    }
  }, [showPlanModal, speech]);

  // Render speech button for a field
  const renderSpeechButton = (fieldId: string, size = 16) => {
    if (!speech.isSupported) return null;
    const isActive = activeSpeechField === fieldId && speech.isListening;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleSpeechForField(fieldId);
        }}
        className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
          isActive 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-gray-100 text-gray-500 hover:bg-primary-100 hover:text-primary-600'
        }`}
        title={isActive ? 'Stop voice input' : 'Start voice input'}
      >
        {isActive ? <MicOff size={size} /> : <Mic size={size} />}
      </button>
    );
  };

  // Data queries - include patients where isActive is true or undefined (for backward compatibility)
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive !== false).toArray(), []);
  
  // Query all active users who can be specialists (doctors, surgeons, consultants, etc.)
  const allSpecialists = useLiveQuery(async () => {
    const users = await db.users.filter(u => 
      u.isActive !== false && 
      ['surgeon', 'doctor', 'consultant', 'senior_consultant', 'medical_officer', 
       'anaesthetist', 'radiologist', 'pathologist', 'pharmacist', 'physiotherapist',
       'nutritionist', 'psychologist', 'oncologist', 'nurse'].includes(u.role || '')
    ).toArray();
    return users;
  }, []);

  // Filter specialists based on search
  const filteredSpecialists = useMemo(() => {
    if (!allSpecialists) return [];
    if (!specialistSearch.trim()) return allSpecialists;
    const search = specialistSearch.toLowerCase();
    return allSpecialists.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search) ||
      s.role?.toLowerCase().includes(search) ||
      s.specialization?.toLowerCase().includes(search) ||
      s.email?.toLowerCase().includes(search)
    );
  }, [allSpecialists, specialistSearch]);

  // Initialize MDT notification service and check for invitations on mount
  useEffect(() => {
    const initNotifications = async () => {
      await initMDTNotificationService();
      
      // Check if we came from a notification click (deep link)
      const invitationId = searchParams.get('invitation');
      const patientId = searchParams.get('patient');
      
      if (invitationId) {
        // Acknowledge the invitation
        await acknowledgeMDTInvitation(invitationId);
        toast.success('MDT invitation acknowledged. Please review the patient and submit your specialty plan.');
        
        // Set the patient and switch to plans tab
        if (patientId) {
          setSelectedPatientId(patientId);
        }
        setActiveTab('plans');
        setShowPlanModal(true);
        
        // Clear URL params
        navigate('/clinical/mdt', { replace: true });
      }
      
      // Load my pending invitations
      if (user?.id) {
        const pending = getPendingMDTInvitations(user.id);
        setMyPendingInvitations(pending);
      }
    };
    
    initNotifications();
  }, [searchParams, navigate, user?.id]);

  // Refresh pending invitations periodically
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      const pending = getPendingMDTInvitations(user.id);
      setMyPendingInvitations(pending);
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [user?.id]);
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
    async () => {
      if (!selectedPatientId) return [];
      const vitals = await db.vitalSigns.where('patientId').equals(selectedPatientId).toArray();
      // Sort by recordedAt descending (newest first) for display
      return vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    },
    [selectedPatientId]
  );

  // Additional patient data queries for comprehensive summary
  const patientWardRounds = useLiveQuery(
    () => selectedPatientId 
      ? db.wardRounds.where('patientId').equals(selectedPatientId).toArray() 
      : db.wardRounds.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  const patientLabRequests = useLiveQuery(
    () => selectedPatientId 
      ? db.labRequests.where('patientId').equals(selectedPatientId).toArray() 
      : db.labRequests.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  const patientWounds = useLiveQuery(
    () => selectedPatientId 
      ? db.wounds.where('patientId').equals(selectedPatientId).toArray() 
      : db.wounds.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  const patientBurns = useLiveQuery(
    () => selectedPatientId 
      ? db.burnAssessments.where('patientId').equals(selectedPatientId).toArray() 
      : db.burnAssessments.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  const patientNutrition = useLiveQuery(
    () => selectedPatientId 
      ? db.nutritionAssessments.where('patientId').equals(selectedPatientId).toArray() 
      : db.nutritionAssessments.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  const patientTreatmentPlans = useLiveQuery(
    () => selectedPatientId 
      ? db.treatmentPlans.where('patientId').equals(selectedPatientId).toArray() 
      : db.treatmentPlans.where('patientId').equals('__none__').toArray(),
    [selectedPatientId]
  );

  // State for tracking if user has scrolled to end of patient summary
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const summaryScrollRef = useRef<HTMLDivElement>(null);
  const endOfSummaryRef = useRef<HTMLDivElement>(null);

  // Reset scroll state when patient changes
  useEffect(() => {
    setHasScrolledToEnd(false);
  }, [selectedPatientId]);

  // Handle scroll to detect when user reaches the end
  const handleSummaryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Consider "scrolled to end" when within 100px of bottom (more lenient)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setHasScrolledToEnd(true);
    }
  };

  const selectedPatient = useMemo(() => {
    return patients?.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Check if content doesn't require scrolling (fits entirely in view)
  // Or if user has already scrolled near the bottom
  // Must be AFTER selectedPatient is defined to avoid hoisting issues
  useEffect(() => {
    const checkScrollRequired = () => {
      const el = summaryScrollRef.current;
      if (el && selectedPatientId) {
        // If scrollHeight <= clientHeight, content fits without scrolling
        // So we can auto-enable the button
        if (el.scrollHeight <= el.clientHeight + 20) {
          setHasScrolledToEnd(true);
          return;
        }
        
        // Also check if already scrolled to near bottom
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight - scrollTop - clientHeight < 100) {
          setHasScrolledToEnd(true);
        }
      }
    };
    
    // Check after a short delay to ensure content is rendered
    const timer = setTimeout(checkScrollRequired, 300);
    // Also check again after more time in case content loads slowly
    const timer2 = setTimeout(checkScrollRequired, 1000);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [selectedPatientId, selectedPatient]);

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
  const handleCreateMeeting = async () => {
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
    (newMeeting as any).invitedSpecialists = selectedSpecialists;

    // Persist meeting to IndexedDB and sync to cloud
    try {
      await db.mdtMeetings.put({
        ...newMeeting,
        hospitalId: selectedPatient?.registeredHospitalId || '',
        meetingType: 'mdt',
        updatedAt: new Date(),
      } as any);
      await syncRecord('mdtMeetings', newMeeting.id);
    } catch (err) {
      console.error('Failed to persist MDT meeting:', err);
    }
    
    // Send invitations to selected specialists with push notifications and voice announcements
    const hospitalName = patientHospital?.name || 'Hospital';
    const patientDetails = {
      age: selectedPatient?.dateOfBirth ? calculateAge(selectedPatient.dateOfBirth) : undefined,
      gender: selectedPatient?.gender,
      admissionDiagnosis: patientSummary?.currentAdmission?.admissionDiagnosis,
      wardName: patientSummary?.currentAdmission?.wardName,
      bedNumber: patientSummary?.currentAdmission?.bedNumber,
    };
    
    // Send invitations to each selected specialist
    for (const specialist of selectedSpecialists) {
      try {
        await mdtNotificationService.createInvitation({
          mdtMeetingId: newMeeting.id,
          patientId: selectedPatientId,
          patientName: `${selectedPatient?.firstName} ${selectedPatient?.lastName}`,
          hospitalId: selectedPatient?.registeredHospitalId || '',
          hospitalName,
          specialistId: specialist.userId,
          specialistName: specialist.name,
          specialty: specialist.specialty,
          invitedBy: user?.id || '',
          invitedByName: `${user?.firstName} ${user?.lastName}`,
          patientDetails,
        });
        console.log(`[MDT] Invitation sent to ${specialist.name} (${specialist.specialty})`);
      } catch (error) {
        console.error(`[MDT] Failed to send invitation to ${specialist.name}:`, error);
      }
    }
    
    if (selectedSpecialists.length > 0) {
      toast.success(`MDT meeting scheduled. ${selectedSpecialists.length} specialist(s) invited with push notifications.`);
    } else {
      toast.success('MDT meeting scheduled with comprehensive patient summary');
    }
    
    // Reset form
    setShowMeetingModal(false);
    setMeetingObjectives('');
    setMeetingDate('');
    setMeetingDuration(60);
    setMeetingLocation('in-person');
    setShowPatientSummary(false);
    setSelectedSpecialists([]);
    setSpecialistSearch('');
  };

  // Handle specialty plan submission
  const handleSubmitPlan = async () => {
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
    
    // Mark any pending MDT invitations for this patient as plan_submitted
    // This stops the repeated notifications
    if (user?.id) {
      const pendingInvitations = getPendingMDTInvitations(user.id);
      for (const inv of pendingInvitations) {
        if (inv.patientId === selectedPatientId) {
          await markPlanSubmittedByMeetingAndSpecialist(inv.mdtMeetingId, user.id);
          console.log(`[MDT] Marked invitation ${inv.id} as plan_submitted`);
        }
      }
      // Refresh pending invitations
      setMyPendingInvitations(getPendingMDTInvitations(user.id));
    }
    
    toast.success('Treatment plan submitted for review. Notifications stopped.');
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
              <PatientSelector
                value={selectedPatientId}
                onChange={(patientId) => setSelectedPatientId(patientId || '')}
                placeholder="Search patient by name or hospital number..."
              />
            </div>

            {selectedPatientId && (
              <>
                {/* Comprehensive Patient Summary - Must scroll to end to enable Add Plan */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-600 to-blue-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={20} />
                      <h3 className="font-semibold">Comprehensive Patient Summary - {selectedPatient?.firstName} {selectedPatient?.lastName}</h3>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {hasScrolledToEnd ? '✓ Summary Reviewed' : 'Scroll to review entire summary'}
                    </span>
                  </div>

                  <div 
                    ref={summaryScrollRef}
                    onScroll={handleSummaryScroll}
                    className="max-h-[600px] overflow-y-auto p-4 space-y-4"
                  >
                    {/* Demographics Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <User size={16} />
                        Demographics & Basic Information
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Hospital No:</span>
                          <p className="font-medium">{selectedPatient?.hospitalNumber}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Age/Gender:</span>
                          <p className="font-medium">
                            {selectedPatient?.dateOfBirth && Math.floor((Date.now() - new Date(selectedPatient.dateOfBirth).getTime()) / 31557600000)} yrs / {selectedPatient?.gender}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Blood Group:</span>
                          <p className="font-medium">{selectedPatient?.bloodGroup || 'Not recorded'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Allergies:</span>
                          <p className="font-medium text-red-600">{selectedPatient?.allergies?.join(', ') || 'None known'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="font-medium">{selectedPatient?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Occupation:</span>
                          <p className="font-medium">{selectedPatient?.occupation || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Address:</span>
                          <p className="font-medium">{selectedPatient?.address || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* ALL DIAGNOSES - Consolidated from all encounters */}
                    {(() => {
                      const allDiagnoses: Array<{ diagnosis: string; type: string; date: Date; source: string }> = [];
                      
                      // From clinical encounters
                      patientEncounters?.forEach(enc => {
                        enc.diagnosis?.forEach(d => {
                          allDiagnoses.push({
                            diagnosis: typeof d === 'string' ? d : d.description || 'Unknown',
                            type: typeof d === 'object' && d.type ? d.type : 'clinical',
                            date: new Date(enc.startedAt),
                            source: `${enc.type} encounter`
                          });
                        });
                      });
                      
                      // From admissions
                      patientAdmissions?.forEach(adm => {
                        if (adm.admissionDiagnosis) {
                          allDiagnoses.push({
                            diagnosis: adm.admissionDiagnosis,
                            type: 'admission',
                            date: new Date(adm.admissionDate),
                            source: 'Admission diagnosis'
                          });
                        }
                      });

                      if (allDiagnoses.length === 0) return null;

                      // Deduplicate and sort by date
                      const uniqueDiagnoses = allDiagnoses.reduce((acc, curr) => {
                        const existing = acc.find(d => d.diagnosis.toLowerCase() === curr.diagnosis.toLowerCase());
                        if (!existing) acc.push(curr);
                        return acc;
                      }, [] as typeof allDiagnoses).sort((a, b) => b.date.getTime() - a.date.getTime());

                      return (
                        <div className="bg-rose-50 rounded-lg p-4 border-l-4 border-rose-500">
                          <h4 className="font-medium text-rose-700 mb-3 flex items-center gap-2">
                            <AlertCircle size={16} />
                            All Diagnoses Entertained ({uniqueDiagnoses.length})
                          </h4>
                          <div className="grid gap-2">
                            {uniqueDiagnoses.map((d, idx) => (
                              <div key={idx} className="bg-white rounded p-2 flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-800">{d.diagnosis}</p>
                                  <p className="text-xs text-gray-500">{d.source} • {format(d.date, 'PPP')}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  d.type === 'primary' ? 'bg-red-100 text-red-700' :
                                  d.type === 'admission' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {d.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Current Admission Section */}
                    {patientAdmissions && patientAdmissions.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                          <Bed size={16} />
                          Admission History ({patientAdmissions.length})
                        </h4>
                        {patientAdmissions.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()).map((admission, idx) => (
                          <div key={admission.id} className={`${idx > 0 ? 'mt-3 pt-3 border-t border-blue-200' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  admission.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {admission.status}
                                </span>
                                <p className="text-sm mt-1">
                                  <span className="font-medium">Admitted:</span> {format(new Date(admission.admissionDate), 'PPP')}
                                </p>
                              </div>
                              <div className="text-right text-sm">
                                <p className="text-gray-500">Ward: {admission.wardName}</p>
                                <p className="text-gray-500">Bed: {admission.bedNumber}</p>
                              </div>
                            </div>
                            <p className="text-sm"><span className="font-medium">Diagnosis:</span> {admission.admissionDiagnosis}</p>
                            {admission.status === 'active' && (
                              <p className="text-sm text-blue-600 font-medium mt-1">
                                Days in Hospital: {Math.ceil((Date.now() - new Date(admission.admissionDate).getTime()) / 86400000)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ward Rounds Section */}
                    {patientWardRounds && patientWardRounds.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-medium text-purple-700 mb-2 flex items-center gap-2">
                          <Stethoscope size={16} />
                          Ward Rounds ({patientWardRounds.length})
                        </h4>
                        <div className="space-y-2">
                          {patientWardRounds.sort((a, b) => new Date(b.roundDate).getTime() - new Date(a.roundDate).getTime()).slice(0, 5).map(round => (
                            <div key={round.id} className="text-sm border-l-2 border-purple-300 pl-3">
                              <p className="font-medium">{format(new Date(round.roundDate), 'PPP')} - {round.roundType}</p>
                              <p className="text-gray-600">{round.notes || 'No notes recorded'}</p>
                              <p className="text-purple-600 text-xs">Lead: {round.leadDoctorName}</p>
                            </div>
                          ))}
                          {patientWardRounds.length > 5 && (
                            <p className="text-sm text-purple-600 italic">+ {patientWardRounds.length - 5} more ward rounds</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Surgeries Section */}
                    {patientSurgeries && patientSurgeries.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                          <Syringe size={16} />
                          Surgical History ({patientSurgeries.length})
                        </h4>
                        <div className="space-y-2">
                          {patientSurgeries.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map(surgery => (
                            <div key={surgery.id} className="text-sm border-l-2 border-red-300 pl-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  surgery.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  surgery.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {surgery.status}
                                </span>
                                <span className="font-medium">{surgery.procedureName}</span>
                              </div>
                              <p className="text-gray-600">{format(new Date(surgery.scheduledDate), 'PPP')}</p>
                              {surgery.operativeNotes && <p className="text-gray-500 text-xs mt-1">{surgery.operativeNotes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Investigations Section */}
                    {patientInvestigations && patientInvestigations.length > 0 && (
                      <div className="bg-amber-50 rounded-lg p-4">
                        <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
                          <FlaskConical size={16} />
                          Investigations ({patientInvestigations.length})
                        </h4>
                        <div className="space-y-2">
                          {patientInvestigations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map(inv => (
                            <div key={inv.id} className="text-sm border-l-2 border-amber-300 pl-3 flex justify-between">
                              <div>
                                <span className="font-medium">{inv.type}</span>
                                <p className="text-gray-600 text-xs">{format(new Date(inv.createdAt), 'PPP')}</p>
                              </div>
                              <span className={`px-2 py-0.5 h-fit rounded text-xs ${
                                inv.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                          ))}
                          {patientInvestigations.length > 10 && (
                            <p className="text-sm text-amber-600 italic">+ {patientInvestigations.length - 10} more investigations</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lab Requests Section - Enhanced with Results */}
                    {patientLabRequests && patientLabRequests.length > 0 && (
                      <div className="bg-cyan-50 rounded-lg p-4">
                        <h4 className="font-medium text-cyan-700 mb-3 flex items-center gap-2">
                          <FlaskConical size={16} />
                          Laboratory Tests & Results ({patientLabRequests.length})
                        </h4>
                        <div className="space-y-3">
                          {patientLabRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()).slice(0, 10).map(lab => (
                            <div key={lab.id} className="bg-white rounded-lg p-3 border border-cyan-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-medium text-gray-800">{lab.tests?.map(t => t.name).join(', ') || 'Lab Test'}</span>
                                  <p className="text-xs text-gray-500">{format(new Date(lab.requestedAt), 'PPP')} • {lab.priority} priority</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  lab.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {lab.status}
                                </span>
                              </div>
                              {/* Show test results if completed */}
                              {lab.status === 'completed' && lab.tests && lab.tests.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-cyan-100">
                                  <p className="text-xs font-medium text-cyan-700 mb-1">Results:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {lab.tests.filter(t => t.result).map((test, idx) => (
                                      <div key={idx} className={`text-xs p-1.5 rounded ${
                                        test.isAbnormal ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                                      }`}>
                                        <span className="text-gray-600">{test.name}:</span>
                                        <span className={`ml-1 font-medium ${test.isAbnormal ? 'text-red-600' : 'text-gray-800'}`}>
                                          {test.result} {test.unit}
                                        </span>
                                        {test.referenceRange && (
                                          <span className="text-gray-400 ml-1">({test.referenceRange})</span>
                                        )}
                                        {test.isAbnormal && <TrendingUp className="inline ml-1 text-red-500" size={10} />}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Lab Trends Chart */}
                        {(() => {
                          // Extract numeric lab results for trending
                          const labTrendData: Array<{ date: string; [key: string]: any }> = [];
                          const labTestNames = new Set<string>();
                          
                          patientLabRequests
                            .filter(lab => lab.status === 'completed' && lab.tests)
                            .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())
                            .forEach(lab => {
                              const dataPoint: { date: string; [key: string]: any } = {
                                date: format(new Date(lab.requestedAt), 'MMM d')
                              };
                              lab.tests?.forEach(test => {
                                if (test.result) {
                                  const numVal = parseFloat(test.result);
                                  if (!isNaN(numVal)) {
                                    dataPoint[test.name] = numVal;
                                    labTestNames.add(test.name);
                                  }
                                }
                              });
                              if (Object.keys(dataPoint).length > 1) {
                                labTrendData.push(dataPoint);
                              }
                            });

                          if (labTrendData.length > 1 && labTestNames.size > 0) {
                            const colors = ['#0891b2', '#7c3aed', '#dc2626', '#059669', '#d97706'];
                            return (
                              <div className="mt-4 bg-white rounded-lg p-3">
                                <p className="text-xs font-medium text-cyan-700 mb-2 flex items-center gap-1">
                                  <TrendingUp size={12} /> Lab Results Trends
                                </p>
                                <ResponsiveContainer width="100%" height={150}>
                                  <LineChart data={labTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                                    {Array.from(labTestNames).slice(0, 5).map((name, idx) => (
                                      <Line 
                                        key={name}
                                        type="monotone" 
                                        dataKey={name} 
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        name={name}
                                      />
                                    ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Vital Signs Section - Enhanced with Trend Chart */}
                    {patientVitalSigns && patientVitalSigns.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                          <Activity size={16} />
                          Vital Signs Monitoring ({patientVitalSigns.length} recordings)
                        </h4>
                        
                        {/* Latest Vitals Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                          {(() => {
                            const sorted = [...patientVitalSigns].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
                            const latest = sorted[0];
                            const previous = sorted[1];
                            
                            const getTrendIcon = (current: number, prev: number | undefined, lowerBetter = false) => {
                              if (!prev) return <Minus size={10} className="text-gray-400" />;
                              if (current > prev) return lowerBetter ? 
                                <TrendingUp size={10} className="text-red-500" /> : 
                                <TrendingUp size={10} className="text-green-500" />;
                              if (current < prev) return lowerBetter ?
                                <TrendingDown size={10} className="text-green-500" /> :
                                <TrendingDown size={10} className="text-red-500" />;
                              return <Minus size={10} className="text-gray-400" />;
                            };
                            
                            return (
                              <>
                                <div className="text-sm bg-white p-2 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-1"><Droplets size={12} /> BP</span>
                                    {getTrendIcon(latest.bloodPressureSystolic, previous?.bloodPressureSystolic, true)}
                                  </div>
                                  <p className="font-bold text-lg">{latest.bloodPressureSystolic}/{latest.bloodPressureDiastolic}</p>
                                  <p className="text-xs text-gray-400">mmHg</p>
                                </div>
                                <div className="text-sm bg-white p-2 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-1"><Heart size={12} /> Pulse</span>
                                    {getTrendIcon(latest.pulse, previous?.pulse)}
                                  </div>
                                  <p className="font-bold text-lg">{latest.pulse}</p>
                                  <p className="text-xs text-gray-400">bpm</p>
                                </div>
                                <div className="text-sm bg-white p-2 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-1"><Thermometer size={12} /> Temp</span>
                                    {getTrendIcon(latest.temperature, previous?.temperature, true)}
                                  </div>
                                  <p className="font-bold text-lg">{latest.temperature}</p>
                                  <p className="text-xs text-gray-400">°C</p>
                                </div>
                                <div className="text-sm bg-white p-2 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-500">SpO2</span>
                                    {getTrendIcon(latest.oxygenSaturation, previous?.oxygenSaturation)}
                                  </div>
                                  <p className="font-bold text-lg">{latest.oxygenSaturation}%</p>
                                  <p className="text-xs text-gray-400">Oxygen</p>
                                </div>
                                <div className="text-sm bg-white p-2 rounded border border-green-200">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-500">RR</span>
                                    {getTrendIcon(latest.respiratoryRate, previous?.respiratoryRate, true)}
                                  </div>
                                  <p className="font-bold text-lg">{latest.respiratoryRate}</p>
                                  <p className="text-xs text-gray-400">/min</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-3">
                          Last recorded: {format(new Date(patientVitalSigns.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0].recordedAt), 'PPP p')}
                        </p>

                        {/* Vitals Trend Chart */}
                        {patientVitalSigns.length > 1 && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                              <TrendingUp size={12} /> Vital Signs Trends (Last {Math.min(patientVitalSigns.length, 10)} readings)
                            </p>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={
                                [...patientVitalSigns]
                                  .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
                                  .slice(-10)
                                  .map(v => ({
                                    time: format(new Date(v.recordedAt), 'MMM d HH:mm'),
                                    'BP Systolic': v.bloodPressureSystolic,
                                    'Pulse': v.pulse,
                                    'SpO2': v.oxygenSaturation,
                                  }))
                              }>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="time" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ fontSize: '11px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'SBP High', fontSize: 8 }} />
                                <Line type="monotone" dataKey="BP Systolic" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                                <Line type="monotone" dataKey="Pulse" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                                <Line type="monotone" dataKey="SpO2" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prescriptions Section - Enhanced with Medication Details */}
                    {patientPrescriptions && patientPrescriptions.length > 0 && (
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <h4 className="font-medium text-indigo-700 mb-3 flex items-center gap-2">
                          <Pill size={16} />
                          Current Medications & Prescriptions ({patientPrescriptions.length})
                        </h4>
                        <div className="space-y-3">
                          {patientPrescriptions.sort((a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime()).slice(0, 5).map(rx => (
                            <div key={rx.id} className="bg-white rounded-lg p-3 border border-indigo-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs text-gray-500">{format(new Date(rx.prescribedAt), 'PPP')}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  rx.status === 'dispensed' ? 'bg-green-100 text-green-700' : 
                                  rx.status === 'partially_dispensed' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{rx.status}</span>
                              </div>
                              {/* List all medications in this prescription */}
                              {rx.medications && rx.medications.length > 0 && (
                                <div className="space-y-1">
                                  {rx.medications.map((med, idx) => (
                                    <div key={idx} className={`text-sm p-2 rounded ${
                                      med.isDispensed ? 'bg-green-50' : 'bg-yellow-50'
                                    }`}>
                                      <div className="flex justify-between">
                                        <span className="font-medium text-gray-800">{med.name}</span>
                                        {med.isDispensed ? 
                                          <CheckCircle2 size={14} className="text-green-500" /> :
                                          <Clock size={14} className="text-yellow-500" />
                                        }
                                      </div>
                                      <p className="text-xs text-gray-600">
                                        {med.dosage} • {med.frequency} • {med.route} • {med.duration}
                                      </p>
                                      {med.instructions && (
                                        <p className="text-xs text-indigo-600 italic mt-1">{med.instructions}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {rx.notes && (
                                <p className="text-xs text-gray-500 mt-2 italic">Note: {rx.notes}</p>
                              )}
                            </div>
                          ))}
                          {patientPrescriptions.length > 5 && (
                            <p className="text-sm text-indigo-600 italic">+ {patientPrescriptions.length - 5} more prescriptions</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Wounds Section */}
                    {patientWounds && patientWounds.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-4">
                        <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                          <Target size={16} />
                          Wound Assessments ({patientWounds.length})
                        </h4>
                        <div className="space-y-2">
                          {patientWounds.map(wound => (
                            <div key={wound.id} className="text-sm border-l-2 border-orange-300 pl-3">
                              <span className="font-medium">{wound.type} - {wound.location}</span>
                              <p className="text-gray-600">Size: {wound.length}x{wound.width}{wound.depth ? `x${wound.depth}` : ''}cm</p>
                              <p className="text-orange-600">Progress: {wound.healingProgress}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Burns Section */}
                    {patientBurns && patientBurns.length > 0 && (
                      <div className="bg-rose-50 rounded-lg p-4">
                        <h4 className="font-medium text-rose-700 mb-2 flex items-center gap-2">
                          <AlertTriangle size={16} />
                          Burn Assessments ({patientBurns.length})
                        </h4>
                        <div className="space-y-2">
                          {patientBurns.map(burn => (
                            <div key={burn.id} className="text-sm border-l-2 border-rose-300 pl-3">
                              <span className="font-medium">TBSA: {burn.tbsaPercentage}% - {burn.burnType}</span>
                              <p className="text-gray-600">{format(new Date(burn.createdAt), 'PPP')}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nutrition Section */}
                    {patientNutrition && patientNutrition.length > 0 && (
                      <div className="bg-lime-50 rounded-lg p-4">
                        <h4 className="font-medium text-lime-700 mb-2 flex items-center gap-2">
                          <Heart size={16} />
                          Nutrition Assessments ({patientNutrition.length})
                        </h4>
                        <div className="space-y-2">
                          {patientNutrition.sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()).slice(0, 3).map(nutr => (
                            <div key={nutr.id} className="text-sm border-l-2 border-lime-300 pl-3">
                              <p className="font-medium">{format(new Date(nutr.assessedAt), 'PPP')}</p>
                              <p className="text-gray-600">BMI: {nutr.bmi || 'N/A'} | MUST Score: {typeof nutr.mustScore === 'object' ? (nutr.mustScore as any).total || 'N/A' : nutr.mustScore}</p>
                              {nutr.nutritionalDiagnosis && <p className="text-lime-600 text-xs">{nutr.nutritionalDiagnosis}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Treatment Plans Section */}
                    {patientTreatmentPlans && patientTreatmentPlans.length > 0 && (
                      <div className="bg-violet-50 rounded-lg p-4 border-l-4 border-violet-500">
                        <h4 className="font-medium text-violet-700 mb-3 flex items-center gap-2">
                          <Clipboard size={16} />
                          Specialty Treatment Plans ({patientTreatmentPlans.length})
                        </h4>
                        <div className="space-y-3">
                          {patientTreatmentPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(plan => (
                            <div key={plan.id} className="bg-white rounded-lg p-3 border border-violet-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-medium text-gray-800">{plan.title}</span>
                                  <p className="text-xs text-gray-500">{format(new Date(plan.createdAt), 'PPP')}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {plan.status}
                                </span>
                              </div>
                              {/* Show clinical goals */}
                              {plan.clinicalGoals && plan.clinicalGoals.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-violet-600 mb-1">Goals:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {plan.clinicalGoals.slice(0, 3).map((goal, idx) => (
                                      <li key={idx} className="flex items-start gap-1">
                                        <Target size={10} className="mt-0.5 text-violet-500" />
                                        <span>{typeof goal === 'string' ? goal : goal.description || 'Goal'}</span>
                                      </li>
                                    ))}
                                    {plan.clinicalGoals.length > 3 && (
                                      <li className="text-violet-500">+ {plan.clinicalGoals.length - 3} more goals</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clinical Encounters Section - Enhanced with Full Details */}
                    {patientEncounters && patientEncounters.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                          <FileText size={16} />
                          Clinical Records & Documentation ({patientEncounters.length})
                        </h4>
                        <div className="space-y-3">
                          {patientEncounters.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 8).map(enc => (
                            <div key={enc.id} className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    enc.type === 'emergency' ? 'bg-red-100 text-red-700' :
                                    enc.type === 'surgical' ? 'bg-purple-100 text-purple-700' :
                                    enc.type === 'inpatient' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>{enc.type}</span>
                                  <span className="text-xs text-gray-500">{format(new Date(enc.startedAt), 'PPP')}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  enc.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  enc.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{enc.status}</span>
                              </div>
                              
                              {/* Chief Complaint */}
                              {enc.chiefComplaint && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-gray-700">Chief Complaint:</p>
                                  <p className="text-sm text-gray-800">{enc.chiefComplaint}</p>
                                </div>
                              )}
                              
                              {/* History of Present Illness */}
                              {enc.historyOfPresentIllness && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-gray-700">History of Present Illness:</p>
                                  <p className="text-xs text-gray-600 line-clamp-2">{enc.historyOfPresentIllness}</p>
                                </div>
                              )}
                              
                              {/* Diagnoses from this encounter */}
                              {enc.diagnosis && enc.diagnosis.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <p className="text-xs font-medium text-slate-600 mb-1">Diagnoses:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {enc.diagnosis.map((d, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-gray-700">
                                        {typeof d === 'string' ? d : d.description || 'Diagnosis'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Treatment Plan from encounter */}
                              {enc.treatmentPlan && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <p className="text-xs font-medium text-slate-600 mb-1">Treatment Plan:</p>
                                  <p className="text-xs text-gray-600 line-clamp-2">{enc.treatmentPlan}</p>
                                </div>
                              )}
                              
                              {/* Notes */}
                              {enc.notes && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 italic line-clamp-2">{enc.notes}</p>
                                </div>
                              )}
                              
                              <p className="text-xs text-slate-500 mt-2">
                                By: {enc.attendingClinician || 'Unknown clinician'}
                              </p>
                            </div>
                          ))}
                          {patientEncounters.length > 8 && (
                            <p className="text-sm text-slate-600 italic text-center">+ {patientEncounters.length - 8} more clinical encounters</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* MDT Specialty Plans from This System */}
                    {patientPlans && patientPlans.length > 0 && (
                      <div className="bg-teal-50 rounded-lg p-4 border-l-4 border-teal-500">
                        <h4 className="font-medium text-teal-700 mb-3 flex items-center gap-2">
                          <Users size={16} />
                          MDT Specialty Recommendations ({patientPlans.length})
                        </h4>
                        <div className="space-y-3">
                          {patientPlans.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(plan => (
                            <div key={plan.id} className="bg-white rounded-lg p-3 border border-teal-200">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: specialtyDefinitions[plan.specialty as SpecialtyType]?.color || '#6b7280' }}
                                  />
                                  <span className="font-medium text-gray-800">
                                    {specialtyDefinitions[plan.specialty as SpecialtyType]?.name || plan.specialty}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  plan.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>{plan.status}</span>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{format(new Date(plan.submittedAt), 'PPP')} by {plan.submittedBy?.name || 'Unknown'}</p>
                              
                              {/* Clinical Findings */}
                              {plan.clinicalFindings && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-teal-600">Clinical Findings:</p>
                                  <p className="text-xs text-gray-600">{plan.clinicalFindings}</p>
                                </div>
                              )}
                              
                              {/* Recommendations */}
                              {plan.recommendations && plan.recommendations.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-teal-600">Recommendations:</p>
                                  <ul className="text-xs text-gray-600 space-y-1 mt-1">
                                    {plan.recommendations.slice(0, 3).map((rec, idx) => (
                                      <li key={idx} className="flex items-start gap-1">
                                        <CheckCircle2 size={10} className="mt-0.5 text-teal-500" />
                                        <span>{rec.description}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* End of Summary Marker */}
                    <div ref={endOfSummaryRef} className="text-center py-4 border-t border-dashed border-gray-300">
                      <p className="text-sm text-gray-500">— End of Patient Summary —</p>
                      {!hasScrolledToEnd && (
                        <>
                          <p className="text-xs text-primary-600 animate-pulse mt-1">
                            Continue scrolling to review full summary
                          </p>
                          <label className="flex items-center justify-center gap-2 mt-3 cursor-pointer">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setHasScrolledToEnd(true);
                                }
                              }}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              title="Confirm patient summary reviewed"
                            />
                            <span className="text-xs text-gray-600">I have reviewed the complete patient summary</span>
                          </label>
                        </>
                      )}
                      {hasScrolledToEnd && (
                        <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                          <CheckCircle2 size={12} />
                          Summary reviewed - You can now add treatment plans
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specialty Plans Section - Only visible after summary review */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    Specialty Treatment Plans for {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </h3>
                  {hasScrolledToEnd ? (
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add Plan
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn bg-gray-300 text-gray-500 cursor-not-allowed flex items-center gap-2"
                      title="Please scroll through the entire patient summary first"
                    >
                      <Plus size={18} />
                      Add Plan
                    </button>
                  )}
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
                                <input type="checkbox" className="mt-1" checked={goal.status === 'achieved'} readOnly title="Goal achievement status" />
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

      {/* Pending MDT Invitations Banner - Shows for specialists with pending invitations */}
      {myPendingInvitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Bell className="text-white" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg">You Have {myPendingInvitations.length} MDT Invitation{myPendingInvitations.length > 1 ? 's' : ''}</h3>
              <p className="text-purple-100 text-sm">Please review and submit your specialty treatment plans</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {myPendingInvitations.map((invitation) => (
              <div 
                key={invitation.id}
                className="bg-white/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1">
                  <p className="font-semibold">
                    Patient: {invitation.patientName}
                  </p>
                  <p className="text-purple-100 text-sm">
                    Hospital: {invitation.hospitalName} • Invited by {invitation.invitedByName}
                  </p>
                  <p className="text-purple-200 text-xs mt-1">
                    {format(new Date(invitation.createdAt), 'PPP p')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      // Acknowledge and go to plans tab with patient selected
                      await acknowledgeMDTInvitation(invitation.id);
                      setSelectedPatientId(invitation.patientId);
                      setActiveTab('plans');
                      // Refresh invitations
                      if (user?.id) {
                        setMyPendingInvitations(getPendingMDTInvitations(user.id));
                      }
                      toast.success(`Selected patient: ${invitation.patientName}. Please submit your specialty plan.`);
                    }}
                    className="px-4 py-2 bg-white text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Add My Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Submit Specialty Treatment Plan</h2>
                  {speech.isSupported && (
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      speech.isListening 
                        ? 'bg-red-100 text-red-700 animate-pulse' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Mic size={12} />
                      {speech.isListening ? 'Listening...' : 'Voice ready'}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
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
                    title="Select specialty"
                  >
                    {Object.entries(specialtyDefinitions).map(([key, spec]) => (
                      <option key={key} value={key}>{spec.name}</option>
                    ))}
                  </select>
                </div>

                {/* Clinical Findings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Clinical Findings</label>
                    {renderSpeechButton('clinicalFindings')}
                  </div>
                  <div className="relative">
                    <textarea
                      value={clinicalFindings}
                      onChange={(e) => setClinicalFindings(e.target.value)}
                      rows={3}
                      className={`w-full px-4 py-2 border rounded-lg ${
                        activeSpeechField === 'clinicalFindings' && speech.isListening 
                          ? 'border-red-400 ring-2 ring-red-200' 
                          : 'border-gray-200'
                      }`}
                      placeholder="Document relevant clinical findings... (or use mic button)"
                    />
                    {activeSpeechField === 'clinicalFindings' && speech.interimTranscript && (
                      <p className="text-sm text-gray-400 italic mt-1">
                        {speech.interimTranscript}...
                      </p>
                    )}
                  </div>
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
                        className={`flex-1 px-4 py-2 border rounded-lg ${
                          activeSpeechField === `diagnosis-${idx}` && speech.isListening 
                            ? 'border-red-400 ring-2 ring-red-200' 
                            : 'border-gray-200'
                        }`}
                        placeholder="Enter diagnosis"
                      />
                      {renderSpeechButton(`diagnosis-${idx}`)}
                      {idx > 0 && (
                        <button
                          onClick={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500"
                          title="Remove diagnosis"
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
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={rec.category}
                            onChange={(e) => {
                              const updated = [...recommendations];
                              updated[idx] = { ...rec, category: e.target.value };
                              setRecommendations(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded ${
                              activeSpeechField === `rec-category-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Category"
                          />
                          {renderSpeechButton(`rec-category-${idx}`, 14)}
                        </div>
                        <select
                          value={rec.priority}
                          onChange={(e) => {
                            const updated = [...recommendations];
                            updated[idx] = { ...rec, priority: e.target.value as any };
                            setRecommendations(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded"
                          title="Select recommendation priority"
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={rec.description}
                          onChange={(e) => {
                            const updated = [...recommendations];
                            updated[idx] = { ...rec, description: e.target.value };
                            setRecommendations(updated);
                          }}
                          className={`flex-1 px-3 py-2 border rounded ${
                            activeSpeechField === `rec-desc-${idx}` && speech.isListening 
                              ? 'border-red-400 ring-2 ring-red-200' 
                              : 'border-gray-200'
                          }`}
                          placeholder="Description"
                          rows={2}
                        />
                        {renderSpeechButton(`rec-desc-${idx}`, 14)}
                      </div>
                      {(activeSpeechField === `rec-category-${idx}` || activeSpeechField === `rec-desc-${idx}`) && speech.interimTranscript && (
                        <p className="text-xs text-gray-400 italic mt-1">
                          {speech.interimTranscript}...
                        </p>
                      )}
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
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <div className="flex gap-1 flex-1 min-w-[150px]">
                          <input
                            type="text"
                            value={med.medicationName}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[idx] = { ...med, medicationName: e.target.value };
                              setMedications(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded ${
                              activeSpeechField === `med-name-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Medication name"
                          />
                          {renderSpeechButton(`med-name-${idx}`, 14)}
                        </div>
                        <div className="flex gap-1 flex-1 min-w-[120px]">
                          <input
                            type="text"
                            value={med.dose}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[idx] = { ...med, dose: e.target.value };
                              setMedications(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded ${
                              activeSpeechField === `med-dose-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Dose"
                          />
                          {renderSpeechButton(`med-dose-${idx}`, 14)}
                        </div>
                        <select
                          value={med.action}
                          onChange={(e) => {
                            const updated = [...medications];
                            updated[idx] = { ...med, action: e.target.value as any };
                            setMedications(updated);
                          }}
                          className="px-3 py-2 border border-gray-200 rounded min-w-[110px]"
                          title="Select medication action"
                        >
                          <option value="add">Add</option>
                          <option value="continue">Continue</option>
                          <option value="modify">Modify</option>
                          <option value="discontinue">Discontinue</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex gap-1 flex-1">
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[idx] = { ...med, frequency: e.target.value };
                              setMedications(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded ${
                              activeSpeechField === `med-freq-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Frequency (e.g., BD, TDS)"
                          />
                          {renderSpeechButton(`med-freq-${idx}`, 14)}
                        </div>
                        <div className="flex gap-1 flex-1">
                          <input
                            type="text"
                            value={med.indication}
                            onChange={(e) => {
                              const updated = [...medications];
                              updated[idx] = { ...med, indication: e.target.value };
                              setMedications(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded ${
                              activeSpeechField === `med-indication-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Indication"
                          />
                          {renderSpeechButton(`med-indication-${idx}`, 14)}
                        </div>
                      </div>
                      {['med-name-', 'med-dose-', 'med-freq-', 'med-indication-'].some(
                        prefix => activeSpeechField === `${prefix}${idx}`
                      ) && speech.interimTranscript && (
                        <p className="text-xs text-gray-400 italic mt-1">
                          {speech.interimTranscript}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={goal.description}
                            onChange={(e) => {
                              const updated = [...shortTermGoals];
                              updated[idx] = { ...goal, description: e.target.value };
                              setShortTermGoals(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded text-sm ${
                              activeSpeechField === `shortGoal-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Goal description"
                          />
                          {renderSpeechButton(`shortGoal-${idx}`, 14)}
                        </div>
                        {activeSpeechField === `shortGoal-${idx}` && speech.interimTranscript && (
                          <p className="text-xs text-gray-400 italic mt-1">
                            {speech.interimTranscript}...
                          </p>
                        )}
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
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={goal.description}
                            onChange={(e) => {
                              const updated = [...longTermGoals];
                              updated[idx] = { ...goal, description: e.target.value };
                              setLongTermGoals(updated);
                            }}
                            className={`flex-1 px-3 py-2 border rounded text-sm ${
                              activeSpeechField === `longGoal-${idx}` && speech.isListening 
                                ? 'border-red-400 ring-2 ring-red-200' 
                                : 'border-gray-200'
                            }`}
                            placeholder="Goal description"
                          />
                          {renderSpeechButton(`longGoal-${idx}`, 14)}
                        </div>
                        {activeSpeechField === `longGoal-${idx}` && speech.interimTranscript && (
                          <p className="text-xs text-gray-400 italic mt-1">
                            {speech.interimTranscript}...
                          </p>
                        )}
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
                <button onClick={() => setShowMeetingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                  <PatientSelector
                    value={selectedPatientId}
                    onChange={(patientId) => {
                      setSelectedPatientId(patientId || '');
                      setShowPatientSummary(false);
                    }}
                    placeholder="Search patient by name or hospital number..."
                  />
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
                      title="Select meeting date and time"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <select 
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      title="Select meeting duration"
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

                {/* Invite Specialists Section */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <label className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-2">
                    <UserPlus size={16} />
                    Invite Specialists (Push Notifications)
                    <span className="text-purple-400 font-normal ml-1">(They will receive repeated alerts until they respond)</span>
                  </label>
                  
                  {/* Search Input */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={specialistSearch}
                      onChange={(e) => setSpecialistSearch(e.target.value)}
                      placeholder="Search specialists by name, role, or specialty..."
                      className="w-full px-4 py-2 pl-10 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400" size={16} />
                  </div>
                  
                  {/* Selected Specialists */}
                  {selectedSpecialists.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-purple-600 mb-2">Selected ({selectedSpecialists.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSpecialists.map((specialist) => (
                          <div
                            key={specialist.userId}
                            className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm"
                          >
                            <User size={14} />
                            <span>{specialist.name}</span>
                            <span className="text-purple-500">({specialist.specialty})</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSpecialists(prev => prev.filter(s => s.userId !== specialist.userId))}
                              className="ml-1 text-purple-500 hover:text-purple-700"
                              title={`Remove ${specialist.name}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Available Specialists List */}
                  <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-purple-100">
                    {filteredSpecialists.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {specialistSearch ? 'No specialists found matching your search' : 'No specialists available'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredSpecialists
                          .filter(s => s.id !== user?.id) // Exclude current user
                          .filter(s => !selectedSpecialists.some(sel => sel.userId === s.id)) // Exclude already selected
                          .slice(0, 20)
                          .map((specialist) => (
                            <button
                              key={specialist.id}
                              type="button"
                              onClick={() => {
                                setSelectedSpecialists(prev => [...prev, {
                                  userId: specialist.id,
                                  name: `${specialist.firstName} ${specialist.lastName}`,
                                  specialty: specialist.specialization || specialist.role || 'General',
                                  email: specialist.email,
                                  role: specialist.role || 'doctor',
                                }]);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 transition-colors text-left"
                            >
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="text-purple-600" size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800">
                                  {specialist.firstName} {specialist.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {specialist.specialization || specialist.role} 
                                  {specialist.email && ` • ${specialist.email}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                                  {specialist.role}
                                </span>
                                <Plus size={16} className="text-purple-500" />
                              </div>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  
                  {/* Notification Info */}
                  <div className="mt-3 flex items-start gap-2 text-xs text-purple-600 bg-purple-100/50 rounded p-2">
                    <Bell size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Push Notifications with Voice Announcements</p>
                      <p className="text-purple-500">Selected specialists will receive repeated push notifications with voice announcements (patient name + hospital) until they submit their specialty plan for this patient.</p>
                    </div>
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
                    setSelectedSpecialists([]);
                    setSpecialistSearch('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMeeting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
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
