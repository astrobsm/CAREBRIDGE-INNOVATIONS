// ============================================================
// SURGICAL DEBULKING CRITERIA COMPONENT
// Evaluates and displays criteria for surgical debulking candidacy
// ============================================================

import { useState } from 'react';
import {
  Scissors,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
  Clock,
} from 'lucide-react';
import type { DebulkingCriteria, SurgicalPlan, PostOperativeProtocol, PostOperativeComplication } from '../types';

interface SurgicalDebulkingDisplayProps {
  criteria: DebulkingCriteria;
  surgicalPlan?: SurgicalPlan;
}

function CriterionRow({ label, met, description }: { label: string; met: boolean; description?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${met ? 'bg-green-50' : 'bg-red-50'}`}>
      {met ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <span className={`text-sm font-medium ${met ? 'text-green-800' : 'text-red-800'}`}>{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export default function SurgicalDebulkingDisplay({ criteria, surgicalPlan }: SurgicalDebulkingDisplayProps) {
  const [showSurgicalPlan, setShowSurgicalPlan] = useState(false);
  const [showPostOp, setShowPostOp] = useState(false);

  const allCriteria = [
    { label: 'CDT completed ≥6 months', met: criteria.cdtCompletedMinimum6Months, description: 'Adequate trial of conservative treatment documented' },
    { label: 'Failed to respond to CDT (<20% volume reduction)', met: criteria.failedToRespondToCDT, description: 'Persistent swelling despite compliant CDT' },
    { label: 'ISL Stage 2 late or above', met: criteria.islStage2LateOrAbove, description: 'Significant tissue changes beyond simple fluid accumulation' },
    { label: 'Predominantly fibrous tissue', met: criteria.predominantlyFibrous, description: 'Tissue consistency fibrotic or woody/hard' },
    { label: 'Significant functional impairment', met: criteria.significantFunctionalImpairment, description: 'Functional impact score ≥2/4' },
    { label: 'Recurrent infections despite prophylaxis', met: criteria.recurrentInfectionsDespiteProphylaxis, description: '≥3 episodes of cellulitis per year' },
    { label: 'BMI below 40', met: criteria.bmiBelow40, description: 'Acceptable anaesthetic risk' },
    { label: 'No active infection', met: criteria.noActiveInfection, description: 'Infection must be resolved ≥4 weeks before surgery' },
    { label: 'Adequate arterial supply (ABPI >0.8)', met: criteria.adequateArterialSupply, description: 'Important for healing, especially in lower limb' },
    { label: 'Patient motivated for post-op compression', met: criteria.patientMotivatedForPostOpCompression, description: 'Lifelong compression garment use is mandatory after debulking' },
  ];

  const complicationRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Outcome Banner */}
      <div className={`p-4 rounded-lg border-l-4 ${criteria.meetsThreshold ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
        <div className="flex items-center gap-3 mb-2">
          <Scissors className={`w-6 h-6 ${criteria.meetsThreshold ? 'text-green-600' : 'text-amber-600'}`} />
          <h3 className={`text-lg font-bold ${criteria.meetsThreshold ? 'text-green-800' : 'text-amber-800'}`}>
            {criteria.meetsThreshold ? 'Surgical Debulking Recommended' : 'Continue Conservative Management'}
          </h3>
        </div>
        <p className="text-sm text-gray-700">{criteria.clinicianJustification}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Criteria Met:</span>
          <span className={`text-lg font-bold ${criteria.meetsThreshold ? 'text-green-600' : 'text-amber-600'}`}>
            {criteria.totalCriteriaMet} / {allCriteria.length}
          </span>
          <span className="text-sm text-gray-500">(threshold: {criteria.totalCriteriaRequired})</span>
        </div>
      </div>

      {/* Individual Criteria */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800">Debulking Criteria Assessment</h4>
        {allCriteria.map((c, i) => (
          <CriterionRow key={i} label={c.label} met={c.met} description={c.description} />
        ))}
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-xs font-semibold text-gray-500">Volume Excess</span>
          <p className="text-sm text-gray-800">{criteria.volumeExcessPercent}% ({criteria.volumeExcessMl}mL)</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-xs font-semibold text-gray-500">Cellulitis Frequency</span>
          <p className="text-sm text-gray-800">{criteria.frequencyOfCellulitisPerYear}× per year</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-xs font-semibold text-gray-500">Functional Debt</span>
          <p className="text-sm text-gray-800">{criteria.functionalDebt}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-xs font-semibold text-gray-500">Psychosocial Impact</span>
          <p className="text-sm text-gray-800">{criteria.psychosocialImpact}</p>
        </div>
      </div>

      {/* Surgical Plan (if recommended) */}
      {surgicalPlan && (
        <>
          <button
            onClick={() => setShowSurgicalPlan(!showSurgicalPlan)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-800">Surgical Plan Details</span>
            </div>
            {showSurgicalPlan ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showSurgicalPlan && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <span className="text-sm font-semibold text-gray-700">Procedure:</span>
                <p className="text-sm text-gray-600 mt-1">{surgicalPlan.procedureDetails}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500">Duration</span>
                  <p className="text-sm text-gray-800">{surgicalPlan.estimatedDurationHours} hours</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Anaesthesia</span>
                  <p className="text-sm text-gray-800">{surgicalPlan.anesthesiaType}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Expected Blood Loss</span>
                  <p className="text-sm text-gray-800">{surgicalPlan.expectedBloodLoss}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Antibiotics</span>
                  <p className="text-sm text-gray-800">{surgicalPlan.antibioticProphylaxis}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Pre-Operative Requirements</h4>
                <ul className="list-disc list-inside space-y-1">
                  {surgicalPlan.preOperativeRequirements.map((r, i) => (
                    <li key={i} className="text-sm text-gray-600">{r}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Pre-Operative Investigations</h4>
                <ul className="list-disc list-inside space-y-1">
                  {surgicalPlan.preOperativeInvestigations.map((inv, i) => (
                    <li key={i} className="text-sm text-gray-600">{inv}</li>
                  ))}
                </ul>
              </div>

              {/* Staged procedure info */}
              {surgicalPlan.stages && surgicalPlan.stages.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Staged Procedure Plan</h4>
                  <div className="space-y-2">
                    {surgicalPlan.stages.map((stage) => (
                      <div key={stage.stageNumber} className="p-3 bg-white rounded border border-gray-200">
                        <span className="font-medium text-sm text-gray-800">Stage {stage.stageNumber}: {stage.description}</span>
                        <p className="text-xs text-gray-500 mt-1">Area: {stage.areaToAddress} | Interval: {stage.intervalWeeks} weeks</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post-Operative Protocol */}
          <button
            onClick={() => setShowPostOp(!showPostOp)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <span className="font-semibold text-gray-800">Post-Operative Protocol</span>
            </div>
            {showPostOp ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showPostOp && surgicalPlan.postOperativePlan && (
            <div className="ml-4 p-4 bg-gray-50 rounded-lg space-y-6">
              {/* Immediate */}
              <div>
                <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Immediate (0-48 hours)
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Position:</strong> {surgicalPlan.postOperativePlan.immediateCare.positioningInstructions}</p>
                  <p><strong>Drains:</strong> {surgicalPlan.postOperativePlan.immediateCare.drainManagement}</p>
                  <p><strong>Wound Care:</strong> {surgicalPlan.postOperativePlan.immediateCare.woundCareProtocol}</p>
                  <p><strong>Pain:</strong> {surgicalPlan.postOperativePlan.immediateCare.painManagement}</p>
                  <p><strong>Antibiotics:</strong> {surgicalPlan.postOperativePlan.immediateCare.antibioticRegimen}</p>
                  <p><strong>DVT Prophylaxis:</strong> {surgicalPlan.postOperativePlan.immediateCare.thromboprophylaxis}</p>
                  <p><strong>Limb Checks:</strong> {surgicalPlan.postOperativePlan.immediateCare.limbCheckFrequency}</p>
                </div>
              </div>

              {/* Early */}
              <div>
                <h4 className="text-sm font-bold text-indigo-700 mb-2">Early (Day 2-14)</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Wound:</strong> {surgicalPlan.postOperativePlan.earlyCare.woundCareContinued}</p>
                  <p><strong>Drain Removal:</strong> {surgicalPlan.postOperativePlan.earlyCare.drainRemovalCriteria}</p>
                  <p><strong>Mobilization:</strong> {surgicalPlan.postOperativePlan.earlyCare.mobilizationProtocol}</p>
                  <p><strong>Compression:</strong> {surgicalPlan.postOperativePlan.earlyCare.compressionInitiation}</p>
                  <p><strong>Sutures:</strong> Day {surgicalPlan.postOperativePlan.earlyCare.sutureRemovalDay}</p>
                </div>
              </div>

              {/* Intermediate */}
              <div>
                <h4 className="text-sm font-bold text-purple-700 mb-2">Intermediate (Week 2-6)</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Wound:</strong> {surgicalPlan.postOperativePlan.intermediateCare.woundHealingAssessment}</p>
                  <p><strong>Garment:</strong> {surgicalPlan.postOperativePlan.intermediateCare.compressionGarmentFitting}</p>
                  <p><strong>Exercise:</strong> {surgicalPlan.postOperativePlan.intermediateCare.exerciseProgression}</p>
                  <p><strong>Activities:</strong> {surgicalPlan.postOperativePlan.intermediateCare.returnToActivities}</p>
                </div>
              </div>

              {/* Late */}
              <div>
                <h4 className="text-sm font-bold text-green-700 mb-2">Late (Month 2+)</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Garment:</strong> {surgicalPlan.postOperativePlan.lateCare.garmentReview}</p>
                  <p><strong>Volume:</strong> {surgicalPlan.postOperativePlan.lateCare.volumeReassessment}</p>
                  <p><strong>Function:</strong> {surgicalPlan.postOperativePlan.lateCare.functionalAssessment}</p>
                  <p><strong>Further Surgery:</strong> {surgicalPlan.postOperativePlan.lateCare.furtherSurgeryAssessment}</p>
                  <p className="font-semibold text-red-600">⚠️ {surgicalPlan.postOperativePlan.lateCare.longTermCompressionPlan}</p>
                </div>
              </div>

              {/* Complications */}
              <div>
                <h4 className="text-sm font-bold text-red-700 mb-2">Potential Complications</h4>
                <div className="space-y-2">
                  {surgicalPlan.postOperativePlan.complications.map((comp: PostOperativeComplication, i: number) => (
                    <div key={i} className="p-3 bg-white rounded border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{comp.complication}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${complicationRiskColor(comp.riskLevel)}`}>
                          {comp.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-xs text-gray-500"><strong>Prevention:</strong> {comp.prevention}</p>
                      <p className="text-xs text-gray-500"><strong>Monitor:</strong> {comp.monitoring}</p>
                      <p className="text-xs text-gray-500"><strong>Manage:</strong> {comp.management}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Flags */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-bold text-red-700 mb-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  RED FLAGS — Escalate Immediately
                </h4>
                <ul className="space-y-1">
                  {surgicalPlan.postOperativePlan.redFlags.map((flag: string, i: number) => (
                    <li key={i} className="text-sm text-red-600">{flag}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
