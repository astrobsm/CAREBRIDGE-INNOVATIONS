/**
 * Local and pedicled regional flaps — random and axial local flaps
 * (advancement, rotation, transposition, interpolation), perforator-based
 * island and propeller flaps, and pedicled regional muscle / fasciocutaneous
 * flaps (gastrocnemius, soleus, reverse sural, groin, latissimus…).
 *
 * Pre-operative: is a flap the right rung (exposed bone / tendon / hardware),
 * is the pedicle or perforator there and outside the zone of injury, is the
 * skeleton stable, can the flap be kept off pressure. Post-operative: the
 * bedside flap signs (flapShared), arterial versus venous compromise, what is
 * compressing the pedicle, leeches, dangling of lower-limb flaps, the donor
 * site. Follow-up: stable cover, donor morbidity, contour, the need for
 * division (interpolation flaps) or revision.
 *
 * Free tissue transfer, pressure-sore flaps and scalp flaps have their own
 * modules in this folder.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { FLAP_MONITORING_BASIS, LEECH_BASIS, decongestionField, flapCompromise, flapObservationFields, flapStateLines } from './flapShared';

const ID = 'local_regional_flap';
const f = (id: string) => `${ID}.${id}`;

// ── Fields carried forward ──────────────────────────────────────────────────

const DESIGN: EncounterField = {
  id: f('design'), label: 'Flap', kind: 'select', important: true,
  options: [
    { value: 'advancement', label: 'Local advancement (V-Y, rectangular, keystone)' },
    { value: 'rotation', label: 'Local rotation' },
    { value: 'transposition', label: 'Local transposition (rhomboid, bilobed, Z-plasty)' },
    { value: 'interpolation', label: 'Interpolation — two-stage (forehead, nasolabial, cross-finger, groin)' },
    { value: 'propeller', label: 'Perforator island / propeller flap' },
    { value: 'pedicled_muscle', label: 'Pedicled muscle / musculocutaneous (gastrocnemius, soleus, latissimus, pectoralis)' },
    { value: 'pedicled_fc', label: 'Pedicled axial fasciocutaneous (reverse sural, distally based, radial forearm)' },
  ],
};
const NAMED: EncounterField = { id: f('named_flap'), label: 'Named flap / pedicle', kind: 'text', placeholder: 'e.g. medial gastrocnemius; reverse sural (peroneal perforators)' };
const REGION: EncounterField = {
  id: f('region'), label: 'Region', kind: 'select', important: true,
  options: [
    { value: 'face', label: 'Face' },
    { value: 'head_neck', label: 'Neck / scalp (non-scalp module cases)' },
    { value: 'trunk', label: 'Trunk' },
    { value: 'perineum', label: 'Perineum / groin' },
    { value: 'upper_limb', label: 'Upper limb' },
    { value: 'hand', label: 'Hand / fingers' },
    { value: 'knee_prox_leg', label: 'Knee / proximal third of leg' },
    { value: 'mid_leg', label: 'Middle third of leg' },
    { value: 'distal_leg', label: 'Distal third of leg / ankle / heel' },
    { value: 'foot', label: 'Foot' },
  ],
};
const DEFECT_SIZE: EncounterField = { id: f('defect_size'), label: 'Defect to be covered (largest dimension)', kind: 'number', unit: 'cm', min: 0, max: 60 };
const DEFECT_BASE: EncounterField = {
  id: f('defect_base'), label: 'What lies in the base of the defect', kind: 'multiselect', important: true,
  options: [
    { value: 'soft_tissue', label: 'Soft tissue only' },
    { value: 'bone', label: 'Bone without periosteum / open fracture' },
    { value: 'tendon', label: 'Tendon without paratenon' },
    { value: 'joint', label: 'Open joint' },
    { value: 'hardware', label: 'Plate, nail or other implant' },
    { value: 'neurovascular', label: 'Major vessel or nerve' },
  ],
};
const STAGES: EncounterField = {
  id: f('stages'), label: 'Stages', kind: 'select',
  options: [{ value: 'single', label: 'Single stage' }, { value: 'two_stage', label: 'Two-stage — pedicle division later' }],
};
const DONOR_CLOSURE: EncounterField = {
  id: f('donor_closure'), label: 'Donor site closure', kind: 'select',
  options: [
    { value: 'direct', label: 'Direct closure' },
    { value: 'graft', label: 'Skin graft' },
    { value: 'secondary', label: 'Healing by secondary intention' },
  ],
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The flap',
  intent: 'Recorded once (pre-operatively or from the operation note) and carried forward.',
  fields: [DESIGN, NAMED, REGION, DEFECT_SIZE, DEFECT_BASE, STAGES, DONOR_CLOSURE],
};

const lowerLeg = (a: Record<string, unknown>) => ['knee_prox_leg', 'mid_leg', 'distal_leg', 'foot'].includes(String(a[f('region')]));

// ── Pre-operative ───────────────────────────────────────────────────────────

const PLANNING: EncounterSection = {
  id: f('planning'),
  title: 'Flap planning',
  intent: 'Right flap, reliable pedicle outside the zone of injury, stable skeleton, and a flap that can be kept off pressure.',
  fields: [
    {
      id: f('indication'), label: 'Indication', kind: 'select', important: true,
      options: [
        { value: 'open_fracture', label: 'Open fracture / acute trauma' },
        { value: 'post_excision', label: 'After tumour / lesion excision' },
        { value: 'chronic_wound', label: 'Chronic wound / osteomyelitis after debridement' },
        { value: 'exposed_hardware', label: 'Exposed implant' },
        { value: 'burn', label: 'Burn / contracture' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: f('days_since_injury'), label: 'Days since injury', kind: 'number', unit: 'days', min: 0, max: 365,
      showWhen: { field: f('indication'), equals: ['open_fracture'] },
      numericFlags: [{ op: '>', value: 3, level: 'amber', reason: 'Open fracture: definitive soft-tissue cover should be achieved within 72 hours of injury when it is not done at the first debridement (BOAST Open Fractures 2017).' }],
    },
    {
      id: f('fracture_antibiotics'), label: 'IV antibiotics for the open fracture', kind: 'select',
      showWhen: { field: f('indication'), equals: ['open_fracture'] },
      options: [
        { value: 'within_1h', label: 'Given within 1 hour of injury, continuing' },
        { value: 'late', label: 'Given, but later than 1 hour', flag: 'amber', flagReason: 'Open-fracture antibiotics should start within 1 hour of injury (BOAST 2017).' },
        { value: 'not_given', label: 'Not given / not known', flag: 'red', flagReason: 'Open fracture without antibiotics: start IV antibiotics now (BOAST Open Fractures 2017).' },
      ],
    },
    {
      id: f('skeleton'), label: 'Skeletal stability', kind: 'select',
      showWhen: { field: f('indication'), equals: ['open_fracture', 'exposed_hardware', 'chronic_wound'] },
      options: [
        { value: 'stable_internal', label: 'Stable — internal fixation' },
        { value: 'stable_exfix', label: 'Stable — external fixator (flap access planned)' },
        { value: 'unstable', label: 'Not stabilised', flag: 'red', flagReason: 'The skeleton must be stabilised before or at definitive cover (BOAST Open Fractures 2017; orthoplastic care).' },
        { value: 'not_applicable', label: 'Not applicable' },
      ],
    },
    {
      id: f('pedicle_check'), label: 'Pedicle / perforator / source vessel', kind: 'select', important: true,
      showWhen: { field: f('design'), equals: ['propeller', 'pedicled_muscle', 'pedicled_fc', 'interpolation'] },
      options: [
        { value: 'doppler_marked', label: 'Located by hand-held Doppler and marked' },
        { value: 'cta', label: 'Confirmed on CT angiography' },
        { value: 'not_assessed', label: 'Not yet assessed', flag: 'amber', flagReason: 'Locate the perforator / pedicle (hand-held Doppler, CTA where available) before committing to this flap.' },
        { value: 'doubtful', label: 'Doubtful or absent signal / source vessel injured', flag: 'red', flagReason: 'Unreliable pedicle: choose another flap (or a free flap) — do not raise a flap on a vessel you cannot confirm.' },
      ],
    },
    {
      id: f('zone_of_injury'), label: 'Flap or pedicle lies within the zone of injury, previous surgery or radiotherapy', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Flaps raised within the zone of injury are less reliable: consider a flap from outside the zone, a delay procedure or a free flap (BOAST Open Fractures 2017).' },
    },
    {
      id: f('venous_insufficiency'), label: 'Venous insufficiency of the leg (varicosities, lipodermatosclerosis, previous DVT)', kind: 'boolean',
      visibleWhen: lowerLeg,
      flagWhenTrue: { level: 'amber', reason: 'Venous insufficiency raises the risk of congestion in distally based leg flaps (Baumeister 2003): consider a delayed flap or an alternative.' },
    },
    {
      id: f('positioning_feasible'), label: 'Can the flap and pedicle be kept free of pressure after surgery?', kind: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'doubtful', label: 'Doubtful (posterior flap, spasticity, confusion, child)', flag: 'amber', flagReason: 'If the flap cannot be kept off pressure, plan the position, a pressure-redistributing surface, a frame or external fixator suspension before surgery.' },
      ],
    },
    {
      id: f('donor_cost'), label: 'Donor-site cost discussed (scar, graft, function, sensation)', kind: 'select',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'Not yet' }],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const MONITORING: EncounterSection = {
  id: f('monitoring'),
  title: 'Flap monitoring',
  intent: 'Arterial insufficiency (pale, cool, flat, slow refill) versus venous congestion (dusky, tense, brisk refill, dark bleeding).',
  fields: [
    ...flapObservationFields(ID, { doppler: true }),
    decongestionField(ID),
    {
      id: f('partial_loss'), label: 'Flap loss', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'epidermolysis', label: 'Superficial epidermolysis / blistering only' },
        { value: 'partial', label: 'Partial (tip / edge) necrosis', flag: 'amber', flagReason: 'Partial flap necrosis: demarcate and debride; small areas heal secondarily, larger ones need a graft or another flap.' },
        { value: 'total', label: 'Total flap loss', flag: 'red', flagReason: 'Total flap loss: debride and plan alternative cover (another flap or free flap).' },
      ],
    },
    {
      id: f('dangling'), label: 'Dangling (dependency) of a lower-limb flap', kind: 'select',
      visibleWhen: lowerLeg,
      options: [
        { value: 'not_started', label: 'Not started yet (strict elevation)' },
        { value: 'tolerated', label: 'In progress, tolerated' },
        { value: 'congests', label: 'Flap congests on dangling', flag: 'amber', flagReason: 'Flap congests when dependent: go back a step in the dangling programme; bandage support as directed.' },
      ],
    },
    {
      id: f('donor_status'), label: 'Donor site', kind: 'select',
      options: [
        { value: 'healing', label: 'Healing' },
        { value: 'graft_loss', label: 'Graft on donor site not taking', flag: 'amber', flagReason: 'Donor-site graft loss: dress and regraft if it will not heal.' },
        { value: 'dehisced', label: 'Dehisced / under tension', flag: 'amber', flagReason: 'Donor-site dehiscence: assess tension and infection.' },
        { value: 'infected', label: 'Infected', flag: 'amber', flagReason: 'Donor-site infection: culture, open any collection.' },
      ],
    },
    {
      id: f('division_status'), label: 'Pedicle division (two-stage flap)', kind: 'select',
      showWhen: { field: f('stages'), equals: ['two_stage'] },
      options: [
        { value: 'not_due', label: 'Not yet due' },
        { value: 'due', label: 'Due — plan division (clamp test if in doubt)' },
        { value: 'divided', label: 'Divided' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const OUTCOME: EncounterSection = {
  id: f('outcome'),
  title: 'Flap outcome and donor site',
  fields: [
    {
      id: f('cover'), label: 'Cover', kind: 'select', important: true,
      options: [
        { value: 'stable', label: 'Healed and stable' },
        { value: 'healed_after_loss', label: 'Healed after partial loss' },
        { value: 'unstable', label: 'Unstable / breaking down', flag: 'amber', flagReason: 'Unstable flap cover: look for pressure, infection, underlying osteomyelitis or recurrence.' },
        { value: 'sinus', label: 'Sinus or discharge beneath the flap', flag: 'amber', flagReason: 'A sinus beneath a flap suggests deep infection, osteomyelitis or infected hardware: imaging and exploration.' },
      ],
    },
    {
      id: f('donor_morbidity'), label: 'Donor-site morbidity', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'scar', label: 'Scar / contour concern' },
        { value: 'weakness', label: 'Weakness (e.g. plantarflexion after gastrocnemius, shoulder after latissimus)' },
        { value: 'numbness', label: 'Numbness (e.g. lateral foot after sural nerve harvest)' },
        { value: 'pain', label: 'Persistent pain / neuroma', flag: 'amber', flagReason: 'Persistent donor pain: examine for neuroma.' },
        { value: 'unhealed', label: 'Donor site not healed', flag: 'amber', flagReason: 'Unhealed donor site: manage as a wound; regraft if needed.' },
      ],
    },
    {
      id: f('contour'), label: 'Contour', kind: 'select',
      options: [
        { value: 'acceptable', label: 'Acceptable' },
        { value: 'bulky', label: 'Bulky / dog-ear — patient wants revision' },
        { value: 'pedicle_bulk', label: 'Pedicle bulge / pin-cushioning (trapdoor)' },
      ],
    },
    {
      id: f('weight_bearing'), label: 'Weight bearing / footwear on a lower-limb flap', kind: 'select',
      visibleWhen: lowerLeg,
      options: [
        { value: 'full', label: 'Full weight bearing, normal footwear' },
        { value: 'partial', label: 'Partial / protected' },
        { value: 'breakdown', label: 'Breaks down with weight bearing or footwear', flag: 'amber', flagReason: 'Flap breaks down with load: offloading footwear / orthotics; check sensation and bony prominences.' },
      ],
    },
    { id: f('flap_sensation'), label: 'Protective sensation in the flap', kind: 'select', options: [{ value: 'yes', label: 'Present' }, { value: 'no', label: 'Absent' }] },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Durable, well-vascularised cover of the defect with complete flap survival', 'Purpose of flap reconstruction'),
      L('Protection of exposed bone, tendon, joint or implant and restoration of function', 'Exposed structures need vascularised cover'),
      L('Minimal donor-site morbidity and an acceptable contour', 'Every flap has a donor cost'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const base = chosen(a, f('defect_base'));
  const days = numOf(a, f('days_since_injury'));
  const sural = isOneOf(a, f('design'), 'pedicled_fc') && isOneOf(a, f('region'), 'distal_leg', 'foot');
  const comorbid = isOneOf(a, 'core.diabetes', 'oral', 'insulin') || isOneOf(a, 'core.pvd', 'suspected', 'confirmed') || isYes(a, f('venous_insufficiency')) || (ctx.patient.ageYears ?? 0) >= 60;
  return merge(
    base.some(b => ['bone', 'tendon', 'joint', 'hardware', 'neurovascular'].includes(b)) && { problem: { goals: [
      L('Vascularised cover of the exposed structure in one stage where possible', `Exposed: ${base.filter(b => b !== 'soft_tissue').join(', ')}`),
    ] } },
    isOneOf(a, f('indication'), 'open_fracture') && { problem: { treatment: [L(
      'Joint orthoplastic plan: debridement, skeletal stabilisation and definitive soft-tissue cover — ideally at the same sitting, otherwise cover within 72 hours of injury',
      days != null ? `Open fracture, day ${days} since injury (BOAST Open Fractures 2017)` : 'Open fracture (BOAST Open Fractures 2017)', days != null && days > 3 ? 'urgent' : 'routine')] } },
    isOneOf(a, f('indication'), 'open_fracture') && { general: [G('Antibiotic prophylaxis and infection', L(
      'Open fracture: IV antibiotics within 1 hour of injury, continued until definitive soft-tissue cover, for no longer than 72 hours (agent per local policy)',
      `Open fracture; antibiotics ${a[f('fracture_antibiotics')] ? String(a[f('fracture_antibiotics')]).replace(/_/g, ' ') : 'not recorded'} (BOAST Open Fractures 2017)`,
      isOneOf(a, f('fracture_antibiotics'), 'within_1h') ? 'routine' : 'urgent'))] },
    isOneOf(a, f('skeleton'), 'unstable') && { problem: { referrals: [L('Orthopaedic stabilisation before (or at) flap cover', 'Skeleton not stabilised (BOAST 2017)', 'urgent')] } },
    isOneOf(a, f('indication'), 'chronic_wound', 'exposed_hardware') && { problem: { investigations: [L(
      'Exclude osteomyelitis before cover: X-ray (MRI where available), and deep tissue / bone samples for culture at the debridement',
      'Chronic wound / exposed implant before flap cover')] } },
    isOneOf(a, f('pedicle_check'), 'not_assessed') && { problem: { investigations: [L('Hand-held Doppler mapping of the pedicle / perforators (CT angiography where the leg vessels are in doubt)', 'Pedicle not yet assessed')] } },
    isOneOf(a, f('pedicle_check'), 'doubtful') && { problem: { treatment: [L('Choose a flap whose pedicle can be confirmed outside the injury, or a free flap to vessels outside the zone', 'Pedicle doubtful / source vessel injured', 'urgent')] } },
    isYes(a, f('zone_of_injury')) && { problem: { treatment: [L('Design the flap outside the zone of injury where possible; consider a surgical delay or a free flap', 'Flap within the zone of injury / irradiated / previously operated tissue')] } },
    sural && comorbid && { problem: { treatment: [L(
      'Distally based (reverse sural) flap in a patient with comorbidity: consider a delay procedure, a wide adipofascial pedicle and a skin bridge, or an alternative flap',
      'Diabetes, arterial disease, venous insufficiency or age 60+ increase complications of the sural artery flap (Baumeister SP et al. PRS 2003;112:129-40)')] } },
    isOneOf(a, f('positioning_feasible'), 'doubtful') && { general: [G('Pressure care', L(
      'Plan post-operative positioning before surgery: which side the patient may lie on, pillows / frame or external-fixator suspension to keep the flap off the bed',
      'Flap may not stay free of pressure'))] },
    lowerLeg(a) && { general: [G('Rehabilitation (physiotherapy / OT)', L(
      'Lower-limb flap: strict elevation at first, then a graduated dangling programme with supportive bandaging before full mobilisation, as the operating surgeon directs',
      'Dependent oedema congests leg flaps; dangling builds tolerance (unit protocol)'))] },
    isOneOf(a, f('donor_cost'), 'no') && { counselling: [P('Donor site', 'Where the flap comes from, the scar, any graft on the donor site and any loss of strength or feeling.', 'Donor-site cost not yet discussed')] },
    { general: [G('Anaesthesia and theatre', L(
      'Keep the patient warm and well filled during and after surgery; avoid tight circumferential dressings over the flap and pedicle; leave a window to see the flap',
      'Flap perfusion falls with hypothermia, hypovolaemia and external compression'))] },
    { counselling: [
      P('Flap surgery', 'What the flap is, how it is checked after surgery (colour, warmth, refill, sometimes a Doppler probe), how to lie, and that a return to theatre may be needed if it struggles.', 'Flap consent'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const state = flapCompromise(a, ID);
  return merge(
    flapStateLines(a, ID, { free: false }),
    { problem: { monitoring: [L(
      state
        ? 'Flap observations every 30–60 minutes until the flap has recovered or a decision to explore is made'
        : 'Flap observations (colour, refill, turgor, temperature, Doppler where marked) at the frequency the operating surgeon set — commonly hourly for the first 24 hours, then 2–4-hourly',
      state ? `Flap compromise: ${state}` : `Pedicled flap monitoring (${FLAP_MONITORING_BASIS.split(' Current')[0]} 2015; unit protocol)`, state ? 'urgent' : 'routine')] } },
    isOneOf(a, f('partial_loss'), 'partial') && { problem: { treatment: [L('Let the necrotic edge demarcate, then debride; small areas heal by secondary intention, larger ones need a graft or further flap', 'Partial flap necrosis')] } },
    isOneOf(a, f('partial_loss'), 'total') && { problem: { treatment: [L('Debride the lost flap and plan alternative cover (another regional flap or a free flap); temporary NPWT if the bed allows', 'Total flap loss', 'urgent')] } },
    isOneOf(a, f('dangling'), 'congests') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Step the dangling programme back and support the limb with bandaging before progressing', 'Flap congests on dangling'))] },
    isOneOf(a, f('donor_status'), 'graft_loss', 'dehisced', 'infected') && { problem: { treatment: [L('Treat the donor site as a second wound: dressings, culture if infected, regraft if it will not heal', `Donor site: ${String(a[f('donor_status')]).replace(/_/g, ' ')}`)] } },
    isOneOf(a, f('division_status'), 'due') && { problem: { treatment: [L('Book pedicle division and inset (commonly about 3 weeks after the first stage; a clamp test first if flap autonomy is in doubt)', 'Two-stage flap due for division')] } },
    { dischargeCriteria: [
      'Flap observations stable for the period the operating surgeon set',
      'Patient / carer knows how to protect the flap (position, no pressure, no tight clothing) and the signs to report',
      'Donor site comfortable and a dressing plan agreed',
    ] },
    { general: [G('Red flags — return immediately if', L('The flap turns pale, blue, purple or black, becomes cold, tense or swollen, or bleeds dark blood', 'Late flap compromise or haematoma'))] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const donor = chosen(a, f('donor_morbidity'));
  return merge(
    isOneOf(a, f('cover'), 'unstable') && { problem: { investigations: [L('Look for the cause of breakdown: pressure or footwear, infection, osteomyelitis (X-ray / MRI), recurrence (biopsy if suspicious)', 'Unstable flap cover')] } },
    isOneOf(a, f('cover'), 'sinus') && { problem: {
      investigations: [L('Imaging for osteomyelitis, sequestrum or infected implant (X-ray, MRI or sinogram where available); deep cultures', 'Sinus beneath the flap')],
      referrals: [L('Orthoplastic review for debridement / implant removal', 'Sinus beneath the flap')],
    } },
    donor.includes('pain') && { problem: { treatment: [L('Examine for a neuroma at the donor site; desensitisation, neuropathic analgesia, and excision / burial if it persists', 'Persistent donor-site pain')] } },
    donor.includes('weakness') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Strengthening programme for the donor muscle group', 'Donor-site weakness'))] },
    donor.includes('unhealed') && { problem: { treatment: [L('Manage the unhealed donor site as a wound; regraft if needed', 'Donor site not healed')] } },
    isOneOf(a, f('contour'), 'bulky', 'pedicle_bulk') && { problem: { treatment: [L('Offer revision (debulking, liposuction, dog-ear excision) once the flap is mature and stable — usually after at least 3 months', 'Bulky flap / pedicle bulge')] } },
    isOneOf(a, f('weight_bearing'), 'breakdown') && { general: [G('Pressure care', L('Offloading footwear / orthotics and daily skin checks of the flap', 'Flap breaks down with weight bearing'))] },
    isOneOf(a, f('flap_sensation'), 'no') && { general: [G('Patient education', L('The flap has no protective sensation: check it daily, avoid heat (hot water, fires, hot-water bottles) and protect it from pressure', 'Insensate flap'))] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const localRegionalFlap: ProcedureModule = {
  id: ID,
  name: 'Local or pedicled regional flap',
  summary: 'Random and axial local flaps, perforator / propeller flaps and pedicled regional flaps (gastrocnemius, soleus, reverse sural…): planning, flap monitoring, compromise and donor site.',
  group: 'reconstruction',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Local / regional flap reconstruction',
  basis: [
    'BAPRAS professional standards for plastic surgery',
    'BOA / BAPRAS. BOAST: Open Fractures (2017) and Standards for the Management of Open Fractures (Eccles et al., OUP 2020)',
    FLAP_MONITORING_BASIS,
    LEECH_BASIS,
    'Baumeister SP, Spierer R, Erdmann D et al. A realistic complication analysis of 70 sural artery flaps in a multimorbid patient group. Plast Reconstr Surg 2003;112:129-40',
    'NICE NG89 VTE; WHO 2016 SSI guideline; NICE NG125',
  ],
  catalog: {
    feeIds: ['major-004'],
    educationId: null,
    educationNote: 'procedureEducationDatabase has no local / regional flap record; the consent risks are given in this module.',
    patientEducationIds: ['recon-local-flaps', 'flap-surgery'],
  },
  // Core tetanus for an open fracture / acute trauma or a burn (Green Book ch. 30).
  includeCore: { pre_op: ['tetanus'] },
  coreShowWhen: { 'core.tetanus': { field: f('indication'), equals: ['open_fracture', 'burn'] } },
  sections: {
    pre_op: [DETAILS, PLANNING],
    post_op: [DETAILS, MONITORING],
    follow_up: [DETAILS, OUTCOME],
  },
  carryForward: [f('design'), f('named_flap'), f('region'), f('defect_size'), f('defect_base'), f('stages'), f('donor_closure')],
  planRules: [goals, preOp, postOp, followUp],
  therapeuticAntibiotics: c => isOneOf(c.answers, f('indication'), 'open_fracture') ? 'Open fracture: antibiotics from injury until definitive soft-tissue cover, no longer than 72 hours (BOAST 4, 2017)' : null,
  consent: {
    procedureName: 'Local or regional flap reconstruction',
    phases: ['pre_op'],
    intendedBenefits: [
      'Cover the wound with healthy tissue that brings its own blood supply',
      'Protect exposed bone, tendon, joint or implant and help infection and fractures heal',
      'Restore function and contour',
    ],
    risks: [
      { name: 'Partial flap loss', description: 'The edge or tip of the flap may die and need dressings, a skin graft or further surgery' },
      { name: 'Total flap loss', description: 'Rarely the whole flap fails and another reconstruction is needed' },
      { name: 'Venous congestion', description: 'The flap may swell and darken; treatment may include releasing stitches, leeches or a return to theatre' },
      { name: 'Haematoma', description: 'Bleeding under the flap that may need to be drained in theatre' },
      { name: 'Infection and wound breakdown', description: 'At the flap or the donor site' },
      { name: 'Donor-site problems', description: 'A second scar, sometimes a skin graft, and occasionally weakness or numbness where the flap was taken' },
      { name: 'Bulk and contour', description: 'The flap may look bulky or different in colour, and may need thinning later' },
      { name: 'Altered sensation', description: 'The flap is often numb, at least at first' },
    ],
    alternatives: [
      'Dressings or negative-pressure wound therapy and healing by secondary intention (slow; not possible over exposed bone, tendon or implant)',
      'A skin graft, where the bed will accept one',
      'A different local or regional flap',
      'A free flap (microsurgery)',
      'In some limb injuries, amputation',
    ],
    riskOfNotTreating: 'Exposed bone, tendon, joints or implants left uncovered become infected and die; fractures may not heal, implants may have to be removed, and in the worst case the limb or the structure may be lost.',
    anaesthesiaOptions: ['general', 'spinal', 'regional', 'local'],
    additionalProcedures: [
      'A skin graft to the donor site or over a muscle flap',
      'Debridement at the same operation',
      'A return to theatre for a haematoma or a struggling flap',
      'Division of the pedicle at a second operation for two-stage flaps',
      'Later thinning or revision',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: false,
    counsellingTopics: [
      'How the flap is monitored after surgery and why the patient must not lie on it',
      'The donor site: scar, graft, function and feeling',
      'Leeches or a return to theatre if the flap struggles',
      'Elevation and the dangling programme for leg flaps',
      'Protecting a numb flap from heat and pressure',
    ],
    modifiers: [
      { id: 'lrf_zone', when: c => isYes(c.answers, f('zone_of_injury')),
        text: 'Because the flap has to be taken from injured, irradiated or previously operated tissue, it is less reliable and more likely to lose part of its blood supply.',
        why: 'Flap within the zone of injury' },
      { id: 'lrf_venous', when: c => isYes(c.answers, f('venous_insufficiency')),
        text: 'Because the veins in your leg do not drain well, the flap is more likely to swell and congest.',
        why: 'Venous insufficiency' },
      { id: 'lrf_sural_comorbid', when: c => isOneOf(c.answers, f('design'), 'pedicled_fc') && isOneOf(c.answers, f('region'), 'distal_leg', 'foot')
          && (isOneOf(c.answers, 'core.diabetes', 'oral', 'insulin') || isOneOf(c.answers, 'core.pvd', 'suspected', 'confirmed')),
        text: 'Diabetes or poor circulation makes this type of leg flap more likely to lose part of its tissue.',
        why: 'Distally based leg flap with diabetes / arterial disease (Baumeister 2003)' },
      { id: 'lrf_hardware', when: c => hasAny(c.answers, f('defect_base'), 'hardware'),
        text: 'Because a metal implant is exposed, it may already be infected and may need to be removed even if the flap heals.',
        why: 'Exposed implant' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Immediately after surgery', purpose: 'Flap observations at the frequency set by the operating surgeon' }],
    post_op: [
      { when: 'Day 5–7', purpose: 'Flap and donor-site review; start dangling for leg flaps if stable' },
      { when: 'Day 10–14', purpose: 'Remove sutures; donor-site graft check' },
      { when: 'About 3 weeks', purpose: 'Pedicle division for two-stage flaps' },
    ],
    follow_up: [
      { when: '6 weeks', purpose: 'Stable cover, mobilisation, weight bearing (with orthopaedics for fractures)' },
      { when: '3–6 months', purpose: 'Contour, donor morbidity, need for revision' },
    ],
  },
  handoffs: [
    { label: 'WoundProgress Monitor (defect before cover)', route: '/wound-monitor', phases: ['pre_op'], when: 'Measure and photograph the defect' },
    { label: 'NPWT', route: '/npwt', phases: ['pre_op', 'post_op'], when: 'Bridging before cover, or over a donor-site graft' },
    { label: 'Vascular assessment', route: '/vascular', phases: ['pre_op'], when: 'Doubtful limb perfusion before a pedicled leg flap' },
    { label: 'Limb salvage', route: '/limb-salvage', phases: ['pre_op', 'follow_up'], when: 'Orthoplastic limb-salvage decisions' },
    { label: 'Scar Monitor', route: '/scar-monitor', phases: ['follow_up'], when: 'Hypertrophic scarring at the inset or donor site' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate for the family' },
  ],
};
