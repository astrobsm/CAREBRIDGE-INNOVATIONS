import { emptyClerking } from '../../clerking/engine';
import type { ClerkingData, ComplaintEntry } from '../../clerking/types';

let n = 0;
export function complaint(complaintId: string, label: string, answers: ComplaintEntry['answers'] = {}, duration?: ComplaintEntry['duration']): ComplaintEntry {
  return { uid: `c${++n}`, complaintId, label, answers, duration: duration ?? { value: 2, unit: 'months' } };
}

export function clerking(p: {
  complaints: ComplaintEntry[];
  vitals?: Record<string, number | string>;
  pmh?: Record<string, string>;
  gyn?: Record<string, string>;
  social?: Record<string, string>;
  exam?: ClerkingData['exam'];
  medications?: ClerkingData['medications'];
  allergies?: string[];
}): ClerkingData {
  const d = emptyClerking();
  d.complaints = p.complaints;
  d.vitals = { temperature: 36.8, pulse: 80, bp_systolic: 120, respiratory_rate: 16, spo2: 98, ...(p.vitals ?? {}) };
  d.history.pmh = Object.fromEntries(Object.entries(p.pmh ?? {}).map(([k, v]) => [k, { status: v }]));
  d.history.gyn = p.gyn ?? {};
  d.history.social = p.social ?? {};
  d.exam = p.exam ?? {};
  d.medications = p.medications ?? [];
  d.medicationStatus = d.medications.length ? 'documented' : 'none';
  d.allergyStatus = p.allergies?.length ? 'has_allergies' : 'nkda';
  d.allergies = (p.allergies ?? []).map(substance => ({ substance }));
  return d;
}
