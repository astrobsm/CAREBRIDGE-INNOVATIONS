/**
 * Lesion and ulcer features, read from whatever the clinician documented:
 * the atypical-ulcer screen's own questions (au_), the chronic-wound (cw_),
 * pigmented-lesion (pig_), keloid (kel_), SJS / TEN (sjs_) and hidradenitis
 * (hs_) templates, the generic wound examination, and the patient facts.
 * Pure. The option strings are shared with the clerking template so a
 * renamed option cannot silently stop a rule firing.
 */
import type { PatientFacts } from '../clinical/clerkingPlan/facts';
import type { ClerkingData } from '../clinical/clerking/types';

/** Complaints (clerking catalogue) that are skin lesions or ulcers. */
export const DERM_RHEUM_COMPLAINTS = ['chronic_ulcer', 'leg_ulcer', 'foot_ulcer', 'ulcer_in_scar', 'skin_lesion', 'pigmented_lesion', 'rash', 'blisters', 'itching', 'nail_problem', 'neurofibromas', 'keloid', 'hypertrophic_scar', 'wound_infection', 'burn_wound_old', 'cond_atypical_ulcer', 'cond_sjs_ten', 'cond_hidradenitis'];

const toDays = (d?: { value: number | null; unit: string }) => {
  if (!d?.value) return null;
  const f: Record<string, number> = { hours: 1 / 24, days: 1, weeks: 7, months: 30.4, years: 365 };
  return d.value * (f[d.unit] ?? 1);
};

/** The longest documented duration of a skin / ulcer complaint, in days. */
export function longestDurationDays(data: Pick<ClerkingData, 'complaints'>): number | null {
  const ds = data.complaints.filter(c => DERM_RHEUM_COMPLAINTS.includes(c.complaintId)).map(c => toDays(c.duration)).filter((x): x is number => x != null);
  return ds.length ? Math.max(...ds) : null;
}

/** An answer lookup in the clerking's ConditionContext shape. */
export interface Answers {
  a: (id: string) => string | string[] | number | undefined;
  is: (id: string, ...values: string[]) => boolean;
  num: (id: string) => number | null;
  has: (id: string) => boolean;
}

export const AU = {
  duration: ['Under 6 weeks', '6 weeks–3 months', '3–12 months', 'Over 1 year'],
  progress: ['Rapid — enlarging over days to weeks', 'Slow — over months', 'Static', 'Heals then breaks down again'],
  pain: ['Painless or nearly painless', 'Moderate', 'Severe / out of proportion to the size'],
  onset: ['Pustule or blood blister that broke down', 'Painful red / purple nodule', 'At a site of injury, surgery or injection', 'In a burn or old scar', 'Painless lump or swelling that broke down', 'Spontaneous', 'Other'],
  care: ['Not yet tried', 'Healing with wound care', 'No progress after 6 or more weeks of good wound care', 'Got worse with wound care'],
  immuno: ['Never tried', 'Improved on steroids / immunosuppression', 'No change on steroids / immunosuppression'],
  systemic: ['Fever', 'Weight loss / night sweats', 'Joint pain or swelling', 'Mouth ulcers', 'Raynaud\'s (fingers turn white / blue in the cold)', 'Skin tightening of fingers or face', 'Rash on the face or sun-exposed skin', 'Hair loss', 'Blood in urine / foamy urine', 'Nosebleeds, crusting or sinus problems', 'Cough or coughing blood', 'Numbness, tingling or foot drop', 'Bloody diarrhoea / bowel symptoms', 'None'],
  assoc: ['Inflammatory bowel disease', 'Rheumatoid arthritis', 'Known lupus / connective tissue disease', 'Blood cancer / myeloma / paraprotein', 'Kidney failure / dialysis', 'Diabetes', 'Sickle cell disease', 'HIV', 'Hepatitis B or C', 'Previous clots or miscarriages', 'On warfarin', 'New medicine in the last 8 weeks', 'On steroids / immunosuppressed', 'Albinism', 'Lives or farms near slow rivers / swamps', 'TB contact or past TB', 'Walks or farms barefoot', 'None'],
  site: ['Shin / pretibial', 'Ankle / malleolus', 'Foot / sole', 'Fingers / toes (digits)', 'Calf / thigh', 'Trunk / buttock', 'Armpit / groin / under the breasts', 'Head / neck', 'Around a stoma', 'Other'],
  number: ['Single', 'Several (2–5)', 'Many (more than 5)'],
  edge: ['Undermined, violaceous (purple-grey) edge', 'Undermined, not violaceous', 'Painless, deeply undermined edge with white "cotton-wool" slough', 'Rolled / heaped / everted', 'Punched-out', 'Sloping / flat', 'Irregular / fungating'],
  shape: ['Round / oval', 'Irregular / bizarre (serpiginous) outline'],
  base: ['Granulation', 'Slough', 'Black eschar / necrosis', 'Friable / cauliflower growth', 'Exposed tendon or bone', 'Sinus tracts discharging grains'],
  signs: [
    'Livedo (net-like dusky pattern)', 'Palpable purpura (does not blanch)', 'Retiform (star-shaped) purpura or necrosis', 'Cribriform scars of healed ulcers',
    'Digital ulcers / fingertip pitting scars', 'Puffy fingers', 'Sclerodactyly / thickened finger skin', 'Telangiectasia (face / hands)', 'Abnormal nail folds',
    'Violaceous or black nodules / plaques', 'Yellow-brown waxy atrophic plaque on the shin', 'Pale (hypopigmented) numb patch(es)', 'Thickened peripheral nerves',
    'Swelling with sinuses discharging grains', 'Pigmented patch on the sole, palm or nail', 'Recurrent nodules / sinus tracts in armpits, groin or buttocks',
    'Firm plaque with protuberant nodules (trunk / shoulder)', 'Venous skin changes / leg swelling', 'None',
  ],
  pulses: ['Palpable', 'Weak or absent'],
  skin: ['Dark (Fitzpatrick V–VI)', 'Medium (III–IV)', 'Light (I–II)'],
  histo: ['Not done', 'Neutrophilic / suppurative inflammation', 'Vasculitis', 'Malignancy', 'Granulomas / AFB / fungi', 'Thrombi without vasculitis', 'Calcification of vessels', 'Non-specific'],
} as const;

export const SJS = {
  mucosa: ['Mouth / lips', 'Eyes', 'Genitals', 'None'],
  morphology: ['Dusky macules / atypical targets', 'Blisters', 'Sheets of peeling skin', 'Positive Nikolsky sign', 'None'],
};

export interface LesionFeatures {
  durationDays: number | null;
  over3Months: boolean;
  rapid: boolean;
  severePain: boolean;
  painless: boolean;
  startedPustuleNodule: boolean;
  /** Worse after debridement / surgery / injury, or arose at an injury site. */
  pathergy: boolean;
  failedCare: boolean;
  improvedOnImmunosuppression: boolean;
  underminedViolaceous: boolean;
  undermined: boolean;
  buruliEdge: boolean;
  rolledEdge: boolean;
  punchedOut: boolean;
  fungating: boolean;
  bizarreShape: boolean;
  multiple: boolean;
  eschar: boolean;
  inScar: boolean;
  livedo: boolean;
  palpablePurpura: boolean;
  retiformPurpura: boolean;
  cribriform: boolean;
  digitalUlcers: boolean;
  puffyFingers: boolean;
  sclerodactyly: boolean;
  telangiectasia: boolean;
  nailfold: boolean;
  violaceousNodules: boolean;
  waxyShinPlaque: boolean;
  anaestheticPatch: boolean;
  thickenedNerves: boolean;
  grains: boolean;
  acralPigmented: boolean;
  flexuralSinuses: boolean;
  protuberantPlaque: boolean;
  venous: boolean;
  absentPulses: boolean;
  site: { shin: boolean; malleolus: boolean; foot: boolean; digits: boolean; flexures: boolean; trunk: boolean; fatty: boolean; peristomal: boolean };
  systemic: { fever: boolean; weightLoss: boolean; joints: boolean; oralUlcers: boolean; raynaud: boolean; skinTightening: boolean; photoRash: boolean; alopecia: boolean; urine: boolean; ent: boolean; chest: boolean; neuropathy: boolean; bowel: boolean };
  assoc: { ibd: boolean; ra: boolean; ctd: boolean; haemMalignancy: boolean; ckd: boolean; diabetes: boolean; sickle: boolean; hiv: boolean; hepatitis: boolean; thrombosis: boolean; warfarin: boolean; newDrug: boolean; immunosuppressed: boolean; albinism: boolean; water: boolean; tb: boolean; barefoot: boolean };
  /** SJS / TEN template. */
  sjs: { mucosalSites: number; detachmentPercent: number | null; dusky: boolean; nikolsky: boolean };
  pigmented: { abcde: string[]; evolving: boolean };
  hsNodules: boolean;
  histology: string | null;
  darkSkin: boolean;
  /** Any derm / rheum relevant answer at all (decides whether the screen speaks). */
  documented: boolean;
}

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === '' ? [] : [String(v)]);

export function lesionFeatures(c: Answers, facts: Pick<PatientFacts, 'diabetes' | 'sickleCell' | 'ckd' | 'hiv' | 'immunosuppressed' | 'steroids' | 'anticoagulated' | 'febrile'>, durationDays: number | null = null): LesionFeatures {
  const S = (v: string) => c.is('au_ex_signs', v);
  const sys = (v: string) => c.is('au_systemic', v);
  const as = (v: string) => c.is('au_assoc', v);
  const site = (v: string) => c.is('au_ex_site', v);
  const longDuration = c.is('au_duration', '3–12 months', 'Over 1 year') || c.is('cw_duration', '3–12 months', 'Over 1 year')
    || c.is('pig_duration', '3–12 months', 'Over 1 year') || c.is('df_duration', 'Over 3 months') || (durationDays != null && durationDays > 90);
  const abcde = list(c.a('pig_ex_abcde')).filter(x => x !== 'None' && x !== 'Not examined');
  const evolving = list(c.a('pig_change')).some(x => x !== 'None');
  const mucosa = list(c.a('sjs_mucosa')).filter(x => x !== 'None');
  const f: LesionFeatures = {
    durationDays,
    over3Months: longDuration,
    rapid: c.is('au_progress', AU.progress[0]),
    severePain: c.is('au_pain', AU.pain[2]) || c.is('wound_pain', 'Severe', 'Pain out of proportion'),
    painless: c.is('au_pain', AU.pain[0]),
    startedPustuleNodule: c.is('au_onset', AU.onset[0], AU.onset[1]),
    pathergy: c.is('au_pathergy', 'Yes') || c.is('au_onset', AU.onset[2]),
    failedCare: c.is('au_care', AU.care[2], AU.care[3]),
    improvedOnImmunosuppression: c.is('au_immuno', AU.immuno[1]),
    underminedViolaceous: c.is('au_ex_edge', AU.edge[0]) || c.is('cw_atypical', 'Purple / undermined edge'),
    undermined: c.is('au_ex_edge', AU.edge[0], AU.edge[1], AU.edge[2]) || c.is('cw_ex_edge', 'Undermined') || c.is('cw_atypical', 'Purple / undermined edge'),
    buruliEdge: c.is('au_ex_edge', AU.edge[2]),
    rolledEdge: c.is('au_ex_edge', AU.edge[3]) || c.is('cw_ex_edge', 'Rolled / heaped / everted') || c.is('wound_heaped_edge', 'Yes') || c.is('wound_edge', 'Rolled / raised (pearly)', 'Everted'),
    punchedOut: c.is('au_ex_edge', AU.edge[4]) || c.is('cw_ex_edge', 'Punched out'),
    fungating: c.is('au_ex_edge', AU.edge[6]) || c.is('au_ex_base', AU.base[3]) || c.is('wound_floor', 'Fungating / cauliflower') || c.is('pig_ex_morphology', 'Ulcerated / fungating'),
    bizarreShape: c.is('au_ex_shape', AU.shape[1]),
    multiple: c.is('au_ex_number', AU.number[1], AU.number[2]) || c.is('cw_atypical', 'Multiple painful ulcers'),
    eschar: c.is('au_ex_base', AU.base[2]) || c.is('cw_ex_tissue', 'Necrotic (black)'),
    inScar: c.is('au_onset', AU.onset[3]) || c.is('cw_cause', 'Burn / old burn scar') || c.is('cw_ex_skin', 'Old burn scar') || c.is('pig_site_type', 'In an old scar / burn scar') || c.is('pig_risk', 'Chronic wound / scar at the site') || c.is('wound_on_scar', 'Yes'),
    livedo: S(AU.signs[0]),
    palpablePurpura: S(AU.signs[1]) || c.is('cw_atypical', 'Rash / purpura'),
    retiformPurpura: S(AU.signs[2]),
    cribriform: S(AU.signs[3]),
    digitalUlcers: S(AU.signs[4]) || site(AU.site[3]) && c.is('au_ex_number', AU.number[1], AU.number[2]),
    puffyFingers: S(AU.signs[5]),
    sclerodactyly: S(AU.signs[6]),
    telangiectasia: S(AU.signs[7]),
    nailfold: S(AU.signs[8]),
    violaceousNodules: S(AU.signs[9]),
    waxyShinPlaque: S(AU.signs[10]),
    anaestheticPatch: S(AU.signs[11]),
    thickenedNerves: S(AU.signs[12]),
    grains: S(AU.signs[13]) || c.is('au_ex_base', AU.base[5]),
    acralPigmented: S(AU.signs[14]) || c.is('pig_site_type', 'Sole of foot', 'Palm', 'Under a nail') || c.is('pig_ex_morphology', 'Nail streak / Hutchinson sign'),
    flexuralSinuses: S(AU.signs[15]) || c.has('hs_ex_hurley'),
    protuberantPlaque: S(AU.signs[16]),
    venous: S(AU.signs[17]) || c.is('cw_cause', 'Venous') || c.is('cw_ex_skin', 'Venous eczema / haemosiderin / lipodermatosclerosis'),
    absentPulses: c.is('au_ex_pulses', AU.pulses[1]) || c.is('cw_ex_pulses', 'Both absent', 'Weak / one absent'),
    site: {
      shin: site(AU.site[0]), malleolus: site(AU.site[1]), foot: site(AU.site[2]), digits: site(AU.site[3]),
      flexures: site(AU.site[6]), trunk: site(AU.site[5]), fatty: site(AU.site[4]) || site(AU.site[5]), peristomal: site(AU.site[8]),
    },
    systemic: {
      fever: sys(AU.systemic[0]) || facts.febrile, weightLoss: sys(AU.systemic[1]), joints: sys(AU.systemic[2]) || c.is('cw_atypical', 'Joint pains / mouth ulcers'),
      oralUlcers: sys(AU.systemic[3]) || c.is('cw_atypical', 'Joint pains / mouth ulcers'), raynaud: sys(AU.systemic[4]), skinTightening: sys(AU.systemic[5]),
      photoRash: sys(AU.systemic[6]), alopecia: sys(AU.systemic[7]), urine: sys(AU.systemic[8]), ent: sys(AU.systemic[9]), chest: sys(AU.systemic[10]),
      neuropathy: sys(AU.systemic[11]), bowel: sys(AU.systemic[12]),
    },
    assoc: {
      ibd: as(AU.assoc[0]), ra: as(AU.assoc[1]), ctd: as(AU.assoc[2]), haemMalignancy: as(AU.assoc[3]), ckd: as(AU.assoc[4]) || facts.ckd,
      diabetes: as(AU.assoc[5]) || facts.diabetes, sickle: as(AU.assoc[6]) || facts.sickleCell || c.is('cw_cause', 'Sickle cell'), hiv: as(AU.assoc[7]) || facts.hiv,
      hepatitis: as(AU.assoc[8]), thrombosis: as(AU.assoc[9]), warfarin: as(AU.assoc[10]) || facts.anticoagulated, newDrug: as(AU.assoc[11]) || c.is('sjs_drug_new', 'Yes'),
      immunosuppressed: as(AU.assoc[12]) || facts.immunosuppressed || facts.steroids, albinism: as(AU.assoc[13]) || c.is('pig_risk', 'Albinism'),
      water: as(AU.assoc[14]) || c.is('cw_cause', 'Infection (Buruli / tropical)'), tb: as(AU.assoc[15]), barefoot: as(AU.assoc[16]),
    },
    sjs: {
      mucosalSites: mucosa.length,
      detachmentPercent: c.num('sjs_ex_bsa'),
      dusky: c.is('sjs_ex_morphology', SJS.morphology[0], SJS.morphology[1], SJS.morphology[2]),
      nikolsky: c.is('sjs_ex_morphology', SJS.morphology[3]),
    },
    pigmented: { abcde, evolving },
    hsNodules: c.has('hs_ex_hurley') || S(AU.signs[15]),
    histology: (() => { const h = c.a('au_histo'); return typeof h === 'string' && h !== 'Not done' ? h : null; })(),
    darkSkin: c.is('au_ex_skin', AU.skin[0]) || !c.has('au_ex_skin'),
    documented: false,
  };
  f.documented = ['au_', 'cw_', 'pig_', 'sjs_', 'hs_', 'kel_'].some(p => PREFIX_PROBE.some(id => id.startsWith(p) && c.has(id)));
  return f;
}

/** Answers that mean the clinician described a lesion or ulcer at all. */
const PREFIX_PROBE = ['au_duration', 'au_ex_edge', 'au_ex_signs', 'au_systemic', 'au_assoc', 'au_progress', 'cw_duration', 'cw_ex_edge', 'cw_atypical', 'cw_cause', 'pig_ex_abcde', 'pig_site_type', 'pig_change', 'sjs_mucosa', 'sjs_ex_morphology', 'hs_ex_hurley', 'kel_ex_type'];
