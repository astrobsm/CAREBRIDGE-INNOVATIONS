/**
 * Pressure Sore Risk Assessment Component (Braden Scale)
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive Braden Scale scoring for pressure ulcer risk
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
  Bed,
  Activity,
  Droplets,
  HeartPulse,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// Braden Scale Categories
export interface BradenCategory {
  id: string;
  name: string;
  description: string;
  options: {
    score: number;
    label: string;
    description: string;
  }[];
}

export const bradenCategories: BradenCategory[] = [
  {
    id: 'sensory-perception',
    name: 'Sensory Perception',
    description: 'Ability to respond meaningfully to pressure-related discomfort',
    options: [
      { score: 1, label: 'Completely Limited', description: 'Unresponsive to painful stimuli, or limited ability to feel pain over most of body surface' },
      { score: 2, label: 'Very Limited', description: 'Responds only to painful stimuli. Cannot communicate discomfort except by moaning or restlessness' },
      { score: 3, label: 'Slightly Limited', description: 'Responds to verbal commands but cannot always communicate discomfort or need to be turned' },
      { score: 4, label: 'No Impairment', description: 'Responds to verbal commands. Has no sensory deficit which would limit ability to feel pain or discomfort' },
    ],
  },
  {
    id: 'moisture',
    name: 'Moisture',
    description: 'Degree to which skin is exposed to moisture',
    options: [
      { score: 1, label: 'Constantly Moist', description: 'Skin is kept moist almost constantly by perspiration, urine, etc. Dampness is detected every time patient is moved or turned' },
      { score: 2, label: 'Very Moist', description: 'Skin is often, but not always, moist. Linen must be changed at least once a shift' },
      { score: 3, label: 'Occasionally Moist', description: 'Skin is occasionally moist, requiring an extra linen change approximately once a day' },
      { score: 4, label: 'Rarely Moist', description: 'Skin is usually dry, linen only requires changing at routine intervals' },
    ],
  },
  {
    id: 'activity',
    name: 'Activity',
    description: 'Degree of physical activity',
    options: [
      { score: 1, label: 'Bedfast', description: 'Confined to bed' },
      { score: 2, label: 'Chairfast', description: 'Ability to walk severely limited or nonexistent. Cannot bear own weight and/or must be assisted into chair or wheelchair' },
      { score: 3, label: 'Walks Occasionally', description: 'Walks occasionally during day but for very short distances, with or without assistance. Spends majority of each shift in bed or chair' },
      { score: 4, label: 'Walks Frequently', description: 'Walks outside the room at least twice a day and inside room at least once every 2 hours during waking hours' },
    ],
  },
  {
    id: 'mobility',
    name: 'Mobility',
    description: 'Ability to change and control body position',
    options: [
      { score: 1, label: 'Completely Immobile', description: 'Does not make even slight changes in body or extremity position without assistance' },
      { score: 2, label: 'Very Limited', description: 'Makes occasional slight changes in body or extremity position but unable to make frequent or significant changes independently' },
      { score: 3, label: 'Slightly Limited', description: 'Makes frequent though slight changes in body or extremity position independently' },
      { score: 4, label: 'No Limitations', description: 'Makes major and frequent changes in position without assistance' },
    ],
  },
  {
    id: 'nutrition',
    name: 'Nutrition',
    description: 'Usual food intake pattern',
    options: [
      { score: 1, label: 'Very Poor', description: 'Never eats a complete meal. Rarely eats more than 1/3 of any food offered. Eats 2 servings or less of protein per day. Takes fluids poorly. Does not take a liquid dietary supplement OR is NPO and/or maintained on clear liquids or IVs for more than 5 days' },
      { score: 2, label: 'Probably Inadequate', description: 'Rarely eats a complete meal and generally eats only about 1/2 of any food offered. Protein intake includes only 3 servings of meat or dairy products per day. Occasionally will take a dietary supplement OR receives less than optimum amount of liquid diet or tube feeding' },
      { score: 3, label: 'Adequate', description: 'Eats over half of most meals. Eats a total of 4 servings of protein per day. Occasionally will refuse a meal, but will usually take a supplement if offered OR is on a tube feeding or TPN regimen which probably meets most of nutritional needs' },
      { score: 4, label: 'Excellent', description: 'Eats most of every meal. Never refuses a meal. Usually eats a total of 4 or more servings of meat and dairy products. Occasionally eats between meals. Does not require supplementation' },
    ],
  },
  {
    id: 'friction-shear',
    name: 'Friction and Shear',
    description: 'Friction and shear exposure',
    options: [
      { score: 1, label: 'Problem', description: 'Requires moderate to maximum assistance in moving. Complete lifting without sliding against sheets is impossible. Frequently slides down in bed or chair, requiring frequent repositioning with maximum assistance. Spasticity, contractures, or agitation leads to almost constant friction' },
      { score: 2, label: 'Potential Problem', description: 'Moves feebly or requires minimum assistance. During a move skin probably slides to some extent against sheets, chair, restraints, or other devices. Maintains relatively good position in chair or bed most of the time but occasionally slides down' },
      { score: 3, label: 'No Apparent Problem', description: 'Moves in bed and in chair independently and has sufficient muscle strength to lift up completely during move. Maintains good position in bed or chair at all times' },
    ],
  },
];

export interface PressureSoreAssessmentResult {
  totalScore: number;
  riskLevel: 'Very High' | 'High' | 'Moderate' | 'Mild' | 'No Risk';
  categoryScores: { [key: string]: number };
  recommendations: string[];
  preventionProtocol: string[];
  skinInspectionFrequency: string;
  repositioningFrequency: string;
  surfaceRecommendation: string;
  nutritionalIntervention: boolean;
}

interface Props {
  onAssessmentComplete?: (result: PressureSoreAssessmentResult) => void;
  initialScores?: { [key: string]: number };
  readOnly?: boolean;
  patientInfo?: {
    name: string;
    hospitalNumber: string;
    gender: string;
  };
}

export default function PressureSoreAssessment({
  onAssessmentComplete,
  initialScores = {},
  readOnly = false,
  patientInfo,
}: Props) {
  const [categoryScores, setCategoryScores] = useState<{ [key: string]: number }>(initialScores);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['sensory-perception', 'mobility']);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Calculate total score and generate recommendations
  const assessment = useMemo((): PressureSoreAssessmentResult => {
    const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    
    let riskLevel: PressureSoreAssessmentResult['riskLevel'];
    let recommendations: string[] = [];
    let preventionProtocol: string[] = [];
    let skinInspectionFrequency: string = '';
    let repositioningFrequency: string = '';
    let surfaceRecommendation: string = '';
    let nutritionalIntervention = false;

    // Risk stratification based on Braden Score (max score is 23)
    if (totalScore <= 9) {
      riskLevel = 'Very High';
      skinInspectionFrequency = 'Every shift (8-hourly) with documentation';
      repositioningFrequency = 'Every 2 hours - strict adherence required';
      surfaceRecommendation = 'Dynamic pressure-relieving mattress (alternating air or low air loss)';
      nutritionalIntervention = true;
      recommendations = [
        'MANDATORY pressure-relieving mattress - do not delay',
        'Strict 2-hourly repositioning schedule with documentation',
        'Skin inspection every shift - document ALL findings',
        'Immediate dietician referral for nutritional optimization',
        'Consider wound care nurse consultation',
        'Heel offloading devices (pillows or heel protectors)',
        'Barrier creams to protect from moisture',
        'Incontinence management plan if applicable',
      ];
      preventionProtocol = [
        'Place patient on alternating pressure/low air loss mattress immediately',
        'Use draw sheets for repositioning - avoid dragging',
        'Keep head of bed at lowest safe angle (avoid >30° if possible)',
        'Place pillows between bony prominences',
        'Use heel suspension devices',
        'Apply moisture barrier cream to sacrum/buttocks',
        'Change incontinence products immediately when soiled',
        'Document all repositioning times and positions',
      ];
    } else if (totalScore <= 12) {
      riskLevel = 'High';
      skinInspectionFrequency = 'Every shift with documentation';
      repositioningFrequency = 'Every 2 hours';
      surfaceRecommendation = 'Pressure-redistributing foam mattress or alternating pressure mattress';
      nutritionalIntervention = true;
      recommendations = [
        'Pressure-redistributing mattress required',
        '2-hourly repositioning schedule',
        'Daily skin inspection focusing on pressure points',
        'Dietician review for nutritional status',
        'Heel protection devices',
        'Use of slide sheets for transfers',
        'Moisture management plan',
      ];
      preventionProtocol = [
        'Place on pressure-redistributing mattress',
        'Reposition every 2 hours using 30° lateral tilt',
        'Inspect sacrum, heels, elbows at each position change',
        'Keep skin clean and dry',
        'Use barrier products for moisture',
        'Avoid massage over bony prominences',
        'Ensure adequate protein intake',
      ];
    } else if (totalScore <= 14) {
      riskLevel = 'Moderate';
      skinInspectionFrequency = 'Daily with focus on at-risk areas';
      repositioningFrequency = 'Every 2-4 hours';
      surfaceRecommendation = 'Pressure-redistributing foam mattress or overlay';
      nutritionalIntervention = categoryScores['nutrition'] <= 2;
      recommendations = [
        'High-specification foam mattress recommended',
        'Regular repositioning every 2-4 hours',
        'Daily skin assessment',
        'Encourage mobility and self-repositioning where possible',
        'Monitor nutritional intake',
        'Educate patient and family on pressure ulcer prevention',
      ];
      preventionProtocol = [
        'Assess need for pressure-redistributing mattress',
        'Establish repositioning schedule',
        'Conduct daily skin inspections',
        'Encourage patient participation in care',
        'Monitor dietary intake',
        'Use appropriate seating cushions if chairfast',
      ];
    } else if (totalScore <= 18) {
      riskLevel = 'Mild';
      skinInspectionFrequency = 'On admission and with each position change';
      repositioningFrequency = 'Every 4 hours or as needed';
      surfaceRecommendation = 'Standard hospital mattress with assessment for foam overlay';
      nutritionalIntervention = false;
      recommendations = [
        'Maintain standard mattress unless condition changes',
        'Encourage frequent position changes',
        'Regular skin assessment on position changes',
        'Promote mobility and ambulation',
        'Ensure adequate nutrition and hydration',
      ];
      preventionProtocol = [
        'Skin inspection on position changes',
        'Encourage self-repositioning',
        'Promote ambulation',
        'Standard nutritional support',
        'Reassess if condition changes',
      ];
    } else {
      riskLevel = 'No Risk';
      skinInspectionFrequency = 'On admission and as clinically indicated';
      repositioningFrequency = 'Self-repositioning / as needed';
      surfaceRecommendation = 'Standard hospital mattress';
      nutritionalIntervention = false;
      recommendations = [
        'No specific pressure ulcer prevention protocol required',
        'Maintain standard care and mobility',
        'Reassess if condition changes',
        'Document baseline skin assessment',
      ];
      preventionProtocol = [
        'Standard nursing care',
        'Encourage continued mobility',
        'Reassess weekly or with condition change',
      ];
    }

    return {
      totalScore,
      riskLevel,
      categoryScores,
      recommendations,
      preventionProtocol,
      skinInspectionFrequency,
      repositioningFrequency,
      surfaceRecommendation,
      nutritionalIntervention,
    };
  }, [categoryScores]);

  // Notify parent - call when all categories are complete
  const notifyParent = () => {
    if (onAssessmentComplete && Object.keys(categoryScores).length === bradenCategories.length) {
      onAssessmentComplete(assessment);
    }
  };
  void notifyParent;

  const handleScoreChange = (categoryId: string, score: number) => {
    if (readOnly) return;
    setCategoryScores(prev => ({ ...prev, [categoryId]: score }));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Very High': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Mild': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'No Risk': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completionPercentage = (Object.keys(categoryScores).length / bradenCategories.length) * 100;

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(139, 92, 246); // Purple for pressure sore
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Pressure Sore Risk Assessment', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Braden Scale - AstroHEALTH Innovations in Healthcare', pageWidth / 2, 30, { align: 'center' });
    
    yPos = 50;

    // Patient Info
    if (patientInfo) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(245, 243, 255);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text(`Patient: ${patientInfo.name}`, 20, yPos + 10);
      doc.text(`Hospital No: ${patientInfo.hospitalNumber}`, 20, yPos + 18);
      doc.text(`Date: ${format(new Date(), 'PPpp')}`, pageWidth - 60, yPos + 10);
      yPos += 35;
    }

    // Score Badge
    const riskColor = assessment.riskLevel === 'Very High' ? [220, 38, 38] :
                      assessment.riskLevel === 'High' ? [249, 115, 22] :
                      assessment.riskLevel === 'Moderate' ? [234, 179, 8] :
                      assessment.riskLevel === 'Mild' ? [59, 130, 246] :
                      [34, 197, 94];
    doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Braden Score: ${assessment.totalScore}/23`, pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${assessment.riskLevel} Risk for Pressure Ulcer Development`, pageWidth / 2, yPos + 22, { align: 'center' });
    yPos += 40;

    // Category Scores
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Scores:', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    bradenCategories.forEach(category => {
      const score = categoryScores[category.id] || 0;
      const maxScore = category.id === 'friction-shear' ? 3 : 4;
      const option = category.options.find(o => o.score === score);
      doc.text(`• ${category.name}: ${score}/${maxScore} - ${option?.label || 'Not assessed'}`, 20, yPos);
      yPos += 6;
    });
    yPos += 5;

    // Key Interventions
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Key Interventions:', 20, yPos + 8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Skin Inspection: ${assessment.skinInspectionFrequency}`, 20, yPos + 16);
    doc.text(`Repositioning: ${assessment.repositioningFrequency}`, 20, yPos + 23);
    doc.text(`Surface: ${assessment.surfaceRecommendation}`, 20, yPos + 30);
    yPos += 45;

    // Prevention Protocol
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Prevention Protocol:', 15, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    assessment.preventionProtocol.forEach(step => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const lines = doc.splitTextToSize(`✓ ${step}`, pageWidth - 40);
      lines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    });

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('Reassess Braden Score weekly or with significant change in condition', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Pressure-Sore-Assessment-${patientInfo?.hospitalNumber || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Bed className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Pressure Sore Risk Assessment</h3>
            <p className="text-xs text-gray-500">Braden Scale for Predicting Pressure Ulcer Risk</p>
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
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Score Display */}
      {completionPercentage === 100 && (
        <div className={`p-4 rounded-lg border-2 ${getRiskColor(assessment.riskLevel)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {assessment.riskLevel === 'Very High' && <AlertTriangle className="w-5 h-5" />}
                {assessment.riskLevel === 'No Risk' && <CheckCircle2 className="w-5 h-5" />}
                <span className="text-2xl font-bold">{assessment.totalScore}</span>
                <span className="text-sm font-medium">/ 23 points</span>
              </div>
              <p className="text-sm font-medium">{assessment.riskLevel} Risk</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Reposition</p>
              <p className="text-lg font-bold">{assessment.repositioningFrequency.split(' ')[0]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Assessments */}
      <div className="space-y-2">
        {bradenCategories.map(category => {
          const isComplete = categoryScores[category.id] !== undefined;
          const selectedOption = category.options.find(o => o.score === categoryScores[category.id]);
          
          return (
            <div key={category.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className={`w-full flex items-center justify-between p-3 transition-colors ${
                  isComplete ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`font-medium text-sm ${isComplete ? 'text-purple-800' : 'text-gray-700'}`}>
                    {category.name}
                  </span>
                  {isComplete && (
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                      {categoryScores[category.id]} - {selectedOption?.label}
                    </span>
                  )}
                </div>
                {expandedCategories.includes(category.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              <AnimatePresence>
                {expandedCategories.includes(category.id) && (
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
                              ? 'bg-purple-100 border-2 border-purple-400'
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
                            className="mt-1 w-4 h-4 text-purple-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                option.score === 1 ? 'bg-red-100 text-red-700' :
                                option.score === 2 ? 'bg-orange-100 text-orange-700' :
                                option.score === 3 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {option.score} pt{option.score > 1 ? 's' : ''}
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
      </div>

      {/* Recommendations Section */}
      {completionPercentage === 100 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">Prevention Protocol</span>
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
                  {/* Key Interventions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity size={14} className="text-blue-600" />
                        <p className="text-xs font-medium text-blue-800">Skin Inspection</p>
                      </div>
                      <p className="text-sm text-blue-700">{assessment.skinInspectionFrequency}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Bed size={14} className="text-orange-600" />
                        <p className="text-xs font-medium text-orange-800">Repositioning</p>
                      </div>
                      <p className="text-sm text-orange-700">{assessment.repositioningFrequency}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Droplets size={14} className="text-purple-600" />
                        <p className="text-xs font-medium text-purple-800">Surface</p>
                      </div>
                      <p className="text-sm text-purple-700">{assessment.surfaceRecommendation}</p>
                    </div>
                  </div>

                  {/* Nutritional Alert */}
                  {assessment.nutritionalIntervention && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-800">
                          Nutritional intervention recommended - refer to dietician
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prevention Steps */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Prevention Protocol:</p>
                    {assessment.preventionProtocol.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
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
