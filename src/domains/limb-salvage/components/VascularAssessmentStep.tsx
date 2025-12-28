// Step 3: Vascular Assessment (Doppler Findings)
import { Activity, AlertTriangle } from 'lucide-react';
import type { DopplerFindings } from '../../../types';

interface VascularAssessmentStepProps {
  dopplerFindings: DopplerFindings;
  angiogramPerformed: boolean;
  angiogramFindings: string;
  previousRevascularization: boolean;
  revascularizationDetails: string;
  onUpdate: (data: Partial<{
    dopplerFindings: DopplerFindings;
    angiogramPerformed: boolean;
    angiogramFindings: string;
    previousRevascularization: boolean;
    revascularizationDetails: string;
  }>) => void;
}

type VesselStatus = 'normal' | 'stenosis' | 'occluded' | 'not_assessed';
type VenousStatus = 'normal' | 'reflux' | 'occluded' | 'not_assessed';
type Waveform = 'triphasic' | 'biphasic' | 'monophasic' | 'absent';

const arterialVessels = [
  { key: 'femoralArtery', name: 'Common Femoral Artery' },
  { key: 'poplitealArtery', name: 'Popliteal Artery' },
  { key: 'anteriorTibialArtery', name: 'Anterior Tibial Artery' },
  { key: 'posteriorTibialArtery', name: 'Posterior Tibial Artery' },
  { key: 'dorsalisPedisArtery', name: 'Dorsalis Pedis Artery' },
  { key: 'peronealArtery', name: 'Peroneal Artery' },
] as const;

const venousVessels = [
  { key: 'greatSaphenousVein', name: 'Great Saphenous Vein' },
  { key: 'smallSaphenousVein', name: 'Small Saphenous Vein' },
  { key: 'poplitealVein', name: 'Popliteal Vein' },
  { key: 'femoralVein', name: 'Femoral Vein' },
] as const;

export default function VascularAssessmentStep({
  dopplerFindings,
  angiogramPerformed,
  angiogramFindings,
  previousRevascularization,
  revascularizationDetails,
  onUpdate,
}: VascularAssessmentStepProps) {

  const updateArterial = (field: string, value: VesselStatus | number | boolean | string | Waveform) => {
    onUpdate({
      dopplerFindings: {
        ...dopplerFindings,
        arterial: {
          ...dopplerFindings.arterial,
          [field]: value,
        },
      },
    });
  };

  const updateVenous = (field: string, value: VenousStatus | boolean | string) => {
    onUpdate({
      dopplerFindings: {
        ...dopplerFindings,
        venous: {
          ...dopplerFindings.venous,
          [field]: value,
        },
      },
    });
  };

  // Get ABI interpretation
  const getABIInterpretation = (abi: number): { text: string; color: string } => {
    if (abi >= 1.3) return { text: 'Non-compressible (calcified)', color: 'text-yellow-600' };
    if (abi >= 0.9) return { text: 'Normal', color: 'text-green-600' };
    if (abi >= 0.7) return { text: 'Mild PAD', color: 'text-yellow-600' };
    if (abi >= 0.5) return { text: 'Moderate PAD', color: 'text-orange-600' };
    if (abi >= 0.3) return { text: 'Severe PAD', color: 'text-red-600' };
    return { text: 'Critical Limb Ischemia', color: 'text-red-700' };
  };

  const abiInterpretation = getABIInterpretation(dopplerFindings.arterial.abi);

  // Count occluded vessels
  const occludedCount = arterialVessels.filter(
    v => dopplerFindings.arterial[v.key] === 'occluded'
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 3: Vascular Assessment</h3>
        <p className="text-sm text-gray-600">Document arterial and venous Doppler findings</p>
      </div>

      {/* ABI and Waveform Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ABI */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ankle-Brachial Index (ABI)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="2"
            value={dopplerFindings.arterial.abi}
            onChange={(e) => updateArterial('abi', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border rounded-lg text-lg font-medium"
          />
          <p className={`text-sm mt-1 font-medium ${abiInterpretation.color}`}>
            {abiInterpretation.text}
          </p>
        </div>

        {/* TBI */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Toe-Brachial Index (TBI)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="2"
            value={dopplerFindings.arterial.tbi || ''}
            onChange={(e) => updateArterial('tbi', parseFloat(e.target.value) || 0)}
            placeholder="Optional"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Useful when ABI unreliable (calcified vessels)</p>
        </div>

        {/* Waveform */}
        <div className="bg-white border rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Waveform Pattern
          </label>
          <select
            value={dopplerFindings.arterial.waveform}
            onChange={(e) => updateArterial('waveform', e.target.value as Waveform)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="triphasic">Triphasic (Normal)</option>
            <option value="biphasic">Biphasic (Mild disease)</option>
            <option value="monophasic">Monophasic (Moderate-severe)</option>
            <option value="absent">Absent</option>
          </select>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="calcification"
              checked={dopplerFindings.arterial.calcification}
              onChange={(e) => updateArterial('calcification', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="calcification" className="text-sm text-gray-700">Arterial calcification</label>
          </div>
        </div>
      </div>

      {/* Arterial Assessment */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            Arterial Assessment
          </h4>
          {occludedCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
              {occludedCount} vessel(s) occluded
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2">Vessel</th>
                <th className="text-center p-2">Normal</th>
                <th className="text-center p-2">Stenosis</th>
                <th className="text-center p-2">Occluded</th>
                <th className="text-center p-2">Not Assessed</th>
              </tr>
            </thead>
            <tbody>
              {arterialVessels.map((vessel) => (
                <tr key={vessel.key} className="border-t">
                  <td className="p-2 font-medium">{vessel.name}</td>
                  {(['normal', 'stenosis', 'occluded', 'not_assessed'] as VesselStatus[]).map((status) => (
                    <td key={status} className="text-center p-2">
                      <input
                        type="radio"
                        name={`arterial-${vessel.key}`}
                        checked={dopplerFindings.arterial[vessel.key] === status}
                        onChange={() => updateArterial(vessel.key, status)}
                        className={`w-4 h-4 ${
                          status === 'occluded' ? 'text-red-600' : 
                          status === 'stenosis' ? 'text-yellow-600' : 'text-blue-600'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Arterial Notes</label>
          <textarea
            value={dopplerFindings.arterial.notes || ''}
            onChange={(e) => updateArterial('notes', e.target.value)}
            placeholder="Additional arterial findings..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Venous Assessment */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-blue-500" />
          Venous Assessment
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2">Vessel</th>
                <th className="text-center p-2">Normal</th>
                <th className="text-center p-2">Reflux</th>
                <th className="text-center p-2">Occluded</th>
                <th className="text-center p-2">Not Assessed</th>
              </tr>
            </thead>
            <tbody>
              {venousVessels.map((vessel) => (
                <tr key={vessel.key} className="border-t">
                  <td className="p-2 font-medium">{vessel.name}</td>
                  {(['normal', 'reflux', 'occluded', 'not_assessed'] as VenousStatus[]).map((status) => (
                    <td key={status} className="text-center p-2">
                      <input
                        type="radio"
                        name={`venous-${vessel.key}`}
                        checked={dopplerFindings.venous[vessel.key] === status}
                        onChange={() => updateVenous(vessel.key, status)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={dopplerFindings.venous.deepVeinThrombosis}
              onChange={(e) => updateVenous('deepVeinThrombosis', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">Deep Vein Thrombosis (DVT)</span>
          </label>
          <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={dopplerFindings.venous.chronicVenousInsufficiency}
              onChange={(e) => updateVenous('chronicVenousInsufficiency', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">Chronic Venous Insufficiency</span>
          </label>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Venous Notes</label>
          <textarea
            value={dopplerFindings.venous.notes || ''}
            onChange={(e) => updateVenous('notes', e.target.value)}
            placeholder="Additional venous findings..."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Angiogram & Revascularization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={angiogramPerformed}
              onChange={(e) => onUpdate({ angiogramPerformed: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="font-medium">Angiogram Performed</span>
          </label>
          {angiogramPerformed && (
            <textarea
              value={angiogramFindings}
              onChange={(e) => onUpdate({ angiogramFindings: e.target.value })}
              placeholder="Angiogram findings..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          )}
        </div>
        <div className="bg-white border rounded-lg p-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={previousRevascularization}
              onChange={(e) => onUpdate({ previousRevascularization: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="font-medium">Previous Revascularization</span>
          </label>
          {previousRevascularization && (
            <textarea
              value={revascularizationDetails}
              onChange={(e) => onUpdate({ revascularizationDetails: e.target.value })}
              placeholder="Type, date, and outcome..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          )}
        </div>
      </div>

      {/* Warning for Critical Ischemia */}
      {dopplerFindings.arterial.abi < 0.4 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Critical Limb Ischemia</p>
              <p>ABI &lt;0.4 indicates critical ischemia. Urgent vascular surgery consultation recommended.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
