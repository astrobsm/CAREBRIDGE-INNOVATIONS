/**
 * Vascular anomalies — infantile haemangioma and other vascular tumours,
 * and vascular malformations — before and after an intervention
 * (propranolol, sclerotherapy, embolisation, laser, excision).
 *
 * The first question is the ISSVA one: tumour (it proliferates — infantile
 * haemangioma, congenital haemangioma, pyogenic granuloma, kaposiform
 * haemangioendothelioma) or malformation (present at birth, grows with the
 * child — capillary, venous, lymphatic, arteriovenous). The answer decides
 * everything else: propranolol for infantile haemangioma only, with the
 * AAP 2019 high-risk features, the ≥ 5-lesion liver ultrasound and PHACE /
 * LUMBAR work-up; D-dimer and fibrinogen before treating a venous
 * malformation (localised intravascular coagulopathy); never ligating or
 * partly excising an AVM; sclerotherapy and embolisation through the
 * vascular-anomalies MDT. Kept deliberately concise.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'vascular_anomaly';
const f = (id: string) => `${ID}.${id}`;

// ── The lesion (carried forward) ────────────────────────────────────────────

const ISSVA: EncounterField = {
  id: f('issva'), label: 'Diagnosis (ISSVA 2018)', kind: 'select', important: true,
  options: [
    { value: 'ih', label: 'Tumour — infantile haemangioma' },
    { value: 'congenital_h', label: 'Tumour — congenital haemangioma (RICH / NICH / PICH)' },
    { value: 'pg', label: 'Tumour — pyogenic granuloma (lobular capillary haemangioma)' },
    { value: 'khe', label: 'Tumour — kaposiform haemangioendothelioma / tufted angioma', flag: 'red', flagReason: 'KHE / tufted angioma: check platelets and fibrinogen for Kasabach-Merritt phenomenon; haematology-oncology (sirolimus, vincristine) — surgery is rarely first-line.' },
    { value: 'cm', label: 'Malformation — capillary (port-wine stain)' },
    { value: 'vm', label: 'Malformation — venous' },
    { value: 'lm', label: 'Malformation — lymphatic (macrocystic / microcystic)' },
    { value: 'avm', label: 'Malformation — arteriovenous', flag: 'amber', flagReason: 'AVM: MDT with interventional radiology — never ligate feeding vessels or excise partially (recruitment and worse disease).' },
    { value: 'combined', label: 'Combined / syndromic (Klippel-Trenaunay, Parkes Weber, Sturge-Weber…)', flag: 'amber', flagReason: 'Syndromic vascular anomaly: vascular-anomalies MDT; screen for the associated features.' },
    { value: 'uncertain', label: 'Uncertain', flag: 'amber', flagReason: 'Uncertain vascular lesion: Doppler ultrasound first; MRI and biopsy where imaging is atypical (malignancy can mimic a vascular anomaly).' },
  ],
};
const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'periocular', label: 'Periocular / eyelid', flag: 'amber', flagReason: 'Periocular lesion: ophthalmology assessment within days — risk of amblyopia (AAP 2019).' },
    { value: 'beard_airway', label: 'Beard area / neck (possible airway involvement)', flag: 'amber', flagReason: 'Beard-distribution haemangioma: risk of airway haemangioma — ENT assessment if any stridor or noisy breathing (AAP 2019).' },
    { value: 'central_face', label: 'Nose, lip, ear or central face' },
    { value: 'scalp_face_other', label: 'Scalp / other face' },
    { value: 'lumbosacral', label: 'Lumbosacral / perineal' },
    { value: 'trunk', label: 'Trunk' },
    { value: 'limb', label: 'Limb / hand / foot' },
  ],
};
const SIZE: EncounterField = { id: f('size_cm'), label: 'Greatest dimension', kind: 'number', unit: 'cm', min: 0, max: 60, important: true };
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The vascular anomaly',
  intent: 'Classify first (ISSVA): the treatment of a tumour and of a malformation are different.',
  fields: [
    ISSVA, SITE, SIZE,
    { id: f('age_weeks'), label: 'Corrected age (infants)', kind: 'number', unit: 'weeks', min: 0, max: 260, help: 'For infants: gestational-age-corrected age in weeks.' },
  ],
};

// ── Pre-intervention ────────────────────────────────────────────────────────

const INTERVENTION: EncounterField = {
  id: f('intervention'), label: 'Planned intervention', kind: 'select', important: true,
  options: [
    { value: 'observe', label: 'Active observation with photographs' },
    { value: 'propranolol', label: 'Oral propranolol' },
    { value: 'timolol', label: 'Topical timolol (small, thin, superficial IH)' },
    { value: 'sclerotherapy', label: 'Sclerotherapy (interventional radiology)' },
    { value: 'embolisation_excision', label: 'Embolisation then excision' },
    { value: 'laser', label: 'Pulsed-dye / vascular laser' },
    { value: 'excision', label: 'Surgical excision' },
    { value: 'sirolimus', label: 'Sirolimus (complex malformations, KHE)' },
  ],
};

const ASSESS: EncounterSection = {
  id: f('assess'),
  title: 'Risk features and work-up',
  fields: [
    { id: f('ih_count'), label: 'Number of cutaneous haemangiomas', kind: 'number', min: 1, max: 200, showWhen: { field: f('issva'), equals: ['ih'] },
      numericFlags: [{ op: '>=', value: 5, level: 'amber', reason: 'Five or more cutaneous infantile haemangiomas: abdominal (liver) ultrasound (AAP 2019).' }] },
    { id: f('segmental'), label: 'Segmental pattern', kind: 'select', showWhen: { field: f('issva'), equals: ['ih'] },
      options: [
        { value: 'no', label: 'Focal / not segmental' },
        { value: 'facial', label: 'Segmental facial / scalp, 5 cm or more', flag: 'red', flagReason: 'Possible PHACE: MRI / MRA head and neck, echocardiogram and eye examination before propranolol (Garzon 2016 PHACE consensus; AAP 2019).' },
        { value: 'lumbosacral', label: 'Segmental lumbosacral / perineal', flag: 'amber', flagReason: 'Possible LUMBAR syndrome: spinal ultrasound (young infants) or MRI (AAP 2019).' },
      ] },
    {
      id: f('complications'), label: 'Complications', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'ulceration', label: 'Ulceration', flag: 'amber', flagReason: 'Ulcerated haemangioma: wound care, analgesia and treatment (propranolol) — ulceration is an AAP 2019 high-risk feature.' },
        { value: 'bleeding', label: 'Bleeding' },
        { value: 'visual', label: 'Obstructs the visual axis / distorts the eye', flag: 'red', flagReason: 'Visual-axis obstruction: urgent ophthalmology and start treatment — amblyopia develops within weeks.' },
        { value: 'airway', label: 'Stridor / noisy breathing', flag: 'red', flagReason: 'Possible airway haemangioma: urgent ENT airway assessment.' },
        { value: 'feeding', label: 'Feeding difficulty (lip / oral)' },
        { value: 'cardiac', label: 'High-output cardiac failure', flag: 'red', flagReason: 'High-output cardiac failure: paediatric cardiology now; large hepatic haemangioma or AVM.' },
        { value: 'pain_thrombosis', label: 'Pain / swelling episodes (thrombosis, phleboliths)' },
        { value: 'overgrowth', label: 'Limb overgrowth / length discrepancy' },
        { value: 'disfigurement', label: 'Risk of permanent disfigurement (nasal tip, lip, large facial)' },
      ],
    },
    { id: f('schobinger'), label: 'AVM — Schobinger stage', kind: 'select', showWhen: { field: f('issva'), equals: ['avm'] },
      options: [
        { value: 'I', label: 'I — quiescent (warm, pink)' },
        { value: 'II', label: 'II — expansion (bruit, pulsation, enlargement)' },
        { value: 'III', label: 'III — destruction (ulceration, bleeding, pain)', flag: 'red', flagReason: 'Schobinger III AVM: MDT — embolisation then complete excision with reconstruction.' },
        { value: 'IV', label: 'IV — decompensation (cardiac failure)', flag: 'red', flagReason: 'Schobinger IV AVM: cardiology and MDT urgently.' },
      ] },
    { id: f('coag'), label: 'D-dimer / fibrinogen (venous or combined malformation)', kind: 'select', showWhen: { field: f('issva'), equals: ['vm', 'combined'] },
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'normal', label: 'Normal' },
        { value: 'lic', label: 'Raised D-dimer ± low fibrinogen (localised intravascular coagulopathy)', flag: 'amber', flagReason: 'Localised intravascular coagulopathy: haematology; LMWH before sclerotherapy or surgery to prevent consumptive bleeding (Dompmartin 2008).' },
      ] },
    {
      id: f('imaging'), label: 'Imaging', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'doppler', label: 'Doppler ultrasound — consistent with the diagnosis' },
        { value: 'mri', label: 'MRI — extent mapped' },
        { value: 'atypical', label: 'Atypical for the diagnosis', flag: 'amber', flagReason: 'Atypical imaging: biopsy to exclude a malignant tumour (e.g. infantile fibrosarcoma, rhabdomyosarcoma, angiosarcoma).' },
      ],
    },
    INTERVENTION,
  ],
};

const PROP = { field: f('intervention'), equals: ['propranolol'] };
const PROPRANOLOL_CHECKS: EncounterSection = {
  id: f('propranolol_checks'),
  title: 'Propranolol pre-treatment checks (AAP 2019)',
  fields: [
    { id: f('hr_bp_normal'), label: 'Heart rate and blood pressure normal for age; cardiac examination normal', kind: 'select', showWhen: PROP,
      options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No', flag: 'amber', flagReason: 'Abnormal heart rate, BP or cardiac examination: ECG and paediatric cardiology before propranolol (AAP 2019).' }] },
    { id: f('ecg_indication'), label: 'ECG indication', kind: 'multiselect', showWhen: PROP,
      options: [
        { value: 'none', label: 'None' },
        { value: 'bradycardia', label: 'Heart rate below normal for age' },
        { value: 'family_arrhythmia', label: 'Family history of congenital heart disease or arrhythmia' },
        { value: 'maternal_ctd', label: 'Maternal connective-tissue disease' },
        { value: 'arrhythmia', label: 'Arrhythmia found or history of one' },
      ] },
    { id: f('wheeze'), label: 'Wheeze / reactive airway disease', kind: 'boolean', showWhen: PROP,
      flagWhenTrue: { level: 'amber', reason: 'Wheeze: propranolol can cause bronchospasm — discuss with paediatrics; hold during wheezy illness.' } },
    { id: f('phace_arteriopathy'), label: 'PHACE with cerebral arteriopathy on MRA', kind: 'boolean', showWhen: PROP,
      flagWhenTrue: { level: 'red', reason: 'PHACE arteriopathy: propranolol may raise stroke risk — neurology input, lowest effective dose, slow titration (Garzon 2016).' } },
    { id: f('dose_mg_kg'), label: 'Planned propranolol dose', kind: 'number', unit: 'mg/kg/day', min: 0, max: 5, showWhen: PROP,
      numericFlags: [{ op: '>', value: 3, level: 'amber', reason: 'Above the 2–3 mg/kg/day recommended for infantile haemangioma (AAP 2019).' }] },
  ],
};

// ── Post-procedure and follow-up ────────────────────────────────────────────

const AFTER: EncounterSection = {
  id: f('after'),
  title: 'After the intervention',
  fields: [
    { id: f('post_effects'), label: 'Procedure-specific effects', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'swelling', label: 'Swelling (expected after sclerotherapy)' },
        { value: 'skin_necrosis', label: 'Blistering / skin necrosis over the treated area', flag: 'amber', flagReason: 'Skin necrosis after sclerotherapy / embolisation: wound care; demarcate before any debridement.' },
        { value: 'nerve', label: 'New numbness or weakness', flag: 'amber', flagReason: 'Nerve injury after sclerotherapy (especially ethanol): document and review; most recover.' },
        { value: 'compartment', label: 'Tense limb / pain on passive stretch', flag: 'red', flagReason: 'Possible compartment syndrome after sclerotherapy: urgent surgical review; fasciotomy if confirmed.' },
        { value: 'haemoglobinuria', label: 'Dark urine (haemoglobinuria)', flag: 'amber', flagReason: 'Haemoglobinuria after sclerotherapy: IV fluids and monitor renal function.' },
        { value: 'ischaemia', label: 'Distal ischaemia after embolisation', flag: 'red', flagReason: 'Non-target embolisation / ischaemia: urgent interventional radiology and vascular review.' },
      ] },
    { id: f('histology'), label: 'Histology (excision)', kind: 'select', showWhen: { field: f('intervention'), equals: ['excision', 'embolisation_excision'] },
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirms the diagnosis' },
        { value: 'different', label: 'Different diagnosis', flag: 'amber', flagReason: 'Histology differs from the clinical diagnosis: re-classify (ISSVA) and re-plan at MDT.' },
      ] },
  ],
};

const RESPONSE: EncounterSection = {
  id: f('response'),
  title: 'Response and treatment effects',
  fields: [
    { id: f('course'), label: 'Course since the last review', kind: 'select', important: true,
      options: [
        { value: 'regressing', label: 'Regressing / improved' },
        { value: 'stable', label: 'Stable' },
        { value: 'growing', label: 'Growing', flag: 'amber', flagReason: 'Growing despite treatment: review the diagnosis (ISSVA), dose and adherence; image if atypical.' },
        { value: 'rebound', label: 'Regrowth after stopping propranolol', flag: 'amber', flagReason: 'Rebound growth after stopping propranolol: restart; rebound occurs in a minority, more after early cessation (AAP 2019).' },
      ] },
    { id: f('propranolol_effects'), label: 'Propranolol effects', kind: 'multiselect', showWhen: { field: f('intervention'), equals: ['propranolol'] },
      options: [
        { value: 'none', label: 'None' },
        { value: 'sleep', label: 'Sleep disturbance' },
        { value: 'cold', label: 'Cold hands / feet' },
        { value: 'wheeze', label: 'Wheeze', flag: 'amber', flagReason: 'Wheeze on propranolol: hold the dose and review.' },
        { value: 'hypoglycaemia', label: 'Hypoglycaemia (sweaty, lethargic, seizure)', flag: 'red', flagReason: 'Hypoglycaemia on propranolol: treat now; give with feeds and hold during poor feeding or vomiting (AAP 2019).' },
        { value: 'bradycardia', label: 'Bradycardia / hypotension', flag: 'amber', flagReason: 'Bradycardia / hypotension: reduce or hold the dose; paediatric review.' },
      ] },
    { id: f('residual'), label: 'Residual after involution / treatment', kind: 'select',
      options: [
        { value: 'none', label: 'None of concern' },
        { value: 'fibrofatty', label: 'Fibrofatty residuum or redundant skin' },
        { value: 'telangiectasia', label: 'Telangiectasia / redness' },
        { value: 'persistent_malformation', label: 'Persistent malformation symptoms' },
      ] },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const dx = (a: EncounterAnswers) => String(a[f('issva')] ?? '');
const dxLabel = (a: EncounterAnswers) => ISSVA.options?.find(o => o.value === dx(a))?.label ?? 'Vascular anomaly';

const goals: PlanRule = ctx => ({
  problem: {
    goals: [
      L('A correct ISSVA diagnosis — tumour or malformation — before treatment', 'Treatment depends on the class (ISSVA 2018)'),
      L(dx(ctx.answers) === 'ih' ? 'Treat high-risk infantile haemangiomas early, in the proliferative phase' : 'Control symptoms and complications with the least morbid treatment', dx(ctx.answers) === 'ih' ? 'Most haemangioma growth is complete by 5 months (AAP 2019)' : 'Malformations do not involute; treatment aims at function and symptoms'),
      L('Function, vision, airway and appearance protected', 'The complications that drive intervention'),
    ],
  },
});

const haemangioma: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op' || dx(ctx.answers) !== 'ih') return null;
  const a = ctx.answers;
  const comp = chosen(a, f('complications'));
  const highRisk = comp.some(c => ['ulceration', 'visual', 'airway', 'feeding', 'cardiac', 'disfigurement'].includes(c))
    || isOneOf(a, f('segmental'), 'facial', 'lumbosacral') || isOneOf(a, f('site'), 'periocular', 'beard_airway', 'central_face');
  const ecg = chosen(a, f('ecg_indication'));
  // Corrected age as recorded; else the age from the date of birth, which is
  // never less than the corrected age — so under 8 weeks by it is certain.
  const recordedWeeks = numOf(a, f('age_weeks'));
  const weeks = recordedWeeks ?? (ctx.patient.ageMonths != null ? Math.floor(ctx.patient.ageMonths * 4.33) : null);
  const prop = isOneOf(a, f('intervention'), 'propranolol');
  // AAP 2019 / Drolet 2013: an abnormal heart rate, BP or cardiac examination,
  // bradycardia or an arrhythmia must be assessed before the first dose.
  const cardiacHold = isOneOf(a, f('hr_bp_normal'), 'no') || ecg.includes('bradycardia') || ecg.includes('arrhythmia');
  return merge(
    prop && cardiacHold && {
      problem: { treatment: [L('Do not start propranolol until an ECG and paediatric cardiology review have excluded a contraindication (bradycardia, heart block beyond first degree, hypotension, heart failure)', `${isOneOf(a, f('hr_bp_normal'), 'no') ? 'Heart rate, BP or cardiac examination abnormal' : `ECG indication: ${ecg.join(', ').replace(/_/g, ' ')}`} (AAP 2019; Drolet 2013)`, 'urgent')] },
      cautions: ['Propranolol on hold until cardiac assessment is complete.'],
    },
    prop && isOneOf(a, f('segmental'), 'facial') && !isYes(a, f('phace_arteriopathy')) && {
      cautions: ['Segmental facial haemangioma: start propranolol only once the head and neck MRA and the echocardiogram have been reported (PHACE — Garzon 2016).'],
    },
    prop && recordedWeeks == null && (weeks == null || weeks >= 8) && { problem: { investigations: [L('Record the gestation-corrected age: an infant under 8 weeks corrected age starts propranolol under observation', 'Corrected age not recorded (Drolet 2013)')] } },
    highRisk && { problem: { treatment: [L('High-risk infantile haemangioma: start treatment now (oral propranolol first-line) rather than waiting for involution', 'AAP 2019 high-risk feature (life- or function-threatening, ulceration, structural association, disfigurement)', 'urgent')] } },
    (numOf(a, f('ih_count')) ?? 0) >= 5 && { problem: { investigations: [L('Abdominal ultrasound for hepatic haemangiomas (and TSH if hepatic lesions are diffuse)', 'Five or more cutaneous haemangiomas (AAP 2019)')] } },
    isOneOf(a, f('segmental'), 'facial') && { problem: { investigations: [L('PHACE work-up before propranolol: MRI / MRA of head and neck, echocardiogram, ophthalmology', 'Segmental facial haemangioma 5 cm or more (Garzon 2016; AAP 2019)', 'urgent')] } },
    isOneOf(a, f('segmental'), 'lumbosacral') && { problem: { investigations: [L('Spinal ultrasound (under about 3–6 months) or MRI for spinal dysraphism (LUMBAR)', 'Segmental lumbosacral haemangioma (AAP 2019)')] } },
    (isOneOf(a, f('site'), 'periocular') || comp.includes('visual')) && { problem: { referrals: [L('Ophthalmology within days', 'Periocular haemangioma — amblyopia risk (AAP 2019)', 'urgent')] } },
    (comp.includes('airway') || isOneOf(a, f('site'), 'beard_airway')) && { problem: { referrals: [L(comp.includes('airway') ? 'Urgent ENT airway endoscopy' : 'ENT review if any noisy breathing, hoarseness or stridor develops', 'Beard-distribution haemangioma (AAP 2019)', comp.includes('airway') ? 'urgent' : 'routine')] } },
    prop && !cardiacHold && { problem: { treatment: [
      L('Propranolol 2–3 mg/kg/day in 2 divided doses, given with or after a feed, titrated up over 1–2 weeks; continue at least 6 months (often to 12 months of age); recalculate the dose for weight at each visit', 'Infantile haemangioma (AAP 2019 clinical practice guideline)'),
    ] } },
    prop && ecg.length > 0 && { problem: { investigations: [L('ECG before starting propranolol', `ECG indication: ${ecg.join(', ').replace(/_/g, ' ')} (AAP 2019)`)] } },
    prop && ((weeks != null && weeks < 8) || isYes(a, f('wheeze')) || isYes(a, f('phace_arteriopathy'))) && { problem: { treatment: [L('Start propranolol under observation (heart rate and BP 1 and 2 hours after the first dose and after each increase), admitting if the infant is very young or has comorbidity', `${weeks != null && weeks < 8 ? `${recordedWeeks != null ? 'Corrected age' : 'Age from the date of birth'} ${weeks} weeks` : isYes(a, f('phace_arteriopathy')) ? 'PHACE arteriopathy' : 'Reactive airway disease'} (Drolet 2013 consensus; AAP 2019)`)] } },
    prop && { counselling: [P('Propranolol', 'Give with feeds; do not give if the baby is not feeding or is vomiting (risk of low blood sugar); stop and seek help for wheeze, cold blue extremities, unusual drowsiness or a seizure.', 'AAP 2019 safety advice')] },
    comp.includes('ulceration') && { general: [G('Wound care and dressings', L('Ulcerated haemangioma: barrier cream / petrolatum and non-adherent dressings, analgesia (including topical options), treat infection; it heals faster once propranolol is started', 'Ulceration (AAP 2019)'))] },
    isOneOf(a, f('intervention'), 'timolol') && { problem: { treatment: [L('Topical timolol 0.5% gel, 1 drop twice daily, for small, thin, superficial haemangiomas only', 'Small superficial IH (AAP 2019)')] } },
    isOneOf(a, f('intervention'), 'observe') && !highRisk && { problem: { monitoring: [L('Active observation with serial photographs every 2–4 weeks through the proliferative phase; treat if it grows rapidly or develops a high-risk feature', 'Low-risk haemangioma (AAP 2019)')] } },
  );
};

const otherAnomalies: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const d = dx(a);
  const iv = a[f('intervention')];
  return merge(
    d !== 'ih' && isOneOf(a, f('imaging'), 'not_done') && d !== 'pg' && { problem: { investigations: [L('Doppler ultrasound first (flow: slow vs fast); MRI to map the extent before sclerotherapy, embolisation or excision', `${dxLabel(a)} — imaging defines flow and extent (ISSVA)`)] } },
    (d === 'vm' || d === 'combined') && isOneOf(a, f('coag'), 'not_done') && { problem: { investigations: [L('D-dimer, fibrinogen, platelets and clotting screen', 'Venous / combined malformation — localised intravascular coagulopathy (Dompmartin 2008)')] } },
    isOneOf(a, f('coag'), 'lic') && { problem: { treatment: [L('Haematology: LMWH around sclerotherapy or surgery (commonly from about 10 days before to 10 days after; duration per haematology protocol)', 'Localised intravascular coagulopathy (Dompmartin 2008)')] } },
    d === 'vm' && isOneOf(a, f('site'), 'limb') && { general: [G('Wound care and dressings', L('Graduated compression garment for a limb venous malformation; low-dose aspirin may be considered for painful phlebothrombosis (specialist advice)', 'Limb venous malformation'))] },
    d === 'avm' && { problem: { treatment: [L('Embolisation by interventional radiology followed by complete excision (commonly within 24–72 hours) and reconstruction; do not ligate proximally or excise partially', `AVM${a[f('schobinger')] ? ` Schobinger ${String(a[f('schobinger')])}` : ''} (Kohout 1998; ISSVA MDT practice)`)] } },
    isOneOf(a, f('schobinger'), 'IV') || hasAny(a, f('complications'), 'cardiac') ? { problem: { investigations: [L('Echocardiogram and cardiology review', 'High-output cardiac failure', 'urgent')] } } : null,
    d === 'lm' && { problem: { treatment: [L('Macrocystic lymphatic malformation: sclerotherapy (e.g. doxycycline, bleomycin, OK-432); microcystic or mixed: sirolimus, staged excision or laser for surface vesicles', 'Lymphatic malformation (ISSVA MDT practice)')] } },
    (d === 'khe' || (numOf(a, 'core.platelets') ?? 999) < 100) && d !== 'pg' && d !== 'cm' && { problem: { referrals: [L('Haematology-oncology: platelets, fibrinogen, D-dimer; sirolimus / vincristine / steroids — avoid surgery and biopsy until the coagulopathy is controlled', d === 'khe' ? 'Kaposiform haemangioendothelioma / tufted angioma — Kasabach-Merritt phenomenon' : 'Thrombocytopenia with a vascular tumour', 'urgent')] } },
    d === 'pg' && { problem: { treatment: [L('Shave excision with curettage and cautery of the base, or full-thickness excision for recurrence; send for histology (in adults, amelanotic melanoma can mimic a pyogenic granuloma)', 'Pyogenic granuloma')] } },
    d === 'cm' && { problem: { treatment: [L('Pulsed-dye laser for port-wine stain; V1 (forehead / upper eyelid) involvement: ophthalmology (glaucoma) and neurology (Sturge-Weber)', 'Capillary malformation')] } },
    (iv === 'sclerotherapy' || iv === 'embolisation_excision' || d === 'avm' || d === 'combined' || d === 'khe') && { problem: { referrals: [L('Vascular-anomalies MDT (plastic surgery, interventional radiology, haematology, dermatology, paediatrics)', `${dxLabel(a)} — multimodal treatment (ISSVA)`)] } },
    (iv === 'excision' || iv === 'embolisation_excision') && (d === 'vm' || d === 'avm' || d === 'combined') && { general: [G('Anaesthesia and theatre', L('Group and crossmatch; tourniquet for limb lesions where possible; cell salvage and haemostatic agents available', 'Excision of a vascular malformation — high bleeding risk'))] },
    d === 'congenital_h' && { problem: { monitoring: [L('Congenital haemangioma: RICH involutes in the first year — observe; NICH persists and can be excised electively; propranolol is not effective', 'Congenital haemangioma (ISSVA)')] } },
  );
};

const after: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const e = chosen(a, f('post_effects'));
  return merge(
    e.includes('compartment') && { problem: { treatment: [L('Measure compartment pressures / examine now; fasciotomy if compartment syndrome', 'Tense limb after sclerotherapy', 'urgent')] } },
    e.includes('ischaemia') && { problem: { referrals: [L('Interventional radiology and vascular surgery now', 'Distal ischaemia after embolisation', 'urgent')] } },
    e.includes('haemoglobinuria') && { problem: { treatment: [L('IV fluids to maintain urine output; U&E', 'Haemoglobinuria after sclerotherapy')] } },
    e.includes('skin_necrosis') && { general: [G('Wound care and dressings', L('Non-adherent dressing over blistered / necrotic skin; let it demarcate before any debridement', 'Skin necrosis after sclerotherapy / embolisation'))] },
    e.includes('swelling') && { general: [G('Wound care and dressings', L('Elevate; swelling peaks at 24–72 hours after sclerotherapy and settles over 1–2 weeks', 'Expected post-sclerotherapy swelling'))] },
    isOneOf(a, f('histology'), 'pending') && { problem: { monitoring: [L('Chase the histology', 'Histology pending')] } },
    { dischargeCriteria: ['Pain controlled; limb soft with normal distal circulation', 'Knows when to return (swelling getting worse after 72 hours, fever, dark urine)'] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const pe = chosen(a, f('propranolol_effects'));
  return merge(
    pe.includes('hypoglycaemia') && { problem: { treatment: [L('Hold propranolol, treat hypoglycaemia, restart only with feeding advice and paediatric review', 'Hypoglycaemia on propranolol (AAP 2019)', 'urgent')] } },
    (pe.includes('wheeze') || pe.includes('bradycardia')) && { problem: { treatment: [L('Reduce or hold propranolol and review with paediatrics', `Propranolol effect: ${pe.filter(x => x === 'wheeze' || x === 'bradycardia').join(', ')}`)] } },
    isOneOf(a, f('intervention'), 'propranolol') && { problem: { monitoring: [L('Weigh the child and recalculate the dose; review every 4–8 weeks; plan to stop at around 12 months of age (taper is optional)', 'Propranolol for IH (AAP 2019)')] } },
    isOneOf(a, f('course'), 'rebound') && { problem: { treatment: [L('Restart propranolol for a further course', 'Rebound after stopping (AAP 2019)')] } },
    isOneOf(a, f('course'), 'growing') && { problem: { investigations: [L('Re-image (Doppler / MRI) and reconsider the diagnosis; biopsy if atypical', 'Growing despite treatment')] } },
    isOneOf(a, f('residual'), 'fibrofatty') && { problem: { treatment: [L('Excision of the fibrofatty residuum / redundant skin, ideally before school age', 'Residual after involution (AAP 2019)')] } },
    isOneOf(a, f('residual'), 'telangiectasia') && { problem: { treatment: [L('Pulsed-dye laser for residual telangiectasia', 'Residual telangiectasia')] } },
  );
};

const MALFORMATIONS = ['cm', 'vm', 'lm', 'avm', 'combined'];
const education: PlanRule = ctx => {
  const d = dx(ctx.answers);
  const line = d === 'ih'
    ? L('Photograph the haemangioma every 2 weeks at home in the same light; return early for rapid growth, ulceration, bleeding, or anything near the eye, nose, lip or airway', 'Parents as partners in monitoring the proliferative phase (AAP 2019)')
    : MALFORMATIONS.includes(d)
      ? L('Explain that a malformation does not go away on its own, may swell with illness, injury, puberty or pregnancy, and is treated for its symptoms', 'Vascular malformations grow with the patient and do not involute (ISSVA)')
      : d
        ? L('Explain what this vascular tumour is, how it is expected to behave and the warning signs (bleeding, rapid growth, bruising or pallor in a child)', `${dxLabel(ctx.answers)} (ISSVA)`)
        : null;
  return line ? { general: [G('Patient education', line)] } : null;
};

// ── The module ──────────────────────────────────────────────────────────────

export const vascularAnomaly: ProcedureModule = {
  id: ID,
  name: 'Vascular anomaly intervention (haemangioma / malformation)',
  summary: 'ISSVA classification, infantile haemangioma with propranolol (AAP 2019), venous / lymphatic / arteriovenous malformations, sclerotherapy, embolisation and excision.',
  group: 'oncology',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Vascular anomaly',
  basis: [
    'ISSVA Classification of Vascular Anomalies (2018) — issva.org/classification',
    'Krowchuk DP et al. Clinical practice guideline for the management of infantile hemangiomas. Pediatrics 2019;143:e20183475 (AAP)',
    'Drolet BA et al. Initiation and use of propranolol for infantile hemangioma: report of a consensus conference. Pediatrics 2013;131:128-40',
    'Garzon MC et al. PHACE syndrome: consensus-derived diagnosis and care recommendations. J Pediatr 2016;178:24-33',
    'Dompmartin A et al. Association of localized intravascular coagulopathy with venous malformations. Arch Dermatol 2008;144:873-7',
    'Kohout MP et al. Arteriovenous malformations of the head and neck: natural history and management. Plast Reconstr Surg 1998;102:643-54',
  ],
  catalog: {
    feeIds: [],
    educationId: null,
    educationNote: 'No vascular-anomaly record in the procedure education database; the ConsentSpec carries the procedure risks.',
    patientEducationIds: [],
  },
  sections: {
    pre_op: [DETAILS, ASSESS, PROPRANOLOL_CHECKS],
    post_op: [DETAILS, { ...AFTER, fields: [INTERVENTION, ...AFTER.fields] }],
    follow_up: [DETAILS, { ...RESPONSE, fields: [INTERVENTION, ...RESPONSE.fields] }],
  },
  carryForward: [f('issva'), f('site'), f('size_cm'), f('intervention')],
  scores: [],
  planRules: [goals, haemangioma, otherAnomalies, after, followUp, education],
  consent: {
    procedureName: 'Treatment of a vascular anomaly',
    phases: ['pre_op'],
    intendedBenefits: [
      'Shrink or remove the haemangioma or malformation',
      'Protect sight, breathing, feeding or limb function, and heal ulceration',
      'Improve appearance and reduce pain, swelling or bleeding',
    ],
    risks: [
      { name: 'Bleeding', description: 'Malformations can bleed heavily during surgery; a transfusion may be needed' },
      { name: 'Recurrence or persistence', description: 'Malformations often need several treatments and can re-grow; haemangiomas can regrow after propranolol stops' },
      { name: 'Sclerotherapy effects', description: 'Swelling and pain for days; blistering or skin loss; nerve injury; rarely compartment syndrome or dark urine' },
      { name: 'Embolisation effects', description: 'Pain, skin necrosis, or blockage of a vessel to normal tissue' },
      { name: 'Propranolol effects', description: 'Low blood sugar (if not feeding), wheeze, slow heart rate or low blood pressure, sleep disturbance, cold hands and feet' },
      { name: 'Scarring', description: 'Excision leaves a scar; in darker skin it may thicken or change colour' },
    ],
    alternatives: [
      'Observation with photographs (most infantile haemangiomas shrink by themselves)',
      'Medicine (propranolol, topical timolol, sirolimus) instead of a procedure',
      'Laser, sclerotherapy or embolisation instead of surgery, or before it',
      'Compression garments for limb malformations',
    ],
    riskOfNotTreating: 'Many haemangiomas shrink on their own, but those near the eye, airway, lip or nose, or that ulcerate, can cause lasting harm if not treated. Malformations do not go away; untreated they may grow, bleed, clot painfully or (AVMs) damage surrounding tissue and strain the heart.',
    anaesthesiaOptions: ['general', 'sedation', 'local'],
    additionalProcedures: ['Embolisation by interventional radiology before surgery', 'Skin graft or flap after excision', 'Blood transfusion'],
    photography: true,
    bloodProducts: 'possible',
    specimen: true,
    counsellingTopics: [
      'Whether this is a haemangioma (shrinks) or a malformation (does not)',
      'Why the treatment chosen fits this type',
      'Propranolol safety at home (feeds, illness, warning signs)',
      'That several treatments are often needed',
    ],
    modifiers: [
      { id: 'va_avm', when: c => dx(c.answers) === 'avm',
        text: 'Arteriovenous malformations bleed heavily and often come back if not fully removed; embolisation before surgery and blood transfusion are likely.',
        why: 'AVM' },
      { id: 'va_lic', when: c => isOneOf(c.answers, f('coag'), 'lic'),
        text: 'Your blood tests show clotting factors being used up in the malformation, so bleeding and clots are more likely; blood-thinning injections will be given around the procedure.',
        why: 'Localised intravascular coagulopathy' },
      { id: 'va_periocular', when: c => isOneOf(c.answers, f('site'), 'periocular'),
        text: 'Because the lesion is near the eye, treatment aims first to protect sight; eye specialists will be involved.',
        why: 'Periocular lesion' },
      { id: 'va_infant_prop', when: c => isOneOf(c.answers, f('intervention'), 'propranolol')
          && (numOf(c.answers, f('age_weeks')) ?? (c.patient.ageMonths != null ? Math.floor(c.patient.ageMonths * 4.33) : 99)) < 8,
        text: 'Because your baby is very young, propranolol will be started under observation, with checks of heart rate and blood pressure.',
        why: 'Corrected age under 8 weeks (Drolet 2013)' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Before treatment', purpose: 'Imaging, coagulation and (propranolol) cardiac checks reviewed' }],
    post_op: [
      { when: '24–72 hours', purpose: 'Swelling, skin and nerve check after sclerotherapy / embolisation' },
      { when: '2 weeks', purpose: 'Wound review; histology' },
    ],
    follow_up: [
      { when: 'Every 4–8 weeks (propranolol)', purpose: 'Response, weight-based dose, side effects; stop at about 12 months of age' },
      { when: '6–8 weeks after each sclerotherapy session', purpose: 'Response and need for a further session' },
    ],
  },
  handoffs: [
    { label: 'MDT (vascular anomalies)', route: '/mdt', when: 'Sclerotherapy, embolisation, AVM, KHE, syndromic anomalies' },
    { label: 'Investigations (Doppler, MRI, coagulation)', route: '/investigations', phases: ['pre_op', 'follow_up'] },
    { label: 'Referrals (ophthalmology, ENT, cardiology, haematology, IR)', route: '/referrals' },
    { label: 'Medication chart (propranolol)', route: '/medication-chart', phases: ['pre_op', 'follow_up'] },
  ],
};

/** Exposed for tests. */
export const VASCULAR_FIELDS = { ISSVA, SITE };
