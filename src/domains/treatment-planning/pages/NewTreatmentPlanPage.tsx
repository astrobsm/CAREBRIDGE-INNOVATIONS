import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../../database';
import type { Patient, TreatmentPlan } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { createPlanWithSchedule, attachVoiceNote } from '../../../services/treatmentSchedulerService';
import VoiceRecorder from '../components/VoiceRecorder';

const schema = z.object({
  patientId: z.string().min(1, 'Select a patient'),
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  relatedEntityType: z.enum(['wound', 'burn', 'surgery', 'general']).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm'),
  intervalDays: z.coerce.number().int().min(1).max(30),
  timesPerDay: z.coerce.number().int().min(1).max(6),
  occurrences: z.coerce.number().int().min(1).max(60),
  reminder24h: z.boolean().optional(),
  reminder1h: z.boolean().optional(),
  reminder15m: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  notifyAssignedNurse: z.boolean().optional(),
  notifyPrimaryDoctor: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

const NewTreatmentPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const patients = useLiveQuery(() => db.patients.toArray(), []) as Patient[] | undefined;
  const [voiceBlob, setVoiceBlob] = useState<{ blob: Blob; duration: number } | null>(null);

  const sortedPatients = useMemo(
    () => (patients || []).slice().sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
    [patients]
  );

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      timeOfDay: '09:00',
      intervalDays: 1,
      timesPerDay: 1,
      occurrences: 7,
      reminder24h: true,
      reminder1h: true,
      reminder15m: true,
      voiceEnabled: false,
      notifyAssignedNurse: true,
      notifyPrimaryDoctor: true,
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('You must be signed in.');
      return;
    }
    const reminderMinutes: number[] = [];
    if (data.reminder24h) reminderMinutes.push(1440);
    if (data.reminder1h) reminderMinutes.push(60);
    if (data.reminder15m) reminderMinutes.push(15);

    const planId = uuidv4();
    let voiceNoteId: string | undefined;

    try {
      if (voiceBlob) {
        const note = await attachVoiceNote({
          patientId: data.patientId,
          treatmentPlanId: planId,
          audioBlob: voiceBlob.blob,
          durationSeconds: voiceBlob.duration,
          recordedBy: user.id,
          purpose: 'reminder',
        });
        voiceNoteId = note.id;
      }

      const plan: TreatmentPlan = {
        id: planId,
        patientId: data.patientId,
        title: data.title,
        description: data.description,
        relatedEntityType: data.relatedEntityType,
        clinicalGoals: [],
        orders: [],
        frequency: data.intervalDays === 1 ? 'daily' : `every_${data.intervalDays}_days`,
        startDate: new Date(`${data.startDate}T${data.timeOfDay}:00`),
        status: 'active',
        scheduleRule: {
          intervalDays: data.intervalDays,
          timesPerDay: data.timesPerDay,
          timeOfDay: data.timeOfDay,
          occurrences: data.occurrences,
        },
        reminderMinutesBefore: reminderMinutes.length ? reminderMinutes : [60, 15],
        defaultVoiceNoteId: voiceNoteId,
        notificationPreferences: {
          pushEnabled: true,
          voiceEnabled: !!data.voiceEnabled && !!voiceNoteId,
          notifyAssignedNurse: !!data.notifyAssignedNurse,
          notifyPrimaryDoctor: !!data.notifyPrimaryDoctor,
          notifyPatient: false,
        },
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createPlanWithSchedule(plan, { createdBy: user.id });
      toast.success(`Treatment plan created with ${data.occurrences} scheduled session(s).`);
      navigate(`/treatment-planning/${plan.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to create treatment plan');
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">New treatment plan</h1>
        <p className="text-sm text-gray-500">Define schedule and notification preferences. Sessions and reminders are generated automatically and fire even when the app is closed.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Patient & summary</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Patient *</label>
              <select {...register('patientId')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">— Select patient —</option>
                {sortedPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.hospitalNumber}</option>
                ))}
              </select>
              {errors.patientId && <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Related to</label>
              <select {...register('relatedEntityType')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="general">General</option>
                <option value="wound">Wound</option>
                <option value="burn">Burn</option>
                <option value="surgery">Surgery</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Title *</label>
              <input
                type="text"
                {...register('title')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g. Daily wound dressing & antibiotic"
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                {...register('description')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Clinical context, special instructions, what should happen at each session…"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Schedule</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Start date *</label>
              <input type="date" {...register('startDate')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Time *</label>
              <input type="time" {...register('timeOfDay')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Interval (days)</label>
              <input type="number" min={1} {...register('intervalDays')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Times / day</label>
              <input type="number" min={1} max={6} {...register('timesPerDay')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700"># Sessions</label>
              <input type="number" min={1} max={60} {...register('occurrences')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Notifications</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('reminder24h')} /> Remind 24 hours before</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('reminder1h')} /> Remind 1 hour before</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('reminder15m')} /> Remind 15 minutes before</label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('notifyAssignedNurse')} /> Notify assigned nurse on duty</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('notifyPrimaryDoctor')} /> Notify primary doctor</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('voiceEnabled')} /> Attach voice message to reminders</label>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Optional voice reminder (WhatsApp-style)</h3>
            <VoiceRecorder
              hint="Record a short voice instruction (max 2 min). It plays when the user taps the push notification."
              onSaved={(blob, duration) => setVoiceBlob({ blob, duration })}
            />
            {voiceBlob && (
              <p className="mt-2 text-xs text-emerald-700">Voice note ready ({voiceBlob.duration}s) — will be attached to all reminders.</p>
            )}
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/treatment-planning')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating…' : 'Create plan & schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTreatmentPlanPage;
