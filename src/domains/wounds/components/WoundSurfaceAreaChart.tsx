import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

interface WoundSurfaceAreaChartProps {
  patientId: string;
  woundLocation: string;
  currentWoundId: string;
}

export default function WoundSurfaceAreaChart({ patientId, woundLocation, currentWoundId }: WoundSurfaceAreaChartProps) {
  // Get all wounds for this patient at this location (serial assessments)
  const wounds = useLiveQuery(
    () =>
      db.wounds
        .where('patientId')
        .equals(patientId)
        .filter((w) => w.location?.toLowerCase() === woundLocation?.toLowerCase())
        .toArray(),
    [patientId, woundLocation]
  );

  const chartData = useMemo(() => {
    if (!wounds || wounds.length === 0) return [];
    
    return wounds
      .map((w) => ({
        id: w.id,
        date: new Date(w.createdAt).getTime(),
        dateLabel: format(new Date(w.createdAt), 'dd MMM yy'),
        area: w.area ?? (w.length * w.width),
        length: w.length,
        width: w.width,
        depth: w.depth || 0,
        isCurrent: w.id === currentWoundId,
      }))
      .sort((a, b) => a.date - b.date);
  }, [wounds, currentWoundId]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return 'insufficient';
    const first = chartData[0].area;
    const last = chartData[chartData.length - 1].area;
    const change = ((last - first) / first) * 100;
    if (change < -10) return 'improving';
    if (change > 10) return 'deteriorating';
    return 'stable';
  }, [chartData]);

  const percentChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0].area;
    const last = chartData[chartData.length - 1].area;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const healingRate = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const daysDiff = Math.max(1, (last.date - first.date) / (1000 * 60 * 60 * 24));
    const weeklyRate = ((last.area - first.area) / daysDiff) * 7;
    return weeklyRate;
  }, [chartData]);

  const projectedHealingDays = useMemo(() => {
    if (!healingRate || healingRate >= 0 || chartData.length < 2) return null;
    const currentArea = chartData[chartData.length - 1].area;
    const daysToHeal = Math.ceil(currentArea / Math.abs(healingRate / 7));
    return daysToHeal;
  }, [healingRate, chartData]);

  if (!wounds || chartData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart3 size={16} />
          Surface Area Trend
        </h4>
        <p className="text-sm text-gray-500">No assessment data available yet.</p>
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <BarChart3 size={16} />
          Surface Area Trend
        </h4>
        <p className="text-sm text-gray-500">
          Only 1 assessment recorded ({chartData[0].area.toFixed(1)} cm²). Add more assessments to see the trend graph.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium text-gray-900">{data.dateLabel}</p>
          <p className="text-rose-600">Area: {data.area.toFixed(1)} cm²</p>
          <p className="text-gray-500">L: {data.length}cm × W: {data.width}cm</p>
          {data.depth > 0 && <p className="text-gray-500">Depth: {data.depth}cm</p>}
          {data.isCurrent && <p className="text-sky-600 font-medium mt-1">← Current</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 size={16} />
          Wound Surface Area Trend
        </h4>
        <div className="flex items-center gap-2">
          {trend === 'improving' && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
              <TrendingDown size={12} />
              {Math.abs(percentChange).toFixed(0)}% smaller
            </span>
          )}
          {trend === 'deteriorating' && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
              <TrendingUp size={12} />
              {percentChange.toFixed(0)}% larger
            </span>
          )}
          {trend === 'stable' && (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-200 px-2 py-1 rounded-full">
              <Minus size={12} />
              Stable
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-2" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              label={{ value: 'cm²', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9ca3af' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="area"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#areaGradient)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={payload.id}
                    cx={cx}
                    cy={cy}
                    r={payload.isCurrent ? 6 : 4}
                    fill={payload.isCurrent ? '#0ea5e9' : '#f43f5e'}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 7, stroke: '#f43f5e', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-y-1 text-xs text-gray-500">
        <span>{chartData.length} assessments recorded</span>
        <span>
          {chartData[0].area.toFixed(1)} cm² → {chartData[chartData.length - 1].area.toFixed(1)} cm²
        </span>
      </div>

      {/* Healing rate and projection */}
      {healingRate !== null && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full font-medium ${
            healingRate < -0.5 ? 'bg-emerald-100 text-emerald-800' :
            healingRate > 0.5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {healingRate < 0 ? '↓' : '↑'} {Math.abs(healingRate).toFixed(1)} cm²/week
          </span>
          {projectedHealingDays !== null && projectedHealingDays > 0 && projectedHealingDays < 365 && (
            <span className="px-2 py-1 rounded-full bg-sky-100 text-sky-800 font-medium">
              ~{projectedHealingDays}d to healing (est.)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
