import { useState, useMemo } from 'react';
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
  Clock,
  User,
  X,
  Save,
  Utensils,
  Activity,
  ChevronRight,
  AlertTriangle,
  Info,
  Calendar,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import type { BurnAssessment, BurnDepth, BurnArea } from '../../../types';
import TreatmentPlanCard from '../../../components/clinical/TreatmentPlanCard';
import { generateBurnsPDFFromEntity } from '../../../utils/clinicalPdfGenerators';

const burnSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  burnType: z.enum(['thermal', 'chemical', 'electrical', 'radiation', 'friction']),
  mechanism: z.string().min(1, 'Mechanism is required'),
  timeOfInjury: z.string().min(1, 'Time of injury is required'),
  patientWeight: z.number().min(1, 'Weight is required'),
  inhalationInjury: z.boolean(),
  associatedInjuries: z.string().optional(),
  tetanusStatus: z.boolean(),
});

type BurnFormData = z.infer<typeof burnSchema>;

// Body parts for TBSA calculation (Rule of 9s for adults)
const bodyParts = [
  { id: 'head', name: 'Head & Neck', adultPercent: 9, childPercent: 18 },
  { id: 'chest', name: 'Anterior Trunk', adultPercent: 18, childPercent: 18 },
  { id: 'back', name: 'Posterior Trunk', adultPercent: 18, childPercent: 18 },
  { id: 'rightArm', name: 'Right Arm', adultPercent: 9, childPercent: 9 },
  { id: 'leftArm', name: 'Left Arm', adultPercent: 9, childPercent: 9 },
  { id: 'genitalia', name: 'Genitalia/Perineum', adultPercent: 1, childPercent: 1 },
  { id: 'rightLeg', name: 'Right Leg', adultPercent: 18, childPercent: 13.5 },
  { id: 'leftLeg', name: 'Left Leg', adultPercent: 18, childPercent: 13.5 },
];

const burnDepths: { value: BurnDepth; label: string; description: string; color: string }[] = [
  { value: 'superficial', label: 'Superficial', description: 'Epidermis only, erythema, painful', color: 'bg-red-200 text-red-800' },
  { value: 'superficial_partial', label: 'Superficial Partial', description: 'Epidermis + superficial dermis, blisters, very painful', color: 'bg-orange-200 text-orange-800' },
  { value: 'deep_partial', label: 'Deep Partial', description: 'Epidermis + deep dermis, mottled, less painful', color: 'bg-amber-200 text-amber-800' },
  { value: 'full_thickness', label: 'Full Thickness', description: 'All skin layers, white/charred, insensate', color: 'bg-gray-700 text-white' },
];

// ABSI Scoring System
const calculateABSI = (age: number, tbsa: number, inhalation: boolean, fullThickness: boolean, gender: 'male' | 'female'): { score: number; survival: string } => {
  let score = 0;
  
  // Age points
  if (age <= 20) score += 1;
  else if (age <= 40) score += 2;
  else if (age <= 60) score += 3;
  else if (age <= 80) score += 4;
  else score += 5;
  
  // TBSA points
  if (tbsa <= 10) score += 1;
  else if (tbsa <= 20) score += 2;
  else if (tbsa <= 30) score += 3;
  else if (tbsa <= 40) score += 4;
  else if (tbsa <= 50) score += 5;
  else if (tbsa <= 60) score += 6;
  else if (tbsa <= 70) score += 7;
  else if (tbsa <= 80) score += 8;
  else if (tbsa <= 90) score += 9;
  else score += 10;
  
  // Inhalation injury
  if (inhalation) score += 1;
  
  // Full thickness
  if (fullThickness) score += 1;
  
  // Gender (female)
  if (gender === 'female') score += 1;
  
  // Survival probability
  let survival = '';
  if (score <= 2) survival = '>99%';
  else if (score <= 3) survival = '98%';
  else if (score <= 4) survival = '90%';
  else if (score <= 5) survival = '80%';
  else if (score <= 6) survival = '60%';
  else if (score <= 7) survival = '40%';
  else if (score <= 8) survival = '20%';
  else if (score <= 9) survival = '10%';
  else survival = '<5%';
  
  return { score, survival };
};

// Calculate nutritional requirements for burns
const calculateBurnNutrition = (weight: number, tbsa: number) => {
  // Curreri formula: 25 kcal/kg + 40 kcal/% TBSA
  const calories = (25 * weight) + (40 * tbsa);
  // Protein: 1.5-2g/kg for burns
  const protein = weight * 2;
  // Vitamin C: 500-1000mg
  const vitaminC = 1000;
  // Zinc: 220mg
  const zinc = 220;
  
  return { calories: Math.round(calories), protein: Math.round(protein), vitaminC, zinc };
};

export default function BurnsAssessmentPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBurn, setSelectedBurn] = useState<BurnAssessment | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<{ [key: string]: { percent: number; depth: BurnDepth } }>({});
  const [patientAge, setPatientAge] = useState(30);
  const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');

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
    },
  });

  const patientWeight = watch('patientWeight') || 70;
  const inhalationInjury = watch('inhalationInjury');

  // Calculate TBSA
  const tbsaPercentage = useMemo(() => {
    return Object.values(selectedAreas).reduce((sum, area) => sum + area.percent, 0);
  }, [selectedAreas]);

  // Check for full thickness burns
  const hasFullThickness = useMemo(() => {
    return Object.values(selectedAreas).some(area => area.depth === 'full_thickness');
  }, [selectedAreas]);

  // Calculate Parkland Formula
  const parklandCalculation = useMemo(() => {
    if (tbsaPercentage === 0 || patientWeight === 0) return null;
    
    const totalFluid = 4 * patientWeight * tbsaPercentage; // mL in 24 hours
    const firstHalf = totalFluid / 2; // First 8 hours
    const secondHalf = totalFluid / 2; // Next 16 hours
    
    return {
      total24h: Math.round(totalFluid),
      first8hTotal: Math.round(firstHalf),
      first8hRate: Math.round(firstHalf / 8),
      next16hTotal: Math.round(secondHalf),
      next16hRate: Math.round(secondHalf / 16),
    };
  }, [tbsaPercentage, patientWeight]);

  // Calculate ABSI
  const absiScore = useMemo(() => {
    if (tbsaPercentage === 0) return null;
    return calculateABSI(patientAge, tbsaPercentage, inhalationInjury, hasFullThickness, patientGender);
  }, [patientAge, tbsaPercentage, inhalationInjury, hasFullThickness, patientGender]);

  // Calculate nutrition
  const nutritionRequirements = useMemo(() => {
    if (tbsaPercentage === 0 || patientWeight === 0) return null;
    return calculateBurnNutrition(patientWeight, tbsaPercentage);
  }, [tbsaPercentage, patientWeight]);

  const updateBodyPart = (partId: string, percent: number, depth: BurnDepth) => {
    if (percent === 0) {
      const newAreas = { ...selectedAreas };
      delete newAreas[partId];
      setSelectedAreas(newAreas);
    } else {
      setSelectedAreas({
        ...selectedAreas,
        [partId]: { percent, depth },
      });
    }
  };

  const onSubmit = async (data: BurnFormData) => {
    if (!user || tbsaPercentage === 0) {
      toast.error('Please calculate TBSA first');
      return;
    }

    try {
      const affectedAreas: BurnArea[] = Object.entries(selectedAreas).map(([partId, info]) => {
        const bodyPart = bodyParts.find(bp => bp.id === partId);
        return {
          bodyPart: bodyPart?.name || partId,
          percentage: info.percent,
          depth: info.depth,
        };
      });

      const burnDepthList: BurnDepth[] = [...new Set(Object.values(selectedAreas).map(a => a.depth))];

      // Determine threat level based on ABSI score
      const getThreatLevel = (score: number): 'very_low' | 'moderate' | 'moderately_severe' | 'severe' | 'very_severe' => {
        if (score <= 3) return 'very_low';
        if (score <= 5) return 'moderate';
        if (score <= 7) return 'moderately_severe';
        if (score <= 9) return 'severe';
        return 'very_severe';
      };

      const assessment: BurnAssessment = {
        id: uuidv4(),
        patientId: data.patientId,
        burnType: data.burnType,
        mechanism: data.mechanism,
        timeOfInjury: new Date(data.timeOfInjury),
        tbsaPercentage,
        burnDepth: burnDepthList,
        affectedAreas,
        parklandFormula: {
          fluidRequirement24h: parklandCalculation?.total24h || 0,
          firstHalfRate: parklandCalculation?.first8hRate || 0,
          secondHalfRate: parklandCalculation?.next16hRate || 0,
        },
        absiScore: absiScore ? {
          score: absiScore.score,
          survivalProbability: absiScore.survival,
          age: patientAge,
          gender: patientGender,
          hasInhalationInjury: data.inhalationInjury,
          hasFullThickness: hasFullThickness,
          threatLevel: getThreatLevel(absiScore.score),
        } : undefined,
        inhalationInjury: data.inhalationInjury,
        associatedInjuries: data.associatedInjuries,
        tetanusStatus: data.tetanusStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.burnAssessments.add(assessment);
      toast.success('Burn assessment saved successfully!');
      setShowModal(false);
      setSelectedAreas({});
      reset();
    } catch (error) {
      console.error('Error saving burn assessment:', error);
      toast.error('Failed to save burn assessment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Flame className="w-7 h-7 text-orange-500" />
            Burns Assessment & Management
          </h1>
          <p className="text-gray-600 mt-1">
            TBSA calculation, Parkland formula, and burn care protocols
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={18} />
          New Assessment
        </button>
      </div>

      {/* Quick Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TBSA Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card lg:col-span-2"
        >
          <div className="card-header flex items-center gap-3">
            <Calculator className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">TBSA Calculator (Rule of 9s)</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="label">Patient Age</label>
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  value={patientWeight}
                  onChange={() => {
                    // Update form value
                  }}
                  className="input"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="label">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as 'male' | 'female')}
                  className="input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inhalationInjury}
                    onChange={() => {
                      // Update form value
                    }}
                    className="w-5 h-5 rounded text-orange-600"
                  />
                  <span>Inhalation Injury</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bodyParts.map((part) => {
                const selected = selectedAreas[part.id];
                return (
                  <div
                    key={part.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900 mb-2">{part.name}</p>
                    <p className="text-xs text-gray-500 mb-2">Max: {part.adultPercent}%</p>
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="0"
                        max={part.adultPercent}
                        step="0.5"
                        value={selected?.percent || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0) {
                            updateBodyPart(part.id, val, selected?.depth || 'superficial_partial');
                          } else {
                            updateBodyPart(part.id, 0, 'superficial_partial');
                          }
                        }}
                        className="input text-sm py-1"
                        placeholder="%"
                      />
                      {selected && (
                        <select
                          value={selected.depth}
                          onChange={(e) => updateBodyPart(part.id, selected.percent, e.target.value as BurnDepth)}
                          className="input text-xs py-1"
                        >
                          {burnDepths.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Total Body Surface Area</p>
                  <p className="text-4xl font-bold text-orange-700">{tbsaPercentage.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Burn Classification</p>
                  <p className={`text-xl font-semibold ${
                    tbsaPercentage >= 30 ? 'text-red-600' :
                    tbsaPercentage >= 20 ? 'text-orange-600' :
                    tbsaPercentage >= 10 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {tbsaPercentage >= 30 ? 'Major Burn' :
                     tbsaPercentage >= 20 ? 'Moderate Burn' :
                     tbsaPercentage >= 10 ? 'Minor-Moderate' : 'Minor Burn'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Parkland Formula */}
          {parklandCalculation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <Droplets className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold text-gray-900">Parkland Formula</h3>
              </div>
              <div className="card-body space-y-3">
                <div className="p-3 bg-sky-50 rounded-lg">
                  <p className="text-sm text-sky-600">Total 24h Fluid</p>
                  <p className="text-2xl font-bold text-sky-700">{parklandCalculation.total24h.toLocaleString()} mL</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">First 8 hours</p>
                    <p className="font-bold text-gray-900">{parklandCalculation.first8hRate} mL/hr</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Next 16 hours</p>
                    <p className="font-bold text-gray-900">{parklandCalculation.next16hRate} mL/hr</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Calculate from time of injury, not time of presentation
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ABSI Score */}
          {absiScore && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <Activity className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">ABSI Score</h3>
                <span className="text-xs text-gray-500">(Abbreviated Burn Severity Index)</span>
              </div>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Score</p>
                    <p className="text-3xl font-bold text-purple-600">{absiScore.score}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Survival Probability</p>
                    <p className={`text-2xl font-bold ${
                      parseInt(absiScore.survival) >= 80 ? 'text-emerald-600' :
                      parseInt(absiScore.survival) >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>{absiScore.survival}</p>
                  </div>
                </div>

                {/* ABSI Score Breakdown */}
                <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Score Components</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age ({patientAge}yr):</span>
                      <span className="font-medium text-purple-700">
                        +{patientAge <= 20 ? 1 : patientAge <= 40 ? 2 : patientAge <= 60 ? 3 : patientAge <= 80 ? 4 : 5}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">TBSA ({tbsaPercentage.toFixed(0)}%):</span>
                      <span className="font-medium text-purple-700">
                        +{tbsaPercentage <= 10 ? 1 : tbsaPercentage <= 20 ? 2 : tbsaPercentage <= 30 ? 3 : tbsaPercentage <= 40 ? 4 : tbsaPercentage <= 50 ? 5 : tbsaPercentage <= 60 ? 6 : tbsaPercentage <= 70 ? 7 : tbsaPercentage <= 80 ? 8 : tbsaPercentage <= 90 ? 9 : 10}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender ({patientGender}):</span>
                      <span className="font-medium text-purple-700">
                        +{patientGender === 'female' ? 1 : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Inhalation:</span>
                      <span className="font-medium text-purple-700">
                        +{inhalationInjury ? 1 : 0}
                      </span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-600">Full Thickness Burn:</span>
                      <span className="font-medium text-purple-700">
                        +{hasFullThickness ? 1 : 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Threat Level */}
                <div className={`p-2 rounded-lg text-center ${
                  absiScore.score <= 3 ? 'bg-emerald-100 text-emerald-800' :
                  absiScore.score <= 5 ? 'bg-yellow-100 text-yellow-800' :
                  absiScore.score <= 7 ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <p className="text-xs font-medium uppercase tracking-wide">
                    {absiScore.score <= 3 ? 'Very Low Threat to Life' :
                     absiScore.score <= 5 ? 'Moderate Threat to Life' :
                     absiScore.score <= 7 ? 'Moderately Severe' :
                     absiScore.score <= 9 ? 'Severe - Critical Care Required' :
                     'Very Severe - Maximum Intervention'}
                  </p>
                </div>

                {/* Reference Table */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-purple-600 hover:text-purple-800 font-medium">
                    View ABSI Reference Table
                  </summary>
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 text-left text-gray-600">Score</th>
                          <th className="py-1 text-right text-gray-600">Survival</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr className={absiScore.score <= 2 ? 'bg-purple-100' : ''}>
                          <td className="py-1">2-3</td>
                          <td className="py-1 text-right">&gt;99%</td>
                        </tr>
                        <tr className={absiScore.score === 3 ? 'bg-purple-100' : ''}>
                          <td className="py-1">3</td>
                          <td className="py-1 text-right">98%</td>
                        </tr>
                        <tr className={absiScore.score === 4 ? 'bg-purple-100' : ''}>
                          <td className="py-1">4</td>
                          <td className="py-1 text-right">90%</td>
                        </tr>
                        <tr className={absiScore.score === 5 ? 'bg-purple-100' : ''}>
                          <td className="py-1">5</td>
                          <td className="py-1 text-right">80%</td>
                        </tr>
                        <tr className={absiScore.score === 6 ? 'bg-purple-100' : ''}>
                          <td className="py-1">6</td>
                          <td className="py-1 text-right">60%</td>
                        </tr>
                        <tr className={absiScore.score === 7 ? 'bg-purple-100' : ''}>
                          <td className="py-1">7</td>
                          <td className="py-1 text-right">40%</td>
                        </tr>
                        <tr className={absiScore.score === 8 ? 'bg-purple-100' : ''}>
                          <td className="py-1">8</td>
                          <td className="py-1 text-right">20%</td>
                        </tr>
                        <tr className={absiScore.score === 9 ? 'bg-purple-100' : ''}>
                          <td className="py-1">9</td>
                          <td className="py-1 text-right">10%</td>
                        </tr>
                        <tr className={absiScore.score >= 10 ? 'bg-purple-100' : ''}>
                          <td className="py-1">10+</td>
                          <td className="py-1 text-right">&lt;5%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            </motion.div>
          )}

          {/* Nutrition */}
          {nutritionRequirements && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <Utensils className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-900">Nutritional Needs</h3>
              </div>
              <div className="card-body grid grid-cols-2 gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-emerald-700">{nutritionRequirements.calories}</p>
                  <p className="text-xs text-emerald-600">kcal/day</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-700">{nutritionRequirements.protein}g</p>
                  <p className="text-xs text-blue-600">Protein/day</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-orange-700">{nutritionRequirements.vitaminC}mg</p>
                  <p className="text-xs text-orange-600">Vitamin C</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">{nutritionRequirements.zinc}mg</p>
                  <p className="text-xs text-gray-600">Zinc</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Burns List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fluid Req.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {burns && burns.length > 0 ? (
                burns.map((burn) => {
                  const patient = patientMap.get(burn.patientId);
                  return (
                    <tr 
                      key={burn.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedBurn(burn);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize">{burn.burnType}</span>
                      </td>
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
                          <div className="flex items-center gap-2">
                            <span className={`badge ${
                              burn.absiScore.score <= 3 ? 'badge-success' :
                              burn.absiScore.score <= 5 ? 'badge-warning' :
                              burn.absiScore.score <= 7 ? 'badge-danger' : 'bg-red-700 text-white'
                            }`}>
                              {burn.absiScore.score}
                            </span>
                            <span className="text-xs text-gray-500">
                              {burn.absiScore.survivalProbability}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
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
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">
                          {burn.parklandFormula.fluidRequirement24h.toLocaleString()} mL/24h
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {format(new Date(burn.createdAt), 'MMM d, yyyy')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Burn Type *</label>
                      <select {...register('burnType')} className="input">
                        <option value="thermal">Thermal</option>
                        <option value="chemical">Chemical</option>
                        <option value="electrical">Electrical</option>
                        <option value="radiation">Radiation</option>
                        <option value="friction">Friction</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Patient Weight (kg) *</label>
                      <input type="number" {...register('patientWeight', { valueAsNumber: true })} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Mechanism of Injury *</label>
                    <input {...register('mechanism')} className="input" placeholder="e.g., Hot water scald, open flame" />
                  </div>

                  <div>
                    <label className="label">Time of Injury *</label>
                    <input type="datetime-local" {...register('timeOfInjury')} className="input" />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" {...register('inhalationInjury')} className="w-5 h-5 rounded text-orange-600" />
                      <div>
                        <span className="font-medium">Inhalation Injury</span>
                        <p className="text-sm text-gray-500">Signs of airway/smoke inhalation</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" {...register('tetanusStatus')} className="w-5 h-5 rounded text-orange-600" />
                      <div>
                        <span className="font-medium">Tetanus Prophylaxis Given</span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="label">Associated Injuries</label>
                    <textarea {...register('associatedInjuries')} rows={2} className="input" placeholder="Any other injuries..." />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      <strong>Note:</strong> Complete TBSA calculation using the calculator above before saving.
                    </p>
                  </div>
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

      {/* Burn Detail Modal */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Flame className="w-6 h-6 text-orange-500" />
                    Burn Assessment Details
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
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
                    className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    title="Export as PDF"
                  >
                    <FileText size={18} />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Burn Info */}
                  <div className="space-y-4">
                    {/* TBSA & ABSI Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-lg ${
                        selectedBurn.tbsaPercentage >= 30 ? 'bg-red-100 text-red-800' :
                        selectedBurn.tbsaPercentage >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        <p className="text-sm font-medium opacity-80">TBSA</p>
                        <p className="text-3xl font-bold">{selectedBurn.tbsaPercentage}%</p>
                        <p className="text-sm opacity-80">Total Body Surface Area</p>
                      </div>
                      {selectedBurn.absiScore && (
                        <div className={`p-4 rounded-lg ${
                          selectedBurn.absiScore.score <= 3 ? 'bg-green-100 text-green-800' :
                          selectedBurn.absiScore.score <= 5 ? 'bg-amber-100 text-amber-800' :
                          selectedBurn.absiScore.score <= 7 ? 'bg-red-100 text-red-800' : 'bg-red-200 text-red-900'
                        }`}>
                          <p className="text-sm font-medium opacity-80">ABSI Score</p>
                          <p className="text-3xl font-bold">{selectedBurn.absiScore.score}</p>
                          <p className="text-sm opacity-80">Survival: {selectedBurn.absiScore.survivalProbability}</p>
                        </div>
                      )}
                    </div>

                    {/* Burn Info Card */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Info size={16} />
                        Burn Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
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
                          <span className="ml-2 font-medium">{format(new Date(selectedBurn.timeOfInjury), 'PPp')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-2 font-medium">{differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury))} days ago</span>
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
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity size={16} />
                        Affected Areas
                      </h4>
                      <div className="space-y-2">
                        {selectedBurn.affectedAreas.map((area, idx) => {
                          const depthInfo = burnDepths.find(d => d.value === area.depth);
                          return (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                              <span className="font-medium">{area.bodyPart}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{area.percentage}%</span>
                                <span className={`badge text-xs ${depthInfo?.color}`}>{depthInfo?.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parkland Formula */}
                    <div className="bg-sky-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-sky-600" />
                        Parkland Formula - Fluid Resuscitation
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-sky-600">
                            {selectedBurn.parklandFormula.fluidRequirement24h.toLocaleString()} mL
                          </p>
                          <p className="text-xs text-gray-500">Total (24 hours)</p>
                        </div>
                        <div className="space-y-2">
                          <div className="p-2 bg-white rounded text-sm">
                            <span className="text-gray-500">First 8 hours:</span>
                            <span className="ml-2 font-bold text-sky-600">{selectedBurn.parklandFormula.firstHalfRate} mL/hr</span>
                          </div>
                          <div className="p-2 bg-white rounded text-sm">
                            <span className="text-gray-500">Next 16 hours:</span>
                            <span className="ml-2 font-bold text-sky-600">{selectedBurn.parklandFormula.secondHalfRate} mL/hr</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-sky-700 mt-3 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Use Lactated Ringer's solution. Adjust based on urine output (0.5-1 mL/kg/hr target)
                      </p>
                    </div>

                    {/* Management Phase Guide */}
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Calendar size={16} />
                        Burns Management Phases
                      </h4>
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg ${differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 2 ? 'bg-red-100 ring-2 ring-red-400' : 'bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Initial Phase (0-48h)</span>
                            {differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 2 && 
                              <span className="badge badge-danger text-xs">Current</span>
                            }
                          </div>
                          <p className="text-sm text-gray-600">Fluid resuscitation, airway management, pain control</p>
                        </div>
                        <div className={`p-3 rounded-lg ${differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 2 && differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 7 ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Week 1</span>
                            {differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 2 && differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 7 && 
                              <span className="badge badge-warning text-xs">Current</span>
                            }
                          </div>
                          <p className="text-sm text-gray-600">Wound care, debridement, infection prevention</p>
                        </div>
                        <div className={`p-3 rounded-lg ${differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 7 && differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 14 ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Week 2</span>
                            {differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 7 && differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 14 && 
                              <span className="badge badge-info text-xs">Current</span>
                            }
                          </div>
                          <p className="text-sm text-gray-600">Grafting assessment, nutrition optimization</p>
                        </div>
                        <div className={`p-3 rounded-lg ${differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 14 && differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 28 ? 'bg-green-100 ring-2 ring-green-400' : 'bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Weeks 3-4</span>
                            {differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 14 && differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) <= 28 && 
                              <span className="badge badge-success text-xs">Current</span>
                            }
                          </div>
                          <p className="text-sm text-gray-600">Re-epithelialization, physiotherapy, scar management</p>
                        </div>
                        <div className={`p-3 rounded-lg ${differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 28 ? 'bg-sky-100 ring-2 ring-sky-400' : 'bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Monthly Follow-up</span>
                            {differenceInDays(new Date(), new Date(selectedBurn.timeOfInjury)) > 28 && 
                              <span className="badge badge-secondary text-xs">Current</span>
                            }
                          </div>
                          <p className="text-sm text-gray-600">Scar assessment, contracture prevention, rehabilitation</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Treatment Plans */}
                  <div>
                    <TreatmentPlanCard
                      patientId={selectedBurn.patientId}
                      relatedEntityId={selectedBurn.id}
                      relatedEntityType="burn"
                      clinicianId={user?.id || ''}
                      clinicianName={`${user?.firstName || ''} ${user?.lastName || ''}`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
