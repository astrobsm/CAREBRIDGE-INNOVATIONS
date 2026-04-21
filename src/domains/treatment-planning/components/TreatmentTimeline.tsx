import React from 'react';
import { format, isToday, isTomorrow, isYesterday, isSameDay } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, MapPin, Mic, ChevronRight } from 'lucide-react';
import type { TreatmentSession } from '../../../types';

export interface TimelineSession extends TreatmentSession {
  voiceNoteCount?: number;
}

interface TreatmentTimelineProps {
  sessions: TimelineSession[];
  onSessionClick?: (s: TimelineSession) => void;
  emptyText?: string;
}

const groupByDay = (sessions: TimelineSession[]): Array<{ day: Date; items: TimelineSession[] }> => {
  const sorted = [...sessions].sort((a, b) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const groups: Array<{ day: Date; items: TimelineSession[] }> = [];
  for (const s of sorted) {
    const d = new Date(s.scheduledAt);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.day, d)) {
      last.items.push(s);
    } else {
      groups.push({ day: d, items: [s] });
    }
  }
  return groups;
};

const dayLabel = (d: Date): string => {
  if (isToday(d)) return `Today · ${format(d, 'EEE, MMM d')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'EEE, MMM d')}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, 'EEE, MMM d')}`;
  return format(d, 'EEEE, MMM d, yyyy');
};

const statusBadge = (s: TimelineSession): { color: string; icon: React.ReactNode; label: string } => {
  switch (s.status) {
    case 'completed':
      return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Completed' };
    case 'missed':
      return { color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Missed' };
    case 'in_progress':
      return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="h-3.5 w-3.5" />, label: 'In progress' };
    case 'rescheduled':
      return { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-3.5 w-3.5" />, label: 'Rescheduled' };
    case 'cancelled':
      return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Clock className="h-3.5 w-3.5" />, label: 'Cancelled' };
    default: {
      const overdue = new Date(s.scheduledAt) < new Date();
      return overdue
        ? { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Overdue' }
        : { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <Clock className="h-3.5 w-3.5" />, label: 'Scheduled' };
    }
  }
};

export const TreatmentTimeline: React.FC<TreatmentTimelineProps> = ({
  sessions,
  onSessionClick,
  emptyText = 'No treatment sessions yet.',
}) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  const groups = groupByDay(sessions);

  return (
    <div className="relative space-y-6">
      {groups.map((group, gi) => (
        <div key={gi} className="relative">
          <div className="sticky top-0 z-[1] mb-3 inline-block rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow">
            {dayLabel(group.day)}
          </div>

          <ol className="relative space-y-3 border-l-2 border-gray-200 pl-5">
            {group.items.map((s) => {
              const badge = statusBadge(s);
              return (
                <li key={s.id} className="relative">
                  <span className="absolute -left-[27px] top-3 h-4 w-4 rounded-full border-2 border-white bg-primary-500 ring-2 ring-primary-200" />
                  <button
                    type="button"
                    onClick={() => onSessionClick?.(s)}
                    className="group flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-primary-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col items-center justify-start text-xs">
                      <span className="font-mono font-semibold text-gray-900">
                        {format(new Date(s.scheduledAt), 'HH:mm')}
                      </span>
                      {s.durationMinutes ? (
                        <span className="text-gray-500">{s.durationMinutes}m</span>
                      ) : null}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{s.title}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.color}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        {s.category && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                            {s.category}
                          </span>
                        )}
                        {(s.voiceNoteCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] text-purple-700">
                            <Mic className="h-3 w-3" /> {s.voiceNoteCount}
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{s.description}</p>
                      )}
                      {s.attendedBy && s.attendedAt && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                          <MapPin className="h-3 w-3" /> Attended {format(new Date(s.attendedAt), 'p')}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-primary-600" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
};

export default TreatmentTimeline;
