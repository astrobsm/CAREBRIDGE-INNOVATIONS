/**
 * Holistic core sections: the patient, not the procedure.
 *
 * Comorbidity risk, barriers to healing, nutrition, pressure risk, pain,
 * psychological status and social circumstances. Written once; every review
 * of a phase that needs them gets the same questions, so a smoker is asked
 * about smoking in the same words before a graft, a flap or a debridement,
 * and the same rule turns the answer into the same plan line.
 *
 * Thresholds on number fields are published ones, and each says where it is
 * from. Socio-economic questions reflect Nigerian / LMIC practice: who pays
 * (NHIS, HMO or out of pocket), how far the patient travels, whether a carer
 * can do dressings, and whether traditional remedies are being applied.
 */
import type { EncounterField, EncounterSection } from '../../data/encounterModel';
import { PAIN_FIELDS } from '../../data/encounterModel';
import { BRADEN_SCALE_GUIDE, PRESSURE_ULCER_STAGES } from '../../../pressure-sore/data/clinicalProtocol';
import { instrumentFields, responsesFrom } from '../scores/instrument';
import { PHQ9, PHQ2_ITEMS, PHQ2_CUTOFF } from '../scores/phq';
import { GAD7, GAD2_ITEMS, GAD2_CUTOFF } from '../scores/gad';
import { APPEARANCE_SCREEN } from '../scores/appearance';
import { namespaced } from './answers';

const C = 'core';

// ── Comorbidity and risk factors ────────────────────────────────────────────

export const PATIENT_FACTORS: EncounterSection = {
  id: 'core.patient_factors',
  title: 'Comorbidity and risk factors',
  intent: 'Every condition and exposure that changes the risk of this procedure or of healing.',
  fields: [
    {
      id: 'core.diabetes', label: 'Diabetes', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'No diabetes' },
        { value: 'diet', label: 'Diet-controlled' },
        { value: 'oral', label: 'Oral agents' },
        { value: 'insulin', label: 'Insulin-treated' },
        { value: 'not_screened', label: 'Not known — not screened', flag: 'amber',
          flagReason: 'Undiagnosed diabetes is common in people with chronic wounds. Check a random or fasting glucose and HbA1c.' },
      ],
    },
    {
      id: 'core.hba1c', label: 'HbA1c', kind: 'number', unit: '%', min: 3, max: 20,
      showWhen: { field: 'core.diabetes', equals: ['diet', 'oral', 'insulin'] },
      help: 'Within the last 3 months. 8.5% is 69 mmol/mol.',
      numericFlags: [{
        op: '>', value: 8.5, level: 'amber',
        reason: 'HbA1c above 69 mmol/mol (8.5%): refer for glycaemic optimisation before elective surgery where it is safe to wait (CPOC 2021; JBDS-IP).',
      }],
    },
    {
      id: 'core.glucose', label: 'Random / capillary glucose', kind: 'number', unit: 'mmol/L', min: 1, max: 40,
      numericFlags: [
        { op: '<', value: 4, level: 'red', reason: 'Hypoglycaemia (below 4 mmol/L): treat now (JBDS-IP).' },
        { op: '>', value: 12, level: 'amber', reason: 'Above 12 mmol/L — outside the acceptable peri-operative range of 4–12 mmol/L (JBDS-IP; target 6–10).' },
      ],
    },
    {
      id: 'core.pvd', label: 'Peripheral arterial disease', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'suspected', label: 'Suspected (claudication, rest pain, absent pulses)', flag: 'amber',
          flagReason: 'Suspected arterial disease: assess perfusion (pulses, ABPI / toe pressures, Doppler) before surgery, compression or reconstruction on the limb.' },
        { value: 'confirmed', label: 'Confirmed', flag: 'amber',
          flagReason: 'Arterial disease limits healing and flap / graft survival in the affected limb. Vascular review.' },
        { value: 'revascularised', label: 'Previously revascularised' },
      ],
    },
    {
      id: 'core.renal', label: 'Kidney function', kind: 'select',
      options: [
        { value: 'normal', label: 'Normal / not known to be impaired' },
        { value: 'ckd_3', label: 'CKD stage 3' },
        { value: 'ckd_4_5', label: 'CKD stage 4–5', flag: 'amber', flagReason: 'Advanced CKD: renal dosing, avoid NSAIDs and nephrotoxins, impaired healing.' },
        { value: 'dialysis', label: 'On dialysis', flag: 'amber', flagReason: 'Dialysis: plan surgery around dialysis days, fluid and potassium balance; protect fistula arm.' },
      ],
    },
    {
      id: 'core.cardiac', label: 'Heart disease', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'hypertension', label: 'Hypertension' },
        { value: 'ihd', label: 'Ischaemic heart disease' },
        { value: 'heart_failure', label: 'Heart failure', flag: 'amber', flagReason: 'Heart failure is an RCRI risk factor: optimise and assess before elective surgery.' },
        { value: 'arrhythmia', label: 'Arrhythmia / atrial fibrillation' },
        { value: 'valve', label: 'Valve disease / prosthetic valve' },
        { value: 'recent_mi', label: 'MI or stroke within 3 months', flag: 'red',
          flagReason: 'MI or stroke within 3 months (ASA 4): defer elective surgery; physician / cardiology review.' },
      ],
    },
    {
      id: 'core.respiratory', label: 'Lung disease', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'asthma', label: 'Asthma' },
        { value: 'copd', label: 'COPD' },
        { value: 'osa', label: 'Obstructive sleep apnoea (diagnosed)' },
        { value: 'tb', label: 'Tuberculosis (current or treated)' },
        { value: 'recent_infection', label: 'Chest infection in the last 4 weeks', flag: 'amber',
          flagReason: 'A recent chest infection raises post-operative pulmonary complications: defer elective general anaesthesia where possible.' },
      ],
    },
    {
      id: 'core.haemoglobinopathy', label: 'Haemoglobin genotype', kind: 'select',
      help: 'Ask in every patient in West Africa — it changes anaesthetic, tourniquet and transfusion planning.',
      options: [
        { value: 'aa', label: 'HbAA' },
        { value: 'as', label: 'HbAS (trait)' },
        { value: 'ss_sc', label: 'HbSS / HbSC (sickle cell disease)', flag: 'amber',
          flagReason: 'Sickle cell disease: haematology review before surgery (hydration, warmth, oxygenation, transfusion plan); avoid tourniquets where possible.' },
        { value: 'unknown', label: 'Not known', flag: 'amber', flagReason: 'Genotype not known: check before anaesthesia or tourniquet use.' },
      ],
    },
    {
      id: 'core.immune', label: 'Immunosuppression', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'steroids', label: 'Long-term corticosteroids', flag: 'amber',
          flagReason: 'Corticosteroids impair every phase of healing; steroid cover may be needed peri-operatively.' },
        { value: 'chemo', label: 'Chemotherapy — current or recent', flag: 'amber',
          flagReason: 'Recent chemotherapy: check counts and timing with oncology; wound complications are more likely.' },
        { value: 'immunosuppressant', label: 'Other immunosuppressant / biologic' },
        { value: 'hiv', label: 'HIV' },
        { value: 'transplant', label: 'Organ transplant' },
      ],
    },
    {
      id: 'core.radiotherapy_site', label: 'Previous radiotherapy to this site', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Irradiated tissue heals poorly: higher risk of breakdown, graft loss and infection; consider well-vascularised (flap) cover.' },
    },
    {
      id: 'core.anticoagulant', label: 'Anticoagulant or antiplatelet', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'warfarin', label: 'Warfarin', flag: 'amber', flagReason: 'Warfarin: needs a stop / bridging plan and INR check before surgery.' },
        { value: 'rivaroxaban', label: 'Rivaroxaban', flag: 'amber', flagReason: 'DOAC: needs a timed stop and restart plan.' },
        { value: 'apixaban', label: 'Apixaban', flag: 'amber', flagReason: 'DOAC: needs a timed stop and restart plan.' },
        { value: 'dabigatran', label: 'Dabigatran', flag: 'amber', flagReason: 'Dabigatran: stop time depends on kidney function.' },
        { value: 'enoxaparin', label: 'Enoxaparin / heparin' },
        { value: 'aspirin', label: 'Aspirin' },
        { value: 'clopidogrel', label: 'Clopidogrel', flag: 'amber', flagReason: 'Clopidogrel: stop 5–7 days before major surgery unless a coronary stent makes it unsafe.' },
      ],
    },
    {
      id: 'core.anticoag_indication', label: 'Reason for it', kind: 'select',
      showWhen: { field: 'core.anticoagulant', equals: ['warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin', 'aspirin', 'clopidogrel'] },
      options: [
        { value: 'af', label: 'Atrial fibrillation' },
        { value: 'vte_recent', label: 'VTE within 3 months', flag: 'amber', flagReason: 'VTE within 3 months is high thrombotic risk: haematology advice on bridging.' },
        { value: 'vte_old', label: 'Previous VTE (over 3 months)' },
        { value: 'mechanical_valve', label: 'Mechanical heart valve', flag: 'amber', flagReason: 'Mechanical valve: bridging is usually needed — cardiology / haematology plan.' },
        { value: 'coronary_stent', label: 'Coronary stent', flag: 'amber', flagReason: 'Do not stop antiplatelets after a coronary stent without cardiology advice.' },
        { value: 'prevention', label: 'Primary prevention / other' },
      ],
    },
    {
      id: 'core.bleeding_history', label: 'Personal or family history of abnormal bleeding', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'A bleeding history needs a coagulation screen and haematology advice before surgery.' },
    },
    {
      id: 'core.smoking', label: 'Smoking / nicotine', kind: 'select', important: true,
      options: [
        { value: 'never', label: 'Never' },
        { value: 'ex_over_4w', label: 'Stopped more than 4 weeks ago' },
        { value: 'ex_under_4w', label: 'Stopped less than 4 weeks ago', flag: 'amber',
          flagReason: 'Stopped under 4 weeks ago: wound complication risk not yet reduced (WHO 2020).' },
        { value: 'current', label: 'Current smoker', flag: 'amber',
          flagReason: 'Smoking impairs perfusion and healing and increases flap / graft loss and wound infection. Cessation at least 4 weeks before surgery reduces complications (WHO 2020).' },
        { value: 'vaping', label: 'Vaping / nicotine products', flag: 'amber',
          flagReason: 'Nicotine is a vasoconstrictor: discuss stopping all nicotine around flap and graft surgery.' },
        { value: 'smokeless', label: 'Snuff / chewing tobacco', flag: 'amber',
          flagReason: 'Smokeless tobacco delivers nicotine: same advice as smoking.' },
      ],
    },
    {
      id: 'core.smoking_readiness', label: 'Ready to stop?', kind: 'select',
      showWhen: { field: 'core.smoking', equals: ['current', 'vaping', 'smokeless'] },
      options: [
        { value: 'willing', label: 'Willing to stop now' },
        { value: 'considering', label: 'Considering it' },
        { value: 'not_ready', label: 'Not ready' },
      ],
    },
    {
      id: 'core.alcohol', label: 'Alcohol', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'within', label: 'Within 14 units a week' },
        { value: 'above', label: 'Above 14 units a week', flag: 'amber', flagReason: 'Above the UK CMO low-risk limit of 14 units a week: increased post-operative complications; advise reduction.' },
        { value: 'dependent', label: 'Dependent / daily heavy use', flag: 'amber', flagReason: 'Alcohol dependence: risk of withdrawal after admission — assess and plan (CIWA-Ar; thiamine).' },
      ],
    },
    {
      id: 'core.substance', label: 'Other substance use', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'opioid_misuse', label: 'Tramadol / codeine syrup / opioid misuse', flag: 'amber',
          flagReason: 'Opioid misuse changes analgesic requirements and withdrawal risk: plan with the pain team; use the Substance Use module.' },
        { value: 'cannabis', label: 'Cannabis' },
        { value: 'stimulants', label: 'Stimulants' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      id: 'core.pregnancy', label: 'Pregnancy', kind: 'select',
      options: [
        { value: 'not_applicable', label: 'Not applicable' },
        { value: 'not_pregnant', label: 'Not pregnant (confirmed)' },
        { value: 'possible', label: 'Possibly pregnant', flag: 'amber', flagReason: 'Possible pregnancy: pregnancy test before anaesthesia, radiology or teratogenic drugs.' },
        { value: 'pregnant', label: 'Pregnant', flag: 'amber', flagReason: 'Pregnancy: obstetric input; defer elective surgery; avoid teratogenic drugs.' },
      ],
    },
    {
      id: 'core.active_infection_elsewhere', label: 'Active infection elsewhere (chest, urine, skin, teeth)', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Treat infection elsewhere before elective surgery: it raises the risk of surgical-site infection.' },
    },
    { id: 'core.other_conditions', label: 'Other relevant conditions', kind: 'text', placeholder: 'e.g. epilepsy, thyroid disease, previous keloids' },
  ],
};

// ── Barriers to healing ─────────────────────────────────────────────────────

export const HEALING_BARRIERS: EncounterSection = {
  id: 'core.healing_barriers',
  title: 'Barriers to healing at the site',
  intent: 'Local factors that will defeat healing however good the operation. Systemic and social barriers are asked once, in their own sections, and combined in the risk summary.',
  fields: [
    {
      id: 'core.perfusion', label: 'Local perfusion', kind: 'select', important: true,
      options: [
        { value: 'good', label: 'Good — warm, pink, brisk capillary refill' },
        { value: 'doubtful', label: 'Doubtful', flag: 'amber', flagReason: 'Doubtful perfusion: assess formally (Doppler / ABPI / toe pressures) before relying on healing.' },
        { value: 'poor', label: 'Poor', flag: 'red', flagReason: 'Poor perfusion will defeat healing and reconstruction: vascular assessment first.' },
      ],
    },
    {
      id: 'core.oedema', label: 'Oedema', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'mild', label: 'Mild' },
        { value: 'moderate', label: 'Moderate', flag: 'amber', flagReason: 'Oedema impairs healing and graft adherence: elevation, compression if arterial supply allows, treat the cause.' },
        { value: 'severe', label: 'Severe / lymphoedema', flag: 'amber', flagReason: 'Severe oedema or lymphoedema: treat before definitive closure; consider the Lymphoedema module.' },
      ],
    },
    {
      id: 'core.tension', label: 'Tension on the wound or proposed closure', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'some', label: 'Some' },
        { value: 'high', label: 'High', flag: 'amber', flagReason: 'Closure under tension risks dehiscence and necrosis: plan a graft or flap rather than direct closure.' },
      ],
    },
    {
      id: 'core.pressure_shear', label: 'Site exposed to pressure, shear or friction', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Unrelieved pressure or shear will break the wound down again: offloading is part of the treatment.' },
    },
    {
      id: 'core.repeated_trauma', label: 'Repeated trauma or scratching at the site', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Repeated trauma prevents healing: protect the site and look for the cause (neuropathy, itch, occupation).' },
    },
    {
      id: 'core.foreign_body', label: 'Foreign body, implant, suture sinus or sequestrum', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'A retained foreign body or sequestrum keeps a wound open: imaging and removal.' },
    },
    {
      id: 'core.adherence', label: 'Likely adherence to dressings, offloading, splints and follow-up', kind: 'select', important: true,
      options: [
        { value: 'good', label: 'Good' },
        { value: 'uncertain', label: 'Uncertain' },
        { value: 'poor', label: 'Poor', flag: 'amber', flagReason: 'Poor expected adherence: find out why (cost, distance, understanding) and plan around it before committing to reconstruction.' },
      ],
    },
    { id: 'core.other_barrier', label: 'Other barrier', kind: 'text' },
  ],
};

// ── Nutrition ───────────────────────────────────────────────────────────────

export const NUTRITION: EncounterSection = {
  id: 'core.nutrition',
  title: 'Nutrition and biochemistry',
  intent: 'MUST screening for adults (BAPEN; NICE CG32); weight-for-age on the growth chart for children (NICE NG75); the results that bear on healing.',
  fields: [
    { id: 'core.weight_kg', label: 'Weight', kind: 'number', unit: 'kg', min: 1, max: 350, important: true },
    { id: 'core.height_cm', label: 'Height (length in infants)', kind: 'number', unit: 'cm', min: 40, max: 230, important: true },
    {
      // Children only (core/age.ts). MUST is an adult tool; there is no
      // paediatric screening score in the app, so this asks what NICE NG75
      // asks rather than inventing one.
      id: 'core.paed_growth', label: 'Weight-for-age on the growth chart', kind: 'select', important: true,
      narrativeLabel: 'Growth (weight-for-age)',
      help: 'Plot weight (and length / height) on the WHO or national growth chart at every visit.',
      options: [
        { value: 'following', label: 'Following a centile' },
        { value: 'faltering', label: 'Crossing centiles downwards (faltering growth)', flag: 'amber',
          flagReason: 'Faltering growth: feeding assessment and dietetic support; before elective surgery where it is safe to wait (NICE NG75).' },
        { value: 'below_2nd', label: 'Weight below the 2nd centile', flag: 'amber',
          flagReason: 'Weight below the 2nd centile for age: assess for faltering growth and undernutrition — paediatric dietitian (NICE NG75).' },
        { value: 'not_plotted', label: 'Not plotted', flag: 'amber', flagReason: 'Plot weight on a WHO growth chart at every visit.' },
      ],
    },
    {
      id: 'core.muac_cm', label: 'Mid-upper arm circumference (if height cannot be measured)', kind: 'number', unit: 'cm', min: 5, max: 70,
      help: 'BAPEN: MUAC below 23.5 cm suggests BMI below 20 kg/m2.',
      numericFlags: [{ op: '<', value: 23.5, level: 'amber', reason: 'MUAC below 23.5 cm suggests BMI below 20 kg/m2 (BAPEN MUST alternative measures).' }],
    },
    {
      id: 'core.weight_loss', label: 'Unplanned weight loss in the past 3–6 months', kind: 'select', important: true,
      narrativeLabel: 'Unplanned weight loss (3–6 months)',
      options: [
        { value: '0', label: 'Less than 5%' },
        { value: '1', label: '5–10%' },
        { value: '2', label: 'More than 10%', flag: 'amber', flagReason: 'Unplanned loss of more than 10% of body weight is clinically significant malnutrition risk (MUST).' },
        { value: 'unknown', label: 'Not known' },
      ],
    },
    {
      id: 'core.acute_disease', label: 'Acutely ill and no nutritional intake (or likely none) for more than 5 days', kind: 'boolean',
      help: 'MUST step 3 — scores 2.',
    },
    {
      id: 'core.intake', label: 'Current oral intake (feeding, in infants)', kind: 'select',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'reduced', label: 'Reduced (about half of meals)', flag: 'amber', flagReason: 'Reduced intake: food chart and dietetic advice.' },
        { value: 'poor', label: 'Poor (a quarter or less)', flag: 'amber', flagReason: 'Poor intake: oral nutritional supplements and dietitian referral.' },
      ],
    },
    {
      id: 'core.hb', label: 'Haemoglobin', kind: 'number', unit: 'g/dL', min: 2, max: 25,
      help: 'WHO anaemia: below 13 g/dL in men, below 12 g/dL in non-pregnant women; 11–12 g/dL in children by age (WHO 2011).',
      numericFlags: [{ op: '<', value: 7, level: 'red', reason: 'Hb below 7 g/dL: the restrictive transfusion threshold (NICE NG24) — assess for transfusion now.' }],
    },
    {
      id: 'core.albumin', label: 'Serum albumin', kind: 'number', unit: 'g/L', min: 5, max: 60,
      numericFlags: [{
        op: '<', value: 35, level: 'amber',
        reason: 'Albumin below the reference range (35 g/L). It falls with inflammation as well as malnutrition, and low values are associated with poor healing and post-operative complications.',
      }],
    },
    {
      id: 'core.prealbumin', label: 'Prealbumin (if available)', kind: 'number', unit: 'mg/L', min: 10, max: 600,
      numericFlags: [{ op: '<', value: 150, level: 'amber', reason: 'Prealbumin below the usual reference range (150 mg/L); interpret with CRP.' }],
    },
    {
      id: 'core.micronutrients', label: 'Known deficiencies (measured or clinically evident)', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None known' },
        { value: 'iron', label: 'Iron deficiency' },
        { value: 'zinc', label: 'Zinc' },
        { value: 'vit_c', label: 'Vitamin C' },
        { value: 'vit_d', label: 'Vitamin D' },
        { value: 'b12_folate', label: 'B12 / folate' },
      ],
    },
    {
      id: 'core.nutrition_support', label: 'Current nutritional support', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'ons', label: 'Oral nutritional supplements' },
        { value: 'enteral', label: 'Tube feeding' },
        { value: 'parenteral', label: 'Parenteral nutrition' },
      ],
    },
  ],
};

// ── Pressure risk (Braden) ──────────────────────────────────────────────────

const BRADEN_IDS = ['sensory_perception', 'moisture', 'activity', 'mobility', 'nutrition', 'friction_shear'] as const;
export type BradenFieldKey = typeof BRADEN_IDS[number];
export const bradenFieldId = (k: BradenFieldKey) => `core.braden_${k}`;

/** The Braden fields, with the published descriptors from the pressure-sore module. */
const bradenFields: EncounterField[] = BRADEN_SCALE_GUIDE.domains.map((d, i) => ({
  id: bradenFieldId(BRADEN_IDS[i]),
  label: `Braden — ${d.name}`,
  help: d.description,
  kind: 'select' as const,
  options: d.scores.map(s => ({ value: String(s.value), label: `${s.value} ${s.label}`, hint: s.description })),
}));

export const PRESSURE: EncounterSection = {
  id: 'core.pressure',
  title: 'Pressure injury risk (Braden)',
  intent: 'Braden scale (Bergstrom 1987) and any existing pressure injury (NPIAP/EPUAP 2019).',
  fields: [
    ...bradenFields,
    {
      id: 'core.paed_pressure',
      label: 'Pressure risk (child under 8 — Braden Q or Glamorgan, per the paediatric protocol)',
      help: 'Adult Braden is not validated under 8. Include device-related pressure: splints, casts, tubes, oximeter probes and masks.',
      kind: 'select',
      options: [
        { value: 'low', label: 'Low risk' },
        { value: 'at_risk', label: 'At risk', flag: 'amber', flagReason: 'Child at risk of pressure injury (Braden Q / Glamorgan): skin and device checks every shift.' },
        { value: 'high', label: 'High risk', flag: 'amber', flagReason: 'Child at high risk of pressure injury (Braden Q / Glamorgan): pressure-redistributing surface and device checks.' },
        { value: 'not_scored', label: 'Not scored yet' },
      ],
    },
    {
      id: 'core.existing_pi', label: 'Existing pressure injury elsewhere', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        ...PRESSURE_ULCER_STAGES.map(s => ({
          value: s.code, label: `${s.stage} — ${s.name}`,
          flag: 'amber' as const,
          flagReason: `${s.stage} pressure injury present: offload, document on the body map and add to the plan (NPIAP/EPUAP 2019).`,
        })),
      ],
    },
  ],
};

// ── Pain ────────────────────────────────────────────────────────────────────

export const PAIN: EncounterSection = {
  id: 'core.pain',
  title: 'Pain',
  intent: 'SOCRATES, as in the guided history.',
  fields: [
    ...PAIN_FIELDS.map(f => namespaced(C, f)),
    {
      id: 'core.analgesic_use', label: 'Current analgesia', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'simple', label: 'Paracetamol / NSAID' },
        { value: 'weak_opioid', label: 'Weak opioid (codeine, tramadol)' },
        { value: 'strong_opioid', label: 'Strong opioid' },
        { value: 'long_term_opioid', label: 'Long-term opioid use (over 3 months)', flag: 'amber',
          flagReason: 'Long-term opioid use: opioid tolerance and withdrawal risk — plan peri-operative analgesia with the pain team (FPM Surgery and Opioids 2021).' },
      ],
    },
  ],
};

// ── Psychological status ────────────────────────────────────────────────────

const phq2Total = (a: Parameters<NonNullable<EncounterField['visibleWhen']>>[0]) =>
  Object.values(responsesFrom(PHQ9, 'core.phq', a, PHQ2_ITEMS)).reduce((n, v) => n + v, 0);
const gad2Total = (a: Parameters<NonNullable<EncounterField['visibleWhen']>>[0]) =>
  Object.values(responsesFrom(GAD7, 'core.gad', a, GAD2_ITEMS)).reduce((n, v) => n + v, 0);

export const PSYCHOLOGY: EncounterSection = {
  id: 'core.psychology',
  title: 'Psychological status',
  intent: 'PHQ-2 and GAD-2 from the ages they are validated for (13 and 12), expanding to PHQ-9 / GAD-7 when positive; for younger children, the child\'s wellbeing, the caregiver and safeguarding. Appearance concern, expectations, coping and capacity. Screens, not diagnoses.',
  fields: [
    // Children below the PHQ-9 age only (core/age.ts)
    {
      id: 'core.child_wellbeing', label: 'Child\'s emotional wellbeing (from the child as far as they can say, and the caregiver)', kind: 'select', important: true,
      narrativeLabel: 'Child\'s wellbeing',
      options: [
        { value: 'settled', label: 'Settled — no change in mood, sleep, feeding, play or behaviour' },
        { value: 'concern', label: 'Some concern (withdrawn, anxious, regression, sleep or feeding change)', flag: 'amber',
          flagReason: 'Concern about the child\'s wellbeing: explore with the child and caregiver; paediatric psychology / child mental-health referral if it persists or affects daily life.' },
        { value: 'marked', label: 'Marked distress or a big change in behaviour', flag: 'amber',
          flagReason: 'Marked distress in a child: paediatric psychology / child mental-health referral; look for a cause, including safeguarding.' },
      ],
    },
    {
      id: 'core.caregiver_coping', label: 'Caregiver coping', kind: 'select',
      options: [
        { value: 'coping', label: 'Coping' },
        { value: 'struggling', label: 'Struggling', flag: 'amber', flagReason: 'Caregiver struggling: offer support (social work, peer / family support); the child\'s care depends on them.' },
      ],
    },
    {
      id: 'core.child_safeguarding', label: 'Any concern about the child\'s safety or care (safeguarding)?', kind: 'select', important: true,
      help: 'NICE CG89 alerting features: an explanation that does not fit the injury or the child\'s development, unexplained delay in presenting, a disclosure, or neglect.',
      options: [
        { value: 'none', label: 'No concern' },
        { value: 'concern', label: 'Concern', flag: 'red',
          flagReason: 'Safeguarding concern: follow the child-protection procedure today — the hospital safeguarding lead and social work (NICE CG89).' },
      ],
    },
    ...instrumentFields(PHQ9, 'core.phq', { items: PHQ2_ITEMS, important: true }),
    ...instrumentFields(PHQ9, 'core.phq', {
      items: PHQ9.items.map(i => i.id).filter(id => !PHQ2_ITEMS.includes(id)),
      visibleWhen: a => phq2Total(a) >= PHQ2_CUTOFF,
    }),
    ...instrumentFields(GAD7, 'core.gad', { items: GAD2_ITEMS, important: true }),
    ...instrumentFields(GAD7, 'core.gad', {
      items: GAD7.items.map(i => i.id).filter(id => !GAD2_ITEMS.includes(id)),
      visibleWhen: a => gad2Total(a) >= GAD2_CUTOFF,
    }),
    ...instrumentFields(APPEARANCE_SCREEN, 'core.appearance', { items: ['concern'] }),
    ...instrumentFields(APPEARANCE_SCREEN, 'core.appearance', { items: ['preoccupied', 'distress', 'avoidance', 'disproportion'] })
      .map(f => ({ ...f, showWhen: { field: 'core.appearance.concern', equals: ['1'] } })),
    {
      id: 'core.psych_history', label: 'Mental health history', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'depression', label: 'Depression' },
        { value: 'anxiety', label: 'Anxiety' },
        { value: 'psychosis', label: 'Psychosis / bipolar' },
        { value: 'self_harm', label: 'Previous self-harm or suicide attempt', flag: 'amber',
          flagReason: 'Previous self-harm: ask directly about current thoughts and plans.' },
        { value: 'body_dysmorphia', label: 'Body dysmorphic disorder (diagnosed)', flag: 'amber',
          flagReason: 'Body dysmorphic disorder: elective aesthetic surgery rarely helps and often worsens it — specialist review first.' },
      ],
    },
    {
      id: 'core.expectations', label: 'Expectations of the outcome', kind: 'select', important: true,
      options: [
        { value: 'realistic', label: 'Realistic' },
        { value: 'partly', label: 'Partly realistic — needs discussion', flag: 'amber',
          flagReason: 'Expectations need further discussion before consent: show examples, explain limits and scars.' },
        { value: 'unrealistic', label: 'Unrealistic', flag: 'amber',
          flagReason: 'Unrealistic expectations predict dissatisfaction: do not consent until they are addressed (GMC Decision making and consent 2020).' },
      ],
    },
    {
      id: 'core.coping', label: 'Coping', kind: 'select',
      options: [
        { value: 'well', label: 'Coping well' },
        { value: 'struggling', label: 'Struggling', flag: 'amber', flagReason: 'Struggling to cope: offer psychological support and involve family with consent.' },
        { value: 'not_coping', label: 'Not coping', flag: 'amber', flagReason: 'Not coping: refer for psychological support.' },
      ],
    },
    {
      id: 'core.emotional_support', label: 'Emotional support from family / friends', kind: 'select',
      options: [
        { value: 'good', label: 'Good' },
        { value: 'limited', label: 'Limited' },
        { value: 'none', label: 'None' },
      ],
    },
    {
      id: 'core.capacity', label: 'Capacity to make this decision', kind: 'select', important: true,
      help: 'Understand, retain, weigh and communicate the decision. Recorded once here; the consent record uses it.',
      options: [
        { value: 'has_capacity', label: 'Has capacity' },
        { value: 'fluctuating', label: 'Fluctuating / uncertain', flag: 'amber',
          flagReason: 'Uncertain capacity: assess formally, at the time of the decision, and document; involve those close to the patient.' },
        { value: 'lacks_capacity', label: 'Lacks capacity for this decision', flag: 'amber',
          flagReason: 'Lacks capacity: follow the hospital policy for adults without capacity (best-interests decision with the next of kin or legal representative), and document it.' },
        { value: 'minor', label: 'A child — consent by parent / guardian' },
      ],
    },
  ],
};

// ── Social circumstances ────────────────────────────────────────────────────

export const SOCIAL: EncounterSection = {
  id: 'core.social',
  title: 'Social circumstances and access to care',
  intent: 'Who will help, what it will cost, how far they travel — the things that decide whether a plan is carried out.',
  fields: [
    {
      id: 'core.carer', label: 'Practical help at home (dressings, mobility, personal care)', kind: 'select', important: true,
      options: [
        { value: 'available', label: 'Available' },
        { value: 'limited', label: 'Limited' },
        { value: 'none', label: 'None', flag: 'amber', flagReason: 'No practical help at home: plan dressings, mobility and discharge around it (social work).' },
      ],
    },
    {
      id: 'core.mobility', label: 'Mobility', kind: 'select',
      options: [
        { value: 'independent', label: 'Independent' },
        { value: 'aid', label: 'Walks with an aid' },
        { value: 'wheelchair', label: 'Wheelchair' },
        { value: 'bedbound', label: 'Bed-bound', flag: 'amber', flagReason: 'Bed-bound: pressure, VTE and chest risk; physiotherapy and pressure care.' },
      ],
    },
    {
      id: 'core.livelihood', label: 'Effect on work / livelihood', kind: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'temporary', label: 'Temporary time off' },
        { value: 'significant', label: 'Threatens livelihood', flag: 'amber',
          flagReason: 'The condition or the recovery threatens the patient\'s income: discuss timing, support and a realistic return-to-work plan.' },
      ],
    },
    { id: 'core.occupation', label: 'Occupation', kind: 'text', placeholder: 'e.g. trader, farmer, artisan, student' },
    {
      id: 'core.hand_dominance', label: 'Hand dominance', kind: 'select',
      help: 'Always worth recording; essential for hand and upper-limb procedures.',
      options: [
        { value: 'right', label: 'Right' },
        { value: 'left', label: 'Left' },
        { value: 'ambidextrous', label: 'Ambidextrous' },
      ],
    },
    {
      id: 'core.funding', label: 'How care is paid for', kind: 'select', important: true,
      options: [
        { value: 'nhis', label: 'NHIA / state health insurance' },
        { value: 'hmo', label: 'HMO / private insurance' },
        { value: 'employer', label: 'Employer' },
        { value: 'out_of_pocket', label: 'Out of pocket' },
        { value: 'charity', label: 'Charity / social welfare' },
      ],
    },
    {
      id: 'core.cost_barrier', label: 'Can the patient afford the planned dressings, drugs and procedures?', kind: 'select', important: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'with_difficulty', label: 'With difficulty' },
        { value: 'no', label: 'No', flag: 'amber',
          flagReason: 'Cost is a barrier: involve social work, agree an affordable regimen and give an itemised estimate before committing to treatment.' },
      ],
    },
    {
      id: 'core.distance', label: 'Travel time to this facility', kind: 'select',
      options: [
        { value: 'under_30', label: 'Under 30 minutes' },
        { value: '30_120', label: '30 minutes to 2 hours' },
        { value: 'over_2h', label: 'Over 2 hours', flag: 'amber',
          flagReason: 'Long travel: arrange dressings at the nearest primary health centre with written instructions, and phone / WhatsApp follow-up where safe.' },
      ],
    },
    {
      id: 'core.phone', label: 'Phone access for follow-up', kind: 'select',
      options: [
        { value: 'whatsapp', label: 'Smartphone with WhatsApp (can send photographs)' },
        { value: 'basic', label: 'Basic phone' },
        { value: 'none', label: 'No phone' },
      ],
    },
    {
      id: 'core.traditional_remedies', label: 'Traditional or herbal remedies', kind: 'select', important: true,
      help: 'Ask without judgement: many patients apply herbs, charcoal, toothpaste or hot fomentation to wounds, or take herbal mixtures.',
      options: [
        { value: 'none', label: 'None' },
        { value: 'past', label: 'In the past, not now' },
        { value: 'topical', label: 'Currently applied to the wound', flag: 'amber',
          flagReason: 'Topical traditional preparations contaminate wounds and delay healing: explain why to stop, without blame.' },
        { value: 'oral', label: 'Currently taken by mouth', flag: 'amber',
          flagReason: 'Herbal medicines can interact with anaesthetic drugs and affect bleeding: record what they are and stop before surgery.' },
      ],
    },
    {
      id: 'core.blood_acceptance', label: 'Would the patient accept a blood transfusion if needed?', kind: 'select',
      options: [
        { value: 'accepts', label: 'Accepts' },
        { value: 'declines', label: 'Declines (e.g. religious belief)', flag: 'amber',
          flagReason: 'Declines blood: record exactly which products are refused, optimise Hb before surgery and plan blood conservation.' },
        { value: 'unsure', label: 'Unsure — to discuss' },
      ],
    },
    {
      id: 'core.language', label: 'Preferred language', kind: 'select', important: true,
      options: [
        { value: 'english', label: 'English' },
        { value: 'pidgin', label: 'Nigerian Pidgin' },
        { value: 'hausa', label: 'Hausa' },
        { value: 'yoruba', label: 'Yoruba' },
        { value: 'igbo', label: 'Igbo' },
        { value: 'other', label: 'Other' },
      ],
      allowOther: true,
    },
    {
      id: 'core.interpreter_needed', label: 'Needs an interpreter for consent', kind: 'boolean',
      flagWhenTrue: { level: 'amber', reason: 'Use a trained interpreter for consent — not a family member where avoidable — and record their name.' },
    },
  ],
};
