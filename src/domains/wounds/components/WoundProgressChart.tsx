/**
 * WoundProgressChart - Graphical monitoring of wound surface area over time
 * Shows area reduction/increase trend for serial wound assessments
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, BarChart3 } from 'lucide-react';
import type { Wound } from '../../../types';

interface WoundProgressChartProps {
  patientId: string;
  woundLocation?: string; // Optional filter by location
  selectedWoundId?: string; // Highlight a specific wound
}

export default function WoundProgressChart({ patientId, woundLocation, selectedWoundId }: WoundProgressChartProps) {
  const wounds = useLiveQuery(
    () => db.wounds.where('patientId').equals(patientId).sortBy('createdAt'),
    [patientId]
  );

  const chartData = useMemo(() => {
    if (!wounds || wounds.length === 0) return [];

    // Group wounds by location for multi-line tracking
    const filtered = woundLocation
      ? wounds.filter(w => w.location === woundLocation)
      : wounds;

    return filtered.map((w, index) => {
      const area = w.area ?? (w.length * w.width);
      const prevWound = index > 0 ? filtered[index - 1] : null;
      const prevArea = prevWound ? (prevWound.area ?? (prevWound.length * prevWound.width)) : null;
      const changePercent = prevArea ? ((area - prevArea) / prevArea * 100) : 0;

      return {
        date: format(new Date(w.createdAt), 'dd MMM'),
        fullDate: format(new Date(w.createdAt), 'dd MMM yyyy'),
        area: Number(area.toFixed(1)),
        length: w.length,
        width: w.width,
        depth: w.depth || 0,
        location: w.location,
        progress: w.healingProgress,
        changePercent: Number(changePercent.toFixed(1)),
        phase: getPhaseLabel(w),
        id: w.id,
      };
    });
  }, [wounds, woundLocation]);

  // Get unique locations for multi-wound tracking
  const locations = useMemo(() => {
    if (!wounds) return [];
    return [...new Set(wounds.map(w => w.location))];
  }, [wounds]);

  // Location-grouped data for multi-line chart
  const locationChartData = useMemo(() => {
    if (!wounds || wounds.length === 0) return [];
    const allDates = [...new Set(wounds.map(w => format(new Date(w.createdAt), 'dd MMM yyyy')))].sort();
    
    return allDates.map(dateStr => {
      const entry: Record<string, unknown> = { date: dateStr.split(' ').slice(0, 2).join(' '), fullDate: dateStr };
      locations.forEach(loc => {
        const wound = wounds.find(w => format(new Date(w.createdAt), 'dd MMM yyyy') === dateStr && w.location === loc);
        if (wound) {
          entry[loc] = Number((wound.area ?? wound.length * wound.width).toFixed(1));
        }
      });
      return entry;
    });
  }, [wounds, locations]);

  // Summary stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const totalChange = last.area - first.area;
    const percentChange = ((totalChange / first.area) * 100);
    const trend = totalChange < 0 ? 'improving' : totalChange > 0 ? 'deteriorating' : 'stable';
    
    return {
      initialArea: first.area,
      currentArea: last.area,
      totalChange: Number(totalChange.toFixed(1)),
      percentChange: Number(percentChange.toFixed(1)),
      trend,
      assessmentCount: chartData.length,
      daySpan: Math.ceil((new Date(last.fullDate).getTime() - new Date(first.fullDate).getTime()) / (1000 * 60 * 60 * 24)),
    };
  }, [chartData]);

  if (!wounds || wounds.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No wound assessments to chart</p>
      </div>
    );
  }

  const lineColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-xs text-gray-500">Initial Area</p>
            <p className="text-lg font-bold text-gray-900">{stats.initialArea} cm&sup2;</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-xs text-gray-500">Current Area</p>
            <p className="text-lg font-bold text-gray-900">{stats.currentArea} cm&sup2;</p>
          </div>
          <div className={`rounded-lg p-3 border text-center ${
            stats.trend === 'improving' ? 'bg-emerald-50 border-emerald-200' :
            stats.trend === 'deteriorating' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-xs text-gray-500">Change</p>
            <p className={`text-lg font-bold flex items-center justify-center gap-1 ${
              stats.trend === 'improving' ? 'text-emerald-600' :
              stats.trend === 'deteriorating' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {stats.trend === 'improving' ? <TrendingDown className="w-4 h-4" /> :
               stats.trend === 'deteriorating' ? <TrendingUp className="w-4 h-4" /> :
               <Minus className="w-4 h-4" />}
              {stats.percentChange > 0 ? '+' : ''}{stats.percentChange}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <p className="text-xs text-gray-500">Assessments</p>
            <p className="text-lg font-bold text-gray-900">{stats.assessmentCount}</p>
            <p className="text-xs text-gray-400">{stats.daySpan} days</p>
          </div>
        </div>
      )}

      {/* Area Over Time Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-rose-500" />
          Wound Surface Area Over Time
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {locations.length <= 1 ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: '#6b7280' }} />
                <YAxis
                  fontSize={11}
                  tick={{ fill: '#6b7280' }}
                  label={{ value: 'Area (cm²)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold text-gray-900">{d.fullDate}</p>
                          <p className="text-gray-600">Area: <strong>{d.area} cm&sup2;</strong></p>
                          <p className="text-gray-600">L &times; W: {d.length} &times; {d.width} cm</p>
                          {d.depth > 0 && <p className="text-gray-600">Depth: {d.depth} cm</p>}
                          {d.changePercent !== 0 && (
                            <p className={d.changePercent < 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {d.changePercent > 0 ? '+' : ''}{d.changePercent}% from previous
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">{d.phase}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="area"
                  fill="#fecaca"
                  stroke="none"
                  fillOpacity={0.3}
                />
                <Line
                  type="monotone"
                  dataKey="area"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#dc2626' }}
                  name="Wound Area (cm²)"
                />
                {stats && (
                  <ReferenceLine
                    y={stats.initialArea}
                    stroke="#94a3b8"
                    strokeDasharray="5 5"
                    label={{ value: 'Initial', position: 'right', fill: '#94a3b8', fontSize: 10 }}
                  />
                )}
              </ComposedChart>
            ) : (
              <LineChart data={locationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={11} tick={{ fill: '#6b7280' }} />
                <YAxis
                  fontSize={11}
                  tick={{ fill: '#6b7280' }}
                  label={{ value: 'Area (cm²)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
                />
                <Tooltip />
                <Legend />
                {locations.map((loc, idx) => (
                  <Line
                    key={loc}
                    type="monotone"
                    dataKey={loc}
                    stroke={lineColors[idx % lineColors.length]}
                    strokeWidth={2}
                    dot={{ r: 4, fill: lineColors[idx % lineColors.length] }}
                    name={loc}
                    connectNulls
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assessment Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Assessment History</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {chartData.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                entry.id === selectedWoundId ? 'bg-rose-50 border border-rose-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  entry.progress === 'improving' ? 'bg-emerald-500' :
                  entry.progress === 'deteriorating' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600">{entry.fullDate}</span>
                <span className="font-medium text-gray-900">{entry.area} cm&sup2;</span>
              </div>
              <div className="flex items-center gap-2">
                {entry.changePercent !== 0 && (
                  <span className={`text-xs font-medium ${
                    entry.changePercent < 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {entry.changePercent > 0 ? '+' : ''}{entry.changePercent}%
                  </span>
                )}
                <span className="text-xs text-gray-400">{entry.phase}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPhaseLabel(wound: Wound): string {
  const hasNecrotic = wound.tissueType.includes('necrotic') || wound.tissueType.includes('eschar');
  const hasSlough = wound.tissueType.includes('slough');
  const hasGranulation = wound.tissueType.includes('granulation');
  if (hasNecrotic || (hasSlough && !hasGranulation)) return 'Extension Phase';
  if (hasGranulation) return 'Transition Phase';
  return 'Repair Phase';
}
