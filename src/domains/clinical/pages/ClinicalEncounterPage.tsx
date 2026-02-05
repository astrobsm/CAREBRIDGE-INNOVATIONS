import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Stethoscope,
  ClipboardList,
  FileText,
  Activity,
  Plus,
  Trash2,
  CheckCircle,
  UserCheck,
  FlaskConical,
  Pill,
  Scissors,
  Download,
  Printer,
  X,
  History,
  Calendar,
  User as UserIcon,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
  Camera,
  ImagePlus,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation, ExportOptionsModal } from '../../../components/common';
import { createSimpleThermalPDF } from '../../../utils/thermalPdfGenerator';
import type { ClinicalEncounter, Diagnosis, EncounterType, PhysicalExamination, Investigation, Prescription, ClinicalPhoto } from '../../../types';

const encounterSchema = z.object({
  type: z.enum(['outpatient', 'inpatient', 'emergency', 'surgical', 'follow_up', 'home_visit']),
  chiefComplaint: z.string().min(5, 'Chief complaint is required'),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  pastSurgicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
});

type EncounterFormData = z.infer<typeof encounterSchema>;

const encounterTypes: { value: EncounterType; label: string }[] = [
  { value: 'outpatient', label: 'Outpatient Visit' },
  { value: 'inpatient', label: 'Inpatient Admission' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'surgical', label: 'Surgical Consultation' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'home_visit', label: 'Home Visit' },
];

export default function ClinicalEncounterPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'examination' | 'diagnosis'>('history');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState<{ description: string; type: 'primary' | 'secondary' | 'differential' }>({ description: '', type: 'primary' });
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamination>({});
  
  // Clinical Photos State
  const [clinicalPhotos, setClinicalPhotos] = useState<ClinicalPhoto[]>([]);
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoBodyLocation, setPhotoBodyLocation] = useState('');
  
  // Post-submission state for showing export options
  const [showPostSubmitModal, setShowPostSubmitModal] = useState(false);
  const [savedEncounter, setSavedEncounter] = useState<ClinicalEncounter | null>(null);
  const [showInvestigationExport, setShowInvestigationExport] = useState(false);
  const [showPrescriptionExport, setShowPrescriptionExport] = useState(false);
  const [patientInvestigations, setPatientInvestigations] = useState<Investigation[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  
  // Previous Encounters Modal State
  const [showPreviousEncountersModal, setShowPreviousEncountersModal] = useState(false);
  const [selectedEncounterForView, setSelectedEncounterForView] = useState<ClinicalEncounter | null>(null);
  const [encounterFilterClinicianId, setEncounterFilterClinicianId] = useState<string>('');
  const [encounterFilterDateFrom, setEncounterFilterDateFrom] = useState<string>('');
  const [encounterFilterDateTo, setEncounterFilterDateTo] = useState<string>('');
  const [encounterFilterType, setEncounterFilterType] = useState<string>('');

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Previous encounters for this patient
  const previousEncounters = useLiveQuery(
    async () => {
      if (!patientId) return [];
      let encounters = await db.clinicalEncounters
        .where('patientId')
        .equals(patientId)
        .toArray();
      
      // Sort by date descending
      encounters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return encounters;
    },
    [patientId]
  );

  // Get all clinicians for filter dropdown
  const clinicians = useLiveQuery(
    () => db.users.filter(u => 
      ['doctor', 'surgeon', 'consultant', 'resident', 'registrar', 'senior_registrar', 'medical_officer', 'house_officer'].includes(u.role)
    ).toArray(),
    []
  );

  // Filtered encounters based on filters
  const filteredPreviousEncounters = useMemo(() => {
    if (!previousEncounters) return [];
    
    return previousEncounters.filter(enc => {
      // Filter by clinician
      if (encounterFilterClinicianId && enc.attendingClinician !== encounterFilterClinicianId) {
        return false;
      }
      
      // Filter by encounter type
      if (encounterFilterType && enc.type !== encounterFilterType) {
        return false;
      }
      
      // Filter by date from
      if (encounterFilterDateFrom) {
        const fromDate = new Date(encounterFilterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (new Date(enc.createdAt) < fromDate) return false;
      }
      
      // Filter by date to
      if (encounterFilterDateTo) {
        const toDate = new Date(encounterFilterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(enc.createdAt) > toDate) return false;
      }
      
      return true;
    });
  }, [previousEncounters, encounterFilterClinicianId, encounterFilterDateFrom, encounterFilterDateTo, encounterFilterType]);

  const latestVitals = useLiveQuery(
    async () => {
      if (!patientId) return undefined;
      const allVitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
      // Sort by recordedAt descending (newest first) and get first
      allVitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      return allVitals[0];
    },
    [patientId]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EncounterFormData>({
    resolver: zodResolver(encounterSchema),
    defaultValues: {
      type: 'outpatient',
    },
  });

  // Watch form values for VoiceDictation
  const chiefComplaint = watch('chiefComplaint') || '';
  const historyOfPresentIllness = watch('historyOfPresentIllness') || '';
  const pastMedicalHistory = watch('pastMedicalHistory') || '';
  const pastSurgicalHistory = watch('pastSurgicalHistory') || '';
  const familyHistory = watch('familyHistory') || '';
  const socialHistory = watch('socialHistory') || '';
  const treatmentPlan = watch('treatmentPlan') || '';
  const notes = watch('notes') || '';

  const addDiagnosis = () => {
    if (newDiagnosis.description.trim()) {
      setDiagnoses([
        ...diagnoses,
        {
          id: uuidv4(),
          description: newDiagnosis.description,
          type: newDiagnosis.type,
          status: 'suspected',
        },
      ]);
      setNewDiagnosis({ description: '', type: 'primary' });
    }
  };

  const removeDiagnosis = (id: string) => {
    setDiagnoses(diagnoses.filter((d) => d.id !== id));
  };

  const updatePhysicalExam = (field: keyof PhysicalExamination, value: string) => {
    setPhysicalExam({ ...physicalExam, [field]: value });
  };

  // Clinical Photo Handlers
  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Please use an image under 5MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const newPhoto: ClinicalPhoto = {
          id: uuidv4(),
          imageData: base64,
          description: photoDescription || undefined,
          bodyLocation: photoBodyLocation || undefined,
          capturedAt: new Date(),
        };
        setClinicalPhotos([...clinicalPhotos, newPhoto]);
        setPhotoDescription('');
        setPhotoBodyLocation('');
        toast.success('Clinical photo added');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
    
    // Reset input
    event.target.value = '';
  };

  const removePhoto = (photoId: string) => {
    setClinicalPhotos(clinicalPhotos.filter(p => p.id !== photoId));
    toast.success('Photo removed');
  };

  const onSubmit = async (data: EncounterFormData) => {
    if (!patientId || !user) return;
    setIsLoading(true);

    try {
      const encounter: ClinicalEncounter = {
        id: uuidv4(),
        patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        type: data.type,
        status: 'completed',
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness,
        pastMedicalHistory: data.pastMedicalHistory,
        pastSurgicalHistory: data.pastSurgicalHistory,
        familyHistory: data.familyHistory,
        socialHistory: data.socialHistory,
        physicalExamination: physicalExam,
        clinicalPhotos: clinicalPhotos.length > 0 ? clinicalPhotos : undefined,
        diagnosis: diagnoses,
        treatmentPlan: data.treatmentPlan,
        notes: data.notes,
        attendingClinician: user.id,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.clinicalEncounters.add(encounter);
      await syncRecord('clinicalEncounters', encounter as unknown as Record<string, unknown>);
      
      // Fetch recent investigations and prescriptions for this patient
      const recentInvestigations = await db.investigations
        .where('patientId')
        .equals(patientId)
        .filter(inv => inv.status === 'requested')
        .toArray();
      
      const recentPrescriptions = await db.prescriptions
        .where('patientId')
        .equals(patientId)
        .filter(rx => rx.status === 'pending')
        .toArray();
      
      setPatientInvestigations(recentInvestigations);
      setPatientPrescriptions(recentPrescriptions);
      setSavedEncounter(encounter);
      setShowPostSubmitModal(true);
      
      toast.success('Clinical encounter saved successfully!');
    } catch (error) {
      console.error('Error saving encounter:', error);
      toast.error('Failed to save encounter');
    } finally {
      setIsLoading(false);
    }
  };

  // Print encounter as A4 PDF
  const printEncounterA4 = async (encounter: ClinicalEncounter) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Get clinician name
    const clinician = clinicians?.find(c => c.id === encounter.attendingClinician);
    const clinicianName = clinician ? `Dr. ${clinician.firstName} ${clinician.lastName}` : 'Attending Clinician';

    // Header
    doc.setFillColor(0, 102, 153);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CLINICAL ENCOUNTER REPORT', pageWidth / 2, 12, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(encounter.createdAt), 'PPP p')}`, pageWidth / 2, 20, { align: 'center' });
    doc.text(`Encounter ID: ${encounter.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });

    y = 40;

    // Patient Information Box
    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(0, 102, 153);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, pageWidth - 2 * margin, 25, 'FD');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', margin + 3, y + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${patient?.firstName} ${patient?.lastName}`, margin + 3, y + 13);
    doc.text(`Hospital No: ${patient?.hospitalNumber || 'N/A'}`, margin + 80, y + 13);
    doc.text(`Encounter Type: ${encounter.type?.replace('_', ' ').toUpperCase()}`, margin + 3, y + 20);
    doc.text(`Clinician: ${clinicianName}`, margin + 80, y + 20);

    y += 32;

    // Chief Complaint
    if (encounter.chiefComplaint) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('CHIEF COMPLAINT', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const chiefLines = doc.splitTextToSize(encounter.chiefComplaint, pageWidth - 2 * margin);
      doc.text(chiefLines, margin, y);
      y += chiefLines.length * 5 + 5;
    }

    // History of Present Illness
    if (encounter.historyOfPresentIllness) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('HISTORY OF PRESENT ILLNESS', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const hpiLines = doc.splitTextToSize(encounter.historyOfPresentIllness, pageWidth - 2 * margin);
      doc.text(hpiLines, margin, y);
      y += hpiLines.length * 5 + 5;
    }

    // Check for page break
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    // Past Medical History
    if (encounter.pastMedicalHistory) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('PAST MEDICAL HISTORY', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const pmhLines = doc.splitTextToSize(encounter.pastMedicalHistory, pageWidth - 2 * margin);
      doc.text(pmhLines, margin, y);
      y += pmhLines.length * 5 + 5;
    }

    // Past Surgical History
    if (encounter.pastSurgicalHistory) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('PAST SURGICAL HISTORY', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const pshLines = doc.splitTextToSize(encounter.pastSurgicalHistory, pageWidth - 2 * margin);
      doc.text(pshLines, margin, y);
      y += pshLines.length * 5 + 5;
    }

    // Check for page break
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    // Physical Examination
    if (encounter.physicalExamination && Object.keys(encounter.physicalExamination).length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('PHYSICAL EXAMINATION', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const examFields = ['general', 'head', 'neck', 'chest', 'cardiovascular', 'abdomen', 'musculoskeletal', 'neurological', 'skin'] as const;
      for (const field of examFields) {
        const value = encounter.physicalExamination[field];
        if (value) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${field.charAt(0).toUpperCase() + field.slice(1)}:`, margin, y);
          doc.setFont('helvetica', 'normal');
          const examLines = doc.splitTextToSize(value, pageWidth - 2 * margin - 40);
          doc.text(examLines, margin + 40, y);
          y += examLines.length * 5 + 2;
          
          if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
          }
        }
      }
      y += 3;
    }

    // Diagnosis
    if (encounter.diagnosis && encounter.diagnosis.length > 0) {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('DIAGNOSIS', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      encounter.diagnosis.forEach((dx, idx) => {
        const typeLabel = dx.type === 'primary' ? '[PRIMARY]' : dx.type === 'secondary' ? '[SECONDARY]' : '[DIFFERENTIAL]';
        doc.text(`${idx + 1}. ${typeLabel} ${dx.description}`, margin, y);
        y += 5;
      });
      y += 3;
    }

    // Treatment Plan
    if (encounter.treatmentPlan) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 153);
      doc.text('TREATMENT PLAN', margin, y);
      y += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const planLines = doc.splitTextToSize(encounter.treatmentPlan, pageWidth - 2 * margin);
      doc.text(planLines, margin, y);
      y += planLines.length * 5 + 5;
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(0, 102, 153);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${format(new Date(), 'PPP p')} | AstroHEALTH EMR`, pageWidth / 2, footerY, { align: 'center' });

    // Open print dialog
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading patient...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Patient
        </button>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Stethoscope className="w-7 h-7 text-sky-500" />
              Clinical Encounter
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Patient: {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate(`/patients/${patientId}/clinical-summary`)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <UserCheck size={18} />
              Patient Summary
            </button>
            <button
              type="button"
              onClick={() => setShowPreviousEncountersModal(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <History size={18} />
              Previous Encounters
            </button>
          </div>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/investigations"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <FlaskConical size={16} />
            Investigations
          </Link>
          <Link
            to="/pharmacy"
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <Pill size={16} />
            Pharmacy / Prescriptions
          </Link>
          <Link
            to={`/patients/${patientId}/wounds`}
            className="btn btn-sm btn-secondary flex items-center gap-2"
          >
            <Scissors size={16} />
            Wound Assessment
          </Link>
        </div>
      </div>

      {/* Latest Vitals Summary */}
      {latestVitals && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="card-header flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Latest Vitals</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.temperature}°C</p>
                <p className="text-xs text-gray-500">Temperature</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.pulse}</p>
                <p className="text-xs text-gray-500">Pulse (bpm)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}</p>
                <p className="text-xs text-gray-500">BP (mmHg)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.respiratoryRate}</p>
                <p className="text-xs text-gray-500">RR (breaths/min)</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{latestVitals.oxygenSaturation}%</p>
                <p className="text-xs text-gray-500">SpO2</p>
              </div>
              {latestVitals.painScore !== undefined && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{latestVitals.painScore}/10</p>
                  <p className="text-xs text-gray-500">Pain Score</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Encounter Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Encounter Details</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Encounter Type *</label>
                <select {...register('type')} className="input">
                  {encounterTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <VoiceDictation
                  label="Chief Complaint *"
                  value={chiefComplaint}
                  onChange={(value) => setValue('chiefComplaint', value)}
                  placeholder="What brings the patient in today?"
                  rows={2}
                  medicalContext="clinical_notes"
                  showAIEnhance={true}
                  required={true}
                  error={errors.chiefComplaint?.message}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('examination')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'examination'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Physical Examination
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnosis')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'diagnosis'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Diagnosis & Plan
          </button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Clinical History</h2>
            </div>
            <div className="card-body space-y-4">
              <VoiceDictation
                label="History of Present Illness"
                value={historyOfPresentIllness}
                onChange={(value) => setValue('historyOfPresentIllness', value)}
                placeholder="Describe the onset, duration, character, and progression of symptoms..."
                rows={4}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Past Medical History"
                value={pastMedicalHistory}
                onChange={(value) => setValue('pastMedicalHistory', value)}
                placeholder="Previous medical conditions, hospitalizations, chronic diseases..."
                rows={3}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Past Surgical History"
                value={pastSurgicalHistory}
                onChange={(value) => setValue('pastSurgicalHistory', value)}
                placeholder="Previous surgeries with dates and outcomes..."
                rows={2}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Family History"
                value={familyHistory}
                onChange={(value) => setValue('familyHistory', value)}
                placeholder="Relevant family medical history..."
                rows={2}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Social History"
                value={socialHistory}
                onChange={(value) => setValue('socialHistory', value)}
                placeholder="Smoking, alcohol, occupation, living situation..."
                rows={2}
                medicalContext="patient_history"
                showAIEnhance={true}
              />
            </div>
          </motion.div>
        )}

        {/* Physical Examination Tab */}
        {activeTab === 'examination' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Physical Examination</h2>
            </div>
            <div className="card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
              <VoiceDictation
                label="General Appearance"
                value={physicalExam.generalAppearance || ''}
                onChange={(value) => updatePhysicalExam('generalAppearance', value)}
                placeholder="Alert, oriented, well-nourished..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Head/HEENT"
                value={physicalExam.head || ''}
                onChange={(value) => updatePhysicalExam('head', value)}
                placeholder="Normocephalic, atraumatic..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Neck"
                value={physicalExam.neck || ''}
                onChange={(value) => updatePhysicalExam('neck', value)}
                placeholder="Supple, no lymphadenopathy..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Chest/Respiratory"
                value={physicalExam.chest || ''}
                onChange={(value) => updatePhysicalExam('chest', value)}
                placeholder="Clear to auscultation bilaterally..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Cardiovascular"
                value={physicalExam.cardiovascular || ''}
                onChange={(value) => updatePhysicalExam('cardiovascular', value)}
                placeholder="Regular rate and rhythm, no murmurs..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Abdomen"
                value={physicalExam.abdomen || ''}
                onChange={(value) => updatePhysicalExam('abdomen', value)}
                placeholder="Soft, non-tender, no masses..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Musculoskeletal"
                value={physicalExam.musculoskeletal || ''}
                onChange={(value) => updatePhysicalExam('musculoskeletal', value)}
                placeholder="Full range of motion, no deformities..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Neurological"
                value={physicalExam.neurological || ''}
                onChange={(value) => updatePhysicalExam('neurological', value)}
                placeholder="Alert, oriented x3, cranial nerves intact..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Skin"
                value={physicalExam.skin || ''}
                onChange={(value) => updatePhysicalExam('skin', value)}
                placeholder="Warm, dry, no rashes or lesions..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
              <VoiceDictation
                label="Additional Findings"
                value={physicalExam.additionalFindings || ''}
                onChange={(value) => updatePhysicalExam('additionalFindings', value)}
                placeholder="Any other relevant findings..."
                rows={2}
                medicalContext="examination"
                showAIEnhance={true}
              />
            </div>

            {/* Clinical Photographs Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera size={20} className="text-sky-600" />
                Clinical Photographs (Optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Capture or upload photos of lesions, wounds, rashes, or any relevant clinical findings for documentation.
              </p>
              
              {/* Photo Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Body Location</label>
                  <select
                    value={photoBodyLocation}
                    onChange={(e) => setPhotoBodyLocation(e.target.value)}
                    className="input"
                  >
                    <option value="">Select location...</option>
                    <option value="head">Head</option>
                    <option value="face">Face</option>
                    <option value="neck">Neck</option>
                    <option value="chest">Chest</option>
                    <option value="back">Back</option>
                    <option value="abdomen">Abdomen</option>
                    <option value="left_arm">Left Arm</option>
                    <option value="right_arm">Right Arm</option>
                    <option value="left_hand">Left Hand</option>
                    <option value="right_hand">Right Hand</option>
                    <option value="left_leg">Left Leg</option>
                    <option value="right_leg">Right Leg</option>
                    <option value="left_foot">Left Foot</option>
                    <option value="right_foot">Right Foot</option>
                    <option value="groin">Groin</option>
                    <option value="perineum">Perineum</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    placeholder="e.g., Diabetic foot ulcer, left heel"
                    className="input"
                  />
                </div>
              </div>

              {/* Photo Capture/Upload Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
                  <Camera size={18} />
                  Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
                <label className="btn btn-outline flex items-center gap-2 cursor-pointer">
                  <ImagePlus size={18} />
                  Upload from Gallery
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photo Gallery */}
              {clinicalPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {clinicalPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.imageData}
                        alt={photo.description || 'Clinical photo'}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full"
                          title="Remove photo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {(photo.bodyLocation || photo.description) && (
                        <div className="mt-1 text-xs text-gray-600 truncate">
                          {photo.bodyLocation && (
                            <span className="font-medium capitalize">{photo.bodyLocation.replace('_', ' ')}</span>
                          )}
                          {photo.bodyLocation && photo.description && ' - '}
                          {photo.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {clinicalPhotos.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No clinical photos added</p>
                  <p className="text-gray-400 text-xs mt-1">Use the buttons above to capture or upload photos</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Diagnoses */}
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900">Diagnoses</h2>
              </div>
              <div className="card-body space-y-4">
                {/* Add Diagnosis */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDiagnosis.description}
                    onChange={(e) => setNewDiagnosis({ ...newDiagnosis, description: e.target.value })}
                    placeholder="Enter diagnosis..."
                    className="input flex-1"
                  />
                  <select
                    value={newDiagnosis.type}
                    onChange={(e) => setNewDiagnosis({ ...newDiagnosis, type: e.target.value as 'primary' | 'secondary' | 'differential' })}
                    className="input w-auto"
                    title="Select diagnosis type"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="differential">Differential</option>
                  </select>
                  <button
                    type="button"
                    onClick={addDiagnosis}
                    className="btn btn-primary"
                    title="Add diagnosis"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Diagnosis List */}
                {diagnoses.length > 0 ? (
                  <div className="space-y-2">
                    {diagnoses.map((diagnosis) => (
                      <div
                        key={diagnosis.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <div>
                            <p className="font-medium text-gray-900">{diagnosis.description}</p>
                            <span className={`badge ${
                              diagnosis.type === 'primary' ? 'badge-primary' :
                              diagnosis.type === 'secondary' ? 'badge-secondary' : 'badge-warning'
                            }`}>
                              {diagnosis.type}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDiagnosis(diagnosis.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove diagnosis"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No diagnoses added yet</p>
                )}
              </div>
            </div>

            {/* Treatment Plan */}
            <div className="card">
              <div className="card-header flex items-center gap-3">
                <FileText className="w-5 h-5 text-sky-500" />
                <h2 className="font-semibold text-gray-900">Treatment Plan</h2>
              </div>
              <div className="card-body space-y-4">
                <VoiceDictation
                  label="Treatment Plan"
                  value={treatmentPlan}
                  onChange={(value) => setValue('treatmentPlan', value)}
                  placeholder="Medications, procedures, referrals, follow-up instructions..."
                  rows={4}
                  medicalContext="treatment_plan"
                  showAIEnhance={true}
                />
                <VoiceDictation
                  label="Additional Notes"
                  value={notes}
                  onChange={(value) => setValue('notes', value)}
                  placeholder="Any additional clinical notes..."
                  rows={3}
                  medicalContext="clinical_notes"
                  showAIEnhance={true}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}`)}
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
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Encounter
              </>
            )}
          </button>
        </div>
      </form>

      {/* Post-Submission Modal */}
      <AnimatePresence>
        {showPostSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  Encounter Saved!
                </h3>
                <button
                  onClick={() => {
                    setShowPostSubmitModal(false);
                    navigate(`/patients/${patientId}`);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                The clinical encounter has been saved successfully. What would you like to do next?
              </p>

              <div className="space-y-3">
                {/* Investigations Section */}
                {patientInvestigations.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">
                          {patientInvestigations.length} Pending Investigation{patientInvestigations.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowInvestigationExport(true)}
                        className="btn btn-sm btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      <Link
                        to="/investigations"
                        className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <FlaskConical size={14} />
                        Go to Lab
                      </Link>
                    </div>
                  </div>
                )}

                {/* Prescriptions Section */}
                {patientPrescriptions.length > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium text-emerald-900">
                          {patientPrescriptions.length} Pending Prescription{patientPrescriptions.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowPrescriptionExport(true)}
                        className="btn btn-sm btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      <Link
                        to="/pharmacy"
                        className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <Pill size={14} />
                        Go to Pharmacy
                      </Link>
                    </div>
                  </div>
                )}

                {/* Wound Assessment Link */}
                <Link
                  to={`/patients/${patientId}/wounds`}
                  className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Scissors className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="font-medium text-amber-900">Wound Assessment</span>
                    <p className="text-sm text-amber-700">If patient has wounds, click here to document</p>
                  </div>
                </Link>

                {/* Done Button */}
                <button
                  onClick={() => {
                    setShowPostSubmitModal(false);
                    navigate(`/patients/${patientId}`);
                  }}
                  className="btn btn-primary w-full mt-4"
                >
                  Done - Back to Patient
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Investigation Export Modal */}
      {showInvestigationExport && patientInvestigations.length > 0 && (
        <ExportOptionsModal
          isOpen={showInvestigationExport}
          onClose={() => setShowInvestigationExport(false)}
          title="Export Investigation Requests"
          generateA4PDF={() => {
            const doc = new jsPDF('p', 'mm', 'a4');
            let y = 20;
            
            doc.setFont('times', 'bold');
            doc.setFontSize(18);
            doc.text('INVESTIGATION REQUESTS', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.text(`Patient: ${patient?.firstName} ${patient?.lastName}`, 20, y);
            y += 7;
            doc.text(`Hospital No: ${patient?.hospitalNumber}`, 20, y);
            y += 7;
            doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, y);
            y += 12;
            
            doc.setLineWidth(0.5);
            doc.line(20, y, 190, y);
            y += 10;
            
            patientInvestigations.forEach((inv, idx) => {
              if (y > 270) {
                doc.addPage();
                y = 20;
              }
              doc.setFont('times', 'bold');
              doc.text(`${idx + 1}. ${inv.typeName || inv.type}`, 20, y);
              y += 6;
              doc.setFont('times', 'normal');
              doc.text(`   Category: ${inv.category}`, 20, y);
              y += 6;
              doc.text(`   Priority: ${inv.priority.toUpperCase()}`, 20, y);
              y += 6;
              if (inv.clinicalDetails) {
                doc.text(`   Details: ${inv.clinicalDetails}`, 20, y);
                y += 6;
              }
              y += 4;
            });
            
            return doc;
          }}
          generateThermalPDF={() => {
            return createSimpleThermalPDF({
              title: 'INVESTIGATION REQUESTS',
              patientName: `${patient?.firstName} ${patient?.lastName}`,
              patientId: patient?.hospitalNumber,
              date: new Date(),
              items: patientInvestigations.map(inv => ({
                label: inv.typeName || inv.type,
                value: `${inv.category} - ${inv.priority.toUpperCase()}`
              })),
            });
          }}
          fileNamePrefix={`investigations_${patient?.hospitalNumber || 'patient'}`}
        />
      )}

      {/* Prescription Export Modal */}
      {showPrescriptionExport && patientPrescriptions.length > 0 && (
        <ExportOptionsModal
          isOpen={showPrescriptionExport}
          onClose={() => setShowPrescriptionExport(false)}
          title="Export Prescriptions"
          generateA4PDF={() => {
            const doc = new jsPDF('p', 'mm', 'a4');
            let y = 20;
            
            doc.setFont('times', 'bold');
            doc.setFontSize(18);
            doc.text('PRESCRIPTIONS', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.text(`Patient: ${patient?.firstName} ${patient?.lastName}`, 20, y);
            y += 7;
            doc.text(`Hospital No: ${patient?.hospitalNumber}`, 20, y);
            y += 7;
            doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, y);
            y += 12;
            
            doc.setLineWidth(0.5);
            doc.line(20, y, 190, y);
            y += 10;
            
            patientPrescriptions.forEach((rx) => {
              rx.medications?.forEach((med, idx) => {
                if (y > 270) {
                  doc.addPage();
                  y = 20;
                }
                doc.setFont('times', 'bold');
                doc.text(`${idx + 1}. ${med.name}`, 20, y);
                y += 6;
                doc.setFont('times', 'normal');
                doc.text(`   Dose: ${med.dose} ${med.unit}`, 20, y);
                y += 6;
                doc.text(`   Frequency: ${med.frequency}`, 20, y);
                y += 6;
                doc.text(`   Duration: ${med.duration}`, 20, y);
                y += 6;
                if (med.instructions) {
                  doc.text(`   Instructions: ${med.instructions}`, 20, y);
                  y += 6;
                }
                y += 4;
              });
            });
            
            return doc;
          }}
          generateThermalPDF={() => {
            const allMeds = patientPrescriptions.flatMap(rx => rx.medications || []);
            return createSimpleThermalPDF({
              title: 'PRESCRIPTIONS',
              patientName: `${patient?.firstName} ${patient?.lastName}`,
              patientId: patient?.hospitalNumber,
              date: new Date(),
              items: allMeds.map(med => ({
                label: med.name,
                value: `${med.dose} ${med.unit} - ${med.frequency}`
              })),
            });
          }}
          fileNamePrefix={`prescriptions_${patient?.hospitalNumber || 'patient'}`}
        />
      )}

      {/* Previous Encounters Modal */}
      <AnimatePresence>
        {showPreviousEncountersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreviousEncountersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-6 h-6" />
                    <h2 className="text-lg sm:text-xl font-bold">Previous Encounters</h2>
                  </div>
                  <button
                    onClick={() => setShowPreviousEncountersModal(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-white/80 text-sm mt-1">
                  {patient?.firstName} {patient?.lastName} - {patient?.hospitalNumber}
                </p>
              </div>

              {/* Filters Section */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={18} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Clinician Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Clinician</label>
                    <select
                      value={encounterFilterClinicianId}
                      onChange={(e) => setEncounterFilterClinicianId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">All Clinicians</option>
                      {clinicians?.map(c => (
                        <option key={c.id} value={c.id}>
                          Dr. {c.firstName} {c.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Encounter Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Encounter Type</label>
                    <select
                      value={encounterFilterType}
                      onChange={(e) => setEncounterFilterType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">All Types</option>
                      <option value="outpatient">Outpatient</option>
                      <option value="inpatient">Inpatient</option>
                      <option value="emergency">Emergency</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="consultation">Consultation</option>
                    </select>
                  </div>

                  {/* Date From Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                    <input
                      type="date"
                      value={encounterFilterDateFrom}
                      onChange={(e) => setEncounterFilterDateFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Date To Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                    <input
                      type="date"
                      value={encounterFilterDateTo}
                      onChange={(e) => setEncounterFilterDateTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {(encounterFilterClinicianId || encounterFilterType || encounterFilterDateFrom || encounterFilterDateTo) && (
                  <button
                    onClick={() => {
                      setEncounterFilterClinicianId('');
                      setEncounterFilterType('');
                      setEncounterFilterDateFrom('');
                      setEncounterFilterDateTo('');
                    }}
                    className="mt-3 text-sm text-sky-600 hover:text-sky-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>

              {/* Encounters List */}
              <div className="overflow-y-auto max-h-[50vh] p-4">
                {filteredPreviousEncounters.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No encounters found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPreviousEncounters.map((encounter) => {
                      const isExpanded = selectedEncounterForView === encounter.id;
                      const clinician = clinicians?.find(c => c.id === encounter.attendingClinician);
                      
                      return (
                        <motion.div
                          key={encounter.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        >
                          {/* Encounter Header */}
                          <div
                            className="p-4 cursor-pointer flex items-center justify-between"
                            onClick={() => setSelectedEncounterForView(isExpanded ? null : encounter.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${
                                encounter.type === 'emergency' ? 'bg-red-100 text-red-600' :
                                encounter.type === 'inpatient' ? 'bg-purple-100 text-purple-600' :
                                encounter.type === 'outpatient' ? 'bg-green-100 text-green-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                <Stethoscope size={20} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {encounter.type?.replace('_', ' ').toUpperCase()}
                                </p>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <Calendar size={14} />
                                  {format(new Date(encounter.createdAt), 'PPP p')}
                                </p>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <UserIcon size={14} />
                                  {clinician ? `Dr. ${clinician.firstName} ${clinician.lastName}` : 'Unknown Clinician'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  printEncounterA4(encounter);
                                }}
                                className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="Print A4"
                              >
                                <Printer size={18} />
                              </button>
                              {isExpanded ? (
                                <ChevronUp size={20} className="text-gray-400" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t"
                              >
                                <div className="p-4 bg-gray-50 space-y-4">
                                  {/* Chief Complaint */}
                                  {encounter.chiefComplaint && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Chief Complaint</h4>
                                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                                        {encounter.chiefComplaint}
                                      </p>
                                    </div>
                                  )}

                                  {/* History of Present Illness */}
                                  {encounter.historyOfPresentIllness && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">History of Present Illness</h4>
                                      <p className="text-sm text-gray-600 bg-white p-3 rounded border whitespace-pre-wrap">
                                        {encounter.historyOfPresentIllness}
                                      </p>
                                    </div>
                                  )}

                                  {/* Physical Examination Summary */}
                                  {encounter.physicalExamination && Object.values(encounter.physicalExamination).some(v => v) && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Physical Examination</h4>
                                      <div className="text-sm text-gray-600 bg-white p-3 rounded border grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(encounter.physicalExamination).map(([key, value]) => (
                                          value && (
                                            <div key={key}>
                                              <span className="font-medium capitalize">{key}:</span>{' '}
                                              <span className="text-gray-500">{value}</span>
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Diagnosis */}
                                  {encounter.diagnosis && encounter.diagnosis.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Diagnoses</h4>
                                      <ul className="text-sm text-gray-600 bg-white p-3 rounded border space-y-1">
                                        {encounter.diagnosis.map((dx, idx) => (
                                          <li key={idx} className="flex items-start gap-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              dx.type === 'primary' ? 'bg-red-100 text-red-700' :
                                              dx.type === 'secondary' ? 'bg-orange-100 text-orange-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {dx.type?.toUpperCase()}
                                            </span>
                                            <span>{dx.description}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Treatment Plan */}
                                  {encounter.treatmentPlan && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Treatment Plan</h4>
                                      <p className="text-sm text-gray-600 bg-white p-3 rounded border whitespace-pre-wrap">
                                        {encounter.treatmentPlan}
                                      </p>
                                    </div>
                                  )}

                                  {/* Print Button */}
                                  <div className="flex justify-end pt-2">
                                    <button
                                      onClick={() => printEncounterA4(encounter)}
                                      className="btn btn-primary flex items-center gap-2"
                                    >
                                      <Printer size={16} />
                                      Print A4 Report
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredPreviousEncounters.length} of {previousEncounters?.length || 0} encounters
                </p>
                <button
                  onClick={() => setShowPreviousEncountersModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

