/**
 * Cutaneous melanoma — wide local excision with or without sentinel lymph
 * node biopsy.
 *
 * Pre-operative: how the diagnosis was made (excision biopsy, never a shave),
 * the primary's microstaging (Breslow, ulceration, mitoses, microsatellites),
 * the subtype and site — acral lentiginous melanoma of the sole and nail unit
 * is the commonest melanoma in Black African patients, usually presents late
 * and is often first treated as a "wound" or fungal nail — the nodes, symptoms
 * of spread, staging imaging, the margin by Breslow, the SLNB decision
 * (T1b and above) and whether lymphoscintigraphy is actually available.
 * Post-operative: WLE and SLNB histology, the SLNB basin. Follow-up: the
 * NCCN stage-based schedule, nodal ultrasound after a positive SLNB without
 * completion dissection (MSLT-II), oncology, self-examination.
 *
 * Staging and margins are the Tumour Board's own engines (AJCC 8 computeStage,
 * melanomaExcisionMargin), so the review and the MDT cannot disagree.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import { computeStage, type StageResult, type StagingInput } from '../../../../tumour-board/services/oncology/stagingEngine';
import { melanomaExcisionMargin } from '../../../../tumour-board/services/oncology/managementPlan';
import type { PlanContext, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { sunProtectionField } from './common';

const ID = 'melanoma_wle';
const f = (id: string) => `${ID}.${id}`;

// ── The primary (carried forward) ───────────────────────────────────────────

const SITE: EncounterField = {
  id: f('site'), label: 'Site of the primary', kind: 'select', important: true,
  options: [
    { value: 'head_neck', label: 'Head and neck' },
    { value: 'trunk', label: 'Trunk' },
    { value: 'upper_limb', label: 'Upper limb (not palm)' },
    { value: 'lower_limb', label: 'Lower limb (not sole)' },
    { value: 'plantar', label: 'Sole / heel / palm (acral)' },
    { value: 'subungual', label: 'Nail unit (subungual)' },
    { value: 'mucosal', label: 'Mucosal (oral, nasal, anorectal, vulvovaginal)', flag: 'amber', flagReason: 'Mucosal melanoma: different staging and surgery — refer to the relevant site MDT (NCCN Mucosal Melanoma).' },
  ],
};
const SITE_DETAIL: EncounterField = { id: f('site_detail'), label: 'Exact site and side', kind: 'text', placeholder: 'e.g. right heel, weight-bearing' };
const SUBTYPE: EncounterField = {
  id: f('subtype'), label: 'Subtype', kind: 'select',
  options: [
    { value: 'alm', label: 'Acral lentiginous' },
    { value: 'nodular', label: 'Nodular' },
    { value: 'ssm', label: 'Superficial spreading' },
    { value: 'lmm', label: 'Lentigo maligna / lentigo maligna melanoma' },
    { value: 'desmoplastic', label: 'Desmoplastic' },
    { value: 'amelanotic', label: 'Amelanotic' },
    { value: 'unknown', label: 'Not stated' },
  ],
};
const INVASION: EncounterField = {
  id: f('invasion'), label: 'Invasion', kind: 'select', important: true,
  options: [{ value: 'insitu', label: 'In situ (pTis)' }, { value: 'invasive', label: 'Invasive' }],
};
const BRESLOW: EncounterField = {
  id: f('breslow_mm'), label: 'Breslow thickness', kind: 'number', unit: 'mm', min: 0, max: 50, important: true,
  showWhen: { field: f('invasion'), equals: ['invasive'] },
  help: 'Recorded to 0.1 mm (AJCC 8). From the excision biopsy.',
  numericFlags: [
    { op: '>', value: 4, level: 'red', reason: 'Breslow over 4 mm: T4 (AJCC 8) — SLNB, consider staging imaging and oncology referral (NCCN; NICE NG14).' },
    { op: '>=', value: 0.8, level: 'amber', reason: 'Breslow 0.8 mm or more: at least T1b (AJCC 8) — discuss sentinel node biopsy (NCCN; NICE NG14).' },
  ],
};
const ULCERATION: EncounterField = {
  id: f('ulceration'), label: 'Histological ulceration', kind: 'select', important: true,
  showWhen: { field: f('invasion'), equals: ['invasive'] },
  options: [
    { value: 'no', label: 'Absent' },
    { value: 'yes', label: 'Present', flag: 'amber', flagReason: 'Ulceration up-stages the melanoma (T "b"; AJCC 8) and raises the chance of nodal disease.' },
  ],
};
const MITOSES: EncounterField = {
  id: f('mitoses'), label: 'Mitotic rate', kind: 'number', unit: '/mm2', min: 0, max: 100,
  showWhen: { field: f('invasion'), equals: ['invasive'] },
  help: 'Not in AJCC 8 T category, but NCCN records it; 2/mm2 or more is an adverse feature in thin melanoma.',
};
const MICROSAT: EncounterField = {
  id: f('microsatellites'), label: 'Microsatellites on histology', kind: 'boolean', showWhen: { field: f('invasion'), equals: ['invasive'] },
  flagWhenTrue: { level: 'red', reason: 'Microsatellites: at least N1c — stage III (AJCC 8).' },
};
const LVI: EncounterField = { id: f('lvi'), label: 'Lymphovascular invasion', kind: 'boolean', showWhen: { field: f('invasion'), equals: ['invasive'] } };
const TRANSECTED: EncounterField = {
  id: f('biopsy_transected'), label: 'Biopsy deep margin involved (Breslow may be under-estimated)', kind: 'boolean',
  flagWhenTrue: { level: 'amber', reason: 'Transected biopsy: Breslow is a minimum — plan margins and SLNB on the likely true thickness and the WLE histology.' },
};

const PRIMARY: EncounterSection = {
  id: f('primary'),
  title: 'The primary melanoma',
  intent: 'Microstaging from the excision biopsy; recorded once and carried forward.',
  fields: [SITE, SITE_DETAIL, SUBTYPE, INVASION, BRESLOW, ULCERATION, MITOSES, MICROSAT, LVI, TRANSECTED],
};

// ── Staging (nodes, spread) — asked pre-op and at follow-up ─────────────────

const NODES: EncounterField = {
  id: f('nodes'), label: 'Draining nodal basin(s) on examination', kind: 'select', important: true,
  options: [
    { value: 'normal', label: 'Examined — not palpable' },
    { value: 'palpable', label: 'Palpable / suspicious node', flag: 'red', flagReason: 'Clinically involved node: ultrasound-guided FNA / core biopsy and full staging; MDT before surgery (NCCN; NICE NG14).' },
    { value: 'not_examined', label: 'Not examined', flag: 'amber', flagReason: 'Examine the draining basin(s) — and the skin between the primary and the nodes for in-transit disease.' },
  ],
};
const NODE_FNA: EncounterField = {
  id: f('node_fna'), label: 'Node FNA / core biopsy', kind: 'select', showWhen: { field: f('nodes'), equals: ['palpable'] },
  options: [{ value: 'not_done', label: 'Not done' }, { value: 'negative', label: 'Negative' }, { value: 'positive', label: 'Melanoma' }],
};
const IN_TRANSIT: EncounterField = {
  id: f('in_transit'), label: 'Satellite or in-transit nodules', kind: 'boolean',
  flagWhenTrue: { level: 'red', reason: 'In-transit / satellite disease: stage III (N1c or higher, AJCC 8) — staging imaging and MDT.' },
};
const SYMPTOMS: EncounterField = {
  id: f('symptoms'), label: 'Symptoms or signs of spread', kind: 'multiselect',
  options: [
    { value: 'none', label: 'None' },
    { value: 'weight_loss', label: 'Unexplained weight loss' },
    { value: 'neuro', label: 'New headache, seizure or focal neurology', flag: 'red', flagReason: 'Possible brain metastasis: urgent MRI (or CT) brain (NCCN).' },
    { value: 'bone', label: 'Bone pain' },
    { value: 'chest', label: 'Cough, haemoptysis, breathlessness' },
    { value: 'abdomen', label: 'Hepatomegaly, jaundice, abdominal pain' },
    { value: 'skin_nodules', label: 'Distant skin / subcutaneous nodules' },
  ],
};
const DISTANT: EncounterField = {
  id: f('distant'), label: 'Distant metastasis', kind: 'select',
  options: [
    { value: 'none_known', label: 'None known (not imaged or imaging clear)' },
    { value: 'suspected', label: 'Suspected — imaging pending', flag: 'amber', flagReason: 'Suspected metastasis: complete staging before committing to wide excision and reconstruction.' },
    { value: 'confirmed', label: 'Confirmed', flag: 'red', flagReason: 'Stage IV melanoma: oncology-led MDT plan; surgery for the primary only if it helps.' },
  ],
};
const MET_SITES: EncounterField = {
  id: f('met_sites'), label: 'Metastatic sites', kind: 'multiselect', showWhen: { field: f('distant'), equals: ['confirmed'] },
  options: [
    { value: 'skin_soft_tissue_nodal', label: 'Distant skin, soft tissue or nodes' },
    { value: 'lung', label: 'Lung' },
    { value: 'visceral_non_cns', label: 'Other viscera' },
    { value: 'bone', label: 'Bone' },
    { value: 'cns', label: 'Brain / CNS' },
  ],
};
const LDH: EncounterField = {
  id: f('ldh'), label: 'Serum LDH', kind: 'select', showWhen: { field: f('distant'), equals: ['confirmed', 'suspected'] },
  options: [{ value: 'not_done', label: 'Not done' }, { value: 'normal', label: 'Normal' }, { value: 'raised', label: 'Above the laboratory upper limit' }],
};

const STAGING: EncounterSection = {
  id: f('staging'),
  title: 'Nodes and spread',
  intent: 'Clinical N and M before surgery; staged formally with AJCC 8.',
  fields: [NODES, NODE_FNA, IN_TRANSIT, SYMPTOMS, DISTANT, MET_SITES, LDH],
};

// ── Pre-operative plan ──────────────────────────────────────────────────────

const PLAN: EncounterSection = {
  id: f('plan'),
  title: 'Excision and sentinel node plan',
  fields: [
    {
      id: f('diagnosis_basis'), label: 'How the diagnosis was made', kind: 'select', important: true,
      options: [
        { value: 'excision_biopsy', label: 'Excision biopsy (2 mm margin)' },
        { value: 'incisional', label: 'Incisional / punch biopsy (large lesion, face, acral, nail matrix)' },
        { value: 'shave', label: 'Shave or curettage', flag: 'amber', flagReason: 'Shave / curettage biopsy: Breslow may be unreliable — review with the pathologist; plan on the worst case.' },
        { value: 'clinical_only', label: 'Clinical only — no histology yet', flag: 'red', flagReason: 'No histology: excision biopsy first — never a wide excision, flap or amputation on clinical grounds alone.' },
      ],
    },
    { id: f('margin_cm'), label: 'Planned clinical margin from the scar / lesion edge', kind: 'number', unit: 'cm', min: 0, max: 5, important: true,
      help: 'NCCN: in situ 0.5–1 cm; Breslow up to 1 mm 1 cm; over 1–2 mm 1–2 cm; over 2 mm 2 cm. Deep to fascia.' },
    {
      id: f('slnb'), label: 'Sentinel lymph node biopsy', kind: 'select', important: true,
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'planned', label: 'Offered and accepted — with lymphoscintigraphy' },
        { value: 'declined', label: 'Offered and declined' },
        { value: 'unavailable', label: 'Indicated but lymphoscintigraphy / gamma probe not available here', flag: 'amber',
          flagReason: 'SLNB unavailable: refer to a centre with nuclear medicine before the WLE, or agree nodal ultrasound surveillance — WLE and a flap first can disrupt lymphatic mapping.' },
      ],
    },
    {
      id: f('digit_level'), label: 'Nail-unit melanoma — planned operation', kind: 'select', showWhen: { field: f('site'), equals: ['subungual'] },
      options: [
        { value: 'nail_unit', label: 'Nail-unit (en bloc nail apparatus) excision and graft — in situ / very thin' },
        { value: 'dip', label: 'Amputation at the DIP / thumb or great-toe IP joint' },
        { value: 'proximal', label: 'More proximal amputation / ray' },
      ],
    },
    {
      id: f('reconstruction'), label: 'Planned closure of the WLE defect', kind: 'select',
      options: [
        { value: 'direct', label: 'Direct closure' },
        { value: 'graft', label: 'Skin graft' },
        { value: 'flap', label: 'Local / regional flap (e.g. medial plantar for the heel)' },
        { value: 'amputation', label: 'Closed with the amputation' },
      ],
    },
    {
      id: f('imaging'), label: 'Staging imaging', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated (stage 0–IIA, no symptoms)' },
        { value: 'requested', label: 'Requested', flag: 'amber', flagReason: 'Staging imaging pending: review before definitive surgery.' },
        { value: 'done_clear', label: 'Done — no metastasis' },
        { value: 'done_mets', label: 'Done — metastasis', flag: 'red', flagReason: 'Metastatic disease on imaging: oncology-led MDT before surgery.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const SLNB_RESULT: EncounterField = {
  id: f('slnb_result'), label: 'Sentinel node result', kind: 'select', important: true,
  options: [
    { value: 'not_done', label: 'Not done' },
    { value: 'pending', label: 'Pending' },
    { value: 'not_found', label: 'No sentinel node found' },
    { value: 'negative', label: 'Negative' },
    { value: 'positive', label: 'Positive', flag: 'red', flagReason: 'Positive sentinel node: stage III — MDT, oncology for adjuvant therapy, nodal ultrasound surveillance (MSLT-II; DeCOG-SLT).' },
  ],
};
const POSITIVE_NODES: EncounterField = {
  id: f('positive_nodes'), label: 'Number of positive sentinel nodes', kind: 'number', min: 1, max: 20, showWhen: { field: f('slnb_result'), equals: ['positive'] },
};
const WLE_RESULT: EncounterSection = {
  id: f('wle_result'),
  title: 'Wide local excision and sentinel node histology',
  fields: [
    {
      id: f('residual'), label: 'Residual melanoma in the WLE specimen', kind: 'select', important: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'none', label: 'None — scar only' },
        { value: 'insitu', label: 'Residual in situ' },
        { value: 'invasive', label: 'Residual invasive', flag: 'amber', flagReason: 'Residual invasive melanoma: re-stage on the deepest thickness and review the margin and SLNB decision.' },
      ],
    },
    {
      id: f('wle_margin'), label: 'WLE margins', kind: 'select',
      options: [
        { value: 'clear', label: 'Clear' },
        { value: 'involved', label: 'Involved', flag: 'red', flagReason: 'Involved WLE margin: re-excise (NCCN).' },
      ],
    },
    SLNB_RESULT,
    POSITIVE_NODES,
  ],
};
const BASIN: EncounterSection = {
  id: f('basin'),
  title: 'Sentinel node basin and the limb',
  intent: 'Only the parts the core post-operative review does not cover.',
  fields: [
    {
      id: f('basin_site'), label: 'SLNB basin', kind: 'select', showWhen: { field: f('slnb_result'), equals: ['pending', 'negative', 'positive', 'not_found'] },
      options: [
        { value: 'groin', label: 'Groin' }, { value: 'axilla', label: 'Axilla' }, { value: 'neck', label: 'Neck / parotid' }, { value: 'other', label: 'Other / multiple' },
      ],
    },
    {
      id: f('limb_swelling'), label: 'Swelling of the limb distal to the basin', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Early lymphoedema: measure, compression and the Lymphoedema module — earlier treatment works better.' },
    },
    {
      id: f('foot_wound'), label: 'Acral / weight-bearing reconstruction', kind: 'select', showWhen: { field: f('site'), equals: ['plantar', 'subungual'] },
      options: [
        { value: 'healing', label: 'Healing, offloaded' },
        { value: 'breakdown', label: 'Breakdown / graft loss on the weight-bearing surface', flag: 'amber', flagReason: 'Weight-bearing reconstruction breaking down: strict offloading and review of the reconstruction.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const SURVEILLANCE: EncounterSection = {
  id: f('surveillance'),
  title: 'Melanoma surveillance',
  intent: 'Scar, in-transit route, nodes, symptoms, a full skin examination — every visit.',
  fields: [
    {
      id: f('local'), label: 'Scar and surrounding skin', kind: 'select', important: true,
      options: [
        { value: 'clear', label: 'No recurrence' },
        { value: 'suspicious', label: 'Pigmented or skin-coloured nodule at / near the scar', flag: 'red', flagReason: 'Possible local, satellite or in-transit recurrence: biopsy and re-stage (NCCN).' },
      ],
    },
    { id: f('new_primary'), label: 'New suspicious pigmented lesion (full skin examination, soles and nails included)', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Possible second primary melanoma: excision biopsy with a 2 mm margin.' } },
    {
      id: f('adjuvant'), label: 'Adjuvant / systemic therapy', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'on_treatment', label: 'On treatment (oncology)' },
        { value: 'not_accessible', label: 'Indicated but not accessible (cost / availability)', flag: 'amber', flagReason: 'Adjuvant therapy indicated but unaffordable: social work, NHIA / charity / trial access; closer surveillance meanwhile.' },
      ],
    },
    { id: f('nodal_us'), label: 'Nodal-basin ultrasound surveillance', kind: 'select', showWhen: { field: f('slnb_result'), equals: ['positive'] },
      options: [{ value: 'up_to_date', label: 'Up to date' }, { value: 'overdue', label: 'Overdue / not done', flag: 'amber', flagReason: 'Positive SLNB without completion dissection relies on nodal ultrasound every 4 months for 2 years (MSLT-II).' }] },
    sunProtectionField(ID),
    { id: f('self_exam'), label: 'Self-examination (skin, scar, route to the nodes, nodes) taught and done monthly', kind: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No / not yet taught' }] },
  ],
};

// ── Stage (AJCC 8, the Tumour Board engine) ─────────────────────────────────

/** The staging input from the review's answers. */
export function melanomaStagingInput(a: EncounterAnswers): StagingInput {
  const slnb = a[f('slnb_result')];
  const fnaPos = isOneOf(a, f('node_fna'), 'positive');
  const slnbPos = slnb === 'positive' ? Math.max(1, numOf(a, f('positive_nodes')) ?? 1) : 0;
  const breslow = numOf(a, f('breslow_mm'));
  return {
    family: 'cutaneous_melanoma',
    basis: slnb === 'negative' || slnb === 'positive' ? 'pathological' : 'clinical',
    inSitu: isOneOf(a, f('invasion'), 'insitu'),
    breslowMm: breslow,
    ulceration: isOneOf(a, f('ulceration'), 'yes'),
    nodesInvolved: slnbPos + (fnaPos ? 1 : 0),
    nodesClinicallyDetected: fnaPos,
    inTransitOrSatellite: isYes(a, f('in_transit')) || isYes(a, f('microsatellites')),
    distantMets: isOneOf(a, f('distant'), 'confirmed') || isOneOf(a, f('imaging'), 'done_mets'),
    metSites: chosen(a, f('met_sites')) as StagingInput['metSites'],
    ldhElevated: isOneOf(a, f('ldh'), 'raised') ? true : isOneOf(a, f('ldh'), 'normal') ? false : null,
    histologyAvailable: !isOneOf(a, f('diagnosis_basis'), 'clinical_only'),
  };
}

export const stageOf = (a: EncounterAnswers): StageResult | null => {
  if (!isOneOf(a, f('invasion'), 'insitu', 'invasive')) return null;
  return computeStage(melanomaStagingInput(a));
};

const HIGH_RISK_STAGES = ['IIB', 'IIC', 'III', 'IIIA', 'IIIB', 'IIIC', 'IIID', 'IV'];

export const melanomaStageScore: ScoreRule = ({ answers }) => {
  const st = stageOf(answers);
  if (!st) return null;
  const level = st.stageGroup === 'IV' || st.stageGroup.startsWith('III') ? 'very_high'
    : ['IIB', 'IIC'].includes(st.stageGroup) ? 'high' : ['IIA', 'IB'].includes(st.stageGroup) ? 'moderate' : 'low';
  return {
    id: `${ID}.stage`, name: 'AJCC 8 melanoma stage', abbreviation: 'AJCC 8', total: null,
    band: { label: `${st.formatted}`, level, interpretation: `${st.stageDescription}${st.caveats.length ? ` ${st.caveats.join(' ')}` : ''}` },
    incomplete: isOneOf(answers, f('invasion'), 'invasive') && numOf(answers, f('breslow_mm')) == null ? ['Breslow thickness'] : [],
    source: 'Tumour Board stagingEngine.computeStage (AJCC 8th edition, chapter 47)',
    detail: st.caveats,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const stageWhy = (st: StageResult | null) => st ? `${st.formatted} (AJCC 8)` : 'Stage not yet assignable';

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Wide local excision with clear margins appropriate to Breslow thickness', 'Margin by Breslow lowers local recurrence (NCCN; NICE NG14; ESMO)'),
      L('Accurate staging: sentinel node biopsy when indicated, imaging when the stage requires it', 'Stage decides adjuvant therapy and follow-up (AJCC 8)'),
      L('Function preserved — walking for plantar and nail-unit melanoma', 'Acral melanoma surgery affects gait and hand use'),
      L('Stage-appropriate surveillance; the patient examines their skin, scar and nodes', 'Most recurrences are found by the patient or on examination (NCCN)'),
    ],
  },
});

const diagnosis: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('diagnosis_basis'), 'clinical_only') && { problem: { investigations: [L(
      isOneOf(a, f('site'), 'subungual')
        ? 'Nail-matrix biopsy (longitudinal excision or matrix punch through the origin of the band) by an experienced surgeon before any amputation'
        : isOneOf(a, f('site'), 'plantar', 'head_neck')
          ? 'Excision biopsy with a 2 mm margin; a full-thickness incisional biopsy of the thickest area is acceptable for a large acral or facial lesion'
          : 'Excision biopsy with a 2 mm clinical margin, full thickness into fat, oriented along the future WLE axis; no shave biopsy',
      'No histology yet (NCCN; BAD / UK melanoma guidelines)', 'urgent')] } },
    isOneOf(a, f('diagnosis_basis'), 'shave') && { problem: { investigations: [L('Ask the pathologist whether the base is involved; plan margins and SLNB on the worst-case thickness', 'Shave / curettage biopsy — Breslow may be unreliable')] } },
    isYes(a, f('biopsy_transected')) && { problem: { investigations: [L('Treat the recorded Breslow as a minimum; the WLE histology may up-stage the tumour — discuss SLNB on clinical thickness', 'Biopsy deep margin involved')] } },
    isOneOf(a, f('site'), 'mucosal') && { problem: { referrals: [L('Refer to the relevant site MDT (head and neck, gynaecology, colorectal): mucosal melanoma is not staged or excised like cutaneous melanoma', 'Mucosal melanoma (NCCN)', 'urgent')] } },
  );
};

const margins: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  if (!isOneOf(a, f('invasion'), 'insitu', 'invasive')) return null;
  const inSitu = isOneOf(a, f('invasion'), 'insitu');
  const breslow = numOf(a, f('breslow_mm'));
  const margin = melanomaExcisionMargin(breslow, inSitu);
  const planned = numOf(a, f('margin_cm'));
  const minimum = inSitu ? 0.5 : breslow == null ? null : breslow <= 2 ? 1 : 2;
  const why = inSitu ? 'Melanoma in situ' : breslow != null ? `Breslow ${breslow} mm` : 'Breslow not recorded';
  return merge(
    !inSitu && breslow == null
      ? { problem: { investigations: [L('Record the Breslow thickness from the biopsy report before setting the margin', 'Margin and SLNB depend on Breslow (NCCN; AJCC 8)', 'urgent')] } }
      : { problem: { treatment: [L(`Wide local excision with ${margin} clinical margins measured from the scar / lesion edge, down to (not including) the deep fascia; orientate the specimen`, `${why} (NCCN Melanoma: Cutaneous; ESMO 2019; NICE NG14)`)] } },
    isOneOf(a, f('subtype'), 'lmm') && { problem: { treatment: [L('Lentigo maligna: margins of 0.5 cm are often inadequate — staged excision with margin assessment (or radiotherapy / imiquimod if surgery is not possible)', 'Lentigo maligna subtype (NCCN; BAD)')] } },
    minimum != null && planned != null && planned < minimum && { cautions: [`Planned margin ${planned} cm is below the published ${margin} for ${why.toLowerCase()} — record the reason (anatomy, function) and discuss at MDT.`] },
    isOneOf(a, f('site'), 'subungual') && { problem: { treatment: [L(
      isOneOf(a, f('digit_level'), 'nail_unit')
        ? 'En bloc excision of the whole nail apparatus to the periosteum with a full-thickness graft — for in situ or very thin nail-unit melanoma only'
        : 'Amputation at the most distal level that gives a clear margin (usually the DIP joint, or the IP joint of the thumb / great toe) — more proximal amputation does not improve survival',
      'Subungual melanoma (NCCN; Moehrle 2003; functional-amputation series)')] } },
    isOneOf(a, f('site'), 'plantar') && { problem: { referrals: [L('Plan the weight-bearing reconstruction (graft over a non-weight-bearing area; medial plantar or other flap for the heel) in its own reconstruction review, with offloading and footwear', 'Acral plantar melanoma')] } },
  );
};

const sentinelNode: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const st = stageOf(a);
  if (!st || st.T === 'Tis' || st.T === 'TX' || st.M !== 'M0' || isOneOf(a, f('node_fna'), 'positive')) return null;
  const mitoses = numOf(a, f('mitoses'));
  const age = ctx.patient.ageYears;
  const t1aAdverse = [mitoses != null && mitoses >= 2 && 'mitoses 2/mm2 or more', isYes(a, f('lvi')) && 'lymphovascular invasion', age != null && age < 40 && 'age under 40'].filter(Boolean) as string[];
  const slnb = a[f('slnb')];
  const line = st.T === 'T1a'
    ? t1aAdverse.length
      ? L('Sentinel node biopsy may be considered: positivity is low (under 5%) but adverse features are present', `${stageWhy(st)}; ${t1aAdverse.join(', ')} (NCCN)`)
      : L('Sentinel node biopsy not recommended', `${stageWhy(st)} — sentinel node positivity under 5% (NCCN; NICE NG14)`)
    : st.T === 'T1b'
      ? L('Discuss and consider sentinel node biopsy (positivity about 5–10%)', `${stageWhy(st)} (NCCN; NICE NG14)`)
      : L('Offer sentinel node biopsy for staging and to guide adjuvant therapy', `${stageWhy(st)} — Breslow over 1 mm (NCCN; NICE NG14; MSLT-I)`);
  const indicated = st.T !== 'T1a' || t1aAdverse.length > 0;
  return merge(
    { problem: { treatment: [line] } },
    indicated && slnb === 'planned' && { problem: {
      investigations: [L('Pre-operative lymphoscintigraphy on the day before or the day of surgery; mark the sentinel node(s)', 'SLNB planned (standard SLNB protocol)')],
      treatment: [L('Do the SLNB at the same operation as (and before) the WLE; avoid a flap or large rotation before mapping', 'Wide excision and flaps disrupt lymphatic drainage (NCCN)')],
    } },
    indicated && slnb === 'unavailable' && { problem: { referrals: [L(
      'Refer for SLNB to a centre with lymphoscintigraphy and a gamma probe before the WLE; if that is not feasible, agree with the patient WLE with direct closure and nodal ultrasound surveillance every 3–4 months',
      'SLNB indicated but not available locally (clinical judgement; nodal US interval follows MSLT-II)')] } },
    indicated && slnb === 'declined' && { problem: { monitoring: [L('Nodal ultrasound with clinical examination at each surveillance visit', 'SLNB declined — nodes are followed clinically and by ultrasound')] } },
  );
};

const stagingAndOncology: PlanRule = ctx => {
  if (ctx.phase === 'post_op') return null;
  const a = ctx.answers;
  const st = stageOf(a);
  const g = st?.stageGroup ?? '';
  const sym = chosen(a, f('symptoms'));
  const stage3plus = g.startsWith('III') || g === 'IV';
  const acral = isOneOf(a, f('site'), 'plantar', 'subungual', 'mucosal') || isOneOf(a, f('subtype'), 'alm');
  return merge(
    isOneOf(a, f('nodes'), 'palpable') && !isOneOf(a, f('node_fna'), 'positive', 'negative') && { problem: { investigations: [L('Ultrasound-guided FNA or core biopsy of the node', 'Palpable node (NCCN; NICE NG14)', 'urgent')] } },
    isOneOf(a, f('node_fna'), 'positive') && { problem: { referrals: [L('MDT: neoadjuvant immunotherapy then lymph-node dissection where available, or therapeutic lymph-node dissection with the WLE', 'Clinically detected nodal melanoma (NADINA 2024; NCCN)', 'urgent')] } },
    ['IIB', 'IIC'].includes(g) && ctx.phase === 'pre_op' && { problem: { investigations: [L('Consider staging CT chest / abdomen / pelvis (or PET-CT) ± MRI brain', `${stageWhy(st)} (NCCN: consider for IIB–IIC; NICE NG14)`)] } },
    stage3plus && { problem: { investigations: [
      L('Staging CT chest / abdomen / pelvis (or PET-CT) and MRI brain', `${stageWhy(st)} (NCCN; NICE NG14)`, 'urgent'),
      L(acral ? 'Tumour mutation testing: BRAF, and KIT for acral / mucosal melanoma' : 'BRAF mutation testing of the tumour', `${stageWhy(st)} — guides systemic therapy (NCCN; NICE NG14)`),
    ] } },
    g === 'IV' && { problem: { investigations: [L('Serum LDH', 'Stage IV — LDH is part of the M category (AJCC 8)')] } },
    sym.length > 0 && { problem: { investigations: [L('Imaging directed at the symptoms (CT, MRI brain for neurological symptoms, bone scan for bone pain)', `Symptoms of spread: ${sym.join(', ').replace(/_/g, ' ')} (NCCN)`, 'urgent')] } },
    HIGH_RISK_STAGES.includes(g) && { problem: { referrals: [L('Medical oncology: adjuvant (or neoadjuvant) systemic therapy — check access and cost (NHIA, charity, trials) early', `${stageWhy(st)} — adjuvant anti-PD-1 for IIB–IIC and III; BRAF/MEK for BRAF-mutant III (NCCN; ESMO)`)] } },
    (stage3plus || ['IIB', 'IIC'].includes(g)) && { problem: { referrals: [L('Present at the skin-cancer / Tumour Board MDT', stageWhy(st))] } },
  );
};

const acral: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  if (!isOneOf(a, f('site'), 'plantar', 'subungual') && !isOneOf(a, f('subtype'), 'alm')) return null;
  return {
    counselling: [P('Acral melanoma', 'Melanoma on the sole or under the nail is the commonest type in Black African patients and is often mistaken for a wound, a callus or a fungal nail. Explain why the operation is wide (or an amputation) and what walking or hand use will be like afterwards.', 'Acral lentiginous / nail-unit melanoma — the commonest site in Black African series (Hudson & Krige 1995)')],
    general: [G('Rehabilitation (physiotherapy / OT)', L(isOneOf(a, f('site'), 'subungual') ? 'Hand / foot therapy after digit amputation: desensitisation, grip or gait training; footwear review for toe amputation' : 'Offload the plantar reconstruction; non-weight-bearing as the reconstruction requires, then graded weight-bearing with protective footwear', 'Acral melanoma surgery'))],
  };
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const st = stageOf(a);
  const slnb = a[f('slnb_result')];
  const groin = isOneOf(a, f('basin_site'), 'groin');
  return merge(
    isOneOf(a, f('residual'), 'pending') || slnb === 'pending' ? { problem: { monitoring: [L('Chase the WLE and sentinel node histology; give the results and the final stage in clinic', 'Histology pending')] } } : null,
    isOneOf(a, f('wle_margin'), 'involved') && { problem: { treatment: [L('Re-excise the involved margin', 'Involved WLE margin (NCCN)', 'urgent')] } },
    isOneOf(a, f('residual'), 'invasive') && { problem: { referrals: [L('Re-stage on the deepest invasive thickness at the MDT; reconsider SLNB if it was not done', 'Residual invasive melanoma in the WLE')] } },
    slnb === 'positive' && { problem: {
      treatment: [L('Completion lymph-node dissection is not routinely recommended; nodal-basin ultrasound surveillance instead', 'Positive SLNB (MSLT-II, Faries NEJM 2017; DeCOG-SLT)')],
      referrals: [L('Medical oncology for adjuvant systemic therapy and the skin-cancer MDT', `${stageWhy(st)} — positive sentinel node`, 'urgent')],
      investigations: [L('Staging CT (or PET-CT) and MRI brain; BRAF mutation testing', 'Stage III after a positive sentinel node (NCCN)')],
    } },
    slnb === 'not_found' && { problem: { monitoring: [L('Nodal-basin ultrasound surveillance in place of the failed SLNB', 'No sentinel node found')] } },
    hasAny(a, 'core.complications', 'seroma') && isOneOf(a, f('slnb_result'), 'pending', 'negative', 'positive', 'not_found') && { problem: { treatment: [L('SLNB-basin seroma: aspirate under aseptic technique if tense or symptomatic; compression; send fluid for culture if inflamed', 'Seroma after sentinel node biopsy (MSLT-I complication profile)')] } },
    isYes(a, f('limb_swelling')) && { problem: { referrals: [L('Lymphoedema assessment: limb volume measurements, compression garment, skin care and decongestive therapy', 'Limb swelling after nodal surgery (ILF / BLS)')] } },
    isOneOf(a, f('foot_wound'), 'breakdown') && { problem: { treatment: [L('Strict offloading of the plantar reconstruction; review graft / flap; dressings as for the reconstruction review', 'Weight-bearing reconstruction breaking down')] } },
    groin && { general: [G('Patient education', L('After groin SLNB: elevate the leg when resting, skin care to prevent cellulitis, report leg swelling early', 'Groin basin carries the highest lymphoedema and seroma risk'))] },
    { dischargeCriteria: ['Wound and SLNB site comfortable on oral analgesia', 'Results visit booked for the final histology and stage', 'Knows how to examine the scar and the nodal basin'] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const st = stageOf(a);
  const g = st?.stageGroup ?? '';
  const schedule = g === '0'
    ? L('Melanoma in situ: annual full skin examination; no imaging', 'Stage 0 (NCCN follow-up)')
    : HIGH_RISK_STAGES.includes(g)
      ? L('Review every 3–6 months for 2 years, every 3–12 months for years 3–5, then annually: skin, scar, in-transit route and all nodal basins; surveillance imaging every 3–12 months for years 1–3 as the MDT directs', `${stageWhy(st)} (NCCN Melanoma follow-up)`)
      : st
        ? L('Review every 6–12 months for 5 years, then annually as clinically indicated; no routine imaging', `${stageWhy(st)} (NCCN Melanoma follow-up)`)
        : null;
  return merge(
    schedule && { problem: { monitoring: [schedule] } },
    isOneOf(a, f('slnb_result'), 'positive') && { problem: { monitoring: [L('Nodal-basin ultrasound every 4 months for 2 years, then every 6 months to year 5', 'Positive SLNB without completion dissection (MSLT-II protocol)')] } },
    isOneOf(a, f('nodal_us'), 'overdue') && { problem: { investigations: [L('Book the overdue nodal-basin ultrasound', 'Nodal ultrasound surveillance overdue', 'urgent')] } },
    isOneOf(a, f('local'), 'suspicious') && { problem: { investigations: [L('Biopsy the nodule; re-stage with CT / PET-CT if melanoma', 'Possible local / in-transit recurrence (NCCN)', 'urgent')] } },
    isOneOf(a, f('nodes'), 'palpable') && { problem: { investigations: [L('Ultrasound-guided FNA / core biopsy of the node and staging imaging', 'Palpable node on surveillance (NCCN)', 'urgent')] } },
    isYes(a, f('new_primary')) && { problem: { investigations: [L('Excision biopsy of the new lesion with a 2 mm margin', 'Possible second primary melanoma')] } },
    isOneOf(a, f('adjuvant'), 'not_accessible') && { general: [G('Social and financial support', L('Social work and oncology: NHIA / charity / trial access to adjuvant therapy; keep the shorter surveillance interval meanwhile', 'Adjuvant therapy indicated but not accessible'))] },
    isOneOf(a, f('self_exam'), 'no') && { counselling: [P('Self-examination', 'Monthly: the whole skin (including soles, palms, nails and between the toes, with a mirror or a family member), the scar, the skin between the scar and the nodes, and the nodes. Report a new lump, a dark band in a nail or a changing spot.', 'Self-examination not yet taught (NCCN; NICE NG14)')] },
  );
};

const education: PlanRule = ctx => ({
  general: [G('Patient education',
    L('Teach self-examination of the skin, the scar, the in-transit route and the lymph nodes, with written instructions', 'Self-examination finds many recurrences (NICE NG14; NCCN)'),
    ...(isOneOf(ctx.answers, f('site'), 'plantar', 'subungual') ? [] : [L('Sun protection: shade, clothing, hat, SPF 30+ sunscreen; no sunbeds', 'Lower further UV damage (NICE NG34)')]),
  )],
});

// ── The module ──────────────────────────────────────────────────────────────

const breslowOf = (c: PlanContext) => numOf(c.answers, f('breslow_mm'));

export const melanomaWle: ProcedureModule = {
  id: ID,
  name: 'Melanoma wide local excision ± sentinel node biopsy',
  summary: 'Cutaneous melanoma: microstaging, AJCC 8 stage, margins by Breslow, sentinel node biopsy decision, acral and nail-unit melanoma, staging imaging, oncology and stage-based surveillance.',
  group: 'oncology',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Cutaneous melanoma',
  basis: [
    'AJCC Cancer Staging Manual, 8th edition — Melanoma of the skin (Gershenwald JE et al. CA Cancer J Clin 2017;67:472-92)',
    'NCCN Guidelines: Melanoma: Cutaneous (margins, SLNB, imaging, follow-up)',
    'NICE NG14 Melanoma: assessment and management (2015, updated 2022)',
    'ESMO Cutaneous melanoma clinical practice guideline (Michielin O et al. Ann Oncol 2019)',
    'Morton DL et al. MSLT-I. N Engl J Med 2014;370:599-609; Faries MB et al. MSLT-II. N Engl J Med 2017;376:2211-22; Leiter U et al. DeCOG-SLT. Lancet Oncol 2016',
    'Blank CU et al. Neoadjuvant nivolumab and ipilimumab in resectable stage III melanoma (NADINA). N Engl J Med 2024',
    'Valsecchi ME et al. Lymphatic mapping and SLNB in melanoma: a systematic review and meta-analysis. J Clin Oncol 2011;29:1479-87',
    'Morton DL et al. Sentinel node biopsy for early-stage melanoma: accuracy and morbidity in MSLT-I. Ann Surg 2005;242:302-11',
    'Bradford PT et al. Acral lentiginous melanoma: incidence and survival patterns in the United States, 1986-2005. Arch Dermatol 2009;145:427-34; Hudson DA, Krige JE. Melanoma in black South Africans. J Am Coll Surg 1995 (acral predominance and late presentation in Black African patients)',
    'Moehrle M et al. "Functional" surgery in subungual melanoma. Dermatol Surg 2003;29:366-74',
  ],
  catalog: {
    feeIds: ['minor-002', 'soft-006', 'soft-007'],
    educationId: 'TUMOR-003',
    patientEducationIds: [],
  },
  sections: {
    pre_op: [PRIMARY, STAGING, PLAN],
    post_op: [PRIMARY, WLE_RESULT, BASIN],
    follow_up: [PRIMARY, WLE_RESULT, STAGING, SURVEILLANCE],
  },
  carryForward: [
    f('site'), f('site_detail'), f('subtype'), f('invasion'), f('breslow_mm'), f('ulceration'), f('mitoses'), f('microsatellites'), f('lvi'), f('biopsy_transected'),
    f('residual'), f('wle_margin'), f('slnb_result'), f('positive_nodes'), f('slnb'),
  ],
  scores: [melanomaStageScore],
  planRules: [goals, diagnosis, margins, sentinelNode, stagingAndOncology, acral, postOp, followUp, education],
  consent: {
    procedureName: 'Wide local excision of melanoma ± sentinel lymph node biopsy',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove the skin around the melanoma scar to reduce the chance of it coming back there',
      'With sentinel node biopsy: find out whether the melanoma has reached the lymph glands, which decides further treatment',
      'Give an accurate stage so follow-up and any extra treatment fit your risk',
    ],
    risks: [
      { name: 'Sentinel node biopsy complications', description: 'Fluid collection (seroma), infection or wound breakdown in the groin, armpit or neck', frequency: 'about 10% overall (MSLT-I, Morton 2005)' },
      { name: 'False-negative sentinel node', description: 'A negative sentinel node does not rule out spread to the glands completely', frequency: 'about 12% of node recurrences follow a negative SLNB (Valsecchi 2011)' },
      { name: 'Blue dye and tracer effects', description: 'Blue staining of the skin for months and blue-green urine; allergic reaction to the dye is rare' },
      { name: 'Spread despite surgery', description: 'Melanoma can spread to the glands or elsewhere even after complete removal; the chance depends on the stage, which the team will explain' },
      { name: 'Loss of part of a finger or toe', description: 'For melanoma under the nail, amputation of the tip of the digit is usually needed' },
      { name: 'Weight-bearing wound problems', description: 'After surgery on the sole, the graft or flap may break down and walking may be affected for some months' },
      { name: 'Further surgery', description: 'Re-excision, or lymph-gland surgery if a gland is involved' },
    ],
    alternatives: [
      'Wide excision without sentinel node biopsy, with ultrasound and clinical check of the lymph glands instead',
      'A narrower excision where anatomy or function demands it (with a higher chance of recurrence)',
      'Radiotherapy or imiquimod cream for lentigo maligna when surgery is not possible',
      'Systemic treatment (immunotherapy, targeted drugs) for melanoma that has spread — specialist oncology; availability and cost limited',
      'No further surgery (not recommended: the risk of recurrence at the scar is higher)',
    ],
    riskOfNotTreating: 'Without wide excision, melanoma is more likely to come back at the scar, and without staging, spread to the lymph glands may be found later when it is harder to treat. Untreated, melanoma can spread to the lungs, liver, bone or brain and is life-threatening.',
    anaesthesiaOptions: ['general', 'local', 'regional', 'spinal'],
    additionalProcedures: [
      'Lymphoscintigraphy (a scan with a small radioactive tracer) before surgery',
      'Skin graft or flap to close the wound',
      'Amputation of a digit for nail-unit melanoma',
    ],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: true,
    counsellingTopics: [
      'What Breslow thickness and the stage mean for you',
      'Why the margin is the size it is',
      'Sentinel node biopsy: what it shows, what it does not, and its risks',
      'What happens if the sentinel node is positive (surveillance, oncology)',
      'Self-examination of the skin, scar and lymph glands',
      'The follow-up schedule for your stage',
    ],
    modifiers: [
      { id: 'mel_thick', when: c => (breslowOf(c) ?? 0) > 2 || isOneOf(c.answers, f('ulceration'), 'yes'),
        text: 'Because the melanoma is thick or ulcerated, the chance of it having spread, or of it coming back, is higher, and further treatment is more likely to be recommended.',
        why: 'Breslow over 2 mm or ulceration (AJCC 8 T2b and above)' },
      { id: 'mel_groin', when: c => isOneOf(c.answers, f('site'), 'lower_limb', 'plantar') && isOneOf(c.answers, f('slnb'), 'planned'),
        text: 'Sentinel node biopsy in the groin has the highest risk of fluid collection, wound infection and leg swelling (lymphoedema).',
        why: 'Lower-limb primary with groin SLNB' },
      { id: 'mel_digit', when: c => isOneOf(c.answers, f('site'), 'subungual'),
        text: 'For melanoma under the nail, the tip of the finger or toe is usually amputated; this changes grip or push-off but rarely walking.',
        why: 'Nail-unit melanoma' },
      { id: 'mel_plantar', when: c => isOneOf(c.answers, f('site'), 'plantar'),
        text: 'Because the operation is on the sole, healing is slower, you will need to keep weight off the foot, and the scar may be tender to walk on.',
        why: 'Plantar acral melanoma' },
      { id: 'mel_no_slnb', when: c => isOneOf(c.answers, f('slnb'), 'unavailable'),
        text: 'Sentinel node biopsy is not available here: without it the stage is less certain, and the lymph glands will be watched with ultrasound and examination.',
        why: 'SLNB indicated but unavailable' },
      { id: 'mel_transected', when: c => isYes(c.answers, f('biopsy_transected')) || isOneOf(c.answers, f('diagnosis_basis'), 'shave'),
        text: 'The first biopsy may not have shown the full thickness, so the stage may change after this operation and more surgery may be advised.',
        why: 'Transected or shave biopsy' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before WLE', purpose: 'Lymphoscintigraphy (if SLNB) and staging imaging reviewed' }],
    post_op: [
      { when: 'Day 7–14', purpose: 'Wound and SLNB site review; suture removal' },
      { when: '2–3 weeks', purpose: 'Final histology, sentinel node result and AJCC stage; MDT outcome' },
    ],
    follow_up: [
      { when: 'Stage 0', purpose: 'Annual skin examination (NCCN)' },
      { when: 'Stage IA–IIA', purpose: 'Every 6–12 months for 5 years, then annually (NCCN)' },
      { when: 'Stage IIB–IV', purpose: 'Every 3–6 months for 2 years, every 3–12 months to year 5, then annually; imaging as the MDT directs (NCCN)' },
    ],
  },
  handoffs: [
    { label: 'Tumour Board (AJCC staging, MDT plan, surveillance schedule)', route: '/tumour-board', when: 'Every invasive melanoma; stage IIB or above, positive SLNB, nodal or metastatic disease' },
    { label: 'Investigations (lymphoscintigraphy, imaging, BRAF / KIT)', route: '/investigations', phases: ['pre_op', 'follow_up'] },
    { label: 'Lymphoedema assessment', route: '/lymphedema', phases: ['post_op', 'follow_up'], when: 'Limb swelling after nodal surgery' },
    { label: 'Referrals (oncology, nuclear medicine)', route: '/referrals', when: 'SLNB elsewhere; adjuvant therapy' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Including lymphoscintigraphy, histology and reconstruction' },
  ],
};

/** Exposed for tests. */
export const MELANOMA_FIELDS = { SITE, INVASION, BRESLOW, ULCERATION, SLNB_RESULT };
