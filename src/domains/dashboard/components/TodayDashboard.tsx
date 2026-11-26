/**
 * "Today": the clinic home screen. What is on today, what slipped, what is
 * waiting, and the three things done most often. Selectors live in ../today.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CalendarDays, UserPlus, Search, AlertTriangle, TestTube2, Scissors, Users, ChevronRight, Clock,
} from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient } from '../../../types';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import {
  todaysAppointments, overdueFollowUps, pendingResults, theatreList, recentRegistrations,
  activePatientCount, appointmentStart,
} from '../today';

const label = (s?: string) => (s || '').replace(/[_-]+/g, ' ').replace(/^\w/, c => c.toUpperCase());
const fullName = (p?: Patient) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed patient' : 'Unknown patient');

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function Section({ title, icon, count, href, hrefLabel = 'View all', children, empty }: {
  title: string; icon: ReactNode; count?: number; href?: string; hrefLabel?: string; children?: ReactNode; empty: string;
}) {
  const hasItems = (count ?? 0) > 0;
  return (
    <section className="card card-compact" aria-label={title}>
      <div className="card-header flex items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{title}</span>
          {count !== undefined && <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>}
        </h2>
        {href && <Link to={href} className="text-sm text-sky-600 hover:text-sky-700 whitespace-nowrap">{hrefLabel}</Link>}
      </div>
      {hasItems ? <ul className="divide-y divide-gray-100">{children}</ul> : <p className="px-4 sm:px-6 py-4 text-sm text-gray-500">{empty}</p>}
    </section>
  );
}

function Row({ to, primary, secondary, right, tone }: {
  to: string; primary: ReactNode; secondary?: ReactNode; right?: ReactNode; tone?: 'amber' | 'red';
}) {
  return (
    <li>
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
          tone === 'red' ? 'border-l-4 border-red-300' : tone === 'amber' ? 'border-l-4 border-amber-300' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{primary}</p>
          {secondary && <p className="text-sm text-gray-500 truncate">{secondary}</p>}
        </div>
        {right && <div className="text-xs text-gray-500 text-right whitespace-nowrap">{right}</div>}
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" aria-hidden="true" />
      </Link>
    </li>
  );
}

const LIMIT = 8;

export default function TodayDashboard() {
  const { user } = useAuth();
  // Re-evaluate the day boundaries every minute (a phone left open overnight).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const appointments = useLiveQuery(() => db.appointments.toArray(), []);
  const investigations = useLiveQuery(() => db.investigations.toArray(), []);
  const labRequests = useLiveQuery(() => db.labRequests.toArray(), []);
  const surgeries = useLiveQuery(() => db.surgeries.toArray(), []);

  const byId = useMemo(() => new Map((patients ?? []).map(p => [p.id, p])), [patients]);
  const today = useMemo(() => todaysAppointments(appointments ?? [], now), [appointments, now]);
  const overdue = useMemo(() => overdueFollowUps(appointments ?? [], now), [appointments, now]);
  const pending = useMemo(() => pendingResults(investigations ?? [], labRequests ?? []), [investigations, labRequests]);
  const theatre = useMemo(() => theatreList(surgeries ?? [], now), [surgeries, now]);
  const fresh = useMemo(() => recentRegistrations(patients ?? [], now), [patients, now]);
  const active = activePatientCount(patients ?? []);
  const loading = patients === undefined || appointments === undefined;

  const stats = [
    { name: 'Active patients', value: active, to: '/patients', icon: <Users size={18} />, color: 'text-sky-600 bg-sky-50' },
    { name: "Today's appointments", value: today.length, to: '/appointments', icon: <CalendarDays size={18} />, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Overdue follow-ups', value: overdue.length, to: '#overdue', icon: <AlertTriangle size={18} />, color: 'text-amber-600 bg-amber-50' },
    { name: 'Pending results', value: pending.length, to: '#pending-results', icon: <TestTube2 size={18} />, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">Today</h1>
          <p className="page-subtitle">
            {greeting(now)}{user?.firstName ? `, ${user.firstName}` : ''} · {formatDate(now)}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Link to="/patients/new" className="flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 bg-sky-600 text-white rounded-xl hover:bg-sky-700 text-center min-h-[72px]">
          <UserPlus size={22} aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium leading-tight">New patient</span>
        </Link>
        <Link to="/appointments/new" className="flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 bg-emerald-50 text-emerald-800 rounded-xl hover:bg-emerald-100 text-center min-h-[72px]">
          <CalendarDays size={22} aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium leading-tight">Book appointment</span>
        </Link>
        <Link to="/patients?focus=search" className="flex flex-col items-center justify-center gap-1.5 p-3 sm:p-4 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 text-center min-h-[72px]">
          <Search size={22} aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium leading-tight">Find patient</span>
        </Link>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {stats.map(s => {
          const body = (
            <>
              <span className={`p-2 rounded-lg ${s.color}`} aria-hidden="true">{s.icon}</span>
              <span className="min-w-0">
                <span className="block text-xl font-bold text-gray-900 leading-none">{loading ? '…' : s.value}</span>
                <span className="block text-xs text-gray-500 mt-1 leading-tight">{s.name}</span>
              </span>
            </>
          );
          const cls = 'flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300';
          return s.to.startsWith('#')
            ? <a key={s.name} href={s.to} className={cls}>{body}</a>
            : <Link key={s.name} to={s.to} className={cls}>{body}</Link>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section
          title="Today's appointments" icon={<CalendarDays size={18} className="text-emerald-600" />}
          count={today.length} href="/appointments" empty="No appointments today."
        >
          {today.slice(0, LIMIT * 2).map(a => {
            const p = byId.get(a.patientId);
            const done = a.status === 'completed' || a.status === 'no_show';
            return (
              <Row
                key={a.id}
                to={`/patients/${a.patientId}`}
                primary={<><span className="tabular-nums text-gray-600 mr-2">{a.appointmentTime || '--:--'}</span>{fullName(p)}</>}
                secondary={[label(a.type), a.reasonForVisit].filter(Boolean).join(' · ')}
                right={<span className={done ? 'text-gray-400' : a.status === 'checked_in' || a.status === 'in_progress' ? 'text-emerald-600 font-medium' : ''}>{label(a.status)}</span>}
              />
            );
          })}
        </Section>

        <div id="overdue">
          <Section
            title="Overdue follow-ups" icon={<AlertTriangle size={18} className="text-amber-600" />}
            count={overdue.length} href="/appointments" empty="No missed follow-ups in the last 30 days."
          >
            {overdue.slice(0, LIMIT).map(o => {
              const a = o.appointment;
              const p = byId.get(a.patientId);
              const start = appointmentStart(a);
              return (
                <Row
                  key={a.id}
                  to={`/patients/${a.patientId}`}
                  tone={o.reason === 'no_show' ? 'red' : 'amber'}
                  primary={fullName(p)}
                  secondary={`${label(a.type)} · ${formatDate(start)}${p?.phone ? ` · ${p.phone}` : ''}`}
                  right={<>{o.reason === 'no_show' ? 'No-show' : 'Not seen'}<br />{o.daysAgo === 1 ? '1 day ago' : `${o.daysAgo} days ago`}</>}
                />
              );
            })}
          </Section>
        </div>

        <Section
          title="Theatre: today and next 7 days" icon={<Scissors size={18} className="text-purple-600" />}
          count={theatre.length} href="/surgery" hrefLabel="Surgery list" empty="Nothing booked for theatre this week."
        >
          {theatre.slice(0, LIMIT).map(s => (
            <Row
              key={s.id}
              to={`/patients/${s.patientId}?tab=surgery`}
              primary={s.procedureName || 'Procedure'}
              secondary={fullName(byId.get(s.patientId))}
              right={<>{formatDateTime(s.scheduledDate)}<br />{label(s.status)}</>}
              tone={s.status === 'incomplete_preparation' ? 'amber' : undefined}
            />
          ))}
        </Section>

        <div id="pending-results">
          <Section
            title="Pending results" icon={<TestTube2 size={18} className="text-violet-600" />}
            count={pending.length} href="/investigations" empty="No results outstanding."
          >
            {pending.slice(0, LIMIT).map(r => (
              <Row
                key={`${r.source}-${r.id}`}
                to={r.href}
                primary={r.name}
                secondary={fullName(byId.get(r.patientId))}
                right={<>{r.priority && r.priority !== 'routine' ? <span className="text-red-600 font-medium uppercase">{r.priority} · </span> : null}{formatDate(r.requestedAt)}</>}
              />
            ))}
          </Section>
        </div>

        <Section
          title="New patients (7 days)" icon={<UserPlus size={18} className="text-sky-600" />}
          count={fresh.length} href="/patients" empty="No new registrations this week."
        >
          {fresh.slice(0, LIMIT).map(p => (
            <Row
              key={p.id}
              to={`/patients/${p.id}`}
              primary={fullName(p)}
              secondary={[p.hospitalNumber, p.phone].filter(Boolean).join(' · ')}
              right={<><Clock size={12} className="inline mr-1" aria-hidden="true" />{formatDate(p.createdAt)}</>}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}
