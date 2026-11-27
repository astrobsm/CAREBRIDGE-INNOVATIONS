/**
 * Face, breast, limb and genital conditions.
 */
import type { ConditionTemplate, TemplateLine } from './types';
import { P, YNU, counselAll, exMulti, exSel, followUp, inv, list, monitor, multi, numQ, problem, proc, refer, sel } from './kit';

// ── Facial laceration ───────────────────────────────────────────────────────
export const FACIAL_LACERATION: ConditionTemplate = {
  id: 'facial_laceration', label: 'Facial laceration', group: 'Face', prefix: 'fl_',
  synonyms: ['facial laceration', 'face cut', 'lip laceration', 'eyelid laceration', 'cheek laceration', 'dog bite face'],
  complaintIds: ['facial_injury'],
  history: {
    id: 'cond_facial_laceration', title: 'Facial laceration details',
    questions: [
      sel('fl_mechanism', 'Mechanism', ['Sharp (glass / knife / machete)', 'Blunt (fall / assault / RTC)', 'Dog bite', 'Human bite', 'Other bite']),
      sel('fl_hours', 'Hours since injury', ['Under 6', '6–24', 'Over 24']),
      sel('fl_head', 'Loss of consciousness, vomiting, or neck pain', YNU, { redFlags: ['Yes'] }),
      sel('fl_vision', 'Blurred / double vision or eye pain', YNU, { redFlags: ['Yes'] }),
      sel('fl_tetanus', 'Tetanus immunisation', ['Up to date (< 10 years)', 'Not up to date', 'Unknown']),
      sel('fl_dog_status', 'Dog vaccinated against rabies (if dog bite)', ['Yes, documented', 'No / unknown', 'Not applicable']),
      sel('fl_keloid', 'Personal history of keloids', YNU),
    ],
  },
  exam: {
    id: 'cond_facial_laceration_exam', title: 'Facial laceration examination',
    questions: [
      exSel('fl_ex_site', 'Site', ['Forehead / brow', 'Eyelid', 'Nose', 'Cheek', 'Lip (crossing the vermilion border)', 'Lip (not crossing)', 'Ear', 'Chin', 'Scalp']),
      numQ('fl_ex_length', 'Length', 'cm'),
      exSel('fl_ex_depth', 'Depth', ['Skin only', 'Into muscle', 'Through and through (lip / cheek)', 'Tissue loss']),
      exSel('fl_ex_facial_nerve', 'Facial nerve (raise brows, close eyes tightly, smile, show teeth)', ['All branches intact', 'Weakness of a branch'], { redFlags: ['Weakness of a branch'] }),
      exSel('fl_ex_parotid', 'Parotid duct (cheek wound on the tragus–mid upper lip line)', ['Not at risk', 'At risk / saliva in the wound'], { redFlags: ['At risk / saliva in the wound'] }),
      exSel('fl_ex_lacrimal', 'Lacrimal canaliculus (medial eyelid wound)', ['Not involved', 'Involved / suspected'], { redFlags: ['Involved / suspected'] }),
      exSel('fl_ex_lid_margin', 'Eyelid margin', ['Not involved', 'Involved']),
      exSel('fl_ex_bone', 'Bony tenderness / step / malocclusion', ['None', 'Present — facial fracture suspected']),
      exSel('fl_ex_contamination', 'Contamination / foreign body', ['Clean', 'Dirt / gravel (tattooing risk)', 'Glass suspected']),
    ],
  },
  sources: ['Hollander JE, Singer AJ. Laceration management. Ann Emerg Med. 1999;34(3):356-367.', 'WHO. Rabies vaccines: WHO position paper, April 2018. Wkly Epidemiol Rec. 2018;93(16):201-220.', 'WHO. Tetanus vaccines: WHO position paper, 2017.'],
  plan: c => {
    const L = P.conditions.facial_laceration;
    const dog = c.is('fl_mechanism', 'Dog bite');
    const bite = dog || c.is('fl_mechanism', 'Human bite', 'Other bite');
    const nerve = c.is('fl_ex_facial_nerve', 'Weakness of a branch');
    const duct = c.is('fl_ex_parotid', 'At risk / saliva in the wound');
    const lac = c.is('fl_ex_lacrimal', 'Involved / suspected');
    const out: TemplateLine[] = [
      problem('fl', `Facial laceration: ${[c.a('fl_ex_site'), c.num('fl_ex_length') != null ? `${c.num('fl_ex_length')} cm` : null, c.a('fl_ex_depth'), c.a('fl_mechanism')].filter(Boolean).join(' · ') || 'not described'}`, { patient: L.name, urgency: nerve || duct || lac ? 'urgent' : 'soon' }),
      proc('fl_repair', 'Irrigation, minimal debridement and layered primary closure (6/0 non-absorbable or fast-absorbing to skin); align landmarks first (vermilion border, brow, lid margin)', 'Facial wounds close primarily, even when delayed, given the blood supply', { procedureReviewModuleId: 'local_regional_flap', patient: L.options.repair }),
      monitor('fl_scar', 'Scar review: massage, silicone and sun protection; consider revision only after 12 months'),
      followUp('fl_sutures', 'At day 5', 'Suture removal and wound check', 5, { patient: 'Removal of stitches' }),
      followUp('fl_scar_review', 'At 3 months', 'Scar review', 90, { patient: 'A check of the scar' }),
      ...counselAll('fl', L.counselling),
    ];
    if (nerve) out.push(proc('fl_nerve', 'Facial nerve branch injury (lateral to the lateral canthus): exploration and microsurgical repair within 72 h', 'Weakness of a branch', { urgency: 'urgent' }));
    if (duct) out.push(proc('fl_duct', 'Parotid duct exploration, repair over a stent', 'Duct at risk', { urgency: 'urgent' }));
    if (lac) out.push(refer('fl_lacrimal', 'Oculoplastic / ophthalmology: canalicular repair with stent within 24–48 h', 'Medial eyelid wound', { urgency: 'urgent' }));
    if (c.is('fl_vision', 'Yes') || c.is('fl_ex_site', 'Eyelid')) out.push(refer('fl_eye', 'Ophthalmology: globe examination', 'Eyelid wound or visual symptoms', { urgency: 'urgent' }));
    if (c.is('fl_ex_bone', 'Present — facial fracture suspected')) out.push(inv('fl_ct', 'Facial X-rays / CT face', 'Suspected facial fracture', { testId: 'xray', urgency: 'soon' }));
    if (c.is('fl_head', 'Yes')) out.push(refer('fl_head', 'Head injury / cervical spine assessment first (ATLS)', 'Loss of consciousness, vomiting or neck pain', { urgency: 'urgent' }));
    if (bite) out.push({ id: 'med:fl_coamox', section: 'medications', text: 'Co-amoxiclav prophylaxis for a facial bite', why: 'Bite wound',
      medication: { drug: c.facts.penicillinAllergy ? 'Alternative per local guideline (penicillin allergy)' : 'Co-amoxiclav', dose: c.facts.isChild ? 'per BNFc by weight' : '625 mg', route: 'oral', frequency: 'three times a day', duration: '3 days (prophylaxis)', cautions: c.facts.penicillinAllergy ? ['Penicillin allergy recorded: do not give co-amoxiclav.'] : [] } });
    if (dog) out.push({ id: 'med:fl_rabies', section: 'medications', text: 'Rabies post-exposure prophylaxis: wound washing 15 min, vaccine course, and rabies immunoglobulin into and around the wound (category III — facial bite)', why: 'WHO 2018: facial dog bite is category III unless the dog is documented vaccinated',
      urgency: 'urgent',
      medication: { drug: 'Rabies vaccine (+ rabies immunoglobulin)', dose: 'per WHO schedule', route: 'IM / intradermal; RIG infiltrated into the wound', frequency: 'days 0, 3, 7 (and 14–28 per regimen)', duration: 'full course', cautions: c.is('fl_dog_status', 'Yes, documented') ? ['Dog documented as vaccinated: still assess and observe the dog for 10 days.'] : [] } });
    if (!c.is('fl_tetanus', 'Up to date (< 10 years)')) out.push({ id: 'med:fl_tetanus', section: 'medications', text: 'Tetanus toxoid booster', why: 'Tetanus status not up to date / unknown',
      medication: { drug: 'Tetanus toxoid-containing vaccine', dose: '0.5 mL', route: 'IM', frequency: 'single dose', duration: '', cautions: [] } });
    if (c.is('fl_keloid', 'Yes')) out.push(proc('fl_keloid', 'Keloid-prone: tension-free closure, early silicone, consider early intralesional steroid', 'History of keloids', { procedureReviewModuleId: 'keloid_management' }));
    return out;
  },
};

// ── Breast hypertrophy ─────────────────────────────────────────────────────
export const BREAST_HYPERTROPHY: ConditionTemplate = {
  id: 'breast_hypertrophy', label: 'Breast hypertrophy (macromastia)', group: 'Breast', prefix: 'bh_',
  synonyms: ['macromastia', 'breast hypertrophy', 'large breasts', 'breast reduction', 'gigantomastia'],
  complaintIds: ['breast_size'],
  history: {
    id: 'cond_breast_hypertrophy', title: 'Breast hypertrophy history',
    questions: [
      multi('bh_symptoms', 'Symptoms', ['Neck pain', 'Upper back pain', 'Shoulder grooving', 'Intertrigo / rash under the breasts', 'Headaches', 'Limits exercise', 'Breathing difficulty lying down', 'Self-consciousness']),
      sel('bh_bra', 'Bra cup size', ['D', 'DD / E', 'F or larger', 'Unknown']),
      sel('bh_onset', 'Onset', ['Puberty', 'After pregnancy', 'Weight gain', 'Rapid (months)'], { redFlags: [] }),
      sel('bh_conservative', 'Tried support bra / physiotherapy / weight loss', YNU),
      sel('bh_future_breastfeeding', 'Plans for (more) children / breastfeeding', YNU),
      sel('bh_lumps', 'Breast lump, nipple discharge or skin change', YNU, { redFlags: ['Yes'] }),
      sel('bh_family_ca', 'Family history of breast cancer', YNU),
    ],
  },
  exam: {
    id: 'cond_breast_hypertrophy_exam', title: 'Breast examination',
    questions: [
      numQ('bh_ex_snn_left', 'Sternal notch to nipple (left)', 'cm'),
      numQ('bh_ex_snn_right', 'Sternal notch to nipple (right)', 'cm'),
      exSel('bh_ex_ptosis', 'Ptosis (Regnault)', ['None', 'Grade I — nipple at the fold', 'Grade II — below the fold, above the lower pole', 'Grade III — at the lowest point', 'Pseudoptosis']),
      exSel('bh_ex_asymmetry', 'Asymmetry', ['Symmetrical', 'Asymmetric']),
      exSel('bh_ex_mass', 'Palpable mass / axillary nodes', ['None', 'Present'], { redFlags: ['Present'] }),
      exSel('bh_ex_skin', 'Skin', ['Normal', 'Intertrigo', 'Shoulder grooving', 'Striae']),
    ],
  },
  classification: { name: 'Regnault ptosis grading', source: 'Regnault P. Breast ptosis. Definition and treatment. Clin Plast Surg. 1976;3(2):193-203.' },
  sources: ['Kalliainen LK; ASPS Health Policy Committee. ASPS clinical practice guideline summary on reduction mammaplasty. Plast Reconstr Surg. 2012;130(4):785-789.', 'Regnault P. Clin Plast Surg. 1976;3(2):193-203.'],
  plan: c => {
    const L = P.conditions.breast_hypertrophy;
    const mass = c.is('bh_ex_mass', 'Present') || c.is('bh_lumps', 'Yes');
    const age = c.facts.ageYears;
    const out: TemplateLine[] = [
      problem('bh', `Symptomatic breast hypertrophy${c.a('bh_ex_ptosis') ? ` · ${String(c.a('bh_ex_ptosis')).split(' —')[0]}` : ''}`, { patient: L.name }),
      inv('bh_imaging', age != null && age >= 40 ? 'Bilateral mammogram before surgery (age 40 or over), ultrasound as indicated' : 'Breast ultrasound before surgery', 'Pre-operative breast imaging (ASPS 2012)', { testId: 'breast_imaging' }),
      inv('bh_fbc', 'Full blood count and genotype (if unknown) before surgery', 'Pre-operative baseline', { testId: 'fbc', analytes: ['hb', 'wbc', 'plt'], patient: P.tests.fbc_preop }),
      proc('bh_conservative', 'Supportive bra fitting, physiotherapy, weight management, treat intertrigo', 'First-line / while awaiting surgery', { patient: L.options.support }),
      proc('bh_reduction', 'Reduction mammaplasty (e.g. inferior or superomedial pedicle, Wise-pattern or vertical scar); free nipple graft if very large', 'Symptomatic macromastia', { procedureReviewModuleId: 'breast_and_body_contouring', patient: L.options.reduction }),
      followUp('bh_plan', 'In 4–6 weeks', 'Imaging result and surgical planning', 35, { patient: 'A visit for the scan result and to plan the operation' }),
      ...counselAll('bh', L.counselling),
    ];
    if (mass) out.push(refer('bh_triple', 'Triple assessment of the breast lump (clinical, imaging, biopsy) BEFORE any reduction', 'Mass, discharge or skin change', { urgency: 'soon' }));
    if (c.facts.smoker) out.push(proc('bh_smoking', 'Stop smoking at least 4 weeks before surgery (nipple and T-junction necrosis risk)', 'Current smoker'));
    if (c.facts.weightKg && c.facts.heightCm && c.facts.weightKg / (c.facts.heightCm / 100) ** 2 >= 35) out.push(proc('bh_weight', 'BMI 35 or over: weight reduction before surgery advised (complication risk)', 'High BMI'));
    return out;
  },
};

// ── Gynaecomastia ──────────────────────────────────────────────────────────
export const GYNAECOMASTIA: ConditionTemplate = {
  id: 'gynaecomastia', label: 'Gynaecomastia', group: 'Breast', prefix: 'gyn_',
  synonyms: ['gynaecomastia', 'gynecomastia', 'male breast enlargement', 'man boobs'],
  complaintIds: ['gynaecomastia'],
  history: {
    id: 'cond_gynaecomastia', title: 'Gynaecomastia history',
    questions: [
      sel('gyn_duration', 'Duration', ['Under 6 months', '6–12 months', '1–2 years', 'Over 2 years']),
      sel('gyn_side', 'Side', ['Both', 'Left', 'Right']),
      sel('gyn_pain', 'Tender / painful', YNU),
      multi('gyn_drugs', 'Drugs and substances', ['None', 'Spironolactone', 'Anabolic steroids / body-building supplements', 'Cannabis', 'Heavy alcohol', 'Antiretrovirals (efavirenz)', 'Cimetidine / omeprazole', 'Antipsychotics', 'Other']),
      multi('gyn_symptoms', 'Associated symptoms', ['None', 'Testicular lump or swelling', 'Reduced libido / erectile problems', 'Weight loss', 'Nipple discharge', 'Rapidly enlarging hard lump'],
        { redFlags: ['Testicular lump or swelling', 'Rapidly enlarging hard lump', 'Nipple discharge'] }),
      sel('gyn_liver_kidney', 'Known liver or kidney disease, thyroid disease', YNU),
    ],
  },
  exam: {
    id: 'cond_gynaecomastia_exam', title: 'Gynaecomastia examination',
    questions: [
      exSel('gyn_ex_simon', 'Simon grade', ['I — small, no skin excess', 'IIa — moderate, no skin excess', 'IIb — moderate, with skin excess', 'III — marked, with skin excess (ptosis)']),
      exSel('gyn_ex_tissue', 'Tissue', ['Rubbery disc under the areola (glandular)', 'Soft, diffuse (fatty / pseudogynaecomastia)', 'Hard, eccentric, fixed'], { redFlags: ['Hard, eccentric, fixed'] }),
      exSel('gyn_ex_testes', 'Testicular examination', ['Normal', 'Mass / asymmetry', 'Small testes'], { redFlags: ['Mass / asymmetry'] }),
      exSel('gyn_ex_stigmata', 'Signs of liver disease / hypogonadism / thyroid', ['None', 'Present']),
    ],
  },
  classification: { name: 'Simon classification', source: 'Simon BE, Hoffman S, Kahn S. Classification and surgical correction of gynecomastia. Plast Reconstr Surg. 1973;51(1):48-52.' },
  sources: ['Simon BE et al. Plast Reconstr Surg. 1973;51(1):48-52.', 'Braunstein GD. Clinical practice. Gynecomastia. N Engl J Med. 2007;357(12):1229-1237.'],
  plan: c => {
    const L = P.conditions.gynaecomastia;
    const teen = c.facts.ageYears != null && c.facts.ageYears >= 10 && c.facts.ageYears < 18;
    const sinister = c.is('gyn_ex_tissue', 'Hard, eccentric, fixed') || c.is('gyn_symptoms', 'Rapidly enlarging hard lump', 'Nipple discharge');
    const testis = c.is('gyn_ex_testes', 'Mass / asymmetry') || c.is('gyn_symptoms', 'Testicular lump or swelling');
    const drugs = list(c.a('gyn_drugs')).filter(x => x !== 'None');
    const out: TemplateLine[] = [
      problem('gyn', `Gynaecomastia ${c.a('gyn_side') || ''}${c.a('gyn_ex_simon') ? ` · Simon ${String(c.a('gyn_ex_simon')).split(' —')[0]}` : ''}${teen ? ' (pubertal age)' : ''}`.trim(), { patient: L.name }),
      ...counselAll('gyn', L.counselling),
    ];
    if (sinister) out.push(inv('gyn_imaging', 'Breast ultrasound / mammogram and biopsy', 'Hard, eccentric or discharging: exclude male breast cancer', { testId: 'breast_imaging', urgency: 'soon' }));
    if (testis) out.push(inv('gyn_testis', 'Testicular ultrasound, beta-hCG and AFP', 'Testicular mass: exclude a germ-cell or Leydig-cell tumour', { testId: 'ultrasound', urgency: 'urgent' }));
    if (!teen || sinister || testis || c.is('gyn_symptoms', 'Reduced libido / erectile problems')) {
      out.push(
        inv('gyn_hormones', 'Testosterone, LH, FSH, oestradiol, prolactin, beta-hCG; TSH', 'Endocrine cause (Braunstein 2007)', { testId: 'hormones' }),
        inv('gyn_lft', 'Liver function tests, urea and creatinine', 'Liver / kidney causes', { testId: 'lft_albumin', analytes: ['alt', 'ast', 'albumin', 'creatinine'] }),
      );
    }
    if (drugs.length) out.push(proc('gyn_drugs', `Stop / review the likely cause (${drugs.join(', ')}) where possible and re-assess in 3–6 months`, 'Drug-induced gynaecomastia'));
    if (teen && !sinister && !testis) out.push(proc('gyn_observe', 'Pubertal gynaecomastia: reassurance and review; most resolve within 1–2 years', 'Physiological in adolescence', { patient: L.options.observe }));
    out.push(proc('gyn_surgery', 'Surgery for persistent (over 12–24 months) or symptomatic gynaecomastia: liposuction ± subareolar excision; skin reduction for Simon IIb–III', 'Persistent after cause addressed', { procedureReviewModuleId: 'breast_and_body_contouring', patient: L.options.excision }));
    out.push(followUp('gyn_review', teen ? 'In 6 months' : 'In 4 weeks', teen ? 'Review size and symptoms' : 'Results and plan', teen ? 180 : 28, { patient: teen ? 'A check of the chest' : 'A visit for your test results' }));
    return out;
  },
};

// ── Lymphoedema ────────────────────────────────────────────────────────────
export const LYMPHOEDEMA: ConditionTemplate = {
  id: 'lymphoedema', label: 'Lymphoedema', group: 'Limb', prefix: 'ly_',
  synonyms: ['lymphoedema', 'lymphedema', 'elephantiasis', 'podoconiosis', 'filarial lymphoedema', 'swollen leg'],
  complaintIds: ['lymphoedema'],
  history: {
    id: 'cond_lymphoedema', title: 'Lymphoedema history',
    questions: [
      sel('ly_limb', 'Limb', ['Left leg', 'Right leg', 'Both legs', 'Left arm', 'Right arm', 'Genitals', 'Other']),
      sel('ly_onset', 'Onset', ['Since birth / childhood (primary)', 'Adolescence', 'After surgery / radiotherapy / cancer', 'After infection / filaria area', 'Barefoot farming in red clay soil (podoconiosis)', 'Unknown']),
      sel('ly_cellulitis', 'Episodes of cellulitis (red, hot, painful with fever)', ['None', '1 in the past year', '2 or more in the past year'], { redFlags: ['2 or more in the past year'] }),
      sel('ly_cancer', 'History of cancer or a new lump', YNU, { redFlags: ['Yes'] }),
      sel('ly_footwear', 'Usually wears shoes outdoors', ['Always', 'Sometimes', 'Rarely / barefoot']),
      sel('ly_heart_kidney', 'Heart failure, kidney or liver disease', YNU),
    ],
  },
  exam: {
    id: 'cond_lymphoedema_exam', title: 'Lymphoedema examination',
    questions: [
      exSel('ly_ex_isl', 'ISL stage', ['0 — latent, no swelling', 'I — pitting, reduces with elevation', 'II — pitting / non-pitting, does not reduce with elevation', 'III — elephantiasis: skin thickening, folds, warty change']),
      exSel('ly_ex_stemmer', "Stemmer's sign (cannot pinch skin at the base of the 2nd toe / finger)", ['Positive', 'Negative']),
      numQ('ly_ex_circ_affected', 'Circumference (affected limb, fixed point)', 'cm'),
      numQ('ly_ex_circ_other', 'Circumference (other limb, same point)', 'cm'),
      exMulti('ly_ex_skin', 'Skin', ['Normal', 'Fungal toe-web infection', 'Papillomatosis / warty change', 'Lymphorrhoea (leaking)', 'Ulcer', 'Mossy foot (podoconiosis)'], { redFlags: ['Ulcer'] }),
      exSel('ly_ex_pulses', 'Foot pulses / ABPI (before compression)', ['Pulses palpable', 'Pulses not palpable', 'ABPI measured below 0.8']),
      exSel('ly_ex_nodes', 'Regional / pelvic nodes or mass', ['None', 'Present'], { redFlags: ['Present'] }),
    ],
  },
  classification: { name: 'International Society of Lymphology (ISL) staging 0–III', source: 'Executive Committee of the International Society of Lymphology. The diagnosis and treatment of peripheral lymphedema: 2020 Consensus Document. Lymphology. 2020;53(1):3-19.' },
  sources: ['ISL 2020 Consensus Document. Lymphology. 2020;53(1):3-19.', 'WHO. Lymphatic filariasis: managing morbidity and preventing disability (2013).'],
  plan: c => {
    const L = P.conditions.lymphoedema;
    const a = c.num('ly_ex_circ_affected'), b = c.num('ly_ex_circ_other');
    const filaria = c.is('ly_onset', 'After infection / filaria area');
    const podo = c.is('ly_onset', 'Barefoot farming in red clay soil (podoconiosis)') || c.is('ly_ex_skin', 'Mossy foot (podoconiosis)');
    const arterialRisk = c.is('ly_ex_pulses', 'Pulses not palpable', 'ABPI measured below 0.8');
    const cancer = c.is('ly_cancer', 'Yes') || c.is('ly_ex_nodes', 'Present');
    const out: TemplateLine[] = [
      problem('ly', `Lymphoedema: ${[c.a('ly_limb'), c.a('ly_ex_isl') && `ISL ${String(c.a('ly_ex_isl')).split(' —')[0]}`, a && b ? `circumference difference ${Math.round((a - b) * 10) / 10} cm` : null, podo ? 'podoconiosis' : filaria ? 'filarial (suspected)' : null].filter(Boolean).join(' · ') || 'not described'}`, { patient: L.name }),
      inv('ly_abpi', 'ABPI before compression', 'Exclude arterial disease before compression', { testId: 'abpi' }),
      inv('ly_bloods', 'FBC, U&E, LFT with albumin, TSH', 'Exclude systemic causes of oedema (heart, kidney, liver, thyroid, low albumin)', { testId: 'eucr', analytes: ['hb', 'creatinine', 'albumin'] }),
      proc('ly_cdt', arterialRisk ? 'Decongestive therapy WITHOUT full compression until the arterial assessment is done' : 'Complete decongestive therapy: skin care, manual lymphatic drainage, multilayer bandaging, then fitted compression garment, exercise, elevation',
        'ISL 2020', { patient: L.options.decongestive }),
      monitor('ly_circ', 'Limb circumferences at fixed points at each visit; skin and cellulitis episodes'),
      followUp('ly_review', 'In 4 weeks', 'Review the swelling, skin care and compression', 28, { patient: 'A check of the swelling and your compression' }),
      ...counselAll('ly', L.counselling),
    ];
    if (filaria) out.push(
      inv('ly_filaria', 'Filarial antigen test (or night blood film)', 'Endemic area / filarial lymphoedema', { testId: 'filaria' }),
      { id: 'med:ly_doxy', section: 'medications', text: 'Consider doxycycline for filarial lymphoedema (not in pregnancy or under 8 years), per WHO / local guideline', why: 'Filarial lymphoedema',
        medication: { drug: 'Doxycycline', dose: '200 mg', route: 'oral', frequency: 'once a day', duration: '6 weeks (per guideline)', cautions: ['Not in pregnancy, breastfeeding, or children under 8 years.'] },
        withheld: c.facts.pregnancy === 'confirmed' || c.facts.pregnancy === 'possible' || (c.facts.ageYears != null && c.facts.ageYears < 8) ? 'Pregnancy possible or child under 8' : undefined },
    );
    if (podo) out.push(proc('ly_podo', 'Podoconiosis: daily foot hygiene (soap, water, antiseptic), emollient, socks and shoes, compression and elevation', 'Podoconiosis care package'));
    if (c.is('ly_cellulitis', '2 or more in the past year')) out.push({ id: 'med:ly_prophylaxis', section: 'medications', text: 'Antibiotic prophylaxis for recurrent cellulitis (e.g. phenoxymethylpenicillin 250 mg twice daily; erythromycin if penicillin-allergic), per guideline', why: 'Two or more episodes of cellulitis in a year',
      medication: { drug: c.facts.penicillinAllergy ? 'Erythromycin' : 'Phenoxymethylpenicillin', dose: c.facts.penicillinAllergy ? '250 mg' : '250 mg', route: 'oral', frequency: 'twice a day', duration: 'review after 6–12 months', cautions: c.facts.penicillinAllergy ? ['Penicillin allergy recorded.'] : [] } });
    if (c.is('ly_ex_skin', 'Fungal toe-web infection')) out.push({ id: 'med:ly_fungal', section: 'medications', text: 'Topical antifungal to toe webs (e.g. clotrimazole 1% twice daily, 2–4 weeks)', why: 'Entry point for cellulitis',
      medication: { drug: 'Clotrimazole 1% cream', dose: 'thin layer', route: 'topical', frequency: 'twice a day', duration: '2–4 weeks', cautions: [] } });
    if (cancer) out.push(inv('ly_imaging', 'Imaging of the regional nodes / pelvis or axilla (ultrasound / CT)', 'Exclude malignant obstruction', { testId: 'ultrasound', urgency: 'soon' }));
    if (String(c.a('ly_ex_isl') ?? '').startsWith('III')) out.push(proc('ly_surgery', 'Stage III not controlled by compression: consider debulking (e.g. Charles / staged excision) or lymphatic surgery where available', 'Advanced lymphoedema', { patient: L.options.surgery }));
    return out;
  },
};

// ── Hypospadias (brief: plastic surgery practices in Nigeria repair it) ────
export const HYPOSPADIAS: ConditionTemplate = {
  id: 'hypospadias', label: 'Hypospadias', group: 'Genital', prefix: 'hyp_',
  synonyms: ['hypospadias', 'abnormal urethral opening', 'chordee'],
  complaintIds: ['hypospadias'],
  history: {
    id: 'cond_hypospadias', title: 'Hypospadias history',
    questions: [
      sel('hyp_circumcised', 'Already circumcised', ['No', 'Yes'], { redFlags: [] }),
      sel('hyp_stream', 'Urinary stream', ['Normal', 'Deflected downwards', 'Sprays', 'Has to sit to void']),
      sel('hyp_family', 'Family history of hypospadias', YNU),
      sel('hyp_pregnancy', 'Hormones / IVF / drugs in pregnancy', YNU),
      sel('hyp_previous', 'Previous repair', ['None', 'Yes — complication (fistula / stenosis)']),
    ],
  },
  exam: {
    id: 'cond_hypospadias_exam', title: 'Hypospadias examination',
    questions: [
      exSel('hyp_ex_meatus', 'Meatus position', ['Glanular', 'Coronal', 'Distal penile', 'Mid-penile', 'Proximal penile', 'Penoscrotal', 'Scrotal', 'Perineal']),
      exSel('hyp_ex_chordee', 'Ventral curvature (chordee)', ['None', 'Mild (under 30°)', 'Significant (30° or more)']),
      exSel('hyp_ex_testes', 'Testes', ['Both descended', 'One undescended', 'Both undescended / impalpable'], { redFlags: ['One undescended', 'Both undescended / impalpable'] }),
      exSel('hyp_ex_scrotum', 'Scrotum', ['Normal', 'Bifid', 'Penoscrotal transposition']),
    ],
  },
  classification: { name: 'Meatal position (distal / mid / proximal)', source: 'EAU/ESPU Guidelines on Paediatric Urology: Hypospadias (European Association of Urology, current edition).' },
  sources: ['EAU/ESPU Guidelines on Paediatric Urology: Hypospadias.'],
  plan: c => {
    const L = P.conditions.hypospadias;
    const proximal = c.is('hyp_ex_meatus', 'Proximal penile', 'Penoscrotal', 'Scrotal', 'Perineal');
    const udt = c.is('hyp_ex_testes', 'One undescended', 'Both undescended / impalpable');
    const m = c.facts.ageMonths;
    const out: TemplateLine[] = [
      problem('hyp', `Hypospadias: ${[c.a('hyp_ex_meatus'), c.a('hyp_ex_chordee') && `curvature ${String(c.a('hyp_ex_chordee')).toLowerCase()}`].filter(Boolean).join(' · ') || 'meatus not documented'}${proximal && udt ? ' — DSD work-up needed' : ''}`, { patient: L.name }),
      proc('hyp_repair', proximal ? 'Proximal hypospadias: staged or one-stage repair with curvature correction (e.g. two-stage graft repair)' : 'Distal hypospadias: one-stage repair (e.g. TIP / Snodgrass)', 'Repair usually at 6–18 months (EAU/ESPU)', { patient: L.options.repair }),
      ...(m == null || m < 24 ? [inv('hyp_fbc', 'Full blood count and genotype before general anaesthesia', 'Pre-anaesthetic baseline', { testId: 'fbc', analytes: ['hb', 'wbc', 'plt'], patient: P.tests.fbc_preop })] : []),
      followUp('hyp_plan', m != null && m < 6 ? 'At about 6 months of age' : 'In 4–6 weeks', 'Surgical planning and consent', m != null && m < 6 ? Math.max(14, Math.round((6 - m) * 30.4)) : 35, { patient: 'A visit to plan the operation' }),
      ...counselAll('hyp', L.counselling),
    ];
    if (proximal && udt) out.push(inv('hyp_dsd', 'Karyotype, pelvic ultrasound and endocrine assessment (17-OHP, electrolytes in the newborn)', 'Proximal hypospadias with undescended testis: disorder of sex development until proven otherwise', { testId: 'hormones', urgency: 'urgent' }), refer('hyp_dsd', 'Paediatric endocrinology / DSD team', 'Proximal hypospadias with undescended testis', { urgency: 'urgent' }));
    else if (udt) out.push(refer('hyp_udt', 'Orchidopexy planning (paediatric surgery / urology)', 'Undescended testis'));
    if (c.is('hyp_circumcised', 'Yes')) out.push(monitor('hyp_circ', 'Already circumcised: preputial tissue unavailable — plan graft / alternative flap'));
    return out;
  },
};

export const OTHER_TEMPLATES: ConditionTemplate[] = [FACIAL_LACERATION, BREAST_HYPERTROPHY, GYNAECOMASTIA, LYMPHOEDEMA, HYPOSPADIAS];
