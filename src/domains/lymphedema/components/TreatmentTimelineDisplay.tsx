// ============================================================
// TREATMENT TIMELINE DISPLAY COMPONENT
// Visual timeline of all treatment phases
// ============================================================

import { Clock, CheckCircle2, Circle, ArrowRight, Target, AlertTriangle, Flag } from 'lucide-react';
import type { TreatmentTimeline, TimelinePhase, TimelineMilestone } from '../types';

interface TreatmentTimelineDisplayProps {
  timeline: TreatmentTimeline;
  currentPhase?: string;
}

const phaseColorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  infection_control: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  cdt_intensive: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  cdt_maintenance: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
  pre_operative: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  intra_operative: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  post_operative_acute: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
  post_operative_rehabilitation: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  long_term_maintenance: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', dot: 'bg-teal-500' },
};

const defaultPhaseColor = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', dot: 'bg-gray-500' };

export default function TreatmentTimelineDisplay({ timeline, currentPhase }: TreatmentTimelineDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-gray-800">Treatment Timeline Overview</h3>
        </div>
        <p className="text-sm text-gray-600">
          Total estimated duration: <strong>{timeline.totalEstimatedDurationWeeks} weeks</strong> ({Math.round(timeline.totalEstimatedDurationWeeks / 4)} months) |{' '}
          {timeline.phases.length} phases | {timeline.criticalMilestones.length} critical milestones
        </p>
      </div>

      {/* Phase Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {timeline.phases.map((phase, index) => {
          const colors = phaseColorMap[phase.phase] || defaultPhaseColor;
          const isCurrent = phase.phase === currentPhase;
          
          return (
            <div key={phase.phase} className="relative pl-14 pb-8">
              {/* Timeline dot */}
              <div className={`absolute left-4 w-5 h-5 rounded-full border-2 border-white ${
                isCurrent ? `${colors.dot} ring-2 ring-offset-2 ring-primary` : colors.dot
              }`} style={{ top: '2px' }} />
              
              <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg} ${isCurrent ? 'ring-2 ring-primary/20' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold text-sm ${colors.text}`}>{phase.label}</h4>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full animate-pulse">
                        CURRENT
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Week {phase.startWeek + 1} – {phase.startWeek + phase.durationWeeks} ({phase.durationWeeks}w)
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
                
                {/* Goals */}
                <div className="mb-3">
                  <h5 className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Goals
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {phase.goals.map((goal, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/70 text-xs text-gray-600 rounded border border-gray-200">
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Exit Criteria */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Exit Criteria
                  </h5>
                  <ul className="space-y-0.5">
                    {phase.exitCriteria.map((c, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-gray-400" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Critical Milestones */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Flag className="w-5 h-5 text-primary" />
          Critical Milestones & Decision Points
        </h3>
        <div className="space-y-2">
          {timeline.criticalMilestones.map((milestone, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                milestone.decisionPoint
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {milestone.decisionPoint ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{milestone.milestone}</span>
                </div>
                <span className="text-xs text-gray-500">Week {milestone.weekNumber}</span>
              </div>
              <p className="text-xs text-gray-500 ml-6">{milestone.description}</p>
              <div className="flex items-center gap-2 ml-6 mt-1">
                {milestone.assessmentRequired && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">Assessment</span>
                )}
                {milestone.decisionPoint && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-xs rounded">Decision Point</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
