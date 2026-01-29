// Discharge Readiness Assessment Component
// Clinical scoring system to assess patient readiness for discharge

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Activity,
  Heart,
  Wind,
  Utensils,
  Brain,
  Users,
  Home,
  Pill,
  Badge,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from 'lucide-react';
import type { Admission, Patient } from '../../../types';

interface AssessmentCriterion {
  id: string;
  category: string;
  criterion: string;
  weight: number;
  options: Array<{
    label: string;
    score: number;
    description?: string;
  }>;
  selectedScore?: number;
}

interface Props {
  admission: Admission;
  patient: Patient;
  onComplete: (assessment: { score: number; maxScore: number; criteria: AssessmentCriterion[] }) => void;
  onClose: () => void;
}

const initialCriteria: AssessmentCriterion[] = [
  // Vital Signs Stability
  {
    id: 'vitals-temp',
    category: 'Vital Signs',
    criterion: 'Temperature',
    weight: 1,
    options: [
      { label: 'Normal (36.1-37.2°C) for 24+ hours', score: 2 },
      { label: 'Low-grade fever (37.3-38°C)', score: 1 },
      { label: 'Fever (>38°C) or hypothermia', score: 0 },
    ],
  },
  {
    id: 'vitals-bp',
    category: 'Vital Signs',
    criterion: 'Blood Pressure',
    weight: 1,
    options: [
      { label: 'Stable and within target range', score: 2 },
      { label: 'Slightly elevated/low but stable', score: 1 },
      { label: 'Unstable or requiring IV medications', score: 0 },
    ],
  },
  {
    id: 'vitals-hr',
    category: 'Vital Signs',
    criterion: 'Heart Rate',
    weight: 1,
    options: [
      { label: 'Normal (60-100 bpm) and regular', score: 2 },
      { label: 'Mildly tachycardic/bradycardic but stable', score: 1 },
      { label: 'Significant arrhythmia or unstable', score: 0 },
    ],
  },
  {
    id: 'vitals-rr',
    category: 'Vital Signs',
    criterion: 'Respiratory Status',
    weight: 1.5,
    options: [
      { label: 'Room air SpO2 ≥95%, RR normal', score: 2 },
      { label: 'Low-flow O2 requirement (<4L)', score: 1 },
      { label: 'High O2 needs or respiratory distress', score: 0 },
    ],
  },

  // Pain Management
  {
    id: 'pain-control',
    category: 'Pain Management',
    criterion: 'Pain Control',
    weight: 1.5,
    options: [
      { label: 'Well controlled on oral medications (Pain ≤3/10)', score: 2 },
      { label: 'Moderate pain, manageable (Pain 4-6/10)', score: 1 },
      { label: 'Severe/uncontrolled pain or IV analgesics needed', score: 0 },
    ],
  },

  // Nutrition & Hydration
  {
    id: 'oral-intake',
    category: 'Nutrition',
    criterion: 'Oral Intake',
    weight: 1,
    options: [
      { label: 'Tolerating regular diet and fluids', score: 2 },
      { label: 'Tolerating liquids/soft diet', score: 1 },
      { label: 'Poor intake or NPO/NG tube', score: 0 },
    ],
  },
  {
    id: 'hydration',
    category: 'Nutrition',
    criterion: 'Hydration Status',
    weight: 1,
    options: [
      { label: 'Well hydrated, off IV fluids', score: 2 },
      { label: 'Receiving maintenance IV fluids', score: 1 },
      { label: 'Dehydrated or fluid overloaded', score: 0 },
    ],
  },

  // Elimination
  {
    id: 'bowel',
    category: 'Elimination',
    criterion: 'Bowel Function',
    weight: 0.5,
    options: [
      { label: 'Normal bowel movements', score: 2 },
      { label: 'Constipated but manageable at home', score: 1 },
      { label: 'Ileus, severe constipation, or diarrhea', score: 0 },
    ],
  },
  {
    id: 'urinary',
    category: 'Elimination',
    criterion: 'Urinary Function',
    weight: 0.5,
    options: [
      { label: 'Voiding normally', score: 2 },
      { label: 'Catheter with plan for removal/home', score: 1 },
      { label: 'Retention or renal concerns', score: 0 },
    ],
  },

  // Wound/Surgical Site
  {
    id: 'wound-status',
    category: 'Wound Care',
    criterion: 'Wound/Surgical Site',
    weight: 1,
    options: [
      { label: 'Clean, dry, healing well', score: 2 },
      { label: 'Minor concerns, manageable at home', score: 1 },
      { label: 'Signs of infection or dehiscence', score: 0 },
    ],
  },
  {
    id: 'drains',
    category: 'Wound Care',
    criterion: 'Drains/Tubes',
    weight: 0.5,
    options: [
      { label: 'No drains or all removed', score: 2 },
      { label: 'Drains in place, patient/family trained', score: 1 },
      { label: 'Complex drain management needed', score: 0 },
    ],
  },

  // Mobility
  {
    id: 'mobility',
    category: 'Functional Status',
    criterion: 'Mobility',
    weight: 1,
    options: [
      { label: 'Independent or baseline mobility', score: 2 },
      { label: 'Requires assistance, caregiver available', score: 1 },
      { label: 'Unable to mobilize safely', score: 0 },
    ],
  },
  {
    id: 'adl',
    category: 'Functional Status',
    criterion: 'Activities of Daily Living',
    weight: 1,
    options: [
      { label: 'Independent in ADLs', score: 2 },
      { label: 'Needs assistance, caregiver available', score: 1 },
      { label: 'Dependent, no adequate support', score: 0 },
    ],
  },

  // Cognition & Mental Status
  {
    id: 'cognition',
    category: 'Mental Status',
    criterion: 'Cognitive Status',
    weight: 1,
    options: [
      { label: 'Alert, oriented, baseline mental status', score: 2 },
      { label: 'Mild confusion, improving', score: 1 },
      { label: 'Significant confusion or delirium', score: 0 },
    ],
  },

  // Social & Discharge Planning
  {
    id: 'caregiver',
    category: 'Social Support',
    criterion: 'Caregiver Availability',
    weight: 1.5,
    options: [
      { label: 'Adequate caregiver support available', score: 2 },
      { label: 'Limited support, will manage', score: 1 },
      { label: 'No support, unsafe discharge', score: 0 },
    ],
  },
  {
    id: 'home-env',
    category: 'Social Support',
    criterion: 'Home Environment',
    weight: 1,
    options: [
      { label: 'Safe and appropriate for needs', score: 2 },
      { label: 'Minor modifications possible', score: 1 },
      { label: 'Unsafe or inappropriate', score: 0 },
    ],
  },
  {
    id: 'education',
    category: 'Discharge Education',
    criterion: 'Patient/Family Education',
    weight: 1.5,
    options: [
      { label: 'Fully educated, demonstrates understanding', score: 2 },
      { label: 'Partially educated, needs reinforcement', score: 1 },
      { label: 'Unable to understand or education incomplete', score: 0 },
    ],
  },
  {
    id: 'medications',
    category: 'Discharge Education',
    criterion: 'Medication Understanding',
    weight: 1.5,
    options: [
      { label: 'Understands all medications', score: 2 },
      { label: 'Needs written reminder/pill organizer', score: 1 },
      { label: 'High risk of medication errors', score: 0 },
    ],
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  'Vital Signs': Activity,
  'Pain Management': Heart,
  'Nutrition': Utensils,
  'Elimination': Wind,
  'Wound Care': Badge,
  'Functional Status': Users,
  'Mental Status': Brain,
  'Social Support': Home,
  'Discharge Education': Pill,
};

export default function DischargeReadinessAssessment({ admission, patient, onComplete, onClose }: Props) {
  const [criteria, setCriteria] = useState<AssessmentCriterion[]>(initialCriteria);
  const [activeCategory, setActiveCategory] = useState<string>('Vital Signs');

  // Group criteria by category
  const categories = useMemo(() => {
    const cats = new Map<string, AssessmentCriterion[]>();
    criteria.forEach(c => {
      if (!cats.has(c.category)) {
        cats.set(c.category, []);
      }
      cats.get(c.category)!.push(c);
    });
    return cats;
  }, [criteria]);

  // Calculate scores
  const scores = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;
    let answeredCount = 0;
    let criticalIssues = 0;

    criteria.forEach(c => {
      const weightedMax = 2 * c.weight;
      maxScore += weightedMax;

      if (c.selectedScore !== undefined) {
        totalScore += c.selectedScore * c.weight;
        answeredCount++;
        if (c.selectedScore === 0) criticalIssues++;
      }
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const isComplete = answeredCount === criteria.length;

    // Readiness determination
    let readinessLevel: 'ready' | 'conditional' | 'not-ready';
    let readinessMessage: string;

    if (percentage >= 85 && criticalIssues === 0) {
      readinessLevel = 'ready';
      readinessMessage = 'Patient meets discharge criteria';
    } else if (percentage >= 70 && criticalIssues <= 1) {
      readinessLevel = 'conditional';
      readinessMessage = 'Conditional discharge - address concerns first';
    } else {
      readinessLevel = 'not-ready';
      readinessMessage = 'Patient not ready for discharge';
    }

    return {
      totalScore,
      maxScore,
      percentage,
      answeredCount,
      totalQuestions: criteria.length,
      isComplete,
      criticalIssues,
      readinessLevel,
      readinessMessage,
    };
  }, [criteria]);

  // Category scores
  const categoryScores = useMemo(() => {
    const scores: Record<string, { score: number; max: number; complete: boolean }> = {};
    
    categories.forEach((items, category) => {
      let score = 0;
      let max = 0;
      let complete = true;
      
      items.forEach(item => {
        max += 2 * item.weight;
        if (item.selectedScore !== undefined) {
          score += item.selectedScore * item.weight;
        } else {
          complete = false;
        }
      });
      
      scores[category] = { score, max, complete };
    });
    
    return scores;
  }, [categories]);

  const handleSelect = (criterionId: string, score: number) => {
    setCriteria(prev =>
      prev.map(c =>
        c.id === criterionId ? { ...c, selectedScore: score } : c
      )
    );
  };

  const handleComplete = () => {
    if (!scores.isComplete) return;
    onComplete({
      score: scores.totalScore,
      maxScore: scores.maxScore,
      criteria: criteria,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Discharge Readiness Assessment</h2>
              <p className="text-sm text-white/80">
                {patient.firstName} {patient.lastName} • {admission.admissionNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Score Summary */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-6">
            {/* Progress Circle */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={251}
                  strokeDashoffset={251 - (251 * scores.percentage) / 100}
                  className={`transition-all duration-500 ${
                    scores.readinessLevel === 'ready'
                      ? 'text-green-500'
                      : scores.readinessLevel === 'conditional'
                      ? 'text-yellow-500'
                      : 'text-red-500'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{scores.percentage}%</span>
                <span className="text-xs text-gray-500">Score</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Questions Answered</p>
                <p className="text-xl font-bold text-gray-900">
                  {scores.answeredCount}/{scores.totalQuestions}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Critical Issues</p>
                <p className={`text-xl font-bold ${scores.criticalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {scores.criticalIssues}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Readiness Status</p>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  scores.readinessLevel === 'ready'
                    ? 'bg-green-100 text-green-700'
                    : scores.readinessLevel === 'conditional'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {scores.readinessLevel === 'ready' ? (
                    <TrendingUp size={14} />
                  ) : scores.readinessLevel === 'conditional' ? (
                    <Minus size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  {scores.readinessMessage}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex overflow-hidden" style={{ height: 'calc(90vh - 280px)' }}>
          {/* Category Sidebar */}
          <div className="w-56 bg-gray-50 border-r overflow-y-auto">
            <div className="p-3">
              <p className="text-xs text-gray-500 uppercase font-medium mb-2">Categories</p>
              {Array.from(categories.keys()).map(category => {
                const Icon = categoryIcons[category] || Activity;
                const catScore = categoryScores[category];
                const percentage = catScore.max > 0 ? Math.round((catScore.score / catScore.max) * 100) : 0;
                
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm mb-1 transition-colors ${
                      activeCategory === category
                        ? 'bg-teal-100 text-teal-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="flex-1 truncate">{category}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      catScore.complete
                        ? percentage >= 80 ? 'bg-green-100 text-green-700' : 
                          percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {catScore.complete ? `${percentage}%` : '...'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assessment Form */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {categories.get(activeCategory)?.map((criterion, index) => {
                const Icon = categoryIcons[criterion.category] || Activity;
                return (
                  <motion.div
                    key={criterion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white border rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={18} className="text-teal-600" />
                      <h4 className="font-medium text-gray-900">{criterion.criterion}</h4>
                      {criterion.weight > 1 && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                          High Priority
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {criterion.options.map((option, optIndex) => {
                        const isSelected = criterion.selectedScore === option.score;
                        const colorClasses = {
                          2: 'border-green-300 bg-green-50 text-green-700',
                          1: 'border-yellow-300 bg-yellow-50 text-yellow-700',
                          0: 'border-red-300 bg-red-50 text-red-700',
                        };
                        return (
                          <button
                            key={optIndex}
                            onClick={() => handleSelect(criterion.id, option.score)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              isSelected
                                ? colorClasses[option.score as keyof typeof colorClasses]
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? option.score === 2 ? 'border-green-500 bg-green-500' :
                                  option.score === 1 ? 'border-yellow-500 bg-yellow-500' :
                                  'border-red-500 bg-red-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <span className={`flex-1 text-left text-sm ${isSelected ? 'font-medium' : ''}`}>
                              {option.label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              option.score === 2 ? 'bg-green-100 text-green-600' :
                              option.score === 1 ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {option.score === 2 ? 'Optimal' : option.score === 1 ? 'Suboptimal' : 'Concern'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {scores.isComplete ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle size={16} />
                All criteria assessed
              </span>
            ) : (
              <span className="text-orange-600 flex items-center gap-1">
                <AlertTriangle size={16} />
                {scores.totalQuestions - scores.answeredCount} criteria remaining
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={!scores.isComplete}
              className="btn btn-primary flex items-center gap-2"
            >
              Complete Assessment
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
