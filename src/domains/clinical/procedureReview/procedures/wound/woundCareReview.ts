/**
 * Wound care review — the reference module for wound reviews.
 *
 * The core already asks everything every wound needs (TIMERS, IWII infection
 * continuum, measurements, dressing goal, and the whole patient). This module
 * adds only what depends on the wound's CAUSE: the ABPI gate before
 * compression for leg ulcers, the pressure-injury category, offloading,
 * contamination for traumatic wounds (tetanus is the core's), and atypical / Buruli
 * features — then the cause-specific plan.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import { PRESSURE_ULCER_STAGES } from '../../../../pressure-sore/data/clinicalProtocol';
import type { PlanContribution, PlanRule, ProcedureModule, RuleLine } from '../../types';
import { chosen, isOneOf, numOf, hasAny } from '../../core/answers';
import { L, biteExposureLine, merge } from '../../ruleKit';

const ID = 'wound_care_review';
const f = (id: string) => `${ID}.${id}`;
const LEG = ['venous', 'arterial', 'mixed', 'diabetic'];

const ABPI: EncounterField = {
  id: f('abpi'), label: 'ABPI (ankle-brachial pressure index)', kind: 'number', min: 0, max: 3,
  showWhen: { field: 'core.wound_aetiology', equals: LEG },
  help: 'Required before any compression (NICE CKS; SIGN 120). Use the Vascular module for toe pressures / TBI.',
  numericFlags: [
    { op: '<', value: 0.5, level: 'red', reason: 'ABPI below 0.5: severe arterial disease — no compression; urgent vascular referral (SIGN 120).' },
    { op: '<', value: 0.8, level: 'amber', reason: 'ABPI below 0.8: arterial component — no full compression; vascular referral (NICE CKS; SIGN 120).' },
    { op: '>', value: 1.3, level: 'amber', reason: 'ABPI above 1.3: incompressible (calcified) arteries — ABPI is unreliable; measure toe pressures / TBI.' },
  ],
};

const CAUSE: EncounterSection = {
  id: f('cause'),
  title: 'Cause-specific assessment',
  intent: 'The questions that depend on why the wound is there. Shown according to the aetiology chosen above.',
  fields: [
    ABPI,
    {
      id: f('venous_signs'), label: 'Signs of venous disease', kind: 'multiselect',
      showWhen: { field: 'core.wound_aetiology', equals: ['venous', 'mixed'] },
      options: [
        { value: 'varicose', label: 'Varicose veins' },
        { value: 'haemosiderin', label: 'Haemosiderin staining' },
        { value: 'lipodermatosclerosis', label: 'Lipodermatosclerosis' },
        { value: 'atrophie', label: 'Atrophie blanche' },
        { value: 'ankle_oedema', label: 'Ankle oedema' },
      ],
    },
    {
      id: f('compression'), label: 'Compression', kind: 'select',
      showWhen: { field: 'core.wound_aetiology', equals: ['venous', 'mixed'] },
      options: [
        { value: 'none', label: 'None yet' },
        { value: 'in_use', label: 'In use and tolerated' },
        { value: 'not_tolerated', label: 'In use but not tolerated', flag: 'amber', flagReason: 'Compression not tolerated: find out why (pain, fit, heat, cost) — reduced compression is better than none if ABPI allows.' },
      ],
    },
    {
      id: f('pi_category'), label: 'Pressure injury category (this wound)', kind: 'select',
      showWhen: { field: 'core.wound_aetiology', equals: ['pressure'] },
      options: PRESSURE_ULCER_STAGES.map(s => ({ value: s.code, label: `${s.stage} — ${s.name}` })),
    },
    {
      id: f('offloading'), label: 'Offloading', kind: 'select',
      showWhen: { field: 'core.wound_aetiology', equals: ['pressure', 'diabetic'] },
      options: [
        { value: 'adequate', label: 'Adequate (24 hours a day)' },
        { value: 'partial', label: 'Partial', flag: 'amber', flagReason: 'Partial offloading: the wound will not heal while load continues.' },
        { value: 'none', label: 'None', flag: 'amber', flagReason: 'No offloading: the wound will not heal while load continues (IWGDF 2023; NPIAP/EPUAP 2019).' },
      ],
    },
    {
      id: f('contamination'), label: 'Contamination', kind: 'select',
      showWhen: { field: 'core.wound_aetiology', equals: ['traumatic'] },
      options: [
        { value: 'clean', label: 'Clean' },
        { value: 'contaminated', label: 'Contaminated (soil, road)', flag: 'amber', flagReason: 'Contaminated wound: thorough irrigation and debridement; consider antibiotic prophylaxis (open fractures).' },
        { value: 'bite', label: 'Bite (human or animal)', flag: 'red', flagReason: 'Bite: irrigation and debridement, antibiotic prophylaxis, and a rabies / blood-borne-virus risk assessment today.' },
        { value: 'heavy', label: 'Heavily contaminated / devitalised', flag: 'amber', flagReason: 'Heavy contamination: formal debridement in theatre; delayed closure.' },
      ],
    },
    {
      id: f('atypical'), label: 'Atypical features', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'unusual_site', label: 'Unusual site for its supposed cause' },
        { value: 'violaceous_edge', label: 'Violaceous, undermined edge / cribriform scarring (pyoderma gangrenosum?)', flag: 'amber',
          flagReason: 'Possible pyoderma gangrenosum: do not debride aggressively (pathergy); biopsy the edge and refer to dermatology.' },
        { value: 'rapid_growth', label: 'Rapid growth or exophytic tissue', flag: 'amber', flagReason: 'Rapid growth or exophytic tissue: biopsy to exclude malignancy.' },
        { value: 'systemic_disease', label: 'Systemic inflammatory disease (vasculitis, RA, IBD)' },
        { value: 'no_response', label: 'No response to good standard care' },
      ],
    },
    {
      id: f('buruli'), label: 'Painless, undermined ulcer with oedema in an endemic area (possible Buruli ulcer)', kind: 'boolean',
      help: 'Mycobacterium ulcerans is endemic in parts of southern Nigeria.',
      flagWhenTrue: { level: 'amber', reason: 'Possible Buruli ulcer: swab / fine-needle aspirate for IS2404 PCR (and ZN); WHO treatment is rifampicin with clarithromycin for 8 weeks; notify the state programme.' },
    },
    {
      id: f('previous_treatment'), label: 'Treatments already tried', kind: 'multiselect',
      options: [
        { value: 'dressings', label: 'Dressings' },
        { value: 'antibiotics', label: 'Antibiotics' },
        { value: 'debridement', label: 'Debridement' },
        { value: 'compression', label: 'Compression' },
        { value: 'npwt', label: 'NPWT' },
        { value: 'graft', label: 'Skin graft' },
        { value: 'traditional', label: 'Traditional treatment' },
      ],
    },
  ],
};

const RESPONSE: EncounterSection = {
  id: f('response_section'),
  title: 'Response to the wound plan',
  fields: [
    {
      id: f('response'), label: 'Since the last review the wound is', kind: 'select', important: true,
      options: [
        { value: 'healed', label: 'Healed' },
        { value: 'improving', label: 'Improving' },
        { value: 'static', label: 'Static', flag: 'amber', flagReason: 'Static wound: re-examine every TIMERS factor before continuing the same plan.' },
        { value: 'worse', label: 'Worse', flag: 'amber', flagReason: 'Deteriorating wound: look for infection, ischaemia, pressure, non-adherence or malignancy.' },
      ],
    },
    {
      id: f('recurrence_prevention'), label: 'Recurrence prevention in place', kind: 'multiselect',
      showWhen: { field: f('response'), equals: ['healed'] },
      options: [
        { value: 'hosiery', label: 'Compression hosiery' },
        { value: 'footwear', label: 'Protective footwear / insoles' },
        { value: 'surface', label: 'Pressure-redistributing surface at home' },
        { value: 'education', label: 'Skin-care education' },
      ],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => ({
  problem: {
    goals: [
      L(isOneOf(ctx.answers, 'core.goal_of_care', 'palliative') ? 'Comfort: odour, exudate, bleeding and pain controlled' : 'A healed wound — or a stable, infection-free wound while its cause is corrected',
        `Goal of care: ${String(ctx.answers['core.goal_of_care'] ?? 'not yet recorded')}`),
      L('The cause of the wound identified and treated', 'Wounds heal when their cause is corrected (TIMERS)'),
    ],
  },
});

const compressionGate: PlanRule = ctx => {
  const a = ctx.answers;
  const abpi = numOf(a, f('abpi'));
  // A diabetic foot ulcer: the ABPI decides vascular referral, not compression;
  // calcified vessels make a normal ABPI unreliable (IWGDF 2023 PAD).
  if (isOneOf(a, 'core.wound_aetiology', 'diabetic')) {
    if (abpi == null) return null;
    return { problem: abpi < 0.5
      ? { referrals: [L('Urgent vascular imaging and a revascularisation decision with the vascular team', `ABPI ${abpi} — below 0.5 in a diabetic foot ulcer (IWGDF 2023 PAD)`, 'urgent')] }
      : abpi < 0.9
        ? { referrals: [L('Vascular referral; toe pressure / TBI and pedal Doppler waveforms', `ABPI ${abpi} — PAD in a diabetic foot ulcer (IWGDF 2023 PAD: ABI below 0.9)`)] }
        : { investigations: [L('Toe pressure / TBI and pedal Doppler waveforms: a normal or high ABPI does not exclude PAD in diabetes', `ABPI ${abpi} in diabetes (IWGDF 2023 PAD)`)] } };
  }
  // An arterial ulcer is tissue loss with PAD — chronic limb-threatening
  // ischaemia whatever the ABPI: urgent vascular referral, never compression.
  if (isOneOf(a, 'core.wound_aetiology', 'arterial')) {
    return { problem: {
      referrals: [L('Urgent vascular referral for imaging and revascularisation; no compression', `Arterial ulcer${abpi != null ? `, ABPI ${abpi}` : ''} — chronic limb-threatening ischaemia (Global Vascular Guidelines 2019)`, 'urgent')],
      ...(abpi == null ? { investigations: [L('ABPI and toe pressures (hand-held Doppler)', 'Arterial ulcer — baseline perfusion (GVG 2019)')] } : {}),
    } };
  }
  if (!isOneOf(a, 'core.wound_aetiology', 'venous', 'mixed')) return null;
  const out: PlanContribution = { problem: {} };
  if (abpi == null) {
    out.problem!.investigations = [L('Measure ABPI before any compression (hand-held Doppler)', 'Leg ulcer — compression is unsafe in arterial disease (NICE CKS; SIGN 120)', 'urgent')];
    return out;
  }
  const why = `ABPI ${abpi}`;
  if (abpi < 0.5) {
    out.problem!.referrals = [L('Urgent vascular surgery referral; no compression', `${why} — severe arterial disease (SIGN 120)`, 'urgent')];
  } else if (abpi < 0.8) {
    out.problem!.referrals = [L('Vascular referral; reduced compression only under specialist supervision', `${why} — arterial component (NICE CKS)`)];
  } else if (abpi > 1.3) {
    out.problem!.investigations = [L('Toe pressures / toe-brachial index (Vascular module) before compression', `${why} — incompressible arteries`)];
  } else if (isOneOf(a, 'core.wound_aetiology', 'venous', 'mixed')) {
    out.problem!.treatment = [L(
      isOneOf(a, 'core.wound_aetiology', 'mixed')
        ? 'Reduced compression under specialist supervision; leg elevation and calf-muscle exercise'
        : 'Strong compression (about 40 mmHg at the ankle, multi-component bandage system) once spreading infection is controlled; leg elevation and calf-muscle exercise',
      `${why} — within 0.8–1.3 (SIGN 120)`)];
    out.problem!.referrals = [L('Venous duplex and referral to a vascular service for superficial venous treatment (early endovenous ablation speeds healing)', 'Venous leg ulcer (NICE CG168; EVRA trial 2018)')];
  }
  return out;
};

const causeSpecific: PlanRule = ctx => {
  const a = ctx.answers;
  const lines: PlanContribution[] = [];
  const cat = a[f('pi_category')];
  if (isOneOf(a, 'core.wound_aetiology', 'pressure')) {
    lines.push({ problem: { treatment: [L('Offload the injury completely: 30-degree tilt repositioning, pressure-redistributing mattress, heels free; no ring cushions', `Pressure injury${typeof cat === 'string' ? ` (${cat.replace('_', ' ')})` : ''} (NPIAP/EPUAP 2019)`, 'urgent')] } });
    if (cat === 'stage_3' || cat === 'stage_4' || cat === 'unstageable') {
      lines.push({ problem: { treatment: [L('Surgical debridement, then consider flap reconstruction once the wound is clean, nutrition optimised and offloading assured (pressure-sore flap review)', `${String(cat).replace('_', ' ')} pressure injury over a bony prominence`)] } });
    }
  }
  if (isOneOf(a, 'core.wound_aetiology', 'diabetic')) {
    lines.push({ problem: {
      treatment: [L('Offload: total-contact cast or a non-removable knee-high device where suitable; otherwise a removable walker worn at all times', 'Diabetic foot ulcer (IWGDF 2023)', 'urgent')],
      referrals: [L('Stage with WIfI / SINBAD in the Vascular and Limb Salvage modules; multidisciplinary foot team', 'Diabetic foot ulcer (IWGDF 2023)')],
    } });
  }
  if (isOneOf(a, f('offloading'), 'none', 'partial') && !isOneOf(a, 'core.wound_aetiology', 'pressure', 'diabetic')) {
    lines.push({ problem: { treatment: [L('Offload the wound', 'Offloading inadequate')] } });
  }
  if (isOneOf(a, f('contamination'), 'bite')) {
    lines.push({ problem: { treatment: [
      L('Thorough irrigation and debridement; leave a bite wound open unless on the face; antibiotic prophylaxis (co-amoxiclav class, or the local alternative in penicillin allergy)', 'Bite wound (UKHSA 2020; IDSA 2014 SSTI)', 'urgent'),
      biteExposureLine('Bite wound'),
    ] } });
  }
  if (isOneOf(a, f('contamination'), 'contaminated', 'heavy')) {
    lines.push({ problem: { treatment: [L(isOneOf(a, f('contamination'), 'heavy')
      ? 'Formal debridement and irrigation in theatre; leave open for delayed closure'
      : 'Thorough irrigation and debridement; antibiotic prophylaxis for bites and open fractures', `Contamination: ${String(a[f('contamination')])}`, 'urgent')] } });
  }
  const atyp = chosen(a, f('atypical'));
  if (atyp.includes('violaceous_edge')) {
    lines.push({ problem: { treatment: [L('Avoid aggressive debridement (pathergy); biopsy the edge; dermatology referral for suspected pyoderma gangrenosum', 'Violaceous undermined edge')] } });
  }
  if (atyp.some(x => ['rapid_growth', 'unusual_site', 'no_response'].includes(x)) && !isOneOf(a, 'core.wound_biopsy', 'done', 'benign', 'malignant')) {
    lines.push({ problem: { investigations: [L('Biopsy of edge and base for histology (and tissue for culture, including AFB)', `Atypical features: ${atyp.join(', ').replace(/_/g, ' ')}`)] } });
  }
  if (atyp.includes('systemic_disease')) {
    lines.push({ problem: { referrals: [L('Rheumatology / physician review: an inflammatory cause may need systemic treatment', 'Systemic inflammatory disease')] } });
  }
  if (a[f('buruli')] === true) {
    lines.push({ problems: [{ problem: 'Possible Buruli ulcer (Mycobacterium ulcerans)', lines: {
      investigations: [L('Swab of the undermined edge or fine-needle aspirate for IS2404 PCR (and ZN microscopy)', 'Possible Buruli ulcer (WHO 2012/2019)')],
      treatment: [L('If confirmed: rifampicin with clarithromycin for 8 weeks; wound care; surgery and grafting after antibiotics where needed; prevent contracture', 'WHO Buruli ulcer treatment guidance')],
      referrals: [L('Notify the state Buruli ulcer / NTD programme', 'Notifiable neglected tropical disease')],
    } }] });
  }
  return merge(...lines);
};

const response: PlanRule = ctx => {
  const a = ctx.answers;
  const r = a[f('response')];
  if (r === 'healed') {
    const prevention: RuleLine[] = [];
    if (isOneOf(a, 'core.wound_aetiology', 'venous', 'mixed') && !hasAny(a, f('recurrence_prevention'), 'hosiery')) {
      prevention.push(L('Compression hosiery for life to prevent recurrence (if ABPI allows)', 'Healed venous ulcer (SIGN 120)'));
    }
    if (isOneOf(a, 'core.wound_aetiology', 'diabetic') && !hasAny(a, f('recurrence_prevention'), 'footwear')) {
      prevention.push(L('Protective footwear and daily foot inspection; foot-protection clinic', 'Healed diabetic foot ulcer (IWGDF 2023)'));
    }
    if (isOneOf(a, 'core.wound_aetiology', 'pressure') && !hasAny(a, f('recurrence_prevention'), 'surface')) {
      prevention.push(L('Pressure-redistributing surface and repositioning plan at home', 'Healed pressure injury (NPIAP/EPUAP 2019)'));
    }
    return {
      problem: { treatment: [...prevention, L('Moisturise the healed skin; protect it from trauma; discharge from the wound clinic with a recurrence plan', 'Wound healed')] },
    };
  }
  if (r === 'static' || r === 'worse') {
    return { problem: { treatment: [L('Change the plan only after re-examining every TIMERS factor, the cause, perfusion, offloading and adherence; biopsy if not done', `Wound ${r} since the last review`, r === 'worse' ? 'urgent' : 'routine')] } };
  }
  return null;
};

// ── The module ──────────────────────────────────────────────────────────────

export const woundCareReview: ProcedureModule = {
  id: ID,
  name: 'Wound care review',
  summary: 'Any acute or chronic wound: cause, TIMERS, infection, perfusion gate for compression, dressing and the whole patient.',
  group: 'wound',
  phases: ['wound_review', 'follow_up'],
  problemLabel: 'Wound',
  basis: [
    'TIMERS — Atkin L et al. J Wound Care 2019;28(3 Suppl 3)',
    'International Wound Infection Institute: Wound Infection in Clinical Practice 2022',
    'NPIAP/EPUAP/PPPIA Prevention and Treatment of Pressure Ulcers/Injuries 2019',
    'SIGN 120 Management of chronic venous leg ulcers (2010); NICE CKS Leg ulcer — venous; NICE CG168',
    'IWGDF Guidelines on the prevention and management of diabetic foot disease 2023',
    'WHO Buruli ulcer: treatment of Mycobacterium ulcerans disease',
  ],
  catalog: {
    feeIds: ['intermediate-002'],
    educationId: 'WOUND-001',
    patientEducationIds: ['chronic-wound', 'infected-wounds'],
  },
  sections: {
    wound_review: [CAUSE],
    follow_up: [RESPONSE, CAUSE],
  },
  includeCore: { wound_review: ['tetanus'], follow_up: ['wound_assessment', 'wound_infection', 'tetanus', 'healing_barriers', 'wound_dressing'] },
  // The core tetanus question, for traumatic and burn wounds only.
  coreShowWhen: { 'core.tetanus': { field: 'core.wound_aetiology', equals: ['traumatic', 'burn'] } },
  carryForward: ['core.wound_aetiology', 'core.wound_site', f('abpi')],
  planRules: [goals, compressionGate, causeSpecific, response],
  consent: {
    procedureName: 'Wound debridement and dressing',
    phases: ['wound_review'],
    intendedBenefits: ['Remove dead and infected tissue so the wound can heal', 'Reduce infection and odour', 'Allow the wound to be assessed properly'],
    risks: [
      { name: 'Bleeding', description: 'Bleeding from the wound during or after debridement' },
      { name: 'Pain', description: 'Pain during and after the procedure' },
      { name: 'Wound appears larger', description: 'The wound looks bigger once dead tissue is removed' },
      { name: 'Repeat debridement', description: 'More than one debridement may be needed' },
    ],
    alternatives: [
      'Autolytic debridement with dressings (slower)',
      'Enzymatic or larval debridement where available',
      'Dressings only, accepting slower healing and a higher infection risk',
    ],
    riskOfNotTreating: 'Dead tissue left in a wound keeps it open, can become infected and can spread infection into deeper tissues, bone or the bloodstream.',
    anaesthesiaOptions: ['local', 'regional', 'general'],
    photography: true,
    bloodProducts: 'unlikely',
    counsellingTopics: [
      'Why the wound is not healing and what will correct it',
      'How the dressings will be done, how often, and by whom',
      'The cost of dressings and an affordable alternative',
    ],
  },
  followUp: {
    wound_review: [
      { when: '1–2 weeks', purpose: 'Wound review with calibrated measurement and photograph (WoundProgress Monitor)' },
      { when: '4 weeks', purpose: 'Healing trajectory: if the area is not about 40% smaller, re-evaluate the diagnosis and plan' },
    ],
    follow_up: [{ when: '2 weeks (or as agreed)', purpose: 'Wound review with measurement until healed' }],
  },
  handoffs: [
    { label: 'Measure on the WoundProgress Monitor', route: '/wound-monitor', when: 'Calibrated area, tissue and photograph — pulled into this review' },
    { label: 'Vascular assessment (ABPI, toe pressures, WIfI)', route: '/vascular', when: 'Leg or foot wound, absent pulses, ABPI outside 0.8–1.3' },
    { label: 'Limb salvage (diabetic foot)', route: '/limb-salvage', when: 'Diabetic foot ulcer' },
    { label: 'Soft tissue infection (LRINEC, NSTI pathway)', route: '/sti-protocol', when: 'Spreading infection or necrotising features' },
    { label: 'NPWT', route: '/npwt', when: 'Bed preparation needs negative pressure' },
    { label: 'Tumour Board', route: '/tumour-board', when: 'Biopsy shows malignancy' },
    { label: 'Burns', route: '/burns', when: 'Burn wound' },
  ],
};
