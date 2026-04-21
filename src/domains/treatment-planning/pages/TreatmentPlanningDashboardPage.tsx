import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Calendar, AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../../database';
import type { TreatmentPlan, TreatmentSession, Patient } from '../../../types';

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string }> = ({
  icon, label, value, color,
}) => (
  <div className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}>
    <div className="rounded-lg bg-white/60 p-2">{icon}</div>
    <div>
      <div className="text-2xl font-semibold leading-none">{value}</div>
      <div className="text-xs uppercase tracking-wide opacity-75">{label}</div>
    </div>
  </div>
);

const TreatmentPlanningDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const plans = useLiveQuery(() => db.treatmentPlans.reverse().sortBy('createdAt'), []) as TreatmentPlan[] | undefined;
  const sessions = useLiveQuery(() => db.treatmentSessions.toArray(), []) as TreatmentSession[] | undefined;
  const patients = useLiveQuery(() => db.patients.toArray(), []) as Patient[] | undefined;

  const patientById = useMemo(() => {
    const m = new Map<string, Patient>();
    (patients || []).forEach(p => m.set(p.id, p));
    return m;
  }, [patients]);

  const now = new Date();
  const stats = useMemo(() => {
    const all = sessions || [];
    const upcoming = all.filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) > now).length;
    const overdue = all.filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) <= now).length;
    const completed = all.filter(s => s.status === 'completed').length;
    const missed = all.filter(s => s.status === 'missed').length;
    return { upcoming, overdue, completed, missed, totalPlans: (plans || []).length };
  }, [sessions, plans, now]);

  const upcomingSessions = useMemo(() => {
    return (sessions || [])
      .filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) > now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 8);
  }, [sessions, now]);

  const overdueSessions = useMemo(() => {
    return (sessions || [])
      .filter(s => (s.status === 'scheduled' && new Date(s.scheduledAt) <= now) || s.status === 'missed')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
      .slice(0, 8);
  }, [sessions, now]);

  const patientLabel = (id: string) => {
    const p = patientById.get(id);
    if (!p) return 'Unknown patient';
    return `${p.firstName} ${p.lastName} · ${p.hospitalNumber}`;
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Planning</h1>
          <p className="text-sm text-gray-500">Schedule, track, and get push reminders for every treatment session.</p>
        </div>
        <Link
          to="/treatment-planning/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> New treatment plan
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatBox icon={<Calendar className="h-5 w-5 text-indigo-700" />} label="Plans" value={stats.totalPlans} color="border-indigo-200 bg-indigo-50 text-indigo-900" />
        <StatBox icon={<Clock className="h-5 w-5 text-blue-700" />} label="Upcoming" value={stats.upcoming} color="border-blue-200 bg-blue-50 text-blue-900" />
        <StatBox icon={<AlertTriangle className="h-5 w-5 text-orange-700" />} label="Overdue" value={stats.overdue} color="border-orange-200 bg-orange-50 text-orange-900" />
        <StatBox icon={<AlertTriangle className="h-5 w-5 text-red-700" />} label="Missed" value={stats.missed} color="border-red-200 bg-red-50 text-red-900" />
        <StatBox icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />} label="Completed" value={stats.completed} color="border-emerald-200 bg-emerald-50 text-emerald-900" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Bell className="h-4 w-4 text-blue-600" /> Upcoming sessions
            </h2>
            <span className="text-xs text-gray-500">Next {upcomingSessions.length}</span>
          </header>
          {upcomingSessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No upcoming sessions.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingSessions.map(s => (
                <li
                  key={s.id}
                  onClick={() => navigate(`/treatment-planning/${s.treatmentPlanId}?session=${s.id}`)}
                  className="cursor-pointer rounded-lg border border-gray-100 px-3 py-2 hover:border-primary-300 hover:bg-primary-50/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-500">{patientLabel(s.patientId)}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-blue-700">{format(new Date(s.scheduledAt), 'MMM d, HH:mm')}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-orange-600" /> Overdue / unattended
            </h2>
            <span className="text-xs text-gray-500">Past {overdueSessions.length}</span>
          </header>
          {overdueSessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nothing overdue. Great work!</p>
          ) : (
            <ul className="space-y-2">
              {overdueSessions.map(s => (
                <li
                  key={s.id}
                  onClick={() => navigate(`/treatment-planning/${s.treatmentPlanId}?session=${s.id}`)}
                  className="cursor-pointer rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-2 hover:border-orange-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{s.title}</div>
                      <div className="text-xs text-gray-600">{patientLabel(s.patientId)}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-orange-700">{format(new Date(s.scheduledAt), 'MMM d, HH:mm')}</div>
                      <div className="text-[10px] uppercase tracking-wide text-orange-600">{s.status}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">All treatment plans</h2>
        </header>
        {(plans || []).length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No treatment plans yet. Create one to begin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Title</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Patient</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Start</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Sessions</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(plans || []).map(p => {
                  const planSessions = (sessions || []).filter(s => s.treatmentPlanId === p.id);
                  const completed = planSessions.filter(s => s.status === 'completed').length;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{p.title}</td>
                      <td className="px-3 py-2 text-gray-700">{patientLabel(p.patientId)}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{p.status}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{format(new Date(p.startDate), 'MMM d, yyyy')}</td>
                      <td className="px-3 py-2 text-gray-600">{completed} / {planSessions.length}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          to={`/treatment-planning/${p.id}`}
                          className="text-primary-600 hover:underline"
                        >
                          View timeline
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default TreatmentPlanningDashboardPage;
