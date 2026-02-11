import { format } from 'date-fns';
import type { PreoperativeAssessment } from '../../../types';
import { Stethoscope, AlertTriangle, CheckCircle2, XCircle, Wind, Heart, Droplets } from 'lucide-react';

interface AnaesthetistCommentsSlideProps {
  assessments: PreoperativeAssessment[];
  patientName: string;
}

const asaDescriptions: Record<number, string> = {
  1: 'Healthy patient',
  2: 'Mild systemic disease',
  3: 'Severe systemic disease',
  4: 'Severe systemic disease — constant threat to life',
  5: 'Moribund — not expected to survive without surgery',
  6: 'Brain-dead — organ donor',
};

export default function AnaesthetistCommentsSlide({ assessments, patientName }: AnaesthetistCommentsSlideProps) {
  if (!assessments || assessments.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <Stethoscope size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Anaesthetic Assessments</h2>
        <p className="text-gray-500 text-lg">No preoperative assessments recorded for {patientName}</p>
      </div>
    );
  }

  // Show the most recent assessment first
  const sorted = [...assessments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-900/40 to-cyan-900/40 rounded-xl p-6 border border-sky-700/30">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Stethoscope size={28} className="text-sky-400" />
          Anaesthetist Assessment — {patientName}
        </h2>
        <p className="text-sky-200/70 mt-1">{assessments.length} assessment{assessments.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {sorted.map((assessment, index) => (
        <div key={assessment.id} className="space-y-4">
          {index > 0 && <hr className="border-gray-700/50" />}
          
          {/* Assessment Header */}
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{assessment.surgeryName}</h3>
                <p className="text-gray-400 text-sm">
                  Assessed by {assessment.assessedBy} • {format(new Date(assessment.createdAt), 'PPP')}
                </p>
              </div>
              <div className="flex gap-3">
                <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                  assessment.clearanceStatus === 'cleared' ? 'bg-green-600/30 text-green-300' :
                  assessment.clearanceStatus === 'deferred' ? 'bg-red-600/30 text-red-300' :
                  'bg-yellow-600/30 text-yellow-300'
                }`}>
                  {assessment.clearanceStatus === 'cleared' ? <><CheckCircle2 size={14} className="inline mr-1" /> Cleared</> :
                   assessment.clearanceStatus === 'deferred' ? <><XCircle size={14} className="inline mr-1" /> Deferred</> :
                   'Pending Review'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ASA Classification */}
            <div className={`rounded-xl p-5 border ${
              assessment.asaClass >= 4 ? 'bg-red-900/25 border-red-700/30' :
              assessment.asaClass >= 3 ? 'bg-orange-900/25 border-orange-700/30' :
              'bg-green-900/25 border-green-700/30'
            }`}>
              <h4 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                <AlertTriangle size={18} /> ASA Classification
              </h4>
              <div className="text-center py-4">
                <span className={`text-6xl font-bold ${
                  assessment.asaClass >= 4 ? 'text-red-400' :
                  assessment.asaClass >= 3 ? 'text-orange-400' :
                  'text-green-400'
                }`}>
                  {assessment.asaClass}{assessment.asaEmergency ? 'E' : ''}
                </span>
                <p className="text-gray-400 mt-2">{asaDescriptions[assessment.asaClass] || ''}</p>
                {assessment.asaEmergency && (
                  <span className="bg-red-600/40 text-red-200 px-3 py-1 rounded-full text-xs font-semibold mt-2 inline-block">
                    EMERGENCY
                  </span>
                )}
              </div>
            </div>

            {/* Airway Assessment */}
            {assessment.airwayAssessment && (
              <div className="bg-blue-900/25 rounded-xl p-5 border border-blue-700/30">
                <h4 className="text-lg font-semibold text-blue-300 flex items-center gap-2 mb-3">
                  <Wind size={18} /> Airway Assessment
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mallampati Score:</span>
                    <span className={`font-semibold ${
                      assessment.airwayAssessment.mallampatiScore >= 3 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      Class {assessment.airwayAssessment.mallampatiScore}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mouth Opening:</span>
                    <span className="text-gray-200">{assessment.airwayAssessment.mouthOpening}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Thyromental Distance:</span>
                    <span className="text-gray-200">{assessment.airwayAssessment.thyromentalDistance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Neck Mobility:</span>
                    <span className="text-gray-200">{assessment.airwayAssessment.neckMobility}</span>
                  </div>
                  {assessment.airwayAssessment.predictedDifficulty && (
                    <div className="mt-2 bg-red-600/20 p-2 rounded text-red-300 text-xs">
                      ⚠️ Predicted Difficult Airway
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cardiac Risk */}
            {assessment.cardiacRisk && (
              <div className="bg-rose-900/25 rounded-xl p-5 border border-rose-700/30">
                <h4 className="text-lg font-semibold text-rose-300 flex items-center gap-2 mb-3">
                  <Heart size={18} /> Cardiac Risk (RCRI)
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RCRI Score:</span>
                    <span className={`font-bold text-2xl ${
                      assessment.cardiacRisk.rcriScore >= 3 ? 'text-red-400' :
                      assessment.cardiacRisk.rcriScore >= 2 ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      {assessment.cardiacRisk.rcriScore}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk Level:</span>
                    <span className="text-gray-200 capitalize">{assessment.cardiacRisk.rcriRisk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Functional Capacity:</span>
                    <span className="text-gray-200">{assessment.cardiacRisk.functionalCapacity}</span>
                  </div>
                  {assessment.cardiacRisk.selectedFactors && assessment.cardiacRisk.selectedFactors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-gray-400 text-xs mb-1">Risk Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {assessment.cardiacRisk.selectedFactors.map((f: string, i: number) => (
                          <span key={i} className="bg-rose-800/40 text-rose-200 px-2 py-0.5 rounded text-xs">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VTE Risk */}
            {assessment.vteRisk && (
              <div className="bg-amber-900/25 rounded-xl p-5 border border-amber-700/30">
                <h4 className="text-lg font-semibold text-amber-300 flex items-center gap-2 mb-3">
                  <Droplets size={18} /> VTE Risk (Caprini)
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Caprini Score:</span>
                    <span className="font-bold text-2xl text-amber-400">{assessment.vteRisk.capriniScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk Category:</span>
                    <span className="text-gray-200 capitalize">{assessment.vteRisk.riskCategory}</span>
                  </div>
                  {assessment.vteRisk.prophylaxisRecommendation && (
                    <div className="mt-2 bg-amber-800/30 p-2 rounded text-amber-200 text-xs">
                      Rx: {assessment.vteRisk.prophylaxisRecommendation}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bleeding Risk */}
            {assessment.bleedingRisk && (
              <div className="bg-red-900/25 rounded-xl p-5 border border-red-700/30">
                <h4 className="text-lg font-semibold text-red-300 flex items-center gap-2 mb-3">
                  <Droplets size={18} /> Bleeding Risk
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">On Anticoagulant:</span>
                    <span className={`font-semibold ${assessment.bleedingRisk.onAnticoagulant ? 'text-red-400' : 'text-green-400'}`}>
                      {assessment.bleedingRisk.onAnticoagulant ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {assessment.bleedingRisk.anticoagulantType && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-gray-200">{assessment.bleedingRisk.anticoagulantType}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bleeding History:</span>
                    <span className={`font-semibold ${assessment.bleedingRisk.bleedingHistory ? 'text-red-400' : 'text-green-400'}`}>
                      {assessment.bleedingRisk.bleedingHistory ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewer Comments */}
            {assessment.reviewedBy && (
              <div className="bg-indigo-900/25 rounded-xl p-5 border border-indigo-700/30">
                <h4 className="text-lg font-semibold text-indigo-300 flex items-center gap-2 mb-3">
                  <Stethoscope size={18} /> Reviewer Notes
                </h4>
                <p className="text-gray-300 text-sm mb-2">Reviewed by: <span className="font-medium text-white">{assessment.reviewedBy}</span></p>
                {assessment.reviewedAt && (
                  <p className="text-gray-400 text-xs">Reviewed on: {format(new Date(assessment.reviewedAt), 'PPP')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
