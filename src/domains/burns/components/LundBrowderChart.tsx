// Lund-Browder TBSA Calculator Component
// WHO/ISBI Recommended Method for Burn Area Calculation

import { useState, useEffect, useMemo } from 'react';
import { Calculator, Info, AlertTriangle, Check } from 'lucide-react';
import type { LundBrowderEntry, BurnDepthType, TBSACalculation } from '../types';
import { LUND_BROWDER_CHART } from '../types';
import { calculateTBSALundBrowder, getAgeGroup } from '../services/burnScoringService';

interface LundBrowderChartProps {
  patientAge: number;
  onCalculate: (calculation: TBSACalculation) => void;
  initialEntries?: LundBrowderEntry[];
}

// Body regions with display names
const BODY_REGIONS = [
  { id: 'head', name: 'Head', side: 'anterior' },
  { id: 'neck', name: 'Neck', side: 'anterior' },
  { id: 'anterior_trunk', name: 'Anterior Trunk', side: 'anterior' },
  { id: 'posterior_trunk', name: 'Posterior Trunk', side: 'posterior' },
  { id: 'buttocks', name: 'Buttocks', side: 'posterior' },
  { id: 'genitalia', name: 'Genitalia/Perineum', side: 'anterior' },
  { id: 'right_upper_arm', name: 'Right Upper Arm', side: 'right' },
  { id: 'left_upper_arm', name: 'Left Upper Arm', side: 'left' },
  { id: 'right_lower_arm', name: 'Right Lower Arm', side: 'right' },
  { id: 'left_lower_arm', name: 'Left Lower Arm', side: 'left' },
  { id: 'right_hand', name: 'Right Hand', side: 'right' },
  { id: 'left_hand', name: 'Left Hand', side: 'left' },
  { id: 'right_thigh', name: 'Right Thigh', side: 'right' },
  { id: 'left_thigh', name: 'Left Thigh', side: 'left' },
  { id: 'right_lower_leg', name: 'Right Lower Leg', side: 'right' },
  { id: 'left_lower_leg', name: 'Left Lower Leg', side: 'left' },
  { id: 'right_foot', name: 'Right Foot', side: 'right' },
  { id: 'left_foot', name: 'Left Foot', side: 'left' },
];

const DEPTH_OPTIONS: { value: BurnDepthType; label: string; color: string; bgColor: string }[] = [
  { value: 'superficial', label: 'Superficial (1°)', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  { value: 'superficial_partial', label: 'Superficial Partial (2° sup)', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  { value: 'deep_partial', label: 'Deep Partial (2° deep)', color: 'text-red-700', bgColor: 'bg-red-100' },
  { value: 'full_thickness', label: 'Full Thickness (3°)', color: 'text-gray-100', bgColor: 'bg-gray-800' },
];

export default function LundBrowderChart({
  patientAge,
  onCalculate,
  initialEntries,
}: LundBrowderChartProps) {
  const ageGroup = useMemo(() => getAgeGroup(patientAge), [patientAge]);
  
  // Initialize entries for all body regions
  const [entries, setEntries] = useState<Record<string, { percent: number; depth: BurnDepthType }>>(() => {
    const initial: Record<string, { percent: number; depth: BurnDepthType }> = {};
    BODY_REGIONS.forEach(region => {
      const existing = initialEntries?.find(e => e.region === region.id);
      initial[region.id] = {
        percent: existing?.percentBurned || 0,
        depth: existing?.depth || 'superficial_partial',
      };
    });
    return initial;
  });

  // Calculate TBSA when entries change
  const calculation = useMemo(() => {
    const lundBrowderEntries: LundBrowderEntry[] = BODY_REGIONS.map(region => ({
      region: region.id,
      regionName: region.name,
      ageGroup,
      percentBurned: entries[region.id]?.percent || 0,
      depth: entries[region.id]?.depth || 'superficial_partial',
      maxPercent: LUND_BROWDER_CHART[region.id]?.[ageGroup] || 0,
    }));
    
    return calculateTBSALundBrowder(lundBrowderEntries, ageGroup);
  }, [entries, ageGroup]);

  // Notify parent when calculation changes
  useEffect(() => {
    onCalculate(calculation);
  }, [calculation, onCalculate]);

  const updateEntry = (regionId: string, field: 'percent' | 'depth', value: number | BurnDepthType) => {
    setEntries(prev => ({
      ...prev,
      [regionId]: {
        ...prev[regionId],
        [field]: value,
      },
    }));
  };

  const getMaxPercent = (regionId: string): number => {
    return LUND_BROWDER_CHART[regionId]?.[ageGroup] || 0;
  };

  const getDepthColor = (depth: BurnDepthType): string => {
    return DEPTH_OPTIONS.find(d => d.value === depth)?.bgColor || 'bg-gray-100';
  };

  // Group regions by body section
  const groupedRegions = {
    head: BODY_REGIONS.filter(r => ['head', 'neck'].includes(r.id)),
    trunk: BODY_REGIONS.filter(r => ['anterior_trunk', 'posterior_trunk', 'buttocks', 'genitalia'].includes(r.id)),
    arms: BODY_REGIONS.filter(r => r.id.includes('arm') || r.id.includes('hand')),
    legs: BODY_REGIONS.filter(r => r.id.includes('thigh') || r.id.includes('leg') || r.id.includes('foot')),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Lund-Browder Chart</h3>
              <p className="text-sm text-blue-700">WHO/ISBI Recommended TBSA Calculation</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">
              Age Group: <span className="font-semibold capitalize">{ageGroup.replace('_', ' ')}</span>
            </p>
            <p className="text-sm text-blue-600">
              Patient Age: <span className="font-semibold">{patientAge} years</span>
            </p>
          </div>
        </div>
      </div>

      {/* Depth Legend */}
      <div className="flex flex-wrap gap-2">
        {DEPTH_OPTIONS.map(depth => (
          <div key={depth.value} className={`px-3 py-1 rounded-full text-xs font-medium ${depth.bgColor} ${depth.color}`}>
            {depth.label}
          </div>
        ))}
      </div>

      {/* Body Regions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Head & Neck */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 pb-2 border-b">Head & Neck</h4>
          <div className="space-y-3">
            {groupedRegions.head.map(region => (
              <RegionRow
                key={region.id}
                region={region}
                entry={entries[region.id]}
                maxPercent={getMaxPercent(region.id)}
                onUpdate={updateEntry}
              />
            ))}
          </div>
        </div>

        {/* Trunk */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 pb-2 border-b">Trunk</h4>
          <div className="space-y-3">
            {groupedRegions.trunk.map(region => (
              <RegionRow
                key={region.id}
                region={region}
                entry={entries[region.id]}
                maxPercent={getMaxPercent(region.id)}
                onUpdate={updateEntry}
              />
            ))}
          </div>
        </div>

        {/* Upper Extremities */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 pb-2 border-b">Upper Extremities</h4>
          <div className="space-y-3">
            {groupedRegions.arms.map(region => (
              <RegionRow
                key={region.id}
                region={region}
                entry={entries[region.id]}
                maxPercent={getMaxPercent(region.id)}
                onUpdate={updateEntry}
              />
            ))}
          </div>
        </div>

        {/* Lower Extremities */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 pb-2 border-b">Lower Extremities</h4>
          <div className="space-y-3">
            {groupedRegions.legs.map(region => (
              <RegionRow
                key={region.id}
                region={region}
                entry={entries[region.id]}
                maxPercent={getMaxPercent(region.id)}
                onUpdate={updateEntry}
              />
            ))}
          </div>
        </div>
      </div>

      {/* TBSA Summary */}
      <div className={`rounded-lg p-6 border-2 ${
        calculation.totalTBSA > 20 ? 'bg-red-50 border-red-300' :
        calculation.totalTBSA > 10 ? 'bg-orange-50 border-orange-300' :
        calculation.totalTBSA > 0 ? 'bg-yellow-50 border-yellow-300' :
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">TBSA Summary</h4>
          {calculation.totalTBSA > 20 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">Major Burn - Consider Burn Center</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{calculation.totalTBSA}%</p>
            <p className="text-sm text-gray-600">Total TBSA</p>
          </div>
          <div className="text-center p-4 bg-pink-50 rounded-lg">
            <p className="text-2xl font-bold text-pink-700">{calculation.superficialTBSA}%</p>
            <p className="text-sm text-pink-600">Superficial</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-700">{calculation.partialThicknessTBSA}%</p>
            <p className="text-sm text-orange-600">Partial Thickness</p>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-white">{calculation.fullThicknessTBSA}%</p>
            <p className="text-sm text-gray-300">Full Thickness</p>
          </div>
        </div>

        {calculation.fullThicknessTBSA > 0 && (
          <div className="mt-4 p-3 bg-red-100 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-700">
              Full thickness burns present - meets burn center referral criteria
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual region input row
interface RegionRowProps {
  region: { id: string; name: string };
  entry: { percent: number; depth: BurnDepthType };
  maxPercent: number;
  onUpdate: (regionId: string, field: 'percent' | 'depth', value: number | BurnDepthType) => void;
}

function RegionRow({ region, entry, maxPercent, onUpdate }: RegionRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-sm font-medium text-gray-700">{region.name}</div>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="number"
          min="0"
          max={maxPercent}
          step="0.5"
          value={entry.percent || ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onUpdate(region.id, 'percent', Math.min(val, maxPercent));
          }}
          placeholder="0"
          className="w-16 px-2 py-1 border rounded text-center text-sm"
        />
        <span className="text-xs text-gray-500">/ {maxPercent}%</span>
      </div>
      <select
        value={entry.depth}
        onChange={(e) => onUpdate(region.id, 'depth', e.target.value as BurnDepthType)}
        disabled={!entry.percent}
        className={`px-2 py-1 border rounded text-xs ${
          entry.percent > 0 ? DEPTH_OPTIONS.find(d => d.value === entry.depth)?.bgColor : 'bg-gray-50'
        } ${entry.percent > 0 ? DEPTH_OPTIONS.find(d => d.value === entry.depth)?.color : 'text-gray-400'}`}
      >
        {DEPTH_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
