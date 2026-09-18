/**
 * Circumferential measurements, recorded as right and left.
 *
 * The table this replaces asked for an "affected" limb and a "contralateral"
 * one. That is fine for unilateral disease and wrong for bilateral, where there
 * is no contralateral limb to speak of — both are affected, and the difference
 * between them is asymmetry, not excess.
 *
 * So the columns are anatomical: right and left, always. Which limbs are
 * diseased is stated separately, and the comparison adapts to that answer
 * rather than being baked into the column headings.
 *
 * Everything is live: volumes recalculate as numbers are entered, the
 * comparison panel changes strategy the moment the second limb is marked
 * affected, and transcription warnings appear against the row that caused them.
 */

import React, { useMemo } from 'react';
import { AlertTriangle, ArrowLeftRight, Info, Ruler } from 'lucide-react';
import {
  compareLimbs, sitesFor, siteWarnings, limbProfileWarnings, limbVolumeMl,
  type MeasurementSite, type Side, type SiteMeasurement, type VolumeAssessment,
} from '../services/limbVolume';

export interface SideValues {
  /** Circumference per site index, in cm. */
  [siteIndex: number]: number | undefined;
}

export interface BilateralMeasurementValue {
  right: SideValues;
  left: SideValues;
  affected: { right: boolean; left: boolean };
  /** Earlier volumes, so bilateral disease has something to compare against. */
  baseline?: { right?: number | null; left?: number | null };
}

interface Props {
  region: 'upper' | 'lower';
  value: BilateralMeasurementValue;
  onChange: (v: BilateralMeasurementValue) => void;
  /** Called whenever the assessment changes, so the page can stage from it. */
  onAssessment?: (a: VolumeAssessment) => void;
}

const toMeasurements = (sites: MeasurementSite[], values: SideValues): SiteMeasurement[] =>
  sites
    .map((s, i) => ({
      distanceFromLandmarkCm: s.distanceFromLandmarkCm,
      circumferenceCm: values[i] ?? 0,
    }))
    .filter(m => m.circumferenceCm > 0);

const BilateralMeasurements: React.FC<Props> = ({ region, value, onChange, onAssessment }) => {
  const sites = useMemo(() => sitesFor(region), [region]);

  const assessment = useMemo(() => compareLimbs({
    right: toMeasurements(sites, value.right),
    left: toMeasurements(sites, value.left),
    affected: value.affected,
    baseline: value.baseline,
  }), [sites, value]);

  React.useEffect(() => { onAssessment?.(assessment); }, [assessment, onAssessment]);

  const warnings = useMemo(
    () => [
      ...sites.flatMap((s, i) => siteWarnings(s.locationName, value.right[i], value.left[i])),
      // The check that catches a misplaced row: a limb that narrows going up.
      ...limbProfileWarnings(sites, sites.map((_, i) => value.right[i]), 'right'),
      ...limbProfileWarnings(sites, sites.map((_, i) => value.left[i]), 'left'),
    ],
    [sites, value],
  );

  const setValue = (side: Side, index: number, raw: string) => {
    const parsed = raw === '' ? undefined : Number(raw);
    onChange({
      ...value,
      [side]: { ...value[side], [index]: Number.isFinite(parsed as number) ? parsed : undefined },
    });
  };

  const toggleAffected = (side: Side) =>
    onChange({ ...value, affected: { ...value.affected, [side]: !value.affected[side] } });

  const rightVol = limbVolumeMl(toMeasurements(sites, value.right));
  const leftVol = limbVolumeMl(toMeasurements(sites, value.left));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Ruler className="w-5 h-5 text-primary" />
        Circumferential measurements (cm)
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Recorded by side, because in bilateral disease neither limb is a control. Mark which limbs
        are affected and the comparison below adapts.
      </p>

      {/* Which limbs are affected — this drives everything underneath. */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['right', 'left'] as Side[]).map(side => (
          <button
            key={side}
            type="button"
            onClick={() => toggleAffected(side)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-colors ${
              value.affected[side]
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
            }`}
          >
            {side} limb {value.affected[side] ? 'affected' : 'not affected'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2 text-xs font-semibold text-gray-500">Location</th>
              <th className="text-right p-2 text-xs font-semibold text-gray-500">
                Right (cm){value.affected.right && <span className="text-purple-600"> •</span>}
              </th>
              <th className="text-right p-2 text-xs font-semibold text-gray-500">
                Left (cm){value.affected.left && <span className="text-purple-600"> •</span>}
              </th>
              <th className="text-right p-2 text-xs font-semibold text-gray-500">R − L</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site, i) => {
              const r = value.right[i];
              const l = value.left[i];
              const diff = typeof r === 'number' && typeof l === 'number'
                ? (r - l).toFixed(1) : '—';
              const rowWarn = siteWarnings(site.locationName, r, l).length > 0;

              return (
                <tr key={site.locationName}
                  className={`border-b border-gray-100 ${rowWarn ? 'bg-amber-50' : ''}`}>
                  <td className="p-2 text-gray-700">{site.locationName}</td>
                  {(['right', 'left'] as Side[]).map(side => (
                    <td key={side} className="p-2 text-right">
                      <input
                        type="number" step="0.1" min="0"
                        value={value[side][i] ?? ''}
                        onChange={e => setValue(side, i, e.target.value)}
                        aria-label={`${site.locationName}, ${side}`}
                        className="w-24 p-1 border border-gray-300 rounded text-sm text-right"
                      />
                    </td>
                  ))}
                  <td className={`p-2 text-right font-medium tabular-nums ${
                    diff === '—' ? 'text-gray-400'
                      : Math.abs(Number(diff)) >= 2 ? 'text-amber-700' : 'text-gray-600'
                  }`}>
                    {diff}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-semibold">
              <td className="p-2 text-gray-700">Calculated volume</td>
              <td className="p-2 text-right tabular-nums text-gray-900">
                {rightVol == null ? '—' : `${rightVol} ml`}
              </td>
              <td className="p-2 text-right tabular-nums text-gray-900">
                {leftVol == null ? '—' : `${leftVol} ml`}
              </td>
              <td className="p-2 text-right tabular-nums text-gray-600">
                {assessment.asymmetryMl == null ? '—' : `${assessment.asymmetryMl} ml`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Volume is the truncated cone sum over adjacent levels, so at least two readings per limb are
        needed before a volume exists.
      </p>

      {warnings.length > 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{w}
            </p>
          ))}
        </div>
      )}

      <ComparisonPanel assessment={assessment} />
    </div>
  );
};

/** What the numbers support, and what they do not. */
const ComparisonPanel: React.FC<{ assessment: VolumeAssessment }> = ({ assessment }) => {
  const { strategy, excessPercent, excessMl, asymmetryMl, asymmetryPercent, notes, needed } = assessment;

  const strategyLabel = strategy === 'inter_limb' ? 'Compared against the unaffected limb'
    : strategy === 'intra_limb' ? 'Compared against each limb’s own baseline'
      : 'Excess volume not determinable';

  return (
    <div className={`mt-4 rounded-lg border p-3 ${
      strategy === 'unavailable' ? 'bg-gray-50 border-gray-200' : 'bg-purple-50 border-purple-200'
    }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-800">{strategyLabel}</span>
        </div>
        {excessPercent != null && (
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-800 tabular-nums">
              {excessPercent > 0 ? '+' : ''}{excessPercent}%
            </div>
            {excessMl != null && (
              <div className="text-xs text-purple-700">{excessMl > 0 ? '+' : ''}{excessMl} ml</div>
            )}
          </div>
        )}
      </div>

      {asymmetryMl != null && (
        <p className="text-xs text-gray-600 mt-1.5">
          Asymmetry between the limbs: {asymmetryMl} ml
          {asymmetryPercent != null && ` (${asymmetryPercent}%)`}.
        </p>
      )}

      {notes.map((n, i) => (
        <p key={i} className="text-xs text-gray-600 mt-1 flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />{n}
        </p>
      ))}

      {needed.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600">To determine it</p>
          {needed.map((n, i) => (
            <p key={i} className="text-xs text-gray-500">• {n}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default BilateralMeasurements;
