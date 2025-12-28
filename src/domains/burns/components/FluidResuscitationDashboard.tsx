// Fluid Resuscitation Dashboard Component
// Implements Parkland/Modified Brooke with hourly titration per WHO/ISBI

import { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format, differenceInHours, differenceInMinutes, addHours } from 'date-fns';
import type { 
  FluidResuscitationPlan, 
  ResuscitationFormula,
  HourlyResuscitationEntry,
  UrineOutput,
  FluidAdjustment,
} from '../types';
import { 
  calculateFluidResuscitation, 
  calculateFluidAdjustment 
} from '../services/burnScoringService';

interface FluidResuscitationDashboardProps {
  patientWeight: number;
  tbsa: number;
  timeOfBurn: Date;
  isChild?: boolean;
  onPlanUpdate?: (plan: FluidResuscitationPlan) => void;
  urineOutputs?: UrineOutput[];
  initialPlan?: FluidResuscitationPlan;
}

export default function FluidResuscitationDashboard({
  patientWeight,
  tbsa,
  timeOfBurn,
  isChild = false,
  onPlanUpdate,
  urineOutputs = [],
  initialPlan,
}: FluidResuscitationDashboardProps) {
  const [formula, setFormula] = useState<ResuscitationFormula>(
    initialPlan?.formula || 'parkland'
  );
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [hourlyEntries, setHourlyEntries] = useState<HourlyResuscitationEntry[]>([]);
  const [adjustments, setAdjustments] = useState<FluidAdjustment[]>([]);

  // Urine output targets
  const urineTargetMin = isChild ? 1.0 : 0.5; // mL/kg/hr
  const urineTargetMax = isChild ? 1.5 : 1.0;

  // Calculate initial plan
  const plan = useMemo(() => {
    return calculateFluidResuscitation(patientWeight, tbsa, timeOfBurn, formula);
  }, [patientWeight, tbsa, timeOfBurn, formula]);

  // Calculate time-based status
  const timeStatus = useMemo(() => {
    const now = new Date();
    const hoursSinceBurn = differenceInHours(now, timeOfBurn);
    const minutesSinceBurn = differenceInMinutes(now, timeOfBurn);
    
    const isFirstPhase = hoursSinceBurn < 8;
    const hoursInCurrentPhase = isFirstPhase ? hoursSinceBurn : hoursSinceBurn - 8;
    const totalHoursInPhase = isFirstPhase ? 8 : 16;
    const progressPercent = (hoursInCurrentPhase / totalHoursInPhase) * 100;
    
    return {
      hoursSinceBurn,
      minutesSinceBurn,
      isFirstPhase,
      hoursInCurrentPhase,
      progressPercent: Math.min(progressPercent, 100),
      currentPhaseEnd: isFirstPhase 
        ? addHours(timeOfBurn, 8)
        : addHours(timeOfBurn, 24),
      targetRate: isFirstPhase ? plan.firstHalfRate : plan.secondHalfRate,
    };
  }, [timeOfBurn, plan]);

  // Set initial rate
  useEffect(() => {
    setCurrentRate(timeStatus.targetRate);
  }, [timeStatus.targetRate]);

  // Calculate recent urine output average
  const recentUOStats = useMemo(() => {
    if (urineOutputs.length === 0) {
      return { average: 0, trend: 'stable' as const, lastValue: 0 };
    }
    
    const last2Hours = urineOutputs.slice(-2);
    const average = last2Hours.reduce((sum, uo) => sum + uo.ratePerKg, 0) / last2Hours.length;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (last2Hours.length >= 2) {
      const diff = last2Hours[1].ratePerKg - last2Hours[0].ratePerKg;
      if (diff > 0.1) trend = 'up';
      else if (diff < -0.1) trend = 'down';
    }
    
    return {
      average: Math.round(average * 100) / 100,
      trend,
      lastValue: urineOutputs[urineOutputs.length - 1]?.ratePerKg || 0,
    };
  }, [urineOutputs]);

  // Check if adjustment needed
  const adjustmentRecommendation = useMemo(() => {
    return calculateFluidAdjustment(
      currentRate,
      recentUOStats.average,
      urineTargetMin,
      urineTargetMax
    );
  }, [currentRate, recentUOStats.average, urineTargetMin, urineTargetMax]);

  // Apply rate adjustment
  const applyAdjustment = () => {
    const newAdjustment: FluidAdjustment = {
      id: `adj-${Date.now()}`,
      timestamp: new Date(),
      previousRate: currentRate,
      newRate: adjustmentRecommendation.newRate,
      reason: adjustmentRecommendation.reason,
      urineOutputAtAdjustment: recentUOStats.lastValue,
      adjustedBy: '', // Would be filled from auth context
    };
    
    setAdjustments(prev => [...prev, newAdjustment]);
    setCurrentRate(adjustmentRecommendation.newRate);
    
    if (onPlanUpdate) {
      onPlanUpdate({
        ...plan,
        currentInfusionRate: adjustmentRecommendation.newRate,
        adjustments: [...adjustments, newAdjustment],
      });
    }
  };

  // Get UO status color
  const getUOStatusColor = (value: number) => {
    if (value < urineTargetMin) return 'text-red-600 bg-red-50';
    if (value > urineTargetMax * 1.5) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  // Calculate cumulative fluid given
  const cumulativeFluid = useMemo(() => {
    // This would be calculated from actual infusion records
    const hoursElapsed = timeStatus.hoursSinceBurn;
    return Math.round(currentRate * Math.min(hoursElapsed, 24));
  }, [currentRate, timeStatus.hoursSinceBurn]);

  return (
    <div className="space-y-6">
      {/* Header with Formula Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplets className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Fluid Resuscitation</h3>
              <p className="text-sm text-blue-700">WHO/ISBI Burn Resuscitation Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Formula:</label>
            <select
              value={formula}
              onChange={(e) => setFormula(e.target.value as ResuscitationFormula)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value="parkland">Parkland (4 mL/kg/%TBSA)</option>
              <option value="modified_brooke">Modified Brooke (2 mL/kg/%TBSA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Time & Phase Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">Time Since Burn</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {timeStatus.hoursSinceBurn}h {timeStatus.minutesSinceBurn % 60}m
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Burn Time: {format(timeOfBurn, 'dd MMM yyyy HH:mm')}
          </p>
        </div>

        <div className={`border rounded-lg p-4 ${
          timeStatus.isFirstPhase ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {timeStatus.isFirstPhase ? 'Phase 1: First 8 Hours' : 'Phase 2: Hours 9-24'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              timeStatus.isFirstPhase ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'
            }`}>
              {Math.round(timeStatus.progressPercent)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                timeStatus.isFirstPhase ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${timeStatus.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Target Rate: <span className="font-semibold">{timeStatus.targetRate} mL/hr</span>
          </p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Current Infusion</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{currentRate} mL/hr</p>
          <p className="text-xs text-gray-500 mt-1">
            Cumulative: ~{cumulativeFluid.toLocaleString()} mL
          </p>
        </div>
      </div>

      {/* 24-Hour Fluid Requirements */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">24-Hour Fluid Requirements</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Total 24h</p>
            <p className="text-xl font-bold text-blue-700">
              {plan.totalFluid24h.toLocaleString()} mL
            </p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">First 8h (50%)</p>
            <p className="text-xl font-bold text-orange-700">
              {plan.firstHalfVolume.toLocaleString()} mL
            </p>
            <p className="text-xs text-orange-600">{plan.firstHalfRate} mL/hr</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Next 16h (50%)</p>
            <p className="text-xl font-bold text-green-700">
              {plan.secondHalfVolume.toLocaleString()} mL
            </p>
            <p className="text-xs text-green-600">{plan.secondHalfRate} mL/hr</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Calculation</p>
            <p className="text-sm font-mono text-gray-700">
              {formula === 'parkland' ? '4' : '2'} × {patientWeight}kg × {tbsa}%
            </p>
          </div>
        </div>
      </div>

      {/* Urine Output Monitoring & Titration */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Urine Output Titration</h4>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Target:</span>
            <span className="font-semibold text-green-600">
              {urineTargetMin}-{urineTargetMax} mL/kg/hr
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Current UO Status */}
          <div className={`p-4 rounded-lg ${getUOStatusColor(recentUOStats.average)}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average UO (2hr)</span>
              {recentUOStats.trend === 'up' && <TrendingUp className="h-4 w-4" />}
              {recentUOStats.trend === 'down' && <TrendingDown className="h-4 w-4" />}
            </div>
            <p className="text-2xl font-bold">{recentUOStats.average} mL/kg/hr</p>
            {recentUOStats.average < urineTargetMin && (
              <p className="text-xs mt-1">⚠️ Below target - consider increasing fluids</p>
            )}
          </div>

          {/* Last UO */}
          <div className="p-4 rounded-lg bg-gray-50">
            <span className="text-sm font-medium text-gray-600">Last Recorded UO</span>
            <p className="text-2xl font-bold text-gray-900">
              {urineOutputs.length > 0 
                ? `${urineOutputs[urineOutputs.length - 1].volumeML} mL`
                : 'No data'}
            </p>
            {urineOutputs.length > 0 && (
              <p className="text-xs text-gray-500">
                {format(new Date(urineOutputs[urineOutputs.length - 1].timestamp), 'HH:mm')}
              </p>
            )}
          </div>

          {/* Adjustment Recommendation */}
          <div className={`p-4 rounded-lg ${
            adjustmentRecommendation.adjustment !== 'No change'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-green-50'
          }`}>
            <span className="text-sm font-medium">Recommended Action</span>
            <p className="text-lg font-bold">
              {adjustmentRecommendation.adjustment}
            </p>
            {adjustmentRecommendation.newRate !== currentRate && (
              <button
                onClick={applyAdjustment}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Apply: {adjustmentRecommendation.newRate} mL/hr
              </button>
            )}
          </div>
        </div>

        {/* Adjustment History */}
        {adjustments.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Rate Adjustments</h5>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {adjustments.slice(-5).reverse().map(adj => (
                <div key={adj.id} className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <span className="text-xs text-gray-400">
                    {format(new Date(adj.timestamp), 'HH:mm')}
                  </span>
                  <span>
                    {adj.previousRate} → <span className="font-semibold">{adj.newRate}</span> mL/hr
                  </span>
                  <span className="text-xs text-gray-500">({adj.reason})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setCurrentRate(prev => Math.round(prev * 1.25));
          }}
          className="p-3 border rounded-lg hover:bg-gray-50 text-center"
        >
          <TrendingUp className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <span className="text-sm">+25% Rate</span>
        </button>
        <button
          onClick={() => {
            setCurrentRate(prev => Math.round(prev * 1.1));
          }}
          className="p-3 border rounded-lg hover:bg-gray-50 text-center"
        >
          <TrendingUp className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
          <span className="text-sm">+10% Rate</span>
        </button>
        <button
          onClick={() => {
            setCurrentRate(prev => Math.round(prev * 0.9));
          }}
          className="p-3 border rounded-lg hover:bg-gray-50 text-center"
        >
          <TrendingDown className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <span className="text-sm">-10% Rate</span>
        </button>
        <button
          onClick={() => {
            setCurrentRate(timeStatus.targetRate);
          }}
          className="p-3 border rounded-lg hover:bg-gray-50 text-center"
        >
          <RefreshCw className="h-5 w-5 mx-auto text-gray-500 mb-1" />
          <span className="text-sm">Reset to Target</span>
        </button>
      </div>

      {/* Important Alerts */}
      <div className="space-y-2">
        {recentUOStats.average < 0.3 && recentUOStats.average > 0 && (
          <div className="flex items-center gap-3 p-3 bg-red-100 border border-red-300 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Critical: UO severely low</p>
              <p className="text-sm text-red-700">
                Consider ICU escalation if not improving after fluid increase
              </p>
            </div>
          </div>
        )}
        
        {timeStatus.isFirstPhase && timeStatus.progressPercent > 90 && (
          <div className="flex items-center gap-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Phase 1 ending soon</p>
              <p className="text-sm text-blue-700">
                Prepare to reduce rate to {plan.secondHalfRate} mL/hr at 8 hours post-burn
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
