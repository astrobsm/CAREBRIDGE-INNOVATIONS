/**
 * Enhanced Follow-Up Encounter Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive encounter documentation with:
 * - Full-page OCR document scanner that auto-fills all fields
 * - Sectioned layout: Encounter, Vital Signs, Investigations, 
 *   Clinical Photos, Wounds, Prescriptions, Follow-Up Schedule
 * - Vital signs charting with OCR batch input
 * - Treatment planning with tracking
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Stethoscope,
  Camera,
  FlaskConical,
  Pill,
  ClipboardList,
  Activity,
  Calendar,
  ScanLine,
  Upload,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  Loader2,
  Sparkles,
  Scissors,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import ScanToText from '../../../components/common/ScanToText';
import { performOCR } from '../../../services/ocrService';
import type {
  ClinicalEncounter,
  Diagnosis,
  ClinicalPhoto,
  VitalSigns,
  Investigation,
  Prescription,
  Medication,
  Wound,
} from '../../../types';

// ── Schema ────────────────────────────────────────────────────────────
const encounterSchema = z.object({
  chiefComplaint: z.string().min(3, 'Chief complaint is required'),
  intervalHistory: z.string().optional(),
  physicalExamination: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
  nextAppointment: z.string().optional(),
});

type EncounterFormData = z.infer<typeof encounterSchema>;

// ── Section Nav ───────────────────────────────────────────────────────
type Section = 
  | 'encounter' 
  | 'vitals' 
  | 'investigations' 
  | 'photos' 
  | 'wounds' 
  | 'prescriptions' 
  | 'followup';

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'encounter', label: 'Encounter', icon: <Stethoscope size={16} /> },
  { key: 'vitals', label: 'Vital Signs', icon: <Activity size={16} /> },
  { key: 'investigations', label: 'Investigations', icon: <FlaskConical size={16} /> },
  { key: 'photos', label: 'Clinical Photos', icon: <Camera size={16} /> },
  { key: 'wounds', label: 'Wound Assessment', icon: <Scissors size={16} /> },
  { key: 'prescriptions', label: 'Prescriptions', icon: <Pill size={16} /> },
  { key: 'followup', label: 'Follow-Up', icon: <Calendar size={16} /> },
];

// ── Vital Signs Defaults ──────────────────────────────────────────────
interface VitalEntry {
  id: string;
  temperature: string;
  pulse: string;
  respiratoryRate: string;
  systolic: string;
  diastolic: string;
  oxygenSaturation: string;
  weight: string;
  painScore: string;
  bloodGlucose: string;
  recordedAt: string;
}

const emptyVital = (): VitalEntry => ({
  id: uuidv4(),
  temperature: '',
  pulse: '',
  respiratoryRate: '',
  systolic: '',
  diastolic: '',
  oxygenSaturation: '',
  weight: '',
  painScore: '',
  bloodGlucose: '',
  recordedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
});

// ── Medication Entry ──────────────────────────────────────────────────
interface MedEntry {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
}

const emptyMed = (): MedEntry => ({
  id: uuidv4(),
  name: '',
  dosage: '',
  frequency: '',
  route: 'oral',
  duration: '',
  instructions: '',
});

// ── Investigation Request ─────────────────────────────────────────────
interface InvRequest {
  id: string;
  type: string;
  category: string;
  priority: string;
  notes: string;
  resultFile?: string;
}

// ── Wound Entry ───────────────────────────────────────────────────────
interface WoundEntry {
  id: string;
  location: string;
  type: string;
  length: string;
  width: string;
  depth: string;
  tissueType: string;
  exudateAmount: string;
  painLevel: string;
  painScore?: string;
  healingProgress: string;
  dressingType: string;
  notes: string;
  photo?: string;
}

const emptyWound = (): WoundEntry => ({
  id: uuidv4(),
  location: '',
  type: 'surgical',
  length: '',
  width: '',
  depth: '',
  tissueType: 'granulation',
  exudateAmount: 'none',
  painLevel: '0',
  healingProgress: 'stable',
  dressingType: '',
  notes: '',
});

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function EnhancedFollowUpPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── UI State ──────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<Section>('encounter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(
    new Set(['encounter', 'vitals', 'investigations', 'photos', 'wounds', 'prescriptions', 'followup'])
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form ──────────────────────────────────────────────────────────
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm<EncounterFormData>({
    resolver: zodResolver(encounterSchema),
    defaultValues: { chiefComplaint: '', intervalHistory: '', physicalExamination: '', treatmentPlan: '', notes: '', nextAppointment: '' },
  });

  // ── Diagnoses ─────────────────────────────────────────────────────
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagText, setNewDiagText] = useState('');
  const [newDiagType, setNewDiagType] = useState<'primary' | 'secondary' | 'differential'>('primary');

  // ── Vitals ────────────────────────────────────────────────────────
  const [vitalEntries, setVitalEntries] = useState<VitalEntry[]>([emptyVital()]);
  const [isVitalOCR, setIsVitalOCR] = useState(false);

  // ── Investigations ────────────────────────────────────────────────
  const [invRequests, setInvRequests] = useState<InvRequest[]>([]);
  const [newInvType, setNewInvType] = useState('');
  const [newInvCategory, setNewInvCategory] = useState('laboratory');
  const [newInvPriority, setNewInvPriority] = useState('routine');

  // ── Clinical Photos ───────────────────────────────────────────────
  const [clinicalPhotos, setClinicalPhotos] = useState<{ id: string; data: string; description: string; location: string }[]>([]);

  // ── Wounds ────────────────────────────────────────────────────────
  const [wounds, setWounds] = useState<WoundEntry[]>([]);

  // ── Prescriptions ─────────────────────────────────────────────────
  const [medications, setMedications] = useState<MedEntry[]>([]);

  // ── Follow-Up ─────────────────────────────────────────────────────
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpType, setFollowUpType] = useState('clinic');

  // ── DB Queries ────────────────────────────────────────────────────
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const previousEncounters = useLiveQuery(async () => {
    if (!patientId) return [];
    const encs = await db.clinicalEncounters.where('patientId').equals(patientId).toArray();
    encs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return encs;
  }, [patientId]);

  const previousVitals = useLiveQuery(async () => {
    if (!patientId) return [];
    const vitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
    vitals.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    return vitals;
  }, [patientId]);

  const patientInvestigations = useLiveQuery(async () => {
    if (!patientId) return [];
    return db.investigations.where('patientId').equals(patientId).toArray();
  }, [patientId]);

  const patientWounds = useLiveQuery(async () => {
    if (!patientId) return [];
    return db.wounds.where('patientId').equals(patientId).toArray();
  }, [patientId]);

  // ═══════════════════════════════════════════════════════════════════
  // FULL DOCUMENT OCR SCANNER
  // ═══════════════════════════════════════════════════════════════════
  const handleFullDocumentScan = useCallback(async (imageSource: string | File) => {
    setIsScanningDoc(true);
    setScanProgress(10);

    try {
      toast.loading('Scanning document...', { id: 'doc-scan' });

      // Step 1: Run OCR on the full document image
      setScanProgress(20);
      const result = await performOCR(imageSource, {
        enhanceHandwriting: true,
        multiPassOCR: true,
        aggressiveHandwritingMode: true,
        useCloudOCR: true,
        medicalContext: true,
      });

      setScanProgress(60);
      const fullText = result.text || '';
      if (!fullText.trim()) {
        toast.error('No text detected in scanned document', { id: 'doc-scan' });
        return;
      }

      // Step 2: Parse and distribute text into form fields using keyword matching
      setScanProgress(80);
      const parsed = parseEncounterDocument(fullText);

      // Step 3: Auto-fill fields
      if (parsed.chiefComplaint) setValue('chiefComplaint', parsed.chiefComplaint);
      if (parsed.intervalHistory) setValue('intervalHistory', parsed.intervalHistory);
      if (parsed.physicalExamination) setValue('physicalExamination', parsed.physicalExamination);
      if (parsed.treatmentPlan) setValue('treatmentPlan', parsed.treatmentPlan);
      if (parsed.notes) setValue('notes', parsed.notes);
      if (parsed.diagnoses.length > 0) {
        setDiagnoses(prev => [...prev, ...parsed.diagnoses]);
      }

      // Parse vital signs if found
      if (parsed.vitals) {
        const v = { ...emptyVital(), ...parsed.vitals };
        setVitalEntries(prev => {
          if (prev.length === 1 && !prev[0].temperature && !prev[0].pulse) {
            return [v];
          }
          return [...prev, v];
        });
      }

      // Parse medications if found
      if (parsed.medications.length > 0) {
        setMedications(prev => [...prev, ...parsed.medications]);
      }

      setScanProgress(100);
      toast.success(
        `Document scanned! Filled ${Object.values(parsed).filter(v => v && (typeof v === 'string' ? v.length > 0 : Array.isArray(v) ? v.length > 0 : true)).length} sections`,
        { id: 'doc-scan', duration: 4000 }
      );
    } catch (err) {
      console.error('[DocScan] Error:', err);
      toast.error('Failed to scan document', { id: 'doc-scan' });
    } finally {
      setIsScanningDoc(false);
      setScanProgress(0);
    }
  }, [setValue]);

  // ── Document Parser ──────────────────────────────────────────────
  function parseEncounterDocument(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const sections: Record<string, string[]> = {};
    let currentSection = 'general';

    // Keyword mapping for section detection
    const sectionKeywords: Record<string, RegExp> = {
      chiefComplaint: /^(chief\s*complaint|presenting\s*complaint|c\/c|cc|reason\s*for\s*visit)/i,
      intervalHistory: /^(interval\s*history|history|hpi|h\/o|history\s*of\s*present|hx|since\s*last\s*visit|changes)/i,
      physicalExamination: /^(physical\s*exam|examination|p\/e|pe|o\/e|on\s*exam|findings|general\s*exam|systemic)/i,
      treatmentPlan: /^(treatment\s*plan|plan|management|tx|rx plan|treatment)/i,
      notes: /^(notes|additional|remarks|comment)/i,
      diagnosis: /^(diagnos|dx|impression|assessment)/i,
      vitals: /^(vital|v\/s|obs|observations|bp|blood\s*pressure|temp|pulse|rr|spo2|sats)/i,
      medications: /^(medicat|prescription|rx|drug|pharma|meds)/i,
    };

    for (const line of lines) {
      let matched = false;
      for (const [section, regex] of Object.entries(sectionKeywords)) {
        if (regex.test(line)) {
          currentSection = section;
          // If there's content after the header on the same line
          const afterColon = line.replace(regex, '').replace(/^[:\s-]+/, '').trim();
          if (afterColon) {
            if (!sections[currentSection]) sections[currentSection] = [];
            sections[currentSection].push(afterColon);
          }
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (!sections[currentSection]) sections[currentSection] = [];
        sections[currentSection].push(line);
      }
    }

    // Extract vitals from text using regex
    const vitalsData: Partial<VitalEntry> = {};
    const vitalsText = [...(sections['vitals'] || []), ...(sections['general'] || [])].join(' ');
    
    const bpMatch = vitalsText.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(mmHg)?/i);
    if (bpMatch) { vitalsData.systolic = bpMatch[1]; vitalsData.diastolic = bpMatch[2]; }
    
    const tempMatch = vitalsText.match(/(?:temp|t)[:\s]*(\d{2}\.?\d?)\s*°?[cCfF]?/i);
    if (tempMatch) vitalsData.temperature = tempMatch[1];
    
    const pulseMatch = vitalsText.match(/(?:pulse|pr|hr)[:\s]*(\d{2,3})\s*(?:bpm|\/min)?/i);
    if (pulseMatch) vitalsData.pulse = pulseMatch[1];
    
    const rrMatch = vitalsText.match(/(?:rr|resp)[:\s]*(\d{1,2})\s*(?:\/min|cpm)?/i);
    if (rrMatch) vitalsData.respiratoryRate = rrMatch[1];
    
    const spo2Match = vitalsText.match(/(?:spo2|sats?|o2)[:\s]*(\d{2,3})\s*%?/i);
    if (spo2Match) vitalsData.oxygenSaturation = spo2Match[1];
    
    const weightMatch = vitalsText.match(/(?:weight|wt)[:\s]*(\d{1,3}\.?\d?)\s*(?:kg)?/i);
    if (weightMatch) vitalsData.weight = weightMatch[1];
    
    const painMatch = vitalsText.match(/(?:pain)[:\s]*(\d{1,2})\s*(?:\/10)?/i);
    if (painMatch) vitalsData.painScore = painMatch[1];
    
    const glucoseMatch = vitalsText.match(/(?:glucose|rbg|fbg|bg)[:\s]*(\d{1,2}\.?\d?)\s*(?:mmol)?/i);
    if (glucoseMatch) vitalsData.bloodGlucose = glucoseMatch[1];

    // Extract diagnoses
    const parsedDiagnoses: Diagnosis[] = [];
    const diagLines = sections['diagnosis'] || [];
    diagLines.forEach((line, i) => {
      const cleaned = line.replace(/^[\d\.\-\)\]]+\s*/, '').trim();
      if (cleaned.length > 2) {
        parsedDiagnoses.push({
          id: uuidv4(),
          description: cleaned,
          type: i === 0 ? 'primary' : 'secondary',
          icdCode: '',
          status: 'suspected',
        });
      }
    });

    // Extract medications
    const parsedMeds: MedEntry[] = [];
    const medLines = sections['medications'] || [];
    medLines.forEach(line => {
      // Try to parse: Drug Name Dosage Frequency route
      const medMatch = line.match(/^(.+?)\s+(\d+\s*(?:mg|g|ml|mcg|iu|units?))\s+(.+?)(?:\s+(oral|iv|im|sc|pr|sl|topical|inhaled))?$/i);
      if (medMatch) {
        parsedMeds.push({
          id: uuidv4(),
          name: medMatch[1].trim(),
          dosage: medMatch[2].trim(),
          frequency: medMatch[3].trim(),
          route: medMatch[4]?.toLowerCase() || 'oral',
          duration: '',
          instructions: '',
        });
      } else if (line.length > 3) {
        parsedMeds.push({
          ...emptyMed(),
          name: line.replace(/^[\d\.\-\)\]]+\s*/, '').trim(),
        });
      }
    });

    const hasVitals = Object.values(vitalsData).some(v => v);

    return {
      chiefComplaint: (sections['chiefComplaint'] || []).join(' ').trim(),
      intervalHistory: (sections['intervalHistory'] || sections['general'] || []).join('\n').trim(),
      physicalExamination: (sections['physicalExamination'] || []).join('\n').trim(),
      treatmentPlan: (sections['treatmentPlan'] || []).join('\n').trim(),
      notes: (sections['notes'] || []).join('\n').trim(),
      diagnoses: parsedDiagnoses,
      vitals: hasVitals ? { ...vitalsData, id: uuidv4(), recordedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm") } : null,
      medications: parsedMeds,
    };
  }

  // ── Vitals OCR (batch scanning vital signs sheet) ────────────────
  const handleVitalsOCR = useCallback(async (text: string) => {
    setIsVitalOCR(true);
    try {
      // Parse multiple rows of vitals from scanned text
      const lines = text.split('\n').filter(l => l.trim());
      const newEntries: VitalEntry[] = [];

      for (const line of lines) {
        const entry = emptyVital();
        // Try parsing: Temp/Pulse/RR/BP/SpO2 pattern
        const nums = line.match(/\d+\.?\d*/g);
        if (nums && nums.length >= 3) {
          // Heuristic: temp(36-42), pulse(40-200), RR(8-40), sys(60-250), dia(30-150), spo2(70-100)
          const values = nums.map(Number);
          values.forEach(v => {
            if (v >= 35 && v <= 42 && !entry.temperature) entry.temperature = v.toString();
            else if (v >= 40 && v <= 200 && !entry.pulse) entry.pulse = v.toString();
            else if (v >= 8 && v <= 40 && !entry.respiratoryRate) entry.respiratoryRate = v.toString();
            else if (v >= 70 && v <= 250 && !entry.systolic) entry.systolic = v.toString();
            else if (v >= 30 && v <= 150 && !entry.diastolic) entry.diastolic = v.toString();
            else if (v >= 70 && v <= 100 && !entry.oxygenSaturation) entry.oxygenSaturation = v.toString();
          });
          if (entry.temperature || entry.pulse || entry.systolic) {
            newEntries.push(entry);
          }
        }
      }

      if (newEntries.length > 0) {
        setVitalEntries(prev => {
          const first = prev[0];
          if (prev.length === 1 && !first.temperature && !first.pulse) {
            return newEntries;
          }
          return [...prev, ...newEntries];
        });
        toast.success(`Parsed ${newEntries.length} vital signs reading(s)`);
      } else {
        toast.error('Could not parse vital signs from scanned text');
      }
    } catch {
      toast.error('Failed to parse vitals');
    } finally {
      setIsVitalOCR(false);
    }
  }, []);

  // ── Photo Handlers ───────────────────────────────────────────────
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setClinicalPhotos(prev => [...prev, {
          id: uuidv4(),
          data: reader.result as string,
          description: '',
          location: '',
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Section Toggle ───────────────────────────────────────────────
  const toggleSection = (s: Section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  // ── Vitals Chart Data ────────────────────────────────────────────
  const vitalsChartData = useMemo(() => {
    const historical = (previousVitals || []).map(v => ({
      time: format(new Date(v.recordedAt), 'MMM dd HH:mm'),
      temp: v.temperature,
      pulse: v.pulse,
      rr: v.respiratoryRate,
      systolic: v.bloodPressureSystolic,
      diastolic: v.bloodPressureDiastolic,
      spo2: v.oxygenSaturation,
    }));
    const current = vitalEntries.filter(v => v.temperature || v.pulse).map(v => ({
      time: v.recordedAt ? format(new Date(v.recordedAt), 'MMM dd HH:mm') : 'Now',
      temp: v.temperature ? parseFloat(v.temperature) : undefined,
      pulse: v.pulse ? parseInt(v.pulse) : undefined,
      rr: v.respiratoryRate ? parseInt(v.respiratoryRate) : undefined,
      systolic: v.systolic ? parseInt(v.systolic) : undefined,
      diastolic: v.diastolic ? parseInt(v.diastolic) : undefined,
      spo2: v.oxygenSaturation ? parseInt(v.oxygenSaturation) : undefined,
    }));
    return [...historical, ...current];
  }, [previousVitals, vitalEntries]);

  // ═══════════════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════════════
  const onSubmit = async (data: EncounterFormData) => {
    if (!patient || !user) return;
    setIsSubmitting(true);

    try {
      const encounterId = uuidv4();
      const now = new Date();

      // 1. Save encounter
      const encounter: ClinicalEncounter = {
        id: encounterId,
        patientId: patient.id,
        hospitalId: user.hospitalId || '',
        type: 'follow_up',
        status: 'completed',
        chiefComplaint: data.chiefComplaint,
        intervalHistory: data.intervalHistory,
        physicalExamination: data.physicalExamination ? { generalAppearance: data.physicalExamination } : undefined,
        diagnosis: diagnoses,
        treatmentPlan: data.treatmentPlan || '',
        notes: data.notes || '',
        clinicalPhotos: clinicalPhotos.map(p => ({
          id: p.id,
          imageData: p.data,
          description: p.description,
          bodyLocation: p.location,
          capturedAt: now,
        })),
        attendingClinician: user.id,
        startedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await db.clinicalEncounters.put(encounter);
      syncRecord('clinical_encounters', encounter).catch(console.error);

      // 2. Save vital signs
      for (const v of vitalEntries) {
        if (!v.temperature && !v.pulse && !v.systolic) continue;
        const vitals: VitalSigns = {
          id: uuidv4(),
          patientId: patient.id,
          encounterId,
          temperature: v.temperature ? parseFloat(v.temperature) : 0,
          pulse: v.pulse ? parseInt(v.pulse) : 0,
          respiratoryRate: v.respiratoryRate ? parseInt(v.respiratoryRate) : 0,
          bloodPressureSystolic: v.systolic ? parseInt(v.systolic) : 0,
          bloodPressureDiastolic: v.diastolic ? parseInt(v.diastolic) : 0,
          oxygenSaturation: v.oxygenSaturation ? parseInt(v.oxygenSaturation) : 0,
          weight: v.weight ? parseFloat(v.weight) : undefined,
          painScore: v.painScore ? parseInt(v.painScore) : undefined,
          bloodGlucose: v.bloodGlucose ? parseFloat(v.bloodGlucose) : undefined,
          recordedBy: user.id,
          recordedAt: new Date(v.recordedAt || now),
          notes: '',
        };
        await db.vitalSigns.put(vitals);
        syncRecord('vital_signs', vitals).catch(console.error);
      }

      // 3. Save investigation requests
      for (const inv of invRequests) {
        const investigation: Investigation = {
          id: inv.id,
          patientId: patient.id,
          hospitalId: user.hospitalId || '',
          encounterId,
          type: inv.type,
          category: inv.category as Investigation['category'],
          priority: inv.priority as Investigation['priority'],
          status: 'requested',
          requestedBy: user.id,
          requestedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await db.investigations.put(investigation);
        syncRecord('investigations', investigation).catch(console.error);
      }

      // 4. Save prescriptions
      if (medications.length > 0) {
        const prescription: Prescription = {
          id: uuidv4(),
          patientId: patient.id,
          encounterId,
          hospitalId: user.hospitalId || '',
          medications: medications.map(m => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            route: m.route as Medication['route'],
            duration: m.duration,
            quantity: 0,
            instructions: m.instructions,
            isDispensed: false,
          })),
          status: 'pending',
          prescribedBy: user.id,
          prescribedAt: now,
        };
        await db.prescriptions.put(prescription);
        syncRecord('prescriptions', prescription).catch(console.error);
      }

      // 5. Save wound assessments
      for (const w of wounds) {
        if (!w.location) continue;
        const wound: Wound = {
          id: w.id,
          patientId: patient.id,
          encounterId,
          location: w.location,
          type: w.type as Wound['type'],
          etiology: '',
          length: w.length ? parseFloat(w.length) : 0,
          width: w.width ? parseFloat(w.width) : 0,
          depth: w.depth ? parseFloat(w.depth) : undefined,
          tissueType: [w.tissueType as any],
          exudateAmount: w.exudateAmount as Wound['exudateAmount'],
          odor: false,
          periWoundCondition: '',
          painLevel: parseInt(w.painScore || '0'),
          photos: w.photo ? [{ id: uuidv4(), imageData: w.photo, capturedAt: now, description: w.notes }] : [],
          healingProgress: w.healingProgress as Wound['healingProgress'],
          dressingType: w.dressingType,
          createdAt: now,
          updatedAt: now,
        };
        await db.wounds.put(wound);
        syncRecord('wounds', wound).catch(console.error);
      }

      toast.success('Encounter saved successfully!');
      navigate(`/patients/${patientId}`);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save encounter');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  if (!patient) {
    return <div className="text-center py-12 text-gray-500">Loading patient...</div>;
  }

  const SectionHeader = ({ section, label, icon, badge }: { section: Section; label: string; icon: React.ReactNode; badge?: number }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-colors rounded-t-xl"
    >
      <div className="flex items-center gap-3">
        <span className="text-primary-600">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">{badge}</span>
        )}
      </div>
      {expandedSections.has(section) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(`/patients/${patientId}`)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={18} /> Back to Patient
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Stethoscope className="text-blue-600" size={28} />
              Enhanced Follow-Up Encounter
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {patient.firstName} {patient.lastName} ({patient.hospitalNumber || patient.id?.slice(0, 10)})
              {previousEncounters?.length ? ` • ${previousEncounters.length} previous encounters` : ''}
            </p>
          </div>

          {/* ═══ FULL DOCUMENT OCR BUTTON ═══ */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanningDoc}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50"
            >
              {isScanningDoc ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Scanning ({scanProgress}%)...
                </>
              ) : (
                <>
                  <ScanLine size={18} />
                  Scan Full Document
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFullDocumentScan(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>

      {/* Progress bar during scan */}
      {isScanningDoc && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="text-violet-600 animate-pulse" size={20} />
              <span className="text-sm font-medium text-violet-800">AI is reading your handwritten notes...</span>
            </div>
            <div className="w-full bg-violet-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setActiveSection(s.key); if (!expandedSections.has(s.key)) toggleSection(s.key); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeSection === s.key
                ? 'bg-primary-100 text-primary-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: ENCOUNTER
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="encounter" label="Encounter Documentation" icon={<Stethoscope size={20} />} />
          <AnimatePresence>
            {expandedSections.has('encounter') && (
              <motion.div
                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Chief Complaint */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Chief Complaint *</label>
                      <div className="flex items-center gap-1">
                        <VoiceDictation onTextReceived={(t) => setValue('chiefComplaint', (getValues('chiefComplaint') || '') + ' ' + t)} size="sm" />
                        <ScanToText onTextRecognized={(t) => setValue('chiefComplaint', (getValues('chiefComplaint') || '') + '\n' + t)} iconOnly size="sm" />
                      </div>
                    </div>
                    <textarea
                      {...register('chiefComplaint')}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="What brings the patient in today?"
                    />
                    {errors.chiefComplaint && <p className="text-red-500 text-xs mt-1">{errors.chiefComplaint.message}</p>}
                  </div>

                  {/* Interval History */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Interval History / Changes Since Last Visit</label>
                      <div className="flex items-center gap-1">
                        <VoiceDictation onTextReceived={(t) => setValue('intervalHistory', (getValues('intervalHistory') || '') + ' ' + t)} size="sm" />
                        <ScanToText onTextRecognized={(t) => setValue('intervalHistory', (getValues('intervalHistory') || '') + '\n' + t)} iconOnly size="sm" />
                      </div>
                    </div>
                    <textarea
                      {...register('intervalHistory')}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Describe changes, progression, new symptoms since last visit..."
                    />
                  </div>

                  {/* Physical Examination */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Physical Examination</label>
                      <div className="flex items-center gap-1">
                        <VoiceDictation onTextReceived={(t) => setValue('physicalExamination', (getValues('physicalExamination') || '') + ' ' + t)} size="sm" />
                        <ScanToText onTextRecognized={(t) => setValue('physicalExamination', (getValues('physicalExamination') || '') + '\n' + t)} iconOnly size="sm" />
                      </div>
                    </div>
                    <textarea
                      {...register('physicalExamination')}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="General appearance, systemic examination findings..."
                    />
                  </div>

                  {/* Diagnoses */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Diagnoses</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newDiagText}
                        onChange={(e) => setNewDiagText(e.target.value)}
                        placeholder="Enter diagnosis..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <select value={newDiagType} onChange={(e) => setNewDiagType(e.target.value as any)} className="px-2 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="differential">Differential</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (newDiagText.trim()) {
                            setDiagnoses(prev => [...prev, { id: uuidv4(), description: newDiagText, type: newDiagType, icdCode: '', status: 'suspected' }]);
                            setNewDiagText('');
                          }
                        }}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {diagnoses.map((d, i) => (
                      <div key={d.id} className="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          d.type === 'primary' ? 'bg-blue-100 text-blue-700' :
                          d.type === 'secondary' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{d.type}</span>
                        <span className="flex-1 text-sm">{d.description}</span>
                        <button type="button" onClick={() => setDiagnoses(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Treatment Plan */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Treatment Plan</label>
                      <div className="flex items-center gap-1">
                        <VoiceDictation onTextReceived={(t) => setValue('treatmentPlan', (getValues('treatmentPlan') || '') + ' ' + t)} size="sm" />
                        <ScanToText onTextRecognized={(t) => setValue('treatmentPlan', (getValues('treatmentPlan') || '') + '\n' + t)} iconOnly size="sm" />
                      </div>
                    </div>
                    <textarea
                      {...register('treatmentPlan')}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Management plan, follow-up instructions..."
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                      <div className="flex items-center gap-1">
                        <VoiceDictation onTextReceived={(t) => setValue('notes', (getValues('notes') || '') + ' ' + t)} size="sm" />
                        <ScanToText onTextRecognized={(t) => setValue('notes', (getValues('notes') || '') + '\n' + t)} iconOnly size="sm" />
                      </div>
                    </div>
                    <textarea
                      {...register('notes')}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Any additional clinical notes..."
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: VITAL SIGNS (with OCR + Chart)
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="vitals" label="Vital Signs" icon={<Activity size={20} />} badge={vitalEntries.filter(v => v.pulse || v.temperature).length} />
          <AnimatePresence>
            {expandedSections.has('vitals') && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 space-y-4">
                  {/* OCR Scan button for vitals */}
                  <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                    <ScanLine size={18} className="text-violet-600" />
                    <span className="text-sm text-violet-700 flex-1">Scan a vitals chart/sheet to auto-fill multiple readings</span>
                    <ScanToText
                      onTextRecognized={handleVitalsOCR}
                      iconOnly={false}
                      size="sm"
                      medicalContext
                    />
                  </div>

                  {/* Vitals Entries */}
                  {vitalEntries.map((entry, idx) => (
                    <div key={entry.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Reading #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={entry.recordedAt}
                            onChange={(e) => {
                              const updated = [...vitalEntries];
                              updated[idx] = { ...updated[idx], recordedAt: e.target.value };
                              setVitalEntries(updated);
                            }}
                            className="text-xs px-2 py-1 border border-gray-200 rounded"
                          />
                          {vitalEntries.length > 1 && (
                            <button type="button" onClick={() => setVitalEntries(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {[
                          { key: 'temperature', label: 'Temp (°C)', icon: <Thermometer size={14} />, placeholder: '36.5' },
                          { key: 'pulse', label: 'Pulse (bpm)', icon: <Heart size={14} />, placeholder: '72' },
                          { key: 'respiratoryRate', label: 'RR (/min)', icon: <Wind size={14} />, placeholder: '18' },
                          { key: 'systolic', label: 'BP Sys', icon: <Droplets size={14} />, placeholder: '120' },
                          { key: 'diastolic', label: 'BP Dia', icon: <Droplets size={14} />, placeholder: '80' },
                          { key: 'oxygenSaturation', label: 'SpO₂ (%)', icon: <Activity size={14} />, placeholder: '98' },
                          { key: 'weight', label: 'Weight (kg)', icon: null, placeholder: '70' },
                          { key: 'painScore', label: 'Pain (0-10)', icon: null, placeholder: '3' },
                          { key: 'bloodGlucose', label: 'RBG (mmol/L)', icon: null, placeholder: '5.5' },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
                              {field.icon} {field.label}
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={(entry as any)[field.key]}
                              onChange={(e) => {
                                const updated = [...vitalEntries];
                                updated[idx] = { ...updated[idx], [field.key]: e.target.value };
                                setVitalEntries(updated);
                              }}
                              placeholder={field.placeholder}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setVitalEntries(prev => [...prev, emptyVital()])}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Plus size={16} /> Add Another Reading
                  </button>

                  {/* Vitals Trend Chart */}
                  {vitalsChartData.length > 1 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-600" /> Vital Signs Trend
                      </h4>
                      <div className="bg-white border border-gray-100 rounded-lg p-3" style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={vitalsChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="pulse" stroke="#ef4444" name="Pulse" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="systolic" stroke="#3b82f6" name="BP Sys" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="diastolic" stroke="#93c5fd" name="BP Dia" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                            <Line type="monotone" dataKey="temp" stroke="#f59e0b" name="Temp" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                            <Line type="monotone" dataKey="spo2" stroke="#10b981" name="SpO₂" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: INVESTIGATIONS
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="investigations" label="Investigations" icon={<FlaskConical size={20} />} badge={invRequests.length} />
          <AnimatePresence>
            {expandedSections.has('investigations') && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 space-y-4">
                  {/* Request new investigation */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newInvType}
                      onChange={(e) => setNewInvType(e.target.value)}
                      placeholder="Investigation name (e.g., FBC, U&E, Chest X-ray)"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <select value={newInvCategory} onChange={(e) => setNewInvCategory(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="laboratory">Laboratory</option>
                      <option value="radiology">Radiology</option>
                      <option value="hematology">Hematology</option>
                      <option value="biochemistry">Biochemistry</option>
                      <option value="microbiology">Microbiology</option>
                      <option value="histopathology">Histopathology</option>
                      <option value="cardiology">Cardiology</option>
                      <option value="imaging">Imaging</option>
                    </select>
                    <select value={newInvPriority} onChange={(e) => setNewInvPriority(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (newInvType.trim()) {
                          setInvRequests(prev => [...prev, { id: uuidv4(), type: newInvType, category: newInvCategory, priority: newInvPriority, notes: '' }]);
                          setNewInvType('');
                        }
                      }}
                      className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center gap-1"
                    >
                      <Plus size={16} /> Request
                    </button>
                  </div>

                  {/* Requested investigations list */}
                  {invRequests.map((inv, i) => (
                    <div key={inv.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <FlaskConical size={16} className="text-blue-600 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{inv.type}</span>
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{inv.category}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            inv.priority === 'stat' ? 'bg-red-100 text-red-700' :
                            inv.priority === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{inv.priority}</span>
                        </div>
                      </div>
                      {/* Result upload */}
                      <label className="flex items-center gap-1 px-2 py-1 bg-white border rounded text-xs cursor-pointer hover:bg-gray-50">
                        <Upload size={12} /> Upload Result
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const updated = [...invRequests];
                                updated[i] = { ...updated[i], resultFile: reader.result as string };
                                setInvRequests(updated);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {inv.resultFile && <CheckCircle size={16} className="text-green-500" />}
                      <button type="button" onClick={() => setInvRequests(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Previously ordered investigations */}
                  {(patientInvestigations || []).length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Previous Investigations</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {(patientInvestigations || []).slice(0, 10).map(inv => (
                          <div key={inv.id} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded">
                            <span className={`w-2 h-2 rounded-full ${
                              inv.status === 'completed' ? 'bg-green-500' :
                              inv.status === 'processing' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`} />
                            <span className="flex-1">{inv.type}</span>
                            <span className="text-gray-400">{inv.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: CLINICAL PHOTOS
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="photos" label="Clinical Photos" icon={<Camera size={20} />} badge={clinicalPhotos.length} />
          <AnimatePresence>
            {expandedSections.has('photos') && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 space-y-4">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                    <Camera size={24} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Take or upload clinical photos</span>
                    <span className="text-xs text-gray-400 mt-1">Supports camera capture and file upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoCapture}
                    />
                  </label>

                  {clinicalPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {clinicalPhotos.map((photo, i) => (
                        <div key={photo.id} className="relative border rounded-lg overflow-hidden">
                          <img src={photo.data} alt={`Clinical photo ${i + 1}`} className="w-full h-32 object-cover" />
                          <div className="p-2 space-y-1">
                            <input
                              type="text"
                              value={photo.description}
                              onChange={(e) => {
                                const updated = [...clinicalPhotos];
                                updated[i] = { ...updated[i], description: e.target.value };
                                setClinicalPhotos(updated);
                              }}
                              placeholder="Description"
                              className="w-full text-xs px-2 py-1 border rounded"
                            />
                            <input
                              type="text"
                              value={photo.location}
                              onChange={(e) => {
                                const updated = [...clinicalPhotos];
                                updated[i] = { ...updated[i], location: e.target.value };
                                setClinicalPhotos(updated);
                              }}
                              placeholder="Body location"
                              className="w-full text-xs px-2 py-1 border rounded"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setClinicalPhotos(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 5: WOUND ASSESSMENT
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="wounds" label="Wound Assessment" icon={<Scissors size={20} />} badge={wounds.length} />
          <AnimatePresence>
            {expandedSections.has('wounds') && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 space-y-4">
                  {wounds.map((wound, idx) => (
                    <div key={wound.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Wound #{idx + 1}</span>
                        <button type="button" onClick={() => setWounds(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Location *</label>
                          <input
                            type="text"
                            value={wound.location}
                            onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], location: e.target.value }; setWounds(u); }}
                            placeholder="e.g., Right lower leg"
                            className="w-full px-2 py-1.5 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Type</label>
                          <select value={wound.type} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], type: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm">
                            <option value="surgical">Surgical</option>
                            <option value="traumatic">Traumatic</option>
                            <option value="pressure_ulcer">Pressure Ulcer</option>
                            <option value="diabetic_ulcer">Diabetic Ulcer</option>
                            <option value="venous_ulcer">Venous Ulcer</option>
                            <option value="burn">Burn</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Length (cm)</label>
                          <input type="number" step="0.1" value={wound.length} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], length: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Width (cm)</label>
                          <input type="number" step="0.1" value={wound.width} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], width: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Depth (cm)</label>
                          <input type="number" step="0.1" value={wound.depth} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], depth: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tissue Type</label>
                          <select value={wound.tissueType} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], tissueType: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm">
                            <option value="epithelial">Epithelial</option>
                            <option value="granulation">Granulation</option>
                            <option value="slough">Slough</option>
                            <option value="necrotic">Necrotic</option>
                            <option value="eschar">Eschar</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Exudate</label>
                          <select value={wound.exudateAmount} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], exudateAmount: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm">
                            <option value="none">None</option>
                            <option value="light">Light</option>
                            <option value="moderate">Moderate</option>
                            <option value="heavy">Heavy</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Pain (0-10)</label>
                          <input type="number" min="0" max="10" value={wound.painLevel} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], painLevel: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Healing Progress</label>
                          <select value={wound.healingProgress} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], healingProgress: e.target.value }; setWounds(u); }} className="w-full px-2 py-1.5 border rounded text-sm">
                            <option value="improving">Improving</option>
                            <option value="stable">Stable</option>
                            <option value="deteriorating">Deteriorating</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Dressing Type</label>
                          <input type="text" value={wound.dressingType} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], dressingType: e.target.value }; setWounds(u); }} placeholder="e.g., Hydrocolloid" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Notes</label>
                          <input type="text" value={wound.notes} onChange={(e) => { const u = [...wounds]; u[idx] = { ...u[idx], notes: e.target.value }; setWounds(u); }} placeholder="Additional wound notes" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                      </div>
                      {/* Wound Photo */}
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs cursor-pointer hover:bg-gray-200">
                        <Camera size={14} /> {wound.photo ? 'Photo attached ✓' : 'Attach wound photo'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const u = [...wounds];
                                u[idx] = { ...u[idx], photo: reader.result as string };
                                setWounds(u);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setWounds(prev => [...prev, emptyWound()])}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Plus size={16} /> Add Wound Assessment
                  </button>

                  {/* Previous wounds */}
                  {(patientWounds || []).length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Previous Wound Records</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {(patientWounds || []).map(w => (
                          <div key={w.id} className="text-xs p-2 bg-gray-50 rounded flex items-center gap-2">
                            <Scissors size={12} className="text-gray-400" />
                            <span>{w.location} — {w.type}</span>
                            <span className={`px-1 rounded ${
                              w.healingProgress === 'improving' ? 'bg-green-100 text-green-700' :
                              w.healingProgress === 'deteriorating' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{w.healingProgress}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 6: PRESCRIPTIONS
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="prescriptions" label="Prescriptions" icon={<Pill size={20} />} badge={medications.length} />
          <AnimatePresence>
            {expandedSections.has('prescriptions') && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 space-y-4">
                  {/* OCR for prescriptions */}
                  <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                    <ScanLine size={18} className="text-violet-600" />
                    <span className="text-sm text-violet-700 flex-1">Scan a prescription to auto-fill medications</span>
                    <ScanToText
                      onTextRecognized={(text) => {
                        const lines = text.split('\n').filter(l => l.trim());
                        const newMeds: MedEntry[] = [];
                        for (const line of lines) {
                          if (line.length > 3) {
                            const match = line.match(/^(.+?)\s+(\d+\s*(?:mg|g|ml|mcg|units?))\s+(.+?)$/i);
                            if (match) {
                              newMeds.push({ ...emptyMed(), name: match[1].trim(), dosage: match[2].trim(), frequency: match[3].trim() });
                            } else {
                              newMeds.push({ ...emptyMed(), name: line.replace(/^[\d\.\-\)\]]+\s*/, '').trim() });
                            }
                          }
                        }
                        if (newMeds.length > 0) {
                          setMedications(prev => [...prev, ...newMeds]);
                          toast.success(`Added ${newMeds.length} medication(s) from scan`);
                        }
                      }}
                      iconOnly={false}
                      size="sm"
                      medicalContext
                    />
                  </div>

                  {medications.map((med, idx) => (
                    <div key={med.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Medication #{idx + 1}</span>
                        <button type="button" onClick={() => setMedications(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-xs text-gray-500">Drug Name *</label>
                          <input type="text" value={med.name} onChange={(e) => { const u = [...medications]; u[idx] = { ...u[idx], name: e.target.value }; setMedications(u); }} placeholder="e.g., Amoxicillin" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Dosage</label>
                          <input type="text" value={med.dosage} onChange={(e) => { const u = [...medications]; u[idx] = { ...u[idx], dosage: e.target.value }; setMedications(u); }} placeholder="e.g., 500mg" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Frequency</label>
                          <input type="text" value={med.frequency} onChange={(e) => { const u = [...medications]; u[idx] = { ...u[idx], frequency: e.target.value }; setMedications(u); }} placeholder="e.g., TDS" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Route</label>
                          <select value={med.route} onChange={(e) => { const u = [...medications]; u[idx] = { ...u[idx], route: e.target.value }; setMedications(u); }} className="w-full px-2 py-1.5 border rounded text-sm">
                            <option value="oral">Oral</option>
                            <option value="intravenous">IV</option>
                            <option value="intramuscular">IM</option>
                            <option value="subcutaneous">SC</option>
                            <option value="topical">Topical</option>
                            <option value="rectal">PR</option>
                            <option value="sublingual">SL</option>
                            <option value="inhaled">Inhaled</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Duration</label>
                          <input type="text" value={med.duration} onChange={(e) => { const u = [...medications]; u[idx] = { ...u[idx], duration: e.target.value }; setMedications(u); }} placeholder="e.g., 7 days" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Instructions</label>
                          <input type="text" value={med.instructions} onChange={(e) => { const u = [...medications]; u[idx] = { ...u[idx], instructions: e.target.value }; setMedications(u); }} placeholder="e.g., After meals" className="w-full px-2 py-1.5 border rounded text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setMedications(prev => [...prev, emptyMed()])}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Plus size={16} /> Add Medication
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 7: FOLLOW-UP SCHEDULE
        ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader section="followup" label="Follow-Up Schedule" icon={<Calendar size={20} />} />
          <AnimatePresence>
            {expandedSections.has('followup') && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Next Appointment Date</label>
                      <input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Visit Type</label>
                      <select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                        <option value="clinic">Clinic Review</option>
                        <option value="wound_review">Wound Review</option>
                        <option value="post_op">Post-Op Check</option>
                        <option value="investigation_review">Investigation Review</option>
                        <option value="dressing">Dressing Change</option>
                        <option value="suture_removal">Suture Removal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Quick Schedule</label>
                      <div className="flex gap-1">
                        {[7, 14, 30, 90].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setFollowUpDate(format(addDays(new Date(), days), 'yyyy-MM-dd'))}
                            className="flex-1 px-2 py-2 text-xs bg-gray-100 hover:bg-primary-100 rounded-lg transition-colors"
                          >
                            {days < 30 ? `${days}d` : `${days / 30}mo`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Follow-Up Instructions</label>
                    <div className="flex items-center justify-end mb-1">
                      <ScanToText onTextRecognized={(t) => setFollowUpNotes(prev => prev ? prev + '\n' + t : t)} iconOnly size="sm" />
                    </div>
                    <textarea
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      placeholder="Instructions for next visit, what to monitor..."
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ SUBMIT ═══ */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/patients/${patientId}`)}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {diagnoses.length} dx · {vitalEntries.filter(v => v.pulse || v.temperature).length} vitals · {invRequests.length} inv · {medications.length} rx
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-medium hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Encounter
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
