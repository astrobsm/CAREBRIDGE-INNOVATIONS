import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Pill,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  X,
  FlaskConical,
  Scissors,
  UserCheck,
  FileText,
  LineChart,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { db } from '../../database';
import { syncRecord } from '../../services/cloudSyncService';
import type { 
  TreatmentPlan, 
  Prescription,
  MedicationRoute,
  Investigation,
} from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EnhancedTreatmentPlanCardProps {
  patientId: string;
  admissionId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'wound' | 'burn' | 'surgery' | 'general';
  clinicianId: string;
  clinicianName: string;
  hospitalId: string;
}

// ============== MEDICATION DATABASE ==============
const medicationCategories = [
  { value: 'analgesics', label: 'Analgesics/Pain Relief' },
  { value: 'antibiotics', label: 'Antibiotics' },
  { value: 'antiinflammatories', label: 'Anti-inflammatories' },
  { value: 'vitamins', label: 'Vitamins & Supplements' },
  { value: 'anticoagulants', label: 'Anticoagulants' },
  { value: 'antifungals', label: 'Antifungals' },
  { value: 'antihistamines', label: 'Antihistamines' },
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'gastrointestinal', label: 'Gastrointestinal' },
  { value: 'diabetes', label: 'Diabetes Medications' },
  { value: 'sedatives', label: 'Sedatives & Anxiolytics' },
  { value: 'other', label: 'Other' },
];

const commonMedications: Record<string, Array<{ name: string; doses: string[]; routes: MedicationRoute[] }>> = {
  analgesics: [
    { name: 'Paracetamol', doses: ['500mg', '1g'], routes: ['oral', 'intravenous', 'rectal'] },
    { name: 'Ibuprofen', doses: ['200mg', '400mg', '600mg'], routes: ['oral'] },
    { name: 'Diclofenac', doses: ['25mg', '50mg', '75mg'], routes: ['oral', 'intramuscular', 'rectal'] },
    { name: 'Tramadol', doses: ['50mg', '100mg'], routes: ['oral', 'intravenous', 'intramuscular'] },
    { name: 'Morphine', doses: ['5mg', '10mg', '15mg'], routes: ['oral', 'intravenous', 'subcutaneous'] },
    { name: 'Pentazocine', doses: ['30mg', '60mg'], routes: ['intramuscular', 'intravenous'] },
  ],
  antibiotics: [
    { name: 'Amoxicillin', doses: ['250mg', '500mg', '1g'], routes: ['oral'] },
    { name: 'Amoxicillin-Clavulanate', doses: ['375mg', '625mg', '1.2g'], routes: ['oral', 'intravenous'] },
    { name: 'Ceftriaxone', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'] },
    { name: 'Metronidazole', doses: ['200mg', '400mg', '500mg'], routes: ['oral', 'intravenous'] },
    { name: 'Ciprofloxacin', doses: ['250mg', '500mg', '750mg'], routes: ['oral', 'intravenous'] },
    { name: 'Gentamicin', doses: ['80mg', '120mg'], routes: ['intravenous', 'intramuscular'] },
  ],
  antiinflammatories: [
    { name: 'Prednisolone', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['oral'] },
    { name: 'Hydrocortisone', doses: ['50mg', '100mg', '200mg'], routes: ['intravenous', 'intramuscular'] },
    { name: 'Dexamethasone', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous'] },
  ],
  vitamins: [
    { name: 'Vitamin C', doses: ['500mg', '1000mg'], routes: ['oral', 'intravenous'] },
    { name: 'Vitamin B Complex', doses: ['1 tablet', '2 tablets'], routes: ['oral'] },
    { name: 'Ferrous Sulphate', doses: ['200mg', '300mg'], routes: ['oral'] },
    { name: 'Zinc Sulphate', doses: ['20mg', '50mg'], routes: ['oral'] },
    { name: 'Folic Acid', doses: ['5mg'], routes: ['oral'] },
  ],
  anticoagulants: [
    { name: 'Enoxaparin', doses: ['20mg', '40mg', '60mg', '80mg'], routes: ['subcutaneous'] },
    { name: 'Heparin', doses: ['5000units'], routes: ['subcutaneous', 'intravenous'] },
    { name: 'Warfarin', doses: ['2mg', '5mg'], routes: ['oral'] },
  ],
  antifungals: [
    { name: 'Fluconazole', doses: ['50mg', '150mg', '200mg'], routes: ['oral', 'intravenous'] },
    { name: 'Nystatin', doses: ['100000units/ml'], routes: ['oral', 'topical'] },
  ],
  antihistamines: [
    { name: 'Chlorpheniramine', doses: ['4mg'], routes: ['oral', 'intramuscular'] },
    { name: 'Loratadine', doses: ['10mg'], routes: ['oral'] },
    { name: 'Cetirizine', doses: ['10mg'], routes: ['oral'] },
  ],
  cardiovascular: [
    { name: 'Amlodipine', doses: ['5mg', '10mg'], routes: ['oral'] },
    { name: 'Lisinopril', doses: ['5mg', '10mg', '20mg'], routes: ['oral'] },
    { name: 'Atenolol', doses: ['25mg', '50mg', '100mg'], routes: ['oral'] },
    { name: 'Furosemide', doses: ['20mg', '40mg', '80mg'], routes: ['oral', 'intravenous'] },
  ],
  gastrointestinal: [
    { name: 'Omeprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'] },
    { name: 'Metoclopramide', doses: ['10mg'], routes: ['oral', 'intravenous', 'intramuscular'] },
    { name: 'Ondansetron', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous'] },
    { name: 'Lactulose', doses: ['15ml', '30ml'], routes: ['oral'] },
  ],
  diabetes: [
    { name: 'Metformin', doses: ['500mg', '850mg', '1g'], routes: ['oral'] },
    { name: 'Glibenclamide', doses: ['2.5mg', '5mg'], routes: ['oral'] },
    { name: 'Insulin Regular', doses: ['5units', '10units'], routes: ['subcutaneous', 'intravenous'] },
  ],
  sedatives: [
    { name: 'Diazepam', doses: ['2mg', '5mg', '10mg'], routes: ['oral', 'intravenous'] },
    { name: 'Midazolam', doses: ['2.5mg', '5mg'], routes: ['intravenous', 'intramuscular'] },
  ],
  other: [],
};

// ============== INVESTIGATION TYPES ==============
const investigationTypes = [
  { value: 'full_blood_count', label: 'Full Blood Count (FBC)', category: 'hematology' },
  { value: 'electrolytes', label: 'Electrolytes, Urea & Creatinine', category: 'biochemistry' },
  { value: 'liver_function', label: 'Liver Function Test (LFT)', category: 'biochemistry' },
  { value: 'renal_function', label: 'Renal Function Test', category: 'biochemistry' },
  { value: 'blood_glucose', label: 'Blood Glucose (FBS/RBS)', category: 'biochemistry' },
  { value: 'hba1c', label: 'HbA1c', category: 'biochemistry' },
  { value: 'lipid_profile', label: 'Lipid Profile', category: 'biochemistry' },
  { value: 'coagulation', label: 'Coagulation Profile (PT/INR/APTT)', category: 'hematology' },
  { value: 'blood_culture', label: 'Blood Culture', category: 'microbiology' },
  { value: 'wound_swab', label: 'Wound Swab M/C/S', category: 'microbiology' },
  { value: 'urinalysis', label: 'Urinalysis', category: 'biochemistry' },
  { value: 'xray', label: 'X-Ray', category: 'imaging' },
  { value: 'ultrasound', label: 'Ultrasound', category: 'imaging' },
  { value: 'ct_scan', label: 'CT Scan', category: 'imaging' },
  { value: 'mri', label: 'MRI', category: 'imaging' },
  { value: 'ecg', label: 'ECG', category: 'cardiology' },
  { value: 'echocardiogram', label: 'Echocardiogram', category: 'cardiology' },
  { value: 'biopsy', label: 'Biopsy/Histopathology', category: 'histopathology' },
];

// ============== PROCEDURE TYPES ==============
const procedureTypes = [
  { value: 'wound_debridement', label: 'Wound Debridement' },
  { value: 'wound_dressing', label: 'Wound Dressing Change' },
  { value: 'abscess_drainage', label: 'Abscess Incision & Drainage' },
  { value: 'suturing', label: 'Suturing/Wound Closure' },
  { value: 'catheterization', label: 'Urinary Catheterization' },
  { value: 'ng_tube', label: 'NG Tube Insertion' },
  { value: 'central_line', label: 'Central Line Insertion' },
  { value: 'iv_cannulation', label: 'IV Cannulation' },
  { value: 'blood_transfusion', label: 'Blood Transfusion' },
  { value: 'skin_graft', label: 'Skin Grafting' },
  { value: 'amputation', label: 'Amputation' },
  { value: 'escharotomy', label: 'Escharotomy' },
  { value: 'fasciotomy', label: 'Fasciotomy' },
  { value: 'npwt', label: 'NPWT Application' },
  { value: 'physiotherapy', label: 'Physiotherapy Session' },
  { value: 'other', label: 'Other Procedure' },
];

const routeOptions: { value: MedicationRoute; label: string }[] = [
  { value: 'oral', label: 'Oral (PO)' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'topical', label: 'Topical' },
  { value: 'rectal', label: 'Rectal (PR)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'sublingual', label: 'Sublingual (SL)' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
];

const frequencyOptions = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'Once only', 'As needed (PRN)', 'Before meals', 'After meals',
  'At bedtime', 'Weekly', 'Alternate days',
];

const priorityOptions = [
  { value: 'routine', label: 'Routine', color: 'bg-gray-100 text-gray-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-amber-100 text-amber-700' },
  { value: 'stat', label: 'STAT', color: 'bg-red-100 text-red-700' },
];

// ============== SCHEMAS ==============
const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name required'),
  category: z.string().min(1, 'Category required'),
  dosage: z.string().min(1, 'Dosage required'),
  frequency: z.string().min(1, 'Frequency required'),
  route: z.string().min(1, 'Route required'),
  duration: z.string().min(1, 'Duration required'),
  quantity: z.number().min(1, 'Quantity required'),
  instructions: z.string().optional(),
});

const investigationSchema = z.object({
  type: z.string().min(1, 'Investigation type required'),
  priority: z.string().min(1, 'Priority required'),
  clinicalDetails: z.string().optional(),
  fasting: z.boolean().optional(),
});

const procedureSchema = z.object({
  type: z.string().min(1, 'Procedure type required'),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, 'Scheduled date required'),
  scheduledTime: z.string().optional(),
  priority: z.string().min(1, 'Priority required'),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

const implementationLogSchema = z.object({
  actionType: z.string().min(1, 'Action type required'),
  details: z.string().min(3, 'Details required'),
  notes: z.string().optional(),
});

type MedicationFormData = z.infer<typeof medicationSchema>;
type InvestigationFormData = z.infer<typeof investigationSchema>;
type ProcedureFormData = z.infer<typeof procedureSchema>;
type ImplementationLogFormData = z.infer<typeof implementationLogSchema>;

// ============== INTERFACES ==============
interface TreatmentPlanProcedure {
  id: string;
  type: string;
  typeName: string;
  description?: string;
  scheduledDate: Date;
  scheduledTime?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  completedAt?: Date;
  completedBy?: string;
  completedByName?: string;
  createdAt: Date;
}

interface ImplementationLog {
  id: string;
  treatmentPlanId: string;
  actionType: 'medication_administered' | 'investigation_collected' | 'procedure_performed' | 'dressing_changed' | 'vitals_recorded' | 'other';
  actionTypeName: string;
  details: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  performedAt: Date;
  linkedItemId?: string; // ID of prescription, investigation, or procedure
}

// Extended Treatment Plan with additional fields
interface ExtendedTreatmentPlan extends TreatmentPlan {
  linkedPrescriptionIds?: string[];
  linkedInvestigationIds?: string[];
  procedures?: TreatmentPlanProcedure[];
  implementationLogs?: ImplementationLog[];
}

// ============== COMPONENT ==============
export default function EnhancedTreatmentPlanCard({
  patientId,
  admissionId,
  relatedEntityId,
  relatedEntityType = 'general',
  clinicianId,
  clinicianName,
  hospitalId,
}: EnhancedTreatmentPlanCardProps) {
  // Modal states
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'investigations' | 'procedures' | 'tracking'>('overview');
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);
  
  // Medication form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<{ name: string; doses: string[]; routes: MedicationRoute[] } | null>(null);
  const [medications, setMedications] = useState<MedicationFormData[]>([]);

  // Fetch treatment plans
  const treatmentPlans = useLiveQuery(
    () => {
      if (admissionId) {
        return db.treatmentPlans
          .where('relatedEntityId')
          .equals(admissionId)
          .toArray();
      }
      if (relatedEntityId) {
        return db.treatmentPlans
          .where('relatedEntityId')
          .equals(relatedEntityId)
          .toArray();
      }
      return db.treatmentPlans
        .where('patientId')
        .equals(patientId)
        .toArray();
    },
    [patientId, admissionId, relatedEntityId]
  ) as ExtendedTreatmentPlan[] | undefined;

  // Fetch linked prescriptions
  const prescriptions = useLiveQuery(
    () => db.prescriptions.where('patientId').equals(patientId).toArray(),
    [patientId]
  );

  // Fetch linked investigations
  const investigations = useLiveQuery(
    () => db.investigations.where('patientId').equals(patientId).toArray(),
    [patientId]
  );

  // Fetch users for assignment
  const users = useLiveQuery(() => db.users.toArray(), []);

  const userMap = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string; role: string }>();
    users?.forEach(u => map.set(u.id, { firstName: u.firstName, lastName: u.lastName, role: u.role }));
    return map;
  }, [users]);

  // Forms
  const { register: registerMed, handleSubmit: handleSubmitMed, reset: resetMed, formState: { errors: medErrors }, setValue: setMedValue, watch: watchMed } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: { quantity: 1 },
  });

  // Watch frequency and duration for auto-calculation
  const watchedFrequency = watchMed('frequency');
  const watchedDuration = watchMed('duration');

  // Helper function to get doses per day from frequency
  const getDosesPerDay = (frequency: string): number => {
    const freqLower = frequency?.toLowerCase() || '';
    if (freqLower.includes('once daily') || freqLower.includes('at bedtime') || freqLower.includes('weekly')) return 1;
    if (freqLower.includes('twice daily') || freqLower.includes('every 12 hours')) return 2;
    if (freqLower.includes('three times daily') || freqLower.includes('every 8 hours')) return 3;
    if (freqLower.includes('four times daily') || freqLower.includes('every 6 hours')) return 4;
    if (freqLower.includes('every 4 hours')) return 6;
    if (freqLower.includes('once only')) return 1;
    if (freqLower.includes('alternate days')) return 0.5;
    if (freqLower.includes('before meals') || freqLower.includes('after meals')) return 3;
    return 1; // Default
  };

  // Parse duration to get number of days
  const parseDurationToDays = (duration: string): number => {
    if (!duration) return 0;
    const match = duration.match(/(\d+)/);
    if (!match) return 0;
    const num = parseInt(match[1], 10);
    const durLower = duration.toLowerCase();
    if (durLower.includes('week')) return num * 7;
    if (durLower.includes('month')) return num * 30;
    return num; // Assume days by default
  };

  // Auto-calculate quantity when frequency or duration changes
  useEffect(() => {
    if (watchedFrequency && watchedDuration) {
      const dosesPerDay = getDosesPerDay(watchedFrequency);
      const days = parseDurationToDays(watchedDuration);
      if (dosesPerDay > 0 && days > 0) {
        const calculatedQuantity = Math.ceil(dosesPerDay * days);
        setMedValue('quantity', calculatedQuantity);
      }
    }
  }, [watchedFrequency, watchedDuration, setMedValue]);

  const { register: registerInv, handleSubmit: handleSubmitInv, reset: resetInv, formState: { errors: invErrors } } = useForm<InvestigationFormData>({
    resolver: zodResolver(investigationSchema),
    defaultValues: { priority: 'routine', fasting: false },
  });

  const { register: registerProc, handleSubmit: handleSubmitProc, reset: resetProc, formState: { errors: procErrors } } = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureSchema),
    defaultValues: { priority: 'routine', scheduledDate: new Date().toISOString().split('T')[0] },
  });

  const { register: registerLog, handleSubmit: handleSubmitLog, reset: resetLog, formState: { errors: logErrors } } = useForm<ImplementationLogFormData>({
    resolver: zodResolver(implementationLogSchema),
  });

  // ============== HANDLERS ==============
  
  const addMedicationToList = (data: MedicationFormData) => {
    setMedications(prev => [...prev, data]);
    resetMed();
    setSelectedCategory('');
    setSelectedMedication(null);
    toast.success('Medication added to prescription');
  };

  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const submitPrescription = async () => {
    if (!selectedPlanId || medications.length === 0) {
      toast.error('Add at least one medication');
      return;
    }

    try {
      const prescription: Prescription = {
        id: uuidv4(),
        patientId,
        hospitalId,
        encounterId: admissionId,
        medications: medications.map(med => ({
          id: uuidv4(),
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route as MedicationRoute,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions,
          isDispensed: false,
        })),
        status: 'pending',
        prescribedBy: clinicianId,
        prescribedAt: new Date(),
        notes: `Linked to Treatment Plan`,
      };

      await db.prescriptions.add(prescription);
      syncRecord('prescriptions', prescription as unknown as Record<string, unknown>);

      // Link to treatment plan
      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const linkedPrescriptionIds = [...(plan.linkedPrescriptionIds || []), prescription.id];
        await db.treatmentPlans.update(selectedPlanId, { 
          linkedPrescriptionIds,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      setMedications([]);
      setShowMedicationModal(false);
      toast.success('Prescription created successfully!');
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const submitInvestigation = async (data: InvestigationFormData) => {
    if (!selectedPlanId) return;

    try {
      const invType = investigationTypes.find(t => t.value === data.type);
      const investigation: Investigation = {
        id: uuidv4(),
        patientId,
        hospitalId,
        admissionId,
        type: data.type,
        typeName: invType?.label || data.type,
        category: invType?.category as Investigation['category'] || 'other',
        priority: data.priority as 'routine' | 'urgent' | 'stat',
        status: 'requested',
        fasting: data.fasting,
        clinicalDetails: data.clinicalDetails,
        requestedBy: clinicianId,
        requestedByName: clinicianName,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.investigations.add(investigation);
      syncRecord('investigations', investigation as unknown as Record<string, unknown>);

      // Link to treatment plan
      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const linkedInvestigationIds = [...(plan.linkedInvestigationIds || []), investigation.id];
        await db.treatmentPlans.update(selectedPlanId, { 
          linkedInvestigationIds,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      resetInv();
      setShowInvestigationModal(false);
      toast.success('Investigation requested successfully!');
    } catch (error) {
      console.error('Error requesting investigation:', error);
      toast.error('Failed to request investigation');
    }
  };

  const submitProcedure = async (data: ProcedureFormData) => {
    if (!selectedPlanId) return;

    try {
      const procType = procedureTypes.find(t => t.value === data.type);
      const assignedUser = data.assignedTo ? userMap.get(data.assignedTo) : null;
      
      const procedure: TreatmentPlanProcedure = {
        id: uuidv4(),
        type: data.type,
        typeName: procType?.label || data.type,
        description: data.description,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        priority: data.priority as 'routine' | 'urgent' | 'stat',
        status: 'scheduled',
        assignedTo: data.assignedTo,
        assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : undefined,
        notes: data.notes,
        createdAt: new Date(),
      };

      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const procedures = [...(plan.procedures || []), procedure];
        await db.treatmentPlans.update(selectedPlanId, { 
          procedures,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      resetProc();
      setShowProcedureModal(false);
      toast.success('Procedure scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling procedure:', error);
      toast.error('Failed to schedule procedure');
    }
  };

  const submitImplementationLog = async (data: ImplementationLogFormData) => {
    if (!selectedPlanId) return;

    try {
      const actionLabels: Record<string, string> = {
        medication_administered: 'Medication Administered',
        investigation_collected: 'Investigation Sample Collected',
        procedure_performed: 'Procedure Performed',
        dressing_changed: 'Dressing Changed',
        vitals_recorded: 'Vitals Recorded',
        other: 'Other Action',
      };

      const log: ImplementationLog = {
        id: uuidv4(),
        treatmentPlanId: selectedPlanId,
        actionType: data.actionType as ImplementationLog['actionType'],
        actionTypeName: actionLabels[data.actionType] || data.actionType,
        details: data.details,
        notes: data.notes,
        performedBy: clinicianId,
        performedByName: clinicianName,
        performedAt: new Date(),
      };

      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const implementationLogs = [...(plan.implementationLogs || []), log];
        await db.treatmentPlans.update(selectedPlanId, { 
          implementationLogs,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      resetLog();
      setShowLogModal(false);
      toast.success('Implementation logged successfully!');
    } catch (error) {
      console.error('Error logging implementation:', error);
      toast.error('Failed to log implementation');
    }
  };

  const markProcedureComplete = async (planId: string, procedureId: string) => {
    try {
      const plan = await db.treatmentPlans.get(planId) as ExtendedTreatmentPlan;
      if (!plan) return;

      const procedures = (plan.procedures || []).map(p => {
        if (p.id === procedureId) {
          return {
            ...p,
            status: 'completed' as const,
            completedAt: new Date(),
            completedBy: clinicianId,
            completedByName: clinicianName,
          };
        }
        return p;
      });

      await db.treatmentPlans.update(planId, { procedures, updatedAt: new Date() } as Partial<ExtendedTreatmentPlan>);
      toast.success('Procedure marked as complete');
    } catch (error) {
      console.error('Error updating procedure:', error);
      toast.error('Failed to update procedure');
    }
  };

  const togglePlanExpand = (planId: string) => {
    setExpandedPlans(prev =>
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  // ============== CHART DATA ==============
  const getInvestigationTrendData = (investigationIds: string[]) => {
    if (!investigations) return [];

    const linkedInvs = investigations.filter(inv => investigationIds.includes(inv.id));
    const dataPoints: { date: string; [key: string]: string | number }[] = [];

    linkedInvs.forEach(inv => {
      if (inv.results && inv.results.length > 0) {
        inv.results.forEach(result => {
          const dateStr = format(new Date(inv.completedAt || inv.requestedAt), 'MMM d');
          const existing = dataPoints.find(dp => dp.date === dateStr);
          const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
          
          if (!isNaN(numValue)) {
            if (existing) {
              existing[result.parameter] = numValue;
            } else {
              dataPoints.push({ date: dateStr, [result.parameter]: numValue });
            }
          }
        });
      }
    });

    return dataPoints;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      on_hold: 'bg-amber-100 text-amber-700',
      discontinued: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-700',
      dispensed: 'bg-green-100 text-green-700',
      requested: 'bg-blue-100 text-blue-700',
      processing: 'bg-amber-100 text-amber-700',
      scheduled: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    );
  };

  // ============== RENDER ==============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Treatment Plan Management</h2>
              <p className="text-sm text-gray-500">Prescriptions, Investigations, Procedures & Tracking</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Treatment Plan
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: ClipboardList },
            { id: 'medications', label: 'Medications', icon: Pill },
            { id: 'investigations', label: 'Investigations', icon: FlaskConical },
            { id: 'procedures', label: 'Procedures', icon: Scissors },
            { id: 'tracking', label: 'Implementation Tracking', icon: UserCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {(!treatmentPlans || treatmentPlans.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Treatment Plans</h3>
          <p className="text-gray-500 mb-4">Create a treatment plan to manage medications, investigations, and procedures.</p>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Create Treatment Plan
          </button>
        </div>
      )}

      {/* Treatment Plans */}
      {treatmentPlans && treatmentPlans.length > 0 && (
        <div className="space-y-4">
          {treatmentPlans.map(plan => {
            const extPlan = plan as ExtendedTreatmentPlan;
            const isExpanded = expandedPlans.includes(plan.id);
            const daysActive = differenceInDays(new Date(), new Date(plan.startDate));
            const linkedPrescriptions = prescriptions?.filter(p => extPlan.linkedPrescriptionIds?.includes(p.id)) || [];
            const linkedInvestigations = investigations?.filter(i => extPlan.linkedInvestigationIds?.includes(i.id)) || [];
            const procedures = extPlan.procedures || [];
            const logs = extPlan.implementationLogs || [];

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                {/* Plan Header */}
                <div
                  className="p-4 bg-gradient-to-r from-sky-50 to-white flex items-center justify-between cursor-pointer"
                  onClick={() => togglePlanExpand(plan.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-sky-100 rounded-lg">
                      {isExpanded ? <ChevronUp size={20} className="text-sky-600" /> : <ChevronDown size={20} className="text-sky-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Started {format(new Date(plan.startDate), 'MMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span>{daysActive} days active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Pill size={14} /> {linkedPrescriptions.length} Prescriptions
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <FlaskConical size={14} /> {linkedInvestigations.length} Investigations
                      </div>
                    </div>
                    {getStatusBadge(plan.status)}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t"
                    >
                      <div className="p-4 space-y-6">
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowMedicationModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <Pill size={16} />
                            Add Prescription
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowInvestigationModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <FlaskConical size={16} />
                            Request Investigation
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowProcedureModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <Scissors size={16} />
                            Schedule Procedure
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowLogModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <UserCheck size={16} />
                            Log Implementation
                          </button>
                        </div>

                        {/* Overview Tab Content */}
                        {activeTab === 'overview' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <Pill size={18} />
                                <span className="font-medium">Prescriptions</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-900">{linkedPrescriptions.length}</p>
                              <p className="text-sm text-blue-600">
                                {linkedPrescriptions.filter(p => p.status === 'dispensed').length} dispensed
                              </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-purple-700 mb-2">
                                <FlaskConical size={18} />
                                <span className="font-medium">Investigations</span>
                              </div>
                              <p className="text-2xl font-bold text-purple-900">{linkedInvestigations.length}</p>
                              <p className="text-sm text-purple-600">
                                {linkedInvestigations.filter(i => i.status === 'completed').length} completed
                              </p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-amber-700 mb-2">
                                <Scissors size={18} />
                                <span className="font-medium">Procedures</span>
                              </div>
                              <p className="text-2xl font-bold text-amber-900">{procedures.length}</p>
                              <p className="text-sm text-amber-600">
                                {procedures.filter(p => p.status === 'completed').length} completed
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-green-700 mb-2">
                                <UserCheck size={18} />
                                <span className="font-medium">Implementation Logs</span>
                              </div>
                              <p className="text-2xl font-bold text-green-900">{logs.length}</p>
                              <p className="text-sm text-green-600">Total entries</p>
                            </div>
                          </div>
                        )}

                        {/* Medications Tab */}
                        {activeTab === 'medications' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Pill size={18} className="text-blue-600" />
                              Linked Prescriptions
                            </h4>
                            {linkedPrescriptions.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No prescriptions linked to this plan</p>
                            ) : (
                              <div className="space-y-3">
                                {linkedPrescriptions.map(rx => (
                                  <div key={rx.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-500">
                                          Prescribed {format(new Date(rx.prescribedAt), 'MMM d, yyyy h:mm a')}
                                        </span>
                                      </div>
                                      {getStatusBadge(rx.status)}
                                    </div>
                                    <div className="grid gap-2">
                                      {rx.medications.map((med, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                          <div>
                                            <p className="font-medium text-gray-900">{med.name}</p>
                                            <p className="text-sm text-gray-500">
                                              {med.dosage} • {med.frequency} • {med.route} • {med.duration}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm text-gray-500">Qty: {med.quantity}</p>
                                            {med.isDispensed && (
                                              <span className="text-xs text-green-600 flex items-center gap-1">
                                                <CheckCircle size={12} /> Dispensed
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Investigations Tab */}
                        {activeTab === 'investigations' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <FlaskConical size={18} className="text-purple-600" />
                              Linked Investigations
                            </h4>
                            {linkedInvestigations.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No investigations linked to this plan</p>
                            ) : (
                              <>
                                {/* Investigation Trend Chart */}
                                {linkedInvestigations.some(i => i.results && i.results.length > 0) && (
                                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                      <LineChart size={16} />
                                      Results Trend
                                    </h5>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <RechartsLineChart data={getInvestigationTrendData(extPlan.linkedInvestigationIds || [])}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        {linkedInvestigations
                                          .flatMap(inv => inv.results || [])
                                          .filter((r, i, arr) => arr.findIndex(x => x.parameter === r.parameter) === i)
                                          .slice(0, 3)
                                          .map((result, idx) => (
                                            <Line
                                              key={result.parameter}
                                              type="monotone"
                                              dataKey={result.parameter}
                                              stroke={['#3b82f6', '#10b981', '#f59e0b'][idx % 3]}
                                              strokeWidth={2}
                                            />
                                          ))}
                                      </RechartsLineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}

                                {/* Investigation List */}
                                <div className="space-y-3">
                                  {linkedInvestigations.map(inv => (
                                    <div key={inv.id} className="border rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-medium text-gray-900">{inv.typeName || inv.type}</p>
                                          <p className="text-sm text-gray-500">
                                            Requested {format(new Date(inv.requestedAt), 'MMM d, yyyy h:mm a')}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {getStatusBadge(inv.status)}
                                          {getStatusBadge(inv.priority)}
                                        </div>
                                      </div>
                                      
                                      {/* Results */}
                                      {inv.results && inv.results.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                          <p className="text-sm font-medium text-gray-700 mb-2">Results:</p>
                                          <div className="grid gap-2">
                                            {inv.results.map((result, idx) => (
                                              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                                                <span className="text-sm text-gray-700">{result.parameter}</span>
                                                <div className="flex items-center gap-2">
                                                  <span className={`font-medium ${
                                                    result.status === 'high' || result.status === 'critical' ? 'text-red-600' :
                                                    result.status === 'low' ? 'text-amber-600' : 'text-green-600'
                                                  }`}>
                                                    {result.value} {result.unit}
                                                  </span>
                                                  {result.referenceRange && (
                                                    <span className="text-xs text-gray-400">({result.referenceRange})</span>
                                                  )}
                                                  {result.trend && (
                                                    result.trend === 'increasing' ? <TrendingUp size={14} className="text-red-500" /> :
                                                    result.trend === 'decreasing' ? <TrendingDown size={14} className="text-green-500" /> :
                                                    <Minus size={14} className="text-gray-400" />
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Procedures Tab */}
                        {activeTab === 'procedures' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Scissors size={18} className="text-amber-600" />
                              Scheduled Procedures
                            </h4>
                            {procedures.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No procedures scheduled</p>
                            ) : (
                              <div className="space-y-3">
                                {procedures.map(proc => (
                                  <div key={proc.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <p className="font-medium text-gray-900">{proc.typeName}</p>
                                        <p className="text-sm text-gray-500">
                                          Scheduled: {format(new Date(proc.scheduledDate), 'MMM d, yyyy')}
                                          {proc.scheduledTime && ` at ${proc.scheduledTime}`}
                                        </p>
                                        {proc.assignedToName && (
                                          <p className="text-sm text-gray-500">
                                            Assigned to: {proc.assignedToName}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getStatusBadge(proc.status)}
                                        {getStatusBadge(proc.priority)}
                                      </div>
                                    </div>
                                    {proc.description && (
                                      <p className="text-sm text-gray-600 mb-2">{proc.description}</p>
                                    )}
                                    {proc.status !== 'completed' && proc.status !== 'cancelled' && (
                                      <button
                                        onClick={() => markProcedureComplete(plan.id, proc.id)}
                                        className="btn btn-sm btn-primary mt-2"
                                      >
                                        <CheckCircle size={14} />
                                        Mark Complete
                                      </button>
                                    )}
                                    {proc.completedAt && (
                                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <CheckCircle size={12} />
                                        Completed by {proc.completedByName} on {format(new Date(proc.completedAt), 'MMM d, yyyy h:mm a')}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Implementation Tracking Tab */}
                        {activeTab === 'tracking' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <UserCheck size={18} className="text-green-600" />
                              Implementation Timeline
                            </h4>
                            {logs.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No implementation logs yet</p>
                            ) : (
                              <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
                                {logs
                                  .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
                                  .map(log => (
                                    <div key={log.id} className="relative">
                                      <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
                                      <div className="bg-gray-50 rounded-lg p-4 ml-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-gray-900">{log.actionTypeName}</span>
                                          <span className="text-xs text-gray-500">
                                            {format(new Date(log.performedAt), 'MMM d, yyyy h:mm a')}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{log.details}</p>
                                        {log.notes && (
                                          <p className="text-sm text-gray-500 mt-1 italic">Note: {log.notes}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                          By: {log.performedByName}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ============== MODALS ============== */}

      {/* New Plan Modal */}
      <AnimatePresence>
        {showNewPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Create Treatment Plan</h3>
                  <button onClick={() => setShowNewPlanModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const description = formData.get('description') as string;

                    if (!title) {
                      toast.error('Plan title is required');
                      return;
                    }

                    try {
                      const plan: ExtendedTreatmentPlan = {
                        id: uuidv4(),
                        patientId,
                        relatedEntityId: admissionId || relatedEntityId,
                        relatedEntityType,
                        title,
                        description,
                        clinicalGoals: [],
                        orders: [],
                        frequency: 'Once daily',
                        startDate: new Date(),
                        status: 'active',
                        createdBy: clinicianId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        linkedPrescriptionIds: [],
                        linkedInvestigationIds: [],
                        procedures: [],
                        implementationLogs: [],
                      };

                      await db.treatmentPlans.add(plan);
                      syncRecord('treatment_plans', plan as unknown as Record<string, unknown>);
                      toast.success('Treatment plan created!');
                      setShowNewPlanModal(false);
                      setSelectedPlanId(plan.id);
                      setExpandedPlans(prev => [...prev, plan.id]);
                    } catch (error) {
                      console.error('Error creating plan:', error);
                      toast.error('Failed to create treatment plan');
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="label">Plan Title *</label>
                    <input name="title" className="input" placeholder="e.g., Post-Cellulitis Ulcer Care Plan" required />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea name="description" className="input" rows={3} placeholder="Brief description of the treatment approach..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowNewPlanModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      Create Plan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medication Modal */}
      <AnimatePresence>
        {showMedicationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowMedicationModal(false); setMedications([]); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Add Prescription</h3>
                  <button onClick={() => { setShowMedicationModal(false); setMedications([]); }} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                {/* Added Medications List */}
                {medications.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-2">Medications to Prescribe:</h4>
                    <div className="space-y-2">
                      {medications.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-blue-900">{med.name}</p>
                            <p className="text-sm text-blue-700">{med.dosage} • {med.frequency} • {med.route} • {med.duration}</p>
                          </div>
                          <button onClick={() => removeMedication(idx)} className="text-red-500 hover:text-red-700" title="Remove medication" aria-label="Remove medication">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={submitPrescription} className="btn btn-primary w-full mt-4">
                      <Save size={16} />
                      Submit Prescription ({medications.length} medication{medications.length > 1 ? 's' : ''})
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmitMed(addMedicationToList)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category *</label>
                      <select
                        {...registerMed('category')}
                        className={`input ${medErrors.category ? 'input-error' : ''}`}
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setMedValue('category', e.target.value);
                          setSelectedMedication(null);
                        }}
                      >
                        <option value="">Select category...</option>
                        {medicationCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Medication *</label>
                      <select
                        {...registerMed('name')}
                        className={`input ${medErrors.name ? 'input-error' : ''}`}
                        onChange={(e) => {
                          const med = commonMedications[selectedCategory]?.find(m => m.name === e.target.value);
                          setSelectedMedication(med || null);
                          setMedValue('name', e.target.value);
                        }}
                        disabled={!selectedCategory}
                      >
                        <option value="">Select medication...</option>
                        {selectedCategory && commonMedications[selectedCategory]?.map(med => (
                          <option key={med.name} value={med.name}>{med.name}</option>
                        ))}
                        <option value="other">Other (specify)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Dose *</label>
                      {selectedMedication ? (
                        <select {...registerMed('dosage')} className={`input ${medErrors.dosage ? 'input-error' : ''}`}>
                          <option value="">Select dose...</option>
                          {selectedMedication.doses.map(dose => (
                            <option key={dose} value={dose}>{dose}</option>
                          ))}
                        </select>
                      ) : (
                        <input {...registerMed('dosage')} className={`input ${medErrors.dosage ? 'input-error' : ''}`} placeholder="e.g., 500mg" />
                      )}
                    </div>
                    <div>
                      <label className="label">Frequency *</label>
                      <select {...registerMed('frequency')} className={`input ${medErrors.frequency ? 'input-error' : ''}`}>
                        <option value="">Select frequency...</option>
                        {frequencyOptions.map(freq => (
                          <option key={freq} value={freq}>{freq}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Route *</label>
                      {selectedMedication ? (
                        <select {...registerMed('route')} className={`input ${medErrors.route ? 'input-error' : ''}`}>
                          <option value="">Select route...</option>
                          {selectedMedication.routes.map(route => (
                            <option key={route} value={route}>
                              {routeOptions.find(r => r.value === route)?.label || route}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select {...registerMed('route')} className={`input ${medErrors.route ? 'input-error' : ''}`}>
                          <option value="">Select route...</option>
                          {routeOptions.map(route => (
                            <option key={route.value} value={route.value}>{route.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="label">Duration *</label>
                      <input {...registerMed('duration')} className={`input ${medErrors.duration ? 'input-error' : ''}`} placeholder="e.g., 5 days" />
                    </div>
                    <div>
                      <label className="label">Quantity * <span className="text-xs text-gray-500">(auto-calculated)</span></label>
                      <input type="number" {...registerMed('quantity', { valueAsNumber: true })} className={`input ${medErrors.quantity ? 'input-error' : ''} bg-gray-50`} min={1} readOnly title="Auto-calculated from frequency and duration" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Instructions</label>
                    <textarea {...registerMed('instructions')} className="input" rows={2} placeholder="Additional instructions..." />
                  </div>

                  <button type="submit" className="btn btn-secondary w-full">
                    <Plus size={16} />
                    Add Medication to List
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Investigation Modal */}
      <AnimatePresence>
        {showInvestigationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInvestigationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Request Investigation</h3>
                  <button onClick={() => setShowInvestigationModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitInv(submitInvestigation)} className="space-y-4">
                  <div>
                    <label className="label">Investigation Type *</label>
                    <select {...registerInv('type')} className={`input ${invErrors.type ? 'input-error' : ''}`}>
                      <option value="">Select investigation...</option>
                      {investigationTypes.map(inv => (
                        <option key={inv.value} value={inv.value}>{inv.label}</option>
                      ))}
                    </select>
                    {invErrors.type && <p className="text-sm text-red-500 mt-1">{invErrors.type.message}</p>}
                  </div>

                  <div>
                    <label className="label">Priority *</label>
                    <div className="flex gap-4">
                      {priorityOptions.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <input type="radio" {...registerInv('priority')} value={opt.value} className="text-sky-600" />
                          <span className={`px-2 py-1 rounded text-sm ${opt.color}`}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Clinical Details</label>
                    <textarea {...registerInv('clinicalDetails')} className="input" rows={2} placeholder="Relevant clinical information..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...registerInv('fasting')} id="fasting" className="rounded text-sky-600" />
                    <label htmlFor="fasting" className="text-sm text-gray-700">Fasting required</label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowInvestigationModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <FlaskConical size={16} />
                      Request Investigation
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Procedure Modal */}
      <AnimatePresence>
        {showProcedureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProcedureModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Procedure</h3>
                  <button onClick={() => setShowProcedureModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitProc(submitProcedure)} className="space-y-4">
                  <div>
                    <label className="label">Procedure Type *</label>
                    <select {...registerProc('type')} className={`input ${procErrors.type ? 'input-error' : ''}`}>
                      <option value="">Select procedure...</option>
                      {procedureTypes.map(proc => (
                        <option key={proc.value} value={proc.value}>{proc.label}</option>
                      ))}
                    </select>
                    {procErrors.type && <p className="text-sm text-red-500 mt-1">{procErrors.type.message}</p>}
                  </div>

                  <div>
                    <label className="label">Description</label>
                    <textarea {...registerProc('description')} className="input" rows={2} placeholder="Procedure details..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Scheduled Date *</label>
                      <input type="date" {...registerProc('scheduledDate')} className={`input ${procErrors.scheduledDate ? 'input-error' : ''}`} />
                    </div>
                    <div>
                      <label className="label">Time</label>
                      <input type="time" {...registerProc('scheduledTime')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Assign To</label>
                    <select {...registerProc('assignedTo')} className="input">
                      <option value="">Select staff member...</option>
                      {users?.filter(u => ['surgeon', 'doctor', 'nurse'].includes(u.role)).map(user => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Priority *</label>
                    <div className="flex gap-4">
                      {priorityOptions.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <input type="radio" {...registerProc('priority')} value={opt.value} className="text-sky-600" />
                          <span className={`px-2 py-1 rounded text-sm ${opt.color}`}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea {...registerProc('notes')} className="input" rows={2} placeholder="Additional notes..." />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowProcedureModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <Scissors size={16} />
                      Schedule Procedure
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Implementation Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Log Implementation</h3>
                  <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitLog(submitImplementationLog)} className="space-y-4">
                  <div>
                    <label className="label">Action Type *</label>
                    <select {...registerLog('actionType')} className={`input ${logErrors.actionType ? 'input-error' : ''}`}>
                      <option value="">Select action...</option>
                      <option value="medication_administered">Medication Administered</option>
                      <option value="investigation_collected">Investigation Sample Collected</option>
                      <option value="procedure_performed">Procedure Performed</option>
                      <option value="dressing_changed">Dressing Changed</option>
                      <option value="vitals_recorded">Vitals Recorded</option>
                      <option value="other">Other</option>
                    </select>
                    {logErrors.actionType && <p className="text-sm text-red-500 mt-1">{logErrors.actionType.message}</p>}
                  </div>

                  <div>
                    <label className="label">Details *</label>
                    <textarea
                      {...registerLog('details')}
                      className={`input ${logErrors.details ? 'input-error' : ''}`}
                      rows={3}
                      placeholder="Describe what was done..."
                    />
                    {logErrors.details && <p className="text-sm text-red-500 mt-1">{logErrors.details.message}</p>}
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea {...registerLog('notes')} className="input" rows={2} placeholder="Additional notes or observations..." />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    <p><strong>Logged by:</strong> {clinicianName}</p>
                    <p><strong>Timestamp:</strong> {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowLogModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <UserCheck size={16} />
                      Log Implementation
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
