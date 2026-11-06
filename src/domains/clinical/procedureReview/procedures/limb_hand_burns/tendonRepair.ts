/**
 * Flexor and extensor tendon repair (hand and forearm).
 *
 * Pre-operative: which tendon, which zone (Verdan / Kleinert flexor zones I–V
 * and thumb T1–T3; Kleinert & Verdan extensor zones I–IX and thumb TI–TV),
 * mechanism, time since injury, associated digital nerve / artery injury,
 * fracture and foreign body, contamination and tetanus, the hand therapy
 * that will be available — because the repair is only as good as the
 * rehabilitation. Post-operative: the repair as done (core strands,
 * epitendinous suture, pulley venting, wide-awake intra-operative test), the
 * named rehabilitation protocol and splint, and the early complications
 * (rupture, infection, stiffness, CRPS). Follow-up: active range and the
 * Strickland score, grip, splint weaning, loading, return to work, adhesions
 * and tenolysis.
 *
 * The Strickland (Strickland & Glogovac 1980) total active motion percentage
 * is a published formula with no existing calculator in the app; it is
 * computed here as a module score.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanContribution, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { tetanusField, tetanusRule } from './shared';

const ID = 'tendon_repair';
const f = (id: string) => `${ID}.${id}`;

// ── The injury (carried forward) ────────────────────────────────────────────

const TYPE: EncounterField = {
  id: f('type'), label: 'Tendon', kind: 'select', important: true,
  options: [{ value: 'flexor', label: 'Flexor' }, { value: 'extensor', label: 'Extensor' }, { value: 'both', label: 'Flexor and extensor' }],
};
const DIGITS: EncounterField = {
  id: f('digits'), label: 'Digits / structures', kind: 'multiselect', important: true,
  options: [
    { value: 'thumb', label: 'Thumb' }, { value: 'index', label: 'Index' }, { value: 'middle', label: 'Middle' },
    { value: 'ring', label: 'Ring' }, { value: 'little', label: 'Little' }, { value: 'wrist', label: 'Wrist tendons' },
  ],
};
const FLEXOR_ZONE: EncounterField = {
  id: f('flexor_zone'), label: 'Flexor zone (Verdan / Kleinert)', kind: 'select', important: true,
  showWhen: { field: f('type'), equals: ['flexor', 'both'] },
  options: [
    { value: 'I', label: 'Zone I — distal to the FDS insertion (FDP only)' },
    { value: 'II', label: 'Zone II — within the fibro-osseous sheath (A1 pulley to FDS insertion)', hint: 'Both tendons in the sheath: highest risk of adhesion and rupture.' },
    { value: 'III', label: 'Zone III — palm (lumbrical origin)' },
    { value: 'IV', label: 'Zone IV — carpal tunnel' },
    { value: 'V', label: 'Zone V — wrist / distal forearm' },
    { value: 'T1', label: 'Thumb T1 — distal to IP joint' },
    { value: 'T2', label: 'Thumb T2 — A1 pulley to IP joint' },
    { value: 'T3', label: 'Thumb T3 — thenar eminence' },
  ],
};
const EXTENSOR_ZONE: EncounterField = {
  id: f('extensor_zone'), label: 'Extensor zone (Kleinert & Verdan)', kind: 'select', important: true,
  showWhen: { field: f('type'), equals: ['extensor', 'both'] },
  options: [
    { value: 'I', label: 'Zone I — DIP joint (mallet)' },
    { value: 'II', label: 'Zone II — middle phalanx' },
    { value: 'III', label: 'Zone III — PIP joint (central slip; boutonnière risk)' },
    { value: 'IV', label: 'Zone IV — proximal phalanx' },
    { value: 'V', label: 'Zone V — MCP joint (fight bite until proven otherwise)' },
    { value: 'VI', label: 'Zone VI — metacarpal' },
    { value: 'VII', label: 'Zone VII — extensor retinaculum' },
    { value: 'VIII', label: 'Zone VIII — distal forearm' },
    { value: 'IX', label: 'Zone IX — mid / proximal forearm (muscle bellies)' },
    { value: 'TI_TII', label: 'Thumb TI–TII — IP joint / proximal phalanx' },
    { value: 'TIII_TV', label: 'Thumb TIII–TV — MCP joint to wrist' },
  ],
};
const MECHANISM: EncounterField = {
  id: f('mechanism'), label: 'Mechanism', kind: 'select', important: true,
  options: [
    { value: 'clean_cut', label: 'Clean cut (glass, knife)' },
    { value: 'machete', label: 'Machete / saw / machine' },
    { value: 'crush', label: 'Crush / avulsion' },
    { value: 'bite', label: 'Human or animal bite (including punch to the teeth)', flag: 'red',
      flagReason: 'Bite: high infection risk (Eikenella, anaerobes, Pasteurella) — formal washout in theatre and antibiotics; do not close the skin primarily.' },
    { value: 'closed_avulsion', label: 'Closed avulsion (jersey finger / mallet)' },
    { value: 'attritional', label: 'Attritional / rheumatoid rupture' },
    { value: 'gunshot', label: 'Gunshot / blast', flag: 'amber', flagReason: 'Gunshot or blast: contamination and segmental loss — staged reconstruction is likely.' },
  ],
};
const INJURY: EncounterSection = {
  id: f('injury'),
  title: 'The tendon injury',
  intent: 'Recorded once and carried forward.',
  fields: [TYPE, DIGITS, FLEXOR_ZONE, EXTENSOR_ZONE, MECHANISM],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const ASSESS: EncounterSection = {
  id: f('assess'),
  title: 'Assessment before repair',
  fields: [
    {
      id: f('hours_since'), label: 'Time since injury', kind: 'select', important: true,
      options: [
        { value: 'under_24h', label: 'Under 24 hours' },
        { value: '1_7d', label: '1–7 days' },
        { value: '1_3w', label: '1–3 weeks', flag: 'amber', flagReason: 'Delayed presentation: the tendon retracts and softens; direct repair may still be possible but be ready for a graft or staged reconstruction.' },
        { value: 'over_3w', label: 'Over 3 weeks', flag: 'amber', flagReason: 'Over 3 weeks: direct repair is often impossible (retraction, myostatic shortening) — plan tendon graft, transfer or two-stage reconstruction.' },
      ],
    },
    {
      id: f('findings'), label: 'Examination', kind: 'multiselect',
      options: [
        { value: 'cascade', label: 'Disturbed resting cascade' },
        { value: 'fdp_absent', label: 'No active DIP flexion (FDP)' },
        { value: 'fds_absent', label: 'No isolated PIP flexion (FDS)' },
        { value: 'extension_lag', label: 'Extension lag / dropped digit' },
        { value: 'partial', label: 'Painful weak movement — possible partial division' },
      ],
    },
    {
      id: f('nv_injury'), label: 'Associated injury', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None found' },
        { value: 'digital_nerve', label: 'Digital nerve — numb side of the digit', flag: 'amber', flagReason: 'Digital nerve injury: repair it at the same operation (use the nerve repair module for sensory follow-up).' },
        { value: 'digital_artery', label: 'Digital artery (bleeding, one side)' },
        { value: 'devascularised', label: 'Digit pale / cold / no capillary refill', flag: 'red',
          flagReason: 'Devascularised digit: emergency exploration and arterial repair — warm ischaemia time matters.' },
        { value: 'fracture', label: 'Fracture / joint injury' },
        { value: 'skin_loss', label: 'Skin loss over the tendon', flag: 'amber', flagReason: 'Skin loss over a repaired tendon: the repair needs vascularised cover (local or regional flap).' },
      ],
    },
    {
      id: f('xray'), label: 'X-ray', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'normal', label: 'No fracture or foreign body' },
        { value: 'fracture', label: 'Fracture / avulsion fragment' },
        { value: 'foreign_body', label: 'Foreign body (glass, metal)' },
      ],
    },
    {
      id: f('contamination'), label: 'Wound contamination', kind: 'select',
      options: [
        { value: 'clean', label: 'Clean' },
        { value: 'contaminated', label: 'Contaminated (soil, farm, sewage)', flag: 'amber', flagReason: 'Contaminated wound: formal debridement and washout; antibiotics; delayed tendon repair if heavily contaminated.' },
      ],
    },
    tetanusField(f),
    {
      id: f('therapy_access'), label: 'Hand therapy available after surgery', kind: 'select', important: true,
      options: [
        { value: 'hand_therapist', label: 'Hand therapist' },
        { value: 'physio', label: 'Physiotherapist without hand-therapy training' },
        { value: 'none', label: 'None within reach', flag: 'amber',
          flagReason: 'No therapy within reach: the protocol must be taught before discharge and be safe as a home programme; plan phone / video therapy review.' },
      ],
    },
    {
      id: f('can_follow_protocol'), label: 'Can the patient follow a protected-motion protocol?', kind: 'select', important: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'doubtful', label: 'Doubtful (young child, cognitive impairment, intoxication, must return to manual work)', flag: 'amber',
          flagReason: 'Unreliable adherence ruptures repairs: consider a protocol with fewer demands or immobilisation (children under about 10 years), and plan supervision.' },
      ],
    },
  ],
};

// ── The repair and rehabilitation (post-operative) ──────────────────────────

const PROTOCOL: EncounterField = {
  id: f('protocol'), label: 'Rehabilitation protocol', kind: 'select', important: true,
  options: [
    { value: 'early_active', label: 'Early active motion (e.g. Saint John / WALANT protocol, Belfast, Manchester short splint)' },
    { value: 'kleinert', label: 'Controlled passive flexion with elastic traction (Kleinert)' },
    { value: 'duran', label: 'Controlled passive motion (Duran–Houser)' },
    { value: 'relative_motion', label: 'Relative motion (yoke) orthosis — extensor zones IV–VII' },
    { value: 'early_active_extensor', label: 'Early active extension (e.g. Norwich regime) — extensor zones V–VIII' },
    { value: 'mallet', label: 'Continuous DIP extension splint (mallet, zone I) for 6–8 weeks' },
    { value: 'immobilisation', label: 'Immobilisation (child or unreliable adherence), usually 3–4 weeks' },
  ],
};
const REPAIR: EncounterSection = {
  id: f('repair'),
  title: 'Repair and rehabilitation',
  fields: [
    {
      id: f('division'), label: 'Division found', kind: 'select',
      options: [
        { value: 'complete', label: 'Complete' },
        { value: 'partial_minor', label: 'Partial — trimmed, not repaired' },
        { value: 'partial_major', label: 'Partial — repaired' },
      ],
    },
    {
      id: f('core_strands'), label: 'Core suture strands across the repair', kind: 'select',
      showWhen: { field: f('type'), equals: ['flexor', 'both'] },
      options: [
        { value: '2', label: '2-strand' },
        { value: '4', label: '4-strand' },
        { value: '6', label: '6-strand or more' },
      ],
    },
    { id: f('epitendinous'), label: 'Epitendinous suture', kind: 'boolean' },
    { id: f('fds_repaired'), label: 'FDS repaired as well as FDP (zone II)', kind: 'select', showWhen: { field: f('flexor_zone'), equals: ['II'] },
      options: [{ value: 'both', label: 'Both' }, { value: 'fdp_only', label: 'FDP only (one or both FDS slips excised)' }] },
    { id: f('pulley_vent'), label: 'Pulley venting (A2 / A4 partial release)', kind: 'boolean' },
    {
      id: f('awake_test'), label: 'Wide-awake intra-operative active test', kind: 'select',
      options: [
        { value: 'not_awake', label: 'Not done (general / regional anaesthesia)' },
        { value: 'full_no_gap', label: 'Full active flexion and extension, no gap, no bunching' },
        { value: 'gap_revised', label: 'Gap or catching seen and corrected' },
      ],
    },
    { id: f('tendon_graft'), label: 'Tendon graft / transfer used', kind: 'boolean' },
    PROTOCOL,
    {
      id: f('splint'), label: 'Splint', kind: 'select', important: true,
      options: [
        { value: 'dorsal_blocking', label: 'Dorsal blocking splint (flexor)' },
        { value: 'relative_motion', label: 'Relative motion orthosis (yoke)' },
        { value: 'volar_extension', label: 'Volar splint with wrist and MCPs extended (extensor)' },
        { value: 'mallet', label: 'Mallet / DIP extension splint' },
        { value: 'pip_extension', label: 'PIP extension splint (central slip)' },
        { value: 'cast', label: 'Plaster cast' },
      ],
    },
    { id: f('therapy_started'), label: 'First hand-therapy session done', kind: 'boolean', important: true },
    {
      id: f('complication'), label: 'Problems', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'rupture', label: 'Sudden loss of active movement / felt a snap', flag: 'red',
          flagReason: 'Suspected repair rupture: urgent re-exploration — early re-repair (within days) does better than late reconstruction.' },
        { value: 'infection', label: 'Wound infection / tenosynovitis signs', flag: 'red',
          flagReason: 'Infection around a tendon repair threatens it (and the sheath): urgent washout and IV antibiotics.' },
        { value: 'splint_off', label: 'Splint removed / not worn', flag: 'amber', flagReason: 'Splint not worn: rupture risk — re-splint and re-explain.' },
        { value: 'swelling', label: 'Marked swelling' },
        { value: 'stiffness', label: 'Stiffness, not reaching protocol targets' },
        { value: 'crps_signs', label: 'Disproportionate pain, colour / temperature / sweating change', flag: 'amber',
          flagReason: 'Possible CRPS: assess against the Budapest criteria; early therapy, analgesia and desensitisation.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const OUTCOME: EncounterSection = {
  id: f('outcome'),
  title: 'Range of movement and function',
  intent: 'Active range of the repaired digit; the Strickland score is computed from PIP and DIP.',
  fields: [
    { id: f('weeks_post'), label: 'Weeks since repair', kind: 'number', unit: 'weeks', min: 0, max: 104, important: true },
    { id: f('digit_measured'), label: 'Digit measured', kind: 'text', placeholder: 'e.g. right ring finger' },
    { id: f('pip_flex'), label: 'Active PIP flexion', kind: 'number', unit: 'degrees', min: 0, max: 130 },
    { id: f('dip_flex'), label: 'Active DIP flexion', kind: 'number', unit: 'degrees', min: 0, max: 100 },
    { id: f('pip_lag'), label: 'PIP extension deficit', kind: 'number', unit: 'degrees', min: 0, max: 120 },
    { id: f('dip_lag'), label: 'DIP extension deficit', kind: 'number', unit: 'degrees', min: 0, max: 100 },
    { id: f('mcp_lag'), label: 'MCP extension lag (extensor repairs)', kind: 'number', unit: 'degrees', min: 0, max: 90 },
    { id: f('pulp_palm'), label: 'Pulp-to-distal-palmar-crease distance', kind: 'number', unit: 'cm', min: 0, max: 10 },
    { id: f('grip_kg'), label: 'Grip strength — operated hand', kind: 'number', unit: 'kg', min: 0, max: 100 },
    { id: f('grip_other_kg'), label: 'Grip strength — other hand', kind: 'number', unit: 'kg', min: 0, max: 100 },
    {
      id: f('deformity'), label: 'Deformity', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'pip_contracture', label: 'PIP flexion contracture' },
        { value: 'swan_neck', label: 'Swan-neck' },
        { value: 'boutonniere', label: 'Boutonnière' },
        { value: 'quadriga', label: 'Quadriga (other fingers cannot flex fully)' },
        { value: 'lumbrical_plus', label: 'Lumbrical-plus (paradoxical PIP extension)' },
        { value: 'bowstringing', label: 'Bowstringing' },
      ],
    },
    {
      id: f('splint_stage'), label: 'Stage of rehabilitation', kind: 'select',
      options: [
        { value: 'protected', label: 'Protected motion in the splint' },
        { value: 'weaning', label: 'Splint weaned, light functional use' },
        { value: 'strengthening', label: 'Strengthening / loading' },
        { value: 'discharged', label: 'Discharged from therapy' },
      ],
    },
    {
      id: f('therapy_adherence'), label: 'Therapy attendance and home exercises', kind: 'select',
      options: [
        { value: 'good', label: 'Attends and exercises' },
        { value: 'poor', label: 'Missed sessions / not exercising', flag: 'amber', flagReason: 'Poor therapy adherence: adhesions and stiffness — find the barrier (cost, distance, pain, understanding).' },
      ],
    },
    { id: f('tenolysis_considered'), label: 'Tenolysis or secondary surgery being considered', kind: 'boolean' },
  ],
};

// ── Score: Strickland ───────────────────────────────────────────────────────

/** Strickland & Glogovac (1980): [(PIP + DIP active flexion) − extension deficit] / 175 × 100. */
export const stricklandScore: ScoreRule = ({ phase, answers: a }) => {
  if (phase !== 'follow_up') return null;
  if (!isOneOf(a, f('type'), 'flexor', 'both')) return null;
  const pip = numOf(a, f('pip_flex')), dip = numOf(a, f('dip_flex'));
  if (pip == null && dip == null) return null;
  const lag = (numOf(a, f('pip_lag')) ?? 0) + (numOf(a, f('dip_lag')) ?? 0);
  const incomplete = [pip == null ? 'Active PIP flexion' : null, dip == null ? 'Active DIP flexion' : null].filter((x): x is string => !!x);
  if (incomplete.length) {
    return { id: `${ID}.strickland`, name: 'Strickland total active motion', abbreviation: 'Strickland', total: null, max: 100, lowerIsWorse: true, band: null, incomplete,
      source: 'Strickland JW, Glogovac SV. J Hand Surg Am 1980;5:537-43' };
  }
  const pct = Math.max(0, Math.round(((pip! + dip! - lag) / 175) * 100));
  const band = pct >= 85 ? { label: 'Excellent (85–100%)', level: 'none' as const }
    : pct >= 70 ? { label: 'Good (70–84%)', level: 'low' as const }
      : pct >= 50 ? { label: 'Fair (50–69%)', level: 'moderate' as const }
        : { label: 'Poor (under 50%)', level: 'high' as const };
  return {
    id: `${ID}.strickland`, name: 'Strickland total active motion', abbreviation: 'Strickland', total: pct, max: 100, lowerIsWorse: true,
    band: { ...band, interpretation: `PIP ${pip} + DIP ${dip} − extension deficit ${lag} = ${pip! + dip! - lag} of 175 degrees: ${pct}%, ${band.label.toLowerCase()}.` },
    incomplete: [],
    source: 'Strickland JW, Glogovac SV. J Hand Surg Am 1980;5:537-43 (original Strickland classification)',
    flag: pct < 50 && (numOf(a, f('weeks_post')) ?? 0) >= 12 ? { level: 'amber', reason: `Strickland ${pct}% (poor) at 12 weeks or later: adhesions or rupture — examine, intensify therapy, consider tenolysis once soft tissues are supple and progress has plateaued.` } : undefined,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => ({
  problem: {
    goals: [
      L('An intact repair that glides: full active flexion and extension without rupture', 'Purpose of tendon repair (BSSH)'),
      L('A functional hand for the patient\'s work and daily life, with no joint contracture', `Return to function${isOneOf(ctx.answers, 'core.hand_dominance', 'right', 'left') ? ' (dominant hand recorded)' : ''}`),
      L('Healed wound with no infection', 'Infection around a repair causes adhesion and rupture'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const assoc = chosen(a, f('nv_injury'));
  const parts: PlanContribution[] = [];
  if (assoc.includes('devascularised')) {
    parts.push({ problem: { treatment: [L('Emergency theatre: explore and repair the digital arteries (vein graft if needed) before or with the tendon repair', 'Devascularised digit', 'urgent')] } });
  }
  if (isOneOf(a, f('mechanism'), 'bite')) {
    parts.push({ problem: { treatment: [L('Formal exploration and washout in theatre; co-amoxiclav (or the local alternative in penicillin allergy); leave the skin open; repair the tendon once clean', `Bite${isOneOf(a, f('extensor_zone'), 'V') ? ' — zone V fight bite' : ''} (BSSH; IDSA 2014 SSTI)`, 'urgent')] } });
  }
  if (isOneOf(a, f('contamination'), 'contaminated')) {
    parts.push({ problem: { treatment: [L('Debride and wash out; antibiotics; delay the tendon repair (days) if the wound cannot be made clean', 'Contaminated wound', 'urgent')] } });
  }
  if (assoc.includes('digital_nerve')) {
    parts.push({ problem: { treatment: [L('Repair the digital nerve(s) under magnification at the same operation', 'Associated digital nerve injury (BSSH)')] } });
  }
  if (assoc.includes('skin_loss')) {
    parts.push({ problem: { treatment: [L('Plan vascularised cover over the repair (cross-finger, homodigital or regional flap)', 'Skin loss over the tendon')] } });
  }
  if (assoc.includes('fracture') || isOneOf(a, f('xray'), 'fracture')) {
    parts.push({ problem: { treatment: [L('Fix the fracture stably enough to allow early motion of the tendon repair', 'Associated fracture (BSSH)')] } });
  }
  if (!a[f('xray')] || isOneOf(a, f('xray'), 'not_done')) {
    parts.push({ problem: { investigations: [L('X-ray of the hand (fracture, avulsion fragment, glass)', 'Penetrating or closed tendon injury — X-ray not yet done')] } });
  }
  if (isOneOf(a, f('xray'), 'foreign_body')) {
    parts.push({ problem: { treatment: [L('Remove the foreign body at exploration', 'Foreign body on X-ray')] } });
  }
  if (isOneOf(a, f('hours_since'), 'over_3w')) {
    parts.push({ problem: { treatment: [L('Prepare for tendon graft (palmaris longus, plantaris) or two-stage reconstruction with a silicone rod; consent for both', 'Over 3 weeks since injury — direct repair often impossible')] } });
  } else if (isOneOf(a, f('hours_since'), 'under_24h', '1_7d')) {
    parts.push({ problem: { treatment: [L('Primary repair as soon as a hand surgeon, theatre and therapy can be co-ordinated (ideally within the first week)', 'Primary repair window (BSSH)')] } });
  }
  if (isOneOf(a, f('flexor_zone'), 'II')) {
    parts.push({ general: [G('Anaesthesia and theatre', L('Consider wide-awake local anaesthesia, no tourniquet (WALANT): the patient moves the finger during surgery to test the repair for gapping and catching, and sees what the therapy will ask of them', 'Zone II flexor repair (Lalonde; Saint John protocol)'))] });
  }
  if (isOneOf(a, f('therapy_access'), 'none', 'physio')) {
    parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Arrange the therapist before surgery; if no hand therapist, the surgeon teaches the protocol, gives it in writing (and a short video on the patient\'s phone) and reviews weekly', `Hand therapy: ${String(a[f('therapy_access')]).replace('_', ' ')}`))] });
  }
  if (isOneOf(a, f('can_follow_protocol'), 'doubtful') || (ctx.patient.ageYears != null && ctx.patient.ageYears < 10)) {
    parts.push({ problem: { treatment: [L('Choose the protocol for this patient: children under about 10 years and unreliable patients usually do best with 3–4 weeks of immobilisation in a protective cast', ctx.patient.ageYears != null && ctx.patient.ageYears < 10 ? `Age ${ctx.patient.ageYears} years` : 'Doubtful adherence to a protected-motion protocol')] } });
  }
  parts.push({ counselling: [
    P('Tendon repair', 'The repaired tendon is weakest between about 1 and 3 weeks; the splint and the exercises protect it and stop it sticking. No gripping, lifting or carrying with the hand until the therapist allows (usually about 12 weeks).', 'Tendon healing and rehabilitation (BSSH)'),
    P('Time off work', 'Light use from about 6 weeks, heavy manual work from about 12 weeks — longer for farmers, artisans and labourers.', 'Return to work after tendon repair'),
  ] });
  return merge(...parts);
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const comp = chosen(a, f('complication'));
  return merge(
    comp.includes('rupture') && { problem: { treatment: [L('Urgent re-exploration and re-repair', 'Suspected repair rupture — re-repair within days gives better results', 'urgent')] } },
    comp.includes('infection') && { problem: { treatment: [L('Washout in theatre, IV antibiotics; keep moving the repair once infection is controlled', 'Infection around the tendon repair', 'urgent')] } },
    comp.includes('splint_off') && { problem: { treatment: [L('Re-make the splint; check the position; re-teach the protocol with teach-back', 'Splint not worn')] } },
    comp.includes('swelling') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Oedema control: elevation above the heart, light compression (e.g. finger sleeve) once the wound allows, active movement within the protocol', 'Marked swelling stiffens the repair'))] },
    comp.includes('stiffness') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Increase therapy contact; check exercises are done hourly; add place-and-hold within the protocol', 'Not reaching protocol targets'))] },
    comp.includes('crps_signs') && { problem: { treatment: [L('Assess against the Budapest criteria; graded therapy, desensitisation, adequate analgesia; pain team if confirmed', 'Possible CRPS (Budapest criteria; RCP CRPS guideline 2018)')] } },
    !isYes(a, f('therapy_started')) && { general: [G('Rehabilitation (physiotherapy / OT)', L('First hand-therapy session within the first week after repair: make the splint and start the named protocol', 'Therapy not yet started — protocols start in the first days (BSSH)', 'urgent'))] },
    isOneOf(a, f('core_strands'), '2') && isOneOf(a, f('protocol'), 'early_active') && { cautions: ['Early active motion after a 2-strand core repair: the repair may not be strong enough — confirm the protocol with the operating surgeon.'] },
    { dischargeCriteria: [
      'Splint fitted and comfortable; patient can put it back on correctly',
      'Protocol taught with teach-back and given in writing',
      'Hand-therapy appointment booked within the first week',
      'Patient knows the signs of rupture and infection and who to call',
    ] },
  );
};

const followUpRule: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const s = ctx.scores[`${ID}.strickland`];
  const weeks = numOf(a, f('weeks_post'));
  const grip = numOf(a, f('grip_kg')), gripOther = numOf(a, f('grip_other_kg'));
  const deform = chosen(a, f('deformity'));
  return merge(
    s?.total != null && s.total < 70 && { problem: { treatment: [L(
      weeks != null && weeks >= 12
        ? 'Examine for adhesions vs rupture (active vs passive range); continue therapy; consider tenolysis once the scar is supple, passive range is full and progress has plateaued (usually after at least 3 months)'
        : 'Intensify therapy within the protocol and re-measure at the next visit',
      `Strickland ${s.total}% (${s.band?.label})`)] } },
    deform.some(d => ['swan_neck', 'boutonniere', 'pip_contracture'].includes(d)) && { problem: { treatment: [L('Splinting for the deformity (PIP extension or figure-of-eight splint); surgical correction only after therapy has plateaued', `Deformity: ${deform.join(', ').replace(/_/g, ' ')}`)] } },
    deform.includes('quadriga') && { problem: { treatment: [L('Quadriga: check for an over-tightened FDP repair or adhesion of a common muscle belly; release if it persists', 'Quadriga effect')] } },
    grip != null && gripOther != null && gripOther > 0 && { problem: { monitoring: [L(`Grip ${grip} kg vs ${gripOther} kg on the other hand (${Math.round((grip / gripOther) * 100)}%); re-measure until it plateaus`, 'Grip strength tracks return to work')] } },
    weeks != null && weeks >= 6 && weeks < 12 && { general: [G('Rehabilitation (physiotherapy / OT)', L('Wean the splint; light functional use; no heavy gripping or lifting until about 12 weeks', `${weeks} weeks after repair (BSSH)`))] },
    weeks != null && weeks >= 12 && { general: [G('Rehabilitation (physiotherapy / OT)', L('Progressive strengthening and graded return to manual work', `${weeks} weeks after repair`))] },
    isOneOf(a, f('therapy_adherence'), 'poor') && { counselling: [P('Therapy', 'The exercises decide how well the finger will move; missed weeks now usually cannot be made up later.', 'Poor therapy adherence')] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const tendonRepair: ProcedureModule = {
  id: ID,
  name: 'Tendon repair (flexor / extensor)',
  summary: 'Flexor (zones I–V) and extensor (zones I–IX) tendon repair: mechanism, timing, associated injuries, named rehabilitation protocol, Strickland range and return to work.',
  group: 'hand',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Tendon injury',
  basis: [
    'British Society for Surgery of the Hand (BSSH): Standards of care in hand trauma; BSSH evidence for flexor tendon injury',
    'Verdan C (1960) and Kleinert HE, Verdan C (1983) zone classifications',
    'Higgins A, Lalonde DH. Flexor tendon repair postoperative rehabilitation: the Saint John protocol. Plast Reconstr Surg Glob Open 2016',
    'Kleinert HE et al. 1967 (controlled passive flexion); Duran RJ, Houser RG 1975 (controlled passive motion)',
    'Strickland JW, Glogovac SV. J Hand Surg Am 1980;5:537-43',
    'Budapest criteria for CRPS (Harden 2010); RCP CRPS guideline 2018',
  ],
  catalog: {
    feeIds: ['hand-001', 'hand-002'],
    educationId: null,
    educationNote: 'No tendon-repair record in src/data/patientEducation.ts (HAND-001 is carpal tunnel release); the procedure risks are listed in this ConsentSpec.',
    patientEducationIds: ['hand-surgery', 'reconstructive-hand-surgery'],
  },
  sections: {
    pre_op: [INJURY, ASSESS],
    post_op: [INJURY, REPAIR],
    follow_up: [INJURY, OUTCOME],
  },
  carryForward: [f('type'), f('digits'), f('flexor_zone'), f('extensor_zone'), f('mechanism')],
  scores: [stricklandScore],
  planRules: [goals, preOp, tetanusRule(f), postOp, followUpRule],
  consent: {
    procedureName: 'Exploration and repair of tendon(s) of the hand / forearm',
    phases: ['pre_op'],
    intendedBenefits: [
      'Restore the ability to bend or straighten the finger, thumb or wrist',
      'Repair any injured nerve or artery found at the same time',
      'Clean the wound to prevent infection',
    ],
    risks: [
      { name: 'Rupture of the repair', description: 'The repair can break, usually in the first weeks, often with a sudden loss of movement; it then needs another operation', frequency: 'Around 4–6% after zone II flexor repair (systematic reviews)' },
      { name: 'Adhesions and stiffness', description: 'The tendon can stick to scar so the finger does not bend or straighten fully; therapy, and sometimes a second operation (tenolysis), are needed' },
      { name: 'Joint contracture', description: 'The finger may not straighten fully (especially the middle joint)' },
      { name: 'Infection', description: 'Wound infection; deep infection can damage the repair' },
      { name: 'Nerve injury or numbness', description: 'Numbness from the injury itself or from surgery; scar tenderness' },
      { name: 'CRPS', description: 'Complex regional pain syndrome: a rare, disproportionate pain with swelling, colour and temperature change' },
      { name: 'Weak grip', description: 'Grip may stay weaker than the other hand' },
    ],
    alternatives: [
      'No repair, accepting loss of movement (for some isolated injuries — e.g. FDS alone, or a single FDP in an elderly or low-demand hand — with a later fusion or tenodesis option)',
      'Splintage alone (closed mallet injury)',
      'Delayed tendon graft or two-stage reconstruction',
    ],
    riskOfNotTreating: 'A divided tendon does not heal by itself: the finger will not bend or straighten; the cut ends retract within weeks so that a later repair needs a graft or two operations, with a poorer result.',
    anaesthesiaOptions: ['local', 'regional', 'general'],
    additionalProcedures: [
      'Repair of digital nerves or arteries',
      'Tendon graft (e.g. palmaris longus) if the ends cannot be brought together',
      'Fixation of an associated fracture',
      'Local flap to cover the repair',
    ],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: false,
    counsellingTopics: [
      'The splint must be worn at all times until the therapist says otherwise',
      'The exercises are part of the treatment — how often and for how long',
      'No gripping, lifting or carrying until about 12 weeks',
      'Signs of rupture: a sudden snap or loss of movement — come back the same day',
      'Time off work and driving',
    ],
    modifiers: [
      { id: 'tr_zone2', when: c => isOneOf(c.answers, f('flexor_zone'), 'II'),
        text: 'Because the tendon was cut inside the finger tunnel (zone II), stiffness from adhesions and rupture are more likely than for injuries elsewhere.',
        why: 'Flexor zone II' },
      { id: 'tr_delay', when: c => isOneOf(c.answers, f('hours_since'), '1_3w', 'over_3w'),
        text: 'Because some time has passed since the injury, the tendon ends may have pulled back; a tendon graft or a two-stage operation may be needed, and the final movement is often less good.',
        why: 'Delayed presentation' },
      { id: 'tr_crush', when: c => isOneOf(c.answers, f('mechanism'), 'crush', 'machete', 'gunshot', 'bite'),
        text: 'Crush, machine, bite or blast injuries damage more tissue around the tendon, so infection, stiffness and a poorer range of movement are more likely.',
        why: 'High-energy or contaminated mechanism' },
      { id: 'tr_nv', when: c => hasAny(c.answers, f('nv_injury'), 'digital_nerve', 'digital_artery', 'devascularised'),
        text: 'Because the nerve or blood vessel of the finger is also injured, numbness may persist and cold sensitivity is common.',
        why: 'Associated neurovascular injury' },
      { id: 'tr_therapy', when: c => isOneOf(c.answers, f('therapy_access'), 'none'),
        text: 'Without regular hand therapy nearby, stiffness is more likely; you will be taught a home programme and reviewed often.',
        why: 'No hand therapy within reach' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Within the first week after surgery', purpose: 'Hand therapy: splint and start of the protocol' }],
    post_op: [
      { when: 'Days 3–5', purpose: 'Hand therapy: splint, wound, start the protocol' },
      { when: 'Day 10–14', purpose: 'Wound check, suture removal' },
      { when: 'Weekly to 6 weeks', purpose: 'Therapy progression within the protocol' },
    ],
    follow_up: [
      { when: '6 weeks', purpose: 'Splint weaning, active range' },
      { when: '12 weeks', purpose: 'Strickland score, grip, strengthening and return to work' },
      { when: '6 months', purpose: 'Final range; decision on tenolysis or reconstruction' },
    ],
  },
  handoffs: [
    { label: 'Patient education (hand surgery)', route: '/patient-education', when: 'Written protocol and leaflets' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate including therapy' },
  ],
};
