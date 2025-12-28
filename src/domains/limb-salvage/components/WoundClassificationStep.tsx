// Step 2: Wound Classification (Wagner, Texas, WIfI, SINBAD)
import { AlertCircle } from 'lucide-react';
import type { WagnerGrade, TexasClassification, WIFIClassification, SINBADScore } from '../../../types';

interface WoundClassificationStepProps {
  wagnerGrade: WagnerGrade;
  texasClassification: TexasClassification;
  wifiClassification: WIFIClassification;
  sinbadScore: SINBADScore;
  woundLocation: string;
  woundSize: { length: number; width: number; depth: number; area: number };
  woundDuration: number;
  previousDebridement: boolean;
  debridementCount: number;
  onUpdate: (data: Partial<{
    wagnerGrade: WagnerGrade;
    texasClassification: TexasClassification;
    wifiClassification: WIFIClassification;
    sinbadScore: SINBADScore;
    woundLocation: string;
    woundSize: { length: number; width: number; depth: number; area: number };
    woundDuration: number;
    previousDebridement: boolean;
    debridementCount: number;
  }>) => void;
}

// Wagner Grade Descriptions
const wagnerDescriptions: Record<WagnerGrade, string> = {
  0: 'No ulcer, high-risk foot (callus, deformity)',
  1: 'Superficial ulcer (skin only)',
  2: 'Deep ulcer to tendon, capsule, or bone',
  3: 'Deep ulcer with abscess, osteomyelitis',
  4: 'Localized gangrene (forefoot or heel)',
  5: 'Extensive gangrene (whole foot)',
};

// Texas Classification Descriptions
const texasGradeDesc: Record<number, string> = {
  0: 'Pre/post ulcerative lesion',
  1: 'Superficial wound',
  2: 'Wound penetrating to tendon/capsule',
  3: 'Wound penetrating to bone/joint',
};

const texasStageDesc: Record<string, string> = {
  A: 'No infection, no ischemia',
  B: 'Infection present',
  C: 'Ischemia present',
  D: 'Infection AND ischemia',
};

export default function WoundClassificationStep({
  wagnerGrade,
  texasClassification,
  wifiClassification,
  sinbadScore,
  woundLocation,
  woundSize,
  woundDuration,
  previousDebridement,
  debridementCount,
  onUpdate,
}: WoundClassificationStepProps) {

  // Calculate wound area
  const updateWoundSize = (field: string, value: number) => {
    const newSize = { ...woundSize, [field]: value };
    newSize.area = parseFloat((newSize.length * newSize.width).toFixed(2));
    onUpdate({ woundSize: newSize });
  };

  // Update SINBAD total
  const updateSinbad = (field: string, value: 0 | 1) => {
    const newSinbad = { ...sinbadScore, [field]: value };
    newSinbad.total = newSinbad.site + newSinbad.ischemia + newSinbad.neuropathy + 
                      newSinbad.bacterialInfection + newSinbad.area + newSinbad.depth;
    onUpdate({ sinbadScore: newSinbad });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 2: Wound Classification</h3>
        <p className="text-sm text-gray-600">Score the wound using validated classification systems</p>
      </div>

      {/* Wound Location & Size */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Wound Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={woundLocation}
              onChange={(e) => onUpdate({ woundLocation: e.target.value })}
              placeholder="e.g., Plantar 1st MTP"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Length (cm)</label>
            <input
              type="number"
              step="0.1"
              value={woundSize.length}
              onChange={(e) => updateWoundSize('length', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Width (cm)</label>
            <input
              type="number"
              step="0.1"
              value={woundSize.width}
              onChange={(e) => updateWoundSize('width', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depth (cm)</label>
            <input
              type="number"
              step="0.1"
              value={woundSize.depth}
              onChange={(e) => updateWoundSize('depth', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area (cm²)</label>
            <input
              type="number"
              value={woundSize.area}
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
            <input
              type="number"
              value={woundDuration}
              onChange={(e) => onUpdate({ woundDuration: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4 col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={previousDebridement}
                onChange={(e) => onUpdate({ previousDebridement: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm">Previous Debridement</span>
            </label>
            {previousDebridement && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Count:</span>
                <input
                  type="number"
                  min="1"
                  value={debridementCount}
                  onChange={(e) => onUpdate({ debridementCount: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1 border rounded"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wagner Classification */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Wagner Classification</h4>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Grade {wagnerGrade}
          </span>
        </div>
        <div className="space-y-2">
          {([0, 1, 2, 3, 4, 5] as WagnerGrade[]).map((grade) => (
            <label
              key={grade}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                wagnerGrade === grade ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50 border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="wagner"
                checked={wagnerGrade === grade}
                onChange={() => onUpdate({ wagnerGrade: grade })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="font-medium w-16">Grade {grade}</span>
              <span className="text-sm text-gray-600">{wagnerDescriptions[grade]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Texas Classification */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">University of Texas Classification</h4>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            {texasClassification.grade}{texasClassification.stage}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade (Depth)</label>
            <div className="space-y-2">
              {[0, 1, 2, 3].map((grade) => (
                <label
                  key={grade}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
                    texasClassification.grade === grade ? 'bg-purple-50 border-purple-400' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    checked={texasClassification.grade === grade}
                    onChange={() => onUpdate({ texasClassification: { ...texasClassification, grade: grade as 0|1|2|3 } })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm"><strong>{grade}:</strong> {texasGradeDesc[grade]}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stage (Infection/Ischemia)</label>
            <div className="space-y-2">
              {(['A', 'B', 'C', 'D'] as const).map((stage) => (
                <label
                  key={stage}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${
                    texasClassification.stage === stage ? 'bg-purple-50 border-purple-400' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    checked={texasClassification.stage === stage}
                    onChange={() => onUpdate({ texasClassification: { ...texasClassification, stage } })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm"><strong>{stage}:</strong> {texasStageDesc[stage]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WIfI Classification */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">WIfI Classification</h4>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            W{wifiClassification.wound} I{wifiClassification.ischemia} fI{wifiClassification.footInfection}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Wound */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wound (W)</label>
            <select
              value={wifiClassification.wound}
              onChange={(e) => onUpdate({ wifiClassification: { ...wifiClassification, wound: parseInt(e.target.value) as 0|1|2|3 } })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - No ulcer/gangrene</option>
              <option value={1}>1 - Small, shallow ulcer</option>
              <option value={2}>2 - Deeper ulcer ± gangrene</option>
              <option value={3}>3 - Extensive deep ulcer</option>
            </select>
          </div>
          {/* Ischemia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ischemia (I)</label>
            <select
              value={wifiClassification.ischemia}
              onChange={(e) => onUpdate({ wifiClassification: { ...wifiClassification, ischemia: parseInt(e.target.value) as 0|1|2|3 } })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - ABI ≥0.80</option>
              <option value={1}>1 - ABI 0.60-0.79</option>
              <option value={2}>2 - ABI 0.40-0.59</option>
              <option value={3}>3 - ABI &lt;0.40</option>
            </select>
          </div>
          {/* Foot Infection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foot Infection (fI)</label>
            <select
              value={wifiClassification.footInfection}
              onChange={(e) => onUpdate({ wifiClassification: { ...wifiClassification, footInfection: parseInt(e.target.value) as 0|1|2|3 } })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - No infection</option>
              <option value={1}>1 - Mild (local, skin only)</option>
              <option value={2}>2 - Moderate (deeper/larger)</option>
              <option value={3}>3 - Severe (systemic signs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SINBAD Score */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">SINBAD Score</h4>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {sinbadScore.total}/6
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={sinbadScore.site}
              onChange={(e) => updateSinbad('site', parseInt(e.target.value) as 0|1)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - Forefoot</option>
              <option value={1}>1 - Midfoot/Hindfoot</option>
            </select>
          </div>
          {/* Ischemia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ischemia</label>
            <select
              value={sinbadScore.ischemia}
              onChange={(e) => updateSinbad('ischemia', parseInt(e.target.value) as 0|1)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - Pulses present</option>
              <option value={1}>1 - Pulses absent</option>
            </select>
          </div>
          {/* Neuropathy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neuropathy</label>
            <select
              value={sinbadScore.neuropathy}
              onChange={(e) => updateSinbad('neuropathy', parseInt(e.target.value) as 0|1)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - Sensation intact</option>
              <option value={1}>1 - Sensation absent</option>
            </select>
          </div>
          {/* Bacterial Infection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Infection</label>
            <select
              value={sinbadScore.bacterialInfection}
              onChange={(e) => updateSinbad('bacterialInfection', parseInt(e.target.value) as 0|1)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - Absent</option>
              <option value={1}>1 - Present</option>
            </select>
          </div>
          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
            <select
              value={sinbadScore.area}
              onChange={(e) => updateSinbad('area', parseInt(e.target.value) as 0|1)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - &lt;1 cm²</option>
              <option value={1}>1 - ≥1 cm²</option>
            </select>
          </div>
          {/* Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depth</label>
            <select
              value={sinbadScore.depth}
              onChange={(e) => updateSinbad('depth', parseInt(e.target.value) as 0|1)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={0}>0 - Superficial</option>
              <option value={1}>1 - Deep</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      {wagnerGrade >= 4 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">High-Risk Wagner Grade</p>
              <p>Wagner Grade {wagnerGrade} indicates gangrene. Immediate vascular assessment and surgical consultation required.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
