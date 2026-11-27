/**
 * Knowledge base, part 1: inflammatory, vasculitic, connective-tissue,
 * vasculopathic, metabolic and haematological ulcers.
 *
 * Clinician text. Doses are adult starting doses as published in the cited
 * source; local formulary, weight, renal function and pregnancy decide the
 * prescription. Patient text lives in the locale, never here.
 */
import { INV } from './investigations';
import type { KbCondition } from './types';

export const PYODERMA_GANGRENOSUM: KbCondition = {
  id: 'pyoderma_gangrenosum', label: 'Pyoderma gangrenosum', category: 'neutrophilic',
  synonyms: ['pyoderma gangrenosum', 'PG', 'pyoderma'],
  history: [
    'Rapidly enlarging (days to weeks), very painful ulcer, often starting as a pustule or a tender nodule',
    'Worse after debridement, surgery, an injection or minor injury (pathergy)',
    'Associated disease in about half: inflammatory bowel disease, inflammatory arthritis, haematological malignancy or paraproteinaemia',
    'Failed antibiotics and good wound care',
  ],
  exam: [
    'Undermined, violaceous (purple-grey) edge with surrounding inflammation',
    'Irregular, often bizarre or serpiginous outline; purulent, necrotic or haemorrhagic base',
    'Healed areas leave cribriform (sieve-like) scars',
    'Commonest on the shins; also peristomal, post-surgical (breast, caesarean) and genital',
  ],
  skinOfColour: [
    'The violaceous edge looks dark purple, grey-brown or almost black rather than red; the surrounding inflammation is felt (warm, indurated, tender) more than seen',
    'Healing leaves marked post-inflammatory hyperpigmentation and cribriform scars; warn the patient early',
  ],
  redFlags: ['Ulcer doubling in size within days', 'Ulcer that expands after debridement or grafting', 'Fever with multiple ulcers (exclude infection and vasculitis)'],
  criteria: {
    name: 'PARACELSUS score (10 or more: pyoderma gangrenosum highly likely); Delphi consensus criteria (one major + four of eight minor)',
    source: 'Jockenhöfer F, Wollina U, Salva KA, Benson S, Dissemond J. The PARACELSUS score: a novel diagnostic tool for pyoderma gangrenosum. Br J Dermatol. 2019;180(3):615-620. Maverakis E, Ma C, Shinkai K, et al. Diagnostic criteria of ulcerative pyoderma gangrenosum: a Delphi consensus of international experts. JAMA Dermatol. 2018;154(4):461-466.',
    toolId: 'paracelsus',
  },
  biopsy: {
    type: 'Small elliptical or punch biopsy of the inflamed edge, including adjacent intact skin',
    site: 'The advancing violaceous edge (not the necrotic centre)',
    handling: 'Formalin for histology; a second piece in saline for bacterial, AFB and fungal culture. The biopsy excludes mimics: it does not prove PG. Discuss first: even a biopsy can trigger pathergy',
  },
  investigations: [INV.edgeBiopsyDif, INV.tissueCulture, INV.specialStains, INV.fbcFilm, INV.esrCrp, INV.spep, INV.anca, INV.ana, INV.apl, INV.hbv, INV.hcv, INV.hiv, INV.renal, INV.lft, INV.glucose],
  management: {
    immediate: [
      'Stop any sharp debridement; gentle cleansing and moist, non-adherent dressings only',
      'Adequate analgesia (pain is severe)',
      'Look for and treat the associated disease (bowel symptoms, arthritis, blood film, protein electrophoresis)',
      'Exclude infection before immunosuppression (tissue culture, AFB, fungi; hepatitis B, HIV, TB screen)',
    ],
    definitive: [
      'Limited disease: super-potent topical steroid (clobetasol propionate 0.05%) or topical tacrolimus 0.1% to the inflamed edge, or intralesional triamcinolone to the edge',
      'Extensive or rapidly progressive: prednisolone 0.75 mg/kg/day or ciclosporin 4 mg/kg/day (equivalent in the STOP GAP trial), with gastric, bone and glucose protection for steroids',
      'Associated inflammatory bowel disease: infliximab or other anti-TNF with gastroenterology',
      'Grafting or reconstruction only once inflammation is controlled, under continued immunosuppression',
    ],
  },
  warnings: ['Do NOT debride, excise or graft a suspected pyoderma gangrenosum: surgical trauma makes it spread (pathergy).'],
  doNot: ['No sharp or surgical debridement', 'No skin graft or flap while the edge is active', 'No antibiotics alone as the treatment (it is not an infection)'],
  refer: [
    { to: 'dermatology', when: 'Every suspected PG, to confirm and start immunosuppression', urgency: 'soon' },
    { to: 'gastroenterology', when: 'Bowel symptoms, known IBD, or peristomal PG', urgency: 'soon' },
    { to: 'haematology', when: 'Abnormal blood film or a paraprotein', urgency: 'soon' },
  ],
  sources: [
    'Maverakis E et al. JAMA Dermatol. 2018;154(4):461-466 (Delphi diagnostic criteria).',
    'Jockenhöfer F et al. Br J Dermatol. 2019;180(3):615-620 (PARACELSUS).',
    'Ormerod AD, Thomas KS, Craig FE, et al. Comparison of the two most commonly used treatments for pyoderma gangrenosum: results of the STOP GAP randomised controlled trial. BMJ. 2015;350:h2958.',
    'Brooklyn TN, Dunnill MG, Shetty A, et al. Infliximab for the treatment of pyoderma gangrenosum: a randomised, double blind, placebo controlled trial. Gut. 2006;55(4):505-509.',
  ],
  pendingValidation: [],
};

export const CUTANEOUS_SMALL_VESSEL_VASCULITIS: KbCondition = {
  id: 'small_vessel_vasculitis', label: 'Cutaneous small-vessel vasculitis (including IgA vasculitis)', category: 'vasculitis',
  synonyms: ['leukocytoclastic vasculitis', 'cutaneous vasculitis', 'IgA vasculitis', 'Henoch-Schönlein purpura', 'hypersensitivity vasculitis', 'vasculitic ulcer'],
  history: [
    'Crops of painful or burning spots on the lower legs, often after a new drug (last 1–3 weeks) or an infection',
    'Joint pain, abdominal pain, blood in the urine (IgA vasculitis)',
    'Systemic features suggest systemic vasculitis: fever, weight loss, numbness, sinus or lung symptoms',
  ],
  exam: [
    'Palpable purpura on dependent areas, which may blister and ulcerate into small punched-out ulcers',
    'Lesions do not blanch with a glass slide (diascopy)',
  ],
  skinOfColour: [
    'Palpable purpura looks dark purple, brown or black rather than red; feel for the raised, non-blanching papules',
    'Diascopy still works: press a glass slide and look for colour that does not fade',
    'Leaves post-inflammatory hyperpigmentation that can last months',
  ],
  redFlags: ['Blood or protein in the urine, or a raised creatinine', 'Abdominal pain or blood in the stool', 'Numbness or foot drop (mononeuritis)', 'Haemoptysis'],
  criteria: { name: 'Chapel Hill 2012 nomenclature with the dermatological addendum (a naming system, not diagnostic criteria)', source: 'Sunderkötter CH, Zelger B, Chen KR, et al. Nomenclature of cutaneous vasculitis: dermatologic addendum to the 2012 Revised International Chapel Hill Consensus Conference Nomenclature of Vasculitides. Arthritis Rheumatol. 2018;70(2):171-184.' },
  biopsy: {
    type: 'Two punch biopsies of a fresh lesion (under 48 hours old): one in formalin for histology, one perilesional in Michel\'s medium for DIF',
    site: 'The newest purpuric papule; DIF yield falls after 48 hours',
    handling: 'DIF needs Michel\'s medium or saline sent the same day, never formalin; IgA deposits indicate IgA vasculitis',
  },
  investigations: [INV.edgeBiopsyDif, INV.urineDip, INV.renal, INV.fbcFilm, INV.esrCrp, INV.anca, INV.ana, INV.complement, INV.cryo, INV.rf, INV.hbv, INV.hcv, INV.hiv, INV.spep, INV.cxr],
  management: {
    immediate: ['Urine dipstick and blood pressure the same day', 'Stop any likely culprit drug', 'Rest and elevation, compression only after arterial assessment, analgesia'],
    definitive: [
      'Skin-limited and mild: treat the trigger; colchicine or dapsone (check G6PD first) for persistent disease',
      'Ulcerating or systemic: systemic corticosteroids and a steroid-sparing agent, with rheumatology',
    ],
  },
  warnings: ['Check the urine for blood and protein and the blood pressure the same day: kidney involvement changes the urgency.'],
  doNot: ['Do not start dapsone without a G6PD result'],
  refer: [
    { to: 'rheumatology', when: 'Systemic features, abnormal urine or creatinine, positive ANCA, or ulcerating disease', urgency: 'urgent' },
    { to: 'dermatology', when: 'Skin-limited disease needing biopsy and treatment', urgency: 'soon' },
    { to: 'nephrology', when: 'Haematuria with proteinuria or a rising creatinine', urgency: 'urgent' },
  ],
  sources: [
    'Jennette JC, Falk RJ, Bacon PA, et al. 2012 Revised International Chapel Hill Consensus Conference Nomenclature of Vasculitides. Arthritis Rheum. 2013;65(1):1-11.',
    'Sunderkötter CH et al. Arthritis Rheumatol. 2018;70(2):171-184.',
  ],
  pendingValidation: ['Choice and order of colchicine versus dapsone for chronic skin-limited vasculitis: practice-based, no single cited guideline.'],
};

export const ANCA_MEDIUM_VESSEL_VASCULITIS: KbCondition = {
  id: 'systemic_vasculitis', label: 'Systemic vasculitis (ANCA-associated or polyarteritis nodosa)', category: 'vasculitis',
  synonyms: ['ANCA vasculitis', 'granulomatosis with polyangiitis', 'GPA', 'microscopic polyangiitis', 'MPA', 'EGPA', 'polyarteritis nodosa', 'PAN'],
  history: [
    'Fever, weight loss, night sweats, joint and muscle pain',
    'Nose bleeds, crusting, sinusitis, hearing loss (GPA); asthma and nasal polyps (EGPA)',
    'Cough or haemoptysis; numbness or foot drop (mononeuritis multiplex)',
    'Hepatitis B (polyarteritis nodosa)',
  ],
  exam: [
    'Deep, punched-out, painful ulcers on the legs with livedo racemosa or tender subcutaneous nodules (medium vessels)',
    'Palpable purpura, digital infarcts, splinter haemorrhages',
    'Saddle nose, red eye (scleritis), raised blood pressure',
  ],
  skinOfColour: [
    'Livedo looks as a violaceous to dark-brown net rather than red-blue; view in good light and stretch the skin',
    'Digital infarcts appear as black or grey-black areas on the finger pulp',
  ],
  redFlags: ['Haematuria with proteinuria or rising creatinine (rapidly progressive glomerulonephritis)', 'Haemoptysis', 'Mononeuritis multiplex', 'Digital gangrene'],
  criteria: {
    name: '2022 ACR/EULAR classification criteria for GPA, MPA and EGPA (classification only, after a vasculitis diagnosis is made and mimics excluded)',
    source: 'Robson JC et al. Ann Rheum Dis. 2022;81(3):315-320 (GPA). Suppiah R et al. Ann Rheum Dis. 2022;81(3):321-326 (MPA). Grayson PC et al. Ann Rheum Dis. 2022;81(3):309-314 (EGPA).',
    toolId: 'anca2022', classificationOnly: true,
  },
  biopsy: {
    type: 'Deep incisional biopsy including subcutaneous fat (medium vessels), plus DIF from a fresh lesion',
    site: 'The edge of an ulcer or a tender nodule / livedo branch; a punch biopsy often misses medium vessels',
    handling: 'Formalin for histology; Michel\'s medium for DIF',
  },
  investigations: [INV.urineDip, INV.renal, INV.anca, INV.deepIncisional, INV.edgeBiopsyDif, INV.fbcFilm, INV.esrCrp, INV.hbv, INV.hcv, INV.hiv, INV.cxr, INV.ana, INV.complement, INV.cryo],
  management: {
    immediate: ['Same-day urine dipstick, blood pressure and creatinine', 'Urgent rheumatology discussion for organ-threatening disease'],
    definitive: [
      'Organ- or life-threatening ANCA vasculitis: glucocorticoids plus rituximab or cyclophosphamide (EULAR 2022), by rheumatology / nephrology',
      'Hepatitis B-associated PAN: antiviral treatment with a short steroid course, never long immunosuppression alone',
    ],
  },
  warnings: ['Check the urine for blood and protein and the blood pressure the same day: kidney involvement changes the urgency.', 'Classification criteria are not diagnostic criteria: use them only once vasculitis is diagnosed and mimics are excluded.'],
  doNot: ['Do not start immunosuppression before hepatitis B, HIV and TB status is known (unless life-threatening, with specialist advice)'],
  refer: [{ to: 'rheumatology', when: 'Every suspected systemic vasculitis', urgency: 'urgent' }, { to: 'nephrology', when: 'Active urine sediment or rising creatinine', urgency: 'urgent' }],
  sources: [
    'Jennette JC et al. Arthritis Rheum. 2013;65(1):1-11 (Chapel Hill 2012).',
    'Robson JC, Grayson PC, Ponte C, et al. 2022 American College of Rheumatology/European Alliance of Associations for Rheumatology classification criteria for granulomatosis with polyangiitis. Ann Rheum Dis. 2022;81(3):315-320.',
    'Suppiah R, Robson JC, Grayson PC, et al. 2022 ACR/EULAR classification criteria for microscopic polyangiitis. Ann Rheum Dis. 2022;81(3):321-326.',
    'Grayson PC, Ponte C, Suppiah R, et al. 2022 ACR/EULAR classification criteria for eosinophilic granulomatosis with polyangiitis. Ann Rheum Dis. 2022;81(3):309-314.',
    'Hellmich B, Sanchez-Alamo B, Schirmer JH, et al. EULAR recommendations for the management of ANCA-associated vasculitis: 2022 update. Ann Rheum Dis. 2024;83(1):30-47.',
  ],
  pendingValidation: [],
};

export const SLE_ULCER: KbCondition = {
  id: 'sle', label: 'Systemic lupus erythematosus (cutaneous / vasculitic ulcers)', category: 'connective_tissue',
  synonyms: ['lupus', 'SLE', 'systemic lupus', 'discoid lupus', 'lupus ulcer'],
  history: ['Young woman with joint pains, mouth ulcers, hair loss, photosensitive rash, fevers', 'Raynaud\'s, miscarriages or clots (antiphospholipid antibodies)', 'Foamy urine, swelling (lupus nephritis)'],
  exam: [
    'Malar or photosensitive rash, discoid plaques with scarring and follicular plugging, non-scarring alopecia, oral ulcers',
    'Leg ulcers from vasculitis or antiphospholipid vasculopathy (livedo, retiform purpura)',
  ],
  skinOfColour: [
    'Discoid lupus in dark skin shows central depigmentation with a hyperpigmented rim; scarring alopecia is common',
    'The malar rash may look violaceous or hyperpigmented rather than red',
  ],
  redFlags: ['Proteinuria or haematuria', 'Seizures, psychosis or confusion', 'Platelets below 100 or haemolysis', 'Pleuritic chest pain'],
  criteria: { name: '2019 EULAR/ACR classification criteria for SLE (entry: ANA 1:80 or more; 10 or more points)', source: 'Aringer M, Costenbader K, Daikh D, et al. 2019 European League Against Rheumatism/American College of Rheumatology classification criteria for systemic lupus erythematosus. Arthritis Rheumatol. 2019;71(9):1400-1412.', toolId: 'sle2019', classificationOnly: true },
  biopsy: { type: 'Punch biopsy of a skin lesion for histology, plus DIF; ulcer edge biopsy if ulcerated', site: 'An active (not old, scarred) lesion; for an ulcer, the inflamed edge', handling: 'Formalin for histology; Michel\'s medium for DIF (lupus band)' },
  investigations: [INV.ana, INV.dsdna, INV.ena, INV.complement, INV.apl, INV.fbcFilm, INV.urineDip, INV.uacr, INV.renal, INV.esrCrp, INV.edgeBiopsyDif, INV.hiv],
  management: {
    immediate: ['Urine dipstick, blood pressure and creatinine', 'Sun protection'],
    definitive: ['Hydroxychloroquine for every patient with SLE unless contraindicated (baseline eye check), with rheumatology', 'Treat ulcers by mechanism: vasculitis (immunosuppression) or antiphospholipid (anticoagulation)'],
  },
  warnings: ['Classification criteria support, but do not replace, a specialist diagnosis.'],
  doNot: ['Do not stop hydroxychloroquine because of the ulcer'],
  refer: [{ to: 'rheumatology', when: 'Suspected or known SLE with an ulcer', urgency: 'soon' }, { to: 'nephrology', when: 'Proteinuria or active sediment', urgency: 'urgent' }],
  sources: [
    'Aringer M et al. Arthritis Rheumatol. 2019;71(9):1400-1412 (EULAR/ACR 2019).',
    'Fanouriakis A, Kostopoulou M, Andersen J, et al. EULAR recommendations for the management of systemic lupus erythematosus: 2023 update. Ann Rheum Dis. 2024;83(1):15-29.',
  ],
  pendingValidation: [],
};

export const SYSTEMIC_SCLEROSIS: KbCondition = {
  id: 'systemic_sclerosis', label: 'Systemic sclerosis (digital ulcers)', category: 'connective_tissue',
  synonyms: ['scleroderma', 'systemic sclerosis', 'SSc', 'digital ulcer', 'CREST', 'limited cutaneous systemic sclerosis'],
  history: ['Raynaud\'s phenomenon (white, then blue, then red fingers in the cold)', 'Tight skin of the fingers, face or trunk; reflux or swallowing difficulty', 'Breathlessness (lung fibrosis or pulmonary hypertension)'],
  exam: [
    'Painful fingertip ulcers, pitting scars and loss of pulp; ulcers over knuckles and elbows',
    'Puffy fingers or sclerodactyly; skin thickening proximal to the MCP joints',
    'Telangiectasia (face, hands), calcinosis, abnormal nail-fold capillaries',
  ],
  skinOfColour: [
    'Salt-and-pepper dyspigmentation (depigmentation with preserved perifollicular pigment) is typical in dark skin',
    'Raynaud\'s colour change is harder to see: ask the patient to describe it, or look at the nail beds',
  ],
  redFlags: ['Critical digital ischaemia (persistent blue or black fingertip)', 'New hypertension or falling urine output (scleroderma renal crisis)', 'Progressive breathlessness'],
  criteria: { name: '2013 ACR/EULAR classification criteria for systemic sclerosis (9 or more points)', source: 'van den Hoogen F, Khanna D, Fransen J, et al. 2013 classification criteria for systemic sclerosis: an American College of Rheumatology/European League Against Rheumatism collaborative initiative. Arthritis Rheum. 2013;65(11):2737-2747.', toolId: 'ssc2013', classificationOnly: true },
  investigations: [INV.ana, INV.ena, INV.fbcFilm, INV.renal, INV.urineDip, INV.esrCrp, INV.cxr, INV.echo, INV.swab, INV.xrayBone],
  management: {
    immediate: ['Keep the whole body and hands warm; stop smoking', 'Treat infection of a digital ulcer promptly (X-ray if bone may be involved)', 'Analgesia; gentle moist dressings'],
    definitive: [
      'Calcium-channel blocker (nifedipine) for Raynaud\'s; PDE-5 inhibitor (sildenafil) or IV iloprost for digital ulcers (EULAR 2017), with rheumatology',
      'Debridement of a digital ulcer only by an experienced clinician, conservatively',
    ],
  },
  warnings: ['Measure blood pressure at every visit: scleroderma renal crisis presents with new hypertension.', 'Classification criteria support, but do not replace, a specialist diagnosis.'],
  doNot: ['No vasoconstrictors (adrenaline in local anaesthetic) in the digits', 'No high-dose steroids without rheumatology advice (renal crisis risk)'],
  refer: [{ to: 'rheumatology', when: 'Every suspected systemic sclerosis; urgently for critical digital ischaemia', urgency: 'soon' }],
  sources: [
    'van den Hoogen F et al. Arthritis Rheum. 2013;65(11):2737-2747 (ACR/EULAR 2013).',
    'Kowal-Bielecka O, Fransen J, Avouac J, et al. Update of EULAR recommendations for the treatment of systemic sclerosis. Ann Rheum Dis. 2017;76(8):1327-1339.',
  ],
  pendingValidation: ['"No adrenaline in digital local anaesthetic" is a conservative practice default in severe Raynaud\'s / SSc, not a cited guideline statement.'],
};

export const RHEUMATOID_ULCER: KbCondition = {
  id: 'rheumatoid_ulcer', label: 'Rheumatoid arthritis leg ulcer / rheumatoid vasculitis', category: 'connective_tissue',
  synonyms: ['rheumatoid ulcer', 'rheumatoid vasculitis', 'RA ulcer'],
  history: ['Long-standing, seropositive, nodular rheumatoid arthritis; smoker', 'Steroids or methotrexate (fragile skin, poor healing)', 'Ulcer is often mixed: venous, arterial, pressure, vasculitis'],
  exam: ['Deep punched-out ulcers on the lower leg or foot, nail-fold infarcts, rheumatoid nodules', 'Joint deformity and reduced mobility'],
  skinOfColour: ['Nail-fold infarcts appear as small black or dark-brown dots at the nail fold'],
  redFlags: ['Mononeuritis multiplex', 'Digital gangrene', 'Scleritis'],
  criteria: { name: '2010 ACR/EULAR classification criteria for rheumatoid arthritis (for the arthritis, not the ulcer)', source: 'Aletaha D, Neogi T, Silman AJ, et al. 2010 rheumatoid arthritis classification criteria. Arthritis Rheum. 2010;62(9):2569-2581.' },
  biopsy: { type: 'Deep incisional edge biopsy (vasculitis versus PG versus malignancy)', site: 'The edge, including subcutaneous fat', handling: 'Formalin; DIF if vasculitis suspected' },
  investigations: [INV.rf, INV.ccp, INV.fbcFilm, INV.esrCrp, INV.complement, INV.doppler, INV.deepIncisional, INV.urineDip, INV.renal, INV.hbv, INV.hcv],
  management: {
    immediate: ['Assess arterial supply (ABPI) and venous component', 'Optimise pressure off-loading'],
    definitive: ['Rheumatoid vasculitis: systemic immunosuppression with rheumatology', 'Treat each component (compression only if ABPI allows)'],
  },
  warnings: ['An RA ulcer is often several things at once; a non-healing one needs a biopsy (vasculitis, PG and malignancy look alike).'],
  doNot: ['Do not assume a venous cause without ABPI and examination'],
  refer: [{ to: 'rheumatology', when: 'Suspected rheumatoid vasculitis or treatment review', urgency: 'soon' }],
  sources: ['Aletaha D et al. Arthritis Rheum. 2010;62(9):2569-2581.', 'Jennette JC et al. Arthritis Rheum. 2013;65(1):1-11 (Chapel Hill 2012: rheumatoid vasculitis as vasculitis associated with systemic disease).'],
  pendingValidation: ['Management of rheumatoid vasculitis ulcers: no current guideline cited; specialist practice.'],
};

export const ANTIPHOSPHOLIPID: KbCondition = {
  id: 'antiphospholipid', label: 'Antiphospholipid syndrome (livedoid / thrombotic ulcers)', category: 'vasculopathy',
  synonyms: ['antiphospholipid syndrome', 'APS', 'Hughes syndrome', 'lupus anticoagulant'],
  history: ['Previous DVT, stroke or miscarriages', 'Known SLE', 'Painful ulcers with net-like skin pattern'],
  exam: ['Livedo racemosa (broken, irregular net)', 'Painful ulcers and retiform (star-shaped) purpura with necrosis', 'Splinter haemorrhages, digital gangrene'],
  skinOfColour: ['Livedo racemosa shows as a dark violaceous-brown broken net; retiform purpura as stellate grey-black necrosis'],
  redFlags: ['Rapidly spreading necrosis with organ dysfunction (catastrophic APS)', 'Digital gangrene'],
  criteria: { name: '2023 ACR/EULAR antiphospholipid syndrome classification criteria', source: 'Barbhaiya M, Zuily S, Naden R, et al. The 2023 ACR/EULAR antiphospholipid syndrome classification criteria. Arthritis Rheumatol. 2023;75(10):1687-1702.' },
  biopsy: { type: 'Deep incisional biopsy of the edge / a purpuric area', site: 'Retiform purpura edge, including fat', handling: 'Formalin: thrombi without vasculitis' },
  investigations: [INV.apl, INV.coag, INV.fbcFilm, INV.ana, INV.dsdna, INV.complement, INV.vdrl, INV.renal, INV.deepIncisional],
  management: {
    immediate: ['Analgesia and moist dressings', 'Lupus anticoagulant testing BEFORE anticoagulation where possible (warfarin and DOACs interfere)'],
    definitive: ['Thrombotic APS: long-term warfarin (target INR 2–3) with haematology; avoid DOACs in triple-positive APS (EULAR 2019)'],
  },
  warnings: ['A positive antiphospholipid test must be repeated at least 12 weeks later before the diagnosis is made.'],
  doNot: ['Do not use rivaroxaban or other DOACs in triple-positive APS'],
  refer: [{ to: 'haematology', when: 'Positive antiphospholipid antibodies or thrombotic ulcers', urgency: 'soon' }, { to: 'rheumatology', when: 'Associated SLE or other connective tissue disease', urgency: 'soon' }],
  sources: [
    'Barbhaiya M et al. Arthritis Rheumatol. 2023;75(10):1687-1702 (2023 ACR/EULAR APS criteria).',
    'Tektonidou MG, Andreoli L, Limper M, et al. EULAR recommendations for the management of antiphospholipid syndrome in adults. Ann Rheum Dis. 2019;78(10):1296-1304.',
  ],
  pendingValidation: [],
};

export const CRYOGLOBULINAEMIA: KbCondition = {
  id: 'cryoglobulinaemia', label: 'Cryoglobulinaemic vasculitis', category: 'vasculitis',
  synonyms: ['cryoglobulinaemia', 'cryoglobulinemia', 'mixed cryoglobulinaemia'],
  history: ['Hepatitis C (most mixed cryoglobulinaemia), hepatitis B, HIV, Sjögren\'s, lymphoma or myeloma', 'Purpura, joint pain and weakness; symptoms worse in the cold'],
  exam: ['Palpable purpura of the legs, ulcers above the ankles, acral necrosis in the cold', 'Peripheral neuropathy'],
  skinOfColour: ['Purpura looks dark brown-purple; chronic lesions leave ochre-brown hyperpigmentation of the shins'],
  redFlags: ['Haematuria / proteinuria', 'Digital necrosis'],
  criteria: { name: 'Preliminary classification criteria for cryoglobulinaemic vasculitis (De Vita 2011)', source: 'De Vita S, Soldano F, Isola M, et al. Preliminary classification criteria for the cryoglobulinaemic vasculitis. Ann Rheum Dis. 2011;70(7):1183-1190.' },
  biopsy: { type: 'Punch biopsy of fresh purpura for histology and DIF; edge biopsy of an ulcer', site: 'Newest lesion', handling: 'Formalin and Michel\'s medium' },
  investigations: [INV.cryo, INV.complement, INV.rf, INV.hcv, INV.hbv, INV.hiv, INV.spep, INV.urineDip, INV.renal, INV.fbcFilm, INV.edgeBiopsyDif],
  management: {
    immediate: ['Keep warm', 'Urine and creatinine'],
    definitive: ['Treat the cause: direct-acting antivirals for hepatitis C; rituximab for severe vasculitis, with rheumatology / haematology'],
  },
  warnings: ['The blood for cryoglobulins must be kept at 37 °C until the laboratory separates it, or the test is falsely negative.'],
  doNot: [],
  refer: [{ to: 'rheumatology', when: 'Suspected cryoglobulinaemic vasculitis', urgency: 'soon' }, { to: 'infectious_disease', when: 'Hepatitis B or C', urgency: 'soon' }],
  sources: ['De Vita S et al. Ann Rheum Dis. 2011;70(7):1183-1190.', 'Cacoub P, Comarmond C, Domont F, Savey L, Saadoun D. Cryoglobulinemia vasculitis. Am J Med. 2015;128(9):950-955.'],
  pendingValidation: [],
};

export const CALCIPHYLAXIS: KbCondition = {
  id: 'calciphylaxis', label: 'Calciphylaxis (calcific uraemic arteriolopathy)', category: 'metabolic',
  synonyms: ['calciphylaxis', 'calcific uraemic arteriolopathy', 'CUA'],
  history: ['Kidney failure on dialysis (most); also obesity, diabetes, warfarin, hyperparathyroidism, female', 'Exquisitely painful skin before any ulcer appears'],
  exam: ['Painful violaceous indurated plaques with retiform purpura, progressing to black eschar and ulcers', 'Fatty areas (thighs, abdomen, buttocks) or distal legs'],
  skinOfColour: ['Early plaques are dark, firm and tender rather than visibly purple; feel for induration. Eschar is black-grey'],
  redFlags: ['Sepsis from infected eschar (leading cause of death)', 'Rapid spread'],
  biopsy: {
    type: 'Deep incisional (telescoping) biopsy reaching subcutaneous fat, from the edge of a purpuric area (not the necrotic centre)',
    site: 'Edge of the lesion; avoid the distal leg where possible',
    handling: 'Formalin; ask for von Kossa / Alizarin red stains for calcium. Biopsy can itself ulcerate and is debated: discuss first',
  },
  investigations: [INV.renal, INV.caPhos, INV.coag, INV.deepIncisional, INV.fbcFilm, INV.esrCrp, INV.swab, INV.apl],
  management: {
    immediate: ['Strong analgesia (often opioids)', 'Treat infection promptly; sepsis is the main cause of death', 'Review and stop warfarin, calcium and vitamin D supplements with the renal team'],
    definitive: ['Nephrology-led: intensified dialysis, normalise calcium and phosphate, parathyroid control; sodium thiosulfate is widely used (evidence limited)', 'Debridement of necrotic tissue is individualised; most stable eschar is left intact'],
  },
  warnings: ['Calciphylaxis has a high mortality: involve the renal team the same week.'],
  doNot: ['Do not give calcium or vitamin D supplements', 'Do not continue warfarin without specialist review'],
  refer: [{ to: 'nephrology', when: 'Every suspected calciphylaxis', urgency: 'urgent' }, { to: 'dermatology', when: 'To confirm the diagnosis', urgency: 'soon' }],
  sources: ['Nigwekar SU, Thadhani R, Brandenburg VM. Calciphylaxis. N Engl J Med. 2018;378(18):1704-1714.'],
  pendingValidation: ['Whether and when to debride calciphylaxis eschar is not settled in the source; left to the treating team.'],
};

export const LIVEDOID_VASCULOPATHY: KbCondition = {
  id: 'livedoid_vasculopathy', label: 'Livedoid vasculopathy', category: 'vasculopathy',
  synonyms: ['livedoid vasculopathy', 'atrophie blanche', 'livedoid vasculitis'],
  history: ['Recurrent, very painful small ulcers around the ankles, worse in summer', 'Clotting tendency'],
  exam: ['Small painful ulcers at the ankles and feet that heal to white, star-shaped atrophic scars (atrophie blanche) with surrounding livedo'],
  skinOfColour: ['Atrophie blanche scars are porcelain-white against hyperpigmented surrounding skin; easily mistaken for vitiligo'],
  redFlags: ['Livedo with ulcers and clots elsewhere (antiphospholipid syndrome)', 'Rapidly spreading necrosis (exclude vasculitis and calciphylaxis)'],
  biopsy: { type: 'Punch or incisional biopsy of the edge of a fresh ulcer / purpura', site: 'Edge of a new lesion', handling: 'Formalin: hyaline thrombi in dermal vessels, no true vasculitis' },
  investigations: [INV.apl, INV.coag, INV.fbcFilm, INV.ana, INV.cryo, INV.edgeBiopsyDif, INV.doppler],
  management: { immediate: ['Analgesia, compression if ABPI allows, stop smoking'], definitive: ['Anticoagulation (rivaroxaban has been used) or antiplatelet therapy with dermatology / haematology'] },
  warnings: [],
  doNot: [],
  refer: [{ to: 'dermatology', when: 'Suspected livedoid vasculopathy', urgency: 'routine' }, { to: 'haematology', when: 'Thrombophilia found', urgency: 'soon' }],
  sources: ['Micieli R, Alavi A. Treatment for livedoid vasculopathy: a systematic review. JAMA Dermatol. 2018;154(2):193-202.'],
  pendingValidation: ['First-line choice (anticoagulant versus antiplatelet): evidence is from case series in the cited review.'],
};

export const NECROBIOSIS_LIPOIDICA: KbCondition = {
  id: 'necrobiosis_lipoidica', label: 'Necrobiosis lipoidica', category: 'metabolic',
  synonyms: ['necrobiosis lipoidica', 'necrobiosis lipoidica diabeticorum', 'NLD'],
  history: ['Diabetes (often type 1) in many, but not all', 'Slowly enlarging painless plaque on the shins, which ulcerates after minor injury'],
  exam: ['Yellow-brown, waxy, atrophic plaque with telangiectasia and a raised violaceous rim on the shins; may ulcerate'],
  skinOfColour: ['The plaque looks brown to violaceous with a yellowish centre; the telangiectasia are hard to see but the atrophic, shiny surface is felt'],
  redFlags: ['A nodule or new ulcer in a long-standing plaque (squamous cell carcinoma has been reported)'],
  biopsy: { type: 'Punch biopsy of the active rim, if the diagnosis is uncertain', site: 'The rim, not the atrophic centre (heals poorly)', handling: 'Formalin' },
  investigations: [INV.glucose, INV.punch, INV.wedgeEdgeBiopsy],
  management: { immediate: ['Protect the shins from injury; moist dressings for ulcers'], definitive: ['Potent topical or intralesional steroid to the active rim; optimise glucose control'] },
  warnings: [],
  doNot: ['Do not biopsy the atrophic centre of the plaque'],
  refer: [{ to: 'dermatology', when: 'Ulcerated or spreading necrobiosis lipoidica', urgency: 'routine' }],
  sources: ['Reid SD, Ladizinski B, Lee K, Baibergenova A, Alavi A. Update on necrobiosis lipoidica: a review of etiology, diagnosis, and treatment options. J Am Acad Dermatol. 2013;69(5):783-791.'],
  pendingValidation: [],
};

export const SICKLE_CELL_ULCER: KbCondition = {
  id: 'sickle_cell_ulcer', label: 'Sickle cell leg ulcer', category: 'haematological',
  synonyms: ['sickle cell ulcer', 'sickle ulcer', 'SCD leg ulcer'],
  history: ['Sickle cell disease (HbSS commonest; also HbSC, sickle-β-thalassaemia)', 'Recurrent, very painful ulcers that start after minor injury, lasting months to years'],
  exam: ['Punched-out ulcer over the medial or lateral malleolus, with a sloughy base and hyperpigmented surrounding skin'],
  skinOfColour: ['Surrounding skin is hyperpigmented and indurated; healed ulcers leave hypo- or hyperpigmented atrophic scars'],
  redFlags: ['Long-standing ulcer with a rolled or heaped edge (malignant change)', 'Osteomyelitis'],
  investigations: [INV.hbGenotype, INV.fbcFilm, INV.swab, INV.xrayBone, INV.doppler, INV.wedgeEdgeBiopsy],
  management: {
    immediate: ['Analgesia (ulcer pain is often severe)', 'Rest, elevation, moist dressings; compression if ABPI allows'],
    definitive: ['Haematology review: hydroxyurea is not stopped for the ulcer as a rule (owner to confirm); transfusion in selected cases', 'Skin graft once clean; recurrence is common'],
  },
  warnings: ['Do not give empiric iron in sickle cell disease (practice hard rule): check ferritin first.'],
  doNot: ['No empiric iron'],
  refer: [{ to: 'haematology', when: 'Every sickle cell leg ulcer', urgency: 'soon' }],
  sources: ['Minniti CP, Kato GJ. Critical reviews: how we treat sickle cell patients with leg ulcers. Am J Hematol. 2016;91(1):22-30.', 'AstroHEALTH Wound Clinic Protocol (26 Nov 2026): no empiric iron in sickle cell disease.'],
  pendingValidation: ['Hydroxyurea and leg ulcers: the cited review discusses whether hydroxyurea worsens ulcers; the practice default needs the owner\'s confirmation.'],
};

export const RHEUM_CONDITIONS: KbCondition[] = [
  PYODERMA_GANGRENOSUM, CUTANEOUS_SMALL_VESSEL_VASCULITIS, ANCA_MEDIUM_VESSEL_VASCULITIS, SLE_ULCER, SYSTEMIC_SCLEROSIS,
  RHEUMATOID_ULCER, ANTIPHOSPHOLIPID, CRYOGLOBULINAEMIA, CALCIPHYLAXIS, LIVEDOID_VASCULOPATHY, NECROBIOSIS_LIPOIDICA, SICKLE_CELL_ULCER,
];
