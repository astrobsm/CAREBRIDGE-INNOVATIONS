/**
 * UnifiedSurgicalPrepPage - Comprehensive Surgical Preparation
 * Merges SurgeryPlanningPage, PreoperativePlanningPage, PreoperativeAssessmentPage
 * 7 Tabs: Procedure, Risk, Clinical, Investigations, Team, Estimate, Summary
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { subDays, isAfter, differenceInYears, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Save, Scissors, ClipboardCheck,
  AlertTriangle, Users, CheckCircle, Info, Search, FileText,
  Download, DollarSign, Beaker, ChevronDown, ChevronUp,
  BookOpen, Heart, Stethoscope, Activity, Wind, Shield,
  Calculator, XCircle, AlertCircle, Eye, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { HospitalSelector } from '../../../components/hospital';
import type { Surgery, Patient, AnaesthesiaType } from '../../../types';
import type {
  SurgicalUrgency, AnaesthesiaType as PreopAnaesthesiaType,
  ASAClass, ComorbidityCategory, ProcedureCategory,
  OptimizationRecommendation,
  PreoperativeAssessment as DomainPreopAssessment,
} from '../../preoperative-planning/types';
import {
  generateInvestigationList, getProtocolForComorbidity,
  suggestASAClass, INVESTIGATION_INFO,
} from '../../preoperative-planning/data/protocols';
import {
  procedureCategories, formatNaira, calculateSurgicalFeeEstimate,
  searchProcedures, type SurgicalProcedure, type SurgicalFeeEstimate,
} from '../../../data/surgicalFees';
import {
  generatePreOpInstructionsPDF, generatePostOpInstructionsPDF,
  generateFeeEstimatePDF, generateConsentFormPDF,
} from '../utils/surgeryPdfGenerator';
import { downloadPreoperativeAssessmentPDF } from '../../preoperative-planning/utils/preoperativePdfGenerator';
import { generatePatientCounselingPDF } from '../../../utils/counselingPdfGenerator';
import { getProcedureEducation } from '../../../data/patientEducation';

// ── Schema ──────────────────────────────────────────────────
const surgerySchema = z.object({
  procedureName: z.string().min(3, 'Procedure name required'),
  procedureCode: z.string().optional(),
  procedureId: z.string().optional(),
  type: z.enum(['elective', 'emergency']),
  category: z.enum(['minor', 'intermediate', 'major', 'super_major']),
  scheduledDate: z.string().min(1, 'Scheduled date required'),
  anaesthesiaType: z.string().optional(),
  specialInstructions: z.string().optional(),
  asaScore: z.number().min(1).max(5),
  capriniScore: z.number().optional(),
  mallampatiScore: z.number().min(1).max(4).optional(),
  npoStatus: z.boolean(),
  consentSigned: z.boolean(),
  bloodTyped: z.boolean(),
  assistant: z.string().optional(),
  anaesthetist: z.string().optional(),
  scrubNurse: z.string().optional(),
  circulatingNurse: z.string().optional(),
  surgeonFee: z.number().optional(),
  includeHistology: z.boolean().optional(),
});
type SurgeryFormData = z.infer<typeof surgerySchema>;

// ── Tabs ────────────────────────────────────────────────────
const TABS = [
  { id: 'procedure', label: 'Procedure', icon: Scissors },
  { id: 'risk', label: 'Risk', icon: AlertTriangle },
  { id: 'clinical', label: 'Clinical', icon: Stethoscope },
  { id: 'investigations', label: 'Investigations', icon: Beaker },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'estimate', label: 'Estimate', icon: DollarSign },
  { id: 'summary', label: 'Summary', icon: FileText },
] as const;
type TabId = (typeof TABS)[number]['id'];

// ── ASA ─────────────────────────────────────────────────────
const asaDescriptions = [
  { score: 1, class: 'I' as ASAClass, desc: 'Normal healthy patient' },
  { score: 2, class: 'II' as ASAClass, desc: 'Mild systemic disease' },
  { score: 3, class: 'III' as ASAClass, desc: 'Severe systemic disease' },
  { score: 4, class: 'IV' as ASAClass, desc: 'Severe – constant threat to life' },
  { score: 5, class: 'V' as ASAClass, desc: 'Moribund – not expected to survive' },
];

// ── Caprini VTE factors ─────────────────────────────────────
const capriniGroups = {
  age: [
    { label: '41-60 years', pts: 1 }, { label: '61-74 years', pts: 2 }, { label: '≥75 years', pts: 3 },
  ],
  surgery: [
    { label: 'Minor surgery', pts: 1 }, { label: 'Major surgery (>45 min)', pts: 2 },
    { label: 'Laparoscopic (>45 min)', pts: 2 },
  ],
  clinical: [
    { label: 'Swollen legs (current)', pts: 1 }, { label: 'Varicose veins', pts: 1 },
    { label: 'Obesity (BMI >25)', pts: 1 }, { label: 'Acute MI', pts: 1 },
    { label: 'CHF (<1 month)', pts: 1 }, { label: 'Sepsis (<1 month)', pts: 1 },
    { label: 'COPD', pts: 1 }, { label: 'Medical bed rest', pts: 1 },
    { label: 'Inflammatory bowel disease', pts: 1 },
  ],
  moderate: [
    { label: 'Malignancy', pts: 2 }, { label: 'Central venous access', pts: 2 },
    { label: 'Confined to bed >72hr', pts: 2 }, { label: 'Immobilizing cast', pts: 2 },
  ],
  high: [
    { label: 'History of DVT/PE', pts: 3 }, { label: 'Family history DVT/PE', pts: 3 },
    { label: 'Factor V Leiden', pts: 3 }, { label: 'Lupus anticoagulant', pts: 3 },
    { label: 'HIT', pts: 3 }, { label: 'Other thrombophilia', pts: 3 },
  ],
  veryHigh: [
    { label: 'Stroke (<1 month)', pts: 5 }, { label: 'Elective arthroplasty', pts: 5 },
    { label: 'Hip/pelvis/leg fracture', pts: 5 }, { label: 'Acute spinal cord injury', pts: 5 },
  ],
  female: [
    { label: 'OCP or HRT', pts: 1 }, { label: 'Pregnancy/postpartum', pts: 1 },
  ],
};
const allCaprini = Object.values(capriniGroups).flat();
const capriniRiskLevels = [
  { min: 0, max: 0, level: 'Very Low', color: 'bg-emerald-100 text-emerald-700', prophylaxis: 'Early ambulation' },
  { min: 1, max: 2, level: 'Low', color: 'bg-sky-100 text-sky-700', prophylaxis: 'Mechanical (IPC/GCS)' },
  { min: 3, max: 4, level: 'Moderate', color: 'bg-amber-100 text-amber-700', prophylaxis: 'LMWH/UFH + Mechanical' },
  { min: 5, max: Infinity, level: 'High', color: 'bg-red-100 text-red-700', prophylaxis: 'LMWH + Mechanical' },
];

// ── RCRI cardiac risk ───────────────────────────────────────
const rcriFactors = [
  { label: 'High-risk surgery (intraperitoneal / intrathoracic / suprainguinal vascular)', value: 'high_risk' },
  { label: 'Ischaemic heart disease', value: 'ihd' },
  { label: 'Congestive heart failure', value: 'chf' },
  { label: 'Cerebrovascular disease', value: 'cvd' },
  { label: 'Diabetes on insulin', value: 'diabetes_insulin' },
  { label: 'Creatinine >177 µmol/L', value: 'renal' },
];

// ── Anticoagulant guidance ──────────────────────────────────
const anticoagulants = [
  { drug: 'Aspirin', hold: '7 days', bridging: 'Not usually needed' },
  { drug: 'Clopidogrel', hold: '5-7 days', bridging: 'Cardiology if recent stent' },
  { drug: 'Warfarin', hold: '5 days (INR <1.5)', bridging: 'LMWH if high VTE risk' },
  { drug: 'Rivaroxaban', hold: '≥24-48h', bridging: 'Not needed' },
  { drug: 'Apixaban', hold: '≥24-48h', bridging: 'Not needed' },
  { drug: 'Dabigatran', hold: '48-96h (renal)', bridging: 'Not needed' },
  { drug: 'Enoxaparin (therapeutic)', hold: '24h', bridging: 'N/A' },
];

// ── Investigation reference ranges ─────────────────────────
const invSections: Record<string, { name: string; unit: string; normalM: string; normalF: string }[]> = {
  haematology: [
    { name: 'Haemoglobin', unit: 'g/dL', normalM: '13-17', normalF: '12-16' },
    { name: 'PCV/Haematocrit', unit: '%', normalM: '40-54', normalF: '36-48' },
    { name: 'WBC Count', unit: 'x10⁹/L', normalM: '4.0-11.0', normalF: '4.0-11.0' },
    { name: 'Platelet Count', unit: 'x10⁹/L', normalM: '150-400', normalF: '150-400' },
    { name: 'PT/INR', unit: 's/ratio', normalM: '11-13.5/0.8-1.2', normalF: '11-13.5/0.8-1.2' },
    { name: 'APTT', unit: 'seconds', normalM: '25-35', normalF: '25-35' },
  ],
  biochemistry: [
    { name: 'Sodium', unit: 'mmol/L', normalM: '135-145', normalF: '135-145' },
    { name: 'Potassium', unit: 'mmol/L', normalM: '3.5-5.0', normalF: '3.5-5.0' },
    { name: 'Urea', unit: 'mmol/L', normalM: '2.5-6.7', normalF: '2.5-6.7' },
    { name: 'Creatinine', unit: 'µmol/L', normalM: '62-106', normalF: '44-80' },
    { name: 'Fasting Glucose', unit: 'mmol/L', normalM: '3.9-5.6', normalF: '3.9-5.6' },
  ],
  other: [
    { name: 'Blood Group & Crossmatch', unit: '', normalM: 'A/B/AB/O ± Rh', normalF: 'A/B/AB/O ± Rh' },
    { name: 'ECG', unit: '', normalM: 'NSR', normalF: 'NSR' },
    { name: 'Chest X-Ray', unit: '', normalM: 'No acute disease', normalF: 'No acute disease' },
  ],
};

// ── WHO risk factors ────────────────────────────────────────
const whoRiskFactors = [
  'Diabetes Mellitus', 'Hypertension', 'Cardiovascular Disease', 'Chronic Kidney Disease',
  'Chronic Liver Disease', 'Respiratory Disease (COPD/Asthma)', 'Obesity (BMI >30)',
  'Malnutrition', 'Immunocompromised State', 'HIV/AIDS', 'Active Malignancy',
  'Previous Stroke/TIA', 'Bleeding Disorder', 'Anticoagulant Therapy', 'Smoking',
  'Alcohol Use Disorder', 'Pregnancy', 'Elderly (>65 years)', 'Anemia',
  'Sickle Cell Disease', 'Sleep Apnea',
];

// ════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════
export default function UnifiedSurgicalPrepPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── State ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('procedure');
  const [saving, setSaving] = useState(false);
  const [editingSurgeryId] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureDD, setShowProcedureDD] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<SurgicalProcedure | null>(null);
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [selectedCaprini, setSelectedCaprini] = useState<string[]>([]);
  const [comorbidities, setComorbidities] = useState<ComorbidityCategory[]>([]);
  const [airway, setAirway] = useState({
    mallampati: 1 as 1 | 2 | 3 | 4,
    mouthOpening: 'adequate' as 'adequate' | 'limited',
    neckMobility: 'normal' as 'normal' | 'limited' | 'severely_limited',
    dentition: 'normal' as 'normal' | 'loose_teeth' | 'dentures' | 'edentulous',
  });
  const [rcriSel, setRcriSel] = useState<string[]>([]);
  const [bleedingMeds, setBleedingMeds] = useState<string[]>([]);
  const [funcCap, setFuncCap] = useState({ mets: 4, canClimbStairs: true, canWalkTwoBlocks: true });
  const [invValues, setInvValues] = useState<Record<string, string>>({});
  const [openInvSection, setOpenInvSection] = useState<string | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<SurgicalFeeEstimate | null>(null);
  const [customSurgeonFee, setCustomSurgeonFee] = useState<number | null>(null);
  const [includeHistology, setIncludeHistology] = useState(false);

  // ── Data ──────────────────────────────────────────────────
  const patient = useLiveQuery(() => patientId ? db.patients.get(patientId) : undefined, [patientId]);
  const dbUsers = useLiveQuery(() => db.users.toArray(), []);
  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);
  const recentInvs = useLiveQuery(
    () => patientId
      ? db.investigations.where('patientId').equals(patientId)
          .filter(inv => isAfter(new Date(inv.requestedAt || inv.createdAt), subDays(new Date(), 30)))
          .toArray()
      : [],
    [patientId],
  );

  // ── Form ──────────────────────────────────────────────────
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SurgeryFormData>({
    resolver: zodResolver(surgerySchema),
    defaultValues: {
      type: 'elective', category: 'intermediate', asaScore: 1, capriniScore: 0,
      mallampatiScore: 1, npoStatus: false, consentSigned: false, bloodTyped: false,
      surgeonFee: 0, includeHistology: false,
    },
  });
  const wType = watch('type');
  const wCategory = watch('category');
  const wAnaesthesia = watch('anaesthesiaType');

  // ── Derived ───────────────────────────────────────────────
  const patientAge = useMemo(() => {
    if (!patient?.dateOfBirth) return 0;
    return differenceInYears(new Date(), new Date(patient.dateOfBirth));
  }, [patient]);

  const isFemale = useMemo(() => {
    if (!patient) return false;
    return patient.gender === 'female' && patientAge >= 15 && patientAge <= 50;
  }, [patient, patientAge]);

  const filteredProcs = useMemo(() => {
    if (!procedureSearch || procedureSearch.length < 2) return [];
    return searchProcedures(procedureSearch).slice(0, 10);
  }, [procedureSearch]);

  const requiredInvs = useMemo(() => generateInvestigationList(
    comorbidities.length > 0 ? comorbidities : ['none'],
    (wCategory || 'intermediate') as ProcedureCategory,
    (wAnaesthesia || 'general') as PreopAnaesthesiaType,
    patientAge, isFemale,
  ), [comorbidities, wCategory, wAnaesthesia, patientAge, isFemale]);

  const activeProtocols = useMemo(() =>
    comorbidities.map(c => getProtocolForComorbidity(c)).filter(Boolean) as NonNullable<ReturnType<typeof getProtocolForComorbidity>>[],
  [comorbidities]);

  const optRecs = useMemo(() => {
    const recs: OptimizationRecommendation[] = [];
    activeProtocols.forEach(p => p.optimizations.forEach(o => {
      if (!recs.some(r => r.recommendation === o.recommendation)) recs.push(o);
    }));
    return recs.sort((a, b) => {
      const p: Record<string, number> = { critical: 0, important: 1, recommended: 2 };
      return (p[a.priority] ?? 9) - (p[b.priority] ?? 9);
    });
  }, [activeProtocols]);

  const redFlags = useMemo(() => {
    const f: string[] = [];
    activeProtocols.forEach(p => p.redFlags.forEach(r => { if (!f.includes(r)) f.push(r); }));
    return f;
  }, [activeProtocols]);

  const anaesthConsiderations = useMemo(() => {
    const c: string[] = [];
    activeProtocols.forEach(p => p.anaesthesiaConsiderations.forEach(a => { if (!c.includes(a)) c.push(a); }));
    return c;
  }, [activeProtocols]);

  const capriniScore = useMemo(() => {
    let s = 0;
    selectedCaprini.forEach(label => {
      const f = allCaprini.find(x => x.label === label);
      if (f) s += f.pts;
    });
    return s;
  }, [selectedCaprini]);

  const capriniRisk = useMemo(() =>
    capriniRiskLevels.find(l => capriniScore >= l.min && capriniScore <= l.max) || capriniRiskLevels[0],
  [capriniScore]);

  const rcriScore = rcriSel.length;
  const rcriRisk = useMemo(() => {
    if (rcriScore === 0) return { level: 'Very Low', pct: '3.9%', color: 'text-emerald-600' };
    if (rcriScore === 1) return { level: 'Low', pct: '6.0%', color: 'text-sky-600' };
    if (rcriScore === 2) return { level: 'Moderate', pct: '10.1%', color: 'text-amber-600' };
    return { level: 'High', pct: '>15%', color: 'text-red-600' };
  }, [rcriScore]);

  const suggestedASA = useMemo(() => suggestASAClass(comorbidities), [comorbidities]);

  const airwayDifficulty = useMemo(() => {
    let s = 0;
    if (airway.mallampati >= 3) s += 2;
    if (airway.mouthOpening === 'limited') s += 1;
    if (airway.neckMobility !== 'normal') s += 1;
    if (airway.dentition === 'loose_teeth') s += 1;
    return s >= 3 ? 'difficult' : s >= 1 ? 'potentially_difficult' : 'easy';
  }, [airway]);

  // ── Fee estimate auto-calc ────────────────────────────────
  useEffect(() => {
    if (selectedProcedure) {
      setFeeEstimate(calculateSurgicalFeeEstimate(selectedProcedure, {
        customSurgeonFee: customSurgeonFee ?? undefined,
        includeHistology,
        includeAnaesthesia: true,
        anaesthesiaType: (wAnaesthesia as 'local' | 'regional' | 'general') || 'general',
      }));
    }
  }, [selectedProcedure, wAnaesthesia, includeHistology, customSurgeonFee]);

  // ── Readiness score ───────────────────────────────────────
  const readiness = useMemo(() => {
    const mandInvs = requiredInvs.filter(i => i.requirement === 'mandatory');
    const mandMet = mandInvs.every(i => (invValues[i.type] || '').trim() !== '');
    const recs: string[] = [];
    if (redFlags.length > 0) recs.push('Review red flags before proceeding');
    if (airwayDifficulty === 'difficult') recs.push('Anaesthetist review for airway plan');
    if (capriniScore >= 5) recs.push('High VTE risk – ensure prophylaxis ordered');
    if (rcriScore >= 2) recs.push('Elevated cardiac risk – consider cardiology clearance');
    optRecs.filter(r => r.priority === 'critical').forEach(r => recs.push(r.recommendation));

    let score = 0;
    if (mandMet) score += 40;
    if (watch('consentSigned')) score += 15;
    if (watch('bloodTyped')) score += 10;
    if (watch('npoStatus')) score += 10;
    if (comorbidities.length > 0 || selectedRiskFactors.length > 0) score += 10;
    if (watch('anaesthetist')) score += 5;
    if (watch('assistant')) score += 5;
    if (airway.mallampati > 0) score += 5;

    let status: 'ready' | 'needs_optimization' | 'not_ready' | 'incomplete' = 'incomplete';
    if (score >= 85 && mandMet) status = 'ready';
    else if (score >= 60 && mandMet) status = 'needs_optimization';
    else if (score >= 40) status = 'not_ready';

    return { status, score, mandMet, recs, canProceed: status === 'ready' || status === 'needs_optimization' };
  }, [requiredInvs, invValues, redFlags, airwayDifficulty, capriniScore, rcriScore, comorbidities, selectedRiskFactors, watch, optRecs, airway]);

  // ── Helpers ───────────────────────────────────────────────
  const fullName = useCallback(() =>
    user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '', [user]);

  const handleProcSelect = (proc: SurgicalProcedure) => {
    setSelectedProcedure(proc);
    setValue('procedureName', proc.name);
    setValue('procedureCode', proc.icdCode || '');
    setValue('procedureId', proc.id);
    setValue('category', proc.category as 'minor' | 'intermediate' | 'major' | 'super_major');
    setProcedureSearch(proc.name);
    setShowProcedureDD(false);
  };

  const toggleCaprini = (label: string) =>
    setSelectedCaprini(p => p.includes(label) ? p.filter(f => f !== label) : [...p, label]);
  const toggleRisk = (f: string) =>
    setSelectedRiskFactors(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  const toggleComorbidity = (c: ComorbidityCategory) => {
    setComorbidities(p => {
      if (c === 'none') return ['none'];
      const fil = p.filter(x => x !== 'none');
      return fil.includes(c) ? fil.filter(x => x !== c) : [...fil, c];
    });
  };
  const toggleRcri = (v: string) =>
    setRcriSel(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const autoImport = useCallback(() => {
    if (!recentInvs?.length) { toast.error('No recent investigations'); return; }
    let n = 0;
    recentInvs.forEach(inv => {
      if (inv.results?.length) inv.results.forEach(r => {
        const k = (r.parameter || '').toLowerCase().replace(/\s+/g, '_');
        if (k && !invValues[k]) { setInvValues(p => ({ ...p, [k]: String(r.value) })); n++; }
      });
    });
    n > 0 ? toast.success(`Imported ${n} result(s)`) : toast('No new results to import');
  }, [recentInvs, invValues]);

  // ── Tab navigation ────────────────────────────────────────
  const tabIdx = TABS.findIndex(t => t.id === activeTab);
  const goNext = () => { if (tabIdx < TABS.length - 1) setActiveTab(TABS[tabIdx + 1].id); };
  const goPrev = () => { if (tabIdx > 0) setActiveTab(TABS[tabIdx - 1].id); };

  // ── Submit ────────────────────────────────────────────────
  const onSubmit = async (data: SurgeryFormData) => {
    if (!patient || !user) return;
    setSaving(true);
    try {
      const surgeryId = editingSurgeryId || uuidv4();
      const hospitalId = selectedHospitalId || user.hospitalId || '';
      const userName = fullName();

      const outstanding: Surgery['outstandingItems'] = [];
      if (!data.consentSigned) outstanding!.push({ id: uuidv4(), type: 'consent', label: 'Informed Consent', description: 'Not signed', completed: false });
      if (!data.bloodTyped) outstanding!.push({ id: uuidv4(), type: 'blood_typing', label: 'Blood Typing', description: 'Not completed', completed: false });
      if (!data.npoStatus) outstanding!.push({ id: uuidv4(), type: 'npo_status', label: 'NPO Confirmation', description: 'Not confirmed', completed: false });

      let status: Surgery['status'] = 'incomplete_preparation';
      if (!outstanding!.length && readiness.mandMet) status = 'ready_for_preanaesthetic_review';
      if (!outstanding!.length && readiness.status === 'ready') status = 'scheduled';

      const investigationsArr: string[] = Object.entries(invValues).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);

      const rec: Surgery = {
        id: surgeryId, patientId: patient.id!, hospitalId,
        procedureName: data.procedureName, procedureCode: data.procedureCode,
        type: data.type, category: data.category,
        scheduledDate: new Date(data.scheduledDate),
        anaesthesiaType: data.anaesthesiaType as AnaesthesiaType,
        status, outstandingItems: outstanding,
        surgeon: userName, surgeonId: user.id,
        surgeonFee: customSurgeonFee ?? data.surgeonFee ?? 0,
        assistant: data.assistant, anaesthetist: data.anaesthetist,
        scrubNurse: data.scrubNurse, circulatingNurse: data.circulatingNurse,
        preOperativeAssessment: {
          asaScore: data.asaScore as 1 | 2 | 3 | 4 | 5,
          capriniScore, mallampatiScore: (data.mallampatiScore ?? airway.mallampati) as 1 | 2 | 3 | 4,
          npoStatus: data.npoStatus, consentSigned: data.consentSigned,
          bloodTyped: data.bloodTyped, investigations: investigationsArr,
          riskFactors: selectedRiskFactors,
          specialInstructions: data.specialInstructions,
        },
        createdAt: new Date(), updatedAt: new Date(),
      };

      if (editingSurgeryId) {
        await db.surgeries.update(editingSurgeryId, rec as unknown as Record<string, unknown>);
        toast.success('Surgery updated');
      } else {
        await db.surgeries.add(rec);
        toast.success('Surgery scheduled');
      }
      try { await syncRecord('surgeries', rec as unknown as Record<string, unknown>); } catch { /* offline */ }
      navigate('/surgery');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  // ── PDF generation ────────────────────────────────────────
  const genPDF = (type: 'preop' | 'postop' | 'fee' | 'consent' | 'counseling' | 'assessment') => {
    if (!patient) return;
    const userName = fullName();
    const pInfo = {
      name: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber, age: patientAge, gender: patient.gender,
    };
    const sInfo = {
      procedureName: watch('procedureName') || '', procedureCode: watch('procedureCode') || '',
      scheduledDate: watch('scheduledDate') ? format(new Date(watch('scheduledDate')), 'dd/MM/yyyy') : 'N/A',
      surgeon: userName, anaesthesiaType: watch('anaesthesiaType') || 'TBD',
      asaScore: watch('asaScore'), capriniScore,
      hospitalName: hospitals?.[0]?.name || 'AstroHEALTH Hospital',
    };
    try {
      switch (type) {
        case 'preop': generatePreOpInstructionsPDF(pInfo, sInfo); break;
        case 'postop': generatePostOpInstructionsPDF(pInfo, sInfo, { medications: [], woundCare: [], activities: [], diet: [], followUp: '' }); break;
        case 'consent': generateConsentFormPDF(pInfo, sInfo); break;
        case 'fee':
          if (feeEstimate && selectedProcedure) generateFeeEstimatePDF(pInfo, sInfo, selectedProcedure, feeEstimate);
          else { toast.error('Select a procedure first'); return; }
          break;
        case 'counseling': {
          const edu = selectedProcedure ? getProcedureEducation(selectedProcedure.id) : null;
          if (edu) generatePatientCounselingPDF({ patient: patient as Patient, procedure: edu, surgeonName: userName, hospitalName: hospitals?.[0]?.name || 'AstroHEALTH Hospital' });
          else { toast.error('No education data available'); return; }
          break;
        }
        case 'assessment': {
          const aData = {
            patient: patient as Patient,
            assessment: {
              id: uuidv4(), patientId: patient.id!, hospitalId: selectedHospitalId || '',
              createdBy: user?.id || '', createdAt: new Date(), updatedAt: new Date(),
              status: 'draft' as const, plannedProcedure: watch('procedureName'),
              procedureCategory: (wCategory || 'intermediate') as ProcedureCategory,
              plannedAnaesthesia: (wAnaesthesia || 'general') as PreopAnaesthesiaType,
              surgicalUrgency: wType as SurgicalUrgency,
              asaClass: (suggestedASA || 'I') as ASAClass, comorbidities, clinicalNotes: '',
              airwayAssessment: { mallampatiScore: airway.mallampati, neckMobility: airway.neckMobility, mouthOpening: airway.mouthOpening, dentition: airway.dentition, predictedDifficulty: airwayDifficulty },
              functionalCapacity: { mets: funcCap.mets, canClimbStairs: funcCap.canClimbStairs, canWalkTwoBlocks: funcCap.canWalkTwoBlocks, limitations: '' },
              requiredInvestigations: requiredInvs.map(i => ({ type: i.type, requirement: i.requirement, result: invValues[i.type] || undefined })),
              optimizationPlan: optRecs.map(r => ({ recommendation: r.recommendation, status: 'pending' as const })),
              consentObtained: watch('consentSigned'), educationProvided: false, estimateCreated: !!feeEstimate,
            } as DomainPreopAssessment,
            investigations: requiredInvs,
            recommendations: optRecs,
            hospitalName: hospitals?.[0]?.name || 'AstroHEALTH Hospital',
            generatedBy: userName,
          };
          downloadPreoperativeAssessmentPDF(aData);
          break;
        }
      }
      toast.success('PDF generated');
    } catch (err) { console.error('PDF error:', err); toast.error('Failed to generate PDF'); }
  };

  // ── Loading ───────────────────────────────────────────────
  if (!patientId) return (
    <div className="p-6 text-center">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
      <h2 className="text-xl font-bold mb-2">No Patient Selected</h2>
      <Link to="/patients" className="btn btn-primary"><Search size={18} /> Find Patient</Link>
    </div>
  );
  if (!patient) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" title="Go back"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Scissors className="w-6 h-6 text-purple-500" /> Surgical Preparation
            </h1>
            <p className="text-sm text-gray-500">{patient.firstName} {patient.lastName} · {patient.hospitalNumber} · {patientAge}y · {patient.gender}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            readiness.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
            readiness.status === 'needs_optimization' ? 'bg-amber-100 text-amber-700' :
            readiness.status === 'not_ready' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {readiness.status === 'ready' ? '✓ Ready' : readiness.status === 'needs_optimization' ? '⚠ Needs Opt.' : readiness.status === 'not_ready' ? '✗ Not Ready' : '○ Incomplete'} ({readiness.score}%)
          </span>
          <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn btn-primary">
            <Save size={18} />{saving ? 'Saving...' : 'Schedule Surgery'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-purple-500 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>

          {/* ── TAB 1: PROCEDURE ─────────────────────────── */}
          {activeTab === 'procedure' && (
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Hospital</h3>
                <HospitalSelector value={selectedHospitalId || undefined} onChange={(id) => setSelectedHospitalId(id || '')} />
              </div>

              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Scissors size={18} className="text-purple-500" /> Procedure Selection</h3>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" value={procedureSearch}
                      onChange={e => { setProcedureSearch(e.target.value); setShowProcedureDD(true); }}
                      onFocus={() => setShowProcedureDD(true)}
                      placeholder="Search procedures by name or ICD-10..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                  </div>
                  {showProcedureDD && filteredProcs.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredProcs.map(proc => (
                        <button key={proc.id} onClick={() => handleProcSelect(proc)}
                          className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-100 last:border-0">
                          <p className="font-medium text-gray-900">{proc.name}</p>
                          <p className="text-xs text-gray-500">{proc.icdCode || ''} · {proc.category}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProcedure && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="font-medium text-purple-900">{selectedProcedure.name}</p>
                    <p className="text-purple-600 text-sm">{selectedProcedure.icdCode || ''} · {selectedProcedure.category} · {selectedProcedure.complexityLabel}</p>
                    <p className="text-purple-500 text-xs mt-1">Default fee: {formatNaira(selectedProcedure.defaultFee)}</p>
                  </div>
                )}
              </div>

              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Scheduling & Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                    <input type="date" {...register('scheduledDate')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    {errors.scheduledDate && <p className="text-red-500 text-xs mt-1">{errors.scheduledDate.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Surgery Type *</label>
                    <select {...register('type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" title="Surgery type">
                      <option value="elective">Elective</option><option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select {...register('category')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" title="Category">
                      {procedureCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anaesthesia Type</label>
                    <select {...register('anaesthesiaType')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" title="Anaesthesia">
                      <option value="">Select...</option>
                      <option value="local">Local</option><option value="sedation">Sedation</option>
                      <option value="spinal">Spinal</option><option value="epidural">Epidural</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                  <textarea {...register('specialInstructions')} rows={3} placeholder="Any special requirements..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: RISK & COMORBIDITIES ──────────────── */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              {/* ASA */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield size={18} className="text-blue-500" /> ASA Physical Status
                  {suggestedASA && <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Suggested: ASA {suggestedASA}</span>}
                </h3>
                <div className="grid gap-2">
                  {asaDescriptions.map(a => (
                    <label key={a.score} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${watch('asaScore') === a.score ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" value={a.score} {...register('asaScore', { valueAsNumber: true })} className="text-blue-600" />
                      <span className="font-medium">ASA {a.class}</span><span className="text-gray-500 text-sm">{a.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Comorbidities */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Heart size={18} className="text-red-500" /> Comorbidities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['none','hypertension','diabetes','cardiac_disease','respiratory_disease','renal_disease','liver_disease','thyroid_disease','obesity','coagulopathy','malignancy','neurological'] as ComorbidityCategory[]).map(c => (
                    <button key={c} onClick={() => toggleComorbidity(c)}
                      className={`px-3 py-2 rounded-lg text-sm text-left capitalize ${comorbidities.includes(c) ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>
                      {c === 'none' ? 'No comorbidities' : c.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              {/* WHO Risk */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> WHO Surgical Risk ({selectedRiskFactors.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {whoRiskFactors.map(f => (
                    <label key={f} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedRiskFactors.includes(f)} onChange={() => toggleRisk(f)} className="rounded text-amber-600" />{f}
                    </label>
                  ))}
                </div>
              </div>
              {/* Red flags */}
              {redFlags.length > 0 && (
                <div className="card p-4 border-l-4 border-red-500 bg-red-50">
                  <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2"><AlertCircle size={18} /> Red Flags</h3>
                  <ul className="space-y-1 text-sm text-red-700">{redFlags.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                </div>
              )}
              {/* Optimization */}
              {optRecs.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Info size={18} className="text-blue-500" /> Optimization</h3>
                  <div className="space-y-2">{optRecs.map((r, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded text-sm ${r.priority === 'critical' ? 'bg-red-50 text-red-700' : r.priority === 'important' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      <span>{r.priority === 'critical' ? '🔴' : r.priority === 'important' ? '🟡' : '🔵'}</span>
                      <div><p>{r.recommendation}</p>{r.timing && <p className="text-xs opacity-80">Timing: {r.timing}</p>}</div>
                    </div>
                  ))}</div>
                </div>
              )}
              {anaesthConsiderations.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-500" /> Anaesthesia Considerations</h3>
                  <ul className="space-y-1 text-sm text-gray-700">{anaesthConsiderations.map((c, i) => <li key={i}>• {c}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: CLINICAL ASSESSMENT ───────────────── */}
          {activeTab === 'clinical' && (
            <div className="space-y-4">
              {/* Airway */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wind size={18} className="text-cyan-500" /> Airway Assessment
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${airwayDifficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : airwayDifficulty === 'potentially_difficult' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {airwayDifficulty === 'easy' ? 'Easy' : airwayDifficulty === 'potentially_difficult' ? 'Potentially Difficult' : 'Difficult'}
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mallampati Score</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([1,2,3,4] as const).map(s => (
                        <button key={s} onClick={() => setAirway(p => ({ ...p, mallampati: s }))}
                          className={`p-3 rounded-lg text-center border-2 ${airway.mallampati === s ? (s <= 2 ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50') : 'border-gray-200 hover:bg-gray-50'}`}>
                          <span className="text-2xl font-bold">{s}</span>
                          <p className="text-xs text-gray-500 mt-1">{s === 1 ? 'Full' : s === 2 ? 'Partial' : s === 3 ? 'Limited' : 'None'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mouth Opening</label>
                      <select title="Mouth opening" value={airway.mouthOpening} onChange={e => setAirway(p => ({ ...p, mouthOpening: e.target.value as 'adequate' | 'limited' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="adequate">Adequate (&gt;3 FB)</option><option value="limited">Limited (&lt;3 FB)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Neck Mobility</label>
                      <select title="Neck mobility" value={airway.neckMobility} onChange={e => setAirway(p => ({ ...p, neckMobility: e.target.value as 'normal' | 'limited' | 'severely_limited' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="normal">Normal</option><option value="limited">Limited</option><option value="severely_limited">Severely Limited</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dentition</label>
                      <select title="Dentition" value={airway.dentition} onChange={e => setAirway(p => ({ ...p, dentition: e.target.value as 'normal' | 'loose_teeth' | 'dentures' | 'edentulous' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="normal">Normal</option><option value="loose_teeth">Loose Teeth</option><option value="dentures">Dentures</option><option value="edentulous">Edentulous</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              {/* RCRI */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart size={18} className="text-red-500" /> RCRI Cardiac Risk
                  <span className={`ml-auto text-sm font-bold ${rcriRisk.color}`}>{rcriScore}/6 · {rcriRisk.level} ({rcriRisk.pct})</span>
                </h3>
                <div className="space-y-2">{rcriFactors.map(f => (
                  <label key={f.value} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={rcriSel.includes(f.value)} onChange={() => toggleRcri(f.value)} className="rounded text-red-600" />
                    <span className="text-sm">{f.label}</span>
                  </label>
                ))}</div>
              </div>
              {/* Functional capacity */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Activity size={18} className="text-green-500" /> Functional Capacity (METs)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    METs: {funcCap.mets}
                    <span className={`ml-2 text-xs ${funcCap.mets >= 10 ? 'text-emerald-600' : funcCap.mets >= 4 ? 'text-sky-600' : 'text-red-600'}`}>
                      ({funcCap.mets >= 10 ? 'Excellent' : funcCap.mets >= 7 ? 'Good' : funcCap.mets >= 4 ? 'Moderate' : 'Poor'})
                    </span>
                  </label>
                  <input type="range" min={1} max={13} value={funcCap.mets} onChange={e => setFuncCap(p => ({ ...p, mets: +e.target.value }))} className="w-full" title="Metabolic equivalents (METs)" />
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={funcCap.canClimbStairs} onChange={e => setFuncCap(p => ({ ...p, canClimbStairs: e.target.checked }))} className="rounded text-green-600" />
                      Climb 2 flights
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={funcCap.canWalkTwoBlocks} onChange={e => setFuncCap(p => ({ ...p, canWalkTwoBlocks: e.target.checked }))} className="rounded text-green-600" />
                      Walk 2 blocks
                    </label>
                  </div>
                </div>
              </div>
              {/* Caprini VTE */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield size={18} className="text-indigo-500" /> Caprini VTE Risk
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${capriniRisk.color}`}>Score: {capriniScore} · {capriniRisk.level}</span>
                </h3>
                <p className="text-xs text-gray-500 mb-3">Prophylaxis: {capriniRisk.prophylaxis}</p>
                {Object.entries(capriniGroups).map(([g, factors]) => (
                  <div key={g} className="mb-3">
                    <p className="text-sm font-medium text-gray-600 mb-1 capitalize">{g} ({factors[0]?.pts}pt)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {factors.map(f => (
                        <label key={f.label} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm">
                          <input type="checkbox" checked={selectedCaprini.includes(f.label)} onChange={() => toggleCaprini(f.label)} className="rounded text-indigo-600" />{f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Bleeding / Anticoagulants */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> Anticoagulant Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50"><th className="text-left p-2">Drug</th><th className="text-left p-2">Hold</th><th className="text-left p-2">Bridging</th><th className="text-center p-2">On?</th></tr></thead>
                    <tbody>{anticoagulants.map(m => (
                      <tr key={m.drug} className="border-t border-gray-100">
                        <td className="p-2 font-medium">{m.drug}</td><td className="p-2 text-gray-600">{m.hold}</td><td className="p-2 text-gray-600">{m.bridging}</td>
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={bleedingMeds.includes(m.drug)} title={`Patient on ${m.drug}`}
                            onChange={() => setBleedingMeds(p => p.includes(m.drug) ? p.filter(x => x !== m.drug) : [...p, m.drug])} className="rounded text-red-600" />
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {bleedingMeds.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} />Patient on: {bleedingMeds.join(', ')}</div>
                )}
              </div>
              {/* Checklist */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><ClipboardCheck size={18} className="text-green-500" /> Pre-op Checklist</h3>
                {[
                  { field: 'consentSigned' as const, label: 'Informed Consent Signed', sub: 'Patient counseled and signed' },
                  { field: 'bloodTyped' as const, label: 'Blood Group & Crossmatch', sub: 'Completed' },
                  { field: 'npoStatus' as const, label: 'NPO Status Confirmed', sub: 'Fasting verified' },
                ].map(item => (
                  <label key={item.field} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer mb-2">
                    <input type="checkbox" {...register(item.field)} className="rounded text-green-600" />
                    <div><span className="font-medium">{item.label}</span><p className="text-xs text-gray-500">{item.sub}</p></div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: INVESTIGATIONS ────────────────────── */}
          {activeTab === 'investigations' && (
            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Beaker size={18} className="text-teal-500" /> Required ({requiredInvs.length})</h3>
                  <button onClick={autoImport} className="btn btn-sm bg-teal-50 text-teal-700 hover:bg-teal-100"><RefreshCw size={14} /> Auto-Import</button>
                </div>
                <div className="space-y-2">
                  {requiredInvs.map(inv => {
                    const info = INVESTIGATION_INFO[inv.type];
                    return (
                      <div key={inv.type} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${inv.requirement === 'mandatory' ? 'bg-red-100 text-red-700' : inv.requirement === 'recommended' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{inv.requirement}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{info?.name || inv.type}</p>
                          <p className="text-xs text-gray-500 truncate">{inv.rationale}</p>
                        </div>
                        <input type="text" placeholder="Result..." title={`Result for ${info?.name || inv.type}`}
                          value={invValues[inv.type] || ''} onChange={e => setInvValues(p => ({ ...p, [inv.type]: e.target.value }))}
                          className="w-32 sm:w-40 px-2 py-1 text-sm border border-gray-300 rounded" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Calculator size={18} className="text-blue-500" /> Manual Entry</h3>
                {Object.entries(invSections).map(([section, tests]) => (
                  <div key={section} className="mb-4">
                    <button className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                      onClick={() => setOpenInvSection(p => p === section ? null : section)}>
                      <span className="font-medium capitalize text-sm">{section}</span>
                      {openInvSection === section ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {openInvSection === section && (
                      <div className="mt-2 space-y-2">
                        {tests.map(t => {
                          const norm = patient?.gender === 'female' ? t.normalF : t.normalM;
                          const k = t.name.toLowerCase().replace(/[\s/]+/g, '_');
                          return (
                            <div key={t.name} className="flex items-center gap-3 p-2 border-b border-gray-100 last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{t.name}</p>
                                <p className="text-xs text-gray-400">Normal: {norm} {t.unit}</p>
                              </div>
                              <input type="text" placeholder={t.unit || 'Result'} title={`Enter ${t.name}`}
                                value={invValues[k] || ''} onChange={e => setInvValues(p => ({ ...p, [k]: e.target.value }))}
                                className="w-28 px-2 py-1 text-sm border border-gray-300 rounded" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 5: TEAM ──────────────────────────────── */}
          {activeTab === 'team' && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users size={18} className="text-purple-500" /> Surgical Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Surgeon</label>
                  <input type="text" readOnly value={fullName()} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="Lead surgeon" />
                </div>
                {[
                  { field: 'assistant' as const, label: 'Assistant Surgeon', roles: ['surgeon', 'doctor'] },
                  { field: 'anaesthetist' as const, label: 'Anaesthetist', roles: ['anaesthetist'] },
                  { field: 'scrubNurse' as const, label: 'Scrub Nurse', roles: ['nurse'] },
                  { field: 'circulatingNurse' as const, label: 'Circulating Nurse', roles: ['nurse'] },
                ].map(({ field, label, roles }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <select {...register(field)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" title={label}>
                      <option value="">Select...</option>
                      {dbUsers?.filter(u => roles.includes(u.role) || (u.specialization?.toLowerCase().includes('anaesth') && roles.includes('anaesthetist'))).map(u => (
                        <option key={u.id} value={`${u.firstName} ${u.lastName}`}>{u.firstName} {u.lastName} ({u.specialization || u.role})</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 6: FEE ESTIMATE ──────────────────────── */}
          {activeTab === 'estimate' && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><DollarSign size={18} className="text-green-500" /> Surgical Fee Estimate</h3>
              {!selectedProcedure ? (
                <div className="text-center py-8 text-gray-500"><Calculator size={40} className="mx-auto mb-3 opacity-50" /><p>Select a procedure first.</p></div>
              ) : feeEstimate ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-green-900">{selectedProcedure.name}</p>
                    <p className="text-green-600 text-sm">{selectedProcedure.category} · {selectedProcedure.complexityLabel}</p>
                  </div>
                  {[
                    { label: 'Surgeon Fee', val: feeEstimate.surgeonFee },
                    { label: 'Anaesthesia Fee', val: feeEstimate.anaesthesiaFee },
                    { label: 'Theatre Consumables', val: feeEstimate.theatreConsumables },
                    { label: 'Post-Op Medications', val: feeEstimate.postOpMedications },
                    ...(includeHistology ? [{ label: 'Histology', val: feeEstimate.histologyFee }] : []),
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center p-2 border-b border-gray-100">
                      <span className="text-gray-600">{r.label}</span><span className="font-medium">{formatNaira(r.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg font-bold text-lg">
                    <span className="text-green-800">Total Estimate</span><span className="text-green-700">{formatNaira(feeEstimate.totalEstimate)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={includeHistology} onChange={e => setIncludeHistology(e.target.checked)} className="rounded text-green-600" />Include Histology
                    </label>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Custom Surgeon Fee</label>
                      <input type="number" value={customSurgeonFee ?? ''} onChange={e => setCustomSurgeonFee(e.target.value ? +e.target.value : null)}
                        placeholder="Override..." className="w-full px-2 py-1 text-sm border border-gray-300 rounded" title="Custom surgeon fee" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 italic">{feeEstimate.disclaimer}</p>
                </div>
              ) : <p className="text-gray-500 text-sm">Calculating...</p>}
            </div>
          )}

          {/* ── TAB 7: SUMMARY & DOCS ────────────────────── */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Surgical Readiness</h3>
                <div className="mb-4">
                  <div className="flex justify-between mb-1"><span className="text-sm text-gray-600">Overall</span><span className="text-sm font-bold">{readiness.score}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${readiness.status === 'ready' ? 'bg-emerald-500' : readiness.status === 'needs_optimization' ? 'bg-amber-500' : readiness.status === 'not_ready' ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${readiness.score}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { ok: watch('consentSigned'), label: 'Consent' },
                    { ok: watch('bloodTyped'), label: 'Blood Typed' },
                    { ok: watch('npoStatus'), label: 'NPO' },
                    { ok: readiness.mandMet, label: 'Investigations' },
                    { ok: !!watch('anaesthetist'), label: 'Anaesthetist' },
                    { ok: comorbidities.length > 0, label: 'Risk Assessed' },
                  ].map(b => (
                    <div key={b.label} className="flex items-center gap-1.5 text-sm">
                      {b.ok ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-400" />}{b.label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">ASA</p>
                    <p className="text-xl font-bold">ASA {asaDescriptions.find(a => a.score === watch('asaScore'))?.class || 'I'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">Caprini</p>
                    <p className="text-xl font-bold">{capriniScore}</p><p className="text-xs">{capriniRisk.level}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">RCRI</p>
                    <p className={`text-xl font-bold ${rcriRisk.color}`}>{rcriScore}/6</p><p className="text-xs">{rcriRisk.level}</p>
                  </div>
                </div>
                {readiness.recs.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-1"><AlertTriangle size={14} /> Action Required</h4>
                    <ul className="space-y-1 text-sm text-amber-700">{readiness.recs.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                  </div>
                )}
              </div>
              {/* Workflow links */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><ArrowRight size={18} className="text-purple-500" /> Workflow</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { to: '/surgery', icon: Eye, color: 'text-gray-500', label: 'Surgery Schedule', sub: 'View all surgeries' },
                    { to: '/surgery/preoperative', icon: Stethoscope, color: 'text-blue-500', label: 'Anaesthetist Review', sub: 'Pre-anaesthetic wizard' },
                    { to: '/post-op-care', icon: Heart, color: 'text-red-500', label: 'Post-Op Care', sub: 'Monitoring & plans' },
                    { to: '/surgery/post-op-notes', icon: FileText, color: 'text-green-500', label: 'Post-Op Notes', sub: 'Documentation' },
                  ].map(lnk => (
                    <Link key={lnk.to} to={lnk.to} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <lnk.icon size={20} className={lnk.color} />
                      <div><p className="font-medium text-sm">{lnk.label}</p><p className="text-xs text-gray-500">{lnk.sub}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
              {/* PDF generation */}
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Download size={18} className="text-blue-500" /> Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { type: 'assessment' as const, icon: FileText, color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', label: 'Preoperative Assessment' },
                    { type: 'preop' as const, icon: BookOpen, color: 'bg-sky-50 text-sky-700 hover:bg-sky-100', label: 'Pre-Op Instructions' },
                    { type: 'consent' as const, icon: ClipboardCheck, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100', label: 'Consent Form' },
                    { type: 'fee' as const, icon: DollarSign, color: 'bg-green-50 text-green-700 hover:bg-green-100', label: 'Fee Estimate' },
                    { type: 'counseling' as const, icon: BookOpen, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100', label: 'Patient Counseling' },
                    { type: 'postop' as const, icon: FileText, color: 'bg-rose-50 text-rose-700 hover:bg-rose-100', label: 'Post-Op Instructions' },
                  ].map(d => (
                    <button key={d.type} onClick={() => genPDF(d.type)} className={`btn ${d.color} justify-start gap-2`}><d.icon size={16} />{d.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center justify-between z-40">
        <button onClick={goPrev} disabled={tabIdx === 0} className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40">
          <ArrowLeft size={16} /> Previous
        </button>
        <span className="text-sm text-gray-500">Step {tabIdx + 1} of {TABS.length}</span>
        {tabIdx === TABS.length - 1 ? (
          <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn btn-sm btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Schedule'}</button>
        ) : (
          <button onClick={goNext} className="btn btn-sm btn-primary">Next <ArrowRight size={16} /></button>
        )}
      </div>
    </div>
  );
}
