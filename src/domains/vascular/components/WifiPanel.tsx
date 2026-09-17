/**
 * WIfI, shown with its working.
 *
 * The specification is emphatic that the final stage must never appear alone,
 * and it is right: a grade is only checkable if the measurement behind it is
 * visible. So each component prints the reason it was given, which measurement
 * decided it, what was available but not used, and what is missing.
 *
 * The "not used" list is the part that earns its place. A clinician looking at
 * an ischaemia grade of 3 on a limb whose ankle index reads 1.5 needs to see
 * that the index was set aside as noncompressible — otherwise the grade looks
 * like a bug.
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Info } from 'lucide-react';
import type { GradedComponent, WifiResult } from '../types';

const GRADE_TONE = [
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-red-100 text-red-800 border-red-200',
];

const THREAT_STYLE: Record<WifiResult['limbThreat'], { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-emerald-100 text-emerald-800' },
  moderate: { label: 'Moderate', className: 'bg-amber-100 text-amber-800' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
  very_high: { label: 'Very high', className: 'bg-red-100 text-red-800' },
  insufficient_data: { label: 'Not assessable', className: 'bg-gray-100 text-gray-600' },
};

const Component: React.FC<{ title: string; letter: string; c: GradedComponent }> = ({
  title, letter, c,
}) => (
  <div className="border rounded-xl p-3">
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <span className="text-sm font-medium text-gray-800">{title}</span>
      <span className={`px-2 py-0.5 rounded-lg border text-sm font-bold tabular-nums ${
        c.grade === null ? 'bg-gray-100 text-gray-500 border-gray-200' : GRADE_TONE[c.grade]
      }`}>
        {letter}{c.grade === null ? '?' : c.grade}
      </span>
    </div>

    <p className="text-sm text-gray-700">{c.reason}</p>

    {c.decidedBy && (
      <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-emerald-600" />
        Decided by: {c.decidedBy}
      </p>
    )}

    {c.notUsed?.map((n, i) => (
      <p key={i} className="text-xs text-amber-700 mt-1 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />{n}
      </p>
    ))}

    {c.missing?.map((m, i) => (
      <p key={i} className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
        <HelpCircle className="w-3 h-3 mt-0.5 shrink-0" />Missing: {m}
      </p>
    ))}
  </div>
);

const WifiPanel: React.FC<{ wifi: WifiResult }> = ({ wifi }) => {
  const threat = THREAT_STYLE[wifi.limbThreat];

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">WIfI</h3>
          <p className="text-xs text-gray-500">
            Wound, ischaemia and foot infection — computed from the recorded measurements.
          </p>
        </div>
        <div className="text-right">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${threat.className}`}>
            Limb threat: {threat.label}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Component title="Wound" letter="W" c={wifi.wound} />
        <Component title="Ischaemia" letter="I" c={wifi.ischaemia} />
        <Component title="Foot infection" letter="fI" c={wifi.footInfection} />
      </div>

      <div className="mt-3 bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-700 mb-1">Why this limb-threat signal</p>
        {wifi.limbThreatBasis.map((b, i) => (
          <p key={i} className="text-xs text-gray-600">{b}</p>
        ))}
      </div>

      {/* The stage is deliberately absent; say so rather than leaving a gap. */}
      <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
        {wifi.svsStageNote}
      </p>

      <p className="text-xs text-gray-400 mt-2">
        Decision-support classification based on documented findings. Clinician confirmation required.
      </p>
    </div>
  );
};

export default WifiPanel;
