/**
 * Scalp tumour excision — the oncological side of scalp surgery.
 *
 * The scalp is a high-risk site for keratinocyte cancer (NCCN), sits on bone
 * that tumours erode silently, drains to the parotid, occipital and neck
 * nodes, and is the classic site of two uncommon tumours with their own
 * rules: dermatofibrosarcoma protuberans (DFSP: margin-controlled excision,
 * paraffin-section margins, imatinib) and cutaneous angiosarcoma (elderly,
 * bruise-like, multifocal, rarely cleared by surgery alone). This module asks
 * what decides the excision: tumour type, fixation and calvarial invasion,
 * the imaging that should precede surgery, the margin and how it will be
 * controlled (frozen section, staged paraffin margins, Mohs), the deep plane
 * (galea, pericranium, outer table, full thickness with neurosurgery) and
 * when the defect can be closed.
 *
 * The CLOSURE is the reconstruction group's: the plan hands off to the
 * Scalp reconstruction review (module `scalp_reconstruction`) and nothing
 * here repeats its flap / graft content. Melanoma of the scalp is staged and
 * planned in the Melanoma WLE review.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import { computeStage } from '../../../../tumour-board/services/oncology/stagingEngine';
import type { PlanContext, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'scalp_tumour_excision';
const f = (id: string) => `${ID}.${id}`;

// ── The tumour (carried forward) ────────────────────────────────────────────

const TUMOUR: EncounterField = {
  id: f('tumour'), label: 'Tumour', kind: 'select', important: true,
  options: [
    { value: 'bcc', label: 'Basal cell carcinoma' },
    { value: 'scc', label: 'Cutaneous squamous cell carcinoma' },
    { value: 'melanoma', label: 'Melanoma', flag: 'amber', flagReason: 'Scalp melanoma: stage, margins and SLNB in the Melanoma WLE review — scalp drainage is unpredictable (parotid, occipital, neck).' },
    { value: 'dfsp', label: 'Dermatofibrosarcoma protuberans (DFSP)', flag: 'amber', flagReason: 'DFSP: finger-like extensions far beyond the visible edge — margin-controlled excision with paraffin sections (NCCN DFSP).' },
    { value: 'angiosarcoma', label: 'Cutaneous angiosarcoma', flag: 'red', flagReason: 'Angiosarcoma: sarcoma MDT before surgery — MRI for extent, CT chest; multimodality treatment (ESMO-EURACAN-GENTURIS 2021).' },
    { value: 'adnexal', label: 'Adnexal carcinoma / Merkel cell / other', flag: 'amber', flagReason: 'Uncommon scalp malignancy: MDT before definitive surgery.' },
    { value: 'secondary', label: 'Metastasis to the scalp', flag: 'amber', flagReason: 'Scalp metastasis: find the primary; surgery only for symptom control or a solitary deposit.' },
    { value: 'undiagnosed', label: 'Not yet diagnosed', flag: 'red', flagReason: 'No histology: biopsy before a wide excision, bone resection or flap.' },
  ],
};
const REGION: EncounterField = {
  id: f('region'), label: 'Scalp region', kind: 'select', important: true,
  help: 'Decides the draining nodes: frontal / temporal → parotid and pre-auricular; parietal → pre / post-auricular; occipital → occipital and posterior neck.',
  options: [
    { value: 'frontal', label: 'Frontal' }, { value: 'temporal', label: 'Temporal' }, { value: 'parietal', label: 'Parietal / vertex' }, { value: 'occipital', label: 'Occipital' },
  ],
};
const SIZE: EncounterField = {
  id: f('size_cm'), label: 'Greatest diameter', kind: 'number', unit: 'cm', min: 0, max: 40, important: true,
  numericFlags: [
    { op: '>=', value: 4, level: 'amber', reason: '4 cm or more: cSCC T3 (AJCC 8) and, over 4 cm, very high risk (BAD 2020); head and neck sarcoma over 4 cm is T3 (AJCC 8) — image the deep extent before excision.' },
  ],
};
const PRESENTATION: EncounterField = {
  id: f('presentation'), label: 'Primary or recurrent', kind: 'select', important: true,
  options: [
    { value: 'primary', label: 'Primary' },
    { value: 'recurrent', label: 'Recurrent', flag: 'amber', flagReason: 'Recurrent scalp tumour: image for bone and deep extent; margin-controlled re-excision.' },
    { value: 'recurrent_after_rt', label: 'Recurrent after radiotherapy', flag: 'red', flagReason: 'Recurrence in an irradiated scalp: bone may be involved or radionecrotic — CT and MRI, MDT; healing is poor.' },
  ],
};
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The scalp tumour',
  intent: 'Recorded once and carried forward.',
  fields: [TUMOUR, { id: f('biopsy_result'), label: 'Biopsy / histology detail', kind: 'text', placeholder: 'e.g. infiltrative BCC; FS-DFSP; poorly differentiated cSCC' }, REGION, SIZE, PRESENTATION],
};

// ── Pre-operative: extent ───────────────────────────────────────────────────

const EXTENT: EncounterSection = {
  id: f('extent'),
  title: 'Deep extent, nerves and nodes',
  intent: 'What the scalp hides: fixation to bone, perineural spread, nodes in the parotid and neck.',
  fields: [
    {
      id: f('fixation'), label: 'Fixation', kind: 'select', important: true,
      options: [
        { value: 'mobile', label: 'Mobile over the pericranium' },
        { value: 'pericranium', label: 'Fixed to the pericranium', flag: 'amber', flagReason: 'Fixed to the pericranium: CT (bone windows) for outer-table erosion before excision (NCCN).' },
        { value: 'bone', label: 'Fixed to bone, palpable bone defect, or exposed bone', flag: 'red', flagReason: 'Calvarial involvement suspected: CT and MRI (dura, brain), neurosurgical MDT before excision.' },
      ],
    },
    {
      id: f('neuro'), label: 'Neurological symptoms or signs', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'headache', label: 'New or worsening headache', flag: 'amber', flagReason: 'Headache with a fixed scalp tumour: image for intracranial extension.' },
        { value: 'seizure', label: 'Seizure or focal deficit', flag: 'red', flagReason: 'Seizure / focal deficit: urgent MRI brain — intracranial extension or metastasis.' },
        { value: 'sensory', label: 'Forehead / scalp numbness or formication (supra-orbital, greater occipital territory)', flag: 'amber', flagReason: 'Sensory change in a nerve territory: perineural spread — MRI along the nerve (NCCN).' },
      ],
    },
    { id: f('pulsatile'), label: 'Pulsatile mass, or a mass that changes with coughing / straining', kind: 'boolean',
      flagWhenTrue: { level: 'red', reason: 'Pulsatile or cough-impulse scalp mass: vascular lesion, encephalocele or intracranial communication — imaging before any biopsy.' } },
    { id: f('multifocal'), label: 'Bruise-like, ill-defined or multifocal purple patches / nodules', kind: 'boolean',
      flagWhenTrue: { level: 'red', reason: 'Bruise-like or multifocal scalp lesions in an older adult: angiosarcoma until proven otherwise — biopsy and sarcoma MDT.' } },
    {
      id: f('nodes'), label: 'Parotid, peri-auricular, occipital and neck nodes', kind: 'select', important: true,
      options: [
        { value: 'normal', label: 'Examined — not palpable' },
        { value: 'palpable', label: 'Palpable / suspicious (including a parotid mass)', flag: 'red', flagReason: 'Nodal or parotid disease: ultrasound-guided FNA, CT / MRI neck; parotidectomy and neck dissection may be needed (NCCN).' },
        { value: 'not_examined', label: 'Not examined', flag: 'amber', flagReason: 'Examine the parotid and all neck levels as well as the occipital nodes.' },
      ],
    },
    { id: f('actinic_field'), label: 'Sun-damaged bald scalp with actinic keratoses (field change)', kind: 'boolean' },
  ],
};

const IMAGING: EncounterSection = {
  id: f('imaging'),
  title: 'Imaging and margin control',
  fields: [
    {
      id: f('ct'), label: 'CT head (bone windows)', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'no_bone', label: 'No bone involvement' },
        { value: 'outer_table', label: 'Outer-table erosion only', flag: 'amber', flagReason: 'Outer-table erosion: plan pericranium plus outer-table removal (burr) under the tumour (cT3 / T4a for cSCC, AJCC 8).' },
        { value: 'full_thickness', label: 'Full-thickness calvarial involvement', flag: 'red', flagReason: 'Full-thickness bone involvement: craniectomy with neurosurgery and cranioplasty / dural planning (T4a, AJCC 8).' },
      ],
    },
    {
      id: f('mri'), label: 'MRI with contrast', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'no_extension', label: 'No dural, intracranial or perineural extension' },
        { value: 'dural', label: 'Dural enhancement / intracranial extension', flag: 'red', flagReason: 'Dural or intracranial extension: neurosurgical MDT; resectability and adjuvant therapy decided there.' },
        { value: 'perineural', label: 'Perineural spread', flag: 'red', flagReason: 'Perineural spread on MRI: margin along the nerve and adjuvant radiotherapy (NCCN).' },
      ],
    },
    { id: f('margin_cm'), label: 'Planned peripheral margin', kind: 'number', unit: 'cm', min: 0, max: 10, important: true },
    {
      id: f('margin_control'), label: 'Margin control', kind: 'select', important: true,
      options: [
        { value: 'routine', label: 'Routine paraffin histology after closure' },
        { value: 'frozen', label: 'Frozen section at the same sitting' },
        { value: 'staged', label: 'Staged paraffin-section margins (CCPDMA / "slow Mohs"), closure delayed' },
        { value: 'mohs', label: 'Mohs micrographic surgery' },
      ],
    },
    {
      id: f('deep_plane'), label: 'Planned deep plane', kind: 'select', important: true,
      options: [
        { value: 'subgaleal', label: 'Subgaleal — pericranium preserved' },
        { value: 'pericranium', label: 'Including the pericranium' },
        { value: 'outer_table', label: 'Pericranium and outer table (burr)' },
        { value: 'craniectomy', label: 'Full-thickness craniectomy (with neurosurgery)' },
      ],
    },
    {
      id: f('closure_timing'), label: 'Closure', kind: 'select', important: true,
      options: [
        { value: 'immediate', label: 'Immediate reconstruction' },
        { value: 'delayed', label: 'Delayed until margins are clear (temporary dressing, NPWT or dermal template)' },
        { value: 'secondary', label: 'Healing by secondary intention / graft on pericranium' },
      ],
    },
  ],
};

// ── Post-operative and follow-up ────────────────────────────────────────────

const MARGINS: EncounterField = {
  id: f('margin_status'), label: 'Histological margins', kind: 'select', important: true,
  options: [
    { value: 'pending', label: 'Pending', flag: 'amber', flagReason: 'Margins pending: do not reconstruct definitively until they are known (delayed closure).' },
    { value: 'clear', label: 'Clear (peripheral and deep)' },
    { value: 'peripheral', label: 'Peripheral margin involved', flag: 'amber', flagReason: 'Involved peripheral margin: further stage / re-excision before reconstruction.' },
    { value: 'deep', label: 'Deep margin involved (pericranium / bone)', flag: 'red', flagReason: 'Involved deep margin on the scalp: bone may be involved — CT, outer-table or full-thickness resection, or radiotherapy (MDT).' },
  ],
};
const HISTOLOGY: EncounterSection = {
  id: f('histology'),
  title: 'Histology and margins',
  fields: [
    MARGINS,
    { id: f('bone_histology'), label: 'Bone in the specimen', kind: 'select',
      options: [
        { value: 'not_sent', label: 'No bone taken' },
        { value: 'clear', label: 'Bone free of tumour' },
        { value: 'involved', label: 'Bone involved', flag: 'red', flagReason: 'Bone invasion: pT4a (cSCC, AJCC 8) — adjuvant radiotherapy discussion and MDT.' },
      ] },
    { id: f('pni'), label: 'Perineural invasion', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'small', label: 'Small dermal nerve' },
        { value: 'large', label: 'Named nerve, 0.1 mm or larger, or below the dermis', flag: 'red', flagReason: 'Significant perineural invasion: adjuvant radiotherapy and MRI of the nerve (NCCN; BAD 2020).' },
      ] },
    { id: f('fibrosarcomatous'), label: 'DFSP with fibrosarcomatous change (FS-DFSP)', kind: 'boolean', showWhen: { field: f('tumour'), equals: ['dfsp'] },
      flagWhenTrue: { level: 'amber', reason: 'FS-DFSP carries a metastatic risk: CT chest and sarcoma MDT (NCCN DFSP).' } },
    {
      id: f('staged_status'), label: 'Staged excision', kind: 'select',
      options: [
        { value: 'not_staged', label: 'Not staged — closed at the first operation' },
        { value: 'clear_book_recon', label: 'Margins now clear — book the reconstruction' },
        { value: 'further_stage', label: 'Further stage needed' },
      ],
    },
    { id: f('mdt'), label: 'MDT outcome', kind: 'text' },
  ],
};

const SURVEILLANCE: EncounterSection = {
  id: f('surveillance'),
  title: 'Scalp surveillance',
  fields: [
    {
      id: f('local'), label: 'Operative site and surrounding scalp', kind: 'select', important: true,
      options: [
        { value: 'clear', label: 'No recurrence' },
        { value: 'suspicious', label: 'Nodule, ulcer, bruise-like patch or bone change', flag: 'red', flagReason: 'Possible recurrence: biopsy, CT / MRI for bone and depth, MDT.' },
      ],
    },
    {
      id: f('fu_nodes'), label: 'Parotid, occipital and neck nodes', kind: 'select', important: true,
      options: [
        { value: 'normal', label: 'Not palpable' },
        { value: 'palpable', label: 'Palpable / suspicious', flag: 'red', flagReason: 'Possible nodal recurrence: ultrasound-guided FNA and CT / MRI neck (NCCN).' },
      ],
    },
    {
      id: f('adjuvant'), label: 'Adjuvant treatment', kind: 'select',
      options: [
        { value: 'none', label: 'None needed' },
        { value: 'rt_done', label: 'Radiotherapy completed' },
        { value: 'rt_awaited', label: 'Radiotherapy awaited', flag: 'amber', flagReason: 'Adjuvant radiotherapy awaited: aim to start within 6 weeks of surgery (NCCN Head and Neck Cancers, extrapolated to cutaneous disease) — chase the referral.' },
        { value: 'systemic', label: 'Systemic therapy (imatinib, chemotherapy, immunotherapy)' },
      ],
    },
    { id: f('field_change'), label: 'New actinic keratoses / new lesions on the scalp', kind: 'boolean' },
  ],
};

// ── Stage (AJCC 8 head and neck cSCC; T4a for calvarial invasion) ──────────

export const scalpSccStage: ScoreRule = ({ phase, answers }) => {
  if (!isOneOf(answers, f('tumour'), 'scc')) return null;
  const size = numOf(answers, f('size_cm'));
  const bone = isOneOf(answers, f('ct'), 'full_thickness') || isOneOf(answers, f('bone_histology'), 'involved');
  const st = computeStage({
    family: 'cutaneous_scc', basis: phase === 'pre_op' ? 'clinical' : 'pathological', sizeCm: size,
    perineuralInvasion: isOneOf(answers, f('pni'), 'large') || isOneOf(answers, f('mri'), 'perineural'),
    boneErosionMinor: isOneOf(answers, f('ct'), 'outer_table'),
    boneInvasionCortical: bone,
    skullBaseInvasion: false,
    nodesInvolved: 0,
  });
  const nodesNeg = isOneOf(answers, f('nodes'), 'normal') || isOneOf(answers, f('fu_nodes'), 'normal');
  return {
    id: `${ID}.ajcc`, name: 'AJCC 8 T category (scalp cSCC)', abbreviation: 'AJCC 8', total: null,
    band: {
      label: `${st.prefix}${st.T}${nodesNeg ? ` cN0 — Stage ${st.stageGroup}` : ''}`,
      level: ['T3', 'T4a', 'T4b'].includes(st.T) ? 'high' : 'low',
      interpretation: nodesNeg ? st.stageDescription : 'T category only until the parotid and neck have been examined (and imaged if suspicious).',
    },
    incomplete: size == null ? ['Greatest diameter'] : [],
    source: 'Tumour Board stagingEngine.computeStage (AJCC 8th, chapter 15)',
    detail: st.caveats,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const t = (a: EncounterAnswers) => String(a[f('tumour')] ?? '');

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Clear peripheral and deep margins confirmed on histology before definitive reconstruction', 'Margin-first sequencing on the scalp (NCCN; BAD 2020)'),
      L('The deep extent known before surgery: bone, dura, nerve and nodes imaged when the examination suggests it', 'Calvarial and perineural spread are silent clinically'),
      L('Durable cover of the defect, planned in the Scalp reconstruction review', 'Reconstruction is owned by the reconstruction module'),
      L('Surveillance of the scar, the scalp field and the parotid / neck nodes', 'Scalp tumours recur locally and in the parotid and neck (NCCN)'),
    ],
  },
});

const workup: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const neuro = chosen(a, f('neuro'));
  const fixed = isOneOf(a, f('fixation'), 'pericranium', 'bone');
  const needCt = fixed || isOneOf(a, f('presentation'), 'recurrent', 'recurrent_after_rt') || (numOf(a, f('size_cm')) ?? 0) >= 4;
  const needMri = isOneOf(a, f('fixation'), 'bone') || neuro.length > 0 || t(a) === 'angiosarcoma' || (t(a) === 'dfsp' && ((numOf(a, f('size_cm')) ?? 0) >= 4 || isOneOf(a, f('presentation'), 'recurrent', 'recurrent_after_rt')));
  return merge(
    t(a) === 'undiagnosed' && { problem: { investigations: [L(isYes(a, f('pulsatile')) ? 'Image (CT / MRI, ± angiography) before any biopsy of a pulsatile scalp mass' : 'Incisional or punch biopsy (deep enough to include the subcutis for DFSP) before definitive excision', isYes(a, f('pulsatile')) ? 'Pulsatile / cough-impulse mass' : 'Scalp tumour without histology', 'urgent')] } },
    needCt && isOneOf(a, f('ct'), 'not_done') && { problem: { investigations: [L('CT head with bone windows for calvarial erosion', `${fixed ? 'Fixed to pericranium / bone' : isOneOf(a, f('presentation'), 'recurrent', 'recurrent_after_rt') ? 'Recurrent tumour' : 'Tumour 4 cm or more'} (NCCN: imaging when deep extension is suspected)`, isOneOf(a, f('fixation'), 'bone') ? 'urgent' : 'routine')] } },
    needMri && isOneOf(a, f('mri'), 'not_done') && { problem: { investigations: [L('MRI with gadolinium: dura, brain, perineural spread and soft-tissue extent', neuro.length ? `Neurological symptoms: ${neuro.join(', ')}` : t(a) === 'angiosarcoma' ? 'Angiosarcoma — map the extent (ESMO-EURACAN-GENTURIS 2021)' : t(a) === 'dfsp' ? 'Large or recurrent DFSP (NCCN DFSP)' : 'Bone fixation', neuro.includes('seizure') ? 'urgent' : 'routine')] } },
    isOneOf(a, f('nodes'), 'palpable') && { problem: { investigations: [L('Ultrasound of the parotid and neck with FNA; CT / MRI neck if positive', 'Suspicious parotid / neck node (NCCN)', 'urgent')] } },
    isOneOf(a, f('nodes'), 'not_examined') && { problem: { investigations: [L('Examine the parotid, pre- and post-auricular, occipital and all neck levels', `Scalp ${String(a[f('region')] ?? '')} drainage`)] } },
    (isOneOf(a, f('fixation'), 'bone') || isOneOf(a, f('ct'), 'full_thickness') || isOneOf(a, f('mri'), 'dural')) && { problem: { referrals: [L('Joint plan with neurosurgery: craniectomy, dural management and cranioplasty; book the theatre jointly', 'Calvarial / dural involvement', 'urgent')] } },
    (t(a) === 'angiosarcoma' || isYes(a, f('multifocal'))) && { problem: {
      investigations: [L('CT chest for lung metastases', 'Angiosarcoma metastasises to the lung (ESMO-EURACAN-GENTURIS 2021)')],
      referrals: [L('Sarcoma MDT and clinical oncology before surgery: wide excision where feasible, wide-field adjuvant radiotherapy ± taxane chemotherapy', 'Scalp angiosarcoma — margins are rarely clear with surgery alone', 'urgent')],
    } },
    isOneOf(a, f('presentation'), 'recurrent_after_rt') && { problem: { referrals: [L('MDT: irradiated scalp — consider bone resection for osteoradionecrosis and plan vascularised (flap) cover', 'Recurrence after radiotherapy')] } },
    t(a) === 'melanoma' && { problem: { referrals: [L('Plan the excision and SLNB in the Melanoma WLE review (scalp lymphoscintigraphy maps the parotid, occipital and neck basins)', 'Scalp melanoma (NCCN)')] } },
    t(a) === 'secondary' && { problem: { investigations: [L('Look for the primary (breast, lung, kidney, thyroid, gut) and stage before excision', 'Scalp metastasis')] } },
  );
};

const marginPlan: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const type = t(a);
  const ctOuter = isOneOf(a, f('ct'), 'outer_table');
  const ctFull = isOneOf(a, f('ct'), 'full_thickness');
  const deep = a[f('deep_plane')];
  const lines = [] as ReturnType<typeof L>[];
  if (type === 'bcc') lines.push(L('BCC on the scalp is high-risk by site: margin-controlled excision (Mohs or staged CCPDMA) or at least 5 mm peripheral margins; deep margin including the galea, and the pericranium if the tumour approaches it', 'Scalp BCC (NCCN; BAD 2021)'));
  if (type === 'scc') lines.push(L('cSCC on the scalp: 6 mm peripheral margin (10 mm if very high risk — over 40 mm, thicker than 6 mm, poorly differentiated or perineural), or margin-controlled excision; deep margin including the pericranium', 'Scalp cSCC — high-risk site (BAD 2020; NCCN)'));
  if (type === 'dfsp') lines.push(L('DFSP: Mohs or staged excision with complete peripheral and deep margin assessment on paraffin sections; if conventional wide excision is the only option, wide margins (2–4 cm) including the pericranium — and still delay closure until margins are clear', 'DFSP (NCCN Dermatofibrosarcoma Protuberans)'));
  if (type === 'angiosarcoma') lines.push(L('Angiosarcoma: the extent is wider than it looks — margins and the radiotherapy field are set at the sarcoma MDT from MRI and mapping biopsies', 'Angiosarcoma (ESMO-EURACAN-GENTURIS 2021)'));
  return merge(
    lines.length > 0 && { problem: { treatment: lines } },
    (type === 'dfsp' || type === 'angiosarcoma') && isOneOf(a, f('margin_control'), 'frozen') && { cautions: [`Frozen sections are unreliable for ${type === 'dfsp' ? 'DFSP (spindle cells blend with dermis)' : 'angiosarcoma'}: prefer staged paraffin-section margins.`] },
    ctOuter && deep !== 'outer_table' && deep !== 'craniectomy' && { problem: { treatment: [L('Include the pericranium and burr the outer table under the tumour; send the bone separately for histology', 'Outer-table erosion on CT')] } },
    ctFull && deep !== 'craniectomy' && { problem: { treatment: [L('Full-thickness craniectomy with a margin of normal bone, with neurosurgery', 'Full-thickness calvarial involvement on CT', 'urgent')] } },
    (isOneOf(a, f('margin_control'), 'staged', 'mohs') || isOneOf(a, f('closure_timing'), 'delayed')) && { problem: { treatment: [L('Cover the open defect (moist dressing, NPWT or a dermal template over pericranium) until margins are clear; keep the pericranium moist so it can take a graft', 'Staged excision / delayed closure')] } },
    isOneOf(a, f('margin_control'), 'routine') && isOneOf(a, f('closure_timing'), 'immediate') && ['scc', 'bcc', 'dfsp'].includes(type) && (isOneOf(a, f('presentation'), 'recurrent', 'recurrent_after_rt') || (numOf(a, f('size_cm')) ?? 0) > 2 || type === 'dfsp') && { cautions: ['Immediate flap closure with routine histology only: an involved margin under a rotated scalp flap is hard to localise — consider frozen section or delayed closure.'] },
    { problem: { referrals: [L('Plan the closure in the Scalp reconstruction procedure review (scalp_reconstruction): defect size, pericranium / bone status and the timing agreed here', 'Reconstruction is owned by the reconstruction group')] } },
    { general: [G('Anaesthesia and theatre',
      L('Orientate the specimen (12 o\'clock suture and diagram); send bone separately; map staged margins on a diagram kept with the operation note', 'Re-excision needs orientation (RCPath datasets)'),
      L('Scalp bleeding: infiltrate with adrenaline-containing local anaesthetic, haemostatic scalp clips or sutures, group and save (crossmatch for large excisions or craniectomy)', 'The scalp is very vascular'),
    )] },
    isYes(a, f('actinic_field')) && { problem: { treatment: [L('Treat the actinic field (cryotherapy, 5-fluorouracil or imiquimod) and examine the whole scalp at each visit', 'Field cancerisation of the bald scalp (BAD actinic keratosis guideline 2017)')] } },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase === 'pre_op') return null;
  const a = ctx.answers;
  const ms = a[f('margin_status')];
  return merge(
    ms === 'pending' && { problem: { monitoring: [L('Chase the margin histology; keep the defect covered until it is reported', 'Margins pending')] } },
    ms === 'peripheral' && { problem: { treatment: [L('Further excision of the involved peripheral margin (next stage), guided by the orientation map, before reconstruction', 'Involved peripheral margin')] } },
    ms === 'deep' && { problem: { treatment: [L('Deep margin involved: CT for bone, then pericranium / outer-table or full-thickness resection, or adjuvant radiotherapy — MDT decision', 'Involved deep margin on the scalp', 'urgent')] } },
    isOneOf(a, f('staged_status'), 'clear_book_recon') && { problem: { referrals: [L('Margins clear: proceed with the reconstruction planned in the Scalp reconstruction review', 'Clear margins')] } },
    (isOneOf(a, f('bone_histology'), 'involved') || isOneOf(a, f('pni'), 'large')) && { problem: { referrals: [L('Clinical oncology: adjuvant radiotherapy, ideally starting within 6 weeks of surgery', `${isOneOf(a, f('bone_histology'), 'involved') ? 'Bone invasion' : 'Significant perineural invasion'} (NCCN; BAD 2020; 6-week target extrapolated from NCCN Head and Neck)`)] } },
    isYes(a, f('fibrosarcomatous')) && { problem: { investigations: [L('CT chest and sarcoma MDT', 'Fibrosarcomatous DFSP (NCCN DFSP)')] } },
    t(a) === 'dfsp' && !isOneOf(a, f('margin_status'), 'clear') && ms !== 'pending' && { problem: { referrals: [L('Unresectable or positive-margin DFSP: imatinib (after confirming COL1A1-PDGFB / t(17;22) where testing is available) and / or radiotherapy — MDT', 'DFSP with involved margins (NCCN DFSP)')] } },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const type = t(a);
  const schedule = type === 'angiosarcoma'
    ? L('Review every 3 months for 2–3 years with CT chest (and MRI of the scalp if examination is equivocal), then 6-monthly to 5 years', 'Angiosarcoma — high-grade sarcoma follow-up (ESMO-EURACAN-GENTURIS 2021)')
    : type === 'dfsp'
      ? L('Clinical examination of the site every 6–12 months; most recurrences appear within 3 years, so continue at least 5 years', 'DFSP follow-up (NCCN DFSP)')
      : type === 'scc'
        ? L('Review every 3–6 months for 2 years, then 6–12-monthly to 5 years, then annually: scar, scalp, parotid and neck', 'High-risk site cSCC (NCCN; BAD 2020)')
        : type === 'bcc'
          ? L('Review every 6–12 months for 5 years, then annually', 'High-risk site BCC (NCCN)')
          : null;
  return merge(
    schedule && { problem: { monitoring: [schedule] } },
    isOneOf(a, f('local'), 'suspicious') && { problem: { investigations: [L('Biopsy and CT / MRI of the site; MDT', 'Possible scalp recurrence', 'urgent')] } },
    isOneOf(a, f('fu_nodes'), 'palpable') && { problem: { investigations: [L('Ultrasound-guided FNA of the node; CT / MRI neck', 'Possible nodal recurrence (NCCN)', 'urgent')] } },
    isOneOf(a, f('adjuvant'), 'rt_awaited') && { problem: { referrals: [L('Chase the radiotherapy appointment; give the date to the patient', 'Adjuvant radiotherapy awaited')] } },
    isYes(a, f('field_change')) && { problem: { treatment: [L('Treat new actinic keratoses and biopsy any thickened or ulcerated lesion', 'New scalp field change')] } },
  );
};

const education: PlanRule = ctx => ({
  general: [G('Patient education', L('Wear a wide-brimmed hat outdoors; ask a family member to look at the scalp monthly and report any new lump, sore or bruise-like patch', 'The patient cannot see their own scalp'))],
  counselling: ctx.phase === 'pre_op'
    ? [P('Scalp surgery', 'The excision may be staged with the wound left covered for days until the laboratory confirms clear edges; the scalp may be numb behind the scar; hair will not grow in the scar or a graft.', 'Scalp tumour excision')]
    : [],
});

// ── The module ──────────────────────────────────────────────────────────────

const isType = (c: PlanContext, ...types: string[]) => types.includes(t(c.answers));

export const scalpTumourExcision: ProcedureModule = {
  id: ID,
  name: 'Scalp tumour excision',
  summary: 'Oncological excision of scalp tumours (BCC, cSCC, DFSP, angiosarcoma): calvarial and perineural invasion, imaging, margins, staged margin control and timing of reconstruction.',
  group: 'oncology',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Scalp tumour',
  basis: [
    'NCCN Guidelines: Basal Cell Skin Cancer; Squamous Cell Skin Cancer; Dermatofibrosarcoma Protuberans',
    'BAD cSCC guideline 2020 (Keohane et al.); BAD BCC guideline 2021 (Nasr et al.); BAD actinic keratosis guideline 2017',
    'ESMO-EURACAN-GENTURIS Soft tissue and visceral sarcomas clinical practice guideline (Gronchi A et al. Ann Oncol 2021) — angiosarcoma',
    'AJCC Cancer Staging Manual, 8th edition — cutaneous carcinoma of the head and neck (bone invasion T3 / T4a)',
    'Royal College of Pathologists datasets for cutaneous carcinoma (specimen orientation and margins)',
  ],
  catalog: {
    feeIds: ['soft-006', 'soft-007'],
    educationId: null,
    educationNote: 'No scalp-tumour excision record in the procedure education database; the ConsentSpec carries the procedure risks.',
    patientEducationIds: [],
  },
  sections: {
    pre_op: [DETAILS, EXTENT, IMAGING],
    post_op: [DETAILS, HISTOLOGY],
    follow_up: [DETAILS, HISTOLOGY, SURVEILLANCE],
  },
  carryForward: [f('tumour'), f('biopsy_result'), f('region'), f('size_cm'), f('presentation'), f('margin_status'), f('bone_histology'), f('pni'), f('fibrosarcomatous'), f('mdt')],
  scores: [scalpSccStage],
  planRules: [goals, workup, marginPlan, postOp, followUp, education],
  consent: {
    procedureName: 'Excision of scalp tumour',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove the tumour completely, with its deep layer (and bone if it is involved)',
      'Confirm the diagnosis and whether further treatment is needed',
      'Prevent the tumour growing into the skull or spreading',
    ],
    risks: [
      { name: 'More than one operation', description: 'The wound may be left covered for some days while the laboratory checks the edges, with further removal before it is closed' },
      { name: 'Recurrence', description: 'The tumour can come back at the scalp; the risk is higher for recurrent tumours, DFSP removed by standard excision, and angiosarcoma' },
      { name: 'Bone removal', description: 'If the tumour reaches the skull, the outer layer (or the full thickness, with a neurosurgeon) is removed' },
      { name: 'Brain-covering problems', description: 'If the dura is exposed or opened: fluid leak, infection (meningitis) or seizures — rare and only with skull removal' },
      { name: 'Numbness of the scalp', description: 'Behind the scar, from cutting small nerves; usually permanent in part' },
      { name: 'Hair loss from radiotherapy', description: 'If radiotherapy follows, hair in the treated area thins or is lost permanently' },
      { name: 'Bleeding', description: 'The scalp bleeds freely; a blood transfusion is possible with large excisions' },
    ],
    alternatives: [
      'Mohs micrographic surgery (limited availability)',
      'Radiotherapy alone (for patients unfit for surgery, or where surgery would be very disfiguring)',
      'Drug treatment: imatinib for DFSP that cannot be removed; chemotherapy for angiosarcoma; systemic therapy for advanced skin cancer',
      'Observation or palliative care for frail patients',
    ],
    riskOfNotTreating: 'Most scalp cancers keep growing; they can erode the skull, reach the brain covering, bleed or become infected, and some spread to the lymph glands of the neck. Angiosarcoma and squamous cell cancer can spread to the lungs.',
    anaesthesiaOptions: ['general', 'local', 'sedation'],
    additionalProcedures: [
      'Removal of the outer layer of the skull, or a full-thickness piece with a neurosurgeon',
      'Temporary wound cover (dressing, NPWT or a dermal template) while margins are checked',
      'Biopsy of lymph glands, parotidectomy or neck dissection if glands are involved',
      'Scalp reconstruction (flap or graft) — consented in the Scalp reconstruction review',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: true,
    counsellingTopics: [
      'Why the excision may be staged and closure delayed',
      'Bone removal if the tumour reaches the skull',
      'Numbness and hair loss in the operated area',
      'Who will check the scalp at home and how often',
    ],
    modifiers: [
      { id: 'scalp_bone', when: c => isOneOf(c.answers, f('fixation'), 'bone') || isOneOf(c.answers, f('ct'), 'outer_table', 'full_thickness'),
        text: 'Because the tumour may involve the skull, part of the bone is likely to be removed, the operation is bigger, and radiotherapy afterwards is likely.',
        why: 'Fixation to bone / calvarial erosion on CT' },
      { id: 'scalp_dfsp', when: c => isType(c, 'dfsp'),
        text: 'DFSP spreads in fine strands well beyond what can be seen, so the excision is wide and usually staged before the wound is closed.',
        why: 'DFSP (NCCN)' },
      { id: 'scalp_angio', when: c => isType(c, 'angiosarcoma'),
        text: 'Angiosarcoma is usually more extensive than it looks; surgery alone rarely removes it completely, so radiotherapy and sometimes chemotherapy are needed, and it often comes back.',
        why: 'Angiosarcoma (ESMO-EURACAN-GENTURIS 2021)' },
      { id: 'scalp_rt', when: c => isOneOf(c.answers, f('presentation'), 'recurrent_after_rt'),
        text: 'Because the scalp has had radiotherapy, the bone may be damaged and a flap (rather than a graft) is usually needed to heal it.',
        why: 'Recurrence in an irradiated scalp' },
      { id: 'scalp_nerve', when: c => hasAny(c.answers, f('neuro'), 'sensory') || isOneOf(c.answers, f('mri'), 'perineural'),
        text: 'Because the tumour may be growing along a nerve, that nerve may be removed (numbness of the forehead or scalp) and radiotherapy is likely.',
        why: 'Perineural spread' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before listing', purpose: 'CT / MRI and biopsy reviewed; neurosurgery and reconstruction planned together where needed' }],
    post_op: [
      { when: '2–7 days (staged excision)', purpose: 'Margin report; next stage or reconstruction' },
      { when: '10–14 days', purpose: 'Wound review and suture / staple removal' },
    ],
    follow_up: [
      { when: 'cSCC / BCC', purpose: 'Every 3–12 months by risk for 2 years, then 6–12-monthly to 5 years (NCCN)' },
      { when: 'DFSP', purpose: 'Every 6–12 months for at least 5 years (NCCN DFSP)' },
      { when: 'Angiosarcoma', purpose: 'Every 3 months for 2–3 years with CT chest (ESMO-EURACAN-GENTURIS)' },
    ],
  },
  handoffs: [
    { label: 'Scalp reconstruction review', moduleId: 'scalp_reconstruction', targetPhase: 'pre_op', when: 'Plan the closure: defect size, pericranium / bone and timing agreed here' },
    { label: 'Melanoma WLE / SLNB review', moduleId: 'melanoma_wle', targetPhase: 'pre_op', phases: ['pre_op', 'post_op'], when: 'Scalp melanoma: margins, staging and sentinel node biopsy' },
    { label: 'Tumour Board (MDT, staging, adjuvant therapy)', route: '/tumour-board', when: 'Bone or dural involvement, perineural spread, DFSP, angiosarcoma, nodes' },
    { label: 'Investigations (CT, MRI, histology)', route: '/investigations', phases: ['pre_op', 'post_op'] },
    { label: 'Referrals (neurosurgery, clinical oncology)', route: '/referrals', when: 'Calvarial / dural involvement or adjuvant radiotherapy' },
    { label: 'NPWT', route: '/npwt', phases: ['pre_op', 'post_op'], when: 'Temporary cover during staged excision' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Including imaging, histology and reconstruction' },
  ],
};

/** Exposed for tests. */
export const SCALP_FIELDS = { TUMOUR, SIZE, MARGINS };
