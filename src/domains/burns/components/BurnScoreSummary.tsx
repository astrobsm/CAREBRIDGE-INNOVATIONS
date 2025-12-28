// Burn Score Summary Component
// Displays all calculated scores with mortality risk

import { 
  Calculator, 
  AlertTriangle, 
  TrendingUp,
  Building2,
  Info,
} from 'lucide-react';
import type { 
  TBSACalculation, 
  BauxScore, 
  RevisedBauxScore, 
  ABSIScore,
  qSOFAScore,
  SOFAScore,
} from '../types';
import { checkBurnCenterCriteria } from '../services/burnScoringService';

interface BurnScoreSummaryProps {
  tbsaCalc?: TBSACalculation;
  bauxScore?: BauxScore;
  revisedBaux?: RevisedBauxScore;
  absiScore?: ABSIScore;
  qsofaScore?: qSOFAScore;
  sofaScore?: SOFAScore;
  patientAge: number;
  hasInhalationInjury: boolean;
}

export default function BurnScoreSummary({
  tbsaCalc,
  bauxScore,
  revisedBaux,
  absiScore,
  qsofaScore,
  sofaScore,
  patientAge,
  hasInhalationInjury,
}: BurnScoreSummaryProps) {
  
  // Simplified burn center criteria check - using meetsCriteria and reasons from service
  const hasReferralCriteria = (tbsaCalc?.totalTBSA || 0) > 10 || hasInhalationInjury || patientAge < 10 || patientAge > 50;
  const referralReasons: string[] = [];
  if ((tbsaCalc?.totalTBSA || 0) > 10) referralReasons.push(`TBSA >10% (${tbsaCalc?.totalTBSA?.toFixed(1)}%)`);
  if (hasInhalationInjury) referralReasons.push('Inhalation injury present');
  if (patientAge < 10 || patientAge > 50) referralReasons.push(`Age extremes: ${patientAge} years`);

  // Score card component
  const ScoreCard = ({
    title,
    value,
    unit,
    interpretation,
    color,
    details,
  }: {
    title: string;
    value: string | number;
    unit?: string;
    interpretation: string;
    color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
    details?: React.ReactNode;
  }) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-600',
    };

    return (
      <div className={`p-4 rounded-lg border ${colors[color]}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        <p className="text-sm mt-1">{interpretation}</p>
        {details && <div className="mt-2 pt-2 border-t border-current border-opacity-20 text-xs">{details}</div>}
      </div>
    );
  };

  // Get score color
  const getABSIColor = (score?: number): 'green' | 'yellow' | 'orange' | 'red' | 'gray' => {
    if (!score) return 'gray';
    if (score <= 5) return 'green';
    if (score <= 7) return 'yellow';
    if (score <= 10) return 'orange';
    return 'red';
  };

  const getBauxColor = (score?: number): 'green' | 'yellow' | 'orange' | 'red' | 'gray' => {
    if (!score) return 'gray';
    if (score < 80) return 'green';
    if (score < 100) return 'yellow';
    if (score < 120) return 'orange';
    return 'red';
  };

  const getQSOFAColor = (score?: number): 'green' | 'yellow' | 'orange' | 'red' | 'gray' => {
    if (score === undefined) return 'gray';
    if (score === 0) return 'green';
    if (score === 1) return 'yellow';
    return 'red';
  };

  const getSOFAColor = (score?: number): 'green' | 'yellow' | 'orange' | 'red' | 'gray' => {
    if (score === undefined) return 'gray';
    if (score < 2) return 'green';
    if (score < 7) return 'yellow';
    if (score < 11) return 'orange';
    return 'red';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-purple-600" />
        <div>
          <h3 className="font-semibold text-gray-900">Burn Severity Scores</h3>
          <p className="text-sm text-gray-500">WHO/ISBI guideline-based assessment</p>
        </div>
      </div>

      {/* Burn Center Referral Alert */}
      {hasReferralCriteria && (
        <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
          <div className="flex items-start gap-3">
            <Building2 className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-800">BURN CENTER REFERRAL INDICATED</h4>
              <p className="text-sm text-red-700 mt-1">
                This patient meets criteria for transfer to a specialized burn center:
              </p>
              <ul className="mt-2 space-y-1">
                {referralReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Primary Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* TBSA */}
        <ScoreCard
          title="Total TBSA"
          value={tbsaCalc?.totalTBSA?.toFixed(1) || '--'}
          unit="%"
          interpretation={
            !tbsaCalc?.totalTBSA ? 'Not calculated' :
            tbsaCalc.totalTBSA < 10 ? 'Minor burn' :
            tbsaCalc.totalTBSA < 20 ? 'Moderate burn' :
            tbsaCalc.totalTBSA < 40 ? 'Major burn' :
            'Severe burn'
          }
          color={
            !tbsaCalc?.totalTBSA ? 'gray' :
            tbsaCalc.totalTBSA < 10 ? 'green' :
            tbsaCalc.totalTBSA < 20 ? 'yellow' :
            tbsaCalc.totalTBSA < 40 ? 'orange' : 'red'
          }
          details={tbsaCalc && (
            <div className="space-y-1">
              <p>Full thickness: {tbsaCalc.fullThicknessTBSA?.toFixed(1) || 0}%</p>
              <p>Method: {tbsaCalc.method === 'lund_browder' ? 'Lund-Browder' : 'Rule of 9s'}</p>
            </div>
          )}
        />

        {/* Baux Score */}
        <ScoreCard
          title="Baux Score"
          value={bauxScore?.score?.toFixed(0) || '--'}
          interpretation={
            !bauxScore ? 'Not calculated' :
            `${bauxScore.mortalityRisk} mortality risk`
          }
          color={getBauxColor(bauxScore?.score)}
          details={bauxScore && (
            <p className="text-xs">
              Age ({patientAge}) + TBSA ({tbsaCalc?.totalTBSA?.toFixed(0) || 0}%)
            </p>
          )}
        />

        {/* Revised Baux Score */}
        <ScoreCard
          title="Revised Baux"
          value={revisedBaux?.score?.toFixed(0) || '--'}
          interpretation={
            !revisedBaux ? 'Not calculated' :
            `${revisedBaux.mortalityRisk} mortality`
          }
          color={getBauxColor(revisedBaux?.score)}
          details={revisedBaux && hasInhalationInjury && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>+17 for inhalation injury</span>
            </div>
          )}
        />

        {/* ABSI Score */}
        <ScoreCard
          title="ABSI Score"
          value={absiScore?.totalScore || '--'}
          interpretation={absiScore?.threatLevel ? `${absiScore.threatLevel.replace('_', ' ')} threat` : 'Not calculated'}
          color={getABSIColor(absiScore?.totalScore)}
          details={absiScore && (
            <div className="space-y-1">
              <p>Survival: {absiScore.survivalProbability}</p>
              <p className="text-xs text-gray-500">
                Age + Sex + TBSA + Inhalation + Full-thickness
              </p>
            </div>
          )}
        />

        {/* qSOFA */}
        <ScoreCard
          title="qSOFA Score"
          value={qsofaScore?.score ?? '--'}
          unit="/3"
          interpretation={
            qsofaScore === undefined ? 'Not calculated' :
            qsofaScore.sepsisRisk === 'high' ? 'High sepsis risk' : 'Low sepsis risk'
          }
          color={getQSOFAColor(qsofaScore?.score)}
          details={qsofaScore && (
            <div className="space-y-1">
              <p className="flex items-center gap-1">
                {qsofaScore.alteredMentation ? '✓' : '○'} Altered mentation
              </p>
              <p className="flex items-center gap-1">
                {qsofaScore.systolicBP <= 100 ? '✓' : '○'} SBP ≤100
              </p>
              <p className="flex items-center gap-1">
                {qsofaScore.respiratoryRate >= 22 ? '✓' : '○'} RR ≥22
              </p>
            </div>
          )}
        />

        {/* SOFA */}
        <ScoreCard
          title="SOFA Score"
          value={sofaScore?.totalScore ?? '--'}
          unit="/24"
          interpretation={
            sofaScore === undefined ? 'Not calculated' :
            sofaScore.interpretation
          }
          color={getSOFAColor(sofaScore?.totalScore)}
          details={sofaScore && (
            <div className="grid grid-cols-3 gap-1 text-xs">
              <span>Resp: {sofaScore.components.respiration}</span>
              <span>Coag: {sofaScore.components.coagulation}</span>
              <span>Liver: {sofaScore.components.liver}</span>
              <span>CV: {sofaScore.components.cardiovascular}</span>
              <span>CNS: {sofaScore.components.cns}</span>
              <span>Renal: {sofaScore.components.renal}</span>
            </div>
          )}
        />
      </div>

      {/* Score Interpretation Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-800">Score Interpretation Guide</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium">ABSI (Abbreviated Burn Severity Index)</p>
            <ul className="text-xs space-y-1 mt-1">
              <li>2-5: Very low mortality (&lt;10%)</li>
              <li>6-7: Moderate mortality (10-40%)</li>
              <li>8-10: High mortality (40-90%)</li>
              <li>&gt;10: Very high mortality (&gt;90%)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">qSOFA (Quick SOFA)</p>
            <ul className="text-xs space-y-1 mt-1">
              <li>0: Low risk</li>
              <li>1: Monitor closely</li>
              <li>≥2: High risk - assess for sepsis</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Baux Score</p>
            <ul className="text-xs space-y-1 mt-1">
              <li>&lt;80: Generally favorable prognosis</li>
              <li>80-100: Guarded prognosis</li>
              <li>100-120: Poor prognosis</li>
              <li>&gt;120: Often non-survivable</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">SOFA Score</p>
            <ul className="text-xs space-y-1 mt-1">
              <li>&lt;2: Low mortality (~0-5%)</li>
              <li>2-6: Low-moderate (~10-20%)</li>
              <li>7-9: Moderate-high (~30-40%)</li>
              <li>10-14: High (~50-60%)</li>
              <li>≥15: Very high (&gt;80%)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Trend Indicator */}
      {sofaScore && sofaScore.totalScore >= 2 && (
        <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-lg">
          <TrendingUp className="h-5 w-5" />
          <span>
            <strong>Monitor for organ dysfunction:</strong> SOFA ≥2 with increase of ≥2 points 
            indicates sepsis per Sepsis-3 criteria
          </span>
        </div>
      )}
    </div>
  );
}
