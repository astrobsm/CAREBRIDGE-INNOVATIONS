/**
 * Longitudinal graphs for one scar, with treatment events overlaid.
 *
 * The treatment markers are the point. A falling area line is interesting; a
 * falling area line with three injection marks on it is an argument. Plotting
 * the intervention against the measurement is what lets a surgeon see whether
 * change followed treatment or preceded it.
 *
 * Each domain is its own small chart rather than one crowded axis: area in cm²,
 * erythema in Δa* and a VSS total share no scale, and forcing them onto one
 * pair of axes would make the biggest number the only visible one.
 */

import React, { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, HelpCircle, Activity } from 'lucide-react';
import type { DomainChange, ScarAssessment, ScarTreatment, TrendDirection } from '../types';
import { formatDateSafe } from '../../../utils/safeDate';

const TREND_STYLE: Record<TrendDirection, { className: string; Icon: typeof TrendingUp; label: string }> = {
  improving: { className: 'text-emerald-700 bg-emerald-50', Icon: TrendingDown, label: 'Improving' },
  worsening: { className: 'text-red-700 bg-red-50', Icon: TrendingUp, label: 'Worsening' },
  stable: { className: 'text-sky-700 bg-sky-50', Icon: Minus, label: 'Stable' },
  fluctuating: { className: 'text-amber-700 bg-amber-50', Icon: Activity, label: 'Fluctuating' },
  indeterminate: { className: 'text-gray-500 bg-gray-100', Icon: HelpCircle, label: 'Indeterminate' },
};

const ORIGIN_LABEL: Record<string, string> = {
  measured: 'Measured from photograph',
  examined: 'Physical examination',
  reported: 'Patient reported',
  derived: 'Derived',
  predicted: 'Predicted',
};

export const TrendChip: React.FC<{ trend: TrendDirection }> = ({ trend }) => {
  const s = TREND_STYLE[trend];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
      <s.Icon className="w-3 h-3" /> {s.label}
    </span>
  );
};

interface Props {
  changes: DomainChange[];
  assessments: ScarAssessment[];
  treatments: ScarTreatment[];
  /** Per-domain series, keyed by domain, in chronological order. */
  seriesByDomain: Record<string, { at: string; value: number }[]>;
}

const ScarChart: React.FC<Props> = ({ changes, treatments, seriesByDomain }) => {
  const plottable = changes.filter(c => (seriesByDomain[c.domain]?.length ?? 0) >= 2);
  const [active, setActive] = useState<string>(() => plottable[0]?.domain ?? '');

  const change = plottable.find(c => c.domain === active);
  const series = seriesByDomain[active] ?? [];

  /**
   * Days from the first assessment, so treatments and measurements share one
   * axis. Calendar dates on a numeric axis would space visits by pixel rather
   * than by time and make a six-month gap look like a six-day one.
   */
  const { rows, treatmentMarks, origin } = useMemo(() => {
    if (!series.length) return { rows: [], treatmentMarks: [], origin: null as string | null };
    const start = new Date(series[0].at).getTime();
    const toDay = (iso: string) => Math.round((new Date(iso).getTime() - start) / 86_400_000);

    return {
      origin: series[0].at,
      rows: series.map(p => ({ day: toDay(p.at), value: p.value, at: p.at })),
      treatmentMarks: treatments
        .map(t => ({ day: toDay(t.administeredAt), kind: t.kind, at: t.administeredAt }))
        .filter(t => t.day >= 0),
    };
  }, [series, treatments]);

  if (!plottable.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center">
        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No domain has two assessments yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          A second assessment is what turns a measurement into a trend.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700">Longitudinal trends</h3>
        {change && <TrendChip trend={change.trend} />}
      </div>

      {/* Domain selector: every domain is followed separately, so the reader
          picks one rather than being shown an average of all of them. */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {plottable.map(c => (
          <button
            key={c.domain}
            onClick={() => setActive(c.domain)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              active === c.domain
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {change && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Metric label="Baseline" value={change.baselineValue} unit={change.unit} />
            <Metric label="Previous" value={change.previousValue} unit={change.unit} />
            <Metric label="Current" value={change.currentValue} unit={change.unit} bold />
            <Metric
              label="From baseline"
              value={change.percentChangeFromBaseline}
              unit="%"
              signed
              good={change.percentChangeFromBaseline != null
                ? (change.lowerIsBetter ? change.percentChangeFromBaseline < 0 : change.percentChangeFromBaseline > 0)
                : null}
            />
          </div>

          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="day" type="number" tick={{ fontSize: 11 }}
                  label={{ value: 'Days from baseline', position: 'insideBottom', offset: -12, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }} width={46}
                  label={{ value: change.unit, angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: any) => [`${v} ${change.unit}`, change.label]}
                  labelFormatter={(d: any) => {
                    const row = rows.find(r => r.day === d);
                    return row ? `Day ${d} · ${formatDateSafe(row.at, 'd MMM yyyy')}` : `Day ${d}`;
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                {treatmentMarks.map((t, i) => (
                  <ReferenceLine
                    key={i} x={t.day} stroke="#a855f7" strokeDasharray="3 3"
                    label={{ value: '℞', fontSize: 12, fill: '#7e22ce', position: 'top' }}
                  />
                ))}
                <Line
                  type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5}
                  dot={{ r: 3.5 }} isAnimationActive={false} connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
            <span>{ORIGIN_LABEL[change.origin] ?? change.origin}</span>
            {change.ratePerMonth != null && (
              <span>
                {change.ratePerMonth > 0 ? '+' : ''}{change.ratePerMonth} {change.unit}/month
              </span>
            )}
            {change.accelerationPerMonth != null && (
              <span title="Change in the rate itself between the last two intervals">
                acceleration {change.accelerationPerMonth > 0 ? '+' : ''}{change.accelerationPerMonth}
              </span>
            )}
            {treatmentMarks.length > 0 && <span className="text-purple-500">℞ treatment given</span>}
            {origin && <span>baseline {formatDateSafe(origin, 'd MMM yyyy')}</span>}
          </div>

          {change.limitations.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {change.limitations.map((l, i) => (
                <li key={i} className="text-xs text-amber-700">{l}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

const Metric: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  bold?: boolean;
  signed?: boolean;
  good?: boolean | null;
}> = ({ label, value, unit, bold, signed, good }) => (
  <div>
    <div className="text-xs text-gray-400">{label}</div>
    <div className={`tabular-nums ${bold ? 'text-lg font-semibold' : 'text-base'} ${
      good === true ? 'text-emerald-700' : good === false ? 'text-red-700' : 'text-gray-900'
    }`}>
      {value == null ? '—' : `${signed && value > 0 ? '+' : ''}${value}${unit === '%' ? '%' : ''}`}
      {value != null && unit !== '%' && <span className="text-xs text-gray-400 ml-1">{unit}</span>}
    </div>
  </div>
);

export default ScarChart;
