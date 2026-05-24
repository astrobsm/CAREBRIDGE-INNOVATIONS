// Step 6: Score Summary & Recommendations
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Activity,
  Clock,
  FileText,
  Scissors,
  Bone,
  ClipboardCheck,
  UserCheck,
  PenSquare,
  FlaskConical
} from 'lucide-react';
import type { 
  LimbSalvageScore, 
  LimbSalvageRecommendation,
  AmputationLevel,
  OsteomyelitisAssessment,
  LimbSalvageConsent,
  LimbSalvageConsentOption
} from '../../../types';
import { isConsentComplete } from '../../../services/limbSalvageService';
import { checkInvestigationGate, type InvestigationGateResult } from '../../../services/investigationRequestService';

interface ScoreSummaryStepProps {
  limbSalvageScore: LimbSalvageScore;
  recommendations: LimbSalvageRecommendation[];
  recommendedManagement: string;
  recommendedAmputationLevel: AmputationLevel;
  treatmentPlan: string;
  followUpDate: Date | null;
  osteomyelitis?: OsteomyelitisAssessment;
  treatmentConsent?: LimbSalvageConsent;
  patientId?: string;
  gateOverrideReason?: string;
  onUpdate: (data: Partial<{
    treatmentPlan: string;
    followUpDate: Date;
    treatmentConsent: LimbSalvageConsent;
    gateOverrideReason: string;
  }>) => void;
}

// Amputation level descriptions
const amputationDescriptions: Record<AmputationLevel, string> = {
  none: 'No amputation - Conservative/Revascularization',
  toe_disarticulation: 'Toe Disarticulation - Single toe removal at joint',
  ray_amputation: 'Ray Amputation - Toe with partial metatarsal',
  transmetatarsal: 'Transmetatarsal (TMA) - All toes and metatarsal heads',
  lisfranc: 'Lisfranc - Tarsometatarsal joint level',
  chopart: 'Chopart - Midtarsal joint level',
  syme: 'Syme - Ankle disarticulation',
  bka: 'Below Knee Amputation (BKA)',
  through_knee: 'Through-Knee Amputation',
  aka: 'Above Knee Amputation (AKA)',
};

export default function ScoreSummaryStep({
  limbSalvageScore,
  recommendations,
  recommendedManagement,
  recommendedAmputationLevel,
  treatmentPlan,
  followUpDate,
  osteomyelitis,
  treatmentConsent,
  patientId,
  gateOverrideReason,
  onUpdate,
}: ScoreSummaryStepProps) {

  // ---- Investigation gate (soft warning) ----
  const [gate, setGate] = useState<InvestigationGateResult | null>(null);
  useEffect(() => {
    if (!patientId) return;
    checkInvestigationGate(patientId).then(setGate).catch(() => setGate(null));
  }, [patientId]);

  const updateConsent = (patch: Partial<LimbSalvageConsent>) => {
    if (!treatmentConsent) return;
    onUpdate({ treatmentConsent: { ...treatmentConsent, ...patch } });
  };

  const consentReady = isConsentComplete(treatmentConsent);

  // Chronic osteomyelitis assessment
  const isChronicOM = osteomyelitis?.suspected && (
    osteomyelitis.chronicity === 'chronic' || 
    (osteomyelitis.durationInWeeks && osteomyelitis.durationInWeeks > 6)
  );
  const hasFailedOMTreatment = osteomyelitis?.recurrent || 
    (osteomyelitis?.previousAntibiotic && osteomyelitis?.previousDebridement);
  // hasSequestrumOrSevereChanges used for conditional display in warning section
  const _hasSequestrumOrSevereChanges = osteomyelitis?.sequestrum || 
    osteomyelitis?.involvedCortex === 'full_thickness';
  void _hasSequestrumOrSevereChanges; // Silence unused warning

  const getRiskBgColor = (risk: string): string => {
    switch (risk) {
      case 'low': return 'bg-green-50 border-green-200';
      case 'moderate': return 'bg-yellow-50 border-yellow-200';
      case 'high': return 'bg-orange-50 border-orange-200';
      case 'very_high': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Get salvage probability color
  const getSalvageColor = (probability: string): string => {
    switch (probability) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'very_poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get management color
  const getManagementColor = (management: string): string => {
    switch (management) {
      case 'conservative': return 'bg-green-100 text-green-800 border-green-300';
      case 'revascularization': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'minor_amputation': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'major_amputation': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format management text
  const formatManagement = (management: string): string => {
    return management.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Group recommendations by category
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, LimbSalvageRecommendation[]>);

  // Priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <Activity className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 6: Score & Recommendations</h3>
        <p className="text-sm text-gray-600">Review calculated scores and treatment recommendations</p>
      </div>

      {/* Investigation Gate (soft warning) */}
      {gate && !gate.clear && (
        <div className="border-2 border-yellow-400 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FlaskConical className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900">
                {gate.outstanding.length} requested investigation{gate.outstanding.length === 1 ? '' : 's'} not yet completed
              </h4>
              <p className="text-sm text-yellow-800 mt-1">
                Scoring is most accurate after all requested investigations are completed. You may proceed, but please document your reason below.
              </p>
              <ul className="text-xs text-yellow-800 list-disc pl-5 mt-2 max-h-32 overflow-y-auto">
                {gate.outstanding.slice(0, 10).map((o) => (
                  <li key={o.itemId}>
                    {o.name} <span className="text-yellow-600">({o.category} · {o.status})</span>
                  </li>
                ))}
                {gate.outstanding.length > 10 && (
                  <li className="italic">+ {gate.outstanding.length - 10} more…</li>
                )}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {patientId && (
                  <Link
                    to={`/patients/${patientId}/investigations/request/new?source=limb_salvage`}
                    className="text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                  >
                    Request More Investigations
                  </Link>
                )}
                {patientId && (
                  <Link
                    to={`/patients/${patientId}/investigations/request`}
                    className="text-xs px-2 py-1 bg-white border border-yellow-600 text-yellow-700 rounded"
                  >
                    View Pending
                  </Link>
                )}
              </div>
              <label className="block mt-3">
                <span className="text-xs font-semibold text-yellow-900">
                  Reason for proceeding without completing investigations <span className="text-red-600">*</span>
                </span>
                <textarea
                  className="mt-1 w-full text-sm border border-yellow-400 rounded px-2 py-1"
                  rows={2}
                  value={gateOverrideReason || ''}
                  onChange={(e) => onUpdate({ gateOverrideReason: e.target.value })}
                  placeholder="e.g. clinical urgency, patient unable to wait, results clinically inferable…"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Score Card */}
      <div className={`border-2 rounded-xl p-6 ${getRiskBgColor(limbSalvageScore.riskCategory)}`}>
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Limb Salvage Risk Score</h4>
          
          {/* Score Circle */}
          <div className="my-6 flex justify-center">
            <div className="relative">
              <svg className="w-40 h-40">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={limbSalvageScore.riskCategory === 'low' ? '#22c55e' :
                          limbSalvageScore.riskCategory === 'moderate' ? '#eab308' :
                          limbSalvageScore.riskCategory === 'high' ? '#f97316' : '#ef4444'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(limbSalvageScore.percentage / 100) * 440} 440`}
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{limbSalvageScore.totalScore}</span>
                <span className="text-sm text-gray-500">/ {limbSalvageScore.maxScore}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-2xl font-bold capitalize">
              {limbSalvageScore.riskCategory.replace('_', ' ')} Risk
            </p>
            <p className={`text-lg font-medium ${getSalvageColor(limbSalvageScore.salvageProbability)}`}>
              Limb Salvage Probability: {limbSalvageScore.salvageProbability.charAt(0).toUpperCase() + limbSalvageScore.salvageProbability.slice(1).replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Score Breakdown
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Wound', score: limbSalvageScore.woundScore, max: 25, color: 'bg-purple-500' },
            { label: 'Ischemia', score: limbSalvageScore.ischemiaScore, max: 20, color: 'bg-red-500' },
            { label: 'Infection', score: limbSalvageScore.infectionScore, max: 20, color: 'bg-orange-500' },
            { label: 'Renal', score: limbSalvageScore.renalScore, max: 10, color: 'bg-purple-500' },
            { label: 'Comorbidity', score: limbSalvageScore.comorbidityScore, max: 15, color: 'bg-blue-500' },
            { label: 'Age', score: limbSalvageScore.ageScore, max: 5, color: 'bg-gray-500' },
            { label: 'Nutrition', score: limbSalvageScore.nutritionalScore, max: 5, color: 'bg-green-500' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <div className="relative h-2 bg-gray-200 rounded-full">
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full ${item.color}`}
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <p className="text-sm font-medium mt-1">{item.score}/{item.max}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`border-2 rounded-lg p-4 ${getManagementColor(recommendedManagement)}`}>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recommended Management
          </h4>
          <p className="text-xl font-bold">{formatManagement(recommendedManagement)}</p>
        </div>

        {recommendedAmputationLevel !== 'none' && (
          <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-800">
              <Scissors className="h-5 w-5" />
              Amputation Level
            </h4>
            <p className="text-lg font-bold text-orange-900">
              {amputationDescriptions[recommendedAmputationLevel]}
            </p>
          </div>
        )}
      </div>

      {/* Recommendations by Category */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Treatment Recommendations
        </h4>

        {Object.entries(groupedRecommendations).map(([category, recs]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              {category === 'immediate' && <AlertTriangle className="h-4 w-4 text-red-500" />}
              {category === 'short_term' && <Clock className="h-4 w-4 text-orange-500" />}
              {category === 'long_term' && <Target className="h-4 w-4 text-blue-500" />}
              {category.replace('_', ' ')} Actions
            </h5>
            <div className="space-y-2">
              {recs.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {getPriorityIcon(rec.priority)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rec.recommendation}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.rationale}</p>
                    {rec.timeframe && (
                      <p className="text-xs text-blue-600 mt-1">Timeframe: {rec.timeframe}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {recommendations.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Recommendations will be generated after completing the assessment.
          </p>
        )}
      </div>

      {/* ============================================================
          PATIENT CONSENT — STATEMENT OF CARE OPTIONS
          The patient must be presented with all reasonable options,
          select a preferred option, and sign together with a witness
          before treatment can be commenced.
          ============================================================ */}
      {treatmentConsent && (
        <div className="bg-white border-2 border-indigo-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-600" />
              Patient Consent & Statement of Care Options
            </h3>
            {consentReady ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                <CheckCircle className="h-4 w-4" /> Consent complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                <AlertTriangle className="h-4 w-4" /> Consent incomplete
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mb-4">
            The following management options were generated from the scoring above. The patient must be
            offered all reasonable alternatives, given an opportunity to ask questions, and select a
            preferred option. The selected option, the patient signature and a witness signature must all
            be recorded before treatment is commenced.
          </p>

          {/* Refusal toggle */}
          <label className="flex items-center gap-2 mb-4 p-3 border-2 border-red-200 bg-red-50 rounded">
            <input
              type="checkbox"
              checked={treatmentConsent.refusedTreatment}
              onChange={(e) => updateConsent({ refusedTreatment: e.target.checked, selectedOption: e.target.checked ? undefined : treatmentConsent.selectedOption })}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm font-medium text-red-900">Patient declines all recommended treatment options</span>
          </label>

          {treatmentConsent.refusedTreatment ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for refusal</label>
              <textarea
                value={treatmentConsent.refusalReason || ''}
                onChange={(e) => updateConsent({ refusalReason: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Document the patient's reason for declining and confirmation that the consequences (including limb and life-threatening risks) were explained."
              />
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-gray-800">Available care options (select one):</p>
              {treatmentConsent.optionsPresented.map((opt) => {
                const checked = treatmentConsent.selectedOption === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`block p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      checked ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="consent-option"
                        checked={checked}
                        onChange={() => updateConsent({ selectedOption: opt.id as LimbSalvageConsentOption, selectedOptionLabel: opt.label })}
                        className="mt-1 w-4 h-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {opt.label}
                          {opt.recommended && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Recommended</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-700 mt-1">{opt.description}</p>
                        <p className="text-xs text-gray-700 mt-1"><span className="font-semibold">Expected outcome:</span> {opt.expectedOutcome}</p>
                        <p className="text-xs text-red-700 mt-1"><span className="font-semibold">Risks:</span> {opt.risks}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* Counselling confirmations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {[
              { key: 'patientUnderstands', label: 'Patient understands the explanation' },
              { key: 'questionsAnswered', label: 'Patient questions answered' },
              { key: 'alternativesDiscussed', label: 'Alternatives discussed' },
              { key: 'risksExplained', label: 'Risks explained' },
              { key: 'interpreterUsed', label: 'Interpreter used' },
            ].map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={!!(treatmentConsent as any)[c.key]}
                  onChange={(e) => updateConsent({ [c.key]: e.target.checked } as Partial<LimbSalvageConsent>)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                {c.label}
              </label>
            ))}
          </div>

          {treatmentConsent.interpreterUsed && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Interpreter name</label>
              <input
                type="text"
                value={treatmentConsent.interpreterName || ''}
                onChange={(e) => updateConsent({ interpreterName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          )}

          {/* Signatures */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <PenSquare className="h-4 w-4 text-indigo-600" /> Signatures
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Patient */}
              <div className="p-3 border rounded">
                <p className="text-xs font-medium text-gray-700 mb-1">Patient (or representative)</p>
                <input
                  type="text"
                  placeholder="Full name"
                  value={treatmentConsent.patientSignatureName || ''}
                  onChange={(e) => updateConsent({ patientSignatureName: e.target.value, patientSignedAt: e.target.value ? new Date() : undefined })}
                  className="w-full px-2 py-1 border rounded text-sm mb-2"
                />
                <select
                  value={treatmentConsent.patientRelationship || 'self'}
                  onChange={(e) => updateConsent({ patientRelationship: e.target.value as LimbSalvageConsent['patientRelationship'] })}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="self">Self</option>
                  <option value="next_of_kin">Next of kin</option>
                  <option value="guardian">Legal guardian</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                </select>
                {treatmentConsent.patientSignedAt && (
                  <p className="text-xs text-gray-500 mt-1">Signed: {new Date(treatmentConsent.patientSignedAt).toLocaleString()}</p>
                )}
              </div>
              {/* Witness */}
              <div className="p-3 border rounded">
                <p className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><UserCheck className="h-3 w-3" /> Witness</p>
                <input
                  type="text"
                  placeholder="Witness full name"
                  value={treatmentConsent.witnessName || ''}
                  onChange={(e) => updateConsent({ witnessName: e.target.value, witnessSignedAt: e.target.value ? new Date() : undefined })}
                  className="w-full px-2 py-1 border rounded text-sm mb-2"
                />
                <input
                  type="text"
                  placeholder="Role / designation"
                  value={treatmentConsent.witnessDesignation || ''}
                  onChange={(e) => updateConsent({ witnessDesignation: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                {treatmentConsent.witnessSignedAt && (
                  <p className="text-xs text-gray-500 mt-1">Signed: {new Date(treatmentConsent.witnessSignedAt).toLocaleString()}</p>
                )}
              </div>
              {/* Clinician */}
              <div className="p-3 border rounded">
                <p className="text-xs font-medium text-gray-700 mb-1">Counselling clinician</p>
                <input
                  type="text"
                  placeholder="Clinician full name"
                  value={treatmentConsent.clinicianName || ''}
                  onChange={(e) => updateConsent({ clinicianName: e.target.value, clinicianSignedAt: e.target.value ? new Date() : undefined })}
                  className="w-full px-2 py-1 border rounded text-sm mb-2"
                />
                <input
                  type="text"
                  placeholder="Designation"
                  value={treatmentConsent.clinicianDesignation || ''}
                  onChange={(e) => updateConsent({ clinicianDesignation: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                {treatmentConsent.clinicianSignedAt && (
                  <p className="text-xs text-gray-500 mt-1">Signed: {new Date(treatmentConsent.clinicianSignedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Consent notes (optional)</label>
            <textarea
              value={treatmentConsent.notes || ''}
              onChange={(e) => updateConsent({ notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          {!consentReady && (
            <div className="mt-4 bg-amber-50 border border-amber-300 rounded p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Consent incomplete.</strong> Treatment may not be commenced until the patient has
                selected an option (or signed a refusal), and the patient and witness have signed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Treatment Plan & Follow-up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Treatment Notes
          </label>
          <textarea
            value={treatmentPlan}
            onChange={(e) => onUpdate({ treatmentPlan: e.target.value })}
            rows={4}
            placeholder="Enter any additional treatment notes or modifications..."
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Follow-up Date
          </label>
          <input
            type="date"
            value={followUpDate ? new Date(followUpDate).toISOString().split('T')[0] : ''}
            onChange={(e) => onUpdate({ followUpDate: new Date(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-2">
            Recommended follow-up based on risk:
            {limbSalvageScore.riskCategory === 'very_high' && ' 1-3 days'}
            {limbSalvageScore.riskCategory === 'high' && ' 1 week'}
            {limbSalvageScore.riskCategory === 'moderate' && ' 2 weeks'}
            {limbSalvageScore.riskCategory === 'low' && ' 4 weeks'}
          </p>
        </div>
      </div>

      {/* CHRONIC OSTEOMYELITIS WARNING - CRITICAL FOR AMPUTATION DECISION */}
      {isChronicOM && (
        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bone className="h-6 w-6 text-red-700 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-800 text-lg flex items-center gap-2">
                ⚠️ CHRONIC OSTEOMYELITIS IDENTIFIED
                {hasFailedOMTreatment && <span className="text-sm bg-red-200 px-2 py-0.5 rounded">Treatment Failed</span>}
              </p>
              
              <div className="mt-3 space-y-2 text-sm text-red-800">
                <p className="font-semibold">
                  Chronic osteomyelitis ({osteomyelitis?.durationInWeeks || '>6'} weeks) is a CRITICAL factor in limb salvage decisions:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Cure rates with surgery + antibiotics: <strong>60-80%</strong> (vs &gt;90% for acute)</li>
                  <li>Multiple surgeries often required with uncertain outcomes</li>
                  <li>Prolonged antibiotic therapy (6+ weeks) with toxicity risks</li>
                  <li>Recurrence rate: 20-30% even after aggressive treatment</li>
                </ul>
                
                {osteomyelitis?.sequestrum && (
                  <p className="bg-red-200 p-2 rounded mt-2">
                    <strong>🔴 SEQUESTRUM PRESENT:</strong> Dead bone acts as foreign body and biofilm reservoir. 
                    Antibiotics cannot penetrate. Surgical removal or amputation is mandatory.
                  </p>
                )}
                
                {osteomyelitis?.cloacae && (
                  <p className="bg-red-200 p-2 rounded">
                    <strong>🔴 SINUS TRACTS (CLOACAE):</strong> Drainage tracts through bone indicate chronic infection 
                    that rarely heals without radical surgery or amputation.
                  </p>
                )}
                
                {hasFailedOMTreatment && (
                  <p className="bg-red-200 p-2 rounded">
                    <strong>🔴 TREATMENT FAILURE:</strong> 
                    {osteomyelitis?.recurrent && ' Recurrent infection after treatment. '}
                    {osteomyelitis?.previousAntibiotic && osteomyelitis?.previousDebridement && 
                      ' Combined antibiotic + surgical therapy has failed. '}
                    <br />
                    <strong>Strong indication for definitive amputation</strong> - weigh quality of life benefits 
                    of early amputation vs prolonged, likely futile, limb salvage attempts.
                  </p>
                )}
                
                {osteomyelitis?.affectedBones && osteomyelitis.affectedBones.length >= 3 && (
                  <p className="bg-red-200 p-2 rounded">
                    <strong>🔴 MULTI-BONE INVOLVEMENT:</strong> {osteomyelitis.affectedBones.length} bones affected 
                    ({osteomyelitis.affectedBones.join(', ')}). Extensive involvement typically requires 
                    amputation proximal to all infected bone.
                  </p>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-white border border-red-300 rounded">
                <p className="font-semibold text-red-900">Recommended Action:</p>
                <p className="text-red-800">
                  Urgent multidisciplinary team (MDT) discussion required. Present chronic osteomyelitis findings 
                  and discuss with patient/family the benefits of definitive amputation including:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-2">
                  <li>Faster return to function with prosthesis</li>
                  <li>Elimination of infection and sepsis risk</li>
                  <li>Avoidance of multiple surgeries and prolonged hospitalization</li>
                  <li>Improved quality of life compared to non-healing wounds</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Warning */}
      {limbSalvageScore.riskCategory === 'very_high' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold text-red-800">CRITICAL: Very High Risk Assessment</p>
              <p className="text-sm text-red-700 mt-1">
                This patient has a very high risk score indicating poor limb salvage probability. 
                Immediate multidisciplinary team (MDT) discussion is strongly recommended. 
                Consider urgent vascular surgery consultation and discuss amputation options with patient and family.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
