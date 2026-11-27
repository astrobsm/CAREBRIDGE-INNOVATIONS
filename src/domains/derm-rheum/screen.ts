/**
 * The atypical-ulcer screen and the deterministic differential: which
 * features point away from a simple venous / pressure / traumatic ulcer, and
 * which knowledge-base conditions they suggest. Pure; no AI. The weights
 * are a transparent ranking aid (pending clinical validation), not a
 * validated prediction score: every candidate lists the features behind it.
 */
import type { LesionFeatures } from './features';
import { KB_BY_ID } from './kb';

export type FlagKind = 'inflammatory' | 'malignancy' | 'infection' | 'emergency';

export interface ScreenFlag { id: string; text: string; kind: FlagKind }

export interface Candidate { id: string; label: string; score: number; why: string[]; mustNotMiss: boolean }

export interface ScreenResult {
  flags: ScreenFlag[];
  /** At least one inflammatory / systemic flag: needs a derm / rheum work-up. */
  atypical: boolean;
  candidates: Candidate[];
}

export const SCREEN_VERSION = '1.0.0';
export const SCREEN_PENDING = 'Candidate weights are a transparent ranking aid set by the app (pending clinical validation), not a validated score.';

export function screenFlags(f: LesionFeatures): ScreenFlag[] {
  const out: ScreenFlag[] = [];
  const add = (on: boolean, id: string, text: string, kind: FlagKind) => { if (on) out.push({ id, text, kind }); };
  add(f.underminedViolaceous, 'violaceous_edge', 'Undermined, violaceous edge', 'inflammatory');
  add(f.rapid && f.severePain, 'rapid_painful', 'Rapid, painful progression', 'inflammatory');
  add(f.rapid && !f.severePain, 'rapid', 'Rapid progression (days to weeks)', 'inflammatory');
  add(f.pathergy, 'pathergy', 'Worse after injury or debridement (pathergy)', 'inflammatory');
  add(f.multiple, 'multiple', 'Multiple ulcers', 'inflammatory');
  add(f.livedo, 'livedo', 'Livedo', 'inflammatory');
  add(f.palpablePurpura || f.retiformPurpura, 'purpura', f.retiformPurpura ? 'Retiform purpura / necrosis' : 'Palpable purpura', 'inflammatory');
  add(f.systemic.raynaud, 'raynaud', 'Raynaud\'s phenomenon', 'inflammatory');
  add(f.digitalUlcers || f.sclerodactyly, 'digital', 'Digital ulcers or sclerodactyly', 'inflammatory');
  const sys = Object.entries(f.systemic).filter(([k, v]) => v && k !== 'raynaud').map(([k]) => k);
  add(sys.length > 0, 'systemic', `Systemic symptoms (${sys.length})`, 'inflammatory');
  add(f.failedCare, 'failed_care', 'Not healing despite good wound care', 'inflammatory');
  add(f.cribriform, 'cribriform', 'Cribriform scars of healed ulcers', 'inflammatory');
  add(f.over3Months, 'over_3_months', 'Open for over about 3 months', 'malignancy');
  add(f.rolledEdge || f.fungating, 'rolled_edge', 'Rolled, everted or fungating edge', 'malignancy');
  add(f.inScar, 'in_scar', 'Ulcer in a burn or old scar', 'malignancy');
  add(f.acralPigmented, 'acral_pigment', 'Pigmented lesion on the sole, palm or nail', 'malignancy');
  add(f.protuberantPlaque, 'atypical_keloid', 'Keloid-like plaque with protuberant nodules', 'malignancy');
  add(f.buruliEdge || f.grains || f.anaestheticPatch || f.thickenedNerves, 'tropical', 'Features of a tropical / mycobacterial infection', 'infection');
  add(f.sjs.mucosalSites >= 2 || (f.sjs.dusky && f.sjs.nikolsky) || (f.sjs.detachmentPercent ?? 0) > 10, 'sjs', 'Mucosal erosions / epidermal detachment (SJS / TEN)', 'emergency');
  return out;
}

type Rule = { id: string; points: Array<[boolean, number, string]>; min?: number };

function rules(f: LesionFeatures): Rule[] {
  const S = f.systemic, A = f.assoc;
  return [
    { id: 'pyoderma_gangrenosum', points: [[f.underminedViolaceous, 3, 'undermined violaceous edge'], [f.rapid, 2, 'rapid progression'], [f.severePain, 1, 'severe pain'], [f.pathergy, 2, 'pathergy'],
      [f.startedPustuleNodule, 1, 'began as a pustule / nodule'], [f.cribriform, 2, 'cribriform scars'], [A.ibd || S.bowel, 2, 'inflammatory bowel disease'], [A.ra, 1, 'inflammatory arthritis'],
      [A.haemMalignancy, 1, 'haematological disease / paraprotein'], [f.bizarreShape, 1, 'bizarre outline'], [f.site.peristomal, 2, 'peristomal'], [f.improvedOnImmunosuppression, 2, 'improved on immunosuppression']] },
    { id: 'small_vessel_vasculitis', points: [[f.palpablePurpura, 3, 'palpable purpura'], [A.newDrug, 1, 'new drug'], [f.multiple, 1, 'multiple ulcers'], [f.punchedOut, 1, 'punched-out ulcers'], [S.joints, 1, 'joint pain'], [S.urine, 1, 'urine symptoms']] },
    { id: 'systemic_vasculitis', points: [[f.livedo, 1, 'livedo'], [S.ent, 2, 'nose / sinus symptoms'], [S.chest, 1, 'cough / haemoptysis'], [S.neuropathy, 2, 'neuropathy'], [S.urine, 1, 'urine symptoms'],
      [S.weightLoss, 1, 'weight loss'], [S.fever, 1, 'fever'], [f.punchedOut, 1, 'punched-out ulcers'], [f.digitalUlcers, 1, 'digital ischaemia'], [f.retiformPurpura, 1, 'retiform purpura'], [A.hepatitis, 1, 'hepatitis B / C']] },
    { id: 'sle', points: [[S.oralUlcers, 1, 'mouth ulcers'], [S.photoRash, 2, 'photosensitive / facial rash'], [S.alopecia, 1, 'hair loss'], [S.joints, 1, 'joint pain'], [A.ctd, 2, 'known connective tissue disease'], [S.urine, 1, 'urine symptoms'], [A.thrombosis, 1, 'clots / miscarriages']] },
    { id: 'systemic_sclerosis', points: [[S.raynaud, 2, 'Raynaud\'s'], [S.skinTightening, 2, 'skin tightening'], [f.sclerodactyly, 3, 'sclerodactyly'], [f.puffyFingers, 1, 'puffy fingers'], [f.digitalUlcers, 3, 'digital ulcers / pitting scars'], [f.telangiectasia, 1, 'telangiectasia'], [f.nailfold, 1, 'nail-fold changes']] },
    { id: 'rheumatoid_ulcer', points: [[A.ra, 3, 'rheumatoid arthritis'], [S.joints && A.ra, 1, 'active joints']] },
    { id: 'antiphospholipid', points: [[A.thrombosis, 2, 'clots / miscarriages'], [f.livedo, 2, 'livedo'], [f.retiformPurpura, 2, 'retiform purpura'], [A.ctd, 1, 'connective tissue disease']] },
    { id: 'cryoglobulinaemia', points: [[A.hepatitis, 2, 'hepatitis B / C'], [f.palpablePurpura, 1, 'purpura'], [A.haemMalignancy, 1, 'paraprotein / lymphoma'], [S.neuropathy, 1, 'neuropathy'], [S.joints, 1, 'joint pain']], min: 3 },
    { id: 'calciphylaxis', points: [[A.ckd, 2, 'kidney failure'], [f.eschar, 1, 'black eschar'], [f.retiformPurpura, 2, 'retiform purpura'], [f.severePain, 1, 'severe pain'], [A.warfarin, 1, 'warfarin'], [f.site.fatty, 1, 'fatty area']], min: 4 },
    { id: 'livedoid_vasculopathy', points: [[f.livedo, 1, 'livedo'], [f.site.malleolus, 1, 'ankle'], [f.severePain, 1, 'severe pain'], [f.multiple, 1, 'several small ulcers']], min: 3 },
    { id: 'necrobiosis_lipoidica', points: [[f.waxyShinPlaque, 4, 'waxy yellow-brown shin plaque'], [f.waxyShinPlaque && A.diabetes, 1, 'diabetes']] },
    { id: 'sickle_cell_ulcer', points: [[A.sickle, 3, 'sickle cell disease'], [A.sickle && f.site.malleolus, 2, 'malleolar site']] },
    { id: 'marjolin_scc', points: [[f.inScar, 3, 'in a burn / old scar'], [f.rolledEdge, 2, 'rolled / everted edge'], [f.over3Months, 2, 'over 3 months'], [f.fungating, 2, 'friable / fungating base'], [A.albinism, 1, 'albinism'], [A.hiv, 1, 'HIV']] },
    { id: 'bcc', points: [[f.rolledEdge && (A.albinism), 2, 'rolled edge with albinism'], [A.albinism, 1, 'albinism']], min: 3 },
    { id: 'acral_melanoma', points: [[f.acralPigmented, 4, 'pigmented lesion on sole / palm / nail'], [f.pigmented.evolving, 1, 'changing'], [f.pigmented.abcde.length >= 2, 1, 'two or more ABCDE features'], [f.site.foot && f.over3Months && !f.acralPigmented, 1, 'non-healing sole lesion (amelanotic melanoma)']] },
    { id: 'kaposi_sarcoma', points: [[f.violaceousNodules, 3, 'violaceous / black nodules'], [A.hiv, 2, 'HIV']] },
    { id: 'buruli_ulcer', points: [[f.buruliEdge, 4, 'painless undermined edge with cotton-wool slough'], [f.painless && f.undermined, 1, 'painless undermined ulcer'], [A.water, 2, 'lives / farms near slow rivers']] },
    { id: 'tropical_ulcer', points: [[A.barefoot && (f.site.shin || f.site.malleolus), 1, 'lower leg, barefoot'], [f.rapid && (f.site.shin || f.site.malleolus) && !f.underminedViolaceous, 1, 'rapid lower-leg ulcer']], min: 2 },
    { id: 'cutaneous_tb', points: [[A.tb, 2, 'TB contact / past TB'], [S.weightLoss, 1, 'weight loss'], [A.hiv, 1, 'HIV'], [f.undermined && !f.underminedViolaceous, 1, 'undermined edge']], min: 3 },
    { id: 'leprosy', points: [[f.anaestheticPatch, 3, 'numb pale patch'], [f.thickenedNerves, 3, 'thickened nerves'], [f.site.foot && f.painless, 1, 'painless plantar ulcer']] },
    { id: 'mycetoma', points: [[f.grains, 4, 'sinuses discharging grains'], [A.barefoot, 1, 'barefoot'], [f.grains && f.site.foot, 1, 'foot']] },
    { id: 'hidradenitis', points: [[f.flexuralSinuses, 4, 'recurrent nodules / sinuses in skin folds'], [f.site.flexures, 1, 'flexural site']] },
    { id: 'dfsp', points: [[f.protuberantPlaque, 4, 'plaque with protuberant nodules'], [f.protuberantPlaque && f.site.trunk, 1, 'trunk']] },
    { id: 'sjs_ten', points: [[f.sjs.mucosalSites >= 2, 3, 'two or more mucosal sites'], [f.sjs.dusky, 2, 'dusky macules / blisters'], [f.sjs.nikolsky, 2, 'Nikolsky sign'], [A.newDrug, 2, 'new drug'], [(f.sjs.detachmentPercent ?? 0) > 10, 2, 'detachment over 10%']] },
  ];
}

/** Ranked KB candidates with the features behind each. */
export function candidates(f: LesionFeatures): Candidate[] {
  const out: Candidate[] = [];
  for (const r of rules(f)) {
    const hits = r.points.filter(([on]) => on);
    const score = hits.reduce((a, [, p]) => a + p, 0);
    const mustNotMiss = (r.id === 'marjolin_scc' && (f.over3Months || f.inScar || f.rolledEdge || f.fungating)) || (r.id === 'acral_melanoma' && f.acralPigmented) || (r.id === 'sjs_ten' && score >= 4);
    if (score >= (r.min ?? 2) || mustNotMiss) out.push({ id: r.id, label: KB_BY_ID[r.id]?.label ?? r.id, score, why: hits.map(([, , w]) => w), mustNotMiss });
  }
  return out.sort((a, b) => b.score - a.score || Number(b.mustNotMiss) - Number(a.mustNotMiss));
}

export function screen(f: LesionFeatures): ScreenResult {
  const flags = screenFlags(f);
  return { flags, atypical: flags.some(x => x.kind === 'inflammatory'), candidates: candidates(f) };
}

/** PARACELSUS items the clerking already answers ("no relevant differential" stays the clinician's call). */
export function paracelsusFromFeatures(f: LesionFeatures): string[] {
  const on: Array<[boolean, string]> = [
    [f.rapid, 'progressive'], [f.underminedViolaceous, 'violaceous'], [f.improvedOnImmunosuppression, 'immuno_response'], [f.bizarreShape, 'bizarre'],
    [f.severePain, 'pain'], [f.pathergy, 'trauma_site'], [f.histology === 'Neutrophilic / suppurative inflammation', 'suppurative'], [f.undermined, 'undermined'],
    [f.assoc.ibd || f.assoc.ra || f.assoc.haemMalignancy || f.systemic.bowel, 'systemic'],
  ];
  return on.filter(([x]) => x).map(([, id]) => id);
}

/** 2013 SSc items the clerking answers. */
export function sscFromFeatures(f: LesionFeatures): string[] {
  const on: Array<[boolean, string]> = [[f.puffyFingers, 'puffy'], [f.sclerodactyly, 'sclerodactyly'], [f.digitalUlcers, 'tip_ulcers'], [f.telangiectasia, 'telangiectasia'], [f.nailfold, 'nailfold'], [f.systemic.raynaud, 'raynaud']];
  return on.filter(([x]) => x).map(([, id]) => id);
}

/** ABCDE items from the pigmented-lesion template. */
export function abcdeFromFeatures(f: LesionFeatures): string[] {
  const map: Record<string, string> = { Asymmetry: 'a', 'Border irregular': 'b', 'Colour variation': 'c', 'Diameter over 6 mm': 'd' };
  const out = f.pigmented.abcde.map(x => map[x]).filter(Boolean);
  if (f.pigmented.evolving) out.push('e');
  return out;
}

/** Which score tools are relevant to the candidates (KB criteria.toolId), most relevant first. */
export function relevantTools(cands: Candidate[]): string[] {
  const ids = cands.map(c => KB_BY_ID[c.id]?.criteria?.toolId).filter((x): x is string => !!x);
  if (cands.some(c => c.id === 'acral_melanoma')) ids.push('abcde', 'cubed');
  return [...new Set(ids)];
}
