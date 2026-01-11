// Enhanced Burns Assessment Page with WHO/ISBI Protocol Integration
// Comprehensive burn care with Lund-Browder, fluid resuscitation, monitoring, alerts

import { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Flame,
  Calculator,
  Droplets,
  User,
  X,
  Save,
  Utensils,
  Activity,
  ChevronRight,
  AlertTriangle,
  Info,
  FileText,
  Heart,
  Layers, // Using Layers instead of Bandage
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import type { BurnAssessment, BurnDepth, BurnArea } from '../../../types';
import { generateBurnsPDFFromEntity } from '../../../utils/clinicalPdfGenerators';

// Import new WHO/ISBI components
import LundBrowderChart from '../components/LundBrowderChart';
import FluidResuscitationDashboard from '../components/FluidResuscitationDashboard';
import VitalsMonitor from '../components/VitalsMonitor';
import BurnAlertsPanel from '../components/BurnAlertsPanel';
import BurnScoreSummary from '../components/BurnScoreSummary';
import BurnWoundAssessment from '../components/BurnWoundAssessment';

// Import scoring services
import {
  calculateTBSALundBrowder,
  calculateBauxScore,
  calculateRevisedBauxScore,
  calculateABSIScore,
  calculateFluidResuscitation,
  calculateBurnNutrition as calculateAdvancedBurnNutrition,
} from '../services/burnScoringService';

// Import types
import type {
  LundBrowderEntry,
  BurnVitalSigns,
  UrineOutput,
  BurnAlert,
  BurnWoundAssessment as BurnWoundAssessmentType,
  EscharotomyRecord,
  GraftingRecord,
  TBSACalculation,
  BauxScore,
  RevisedBauxScore,
  ABSIScore,
  FluidResuscitationPlan,
  HourlyResuscitationEntry,
} from '../types';

const burnSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  burnType: z.enum(['thermal', 'chemical', 'electrical', 'radiation', 'friction']),
  mechanism: z.string().min(1, 'Mechanism is required'),
  timeOfInjury: z.string().min(1, 'Time of injury is required'),
  patientWeight: z.number().min(1, 'Weight is required'),
  patientAge: z.number().min(0, 'Age is required'),
  gender: z.enum(['male', 'female']),
  inhalationInjury: z.boolean(),
  associatedInjuries: z.string().optional(),
  tetanusStatus: z.boolean(),
  priorMedicalHistory: z.string().optional(),
});

type BurnFormData = z.infer<typeof burnSchema>;

// Tabs for comprehensive burn module
type BurnModuleTab = 'assessment' | 'monitoring' | 'fluids' | 'wounds' | 'scores';

const burnDepths: { value: BurnDepth; label: string; description: string; color: string }[] = [
  { value: 'superficial', label: 'Superficial', description: 'Epidermis only, erythema, painful', color: 'bg-red-200 text-red-800' },
  { value: 'superficial_partial', label: 'Superficial Partial', description: 'Epidermis + superficial dermis, blisters, very painful', color: 'bg-orange-200 text-orange-800' },
  { value: 'deep_partial', label: 'Deep Partial', description: 'Epidermis + deep dermis, mottled, less painful', color: 'bg-amber-200 text-amber-800' },
  { value: 'full_thickness', label: 'Full Thickness', description: 'All skin layers, white/charred, insensate', color: 'bg-gray-700 text-white' },
];

export default function EnhancedBurnsAssessmentPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBurn, setSelectedBurn] = useState<BurnAssessment | null>(null);
  const [activeTab, setActiveTab] = useState<BurnModuleTab>('assessment');
  
  // Lund-Browder state
  const [lundBrowderEntries, setLundBrowderEntries] = useState<LundBrowderEntry[]>([]);
  const [patientAge, setPatientAge] = useState(30);
  const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');
  const [patientWeight, setPatientWeight] = useState(70);

  // Monitoring state (would be persisted in real implementation)
  const [vitalsHistory, setVitalsHistory] = useState<BurnVitalSigns[]>([]);
  const [urineOutputs, setUrineOutputs] = useState<UrineOutput[]>([]);
  const [burnAlerts, setBurnAlerts] = useState<BurnAlert[]>([]);
  const [woundAssessments, setWoundAssessments] = useState<BurnWoundAssessmentType[]>([]);
  const [escharotomies, setEscharotomies] = useState<EscharotomyRecord[]>([]);
  const [graftings, setGraftings] = useState<GraftingRecord[]>([]);
  const [fluidAdjustments, setFluidAdjustments] = useState<HourlyResuscitationEntry[]>([]);
  void fluidAdjustments; // Reserved for future use

  const burns = useLiveQuery(() => db.burnAssessments.orderBy('createdAt').reverse().toArray(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BurnFormData>({
    resolver: zodResolver(burnSchema),
    defaultValues: {
      burnType: 'thermal',
      inhalationInjury: false,
      tetanusStatus: false,
      patientAge: 30,
      patientWeight: 70,
      gender: 'male',
    },
  });

  const watchInhalationInjury = watch('inhalationInjury');

  // Calculate TBSA from Lund-Browder entries
  const tbsaCalculation = useMemo<TBSACalculation | null>(() => {
    if (lundBrowderEntries.length === 0) return null;
    // Convert numeric age to age group
    const ageGroup: 'infant' | 'child_1' | 'child_5' | 'child_10' | 'adult' = 
      patientAge < 1 ? 'infant' :
      patientAge < 5 ? 'child_1' :
      patientAge < 10 ? 'child_5' :
      patientAge < 15 ? 'child_10' : 'adult';
    return calculateTBSALundBrowder(lundBrowderEntries, ageGroup);
  }, [lundBrowderEntries, patientAge]);

  // Calculate scores
  const bauxScore = useMemo<BauxScore | null>(() => {
    if (!tbsaCalculation) return null;
    return calculateBauxScore(patientAge, tbsaCalculation.totalTBSA);
  }, [patientAge, tbsaCalculation]);

  const revisedBauxScore = useMemo<RevisedBauxScore | null>(() => {
    if (!tbsaCalculation) return null;
    return calculateRevisedBauxScore(patientAge, tbsaCalculation.totalTBSA, watchInhalationInjury);
  }, [patientAge, tbsaCalculation, watchInhalationInjury]);

  const absiScore = useMemo<ABSIScore | null>(() => {
    if (!tbsaCalculation) return null;
    const hasFullThickness = lundBrowderEntries.some(e => e.depth === 'full_thickness');
    return calculateABSIScore(
      patientAge,
      patientGender,
      tbsaCalculation.totalTBSA,
      watchInhalationInjury,
      hasFullThickness
    );
  }, [patientAge, tbsaCalculation, watchInhalationInjury, lundBrowderEntries, patientGender]);

  // Calculate fluid resuscitation plan
  const fluidPlan = useMemo<FluidResuscitationPlan | null>(() => {
    if (!tbsaCalculation || tbsaCalculation.totalTBSA < 15) return null;
    return calculateFluidResuscitation(
      patientWeight,
      tbsaCalculation.totalTBSA,
      new Date(), // time of injury - would come from form
      'parkland'
    );
  }, [patientWeight, tbsaCalculation]);

  // Nutrition calculation
  const nutritionPlan = useMemo(() => {
    if (!tbsaCalculation) return null;
    return calculateAdvancedBurnNutrition(patientWeight, tbsaCalculation.totalTBSA, patientAge);
  }, [patientWeight, tbsaCalculation, patientAge]);

  // Burn center referral criteria
  const referralCriteria = useMemo(() => {
    if (!tbsaCalculation) return { meetsCriteria: false, reasons: [] as string[] };
    // Simplified criteria check - the full function requires more parameters
    const reasons: string[] = [];
    if (tbsaCalculation.totalTBSA > 10) reasons.push(`TBSA >10% (${tbsaCalculation.totalTBSA}%)`);
    if (patientAge < 10 || patientAge > 50) reasons.push(`Age extremes: ${patientAge} years`);
    if (watchInhalationInjury) reasons.push('Inhalation injury present');
    if (tbsaCalculation.fullThicknessTBSA && tbsaCalculation.fullThicknessTBSA > 0) {
      reasons.push('Full thickness burn present');
    }
    return { meetsCriteria: reasons.length > 0, reasons };
  }, [tbsaCalculation, patientAge, watchInhalationInjury]);

  // Handlers
  const handleLundBrowderChange = useCallback((entries: LundBrowderEntry[]) => {
    setLundBrowderEntries(entries);
  }, []);
  void handleLundBrowderChange; // Reserved for future LundBrowder chart integration

  const handleTBSACalculation = useCallback((_calculation: TBSACalculation) => {
    // The tbsaCalculation is computed from lundBrowderEntries via useMemo,
    // so this callback is just for the chart to signal completion
  }, []);

  const handleAddVitals = useCallback((vitals: Partial<BurnVitalSigns>) => {
    const newVitals: BurnVitalSigns = {
      ...vitals,
      id: uuidv4(),
      burnAssessmentId: selectedBurn?.id || '',
      timestamp: new Date(),
    } as BurnVitalSigns;
    setVitalsHistory(prev => [...prev, newVitals]);
    toast.success('Vitals recorded');
  }, [selectedBurn]);

  const handleAddUrineOutput = useCallback((uo: Partial<UrineOutput>) => {
    const newUO: UrineOutput = {
      ...uo,
      id: uuidv4(),
      burnAssessmentId: selectedBurn?.id || '',
      timestamp: new Date(),
    } as UrineOutput;
    setUrineOutputs(prev => [...prev, newUO]);
    toast.success('Urine output recorded');
  }, [selectedBurn]);

  const handleAlertGenerated = useCallback((alerts: BurnAlert[]) => {
    const newAlerts = alerts.map(a => ({
      ...a,
      id: a.id || uuidv4(),
      burnAssessmentId: selectedBurn?.id || '',
      status: 'active' as const,
      createdAt: new Date(),
    }));
    setBurnAlerts(prev => [...prev, ...newAlerts]);
  }, [selectedBurn]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setBurnAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date(), acknowledgedBy: user?.id || '' }
        : a
    ));
  }, [user]);

  const handleResolveAlert = useCallback((alertId: string, resolution: string) => {
    setBurnAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, status: 'resolved' as const, resolvedAt: new Date(), resolutionNote: resolution }
        : a
    ));
  }, []);

  const handleEscalateAlert = useCallback((alertId: string, escalatedTo: string) => {
    setBurnAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, escalatedTo, acknowledgedAt: new Date() }
        : a
    ));
    toast.success(`Alert escalated to ${escalatedTo}`);
  }, []);

  const handleFluidAdjustment = useCallback((entry: HourlyResuscitationEntry) => {
    setFluidAdjustments(prev => [...prev, entry]);
  }, []);
  void handleFluidAdjustment; // Reserved for FluidResuscitationDashboard callback

  const handleAddWoundAssessment = useCallback((assessment: Partial<BurnWoundAssessmentType>) => {
    const newAssessment: BurnWoundAssessmentType = {
      ...assessment,
      id: uuidv4(),
      burnAssessmentId: selectedBurn?.id || '',
      date: new Date(),
    } as BurnWoundAssessmentType;
    setWoundAssessments(prev => [...prev, newAssessment]);
    toast.success('Wound assessment saved');
  }, [selectedBurn]);

  const handleAddEscharotomy = useCallback((record: Partial<EscharotomyRecord>) => {
    const newRecord: EscharotomyRecord = {
      ...record,
      id: uuidv4(),
      burnAssessmentId: selectedBurn?.id || '',
      date: new Date(),
    } as EscharotomyRecord;
    setEscharotomies(prev => [...prev, newRecord]);
    toast.success('Escharotomy recorded');
  }, [selectedBurn]);

  const handleAddGrafting = useCallback((record: Partial<GraftingRecord>) => {
    const newRecord: GraftingRecord = {
      ...record,
      id: uuidv4(),
      burnAssessmentId: selectedBurn?.id || '',
      date: new Date(),
    } as GraftingRecord;
    setGraftings(prev => [...prev, newRecord]);
    toast.success('Grafting record saved');
  }, [selectedBurn]);

  const onSubmit = async (data: BurnFormData) => {
    if (!user || !tbsaCalculation || tbsaCalculation.totalTBSA === 0) {
      toast.error('Please complete TBSA calculation first');
      return;
    }

    try {
      const affectedAreas: BurnArea[] = lundBrowderEntries.map(entry => ({
        bodyPart: entry.region,
        percentage: entry.percentage ?? 0,
        depth: entry.depth,
      }));

      const burnDepthList: BurnDepth[] = [...new Set(lundBrowderEntries.map(e => e.depth))];

      const assessment: BurnAssessment = {
        id: uuidv4(),
        patientId: data.patientId,
        burnType: data.burnType as 'thermal' | 'chemical' | 'electrical' | 'radiation' | 'friction',
        mechanism: data.mechanism,
        timeOfInjury: new Date(data.timeOfInjury),
        tbsaPercentage: tbsaCalculation.totalTBSA,
        burnDepth: burnDepthList,
        affectedAreas,
        parklandFormula: fluidPlan ? {
          fluidRequirement24h: fluidPlan.totalVolume24h ?? 0,
          firstHalfRate: Math.round((fluidPlan.phase1Volume ?? 0) / 8),
          secondHalfRate: Math.round((fluidPlan.phase2Volume ?? 0) / 16),
        } : {
          fluidRequirement24h: 0,
          firstHalfRate: 0,
          secondHalfRate: 0,
        },
        absiScore: absiScore ? {
          score: absiScore.score ?? 0,
          survivalProbability: absiScore.survivalRate ?? 'Unknown',
          age: data.patientAge,
          gender: data.gender,
          hasInhalationInjury: data.inhalationInjury,
          hasFullThickness: lundBrowderEntries.some(e => e.depth === 'full_thickness'),
          threatLevel: (absiScore.score ?? 0) <= 3 ? 'very_low' : 
                       (absiScore.score ?? 0) <= 5 ? 'moderate' :
                       (absiScore.score ?? 0) <= 7 ? 'moderately_severe' :
                       (absiScore.score ?? 0) <= 9 ? 'severe' : 'very_severe',
        } : undefined,
        inhalationInjury: data.inhalationInjury,
        associatedInjuries: data.associatedInjuries,
        tetanusStatus: data.tetanusStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.burnAssessments.add(assessment);
      syncRecord('burnAssessments', assessment as unknown as Record<string, unknown>);
      toast.success('Burn assessment saved successfully!');
      setShowModal(false);
      setLundBrowderEntries([]);
      reset();
    } catch (error) {
      console.error('Error saving burn assessment:', error);
      toast.error('Failed to save burn assessment');
    }
  };

  // Tab content rendering
  const renderTabContent = () => {
    if (!selectedBurn) return null;
    
    const timeOfInjury = new Date(selectedBurn.timeOfInjury);
    const hoursSinceInjury = differenceInHours(new Date(), timeOfInjury);

    switch (activeTab) {
      case 'assessment':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Summary Cards */}
            <div className="stats-grid">
              <div className={`p-4 rounded-lg ${
                selectedBurn.tbsaPercentage >= 30 ? 'bg-red-100 text-red-800' :
                selectedBurn.tbsaPercentage >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
              }`}>
                <p className="text-sm font-medium opacity-80">TBSA</p>
                <p className="text-3xl font-bold">{selectedBurn.tbsaPercentage}%</p>
              </div>
              {selectedBurn.absiScore && (
                <div className={`p-4 rounded-lg ${
                  selectedBurn.absiScore.score <= 3 ? 'bg-green-100 text-green-800' :
                  selectedBurn.absiScore.score <= 5 ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <p className="text-sm font-medium opacity-80">ABSI</p>
                  <p className="text-3xl font-bold">{selectedBurn.absiScore.score}</p>
                  <p className="text-sm">{selectedBurn.absiScore.survivalProbability}</p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-sky-100 text-sky-800">
                <p className="text-sm font-medium opacity-80">Hours Since Injury</p>
                <p className="text-3xl font-bold">{hoursSinceInjury}</p>
              </div>
              <div className={`p-4 rounded-lg ${hoursSinceInjury <= 8 ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                <p className="text-sm font-medium opacity-80">Resuscitation Phase</p>
                <p className="text-xl font-bold">{hoursSinceInjury <= 8 ? 'Phase 1 (0-8h)' : hoursSinceInjury <= 24 ? 'Phase 2 (8-24h)' : 'Maintenance'}</p>
              </div>
            </div>

            {/* Burn Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info size={16} />
                Burn Information
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium capitalize">{selectedBurn.burnType}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mechanism:</span>
                  <span className="ml-2 font-medium">{selectedBurn.mechanism}</span>
                </div>
                <div>
                  <span className="text-gray-500">Time of Injury:</span>
                  <span className="ml-2 font-medium">{format(timeOfInjury, 'PPp')}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium">{differenceInDays(new Date(), timeOfInjury)} days</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Inhalation Injury:</span>
                  <span className={`ml-2 font-medium ${selectedBurn.inhalationInjury ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedBurn.inhalationInjury ? 'Yes - Monitor Airway' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Affected Areas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Affected Areas</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedBurn.affectedAreas.map((area, idx) => {
                  const depthInfo = burnDepths.find(d => d.value === area.depth);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-medium text-sm">{area.bodyPart}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">{area.percentage}%</span>
                        <span className={`badge text-xs ${depthInfo?.color}`}>{depthInfo?.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fluid Requirements */}
            <div className="bg-sky-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-sky-600" />
                Parkland Formula - Fluid Resuscitation
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-sky-600">
                    {selectedBurn.parklandFormula.fluidRequirement24h.toLocaleString()} mL
                  </p>
                  <p className="text-xs text-gray-500">Total (24 hours)</p>
                </div>
                <div className="p-3 bg-white rounded text-center">
                  <p className="text-xl font-bold text-purple-600">{selectedBurn.parklandFormula.firstHalfRate} mL/hr</p>
                  <p className="text-xs text-gray-500">First 8 hours</p>
                </div>
                <div className="p-3 bg-white rounded text-center">
                  <p className="text-xl font-bold text-blue-600">{selectedBurn.parklandFormula.secondHalfRate} mL/hr</p>
                  <p className="text-xs text-gray-500">Next 16 hours</p>
                </div>
              </div>
            </div>

            {/* Nutrition */}
            {nutritionPlan && (
              <div className="bg-emerald-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  Nutritional Requirements (Curreri Formula)
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-2 bg-white rounded-lg text-center">
                    <p className="text-lg font-bold text-emerald-700">{nutritionPlan.caloricTarget}</p>
                    <p className="text-xs text-gray-500">kcal/day</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg text-center">
                    <p className="text-lg font-bold text-blue-700">{nutritionPlan.proteinTarget}g</p>
                    <p className="text-xs text-gray-500">Protein/day</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg text-center">
                    <p className="text-lg font-bold text-orange-700">{nutritionPlan.vitaminC}mg</p>
                    <p className="text-xs text-gray-500">Vitamin C</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg text-center">
                    <p className="text-lg font-bold text-gray-700">{nutritionPlan.zinc}mg</p>
                    <p className="text-xs text-gray-500">Zinc</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'monitoring':
        return (
          <div className="space-y-4 sm:space-y-6">
            <VitalsMonitor
              burnAssessmentId={selectedBurn.id}
              patientWeight={patientWeight}
              vitalsHistory={vitalsHistory}
              urineOutputs={urineOutputs}
              onAddVitals={handleAddVitals}
              onAddUrineOutput={handleAddUrineOutput}
              onAlertGenerated={handleAlertGenerated}
            />
            <BurnAlertsPanel
              alerts={burnAlerts}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
              onEscalate={handleEscalateAlert}
            />
          </div>
        );

      case 'fluids':
        return (
          <FluidResuscitationDashboard
            patientWeight={patientWeight}
            tbsa={selectedBurn.tbsaPercentage}
            timeOfBurn={new Date(selectedBurn.timeOfInjury)}
            isChild={patientAge < 14}
            urineOutputs={urineOutputs}
          />
        );

      case 'wounds':
        return (
          <BurnWoundAssessment
            assessments={woundAssessments}
            escharotomies={escharotomies}
            graftings={graftings}
            onAddAssessment={handleAddWoundAssessment}
            onAddEscharotomy={handleAddEscharotomy}
            onAddGrafting={handleAddGrafting}
          />
        );

      case 'scores':
        return (
          <BurnScoreSummary
            tbsaCalc={tbsaCalculation || undefined}
            bauxScore={bauxScore || undefined}
            revisedBaux={revisedBauxScore || undefined}
            absiScore={absiScore || undefined}
            patientAge={patientAge}
            hasInhalationInjury={selectedBurn.inhalationInjury}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Flame className="w-7 h-7 text-orange-500" />
            Burns Assessment & Management
          </h1>
          <p className="page-subtitle">
            WHO/ISBI Guidelines 2024 - Comprehensive Burn Care Protocol
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          New Assessment
        </button>
      </div>

      {/* Burn Center Referral Alert */}
      {referralCriteria.meetsCriteria && tbsaCalculation && (
        <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-800">BURN CENTER REFERRAL INDICATED</h4>
              <ul className="mt-2 space-y-1">
                {referralCriteria.reasons.map((reason: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TBSA Calculator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Lund-Browder Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card lg:col-span-2"
        >
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-orange-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Lund-Browder TBSA Calculator</h2>
                <p className="text-xs text-gray-500">WHO/ISBI Recommended - Age-adjusted percentages</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-xs text-gray-500">Age</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-20 ml-2 px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Weight (kg)</label>
                <input
                  type="number"
                  value={patientWeight}
                  onChange={(e) => setPatientWeight(Number(e.target.value))}
                  className="w-20 ml-2 px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </div>
          <div className="card-body">
            <LundBrowderChart
              patientAge={patientAge}
              onCalculate={handleTBSACalculation}
            />
          </div>
        </motion.div>

        {/* Quick Results Panel */}
        <div className="space-y-4">
          {/* TBSA Summary */}
          {tbsaCalculation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="card-body">
                <div className={`p-4 rounded-lg text-center ${
                  tbsaCalculation.totalTBSA >= 30 ? 'bg-red-100' :
                  tbsaCalculation.totalTBSA >= 20 ? 'bg-amber-100' : 'bg-orange-100'
                }`}>
                  <p className="text-sm text-gray-600">Total TBSA</p>
                  <p className="text-4xl font-bold">{tbsaCalculation.totalTBSA.toFixed(1)}%</p>
                  <p className="text-sm font-medium mt-1">
                    {tbsaCalculation.totalTBSA >= 30 ? 'MAJOR BURN' :
                     tbsaCalculation.totalTBSA >= 20 ? 'Moderate Burn' : 'Minor Burn'}
                  </p>
                </div>
                {tbsaCalculation.fullThicknessTBSA > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500">Deep/Full Thickness</p>
                    <p className="font-bold text-gray-700">{tbsaCalculation.fullThicknessTBSA.toFixed(1)}%</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick Scores */}
          {absiScore && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="card-header flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">ABSI Score</h3>
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-purple-600">{absiScore.score ?? absiScore.totalScore}</p>
                    <p className="text-sm text-gray-500">{absiScore.threatLevel?.replace(/_/g, ' ') ?? 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Survival</p>
                    <p className="text-xl font-bold text-green-600">{absiScore.survivalRate ?? absiScore.survivalProbability}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Fluid Plan Quick View */}
          {fluidPlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="card-header flex items-center gap-2">
                <Droplets className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold">Fluid Resuscitation</h3>
              </div>
              <div className="card-body space-y-2">
                <div className="p-2 bg-sky-50 rounded text-center">
                  <p className="text-xs text-gray-500">24h Total</p>
                  <p className="text-xl font-bold text-sky-600">{fluidPlan.totalFluid24h.toLocaleString()} mL</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500">First 8h</p>
                    <p className="font-bold">{Math.round(fluidPlan.firstHalfVolume / 8)} mL/hr</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500">Next 16h</p>
                    <p className="font-bold">{Math.round(fluidPlan.secondHalfVolume / 16)} mL/hr</p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Target UO: {fluidPlan.urineOutputTarget}-1.0 mL/kg/hr
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Recent Burns List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Recent Burn Assessments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TBSA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ABSI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Depth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {burns && burns.length > 0 ? (
                burns.map((burn) => {
                  const patient = patientMap.get(burn.patientId);
                  return (
                    <tr key={burn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 capitalize">{burn.burnType}</td>
                      <td className="px-6 py-4">
                        <span className={`badge ${
                          burn.tbsaPercentage >= 30 ? 'badge-danger' :
                          burn.tbsaPercentage >= 20 ? 'badge-warning' : 'badge-info'
                        }`}>
                          {burn.tbsaPercentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {burn.absiScore ? (
                          <span className={`badge ${
                            burn.absiScore.score <= 3 ? 'badge-success' :
                            burn.absiScore.score <= 5 ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {burn.absiScore.score} ({burn.absiScore.survivalProbability})
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {burn.burnDepth.map((depth) => {
                            const depthInfo = burnDepths.find(d => d.value === depth);
                            return (
                              <span key={depth} className={`badge text-xs ${depthInfo?.color || 'bg-gray-100'}`}>
                                {depthInfo?.label || depth}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(burn.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedBurn(burn);
                            setPatientAge(burn.absiScore?.age || 30);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No burn assessments recorded</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Assessment Modal */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Burn Assessment</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-4">
                  <div>
                    <label className="label">Patient *</label>
                    <select {...register('patientId')} className={`input ${errors.patientId ? 'input-error' : ''}`}>
                      <option value="">Select patient</option>
                      {patients?.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Age *</label>
                      <input 
                        type="number" 
                        {...register('patientAge', { valueAsNumber: true })} 
                        className="input"
                        onChange={e => setPatientAge(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="label">Weight (kg) *</label>
                      <input 
                        type="number" 
                        {...register('patientWeight', { valueAsNumber: true })} 
                        className="input"
                        onChange={e => setPatientWeight(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="label">Gender *</label>
                      <select 
                        {...register('gender')} 
                        className="input"
                        onChange={e => setPatientGender(e.target.value as 'male' | 'female')}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Burn Type *</label>
                      <select {...register('burnType')} className="input">
                        <option value="thermal">Thermal</option>
                        <option value="chemical">Chemical</option>
                        <option value="electrical">Electrical</option>
                        <option value="radiation">Radiation</option>
                        <option value="friction">Friction</option>
                        <option value="contact">Contact</option>
                        <option value="inhalation">Inhalation</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Time of Injury *</label>
                      <input type="datetime-local" {...register('timeOfInjury')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Mechanism of Injury *</label>
                    <input {...register('mechanism')} className="input" placeholder="e.g., Hot water scald, open flame" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" {...register('inhalationInjury')} className="w-5 h-5 rounded text-orange-600" />
                      <div>
                        <span className="font-medium">Inhalation Injury</span>
                        <p className="text-sm text-gray-500">Signs of airway/smoke inhalation</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                      <input type="checkbox" {...register('tetanusStatus')} className="w-5 h-5 rounded text-orange-600" />
                      <span className="font-medium">Tetanus Prophylaxis Given</span>
                    </label>
                  </div>

                  <div>
                    <label className="label">Associated Injuries</label>
                    <textarea {...register('associatedInjuries')} rows={2} className="input" placeholder="Any other injuries..." />
                  </div>

                  <div>
                    <label className="label">Prior Medical History</label>
                    <textarea {...register('priorMedicalHistory')} rows={2} className="input" placeholder="Relevant medical history..." />
                  </div>

                  {tbsaCalculation && tbsaCalculation.totalTBSA > 0 && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="font-semibold text-orange-800">TBSA Calculated: {tbsaCalculation.totalTBSA.toFixed(1)}%</p>
                      <p className="text-sm text-orange-600">Use the Lund-Browder chart above to complete TBSA calculation</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={18} />
                    Save Assessment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Burn Detail Modal with Tabs */}
      <AnimatePresence>
        {showDetailModal && selectedBurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Flame className="w-6 h-6 text-orange-500" />
                    Comprehensive Burn Care
                  </h2>
                  <p className="text-sm text-gray-500">
                    {patientMap.get(selectedBurn.patientId)?.firstName} {patientMap.get(selectedBurn.patientId)?.lastName} - 
                    {' '}{format(new Date(selectedBurn.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const patient = patientMap.get(selectedBurn.patientId);
                      generateBurnsPDFFromEntity(selectedBurn, patient);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                  >
                    <FileText size={18} />
                    Export PDF
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-6 py-2 border-b bg-gray-50 overflow-x-auto">
                {[
                  { id: 'assessment', label: 'Assessment', icon: ClipboardList },
                  { id: 'monitoring', label: 'Monitoring', icon: Heart },
                  { id: 'fluids', label: 'Fluid Resuscitation', icon: Droplets },
                  { id: 'wounds', label: 'Wound Care', icon: Layers },
                  { id: 'scores', label: 'Scores', icon: Calculator },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as BurnModuleTab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
                {renderTabContent()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
