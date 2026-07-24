/**
 * MonitorTrendChart — longitudinal wound trend for the WoundProgress Monitor.
 *
 * Recharts port of the source module's WoundProgressChart (which used Chart.js).
 * AstroHEALTH standardises on Recharts, so this renders area/length/width over
 * time plus the AI progress-report summary cards and recommendations.
 */

import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { WoundProgressEntry, WoundProgressReport } from '../services/aiWoundMeasurement';

interface MonitorTrendChartProps {
  measurements: WoundProgressEntry[];
  report?: WoundProgressReport | null;
}

export default function MonitorTrendChart({ measurements, report }: MonitorTrendChartProps) {
  const sorted = useMemo(
    () => [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [measurements],
  );

  const chartData = useMemo(
    () => sorted.map(m => {
      const d = new Date(m.date);
      return {
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        area: Number((m.area ?? 0).toFixed(2)),
        length: Number((m.length ?? 0).toFixed(2)),
        width: Number((m.width ?? 0).toFixed(2)),
      };
    }),
    [sorted],
  );

  if (sorted.length < 2) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
        At least 2 assessments needed for the progress chart.
      </div>
    );
  }

  const trendColor = report?.trend === 'improving'
    ? 'text-green-600 bg-green-50'
    : report?.trend === 'worsening'
      ? 'text-red-600 bg-red-50'
      : 'text-yellow-600 bg-yellow-50';
  const trendIcon = report?.trend === 'improving' ? '↓' : report?.trend === 'worsening' ? '↑' : '→';

  return (
    <div className="space-y-3 bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700">Wound Healing Progress</h3>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-2" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="monitorAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#DC2626" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" fontSize={11} tick={{ fill: '#6b7280' }} />
            <YAxis
              fontSize={11}
              tick={{ fill: '#6b7280' }}
              label={{ value: 'cm / cm²', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: 11 } }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [Number(value).toFixed(2), name]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone" dataKey="area" name="Area (cm²)"
              stroke="#DC2626" strokeWidth={2} fill="url(#monitorAreaFill)"
              dot={{ r: 4, fill: '#DC2626', stroke: '#fff', strokeWidth: 1 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone" dataKey="length" name="Length (cm)"
              stroke="#0E9F6E" strokeWidth={2} strokeDasharray="5 3"
              dot={{ r: 3, fill: '#0E9F6E' }}
            />
            <Line
              type="monotone" dataKey="width" name="Width (cm)"
              stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 3"
              dot={{ r: 3, fill: '#3B82F6' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={`rounded-lg px-3 py-2 ${trendColor}`}>
            <div className="text-xs font-medium">Trend</div>
            <div className="text-lg font-bold capitalize">{trendIcon} {report.trend}</div>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50">
            <div className="text-xs font-medium text-gray-500">Area Change</div>
            <div className="text-lg font-bold text-gray-800">
              {report.percentageChange > 0 ? '-' : '+'}{Math.abs(report.percentageChange)}%
            </div>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50">
            <div className="text-xs font-medium text-gray-500">Healing Rate</div>
            <div className="text-lg font-bold text-gray-800">{report.averageHealingRate.toFixed(2)} cm²/d</div>
          </div>
          {report.estimatedHealingTime != null && (
            <div className="rounded-lg px-3 py-2 bg-blue-50">
              <div className="text-xs font-medium text-blue-600">Est. Closure</div>
              <div className="text-lg font-bold text-blue-800">~{report.estimatedHealingTime}d</div>
              {report.estimatedClosureDate && (
                <div className="text-[10px] text-blue-600">
                  {new Date(report.estimatedClosureDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Recommendations</h4>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {report.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
