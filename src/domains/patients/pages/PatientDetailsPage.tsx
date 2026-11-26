import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  Calendar,
  AlertTriangle,
  BedDouble,
  X,
  Save,
  ClipboardList,
  FileScan,
  Sparkles,
  TestTube2,
  CircleDot,
  ListChecks,
  Pill,
  BookOpen,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { format } from 'date-fns';
import ScannedDocumentsPanel from '../../document-scanner/components/ScannedDocumentsPanel';
import StructuredEncountersPanel from '../../clinical/components/clerking/StructuredEncounters';
import { patientContext, patientIdentifiers, patientLabelOf } from '../../clinical/services/clerkingService';
import AIClinicalAssistant from '../../ai-assistant/components/AIClinicalAssistant';
import AdmissionDurationClock, { AdmissionDurationBadge } from '../../admissions/components/AdmissionDurationClock';
import { generateEncounterPDFFromEntity } from '../../../utils/clinicalPdfGenerators';
import { EntryTrackingBadge } from '../../../components/common';
import { syncRecord } from '../../../services/cloudSyncService';
import type { EntryTrackingInfo } from '../../../components/common';
import type { User as UserType, VitalSigns, ClinicalEncounter, Patient, BloodGroup, Genotype } from '../../../types';
import { ageInYears } from '../../../utils/safeDate';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import { isArchivedPatient } from '../services/patientArchiveRules';
import {
  buildPatientTimeline, joinAddress, whatsappNumber, TAB_OF_KIND,
  type HubTab, type TimelineItem, type TimelineKind,
} from '../patientTimeline';
import { hubQuickActions, hubModuleLinks } from '../patientHubLinks';
import StartConsultationSheet from '../components/StartConsultationSheet';

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
  // A patient can now be registered from the wound module with only a name,
  // folder number and gender, so every date on the record must tolerate being
  // absent or unparseable. date-fns format() throws on an invalid date rather
  // than returning something harmless.
  const getDateString = (date: Date | string | undefined | null) => {
    if (!date) return '';
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
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
        // An age-only registration stores an estimated DOB; entering a date
        // here replaces the estimate with a real date of birth.
        dobEstimated: formData.dateOfBirth === getDateString(patient.dateOfBirth) ? patient.dobEstimated : false,
        gender: formData.gender as 'male' | 'female',
        bloodGroup: formData.bloodGroup as BloodGroup || undefined,
        genotype: formData.genotype as Genotype || undefined,
        maritalStatus: (formData.maritalStatus || undefined) as 'single' | 'married' | 'divorced' | 'widowed',
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
                <label className="label">Marital Status</label>
                <select
                  value={formData.maritalStatus || ''}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as 'single' | 'married' | 'divorced' | 'widowed' })}
                  className="input"
                  title="Select marital status"
                >
                  <option value="">Not recorded</option>
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

const HUB_TABS: { id: HubTab; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'visits', label: 'Visits' },
  { id: 'surgery', label: 'Surgery' },
  { id: 'wounds', label: 'Wounds & photos' },
  { id: 'results', label: 'Results' },
  { id: 'plans', label: 'Plans' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'documents', label: 'Documents' },
];

const KIND_ICON: Record<TimelineKind, ReactNode> = {
  visit: <Stethoscope size={16} className="text-sky-600" />,
  clerking: <ClipboardList size={16} className="text-emerald-600" />,
  procedure_review: <ClipboardList size={16} className="text-indigo-600" />,
  surgery: <Scissors size={16} className="text-purple-600" />,
  post_op_note: <FileText size={16} className="text-purple-500" />,
  investigation: <TestTube2 size={16} className="text-violet-600" />,
  lab_request: <TestTube2 size={16} className="text-violet-500" />,
  wound_assessment: <CircleDot size={16} className="text-rose-600" />,
  treatment_plan: <ListChecks size={16} className="text-teal-600" />,
  appointment: <Calendar size={16} className="text-emerald-600" />,
  admission: <BedDouble size={16} className="text-amber-600" />,
  discharge: <BedDouble size={16} className="text-gray-500" />,
  prescription: <Pill size={16} className="text-pink-600" />,
  document: <FileScan size={16} className="text-indigo-500" />,
  education: <BookOpen size={16} className="text-sky-500" />,
};

const isTab = (t: string | null): t is HubTab => !!t && HUB_TABS.some(x => x.id === t);
const statusLabel = (s?: string) => (s || '').replace(/[_-]+/g, ' ');

function TimelineList({ items, empty }: { items: TimelineItem[]; empty: string }) {
  if (items.length === 0) return <p className="px-4 py-6 text-sm text-gray-500 text-center">{empty}</p>;
  return (
    <ol className="divide-y divide-gray-100">
      {items.map(i => (
        <li key={`${i.kind}-${i.id}`}>
          <Link to={i.href} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none">
            <span className="mt-0.5 p-1.5 rounded-lg bg-gray-50 flex-shrink-0" aria-hidden="true">{KIND_ICON[i.kind]}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-900">{i.title}</span>
              {i.detail && <span className="block text-sm text-gray-600 truncate">{i.detail}</span>}
              <span className="block text-xs text-gray-500 mt-0.5">
                {formatDateTime(i.at)}
                {i.upcoming && <span className="ml-2 text-emerald-700 font-medium">Upcoming</span>}
                {i.status && <span className="ml-2 capitalize">· {statusLabel(i.status)}</span>}
              </span>
            </span>
            <ChevronRight size={16} className="text-gray-300 mt-1 flex-shrink-0" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card card-compact" aria-label={title}>
      <div className="card-header flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showConsult, setShowConsult] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: HubTab = isTab(tabParam) ? tabParam : 'timeline';
  const clerk = searchParams.get('clerk');
  const autoOpen = clerk === 'initial' || clerk === 'follow_up' ? clerk : undefined;

  const setTab = (t: HubTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', t);
    next.delete('clerk');
    setSearchParams(next, { replace: true });
  };

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // The patient list's Edit icon links here with ?edit=true: open the edit
  // modal once the patient has loaded, then drop the flag so closing the
  // modal (or a reload) does not reopen it.
  useEffect(() => {
    if (patient && searchParams.get('edit') === 'true') {
      setShowEditModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [patient, searchParams, setSearchParams]);

  // ?consult=1 (the link back from the encounter form) opens the chooser.
  useEffect(() => {
    if (patient && searchParams.get('consult') === '1') {
      setShowConsult(true);
      const next = new URLSearchParams(searchParams);
      next.delete('consult');
      setSearchParams(next, { replace: true });
    }
  }, [patient, searchParams, setSearchParams]);

  // Everything recorded about this patient, read live from each table.
  const records = useLiveQuery(async () => {
    if (!patientId) return undefined;
    const pid = patientId;
    const [
      encounters, surgeries, postOpNotes, investigations, labRequests, woundAssessments, monitoredWounds,
      treatmentPlans, appointments, admissions, dischargeSummaries, prescriptions, scannedDocuments,
      educationRecords, vitals,
    ] = await Promise.all([
      db.clinicalEncounters.where('patientId').equals(pid).toArray(),
      db.surgeries.where('patientId').equals(pid).toArray(),
      db.postOperativeNotes.where('patientId').equals(pid).toArray(),
      db.investigations.where('patientId').equals(pid).toArray(),
      db.labRequests.where('patientId').equals(pid).toArray(),
      db.woundAssessments.where('patientId').equals(pid).toArray(),
      db.monitoredWounds.where('patientId').equals(pid).toArray(),
      db.treatmentPlans.where('patientId').equals(pid).toArray(),
      db.appointments.where('patientId').equals(pid).toArray(),
      db.admissions.where('patientId').equals(pid).toArray(),
      db.dischargeSummaries.where('patientId').equals(pid).toArray(),
      db.prescriptions.where('patientId').equals(pid).toArray(),
      db.scannedDocuments.where('patientId').equals(pid).toArray(),
      db.patientEducationRecords.where('patientId').equals(pid).toArray(),
      db.vitalSigns.where('patientId').equals(pid).toArray(),
    ]);
    return {
      encounters, surgeries, postOpNotes, investigations, labRequests, woundAssessments, monitoredWounds,
      treatmentPlans, appointments, admissions, dischargeSummaries, prescriptions, scannedDocuments,
      educationRecords, vitals,
    };
  }, [patientId]);

  const timeline = useMemo(
    () => (patientId && records ? buildPatientTimeline({ patientId, ...records }) : []),
    [patientId, records],
  );
  const byTab = useMemo(() => {
    const m = new Map<HubTab, TimelineItem[]>();
    for (const i of timeline) {
      const t = TAB_OF_KIND[i.kind];
      m.set(t, [...(m.get(t) ?? []), i]);
    }
    return m;
  }, [timeline]);

  const activeAdmission = records?.admissions.find(a => a.status === 'active');
  const vitals = useMemo(
    () => [...(records?.vitals ?? [])]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 5),
    [records?.vitals],
  );
  const visitNotes = useMemo(
    () => (records?.encounters ?? [])
      .filter(e => !e.clerking && !e.procedureReview)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
    [records?.encounters],
  );
  const hasInitialClerking = (records?.encounters ?? []).some(
    e => e.clerking?.kind === 'initial' && !['entered_in_error', 'draft'].includes(e.clerking.status),
  );

  // Fetch users for entry tracking display
  const users = useLiveQuery(() => db.users.toArray(), []);
  const usersMap = useMemo(() => {
    const map = new Map<string, UserType>();
    if (users) {
      users.forEach(u => map.set(u.id!, u));
    }
    return map;
  }, [users]);

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

  const age = ageInYears(patient.dateOfBirth);
  const ageText = age === null
    ? 'Age not recorded'
    : patient.dobEstimated ? `~${age} y (estimated)` : `${age} y`;
  const sexText = patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : '';
  const fullName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');
  const archived = isArchivedPatient(patient);
  const wa = whatsappNumber(patient.phone);
  const allergies = (patient.allergies ?? []).filter(Boolean);
  const conditions = (patient.chronicConditions ?? []).filter(Boolean);
  const address = joinAddress(patient.address, patient.city, patient.state);
  const nok = patient.nextOfKin;
  const quick = hubQuickActions(patient.id);
  const modules = hubModuleLinks(patient.id);
  const count = (t: HubTab) => (t === 'timeline' ? timeline.length : byTab.get(t)?.length ?? 0);
  const upcoming = timeline.filter(i => i.upcoming).reverse();
  const tabItems = (t: HubTab) => byTab.get(t) ?? [];

  const quickActionsCard = (
    <Card title="Quick actions">
      <div className="p-3 grid grid-cols-2 gap-2">
        {quick.map(a => (
          <Link key={a.id} to={a.href} className="px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-800">
            {a.label}
          </Link>
        ))}
        <button type="button" onClick={() => setShowEditModal(true)} className="px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-800 text-left">
          Edit patient
        </button>
      </div>
      <div className="px-3 pb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">Open with this patient</p>
        <div className="flex flex-wrap gap-2">
          {modules.map(m => (
            <Link key={m.id} to={m.href} className="px-3 py-1.5 text-sm rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50">
              {m.label}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
      >
        <ArrowLeft size={18} />
        Patients
      </button>

      {/* A registration retired by a duplicate merge: everything moved to the kept record. */}
      {patient.mergedInto && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This was a duplicate registration and has been merged. Its records are now on{' '}
          <Link to={`/patients/${patient.mergedInto}`} className="font-semibold underline">the kept patient record</Link>.
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-xl flex items-center justify-center text-white text-lg sm:text-2xl font-bold flex-shrink-0">
              {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{fullName}</h1>
                {archived && <span className="badge badge-warning">Archived</span>}
                {activeAdmission && <span className="badge badge-success">Admitted</span>}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {[ageText, sexText].filter(Boolean).join(' · ')}
                {patient.dateOfBirth && age !== null && (
                  <span className="text-gray-400"> · born {formatDate(patient.dateOfBirth)}</span>
                )}
              </p>
              <p className="text-sm text-gray-600 font-mono mt-0.5">{patient.hospitalNumber}</p>
            </div>
          </div>

          {patient.phone && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={`tel:${patient.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 text-sky-800 text-sm font-medium hover:bg-sky-100">
                <Phone size={16} aria-hidden="true" /> {patient.phone}
              </a>
              {wa && (
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-medium hover:bg-emerald-100">
                  <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                </a>
              )}
            </div>
          )}

          {allergies.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Allergies">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                <AlertTriangle size={14} aria-hidden="true" /> Allergies:
              </span>
              {allergies.map((a, i) => <span key={`a${i}`} className="badge badge-danger">{a}</span>)}
            </div>
          )}
          {conditions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Chronic conditions">
              <span className="text-xs font-semibold text-amber-700">Conditions:</span>
              {conditions.map((c, i) => <span key={`c${i}`} className="badge badge-warning">{c}</span>)}
            </div>
          )}

          {/* Actions: wrap on narrow screens; the phone uses the bottom bar. */}
          <div className="hidden sm:flex flex-wrap gap-2 mt-4">
            <button type="button" onClick={() => setShowConsult(true)} className="btn btn-primary">
              <Stethoscope size={18} /> Start consultation
            </button>
            <Link to={quick[0].href} className="btn btn-secondary"><Calendar size={18} /> Book appointment</Link>
            <Link to={`/patients/${patient.id}/vitals`} className="btn btn-secondary"><Activity size={18} /> Record vitals</Link>
            <button type="button" onClick={() => setShowEditModal(true)} className="btn btn-secondary"><Edit size={18} /> Edit</button>
            <button type="button" onClick={() => setShowAIAssistant(true)} className="btn btn-secondary" title="AI Clinical Assistant (draft support)">
              <Sparkles size={18} /> AI assistant
            </button>
          </div>

          <details className="mt-3 group">
            <summary className="cursor-pointer text-sm text-sky-700 select-none">Contact and next of kin</summary>
            <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><dt className="text-xs text-gray-500">Address</dt><dd className="text-gray-900">{address || 'Not recorded'}</dd></div>
              {patient.email && <div><dt className="text-xs text-gray-500">Email</dt><dd className="text-gray-900 break-all">{patient.email}</dd></div>}
              {patient.alternatePhone && <div><dt className="text-xs text-gray-500">Other phone</dt><dd><a className="text-sky-700" href={`tel:${patient.alternatePhone}`}>{patient.alternatePhone}</a></dd></div>}
              {patient.maritalStatus && <div><dt className="text-xs text-gray-500">Marital status</dt><dd className="text-gray-900 capitalize">{patient.maritalStatus}</dd></div>}
              {patient.occupation && <div><dt className="text-xs text-gray-500">Occupation</dt><dd className="text-gray-900">{patient.occupation}</dd></div>}
              {(patient.bloodGroup || patient.genotype) && (
                <div><dt className="text-xs text-gray-500">Blood group / genotype</dt><dd className="text-gray-900">{[patient.bloodGroup, patient.genotype].filter(Boolean).join(' · ')}</dd></div>
              )}
              <div>
                <dt className="text-xs text-gray-500">Next of kin</dt>
                <dd className="text-gray-900">
                  {nok?.name ? [nok.name, nok.relationship].filter(Boolean).join(' · ') : 'Not recorded'}
                  {nok?.phone && <> · <a className="text-sky-700" href={`tel:${nok.phone}`}>{nok.phone}</a></>}
                </dd>
              </div>
            </dl>
          </details>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Tabs */}
          <div className="card card-compact">
            <div role="tablist" aria-label="Patient record" className="flex overflow-x-auto scrollbar-thin border-b border-gray-200">
              {HUB_TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    tab === t.id ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                  {count(t.id) > 0 && <span className="ml-1.5 text-xs text-gray-400">{count(t.id)}</span>}
                </button>
              ))}
            </div>

            <div role="tabpanel">
              {tab === 'timeline' && (
                <>
                  {upcoming.length > 0 && (
                    <div className="border-b border-gray-100">
                      <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-emerald-700">Coming up</p>
                      <TimelineList items={upcoming} empty="" />
                    </div>
                  )}
                  <TimelineList items={timeline.filter(i => !i.upcoming)} empty="Nothing recorded yet. Start a consultation to begin the record." />
                </>
              )}

              {tab === 'visits' && (
                <div className="space-y-4 p-3 sm:p-4">
                  {activeAdmission && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-emerald-800">
                          Admitted · {activeAdmission.wardName} · Bed {activeAdmission.bedNumber}
                        </p>
                        <AdmissionDurationBadge admissionDate={activeAdmission.admissionDate} />
                      </div>
                      <p className="text-sm text-emerald-700 mt-1">{activeAdmission.admissionDiagnosis}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link to="/admissions" className="btn btn-secondary text-sm">View admission</Link>
                        {activeAdmission.treatmentPlanId && (
                          <Link to={`/treatment-planning/${activeAdmission.treatmentPlanId}`} className="btn btn-primary text-sm">
                            View Treatment Plan
                          </Link>
                        )}
                      </div>
                      <div className="mt-3 max-w-xs">
                        <AdmissionDurationClock admissionDate={activeAdmission.admissionDate} estimatedStayDays={activeAdmission.estimatedStayDays} size="sm" />
                      </div>
                    </div>
                  )}

                  {/* Structured clerking: initial encounter, follow-ups, problem list and plan */}
                  <StructuredEncountersPanel
                    key={autoOpen ?? 'panel'}
                    autoOpen={autoOpen}
                    patientId={patient.id}
                    patientLabel={patientLabelOf(patient)}
                    ctx={patientContext(patient)}
                    identifiers={patientIdentifiers(patient)}
                    hospitalId={patient.hospitalId || patient.registeredHospitalId}
                  />

                  {visitNotes.length > 0 && (
                    <div className="rounded-xl border border-gray-200">
                      <p className="px-4 pt-3 text-sm font-semibold text-gray-900">Visit notes (quick note form)</p>
                      <ul className="divide-y divide-gray-100">
                        {visitNotes.map(encounter => (
                          <li key={encounter.id} className="px-4 py-3 flex items-start gap-3">
                            <Link to={`/patients/${patient.id}/clinical-summary`} className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-gray-900 capitalize">{statusLabel(encounter.type)} visit</span>
                              {encounter.chiefComplaint && <span className="block text-sm text-gray-600 truncate">{encounter.chiefComplaint}</span>}
                              <span className="block text-xs text-gray-500">{formatDateTime(encounter.createdAt)}</span>
                              {getEncounterTracking(encounter) && (
                                <span className="block mt-1">
                                  <EntryTrackingBadge tracking={getEncounterTracking(encounter)!} mode="compact" showTimestamp={false} />
                                </span>
                              )}
                            </Link>
                            <button
                              type="button"
                              onClick={() => generateEncounterPDFFromEntity(encounter, patient)}
                              className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg"
                              aria-label="Export visit note as PDF"
                              title="Export as PDF"
                            >
                              <FileText size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200">
                    <p className="px-4 pt-3 text-sm font-semibold text-gray-900">Clerkings, reviews, admissions and prescriptions</p>
                    <TimelineList items={tabItems('visits').filter(i => i.kind !== 'visit')} empty="None recorded yet." />
                  </div>
                </div>
              )}

              {tab === 'surgery' && (
                <>
                  <div className="px-4 pt-3 flex flex-wrap gap-2">
                    <Link to={`/surgery/workflow/${patient.id}`} className="btn btn-primary text-sm"><Scissors size={16} /> Schedule surgery</Link>
                    <Link to={`/patients/${patient.id}/procedure-review?phase=pre_op`} className="btn btn-secondary text-sm">Pre-op review</Link>
                    <Link to={`/patients/${patient.id}/procedure-review?phase=post_op`} className="btn btn-secondary text-sm">Post-op review</Link>
                  </div>
                  <TimelineList items={tabItems('surgery')} empty="No operations recorded." />
                </>
              )}

              {tab === 'wounds' && (
                <div className="p-3 sm:p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/wound-monitor?patientId=${encodeURIComponent(patient.id)}`} className="btn btn-primary text-sm"><Camera size={16} /> Wound monitor</Link>
                    <Link to={`/patients/${patient.id}/procedure-review?phase=wound_review`} className="btn btn-secondary text-sm">Wound review</Link>
                  </div>
                  {(records?.monitoredWounds.length ?? 0) > 0 && (
                    <ul className="flex flex-wrap gap-2" aria-label="Monitored wounds">
                      {records!.monitoredWounds.map(wound => (
                        <li key={wound.id} className="text-sm px-3 py-1.5 rounded-full bg-rose-50 text-rose-800">
                          {wound.label || wound.anatomicalLocation || wound.woundType || 'Wound'}{wound.status ? ` · ${statusLabel(wound.status)}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="rounded-xl border border-gray-200">
                    <TimelineList items={tabItems('wounds')} empty="No wound assessments yet." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modules.filter(m => ['burns', 'npwt', 'skin-graft', 'scar', 'keloid', 'limb-salvage', 'vascular', 'lymphoedema'].includes(m.id)).map(m => (
                      <Link key={m.id} to={m.href} className="px-3 py-1.5 text-sm rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50">{m.label}</Link>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'results' && (
                <>
                  <div className="px-4 pt-3 flex flex-wrap gap-2">
                    <Link to={`/patients/${patient.id}/investigations/request`} className="btn btn-primary text-sm"><TestTube2 size={16} /> Request investigations</Link>
                    <Link to={`/patients/${patient.id}/vitals`} className="btn btn-secondary text-sm"><Activity size={16} /> Vitals</Link>
                  </div>
                  <TimelineList items={tabItems('results')} empty="No investigations requested." />
                  <div className="border-t border-gray-100">
                    <p className="px-4 pt-3 text-sm font-semibold text-gray-900">Recent vital signs</p>
                    {vitals.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-gray-500">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Date</th>
                              <th className="px-3 py-2 text-left font-medium">Temp</th>
                              <th className="px-3 py-2 text-left font-medium">BP</th>
                              <th className="px-3 py-2 text-left font-medium">Pulse</th>
                              <th className="px-3 py-2 text-left font-medium">SpO2</th>
                              <th className="px-3 py-2 text-left font-medium">By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {vitals.map(vital => (
                              <tr key={vital.id}>
                                <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(vital.recordedAt)}</td>
                                <td className="px-3 py-2">{vital.temperature}°C</td>
                                <td className="px-3 py-2 whitespace-nowrap">{vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}</td>
                                <td className="px-3 py-2">{vital.pulse}</td>
                                <td className="px-3 py-2">{vital.oxygenSaturation}%</td>
                                <td className="px-3 py-2">
                                  {getVitalTracking(vital)
                                    ? <EntryTrackingBadge tracking={getVitalTracking(vital)!} mode="compact" showTimestamp={false} />
                                    : <span className="text-gray-400 text-xs">-</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="px-4 py-4 text-sm text-gray-500">No vital signs recorded yet.</p>
                    )}
                  </div>
                </>
              )}

              {tab === 'plans' && (
                <>
                  <div className="px-4 pt-3 flex flex-wrap gap-2">
                    <Link to={`/treatment-planning/new?patientId=${encodeURIComponent(patient.id)}`} className="btn btn-primary text-sm"><ListChecks size={16} /> New treatment plan</Link>
                    <Link to={`/nutrition?patientId=${encodeURIComponent(patient.id)}`} className="btn btn-secondary text-sm">Nutrition plan</Link>
                  </div>
                  <TimelineList items={tabItems('plans')} empty="No treatment plans yet." />
                </>
              )}

              {tab === 'appointments' && (
                <>
                  <div className="px-4 pt-3">
                    <Link to={quick[0].href} className="btn btn-primary text-sm"><Calendar size={16} /> Book appointment</Link>
                  </div>
                  <TimelineList items={tabItems('appointments')} empty="No appointments booked." />
                </>
              )}

              {tab === 'documents' && (
                <div className="p-3 sm:p-4 space-y-4">
                  <ScannedDocumentsPanel patientId={patient.id} />
                  <div className="rounded-xl border border-gray-200">
                    <div className="px-4 pt-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">Documents and education given</p>
                      <Link to={quick[1].href} className="text-sm text-sky-700">Patient education</Link>
                    </div>
                    <TimelineList items={tabItems('documents')} empty="No documents or education recorded." />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">{quickActionsCard}</div>
      </div>

      {/* Phone: the primary action stays in reach. */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex gap-2">
        <button type="button" onClick={() => setShowConsult(true)} className="btn btn-primary flex-1 min-w-0 justify-center whitespace-nowrap">
          <Stethoscope size={18} /> Start consultation
        </button>
        <button type="button" onClick={() => setShowMore(true)} className="btn btn-secondary flex-none w-auto px-4 whitespace-nowrap" aria-haspopup="dialog">
          <MoreHorizontal size={18} /> More
        </button>
      </div>

      {showMore && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setShowMore(false)}>
          <div role="dialog" aria-modal="true" aria-label="More actions" className="bg-white w-full rounded-t-2xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-1">
              <h2 className="text-lg font-semibold text-gray-900">More</h2>
              <button type="button" onClick={() => setShowMore(false)} className="p-2 -mr-2 rounded-full hover:bg-gray-100" aria-label="Close"><X size={20} /></button>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {quick.map(a => (
                <Link key={a.id} to={a.href} onClick={() => setShowMore(false)} className="px-3 py-3 text-sm font-medium rounded-lg bg-gray-50 text-gray-800">{a.label}</Link>
              ))}
              <button type="button" onClick={() => { setShowMore(false); setShowEditModal(true); }} className="px-3 py-3 text-sm font-medium rounded-lg bg-gray-50 text-gray-800 text-left">Edit patient</button>
              <button type="button" onClick={() => { setShowMore(false); setShowAIAssistant(true); }} className="px-3 py-3 text-sm font-medium rounded-lg bg-gray-50 text-gray-800 text-left">AI assistant</button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 mb-2">Open with this patient</p>
            <div className="px-3 pb-4 flex flex-wrap gap-2">
              {modules.map(m => (
                <Link key={m.id} to={m.href} onClick={() => setShowMore(false)} className="px-3 py-2 text-sm rounded-full border border-gray-200 text-gray-700">{m.label}</Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {showConsult && (
        <StartConsultationSheet
          patientId={patient.id}
          patientName={fullName}
          hasInitialClerking={hasInitialClerking}
          onClose={() => setShowConsult(false)}
        />
      )}

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

      {showAIAssistant && patient && (
        <AIClinicalAssistant
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`.trim()}
          onClose={() => setShowAIAssistant(false)}
        />
      )}
    </div>
  );
}
