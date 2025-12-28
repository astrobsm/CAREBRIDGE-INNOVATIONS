// Step 5: Comorbidities Assessment (Renal, Diabetes, Cardiovascular)
import { Heart, Pill, AlertCircle } from 'lucide-react';
import type { RenalStatus, DiabeticFootComorbidities } from '../../../types';

interface ComorbiditiesStepProps {
  renalStatus: RenalStatus;
  comorbidities: DiabeticFootComorbidities;
  albumin: number;
  prealbumin: number;
  bmi: number;
  mustScore: number;
  onUpdate: (data: Partial<{
    renalStatus: RenalStatus;
    comorbidities: DiabeticFootComorbidities;
    albumin: number;
    prealbumin: number;
    bmi: number;
    mustScore: number;
  }>) => void;
}

export default function ComorbiditiesStep({
  renalStatus,
  comorbidities,
  albumin,
  prealbumin,
  bmi,
  mustScore,
  onUpdate,
}: ComorbiditiesStepProps) {

  const updateRenal = (field: string, value: any) => {
    onUpdate({
      renalStatus: {
        ...renalStatus,
        [field]: value,
      },
    });
  };

  const updateComorbidity = (field: string, value: any) => {
    onUpdate({
      comorbidities: {
        ...comorbidities,
        [field]: value,
      },
    });
  };

  // Calculate CKD stage from eGFR
  const getCKDStage = (egfr: number): 1 | 2 | 3 | 4 | 5 => {
    if (egfr >= 90) return 1;
    if (egfr >= 60) return 2;
    if (egfr >= 30) return 3;
    if (egfr >= 15) return 4;
    return 5;
  };

  const handleEGFRChange = (egfr: number) => {
    const stage = getCKDStage(egfr);
    onUpdate({
      renalStatus: {
        ...renalStatus,
        egfr,
        ckdStage: stage,
      },
    });
  };

  // Get CKD stage color
  const getCKDColor = (stage: number): string => {
    switch (stage) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-red-100 text-red-800';
      case 5: return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get albumin interpretation
  const getAlbuminStatus = (albumin: number): { text: string; color: string } => {
    if (albumin >= 3.5) return { text: 'Normal', color: 'text-green-600' };
    if (albumin >= 3.0) return { text: 'Mildly low', color: 'text-yellow-600' };
    if (albumin >= 2.5) return { text: 'Moderately low', color: 'text-orange-600' };
    return { text: 'Severely low', color: 'text-red-600' };
  };

  const albuminStatus = getAlbuminStatus(albumin);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 5: Comorbidities</h3>
        <p className="text-sm text-gray-600">Assess renal function, diabetes control, and cardiovascular status</p>
      </div>

      {/* Renal Status */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-500" />
            Renal Function
          </h4>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCKDColor(renalStatus.ckdStage)}`}>
            CKD Stage {renalStatus.ckdStage}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creatinine (mg/dL)</label>
            <input
              type="number"
              step="0.1"
              value={renalStatus.creatinine}
              onChange={(e) => updateRenal('creatinine', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BUN (mg/dL)</label>
            <input
              type="number"
              step="0.1"
              value={renalStatus.bun || ''}
              onChange={(e) => updateRenal('bun', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">eGFR (mL/min/1.73m²)</label>
            <input
              type="number"
              value={renalStatus.egfr}
              onChange={(e) => handleEGFRChange(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CKD Stage</label>
            <select
              value={renalStatus.ckdStage}
              onChange={(e) => updateRenal('ckdStage', parseInt(e.target.value) as 1|2|3|4|5)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={1}>Stage 1 (≥90)</option>
              <option value={2}>Stage 2 (60-89)</option>
              <option value={3}>Stage 3 (30-59)</option>
              <option value={4}>Stage 4 (15-29)</option>
              <option value={5}>Stage 5 (&lt;15)</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={renalStatus.onDialysis}
              onChange={(e) => updateRenal('onDialysis', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <span className="font-medium">On Dialysis</span>
          </label>
          {renalStatus.onDialysis && (
            <div className="grid grid-cols-2 gap-4 ml-7">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dialysis Type</label>
                <select
                  value={renalStatus.dialysisType || ''}
                  onChange={(e) => updateRenal('dialysisType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select...</option>
                  <option value="hemodialysis">Hemodialysis</option>
                  <option value="peritoneal">Peritoneal Dialysis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <input
                  type="text"
                  value={renalStatus.dialysisFrequency || ''}
                  onChange={(e) => updateRenal('dialysisFrequency', e.target.value)}
                  placeholder="e.g., 3x/week"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diabetes Control */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-500" />
            Diabetes Control
          </h4>
          {comorbidities.hba1c && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              comorbidities.hba1c <= 7 ? 'bg-green-100 text-green-800' :
              comorbidities.hba1c <= 8 ? 'bg-yellow-100 text-yellow-800' :
              comorbidities.hba1c <= 9 ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              HbA1c: {comorbidities.hba1c}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diabetes Type</label>
            <select
              value={comorbidities.diabetesType}
              onChange={(e) => updateComorbidity('diabetesType', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="type2">Type 2</option>
              <option value="type1">Type 1</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (years)</label>
            <input
              type="number"
              value={comorbidities.diabetesDuration}
              onChange={(e) => updateComorbidity('diabetesDuration', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HbA1c (%)</label>
            <input
              type="number"
              step="0.1"
              value={comorbidities.hba1c || ''}
              onChange={(e) => updateComorbidity('hba1c', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last FBS (mmol/L)</label>
            <input
              type="number"
              step="0.1"
              value={comorbidities.lastFastingGlucose || ''}
              onChange={(e) => updateComorbidity('lastFastingGlucose', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.onInsulin}
              onChange={(e) => updateComorbidity('onInsulin', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">On Insulin</span>
          </label>
          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.retinopathy}
              onChange={(e) => updateComorbidity('retinopathy', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">Retinopathy</span>
          </label>
          <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.neuropathy}
              onChange={(e) => updateComorbidity('neuropathy', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">Neuropathy</span>
          </label>
        </div>
      </div>

      {/* Cardiovascular */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-red-500" />
          Cardiovascular Status
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.hypertension}
              onChange={(e) => updateComorbidity('hypertension', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <span>Hypertension</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.coronaryArteryDisease}
              onChange={(e) => updateComorbidity('coronaryArteryDisease', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <span>Coronary Artery Disease</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.heartFailure}
              onChange={(e) => updateComorbidity('heartFailure', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <span>Heart Failure</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.previousMI}
              onChange={(e) => updateComorbidity('previousMI', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <span>Previous MI</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.previousStroke}
              onChange={(e) => updateComorbidity('previousStroke', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <span>Previous Stroke/TIA</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.peripheralVascularDisease}
              onChange={(e) => updateComorbidity('peripheralVascularDisease', e.target.checked)}
              className="w-5 h-5 text-red-600 rounded"
            />
            <span>PVD</span>
          </label>
        </div>
      </div>

      {/* Other Comorbidities & Risk Factors */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Other Risk Factors</h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.previousAmputation}
              onChange={(e) => updateComorbidity('previousAmputation', e.target.checked)}
              className="w-5 h-5 text-orange-600 rounded"
            />
            <span>Previous Amputation</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.smoking}
              onChange={(e) => updateComorbidity('smoking', e.target.checked)}
              className="w-5 h-5 text-orange-600 rounded"
            />
            <span>Smoking</span>
          </label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={comorbidities.chronicKidneyDisease}
              onChange={(e) => updateComorbidity('chronicKidneyDisease', e.target.checked)}
              className="w-5 h-5 text-orange-600 rounded"
            />
            <span>CKD</span>
          </label>
        </div>

        {comorbidities.previousAmputation && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Previous Amputation Level</label>
            <input
              type="text"
              value={comorbidities.previousAmputationLevel || ''}
              onChange={(e) => updateComorbidity('previousAmputationLevel', e.target.value)}
              placeholder="e.g., Right BKA"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        )}

        {comorbidities.smoking && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pack Years</label>
            <input
              type="number"
              value={comorbidities.smokingPackYears || ''}
              onChange={(e) => updateComorbidity('smokingPackYears', parseInt(e.target.value) || 0)}
              className="w-full max-w-xs px-3 py-2 border rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Nutritional Status */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Nutritional Status</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Albumin (g/dL)</label>
            <input
              type="number"
              step="0.1"
              value={albumin}
              onChange={(e) => onUpdate({ albumin: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className={`text-xs mt-1 ${albuminStatus.color}`}>{albuminStatus.text}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prealbumin (mg/dL)</label>
            <input
              type="number"
              step="0.1"
              value={prealbumin}
              onChange={(e) => onUpdate({ prealbumin: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BMI (kg/m²)</label>
            <input
              type="number"
              step="0.1"
              value={bmi}
              onChange={(e) => onUpdate({ bmi: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MUST Score</label>
            <select
              value={mustScore}
              onChange={(e) => onUpdate({ mustScore: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - Low Risk</option>
              <option value={1}>1 - Medium Risk</option>
              <option value={2}>2+ - High Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning for high-risk comorbidities */}
      {(renalStatus.ckdStage >= 4 || renalStatus.onDialysis || comorbidities.heartFailure) && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">High-Risk Comorbidity Profile</p>
              <p>
                {renalStatus.onDialysis && 'Dialysis dependence significantly impacts healing. '}
                {renalStatus.ckdStage >= 4 && 'Advanced CKD (Stage 4-5) associated with poor wound healing. '}
                {comorbidities.heartFailure && 'Heart failure may limit surgical options. '}
                Consider MDT discussion.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
