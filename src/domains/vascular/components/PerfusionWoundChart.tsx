/**
 * Wound area against perfusion, on one timeline.
 *
 * This is the chart the module exists for. A wound that is not healing raises
 * one question before all others — is it failing because it is not perfused? —
 * and that question is answerable only by putting the two trajectories on the
 * same axis with the interventions marked on it.
 *
 * Wound area falls on the left axis, perfusion rises on the right, so a healing
 * limb shows the two lines converging. Revascularisations are drawn as vertical
 * marks: the clinically interesting pattern is a perfusion step at the mark
 * followed by the wound line turning over, and that is visible at a glance and
 * almost impossible to see in a table.
 *
 * WHAT IT DOES NOT CLAIM
 * Two lines moving together is an association in one patient, not causation,
 * and the caption says so. The module is explicitly not in the business of
 * inferring that the angioplasty healed the wound.
 */

import React, { useMemo, useState } from 'react';
import {
  CartesianGrid, ComposedChart, Legend, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';
import { formatDateSafe } from '../../../utils/safeDate';
import type { MeasureTrend, VascularMeasure } from '../services/vascularTrend';
import type { VascularIntervention } from '../types';

const WOUND = '#f97316';
const PERFUSION = '#0d9488';

/** Perfusion measures worth plotting against the wound, best first. */
const PERFUSION_MEASURES: VascularMeasure[] = ['toe_pressure', 'tcpo2', 'spp', 'abi', 'tbi'];

interface Props {
  trends: MeasureTrend[];
  interventions: VascularIntervention[];
}

const PerfusionWoundChart: React.FC<Props> = ({ trends, interventions }) => {
  const wound = trends.find(t => t.measure === 'wound_area');
  const available = PERFUSION_MEASURES
    .map(m => trends.find(t => t.measure === m))
    .filter((t): t is MeasureTrend => !!t && t.series.length > 0);

  const [selected, setSelected] = useState<VascularMeasure>(
    () => available[0]?.measure ?? 'toe_pressure',
  );
  const perfusion = available.find(t => t.measure === selected) ?? available[0];

  /**
   * Both series merged onto one day axis.
   *
   * Days from the first observation rather than calendar dates: a numeric axis
   * spaces visits by elapsed time, so a six-month gap looks like a six-month
   * gap instead of one tick.
   */
  const { rows, marks, origin } = useMemo(() => {
    const all = [...(wound?.series ?? []), ...(perfusion?.series ?? [])];
    if (!all.length) return { rows: [], marks: [], origin: null as string | null };

    const start = Math.min(...all.map(p => new Date(p.at).getTime()));
    const toDay = (iso: string) => Math.round((new Date(iso).getTime() - start) / 86_400_000);

    const byDay = new Map<number, { day: number; area?: number; perf?: number; at: string }>();
    for (const p of wound?.series ?? []) {
      const d = toDay(p.at);
      byDay.set(d, { ...(byDay.get(d) ?? { day: d, at: p.at }), day: d, at: p.at, area: p.value });
    }
    for (const p of perfusion?.series ?? []) {
      const d = toDay(p.at);
      byDay.set(d, { ...(byDay.get(d) ?? { day: d, at: p.at }), day: d, at: p.at, perf: p.value });
    }

    return {
      origin: new Date(start).toISOString(),
      rows: [...byDay.values()].sort((a, b) => a.day - b.day),
      marks: interventions
        .map(i => ({ day: toDay(i.performedAt), kind: i.kind, at: i.performedAt }))
        .filter(m => m.day >= 0),
    };
  }, [wound, perfusion, interventions]);

  if (!wound?.series.length && !available.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center">
        <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Nothing to plot yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Record a wound area and a perfusion measurement across at least two visits.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" /> Perfusion against wound healing
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Is the wound failing because the limb is not perfused?
          </p>
        </div>
        {available.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {available.map(t => (
              <button
                key={t.measure}
                onClick={() => setSelected(t.measure)}
                className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selected === t.measure
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-64 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="day" type="number" tick={{ fontSize: 11 }}
              label={{ value: 'Days from first assessment', position: 'insideBottom', offset: -12, fontSize: 11 }}
            />
            <YAxis
              yAxisId="wound" tick={{ fontSize: 11 }} width={44}
              label={{ value: 'cm²', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <YAxis
              yAxisId="perf" orientation="right" tick={{ fontSize: 11 }} width={46}
              label={{ value: perfusion?.unit || '', angle: 90, position: 'insideRight', fontSize: 11 }}
            />

            {marks.map((m, i) => (
              <ReferenceLine
                key={i} x={m.day} stroke="#a855f7" strokeDasharray="3 3"
                label={{ value: '℞', fontSize: 12, fill: '#7e22ce', position: 'top' }}
              />
            ))}

            <Tooltip
              labelFormatter={(d: any) => {
                const row = rows.find(r => r.day === d);
                return row ? `Day ${d} · ${formatDateSafe(row.at, 'd MMM yyyy')}` : `Day ${d}`;
              }}
              formatter={(v: any, name: string) => [v, name]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />

            <Line
              yAxisId="wound" type="monotone" dataKey="area" name="Wound area (cm²)"
              stroke={WOUND} strokeWidth={2.5} dot={{ r: 3 }}
              connectNulls isAnimationActive={false}
            />
            <Line
              yAxisId="perf" type="monotone" dataKey="perf"
              name={`${perfusion?.label ?? 'Perfusion'}${perfusion?.unit ? ` (${perfusion.unit})` : ''}`}
              stroke={PERFUSION} strokeWidth={2.5} dot={{ r: 3 }}
              connectNulls isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
        {marks.length > 0 && <span className="text-purple-500">℞ intervention</span>}
        {origin && <span>first assessment {formatDateSafe(origin, 'd MMM yyyy')}</span>}
        {perfusion?.note && <span className="text-amber-700">{perfusion.note}</span>}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Two lines moving together in one patient is an association, not causation. The chart shows
        what was measured and when interventions happened; whether one caused the other is a
        clinical judgement.
      </p>
    </div>
  );
};

export default PerfusionWoundChart;
