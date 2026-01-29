// Step 2: Wound Classification (Wagner, Texas, WIfI, SINBAD)
import { AlertCircle, Info, Plus, Trash2, Copy } from 'lucide-react';
import type { WagnerGrade, TexasClassification, WIFIClassification, SINBADScore } from '../../../types';

// Wound shape types for area calculation
type WoundShape = 'rectangle' | 'ellipse' | 'circle' | 'irregular';

// Single wound entry
export interface WoundEntry {
  id: string;
  location: string;
  shape: WoundShape;
  length: number;
  width: number;
  depth: number;
  area: number;
  duration: number;
}

// Area calculation formulas for each shape
const woundShapeInfo: Record<WoundShape, { label: string; formula: string; description: string }> = {
  rectangle: {
    label: 'Rectangle/Square',
    formula: 'L × W',
    description: 'For rectangular or square wounds with straight edges',
  },
  ellipse: {
    label: 'Ellipse/Oval',
    formula: 'π × (L/2) × (W/2)',
    description: 'For oval-shaped wounds (most common for chronic wounds)',
  },
  circle: {
    label: 'Circle',
    formula: 'π × (D/2)²',
    description: 'For circular wounds - uses length as diameter',
  },
  irregular: {
    label: 'Irregular',
    formula: '0.785 × L × W',
    description: 'Approximation for irregular wounds using elliptical formula',
  },
};

// Helper to create a new wound entry
const createNewWound = (): WoundEntry => ({
  id: `wound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  location: '',
  shape: 'ellipse',
  length: 0,
  width: 0,
  depth: 0,
  area: 0,
  duration: 0,
});

interface WoundClassificationStepProps {
  wagnerGrade: WagnerGrade;
  texasClassification: TexasClassification;
  wifiClassification: WIFIClassification;
  sinbadScore: SINBADScore;
  // Legacy single wound fields (for backward compatibility)
  woundLocation?: string;
  woundSize?: { length: number; width: number; depth: number; area: number };
  woundShape?: WoundShape;
  woundDuration?: number;
  // New multi-wound support
  wounds?: WoundEntry[];
  previousDebridement: boolean;
  debridementCount: number;
  onUpdate: (data: Partial<{
    wagnerGrade: WagnerGrade;
    texasClassification: TexasClassification;
    wifiClassification: WIFIClassification;
    sinbadScore: SINBADScore;
    woundLocation: string;
    woundSize: { length: number; width: number; depth: number; area: number };
    woundShape: WoundShape;
    woundDuration: number;
    wounds: WoundEntry[];
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
  woundShape = 'ellipse',
  woundDuration,
  wounds: propWounds,
  previousDebridement,
  debridementCount,
  onUpdate,
}: WoundClassificationStepProps) {

  // Initialize wounds array from props or convert legacy single wound
  const getInitialWounds = (): WoundEntry[] => {
    if (propWounds && propWounds.length > 0) {
      return propWounds;
    }
    // Convert legacy single wound to array format
    if (woundLocation || (woundSize && (woundSize.length > 0 || woundSize.width > 0))) {
      return [{
        id: 'wound-legacy-1',
        location: woundLocation || '',
        shape: woundShape,
        length: woundSize?.length || 0,
        width: woundSize?.width || 0,
        depth: woundSize?.depth || 0,
        area: woundSize?.area || 0,
        duration: woundDuration || 0,
      }];
    }
    // Start with one empty wound
    return [createNewWound()];
  };

  const wounds = getInitialWounds();

  // Calculate wound area based on shape
  const calculateArea = (length: number, width: number, shape: WoundShape): number => {
    switch (shape) {
      case 'rectangle':
        return length * width;
      case 'ellipse':
        // π × (L/2) × (W/2) = π/4 × L × W ≈ 0.785 × L × W
        return Math.PI * (length / 2) * (width / 2);
      case 'circle':
        // π × (D/2)² where D = length (uses length as diameter)
        return Math.PI * Math.pow(length / 2, 2);
      case 'irregular':
        // Approximate using elliptical formula
        return 0.785 * length * width;
      default:
        return length * width;
    }
  };

  // Calculate total area from all wounds
  const totalArea = wounds.reduce((sum, wound) => sum + wound.area, 0);

  // Update a single wound
  const updateWound = (woundId: string, updates: Partial<WoundEntry>) => {
    const newWounds = wounds.map(wound => {
      if (wound.id !== woundId) return wound;
      
      const updatedWound = { ...wound, ...updates };
      
      // Recalculate area if dimensions or shape changed
      if ('length' in updates || 'width' in updates || 'shape' in updates) {
        const shape = updates.shape || wound.shape;
        const length = updates.length ?? wound.length;
        let width = updates.width ?? wound.width;
        
        // For circle, width = length
        if (shape === 'circle') {
          width = length;
          updatedWound.width = length;
        }
        
        updatedWound.area = parseFloat(calculateArea(length, width, shape).toFixed(2));
      }
      
      return updatedWound;
    });
    
    // Update both new wounds array and legacy fields for backward compatibility
    const primaryWound = newWounds[0];
    onUpdate({ 
      wounds: newWounds,
      woundLocation: primaryWound?.location || '',
      woundSize: primaryWound ? {
        length: primaryWound.length,
        width: primaryWound.width,
        depth: primaryWound.depth,
        area: newWounds.reduce((sum, w) => sum + w.area, 0), // Total area in legacy field
      } : { length: 0, width: 0, depth: 0, area: 0 },
      woundShape: primaryWound?.shape || 'ellipse',
      woundDuration: primaryWound?.duration || 0,
    });
  };

  // Add a new wound
  const addWound = () => {
    const newWounds = [...wounds, createNewWound()];
    onUpdate({ wounds: newWounds });
  };

  // Remove a wound
  const removeWound = (woundId: string) => {
    if (wounds.length <= 1) return; // Keep at least one wound
    const newWounds = wounds.filter(w => w.id !== woundId);
    
    // Update legacy fields with first wound
    const primaryWound = newWounds[0];
    onUpdate({ 
      wounds: newWounds,
      woundLocation: primaryWound?.location || '',
      woundSize: primaryWound ? {
        length: primaryWound.length,
        width: primaryWound.width,
        depth: primaryWound.depth,
        area: newWounds.reduce((sum, w) => sum + w.area, 0),
      } : { length: 0, width: 0, depth: 0, area: 0 },
      woundShape: primaryWound?.shape || 'ellipse',
      woundDuration: primaryWound?.duration || 0,
    });
  };

  // Duplicate a wound
  const duplicateWound = (woundId: string) => {
    const woundToDupe = wounds.find(w => w.id === woundId);
    if (!woundToDupe) return;
    
    const newWound: WoundEntry = {
      ...woundToDupe,
      id: `wound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      location: woundToDupe.location ? `${woundToDupe.location} (copy)` : '',
    };
    
    const newWounds = [...wounds, newWound];
    onUpdate({ wounds: newWounds });
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
        <p className="text-sm text-gray-600">Score the wound(s) using validated classification systems</p>
      </div>

      {/* Multiple Wounds Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-900">Wound Details</h4>
            <p className="text-sm text-gray-500">
              {wounds.length} wound{wounds.length > 1 ? 's' : ''} • Total Area: <span className="font-semibold text-blue-600">{totalArea.toFixed(2)} cm²</span>
            </p>
          </div>
          <button
            type="button"
            onClick={addWound}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Wound
          </button>
        </div>

        {/* Wound Cards */}
        <div className="space-y-4">
          {wounds.map((wound, index) => (
            <div key={wound.id} className="bg-white border rounded-lg p-4 relative">
              {/* Wound Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <span className="font-medium text-gray-800">
                  Wound #{index + 1}
                  {wound.location && <span className="text-gray-500 font-normal ml-2">— {wound.location}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {wound.area.toFixed(2)} cm²
                  </span>
                  <button
                    type="button"
                    onClick={() => duplicateWound(wound.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Duplicate wound"
                  >
                    <Copy size={16} />
                  </button>
                  {wounds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWound(wound.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove wound"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Wound Fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                  <input
                    type="text"
                    value={wound.location}
                    onChange={(e) => updateWound(wound.id, { location: e.target.value })}
                    placeholder="e.g., Plantar 1st MTP"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Shape</label>
                  <select
                    value={wound.shape}
                    onChange={(e) => updateWound(wound.id, { shape: e.target.value as WoundShape })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    title="Select wound shape"
                  >
                    {Object.entries(woundShapeInfo).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Length (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={wound.length || ''}
                    onChange={(e) => updateWound(wound.id, { length: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {wound.shape === 'circle' ? 'Diameter (cm)' : 'Width (cm)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={wound.shape === 'circle' ? wound.length || '' : wound.width || ''}
                    onChange={(e) => {
                      if (wound.shape === 'circle') {
                        const diameter = parseFloat(e.target.value) || 0;
                        updateWound(wound.id, { length: diameter, width: diameter });
                      } else {
                        updateWound(wound.id, { width: parseFloat(e.target.value) || 0 });
                      }
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    disabled={wound.shape === 'circle'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Depth (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={wound.depth || ''}
                    onChange={(e) => updateWound(wound.id, { depth: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="flex text-xs font-medium text-gray-600 mb-1 items-center gap-1">
                    Area (cm²)
                    <span className="group relative">
                      <Info size={12} className="text-gray-400 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                        {woundShapeInfo[wound.shape].formula}
                      </span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={wound.area}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-blue-50 font-semibold text-blue-700"
                      title="Calculated wound area"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500">
                      auto
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={wound.duration || ''}
                    onChange={(e) => updateWound(wound.id, { duration: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Shape description */}
              <p className="text-xs text-gray-500 mt-2">{woundShapeInfo[wound.shape].description}</p>
            </div>
          ))}
        </div>

        {/* Debridement Section */}
        <div className="mt-4 pt-4 border-t flex items-center gap-4">
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
                className="w-16 px-2 py-1 border rounded text-sm"
                title="Debridement count"
                placeholder="0"
              />
            </div>
          )}
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
              title="Wound grade"
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
              title="Ischemia grade"
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
              title="Foot infection grade"
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
              title="Site location"
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
              title="Ischemia status"
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
              title="Neuropathy status"
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
              title="Infection status"
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
              title="Area size"
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
              title="Wound depth"
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
