/**
 * Every condition template, and how it joins the clerking catalogue.
 *
 *  - A template that refines existing complaints (complaintIds) adds its
 *    history module and examination section to those complaints, so picking
 *    "Keloid" now brings the keloid fields.
 *  - A template with no existing complaint gets its own complaint
 *    `cond_<id>` ("Syndactyly"), in the system "Plastic surgery conditions".
 *
 * This file imports only types from ../../clerking, so the clerking catalogue
 * can import it without a cycle.
 */
import type { ClerkingData, Complaint, ExamSection, QuestionModule } from '../../clerking/types';
import type { ConditionTemplate } from './types';
import { HAND_TEMPLATES } from './hand';
import { SKIN_TEMPLATES } from './skin';
import { WOUND_TEMPLATES } from './wounds';
import { OTHER_TEMPLATES } from './other';
import { DERM_RHEUM_TEMPLATES } from './dermRheum';

export const CONDITIONS: readonly ConditionTemplate[] = [...HAND_TEMPLATES, ...SKIN_TEMPLATES, ...WOUND_TEMPLATES, ...OTHER_TEMPLATES, ...DERM_RHEUM_TEMPLATES];
export const CONDITION_BY_ID: Record<string, ConditionTemplate> = Object.fromEntries(CONDITIONS.map(t => [t.id, t]));

export const CONDITION_SYSTEM = 'Plastic surgery conditions';
export const conditionComplaintId = (t: Pick<ConditionTemplate, 'id'>) => `cond_${t.id}`;

/** History modules by id, for clerking/modules.ts. */
export const CONDITION_MODULES: Record<string, QuestionModule> = Object.fromEntries(CONDITIONS.map(t => [t.history.id, t.history]));
/** Examination sections by id, for clerking/examination.ts. */
export const CONDITION_EXAMS: Record<string, ExamSection> = Object.fromEntries(CONDITIONS.map(t => [t.exam.id, t.exam]));

/** New complaints for the templates no existing complaint covers. */
export function conditionComplaints(): Complaint[] {
  return CONDITIONS.filter(t => t.complaintIds.length === 0).map(t => ({
    id: conditionComplaintId(t), label: t.label, system: CONDITION_SYSTEM,
    modules: [t.history.id],
    exams: [t.exam.id, ...(t.group === 'Congenital hand' || t.group === 'Hand' ? ['local_hand'] : t.group === 'Wounds' ? ['local_wound'] : ['local_lump'])],
    differentials: [], synonyms: t.synonyms,
  }));
}

/** Existing complaints, with the refining templates' modules and exams added. */
export function withConditionFields(complaints: Complaint[]): Complaint[] {
  return complaints.map(c => {
    const ts = CONDITIONS.filter(t => t.complaintIds.includes(c.id));
    if (!ts.length) return c;
    return { ...c, modules: [...c.modules, ...ts.map(t => t.history.id)], exams: [...ts.map(t => t.exam.id), ...c.exams] };
  });
}

/** The templates that apply to a clerking, from its complaints. */
export function conditionsIn(data: Pick<ClerkingData, 'complaints'>): ConditionTemplate[] {
  const out: ConditionTemplate[] = [];
  for (const entry of data.complaints) {
    for (const t of CONDITIONS) {
      if ((entry.complaintId === conditionComplaintId(t) || t.complaintIds.includes(entry.complaintId)) && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

/** Templates worth offering for the generic complaints chosen (e.g. "Congenital hand difference" → syndactyly). */
export function suggestedConditions(data: Pick<ClerkingData, 'complaints'>): ConditionTemplate[] {
  const have = new Set(conditionsIn(data).map(t => t.id));
  const ids = new Set(data.complaints.map(c => c.complaintId));
  return CONDITIONS.filter(t => !have.has(t.id) && (t.suggestFor || []).some(id => ids.has(id)));
}

/** Free text a clinician might type for a condition → the template, if any. */
export function findCondition(text: string): ConditionTemplate | undefined {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  return CONDITIONS.find(t => t.label.toLowerCase() === q || t.synonyms.some(s => s.toLowerCase() === q))
    ?? CONDITIONS.find(t => t.synonyms.some(s => q.includes(s.toLowerCase()) && s.length >= 5));
}

export type { ConditionTemplate } from './types';
