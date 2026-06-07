// Family Radio — voice announcer for approaching and missed tasks/routines.
// Calls out each child's first name when their task or routine is due.
//
// Permissions: speech requires a user gesture in some browsers. The Start
// Radio button is the entry point — clicking it counts as a gesture.

import { useMemo } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  AlarmClock,
  AlertTriangle,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { useFamilyCtx } from '../context';
import { useFamilyRadio } from '../hooks/useFamilyRadio';
import type { Announcement, AnnouncementKind } from '../services/familyRadio';

const KIND_META: Record<
  AnnouncementKind,
  { label: string; color: string; icon: React.ReactNode }
> = {
  upcoming_task: {
    label: 'Upcoming task',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: <ListChecks size={14} />,
  },
  missed_task: {
    label: 'Missed task',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: <AlertTriangle size={14} />,
  },
  upcoming_routine: {
    label: 'Upcoming routine',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: <AlarmClock size={14} />,
  },
  missed_routine: {
    label: 'Missed routine',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Sparkles size={14} />,
  },
};

function fmtRelative(mins: number): string {
  if (mins === 0) return 'now';
  const abs = Math.abs(mins);
  if (mins > 0) return `in ${abs} min`;
  return `${abs} min ago`;
}

export default function FamilyRadio() {
  const { parent } = useFamilyCtx();
  const r = useFamilyRadio(parent.id);

  const groupedPending = useMemo(() => {
    const groups: Record<AnnouncementKind, Announcement[]> = {
      upcoming_task: [],
      missed_task: [],
      upcoming_routine: [],
      missed_routine: [],
    };
    for (const a of r.pending) groups[a.kind].push(a);
    return groups;
  }, [r.pending]);

  if (!r.supported) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4">
          <h2 className="font-semibold mb-1">Speech not available</h2>
          <p className="text-sm">
            Your browser does not support the Speech Synthesis API. Try a
            recent version of Chrome, Edge, Safari, or Firefox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* ---------------- Header ---------------- */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Radio size={20} className="text-pink-600" />
          <h1 className="text-lg font-semibold text-gray-900">Family Radio</h1>
          {r.speaking && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
              <Volume2 size={11} /> speaking…
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => r.setEnabled(!r.enabled)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border ${
              r.enabled
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
            }`}
          >
            {r.enabled ? <Pause size={14} /> : <Play size={14} />}
            {r.enabled ? 'Stop Radio' : 'Start Radio'}
          </button>
          <button
            onClick={r.test}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-50"
          >
            <Volume2 size={14} /> Test voice
          </button>
          <button
            onClick={r.refreshNow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {r.lastError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">
          {r.lastError}
        </div>
      )}

      {/* ---------------- Settings ---------------- */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Voice */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Voice</span>
            <select
              value={r.options.voiceURI || ''}
              onChange={(e) =>
                r.updateOptions({ voiceURI: e.target.value || undefined })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5"
            >
              <option value="">System default</option>
              {r.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>

          {/* Lookahead */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">
              Announce upcoming items within (minutes)
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={r.options.lookaheadMinutes}
              onChange={(e) =>
                r.updateOptions({
                  lookaheadMinutes: Math.max(1, Number(e.target.value) || 15),
                })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5"
            />
          </label>

          {/* Cooldown */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">
              Don't repeat the same announcement for (minutes)
            </span>
            <input
              type="number"
              min={1}
              max={720}
              value={r.options.cooldownMinutes}
              onChange={(e) =>
                r.updateOptions({
                  cooldownMinutes: Math.max(1, Number(e.target.value) || 30),
                })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5"
            />
          </label>

          {/* Missed lookback */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">
              Look back for missed items (hours)
            </span>
            <input
              type="number"
              min={1}
              max={48}
              value={r.options.missedLookbackHours}
              onChange={(e) =>
                r.updateOptions({
                  missedLookbackHours: Math.max(1, Number(e.target.value) || 12),
                })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5"
            />
          </label>

          {/* Rate / Pitch / Volume */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">
              Speech rate · {r.options.rate.toFixed(2)}
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={r.options.rate}
              onChange={(e) =>
                r.updateOptions({ rate: Number(e.target.value) })
              }
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">
              Pitch · {r.options.pitch.toFixed(2)}
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={r.options.pitch}
              onChange={(e) =>
                r.updateOptions({ pitch: Number(e.target.value) })
              }
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">
              Volume · {Math.round(r.options.volume * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={r.options.volume}
              onChange={(e) =>
                r.updateOptions({ volume: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-medium text-gray-600 mb-2">
            Announce which kinds of items?
          </h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                'upcoming_task',
                'missed_task',
                'upcoming_routine',
                'missed_routine',
              ] as AnnouncementKind[]
            ).map((k) => (
              <label
                key={k}
                className="inline-flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-md"
              >
                <input
                  type="checkbox"
                  checked={r.options.enabled[k]}
                  onChange={(e) => r.updateEnabledKind(k, e.target.checked)}
                />
                <span className="inline-flex items-center gap-1">
                  {KIND_META[k].icon} {KIND_META[k].label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
          {r.lastPolledAt && (
            <span>
              Last scan: {new Date(r.lastPolledAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={r.resetCooldowns}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            <VolumeX size={12} /> Reset cooldowns
          </button>
        </div>
      </div>

      {/* ---------------- Pending queue ---------------- */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">
            Currently pending ({r.pending.length})
          </h2>
        </div>

        {r.pending.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Nothing to announce right now. The radio will scan again every
            minute.
          </div>
        ) : (
          <div className="space-y-4">
            {(
              [
                'missed_task',
                'missed_routine',
                'upcoming_task',
                'upcoming_routine',
              ] as AnnouncementKind[]
            ).map((kind) => {
              const items = groupedPending[kind];
              if (items.length === 0) return null;
              const meta = KIND_META[kind];
              return (
                <div key={kind}>
                  <h3
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium mb-2 ${meta.color}`}
                  >
                    {meta.icon} {meta.label} · {items.length}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((a) => (
                      <li
                        key={a.id}
                        className="border border-gray-200 rounded-md p-2 flex flex-wrap items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {a.title}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {a.childNames.join(', ')} ·{' '}
                            {fmtRelative(a.minutesAway)}
                          </div>
                        </div>
                        <button
                          onClick={() => r.speakOne(a)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                        >
                          <Volume2 size={12} /> Speak
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- Spoken log ---------------- */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">
            Spoken log ({r.log.length})
          </h2>
          {r.log.length > 0 && (
            <button
              onClick={r.clearLog}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
        {r.log.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No announcements yet.</div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {r.log.map((entry, ix) => (
              <li
                key={`${entry.id}-${entry.spokenAt}-${ix}`}
                className="flex flex-wrap items-baseline gap-2 border-b border-gray-100 pb-1.5 last:border-b-0"
              >
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(entry.spokenAt).toLocaleTimeString()}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${KIND_META[entry.kind].color}`}
                >
                  {KIND_META[entry.kind].label}
                </span>
                <span className="text-gray-800 flex-1 min-w-0">{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
