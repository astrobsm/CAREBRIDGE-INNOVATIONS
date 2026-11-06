/**
 * Digital and peripheral nerve repair, and the complex hand injury it often
 * comes with (fractures, amputation / replantation, the mangled hand).
 *
 * Pre-operative: which nerve, the mechanism and likely Seddon grade, the
 * components of a complex injury, replantation considerations (the part,
 * how it was preserved, ischaemia time, the published indications), the
 * microsurgical capacity available — which in many Nigerian centres decides
 * whether a part can be replanted at all — and the baseline sensory and motor
 * examination (static 2PD, Semmes–Weinstein, MRC motor grade).
 *
 * Post-operative: the repair (direct / graft / conduit, gap), replant
 * monitoring by clinical signs, and protection. Follow-up: Tinel's sign
 * advance against the expected ~1 mm a day, MRC sensory (S0–S4) and motor
 * (M0–M5) recovery, 2PD and monofilament, cold intolerance, neuroma,
 * hypersensitivity, and structured function (no copyrighted questionnaire:
 * there is no DASH / QuickDASH instrument in the app).
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanContribution, PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, numOf } from '../../core/answers';
import { G, L, P, biteExposureLine, merge } from '../../ruleKit';

const ID = 'nerve_repair_hand_trauma';
const f = (id: string) => `${ID}.${id}`;

// ── The injury (carried forward) ────────────────────────────────────────────

const NERVES: EncounterField = {
  id: f('nerves'), label: 'Nerve(s) injured', kind: 'multiselect', important: true,
  options: [
    { value: 'none', label: 'No nerve injury (complex hand injury only)' },
    { value: 'digital', label: 'Digital nerve(s)' },
    { value: 'common_digital', label: 'Common digital nerve(s) (palm)' },
    { value: 'median', label: 'Median nerve' },
    { value: 'ulnar', label: 'Ulnar nerve (including deep motor branch)' },
    { value: 'radial_sensory', label: 'Superficial radial nerve' },
    { value: 'pin_radial', label: 'Radial / posterior interosseous nerve' },
  ],
};
const NERVE_DETAIL: EncounterField = { id: f('nerve_detail'), label: 'Which, and level', kind: 'text', placeholder: 'e.g. ulnar digital nerve of the right index at the proximal phalanx' };
const MECHANISM: EncounterField = {
  id: f('mechanism'), label: 'Mechanism', kind: 'select', important: true,
  options: [
    { value: 'sharp', label: 'Sharp laceration (glass, knife)' },
    { value: 'machete', label: 'Machete / saw / machine' },
    { value: 'crush', label: 'Crush / avulsion' },
    { value: 'traction', label: 'Traction / stretch' },
    { value: 'gunshot_blast', label: 'Gunshot / blast' },
    { value: 'bite', label: 'Human or animal bite', flag: 'red',
      flagReason: 'Bite: high infection risk — formal washout in theatre and antibiotics; rabies / blood-borne-virus risk assessment today.' },
    { value: 'compression', label: 'Compression / closed injury' },
  ],
};
const COMPONENTS: EncounterField = {
  id: f('components'), label: 'Components of the hand injury', kind: 'multiselect', important: true,
  options: [
    { value: 'none', label: 'Isolated nerve injury' },
    { value: 'tendon', label: 'Tendon injury (use the tendon repair module too)' },
    { value: 'fracture', label: 'Fracture / dislocation' },
    { value: 'open_fracture', label: 'Open fracture', flag: 'amber', flagReason: 'Open hand fracture: IV antibiotics as soon as possible, tetanus, debridement and stabilisation (BOAST Open fractures 2017).' },
    { value: 'devascularised', label: 'Devascularised digit / hand', flag: 'red', flagReason: 'Devascularised digit or hand: emergency revascularisation — warm ischaemia time matters.' },
    { value: 'amputation', label: 'Traumatic amputation (complete or partial)', flag: 'red', flagReason: 'Traumatic amputation: decide on replantation now; cool the part correctly; theatre without delay if replantable.' },
    { value: 'skin_loss', label: 'Skin / soft-tissue loss or degloving', flag: 'amber', flagReason: 'Soft-tissue loss over repaired structures needs vascularised (flap) cover.' },
    { value: 'mangled', label: 'Mangled hand (several tissues, several levels)', flag: 'red', flagReason: 'Mangled hand: senior hand / plastic surgeon now; staged debridement and reconstruction.' },
    { value: 'compartment', label: 'Tense hand / forearm, pain on passive stretch', flag: 'red', flagReason: 'Possible compartment syndrome of the hand or forearm: emergency fasciotomy.' },
  ],
};
const INJURY: EncounterSection = {
  id: f('injury'),
  title: 'The injury',
  intent: 'Recorded once and carried forward.',
  fields: [NERVES, NERVE_DETAIL, MECHANISM, COMPONENTS],
};

// ── Shared sensory / motor examination ──────────────────────────────────────

const TWO_PD: EncounterField = {
  id: f('s2pd'), label: 'Static two-point discrimination (affected territory)', kind: 'number', unit: 'mm', min: 2, max: 30,
  help: 'ASSH: normal under 6 mm, fair 6–10, poor 11–15; one point only = protective. Leave blank if no point is felt.',
  numericFlags: [{ op: '>', value: 15, level: 'amber', reason: 'Static 2PD over 15 mm: protective sensation at best (ASSH classification).' }],
};
const SWM: EncounterField = {
  id: f('swm'), label: 'Semmes–Weinstein monofilament (smallest felt)', kind: 'select',
  options: [
    { value: '2.83', label: '2.83 — normal light touch' },
    { value: '3.61', label: '3.61 — diminished light touch' },
    { value: '4.31', label: '4.31 — diminished protective sensation' },
    { value: '4.56', label: '4.56 — loss of protective sensation', flag: 'amber', flagReason: 'Loss of protective sensation: risk of burns and injury to the numb part — protect it (Bell-Krotoski interpretation).' },
    { value: '6.65', label: '6.65 — deep pressure only', flag: 'amber', flagReason: 'Deep pressure only: protect the numb part from burns and injury.' },
    { value: 'none', label: 'Untestable — nothing felt' },
  ],
};
const MOTOR: EncounterField = {
  id: f('motor'), label: 'Key muscle power (MRC)', kind: 'select',
  help: 'APB for median, FDI / ADM for ulnar, EPL / wrist extension for radial.',
  options: [
    { value: 'M0', label: 'M0 — no contraction' },
    { value: 'M1', label: 'M1 — flicker' },
    { value: 'M2', label: 'M2 — movement with gravity eliminated' },
    { value: 'M3', label: 'M3 — against gravity' },
    { value: 'M4', label: 'M4 — against some resistance' },
    { value: 'M5', label: 'M5 — normal' },
    { value: 'na', label: 'Not applicable (pure sensory nerve)' },
  ],
};
const MOTOR_MUSCLE: EncounterField = { id: f('motor_muscle'), label: 'Muscle tested', kind: 'text', placeholder: 'e.g. abductor pollicis brevis' };

// ── Pre-operative ───────────────────────────────────────────────────────────

const PRE: EncounterSection = {
  id: f('pre'),
  title: 'Before surgery',
  fields: [
    {
      id: f('time_since'), label: 'Time since injury', kind: 'select', important: true,
      options: [
        { value: 'under_6h', label: 'Under 6 hours' },
        { value: '6_24h', label: '6–24 hours' },
        { value: '1_7d', label: '1–7 days' },
        { value: 'over_1w', label: 'Over 1 week', flag: 'amber', flagReason: 'Delayed nerve repair: the ends retract and scar — a graft or conduit is more likely to be needed.' },
      ],
    },
    {
      id: f('seddon'), label: 'Likely injury (Seddon)', kind: 'select',
      options: [
        { value: 'neurotmesis', label: 'Neurotmesis — nerve divided (open wound, complete deficit)' },
        { value: 'axonotmesis', label: 'Axonotmesis — in continuity (crush / traction)' },
        { value: 'neurapraxia', label: 'Neurapraxia — conduction block' },
        { value: 'uncertain', label: 'Uncertain — explore' },
      ],
    },
    TWO_PD, SWM, MOTOR, MOTOR_MUSCLE,
    {
      id: f('micro_capacity'), label: 'Microsurgery available', kind: 'select', important: true,
      options: [
        { value: 'here', label: 'Here (microscope / loupes, micro-instruments, 9-0 to 10-0 sutures, trained surgeon)' },
        { value: 'transfer', label: 'Only by transfer to another centre', flag: 'amber', flagReason: 'Microsurgery only after transfer: decide now — every hour of ischaemia reduces replant survival.' },
        { value: 'none', label: 'Not available', flag: 'amber', flagReason: 'No microsurgery: nerve ends tagged for delayed repair; replantation not possible here — counsel and refer.' },
      ],
    },
  ],
};

const REPLANT: EncounterSection = {
  id: f('replant'),
  title: 'Amputated part and replantation',
  intent: 'Only for a traumatic amputation.',
  fields: [
    {
      id: f('amp_level'), label: 'Level of amputation', kind: 'select', important: true,
      visibleWhen: a => hasAny(a, f('components'), 'amputation'),
      options: [
        { value: 'thumb', label: 'Thumb (any level)' },
        { value: 'multiple_digits', label: 'Several digits' },
        { value: 'single_distal_fds', label: 'Single finger, distal to the FDS insertion (zone I)' },
        { value: 'single_zone2', label: 'Single finger, proximal to the FDS insertion (zone II)' },
        { value: 'hand_wrist', label: 'Through the palm, wrist or forearm' },
        { value: 'tip', label: 'Fingertip (no vessel to repair)' },
      ],
    },
    {
      id: f('part_condition'), label: 'The amputated part', kind: 'select',
      visibleWhen: a => hasAny(a, f('components'), 'amputation'),
      options: [
        { value: 'sharp_clean', label: 'Clean, sharp cut' },
        { value: 'crush_avulsion', label: 'Crushed / avulsed (ribbon sign, red streak)', flag: 'amber', flagReason: 'Crush or avulsion: vessel damage extends beyond the wound — replant survival is lower; vein grafts likely.' },
        { value: 'multilevel', label: 'Injured at several levels' },
        { value: 'missing', label: 'Not brought / lost' },
      ],
    },
    {
      id: f('part_preserved'), label: 'How the part was kept', kind: 'select',
      visibleWhen: a => hasAny(a, f('components'), 'amputation'),
      options: [
        { value: 'correct', label: 'Wrapped in saline-moistened gauze, in a sealed bag, on ice-water' },
        { value: 'direct_ice', label: 'Directly on ice / frozen', flag: 'amber', flagReason: 'Direct contact with ice causes freezing injury to the part.' },
        { value: 'warm', label: 'Not cooled (warm)' },
        { value: 'other', label: 'In water, herbs or other' },
      ],
    },
    {
      id: f('ischaemia_h'), label: 'Ischaemia time so far', kind: 'number', unit: 'hours', min: 0, max: 96,
      visibleWhen: a => hasAny(a, f('components'), 'amputation', 'devascularised'),
      help: 'Published tolerances: digits about 12 h warm / 24 h cold; parts with muscle (hand, forearm) about 6 h warm / 12 h cold.',
    },
    {
      id: f('replant_decision'), label: 'Decision', kind: 'select',
      visibleWhen: a => hasAny(a, f('components'), 'amputation'),
      options: [
        { value: 'replant', label: 'Replant / revascularise' },
        { value: 'terminalise', label: 'Terminalise (revision amputation) and close' },
        { value: 'transfer', label: 'Transfer for replantation' },
        { value: 'composite', label: 'Composite graft / cap (tip)' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const POST: EncounterSection = {
  id: f('post'),
  title: 'The repair and early care',
  fields: [
    {
      id: f('technique'), label: 'Nerve repair', kind: 'select', important: true,
      options: [
        { value: 'direct', label: 'Direct epineurial, tension-free' },
        { value: 'fascicular', label: 'Group-fascicular' },
        { value: 'graft', label: 'Nerve autograft (e.g. sural, MABC, PIN terminal)' },
        { value: 'conduit', label: 'Conduit / allograft' },
        { value: 'tagged', label: 'Ends tagged for delayed repair' },
        { value: 'none', label: 'No nerve repair (in continuity)' },
      ],
    },
    { id: f('gap_mm'), label: 'Nerve gap after trimming', kind: 'number', unit: 'mm', min: 0, max: 200 },
    {
      id: f('replant_monitor'), label: 'Replanted / revascularised part', kind: 'select',
      visibleWhen: a => hasAny(a, f('components'), 'amputation', 'devascularised'),
      options: [
        { value: 'healthy', label: 'Pink, warm, brisk capillary refill, normal turgor' },
        { value: 'arterial', label: 'Pale, cool, slow or absent refill, no bleeding on pin-prick', flag: 'red',
          flagReason: 'Arterial insufficiency in a replant: emergency — warm, release dressings, reverse vasospasm, return to theatre without delay.' },
        { value: 'venous', label: 'Purple, congested, very brisk refill, dark bleeding', flag: 'red',
          flagReason: 'Venous congestion in a replant: release constriction; medicinal leeches or nail-bed bleeding with heparin; return to theatre for venous anastomosis.' },
        { value: 'failed', label: 'Non-viable' },
      ],
    },
    {
      id: f('protection'), label: 'Protection', kind: 'select',
      options: [
        { value: 'splint', label: 'Splint protecting the repair' },
        { value: 'none_needed', label: 'No splint needed (tension-free digital repair)' },
        { value: 'not_worn', label: 'Prescribed but not worn', flag: 'amber', flagReason: 'Splint not worn after a repair under tension or with tendons: re-splint and re-explain.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const RECOVERY: EncounterSection = {
  id: f('recovery'),
  title: 'Nerve recovery and hand function',
  fields: [
    { id: f('weeks_post'), label: 'Weeks since repair', kind: 'number', unit: 'weeks', min: 0, max: 520, important: true },
    { id: f('tinel_cm'), label: 'Tinel\'s sign — distance distal to the repair', kind: 'number', unit: 'cm', min: 0, max: 60,
      help: 'Axons regenerate roughly 1 mm a day (about 2.5 cm a month) after a lag of a few weeks.' },
    {
      id: f('sensory_mrc'), label: 'Sensory recovery (MRC, Mackinnon–Dellon)', kind: 'select', important: true,
      options: [
        { value: 'S0', label: 'S0 — no sensation' },
        { value: 'S1', label: 'S1 — deep pain' },
        { value: 'S2', label: 'S2 — some superficial pain and touch' },
        { value: 'S2+', label: 'S2+ — superficial pain and touch, with over-response' },
        { value: 'S3', label: 'S3 — pain and touch, no over-response' },
        { value: 'S3+', label: 'S3+ — as S3 with some 2PD (static 7–15 mm)' },
        { value: 'S4', label: 'S4 — complete recovery (static 2PD 2–6 mm)' },
      ],
    },
    TWO_PD, SWM, MOTOR, MOTOR_MUSCLE,
    {
      id: f('symptoms'), label: 'Symptoms', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'cold_intolerance', label: 'Cold intolerance' },
        { value: 'hypersensitivity', label: 'Hypersensitivity / dysaesthesia' },
        { value: 'neuroma', label: 'Painful neuroma (focal electric pain at the repair)', flag: 'amber', flagReason: 'Painful neuroma: desensitisation first; injection or surgical management if it persists.' },
        { value: 'numb_injury', label: 'Injured the numb area (burn, cut) since the last visit', flag: 'amber', flagReason: 'Injury to a numb area: protect it — look and check temperature before touching hot objects.' },
      ],
    },
    {
      id: f('adl'), label: 'Difficulty with daily tasks', kind: 'multiselect',
      options: [
        { value: 'none', label: 'No difficulty' },
        { value: 'fine', label: 'Fine tasks (buttons, coins, writing, needle)' },
        { value: 'grip', label: 'Gripping tools / hoe / machete' },
        { value: 'self_care', label: 'Washing, dressing, eating' },
        { value: 'work', label: 'Usual work or trade' },
        { value: 'cold', label: 'Working in the cold or with cold water' },
      ],
    },
    { id: f('grip_kg'), label: 'Grip — injured hand', kind: 'number', unit: 'kg', min: 0, max: 100 },
    { id: f('grip_other_kg'), label: 'Grip — other hand', kind: 'number', unit: 'kg', min: 0, max: 100 },
    { id: f('pinch_kg'), label: 'Key pinch — injured hand', kind: 'number', unit: 'kg', min: 0, max: 30 },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => {
  const comp = chosen(ctx.answers, f('components'));
  return { problem: { goals: [
    L('Restore protective and, where possible, discriminative sensation, and motor function of the injured nerve', 'Purpose of nerve repair'),
    L('A hand that is stable, covered, pain-free and useful for the patient\'s work', comp.length && !comp.includes('none') ? `Complex hand injury: ${comp.join(', ').replace(/_/g, ' ')}` : 'Function is the outcome that matters'),
    L('Protect the numb area from burns and injury until sensation returns', 'Numb skin is injured unnoticed'),
  ] } };
};

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const comp = chosen(a, f('components'));
  const level = a[f('amp_level')];
  const isch = numOf(a, f('ischaemia_h'));
  const muscle = level === 'hand_wrist';
  const parts: PlanContribution[] = [];
  if (isOneOf(a, f('mechanism'), 'bite')) {
    parts.push({ problem: { treatment: [
      L('Formal exploration and washout in theatre; co-amoxiclav (or the local alternative in penicillin allergy); leave the skin open; repair the nerve once the wound is clean', 'Bite (BSSH; IDSA 2014 SSTI)', 'urgent'),
      biteExposureLine('Human or animal bite'),
    ] } });
  }
  if (comp.includes('compartment')) {
    parts.push({ problem: { treatment: [L('Emergency fasciotomy of the hand (interossei, thenar, hypothenar, carpal tunnel) and / or forearm', 'Compartment syndrome — muscle dies within hours', 'urgent')] } });
  }
  if (comp.includes('devascularised') || comp.includes('amputation')) {
    parts.push({ problem: { treatment: [L('Theatre now for revascularisation / replantation if indicated: shorten bone, fix, repair tendons, arteries, nerves, then veins; vein grafts for zone-of-injury defects', `${comp.includes('amputation') ? 'Traumatic amputation' : 'Devascularised part'} — ischaemia time ${isch ?? 'not recorded'} h`, 'urgent')] } });
  }
  if (comp.includes('amputation')) {
    const strong = ['thumb', 'multiple_digits', 'hand_wrist', 'single_distal_fds'].includes(String(level)) || (ctx.patient.ageYears != null && ctx.patient.ageYears < 16);
    parts.push({ problem: { treatment: [L(strong
      ? 'Replantation is indicated where feasible (thumb, several digits, hand / wrist / forearm, single digit distal to FDS, any level in a child)'
      : 'Relative contraindication to replantation (single finger proximal to the FDS insertion, severe crush / avulsion, several levels): discuss terminalisation vs replantation with the patient, weighing their work',
      `Amputation level: ${String(level ?? 'not recorded').replace(/_/g, ' ')} (published replantation indications; Green's Operative Hand Surgery)`)] } });
    if (isch != null && ((muscle && isch > 6) || (!muscle && isch > 12))) {
      parts.push({ cautions: [`Ischaemia time ${isch} h exceeds the usual warm-ischaemia tolerance for ${muscle ? 'a part containing muscle (about 6 h)' : 'a digit (about 12 h)'}: survival is less likely and reperfusion injury is a risk with muscle — senior decision.`] });
    }
    if (!isOneOf(a, f('part_preserved'), 'correct')) {
      parts.push({ general: [G('Wound care and dressings', L('Keep the amputated part wrapped in saline-moistened gauze in a sealed bag placed in ice-water — never directly on ice', 'Part not preserved correctly'))] });
    }
  }
  if (comp.includes('open_fracture')) {
    parts.push({ general: [G('Antibiotic prophylaxis and infection', L('IV antibiotics for the open fracture as soon as possible, ideally within 1 hour of injury (co-amoxiclav or cefuroxime, or the local alternative); duration per local policy', 'Open fracture (BOAST Open fractures 2017)', 'urgent'))] });
  }
  if (comp.includes('mangled') || comp.includes('skin_loss')) {
    parts.push({ problem: { treatment: [L('Radical debridement and skeletal stabilisation first; plan early flap cover (ideally within 72 hours) over repaired nerves, tendons and bone', 'Mangled hand / soft-tissue loss (BOAST Open fractures 2017)', 'urgent')] } });
  }
  if (isOneOf(a, f('micro_capacity'), 'transfer')) {
    parts.push({ problem: { referrals: [L('Phone the receiving hand / microsurgery unit now; transfer with the part correctly cooled, the stump dressed and the history and times written', 'Microsurgery only after transfer', 'urgent')] } });
  }
  if (isOneOf(a, f('micro_capacity'), 'none') && hasAny(a, f('nerves'), 'digital', 'common_digital', 'median', 'ulnar', 'radial_sensory', 'pin_radial')) {
    parts.push({ problem: { treatment: [L('Wound toilet; identify and tag the nerve ends with a non-absorbable suture for delayed repair within weeks at a unit with microsurgery', 'No microsurgery here')] } });
  } else if (hasAny(a, f('nerves'), 'digital', 'common_digital', 'median', 'ulnar', 'radial_sensory', 'pin_radial')) {
    parts.push({ problem: { treatment: [L('Primary tension-free repair under magnification when the wound is clean and sharp; graft or conduit for a gap rather than repair under tension', 'Divided nerve (BSSH)')] } });
  }
  if (isOneOf(a, f('mechanism'), 'crush', 'traction', 'gunshot_blast') && isOneOf(a, f('seddon'), 'axonotmesis', 'uncertain')) {
    parts.push({ problem: { monitoring: [L('Nerve in continuity after crush / traction / blast: examine and record a baseline; if no clinical or neurophysiological recovery by about 3 months, explore', 'Possible axonotmesis (clinical judgement; nerve conduction studies where available)')] } });
  }
  parts.push({ counselling: [
    P('Nerve recovery', 'Nerves regrow slowly (about 1 mm a day, roughly an inch a month); feeling returns over months, often incompletely, and cold sensitivity is common.', 'Nerve regeneration (Seddon; Sunderland)'),
    P('Protecting the numb area', 'Until feeling returns, look before you touch: test bath water with the other hand, keep away from fires, cooking pots and machines.', 'Numb skin is injured unnoticed'),
  ] });
  return merge(...parts);
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const mon = a[f('replant_monitor')];
  const parts: PlanContribution[] = [];
  if (mon === 'arterial') parts.push({ problem: { treatment: [L('Arterial insufficiency: warm the patient and room, release dressings, check position and hydration; return to theatre to revise the arterial anastomosis', 'Replant pale and cool', 'urgent')] } });
  if (mon === 'venous') parts.push({ problem: { treatment: [L('Venous congestion: release constriction; medicinal leeches (with antibiotic prophylaxis against Aeromonas) or nail-plate removal and heparin-soaked bleeding; return to theatre if a vein can be repaired', 'Replant congested', 'urgent')] } });
  if (hasAny(a, f('components'), 'amputation', 'devascularised') && mon !== 'failed') {
    parts.push({ problem: { monitoring: [L('Replant observations hourly for the first 24–48 hours (colour, capillary refill, turgor, temperature, pin-prick bleeding), then 2-hourly; warm room, well hydrated, no smoking or caffeine, anticoagulation per the unit protocol', 'Replant / revascularisation monitoring')] } });
  }
  if (mon === 'failed') parts.push({ problem: { treatment: [L('Failed replant: debride and terminalise once demarcated; revision amputation with good soft-tissue cover', 'Non-viable replanted part')] } });
  if (isOneOf(a, f('technique'), 'tagged')) parts.push({ problem: { referrals: [L('Book delayed nerve repair (graft or conduit) within weeks once the wound is clean', 'Nerve ends tagged')] } });
  if (isOneOf(a, f('protection'), 'not_worn')) parts.push({ problem: { treatment: [L('Re-make the splint and explain why the repair needs protection for the first weeks', 'Splint not worn')] } });
  parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Hand therapy: oedema control, protected range of movement, scar care; sensory re-education once protective sensation returns', 'Nerve repair rehabilitation (BSSH)'))] });
  parts.push({ dischargeCriteria: [
    'Part viable and observations stable for 24 hours (replant), or wound healing',
    'Splint / protection plan understood',
    'Hand therapy booked within the first week',
    'Told to protect the numb area and to avoid smoking (replant)',
  ] });
  return merge(...parts);
};

const followUpRule: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const weeks = numOf(a, f('weeks_post'));
  const tinel = numOf(a, f('tinel_cm'));
  const priorTinel = ctx.prior.filter(p => p.moduleId === ID).map(p => ({ at: p.at, cm: numOf(p.answers, f('tinel_cm')) })).find(p => p.cm != null);
  const sym = chosen(a, f('symptoms'));
  const adl = chosen(a, f('adl'));
  const grip = numOf(a, f('grip_kg')), gripOther = numOf(a, f('grip_other_kg'));
  const parts: PlanContribution[] = [];
  if (tinel != null && priorTinel?.cm != null && tinel <= priorTinel.cm) {
    parts.push({ problem: { investigations: [L('Tinel\'s sign has not advanced: nerve conduction studies / ultrasound where available, and consider re-exploration of the repair', `Tinel ${priorTinel.cm} -> ${tinel} cm since ${priorTinel.at.slice(0, 10)} (expected about 1 mm a day)`, weeks != null && weeks >= 12 ? 'urgent' : 'routine')] } });
  } else if (tinel != null && weeks != null && weeks >= 4) {
    parts.push({ problem: { monitoring: [L(`Tinel's sign ${tinel} cm distal to the repair at ${weeks} weeks; re-measure at each visit to confirm it advances`, 'Regeneration is about 1 mm a day after a lag of a few weeks (Seddon)')] } });
  }
  if (isOneOf(a, f('sensory_mrc'), 'S2', 'S2+', 'S3')) {
    parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Sensory re-education: localisation, texture and object recognition with and without vision, daily', `Sensory recovery ${String(a[f('sensory_mrc')])} (MRC)`))] });
  }
  if (isOneOf(a, f('motor'), 'M0', 'M1') && hasAny(a, f('nerves'), 'median', 'ulnar', 'pin_radial') && weeks != null && weeks >= 52) {
    parts.push({ problem: { referrals: [L('No useful motor recovery a year after a mixed-nerve repair: tendon transfers (e.g. opponensplasty, intrinsic replacement, radial nerve transfers) or nerve transfer', `Motor ${String(a[f('motor')])} at ${weeks} weeks`)] } });
  }
  if (sym.includes('neuroma')) parts.push({ problem: { treatment: [L('Painful neuroma: desensitisation and splint protection; neuropathic analgesia; injection or excision with burial / reconstruction if it persists', 'Painful neuroma (NICE CG173 for the analgesia)')] } });
  if (sym.includes('hypersensitivity')) parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Desensitisation programme: graded textures, massage and tapping several times a day', 'Hypersensitivity'))] });
  if (sym.includes('cold_intolerance') || adl.includes('cold')) parts.push({ counselling: [P('Cold intolerance', 'Common after digital nerve and replant injuries; it usually eases over 2 years — gloves, warm water for washing, avoid smoking.', 'Cold intolerance after nerve injury')] });
  if (sym.includes('numb_injury')) parts.push({ general: [G('Patient education', L('Protect the numb area: gloves for work and cooking, check skin daily, test temperatures with the other hand', 'Injury to a numb area since the last visit'))] });
  if (grip != null && gripOther != null && gripOther > 0) parts.push({ problem: { monitoring: [L(`Grip ${grip} kg vs ${gripOther} kg (${Math.round((grip / gripOther) * 100)}% of the other hand)`, 'Objective strength trend')] } });
  if (adl.includes('work') || adl.includes('grip')) parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Occupational therapy: work-specific tasks, tool adaptation (built-up handles), graded return to the trade', `Difficulty: ${adl.join(', ').replace(/_/g, ' ')}`))] });
  return merge(...parts);
};

// ── The module ──────────────────────────────────────────────────────────────

export const nerveRepairHandTrauma: ProcedureModule = {
  id: ID,
  name: 'Nerve repair and complex hand trauma',
  summary: 'Digital and peripheral nerve repair with associated hand injury: replantation decisions, sensory (2PD, Semmes–Weinstein) and MRC motor grading, Tinel\'s advance and function.',
  group: 'hand',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Nerve injury / hand trauma',
  basis: [
    'British Society for Surgery of the Hand (BSSH): Standards of care in hand trauma',
    'BOAST: Open fractures (BOA/BAPRAS 2017)',
    'Seddon HJ 1943; Sunderland S 1951 classifications of nerve injury',
    'MRC sensory and motor grading (Medical Research Council 1954; Mackinnon & Dellon modification 1988)',
    'ASSH Clinical Assessment Recommendations (two-point discrimination); Bell-Krotoski Semmes–Weinstein interpretation',
    'Replantation indications and ischaemia tolerances: Green\'s Operative Hand Surgery (8th ed.); Urbaniak',
  ],
  catalog: {
    feeIds: ['hand-003', 'hand-004', 'advanced-005'],
    educationId: null,
    educationNote: 'No nerve-repair or replantation record in src/data/patientEducation.ts; the procedure risks are listed in this ConsentSpec.',
    patientEducationIds: ['recon-nerve-repair', 'hand-surgery'],
  },
  sections: {
    pre_op: [INJURY, PRE, REPLANT],
    post_op: [INJURY, POST],
    follow_up: [INJURY, RECOVERY],
  },
  includeCore: { pre_op: ['tetanus'] },
  carryForward: [f('nerves'), f('nerve_detail'), f('mechanism'), f('components')],
  planRules: [goals, preOp, postOp, followUpRule],
  consent: {
    procedureName: 'Exploration and repair of nerve(s) of the hand / forearm (with repair of associated injuries; replantation if indicated)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Give the nerve the best chance to regrow and restore feeling and movement',
      'Repair or reconstruct the other injured structures at the same time',
      'Restore circulation to, or reattach, an injured or amputated part where possible',
    ],
    risks: [
      { name: 'Incomplete recovery', description: 'Feeling and strength often do not return to normal, especially in adults and after crush injuries' },
      { name: 'Cold intolerance', description: 'Pain or numbness in the cold, common after digital nerve and replant injuries' },
      { name: 'Painful neuroma', description: 'A painful lump of nerve fibres at the repair' },
      { name: 'Need for a nerve graft', description: 'If the ends cannot be joined without tension, nerve from elsewhere (leaving a small numb area there) or a conduit is used' },
      { name: 'Replant failure', description: 'A reattached part may not survive and may need removal; replanted parts are often stiff and cold-sensitive' },
      { name: 'Stiffness', description: 'Joints and tendons stiffen after complex injuries; therapy is essential' },
      { name: 'Infection', description: 'Higher after crush, bite and contaminated wounds' },
      { name: 'CRPS', description: 'A rare, disproportionate pain with swelling and colour change' },
    ],
    alternatives: [
      'No repair, accepting permanent numbness (some single digital nerve injuries in low-demand areas)',
      'Delayed repair or nerve graft at a later operation',
      'Terminalisation (tidy revision amputation) instead of replantation',
      'Tendon or nerve transfers later if the nerve does not recover',
    ],
    riskOfNotTreating: 'A divided nerve does not rejoin by itself: the area stays numb (and can be injured unnoticed) and the muscles it supplies stay weak; a devascularised or amputated part that is not revascularised will die.',
    anaesthesiaOptions: ['regional', 'general', 'local'],
    additionalProcedures: [
      'Nerve graft from the leg (sural) or forearm, or a conduit',
      'Vein grafts for arteries',
      'Bone shortening and fixation',
      'Flap cover',
      'Revision amputation if a part cannot be saved',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: false,
    counsellingTopics: [
      'How slowly nerves recover and what to expect at 3, 6 and 12 months',
      'Protecting the numb area from burns and injury',
      'Hand therapy and sensory re-education',
      'Smoking and caffeine after a replant',
      'Time off work and the likely effect on the patient\'s trade',
    ],
    modifiers: [
      { id: 'nr_crush', when: c => isOneOf(c.answers, f('mechanism'), 'crush', 'traction', 'gunshot_blast', 'machete'),
        text: 'Because this was a crush, stretch, machine or blast injury, the nerve is damaged over a longer length; recovery is likely to be less complete and a nerve graft is more likely.',
        why: 'High-energy mechanism' },
      { id: 'nr_age', when: c => (c.patient.ageYears ?? 0) >= 50,
        text: 'Nerves recover less completely with increasing age.',
        why: 'Age 50 or more' },
      { id: 'nr_delay', when: c => isOneOf(c.answers, f('time_since'), 'over_1w'),
        text: 'Because the repair is being done more than a week after the injury, a nerve graft is more likely and recovery may be less complete.',
        why: 'Delayed repair' },
      { id: 'nr_replant_smoker', when: c => hasAny(c.answers, f('components'), 'amputation', 'devascularised') && isOneOf(c.answers, 'core.smoking', 'current', 'vaping', 'smokeless'),
        text: 'Smoking constricts the small vessels of a replanted part and makes it more likely to fail; you must not smoke at all while it heals.',
        why: 'Replant / revascularisation in a smoker' },
      { id: 'nr_ischaemia', when: c => {
          const h = numOf(c.answers, f('ischaemia_h'));
          return h != null && h > (c.answers[f('amp_level')] === 'hand_wrist' ? 6 : 12);
        },
        text: 'Because the part has been without blood supply for a long time, it is less likely to survive if reattached.',
        why: 'Ischaemia time beyond the usual tolerance' },
      { id: 'nr_crush_part', when: c => isOneOf(c.answers, f('part_condition'), 'crush_avulsion', 'multilevel'),
        text: 'Because the amputated part is crushed or injured at more than one level, replantation is less likely to succeed.',
        why: 'Crushed / multilevel amputated part' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Within the first week after surgery', purpose: 'Hand therapy and wound check' }],
    post_op: [
      { when: 'Days 3–7', purpose: 'Hand therapy, oedema control, splint' },
      { when: 'Day 10–14', purpose: 'Wound review, suture removal' },
    ],
    follow_up: [
      { when: '6 weeks', purpose: 'Baseline Tinel\'s sign, protection, therapy' },
      { when: '3, 6 and 12 months', purpose: 'Tinel advance, MRC sensory / motor grade, 2PD, function' },
      { when: '18–24 months', purpose: 'Final sensory outcome; secondary surgery if needed' },
    ],
  },
  handoffs: [
    { label: 'Patient education (nerve repair)', route: '/patient-education', when: 'Leaflets on nerve recovery and protecting the numb area' },
    { label: 'Referrals (transfer to a microsurgery unit)', route: '/referrals', phases: ['pre_op'], when: 'Replantation or microsurgery not available here' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate' },
  ],
};
