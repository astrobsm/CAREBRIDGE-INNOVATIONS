/**
 * The live rules plan: a pure function of the clerking (and any results),
 * recomputed as the clinician types. No AI, no I/O.
 *
 *   conditions   from the chosen complaints (condition templates), plus
 *                free-text complaints (with their AI-drafted fields, if any)
 *   template     each template's own work-up, procedures, counselling,
 *                follow-up and referrals
 *   protocol     for wound conditions, the Wound Clinic Protocol exactly:
 *                baseline panel, targeted tests by situation, micronutrients
 *                (adult / child, weight-based for children and capped at the
 *                adult dose; child iron at the child table's own 200 mg/day
 *                maximum, owner decision 2026-11-27), monitoring schedule with the week-4 decision
 *                point, and its cautions as hard rules
 *   engine       nutrition targets from the nutrition engine
 *   guideline    analgesia (BNF / BNFc), always weight-based for children
 *
 * Every line carries its source. Hard rules are verbatim strings that an AI
 * draft must quote and that are always shown.
 */
import type { ClerkingData } from '../clerking/types';
import type { PatientContext } from '../clerking/engine';
import { woundNutritionTargets } from '../../nutrition/engine';
import { patientText } from '../../patient-pack/locale/en';
import { CONDITION_BY_ID, conditionsIn, type ConditionTemplate } from './conditions';
import type { ConditionContext, TemplateLine, WoundSignals } from './conditions/types';
import { patientFacts, type PatientFacts } from './facts';
import { doseText, weightDose } from './dosing';
import { ACTIVE_WOUND_PROTOCOL as WP } from './protocols/woundClinic.v1';
import { CHILD_HB_UNDER_6_MONTHS_NOTE, CHILD_IRON_OWNER_DECISION, SEVERE_ANAEMIA_HB_BELOW_GDL, SEVERE_ANAEMIA_SOURCE, childHbLimit, isMajorBurnTbsa } from './ownerDecisions';
import { plainMedicineLine } from './patientMedicine';
import type { PlanLine, PlanSource, RulesPlan } from './types';

export const RULES_ENGINE_VERSION = '1.0.0';
const P = patientText.plan;
const M = P.medicines;
const PROTOCOL_SRC: PlanSource = { kind: 'protocol', label: `Wound clinic protocol v${WP.version}` };
const ENGINE_SRC: PlanSource = { kind: 'engine', label: 'Nutrition engine (wound clinic protocol table)' };
const BNF_SRC: PlanSource = { kind: 'guideline', label: 'BNF / BNF for Children' };

/** Complaints whose patients the wound clinic protocol covers ("acute or chronic wounds, burns, ulcers or pressure injuries"). */
export const WOUND_COMPLAINTS = new Set([
  'chronic_ulcer', 'leg_ulcer', 'foot_ulcer', 'pressure_sore', 'wound_infection', 'wound_dehiscence', 'gangrene', 'sinus_fistula', 'skin_loss',
  'burn', 'electrical_burn', 'chemical_burn', 'burn_wound_old', 'ulcer_in_scar', 'acute_wound', 'animal_bite', 'snake_bite', 'noma',
]);
/** Acute wounds that are often repaired and discharged: the protocol is offered, not applied by default. */
const ACUTE_ONLY = new Set(['acute_wound', 'animal_bite', 'snake_bite', 'skin_loss']);

export interface PlanInput {
  data: ClerkingData;
  ctx: PatientContext;
  /** Latest results, canonical units, by analyte key. */
  labs?: Record<string, number>;
  /** Qualitative results by test id. */
  qualitative?: Record<string, string>;
  /** Extra templates chosen in the plan panel (working diagnosis). */
  conditionIds?: string[];
  /** Clinician override: apply (true) or do not apply (false) the wound clinic protocol. */
  woundProtocol?: boolean | null;
}

type Ans = string | string[] | number | undefined;
const asList = (v: Ans): string[] => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);

/** All answers in one map: complaint histories, then examination sections. */
export function mergedAnswers(data: ClerkingData): Record<string, Ans> {
  const out: Record<string, Ans> = {};
  for (const c of data.complaints) for (const [k, v] of Object.entries(c.answers || {})) if (out[k] === undefined) out[k] = v as Ans;
  for (const sec of Object.values(data.exam || {})) for (const [k, v] of Object.entries(sec || {})) if (out[k] === undefined) out[k] = v as Ans;
  return out;
}

export function conditionContext(data: ClerkingData, facts: PatientFacts): ConditionContext {
  const all = mergedAnswers(data);
  return {
    a: id => all[id],
    is: (id, ...values) => asList(all[id]).some(v => values.includes(v)),
    num: id => { const n = typeof all[id] === 'number' ? all[id] as number : parseFloat(String(all[id] ?? '')); return Number.isFinite(n) ? n : null; },
    has: id => asList(all[id]).length > 0,
    facts,
  };
}

function durationDays(d?: { value: number | null; unit: string }): number | null {
  if (!d?.value) return null;
  const f: Record<string, number> = { hours: 1 / 24, days: 1, weeks: 7, months: 30.4, years: 365 };
  return d.value * (f[d.unit] ?? 1);
}

/** Simple stable hash of the inputs (stale detection). */
export function hashInputs(v: unknown): string {
  const s = JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ── Wound signals (the protocol's "situations") ─────────────────────────────

function baseSignals(data: ClerkingData, c: ConditionContext, f: PatientFacts): WoundSignals {
  const woundComplaints = data.complaints.filter(x => WOUND_COMPLAINTS.has(x.complaintId));
  const longest = Math.max(0, ...woundComplaints.map(x => durationDays(x.duration) ?? 0));
  const sites = asList(c.a('wound_site'));
  const tbsa = c.num('tbsa_percent');
  const burn = data.complaints.some(x => ['burn', 'electrical_burn', 'chemical_burn'].includes(x.complaintId));
  // Owner decision 2026-11-27: TBSA 15% or more (adults), 10% or more (children); BBA / NICE.
  const majorBurn = burn && tbsa != null && isMajorBurnTbsa(tbsa, f.isChild);
  const l = c.num('wound_length'), w = c.num('wound_width');
  return {
    infected: c.is('wound_discharge', 'Purulent (pus)', 'Foul-smelling', 'Greenish (Pseudomonas-like)', 'Seropurulent') || c.is('wound_odour', 'Yes')
      || c.is('wound_infection', 'Local (redness, warmth, pus)', 'Spreading', 'Systemic (fever, tachycardia)') || c.is('wound_exudate_type', 'Purulent', 'Green', 'Foul-smelling')
      || c.is('wound_surrounding', 'Erythema > 2 cm (cellulitis)') || c.is('burn_wound_state', 'Infected'),
    febrile: f.febrile,
    boneInvolved: c.is('wound_base', 'Bone palpable (probe-to-bone)') || c.is('wound_floor', 'Exposed bone'),
    diabeticFootNonHealing: false,
    legOrFootUlcer: sites.some(s => ['Leg (shin / calf)', 'Ankle', 'Foot (dorsum)', 'Foot (sole / heel)', 'Toe(s)'].includes(s)) || data.complaints.some(x => ['leg_ulcer', 'foot_ulcer'].includes(x.complaintId)),
    venousSuspected: c.is('vasc_varicose', 'Yes') || c.is('vasc_previous_dvt', 'Yes') || c.is('wound_surrounding', 'Lipodermatosclerosis', 'Hyperpigmentation'),
    biopsyIndicated: longest > 90 || c.is('wound_heaped_edge', 'Yes') || c.is('wound_on_scar', 'Yes') || c.is('wound_edge', 'Rolled / raised (pearly)', 'Everted') || c.is('wound_floor', 'Fungating / cauliflower'),
    vasculitisSuspected: false,
    largeBurnOrPoorIntake: majorBurn || f.poorIntake,
    b12FolateSuspected: f.poorIntake || (f.labs.mcv != null && f.labs.mcv > 100),
    copperSuspected: false,
    thyroidSuspected: f.thyroidDisease,
    childPoorGrowth: f.isChild && (f.malnourished || f.poorIntake),
    pressureInjuryStage2Plus: false,
    largeExudingWound: c.is('wound_exudate', 'Heavy') || (l != null && w != null && l * w >= 25) || burn,
    majorBurn,
    largeOrDeep: (l != null && w != null && l * w >= 25) || (c.num('wound_depth') ?? 0) >= 1 || c.is('wound_floor', 'Exposed bone', 'Exposed tendon'),
  };
}

function signalsFor(data: ClerkingData, c: ConditionContext, f: PatientFacts, templates: ConditionTemplate[]): WoundSignals {
  const s = baseSignals(data, c, f);
  for (const t of templates) {
    const extra = t.woundSignals?.(c) ?? {};
    for (const [k, v] of Object.entries(extra)) if (v) (s as unknown as Record<string, boolean>)[k] = true;
  }
  return s;
}

// ── Protocol lines ─────────────────────────────────────────────────────────

const row = <T extends { id: string }>(rows: readonly T[], id: string) => rows.find(r => r.id === id)!;
const TESTS = WP.baseline;
const TARGETED = WP.targeted;
const ADULT = WP.adultMicronutrients.rows;
const CHILD = WP.childMicronutrients.rows;
const T = WP.thresholds;
const highCrp = (f: PatientFacts) => f.labs.crp != null && f.labs.crp > T.highCrpAboveMgL;

/** Iron deficiency per the protocol: ferritin below 30, or below 100 with high CRP. */
export function ironDeficient(f: PatientFacts): boolean | null {
  const fe = f.labs.ferritin;
  if (fe == null) return null;
  return fe < T.ferritinLowNgMl || (fe < T.ferritinLowWithHighCrpNgMl && highCrp(f));
}

/**
 * Anaemia: adults Hb below the protocol's 10 g/dL. Children (the protocol
 * says "low Hb"): the owner's cut-offs of 2026-11-27 (ownerDecisions.ts:
 * WHO 2024 at 6–11 months, Buseri et al. 2010, Port Harcourt, from 1 to 17
 * years). Under 6 months no cut-off is applied: null (interpret against
 * neonatal / infant ranges).
 */
export function anaemic(f: PatientFacts): boolean | null {
  const hb = f.labs.hb;
  if (hb == null) return null;
  if (!f.isChild) return hb < T.hbAdultMinGdl;
  const limit = childHbLimit(f.ageMonths ?? (f.ageYears ?? 0) * 12, f.sex).belowGdl;
  return limit == null ? null : hb < limit;
}

function protocolLines(f: PatientFacts, s: WoundSignals, templates: ConditionTemplate[]): { lines: TemplateLine[]; hard: string[] } {
  const lines: TemplateLine[] = [];
  const hard: string[] = [];
  const src = (l: TemplateLine): TemplateLine => ({ ...l, sourceLabel: PROTOCOL_SRC.label });
  const add = (l: TemplateLine) => lines.push(src(l));

  // Baseline panel, every new wound patient.
  for (const t of TESTS) {
    add({
      id: `inv:wp_${t.id}`, section: 'investigations', text: t.test, why: `${t.why}. Target / action: ${t.target}`,
      test: { id: t.id, analytes: t.analytes ? [...t.analytes] : undefined, qualitative: t.analytes ? undefined : { options: t.qualitative?.options ? [...t.qualitative.options] : undefined }, target: t.target },
      patient: (P.tests as Record<string, string>)[t.id],
    });
  }
  // Targeted tests by situation.
  const targeted: Array<[boolean, string, string]> = [
    [s.infected, 'infected', 'culture'], [s.boneInvolved || s.diabeticFootNonHealing, 'bone', 'xray'], [s.legOrFootUlcer, 'leg_foot_ulcer', 'abpi'],
    [s.venousSuspected, 'venous', 'duplex'], [s.biopsyIndicated, 'biopsy', 'biopsy'], [s.vasculitisSuspected, 'vasculitis', 'vasculitis'],
    [s.largeBurnOrPoorIntake, 'burns_intake', 'minerals'], [s.b12FolateSuspected, 'b12_folate', 'b12_folate'], [s.copperSuspected, 'copper', 'copper'],
    [s.thyroidSuspected, 'thyroid', 'thyroid'], [s.childPoorGrowth, 'child_growth', 'child_growth'],
  ];
  for (const [on, id, testId] of targeted) {
    if (!on) continue;
    const r = row(TARGETED, id);
    add({ id: `inv:wpt_${id}`, section: 'investigations', text: r.investigation, why: r.situation, urgency: id === 'biopsy' || (id === 'infected' && s.febrile) ? 'soon' : 'routine',
      test: { id: testId, analytes: id === 'b12_folate' ? ['b12', 'folate'] : id === 'burns_intake' ? ['magnesium', 'phosphate', 'calcium'] : undefined },
      patient: (P.tests as Record<string, string>)[testId] });
    if (id === 'infected' && s.febrile) add({ id: 'inv:wpt_blood_culture', section: 'investigations', text: 'Blood culture', why: 'Clinically infected wound and febrile', test: { id: 'blood_culture' }, urgency: 'soon', patient: P.tests.blood_culture });
  }

  // Micronutrients.
  const pressure = templates.some(t => t.id === 'pressure_injury') || s.pressureInjuryStage2Plus;
  const burns = s.majorBurn || s.largeBurnOrPoorIntake && !f.poorIntake;
  const zincLow = f.labs.zinc != null ? f.labs.zinc < T.zincLowMcgDl : null;
  const vitDLow = f.labs.vitaminD != null ? f.labs.vitaminD < T.vitaminDDeficientBelowNgMl : null;
  const ironDef = ironDeficient(f), anaemia = anaemic(f);
  const provenIronDeficiencyAnaemia = ironDef === true && anaemia === true;
  const mayBePregnant = f.pregnancy === 'confirmed' || f.pregnancy === 'possible' || f.pregnancy === 'unknown';
  const pregnant = f.pregnancy === 'confirmed' || f.pregnancy === 'possible';
  const H = WP.cautions;
  // The clinician line keeps the protocol's wording; `patient` is the plain locale line (owner decision 2026-11-27).
  const medLine = (id: string, nutrient: string, dose: string, frequency: string, duration: string, why: string, patient: string, o: Partial<TemplateLine> & { cautions?: string[]; weightBasis?: string; route?: string } = {}): TemplateLine => ({
    id: `med:wp_${id}`, section: 'medications', text: `${nutrient}: ${dose}${frequency ? ` ${frequency}` : ''}${duration ? ` — ${duration}` : ''}`, why,
    medication: { drug: nutrient, dose, route: o.route ?? 'oral', frequency, duration, weightBasis: o.weightBasis, cautions: o.cautions ?? [] },
    ...o,
    patient,
  });
  /** "100–125 mg daily" → "100–125 mg"; "2,000 IU daily" → "2,000 units" (patient copy). */
  const amount = (t: string) => t.replace(/\s+(once )?daily$/, '').replace(/\bIU\b/g, 'units');

  if (f.isNeonate) {
    hard.push(WP.childMicronutrients.principle);
    add({ id: 'ref:wp_neonate', section: 'referrals', text: 'Neonatal / paediatric input for micronutrients and nutrition', why: 'Neonates and preterm infants need neonatal or paediatric input (protocol)', urgency: 'soon' });
  } else if (f.isChild) {
    hard.push(WP.childMicronutrients.principle, row(CHILD, 'vitamin_a').duration);
    const w = f.weightKg;
    const D = WP.childDosing;
    const mv = row(CHILD, 'multivitamin');
    add(medLine('multivitamin', mv.nutrient, mv.dose, '', mv.duration, `${mv.who} (protocol)`, M.multivitamin({ child: true })));
    if (f.poorIntake || burns || s.majorBurn) {
      const band = D.vitaminC.find(b => (f.ageYears ?? 0) < b.belowYears)!;
      add(medLine('vitamin_c', 'Vitamin C', band.dose, '', row(CHILD, 'vitamin_c').duration, `${row(CHILD, 'vitamin_c').who} (protocol)`, M.vitamin_c({ child: true, dose: amount(band.dose) }), { cautions: [H.vitaminC] }));
    }
    if (zincLow || f.malnourished || burns || s.majorBurn || zincLow === null && s.largeExudingWound) {
      const z = row(CHILD, 'zinc');
      const d = w ? weightDose({ perKg: D.zinc.mgPerKg, weightKg: w, maxDose: D.zinc.maxMgPerDay, adultDose: D.adultCapMg.zinc }) : null;
      add(medLine('zinc', 'Zinc (elemental)', d ? `${doseText(d)} once daily` : z.dose, '', z.duration, zincLow ? `Serum zinc ${f.labs.zinc} mcg/dL (below ${T.zincLowMcgDl})${highCrp(f) ? ' — may be falsely low with high CRP' : ''}` : `${z.who} (protocol)`,
        M.zinc({ child: true, dose: d ? doseText(d) : null }), { weightBasis: d?.basis ?? 'Weight needed: 0.5–1 mg/kg once daily (maximum 40 mg/day)', cautions: [H.zinc] }));
      hard.push(H.zinc);
    } else if (zincLow === false) {
      add({ id: 'med:wp_zinc', section: 'medications', text: 'Zinc: not indicated', why: `Serum zinc ${f.labs.zinc} mcg/dL is not low`, withheld: 'Serum zinc not low' });
    }
    const ir = row(CHILD, 'iron');
    if (provenIronDeficiencyAnaemia) {
      // Owner decision 2026-11-27: the child table's maximum (200 mg/day) is the cap, not the 65 mg adult dose.
      const severe = f.labs.hb! < SEVERE_ANAEMIA_HB_BELOW_GDL;
      const perKg = severe ? { low: D.iron.mgPerKg, high: D.iron.severeMgPerKg } : D.iron.mgPerKg;
      const d = w ? weightDose({ perKg, weightKg: w, maxDose: D.iron.maxMgPerDay, adultDose: CHILD_IRON_OWNER_DECISION.capAtAdultDose ? D.adultCapMg.iron : undefined }) : null;
      const severeNote = severe ? `; severe anaemia (Hb below ${SEVERE_ANAEMIA_HB_BELOW_GDL} g/dL, ${SEVERE_ANAEMIA_SOURCE}): up to ${D.iron.severeMgPerKg} mg/kg/day` : '';
      const perKgText = severe ? `${D.iron.mgPerKg}–${D.iron.severeMgPerKg} mg/kg` : `${D.iron.mgPerKg} mg/kg`;
      const freq = severe ? 'daily' : 'once daily';
      add(medLine('iron', 'Iron (elemental)', d ? `${doseText(d)} ${freq}` : `${perKgText} ${freq} (maximum ${D.iron.maxMgPerDay} mg/day)`, '', ir.duration, `Low Hb (${f.labs.hb} g/dL) and low ferritin (${f.labs.ferritin} ng/mL)`,
        M.iron({ child: true, dose: d ? doseText(d) : null, severe }), { weightBasis: `${d?.basis ?? `Weight needed: ${perKgText} ${freq}`}; child table maximum ${D.iron.maxMgPerDay} mg/day, not capped at the adult dose (${CHILD_IRON_OWNER_DECISION.source})${severeNote}`, cautions: [H.iron, 'Treat malaria and worms first; avoid during acute severe infection.'],
          withheld: f.sepsis ? 'Acute severe infection: the protocol says avoid iron now' : undefined }));
      hard.push(H.iron, CHILD_IRON_OWNER_DECISION.hardRule);
    } else {
      const infantHb = anaemia === null && f.labs.hb != null;
      const awaiting = infantHb ? CHILD_HB_UNDER_6_MONTHS_NOTE : ironDef === null || anaemia === null ? 'Awaiting FBC and ferritin' : null;
      add({ id: 'med:wp_iron', section: 'medications', text: 'Iron: only for iron-deficiency anaemia (low Hb and low ferritin)', why: awaiting ?? 'Not iron-deficiency anaemia on the results', withheld: awaiting ?? 'Not indicated on the results' });
    }
    if (f.sickleCell || (f.labs.folate != null && f.labs.folate < 3)) {
      const d = (f.ageYears ?? 0) < 1 && w ? weightDose({ perKg: D.folicAcid.under1McgPerKg / 1000, weightKg: w, maxDose: D.folicAcid.under1MaxMg, adultDose: D.adultCapMg.folicAcid }) : null;
      add(medLine('folic_acid', 'Folic acid', d ? `${doseText(d)} daily` : (f.ageYears ?? 0) < 1 ? '500 mcg/kg daily (maximum 5 mg)' : `${D.folicAcid.from1Mg} mg daily${f.sickleCell ? ' (sickle cell maintenance per local protocol, often 2.5–5 mg daily)' : ''}`, '', row(CHILD, 'folic_acid').duration,
        f.sickleCell ? 'Sickle cell disease (protocol)' : 'Folate deficiency', M.folic_acid({ child: true, dose: d ? doseText(d) : (f.ageYears ?? 0) < 1 ? null : `${D.folicAcid.from1Mg} mg`, continuous: f.sickleCell }), { weightBasis: d?.basis }));
    }
    if (vitDLow) {
      const band = D.vitaminD.find(b => (f.ageYears ?? 0) < b.belowYears)!;
      add(medLine('vitamin_d', 'Vitamin D3', band.dose, '', `12 weeks, then ${band.then}. Give with calcium if intake is poor`, `25-OH vitamin D ${f.labs.vitaminD} ng/mL (below ${T.vitaminDDeficientBelowNgMl})`,
        M.vitamin_d({ child: true, dose: amount(band.dose), then: amount(band.then) }), { cautions: [H.vitaminD] }));
      hard.push(H.vitaminD);
    }
    if (f.labs.b12 != null && f.labs.b12 < 200) add(medLine('b12', 'Vitamin B12 (hydroxocobalamin)', '1 mg IM, with specialist advice', '', 'Specialist follow-up', 'Proven B12 deficiency', M.b12({ child: true }), { route: 'IM' }));
  } else {
    hard.push(WP.doseNote);
    const mv = row(ADULT, 'multivitamin');
    if (pregnant) add({ id: 'med:wp_antenatal', section: 'medications', text: 'Standard antenatal supplement and folic acid (instead of a routine multivitamin)', why: H.pregnancy,
      medication: { drug: 'Antenatal supplement with folic acid', dose: 'per product', route: 'oral', frequency: 'once daily', duration: 'through pregnancy', cautions: [H.pregnancy] }, patient: M.antenatal() });
    else add(medLine('multivitamin', mv.nutrient, mv.dose, '', mv.duration, `${mv.who} (protocol)`, M.multivitamin({ child: false })));
    if (f.poorIntake || f.smoker || pressure) {
      const c = row(ADULT, 'vitamin_c');
      add(medLine('vitamin_c', 'Vitamin C (ascorbic acid)', c.dose, '', c.duration, [f.poorIntake && 'poor diet', f.smoker && 'smoker', pressure && 'pressure injury'].filter(Boolean).join(', ') + ' (protocol)', M.vitamin_c({ child: false }),
        { cautions: [H.vitaminC], withheld: f.ckd ? 'Renal impairment: avoid high-dose vitamin C (protocol) — reduce or omit' : undefined }));
      hard.push(H.vitaminC);
    }
    const z = row(ADULT, 'zinc');
    if (zincLow || f.malnourished || s.largeExudingWound || s.majorBurn || burns) {
      add(medLine('zinc', 'Zinc (elemental)', z.dose, '', z.duration,
        zincLow ? `Serum zinc ${f.labs.zinc} mcg/dL (below ${T.zincLowMcgDl})${highCrp(f) ? ' — may be falsely low with high CRP' : ''}` : `${[f.malnourished && 'malnutrition', s.largeExudingWound && 'large exuding wound', (s.majorBurn || burns) && 'burns'].filter(Boolean).join(', ')} (protocol)`, M.zinc({ child: false }),
        { cautions: [H.zinc, ...(f.ckd ? ['Renal impairment: review zinc (protocol).'] : [])] }));
      hard.push(H.zinc);
    } else if (zincLow === false) add({ id: 'med:wp_zinc', section: 'medications', text: 'Zinc: not indicated', why: `Serum zinc ${f.labs.zinc} mcg/dL is not low`, withheld: 'Serum zinc not low' });
    const ir = row(ADULT, 'iron');
    if (provenIronDeficiencyAnaemia) {
      add(medLine('iron', 'Iron (elemental)', ir.dose, '', ir.duration, `Iron-deficiency anaemia: Hb ${f.labs.hb} g/dL, ferritin ${f.labs.ferritin} ng/mL${highCrp(f) ? ` with CRP ${f.labs.crp} mg/L` : ''}`, M.iron({ child: false }), { cautions: [H.iron, ...(f.sickleCell ? [H.sickleCell] : [])] }));
      hard.push(H.iron);
    } else {
      add({ id: 'med:wp_iron', section: 'medications', text: `Iron: ${ir.who.toLowerCase()} only`, why: ironDef === null || anaemia === null ? 'Awaiting FBC and ferritin' : 'Not iron-deficiency anaemia on the results',
        withheld: f.sickleCell ? 'Sickle cell disease: no empiric iron — only for proven iron deficiency' : ironDef === null || anaemia === null ? 'Awaiting FBC and ferritin' : 'Not indicated on the results' });
    }
    if (f.sickleCell || (f.labs.folate != null && f.labs.folate < 3) || (f.labs.mcv != null && f.labs.mcv > 100)) {
      const fa = row(ADULT, 'folic_acid');
      add(medLine('folic_acid', 'Folic acid', fa.dose, '', fa.duration, f.sickleCell ? 'Sickle cell disease (protocol)' : f.labs.mcv != null && f.labs.mcv > 100 ? `Macrocytosis (MCV ${f.labs.mcv} fL)` : 'Folate deficiency', M.folic_acid({ child: false, continuous: f.sickleCell })));
    }
    if (f.labs.b12 != null && f.labs.b12 < 200) { const b = row(ADULT, 'b12'); add(medLine('b12', 'Vitamin B12', b.dose, '', b.duration, 'Proven B12 deficiency', M.b12({ child: false }), { route: 'IM' })); }
    if (vitDLow) { const d = row(ADULT, 'vitamin_d'); add(medLine('vitamin_d', 'Vitamin D3', d.dose, '', d.duration, `25-OH vitamin D ${f.labs.vitaminD} ng/mL (below ${T.vitaminDDeficientBelowNgMl})`, M.vitamin_d({ child: false }), { cautions: [H.vitaminD] })); hard.push(H.vitaminD); }
    if (f.steroids) {
      const a = row(ADULT, 'vitamin_a');
      const why = mayBePregnant && f.sex === 'female' ? 'Pregnancy not excluded: NOT in pregnancy or women who may be pregnant' : f.liverDisease ? 'Liver disease: avoid vitamin A' : undefined;
      add(medLine('vitamin_a', 'Vitamin A', a.dose, '', '10–14 days only', 'On steroids with poor healing (protocol)', M.vitamin_a(), { cautions: [a.duration, H.vitaminA], withheld: why }));
    }
    if (pressure && s.pressureInjuryStage2Plus && f.malnourished) {
      const ar = row(ADULT, 'arginine');
      add(medLine('arginine', 'Arginine', ar.dose, '', 'while the pressure injury is open', `${ar.who} (protocol)`, M.arginine(), { cautions: [ar.duration], withheld: f.sepsis ? 'Sepsis: avoid arginine (protocol)' : undefined }));
      hard.push('Arginine: avoid in sepsis.');
    }
    hard.push(WP.adultMicronutrients.upperLimits);
  }
  // Hard rules that depend on the patient, verbatim.
  if (f.sex === 'female' && f.pregnancy !== 'not_applicable' && f.pregnancy !== 'excluded') hard.push(row(ADULT, 'vitamin_a').duration, H.vitaminA);
  if (pregnant || f.breastfeeding) hard.push(H.pregnancy);
  if (f.sickleCell) hard.push(H.sickleCell);
  if (f.ckd) hard.push(H.renal);
  if (f.liverDisease) hard.push(H.vitaminA);

  // Monitoring and follow-up (protocol schedule).
  hard.push(WP.monitoring.principle);
  for (const m of WP.monitoring.rows) {
    if (m.id === 'children' && !f.isChild) continue;
    if (m.id === 'zinc_review' && !lines.some(l => l.id === 'med:wp_zinc' && !l.withheld)) continue;
    add({ id: `mon:wp_${m.id}`, section: 'monitoring', text: `${m.when}: ${m.what}`, patient: m.id === 'every_visit' ? P.wound.monitoring : m.id === 'week4' ? P.wound.week4 : undefined });
  }
  add({ id: 'fu:wp_2w', section: 'follow_up', text: 'In 2 weeks: measure and photograph; % change in area from baseline', followUp: { when: 'In 2 weeks', purpose: 'Wound review: measure, photograph, % area change', days: 14 }, patient: P.wound.followUp.twoWeeks });
  add({ id: 'fu:wp_week4', section: 'follow_up', text: 'Week 4: decision point — if under 40–50% smaller, re-investigate and change the plan', followUp: { when: 'Week 4', purpose: 'Wound review: 4-week decision point (40–50% smaller?)', days: 28 }, patient: P.wound.followUp.week4 });
  if (f.diabetes || lines.some(l => ['med:wp_iron', 'med:wp_vitamin_d'].includes(l.id) && !l.withheld)) add({ id: 'fu:wp_3m', section: 'follow_up', text: 'At 3 months: HbA1c (diabetics); ferritin and Hb after starting iron; vitamin D after a loading course', followUp: { when: 'At 3 months', purpose: 'Repeat blood tests (protocol)', days: 84 }, patient: P.wound.followUp.bloods });
  if (lines.some(l => l.id === 'med:wp_zinc' && !l.withheld)) add({ id: 'fu:wp_zinc', section: 'follow_up', text: 'After 8–12 weeks of zinc: repeat serum zinc; stop zinc once the wound has epithelialised', followUp: { when: 'At 8 weeks', purpose: 'Repeat serum zinc; stop zinc if healed', days: 56 }, patient: P.wound.followUp.zinc });
  return { lines, hard };
}

// ── Nutrition (engine) ─────────────────────────────────────────────────────

function nutritionLines(f: PatientFacts, s: WoundSignals): TemplateLine[] {
  const t = woundNutritionTargets({ ageYears: f.ageYears, weightKg: f.weightKg, largeOrDeepWound: s.largeOrDeep, majorBurn: s.majorBurn, ckdNonDialysis: f.ckd });
  const fmt = (e: typeof t.energy) => (e.value ? (e.value.low === e.value.high ? `${e.value.low} ${e.unit}` : `${e.value.low}–${e.value.high} ${e.unit}`) : null);
  const one = (k: 'energy' | 'protein' | 'fluid', label: string): TemplateLine => {
    const e = t[k];
    return { id: `nut:${k}`, section: 'nutrition', sourceLabel: ENGINE_SRC.label,
      text: `${label}: ${fmt(e) ?? 'not computed'} (${e.formula})`, why: [e.method, ...e.warnings].join('. ') };
  };
  const lines: TemplateLine[] = [one('energy', 'Energy'), one('protein', 'Protein'), one('fluid', 'Fluid')];
  lines[0].patient = P.copy.foodLine(fmt(t.energy)?.replace('kcal/day', 'kcal') ?? null, fmt(t.protein)?.replace('g/day', 'g') ?? null, fmt(t.fluid)?.replace('mL/day', 'mL') ?? null);
  if (!t.energy.value && !t.protein.value && !t.fluid.value) lines[0].patient = undefined;
  lines.push({ id: 'nut:screen', section: 'nutrition', sourceLabel: PROTOCOL_SRC.label, text: f.isChild ? 'Nutrition screen with STRONGkids; weight-for-age and MUAC' : 'Nutrition screen with MUST; weight, height, BMI, MUAC', why: 'Identifies malnutrition early (protocol)' });
  lines.push({ id: 'nut:foods', section: 'nutrition', sourceLabel: PROTOCOL_SRC.label, text: t.notes.slice(1).join(' '), patient: P.copy.foods });
  if (f.poorIntake || f.malnourished) lines.push({ id: 'nut:ons', section: 'nutrition', sourceLabel: PROTOCOL_SRC.label, text: 'High-protein oral supplement drink between meals (intake poor)', patient: P.copy.drink });
  return lines;
}

// ── Analgesia (BNF / BNFc) ─────────────────────────────────────────────────

function analgesiaLines(f: PatientFacts): TemplateLine[] {
  const out: TemplateLine[] = [];
  const w = f.weightKg;
  if (f.isNeonate) return [{ id: 'med:analgesia', section: 'medications', text: 'Analgesia: neonatal dosing with paediatric input', why: 'Under 1 month', sourceLabel: BNF_SRC.label }];
  if (f.isChild) {
    const d = w ? weightDose({ perKg: 15, weightKg: w, maxDose: 1000, adultDose: 1000 }) : null;
    out.push({ id: 'med:paracetamol', section: 'medications', sourceLabel: BNF_SRC.label, text: `Paracetamol ${d ? doseText(d) : '15 mg/kg'} every 6 hours when needed (maximum 4 doses in 24 hours)`, why: 'Pain',
      medication: { drug: 'Paracetamol', dose: d ? doseText(d) : '15 mg/kg', route: 'oral', frequency: 'every 6 hours when needed (max 4 doses / 24 h)', duration: 'as needed', weightBasis: d?.basis ?? 'Weight needed: 15 mg/kg per dose', cautions: ['Check the syrup strength (mg per 5 mL).'] },
      patient: M.paracetamol({ child: true, dose: d ? doseText(d) : null }) });
    if ((f.ageMonths ?? 0) >= 3 && (w ?? 0) >= 5) {
      const i = weightDose({ perKg: { low: 5, high: 10 }, weightKg: w!, maxDose: 400, adultDose: 400 });
      const why = f.nsaidAllergy ? 'NSAID allergy recorded' : f.ckd ? 'Kidney disease' : f.anticoagulated ? 'On an anticoagulant' : undefined;
      out.push({ id: 'med:ibuprofen', section: 'medications', sourceLabel: BNF_SRC.label, text: `Ibuprofen ${doseText(i)} every 8 hours with food when needed`, why: 'Pain / inflammation',
        medication: { drug: 'Ibuprofen', dose: doseText(i), route: 'oral', frequency: 'every 8 hours with food when needed', duration: 'as needed', weightBasis: i.basis, cautions: ['Avoid in dehydration, kidney disease, asthma worsened by NSAIDs.'] },
        withheld: why, patient: M.ibuprofen({ child: true, dose: doseText(i) }) });
    }
    return out;
  }
  const light = (w != null && w < 50) || f.liverDisease;
  out.push({ id: 'med:paracetamol', section: 'medications', sourceLabel: BNF_SRC.label, text: `Paracetamol ${light ? '500 mg–1 g' : '1 g'} every 6 hours when needed (maximum ${light ? '3 g' : '4 g'} in 24 hours)`, why: 'Pain',
    medication: { drug: 'Paracetamol', dose: light ? '500 mg–1 g' : '1 g', route: 'oral', frequency: 'every 6 hours when needed', duration: 'as needed', cautions: [light ? 'Weight under 50 kg or liver disease: maximum 3 g a day.' : 'Maximum 4 g in 24 hours.'] },
    patient: M.paracetamol({ child: false, light }) });
  const why = f.nsaidAllergy ? 'NSAID allergy recorded' : f.ckd ? 'Kidney disease' : f.anticoagulated ? 'On an anticoagulant' : f.pregnancy === 'confirmed' || f.pregnancy === 'possible' ? 'Pregnancy possible: avoid NSAIDs' : undefined;
  out.push({ id: 'med:ibuprofen', section: 'medications', sourceLabel: BNF_SRC.label, text: 'Ibuprofen 400 mg three times a day with food when needed', why: 'Pain / inflammation',
    medication: { drug: 'Ibuprofen', dose: '400 mg', route: 'oral', frequency: 'three times a day with food when needed', duration: 'shortest time needed', cautions: ['Avoid in peptic ulcer, kidney disease, heart failure, anticoagulation, pregnancy.'] },
    withheld: why, patient: M.ibuprofen({ child: false }) });
  return out;
}

// ── The plan ───────────────────────────────────────────────────────────────

const painNoted = (c: ConditionContext) =>
  c.is('wound_pain', 'Mild', 'Moderate', 'Severe', 'Pain out of proportion') || (c.num('pain_score') ?? 0) > 0 || c.is('lump_painful', 'Painful', 'Tender only when touched')
  || c.is('severity', 'Moderate — limits some activities', 'Severe — limits most activities', 'Very severe — incapacitating');

export function buildRulesPlan(input: PlanInput): RulesPlan {
  const { data, ctx } = input;
  const facts = patientFacts({ data, ctx, labs: input.labs, qualitative: input.qualitative });
  const c = conditionContext(data, facts);
  const templates = [...conditionsIn(data)];
  for (const id of input.conditionIds ?? []) { const t = CONDITION_BY_ID[id]; if (t && !templates.includes(t)) templates.push(t); }

  const raw: Array<TemplateLine & { _src: PlanSource }> = [];
  const hard: string[] = [];
  const push = (l: TemplateLine, s: PlanSource) => raw.push({ ...l, _src: l.sourceLabel ? { kind: s.kind, label: l.sourceLabel } : s });

  // Free-text complaints (no template): problem line; AI-drafted fields noted.
  const free = data.complaints.filter(x => x.complaintId === 'other' || (!templates.some(t => t.complaintIds.includes(x.complaintId) || `cond_${t.id}` === x.complaintId) && x.aiFields));
  for (const x of free) push({ id: `pr:free_${x.uid}`, section: 'problems', text: `${x.label}${x.aiFields ? ` (AI-drafted fields${x.aiFields.status === 'approved' ? ', approved' : ', not yet approved'})` : ' (no template)'}`, patient: x.label }, { kind: 'clerking', label: 'Clerking (free-text complaint)' });

  for (const t of templates) {
    const src: PlanSource = { kind: 'template', label: `${t.label} template` };
    for (const l of t.plan(c)) push(l, src);
    hard.push(...(t.hardRules?.(c) ?? []));
  }

  const woundByComplaint = data.complaints.some(x => WOUND_COMPLAINTS.has(x.complaintId) && !ACUTE_ONLY.has(x.complaintId));
  const applyWound = input.woundProtocol ?? (templates.some(t => t.woundProtocol) || woundByComplaint);
  if (applyWound) {
    const s = signalsFor(data, c, facts, templates);
    const p = protocolLines(facts, s, templates);
    for (const l of p.lines) push(l, PROTOCOL_SRC);
    hard.push(...p.hard);
    for (const l of nutritionLines(facts, s)) push(l, ENGINE_SRC);
  }

  const hasProcedure = raw.some(l => l.section === 'procedures');
  if (painNoted(c) || hasProcedure || applyWound) for (const l of analgesiaLines(facts)) push(l, BNF_SRC);
  if (facts.penicillinAllergy) hard.push('Penicillin allergy recorded: no penicillin-class antibiotic (including co-amoxiclav and flucloxacillin).');
  if (facts.isChild && !facts.isNeonate && !applyWound) hard.push('Children: dose by weight, never above the adult dose.');

  // De-duplicate by id (first wins) and by investigation test id across sources.
  const seen = new Set<string>();
  const seenTests = new Set<string>();
  const lines: PlanLine[] = [];
  for (const l of raw) {
    if (seen.has(l.id)) continue;
    if (l.test && l.section === 'investigations' && !['xray', 'ultrasound', 'biopsy', 'culture', 'syndrome_screen', 'hormones', 'breast_imaging'].includes(l.test.id) && seenTests.has(l.test.id)) continue;
    seen.add(l.id);
    if (l.test) seenTests.add(l.test.id);
    const { _src, sourceLabel: _sl, ...rest } = l;
    if (rest.section === 'medications' && rest.medication && !rest.patient) rest.patient = plainMedicineLine(rest.medication);
    lines.push({ ...rest, source: _src });
  }

  const missing: string[] = [];
  if (facts.ageYears == null) missing.push('Age (date of birth)');
  if (facts.weightKg == null) missing.push('Weight — needed for doses and nutrition targets');
  if (facts.sex === 'female' && facts.pregnancy === 'unknown') missing.push('Pregnancy status');
  if (!data.allergyStatus || data.allergyStatus === 'not_asked') missing.push('Allergy status');
  if (!data.complaints.length) missing.push('A presenting complaint or condition');

  return {
    engineVersion: RULES_ENGINE_VERSION,
    protocolVersion: applyWound ? WP.version : null,
    conditions: [
      ...templates.map(t => ({ id: t.id, label: t.label })),
      ...free.map(x => ({ id: `free:${x.uid}`, label: x.label, aiDrafted: !!x.aiFields })),
    ],
    woundProtocolApplied: applyWound,
    lines,
    hardRules: [...new Set(hard)],
    missing,
    inputsHash: hashInputs({ data, ctx, labs: input.labs ?? {}, q: input.qualitative ?? {}, conditionIds: input.conditionIds ?? [], wp: input.woundProtocol ?? null }),
  };
}

/** Patient-copy warning signs for the plan's conditions (locale). */
export function warningSigns(plan: Pick<RulesPlan, 'conditions' | 'woundProtocolApplied'>): string[] {
  const out: string[] = [];
  for (const c of plan.conditions) {
    const L = (P.conditions as Record<string, { warning: readonly string[] }>)[c.id];
    if (L) out.push(...L.warning);
  }
  if (plan.woundProtocolApplied) out.push(...P.wound.warning);
  // The wound list already covers fever; keep one fever line.
  out.push(...P.copy.generalWarning.filter(w => !(plan.woundProtocolApplied && /fever/i.test(w))));
  return [...new Set(out)];
}
