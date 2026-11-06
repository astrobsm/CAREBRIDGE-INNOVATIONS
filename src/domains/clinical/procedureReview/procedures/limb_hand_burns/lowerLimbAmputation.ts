/**
 * Lower-limb amputation — minor (toe, ray, transmetatarsal, mid-/hindfoot)
 * and major (transtibial, through-knee, transfemoral) for diabetic foot
 * disease, unreconstructable ischaemia, trauma or tumour.
 *
 * Pre-operative: the indication and the decision (two consultants for a
 * mangled limb), the level that will heal (perfusion, skin, knee), the level
 * that will walk (prosthetic goal, knee contracture), the other leg,
 * analgesia that may matter later, the rehabilitation team before surgery,
 * and what Nigerian families often need to settle: what happens to the limb,
 * and whether a prosthesis can be afforded.
 *
 * Post-operative: the stump (flap viability, oedema), the knee and hip
 * position, phantom pain, the other heel, early rehabilitation, staged
 * (guillotine) amputations. Follow-up: stump maturation, shrinker,
 * prosthetic referral and the K-level, phantom pain, the other foot, mood and
 * adjustment (beyond the core PHQ / GAD screens).
 *
 * Perfusion uses the shared limb-perfusion fields and the vascular domain's
 * ABI / TBI calculators.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanContribution, PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { ACUTE_LIMB_ISCHAEMIA_REDFLAG, abiScore, perfusionFields, severeIschaemia, tbiScore } from './shared';
import { isChild } from '../../core/age';

const ID = 'lower_limb_amputation';
const f = (id: string) => `${ID}.${id}`;

const MAJOR = ['transtibial', 'through_knee', 'transfemoral'];
const isMajor = (v: unknown) => typeof v === 'string' && MAJOR.includes(v);

// ── The amputation (carried forward) ────────────────────────────────────────

const INDICATION: EncounterField = {
  id: f('indication'), label: 'Indication', kind: 'select', important: true,
  options: [
    { value: 'diabetic_sepsis', label: 'Diabetic foot infection / gangrene' },
    { value: 'clti', label: 'Chronic limb-threatening ischaemia, not reconstructable' },
    { value: 'acute_ischaemia', label: 'Irreversible acute limb ischaemia' },
    { value: 'trauma', label: 'Trauma — mangled / unsalvageable limb' },
    { value: 'tumour', label: 'Tumour' },
    { value: 'infection', label: 'Other infection (necrotising, chronic osteomyelitis)' },
    { value: 'burn_electrical', label: 'Burn / electrical injury' },
    { value: 'painful_useless', label: 'Painful, non-functional limb (elective)' },
  ],
};
const SIDE: EncounterField = {
  id: f('side'), label: 'Side', kind: 'select', important: true,
  options: [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }],
};
const LEVEL: EncounterField = {
  id: f('level'), label: 'Level', kind: 'select', important: true,
  options: [
    { value: 'toe', label: 'Toe' },
    { value: 'ray', label: 'Ray' },
    { value: 'tma', label: 'Transmetatarsal' },
    { value: 'midfoot', label: 'Lisfranc / Chopart' },
    { value: 'syme', label: 'Syme (ankle disarticulation)' },
    { value: 'transtibial', label: 'Transtibial (below knee)' },
    { value: 'through_knee', label: 'Through-knee' },
    { value: 'transfemoral', label: 'Transfemoral (above knee)' },
  ],
};
const STAGING: EncounterField = {
  id: f('staging'), label: 'Staging', kind: 'select',
  options: [
    { value: 'single', label: 'Single-stage, closed' },
    { value: 'guillotine', label: 'Open (guillotine) first for sepsis, definitive later' },
    { value: 'open_delayed', label: 'Left open for delayed closure' },
  ],
};
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The amputation',
  intent: 'Recorded once and carried forward.',
  fields: [INDICATION, SIDE, LEVEL, STAGING],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const DECISION: EncounterSection = {
  id: f('decision'),
  title: 'Decision and level selection',
  intent: 'The most distal level that will heal and that the patient can walk on.',
  fields: [
    {
      id: f('urgency'), label: 'Urgency', kind: 'select', important: true,
      options: [
        { value: 'emergency', label: 'Emergency — life-threatening sepsis or ischaemia' },
        { value: 'urgent', label: 'Urgent (days)' },
        { value: 'elective', label: 'Elective' },
      ],
    },
    {
      id: f('decision_by'), label: 'Decision', kind: 'select', important: true,
      options: [
        { value: 'mdt', label: 'Agreed by the consultant / MDT (vascular, orthopaedic, oncology as relevant)' },
        { value: 'two_consultants', label: 'Two consultants agree (mangled limb), documented with photographs' },
        { value: 'single', label: 'Single surgeon, not yet discussed', flag: 'amber',
          flagReason: 'An amputation decision should be shared: MDT for elective / vascular cases; two consultants for primary amputation of a mangled limb (BOAST Open fractures 2017).' },
      ],
    },
    {
      id: f('salvage_considered'), label: 'Limb salvage options considered', kind: 'multiselect',
      options: [
        { value: 'revascularisation', label: 'Revascularisation' },
        { value: 'reconstruction', label: 'Debridement + flap / graft reconstruction' },
        { value: 'limb_sparing', label: 'Limb-sparing tumour resection' },
        { value: 'not_possible', label: 'None possible / declined by patient' },
      ],
    },
    {
      id: f('proximal_pulses'), label: 'Femoral and popliteal pulses, affected side', kind: 'select', important: true,
      options: [
        { value: 'both', label: 'Both palpable' },
        { value: 'femoral_only', label: 'Femoral only (popliteal absent)', flag: 'amber',
          flagReason: 'No popliteal pulse: transtibial healing is less certain — check skin perfusion at the level and plan with the vascular team.' },
        { value: 'none', label: 'Neither', flag: 'amber', flagReason: 'Absent femoral pulse: inflow disease — vascular opinion before choosing the level.' },
      ],
    },
    ...perfusionFields(f),
    {
      id: f('skin_at_level'), label: 'Skin and soft tissue at the proposed level', kind: 'select', important: true,
      options: [
        { value: 'healthy', label: 'Healthy, warm, bleeds on pin-prick' },
        { value: 'infected', label: 'Cellulitis / infection at or near the level', flag: 'amber', flagReason: 'Infection at the level: stage the amputation (open first) or choose a higher level.' },
        { value: 'ischaemic', label: 'Cool, mottled or dusky', flag: 'amber', flagReason: 'Ischaemic skin at the level will not heal: reconsider the level.' },
        { value: 'scarred', label: 'Scarred, grafted or irradiated' },
      ],
    },
    {
      id: f('knee'), label: 'Knee on the side of the amputation', kind: 'select',
      options: [
        { value: 'full', label: 'Full extension' },
        { value: 'ffd', label: 'Fixed flexion deformity', flag: 'amber',
          flagReason: 'A fixed knee flexion deformity limits transtibial prosthetic fitting: weigh transtibial vs through-knee with the prosthetist and physiotherapist.' },
        { value: 'unstable', label: 'Unstable / arthritic' },
      ],
    },
    { id: f('knee_ffd_deg'), label: 'Fixed flexion (degrees)', kind: 'number', unit: 'degrees', min: 0, max: 150, showWhen: { field: f('knee'), equals: ['ffd'] } },
    {
      id: f('prosthetic_goal'), label: 'Realistic goal after amputation', kind: 'select', important: true,
      options: [
        { value: 'community_walker', label: 'Walk outdoors with a prosthesis' },
        { value: 'household_walker', label: 'Walk indoors with a prosthesis' },
        { value: 'transfers', label: 'Transfers and wheelchair' },
        { value: 'uncertain', label: 'Uncertain — needs rehabilitation assessment' },
      ],
    },
    {
      id: f('other_leg'), label: 'The other leg', kind: 'select', important: true,
      options: [
        { value: 'healthy', label: 'Healthy' },
        { value: 'pad_or_neuropathy', label: 'PAD or neuropathy', flag: 'amber', flagReason: 'The remaining leg is at risk: protect the heel in bed and screen it for life.' },
        { value: 'ulcer', label: 'Ulcer / tissue loss', flag: 'amber', flagReason: 'Tissue loss on the remaining leg: treat it now — it will bear all the weight.' },
        { value: 'amputated', label: 'Previously amputated (bilateral amputee)', flag: 'amber', flagReason: 'Second major amputation: very different rehabilitation goals — plan with the team and family.' },
      ],
    },
  ],
};

const PREPARATION: EncounterSection = {
  id: f('preparation'),
  title: 'Preparation, rehabilitation and the family',
  fields: [
    {
      id: f('rehab_seen'), label: 'Seen before surgery by', kind: 'multiselect',
      options: [
        { value: 'none', label: 'No one yet' },
        { value: 'physio', label: 'Physiotherapist' },
        { value: 'ot', label: 'Occupational therapist' },
        { value: 'prosthetist', label: 'Prosthetist / limb-fitting centre' },
        { value: 'peer', label: 'An amputee peer visitor' },
      ],
    },
    {
      id: f('analgesia_plan'), label: 'Peri-operative analgesia planned', kind: 'select',
      options: [
        { value: 'perineural', label: 'Perineural (sciatic / femoral) catheter at surgery' },
        { value: 'epidural', label: 'Epidural' },
        { value: 'single_block', label: 'Single-shot block' },
        { value: 'systemic', label: 'Systemic analgesia only' },
      ],
    },
    {
      id: f('limb_disposal'), label: 'What happens to the amputated limb', kind: 'select', important: true,
      help: 'Many families wish to bury the limb; ask before surgery, not after.',
      options: [
        { value: 'hospital', label: 'Hospital disposal (incineration)' },
        { value: 'family_burial', label: 'Released to the family for burial' },
        { value: 'histology', label: 'To histology first (tumour), then as agreed' },
        { value: 'not_discussed', label: 'Not yet discussed', flag: 'amber', flagReason: 'Ask the patient and family what they want done with the limb, and record it.' },
      ],
    },
    {
      id: f('prosthesis_access'), label: 'Access to a prosthesis', kind: 'select',
      options: [
        { value: 'affordable', label: 'Available and affordable' },
        { value: 'cost_barrier', label: 'Available but cost is a barrier', flag: 'amber', flagReason: 'Prosthesis unaffordable: social work, NHIA / charity routes, and a wheelchair plan meanwhile.' },
        { value: 'unavailable', label: 'No limb-fitting service within reach', flag: 'amber', flagReason: 'No limb-fitting service within reach: plan referral and travel, and transfers / wheelchair independence.' },
      ],
    },
    {
      id: f('home'), label: 'Home access', kind: 'select',
      options: [
        { value: 'accessible', label: 'Ground floor / accessible toilet' },
        { value: 'stairs', label: 'Stairs, pit latrine or no accessible toilet', flag: 'amber', flagReason: 'Home not accessible for a new amputee: OT home assessment and equipment (commode, rails) before discharge.' },
      ],
    },
    {
      id: f('adjustment_pre'), label: 'The patient\'s view of the amputation', kind: 'select',
      options: [
        { value: 'accepts', label: 'Understands and accepts' },
        { value: 'ambivalent', label: 'Ambivalent / grieving' },
        { value: 'refuses', label: 'Refuses or the family refuses', flag: 'amber',
          flagReason: 'Refusal of a recommended amputation: explore beliefs and fears, offer a second opinion and time where safe, and document capacity and the consequences explained.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const STUMP_POST: EncounterSection = {
  id: f('stump_post'),
  title: 'Stump, position and early rehabilitation',
  fields: [
    {
      id: f('flap'), label: 'Stump flaps', kind: 'select', important: true,
      options: [
        { value: 'healthy', label: 'Healthy, warm' },
        { value: 'dusky_edge', label: 'Dusky edge / blistering', flag: 'amber', flagReason: 'Dusky flap edge: relieve dressing pressure, check for haematoma, review daily — early ischaemia.' },
        { value: 'necrosis', label: 'Flap necrosis', flag: 'red', flagReason: 'Flap necrosis: return to theatre for debridement / revision — the level may need to rise.' },
        { value: 'open', label: 'Left open (guillotine / delayed closure)' },
      ],
    },
    {
      id: f('stump_oedema'), label: 'Stump oedema', kind: 'select',
      options: [{ value: 'controlled', label: 'Controlled' }, { value: 'marked', label: 'Marked', flag: 'amber', flagReason: 'Marked stump oedema delays healing and limb fitting: elevation, rigid dressing or compression as the wound allows.' }],
    },
    {
      id: f('position'), label: 'Joint position at rest', kind: 'select', important: true,
      options: [
        { value: 'good', label: 'Knee extended (stump board); hip extended' },
        { value: 'flexed', label: 'Knee or hip resting in flexion (pillow under the stump, long sitting)', flag: 'amber',
          flagReason: 'Resting in flexion causes contractures that prevent prosthetic walking: stump board, no pillow under the knee, prone lying for transfemoral stumps.' },
      ],
    },
    {
      id: f('phantom'), label: 'Phantom phenomena', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'sensation', label: 'Phantom sensation (non-painful)' },
        { value: 'pain', label: 'Phantom pain', flag: 'amber', flagReason: 'Phantom limb pain: neuropathic analgesia and non-drug measures early (NICE CG173).' },
      ],
    },
    {
      id: f('other_heel'), label: 'Heel of the other leg', kind: 'select', important: true,
      options: [
        { value: 'intact', label: 'Intact, protected' },
        { value: 'red', label: 'Non-blanching redness', flag: 'amber', flagReason: 'Pressure damage on the only heel: offload it completely now.' },
        { value: 'broken', label: 'Broken skin / blister', flag: 'red', flagReason: 'An ulcer on the remaining heel threatens the other leg: offload, treat and refer to the foot team.' },
      ],
    },
    {
      id: f('rehab_progress'), label: 'Rehabilitation', kind: 'multiselect',
      options: [
        { value: 'none', label: 'Not started', flag: 'amber', flagReason: 'Start physiotherapy within the first days: bed mobility, transfers, sitting balance, strength.' },
        { value: 'bed_mobility', label: 'Bed mobility' },
        { value: 'transfers', label: 'Independent transfers' },
        { value: 'wheelchair', label: 'Wheelchair with stump board' },
        { value: 'walking_aid', label: 'Hopping with a frame' },
        { value: 'early_walking_aid', label: 'Early walking aid (PPAM aid) — once the wound allows' },
      ],
    },
    { id: f('definitive_date'), label: 'Definitive stage planned for', kind: 'date', showWhen: { field: f('staging'), equals: ['guillotine', 'open_delayed'] } },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const STUMP_FU: EncounterSection = {
  id: f('stump_fu'),
  title: 'Stump, prosthesis and adjustment',
  fields: [
    {
      id: f('stump_state'), label: 'Stump', kind: 'multiselect', important: true,
      options: [
        { value: 'healed', label: 'Healed, well shaped' },
        { value: 'unhealed', label: 'Not yet healed', flag: 'amber', flagReason: 'Unhealed stump: look for infection, ischaemia or bone prominence.' },
        { value: 'bulbous', label: 'Bulbous / redundant soft tissue' },
        { value: 'bone_prominence', label: 'Bony prominence / spur' },
        { value: 'neuroma', label: 'Painful neuroma (focal tenderness, Tinel)' },
        { value: 'skin_problem', label: 'Skin problems (folliculitis, verrucous hyperplasia, socket rub)' },
        { value: 'sinus', label: 'Sinus / discharge', flag: 'amber', flagReason: 'A discharging sinus suggests osteomyelitis, a sequestrum or a suture abscess: X-ray and explore.' },
      ],
    },
    {
      id: f('shrinker'), label: 'Stump compression', kind: 'select',
      options: [
        { value: 'shrinker', label: 'Shrinker sock / compression in use' },
        { value: 'not_using', label: 'Not using' },
        { value: 'not_yet', label: 'Wound not yet healed' },
      ],
    },
    {
      id: f('prosthesis'), label: 'Prosthesis', kind: 'select', important: true,
      options: [
        { value: 'not_referred', label: 'Not yet referred', flag: 'amber', flagReason: 'Refer to the limb-fitting centre once the stump is healing — delay lets contractures and deconditioning set in.' },
        { value: 'referred', label: 'Referred / awaiting' },
        { value: 'casting', label: 'Cast / being made' },
        { value: 'fitted', label: 'Fitted, learning to walk' },
        { value: 'walking', label: 'Walking with the prosthesis' },
        { value: 'not_suitable', label: 'Not suitable — wheelchair' },
        { value: 'abandoned', label: 'Fitted but not used', flag: 'amber', flagReason: 'Prosthesis not used: socket fit, pain, skin, effort or mood — review with the prosthetist.' },
      ],
    },
    {
      id: f('k_level'), label: 'Functional level (Medicare K-level)', kind: 'select',
      options: [
        { value: 'K0', label: 'K0 — cannot walk or transfer safely with a prosthesis' },
        { value: 'K1', label: 'K1 — transfers / household walking at a fixed pace' },
        { value: 'K2', label: 'K2 — limited community walking, low barriers' },
        { value: 'K3', label: 'K3 — community walking at variable pace' },
        { value: 'K4', label: 'K4 — exceeds basic walking (high impact)' },
      ],
    },
    {
      id: f('phantom_fu'), label: 'Phantom pain now', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'occasional', label: 'Occasional, tolerable' },
        { value: 'frequent', label: 'Frequent or distressing', flag: 'amber', flagReason: 'Persistent phantom pain: optimise neuropathic analgesia; mirror therapy / graded motor imagery; pain clinic.' },
      ],
    },
    {
      id: f('other_leg_fu'), label: 'The other leg', kind: 'select', important: true,
      options: [
        { value: 'healthy', label: 'Examined — healthy' },
        { value: 'at_risk', label: 'At risk (PAD, neuropathy)' },
        { value: 'ulcer', label: 'New ulcer', flag: 'red', flagReason: 'Ulcer on the remaining leg: urgent foot-team review — contralateral limb loss is common.' },
      ],
    },
    {
      id: f('adjustment'), label: 'Adjustment to the amputation', kind: 'multiselect',
      help: 'Beyond the PHQ / GAD screens: the specific problems amputees describe.',
      options: [
        { value: 'none', label: 'Coping well' },
        { value: 'grief', label: 'Grief / loss of role' },
        { value: 'body_image', label: 'Body image / hiding the stump' },
        { value: 'stigma', label: 'Stigma or beliefs about the cause' },
        { value: 'isolation', label: 'Isolation, not going out' },
        { value: 'livelihood', label: 'Lost work or trade' },
      ],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => {
  const major = isMajor(ctx.answers[f('level')]);
  return { problem: { goals: [
    L('A healed stump at the most distal level that will heal first time', 'Each re-amputation costs function and carries its own mortality (VSGBI Quality Improvement Framework for major amputation 2016)'),
    L(major ? 'Independent mobility: prosthetic walking where realistic, otherwise safe transfers and wheelchair independence' : 'Walking in protective footwear with no new ulcer', 'Purpose of amputation is a functioning patient, not only removal of the limb'),
    L('Pain controlled, including phantom pain; the other limb protected', 'Phantom pain and contralateral limb loss are common (procedure education record)'),
  ] } };
};

const decision: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const level = a[f('level')];
  const abi = ctx.scores[`${ID}.abi`];
  const severe = severeIschaemia(a, f, abi?.total);
  const parts: PlanContribution[] = [];
  if (isOneOf(a, f('decision_by'), 'single')) {
    parts.push({ problem: { referrals: [L(isOneOf(a, f('indication'), 'trauma')
      ? 'Second consultant opinion before primary amputation of the mangled limb; document with photographs'
      : 'Discuss in the vascular / limb MDT (or with a second consultant) before listing', 'Amputation decision not yet shared (BOAST Open fractures 2017; VSGBI QIF 2016)')] } });
  }
  if (!chosen(a, f('salvage_considered')).length && isOneOf(a, f('indication'), 'clti', 'diabetic_sepsis')) {
    parts.push({ problem: { referrals: [L('Vascular opinion on revascularisation before a major amputation for ischaemia (unless sepsis makes it life-saving now)', 'Salvage options not recorded (Global Vascular Guidelines 2019)')] } });
  }
  if (isMajor(level) && (severe || isOneOf(a, f('proximal_pulses'), 'femoral_only', 'none') || isOneOf(a, f('skin_at_level'), 'ischaemic'))) {
    parts.push({ problem: { treatment: [L('Choose the level by skin perfusion and bleeding at the proposed site with the vascular team: no single test predicts healing; a transtibial level is worth attempting when the skin is warm and bleeds, but plan the patient and family for possible through-knee or transfemoral revision', `${severe ?? (isOneOf(a, f('skin_at_level'), 'ischaemic') ? 'Ischaemic skin at the level' : 'Absent popliteal / femoral pulse')} — level healing uncertain`)] } });
  }
  if (isOneOf(a, f('skin_at_level'), 'infected') || (isOneOf(a, f('urgency'), 'emergency') && isOneOf(a, f('indication'), 'diabetic_sepsis', 'infection'))) {
    parts.push({ problem: { treatment: [L('Stage it: open (guillotine) amputation through healthy tissue to control sepsis, then definitive amputation and closure once infection settles (usually within days)', 'Sepsis or infection at the level (staged amputation reduces stump infection and revision)', 'urgent')] } });
  }
  if (level === 'transtibial' && isOneOf(a, f('knee'), 'ffd')) {
    const deg = numOf(a, f('knee_ffd_deg'));
    parts.push({ problem: { treatment: [L('Decide transtibial vs through-knee with the prosthetist and physiotherapist: a fixed knee flexion deformity may prevent transtibial fitting', `Knee fixed flexion${deg != null ? ` ${deg} degrees` : ''} — clinical judgement; no single published cut-off`)] } });
  }
  if (isMajor(level) && isOneOf(a, f('prosthetic_goal'), 'transfers')) {
    parts.push({ problem: { treatment: [L('For a patient who will not walk on a prosthesis, a through-knee or transfemoral level may heal more reliably and sit better than a transtibial stump that may contract — decide with the patient and therapists', 'Non-walking goal (clinical judgement; BACPAR guidance)')] } });
  }
  if (isOneOf(a, f('indication'), 'tumour')) {
    parts.push({ problem: { referrals: [L('Sarcoma / tumour MDT: staging, margins and the level agreed before surgery; send the limb for histology', 'Amputation for tumour')] } });
  }
  if (isMajor(level)) {
    parts.push({ general: [G('Antibiotic prophylaxis and infection', L('Major amputation prophylaxis per local policy, with cover for Clostridium species (gas gangrene) in an ischaemic limb', 'Major lower-limb amputation (VSGBI QIF 2016; local antibiogram)'))] });
  }
  return merge(...parts);
};

const preparation: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const seen = chosen(a, f('rehab_seen'));
  const major = isMajor(a[f('level')]);
  return merge(
    major && seen.length === 0 && { general: [G('Rehabilitation (physiotherapy / OT)', L('Physiotherapy and occupational therapy before surgery: strength, transfers, wheelchair, home assessment; meet the prosthetist and, if possible, an amputee peer', 'Pre-operative rehabilitation input (VSGBI QIF 2016; BACPAR)'))] },
    major && !isOneOf(a, f('analgesia_plan'), 'perineural', 'epidural') && { general: [G('Analgesia', L('Ask the anaesthetist about a perineural catheter placed at surgery or an epidural: they reduce early post-operative opioid needs (they have not been shown to prevent phantom limb pain)', 'Major amputation analgesia (VSGBI QIF 2016; Bosanquet 2015 meta-analysis of perineural catheters)'))] },
    isOneOf(a, f('limb_disposal'), 'not_discussed') && { problem: { treatment: [L('Ask and record what the patient and family want done with the limb (hospital disposal or release for burial); inform theatre and the mortuary / pathology', 'Limb disposal not yet discussed')] } },
    isOneOf(a, f('limb_disposal'), 'family_burial') && { general: [G('Social and financial support', L('Arrange release of the limb to the family per hospital policy (wrapped, labelled, documented) and tell them when to collect it', 'Family to bury the limb'))] },
    isOneOf(a, f('prosthesis_access'), 'cost_barrier', 'unavailable') && { general: [G('Social and financial support', L('Plan the prosthesis now: limb-fitting centre referral, cost and funding (NHIA, charity, state programmes), and a wheelchair meanwhile', `Prosthesis ${String(a[f('prosthesis_access')]).replace('_', ' ')}`))] },
    isOneOf(a, f('home'), 'stairs') && { general: [G('Rehabilitation (physiotherapy / OT)', L('OT home assessment: commode, rails, ramp or ground-floor living before discharge', 'Home not accessible'))] },
    isOneOf(a, f('adjustment_pre'), 'refuses') && { counselling: [P('Declining amputation', 'What is likely to happen without the amputation (spreading infection, pain, death), the alternatives, and that you may change your mind; a second opinion can be arranged.', 'Patient / family refusing a recommended amputation (GMC 2020)')] },
    isOneOf(a, f('other_leg'), 'pad_or_neuropathy', 'ulcer', 'amputated') && { general: [G('Pressure care', L('Protect the remaining heel from the day of surgery (heel-offloading boot or pillow under the calf, inspection every shift)', `Other leg: ${String(a[f('other_leg')]).replace(/_/g, ' ')}`))] },
    isOneOf(a, f('other_leg'), 'ulcer') && { problem: { referrals: [L('Foot team for the ulcer on the remaining leg (diabetic foot review)', 'Tissue loss on the remaining leg', 'urgent')] } },
    { counselling: [
      P('After the amputation', 'What the stump will look like, phantom sensations (normal) and phantom pain (treatable), positioning to prevent a bent knee or hip, and how long until a prosthesis.', 'Amputation counselling (procedure education record; BACPAR)'),
      P('Feelings', 'Grief, anger and worry about work and family are common after an amputation; support is available and talking to someone who has been through it helps.', 'Psychological adjustment to amputation'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const rehab = chosen(a, f('rehab_progress'));
  return merge(
    isOneOf(a, f('flap'), 'necrosis') && { problem: { treatment: [L('Return to theatre: debride and revise; consider a higher level if the tissue does not bleed', 'Stump flap necrosis', 'urgent')] } },
    isOneOf(a, f('flap'), 'dusky_edge') && { problem: { monitoring: [L('Review the flap daily: loosen bandaging, exclude haematoma, keep warm and well hydrated', 'Dusky flap edge')] } },
    isOneOf(a, f('stump_oedema'), 'marked') && { general: [G('Wound care and dressings', L('Control stump oedema: elevate on a stump board, rigid removable dressing or careful compression once the wound allows', 'Marked stump oedema'))] },
    isOneOf(a, f('position'), 'flexed') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Prevent contracture: stump board in the wheelchair, no pillow under the knee, limit long sitting, prone lying 20–30 minutes several times a day for a transfemoral stump', 'Resting in flexion'))] },
    isOneOf(a, f('phantom'), 'pain') && { general: [G('Analgesia', isChild(ctx.patient, ctx.module)
      ? L('Phantom pain in a child: refer to the paediatric pain team for a neuropathic agent and dose by weight; mirror therapy, desensitisation and play-based distraction; continue the regional catheter if in place', 'Phantom limb pain in a child — NICE CG173 covers adults only')
      : L('Phantom pain: amitriptyline, duloxetine, gabapentin or pregabalin as first-line neuropathic agents; mirror therapy and desensitisation; continue the regional catheter if in place', 'Phantom limb pain in an adult (NICE CG173 neuropathic pain)'))] },
    isOneOf(a, f('other_heel'), 'red', 'broken') && { problem: { treatment: [L('Offload the remaining heel completely; daily inspection; treat as a pressure injury', 'Pressure damage on the remaining heel', isOneOf(a, f('other_heel'), 'broken') ? 'urgent' : 'routine')] } },
    (rehab.length === 0 || rehab.includes('none')) && { general: [G('Rehabilitation (physiotherapy / OT)', L('Physiotherapy from day 1: bed mobility, transfers, sitting balance, upper-limb and remaining-leg strength; wheelchair with a stump board', 'Rehabilitation not yet started (BACPAR)'))] },
    isOneOf(a, f('staging'), 'guillotine', 'open_delayed') && { problem: { treatment: [L('Definitive amputation and closure once sepsis is controlled and the stump is clean; book it', 'Staged (open) amputation')] } },
    { dischargeCriteria: [
      'Stump wound healing or a dressing plan in place; sutures / clips plan written',
      'Safe transfers; wheelchair and stump board supplied; home assessed',
      'Phantom pain addressed; analgesia plan written',
      'Remaining heel intact and the patient knows how to protect it',
      'Limb-fitting centre referral made',
    ] },
  );
};

const followUpRule: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const st = chosen(a, f('stump_state'));
  const adj = chosen(a, f('adjustment'));
  return merge(
    st.includes('unhealed') && { problem: { investigations: [L('Look for infection, ischaemia or a bony prominence under the wound: swab / tissue culture, X-ray, perfusion', 'Unhealed stump')] } },
    st.includes('sinus') && { problem: { investigations: [L('X-ray (osteomyelitis, sequestrum) and explore the sinus', 'Discharging stump sinus')] } },
    st.includes('neuroma') && { problem: { treatment: [L('Symptomatic neuroma: socket modification, desensitisation, ultrasound-guided injection; excision with proximal implantation (or targeted muscle reinnervation) if it persists', 'Painful stump neuroma')] } },
    (st.includes('bone_prominence') || st.includes('bulbous')) && { problem: { treatment: [L('Stump revision only if socket modification cannot accommodate it; discuss with the prosthetist', 'Stump shape problem')] } },
    isOneOf(a, f('shrinker'), 'not_using') && st.includes('healed') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Shrinker sock or stump bandaging daily to shape the stump for fitting', 'Healed stump without compression'))] },
    isOneOf(a, f('prosthesis'), 'not_referred') && { problem: { referrals: [L('Limb-fitting centre referral now', 'Not yet referred for a prosthesis')] } },
    isOneOf(a, f('phantom_fu'), 'frequent') && { problem: { referrals: [L('Pain clinic for persistent phantom pain; mirror therapy / graded motor imagery with the therapist', 'Frequent or distressing phantom pain (NICE CG173)')] } },
    isOneOf(a, f('other_leg_fu'), 'ulcer') && { problem: { referrals: [L('Same-week foot-team review for the ulcer on the remaining leg', 'Ulcer on the remaining leg', 'urgent')] } },
    { problem: { monitoring: [L('Examine the remaining foot at every visit; footwear and foot-care education; foot screening every 1–3 months while at high risk', 'Previous amputation = IWGDF risk category 3 (IWGDF 2023 prevention)')] } },
    adj.some(x => x !== 'none') && { general: [G('Psychology and wellbeing', L('Amputee peer support group, counselling for grief and body image, vocational rehabilitation for lost work or trade', `Adjustment difficulties: ${adj.join(', ').replace(/_/g, ' ')}`))] },
    hasAny(a, f('prosthesis'), 'walking', 'fitted') && { general: [G('Patient education', L('Check the stump skin every day (mirror) and stop using the prosthesis if it breaks down; return for socket review if the fit changes', 'Prosthetic user'))] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const lowerLimbAmputation: ProcedureModule = {
  id: ID,
  name: 'Lower-limb amputation (minor or major)',
  summary: 'Toe, ray, forefoot, transtibial, through-knee or transfemoral amputation: level selection, perfusion, rehabilitation and prosthesis, phantom pain and the other limb.',
  group: 'diabetic_foot',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Lower-limb amputation',
  basis: [
    'Vascular Society of Great Britain & Ireland: Quality Improvement Framework for Major Amputation Surgery (2016)',
    'BACPAR (British Association of Chartered Physiotherapists in Limb Absence Rehabilitation) clinical guidelines',
    'Global Vascular Guidelines on CLTI (2019); IWGDF 2023 (PAD, prevention)',
    'BOAST: Open fractures (BOA/BAPRAS 2017) — decision for primary amputation',
    'NICE CG173 Neuropathic pain in adults; NICE NG89 VTE',
    'Medicare Functional Classification Levels (K0–K4)',
  ],
  catalog: {
    feeIds: ['diabetic-001', 'diabetic-002', 'diabetic-003', 'diabetic-004'],
    educationId: 'LIMB-002',
    patientEducationIds: ['prosthetics-amputation'],
  },
  sections: {
    pre_op: [DETAILS, DECISION, PREPARATION],
    post_op: [DETAILS, STUMP_POST],
    follow_up: [DETAILS, STUMP_FU],
  },
  includeCore: { pre_op: ['tetanus'], post_op: ['psychology'] },
  coreShowWhen: { 'core.tetanus': { field: f('indication'), equals: ['trauma', 'burn_electrical'] } },
  carryForward: [f('indication'), f('side'), f('level'), f('staging')],
  scores: [abiScore(ID, f, a => isOneOf(a, f('indication'), 'clti', 'diabetic_sepsis')), tbiScore(ID, f)],
  planRules: [goals, decision, preparation, postOp, followUpRule],
  consent: {
    procedureName: 'Amputation of the lower limb',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove dead, infected, unsalvageable or diseased tissue that threatens health or life',
      'Relieve pain from an ischaemic or useless limb',
      'A healed stump from which to walk with a prosthesis or move independently',
    ],
    risks: [
      { name: 'Death', description: 'Major amputation is done in people who are often very unwell; the risk of dying around the time of surgery is significant, higher above the knee and in frail patients' },
      { name: 'Falls', description: 'Falls are common in the first months, especially at night (getting up to the toilet)' },
      { name: 'Hip flexion contracture', description: 'Tightening at the hip after an above-knee amputation, which interferes with walking' },
      { name: 'Prosthesis not possible', description: 'Some people cannot use a prosthesis because of other illnesses, strength, the other leg or cost' },
      { name: 'Bone spur or prominence', description: 'Bone overgrowth or a prominent bone end that may need trimming' },
      { name: 'Transfer ulcer (minor amputation)', description: 'After a toe, ray or forefoot amputation, pressure shifts and a new ulcer can form' },
    ],
    alternatives: [
      'Limb salvage: revascularisation, further debridement and reconstruction, where it is realistic',
      'A different (higher or lower) level of amputation',
      'For ischaemic pain without infection: best medical care and palliation, accepting the risk of infection and death',
      'Antibiotics and dressings only (not effective for wet gangrene or spreading sepsis)',
    ],
    riskOfNotTreating: 'Where the limb is dead, infected or unsalvageable, leaving it risks spreading infection, sepsis and death, and continued severe pain; for some patients this is a choice made with full information.',
    anaesthesiaOptions: ['spinal', 'regional', 'general', 'combined'],
    additionalProcedures: [
      'An open (staged) first operation with a second operation to close',
      'Revision to a higher level if the stump does not heal',
      'Perineural catheter or epidural for pain relief',
      'Blood transfusion',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: true,
    counsellingTopics: [
      'The level, and that the final level may be decided at surgery',
      'What will happen to the amputated limb (hospital disposal or release to the family)',
      'Phantom sensation and phantom pain',
      'Rehabilitation, the wheelchair, the prosthesis, its cost and the waiting time',
      'Protecting the other leg for life',
      'Feelings after amputation and where to find support',
    ],
    modifiers: [
      { id: 'amp_ischaemia', when: c => !!severeIschaemia(c.answers, f, c.scores[`${ID}.abi`]?.total) || isOneOf(c.answers, f('proximal_pulses'), 'femoral_only', 'none'),
        text: 'Because the circulation at this level is reduced, the stump is more likely to heal slowly or fail and need revision to a higher level.',
        why: 'Severe ischaemia / absent popliteal or femoral pulse' },
      { id: 'amp_renal', when: c => isOneOf(c.answers, 'core.renal', 'ckd_4_5', 'dialysis'),
        text: 'Kidney failure raises the risks of stump breakdown, infection and of not surviving the operation.',
        why: 'CKD 4–5 / dialysis' },
      { id: 'amp_glucose', when: c => (numOf(c.answers, 'core.hba1c') ?? 0) > 8.5 || (numOf(c.answers, 'core.glucose') ?? 0) > 12,
        text: 'High blood sugar at present increases the risk of stump infection and poor healing.',
        why: 'HbA1c above 8.5% or glucose above 12 mmol/L' },
      { id: 'amp_sepsis', when: c => isOneOf(c.answers, f('urgency'), 'emergency'),
        text: 'Because this is an emergency operation for life-threatening infection or ischaemia, the risks of complications and death are higher, and a second operation is likely.',
        why: 'Emergency amputation' },
      { id: 'amp_knee', when: c => c.answers[f('level')] === 'transtibial' && isOneOf(c.answers, f('knee'), 'ffd'),
        text: 'Because your knee does not straighten fully, fitting a below-knee prosthesis may be harder, and a higher level may be advised later.',
        why: 'Knee fixed flexion deformity' },
      { id: 'amp_other_leg', when: c => isOneOf(c.answers, f('other_leg'), 'pad_or_neuropathy', 'ulcer'),
        text: 'Your other leg also has poor circulation or nerve damage; it will carry more load and needs protecting to avoid losing it too.',
        why: 'Remaining leg at risk' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Day 3–5 after surgery', purpose: 'First stump inspection unless concerns earlier' }],
    post_op: [
      { when: 'Daily on the ward', purpose: 'Stump, position, heel, phantom pain, rehabilitation' },
      { when: '2–3 weeks', purpose: 'Remove sutures / clips once healed; shrinker; limb-fitting referral' },
    ],
    follow_up: [
      { when: '6 weeks', purpose: 'Stump maturation, casting readiness, mood' },
      { when: '3 and 6 months, then yearly', purpose: 'Prosthetic use, K-level, stump skin, the other foot' },
    ],
  },
  handoffs: [
    { label: 'Vascular assessment (ABI, toe pressures, WIfI)', route: '/vascular', phases: ['pre_op'], when: 'Level selection in an ischaemic limb' },
    { label: 'Limb salvage (diabetic foot)', route: '/limb-salvage', phases: ['pre_op', 'follow_up'], when: 'Diabetic foot — salvage options and the remaining foot' },
    { label: 'Blood transfusion', route: '/blood-transfusion', phases: ['pre_op'], when: 'Group and save / cross-match' },
    { label: 'Patient education (prosthetics after amputation)', route: '/patient-education', when: 'Leaflets for the patient and family' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate including the prosthesis' },
  ],
};
