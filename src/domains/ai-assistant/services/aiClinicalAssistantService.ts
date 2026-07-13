// ---------------------------------------------------------------------------
// AI Clinical Assistant service
// ---------------------------------------------------------------------------
// Online-only. Synthesises a patient's local clinical record into DRAFT
// clinician-facing content (summaries, problem lists, differentials, notes).
// All output is explicitly a draft requiring clinician review and is NOT
// written back into the clinical record automatically.
// ---------------------------------------------------------------------------

import { differenceInYears, format } from 'date-fns';
import { db } from '../../../database';
import type {
  Patient,
  VitalSigns,
  ClinicalEncounter,
  Prescription,
  Investigation,
  Surgery,
  Admission,
} from '../../../types';

export type AIDraftMode =
  | 'summary'
  | 'problems'
  | 'differentials'
  | 'investigations'
  | 'treatment'
  | 'progress_note'
  | 'ward_round'
  | 'discharge_summary';

export interface AIDraftModeDef {
  value: AIDraftMode;
  label: string;
  instruction: string;
}

export const AI_DRAFT_MODES: AIDraftModeDef[] = [
  {
    value: 'summary',
    label: 'Clinical summary',
    instruction:
      'Write a concise clinical summary of this patient (presentation, course, current status).',
  },
  {
    value: 'problems',
    label: 'Active problems list',
    instruction:
      'Produce a prioritised active problems list. For each problem give a one-line status.',
  },
  {
    value: 'differentials',
    label: 'Differential diagnoses',
    instruction:
      'Provide a ranked differential diagnosis for the current presentation with brief reasoning for each.',
  },
  {
    value: 'investigations',
    label: 'Suggested investigations',
    instruction:
      'Suggest appropriate further investigations, grouped by urgency, with a short rationale for each.',
  },
  {
    value: 'treatment',
    label: 'Treatment options',
    instruction:
      'Outline evidence-based treatment options for the active problems, noting WHO/BNF-consistent choices suitable for a Nigerian setting. Flag anything requiring senior review.',
  },
  {
    value: 'progress_note',
    label: 'Daily progress note (SOAP)',
    instruction:
      'Draft a daily progress note in SOAP format (Subjective, Objective, Assessment, Plan).',
  },
  {
    value: 'ward_round',
    label: 'Ward round summary',
    instruction:
      'Draft a concise ward round entry: current status, overnight events, examination, plan for today.',
  },
  {
    value: 'discharge_summary',
    label: 'Discharge summary',
    instruction:
      'Draft a discharge summary: diagnosis, course in hospital, procedures, discharge medications, follow-up plan and safety-net advice.',
  },
];

export interface AIDraftResult {
  mode: AIDraftMode;
  label: string;
  content: string;
  generatedAt: Date;
  source: 'openai' | 'anthropic';
}

interface PatientContext {
  patient: Patient;
  vitals: VitalSigns[];
  encounters: ClinicalEncounter[];
  prescriptions: Prescription[];
  investigations: Investigation[];
  surgeries: Surgery[];
  admissions: Admission[];
}

function getApiKey(): string | null {
  return (
    localStorage.getItem('aiApiKey') ||
    (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ||
    (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ||
    null
  );
}

/** Whether the assistant can run right now (online + API key configured). */
export function getAIAvailability(): { available: boolean; reason?: string } {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { available: false, reason: 'You are offline. The AI assistant needs an internet connection.' };
  }
  if (!getApiKey()) {
    return {
      available: false,
      reason: 'No AI API key configured. Set VITE_OPENAI_API_KEY (or store one under "aiApiKey").',
    };
  }
  return { available: true };
}

async function gatherContext(patientId: string): Promise<PatientContext | null> {
  const patient = await db.patients.get(patientId);
  if (!patient) return null;

  const [vitals, encounters, prescriptions, investigations, surgeries, admissions] =
    await Promise.all([
      db.vitalSigns.where('patientId').equals(patientId).toArray(),
      db.clinicalEncounters.where('patientId').equals(patientId).toArray(),
      db.prescriptions.where('patientId').equals(patientId).toArray(),
      db.investigations.where('patientId').equals(patientId).toArray(),
      db.surgeries.where('patientId').equals(patientId).toArray(),
      db.admissions.where('patientId').equals(patientId).toArray(),
    ]);

  const byDateDesc = (a: string | Date, b: string | Date) =>
    new Date(b).getTime() - new Date(a).getTime();

  vitals.sort((a, b) => byDateDesc(a.recordedAt, b.recordedAt));
  encounters.sort((a, b) => byDateDesc(a.createdAt, b.createdAt));
  prescriptions.sort((a, b) => byDateDesc(a.prescribedAt, b.prescribedAt));
  investigations.sort((a, b) => byDateDesc(a.createdAt, b.createdAt));

  return { patient, vitals, encounters, prescriptions, investigations, surgeries, admissions };
}

function buildContextText(ctx: PatientContext): string {
  const { patient, vitals, encounters, prescriptions, investigations, surgeries, admissions } = ctx;
  const age = patient.dateOfBirth
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : 'Unknown';

  const lines: string[] = [];
  lines.push(`PATIENT: ${patient.firstName} ${patient.lastName}, ${age}y ${patient.gender}, Hosp# ${patient.hospitalNumber}`);
  if (patient.allergies?.length) lines.push(`Allergies: ${patient.allergies.join(', ')}`);
  if (patient.chronicConditions?.length) lines.push(`Chronic conditions: ${patient.chronicConditions.join(', ')}`);
  if (patient.comorbidities?.length)
    lines.push(`Comorbidities: ${patient.comorbidities.map((c) => c.condition).join(', ')}`);

  const activeAdmission = admissions.find((a) => a.status === 'active');
  if (activeAdmission) {
    lines.push(
      `CURRENT ADMISSION: since ${format(new Date(activeAdmission.admissionDate), 'PP')}, ward ${activeAdmission.wardName ?? '—'}, bed ${activeAdmission.bedNumber ?? '—'}`
    );
  }

  const v = vitals[0];
  if (v) {
    lines.push(
      `LATEST VITALS (${format(new Date(v.recordedAt), 'PP p')}): T ${v.temperature ?? '—'}°C, HR ${v.pulse ?? v.heartRate ?? '—'}, BP ${v.bloodPressureSystolic ?? '—'}/${v.bloodPressureDiastolic ?? '—'}, RR ${v.respiratoryRate ?? '—'}, SpO2 ${v.oxygenSaturation ?? '—'}%${v.painScore != null ? `, pain ${v.painScore}/10` : ''}`
    );
  }

  if (encounters.length) {
    lines.push(`\nRECENT ENCOUNTERS (most recent ${Math.min(5, encounters.length)}):`);
    encounters.slice(0, 5).forEach((enc, i) => {
      const dx = enc.diagnosis?.map((d) => d.description || (d as { name?: string }).name).filter(Boolean).join(', ');
      lines.push(
        `${i + 1}. ${format(new Date(enc.createdAt), 'PP')} [${enc.type}] CC: ${enc.chiefComplaint || '—'}; Dx: ${dx || '—'}; Plan: ${(enc.treatmentPlan || '—').slice(0, 200)}`
      );
    });
  }

  const activeMeds = prescriptions
    .filter((rx) => rx.status !== 'cancelled')
    .flatMap((rx) => rx.medications?.map((m) => `${m.name} ${m.dosage} ${m.frequency}`) ?? []);
  if (activeMeds.length) lines.push(`\nCURRENT MEDICATIONS: ${[...new Set(activeMeds)].join('; ')}`);

  if (investigations.length) {
    lines.push(`\nRECENT INVESTIGATIONS (most recent ${Math.min(8, investigations.length)}):`);
    investigations.slice(0, 8).forEach((inv) => {
      const name = (inv as { testName?: string; name?: string }).testName || (inv as { name?: string }).name || 'Investigation';
      const result = (inv as { result?: string; findings?: string }).result || (inv as { findings?: string }).findings || (inv as { status?: string }).status || '—';
      lines.push(`- ${name}: ${String(result).slice(0, 120)}`);
    });
  }

  if (surgeries.length) {
    lines.push(`\nSURGERIES: ${surgeries.map((s) => `${s.procedureName ?? 'Procedure'} (${(s as { status?: string }).status ?? '—'})`).slice(0, 5).join('; ')}`);
  }

  return lines.join('\n');
}

async function callOpenAI(apiKey: string, system: string, user: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic(apiKey: string, system: string, user: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  const data = await response.json();
  return (data.content?.[0]?.text as string | undefined)?.trim() || '';
}

const SYSTEM_PROMPT =
  'You are a clinical decision-support assistant for a surgical/reconstructive service in Nigeria. ' +
  'You produce concise, professional DRAFT documentation to support (never replace) clinician judgement. ' +
  'Use only the information provided; do not invent results. Where data is missing, say so. ' +
  'Prefer WHO-adapted and BNF-consistent guidance. Keep output clinically actionable and clearly structured. ' +
  'Do NOT include any preamble like "Here is"; output only the requested content.';

/** Generate a DRAFT for a patient in the requested mode. Online-only. */
export async function generateAIDraft(
  patientId: string,
  mode: AIDraftMode
): Promise<AIDraftResult> {
  const availability = getAIAvailability();
  if (!availability.available) throw new Error(availability.reason);

  const apiKey = getApiKey()!;
  const ctx = await gatherContext(patientId);
  if (!ctx) throw new Error('Patient not found.');

  const def = AI_DRAFT_MODES.find((m) => m.value === mode)!;
  const contextText = buildContextText(ctx);
  const userPrompt = `${def.instruction}\n\nUse this patient record:\n\n${contextText}`;

  let content: string;
  let source: 'openai' | 'anthropic';
  if (apiKey.startsWith('sk-ant')) {
    content = await callAnthropic(apiKey, SYSTEM_PROMPT, userPrompt);
    source = 'anthropic';
  } else {
    content = await callOpenAI(apiKey, SYSTEM_PROMPT, userPrompt);
    source = 'openai';
  }

  if (!content) throw new Error('The AI returned an empty response. Please try again.');

  return { mode, label: def.label, content, generatedAt: new Date(), source };
}
