// ============================================================
// LYMPHEDEMA CDT PROTOCOL DISPLAY COMPONENT
// Shows CDT Intensive & Maintenance plan details
// ============================================================

import { useState } from 'react';
import {
  Droplets,
  Hand,
  ShieldCheck,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Layers,
  List,
} from 'lucide-react';
import type { CDTIntensivePlan, CDTMaintenancePlan } from '../types';

interface CDTProtocolDisplayProps {
  intensivePlan: CDTIntensivePlan;
  maintenancePlan: CDTMaintenancePlan;
  activePhase: 'intensive' | 'maintenance';
}

export default function CDTProtocolDisplay({ intensivePlan, maintenancePlan, activePhase }: CDTProtocolDisplayProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('mld');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionHeader = ({ id, icon: Icon, title, badge }: { id: string; icon: any; title: string; badge?: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="font-semibold text-gray-800">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">{badge}</span>
        )}
      </div>
      {expandedSection === id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className={`p-4 rounded-lg border-l-4 ${activePhase === 'intensive' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'}`}>
        <h3 className="text-lg font-bold text-gray-800">
          {activePhase === 'intensive' ? 'Phase 1: CDT Intensive (Decongestive Phase)' : 'Phase 2: CDT Maintenance (Self-Management Phase)'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {activePhase === 'intensive'
            ? `${intensivePlan.durationWeeks} weeks, ${intensivePlan.sessionsPerWeek} sessions/week`
            : 'Lifelong — patient-led self-management with clinical supervision'}
        </p>
      </div>

      {activePhase === 'intensive' ? (
        <>
          {/* Expected Outcome */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Treatment Goal</span>
            </div>
            <p className="text-sm text-amber-700">{intensivePlan.expectedOutcome}</p>
          </div>

          {/* Component 1: MLD */}
          <SectionHeader id="mld" icon={Hand} title="Component 1: Manual Lymphatic Drainage (MLD)" badge={`${intensivePlan.mld.sessionDurationMinutes} min/session`} />
          {expandedSection === 'mld' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <span className="text-sm font-semibold text-gray-700">Technique:</span>
                <span className="ml-2 text-sm text-gray-600 capitalize">{intensivePlan.mld.technique}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Drainage Sequence:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {intensivePlan.mld.drainageSequence.map((step, i) => (
                    <li key={i} className="text-sm text-gray-600">{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Precautions:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {intensivePlan.mld.precautions.map((p, i) => (
                    <li key={i} className="text-sm text-gray-600">{p}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-700 mb-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Contraindications:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {intensivePlan.mld.contraindications.map((c, i) => (
                    <li key={i} className="text-sm text-red-600">{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Component 2: Bandaging */}
          <SectionHeader id="bandaging" icon={Layers} title="Component 2: Multi-Layer Lymphedema Bandaging (MLLB)" badge={intensivePlan.bandaging.wearSchedule} />
          {expandedSection === 'bandaging' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <span className="text-sm font-semibold text-gray-700">Pressure Gradient:</span>
                <p className="text-sm text-gray-600 mt-1">{intensivePlan.bandaging.pressureGradient}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Bandaging Layers:</h4>
                <div className="space-y-2">
                  {intensivePlan.bandaging.layers.map((layer) => (
                    <div key={layer.layer} className="p-3 bg-white rounded border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary text-xs font-bold rounded-full">{layer.layer}</span>
                        <span className="font-medium text-sm text-gray-800">{layer.material}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1"><em>Purpose:</em> {layer.purpose}</p>
                      <p className="text-xs text-gray-600">{layer.applicationNotes}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <strong>Recheck:</strong> {intensivePlan.bandaging.recheckFrequency}
              </div>
            </div>
          )}

          {/* Component 3: Skin Care */}
          <SectionHeader id="skincare" icon={ShieldCheck} title="Component 3: Skin & Nail Care" />
          {expandedSection === 'skincare' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div><strong className="text-sm text-gray-700">Cleansing:</strong> <span className="text-sm text-gray-600">{intensivePlan.skinCare.cleansingProtocol}</span></div>
              <div><strong className="text-sm text-gray-700">Moisturizer:</strong> <span className="text-sm text-gray-600">{intensivePlan.skinCare.moisturizer}</span></div>
              <div><strong className="text-sm text-gray-700">Nail Care:</strong> <span className="text-sm text-gray-600">{intensivePlan.skinCare.nailCare}</span></div>
              {intensivePlan.skinCare.antifungalProphylaxis && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  Antifungal prophylaxis indicated — treat any existing tinea before bandaging
                </div>
              )}
              {intensivePlan.skinCare.woundCareIfNeeded && (
                <div><strong className="text-sm text-gray-700">Wound Care:</strong> <span className="text-sm text-gray-600">{intensivePlan.skinCare.woundCareIfNeeded}</span></div>
              )}
              <div><strong className="text-sm text-gray-700">Inspection:</strong> <span className="text-sm text-gray-600">{intensivePlan.skinCare.inspectionFrequency}</span></div>
            </div>
          )}

          {/* Component 4: Exercises */}
          <SectionHeader id="exercises" icon={Dumbbell} title="Component 4: Remedial Exercises" badge={intensivePlan.exercises.frequency} />
          {expandedSection === 'exercises' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">⚡ All exercises must be performed WITH compression bandaging on</p>
              </div>
              <div className="space-y-2">
                {intensivePlan.exercises.exerciseList.map((exercise, i) => (
                  <div key={i} className="p-3 bg-white rounded border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-800">{exercise.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        exercise.category === 'breathing' ? 'bg-green-100 text-green-700' :
                        exercise.category === 'proximal_joint' ? 'bg-blue-100 text-blue-700' :
                        exercise.category === 'distal_joint' ? 'bg-purple-100 text-purple-700' :
                        exercise.category === 'aerobic' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exercise.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{exercise.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{exercise.repetitions} × {exercise.sets} sets</span>
                      <span>•</span>
                      <span>{exercise.frequency}</span>
                    </div>
                    {exercise.precautions.length > 0 && (
                      <div className="mt-1 text-xs text-amber-600">
                        ⚠️ {exercise.precautions.join('. ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Progression Criteria:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {intensivePlan.exercises.progressionCriteria.map((c, i) => (
                    <li key={i} className="text-sm text-gray-600">{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Weekly Milestones */}
          <SectionHeader id="milestones" icon={Clock} title="Weekly Milestones & Targets" />
          {expandedSection === 'milestones' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-3">
              {intensivePlan.milestonesWeekly.map((milestone) => (
                <div key={milestone.weekNumber} className="p-3 bg-white rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-800">Week {milestone.weekNumber}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      Target: {milestone.expectedVolumeReductionPercent}% reduction
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 mb-1">Assessment Checklist</h5>
                      {milestone.assessmentChecklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs text-gray-600">
                          <CheckCircle className="w-3 h-3 text-gray-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-gray-500 mb-1">Adjustment Criteria</h5>
                      {milestone.adjustmentCriteria.map((item, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs text-amber-600">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* CDT MAINTENANCE PHASE */
        <>
          {/* Compression Garment */}
          <SectionHeader id="garment" icon={Layers} title="Compression Garment" badge={maintenancePlan.compressionGarment.wearSchedule} />
          {expandedSection === 'garment' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div><strong className="text-sm text-gray-700">Type:</strong> <span className="text-sm text-gray-600 capitalize">{maintenancePlan.compressionGarment.type.replace(/_/g, ' ')}</span></div>
              <div><strong className="text-sm text-gray-700">Compression Class:</strong> <span className="text-sm text-gray-600">{maintenancePlan.compressionGarment.compressionClass.replace(/_/g, ' ')}</span></div>
              <div><strong className="text-sm text-gray-700">Description:</strong> <span className="text-sm text-gray-600">{maintenancePlan.compressionGarment.garmentDescription}</span></div>
              <div><strong className="text-sm text-gray-700">Replace Every:</strong> <span className="text-sm text-gray-600">{maintenancePlan.compressionGarment.replacementFrequencyMonths} months</span></div>
              <div><strong className="text-sm text-gray-700">Fit Check:</strong> <span className="text-sm text-gray-600">{maintenancePlan.compressionGarment.fitCheckFrequency}</span></div>
            </div>
          )}

          {/* Self-MLD */}
          <SectionHeader id="self-mld" icon={Hand} title="Self Manual Lymphatic Drainage" badge={`${maintenancePlan.selfMLD.durationMinutes} min daily`} />
          {expandedSection === 'self-mld' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div><strong className="text-sm text-gray-700">Technique:</strong> <span className="text-sm text-gray-600">{maintenancePlan.selfMLD.technique}</span></div>
              <div><strong className="text-sm text-gray-700">Frequency:</strong> <span className="text-sm text-gray-600">{maintenancePlan.selfMLD.frequency}</span></div>
              <div>
                <strong className="text-sm text-gray-700">Body Regions (in order):</strong>
                <ol className="list-decimal list-inside mt-1">
                  {maintenancePlan.selfMLD.bodyRegions.map((r, i) => (
                    <li key={i} className="text-sm text-gray-600">{r}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Skin Care */}
          <SectionHeader id="skincare-m" icon={ShieldCheck} title="Daily Skin Care Regimen" />
          {expandedSection === 'skincare-m' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <div><strong className="text-sm text-gray-700">Daily Care:</strong> <span className="text-sm text-gray-600">{maintenancePlan.skinCareRegimen.dailySkinCare}</span></div>
              <div><strong className="text-sm text-gray-700">Moisturizer:</strong> <span className="text-sm text-gray-600">{maintenancePlan.skinCareRegimen.moisturizerType}</span></div>
              <div>
                <strong className="text-sm text-gray-700">Signs to Watch:</strong>
                <ul className="list-disc list-inside mt-1">
                  {maintenancePlan.skinCareRegimen.signToWatch.map((s, i) => (
                    <li key={i} className="text-sm text-red-600">{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Escalation Criteria */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Return for Intensive CDT If:
            </h4>
            <ul className="space-y-1">
              {maintenancePlan.escalationCriteria.map((c, i) => (
                <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Follow-up Schedule */}
          <SectionHeader id="followup" icon={List} title="Follow-up Schedule" />
          {expandedSection === 'followup' && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                {maintenancePlan.followUpSchedule.map((appt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <div>
                      <span className="text-sm font-medium text-gray-800">Week {appt.weekNumber}</span>
                      <span className="text-sm text-gray-500 ml-2">— {appt.purpose}</span>
                    </div>
                    <span className="text-xs text-gray-500">{appt.location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
