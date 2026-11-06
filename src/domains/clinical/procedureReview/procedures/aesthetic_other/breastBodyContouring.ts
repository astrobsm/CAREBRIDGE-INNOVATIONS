/**
 * Breast and body contouring: reduction mammaplasty, abdominoplasty (and its
 * variants after massive weight loss) and liposuction.
 *
 * What the core already does, and is only READ here: BMI (scores.bmi), the
 * Caprini VTE assessment, smoking, diabetes, expectations, the appearance
 * (body-dysmorphic) screen, PHQ / GAD, and the obesity / smoking consent
 * modifiers. This module adds what changes these operations' risks: weight
 * stability and bariatric history, abdominal scars and hernia, breast
 * examination and imaging, the planned liposuction volume and the
 * local-anaesthetic dose, nipple–areola and abdominal-flap viability,
 * seroma, and the procedure-specific VTE modifiers that Caprini does not
 * capture (combined procedures, abdominoplasty, large-volume liposuction).
 *
 * One module covers three operations, so each operation's specific consent
 * risks are written as RiskModifiers that fire only when that operation is
 * chosen (with the frequencies of education records BREAST-001 / BODY-001),
 * rather than as static risks that would appear on every consent form.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'breast_and_body_contouring';
const f = (id: string) => `${ID}.${id}`;

const ASPS_RM = 'Kalliainen LK; ASPS Health Policy Committee. ASPS clinical practice guideline summary on reduction mammaplasty. Plast Reconstr Surg 2012;130:785-9';
const ASPS_LIPO = 'Iverson RE, Lynch DJ; ASPS Committee on Patient Safety. Practice advisory on liposuction. Plast Reconstr Surg 2004;113:1478-90';
const HATEF_2008 = 'Hatef DA, Kenkel JM, Nguyen MQ et al. Thromboembolic risk assessment and the efficacy of enoxaparin prophylaxis in excisional body contouring. Plast Reconstr Surg 2008;122:269-79';
const MANASSA_2003 = 'Manassa EH, Hertl CH, Olbrisch RR. Wound healing problems in smokers and nonsmokers after 132 abdominoplasties. Plast Reconstr Surg 2003;111:2082-7';
const NEAMAN_2007 = 'Neaman KC, Hansen JE. Analysis of complications from abdominoplasty: a review of 206 cases at a university hospital. Ann Plast Surg 2007;58:292-8';
const LAST = 'AAGBI Safety Guideline: Management of severe local anaesthetic toxicity (2010)';

// ── Fields carried forward ──────────────────────────────────────────────────

const PROCEDURES: EncounterField = {
  id: f('procedures'), label: 'Operation(s)', kind: 'multiselect', important: true,
  options: [
    { value: 'reduction', label: 'Reduction mammaplasty' },
    { value: 'abdominoplasty', label: 'Abdominoplasty (full / mini / extended)' },
    { value: 'fleur_de_lis', label: 'Fleur-de-lis / circumferential abdominoplasty (massive weight loss)' },
    { value: 'liposuction', label: 'Liposuction' },
  ],
};
const INDICATION: EncounterField = {
  id: f('indication'), label: 'Main indication', kind: 'select', important: true,
  options: [
    { value: 'functional', label: 'Functional symptoms (pain, intertrigo, activity limitation)' },
    { value: 'post_weight_loss', label: 'Skin excess after massive weight loss' },
    { value: 'post_pregnancy', label: 'After pregnancy (laxity, diastasis)' },
    { value: 'aesthetic', label: 'Aesthetic' },
  ],
};
const PEDICLE: EncounterField = {
  id: f('pedicle'), label: 'Breast reduction technique', kind: 'select',
  showWhen: { field: f('procedures'), equals: ['reduction'] },
  options: [
    { value: 'inferior', label: 'Inferior pedicle, Wise pattern' },
    { value: 'superomedial', label: 'Superomedial / superior pedicle' },
    { value: 'vertical', label: 'Vertical scar' },
    { value: 'free_nipple', label: 'Amputation with free nipple graft' },
  ],
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The operation',
  intent: 'Recorded once and carried forward. BMI, smoking, Caprini, expectations and the appearance screen are in the core sections.',
  fields: [PROCEDURES, INDICATION, PEDICLE],
};

const has = (a: Record<string, unknown>, ...p: string[]) => {
  const v = a[f('procedures')];
  return Array.isArray(v) && v.some(x => p.includes(String(x)));
};
const breast = (a: Record<string, unknown>) => has(a, 'reduction');
const abdo = (a: Record<string, unknown>) => has(a, 'abdominoplasty', 'fleur_de_lis');
const lipo = (a: Record<string, unknown>) => has(a, 'liposuction');

// ── Pre-operative ───────────────────────────────────────────────────────────

const GENERAL: EncounterSection = {
  id: f('general'),
  title: 'Weight, history and goals',
  fields: [
    {
      id: f('weight_stable'), label: 'Weight over the last 6 months', kind: 'select', important: true,
      options: [
        { value: 'stable', label: 'Stable' },
        { value: 'losing', label: 'Still losing', flag: 'amber', flagReason: 'Weight still falling: contouring is usually deferred until weight has plateaued, or the result will loosen.' },
        { value: 'gaining', label: 'Gaining / fluctuating', flag: 'amber', flagReason: 'Fluctuating weight: discuss stabilising it first.' },
      ],
    },
    {
      id: f('bariatric'), label: 'Bariatric surgery', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'yes', label: 'Yes' },
      ],
    },
    { id: f('months_since_bariatric'), label: 'Months since bariatric surgery', kind: 'number', unit: 'months', min: 0, max: 400, showWhen: { field: f('bariatric'), equals: ['yes'] } },
    {
      id: f('future_pregnancy'), label: 'Plans further pregnancy', kind: 'select',
      options: [{ value: 'no', label: 'No / family complete' }, { value: 'yes', label: 'Yes' }, { value: 'unsure', label: 'Unsure' }, { value: 'not_applicable', label: 'Not applicable' }],
    },
    {
      id: f('combined'), label: 'Other procedures at the same operation', kind: 'boolean',
      help: 'Combining procedures lengthens surgery and raises VTE and complication risk.',
    },
    { id: f('goals_text'), label: 'What the patient wants to change, in their words', kind: 'text' },
  ],
};

const BREAST: EncounterSection = {
  id: f('breast'),
  title: 'Breasts',
  intent: 'Symptoms, examination, imaging and measurements before reduction.',
  fields: [
    {
      id: f('breast_symptoms'), label: 'Symptoms from breast size', kind: 'multiselect', visibleWhen: breast,
      options: [
        { value: 'none', label: 'None' },
        { value: 'neck_back', label: 'Neck / back / shoulder pain' },
        { value: 'grooving', label: 'Bra-strap grooving' },
        { value: 'intertrigo', label: 'Recurrent submammary intertrigo' },
        { value: 'activity', label: 'Limits exercise / work' },
      ],
    },
    {
      id: f('breast_exam'), label: 'Breast examination', kind: 'select', important: true, visibleWhen: breast,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'abnormal', label: 'Lump, nipple discharge, skin or nipple change, axillary node', flag: 'red', flagReason: 'Abnormal breast finding: triple assessment before any reduction.' },
      ],
    },
    {
      id: f('breast_imaging'), label: 'Breast imaging', kind: 'select', visibleWhen: breast,
      help: 'Imaging as for screening at the patient\'s age and risk (ASPS 2012).',
      options: [
        { value: 'not_required', label: 'Not required for age / risk' },
        { value: 'normal', label: 'Done — normal' },
        { value: 'due', label: 'Due by age / risk, not done', flag: 'amber', flagReason: 'Imaging is due for age / risk: mammography (± ultrasound) before reduction (ASPS 2012).' },
        { value: 'abnormal', label: 'Abnormal', flag: 'red', flagReason: 'Abnormal breast imaging: complete the assessment before surgery.' },
      ],
    },
    { id: f('sn_n_right'), label: 'Sternal notch to nipple — right', kind: 'number', unit: 'cm', min: 10, max: 60, visibleWhen: breast },
    { id: f('sn_n_left'), label: 'Sternal notch to nipple — left', kind: 'number', unit: 'cm', min: 10, max: 60, visibleWhen: breast },
    { id: f('resection_estimate'), label: 'Estimated resection per breast', kind: 'number', unit: 'g', min: 0, max: 5000, visibleWhen: breast },
    {
      id: f('breastfeeding_wish'), label: 'Wishes to breastfeed in future', kind: 'select', visibleWhen: breast,
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unsure', label: 'Unsure' }],
    },
  ],
};

const ABDOMEN: EncounterSection = {
  id: f('abdomen'),
  title: 'Abdomen',
  fields: [
    {
      id: f('abdominal_scars'), label: 'Abdominal scars', kind: 'multiselect', visibleWhen: abdo,
      options: [
        { value: 'none', label: 'None' },
        { value: 'pfannenstiel', label: 'Pfannenstiel / caesarean' },
        { value: 'midline', label: 'Midline laparotomy' },
        { value: 'subcostal', label: 'Subcostal (Kocher) / flank', flag: 'amber', flagReason: 'A subcostal scar divides the abdominal flap\'s supply from the intercostal vessels: modify the design or avoid wide undermining.' },
        { value: 'ports', label: 'Laparoscopic ports' },
        { value: 'stoma', label: 'Stoma / previous stoma' },
      ],
    },
    {
      id: f('hernia'), label: 'Hernia / rectus diastasis', kind: 'select', visibleWhen: abdo,
      options: [
        { value: 'none', label: 'None' },
        { value: 'diastasis', label: 'Rectus diastasis' },
        { value: 'hernia', label: 'Umbilical / ventral / incisional hernia', flag: 'amber', flagReason: 'Hernia: examine and image (ultrasound / CT); plan the repair with general surgery — do not undermine over an unrecognised hernia.' },
      ],
    },
    {
      id: f('pannus_skin'), label: 'Skin under the pannus', kind: 'select', visibleWhen: abdo,
      options: [
        { value: 'healthy', label: 'Healthy' },
        { value: 'intertrigo', label: 'Intertrigo / fungal infection / ulceration', flag: 'amber', flagReason: 'Treat intertrigo (keep dry, antifungal) before surgery: active infection increases wound complications.' },
      ],
    },
  ],
};

const LIPO: EncounterSection = {
  id: f('lipo'),
  title: 'Liposuction',
  fields: [
    {
      id: f('lipo_areas'), label: 'Areas', kind: 'multiselect', visibleWhen: lipo,
      options: [
        { value: 'abdomen', label: 'Abdomen' }, { value: 'flanks', label: 'Flanks / back' }, { value: 'thighs', label: 'Thighs' },
        { value: 'arms', label: 'Arms' }, { value: 'neck', label: 'Chin / neck' }, { value: 'other', label: 'Other' },
      ],
    },
    {
      id: f('aspirate_ml'), label: 'Planned total aspirate (fat + fluid)', kind: 'number', unit: 'mL', min: 0, max: 20000, visibleWhen: lipo, important: true,
      numericFlags: [{ op: '>', value: 5000, level: 'amber', reason: 'Over 5,000 mL total aspirate is large-volume liposuction: hospital setting with overnight monitoring of fluids and vital signs (ASPS Practice Advisory 2004).' }],
    },
    {
      id: f('lidocaine_mg_kg'), label: 'Planned lidocaine dose in the infiltrate', kind: 'number', unit: 'mg/kg', min: 0, max: 100, visibleWhen: lipo,
      numericFlags: [{ op: '>', value: 35, level: 'red', reason: 'Lidocaine over 35 mg/kg in tumescent fluid exceeds the dose the ASPS Practice Advisory (2004) recommends: risk of local anaesthetic systemic toxicity — reduce the dose or stage the procedure.' }],
    },
    {
      id: f('wetting'), label: 'Infiltration', kind: 'select', visibleWhen: lipo,
      options: [{ value: 'superwet', label: 'Super-wet' }, { value: 'tumescent', label: 'Tumescent' }, { value: 'other', label: 'Other' }],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const POST: EncounterSection = {
  id: f('post'),
  title: 'After contouring',
  fields: [
    {
      id: f('nac'), label: 'Nipple–areola', kind: 'select', important: true, visibleWhen: breast,
      help: 'Compare with the other side and the immediate post-operative appearance; in darker skin rely on refill and turgor as much as colour.',
      options: [
        { value: 'healthy', label: 'Normal colour, refill and warmth' },
        { value: 'congested', label: 'Dusky / purple, brisk refill, swollen', flag: 'red', flagReason: 'Nipple–areola venous congestion: release sutures / tight dressing, exclude haematoma; return to theatre if it does not settle (free nipple graft if needed).' },
        { value: 'pale', label: 'Pale, slow or absent refill', flag: 'red', flagReason: 'Nipple–areola arterial insufficiency: release tension and examine for pedicle kinking or haematoma now.' },
        { value: 'epidermolysis', label: 'Blistering / partial-thickness loss', flag: 'amber', flagReason: 'Partial-thickness nipple loss: moist dressings; most heal.' },
      ],
    },
    { id: f('resected_right'), label: 'Weight resected — right', kind: 'number', unit: 'g', min: 0, max: 5000, visibleWhen: breast },
    { id: f('resected_left'), label: 'Weight resected — left', kind: 'number', unit: 'g', min: 0, max: 5000, visibleWhen: breast },
    {
      id: f('abdo_flap'), label: 'Abdominal skin flap', kind: 'select', important: true, visibleWhen: abdo,
      options: [
        { value: 'healthy', label: 'Healthy to the incision' },
        { value: 'dusky', label: 'Dusky area above the central incision (Huger zone III)', flag: 'amber', flagReason: 'Threatened lower central abdominal flap: reduce tension (flex hips), loosen binder, stop smoking; watch for demarcation.' },
        { value: 'necrosis', label: 'Demarcated necrosis', flag: 'amber', flagReason: 'Abdominal flap necrosis: debride once demarcated; dressings / NPWT; delayed closure.' },
      ],
    },
    {
      id: f('umbilicus'), label: 'Umbilicus', kind: 'select', visibleWhen: abdo,
      options: [{ value: 'healthy', label: 'Healthy' }, { value: 'threatened', label: 'Dusky / necrotic', flag: 'amber', flagReason: 'Umbilical necrosis: dressings; heals secondarily, revision later.' }],
    },
    {
      id: f('garment'), label: 'Binder / compression garment', kind: 'select',
      options: [
        { value: 'worn', label: 'Worn as instructed' },
        { value: 'too_tight', label: 'Too tight (marks, pain, breathlessness)', flag: 'amber', flagReason: 'Over-tight binder threatens the flap and breathing: loosen.' },
        { value: 'not_worn', label: 'Not worn' },
      ],
    },
    {
      id: f('last_symptoms'), label: 'Perioral numbness, metallic taste, tinnitus, confusion, twitching or arrhythmia', kind: 'boolean',
      visibleWhen: lipo,
      flagWhenTrue: { level: 'red', reason: 'Possible local anaesthetic systemic toxicity (lidocaine levels can peak many hours after tumescent infiltration): stop any local anaesthetic, call for help, airway, treat seizures, lipid emulsion 20% (AAGBI 2010).' },
    },
    {
      id: f('fluid_shift'), label: 'Fluid balance after liposuction', kind: 'select', visibleWhen: lipo,
      options: [
        { value: 'balanced', label: 'Balanced, good urine output' },
        { value: 'dry', label: 'Hypotension / tachycardia / low urine output', flag: 'red', flagReason: 'Hypovolaemia after liposuction (third-space loss or bleeding): fluids, Hb, senior review.' },
        { value: 'overloaded', label: 'Breathless, crackles, oedema', flag: 'red', flagReason: 'Fluid overload / pulmonary oedema after tumescent infiltration: oxygen, diuretic, senior review.' },
      ],
    },
    {
      id: f('fat_embolism'), label: 'Breathlessness, hypoxia, confusion or petechial rash in the first 72 hours', kind: 'boolean',
      visibleWhen: a => lipo(a) || abdo(a),
      flagWhenTrue: { level: 'red', reason: 'Fat embolism or pulmonary embolism: emergency — oxygen, senior review, CTPA.' },
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const FU: EncounterSection = {
  id: f('fu'),
  title: 'Result, scars and late complications',
  fields: [
    {
      id: f('histology'), label: 'Breast tissue histology', kind: 'select', visibleWhen: breast,
      options: [
        { value: 'benign', label: 'Benign' },
        { value: 'pending', label: 'Pending', flag: 'amber', flagReason: 'Chase the breast histology.' },
        { value: 'abnormal', label: 'Atypia or malignancy', flag: 'red', flagReason: 'Unexpected atypia / cancer in reduction tissue: breast MDT — orientation of the specimen matters for further treatment.' },
      ],
    },
    {
      id: f('symptom_relief'), label: 'Symptoms that led to surgery', kind: 'select',
      options: [{ value: 'resolved', label: 'Resolved' }, { value: 'improved', label: 'Improved' }, { value: 'unchanged', label: 'Unchanged' }],
    },
    {
      id: f('late_problems'), label: 'Late problems', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'seroma', label: 'Recurrent seroma', flag: 'amber', flagReason: 'Recurrent seroma: serial aspiration and compression; a persistent cavity may need sclerotherapy or excision of a pseudobursa.' },
        { value: 'asymmetry', label: 'Asymmetry' },
        { value: 'contour', label: 'Contour irregularity / dog-ears' },
        { value: 'scar', label: 'Hypertrophic / keloid scar', flag: 'amber', flagReason: 'Hypertrophic or keloid scar: silicone, pressure, steroid injection (Scar Monitor / Keloid Care).' },
        { value: 'fat_necrosis', label: 'Firm lump (fat necrosis)', flag: 'amber', flagReason: 'A firm breast lump after reduction is usually fat necrosis, but image it to be sure.' },
        { value: 'numbness', label: 'Numbness' },
        { value: 'wound', label: 'Unhealed wound', flag: 'amber', flagReason: 'Unhealed wound: look for infection, suture sinus, fat necrosis.' },
      ],
    },
    {
      id: f('weight_fu'), label: 'Weight since surgery', kind: 'select',
      options: [{ value: 'stable', label: 'Stable' }, { value: 'gained', label: 'Gained' }, { value: 'lost', label: 'Lost' }],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => {
  const a = ctx.answers;
  return { problem: { goals: [
    ...(breast(a) ? [L('Smaller, lifted, symmetrical breasts with a viable nipple–areola and relief of symptoms', 'Purpose of reduction mammaplasty (ASPS 2012)')] : []),
    ...(abdo(a) ? [L('A flatter abdomen with excess skin removed, a healed low scar, and any diastasis / hernia repaired', 'Purpose of abdominoplasty')] : []),
    ...(lipo(a) ? [L('Smoother contour with safe fluid and local-anaesthetic management', `Purpose of liposuction (${ASPS_LIPO.split('.')[0]} 2004)`)] : []),
    L('A safe operation in a well-selected, well-informed patient with realistic expectations', 'Elective contouring — selection is the main safety measure'),
  ] } };
};

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const bmi = ctx.scores.bmi?.total ?? ctx.patient.bmi;
  const smoker = isOneOf(a, 'core.smoking', 'current', 'vaping', 'smokeless', 'ex_under_4w');
  const months = numOf(a, f('months_since_bariatric'));
  const aspirate = numOf(a, f('aspirate_ml'));
  const caprini = ctx.scores.caprini?.total ?? null;
  const highVte = abdo(a) || isYes(a, f('combined')) || (aspirate != null && aspirate > 5000);
  const lido = numOf(a, f('lidocaine_mg_kg'));
  return merge(
    // Elective cosmetic / contouring surgery is not done in pregnancy.
    isOneOf(a, 'core.pregnancy', 'pregnant') && {
      problem: { treatment: [L('Defer elective breast / body-contouring surgery until after the pregnancy (and breastfeeding, for breast surgery)', 'Pregnant — elective aesthetic surgery is deferred', 'urgent')] },
      cautions: ['Pregnant: do not book elective breast or body-contouring surgery.'],
    },
    isOneOf(a, 'core.pregnancy', 'possible') && {
      problem: { investigations: [L('Pregnancy test before booking; defer elective contouring if positive', 'Possibly pregnant', 'urgent')] },
    },
    lipo(a) && lido != null && lido > 35 && { general: [G('Anaesthesia and theatre', L(
      `Planned lidocaine ${lido} mg/kg exceeds 35 mg/kg: reduce the dose (dilution, smaller infiltrated area) or stage the procedure; lipid emulsion and resuscitation equipment available`,
      `Tumescent lidocaine above the recommended maximum (${ASPS_LIPO.split('.')[0]} 2004)`, 'urgent'))] },
    bmi != null && bmi >= 30 && { problem: { treatment: [L(
      `BMI ${Math.round(bmi * 10) / 10}: discuss weight reduction before surgery — wound, seroma and VTE complications rise with BMI; the consultant decides whether to proceed`,
      `BMI 30 or more (${NEAMAN_2007.split('.')[0]} 2007; ${ASPS_RM.split(';')[0]} 2012)`)] } },
    isOneOf(a, f('weight_stable'), 'losing', 'gaining') && { problem: { treatment: [L('Defer until weight has been stable for several months (commonly 3–6 months)', `Weight ${String(a[f('weight_stable')])} (unit protocol)`)] } },
    months != null && months < 18 && { problem: { treatment: [L('After bariatric surgery, contouring is usually deferred until weight has plateaued — commonly 12–18 months after the operation', `${months} months since bariatric surgery (unit protocol)`)] } },
    isOneOf(a, f('bariatric'), 'yes') && { problem: { investigations: [L('FBC, ferritin, B12, folate, vitamin D, calcium, albumin / protein intake: deficiencies are common after bariatric surgery and impair healing', 'Previous bariatric surgery')] } },
    smoker && abdo(a) && { cautions: ['Abdominoplasty in a nicotine user: skin and umbilical necrosis and wound breakdown are several times more common (Manassa 2003) — many units require confirmed abstinence (e.g. urinary cotinine) before booking.'] },
    smoker && breast(a) && { cautions: ['Reduction mammaplasty in a nicotine user: nipple and T-junction wound complications are more common — confirm abstinence before booking.'] },
    highVte && { general: [G('VTE prophylaxis', L(
      `Body contouring adds VTE risk the Caprini factors do not fully capture (${[abdo(a) && 'abdominoplasty', isYes(a, f('combined')) && 'combined procedures', aspirate != null && aspirate > 5000 && 'large-volume liposuction'].filter(Boolean).join(', ')}): ${caprini != null && caprini >= 5 ? 'consider extending pharmacological prophylaxis beyond discharge with the consultant' : 'make sure the Caprini assessment records major surgery and the combined operating time'}`,
      `Excisional body contouring (${HATEF_2008.split('.')[0]} 2008)`))] },
    isOneOf(a, f('future_pregnancy'), 'yes', 'unsure') && abdo(a) && { counselling: [P('Pregnancy after abdominoplasty', 'A later pregnancy can stretch the skin and muscle repair again; most surgeons advise waiting until the family is complete.', 'Future pregnancy wished')] },
    isOneOf(a, f('breast_imaging'), 'due') && { problem: { investigations: [L('Mammography (± ultrasound) before reduction', `Imaging due for age / risk (${ASPS_RM.split(';')[0]} 2012)`)] } },
    (isOneOf(a, f('breast_exam'), 'abnormal') || isOneOf(a, f('breast_imaging'), 'abnormal')) && { problem: { referrals: [L('Breast clinic triple assessment (examination, imaging, core biopsy) before any reduction', 'Abnormal breast examination / imaging', 'urgent')] } },
    breast(a) && { problem: { treatment: [L(
      'Mark in the standing position; choose the pedicle for the nipple-to-notch distance and resection; consider a free nipple graft when the pedicle would be very long or the nipple viability is doubtful (surgeon\'s judgement)',
      'Reduction mammaplasty planning')] } },
    breast(a) && { counselling: [P('Breastfeeding and sensation', 'Breastfeeding may not be possible after reduction and nipple sensation may change.', isOneOf(a, f('breastfeeding_wish'), 'yes') ? 'Wishes to breastfeed (education record BREAST-001)' : 'Education record BREAST-001')] },
    hasAny(a, f('abdominal_scars'), 'subcostal') && { problem: { treatment: [L('Subcostal scar: limit lateral undermining or modify the design (e.g. avoid a full abdominoplasty) to protect the flap\'s blood supply', 'Subcostal / flank scar')] } },
    isOneOf(a, f('hernia'), 'hernia') && { problem: { investigations: [L('Ultrasound or CT of the abdominal wall; plan hernia repair with general surgery at or before the abdominoplasty', 'Hernia on examination')] } },
    isOneOf(a, f('pannus_skin'), 'intertrigo') && { general: [G('Optimisation before surgery', L('Treat the intertrigo (dry, antifungal, barrier) until the skin is intact before surgery', 'Intertrigo under the pannus'))] },
    lipo(a) && aspirate != null && aspirate > 5000 && { general: [G('Anaesthesia and theatre', L('Large-volume liposuction: in hospital, with overnight monitoring of vital signs and urine output; avoid combining with other major procedures', `Aspirate over 5,000 mL (${ASPS_LIPO.split('.')[0]} 2004)`, 'urgent'))] },
    lipo(a) && { general: [G('Anaesthesia and theatre', L(
      'Calculate the total lidocaine dose for the infiltrate in advance (35 mg/kg or less in tumescent fluid) and record the infiltrate and aspirate volumes for fluid balance; avoid further local anaesthetic afterwards — plasma lidocaine peaks many hours after tumescent infiltration',
      `Tumescent lidocaine (${ASPS_LIPO.split('.')[0]} 2004)`))] },
    { counselling: [
      P('Scars and results', 'Where the scars will be and that they are permanent; swelling for weeks; final result at 6–12 months; the chance of revision.', 'Body contouring consent'),
      P('Recovery', 'Binder / garment, drains, time off work and lifting, when to drive, and keeping weight stable to keep the result.', 'Body contouring consent'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('nac'), 'congested', 'pale') && { problem: { treatment: [L(
      'Threatened nipple–areola: release tight sutures and dressings now, exclude haematoma, and return to theatre if it does not improve within hours (convert to a free nipple graft if the pedicle cannot be saved)',
      `Nipple–areola ${String(a[f('nac')])}`, 'urgent')] } },
    breast(a) && !isOneOf(a, f('nac'), 'congested', 'pale') && { problem: { monitoring: [L('Nipple–areola colour, refill and warmth with each set of observations for the first 24 hours', 'Nipple–areola viability after reduction')] } },
    isOneOf(a, f('nac'), 'epidermolysis') && { general: [G('Wound care and dressings', L('Moist, non-adherent dressing to the nipple until it re-epithelialises', 'Partial-thickness nipple–areola loss'))] },
    isOneOf(a, f('abdo_flap'), 'dusky') && { problem: { treatment: [L('Reduce tension on the abdominal closure (hips flexed), loosen the binder, keep warm, no nicotine; review daily for demarcation', 'Threatened lower central abdominal flap')] } },
    isOneOf(a, f('abdo_flap'), 'necrosis') && { problem: { treatment: [L('Debride the demarcated necrosis; dressings or NPWT; delayed closure or revision once clean', 'Abdominal flap necrosis')] } },
    abdo(a) && { general: [G('Rehabilitation (physiotherapy / OT)', L('Abdominoplasty: nurse and walk slightly flexed at the hips for the first days to protect the closure, mobilising from the day after surgery', 'Tension on the abdominoplasty closure'))] },
    abdo(a) && { general: [G('Wound care and dressings', L('Binder or garment day and night for about 6 weeks (unit protocol)', 'Seroma prevention after abdominoplasty (education record BODY-001: seroma 10–30%)'))] },
    lipo(a) && !abdo(a) && { general: [G('Wound care and dressings', L('Compression garment as directed (commonly several weeks); expect leakage of infiltrate from the port sites for 24–48 hours', 'After liposuction (unit protocol)'))] },
    isOneOf(a, f('garment'), 'too_tight') && { problem: { treatment: [L('Loosen or refit the binder / garment', 'Garment too tight')] } },
    isYes(a, f('last_symptoms')) && { problem: { treatment: [L(
      'Suspected local anaesthetic toxicity: stop all local anaesthetic, call for help, airway and oxygen, treat seizures (benzodiazepine), 20% lipid emulsion bolus and infusion, prolonged CPR if arrest',
      LAST, 'urgent')] } },
    isOneOf(a, f('fluid_shift'), 'dry') && { problem: { treatment: [L('IV fluid bolus and reassess; Hb; look for bleeding into the treated areas', 'Hypovolaemia after liposuction', 'urgent')] } },
    isOneOf(a, f('fluid_shift'), 'overloaded') && { problem: { treatment: [L('Sit up, oxygen, stop IV fluids, diuretic; chest X-ray', 'Fluid overload after tumescent infiltration', 'urgent')] } },
    isYes(a, f('fat_embolism')) && { problem: { investigations: [L('Arterial blood gas, chest X-ray and CTPA; treat as PE until excluded', 'Breathless / hypoxic after contouring — fat embolism or PE', 'urgent')] } },
    { dischargeCriteria: [
      'Observations normal; comfortable on oral analgesia; mobilising',
      'Nipple–areola and skin flaps healthy (as applies); drain plan agreed',
      'Garment fitted; patient knows the warning signs (bleeding, swelling on one side, breathlessness, calf pain)',
    ] },
    { general: [G('Red flags — return immediately if', L('One breast or one side of the abdomen becomes suddenly larger, tense or very painful, or the nipple turns dark or white', 'Haematoma / nipple compromise after contouring'))] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const late = chosen(a, f('late_problems'));
  return merge(
    isOneOf(a, f('histology'), 'abnormal') && { problem: { referrals: [L('Breast MDT for unexpected atypia / malignancy in the reduction specimen', 'Abnormal histology', 'urgent')] } },
    isOneOf(a, f('histology'), 'pending') && { problem: { monitoring: [L('Obtain and record the breast histology', 'Histology pending')] } },
    late.includes('seroma') && { problem: { treatment: [L('Aspirate under aseptic technique (ultrasound-guided if loculated) and compress; refer for sclerotherapy or excision if a pseudobursa forms', 'Recurrent seroma')] } },
    late.includes('fat_necrosis') && { problem: { investigations: [L('Ultrasound (± mammography) of the lump to confirm fat necrosis', 'Firm breast lump after reduction')] } },
    late.includes('scar') && { problem: { treatment: [L('Silicone gel / sheet, scar massage, sun protection; intralesional triamcinolone for keloid or persistent hypertrophic scar', 'Hypertrophic / keloid scar (Monstrey 2014)')] } },
    late.some(x => ['asymmetry', 'contour'].includes(x)) && { problem: { treatment: [L('Offer revision (dog-ear excision, liposuction, symmetrisation) once the result has settled — usually after 6–12 months', 'Asymmetry / contour irregularity')] } },
    late.includes('wound') && { problem: { investigations: [L('Look for a suture sinus, fat necrosis or infection; swab; remove a spitting suture', 'Unhealed wound')] } },
    isOneOf(a, f('weight_fu'), 'gained') && { counselling: [P('Weight', 'Weight gain can undo the result (fat returns to untreated areas); support to keep weight stable.', 'Weight gained since surgery')] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const breastBodyContouring: ProcedureModule = {
  id: ID,
  name: 'Breast reduction and body contouring',
  summary: 'Reduction mammaplasty, abdominoplasty and liposuction: BMI and weight stability, bariatric history, breast imaging, scars and hernia, aspirate and lidocaine limits, flap and nipple viability, seroma and procedure VTE modifiers.',
  group: 'aesthetic',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Breast / body contouring',
  basis: [
    ASPS_RM,
    ASPS_LIPO,
    HATEF_2008,
    MANASSA_2003,
    NEAMAN_2007,
    LAST,
    'NICE NG89 VTE; WHO 2016 SSI guideline; GMC Decision making and consent (2020); GMC guidance on cosmetic interventions (2016)',
  ],
  catalog: {
    feeIds: ['major-008', 'major-009', 'aesthetic-002'],
    educationId: null,
    educationNote: 'One module covers three operations: their education records (BREAST-001 reduction, BODY-001 abdominoplasty; none for liposuction) are cited in procedure-specific risk modifiers that fire only for the chosen operation.',
    patientEducationIds: ['cosmetic-abdominoplasty', 'cosmetic-liposuction'],
  },
  sections: {
    pre_op: [DETAILS, GENERAL, BREAST, ABDOMEN, LIPO],
    post_op: [DETAILS, POST],
    follow_up: [DETAILS, FU],
  },
  carryForward: [f('procedures'), f('indication'), f('pedicle')],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Breast reduction / abdominoplasty / liposuction (as marked)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Relieve symptoms caused by breast size or excess skin (pain, rashes, limited activity)',
      'Improve body contour and how clothes fit',
      'Improve comfort and confidence, within realistic limits',
    ],
    risks: [
      { name: 'Bleeding / haematoma', description: 'Bleeding under the skin that may need a return to theatre' },
      { name: 'Seroma', description: 'Fluid collecting under the skin that may need draining with a needle, sometimes repeatedly' },
      { name: 'Wound healing problems', description: 'Breakdown where wounds meet, especially in smokers, diabetics and people with a high BMI' },
      { name: 'Scarring', description: 'Long, permanent scars; in darker skin they may become thick, dark or keloid' },
      { name: 'Asymmetry and contour irregularity', description: 'The two sides may differ, with dents, ripples or dog-ears' },
      { name: 'Altered sensation', description: 'Numbness of the skin in the treated areas, often long-lasting' },
      { name: 'Blood clots (DVT / PE)', description: 'More likely after abdominoplasty and combined operations' },
      { name: 'Revision surgery', description: 'Further surgery may be needed to refine the result' },
    ],
    alternatives: [
      'Non-operative measures: weight management, physiotherapy and core strengthening, a well-fitted supportive bra, skin care for intertrigo',
      'A smaller operation (e.g. liposuction alone, mini-abdominoplasty)',
      'Staged rather than combined procedures',
      'No surgery',
    ],
    riskOfNotTreating: 'Symptoms such as neck and back pain, skin rashes and limited activity are likely to continue; for purely aesthetic concerns there is no medical harm in not operating.',
    anaesthesiaOptions: ['general', 'sedation', 'local'],
    additionalProcedures: [
      'Drains',
      'Hernia or muscle (diastasis) repair at abdominoplasty',
      'Free nipple grafting if the nipple blood supply is doubtful',
      'Return to theatre for haematoma',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: true,
    counsellingTopics: [
      'Where the scars will be and what they will look like in your skin',
      'Realistic expectations: swelling, final result at 6–12 months, revision rates',
      'Stopping smoking / nicotine and keeping weight stable',
      'Binder / garment, drains, lifting, work and driving',
      'Breastfeeding and nipple sensation after reduction',
      'Blood clots and how they are prevented',
    ],
    modifiers: [
      { id: 'bbc_reduction', when: c => breast(c.answers),
        text: 'For breast reduction: change in nipple sensation (about 20–50%), difficulty breastfeeding (about 30–50%), asymmetry (about 10–20%), fat necrosis (about 5–10%), and rarely loss of the nipple and areola (under 1%).',
        why: 'Reduction mammaplasty (education record BREAST-001)' },
      { id: 'bbc_abdo', when: c => abdo(c.answers),
        text: 'For abdominoplasty: seroma (about 10–30%), numbness of the lower abdomen (about 50–80%), wound-healing problems (about 5–15%), umbilical problems (about 5–10%) and skin necrosis (about 1–3%).',
        why: 'Abdominoplasty (education record BODY-001)' },
      { id: 'bbc_lipo', when: c => lipo(c.answers),
        text: 'For liposuction: contour irregularity, prolonged swelling and numbness; rarely fluid imbalance, local-anaesthetic toxicity, fat embolism or injury to internal organs.',
        why: 'Liposuction (ASPS Practice Advisory 2004)' },
      { id: 'bbc_smoke_abdo', when: c => abdo(c.answers) && isOneOf(c.answers, 'core.smoking', 'current', 'vaping', 'smokeless', 'ex_under_4w'),
        text: 'Because you use nicotine, the skin of the lower abdomen and the belly button are much more likely to die and the wound to break down after abdominoplasty.',
        why: 'Nicotine and abdominoplasty (Manassa 2003)' },
      { id: 'bbc_vte', when: c => abdo(c.answers) || isYes(c.answers, f('combined')) || (numOf(c.answers, f('aspirate_ml')) ?? 0) > 5000,
        text: 'Abdominoplasty, combined procedures and large-volume liposuction carry a higher risk of blood clots than most cosmetic operations; prevention will be planned with you.',
        why: 'Excisional body contouring VTE (Hatef 2008)' },
      { id: 'bbc_mwl', when: c => isOneOf(c.answers, f('bariatric'), 'yes') || isOneOf(c.answers, f('indication'), 'post_weight_loss'),
        text: 'After massive weight loss, wound-healing problems and seromas are more common and more than one operation is usually needed.',
        why: 'Post-massive weight loss contouring' },
      { id: 'bbc_large_lipo', when: c => (numOf(c.answers, f('aspirate_ml')) ?? 0) > 5000,
        text: 'Because a large volume will be removed, you will stay in hospital overnight so fluids and breathing can be monitored.',
        why: 'Large-volume liposuction (ASPS 2004)' },
    ],
  },
  followUp: {
    pre_op: [{ when: '2 weeks before surgery', purpose: 'Confirm nicotine abstinence, weight, imaging and bloods' }],
    post_op: [
      { when: 'Day 5–7', purpose: 'Wounds, nipple / flap, drains, seroma check' },
      { when: 'Week 2–3', purpose: 'Sutures; seroma aspiration if needed; histology (reduction)' },
      { when: '6 weeks', purpose: 'Garment off, return to full activity' },
    ],
    follow_up: [
      { when: '3 months', purpose: 'Scars, seroma, symptom relief' },
      { when: '6–12 months', purpose: 'Final result, revision discussion, clinical photographs' },
    ],
  },
  handoffs: [
    { label: 'Scar Monitor', route: '/scar-monitor', phases: ['follow_up'], when: 'Hypertrophic scars' },
    { label: 'Keloid Care', route: '/keloid-care', phases: ['pre_op', 'follow_up'], when: 'Previous or new keloid' },
    { label: 'Nutrition', route: '/nutrition', phases: ['pre_op'], when: 'After bariatric surgery / weight management' },
    { label: 'Calculators', route: '/calculators', phases: ['pre_op'], when: 'BMI and lidocaine dose' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate (usually out of pocket)' },
  ],
};
