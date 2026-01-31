// Step 6: Score Summary & Recommendations
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Activity,
  Clock,
  FileText,
  Scissors,
  Bone
} from 'lucide-react';
import type { 
  LimbSalvageScore, 
  LimbSalvageRecommendation,
  AmputationLevel,
  OsteomyelitisAssessment
} from '../../../types';

interface ScoreSummaryStepProps {
  limbSalvageScore: LimbSalvageScore;
  recommendations: LimbSalvageRecommendation[];
  recommendedManagement: string;
  recommendedAmputationLevel: AmputationLevel;
  treatmentPlan: string;
  followUpDate: Date | null;
  osteomyelitis?: OsteomyelitisAssessment;
  onUpdate: (data: Partial<{
    treatmentPlan: string;
    followUpDate: Date;
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
  onUpdate,
}: ScoreSummaryStepProps) {

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
