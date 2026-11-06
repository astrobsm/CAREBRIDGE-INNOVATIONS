/**
 * Negative-pressure wound therapy (NPWT) as an adjunct — commercial or
 * improvised (wall / portable suction, foam or gauze, adhesive drape), which
 * is how much NPWT is delivered in Nigerian hospitals.
 *
 * The wound itself is the core TIMERS assessment (wound review) or the
 * procedure it follows. This module asks: why NPWT (bed preparation,
 * exudate, graft fixation, closed-incision), whether it is contraindicated
 * (malignancy in the wound, untreated osteomyelitis, unexplored fistula,
 * necrotic tissue with eschar, exposed vessels / anastomoses / organs /
 * nerves, active bleeding — FDA 2011, NICE MTG43 / IPG and manufacturers),
 * the precautions (anticoagulation, infection, ischaemia, fragile skin,
 * circumferential application), the settings (pressure, mode, filler,
 * contact layer, change interval), power supply and how leaks are handled,
 * and the monitoring that catches harm: canister blood, retained foam,
 * periwound damage and loss of seal for more than 2 hours.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanContribution, PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { isChild } from '../../core/age';
import { ACUTE_LIMB_ISCHAEMIA_REDFLAG } from './shared';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'npwt';
const f = (id: string) => `${ID}.${id}`;

// ── Indication and safety (carried forward) ─────────────────────────────────

const PURPOSE: EncounterField = {
  id: f('purpose'), label: 'Purpose', kind: 'select', important: true,
  options: [
    { value: 'bed_preparation', label: 'Wound-bed preparation (granulation, size reduction)' },
    { value: 'exudate', label: 'Exudate control' },
    { value: 'graft_fixation', label: 'Skin-graft / dermal-substitute fixation (bolster)' },
    { value: 'incisional', label: 'Closed-incision NPWT (high-risk incision)' },
    { value: 'bridge_to_flap', label: 'Bridge to flap / delayed closure (open fracture, fasciotomy)' },
    { value: 'instillation', label: 'NPWT with instillation (infected / contaminated wound)' },
  ],
};
const DEVICE: EncounterField = {
  id: f('device'), label: 'System', kind: 'select', important: true,
  options: [
    { value: 'commercial', label: 'Commercial device' },
    { value: 'portable_single_use', label: 'Single-use portable (canister-free) device' },
    { value: 'improvised_wall', label: 'Improvised — wall suction, foam / gauze and drape' },
    { value: 'improvised_portable', label: 'Improvised — portable suction pump' },
  ],
};
const CONTRA: EncounterField = {
  id: f('contraindications'), label: 'Contraindications', kind: 'multiselect', important: true,
  options: [
    { value: 'none', label: 'None' },
    { value: 'malignancy', label: 'Malignancy in the wound (except palliative symptom control)', flag: 'red', flagReason: 'Malignancy in the wound: NPWT is contraindicated (stimulates tumour tissue) — except for palliation by a senior decision.' },
    { value: 'osteomyelitis', label: 'Untreated osteomyelitis', flag: 'red', flagReason: 'Untreated osteomyelitis: debride the bone and start treatment before NPWT.' },
    { value: 'fistula', label: 'Non-enteric or unexplored fistula', flag: 'red', flagReason: 'Unexplored fistula: contraindication to NPWT.' },
    { value: 'necrotic_eschar', label: 'Necrotic tissue with eschar', flag: 'red', flagReason: 'Necrotic tissue / eschar: debride first — NPWT over necrosis traps infection.' },
    { value: 'exposed_vessels', label: 'Exposed blood vessels, anastomoses, organs or nerves', flag: 'red', flagReason: 'Exposed vessels, anastomoses, organs or nerves: risk of fatal haemorrhage or injury — cover with tissue first (FDA 2011).' },
    { value: 'active_bleeding', label: 'Active bleeding / haemostasis not secure', flag: 'red', flagReason: 'Bleeding: do not apply NPWT until haemostasis is secure.' },
    { value: 'adhesive_allergy', label: 'Allergy to the drape adhesive or dressing' },
  ],
};
const PRECAUTIONS: EncounterField = {
  id: f('precautions'), label: 'Precautions', kind: 'multiselect',
  options: [
    { value: 'none', label: 'None' },
    { value: 'anticoagulated', label: 'Anticoagulant / antiplatelet or coagulopathy', flag: 'amber', flagReason: 'Bleeding risk on NPWT: lower pressure, protect vessels, watch the canister, and do not leave unobserved at first (FDA 2011).' },
    { value: 'infected', label: 'Infected wound', flag: 'amber', flagReason: 'Infected wound on NPWT: debride first, change more often (every 12–24 h), consider instillation; systemic antibiotics as indicated.' },
    { value: 'ischaemic', label: 'Ischaemic limb', flag: 'amber', flagReason: 'Ischaemic wound: low pressure; perfusion assessment first — NPWT does not treat ischaemia.' },
    { value: 'fragile_skin', label: 'Fragile periwound skin', flag: 'amber', flagReason: 'Fragile periwound skin: barrier film and frame the wound with hydrocolloid / drape strips.' },
    { value: 'near_vessels', label: 'Close to (protected) vessels, graft, tendon or nerve', flag: 'amber', flagReason: 'Near vessels, tendon or nerve: non-adherent contact layer, lower pressure.' },
    { value: 'circumferential', label: 'Circumferential application', flag: 'amber', flagReason: 'Circumferential dressing can constrict: avoid a full ring of drape; check distal perfusion.' },
    { value: 'child', label: 'Child' },
    { value: 'spinal_injury', label: 'Spinal cord injury (autonomic dysreflexia)' },
    { value: 'irradiated', label: 'Irradiated tissue' },
  ],
};
const INDICATION: EncounterSection = {
  id: f('indication'),
  title: 'Indication and safety check',
  intent: 'Contraindications are checked at every application, not just the first.',
  fields: [PURPOSE, DEVICE, CONTRA, PRECAUTIONS],
};

// ── Settings ────────────────────────────────────────────────────────────────

const PRESSURE: EncounterField = {
  id: f('pressure_mmhg'), label: 'Pressure (negative)', kind: 'number', unit: 'mmHg', min: 25, max: 200, important: true,
  help: 'Usual: −125 mmHg; −75 to −80 for grafts, ischaemic, painful or paediatric wounds and near vessels; follow the device instructions.',
};
const SETTINGS: EncounterSection = {
  id: f('settings'),
  title: 'Settings and application',
  fields: [
    PRESSURE,
    {
      id: f('mode'), label: 'Mode', kind: 'select',
      options: [{ value: 'continuous', label: 'Continuous' }, { value: 'intermittent', label: 'Intermittent / variable' }],
    },
    {
      id: f('filler'), label: 'Wound filler', kind: 'select',
      options: [
        { value: 'black_foam', label: 'Polyurethane (black) foam' },
        { value: 'white_foam', label: 'Polyvinyl-alcohol (white) foam — tunnels, over tendon / near vessels' },
        { value: 'gauze', label: 'Antimicrobial gauze' },
        { value: 'improvised_foam', label: 'Improvised foam (sterilised)' },
        { value: 'improvised_gauze', label: 'Improvised gauze with drain tube' },
      ],
    },
    { id: f('contact_layer'), label: 'Non-adherent contact layer used', kind: 'boolean' },
    { id: f('pieces_in'), label: 'Foam / gauze pieces placed', kind: 'number', min: 0, max: 50, important: true,
      help: 'Count and write it on the drape and in the notes — every piece must come out.' },
    {
      id: f('seal'), label: 'Seal', kind: 'select', important: true,
      options: [
        { value: 'good', label: 'Holds pressure, dressing collapsed' },
        { value: 'leak', label: 'Leak / alarms', flag: 'amber', flagReason: 'Leak: find and patch it; if therapy is off for more than 2 hours, remove the filler and apply a conventional dressing (manufacturer instructions).' },
      ],
    },
    {
      id: f('power'), label: 'Power supply for the suction', kind: 'select', important: true,
      options: [
        { value: 'stable', label: 'Stable (or battery device)' },
        { value: 'intermittent', label: 'Intermittent (outages)', flag: 'amber', flagReason: 'Power outages stop therapy: battery backup or a plan to take the dressing down if suction is off for more than 2 hours.' },
      ],
    },
    {
      id: f('change_interval'), label: 'Change interval', kind: 'select', important: true,
      options: [
        { value: '48_72h', label: 'Every 48–72 hours (at least 3 times a week)' },
        { value: '12_24h', label: 'Every 12–24 hours (infected wound)' },
        { value: '5_7d', label: '5–7 days (graft fixation / closed incision)' },
        { value: 'over_72h', label: 'Longer than 72 hours on an open wound', flag: 'amber', flagReason: 'Open-wound NPWT left longer than 72 hours: granulation grows into the foam and infection risk rises — change every 48–72 hours.' },
      ],
    },
    { id: f('ambulatory'), label: 'To continue at home / as an outpatient', kind: 'boolean' },
  ],
};

// ── Review on therapy (wound review / post-op) ──────────────────────────────

const MONITOR: EncounterSection = {
  id: f('monitor'),
  title: 'On therapy',
  fields: [
    { id: f('days_on'), label: 'Days on NPWT', kind: 'number', unit: 'days', min: 0, max: 180, important: true },
    { id: f('canister_ml'), label: 'Canister output, last 24 hours', kind: 'number', unit: 'mL', min: 0, max: 5000 },
    {
      id: f('canister_fluid'), label: 'Canister / tubing fluid', kind: 'select', important: true,
      options: [
        { value: 'serous', label: 'Serous' },
        { value: 'serosanguinous', label: 'Serosanguinous' },
        { value: 'purulent', label: 'Purulent', flag: 'amber', flagReason: 'Purulent output: infection under the dressing — take down, debride, culture; more frequent changes.' },
        { value: 'frank_blood', label: 'Frank blood / rapidly filling', flag: 'red', flagReason: 'Bleeding on NPWT: STOP the therapy now (do not just clamp), apply direct pressure, call the surgeon — deaths have occurred (FDA 2011).' },
      ],
    },
    { id: f('pieces_out'), label: 'Pieces removed at this change', kind: 'number', min: 0, max: 50 },
    {
      id: f('response'), label: 'Wound response', kind: 'select', important: true,
      options: [
        { value: 'improving', label: 'Granulating, smaller' },
        { value: 'static', label: 'No improvement', flag: 'amber', flagReason: 'No measurable improvement on NPWT: reassess the wound and the cause; stop if no progress after 1–2 weeks (WUWHS 2008).' },
        { value: 'worse', label: 'Worse / sloughy / malodorous', flag: 'amber', flagReason: 'Wound worse on NPWT: take down, debride, look for infection.' },
        { value: 'ready', label: 'Ready for closure / graft / flap' },
      ],
    },
    {
      id: f('periwound'), label: 'Periwound skin', kind: 'multiselect',
      options: [
        { value: 'intact', label: 'Intact' },
        { value: 'maceration', label: 'Maceration' },
        { value: 'blisters', label: 'Blisters / skin stripping from the drape', flag: 'amber', flagReason: 'Drape injury: barrier film, hydrocolloid frame, gentle removal with adhesive remover.' },
        { value: 'pressure_tube', label: 'Pressure injury from the tubing', flag: 'amber', flagReason: 'Tubing pressure injury: bridge the tube away from bony areas and pad it.' },
      ],
    },
    {
      id: f('ingrowth'), label: 'Granulation grown into the foam', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Ingrowth: shorter change interval or a contact layer; soak with saline / local anaesthetic before removal.' },
    },
    {
      id: f('pain_change'), label: 'Pain at dressing changes', kind: 'select',
      options: [
        { value: 'tolerable', label: 'Tolerable' },
        { value: 'severe', label: 'Severe', flag: 'amber', flagReason: 'Severe pain at changes: pre-emptive analgesia, instil local anaesthetic into the foam, contact layer, lower pressure.' },
      ],
    },
    { id: f('therapy_interruptions'), label: 'Therapy off for more than 2 hours since the last change', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'NPWT off for more than 2 hours: the dressing becomes an occlusive, undrained foam — change it.' } },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

/**
 * Contraindications ticked here, plus the ones the core answers in this same
 * review already show — an exposed vessel recorded in the wound assessment is
 * a contraindication whether or not it is ticked again here (FDA 2011).
 */
const contraindicated = (a: EncounterAnswers) => {
  const out = chosen(a, f('contraindications')).filter(x => x !== 'adhesive_allergy');
  if (hasAny(a, 'core.wound_exposed', 'vessels')) out.push('exposed_vessels');
  if (isOneOf(a, 'core.wound_aetiology', 'malignant') || isOneOf(a, 'core.wound_biopsy', 'malignant')) out.push('malignancy');
  if (hasAny(a, 'core.wound_tissue', 'eschar', 'necrotic') || isOneOf(a, 'core.wound_nonviable', 'gt50')) out.push('necrotic_eschar');
  if (isOneOf(a, 'core.op_wound', 'soaked') || isOneOf(a, 'core.drain', 'frank_blood')) out.push('active_bleeding');
  return [...new Set(out)];
};

const goals: PlanRule = ctx => {
  const purpose = ctx.answers[f('purpose')];
  return { problem: { goals: [
    L(purpose === 'graft_fixation' ? 'Complete graft take: even pressure, no shear, no fluid under the graft'
      : purpose === 'incisional' ? 'An incision that heals without infection or dehiscence'
        : 'A clean, granulating bed ready for closure, graft or flap — then stop NPWT', 'NPWT is an adjunct with a defined endpoint (WUWHS 2008; NICE)'),
    L('No harm from the therapy: no bleeding, retained filler, skin damage or untreated infection', 'NPWT safety (FDA 2011)'),
  ] } };
};

const safety: PlanRule = ctx => {
  const a = ctx.answers;
  const contra = contraindicated(a);
  const prec = chosen(a, f('precautions'));
  if (isChild(ctx.patient, ctx.module) && !prec.includes('child')) prec.push('child');
  const parts: PlanContribution[] = [];
  if (!a[f('contraindications')] && !contra.length) {
    parts.push({ problem: { treatment: [L(
      'Check and record the NPWT contraindications before applying or re-applying it: malignancy in the wound, untreated osteomyelitis, unexplored fistula, necrotic tissue / eschar, exposed vessels / anastomoses / organs, bleeding',
      'Contraindications not recorded (FDA 2011; manufacturer instructions)', ctx.phase === 'post_op' ? 'routine' : 'urgent')] } });
  }
  if (hasAny(a, 'core.wound_exposed', 'bone') && !contra.includes('osteomyelitis')) {
    parts.push({ cautions: ['Exposed or probe-able bone: exclude or treat osteomyelitis before NPWT (untreated osteomyelitis is a contraindication).'] });
  }
  if (isOneOf(a, 'core.wound_edge', 'raised_irregular') && !contra.includes('malignancy')) {
    parts.push({ cautions: ['Raised, everted or irregular wound edge: biopsy to exclude malignancy before NPWT.'] });
  }
  if (contra.length) {
    parts.push({ problem: { treatment: [L(
      contra.includes('necrotic_eschar') && contra.length === 1
        ? 'Do not apply NPWT yet: debride the necrotic tissue / eschar first, then reassess'
        : contra.includes('active_bleeding') && contra.length === 1
          ? 'Do not apply NPWT until haemostasis is secure'
          : 'Do not apply NPWT: treat the contraindication first (debride bone and treat osteomyelitis, investigate the fistula, cover exposed vessels / organs with tissue, or a palliative decision for malignancy); use conventional dressings meanwhile',
      `Contraindicated: ${contra.join(', ').replace(/_/g, ' ')} (FDA 2011; manufacturer instructions; NICE)`, 'urgent')] } });
  }
  if (hasAny(a, f('contraindications'), 'adhesive_allergy')) {
    parts.push({ cautions: ['Drape / adhesive allergy recorded: use an alternative drape (silicone) or do not use NPWT.'] });
  }
  if (prec.includes('anticoagulated') || ((a['core.anticoagulant'] as string[] | undefined)?.some(x => x !== 'none') ?? false)) {
    parts.push({ problem: { monitoring: [L('Bleeding watch: canister and tubing checked hourly for the first hours after application, then each shift; lower pressure; patient and nurse know to switch off and press if blood appears', 'Anticoagulation / bleeding risk on NPWT (FDA 2011)', 'urgent')] } });
  }
  if (prec.includes('infected')) {
    parts.push({ general: [G('Wound care and dressings', L('Infected wound: debride before applying; antimicrobial filler or instillation; change every 12–24 hours; systemic antibiotics for spreading infection', 'Infected wound on NPWT'))] });
  }
  if (prec.includes('ischaemic') && !isOneOf(a, 'core.perfusion', 'doubtful', 'poor') && !isOneOf(a, 'core.pvd', 'suspected')) {
    parts.push({ problem: { investigations: [L('Confirm perfusion (pulses, ABI / toe pressure) before relying on NPWT', 'Ischaemic limb — NPWT does not correct ischaemia')] } });
  }
  if (prec.includes('circumferential')) {
    parts.push({ problem: { monitoring: [L('Do not apply drape as a closed ring; check distal perfusion each shift', 'Circumferential application')] } });
  }
  if (prec.includes('near_vessels') || prec.includes('irradiated') || prec.includes('child')) {
    parts.push({ general: [G('Wound care and dressings', L('Non-adherent contact layer and lower pressure (about −75 to −80 mmHg)', `Precaution: ${prec.filter(p => ['near_vessels', 'irradiated', 'child'].includes(p)).join(', ').replace(/_/g, ' ')}`))] });
  }
  if (prec.includes('spinal_injury')) {
    parts.push({ cautions: ['Spinal cord injury: wound stimulation from NPWT can trigger autonomic dysreflexia — monitor blood pressure at changes.'] });
  }
  return merge(...parts);
};

const settings: PlanRule = ctx => {
  if (ctx.phase === 'post_op' && !ctx.answers[f('pressure_mmhg')]) return null;
  const a = ctx.answers;
  const p = numOf(a, f('pressure_mmhg'));
  const purpose = a[f('purpose')];
  const parts: PlanContribution[] = [];
  // No settings advice while NPWT is contraindicated: the safety rule says
  // not to apply it.
  if (p == null && !contraindicated(a).length) {
    parts.push({ general: [G('Wound care and dressings', L(
      purpose === 'graft_fixation' ? 'Graft fixation: about −75 to −125 mmHg continuous for 5–7 days over a non-adherent layer, then remove and inspect'
        : purpose === 'incisional' ? 'Closed-incision NPWT: device-set pressure (usually −80 to −125 mmHg) for up to 7 days'
          : 'Open wound: −125 mmHg continuous as standard (lower for pain, ischaemia, children or near vessels); change every 48–72 hours',
      `Purpose: ${String(purpose ?? 'not recorded').replace(/_/g, ' ')} (Morykwas 1997; international expert panel, Krug 2011)`))] });
  } else if (p != null && p > 150) {
    parts.push({ cautions: [`Pressure −${p} mmHg is above the usual therapeutic range (−50 to −150 mmHg): confirm with the operating surgeon; higher pressure reduces perfusion at the wound edge.`] });
  }
  if (isOneOf(a, f('device'), 'improvised_wall', 'improvised_portable')) {
    parts.push({ general: [G('Wound care and dressings', L('Improvised NPWT: sterilised foam or gauze with a fenestrated drain tube, sealed with adhesive drape; regulator set and checked on a gauge; canister / trap below the wound; label the date, pressure and number of pieces', 'Improvised NPWT is effective when the seal and pressure are verified (published LMIC series)'))] });
  }
  if (isOneOf(a, f('power'), 'intermittent')) {
    parts.push({ general: [G('Wound care and dressings', L('Power-outage plan: battery-backed device where possible; nurses note every interruption; if suction is off for over 2 hours, remove the filler and apply a moist conventional dressing until it is restored', 'Intermittent power supply (manufacturer 2-hour rule)'))] });
  }
  if (isOneOf(a, f('change_interval'), 'over_72h')) {
    parts.push({ problem: { treatment: [L('Change the open-wound dressing every 48–72 hours (at least 3 times a week)', 'Change interval longer than 72 hours (manufacturer instructions)')] } });
  }
  if (isOneOf(a, f('seal'), 'leak')) {
    parts.push({ problem: { treatment: [L('Find and patch the leak (paste or hydrocolloid at creases, bridging); change the dressing if it cannot be sealed within 2 hours', 'Leak / loss of seal')] } });
  }
  if (numOf(a, f('pieces_in')) == null) {
    parts.push({ problem: { monitoring: [L('Count the filler pieces placed; write the number on the drape and in the notes', 'Retained foam is a recognised NPWT harm (FDA 2011)')] } });
  }
  if (isYes(a, f('ambulatory'))) {
    parts.push({ general: [G('Patient education', L('Home NPWT: alarms and what they mean, how to clamp and switch off, what to do if blood appears (switch off, press, come in), battery charging, and the phone number to call', 'Ambulatory NPWT (FDA 2011 patient advice)'))] });
  }
  parts.push({ counselling: [P('NPWT', 'A sponge sealed under a clear film is connected to a pump that gently sucks fluid away; it is changed every 2–3 days; switch it off and press firmly if you see blood in the tube, then call.', 'NPWT (procedure education record; FDA 2011)')] });
  return merge(...parts);
};

const monitoring: PlanRule = ctx => {
  if (ctx.phase === 'pre_op') return null;
  const a = ctx.answers;
  const fluid = a[f('canister_fluid')];
  const pin = numOf(a, f('pieces_in')), pout = numOf(a, f('pieces_out'));
  const days = numOf(a, f('days_on'));
  const resp = a[f('response')];
  const parts: PlanContribution[] = [];
  if (fluid === 'frank_blood') {
    parts.push({ problem: { treatment: [L('Stop NPWT now, remove the filler, apply direct pressure and call the operating surgeon; check Hb and clotting; theatre if bleeding continues', 'Frank blood in the canister / tubing (FDA 2011)', 'urgent')] } });
  }
  if (fluid === 'purulent' || resp === 'worse') {
    parts.push({ problem: { treatment: [L('Take the dressing down, debride, send tissue for culture; restart only on a clean bed with more frequent changes (or instillation)', fluid === 'purulent' ? 'Purulent canister output' : 'Wound worse on NPWT')] } });
  }
  if (pin != null && pout != null && pout < pin) {
    parts.push({ problem: { treatment: [L('Pieces unaccounted for: search the wound now (and image if needed) — do not reapply until every piece is found', `${pin} placed, ${pout} removed (FDA 2011 retained-foam warning)`, 'urgent')] } });
  }
  if (resp === 'static' && days != null && days >= 14) {
    parts.push({ problem: { treatment: [L('Stop NPWT: no measurable improvement after 2 weeks — re-evaluate the diagnosis, infection, perfusion and offloading', `No improvement after ${days} days (WUWHS 2008)`)] } });
  } else if (resp === 'static') {
    parts.push({ problem: { monitoring: [L('Measure the wound at each change; if there is no measurable improvement within 1–2 weeks, stop and reassess', 'No improvement yet (WUWHS 2008)')] } });
  }
  if (resp === 'ready') {
    parts.push({ problem: { treatment: [L('Stop NPWT and proceed to closure, skin graft or flap (NPWT can be reused as graft fixation)', 'Endpoint reached — bed ready')] } });
  }
  if (isYes(a, f('ingrowth'))) {
    parts.push({ general: [G('Wound care and dressings', L('Add a non-adherent contact layer or shorten the change interval; soak the foam with saline (or instil local anaesthetic) before removal', 'Granulation ingrowth into the foam'))] });
  }
  if (isOneOf(a, f('pain_change'), 'severe')) {
    parts.push({ general: [G('Analgesia', L('Instil lidocaine into the foam 15–30 minutes before removal — maximum 3 mg/kg plain lidocaine in total, including any other local anaesthetic given (check the local protocol); lower pressure; contact layer', 'Severe pain at NPWT changes'))] });
  }
  if (hasAny(a, f('periwound'), 'blisters', 'maceration')) {
    parts.push({ general: [G('Wound care and dressings', L('Protect the periwound: barrier film, frame with hydrocolloid or drape strips, cut the foam to the wound edge only', 'Periwound damage on NPWT'))] });
  }
  if (hasAny(a, f('periwound'), 'pressure_tube')) {
    parts.push({ general: [G('Pressure care', L('Bridge the tubing away from bony prominences and pad it; never let the patient lie on the tube', 'Tubing pressure injury'))] });
  }
  if (isYes(a, f('therapy_interruptions'))) {
    parts.push({ problem: { treatment: [L('Change the dressing now and record why therapy stopped (power, leak, canister full)', 'Therapy off for more than 2 hours')] } });
  }
  return merge(...parts);
};

// ── The module ──────────────────────────────────────────────────────────────

export const npwt: ProcedureModule = {
  id: ID,
  name: 'Negative-pressure wound therapy (NPWT)',
  summary: 'NPWT as an adjunct — commercial or improvised: indication, contraindications, settings, change interval, bleeding and retained-foam safety, power supply and endpoint.',
  group: 'wound',
  phases: ['wound_review', 'pre_op', 'post_op'],
  problemLabel: 'Wound on negative-pressure therapy',
  basis: [
    'US FDA Safety communication: serious complications associated with NPWT systems (2009, updated 2011)',
    'World Union of Wound Healing Societies: Vacuum assisted closure — recommendations for use (consensus 2008)',
    'Krug E et al. Evidence-based recommendations for the use of NPWT in traumatic wounds and reconstructive surgery: international expert panel. Injury 2011',
    'Morykwas MJ et al. Vacuum-assisted closure: animal studies and basic foundation. Ann Plast Surg 1997',
    'NICE MTG43 (PICO) and NICE interventional procedures guidance on NPWT; WHO 2016 SSI guideline (prophylactic NPWT on high-risk incisions)',
    'Manufacturers\' instructions for use (2-hour rule, change interval, contraindications)',
  ],
  catalog: {
    educationId: 'NPWT-001',
    patientEducationIds: ['chronic-wound'],
  },
  sections: {
    wound_review: [INDICATION, SETTINGS, MONITOR],
    pre_op: [INDICATION, SETTINGS],
    post_op: [INDICATION, SETTINGS, MONITOR],
  },
  carryForward: [f('purpose'), f('device'), f('pressure_mmhg'), f('mode'), f('filler'), f('change_interval')],
  // Safety-net for limb wounds (ischaemic or circumferential limb, or a leg / foot ulcer aetiology).
  planRules: [goals, safety, settings, monitoring, ctx =>
    hasAny(ctx.answers, f('precautions'), 'ischaemic', 'circumferential') || isOneOf(ctx.answers, 'core.pvd', 'suspected', 'confirmed')
      || isOneOf(ctx.answers, 'core.wound_aetiology', 'arterial', 'venous', 'mixed', 'diabetic') ? ACUTE_LIMB_ISCHAEMIA_REDFLAG : null],
  consent: {
    procedureName: 'Negative-pressure wound therapy (application and dressing changes)',
    phases: ['wound_review', 'pre_op'],
    intendedBenefits: [
      'Remove excess fluid and help healthy tissue form in the wound',
      'Shrink the wound and prepare it for closure, grafting or a flap',
      'Hold a skin graft firmly in place, or protect a high-risk incision',
      'Fewer dressing changes than daily dressings',
    ],
    risks: [
      { name: 'Retained foam', description: 'A piece of foam or gauze left in the wound can cause infection; pieces are counted in and out' },
      { name: 'Infection under the dressing', description: 'Infection can develop under the sealed dressing, which is why it is changed regularly' },
      { name: 'Skin damage', description: 'Blistering or skin stripping from the adhesive film, or pressure from the tubing' },
      { name: 'Loss of therapy', description: 'Leaks, full canisters or power cuts stop the suction; the dressing must then be changed within about 2 hours' },
      { name: 'Serious bleeding (rare)', description: 'Rare but serious, mainly with blood thinners or near large blood vessels', frequency: 'Rare (FDA 2011 reports)' },
    ],
    alternatives: [
      'Conventional moist dressings changed daily or as needed',
      'Surgical closure, skin graft or flap without NPWT',
      'Bolster (tie-over) dressing for graft fixation',
    ],
    riskOfNotTreating: 'Without NPWT the wound can still be treated with conventional dressings; healing or readiness for surgery may be slower and dressing changes more frequent.',
    anaesthesiaOptions: ['local', 'sedation', 'regional', 'general'],
    additionalProcedures: ['Debridement before application', 'Repeated dressing changes, sometimes in theatre'],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: false,
    counsellingTopics: [
      'What the device does, how long it stays on, and how often it is changed',
      'What to do if the alarm sounds, the seal leaks or the power goes off',
      'Switch off and press firmly if blood appears in the tube; come in immediately',
      'The cost of the device or consumables',
    ],
    modifiers: [
      { id: 'npwt_anticoag', when: c => hasAny(c.answers, f('precautions'), 'anticoagulated') || ((c.answers['core.anticoagulant'] as string[] | undefined)?.some(x => x !== 'none') ?? false),
        text: 'Because you take blood-thinning medicine (or bleed more easily), bleeding under the NPWT dressing is more likely; the canister will be watched closely.',
        why: 'Anticoagulation / bleeding risk' },
      { id: 'npwt_vessels', when: c => hasAny(c.answers, f('precautions'), 'near_vessels', 'irradiated'),
        text: 'Because the wound is close to blood vessels or has had radiotherapy, a protective layer and lower suction will be used; bleeding is more likely.',
        why: 'Near vessels / irradiated tissue' },
      { id: 'npwt_power', when: c => isOneOf(c.answers, f('power'), 'intermittent') || isOneOf(c.answers, f('device'), 'improvised_wall', 'improvised_portable'),
        text: 'With an improvised system or an unreliable power supply, therapy may stop at times and the dressing may need changing more often.',
        why: 'Improvised device / intermittent power' },
      { id: 'npwt_infected', when: c => hasAny(c.answers, f('precautions'), 'infected'),
        text: 'Because the wound is infected, the dressing will be changed more often and infection can still worsen under it.',
        why: 'Infected wound' },
      { id: 'npwt_ischaemic', when: c => hasAny(c.answers, f('precautions'), 'ischaemic'),
        text: 'Poor circulation to the wound limits what NPWT can achieve.',
        why: 'Ischaemic wound' },
    ],
  },
  followUp: {
    wound_review: [{ when: 'Every 48–72 hours (12–24 h if infected)', purpose: 'Dressing change, measurement, count of pieces, response' }],
    pre_op: [{ when: 'Day 5–7 (graft fixation) or 48–72 hours (open wound)', purpose: 'First NPWT change / graft inspection' }],
    post_op: [
      { when: 'Every 48–72 hours', purpose: 'Change, measure, response; stop at the endpoint' },
      { when: '2 weeks', purpose: 'Is there measurable improvement? If not, stop and reassess' },
    ],
  },
  handoffs: [
    { label: 'NPWT', route: '/npwt', when: 'Device log, settings and changes' },
    { label: 'WoundProgress Monitor', route: '/wound-monitor', when: 'Calibrated measurement at each change' },
    { label: 'Skin Graft Monitor', route: '/skin-graft', phases: ['pre_op', 'post_op'], when: 'NPWT as graft fixation' },
  ],
};
