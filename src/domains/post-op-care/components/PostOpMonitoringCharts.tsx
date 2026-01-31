/**
 * Post-Op Monitoring Charts Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Graphical visualization of post-operative patient monitoring data
 * including vital signs, pain scores, drain outputs, and fluid balance
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import {
  Activity,
  Heart,
  Thermometer,
  Droplet,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import type { PostOpMonitoringRecord } from '../types';

interface PostOpMonitoringChartsProps {
  records: PostOpMonitoringRecord[];
  surgeryDate: Date;
}

interface ChartDataPoint {
  timestamp: string;
  date: Date;
  dayPostOp: number;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painScore?: number;
  drainOneOutput?: number;
  drainTwoOutput?: number;
  totalDrainOutput?: number;
  oralIntake?: number;
  ivFluidIntake?: number;
  urineOutputMl?: number;
  fluidBalance?: number;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value} {entry.unit || ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Trend indicator component
function TrendIndicator({ current, previous }: { current?: number; previous?: number }) {
  if (current === undefined || previous === undefined) {
    return <Minus className="w-4 h-4 text-gray-400" />;
  }
  
  const diff = current - previous;
  const percentChange = previous !== 0 ? ((diff / previous) * 100) : 0;
  
  if (Math.abs(percentChange) < 5) {
    return <Minus className="w-4 h-4 text-gray-400" />;
  }
  
  if (diff > 0) {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
  
  return <TrendingDown className="w-4 h-4 text-red-500" />;
}

export default function PostOpMonitoringCharts({
  records,
  surgeryDate,
}: PostOpMonitoringChartsProps) {
  // Process and sort records by timestamp
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!records || records.length === 0) return [];
    
    return records
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((record) => {
        const recordDate = new Date(record.recordedAt);
        const dayPostOp = Math.floor(
          (recordDate.getTime() - new Date(surgeryDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Get drain outputs from array
        const drainOne = record.drainOutputs?.find(d => d.drainId === '1' || d.drainName === 'Drain 1');
        const drainTwo = record.drainOutputs?.find(d => d.drainId === '2' || d.drainName === 'Drain 2');
        const drainOneOutput = drainOne?.outputMl || 0;
        const drainTwoOutput = drainTwo?.outputMl || 0;
        const drainTotal = drainOneOutput + drainTwoOutput;
        
        // Get fluid intake
        const oralIntake = record.fluidIntake?.oral || 0;
        const ivFluidIntake = record.fluidIntake?.iv || 0;
        const totalInput = oralIntake + ivFluidIntake;
        
        // Get urine output (convert string to estimated number if needed)
        const urineOutputMl = record.fluidOutput?.urine || 0;
        
        const fluidBalance = totalInput - urineOutputMl - drainTotal;
        
        return {
          timestamp: format(recordDate, 'MMM d, HH:mm'),
          date: recordDate,
          dayPostOp,
          heartRate: record.vitalSigns?.heartRate,
          systolic: record.vitalSigns?.bloodPressureSystolic,
          diastolic: record.vitalSigns?.bloodPressureDiastolic,
          temperature: record.vitalSigns?.temperature,
          respiratoryRate: record.vitalSigns?.respiratoryRate,
          oxygenSaturation: record.vitalSigns?.oxygenSaturation,
          painScore: record.painScore,
          drainOneOutput,
          drainTwoOutput,
          totalDrainOutput: drainTotal,
          oralIntake,
          ivFluidIntake,
          urineOutputMl,
          fluidBalance,
        };
      });
  }, [records, surgeryDate]);

  // Calculate latest values and trends
  const latestValues = useMemo(() => {
    if (chartData.length === 0) return null;
    const latest = chartData[chartData.length - 1];
    const previous = chartData.length > 1 ? chartData[chartData.length - 2] : undefined;
    return { latest, previous };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Monitoring Data</h3>
        <p className="text-gray-500 mt-2">
          Recording post-operative observations will populate these charts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            {latestValues && (
              <TrendIndicator 
                current={latestValues.latest.heartRate} 
                previous={latestValues.previous?.heartRate} 
              />
            )}
          </div>
          <p className="text-sm text-gray-500">Heart Rate</p>
          <p className="text-2xl font-bold text-gray-900">
            {latestValues?.latest.heartRate ?? '-'}
            <span className="text-sm font-normal text-gray-500 ml-1">bpm</span>
          </p>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Activity className="w-5 h-5 text-sky-600" />
            </div>
            {latestValues && (
              <TrendIndicator 
                current={latestValues.latest.systolic} 
                previous={latestValues.previous?.systolic} 
              />
            )}
          </div>
          <p className="text-sm text-gray-500">Blood Pressure</p>
          <p className="text-2xl font-bold text-gray-900">
            {latestValues?.latest.systolic ?? '-'}/{latestValues?.latest.diastolic ?? '-'}
            <span className="text-sm font-normal text-gray-500 ml-1">mmHg</span>
          </p>
        </div>

        {/* Temperature */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Thermometer className="w-5 h-5 text-amber-600" />
            </div>
            {latestValues?.latest.temperature && latestValues.latest.temperature > 37.5 && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <p className="text-sm text-gray-500">Temperature</p>
          <p className={`text-2xl font-bold ${
            latestValues?.latest.temperature && latestValues.latest.temperature > 38 
              ? 'text-red-600' 
              : 'text-gray-900'
          }`}>
            {latestValues?.latest.temperature?.toFixed(1) ?? '-'}
            <span className="text-sm font-normal text-gray-500 ml-1">°C</span>
          </p>
        </div>

        {/* Pain Score */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Droplet className="w-5 h-5 text-purple-600" />
            </div>
            {latestValues && (
              <TrendIndicator 
                current={latestValues.previous?.painScore} // Inverted - lower is better
                previous={latestValues.latest.painScore} 
              />
            )}
          </div>
          <p className="text-sm text-gray-500">Pain Score</p>
          <p className={`text-2xl font-bold ${
            latestValues?.latest.painScore && latestValues.latest.painScore > 6 
              ? 'text-red-600' 
              : latestValues?.latest.painScore && latestValues.latest.painScore > 3
                ? 'text-amber-600'
                : 'text-green-600'
          }`}>
            {latestValues?.latest.painScore ?? '-'}
            <span className="text-sm font-normal text-gray-500 ml-1">/10</span>
          </p>
        </div>
      </div>

      {/* Vital Signs Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Vital Signs Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 12 }} 
              tickLine={false}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              tick={{ fontSize: 12 }}
              domain={[40, 180]}
              label={{ value: 'HR / BP', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              tick={{ fontSize: 12 }}
              domain={[35, 40]}
              label={{ value: 'Temp °C', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine yAxisId="left" y={100} stroke="#9ca3af" strokeDasharray="3 3" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="heartRate"
              name="Heart Rate"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="systolic"
              name="Systolic BP"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="diastolic"
              name="Diastolic BP"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#60a5fa', r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="temperature"
              name="Temperature"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pain Score Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-purple-500" />
          Pain Score Progression
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis 
              domain={[0, 10]} 
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={3} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', style: { fontSize: 10, fill: '#22c55e' } }} />
            <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Severe', position: 'right', style: { fontSize: 10, fill: '#ef4444' } }} />
            <Area
              type="monotone"
              dataKey="painScore"
              name="Pain Score"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#painGradient)"
              dot={{ fill: '#8b5cf6', r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Mild (0-3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">Moderate (4-6)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Severe (7-10)</span>
          </div>
        </div>
      </div>

      {/* Drain Output Chart */}
      {chartData.some(d => d.drainOneOutput || d.drainTwoOutput) && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-amber-500" />
            Drain Output
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'ml', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="drainOneOutput" 
                name="Drain 1" 
                stackId="drains"
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="drainTwoOutput" 
                name="Drain 2" 
                stackId="drains"
                fill="#fbbf24" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fluid Balance Chart */}
      {chartData.some(d => d.oralIntake || d.ivFluidIntake || d.urineOutputMl) && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-500" />
            Fluid Balance
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'ml', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Bar 
                dataKey="oralIntake" 
                name="Oral Intake" 
                stackId="input"
                fill="#22c55e" 
              />
              <Bar 
                dataKey="ivFluidIntake" 
                name="IV Fluids" 
                stackId="input"
                fill="#3b82f6" 
              />
              <Bar 
                dataKey="urineOutputMl" 
                name="Urine Output" 
                fill="#f97316" 
              />
              <Line
                type="monotone"
                dataKey="fluidBalance"
                name="Balance"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Oxygen Saturation & Respiratory Rate Chart */}
      {chartData.some(d => d.oxygenSaturation || d.respiratoryRate) && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Respiratory Monitoring
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                tick={{ fontSize: 12 }}
                domain={[85, 100]}
                label={{ value: 'SpO2 %', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12 }}
                domain={[8, 40]}
                label={{ value: 'RR /min', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine yAxisId="left" y={94} stroke="#22c55e" strokeDasharray="3 3" />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="oxygenSaturation"
                name="SpO2"
                stroke="#22c55e"
                strokeWidth={2}
                fill="#dcfce7"
                dot={{ fill: '#22c55e', r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="respiratoryRate"
                name="Respiratory Rate"
                stroke="#0891b2"
                strokeWidth={2}
                dot={{ fill: '#0891b2', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Monitoring Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Observations</span>
            <p className="text-lg font-semibold text-gray-900">{chartData.length}</p>
          </div>
          <div>
            <span className="text-gray-500">Days Post-Op</span>
            <p className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 ? chartData[chartData.length - 1].dayPostOp : 0}
            </p>
          </div>
          <div>
            <span className="text-gray-500">First Record</span>
            <p className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 ? format(chartData[0].date, 'PP') : '-'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Last Record</span>
            <p className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 ? format(chartData[chartData.length - 1].date, 'PP') : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
