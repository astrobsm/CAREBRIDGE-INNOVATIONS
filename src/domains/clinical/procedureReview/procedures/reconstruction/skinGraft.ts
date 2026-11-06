/**
 * Skin grafting (split- and full-thickness) — the reference module for a
 * procedure reviewed before, after and long after the operation.
 *
 * Pre-operative: is the recipient bed ready (clean granulation, no exposed
 * bare bone / tendon / cartilage, no beta-haemolytic streptococcus or heavy
 * bioburden), which graft for which site, which donor site, can the graft be
 * immobilised. Post-operative: take, the causes of loss (haematoma, seroma,
 * shear, infection), the donor site. Follow-up: contracture, scar,
 * pigmentation, dryness, itch, sun protection.
 *
 * Graft take is computed with the skin-graft domain's estimateGraftTake from
 * the clinician's own observations, against the area grafted at surgery.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import { estimateGraftTake } from '../../../../skin-graft/services/graftAnalysis';
import type { PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { isChild, isUnder } from '../../core/age';

const ID = 'skin_graft';
const f = (id: string) => `${ID}.${id}`;

// ── Fields shared by several phases (same objects, carried forward) ─────────

const GRAFT_TYPE: EncounterField = {
  id: f('graft_type'), label: 'Graft', kind: 'select', important: true,
  options: [
    { value: 'stsg_sheet', label: 'Split-thickness — sheet' },
    { value: 'stsg_meshed', label: 'Split-thickness — meshed' },
    { value: 'ftsg', label: 'Full-thickness' },
  ],
};
const MESH_RATIO: EncounterField = {
  id: f('mesh_ratio'), label: 'Mesh ratio', kind: 'select',
  showWhen: { field: f('graft_type'), equals: ['stsg_meshed'] },
  options: [{ value: '1.5', label: '1:1.5' }, { value: '2', label: '1:2' }, { value: '3', label: '1:3' }, { value: '4', label: '1:4 or more' }],
};
const REGION: EncounterField = {
  id: f('region'), label: 'Recipient region', kind: 'select', important: true,
  options: [
    { value: 'face', label: 'Face' },
    { value: 'scalp', label: 'Scalp' },
    { value: 'neck', label: 'Neck' },
    { value: 'hand', label: 'Hand / fingers' },
    { value: 'upper_limb', label: 'Upper limb' },
    { value: 'trunk', label: 'Trunk' },
    { value: 'perineum', label: 'Perineum / genitalia' },
    { value: 'lower_limb', label: 'Lower limb' },
    { value: 'foot', label: 'Foot' },
  ],
};
const OVER_JOINT: EncounterField = {
  id: f('over_joint'), label: 'Crosses a joint or flexion crease', kind: 'boolean',
};
const SITE: EncounterField = { id: f('site'), label: 'Recipient site (exact)', kind: 'text', placeholder: 'e.g. dorsum of right hand' };
const GRAFTED_AREA: EncounterField = {
  id: f('grafted_area'), label: 'Area grafted (or to be grafted)', kind: 'number', unit: 'cm2', min: 0, max: 20000,
  help: 'The denominator for graft take. Use the area recorded at surgery, not today\'s.',
};
const DONOR: EncounterField = {
  id: f('donor'), label: 'Donor site', kind: 'select',
  options: [
    { value: 'thigh', label: 'Thigh (STSG)' },
    { value: 'buttock', label: 'Buttock (STSG)' },
    { value: 'scalp', label: 'Scalp (STSG — hidden, heals fast)' },
    { value: 'arm', label: 'Upper arm (STSG)' },
    { value: 'trunk', label: 'Trunk / back (STSG)' },
    { value: 'post_auricular', label: 'Post-auricular (FTSG)' },
    { value: 'supraclavicular', label: 'Supraclavicular (FTSG)' },
    { value: 'groin', label: 'Groin (FTSG)' },
    { value: 'inner_arm', label: 'Inner arm (FTSG)' },
    { value: 'eyelid', label: 'Upper eyelid / pre-auricular (FTSG)' },
  ],
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The graft',
  intent: 'Recorded once (pre-operatively or from the operation note) and carried forward to later reviews.',
  fields: [GRAFT_TYPE, MESH_RATIO, REGION, OVER_JOINT, SITE, GRAFTED_AREA, DONOR],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const PLANNING: EncounterSection = {
  id: f('planning'),
  title: 'Recipient bed and graft planning',
  intent: 'A graft takes only on a vascular, clean bed held still against it.',
  fields: [
    {
      id: f('indication'), label: 'Indication', kind: 'select', important: true,
      options: [
        { value: 'burn', label: 'Burn' },
        { value: 'trauma', label: 'Traumatic skin loss' },
        { value: 'chronic_wound', label: 'Chronic wound / ulcer' },
        { value: 'post_excision', label: 'After tumour / lesion excision' },
        { value: 'contracture_release', label: 'After contracture release' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: f('bed'), label: 'Recipient bed', kind: 'select', important: true,
      options: [
        { value: 'healthy_granulation', label: 'Healthy, flat, red granulation' },
        { value: 'fresh_surgical', label: 'Fresh surgical bed (excision / release)' },
        { value: 'sloughy', label: 'Slough or unhealthy granulation', flag: 'amber', flagReason: 'Bed not ready: further debridement / NPWT before grafting.' },
        { value: 'infected', label: 'Infected', flag: 'red', flagReason: 'Do not graft an infected bed: treat the infection and re-assess.' },
        { value: 'bare_structures', label: 'Bare bone, tendon or cartilage (no periosteum / paratenon / perichondrium)', flag: 'red',
          flagReason: 'A graft will not take on bare bone, tendon or cartilage: plan a flap, or a dermal template where available.' },
        { value: 'irradiated', label: 'Irradiated bed', flag: 'amber', flagReason: 'Irradiated beds take grafts poorly: consider a flap.' },
      ],
    },
    {
      id: f('bioburden'), label: 'Bed microbiology', kind: 'select',
      options: [
        { value: 'not_tested', label: 'Not tested' },
        { value: 'no_growth', label: 'No significant growth' },
        { value: 'colonised', label: 'Mixed growth / colonised' },
        { value: 'beta_strep', label: 'Beta-haemolytic Streptococcus', flag: 'red',
          flagReason: 'Beta-haemolytic Streptococcus (group A in particular) lyses grafts: treat and re-culture before grafting.' },
        { value: 'high_count', label: 'Quantitative culture 10^5 organisms per gram or more', flag: 'amber',
          flagReason: '10^5 organisms per gram of tissue or more predicts graft failure (Robson & Krizek): reduce bioburden first.' },
      ],
    },
    {
      id: f('donor_availability'), label: 'Donor skin', kind: 'select',
      options: [
        { value: 'ample', label: 'Ample' },
        { value: 'limited', label: 'Limited (large burns, previous harvests)', flag: 'amber',
          flagReason: 'Limited donor skin: plan meshing, staged harvesting or skin substitutes.' },
      ],
    },
    {
      id: f('fixation_plan'), label: 'Planned fixation', kind: 'multiselect',
      options: [
        { value: 'tie_over', label: 'Tie-over bolster' },
        { value: 'npwt', label: 'NPWT over the graft' },
        { value: 'splint', label: 'Splint (position of safety / anti-contracture)' },
        { value: 'staples_sutures', label: 'Staples / sutures / glue' },
        { value: 'pressure_dressing', label: 'Pressure dressing' },
      ],
    },
    {
      id: f('can_immobilise'), label: 'Can the patient keep the graft still until the first inspection?', kind: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'doubtful', label: 'Doubtful (child, confusion, occupation, mobility)', flag: 'amber',
          flagReason: 'If the graft cannot be kept still, shear will lift it: splint, NPWT or admission until the first inspection.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const TAKE: EncounterSection = {
  id: f('take'),
  title: 'Graft take and donor site',
  intent: 'Take against the area grafted at surgery; loss explained by its cause.',
  fields: [
    { id: f('inspected'), label: 'Graft inspected today', kind: 'boolean', important: true },
    { id: f('current_area'), label: 'Grafted region today', kind: 'number', unit: 'cm2', min: 0, max: 20000 },
    { id: f('adherent_pct'), label: 'Pink, adherent graft (% of the region)', kind: 'number', unit: '%', min: 0, max: 100, important: true },
    { id: f('nonviable_pct'), label: 'Lost, non-adherent or necrotic (% of the region)', kind: 'number', unit: '%', min: 0, max: 100 },
    {
      id: f('appearance'), label: 'Graft appearance', kind: 'multiselect',
      options: [
        { value: 'pink_adherent', label: 'Pink and adherent' },
        { value: 'pale', label: 'Pale / white' },
        { value: 'fluid_under', label: 'Fluid or clot under the graft', flag: 'amber',
          flagReason: 'Haematoma or seroma under a graft is the commonest cause of loss: evacuate it now (roll, or nick and express).' },
        { value: 'lifting', label: 'Lifting / shearing', flag: 'amber', flagReason: 'Shear is lifting the graft: re-immobilise and check the fixation.' },
        { value: 'dusky', label: 'Dusky / purple', flag: 'amber', flagReason: 'A dusky graft may be failing: look for fluid under it, pressure or infection.' },
        { value: 'black', label: 'Black / dry (non-viable)' },
        { value: 'purulent', label: 'Pus or malodour', flag: 'amber', flagReason: 'Infected graft: culture, remove non-adherent graft, antimicrobial dressing; antibiotics if spreading.' },
      ],
    },
    {
      id: f('loss_cause'), label: 'Cause of any graft loss', kind: 'multiselect',
      visibleWhen: a => (Number(a[f('adherent_pct')] ?? 100) < 100) || (Array.isArray(a[f('appearance')]) && (a[f('appearance')] as string[]).some(v => v !== 'pink_adherent')),
      options: [
        { value: 'haematoma', label: 'Haematoma' },
        { value: 'seroma', label: 'Seroma' },
        { value: 'shear', label: 'Shear / movement' },
        { value: 'infection', label: 'Infection' },
        { value: 'poor_bed', label: 'Poor bed' },
        { value: 'pressure', label: 'Pressure' },
        { value: 'patient', label: 'Patient factors (smoking, nutrition, glucose)' },
      ],
    },
    {
      id: f('donor_status'), label: 'Donor site', kind: 'select', important: true,
      options: [
        { value: 'intact_dressing', label: 'Dressing intact, comfortable' },
        { value: 'healing', label: 'Healing / epithelialising' },
        { value: 'healed', label: 'Healed' },
        { value: 'painful', label: 'Very painful', flag: 'amber', flagReason: 'Donor-site pain is often worse than the graft site: review analgesia and the dressing.' },
        { value: 'infected', label: 'Infected', flag: 'amber', flagReason: 'Infected donor site: swab, change the dressing, antibiotics if cellulitis — infection can deepen it to full thickness.' },
        { value: 'deep', label: 'Not healing / converted to full thickness', flag: 'amber', flagReason: 'Donor site not healing: treat as a wound; it may need grafting itself.' },
      ],
    },
    {
      id: f('immobilisation'), label: 'Immobilisation / splint', kind: 'select',
      options: [
        { value: 'maintained', label: 'Maintained' },
        { value: 'not_maintained', label: 'Not maintained', flag: 'amber', flagReason: 'Immobilisation not maintained: shear risk — re-splint and explain why.' },
        { value: 'not_needed', label: 'Not needed now' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const MATURATION: EncounterSection = {
  id: f('maturation'),
  title: 'Graft maturation, scar and function',
  fields: [
    { id: f('stable_take_pct'), label: 'Stable, healed graft (% of the area grafted)', kind: 'number', unit: '%', min: 0, max: 100, important: true },
    {
      id: f('contracture'), label: 'Contracture', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'mild', label: 'Mild — full range with stretching' },
        { value: 'restricting', label: 'Restricting movement', flag: 'amber', flagReason: 'Contracture restricting movement: splinting and therapy now; release if established.' },
      ],
    },
    { id: f('rom'), label: 'Range of movement of nearby joints', kind: 'text', placeholder: 'e.g. wrist extension 40 degrees' },
    {
      id: f('scar'), label: 'Graft margins and donor-site scar', kind: 'select',
      options: [
        { value: 'flat', label: 'Flat, maturing' },
        { value: 'hypertrophic', label: 'Hypertrophic', flag: 'amber', flagReason: 'Hypertrophic scarring: silicone, pressure and massage; score it on the Scar Monitor.' },
        { value: 'keloid', label: 'Keloid', flag: 'amber', flagReason: 'Keloid: intralesional steroid and the Keloid Care pathway; avoid further surgery on it without adjuvant treatment.' },
      ],
    },
    {
      id: f('pigmentation'), label: 'Colour', kind: 'select',
      options: [
        { value: 'matched', label: 'Well matched' },
        { value: 'hyper', label: 'Darker (hyperpigmented)' },
        { value: 'hypo', label: 'Lighter (hypopigmented)' },
        { value: 'mixed', label: 'Mixed' },
      ],
    },
    {
      id: f('itch'), label: 'Itch', kind: 'select',
      options: [{ value: 'none', label: 'None' }, { value: 'mild', label: 'Mild' }, { value: 'troublesome', label: 'Troublesome / disturbs sleep' }],
    },
    { id: f('dryness'), label: 'Dry, cracking graft', kind: 'boolean' },
    {
      id: f('fragile'), label: 'Blisters or breakdown on the graft', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Fragile graft breaking down: protect from friction; non-adherent dressing until healed; look for an underlying cause.' },
    },
    {
      id: f('sun_protection'), label: 'Protecting the graft from sun', kind: 'select',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    },
    {
      id: f('garment'), label: 'Pressure garment', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'using', label: 'Wearing as advised' },
        { value: 'not_using', label: 'Prescribed but not wearing', flag: 'amber', flagReason: 'Pressure garment not worn: find out why (heat, fit, cost) — it only works when worn most of the day.' },
      ],
    },
    {
      id: f('donor_long_term'), label: 'Donor site now', kind: 'select',
      options: [
        { value: 'healed', label: 'Healed, acceptable' },
        { value: 'hypertrophic', label: 'Hypertrophic / keloid' },
        { value: 'pigment', label: 'Colour change' },
        { value: 'unhealed', label: 'Not healed', flag: 'amber', flagReason: 'Donor site still open: manage as a wound.' },
      ],
    },
  ],
};

// ── Score: graft take, with the skin-graft domain's estimator ───────────────

/** The expected take, as the STSG education record (BURNS-001) states it. */
const EXPECTED = 'Education record BURNS-001: 80–95% take expected';

/** Graft take from the clinician's observation, as estimateGraftTake computes it. */
export const graftTakeScore: ScoreRule = ({ phase, answers, prior }) => {
  if (phase !== 'post_op') return null;
  const adherent = numOf(answers, f('adherent_pct'));
  if (adherent == null) return null;
  const nonviable = numOf(answers, f('nonviable_pct')) ?? Math.max(0, 100 - adherent);
  const baseline = numOf(answers, f('grafted_area'))
    ?? prior.map(p => numOf(p.answers, f('grafted_area'))).find(v => v != null) ?? null;
  const current = numOf(answers, f('current_area')) ?? baseline;
  // Clinician observation at the bedside: there is no image-quality penalty to apply.
  const est = estimateGraftTake(current, baseline, { granulationPct: adherent, epithelialPct: 0, sloughPct: nonviable, necroticPct: 0 }, 100);
  const take = est.takePercent ?? adherent;
  const within = take >= 80;
  return {
    id: `${ID}.take`, name: 'Graft take', abbreviation: 'Take %', total: take, max: 100, lowerIsWorse: true,
    band: {
      label: within ? 'Within the expected range' : 'Below the expected range',
      level: within ? 'none' : take >= 50 ? 'moderate' : 'high',
      interpretation: `${take}% take${est.takePercent != null ? ` (${est.viableAreaCm2} of ${baseline} cm2)` : ' (clinician estimate — no grafted area recorded)'}. ${EXPECTED}.`,
    },
    incomplete: baseline == null ? ['Area grafted at surgery'] : [],
    source: 'skin-graft/graftAnalysis.estimateGraftTake (clinician-observed tissue breakdown)',
    flag: within ? undefined : { level: 'amber', reason: `Graft take ${take}% is below the 80–95% usually expected: find the cause and plan for the lost area.` },
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => ({
  problem: {
    goals: [
      L('Durable, stable cover of the defect with complete graft take', 'Purpose of skin grafting'),
      L('Function and contour preserved — no contracture', 'Grafts contract; prevention starts at surgery'),
      L('A healed, comfortable donor site', 'The donor site is a second wound'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const bed = a[f('bed')];
  const type = a[f('graft_type')];
  const region = a[f('region')];
  const functional = isYes(a, f('over_joint')) || isOneOf(a, f('region'), 'face', 'neck', 'hand');
  return merge(
    bed === 'sloughy' && { problem: { treatment: [L('Prepare the bed before grafting: debridement and / or NPWT until there is clean, flat granulation', 'Recipient bed sloughy / unhealthy', 'urgent')] } },
    bed === 'infected' && { problem: { treatment: [L('Treat the bed infection (debridement, antimicrobial dressings, antibiotics if spreading) and re-assess before grafting', 'Recipient bed infected', 'urgent')] } },
    bed === 'bare_structures' && { problem: { treatment: [L('A graft will not take here: plan flap cover (or a dermal template where available)', 'Bare bone / tendon / cartilage without its vascular covering', 'urgent')] } },
    bed === 'irradiated' && { problem: { treatment: [L('Consider flap cover: irradiated beds take grafts poorly', 'Irradiated recipient bed')] } },
    isOneOf(a, f('bioburden'), 'beta_strep') && { problem: { treatment: [L('Treat the beta-haemolytic Streptococcus (systemic antibiotics per local policy) and re-culture; defer grafting until cleared', 'Beta-haemolytic Streptococcus on the bed', 'urgent')] } },
    isOneOf(a, f('bioburden'), 'high_count') && { problem: { treatment: [L('Reduce bioburden (debridement, topical antimicrobials) before grafting', '10^5 organisms per gram or more (Robson & Krizek)')] } },
    isOneOf(a, f('bioburden'), 'not_tested') && bed !== 'fresh_surgical' && { problem: { investigations: [L('Tissue culture of the recipient bed', 'Granulating bed not yet cultured')] } },
    functional && type === 'stsg_meshed' && { problem: { treatment: [L('Over joints, hands, face and neck prefer a sheet or full-thickness graft: meshed grafts contract more and look worse', 'Meshed graft planned for a functional / aesthetic area')] } },
    type === 'ftsg' && { problem: { treatment: [L('Full-thickness graft: defat thoroughly; close the donor site directly; tie-over bolster', 'Full-thickness graft planned')] } },
    (type === 'stsg_sheet' || type === 'stsg_meshed') && { general: [G('Wound care and dressings', L('Donor site: infiltrate (dilute adrenaline) for haemostasis; cover with a moist dressing (e.g. alginate, foam or film) left undisturbed until it separates, usually 10–14 days, unless soaked or infected', 'Split-thickness donor site'))] },
    { general: [G('Wound care and dressings', L('Immobilise the graft (bolster, NPWT or splint), elevate the part and avoid shear until the first inspection', 'Graft take needs contact without movement'))] },
    isOneOf(a, f('can_immobilise'), 'doubtful') && { problem: { treatment: [L('Admit or splint until the first graft inspection; NPWT fixation helps where movement cannot be prevented', 'Immobilisation doubtful')] } },
    isOneOf(a, f('donor_availability'), 'limited') && { problem: { treatment: [L('Stage the grafting: prioritise functional areas; mesh or use skin substitutes; re-harvest healed donor sites', 'Limited donor skin (ISBI 2016)')] } },
    (functional || isOneOf(a, f('indication'), 'burn', 'contracture_release')) && { general: [G('Rehabilitation (physiotherapy / OT)', L('Splint in the anti-contracture position from surgery; therapy referral before the operation', `Graft ${functional ? 'over a functional area' : 'for a burn / contracture'} (ISBI 2016)`))] },
    region === 'lower_limb' || region === 'foot'
      ? { general: [G('Rehabilitation (physiotherapy / OT)', L('Lower-limb graft: elevation, then graduated mobilisation with compression bandaging as the operating surgeon directs', 'Lower-limb graft'))] }
      : null,
    { general: [G('Analgesia', L('Donor-site pain is often worse than the graft site: plan local anaesthetic at the donor site and regular analgesia', 'Donor-site pain affects most patients (procedure education record)'))] },
    { counselling: [
      P('Skin graft', 'What a graft is, where the donor skin comes from, how long the dressings stay on, and why the graft must be kept still.', 'Skin graft consent'),
      P('Appearance', 'The graft will differ in colour and texture from the surrounding skin; meshed grafts keep a mesh pattern.', 'Colour mismatch is common (procedure education record)'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const look = chosen(a, f('appearance'));
  const cause = chosen(a, f('loss_cause'));
  const take = ctx.scores[`${ID}.take`];
  return merge(
    (look.includes('fluid_under') || cause.includes('haematoma') || cause.includes('seroma')) && { problem: { treatment: [L('Evacuate fluid under the graft now (roll it out, or nick and express) and re-apply pressure', 'Haematoma / seroma under the graft', 'urgent')] } },
    (look.includes('lifting') || cause.includes('shear') || isOneOf(a, f('immobilisation'), 'not_maintained')) && { problem: { treatment: [L('Re-immobilise: check the bolster, splint or NPWT seal; explain why movement lifts the graft', 'Shear / movement')] } },
    (look.includes('purulent') || cause.includes('infection')) && { problem: {
      investigations: [L('Swab / tissue culture of the graft bed', 'Infected graft')],
      treatment: [L('Remove non-adherent graft and slough; antimicrobial dressing; systemic antibiotics if cellulitis or systemic signs', 'Infected graft', 'urgent')],
    } },
    look.includes('black') && { problem: { treatment: [L('Debride non-viable graft once demarcated and plan regrafting', 'Non-viable graft')] } },
    take?.total != null && take.total < 80 && { problem: { treatment: [L('Plan for the lost area: small losses may heal from graft islands and edges; larger ones need regrafting once the bed is clean', `Graft take ${take.total}%`)] } },
    isOneOf(a, f('donor_status'), 'infected') && { problem: { treatment: [L('Donor site: swab, change to an antimicrobial dressing, antibiotics if cellulitis', 'Infected donor site')] } },
    isOneOf(a, f('donor_status'), 'deep') && { problem: { treatment: [L('Manage the donor site as a wound; graft it if it will not heal', 'Donor site not healing')] } },
    isOneOf(a, f('donor_status'), 'intact_dressing', 'healing') && { general: [G('Wound care and dressings', L('Leave the donor dressing undisturbed until it separates (about 10–14 days) unless it is soaked, smelly or painful', 'Donor site healing'))] },
    { dischargeCriteria: [
      'Graft inspected and adherent, or a plan in place for any lost area',
      'Donor site comfortable on oral analgesia',
      'Patient / carer can protect the graft (splint, elevation) and knows the dressing plan',
    ] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('contracture'), 'restricting') && { problem: {
      treatment: [L('Splint in the anti-contracture position, stretching and scar massage; plan release (Z-plasty, graft or flap) if the contracture is established', 'Contracture restricting movement')],
      referrals: [L('Hand / burns therapist (physiotherapy / OT)', 'Contracture')],
    } },
    isOneOf(a, f('contracture'), 'mild') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Daily stretching exercises; night splint if it tightens', 'Mild contracture'))] },
    isOneOf(a, f('scar'), 'hypertrophic') && { problem: { treatment: [L('Silicone gel or sheet 12–24 hours a day for at least 2–3 months, massage, and pressure garments for burn scars; intralesional triamcinolone if it persists', 'Hypertrophic scar (Monstrey 2014 scar management guidelines)')] } },
    isOneOf(a, f('scar'), 'keloid') && { problem: { treatment: [L('Keloid: intralesional triamcinolone series (Keloid Care pathway); do not excise without adjuvant treatment', 'Keloid (Monstrey 2014)')] } },
    isOneOf(a, f('garment'), 'not_using') && { counselling: [P('Pressure garment', 'Why the garment must be worn most of the day, how to wash it, and when to return for refitting.', 'Garment prescribed but not worn')] },
    isOneOf(a, f('sun_protection'), 'no') && { counselling: [P('Sun protection', 'Cover the graft and donor site or use SPF 30+ sunscreen for at least 12 months — grafts darken readily in the sun.', 'Not protecting from sun (procedure education record)')] },
    { general: [G('Patient education',
      L('Protect the graft and donor site from sun for at least 12 months (clothing, SPF 30+ sunscreen)', 'Grafts and donor sites pigment in the sun (procedure education record)'),
      L('Moisturise twice daily and massage once healed — grafts have no sweat or oil glands', 'Graft dryness'),
    )] },
    (isOneOf(a, f('itch'), 'troublesome')) && { general: [G('Analgesia', isUnder(ctx.patient, 2, ctx.module)
      ? L('Itch: emollients, cool cotton clothing and nails kept short; no sedating antihistamine under 2 years — paediatric advice if it persists', 'Troublesome itch in a child under 2 (ISBI 2018; BNFc — sedating antihistamines contraindicated under 2)')
      : isChild(ctx.patient, ctx.module)
        ? L('Itch: emollients and an age-appropriate antihistamine at night (dosed by weight); gabapentinoids are not used in children without paediatric pain advice', 'Troublesome itch in a child (ISBI 2018; BNFc)')
        : L('Itch: emollients, a sedating antihistamine at night; consider a gabapentinoid for persistent post-burn itch', 'Troublesome itch (ISBI 2018)'))] },
    isYes(a, f('fragile')) && { problem: { treatment: [L('Protect the graft from friction; non-adherent dressing until the breakdown has healed', 'Fragile graft')] } },
    isOneOf(a, f('donor_long_term'), 'unhealed') && { problem: { treatment: [L('Manage the unhealed donor site as a wound', 'Donor site not healed')] } },
    hasAny(a, f('donor_long_term'), 'hypertrophic') && { problem: { treatment: [L('Donor-site hypertrophic scar: silicone and massage', 'Hypertrophic donor-site scar')] } },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const skinGraft: ProcedureModule = {
  id: ID,
  name: 'Skin grafting (split- or full-thickness)',
  summary: 'Split- and full-thickness skin grafts: bed readiness, graft choice, donor site, take, and long-term scar and contracture care.',
  group: 'reconstruction',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Skin graft',
  basis: [
    'BAPRAS professional standards for plastic surgery',
    'ISBI Practice Guidelines for Burn Care, Part 1 (2016) and Part 2 (2018)',
    'TIMERS (Atkin 2019) for recipient-bed preparation',
    'Robson MC, Krizek TJ. Predicting skin graft survival. J Trauma 1973;13:213-7',
    'Monstrey S et al. Updated scar management practical guidelines. J Plast Reconstr Aesthet Surg 2014;67:1017-25',
    'NICE NG89 VTE (plastic and reconstructive surgery); WHO 2016 SSI guideline; NICE NG125',
  ],
  catalog: {
    feeIds: ['intermediate-001', 'major-001'],
    educationId: 'WOUND-004',
    patientEducationIds: ['recon-skin-grafting'],
  },
  sections: {
    pre_op: [DETAILS, PLANNING],
    post_op: [DETAILS, TAKE],
    follow_up: [DETAILS, MATURATION],
  },
  // Core tetanus for a traumatic or burn wound (Green Book ch. 30).
  includeCore: { pre_op: ['tetanus'], follow_up: ['pressure'] },
  coreShowWhen: { 'core.tetanus': { field: f('indication'), equals: ['burn', 'trauma'] } },
  excludeCore: {},
  carryForward: [f('graft_type'), f('mesh_ratio'), f('region'), f('over_joint'), f('site'), f('grafted_area'), f('donor')],
  scores: [graftTakeScore],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Skin grafting (split- or full-thickness)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Close the wound with your own skin so it heals faster',
      'Reduce the risk of infection and of tight scarring',
      'Protect deeper structures and restore function',
    ],
    risks: [
      { name: 'Graft failure', description: 'Part or all of the graft may not take and may need regrafting', frequency: '5-20%' },
      { name: 'Haematoma or seroma', description: 'Blood or fluid collecting under the graft, which may need draining' },
      { name: 'Infection', description: 'Infection of the graft or donor site' },
      { name: 'Donor-site problems', description: 'Pain, slow healing, scarring or colour change where the skin was taken' },
      { name: 'Contracture', description: 'Tightening of the graft that can limit movement, sometimes needing therapy or further surgery' },
      { name: 'Colour and texture mismatch', description: 'The graft looks different from the surrounding skin' },
      { name: 'Thick or keloid scarring', description: 'At the graft edges or the donor site' },
      { name: 'Itch and dryness', description: 'Common while the graft matures' },
      { name: 'Altered sensation', description: 'The graft may feel numb or different' },
    ],
    alternatives: [
      'Dressings and healing by secondary intention (slower; more scarring and contracture for larger wounds)',
      'Negative-pressure wound therapy to prepare or shrink the wound',
      'A skin substitute or dermal template, where available',
      'A local or regional flap',
      'A different graft type (full- rather than split-thickness, or the reverse)',
    ],
    riskOfNotTreating: 'A large wound left to heal by itself may take many months, may become infected, and often heals with tight scarring (contracture) that limits movement; a wound that stays open for years can rarely turn cancerous (Marjolin ulcer).',
    anaesthesiaOptions: ['general', 'spinal', 'regional', 'local'],
    additionalProcedures: [
      'Taking skin from a donor site (usually the thigh for split grafts; behind the ear, the neck, the groin or the inner arm for full-thickness grafts)',
      'Removing dead or unhealthy tissue (debridement) at the same operation',
      'A return to theatre to drain a haematoma or to regraft areas that do not take',
      'Splinting of a nearby joint',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: false,
    counsellingTopics: [
      'Why the graft must be kept still, and for how long',
      'The donor site: pain, dressing, healing time and scar',
      'Colour and texture difference between the graft and the surrounding skin',
      'Sun protection for at least 12 months',
      'Scar care: moisturising, massage, silicone and pressure garments',
      'Contracture prevention: splints and exercises',
    ],
    modifiers: [
      { id: 'sg_bed', when: c => isOneOf(c.answers, f('bed'), 'sloughy', 'infected', 'irradiated'),
        text: 'Because the wound bed is not yet ideal, the graft is less likely to take fully, and grafting may need to wait or be repeated.',
        why: 'Recipient bed not ready / irradiated' },
      { id: 'sg_meshed_functional', when: c => c.answers[f('graft_type')] === 'stsg_meshed' && (isYes(c.answers, f('over_joint')) || isOneOf(c.answers, f('region'), 'face', 'neck', 'hand')),
        text: 'A meshed graft over a joint, the hand, face or neck contracts more and keeps a mesh pattern.',
        why: 'Meshed graft over a functional / aesthetic area' },
      { id: 'sg_donor_limited', when: c => isOneOf(c.answers, f('donor_availability'), 'limited'),
        text: 'Because donor skin is limited, grafting may be done in stages and donor sites may be reused.',
        why: 'Limited donor skin' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Day 3–7 after surgery', purpose: 'First graft inspection (earlier if pain, fever, odour or discharge)' }],
    post_op: [
      { when: 'Day 3–7', purpose: 'First graft inspection, earlier if pain, fever, odour or discharge' },
      { when: 'Day 10–14', purpose: 'Donor-site review; remove sutures / staples' },
      { when: 'Weeks 2–3', purpose: 'Graft stable: start moisturising and massage once healed' },
    ],
    follow_up: [
      { when: '3 months', purpose: 'Scar and contracture review (Scar Monitor)' },
      { when: '6 and 12 months', purpose: 'Maturation, pigmentation, need for scar treatment or revision' },
    ],
  },
  handoffs: [
    { label: 'Skin Graft Monitor (take and donor-site photographs)', route: '/skin-graft', phases: ['post_op', 'follow_up'], when: 'Photographic take and donor re-epithelialisation' },
    { label: 'WoundProgress Monitor (recipient bed)', route: '/wound-monitor', phases: ['pre_op'], when: 'Measure the bed before grafting' },
    { label: 'Scar Monitor (POSAS / VSS)', route: '/scar-monitor', phases: ['follow_up'], when: 'Hypertrophic or keloid scarring' },
    { label: 'Keloid Care', route: '/keloid-care', phases: ['follow_up'], when: 'Keloid at the graft edge or donor site' },
    { label: 'NPWT', route: '/npwt', phases: ['pre_op', 'post_op'], when: 'Bed preparation or graft fixation' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate for the family' },
  ],
};

/** Exposed for tests. */
export const SKIN_GRAFT_FIELDS = { GRAFT_TYPE, REGION, GRAFTED_AREA };
