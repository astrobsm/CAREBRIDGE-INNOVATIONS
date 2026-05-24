/**
 * PreviousPlansReviewGuard
 *
 * Forces the clinician to review the patient's prior treatment plan items
 * before allowing an encounter to be saved. Plans are bucketed into three
 * lists: Executed (completed), Missed, and Outstanding (scheduled/in_progress).
 *
 * The clinician must tick every item to acknowledge they have reviewed it.
 * Parent receives an `onAcknowledgementChange(allAcked)` callback and is
 * expected to disable its Save button when `allAcked === false`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database';
import type { TreatmentSession } from '../../types';
import { CheckCircle2, AlertTriangle, Clock, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { format, isAfter, subDays } from 'date-fns';

interface Props {
  patientId: string;
  lookbackDays?: number;
  onAcknowledgementChange?: (allAcked: boolean, summary: AckSummary) => void;
  className?: string;
}

export interface AckSummary {
  executedCount: number;
  missedCount: number;
  outstandingCount: number;
  ackedExecuted: string[];
  ackedMissed: string[];
  ackedOutstanding: string[];
  acknowledgedAt: Date;
}

type Bucket = 'executed' | 'missed' | 'outstanding';

export default function PreviousPlansReviewGuard({
  patientId,
  lookbackDays = 30,
  onAcknowledgementChange,
  className = '',
}: Props) {
  const since = useMemo(() => subDays(new Date(), lookbackDays), [lookbackDays]);
  const now = useMemo(() => new Date(), []);

  const sessions = useLiveQuery(
    async () => {
      if (!patientId) return [] as TreatmentSession[];
      const rows = await db.treatmentSessions.where('patientId').equals(patientId).toArray();
      return rows.filter((s) => {
        const sched = new Date(s.scheduledAt);
        // include anything from lookback window OR future outstanding
        return isAfter(sched, since) || s.status === 'scheduled' || s.status === 'in_progress';
      });
    },
    [patientId, lookbackDays],
    [] as TreatmentSession[],
  );

  const buckets = useMemo(() => {
    const executed: TreatmentSession[] = [];
    const missed: TreatmentSession[] = [];
    const outstanding: TreatmentSession[] = [];
    for (const s of sessions) {
      const sched = new Date(s.scheduledAt);
      if (s.status === 'completed') executed.push(s);
      else if (s.status === 'missed') missed.push(s);
      else if (s.status === 'scheduled' || s.status === 'in_progress') {
        // overdue scheduled becomes "missed" visually for review
        if (sched.getTime() + 24 * 60 * 60 * 1000 < now.getTime()) missed.push(s);
        else outstanding.push(s);
      }
    }
    const sortByDate = (a: TreatmentSession, b: TreatmentSession) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    executed.sort(sortByDate);
    missed.sort(sortByDate);
    outstanding.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return { executed, missed, outstanding };
  }, [sessions, now]);

  const totalItems = buckets.executed.length + buckets.missed.length + buckets.outstanding.length;

  // Acknowledgement state: Set of session IDs per bucket
  const [acked, setAcked] = useState<Record<Bucket, Set<string>>>({
    executed: new Set(),
    missed: new Set(),
    outstanding: new Set(),
  });
  const [expanded, setExpanded] = useState<Record<Bucket, boolean>>({
    executed: true,
    missed: true,
    outstanding: true,
  });

  // Scroll sentinels: track whether user has scrolled to bottom of each non-empty list
  const sentinelRefs = useRef<Record<Bucket, HTMLDivElement | null>>({
    executed: null,
    missed: null,
    outstanding: null,
  });
  const [scrolled, setScrolled] = useState<Record<Bucket, boolean>>({
    executed: false,
    missed: false,
    outstanding: false,
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
    Object.entries(sentinelRefs.current).forEach(([, el]) => {
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [buckets.executed.length, buckets.missed.length, buckets.outstanding.length]);

  // Empty buckets count as scrolled by default
  useEffect(() => {
    setScrolled((prev) => ({
      executed: buckets.executed.length === 0 ? true : prev.executed,
      missed: buckets.missed.length === 0 ? true : prev.missed,
      outstanding: buckets.outstanding.length === 0 ? true : prev.outstanding,
    }));
  }, [buckets.executed.length, buckets.missed.length, buckets.outstanding.length]);

  const allAcked = useMemo(() => {
    if (totalItems === 0) return true;
    return (
      acked.executed.size === buckets.executed.length &&
      acked.missed.size === buckets.missed.length &&
      acked.outstanding.size === buckets.outstanding.length
    );
  }, [acked, buckets, totalItems]);

  // Notify parent
  useEffect(() => {
    onAcknowledgementChange?.(allAcked, {
      executedCount: buckets.executed.length,
      missedCount: buckets.missed.length,
      outstandingCount: buckets.outstanding.length,
      ackedExecuted: Array.from(acked.executed),
      ackedMissed: Array.from(acked.missed),
      ackedOutstanding: Array.from(acked.outstanding),
      acknowledgedAt: new Date(),
    });
  }, [allAcked, acked, buckets, onAcknowledgementChange]);

  const toggleItem = (bucket: Bucket, id: string) => {
    setAcked((prev) => {
      const next = new Set(prev[bucket]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [bucket]: next };
    });
  };

  const toggleBucketAll = (bucket: Bucket, items: TreatmentSession[]) => {
    setAcked((prev) => {
      const all = items.length > 0 && prev[bucket].size === items.length;
      return { ...prev, [bucket]: all ? new Set() : new Set(items.map((i) => i.id)) };
    });
  };

  if (totalItems === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2 ${className}`}>
        <ShieldCheck size={16} className="text-gray-400" />
        No previous treatment plan items to review.
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 rounded-xl overflow-hidden ${allAcked ? 'border-green-300' : 'border-amber-300'} ${className}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${allAcked ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className={allAcked ? 'text-green-600' : 'text-amber-600'} />
          <h3 className="font-semibold text-gray-900 text-sm">
            Previous Plan Review {allAcked ? '· Acknowledged' : '· Action Required'}
          </h3>
        </div>
        <span className="text-xs text-gray-600">
          {acked.executed.size + acked.missed.size + acked.outstanding.size} / {totalItems} ticked
        </span>
      </div>
      <div className="p-3 space-y-3">
        <BucketSection
          bucket="executed"
          title="Executed (Completed)"
          items={buckets.executed}
          icon={<CheckCircle2 size={14} className="text-green-600" />}
          color="green"
          expanded={expanded.executed}
          onToggleExpand={() => setExpanded((p) => ({ ...p, executed: !p.executed }))}
          acked={acked.executed}
          onToggleItem={(id) => toggleItem('executed', id)}
          onToggleAll={() => toggleBucketAll('executed', buckets.executed)}
          scrolled={scrolled.executed}
          sentinelRef={(el) => (sentinelRefs.current.executed = el)}
        />
        <BucketSection
          bucket="missed"
          title="Missed / Overdue"
          items={buckets.missed}
          icon={<AlertTriangle size={14} className="text-red-600" />}
          color="red"
          expanded={expanded.missed}
          onToggleExpand={() => setExpanded((p) => ({ ...p, missed: !p.missed }))}
          acked={acked.missed}
          onToggleItem={(id) => toggleItem('missed', id)}
          onToggleAll={() => toggleBucketAll('missed', buckets.missed)}
          scrolled={scrolled.missed}
          sentinelRef={(el) => (sentinelRefs.current.missed = el)}
        />
        <BucketSection
          bucket="outstanding"
          title="Outstanding (Upcoming)"
          items={buckets.outstanding}
          icon={<Clock size={14} className="text-blue-600" />}
          color="blue"
          expanded={expanded.outstanding}
          onToggleExpand={() => setExpanded((p) => ({ ...p, outstanding: !p.outstanding }))}
          acked={acked.outstanding}
          onToggleItem={(id) => toggleItem('outstanding', id)}
          onToggleAll={() => toggleBucketAll('outstanding', buckets.outstanding)}
          scrolled={scrolled.outstanding}
          sentinelRef={(el) => (sentinelRefs.current.outstanding = el)}
        />

        {!allAcked && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Tick every item to confirm you have reviewed the patient's prior plan before saving this encounter.</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface BucketSectionProps {
  bucket: Bucket;
  title: string;
  items: TreatmentSession[];
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue';
  expanded: boolean;
  onToggleExpand: () => void;
  acked: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleAll: () => void;
  scrolled: boolean;
  sentinelRef: (el: HTMLDivElement | null) => void;
}

function BucketSection({
  bucket,
  title,
  items,
  icon,
  color,
  expanded,
  onToggleExpand,
  acked,
  onToggleItem,
  onToggleAll,
  scrolled,
  sentinelRef,
}: BucketSectionProps) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    red: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
  }[color];

  const allTicked = items.length > 0 && acked.size === items.length;

  if (items.length === 0) {
    return (
      <div className={`border rounded-lg ${colorClasses} px-3 py-2 text-xs text-gray-500 flex items-center gap-2`}>
        {icon}
        <span className="font-medium">{title}:</span> none
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${colorClasses}`}>
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-3 py-2 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm text-gray-900">{title}</span>
          <span className="text-xs text-gray-600">({acked.size}/{items.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {!scrolled && (
            <span className="text-[10px] uppercase tracking-wide bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">scroll</span>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="max-h-48 overflow-y-auto bg-white rounded border border-white/60 divide-y divide-gray-100">
            {items.map((item) => {
              const isAcked = acked.has(item.id);
              return (
                <label
                  key={item.id}
                  className="flex items-start gap-2 p-2 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isAcked}
                    onChange={() => onToggleItem(item.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                    aria-label={`Acknowledge ${item.title}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(item.scheduledAt), 'PP p')}
                      {item.category && ` · ${item.category}`}
                      {item.outcome && ` · ${item.outcome}`}
                    </div>
                    {item.notes && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.notes}</div>}
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
