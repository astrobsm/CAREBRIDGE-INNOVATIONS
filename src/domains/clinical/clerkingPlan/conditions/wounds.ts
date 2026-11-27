/**
 * Wounds, ulcers, pressure injuries, soft-tissue infection and burn
 * contractures. The wound clinic protocol (baseline panel, targeted tests,
 * micronutrients, monitoring) is applied by the rules plan to every template
 * marked woundProtocol; these templates add what is specific to the
 * condition, and report the protocol's "situations" through woundSignals.
 */
import type { ConditionContext, ConditionTemplate, TemplateLine } from './types';
import { P, YNU, counselAll, exMulti, exSel, followUp, inv, list, monitor, multi, numQ, problem, proc, refer, sel } from './kit';
import { weightDose, doseText } from '../dosing';

const area = (c: ConditionContext, p: string) => {
  const l = c.num(`${p}length`), w = c.num(`${p}width`);
  return l && w ? Math.round(l * w * 10) / 10 : null;
};
const sizeQs = (p: string) => [
  numQ(`${p}length`, 'Length', 'cm'), numQ(`${p}width`, 'Width', 'cm'), numQ(`${p}depth`, 'Depth', 'cm'),
];

// ── Chronic wound / leg ulcer ──────────────────────────────────────────────
export const CHRONIC_WOUND: ConditionTemplate = {
  id: 'chronic_wound', label: 'Chronic wound / leg ulcer', group: 'Wounds', prefix: 'cw_',
  synonyms: ['chronic wound', 'leg ulcer', 'non-healing ulcer', 'venous ulcer', 'sickle cell ulcer', 'tropical ulcer', 'chronic ulcer'],
  complaintIds: ['chronic_ulcer', 'leg_ulcer', 'wound_infection', 'wound_dehiscence', 'burn_wound_old', 'ulcer_in_scar'],
  woundProtocol: true,
  history: {
    id: 'cond_chronic_wound', title: 'Wound clinic history',
    questions: [
      sel('cw_duration', 'How long has it been open', ['Under 4 weeks', '1–3 months', '3–12 months', 'Over 1 year'], { redFlags: [] }),
      sel('cw_cause', 'Likely cause (working)', ['Venous', 'Arterial / ischaemic', 'Sickle cell', 'Pressure', 'Trauma that failed to heal', 'Burn / old burn scar', 'Surgical wound breakdown', 'Infection (Buruli / tropical)', 'Unknown']),
      multi('cw_venous', 'Venous features', ['Varicose veins', 'Ankle swelling', 'Previous DVT', 'Long hours standing', 'None']),
      multi('cw_arterial', 'Arterial features', ['Calf pain on walking', 'Rest / night pain', 'Cold foot', 'Smoker', 'None'], { redFlags: ['Rest / night pain'] }),
      multi('cw_atypical', 'Atypical features', ['Multiple painful ulcers', 'Purple / undermined edge', 'Rash / purpura', 'Joint pains / mouth ulcers', 'None'], { redFlags: ['Multiple painful ulcers', 'Purple / undermined edge'] }),
      sel('cw_recurrence', 'Healed and broken down before', YNU),
      sel('cw_dressing_cost', 'Can afford regular dressings / visits', ['Yes', 'With difficulty', 'No']),
      sel('cw_zinc_long', 'Already on zinc for over 3 months', YNU),
    ],
  },
  exam: {
    id: 'cond_chronic_wound_exam', title: 'Wound measurement and examination',
    questions: [
      ...sizeQs('cw_ex_'),
      exSel('cw_ex_tissue', 'Wound bed tissue', ['Granulation (red)', 'Slough (yellow)', 'Necrotic (black)', 'Epithelialising (pink)', 'Mixed']),
      exSel('cw_ex_exudate', 'Exudate', ['None / low', 'Moderate', 'Heavy']),
      exSel('cw_ex_edge', 'Edge', ['Flat / sloping', 'Rolled / heaped / everted', 'Undermined', 'Punched out']),
      exMulti('cw_ex_infection', 'Signs of infection', ['None', 'Spreading redness over 2 cm', 'Warmth / swelling', 'Pus', 'Offensive smell', 'Increasing pain', 'Friable granulation'], { redFlags: ['Spreading redness over 2 cm', 'Pus'] }),
      exSel('cw_ex_bone', 'Bone / tendon exposed or probe-to-bone', ['No', 'Yes'], { redFlags: ['Yes'] }),
      exSel('cw_ex_pulses', 'Foot pulses (dorsalis pedis / posterior tibial)', ['Both palpable', 'Weak / one absent', 'Both absent'], { redFlags: ['Both absent'] }),
      numQ('cw_ex_abpi', 'ABPI (if measured)', ''),
      exSel('cw_ex_skin', 'Surrounding skin', ['Normal', 'Venous eczema / haemosiderin / lipodermatosclerosis', 'Shiny, hairless (arterial)', 'Macerated', 'Old burn scar']),
    ],
  },
  classification: { name: 'TIME framework for wound bed preparation', source: 'Schultz GS, Sibbald RG, Falanga V, et al. Wound bed preparation: a systematic approach to wound management. Wound Repair Regen. 2003;11 Suppl 1:S1-28.' },
  sources: ['AstroHEALTH Wound Clinic Protocol (26 Nov 2026).', 'Schultz GS et al. Wound Repair Regen. 2003;11 Suppl 1:S1-28 (TIME).', 'SIGN 120. Management of chronic venous leg ulcers (2010).'],
  woundSignals: c => {
    const l = c.num('cw_ex_length'), w = c.num('cw_ex_width');
    return {
      infected: c.is('cw_ex_infection', 'Spreading redness over 2 cm', 'Warmth / swelling', 'Pus', 'Offensive smell', 'Increasing pain', 'Friable granulation'),
      boneInvolved: c.is('cw_ex_bone', 'Yes'),
      legOrFootUlcer: true,
      venousSuspected: c.is('cw_cause', 'Venous') || c.is('cw_venous', 'Varicose veins', 'Ankle swelling', 'Previous DVT') || c.is('cw_ex_skin', 'Venous eczema / haemosiderin / lipodermatosclerosis'),
      biopsyIndicated: c.is('cw_duration', '3–12 months', 'Over 1 year') || c.is('cw_ex_edge', 'Rolled / heaped / everted') || c.is('cw_cause', 'Burn / old burn scar') || c.is('cw_ex_skin', 'Old burn scar') || c.is('cw_atypical', 'Purple / undermined edge'),
      vasculitisSuspected: c.is('cw_atypical', 'Multiple painful ulcers', 'Rash / purpura', 'Joint pains / mouth ulcers'),
      copperSuspected: c.is('cw_zinc_long', 'Yes'),
      largeExudingWound: c.is('cw_ex_exudate', 'Heavy') || (l != null && w != null && l * w >= 25),
      largeOrDeep: (l != null && w != null && l * w >= 25) || (c.num('cw_ex_depth') ?? 0) >= 1 || c.is('cw_ex_bone', 'Yes'),
    };
  },
  plan: c => {
    const L = P.conditions.chronic_wound;
    const a = area(c, 'cw_ex_');
    const abpi = c.num('cw_ex_abpi');
    const ischaemic = c.is('cw_ex_pulses', 'Both absent') || c.is('cw_arterial', 'Rest / night pain') || (abpi != null && abpi < 0.8);
    const venous = c.is('cw_cause', 'Venous') || c.is('cw_ex_skin', 'Venous eczema / haemosiderin / lipodermatosclerosis');
    const out: TemplateLine[] = [
      problem('cw', `Chronic wound: ${[c.a('cw_cause') && `${c.a('cw_cause')} (working)`, c.a('cw_duration'), a ? `${a} cm² (baseline)` : 'baseline area not measured'].filter(Boolean).join(' · ')}`, { patient: L.name }),
      proc('cw_debride', 'Wound bed preparation (TIME): sharp / mechanical debridement of slough and necrosis; manage moisture and edge', 'Slough / necrosis / stalled edge', { procedureReviewModuleId: 'wound_care_review', patient: L.options.debridement }),
      ...counselAll('cw', L.counselling),
    ];
    if (venous && !ischaemic) out.push(proc('cw_compression', abpi != null ? `Compression therapy (ABPI ${abpi}: full compression only if ABPI 0.8–1.3)` : 'Compression therapy ONLY after ABPI is measured (protocol: ABPI before compression)', 'Venous ulcer', { patient: L.options.compression }));
    if (ischaemic) out.push(refer('cw_vascular', 'Vascular surgery: arterial Doppler / angiography; no compression', 'Absent pulses, rest pain or ABPI below 0.8', { urgency: 'soon' }));
    out.push(proc('cw_close', 'Once the bed is clean and granulating: split-thickness skin graft or flap; NPWT to prepare the bed where available', 'Large clean wound', { procedureReviewModuleId: 'skin_graft', patient: L.options.closure }));
    return out;
  },
};

// ── Diabetic foot ─────────────────────────────────────────────────────────
export const DIABETIC_FOOT: ConditionTemplate = {
  id: 'diabetic_foot', label: 'Diabetic foot ulcer / infection', group: 'Wounds', prefix: 'df_',
  synonyms: ['diabetic foot', 'DFU', 'diabetic foot ulcer', 'diabetic foot infection', 'diabetic gangrene'],
  complaintIds: ['foot_ulcer'],
  woundProtocol: true,
  history: {
    id: 'cond_diabetic_foot', title: 'Diabetic foot history',
    questions: [
      sel('df_duration', 'How long has the ulcer been open', ['Under 2 weeks', '2–6 weeks', '6 weeks–3 months', 'Over 3 months']),
      sel('df_cause', 'How it started', ['Ill-fitting shoe / blister', 'Barefoot injury', 'Burn (hot water / fire)', 'Nail cutting', 'Spontaneous', 'Unknown']),
      sel('df_sensation', 'Feels the ulcer / numb feet', ['Normal feeling', 'Numb feet (neuropathy)', 'Unknown']),
      sel('df_previous', 'Previous ulcer or amputation', ['None', 'Previous ulcer', 'Previous minor amputation', 'Previous major amputation']),
      sel('df_glucose_control', 'Recent glucose control', ['Good', 'Poor', 'Not checked', 'Newly diagnosed']),
      sel('df_walking', 'Still walking on the foot', ['Yes', 'Reduced', 'Off-loading already']),
      sel('df_systemic', 'Fever, rigors, vomiting or confusion', YNU, { redFlags: ['Yes'] }),
    ],
  },
  exam: {
    id: 'cond_diabetic_foot_exam', title: 'Diabetic foot examination',
    questions: [
      ...sizeQs('df_ex_'),
      exSel('df_ex_site', 'Site', ['Forefoot / toes', 'Midfoot', 'Hindfoot / heel']),
      exSel('df_ex_iwgdf', 'Infection (IWGDF/IDSA 2023)', ['1 — uninfected', '2 — mild (skin / subcutaneous, erythema 0.5–2 cm)', '3 — moderate (erythema over 2 cm or deeper tissue)', '3(O) — with osteomyelitis', '4 — severe (systemic features / SIRS)'],
        { redFlags: ['4 — severe (systemic features / SIRS)'] }),
      exSel('df_ex_probe', 'Probe-to-bone', ['Negative', 'Positive'], { redFlags: ['Positive'] }),
      exSel('df_ex_pulses', 'Foot pulses', ['Both palpable', 'One palpable', 'None palpable'], { redFlags: ['None palpable'] }),
      exSel('df_ex_monofilament', '10 g monofilament sensation', ['Intact', 'Lost (neuropathy)']),
      exSel('df_ex_gangrene', 'Gangrene', ['None', 'Dry gangrene of a toe', 'Wet / spreading gangrene'], { redFlags: ['Wet / spreading gangrene'] }),
      exSel('df_ex_crepitus', 'Crepitus / gas, or necrotising features', ['None', 'Present'], { redFlags: ['Present'] }),
      exSel('df_ex_charcot', 'Hot, swollen, deformed foot (Charcot)', ['No', 'Yes']),
    ],
  },
  classification: { name: 'IWGDF/IDSA infection grade (2023); SINBAD', source: 'Senneville É, Albalawi Z, van Asten SA, et al. IWGDF/IDSA guidelines on the diagnosis and treatment of diabetes-related foot infections (IWGDF/IDSA 2023). Clin Infect Dis. 2023; Diabetes Metab Res Rev. 2024;40(3):e3687. Ince P, et al. Use of the SINBAD classification system and score. Diabetes Care. 2008;31(5):964-967.' },
  sources: ['IWGDF/IDSA 2023 diabetes-related foot infection guideline.', 'IWGDF Practical Guidelines on the prevention and management of diabetes-related foot disease (2023).', 'Ince P et al. Diabetes Care. 2008;31(5):964-967 (SINBAD).', 'AstroHEALTH Wound Clinic Protocol (26 Nov 2026).'],
  woundSignals: c => ({
    infected: !c.is('df_ex_iwgdf', '1 — uninfected') && c.has('df_ex_iwgdf') && !c.is('df_ex_iwgdf', 'Not examined'),
    febrile: c.is('df_systemic', 'Yes'),
    boneInvolved: c.is('df_ex_probe', 'Positive') || c.is('df_ex_iwgdf', '3(O) — with osteomyelitis'),
    diabeticFootNonHealing: c.is('df_duration', '6 weeks–3 months', 'Over 3 months'),
    legOrFootUlcer: true,
    biopsyIndicated: c.is('df_duration', 'Over 3 months'),
    largeOrDeep: c.is('df_ex_probe', 'Positive') || (c.num('df_ex_depth') ?? 0) >= 1,
  }),
  plan: c => {
    const L = P.conditions.diabetic_foot;
    const grade = String(c.a('df_ex_iwgdf') ?? '');
    const severe = grade.startsWith('4') || c.is('df_ex_crepitus', 'Present') || c.is('df_ex_gangrene', 'Wet / spreading gangrene') || c.is('df_systemic', 'Yes');
    const moderate = grade.startsWith('3');
    const mild = grade.startsWith('2');
    const ischaemic = c.is('df_ex_pulses', 'None palpable');
    const w = c.facts.weightKg;
    const a = area(c, 'df_ex_');
    const out: TemplateLine[] = [
      problem('df', `Diabetic foot ulcer: ${[c.a('df_ex_site'), a ? `${a} cm²` : null, grade ? `IWGDF ${grade.split(' —')[0]}` : 'infection grade not documented', ischaemic ? 'ischaemic' : null].filter(Boolean).join(' · ')}`, { patient: L.name, urgency: severe ? 'urgent' : moderate ? 'soon' : 'routine' }),
      proc('df_offload', 'Off-loading: non-removable knee-high device (total contact cast / irremovable walker) for plantar forefoot ulcers without severe ischaemia or infection; otherwise removable device / crutches', 'Off-loading is the single most important treatment (IWGDF 2023)', { patient: L.options.offloading }),
      proc('df_debride', 'Sharp debridement of callus, slough and necrosis at each visit', 'IWGDF 2023', { procedureReviewModuleId: 'diabetic_foot_debridement', patient: L.options.debridement }),
      refer('df_diabetes', 'Diabetes / medical team: glycaemic control (target HbA1c below 7% where safe — protocol)', 'Glucose control drives healing and infection', { urgency: severe ? 'urgent' : 'soon' }),
      monitor('df_glucose', 'Capillary glucose log daily (more often if infected)'),
      ...counselAll('df', L.counselling),
    ];
    if (severe) {
      out.push(proc('df_urgent', 'Admit: urgent surgical debridement / drainage, IV broad-spectrum antibiotics after deep tissue samples, glucose and fluid management; amputation if non-salvageable', 'Severe infection, gas, wet gangrene or systemic features', { urgency: 'urgent', procedureReviewModuleId: 'diabetic_foot_debridement', patient: L.options.amputation }));
      out.push({ id: 'med:df_iv', section: 'medications', text: 'IV antibiotics for severe diabetic foot infection, per local guideline (e.g. piperacillin-tazobactam, or ceftriaxone + metronidazole; add MRSA cover if risk), adjusted to deep tissue culture',
        why: 'IWGDF/IDSA grade 4', urgency: 'urgent',
        medication: { drug: 'Broad-spectrum IV antibiotic per local guideline', dose: 'per local guideline / renal function', route: 'IV', frequency: 'per drug', duration: 'review at 48–72 h with culture; usually 1–2 weeks for soft tissue', cautions: [c.facts.penicillinAllergy ? 'PENICILLIN ALLERGY recorded: avoid piperacillin-tazobactam.' : 'Check allergies.', 'Adjust for eGFR.'] },
        patient: P.medicines.dripAntibiotic() });
    } else if (moderate || mild) {
      const drug = c.facts.penicillinAllergy ? 'Clindamycin' : 'Co-amoxiclav (amoxicillin / clavulanic acid)';
      out.push({ id: 'med:df_oral', section: 'medications', text: `${drug} for ${mild ? 'mild' : 'moderate'} diabetic foot infection (after deep tissue sample)`, why: `IWGDF/IDSA grade ${grade.split(' —')[0]}: treat only clinically infected ulcers`,
        medication: { drug, dose: c.facts.penicillinAllergy ? '300–450 mg' : '625 mg', route: moderate ? 'oral, or IV if not improving' : 'oral', frequency: c.facts.penicillinAllergy ? 'every 6 hours' : 'three times a day', duration: mild ? '1–2 weeks' : '2–3 weeks (longer if osteomyelitis)',
          cautions: ['Adjust to culture results.', ...(c.facts.penicillinAllergy ? ['Penicillin allergy recorded.'] : [])] },
        patient: c.facts.penicillinAllergy
          ? P.medicines.clindamycin({ child: c.facts.isChild, dose: c.facts.isChild ? null : '300–450 mg', duration: mild ? 'for 1–2 weeks' : 'for 2–3 weeks' })
          : P.medicines.coamoxiclav({ child: c.facts.isChild, duration: mild ? 'for 1–2 weeks' : 'for 2–3 weeks' }) });
    } else {
      out.push({ id: 'med:df_noabx', section: 'medications', text: 'No antibiotics for an uninfected ulcer', why: 'IWGDF/IDSA 2023: do not treat uninfected ulcers with antibiotics', medication: { drug: 'No antibiotic', dose: '-', route: '-', frequency: '-', duration: '-', cautions: [] } });
    }
    if (ischaemic) out.push(refer('df_vascular', 'Vascular surgery: revascularisation assessment (toe pressures / Doppler / angiography)', 'No palpable pulses', { urgency: 'soon' }));
    if (c.is('df_ex_charcot', 'Yes')) out.push(proc('df_charcot', 'Suspected active Charcot foot: immobilise in a non-removable cast, X-ray / MRI, specialist foot team', 'Hot swollen foot in a person with neuropathy', { urgency: 'soon' }));
    out.push(followUp('df_weekly', 'Every 1–2 weeks', 'Debridement, off-loading check, infection review', 7, { patient: 'Wound care and a check of your foot' }));
    if (w == null) out.push(monitor('df_weight', 'Record weight (drug doses and nutrition targets need it)'));
    return out;
  },
};

// ── Pressure injury ───────────────────────────────────────────────────────
export const PRESSURE_INJURY: ConditionTemplate = {
  id: 'pressure_injury', label: 'Pressure injury', group: 'Wounds', prefix: 'pi_',
  synonyms: ['pressure injury', 'pressure ulcer', 'bed sore', 'sacral sore', 'decubitus'],
  complaintIds: ['pressure_sore'],
  woundProtocol: true,
  history: {
    id: 'cond_pressure_injury', title: 'Pressure injury history',
    questions: [
      sel('pi_cause', 'Cause of immobility', ['Spinal cord injury', 'Stroke', 'Frailty / old age', 'Prolonged admission / ICU', 'Fracture / traction', 'Other']),
      sel('pi_turning', 'Turning / repositioning at home', ['Every 2 hours', 'Irregular', 'Not done']),
      sel('pi_surface', 'Mattress / cushion', ['Pressure-relieving', 'Ordinary mattress', 'Unknown']),
      sel('pi_continence', 'Continence', ['Continent', 'Urinary incontinence', 'Faecal incontinence', 'Both', 'Catheter']),
      sel('pi_carer', 'Carer available for turning and dressings', ['Yes', 'Limited', 'No']),
      sel('pi_spasticity', 'Spasms / contractures', YNU),
    ],
  },
  exam: {
    id: 'cond_pressure_injury_exam', title: 'Pressure injury examination',
    questions: [
      exSel('pi_ex_site', 'Site', ['Sacrum', 'Ischium', 'Trochanter', 'Heel', 'Occiput', 'Other']),
      exSel('pi_ex_stage', 'NPIAP stage', ['Stage 1 — non-blanchable erythema, intact skin', 'Stage 2 — partial thickness, exposed dermis', 'Stage 3 — full thickness skin loss', 'Stage 4 — exposed bone, tendon or muscle', 'Unstageable — obscured by slough / eschar', 'Deep tissue pressure injury']),
      ...sizeQs('pi_ex_'),
      exSel('pi_ex_undermining', 'Undermining / tunnelling', ['None', 'Present']),
      exMulti('pi_ex_infection', 'Signs of infection', ['None', 'Spreading redness', 'Pus', 'Offensive smell', 'Increasing pain'], { redFlags: ['Spreading redness', 'Pus'] }),
      exSel('pi_ex_other_areas', 'Other pressure areas', ['Intact', 'Other areas at stage 1 or worse']),
    ],
  },
  classification: { name: 'NPIAP pressure injury staging (2016)', source: 'Edsberg LE, Black JM, Goldberg M, et al. Revised National Pressure Ulcer Advisory Panel pressure injury staging system. J Wound Ostomy Continence Nurs. 2016;43(6):585-597.' },
  sources: ['Edsberg LE et al. J Wound Ostomy Continence Nurs. 2016;43(6):585-597.', 'EPUAP/NPIAP/PPPIA. Prevention and Treatment of Pressure Ulcers/Injuries: Clinical Practice Guideline (2019).', 'AstroHEALTH Wound Clinic Protocol (26 Nov 2026).'],
  woundSignals: c => {
    const stage = String(c.a('pi_ex_stage') ?? '');
    const deep = /^Stage [34]|^Unstageable|^Deep/.test(stage);
    return {
      infected: c.is('pi_ex_infection', 'Spreading redness', 'Pus', 'Offensive smell', 'Increasing pain'),
      boneInvolved: stage.startsWith('Stage 4'),
      pressureInjuryStage2Plus: /^Stage [234]|^Unstageable|^Deep/.test(stage),
      largeOrDeep: deep,
      largeExudingWound: deep,
      biopsyIndicated: false,
    };
  },
  plan: c => {
    const L = P.conditions.pressure_injury;
    const stage = String(c.a('pi_ex_stage') ?? '');
    const deep = /^Stage [34]|^Unstageable/.test(stage);
    const a = area(c, 'pi_ex_');
    const out: TemplateLine[] = [
      problem('pi', `Pressure injury: ${[c.a('pi_ex_site'), stage ? stage.split(' —')[0] : 'stage not documented', a ? `${a} cm²` : null].filter(Boolean).join(' · ')}`, { patient: L.name }),
      proc('pi_offload', 'Pressure redistribution: reposition at least every 2 hours, pressure-redistributing mattress / cushion, heel off-loading', 'Pressure relief is the basis of healing (EPUAP/NPIAP 2019)'),
      proc('pi_debride', deep ? 'Sharp debridement of slough / necrosis (except stable dry heel eschar)' : 'Moist wound healing dressings', 'NPIAP stage', { procedureReviewModuleId: 'wound_care_review', patient: L.options.debridement }),
      ...counselAll('pi', L.counselling),
      monitor('pi_skin', 'Skin inspection of all pressure areas daily (carer) and at every visit'),
    ];
    if (c.is('pi_continence', 'Urinary incontinence', 'Faecal incontinence', 'Both')) out.push(proc('pi_continence', 'Continence management and barrier creams; consider catheter / faecal management for a sacral wound', 'Moisture-associated damage'));
    if (deep) out.push(proc('pi_flap', 'Stage 3–4 not healing with good care: flap reconstruction once nutrition, spasticity, continence and pressure relief are controlled', 'Deep pressure injury', { procedureReviewModuleId: 'pressure_sore_flap', patient: L.options.flap }));
    if (stage.startsWith('Stage 4')) out.push(inv('pi_xray', 'X-ray (MRI if available) of the underlying bone; bone biopsy if osteomyelitis suspected', 'Exposed bone', { testId: 'xray' }));
    if (c.is('pi_carer', 'Limited', 'No')) out.push(refer('pi_social', 'Home care support: carer training for turning and dressings', 'Limited carer support'));
    return out;
  },
};

// ── Cellulitis / abscess ───────────────────────────────────────────────────
export const CELLULITIS_ABSCESS: ConditionTemplate = {
  id: 'cellulitis_abscess', label: 'Cellulitis / abscess', group: 'Wounds', prefix: 'cel_',
  synonyms: ['cellulitis', 'abscess', 'boil', 'furuncle', 'carbuncle', 'erysipelas', 'skin infection'],
  complaintIds: ['cellulitis', 'abscess'],
  history: {
    id: 'cond_cellulitis_abscess', title: 'Skin infection details',
    questions: [
      sel('cel_onset', 'How fast it spread', ['Over days', 'Over hours (rapid)'], { redFlags: ['Over hours (rapid)'] }),
      sel('cel_portal', 'Entry point', ['Cut / wound', 'Insect bite', 'Fungal toe-web infection', 'Injection site', 'None found']),
      sel('cel_pain_severe', 'Pain out of proportion to what is seen', YNU, { redFlags: ['Yes'] }),
      sel('cel_recurrent', 'Previous episodes in the same limb', ['None', 'Once', 'Two or more']),
      sel('cel_antibiotics', 'Antibiotics already taken', ['None', 'Oral, under 48 h', 'Oral, over 48 h without improvement']),
    ],
  },
  exam: {
    id: 'cond_cellulitis_abscess_exam', title: 'Skin infection examination',
    questions: [
      exSel('cel_ex_eron', 'Eron class', ['I — no systemic toxicity or uncontrolled comorbidity', 'II — systemically unwell or comorbidity that may delay resolution', 'III — significant systemic upset (acute confusion, tachycardia, hypotension) or limb-threatening', 'IV — sepsis or necrotising infection'], { redFlags: ['III — significant systemic upset (acute confusion, tachycardia, hypotension) or limb-threatening', 'IV — sepsis or necrotising infection'] }),
      exSel('cel_ex_abscess', 'Fluctuant collection (abscess)', ['None', 'Present']),
      numQ('cel_ex_redness', 'Extent of redness (largest diameter)', 'cm'),
      exMulti('cel_ex_nec', 'Necrotising infection features', ['None', 'Skin necrosis / bullae', 'Crepitus', 'Woody induration beyond the redness', 'Anaesthesia over the area'], { redFlags: ['Skin necrosis / bullae', 'Crepitus', 'Woody induration beyond the redness', 'Anaesthesia over the area'] }),
      exSel('cel_ex_margin', 'Margin of redness marked with a pen', ['Yes', 'No']),
    ],
  },
  classification: { name: 'Eron classification of skin and soft-tissue infection', source: 'Eron LJ, Lipsky BA, Low DE, et al. Managing skin and soft tissue infections: expert panel recommendations on key decision points. J Antimicrob Chemother. 2003;52 Suppl 1:i3-17.' },
  sources: ['Stevens DL, Bisno AL, Chambers HF, et al. Practice guidelines for the diagnosis and management of skin and soft tissue infections: 2014 update by the IDSA. Clin Infect Dis. 2014;59(2):e10-52.', 'NICE NG141. Cellulitis and erysipelas: antimicrobial prescribing (2019).', 'Eron LJ et al. J Antimicrob Chemother. 2003;52 Suppl 1:i3-17.'],
  woundSignals: c => ({ infected: true, febrile: c.facts.febrile }),
  plan: c => {
    const L = P.conditions.cellulitis_abscess;
    const eron = String(c.a('cel_ex_eron') ?? '');
    const nec = c.is('cel_ex_nec', 'Skin necrosis / bullae', 'Crepitus', 'Woody induration beyond the redness', 'Anaesthesia over the area') || c.is('cel_pain_severe', 'Yes') || eron.startsWith('IV');
    const abscess = c.is('cel_ex_abscess', 'Present');
    const redness = c.num('cel_ex_redness');
    const cellulitis = !abscess || (redness != null && redness >= 5) || c.facts.febrile || eron.startsWith('II') || eron.startsWith('III');
    const w = c.facts.weightKg;
    const out: TemplateLine[] = [
      problem('cel', `${abscess ? 'Abscess' : 'Cellulitis'}${abscess && cellulitis ? ' with surrounding cellulitis' : ''}${eron ? ` · Eron ${eron.split(' —')[0]}` : ''}${nec ? ' — NECROTISING INFECTION SUSPECTED' : ''}`, { patient: L.name, urgency: nec ? 'urgent' : 'soon' }),
      monitor('cel_margin', 'Mark the margin of redness; review spread, temperature and pulse at 48–72 h'),
      ...counselAll('cel', L.counselling),
      followUp('cel_review', 'In 48–72 hours', 'Review response to treatment', 2, { patient: 'A check that the infection is getting better' }),
    ];
    if (nec) {
      out.push(proc('cel_nec', 'Suspected necrotising soft-tissue infection: emergency surgical exploration and debridement, IV broad-spectrum antibiotics, resuscitation — do not delay for imaging', 'Necrotising features / pain out of proportion / sepsis', { urgency: 'urgent', procedureReviewModuleId: 'necrotising_soft_tissue_infection' }));
      out.push(inv('cel_bloods', 'FBC, U&E, CRP, glucose, lactate, blood cultures (LRINEC as an adjunct, not to exclude)', 'Severity and sepsis', { testId: 'fbc', analytes: ['wbc', 'hb', 'crp', 'na', 'creatinine', 'glucose', 'lactate'], urgency: 'urgent' }));
    }
    if (abscess) out.push(
      proc('cel_drain', 'Incision and drainage (with loculi broken down); pack only if large; send pus for culture', 'Fluctuant abscess: drainage is the treatment (IDSA 2014)', { urgency: 'soon', patient: L.options.drainage }),
      inv('cel_pus', 'Pus for Gram stain, culture and sensitivity', 'Guides antibiotics if needed; MRSA', { testId: 'culture' }),
    );
    if (c.facts.diabetes || c.facts.febrile) out.push(inv('cel_glucose', 'Blood glucose', 'Diabetes / sepsis', { testId: 'glucose_hba1c', analytes: ['glucose', 'hba1c'] }));
    if (cellulitis && !nec) {
      const pen = c.facts.penicillinAllergy;
      const child = c.facts.isChild;
      const drug = pen ? 'Clindamycin' : 'Flucloxacillin';
      const childDose = child && w ? weightDose(pen ? { perKg: { low: 3, high: 6 }, weightKg: w, adultDose: 450 } : { perKg: { low: 12.5, high: 25 }, weightKg: w, adultDose: 1000 }) : null;
      const iv = eron.startsWith('III');
      out.push({ id: 'med:cel_abx', section: 'medications', text: `${drug} for cellulitis${iv ? ' (IV for Eron III)' : ''}`, why: abscess ? 'Cellulitis around the abscess / systemic features' : 'Spreading cellulitis (NICE NG141; IDSA 2014)',
        medication: { drug, dose: childDose ? doseText(childDose) : pen ? '300–450 mg' : '500 mg–1 g', route: iv ? 'IV' : 'oral', frequency: 'every 6 hours', duration: '5–7 days, then review', weightBasis: childDose?.basis,
          cautions: pen ? ['Penicillin allergy recorded: clindamycin chosen; watch for diarrhoea (C. difficile).'] : ['Confirm no penicillin allergy before giving.', 'Take flucloxacillin on an empty stomach.'] },
        urgency: iv ? 'urgent' : 'soon',
        patient: (pen ? P.medicines.clindamycin : P.medicines.flucloxacillin)({ child, dose: childDose ? doseText(childDose) : pen ? '300–450 mg' : null, duration: iv ? 'for 5–7 days in all' : 'for 5–7 days', drip: iv }) });
    } else if (abscess && !cellulitis) {
      out.push({ id: 'med:cel_noabx', section: 'medications', text: 'Antibiotics not routinely needed after drainage of a simple abscess without cellulitis or systemic features', why: 'IDSA 2014', medication: { drug: 'No antibiotic', dose: '-', route: '-', frequency: '-', duration: '-', cautions: ['Give antibiotics if surrounding cellulitis, systemic features, immunosuppression or a site that is hard to drain.'] } });
    }
    if (c.is('cel_portal', 'Fungal toe-web infection')) out.push({ id: 'med:cel_fungal', section: 'medications', text: 'Treat toe-web fungal infection (topical antifungal, e.g. clotrimazole 1% cream twice daily for 2–4 weeks)', why: 'Portal of entry for recurrent cellulitis',
      medication: { drug: 'Clotrimazole 1% cream', dose: 'thin layer', route: 'topical', frequency: 'twice a day', duration: '2–4 weeks', cautions: [] }, patient: P.medicines.clotrimazole() });
    if (c.is('cel_recurrent', 'Two or more')) out.push(refer('cel_recurrent', 'Recurrent cellulitis: look for lymphoedema / venous disease / tinea; consider prophylaxis per guideline', 'Two or more episodes'));
    return out;
  },
};

// ── Burn contracture ───────────────────────────────────────────────────────
export const BURN_CONTRACTURE: ConditionTemplate = {
  id: 'burn_contracture', label: 'Burn scar contracture', group: 'Scars and burns', prefix: 'bc_',
  synonyms: ['burn contracture', 'post-burn contracture', 'contracture', 'mentosternal contracture', 'burn scar'],
  complaintIds: ['burn_contracture', 'scar_contracture'],
  history: {
    id: 'cond_burn_contracture', title: 'Contracture history',
    questions: [
      sel('bc_burn_age', 'Time since the burn', ['Under 6 months', '6–12 months', '1–5 years', 'Over 5 years']),
      multi('bc_sites', 'Sites', ['Neck', 'Axilla', 'Elbow', 'Wrist / hand', 'Fingers', 'Groin / hip', 'Knee', 'Ankle / foot', 'Face / eyelids / mouth']),
      multi('bc_function', 'Function lost', ['Cannot look up / turn the neck', 'Cannot raise the arm', 'Cannot straighten the elbow / knee', 'Cannot open the hand / grip', 'Cannot close the eyes', 'Cannot open the mouth fully', 'Walking', 'Appearance only']),
      sel('bc_breakdown', 'Recurrent breakdown / non-healing ulcer in the scar', YNU, { redFlags: ['Yes'] }),
      sel('bc_therapy', 'Splints / physiotherapy / pressure garments so far', ['None', 'Some', 'Regular']),
      sel('bc_growing', 'Child still growing (contracture tethering growth)', ['Yes', 'No', 'Not applicable']),
    ],
  },
  exam: {
    id: 'cond_burn_contracture_exam', title: 'Contracture examination',
    questions: [
      exSel('bc_ex_joint', 'Most limiting joint', ['Neck', 'Axilla / shoulder', 'Elbow', 'Wrist', 'Fingers (MCP / IP)', 'Hip', 'Knee', 'Ankle', 'Eyelid / mouth']),
      numQ('bc_ex_rom', 'Range of motion lost at that joint (approximate)', '%'),
      exSel('bc_ex_band', 'Scar type', ['Linear band', 'Broad band / sheet', 'Web across the joint']),
      exSel('bc_ex_onah', 'Neck (Onah classification), if neck', ['I — mild, mentocervical angle preserved', 'II — moderate', 'III — severe, chin tethered', 'IV — mentosternal, chin fused to chest', 'Not applicable']),
      exSel('bc_ex_scar', 'Scar quality', ['Mature, pale, supple', 'Active, red, hypertrophic', 'Unstable / ulcerated'], { redFlags: ['Unstable / ulcerated'] }),
      exSel('bc_ex_deep', 'Deep structures', ['Joint itself mobile under the scar', 'Joint stiff / tendon shortening / dislocation']),
    ],
  },
  classification: { name: 'Descriptive (joint, band type, range lost); Onah classification for post-burn neck contracture', source: 'Onah II. A classification system for postburn mentosternal contractures. Arch Surg. 2005;140(7):671-675.' },
  sources: ['Onah II. Arch Surg. 2005;140(7):671-675.', 'Hudson DA, Renshaw A. An algorithm for the release of burn contractures of the extremities. Burns. 2006;32(6):663-668.'],
  woundSignals: c => ({ biopsyIndicated: c.is('bc_breakdown', 'Yes') || c.is('bc_ex_scar', 'Unstable / ulcerated') }),
  plan: c => {
    const L = P.conditions.burn_contracture;
    const ulcer = c.is('bc_breakdown', 'Yes') || c.is('bc_ex_scar', 'Unstable / ulcerated');
    const active = c.is('bc_ex_scar', 'Active, red, hypertrophic') || c.is('bc_burn_age', 'Under 6 months', '6–12 months');
    const neck = c.is('bc_ex_joint', 'Neck') || list(c.a('bc_sites')).includes('Neck');
    const eyelid = c.is('bc_ex_joint', 'Eyelid / mouth') || c.is('bc_function', 'Cannot close the eyes');
    const out: TemplateLine[] = [
      problem('bc', `Burn contracture: ${[c.a('bc_ex_joint') ?? list(c.a('bc_sites')).join(', '), c.a('bc_ex_band'), c.num('bc_ex_rom') != null ? `${c.num('bc_ex_rom')}% range lost` : null, neck && c.a('bc_ex_onah') && !c.is('bc_ex_onah', 'Not applicable', 'Not examined') ? `Onah ${String(c.a('bc_ex_onah')).split(' —')[0]}` : null].filter(Boolean).join(' · ') || 'not described'}`, { patient: L.name }),
      proc('bc_release', c.is('bc_ex_band', 'Linear band') ? 'Release with Z-plasty / multiple Z-plasties or local flaps' : 'Incisional release and cover: full- or split-thickness graft, local / regional flap (perforator flap where available)',
        active && !eyelid ? 'Ideally once the scar has matured (often 12+ months), unless function, growth or eye exposure demands earlier release' : 'Contracture limiting function',
        { procedureReviewModuleId: 'contracture_release', patient: L.options.release, urgency: eyelid ? 'soon' : 'routine' }),
      refer('bc_physio', 'Physiotherapy / occupational therapy: stretching, splinting, pressure garments before and after release', 'Prevents recurrence', { patient: L.options.therapy }),
      monitor('bc_rom', 'Range of motion (goniometer) at each visit; scar activity; growth in children'),
      followUp('bc_plan', 'In 4–6 weeks', 'Surgical planning, consent and therapy review', 35, { patient: 'A visit to plan the operation' }),
      ...counselAll('bc', L.counselling),
    ];
    if (ulcer) out.push(inv('bc_biopsy', "Wedge biopsy of the ulcer edge (Marjolin's ulcer)", 'Unstable / ulcerated burn scar', { testId: 'biopsy', urgency: 'soon' }));
    if (neck) out.push(refer('bc_anaes', 'Anaesthetic airway assessment before neck release (difficult intubation; awake fibreoptic / release under ketamine or local first)', 'Neck contracture', { urgency: 'soon' }));
    if (eyelid) out.push(proc('bc_eyelid', 'Eyelid release and full-thickness skin graft to protect the cornea', 'Lagophthalmos / ectropion', { urgency: 'soon' }));
    if (c.is('bc_ex_deep', 'Joint stiff / tendon shortening / dislocation')) out.push(inv('bc_xray', 'X-ray of the joint', 'Joint stiffness / subluxation under a long-standing contracture', { testId: 'xray' }));
    return out;
  },
};

export const WOUND_TEMPLATES: ConditionTemplate[] = [CHRONIC_WOUND, DIABETIC_FOOT, PRESSURE_INJURY, CELLULITIS_ABSCESS, BURN_CONTRACTURE];
