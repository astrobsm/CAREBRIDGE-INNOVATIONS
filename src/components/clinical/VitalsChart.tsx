/**
 * VitalsChart Component
 * Real-time graphical representation of patient vital signs
 * Uses Recharts for visualization
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { Activity, Heart, Thermometer, Wind, Droplet } from 'lucide-react';
import type { VitalSigns } from '../../types';

interface VitalsChartProps {
  vitals: VitalSigns[];
  height?: number;
  showLegend?: boolean;
}

// Normal ranges for vital signs
const normalRanges = {
  temperature: { min: 36.1, max: 37.2, unit: '°C' },
  pulse: { min: 60, max: 100, unit: 'bpm' },
  systolic: { min: 90, max: 140, unit: 'mmHg' },
  diastolic: { min: 60, max: 90, unit: 'mmHg' },
  oxygenSaturation: { min: 95, max: 100, unit: '%' },
  respiratoryRate: { min: 12, max: 20, unit: '/min' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function VitalsChart({ vitals, height = 300, showLegend = true }: VitalsChartProps) {
  // Transform vitals data for chart
  const chartData = useMemo(() => {
    if (!vitals || vitals.length === 0) return [];
    
    return vitals
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((vital) => ({
        time: format(new Date(vital.recordedAt), 'MMM d, h:mm a'),
        temperature: vital.temperature,
        pulse: vital.pulse,
        systolic: vital.bloodPressureSystolic,
        diastolic: vital.bloodPressureDiastolic,
        oxygenSaturation: vital.oxygenSaturation,
        respiratoryRate: vital.respiratoryRate,
      }));
  }, [vitals]);

  // Get latest vital for summary cards
  const latestVital = vitals && vitals.length > 0 
    ? vitals.reduce((latest, v) => 
        new Date(v.recordedAt) > new Date(latest.recordedAt) ? v : latest
      )
    : null;

  // Check if value is in normal range
  const isNormal = (type: string, value: number): boolean => {
    const range = normalRanges[type as keyof typeof normalRanges];
    if (!range) return true;
    return value >= range.min && value <= range.max;
  };

  if (!vitals || vitals.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No vital signs data available</p>
        <p className="text-sm mt-1">Record vital signs to see trends</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Latest Vitals Summary Cards */}
      {latestVital && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className={`p-3 rounded-xl border ${
            isNormal('temperature', latestVital.temperature) 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className={`w-4 h-4 ${
                isNormal('temperature', latestVital.temperature) ? 'text-blue-600' : 'text-red-600'
              }`} />
              <span className="text-xs text-gray-600">Temperature</span>
            </div>
            <p className={`text-xl font-bold ${
              isNormal('temperature', latestVital.temperature) ? 'text-blue-700' : 'text-red-700'
            }`}>
              {latestVital.temperature}°C
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            isNormal('pulse', latestVital.pulse) 
              ? 'bg-red-50 border-red-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-600">Pulse</span>
            </div>
            <p className={`text-xl font-bold ${
              isNormal('pulse', latestVital.pulse) ? 'text-red-600' : 'text-orange-600'
            }`}>
              {latestVital.pulse} bpm
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            isNormal('systolic', latestVital.bloodPressureSystolic) && isNormal('diastolic', latestVital.bloodPressureDiastolic)
              ? 'bg-purple-50 border-purple-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-600">Blood Pressure</span>
            </div>
            <p className={`text-xl font-bold ${
              isNormal('systolic', latestVital.bloodPressureSystolic) ? 'text-purple-700' : 'text-orange-700'
            }`}>
              {latestVital.bloodPressureSystolic}/{latestVital.bloodPressureDiastolic}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            isNormal('oxygenSaturation', latestVital.oxygenSaturation) 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Droplet className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">SpO2</span>
            </div>
            <p className={`text-xl font-bold ${
              isNormal('oxygenSaturation', latestVital.oxygenSaturation) ? 'text-green-700' : 'text-red-700'
            }`}>
              {latestVital.oxygenSaturation}%
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            isNormal('respiratoryRate', latestVital.respiratoryRate) 
              ? 'bg-cyan-50 border-cyan-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Wind className="w-4 h-4 text-cyan-600" />
              <span className="text-xs text-gray-600">Resp. Rate</span>
            </div>
            <p className={`text-xl font-bold ${
              isNormal('respiratoryRate', latestVital.respiratoryRate) ? 'text-cyan-700' : 'text-orange-700'
            }`}>
              {latestVital.respiratoryRate}/min
            </p>
          </div>

          <div className="p-3 rounded-xl border bg-gray-50 border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Recorded</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {format(new Date(latestVital.recordedAt), 'MMM d, h:mm a')}
            </p>
          </div>
        </div>
      )}

      {/* Blood Pressure & Pulse Chart */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Blood Pressure & Pulse Trend
        </h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }} 
              tickLine={false}
            />
            <YAxis 
              domain={[40, 180]} 
              tick={{ fontSize: 11 }} 
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            
            {/* Reference lines for normal ranges */}
            <ReferenceLine y={140} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'High BP', position: 'right', fontSize: 10 }} />
            <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Normal BP', position: 'right', fontSize: 10 }} />
            
            <Line 
              type="monotone" 
              dataKey="systolic" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#8b5cf6' }}
              name="Systolic BP"
            />
            <Line 
              type="monotone" 
              dataKey="diastolic" 
              stroke="#a855f7" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#a855f7' }}
              name="Diastolic BP"
            />
            <Line 
              type="monotone" 
              dataKey="pulse" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#ef4444' }}
              name="Pulse"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Temperature & SpO2 Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-blue-600" />
            Temperature Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis domain={[35, 40]} tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              
              <ReferenceLine y={37.2} stroke="#fbbf24" strokeDasharray="5 5" />
              <ReferenceLine y={36.1} stroke="#22c55e" strokeDasharray="5 5" />
              
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                name="Temperature (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-green-600" />
            Oxygen Saturation (SpO2) Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 10 }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              
              <ReferenceLine y={95} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Normal', position: 'right', fontSize: 10 }} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Low', position: 'right', fontSize: 10 }} />
              
              <Line 
                type="monotone" 
                dataKey="oxygenSaturation" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ r: 4, fill: '#22c55e' }}
                name="SpO2 (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Respiratory Rate Chart */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wind className="w-5 h-5 text-cyan-600" />
          Respiratory Rate Trend
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis domain={[8, 30]} tick={{ fontSize: 11 }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine y={20} stroke="#fbbf24" strokeDasharray="5 5" />
            <ReferenceLine y={12} stroke="#22c55e" strokeDasharray="5 5" />
            
            <Line 
              type="monotone" 
              dataKey="respiratoryRate" 
              stroke="#06b6d4" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#06b6d4' }}
              name="Respiratory Rate (/min)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
