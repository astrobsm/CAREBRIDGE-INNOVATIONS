/**
 * Pressure-injury reconstruction (ischial, sacral, trochanteric): excision,
 * ostectomy and flap closure.
 *
 * A flap closes a pressure injury; it does not remove the reason the injury
 * happened. Recurrence is common (education record WOUND-003: 10–40%), so the
 * pre-operative review is mostly about whether the causes are controlled:
 * spinal cord injury and autonomic dysreflexia, spasticity and contractures,
 * continence and the bowel programme, osteomyelitis, nutrition, the support
 * surface and the seating / turning regime, and the patient's and carers'
 * ability to keep it up. Post-operatively: the flap, positioning on a
 * high-specification surface, spasms, soiling, dysreflexia, and a progressive
 * sitting protocol. Follow-up: sitting tolerance, seating, skin checks and
 * recurrence.
 *
 * Braden and existing pressure injuries elsewhere are core (pressure section);
 * MUST, albumin, smoking, depression and social support are core too and are
 * read here, never re-asked.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import { PRESSURE_ULCER_STAGES } from '../../../../pressure-sore/data/clinicalProtocol';
import type { PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { isChild } from '../../core/age';
import { G, L, P, merge } from '../../ruleKit';
import { FLAP_MONITORING_BASIS, flapCompromise, flapObservationFields, flapStateLines } from './flapShared';

const ID = 'pressure_sore_flap';
const f = (id: string) => `${ID}.${id}`;

const EPUAP = 'EPUAP / NPIAP / PPPIA. Prevention and Treatment of Pressure Ulcers / Injuries: Clinical Practice Guideline (2019)';
const PVA = 'Consortium for Spinal Cord Medicine. Pressure ulcer prevention and treatment following spinal cord injury (2nd ed., PVA 2014)';
const AD_GUIDE = 'Consortium for Spinal Cord Medicine. Evaluation and management of autonomic dysreflexia and other autonomic dysfunctions (PVA 2020)';
const KEYS_2010 = 'Keys KA, Daniali LN, Warner KJ, Mathes DW. Multivariate predictors of failure after flap coverage of pressure ulcers. Plast Reconstr Surg 2010;125:1725-34';

// ── Fields carried forward ──────────────────────────────────────────────────

const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'sacral', label: 'Sacral / coccygeal' },
    { value: 'ischial', label: 'Ischial' },
    { value: 'trochanteric', label: 'Trochanteric' },
    { value: 'multiple', label: 'More than one site' },
    { value: 'other', label: 'Other (heel, occiput…)' },
  ],
};
const SIDE: EncounterField = {
  id: f('side'), label: 'Side', kind: 'select',
  options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'midline', label: 'Midline' }, { value: 'bilateral', label: 'Bilateral' }],
};
const STAGE: EncounterField = {
  id: f('stage'), label: 'Stage (NPIAP / EPUAP 2019)', kind: 'select', important: true,
  options: PRESSURE_ULCER_STAGES.map(s => ({ value: s.code, label: `${s.stage} — ${s.name}` })),
};
const PREVIOUS_FLAP: EncounterField = {
  id: f('previous_flap'), label: 'Previous flap at this site', kind: 'boolean',
  flagWhenTrue: { level: 'amber', reason: 'Recurrence after a previous flap predicts further failure (Keys 2010): find out why it recurred before operating again, and plan a flap that preserves future options.' },
};
const FLAP: EncounterField = {
  id: f('flap'), label: 'Planned / performed flap', kind: 'select',
  options: [
    { value: 'gluteal_rotation', label: 'Gluteal rotation (fasciocutaneous / musculocutaneous)' },
    { value: 'gluteal_vy', label: 'Gluteal V-Y advancement' },
    { value: 'perforator', label: 'Gluteal artery perforator (SGAP / IGAP)' },
    { value: 'posterior_thigh', label: 'Posterior thigh / hamstring V-Y' },
    { value: 'tfl', label: 'Tensor fasciae latae' },
    { value: 'other', label: 'Other' },
  ],
};

// The neurological level and dysreflexia history are in DETAILS (every phase,
// carried forward) because the post-operative dysreflexia watch reads them.
const IMMOBILITY_CAUSE: EncounterField = {
  id: f('immobility_cause'), label: 'Cause of immobility / sensory loss', kind: 'select', important: true,
  options: [
    { value: 'sci', label: 'Spinal cord injury' },
    { value: 'neuro', label: 'Other neurological (spina bifida, MS, stroke, transverse myelitis)' },
    { value: 'frailty', label: 'Frailty / acute illness / prolonged admission' },
    { value: 'other', label: 'Other' },
  ],
};
const SCI_LEVEL: EncounterField = {
  id: f('sci_level'), label: 'Neurological level of injury', kind: 'select',
  showWhen: { field: f('immobility_cause'), equals: ['sci', 'neuro'] },
  options: [
    { value: 't6_above', label: 'T6 or above (including cervical)', flag: 'amber', flagReason: 'Injury at T6 or above: risk of autonomic dysreflexia during and after surgery — anaesthetic plan and a written dysreflexia protocol (Consortium for Spinal Cord Medicine 2020).' },
    { value: 'below_t6', label: 'Below T6' },
  ],
};
const AD_HISTORY: EncounterField = {
  id: f('ad_history'), label: 'Previous autonomic dysreflexia', kind: 'boolean',
  flagWhenTrue: { level: 'amber', reason: 'Known autonomic dysreflexia: record the baseline blood pressure and the usual triggers; protocol and nifedipine / GTN available on the ward — no GTN within 24 h of sildenafil / vardenafil or 48 h of tadalafil (Consortium for Spinal Cord Medicine 2020).' },
};
const BASELINE_SBP: EncounterField = { id: f('baseline_sbp'), label: 'Usual (baseline) systolic blood pressure', kind: 'number', unit: 'mmHg', min: 60, max: 200, help: 'Often low after high spinal injury; dysreflexia is judged against it.' };

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The pressure injury and the flap',
  intent: 'Recorded once and carried forward.',
  fields: [SITE, SIDE, STAGE, PREVIOUS_FLAP, FLAP, IMMOBILITY_CAUSE, SCI_LEVEL, AD_HISTORY, BASELINE_SBP],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const CAUSES: EncounterSection = {
  id: f('causes'),
  title: 'Why the injury happened — and is it controlled?',
  intent: 'A flap only lasts if the causes are controlled first.',
  fields: [
    {
      id: f('spasticity'), label: 'Spasticity', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'None / not relevant' },
        { value: 'controlled', label: 'Present, controlled' },
        { value: 'uncontrolled', label: 'Uncontrolled — spasms shear the wound or prevent positioning', flag: 'amber', flagReason: 'Uncontrolled spasms shear flap suture lines: optimise antispasticity treatment before surgery.' },
      ],
    },
    {
      id: f('contractures'), label: 'Hip / knee flexion contractures preventing positioning', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Contractures that prevent prone or side-lying positioning will load the flap: physiotherapy or release first.' },
    },
    {
      id: f('bladder'), label: 'Bladder management', kind: 'select', important: true,
      options: [
        { value: 'continent', label: 'Continent' },
        { value: 'ic', label: 'Intermittent self-catheterisation' },
        { value: 'indwelling', label: 'Indwelling urethral catheter' },
        { value: 'suprapubic', label: 'Suprapubic catheter' },
        { value: 'incontinent', label: 'Incontinent of urine', flag: 'amber', flagReason: 'Urinary incontinence wets the wound: catheter or other containment before and after surgery.' },
      ],
    },
    {
      id: f('bowel'), label: 'Bowel management', kind: 'select', important: true,
      options: [
        { value: 'programme', label: 'Established bowel programme, no soiling' },
        { value: 'occasional', label: 'Occasional soiling' , flag: 'amber', flagReason: 'Soiling contaminates sacral / ischial wounds: establish a reliable bowel programme before surgery.' },
        { value: 'frequent', label: 'Frequent faecal soiling of the wound', flag: 'red', flagReason: 'Frequent faecal contamination: bowel programme, and discuss temporary faecal diversion (colostomy) before a sacral / ischial flap.' },
      ],
    },
    {
      id: f('osteomyelitis'), label: 'Osteomyelitis of the underlying bone', kind: 'select', important: true,
      options: [
        { value: 'not_assessed', label: 'Not yet assessed', flag: 'amber', flagReason: 'Assess for osteomyelitis before flap closure: MRI where available (X-ray / CT otherwise) and bone biopsy for histology and culture.' },
        { value: 'excluded', label: 'Excluded (imaging / biopsy)' },
        { value: 'suspected', label: 'Suspected on imaging / probe to bone', flag: 'amber', flagReason: 'Suspected osteomyelitis: bone biopsy for histology and culture; resect infected bone at surgery.' },
        { value: 'confirmed', label: 'Confirmed on bone biopsy', flag: 'amber', flagReason: 'Osteomyelitis confirmed: resect the infected bone and give culture-directed antibiotics with infectious-disease / microbiology advice.' },
      ],
    },
    {
      id: f('surface'), label: 'Support surface available after surgery', kind: 'select', important: true,
      options: [
        { value: 'air_fluidised', label: 'Air-fluidised bed' },
        { value: 'low_air_loss', label: 'Low-air-loss / alternating-pressure mattress' },
        { value: 'foam', label: 'High-specification foam only', flag: 'amber', flagReason: 'A fresh flap needs a high-specification active surface (EPUAP / NPIAP 2019): secure one before surgery or plan very strict positioning.' },
        { value: 'none', label: 'Standard hospital mattress only', flag: 'red', flagReason: 'No pressure-redistributing surface: the flap is likely to break down — do not proceed until one is secured.' },
      ],
    },
    {
      id: f('cushion'), label: 'Wheelchair cushion', kind: 'select',
      options: [
        { value: 'pressure', label: 'Pressure-redistributing cushion (air, gel or contoured foam), checked' },
        { value: 'standard', label: 'Standard / worn-out cushion', flag: 'amber', flagReason: 'An inadequate cushion causes recurrence: seating assessment and a pressure-redistributing cushion before the sitting programme.' },
        { value: 'none', label: 'No wheelchair / not applicable' },
      ],
    },
    {
      id: f('weight_shifts'), label: 'Pressure relief when sitting', kind: 'select',
      options: [
        { value: 'independent', label: 'Performs weight shifts independently' },
        { value: 'assisted', label: 'Needs help' },
        { value: 'unable', label: 'Cannot relieve pressure', flag: 'amber', flagReason: 'Cannot relieve pressure when sitting: tilt-in-space chair, limited sitting times, carer training.' },
      ],
    },
    {
      id: f('pressure_mapping'), label: 'Pressure mapping', kind: 'select',
      options: [{ value: 'done', label: 'Done' }, { value: 'available', label: 'Available, not done' }, { value: 'unavailable', label: 'Not available' }],
    },
    { id: f('cause_of_this_ulcer'), label: 'What caused this injury (patient\'s account)', kind: 'text', placeholder: 'e.g. long journey in a car seat; broken cushion; admission without turning' },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const POST: EncounterSection = {
  id: f('post'),
  title: 'Flap, positioning and the spinal patient after surgery',
  fields: [
    ...flapObservationFields(ID),
    {
      id: f('position'), label: 'Positioning', kind: 'select', important: true,
      options: [
        { value: 'off_flap', label: 'Off the flap (prone / side-lying) as planned' },
        { value: 'on_flap', label: 'Lying on the flap', flag: 'red', flagReason: 'Pressure on a fresh flap: reposition now; check the surface and the turning chart.' },
      ],
    },
    {
      id: f('surface_in_use'), label: 'Surface in use', kind: 'select',
      options: [
        { value: 'planned', label: 'The planned high-specification surface' },
        { value: 'lesser', label: 'A lesser surface', flag: 'amber', flagReason: 'The flap is on a lesser surface than planned: replace it or increase repositioning.' },
      ],
    },
    {
      id: f('spasms_post'), label: 'Spasms', kind: 'select',
      options: [
        { value: 'controlled', label: 'Controlled' },
        { value: 'uncontrolled', label: 'Shearing the suture line', flag: 'amber', flagReason: 'Spasms are shearing the flap: increase antispasticity treatment; look for a trigger (pain, bladder, bowel).' },
      ],
    },
    {
      id: f('soiling_post'), label: 'Soiling of the wound', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'soiled', label: 'Soiled by faeces or urine', flag: 'amber', flagReason: 'Soiled flap: cleanse, change the dressing, review the bowel / bladder plan.' },
      ],
    },
    {
      id: f('dysreflexia'), label: 'Autonomic dysreflexia episode (sudden hypertension, pounding headache, flushing / sweating above the injury, bradycardia)', kind: 'boolean',
      flagWhenTrue: { level: 'red', reason: 'Autonomic dysreflexia is an emergency: sit up, loosen clothing, find and remove the trigger (bladder, bowel, wound, dressings), treat the blood pressure (Consortium for Spinal Cord Medicine 2020).' },
    },
    {
      id: f('sitting_stage'), label: 'Sitting protocol', kind: 'select',
      options: [
        { value: 'bed_rest', label: 'Bed rest — not sitting yet' },
        { value: 'started', label: 'Progressive sitting started' },
        { value: 'flap_marked', label: 'Redness / breakdown after sitting', flag: 'amber', flagReason: 'Flap does not tolerate the last sitting step: go back a step and re-inspect.' },
      ],
    },
    { id: f('sitting_minutes'), label: 'Current sitting session tolerated', kind: 'number', unit: 'min', min: 0, max: 720, showWhen: { field: f('sitting_stage'), equals: ['started', 'flap_marked'] } },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const FU: EncounterSection = {
  id: f('fu'),
  title: 'Sitting, seating, skin checks and recurrence',
  fields: [
    {
      id: f('flap_fu'), label: 'Flap', kind: 'select', important: true,
      options: [
        { value: 'healed', label: 'Healed and intact' },
        { value: 'small_breakdown', label: 'Small breakdown of the suture line', flag: 'amber', flagReason: 'Suture-line breakdown: offload completely and dress; look for the cause before it extends.' },
        { value: 'recurrence', label: 'Recurrence at this site', flag: 'red', flagReason: 'Recurrent pressure injury: offload, image for osteomyelitis and review seating, transfers and adherence.' },
      ],
    },
    { id: f('sitting_hours'), label: 'Sitting time tolerated per day', kind: 'number', unit: 'h', min: 0, max: 24 },
    {
      id: f('skin_checks'), label: 'Twice-daily skin checks (mirror / carer)', kind: 'select',
      options: [{ value: 'yes', label: 'Done' }, { value: 'no', label: 'Not done', flag: 'amber', flagReason: 'Skin checks not done: teach the patient / carer with a long-handled mirror.' }],
    },
    {
      id: f('seating_review'), label: 'Seating / cushion review since surgery', kind: 'select',
      options: [{ value: 'done', label: 'Done' }, { value: 'not_done', label: 'Not done', flag: 'amber', flagReason: 'Seating not reviewed: seating assessment before full sitting times.' }],
    },
    {
      id: f('weight_shifts_fu'), label: 'Pressure relief when sitting', kind: 'select',
      options: [
        { value: 'regular', label: 'Regular, as taught' },
        { value: 'irregular', label: 'Irregular / forgotten', flag: 'amber', flagReason: 'Pressure relief not being done: reinforce it — the commonest cause of recurrence.' },
      ],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const highSci = (a: Parameters<PlanRule>[0]['answers']) => isOneOf(a, f('sci_level'), 't6_above') || isYes(a, f('ad_history'));

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('A healed, durable flap over a well-padded bony prominence with infected bone removed', 'Purpose of pressure-injury reconstruction'),
      L('Control of the causes before and after surgery: pressure, shear, moisture, spasticity, infection, nutrition', `Recurrence is common without them (${EPUAP})`),
      L('Return to the patient\'s previous sitting and living routine without recurrence', 'Functional goal'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const s = ctx.scores;
  const uncontrolled: string[] = [];
  if (isOneOf(a, f('spasticity'), 'uncontrolled')) uncontrolled.push('spasticity');
  if (isYes(a, f('contractures'))) uncontrolled.push('contractures');
  if (isOneOf(a, f('bowel'), 'occasional', 'frequent')) uncontrolled.push('faecal soiling');
  if (isOneOf(a, f('bladder'), 'incontinent')) uncontrolled.push('urinary incontinence');
  if (isOneOf(a, f('osteomyelitis'), 'not_assessed')) uncontrolled.push('osteomyelitis not assessed');
  if (isOneOf(a, f('surface'), 'none', 'foam')) uncontrolled.push('support surface');
  if ((s.must?.total ?? 0) >= 2) uncontrolled.push('malnutrition');
  if (isOneOf(a, 'core.smoking', 'current', 'vaping', 'smokeless')) uncontrolled.push('smoking');
  const recurrence: string[] = [];
  if (isYes(a, f('previous_flap'))) recurrence.push('previous flap at the site');
  if (isOneOf(a, f('site'), 'ischial')) recurrence.push('ischial site');
  if (isOneOf(a, 'core.diabetes', 'diet', 'oral', 'insulin')) recurrence.push('diabetes');
  if (isOneOf(a, f('weight_shifts'), 'unable')) recurrence.push('cannot relieve pressure');
  return merge(
    uncontrolled.length > 0 && { cautions: [`Causes not yet controlled (${uncontrolled.join(', ')}): elective flap closure should wait until they are — the consultant decides (EPUAP / NPIAP 2019).`] },
    recurrence.length > 0 && { counselling: [P('Recurrence', `Your risk of the sore coming back is higher (${recurrence.join(', ')}). The flap only lasts with daily skin checks, pressure relief and the right cushion and mattress.`, `Recurrence risk factors (${KEYS_2010.split('.')[0]} 2010)`)] },
    highSci(a) && { problem: { treatment: [
      L('Autonomic dysreflexia plan: record the baseline blood pressure; written protocol at the bedside (sit up, loosen, find the trigger — bladder, bowel, wound — treat BP); anaesthetist informed (general or spinal anaesthesia even where the area is insensate)',
        `${isYes(a, f('ad_history')) ? 'Previous dysreflexia' : 'Spinal injury at T6 or above'} (${AD_GUIDE.split('.')[0]} 2020)`, 'urgent'),
    ] } },
    isOneOf(a, f('spasticity'), 'uncontrolled') && { problem: { referrals: [L('Rehabilitation / spinal physician to optimise antispasticity treatment (baclofen, tizanidine, botulinum toxin) and treat triggers before surgery', 'Uncontrolled spasticity')] } },
    isYes(a, f('contractures')) && { general: [G('Rehabilitation (physiotherapy / OT)', L('Physiotherapy to stretch hip / knee contractures enough for prone or side-lying positioning; consider surgical release if they are fixed', 'Contractures prevent positioning'))] },
    isOneOf(a, f('bowel'), 'occasional', 'frequent') && { problem: { treatment: [L('Establish a reliable bowel programme (timed evacuation, softeners / stimulants, rectal stimulation as the patient\'s routine allows); constipating regimen around surgery if agreed', `Bowel: ${String(a[f('bowel')])}`)] } },
    isOneOf(a, f('bowel'), 'frequent') && { problem: { referrals: [L('General / colorectal surgery opinion on temporary faecal diversion before a sacral or ischial flap', 'Frequent faecal contamination of the wound')] } },
    isOneOf(a, f('bladder'), 'incontinent') && { problem: { treatment: [L('Urinary containment through the healing period (catheter or sheath); urology review of long-term bladder management', 'Urinary incontinence')] } },
    isOneOf(a, f('osteomyelitis'), 'not_assessed', 'suspected') && { problem: { investigations: [L('MRI of the underlying bone where available (X-ray / CT otherwise) and bone biopsy for histology and culture — at surgery if not before', `Osteomyelitis ${String(a[f('osteomyelitis')]).replace(/_/g, ' ')} (${EPUAP.split('.')[0]})`)] } },
    isOneOf(a, f('osteomyelitis'), 'confirmed', 'suspected') && { problem: { treatment: [L('Excise the bursa and resect the infected / prominent bone at surgery; send bone for histology and culture; culture-directed antibiotics afterwards with microbiology advice', 'Osteomyelitis under a pressure injury')] } },
    { problem: { treatment: [L('Excise the ulcer, bursa and scar, reduce the bony prominence, obliterate dead space with a well-vascularised flap, and close without tension with the suture line away from the pressure point; plan the flap so future flaps remain possible',
      'Principles of pressure-injury reconstruction (EPUAP / NPIAP 2019)')] } },
    // The core nutrition rule writes the same targets once MUST is 1 or more; here they apply to every pressure-injury flap.
    (s.must?.total ?? 0) < 1 && { general: [G('Nutrition', isChild(ctx.patient, ctx.module)
      ? L('Paediatric dietitian: age-appropriate energy and protein targets for healing before and after surgery, with weight plotted on the growth chart', 'Child with a pressure injury — the adult per-kg targets do not apply (EPUAP / NPIAP 2019)')
      : L('Target about 30–35 kcal/kg/day and 1.25–1.5 g protein/kg/day before and after surgery, with the dietitian', 'Adults with a pressure injury who are malnourished or at risk (EPUAP / NPIAP 2019)'))] },
    isOneOf(a, f('surface'), 'none', 'foam') && { general: [G('Pressure care', L('Secure an air-fluidised, low-air-loss or alternating-pressure surface for the post-operative period before booking theatre', `Surface available: ${String(a[f('surface')])} (EPUAP / NPIAP 2019)`, 'urgent'))] },
    (isOneOf(a, f('cushion'), 'standard') || isOneOf(a, f('pressure_mapping'), 'available')) && { problem: { referrals: [L('Seating assessment (with pressure mapping where available) and a pressure-redistributing cushion ready before the sitting programme', 'Cushion inadequate / mapping available')] } },
    isOneOf(a, f('weight_shifts'), 'unable', 'assisted') && { general: [G('Social and financial support', L('Carer training in turning, transfers and pressure relief; tilt-in-space or reclining chair if available', `Pressure relief: ${String(a[f('weight_shifts')])}`))] },
    { counselling: [
      P('After a pressure-sore flap', 'Several weeks lying off the flap on a special mattress, then a slow return to sitting; why soiling, spasms and pressure break flaps down; daily skin checks for life.', 'Pressure-sore flap consent'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const mins = numOf(a, f('sitting_minutes'));
  return merge(
    flapStateLines(a, ID, { free: false }),
    !flapCompromise(a, ID) && { problem: { monitoring: [L('Flap observations each shift and at every turn; inspect the suture line for tension, soiling and breakdown', `Pedicled flap monitoring (${FLAP_MONITORING_BASIS.split(' Current')[0]} 2015)`)] } },
    isOneOf(a, f('position'), 'on_flap') && { general: [G('Pressure care', L('Reposition off the flap now; check the turning chart and the surface', 'Patient lying on the flap', 'urgent'))] },
    { general: [G('Pressure care', L('Keep weight off the flap on the high-specification surface (prone / side-lying), repositioning at intervals set for this patient\'s skin and surface; inspect every pressure area at each turn',
      `Fresh pressure-injury flap (${EPUAP.split('.')[0]})`))] },
    isOneOf(a, f('surface_in_use'), 'lesser') && { general: [G('Pressure care', L('Obtain the planned surface; reposition more often meanwhile', 'Lesser surface than planned', 'urgent'))] },
    isOneOf(a, f('spasms_post'), 'uncontrolled') && { problem: { treatment: [L('Increase antispasticity treatment and treat triggers (pain, full bladder, constipation, the wound)', 'Spasms shearing the flap', 'urgent')] } },
    isOneOf(a, f('soiling_post'), 'soiled') && { problem: { treatment: [L('Cleanse and redress after every soiling; review the bowel programme and urinary containment', 'Wound soiled')] } },
    isYes(a, f('dysreflexia')) && { problem: { treatment: [L(
      'Autonomic dysreflexia: sit the patient up and lower the legs (protecting the flap as far as possible), loosen clothing and dressings, check the catheter and bladder, then the bowel; if systolic BP stays high, treat (e.g. nifedipine or GTN per protocol — no GTN within 24 hours of sildenafil / vardenafil or 48 hours of tadalafil) and monitor every 2–5 minutes',
      `Dysreflexia episode (${AD_GUIDE.split('.')[0]} 2020)`, 'urgent')] } },
    highSci(a) && !isYes(a, f('dysreflexia')) && { problem: { monitoring: [L(`Watch for dysreflexia at every turn, dressing change and catheter problem: a systolic rise of more than ${isChild(ctx.patient, ctx.module) ? '15' : '20'} mmHg above the patient's baseline${numOf(a, f('baseline_sbp')) != null ? ` (${numOf(a, f('baseline_sbp'))} mmHg)` : ''} with symptoms is dysreflexia until proven otherwise`,
      `${isYes(a, f('ad_history')) ? 'Previous dysreflexia' : 'Spinal injury at T6 or above'} (${AD_GUIDE.split('.')[0]} 2020${isChild(ctx.patient, ctx.module) ? ': over 15 mmHg in children and adolescents' : ''})`)] } },
    isOneOf(a, f('sitting_stage'), 'bed_rest') && { general: [G('Rehabilitation (physiotherapy / OT)', L(
      'Start the progressive sitting protocol when the operating surgeon allows (commonly after 2–6 weeks of bed rest, unit protocol): short sessions on the prescribed cushion, increased stepwise, with the flap inspected after each session',
      'Pressure-sore flap — gradual loading (unit protocol)'))] },
    isOneOf(a, f('sitting_stage'), 'started') && { general: [G('Rehabilitation (physiotherapy / OT)', L(
      `Progress sitting stepwise${mins != null ? ` from the current ${mins} minutes` : ''} only if the flap is unmarked after each session (redness that has not faded within about 30 minutes means go back a step)`,
      'Progressive sitting protocol (unit protocol)'))] },
    isOneOf(a, f('sitting_stage'), 'flap_marked') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Go back to the last tolerated sitting step; re-inspect the flap and the cushion', 'Flap marked after sitting', 'urgent'))] },
    { dischargeCriteria: [
      'Flap healed or healing and tolerating sitting at the target for this stage',
      'Pressure-redistributing cushion and mattress in place at home',
      'Patient / carer can do skin checks, pressure relief, transfers and the bowel / bladder routine',
      'Community nursing and seating follow-up arranged',
    ] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('flap_fu'), 'small_breakdown') && { problem: { treatment: [L('Offload the flap completely, dress, and find the cause (cushion, transfers, shear, moisture) before it extends', 'Suture-line breakdown')] } },
    isOneOf(a, f('flap_fu'), 'recurrence') && { problem: {
      investigations: [L('Imaging for osteomyelitis; bone biopsy if suspected', 'Recurrent pressure injury')],
      treatment: [L('Offload completely; review cushion, mattress, transfers, weight shifts, continence, spasticity and adherence before considering another flap', `Recurrence (${KEYS_2010.split('.')[0]} 2010)`, 'urgent')],
    } },
    isOneOf(a, f('skin_checks'), 'no') && { general: [G('Patient education', L('Teach twice-daily skin checks with a long-handled mirror or a carer, and what to do if a red area does not fade', 'Skin checks not being done'))] },
    isOneOf(a, f('seating_review'), 'not_done') && { problem: { referrals: [L('Seating clinic / physiotherapy: cushion, chair set-up and pressure mapping where available', 'Seating not reviewed since surgery')] } },
    isOneOf(a, f('weight_shifts_fu'), 'irregular') && { general: [G('Patient education', L('Pressure relief while sitting: lift, lean or tilt regularly (commonly every 15–30 minutes, long enough to let the skin recover — about 2 minutes); use a phone alarm as a reminder',
      `Pressure relief irregular (${PVA.split('.')[0]} 2014)`))] },
    { general: [G('Pressure care', L('Lifelong prevention: pressure-redistributing cushion and mattress, regular repositioning in bed, check equipment for wear', `Previous pressure-injury reconstruction (${EPUAP.split('.')[0]})`))] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const pressureSoreFlap: ProcedureModule = {
  id: ID,
  name: 'Pressure injury reconstruction (flap closure)',
  summary: 'Ischial, sacral and trochanteric pressure injuries: causes controlled, osteomyelitis, dysreflexia, spasticity, continence, surfaces and seating, flap care and the progressive sitting protocol.',
  group: 'pressure',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Pressure injury — flap reconstruction',
  basis: [
    EPUAP,
    PVA,
    AD_GUIDE,
    KEYS_2010,
    FLAP_MONITORING_BASIS,
    'BAPRAS professional standards; NICE CG179 Pressure ulcers: prevention and management',
  ],
  catalog: {
    feeIds: ['pressure-002', 'major-003'],
    educationId: 'WOUND-003',
    patientEducationIds: ['pressure-sores', 'pressure-injury-stage4'],
  },
  sections: {
    pre_op: [DETAILS, CAUSES],
    post_op: [DETAILS, POST],
    follow_up: [DETAILS, FU],
  },
  includeCore: { follow_up: ['pressure', 'social'] },
  carryForward: [f('site'), f('side'), f('stage'), f('previous_flap'), f('flap'), f('immobility_cause'), f('sci_level'), f('ad_history'), f('baseline_sbp')],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Excision of pressure injury and flap reconstruction',
    phases: ['pre_op'],
    intendedBenefits: [
      'Close a pressure injury that will not heal on its own',
      'Remove infected bone and dead tissue',
      'Allow a return to sitting and normal routine sooner than dressings alone',
    ],
    risks: [
      { name: 'Autonomic dysreflexia', description: 'In high spinal injury, sudden dangerous rises in blood pressure triggered by the wound, bladder or bowel' },
      { name: 'Prolonged bed rest', description: 'Several weeks lying off the flap, with risks to the chest, other pressure areas and mood' },
      { name: 'Bleeding and transfusion', description: 'Pressure-sore surgery can bleed a lot and blood may be needed' },
      { name: 'Further surgery', description: 'Another operation if the wound breaks down or infection persists; each flap used reduces future options' },
      { name: 'Temporary stoma', description: 'Sometimes a temporary colostomy is advised to keep stool away from the wound' },
    ],
    alternatives: [
      'Dressings, offloading and nutrition with healing by secondary intention (slow; may never heal over infected bone)',
      'Negative-pressure wound therapy to reduce the wound',
      'Debridement and bone resection without a flap',
      'Symptom-focused care only (when surgery is not in the patient\'s interest)',
    ],
    riskOfNotTreating: 'A deep pressure injury may never heal: it can stay infected, spread to the bone or joint, cause sepsis and protein loss, and in a long-standing wound can rarely become cancerous.',
    anaesthesiaOptions: ['general', 'spinal'],
    additionalProcedures: [
      'Removal of infected bone (ostectomy) and bone biopsy',
      'Drains',
      'A temporary colostomy in selected patients',
      'Further flaps for breakdown or recurrence',
    ],
    photography: true,
    bloodProducts: 'likely',
    specimen: true,
    counsellingTopics: [
      'Weeks of bed rest on a special mattress, then a gradual return to sitting',
      'Daily skin checks, pressure relief, cushion and mattress — for life',
      'Bowel and bladder routines that keep the wound clean',
      'Autonomic dysreflexia and what the team will do (high spinal injury)',
      'The chance of the sore coming back and why each flap counts',
    ],
    modifiers: [
      { id: 'psf_previous', when: c => isYes(c.answers, f('previous_flap')),
        text: 'Because a flap has already been used at this site and the sore came back, it is more likely to recur again, and fewer reconstruction options remain.',
        why: 'Previous flap failure (Keys 2010)' },
      { id: 'psf_ischial', when: c => isOneOf(c.answers, f('site'), 'ischial'),
        text: 'Sores over the sitting bone (ischium) are the most likely to come back after surgery.',
        why: 'Ischial site (Keys 2010)' },
      { id: 'psf_ad', when: c => highSci(c.answers),
        text: 'Because of the level of your spinal injury, surgery and the recovery can trigger sudden high blood pressure (autonomic dysreflexia); the team will watch for it and treat it quickly.',
        why: 'Spinal injury at T6 or above / previous dysreflexia' },
      { id: 'psf_soiling', when: c => isOneOf(c.answers, f('bowel'), 'occasional', 'frequent'),
        text: 'Soiling of the wound by stool makes infection and breakdown of the flap more likely.',
        why: 'Faecal soiling' },
      { id: 'psf_spasm', when: c => isOneOf(c.answers, f('spasticity'), 'uncontrolled'),
        text: 'Spasms can pull the wound apart; they need to be controlled before and after surgery.',
        why: 'Uncontrolled spasticity' },
      { id: 'psf_osteo', when: c => isOneOf(c.answers, f('osteomyelitis'), 'suspected', 'confirmed'),
        text: 'Because the bone is infected, infection may persist after surgery and you may need a long course of antibiotics.',
        why: 'Osteomyelitis' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before booking theatre', purpose: 'Confirm surface, bowel / bladder plan, nutrition and osteomyelitis work-up' }],
    post_op: [
      { when: 'Daily', purpose: 'Flap, suture line, positioning, spasms, soiling' },
      { when: 'Week 2–3', purpose: 'Sutures and drains; decide when sitting may start' },
      { when: 'Week 3–6', purpose: 'Progressive sitting protocol (unit protocol)' },
    ],
    follow_up: [
      { when: '6 weeks after discharge', purpose: 'Sitting tolerance, skin, seating' },
      { when: '3, 6 and 12 months', purpose: 'Recurrence surveillance, equipment check' },
    ],
  },
  handoffs: [
    { label: 'WoundProgress Monitor', route: '/wound-monitor', phases: ['pre_op', 'follow_up'], when: 'Measure and photograph the injury or any breakdown' },
    { label: 'Nutrition', route: '/nutrition', phases: ['pre_op', 'post_op'], when: 'Dietitian plan and supplements' },
    { label: 'NPWT', route: '/npwt', phases: ['pre_op'], when: 'Bed preparation before flap closure' },
    { label: 'Laboratory (bone biopsy, cultures)', route: '/laboratory', phases: ['pre_op', 'post_op'], when: 'Bone histology and culture results' },
    { label: 'MDT', route: '/mdt', phases: ['pre_op', 'follow_up'], when: 'Spinal rehabilitation, seating, continence and social care' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate including the support surface' },
  ],
};
