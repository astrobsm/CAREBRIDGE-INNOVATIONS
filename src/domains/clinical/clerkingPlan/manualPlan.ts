/**
 * "Build manually": the clinician builds the plan by picking from the app's
 * own catalogues, with no AI and no network call. Pure: every pick becomes a
 * PlanLine with source 'clinician' ("Added by the clinician"), stored in the
 * plan's manualLines, so approval, both PDFs, WhatsApp and follow-up booking
 * treat it like any other line (finalPlan.buildFinalPlan).
 *
 * Catalogues reused, never copied:
 *   investigations  the investigation request catalogue (services/investigationRequestService),
 *                   and the wound clinic protocol's baseline panel and targeted tests
 *   medicines       the BNF-style formulary (data/bnfDrugDatabase): classes, formulations,
 *                   doses, frequencies, its patient warnings; renal doses from services/gfrDosingService;
 *                   child weight-based doses through dosing.ts (same caps as the rules plan)
 *   procedures      the surgical procedure catalogue used by surgery booking (data/surgicalFees),
 *                   linked to a procedure review template where one exists (procedureReview/registry)
 *   wound care      dressing types from the pressure-injury dressing guide, frequency / cleansing /
 *                   who dresses from the procedure review's wound-dressing section
 *   counselling     the condition templates' plain counselling lines (patient-pack locale) and the
 *                   patient education library (domains/patient-education)
 *   referrals       the specialty consultation list in the investigation request catalogue
 *
 * The patient copy never carries "elemental", "e.g." or mg/kg (PATIENT_MEDICINE_BANNED).
 */
import {
  getDrugCategories, getDrugsByCategory, getFrequencyLabel, getRouteLabel, generatePatientWarnings, BNF_DRUG_DATABASE,
  type BNFDrug, type DrugCategory, type DrugFrequency, type DrugRoute,
} from '../../../data/bnfDrugDatabase';
import { MEDICATIONS_DATABASE, getRenalDosingCategory } from '../../../services/gfrDosingService';
import { INVESTIGATION_CATALOG, calculateEGFR } from '../../../services/investigationRequestService';
import { surgicalProcedures, type SurgicalProcedure } from '../../../data/surgicalFees';
import { DRESSING_SELECTION } from '../../pressure-sore/data/clinicalProtocol';
import { buildEducationCategories } from '../../patient-education/categoryConditions';
import { patientText } from '../../patient-pack/locale/en';
import { ANALYTE_BY_KEY } from '../../clinician-assistant/services/engine/referenceRanges';
import { modulesForFeeId } from '../procedureReview/registry';
import { WOUND_DRESSING } from '../procedureReview/core/wound';
import { drugFromText } from '../scribe/catalogMatch';
import { ACTIVE_WOUND_PROTOCOL as WP } from './protocols/woundClinic.v1';
import { TARGETED_ANALYTES, TARGETED_TEST_ID } from './rulesPlan';
import { doseText, weightDose } from './dosing';
import { CHILD_IRON_OWNER_DECISION } from './ownerDecisions';
import { PATIENT_MEDICINE_BANNED, plainMedicineLine } from './patientMedicine';
import type { PatientFacts } from './facts';
import type { PlanLine, PlanMedication, PlanSection, PlanSource } from './types';

const P = patientText.plan;
export const CLINICIAN_SOURCE: PlanSource = { kind: 'clinician', label: 'Added by the clinician' };
const noBrackets = (t: string) => t.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
const norm = (t: string) => t.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

// ── Line ids ───────────────────────────────────────────────────────────────

/**
 * A new manual line id, never one used before on this plan: ids are kept by
 * decisions, approvals and booked appointments, so a removed line's id is
 * not reused (a new follow-up must not inherit an old line's booking).
 */
export function newManualIds(section: PlanSection, count: number, existing: Pick<PlanLine, 'id'>[], now = Date.now()): string[] {
  const used = new Set(existing.map(l => l.id));
  const out: string[] = [];
  let k = 0;
  while (out.length < count) {
    const id = `manual:${section}:${now.toString(36)}${k ? `-${k}` : ''}`;
    k++;
    if (!used.has(id)) { used.add(id); out.push(id); }
  }
  return out;
}

const line = (id: string, section: PlanSection, text: string, extra: Partial<PlanLine> = {}): PlanLine => ({ id, section, text: text.trim(), source: CLINICIAN_SOURCE, ...extra });

// ── What the builder knows about the patient ───────────────────────────────

export interface BuilderContext {
  facts: PatientFacts;
  /** mL/min/1.73m²: the reported eGFR, else CKD-EPI from creatinine (adults), else null. */
  egfr: number | null;
  egfrSource?: 'reported' | 'calculated';
  allergies: string[];
}

export function builderContext(facts: PatientFacts, allergies: string[] = []): BuilderContext {
  if (facts.labs.egfr != null) return { facts, egfr: facts.labs.egfr, egfrSource: 'reported', allergies };
  const cr = facts.labs.creatinine; // umol/L (canonical)
  if (cr != null && !facts.isChild && facts.ageYears != null && facts.sex) {
    const e = calculateEGFR(cr / 88.4, facts.ageYears, facts.sex);
    if (e != null) return { facts, egfr: e, egfrSource: 'calculated', allergies };
  }
  return { facts, egfr: null, allergies };
}

// ── Investigations ─────────────────────────────────────────────────────────

export interface TestPick {
  /** Unique within the builder. */
  key: string;
  label: string;
  why?: string;
  test: NonNullable<PlanLine['test']>;
  patient: string;
}
export interface TestGroup { id: string; label: string; tests: TestPick[] }
export interface TestCategory { id: string; label: string; groups: TestGroup[] }

/** Catalogue code → result analytes, where the code is not itself an analyte key. */
const CODE_ANALYTES: Record<string, string[]> = {
  fbc: ['hb', 'wbc', 'plt', 'mcv'], pcv: ['hct'], platelets: ['plt'], rci: ['mcv', 'mch', 'mchc'], bt: ['bleedingTime'], ct: ['clottingTime'],
  fbg: ['glucose'], rbg: ['glucose'], pp2h: ['glucose'], electrolytes: ['na', 'k', 'cl', 'hco3'], uric_acid: ['uricAcid'],
  tbil: ['bilirubinTotal'], dbil: ['bilirubinDirect'], total_protein: ['totalProtein'], vitd: ['vitaminD'], acr: ['uAcr'], probnp: ['ntprobnp'],
  preop_fbc: ['hb', 'wbc', 'plt'], preop_eucr: ['na', 'k', 'urea', 'creatinine'], preop_glucose: ['glucose'], preop_coag: ['pt', 'inr', 'aptt'],
};
/** Catalogue code → the plain patient-copy line the locale already has for that test. */
const CODE_PATIENT: Record<string, string> = {
  fbc: 'fbc', hb: 'fbc', preop_fbc: 'fbc_preop', esr: 'esr_crp', crp: 'esr_crp', fbg: 'glucose_hba1c', rbg: 'glucose_hba1c', hba1c: 'glucose_hba1c',
  preop_glucose: 'glucose_hba1c', electrolytes: 'eucr', urea: 'eucr', creatinine: 'eucr', egfr: 'eucr', preop_eucr: 'eucr',
  alt: 'lft_albumin', ast: 'lft_albumin', alp: 'lft_albumin', albumin: 'lft_albumin', preop_lft: 'lft_albumin', ferritin: 'iron_studies',
  b12: 'b12_folate', folate: 'b12_folate', vitd: 'vitamin_d', hiv: 'hiv', urinalysis: 'urinalysis', preop_urinalysis: 'urinalysis',
  bc_aerobic: 'blood_culture', bc_anaerobic: 'blood_culture', bc_x2: 'blood_culture', deep_tissue_culture: 'culture',
  abi: 'abpi', ven_doppler: 'duplex', duplex_ven: 'duplex', calcium: 'minerals', phosphate: 'minerals', magnesium: 'minerals',
  hb_genotype: 'genotype', sickling_test: 'genotype', g6pd: 'g6pd',
  histo_excision: 'biopsy', histo_incision: 'biopsy', histo_punch: 'biopsy', histo_shave: 'biopsy', histo_wound_edge: 'biopsy',
  histo_lymph_node: 'biopsy', histo_margins: 'biopsy', fnac: 'cytology', frozen_section: 'frozen_section',
  immunohistochemistry: 'tissue_stains', sentinel_node_biopsy: 'sentinel_node',
};
const plainTests = P.tests as Record<string, string>;

function catalogPick(code: string, name: string): TestPick {
  const analytes = (CODE_ANALYTES[code] ?? (ANALYTE_BY_KEY[code] ? [code] : [])).filter(k => ANALYTE_BY_KEY[k]);
  const known = CODE_PATIENT[code] && plainTests[CODE_PATIENT[code]];
  return {
    key: `cat:${code}`, label: name,
    test: analytes.length ? { id: code, analytes } : { id: code, qualitative: {} },
    patient: known || `${noBrackets(name)}: a test we have asked for.`,
  };
}

const WP_LABEL = `Wound clinic protocol v${WP.version}`;

/** The protocol's baseline panel, exactly as the rules plan builds it. */
export function woundBaselinePicks(): TestPick[] {
  return WP.baseline.map(t => ({
    key: `wp:${t.id}`, label: t.test, why: `${t.why}. Target / action: ${t.target}`,
    test: { id: t.id, analytes: t.analytes ? [...t.analytes] : undefined, qualitative: t.analytes ? undefined : { options: t.qualitative?.options ? [...t.qualitative.options] : undefined }, target: t.target },
    patient: plainTests[t.id] ?? `${noBrackets(t.test)}.`,
  }));
}

function woundTargetedPicks(): TestPick[] {
  return WP.targeted.map(r => {
    const testId = TARGETED_TEST_ID[r.id] ?? r.id;
    return { key: `wpt:${r.id}`, label: r.investigation, why: r.situation, test: { id: testId, analytes: TARGETED_ANALYTES[r.id] ? [...TARGETED_ANALYTES[r.id]] : undefined }, patient: plainTests[testId] ?? `${noBrackets(r.investigation)}.` };
  });
}

/** Categories → groups → tests. The protocol first, then the request catalogue (consultations are referrals, not tests). */
export function investigationCategories(): TestCategory[] {
  const protocol: TestCategory = {
    id: 'wound_protocol', label: WP_LABEL,
    groups: [
      { id: 'wp_baseline', label: 'Baseline panel (every new wound patient)', tests: woundBaselinePicks() },
      { id: 'wp_targeted', label: 'Targeted tests by situation', tests: woundTargetedPicks() },
    ],
  };
  const catalogue = INVESTIGATION_CATALOG.filter(c => c.category !== 'consultation').map(c => ({
    id: c.category, label: c.title.replace(/^(Laboratory|Radiology) Request — /, '').replace(/ Request$/, ''),
    groups: c.groups.map(g => ({ id: `${c.category}:${g.group}`, label: g.group, tests: g.items.map(i => catalogPick(i.code, i.name)) })),
  }));
  return [protocol, ...catalogue];
}

/** Panels: a whole group added at once. */
export function investigationPanels(): TestGroup[] {
  const cats = investigationCategories();
  const preop = cats.flatMap(c => c.groups).find(g => g.label === 'Pre-Operative Tests');
  return [
    { id: 'wp_baseline', label: `Wound clinic baseline panel (${WP_LABEL})`, tests: woundBaselinePicks() },
    ...(preop ? [{ ...preop, id: 'preop', label: 'Pre-operative tests' }] : []),
  ];
}

export function investigationLine(pick: TestPick, id: string): PlanLine {
  return line(id, 'investigations', pick.label, { why: pick.why, test: pick.test, patient: pick.patient });
}

// ── Medicines ──────────────────────────────────────────────────────────────

export const drugCategories = (): DrugCategory[] => getDrugCategories();
export const drugsIn = (c: DrugCategory): BNFDrug[] => getDrugsByCategory(c);
export function searchFormulary(q: string, category?: DrugCategory | ''): BNFDrug[] {
  const t = q.toLowerCase().trim();
  const pool = category ? getDrugsByCategory(category) : BNF_DRUG_DATABASE;
  if (!t) return pool;
  return pool.filter(d => d.genericName.toLowerCase().includes(t) || d.brandNames.some(b => b.toLowerCase().includes(t)) || d.id.includes(t));
}

/** Plain words for the patient copy (and the structured line). */
export const FREQUENCY_PLAIN: Record<DrugFrequency, string> = {
  stat: 'once, straight away', od: 'once a day', bd: 'twice a day', tds: 'three times a day', qds: 'four times a day', prn: 'when needed',
  nocte: 'at night', mane: 'in the morning', q3h: 'every 3 hours', q4h: 'every 4 hours', q6h: 'every 6 hours', q8h: 'every 8 hours',
  q12h: 'every 12 hours', weekly: 'once a week', alternate_days: 'every other day',
};
export const ALL_FREQUENCIES = Object.keys(FREQUENCY_PLAIN) as DrugFrequency[];
/**
 * Durations offered when the formulary gives none (clinical judgement, the
 * usual course lengths); "other" is always available.
 */
export const DURATION_OPTIONS = ['single dose', '3 days', '5 days', '7 days', '10 days', '14 days', '4 weeks', '6 weeks', '3 months', 'until the wound has healed', 'until review', 'as needed'];

/** "500mg" → "500 mg"; only a plain amount (or range) is offered as a dose. */
const AMOUNT = /^\d[\d.,]*\s*(mg|g|mcg|micrograms?|ml|mL|units?|IU|%)(\s*[-–]\s*\d[\d.,]*\s*(mg|g|mcg|ml|mL|units?|IU))?$/i;
export const tidyAmount = (t: string) => t.trim().replace(/(\d)\s*(mg|g|mcg|ml|mL|units?|IU)\b/gi, '$1 $2').replace(/\s*-\s*/g, '–');

export interface MedicationOptions {
  routes: DrugRoute[];
  /** Formulations for the chosen route ("Tablet 500mg"). */
  formulations: string[];
  /** Dose amounts from the formulary (adult or child entry, and the strengths). */
  doses: string[];
  /** Preselected: the child's weight-based dose, else the formulary's standard dose when it is a plain amount; otherwise none (the clinician chooses). */
  defaultDose: string;
  frequencies: DrugFrequency[];
  durations: string[];
  /** The formulary's dosing text, shown as a guide. */
  guide: string;
  /** A child's weight-based dose, when the child has a weight and the formulary gives mg/kg per dose. */
  weight: { dose: string; basis: string; capped: boolean } | null;
  /** Why no weight-based dose is offered for a child. */
  weightNote?: string;
}

const toMg = (n: number, unit: string) => (/^g$/i.test(unit) ? n * 1000 : /^mcg|^micro/i.test(unit) ? n / 1000 : n);
/** The highest single amount in "1g", "500mg-1g", "400mg" (mg); null if it is not a plain amount. */
export function amountMg(t: string | undefined): number | null {
  if (!t) return null;
  const m = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(mg|g|mcg)\b(?!\s*\/)/gi)];
  if (!m.length || !AMOUNT.test(t.replace(/\s*\(.*$/, '').trim())) return null;
  return Math.max(...m.map(x => toMg(parseFloat(x[1]), x[2])));
}

/** "15mg/kg", "5-10mg/kg", "12.5-25mg/kg qds", "0.1mg/kg (max 4mg) IV" → per-dose mg/kg; per-day doses are not converted. */
export function perKgDose(t: string | undefined): { low: number; high: number; maxMg?: number } | null {
  if (!t || /\/\s*kg\s*\/\s*(day|24)/i.test(t) || /\/day|daily dose|divided/i.test(t)) return null;
  const m = t.match(/^\s*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*mg\s*\/\s*kg\b/i);
  if (!m) return null;
  const low = parseFloat(m[1]), high = m[2] ? parseFloat(m[2]) : low;
  const max = t.match(/\(\s*max(?:imum)?\s*(\d+(?:\.\d+)?)\s*(mg|g)\b(?!\s*\/)/i);
  return { low, high, maxMg: max ? toMg(parseFloat(max[1]), max[2]) : undefined };
}

const isIron = (d: BNFDrug) => /iron|ferrous/i.test(d.genericName);

export function medicationOptions(drug: BNFDrug, ctx: BuilderContext, route?: string): MedicationOptions {
  const child = ctx.facts.isChild;
  const entry = child && drug.dosage.pediatric ? drug.dosage.pediatric : drug.dosage.adult;
  const routes = [...new Set(drug.formulations.map(f => f.route))];
  const r = (route as DrugRoute) || routes[0];
  const forms = drug.formulations.filter(f => !r || f.route === r);
  const doses = [...new Set([entry.standard, entry.min, entry.max, ...(child ? [] : forms.map(f => f.strength))]
    .filter(d => d && AMOUNT.test(d.trim())).map(tidyAmount))];
  const frequencies = [...new Set([...entry.frequency, ...ALL_FREQUENCIES])];
  const durations = [...new Set([...(entry.duration ? [entry.duration] : []), ...DURATION_OPTIONS])];
  const guide = [`${child && drug.dosage.pediatric ? 'Child' : 'Adult'}: ${entry.standard} (range ${entry.min} to ${entry.max})`, entry.frequency.length ? `usually ${entry.frequency.map(getFrequencyLabel).join(' / ')}` : '', entry.duration ? `for ${entry.duration}` : '', entry.notes ?? ''].filter(Boolean).join('; ');
  let weight: MedicationOptions['weight'] = null;
  let weightNote: string | undefined;
  if (child) {
    const per = perKgDose(drug.dosage.pediatric?.standard);
    const w = ctx.facts.weightKg;
    if (!drug.dosage.pediatric) weightNote = 'The formulary has no child dose for this medicine: check BNF for Children.';
    else if (!per) weightNote = `The formulary's child dose is not a per-dose mg/kg dose (${drug.dosage.pediatric.standard}): work it out and type it.`;
    else if (!w) weightNote = 'Record the weight for a weight-based dose.';
    else {
      // The rules plan's caps: never above the adult dose (the adult standard dose), nor the adult maximum, nor any stated child maximum.
      // Child iron is the owner's exception (ownerDecisions.ts): capped at the child table maximum, not the adult dose.
      const adultDose = isIron(drug) && !CHILD_IRON_OWNER_DECISION.capAtAdultDose ? undefined : amountMg(drug.dosage.adult.standard) ?? undefined;
      const caps = [per.maxMg, isIron(drug) ? undefined : amountMg(drug.dosage.adult.max) ?? undefined].filter((x): x is number => x != null);
      const d = weightDose({ perKg: { low: per.low, high: per.high }, weightKg: w, maxDose: caps.length ? Math.min(...caps) : undefined, adultDose });
      weight = { dose: doseText(d), basis: d.basis, capped: d.capped };
    }
  }
  const defaultDose = weight?.dose ?? (!child && AMOUNT.test(entry.standard.trim()) ? tidyAmount(entry.standard) : '');
  return { routes, formulations: forms.map(f => f.form), doses, defaultDose, frequencies, durations, guide, weight, weightNote };
}

const NSAID = /ibuprofen|diclofenac|naproxen|ketorolac|aspirin|piroxicam|meloxicam|celecoxib|indometacin|indomethacin|ketoprofen/i;
const PENICILLIN = /penicillin|amoxicillin|ampicillin|flucloxacillin|cloxacillin|co-amoxiclav|augmentin|piperacillin/i;

/** The renal-dosing service's entry for this drug: an exact generic-name word match (never a substring: "iron" is not "spironolactone"). */
function renalEntry(drug: BNFDrug) {
  const words = new Set(norm(drug.genericName).split(' '));
  return MEDICATIONS_DATABASE.find(m => words.has(norm(m.genericName)) || norm(m.name).split(' ')[0] === norm(drug.genericName).split(' ')[0]);
}

/** Cautions carried onto the line: the formulary's own patient warnings, allergies, renal dosing at the known eGFR, the child note and the daily maximum. */
export function medicationCautions(drug: BNFDrug, ctx: BuilderContext): string[] {
  const f = ctx.facts;
  const out: string[] = [];
  if (f.penicillinAllergy && (PENICILLIN.test(drug.genericName) || drug.category === 'Antibiotics - Penicillins')) out.push('PENICILLIN ALLERGY RECORDED: do not give a penicillin-class antibiotic.');
  if (f.nsaidAllergy && NSAID.test(drug.genericName)) out.push('NSAID ALLERGY RECORDED: do not give.');
  const warnings = generatePatientWarnings(drug, {
    pregnant: f.pregnancy === 'confirmed' || f.pregnancy === 'possible', lactating: f.breastfeeding, age: f.ageYears ?? undefined,
    gfr: ctx.egfr ?? undefined, hepaticImpairment: f.liverDisease, allergies: ctx.allergies,
  });
  for (const w of warnings) if (w.level !== 'info' || /renal/i.test(w.message)) out.push(w.message.replace(/\s+/g, ' ').trim());
  if (ctx.egfr != null) {
    const r = renalEntry(drug);
    if (r) {
      const cat = getRenalDosingCategory(ctx.egfr);
      const adj = r.renalAdjustments[cat];
      const abs = r.contraindications.absoluteGFRThreshold;
      if (adj.isContraindicated || (abs != null && ctx.egfr < abs)) out.push(`Renal: contraindicated at eGFR ${ctx.egfr} (${r.name}). ${adj.warning ?? ''}`.trim());
      else if (cat !== 'normal' && (adj.dose !== r.normalDose || adj.warning)) out.push(`Renal dose at eGFR ${ctx.egfr}: ${adj.dose}${adj.frequency ? ` ${adj.frequency}` : ''}${adj.warning ? `. ${adj.warning}` : ''}.`);
    }
  }
  if (f.isNeonate) out.push('Neonate: check the dose with paediatric input.');
  if (f.isChild && drug.dosage.pediatric?.notes) out.push(`Child: ${drug.dosage.pediatric.notes}.`);
  if (drug.maxDailyDose) out.push(`Maximum daily dose: ${drug.maxDailyDose}.`);
  return [...new Set(out.map(s => s.replace(/\.\.$/, '.')))];
}

export interface MedicationChoice {
  drug: BNFDrug;
  route: string;
  formulation?: string;
  dose: string;
  /** A DrugFrequency code, or free text. */
  frequency: string;
  duration: string;
  /** Set when the dose is the weight-based child dose. */
  weightBasis?: string;
  note?: string;
}

const routeText = (r: string) => ((['oral', 'IV', 'IM', 'SC', 'topical', 'rectal', 'inhaled', 'sublingual', 'intrathecal', 'ophthalmic'] as string[]).includes(r) ? getRouteLabel(r as DrugRoute) : r);

export function medicationLine(c: MedicationChoice, ctx: BuilderContext, id: string): PlanLine {
  const code = c.frequency as DrugFrequency;
  const freqPlain = FREQUENCY_PLAIN[code] ?? c.frequency.trim();
  const freqLabel = FREQUENCY_PLAIN[code] ? `${freqPlain} (${code.toUpperCase()})` : freqPlain;
  const dose = tidyAmount(c.dose);
  const medication: PlanMedication = {
    drug: c.drug.genericName, dose, route: routeText(c.route), frequency: freqPlain, duration: c.duration.trim(),
    weightBasis: c.weightBasis, cautions: medicationCautions(c.drug, ctx),
  };
  const text = `${c.drug.genericName} ${dose} ${routeText(c.route)}${c.formulation ? ` (${c.formulation})` : ''}, ${freqLabel}${medication.duration ? `, ${/^\d/.test(medication.duration) ? 'for ' : ''}${medication.duration}` : ''}${c.note?.trim() ? `. ${c.note.trim()}` : ''}`;
  let patient = plainMedicineLine(medication);
  if (!patient || PATIENT_MEDICINE_BANNED.test(patient)) patient = `${noBrackets(c.drug.genericName)} – take the dose on your prescription.`;
  // A child's copy is read by the parent, as the locale's child lines are: "give", not "take".
  if (ctx.facts.isChild) patient = patient.replace(' – take ', ' – give ');
  return line(id, 'medications', text, { medication, patient });
}

// ── Procedures ─────────────────────────────────────────────────────────────

const PROCEDURE_CATEGORY_LABEL: Record<string, string> = {
  minor: 'Minor (local anaesthetic / day case)', intermediate: 'Intermediate', major: 'Major', advanced: 'Super major / microsurgery', aesthetic: 'Aesthetic', burns: 'Burns',
};
export function procedureCategories(): { id: string; label: string; procedures: SurgicalProcedure[] }[] {
  const ids = [...new Set(surgicalProcedures.map(p => p.category))];
  return ids.map(id => ({ id, label: PROCEDURE_CATEGORY_LABEL[id] ?? id, procedures: surgicalProcedures.filter(p => p.category === id) }));
}

/** When the procedure is planned (clinical judgement: the usual planning horizons). */
export const PROCEDURE_TIMINGS = [
  { id: 'today', label: 'Today (urgent)', plain: 'today', urgency: 'urgent' },
  { id: 'admission', label: 'This admission', plain: 'during this stay in hospital', urgency: 'soon' },
  { id: '1w', label: 'Within 1 week', plain: 'within the next week', urgency: 'soon' },
  { id: '2w', label: 'Within 2 weeks', plain: 'within the next 2 weeks', urgency: 'routine' },
  { id: 'next_list', label: 'Next available elective list', plain: 'on the next available operating list', urgency: 'routine' },
  { id: 'wound_ready', label: 'When the wound bed is ready', plain: 'once the wound is ready for it', urgency: 'routine' },
  { id: 'fit', label: 'When fit for surgery', plain: 'once you are fit for the operation', urgency: 'routine' },
  { id: 'decide', label: 'To decide at the next review', plain: 'we will decide together at your next visit', urgency: 'routine' },
] as const;

export function procedureLine(p: SurgicalProcedure, timingId: string, id: string, note = ''): PlanLine {
  const t = PROCEDURE_TIMINGS.find(x => x.id === timingId) ?? PROCEDURE_TIMINGS[PROCEDURE_TIMINGS.length - 1];
  const module = modulesForFeeId(p.id)[0];
  return line(id, 'procedures', `${p.name} — ${t.label.toLowerCase()}${note.trim() ? `. ${note.trim()}` : ''}`, {
    why: p.description, urgency: t.urgency, procedureReviewModuleId: module?.id,
    patient: `${noBrackets(p.name)}: an operation, planned ${t.plain}.`,
  });
}

// ── Wound care ─────────────────────────────────────────────────────────────

const field = (id: string) => WOUND_DRESSING.fields.find(f => f.id === id)!;
const PLAIN_DRESSING: Record<string, string> = { NPWT: 'a wound pump dressing (negative pressure)', 'saline gauze': 'a gauze dressing soaked in salt water' };

/** Dressing types: the pressure-injury dressing guide's primary dressings, then the wound review's examples (saline gauze, honey, NPWT). */
export function dressingOptions(): { id: string; label: string; plain: string; whenUsed?: string }[] {
  const out = new Map<string, { id: string; label: string; plain: string; whenUsed?: string }>();
  for (const d of DRESSING_SELECTION) {
    for (const part of d.primary.split(/\s+or\s+/i)) {
      const label = noBrackets(part).replace(/\s+for autolytic debridement$/i, '').trim();
      const key = label.toLowerCase();
      if (label && !out.has(key)) out.set(key, { id: key.replace(/[^a-z0-9]+/g, '_'), label: label[0].toUpperCase() + label.slice(1), plain: label.toLowerCase(), whenUsed: d.woundType });
    }
  }
  const examples = (field('core.current_dressing').placeholder ?? '').replace(/^e\.g\.\s*/i, '').split(',').map(s => s.trim()).filter(Boolean);
  for (const e of examples) {
    const key = e.toLowerCase();
    if ([...out.keys()].some(k => k.startsWith(key))) continue;
    out.set(key, { id: key.replace(/[^a-z0-9]+/g, '_'), label: e === e.toUpperCase() ? e : e[0].toUpperCase() + e.slice(1), plain: PLAIN_DRESSING[e] ?? e.toLowerCase() });
  }
  return [...out.values()];
}

const opts = (id: string) => (field(id).options ?? []).map(o => ({ value: o.value, label: o.label }));
export const DRESSING_FREQUENCIES = opts('core.dressing_frequency');
export const DRESSING_CLEANSING = opts('core.cleansing');
export const WHO_DRESSES = opts('core.who_dresses');
const FREQ_PLAIN: Record<string, string> = { daily: 'every day', alternate: 'every other day', twice_weekly: 'twice a week', weekly: 'once a week', npwt: 'every 2 to 3 days' };
const CLEANSE_PLAIN: Record<string, string> = { saline: 'clean salt water (saline)', potable_water: 'clean tap water', antiseptic: 'an antiseptic wash' };
const WHO_PLAIN: Record<string, string> = { clinic: 'at the clinic', phc: 'at your nearest health centre', carer: 'by your carer at home', self: 'by you at home' };

export interface WoundCareChoice { dressing: string; frequency: string; cleansing?: string; who?: string; note?: string }

/**
 * A wound-care line. The plan has no wound-care section, so it is a
 * treatment line (section 'procedures'): the patient copy prints it under
 * "Your treatment options" in plain words.
 */
export function woundCareLine(c: WoundCareChoice, id: string): PlanLine {
  const d = dressingOptions().find(x => x.id === c.dressing || x.label === c.dressing);
  const dressing = d?.label ?? c.dressing.trim();
  const freq = DRESSING_FREQUENCIES.find(x => x.value === c.frequency);
  const clean = DRESSING_CLEANSING.find(x => x.value === c.cleansing);
  const who = WHO_DRESSES.find(x => x.value === c.who);
  const text = ['Wound care: ' + dressing, clean && `cleanse with ${noBrackets(clean.label).toLowerCase()}`, `change: ${freq ? freq.label : c.frequency}`, who && `by ${who.label.replace(/^This/, 'this')}`].filter(Boolean).join('; ') + (c.note?.trim() ? `. ${c.note.trim()}` : '');
  const patient = `Wound dressing: ${d?.plain ?? dressing.toLowerCase()}${clean ? `, after cleaning the wound with ${CLEANSE_PLAIN[clean.value] ?? noBrackets(clean.label).toLowerCase()}` : ''}, changed ${FREQ_PLAIN[c.frequency] ?? c.frequency}${who ? ` ${WHO_PLAIN[who.value] ?? ''}` : ''}.`.replace(/\s+\./, '.').replace(/\be\.g\.\s*/gi, '');
  return line(id, 'procedures', text, { patient });
}

// ── Counselling ────────────────────────────────────────────────────────────

export interface CounselTopic { id: string; label: string; text: string; patient: string }
export interface CounselGroup { id: string; label: string; topics: CounselTopic[] }

/** The condition templates' own counselling (already plain words), then the patient education library. */
export function counsellingTopics(): CounselGroup[] {
  const conds = P.conditions as Record<string, { name: string; counselling?: readonly string[] }>;
  const templates: CounselGroup[] = Object.entries(conds).filter(([, c]) => c.counselling?.length).map(([id, c]) => ({
    id: `tpl:${id}`, label: `${c.name} (condition template)`,
    topics: c.counselling!.map((s, i) => ({ id: `tpl:${id}:${i}`, label: s, text: s, patient: s })),
  }));
  const wound: CounselGroup = { id: 'tpl:wound', label: 'Wound care (wound clinic protocol)', topics: [
    { id: 'tpl:wound:monitoring', label: P.wound.monitoring, text: P.wound.monitoring, patient: P.wound.monitoring },
    { id: 'tpl:wound:week4', label: P.wound.week4, text: P.wound.week4, patient: P.wound.week4 },
    { id: 'tpl:wound:foods', label: P.copy.foods, text: P.copy.foods, patient: P.copy.foods },
  ] };
  const library: CounselGroup[] = buildEducationCategories().map(cat => ({
    id: `edu:${cat.code}`, label: `${cat.name} (education library)`,
    topics: cat.conditions.map(c => ({
      id: `edu:${c.id}`, label: c.name,
      text: `Counselled on ${c.name}; patient education leaflet offered (education library, ${cat.name})`,
      patient: `We talked about ${noBrackets(c.name)}. Ask us for the printed leaflet if you would like to read more.`,
    })),
  }));
  return [wound, ...templates, ...library];
}

export function counsellingLine(t: CounselTopic, id: string): PlanLine {
  return line(id, 'counselling', t.text, { patient: t.patient });
}

// ── Referrals ──────────────────────────────────────────────────────────────

/** Specialties from the investigation catalogue's consultation request list. */
export function referralSpecialties(): { group: string; items: { code: string; name: string }[] }[] {
  return (INVESTIGATION_CATALOG.find(c => c.category === 'consultation')?.groups ?? []).map(g => ({ group: g.group, items: g.items.map(i => ({ code: i.code, name: i.name })) }));
}

export function referralLine(specialty: string, reason: string, urgency: 'urgent' | 'soon' | 'routine', id: string): PlanLine {
  return line(id, 'referrals', `Refer to ${specialty}${reason.trim() ? `: ${reason.trim()}` : ''}`, { urgency });
}

// ── Follow-up ──────────────────────────────────────────────────────────────

/** 3 months is 84 days, as in the rules plan's 3-month review, so the two book on the same day. */
export const FOLLOW_UP_INTERVALS = [
  { id: '3d', label: 'In 3 days', days: 3 }, { id: '1w', label: 'In 1 week', days: 7 }, { id: '2w', label: 'In 2 weeks', days: 14 },
  { id: '4w', label: 'In 4 weeks', days: 28 }, { id: '6w', label: 'In 6 weeks', days: 42 }, { id: '3m', label: 'In 3 months', days: 84 },
  { id: '6m', label: 'In 6 months', days: 182 },
] as const;

/** Visit purposes, with the patient-copy wording (the wound check reuses the locale line). */
export const FOLLOW_UP_PURPOSES = [
  { id: 'wound', label: 'Wound review: measure and photograph', patient: P.wound.followUp.twoWeeks },
  { id: 'results', label: 'Review test results', patient: 'Review of your test results' },
  { id: 'postop', label: 'Post-operative review', patient: 'Check after your operation' },
  { id: 'sutures', label: 'Removal of sutures', patient: 'Removal of your stitches' },
  { id: 'dressing', label: 'Dressing change', patient: 'Change of your dressing' },
  { id: 'medicines', label: 'Review of medicines', patient: 'Review of your medicines' },
  { id: 'response', label: 'Review of response to treatment', patient: 'Check how the treatment is working' },
] as const;

export function followUpLine(intervalId: string, purpose: { id: string } | { other: string }, id: string): PlanLine {
  const iv = FOLLOW_UP_INTERVALS.find(x => x.id === intervalId) ?? FOLLOW_UP_INTERVALS[2];
  const known = 'id' in purpose ? FOLLOW_UP_PURPOSES.find(x => x.id === purpose.id) : undefined;
  const label = known?.label ?? ('other' in purpose ? purpose.other.trim() : 'Review');
  return line(id, 'follow_up', `${iv.label}: ${label}`, { followUp: { when: iv.label, purpose: label, days: iv.days }, patient: known?.patient ?? noBrackets(label) });
}

// ── Free text ──────────────────────────────────────────────────────────────

/** A free-text line; printed on the patient copy only when the clinician says so, and never with mg/kg or "e.g." in a medicine line. */
export function freeTextLine(section: PlanSection, text: string, onPatientCopy: boolean, id: string): PlanLine {
  const t = text.trim();
  const patient = onPatientCopy && !(section === 'medications' && PATIENT_MEDICINE_BANNED.test(t)) ? t : undefined;
  return line(id, section, t, patient ? { patient } : {});
}

// ── Duplicates ─────────────────────────────────────────────────────────────

const VAGUE_FIRST = new Set(['vitamin', 'oral', 'sodium', 'potassium', 'calcium', 'magnesium', 'normal', 'iron', 'zinc', 'folic']);
/** The medicine a line names: the formulary entry, else its first word (two for "vitamin C" and the like). */
export function drugKey(l: Pick<PlanLine, 'text' | 'medication'>): string | null {
  const name = l.medication?.drug ?? l.text;
  const hit = drugFromText(name);
  if (hit) return hit.id;
  const w = norm(name).split(' ').filter(Boolean);
  if (!w.length) return null;
  return VAGUE_FIRST.has(w[0]) && w[1] ? `${w[0]} ${w[1]}` : w[0];
}

/** Zinc / iron lines from the protocol are "Zinc (elemental)", the formulary says "Zinc Sulfate": the same medicine. */
const sameDrug = (a: string | null, b: string | null) => !!a && !!b && (a === b || a.split(/[_ ]/)[0] === b.split(/[_ ]/)[0] && ['zinc', 'ferrous', 'iron', 'folic'].includes(a.split(/[_ ]/)[0]));

/**
 * Lines already in the plan (rules, Claude's or the clinician's) that the
 * candidate repeats: same test or analyte, same medicine, same follow-up
 * interval, or the same words.
 */
export function duplicatesOf(c: PlanLine, existing: PlanLine[]): PlanLine[] {
  const ct = norm(c.text);
  return existing.filter(l => {
    if (l.id === c.id || l.section !== c.section) return false;
    if (norm(l.text) === ct) return true;
    switch (c.section) {
      case 'investigations': {
        if (c.test && l.test && c.test.id === l.test.id) return true;
        const a = new Set(c.test?.analytes ?? []);
        return (l.test?.analytes ?? []).some(x => a.has(x));
      }
      case 'medications': {
        const ck = drugKey(c), lk = drugKey(l);
        if (sameDrug(ck, lk)) return true;
        const ironish = (k: string | null) => !!k && /^(ferrous|iron)/.test(k);
        return ironish(ck) && ironish(lk);
      }
      case 'follow_up': return !!c.followUp?.days && c.followUp.days === l.followUp?.days;
      default: {
        const lt = norm(l.text);
        return ct.length > 6 && lt.length > 6 && (lt.includes(ct) || ct.includes(lt));
      }
    }
  });
}

/** Turn the builder's picks into lines with fresh ids. */
export function withIds<T>(section: PlanSection, items: T[], existing: Pick<PlanLine, 'id'>[], make: (item: T, id: string) => PlanLine, now = Date.now()): PlanLine[] {
  const ids = newManualIds(section, items.length, existing, now);
  return items.map((it, i) => make(it, ids[i]));
}
