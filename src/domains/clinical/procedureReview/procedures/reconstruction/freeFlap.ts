/**
 * Free tissue transfer (microvascular free flap).
 *
 * Pre-operative: recipient vessels outside the zone of injury / radiotherapy,
 * donor-specific checks (Allen test, leg vessels before a fibula), thrombotic
 * risk, and — in our setting — whether the system can support a free flap:
 * a microscope and instruments, nurses trained in flap observations, a
 * high-dependency bed and 24-hour theatre access for re-exploration.
 *
 * Post-operative: the bedside flap signs (flapShared) at a reducing frequency,
 * the physiology that keeps an anastomosis open (warm, well filled, not
 * over-filled, adequate perfusion pressure), the antithrombotic protocol,
 * and the time-critical return-to-theatre decision. Follow-up: flap and donor
 * outcome, bony union, debulking.
 *
 * The thresholds that are unit choices (observation frequency, haematocrit
 * target, antithrombotic regimen) are written as "per unit protocol", never
 * as a published number.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { FLAP_MONITORING_BASIS, LEECH_BASIS, decongestionField, flapCompromise, flapObservationFields, flapStateLines } from './flapShared';

const ID = 'free_flap';
const f = (id: string) => `${ID}.${id}`;

const CHEN_2007 = 'Chen KT, Mardini S, Chuang DC et al. Timing of presentation of the first signs of vascular compromise dictates the salvage outcome of free flap transfer. Plast Reconstr Surg 2007;120:187-95';
const BUI_2007 = 'Bui DT, Cordeiro PG, Hu QY et al. Free flap reexploration: indications, treatment, and outcomes in 1193 free flaps. Plast Reconstr Surg 2007;119:2092-100';
const DISA_2003 = 'Disa JJ, Polvora VP, Pusic AL et al. Dextran-related complications in head and neck microsurgery: do the benefits outweigh the risks? Plast Reconstr Surg 2003;112:1534-9';

// ── Fields carried forward ──────────────────────────────────────────────────

const FLAP: EncounterField = {
  id: f('flap'), label: 'Free flap', kind: 'select', important: true,
  options: [
    { value: 'alt', label: 'Anterolateral thigh (ALT)' },
    { value: 'rfff', label: 'Radial forearm' },
    { value: 'fibula', label: 'Fibula (osteo-cutaneous)' },
    { value: 'ld', label: 'Latissimus dorsi' },
    { value: 'gracilis', label: 'Gracilis' },
    { value: 'scapular', label: 'Scapular / parascapular' },
    { value: 'abdominal', label: 'Abdominal (DIEP / MS-TRAM)' },
    { value: 'other', label: 'Other' },
  ],
};
const RECIPIENT_REGION: EncounterField = {
  id: f('recipient_region'), label: 'Recipient region', kind: 'select', important: true,
  options: [
    { value: 'head_neck', label: 'Head and neck' },
    { value: 'lower_limb', label: 'Lower limb' },
    { value: 'upper_limb', label: 'Upper limb / hand' },
    { value: 'breast', label: 'Breast' },
    { value: 'trunk', label: 'Trunk / perineum' },
  ],
};
const VESSELS: EncounterField = { id: f('vessels'), label: 'Recipient artery and vein(s)', kind: 'text', placeholder: 'e.g. posterior tibial artery end-to-side, two venae comitantes' };
const VEINS: EncounterField = {
  id: f('venous_anastomoses'), label: 'Venous anastomoses', kind: 'select',
  options: [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two or more' }],
};
const ISCHAEMIA: EncounterField = {
  id: f('ischaemia_min'), label: 'Flap ischaemia time', kind: 'number', unit: 'min', min: 0, max: 600,
  help: 'From pedicle division to reperfusion, from the operation note. There is no single published cut-off; longer times are recorded so the team can judge.',
};
const MONITOR_METHOD: EncounterField = {
  id: f('monitor_method'), label: 'Monitoring method', kind: 'multiselect', important: true,
  options: [
    { value: 'clinical', label: 'Clinical (skin paddle)' },
    { value: 'handheld', label: 'Hand-held Doppler at a marked point' },
    { value: 'implantable', label: 'Implantable Doppler' },
    { value: 'buried', label: 'Buried flap — monitoring paddle / exteriorised segment' },
  ],
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The free flap',
  intent: 'From the plan or the operation note; carried forward to every later review.',
  fields: [FLAP, RECIPIENT_REGION, VESSELS, VEINS, ISCHAEMIA, MONITOR_METHOD],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const PLANNING: EncounterSection = {
  id: f('planning'),
  title: 'Microsurgical planning and readiness',
  intent: 'Recipient vessels, donor checks, thrombotic risk — and whether the team and the hospital can look after a free flap tonight.',
  fields: [
    {
      id: f('recipient_vessels'), label: 'Recipient vessels', kind: 'select', important: true,
      options: [
        { value: 'adequate', label: 'Adequate, outside the zone of injury / radiotherapy' },
        { value: 'single_vessel', label: 'Single-vessel limb', flag: 'amber', flagReason: 'Single-vessel limb: end-to-side arterial anastomosis to preserve distal flow; vascular imaging first.' },
        { value: 'depleted', label: 'Vessel-depleted (previous neck dissection / radiotherapy / injury)', flag: 'amber', flagReason: 'Vessel-depleted field: plan alternative recipients, vein grafts or an arteriovenous loop.' },
        { value: 'diseased', label: 'Diseased / calcified', flag: 'red', flagReason: 'Diseased recipient vessels: vascular-surgery input and imaging before committing to a free flap.' },
        { value: 'not_assessed', label: 'Not yet assessed', flag: 'amber', flagReason: 'Recipient vessels not assessed: examination, Doppler and CT angiography where pulses are abnormal or the limb was injured.' },
      ],
    },
    {
      id: f('allen'), label: 'Allen test / hand perfusion (radial forearm donor)', kind: 'select',
      showWhen: { field: f('flap'), equals: ['rfff'] },
      options: [
        { value: 'normal', label: 'Normal ulnar filling' },
        { value: 'abnormal', label: 'Abnormal / incomplete palmar arch', flag: 'red', flagReason: 'Abnormal Allen test: harvesting the radial artery may make the hand ischaemic — choose another flap or reconstruct the artery.' },
      ],
    },
    {
      id: f('leg_vessels'), label: 'Leg vessels before fibula harvest', kind: 'select',
      showWhen: { field: f('flap'), equals: ['fibula'] },
      options: [
        { value: 'normal', label: 'Three-vessel run-off confirmed (CTA / angiography / Doppler)' },
        { value: 'not_imaged', label: 'Not imaged', flag: 'amber', flagReason: 'Image the leg vessels before fibula harvest: a dominant peroneal artery (peronea arteria magna) must not be taken.' },
        { value: 'abnormal', label: 'Abnormal run-off / peronea arteria magna', flag: 'red', flagReason: 'Peroneal artery is the dominant supply to the foot: do not harvest this fibula.' },
      ],
    },
    {
      id: f('donor_scars'), label: 'Previous surgery or scars at the donor site (e.g. abdominal for DIEP, thigh for ALT)', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Donor scars may have divided the perforators: image (CTA) or choose another donor.' },
    },
    {
      id: f('ward_capability'), label: 'Post-operative care available', kind: 'multiselect', important: true,
      help: 'A free flap needs frequent observations by nurses trained to recognise compromise, and theatre access at any hour.',
      options: [
        { value: 'hdu', label: 'HDU / ICU bed booked' },
        { value: 'trained_nurses', label: 'Nurses trained in flap observations on the receiving ward' },
        { value: 'theatre_24h', label: '24-hour theatre and microsurgeon access for re-exploration' },
        { value: 'microscope', label: 'Microscope / loupes, microinstruments and sutures (or coupler) checked' },
        { value: 'blood', label: 'Blood cross-matched' },
      ],
    },
    {
      id: f('antithrombotic_plan'), label: 'Antithrombotic plan', kind: 'select',
      options: [
        { value: 'unit_protocol', label: 'Unit protocol (e.g. prophylactic LMWH ± aspirin)' },
        { value: 'therapeutic', label: 'Therapeutic anticoagulation (patient-specific indication)', flag: 'amber', flagReason: 'Therapeutic anticoagulation raises the haematoma risk: agree timing with haematology and the microsurgeon.' },
        { value: 'dextran', label: 'Dextran', flag: 'amber', flagReason: 'Dextran adds systemic complications without proven flap benefit (Disa 2003): reconsider.' },
        { value: 'not_agreed', label: 'Not yet agreed', flag: 'amber', flagReason: 'Agree the antithrombotic plan before theatre.' },
      ],
    },
    {
      id: f('adjuvant_rt'), label: 'Radiotherapy planned after reconstruction', kind: 'select',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not yet decided' }],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const MONITORING: EncounterSection = {
  id: f('monitoring'),
  title: 'Free flap monitoring and physiology',
  intent: 'Compromise is time-critical: salvage is best when re-exploration follows the first sign within hours.',
  fields: [
    {
      id: f('hours_since'), label: 'Hours since the anastomosis', kind: 'number', unit: 'h', min: 0, max: 2000,
      help: 'Most vascular compromise presents in the first 24–72 hours.',
    },
    ...flapObservationFields(ID, { doppler: true }),
    {
      id: f('implantable_signal'), label: 'Implantable Doppler signal', kind: 'select',
      showWhen: { field: f('monitor_method'), equals: ['implantable'] },
      options: [
        { value: 'present', label: 'Present' },
        { value: 'lost', label: 'Lost', flag: 'red', flagReason: 'Lost implantable Doppler signal: check the probe and the flap clinically, and inform the microsurgeon now.' },
      ],
    },
    decongestionField(ID),
    {
      id: f('obs_charted'), label: 'Flap observations charted at the planned frequency', kind: 'select', important: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'gaps', label: 'Gaps in the chart', flag: 'amber', flagReason: 'Gaps in free-flap observations delay recognition of compromise: correct the staffing / chart today.' },
      ],
    },
    {
      id: f('haematocrit'), label: 'Haematocrit', kind: 'number', unit: '%', min: 10, max: 70,
      help: 'Interpret against the unit target; core Hb flags anaemia.',
    },
    {
      id: f('fluid_state'), label: 'Fluid state', kind: 'select',
      options: [
        { value: 'euvolaemic', label: 'Euvolaemic' },
        { value: 'dry', label: 'Under-filled (tachycardia, low urine output, hypotension)', flag: 'amber', flagReason: 'Hypovolaemia reduces flap perfusion: fluid challenge and look for bleeding.' },
        { value: 'overloaded', label: 'Over-filled (oedema, flap swelling, crackles)', flag: 'amber', flagReason: 'Fluid overload causes flap oedema: review the fluid plan.' },
      ],
    },
    { id: f('vasopressor'), label: 'Vasopressor / inotrope running', kind: 'boolean' },
    {
      id: f('antithrombotic_given'), label: 'Antithrombotic regimen', kind: 'select',
      options: [
        { value: 'as_planned', label: 'Given as planned' },
        { value: 'held', label: 'Held (bleeding / haematoma)', flag: 'amber', flagReason: 'Antithrombotic held: agree the restart with the microsurgeon; mechanical VTE prophylaxis meanwhile.' },
      ],
    },
    {
      id: f('re_exploration'), label: 'Re-exploration', kind: 'select',
      options: [
        { value: 'none', label: 'Not needed' },
        { value: 'salvaged', label: 'Explored — salvaged' },
        { value: 'lost', label: 'Explored — flap lost', flag: 'red', flagReason: 'Free flap lost: debride and plan the next reconstruction.' },
      ],
    },
    {
      id: f('dangling'), label: 'Dangling (lower-limb flap)', kind: 'select',
      showWhen: { field: f('recipient_region'), equals: ['lower_limb'] },
      options: [
        { value: 'not_started', label: 'Not started (strict elevation)' },
        { value: 'tolerated', label: 'In progress, tolerated' },
        { value: 'congests', label: 'Flap congests on dangling', flag: 'amber', flagReason: 'Flap congests when dependent: step the dangling programme back.' },
      ],
    },
    {
      id: f('donor_status'), label: 'Donor site', kind: 'select',
      options: [
        { value: 'healing', label: 'Healing' },
        { value: 'graft_loss', label: 'Donor graft not taking / tendon exposed (radial forearm)', flag: 'amber', flagReason: 'Donor graft loss over tendon: dress, splint, regraft.' },
        { value: 'compartment', label: 'Tense donor leg / thigh, pain on passive stretch', flag: 'red', flagReason: 'Possible donor-site compartment syndrome after tight closure: release now.' },
        { value: 'dehisced', label: 'Dehisced / infected', flag: 'amber', flagReason: 'Donor wound problem: culture, open any collection.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const OUTCOME: EncounterSection = {
  id: f('outcome'),
  title: 'Flap outcome, donor site and further treatment',
  fields: [
    {
      id: f('flap_outcome'), label: 'Flap', kind: 'select', important: true,
      options: [
        { value: 'survived', label: 'Survived, healed' },
        { value: 'partial', label: 'Partial loss, healed' },
        { value: 'unstable', label: 'Unstable / breaking down', flag: 'amber', flagReason: 'Unstable flap: look for infection, pressure, recurrence or underlying osteomyelitis.' },
        { value: 'lost', label: 'Lost' },
      ],
    },
    {
      id: f('bony_union'), label: 'Bony union of a vascularised bone flap', kind: 'select',
      showWhen: { field: f('flap'), equals: ['fibula'] },
      options: [
        { value: 'united', label: 'United' },
        { value: 'uniting', label: 'Uniting' },
        { value: 'non_union', label: 'Non-union / hardware problem', flag: 'amber', flagReason: 'Non-union or plate exposure: imaging and joint review with the operating team.' },
      ],
    },
    {
      id: f('donor_morbidity'), label: 'Donor-site morbidity', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'scar', label: 'Scar / contour' },
        { value: 'numbness', label: 'Numbness (e.g. lateral thigh after ALT)' },
        { value: 'weakness', label: 'Weakness or reduced function' },
        { value: 'ankle', label: 'Ankle instability / great-toe flexion contracture (fibula)' },
        { value: 'hernia_bulge', label: 'Abdominal bulge / hernia (abdominal flap)', flag: 'amber', flagReason: 'Donor-site bulge or hernia: examine, imaging, general / plastic surgical repair.' },
      ],
    },
    {
      id: f('debulking'), label: 'Needs debulking / revision', kind: 'select',
      options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes — patient wishes it' }],
    },
    {
      id: f('rt_status'), label: 'Adjuvant radiotherapy', kind: 'select',
      options: [
        { value: 'not_planned', label: 'Not planned' },
        { value: 'awaiting', label: 'Awaiting start' },
        { value: 'in_progress', label: 'In progress / completed' },
      ],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Free flap survival with durable, well-vascularised reconstruction', 'Purpose of free tissue transfer'),
      L('Early recognition of vascular compromise and re-exploration within hours of the first sign', `Salvage depends on time to re-exploration (${CHEN_2007.split('.')[0]} 2007)`),
      L('Restored form and function with an acceptable donor site', 'Reconstructive aim'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const cap = chosen(a, f('ward_capability'));
  const missing = ['hdu', 'trained_nurses', 'theatre_24h', 'microscope'].filter(x => !cap.includes(x));
  const label: Record<string, string> = { hdu: 'HDU / ICU bed', trained_nurses: 'trained flap nurses', theatre_24h: '24-hour theatre access', microscope: 'microsurgical equipment' };
  const thrombophilia = hasAny(a, 'core.caprini', 'other_thrombophilia', 'personal_history_vte', 'heparin_thrombocytopenia');
  return merge(
    missing.length > 0 && { problem: { treatment: [L(
      `Do not start the free flap until ${missing.map(m => label[m]).join(', ')} ${missing.length > 1 ? 'are' : 'is'} confirmed for the first post-operative days; otherwise choose a pedicled option or defer`,
      'Free-flap salvage requires trained observation and immediate re-exploration', 'urgent')] } },
    isOneOf(a, f('recipient_vessels'), 'not_assessed') && { problem: { investigations: [L('Assess the recipient vessels: pulses and Doppler; CT angiography where the limb was injured or pulses are abnormal', 'Recipient vessels not assessed')] } },
    isOneOf(a, f('recipient_vessels'), 'single_vessel', 'diseased') && { problem: { referrals: [L('Vascular surgery input and imaging; plan end-to-side anastomosis or an alternative', `Recipient vessels: ${String(a[f('recipient_vessels')]).replace(/_/g, ' ')}`)] } },
    isOneOf(a, f('recipient_vessels'), 'depleted') && { problem: { treatment: [L('Plan alternative recipient vessels outside the irradiated / operated field, with vein grafts or an arteriovenous loop if needed', 'Vessel-depleted recipient field')] } },
    isOneOf(a, f('leg_vessels'), 'not_imaged') && { problem: { investigations: [L('CT angiography (or angiography) of both legs before fibula harvest', 'Fibula planned; leg vessels not imaged')] } },
    isYes(a, f('donor_scars')) && { problem: { investigations: [L('CT angiography of the donor perforators, or choose another donor', 'Scars at the donor site')] } },
    thrombophilia && { problem: { referrals: [L('Haematology plan for peri-operative anticoagulation: thrombophilia / previous VTE / HIT increases anastomotic thrombosis', 'Prothrombotic history recorded in the Caprini factors')] } },
    isOneOf(a, f('antithrombotic_plan'), 'dextran') && { problem: { treatment: [L('Avoid dextran: systemic complications without proven flap benefit', DISA_2003.split('.')[0] + ' 2003')] } },
    isOneOf(a, f('antithrombotic_plan'), 'not_agreed') && { problem: { treatment: [L('Agree and write the antithrombotic regimen before theatre (unit protocol: no regimen has proven flap-survival benefit; routine LMWH VTE prophylaxis is compatible with free flaps)', 'Antithrombotic plan not agreed')] } },
    { general: [G('Anaesthesia and theatre',
      L('Keep the patient normothermic (core temperature 36 °C or above) from induction to the ward, with active warming', 'Inadvertent peri-operative hypothermia (NICE CG65); vasoconstriction threatens the flap'),
      L('Goal-directed fluids: avoid both hypovolaemia and over-infusion; agree the target mean arterial pressure and whether vasopressors may be used (current evidence does not show that they harm free flaps)',
        'Flap perfusion depends on pressure and volume; over-infusion causes flap oedema (ERAS head and neck, Dort 2017)'),
      L('Long operation: pressure-area padding, urinary catheter and pneumatic compression throughout', 'Free-flap surgery commonly lasts many hours'),
    )] },
    isOneOf(a, f('adjuvant_rt'), 'yes') && { counselling: [P('Radiotherapy after reconstruction', 'Radiotherapy can shrink and stiffen the flap; it is planned with the oncology team once the wounds have healed.', 'Adjuvant radiotherapy planned')] },
    { counselling: [
      P('Free flap', 'What microsurgery involves, the long operation, frequent flap checks day and night for the first days, keeping warm and not lying on the flap, and the chance of an urgent return to theatre.', 'Free-flap consent'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const state = flapCompromise(a, ID);
  const hrs = numOf(a, f('hours_since'));
  const temp = numOf(a, 'core.obs_temp');
  return merge(
    flapStateLines(a, ID, { free: true }),
    isOneOf(a, f('implantable_signal'), 'lost') && { problem: { treatment: [L('Lost implantable Doppler signal: examine the flap clinically and inform the microsurgeon now; return to theatre unless a probe fault is certain', 'Implantable Doppler signal lost', 'urgent')] } },
    !state && { problem: { monitoring: [L(
      hrs == null || hrs < 24
        ? 'Flap observations hourly for the first 24 hours (unit protocol), recorded on the flap chart with the time and observer'
        : hrs < 72
          ? 'Flap observations 2-hourly from 24 to 72 hours (unit protocol), hourly again after any change'
          : 'Flap observations 4-hourly after 72 hours until discharge (unit protocol)',
      `${hrs != null ? `${hrs} hours since anastomosis; ` : ''}most compromise presents in the first 24–72 hours (${CHEN_2007.split('.')[0]} 2007; ${FLAP_MONITORING_BASIS.split(' Current')[0]} 2015)`)] } },
    state && { cautions: [`Free flap showing ${state} compromise: this is a surgical emergency — the decision to re-explore must not wait for the next ward round.`] },
    isOneOf(a, f('obs_charted'), 'gaps') && { problem: { monitoring: [L('Fill the gaps: named nurse responsible for flap observations each shift; escalate staffing if the planned frequency cannot be kept', 'Gaps in the flap chart', 'urgent')] } },
    temp != null && temp < 36 && { problem: { treatment: [L('Active warming to a core temperature of 36 °C or above; warm the room', `Temperature ${temp} °C (NICE CG65)`, 'urgent')] } },
    isOneOf(a, f('fluid_state'), 'dry') && { problem: { treatment: [L('Fluid challenge and reassess; look for bleeding at the recipient and donor sites', 'Under-filled — flap perfusion at risk', 'urgent')] } },
    isOneOf(a, f('fluid_state'), 'overloaded') && { problem: { treatment: [L('Reduce maintenance fluids; review the fluid balance with the anaesthetist', 'Fluid overload — flap oedema')] } },
    numOf(a, f('haematocrit')) != null && { problem: { monitoring: [L('Haematocrit against the unit target (many units aim for about 30–35%): transfuse by the core Hb threshold, not to raise flap flow', `Haematocrit ${numOf(a, f('haematocrit'))}% (unit protocol)`)] } },
    isYes(a, f('vasopressor')) && { problem: { monitoring: [L('Vasopressor running: record the dose and target pressure; check the flap more often when the dose changes', 'Vasopressor in use')] } },
    isOneOf(a, f('antithrombotic_given'), 'held') && { problem: { treatment: [L('Agree with the microsurgeon when to restart the antithrombotic regimen', 'Antithrombotic held')] } },
    isOneOf(a, f('re_exploration'), 'lost') && { problem: { treatment: [L('Debride the failed flap; temporise (dressings / NPWT) and plan the next reconstruction with the patient', 'Free flap lost', 'urgent')] } },
    isOneOf(a, f('donor_status'), 'compartment') && { problem: { treatment: [L('Release the donor closure / fasciotomy now; skin graft the donor defect later', 'Possible donor-site compartment syndrome', 'urgent')] } },
    isOneOf(a, f('donor_status'), 'graft_loss') && { problem: { treatment: [L('Donor site: splint, moist dressing over exposed tendon and regraft', 'Donor graft loss')] } },
    isOneOf(a, f('dangling'), 'congests') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Step the dangling programme back and support the limb with bandaging', 'Free flap congests on dangling'))] },
    isOneOf(a, f('recipient_region'), 'lower_limb') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Lower-limb free flap: strict elevation first, then a graduated dangling programme with bandage support as the microsurgeon directs', 'Dependent oedema congests leg flaps (unit protocol)'))] },
    isOneOf(a, f('recipient_region'), 'head_neck') && { general: [G('Wound care and dressings', L('Head and neck flap: no tracheostomy ties around the neck (suture the tube or use tape away from the pedicle), head neutral, no pressure on the neck', 'Neck ties and rotation compress the pedicle veins'))] },
    { dischargeCriteria: [
      'Flap stable through the high-risk observation period',
      'Donor site healing; mobilising (dangling programme complete for leg flaps)',
      'Patient knows the flap warning signs and how to return urgently',
    ] },
    { general: [G('Red flags — return immediately if', L('The flap changes colour (pale, blue, purple, black), becomes cold, tense or suddenly swollen', 'Late free-flap compromise'))] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const donor = chosen(a, f('donor_morbidity'));
  return merge(
    isOneOf(a, f('flap_outcome'), 'unstable') && { problem: { investigations: [L('Find the cause of breakdown: infection, pressure, osteomyelitis (imaging), recurrence (biopsy)', 'Unstable flap')] } },
    isOneOf(a, f('flap_outcome'), 'lost') && { problem: { treatment: [L('Plan the definitive reconstruction with the patient (another free flap, pedicled option, or alternative)', 'Free flap lost')] } },
    isOneOf(a, f('bony_union'), 'non_union') && { problem: { investigations: [L('CT for union; review fixation with the operating team', 'Vascularised bone non-union / hardware problem')] } },
    donor.includes('ankle') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Ankle and great-toe stretching / strengthening; orthotics if unstable', 'Fibula donor morbidity'))] },
    donor.includes('hernia_bulge') && { problem: { referrals: [L('Surgical review of the abdominal donor bulge / hernia (imaging, repair)', 'Abdominal donor-site bulge')] } },
    isOneOf(a, f('debulking'), 'yes') && { problem: { treatment: [L('Offer debulking (liposuction or direct thinning) once the flap is mature — commonly after 3–6 months and after any radiotherapy has settled', 'Bulky flap')] } },
    isOneOf(a, f('rt_status'), 'awaiting') && { problem: { referrals: [L('Confirm the radiotherapy start with oncology once the wounds have healed', 'Adjuvant radiotherapy awaited')] } },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const freeFlap: ProcedureModule = {
  id: ID,
  name: 'Free flap (microvascular free tissue transfer)',
  summary: 'Microvascular free flaps: recipient vessels and readiness, ischaemia time, antithrombotic plan, hourly-then-reducing flap observations, time-critical re-exploration and the donor site.',
  group: 'reconstruction',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Free flap reconstruction',
  basis: [
    'BAPRAS professional standards for plastic surgery',
    FLAP_MONITORING_BASIS,
    CHEN_2007,
    BUI_2007,
    DISA_2003,
    LEECH_BASIS,
    'Dort JC, Farwell DG, Findlay M et al. Optimal perioperative care in major head and neck cancer surgery with free flap reconstruction: ERAS Society consensus. JAMA Otolaryngol Head Neck Surg 2017;143:292-303',
    'NICE CG65 Hypothermia: prevention and management in adults having surgery',
    'BOAST Open Fractures (2017) for lower-limb free flaps; NICE NG89 VTE',
  ],
  catalog: {
    feeIds: ['advanced-001', 'advanced-004'],
    educationId: null,
    educationNote: 'procedureEducationDatabase has no free-flap record; the consent risks are given in this module.',
    patientEducationIds: ['recon-free-flap', 'reconstructive-microsurgery'],
  },
  sections: {
    pre_op: [DETAILS, PLANNING],
    post_op: [DETAILS, MONITORING],
    follow_up: [DETAILS, OUTCOME],
  },
  carryForward: [f('flap'), f('recipient_region'), f('vessels'), f('venous_anastomoses'), f('ischaemia_min'), f('monitor_method')],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Free flap reconstruction (microsurgery)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Reconstruct a defect that cannot be closed with nearby tissue, using tissue with its own blood supply',
      'Cover and protect bone, tendon, implants or vital structures and allow healing',
      'Restore form and function',
    ],
    risks: [
      { name: 'Total flap failure', description: 'The blood vessels joined under the microscope can clot and the flap can die, needing another reconstruction', frequency: '1-5%' },
      { name: 'Return to theatre', description: 'An urgent operation to rescue the flap if its blood supply is threatened, often at night', frequency: '5-10%' },
      { name: 'Partial flap loss', description: 'Part of the flap may die and need further surgery' },
      { name: 'Haematoma', description: 'Bleeding under the flap or at the donor site needing drainage' },
      { name: 'Donor-site problems', description: 'Scar, numbness, weakness, a skin graft, or (by donor) ankle stiffness or abdominal bulge' },
      { name: 'Long operation', description: 'Pressure injuries, chest infection and blood clots are more likely after a long anaesthetic' },
      { name: 'Bulk and colour', description: 'The flap may look bulky or a different colour and may need thinning' },
      { name: 'Blood transfusion', description: 'May be needed during or after surgery' },
    ],
    alternatives: [
      'A local or pedicled regional flap where one is suitable',
      'A skin graft or dermal substitute, where the bed allows',
      'Dressings or negative-pressure therapy (slow; often not possible over exposed structures)',
      'In some limb injuries, amputation and a prosthesis',
      'No reconstruction',
    ],
    riskOfNotTreating: 'The defect may stay open, become infected, expose vital structures, prevent bone healing or radiotherapy, and in the limb may lead to amputation; function and appearance may be lost.',
    anaesthesiaOptions: ['general', 'combined'],
    additionalProcedures: [
      'A skin graft to the donor site',
      'Vein grafts taken from the leg or arm',
      'An urgent return to theatre to rescue the flap',
      'Tracheostomy for some head and neck reconstructions',
      'Later thinning or revision',
    ],
    photography: true,
    bloodProducts: 'likely',
    specimen: false,
    counsellingTopics: [
      'Frequent flap checks day and night for the first days',
      'Keeping warm, drinking well and not lying on the flap or pedicle',
      'The chance of an urgent return to theatre',
      'The donor site and its long-term effects',
      'Time in hospital (often HDU first) and recovery',
      'The dangling programme for leg flaps',
    ],
    modifiers: [
      { id: 'ff_depleted', when: c => isOneOf(c.answers, f('recipient_vessels'), 'depleted', 'diseased', 'single_vessel'),
        text: 'Because the blood vessels available to connect the flap are limited or diseased, the flap is more likely to clot and fail.',
        why: 'Compromised recipient vessels' },
      { id: 'ff_thrombophilia', when: c => hasAny(c.answers, 'core.caprini', 'other_thrombophilia', 'personal_history_vte', 'heparin_thrombocytopenia'),
        text: 'Because your blood clots more easily than usual, the joined vessels are more likely to block.',
        why: 'Prothrombotic history' },
      { id: 'ff_sickle', when: c => isOneOf(c.answers, 'core.haemoglobinopathy', 'ss_sc'),
        text: 'Sickle cell disease increases the chance of the flap vessels blocking; keeping you warm, well hydrated and well oxygenated is especially important.',
        why: 'Sickle cell disease and microvascular thrombosis' },
      { id: 'ff_rt', when: c => isOneOf(c.answers, f('adjuvant_rt'), 'yes'),
        text: 'Radiotherapy after surgery can make the flap shrink, harden or change shape.',
        why: 'Adjuvant radiotherapy planned' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'First 72 hours after surgery', purpose: 'Flap observations hourly, then 2-hourly, then 4-hourly (unit protocol) with immediate escalation' }],
    post_op: [
      { when: 'Daily on the ward', purpose: 'Consultant / registrar flap review' },
      { when: 'Day 10–14', purpose: 'Sutures, donor-site graft' },
    ],
    follow_up: [
      { when: '2 and 6 weeks after discharge', purpose: 'Healing, donor site, mobilisation; radiotherapy timing' },
      { when: '3–6 months', purpose: 'Function, contour, debulking, donor morbidity' },
    ],
  },
  handoffs: [
    { label: 'Vascular assessment', route: '/vascular', phases: ['pre_op'], when: 'Recipient-vessel or donor-leg imaging and opinion' },
    { label: 'Limb salvage', route: '/limb-salvage', phases: ['pre_op', 'follow_up'], when: 'Orthoplastic lower-limb reconstruction' },
    { label: 'Tumour board', route: '/tumour-board', phases: ['pre_op', 'follow_up'], when: 'Oncological reconstruction and radiotherapy timing' },
    { label: 'Blood transfusion', route: '/blood-transfusion', phases: ['pre_op', 'post_op'], when: 'Cross-match and transfusion' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate for the family' },
  ],
};
