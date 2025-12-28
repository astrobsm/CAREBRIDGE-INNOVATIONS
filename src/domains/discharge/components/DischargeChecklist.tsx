// Discharge Checklist Component
// Pre-discharge verification checklist ensuring all requirements are met before patient discharge

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  CheckCircle,
  Circle,
  AlertTriangle,
  FileText,
  Pill,
  Activity,
  Calendar,
  Phone,
  CreditCard,
  Users,
  ClipboardList,
  Truck,
  Home,
  Stethoscope,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Admission, Patient } from '../../../types';

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  required: boolean;
  checked: boolean;
  notes?: string;
  completedBy?: string;
  completedAt?: Date;
}

interface Props {
  admission: Admission;
  patient: Patient;
  onComplete: (checklist: ChecklistItem[]) => void;
  onClose: () => void;
}

const initialChecklist: Omit<ChecklistItem, 'checked' | 'notes'>[] = [
  // Clinical Requirements
  { id: 'clinical-1', category: 'Clinical', item: 'Vital signs stable for 24 hours', required: true },
  { id: 'clinical-2', category: 'Clinical', item: 'Pain adequately controlled with oral medications', required: true },
  { id: 'clinical-3', category: 'Clinical', item: 'No fever (Temperature < 38°C) for 24 hours', required: true },
  { id: 'clinical-4', category: 'Clinical', item: 'Wound healing satisfactorily (if applicable)', required: false },
  { id: 'clinical-5', category: 'Clinical', item: 'Drains removed or patient/caregiver trained on management', required: false },
  { id: 'clinical-6', category: 'Clinical', item: 'Patient able to tolerate oral intake', required: true },
  { id: 'clinical-7', category: 'Clinical', item: 'Bowel function resumed (if relevant)', required: false },
  { id: 'clinical-8', category: 'Clinical', item: 'Urinary function adequate or catheter plan in place', required: true },
  { id: 'clinical-9', category: 'Clinical', item: 'Mobility assessment completed', required: true },

  // Medications
  { id: 'meds-1', category: 'Medications', item: 'Discharge medications reviewed and prescribed', required: true },
  { id: 'meds-2', category: 'Medications', item: 'Medications dispensed or prescription given', required: true },
  { id: 'meds-3', category: 'Medications', item: 'Medication reconciliation completed', required: true },
  { id: 'meds-4', category: 'Medications', item: 'Patient/caregiver educated on all medications', required: true },
  { id: 'meds-5', category: 'Medications', item: 'High-risk medications (anticoagulants, insulin) counseling done', required: false },

  // Documentation
  { id: 'docs-1', category: 'Documentation', item: 'Discharge summary completed', required: true },
  { id: 'docs-2', category: 'Documentation', item: 'Laboratory results reviewed and communicated', required: true },
  { id: 'docs-3', category: 'Documentation', item: 'Imaging results reviewed and communicated', required: false },
  { id: 'docs-4', category: 'Documentation', item: 'Operative notes completed (if applicable)', required: false },
  { id: 'docs-5', category: 'Documentation', item: 'Medical certificate issued if required', required: false },

  // Follow-up
  { id: 'follow-1', category: 'Follow-up', item: 'Follow-up appointments scheduled', required: true },
  { id: 'follow-2', category: 'Follow-up', item: 'Referrals to other specialists made if needed', required: false },
  { id: 'follow-3', category: 'Follow-up', item: 'Pending investigations communicated', required: false },
  { id: 'follow-4', category: 'Follow-up', item: 'Home care services arranged if needed', required: false },

  // Patient Education
  { id: 'edu-1', category: 'Education', item: 'Warning signs explained to patient/caregiver', required: true },
  { id: 'edu-2', category: 'Education', item: 'Activity restrictions discussed', required: true },
  { id: 'edu-3', category: 'Education', item: 'Dietary instructions provided', required: true },
  { id: 'edu-4', category: 'Education', item: 'Wound care education completed (if applicable)', required: false },
  { id: 'edu-5', category: 'Education', item: 'Patient education materials given', required: true },

  // Administrative
  { id: 'admin-1', category: 'Administrative', item: 'Bill reviewed with patient/family', required: true },
  { id: 'admin-2', category: 'Administrative', item: 'Payment/insurance clearance obtained', required: true },
  { id: 'admin-3', category: 'Administrative', item: 'Discharge time confirmed with family', required: true },
  { id: 'admin-4', category: 'Administrative', item: 'Transportation arranged', required: true },
  { id: 'admin-5', category: 'Administrative', item: 'Personal belongings returned', required: true },
  { id: 'admin-6', category: 'Administrative', item: 'Patient feedback collected', required: false },
];

const categoryIcons: Record<string, React.ElementType> = {
  Clinical: Stethoscope,
  Medications: Pill,
  Documentation: FileText,
  'Follow-up': Calendar,
  Education: Users,
  Administrative: CreditCard,
};

const categoryColors: Record<string, string> = {
  Clinical: 'bg-blue-50 text-blue-700 border-blue-200',
  Medications: 'bg-purple-50 text-purple-700 border-purple-200',
  Documentation: 'bg-green-50 text-green-700 border-green-200',
  'Follow-up': 'bg-orange-50 text-orange-700 border-orange-200',
  Education: 'bg-pink-50 text-pink-700 border-pink-200',
  Administrative: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

export default function DischargeChecklist({ admission, patient, onComplete, onClose }: Props) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initialChecklist.map(item => ({ ...item, checked: false }))
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  // Group items by category
  const categories = useMemo(() => {
    const cats = new Set(checklist.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [checklist]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = checklist;
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    if (showIncompleteOnly) {
      items = items.filter(item => !item.checked);
    }
    return items;
  }, [checklist, selectedCategory, showIncompleteOnly]);

  // Progress stats
  const stats = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter(item => item.checked).length;
    const requiredTotal = checklist.filter(item => item.required).length;
    const requiredCompleted = checklist.filter(item => item.required && item.checked).length;
    const percentage = Math.round((completed / total) * 100);
    const requiredPercentage = Math.round((requiredCompleted / requiredTotal) * 100);
    const allRequiredComplete = requiredCompleted === requiredTotal;

    return { total, completed, requiredTotal, requiredCompleted, percentage, requiredPercentage, allRequiredComplete };
  }, [checklist]);

  // Category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {};
    checklist.forEach(item => {
      if (!stats[item.category]) {
        stats[item.category] = { total: 0, completed: 0 };
      }
      stats[item.category].total++;
      if (item.checked) stats[item.category].completed++;
    });
    return stats;
  }, [checklist]);

  const handleToggle = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
              completedAt: !item.checked ? new Date() : undefined,
            }
          : item
      )
    );
  };

  const handleAddNote = (id: string, note: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, notes: note } : item))
    );
  };

  const handleComplete = () => {
    if (!stats.allRequiredComplete) return;
    onComplete(checklist);
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-500 to-green-500 text-white">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Discharge Readiness Checklist</h2>
              <p className="text-sm text-white/80">
                {patient.firstName} {patient.lastName} • {admission.admissionNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-gray-500">Overall Progress</span>
                <p className="text-lg font-bold text-gray-900">
                  {stats.completed}/{stats.total} Items
                </p>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <div>
                <span className="text-sm text-gray-500">Required Items</span>
                <p className={`text-lg font-bold ${stats.allRequiredComplete ? 'text-green-600' : 'text-orange-600'}`}>
                  {stats.requiredCompleted}/{stats.requiredTotal} Complete
                </p>
              </div>
            </div>
            {stats.allRequiredComplete ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Ready for Discharge</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full">
                <AlertTriangle size={18} />
                <span className="text-sm font-medium">Incomplete Requirements</span>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                stats.allRequiredComplete ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="p-4 border-b overflow-x-auto">
          <div className="flex items-center gap-2">
            {categories.map(cat => {
              const Icon = cat === 'all' ? ClipboardList : categoryIcons[cat];
              const catStats = cat === 'all' ? stats : categoryStats[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={14} />
                  <span className="capitalize">{cat}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    catStats && catStats.completed === (cat === 'all' ? catStats.total : categoryStats[cat]?.total)
                      ? 'bg-green-200 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {cat === 'all' ? `${stats.completed}/${stats.total}` : 
                      `${categoryStats[cat]?.completed || 0}/${categoryStats[cat]?.total || 0}`}
                  </span>
                </button>
              );
            })}
            <div className="flex-1" />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showIncompleteOnly}
                onChange={e => setShowIncompleteOnly(e.target.checked)}
                className="rounded"
              />
              Show incomplete only
            </label>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="overflow-y-auto max-h-[calc(90vh-350px)] p-4">
          <div className="space-y-3">
            {filteredItems.map((item, index) => {
              const Icon = categoryIcons[item.category];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 rounded-lg border ${
                    item.checked 
                      ? 'bg-green-50 border-green-200' 
                      : item.required 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className={`mt-0.5 flex-shrink-0 ${
                        item.checked ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {item.checked ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${item.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {item.item}
                        </span>
                        {item.required && (
                          <span className="text-xs text-red-500 font-medium">*Required</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${categoryColors[item.category]}`}>
                          <Icon size={10} />
                          {item.category}
                        </span>
                        {item.completedAt && (
                          <span className="text-xs text-gray-500">
                            <Clock size={10} className="inline mr-1" />
                            {format(new Date(item.completedAt), 'dd MMM, HH:mm')}
                          </span>
                        )}
                      </div>
                      {!item.checked && (
                        <input
                          type="text"
                          placeholder="Add notes..."
                          value={item.notes || ''}
                          onChange={e => handleAddNote(item.id, e.target.value)}
                          className="mt-2 input input-sm w-full"
                        />
                      )}
                      {item.notes && item.checked && (
                        <p className="mt-1 text-xs text-gray-500 italic">Note: {item.notes}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            <AlertTriangle className="inline w-4 h-4 mr-1 text-orange-500" />
            Items marked with <span className="text-red-500 font-medium">*Required</span> must be completed before discharge
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={!stats.allRequiredComplete}
              className="btn btn-primary flex items-center gap-2"
            >
              Continue to Discharge
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
