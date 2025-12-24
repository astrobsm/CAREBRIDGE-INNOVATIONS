import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Target,
  Calendar,
  Activity,
  Pill,
  Stethoscope,
  Utensils,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  X,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { db } from '../../database';
import type { TreatmentPlan, TreatmentOrder, TreatmentGoal, TreatmentProgress } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';

interface TreatmentPlanCardProps {
  patientId: string;
  relatedEntityId?: string;
  relatedEntityType?: 'wound' | 'burn' | 'surgery' | 'general';
  clinicianId: string;
  clinicianName: string;
}

const orderCategories = [
  { value: 'medication', label: 'Medication', icon: Pill, color: 'bg-blue-100 text-blue-700' },
  { value: 'dressing', label: 'Dressing', icon: Activity, color: 'bg-rose-100 text-rose-700' },
  { value: 'procedure', label: 'Procedure', icon: Stethoscope, color: 'bg-purple-100 text-purple-700' },
  { value: 'nutrition', label: 'Nutrition', icon: Utensils, color: 'bg-green-100 text-green-700' },
  { value: 'activity', label: 'Activity/Mobility', icon: Activity, color: 'bg-amber-100 text-amber-700' },
  { value: 'monitoring', label: 'Monitoring', icon: Clock, color: 'bg-sky-100 text-sky-700' },
  { value: 'other', label: 'Other', icon: ClipboardList, color: 'bg-gray-100 text-gray-700' },
];

const frequencyOptions = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'Alternate days',
  'Twice weekly',
  'Weekly',
  'As needed (PRN)',
  'Once only',
];

const phaseOptions = [
  { value: 'initial', label: 'Initial Phase' },
  { value: 'week_1', label: 'Week 1' },
  { value: 'week_2', label: 'Week 2' },
  { value: 'week_3', label: 'Week 3' },
  { value: 'week_4', label: 'Week 4' },
  { value: 'monthly_follow_up', label: 'Monthly Follow-up' },
];

const treatmentPlanSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  frequency: z.string().min(1, 'Frequency is required'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional(),
  phase: z.string().optional(),
});

const orderSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  order: z.string().min(3, 'Order details required'),
  instructions: z.string().optional(),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  priority: z.enum(['routine', 'urgent', 'stat']),
});

const goalSchema = z.object({
  description: z.string().min(3, 'Goal description is required'),
  targetDate: z.string().optional(),
  metrics: z.string().optional(),
});

const progressSchema = z.object({
  observations: z.string().min(3, 'Observations required'),
  outcomeAssessment: z.enum(['improved', 'stable', 'deteriorated']),
  clinicianNotes: z.string().optional(),
  woundLength: z.number().optional(),
  woundWidth: z.number().optional(),
  woundDepth: z.number().optional(),
});

type TreatmentPlanFormData = z.infer<typeof treatmentPlanSchema>;
type OrderFormData = z.infer<typeof orderSchema>;
type GoalFormData = z.infer<typeof goalSchema>;
type ProgressFormData = z.infer<typeof progressSchema>;

export default function TreatmentPlanCard({
  patientId,
  relatedEntityId,
  relatedEntityType = 'general',
  clinicianId,
}: TreatmentPlanCardProps) {
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);

  // Fetch treatment plans for this patient/entity
  const treatmentPlans = useLiveQuery(
    () => {
      if (relatedEntityId) {
        return db.treatmentPlans
          .where('relatedEntityId')
          .equals(relatedEntityId)
          .toArray();
      }
      return db.treatmentPlans
        .where('patientId')
        .equals(patientId)
        .toArray();
    },
    [patientId, relatedEntityId]
  );

  // Fetch progress for all plans
  const allProgress = useLiveQuery(
    () => db.treatmentProgress.where('treatmentPlanId').anyOf(
      treatmentPlans?.map(p => p.id) || []
    ).toArray(),
    [treatmentPlans]
  );

  const progressByPlan = useMemo(() => {
    const map = new Map<string, TreatmentProgress[]>();
    allProgress?.forEach(p => {
      const existing = map.get(p.treatmentPlanId) || [];
      map.set(p.treatmentPlanId, [...existing, p]);
    });
    return map;
  }, [allProgress]);

  const {
    register: registerPlan,
    handleSubmit: handleSubmitPlan,
    reset: resetPlan,
    formState: { errors: planErrors },
  } = useForm<TreatmentPlanFormData>({
    resolver: zodResolver(treatmentPlanSchema),
    defaultValues: {
      frequency: 'Once daily',
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const {
    register: registerOrder,
    handleSubmit: handleSubmitOrder,
    reset: resetOrder,
    formState: { errors: orderErrors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      priority: 'routine',
      frequency: 'Once daily',
      duration: '7 days',
    },
  });

  const {
    register: registerGoal,
    handleSubmit: handleSubmitGoal,
    reset: resetGoal,
    formState: { errors: goalErrors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  const {
    register: registerProgress,
    handleSubmit: handleSubmitProgress,
    reset: resetProgress,
    formState: { errors: progressErrors },
  } = useForm<ProgressFormData>({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      outcomeAssessment: 'stable',
    },
  });

  const togglePlanExpand = (planId: string) => {
    setExpandedPlans(prev =>
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const onSubmitPlan = async (data: TreatmentPlanFormData) => {
    try {
      const plan: TreatmentPlan = {
        id: uuidv4(),
        patientId,
        relatedEntityId,
        relatedEntityType,
        title: data.title,
        description: data.description,
        clinicalGoals: [],
        orders: [],
        frequency: data.frequency,
        startDate: new Date(data.startDate),
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
        status: 'active',
        phase: data.phase,
        createdBy: clinicianId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.treatmentPlans.add(plan);
      toast.success('Treatment plan created successfully!');
      setShowNewPlanModal(false);
      resetPlan();
      setSelectedPlanId(plan.id);
      setExpandedPlans(prev => [...prev, plan.id]);
    } catch (error) {
      console.error('Error creating treatment plan:', error);
      toast.error('Failed to create treatment plan');
    }
  };

  const onSubmitOrder = async (data: OrderFormData) => {
    if (!selectedPlanId) return;

    try {
      const plan = await db.treatmentPlans.get(selectedPlanId);
      if (!plan) throw new Error('Plan not found');

      const newOrder: TreatmentOrder = {
        id: uuidv4(),
        category: data.category as TreatmentOrder['category'],
        order: data.order,
        instructions: data.instructions,
        frequency: data.frequency,
        duration: data.duration,
        priority: data.priority,
        status: 'active',
        startDate: new Date(),
      };

      await db.treatmentPlans.update(selectedPlanId, {
        orders: [...plan.orders, newOrder],
        updatedAt: new Date(),
      });

      toast.success('Order added successfully!');
      setShowAddOrderModal(false);
      resetOrder();
    } catch (error) {
      console.error('Error adding order:', error);
      toast.error('Failed to add order');
    }
  };

  const onSubmitGoal = async (data: GoalFormData) => {
    if (!selectedPlanId) return;

    try {
      const plan = await db.treatmentPlans.get(selectedPlanId);
      if (!plan) throw new Error('Plan not found');

      const newGoal: TreatmentGoal = {
        id: uuidv4(),
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        status: 'pending',
        metrics: data.metrics,
      };

      await db.treatmentPlans.update(selectedPlanId, {
        clinicalGoals: [...plan.clinicalGoals, newGoal],
        updatedAt: new Date(),
      });

      toast.success('Goal added successfully!');
      setShowAddGoalModal(false);
      resetGoal();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('Failed to add goal');
    }
  };

  const onSubmitProgress = async (data: ProgressFormData) => {
    if (!selectedPlanId) return;

    try {
      const measurements: Record<string, number | string> = {};
      if (data.woundLength) measurements.length = data.woundLength;
      if (data.woundWidth) measurements.width = data.woundWidth;
      if (data.woundDepth) measurements.depth = data.woundDepth;

      const progress: TreatmentProgress = {
        id: uuidv4(),
        treatmentPlanId: selectedPlanId,
        date: new Date(),
        observations: data.observations,
        measurements,
        ordersExecuted: [],
        outcomeAssessment: data.outcomeAssessment,
        clinicianNotes: data.clinicianNotes,
        recordedBy: clinicianId,
        recordedAt: new Date(),
      };

      await db.treatmentProgress.add(progress);
      toast.success('Progress recorded successfully!');
      setShowProgressModal(false);
      resetProgress();
    } catch (error) {
      console.error('Error recording progress:', error);
      toast.error('Failed to record progress');
    }
  };

  const toggleGoalStatus = async (planId: string, goalId: string) => {
    try {
      const plan = await db.treatmentPlans.get(planId);
      if (!plan) return;

      const updatedGoals = plan.clinicalGoals.map(g => {
        if (g.id === goalId) {
          const newStatus = g.status === 'achieved' ? 'pending' : 'achieved';
          return {
            ...g,
            status: newStatus as TreatmentGoal['status'],
            achievedDate: newStatus === 'achieved' ? new Date() : undefined,
          };
        }
        return g;
      });

      await db.treatmentPlans.update(planId, {
        clinicalGoals: updatedGoals,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case 'improved':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'deteriorated':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Active</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Completed</span>;
      case 'on_hold':
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">On Hold</span>;
      case 'discontinued':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Discontinued</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-sky-500" />
          <h3 className="font-semibold text-gray-900">Treatment Plans</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowNewPlanModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          <Plus size={14} />
          New Plan
        </button>
      </div>

      {/* Empty State */}
      {(!treatmentPlans || treatmentPlans.length === 0) && (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No treatment plans yet</p>
          <p className="text-sm">Create a treatment plan to track orders, goals, and progress</p>
        </div>
      )}

      {/* Treatment Plans List */}
      <div className="space-y-3">
        {treatmentPlans?.map(plan => {
          const isExpanded = expandedPlans.includes(plan.id);
          const planProgress = progressByPlan.get(plan.id) || [];
          const daysActive = differenceInDays(new Date(), new Date(plan.startDate));
          const achievedGoals = plan.clinicalGoals.filter(g => g.status === 'achieved').length;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-lg overflow-hidden"
            >
              {/* Plan Header */}
              <div
                className="p-4 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => togglePlanExpand(plan.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{plan.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Started {format(new Date(plan.startDate), 'MMM d, yyyy')}
                      </span>
                      <span>•</span>
                      <span>{daysActive} days</span>
                      {plan.phase && (
                        <>
                          <span>•</span>
                          <span className="text-sky-600">{phaseOptions.find(p => p.value === plan.phase)?.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Goals: {achievedGoals}/{plan.clinicalGoals.length}</div>
                    <div className="text-gray-500">Orders: {plan.orders.length}</div>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t"
                  >
                    <div className="p-4 space-y-4">
                      {plan.description && (
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      )}

                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(plan.id);
                            setShowAddOrderModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Plus size={14} />
                          Add Order
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(plan.id);
                            setShowAddGoalModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <Target size={14} />
                          Add Goal
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(plan.id);
                            setShowProgressModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <History size={14} />
                          Record Progress
                        </button>
                      </div>

                      {/* Orders */}
                      {plan.orders.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <ClipboardList size={16} />
                            Orders
                          </h5>
                          <div className="space-y-2">
                            {plan.orders.map(order => {
                              const category = orderCategories.find(c => c.value === order.category);
                              const CategoryIcon = category?.icon || ClipboardList;
                              return (
                                <div key={order.id} className={`flex items-start gap-3 p-3 rounded-lg ${category?.color || 'bg-gray-100'}`}>
                                  <CategoryIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium">{order.order}</p>
                                    {order.instructions && (
                                      <p className="text-sm opacity-80">{order.instructions}</p>
                                    )}
                                    <div className="flex gap-3 mt-1 text-xs opacity-70">
                                      <span>{order.frequency}</span>
                                      <span>•</span>
                                      <span>{order.duration}</span>
                                      {order.priority !== 'routine' && (
                                        <>
                                          <span>•</span>
                                          <span className={order.priority === 'stat' ? 'text-red-700 font-bold' : 'text-amber-700 font-bold'}>
                                            {order.priority.toUpperCase()}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Goals */}
                      {plan.clinicalGoals.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Target size={16} />
                            Clinical Goals
                          </h5>
                          <div className="space-y-2">
                            {plan.clinicalGoals.map(goal => (
                              <div
                                key={goal.id}
                                onClick={() => toggleGoalStatus(plan.id, goal.id)}
                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                  goal.status === 'achieved'
                                    ? 'bg-green-50 line-through text-green-700'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                {goal.status === 'achieved' ? (
                                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{goal.description}</p>
                                  {goal.metrics && (
                                    <p className="text-sm opacity-70">Metric: {goal.metrics}</p>
                                  )}
                                  {goal.targetDate && (
                                    <p className="text-xs opacity-60">Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Progress */}
                      {planProgress.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <History size={16} />
                            Progress History ({planProgress.length})
                          </h5>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {planProgress
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 5)
                              .map(progress => (
                                <div key={progress.id} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      {format(new Date(progress.date), 'MMM d, yyyy - h:mm a')}
                                    </span>
                                    <span className="flex items-center gap-1 text-sm">
                                      {getOutcomeIcon(progress.outcomeAssessment)}
                                      {progress.outcomeAssessment || 'Not assessed'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{progress.observations}</p>
                                  {Object.keys(progress.measurements || {}).length > 0 && (
                                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                      {progress.measurements?.length && (
                                        <span>L: {progress.measurements.length}cm</span>
                                      )}
                                      {progress.measurements?.width && (
                                        <span>W: {progress.measurements.width}cm</span>
                                      )}
                                      {progress.measurements?.depth && (
                                        <span>D: {progress.measurements.depth}cm</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* New Plan Modal */}
      <AnimatePresence>
        {showNewPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Create Treatment Plan</h3>
                  <button onClick={() => setShowNewPlanModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitPlan(onSubmitPlan)} className="space-y-4">
                  <div>
                    <label className="label">Plan Title *</label>
                    <input
                      {...registerPlan('title')}
                      className={`input ${planErrors.title ? 'input-error' : ''}`}
                      placeholder="e.g., Wound Care Protocol - Week 1"
                    />
                    {planErrors.title && (
                      <p className="text-sm text-red-500 mt-1">{planErrors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Description</label>
                    <textarea
                      {...registerPlan('description')}
                      className="input"
                      rows={2}
                      placeholder="Brief description of the treatment plan..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Phase</label>
                      <select {...registerPlan('phase')} className="input">
                        <option value="">Select phase</option>
                        {phaseOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Default Frequency *</label>
                      <select {...registerPlan('frequency')} className="input">
                        {frequencyOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Date *</label>
                      <input type="date" {...registerPlan('startDate')} className="input" />
                    </div>
                    <div>
                      <label className="label">Expected End Date</label>
                      <input type="date" {...registerPlan('expectedEndDate')} className="input" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowNewPlanModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      Create Plan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Order Modal */}
      <AnimatePresence>
        {showAddOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Add Treatment Order</h3>
                  <button onClick={() => setShowAddOrderModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitOrder(onSubmitOrder)} className="space-y-4">
                  <div>
                    <label className="label">Category *</label>
                    <select {...registerOrder('category')} className="input">
                      <option value="">Select category</option>
                      {orderCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    {orderErrors.category && (
                      <p className="text-sm text-red-500 mt-1">{orderErrors.category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Order Details *</label>
                    <textarea
                      {...registerOrder('order')}
                      className={`input ${orderErrors.order ? 'input-error' : ''}`}
                      rows={2}
                      placeholder="e.g., Clean wound with Wound Clex Solution"
                    />
                    {orderErrors.order && (
                      <p className="text-sm text-red-500 mt-1">{orderErrors.order.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Instructions</label>
                    <textarea
                      {...registerOrder('instructions')}
                      className="input"
                      rows={2}
                      placeholder="Additional instructions..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Frequency *</label>
                      <select {...registerOrder('frequency')} className="input">
                        {frequencyOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Duration *</label>
                      <input
                        {...registerOrder('duration')}
                        className="input"
                        placeholder="e.g., 7 days"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Priority *</label>
                    <div className="flex gap-4">
                      {['routine', 'urgent', 'stat'].map(priority => (
                        <label key={priority} className="flex items-center gap-2">
                          <input
                            type="radio"
                            {...registerOrder('priority')}
                            value={priority}
                            className="text-sky-600"
                          />
                          <span className={`capitalize ${
                            priority === 'stat' ? 'text-red-600 font-bold' : 
                            priority === 'urgent' ? 'text-amber-600 font-bold' : ''
                          }`}>
                            {priority}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddOrderModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} />
                      Add Order
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddGoalModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Add Clinical Goal</h3>
                  <button onClick={() => setShowAddGoalModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitGoal(onSubmitGoal)} className="space-y-4">
                  <div>
                    <label className="label">Goal Description *</label>
                    <textarea
                      {...registerGoal('description')}
                      className={`input ${goalErrors.description ? 'input-error' : ''}`}
                      rows={2}
                      placeholder="e.g., Reduce wound size by 50%"
                    />
                    {goalErrors.description && (
                      <p className="text-sm text-red-500 mt-1">{goalErrors.description.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Measurable Metric</label>
                    <input
                      {...registerGoal('metrics')}
                      className="input"
                      placeholder="e.g., Wound area < 5 cm²"
                    />
                  </div>

                  <div>
                    <label className="label">Target Date</label>
                    <input type="date" {...registerGoal('targetDate')} className="input" />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddGoalModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Target size={16} />
                      Add Goal
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Progress Modal */}
      <AnimatePresence>
        {showProgressModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProgressModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Record Progress</h3>
                  <button onClick={() => setShowProgressModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitProgress(onSubmitProgress)} className="space-y-4">
                  <div>
                    <label className="label">Observations *</label>
                    <textarea
                      {...registerProgress('observations')}
                      className={`input ${progressErrors.observations ? 'input-error' : ''}`}
                      rows={3}
                      placeholder="Describe current status, changes observed..."
                    />
                    {progressErrors.observations && (
                      <p className="text-sm text-red-500 mt-1">{progressErrors.observations.message}</p>
                    )}
                  </div>

                  {/* Wound Measurements (optional) */}
                  {relatedEntityType === 'wound' && (
                    <div>
                      <label className="label">Wound Measurements (cm)</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            {...registerProgress('woundLength', { valueAsNumber: true })}
                            className="input"
                            placeholder="Length"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            {...registerProgress('woundWidth', { valueAsNumber: true })}
                            className="input"
                            placeholder="Width"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            {...registerProgress('woundDepth', { valueAsNumber: true })}
                            className="input"
                            placeholder="Depth"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Outcome Assessment *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          {...registerProgress('outcomeAssessment')}
                          value="improved"
                          className="text-green-600"
                        />
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-green-700">Improved</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          {...registerProgress('outcomeAssessment')}
                          value="stable"
                          className="text-gray-600"
                        />
                        <Minus className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Stable</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          {...registerProgress('outcomeAssessment')}
                          value="deteriorated"
                          className="text-red-600"
                        />
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-red-700">Deteriorated</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="label">Clinician Notes</label>
                    <textarea
                      {...registerProgress('clinicianNotes')}
                      className="input"
                      rows={2}
                      placeholder="Additional clinical notes..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowProgressModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      Save Progress
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
