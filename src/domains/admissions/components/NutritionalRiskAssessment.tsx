/**
 * Nutritional Risk Assessment Component (MUST Score)
 * AstroHEALTH Innovations in Healthcare
 * 
 * Malnutrition Universal Screening Tool (MUST)
 * For use in patient admission workflow
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Apple,
  Scale,
  TrendingDown,
  Stethoscope,
  Utensils,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// MUST Score Categories
export interface MUSTCategory {
  id: string;
  name: string;
  description: string;
  options: {
    score: number;
    label: string;
    description: string;
  }[];
}

export const mustCategories: MUSTCategory[] = [
  {
    id: 'bmi-score',
    name: 'BMI Score',
    description: 'Body Mass Index assessment',
    options: [
      { score: 0, label: 'BMI > 20 kg/m²', description: 'Normal weight range' },
      { score: 1, label: 'BMI 18.5 - 20 kg/m²', description: 'Borderline low weight' },
      { score: 2, label: 'BMI < 18.5 kg/m²', description: 'Underweight - significant malnutrition risk' },
    ],
  },
  {
    id: 'weight-loss',
    name: 'Unplanned Weight Loss',
    description: 'Weight loss in the past 3-6 months',
    options: [
      { score: 0, label: '< 5% weight loss', description: 'Minimal or no unplanned weight loss' },
      { score: 1, label: '5-10% weight loss', description: 'Moderate unplanned weight loss' },
      { score: 2, label: '> 10% weight loss', description: 'Severe unplanned weight loss' },
    ],
  },
  {
    id: 'acute-disease',
    name: 'Acute Disease Effect',
    description: 'Is patient acutely ill AND has there been or is there likely to be no nutritional intake for >5 days?',
    options: [
      { score: 0, label: 'No', description: 'Patient is not acutely ill OR is eating adequately' },
      { score: 2, label: 'Yes', description: 'Acutely ill with no/minimal intake for >5 days' },
    ],
  },
];

export interface NutritionalAssessmentResult {
  bmi: number;
  bmiCategory: string;
  mustScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  categoryScores: { [key: string]: number };
  recommendations: string[];
  dietaryActions: string[];
  referralNeeded: boolean;
  monitoringFrequency: string;
  caloricTarget?: number;
  proteinTarget?: number;
}

interface Props {
  patientWeight?: number; // kg
  patientHeight?: number; // cm
  previousWeight?: number; // kg (3-6 months ago)
  onAssessmentComplete?: (result: NutritionalAssessmentResult) => void;
  initialScores?: { [key: string]: number };
  readOnly?: boolean;
  patientInfo?: {
    name: string;
    hospitalNumber: string;
    gender: string;
    age?: number;
  };
}

export default function NutritionalRiskAssessment({
  patientWeight,
  patientHeight,
  previousWeight,
  onAssessmentComplete,
  initialScores = {},
  readOnly = false,
  patientInfo,
}: Props) {
  const [weight, setWeight] = useState<number | undefined>(patientWeight);
  const [height, setHeight] = useState<number | undefined>(patientHeight);
  const [prevWeight, setPrevWeight] = useState<number | undefined>(previousWeight);
  const [categoryScores, setCategoryScores] = useState<{ [key: string]: number }>(initialScores);
  const [expandedSections, setExpandedSections] = useState<string[]>(['measurements', 'weight-loss']);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Calculate BMI
  const bmi = useMemo(() => {
    if (weight && height) {
      const heightInMeters = height / 100;
      return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
    }
    return 0;
  }, [weight, height]);

  // Calculate weight loss percentage
  const weightLossPercent = useMemo(() => {
    if (weight && prevWeight && prevWeight > weight) {
      return parseFloat((((prevWeight - weight) / prevWeight) * 100).toFixed(1));
    }
    return 0;
  }, [weight, prevWeight]);

  // Auto-calculate BMI score - computed value only
  const suggestedBmiScore = useMemo(() => {
    if (bmi > 0) {
      if (bmi < 18.5) return 2;
      if (bmi <= 20) return 1;
    }
    return 0;
  }, [bmi]);
  void suggestedBmiScore;

  // Auto-suggest weight loss score - computed value only  
  const suggestedWeightLossScore = useMemo(() => {
    if (weightLossPercent > 10) return 2;
    if (weightLossPercent >= 5) return 1;
    return 0;
  }, [weightLossPercent]);
  void suggestedWeightLossScore;

  // Calculate assessment results
  const assessment = useMemo((): NutritionalAssessmentResult => {
    const mustScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    
    // BMI Category
    let bmiCategory = '';
    if (bmi < 16) bmiCategory = 'Severe Underweight';
    else if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Normal';
    else if (bmi < 30) bmiCategory = 'Overweight';
    else if (bmi < 35) bmiCategory = 'Obese Class I';
    else if (bmi < 40) bmiCategory = 'Obese Class II';
    else bmiCategory = 'Obese Class III';

    let riskLevel: NutritionalAssessmentResult['riskLevel'];
    let recommendations: string[] = [];
    let dietaryActions: string[] = [];
    let referralNeeded = false;
    let monitoringFrequency = '';
    let caloricTarget: number | undefined;
    let proteinTarget: number | undefined;

    // Calculate caloric and protein targets
    if (weight) {
      // Basic Harris-Benedict approximation - adjust in clinical practice
      const baseCalories = weight * 25; // 25-30 kcal/kg for hospitalized patients
      const stressedCalories = weight * 30; // Add stress factor for illness
      
      caloricTarget = mustScore >= 2 ? stressedCalories : baseCalories;
      proteinTarget = mustScore >= 2 ? weight * 1.5 : weight * 1.2; // 1.2-1.5 g/kg protein
    }

    // Risk stratification based on MUST score
    if (mustScore === 0) {
      riskLevel = 'Low';
      monitoringFrequency = 'Weekly in hospital, monthly in community';
      recommendations = [
        'Routine clinical care',
        'Repeat screening weekly during hospital stay',
        'Repeat screening monthly if in community/outpatient',
        'Document dietary intake if concern arises',
      ];
      dietaryActions = [
        'Regular hospital diet appropriate for condition',
        'Encourage three balanced meals daily',
        'Ensure adequate fluid intake (1.5-2L/day unless restricted)',
        'Food first approach - optimize regular meals',
      ];
    } else if (mustScore === 1) {
      riskLevel = 'Medium';
      monitoringFrequency = 'Weekly weight and intake monitoring';
      referralNeeded = false;
      recommendations = [
        'OBSERVE - Document dietary intake for 3 days',
        'Weekly weight monitoring',
        'If intake adequate: continue observation',
        'If intake inadequate: refer to dietician',
        'Set goals to improve intake',
        'Review medication that may affect appetite',
      ];
      dietaryActions = [
        'Food fortification - add extra calories to meals',
        'Encourage nutrient-dense snacks between meals',
        'Consider oral nutritional supplements if intake <75%',
        'Texture modification if swallowing difficulty',
        'Smaller, more frequent meals if poor appetite',
        'Increase protein portions at each meal',
      ];
    } else {
      riskLevel = 'High';
      monitoringFrequency = 'Daily weight and intake monitoring';
      referralNeeded = true;
      recommendations = [
        'TREAT - Urgent dietician referral required',
        'Daily weight monitoring',
        'Document all food and fluid intake',
        'Commence oral nutritional supplements (ONS)',
        'Consider enteral feeding if oral intake inadequate',
        'Multi-disciplinary team involvement',
        'Address underlying causes of malnutrition',
        'Review regularly until MUST score improves',
      ];
      dietaryActions = [
        'High-calorie, high-protein diet',
        'Oral nutritional supplements 2-3 times daily',
        'Food fortification with butter, cream, oils',
        'Protein-rich Nigerian foods: eggs, fish, beans, meat',
        'Energy-dense traditional foods: groundnuts, palm oil dishes',
        'Fortified pap (Ogi) with milk, eggs, groundnut',
        'Consider NG tube if oral intake <50% for >5 days',
        'Refeeding syndrome monitoring if severely malnourished',
      ];
    }

    return {
      bmi,
      bmiCategory,
      mustScore,
      riskLevel,
      categoryScores,
      recommendations,
      dietaryActions,
      referralNeeded,
      monitoringFrequency,
      caloricTarget,
      proteinTarget,
    };
  }, [categoryScores, bmi, weight]);

  // Notify parent - call when assessment is complete
  const notifyParent = () => {
    if (onAssessmentComplete && Object.keys(categoryScores).length === mustCategories.length) {
      onAssessmentComplete(assessment);
    }
  };
  void notifyParent;

  const handleScoreChange = (categoryId: string, score: number) => {
    if (readOnly) return;
    setCategoryScores(prev => ({ ...prev, [categoryId]: score }));
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completionPercentage = useMemo(() => {
    const hasMeasurements = weight && height;
    const hasAllScores = Object.keys(categoryScores).length === mustCategories.length;
    if (hasMeasurements && hasAllScores) return 100;
    if (hasMeasurements) return 50 + (Object.keys(categoryScores).length / mustCategories.length) * 50;
    return (Object.keys(categoryScores).length / mustCategories.length) * 50;
  }, [weight, height, categoryScores]);

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Nutritional Risk Assessment', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('MUST Score - AstroHEALTH Innovations in Healthcare', pageWidth / 2, 30, { align: 'center' });
    
    yPos = 50;

    // Patient Info
    if (patientInfo) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text(`Patient: ${patientInfo.name}`, 20, yPos + 10);
      doc.text(`Hospital No: ${patientInfo.hospitalNumber}`, 20, yPos + 18);
      doc.text(`Date: ${format(new Date(), 'PPpp')}`, pageWidth - 60, yPos + 10);
      yPos += 35;
    }

    // Anthropometrics
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text(`Weight: ${weight || '-'} kg`, 20, yPos + 10);
    doc.text(`Height: ${height || '-'} cm`, 70, yPos + 10);
    doc.text(`BMI: ${bmi || '-'} kg/m² (${assessment.bmiCategory})`, 120, yPos + 10);
    if (weightLossPercent > 0) {
      doc.text(`Weight Loss: ${weightLossPercent}% in 3-6 months`, 20, yPos + 18);
    }
    yPos += 35;

    // Score Badge
    const riskColor = assessment.riskLevel === 'High' ? [220, 38, 38] :
                      assessment.riskLevel === 'Medium' ? [234, 179, 8] :
                      [34, 197, 94];
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`MUST Score: ${assessment.mustScore}`, pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${assessment.riskLevel} Risk of Malnutrition`, pageWidth / 2, yPos + 22, { align: 'center' });
    yPos += 40;

    // Nutritional Targets
    if (assessment.caloricTarget && assessment.proteinTarget) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Daily Nutritional Targets:', 20, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Calories: ${Math.round(assessment.caloricTarget)} kcal/day`, 20, yPos + 15);
      doc.text(`Protein: ${Math.round(assessment.proteinTarget)} g/day`, 100, yPos + 15);
      yPos += 28;
    }

    // Dietary Actions
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Dietary Actions:', 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    assessment.dietaryActions.forEach(action => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const lines = doc.splitTextToSize(`• ${action}`, pageWidth - 40);
      lines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    });
    yPos += 5;

    // Recommendations
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Management Plan:', 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    assessment.recommendations.forEach(rec => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const lines = doc.splitTextToSize(`✓ ${rec}`, pageWidth - 40);
      lines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    });

    // Referral Alert
    if (assessment.referralNeeded) {
      yPos += 5;
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(15, yPos, pageWidth - 30, 15, 3, 3, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠️ URGENT DIETICIAN REFERRAL REQUIRED', pageWidth / 2, yPos + 10, { align: 'center' });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text(`Monitoring: ${assessment.monitoringFrequency}`, pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Nutritional-Assessment-${patientInfo?.hospitalNumber || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Apple className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Nutritional Risk Assessment</h3>
            <p className="text-xs text-gray-500">Malnutrition Universal Screening Tool (MUST)</p>
          </div>
        </div>
        <button
          onClick={generatePDF}
          disabled={completionPercentage < 100}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            completionPercentage < 100
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <Download size={14} />
          PDF
        </button>
      </div>

      {/* Completion Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Assessment Progress</span>
          <span className="font-medium">{Math.round(completionPercentage)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Anthropometric Measurements */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('measurements')}
          className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Anthropometric Measurements</span>
            {weight && height && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                BMI: {bmi} kg/m²
              </span>
            )}
          </div>
          {expandedSections.includes('measurements') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        <AnimatePresence>
          {expandedSections.includes('measurements') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (kg) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight || ''}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || undefined)}
                      disabled={readOnly}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., 70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={height || ''}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || undefined)}
                      disabled={readOnly}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., 170"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Previous Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={prevWeight || ''}
                      onChange={(e) => setPrevWeight(parseFloat(e.target.value) || undefined)}
                      disabled={readOnly}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="3-6 months ago"
                    />
                  </div>
                </div>

                {/* BMI Display */}
                {bmi > 0 && (
                  <div className={`p-3 rounded-lg ${
                    bmi < 18.5 ? 'bg-red-50 border border-red-200' :
                    bmi < 20 ? 'bg-yellow-50 border border-yellow-200' :
                    bmi < 25 ? 'bg-green-50 border border-green-200' :
                    bmi < 30 ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Calculated BMI</p>
                        <p className="text-2xl font-bold">{bmi} kg/m²</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{assessment.bmiCategory}</p>
                        {weightLossPercent > 0 && (
                          <p className="text-sm text-red-600">
                            ↓ {weightLossPercent}% weight loss
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MUST Score Categories */}
      {mustCategories.map(category => {
        const isComplete = categoryScores[category.id] !== undefined;
        const selectedOption = category.options.find(o => o.score === categoryScores[category.id]);
        void selectedOption;
        const Icon = category.id === 'bmi-score' ? Scale :
                     category.id === 'weight-loss' ? TrendingDown :
                     Stethoscope;
        
        return (
          <div key={category.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(category.id)}
              className={`w-full flex items-center justify-between p-3 transition-colors ${
                isComplete ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Icon className="w-4 h-4 text-gray-400" />
                )}
                <span className={`font-medium text-sm ${isComplete ? 'text-green-800' : 'text-gray-700'}`}>
                  {category.name}
                </span>
                {isComplete && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    categoryScores[category.id] === 0 ? 'bg-green-100 text-green-700' :
                    categoryScores[category.id] === 1 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Score: {categoryScores[category.id]}
                  </span>
                )}
              </div>
              {expandedSections.includes(category.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            <AnimatePresence>
              {expandedSections.includes(category.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2 bg-white">
                    <p className="text-xs text-gray-500 mb-3">{category.description}</p>
                    {category.options.map(option => (
                      <label
                        key={option.score}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          categoryScores[category.id] === option.score
                            ? 'bg-green-100 border-2 border-green-400'
                            : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                        } ${readOnly ? 'cursor-default' : ''}`}
                      >
                        <input
                          type="radio"
                          name={category.id}
                          value={option.score}
                          checked={categoryScores[category.id] === option.score}
                          onChange={() => handleScoreChange(category.id, option.score)}
                          disabled={readOnly}
                          className="mt-1 w-4 h-4 text-green-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                              option.score === 0 ? 'bg-green-100 text-green-700' :
                              option.score === 1 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {option.score} pt{option.score !== 1 ? 's' : ''}
                            </span>
                            <span className="font-medium text-sm">{option.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Score Display */}
      {completionPercentage === 100 && (
        <div className={`p-4 rounded-lg border-2 ${getRiskColor(assessment.riskLevel)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {assessment.riskLevel === 'High' && <AlertTriangle className="w-5 h-5" />}
                {assessment.riskLevel === 'Low' && <CheckCircle2 className="w-5 h-5" />}
                <span className="text-2xl font-bold">{assessment.mustScore}</span>
                <span className="text-sm font-medium">MUST Score</span>
              </div>
              <p className="text-sm font-medium">{assessment.riskLevel} Risk of Malnutrition</p>
            </div>
            <div className="text-right">
              {assessment.caloricTarget && (
                <>
                  <p className="text-sm font-medium">Daily Target</p>
                  <p className="text-lg font-bold">{Math.round(assessment.caloricTarget)} kcal</p>
                  <p className="text-xs">{Math.round(assessment.proteinTarget || 0)}g protein</p>
                </>
              )}
            </div>
          </div>
          
          {assessment.referralNeeded && (
            <div className="mt-3 p-2 bg-red-200 rounded-lg">
              <p className="text-sm font-bold text-red-800 text-center">
                ⚠️ URGENT DIETICIAN REFERRAL REQUIRED
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {completionPercentage === 100 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Dietary Recommendations</span>
            </div>
            {showRecommendations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          <AnimatePresence>
            {showRecommendations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Monitoring Frequency */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">Monitoring Frequency</p>
                    <p className="text-sm text-blue-700">{assessment.monitoringFrequency}</p>
                  </div>

                  {/* Dietary Actions */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Dietary Actions:</p>
                    <div className="space-y-2">
                      {assessment.dietaryActions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Utensils className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Management Plan */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Management Plan:</p>
                    <div className="space-y-2">
                      {assessment.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
