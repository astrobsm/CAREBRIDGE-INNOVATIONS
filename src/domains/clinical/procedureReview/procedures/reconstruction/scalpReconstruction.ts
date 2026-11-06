/**
 * Scalp reconstruction after tumour excision, trauma, burn or radiation
 * injury: direct closure, local rotation / transposition flaps, skin graft on
 * pericranium, outer-table burring with graft or dermal template, tissue
 * expansion, and free flaps.
 *
 * The RECONSTRUCTIVE decisions live here: which layers are missing (a graft
 * needs pericranium; bare calvarium needs burring, a template or a flap),
 * defect size against scalp laxity, hair-bearing and hairline, previous or
 * planned radiotherapy, calvarial / dural involvement. The ONCOLOGICAL ones —
 * diagnosis, margins, staging, adjuvant treatment — belong to the oncology
 * review for the tumour; this module only asks whether the margins are known
 * to be clear before an irreversible reconstruction, and hands off to the
 * tumour board.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule } from '../../types';
import { hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { FLAP_MONITORING_BASIS, flapCompromise, flapObservationFields, flapStateLines } from './flapShared';

const ID = 'scalp_reconstruction';
const f = (id: string) => `${ID}.${id}`;

const LEEDY_2005 = 'Leedy JE, Janis JE, Rohrich RJ. Reconstruction of acquired scalp defects: an algorithmic approach. Plast Reconstr Surg 2005;116:54e-72e';
const NEWMAN_2004 = 'Newman MI, Hanasono MM, Disa JJ, Cordeiro PG, Mehrara BJ. Scalp reconstruction: a 15-year experience. Ann Plast Surg 2004;52:501-6';

// ── Fields carried forward ──────────────────────────────────────────────────

const CAUSE: EncounterField = {
  id: f('cause'), label: 'Cause of the defect', kind: 'select', important: true,
  options: [
    { value: 'tumour', label: 'Tumour excision (BCC, SCC, melanoma, DFSP, other)' },
    { value: 'trauma', label: 'Trauma / avulsion' },
    { value: 'burn', label: 'Burn (including electrical)' },
    { value: 'radiation', label: 'Radiation injury / osteoradionecrosis' },
    { value: 'chronic_wound', label: 'Chronic wound / infection' },
  ],
};
const LOCATION: EncounterField = {
  id: f('location'), label: 'Location', kind: 'select', important: true,
  options: [
    { value: 'frontal', label: 'Frontal / anterior hairline' },
    { value: 'temporal', label: 'Temporal' },
    { value: 'parietal', label: 'Parietal' },
    { value: 'vertex', label: 'Vertex' },
    { value: 'occipital', label: 'Occipital' },
  ],
};
const SIZE: EncounterField = { id: f('defect_cm'), label: 'Defect — largest dimension', kind: 'number', unit: 'cm', min: 0, max: 40, important: true };
const AREA: EncounterField = { id: f('defect_area'), label: 'Defect area', kind: 'number', unit: 'cm2', min: 0, max: 1000 };
const DEPTH: EncounterField = {
  id: f('depth'), label: 'Deepest layer missing', kind: 'select', important: true,
  options: [
    { value: 'skin', label: 'Skin / subcutaneous tissue (galea intact)' },
    { value: 'galea', label: 'Galea — pericranium intact' },
    { value: 'pericranium', label: 'Pericranium — bare calvarium', flag: 'amber', flagReason: 'Bare calvarium will not take a graft: burr the outer table to bleeding diploë (graft / template) or use a flap.' },
    { value: 'outer_table', label: 'Outer table removed / involved' },
    { value: 'full_calvarium', label: 'Full-thickness calvarium', flag: 'red', flagReason: 'Full-thickness calvarial defect: neurosurgical input, cranioplasty planning and vascularised (often free-flap) cover.' },
    { value: 'dura', label: 'Dura exposed or resected', flag: 'red', flagReason: 'Exposed or resected dura needs watertight repair and vascularised flap cover with neurosurgery.' },
  ],
};
const HAIR: EncounterField = { id: f('hair_bearing'), label: 'Hair-bearing scalp', kind: 'boolean' };
const RECON: EncounterField = {
  id: f('reconstruction'), label: 'Reconstruction (planned or performed)', kind: 'select', important: true,
  options: [
    { value: 'direct', label: 'Direct closure (with galeal scoring)' },
    { value: 'local_flap', label: 'Local rotation / transposition / advancement flap(s)' },
    { value: 'graft_pericranium', label: 'Skin graft on pericranium' },
    { value: 'burr_graft', label: 'Outer-table burring + graft or dermal template' },
    { value: 'secondary', label: 'Healing by secondary intention' },
    { value: 'expansion', label: 'Tissue expansion (staged)' },
    { value: 'free_flap', label: 'Free flap (use the free-flap review for flap monitoring detail)' },
  ],
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The scalp defect',
  intent: 'Size, layers and site decide the rung of the ladder; recorded once and carried forward.',
  fields: [CAUSE, LOCATION, SIZE, AREA, DEPTH, HAIR, RECON],
};

const isFlap = (a: Record<string, unknown>) => ['local_flap', 'expansion', 'free_flap'].includes(String(a[f('reconstruction')]));
const isGraft = (a: Record<string, unknown>) => ['graft_pericranium', 'burr_graft'].includes(String(a[f('reconstruction')]));

// ── Pre-operative ───────────────────────────────────────────────────────────

const PLANNING: EncounterSection = {
  id: f('planning'),
  title: 'Reconstructive planning',
  intent: 'Margins known before an irreversible flap; bone and dura; radiotherapy; hair and hairline; feasibility of staged expansion.',
  fields: [
    {
      id: f('margins'), label: 'Tumour margins before reconstruction', kind: 'select',
      showWhen: { field: f('cause'), equals: ['tumour'] },
      help: 'Margin planning and histology are recorded in the oncology review; this asks only whether the reconstruction can be definitive.',
      options: [
        { value: 'clear', label: 'Clear on histology (staged / delayed) or frozen section / Mohs' },
        { value: 'same_stage_low_risk', label: 'Same-stage reconstruction — low-risk tumour, margins expected clear' },
        { value: 'unknown', label: 'Not known at the time of reconstruction', flag: 'amber', flagReason: 'Margins unknown: avoid rearranging scalp with a flap that would hide residual tumour — temporary cover (graft / template / dressing) until clear margins are confirmed.' },
      ],
    },
    {
      id: f('bone_imaging'), label: 'Calvarial / dural imaging', kind: 'select', important: true,
      options: [
        { value: 'not_needed', label: 'Not needed (mobile lesion, no bone signs)' },
        { value: 'needed', label: 'Needed, not done (fixed lesion, recurrent / large tumour, radiation injury)', flag: 'amber', flagReason: 'CT for calvarial erosion and MRI for dural or perineural spread before surgery.' },
        { value: 'no_bone', label: 'Done — no bone involvement' },
        { value: 'bone', label: 'Done — bone or dura involved', flag: 'red', flagReason: 'Calvarial or dural involvement: neurosurgery, craniectomy and cranioplasty planning, and vascularised cover.' },
      ],
    },
    {
      id: f('previous_rt'), label: 'Radiotherapy', kind: 'select',
      help: 'Previous radiotherapy to the site is asked in the core; this records what is PLANNED.',
      options: [
        { value: 'none', label: 'None planned' },
        { value: 'planned', label: 'Adjuvant radiotherapy planned', flag: 'amber', flagReason: 'Radiotherapy planned: grafts on calvarium and thin flaps break down under it — prefer durable vascularised cover.' },
        { value: 'possible', label: 'Possible, depending on histology' },
      ],
    },
    {
      id: f('laxity'), label: 'Scalp laxity (pinch test)', kind: 'select',
      options: [{ value: 'lax', label: 'Lax' }, { value: 'average', label: 'Average' }, { value: 'tight', label: 'Tight / scarred / irradiated' }],
    },
    {
      id: f('previous_scalp_surgery'), label: 'Previous scalp incisions or flaps (may have divided the vessels a flap needs)', kind: 'boolean',
    },
    {
      id: f('hair_priority'), label: 'Patient\'s priority for hair and hairline', kind: 'select',
      visibleWhen: a => a[f('hair_bearing')] === true,
      options: [
        { value: 'high', label: 'High — wants hair-bearing cover / hairline preserved' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'low', label: 'Low — covers with a cap / wig, or bald' },
      ],
    },
    {
      id: f('expansion_feasible'), label: 'Staged tissue expansion feasible (weekly inflation visits for 6–12 weeks, cost)', kind: 'select',
      showWhen: { field: f('reconstruction'), equals: ['expansion'] },
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'doubtful', label: 'Doubtful (distance, cost, adherence)', flag: 'amber', flagReason: 'Tissue expansion needs frequent visits and carries exposure / infection risk: confirm the patient can attend, or choose another option.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const POST: EncounterSection = {
  id: f('post'),
  title: 'Scalp flap, graft or expander',
  fields: [
    ...flapObservationFields(ID, { visibleWhen: isFlap }),
    {
      id: f('graft_state'), label: 'Graft / template on the scalp', kind: 'select',
      visibleWhen: isGraft,
      options: [
        { value: 'adherent', label: 'Adherent' },
        { value: 'partial', label: 'Partial loss', flag: 'amber', flagReason: 'Partial graft loss on the scalp: dress moist; regraft once granulating.' },
        { value: 'lost_bone', label: 'Lost — calvarium exposed', flag: 'red', flagReason: 'Bare calvarium is exposed: keep it moist (never let it dry), then burr and graft / template or flap.' },
      ],
    },
    {
      id: f('bone_exposed'), label: 'Calvarium visible and drying', kind: 'boolean',
      flagWhenTrue: { level: 'red', reason: 'Desiccated calvarium dies: keep exposed bone moist and plan cover.' },
    },
    {
      id: f('expander_state'), label: 'Tissue expander', kind: 'select',
      showWhen: { field: f('reconstruction'), equals: ['expansion'] },
      options: [
        { value: 'healing', label: 'Insertion wound healing' },
        { value: 'inflating', label: 'Inflating as planned' },
        { value: 'blanching', label: 'Skin blanching / pain during inflation', flag: 'amber', flagReason: 'Blanching or pain at inflation: remove some volume until the skin pinks up; inflate less next time.' },
        { value: 'thin_skin', label: 'Thinning skin / impending exposure', flag: 'amber', flagReason: 'Thin skin over the expander: pause inflation; protect from pressure.' },
        { value: 'exposed_infected', label: 'Exposed or infected', flag: 'red', flagReason: 'Exposed or infected expander: antibiotics and early surgical review — it may have to be removed or advanced early.' },
      ],
    },
    { id: f('inflated_ml'), label: 'Total volume inflated so far', kind: 'number', unit: 'mL', min: 0, max: 3000, showWhen: { field: f('reconstruction'), equals: ['expansion'] } },
    {
      id: f('final_histology'), label: 'Final histology margins', kind: 'select',
      showWhen: { field: f('cause'), equals: ['tumour'] },
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'clear', label: 'Clear' },
        { value: 'involved', label: 'Involved or close', flag: 'red', flagReason: 'Involved / close margins: tumour board for re-excision or adjuvant treatment before any further reconstruction.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const FU: EncounterSection = {
  id: f('fu'),
  title: 'Healed scalp, hair and contour',
  fields: [
    {
      id: f('healed'), label: 'Reconstruction', kind: 'select', important: true,
      options: [
        { value: 'stable', label: 'Healed and stable' },
        { value: 'unstable_graft', label: 'Unstable / ulcerating graft over bone', flag: 'amber', flagReason: 'Unstable graft over bone: consider replacing with a flap (local, expanded or free).' },
        { value: 'suspicious', label: 'New lump, ulcer or nodule at or near the scar', flag: 'red', flagReason: 'Possible recurrence: biopsy and tumour-board review.' },
      ],
    },
    {
      id: f('alopecia'), label: 'Scar alopecia', kind: 'select',
      options: [
        { value: 'none', label: 'None / acceptable' },
        { value: 'scar_widened', label: 'Widened scar alopecia' },
        { value: 'patch', label: 'Hairless patch (graft / secondary healing)' },
      ],
    },
    {
      id: f('hairline'), label: 'Hairline / sideburn', kind: 'select',
      options: [{ value: 'preserved', label: 'Preserved' }, { value: 'distorted', label: 'Distorted' }, { value: 'not_relevant', label: 'Not relevant' }],
    },
    {
      id: f('contour_defect'), label: 'Contour defect over a calvarial defect', kind: 'boolean',
    },
    {
      id: f('rt_fu'), label: 'Radiotherapy', kind: 'select',
      options: [
        { value: 'not_planned', label: 'Not planned' },
        { value: 'awaiting', label: 'Awaiting start' },
        { value: 'done', label: 'In progress / completed' },
      ],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Durable cover of the scalp defect that protects the calvarium and tolerates any planned radiotherapy', 'Purpose of scalp reconstruction'),
      L('Reconstruction that does not compromise tumour clearance or surveillance', 'Oncological safety comes first'),
      L('Hair-bearing scalp and hairline preserved where possible', 'Aesthetic priority of the scalp'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const cm = numOf(a, f('defect_cm'));
  const bareBone = isOneOf(a, f('depth'), 'pericranium', 'outer_table');
  const rtPlanned = isOneOf(a, f('previous_rt'), 'planned');
  const irradiated = isYes(a, 'core.radiotherapy_site');
  return merge(
    isOneOf(a, f('margins'), 'unknown') && { problem: { treatment: [L(
      'Stage the reconstruction: excise, give temporary cover (dressing, graft or dermal template) and reconstruct definitively once the margins are reported clear — do not rotate scalp flaps over unknown margins',
      'Margins not known at the time of reconstruction (margin planning: oncology review)', 'urgent')] } },
    isOneOf(a, f('cause'), 'tumour') && { problem: { referrals: [L('Tumour board review of diagnosis, margins and adjuvant treatment; record them in the oncology review for this tumour', 'Scalp tumour — oncology decisions are made there')] } },
    isOneOf(a, f('bone_imaging'), 'needed') && { problem: { investigations: [L('CT of the skull for calvarial erosion and MRI (with contrast) for dural / perineural spread before surgery', 'Bone imaging needed and not done')] } },
    isOneOf(a, f('bone_imaging'), 'bone') || isOneOf(a, f('depth'), 'full_calvarium', 'dura')
      ? { problem: { referrals: [L('Neurosurgery: joint planning of craniectomy, dural repair and cranioplasty (immediate or delayed), with vascularised flap cover', 'Calvarial / dural involvement or defect', 'urgent')] } }
      : null,
    bareBone && { problem: { treatment: [L(
      'Bare calvarium: a graft will not take on it directly — burr the outer table to bleeding diploë for a graft / dermal template, or use a flap (preferred if radiotherapy is planned)',
      'Pericranium absent (Leedy 2005)')] } },
    cm != null && { problem: { treatment: [L(
      cm < 3 ? 'Defect under about 3 cm: direct closure with galeal scoring or a small local flap is usually possible'
        : cm <= 10 ? 'Defect about 3–10 cm: local rotation / transposition flaps (often several), with a graft to the donor site on pericranium if needed; tissue expansion when hair-bearing cover matters'
          : 'Defect over about 10 cm: consider a free flap (latissimus, ALT) or staged expansion; large local flaps rarely suffice',
      `Defect ${cm} cm — guidance by size, to be weighed with laxity, site and radiotherapy (${LEEDY_2005.split('.')[0]} 2005)`)] } },
    (rtPlanned || irradiated) && { problem: { treatment: [L(
      'Prefer well-vascularised flap cover over a graft on bone; plan incisions within non-irradiated tissue; consider a free flap for large irradiated defects',
      `${irradiated ? 'Irradiated scalp' : 'Adjuvant radiotherapy planned'} — grafts on calvarium break down (Newman 2004)`)] } },
    isOneOf(a, f('laxity'), 'tight') && { problem: { treatment: [L('Tight scalp: plan larger flaps (rotate long arcs, multiple flaps) or pre-expansion rather than closure under tension', 'Tight / scarred / irradiated scalp')] } },
    isYes(a, f('previous_scalp_surgery')) && { problem: { investigations: [L('Map the remaining scalp vessels (superficial temporal, occipital — hand-held Doppler) before designing flaps', 'Previous scalp incisions')] } },
    isOneOf(a, f('hair_priority'), 'high') && { problem: { treatment: [L('Hair priority: prefer hair-bearing local flaps or tissue expansion; place scars along the hair direction and bevel incisions parallel to the follicles; preserve the hairline', 'Patient wants hair-bearing cover')] } },
    isOneOf(a, f('expansion_feasible'), 'doubtful') && { problem: { treatment: [L('Choose a reconstruction that does not depend on weekly inflation visits, or arrange local inflation with written instructions', 'Expansion visits doubtful')] } },
    isOneOf(a, f('reconstruction'), 'expansion') && isOneOf(a, 'core.distance', 'over_2h') && { general: [G('Social and financial support', L('Plan the expansion visits around travel: fewer, larger inflations as tolerated, or inflation at a nearer facility with photographs to the team', 'Over 2 hours from this facility'))] },
    { counselling: [
      P('Scalp reconstruction', 'Where the scars will be, whether hair will grow over the repaired area, how the head is dressed, and the chance of more than one stage.', 'Scalp reconstruction consent'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const flap = isFlap(a);
  return merge(
    flap && flapStateLines(a, ID, { free: isOneOf(a, f('reconstruction'), 'free_flap') }),
    flap && !flapCompromise(a, ID) && { problem: { monitoring: [L('Scalp flap observations (colour, refill, turgor, warmth) at the frequency set; check under the head dressing for haematoma', `Scalp flap (${FLAP_MONITORING_BASIS.split(' Current')[0]} 2015)`)] } },
    flap && { general: [G('Wound care and dressings', L('Head dressing firm but not tight; no pressure on the flap pedicle when lying — sleep on the opposite side, head up', 'Scalp flap pedicle'))] },
    (isYes(a, f('bone_exposed')) || isOneOf(a, f('graft_state'), 'lost_bone')) && { problem: { treatment: [L('Keep exposed calvarium moist (hydrogel / paraffin gauze, never dry), then burr to bleeding bone for graft or template, or plan a flap', 'Exposed calvarium', 'urgent')] } },
    isOneOf(a, f('graft_state'), 'partial') && { problem: { treatment: [L('Moist dressings to the lost area; regraft once it granulates', 'Partial loss of the scalp graft')] } },
    isOneOf(a, f('expander_state'), 'blanching') && { problem: { treatment: [L('Withdraw saline until the skin refills; smaller volumes at the next inflations', 'Blanching / pain on inflation')] } },
    isOneOf(a, f('expander_state'), 'thin_skin') && { problem: { treatment: [L('Pause inflation; protect the area from pressure (pillow, hats); review in a week', 'Thinning skin over the expander')] } },
    isOneOf(a, f('expander_state'), 'exposed_infected') && { problem: { treatment: [L('Exposed / infected expander: antibiotics and surgical review this week — remove, or advance the flap early with what has been gained', 'Exposed or infected expander', 'urgent')] } },
    isOneOf(a, f('final_histology'), 'involved') && { problem: { referrals: [L('Tumour board now: re-excision or adjuvant treatment before any definitive reconstruction', 'Involved / close margins', 'urgent')] } },
    isOneOf(a, f('final_histology'), 'pending') && { problem: { monitoring: [L('Chase the final histology and record it in the oncology review before the definitive reconstruction', 'Histology pending')] } },
    { general: [G('Patient education', L('Gentle hair washing from about 48 hours unless told otherwise; no hair dye, relaxers, braiding or tight weaves over the scars until healed', 'Scalp wound care (common local practice)'))] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('healed'), 'unstable_graft') && { problem: { treatment: [L('Replace the unstable graft with durable flap cover (local, expanded or free)', 'Unstable graft over bone')] } },
    isOneOf(a, f('healed'), 'suspicious') && { problem: { investigations: [L('Biopsy the new lesion and refer to the tumour board', 'Possible recurrence', 'urgent')] } },
    hasAny(a, f('alopecia'), 'scar_widened', 'patch') && { problem: { treatment: [L('Discuss options for alopecia: serial excision, tissue expansion, follicular unit hair transplantation, or camouflage (hair fibres, wig)', `Scar alopecia: ${String(a[f('alopecia')]).replace(/_/g, ' ')}`)] } },
    isOneOf(a, f('hairline'), 'distorted') && { problem: { treatment: [L('Offer hairline revision (local flap / expansion) once the scalp is mature and any radiotherapy is complete', 'Hairline distorted')] } },
    isYes(a, f('contour_defect')) && { problem: { referrals: [L('Neurosurgical review for cranioplasty once the soft tissue is healed and any infection treated', 'Contour defect over a calvarial defect')] } },
    isOneOf(a, f('rt_fu'), 'done') && { general: [G('Patient education', L('Irradiated scalp: protect it from the sun and trauma lifelong; report any non-healing area', 'Irradiated scalp'))] },
    { general: [G('Patient education', L('Sun protection of the scalp (hat) lifelong after a skin cancer, and monthly self-check of the scalp and scar (a mirror or a family member)', 'Scalp skin cancer surveillance'))] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const scalpReconstruction: ProcedureModule = {
  id: ID,
  name: 'Scalp reconstruction',
  summary: 'Scalp defects after tumour excision, trauma, burn or radiation: layers, bone and dura, radiotherapy, hair and hairline; direct closure, local flaps, graft on pericranium, burring, expansion or free flap.',
  group: 'reconstruction',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Scalp defect — reconstruction',
  basis: [
    LEEDY_2005,
    NEWMAN_2004,
    'BAPRAS professional standards for plastic surgery',
    FLAP_MONITORING_BASIS,
    'Tumour margins and staging: BAD / NICE guidance via the oncology review (NICE NG14 melanoma; BAD BCC / cSCC guidelines)',
  ],
  catalog: {
    feeIds: ['major-011', 'major-004', 'soft-007'],
    educationId: null,
    educationNote: 'procedureEducationDatabase has no scalp reconstruction record; the consent risks are given in this module.',
    patientEducationIds: ['recon-local-flaps', 'recon-tissue-expansion', 'recon-skin-grafting'],
  },
  // Core tetanus for a traumatic or burn defect (Green Book ch. 30).
  includeCore: { pre_op: ['tetanus'] },
  coreShowWhen: { 'core.tetanus': { field: f('cause'), equals: ['trauma', 'burn'] } },
  sections: {
    pre_op: [DETAILS, PLANNING],
    post_op: [DETAILS, POST],
    follow_up: [DETAILS, FU],
  },
  carryForward: [f('cause'), f('location'), f('defect_cm'), f('defect_area'), f('depth'), f('hair_bearing'), f('reconstruction')],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Scalp reconstruction',
    phases: ['pre_op'],
    intendedBenefits: [
      'Close the scalp wound and protect the skull',
      'Allow radiotherapy and surveillance where a tumour has been removed',
      'Keep as much hair-bearing scalp and as natural a hairline as possible',
    ],
    risks: [
      { name: 'Bald patch or wide scar', description: 'Hair may not grow over a graft or a scar may widen, leaving a bald area' },
      { name: 'Flap or graft loss', description: 'Part of a flap or graft may fail, exposing bone and needing further surgery' },
      { name: 'Haematoma', description: 'Bleeding under the scalp needing drainage' },
      { name: 'Numbness', description: 'Numbness of the scalp beyond the scar, often lasting' },
      { name: 'Hairline change', description: 'The hairline or sideburn may move' },
      { name: 'Tissue expander problems', description: 'If an expander is used: infection, exposure or leak, sometimes needing early removal' },
      { name: 'Further stages', description: 'More than one operation may be needed, especially if the margins are not clear' },
    ],
    alternatives: [
      'Dressings and healing by secondary intention (slow; a hairless, fragile scar; not possible over bare bone)',
      'A skin graft (no hair; fragile over bone; poor after radiotherapy)',
      'Local flaps, tissue expansion or a free flap',
      'A hairpiece or wig over a grafted area',
    ],
    riskOfNotTreating: 'An open scalp wound exposes the skull to drying, infection and bone death; after tumour excision it may delay radiotherapy and allow tumour to regrow unseen.',
    anaesthesiaOptions: ['general', 'local', 'sedation'],
    additionalProcedures: [
      'A skin graft to a flap donor site',
      'Burring of the outer table of the skull',
      'Insertion and later removal of a tissue expander',
      'Re-excision if margins are not clear',
      'Cranioplasty with neurosurgery',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: true,
    counsellingTopics: [
      'Whether hair will grow over the repair and where the scars will lie',
      'Staging: temporary cover until the margins are known',
      'Head dressing, hair washing and hairstyling (braids, weaves, relaxers) after surgery',
      'Tissue expansion visits, if planned',
      'Sun protection and checking the scalp for recurrence',
    ],
    modifiers: [
      { id: 'scalp_rt_planned', when: c => isOneOf(c.answers, f('previous_rt'), 'planned'),
        text: 'Radiotherapy after surgery makes a skin graft over the skull more likely to break down, so a flap may be recommended.',
        why: 'Adjuvant radiotherapy planned' },
      { id: 'scalp_bare_bone', when: c => isOneOf(c.answers, f('depth'), 'pericranium', 'outer_table', 'full_calvarium', 'dura'),
        text: 'Because the covering of the skull bone has been removed, a skin graft will not take directly and the bone may need burring, a template or a flap.',
        why: 'Bare calvarium' },
      { id: 'scalp_margins', when: c => isOneOf(c.answers, f('margins'), 'unknown'),
        text: 'Because it is not yet known whether all the tumour has been removed, the reconstruction may be done in stages.',
        why: 'Margins unknown' },
      { id: 'scalp_hair', when: c => isOneOf(c.answers, f('hair_priority'), 'high') && isOneOf(c.answers, f('reconstruction'), 'graft_pericranium', 'burr_graft', 'secondary'),
        text: 'A skin graft or a wound left to heal will be hairless; this may be revised later with expansion or hair transplantation.',
        why: 'Hair priority with hairless reconstruction' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Within 1–2 weeks of excision', purpose: 'Histology and margins before definitive reconstruction' }],
    post_op: [
      { when: 'Day 5–7', purpose: 'Graft / flap check, head dressing off' },
      { when: 'Day 10–14', purpose: 'Sutures / staples out; histology reviewed' },
      { when: 'Weekly (expansion)', purpose: 'Expander inflation until the planned volume' },
    ],
    follow_up: [
      { when: '6 weeks', purpose: 'Healing, radiotherapy timing' },
      { when: '3–6 months, then per tumour surveillance', purpose: 'Stability, alopecia, recurrence' },
    ],
  },
  handoffs: [
    { label: 'Tumour board', route: '/tumour-board', phases: ['pre_op', 'post_op', 'follow_up'], when: 'Margins, adjuvant treatment and surveillance' },
    { label: 'Skin Graft Monitor', route: '/skin-graft', phases: ['post_op'], when: 'Graft on pericranium or burred calvarium' },
    { label: 'WoundProgress Monitor', route: '/wound-monitor', phases: ['pre_op', 'post_op'], when: 'Measure and photograph the defect' },
    { label: 'Scar Monitor', route: '/scar-monitor', phases: ['follow_up'], when: 'Widened or hypertrophic scar' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate, including expanders' },
  ],
};
