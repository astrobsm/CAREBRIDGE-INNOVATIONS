/**
 * The practice's Wound Clinic Protocol, version 1, as data.
 *
 * Encoded EXACTLY from docs/protocols/wound-clinic-protocol.md (the owner's
 * text of 26 Nov 2026): every threshold, dose, duration and caution below is
 * the protocol's own wording. The rules plan (../rulesPlan.ts) reads this
 * file; it never restates a number. To change the protocol, add a v2 file,
 * point ACTIVE_WOUND_PROTOCOL at it and keep v1 for plans already approved
 * under it (plans record the protocol version they were built with).
 *
 * Two things the protocol does not define and the code needs are marked
 * NOT IN PROTOCOL below (the CRP level that counts as "high"); the owner is
 * asked to confirm them.
 *
 * The energy / protein / fluid table lives in the nutrition engine config
 * (nutrition/engine/config: woundProtocol), so no nutrition figure is
 * computed outside the engine; it is repeated here as text only.
 */

export const WOUND_PROTOCOL_SOURCE =
  'AstroHEALTH Wound Clinic Protocol: Baseline Investigations and Micronutrient Support (26 Nov 2026)';

export interface ProtocolTest {
  id: string;
  test: string;
  why: string;
  target: string;
  /** Clinician-assistant analyte keys a result row records (numeric entry). */
  analytes?: string[];
  /** Qualitative result (positive / negative, genotype, a report). */
  qualitative?: { options?: string[] };
}

export interface ProtocolTargeted {
  id: string;
  situation: string;
  investigation: string;
}

export interface MicronutrientRow {
  id: string;
  nutrient: string;
  who: string;
  dose: string;
  duration: string;
}

export const WOUND_CLINIC_PROTOCOL_V1 = {
  id: 'wound_clinic_protocol',
  version: '1.0.0',
  effectiveDate: '2026-11-26',
  source: WOUND_PROTOCOL_SOURCE,
  document: 'docs/protocols/wound-clinic-protocol.md',
  purpose: 'Every new wound patient gets the same baseline panel. Micronutrients are given to correct a deficiency or to cover high-risk patients, not as a routine cocktail for everyone.',
  appliesTo: 'Adults and children seen in the wound clinic with acute or chronic wounds, burns, ulcers or pressure injuries.',
  howToUse: 'Do the baseline panel at the first visit, add targeted tests by wound type, then follow the monitoring schedule.',
  doseNote: 'All doses are by mouth unless stated, and mineral doses are elemental (for example, mg of elemental zinc, not mg of zinc sulphate).',
  localCheck: 'Confirm brand strengths against the products stocked in the clinic pharmacy, as Nigerian brands vary.',

  baseline: [
    { id: 'fbc', test: 'Full blood count', why: 'Anaemia reduces oxygen delivery; white cells flag infection', target: 'Hb at least 10 g/dL (adult); investigate if lower', analytes: ['hb', 'wbc', 'plt', 'mcv'] },
    { id: 'esr_crp', test: 'ESR and CRP', why: 'Infection, osteomyelitis, inflammation; also needed to interpret zinc and ferritin', target: 'Trend over time; persistently high CRP suggests deep infection', analytes: ['esr', 'crp'] },
    { id: 'glucose_hba1c', test: 'Random blood sugar and HbA1c', why: 'Hyperglycaemia impairs neutrophils and collagen', target: 'HbA1c below 7% (53 mmol/mol) where safe', analytes: ['glucose', 'hba1c'] },
    { id: 'eucr', test: 'Electrolytes, urea, creatinine', why: 'Renal function guides protein load, drug and mineral dosing', target: 'Adjust protein and zinc if eGFR is low', analytes: ['na', 'k', 'urea', 'creatinine', 'egfr'] },
    { id: 'lft_albumin', test: 'Liver function tests with albumin', why: 'Liver disease; albumin reflects inflammation and illness more than nutrition', target: 'Do not use albumin alone to diagnose malnutrition', analytes: ['alt', 'ast', 'alp', 'bilirubinTotal', 'albumin'] },
    { id: 'iron_studies', test: 'Serum ferritin and transferrin saturation', why: 'Iron deficiency (ferritin rises with inflammation)', target: 'Ferritin below 30 ng/mL, or below 100 ng/mL with high CRP, suggests iron deficiency', analytes: ['ferritin', 'tsat'] },
    { id: 'zinc', test: 'Serum zinc (fasting, morning)', why: 'Deficiency delays epithelialisation', target: 'Below about 70 mcg/dL (10.7 micromol/L); falsely low when CRP is high', analytes: ['zinc'] },
    { id: 'vitamin_d', test: '25-OH vitamin D', why: 'Deficiency is common and affects immunity', target: 'Below 20 ng/mL (50 nmol/L) = deficient', analytes: ['vitaminD'] },
    { id: 'hiv', test: 'HIV screening (with consent)', why: 'Immunosuppression, atypical or slow wounds', target: 'Refer for care if positive', qualitative: { options: ['Negative', 'Positive', 'Declined', 'Indeterminate'] } },
    { id: 'genotype', test: 'Haemoglobin electrophoresis (genotype)', why: 'Sickle cell disease causes leg ulcers and poor healing', target: 'Especially leg ulcers in young adults and children', qualitative: { options: ['AA', 'AS', 'AC', 'SS', 'SC', 'Other'] } },
    { id: 'urinalysis', test: 'Urinalysis', why: 'Glucose, protein, infection', target: 'Follow up abnormal results', qualitative: { options: ['Normal', 'Glucose present', 'Protein present', 'Signs of infection', 'Other abnormality'] } },
    { id: 'nutrition_screen', test: 'Nutrition screen: weight, height, BMI or weight-for-age, MUAC', why: 'Identifies malnutrition early', target: 'Use MUST (adults) or STRONGkids (children)', qualitative: {} },
    { id: 'wound_baseline', test: 'Wound baseline: size (length × width × depth), photo, tissue type, exudate', why: 'The reference for measuring progress', target: 'Measure and photograph at every visit the same way', qualitative: {} },
  ] as ProtocolTest[],

  targeted: [
    { id: 'infected', situation: 'Clinically infected wound', investigation: 'Deep tissue culture or curettage after cleansing (better than a surface swab); blood culture if febrile' },
    { id: 'bone', situation: 'Probe-to-bone, exposed bone, or non-healing diabetic foot', investigation: 'Plain X-ray; MRI if available; bone biopsy for culture and histology' },
    { id: 'leg_foot_ulcer', situation: 'Leg or foot ulcer', investigation: 'Ankle–brachial pressure index (ABPI) before compression; arterial Doppler if ABPI below 0.8 or above 1.3' },
    { id: 'venous', situation: 'Suspected venous disease', investigation: 'Venous duplex scan' },
    { id: 'biopsy', situation: "Chronic ulcer over 3 months, rolled or heaped edges, or unusual look", investigation: "Wedge biopsy from the edge to exclude malignancy (including Marjolin's ulcer in old burn scars)" },
    { id: 'vasculitis', situation: 'Suspected vasculitis or autoimmune ulcer', investigation: 'ANA, rheumatoid factor, ANCA, complement, urine protein' },
    { id: 'burns_intake', situation: 'Large burns or prolonged poor intake', investigation: 'Magnesium, phosphate, calcium; prealbumin where available' },
    { id: 'b12_folate', situation: 'Suspected B12 or folate deficiency (macrocytosis, glossitis, poor diet)', investigation: 'Serum B12 and folate' },
    { id: 'copper', situation: 'Suspected copper deficiency (anaemia or neutropenia on long-term zinc)', investigation: 'Serum copper and caeruloplasmin' },
    { id: 'thyroid', situation: 'Suspected thyroid disease', investigation: 'TSH' },
    { id: 'child_growth', situation: 'Children with poor growth', investigation: 'Weight and height plotted on growth charts; stool for parasites and blood film for malaria where relevant' },
  ] as ProtocolTargeted[],

  monitoring: {
    principle: 'A wound that has not shrunk by about 40–50% in area after 4 weeks of good care is unlikely to heal on the current plan. Reassess the cause, look for infection or ischaemia, and consider biopsy.',
    rows: [
      { id: 'every_visit', when: 'Every visit', what: 'Measure and photograph the wound; check for infection; record weight in children' },
      { id: 'two_weekly', when: 'Every 2 weeks', what: 'Calculate % change in area from baseline' },
      { id: 'week4', when: 'Week 4', what: 'Decision point: if under 40–50% smaller, re-investigate and change the plan' },
      { id: 'four_six_weekly', when: 'Every 4–6 weeks', what: 'FBC and CRP if anaemic or infected; blood sugar log for diabetics' },
      { id: 'three_monthly', when: 'Every 3 months', what: 'HbA1c (diabetics); ferritin and Hb after starting iron; vitamin D after a loading course' },
      { id: 'zinc_review', when: 'After 8–12 weeks of zinc', what: 'Repeat serum zinc; stop zinc once the wound has epithelialised' },
      { id: 'children', when: 'Children', what: 'Weight every visit; height monthly; plot both on growth charts' },
    ],
  },

  nutritionText: {
    principle: 'No vitamin makes up for too little protein and energy. For malnourished adults with a pressure injury, international guidance recommends 30–35 kcal/kg/day and 1.25–1.5 g protein/kg/day (RNAO summary of NPIAP/EPUAP).',
    arginine: 'Arginine-containing formulas (about 4.5 g arginine a day) are suggested for pressure injuries.',
  },

  adultMicronutrients: {
    principle: 'Give every chronic-wound patient a daily multivitamin-mineral. Add a therapeutic dose only for a proven or strongly suspected deficiency, and stop when it is corrected or the wound heals. Evidence that extra zinc or vitamin C speeds healing in people who are not deficient is weak.',
    rows: [
      { id: 'multivitamin', nutrient: 'Multivitamin with minerals', who: 'All chronic wounds, poor intake, elderly', dose: '1 tablet daily (RDA-level)', duration: 'Until healed and eating well' },
      { id: 'vitamin_c', nutrient: 'Vitamin C (ascorbic acid)', who: 'Poor diet, smokers, pressure injuries, suspected deficiency', dose: '500 mg daily (250 mg twice daily)', duration: 'Until healed; reduce in kidney stones or severe renal disease' },
      { id: 'zinc', nutrient: 'Zinc (elemental)', who: 'Low serum zinc, malnutrition, large exuding wounds, burns', dose: '25–50 mg daily with food (e.g. zinc sulphate 220 mg = 50 mg elemental)', duration: 'Usually 8–12 weeks, then stop; long courses cause copper deficiency' },
      { id: 'iron', nutrient: 'Iron (elemental)', who: 'Iron-deficiency anaemia', dose: '65 mg once daily or on alternate days (e.g. ferrous sulphate 200 mg)', duration: 'Take with vitamin C, not with tea or antacids; continue 3 months after Hb normalises' },
      { id: 'folic_acid', nutrient: 'Folic acid', who: 'Folate deficiency, sickle cell disease, macrocytosis', dose: '5 mg daily', duration: '4 months for deficiency; continuous in sickle cell disease. Check B12 first' },
      { id: 'b12', nutrient: 'Vitamin B12', who: 'Proven B12 deficiency', dose: 'Hydroxocobalamin 1 mg IM three times a week for 2 weeks, then every 3 months', duration: 'Lifelong if pernicious anaemia' },
      { id: 'vitamin_d', nutrient: 'Vitamin D3', who: 'Level below 20 ng/mL', dose: '50,000 IU once weekly for 8 weeks, then 800–2,000 IU daily', duration: 'Check calcium; caution in sarcoidosis or high calcium' },
      { id: 'vitamin_a', nutrient: 'Vitamin A', who: 'Patients on steroids with poor healing; proven deficiency', dose: '10,000–25,000 IU daily for 10–14 days only', duration: 'NOT in pregnancy or women who may be pregnant (max 10,000 IU); avoid in liver disease' },
      { id: 'arginine', nutrient: 'Arginine', who: 'Pressure injury stage 2 or worse, malnourished', dose: 'About 4.5 g daily (in a specialised drink)', duration: 'Avoid in sepsis' },
    ] as MicronutrientRow[],
    upperLimits: 'Tolerable upper limits for long-term use in adults: zinc 40 mg, vitamin C 2,000 mg, vitamin A 10,000 IU, vitamin D 4,000 IU daily. The short, monitored therapeutic courses above may exceed these.',
  },

  childMicronutrients: {
    principle: 'Dose children by weight, never above the adult dose, and check the product strength in mg per 5 mL before prescribing. Neonates and preterm infants need neonatal or paediatric input.',
    rows: [
      { id: 'multivitamin', nutrient: 'Paediatric multivitamin', who: 'All chronic wounds, burns, poor intake', dose: 'Age dose on the product label', duration: 'Until healed and eating well' },
      { id: 'vitamin_c', nutrient: 'Vitamin C', who: 'Poor diet, burns, suspected deficiency', dose: 'Under 4 years: 100–125 mg daily. 4–11 years: 250 mg daily. 12–17 years: 500 mg daily', duration: 'Until healed' },
      { id: 'zinc', nutrient: 'Zinc (elemental)', who: 'Low serum zinc, malnutrition, diarrhoea, burns', dose: '0.5–1 mg/kg once daily (maximum 40 mg/day)', duration: '8–12 weeks, then stop; give with food' },
      { id: 'iron', nutrient: 'Iron (elemental)', who: 'Iron-deficiency anaemia (low Hb and low ferritin)', dose: '3 mg/kg once daily; up to 6 mg/kg/day in severe anaemia (maximum 200 mg/day). Prevention: 1–2 mg/kg daily', duration: '3 months after Hb normalises. Treat malaria and worms first; avoid during acute severe infection' },
      { id: 'folic_acid', nutrient: 'Folic acid', who: 'Folate deficiency; sickle cell disease', dose: 'Under 1 year: 500 mcg/kg daily (maximum 5 mg). 1 year and over: 5 mg daily (sickle cell maintenance per local protocol, often 2.5–5 mg daily)', duration: 'Check B12 before long courses' },
      { id: 'vitamin_d', nutrient: 'Vitamin D3', who: 'Level below 20 ng/mL or rickets', dose: 'Under 1 year: 2,000 IU daily. 1–12 years: 3,000–6,000 IU daily. Over 12 years: 6,000 IU daily', duration: '12 weeks, then 400 IU (under 1 year) or 600 IU daily. Give with calcium if intake is poor' },
      { id: 'vitamin_a', nutrient: 'Vitamin A', who: 'Only per WHO schedule, or proven deficiency or measles', dose: '6–11 months: 100,000 IU single dose. 12 months and over: 200,000 IU single dose (every 4–6 months if not already given)', duration: 'Do not give extra vitamin A only to speed wound healing in children; overdose is toxic' },
      { id: 'b12', nutrient: 'Vitamin B12', who: 'Proven deficiency', dose: 'Hydroxocobalamin 1 mg IM, with specialist advice', duration: 'Specialist follow-up' },
    ] as MicronutrientRow[],
  },

  cautions: {
    zinc: 'Zinc: long-term high doses cause copper deficiency, anaemia and low immunity. Stop at healing or after 12 weeks, and give zinc and iron at different times.',
    iron: 'Iron: keep out of children\'s reach (overdose is dangerous); stools turn black; avoid in thalassaemia or iron overload; do not give with tea, milk or antacids.',
    vitaminA: 'Vitamin A: teratogenic. Avoid high doses in pregnancy and in women who may be pregnant; avoid in liver disease.',
    vitaminC: 'Vitamin C: high doses can cause kidney stones; avoid large doses in G6PD deficiency, iron overload and severe renal disease.',
    vitaminD: 'Vitamin D: stop if calcium rises; caution in kidney stones and sarcoidosis.',
    renal: 'Renal impairment: reduce protein, avoid high-dose vitamin C and vitamin A, and review zinc.',
    pregnancy: 'Pregnancy and breastfeeding: use a standard antenatal supplement and folic acid; avoid high-dose vitamin A.',
    sickleCell: 'Sickle cell disease: iron only for proven iron deficiency (patients may be iron-loaded from transfusions).',
  },

  /** Numbers the rules and the results interpretation read. Each is in the protocol text above. */
  thresholds: {
    adultFromYears: 18,
    childFromMonths: 1,
    hbAdultMinGdl: 10,
    hba1cTargetBelowPercent: 7,
    ferritinLowNgMl: 30,
    ferritinLowWithHighCrpNgMl: 100,
    zincLowMcgDl: 70,
    vitaminDDeficientBelowNgMl: 20,
    areaReductionByWeek4Percent: { low: 40, high: 50 },
    abpiDopplerBelow: 0.8,
    abpiDopplerAbove: 1.3,
    chronicUlcerBiopsyMonths: 3,
    zincCourseWeeks: { low: 8, high: 12 },
    vitaminAPregnancyMaxIu: 10000,
    /**
     * NOT IN PROTOCOL: the protocol says "high CRP" without a number. The
     * laboratory upper reference of 5 mg/L (the WHO 2020 ferritin guideline's
     * inflammation cut-off) is used. Owner to confirm.
     */
    highCrpAboveMgL: 5,
  },

  /** Child doses as numbers (from the child table), and the adult doses they are capped at. */
  childDosing: {
    zinc: { mgPerKg: { low: 0.5, high: 1 }, maxMgPerDay: 40 },
    iron: { mgPerKg: 3, severeMgPerKg: 6, maxMgPerDay: 200, preventionMgPerKg: { low: 1, high: 2 } },
    folicAcid: { under1McgPerKg: 500, under1MaxMg: 5, from1Mg: 5 },
    vitaminC: [{ belowYears: 4, dose: '100–125 mg daily' }, { belowYears: 12, dose: '250 mg daily' }, { belowYears: 18, dose: '500 mg daily' }],
    vitaminD: [{ belowYears: 1, dose: '2,000 IU daily', then: '400 IU daily' }, { belowYears: 12, dose: '3,000–6,000 IU daily', then: '600 IU daily' }, { belowYears: 18, dose: '6,000 IU daily', then: '600 IU daily' }],
    /** "Never above the adult dose": the adult doses, in the same units. */
    adultCapMg: { zinc: 50, iron: 65, folicAcid: 5 },
  },

  references: [
    'EPUAP/NPIAP/PPPIA. Prevention and Treatment of Pressure Ulcers/Injuries: Clinical Practice Guideline (2019; 4th edition 2025): nutrition targets, as summarised by RNAO (https://bpgmobile.rnao.ca/node/1257)',
    'Zinc: An Essential Micronutrient, American Family Physician 2009 (https://www.aafp.org/pubs/afp/issues/2009/0501/p768.html)',
    'Rationale for zinc supplementation in older adults with wounds (https://www.hmpgloballearningnetwork.com/site/altc/articles/rationale-zinc-supplementation-older-adults-wounds)',
    "Royal Children's Hospital Melbourne: iron deficiency guideline (https://www.rch.org.au/clinicalguide/guideline_index/iron_deficiency)",
    'MSF Essential Drugs: ferrous salts (https://medicalguidelines.msf.org/viewport/EssDr/english/ferrous-salts-16683659.html)',
    'BNF for Children: updated oral iron dosing (2025) (https://www.pharmaceuticalpress.com/?p=156485)',
    'Global Consensus Recommendations on Prevention and Management of Nutritional Rickets (2016): vitamin D treatment doses',
    'WHO guideline on vitamin A supplementation in infants and children 6–59 months',
  ],
} as const;

export type WoundClinicProtocol = typeof WOUND_CLINIC_PROTOCOL_V1;
export const ACTIVE_WOUND_PROTOCOL: WoundClinicProtocol = WOUND_CLINIC_PROTOCOL_V1;
