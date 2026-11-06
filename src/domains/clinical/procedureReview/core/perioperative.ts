/**
 * Peri-operative core sections: anaesthetic fitness and VTE risk before the
 * operation; observations, wound and complications after it.
 *
 * The option lists are taken from the calculators that score them — ASA
 * classes and Mallampati descriptions from preoperativeService, RCRI factors
 * from its rcriFactors, Caprini factor keys as riskCalculators scores them —
 * so a label cannot say one thing while the score counts another.
 */
import type { EncounterSection } from '../../data/encounterModel';
import { asaClassifications, mallampatiScores, rcriFactors } from '../../../../services/preoperativeService';
import { instrumentFields } from '../scores/instrument';
import { CFS } from '../scores/cfs';
import { APFEL } from '../scores/apfel';

// ── Anaesthetic and peri-operative fitness ──────────────────────────────────

/** RCRI factor keys as preoperativeService.calculateRCRI reads them, in rcriFactors order. */
export const RCRI_KEYS = [
  'highRiskSurgery', 'ischemicHeartDisease', 'heartFailure',
  'cerebrovascularDisease', 'insulinDependentDiabetes', 'renalInsufficiency',
] as const;

export const ANAESTHETIC: EncounterSection = {
  id: 'core.anaesthetic',
  title: 'Anaesthetic and peri-operative fitness',
  intent: 'ASA, airway, cardiac (RCRI, functional capacity), sleep apnoea (STOP-BANG), frailty (CFS), PONV (Apfel) and bleeding risk.',
  fields: [
    {
      id: 'core.anaesthesia_planned', label: 'Anaesthesia planned', kind: 'select', important: true,
      options: [
        { value: 'local', label: 'Local' },
        { value: 'regional', label: 'Regional block' },
        { value: 'spinal', label: 'Spinal / epidural' },
        { value: 'sedation', label: 'Sedation' },
        { value: 'general', label: 'General' },
        { value: 'combined', label: 'Combined' },
      ],
    },
    {
      id: 'core.asa', label: 'ASA physical status', kind: 'select', important: true,
      options: asaClassifications.filter(a => a.class <= 5).map(a => ({
        value: String(a.class),
        label: `ASA ${a.class} — ${a.description}`,
        hint: a.examples.join(', '),
        ...(a.class >= 4 ? {
          flag: 'red' as const,
          flagReason: `ASA ${a.class}: anaesthetic consultant review and a critical-care bed before anything but life- or limb-saving surgery.`,
        } : a.class === 3 ? {
          flag: 'amber' as const,
          flagReason: 'ASA 3: anaesthetic pre-assessment and optimisation of the systemic disease before elective surgery.',
        } : {}),
      })),
    },
    { id: 'core.asa_emergency', label: 'Emergency procedure (ASA "E")', kind: 'boolean' },
    {
      id: 'core.mallampati', label: 'Mallampati', kind: 'select',
      options: mallampatiScores.map(m => ({ value: String(m.score), label: `Class ${m.score}`, hint: `${m.description}. ${m.difficulty}` })),
    },
    { id: 'core.mouth_opening', label: 'Mouth opening (inter-incisor)', kind: 'number', unit: 'cm', min: 0, max: 8 },
    { id: 'core.thyromental', label: 'Thyromental distance', kind: 'number', unit: 'cm', min: 0, max: 15 },
    {
      id: 'core.neck_mobility', label: 'Neck mobility', kind: 'select',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'limited', label: 'Limited' },
        { value: 'fixed', label: 'Fixed (e.g. burn contracture of the neck)' },
      ],
    },
    {
      id: 'core.difficult_airway_history', label: 'Previous difficult intubation', kind: 'boolean',
      flagWhenTrue: { level: 'red', reason: 'Previous difficult intubation: tell the anaesthetist before listing; difficult-airway equipment and a senior anaesthetist.' },
    },
    { id: 'core.beard', label: 'Beard', kind: 'boolean' },
    {
      id: 'core.rcri', label: 'RCRI factors present', kind: 'multiselect',
      help: 'Revised Cardiac Risk Index (Lee 1999).',
      options: [{ value: 'none', label: 'None' }, ...RCRI_KEYS.map((k, i) => ({ value: k, label: rcriFactors[i].factor }))],
    },
    {
      id: 'core.mets', label: 'Functional capacity', kind: 'select', important: true,
      options: [
        { value: '3', label: 'Under 4 METs — cannot climb two flights of stairs or walk briskly uphill', flag: 'amber',
          flagReason: 'Poor functional capacity (under 4 METs) with cardiac risk factors: further cardiac assessment before intermediate- or high-risk surgery (ESC/ESA 2022).' },
        { value: '5', label: '4–6 METs — climbs two flights of stairs' },
        { value: '8', label: '7–9 METs — moderate sport, e.g. jogging' },
        { value: '10', label: '10 METs or more — strenuous sport' },
      ],
    },
    { id: 'core.sb_snoring', label: 'STOP-BANG — snores loudly', kind: 'boolean' },
    { id: 'core.sb_tired', label: 'STOP-BANG — often tired or sleepy in the day', kind: 'boolean' },
    { id: 'core.sb_observed', label: 'STOP-BANG — observed to stop breathing in sleep', kind: 'boolean' },
    { id: 'core.sb_pressure', label: 'STOP-BANG — treated for high blood pressure', kind: 'boolean' },
    { id: 'core.neck_cm', label: 'Neck circumference', kind: 'number', unit: 'cm', min: 20, max: 70 },
    ...instrumentFields(CFS, 'core.cfs'),
    ...instrumentFields(APFEL, 'core.apfel', { items: ['history', 'opioids'] }),
    {
      id: 'core.inr', label: 'INR', kind: 'number', min: 0.5, max: 10,
      numericFlags: [{ op: '>', value: 1.5, level: 'amber', reason: 'INR above 1.5: correct or explain before surgery.' }],
    },
    {
      id: 'core.platelets', label: 'Platelets', kind: 'number', unit: 'x10^9/L', min: 1, max: 2000,
      numericFlags: [
        { op: '<', value: 50, level: 'red', reason: 'Platelets below 50 x10^9/L: haematology advice before any surgery.' },
        { op: '<', value: 100, level: 'amber', reason: 'Platelets below 100 x10^9/L: increased bleeding risk; avoid neuraxial anaesthesia unless advised.' },
      ],
    },
  ],
};

// ── VTE risk (Caprini) ──────────────────────────────────────────────────────

/**
 * Caprini factors asked here, keyed as riskCalculators.scoreCaprini reads
 * them. Age and BMI are filled by the engine from the record; the surgery
 * itself is asked separately as it also drives the anticoagulant plan.
 */
export const CAPRINI_ASKED: { key: string; label: string }[] = [
  { key: 'swollen_legs', label: 'Swollen legs (current)' },
  { key: 'varicose_veins', label: 'Varicose veins' },
  { key: 'pregnancy_postpartum', label: 'Pregnant or postpartum' },
  { key: 'oral_contraceptives', label: 'Oral contraceptive or HRT' },
  { key: 'sepsis_1month', label: 'Sepsis (under 1 month)' },
  { key: 'serious_lung_disease', label: 'Serious lung disease incl. pneumonia (under 1 month)' },
  { key: 'acute_mi', label: 'Acute myocardial infarction' },
  { key: 'chf_1month', label: 'Congestive heart failure (under 1 month)' },
  { key: 'inflammatory_bowel', label: 'Inflammatory bowel disease' },
  { key: 'medical_patient_bedrest', label: 'Medical patient at bed rest' },
  { key: 'malignancy', label: 'Malignancy (present or previous)' },
  { key: 'patient_confined_bed', label: 'Confined to bed (over 72 hours)' },
  { key: 'immobilizing_cast', label: 'Immobilising plaster cast (under 1 month)' },
  { key: 'central_venous_access', label: 'Central venous access' },
  { key: 'personal_history_vte', label: 'Personal history of DVT / PE' },
  { key: 'family_history_vte', label: 'Family history of DVT / PE' },
  { key: 'other_thrombophilia', label: 'Known thrombophilia (factor V Leiden, antiphospholipid…)' },
  { key: 'heparin_thrombocytopenia', label: 'Heparin-induced thrombocytopenia' },
  { key: 'stroke_1month', label: 'Stroke (under 1 month)' },
  { key: 'hip_pelvis_fracture', label: 'Hip, pelvis or leg fracture (under 1 month)' },
  { key: 'acute_spinal_injury', label: 'Acute spinal cord injury (under 1 month)' },
];

export const VTE: EncounterSection = {
  id: 'core.vte',
  title: 'VTE risk (Caprini)',
  intent: 'Caprini score (age and BMI are added from the record) and bleeding risk, for prophylaxis per NICE NG89.',
  fields: [
    {
      id: 'core.surgery_extent', label: 'Planned operation', kind: 'select', important: true,
      options: [
        { value: 'minor', label: 'Minor (under 45 minutes)' },
        { value: 'major', label: 'Major (over 45 minutes)' },
      ],
    },
    {
      id: 'core.caprini', label: 'Caprini risk factors', kind: 'multiselect', important: true,
      options: [{ value: 'none', label: 'None of these' }, ...CAPRINI_ASKED.map(c => ({ value: c.key, label: c.label }))],
    },
  ],
};

// ── Post-operative status ───────────────────────────────────────────────────

export const POST_OP_STATUS: EncounterSection = {
  id: 'core.post_op_status',
  title: 'Post-operative status',
  intent: 'Observations (NEWS2), the operative wound and drains, and the complications to look for at every post-operative review.',
  fields: [
    { id: 'core.pod', label: 'Post-operative day', kind: 'number', min: 0, max: 365, important: true },
    { id: 'core.obs_rr', label: 'Respiratory rate', kind: 'number', unit: '/min', min: 0, max: 80, important: true },
    { id: 'core.obs_spo2', label: 'SpO2', kind: 'number', unit: '%', min: 50, max: 100, important: true },
    { id: 'core.obs_on_oxygen', label: 'On supplemental oxygen', kind: 'boolean' },
    { id: 'core.obs_temp', label: 'Temperature', kind: 'number', unit: 'C', min: 30, max: 43, important: true },
    { id: 'core.obs_sbp', label: 'Systolic BP', kind: 'number', unit: 'mmHg', min: 40, max: 260, important: true },
    { id: 'core.obs_hr', label: 'Heart rate', kind: 'number', unit: '/min', min: 20, max: 220, important: true },
    {
      id: 'core.obs_avpu', label: 'Consciousness (ACVPU)', kind: 'select', important: true,
      options: [
        { value: 'alert', label: 'Alert' },
        { value: 'confused', label: 'New confusion', flag: 'red', flagReason: 'New confusion scores 3 on NEWS2: look for sepsis, hypoxia, hypoglycaemia, drugs.' },
        { value: 'voice', label: 'Responds to voice', flag: 'red', flagReason: 'Reduced consciousness: urgent medical review.' },
        { value: 'pain', label: 'Responds to pain', flag: 'red', flagReason: 'Reduced consciousness: emergency review.' },
        { value: 'unresponsive', label: 'Unresponsive', flag: 'red', flagReason: 'Unresponsive: emergency response now.' },
      ],
    },
    {
      id: 'core.urine', label: 'Urine output', kind: 'select',
      options: [
        { value: 'adequate', label: 'Adequate (at least 0.5 mL/kg/h)' },
        { value: 'low', label: 'Low (under 0.5 mL/kg/h)', flag: 'amber', flagReason: 'Oliguria: assess fluid balance, bleeding and sepsis.' },
        { value: 'retention', label: 'Not passed urine / retention', flag: 'amber', flagReason: 'Possible urinary retention: bladder scan or catheter.' },
      ],
    },
    {
      id: 'core.op_wound', label: 'Operative wound / dressing', kind: 'select', important: true,
      options: [
        { value: 'clean_dry', label: 'Clean and dry — dressing intact' },
        { value: 'ooze', label: 'Minor ooze' },
        { value: 'soaked', label: 'Soaked / active bleeding', flag: 'red', flagReason: 'Active bleeding or a soaked dressing: examine now; pressure, check clotting, consider return to theatre.' },
        { value: 'inflamed', label: 'Erythema or swelling', flag: 'amber', flagReason: 'Possible surgical-site infection or haematoma: examine the wound.' },
        { value: 'discharge', label: 'Purulent discharge', flag: 'amber', flagReason: 'Surgical-site infection: culture, open and drain any collection, antibiotics if spreading (NICE NG125).' },
        { value: 'dehisced', label: 'Dehisced', flag: 'amber', flagReason: 'Wound dehiscence: assess depth and cause (infection, tension, haematoma).' },
      ],
    },
    {
      id: 'core.drain', label: 'Drain', kind: 'select',
      options: [
        { value: 'none', label: 'No drain' },
        { value: 'serous', label: 'Serous' },
        { value: 'haemoserous', label: 'Haemoserous' },
        { value: 'frank_blood', label: 'Frank blood, filling quickly', flag: 'red', flagReason: 'Brisk fresh blood in the drain suggests active bleeding: examine now and inform the operating surgeon.' },
        { value: 'purulent', label: 'Purulent', flag: 'amber', flagReason: 'Purulent drain fluid: send for culture; look for a collection.' },
      ],
    },
    {
      id: 'core.drain_output', label: 'Drain output, last 24 hours', kind: 'number', unit: 'mL', min: 0, max: 5000,
      showWhen: { field: 'core.drain', equals: ['serous', 'haemoserous', 'frank_blood', 'purulent'] },
    },
    {
      id: 'core.complications', label: 'Complications', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'haematoma', label: 'Haematoma', flag: 'red', flagReason: 'Haematoma under a graft or flap threatens it: evacuate early (return to theatre or bedside).' },
        { value: 'seroma', label: 'Seroma', flag: 'amber', flagReason: 'Seroma: aspirate if symptomatic or under a graft / flap.' },
        { value: 'ssi', label: 'Surgical-site infection', flag: 'amber', flagReason: 'Surgical-site infection: culture, drain collections, antibiotics for spreading infection (NICE NG125).' },
        { value: 'dehiscence', label: 'Wound dehiscence', flag: 'amber', flagReason: 'Dehiscence: assess and plan secondary closure or reconstruction.' },
        { value: 'vte', label: 'Suspected DVT / PE', flag: 'red', flagReason: 'Suspected VTE: urgent imaging and senior review — in adults, Wells score and treatment-dose anticoagulation unless contraindicated (NICE NG158); in children, paediatric haematology advice.' },
        { value: 'ponv', label: 'Nausea and vomiting', flag: 'amber', flagReason: 'PONV: rescue antiemetic from a class not already given (Gan 2020).' },
        { value: 'chest', label: 'Chest infection / atelectasis', flag: 'amber', flagReason: 'Chest complication: physiotherapy, sit up, cultures, antibiotics if pneumonia.' },
        { value: 'delirium', label: 'Delirium', flag: 'amber', flagReason: 'Delirium: look for the cause (pain, retention, infection, drugs, hypoxia); 4AT in adults, a paediatric delirium tool (e.g. CAPD) in children.' },
        { value: 'retention', label: 'Urinary retention', flag: 'amber', flagReason: 'Urinary retention: catheterise and review drugs.' },
      ],
    },
    {
      id: 'core.mobilising', label: 'Mobilising', kind: 'select',
      options: [
        { value: 'yes', label: 'Yes, as planned' },
        { value: 'limited', label: 'Limited' },
        { value: 'no', label: 'Not yet', flag: 'amber', flagReason: 'Not mobilising: VTE and chest risk; physiotherapy.' },
      ],
    },
    {
      id: 'core.eating', label: 'Eating and drinking', kind: 'select',
      options: [
        { value: 'normal', label: 'Normally' },
        { value: 'limited', label: 'Limited' },
        { value: 'nbm', label: 'Nil by mouth', flag: 'amber', flagReason: 'Prolonged nil by mouth delays recovery: resume oral intake early unless contraindicated (ERAS).' },
      ],
    },
  ],
};
