/**
 * Excision of benign soft-tissue lumps — lipoma, epidermoid / pilar /
 * dermoid cyst, nerve-sheath tumour, other benign masses — with the sarcoma
 * safety net.
 *
 * The danger in "just a lipoma" is the sarcoma shelled out as one: the
 * unplanned ("whoops") excision that contaminates the field and turns a
 * limb-sparing operation into a much bigger one. So the review records the
 * published sarcoma red flags — larger than 5 cm, deep to the fascia,
 * increasing in size, painful, recurrent after excision (NICE NG12; British
 * Sarcoma Group; ESMO-EURACAN-GENTURIS 2021) — counts them, and when any is
 * present puts imaging (and core biopsy at a sarcoma centre where indicated)
 * before the knife. Cyst-specific details (punctum, infection, midline
 * dermoid with possible intracranial extension) and nerve-sheath tumours
 * (enucleation; NF1 and malignant change) follow.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'soft_tissue_lesion_excision';
const f = (id: string) => `${ID}.${id}`;

// ── The lump (carried forward) ──────────────────────────────────────────────

const TYPE: EncounterField = {
  id: f('type'), label: 'Clinical diagnosis', kind: 'select', important: true,
  options: [
    { value: 'lipoma', label: 'Lipoma' },
    { value: 'epidermoid', label: 'Epidermoid ("sebaceous") cyst' },
    { value: 'pilar', label: 'Pilar (trichilemmal) cyst' },
    { value: 'dermoid', label: 'Dermoid cyst' },
    { value: 'nerve_sheath', label: 'Neurofibroma / schwannoma' },
    { value: 'other_benign', label: 'Other benign lesion (fibroma, pilomatrixoma…)' },
    { value: 'uncertain', label: 'Uncertain soft-tissue mass', flag: 'amber', flagReason: 'Uncertain mass: image before excision (NICE NG12; British Sarcoma Group).' },
  ],
};
const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'scalp', label: 'Scalp' },
    { value: 'face_midline', label: 'Face — midline (nose, glabella) or periorbital' },
    { value: 'face_other', label: 'Face — other' },
    { value: 'neck', label: 'Neck' },
    { value: 'trunk', label: 'Trunk / back' },
    { value: 'upper_limb', label: 'Upper limb' },
    { value: 'thigh', label: 'Thigh / buttock' },
    { value: 'lower_limb', label: 'Leg / foot' },
    { value: 'groin', label: 'Groin / perineum' },
  ],
};
const SIZE: EncounterField = {
  id: f('size_cm'), label: 'Greatest dimension', kind: 'number', unit: 'cm', min: 0, max: 60, important: true,
  numericFlags: [{ op: '>', value: 5, level: 'amber', reason: 'Larger than 5 cm: sarcoma red flag — image (and core biopsy at a sarcoma centre if not clearly benign) before excision (British Sarcoma Group; ESMO-EURACAN-GENTURIS 2021).' }],
};
const DEPTH: EncounterField = {
  id: f('depth'), label: 'Depth', kind: 'select', important: true,
  options: [
    { value: 'dermal', label: 'In the skin (moves with the skin)' },
    { value: 'subcut', label: 'Subcutaneous, superficial to fascia' },
    { value: 'deep', label: 'Deep to the fascia / in or under muscle', flag: 'amber', flagReason: 'Deep to the fascia: sarcoma red flag — MRI and core biopsy before excision whatever the size (ESMO-EURACAN-GENTURIS 2021).' },
    { value: 'unsure', label: 'Unsure', flag: 'amber', flagReason: 'Depth uncertain on examination: ultrasound first.' },
  ],
};
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The lump',
  intent: 'Recorded once and carried forward.',
  fields: [TYPE, SITE, { id: f('site_detail'), label: 'Exact site and side', kind: 'text' }, SIZE, DEPTH],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const RED_FLAGS: EncounterSection = {
  id: f('red_flags'),
  title: 'Sarcoma red flags and features',
  intent: 'Any red flag → imaging before excision; never shell out a mass you have not diagnosed.',
  fields: [
    {
      id: f('growth'), label: 'Growth', kind: 'select', important: true,
      options: [
        { value: 'static', label: 'Unchanged for a long time' },
        { value: 'slow', label: 'Slowly enlarging over years' },
        { value: 'increasing', label: 'Increasing in size (months)', flag: 'amber', flagReason: 'An unexplained lump increasing in size: ultrasound within 2 weeks for adults, within 48 hours for children and young people (NICE NG12).' },
      ],
    },
    { id: f('painful'), label: 'Painful (not just tender when knocked)', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Painful soft-tissue lump: sarcoma red flag (British Sarcoma Group) — or nerve-sheath tumour / angiolipoma; image first.' } },
    { id: f('recurrent'), label: 'Recurrence after previous excision', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Recurrent lump after excision: sarcoma red flag — obtain the previous histology, MRI, and biopsy before re-excision.' } },
    { id: f('duration'), label: 'Duration', kind: 'select', options: [{ value: 'under_6m', label: 'Under 6 months' }, { value: '6m_2y', label: '6 months to 2 years' }, { value: 'over_2y', label: 'Over 2 years' }] },
    {
      id: f('consistency'), label: 'Consistency and mobility', kind: 'select',
      options: [
        { value: 'soft_mobile', label: 'Soft, mobile, lobulated' },
        { value: 'cystic', label: 'Smooth, tense, attached to skin (cyst)' },
        { value: 'firm', label: 'Firm / rubbery' },
        { value: 'hard_fixed', label: 'Hard or fixed', flag: 'amber', flagReason: 'Hard or fixed lump: image before excision.' },
      ],
    },
    { id: f('punctum'), label: 'Punctum', kind: 'boolean', showWhen: { field: f('type'), equals: ['epidermoid', 'pilar'] } },
    {
      id: f('cyst_state'), label: 'Cyst now', kind: 'select', showWhen: { field: f('type'), equals: ['epidermoid', 'pilar', 'dermoid'] },
      options: [
        { value: 'quiet', label: 'Quiet' },
        { value: 'inflamed', label: 'Inflamed / infected / abscess', flag: 'amber', flagReason: 'Inflamed cyst: drain if fluctuant; excise once settled — excision through inflamed tissue risks incomplete removal and recurrence.' },
        { value: 'previous_infection', label: 'Recurrent infections, now quiet' },
      ],
    },
    {
      id: f('dermoid_features'), label: 'Dermoid — features of deep extension', kind: 'multiselect', showWhen: { field: f('type'), equals: ['dermoid'] },
      options: [
        { value: 'none', label: 'None' },
        { value: 'sinus', label: 'Midline nasal pit / sinus with hair', flag: 'red', flagReason: 'Nasal dermoid sinus: CT and MRI for intracranial extension before excision (paediatric plastic / craniofacial practice).' },
        { value: 'fixed_bone', label: 'Fixed to bone / bony defect', flag: 'amber', flagReason: 'Dermoid fixed to bone: imaging for intraosseous or intracranial extension.' },
      ],
    },
    {
      id: f('nerve_features'), label: 'Nerve-sheath features', kind: 'multiselect', showWhen: { field: f('type'), equals: ['nerve_sheath'] },
      options: [
        { value: 'none', label: 'None' },
        { value: 'tinel', label: 'Tinel sign / paraesthesia on pressure' },
        { value: 'deficit', label: 'Motor or sensory deficit', flag: 'amber', flagReason: 'Nerve deficit from a nerve-sheath tumour: MRI and nerve-conduction studies; surgery by a surgeon experienced in nerve tumours.' },
        { value: 'nf1', label: 'Neurofibromatosis type 1' },
        { value: 'rapid_pain', label: 'Rapid growth or new pain in a neurofibroma (NF1)', flag: 'red', flagReason: 'Possible malignant peripheral nerve-sheath tumour: urgent MRI (± PET-CT) and sarcoma centre referral (NICE NG12; NF1 guidance).' },
      ],
    },
    { id: f('multiple'), label: 'Multiple similar lumps (lipomatosis, NF1, Gardner, steatocystoma)', kind: 'boolean' },
  ],
};

const WORKUP: EncounterSection = {
  id: f('workup'),
  title: 'Imaging, biopsy and plan',
  fields: [
    {
      id: f('ultrasound'), label: 'Ultrasound', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'benign', label: 'Typical of a benign lesion (lipoma / cyst)' },
        { value: 'indeterminate', label: 'Indeterminate', flag: 'amber', flagReason: 'Indeterminate ultrasound: MRI and core biopsy, or refer to the sarcoma service if clinical concern persists (NICE NG12).' },
        { value: 'suspicious', label: 'Suggests sarcoma', flag: 'red', flagReason: 'Ultrasound suggests sarcoma: refer on the suspected-cancer pathway (NICE NG12) — MRI and core biopsy at the sarcoma centre.' },
      ],
    },
    {
      id: f('mri'), label: 'MRI', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'simple_lipoma', label: 'Simple lipoma' },
        { value: 'atypical', label: 'Atypical fatty tumour (septa, nodules, enhancement)', flag: 'amber', flagReason: 'Atypical features on MRI: core biopsy with MDM2 testing — atypical lipomatous tumour / liposarcoma (WHO 2020).' },
        { value: 'sarcoma', label: 'Suspicious for sarcoma', flag: 'red', flagReason: 'MRI suspicious for sarcoma: sarcoma MDT before any excision.' },
      ],
    },
    {
      id: f('biopsy'), label: 'Core biopsy', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed' },
        { value: 'needed', label: 'Needed — not done', flag: 'amber', flagReason: 'Core biopsy before excision, along the line of the definitive incision, ideally at the sarcoma centre (ESMO-EURACAN-GENTURIS 2021).' },
        { value: 'benign', label: 'Benign' },
        { value: 'alt', label: 'Atypical lipomatous tumour (MDM2 amplified)', flag: 'amber', flagReason: 'Atypical lipomatous tumour: marginal excision for limb lesions after MDT; it recurs locally but rarely metastasises (WHO 2020; ESMO).' },
        { value: 'sarcoma', label: 'Sarcoma', flag: 'red', flagReason: 'Sarcoma: definitive surgery at the sarcoma centre after MDT staging (ESMO-EURACAN-GENTURIS 2021).' },
      ],
    },
    {
      id: f('technique'), label: 'Planned technique', kind: 'select',
      options: [
        { value: 'excision', label: 'Excision with capsule / intact sac (ellipse including the punctum for a cyst)' },
        { value: 'minimal', label: 'Minimal-incision / punch / squeeze technique' },
        { value: 'lipo_assisted', label: 'Liposuction-assisted (benign lipoma only)' },
        { value: 'enucleation', label: 'Enucleation preserving the nerve (schwannoma)' },
        { value: 'drain_first', label: 'Incision and drainage now; excision later' },
      ],
    },
    { id: f('histology_planned'), label: 'Specimen will go for histology', kind: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No', flag: 'amber', flagReason: 'Not sending for histology: an atypical lipomatous tumour or a low-grade sarcoma can look like a lipoma — send it unless unequivocally a simple cyst.' },
      ] },
  ],
};

// ── Post-operative and follow-up ────────────────────────────────────────────

const HISTOLOGY: EncounterField = {
  id: f('histology'), label: 'Histology', kind: 'select', important: true,
  options: [
    { value: 'pending', label: 'Pending' },
    { value: 'as_expected', label: 'Benign — as expected' },
    { value: 'other_benign', label: 'Benign — a different diagnosis' },
    { value: 'alt', label: 'Atypical lipomatous tumour / well-differentiated liposarcoma', flag: 'amber', flagReason: 'Unexpected atypical lipomatous tumour: sarcoma MDT; MRI of the bed; re-excision only if margins and site warrant it.' },
    { value: 'malignant', label: 'Sarcoma or other malignancy', flag: 'red', flagReason: 'Unplanned excision of a malignancy: MRI of the operative bed and urgent sarcoma MDT — re-excision of the whole field at the sarcoma centre is usually needed (ESMO-EURACAN-GENTURIS 2021).' },
    { value: 'not_sent', label: 'Not sent' },
  ],
};
const HISTO_SECTION: EncounterSection = {
  id: f('histology_section'),
  title: 'Histology and operative findings',
  fields: [
    HISTOLOGY,
    { id: f('complete'), label: 'Removed intact / completely (capsule or sac)', kind: 'select',
      options: [
        { value: 'complete', label: 'Complete, intact' },
        { value: 'piecemeal', label: 'Piecemeal / sac ruptured', flag: 'amber', flagReason: 'Piecemeal removal or ruptured cyst: higher recurrence — warn the patient and review at 3–6 months.' },
      ] },
    { id: f('finding'), label: 'Operative finding', kind: 'select',
      options: [
        { value: 'as_expected', label: 'As expected' },
        { value: 'deeper', label: 'Deeper or more extensive than expected', flag: 'amber', flagReason: 'Unexpectedly deep or infiltrating lesion: image the bed and review histology at MDT.' },
      ] },
    { id: f('nerve_status'), label: 'Nerve function after surgery', kind: 'select', showWhen: { field: f('type'), equals: ['nerve_sheath'] },
      options: [
        { value: 'intact', label: 'Intact' },
        { value: 'deficit', label: 'New deficit', flag: 'amber', flagReason: 'New nerve deficit after nerve-sheath tumour excision: document, therapy referral and review; most transient deficits after enucleation improve.' },
      ] },
  ],
};

const FOLLOW: EncounterSection = {
  id: f('follow'),
  title: 'Outcome',
  fields: [
    { id: f('fu_recurrence'), label: 'Lump at the site', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'No recurrence' },
        { value: 'recurrent', label: 'Recurrent lump', flag: 'amber', flagReason: 'Recurrence after excision: sarcoma red flag — review histology, MRI, biopsy before re-excision.' },
      ] },
    { id: f('contour'), label: 'Contour / scar acceptable to the patient', kind: 'select',
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No — dent, scar or keloid' }] },
  ],
};

// ── Score: sarcoma red flags ────────────────────────────────────────────────

export function sarcomaRedFlags(a: EncounterAnswers): string[] {
  const out: string[] = [];
  const size = numOf(a, f('size_cm'));
  if (size != null && size > 5) out.push(`larger than 5 cm (${size} cm)`);
  if (isOneOf(a, f('depth'), 'deep')) out.push('deep to the fascia');
  if (isOneOf(a, f('growth'), 'increasing')) out.push('increasing in size');
  if (isYes(a, f('painful'))) out.push('painful');
  if (isYes(a, f('recurrent')) || isOneOf(a, f('fu_recurrence'), 'recurrent')) out.push('recurrent after excision');
  return out;
}

export const sarcomaFlagScore: ScoreRule = ({ phase, answers }) => {
  if (phase !== 'pre_op') return null;
  const flags = sarcomaRedFlags(answers);
  const known = [f('size_cm'), f('depth'), f('growth')].filter(id => answers[id] == null || answers[id] === '');
  return {
    id: `${ID}.sarcoma_flags`, name: 'Sarcoma red flags', abbreviation: 'Sarcoma flags', total: flags.length, max: 5,
    band: flags.length
      ? { label: `${flags.length} red flag${flags.length > 1 ? 's' : ''}`, level: flags.length >= 2 ? 'high' : 'moderate', interpretation: `${flags.join('; ')}: image before excision; core biopsy / sarcoma referral if imaging is not clearly benign.` }
      : { label: 'No red flag', level: 'none', interpretation: 'No published sarcoma red flag recorded. Excision with histology is reasonable.' },
    incomplete: known.map(id => id === f('size_cm') ? 'Size' : id === f('depth') ? 'Depth' : 'Growth'),
    source: 'Red flags: size over 5 cm, deep to fascia, increasing size, pain, recurrence (British Sarcoma Group 2016; NICE NG12; ESMO-EURACAN-GENTURIS 2021). A count, not a validated score.',
    flag: flags.length ? { level: flags.length >= 2 ? 'red' : 'amber', reason: `Sarcoma red flags: ${flags.join('; ')}.` } : undefined,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('A correct diagnosis before excision — no unplanned excision of a sarcoma', 'Unplanned excisions of sarcoma worsen local control and enlarge the definitive surgery (ESMO-EURACAN-GENTURIS 2021)'),
      L('Complete removal (intact capsule or sac) through the smallest well-placed incision', 'Incomplete removal is the main cause of recurrence'),
      L('Histological confirmation; a good contour and scar', 'Benign-looking fatty lumps can be atypical lipomatous tumours'),
    ],
  },
});

const sarcomaPathway: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const flags = sarcomaRedFlags(a);
  const child = (ctx.patient.ageYears ?? 99) < 25;
  const usDone = !isOneOf(a, f('ultrasound'), 'not_done') && a[f('ultrasound')] != null;
  const deepOrLarge = isOneOf(a, f('depth'), 'deep') || (numOf(a, f('size_cm')) ?? 0) > 5;
  return merge(
    flags.length > 0 && !usDone && !deepOrLarge && { problem: { investigations: [L(
      child ? 'Very urgent ultrasound (within 48 hours) of the lump' : 'Urgent ultrasound (within 2 weeks) of the lump',
      `Sarcoma red flag: ${flags.join('; ')} (NICE NG12 — ${child ? 'children and young people' : 'adults'})`, 'urgent')] } },
    deepOrLarge && !isOneOf(a, f('mri'), 'simple_lipoma') && { problem: {
      investigations: [L('MRI with contrast, then image-guided core biopsy (several cores, along the line of the future incision) — at or with the sarcoma centre', `${isOneOf(a, f('depth'), 'deep') ? 'Deep to the fascia' : 'Larger than 5 cm'} (ESMO-EURACAN-GENTURIS 2021; British Sarcoma Group)`, 'urgent')],
    } },
    (isOneOf(a, f('ultrasound'), 'suspicious') || isOneOf(a, f('mri'), 'sarcoma') || isOneOf(a, f('biopsy'), 'sarcoma') || hasAny(a, f('nerve_features'), 'rapid_pain')) && { problem: {
      referrals: [L('Refer to the sarcoma MDT on the suspected-cancer pathway; do not excise here', 'Imaging, biopsy or clinical features suggest sarcoma / MPNST (NICE NG12)', 'urgent')],
      investigations: [L('CT chest for staging once sarcoma is confirmed', 'Sarcoma metastasises to the lung first (ESMO-EURACAN-GENTURIS 2021)')],
    } },
    (isOneOf(a, f('ultrasound'), 'indeterminate') || isOneOf(a, f('mri'), 'atypical')) && { problem: { investigations: [L('Core biopsy with MDM2 amplification testing (FISH) where available', 'Indeterminate / atypical fatty tumour (WHO 2020)')] } },
    isOneOf(a, f('biopsy'), 'alt') && { problem: { treatment: [L('Atypical lipomatous tumour of the limb or trunk: marginal excision after MDT agreement; MRI surveillance for recurrence', 'ALT / well-differentiated liposarcoma (ESMO-EURACAN-GENTURIS 2021)')] } },
    isOneOf(a, f('biopsy'), 'needed') && { problem: { investigations: [L('Core needle biopsy before excision; open biopsy only by the team who will do the definitive surgery', 'Biopsy tract must be excised with the tumour')] } },
    flags.length > 0 && isOneOf(a, f('technique'), 'lipo_assisted', 'minimal') && { cautions: ['Liposuction-assisted or minimal-incision removal is only for a lesion confirmed benign — not with sarcoma red flags.'] },
  );
};

const lesionSpecific: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const type = a[f('type')];
  return merge(
    isOneOf(a, f('cyst_state'), 'inflamed') && { problem: { treatment: [L('Incision and drainage if fluctuant; antibiotics only for surrounding cellulitis; excise the cyst once inflammation has settled (commonly 4–6 weeks)', 'Inflamed / infected cyst (interval is a local-practice choice)')] } },
    (type === 'epidermoid' || type === 'pilar') && !isOneOf(a, f('cyst_state'), 'inflamed') && { problem: { treatment: [L('Elliptical excision including the punctum, removing the sac intact', 'Retained sac or punctum causes recurrence')] } },
    type === 'dermoid' && (hasAny(a, f('dermoid_features'), 'sinus', 'fixed_bone') || isOneOf(a, f('site'), 'face_midline', 'scalp')) && { problem: { investigations: [L('CT and MRI before excision to exclude intracranial / intraosseous extension; neurosurgical planning if present', 'Midline / scalp dermoid or sinus')] } },
    type === 'nerve_sheath' && { problem: { treatment: [L('Schwannoma: enucleation under magnification preserving the fascicles; neurofibroma: excision may sacrifice the fascicle of origin — map with a nerve stimulator', 'Nerve-sheath tumour')] } },
    hasAny(a, f('nerve_features'), 'nf1') && { problem: { referrals: [L('NF1 service / genetics: lifelong review for malignant change (rapid growth, new pain, hardening, deficit)', 'Neurofibromatosis type 1 — lifetime MPNST risk')] } },
    isOneOf(a, f('site'), 'face_midline', 'face_other', 'neck') && { problem: { treatment: [L('Place the incision in a relaxed skin tension line; protect the facial-nerve branches (temporal, marginal mandibular) and the spinal accessory nerve in the posterior triangle', 'Face / neck lump')] } },
    (numOf(a, f('size_cm')) ?? 0) > 5 && !isOneOf(a, f('depth'), 'deep') && isOneOf(a, f('mri'), 'simple_lipoma') && { problem: { treatment: [L('Large simple lipoma: drain or quilting sutures and compression to reduce seroma', 'Large dead space after excision')] } },
    isOneOf(a, f('histology_planned'), 'no') && { cautions: ['Specimen not planned for histology — record why; send any fatty tumour that is large, deep, firm or atypical at operation.'] },
    { general: [G('Anaesthesia and theatre', L('Mark the lump and its edges with the patient sitting / standing (lipomas flatten when lying); send the specimen for histology', 'Lumps are easier to localise before positioning and infiltration'))] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op' && ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const h = a[f('histology')];
  return merge(
    h === 'pending' && { problem: { monitoring: [L('Chase the histology and give the result to the patient', 'Histology pending')] } },
    h === 'malignant' && { problem: {
      investigations: [L('MRI of the operative bed and CT chest', 'Unplanned excision of a malignancy (ESMO-EURACAN-GENTURIS 2021)', 'urgent')],
      referrals: [L('Urgent sarcoma MDT: re-excision of the whole operative field at the sarcoma centre is usually needed', 'Unexpected sarcoma on histology', 'urgent')],
    } },
    h === 'alt' && { problem: { referrals: [L('Sarcoma MDT review of the histology and margins; MRI surveillance of the bed', 'Atypical lipomatous tumour on histology')] } },
    h === 'other_benign' && { problem: { monitoring: [L('Explain the final diagnosis and whether it changes follow-up', 'Histology differs from the clinical diagnosis')] } },
    isOneOf(a, f('complete'), 'piecemeal') && { problem: { monitoring: [L('Review at 3–6 months for recurrence', 'Piecemeal removal / ruptured sac')] } },
    isOneOf(a, f('finding'), 'deeper') && h !== 'malignant' && { problem: { investigations: [L('MRI of the bed if the histology is not clearly benign; MDT review', 'Lesion deeper / more extensive than expected')] } },
    isOneOf(a, f('nerve_status'), 'deficit') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Hand / physiotherapy for the nerve deficit; review at 6 weeks and 3 months; nerve studies if no recovery', 'New nerve deficit after excision'))] },
    isOneOf(a, f('fu_recurrence'), 'recurrent') && { problem: { investigations: [L('MRI, and core biopsy before any re-excision', 'Recurrent lump — sarcoma red flag (British Sarcoma Group)', 'urgent')] } },
    isOneOf(a, f('contour'), 'no') && { problem: { treatment: [L('Discuss scar or contour treatment (scar care, steroid for a keloid, fat grafting for a dent) once mature at 6–12 months', 'Patient unhappy with contour / scar')] } },
    ctx.phase === 'post_op' && { dischargeCriteria: ['Wound dry; drain (if any) removed', 'Histology result arrangement agreed'] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const softTissueLesionExcision: ProcedureModule = {
  id: ID,
  name: 'Soft-tissue lump excision (lipoma, cyst, benign mass)',
  summary: 'Lipomas, epidermoid and dermoid cysts, nerve-sheath tumours and other benign lumps, with the published sarcoma red flags and imaging / biopsy before excision when any is present.',
  group: 'oncology',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Soft-tissue lump',
  basis: [
    'NICE NG12 Suspected cancer: recognition and referral — sarcoma (urgent direct-access ultrasound for an unexplained lump increasing in size)',
    'Dangoor A et al. UK guidelines for the management of soft tissue sarcomas (British Sarcoma Group). Clin Sarcoma Res 2016;6:20',
    'Gronchi A et al. Soft tissue and visceral sarcomas: ESMO-EURACAN-GENTURIS Clinical Practice Guidelines. Ann Oncol 2021;32:1348-65',
    'WHO Classification of Soft Tissue and Bone Tumours, 5th edition (2020) — atypical lipomatous tumour, MDM2',
    'Ferner RE et al. Guidelines for the diagnosis and management of individuals with neurofibromatosis 1. J Med Genet 2007;44:81-8',
  ],
  catalog: {
    feeIds: ['minor-003', 'minor-004', 'soft-004', 'soft-006'],
    educationId: 'TUMOR-001',
    patientEducationIds: ['minor-lipoma-removal'],
  },
  sections: {
    pre_op: [DETAILS, RED_FLAGS, WORKUP],
    post_op: [DETAILS, HISTO_SECTION],
    follow_up: [DETAILS, HISTO_SECTION, FOLLOW],
  },
  carryForward: [f('type'), f('site'), f('site_detail'), f('size_cm'), f('depth'), f('histology'), f('complete'), f('finding')],
  scores: [sarcomaFlagScore],
  planRules: [goals, sarcomaPathway, lesionSpecific, postOp],
  consent: {
    procedureName: 'Excision of soft-tissue lump',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove the lump and relieve the symptoms or worry it causes',
      'Confirm under the microscope what it is',
      'For a cyst, stop repeated infections',
    ],
    risks: [
      { name: 'Haematoma', description: 'Bleeding into the space left by the lump, sometimes needing drainage' },
      { name: 'Cyst recurrence', description: 'A cyst can come back if any of its lining is left, more so after infection' },
      { name: 'Unexpected diagnosis', description: 'Rarely, the laboratory finds an atypical or cancerous tumour, needing scans and further surgery' },
      { name: 'Scar', description: 'A scar the length of the lump or longer; in darker skin it may thicken or become keloid' },
      { name: 'Wound infection', description: 'Infection of the wound, more likely after an infected cyst' },
    ],
    alternatives: [
      'Leave it alone and watch it (most lipomas and cysts are harmless) — return if it grows, hurts or changes',
      'Liposuction for a confirmed benign lipoma (smaller scar, more chance of recurrence)',
      'Drainage of an infected cyst now, with removal later',
    ],
    riskOfNotTreating: 'A benign lump left alone usually stays harmless but may grow slowly; a cyst may keep getting infected. If the lump has warning features, not investigating it could delay the diagnosis of a cancer.',
    anaesthesiaOptions: ['local', 'sedation', 'general'],
    additionalProcedures: ['A drain for a large lump', 'Ultrasound, MRI or needle biopsy before surgery if the lump has warning features'],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: true,
    counsellingTopics: [
      'What the lump most likely is and the warning features that change the plan',
      'Why the specimen goes to the laboratory',
      'Cyst recurrence, and why an infected cyst is removed later',
    ],
    modifiers: [
      { id: 'stl_red_flags', when: c => sarcomaRedFlags(c.answers).length > 0,
        text: 'Because this lump has features that need checking (size, depth, growth or pain), scans and a needle biopsy come first, and the operation may be different and larger.',
        why: 'Sarcoma red flags (NICE NG12; British Sarcoma Group)' },
      { id: 'stl_deep', when: c => isOneOf(c.answers, f('depth'), 'deep') || (numOf(c.answers, f('size_cm')) ?? 0) > 5,
        text: 'A large or deep lump needs a longer incision; fluid collection (seroma) and a dent are more likely, and a drain may be used.',
        why: 'Deep or larger than 5 cm' },
      { id: 'stl_nerve', when: c => isOneOf(c.answers, f('type'), 'nerve_sheath'),
        text: 'Because the lump grows from a nerve, there is a risk of numbness or weakness in the area that nerve supplies; it usually recovers but can be permanent.',
        why: 'Nerve-sheath tumour' },
      { id: 'stl_infected', when: c => isOneOf(c.answers, f('cyst_state'), 'inflamed', 'previous_infection'),
        text: 'Because the cyst has been infected, it is more likely to come back and the wound is more likely to become infected.',
        why: 'Inflamed / previously infected cyst' },
      { id: 'stl_face', when: c => isOneOf(c.answers, f('site'), 'face_midline', 'face_other', 'neck'),
        text: 'On the face and neck, the scar is visible and small nerve branches that move the face or shoulder lie nearby.',
        why: 'Face / neck site' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before listing', purpose: 'Imaging / biopsy results reviewed when any red flag is present' }],
    post_op: [
      { when: 'Day 7–14', purpose: 'Wound check, suture removal, histology result' },
    ],
    follow_up: [
      { when: 'Benign, complete', purpose: 'Discharge with advice to return if it recurs' },
      { when: 'Piecemeal removal, ALT or recurrence', purpose: '3–6 months, then as the MDT advises (MRI surveillance for ALT)' },
    ],
  },
  handoffs: [
    { label: 'Investigations (ultrasound, MRI, core biopsy)', route: '/investigations', phases: ['pre_op', 'follow_up'] },
    { label: 'Tumour Board / sarcoma MDT', route: '/tumour-board', when: 'Red flags with abnormal imaging, ALT or sarcoma' },
    { label: 'Referrals (sarcoma centre)', route: '/referrals', when: 'Suspected sarcoma — refer before any excision' },
    { label: 'Patient education — lipoma removal', route: '/patient-education', phases: ['pre_op'] },
  ],
};

/** Exposed for tests. */
export const SOFT_TISSUE_FIELDS = { TYPE, SIZE, DEPTH, HISTOLOGY };
