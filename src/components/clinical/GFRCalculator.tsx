/**
 * GFR Calculator Component
 * 
 * Provides a user-friendly interface for calculating GFR with:
 * - Unit selection for creatinine (mg/dL or μmol/L)
 * - Unit selection for weight (kg or lb)
 * - Real-time calculation with CKD staging
 * - Drug dosing recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  AlertCircle, 
  Info, 
  Activity, 
  Pill, 
  TrendingDown,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { 
  calculateGFR, 
  GFRResult, 
  CreatinineUnit, 
  WeightUnit,
  getGFRColorClass,
  getCKDStageBadgeClass,
  getCreatinineReferenceRange,
  isCreatinineNormal,
  convertCreatinine,
  UNIT_CONVERSIONS
} from '../../services/gfrCalculationService';

interface GFRCalculatorProps {
  // Pre-filled patient data
  patientAge?: number;
  patientGender?: 'male' | 'female';
  patientWeight?: number;
  patientCreatinine?: number;
  patientCreatinineUnit?: CreatinineUnit;
  
  // Callbacks
  onGFRCalculated?: (result: GFRResult) => void;
  onClose?: () => void;
  
  // Display options
  showDrugDosing?: boolean;
  showRecommendations?: boolean;
  compact?: boolean;
  title?: string;
}

export const GFRCalculator: React.FC<GFRCalculatorProps> = ({
  patientAge,
  patientGender,
  patientWeight,
  patientCreatinine,
  patientCreatinineUnit = 'mg/dL',
  onGFRCalculated,
  onClose,
  showDrugDosing = true,
  showRecommendations = true,
  compact = false,
  title = 'GFR Calculator'
}) => {
  // Form state
  const [creatinine, setCreatinine] = useState<string>(patientCreatinine?.toString() || '');
  const [creatinineUnit, setCreatinineUnit] = useState<CreatinineUnit>(patientCreatinineUnit);
  const [age, setAge] = useState<string>(patientAge?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(patientGender || '');
  const [weight, setWeight] = useState<string>(patientWeight?.toString() || '');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  
  // Calculated result
  const [gfrResult, setGfrResult] = useState<GFRResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Reference range for current unit
  const referenceRange = useMemo(() => {
    if (!gender) return null;
    return getCreatinineReferenceRange(gender, creatinineUnit);
  }, [gender, creatinineUnit]);
  
  // Calculate GFR when inputs change
  useEffect(() => {
    const creatinineValue = parseFloat(creatinine);
    const ageValue = parseInt(age);
    const weightValue = parseFloat(weight);
    
    if (creatinineValue > 0 && ageValue > 0 && gender) {
      const result = calculateGFR({
        creatinine: creatinineValue,
        creatinineUnit,
        age: ageValue,
        gender,
        weight: weightValue > 0 ? weightValue : undefined,
        weightUnit,
      });
      
      setGfrResult(result);
      onGFRCalculated?.(result);
    } else {
      setGfrResult(null);
    }
  }, [creatinine, creatinineUnit, age, gender, weight, weightUnit, onGFRCalculated]);
  
  // Handle unit change and convert value
  const handleCreatinineUnitChange = (newUnit: CreatinineUnit) => {
    if (creatinine && parseFloat(creatinine) > 0) {
      const convertedValue = convertCreatinine(parseFloat(creatinine), creatinineUnit, newUnit);
      setCreatinine(convertedValue.toString());
    }
    setCreatinineUnit(newUnit);
  };
  
  // Handle weight unit change and convert value
  const handleWeightUnitChange = (newUnit: WeightUnit) => {
    if (weight && parseFloat(weight) > 0) {
      const currentWeight = parseFloat(weight);
      let convertedWeight: number;
      
      if (weightUnit === 'kg' && (newUnit === 'lb' || newUnit === 'lbs')) {
        convertedWeight = currentWeight * UNIT_CONVERSIONS.weight.kg_to_lb;
      } else if ((weightUnit === 'lb' || weightUnit === 'lbs') && newUnit === 'kg') {
        convertedWeight = currentWeight * UNIT_CONVERSIONS.weight.lb_to_kg;
      } else {
        convertedWeight = currentWeight;
      }
      
      setWeight(convertedWeight.toFixed(1));
    }
    setWeightUnit(newUnit);
  };
  
  // Check if creatinine is in normal range
  const creatinineStatus = useMemo(() => {
    if (!creatinine || !gender) return null;
    const value = parseFloat(creatinine);
    if (isNaN(value)) return null;
    
    const isNormal = isCreatinineNormal(value, gender, creatinineUnit);
    return {
      isNormal,
      message: isNormal ? 'Within normal range' : 'Outside normal range'
    };
  }, [creatinine, gender, creatinineUnit]);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Creatinine Input with Unit Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Serum Creatinine
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={creatinine}
              onChange={(e) => setCreatinine(e.target.value)}
              placeholder={creatinineUnit === 'mg/dL' ? 'e.g., 1.2' : 'e.g., 106'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <select
              value={creatinineUnit}
              onChange={(e) => handleCreatinineUnitChange(e.target.value as CreatinineUnit)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
            >
              <option value="mg/dL">mg/dL</option>
              <option value="μmol/L">μmol/L</option>
            </select>
          </div>
          {/* Reference Range */}
          {referenceRange && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              <span>
                Normal: {referenceRange.min} - {referenceRange.max} {referenceRange.unit}
              </span>
              {creatinineStatus && (
                <span className={`flex items-center gap-1 ${creatinineStatus.isNormal ? 'text-green-600' : 'text-red-600'}`}>
                  {creatinineStatus.isNormal ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {creatinineStatus.message}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Age Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Age (years)
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g., 45"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        
        {/* Gender Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Gender
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === 'male'}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="text-primary focus:ring-primary"
              />
              <span>Male</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="text-primary focus:ring-primary"
              />
              <span>Female</span>
            </label>
          </div>
        </div>
        
        {/* Weight Input with Unit Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Weight (for Cockcroft-Gault)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={weightUnit === 'kg' ? 'e.g., 70' : 'e.g., 154'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <select
              value={weightUnit}
              onChange={(e) => handleWeightUnitChange(e.target.value as WeightUnit)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Optional: Required for Cockcroft-Gault equation (preferred for drug dosing)
          </p>
        </div>
      </div>
      
      {/* Results Display */}
      {gfrResult && (
        <div className="border-t pt-4 space-y-4">
          {/* GFR Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CKD-EPI Result */}
            <div className={`p-4 rounded-lg ${getGFRColorClass(gfrResult.gfrCKDEPI)}`}>
              <div className="text-sm font-medium opacity-80">eGFR (CKD-EPI 2021)</div>
              <div className="text-3xl font-bold">{gfrResult.gfrCKDEPI}</div>
              <div className="text-sm">mL/min/1.73m²</div>
            </div>
            
            {/* Cockcroft-Gault Result */}
            <div className={`p-4 rounded-lg ${gfrResult.gfrCockcroftGault ? getGFRColorClass(gfrResult.gfrCockcroftGault) : 'bg-gray-50 text-gray-500'}`}>
              <div className="text-sm font-medium opacity-80">CrCl (Cockcroft-Gault)</div>
              <div className="text-3xl font-bold">
                {gfrResult.gfrCockcroftGault ?? '—'}
              </div>
              <div className="text-sm">mL/min</div>
              {!gfrResult.gfrCockcroftGault && (
                <div className="text-xs mt-1 text-gray-400">Enter weight to calculate</div>
              )}
            </div>
            
            {/* CKD Stage */}
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="text-sm font-medium text-gray-600">CKD Stage</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 rounded-full text-lg font-bold ${getCKDStageBadgeClass(gfrResult.ckdStage)}`}>
                  {gfrResult.ckdStage}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">{gfrResult.stageDescription}</div>
            </div>
          </div>
          
          {/* Drug Dosing Category */}
          {showDrugDosing && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                <Pill className="w-4 h-4" />
                Drug Dosing Category: <span className="uppercase">{gfrResult.drugDosingCategory.replace(/_/g, ' ')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                {gfrResult.drugDosingAdjustments.slice(0, 4).map((adjustment, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{adjustment}</span>
                  </div>
                ))}
              </div>
              {gfrResult.drugDosingAdjustments.length > 4 && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-600 text-sm mt-2 hover:underline"
                >
                  {showDetails ? 'Show less' : `Show ${gfrResult.drugDosingAdjustments.length - 4} more...`}
                </button>
              )}
              {showDetails && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                  {gfrResult.drugDosingAdjustments.slice(4).map((adjustment, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                      <span>{adjustment}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Clinical Recommendations */}
          {showRecommendations && gfrResult.recommendations.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                <Activity className="w-4 h-4" />
                Clinical Recommendations
              </div>
              <ul className="space-y-1 text-sm text-amber-700">
                {gfrResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Referral Criteria */}
          {gfrResult.referralCriteria.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <AlertCircle className="w-4 h-4" />
                Referral Criteria
              </div>
              <ul className="space-y-1 text-sm text-red-700">
                {gfrResult.referralCriteria.map((criteria, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <TrendingDown className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Formula Information */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500">
        <details>
          <summary className="cursor-pointer hover:text-gray-700">About GFR Calculations</summary>
          <div className="mt-2 space-y-2 pl-4">
            <p><strong>CKD-EPI 2021:</strong> Race-free equation, standard for CKD staging. Reference: Inker LA, et al. N Engl J Med 2021.</p>
            <p><strong>Cockcroft-Gault:</strong> Uses actual body weight. Preferred for drug dosing adjustments in clinical practice.</p>
            <p><strong>Creatinine Conversion:</strong> 1 mg/dL = 88.4 μmol/L</p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default GFRCalculator;
