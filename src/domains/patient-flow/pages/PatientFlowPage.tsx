import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Users, BedDouble, LogOut, Activity, Clock, AlertTriangle,
  CheckCircle, Calendar, Plus, Volume2, RefreshCw, Search, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict, differenceInMinutes, isToday } from 'date-fns';
import { db } from '../../../database';
import { TreatmentSessionOps } from '../../../database/operations';
import { playChime, unlockAudio } from '../../../utils/audioChime';
import type { Patient, TreatmentSession, Admission, Appointment } from '../../../types';

type FlowTab = 'overview' | 'outpatient' | 'inpatient' | 'timer-board';

/**
 * PATIENT FLOW (Outpatient + Inpatient) — replaces legacy ADTPage.
 *
 * Unified board for:
 *   • Today's outpatient queue (appointments + walk-ins)
 *   • Live inpatient roster (admissions/discharges)
 *   • Treatment-plan Timer Board — live countdowns with colour-coded status:
 *       UPCOMING (yellow) → DUE NOW (green) → OVERDUE (red)
 *     Each row's "radio announcement" (toast + chime) fires automatically
 *     via treatmentReminderService running in the background.
 *
 * Per-session lead time is editable inline (default 15 min).
 */
export default function PatientFlowPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FlowTab>('overview');
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(Date.now());

  // Tick every 15s for countdown re-render
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Live data
  const patients = useLiveQuery(() => db.patients.toArray(), []) || [];
  const admissions = useLiveQuery(() => db.admissions.toArray(), []) || [];
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) || [];
  const sessions = useLiveQuery(
    () => db.treatmentSessions.where('status').anyOf(['scheduled', 'in_progress']).toArray(),
    []
  ) || [];

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach(p => m.set(p.id!, p));
    return m;
  }, [patients]);

  const patientName = (id: string) => {
    const p = patientMap.get(id);
    if (!p) return 'Unknown patient';
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.hospitalNumber || 'Patient';
  };

  // Derived sets
  const activeAdmissions = useMemo(
    () => admissions.filter((a: Admission) => a.status === 'active'),
    [admissions]
  );
  const todayAppointments = useMemo(
    () => appointments.filter((a: Appointment) =>
      a.appointmentDate && isToday(new Date(a.appointmentDate))
    ),
    [appointments]
  );

  // Bucket sessions by status (upcoming / due / overdue) for the timer board
  const bucketed = useMemo(() => {
    const upcoming: TreatmentSession[] = [];
    const due: TreatmentSession[] = [];
    const overdue: TreatmentSession[] = [];
    sessions.forEach(s => {
      const lead = (s.reminderMinutesBefore?.[0] ?? 15) * 60_000;
      const t = new Date(s.scheduledAt).getTime();
      const upStart = t - lead;
      const overdueAt = t + 5 * 60_000;
      if (now >= overdueAt && s.status === 'scheduled') overdue.push(s);
      else if (now >= t) due.push(s);
      else if (now >= upStart) upcoming.push(s);
      else upcoming.push(s); // still listed as upcoming until lead-window
    });
    const sortByTime = (a: TreatmentSession, b: TreatmentSession) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    return {
      overdue: overdue.sort(sortByTime),
      due: due.sort(sortByTime),
      upcoming: upcoming.sort(sortByTime),
    };
  }, [sessions, now]);

  const stats = {
    inpatients: activeAdmissions.length,
    appointmentsToday: todayAppointments.length,
    sessionsToday: sessions.filter(s => isToday(new Date(s.scheduledAt))).length,
    overdueCount: bucketed.overdue.length,
    dueCount: bucketed.due.length,
  };

  const handleLeadTimeChange = async (sessionId: string, leadMin: number) => {
    try {
      await TreatmentSessionOps.update(sessionId, { reminderMinutesBefore: [leadMin] });
      toast.success(`Lead time set to ${leadMin} min`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update lead time');
    }
  };

  const handleAcknowledge = async (sessionId: string) => {
    try {
      await TreatmentSessionOps.update(sessionId, {
        status: 'completed',
        attendedAt: new Date(),
      });
      toast.success('Marked as completed');
    } catch {
      toast.error('Failed to acknowledge');
    }
  };

  const handleTestChime = () => {
    unlockAudio();
    playChime('due');
    toast('Test chime played', { icon: '🔔' });
  };

  // -------------- RENDER --------------
  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            Patient Flow
          </h1>
          <p className="page-subtitle">Outpatient queue · Inpatient roster · Treatment Timer Board with radio announcements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestChime}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Test radio chime"
          >
            <Volume2 size={16} /> Test Chime
          </button>
          <Link
            to="/adt-legacy"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Legacy ADT
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <StatCard icon={<BedDouble className="w-5 h-5" />} label="Inpatients" value={stats.inpatients} color="indigo" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Appts Today" value={stats.appointmentsToday} color="blue" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Sessions Today" value={stats.sessionsToday} color="teal" />
        <StatCard icon={<Bell className="w-5 h-5" />} label="Due Now" value={stats.dueCount} color="green" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Overdue" value={stats.overdueCount} color="red" />
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'outpatient', label: 'Outpatient', icon: Users },
            { id: 'inpatient', label: 'Inpatient', icon: BedDouble },
            { id: 'timer-board', label: `Timer Board${stats.overdueCount ? ` (${stats.overdueCount}!)` : ''}`, icon: Clock },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as FlowTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      {(activeTab === 'outpatient' || activeTab === 'inpatient') && (
        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name or number..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      )}

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <OverviewTab
            overdue={bucketed.overdue}
            due={bucketed.due}
            upcoming={bucketed.upcoming.slice(0, 5)}
            patientName={patientName}
            onAck={handleAcknowledge}
            onJumpTimer={() => setActiveTab('timer-board')}
            onJumpInpatient={() => setActiveTab('inpatient')}
            onJumpOutpatient={() => setActiveTab('outpatient')}
            inpatientCount={stats.inpatients}
            outpatientCount={stats.appointmentsToday}
          />
        )}

        {activeTab === 'outpatient' && (
          <OutpatientTab
            appointments={todayAppointments}
            patientMap={patientMap}
            search={search}
            navigate={navigate}
          />
        )}

        {activeTab === 'inpatient' && (
          <InpatientTab
            admissions={activeAdmissions}
            patientMap={patientMap}
            search={search}
            navigate={navigate}
          />
        )}

        {activeTab === 'timer-board' && (
          <TimerBoardTab
            overdue={bucketed.overdue}
            due={bucketed.due}
            upcoming={bucketed.upcoming}
            now={now}
            patientName={patientName}
            onAck={handleAcknowledge}
            onLeadTimeChange={handleLeadTimeChange}
          />
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────── COMPONENTS ───────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'indigo' | 'blue' | 'teal' | 'green' | 'red';
}
function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses: Record<StatCardProps['color'], string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    teal:   'bg-teal-50 text-teal-700 border-teal-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-80">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

interface OverviewTabProps {
  overdue: TreatmentSession[];
  due: TreatmentSession[];
  upcoming: TreatmentSession[];
  patientName: (id: string) => string;
  onAck: (id: string) => void;
  onJumpTimer: () => void;
  onJumpInpatient: () => void;
  onJumpOutpatient: () => void;
  inpatientCount: number;
  outpatientCount: number;
}
function OverviewTab({ overdue, due, upcoming, patientName, onAck, onJumpTimer, onJumpInpatient, onJumpOutpatient, inpatientCount, outpatientCount }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {(overdue.length > 0 || due.length > 0) && (
        <div className="bg-gradient-to-r from-red-50 to-amber-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle size={18} />
              Attention needed — {overdue.length} overdue, {due.length} due now
            </h2>
            <button onClick={onJumpTimer} className="text-sm text-red-700 underline">
              Open Timer Board →
            </button>
          </div>
          <div className="space-y-2">
            {[...overdue.slice(0, 3), ...due.slice(0, 3)].map(s => (
              <SessionRow key={s.id} session={s} patientName={patientName(s.patientId)} onAck={onAck} kind={overdue.includes(s) ? 'overdue' : 'due'} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onJumpOutpatient}
          className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-900">Outpatient Queue</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-700">{outpatientCount}</div>
          <div className="text-xs text-gray-500">appointments today</div>
        </button>

        <button
          onClick={onJumpInpatient}
          className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-900">Inpatient Roster</span>
            <BedDouble className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-bold text-indigo-700">{inpatientCount}</div>
          <div className="text-xs text-gray-500">active admissions</div>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Next Up — Treatment Sessions
          </h3>
          <button onClick={onJumpTimer} className="text-xs text-primary-600 hover:underline">View all</button>
        </div>
        <div className="divide-y divide-gray-100">
          {upcoming.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No scheduled sessions.</div>
          ) : (
            upcoming.map(s => (
              <SessionRow key={s.id} session={s} patientName={patientName(s.patientId)} onAck={onAck} kind="upcoming" compact />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: TreatmentSession;
  patientName: string;
  onAck: (id: string) => void;
  kind: 'upcoming' | 'due' | 'overdue';
  compact?: boolean;
}
function SessionRow({ session, patientName, onAck, kind, compact }: SessionRowProps) {
  const time = format(new Date(session.scheduledAt), 'HH:mm');
  const rel = formatDistanceToNowStrict(new Date(session.scheduledAt), { addSuffix: true });
  const colorMap = {
    overdue: 'border-l-red-500 bg-red-50',
    due: 'border-l-green-500 bg-green-50',
    upcoming: 'border-l-yellow-400 bg-yellow-50',
  };
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 border-l-4 ${colorMap[kind]} ${compact ? '' : 'rounded'}`}>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 text-sm truncate">{patientName}</div>
        <div className="text-xs text-gray-600 truncate">{session.title} · {time} · <span className="italic">{rel}</span></div>
      </div>
      <button
        onClick={() => onAck(session.id)}
        className="flex-shrink-0 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
        title="Mark completed"
      >
        <CheckCircle size={12} /> Done
      </button>
    </div>
  );
}

interface OutpatientTabProps {
  appointments: Appointment[];
  patientMap: Map<string, Patient>;
  search: string;
  navigate: (path: string) => void;
}
function OutpatientTab({ appointments, patientMap, search, navigate }: OutpatientTabProps) {
  const filtered = useMemo(() => {
    return appointments
      .filter(a => {
        if (!search) return true;
        const p = patientMap.get(a.patientId);
        const q = search.toLowerCase();
        return (
          p?.firstName?.toLowerCase().includes(q) ||
          p?.lastName?.toLowerCase().includes(q) ||
          p?.hospitalNumber?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  }, [appointments, patientMap, search]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Today's Appointments ({filtered.length})</h2>
        <Link
          to="/appointments/new"
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={14} /> New Appointment
        </Link>
      </div>
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">No appointments scheduled for today.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map(a => {
            const p = patientMap.get(a.patientId);
            const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : 'Unknown';
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/patients/${a.patientId}`)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">{name}</div>
                  <div className="text-xs text-gray-600">
                    {format(new Date(a.appointmentDate), 'HH:mm')} · {a.type ?? 'consultation'} · {a.status}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  a.status === 'completed' ? 'bg-green-100 text-green-700' :
                  a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {a.status}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface InpatientTabProps {
  admissions: Admission[];
  patientMap: Map<string, Patient>;
  search: string;
  navigate: (path: string) => void;
}
function InpatientTab({ admissions, patientMap, search, navigate }: InpatientTabProps) {
  const filtered = useMemo(() => {
    return admissions
      .filter(a => {
        if (!search) return true;
        const p = patientMap.get(a.patientId);
        const q = search.toLowerCase();
        return (
          p?.firstName?.toLowerCase().includes(q) ||
          p?.lastName?.toLowerCase().includes(q) ||
          p?.hospitalNumber?.toLowerCase().includes(q) ||
          a.admissionNumber?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
  }, [admissions, patientMap, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Active Inpatients ({filtered.length})</h2>
        <div className="flex gap-2">
          <Link
            to="/admissions/new"
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={14} /> Admit
          </Link>
          <Link
            to="/discharge"
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            <LogOut size={14} /> Discharge
          </Link>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500 bg-white border rounded-lg">
          No active admissions.
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(a => {
            const p = patientMap.get(a.patientId);
            const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : 'Unknown';
            const days = Math.max(0, Math.floor((Date.now() - new Date(a.admissionDate).getTime()) / 86_400_000));
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/patients/${a.patientId}`)}
                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-xs text-gray-600">
                      {a.admissionNumber ?? '—'} · {a.wardType ?? 'ward'} · Day {days + 1}
                      {a.severity && a.severity !== 'stable' && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded ${
                          a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          a.severity === 'serious' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{a.severity}</span>
                      )}
                    </div>
                  </div>
                  <BedDouble className="w-5 h-5 text-indigo-500" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TimerBoardTabProps {
  overdue: TreatmentSession[];
  due: TreatmentSession[];
  upcoming: TreatmentSession[];
  now: number;
  patientName: (id: string) => string;
  onAck: (id: string) => void;
  onLeadTimeChange: (id: string, min: number) => void;
}
function TimerBoardTab({ overdue, due, upcoming, now, patientName, onAck, onLeadTimeChange }: TimerBoardTabProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <RefreshCw className="w-3 h-3" />
        Auto-refreshes every 15s · radio announcements fire automatically (toast + chime) at lead-time, due, and +5 min overdue
      </div>

      {overdue.length > 0 && (
        <BoardSection title="Overdue" count={overdue.length} accent="red">
          {overdue.map(s => (
            <TimerCard key={s.id} session={s} now={now} patientName={patientName(s.patientId)} kind="overdue" onAck={onAck} onLeadTimeChange={onLeadTimeChange} />
          ))}
        </BoardSection>
      )}

      {due.length > 0 && (
        <BoardSection title="Due Now" count={due.length} accent="green">
          {due.map(s => (
            <TimerCard key={s.id} session={s} now={now} patientName={patientName(s.patientId)} kind="due" onAck={onAck} onLeadTimeChange={onLeadTimeChange} />
          ))}
        </BoardSection>
      )}

      <BoardSection title="Upcoming" count={upcoming.length} accent="yellow">
        {upcoming.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-6">No upcoming sessions.</div>
        ) : (
          upcoming.map(s => (
            <TimerCard key={s.id} session={s} now={now} patientName={patientName(s.patientId)} kind="upcoming" onAck={onAck} onLeadTimeChange={onLeadTimeChange} />
          ))
        )}
      </BoardSection>
    </div>
  );
}

function BoardSection({ title, count, accent, children }: { title: string; count: number; accent: 'red'|'green'|'yellow'; children: React.ReactNode }) {
  const colorMap = {
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colorMap[accent]}`}>{count}</span>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}

interface TimerCardProps {
  session: TreatmentSession;
  now: number;
  patientName: string;
  kind: 'upcoming' | 'due' | 'overdue';
  onAck: (id: string) => void;
  onLeadTimeChange: (id: string, min: number) => void;
}
function TimerCard({ session, now, patientName, kind, onAck, onLeadTimeChange }: TimerCardProps) {
  const t = new Date(session.scheduledAt).getTime();
  const diffMin = Math.round((t - now) / 60_000);
  const lead = session.reminderMinutesBefore?.[0] ?? 15;
  const countdown = kind === 'overdue'
    ? `${Math.abs(differenceInMinutes(now, t))} min overdue`
    : kind === 'due'
      ? 'Due NOW'
      : diffMin > 60
        ? `in ${Math.floor(diffMin / 60)}h ${diffMin % 60}m`
        : `in ${diffMin} min`;

  const colorMap = {
    overdue: 'border-l-red-500',
    due: 'border-l-green-500',
    upcoming: 'border-l-yellow-400',
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-l-4 ${colorMap[kind]}`}>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 text-sm">{patientName}</div>
        <div className="text-xs text-gray-600 truncate">
          {session.title}
          {session.category && <span className="ml-1 text-gray-400">· {session.category}</span>}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {format(new Date(session.scheduledAt), 'EEE HH:mm')} · <span className={
            kind === 'overdue' ? 'text-red-600 font-semibold' :
            kind === 'due' ? 'text-green-700 font-semibold' :
            'text-gray-700'
          }>{countdown}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <label className="text-xs text-gray-600 flex items-center gap-1">
          Lead
          <select
            value={lead}
            onChange={(e) => onLeadTimeChange(session.id, Number(e.target.value))}
            className="text-xs border border-gray-300 rounded px-1 py-0.5"
            title="Lead time in minutes"
          >
            {[5, 10, 15, 30, 60, 120].map(m => <option key={m} value={m}>{m}m</option>)}
          </select>
        </label>
        <button
          onClick={() => onAck(session.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
        >
          <CheckCircle size={12} /> Done
        </button>
      </div>
    </div>
  );
}
