import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, CheckCircle2, Clock, Mic, AlertTriangle, Bell, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import type { TreatmentPlan, TreatmentSession, TreatmentVoiceNote, Patient } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  TreatmentSessionOps,
  TreatmentVoiceNoteOps,
} from '../../../database/operations';
import {
  rescheduleSession,
  scheduleRemindersForSession,
  attachVoiceNote,
} from '../../../services/treatmentSchedulerService';
import TreatmentTimeline from '../components/TreatmentTimeline';
import VoiceRecorder from '../components/VoiceRecorder';

const TreatmentPlanDetailPage: React.FC = () => {
  const { planId = '' } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedSessionId = searchParams.get('session');
  const { user } = useAuth();

  const plan = useLiveQuery(() => db.treatmentPlans.get(planId), [planId]) as TreatmentPlan | undefined;
  const sessions = useLiveQuery(
    () => db.treatmentSessions.where('treatmentPlanId').equals(planId).sortBy('scheduledAt'),
    [planId]
  ) as TreatmentSession[] | undefined;
  const patient = useLiveQuery(
    () => (plan ? db.patients.get(plan.patientId) : undefined),
    [plan?.patientId]
  ) as Patient | undefined;
  const voiceNotes = useLiveQuery(
    () => db.treatmentVoiceNotes.where('treatmentPlanId').equals(planId).reverse().sortBy('recordedAt'),
    [planId]
  ) as TreatmentVoiceNote[] | undefined;

  const focusedSession = useMemo(
    () => (sessions || []).find(s => s.id === focusedSessionId) || null,
    [sessions, focusedSessionId]
  );

  const focusedVoiceNoteId = searchParams.get('voiceNote');
  const focusedVoiceNote = useMemo(
    () => (voiceNotes || []).find(v => v.id === focusedVoiceNoteId) || null,
    [voiceNotes, focusedVoiceNoteId]
  );

  React.useEffect(() => {
    if (focusedVoiceNote?.audioDataUrl) {
      const audio = new Audio(focusedVoiceNote.audioDataUrl);
      audio.play().catch(() => { /* autoplay may be blocked, user can press play */ });
    }
  }, [focusedVoiceNote?.id]);

  const [activeSession, setActiveSession] = useState<TreatmentSession | null>(focusedSession);
  React.useEffect(() => {
    if (focusedSession) setActiveSession(focusedSession);
  }, [focusedSession]);

  const [notes, setNotes] = useState('');
  const [showVoice, setShowVoice] = useState(false);

  const voiceCountBySession = useMemo(() => {
    const m = new Map<string, number>();
    (voiceNotes || []).forEach(v => {
      if (v.treatmentSessionId) m.set(v.treatmentSessionId, (m.get(v.treatmentSessionId) || 0) + 1);
    });
    return m;
  }, [voiceNotes]);

  if (!plan) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <p className="text-gray-500">Treatment plan not found.</p>
      </div>
    );
  }

  const handleAttend = async () => {
    if (!activeSession || !user) return;
    await TreatmentSessionOps.markAttended(activeSession.id, user.id, notes || undefined);
    toast.success('Session marked as completed');
    setNotes('');
    setActiveSession({ ...activeSession, status: 'completed', notes });
  };

  const handleReschedule = async (newDate: Date) => {
    if (!activeSession) return;
    await rescheduleSession(activeSession.id, newDate);
    toast.success('Session rescheduled and reminders updated');
  };

  const handleResendReminders = async () => {
    if (!activeSession) return;
    await scheduleRemindersForSession(activeSession, plan);
    toast.success('Reminders rescheduled');
  };

  const handleSaveVoice = async (blob: Blob, duration: number) => {
    if (!activeSession || !user) return;
    await attachVoiceNote({
      patientId: activeSession.patientId,
      treatmentPlanId: plan.id,
      treatmentSessionId: activeSession.id,
      audioBlob: blob,
      durationSeconds: duration,
      recordedBy: user.id,
      purpose: 'progress_note',
    });
    toast.success('Voice note saved');
    setShowVoice(false);
  };

  const stats = {
    total: (sessions || []).length,
    completed: (sessions || []).filter(s => s.status === 'completed').length,
    missed: (sessions || []).filter(s => s.status === 'missed').length,
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <button onClick={() => navigate('/treatment-planning')} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> All plans
      </button>

      <header className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
            <p className="text-sm text-gray-500">
              {patient ? (
                <Link to={`/patients/${patient.id}`} className="text-primary-600 hover:underline">
                  {patient.firstName} {patient.lastName} · {patient.hospitalNumber}
                </Link>
              ) : 'Patient'}
              {' · '}Started {format(new Date(plan.startDate), 'MMM d, yyyy')}
            </p>
            {plan.description && <p className="mt-2 max-w-2xl text-sm text-gray-700">{plan.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800"><CheckCircle2 className="mr-1 inline h-3 w-3" />{stats.completed} done</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800"><Clock className="mr-1 inline h-3 w-3" />{stats.total - stats.completed - stats.missed} pending</span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800"><AlertTriangle className="mr-1 inline h-3 w-3" />{stats.missed} missed</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Timeline</h2>
            <span className="text-xs text-gray-500">{stats.total} sessions</span>
          </div>
          <TreatmentTimeline
            sessions={(sessions || []).map(s => ({ ...s, voiceNoteCount: voiceCountBySession.get(s.id) }))}
            onSessionClick={(s) => setActiveSession(s)}
          />
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Session details</h2>
          {!activeSession ? (
            <p className="text-sm text-gray-500">Select a session from the timeline to view actions.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-base font-semibold text-gray-900">{activeSession.title}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {format(new Date(activeSession.scheduledAt), 'EEEE, MMM d · HH:mm')}
                </div>
                <div className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{activeSession.status}</div>
              </div>

              {activeSession.status !== 'completed' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Completion notes</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Outcome, observations, next step…"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAttend}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark attended
                  </button>
                </>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResendReminders}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800 hover:bg-blue-100"
                >
                  <Bell className="h-4 w-4" /> Re-schedule reminders
                </button>

                <RescheduleControl onReschedule={handleReschedule} current={activeSession.scheduledAt} />

                <button
                  type="button"
                  onClick={() => setShowVoice(s => !s)}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800 hover:bg-purple-100"
                >
                  <Mic className="h-4 w-4" /> {showVoice ? 'Hide' : 'Add'} voice note
                </button>

                {showVoice && (
                  <VoiceRecorder onSaved={handleSaveVoice} hint="Record a clinical voice note for this session." />
                )}

                <SessionVoiceNotes sessionId={activeSession.id} notes={voiceNotes || []} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const RescheduleControl: React.FC<{ onReschedule: (d: Date) => void; current: Date | string }> = ({ onReschedule, current }) => {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(() => {
    const d = new Date(current);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
      >
        <RefreshCw className="h-4 w-4" /> Reschedule
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2">
      <input
        type="datetime-local"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-full rounded-md border border-amber-300 px-2 py-1 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-2 py-1 text-xs">Cancel</button>
        <button
          onClick={() => { onReschedule(new Date(val)); setOpen(false); }}
          className="rounded-md bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
        >
          Save new time
        </button>
      </div>
    </div>
  );
};

const SessionVoiceNotes: React.FC<{ sessionId: string; notes: TreatmentVoiceNote[] }> = ({ sessionId, notes }) => {
  const own = notes.filter(n => n.treatmentSessionId === sessionId);
  if (own.length === 0) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Voice notes ({own.length})</h3>
      {own.map(n => (
        <div key={n.id} className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
            <span>{format(new Date(n.recordedAt), 'MMM d, HH:mm')}</span>
            <span>{n.durationSeconds}s</span>
          </div>
          {n.audioDataUrl && <audio src={n.audioDataUrl} controls className="w-full" />}
          {n.transcript && <p className="mt-1 text-xs italic text-gray-700">“{n.transcript}”</p>}
        </div>
      ))}
    </div>
  );
};

export default TreatmentPlanDetailPage;
