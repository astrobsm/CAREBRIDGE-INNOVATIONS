/**
 * Skin and soft-tissue conditions: lumps, keloids, pigmented lesions and
 * vascular anomalies.
 */
import type { ConditionTemplate, TemplateLine } from './types';
import { P, YNU, counselAll, exMulti, exSel, followUp, inv, list, monitor, multi, problem, proc, refer, sel } from './kit';
import { weightDose, doseText } from '../dosing';

// ── Lipoma / epidermoid (sebaceous) cyst ───────────────────────────────────
export const LIPOMA_CYST: ConditionTemplate = {
  id: 'lipoma_cyst', label: 'Lipoma / sebaceous (epidermoid) cyst', group: 'Skin and soft tissue', prefix: 'lc_',
  synonyms: ['lipoma', 'sebaceous cyst', 'epidermoid cyst', 'pilar cyst', 'fatty lump', 'cyst'],
  complaintIds: [], suggestFor: ['lump', 'scalp_lump', 'face_lump'],
  history: {
    id: 'cond_lipoma_cyst', title: 'Lump details',
    questions: [
      sel('lc_duration', 'How long present', ['Under 3 months', '3–12 months', 'Over 1 year', 'Since childhood']),
      sel('lc_growth', 'Growth', ['Static', 'Slow growth', 'Rapid growth (weeks)'], { redFlags: ['Rapid growth (weeks)'] }),
      sel('lc_pain', 'Pain', ['Painless', 'Painful', 'Painful only when inflamed']),
      sel('lc_inflamed', 'Episodes of redness / discharge (cyst infection)', ['Never', 'Once', 'Recurrent', 'Currently inflamed']),
      sel('lc_multiple', 'Several similar lumps', YNU),
      sel('lc_previous', 'Previously excised here', ['No', 'Yes — recurred']),
    ],
  },
  exam: {
    id: 'cond_lipoma_cyst_exam', title: 'Lump examination',
    questions: [
      exSel('lc_ex_size', 'Largest diameter', ['Under 2 cm', '2–5 cm', 'Over 5 cm'], { redFlags: ['Over 5 cm'] }),
      exSel('lc_ex_consistency', 'Consistency', ['Soft, lobulated, slips under the finger (lipoma)', 'Firm, smooth, with punctum (epidermoid cyst)', 'Hard / irregular', 'Fluctuant / tender'], { redFlags: ['Hard / irregular'] }),
      exSel('lc_ex_depth', 'Depth', ['Subcutaneous, mobile', 'Deep to fascia / fixed to muscle'], { redFlags: ['Deep to fascia / fixed to muscle'] }),
      exSel('lc_ex_punctum', 'Punctum', ['Present', 'Absent']),
      exSel('lc_ex_nodes', 'Regional lymph nodes', ['Not enlarged', 'Enlarged']),
    ],
  },
  sources: ['NICE NG12. Suspected cancer: recognition and referral (2015, updated 2023): soft-tissue sarcoma — urgent ultrasound for a lump that is increasing in size.'],
  plan: c => {
    const L = P.conditions.lipoma_cyst;
    const sarcoma = c.is('lc_ex_size', 'Over 5 cm') || c.is('lc_ex_depth', 'Deep to fascia / fixed to muscle') || c.is('lc_growth', 'Rapid growth (weeks)') || c.is('lc_ex_consistency', 'Hard / irregular') || c.is('lc_previous', 'Yes — recurred');
    const cyst = c.is('lc_ex_consistency', 'Firm, smooth, with punctum (epidermoid cyst)') || c.is('lc_ex_punctum', 'Present');
    const inflamed = c.is('lc_inflamed', 'Currently inflamed') || c.is('lc_ex_consistency', 'Fluctuant / tender');
    const out: TemplateLine[] = [
      problem('lc', `${cyst ? 'Epidermoid (sebaceous) cyst' : 'Lipoma (clinical)'}${sarcoma ? ' — features needing imaging to exclude sarcoma' : ''}`, { patient: L.name }),
      ...counselAll('lc', L.counselling),
    ];
    if (sarcoma) out.push(
      inv('lc_uss', 'Ultrasound of the lump; MRI if deep, over 5 cm or indeterminate', 'Size over 5 cm, deep, growing, hard or recurrent: exclude soft-tissue sarcoma before any excision', { testId: 'ultrasound', urgency: 'soon' }),
      refer('lc_sarcoma', 'Discuss at the tumour board / sarcoma-capable centre if imaging is suspicious; core biopsy before excision', 'Sarcoma red flags (NICE NG12)', { urgency: 'soon' }),
    );
    if (inflamed) out.push(proc('lc_drain', 'Inflamed / infected cyst: incision and drainage, then interval excision after 4–6 weeks', 'Excising an acutely inflamed cyst raises recurrence and wound complications', { urgency: 'soon', patient: P.conditions.cellulitis_abscess.options.drainage }));
    out.push(proc('lc_excise', cyst ? 'Excision of the cyst with its punctum (elliptical incision) under local anaesthetic; histology' : 'Excision of the lipoma under local anaesthetic; histology', sarcoma ? 'Only after imaging (and biopsy if indicated)' : 'Symptomatic, cosmetic, or patient choice',
      { procedureReviewModuleId: 'soft_tissue_lesion_excision', patient: L.options.excision }));
    if (!sarcoma) out.push(proc('lc_observe', 'Observation is safe for a small, soft, static subcutaneous lipoma', 'Benign features', { patient: L.options.observe }));
    out.push(followUp('lc_review', sarcoma ? 'In 2 weeks' : 'In 2 weeks after excision', sarcoma ? 'Imaging result and plan' : 'Wound check and histology result', 14, { patient: sarcoma ? 'A visit for your scan result' : 'A wound check and the laboratory result' }));
    return out;
  },
};

// ── Keloid / hypertrophic scar ─────────────────────────────────────────────
export const KELOID: ConditionTemplate = {
  id: 'keloid', label: 'Keloid / hypertrophic scar', group: 'Scars and burns', prefix: 'kel_',
  synonyms: ['keloid', 'hypertrophic scar', 'raised scar', 'ear keloid'],
  complaintIds: ['keloid', 'hypertrophic_scar'],
  history: {
    id: 'cond_keloid', title: 'Keloid details',
    questions: [
      sel('kel_site', 'Site', ['Ear lobe / helix', 'Chest / presternal', 'Shoulder / upper back', 'Jaw / beard area', 'Abdomen (surgical scar)', 'Limb', 'Multiple sites', 'Other']),
      sel('kel_age_scar', 'Age of the scar', ['Under 6 months', '6–12 months', 'Over 1 year']),
      sel('kel_growth', 'Still growing', YNU),
      sel('kel_beyond', 'Spread beyond the original wound', YNU),
      multi('kel_symptoms', 'Symptoms', ['Itching', 'Pain', 'Tenderness', 'Restricted movement', 'Recurrent infection / discharge', 'Appearance only']),
      sel('kel_previous', 'Previous treatment', ['None', 'Steroid injections', 'Excision alone', 'Excision + injections', 'Excision + radiotherapy', 'Silicone / pressure']),
      sel('kel_recurrence', 'Recurred after excision', ['Not applicable', 'No', 'Yes']),
    ],
  },
  exam: {
    id: 'cond_keloid_exam', title: 'Keloid examination',
    questions: [
      exSel('kel_ex_type', 'Clinical type', ['Keloid — beyond the wound margins', 'Hypertrophic — within the wound margins']),
      exSel('kel_ex_size', 'Size', ['Under 1 cm', '1–3 cm', 'Over 3 cm', 'Pedunculated']),
      exSel('kel_ex_activity', 'Activity', ['Red, itchy, growing (active)', 'Pale, static (mature)']),
      exSel('kel_ex_number', 'Number of keloids', ['Single', '2–5', 'Over 5']),
      exSel('kel_ex_ulcer', 'Ulceration or sinus', ['None', 'Ulcerated / discharging'], { redFlags: ['Ulcerated / discharging'] }),
    ],
  },
  classification: { name: 'Keloid vs hypertrophic scar (growth beyond the wound margins)', source: 'Gold MH, Berman B, Clementoni MT, Gauglitz GG, Nahai F, Murcia C. Updated international clinical recommendations on scar management: part 1 and part 2. Dermatol Surg. 2014;40(8):817-835.' },
  sources: ['Gold MH et al. Updated international clinical recommendations on scar management. Dermatol Surg. 2014;40(8):817-835.', 'Ogawa R. Keloid and hypertrophic scars are the result of chronic inflammation in the reticular dermis. Int J Mol Sci. 2017;18(3):606.'],
  plan: c => {
    const L = P.conditions.keloid;
    const keloid = !c.is('kel_ex_type', 'Hypertrophic — within the wound margins');
    const big = c.is('kel_ex_size', 'Over 3 cm', 'Pedunculated');
    const ear = c.is('kel_site', 'Ear lobe / helix');
    const out: TemplateLine[] = [
      problem('kel', `${keloid ? 'Keloid' : 'Hypertrophic scar'}: ${[c.a('kel_site'), c.a('kel_ex_size')].filter(Boolean).join(' · ') || 'site not documented'}${c.is('kel_recurrence', 'Yes') ? ' — recurrent after excision' : ''}`, { patient: L.name }),
      proc('kel_ilt', 'Intralesional triamcinolone acetonide 10–40 mg/mL every 4–6 weeks (first-line; maximum per session per local guideline)', 'First-line for keloids and active hypertrophic scars', { procedureReviewModuleId: 'keloid_management', patient: L.options.injection }),
      proc('kel_silicone', 'Silicone gel or sheet 12+ hours a day for at least 2–3 months', 'Adjunct and after any excision', { patient: L.options.silicone }),
      monitor('kel_measure', 'Size, height, colour and symptoms at each visit (photograph the same way each time); atrophy / hypopigmentation after steroid'),
      followUp('kel_injection', 'Every 4–6 weeks', 'Next steroid injection and review', 35, { patient: 'Your next injection and review' }),
      ...counselAll('kel', L.counselling),
    ];
    if (keloid && (big || ear || c.is('kel_recurrence', 'Yes'))) out.push(proc('kel_excise', 'Excision (intramarginal for large keloids) ALWAYS with adjuvant: post-operative steroid injections, pressure earrings (ear) or radiotherapy within 24–72 h', 'Large, pedunculated, ear or recurrent keloid; excision alone recurs in most patients', { procedureReviewModuleId: 'keloid_management', patient: L.options.excision }));
    if (c.is('kel_ex_ulcer', 'Ulcerated / discharging')) out.push(inv('kel_biopsy', 'Biopsy of the ulcerated area', 'Ulceration in a long-standing scar: exclude malignancy', { testId: 'biopsy', urgency: 'soon' }));
    if (c.facts.diabetes) out.push(monitor('kel_glucose', 'Diabetes: check blood glucose after steroid injections'));
    return out;
  },
};

// ── Pigmented lesion / skin cancer ─────────────────────────────────────────
export const PIGMENTED_LESION: ConditionTemplate = {
  id: 'pigmented_lesion', label: 'Pigmented lesion / suspected skin cancer', group: 'Skin and soft tissue', prefix: 'pig_',
  synonyms: ['mole', 'melanoma', 'pigmented lesion', 'skin cancer', 'squamous cell carcinoma', 'basal cell carcinoma', 'changing mole', 'acral lesion'],
  complaintIds: ['pigmented_lesion', 'skin_lesion'],
  history: {
    id: 'cond_pigmented_lesion', title: 'Skin lesion details',
    questions: [
      sel('pig_duration', 'How long present', ['Under 3 months', '3–12 months', 'Over 1 year', 'Since birth']),
      multi('pig_change', 'Change (evolution)', ['Size', 'Shape', 'Colour', 'Bleeding', 'Itching', 'Ulceration', 'None'], { redFlags: ['Size', 'Shape', 'Colour', 'Bleeding', 'Ulceration'] }),
      sel('pig_site_type', 'Site', ['Sole of foot', 'Palm', 'Under a nail', 'Sun-exposed skin', 'In an old scar / burn scar', 'Mucosa', 'Other skin']),
      multi('pig_risk', 'Risk factors', ['Albinism', 'Previous skin cancer', 'Family history of melanoma', 'HIV', 'Immunosuppression', 'Chronic wound / scar at the site', 'None']),
      sel('pig_nodes', 'Lumps in the groin / armpit / neck noticed', YNU, { redFlags: ['Yes'] }),
      sel('pig_systemic', 'Weight loss, bone pain, cough or headache', YNU, { redFlags: ['Yes'] }),
    ],
  },
  exam: {
    id: 'cond_pigmented_lesion_exam', title: 'Skin lesion examination (ABCDE)',
    questions: [
      exMulti('pig_ex_abcde', 'ABCDE features', ['Asymmetry', 'Border irregular', 'Colour variation', 'Diameter over 6 mm', 'Elevation / nodule', 'None']),
      exSel('pig_ex_size', 'Largest diameter', ['Under 6 mm', '6 mm–2 cm', '2–5 cm', 'Over 5 cm']),
      exSel('pig_ex_morphology', 'Morphology', ['Flat pigmented', 'Nodular pigmented', 'Ulcerated / fungating', 'Pearly with telangiectasia (BCC-like)', 'Keratotic / crusted (SCC-like)', 'Nail streak / Hutchinson sign']),
      exSel('pig_ex_satellites', 'Satellite / in-transit lesions', ['None', 'Present'], { redFlags: ['Present'] }),
      exSel('pig_ex_nodes', 'Regional lymph nodes', ['Not palpable', 'Palpable, firm'], { redFlags: ['Palpable, firm'] }),
    ],
  },
  classification: { name: 'ABCDE criteria; staging (AJCC 8th edition) after histology', source: 'Abbasi NR, Shaw HM, Rigel DS, et al. Early diagnosis of cutaneous melanoma: revisiting the ABCD criteria. JAMA. 2004;292(22):2771-2776. Gershenwald JE et al. Melanoma staging: AJCC 8th edition. CA Cancer J Clin. 2017;67(6):472-492.' },
  sources: ['Abbasi NR et al. JAMA. 2004;292(22):2771-2776.', 'NICE NG14. Melanoma: assessment and management (2015, updated 2022).', 'Gershenwald JE et al. CA Cancer J Clin. 2017;67(6):472-492 (AJCC 8th).'],
  plan: c => {
    const L = P.conditions.pigmented_lesion;
    const abcde = list(c.a('pig_ex_abcde')).filter(x => x !== 'None' && x !== 'Not examined');
    const evolving = list(c.a('pig_change')).some(x => x !== 'None');
    const acral = c.is('pig_site_type', 'Sole of foot', 'Palm', 'Under a nail') || c.is('pig_ex_morphology', 'Nail streak / Hutchinson sign');
    const scar = c.is('pig_site_type', 'In an old scar / burn scar') || c.is('pig_risk', 'Chronic wound / scar at the site');
    const large = c.is('pig_ex_size', '2–5 cm', 'Over 5 cm') || c.is('pig_ex_morphology', 'Ulcerated / fungating');
    const nodes = c.is('pig_ex_nodes', 'Palpable, firm') || c.is('pig_nodes', 'Yes');
    const systemic = c.is('pig_systemic', 'Yes');
    const suspicious = abcde.length >= 2 || evolving || acral || scar || nodes || c.is('pig_ex_satellites', 'Present');
    const out: TemplateLine[] = [
      problem('pig', `Skin lesion: ${[c.a('pig_ex_morphology'), c.a('pig_site_type'), abcde.length ? `ABCDE: ${abcde.join(', ')}` : null].filter(Boolean).join(' · ') || 'not described'}${suspicious ? ' — suspicious for malignancy' : ''}`, { patient: L.name, urgency: suspicious ? 'soon' : 'routine' }),
      ...counselAll('pig', L.counselling),
    ];
    if (large) out.push(proc('pig_incisional', 'Incisional or punch biopsy from the thickest / most abnormal area (large, ulcerated, or anatomically difficult lesion)', 'Diagnosis before definitive surgery', { urgency: 'soon', patient: L.options.incisionalBiopsy }));
    else out.push(proc('pig_excision', 'Excision biopsy with a 2 mm clinical margin and a cuff of fat, orientated for histology (not a shave)', suspicious ? 'Suspicious pigmented lesion (NICE NG14)' : 'Diagnosis / patient request', { procedureReviewModuleId: 'skin_tumour_excision', urgency: suspicious ? 'soon' : 'routine', patient: L.options.excisionBiopsy }));
    out.push(
      inv('pig_histo', 'Histopathology of the biopsy (Breslow thickness, ulceration, mitoses, margins)', 'Defines the diagnosis and the definitive margin', { testId: 'biopsy', urgency: suspicious ? 'soon' : 'routine' }),
      proc('pig_wle', 'If melanoma / SCC confirmed: wide local excision with margin by thickness (melanoma 1–2 cm), ± sentinel node biopsy where available; graft or flap as needed', 'Definitive treatment after histology', { procedureReviewModuleId: 'melanoma_wle', patient: L.options.wideExcision }),
      followUp('pig_histo', 'In 2 weeks', 'Histology result and definitive plan', 14, { patient: 'A visit for the laboratory result' }),
      monitor('pig_skin', 'Full skin and lymph node examination at each visit'),
    );
    if (nodes) out.push(inv('pig_nodes', 'Ultrasound of the regional nodes ± FNA', 'Palpable regional nodes', { testId: 'ultrasound', urgency: 'soon' }));
    if (nodes || systemic) out.push(inv('pig_staging', 'Staging imaging (CT chest / abdomen / pelvis) if melanoma confirmed with nodal or systemic features', 'Stage III–IV suspicion (AJCC 8th)', { testId: 'xray', urgency: 'soon' }), refer('pig_mdt', 'Tumour board / oncology', 'Nodal or systemic disease suspected', { urgency: 'soon' }));
    if (c.is('pig_risk', 'Albinism')) out.push(refer('pig_albinism', 'Albinism: 3–6-monthly skin surveillance, sun-protection support', 'High risk of skin cancer'));
    return out;
  },
};

// ── Haemangioma / vascular malformation ───────────────────────────────────
export const VASCULAR_ANOMALY: ConditionTemplate = {
  id: 'vascular_anomaly', label: 'Haemangioma / vascular malformation', group: 'Skin and soft tissue', prefix: 'va_',
  synonyms: ['haemangioma', 'hemangioma', 'strawberry mark', 'vascular malformation', 'port wine stain', 'venous malformation', 'lymphatic malformation', 'cystic hygroma', 'AVM'],
  complaintIds: ['vascular_lesion'],
  history: {
    id: 'cond_vascular_anomaly', title: 'Vascular lesion details',
    questions: [
      sel('va_onset', 'When first noticed', ['At birth (fully formed)', 'In the first weeks of life, then grew', 'Later in childhood', 'Adulthood']),
      sel('va_course', 'Course', ['Grew quickly in the first months', 'Growing with the child', 'Shrinking', 'Static']),
      multi('va_site', 'Site', ['Around the eye', 'Nose / lip', 'Beard area / neck (airway)', 'Ear', 'Scalp', 'Lumbosacral / midline back', 'Perineum', 'Limb', 'Trunk', 'Multiple (over 5)'],
        { redFlags: ['Around the eye', 'Beard area / neck (airway)', 'Lumbosacral / midline back', 'Multiple (over 5)'] }),
      multi('va_problems', 'Problems', ['None', 'Ulceration / bleeding', 'Pain', 'Blocks vision', 'Noisy breathing / stridor', 'Feeding difficulty', 'Swelling worse when crying / dependent', 'Limb overgrowth'],
        { redFlags: ['Ulceration / bleeding', 'Blocks vision', 'Noisy breathing / stridor'] }),
      sel('va_premature', 'Born premature / low birth weight', YNU),
      multi('va_contra', 'Before propranolol: history of', ['Wheeze / asthma', 'Heart problem / slow pulse', 'Low blood sugar', 'None']),
    ],
  },
  exam: {
    id: 'cond_vascular_anomaly_exam', title: 'Vascular lesion examination',
    questions: [
      exSel('va_ex_type', 'Clinical type (ISSVA)', ['Infantile haemangioma — superficial (bright red)', 'Infantile haemangioma — deep (bluish swelling)', 'Infantile haemangioma — mixed', 'Capillary malformation (flat, port-wine)', 'Venous malformation (soft, compressible, blue)', 'Lymphatic malformation (cystic)', 'Arteriovenous malformation (warm, pulsatile, thrill)', 'Uncertain']),
      exSel('va_ex_size', 'Size', ['Under 2 cm', '2–5 cm', 'Over 5 cm / segmental']),
      exSel('va_ex_ulcer', 'Ulceration', ['None', 'Ulcerated'], { redFlags: ['Ulcerated'] }),
      exSel('va_ex_function', 'Function threatened', ['No', 'Eye (visual axis / astigmatism)', 'Airway', 'Feeding', 'Ear canal'], { redFlags: ['Eye (visual axis / astigmatism)', 'Airway'] }),
      exSel('va_ex_segmental', 'Large facial segmental haemangioma (PHACE risk)', ['No', 'Yes'], { redFlags: ['Yes'] }),
      exSel('va_ex_thrill', 'Warmth / thrill / bruit', ['None', 'Present'], { redFlags: ['Present'] }),
    ],
  },
  classification: { name: 'ISSVA classification of vascular anomalies (2018): vascular tumours vs malformations', source: 'International Society for the Study of Vascular Anomalies. ISSVA Classification of Vascular Anomalies, 2018 (issva.org/classification).' },
  sources: ['ISSVA Classification of Vascular Anomalies (2018).', 'Krowchuk DP, Frieden IJ, Mancini AJ, et al. Clinical practice guideline for the management of infantile hemangiomas. Pediatrics. 2019;143(1):e20183475.', 'Hoeger PH, Harper JI, Baselga E, et al. Treatment of infantile haemangiomas: recommendations of a European expert group. Eur J Pediatr. 2015;174(7):855-865.'],
  plan: c => {
    const L = P.conditions.vascular_anomaly;
    const ih = String(c.a('va_ex_type') ?? '').startsWith('Infantile haemangioma') || c.is('va_onset', 'In the first weeks of life, then grew');
    const highRisk = c.is('va_site', 'Around the eye', 'Beard area / neck (airway)', 'Nose / lip', 'Lumbosacral / midline back', 'Multiple (over 5)')
      || c.is('va_ex_ulcer', 'Ulcerated') || c.is('va_problems', 'Ulceration / bleeding', 'Blocks vision', 'Noisy breathing / stridor', 'Feeding difficulty')
      || !c.is('va_ex_function', 'No', 'Not examined') && c.has('va_ex_function') || c.is('va_ex_segmental', 'Yes') || c.is('va_ex_size', 'Over 5 cm / segmental');
    const contra = c.is('va_contra', 'Wheeze / asthma', 'Heart problem / slow pulse', 'Low blood sugar');
    const w = c.facts.weightKg;
    const out: TemplateLine[] = [
      problem('va', `${c.a('va_ex_type') || 'Vascular anomaly (type not documented)'}${highRisk && ih ? ' — high-risk features' : ''}`, { patient: L.name, urgency: highRisk && ih ? 'soon' : 'routine' }),
      monitor('va_photo', 'Standardised photographs and measurements at each visit'),
      ...counselAll('va', L.counselling),
    ];
    if (ih) {
      if (highRisk) {
        const d = w ? weightDose({ perKg: { low: 1, high: 3 }, weightKg: w }) : null;
        out.push(
          { id: 'med:va_propranolol', section: 'medications', text: 'Propranolol oral for high-risk infantile haemangioma (start about 1 mg/kg/day, titrate to 2–3 mg/kg/day in 2 divided doses with feeds; about 6 months, often to 12 months of age)',
            why: 'High-risk infantile haemangioma (AAP 2019; European consensus 2015)', urgency: 'soon',
            medication: { drug: 'Propranolol', dose: d ? `${doseText(d)} per day in 2 divided doses (target 2–3 mg/kg/day)` : '1 mg/kg/day, titrated to 2–3 mg/kg/day', route: 'oral', frequency: 'twice a day with feeds', duration: 'about 6 months, often until 12 months of age', weightBasis: d?.basis,
              cautions: ['Give with feeds; withhold if not feeding or vomiting (hypoglycaemia).', 'Baseline heart rate and blood pressure before starting and after dose increases.', 'Contraindications: asthma / wheeze, heart block or bradycardia, hypoglycaemia; PHACE with cerebrovascular anomaly needs imaging first.'] },
            withheld: contra ? 'Possible contraindication recorded (wheeze, heart problem or low blood sugar): paediatric / cardiac review before starting' : undefined,
            // Patient copy: the starting dose only (about 1 mg/kg/day in 2 doses), worked out for the baby.
            patient: P.medicines.propranolol({ start: d ? doseText({ low: Math.round(d.low / 2 * 10) / 10, high: Math.round(d.low / 2 * 10) / 10 }) : null }) },
          inv('va_baseline', 'Baseline heart rate, blood pressure and blood glucose before propranolol; ECG if bradycardic, murmur or family history of heart block', 'Propranolol safety', { testId: 'glucose_hba1c', analytes: ['glucose'] }),
        );
        if (c.is('va_ex_segmental', 'Yes')) out.push(refer('va_phace', 'PHACE work-up: MRI / MRA head and neck, echocardiogram, eye examination before propranolol', 'Large facial segmental haemangioma', { urgency: 'soon' }));
        if (c.is('va_site', 'Lumbosacral / midline back')) out.push(inv('va_spine', 'Spinal ultrasound (infant) or MRI', 'Lumbosacral haemangioma: occult spinal dysraphism (LUMBAR)', { testId: 'ultrasound' }));
        if (c.is('va_site', 'Multiple (over 5)')) out.push(inv('va_liver', 'Liver ultrasound', 'Five or more cutaneous haemangiomas: hepatic haemangiomas', { testId: 'ultrasound' }));
        if (c.is('va_site', 'Around the eye') || c.is('va_ex_function', 'Eye (visual axis / astigmatism)')) out.push(refer('va_eye', 'Ophthalmology (amblyopia risk)', 'Periocular haemangioma', { urgency: 'soon' }));
        if (c.is('va_site', 'Beard area / neck (airway)') || c.is('va_problems', 'Noisy breathing / stridor')) out.push(refer('va_ent', 'ENT: airway endoscopy', 'Beard-distribution haemangioma or stridor: subglottic haemangioma', { urgency: 'urgent' }));
        out.push(followUp('va_prop_review', 'In 2–4 weeks', 'Propranolol dose review (heart rate, weight, response)', 21, { patient: 'A check of your baby and the medicine dose' }));
      } else {
        out.push(proc('va_observe', 'Active observation (most infantile haemangiomas involute); topical timolol may be considered for small superficial lesions', 'Low-risk infantile haemangioma', { patient: L.options.observe }),
          followUp('va_review', 'In 4–6 weeks (rapid growth is in the first 3–5 months)', 'Review growth with photographs', 35, { patient: 'A check of the birthmark with photos' }));
      }
      out.push(proc('va_residual', 'Excision / revision of residual fibrofatty tissue or skin after involution (usually from age 3–4)', 'Residual deformity after involution', { procedureReviewModuleId: 'vascular_anomaly', patient: L.options.excision }));
    } else {
      out.push(
        inv('va_doppler', 'Doppler ultrasound (flow: low-flow venous / lymphatic vs high-flow AVM); MRI for extent', 'Characterise the malformation before treatment', { testId: 'ultrasound' }),
        proc('va_malformation', c.is('va_ex_thrill', 'Present') ? 'AVM: specialist interventional radiology / embolisation ± excision (not partial excision alone)' : 'Low-flow malformation: compression, sclerotherapy (e.g. bleomycin / sodium tetradecyl sulfate) and / or excision',
          'Vascular malformation (ISSVA)', { procedureReviewModuleId: 'vascular_anomaly', patient: L.options.sclerotherapy }),
        followUp('va_mal_review', 'In 4 weeks', 'Imaging result and plan', 28, { patient: 'A visit for the scan result' }),
      );
      if (c.is('va_problems', 'Limb overgrowth')) out.push(refer('va_overgrowth', 'Paediatrics / genetics: overgrowth syndrome (e.g. Klippel–Trenaunay) and limb-length monitoring', 'Limb overgrowth'));
    }
    return out;
  },
};

export const SKIN_TEMPLATES: ConditionTemplate[] = [LIPOMA_CYST, KELOID, PIGMENTED_LESION, VASCULAR_ANOMALY];
