/**
 * Knowledge base, part 2: malignant ulcers and tumours, tropical and
 * mycobacterial infection, follicular disease, scar-like tumours and severe
 * drug reactions. Clinician text; see rheum.ts for the conventions.
 */
import { INV } from './investigations';
import type { KbCondition } from './types';

export const MARJOLIN_SCC: KbCondition = {
  id: 'marjolin_scc', label: 'Squamous cell carcinoma / Marjolin ulcer', category: 'malignant',
  synonyms: ['Marjolin ulcer', 'Marjolin', 'squamous cell carcinoma', 'SCC', 'malignant ulcer', 'scar carcinoma'],
  history: [
    'An ulcer in an old burn scar, chronic osteomyelitis sinus, chronic venous or tropical ulcer, or a scar of years (often 20–30 years)',
    'A change: new growth, bleeding, smell, pain, or an ulcer that will not heal despite good care',
    'Albinism, HIV, previous skin cancer',
  ],
  exam: ['Rolled, heaped or everted edge; exuberant, friable or cauliflower base that bleeds easily', 'Induration beyond the ulcer; fixity to bone; enlarged firm regional nodes'],
  skinOfColour: [
    'In Black African patients SCC arises mostly in scars and chronic ulcers on non-sun-exposed skin (legs), not sun-damaged skin',
    'The edge may look grey-white or hyperpigmented rather than pearly',
  ],
  redFlags: ['Ulcer in a burn scar', 'Rolled or everted edge', 'Bleeding, friable base', 'Palpable regional nodes'],
  biopsy: {
    type: 'Multiple wedge / incisional biopsies of the edge AND the base (malignancy can be patchy)',
    site: 'At least 2–4 sites in a large ulcer, including the most raised edge',
    handling: 'Formalin; ask for depth, differentiation and perineural invasion. A negative biopsy of a suspicious ulcer is repeated',
  },
  investigations: [INV.wedgeEdgeBiopsy, INV.usNodes, INV.xrayBone, INV.mriLocal, INV.cxr, INV.fbcFilm, INV.hiv],
  management: {
    immediate: ['Biopsy before any reconstruction or graft', 'Examine the regional lymph nodes'],
    definitive: ['Wide local excision with clinical margins (at least 1–2 cm for high-risk SCC), amputation if bone or joint involved; graft or flap', 'Node dissection for clinically involved nodes; MDT for adjuvant radiotherapy'],
  },
  warnings: ['Biopsy any ulcer that has not healed in about 3 months, or that has atypical features, to exclude malignancy.'],
  doNot: ['Do not skin-graft a chronic scar ulcer before a biopsy has excluded malignancy'],
  refer: [{ to: 'oncology', when: 'Confirmed SCC: tumour board for nodes, bone and radiotherapy', urgency: 'soon' }],
  sources: [
    'Stratigos AJ, Garbe C, Dessinioti C, et al. European interdisciplinary guideline on invasive squamous cell carcinoma of the skin: Part 2. Treatment. Eur J Cancer. 2020;128:83-102.',
    'NICE NG12. Suspected cancer: recognition and referral (2015, updated 2023).',
    'Bazaliński D, Przybek-Mita J, Barańska B, Więch P. Marjolin\'s ulcer in chronic wounds – review of available literature. Contemp Oncol (Pozn). 2017;21(3):197-202.',
  ],
  pendingValidation: ['The "about 3 months" biopsy threshold is the AstroHEALTH Wound Clinic Protocol / common practice; guidelines differ on the exact interval.'],
};

export const BCC: KbCondition = {
  id: 'bcc', label: 'Basal cell carcinoma (ulcerated / rodent ulcer)', category: 'malignant',
  synonyms: ['basal cell carcinoma', 'BCC', 'rodent ulcer'],
  history: ['Slow-growing (months to years) lesion on the face or other sun-exposed skin; bleeds and crusts, never heals', 'Albinism (very high risk in Nigeria)'],
  exam: ['Pearly, rolled edge with telangiectasia and a central ulcer; pigmented BCC is common in dark skin'],
  skinOfColour: ['In dark skin BCC is often pigmented (brown-black) and can be mistaken for melanoma or a seborrhoeic keratosis'],
  redFlags: ['Near the eye, nose or ear (high-risk site)', 'Recurrent after excision'],
  biopsy: { type: 'Punch or incisional biopsy (or excision biopsy if small)', site: 'The rolled edge', handling: 'Formalin; subtype (nodular, infiltrative, morphoeic)' },
  investigations: [INV.punch, INV.excisionBiopsy],
  management: { immediate: ['Biopsy to confirm'], definitive: ['Surgical excision with 4 mm margins for low-risk BCC; wider or margin-controlled surgery for high-risk sites and subtypes'] },
  warnings: [],
  doNot: ['Do not treat a pigmented lesion by cautery or cryotherapy without histology'],
  refer: [{ to: 'dermatology', when: 'High-risk site or subtype, recurrence, or albinism surveillance', urgency: 'soon' }],
  sources: ['Peris K, Fargnoli MC, Kaufmann R, et al. European consensus-based interdisciplinary guideline for diagnosis and treatment of basal cell carcinoma—update 2023. Eur J Cancer. 2023;192:113254.'],
  pendingValidation: [],
};

export const ACRAL_MELANOMA: KbCondition = {
  id: 'acral_melanoma', label: 'Acral lentiginous melanoma', category: 'malignant',
  synonyms: ['acral lentiginous melanoma', 'acral melanoma', 'subungual melanoma', 'plantar melanoma', 'melanoma'],
  history: [
    'A dark patch, lump or non-healing "wound" on the sole, palm or under a nail, often noticed late or treated as a corn, fungus or ulcer',
    'Change in size, shape or colour; bleeding; a nail streak that widens',
    'Acral lentiginous melanoma is the commonest melanoma in Black African patients',
  ],
  exam: [
    'Irregular, multicoloured (brown, black, blue-grey) macule or plaque on the sole or palm, often with a nodule or ulcer',
    'Nail: longitudinal pigmented band over 3 mm, widening, with pigment spreading onto the nail fold (Hutchinson sign)',
    'Groin or axillary nodes; in-transit nodules',
  ],
  skinOfColour: [
    'Benign acral naevi and ethnic nail pigmentation are common in dark skin: change, irregularity, width over 3 mm, a single nail, or Hutchinson sign point to melanoma',
    'A non-pigmented (amelanotic) acral melanoma looks like a pyogenic granuloma or a chronic ulcer',
  ],
  redFlags: ['Ulcerated or nodular plantar lesion', 'Widening nail band or Hutchinson sign', 'Palpable groin nodes'],
  criteria: { name: 'ABCDE, the weighted 7-point checklist, and the CUBED aid for acral lesions', source: 'Abbasi NR et al. JAMA. 2004;292(22):2771-2776. NICE NG12 (weighted 7-point checklist). Bristow IR, de Berker DA, Acland KM, Turner RJ, Bowling J. Clinical guidelines for the recognition of melanoma of the foot and nail unit. J Foot Ankle Res. 2010;3:25.', toolId: 'seven_point' },
  biopsy: {
    type: 'Excision biopsy with a 2 mm margin and a cuff of fat; for a large plantar or nail lesion, a full-thickness incisional or punch biopsy of the darkest / thickest area (nail matrix biopsy for a nail band)',
    site: 'The thickest, darkest or nodular part',
    handling: 'Formalin; orientate; ask for Breslow thickness, ulceration and mitoses',
  },
  investigations: [INV.excisionBiopsy, INV.incisionBiopsy, INV.usNodes, INV.ctStaging, INV.fbcFilm, INV.lft],
  management: {
    immediate: ['Diagnostic biopsy without delay; never shave, curette or cauterise a suspicious acral lesion'],
    definitive: ['Wide local excision by Breslow thickness (1 cm for up to 1 mm; 1–2 cm for 1–2 mm; 2 cm over 2 mm); toe or ray amputation for subungual melanoma', 'Sentinel node biopsy where available; tumour board for stage III–IV'],
  },
  warnings: ['A pigmented or non-healing lesion on the sole, palm or nail is melanoma until histology says otherwise: full-thickness biopsy, never shave, curette or cautery.'],
  doNot: ['No shave biopsy, curettage, cautery or cryotherapy', 'Do not treat as a fungal nail or a corn without histology'],
  refer: [{ to: 'oncology', when: 'Confirmed melanoma: tumour board', urgency: 'urgent' }],
  sources: [
    'Bradford PT, Goldstein AM, McMaster ML, Tucker MA. Acral lentiginous melanoma: incidence and survival patterns in the United States, 1986-2005. Arch Dermatol. 2009;145(4):427-434.',
    'Bristow IR et al. J Foot Ankle Res. 2010;3:25 (CUBED).',
    'NICE NG14. Melanoma: assessment and management (2015, updated 2022).',
    'Garbe C, Amaral T, Peris K, et al. European consensus-based interdisciplinary guideline for melanoma. Part 2: Treatment – update 2022. Eur J Cancer. 2022;170:256-284.',
  ],
  pendingValidation: ['Margin bands follow NICE NG14 / European guideline; confirm against the practice\'s tumour board policy.'],
};

export const KAPOSI_SARCOMA: KbCondition = {
  id: 'kaposi_sarcoma', label: 'Kaposi sarcoma', category: 'malignant',
  synonyms: ['Kaposi sarcoma', 'Kaposi', 'KS'],
  history: ['HIV (epidemic KS); endemic African KS in HIV-negative adults and children; transplant / immunosuppression', 'Leg swelling, painful nodules, mouth lesions, cough'],
  exam: ['Violaceous to black macules, plaques and nodules, often on the legs and feet with lymphoedema; may ulcerate and bleed', 'Oral (palate) lesions'],
  skinOfColour: ['Lesions look dark brown to black rather than purple; they are firm, often in groups, and may be mistaken for bruises or pigmented naevi'],
  redFlags: ['Oral or visceral involvement (cough, haemoptysis, GI bleeding)', 'Rapid progression or severe lymphoedema'],
  biopsy: { type: 'Punch or incisional biopsy of a nodule', site: 'A representative nodule (bleeds: be ready for haemostasis)', handling: 'Formalin; HHV-8 (LANA-1) immunohistochemistry' },
  investigations: [INV.hiv, INV.punch, INV.ihc, INV.fbcFilm, INV.cxr],
  management: { immediate: ['HIV testing; start or optimise antiretroviral therapy'], definitive: ['Antiretroviral therapy; chemotherapy (e.g. paclitaxel or liposomal doxorubicin) for advanced disease via oncology'] },
  warnings: [],
  doNot: ['Do not debride or excise widely; local excision only for symptomatic lesions'],
  refer: [{ to: 'oncology', when: 'Extensive, visceral or rapidly progressive disease', urgency: 'soon' }, { to: 'infectious_disease', when: 'HIV care', urgency: 'soon' }],
  sources: ['Lebbé C, Garbe C, Stratigos AJ, et al. Diagnosis and treatment of Kaposi\'s sarcoma: European consensus-based interdisciplinary guideline (EDF/EADO/EORTC). Eur J Cancer. 2019;114:117-127.'],
  pendingValidation: [],
};

export const BURULI_ULCER: KbCondition = {
  id: 'buruli_ulcer', label: 'Buruli ulcer (Mycobacterium ulcerans)', category: 'infective',
  synonyms: ['Buruli ulcer', 'Buruli', 'Mycobacterium ulcerans'],
  history: ['Lives near slow-flowing rivers, swamps or farmland (endemic areas of southern Nigeria)', 'Started as a painless nodule, plaque or swelling that broke down; often a child', 'Relatively painless for its size'],
  exam: ['Painless ulcer with deeply undermined edges and a white "cotton-wool" necrotic base', 'Oedematous form: diffuse non-pitting swelling of a limb'],
  skinOfColour: ['Surrounding skin is often hyperpigmented and indurated; healed lesions scar and contract'],
  redFlags: ['Lesion near a joint (contracture)', 'Bone involvement (osteomyelitis)', 'Oedematous or multifocal disease'],
  criteria: { name: 'WHO categories I (single lesion under 5 cm), II (5–15 cm), III (over 15 cm, multiple, osteomyelitis or critical site)', source: 'World Health Organization. Treatment of Mycobacterium ulcerans disease (Buruli ulcer): guidance for health workers. Geneva: WHO; 2012.' },
  biopsy: { type: 'Swab under the undermined edge (ulcer) or fine-needle aspirate (nodule / plaque); punch biopsy if smears negative', site: 'Under the undermined edge', handling: 'Swab / FNA for IS2404 PCR and ZN smear; histology in formalin' },
  investigations: [INV.buruliPcr, INV.specialStains, INV.xrayBone, INV.hiv, INV.fbcFilm],
  management: {
    immediate: ['Confirm with PCR where possible; do not delay antibiotics in a typical lesion in an endemic area'],
    definitive: ['Rifampicin 10 mg/kg once daily plus clarithromycin 7.5 mg/kg twice daily for 8 weeks (WHO; BLMs0414 trial)', 'Surgery (debridement, graft) after or during antibiotics only if needed; physiotherapy to prevent contracture'],
  },
  warnings: [],
  doNot: ['Do not rely on surgery alone (relapse); antibiotics are first-line'],
  refer: [{ to: 'tb_leprosy_programme', when: 'Every confirmed or probable case (notification and free treatment)', urgency: 'soon' }],
  sources: [
    'World Health Organization. Treatment of Mycobacterium ulcerans disease (Buruli ulcer): guidance for health workers. Geneva: WHO; 2012.',
    'Phillips RO, Robert J, Abass KM, et al. Rifampicin and clarithromycin (extended release) versus rifampicin and streptomycin for limited Buruli ulcer lesions: a randomised, open-label, non-inferiority phase 3 trial. Lancet. 2020;395(10232):1259-1267.',
    'Portaels F, ed. Laboratory diagnosis of Buruli ulcer: a manual for health care providers. Geneva: WHO; 2014.',
  ],
  pendingValidation: [],
};

export const TROPICAL_ULCER: KbCondition = {
  id: 'tropical_ulcer', label: 'Tropical (phagedenic) ulcer', category: 'infective',
  synonyms: ['tropical ulcer', 'tropical phagedenic ulcer', 'phagedenic ulcer'],
  history: ['Young, poorly nourished person; minor injury to the lower leg', 'Rapid onset over days, painful at first'],
  exam: ['Single, round ulcer on the lower third of the leg with a raised edge and a foul-smelling grey slough; becomes chronic and painless'],
  skinOfColour: ['Chronic tropical ulcers leave a hyperpigmented, scarred rim'],
  redFlags: ['Ulcer present for years (risk of squamous cell carcinoma)', 'Bone involvement (periostitis)'],
  investigations: [INV.swab, INV.wedgeEdgeBiopsy, INV.xrayBone, INV.fbcFilm, INV.hbGenotype],
  management: { immediate: ['Cleaning and dressings, nutrition', 'Penicillin or metronidazole for the acute (foul-smelling) phase'], definitive: ['Split-skin graft once clean; biopsy a chronic one'] },
  warnings: ['Biopsy any ulcer that has not healed in about 3 months, or that has atypical features, to exclude malignancy.'],
  doNot: [],
  refer: [],
  sources: ['Robinson DC, Adriaans B, Hay RJ, Yesudian P. The clinical and epidemiologic features of tropical ulcer (tropical phagedenic ulcer). Int J Dermatol. 1988;27(1):49-53.'],
  pendingValidation: ['Antibiotic choice for the acute phase is from older literature, not a current guideline.', 'The 1988 citation details (authors, pages) are from memory and need checking.'],
};

export const CUTANEOUS_TB: KbCondition = {
  id: 'cutaneous_tb', label: 'Cutaneous tuberculosis (scrofuloderma, lupus vulgaris, erythema induratum)', category: 'infective',
  synonyms: ['cutaneous tuberculosis', 'skin TB', 'scrofuloderma', 'lupus vulgaris', 'erythema induratum', 'tuberculous ulcer'],
  history: ['TB contact or past TB; HIV', 'Night sweats, weight loss, cough', 'Chronic discharging sinus over a lymph node or bone (scrofuloderma)'],
  exam: [
    'Scrofuloderma: ulcers and sinuses with bluish undermined edges over neck nodes, bone or joints',
    'Lupus vulgaris: red-brown plaque with "apple-jelly" nodules on diascopy, scarring',
    'Erythema induratum: tender nodules on the calves that ulcerate',
  ],
  skinOfColour: ['Apple-jelly colour is harder to see on dark skin; the plaque looks brown-violaceous; scarring and hypopigmentation follow'],
  redFlags: ['Weight loss and night sweats', 'HIV'],
  biopsy: { type: 'Incisional / deep biopsy (erythema induratum: deep, including fat)', site: 'Edge of an ulcer or plaque', handling: 'Formalin for granulomas; a piece in saline for TB culture and GeneXpert' },
  investigations: [INV.afb, INV.specialStains, INV.tissueCulture, INV.cxr, INV.hiv, INV.deepIncisional, INV.esrCrp],
  management: { immediate: ['HIV test, chest X-ray'], definitive: ['Standard 6-month anti-TB treatment (2HRZE/4HR) through the DOTS programme'] },
  warnings: ['Exclude TB before giving steroids or other immunosuppression for an "inflammatory" ulcer.'],
  doNot: ['Do not start immunosuppression for a granulomatous ulcer until TB is excluded'],
  refer: [{ to: 'tb_leprosy_programme', when: 'Confirmed or probable cutaneous TB', urgency: 'soon' }],
  sources: ['World Health Organization. WHO consolidated guidelines on tuberculosis. Module 4: treatment – drug-susceptible tuberculosis treatment. Geneva: WHO; 2022.', 'Santos JB, Figueiredo AR, Ferraz CE, Oliveira MH, Silva PG, Medeiros VL. Cutaneous tuberculosis: epidemiologic, etiopathogenic and clinical aspects – part I. An Bras Dermatol. 2014;89(2):219-228.'],
  pendingValidation: [],
};

export const LEPROSY: KbCondition = {
  id: 'leprosy', label: 'Leprosy (Hansen disease) and neuropathic ulcers', category: 'infective',
  synonyms: ['leprosy', 'Hansen disease', 'Hansen\'s disease', 'neuropathic plantar ulcer'],
  history: ['Numb patches; burns or injuries not felt; weakness of hands or feet', 'Household contact'],
  exam: ['Hypopigmented or reddish skin patch(es) with definite loss of sensation', 'Thickened, tender peripheral nerves (ulnar, common peroneal, great auricular)', 'Painless plantar ulcers over pressure points; claw hand, foot drop'],
  skinOfColour: ['Patches are hypopigmented (never fully depigmented, unlike vitiligo) on dark skin; test sensation with a wisp of cotton'],
  redFlags: ['Reaction: painful nerves, new weakness, or tender red nodules (ENL) — urgent steroids', 'Eye involvement (cannot close the eye)'],
  criteria: { name: 'WHO cardinal signs (any one): definite loss of sensation in a patch; thickened nerve with loss of sensation or weakness; slit-skin smear positive', source: 'World Health Organization. Guidelines for the diagnosis, treatment and prevention of leprosy. New Delhi: WHO Regional Office for South-East Asia; 2018.' },
  biopsy: { type: 'Punch biopsy of the edge of a patch if the diagnosis is unclear', site: 'Active edge of a patch', handling: 'Formalin; Fite stain' },
  investigations: [INV.slitSkin, INV.punch, INV.specialStains, INV.glucose, INV.xrayBone],
  management: { immediate: ['Off-load a plantar ulcer; protect anaesthetic hands and feet'], definitive: ['WHO multidrug therapy (rifampicin, dapsone, clofazimine: 6 months paucibacillary, 12 months multibacillary) through the national programme'] },
  warnings: [],
  doNot: ['Do not start dapsone without a G6PD result where testing is available'],
  refer: [{ to: 'tb_leprosy_programme', when: 'Every suspected case (free treatment, contact tracing)', urgency: 'soon' }],
  sources: ['World Health Organization. Guidelines for the diagnosis, treatment and prevention of leprosy. New Delhi: WHO SEARO; 2018.'],
  pendingValidation: [],
};

export const MYCETOMA: KbCondition = {
  id: 'mycetoma', label: 'Mycetoma (Madura foot)', category: 'infective',
  synonyms: ['mycetoma', 'Madura foot', 'eumycetoma', 'actinomycetoma'],
  history: ['Barefoot farmer or herder; a thorn prick months or years before', 'Slowly enlarging, painless swelling of the foot with discharging sinuses'],
  exam: ['Painless firm swelling with multiple sinuses discharging grains (black: fungal; white / yellow / red: often bacterial)', 'Bone involvement late'],
  skinOfColour: ['Sinus openings are often surrounded by hyperpigmented nodules; grains are easier to see on gauze'],
  redFlags: ['Bone involvement on X-ray', 'Spread up the limb or to nodes'],
  biopsy: { type: 'Deep surgical biopsy (not FNA alone) for grains, histology and culture', site: 'Deep tissue with sinus tracts', handling: 'Formalin; fresh tissue in saline for fungal and bacterial culture' },
  investigations: [INV.fungal, INV.specialStains, INV.tissueCulture, INV.xrayBone, INV.mriLocal],
  management: {
    immediate: ['Distinguish fungal (eumycetoma) from bacterial (actinomycetoma) before treatment'],
    definitive: ['Actinomycetoma: long-course combination antibiotics (e.g. co-trimoxazole with amikacin) — medical treatment, rarely surgery', 'Eumycetoma: itraconazole for months plus planned surgical excision'],
  },
  warnings: [],
  doNot: ['Do not do a limited local excision of eumycetoma without antifungal cover (recurrence)'],
  refer: [{ to: 'infectious_disease', when: 'Confirmed mycetoma (long treatment)', urgency: 'soon' }],
  sources: ['Zijlstra EE, van de Sande WWJ, Welsh O, Mahgoub ES, Goodfellow M, Fahal AH. Mycetoma: a unique neglected tropical disease. Lancet Infect Dis. 2016;16(1):100-112.'],
  pendingValidation: ['Drug regimens are summarised from the review; duration and dosing need the treating team\'s protocol.'],
};

export const HIDRADENITIS: KbCondition = {
  id: 'hidradenitis', label: 'Hidradenitis suppurativa', category: 'follicular',
  synonyms: ['hidradenitis suppurativa', 'HS', 'acne inversa'],
  history: ['Recurrent painful boils in the armpits, groin, buttocks or under the breasts for over 6 months', 'Smoking, obesity; family history'],
  exam: ['Inflamed nodules, abscesses, sinus tracts and rope-like scars in skin folds; double-ended comedones'],
  skinOfColour: ['Inflammation looks dark violaceous; healing leaves marked hyperpigmentation and hypertrophic or keloid scars'],
  redFlags: ['A chronic non-healing area of long-standing HS (squamous cell carcinoma, especially buttocks / perineum)'],
  criteria: { name: 'Hurley staging (I–III)', source: 'Hurley HJ. Axillary hyperhidrosis, apocrine bromhidrosis, hidradenitis suppurativa, and familial benign pemphigus: surgical approach. In: Roenigk RK, Roenigk HH, eds. Dermatologic Surgery: Principles and Practice. New York: Marcel Dekker; 1989:729-739.', toolId: 'hurley' },
  investigations: [INV.glucose, INV.fbcFilm, INV.swab, INV.wedgeEdgeBiopsy],
  management: {
    immediate: ['Stop smoking, weight support, analgesia'],
    definitive: ['Hurley I: topical clindamycin; Hurley II: oral tetracycline or clindamycin + rifampicin; adalimumab for moderate-severe disease', 'Hurley II–III: deroofing or wide excision of affected areas with secondary healing, graft or flap'],
  },
  warnings: [],
  doNot: ['Do not rely on repeated incision and drainage alone (recurs)'],
  refer: [{ to: 'dermatology', when: 'Hurley II–III or failing first-line treatment (biologics)', urgency: 'routine' }],
  sources: [
    'Zouboulis CC, Desai N, Emtestam L, et al. European S1 guideline for the treatment of hidradenitis suppurativa/acne inversa. J Eur Acad Dermatol Venereol. 2015;29(4):619-644.',
    'Alikhan A, Sayed C, Alavi A, et al. North American clinical management guidelines for hidradenitis suppurativa. Part I and II. J Am Acad Dermatol. 2019;81(1):76-90 and 91-101.',
    'Hurley HJ 1989 (staging).',
  ],
  pendingValidation: [],
};

export const DFSP: KbCondition = {
  id: 'dfsp', label: 'Dermatofibrosarcoma protuberans (and other keloid look-alikes)', category: 'fibrotic',
  synonyms: ['dermatofibrosarcoma protuberans', 'DFSP', 'atypical keloid', 'keloid look-alike'],
  history: ['A "keloid" with no injury before it, or one that keeps growing for years and becomes lumpy', 'Trunk, shoulder or proximal limb; recurrence after simple excision'],
  exam: ['Firm, indurated plaque with protuberant nodules, often violaceous or brown; fixed to skin, not always to deep tissue'],
  skinOfColour: [
    'DFSP is often mistaken for a keloid in dark skin. Pigmented (Bednar) DFSP is more common in Black patients',
    'Other look-alikes to consider: keloidal SCC in a scar, cutaneous sarcoidosis in scars, lobomycosis, Kaposi sarcoma',
  ],
  redFlags: ['"Keloid" without preceding injury', 'Nodular growth on a plaque', 'Recurrence after excision'],
  biopsy: { type: 'Deep incisional biopsy (punch biopsies are often too superficial)', site: 'The thickest nodular area', handling: 'Formalin; CD34 immunohistochemistry (and COL1A1-PDGFB testing where available)' },
  investigations: [INV.deepIncisional, INV.ihc, INV.mriLocal],
  management: { immediate: ['Biopsy before steroid injection or excision of an atypical keloid'], definitive: ['Wide excision with margin control (Mohs or staged / slow Mohs where available); imatinib for unresectable disease via oncology'] },
  warnings: ['Biopsy an atypical "keloid" (no prior injury, nodular, relentless growth or recurrence) before injecting or excising it.'],
  doNot: ['Do not inject or excise an atypical keloid without histology'],
  refer: [{ to: 'oncology', when: 'Confirmed DFSP: margin-controlled surgery / tumour board', urgency: 'soon' }],
  sources: ['Saiag P, Grob JJ, Lebbe C, et al. Diagnosis and treatment of dermatofibrosarcoma protuberans. European consensus-based interdisciplinary guideline. Eur J Cancer. 2015;51(17):2604-2608.'],
  pendingValidation: ['The keloid look-alike list (sarcoidosis, lobomycosis, keloidal SCC) is a clinical summary, not from the cited guideline.', 'Saiag 2015 page numbers are from memory and need checking.'],
};

export const SJS_TEN: KbCondition = {
  id: 'sjs_ten', label: 'Stevens–Johnson syndrome / toxic epidermal necrolysis', category: 'drug',
  synonyms: ['Stevens-Johnson syndrome', 'SJS', 'toxic epidermal necrolysis', 'TEN', 'SJS/TEN', 'severe drug eruption', 'drug eruption'],
  history: [
    'A new drug in the last 4–28 days: sulfonamides (co-trimoxazole), nevirapine, carbamazepine, phenytoin, lamotrigine, allopurinol, NSAIDs (oxicams), and others',
    'Fever, sore throat, sore eyes and painful skin before the rash; HIV increases the risk',
  ],
  exam: ['Dusky macules and atypical targets that blister and slough; positive Nikolsky sign', 'Two or more mucous membranes eroded (mouth, eyes, genitals)', 'Body surface area detached: SJS under 10%, overlap 10–30%, TEN over 30%'],
  skinOfColour: ['Early dusky macules look grey-violaceous or dark rather than red; erosions show pink-red dermis against dark skin', 'Expect long-lasting dyspigmentation and nail loss after recovery'],
  redFlags: ['Detachment over 10% of the body surface', 'Eye involvement', 'SCORTEN 2 or more'],
  criteria: { name: 'SCORTEN (severity of illness score for TEN, on day 1 and day 3)', source: 'Bastuji-Garin S, Fouchard N, Bertocchi M, Roujeau JC, Revuz J, Wolkenstein P. SCORTEN: a severity-of-illness score for toxic epidermal necrolysis. J Invest Dermatol. 2000;115(2):149-153.', toolId: 'scorten' },
  biopsy: { type: 'Punch biopsy of lesional skin at the edge of a blister, plus a perilesional piece for DIF', site: 'Edge of a fresh blister', handling: 'Formalin (full-thickness epidermal necrosis); DIF excludes autoimmune blistering disease' },
  investigations: [INV.fbcFilm, INV.renal, INV.bicarbonate, INV.glucose, INV.lft, INV.hiv, INV.punch, INV.edgeBiopsyDif, INV.cxr],
  management: {
    immediate: [
      'Stop every suspect drug now (and any non-essential drug)',
      'Admit: burns unit or high-dependency care; warm room, fluids by need, nutrition, analgesia',
      'Eye examination by ophthalmology within 24 hours; mouth and genital care',
      'Non-adherent dressings; leave detached epidermis in place as a biological dressing',
    ],
    definitive: ['Supportive care is the foundation; ciclosporin or other systemic treatment only with specialist input (evidence limited)', 'Record the culprit drug as an allergy and give the patient a written alert'],
  },
  warnings: ['Suspected SJS / TEN is an emergency: stop every suspect drug, admit (burns unit or high-dependency care) and arrange an eye review within 24 hours.'],
  doNot: ['Do not continue or restart the suspect drug, or a drug of the same class', 'No adhesive dressings or tape on the skin', 'Do not give prophylactic systemic antibiotics routinely'],
  refer: [{ to: 'burns_icu', when: 'Every SJS / TEN', urgency: 'urgent' }, { to: 'ophthalmology', when: 'Every SJS / TEN, within 24 hours', urgency: 'urgent' }, { to: 'dermatology', when: 'Every SJS / TEN', urgency: 'urgent' }],
  sources: [
    'Creamer D, Walsh SA, Dziewulski P, et al. UK guidelines for the management of Stevens-Johnson syndrome/toxic epidermal necrolysis in adults 2016. Br J Dermatol. 2016;174(6):1194-1227.',
    'Bastuji-Garin S et al. J Invest Dermatol. 2000;115(2):149-153 (SCORTEN).',
    'Sassolas B, Haddad C, Mockenhaupt M, et al. ALDEN, an algorithm for assessment of drug causality in Stevens-Johnson syndrome and toxic epidermal necrolysis. Clin Pharmacol Ther. 2010;88(1):60-68.',
  ],
  pendingValidation: [],
};

export const DERM_CONDITIONS: KbCondition[] = [
  MARJOLIN_SCC, BCC, ACRAL_MELANOMA, KAPOSI_SARCOMA, BURULI_ULCER, TROPICAL_ULCER, CUTANEOUS_TB, LEPROSY, MYCETOMA, HIDRADENITIS, DFSP, SJS_TEN,
];
