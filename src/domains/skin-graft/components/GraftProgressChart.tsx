/**
 * Longitudinal progress for one graft site.
 *
 * Two things are plotted against postoperative day, on two axes, because they
 * answer different questions and a surgeon needs both:
 *
 *   percent closed  — is this wound heading for closure, and when
 *   area still open — is the wound itself getting bigger
 *
 * A wound can improve on the first and worsen on the second: a graft that
 * fails and leaves a bed which then contracts will show a rising healed
 * percentage over a shrinking baseline. Showing the absolute area alongside is
 * what stops the percentage from flattering a wound that is in trouble.
 *
 * The projection is drawn as a dashed line into a shaded window rather than a
 * point, because a straight line through a handful of ward photographs does
 * not justify naming a single day.
 */

import React, { useMemo } from 'react';
import {
  CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ProgressPoint } from '../services/skinGraftService';
import type { HealingPrediction, SiteKind } from '../types';

interface Props {
  series: ProgressPoint[];
  kind: SiteKind;
  prediction?: HealingPrediction;
  /** Shown as a reference line so drift from the baseline is visible. */
  baselineAreaCm2?: number | null;
  undatedAssessments?: number;
}

type Row = ProgressPoint & { projected?: number | null };

const HEALED = '#0d9488';   // teal — the line that matters most
const TAKE = '#6366f1';     // indigo
const AREA = '#f97316';     // orange, on the right axis
const PROJECTED = '#0d9488';

const GraftProgressChart: React.FC<Props> = ({
  series, kind, prediction, baselineAreaCm2, undatedAssessments = 0,
}) => {
  const isRecipient = kind === 'recipient';

  /**
   * The projection is a second series rather than extra fields on the measured
   * rows, so recharts draws it as its own dashed line. It is anchored to the
   * last measured point so the two lines meet instead of floating apart.
   */
  const { rows, projectionTo } = useMemo(() => {
    const base: Row[] = series.map(p => ({ ...p, projected: null }));
    const last = series[series.length - 1];

    const from = prediction?.predictedClosurePodFrom ?? null;
    const to = prediction?.predictedClosurePodTo ?? null;

    if (!last || from === null || last.healedPercent == null) {
      return { rows: base, projectionTo: null as number | null };
    }

    // Anchor: the dashed line starts exactly where the measured line ends.
    base[base.length - 1] = { ...base[base.length - 1], projected: last.healedPercent };

    const tail: Row[] = [{
      assessmentId: `projected-${from}`,
      postOpDay: from,
      date: '',
      healedPercent: null,
      takePercent: null,
      openAreaCm2: null,
      areaCm2: null,
      qualityScore: null,
      projected: 100,
    }];

    return { rows: [...base, ...tail], projectionTo: to };
  }, [series, prediction]);

  const measured = series.filter(p => p.healedPercent != null).length;

  if (!series.length) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center">
        <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No dated assessments to chart yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          {undatedAssessments > 0
            ? `${undatedAssessments} assessment${undatedAssessments === 1 ? '' : 's'} recorded, but the episode has no graft date, so there is no postoperative day to plot against.`
            : 'Record a traced assessment and the progress chart appears here.'}
        </p>
      </div>
    );
  }

  const maxPod = Math.max(
    ...rows.map(r => r.postOpDay),
    projectionTo ?? 0,
  );

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700">Progress over time</h3>
        <span className="text-xs text-gray-400">
          {measured} measured point{measured === 1 ? '' : 's'}
          {undatedAssessments > 0 && ` · ${undatedAssessments} undated, not plotted`}
        </span>
      </div>

      <div className="h-72 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="postOpDay"
              type="number"
              domain={[0, Math.ceil(maxPod * 1.05)]}
              tick={{ fontSize: 11 }}
              label={{ value: 'Postoperative day', position: 'insideBottom', offset: -12, fontSize: 11 }}
            />
            <YAxis
              yAxisId="pct"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              width={40}
              label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <YAxis
              yAxisId="area"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={46}
              label={{ value: 'cm²', angle: 90, position: 'insideRight', fontSize: 11 }}
            />

            {/* The projected closure window, drawn behind the lines. */}
            {prediction?.predictedClosurePodFrom != null && projectionTo != null && (
              <ReferenceArea
                yAxisId="pct"
                x1={prediction.predictedClosurePodFrom}
                x2={projectionTo}
                fill="#0d9488"
                fillOpacity={0.08}
                label={{ value: 'projected closure', fontSize: 10, fill: '#0f766e' }}
              />
            )}

            <ReferenceLine yAxisId="pct" y={100} stroke="#94a3b8" strokeDasharray="4 4" />
            {baselineAreaCm2 != null && (
              <ReferenceLine
                yAxisId="area"
                y={baselineAreaCm2}
                stroke={AREA}
                strokeDasharray="2 4"
                strokeOpacity={0.5}
                label={{ value: `baseline ${baselineAreaCm2} cm²`, fontSize: 10, fill: '#c2410c', position: 'right' }}
              />
            )}

            <Tooltip
              formatter={(value: any, name: string) => {
                if (value == null) return ['—', name];
                return [name.includes('cm²') ? `${value} cm²` : `${value}%`, name];
              }}
              labelFormatter={(pod: any) => `POD ${pod}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />

            <Line
              yAxisId="pct" type="monotone" dataKey="healedPercent"
              name={isRecipient ? 'Closed %' : 'Epithelialised %'}
              stroke={HEALED} strokeWidth={2.5}
              dot={{ r: 3 }} connectNulls={false} isAnimationActive={false}
            />
            {isRecipient && (
              <Line
                yAxisId="pct" type="monotone" dataKey="takePercent" name="Graft take %"
                stroke={TAKE} strokeWidth={2} strokeDasharray="5 3"
                dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false}
              />
            )}
            <Line
              yAxisId="area" type="monotone" dataKey="openAreaCm2" name="Open area cm²"
              stroke={AREA} strokeWidth={2}
              dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false}
            />
            <Line
              yAxisId="pct" type="linear" dataKey="projected" name="Projected"
              stroke={PROJECTED} strokeWidth={1.5} strokeDasharray="3 5"
              dot={false} connectNulls isAnimationActive={false} legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {isRecipient
          ? 'Take and closure are different questions: take is how much graft survived, closure is how much of the site is no longer open. Both are measured against the preserved baseline.'
          : 'Epithelialization is measured against the baseline area recorded when the donor site was first traced.'}
      </p>
    </div>
  );
};

export default GraftProgressChart;
