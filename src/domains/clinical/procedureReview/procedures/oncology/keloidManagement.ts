/**
 * Keloid management — intralesional steroid, excision with adjuvant
 * treatment (steroid, radiotherapy, pressure, silicone), and the long
 * follow-up that decides whether it worked.
 *
 * Keloids are the commonest scar problem in Nigerian practice (Fitzpatrick
 * V–VI skin; earlobe piercing, chest acne, surgery, vaccination and
 * scarification). Excision alone recurs in most patients (45–100%), so this
 * review will not plan excision without an adjuvant, and records the factors
 * that predict recurrence: site (chest, shoulder, suprapubic — high tension —
 * versus the earlobe), previous recurrence, multiplicity and family history,
 * and whether the patient can complete the adjuvant schedule. The scar is
 * scored with the scar module's own Vancouver Scar Scale (observer) and the
 * POSAS v2.0 patient scale (itch, pain…), computed by scoreScale, so a
 * keloid scored here and on the Scar Monitor is the same number.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import { getScale, scoreScale, type ScaleItem } from '../../../../scar/data/scales';
import type { PlanContext, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { fitzpatrickField, scaleItemFields, scaleResponses } from './common';

const ID = 'keloid_management';
const f = (id: string) => `${ID}.${id}`;

const VSS = getScale('vss')!;
const POSAS = getScale('posas')!;
const POSAS_PATIENT: ScaleItem[] = POSAS.items.filter(i => i.subscale === 'patient' && !i.excludedFromTotal);

// ── The keloid (carried forward) ────────────────────────────────────────────

const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'earlobe', label: 'Earlobe' },
    { value: 'ear_other', label: 'Helix / other ear' },
    { value: 'face_jaw', label: 'Face, jawline or beard area' },
    { value: 'nape', label: 'Nape / occiput (acne keloidalis)' },
    { value: 'chest', label: 'Presternal chest', flag: 'amber', flagReason: 'Presternal keloid: high-tension site with high recurrence after excision — prefer non-surgical treatment; excise only with radiotherapy (JSW 2018 consensus).' },
    { value: 'shoulder_back', label: 'Shoulder / upper back', flag: 'amber', flagReason: 'Shoulder / scapular keloid: high-tension site with high recurrence after excision (JSW 2018 consensus).' },
    { value: 'suprapubic', label: 'Suprapubic / abdominal (e.g. caesarean scar)', flag: 'amber', flagReason: 'Suprapubic keloid: high-recurrence site (JSW 2018 consensus).' },
    { value: 'limb', label: 'Limb' },
    { value: 'other', label: 'Other' },
  ],
};
const CAUSE: EncounterField = {
  id: f('cause'), label: 'Cause', kind: 'select',
  options: [
    { value: 'piercing', label: 'Ear piercing' },
    { value: 'surgery', label: 'Surgical scar' },
    { value: 'acne', label: 'Acne / folliculitis' },
    { value: 'burn_trauma', label: 'Burn or injury' },
    { value: 'vaccination', label: 'Vaccination (BCG)' },
    { value: 'scarification', label: 'Tribal marks / scarification' },
    { value: 'spontaneous', label: 'No recalled injury' },
  ],
};
const SIZE: EncounterField = { id: f('size_cm'), label: 'Greatest dimension', kind: 'number', unit: 'cm', min: 0, max: 50, important: true };
const NUMBER: EncounterField = {
  id: f('number'), label: 'Number of keloids', kind: 'select',
  options: [{ value: 'single', label: 'Single' }, { value: 'few', label: '2–4' }, { value: 'multiple', label: '5 or more', flag: 'amber', flagReason: 'Multiple keloids: strong keloid tendency — high recurrence; non-surgical treatment first.' }],
};
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The keloid',
  intent: 'Recorded once and carried forward.',
  fields: [
    SITE, { id: f('site_detail'), label: 'Exact site and side', kind: 'text' }, CAUSE, SIZE, NUMBER,
    { id: f('family_history'), label: 'Family history of keloids', kind: 'boolean' },
    fitzpatrickField(ID),
  ],
};

// ── The scar now: symptoms and scales (asked at every phase it matters) ─────

const SYMPTOMS: EncounterField = {
  id: f('symptoms'), label: 'Symptoms', kind: 'multiselect',
  options: [
    { value: 'none', label: 'None' },
    { value: 'itch', label: 'Itch' },
    { value: 'pain', label: 'Pain / tenderness' },
    { value: 'growing', label: 'Still growing' },
    { value: 'discharge', label: 'Discharge, abscess or sinus', flag: 'amber', flagReason: 'Infected keloid / sinus: drain and treat the infection before injecting or excising.' },
    { value: 'ulcer', label: 'Ulceration or bleeding', flag: 'amber', flagReason: 'Ulcerated or bleeding "keloid": biopsy — malignancy (e.g. DFSP, cSCC) can mimic a keloid.' },
    { value: 'function', label: 'Restricts movement / clothing / earring' },
  ],
};
const SCAR_NOW: EncounterSection = {
  id: f('scar_now'),
  title: 'The scar today (VSS and POSAS patient scale)',
  intent: 'Scored with the Scar Monitor\'s own instruments so the numbers match across modules.',
  fields: [SYMPTOMS, ...scaleItemFields(f('vss'), 'VSS', VSS.items), ...scaleItemFields(f('posas'), 'POSAS patient', POSAS_PATIENT)],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const HISTORY: EncounterSection = {
  id: f('history'),
  title: 'Previous treatment and the plan',
  fields: [
    {
      id: f('previous'), label: 'Previous treatment', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'steroid', label: 'Intralesional steroid' },
        { value: 'excision_alone', label: 'Excision alone' },
        { value: 'excision_adjuvant', label: 'Excision with adjuvant' },
        { value: 'radiotherapy', label: 'Radiotherapy' },
        { value: 'cryo', label: 'Cryotherapy' },
        { value: 'silicone_pressure', label: 'Silicone / pressure' },
        { value: 'fu', label: '5-fluorouracil' },
        { value: 'traditional', label: 'Traditional / herbal treatment' },
      ],
    },
    { id: f('recurred_after_excision'), label: 'Recurred after a previous excision', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Recurrence after excision: further excision only with radiotherapy or a strict adjuvant protocol; consider non-surgical treatment.' } },
    {
      id: f('plan'), label: 'Planned treatment', kind: 'select', important: true,
      options: [
        { value: 'steroid', label: 'Intralesional triamcinolone (± 5-fluorouracil) series' },
        { value: 'cryo_steroid', label: 'Cryotherapy plus intralesional steroid' },
        { value: 'excision_steroid', label: 'Excision + intralesional steroid' },
        { value: 'excision_rt', label: 'Excision + post-operative radiotherapy' },
        { value: 'excision_alone', label: 'Excision alone', flag: 'red', flagReason: 'Excision alone recurs in 45–100%: add an adjuvant (steroid, radiotherapy, pressure) (Monstrey 2014; Gold 2014).' },
        { value: 'conservative', label: 'Silicone / pressure only' },
      ],
    },
    {
      id: f('technique'), label: 'Excision technique', kind: 'select', showWhen: { field: f('plan'), equals: ['excision_steroid', 'excision_rt', 'excision_alone'] },
      options: [
        { value: 'extramarginal', label: 'Extramarginal (complete) excision' },
        { value: 'intramarginal', label: 'Intramarginal / core excision (keloid fillet or rim retained)' },
        { value: 'tension_reducing', label: 'Excision with deep tension-reducing sutures ± Z-plasty' },
      ],
    },
    {
      id: f('rt_access'), label: 'Post-operative radiotherapy access', kind: 'select', showWhen: { field: f('plan'), equals: ['excision_rt'] },
      options: [
        { value: 'within_72h', label: 'Booked to start within 72 hours of excision' },
        { value: 'delayed', label: 'Available, but only later', flag: 'amber', flagReason: 'Radiotherapy works best started within 24–72 hours of excision (JSW 2018 consensus) — reschedule the excision to match the radiotherapy slot.' },
        { value: 'unavailable', label: 'Not available / unaffordable', flag: 'amber', flagReason: 'No radiotherapy: use intralesional steroid at closure and in series, with pressure / silicone.' },
      ],
    },
    {
      id: f('commitment'), label: 'Can the patient attend the full adjuvant schedule (injections every 4–6 weeks, pressure device)?', kind: 'select', important: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'uncertain', label: 'Uncertain (distance, cost, work)', flag: 'amber', flagReason: 'An adjuvant schedule that will not be completed means a likely recurrence: agree it, or choose non-surgical treatment.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const ADJUVANT_START: EncounterSection = {
  id: f('adjuvant_start'),
  title: 'Adjuvant treatment started',
  fields: [
    { id: f('steroid_at_closure'), label: 'Triamcinolone injected into the wound edges at closure', kind: 'boolean' },
    {
      id: f('rt_given'), label: 'Post-operative radiotherapy', kind: 'select',
      options: [
        { value: 'not_planned', label: 'Not planned' },
        { value: 'started', label: 'Started within 72 hours' },
        { value: 'late', label: 'Started late / not yet started', flag: 'amber', flagReason: 'Radiotherapy delayed beyond 72 hours: less effective (JSW 2018 consensus) — start as soon as possible and add steroid.' },
      ],
    },
    {
      id: f('pressure_device'), label: 'Pressure device (earring / clip / garment)', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed' },
        { value: 'fitted', label: 'Fitted' },
        { value: 'not_fitted', label: 'Needed — not yet fitted', flag: 'amber', flagReason: 'Earlobe and other pressure-amenable sites: fit the pressure device once the wound is healed.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const RESPONSE: EncounterSection = {
  id: f('response'),
  title: 'Response, recurrence and treatment effects',
  fields: [
    {
      id: f('status'), label: 'Keloid now', kind: 'select', important: true,
      options: [
        { value: 'flat', label: 'Flat, symptom-free' },
        { value: 'improving', label: 'Improving' },
        { value: 'early_recurrence', label: 'Early recurrence (firm, itchy nodule at the scar)', flag: 'amber', flagReason: 'Early recurrence: inject now — small early recurrences respond best.' },
        { value: 'recurred', label: 'Recurred', flag: 'amber', flagReason: 'Established recurrence: steroid series ± 5-FU; re-excision only with radiotherapy.' },
        { value: 'no_response', label: 'No response to injections' },
      ],
    },
    { id: f('injections'), label: 'Injection sessions so far', kind: 'number', min: 0, max: 40 },
    {
      id: f('side_effects'), label: 'Steroid / radiotherapy effects', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'atrophy', label: 'Skin atrophy / dent', flag: 'amber', flagReason: 'Steroid atrophy: lengthen the interval, lower the concentration and inject only into the keloid.' },
        { value: 'hypopigmentation', label: 'Hypopigmentation', flag: 'amber', flagReason: 'Steroid hypopigmentation (prominent in dark skin): lower concentration, inject intralesionally; it usually improves over months.' },
        { value: 'telangiectasia', label: 'Telangiectasia' },
        { value: 'systemic', label: 'Menstrual change / Cushingoid features', flag: 'amber', flagReason: 'Systemic steroid effects: reduce the total dose per session and lengthen the interval.' },
        { value: 'rt_skin', label: 'Radiotherapy skin change (pigment, dryness)' },
      ],
    },
    {
      id: f('adherence_device'), label: 'Pressure / silicone use', kind: 'select',
      options: [
        { value: 'not_applicable', label: 'Not prescribed' },
        { value: 'daily', label: 'As advised (12 hours or more a day)' },
        { value: 'irregular', label: 'Irregular / stopped', flag: 'amber', flagReason: 'Pressure / silicone only work with daily use for months: find the barrier (comfort, heat, cost).' },
      ],
    },
  ],
};

// ── Scores (the scar module's instruments) ──────────────────────────────────

const priorTotal = (prior: Parameters<ScoreRule>[0]['prior'], id: string) =>
  prior.find(p => p.moduleId === ID)?.scores.find(s => s.id === id)?.total ?? null;

export const vssScore: ScoreRule = ({ answers, prior }) => {
  const r = scoreScale(VSS, scaleResponses(f('vss'), VSS.items, answers));
  if (r.total == null && r.incompleteItems.length === VSS.items.length) return null;
  const before = priorTotal(prior, `${ID}.vss`);
  return {
    id: `${ID}.vss`, name: VSS.name, abbreviation: 'VSS', total: r.total, max: 14,
    band: r.total == null ? null : {
      label: `VSS ${r.total}/14`, level: 'none',
      interpretation: `Observer-rated scar severity (higher is worse)${before != null ? `; ${before} at the last review` : ''}. VSS has no published severity bands: compare with this patient's own earlier scores.`,
    },
    incomplete: r.incompleteItems.map(i => VSS.items.find(x => x.id === i)?.label ?? i),
    source: `scar/data/scales scoreScale — ${VSS.citation}`,
  };
};

export const posasPatientScore: ScoreRule = ({ answers, prior }) => {
  const r = scoreScale({ items: POSAS_PATIENT }, scaleResponses(f('posas'), POSAS_PATIENT, answers));
  if (r.total == null && r.incompleteItems.length === POSAS_PATIENT.length) return null;
  const before = priorTotal(prior, `${ID}.posas_patient`);
  return {
    id: `${ID}.posas_patient`, name: 'POSAS v2.0 — patient scale', abbreviation: 'PSAS', total: r.total, max: 60,
    band: r.total == null ? null : {
      label: `PSAS ${r.total}/60`, level: 'none',
      interpretation: `Patient-rated (6 = normal skin, 60 = worst)${before != null ? `; ${before} at the last review` : ''}. No published bands: follow the trend.`,
    },
    incomplete: r.incompleteItems.map(i => POSAS_PATIENT.find(x => x.id === i)?.label ?? i),
    source: `scar/data/scales scoreScale — ${POSAS.citation}`,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const HIGH_TENSION = ['chest', 'shoulder_back', 'suprapubic'];
const highRecurrence = (a: EncounterAnswers) =>
  isOneOf(a, f('site'), ...HIGH_TENSION) || isYes(a, f('recurred_after_excision')) || isOneOf(a, f('number'), 'multiple') || isYes(a, f('family_history'));
const excising = (a: EncounterAnswers) => isOneOf(a, f('plan'), 'excision_steroid', 'excision_rt', 'excision_alone');

/** Ogawa / JSW 2018 consensus doses by site (the radiotherapy team decides). */
const rtDose = (a: EncounterAnswers) => isOneOf(a, f('site'), 'earlobe')
  ? '10 Gy in 2 fractions'
  : isOneOf(a, f('site'), ...HIGH_TENSION) ? '20 Gy in 4 fractions' : '15 Gy in 3 fractions';

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Relief of itch and pain', 'The symptoms are usually why patients seek treatment'),
      L('A flatter, softer scar — with the patient understanding that keloids can recur', 'Recurrence is common even with adjuvant treatment (Mankowski 2017; JSW 2018)'),
      L('No excision without an adjuvant, and the adjuvant completed', 'Excision alone recurs in 45–100% (Monstrey 2014; Gold 2014)'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const plan = a[f('plan')];
  const sym = chosen(a, f('symptoms'));
  const site = a[f('site')];
  const pregnant = isOneOf(a, 'core.pregnancy', 'pregnant', 'possible');
  const young = (ctx.patient.ageYears ?? 99) < 18;
  return merge(
    sym.includes('ulcer') && { problem: { investigations: [L('Biopsy before treatment: an ulcerated or atypical "keloid" may be a DFSP or carcinoma', 'Ulcerated / bleeding lesion', 'urgent')] } },
    sym.includes('discharge') && { problem: { treatment: [L('Drain abscesses, lay open sinuses and treat infection (culture-guided antibiotics if cellulitis) before steroid or surgery', 'Infected keloid / sinus')] } },
    plan === 'excision_alone' && { problem: { treatment: [L('Add an adjuvant: intralesional triamcinolone at closure and every 4–6 weeks, or radiotherapy within 72 hours; plus pressure / silicone', 'Excision alone planned — 45–100% recurrence (Monstrey 2014; Gold 2014)', 'urgent')] } },
    (plan === 'steroid' || plan === 'cryo_steroid' || plan === 'excision_steroid') && { problem: { treatment: [L(
      'Intralesional triamcinolone 10–40 mg/mL into the keloid (not the surrounding skin), every 4–6 weeks; maximum per session commonly up to 40 mg in adults and weight-based in children (e.g. about 1 mg/kg, not over 40 mg) — check the local protocol; 5-fluorouracil may be combined for resistant keloids',
      'Intralesional corticosteroid — first-line for keloids (Monstrey 2014; Gold 2014; JSW 2018)')] } },
    plan === 'excision_steroid' && { problem: { treatment: [L('Inject triamcinolone into the wound edges at closure, then continue the series after healing', 'Excision with steroid adjuvant (Monstrey 2014; series length is a local-protocol choice)')] } },
    plan === 'excision_rt' && { problem: {
      treatment: [L(`Post-operative radiotherapy starting within 24–72 hours of excision; published site-based dose ${rtDose(a)} (final dose by clinical oncology)`, `Site: ${String(site ?? 'not recorded')} (Ogawa / JSW 2018 consensus)`)],
      referrals: [L('Clinical oncology / radiotherapy booking before the excision date', 'Radiotherapy must start within 72 hours of excision')],
    } },
    plan === 'excision_rt' && (young || pregnant) && { cautions: [`Radiotherapy for a benign condition in ${pregnant ? 'pregnancy is contraindicated — defer' : 'a child or adolescent: use only after careful MDT discussion, shielding thyroid and breast'}.`] },
    pregnant && (plan === 'steroid' || plan === 'cryo_steroid' || plan === 'excision_steroid') && { cautions: ['Pregnancy: defer elective keloid treatment and avoid 5-fluorouracil; keloids often worsen in pregnancy and are re-assessed after delivery.'] },
    excising(a) && isOneOf(a, f('site'), ...HIGH_TENSION) && plan !== 'excision_rt' && { problem: { treatment: [L('Chest, shoulder and suprapubic keloids recur most: excise only if symptoms justify it, with radiotherapy where available, deep tension-reducing sutures and Z-plasty to break up the line', 'High-tension site (JSW 2018 consensus)')] } },
    excising(a) && site === 'earlobe' && { problem: { treatment: [L('Earlobe: excise (core / intramarginal excision preserves the lobe shape), then a pressure earring or clip worn at least 12 hours a day for 6–12 months once healed', 'Earlobe keloid — pressure is effective at this site (duration is a local-protocol choice)')] } },
    (plan === 'conservative' || excising(a)) && { general: [G('Wound care and dressings', L('Once healed: silicone gel or sheet over the scar most of the day, and pressure where the site allows, for at least 3–6 months', 'Silicone and pressure reduce recurrence (Monstrey 2014; Gold 2014)'))] },
    isOneOf(a, f('fitzpatrick'), 'V', 'VI') && (plan === 'steroid' || plan === 'cryo_steroid' || plan === 'excision_steroid') && { counselling: [P('Steroid in dark skin', 'Injected steroid can lighten the skin and thin it; inject only into the keloid; it usually improves over months.', 'Fitzpatrick V–VI with intralesional steroid')] },
    isOneOf(a, f('plan'), 'cryo_steroid') && isOneOf(a, f('fitzpatrick'), 'V', 'VI') && { cautions: ['Cryotherapy in Fitzpatrick V–VI skin causes lasting hypopigmentation: warn the patient, or prefer intralesional cryotherapy.'] },
    isOneOf(a, f('commitment'), 'uncertain') && excising(a) && { cautions: ['The patient may not complete the adjuvant schedule: excision without it is likely to recur larger — agree a plan they can complete (local clinic for injections, pressure device).'] },
    highRecurrence(a) && { counselling: [P('Recurrence', 'Keloids can come back even with the best treatment, sometimes larger. Treatment controls rather than cures; early return for any regrowth lets it be injected while small.', 'High-recurrence features (site, previous recurrence, multiple keloids or family history)')] },
    { counselling: [P('Prevention', 'Avoid new piercings, tattoos and elective cuts; treat acne early; any future surgery should be planned with keloid prevention (steroid, silicone).', 'Keloid tendency persists for life')] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('rt_given'), 'late') && { problem: { treatment: [L('Start the radiotherapy as soon as possible and add intralesional steroid at the first review', 'Radiotherapy delayed beyond 72 hours (JSW 2018)', 'urgent')] } },
    !isYes(a, f('steroid_at_closure')) && isOneOf(a, f('rt_given'), 'not_planned') && { problem: { treatment: [L('Begin intralesional triamcinolone at suture removal (or at 2 weeks) and continue every 4–6 weeks', 'No adjuvant given at closure and no radiotherapy planned')] } },
    isOneOf(a, f('pressure_device'), 'not_fitted') && { problem: { treatment: [L('Fit the pressure earring / clip / garment once the wound has healed (usually 2 weeks)', 'Pressure device needed but not fitted')] } },
    { general: [G('Wound care and dressings', L('Remove sutures at 7–10 days (14 on the chest and back); tape the scar to reduce tension for the first weeks', 'Keloid excision wound'))] },
    { dischargeCriteria: ['First injection or radiotherapy appointments booked', 'Knows when to start silicone / pressure'] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const se = chosen(a, f('side_effects'));
  const n = numOf(a, f('injections'));
  const vss = ctx.scores[`${ID}.vss`]?.total ?? null;
  const vssBefore = ctx.prior.find(p => p.moduleId === ID)?.scores.find(s => s.id === `${ID}.vss`)?.total ?? null;
  return merge(
    isOneOf(a, f('status'), 'early_recurrence', 'recurred') && { problem: { treatment: [L('Restart intralesional triamcinolone every 4–6 weeks (± 5-fluorouracil); re-excision only with radiotherapy', `Keloid ${String(a[f('status')]).replace('_', ' ')}`)] } },
    isOneOf(a, f('status'), 'no_response') && { problem: { treatment: [L('Steroid-resistant keloid: add 5-fluorouracil, consider intralesional cryotherapy, or excision with radiotherapy; refer to the Keloid Care pathway', n != null ? `No response after ${n} sessions` : 'No response to injections')] } },
    (se.includes('atrophy') || se.includes('hypopigmentation') || se.includes('systemic')) && { problem: { treatment: [L('Reduce the steroid concentration / total dose and lengthen the interval; inject strictly intralesionally', `Steroid effects: ${se.filter(x => x !== 'rt_skin').join(', ')}`)] } },
    isOneOf(a, f('adherence_device'), 'irregular') && { counselling: [P('Pressure and silicone', 'They work only when used daily for months; ask what makes them hard to use (heat, comfort, cost) and find an option that fits.', 'Irregular use')] },
    vss != null && vssBefore != null && vss > vssBefore && { problem: { monitoring: [L('Scar worse than at the last review: treat as early recurrence and photograph on the Scar Monitor', `VSS ${vssBefore} -> ${vss}`)] } },
    { problem: { monitoring: [L('Review every 4–6 weeks while injecting, then every 3 months for at least 12–24 months; photograph and score at each visit', 'Most keloid recurrences appear within 1–2 years (JSW 2018 consensus)')] } },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

const site = (c: PlanContext) => c.answers[f('site')];

export const keloidManagement: ProcedureModule = {
  id: ID,
  name: 'Keloid management (injection, excision + adjuvant)',
  summary: 'Keloids: recurrence risk by site, previous treatment, intralesional steroid, excision with steroid / radiotherapy / pressure, VSS and POSAS scoring, and long-term follow-up.',
  group: 'other',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Keloid',
  basis: [
    'Monstrey S et al. Updated scar management practical guidelines: non-invasive and invasive measures. J Plast Reconstr Aesthet Surg 2014;67:1017-25',
    'Gold MH et al. Updated international clinical recommendations on scar management: part 2. Dermatol Surg 2014;40:825-31',
    'Ogawa R et al. Diagnosis and treatment of keloids and hypertrophic scars — Japan Scar Workshop Consensus Document 2018. Burns Trauma 2019;7:39 (radiotherapy timing and site-based doses)',
    'Mankowski P et al. Optimizing radiotherapy for keloids: a meta-analysis. Ann Plast Surg 2017;78:403-11',
    'Vancouver Scar Scale (Sullivan 1990; Baryza 1995) and POSAS v2.0 (Draaijers 2004) — via the Scar Monitor\'s scales',
    'Fitzpatrick TB. The validity and practicality of sun-reactive skin types I through VI. Arch Dermatol 1988;124:869-71',
  ],
  catalog: {
    feeIds: ['minor-007', 'soft-001', 'soft-002', 'soft-003'],
    educationId: 'SCAR-001',
    patientEducationIds: ['minor-keloid-excision', 'keloid-management'],
  },
  sections: {
    pre_op: [DETAILS, SCAR_NOW, HISTORY],
    post_op: [DETAILS, ADJUVANT_START],
    follow_up: [DETAILS, SCAR_NOW, RESPONSE],
  },
  carryForward: [f('site'), f('site_detail'), f('cause'), f('size_cm'), f('number'), f('family_history'), f('fitzpatrick')],
  scores: [vssScore, posasPatientScore],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Keloid treatment (excision and / or injections, with adjuvant treatment)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Relieve itch and pain',
      'Flatten and shrink the keloid',
      'Reduce the chance of it coming back by combining surgery with injections, radiotherapy or pressure',
    ],
    risks: [
      { name: 'Steroid side effects', description: 'Thinning of the skin, a dent, lighter patches (more visible in dark skin), small visible vessels; rarely menstrual changes' },
      { name: 'Radiotherapy effects', description: 'Darker or lighter skin and dryness at the site; a very small theoretical long-term risk of cancer in the treated area' },
      { name: 'Wound problems', description: 'Infection, wound opening or a slow-healing wound after excision' },
      { name: 'Ear shape change', description: 'After earlobe excision the lobe may be smaller or a different shape' },
      { name: 'Recurrence despite adjuvant treatment', description: 'Even with radiotherapy the keloid can return', frequency: 'about 15–23% after excision with radiotherapy (Mankowski 2017)' },
    ],
    alternatives: [
      'Steroid injections alone (often flatten the keloid over several sessions)',
      'Silicone gel or sheets and pressure garments / earrings',
      'Cryotherapy (can lighten dark skin)',
      'No treatment — keloids are not cancerous and do not need removing for safety',
    ],
    riskOfNotTreating: 'A keloid is not dangerous and does not turn into cancer, but it may keep growing, itching and hurting, and may become infected. Not treating it is a reasonable choice.',
    anaesthesiaOptions: ['local', 'general'],
    additionalProcedures: ['Steroid injections into the wound at the end of the operation', 'Radiotherapy starting within 3 days of the operation', 'Fitting a pressure earring, clip or garment'],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: true,
    counsellingTopics: [
      'Why surgery alone is not enough and what the adjuvant schedule involves',
      'The realistic chance of recurrence at this site',
      'Steroid injection effects on dark skin',
      'Silicone and pressure: how long, how many hours a day',
      'Avoiding new keloids (piercings, tattoos, acne)',
    ],
    modifiers: [
      { id: 'keloid_tension_site', when: c => isOneOf(c.answers, f('site'), ...HIGH_TENSION),
        text: 'Keloids on the chest, shoulder or lower abdomen come back more often than those on the earlobe, even with radiotherapy.',
        why: 'High-tension site (JSW 2018; Mankowski 2017)' },
      { id: 'keloid_recurred', when: c => isYes(c.answers, f('recurred_after_excision')),
        text: 'Because this keloid has come back after surgery before, it is more likely to come back again.',
        why: 'Previous recurrence after excision' },
      { id: 'keloid_multiple', when: c => isOneOf(c.answers, f('number'), 'multiple') || isYes(c.answers, f('family_history')),
        text: 'Because you form keloids easily (several keloids or a family history), recurrence and new keloids at any cut are more likely.',
        why: 'Multiple keloids / family history' },
      { id: 'keloid_no_rt', when: c => isOneOf(c.answers, f('rt_access'), 'unavailable', 'delayed'),
        text: 'Radiotherapy cannot be given in time after the operation, so the injection and pressure treatment afterwards is especially important to stop it coming back.',
        why: 'Radiotherapy unavailable / delayed' },
      { id: 'keloid_dark_skin_steroid', when: c => isOneOf(c.answers, f('fitzpatrick'), 'V', 'VI') && hasAny(c.answers, f('plan'), 'steroid', 'cryo_steroid', 'excision_steroid'),
        text: 'In darker skin, steroid injections and cryotherapy more often leave lighter patches; these usually fade over months but can last.',
        why: 'Fitzpatrick V–VI' },
      { id: 'keloid_earlobe_shape', when: c => site(c) === 'earlobe' && excising(c.answers),
        text: 'After removing an earlobe keloid you will need to wear a pressure earring for many months, and the lobe may look different.',
        why: 'Earlobe excision' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before excision', purpose: 'Radiotherapy slot within 72 hours confirmed (if planned); pressure device ordered' }],
    post_op: [
      { when: '1–3 days', purpose: 'Radiotherapy fractions (if planned)' },
      { when: '7–14 days', purpose: 'Suture removal; start / continue steroid; fit pressure device' },
    ],
    follow_up: [
      { when: 'Every 4–6 weeks', purpose: 'Intralesional steroid while the scar is active' },
      { when: 'Every 3 months for at least 12–24 months', purpose: 'Recurrence check with VSS / POSAS and photographs (most recurrences within 1–2 years)' },
    ],
  },
  handoffs: [
    { label: 'Keloid Care pathway', route: '/keloid-care', when: 'Treatment planning and the injection schedule' },
    { label: 'Scar Monitor (photographs, VSS / POSAS trend)', route: '/scar-monitor', phases: ['pre_op', 'follow_up'] },
    { label: 'Referrals (radiotherapy)', route: '/referrals', phases: ['pre_op'], when: 'Excision with post-operative radiotherapy' },
    { label: 'Patient education — keloids', route: '/patient-education', phases: ['pre_op', 'follow_up'] },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Including injections, radiotherapy and pressure device' },
  ],
};

/** Exposed for tests. */
export const KELOID_FIELDS = { SITE, NUMBER, SYMPTOMS };
