/**
 * PrescriptionHistoryReviewGuard
 *
 * Forces the prescriber to review the patient's existing prescription history
 * before issuing a new one. Reduces duplicate prescribing, missed interactions
 * and overlooked active medications.
 *
 * Buckets:
 *   Active       \u2014 status 'pending' or 'partially_dispensed' (still in play)
 *   Dispensed    \u2014 status 'dispensed'                       (recently filled)
 *   Discontinued \u2014 status 'cancelled'                        (stopped)
 *
 * Acknowledgement is at the medication-line level (not prescription level),
 * so the clinician must tick every individual drug they have reviewed. A
 * sentinel + IntersectionObserver detects scroll-to-bottom, and the bulk
 * "Tick all" button stays disabled until scrolled.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database';
import type { Prescription } from '../../types';
import { Pill, CheckCircle2, XCircle, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  patientId: string;
  onAcknowledgementChange?: (allAcked: boolean, summary: RxAckSummary) => void;
  className?: string;
}

export interface RxAckSummary {
  activeCount: number;
  dispensedCount: number;
  discontinuedCount: number;
  ackedLines: string[]; // composite keys: `${prescriptionId}:${medicationId}`
  acknowledgedAt: Date;
}

type Bucket = 'active' | 'dispensed' | 'discontinued';

interface Line {
  key: string;
  prescriptionId: string;
  medicationId: string;
  medName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions?: string;
  prescribedAt: Date;
  prescriber: string;
}

function toLines(rxs: Prescription[]): Line[] {
  const lines: Line[] = [];
  for (const rx of rxs) {
    for (const m of rx.medications) {
      lines.push({
        key: `${rx.id}:${m.id}`,
        prescriptionId: rx.id,
        medicationId: m.id,
        medName: m.name + (m.genericName ? ` (${m.genericName})` : ''),
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        duration: m.duration,
        instructions: m.instructions,
        prescribedAt: new Date(rx.prescribedAt),
        prescriber: rx.prescribedBy,
      });
    }
  }
  return lines.sort((a, b) => b.prescribedAt.getTime() - a.prescribedAt.getTime());
}

export default function PrescriptionHistoryReviewGuard({ patientId, onAcknowledgementChange, className = '' }: Props) {
  const prescriptions = useLiveQuery(
    () => (patientId ? db.prescriptions.where('patientId').equals(patientId).toArray() : Promise.resolve([] as Prescription[])),
    [patientId],
    [] as Prescription[],
  );

  const buckets = useMemo(() => {
    const active: Line[] = toLines(
      prescriptions.filter((r) => r.status === 'pending' || r.status === 'partially_dispensed'),
    );
    const dispensed: Line[] = toLines(prescriptions.filter((r) => r.status === 'dispensed'));
    const discontinued: Line[] = toLines(prescriptions.filter((r) => r.status === 'cancelled'));
    return { active, dispensed, discontinued };
  }, [prescriptions]);

  const totalLines = buckets.active.length + buckets.dispensed.length + buckets.discontinued.length;

  const [acked, setAcked] = useState<Record<Bucket, Set<string>>>({
    active: new Set(),
    dispensed: new Set(),
    discontinued: new Set(),
  });
  const [expanded, setExpanded] = useState<Record<Bucket, boolean>>({
    active: true,
    dispensed: false,
    discontinued: false,
  });

  const sentinelRefs = useRef<Record<Bucket, HTMLDivElement | null>>({
    active: null,
    dispensed: null,
    discontinued: null,
  });
  const [scrolled, setScrolled] = useState<Record<Bucket, boolean>>({
    active: false,
    dispensed: false,
    discontinued: false,
  });

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const bucket = (e.target as HTMLElement).dataset.bucket as Bucket | undefined;
          if (bucket && e.isIntersecting) {
            setScrolled((prev) => (prev[bucket] ? prev : { ...prev, [bucket]: true }));
          }
        });
      },
      { threshold: 0.5 },
    );
    Object.values(sentinelRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [buckets.active.length, buckets.dispensed.length, buckets.discontinued.length]);

  useEffect(() => {
    setScrolled((prev) => ({
      active: buckets.active.length === 0 ? true : prev.active,
      dispensed: buckets.dispensed.length === 0 ? true : prev.dispensed,
      discontinued: buckets.discontinued.length === 0 ? true : prev.discontinued,
    }));
  }, [buckets.active.length, buckets.dispensed.length, buckets.discontinued.length]);

  const allAcked = useMemo(() => {
    if (totalLines === 0) return true;
    return (
      acked.active.size === buckets.active.length &&
      acked.dispensed.size === buckets.dispensed.length &&
      acked.discontinued.size === buckets.discontinued.length
    );
  }, [acked, buckets, totalLines]);

  useEffect(() => {
    onAcknowledgementChange?.(allAcked, {
      activeCount: buckets.active.length,
      dispensedCount: buckets.dispensed.length,
      discontinuedCount: buckets.discontinued.length,
      ackedLines: [...acked.active, ...acked.dispensed, ...acked.discontinued],
      acknowledgedAt: new Date(),
    });
  }, [allAcked, acked, buckets, onAcknowledgementChange]);

  const toggleItem = (bucket: Bucket, key: string) => {
    setAcked((prev) => {
      const next = new Set(prev[bucket]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [bucket]: next };
    });
  };
  const toggleAll = (bucket: Bucket, lines: Line[]) => {
    setAcked((prev) => {
      const all = lines.length > 0 && prev[bucket].size === lines.length;
      return { ...prev, [bucket]: all ? new Set() : new Set(lines.map((l) => l.key)) };
    });
  };

  if (totalLines === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2 ${className}`}>
        <Pill size={16} className="text-gray-400" />
        No prior prescriptions on record for this patient.
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 rounded-xl overflow-hidden ${allAcked ? 'border-green-300' : 'border-amber-300'} ${className}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${allAcked ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className={allAcked ? 'text-green-600' : 'text-amber-600'} />
          <h3 className="font-semibold text-gray-900 text-sm">
            Prescription History Review {allAcked ? '· Acknowledged' : '· Action Required'}
          </h3>
        </div>
        <span className="text-xs text-gray-600">
          {acked.active.size + acked.dispensed.size + acked.discontinued.size} / {totalLines} drugs ticked
        </span>
      </div>
      <div className="p-3 space-y-3">
        <RxBucket
          bucket="active"
          title="Active (Pending / Partially Dispensed)"
          icon={<AlertTriangle size={14} className="text-amber-600" />}
          color="amber"
          lines={buckets.active}
          expanded={expanded.active}
          onToggleExpand={() => setExpanded((p) => ({ ...p, active: !p.active }))}
          acked={acked.active}
          onToggleItem={(k) => toggleItem('active', k)}
          onToggleAll={() => toggleAll('active', buckets.active)}
          scrolled={scrolled.active}
          sentinelRef={(el) => (sentinelRefs.current.active = el)}
        />
        <RxBucket
          bucket="dispensed"
          title="Dispensed"
          icon={<CheckCircle2 size={14} className="text-green-600" />}
          color="green"
          lines={buckets.dispensed}
          expanded={expanded.dispensed}
          onToggleExpand={() => setExpanded((p) => ({ ...p, dispensed: !p.dispensed }))}
          acked={acked.dispensed}
          onToggleItem={(k) => toggleItem('dispensed', k)}
          onToggleAll={() => toggleAll('dispensed', buckets.dispensed)}
          scrolled={scrolled.dispensed}
          sentinelRef={(el) => (sentinelRefs.current.dispensed = el)}
        />
        <RxBucket
          bucket="discontinued"
          title="Discontinued (Cancelled)"
          icon={<XCircle size={14} className="text-gray-500" />}
          color="gray"
          lines={buckets.discontinued}
          expanded={expanded.discontinued}
          onToggleExpand={() => setExpanded((p) => ({ ...p, discontinued: !p.discontinued }))}
          acked={acked.discontinued}
          onToggleItem={(k) => toggleItem('discontinued', k)}
          onToggleAll={() => toggleAll('discontinued', buckets.discontinued)}
          scrolled={scrolled.discontinued}
          sentinelRef={(el) => (sentinelRefs.current.discontinued = el)}
        />

        {!allAcked && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Tick every medication line to confirm review for duplicates, interactions, allergies and contraindications before issuing a new prescription.</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RxBucketProps {
  bucket: Bucket;
  title: string;
  icon: React.ReactNode;
  color: 'amber' | 'green' | 'gray';
  lines: Line[];
  expanded: boolean;
  onToggleExpand: () => void;
  acked: Set<string>;
  onToggleItem: (key: string) => void;
  onToggleAll: () => void;
  scrolled: boolean;
  sentinelRef: (el: HTMLDivElement | null) => void;
}

function RxBucket({ bucket, title, icon, color, lines, expanded, onToggleExpand, acked, onToggleItem, onToggleAll, scrolled, sentinelRef }: RxBucketProps) {
  const colorClasses = {
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-green-200 bg-green-50',
    gray: 'border-gray-200 bg-gray-50',
  }[color];

  const allTicked = lines.length > 0 && acked.size === lines.length;

  if (lines.length === 0) {
    return (
      <div className={`border rounded-lg ${colorClasses} px-3 py-2 text-xs text-gray-500 flex items-center gap-2`}>
        {icon}
        <span className="font-medium">{title}:</span> none
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${colorClasses}`}>
      <button type="button" onClick={onToggleExpand} className="w-full px-3 py-2 flex items-center justify-between text-left">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm text-gray-900">{title}</span>
          <span className="text-xs text-gray-600">({acked.size}/{lines.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {!scrolled && <span className="text-[10px] uppercase tracking-wide bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">scroll</span>}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="max-h-56 overflow-y-auto bg-white rounded border border-white/60 divide-y divide-gray-100">
            {lines.map((line) => {
              const isAcked = acked.has(line.key);
              return (
                <label key={line.key} className="flex items-start gap-2 p-2 hover:bg-gray-50 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={isAcked}
                    onChange={() => onToggleItem(line.key)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                    aria-label={`Acknowledge ${line.medName}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      <Pill size={12} className="inline mr-1 text-blue-600" />
                      {line.medName} <span className="text-gray-600 font-normal">{line.dosage}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {line.frequency} · {line.route} · {line.duration}
                    </div>
                    <div className="text-xs text-gray-400">
                      Issued {format(line.prescribedAt, 'PP')}
                    </div>
                    {line.instructions && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{line.instructions}</div>}
                  </div>
                </label>
              );
            })}
            <div ref={sentinelRef} data-bucket={bucket} className="h-px" />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onToggleAll}
              disabled={!scrolled && !allTicked}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!scrolled ? 'Scroll to the bottom of the list first' : ''}
            >
              {allTicked ? 'Untick all' : 'Tick all reviewed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
