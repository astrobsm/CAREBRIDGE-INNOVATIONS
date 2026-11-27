/**
 * Scoring and criteria tools for skin and rheumatic disease. Pure; every
 * tool names its source and says whether it is a diagnostic aid, a
 * CLASSIFICATION criterion (for research cohorts; it does not make or
 * exclude a diagnosis) or a prognostic score.
 *
 * Points within one `domain` are not added: only the highest-weighted item
 * ticked in that domain counts (as the SLE, SSc criteria specify).
 */

export interface ScoreItem {
  id: string;
  label: string;
  /** Points (single-set tools). */
  points: number;
  /** Only the highest item per domain counts. */
  domain?: string;
  /** SLE: a clinical (not immunological) criterion. */
  clinical?: boolean;
  /** ANCA 2022: points per criteria set (gpa / mpa / egpa). */
  weights?: Record<string, number>;
}

export type ScoreKind = 'diagnostic_aid' | 'classification' | 'staging' | 'prognostic' | 'referral';

export interface ScoreResult {
  total: number;
  /** null = cannot be applied (entry criterion not met). */
  met: boolean | null;
  band: string;
  detail: string[];
}

export interface ScoreTool {
  id: string;
  name: string;
  kind: ScoreKind;
  /** One choice only (staging). */
  single?: boolean;
  /** Must be ticked before the score applies. */
  entry?: { id: string; label: string };
  items: ScoreItem[];
  source: string;
  caveat: string;
  /** Not yet checked by a clinician against the source. */
  pendingValidation?: string;
  compute: (checked: readonly string[]) => ScoreResult;
}

const domainTotal = (items: ScoreItem[], checked: readonly string[], key?: string): number => {
  const best = new Map<string, number>();
  let free = 0;
  for (const it of items) {
    if (!checked.includes(it.id)) continue;
    const p = key ? (it.weights?.[key] ?? 0) : it.points;
    if (it.domain) best.set(it.domain, Math.max(best.get(it.domain) ?? -Infinity, p));
    else free += p;
  }
  return free + [...best.values()].reduce((a, b) => a + b, 0);
};

const it = (id: string, label: string, points: number, extra: Partial<ScoreItem> = {}): ScoreItem => ({ id, label, points, ...extra });

// ── PARACELSUS (pyoderma gangrenosum) ──────────────────────────────────────
const PARACELSUS_ITEMS: ScoreItem[] = [
  it('progressive', 'Progressing disease (rapidly enlarging)', 3),
  it('no_ddx', 'Assessment of relevant differential diagnoses: none fits better (infection, vasculitis, malignancy, venous / arterial excluded)', 3),
  it('violaceous', 'Reddish-violaceous wound border', 3),
  it('immuno_response', 'Amelioration by immunosuppressant drugs', 2),
  it('bizarre', 'Characteristically irregular (bizarre) ulcer shape', 2),
  it('pain', 'Extreme pain (over 4 on a 10-point scale)', 2),
  it('trauma_site', 'Localisation of the lesion at a site of trauma (pathergy)', 2),
  it('suppurative', 'Suppurative (neutrophilic) inflammation on histopathology', 1),
  it('undermined', 'Undermined wound border', 1),
  it('systemic', 'Systemic disease associated (IBD, arthritis, haematological malignancy / paraprotein)', 1),
];
export const PARACELSUS: ScoreTool = {
  id: 'paracelsus', name: 'PARACELSUS score (pyoderma gangrenosum)', kind: 'diagnostic_aid', items: PARACELSUS_ITEMS,
  source: 'Jockenhöfer F, Wollina U, Salva KA, Benson S, Dissemond J. The PARACELSUS score: a novel diagnostic tool for pyoderma gangrenosum. Br J Dermatol. 2019;180(3):615-620.',
  caveat: 'A score of 10 or more makes pyoderma gangrenosum highly likely; it is an aid, not proof. Biopsy to exclude mimics.',
  compute: checked => {
    const total = domainTotal(PARACELSUS_ITEMS, checked);
    const met = total >= 10;
    return { total, met, band: met ? `${total} of 20: pyoderma gangrenosum highly likely (10 or more)` : `${total} of 20: below 10, pyoderma gangrenosum less likely — keep the differential open`, detail: [] };
  },
};

// ── 2019 EULAR/ACR SLE classification ─────────────────────────────────────
const SLE_ITEMS: ScoreItem[] = [
  it('fever', 'Fever (over 38.3 °C)', 2, { domain: 'constitutional', clinical: true }),
  it('leukopenia', 'Leukopenia (below 4,000/mm³)', 3, { domain: 'haematologic', clinical: true }),
  it('thrombocytopenia', 'Thrombocytopenia (below 100,000/mm³)', 4, { domain: 'haematologic', clinical: true }),
  it('haemolysis', 'Autoimmune haemolysis', 4, { domain: 'haematologic', clinical: true }),
  it('delirium', 'Delirium', 2, { domain: 'neuropsychiatric', clinical: true }),
  it('psychosis', 'Psychosis', 3, { domain: 'neuropsychiatric', clinical: true }),
  it('seizure', 'Seizure', 5, { domain: 'neuropsychiatric', clinical: true }),
  it('alopecia', 'Non-scarring alopecia', 2, { domain: 'mucocutaneous', clinical: true }),
  it('oral_ulcers', 'Oral ulcers', 2, { domain: 'mucocutaneous', clinical: true }),
  it('scle_dle', 'Subacute cutaneous or discoid lupus', 4, { domain: 'mucocutaneous', clinical: true }),
  it('acle', 'Acute cutaneous lupus', 6, { domain: 'mucocutaneous', clinical: true }),
  it('effusion', 'Pleural or pericardial effusion', 5, { domain: 'serosal', clinical: true }),
  it('pericarditis', 'Acute pericarditis', 6, { domain: 'serosal', clinical: true }),
  it('joints', 'Joint involvement (synovitis of 2 or more joints, or tenderness with 30 min morning stiffness)', 6, { domain: 'musculoskeletal', clinical: true }),
  it('proteinuria', 'Proteinuria over 0.5 g/24 h', 4, { domain: 'renal', clinical: true }),
  it('ln_2_5', 'Renal biopsy: class II or V lupus nephritis', 8, { domain: 'renal', clinical: true }),
  it('ln_3_4', 'Renal biopsy: class III or IV lupus nephritis', 10, { domain: 'renal', clinical: true }),
  it('apl', 'Anticardiolipin, anti-β2GPI or lupus anticoagulant', 2, { domain: 'apl' }),
  it('low_c3_or_c4', 'Low C3 OR low C4', 3, { domain: 'complement' }),
  it('low_c3_and_c4', 'Low C3 AND low C4', 4, { domain: 'complement' }),
  it('dsdna_sm', 'Anti-dsDNA or anti-Smith antibody', 6, { domain: 'sle_antibodies' }),
];
export const SLE_2019: ScoreTool = {
  id: 'sle2019', name: '2019 EULAR/ACR classification criteria for SLE', kind: 'classification', items: SLE_ITEMS,
  entry: { id: 'ana', label: 'Entry: ANA titre of 1:80 or more on HEp-2 cells (ever)' },
  source: 'Aringer M, Costenbader K, Daikh D, et al. 2019 European League Against Rheumatism/American College of Rheumatology classification criteria for systemic lupus erythematosus. Arthritis Rheumatol. 2019;71(9):1400-1412.',
  caveat: 'CLASSIFICATION criteria, not diagnostic: count a criterion only if nothing else explains it better; it need not be present at the same time; only the highest item in each domain counts; at least one clinical criterion and 10 or more points are required.',
  compute: checked => {
    if (!checked.includes('ana')) return { total: 0, met: null, band: 'Entry criterion not met (ANA 1:80 or more): the criteria do not apply', detail: [] };
    const total = domainTotal(SLE_ITEMS, checked);
    const clinical = SLE_ITEMS.some(i => i.clinical && checked.includes(i.id));
    const met = total >= 10 && clinical;
    return { total, met, band: met ? `${total} points: meets the classification criteria for SLE (10 or more, with a clinical criterion)` : !clinical ? `${total} points: no clinical criterion ticked — not classifiable as SLE` : `${total} points: below 10 — does not meet the classification criteria`, detail: [] };
  },
};

// ── 2013 ACR/EULAR systemic sclerosis classification ──────────────────────
const SSC_ITEMS: ScoreItem[] = [
  it('proximal', 'Skin thickening of the fingers of both hands extending proximal to the MCP joints (sufficient on its own)', 9),
  it('puffy', 'Puffy fingers', 2, { domain: 'fingers' }),
  it('sclerodactyly', 'Sclerodactyly of the fingers (distal to MCP, proximal to PIP)', 4, { domain: 'fingers' }),
  it('tip_ulcers', 'Digital tip ulcers', 2, { domain: 'tips' }),
  it('pitting', 'Fingertip pitting scars', 3, { domain: 'tips' }),
  it('telangiectasia', 'Telangiectasia', 2),
  it('nailfold', 'Abnormal nail-fold capillaries', 2),
  it('pah_ild', 'Pulmonary arterial hypertension and / or interstitial lung disease', 2),
  it('raynaud', 'Raynaud\'s phenomenon', 3),
  it('antibodies', 'SSc-related antibodies (anti-centromere, anti-topoisomerase I [Scl-70], anti-RNA polymerase III)', 3),
];
export const SSC_2013: ScoreTool = {
  id: 'ssc2013', name: '2013 ACR/EULAR classification criteria for systemic sclerosis', kind: 'classification', items: SSC_ITEMS,
  source: 'van den Hoogen F, Khanna D, Fransen J, et al. 2013 classification criteria for systemic sclerosis: an American College of Rheumatology/European League Against Rheumatism collaborative initiative. Arthritis Rheum. 2013;65(11):2737-2747.',
  caveat: 'CLASSIFICATION criteria: not for patients with skin thickening sparing the fingers, or with a scleroderma-like disorder that better explains the findings. Only the higher item counts in "fingers" and in "fingertip lesions".',
  compute: checked => {
    const total = domainTotal(SSC_ITEMS, checked);
    const met = total >= 9;
    return { total, met, band: met ? `${total} points: meets the classification criteria for systemic sclerosis (9 or more)` : `${total} points: below 9`, detail: [] };
  },
};

// ── 2022 ACR/EULAR ANCA-associated vasculitis classification ──────────────
const ANCA_ITEMS: ScoreItem[] = [
  it('nasal', 'Nasal involvement: bloody discharge, ulcers, crusting, congestion, blockage, or septal defect / perforation', 0, { weights: { gpa: 3, mpa: -3 } }),
  it('cartilage', 'Cartilaginous involvement (ear / nose cartilage inflammation, hoarse voice or stridor, endobronchial involvement, saddle nose)', 0, { weights: { gpa: 2 } }),
  it('hearing', 'Conductive or sensorineural hearing loss', 0, { weights: { gpa: 1 } }),
  it('obstructive', 'Obstructive airway disease (asthma)', 0, { weights: { egpa: 3 } }),
  it('polyps', 'Nasal polyps', 0, { weights: { egpa: 3 } }),
  it('mononeuritis', 'Mononeuritis multiplex', 0, { weights: { egpa: 1 } }),
  it('canca_pr3', 'Positive cANCA or anti-PR3', 0, { weights: { gpa: 5, mpa: -1, egpa: -3 } }),
  it('panca_mpo', 'Positive pANCA or anti-MPO', 0, { weights: { gpa: -1, mpa: 6 } }),
  it('eos', 'Blood eosinophils 1 × 10⁹/L or more', 0, { weights: { gpa: -4, mpa: -4, egpa: 5 } }),
  it('lung_nodules', 'Pulmonary nodules, mass or cavitation on chest imaging', 0, { weights: { gpa: 2 } }),
  it('fibrosis_ild', 'Fibrosis or interstitial lung disease on chest imaging', 0, { weights: { mpa: 3 } }),
  it('granuloma', 'Granuloma, extravascular granulomatous inflammation or giant cells on biopsy', 0, { weights: { gpa: 2 } }),
  it('sinus_imaging', 'Inflammation, consolidation or effusion of the nasal / paranasal sinuses, or mastoiditis, on imaging', 0, { weights: { gpa: 1 } }),
  it('pauci_gn', 'Pauci-immune glomerulonephritis on biopsy', 0, { weights: { gpa: 1, mpa: 3 } }),
  it('eos_biopsy', 'Extravascular eosinophilic-predominant inflammation on biopsy', 0, { weights: { egpa: 2 } }),
  it('haematuria', 'Haematuria', 0, { weights: { egpa: -1 } }),
];
const ANCA_SETS = [
  { key: 'gpa', name: 'Granulomatosis with polyangiitis', threshold: 5 },
  { key: 'mpa', name: 'Microscopic polyangiitis', threshold: 5 },
  { key: 'egpa', name: 'Eosinophilic granulomatosis with polyangiitis', threshold: 6 },
] as const;
export const ANCA_2022: ScoreTool = {
  id: 'anca2022', name: '2022 ACR/EULAR classification criteria for ANCA-associated vasculitis (GPA, MPA, EGPA)', kind: 'classification', items: ANCA_ITEMS,
  entry: { id: 'vasculitis_diagnosed', label: 'Entry: a diagnosis of small- or medium-vessel vasculitis has been made, and mimics are excluded' },
  source: 'Robson JC et al. Ann Rheum Dis. 2022;81(3):315-320 (GPA); Suppiah R et al. Ann Rheum Dis. 2022;81(3):321-326 (MPA); Grayson PC et al. Ann Rheum Dis. 2022;81(3):309-314 (EGPA).',
  caveat: 'CLASSIFICATION ONLY, NOT DIAGNOSIS: apply only after a vasculitis diagnosis is made and mimics (infection, malignancy, drugs, cocaine) are excluded. GPA 5 or more, MPA 5 or more, EGPA 6 or more.',
  compute: checked => {
    if (!checked.includes('vasculitis_diagnosed')) return { total: 0, met: null, band: 'Not applicable until vasculitis is diagnosed and mimics are excluded', detail: [] };
    const detail = ANCA_SETS.map(s => {
      const n = domainTotal(ANCA_ITEMS, checked, s.key);
      return { ...s, n, met: n >= s.threshold };
    });
    const best = detail.filter(d => d.met).sort((a, b) => b.n - a.n)[0];
    return {
      total: best?.n ?? Math.max(...detail.map(d => d.n)), met: !!best,
      band: best ? `Classifies as ${best.name} (${best.n}; threshold ${best.threshold})` : 'Meets none of the three classification thresholds',
      detail: detail.map(d => `${d.name}: ${d.n} (${d.met ? 'meets' : 'below'} ${d.threshold})`),
    };
  },
};

// ── Hurley staging (hidradenitis suppurativa) ─────────────────────────────
const HURLEY_ITEMS: ScoreItem[] = [
  it('stage1', 'Abscess formation, single or multiple, without sinus tracts or scarring', 1, { domain: 'stage' }),
  it('stage2', 'Recurrent abscesses with sinus tracts and scarring; single or multiple widely separated lesions', 2, { domain: 'stage' }),
  it('stage3', 'Diffuse or near-diffuse involvement, or multiple interconnected tracts and abscesses across the entire area', 3, { domain: 'stage' }),
];
export const HURLEY: ScoreTool = {
  id: 'hurley', name: 'Hurley staging (hidradenitis suppurativa)', kind: 'staging', single: true, items: HURLEY_ITEMS,
  source: 'Hurley HJ. In: Roenigk RK, Roenigk HH, eds. Dermatologic Surgery: Principles and Practice. New York: Marcel Dekker; 1989:729-739.',
  caveat: 'Stage the worst-affected region. Stage II–III usually needs surgery as well as medical treatment.',
  compute: checked => {
    const total = domainTotal(HURLEY_ITEMS, checked);
    return { total, met: total > 0 ? true : null, band: total ? `Hurley stage ${['', 'I', 'II', 'III'][total]}` : 'Not staged', detail: [] };
  },
};

// ── SCORTEN (toxic epidermal necrolysis) ──────────────────────────────────
const SCORTEN_ITEMS: ScoreItem[] = [
  it('age40', 'Age 40 years or more', 1),
  it('malignancy', 'Malignancy present', 1),
  it('hr120', 'Heart rate 120/min or more', 1),
  it('bsa10', 'Epidermal detachment over 10% of body surface area at admission', 1),
  it('urea', 'Serum urea over 10 mmol/L (28 mg/dL)', 1),
  it('bicarb', 'Serum bicarbonate below 20 mmol/L', 1),
  it('glucose', 'Serum glucose over 14 mmol/L (252 mg/dL)', 1),
];
/** Predicted mortality by SCORTEN (Bastuji-Garin 2000). */
export const SCORTEN_MORTALITY = ['3.2%', '3.2%', '12.1%', '35.3%', '58.3%', '90.0%', '90.0%', '90.0%'];
export const SCORTEN: ScoreTool = {
  id: 'scorten', name: 'SCORTEN (toxic epidermal necrolysis)', kind: 'prognostic', items: SCORTEN_ITEMS,
  source: 'Bastuji-Garin S, Fouchard N, Bertocchi M, Roujeau JC, Revuz J, Wolkenstein P. SCORTEN: a severity-of-illness score for toxic epidermal necrolysis. J Invest Dermatol. 2000;115(2):149-153.',
  caveat: 'Calculate within 24 hours of admission and again on day 3. A prognostic score: it does not decide whether to admit (every SJS / TEN is admitted).',
  compute: checked => {
    const total = domainTotal(SCORTEN_ITEMS, checked);
    return { total, met: total >= 2, band: `SCORTEN ${total}: predicted mortality ${SCORTEN_MORTALITY[total]}`, detail: [] };
  },
};

/** SCORTEN straight from numbers (age, heart rate, BSA %, urea mmol/L, bicarbonate mmol/L, glucose mmol/L). */
export function scortenItems(v: { age?: number | null; malignancy?: boolean; heartRate?: number | null; bsaPercent?: number | null; ureaMmolL?: number | null; bicarbonateMmolL?: number | null; glucoseMmolL?: number | null }): string[] {
  const out: string[] = [];
  if ((v.age ?? 0) >= 40) out.push('age40');
  if (v.malignancy) out.push('malignancy');
  if ((v.heartRate ?? 0) >= 120) out.push('hr120');
  if ((v.bsaPercent ?? 0) > 10) out.push('bsa10');
  if ((v.ureaMmolL ?? 0) > 10) out.push('urea');
  if (v.bicarbonateMmolL != null && v.bicarbonateMmolL < 20) out.push('bicarb');
  if ((v.glucoseMmolL ?? 0) > 14) out.push('glucose');
  return out;
}

// ── Pigmented lesions ─────────────────────────────────────────────────────
const SEVEN_ITEMS: ScoreItem[] = [
  it('size', 'Major: change in size', 2),
  it('shape', 'Major: irregular shape', 2),
  it('colour', 'Major: irregular colour', 2),
  it('diameter7', 'Minor: largest diameter 7 mm or more', 1),
  it('inflammation', 'Minor: inflammation', 1),
  it('oozing', 'Minor: oozing', 1),
  it('sensation', 'Minor: change in sensation', 1),
];
export const SEVEN_POINT: ScoreTool = {
  id: 'seven_point', name: 'Weighted 7-point checklist (pigmented lesion)', kind: 'referral', items: SEVEN_ITEMS,
  source: 'NICE NG12. Suspected cancer: recognition and referral (2015, updated 2023), recommendation 1.7.2 (weighted 7-point checklist; MacKie 1990).',
  caveat: 'Score 3 or more: suspected melanoma pathway (urgent biopsy / referral). Also act on any strong concern below 3. Developed in white populations: on dark skin, acral sites and nails need the CUBED aid as well.',
  compute: checked => {
    const total = domainTotal(SEVEN_ITEMS, checked);
    return { total, met: total >= 3, band: total >= 3 ? `${total}: 3 or more — urgent biopsy / suspected melanoma pathway` : `${total}: below 3 — act on clinical concern`, detail: [] };
  },
};

const ABCDE_ITEMS: ScoreItem[] = [
  it('a', 'Asymmetry', 1), it('b', 'Border irregularity', 1), it('c', 'Colour variegation', 1), it('d', 'Diameter over 6 mm', 1), it('e', 'Evolution (change in size, shape, colour, bleeding)', 1),
];
export const ABCDE: ScoreTool = {
  id: 'abcde', name: 'ABCDE criteria (pigmented lesion)', kind: 'referral', items: ABCDE_ITEMS,
  source: 'Abbasi NR, Shaw HM, Rigel DS, et al. Early diagnosis of cutaneous melanoma: revisiting the ABCD criteria. JAMA. 2004;292(22):2771-2776.',
  caveat: 'No validated cut-off. Practice default: two or more features, or any evolution, is suspicious (pending clinical validation).',
  pendingValidation: 'The "two or more, or any E" threshold is the app\'s default (matches the pigmented-lesion template), not from the source.',
  compute: checked => {
    const total = domainTotal(ABCDE_ITEMS, checked);
    const met = total >= 2 || checked.includes('e');
    return { total, met, band: met ? `${total} of 5: suspicious — biopsy` : `${total} of 5`, detail: [] };
  },
};

const CUBED_ITEMS: ScoreItem[] = [
  it('c', 'Colour: any pigmented lesion on the foot / nail, or colour change', 1),
  it('u', 'Uncertain diagnosis', 1),
  it('b', 'Bleeding: on the foot or under the nail, or granulation tissue', 1),
  it('e', 'Enlargement or worsening despite treatment', 1),
  it('d', 'Delay in healing beyond 2 months', 1),
];
export const CUBED: ScoreTool = {
  id: 'cubed', name: 'CUBED aid (melanoma of the foot and nail unit)', kind: 'referral', items: CUBED_ITEMS,
  source: 'Bristow IR, de Berker DA, Acland KM, Turner RJ, Bowling J. Clinical guidelines for the recognition of melanoma of the foot and nail unit. J Foot Ankle Res. 2010;3:25.',
  caveat: 'Designed for acral sites, where ABCDE performs poorly. Threshold applied here: two or more features — refer / biopsy (pending clinical validation).',
  pendingValidation: 'The referral threshold (two or more features) is recalled from the source and needs checking.',
  compute: checked => {
    const total = domainTotal(CUBED_ITEMS, checked);
    return { total, met: total >= 2, band: total >= 2 ? `${total} of 5: refer / biopsy` : `${total} of 5`, detail: [] };
  },
};

export const SCORE_TOOLS: readonly ScoreTool[] = [PARACELSUS, SLE_2019, SSC_2013, ANCA_2022, HURLEY, SCORTEN, SEVEN_POINT, ABCDE, CUBED];
export const SCORE_TOOL_BY_ID: Record<string, ScoreTool> = Object.fromEntries(SCORE_TOOLS.map(t => [t.id, t]));
