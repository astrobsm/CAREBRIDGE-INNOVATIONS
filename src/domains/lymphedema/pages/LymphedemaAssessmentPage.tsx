// ============================================================
// LYMPHEDEMA ASSESSMENT & MANAGEMENT PAGE
// Main page with tabbed interface for Assessment, CDT, Surgery,
// Timeline, and Monitoring
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import {
  Activity,
  Clipboard,
  Scissors,
  Clock,
  BarChart3,
  ChevronLeft,
  ArrowRight,
  Ruler,
  Save,
  FileText,
  Droplets,
  AlertTriangle,
  Heart,
} from 'lucide-react';

import {
  determineISLStage,
  determineCampisiStage,
  calculateLimbVolume,
  calculateSeverityScore,
  calculateFunctionalImpactScore,
  calculateQualityOfLifeScore,
  generateCDTIntensivePlan,
  generateCDTMaintenancePlan,
  generateInfectionControlPlan,
  evaluateDebulkingCandidacy,
  generateSurgicalPlan,
  generateTreatmentTimeline,
  generateMonitoringAlerts,
  UPPER_LIMB_MEASUREMENT_POINTS,
  LOWER_LIMB_MEASUREMENT_POINTS,
} from '../services/lymphedemaService';

import { PatientSelector } from '../../../components/patient';
import CDTProtocolDisplay from '../components/CDTProtocolDisplay';
import SurgicalDebulkingDisplay from '../components/SurgicalDebulkingDisplay';
import TreatmentTimelineDisplay from '../components/TreatmentTimelineDisplay';
import MonitoringDashboard from '../components/MonitoringDashboard';

import type {
  ISLStage,
  CampisiStage,
  LymphedemaSeverityScore,
  LymphedemaTreatmentPlan,
  CDTIntensivePlan,
  CDTMaintenancePlan,
  DebulkingCriteria,
  SurgicalPlan,
  TreatmentTimeline,
  LymphedemaAlert,
  SkinCondition,
  TissueConsistency,
  PittingGrade,
  StemmerSignResult,
  LymphedemaEtiology,
  LymphedemaLimb,
  LimbMeasurement,
  LymphedemaMonitoringRecord,
  InfectionControlPlan,
} from '../types';

// ==================== FORM SCHEMA ====================

const assessmentSchema = z.object({
  // Patient info
  patientId: z.string().min(1, 'Patient is required'),
  
  // Limb selection
  affectedLimb: z.enum([
    'upper_left', 'upper_right', 'lower_left', 'lower_right',
    'upper_bilateral', 'lower_bilateral', 'genital', 'head_neck', 'trunk'
  ] as const),
  
  // Etiology
  etiology: z.enum([
    'primary_congenital', 'primary_praecox', 'primary_tarda',
    'secondary_surgery', 'secondary_radiation', 'secondary_infection',
    'secondary_trauma', 'secondary_malignancy', 'secondary_cvi',
    'secondary_obesity', 'secondary_immobility', 'mixed'
  ] as const),
  
  // Clinical findings
  pittingGrade: z.number().min(0).max(4),
  tissueConsistency: z.enum(['normal', 'soft_pitting', 'firm_non_pitting', 'fibrotic', 'woody_hard', 'mixed'] as const),
  stemmerSign: z.enum(['positive', 'equivocal', 'negative', 'not_tested'] as const),
  limbElevationResponse: z.enum(['reduces_significantly', 'reduces_partially', 'no_change'] as const),
  
  // Skin conditions
  skinConditions: z.array(z.string()),
  
  // Infection
  episodesOfCellulitisPerYear: z.number().min(0),
  hasActiveInfection: z.boolean(),
  
  // Functional
  rangeOfMotion: z.number().min(0).max(4),
  gripOrAmbulation: z.number().min(0).max(4),
  adl: z.number().min(0).max(4),
  occupation: z.number().min(0).max(4),
  
  // QoL
  qolAppearance: z.number().min(0).max(4),
  qolSymptoms: z.number().min(0).max(4),
  qolEmotions: z.number().min(0).max(4),
  qolFunction: z.number().min(0).max(4),
  qolOverall: z.number().min(0).max(10),
  
  // Patient details
  bmi: z.number().min(10).max(80),
  
  // CDT history
  previousCDTMonths: z.number().min(0),
  previousCDTVolumeReductionPercent: z.number().min(0).max(100),
  
  // Patient motivation
  patientMotivated: z.boolean(),
  psychosocialImpact: z.string(),
  
  // Comorbidities
  comorbidities: z.array(z.string()),
  
  // Notes
  clinicalNotes: z.string().optional(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

// ==================== COMPONENT ====================

type TabId = 'assessment' | 'cdt' | 'surgery' | 'timeline' | 'monitoring';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'assessment', label: 'Assessment', icon: Clipboard },
  { id: 'cdt', label: 'CDT Protocol', icon: Droplets },
  { id: 'surgery', label: 'Surgical Evaluation', icon: Scissors },
  { id: 'timeline', label: 'Treatment Timeline', icon: Clock },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 },
];

const SKIN_CONDITION_OPTIONS: { value: SkinCondition; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'dry_hyperkeratotic', label: 'Dry / Hyperkeratotic' },
  { value: 'hyperkeratotic', label: 'Hyperkeratotic (thickened)' },
  { value: 'papillomatosis', label: 'Papillomatosis' },
  { value: 'lymphorrhea', label: 'Lymphorrhea (weeping fluid)' },
  { value: 'cellulitis_active', label: 'Active Cellulitis' },
  { value: 'cellulitis_history', label: 'History of Cellulitis' },
  { value: 'fungal_infection', label: 'Fungal Infection' },
  { value: 'ulceration', label: 'Ulceration' },
  { value: 'elephantiasis_verrucosa', label: 'Elephantiasis Verrucosa' },
  { value: 'lymphangiosarcoma_suspected', label: 'Lymphangiosarcoma Suspected' },
];

export default function LymphedemaAssessmentPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabId>('assessment');
  const [cdtPhaseDisplay, setCdtPhaseDisplay] = useState<'intensive' | 'maintenance'>('intensive');
  
  // Assessment results
  const [islStage, setIslStage] = useState<ISLStage | null>(null);
  const [campisiStage, setCampisiStage] = useState<CampisiStage | null>(null);
  const [severityScore, setSeverityScore] = useState<LymphedemaSeverityScore | null>(null);
  const [cdtIntensivePlan, setCdtIntensivePlan] = useState<CDTIntensivePlan | null>(null);
  const [cdtMaintenancePlan, setCdtMaintenancePlan] = useState<CDTMaintenancePlan | null>(null);
  const [debulkingCriteria, setDebulkingCriteria] = useState<DebulkingCriteria | null>(null);
  const [surgicalPlan, setSurgicalPlan] = useState<SurgicalPlan | null>(null);
  const [infectionPlan, setInfectionPlan] = useState<InfectionControlPlan | null>(null);
  const [treatmentTimeline, setTreatmentTimeline] = useState<TreatmentTimeline | null>(null);
  const [volumeExcessPercent, setVolumeExcessPercent] = useState(0);
  
  // Measurement tracking
  const [affectedMeasurements, setAffectedMeasurements] = useState<LimbMeasurement[]>([]);
  const [contralateralMeasurements, setContralateralMeasurements] = useState<LimbMeasurement[]>([]);
  
  // Monitoring records (demo data placeholder)
  const [monitoringRecords] = useState<LymphedemaMonitoringRecord[]>([]);
  const [monitoringAlerts, setMonitoringAlerts] = useState<LymphedemaAlert[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      patientId: patientId || '',
      affectedLimb: 'lower_left',
      etiology: 'secondary_surgery',
      pittingGrade: 0,
      tissueConsistency: 'soft_pitting',
      stemmerSign: 'not_tested',
      limbElevationResponse: 'reduces_partially',
      skinConditions: [],
      episodesOfCellulitisPerYear: 0,
      hasActiveInfection: false,
      rangeOfMotion: 0,
      gripOrAmbulation: 0,
      adl: 0,
      occupation: 0,
      qolAppearance: 0,
      qolSymptoms: 0,
      qolEmotions: 0,
      qolFunction: 0,
      qolOverall: 5,
      bmi: 25,
      previousCDTMonths: 0,
      previousCDTVolumeReductionPercent: 0,
      patientMotivated: true,
      psychosocialImpact: '',
      comorbidities: [],
      clinicalNotes: '',
    },
  });

  const watchedLimb = watch('affectedLimb');
  const isUpperLimb = watchedLimb?.includes('upper');
  const measurementPoints = isUpperLimb ? UPPER_LIMB_MEASUREMENT_POINTS : LOWER_LIMB_MEASUREMENT_POINTS;

  const updateMeasurement = useCallback((index: number, value: number, isContralateral: boolean) => {
    const setter = isContralateral ? setContralateralMeasurements : setAffectedMeasurements;
    setter(prev => {
      const updated = [...prev];
      const point = measurementPoints[index];
      updated[index] = {
        locationName: point.locationName,
        circumferenceCm: value,
        distanceFromLandmarkCm: point.distanceFromLandmarkCm,
        landmark: point.landmark,
        measuredAt: new Date(),
      };
      return updated;
    });
  }, [measurementPoints]);

  const onSubmit = useCallback(async (data: AssessmentFormData) => {
    try {
      // Calculate volume
      const validAffected = affectedMeasurements.filter(m => m && m.circumferenceCm > 0);
      const validContra = contralateralMeasurements.filter(m => m && m.circumferenceCm > 0);
      
      let volExcess = 0;
      let volExcessMl = 0;
      
      if (validAffected.length >= 2) {
        const volumeCalc = calculateLimbVolume(validAffected, validContra.length >= 2 ? validContra : undefined);
        volExcess = volumeCalc.volumeDifferencePercent;
        volExcessMl = volumeCalc.volumeDifferenceMl;
        setVolumeExcessPercent(volExcess);
      }

      // ISL Stage
      const isl = determineISLStage(
        data.pittingGrade as PittingGrade,
        data.tissueConsistency as TissueConsistency,
        data.limbElevationResponse,
        data.skinConditions as SkinCondition[],
        volExcess,
        data.stemmerSign as StemmerSignResult
      );
      setIslStage(isl);

      // Campisi Stage
      const campisi = determineCampisiStage(
        isl,
        volExcess,
        data.limbElevationResponse,
        data.episodesOfCellulitisPerYear,
        data.tissueConsistency as TissueConsistency,
        data.skinConditions as SkinCondition[],
        data.rangeOfMotion
      );
      setCampisiStage(campisi);

      // Severity Score
      const severity = calculateSeverityScore(
        volExcess,
        data.skinConditions as SkinCondition[],
        data.tissueConsistency as TissueConsistency,
        data.episodesOfCellulitisPerYear,
        Math.max(data.rangeOfMotion, data.gripOrAmbulation, data.adl, data.occupation)
      );
      setSeverityScore(severity);

      // Functional & QoL
      calculateFunctionalImpactScore(
        data.rangeOfMotion,
        data.gripOrAmbulation,
        data.adl,
        data.occupation
      );
      calculateQualityOfLifeScore(
        data.qolAppearance,
        data.qolSymptoms,
        data.qolEmotions,
        data.qolFunction,
        data.qolOverall
      );

      // Infection control
      const infection = generateInfectionControlPlan(
        data.skinConditions as SkinCondition[],
        data.episodesOfCellulitisPerYear,
        data.etiology as LymphedemaEtiology
      );
      setInfectionPlan(infection);

      // CDT Intensive Plan
      const intensive = generateCDTIntensivePlan({
        islStage: isl,
        affectedLimb: data.affectedLimb as LymphedemaLimb,
        volumeExcessPercent: volExcess,
        skinConditions: data.skinConditions as SkinCondition[],
        tissueConsistency: data.tissueConsistency as TissueConsistency,
        severity: severity.severity,
        comorbidities: data.comorbidities,
      });
      setCdtIntensivePlan(intensive);

      // CDT Maintenance Plan
      const maintenance = generateCDTMaintenancePlan({
        affectedLimb: data.affectedLimb as LymphedemaLimb,
        severity: severity.severity,
        islStage: isl,
        bmi: data.bmi,
      });
      setCdtMaintenancePlan(maintenance);

      // Surgical candidacy
      const debulking = evaluateDebulkingCandidacy({
        islStage: isl,
        tissueConsistency: data.tissueConsistency as TissueConsistency,
        volumeExcessPercent: volExcess,
        volumeExcessMl: volExcessMl,
        episodesOfCellulitisPerYear: data.episodesOfCellulitisPerYear,
        functionalImpairment: Math.max(data.rangeOfMotion, data.gripOrAmbulation, data.adl, data.occupation),
        psychosocialImpact: data.psychosocialImpact || 'Not assessed',
        bmi: data.bmi,
        hasActiveInfection: data.hasActiveInfection,
        cdtMonths: data.previousCDTMonths,
        cdtVolumeReductionPercent: data.previousCDTVolumeReductionPercent,
        patientMotivated: data.patientMotivated,
      });
      setDebulkingCriteria(debulking);

      // Generate surgical plan if candidate
      if (debulking.meetsThreshold) {
        const plan = generateSurgicalPlan(
          'debulking_suction_assisted',
          {
            affectedLimb: data.affectedLimb as LymphedemaLimb,
            islStage: isl,
            volumeExcessMl: volExcessMl,
            volumeExcessPercent: volExcess,
            skinConditions: data.skinConditions as SkinCondition[],
            severity: severity.severity,
          },
          'To be assigned'
        );
        setSurgicalPlan(plan);
      } else {
        setSurgicalPlan(null);
      }

      // Treatment timeline
      const timeline = generateTreatmentTimeline({
        islStage: isl,
        severity: severity.severity,
        hasActiveInfection: data.hasActiveInfection,
        skinConditions: data.skinConditions as SkinCondition[],
        cdtIntensiveWeeks: intensive.durationWeeks,
        isSurgicalCandidate: debulking.meetsThreshold,
        surgicalProcedure: debulking.meetsThreshold ? 'debulking_suction_assisted' : undefined,
      });
      setTreatmentTimeline(timeline);

      toast.success('Assessment completed — all protocols generated');
    } catch (error) {
      console.error('Assessment error:', error);
      toast.error('Error processing assessment. Check inputs.');
    }
  }, [affectedMeasurements, contralateralMeasurements]);

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Lymphedema Assessment & Management
              </h1>
              <p className="text-xs text-gray-500">ISL/Campisi Staging • CDT Protocol • Surgical Evaluation • Monitoring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ==================== TAB: ASSESSMENT ==================== */}
        {activeTab === 'assessment' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Limb & Etiology */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Patient & Limb Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <PatientSelector
                    value={watch('patientId')}
                    onChange={(id) => setValue('patientId', id || '', { shouldValidate: true })}
                    label="Select Patient"
                    required
                    error={errors.patientId?.message}
                    showAddNew
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affected Limb</label>
                  <select {...register('affectedLimb')} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option value="upper_left">Upper Left</option>
                    <option value="upper_right">Upper Right</option>
                    <option value="lower_left">Lower Left</option>
                    <option value="lower_right">Lower Right</option>
                    <option value="upper_bilateral">Upper Bilateral</option>
                    <option value="lower_bilateral">Lower Bilateral</option>
                    <option value="genital">Genital</option>
                    <option value="head_neck">Head & Neck</option>
                    <option value="trunk">Trunk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etiology</label>
                  <select {...register('etiology')} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option value="primary_congenital">Primary — Congenital</option>
                    <option value="primary_praecox">Primary — Praecox</option>
                    <option value="primary_tarda">Primary — Tarda</option>
                    <option value="secondary_surgery">Secondary — Post-surgical</option>
                    <option value="secondary_radiation">Secondary — Post-radiation</option>
                    <option value="secondary_infection">Secondary — Infection/Filariasis</option>
                    <option value="secondary_trauma">Secondary — Trauma</option>
                    <option value="secondary_malignancy">Secondary — Malignancy</option>
                    <option value="secondary_cvi">Secondary — Chronic Venous Insufficiency</option>
                    <option value="secondary_obesity">Secondary — Obesity</option>
                    <option value="secondary_immobility">Secondary — Immobility</option>
                    <option value="mixed">Mixed Etiology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
                  <input type="number" step="0.1" {...register('bmi', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* Clinical Examination */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Clinical Examination
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pitting Grade (0-4)</label>
                  <select {...register('pittingGrade', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option value={0}>0 — No pitting</option>
                    <option value={1}>1 — Slight (2mm, rebounds quickly)</option>
                    <option value={2}>2 — Moderate (4mm, 15s rebound)</option>
                    <option value={3}>3 — Deep (6mm, 30s rebound)</option>
                    <option value={4}>4 — Very deep (8mm, &gt;30s rebound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tissue Consistency</label>
                  <select {...register('tissueConsistency')} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option value="normal">Normal</option>
                    <option value="soft_pitting">Soft / Pitting</option>
                    <option value="firm_non_pitting">Firm / Non-pitting</option>
                    <option value="fibrotic">Fibrotic</option>
                    <option value="woody_hard">Woody / Hard</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stemmer Sign</label>
                  <select {...register('stemmerSign')} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option value="positive">Positive (unable to pinch skin fold)</option>
                    <option value="equivocal">Equivocal</option>
                    <option value="negative">Negative (skin fold can be pinched)</option>
                    <option value="not_tested">Not Tested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limb Elevation Response</label>
                  <select {...register('limbElevationResponse')} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                    <option value="reduces_significantly">Reduces significantly (returns to near-normal)</option>
                    <option value="reduces_partially">Reduces partially</option>
                    <option value="no_change">No change with elevation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Episodes of Cellulitis / Year</label>
                  <input type="number" {...register('episodesOfCellulitisPerYear', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" min={0} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('hasActiveInfection')} className="w-4 h-4 text-primary rounded" />
                  <label className="text-sm font-medium text-gray-700">Active Infection (cellulitis currently present)</label>
                </div>
              </div>

              {/* Skin Conditions */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Skin Conditions (select all)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SKIN_CONDITION_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        value={opt.value}
                        {...register('skinConditions')}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Measurements */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" />
                Circumferential Measurements (cm)
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Measure at standardised points. Enter both affected and contralateral limb for accurate volume comparison.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 text-xs font-semibold text-gray-500">Location</th>
                      <th className="text-right p-2 text-xs font-semibold text-gray-500">Affected (cm)</th>
                      <th className="text-right p-2 text-xs font-semibold text-gray-500">Contralateral (cm)</th>
                      <th className="text-right p-2 text-xs font-semibold text-gray-500">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurementPoints.map((point, i) => {
                      const affected = affectedMeasurements[i]?.circumferenceCm || 0;
                      const contra = contralateralMeasurements[i]?.circumferenceCm || 0;
                      const diff = affected && contra ? (affected - contra).toFixed(1) : '—';
                      return (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="p-2 text-gray-700">{point.locationName}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-20 p-1 border border-gray-300 rounded text-sm text-right"
                              onChange={(e) => updateMeasurement(i, parseFloat(e.target.value) || 0, false)}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-20 p-1 border border-gray-300 rounded text-sm text-right"
                              onChange={(e) => updateMeasurement(i, parseFloat(e.target.value) || 0, true)}
                            />
                          </td>
                          <td className={`p-2 text-right font-medium ${parseFloat(diff) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Functional Impact */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Functional Impact Assessment (0-4 each)</h2>
              <p className="text-xs text-gray-500 mb-4">0 = Normal | 1 = Mild | 2 = Moderate | 3 = Severe | 4 = Unable</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { field: 'rangeOfMotion' as const, label: 'Range of Motion' },
                  { field: 'gripOrAmbulation' as const, label: isUpperLimb ? 'Grip Strength' : 'Ambulation' },
                  { field: 'adl' as const, label: 'Activities of Daily Living' },
                  { field: 'occupation' as const, label: 'Occupational Impact' },
                ].map(item => (
                  <div key={item.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                    <select {...register(item.field, { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                      <option value={0}>0 — Normal</option>
                      <option value={1}>1 — Mild limitation</option>
                      <option value={2}>2 — Moderate limitation</option>
                      <option value={3}>3 — Severe limitation</option>
                      <option value={4}>4 — Unable / Complete limitation</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality of Life */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Quality of Life (LYMQOL-adapted)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { field: 'qolAppearance' as const, label: 'Appearance (0-4)' },
                  { field: 'qolSymptoms' as const, label: 'Symptoms (0-4)' },
                  { field: 'qolEmotions' as const, label: 'Emotions (0-4)' },
                  { field: 'qolFunction' as const, label: 'Function (0-4)' },
                ].map(item => (
                  <div key={item.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
                    <input type="number" min={0} max={4} {...register(item.field, { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overall QoL (VAS 0-10)</label>
                  <input type="number" min={0} max={10} {...register('qolOverall', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* CDT History & Surgical Readiness */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Treatment History & Surgical Readiness</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous CDT Duration (months)</label>
                  <input type="number" min={0} {...register('previousCDTMonths', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CDT Volume Reduction (%)</label>
                  <input type="number" min={0} max={100} {...register('previousCDTVolumeReductionPercent', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" {...register('patientMotivated')} className="w-4 h-4 text-primary rounded" />
                  <label className="text-sm font-medium text-gray-700">Patient motivated for lifelong compression</label>
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Psychosocial Impact</label>
                  <textarea {...register('psychosocialImpact')} rows={2} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Describe psychosocial impact..." />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
                  <textarea {...register('clinicalNotes')} rows={3} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Additional clinical notes..." />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Complete Assessment & Generate Protocols
              </button>
            </div>

            {/* Results Summary */}
            {islStage !== null && severityScore && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Assessment Results</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-xs font-semibold text-blue-600">ISL Stage</span>
                    <p className="text-2xl font-bold text-blue-800">Stage {islStage}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <span className="text-xs font-semibold text-indigo-600">Campisi Stage</span>
                    <p className="text-2xl font-bold text-indigo-800">{campisiStage}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    severityScore.severity === 'minimal' ? 'bg-green-50 border-green-200' :
                    severityScore.severity === 'mild' ? 'bg-yellow-50 border-yellow-200' :
                    severityScore.severity === 'moderate' ? 'bg-orange-50 border-orange-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <span className="text-xs font-semibold text-gray-600">Severity</span>
                    <p className="text-2xl font-bold text-gray-800">{severityScore.totalScore}/20</p>
                    <p className="text-xs text-gray-600 capitalize">{severityScore.severity}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-xs font-semibold text-purple-600">Volume Excess</span>
                    <p className="text-2xl font-bold text-purple-800">{volumeExcessPercent.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{severityScore.interpretation}</p>
                </div>
                {infectionPlan && infectionPlan.hasActiveInfection && (
                  <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-700">Active Infection — Treat Before CDT</span>
                    </div>
                    <p className="text-sm text-red-600">{infectionPlan.antibioticRegimen}</p>
                    {infectionPlan.notes && <p className="text-xs text-red-500 mt-1">{infectionPlan.notes}</p>}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cdt')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors"
                  >
                    View CDT Protocol <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* ==================== TAB: CDT PROTOCOL ==================== */}
        {activeTab === 'cdt' && cdtIntensivePlan && cdtMaintenancePlan && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setCdtPhaseDisplay('intensive')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  cdtPhaseDisplay === 'intensive' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Phase 1: Intensive
              </button>
              <button
                onClick={() => setCdtPhaseDisplay('maintenance')}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  cdtPhaseDisplay === 'maintenance' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Phase 2: Maintenance
              </button>
            </div>
            <CDTProtocolDisplay
              intensivePlan={cdtIntensivePlan}
              maintenancePlan={cdtMaintenancePlan}
              activePhase={cdtPhaseDisplay}
            />
          </div>
        )}
        {activeTab === 'cdt' && !cdtIntensivePlan && (
          <div className="text-center py-12 text-gray-500">
            <Droplets className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Complete the Assessment tab first to generate CDT protocol</p>
          </div>
        )}

        {/* ==================== TAB: SURGICAL EVALUATION ==================== */}
        {activeTab === 'surgery' && debulkingCriteria && (
          <SurgicalDebulkingDisplay criteria={debulkingCriteria} surgicalPlan={surgicalPlan || undefined} />
        )}
        {activeTab === 'surgery' && !debulkingCriteria && (
          <div className="text-center py-12 text-gray-500">
            <Scissors className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Complete the Assessment tab first to evaluate surgical candidacy</p>
          </div>
        )}

        {/* ==================== TAB: TIMELINE ==================== */}
        {activeTab === 'timeline' && treatmentTimeline && (
          <TreatmentTimelineDisplay timeline={treatmentTimeline} />
        )}
        {activeTab === 'timeline' && !treatmentTimeline && (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Complete the Assessment tab first to generate treatment timeline</p>
          </div>
        )}

        {/* ==================== TAB: MONITORING ==================== */}
        {activeTab === 'monitoring' && (
          <MonitoringDashboard
            records={monitoringRecords}
            alerts={monitoringAlerts}
            baselineVolumeMl={undefined}
          />
        )}
      </div>
    </div>
  );
}
