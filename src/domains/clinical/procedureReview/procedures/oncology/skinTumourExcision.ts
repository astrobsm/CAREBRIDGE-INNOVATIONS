/**
 * Excision of non-melanoma skin cancer (basal cell carcinoma, cutaneous
 * squamous cell carcinoma, SCC in situ) and of suspicious skin lesions.
 *
 * Pre-operative: the lesion (site, size, borders, clinical features,
 * perineural symptoms, nodes), the patient's predisposition (oculocutaneous
 * albinism — the commonest cause of cSCC in young Nigerians — chronic scars
 * and ulcers (Marjolin), xeroderma pigmentosum, Gorlin), the biopsy, the
 * risk tier (NCCN low / high; BAD 2020 cSCC low / high / very high), the
 * margin and how it will be controlled, and who owns the closure.
 * Post-operative: histology, margins, the features that change management
 * (depth, perineural and lymphovascular invasion), MDT. Follow-up: recurrence,
 * new primaries, nodes, sun protection, self-examination.
 *
 * A pigmented lesion that may be melanoma is triaged with the weighted
 * 7-point checklist (NICE NG12) and handed to the melanoma module; the
 * closure is handed to the reconstruction modules. Staging reuses the Tumour
 * Board's AJCC 8 engine (head and neck cSCC only, as AJCC publishes it).
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import { computeStage } from '../../../../tumour-board/services/oncology/stagingEngine';
import type { PlanContext, PlanRule, PriorReview, ProcedureModule, ScoreRule } from '../../types';
import { answered, chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { instrumentFields, responsesFrom, scoreInstrument, type ScreeningInstrument } from '../../scores/instrument';
import { sunProtectionField } from './common';

const ID = 'skin_tumour_excision';
const f = (id: string) => `${ID}.${id}`;

// ── Shared fields (carried forward) ─────────────────────────────────────────

/**
 * NCCN (BCC and cSCC, 2023 onward) counts head, neck, hands, feet, pretibial
 * skin and the anogenital region as high-risk at any size; BAD 2021 names the
 * H-zone (central face, eyelids, eyebrows, nose, lips, chin, ears,
 * periauricular, temple) as the highest-risk area.
 */
const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'h_zone', label: 'H-zone — central face, eyelids, eyebrows, nose, lips, chin, ear, peri-auricular, temple' },
    { value: 'face_other', label: 'Other face — cheek, forehead' },
    { value: 'scalp', label: 'Scalp (use the Scalp tumour module for scalp-specific planning)' },
    { value: 'neck', label: 'Neck' },
    { value: 'hands_feet', label: 'Hands, feet, nail unit or pretibial skin' },
    { value: 'anogenital', label: 'Genitalia / perianal' },
    { value: 'trunk_limbs', label: 'Trunk or limbs (other)' },
  ],
};
const SITE_DETAIL: EncounterField = { id: f('site_detail'), label: 'Exact site and side', kind: 'text', placeholder: 'e.g. left nasal ala' };
const DIAGNOSIS: EncounterField = {
  id: f('diagnosis'), label: 'Clinical diagnosis', kind: 'select', important: true,
  options: [
    { value: 'bcc', label: 'Basal cell carcinoma' },
    { value: 'scc', label: 'Cutaneous squamous cell carcinoma' },
    { value: 'scc_insitu', label: 'SCC in situ (Bowen\'s disease)' },
    { value: 'keratoacanthoma', label: 'Keratoacanthoma (managed as cSCC)' },
    { value: 'uncertain', label: 'Uncertain / atypical lesion' },
    { value: 'pigmented', label: 'Pigmented lesion — possible melanoma', flag: 'amber',
      flagReason: 'Possible melanoma: excision biopsy with a 2 mm margin, not a wide excision or flap; then the Melanoma WLE module (NICE NG14; BAD).' },
    { value: 'other', label: 'Other (Merkel cell, adnexal, DFSP, Kaposi…)' },
  ],
};
const SIZE: EncounterField = {
  id: f('size_mm'), label: 'Clinical diameter', kind: 'number', unit: 'mm', min: 0, max: 400, important: true,
  numericFlags: [
    { op: '>', value: 40, level: 'red', reason: 'Over 40 mm: very high risk for a cSCC (BAD 2020) and high risk for a BCC (NCCN; BAD 2021); image for deep invasion and discuss at MDT before excision.' },
    { op: '>=', value: 20, level: 'amber', reason: '20 mm or more: high-risk BCC / cSCC (NCCN; BAD 2020).' },
  ],
};
const BORDERS: EncounterField = {
  id: f('borders'), label: 'Clinical borders', kind: 'select',
  options: [
    { value: 'well', label: 'Well defined' },
    { value: 'poor', label: 'Poorly defined', flag: 'amber', flagReason: 'Poorly defined borders: high-risk BCC (NCCN; BAD 2021) — wider margins or margin-controlled excision.' },
  ],
};
const PRIMARY: EncounterField = {
  id: f('primary'), label: 'Primary or recurrent', kind: 'select', important: true,
  options: [
    { value: 'primary', label: 'Primary, untreated' },
    { value: 'recurrent', label: 'Recurrent after treatment', flag: 'amber', flagReason: 'Recurrent tumour: high-risk (NCCN); recurrence after re-excision is higher (Rowe 1989) — margin-controlled excision preferred.' },
    { value: 'incomplete', label: 'Incompletely excised elsewhere', flag: 'amber', flagReason: 'Previous incomplete excision: obtain the histology report and re-excise with margin control (BAD 2021).' },
  ],
};
const PREDISPOSITION: EncounterField = {
  id: f('predisposition'), label: 'Predisposition', kind: 'multiselect', important: true,
  options: [
    { value: 'none', label: 'None known' },
    { value: 'albinism', label: 'Oculocutaneous albinism', flag: 'amber',
      flagReason: 'Albinism: cSCC from early adulthood, often multiple — full skin examination, treat actinic keratoses, sun-protection support and lifelong surveillance.' },
    { value: 'marjolin', label: 'Arising in a chronic scar, burn scar or long-standing ulcer / sinus (Marjolin)', flag: 'red',
      flagReason: 'Marjolin ulcer: an aggressive cSCC with higher nodal spread — multiple biopsies, nodal examination, imaging of underlying bone, MDT.' },
    { value: 'xp', label: 'Xeroderma pigmentosum', flag: 'amber', flagReason: 'Xeroderma pigmentosum: multiple early skin cancers — strict UV avoidance and specialist surveillance.' },
    { value: 'gorlin', label: 'Gorlin (naevoid BCC) syndrome', flag: 'amber', flagReason: 'Gorlin syndrome: avoid radiotherapy (induces new BCCs); tissue-sparing treatment; genetics referral.' },
    { value: 'previous_skin_cancer', label: 'Previous skin cancer' },
    { value: 'outdoor_work', label: 'Long outdoor / sun-exposed work' },
    { value: 'arsenic_hpv', label: 'Arsenic exposure or HPV-associated (genital / periungual)' },
  ],
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The lesion',
  intent: 'Recorded once and carried forward; it decides the risk tier, the margin and the follow-up.',
  fields: [SITE, SITE_DETAIL, DIAGNOSIS, SIZE, BORDERS, PRIMARY, PREDISPOSITION],
};

const NODES: EncounterField = {
  id: f('nodes'), label: 'Regional lymph nodes (examined)', kind: 'select', important: true,
  options: [
    { value: 'normal', label: 'Examined — not palpable' },
    { value: 'palpable', label: 'Palpable / suspicious node', flag: 'red', flagReason: 'Suspicious regional node: ultrasound with FNA / core biopsy and cross-sectional imaging before surgery (NCCN cSCC).' },
    { value: 'not_examined', label: 'Not examined', flag: 'amber', flagReason: 'Examine the draining nodal basin(s): it changes the staging and the operation.' },
  ],
};

/** Histology options, used for the pre-operative biopsy and the excision specimen. */
const HISTOLOGY_OPTIONS: NonNullable<EncounterField['options']> = [
  { value: 'bcc_low', label: 'BCC — nodular or superficial' },
  { value: 'bcc_high', label: 'BCC — infiltrative, morphoeic, micronodular or basosquamous', flag: 'amber', flagReason: 'Aggressive BCC subtype: high-risk (NCCN; BAD 2021) — wider margins or margin-controlled excision.' },
  { value: 'scc_insitu', label: 'SCC in situ (Bowen\'s)' },
  { value: 'scc_well', label: 'cSCC — well differentiated' },
  { value: 'scc_mod', label: 'cSCC — moderately differentiated', flag: 'amber', flagReason: 'Moderately differentiated cSCC: high-risk (BAD 2020).' },
  { value: 'scc_poor', label: 'cSCC — poorly differentiated, desmoplastic or adenosquamous', flag: 'red', flagReason: 'Poorly differentiated / desmoplastic cSCC: very high risk (BAD 2020) — MDT, consider adjuvant radiotherapy and nodal surveillance.' },
  { value: 'ka', label: 'Keratoacanthoma-type SCC' },
  { value: 'benign', label: 'Benign / actinic keratosis' },
  { value: 'melanoma', label: 'Melanoma', flag: 'red', flagReason: 'Melanoma: stage on Breslow and plan WLE ± SLNB in the Melanoma WLE module (NICE NG14; AJCC 8).' },
  { value: 'merkel', label: 'Merkel cell carcinoma', flag: 'red', flagReason: 'Merkel cell carcinoma: urgent MDT; SLNB is recommended for every clinically node-negative patient (NCCN MCC).' },
  { value: 'other', label: 'Other malignancy (adnexal, DFSP, sarcoma, Kaposi…)', flag: 'amber', flagReason: 'Uncommon cutaneous malignancy: discuss at the skin / sarcoma MDT before definitive surgery.' },
];

// ── Pre-operative ───────────────────────────────────────────────────────────

const SEVEN_POINT: ScreeningInstrument = {
  id: 'seven_point',
  name: 'Weighted 7-point checklist',
  abbreviation: '7-point',
  version: 'Weighted (NICE NG12)',
  stem: 'For a pigmented skin lesion:',
  items: [
    { id: 'size_change', label: 'Major — change in size', source: 'patient', options: [{ value: 0, label: 'No' }, { value: 2, label: 'Yes (2)' }] },
    { id: 'shape', label: 'Major — irregular shape', source: 'clinician', options: [{ value: 0, label: 'No' }, { value: 2, label: 'Yes (2)' }] },
    { id: 'colour', label: 'Major — irregular colour', source: 'clinician', options: [{ value: 0, label: 'No' }, { value: 2, label: 'Yes (2)' }] },
    { id: 'diameter', label: 'Minor — largest diameter 7 mm or more', source: 'clinician', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes (1)' }] },
    { id: 'inflammation', label: 'Minor — inflammation', source: 'clinician', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes (1)' }] },
    { id: 'oozing', label: 'Minor — oozing', source: 'clinician', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes (1)' }] },
    { id: 'sensation', label: 'Minor — change in sensation', source: 'patient', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes (1)' }] },
  ],
  totalRange: [0, 10],
  lowerIsBetter: true,
  citation: 'NICE NG12 Suspected cancer (2015, updated); weighted checklist after MacKie 1990 and Walter FM et al. Br J Gen Pract 2013;63:e345-53.',
  licence: 'Published public-domain checklist (NICE NG12).',
  notes: ['A score of 3 or more: refer as suspected melanoma (NICE NG12).'],
  bands: [
    { min: 0, max: 2, band: { label: 'Below the referral threshold', level: 'low', interpretation: 'Score under 3: refer anyway if dermoscopy or clinical concern suggests melanoma (NICE NG12).' } },
    { min: 3, max: 10, band: { label: 'Suspected melanoma', level: 'high', interpretation: 'Score 3 or more: manage as suspected melanoma — excision biopsy with a 2 mm margin, not a wide excision (NICE NG12).' } },
  ],
};
const PIGMENTED = (a: EncounterAnswers) => isOneOf(a, f('diagnosis'), 'pigmented', 'uncertain');

const FEATURES: EncounterSection = {
  id: f('features'),
  title: 'Clinical features and staging examination',
  intent: 'What the lesion looks like, whether it is invading nerve or bone, and the nodes.',
  fields: [
    {
      id: f('duration'), label: 'Duration', kind: 'select',
      options: [
        { value: 'under_3m', label: 'Under 3 months' },
        { value: '3_12m', label: '3–12 months' },
        { value: 'over_1y', label: 'Over a year' },
      ],
    },
    {
      id: f('clinical'), label: 'Clinical features', kind: 'multiselect',
      options: [
        { value: 'pearly', label: 'Pearly rolled edge, telangiectasia' },
        { value: 'ulcerated', label: 'Ulcerated / bleeding' },
        { value: 'keratotic', label: 'Keratotic / crusted' },
        { value: 'rapid', label: 'Rapid growth over weeks', flag: 'amber', flagReason: 'Rapidly growing lesion: high-risk cSCC (NCCN) or keratoacanthoma — treat as cSCC; do not delay.' },
        { value: 'scar_like', label: 'Scar-like, indurated, ill-defined (morphoeic)' },
        { value: 'fixed', label: 'Fixed to deep structures (cartilage, bone, muscle)', flag: 'red', flagReason: 'Fixed to deep structures: image (CT for bone, MRI for soft tissue / nerve) and MDT before excision (NCCN).' },
        { value: 'satellite', label: 'Satellite / in-transit nodules', flag: 'red', flagReason: 'In-transit disease: stage before surgery and discuss at MDT.' },
      ],
    },
    {
      id: f('neuro'), label: 'Perineural symptoms or signs', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'pain', label: 'Pain, burning or formication' },
        { value: 'numbness', label: 'Numbness in a nerve territory', flag: 'amber', flagReason: 'Sensory loss near a cSCC / BCC suggests perineural spread: MRI with contrast along the nerve (NCCN).' },
        { value: 'motor', label: 'Facial weakness, ptosis or diplopia', flag: 'red', flagReason: 'Motor cranial-nerve deficit: clinical perineural invasion — MRI of the nerve to the skull base and MDT before any surgery (NCCN).' },
      ],
    },
    NODES,
    ...instrumentFields(SEVEN_POINT, f('sp'), { visibleWhen: PIGMENTED }),
    {
      id: f('dermoscopy'), label: 'Dermoscopy', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done / no dermatoscope' },
        { value: 'consistent', label: 'Consistent with the clinical diagnosis' },
        { value: 'melanoma', label: 'Suggests melanoma', flag: 'red', flagReason: 'Dermoscopy suggests melanoma: manage as suspected melanoma (NICE NG12).' },
      ],
    },
  ],
};

const BIOPSY_PLAN: EncounterSection = {
  id: f('biopsy_plan'),
  title: 'Diagnosis, margin and closure',
  intent: 'Know what it is before a wide excision or a flap; choose the margin for the risk; decide who owns the closure.',
  fields: [
    {
      id: f('biopsy'), label: 'Biopsy', kind: 'select', important: true,
      options: [
        { value: 'not_needed', label: 'Not needed — clinically typical, small; excision is the biopsy' },
        { value: 'needed', label: 'Needed before definitive surgery — not yet done', flag: 'amber',
          flagReason: 'Biopsy before a wide excision, flap or graft, before treating a lesion of uncertain nature, and always in a Marjolin ulcer (BAD 2021; NCCN).' },
        { value: 'done', label: 'Done — result below' },
        { value: 'pending', label: 'Done — result pending' },
      ],
    },
    { id: f('biopsy_result'), label: 'Biopsy result', kind: 'select', options: HISTOLOGY_OPTIONS, showWhen: { field: f('biopsy'), equals: ['done'] } },
    {
      id: f('margin_mm'), label: 'Planned peripheral clinical margin', kind: 'number', unit: 'mm', min: 0, max: 50, important: true,
      help: 'BCC low risk 4 mm; cSCC low 4 mm, high 6 mm, very high 10 mm (BAD 2021; BAD 2020; NCCN).',
    },
    {
      id: f('margin_control'), label: 'Margin control', kind: 'select', important: true,
      options: [
        { value: 'standard', label: 'Standard excision; margins on routine histology' },
        { value: 'frozen', label: 'Frozen-section margins' },
        { value: 'staged', label: 'Staged excision with delayed closure (CCPDMA / "slow Mohs")' },
        { value: 'mohs', label: 'Mohs micrographic surgery (referral)' },
      ],
    },
    {
      id: f('deep_plane'), label: 'Deep margin', kind: 'select',
      options: [
        { value: 'subcut', label: 'Subcutaneous fat' },
        { value: 'fascia', label: 'To fascia / perichondrium / periosteum' },
        { value: 'beyond', label: 'Including fascia, muscle, cartilage or bone' },
      ],
    },
    {
      id: f('closure'), label: 'Planned closure', kind: 'select', important: true,
      options: [
        { value: 'direct', label: 'Direct closure' },
        { value: 'graft', label: 'Skin graft' },
        { value: 'local_flap', label: 'Local flap' },
        { value: 'regional_flap', label: 'Regional / free flap' },
        { value: 'secondary', label: 'Healing by secondary intention' },
        { value: 'delayed', label: 'Dressing now; reconstruct once margins are clear' },
      ],
    },
    {
      id: f('imaging'), label: 'Imaging', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed' },
        { value: 'needed', label: 'Needed — not yet done', flag: 'amber', flagReason: 'Imaging indicated (bone fixation, perineural signs, suspicious nodes, very large tumour): complete it before excision (NCCN).' },
        { value: 'done', label: 'Done — reviewed' },
      ],
    },
  ],
};

// ── Post-operative and follow-up: the histology ─────────────────────────────

const HISTOLOGY: EncounterField = {
  id: f('histology'), label: 'Excision histology', kind: 'select', important: true,
  options: [{ value: 'pending', label: 'Pending', flag: 'amber', flagReason: 'Histology pending: track the result and book the results visit.' }, ...HISTOLOGY_OPTIONS],
};
const SCC_HISTO = ['scc_well', 'scc_mod', 'scc_poor', 'ka'];
const MARGINS: EncounterField = {
  id: f('margin_status'), label: 'Histological margins', kind: 'select', important: true,
  showWhen: { field: f('histology'), equals: ['bcc_low', 'bcc_high', 'scc_insitu', ...SCC_HISTO, 'merkel', 'other'] },
  options: [
    { value: 'clear', label: 'Clear (1 mm or more)' },
    { value: 'close', label: 'Close (under 1 mm)', flag: 'amber', flagReason: 'Close margin (under 1 mm, RCPath dataset): MDT decision on re-excision, radiotherapy or surveillance.' },
    { value: 'peripheral', label: 'Involved — peripheral', flag: 'amber', flagReason: 'Involved peripheral margin: re-excision (margin-controlled) or radiotherapy (BAD 2021; BAD 2020).' },
    { value: 'deep', label: 'Involved — deep', flag: 'red', flagReason: 'Involved deep margin: re-excision or radiotherapy — deep residual tumour is the likeliest to recur (BAD 2021; BAD 2020).' },
  ],
};
const PATH_FEATURES: EncounterSection = {
  id: f('pathology'),
  title: 'Histology report',
  intent: 'The features that decide re-excision, radiotherapy, MDT and the surveillance interval (RCPath datasets; BAD 2020; NCCN).',
  fields: [
    HISTOLOGY,
    MARGINS,
    { id: f('closest_mm'), label: 'Closest histological margin', kind: 'number', unit: 'mm', min: 0, max: 50, showWhen: MARGINS.showWhen },
    {
      id: f('thickness_mm'), label: 'Tumour thickness', kind: 'number', unit: 'mm', min: 0, max: 60,
      showWhen: { field: f('histology'), equals: SCC_HISTO },
      numericFlags: [
        { op: '>', value: 6, level: 'red', reason: 'cSCC thicker than 6 mm: very high risk (BAD 2020) and pT3 (AJCC 8).' },
        { op: '>', value: 4, level: 'amber', reason: 'cSCC 4–6 mm thick: high risk (BAD 2020).' },
      ],
    },
    {
      id: f('depth_level'), label: 'Deepest level of invasion', kind: 'select',
      showWhen: { field: f('histology'), equals: [...SCC_HISTO, 'bcc_low', 'bcc_high'] },
      options: [
        { value: 'dermis', label: 'Dermis' },
        { value: 'subcut', label: 'Subcutaneous fat', flag: 'amber', flagReason: 'Invasion of subcutaneous fat: high-risk cSCC (BAD 2020).' },
        { value: 'beyond_fat', label: 'Beyond subcutaneous fat', flag: 'red', flagReason: 'Invasion beyond subcutaneous fat: very-high-risk cSCC (BAD 2020); pT3 (AJCC 8).' },
        { value: 'bone', label: 'Bone', flag: 'red', flagReason: 'Bone invasion: pT4 (AJCC 8) — imaging, MDT and adjuvant radiotherapy discussion.' },
      ],
    },
    {
      id: f('pni'), label: 'Perineural invasion', kind: 'select',
      showWhen: { field: f('histology'), equals: [...SCC_HISTO, 'bcc_low', 'bcc_high'] },
      options: [
        { value: 'none', label: 'None' },
        { value: 'small', label: 'Dermal nerve under 0.1 mm', flag: 'amber', flagReason: 'Perineural invasion of a small dermal nerve: high-risk cSCC (BAD 2020).' },
        { value: 'large', label: 'Nerve 0.1 mm or larger, named nerve, or below the dermis', flag: 'red', flagReason: 'Significant perineural invasion: very high risk (BAD 2020) — MRI of the nerve and adjuvant radiotherapy discussion (NCCN).' },
      ],
    },
    { id: f('lvi'), label: 'Lymphovascular invasion', kind: 'boolean', showWhen: { field: f('histology'), equals: SCC_HISTO },
      flagWhenTrue: { level: 'red', reason: 'Lymphovascular invasion: very-high-risk cSCC (BAD 2020).' } },
    {
      id: f('mdt'), label: 'Skin cancer MDT', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed (low risk, completely excised)' },
        { value: 'to_discuss', label: 'To be discussed' },
        { value: 'discussed', label: 'Discussed — outcome recorded' },
      ],
    },
    { id: f('mdt_outcome'), label: 'MDT outcome', kind: 'text', showWhen: { field: f('mdt'), equals: ['discussed'] } },
  ],
};

const RECOVERY: EncounterSection = {
  id: f('recovery'),
  title: 'Early recovery',
  fields: [
    { id: f('specimen_sent'), label: 'Specimen orientated (marking suture / diagram) and sent with clinical details', kind: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'not_orientated', label: 'Sent, not orientated', flag: 'amber', flagReason: 'Unorientated specimen: an involved margin cannot be localised — re-excision will need to be wider.' },
        { value: 'not_sent', label: 'Not sent', flag: 'red', flagReason: 'No histology: the diagnosis and margins are unknown.' },
      ] },
    {
      id: f('nerve_function'), label: 'Nerve function in the area (e.g. facial nerve branches, digital nerves)', kind: 'select',
      options: [
        { value: 'intact', label: 'Intact' },
        { value: 'sensory', label: 'Numbness (expected near the scar)' },
        { value: 'motor', label: 'New motor weakness', flag: 'amber', flagReason: 'New motor deficit after excision: document, and decide on early exploration / repair if a nerve was divided.' },
      ],
    },
  ],
};

const SURVEILLANCE: EncounterSection = {
  id: f('surveillance'),
  title: 'Surveillance',
  intent: 'Recurrence at the scar, new primaries in the field, the nodes — and what the patient does about the sun.',
  fields: [
    {
      id: f('local'), label: 'Scar and treated site', kind: 'select', important: true,
      options: [
        { value: 'no_recurrence', label: 'No sign of recurrence' },
        { value: 'suspicious', label: 'Nodule, ulcer or induration at the scar', flag: 'red', flagReason: 'Possible local recurrence: biopsy and MDT.' },
      ],
    },
    {
      id: f('new_lesions'), label: 'Rest of the skin (full skin examination)', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'No new lesion' },
        { value: 'ak', label: 'Actinic keratoses / field change' },
        { value: 'suspicious', label: 'New suspicious lesion', flag: 'amber', flagReason: 'New suspicious lesion: biopsy or excise — after one keratinocyte cancer another is common (Marcil & Stern 2000).' },
      ],
    },
    NODES,
    sunProtectionField(ID),
    { id: f('self_exam'), label: 'Patient examines their own skin monthly (taught)', kind: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No / not yet taught' }] },
  ],
};

// ── Risk tier (NCCN BCC / cSCC; BAD 2020 cSCC) ─────────────────────────────

type Tumour = 'bcc' | 'scc' | 'scc_insitu' | 'other' | null;
const tumourOf = (a: EncounterAnswers): Tumour => {
  const h = (a[f('histology')] as string | undefined) ?? (isOneOf(a, f('biopsy'), 'done') ? a[f('biopsy_result')] as string | undefined : undefined);
  if (h && h !== 'pending') {
    if (h.startsWith('bcc')) return 'bcc';
    if (h === 'scc_insitu') return 'scc_insitu';
    if (SCC_HISTO.includes(h)) return 'scc';
    return 'other';
  }
  const d = a[f('diagnosis')];
  if (d === 'bcc') return 'bcc';
  if (d === 'scc' || d === 'keratoacanthoma') return 'scc';
  if (d === 'scc_insitu') return 'scc_insitu';
  return d ? 'other' : null;
};

const immunosuppressed = (a: EncounterAnswers) => hasAny(a, 'core.immune', 'transplant', 'immunosuppressant', 'chemo', 'hiv');
const histoOf = (a: EncounterAnswers) => (a[f('histology')] as string | undefined) ?? (a[f('biopsy_result')] as string | undefined);

/**
 * Risk-tier inputs asked only pre-operatively (the core immunosuppression and
 * radiotherapy questions, perineural symptoms, clinical features). After the
 * operation they come from the newest earlier review of this module, so a
 * transplant recipient's cSCC stays high risk at post-op and follow-up.
 */
const PRE_OP_RISK_INPUTS = ['core.immune', 'core.radiotherapy_site', f('neuro'), f('clinical')];
export function withPreOpRiskInputs(a: EncounterAnswers, prior: PriorReview[] = []): { answers: EncounterAnswers; from?: string } {
  const last = prior.find(p => p.moduleId === ID && PRE_OP_RISK_INPUTS.some(k => answered(p.answers, k)));
  if (!last) return { answers: a };
  const out: EncounterAnswers = { ...a };
  let used = false;
  for (const k of PRE_OP_RISK_INPUTS) {
    if (!answered(a, k) && answered(last.answers, k)) { out[k] = last.answers[k]; used = true; }
  }
  return used ? { answers: out, from: last.at.slice(0, 10) } : { answers: a };
}

export interface SkinTumourRisk { tumour: Tumour; tier: 'low' | 'high' | 'very_high' | null; features: string[]; veryHigh: string[] }

/** The tier and the features that put the tumour in it (`prior`: earlier reviews, for the pre-op inputs). */
export function skinTumourRisk(answers: EncounterAnswers, prior: PriorReview[] = []): SkinTumourRisk {
  const a = withPreOpRiskInputs(answers, prior).answers;
  const tumour = tumourOf(a);
  if (tumour !== 'bcc' && tumour !== 'scc') return { tumour, tier: null, features: [], veryHigh: [] };
  const features: string[] = [];
  const veryHigh: string[] = [];
  const size = numOf(a, f('size_mm'));
  const highSite = isOneOf(a, f('site'), 'h_zone', 'face_other', 'scalp', 'neck', 'hands_feet', 'anogenital');
  if (highSite) features.push('high-risk site (head / neck, hands, feet, pretibial, anogenital)');
  if (size != null && size >= 20) features.push(`diameter ${size} mm`);
  if (isOneOf(a, f('primary'), 'recurrent', 'incomplete')) features.push('recurrent / previously incompletely excised');
  if (immunosuppressed(a)) features.push('immunosuppression');
  if (isYes(a, 'core.radiotherapy_site') || hasAny(a, f('predisposition'), 'marjolin')) features.push('previous radiotherapy or chronic scar / inflammation at the site');
  if (chosen(a, f('neuro')).length) features.push('perineural symptoms');
  const histo = histoOf(a);
  if (tumour === 'bcc') {
    if (isOneOf(a, f('borders'), 'poor')) features.push('poorly defined borders');
    if (histo === 'bcc_high') features.push('aggressive histological subtype');
    if (!isOneOf(a, f('pni'), 'none') && a[f('pni')]) features.push('perineural invasion');
    return { tumour, tier: features.length ? 'high' : 'low', features, veryHigh };
  }
  // cSCC — BAD 2020 three tiers; NCCN high-risk features folded into "high".
  if (hasAny(a, f('clinical'), 'rapid')) features.push('rapid growth');
  if (isOneOf(a, f('site'), 'h_zone') && /ear|lip/i.test(String(a[f('site_detail')] ?? ''))) features.push('ear or lip');
  if (histo === 'scc_mod') features.push('moderately differentiated');
  const thick = numOf(a, f('thickness_mm'));
  if (thick != null && thick > 4 && thick <= 6) features.push(`thickness ${thick} mm`);
  if (isOneOf(a, f('depth_level'), 'subcut')) features.push('invades subcutaneous fat');
  if (isOneOf(a, f('pni'), 'small')) features.push('perineural invasion, small dermal nerve');
  if (size != null && size > 40) veryHigh.push(`diameter over 40 mm`);
  if (thick != null && thick > 6) veryHigh.push(`thickness ${thick} mm`);
  if (isOneOf(a, f('depth_level'), 'beyond_fat', 'bone')) veryHigh.push('invasion beyond subcutaneous fat');
  if (histo === 'scc_poor') veryHigh.push('poorly differentiated / desmoplastic');
  if (isOneOf(a, f('pni'), 'large') || hasAny(a, f('neuro'), 'motor')) veryHigh.push('significant perineural invasion');
  if (isYes(a, f('lvi'))) veryHigh.push('lymphovascular invasion');
  return { tumour, tier: veryHigh.length ? 'very_high' : features.length ? 'high' : 'low', features, veryHigh };
}

const TIER_LABEL = { low: 'Low risk', high: 'High risk', very_high: 'Very high risk' } as const;

/** Margin per tier (BAD 2021 BCC; BAD 2020 cSCC; NCCN). */
const marginFor = (r: SkinTumourRisk): string | null => {
  if (r.tumour === 'bcc') return r.tier === 'low' ? '4 mm' : '5 mm or more, or margin-controlled excision (wider — up to 13–15 mm — for large or morphoeic BCC)';
  if (r.tumour === 'scc') return r.tier === 'low' ? '4 mm' : r.tier === 'high' ? '6 mm' : '10 mm';
  return null;
};

export const riskTierScore: ScoreRule = ({ answers, prior }) => {
  const r = skinTumourRisk(answers, prior);
  const carried = withPreOpRiskInputs(answers, prior).from;
  if (!r.tier) return null;
  const all = [...r.veryHigh, ...r.features];
  const level = r.tier === 'low' ? 'low' : r.tier === 'high' ? 'high' : 'very_high';
  return {
    id: `${ID}.risk`, name: r.tumour === 'bcc' ? 'BCC risk group' : 'cSCC risk group', abbreviation: 'Risk group',
    total: all.length, band: {
      label: TIER_LABEL[r.tier], level,
      interpretation: `${TIER_LABEL[r.tier]} ${r.tumour === 'bcc' ? 'BCC (NCCN; BAD 2021)' : 'cSCC (BAD 2020; NCCN)'}${all.length ? `: ${all.join('; ')}` : ': no high-risk feature recorded'}. Suggested peripheral margin ${marginFor(r)}.`,
    },
    incomplete: [], source: r.tumour === 'bcc' ? 'NCCN Basal Cell Skin Cancer risk table; BAD BCC guideline 2021' : 'BAD cSCC guideline 2020 (Keohane et al.); NCCN Squamous Cell Skin Cancer',
    detail: carried ? [`Pre-operative risk features (immunosuppression, radiotherapy, perineural symptoms, clinical features) carried from the review of ${carried}.`] : undefined,
    flag: r.tier === 'very_high' ? { level: 'red', reason: `Very-high-risk cSCC (${r.veryHigh.join('; ')}): MDT, 10 mm margins or margin control, and adjuvant radiotherapy discussion (BAD 2020).` } : undefined,
  };
};

export const sevenPointScore: ScoreRule = ({ phase, answers }) => {
  if (phase !== 'pre_op' || !PIGMENTED(answers)) return null;
  const r = scoreInstrument(SEVEN_POINT, responsesFrom(SEVEN_POINT, f('sp'), answers));
  return {
    id: `${ID}.seven_point`, name: SEVEN_POINT.name, abbreviation: SEVEN_POINT.abbreviation, total: r.total, max: 10,
    band: r.band, incomplete: r.incomplete.map(i => SEVEN_POINT.items.find(x => x.id === i)?.label ?? i),
    source: SEVEN_POINT.citation,
    flag: r.total != null && r.total >= 3 ? { level: 'red', reason: `Weighted 7-point score ${r.total}: suspected melanoma (NICE NG12).` } : undefined,
  };
};

/** AJCC 8 T category for head and neck cSCC, from the Tumour Board engine. */
export const sccStageScore: ScoreRule = ({ phase, answers }) => {
  if (phase === 'pre_op' || !SCC_HISTO.includes(String(answers[f('histology')] ?? ''))) return null;
  if (!isOneOf(answers, f('site'), 'h_zone', 'face_other', 'scalp', 'neck')) return null;
  const size = numOf(answers, f('size_mm'));
  const nodesKnown = isOneOf(answers, f('nodes'), 'normal');
  const st = computeStage({
    family: 'cutaneous_scc', basis: 'pathological', sizeCm: size != null ? size / 10 : null,
    deepInvasion: (numOf(answers, f('thickness_mm')) ?? 0) > 6 || isOneOf(answers, f('depth_level'), 'beyond_fat'),
    perineuralInvasion: isOneOf(answers, f('pni'), 'large'),
    boneInvasionCortical: isOneOf(answers, f('depth_level'), 'bone'),
    nodesInvolved: 0, histologyAvailable: true,
  });
  return {
    id: `${ID}.ajcc`, name: 'AJCC 8 stage (head and neck cSCC)', abbreviation: 'AJCC 8', total: null,
    band: {
      label: nodesKnown ? `p${st.T} cN0 — Stage ${st.stageGroup}` : `p${st.T}`,
      level: ['T3', 'T4a', 'T4b'].includes(st.T) ? 'high' : 'low',
      interpretation: nodesKnown
        ? `${st.stageDescription} Nodes clinically negative; ratify at the MDT.`
        : 'T category only: the nodal basin has not been recorded as examined and negative.',
    },
    incomplete: size == null ? ['Clinical diameter'] : [],
    source: 'Tumour Board stagingEngine.computeStage (AJCC 8th, chapter 15)',
    detail: st.caveats,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Complete excision with histologically clear margins at the first operation', 'Clear margins give the lowest recurrence (Rowe 1989; BAD 2021; BAD 2020)'),
      L('A confirmed histological diagnosis, risk group and (cSCC) stage', 'Histology decides re-excision, radiotherapy and surveillance'),
      L('Closure that preserves function and appearance, deferred until margins are clear when a flap or graft would bury residual tumour', 'Oncological clearance before reconstruction'),
      L('Surveillance for recurrence and new primaries; the patient protects their skin and examines it', 'Further keratinocyte cancers are common after the first (Marcil & Stern 2000)'),
    ],
  },
});

/**
 * A pigmented lesion that may be melanoma and has no histology yet. Whatever
 * the 7-point score, it is not closed with a flap or graft before the
 * diagnosis and Breslow thickness are known: a flap ruins re-excision and
 * sentinel node mapping (NICE NG14; BAD melanoma guideline).
 */
const melanomaNotExcluded = (ctx: PlanContext) => {
  const a = ctx.answers;
  const histologyKnown = isOneOf(a, f('biopsy'), 'done') && answered(a, f('biopsy_result')) && !isOneOf(a, f('biopsy_result'), 'pending', 'melanoma');
  return (isOneOf(a, f('diagnosis'), 'pigmented') || isOneOf(a, f('dermoscopy'), 'melanoma') || (ctx.scores[`${ID}.seven_point`]?.total ?? 0) >= 3)
    && !histologyKnown && !isOneOf(a, f('biopsy_result'), 'melanoma');
};

const triage: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const sp = ctx.scores[`${ID}.seven_point`];
  const melanoma = (sp?.total ?? 0) >= 3 || isOneOf(a, f('dermoscopy'), 'melanoma') || isOneOf(a, f('biopsy_result'), 'melanoma');
  return merge(
    !melanoma && melanomaNotExcluded(ctx) && { problem: { treatment: [L(
      'Pigmented lesion that may be melanoma: unless melanoma is excluded clinically and on dermoscopy, excision biopsy with a 2 mm clinical margin and primary closure — no flap, graft or wide excision until the histology is known',
      'Possible melanoma without a histological diagnosis (NICE NG14; BAD melanoma guideline)', 'urgent')] } },
    melanoma && { problem: { treatment: [L(
      isOneOf(a, f('biopsy_result'), 'melanoma')
        ? 'Biopsy shows melanoma: plan wide local excision ± sentinel node biopsy in the Melanoma WLE review, not this one'
        : 'Suspected melanoma: excision biopsy with a 2 mm clinical margin and primary closure (no flap, graft or wide excision until Breslow thickness is known)',
      isOneOf(a, f('biopsy_result'), 'melanoma') ? 'Biopsy result melanoma (NICE NG14)' : `${sp?.total != null ? `Weighted 7-point score ${sp.total}` : 'Dermoscopy suggests melanoma'} (NICE NG12; BAD melanoma guideline)`,
      'urgent')] } },
    isOneOf(a, f('biopsy_result'), 'merkel') && { problem: { referrals: [L('Urgent skin-cancer MDT and oncology: wide excision with SLNB and adjuvant radiotherapy planning', 'Merkel cell carcinoma on biopsy (NCCN MCC)', 'urgent')] } },
    isOneOf(a, f('biopsy'), 'needed') && { problem: { investigations: [L('Punch or incisional biopsy of the most representative area before definitive excision; send with the clinical question', 'Biopsy needed before wide excision / reconstruction / uncertain diagnosis (BAD 2021)', 'urgent')] } },
    isOneOf(a, f('biopsy'), 'pending') && { problem: { investigations: [L('Obtain the biopsy result before listing for definitive excision', 'Biopsy result pending')] } },
  );
};

const stagingWorkup: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const neuro = chosen(a, f('neuro'));
  return merge(
    neuro.length > 0 && { problem: { investigations: [L('MRI with contrast along the course of the nerve (to the skull base for facial lesions)', `Perineural symptoms: ${neuro.join(', ')} (NCCN BCC / cSCC)`, neuro.includes('motor') ? 'urgent' : 'routine')] } },
    hasAny(a, f('clinical'), 'fixed') && { problem: { investigations: [L('CT (bone erosion) and / or MRI (soft-tissue and perineural extent) of the primary site before excision', 'Tumour fixed to deep structures (NCCN)', 'urgent')] } },
    isOneOf(a, f('nodes'), 'palpable') && { problem: {
      investigations: [L('Ultrasound of the nodal basin with FNA or core biopsy; CT of the neck / chest (or the relevant basin) if positive', 'Suspicious regional node (NCCN cSCC)', 'urgent')],
      referrals: [L('Skin-cancer MDT before surgery: excision with lymph-node dissection and adjuvant radiotherapy may be needed', 'Suspicious regional node', 'urgent')],
    } },
    isOneOf(a, f('nodes'), 'not_examined') && { problem: { investigations: [L('Examine the draining lymph-node basin(s) and record the finding', 'Nodes not yet examined')] } },
    hasAny(a, f('clinical'), 'satellite') && { problem: { referrals: [L('Stage and discuss at the skin-cancer MDT before excision', 'Satellite / in-transit nodules', 'urgent')] } },
  );
};

const marginPlan: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const r = skinTumourRisk(a, ctx.prior);
  const why = `${TIER_LABEL[r.tier ?? 'low']} ${r.tumour === 'bcc' ? 'BCC' : 'cSCC'}${[...r.veryHigh, ...r.features].length ? `: ${[...r.veryHigh, ...r.features].join('; ')}` : ''}`;
  const marjolin = hasAny(a, f('predisposition'), 'marjolin');
  const planned = numOf(a, f('margin_mm'));
  const suggested = marginFor(r);
  const highRisk = r.tier === 'high' || r.tier === 'very_high';
  return merge(
    !!suggested && { problem: { treatment: [L(`Peripheral clinical margin ${suggested}, deep margin to the next anatomical plane; mark the margin before infiltrating local anaesthetic`,
      `${why} (${r.tumour === 'bcc' ? 'BAD 2021; NCCN; Wolf & Zitelli 1987 — 4 mm clears 95% of well-defined BCC under 2 cm' : 'BAD 2020 cSCC guideline; NCCN'})`)] } },
    !!suggested && planned != null && ((r.tumour === 'bcc' && planned < (r.tier === 'low' ? 4 : 5)) || (r.tumour === 'scc' && planned < (r.tier === 'low' ? 4 : r.tier === 'high' ? 6 : 10)))
      && { cautions: [`Planned margin ${planned} mm is narrower than the published ${suggested} for this risk group — record why (anatomical constraint, margin control planned).`] },
    r.tumour === 'scc_insitu' && { problem: { treatment: [L('SCC in situ: excision with a narrow clear margin, or non-surgical treatment (5-fluorouracil, imiquimod, cryotherapy, photodynamic therapy) where cosmesis or site favour it', 'Bowen\'s disease (BAD Bowen\'s disease guideline 2014)')] } },
    highRisk && isOneOf(a, f('site'), 'h_zone', 'face_other') && { problem: { treatment: [L('Margin-controlled excision for high-risk facial tumours: Mohs where available; otherwise staged excision with complete circumferential and deep margin assessment (CCPDMA) before reconstruction', `${why} on the face (BAD 2021; NCCN)`)] } },
    highRisk && isOneOf(a, f('closure'), 'local_flap', 'regional_flap', 'graft') && !isOneOf(a, f('margin_control'), 'frozen', 'staged', 'mohs') && { problem: { treatment: [L('Delay the flap or graft until the margins are confirmed clear (dressing or temporary graft meanwhile), or use frozen-section margins: a flap moves tissue and makes residual tumour hard to find and re-excise', `${why}; flap / graft planned with routine histology only`)] } },
    marjolin && { problem: {
      investigations: [
        L('Multiple biopsies from the edge and the base (several sites) to confirm cSCC and its grade', 'Marjolin ulcer — sampling error is common in large ulcers'),
        L('X-ray, then CT / MRI, of the underlying bone and joint for a limb or scalp lesion', 'Marjolin ulcer — bone involvement changes the operation (amputation may be needed on a limb)'),
      ],
      treatment: [L('Wide excision with margins agreed at the MDT (series commonly report 2 cm or more) including the deep fascia; reconstruct once margins are clear', 'Marjolin ulcer — aggressive cSCC with high local recurrence; no guideline margin exists (clinical judgement)')],
      referrals: [L('Skin-cancer / sarcoma MDT before surgery', 'Marjolin ulcer', 'urgent')],
    } },
    isOneOf(a, f('primary'), 'incomplete') && { problem: { investigations: [L('Obtain the original histology report (and slides for review) before re-excision', 'Incompletely excised elsewhere')] } },
    (r.tier === 'very_high') && { problem: { referrals: [L('Skin-cancer MDT before excision: margins, nodal staging and adjuvant radiotherapy', `Very-high-risk cSCC: ${r.veryHigh.join('; ')} (BAD 2020)`, 'urgent')] } },
  );
};

const theatre: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const closure = a[f('closure')];
  const oop = isOneOf(a, 'core.funding', 'out_of_pocket') || isOneOf(a, 'core.cost_barrier', 'with_difficulty', 'no');
  return merge(
    { general: [G('Anaesthesia and theatre',
      L('Orientate the specimen (marking suture, e.g. long-superior / short-medial) with a diagram; send for histology with the clinical diagnosis, risk features and margins taken', 'Orientation lets an involved margin be re-excised precisely (RCPath skin cancer datasets)'),
      L('Photograph and mark the lesion and margin before infiltration; WHO site check including side', 'Small skin lesions are easily lost once infiltrated'),
    )] },
    (closure === 'graft' || closure === 'local_flap' || closure === 'regional_flap') && (melanomaNotExcluded(ctx)
      ? { cautions: [`Planned ${String(closure).replace('_', ' ')} closure over a lesion that may be melanoma: excision biopsy with primary closure first; reconstruct only after the histology (NICE NG14).`] }
      : { problem: { referrals: [L('Plan the closure in its own reconstruction procedure review (skin graft or flap): donor site, flap design and their consent', `Planned closure: ${String(closure).replace('_', ' ')}`)] } }),
    closure === 'delayed' && { problem: { treatment: [L('Moist dressing to the open defect; book the reconstruction once histology confirms clear margins (usually 1–2 weeks)', 'Delayed reconstruction after margin clearance')] } },
    { problem: { monitoring: [L(oop
      ? 'Agree before surgery how the histology fee will be paid and who will take the specimen and collect the report; record the laboratory and the expected date'
      : 'Track the histology: record the laboratory and book the results visit before discharge',
      oop ? 'Out-of-pocket histology — an unprocessed specimen means no diagnosis and no margin status' : 'Results not acted on are a recognised cause of missed re-excision')] } },
  );
};

const predisposition: PlanRule = ctx => {
  if (ctx.phase === 'post_op') return null;
  const a = ctx.answers;
  const p = chosen(a, f('predisposition'));
  const transplant = hasAny(a, 'core.immune', 'transplant', 'immunosuppressant');
  return merge(
    p.includes('albinism') && {
      problem: { treatment: [L('Full skin examination at every visit; treat actinic keratoses (cryotherapy or topical 5-fluorouracil) and biopsy any non-healing or nodular lesion', 'Oculocutaneous albinism — multiple keratinocyte cancers from early adulthood')] },
      problems: [{ problem: 'Oculocutaneous albinism — skin cancer prevention', lines: {
        treatment: [L('Sun-protection kit and teaching: wide-brimmed hat, long sleeves, SPF 30+ broad-spectrum sunscreen reapplied every 2 hours outdoors, shade between 10:00 and 16:00', 'Albinism — UV protection is the main preventive measure (WHO; NICE NG34)')],
        referrals: [
          L('Dermatology / albinism support programme for sunscreen supply and lifelong 3–6-monthly skin checks', 'Albinism — surveillance interval is a local-programme choice'),
          L('Ophthalmology / low-vision services; give information in large print', 'Albinism — reduced visual acuity'),
        ],
      } }],
      counselling: [P('Albinism', 'Why skin cancers keep appearing, how to protect the skin, and to return early for any sore that does not heal in 4 weeks; offer psychosocial and safety support.', 'Oculocutaneous albinism')],
    },
    p.includes('gorlin') && { cautions: ['Gorlin syndrome: avoid radiotherapy (induces new BCCs in the field).'] },
    p.includes('xp') && { problem: { referrals: [L('Specialist dermatology and genetics: strict UV avoidance and frequent surveillance', 'Xeroderma pigmentosum')] } },
    transplant && { comorbidities: [{ condition: 'Immunosuppression and skin cancer', actions: [L('Ask the transplant / prescribing team about reducing immunosuppression or switching to an mTOR inhibitor; shorten the surveillance interval', 'Immunosuppressed patients develop more, and more aggressive, cSCC (NCCN; BAD 2020)')] }] },
    hasAny(a, 'core.immune', 'hiv') && { comorbidities: [{ condition: 'HIV and skin cancer', actions: [L('Confirm viral suppression on ART: cSCC is more aggressive with uncontrolled HIV', 'HIV (NCCN cSCC high-risk feature)')] }] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op' && ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const h = a[f('histology')];
  const r = skinTumourRisk(a, ctx.prior);
  const ms = a[f('margin_status')];
  const tumourName = r.tumour === 'bcc' ? 'BCC' : 'cSCC';
  return merge(
    h === 'pending' && { problem: { monitoring: [L('Chase the histology and review the result with the patient (usually 2–4 weeks)', 'Histology pending')] } },
    h === 'melanoma' && { problem: { treatment: [L('Melanoma on histology: stage (Breslow, ulceration) and plan wide local excision ± SLNB in the Melanoma WLE review', 'Excision histology melanoma (NICE NG14; AJCC 8)', 'urgent')] } },
    h === 'merkel' && { problem: { referrals: [L('Urgent skin-cancer MDT and oncology: wider excision, SLNB and adjuvant radiotherapy', 'Merkel cell carcinoma (NCCN MCC)', 'urgent')] } },
    h === 'other' && { problem: { referrals: [L('Discuss the histology at the skin / sarcoma MDT before further surgery', 'Uncommon cutaneous malignancy')] } },
    ms === 'deep' && { problem: { treatment: [L(`Re-excise the deep margin (margin-controlled where possible) or offer radiotherapy if re-excision is not feasible`, `Involved deep margin — ${tumourName} (BAD 2021; BAD 2020)`, 'urgent')] } },
    ms === 'peripheral' && { problem: { treatment: [L(r.tumour === 'bcc' && r.tier === 'low'
      ? 'Re-excision (or radiotherapy) is preferred; active surveillance is an option only for low-risk BCC at a non-critical site after MDT discussion with the patient'
      : 'Re-excise the involved margin using the orientation, with margin control; radiotherapy if re-excision is not feasible',
      `Involved peripheral margin — ${TIER_LABEL[r.tier ?? 'high']} ${tumourName} (BAD 2021; BAD 2020)`)] } },
    ms === 'close' && { problem: { referrals: [L('MDT decision on re-excision, radiotherapy or closer surveillance', `Close margin (under 1 mm)${r.tier ? ` — ${TIER_LABEL[r.tier]} ${tumourName}` : ''} (RCPath dataset)`)] } },
    r.tumour === 'scc' && r.tier === 'very_high' && !!h && h !== 'pending' && { problem: {
      referrals: [L('Skin-cancer MDT and clinical oncology: adjuvant radiotherapy discussion', `Very-high-risk cSCC: ${r.veryHigh.join('; ')} (BAD 2020; NCCN)`, 'urgent')],
      monitoring: [L('Consider nodal-basin ultrasound surveillance in addition to examination', 'Very-high-risk cSCC (BAD 2020)')],
    } },
    isOneOf(a, f('pni'), 'large') && { problem: { investigations: [L('MRI of the involved nerve to the skull base / plexus', 'Significant perineural invasion (NCCN)')] } },
    isOneOf(a, f('mdt'), 'to_discuss') && { problem: { referrals: [L('List for the skin-cancer MDT with the histology, photographs and the operation note', 'MDT discussion pending')] } },
  );
};

const earlyRecovery: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('specimen_sent'), 'not_sent') && { problem: { treatment: [L('Find the specimen today; if it is lost, tell the patient and plan the next step (re-biopsy, surveillance or re-excision)', 'Specimen not sent to histology', 'urgent')] } },
    isOneOf(a, f('nerve_function'), 'motor') && { problem: { treatment: [L('New motor deficit: if a branch was divided, early exploration and repair; if not, observe with eye care (facial nerve) and review at 2 weeks', 'New motor weakness after excision')] } },
    { general: [G('Wound care and dressings', L('Remove sutures at 5–7 days on the face, 10–14 days on the trunk and limbs; keep the wound dry for 48 hours', 'Standard suture timing for skin excision'))] },
    { dischargeCriteria: ['Wound dry and comfortable on oral analgesia', 'Histology results visit booked and the patient knows how the result will reach them'] },
  );
};

const surveillance: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const r = skinTumourRisk(a, ctx.prior);
  return merge(
    isOneOf(a, f('local'), 'suspicious') && { problem: { investigations: [L('Biopsy the scar lesion; MDT if recurrence is confirmed', 'Possible local recurrence', 'urgent')] } },
    isOneOf(a, f('new_lesions'), 'suspicious') && { problem: { investigations: [L('Biopsy or excise the new suspicious lesion', 'New suspicious lesion on full skin examination')] } },
    isOneOf(a, f('new_lesions'), 'ak') && { problem: { treatment: [L('Treat actinic keratoses / field change (cryotherapy, topical 5-fluorouracil or imiquimod)', 'Field change — precursor of cSCC (BAD actinic keratosis guideline 2017)')] } },
    isOneOf(a, f('nodes'), 'palpable') && { problem: { investigations: [L('Ultrasound-guided FNA / core biopsy of the node; staging CT if positive', 'Palpable node on surveillance (NCCN cSCC)', 'urgent')] } },
    isOneOf(a, f('self_exam'), 'no') && { counselling: [P('Self-examination', 'Show the patient (and a family member for the back and scalp) how to examine the skin and nodes monthly, and what to report.', 'Self-examination not yet taught')] },
    !isOneOf(a, f('sun_protection'), 'consistent') && { counselling: [P('Sun protection', 'Hat, clothing and shade at midday; SPF 30+ broad-spectrum sunscreen on exposed skin; no sunbeds. Sunscreen is affordable when bought in larger tubes — ask the pharmacy.', 'Sun protection not consistent (NICE NG34)')] },
    r.tumour === 'bcc' && { problem: { monitoring: [L(r.tier === 'low' ? 'Low-risk BCC, completely excised: one post-operative review, then discharge with self-examination teaching and open access' : 'High-risk or recurrent BCC: review every 6–12 months for 5 years, then annually', r.tier === 'low' ? 'BAD 2021 BCC guideline' : 'NCCN Basal Cell Skin Cancer follow-up')] } },
    r.tumour === 'scc' && { problem: { monitoring: [L(r.tier === 'low' ? 'Low-risk cSCC: review every 6–12 months for 2 years, then annually' : 'High / very-high-risk cSCC: review every 3–6 months for 2 years, every 6–12 months to 5 years, then annually — skin, scar and nodes each visit',
      `${TIER_LABEL[r.tier ?? 'low']} cSCC (NCCN Squamous Cell Skin Cancer follow-up; BAD 2020)`)] } },
  );
};

const education: PlanRule = () => ({
  general: [G('Patient education',
    L('Teach monthly self-examination of the skin and scar and of the lymph nodes; report a new lump, a sore that will not heal in 4 weeks, or a changing mole', 'Patients find many recurrences and new primaries themselves (NCCN; BAD 2021)'),
    L('Sun protection for life: shade, hat, clothing, SPF 30+ sunscreen; never sunbeds', 'UV exposure causes further keratinocyte cancers (NICE NG34)'),
  )],
});

// ── The module ──────────────────────────────────────────────────────────────

const riskFor = (c: PlanContext) => skinTumourRisk(c.answers, c.prior);

export const skinTumourExcision: ProcedureModule = {
  id: ID,
  name: 'Skin cancer excision (BCC, cSCC, suspicious lesion)',
  summary: 'Excision of basal and squamous cell carcinoma and suspicious skin lesions: risk group, margins, biopsy, histology, MDT and surveillance — including albinism and Marjolin ulcers.',
  group: 'oncology',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Skin cancer excision',
  basis: [
    'NCCN Guidelines: Basal Cell Skin Cancer; Squamous Cell Skin Cancer (risk stratification, margins, follow-up)',
    'British Association of Dermatologists: BCC guideline 2021 (Nasr et al., Br J Dermatol 2021); cSCC guideline 2020 (Keohane et al., Br J Dermatol 2021); Bowen\'s disease 2014; actinic keratosis 2017',
    'NICE NG12 Suspected cancer: recognition and referral (weighted 7-point checklist); NICE NG34 Sunlight exposure',
    'AJCC Cancer Staging Manual, 8th edition — cutaneous carcinoma of the head and neck (chapter 15)',
    'Royal College of Pathologists datasets for BCC and cSCC (margin definitions)',
    'Wolf DJ, Zitelli JA. Surgical margins for basal cell carcinoma. Arch Dermatol 1987;123:340-4; Breuninger H, Dietz K. Prediction of subclinical tumor infiltration in basal cell carcinoma. J Dermatol Surg Oncol 1991',
    'Rowe DE et al. J Dermatol Surg Oncol 1989;15:315-28 (BCC) and J Am Acad Dermatol 1992;26:976-90 (cSCC) — recurrence after treatment',
    'Marcil I, Stern RS. Risk of developing a subsequent nonmelanoma skin cancer. Arch Dermatol 2000;136:1524-30',
    'Kiprono SK et al. Histological review of skin cancers in African albinos. BMC Cancer 2014;14:157; Lekalakala PT et al. Oculocutaneous albinism and squamous cell carcinoma of the skin of the head and neck in sub-Saharan Africa. J Skin Cancer 2015',
  ],
  catalog: {
    feeIds: ['minor-001', 'minor-002', 'soft-006', 'soft-007'],
    educationId: null,
    educationNote: 'No keratinocyte-cancer excision record in the procedure education database (TUMOR-002 covers incisional biopsy only); the module\'s ConsentSpec carries the procedure risks.',
    patientEducationIds: [],
  },
  sections: {
    pre_op: [DETAILS, FEATURES, BIOPSY_PLAN],
    post_op: [DETAILS, PATH_FEATURES, RECOVERY],
    follow_up: [DETAILS, PATH_FEATURES, SURVEILLANCE],
  },
  carryForward: [
    f('site'), f('site_detail'), f('diagnosis'), f('size_mm'), f('borders'), f('primary'), f('predisposition'),
    f('histology'), f('margin_status'), f('closest_mm'), f('thickness_mm'), f('depth_level'), f('pni'), f('lvi'), f('mdt'), f('mdt_outcome'),
  ],
  scores: [sevenPointScore, riskTierScore, sccStageScore],
  planRules: [goals, triage, stagingWorkup, marginPlan, theatre, predisposition, postOp, earlyRecovery, surveillance, education],
  consent: {
    procedureName: 'Excision of skin cancer / skin lesion',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove the skin cancer completely and confirm what it is under the microscope',
      'Prevent it growing into nearby skin, cartilage, bone, nerves or the eye',
      'For squamous cell cancer, reduce the risk of spread to the lymph glands',
    ],
    risks: [
      { name: 'Incomplete excision', description: 'The laboratory may find cancer at the edge of the removed skin, so a second operation or radiotherapy is needed' },
      { name: 'Recurrence', description: 'The cancer can come back at the scar even after complete removal; the risk is higher for recurrent or high-risk tumours', frequency: 'about 10% at 5 years for BCC after standard excision; lower with clear margins (Rowe 1989)' },
      { name: 'Further skin cancers', description: 'Another skin cancer elsewhere is common after the first, so skin checks continue', frequency: 'within 3 years, about 44% after a BCC develop another BCC, and about 18% after a cSCC develop another cSCC (Marcil & Stern 2000)' },
      { name: 'Scar and distortion', description: 'A scar longer than the lesion (about three times its length); on the face, possible pulling of the eyelid, lip or nostril' },
      { name: 'Nerve injury', description: 'Numbness around the scar is common; injury to a branch of the facial nerve (brow or lip weakness) is rare' },
      { name: 'Wound problems', description: 'Bleeding, infection or wound opening; a graft or flap may partly fail' },
      { name: 'Pigment change and thick scars', description: 'In darker skin, the scar may become lighter or darker, or hypertrophic / keloid' },
    ],
    alternatives: [
      'Mohs micrographic surgery (margin-controlled; limited availability in Nigeria) or staged excision with margin checks before closure',
      'Radiotherapy (useful when surgery is difficult or the patient is frail; avoided in Gorlin syndrome and younger patients)',
      'For superficial BCC or SCC in situ: creams (imiquimod, 5-fluorouracil), cryotherapy, photodynamic therapy, curettage and cautery',
      'Active monitoring for some slow-growing, low-risk BCCs in frail patients',
      'Drug treatment for advanced disease (hedgehog inhibitors for BCC; cemiplimab for cSCC) — specialist oncology, cost and availability limited',
      'No treatment',
    ],
    riskOfNotTreating: 'A basal cell carcinoma keeps growing slowly and can destroy the nose, eyelid, ear or bone, making later surgery much bigger. A squamous cell carcinoma can grow faster and spread to the lymph glands and, rarely, beyond, where it may become incurable.',
    anaesthesiaOptions: ['local', 'sedation', 'general'],
    additionalProcedures: [
      'A skin graft or local flap to close the wound (with its own donor site)',
      'Re-excision if the margins are involved',
      'Biopsy of lymph glands if one is enlarged',
    ],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: true,
    counsellingTopics: [
      'What the histology may show and how the result will be given',
      'The margin of normal skin taken and why the scar is larger than the lesion',
      'The chance of a second operation if margins are involved',
      'Skin self-examination and sun protection for life',
      'The histology fee and how the specimen reaches the laboratory',
    ],
    modifiers: [
      { id: 'ste_high_site', when: c => isOneOf(c.answers, f('site'), 'h_zone'),
        text: 'Because the cancer is on the central face, eyelid, nose, lip or ear, it is more likely to come back, and the repair may change the shape of the area.',
        why: 'H-zone site (BAD 2021; NCCN)' },
      { id: 'ste_recurrent', when: c => isOneOf(c.answers, f('primary'), 'recurrent', 'incomplete'),
        text: 'Because this cancer has come back (or was not fully removed before), it is more likely to come back again after this operation.',
        why: 'Recurrent tumour — about 17% 5-year recurrence after re-excision of recurrent BCC (Rowe 1989)' },
      { id: 'ste_immune', when: c => immunosuppressed(c.answers) && (riskFor(c).tumour === 'scc' || riskFor(c).tumour === 'bcc'),
        text: 'Because your immune system is suppressed, skin cancers are more likely to come back, to spread and to appear elsewhere.',
        why: 'Immunosuppression (NCCN; BAD 2020)' },
      { id: 'ste_albinism', when: c => hasAny(c.answers, f('predisposition'), 'albinism'),
        text: 'With albinism, new skin cancers are very likely over the years, so regular skin checks and sun protection are essential.',
        why: 'Oculocutaneous albinism' },
      { id: 'ste_marjolin', when: c => hasAny(c.answers, f('predisposition'), 'marjolin'),
        text: 'A cancer arising in an old scar or ulcer is more aggressive: the operation will be wider, the glands may be involved, and on a limb, amputation is sometimes needed.',
        why: 'Marjolin ulcer' },
      { id: 'ste_nerve', when: c => chosen(c.answers, f('neuro')).length > 0,
        text: 'Because the cancer may be growing along a nerve, the nerve may need to be removed (with numbness or weakness), and radiotherapy may be advised afterwards.',
        why: 'Perineural symptoms' },
      { id: 'ste_very_high', when: c => riskFor(c).tier === 'very_high',
        text: 'This is a high-risk type of squamous cell cancer: radiotherapy after surgery and closer follow-up are likely to be advised.',
        why: 'Very-high-risk cSCC (BAD 2020)' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before listing', purpose: 'Biopsy / imaging results reviewed; risk group and margin agreed' }],
    post_op: [
      { when: 'Day 5–14', purpose: 'Wound check and suture removal (5–7 days face; 10–14 days trunk and limbs)' },
      { when: '2–4 weeks', purpose: 'Histology results visit: margins, risk group, MDT and the surveillance plan' },
    ],
    follow_up: [
      { when: 'BCC', purpose: 'Low risk: discharge after one review with self-examination; high risk / recurrent: every 6–12 months for 5 years (BAD 2021; NCCN)' },
      { when: 'cSCC', purpose: 'Every 3–12 months for 2 years by risk, every 6–12 months to year 5, then annually (NCCN; BAD 2020)' },
      { when: 'Albinism or transplant recipients', purpose: 'Lifelong skin checks every 3–6 months (local-programme interval)' },
    ],
  },
  handoffs: [
    { label: 'Melanoma WLE / SLNB review', moduleId: 'melanoma_wle', targetPhase: 'pre_op', when: 'Possible or confirmed melanoma: wide local excision ± sentinel node biopsy' },
    { label: 'Scalp tumour review', moduleId: 'scalp_tumour_excision', targetPhase: 'pre_op', phases: ['pre_op'], when: 'Scalp tumours: scalp-specific planning' },
    { label: 'Tumour Board (MDT, AJCC staging, management plan)', route: '/tumour-board', when: 'High / very-high-risk tumour, involved margins, nodes, Merkel or Marjolin' },
    { label: 'Investigations (histology, imaging requests)', route: '/investigations', phases: ['pre_op', 'post_op'], when: 'Biopsy, imaging or histology tracking' },
    { label: 'Scar Monitor', route: '/scar-monitor', phases: ['follow_up'], when: 'Hypertrophic or keloid scar after excision' },
    { label: 'Patient education library', route: '/patient-education', phases: ['pre_op', 'follow_up'], when: 'Sun protection and self-examination leaflets' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate including histology' },
  ],
};

/** Exposed for tests. */
export const SKIN_TUMOUR_FIELDS = { SITE, DIAGNOSIS, SIZE, HISTOLOGY, MARGINS };
