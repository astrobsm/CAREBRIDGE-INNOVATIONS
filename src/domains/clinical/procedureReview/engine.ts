/**
 * The procedure-review engine: compose, score, flag, measure, narrate.
 *
 * Pure and deterministic — no DOM, no database, no clock. Given the same
 * module, phase, answers, patient and prior reviews it returns the same
 * reading, which is what makes it testable and what lets a signed review be
 * re-read years later exactly as it was.
 *
 * NOTHING IS RE-IMPLEMENTED HERE. Visibility, answer flags and completeness
 * are the guided-history engine's (services/templateEngine); Caprini, Braden
 * and MUST are riskCalculators'; ASA, airway, RCRI, functional capacity,
 * STOP-BANG and bleeding risk are preoperativeService's; BMI is the
 * calculator engine's; NEWS2 is the soft-tissue-infection scoring service's;
 * the screening instruments are scored by the scar module's scoreScale. This
 * file only decides which apply and reads the answers into them.
 */
import type { EncounterAnswers, EncounterTemplate } from '../data/encounterModel';
import {
  completeness as templateCompleteness, isVisible, raisedFlags, renderFieldValue,
  type Completeness,
} from '../services/templateEngine';
import {
  interpretBraden, interpretCaprini, interpretMust, scoreBraden, scoreCaprini, scoreMust,
  type BradenSubscores, type RiskResult,
} from '../../clinician-assistant/services/riskCalculators';
import { asaClassifications, preoperativeService } from '../../../services/preoperativeService';
import { bmiCategory, calculateBMI } from '../../calculators/engine/calculationEngine';
import { calculateNEWS2 } from '../../soft-tissue-infection/services/scoringService';
import type { Patient } from '../../../types';
import type {
  ComputedScore, CoreSectionId, PriorReview, ProcedureModule, ReviewFlag, ReviewHandoff, ReviewPatient,
  ReviewPhase, ReviewSection, ScoreBand, ScoreMap,
} from './types';
import { CORE_SECTIONS, defaultCoreFor } from './core';
import { AGE_LIMITS, ageAllows, ageInMonths, coreFieldAgeGate, isChild, isUnder } from './core/age';
import { answered, chosen, hasAny, isOneOf, isYes, numOf } from './core/answers';
import { bradenFieldId, type BradenFieldKey } from './core/holistic';
import { RCRI_KEYS, CAPRINI_ASKED } from './core/perioperative';
import {
  APFEL, APPEARANCE_SCREEN, CFS, GAD2_BANDS, GAD2_CUTOFF, GAD2_ITEMS, GAD7, PHQ2_BANDS, PHQ2_CUTOFF,
  PHQ2_ITEMS, PHQ9, PHQ9_SAFETY_ITEM, appearanceScreenResult, responsesFrom, scoreInstrument,
  type ScreeningInstrument,
} from './scores';
import { phaseDefinition } from './phases';

/** Bump when a core section's fields change meaning, so stored reviews say what they were answered against. */
export const TEMPLATE_VERSION = 'procedure-review-1.0.0';

// ── Composition ─────────────────────────────────────────────────────────────

/** A composed review: an EncounterTemplate (so templateEngine reads it) with marked sections. */
export interface ComposedReview extends EncounterTemplate {
  moduleId: string;
  phase: ReviewPhase;
  sections: ReviewSection[];
  coreIds: CoreSectionId[];
}

/** The core section ids a module uses at a phase, in display order. */
export function coreIdsFor(module: ProcedureModule, phase: ReviewPhase): CoreSectionId[] {
  const wanted = new Set<CoreSectionId>([...defaultCoreFor(phase), ...(module.includeCore?.[phase] ?? [])]);
  for (const id of module.excludeCore?.[phase] ?? []) wanted.delete(id);
  return CORE_SECTIONS.filter(c => wanted.has(c.id)).map(c => c.id);
}

/**
 * Core sections for the phase + the module's own sections, in the order a
 * clinician works: the reason for the review, the procedure, the patient, the
 * dressing plan.
 *
 * Core fields outside the validated age range for this patient are left out
 * (core/age.ts) — so they are neither shown, scored nor counted towards
 * completeness — and their paediatric replacements put in. Without a patient
 * the age is unknown and treated as adult (or as a child in a paediatric
 * module).
 */
export function composeTemplate(
  module: ProcedureModule, phase: ReviewPhase,
  patient: Pick<ReviewPatient, 'ageYears' | 'ageMonths'> & { sex?: ReviewPatient['sex'] } = { ageYears: null },
): ComposedReview {
  if (!module.phases.includes(phase)) {
    throw new Error(`${module.name} is not reviewed at the ${phaseDefinition(phase).label.toLowerCase()} phase`);
  }
  const ids = new Set(coreIdsFor(module, phase));
  const dropped = new Set(module.excludeCoreFields?.[phase] ?? []);
  const core = (slot: 'lead' | 'holistic' | 'close'): ReviewSection[] => CORE_SECTIONS
    .filter(c => c.slot === slot && ids.has(c.id))
    .map(c => ({
      ...c.section,
      fields: c.section.fields
        .filter(f => !dropped.has(f.id))
        // Pregnancy is not asked of a patient recorded as male.
        .filter(f => !(f.id === 'core.pregnancy' && patient.sex === 'male'))
        .filter(f => ageAllows(coreFieldAgeGate(f.id), patient, module))
        .map(f => (module.coreShowWhen?.[f.id] ? { ...f, showWhen: module.coreShowWhen[f.id] } : f)),
      origin: 'core' as const, coreId: c.id,
    }))
    .filter(s => s.fields.length > 0);
  const own: ReviewSection[] = (module.sections[phase] ?? []).map(s => ({ ...s, origin: 'module' as const }));
  return {
    id: `${module.id}:${phase}`,
    moduleId: module.id,
    phase,
    name: `${module.name} — ${phaseDefinition(phase).label}`,
    summary: module.summary,
    complaints: [],
    basis: module.basis.join('; '),
    sections: [...core('lead'), ...own, ...core('holistic'), ...core('close')],
    coreIds: [...ids],
    handoffs: (module.handoffs ?? [])
      .filter(h => !h.phases || h.phases.includes(phase))
      .map(h => ({ label: h.label, route: handoffRoute(h, phase), when: h.when })),
  };
}

/**
 * Where a handoff goes. A link to another procedure review is relative (a
 * query string), so it opens on the current patient's procedure-review page
 * (/patients/:id/procedure-review), which preselects the module and phase.
 */
export function handoffRoute(h: ReviewHandoff, phase: ReviewPhase): string {
  if (h.moduleId) return `?${new URLSearchParams({ module: h.moduleId, phase: h.targetPhase ?? phase }).toString()}`;
  return h.route ?? '';
}

// ── The patient ─────────────────────────────────────────────────────────────

/** Completed months between the date of birth and `now`, or null. */
const monthsOn = (dob: Date | string | undefined, now: Date): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  return months < 0 ? null : months;
};

/** The review's view of a registered patient. `now` is passed in to keep this pure. */
export function reviewPatientFrom(
  p: Pick<Patient, 'dateOfBirth' | 'gender' | 'allergies' | 'chronicConditions' | 'comorbidities'> | null | undefined,
  now: Date,
  extra: { medications?: string[] } = {},
): ReviewPatient {
  const lower = (xs: (string | undefined)[] | undefined) => (xs ?? []).filter(Boolean).map(x => String(x).toLowerCase());
  const months = monthsOn(p?.dateOfBirth, now);
  return {
    ageYears: months == null ? null : Math.floor(months / 12),
    ageMonths: months,
    sex: p?.gender === 'female' ? 'female' : p?.gender === 'male' ? 'male' : null,
    comorbidities: [...lower(p?.chronicConditions), ...lower(p?.comorbidities?.map(c => c.condition))],
    medications: [...lower(extra.medications), ...lower(p?.comorbidities?.flatMap(c => c.medications ?? []))],
    allergies: lower(p?.allergies),
    bmi: null,
  };
}

// ── Scores ──────────────────────────────────────────────────────────────────

const levelOf = (riskLevel: RiskResult['riskLevel']): ScoreBand['level'] =>
  riskLevel === 'very_high' ? 'very_high' : riskLevel === 'high' ? 'high'
    : riskLevel === 'moderate' ? 'moderate' : riskLevel === 'low' ? 'low' : 'none';

const bandFromRisk = (label: string, r: RiskResult): ScoreBand => ({ label, level: levelOf(r.riskLevel), interpretation: r.interpretation });

function bmiBand(bmi: number): ScoreBand {
  const label = bmiCategory(bmi);
  const level: ScoreBand['level'] = bmi < 16 ? 'very_high' : bmi < 18.5 ? 'high' : bmi < 25 ? 'none'
    : bmi < 30 ? 'low' : bmi < 40 ? 'moderate' : 'high';
  return { label, level, interpretation: `BMI ${bmi} kg/m2 — ${label} (WHO).` };
}

/** BMI from the review's own weight and height, else the patient's. */
export function effectiveBmi(a: EncounterAnswers, patient: ReviewPatient): number | null {
  const w = numOf(a, 'core.weight_kg'), h = numOf(a, 'core.height_cm');
  return (w && h ? calculateBMI(w, h) : null) ?? patient.bmi;
}

function instrumentScore(
  inst: ScreeningInstrument, prefix: string, a: EncounterAnswers, opts: {
    id?: string; name?: string; abbreviation?: string; items?: string[];
    bands?: Parameters<typeof scoreInstrument>[3]; max?: number;
  } = {},
): ComputedScore {
  const r = scoreInstrument(inst, responsesFrom(inst, prefix, a, opts.items), opts.items, opts.bands);
  const itemLabel = (id: string) => inst.items.find(i => i.id === id)?.label ?? id;
  return {
    id: opts.id ?? inst.id,
    name: opts.name ?? inst.name,
    abbreviation: opts.abbreviation ?? inst.abbreviation,
    total: r.total,
    max: opts.max ?? inst.totalRange?.[1],
    band: r.band,
    incomplete: r.incomplete.map(itemLabel),
    source: inst.citation,
  };
}

/**
 * Every score the composed review can support. A score whose section is not
 * in this review is not computed — a wound review does not report an ASA.
 */
export function computeScores(
  template: ComposedReview, a: EncounterAnswers, patient: ReviewPatient,
  module?: ProcedureModule, prior: PriorReview[] = [],
): ComputedScore[] {
  const fields = new Set(template.sections.flatMap(s => s.fields.map(f => f.id)));
  const has = (id: string) => fields.has(id);
  const out: ComputedScore[] = [];
  const bmi = effectiveBmi(a, patient);

  // BMI (WHO), calculator engine. The adult cut-offs do not apply to children.
  const child = isChild(patient, module);
  if (has('core.weight_kg') && child) {
    out.push({
      id: 'bmi', name: 'Body mass index', abbreviation: 'BMI', total: bmi,
      band: bmi != null ? { label: 'Use the BMI-for-age centile', level: 'none', interpretation: `BMI ${bmi} kg/m2. The adult WHO categories do not apply under 18: plot BMI-for-age on the growth chart.` } : null,
      incomplete: bmi == null ? ['Weight and height'] : [],
      source: 'WHO child growth standards (BMI-for-age); calculationEngine.calculateBMI',
    });
  } else if (has('core.weight_kg')) {
    out.push({
      id: 'bmi', name: 'Body mass index', abbreviation: 'BMI', total: bmi,
      band: bmi != null ? bmiBand(bmi) : null,
      incomplete: bmi == null ? ['Weight and height'] : [],
      source: 'WHO BMI classification; calculationEngine.calculateBMI',
      flag: bmi != null && bmi < 18.5 ? { level: 'amber', reason: `BMI ${bmi} kg/m2 is underweight: malnutrition risk and impaired healing.` }
        : bmi != null && bmi >= 40 ? { level: 'amber', reason: `BMI ${bmi} kg/m2 (obesity class III): anaesthetic, VTE and wound-complication risk.` }
          : undefined,
    });
  }

  // MUST (BAPEN), riskCalculators
  if (has('core.weight_loss')) {
    const incomplete: string[] = [];
    let bmiScore: number | null = null;
    const detail: string[] = [];
    if (bmi != null) bmiScore = bmi > 20 ? 0 : bmi >= 18.5 ? 1 : 2;
    else {
      const muac = numOf(a, 'core.muac_cm');
      if (muac != null) {
        bmiScore = muac < 23.5 ? 1 : 0;
        detail.push(`BMI estimated from MUAC ${muac} cm (BAPEN alternative measures).`);
      } else incomplete.push('BMI (weight and height) or MUAC');
    }
    const wl = a['core.weight_loss'];
    const weightLossScore = wl === '0' || wl === '1' || wl === '2' ? Number(wl) : null;
    if (weightLossScore == null) incomplete.push('Unplanned weight loss');
    const acute = isYes(a, 'core.acute_disease') ? 2 : 0;
    const total = bmiScore == null || weightLossScore == null
      ? null
      : scoreMust({ bmi_score: bmiScore, weight_loss_score: weightLossScore, acute_disease_score: acute });
    const r = total == null ? null : interpretMust(total);
    out.push({
      id: 'must', name: 'Malnutrition Universal Screening Tool', abbreviation: 'MUST', total, max: 6,
      band: r ? bandFromRisk(r.riskLevel === 'high' ? 'High risk' : r.riskLevel === 'moderate' ? 'Medium risk' : 'Low risk', r) : null,
      incomplete, detail, source: 'BAPEN MUST; NICE CG32; riskCalculators.scoreMust',
      flag: total != null && total >= 2 ? { level: 'amber', reason: `MUST ${total}: high risk of malnutrition — dietitian and a nutritional care plan (NICE CG32).` } : undefined,
    });
  }

  // Braden, riskCalculators (missing items counted as highest risk, as it does)
  if (has(bradenFieldId('sensory_perception'))) {
    const keys: BradenFieldKey[] = ['sensory_perception', 'moisture', 'activity', 'mobility', 'nutrition', 'friction_shear'];
    const s: Partial<BradenSubscores> = {};
    const missing: string[] = [];
    for (const k of keys) {
      const v = numOf(a, bradenFieldId(k));
      if (v == null) missing.push(k.replace(/_/g, ' '));
      else s[k] = v;
    }
    const any = missing.length < keys.length;
    const total = any ? scoreBraden(s) : null;
    const r = total == null ? null : interpretBraden(total);
    out.push({
      id: 'braden', name: 'Braden scale', abbreviation: 'Braden', total, max: 23, lowerIsWorse: true,
      band: r ? bandFromRisk(`${r.riskLevel.replace('_', ' ')} risk`, r) : null,
      incomplete: missing,
      detail: any && missing.length ? ['Unscored items are counted as highest risk.'] : undefined,
      source: 'Bergstrom 1987; NPIAP/EPUAP 2019; riskCalculators.scoreBraden',
      flag: total != null && total <= 12 ? { level: 'amber', reason: `Braden ${total}: high pressure-injury risk — SSKIN bundle and a pressure-redistributing surface.` } : undefined,
    });
  }

  // Caprini, riskCalculators
  if (has('core.caprini')) {
    const incomplete: string[] = [];
    const factors: Record<string, boolean> = {};
    for (const k of chosen(a, 'core.caprini')) factors[k] = true;
    const age = patient.ageYears;
    if (age == null) incomplete.push('Age');
    else if (age >= 75) factors.age_over_75 = true;
    else if (age >= 61) factors.age_61_74 = true;
    else if (age >= 41) factors.age_41_60 = true;
    if (bmi != null && bmi > 25) factors.bmi_over_25 = true;
    const extent = a['core.surgery_extent'];
    if (extent === 'minor') factors.minor_surgery = true;
    else if (extent === 'major') factors.major_surgery_45min = true;
    else incomplete.push('Planned operation');
    if (!answered(a, 'core.caprini')) incomplete.push('Caprini risk factors');
    const total = answered(a, 'core.caprini') ? scoreCaprini(factors) : null;
    const r = total == null ? null : interpretCaprini(total);
    const label = (k: string) => CAPRINI_ASKED.find(c => c.key === k)?.label ?? k.replace(/_/g, ' ');
    out.push({
      id: 'caprini', name: 'Caprini VTE risk', abbreviation: 'Caprini', total,
      band: r ? bandFromRisk(`${r.riskLevel.replace('_', ' ')} risk`, r) : null,
      incomplete,
      detail: Object.keys(factors).map(label),
      source: 'Caprini 2005; NICE NG89; riskCalculators.scoreCaprini',
      flag: total != null && total >= 5 ? { level: 'amber', reason: `Caprini ${total}: high VTE risk — pharmacological plus mechanical prophylaxis unless bleeding risk forbids (NICE NG89).` } : undefined,
    });
  }

  // ASA, preoperativeService
  if (has('core.asa')) {
    const cls = numOf(a, 'core.asa');
    const d = cls != null ? asaClassifications.find(x => x.class === cls) : undefined;
    out.push({
      id: 'asa', name: 'ASA physical status', abbreviation: 'ASA', total: cls, max: 6,
      band: d ? {
        label: `ASA ${d.class}${isYes(a, 'core.asa_emergency') ? 'E' : ''}`,
        level: d.class >= 5 ? 'very_high' : d.class === 4 ? 'high' : d.class === 3 ? 'moderate' : 'low',
        interpretation: `${d.description}. Reported mortality ${d.mortalityRisk}.`,
      } : null,
      incomplete: cls == null ? ['ASA class'] : [],
      source: 'ASA Physical Status Classification (2020); preoperativeService.asaClassifications',
    });
  }

  // Airway, preoperativeService
  if (has('core.mallampati')) {
    const mp = numOf(a, 'core.mallampati');
    if (mp != null || isYes(a, 'core.difficult_airway_history')) {
      const predicted = preoperativeService.assessAirway({
        mallampatiScore: (mp ?? undefined) as 1 | 2 | 3 | 4 | undefined,
        mouthOpening: numOf(a, 'core.mouth_opening') ?? undefined,
        thyromentalDistance: numOf(a, 'core.thyromental') ?? undefined,
        neckMobility: (a['core.neck_mobility'] as 'normal' | 'limited' | 'fixed' | undefined) ?? undefined,
        previousDifficultIntubation: isYes(a, 'core.difficult_airway_history'),
        beardPresent: isYes(a, 'core.beard'),
      });
      const label = predicted === 'easy' ? 'No predictors' : predicted === 'potentially_difficult' ? 'Potentially difficult' : 'Anticipated difficult';
      out.push({
        id: 'airway', name: 'Airway assessment', abbreviation: 'Airway', total: null,
        band: { label, level: predicted === 'easy' ? 'none' : predicted === 'potentially_difficult' ? 'moderate' : 'high', interpretation: `${label} airway.` },
        incomplete: mp == null ? ['Mallampati'] : [],
        source: 'Mallampati 1985; preoperativeService.assessAirway',
        flag: predicted === 'anticipated_difficult' ? { level: 'red', reason: 'Anticipated difficult airway: senior anaesthetist and difficult-airway equipment (DAS guidelines).' } : undefined,
      });
    }
  }

  // RCRI, preoperativeService
  if (has('core.rcri') && answered(a, 'core.rcri')) {
    const f = Object.fromEntries(RCRI_KEYS.map(k => [k, hasAny(a, 'core.rcri', k)])) as Parameters<typeof preoperativeService.calculateRCRI>[0];
    const r = preoperativeService.calculateRCRI(f);
    out.push({
      id: 'rcri', name: 'Revised Cardiac Risk Index', abbreviation: 'RCRI', total: r.score, max: 6,
      band: { label: r.risk, level: r.score === 0 ? 'none' : r.score === 1 ? 'low' : r.score === 2 ? 'moderate' : 'high', interpretation: `RCRI ${r.score}: ${r.risk} risk of major cardiac events.` },
      incomplete: [], detail: r.recommendations,
      source: 'Lee TH et al. Circulation 1999; preoperativeService.calculateRCRI',
      flag: r.score >= 2 ? { level: 'amber', reason: `RCRI ${r.score}: elevated cardiac risk — physician / cardiology assessment before elective surgery (ESC/ESA 2022).` } : undefined,
    });
  }

  // Functional capacity, preoperativeService
  if (has('core.mets') && numOf(a, 'core.mets') != null) {
    const mets = numOf(a, 'core.mets')!;
    const cap = preoperativeService.assessFunctionalCapacity(mets);
    out.push({
      // Higher METs is better: lowerIsWorse makes the follow-up comparison read a rise as "better".
      id: 'mets', name: 'Functional capacity', abbreviation: 'METs', total: mets, lowerIsWorse: true,
      band: { label: cap, level: cap === 'poor' ? 'high' : cap === 'moderate' ? 'low' : 'none', interpretation: `Functional capacity ${cap} (${mets < 4 ? 'under 4' : `about ${mets}`} METs).` },
      incomplete: [], source: 'ESC/ESA 2022; preoperativeService.assessFunctionalCapacity',
    });
  }

  // STOP-BANG, preoperativeService
  if (has('core.sb_snoring')) {
    const items: [string, string][] = [['core.sb_snoring', 'Snoring'], ['core.sb_tired', 'Tiredness'], ['core.sb_observed', 'Observed apnoea'], ['core.sb_pressure', 'Hypertension']];
    const incomplete = items.filter(([id]) => typeof a[id] !== 'boolean').map(([, l]) => l);
    const neck = numOf(a, 'core.neck_cm');
    if (neck == null) incomplete.push('Neck circumference');
    if (bmi == null) incomplete.push('BMI');
    if (patient.ageYears == null) incomplete.push('Age');
    if (!patient.sex) incomplete.push('Sex');
    let total: number | null = null; let band: ScoreBand | null = null; let detail: string[] | undefined;
    if (!incomplete.length) {
      const r = preoperativeService.calculateSTOPBANG({
        snoring: isYes(a, 'core.sb_snoring'), tired: isYes(a, 'core.sb_tired'), observed: isYes(a, 'core.sb_observed'), pressure: isYes(a, 'core.sb_pressure'),
        bmi: bmi!, age: patient.ageYears!, neckCircumference: neck!, gender: patient.sex!,
      });
      total = r.score; detail = r.recommendations;
      band = { label: r.risk, level: r.score <= 2 ? 'low' : r.score <= 4 ? 'moderate' : 'high', interpretation: `STOP-BANG ${r.score}: ${r.risk}.` };
    }
    out.push({
      id: 'stopbang', name: 'STOP-BANG', abbreviation: 'STOP-BANG', total, max: 8, band, incomplete, detail,
      source: 'Chung F et al. Anesthesiology 2008; preoperativeService.calculateSTOPBANG',
      flag: total != null && total >= 5 ? { level: 'amber', reason: `STOP-BANG ${total}: high risk of obstructive sleep apnoea — tell the anaesthetist; minimise opioids; monitored bed.` } : undefined,
    });
  }

  // Bleeding risk, preoperativeService
  if (has('core.inr')) {
    const inr = numOf(a, 'core.inr'), plt = numOf(a, 'core.platelets');
    const anticoag = chosen(a, 'core.anticoagulant');
    if (inr != null || plt != null || anticoag.length || isYes(a, 'core.bleeding_history')) {
      const risk = preoperativeService.assessBleedingRisk(
        { inr: inr ?? undefined, platelets: plt ?? undefined },
        anticoag.length ? anticoag.join(', ') : undefined,
        isYes(a, 'core.bleeding_history'),
      );
      out.push({
        id: 'bleeding', name: 'Bleeding risk', abbreviation: 'Bleeding', total: null,
        band: { label: `${risk} risk`, level: risk === 'high' ? 'high' : risk === 'moderate' ? 'moderate' : 'low', interpretation: `Bleeding risk ${risk} (INR, platelets, anticoagulants, history).` },
        incomplete: [inr == null ? 'INR' : '', plt == null ? 'Platelets' : ''].filter(Boolean),
        source: 'preoperativeService.assessBleedingRisk',
      });
    }
  }

  // Clinical Frailty Scale
  if (has('core.cfs.level') && answered(a, 'core.cfs.level')) {
    const s = instrumentScore(CFS, 'core.cfs', a, { max: 9 });
    if (patient.ageYears != null && patient.ageYears < 65) s.detail = ['The CFS is validated for age 65 and over; interpret with caution.'];
    if (s.total != null && s.total >= 5) s.flag = { level: 'amber', reason: `CFS ${s.total}: frailty — comprehensive geriatric assessment, delirium prevention, shared decision-making (CPOC 2021).` };
    out.push(s);
  }

  // Apfel — sex and smoking from the record and the smoking answer
  if (has('core.apfel.history')) {
    const r: Record<string, number> = { ...responsesFrom(APFEL, 'core.apfel', a, ['history', 'opioids']) };
    if (patient.sex) r.female = patient.sex === 'female' ? 1 : 0;
    if (answered(a, 'core.smoking')) r.non_smoker = isOneOf(a, 'core.smoking', 'current', 'vaping', 'smokeless') ? 0 : 1;
    // Smoking is not asked under 12 (core/age.ts): a child counts as a non-smoker.
    else if (!has('core.smoking')) r.non_smoker = 1;
    const res = scoreInstrument(APFEL, r);
    out.push({
      id: 'apfel', name: APFEL.name, abbreviation: 'Apfel', total: res.total, max: 4, band: res.band,
      incomplete: res.incomplete.map(id => APFEL.items.find(i => i.id === id)?.label ?? id), source: APFEL.citation,
    });
  }

  // PHQ-2 → PHQ-9, with the item-9 safety flag
  if (has('core.phq.q1')) {
    const phq2 = instrumentScore(PHQ9, 'core.phq', a, { id: 'phq2', name: 'PHQ-2 depression screen', abbreviation: 'PHQ-2', items: PHQ2_ITEMS, bands: PHQ2_BANDS, max: 6 });
    if (phq2.total != null && phq2.total >= PHQ2_CUTOFF) phq2.flag = { level: 'amber', reason: `PHQ-2 ${phq2.total}: positive depression screen — complete the PHQ-9.` };
    out.push(phq2);
    const item9 = numOf(a, `core.phq.${PHQ9_SAFETY_ITEM}`);
    if ((phq2.total ?? 0) >= PHQ2_CUTOFF || (item9 ?? 0) > 0) {
      const phq9 = instrumentScore(PHQ9, 'core.phq', a);
      if ((item9 ?? 0) > 0) {
        phq9.flag = {
          level: 'red',
          reason: 'PHQ-9 item 9 positive — thoughts of being better off dead or of self-harm. Ask directly about intent and plans today; do not leave the patient alone if at immediate risk; same-day mental-health assessment.',
        };
      } else if (phq9.total != null && phq9.total >= 10) {
        phq9.flag = { level: 'amber', reason: `PHQ-9 ${phq9.total} (${phq9.band?.label}): refer for psychological assessment.` };
      }
      out.push(phq9);
    }
  }

  // GAD-2 → GAD-7
  if (has('core.gad.q1')) {
    const gad2 = instrumentScore(GAD7, 'core.gad', a, { id: 'gad2', name: 'GAD-2 anxiety screen', abbreviation: 'GAD-2', items: GAD2_ITEMS, bands: GAD2_BANDS, max: 6 });
    if (gad2.total != null && gad2.total >= GAD2_CUTOFF) gad2.flag = { level: 'amber', reason: `GAD-2 ${gad2.total}: positive anxiety screen — complete the GAD-7.` };
    out.push(gad2);
    if ((gad2.total ?? 0) >= GAD2_CUTOFF) {
      const gad7 = instrumentScore(GAD7, 'core.gad', a);
      if (gad7.total != null && gad7.total >= 10) gad7.flag = { level: 'amber', reason: `GAD-7 ${gad7.total} (${gad7.band?.label}): refer for psychological assessment.` };
      out.push(gad7);
    }
  }

  // Appearance-concern screen
  if (has('core.appearance.concern') && answered(a, 'core.appearance.concern')) {
    const r = responsesFrom(APPEARANCE_SCREEN, 'core.appearance', a);
    const res = appearanceScreenResult(r);
    out.push({
      id: 'appearance', name: APPEARANCE_SCREEN.name, abbreviation: 'Appearance', total: res.positive == null ? null : res.positive ? 1 : 0, max: 1,
      band: res.band,
      incomplete: res.positive == null ? ['Preoccupation, distress and avoidance questions'] : [],
      source: APPEARANCE_SCREEN.citation,
      detail: r.disproportion === 1 ? ['Clinician judges the concern out of proportion to the visible defect.'] : undefined,
      flag: res.positive ? { level: 'amber', reason: 'Appearance-concern screen positive: specialist mental-health assessment before elective aesthetic surgery. A screen, not a diagnosis.' } : undefined,
    });
  }

  // NEWS2, soft-tissue-infection scoringService. Not for children under 16
  // (RCP 2017): adult ranges would call a normal infant's heart rate an
  // emergency and score an infant's bradycardia as normal.
  if (has('core.obs_rr') && isUnder(patient, AGE_LIMITS.news2, module)) {
    out.push({
      id: 'news2', name: 'National Early Warning Score 2', abbreviation: 'NEWS2', total: null,
      band: { label: 'Not used under 16 — use the paediatric early warning score', level: 'none',
        interpretation: 'NEWS2 is not validated in children under 16: chart the observations against age-specific normal ranges on the hospital paediatric early warning score (PEWS) and escalate by its triggers.' },
      incomplete: [],
      source: 'Royal College of Physicians NEWS2 (2017) — not for use under 16',
    });
  } else if (has('core.obs_rr')) {
    const rr = numOf(a, 'core.obs_rr'), spo2 = numOf(a, 'core.obs_spo2'), temp = numOf(a, 'core.obs_temp'),
      sbp = numOf(a, 'core.obs_sbp'), hr = numOf(a, 'core.obs_hr');
    const avpu = a['core.obs_avpu'] as 'alert' | 'confused' | 'voice' | 'pain' | 'unresponsive' | undefined;
    const incomplete = [rr == null && 'Respiratory rate', spo2 == null && 'SpO2', temp == null && 'Temperature', sbp == null && 'Systolic BP', hr == null && 'Heart rate', !avpu && 'Consciousness']
      .filter(Boolean) as string[];
    let total: number | null = null; let band: ScoreBand | null = null; let flag: ComputedScore['flag'];
    if (!incomplete.length) {
      const r = calculateNEWS2({ respiratoryRate: rr!, spo2: spo2!, onOxygen: isYes(a, 'core.obs_on_oxygen'), temperature: temp!, systolicBP: sbp!, heartRate: hr!, consciousness: avpu! });
      total = r.score;
      band = { label: r.risk, level: r.score >= 7 ? 'very_high' : r.score >= 5 ? 'high' : r.score >= 3 ? 'moderate' : 'low', interpretation: r.action };
      if (r.score >= 7) flag = { level: 'red', reason: `NEWS2 ${r.score}: emergency response — continuous monitoring, urgent senior review, consider critical care (RCP 2017).` };
      else if (r.score >= 5) flag = { level: 'amber', reason: `NEWS2 ${r.score}: urgent clinical review within 30 minutes; at least hourly observations (RCP 2017).` };
    } else {
      // An incomplete set gives no total, but one parameter in the NEWS2
      // 3-point range is itself a trigger (RCP 2017: urgent ward-based
      // response) and must not be hidden by a missing value.
      const red = [
        rr != null && (rr <= 8 || rr >= 25) && `respiratory rate ${rr}/min`,
        spo2 != null && spo2 <= 91 && `SpO2 ${spo2}%`,
        temp != null && temp <= 35 && `temperature ${temp} C`,
        sbp != null && (sbp <= 90 || sbp >= 220) && `systolic BP ${sbp} mmHg`,
        hr != null && (hr <= 40 || hr >= 131) && `heart rate ${hr}/min`,
      ].filter(Boolean) as string[];
      if (red.length) {
        flag = { level: 'red', reason: `${red.join(', ')}: scores 3 on NEWS2 on its own — urgent clinical review now, and complete the full set of observations (RCP 2017).` };
      }
    }
    out.push({ id: 'news2', name: 'National Early Warning Score 2', abbreviation: 'NEWS2', total, max: 20, band, incomplete, flag,
      source: 'Royal College of Physicians NEWS2 (2017); scoringService.calculateNEWS2' });
  }

  // IWII wound infection continuum
  if (has('core.iwii_covert')) out.push(iwiiStage(a));

  // The module's own scores
  for (const rule of module?.scores ?? []) {
    const s = rule({ phase: template.phase, answers: a, patient, prior });
    if (s) out.push(s);
  }
  return out;
}

const IWII_STAGES: ScoreBand[] = [
  { label: 'No infection signs', level: 'none', interpretation: 'Contamination / colonisation: routine cleansing; no antimicrobials.' },
  { label: 'Local infection (covert signs)', level: 'low', interpretation: 'Subtle signs of local infection: consider a topical antiseptic and review in 2 weeks (IWII 2022).' },
  { label: 'Local infection (overt signs)', level: 'moderate', interpretation: 'Local infection: wound hygiene, debridement and a topical antimicrobial; reassess at 2 weeks (IWII 2022).' },
  { label: 'Spreading infection', level: 'high', interpretation: 'Spreading infection: systemic antibiotics guided by tissue culture, plus local care (IWII 2022).' },
  { label: 'Systemic infection', level: 'very_high', interpretation: 'Systemic infection: urgent medical review, sepsis screen, IV antibiotics, source control (IWII 2022).' },
];

/** The wound's place on the IWII 2022 continuum, from the signs ticked. */
export function iwiiStage(a: EncounterAnswers): ComputedScore {
  const stage = chosen(a, 'core.iwii.systemic').length ? 4
    : chosen(a, 'core.iwii_spreading').length ? 3
      : chosen(a, 'core.iwii_overt').length ? 2
        : chosen(a, 'core.iwii_covert').length ? 1 : 0;
  const anyAnswered = ['core.iwii_covert', 'core.iwii_overt', 'core.iwii_spreading', 'core.iwii.systemic'].some(id => answered(a, id));
  return {
    id: 'iwii', name: 'Wound infection continuum (IWII 2022)', abbreviation: 'IWII', total: anyAnswered ? stage : null, max: 4,
    band: anyAnswered ? IWII_STAGES[stage] : null,
    incomplete: anyAnswered ? [] : ['Infection signs'],
    source: 'International Wound Infection Institute. Wound Infection in Clinical Practice, 2022',
    flag: stage >= 4 ? { level: 'red', reason: 'Systemic wound infection: sepsis screen and urgent treatment (IWII 2022).' }
      : stage === 3 ? { level: 'amber', reason: 'Spreading wound infection: systemic antibiotics guided by tissue culture (IWII 2022).' } : undefined,
  };
}

// ── Flags ───────────────────────────────────────────────────────────────────

/**
 * WHO 2011 anaemia threshold for this patient (g/dL), or null when it cannot
 * be set (sex unknown from 15 years; under 6 months, or an infant whose age
 * in months is unknown — WHO gives no threshold below 6 months).
 * WHO. Haemoglobin concentrations for the diagnosis of anaemia (2011):
 * 6–59 months 11.0; 5–11 years 11.5; 12–14 years 12.0; from 15 years,
 * non-pregnant women 12.0, pregnant women 11.0, men 13.0.
 */
export function anaemiaThreshold(patient: ReviewPatient, a: EncounterAnswers): number | null {
  const months = ageInMonths(patient);
  if (months != null && months < 15 * 12) {
    if (patient.ageMonths == null && months < 12) return null;
    if (months < 6) return null;
    if (months < 60) return 11;
    if (months < 12 * 12) return 11.5;
    return 12;
  }
  if (patient.sex === 'male') return 13;
  if (patient.sex === 'female') return isOneOf(a, 'core.pregnancy', 'pregnant') ? 11 : 12;
  return null;
}

/** Answer flags (templateEngine), score flags and the derived anaemia flag — red first, no repeats. */
export function reviewFlags(template: ComposedReview, a: EncounterAnswers, scores: ComputedScore[], patient: ReviewPatient): ReviewFlag[] {
  const out: ReviewFlag[] = raisedFlags(template, a).map(f => ({ ...f, source: 'answer' as const }));
  for (const s of scores) {
    if (!s.flag) continue;
    out.push({
      level: s.flag.level, fieldLabel: s.name,
      answerLabel: s.total != null ? `${s.total}${s.max != null ? `/${s.max}` : ''}${s.band ? ` — ${s.band.label}` : ''}` : s.band?.label ?? 'Positive',
      reason: s.flag.reason, source: 'score',
    });
  }
  const hb = numOf(a, 'core.hb'), limit = anaemiaThreshold(patient, a);
  if (hb != null && limit != null && hb < limit && hb >= 7) {
    out.push({ level: 'amber', fieldLabel: 'Haemoglobin', answerLabel: `${hb} g/dL`, source: 'score',
      reason: `Anaemia (WHO: below ${limit} g/dL): investigate and correct before elective surgery — it impairs healing and raises transfusion need.` });
  }
  const seen = new Set<string>();
  return out
    .filter(f => { const k = `${f.level}|${f.reason}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((x, y) => (x.level === y.level ? 0 : x.level === 'red' ? -1 : 1));
}

// ── Healing barriers: everything that interferes with healing, together ────

export interface HealingBarrier { barrier: string; why: string; level: 'red' | 'amber' }

/**
 * Every factor in this review that will interfere with healing — systemic,
 * local, nutritional and social — in one list. Each question was asked once,
 * in its own section; this is where they are seen together.
 */
export function healingBarriers(a: EncounterAnswers, patient: ReviewPatient, scores: ScoreMap): HealingBarrier[] {
  const out: HealingBarrier[] = [];
  const add = (barrier: string, why: string, level: 'red' | 'amber' = 'amber') => out.push({ barrier, why, level });
  const hba1c = numOf(a, 'core.hba1c'), glu = numOf(a, 'core.glucose');
  if (hba1c != null && hba1c > 8.5) add('Poorly controlled diabetes', `HbA1c ${hba1c}%`);
  else if (glu != null && glu > 12) add('Hyperglycaemia', `Glucose ${glu} mmol/L`);
  else if (isOneOf(a, 'core.diabetes', 'diet', 'oral', 'insulin')) add('Diabetes', 'Diabetes recorded');
  if (isOneOf(a, 'core.perfusion', 'poor')) add('Poor local perfusion', 'Perfusion recorded as poor', 'red');
  else if (isOneOf(a, 'core.perfusion', 'doubtful') || isOneOf(a, 'core.pvd', 'suspected', 'confirmed')) add('Impaired perfusion', isOneOf(a, 'core.pvd', 'suspected', 'confirmed') ? 'Peripheral arterial disease' : 'Perfusion doubtful');
  if (isOneOf(a, 'core.smoking', 'current', 'vaping', 'smokeless', 'ex_under_4w')) add('Smoking / nicotine', 'Nicotine exposure within 4 weeks');
  if (hasAny(a, 'core.immune', 'steroids')) add('Corticosteroids', 'Long-term steroids');
  if (hasAny(a, 'core.immune', 'chemo', 'immunosuppressant', 'transplant')) add('Immunosuppression', 'Chemotherapy / immunosuppressant');
  if (isYes(a, 'core.radiotherapy_site')) add('Irradiated tissue', 'Previous radiotherapy to the site');
  if (isOneOf(a, 'core.renal', 'ckd_4_5', 'dialysis')) add('Advanced kidney disease', 'CKD 4–5 / dialysis');
  if (isOneOf(a, 'core.haemoglobinopathy', 'ss_sc')) add('Sickle cell disease', 'HbSS / HbSC');
  const must = scores.must?.total;
  if (must != null && must >= 1) add('Malnutrition risk', `MUST ${must}`, 'amber');
  if (isOneOf(a, 'core.paed_growth', 'faltering', 'below_2nd')) add('Faltering growth', isOneOf(a, 'core.paed_growth', 'faltering') ? 'Crossing centiles downwards' : 'Weight below the 2nd centile');
  const hb = numOf(a, 'core.hb'), limit = anaemiaThreshold(patient, a);
  if (hb != null && limit != null && hb < limit) add('Anaemia', `Hb ${hb} g/dL`, hb < 7 ? 'red' : 'amber');
  const alb = numOf(a, 'core.albumin');
  if (alb != null && alb < 35) add('Hypoalbuminaemia', `Albumin ${alb} g/L`);
  if (isOneOf(a, 'core.oedema', 'moderate', 'severe')) add('Oedema', 'Moderate or severe oedema');
  if (isOneOf(a, 'core.tension', 'high')) add('Tension', 'High tension at the site');
  if (isYes(a, 'core.pressure_shear')) add('Pressure / shear', 'Site exposed to pressure or shear');
  if (isYes(a, 'core.repeated_trauma')) add('Repeated trauma', 'Repeated trauma at the site');
  if (isYes(a, 'core.foreign_body')) add('Foreign body / sequestrum', 'Recorded at the site');
  const iwii = scores.iwii?.total;
  if (iwii != null && iwii >= 2) add('Infection', scores.iwii!.band!.label, iwii >= 4 ? 'red' : 'amber');
  if (isOneOf(a, 'core.adherence', 'poor') || isOneOf(a, 'core.adherence_fu', 'partial', 'none')) add('Adherence', 'Plan not (fully) followed / poor expected adherence');
  if (isOneOf(a, 'core.cost_barrier', 'no', 'with_difficulty')) add('Cost of care', isOneOf(a, 'core.cost_barrier', 'no') ? 'Cannot afford the planned care' : 'Affords care with difficulty');
  if (isOneOf(a, 'core.distance', 'over_2h')) add('Distance to care', 'Over 2 hours to this facility');
  if (isOneOf(a, 'core.traditional_remedies', 'topical')) add('Traditional remedies on the wound', 'Topical preparations in use');
  if (isOneOf(a, 'core.carer', 'none')) add('No carer', 'No practical help at home');
  if (isOneOf(a, 'core.alcohol', 'above', 'dependent')) add('Alcohol', 'Above low-risk limits');
  if (hasAny(a, 'core.substance', 'opioid_misuse')) add('Substance misuse', 'Opioid misuse');
  return out;
}

// ── Comparison with the previous review ─────────────────────────────────────

export interface ComparisonLine {
  label: string;
  before: number;
  now: number;
  /** now − before */
  delta: number;
  trend: 'better' | 'worse' | 'same';
  since: string;
}

const area = (a: EncounterAnswers): number | null => {
  const ar = numOf(a, 'core.wound_area');
  if (ar != null) return ar;
  const l = numOf(a, 'core.wound_length'), w = numOf(a, 'core.wound_width');
  return l != null && w != null ? Math.round(l * w * 10) / 10 : null;
};

/** Metrics compared at follow-up, and which direction is better. */
const ANSWER_METRICS: { label: string; read: (a: EncounterAnswers) => number | null; lowerIsBetter: boolean | null }[] = [
  { label: 'Pain score', read: a => numOf(a, 'core.pain_score'), lowerIsBetter: true },
  { label: 'Wound area (cm2)', read: area, lowerIsBetter: true },
  { label: 'Weight (kg)', read: a => numOf(a, 'core.weight_kg'), lowerIsBetter: null },
  { label: 'Satisfaction (0–10)', read: a => numOf(a, 'core.satisfaction'), lowerIsBetter: false },
];

/** Numbers that changed since the most relevant earlier review (same module first). */
export function compareWithPrior(
  moduleId: string, a: EncounterAnswers, scores: ComputedScore[], prior: PriorReview[],
): ComparisonLine[] {
  const last = prior.find(p => p.moduleId === moduleId) ?? prior[0];
  if (!last) return [];
  const since = last.at.slice(0, 10);
  const out: ComparisonLine[] = [];
  const push = (label: string, before: number | null, now: number | null, lowerIsBetter: boolean | null) => {
    if (before == null || now == null) return;
    const delta = Math.round((now - before) * 10) / 10;
    const trend = delta === 0 || lowerIsBetter == null ? 'same' : (delta < 0) === lowerIsBetter ? 'better' : 'worse';
    out.push({ label, before, now, delta, trend: delta === 0 ? 'same' : trend, since });
  };
  for (const m of ANSWER_METRICS) push(m.label, m.read(last.answers), m.read(a), m.lowerIsBetter);
  for (const s of scores) {
    const was = last.scores.find(p => p.id === s.id);
    if (!was || was.total == null || s.total == null || s.id === 'bmi') continue;
    push(s.abbreviation, was.total, s.total, !s.lowerIsWorse);
  }
  return out;
}

// ── Narrative ───────────────────────────────────────────────────────────────

/** Items summarised by their score rather than repeated one by one in prose. */
const SCORED_ITEM = /^core\.(phq|gad|appearance|cfs|apfel)\.|^core\.braden_|^core\.sb_/;

export interface ReviewNarrative {
  /** One line: procedure — phase. */
  headline: string;
  /** One paragraph per answered section, "Title: a. b. c." */
  sections: { title: string; text: string; origin: 'core' | 'module'; coreId?: CoreSectionId }[];
  scores: string;
  flags: string;
  barriers: string;
  comparison: string;
  /** Everything, for the encounter's prose fields and the clinician's preview. */
  text: string;
}

export function narrativeFor(
  template: ComposedReview, a: EncounterAnswers, otherText: Record<string, string> | undefined,
  scores: ComputedScore[], flags: ReviewFlag[], barriers: HealingBarrier[], comparison: ComparisonLine[],
): ReviewNarrative {
  const sections = template.sections.map(s => {
    const lines = s.fields
      .filter(f => isVisible(f, a) && !SCORED_ITEM.test(f.id))
      .map(f => renderFieldValue(f, a, otherText))
      .filter((l): l is string => !!l);
    return { title: s.title, text: lines.length ? `${lines.join('. ')}.` : '', origin: s.origin, coreId: s.coreId };
  }).filter(s => s.text);
  const scoreText = scores.filter(s => s.total != null || s.band)
    .map(s => `${s.abbreviation}${s.total != null ? ` ${s.total}${s.max != null ? `/${s.max}` : ''}` : ''}${s.band ? ` (${s.band.label})` : ''}`)
    .join('; ');
  const flagText = flags.map(f => `${f.level === 'red' ? 'RED' : 'AMBER'}: ${f.fieldLabel} — ${f.answerLabel}. ${f.reason}`).join('\n');
  const barrierText = barriers.map(b => `${b.barrier} (${b.why})`).join('; ');
  const cmpText = comparison.map(c => `${c.label} ${c.before} -> ${c.now} (${c.delta > 0 ? '+' : ''}${c.delta}, ${c.trend}) since ${c.since}`).join('; ');
  const headline = template.name;
  const text = [
    headline,
    ...sections.map(s => `${s.title}: ${s.text}`),
    scoreText && `Scores: ${scoreText}.`,
    barrierText && `Barriers to healing: ${barrierText}.`,
    cmpText && `Since the last review: ${cmpText}.`,
    flagText && `Flags:\n${flagText}`,
  ].filter(Boolean).join('\n\n');
  return { headline, sections, scores: scoreText, flags: flagText, barriers: barrierText, comparison: cmpText, text };
}

// ── Comorbidity state carried into later phases ─────────────────────────────

/**
 * Core facts the plan rules need at every phase but that are asked only where
 * the comorbidity sections are (pre-op, wound review): kidney function,
 * anticoagulants and why, pregnancy, diabetes and its control, and the
 * Caprini factors (heparin-induced thrombocytopenia). Without them a post-op
 * plan offered NSAIDs to a patient on warfarin or with CKD 4–5.
 */
export const CARRIED_COMORBIDITY_FIELDS = [
  'core.renal', 'core.anticoagulant', 'core.anticoag_indication', 'core.pregnancy',
  'core.diabetes', 'core.hba1c', 'core.caprini',
] as const;

/** A carried fact and the review it came from. */
export interface CarriedFact { field: string; from: string }

/**
 * The answers the plan rules read: this review's answers, plus — for each
 * carried comorbidity field that is NOT in this phase's form — the value from
 * the newest earlier review of the patient that recorded it. A field that is
 * in the form is the clinician's to answer now and is never filled in.
 */
export function planAnswers(
  template: ComposedReview, answers: EncounterAnswers, prior: PriorReview[],
): { answers: EncounterAnswers; carried: CarriedFact[] } {
  const inForm = new Set(template.sections.flatMap(s => s.fields.map(f => f.id)));
  const out: EncounterAnswers = { ...answers };
  const carried: CarriedFact[] = [];
  for (const id of CARRIED_COMORBIDITY_FIELDS) {
    if (inForm.has(id) || answered(answers, id)) continue;
    const src = prior.find(p => answered(p.answers, id));
    if (!src) continue;
    out[id] = src.answers[id];
    carried.push({ field: id, from: src.at.slice(0, 10) });
  }
  return { answers: out, carried };
}

// ── Everything at once ──────────────────────────────────────────────────────

export interface ReviewReading {
  /** What the plan rules read: the answers plus carried comorbidity facts. */
  planAnswers: EncounterAnswers;
  carried: CarriedFact[];
  template: ComposedReview;
  scores: ComputedScore[];
  scoreMap: ScoreMap;
  flags: ReviewFlag[];
  completeness: Completeness;
  barriers: HealingBarrier[];
  comparison: ComparisonLine[];
  narrative: ReviewNarrative;
  handoffs: NonNullable<EncounterTemplate['handoffs']>;
}

export interface ReviewInput {
  module: ProcedureModule;
  phase: ReviewPhase;
  answers: EncounterAnswers;
  otherText?: Record<string, string>;
  patient: ReviewPatient;
  /** Earlier reviews of this patient, newest first. */
  prior?: PriorReview[];
}

export function readReview(input: ReviewInput): ReviewReading {
  const template = composeTemplate(input.module, input.phase, input.patient);
  const patient = { ...input.patient, bmi: effectiveBmi(input.answers, input.patient) };
  const prior = input.prior ?? [];
  const scores = computeScores(template, input.answers, patient, input.module, prior);
  const scoreMap: ScoreMap = Object.fromEntries(scores.map(s => [s.id, s]));
  const flags = reviewFlags(template, input.answers, scores, patient);
  const barriers = healingBarriers(input.answers, patient, scoreMap);
  const comparison = input.phase === 'follow_up' || prior.length ? compareWithPrior(input.module.id, input.answers, scores, prior) : [];
  const plan = planAnswers(template, input.answers, prior);
  return {
    planAnswers: plan.answers, carried: plan.carried,
    template, scores, scoreMap, flags,
    completeness: templateCompleteness(template, input.answers),
    barriers, comparison,
    narrative: narrativeFor(template, input.answers, input.otherText, scores, flags, barriers, comparison),
    handoffs: template.handoffs ?? [],
  };
}
