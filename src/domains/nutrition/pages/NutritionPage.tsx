import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Apple,
  Search,
  User,
  X,
  Save,
  Calculator,
  Scale,
  Utensils,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { format } from 'date-fns';
import type { NutritionAssessment } from '../../../types';
import { generateNutritionPDFFromEntity } from '../../../utils/clinicalPdfGenerators';

// African Food Composition Table (Nigerian foods)
const africanFoodDatabase = {
  grains: [
    { name: 'Jollof Rice', calories: 350, protein: 8, carbs: 55, fat: 12, fiber: 2, portion: '1 plate (250g)' },
    { name: 'Fried Rice', calories: 380, protein: 10, carbs: 52, fat: 15, fiber: 3, portion: '1 plate (250g)' },
    { name: 'White Rice', calories: 230, protein: 4, carbs: 50, fat: 0.5, fiber: 1, portion: '1 cup (200g)' },
    { name: 'Tuwo Shinkafa', calories: 200, protein: 4, carbs: 44, fat: 0.5, fiber: 1, portion: '1 ball (150g)' },
    { name: 'Semovita', calories: 250, protein: 6, carbs: 54, fat: 1, fiber: 2, portion: '1 wrap (200g)' },
    { name: 'Garri (Eba)', calories: 360, protein: 1, carbs: 85, fat: 0.5, fiber: 2, portion: '1 wrap (150g)' },
    { name: 'Pounded Yam', calories: 340, protein: 4, carbs: 80, fat: 0.5, fiber: 3, portion: '1 wrap (200g)' },
    { name: 'Amala', calories: 260, protein: 3, carbs: 62, fat: 0.5, fiber: 4, portion: '1 wrap (200g)' },
    { name: 'Fufu', calories: 280, protein: 2, carbs: 68, fat: 0.5, fiber: 2, portion: '1 wrap (200g)' },
    { name: 'Wheat Meal (Swallow)', calories: 270, protein: 8, carbs: 58, fat: 1.5, fiber: 6, portion: '1 wrap (200g)' },
    { name: 'Oat Meal', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, portion: '1 cup (200g)' },
  ],
  soups: [
    { name: 'Egusi Soup', calories: 280, protein: 15, carbs: 8, fat: 22, fiber: 3, portion: '1 bowl (200ml)' },
    { name: 'Efo Riro', calories: 180, protein: 12, carbs: 8, fat: 12, fiber: 5, portion: '1 bowl (200ml)' },
    { name: 'Ogbono Soup', calories: 250, protein: 14, carbs: 10, fat: 18, fiber: 4, portion: '1 bowl (200ml)' },
    { name: 'Okro Soup', calories: 120, protein: 8, carbs: 12, fat: 6, fiber: 4, portion: '1 bowl (200ml)' },
    { name: 'Bitterleaf Soup', calories: 200, protein: 12, carbs: 8, fat: 14, fiber: 6, portion: '1 bowl (200ml)' },
    { name: 'Afang Soup', calories: 220, protein: 14, carbs: 10, fat: 15, fiber: 5, portion: '1 bowl (200ml)' },
    { name: 'Edikang Ikong', calories: 190, protein: 16, carbs: 6, fat: 12, fiber: 5, portion: '1 bowl (200ml)' },
    { name: 'Vegetable Soup', calories: 150, protein: 10, carbs: 12, fat: 8, fiber: 6, portion: '1 bowl (200ml)' },
    { name: 'Pepper Soup', calories: 180, protein: 20, carbs: 4, fat: 10, fiber: 2, portion: '1 bowl (300ml)' },
    { name: 'Groundnut Soup', calories: 320, protein: 18, carbs: 12, fat: 24, fiber: 4, portion: '1 bowl (200ml)' },
  ],
  proteins: [
    { name: 'Fried Fish', calories: 200, protein: 30, carbs: 5, fat: 8, fiber: 0, portion: '1 piece (150g)' },
    { name: 'Grilled Fish', calories: 150, protein: 32, carbs: 0, fat: 4, fiber: 0, portion: '1 piece (150g)' },
    { name: 'Stockfish', calories: 120, protein: 28, carbs: 0, fat: 1, fiber: 0, portion: '1 piece (100g)' },
    { name: 'Beef (Stewed)', calories: 250, protein: 26, carbs: 2, fat: 15, fiber: 0, portion: '3 pieces (150g)' },
    { name: 'Goat Meat', calories: 280, protein: 28, carbs: 0, fat: 18, fiber: 0, portion: '3 pieces (150g)' },
    { name: 'Chicken (Fried)', calories: 240, protein: 28, carbs: 4, fat: 12, fiber: 0, portion: '1 piece (150g)' },
    { name: 'Chicken (Grilled)', calories: 180, protein: 30, carbs: 0, fat: 6, fiber: 0, portion: '1 piece (150g)' },
    { name: 'Egg (Boiled)', calories: 80, protein: 6, carbs: 0.5, fat: 5, fiber: 0, portion: '1 large egg' },
    { name: 'Egg (Fried)', calories: 110, protein: 6, carbs: 1, fat: 9, fiber: 0, portion: '1 large egg' },
    { name: 'Suya', calories: 300, protein: 35, carbs: 5, fat: 16, fiber: 1, portion: '5 sticks (150g)' },
    { name: 'Kilishi', calories: 280, protein: 40, carbs: 8, fat: 10, fiber: 1, portion: '50g' },
    { name: 'Moi Moi', calories: 180, protein: 12, carbs: 20, fat: 8, fiber: 4, portion: '1 wrap (150g)' },
    { name: 'Akara', calories: 220, protein: 10, carbs: 22, fat: 12, fiber: 3, portion: '5 balls (100g)' },
  ],
  vegetables: [
    { name: 'Garden Salad', calories: 50, protein: 2, carbs: 10, fat: 0.5, fiber: 4, portion: '1 bowl (150g)' },
    { name: 'Coleslaw', calories: 120, protein: 2, carbs: 12, fat: 8, fiber: 3, portion: '1 serving (100g)' },
    { name: 'Plantain (Fried)', calories: 250, protein: 1.5, carbs: 45, fat: 10, fiber: 3, portion: '1 plantain (150g)' },
    { name: 'Plantain (Boiled)', calories: 180, protein: 1.5, carbs: 45, fat: 0.5, fiber: 3, portion: '1 plantain (150g)' },
    { name: 'Beans (Stewed)', calories: 200, protein: 14, carbs: 32, fat: 4, fiber: 8, portion: '1 cup (200g)' },
    { name: 'Beans Porridge', calories: 280, protein: 12, carbs: 42, fat: 8, fiber: 10, portion: '1 plate (250g)' },
  ],
  snacks: [
    { name: 'Puff Puff', calories: 150, protein: 3, carbs: 22, fat: 6, fiber: 1, portion: '5 balls (80g)' },
    { name: 'Chin Chin', calories: 180, protein: 3, carbs: 25, fat: 8, fiber: 1, portion: '50g' },
    { name: 'Meat Pie', calories: 350, protein: 10, carbs: 35, fat: 18, fiber: 2, portion: '1 pie (150g)' },
    { name: 'Sausage Roll', calories: 280, protein: 8, carbs: 28, fat: 15, fiber: 1, portion: '1 roll (100g)' },
    { name: 'Buns', calories: 200, protein: 4, carbs: 32, fat: 7, fiber: 1, portion: '2 buns (100g)' },
    { name: 'Groundnuts (Roasted)', calories: 280, protein: 12, carbs: 8, fat: 24, fiber: 4, portion: '50g' },
    { name: 'Cashew Nuts', calories: 280, protein: 9, carbs: 15, fat: 22, fiber: 2, portion: '50g' },
  ],
  beverages: [
    { name: 'Zobo (Hibiscus)', calories: 40, protein: 0.5, carbs: 10, fat: 0, fiber: 1, portion: '1 glass (300ml)' },
    { name: 'Kunu', calories: 80, protein: 2, carbs: 18, fat: 0.5, fiber: 1, portion: '1 glass (300ml)' },
    { name: 'Tiger Nut Milk (Kunun Aya)', calories: 120, protein: 3, carbs: 18, fat: 5, fiber: 2, portion: '1 glass (300ml)' },
    { name: 'Palm Wine', calories: 90, protein: 0.5, carbs: 15, fat: 0, fiber: 0, portion: '1 glass (200ml)' },
    { name: 'Fura da Nono', calories: 150, protein: 6, carbs: 22, fat: 4, fiber: 2, portion: '1 cup (300ml)' },
    { name: 'Pap (Ogi)', calories: 100, protein: 2, carbs: 22, fat: 0.5, fiber: 1, portion: '1 cup (250ml)' },
    { name: 'Fruit Juice (Fresh)', calories: 60, protein: 0.5, carbs: 14, fat: 0, fiber: 0.5, portion: '1 glass (250ml)' },
  ],
};

// MUST Score calculation
const mustScoreQuestions = {
  bmi: [
    { range: '>20', score: 0, label: 'BMI > 20 kg/m²' },
    { range: '18.5-20', score: 1, label: 'BMI 18.5-20 kg/m²' },
    { range: '<18.5', score: 2, label: 'BMI < 18.5 kg/m²' },
  ],
  weightLoss: [
    { range: '<5%', score: 0, label: 'Weight loss < 5% in 3-6 months' },
    { range: '5-10%', score: 1, label: 'Weight loss 5-10% in 3-6 months' },
    { range: '>10%', score: 2, label: 'Weight loss > 10% in 3-6 months' },
  ],
  acuteDisease: [
    { value: false, score: 0, label: 'No acute disease effect' },
    { value: true, score: 2, label: 'Acutely ill with no nutritional intake for >5 days' },
  ],
};

const nutritionAssessmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  weight: z.number().min(1, 'Weight is required'),
  height: z.number().min(1, 'Height is required'),
  bmiScore: z.number().min(0).max(2),
  weightLossScore: z.number().min(0).max(2),
  acuteDiseaseScore: z.number().min(0).max(2),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.string().optional(),
  specialConditions: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type NutritionFormData = z.infer<typeof nutritionAssessmentSchema>;

interface MealItem {
  food: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayMealPlan {
  breakfast: MealItem[];
  midMorning: MealItem[];
  lunch: MealItem[];
  afternoon: MealItem[];
  dinner: MealItem[];
  bedtime: MealItem[];
}

export default function NutritionPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [_selectedAssessment, _setSelectedAssessment] = useState<NutritionAssessment | null>(null);
  const [activeFoodCategory, setActiveFoodCategory] = useState('grains');
  const [selectedDay, setSelectedDay] = useState(0);
  const [mealPlan, setMealPlan] = useState<DayMealPlan[]>(
    Array(7).fill({
      breakfast: [],
      midMorning: [],
      lunch: [],
      afternoon: [],
      dinner: [],
      bedtime: [],
    })
  );

  const assessments = useLiveQuery(() => db.nutritionAssessments.orderBy('assessedAt').reverse().toArray(), []);
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
    setValue,
    reset,
    formState: { errors: _errors },
  } = useForm<NutritionFormData>({
    resolver: zodResolver(nutritionAssessmentSchema),
    defaultValues: {
      bmiScore: 0,
      weightLossScore: 0,
      acuteDiseaseScore: 0,
      dietaryRestrictions: [],
      specialConditions: [],
    },
  });

  const weight = watch('weight');
  const height = watch('height');
  const bmiScore = watch('bmiScore');
  const weightLossScore = watch('weightLossScore');
  const acuteDiseaseScore = watch('acuteDiseaseScore');
  const specialConditions = watch('specialConditions') || [];

  // Calculate BMI
  const bmi = useMemo(() => {
    if (weight && height) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  }, [weight, height]);

  // Calculate MUST Score
  const mustScore = useMemo(() => {
    return (bmiScore || 0) + (weightLossScore || 0) + (acuteDiseaseScore || 0);
  }, [bmiScore, weightLossScore, acuteDiseaseScore]);

  // MUST Risk Category
  const mustRisk = useMemo(() => {
    if (mustScore === 0) return { level: 'low', label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-100' };
    if (mustScore === 1) return { level: 'medium', label: 'Medium Risk', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'high', label: 'High Risk', color: 'text-red-600', bg: 'bg-red-100' };
  }, [mustScore]);

  // Daily caloric needs (Harris-Benedict equation + activity factor)
  const caloricNeeds = useMemo(() => {
    if (!weight || !height) return null;
    
    // Base metabolic rate (assuming age 40 for estimation, male)
    const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * 40);
    let activityFactor = 1.2; // Sedentary (hospitalized)
    
    // Adjust for conditions
    if (specialConditions.includes('burns')) activityFactor = 2.0;
    else if (specialConditions.includes('sepsis')) activityFactor = 1.5;
    else if (specialConditions.includes('surgery')) activityFactor = 1.3;
    
    return Math.round(bmr * activityFactor);
  }, [weight, height, specialConditions]);

  // Protein needs
  const proteinNeeds = useMemo(() => {
    if (!weight) return null;
    let factor = 1.0; // Normal
    
    if (specialConditions.includes('burns')) factor = 2.5;
    else if (specialConditions.includes('sepsis')) factor = 2.0;
    else if (specialConditions.includes('malnutrition')) factor = 1.5;
    else if (specialConditions.includes('surgery')) factor = 1.5;
    else if (specialConditions.includes('ckd')) factor = 0.8;
    
    return Math.round(weight * factor);
  }, [weight, specialConditions]);

  const filteredAssessments = useMemo(() => {
    if (!assessments) return [];
    return assessments.filter((assessment) => {
      const patient = patientMap.get(assessment.patientId);
      return searchQuery === '' ||
        (patient && `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [assessments, searchQuery, patientMap]);

  const toggleCondition = (condition: string) => {
    const current = watch('specialConditions') || [];
    if (current.includes(condition)) {
      setValue('specialConditions', current.filter(c => c !== condition));
    } else {
      setValue('specialConditions', [...current, condition]);
    }
  };

  const onSubmit = async (data: NutritionFormData) => {
    if (!user) return;

    try {
      const heightInMeters = data.height / 100;
      const calculatedBmi = data.weight / (heightInMeters * heightInMeters);

      const assessment: NutritionAssessment = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        weight: data.weight,
        height: data.height,
        bmi: Number(calculatedBmi.toFixed(1)),
        mustScore,
        sgaGrade: mustScore === 0 ? 'A' : mustScore === 1 ? 'B' : 'C',
        dietaryRestrictions: data.dietaryRestrictions,
        allergies: data.allergies ? data.allergies.split(',').map(a => a.trim()) : [],
        assessedBy: user.id,
        assessedAt: new Date(),
        notes: data.notes,
      };

      await db.nutritionAssessments.add(assessment);
      await syncRecord('nutritionAssessments', assessment as unknown as Record<string, unknown>);
      toast.success('Nutrition assessment saved!');
      setShowModal(false);
      reset();
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    }
  };

  const addFoodToMeal = (food: any, mealType: keyof DayMealPlan) => {
    const newMealPlan = [...mealPlan];
    const dayPlan = { ...newMealPlan[selectedDay] };
    dayPlan[mealType] = [
      ...dayPlan[mealType],
      {
        food: food.name,
        portion: food.portion,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      },
    ];
    newMealPlan[selectedDay] = dayPlan;
    setMealPlan(newMealPlan);
    toast.success(`Added ${food.name} to ${mealType}`);
  };

  const getDayTotals = (day: DayMealPlan) => {
    const allMeals = [
      ...day.breakfast,
      ...day.midMorning,
      ...day.lunch,
      ...day.afternoon,
      ...day.dinner,
      ...day.bedtime,
    ];
    return {
      calories: allMeals.reduce((sum, m) => sum + m.calories, 0),
      protein: allMeals.reduce((sum, m) => sum + m.protein, 0),
      carbs: allMeals.reduce((sum, m) => sum + m.carbs, 0),
      fat: allMeals.reduce((sum, m) => sum + m.fat, 0),
    };
  };

  const getMustBadge = (score: number | { totalScore: number }) => {
    const numScore = typeof score === 'number' ? score : score.totalScore;
    if (numScore === 0) return <span className="badge badge-success">Low Risk</span>;
    if (numScore === 1) return <span className="badge badge-warning">Medium Risk</span>;
    return <span className="badge badge-danger">High Risk</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Apple className="w-7 h-7 text-green-500" />
            Nutrition Assessment
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            MUST screening & African food-based meal planning
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => setShowMealPlanModal(true)} className="btn btn-secondary w-full sm:w-auto">
            <Utensils size={18} />
            Meal Planner
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
            <Plus size={18} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Assessments List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BMI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MUST Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SGA Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssessments.length > 0 ? (
                filteredAssessments.map((assessment) => {
                  const patient = patientMap.get(assessment.patientId);
                  return (
                    <tr key={assessment.id} className="hover:bg-gray-50">
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
                        <span className={`font-medium ${
                          (assessment.bmi || 0) < 18.5 ? 'text-red-600' :
                          (assessment.bmi || 0) > 30 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {assessment.bmi || 'N/A'}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">kg/m²</span>
                      </td>
                      <td className="px-6 py-4">{getMustBadge(assessment.mustScore)}</td>
                      <td className="px-6 py-4">
                        <span className={`badge ${
                          assessment.sgaGrade === 'A' ? 'badge-success' :
                          assessment.sgaGrade === 'B' ? 'badge-warning' :
                          'badge-danger'
                        }`}>
                          Grade {assessment.sgaGrade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(assessment.assessedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => generateNutritionPDFFromEntity(assessment, patient)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Export as PDF"
                        >
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Apple className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No assessments found</p>
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Nutrition Assessment (MUST Screening)</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(90vh-80px)]">
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Patient & Measurements */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="label">Patient *</label>
                      <select {...register('patientId')} className="input">
                        <option value="">Select patient</option>
                        {patients?.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.firstName} {patient.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Weight (kg) *</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('weight', { valueAsNumber: true })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Height (cm) *</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('height', { valueAsNumber: true })}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* BMI Display */}
                  {bmi && (
                    <div className="card bg-gradient-to-r from-green-50 to-blue-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Scale className="w-8 h-8 text-green-500" />
                          <div>
                            <p className="text-sm text-gray-500">Calculated BMI</p>
                            <p className="text-2xl font-bold text-gray-900">{bmi} kg/m²</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            Number(bmi) < 18.5 ? 'text-red-600' :
                            Number(bmi) < 25 ? 'text-green-600' :
                            Number(bmi) < 30 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {Number(bmi) < 18.5 ? 'Underweight' :
                             Number(bmi) < 25 ? 'Normal' :
                             Number(bmi) < 30 ? 'Overweight' :
                             'Obese'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MUST Screening */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-violet-500" />
                      MUST Screening Tool
                    </h3>

                    {/* Step 1: BMI Score */}
                    <div className="card border p-4">
                      <p className="font-medium text-gray-700 mb-3">Step 1: BMI Score</p>
                      <div className="space-y-2">
                        {mustScoreQuestions.bmi.map((option) => (
                          <label key={option.range} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              {...register('bmiScore', { valueAsNumber: true })}
                              value={option.score}
                              className="w-4 h-4 text-violet-600"
                            />
                            <span className="text-gray-700">{option.label}</span>
                            <span className="badge badge-secondary ml-auto">{option.score}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Weight Loss */}
                    <div className="card border p-4">
                      <p className="font-medium text-gray-700 mb-3">Step 2: Unplanned Weight Loss (3-6 months)</p>
                      <div className="space-y-2">
                        {mustScoreQuestions.weightLoss.map((option) => (
                          <label key={option.range} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              {...register('weightLossScore', { valueAsNumber: true })}
                              value={option.score}
                              className="w-4 h-4 text-violet-600"
                            />
                            <span className="text-gray-700">{option.label}</span>
                            <span className="badge badge-secondary ml-auto">{option.score}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Step 3: Acute Disease */}
                    <div className="card border p-4">
                      <p className="font-medium text-gray-700 mb-3">Step 3: Acute Disease Effect</p>
                      <div className="space-y-2">
                        {mustScoreQuestions.acuteDisease.map((option, idx) => (
                          <label key={idx} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="radio"
                              {...register('acuteDiseaseScore', { valueAsNumber: true })}
                              value={option.score}
                              className="w-4 h-4 text-violet-600"
                            />
                            <span className="text-gray-700">{option.label}</span>
                            <span className="badge badge-secondary ml-auto">{option.score}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* MUST Result */}
                    <div className={`card p-4 ${mustRisk.bg}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total MUST Score</p>
                          <p className={`text-3xl font-bold ${mustRisk.color}`}>{mustScore}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${mustRisk.color}`}>{mustRisk.label}</p>
                          <p className="text-sm text-gray-600">
                            {mustScore === 0 ? 'Routine clinical care' :
                             mustScore === 1 ? 'Observe, document intake' :
                             'Refer to dietitian, treat underlying condition'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Conditions */}
                  <div>
                    <label className="label">Special Conditions (affects caloric/protein needs)</label>
                    <div className="flex flex-wrap gap-2">
                      {['diabetes', 'ckd', 'burns', 'sepsis', 'surgery', 'malnutrition', 'obesity'].map((condition) => (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => toggleCondition(condition)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            specialConditions.includes(condition)
                              ? 'bg-violet-100 text-violet-700 border border-violet-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {condition.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimated Needs */}
                  {caloricNeeds && proteinNeeds && (
                    <div className="card bg-blue-50 p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Estimated Daily Requirements</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-blue-600">Calories</p>
                          <p className="text-xl font-bold text-blue-900">{caloricNeeds} kcal/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">Protein</p>
                          <p className="text-xl font-bold text-blue-900">{proteinNeeds}g/day</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Allergies & Notes */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Food Allergies (comma-separated)</label>
                      <input {...register('allergies')} className="input" placeholder="e.g., Peanuts, Shellfish" />
                    </div>
                    <div>
                      <label className="label">Notes</label>
                      <input {...register('notes')} className="input" placeholder="Additional notes..." />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
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

      {/* Meal Planner Modal */}
      <AnimatePresence>
        {showMealPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowMealPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Utensils className="w-6 h-6 text-green-500" />
                  7-Day Meal Planner (African Foods)
                </h2>
                <button onClick={() => setShowMealPlanModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="flex h-[calc(90vh-80px)]">
                {/* Food Database Sidebar */}
                <div className="w-80 border-r bg-gray-50 flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-700 mb-2">Food Database</h3>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(africanFoodDatabase).map((category) => (
                        <button
                          key={category}
                          onClick={() => setActiveFoodCategory(category)}
                          className={`px-2 py-1 text-xs rounded-full transition-colors ${
                            activeFoodCategory === category
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {africanFoodDatabase[activeFoodCategory as keyof typeof africanFoodDatabase]?.map((food) => (
                      <div
                        key={food.name}
                        className="p-3 bg-white rounded-lg border hover:border-green-300 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{food.name}</p>
                            <p className="text-xs text-gray-500">{food.portion}</p>
                          </div>
                          <span className="text-xs font-medium text-green-600">{food.calories} cal</span>
                        </div>
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => addFoodToMeal(food, 'breakfast')}
                            className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded"
                          >
                            Breakfast
                          </button>
                          <button
                            onClick={() => addFoodToMeal(food, 'lunch')}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded"
                          >
                            Lunch
                          </button>
                          <button
                            onClick={() => addFoodToMeal(food, 'dinner')}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                          >
                            Dinner
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meal Plan Display */}
                <div className="flex-1 flex flex-col">
                  {/* Day Tabs */}
                  <div className="flex border-b bg-gray-50">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(idx)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                          selectedDay === idx
                            ? 'bg-white border-b-2 border-green-500 text-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* Day Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {(['breakfast', 'midMorning', 'lunch', 'afternoon', 'dinner', 'bedtime'] as const).map((meal) => (
                        <div key={meal} className="card border p-4">
                          <h4 className="font-medium text-gray-700 mb-2 capitalize">
                            {meal === 'midMorning' ? 'Mid-Morning Snack' :
                             meal === 'bedtime' ? 'Bedtime Snack' :
                             meal.charAt(0).toUpperCase() + meal.slice(1)}
                          </h4>
                          <div className="space-y-1 min-h-[60px]">
                            {mealPlan[selectedDay][meal].length > 0 ? (
                              mealPlan[selectedDay][meal].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                  <span>{item.food}</span>
                                  <span className="text-gray-500">{item.calories} cal</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-400 text-sm italic">No items added</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Day Totals */}
                    <div className="mt-6 card bg-gradient-to-r from-green-50 to-blue-50 p-4">
                      <h4 className="font-medium text-gray-700 mb-3">Day {selectedDay + 1} Totals</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Calories</p>
                          <p className="text-xl font-bold text-gray-900">
                            {getDayTotals(mealPlan[selectedDay]).calories}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Protein</p>
                          <p className="text-xl font-bold text-green-600">
                            {getDayTotals(mealPlan[selectedDay]).protein}g
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Carbs</p>
                          <p className="text-xl font-bold text-blue-600">
                            {getDayTotals(mealPlan[selectedDay]).carbs}g
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Fat</p>
                          <p className="text-xl font-bold text-yellow-600">
                            {getDayTotals(mealPlan[selectedDay]).fat}g
                          </p>
                        </div>
                      </div>
                    </div>
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
