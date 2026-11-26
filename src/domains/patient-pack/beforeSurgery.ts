/**
 * The "before your operation" sheet: fasting, and what to do with the
 * medicines ACTUALLY recorded for this patient. Pure; text from the locale
 * table. Marked "confirm with your surgeon or anaesthetist" — it is general
 * guidance, and the clinician can edit the fasting text before it is sent.
 *
 * Sources:
 * - Fasting: American Society of Anesthesiologists, Practice Guidelines for
 *   Preoperative Fasting, Anesthesiology 2017;126:376-93 (and the 2023
 *   carbohydrate-drink update): light meal / non-human milk 6 h, clear fluids
 *   2 h, breast milk 4 h, infant formula 6 h. European Society of
 *   Anaesthesiology, Smith I et al., Eur J Anaesthesiol 2011;28:556-69
 *   (same intervals; chewing gum and sweets count as food).
 * - Warfarin, DOACs, heparin, antiplatelets: Douketis JD et al., Perioperative
 *   Management of Antithrombotic Therapy, ACCP guideline, CHEST 2022;162:e207-43;
 *   PAUSE trial, Douketis JD et al., JAMA Intern Med 2019;179:1469-78 (DOAC
 *   interruption 1-2 days by bleeding risk, longer for dabigatran with low
 *   creatinine clearance).
 * - Metformin, insulin, SGLT2 inhibitors: Centre for Perioperative Care (CPOC),
 *   Guideline for perioperative care for people with diabetes mellitus
 *   undergoing elective and emergency surgery, 2021 (updated 2023); US FDA
 *   Drug Safety Communication 2020 (SGLT2i: stop canagliflozin, dapagliflozin,
 *   empagliflozin 3 days and ertugliflozin 4 days before surgery);
 *   ADA Standards of Care 2024, section 16.
 * - Herbal medicines: Ang-Lee MK, Moss J, Yuan CS, JAMA 2001;286:208-16
 *   (stop at least 2 weeks before surgery); ASA patient guidance.
 */
import type { AnaesthesiaType } from '../../types';
import { patientText } from './locale/en';

export type MedicineClass = 'warfarin' | 'doac' | 'heparin' | 'aspirin' | 'antiplatelet' | 'metformin' | 'sglt2' | 'insulin' | 'herbal' | 'other';

const CLASSES: [MedicineClass, RegExp][] = [
  ['warfarin', /warfarin|coumadin|acenocoumarol/i],
  ['doac', /rivaroxaban|xarelto|apixaban|eliquis|edoxaban|dabigatran|pradaxa/i],
  ['heparin', /enoxaparin|clexane|heparin|dalteparin|tinzaparin/i],
  ['aspirin', /\baspirin\b|acetylsalicylic/i],
  ['antiplatelet', /clopidogrel|plavix|prasugrel|ticagrelor|brilinta/i],
  ['sglt2', /gliflozin|jardiance|forxiga|invokana/i],
  ['metformin', /metformin|glucophage/i],
  ['insulin', /insulin|mixtard|lantus|actrapid|novorapid|glargine|detemir/i],
  ['herbal', /herbal|traditional|native|agbo|ginseng|ginkgo|garlic (?:tablet|capsule)|fish oil/i],
];

export const classifyMedicine = (name: string): MedicineClass => CLASSES.find(([, re]) => re.test(name))?.[0] ?? 'other';

/** Review answers that name a medicine class (the procedure review's core questions). */
export function medicinesFromReviewAnswers(answers: Record<string, unknown> | undefined): string[] {
  if (!answers) return [];
  const out: string[] = [];
  const ac = answers['core.anticoagulant'];
  const LABEL: Record<string, string> = {
    warfarin: 'Warfarin', rivaroxaban: 'Rivaroxaban', apixaban: 'Apixaban', dabigatran: 'Dabigatran',
    enoxaparin: 'Enoxaparin / heparin', aspirin: 'Aspirin', clopidogrel: 'Clopidogrel',
  };
  for (const v of Array.isArray(ac) ? ac : typeof ac === 'string' ? [ac] : []) if (LABEL[String(v)]) out.push(LABEL[String(v)]);
  if (answers['core.diabetes'] === 'insulin') out.push('Insulin');
  if (answers['core.traditional_remedies'] === 'oral') out.push('Herbal or traditional remedies');
  return out;
}

export interface BeforeSurgeryInput {
  anaesthesiaType?: AnaesthesiaType;
  ageYears?: number | null;
  /** Free-text medicines recorded for the patient (registration comorbidity medicines, review answers). */
  medicines: string[];
  /** The fasting text as edited by the clinician (replaces the default when given). */
  fastingText?: string;
}

/** The default fasting lines for this anaesthetic and age. */
export function defaultFastingLines(anaesthesia?: AnaesthesiaType, ageYears?: number | null): string[] {
  const t = patientText.fasting;
  if (anaesthesia === 'local') return [...t.local, t.arrival];
  return [...t.general, ...(ageYears != null && ageYears < 2 ? t.child : []), t.arrival];
}

export function medicineLines(medicines: string[]): string[] {
  const m = patientText.meds;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of medicines) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name || /^none$/i.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    out.push(m[classifyMedicine(name)](label));
  }
  return out;
}

export interface BeforeSurgerySheet {
  fastingHeading: string;
  fasting: string[];
  medsHeading: string;
  medsIntro: string;
  meds: string[];
  confirm: string;
}

export function buildBeforeSurgery(i: BeforeSurgeryInput): BeforeSurgerySheet {
  const fasting = i.fastingText?.trim()
    ? i.fastingText.split('\n').map(s => s.trim()).filter(Boolean)
    : defaultFastingLines(i.anaesthesiaType, i.ageYears);
  const meds = medicineLines(i.medicines);
  return {
    fastingHeading: patientText.fasting.heading,
    fasting,
    medsHeading: patientText.meds.heading,
    medsIntro: meds.length ? patientText.meds.intro : patientText.meds.none,
    meds,
    confirm: patientText.fasting.confirm,
  };
}
