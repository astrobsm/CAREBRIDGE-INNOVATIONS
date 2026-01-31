// Step 4: Infection & Osteomyelitis Assessment
import { Bug, Bone, AlertTriangle } from 'lucide-react';
import type { OsteomyelitisAssessment, SepsisAssessment } from '../../../types';

interface InfectionOsteoStepProps {
  osteomyelitis: OsteomyelitisAssessment;
  sepsis: SepsisAssessment;
  monofilamentTest: boolean;
  vibrationSense: boolean;
  ankleReflexes: 'present' | 'diminished' | 'absent';
  neuropathySymptoms: string[];
  onUpdate: (data: Partial<{
    osteomyelitis: OsteomyelitisAssessment;
    sepsis: SepsisAssessment;
    monofilamentTest: boolean;
    vibrationSense: boolean;
    ankleReflexes: 'present' | 'diminished' | 'absent';
    neuropathySymptoms: string[];
  }>) => void;
}

const commonBones = [
  '1st Metatarsal Head',
  '2nd Metatarsal',
  '3rd Metatarsal',
  '4th Metatarsal',
  '5th Metatarsal Head',
  'Great Toe (Hallux)',
  '2nd Toe',
  '3rd Toe',
  '4th Toe',
  '5th Toe',
  'Calcaneus (Heel)',
  'Cuboid',
  'Navicular',
  'Cuneiforms',
];

const neuropathySymptomOptions = [
  'Burning sensation',
  'Tingling/Pins and needles',
  'Numbness',
  'Sharp/Shooting pain',
  'Cramping',
  'Hypersensitivity',
  'Loss of balance',
  'Weakness',
];

export default function InfectionOsteoStep({
  osteomyelitis,
  sepsis,
  monofilamentTest,
  vibrationSense,
  ankleReflexes,
  neuropathySymptoms,
  onUpdate,
}: InfectionOsteoStepProps) {

  const updateOsteo = (field: string, value: any) => {
    onUpdate({
      osteomyelitis: {
        ...osteomyelitis,
        [field]: value,
      },
    });
  };

  const updateSepsisClinical = (field: string, value: any) => {
    const newClinical = { ...sepsis.clinicalFeatures, [field]: value };
    // Calculate qSOFA score
    let qsofa = 0;
    if (newClinical.alteredMentalStatus) qsofa++;
    if (newClinical.respiratoryRate >= 22) qsofa++;
    if (newClinical.systolicBP <= 100) qsofa++;
    newClinical.qsofaScore = qsofa;

    // Calculate SIRS
    let sirs = 0;
    if (newClinical.temperature > 38 || newClinical.temperature < 36) sirs++;
    if (newClinical.heartRate > 90) sirs++;
    if (newClinical.respiratoryRate > 20) sirs++;
    // WBC from lab will add to SIRS

    onUpdate({
      sepsis: {
        ...sepsis,
        clinicalFeatures: newClinical,
        sirsScore: sirs + (sepsis.laboratoryFeatures.wbc > 12 || sepsis.laboratoryFeatures.wbc < 4 ? 1 : 0),
      },
    });
  };

  const updateSepsisLab = (field: string, value: number) => {
    const newLab = { ...sepsis.laboratoryFeatures, [field]: value };
    
    // Recalculate SIRS with WBC
    let sirs = 0;
    if (sepsis.clinicalFeatures.temperature > 38 || sepsis.clinicalFeatures.temperature < 36) sirs++;
    if (sepsis.clinicalFeatures.heartRate > 90) sirs++;
    if (sepsis.clinicalFeatures.respiratoryRate > 20) sirs++;
    if (newLab.wbc > 12 || newLab.wbc < 4) sirs++;

    onUpdate({
      sepsis: {
        ...sepsis,
        laboratoryFeatures: newLab,
        sirsScore: sirs,
      },
    });
  };

  const updateSepsisSeverity = (severity: typeof sepsis.sepsisSeverity) => {
    onUpdate({
      sepsis: {
        ...sepsis,
        sepsisSeverity: severity,
      },
    });
  };

  const toggleBone = (bone: string) => {
    const current = osteomyelitis.affectedBones || [];
    const updated = current.includes(bone)
      ? current.filter(b => b !== bone)
      : [...current, bone];
    updateOsteo('affectedBones', updated);
  };

  const toggleNeuropathySymptom = (symptom: string) => {
    const current = neuropathySymptoms || [];
    const updated = current.includes(symptom)
      ? current.filter(s => s !== symptom)
      : [...current, symptom];
    onUpdate({ neuropathySymptoms: updated });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 4: Infection & Osteomyelitis</h3>
        <p className="text-sm text-gray-600">Assess infection severity and bone involvement</p>
      </div>

      {/* Sepsis Assessment */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Sepsis Assessment
          </h4>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm">
              qSOFA: {sepsis.clinicalFeatures.qsofaScore}/3
            </span>
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
              SIRS: {sepsis.sirsScore}/4
            </span>
          </div>
        </div>

        {/* Clinical Features */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Clinical Features (qSOFA)</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={sepsis.clinicalFeatures.temperature}
                onChange={(e) => updateSepsisClinical('temperature', parseFloat(e.target.value) || 37)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                value={sepsis.clinicalFeatures.heartRate}
                onChange={(e) => updateSepsisClinical('heartRate', parseInt(e.target.value) || 80)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Respiratory Rate</label>
              <input
                type="number"
                value={sepsis.clinicalFeatures.respiratoryRate}
                onChange={(e) => updateSepsisClinical('respiratoryRate', parseInt(e.target.value) || 16)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Systolic BP (mmHg)</label>
              <input
                type="number"
                value={sepsis.clinicalFeatures.systolicBP}
                onChange={(e) => updateSepsisClinical('systolicBP', parseInt(e.target.value) || 120)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 p-2 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={sepsis.clinicalFeatures.alteredMentalStatus}
              onChange={(e) => updateSepsisClinical('alteredMentalStatus', e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Altered Mental Status (GCS &lt;15)</span>
          </label>
        </div>

        {/* Laboratory Features */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Laboratory Features</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">WBC (×10⁹/L)</label>
              <input
                type="number"
                step="0.1"
                value={sepsis.laboratoryFeatures.wbc}
                onChange={(e) => updateSepsisLab('wbc', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">CRP (mg/L)</label>
              <input
                type="number"
                step="0.1"
                value={sepsis.laboratoryFeatures.crp || ''}
                onChange={(e) => updateSepsisLab('crp', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Procalcitonin (ng/mL)</label>
              <input
                type="number"
                step="0.01"
                value={sepsis.laboratoryFeatures.procalcitonin || ''}
                onChange={(e) => updateSepsisLab('procalcitonin', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Lactate (mmol/L)</label>
              <input
                type="number"
                step="0.1"
                value={sepsis.laboratoryFeatures.lactate || ''}
                onChange={(e) => updateSepsisLab('lactate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Sepsis Severity */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">Sepsis Severity</h5>
          <div className="flex flex-wrap gap-2">
            {(['none', 'sirs', 'sepsis', 'severe_sepsis', 'septic_shock'] as const).map((severity) => (
              <button
                key={severity}
                onClick={() => updateSepsisSeverity(severity)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  sepsis.sepsisSeverity === severity
                    ? severity === 'none' ? 'bg-green-500 text-white' :
                      severity === 'sirs' ? 'bg-yellow-500 text-white' :
                      severity === 'sepsis' ? 'bg-orange-500 text-white' :
                      'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {severity === 'none' ? 'None' :
                 severity === 'sirs' ? 'SIRS' :
                 severity === 'sepsis' ? 'Sepsis' :
                 severity === 'severe_sepsis' ? 'Severe Sepsis' : 'Septic Shock'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Osteomyelitis Assessment */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Bone className="h-5 w-5 text-gray-600" />
            Osteomyelitis Assessment
          </h4>
          {osteomyelitis.suspected && (
            <span className={`px-2 py-1 rounded text-sm ${
              osteomyelitis.chronicity === 'chronic' 
                ? 'bg-red-100 text-red-800 font-semibold' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {osteomyelitis.chronicity === 'chronic' ? '⚠️ CHRONIC Osteomyelitis' : 'Osteomyelitis Suspected'}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={osteomyelitis.suspected}
              onChange={(e) => updateOsteo('suspected', e.target.checked)}
              className="w-5 h-5 text-orange-600 rounded"
            />
            <span className="font-medium">Osteomyelitis Suspected</span>
          </label>

          {osteomyelitis.suspected && (
            <>
              {/* CHRONICITY ASSESSMENT - CRITICAL SECTION */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-amber-800">Chronicity Assessment - CRITICAL for Amputation Decision</h5>
                    <p className="text-xs text-amber-700">Chronic osteomyelitis (&gt;6 weeks) has significantly worse prognosis. Studies show cure rates drop to 60-80% vs &gt;90% for acute cases.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chronicity Classification</label>
                    <select
                      value={osteomyelitis.chronicity || 'acute'}
                      onChange={(e) => updateOsteo('chronicity', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        osteomyelitis.chronicity === 'chronic' ? 'border-red-500 bg-red-50' : ''
                      }`}
                    >
                      <option value="acute">Acute (&lt;2 weeks)</option>
                      <option value="subacute">Subacute (2-6 weeks)</option>
                      <option value="chronic">CHRONIC (&gt;6 weeks) - Poor Prognosis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (weeks)</label>
                    <input
                      type="number"
                      value={osteomyelitis.durationInWeeks || ''}
                      onChange={(e) => updateOsteo('durationInWeeks', parseInt(e.target.value) || 0)}
                      placeholder="Enter weeks"
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Treatment History - Critical for prognosis */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-700">Previous Treatment (Treatment Failure = Strong Amputation Indicator)</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                      osteomyelitis.previousAntibiotic ? 'border-orange-400 bg-orange-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={osteomyelitis.previousAntibiotic || false}
                        onChange={(e) => updateOsteo('previousAntibiotic', e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-sm">Prior Antibiotics</span>
                    </label>
                    <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                      osteomyelitis.previousDebridement ? 'border-orange-400 bg-orange-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={osteomyelitis.previousDebridement || false}
                        onChange={(e) => updateOsteo('previousDebridement', e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-sm">Prior Debridement</span>
                    </label>
                    <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                      osteomyelitis.recurrent ? 'border-red-400 bg-red-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={osteomyelitis.recurrent || false}
                        onChange={(e) => updateOsteo('recurrent', e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <span className="text-sm font-medium">⚠️ Recurrent</span>
                    </label>
                  </div>
                </div>

                {/* Warning for recurrent/failed treatment */}
                {(osteomyelitis.recurrent || (osteomyelitis.previousAntibiotic && osteomyelitis.previousDebridement)) && (
                  <div className="bg-red-100 border border-red-300 rounded p-3 mt-2">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ HIGH AMPUTATION LIKELIHOOD: {osteomyelitis.recurrent && 'Recurrent osteomyelitis '} 
                      {osteomyelitis.previousAntibiotic && osteomyelitis.previousDebridement && 'Failed combined antibiotic + surgical treatment '}
                      indicates very poor prognosis for limb salvage. Strongly consider definitive amputation.
                    </p>
                  </div>
                )}
              </div>

              {/* Chronic Bone Changes Section */}
              {(osteomyelitis.chronicity === 'chronic' || (osteomyelitis.durationInWeeks && osteomyelitis.durationInWeeks > 6)) && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h5 className="font-medium text-gray-800 mb-3">Chronic Bone Changes (Pathognomonic Signs)</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-white ${
                      osteomyelitis.sequestrum ? 'border-red-400 bg-red-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={osteomyelitis.sequestrum || false}
                        onChange={(e) => updateOsteo('sequestrum', e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium">Sequestrum</span>
                        <p className="text-xs text-gray-500">Dead bone</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-white ${
                      osteomyelitis.involucrum ? 'border-orange-400 bg-orange-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={osteomyelitis.involucrum || false}
                        onChange={(e) => updateOsteo('involucrum', e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium">Involucrum</span>
                        <p className="text-xs text-gray-500">New bone shell</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-white ${
                      osteomyelitis.cloacae ? 'border-orange-400 bg-orange-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={osteomyelitis.cloacae || false}
                        onChange={(e) => updateOsteo('cloacae', e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium">Cloacae</span>
                        <p className="text-xs text-gray-500">Sinus tracts</p>
                      </div>
                    </label>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cortex Involvement</label>
                      <select
                        value={osteomyelitis.involvedCortex || 'superficial'}
                        onChange={(e) => updateOsteo('involvedCortex', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="superficial">Superficial</option>
                        <option value="deep">Deep</option>
                        <option value="full_thickness">Full Thickness</option>
                      </select>
                    </div>
                  </div>

                  {osteomyelitis.sequestrum && (
                    <div className="bg-red-100 border border-red-300 rounded p-2 text-sm text-red-800">
                      <strong>⚠️ Sequestrum Present:</strong> Dead bone acts as foreign body and biofilm nidus. Antibiotics cannot penetrate - surgical removal or amputation required.
                    </div>
                  )}
                </div>
              )}

              {/* Clinical Signs */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={osteomyelitis.probeToBone}
                    onChange={(e) => updateOsteo('probeToBone', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">Positive Probe-to-Bone Test</span>
                </label>
                <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={osteomyelitis.radiographicChanges}
                    onChange={(e) => updateOsteo('radiographicChanges', e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">X-ray Changes</span>
                </label>
              </div>

              {/* Imaging & Biopsy */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRI Findings</label>
                  <select
                    value={osteomyelitis.mriFindings || 'not_done'}
                    onChange={(e) => updateOsteo('mriFindings', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="not_done">Not Done</option>
                    <option value="negative">Negative</option>
                    <option value="suspicious">Suspicious</option>
                    <option value="positive">Positive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bone Biopsy</label>
                  <select
                    value={osteomyelitis.boneBiopsy || 'not_done'}
                    onChange={(e) => updateOsteo('boneBiopsy', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="not_done">Not Done</option>
                    <option value="negative">Negative</option>
                    <option value="positive">Positive</option>
                  </select>
                </div>
              </div>

              {/* Affected Bones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Affected Bones</label>
                <div className="flex flex-wrap gap-2">
                  {commonBones.map((bone) => (
                    <button
                      key={bone}
                      onClick={() => toggleBone(bone)}
                      className={`px-2 py-1 rounded text-sm transition-colors ${
                        osteomyelitis.affectedBones?.includes(bone)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {bone}
                    </button>
                  ))}
                </div>
                {osteomyelitis.affectedBones && osteomyelitis.affectedBones.length >= 3 && (
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    ⚠️ Multiple bones involved ({osteomyelitis.affectedBones.length}) - consider more proximal amputation level
                  </p>
                )}
              </div>

              {/* Duration & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Text)</label>
                  <input
                    type="text"
                    value={osteomyelitis.duration || ''}
                    onChange={(e) => updateOsteo('duration', e.target.value)}
                    placeholder="e.g., 2 weeks"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={osteomyelitis.notes || ''}
                    onChange={(e) => updateOsteo('notes', e.target.value)}
                    placeholder="Additional findings..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Neuropathy Assessment */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Neuropathy Assessment</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={monofilamentTest}
              onChange={(e) => onUpdate({ monofilamentTest: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div>
              <span className="font-medium text-sm">Monofilament Test</span>
              <p className="text-xs text-gray-500">Checked = sensation absent</p>
            </div>
          </label>
          
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={vibrationSense}
              onChange={(e) => onUpdate({ vibrationSense: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div>
              <span className="font-medium text-sm">Vibration Sense</span>
              <p className="text-xs text-gray-500">Checked = absent</p>
            </div>
          </label>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ankle Reflexes</label>
            <select
              value={ankleReflexes}
              onChange={(e) => onUpdate({ ankleReflexes: e.target.value as 'present' | 'diminished' | 'absent' })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="present">Present</option>
              <option value="diminished">Diminished</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Neuropathy Symptoms</label>
          <div className="flex flex-wrap gap-2">
            {neuropathySymptomOptions.map((symptom) => (
              <button
                key={symptom}
                onClick={() => toggleNeuropathySymptom(symptom)}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  neuropathySymptoms?.includes(symptom)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Warning for severe sepsis */}
      {(sepsis.sepsisSeverity === 'severe_sepsis' || sepsis.sepsisSeverity === 'septic_shock') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Critical: {sepsis.sepsisSeverity === 'septic_shock' ? 'Septic Shock' : 'Severe Sepsis'}</p>
              <p>Immediate resuscitation, IV antibiotics, and source control required. Consider ICU admission.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
