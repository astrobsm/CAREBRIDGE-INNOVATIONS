/**
 * Release of burn and post-traumatic scar contractures, with Z-plasty /
 * multiple Z-plasties / five-flap plasty, skin graft, local or perforator
 * flap, or dermal substitute.
 *
 * Pre-operative: the joint and its measured range (the baseline every later
 * review is compared against), scar maturity, the indications that cannot
 * wait (ectropion with exposure, microstomia, a neck contracture that
 * threatens the airway, growth disturbance in a child, an unstable scar),
 * joint changes, shortened nerves and vessels in long-standing contractures,
 * and whether splints and therapy can actually be provided. Post-operative:
 * cover, splint position, distal neurovascular status. Follow-up: range
 * gained or lost, recurrence, splint / garment adherence, and the scar scored
 * on the Vancouver Scar Scale.
 *
 * The VSS is the scar module's own instrument (scar/data/scales.ts): its
 * items become the form fields and it is scored with the same scoreScale, so
 * the wording and the arithmetic cannot drift. Graft take detail belongs to
 * the skin-graft review; this module records the cover only in outline.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import { getScale } from '../../../../scar/data/scales';
import { instrumentFields, responsesFrom, scoreInstrument, type ScreeningInstrument } from '../../scores/instrument';
import type { ComputedScore, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'contracture_release';
const f = (id: string) => `${ID}.${id}`;

const ISBI_2018 = 'ISBI Practice Guidelines for Burn Care, Part 2 (Burns 2018;44:1617-1706) — rehabilitation and reconstruction';

// ── The Vancouver Scar Scale, from the scar module ──────────────────────────

const VSS_DEF = getScale('vss')!;
/** The scar module's VSS presented through the screening-instrument helpers. It has no published severity bands. */
const VSS: ScreeningInstrument = {
  id: VSS_DEF.id, name: VSS_DEF.name, abbreviation: VSS_DEF.abbreviation, version: VSS_DEF.version,
  items: VSS_DEF.items, totalRange: VSS_DEF.totalRange, lowerIsBetter: VSS_DEF.lowerIsBetter,
  citation: VSS_DEF.citation, notes: VSS_DEF.notes,
  bands: [],
  licence: 'Published clinical scale, reproduced from the Scar Monitor definition (scar/data/scales.ts).',
};
const VSS_PREFIX = f('vss');
const VSS_FIELDS: EncounterField[] = instrumentFields(VSS, VSS_PREFIX);

// ── Fields carried forward ──────────────────────────────────────────────────

const CAUSE: EncounterField = {
  id: f('cause'), label: 'Cause', kind: 'select', important: true,
  options: [
    { value: 'burn', label: 'Burn' },
    { value: 'trauma', label: 'Trauma / degloving' },
    { value: 'infection', label: 'Infection / necrotising soft-tissue infection' },
    { value: 'surgical', label: 'Previous surgery' },
    { value: 'other', label: 'Other' },
  ],
};
const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'eyelid', label: 'Eyelid (ectropion)' },
    { value: 'mouth', label: 'Mouth / lips (microstomia, lip eversion)' },
    { value: 'neck', label: 'Neck' },
    { value: 'axilla', label: 'Axilla' },
    { value: 'elbow', label: 'Elbow' },
    { value: 'wrist', label: 'Wrist' },
    { value: 'hand', label: 'Hand — dorsum / palm / first web' },
    { value: 'fingers', label: 'Fingers / web spaces' },
    { value: 'groin_perineum', label: 'Groin / perineum' },
    { value: 'knee', label: 'Knee / popliteal' },
    { value: 'ankle_foot', label: 'Ankle / foot / toes' },
  ],
};
const SIDE: EncounterField = {
  id: f('side'), label: 'Side', kind: 'select',
  options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'bilateral', label: 'Bilateral' }, { value: 'midline', label: 'Midline' }],
};
const PATTERN: EncounterField = {
  id: f('pattern'), label: 'Contracture pattern', kind: 'select',
  options: [
    { value: 'linear', label: 'Linear band (with lax tissue either side)' },
    { value: 'broad', label: 'Broad band / sheet' },
    { value: 'web', label: 'Web / syndactyly-like' },
  ],
};
const TECHNIQUE: EncounterField = {
  id: f('technique'), label: 'Release and cover (planned or performed)', kind: 'multiselect', important: true,
  options: [
    { value: 'z_plasty', label: 'Single Z-plasty' },
    { value: 'multiple_z', label: 'Multiple Z-plasties' },
    { value: 'five_flap', label: 'Five-flap (jumping-man) plasty' },
    { value: 'stsg', label: 'Incisional release + split-thickness graft' },
    { value: 'ftsg', label: 'Incisional release + full-thickness graft' },
    { value: 'local_flap', label: 'Local / perforator / pedicled flap' },
    { value: 'free_flap', label: 'Free flap' },
    { value: 'dermal_substitute', label: 'Dermal substitute + graft' },
    { value: 'distraction', label: 'Gradual distraction (external fixator) / serial casting' },
  ],
};
const ROM_PRE: EncounterField = {
  id: f('rom_arc_pre'), label: 'Active range of the main joint before release (arc)', kind: 'number', unit: 'degrees', min: 0, max: 360, important: true,
  help: 'Measured with a goniometer: the baseline every later review is compared against. For the neck, eyelid or mouth record the measure in the text field.',
};
const DEFICIT_PRE: EncounterField = { id: f('deficit_pre'), label: 'Deficit from full extension / abduction before release', kind: 'number', unit: 'degrees', min: 0, max: 180 };
const ROM_NOTE: EncounterField = { id: f('rom_note'), label: 'Joint and movement measured', kind: 'text', placeholder: 'e.g. shoulder abduction; inter-incisal opening 25 mm; chin–sternum 4 cm' };

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The contracture',
  intent: 'Recorded once, with the baseline range of movement, and carried forward.',
  fields: [CAUSE, SITE, SIDE, PATTERN, TECHNIQUE, ROM_NOTE, ROM_PRE, DEFICIT_PRE],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const ASSESSMENT: EncounterSection = {
  id: f('assessment'),
  title: 'Contracture assessment',
  intent: 'Timing, urgency, deep structures and the rehabilitation that will keep the release.',
  fields: [
    { id: f('scar_age_months'), label: 'Time since the injury', kind: 'number', unit: 'months', min: 0, max: 600 },
    {
      id: f('maturity'), label: 'Scar maturity', kind: 'select', important: true,
      options: [
        { value: 'mature', label: 'Mature (pale, soft, flat)' },
        { value: 'immature', label: 'Immature (red, raised, active)', flag: 'amber', flagReason: 'Releasing an immature scar risks recurrence: splint, pressure and therapy first, and release early only for a functional indication that cannot wait (ISBI 2018).' },
      ],
    },
    {
      id: f('urgent_indication'), label: 'Indications that cannot wait', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'ectropion', label: 'Ectropion with exposure keratitis / incomplete closure', flag: 'red', flagReason: 'Corneal exposure threatens sight: lubricate now, ophthalmology review, early eyelid release and graft.' },
        { value: 'microstomia', label: 'Microstomia limiting eating or oral hygiene', flag: 'amber', flagReason: 'Microstomia limiting eating: early commissure release; oral splint.' },
        { value: 'neck_airway', label: 'Neck contracture limiting airway / intubation', flag: 'red', flagReason: 'Neck contracture may make intubation impossible: senior anaesthetic airway plan (awake fibreoptic, or release under local / ketamine before intubation).' },
        { value: 'growth', label: 'Distorting growth in a child', flag: 'amber', flagReason: 'Contracture distorting growth: early release in children.' },
        { value: 'unstable', label: 'Unstable scar that keeps breaking down', flag: 'amber', flagReason: 'Unstable scar: release and resurface; biopsy any long-standing ulcer.' },
      ],
    },
    {
      id: f('scar_ulcer'), label: 'Ulcer within the scar', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'healing', label: 'Recent, healing' },
        { value: 'chronic', label: 'Present over 3 months, or raised / everted edge', flag: 'red', flagReason: 'Chronic ulcer in a burn scar: biopsy to exclude squamous cell carcinoma (Marjolin ulcer) before or at release.' },
      ],
    },
    {
      id: f('joint_changes'), label: 'Joint X-ray', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed (short-standing, passive range normal under the scar)' },
        { value: 'normal', label: 'Normal' },
        { value: 'changes', label: 'Subluxation, ankylosis or heterotopic bone', flag: 'amber', flagReason: 'Joint changes: skin release alone will not restore range — orthopaedic / hand-surgical procedures and realistic goals.' },
        { value: 'not_done', label: 'Needed, not done', flag: 'amber', flagReason: 'X-ray the joint before release in a long-standing contracture.' },
      ],
    },
    {
      id: f('longstanding_severe'), label: 'Severe, long-standing flexion contracture (nerves and vessels likely shortened)', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Shortened nerves and vessels may be stretched by full release: do not force full extension — gradual splinting or distraction.' },
    },
    {
      id: f('nv_pre'), label: 'Distal sensation and circulation before release', kind: 'select',
      options: [{ value: 'intact', label: 'Intact' }, { value: 'deficit', label: 'Pre-existing deficit (document)' }],
    },
    {
      id: f('therapy_access'), label: 'Splinting and therapy after release', kind: 'select', important: true,
      options: [
        { value: 'available', label: 'Therapist and splint materials available; patient can attend' },
        { value: 'limited', label: 'Limited (no thermoplastic, cannot attend therapy)', flag: 'amber', flagReason: 'Without splinting and therapy a released contracture recurs: plan plaster / improvised splints and a home programme taught before surgery.' },
      ],
    },
    ...VSS_FIELDS,
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const POST: EncounterSection = {
  id: f('post'),
  title: 'Cover, splint and the limb beyond the release',
  fields: [
    {
      id: f('cover_state'), label: 'Graft / flap cover', kind: 'select', important: true,
      help: 'Graft take detail: the skin-graft review; flap monitoring: the flap review.',
      options: [
        { value: 'healthy', label: 'Graft adherent / flaps viable' },
        { value: 'partial', label: 'Partial loss', flag: 'amber', flagReason: 'Partial loss of cover over a release: dress and regraft promptly — open areas contract.' },
        { value: 'lost', label: 'Major loss / flap tip necrosis over the joint', flag: 'red', flagReason: 'Major loss of cover over a released joint: debride and re-cover early to prevent recontracture.' },
      ],
    },
    {
      id: f('splint_post'), label: 'Splint', kind: 'select', important: true,
      options: [
        { value: 'correct', label: 'In the anti-contracture position, maintained' },
        { value: 'not_maintained', label: 'Not maintained / removed', flag: 'amber', flagReason: 'Splint not maintained: re-apply and find out why (pain, fit, understanding).' },
        { value: 'pressure', label: 'Causing pressure / skin marking', flag: 'amber', flagReason: 'Splint pressure: pad or remould today.' },
      ],
    },
    {
      id: f('nv_post'), label: 'Distal sensation and circulation after release', kind: 'select', important: true,
      options: [
        { value: 'intact', label: 'Intact / unchanged' },
        { value: 'impaired', label: 'New numbness, pallor or slow refill', flag: 'red', flagReason: 'New distal deficit after release: traction on shortened nerves or vessels — relax the splint to a less extended position now and review.' },
      ],
    },
    {
      id: f('therapy_started'), label: 'Therapy started', kind: 'select',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'Not yet' }],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const ROM_NOW: EncounterField = { id: f('rom_arc_now'), label: 'Active range of the same joint now (arc)', kind: 'number', unit: 'degrees', min: 0, max: 360, important: true };

const FU: EncounterSection = {
  id: f('fu'),
  title: 'Range of movement, recurrence, splints and scar',
  fields: [
    ROM_NOW,
    { id: f('deficit_now'), label: 'Deficit from full extension / abduction now', kind: 'number', unit: 'degrees', min: 0, max: 180 },
    {
      id: f('recurrence'), label: 'Recurrence', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'tightening', label: 'Tightening — range falling', flag: 'amber', flagReason: 'Recontracture developing: intensify splinting, stretching and pressure; review the therapy plan.' },
        { value: 'recurrent', label: 'Established recurrence', flag: 'amber', flagReason: 'Established recurrence: plan re-release with more durable cover (larger graft, FTSG, flap).' },
      ],
    },
    {
      id: f('splint_adherence'), label: 'Splint (night) and exercises', kind: 'select',
      options: [
        { value: 'yes', label: 'Doing as advised' },
        { value: 'partial', label: 'Partly' },
        { value: 'no', label: 'Not using', flag: 'amber', flagReason: 'Splint / exercises not used: the commonest cause of recurrence — find the barrier.' },
        { value: 'finished', label: 'Completed' },
      ],
    },
    {
      id: f('garment'), label: 'Pressure garment', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'using', label: 'Wearing most of the day' },
        { value: 'not_using', label: 'Prescribed, not wearing', flag: 'amber', flagReason: 'Garment not worn: ask why (heat, fit, cost); it works only when worn most of the day.' },
      ],
    },
    ...VSS_FIELDS,
  ],
};

// ── Scores ──────────────────────────────────────────────────────────────────

const priorVss = (prior: Parameters<ScoreRule>[0]['prior']) =>
  prior.flatMap(p => p.scores).find(s => s.id === `${ID}.vss` && s.total != null);

/** VSS with the scar module's own scorer, compared with the last recorded VSS of this module. */
export const vssScore: ScoreRule = ({ phase, answers, prior }) => {
  if (phase !== 'pre_op' && phase !== 'follow_up') return null;
  const r = scoreInstrument(VSS, responsesFrom(VSS, VSS_PREFIX, answers));
  if (r.total == null && r.incomplete.length === VSS.items.length) return null;
  const before = priorVss(prior);
  const delta = r.total != null && before?.total != null ? r.total - before.total : null;
  const out: ComputedScore = {
    id: `${ID}.vss`, name: VSS.name, abbreviation: 'VSS', total: r.total, max: 14,
    band: r.total == null ? null : {
      label: delta == null ? `${r.total}/14` : delta < 0 ? `${r.total}/14 — better by ${-delta}` : delta > 0 ? `${r.total}/14 — worse by ${delta}` : `${r.total}/14 — unchanged`,
      level: 'none',
      interpretation: 'The VSS has no published severity bands: follow the change for this scar over time (lower is better).',
    },
    incomplete: r.incomplete.map(i => VSS.items.find(x => x.id === i)?.label ?? i),
    source: `scar/data/scales VSS via scoreScale — ${VSS.citation.split('.')[0]}`,
    flag: delta != null && delta >= 2 ? { level: 'amber', reason: `VSS worse by ${delta} since the last review: active scarring — intensify scar management.` } : undefined,
  };
  return out;
};

/** Range gained: today's arc against the pre-operative baseline. Arithmetic on two goniometer readings. */
export const romGainScore: ScoreRule = ({ phase, answers, prior }) => {
  if (phase !== 'follow_up') return null;
  const now = numOf(answers, f('rom_arc_now'));
  const pre = numOf(answers, f('rom_arc_pre')) ?? prior.map(p => numOf(p.answers, f('rom_arc_pre'))).find(v => v != null) ?? null;
  if (now == null) return null;
  const gain = pre != null ? now - pre : null;
  return {
    id: `${ID}.rom_gain`, name: 'Range of movement gained since release', abbreviation: 'ROM gain', total: gain,
    band: gain == null ? null : {
      label: gain > 0 ? `+${gain} degrees` : `${gain} degrees`,
      level: gain > 0 ? 'none' : 'moderate',
      interpretation: `Active arc ${now} degrees now against ${pre} degrees before release.`,
    },
    incomplete: pre == null ? ['Pre-operative range'] : [],
    source: 'Goniometer readings: follow-up arc minus pre-operative arc',
    flag: gain != null && gain <= 0 ? { level: 'amber', reason: `No range gained since release (${gain} degrees): recurrence or a deep-structure limit.` } : undefined,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const child = (age: number | null) => age != null && age < 18;

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Full (or the best achievable) functional range of the joint, kept after healing', 'Purpose of contracture release'),
      L('Durable, supple cover of the released area without recontracture', 'Released tissue contracts again without adequate cover and splinting'),
      L('A patient who can keep up splinting, exercises and scar care at home', 'Recurrence follows when rehabilitation stops'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const urgent = chosen(a, f('urgent_indication'));
  const tech = chosen(a, f('technique'));
  return merge(
    isOneOf(a, f('maturity'), 'immature') && urgent.length === 0 && { problem: { treatment: [L(
      'Defer release until the scar matures (often 12 months or more after the injury): splint, pressure garment, silicone and stretching meanwhile',
      `Immature scar, no urgent indication (${ISBI_2018.split(' (')[0]})`)] } },
    urgent.includes('ectropion') && { problem: {
      treatment: [L('Lubricate the eye hourly (drops by day, ointment at night), moisture chamber; early eyelid release with full-thickness or thick split graft', 'Ectropion with corneal exposure', 'urgent')],
      referrals: [L('Ophthalmology today', 'Exposure keratitis risk', 'urgent')],
    } },
    urgent.includes('neck_airway') && { general: [G('Anaesthesia and theatre', L(
      'Senior anaesthetist airway plan for a neck contracture: awake fibreoptic intubation, or release under local anaesthetic / ketamine before intubation; difficult-airway trolley',
      'Neck contracture limiting airway access (DAS guidelines)', 'urgent'))] },
    urgent.includes('microstomia') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Oral commissure splint / mouth-stretching exercises after release', 'Microstomia'))] },
    isOneOf(a, f('scar_ulcer'), 'chronic') && { problem: { investigations: [L('Biopsy the ulcer edge and base before release (Marjolin ulcer); if malignant, manage through the oncology review and tumour board', 'Chronic ulcer within a burn scar', 'urgent')] } },
    isOneOf(a, f('joint_changes'), 'not_done') && { problem: { investigations: [L('X-ray of the joint (and the opposite side in a child) before release', 'Long-standing contracture')] } },
    isOneOf(a, f('joint_changes'), 'changes') && { problem: { referrals: [L('Orthopaedic / hand-surgical opinion: capsulotomy, tendon lengthening, excision of heterotopic bone or arthrodesis may be needed', 'Joint changes on X-ray')] } },
    isYes(a, f('longstanding_severe')) && { problem: { treatment: [L(
      'Release to the range the neurovascular structures allow at surgery (check distal perfusion before the tourniquet is released and after splinting); gain the rest with serial splinting or distraction',
      'Shortened nerves and vessels in a severe long-standing contracture')] } },
    hasAny(a, f('pattern'), 'linear') && !tech.some(t => ['z_plasty', 'multiple_z', 'five_flap'].includes(t)) && { problem: { treatment: [L('A linear band with lax tissue either side suits Z-plasty / multiple Z-plasties / five-flap plasty, which lengthen with local tissue and need no graft', 'Linear contracture band')] } },
    isOneOf(a, f('pattern'), 'broad') && { problem: { treatment: [L('A broad band needs incisional release with a graft (full-thickness or thick split-thickness for function), a dermal substitute, or a flap for the largest / most mobile areas', 'Broad contracture')] } },
    isOneOf(a, f('therapy_access'), 'limited') && { general: [G('Rehabilitation (physiotherapy / OT)', L(
      'Before surgery: teach the home exercise programme, make (or arrange) the splint — plaster of Paris or improvised splints where thermoplastic is unavailable — and agree who will supervise it locally',
      'Splinting / therapy limited'))] },
    !isOneOf(a, f('therapy_access'), 'limited') && { problem: { referrals: [L('Hand / burns therapist before surgery: splint planned in the anti-contracture position, exercise programme agreed', `Contracture release — rehabilitation is part of the operation (${ISBI_2018.split(' (')[0]})`)] } },
    child(ctx.patient.ageYears) && { counselling: [P('Growth', 'Scars do not grow as the child grows: contractures can come back and more releases may be needed until growth finishes.', 'Child with a contracture (ISBI 2018)')] },
    { counselling: [
      P('Contracture release', 'The operation releases the tight scar and covers the gap; the result is kept only by months of splinting, exercises and scar care at home.', 'Contracture release consent'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('nv_post'), 'impaired') && { problem: { treatment: [L('Relax the splint to a less extended position now and re-check distal sensation and perfusion within the hour; release dressings', 'New distal deficit after release', 'urgent')] } },
    isOneOf(a, f('cover_state'), 'partial') && { problem: { treatment: [L('Dress and regraft the lost area promptly — open areas over a release contract', 'Partial loss of cover')] } },
    isOneOf(a, f('cover_state'), 'lost') && { problem: { treatment: [L('Debride and re-cover the released joint early (regraft or flap)', 'Major loss of cover over the release', 'urgent')] } },
    isOneOf(a, f('splint_post'), 'not_maintained', 'pressure') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Re-fit the splint in the anti-contracture position today; pad pressure points; explain why it matters', `Splint: ${String(a[f('splint_post')]).replace(/_/g, ' ')}`))] },
    { general: [G('Rehabilitation (physiotherapy / OT)', L(
      'Continuous splinting in the anti-contracture position until the cover is stable, then night splinting with daytime active and passive exercises for several months',
      `After contracture release (${ISBI_2018.split(' (')[0]})`))] },
    isOneOf(a, f('therapy_started'), 'no') && { problem: { referrals: [L('Therapy review before discharge', 'Therapy not yet started')] } },
    { dischargeCriteria: [
      'Cover stable or a plan for any lost area',
      'Splint fitted, comfortable and the patient / carer can apply it',
      'Home exercise programme taught with teach-back',
    ] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const gain = ctx.scores[`${ID}.rom_gain`];
  const vss = ctx.scores[`${ID}.vss`];
  return merge(
    isOneOf(a, f('recurrence'), 'tightening') && { problem: { treatment: [L('Intensify night splinting, stretching and pressure therapy; therapy review within 2 weeks', 'Range falling — recontracture developing')] } },
    isOneOf(a, f('recurrence'), 'recurrent') && { problem: { treatment: [L('Plan re-release once the scar is mature, with more durable cover (full-thickness graft or flap) and a stronger splinting plan', 'Established recurrence')] } },
    gain?.total != null && gain.total <= 0 && !isOneOf(a, f('recurrence'), 'tightening', 'recurrent') && { problem: { investigations: [L('No range gained since release: examine for recontracture versus a joint / tendon limit (X-ray)', `ROM gain ${gain.total} degrees`)] } },
    isOneOf(a, f('splint_adherence'), 'no', 'partial') && { counselling: [P('Splint and exercises', 'Why the splint and exercises are what keep the joint straight, how long to continue, and what is making them hard to do.', 'Splint / exercises not fully used')] },
    isOneOf(a, f('garment'), 'not_using') && { counselling: [P('Pressure garment', 'The garment needs to be worn most of the day (about 23 hours) until the scar matures; report fit problems for refitting.', 'Garment not worn (ISBI 2018)')] },
    vss?.flag != null && { problem: { treatment: [L('Active scarring: silicone gel or sheet, pressure garment and massage; intralesional triamcinolone for persistent hypertrophic areas', `${vss.band?.label ?? 'VSS worse'} (Monstrey 2014)`)] } },
    child(ctx.patient.ageYears) && { problem: { monitoring: [L('Review the contracture at least yearly until growth is complete', 'Child — scars do not grow with the skeleton')] } },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const contractureRelease: ProcedureModule = {
  id: ID,
  name: 'Scar contracture release',
  summary: 'Burn and post-traumatic contracture release with Z-plasty, graft or flap: baseline and follow-up range of movement, urgency, joint changes, splints, therapy, garments and the Vancouver Scar Scale.',
  group: 'reconstruction',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Scar contracture',
  basis: [
    ISBI_2018,
    'ISBI Practice Guidelines for Burn Care (Burns 2016;42:953-1021)',
    VSS.citation,
    'Monstrey S et al. Updated scar management practical guidelines. J Plast Reconstr Aesthet Surg 2014;67:1017-25',
    'BAPRAS professional standards; Difficult Airway Society guidelines',
  ],
  catalog: {
    feeIds: ['intermediate-005', 'major-002', 'congenital-002'],
    educationId: 'RECON-001',
    patientEducationIds: ['contracture-release'],
  },
  sections: {
    pre_op: [DETAILS, ASSESSMENT],
    post_op: [DETAILS, POST],
    follow_up: [DETAILS, FU],
  },
  carryForward: [f('cause'), f('site'), f('side'), f('pattern'), f('technique'), f('rom_note'), f('rom_arc_pre'), f('deficit_pre')],
  scores: [vssScore, romGainScore],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Release of scar contracture',
    phases: ['pre_op'],
    intendedBenefits: [
      'Improve the movement and use of the joint',
      'Make daily activities, hygiene, eating or eye closure easier (as applies)',
      'Replace tight, unstable scar with more supple cover',
    ],
    risks: [
      { name: 'Incomplete correction', description: 'Full movement may not be achieved at once, especially when the joint itself is stiff' },
      { name: 'Donor-site problems', description: 'Pain, slow healing, scarring or colour change where skin is taken' },
      { name: 'Flap problems', description: 'Part of a Z-plasty or flap may lose its blood supply' },
      { name: 'Thick scarring', description: 'New scars can become thick (hypertrophic) or keloid' },
      { name: 'Long rehabilitation', description: 'Months of splints, exercises and pressure garments are needed to keep the result' },
      { name: 'Circulation problems after stretching', description: 'Rarely, stretching shortened vessels after release reduces blood flow beyond it' },
    ],
    alternatives: [
      'Continued splinting, stretching and pressure therapy without surgery (helps early or mild contractures)',
      'Serial casting or gradual distraction',
      'A different technique (Z-plasty, graft or flap)',
      'No treatment',
    ],
    riskOfNotTreating: 'The contracture is likely to stay or worsen; the joint may become permanently stiff, children\'s growth may be distorted, an unstable scar may keep breaking down and, rarely after many years, become cancerous.',
    anaesthesiaOptions: ['general', 'regional', 'spinal', 'local'],
    additionalProcedures: [
      'A skin graft from a donor site',
      'Splinting, sometimes with temporary wires to hold the joint',
      'Biopsy of any ulcer in the scar',
      'Further releases, especially in growing children',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: false,
    counsellingTopics: [
      'Splints: when, how long and how to look after them',
      'Daily exercises and therapy visits',
      'Pressure garments, silicone and scar massage',
      'The chance of recurrence and further surgery (more so in children)',
      'Sun protection of grafts and scars',
    ],
    modifiers: [
      { id: 'cr_immature', when: c => isOneOf(c.answers, f('maturity'), 'immature'),
        text: 'Because the scar is still active, the contracture is more likely to come back after release.',
        why: 'Immature scar' },
      { id: 'cr_joint', when: c => isOneOf(c.answers, f('joint_changes'), 'changes'),
        text: 'Because the joint itself has changed, releasing the skin may not restore full movement.',
        why: 'Joint changes on X-ray' },
      { id: 'cr_nv', when: c => isYes(c.answers, f('longstanding_severe')),
        text: 'Because the contracture has been present for a long time, the nerves and blood vessels may be short; the joint may be straightened gradually rather than all at once.',
        why: 'Long-standing severe contracture' },
      { id: 'cr_child', when: c => child(c.patient.ageYears),
        text: 'In a growing child the contracture often returns as they grow, so further operations are likely.',
        why: 'Child' },
      { id: 'cr_therapy', when: c => isOneOf(c.answers, f('therapy_access'), 'limited'),
        text: 'Without regular splinting and exercises after surgery the tightness is likely to return.',
        why: 'Limited access to therapy' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before surgery', purpose: 'Therapy assessment and splint planning' }],
    post_op: [
      { when: 'Day 5–7', purpose: 'Graft / flap check and splint review' },
      { when: 'Weeks 2–3', purpose: 'Start therapy; night splint; scar care once healed' },
    ],
    follow_up: [
      { when: '6 weeks and 3 months', purpose: 'Range of movement against baseline; splint and garment adherence; VSS' },
      { when: '6 and 12 months (yearly in children until growth ends)', purpose: 'Recurrence, scar maturation, need for revision' },
    ],
  },
  handoffs: [
    { label: 'Scar Monitor (VSS / POSAS with photographs)', route: '/scar-monitor', phases: ['pre_op', 'follow_up'], when: 'Photographic scar record and longitudinal scoring' },
    { label: 'Skin Graft Monitor', route: '/skin-graft', phases: ['post_op'], when: 'Graft take after release' },
    { label: 'Burns', route: '/burns', phases: ['pre_op', 'follow_up'], when: 'Burn history and rehabilitation' },
    { label: 'Keloid Care', route: '/keloid-care', phases: ['follow_up'], when: 'Keloid at the new scars' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate including splints and garments' },
  ],
};
