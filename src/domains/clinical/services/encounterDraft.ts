// ---------------------------------------------------------------------------
// Autosaved draft of the clinical encounter form, per patient.
//
// Notes typed into the encounter were lost on any navigation or reload. The
// form now autosaves to localStorage under the patient's id and restores on
// return. Clinical photos are not kept in the draft: they are large data URLs
// and would exhaust localStorage.
// ---------------------------------------------------------------------------

export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const ENCOUNTER_DRAFT_VERSION = 1;

export interface EncounterDraft {
  v: number;
  savedAt: string;
  form: Record<string, string | undefined>;
  diagnoses: unknown[];
  physicalExam: Record<string, unknown>;
  lmpDate: string;
  lmpUnknown: boolean;
}

export const encounterDraftKey = (patientId: string) => `astro_encounter_draft_${patientId}`;

/** Fields whose content counts as "something typed". `type` is chosen automatically, so it does not. */
const TEXT_FIELDS = [
  'chiefComplaint', 'historyOfPresentIllness', 'pastMedicalHistory', 'pastSurgicalHistory',
  'familyHistory', 'socialHistory', 'treatmentPlan', 'notes',
];

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number') return !Number.isNaN(v);
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.some(hasValue);
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).some(hasValue);
  return false;
}

/** Whether a draft holds anything worth keeping (or warning about). */
export function draftHasContent(d: Pick<EncounterDraft, 'form' | 'diagnoses' | 'physicalExam' | 'lmpDate'>): boolean {
  return TEXT_FIELDS.some(f => hasValue(d.form?.[f]))
    || (d.diagnoses?.length ?? 0) > 0
    || hasValue(d.physicalExam)
    || hasValue(d.lmpDate);
}

export function saveEncounterDraft(storage: DraftStorage, patientId: string, d: Omit<EncounterDraft, 'v' | 'savedAt'>, now = new Date()): void {
  const key = encounterDraftKey(patientId);
  if (!draftHasContent(d)) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify({ ...d, v: ENCOUNTER_DRAFT_VERSION, savedAt: now.toISOString() }));
}

export function loadEncounterDraft(storage: DraftStorage, patientId: string): EncounterDraft | null {
  try {
    const raw = storage.getItem(encounterDraftKey(patientId));
    if (!raw) return null;
    const d = JSON.parse(raw) as EncounterDraft;
    if (d?.v !== ENCOUNTER_DRAFT_VERSION || typeof d.form !== 'object' || !draftHasContent(d)) return null;
    return {
      ...d,
      diagnoses: Array.isArray(d.diagnoses) ? d.diagnoses : [],
      physicalExam: d.physicalExam && typeof d.physicalExam === 'object' ? d.physicalExam : {},
      lmpDate: typeof d.lmpDate === 'string' ? d.lmpDate : '',
      lmpUnknown: !!d.lmpUnknown,
    };
  } catch {
    return null;
  }
}

export function clearEncounterDraft(storage: DraftStorage, patientId: string): void {
  storage.removeItem(encounterDraftKey(patientId));
}
