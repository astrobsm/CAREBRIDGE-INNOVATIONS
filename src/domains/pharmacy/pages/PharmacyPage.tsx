import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pill,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  X,
  Save,
  Trash2,
  Info,
  FileText,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';
import { generatePrescriptionPDF, generateDispensingSlipPDF } from '../../../utils/prescriptionPdfGenerator';
import type { Prescription, Medication, MedicationRoute } from '../../../types';
import { PatientSelector, PatientDisplay } from '../../../components/patient';
import { usePatientMap } from '../../../services/patientHooks';

// BNF-adapted medication database for Africa
const medicationDatabase = {
  analgesics: [
    { name: 'Paracetamol', genericName: 'Acetaminophen', doses: ['500mg', '1g'], routes: ['oral', 'intravenous', 'rectal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Ibuprofen', genericName: 'Ibuprofen', doses: ['200mg', '400mg', '600mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: true },
    { name: 'Diclofenac', genericName: 'Diclofenac Sodium', doses: ['25mg', '50mg', '75mg'], routes: ['oral', 'intramuscular', 'rectal'], frequency: ['8 hourly', '12 hourly'], maxDaily: '150mg', renalAdjust: true },
    { name: 'Tramadol', genericName: 'Tramadol HCl', doses: ['50mg', '100mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Morphine', genericName: 'Morphine Sulphate', doses: ['5mg', '10mg', '15mg'], routes: ['oral', 'intravenous', 'subcutaneous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Pentazocine', genericName: 'Pentazocine', doses: ['30mg', '60mg'], routes: ['intramuscular', 'intravenous'], frequency: ['4 hourly', '6 hourly'], maxDaily: '360mg', renalAdjust: true },
  ],
  antibiotics: [
    { name: 'Amoxicillin', genericName: 'Amoxicillin', doses: ['250mg', '500mg', '1g'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '3g', renalAdjust: true },
    { name: 'Amoxicillin-Clavulanate', genericName: 'Co-Amoxiclav', doses: ['375mg', '625mg', '1.2g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
    { name: 'Ceftriaxone', genericName: 'Ceftriaxone', doses: ['1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['24 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin', doses: ['250mg', '500mg', '750mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '1.5g PO, 800mg IV', renalAdjust: true },
    { name: 'Metronidazole', genericName: 'Metronidazole', doses: ['200mg', '400mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Gentamicin', genericName: 'Gentamicin', doses: ['80mg', '5-7mg/kg'], routes: ['intravenous', 'intramuscular'], frequency: ['24 hourly', '8 hourly'], maxDaily: '7mg/kg', renalAdjust: true },
    { name: 'Cefuroxime', genericName: 'Cefuroxime', doses: ['250mg', '500mg', '750mg', '1.5g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
    { name: 'Azithromycin', genericName: 'Azithromycin', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['24 hourly'], maxDaily: '500mg', renalAdjust: false },
    { name: 'Clindamycin', genericName: 'Clindamycin', doses: ['150mg', '300mg', '600mg', '900mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4.8g', renalAdjust: false },
    { name: 'Meropenem', genericName: 'Meropenem', doses: ['500mg', '1g', '2g'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '6g', renalAdjust: true },
  ],
  antiinflammatories: [
    { name: 'Prednisolone', genericName: 'Prednisolone', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily', 'Divided doses'], maxDaily: '60mg', renalAdjust: false },
    { name: 'Hydrocortisone', genericName: 'Hydrocortisone', doses: ['100mg', '200mg'], routes: ['intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Dexamethasone', genericName: 'Dexamethasone', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '16mg', renalAdjust: false },
    { name: 'Celecoxib', genericName: 'Celecoxib', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', '24 hourly'], maxDaily: '400mg', renalAdjust: true },
  ],
  vitamins: [
    { name: 'Vitamin C', genericName: 'Ascorbic Acid', doses: ['500mg', '1000mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '2g', renalAdjust: false },
    { name: 'Vitamin B Complex', genericName: 'Vitamin B Complex', doses: ['1 tablet'], routes: ['oral', 'intramuscular'], frequency: ['Once daily'], maxDaily: '2 tablets', renalAdjust: false },
    { name: 'Folic Acid', genericName: 'Folic Acid', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: false },
    { name: 'Vitamin D3', genericName: 'Cholecalciferol', doses: ['1000IU', '50000IU'], routes: ['oral'], frequency: ['Once daily', 'Weekly'], maxDaily: '4000IU daily', renalAdjust: false },
    { name: 'Ferrous Sulphate', genericName: 'Iron', doses: ['200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: false },
    { name: 'Zinc Sulphate', genericName: 'Zinc', doses: ['20mg', '220mg'], routes: ['oral'], frequency: ['Once daily', '8 hourly'], maxDaily: '660mg', renalAdjust: true },
  ],
  anticoagulants: [
    { name: 'Enoxaparin', genericName: 'Enoxaparin', doses: ['40mg', '60mg', '80mg', '1mg/kg'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: '2mg/kg', renalAdjust: true },
    { name: 'Heparin', genericName: 'Unfractionated Heparin', doses: ['5000units', '80units/kg'], routes: ['subcutaneous', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Infusion'], maxDaily: 'Titrate to APTT', renalAdjust: false },
    { name: 'Warfarin', genericName: 'Warfarin', doses: ['1mg', '2mg', '3mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'Titrate to INR', renalAdjust: false },
    { name: 'Rivaroxaban', genericName: 'Rivaroxaban', doses: ['10mg', '15mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '20mg', renalAdjust: true },
    { name: 'Aspirin', genericName: 'Acetylsalicylic Acid', doses: ['75mg', '100mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
  ],
  antipyretics: [
    { name: 'Paracetamol', genericName: 'Acetaminophen', doses: ['500mg', '1g'], routes: ['oral', 'intravenous', 'rectal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: false },
  ],
  antifungals: [
    { name: 'Fluconazole', genericName: 'Fluconazole', doses: ['50mg', '100mg', '150mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Clotrimazole', genericName: 'Clotrimazole', doses: ['1% cream', '100mg pessary', '500mg pessary'], routes: ['topical'], frequency: ['12 hourly', 'Once daily'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Nystatin', genericName: 'Nystatin', doses: ['100000units/ml'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '6ml QDS', renalAdjust: false },
    { name: 'Itraconazole', genericName: 'Itraconazole', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
  ],
  antihistamines: [
    { name: 'Chlorpheniramine', genericName: 'Chlorpheniramine', doses: ['4mg', '10mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['8 hourly', '6 hourly'], maxDaily: '24mg', renalAdjust: false },
    { name: 'Loratadine', genericName: 'Loratadine', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Cetirizine', genericName: 'Cetirizine', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
    { name: 'Promethazine', genericName: 'Promethazine', doses: ['25mg', '50mg'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
  ],
  antacids: [
    { name: 'Omeprazole', genericName: 'Omeprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: false },
    { name: 'Pantoprazole', genericName: 'Pantoprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
    { name: 'Ranitidine', genericName: 'Ranitidine', doses: ['150mg', '300mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '300mg', renalAdjust: true },
  ],
  antiemetics: [
    { name: 'Metoclopramide', genericName: 'Metoclopramide', doses: ['10mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly'], maxDaily: '30mg', renalAdjust: true },
    { name: 'Ondansetron', genericName: 'Ondansetron', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '24mg', renalAdjust: false },
    { name: 'Prochlorperazine', genericName: 'Prochlorperazine', doses: ['5mg', '12.5mg'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly'], maxDaily: '40mg', renalAdjust: false },
  ],
  others: [],
};

const medicationCategories = [
  { value: 'analgesics', label: 'Analgesics' },
  { value: 'antibiotics', label: 'Antibiotics' },
  { value: 'antiinflammatories', label: 'Anti-inflammatory' },
  { value: 'vitamins', label: 'Vitamins & Minerals' },
  { value: 'anticoagulants', label: 'Anticoagulants' },
  { value: 'antipyretics', label: 'Antipyretics' },
  { value: 'antifungals', label: 'Antifungals' },
  { value: 'antihistamines', label: 'Antihistamines' },
  { value: 'antacids', label: 'Antacids/PPIs' },
  { value: 'antiemetics', label: 'Antiemetics' },
  { value: 'others', label: 'Others' },
];

const routes: { value: MedicationRoute; label: string }[] = [
  { value: 'oral', label: 'Oral (PO)' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'topical', label: 'Topical' },
  { value: 'rectal', label: 'Rectal (PR)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
];

const prescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  notes: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface MedicationEntry {
  id: string;
  category: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  duration: string;
  quantity: number;
  instructions: string;
}

export default function PharmacyPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [currentMed, setCurrentMed] = useState<Partial<MedicationEntry>>({
    category: 'analgesics',
    route: 'oral',
    quantity: 1,
  });

  const prescriptions = useLiveQuery(() => db.prescriptions.orderBy('prescribedAt').reverse().toArray(), []);
  
  // Use the new patient map hook for efficient lookups
  const patientMap = usePatientMap();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
  });

  const availableMeds = useMemo(() => {
    if (!currentMed.category) return [];
    return medicationDatabase[currentMed.category as keyof typeof medicationDatabase] || [];
  }, [currentMed.category]);

  const selectedMedInfo = useMemo(() => {
    return availableMeds.find(m => m.name === currentMed.name);
  }, [availableMeds, currentMed.name]);

  const addMedication = () => {
    if (!currentMed.name || !currentMed.dosage || !currentMed.frequency || !currentMed.duration) {
      toast.error('Please fill in all medication fields');
      return;
    }

    const med: MedicationEntry = {
      id: uuidv4(),
      category: currentMed.category || 'others',
      name: currentMed.name,
      genericName: selectedMedInfo?.genericName || currentMed.name,
      dosage: currentMed.dosage,
      frequency: currentMed.frequency,
      route: currentMed.route || 'oral',
      duration: currentMed.duration,
      quantity: currentMed.quantity || 1,
      instructions: currentMed.instructions || '',
    };

    setMedications([...medications, med]);
    setCurrentMed({
      category: 'analgesics',
      route: 'oral',
      quantity: 1,
    });
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const filteredPrescriptions = useMemo(() => {
    if (!prescriptions) return [];
    return prescriptions.filter((rx) => {
      const patient = patientMap.get(rx.patientId);
      const matchesSearch = searchQuery === '' ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, searchQuery, statusFilter, patientMap]);

  const onSubmit = async (data: PrescriptionFormData) => {
    if (!user || medications.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    try {
      const meds: Medication[] = medications.map(med => ({
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        duration: med.duration,
        quantity: med.quantity,
        instructions: med.instructions,
        isDispensed: false,
      }));

      const prescription: Prescription = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        medications: meds,
        status: 'pending',
        prescribedBy: user.id,
        prescribedAt: new Date(),
        notes: data.notes,
      };

      await db.prescriptions.add(prescription);
      toast.success('Prescription created successfully!');
      setShowModal(false);
      setMedications([]);
      reset();
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const getStatusBadge = (status: Prescription['status']) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      case 'dispensed':
        return <span className="badge badge-success"><CheckCircle size={12} /> Dispensed</span>;
      case 'partially_dispensed':
        return <span className="badge badge-info"><AlertTriangle size={12} /> Partial</span>;
      case 'cancelled':
        return <span className="badge badge-danger"><X size={12} /> Cancelled</span>;
      default:
        return null;
    }
  };

  const handleExportPrescription = async (prescription: Prescription) => {
    const patient = patientMap.get(prescription.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      // Get prescriber info
      const prescriber = await db.users.get(prescription.prescribedBy);
      
      generatePrescriptionPDF({
        prescriptionId: prescription.id,
        prescribedDate: new Date(prescription.prescribedAt),
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber,
          age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
          gender: patient.gender,
          phone: patient.phone,
          address: patient.address,
        },
        hospitalName: 'CareBridge Innovations in Healthcare',
        hospitalPhone: '09028724839',
        hospitalEmail: 'info.carebridge@gmail.com',
        prescribedBy: prescriber ? `${prescriber.firstName} ${prescriber.lastName}`  : 'Unknown',
        prescriberTitle: prescriber?.role || 'Doctor',
        medications: prescription.medications.map(med => ({
          name: med.name,
          genericName: med.genericName,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions,
          isDispensed: med.isDispensed,
        })),
        status: prescription.status,
        notes: prescription.notes,
      });

      toast.success('Prescription PDF downloaded');
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportDispensingSlip = async (prescription: Prescription) => {
    const patient = patientMap.get(prescription.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      const prescriber = await db.users.get(prescription.prescribedBy);
      
      generateDispensingSlipPDF({
        prescriptionId: prescription.id,
        prescribedDate: new Date(prescription.prescribedAt),
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber,
        },
        hospitalName: 'CareBridge Innovations in Healthcare',
        prescribedBy: prescriber ? `${prescriber.firstName} ${prescriber.lastName}` : 'Unknown',
        medications: prescription.medications.map(med => ({
          name: med.name,
          genericName: med.genericName,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions,
          isDispensed: med.isDispensed,
        })),
        status: prescription.status,
        dispensedBy: user ? `${user.firstName} ${user.lastName}` : undefined,
        dispensedAt: prescription.dispensedAt ? new Date(prescription.dispensedAt) : undefined,
      });

      toast.success('Dispensing slip PDF downloaded');
    } catch (error) {
      console.error('Error generating dispensing slip:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Pill className="w-7 h-7 text-violet-500" />
            Pharmacy
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Prescription management with BNF-adapted dosing
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          New Prescription
        </button>
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
              placeholder="Search by patient name..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="dispensed">Dispensed</option>
            <option value="partially_dispensed">Partially Dispensed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Prescriptions List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prescribed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPrescriptions.length > 0 ? (
                filteredPrescriptions.map((rx) => {
                  const patient = patientMap.get(rx.patientId);
                  return (
                    <tr key={rx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                              <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                            </div>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {rx.medications.slice(0, 3).map((med) => (
                            <span key={med.id} className="badge badge-secondary text-xs">
                              {med.name} {med.dosage}
                            </span>
                          ))}
                          {rx.medications.length > 3 && (
                            <span className="badge badge-info text-xs">
                              +{rx.medications.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(rx.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(rx.prescribedAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExportPrescription(rx)}
                            className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Download Prescription PDF"
                          >
                            <FileText size={18} />
                          </button>
                          {(rx.status === 'dispensed' || rx.status === 'partially_dispensed') && (
                            <button
                              onClick={() => handleExportDispensingSlip(rx)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download Dispensing Slip"
                            >
                              <Download size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No prescriptions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Prescription Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Prescription</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(90vh-80px)]">
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Patient Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <PatientSelector
                        value={watch('patientId')}
                        onChange={(patientId) => setValue('patientId', patientId || '')}
                        label="Patient"
                        required
                        error={errors.patientId?.message}
                      />
                    </div>
                    <div>
                      <label className="label">Notes</label>
                      <input {...register('notes')} className="input" placeholder="Additional instructions..." />
                    </div>
                  </div>

                  {/* Add Medication Form */}
                  <div className="card border-2 border-dashed border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Add Medication</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="label text-xs">Category</label>
                        <select
                          value={currentMed.category}
                          onChange={(e) => setCurrentMed({ ...currentMed, category: e.target.value, name: '' })}
                          className="input text-sm"
                        >
                          {medicationCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Medication</label>
                        <select
                          value={currentMed.name || ''}
                          onChange={(e) => setCurrentMed({ ...currentMed, name: e.target.value })}
                          className="input text-sm"
                        >
                          <option value="">Select...</option>
                          {availableMeds.map((med) => (
                            <option key={med.name} value={med.name}>{med.name}</option>
                          ))}
                          <option value="OTHER">Other (specify)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Dose</label>
                        {selectedMedInfo ? (
                          <select
                            value={currentMed.dosage || ''}
                            onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                            className="input text-sm"
                          >
                            <option value="">Select...</option>
                            {selectedMedInfo.doses.map((dose) => (
                              <option key={dose} value={dose}>{dose}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={currentMed.dosage || ''}
                            onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., 500mg"
                          />
                        )}
                      </div>
                      <div>
                        <label className="label text-xs">Frequency</label>
                        {selectedMedInfo ? (
                          <select
                            value={currentMed.frequency || ''}
                            onChange={(e) => setCurrentMed({ ...currentMed, frequency: e.target.value })}
                            className="input text-sm"
                          >
                            <option value="">Select...</option>
                            {selectedMedInfo.frequency.map((freq) => (
                              <option key={freq} value={freq}>{freq}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={currentMed.frequency || ''}
                            onChange={(e) => setCurrentMed({ ...currentMed, frequency: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., 8 hourly"
                          />
                        )}
                      </div>
                      <div>
                        <label className="label text-xs">Route</label>
                        <select
                          value={currentMed.route}
                          onChange={(e) => setCurrentMed({ ...currentMed, route: e.target.value as MedicationRoute })}
                          className="input text-sm"
                        >
                          {routes.map((route) => (
                            <option key={route.value} value={route.value}>{route.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Duration</label>
                        <input
                          value={currentMed.duration || ''}
                          onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                          className="input text-sm"
                          placeholder="e.g., 5 days"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Quantity</label>
                        <input
                          type="number"
                          value={currentMed.quantity || ''}
                          onChange={(e) => setCurrentMed({ ...currentMed, quantity: Number(e.target.value) })}
                          className="input text-sm"
                          min="1"
                        />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={addMedication} className="btn btn-primary w-full">
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>

                    {selectedMedInfo && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-700">
                          <p><strong>Max daily:</strong> {selectedMedInfo.maxDaily}</p>
                          {selectedMedInfo.renalAdjust && <p className="text-red-600">⚠️ Requires renal dose adjustment</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Medications List */}
                  {medications.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Prescribed Medications ({medications.length})</h3>
                      <div className="space-y-2">
                        {medications.map((med, index) => (
                          <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {med.name} {med.dosage} <span className="text-gray-500">({med.genericName})</span>
                                </p>
                                <p className="text-sm text-gray-500">
                                  {med.route.toUpperCase()} • {med.frequency} • {med.duration} • Qty: {med.quantity}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedication(med.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center gap-4 p-6 border-t bg-gray-50">
                  <p className="text-sm text-gray-500">
                    {medications.length} medication(s) added
                  </p>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={medications.length === 0}>
                      <Save size={18} />
                      Create Prescription
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
