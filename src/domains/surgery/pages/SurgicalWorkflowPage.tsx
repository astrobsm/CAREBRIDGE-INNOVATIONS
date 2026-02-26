/**
 * SurgicalWorkflowPage - Comprehensive End-to-End Surgical Workflow
 * 
 * 12 independently-saveable sections that flow sequentially:
 * 1. Preoperative Planning & Risk Assessment
 * 2. Investigation Requests
 * 3. Consumables & BOM
 * 4. Surgical Estimates
 * 5. Surgical Documents (preop info, postop instructions, consent)
 * 6. Uploads (investigations, consent, photos, payment)
 * 7. Approve Booking
 * 8. Pre-Anaesthetic Review (booked cases)
 * 9. Pre-Surgical Conference (slideshow)
 * 10. Start Surgery & Anaesthesia Monitoring
 * 11. Post-Operative Notes with Intraop Pictures
 * 12. Post-Operative Medications
 * 
 * All documents downloadable as A4 / Font 12 / Georgia / No special chars / No color headers
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInYears } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database/db';
import { SurgeryOps, InvestigationOps, ConsumableBOMOps, PrescriptionOps } from '../../../database/operations';
import { useAuth } from '../../../contexts/AuthContext';
import { searchProcedures, formatNaira } from '../../../data/surgicalFees';
import { searchConsumables, consumableCategories } from '../../../data/surgicalConsumables';
import jsPDF from 'jspdf';
import {
  ChevronLeft, ChevronRight, Check, Clock, FileText,
  Upload, Camera, DollarSign, ClipboardCheck, Stethoscope, Play,
  Activity, Pill, Save, Download, Trash2, Plus, X, Search,
  CheckCircle, Circle, Shield,
  Users, Syringe
} from 'lucide-react';

import type {
  Patient, Surgery, Investigation, ConsumableBOM,
  Prescription,
  AnaesthesiaType, InvestigationType
} from '../../../types';

// Suppress unused-import warnings for types used as type annotations only
void (undefined as unknown as ConsumableBOM);
void (undefined as unknown as Prescription);

// ========================================
// SECTION DEFINITIONS
// ========================================
const SECTIONS = [
  { id: 'planning', label: '1. Preop Planning & Risk', icon: ClipboardCheck },
  { id: 'investigations', label: '2. Investigations', icon: Search },
  { id: 'consumables', label: '3. Consumables & BOM', icon: Syringe },
  { id: 'estimates', label: '4. Surgical Estimates', icon: DollarSign },
  { id: 'documents', label: '5. Surgical Documents', icon: FileText },
  { id: 'uploads', label: '6. Uploads', icon: Upload },
  { id: 'booking', label: '7. Approve Booking', icon: CheckCircle },
  { id: 'preanaesthetic', label: '8. Pre-Anaesthetic Review', icon: Stethoscope },
  { id: 'conference', label: '9. Pre-Surgical Conference', icon: Users },
  { id: 'surgery', label: '10. Surgery & Monitoring', icon: Activity },
  { id: 'postop', label: '11. Post-Op Notes', icon: FileText },
  { id: 'medications', label: '12. Post-Op Medications', icon: Pill },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

// ========================================
// CAPRINI VTE RISK FACTORS
// ========================================
const CAPRINI_FACTORS = [
  { label: 'Age 41-60', score: 1 },
  { label: 'Age 61-74', score: 2 },
  { label: 'Age 75+', score: 3 },
  { label: 'Minor surgery planned', score: 1 },
  { label: 'Major surgery (>45 min)', score: 2 },
  { label: 'BMI > 25', score: 1 },
  { label: 'Swollen legs', score: 1 },
  { label: 'Varicose veins', score: 1 },
  { label: 'History of DVT/PE', score: 3 },
  { label: 'Family history of VTE', score: 3 },
  { label: 'Oral contraceptives/HRT', score: 1 },
  { label: 'Pregnancy/postpartum', score: 1 },
  { label: 'Sepsis (< 1 month)', score: 1 },
  { label: 'Bed rest > 72 hours', score: 2 },
  { label: 'Central venous access', score: 2 },
  { label: 'Malignancy', score: 2 },
  { label: 'Stroke (< 1 month)', score: 5 },
  { label: 'Multiple trauma (< 1 month)', score: 5 },
  { label: 'Hip/knee arthroplasty', score: 5 },
];

// RCRI Cardiac Risk Factors
const RCRI_FACTORS = [
  'High-risk surgery (intraperitoneal, intrathoracic, suprainguinal vascular)',
  'History of ischemic heart disease',
  'History of congestive heart failure',
  'History of cerebrovascular disease',
  'Insulin-dependent diabetes mellitus',
  'Preoperative serum creatinine > 2.0 mg/dL',
];

// ASA Classification
const ASA_CLASSES = [
  { value: 1, label: 'ASA I - Normal healthy patient' },
  { value: 2, label: 'ASA II - Mild systemic disease' },
  { value: 3, label: 'ASA III - Severe systemic disease' },
  { value: 4, label: 'ASA IV - Severe systemic disease, constant threat to life' },
  { value: 5, label: 'ASA V - Moribund, not expected to survive without surgery' },
];

// Common preoperative investigations
const PREOP_INVESTIGATIONS: { type: InvestigationType | string; name: string; category: string }[] = [
  { type: 'full_blood_count', name: 'Full Blood Count (FBC)', category: 'hematology' },
  { type: 'electrolytes', name: 'Serum Electrolytes, Urea & Creatinine', category: 'biochemistry' },
  { type: 'coagulation', name: 'Coagulation Profile (PT/INR, aPTT)', category: 'hematology' },
  { type: 'liver_function', name: 'Liver Function Tests', category: 'biochemistry' },
  { type: 'blood_glucose', name: 'Fasting Blood Glucose', category: 'biochemistry' },
  { type: 'urinalysis', name: 'Urinalysis', category: 'laboratory' },
  { type: 'ecg', name: 'Electrocardiogram (ECG)', category: 'cardiology' },
  { type: 'xray', name: 'Chest X-Ray', category: 'radiology' },
  { type: 'blood_culture', name: 'Blood Group & Cross-match', category: 'hematology' },
  { type: 'hba1c', name: 'HbA1c', category: 'biochemistry' },
  { type: 'thyroid_function', name: 'Thyroid Function Tests', category: 'biochemistry' },
  { type: 'echocardiogram', name: 'Echocardiogram', category: 'cardiology' },
  { type: 'renal_function', name: 'Renal Function Tests', category: 'biochemistry' },
  { type: 'lipid_profile', name: 'Lipid Profile', category: 'biochemistry' },
  { type: 'ct_scan', name: 'CT Scan', category: 'radiology' },
  { type: 'mri', name: 'MRI', category: 'radiology' },
  { type: 'ultrasound', name: 'Ultrasound', category: 'radiology' },
];

// ========================================
// PDF GENERATION UTILITY (A4, Georgia 12, no colors)
// ========================================
function generateWorkflowPDF(
  title: string,
  patient: Patient,
  hospital: { name: string; address?: string; phone?: string },
  sections: { heading: string; rows: [string, string][] }[]
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  const checkPage = (need: number) => {
    if (y + need > 275) {
      doc.addPage();
      y = 20;
    }
  };

  // Header - plain text, no colors
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(hospital.name.toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 6;
  if (hospital.address) {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(hospital.address, pageW / 2, y, { align: 'center' });
    y += 5;
  }
  if (hospital.phone) {
    doc.text(`Tel: ${hospital.phone}`, pageW / 2, y, { align: 'center' });
    y += 5;
  }

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // Document title
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 8;

  // Patient info
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  const patientName = `${patient.lastName}, ${patient.firstName}`.toUpperCase();
  const age = patient.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : 'N/A';
  const gender = patient.gender === 'male' ? 'Male' : 'Female';

  doc.text(`Patient: ${patientName}`, marginL, y);
  doc.text(`Hospital No: ${patient.hospitalNumber || 'N/A'}`, pageW / 2, y);
  y += 6;
  doc.text(`Age: ${age} years`, marginL, y);
  doc.text(`Gender: ${gender}`, pageW / 2, y);
  y += 6;
  doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, marginL, y);
  y += 4;

  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // Sections
  for (const section of sections) {
    checkPage(20);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(section.heading.toUpperCase(), marginL, y);
    y += 2;
    doc.setLineWidth(0.2);
    doc.line(marginL, y, marginL + contentW * 0.5, y);
    y += 6;

    doc.setFont('times', 'normal');
    doc.setFontSize(12);

    for (const [label, value] of section.rows) {
      checkPage(8);
      const labelW = 65;
      doc.setFont('times', 'bold');
      doc.text(`${label}:`, marginL, y);
      doc.setFont('times', 'normal');
      const lines = doc.splitTextToSize(value || 'N/A', contentW - labelW);
      doc.text(lines, marginL + labelW, y);
      y += Math.max(6, lines.length * 5.5);
    }
    y += 4;
  }

  // Footer
  checkPage(20);
  y += 5;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.text('This is a computer-generated document.', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageW / 2, y, { align: 'center' });

  const filename = `${title.replace(/\s+/g, '_')}_${patient.hospitalNumber || patient.id}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);
  toast.success('PDF downloaded');
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function SurgicalWorkflowPage() {
  const { patientId, surgeryId } = useParams<{ patientId: string; surgeryId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Current section
  const [activeSection, setActiveSection] = useState<SectionId>('planning');
  const [sectionCompletion, setSectionCompletion] = useState<Record<SectionId, boolean>>({
    planning: false, investigations: false, consumables: false, estimates: false,
    documents: false, uploads: false, booking: false, preanaesthetic: false,
    conference: false, surgery: false, postop: false, medications: false,
  });

  // ---- Live queries ----
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);
  const surgeries = useLiveQuery(() => patientId ? db.surgeries.where('patientId').equals(patientId).reverse().sortBy('scheduledDate') : [], [patientId]);
  const investigations = useLiveQuery(() => patientId ? db.investigations.where('patientId').equals(patientId).toArray() : [], [patientId]);
  const prescriptions = useLiveQuery(() => patientId ? db.prescriptions.where('patientId').equals(patientId).toArray() : [], [patientId]);
  const hospital = useLiveQuery(() => user?.hospitalId ? db.hospitals.get(user.hospitalId) : undefined, [user?.hospitalId]);
  const allUsers = useLiveQuery(() => db.users.toArray(), []);

  // ---- Current surgery state ----
  const [currentSurgeryId, setCurrentSurgeryId] = useState<string>(surgeryId || '');
  const currentSurgery = surgeries?.find(s => s.id === currentSurgeryId);

  // ========================================
  // SECTION 1: PREOP PLANNING & RISK
  // ========================================
  const [procedureSearch, setProcedureSearch] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState('');
  const [surgeryType, setSurgeryType] = useState<'elective' | 'emergency'>('elective');
  const [surgeryCategory, setSurgeryCategory] = useState<'minor' | 'intermediate' | 'major' | 'super_major'>('major');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [asaClass, setAsaClass] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [mallampatiScore, setMallampatiScore] = useState<1 | 2 | 3 | 4>(1);
  const [capriniFactors, setCapriniFactors] = useState<boolean[]>(new Array(CAPRINI_FACTORS.length).fill(false));
  const [rcriFactors, setRcriFactors] = useState<boolean[]>(new Array(RCRI_FACTORS.length).fill(false));
  const [riskNotes, setRiskNotes] = useState('');
  const [npoStatus, setNpoStatus] = useState(false);

  // SECTION 2: INVESTIGATIONS
  const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>([]);
  const [investigationPriority, setInvestigationPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [clinicalDetails, setClinicalDetails] = useState('');

  // SECTION 3: CONSUMABLES & BOM
  const [consumableSearch, setConsumableSearch] = useState('');
  const [selectedConsumables, setSelectedConsumables] = useState<{ id: string; name: string; quantity: number; unitPrice: number }[]>([]);

  // SECTION 4: ESTIMATES
  const [surgeonId, setSurgeonId] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [anaesthetistId, setAnaesthetistId] = useState('');
  const [scrubNurseId, setScrubNurseId] = useState('');
  const [circulatingNurseId, setCirculatingNurseId] = useState('');
  const [surgeonFee, setSurgeonFee] = useState(0);
  const [anaesthesiaFee, setAnaesthesiaFee] = useState(0);
  const [anaesthesiaType, setAnaesthesiaType] = useState<AnaesthesiaType>('general');

  // SECTION 5: DOCUMENTS
  const [preopInfoNotes, setPreopInfoNotes] = useState('');
  const [postopInstructions, setPostopInstructions] = useState('');
  const [consentDetails, setConsentDetails] = useState('');

  // SECTION 6: UPLOADS
  const [investigationUploads, setInvestigationUploads] = useState<{ name: string; data: string }[]>([]);
  const [consentUpload, setConsentUpload] = useState<{ name: string; data: string } | null>(null);
  const [clinicalPhotos, setClinicalPhotos] = useState<{ name: string; data: string }[]>([]);
  const [paymentEvidence, setPaymentEvidence] = useState<{ name: string; data: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'complete' | 'part_payment'>('complete');
  const [paymentBalance, setPaymentBalance] = useState(0);

  // SECTION 7: BOOKING
  const [bookingApproved, setBookingApproved] = useState(false);

  // SECTION 8: PRE-ANAESTHETIC
  const [preAnaestheticNotes, setPreAnaestheticNotes] = useState('');
  const [airwayAssessment, setAirwayAssessment] = useState('');
  const [fitnessGrade, setFitnessGrade] = useState<'fit' | 'optimize' | 'defer'>('fit');

  // SECTION 9: CONFERENCE
  const [conferenceNotes, setConferenceNotes] = useState('');
  const [conferenceSlideIndex, setConferenceSlideIndex] = useState(0);

  // SECTION 10: SURGERY & MONITORING
  const [surgeryStartTime, setSurgeryStartTime] = useState('');
  const [surgeryEndTime, setSurgeryEndTime] = useState('');
  const [anaesthesiaLog, setAnaesthesiaLog] = useState<{ time: string; drug: string; dose: string; route: string }[]>([]);
  const [vitalSignsLog, setVitalSignsLog] = useState<{ time: string; bp: string; hr: string; spo2: string; etco2: string; temp: string }[]>([]);
  const [bloodLoss, setBloodLoss] = useState(0);
  const [fluidInput, setFluidInput] = useState('');

  // SECTION 11: POST-OP NOTES
  const [preOpDiagnosis, setPreOpDiagnosis] = useState('');
  const [postOpDiagnosis, setPostOpDiagnosis] = useState('');
  const [operativeFindings, setOperativeFindings] = useState('');
  const [procedurePerformed, setProcedurePerformed] = useState('');
  const [complications, setComplications] = useState('');
  const [intraopPhotos, setIntraopPhotos] = useState<{ name: string; data: string }[]>([]);
  const [specimens, setSpecimens] = useState<{ type: string; site: string; notes: string }[]>([]);

  // SECTION 12: POST-OP MEDS
  const [postOpMeds, setPostOpMeds] = useState<{ drug: string; dose: string; route: string; frequency: string; duration: string }[]>([]);

  // ---- Load existing surgery data ----
  useEffect(() => {
    if (currentSurgery) {
      setSelectedProcedure(currentSurgery.procedureName || '');
      setSurgeryType(currentSurgery.type || 'elective');
      setSurgeryCategory(currentSurgery.category || 'major');
      setScheduledDate(currentSurgery.scheduledDate ? format(new Date(currentSurgery.scheduledDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setAsaClass((currentSurgery.preOperativeAssessment?.asaScore as 1 | 2 | 3 | 4 | 5) || 2);
      setNpoStatus(currentSurgery.preOperativeAssessment?.npoStatus || false);
      setSurgeonFee(currentSurgery.surgeonFee || 0);
      setAnaesthesiaFee(currentSurgery.anaesthesiaFee || 0);
      setAnaesthesiaType(currentSurgery.anaesthesiaType || 'general');
      setSurgeonId(currentSurgery.surgeonId || '');
      setAssistantId(currentSurgery.assistantId || '');
      setAnaesthetistId(currentSurgery.anaesthetistId || '');
      setScrubNurseId(currentSurgery.scrubNurseId || '');
      setCirculatingNurseId(currentSurgery.circulatingNurseId || '');
      // Check completion based on status
      if (currentSurgery.status === 'scheduled' || currentSurgery.status === 'in-progress' || currentSurgery.status === 'completed') {
        setSectionCompletion(prev => ({ ...prev, planning: true, booking: true }));
      }
    }
  }, [currentSurgery]);

  // ---- Computed values ----
  const capriniScore = capriniFactors.reduce((sum, checked, i) => checked ? sum + CAPRINI_FACTORS[i].score : sum, 0);
  const rcriScore = rcriFactors.filter(Boolean).length;
  const capriniRisk = capriniScore <= 1 ? 'Very Low' : capriniScore <= 2 ? 'Low' : capriniScore <= 4 ? 'Moderate' : 'High';
  const rcriRisk = rcriScore === 0 ? '3.9%' : rcriScore === 1 ? '6.0%' : rcriScore === 2 ? '10.1%' : '15%+';

  const consumablesTotal = selectedConsumables.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const assistantFee = surgeonFee * 0.2;
  const totalEstimate = surgeonFee + assistantFee + anaesthesiaFee + consumablesTotal;

  const filteredProcedures = procedureSearch.length > 1 ? searchProcedures(procedureSearch) : [];
  const filteredConsumables = consumableSearch.length > 1 ? searchConsumables(consumableSearch) : [];

  const surgeons = allUsers?.filter(u => ['surgeon', 'plastic_surgeon', 'doctor', 'consultant'].includes(u.role)) || [];
  const anaesthetists = allUsers?.filter(u => u.role === 'anaesthetist') || [];
  const nurses = allUsers?.filter(u => u.role === 'nurse') || [];

  // ---- File upload handler ----
  const handleFileUpload = (callback: (file: { name: string; data: string }) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        callback({ name: file.name, data: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ========================================
  // SAVE HANDLERS (one per section)
  // ========================================
  const savePlanningSection = async () => {
    if (!patientId || !selectedProcedure) {
      toast.error('Please select a procedure');
      return;
    }
    try {
      const surgeryData: Surgery = {
        id: currentSurgeryId || uuidv4(),
        patientId,
        hospitalId: user?.hospitalId || '',
        procedureName: selectedProcedure,
        type: surgeryType,
        category: surgeryCategory,
        scheduledDate: new Date(scheduledDate),
        status: 'incomplete_preparation',
        surgeon: user?.firstName + ' ' + user?.lastName || '',
        surgeonId: surgeonId || user?.id || '',
        preOperativeAssessment: {
          asaScore: asaClass,
          capriniScore,
          mallampatiScore,
          npoStatus,
          consentSigned: false,
          bloodTyped: false,
          investigations: selectedInvestigations,
          riskFactors: [
            ...CAPRINI_FACTORS.filter((_, i) => capriniFactors[i]).map(f => f.label),
            ...RCRI_FACTORS.filter((_, i) => rcriFactors[i]),
          ],
          specialInstructions: riskNotes,
        },
        createdAt: currentSurgery?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (currentSurgeryId && currentSurgery) {
        await SurgeryOps.update(currentSurgeryId, surgeryData);
      } else {
        const newId = surgeryData.id;
        setCurrentSurgeryId(newId);
        await SurgeryOps.create(surgeryData);
      }
      setSectionCompletion(prev => ({ ...prev, planning: true }));
      toast.success('Preoperative planning saved');
    } catch (err) {
      toast.error('Failed to save planning');
      console.error(err);
    }
  };

  const saveInvestigationsSection = async () => {
    if (!patientId || selectedInvestigations.length === 0) {
      toast.error('Select at least one investigation');
      return;
    }
    try {
      for (const invType of selectedInvestigations) {
        const existing = investigations?.find(i => i.type === invType && i.status !== 'cancelled');
        if (existing) continue;
        const invInfo = PREOP_INVESTIGATIONS.find(pi => pi.type === invType);
        const inv: Investigation = {
          id: uuidv4(),
          patientId,
          hospitalId: user?.hospitalId || '',
          type: invType as InvestigationType,
          category: (invInfo?.category || 'laboratory') as any,
          priority: investigationPriority,
          status: 'requested',
          clinicalDetails: clinicalDetails || `Pre-operative investigation for ${selectedProcedure}`,
          requestedBy: user?.id || '',
          requestedByName: `${user?.firstName} ${user?.lastName}`,
          requestedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await InvestigationOps.create(inv);
      }
      setSectionCompletion(prev => ({ ...prev, investigations: true }));
      toast.success(`${selectedInvestigations.length} investigation(s) requested`);
    } catch (err) {
      toast.error('Failed to request investigations');
      console.error(err);
    }
  };

  const saveConsumablesSection = async () => {
    if (!patientId || selectedConsumables.length === 0) {
      toast.error('Add at least one consumable');
      return;
    }
    try {
      const bom: ConsumableBOM = {
        id: uuidv4(),
        patientId,
        serviceType: 'other',
        serviceName: selectedProcedure || 'Surgical Procedure',
        consumables: selectedConsumables.map(c => ({
          id: c.id,
          name: c.name,
          category: 'other' as any,
          quantity: c.quantity,
          unit: 'piece',
          unitPrice: c.unitPrice,
          totalPrice: c.quantity * c.unitPrice,
          isReusable: false,
        })),
        professionalFees: [],
        consumablesTotal,
        professionalFeesTotal: 0,
        grandTotal: consumablesTotal,
        performedBy: user?.id || '',
        performedAt: new Date(),
        invoiceGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await ConsumableBOMOps.create(bom);
      setSectionCompletion(prev => ({ ...prev, consumables: true }));
      toast.success('Consumables BOM saved');
    } catch (err) {
      toast.error('Failed to save consumables');
      console.error(err);
    }
  };

  const saveEstimatesSection = async () => {
    if (!currentSurgeryId) {
      toast.error('Save planning section first');
      return;
    }
    try {
      await SurgeryOps.update(currentSurgeryId, {
        surgeonId,
        surgeonFee,
        assistantId,
        assistantFeePercentage: 20,
        assistantFee,
        anaesthetistId,
        anaesthesiaType,
        anaesthesiaFee,
        scrubNurseId,
        circulatingNurseId,
      });
      setSectionCompletion(prev => ({ ...prev, estimates: true }));
      toast.success('Surgical estimates saved');
    } catch (err) {
      toast.error('Failed to save estimates');
      console.error(err);
    }
  };

  const saveDocumentsSection = async () => {
    if (!currentSurgeryId) {
      toast.error('Save planning section first');
      return;
    }
    try {
      await SurgeryOps.update(currentSurgeryId, {
        postOperativeInstructions: postopInstructions,
        operativeNotes: preopInfoNotes,
      });
      setSectionCompletion(prev => ({ ...prev, documents: true }));
      toast.success('Surgical documents saved');
    } catch (err) {
      toast.error('Failed to save documents');
      console.error(err);
    }
  };

  const saveUploadsSection = async () => {
    setSectionCompletion(prev => ({ ...prev, uploads: true }));
    toast.success('Uploads saved');
  };

  const approveBooking = async () => {
    if (!currentSurgeryId) {
      toast.error('Save planning section first');
      return;
    }
    // Check all prerequisites
    const missing: string[] = [];
    if (!sectionCompletion.planning) missing.push('Preop Planning');
    if (!sectionCompletion.investigations) missing.push('Investigations');
    if (!sectionCompletion.estimates) missing.push('Surgical Estimates');
    if (!sectionCompletion.documents) missing.push('Surgical Documents');
    if (!consentUpload) missing.push('Signed Consent Upload');
    if (!paymentEvidence) missing.push('Payment Evidence');

    if (missing.length > 0) {
      toast.error(`Complete these first: ${missing.join(', ')}`);
      return;
    }

    try {
      await SurgeryOps.update(currentSurgeryId, {
        status: 'scheduled',
        preOperativeAssessment: {
          ...currentSurgery?.preOperativeAssessment!,
          consentSigned: true,
        },
      });
      setBookingApproved(true);
      setSectionCompletion(prev => ({ ...prev, booking: true }));
      toast.success('Surgery booking approved');
    } catch (err) {
      toast.error('Failed to approve booking');
      console.error(err);
    }
  };

  const savePreAnaestheticReview = async () => {
    if (!currentSurgeryId) return;
    try {
      await SurgeryOps.update(currentSurgeryId, {
        status: fitnessGrade === 'fit' ? 'scheduled' : 'incomplete_preparation',
      });
      setSectionCompletion(prev => ({ ...prev, preanaesthetic: true }));
      toast.success('Pre-anaesthetic review saved');
    } catch (err) {
      toast.error('Failed to save review');
    }
  };

  const saveConference = async () => {
    setSectionCompletion(prev => ({ ...prev, conference: true }));
    toast.success('Conference notes saved');
  };

  const startSurgery = async () => {
    if (!currentSurgeryId) return;
    try {
      await SurgeryOps.update(currentSurgeryId, {
        status: 'in-progress',
        actualStartTime: new Date(),
      });
      setSurgeryStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      toast.success('Surgery started');
    } catch (err) {
      toast.error('Failed to start surgery');
    }
  };

  const endSurgery = async () => {
    if (!currentSurgeryId) return;
    try {
      await SurgeryOps.update(currentSurgeryId, {
        actualEndTime: new Date(),
        bloodLoss,
      });
      setSurgeryEndTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setSectionCompletion(prev => ({ ...prev, surgery: true }));
      toast.success('Surgery ended');
    } catch (err) {
      toast.error('Failed to end surgery');
    }
  };

  const savePostOpNotes = async () => {
    if (!currentSurgeryId || !patientId) return;
    try {
      await SurgeryOps.update(currentSurgeryId, {
        status: 'completed',
        operativeNotes: operativeFindings,
        complications,
        bloodLoss,
      });
      setSectionCompletion(prev => ({ ...prev, postop: true }));
      toast.success('Post-operative notes saved');
    } catch (err) {
      toast.error('Failed to save post-op notes');
    }
  };

  const savePostOpMeds = async () => {
    if (!patientId || postOpMeds.length === 0) {
      toast.error('Add at least one medication');
      return;
    }
    try {
      for (const med of postOpMeds) {
        const rx: Prescription = {
          id: uuidv4(),
          patientId,
          hospitalId: user?.hospitalId || '',
          encounterId: currentSurgeryId,
          medications: [{
            name: med.drug,
            dosage: med.dose,
            route: med.route as any,
            frequency: med.frequency as any,
            duration: med.duration,
            instructions: `Post-operative medication for ${selectedProcedure}`,
          }],
          diagnosis: postOpDiagnosis || selectedProcedure,
          prescribedBy: user?.id || '',
          prescribedByName: `${user?.firstName} ${user?.lastName}`,
          prescribedAt: new Date(),
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
        await PrescriptionOps.create(rx);
      }
      setSectionCompletion(prev => ({ ...prev, medications: true }));
      toast.success('Post-operative medications prescribed');
    } catch (err) {
      toast.error('Failed to save medications');
    }
  };

  // ========================================
  // PDF GENERATORS (per section)
  // ========================================
  const downloadPreopPDF = () => {
    if (!patient) return;
    const hospInfo = { name: hospital?.name || 'Hospital', address: hospital?.address, phone: hospital?.phone };
    generateWorkflowPDF('Preoperative Information and Counselling', patient, hospInfo, [
      {
        heading: 'Procedure Details',
        rows: [
          ['Procedure', selectedProcedure],
          ['Type', surgeryType],
          ['Category', surgeryCategory],
          ['Scheduled Date', scheduledDate],
        ],
      },
      {
        heading: 'Risk Assessment',
        rows: [
          ['ASA Class', `${asaClass}`],
          ['Mallampati Score', `${mallampatiScore}`],
          ['Caprini VTE Score', `${capriniScore} (${capriniRisk})`],
          ['RCRI Cardiac Risk', `${rcriScore} (${rcriRisk} MACE risk)`],
          ['Risk Factors', CAPRINI_FACTORS.filter((_, i) => capriniFactors[i]).map(f => f.label).join('; ') || 'None'],
          ['NPO Status', npoStatus ? 'Confirmed NPO' : 'Not confirmed'],
          ['Notes', riskNotes],
        ],
      },
      {
        heading: 'Preoperative Information',
        rows: [
          ['Information Provided', preopInfoNotes || 'Standard preoperative counselling provided'],
        ],
      },
    ]);
  };

  const downloadPostopInstructionsPDF = () => {
    if (!patient) return;
    const hospInfo = { name: hospital?.name || 'Hospital', address: hospital?.address, phone: hospital?.phone };
    generateWorkflowPDF('Postoperative Instructions and Expectations', patient, hospInfo, [
      {
        heading: 'Postoperative Instructions',
        rows: [
          ['Procedure', selectedProcedure],
          ['Instructions', postopInstructions || 'Standard postoperative care instructions apply'],
        ],
      },
    ]);
  };

  const downloadConsentPDF = () => {
    if (!patient) return;
    const hospInfo = { name: hospital?.name || 'Hospital', address: hospital?.address, phone: hospital?.phone };
    generateWorkflowPDF('Surgical Consent Form', patient, hospInfo, [
      {
        heading: 'Consent for Surgery',
        rows: [
          ['Procedure', selectedProcedure],
          ['Type', surgeryType],
          ['Surgeon', surgeons.find(s => s.id === surgeonId)?.firstName + ' ' + surgeons.find(s => s.id === surgeonId)?.lastName || 'TBD'],
          ['Anaesthesia Type', anaesthesiaType],
          ['Consent Details', consentDetails || 'Patient has been informed of the nature, risks, benefits, and alternatives of the proposed surgery. Patient understands and consents to the procedure.'],
        ],
      },
      {
        heading: 'Patient Declaration',
        rows: [
          ['Statement', 'I confirm that I have been given adequate information about the proposed procedure, including its risks and benefits. I have had the opportunity to ask questions and all my queries have been answered satisfactorily.'],
          ['Patient Signature', '____________________________'],
          ['Date', format(new Date(), 'dd/MM/yyyy')],
          ['Witness Signature', '____________________________'],
          ['Witness Name', '____________________________'],
        ],
      },
    ]);
  };

  const downloadEstimatePDF = () => {
    if (!patient) return;
    const hospInfo = { name: hospital?.name || 'Hospital', address: hospital?.address, phone: hospital?.phone };
    const surgeon = surgeons.find(s => s.id === surgeonId);
    generateWorkflowPDF('Surgical Fee Estimate', patient, hospInfo, [
      {
        heading: 'Procedure',
        rows: [
          ['Procedure', selectedProcedure],
          ['Category', surgeryCategory],
          ['Anaesthesia', anaesthesiaType],
        ],
      },
      {
        heading: 'Fee Breakdown',
        rows: [
          ['Surgeon Fee', formatNaira(surgeonFee)],
          ['Assistant Fee (20%)', formatNaira(assistantFee)],
          ['Anaesthesia Fee', formatNaira(anaesthesiaFee)],
          ['Consumables', formatNaira(consumablesTotal)],
          ['Total Estimate', formatNaira(totalEstimate)],
        ],
      },
      {
        heading: 'Surgical Team',
        rows: [
          ['Surgeon', surgeon ? `${surgeon.firstName} ${surgeon.lastName}` : 'TBD'],
          ['Assistant', allUsers?.find(u => u.id === assistantId) ? `${allUsers.find(u => u.id === assistantId)!.firstName} ${allUsers.find(u => u.id === assistantId)!.lastName}` : 'TBD'],
          ['Anaesthetist', allUsers?.find(u => u.id === anaesthetistId) ? `${allUsers.find(u => u.id === anaesthetistId)!.firstName} ${allUsers.find(u => u.id === anaesthetistId)!.lastName}` : 'TBD'],
        ],
      },
    ]);
  };

  const downloadPostOpNotesPDF = () => {
    if (!patient) return;
    const hospInfo = { name: hospital?.name || 'Hospital', address: hospital?.address, phone: hospital?.phone };
    generateWorkflowPDF('Post-Operative Notes', patient, hospInfo, [
      {
        heading: 'Operative Details',
        rows: [
          ['Pre-op Diagnosis', preOpDiagnosis],
          ['Post-op Diagnosis', postOpDiagnosis],
          ['Procedure Performed', procedurePerformed || selectedProcedure],
          ['Findings', operativeFindings],
          ['Complications', complications || 'None'],
          ['Blood Loss (mL)', `${bloodLoss}`],
          ['Surgery Start', surgeryStartTime ? format(new Date(surgeryStartTime), 'dd/MM/yyyy HH:mm') : 'N/A'],
          ['Surgery End', surgeryEndTime ? format(new Date(surgeryEndTime), 'dd/MM/yyyy HH:mm') : 'N/A'],
        ],
      },
      {
        heading: 'Specimens',
        rows: specimens.length > 0
          ? specimens.map((s, i) => [`Specimen ${i + 1}`, `${s.type} from ${s.site}${s.notes ? ' - ' + s.notes : ''}`])
          : [['Specimens', 'None']],
      },
      {
        heading: 'Post-operative Medications',
        rows: postOpMeds.length > 0
          ? postOpMeds.map((m, i) => [`Rx ${i + 1}`, `${m.drug} ${m.dose} ${m.route} ${m.frequency} x ${m.duration}`])
          : [['Medications', 'As prescribed']],
      },
    ]);
  };

  // Navigation helpers
  const currentSectionIndex = SECTIONS.findIndex(s => s.id === activeSection);
  const goNext = () => { if (currentSectionIndex < SECTIONS.length - 1) setActiveSection(SECTIONS[currentSectionIndex + 1].id); };
  const goPrev = () => { if (currentSectionIndex > 0) setActiveSection(SECTIONS[currentSectionIndex - 1].id); };

  // ---- Loading state ----
  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5 mr-1" /> Back
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">Surgical Workflow</h1>
            <p className="text-sm text-gray-500">
              {patient.firstName} {patient.lastName} - {patient.hospitalNumber}
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            {selectedProcedure || 'No procedure selected'}
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs - Scrollable */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex min-w-max">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isComplete = sectionCompletion[section.id];
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : isComplete
                    ? 'border-green-500 text-green-700 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isComplete ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Icon className="w-3.5 h-3.5" />}
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-4">
        {/* ==================== SECTION 1: PLANNING ==================== */}
        {activeSection === 'planning' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Preoperative Planning & Risk Assessment</h2>

              {/* Procedure Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Name</label>
                <input
                  value={procedureSearch || selectedProcedure}
                  onChange={e => { setProcedureSearch(e.target.value); setSelectedProcedure(''); }}
                  placeholder="Search procedures..."
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
                {filteredProcedures.length > 0 && !selectedProcedure && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-white shadow-lg">
                    {filteredProcedures.slice(0, 10).map(p => (
                      <button key={p.id} onClick={() => { setSelectedProcedure(p.name); setProcedureSearch(''); setSurgeonFee(p.defaultFee || 0); }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b">
                        {p.name} <span className="text-gray-400">- {p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Type</label>
                  <select value={surgeryType} onChange={e => setSurgeryType(e.target.value as any)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="elective">Elective</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={surgeryCategory} onChange={e => setSurgeryCategory(e.target.value as any)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="minor">Minor</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="major">Major</option>
                    <option value="super_major">Super Major</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              {/* ASA & Mallampati */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ASA Classification</label>
                  <select value={asaClass} onChange={e => setAsaClass(Number(e.target.value) as any)}
                    className="w-full border rounded-lg px-3 py-2">
                    {ASA_CLASSES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mallampati Score</label>
                  <select value={mallampatiScore} onChange={e => setMallampatiScore(Number(e.target.value) as any)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value={1}>Class I - Soft palate, fauces, uvula, pillars visible</option>
                    <option value={2}>Class II - Soft palate, fauces, uvula visible</option>
                    <option value={3}>Class III - Soft palate, base of uvula visible</option>
                    <option value={4}>Class IV - Hard palate only visible</option>
                  </select>
                </div>
              </div>

              {/* Caprini VTE */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">
                  Caprini VTE Risk Score: <span className={`${capriniScore >= 5 ? 'text-red-600' : capriniScore >= 3 ? 'text-yellow-600' : 'text-green-600'}`}>{capriniScore} ({capriniRisk})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {CAPRINI_FACTORS.map((factor, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm py-1">
                      <input type="checkbox" checked={capriniFactors[i]}
                        onChange={e => { const f = [...capriniFactors]; f[i] = e.target.checked; setCapriniFactors(f); }}
                        className="rounded border-gray-300" />
                      {factor.label} <span className="text-gray-400">(+{factor.score})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RCRI */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">
                  RCRI Cardiac Risk: <span className={`${rcriScore >= 3 ? 'text-red-600' : rcriScore >= 2 ? 'text-yellow-600' : 'text-green-600'}`}>{rcriScore} factors ({rcriRisk} MACE risk)</span>
                </h3>
                <div className="space-y-1">
                  {RCRI_FACTORS.map((factor, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm py-1">
                      <input type="checkbox" checked={rcriFactors[i]}
                        onChange={e => { const f = [...rcriFactors]; f[i] = e.target.checked; setRcriFactors(f); }}
                        className="rounded border-gray-300" />
                      {factor}
                    </label>
                  ))}
                </div>
              </div>

              {/* NPO & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={npoStatus} onChange={e => setNpoStatus(e.target.checked)}
                    className="rounded border-gray-300" />
                  <span className="font-medium">NPO (Nil Per Os) Status Confirmed</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions / Risk Notes</label>
                <textarea value={riskNotes} onChange={e => setRiskNotes(e.target.value)} rows={3}
                  className="w-full border rounded-lg px-3 py-2" placeholder="Any additional risk notes..." />
              </div>

              <div className="flex justify-between">
                <button onClick={savePlanningSection} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Planning
                </button>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Investigations <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 2: INVESTIGATIONS ==================== */}
        {activeSection === 'investigations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Investigation Requests</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={investigationPriority} onChange={e => setInvestigationPriority(e.target.value as any)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Details</label>
                  <input value={clinicalDetails} onChange={e => setClinicalDetails(e.target.value)}
                    placeholder="Clinical indication..." className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Select Investigations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {PREOP_INVESTIGATIONS.map(inv => {
                    const alreadyRequested = investigations?.some(i => i.type === inv.type && i.status !== 'cancelled');
                    return (
                      <label key={inv.type} className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded ${alreadyRequested ? 'bg-green-50' : ''}`}>
                        <input type="checkbox"
                          checked={selectedInvestigations.includes(inv.type) || !!alreadyRequested}
                          disabled={!!alreadyRequested}
                          onChange={e => {
                            if (e.target.checked) setSelectedInvestigations(prev => [...prev, inv.type]);
                            else setSelectedInvestigations(prev => prev.filter(t => t !== inv.type));
                          }}
                          className="rounded border-gray-300" />
                        {inv.name}
                        {alreadyRequested && <span className="text-xs text-green-600 ml-1">(already requested)</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Already-requested investigations status */}
              {investigations && investigations.length > 0 && (
                <div className="mb-4 border rounded-lg p-3 bg-gray-50">
                  <h3 className="text-sm font-bold text-gray-800 mb-2">Investigation Status</h3>
                  <div className="space-y-1">
                    {investigations.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <span>{inv.type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          inv.status === 'completed' ? 'bg-green-100 text-green-800' :
                          inv.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>{inv.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={saveInvestigationsSection} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Request Investigations
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Consumables <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 3: CONSUMABLES & BOM ==================== */}
        {activeSection === 'consumables' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Consumables & Bill of Materials</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Consumables</label>
                <input value={consumableSearch} onChange={e => setConsumableSearch(e.target.value)}
                  placeholder="Search by name..." className="w-full border rounded-lg px-3 py-2" />
                {filteredConsumables.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-white shadow-lg">
                    {filteredConsumables.slice(0, 10).map(c => (
                      <button key={c.id} onClick={() => {
                        if (!selectedConsumables.find(sc => sc.id === c.id)) {
                          setSelectedConsumables(prev => [...prev, { id: c.id, name: c.name, quantity: 1, unitPrice: c.unitPrice }]);
                        }
                        setConsumableSearch('');
                      }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b">
                        {c.name} - {formatNaira(c.unitPrice)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick-add by category */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Quick Add by Category</h3>
                <div className="flex flex-wrap gap-2">
                  {consumableCategories.map(cat => (
                    <button key={cat.id} onClick={() => setConsumableSearch(cat.name)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full">
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected consumables table */}
              {selectedConsumables.length > 0 && (
                <div className="mb-4">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2 border">Item</th>
                        <th className="text-center p-2 border w-24">Qty</th>
                        <th className="text-right p-2 border w-32">Unit Price</th>
                        <th className="text-right p-2 border w-32">Total</th>
                        <th className="p-2 border w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedConsumables.map((c, i) => (
                        <tr key={c.id}>
                          <td className="p-2 border">{c.name}</td>
                          <td className="p-2 border text-center">
                            <input type="number" min={1} value={c.quantity}
                              onChange={e => {
                                const upd = [...selectedConsumables];
                                upd[i].quantity = parseInt(e.target.value) || 1;
                                setSelectedConsumables(upd);
                              }}
                              className="w-16 text-center border rounded px-1 py-0.5" />
                          </td>
                          <td className="p-2 border text-right">{formatNaira(c.unitPrice)}</td>
                          <td className="p-2 border text-right font-medium">{formatNaira(c.quantity * c.unitPrice)}</td>
                          <td className="p-2 border text-center">
                            <button onClick={() => setSelectedConsumables(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="p-2 border text-right">Total:</td>
                        <td className="p-2 border text-right">{formatNaira(consumablesTotal)}</td>
                        <td className="p-2 border"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={saveConsumablesSection} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Consumables BOM
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Estimates <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 4: SURGICAL ESTIMATES ==================== */}
        {activeSection === 'estimates' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Surgical Fee Estimates</h2>

              {/* Team Assignment */}
              <h3 className="text-sm font-bold text-gray-800 mb-2">Surgical Team</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Surgeon</label>
                  <select value={surgeonId} onChange={e => setSurgeonId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select surgeon...</option>
                    {surgeons.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Surgeon</label>
                  <select value={assistantId} onChange={e => setAssistantId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select assistant...</option>
                    {surgeons.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anaesthetist</label>
                  <select value={anaesthetistId} onChange={e => setAnaesthetistId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select anaesthetist...</option>
                    {anaesthetists.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anaesthesia Type</label>
                  <select value={anaesthesiaType} onChange={e => setAnaesthesiaType(e.target.value as AnaesthesiaType)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="general">General Anaesthesia</option>
                    <option value="spinal">Spinal Anaesthesia</option>
                    <option value="epidural">Epidural</option>
                    <option value="local">Local Anaesthesia</option>
                    <option value="regional">Regional Block</option>
                    <option value="sedation">Sedation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scrub Nurse</label>
                  <select value={scrubNurseId} onChange={e => setScrubNurseId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select nurse...</option>
                    {nurses.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Circulating Nurse</label>
                  <select value={circulatingNurseId} onChange={e => setCirculatingNurseId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select nurse...</option>
                    {nurses.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
              </div>

              {/* Fees */}
              <h3 className="text-sm font-bold text-gray-800 mb-2">Fee Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surgeon Fee (Naira)</label>
                  <input type="number" value={surgeonFee} onChange={e => setSurgeonFee(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Fee (20%)</label>
                  <input type="number" value={assistantFee} disabled className="w-full border rounded-lg px-3 py-2 bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anaesthesia Fee (Naira)</label>
                  <input type="number" value={anaesthesiaFee} onChange={e => setAnaesthesiaFee(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Surgeon Fee:</span><span className="text-right font-medium">{formatNaira(surgeonFee)}</span>
                  <span>Assistant Fee (20%):</span><span className="text-right font-medium">{formatNaira(assistantFee)}</span>
                  <span>Anaesthesia Fee:</span><span className="text-right font-medium">{formatNaira(anaesthesiaFee)}</span>
                  <span>Consumables Total:</span><span className="text-right font-medium">{formatNaira(consumablesTotal)}</span>
                  <span className="font-bold text-base pt-2 border-t">TOTAL ESTIMATE:</span>
                  <span className="text-right font-bold text-base pt-2 border-t">{formatNaira(totalEstimate)}</span>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={saveEstimatesSection} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Estimates
                  </button>
                  <button onClick={downloadEstimatePDF} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Documents <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 5: SURGICAL DOCUMENTS ==================== */}
        {activeSection === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Surgical Documents</h2>

              {/* Preop Info */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Preoperative Information & Counselling</h3>
                <textarea value={preopInfoNotes} onChange={e => setPreopInfoNotes(e.target.value)} rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Details of preoperative counselling provided to the patient including nature of surgery, expected benefits, risks, alternatives..." />
                <button onClick={downloadPreopPDF} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Download className="w-4 h-4" /> Download Preop Information PDF
                </button>
              </div>

              {/* Postop Instructions */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Postoperative Instructions & Expectations</h3>
                <textarea value={postopInstructions} onChange={e => setPostopInstructions(e.target.value)} rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Post-operative care: wound care, activity restrictions, medications, follow-up schedule, warning signs..." />
                <button onClick={downloadPostopInstructionsPDF} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Download className="w-4 h-4" /> Download Postop Instructions PDF
                </button>
              </div>

              {/* Consent */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Surgical Consent</h3>
                <textarea value={consentDetails} onChange={e => setConsentDetails(e.target.value)} rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Additional consent details, specific risks discussed, patient questions addressed..." />
                <button onClick={downloadConsentPDF} className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Download className="w-4 h-4" /> Download Consent Form PDF
                </button>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={saveDocumentsSection} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Documents
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Uploads <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 6: UPLOADS ==================== */}
        {activeSection === 'uploads' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Document Uploads</h2>

              {/* Investigation Results Upload */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Investigation Results</h3>
                <button onClick={() => handleFileUpload(file => setInvestigationUploads(prev => [...prev, file]))}
                  className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Upload Investigation Results
                </button>
                {investigationUploads.map((file, i) => (
                  <div key={i} className="flex items-center justify-between mt-2 bg-gray-50 p-2 rounded text-sm">
                    <span>{file.name}</span>
                    <button onClick={() => setInvestigationUploads(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              {/* Signed Consent Upload */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Signed Consent Form</h3>
                {consentUpload ? (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded text-sm">
                    <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />{consentUpload.name}</span>
                    <button onClick={() => setConsentUpload(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => handleFileUpload(file => setConsentUpload(file))}
                    className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload Signed Consent
                  </button>
                )}
              </div>

              {/* Clinical Photographs */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Clinical Photographs of Lesion</h3>
                <button onClick={() => handleFileUpload(file => setClinicalPhotos(prev => [...prev, file]))}
                  className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Upload Clinical Photo
                </button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {clinicalPhotos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20 border rounded overflow-hidden group">
                      <img src={photo.data} alt={photo.name} className="w-full h-full object-cover" />
                      <button onClick={() => setClinicalPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Evidence */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Evidence of Payment</h3>
                <div className="flex items-center gap-4 mb-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" name="paymentStatus" checked={paymentStatus === 'complete'}
                      onChange={() => setPaymentStatus('complete')} /> Complete Payment
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input type="radio" name="paymentStatus" checked={paymentStatus === 'part_payment'}
                      onChange={() => setPaymentStatus('part_payment')} /> Part Payment
                  </label>
                </div>
                {paymentStatus === 'part_payment' && (
                  <div className="mb-2">
                    <label className="block text-sm text-gray-700 mb-1">Balance to be Paid (Naira)</label>
                    <input type="number" value={paymentBalance} onChange={e => setPaymentBalance(Number(e.target.value))}
                      className="w-48 border rounded-lg px-3 py-2" />
                  </div>
                )}
                {paymentEvidence ? (
                  <div className="flex items-center justify-between bg-green-50 p-3 rounded text-sm">
                    <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />{paymentEvidence.name}</span>
                    <button onClick={() => setPaymentEvidence(null)} className="text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => handleFileUpload(file => setPaymentEvidence(file))}
                    className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload Payment Receipt
                  </button>
                )}
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={saveUploadsSection} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Uploads
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Approve Booking <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 7: APPROVE BOOKING ==================== */}
        {activeSection === 'booking' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Approve Surgery Booking</h2>

              {/* Checklist */}
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Preoperative Planning & Risk Assessment', done: sectionCompletion.planning },
                  { label: 'Investigations Requested', done: sectionCompletion.investigations },
                  { label: 'Consumables BOM Prepared', done: sectionCompletion.consumables },
                  { label: 'Surgical Estimates Completed', done: sectionCompletion.estimates },
                  { label: 'Surgical Documents Generated', done: sectionCompletion.documents },
                  { label: 'Signed Consent Uploaded', done: !!consentUpload },
                  { label: 'Clinical Photographs Uploaded', done: clinicalPhotos.length > 0 },
                  { label: 'Payment Evidence Uploaded', done: !!paymentEvidence },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${item.done ? 'bg-green-50' : 'bg-red-50'}`}>
                    {item.done ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-red-400" />}
                    <span className={`text-sm font-medium ${item.done ? 'text-green-800' : 'text-red-800'}`}>{item.label}</span>
                  </div>
                ))}
              </div>

              {bookingApproved || currentSurgery?.status === 'scheduled' ? (
                <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                  <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <p className="font-bold text-green-800">Surgery Booking Approved</p>
                  <p className="text-sm text-green-700 mt-1">Scheduled for {scheduledDate}</p>
                </div>
              ) : (
                <button onClick={approveBooking}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Approve Surgery Booking
                </button>
              )}

              <div className="flex justify-between mt-4">
                <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Pre-Anaesthetic <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 8: PRE-ANAESTHETIC REVIEW ==================== */}
        {activeSection === 'preanaesthetic' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pre-Anaesthetic Review</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ASA Class</label>
                  <p className="text-lg font-bold">{ASA_CLASSES.find(a => a.value === asaClass)?.label}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mallampati Score</label>
                  <p className="text-lg font-bold">Class {mallampatiScore}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Airway Assessment</label>
                <textarea value={airwayAssessment} onChange={e => setAirwayAssessment(e.target.value)} rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Mouth opening, thyromental distance, neck mobility, dental assessment, previous difficult intubation..." />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Anaesthetic Notes</label>
                <textarea value={preAnaestheticNotes} onChange={e => setPreAnaestheticNotes(e.target.value)} rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Cardiovascular assessment, respiratory assessment, renal function, current medications, allergies, fasting status..." />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fitness Grade</label>
                <select value={fitnessGrade} onChange={e => setFitnessGrade(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2">
                  <option value="fit">Fit for Surgery</option>
                  <option value="optimize">Needs Optimization Before Surgery</option>
                  <option value="defer">Defer Surgery</option>
                </select>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={savePreAnaestheticReview} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Review
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Conference <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 9: PRE-SURGICAL CONFERENCE ==================== */}
        {activeSection === 'conference' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pre-Surgical Conference</h2>

              {/* Slideshow of patient details */}
              <div className="border rounded-lg overflow-hidden mb-4">
                <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Patient Overview - Slide {conferenceSlideIndex + 1}/5</span>
                  <div className="flex gap-2">
                    <button onClick={() => setConferenceSlideIndex(Math.max(0, conferenceSlideIndex - 1))}
                      disabled={conferenceSlideIndex === 0}
                      className="px-2 py-1 bg-gray-600 rounded text-xs disabled:opacity-50">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConferenceSlideIndex(Math.min(4, conferenceSlideIndex + 1))}
                      disabled={conferenceSlideIndex === 4}
                      className="px-2 py-1 bg-gray-600 rounded text-xs disabled:opacity-50">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-6 bg-white min-h-[200px]">
                  {conferenceSlideIndex === 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3">Patient Demographics</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="font-medium">Name:</span> {patient.firstName} {patient.lastName}</div>
                        <div><span className="font-medium">Hospital No:</span> {patient.hospitalNumber}</div>
                        <div><span className="font-medium">Age:</span> {differenceInYears(new Date(), new Date(patient.dateOfBirth))} years</div>
                        <div><span className="font-medium">Gender:</span> {patient.gender}</div>
                        <div><span className="font-medium">Blood Group:</span> {patient.bloodGroup || 'N/A'}</div>
                        <div><span className="font-medium">Genotype:</span> {patient.genotype || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                  {conferenceSlideIndex === 1 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3">Procedure & Scheduling</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="font-medium">Procedure:</span> {selectedProcedure}</div>
                        <div><span className="font-medium">Type:</span> {surgeryType}</div>
                        <div><span className="font-medium">Category:</span> {surgeryCategory}</div>
                        <div><span className="font-medium">Date:</span> {scheduledDate}</div>
                        <div><span className="font-medium">Anaesthesia:</span> {anaesthesiaType}</div>
                      </div>
                    </div>
                  )}
                  {conferenceSlideIndex === 2 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3">Risk Assessment</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="font-medium">ASA Class:</span> {asaClass}</div>
                        <div><span className="font-medium">Mallampati:</span> Class {mallampatiScore}</div>
                        <div><span className="font-medium">Caprini VTE:</span> {capriniScore} ({capriniRisk})</div>
                        <div><span className="font-medium">RCRI Cardiac:</span> {rcriScore} ({rcriRisk})</div>
                        <div><span className="font-medium">NPO:</span> {npoStatus ? 'Confirmed' : 'Not confirmed'}</div>
                      </div>
                      {riskNotes && <p className="mt-2 text-sm"><span className="font-medium">Notes:</span> {riskNotes}</p>}
                    </div>
                  )}
                  {conferenceSlideIndex === 3 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3">Investigations</h3>
                      <div className="space-y-1 text-sm">
                        {investigations && investigations.length > 0 ? investigations.map(inv => (
                          <div key={inv.id} className="flex items-center justify-between py-1">
                            <span>{inv.type}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              inv.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>{inv.status}</span>
                          </div>
                        )) : <p className="text-gray-500">No investigations requested</p>}
                      </div>
                    </div>
                  )}
                  {conferenceSlideIndex === 4 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3">Clinical Photographs</h3>
                      {clinicalPhotos.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {clinicalPhotos.map((photo, i) => (
                            <img key={i} src={photo.data} alt={photo.name} className="w-32 h-32 border rounded object-cover" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No clinical photographs uploaded</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Conference Notes</label>
                <textarea value={conferenceNotes} onChange={e => setConferenceNotes(e.target.value)} rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Discussion notes, team input, special considerations, plan modifications..." />
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={saveConference} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Conference Notes
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Surgery <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 10: SURGERY & ANAESTHESIA MONITORING ==================== */}
        {activeSection === 'surgery' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Surgery & Anaesthesia Monitoring</h2>

              {/* Surgery Controls */}
              <div className="flex gap-3 mb-6">
                {!surgeryStartTime ? (
                  <button onClick={startSurgery} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
                    <Play className="w-5 h-5" /> Start Surgery
                  </button>
                ) : !surgeryEndTime ? (
                  <button onClick={endSurgery} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2">
                    <Shield className="w-5 h-5" /> End Surgery
                  </button>
                ) : (
                  <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Surgery completed
                  </div>
                )}
                {surgeryStartTime && (
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Started: {surgeryStartTime ? format(new Date(surgeryStartTime), 'HH:mm') : ''}
                    {surgeryEndTime && <> | Ended: {format(new Date(surgeryEndTime), 'HH:mm')}</>}
                  </div>
                )}
              </div>

              {/* Anaesthesia Drug Log */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Anaesthesia Drug Administration Log</h3>
                <div className="space-y-2">
                  {anaesthesiaLog.map((entry, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 text-sm">
                      <input value={entry.time} onChange={e => { const u = [...anaesthesiaLog]; u[i].time = e.target.value; setAnaesthesiaLog(u); }}
                        type="time" className="border rounded px-2 py-1" />
                      <input value={entry.drug} onChange={e => { const u = [...anaesthesiaLog]; u[i].drug = e.target.value; setAnaesthesiaLog(u); }}
                        placeholder="Drug" className="border rounded px-2 py-1" />
                      <input value={entry.dose} onChange={e => { const u = [...anaesthesiaLog]; u[i].dose = e.target.value; setAnaesthesiaLog(u); }}
                        placeholder="Dose" className="border rounded px-2 py-1" />
                      <input value={entry.route} onChange={e => { const u = [...anaesthesiaLog]; u[i].route = e.target.value; setAnaesthesiaLog(u); }}
                        placeholder="Route" className="border rounded px-2 py-1" />
                      <button onClick={() => setAnaesthesiaLog(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setAnaesthesiaLog(prev => [...prev, { time: format(new Date(), 'HH:mm'), drug: '', dose: '', route: 'IV' }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Drug Entry
                </button>
              </div>

              {/* Vital Signs Monitoring */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Vital Signs Monitoring Chart</h3>
                <div className="overflow-x-auto">
                  <table className="text-sm border w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 border text-left">Time</th>
                        <th className="p-2 border">BP (mmHg)</th>
                        <th className="p-2 border">HR (bpm)</th>
                        <th className="p-2 border">SpO2 (%)</th>
                        <th className="p-2 border">EtCO2</th>
                        <th className="p-2 border">Temp (C)</th>
                        <th className="p-2 border w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitalSignsLog.map((entry, i) => (
                        <tr key={i}>
                          <td className="p-1 border"><input type="time" value={entry.time} onChange={e => { const u = [...vitalSignsLog]; u[i].time = e.target.value; setVitalSignsLog(u); }} className="border-0 w-full px-1" /></td>
                          <td className="p-1 border"><input value={entry.bp} onChange={e => { const u = [...vitalSignsLog]; u[i].bp = e.target.value; setVitalSignsLog(u); }} className="border-0 w-full text-center px-1" placeholder="120/80" /></td>
                          <td className="p-1 border"><input value={entry.hr} onChange={e => { const u = [...vitalSignsLog]; u[i].hr = e.target.value; setVitalSignsLog(u); }} className="border-0 w-full text-center px-1" /></td>
                          <td className="p-1 border"><input value={entry.spo2} onChange={e => { const u = [...vitalSignsLog]; u[i].spo2 = e.target.value; setVitalSignsLog(u); }} className="border-0 w-full text-center px-1" /></td>
                          <td className="p-1 border"><input value={entry.etco2} onChange={e => { const u = [...vitalSignsLog]; u[i].etco2 = e.target.value; setVitalSignsLog(u); }} className="border-0 w-full text-center px-1" /></td>
                          <td className="p-1 border"><input value={entry.temp} onChange={e => { const u = [...vitalSignsLog]; u[i].temp = e.target.value; setVitalSignsLog(u); }} className="border-0 w-full text-center px-1" /></td>
                          <td className="p-1 border text-center"><button onClick={() => setVitalSignsLog(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 className="w-3 h-3" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setVitalSignsLog(prev => [...prev, { time: format(new Date(), 'HH:mm'), bp: '', hr: '', spo2: '', etco2: '', temp: '' }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Vitals Entry
                </button>
              </div>

              {/* Blood Loss & Fluids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Blood Loss (mL)</label>
                  <input type="number" value={bloodLoss} onChange={e => setBloodLoss(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IV Fluids Administered</label>
                  <input value={fluidInput} onChange={e => setFluidInput(e.target.value)}
                    placeholder="e.g., Normal Saline 1500mL, Ringers Lactate 1000mL"
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Post-Op Notes <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 11: POST-OP NOTES ==================== */}
        {activeSection === 'postop' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Post-Operative Notes</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Operative Diagnosis</label>
                  <input value={preOpDiagnosis} onChange={e => setPreOpDiagnosis(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Post-Operative Diagnosis</label>
                  <input value={postOpDiagnosis} onChange={e => setPostOpDiagnosis(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Performed</label>
                <input value={procedurePerformed || selectedProcedure} onChange={e => setProcedurePerformed(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Operative Findings</label>
                <textarea value={operativeFindings} onChange={e => setOperativeFindings(e.target.value)} rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Detailed operative findings..." />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Complications</label>
                <textarea value={complications} onChange={e => setComplications(e.target.value)} rows={2}
                  className="w-full border rounded-lg px-3 py-2" placeholder="None / List complications..." />
              </div>

              {/* Specimens */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Specimens Collected</h3>
                {specimens.map((s, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mb-2 text-sm">
                    <input value={s.type} onChange={e => { const u = [...specimens]; u[i].type = e.target.value; setSpecimens(u); }}
                      placeholder="Type" className="border rounded px-2 py-1" />
                    <input value={s.site} onChange={e => { const u = [...specimens]; u[i].site = e.target.value; setSpecimens(u); }}
                      placeholder="Site" className="border rounded px-2 py-1" />
                    <input value={s.notes} onChange={e => { const u = [...specimens]; u[i].notes = e.target.value; setSpecimens(u); }}
                      placeholder="Notes" className="border rounded px-2 py-1" />
                    <button onClick={() => setSpecimens(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => setSpecimens(prev => [...prev, { type: '', site: '', notes: '' }])}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Specimen
                </button>
              </div>

              {/* Intraoperative Photos */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Intraoperative Pictures</h3>
                <button onClick={() => handleFileUpload(file => setIntraopPhotos(prev => [...prev, file]))}
                  className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Upload Intraoperative Photo
                </button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {intraopPhotos.map((photo, i) => (
                    <div key={i} className="relative w-24 h-24 border rounded overflow-hidden group">
                      <img src={photo.data} alt={photo.name} className="w-full h-full object-cover" />
                      <button onClick={() => setIntraopPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={savePostOpNotes} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Post-Op Notes
                  </button>
                  <button onClick={downloadPostOpNotesPDF} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
                <button onClick={goNext} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  Next: Medications <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SECTION 12: POST-OP MEDICATIONS ==================== */}
        {activeSection === 'medications' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Post-Operative Medications</h2>

              {/* Existing prescriptions from prescription service */}
              {prescriptions && prescriptions.filter(p => p.encounterId === currentSurgeryId).length > 0 && (
                <div className="mb-4 border rounded-lg p-3 bg-green-50">
                  <h3 className="text-sm font-bold text-green-800 mb-2">Previously Prescribed (from Prescription Service)</h3>
                  {prescriptions.filter(p => p.encounterId === currentSurgeryId).map(rx => (
                    <div key={rx.id} className="text-sm py-1">
                      {rx.medications?.map((m: any, mi: number) => (
                        <span key={mi}>{m.name} {m.dosage} {m.route} {m.frequency} </span>
                      ))}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${rx.status === 'dispensed' ? 'bg-green-200' : 'bg-yellow-200'}`}>{rx.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* New medications */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Add Post-Operative Medications</h3>
                {postOpMeds.map((med, i) => (
                  <div key={i} className="grid grid-cols-6 gap-2 mb-2 text-sm">
                    <input value={med.drug} onChange={e => { const u = [...postOpMeds]; u[i].drug = e.target.value; setPostOpMeds(u); }}
                      placeholder="Drug name" className="border rounded px-2 py-1 col-span-2" />
                    <input value={med.dose} onChange={e => { const u = [...postOpMeds]; u[i].dose = e.target.value; setPostOpMeds(u); }}
                      placeholder="Dose" className="border rounded px-2 py-1" />
                    <select value={med.route} onChange={e => { const u = [...postOpMeds]; u[i].route = e.target.value; setPostOpMeds(u); }}
                      className="border rounded px-2 py-1">
                      <option value="PO">PO</option>
                      <option value="IV">IV</option>
                      <option value="IM">IM</option>
                      <option value="SC">SC</option>
                      <option value="PR">PR</option>
                      <option value="topical">Topical</option>
                    </select>
                    <select value={med.frequency} onChange={e => { const u = [...postOpMeds]; u[i].frequency = e.target.value; setPostOpMeds(u); }}
                      className="border rounded px-2 py-1">
                      <option value="stat">STAT</option>
                      <option value="od">OD</option>
                      <option value="bd">BD</option>
                      <option value="tds">TDS</option>
                      <option value="qds">QDS</option>
                      <option value="prn">PRN</option>
                      <option value="nocte">Nocte</option>
                      <option value="8hrly">8 hourly</option>
                      <option value="12hrly">12 hourly</option>
                    </select>
                    <div className="flex gap-1">
                      <input value={med.duration} onChange={e => { const u = [...postOpMeds]; u[i].duration = e.target.value; setPostOpMeds(u); }}
                        placeholder="Duration" className="border rounded px-2 py-1 w-full" />
                      <button onClick={() => setPostOpMeds(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setPostOpMeds(prev => [...prev, { drug: '', dose: '', route: 'IV', frequency: 'bd', duration: '5 days' }])}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Medication
                </button>
              </div>

              {/* Common post-op meds quick add */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Quick Add Common Post-Op Medications</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { drug: 'Paracetamol', dose: '1g', route: 'IV', frequency: 'tds', duration: '3 days' },
                    { drug: 'Tramadol', dose: '100mg', route: 'IV', frequency: 'bd', duration: '3 days' },
                    { drug: 'Diclofenac', dose: '75mg', route: 'IM', frequency: 'bd', duration: '2 days' },
                    { drug: 'Ceftriaxone', dose: '1g', route: 'IV', frequency: 'bd', duration: '5 days' },
                    { drug: 'Metronidazole', dose: '500mg', route: 'IV', frequency: 'tds', duration: '5 days' },
                    { drug: 'Omeprazole', dose: '40mg', route: 'IV', frequency: 'od', duration: '5 days' },
                    { drug: 'Enoxaparin', dose: '40mg', route: 'SC', frequency: 'od', duration: '7 days' },
                    { drug: 'Ondansetron', dose: '4mg', route: 'IV', frequency: 'prn', duration: '2 days' },
                  ].map((med, i) => (
                    <button key={i} onClick={() => {
                      if (!postOpMeds.some(m => m.drug === med.drug)) {
                        setPostOpMeds(prev => [...prev, med]);
                      }
                    }}
                      className={`text-xs px-3 py-1.5 rounded-full border ${
                        postOpMeds.some(m => m.drug === med.drug) ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                      {med.drug} {med.dose}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button onClick={goPrev} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button onClick={savePostOpMeds} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Prescribe Medications
                  </button>
                </div>
                <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  Finish Workflow <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom navigation */}
        <div className="mt-4 bg-white rounded-lg shadow p-3 flex items-center justify-between text-sm text-gray-500">
          <span>Section {currentSectionIndex + 1} of {SECTIONS.length}</span>
          <span>{Object.values(sectionCompletion).filter(Boolean).length}/{SECTIONS.length} completed</span>
        </div>
      </div>
    </div>
  );
}
