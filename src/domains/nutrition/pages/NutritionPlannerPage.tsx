/**
 * Enhanced Nutrition Planner Page
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive nutrition assessment and meal planning with African foods
 */

import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Apple,
  Scale,
  Activity,
  Calculator,
  Utensils,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  User,
  Calendar,
  TrendingUp,
  Heart,
  Phone,
  Droplets,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import {
  nutritionPlannerService,
  africanFoodDatabase,
  mustScreeningCriteria,
  type NutritionAssessment,
  type MealPlan,
  type FoodItem,
  type DietType,
  type FeedingRoute,
  type FoodCategory,
  type MealType,
} from '../../../services/nutritionPlannerService';

type TabType = 'assessment' | 'foods' | 'meal-plans' | 'calculator';

const dietTypeLabels: Record<DietType, string> = {
  regular: 'Regular Diet',
  soft: 'Soft Diet',
  liquid: 'Liquid Diet',
  pureed: 'Pureed Diet',
  diabetic: 'Diabetic Diet',
  renal: 'Renal Diet',
  cardiac: 'Cardiac Diet',
  high_protein: 'High Protein Diet',
  low_residue: 'Low Residue Diet',
  clear_liquid: 'Clear Liquid Diet',
};

const feedingRouteLabels: Record<FeedingRoute, string> = {
  oral: 'Oral',
  enteral_ng: 'NG Tube',
  enteral_peg: 'PEG Tube',
  parenteral: 'Parenteral',
  mixed: 'Mixed',
};

const categoryColors: Record<FoodCategory, string> = {
  cereals: 'bg-amber-100 text-amber-700',
  legumes: 'bg-orange-100 text-orange-700',
  vegetables: 'bg-green-100 text-green-700',
  fruits: 'bg-pink-100 text-pink-700',
  meat: 'bg-red-100 text-red-700',
  fish: 'bg-blue-100 text-blue-700',
  dairy: 'bg-purple-100 text-purple-700',
  oils: 'bg-yellow-100 text-yellow-700',
  beverages: 'bg-cyan-100 text-cyan-700',
  traditional: 'bg-emerald-100 text-emerald-700',
};

export default function NutritionPlannerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('assessment');
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all');
  const [expandedFood, setExpandedFood] = useState<string | null>(null);

  // Assessment form states
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [age, setAge] = useState<number | ''>('');
  const [isMale, setIsMale] = useState(true);
  const [weightLossPercent, setWeightLossPercent] = useState<number | ''>(0);
  const [hasAcuteIllness, setHasAcuteIllness] = useState(false);
  const [noIntakeExpected, setNoIntakeExpected] = useState(false);
  const [appetiteLevel, setAppetiteLevel] = useState<NutritionAssessment['appetiteLevel']>('good');
  const [feedingRoute, setFeedingRoute] = useState<FeedingRoute>('oral');
  const [estimatedIntake, setEstimatedIntake] = useState(100);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [stressFactor, setStressFactor] = useState(1.0);
  const [proteinCondition, setProteinCondition] = useState<'normal' | 'wound_healing' | 'burns' | 'critical' | 'renal'>('normal');

  // Meal plan form states
  const [mealPlanDietType, setMealPlanDietType] = useState<DietType>('regular');
  const [mealPlanDuration, setMealPlanDuration] = useState(7);

  // Mock stored data
  const [assessments, setAssessments] = useState<NutritionAssessment[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);

  // Data queries
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);

  const selectedPatient = useMemo(() => {
    return patients?.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Auto-populate patient details when selected
  useEffect(() => {
    if (selectedPatient) {
      // Auto-populate age from date of birth
      if (selectedPatient.dateOfBirth) {
        const birthDate = new Date(selectedPatient.dateOfBirth);
        const calculatedAge = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        setAge(calculatedAge);
      }
      // Auto-populate gender
      setIsMale(selectedPatient.gender === 'male');
    }
  }, [selectedPatient]);

  // Filter foods
  const filteredFoods = useMemo(() => {
    let foods = africanFoodDatabase;
    
    if (selectedCategory !== 'all') {
      foods = foods.filter(f => f.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      foods = foods.filter(
        f => f.name.toLowerCase().includes(query) ||
             f.localName?.toLowerCase().includes(query)
      );
    }
    
    return foods;
  }, [selectedCategory, searchQuery]);

  // Calculate BMI preview
  const bmiPreview = useMemo(() => {
    if (!weight || !height) return null;
    return nutritionPlannerService.calculateBMI(weight as number, height as number);
  }, [weight, height]);

  // Calculate MUST preview
  const mustPreview = useMemo(() => {
    if (!bmiPreview) return null;
    return nutritionPlannerService.calculateMUSTScore(
      bmiPreview.bmi,
      weightLossPercent as number || 0,
      hasAcuteIllness,
      noIntakeExpected
    );
  }, [bmiPreview, weightLossPercent, hasAcuteIllness, noIntakeExpected]);

  // Handle assessment creation
  const handleCreateAssessment = () => {
    if (!selectedPatientId || !weight || !height || !age) {
      toast.error('Please fill in all required fields');
      return;
    }

    const assessment = nutritionPlannerService.createAssessment({
      patientId: selectedPatientId,
      assessedBy: user?.id || '',
      weight: weight as number,
      height: height as number,
      age: age as number,
      isMale,
      weightLossPercent: weightLossPercent as number,
      hasAcuteIllness,
      noIntakeExpected,
      appetiteLevel,
      currentFeedingRoute: feedingRoute,
      estimatedIntake,
      dietaryRestrictions,
      allergies,
      stressFactor,
      proteinCondition,
    });

    setAssessments(prev => [...prev, assessment]);
    toast.success('Nutrition assessment saved');
    setShowAssessmentModal(false);
    resetAssessmentForm();
  };

  const resetAssessmentForm = () => {
    setSelectedPatientId('');
    setWeight('');
    setHeight('');
    setAge('');
    setWeightLossPercent(0);
    setHasAcuteIllness(false);
    setNoIntakeExpected(false);
    setAppetiteLevel('good');
    setEstimatedIntake(100);
    setStressFactor(1.0);
    setProteinCondition('normal');
  };

  // Handle meal plan creation
  const handleCreateMealPlan = () => {
    const latestAssessment = assessments.find(a => a.patientId === selectedPatientId);
    if (!selectedPatientId || !latestAssessment) {
      toast.error('Please select a patient with a nutrition assessment');
      return;
    }

    const mealPlan = nutritionPlannerService.createMealPlan({
      patientId: selectedPatientId,
      createdBy: user?.id || '',
      targetCalories: latestAssessment.caloricRequirement,
      targetProtein: latestAssessment.proteinRequirement,
      dietType: mealPlanDietType,
      feedingRoute: latestAssessment.currentFeedingRoute,
      restrictions: latestAssessment.dietaryRestrictions,
      allergies: latestAssessment.allergies,
      durationDays: mealPlanDuration,
    });

    setMealPlans(prev => [...prev, mealPlan]);
    toast.success('Meal plan created');
    setShowMealPlanModal(false);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'assessment':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nutrition Assessments</h3>
              <button
                onClick={() => setShowAssessmentModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                New Assessment
              </button>
            </div>

            {/* MUST Score Reference */}
            <div className="bg-white rounded-xl p-4 border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clipboard className="text-blue-600" size={20} />
                MUST Screening Tool Reference
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">BMI Score</h5>
                  {mustScreeningCriteria.bmiScoring.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.range}</span>
                      <span className="font-medium">{item.score}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Weight Loss Score</h5>
                  {mustScreeningCriteria.weightLossScoring.map((item, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.range}</span>
                      <span className="font-medium">{item.score}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Risk Categories</h5>
                  {mustScreeningCriteria.riskCategories.map((item, i) => (
                    <div key={i} className={`py-1 px-2 rounded mb-1 ${
                      item.risk === 'low' ? 'bg-green-50 text-green-700' :
                      item.risk === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      <span className="font-medium capitalize">{item.risk}</span>: Score {item.score}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {assessments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Scale className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No nutrition assessments recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assessments.map(assessment => (
                  <div key={assessment.id} className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="text-blue-600" size={18} />
                          <span className="font-medium">
                            {patients?.find(p => p.id === assessment.patientId)?.firstName} {patients?.find(p => p.id === assessment.patientId)?.lastName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(assessment.assessedAt), 'PPp')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        assessment.mustScore.risk === 'low' ? 'bg-green-100 text-green-700' :
                        assessment.mustScore.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        MUST: {assessment.mustScore.risk.toUpperCase()} ({assessment.mustScore.totalScore})
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-blue-600">{assessment.bmi}</p>
                        <p className="text-xs text-gray-500">BMI</p>
                        <p className="text-xs text-gray-600">{assessment.bmiCategory}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-orange-600">{assessment.caloricRequirement}</p>
                        <p className="text-xs text-gray-500">kcal/day</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{assessment.proteinRequirement}g</p>
                        <p className="text-xs text-gray-500">Protein/day</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-cyan-600">{assessment.fluidRequirement}ml</p>
                        <p className="text-xs text-gray-500">Fluid/day</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <div className="flex gap-2 text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded">{feedingRouteLabels[assessment.currentFeedingRoute]}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded">Intake: {assessment.estimatedIntake}%</span>
                        <span className={`px-2 py-1 rounded ${
                          assessment.appetiteLevel === 'good' ? 'bg-green-100' :
                          assessment.appetiteLevel === 'fair' ? 'bg-yellow-100' :
                          'bg-red-100'
                        }`}>
                          Appetite: {assessment.appetiteLevel}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPatientId(assessment.patientId);
                          setShowMealPlanModal(true);
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
                      >
                        Create Meal Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'foods':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">African Food Database</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search foods..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as FoodCategory | 'all')}
                  className="px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="all">All Categories</option>
                  <option value="cereals">Cereals & Grains</option>
                  <option value="legumes">Legumes</option>
                  <option value="meat">Meat & Poultry</option>
                  <option value="fish">Fish</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="fruits">Fruits</option>
                  <option value="traditional">Traditional Soups</option>
                  <option value="beverages">Beverages</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredFoods.map(food => (
                <div key={food.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedFood(expandedFood === food.id ? null : food.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{food.name}</h4>
                        {food.localName && (
                          <p className="text-sm text-gray-500 italic">{food.localName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${categoryColors[food.category]}`}>
                          {food.category}
                        </span>
                        {expandedFood === food.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    <div className="flex gap-4 mt-3 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-orange-600">{food.calories}</p>
                        <p className="text-xs text-gray-500">kcal</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{food.protein}g</p>
                        <p className="text-xs text-gray-500">protein</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-blue-600">{food.carbohydrates}g</p>
                        <p className="text-xs text-gray-500">carbs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-yellow-600">{food.fat}g</p>
                        <p className="text-xs text-gray-500">fat</p>
                      </div>
                    </div>
                  </div>

                  {expandedFood === food.id && (
                    <div className="px-4 pb-4 border-t pt-3 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Serving:</span> {food.servingSize} ({food.servingGrams}g)
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {food.isHighProtein && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">High Protein</span>
                        )}
                        {food.isLowSodium && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Low Sodium</span>
                        )}
                        {food.isDiabeticFriendly && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Diabetic OK</span>
                        )}
                        {food.isRenalFriendly && (
                          <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs">Renal OK</span>
                        )}
                        {!food.isLowPotassium && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">High K+</span>
                        )}
                      </div>

                      {(food.sodium || food.potassium || food.iron) && (
                        <div className="mt-2 text-xs text-gray-500 grid grid-cols-3 gap-2">
                          {food.sodium && <span>Na: {food.sodium}mg</span>}
                          {food.potassium && <span>K: {food.potassium}mg</span>}
                          {food.iron && <span>Fe: {food.iron}mg</span>}
                          {food.phosphorus && <span>P: {food.phosphorus}mg</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'meal-plans':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Meal Plans</h3>
              <button
                onClick={() => setShowMealPlanModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Create Meal Plan
              </button>
            </div>

            {/* Sample Meals Reference */}
            <div className="bg-white rounded-xl p-4 border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Utensils className="text-green-600" size={20} />
                Sample Nigerian Meals
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {(['breakfast', 'lunch', 'dinner'] as MealType[]).map(mealType => (
                  <div key={mealType}>
                    <h5 className="font-medium capitalize mb-2">{mealType}</h5>
                    {nutritionPlannerService.getSampleMeals('regular', mealType).map((meal, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded-lg mb-2">
                        <p className="font-medium text-sm">{meal.name}</p>
                        <p className="text-xs text-gray-500">{meal.items.join(', ')}</p>
                        <p className="text-xs text-orange-600 font-medium">{meal.calories} kcal</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {mealPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Utensils className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No meal plans created</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mealPlans.map(plan => (
                  <div key={plan.id} className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">
                          {patients?.find(p => p.id === plan.patientId)?.firstName} {patients?.find(p => p.id === plan.patientId)?.lastName}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {format(new Date(plan.validFrom), 'PP')} - {format(new Date(plan.validUntil), 'PP')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {dietTypeLabels[plan.dietType]}
                        </span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div className="text-center p-2 bg-orange-50 rounded-lg">
                        <p className="font-bold text-orange-600">{plan.targetCalories}</p>
                        <p className="text-xs text-gray-500">kcal/day</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="font-bold text-green-600">{plan.targetProtein}g</p>
                        <p className="text-xs text-gray-500">protein</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="font-bold text-blue-600">{plan.targetCarbs}g</p>
                        <p className="text-xs text-gray-500">carbs</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="font-bold text-yellow-600">{plan.targetFat}g</p>
                        <p className="text-xs text-gray-500">fat</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'calculator':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Nutrition Calculators</h3>

            <div className="grid grid-cols-2 gap-6">
              {/* BMI Calculator */}
              <div className="bg-white rounded-xl p-6 border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Scale className="text-blue-600" />
                  BMI Calculator
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 170"
                    />
                  </div>
                  {bmiPreview && (
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-600">{bmiPreview.bmi}</p>
                      <p className="text-sm text-gray-600">{bmiPreview.category}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Caloric Requirements */}
              <div className="bg-white rounded-xl p-6 border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="text-orange-600" />
                  Caloric Requirements
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Age (years)</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 45"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Sex</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={isMale}
                          onChange={() => setIsMale(true)}
                        />
                        Male
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={!isMale}
                          onChange={() => setIsMale(false)}
                        />
                        Female
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Stress Factor</label>
                    <select
                      value={stressFactor}
                      onChange={(e) => setStressFactor(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value={1.0}>Normal (1.0)</option>
                      <option value={1.2}>Mild stress (1.2)</option>
                      <option value={1.4}>Moderate stress (1.4)</option>
                      <option value={1.6}>Severe stress (1.6)</option>
                      <option value={2.0}>Burns/Critical (2.0)</option>
                    </select>
                  </div>
                  {weight && height && age && (
                    <div className="p-4 bg-orange-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-orange-600">
                        {nutritionPlannerService.calculateCaloricRequirements(
                          weight as number,
                          height as number,
                          age as number,
                          isMale,
                          1.2,
                          stressFactor
                        )}
                      </p>
                      <p className="text-sm text-gray-600">kcal/day</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Protein Calculator */}
              <div className="bg-white rounded-xl p-6 border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Heart className="text-green-600" />
                  Protein Requirements
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Condition</label>
                    <select
                      value={proteinCondition}
                      onChange={(e) => setProteinCondition(e.target.value as typeof proteinCondition)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="normal">Normal (0.8 g/kg)</option>
                      <option value="wound_healing">Wound Healing (1.5 g/kg)</option>
                      <option value="burns">Burns (2.0 g/kg)</option>
                      <option value="critical">Critical Illness (1.5 g/kg)</option>
                      <option value="renal">Renal Disease (0.6 g/kg)</option>
                    </select>
                  </div>
                  {weight && (
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {nutritionPlannerService.calculateProteinRequirements(
                          weight as number,
                          proteinCondition
                        ).grams}g
                      </p>
                      <p className="text-sm text-gray-600">protein/day</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ideal Body Weight */}
              <div className="bg-white rounded-xl p-6 border">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="text-purple-600" />
                  Ideal Body Weight
                </h4>
                {height && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-3xl font-bold text-purple-600">
                        {nutritionPlannerService.calculateIdealBodyWeight(height as number, isMale).toFixed(1)} kg
                      </p>
                      <p className="text-sm text-gray-600">Ideal Body Weight (Devine)</p>
                    </div>
                    {weight && (weight as number) > nutritionPlannerService.calculateIdealBodyWeight(height as number, isMale) * 1.2 && (
                      <div className="p-4 bg-yellow-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-yellow-600">
                          {nutritionPlannerService.calculateAdjustedBodyWeight(
                            weight as number,
                            nutritionPlannerService.calculateIdealBodyWeight(height as number, isMale)
                          ).toFixed(1)} kg
                        </p>
                        <p className="text-sm text-gray-600">Adjusted Body Weight</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Apple className="text-green-600" />
            Nutrition Planner
          </h1>
          <p className="text-gray-500 mt-1">Nutritional assessment and meal planning with African foods</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">{assessments.length}</p>
          <p className="text-sm text-gray-500">Assessments</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-orange-600">{mealPlans.filter(p => p.status === 'active').length}</p>
          <p className="text-sm text-gray-500">Active Meal Plans</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-red-600">{assessments.filter(a => a.mustScore.risk === 'high').length}</p>
          <p className="text-sm text-gray-500">High Risk Patients</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">{africanFoodDatabase.length}</p>
          <p className="text-sm text-gray-500">Foods in Database</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b">
          <div className="flex">
            {[
              { id: 'assessment', label: 'Assessment', icon: Scale },
              { id: 'foods', label: 'Food Database', icon: Apple },
              { id: 'meal-plans', label: 'Meal Plans', icon: Utensils },
              { id: 'calculator', label: 'Calculators', icon: Calculator },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Assessment Modal */}
      <AnimatePresence>
        {showAssessmentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAssessmentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Scale className="text-green-600" />
                  New Nutrition Assessment
                </h2>
                <button onClick={() => setShowAssessmentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient *</label>
                  <PatientSelector
                    value={selectedPatientId}
                    onChange={(patientId) => setSelectedPatientId(patientId || '')}
                    placeholder="Search and select patient..."
                  />
                </div>

                {/* Selected Patient Details */}
                {selectedPatient && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-white rounded-full shadow-sm">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{selectedPatient.hospitalNumber}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} />
                        <span>
                          {selectedPatient.dateOfBirth 
                            ? `${Math.floor((Date.now() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`
                            : 'Age N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={14} />
                        <span className="capitalize">{selectedPatient.gender}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} />
                        <span>{selectedPatient.phone || 'N/A'}</span>
                      </div>
                      {selectedPatient.bloodGroup && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Droplets size={14} />
                          <span>{selectedPatient.bloodGroup}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 p-2 bg-green-100 rounded-lg text-sm text-green-700">
                      <span className="font-medium">Note:</span> Age and gender have been auto-populated from patient records
                    </div>
                  </div>
                )}

                {/* Anthropometrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm) *</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age (years) *</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                    <select
                      value={isMale ? 'male' : 'female'}
                      onChange={(e) => setIsMale(e.target.value === 'male')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                {/* BMI Preview */}
                {bmiPreview && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">BMI: {bmiPreview.bmi}</p>
                      <p className="text-sm text-gray-600">{bmiPreview.category}</p>
                    </div>
                    {mustPreview && (
                      <div className={`px-4 py-2 rounded-lg ${
                        mustPreview.risk === 'low' ? 'bg-green-100 text-green-700' :
                        mustPreview.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <p className="font-medium">MUST Score: {mustPreview.totalScore}</p>
                        <p className="text-sm">Risk: {mustPreview.risk.toUpperCase()}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* MUST Components */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight Loss (% in 3-6 months)</label>
                    <input
                      type="number"
                      value={weightLossPercent}
                      onChange={(e) => setWeightLossPercent(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasAcuteIllness}
                        onChange={(e) => setHasAcuteIllness(e.target.checked)}
                      />
                      <span className="text-sm">Acutely ill</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={noIntakeExpected}
                        onChange={(e) => setNoIntakeExpected(e.target.checked)}
                      />
                      <span className="text-sm">No intake expected for &gt;5 days</span>
                    </label>
                  </div>
                </div>

                {/* Dietary Assessment */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appetite Level</label>
                    <select
                      value={appetiteLevel}
                      onChange={(e) => setAppetiteLevel(e.target.value as typeof appetiteLevel)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feeding Route</label>
                    <select
                      value={feedingRoute}
                      onChange={(e) => setFeedingRoute(e.target.value as FeedingRoute)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      {Object.entries(feedingRouteLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Intake (%)</label>
                    <input
                      type="number"
                      value={estimatedIntake}
                      onChange={(e) => setEstimatedIntake(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Requirements Modifiers */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stress Factor</label>
                    <select
                      value={stressFactor}
                      onChange={(e) => setStressFactor(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value={1.0}>Normal (1.0)</option>
                      <option value={1.2}>Mild stress (1.2)</option>
                      <option value={1.4}>Moderate stress (1.4)</option>
                      <option value={1.6}>Severe stress (1.6)</option>
                      <option value={2.0}>Burns/Critical (2.0)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Protein Needs</label>
                    <select
                      value={proteinCondition}
                      onChange={(e) => setProteinCondition(e.target.value as typeof proteinCondition)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="normal">Normal (0.8 g/kg)</option>
                      <option value="wound_healing">Wound Healing (1.5 g/kg)</option>
                      <option value="burns">Burns (2.0 g/kg)</option>
                      <option value="critical">Critical (1.5 g/kg)</option>
                      <option value="renal">Renal (0.6 g/kg)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssessment}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save Assessment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Plan Modal */}
      <AnimatePresence>
        {showMealPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowMealPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Utensils className="text-green-600" />
                  Create Meal Plan
                </h2>
                <button onClick={() => setShowMealPlanModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                  <PatientSelector
                    value={selectedPatientId}
                    onChange={(patientId) => setSelectedPatientId(patientId || '')}
                    placeholder="Select patient for meal plan..."
                  />
                  {selectedPatient && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                      <User size={16} className="text-green-600" />
                      <span className="text-sm text-green-700">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diet Type</label>
                  <select
                    value={mealPlanDietType}
                    onChange={(e) => setMealPlanDietType(e.target.value as DietType)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    {Object.entries(dietTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={mealPlanDuration}
                    onChange={(e) => setMealPlanDuration(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowMealPlanModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMealPlan}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
