/**
 * Baseline against current, side by side.
 *
 * WHY THE IMAGES ARE NOT ALIGNED TO EACH OTHER
 * Registering two clinical photographs — warping one to match the other — would
 * make them easier to compare and less trustworthy. Any transform that squares
 * up a scar taken from a slightly different angle is also free to change its
 * apparent shape, and a viewer has no way to tell a real difference from one
 * the alignment introduced. The measurements already handle the geometry
 * properly, because they come from a traced boundary and a calibration marker
 * rather than from pixel correspondence.
 *
 * So the frames are shown as captured, at a common display scale, with the
 * traced outline drawn on each. Differences in framing stay visible instead of
 * being smoothed away — and where the capture conditions differed enough to
 * make even a visual comparison misleading, that is stated above the pictures.
 */

import React, { useState } from 'react';
import { ArrowLeftRight, Image as ImageIcon, Info } from 'lucide-react';
import type { ScarAssessment } from '../types';
import { formatDateSafe } from '../../../utils/safeDate';
import { compareCaptureConditions } from '../services/multimodal';

interface Props {
  baseline?: ScarAssessment;
  latest?: ScarAssessment;
  /** Every assessment, so the reader can pick which two to compare. */
  assessments: ScarAssessment[];
}

const ImageComparison: React.FC<Props> = ({ baseline, latest, assessments }) => {
  const withImages = assessments.filter(a => a.images.length > 0);
  const [leftId, setLeftId] = useState(() => baseline?.id ?? withImages[0]?.id ?? '');
  const [rightId, setRightId] = useState(
    () => latest?.id ?? withImages[withImages.length - 1]?.id ?? '',
  );
  const [showTraced, setShowTraced] = useState(true);

  const left = withImages.find(a => a.id === leftId);
  const right = withImages.find(a => a.id === rightId);

  if (withImages.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center">
        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No photographs stored yet.</p>
      </div>
    );
  }

  const warnings = left && right && left.id !== right.id
    ? compareCaptureConditions({
        previousDevice: left.images[0]?.conditions.deviceLabel,
        currentDevice: right.images[0]?.conditions.deviceLabel,
        previousLighting: left.images[0]?.conditions.lighting,
        currentLighting: right.images[0]?.conditions.lighting,
        previousPixelsPerCm: left.images[0]?.pixelsPerCm,
        currentPixelsPerCm: right.images[0]?.pixelsPerCm,
      })
    : [];

  const areaOf = (a?: ScarAssessment) => a?.morphometry?.areaCm2 ?? null;
  const leftArea = areaOf(left);
  const rightArea = areaOf(right);
  const delta = leftArea != null && rightArea != null && leftArea > 0
    ? Math.round(((rightArea - leftArea) / leftArea) * 1000) / 10
    : null;

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-indigo-600" /> Compare photographs
        </h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showTraced}
            onChange={e => setShowTraced(e.target.checked)}
            className="accent-indigo-600"
          />
          Show traced outline
        </label>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800">{w}</p>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Pane
          assessment={left}
          assessments={withImages}
          onSelect={setLeftId}
          showTraced={showTraced}
          caption="Earlier"
        />
        <Pane
          assessment={right}
          assessments={withImages}
          onSelect={setRightId}
          showTraced={showTraced}
          caption="Later"
        />
      </div>

      {delta != null && (
        <p className="text-sm text-gray-700 mt-3">
          Area {delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'unchanged'}{' '}
          <span className={`font-semibold tabular-nums ${
            delta > 0 ? 'text-red-700' : delta < 0 ? 'text-emerald-700' : 'text-gray-700'
          }`}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>{' '}
          between these two — {leftArea} cm² to {rightArea} cm².
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Frames are shown as captured, not warped to align. Aligning them would make them easier to
        compare and less trustworthy, because the same transform that squares up the angle can
        change the apparent shape. The percentages come from the traced boundaries and the
        calibration marker, not from the pictures.
      </p>
    </div>
  );
};

const Pane: React.FC<{
  assessment?: ScarAssessment;
  assessments: ScarAssessment[];
  onSelect: (id: string) => void;
  showTraced: boolean;
  caption: string;
}> = ({ assessment, assessments, onSelect, showTraced, caption }) => {
  const image = assessment?.images[0];
  const src = showTraced ? (image?.annotatedDataUrl || image?.dataUrl) : image?.dataUrl;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-gray-500">{caption}</span>
        <select
          value={assessment?.id ?? ''}
          onChange={e => onSelect(e.target.value)}
          className="text-xs border rounded-lg px-2 py-1 max-w-[60%]"
          aria-label={`${caption} assessment`}
        >
          {assessments.map(a => (
            <option key={a.id} value={a.id}>
              {formatDateSafe(a.assessedAt, 'd MMM yyyy')}{a.isBaseline ? ' (baseline)' : ''}
            </option>
          ))}
        </select>
      </div>

      {src ? (
        <img
          src={src}
          alt={`${caption} photograph`}
          className="w-full rounded-lg border bg-gray-50"
        />
      ) : (
        <div className="w-full h-40 rounded-lg border bg-gray-50 flex items-center justify-center">
          <span className="text-xs text-gray-400">No photograph</span>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
        <div>
          {assessment?.morphometry?.areaCm2 != null
            ? `${assessment.morphometry.areaCm2} cm²`
            : 'not measured'}
          {image?.pixelsPerCm != null
            ? ` · ${image.pixelsPerCm.toFixed(1)} px/cm`
            : ' · uncalibrated'}
        </div>
        <div className="text-gray-400">
          quality {assessment?.quality ?? '—'} · image {image?.quality.score ?? '—'}%
        </div>
      </div>
    </div>
  );
};

export default ImageComparison;
