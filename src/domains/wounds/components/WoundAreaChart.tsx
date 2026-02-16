/**
 * WoundAreaChart - Graphical monitoring of wound surface area over time
 * Shows reduction or stasis of wound area across serial assessments
 */
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';
import { db } from '../../../database';

interface WoundAreaChartProps {
  patientId: string;
  woundLocation?: string; // optional filter by location
  currentWoundId?: string; // highlight current wound
}

interface ChartDataPoint {
  date: string;
  rawDate: Date;
  area: number;
  length: number;
  width: number;
  depth: number | undefined;
  woundId: string;
  healingProgress: string;
}

export default function WoundAreaChart({ patientId, woundLocation, currentWoundId }: WoundAreaChartProps) {
  const wounds = useLiveQuery(
    () => db.wounds.where('patientId').equals(patientId).toArray(),
    [patientId]
  );

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!wounds || wounds.length === 0) return [];

    let filtered = wounds;
    if (woundLocation) {
      filtered = wounds.filter(w => w.location === woundLocation);
    }

    // Sort chronologically
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map(w => ({
      date: format(new Date(w.createdAt), 'dd MMM yy'),
      rawDate: new Date(w.createdAt),
      area: w.area != null ? Number(Number(w.area).toFixed(1)) : (w.length * w.width),
      length: w.length,
      width: w.width,
      depth: w.depth,
      woundId: w.id,
      healingProgress: w.healingProgress || 'stable',
    }));
  }, [wounds, woundLocation]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: 'insufficient', percentage: 0 };
    const first = chartData[0].area;
    const last = chartData[chartData.length - 1].area;
    const change = ((last - first) / first) * 100;
    
    if (change < -10) return { direction: 'improving', percentage: Math.abs(change) };
    if (change > 10) return { direction: 'deteriorating', percentage: change };
    return { direction: 'stable', percentage: Math.abs(change) };
  }, [chartData]);

  if (!wounds || wounds.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        <Activity size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No wound assessments yet</p>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 text-center text-blue-600">
        <Activity size={24} className="mx-auto mb-2" />
        <p className="text-sm font-medium">First assessment recorded</p>
        <p className="text-xs text-blue-500 mt-1">
          Area: {chartData[0]?.area?.toFixed(1) || '—'} cm². Next assessment will show trend.
        </p>
      </div>
    );
  }

  const trendConfig = {
    improving: { icon: TrendingDown, color: 'text-green-600', bg: 'bg-green-50', label: 'Improving' },
    deteriorating: { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50', label: 'Deteriorating' },
    stable: { icon: Minus, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Stable' },
    insufficient: { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Insufficient Data' },
  };

  const tc = trendConfig[trend.direction as keyof typeof trendConfig];
  const TrendIcon = tc.icon;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
          <p className="font-semibold text-gray-900">{d.date}</p>
          <p className="text-rose-600">Area: {d.area} cm²</p>
          <p className="text-gray-600">L×W: {d.length}×{d.width} cm</p>
          {d.depth != null && <p className="text-gray-600">Depth: {d.depth} cm</p>}
          <p className={`capitalize ${
            d.healingProgress === 'improving' ? 'text-green-600' :
            d.healingProgress === 'deteriorating' ? 'text-red-600' : 'text-amber-600'
          }`}>{d.healingProgress}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity size={16} className="text-rose-500" />
          Wound Area Trend
          {woundLocation && <span className="text-xs text-gray-500 font-normal">— {woundLocation}</span>}
        </h4>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tc.bg} ${tc.color}`}>
          <TrendIcon size={14} />
          {tc.label}
          {trend.percentage > 0 && ` (${trend.percentage.toFixed(0)}%)`}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-gray-900">{chartData.length}</p>
          <p className="text-xs text-gray-500">Assessments</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-rose-600">{chartData[0].area}</p>
          <p className="text-xs text-gray-500">Initial (cm²)</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-blue-600">{chartData[chartData.length - 1].area}</p>
          <p className="text-xs text-gray-500">Latest (cm²)</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className={`text-lg font-bold ${
            trend.direction === 'improving' ? 'text-green-600' :
            trend.direction === 'deteriorating' ? 'text-red-600' : 'text-amber-600'
          }`}>
            {trend.direction === 'improving' ? '↓' : trend.direction === 'deteriorating' ? '↑' : '→'} 
            {trend.percentage.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">Change</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} label={{ value: 'cm²', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="area"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#areaGrad)"
              dot={{ r: 4, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#e11d48' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Assessment timeline */}
      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
        {chartData.map((d, i) => {
          const prevArea = i > 0 ? chartData[i - 1].area : null;
          const change = prevArea ? ((d.area - prevArea) / prevArea * 100) : null;
          return (
            <div key={d.woundId} className={`flex items-center justify-between text-xs p-1.5 rounded ${
              d.woundId === currentWoundId ? 'bg-rose-50 border border-rose-200' : 'bg-gray-50'
            }`}>
              <span className="text-gray-600">{d.date}</span>
              <span className="font-medium">{d.area} cm²</span>
              {change !== null && (
                <span className={`font-medium ${change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              )}
              {change === null && <span className="text-gray-400">Baseline</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
