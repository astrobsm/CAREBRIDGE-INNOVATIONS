/**
 * Dermatology and rheumatology conditions: the "Atypical ulcer / possible
 * inflammatory cause" screen, SJS / TEN, and hidradenitis suppurativa.
 *
 * Their plan lines come from the derm & rheum knowledge base
 * (domains/derm-rheum/kb), so the investigations, referrals and warnings are
 * the cited entries, live and without AI, like every other template.
 */
import type { ConditionContext, ConditionTemplate, TemplateLine } from './types';
import { P, YNU, counselAll, exMulti, exSel, followUp, monitor, multi, numQ, problem, proc, refer, sel, text } from './kit';
import { AU, SJS, lesionFeatures } from '../../../derm-rheum/features';
import { screen, type Candidate } from '../../../derm-rheum/screen';
import { dermHardRules } from '../../../derm-rheum/hardRules';
import { KB_BY_ID, KB_VERSION, SPECIALTY_LABEL, type KbCondition } from '../../../derm-rheum/kb';
import { SCORTEN, scortenItems } from '../../../derm-rheum/scores';

const L = P.conditions;
const DR = P.dermRheum;
const KB_LABEL = (c: KbCondition) => `Derm & rheum knowledge base v${KB_VERSION}: ${c.label}`;

/** KB investigations, referrals and warnings of the leading candidates, as template lines (deduplicated). */
export function kbLines(cands: Candidate[], max = 3): TemplateLine[] {
  const out: TemplateLine[] = [];
  const seen = new Set<string>();
  for (const cand of cands.slice(0, max)) {
    const kb = KB_BY_ID[cand.id];
    if (!kb) continue;
    for (const i of kb.investigations.slice(0, 9)) {
      if (seen.has(`inv:${i.id}`)) continue;
      seen.add(`inv:${i.id}`);
      const testId = i.catalogueCode ?? `dr_${i.id}`;
      out.push({ id: `inv:dr_${i.id}`, section: 'investigations', text: i.text, why: `${i.why} (${kb.label})`, urgency: i.urgency, sourceLabel: KB_LABEL(kb),
        test: { id: testId }, patient: DR.testWords[i.kind] });
    }
    for (const r of kb.refer) {
      if (seen.has(`ref:${r.to}`)) continue;
      seen.add(`ref:${r.to}`);
      out.push({ id: `ref:dr_${r.to}`, section: 'referrals', text: `${SPECIALTY_LABEL[r.to]}: ${r.when}`, why: kb.label, urgency: r.urgency, sourceLabel: KB_LABEL(kb) });
    }
  }
  return out;
}

const features = (c: ConditionContext) => lesionFeatures(c, c.facts, null);

// ── Atypical ulcer / possible inflammatory cause ──────────────────────────
export const ATYPICAL_ULCER: ConditionTemplate = {
  id: 'atypical_ulcer', label: 'Atypical ulcer / possible inflammatory cause', group: 'Wounds', prefix: 'au_',
  synonyms: ['atypical ulcer', 'inflammatory ulcer', 'pyoderma gangrenosum', 'vasculitic ulcer', 'vasculitis ulcer', 'lupus ulcer', 'scleroderma ulcer', 'digital ulcer', 'calciphylaxis', 'Buruli ulcer', 'necrobiosis lipoidica', 'Marjolin ulcer', 'Kaposi sarcoma', 'mycetoma', 'leprosy ulcer'],
  complaintIds: [], suggestFor: ['chronic_ulcer', 'leg_ulcer', 'foot_ulcer', 'ulcer_in_scar', 'wound_infection', 'skin_lesion', 'burn_wound_old'],
  woundProtocol: true,
  history: {
    id: 'cond_atypical_ulcer', title: 'Atypical ulcer screen (derm & rheum)',
    questions: [
      sel('au_duration', 'How long has it been present', [...AU.duration]),
      sel('au_progress', 'How fast is it changing', [...AU.progress], { redFlags: [AU.progress[0]] }),
      sel('au_pain', 'Pain', [...AU.pain], { redFlags: [AU.pain[2]] }),
      sel('au_onset', 'How it started', [...AU.onset]),
      sel('au_pathergy', 'Got worse after debridement, surgery, an injection or minor injury', YNU, { redFlags: ['Yes'] }),
      sel('au_care', 'Response to good wound care', [...AU.care], { redFlags: [AU.care[2], AU.care[3]] }),
      sel('au_immuno', 'Response to steroids / immunosuppression', [...AU.immuno]),
      multi('au_systemic', 'Systemic symptoms', [...AU.systemic], { redFlags: ['Blood in urine / foamy urine', 'Cough or coughing blood', 'Numbness, tingling or foot drop'] }),
      multi('au_assoc', 'Associated conditions and exposures', [...AU.assoc]),
      text('au_drugs', 'New medicines (name and start date)'),
      sel('au_histo', 'Biopsy result, if already done', [...AU.histo]),
    ],
  },
  exam: {
    id: 'cond_atypical_ulcer_exam', title: 'Atypical ulcer examination',
    questions: [
      exMulti('au_ex_site', 'Site(s)', [...AU.site]),
      exSel('au_ex_number', 'Number of ulcers', [...AU.number]),
      numQ('au_ex_length', 'Largest ulcer length', 'cm'), numQ('au_ex_width', 'Largest ulcer width', 'cm'),
      exSel('au_ex_edge', 'Edge', [...AU.edge], { redFlags: [AU.edge[0], AU.edge[3], AU.edge[6]] }),
      exSel('au_ex_shape', 'Outline', [...AU.shape]),
      exMulti('au_ex_base', 'Base', [...AU.base]),
      exMulti('au_ex_signs', 'Surrounding and other skin signs (on dark skin: erythema and purpura look violaceous, dusky or grey-brown — feel for warmth and induration)', [...AU.signs],
        { redFlags: [AU.signs[1], AU.signs[2], AU.signs[14]] }),
      exSel('au_ex_pulses', 'Foot / hand pulses', [...AU.pulses]),
      exSel('au_ex_skin', 'Skin tone', [...AU.skin]),
    ],
  },
  sources: [
    `Derm & rheum knowledge base v${KB_VERSION} (domains/derm-rheum/kb), with the sources of each condition.`,
    'Maverakis E et al. JAMA Dermatol. 2018;154(4):461-466 (pyoderma gangrenosum).',
    'Jennette JC et al. Arthritis Rheum. 2013;65(1):1-11 (Chapel Hill 2012 vasculitis nomenclature).',
    'AstroHEALTH Wound Clinic Protocol (26 Nov 2026): biopsy of a non-healing ulcer.',
  ],
  woundSignals: c => {
    const f = features(c);
    return {
      biopsyIndicated: f.over3Months || f.rolledEdge || f.inScar || f.fungating || f.underminedViolaceous || f.failedCare,
      vasculitisSuspected: f.palpablePurpura || f.retiformPurpura || f.livedo || f.multiple,
      legOrFootUlcer: f.site.shin || f.site.malleolus || f.site.foot || f.site.fatty,
    };
  },
  hardRules: c => { const f = features(c); return dermHardRules(f, screen(f).candidates).map(r => r.text); },
  plan: c => {
    const f = features(c);
    const s = screen(f);
    const rules = dermHardRules(f, s.candidates);
    const pg = rules.some(r => r.id === 'pg_no_debride');
    const top = s.candidates.slice(0, 3);
    const out: TemplateLine[] = [
      problem('au', `Atypical ulcer${s.flags.length ? `: ${s.flags.map(x => x.text).join('; ')}` : ' (screen: no atypical feature recorded yet)'}${top.length ? ` — consider ${top.map(x => x.label).join(', ')}` : ''}`,
        { patient: L.atypical_ulcer.name, urgency: rules.some(r => r.id === 'sjs_emergency') ? 'urgent' : s.atypical || rules.length ? 'soon' : 'routine' }),
      ...kbLines(s.candidates),
      monitor('au_photo', 'Photograph and measure the ulcer at each visit; mark the edge to see spread (rapid spread suggests pyoderma gangrenosum or vasculitis)'),
      followUp('au_results', 'In 1–2 weeks', 'Biopsy and blood results; derm / rheum plan', 10, { patient: 'A visit for your test results' }),
      ...counselAll('au', L.atypical_ulcer.counselling),
    ];
    if (rules.some(r => r.id === 'biopsy_chronic')) out.push(proc('au_biopsy', pg ? 'Small edge biopsy only (histology + culture), after discussing pathergy' : 'Wedge biopsy of the edge and base (several sites if large) for histology, with tissue for culture', 'Exclude malignancy, vasculitis and infection before definitive treatment', { urgency: 'soon', patient: L.atypical_ulcer.options.biopsy }));
    if (pg) out.push(proc('au_gentle', 'Gentle cleansing and moist, non-adherent dressings only; no sharp debridement, excision or graft while pyoderma gangrenosum is possible', 'Pathergy (Maverakis 2018)', { urgency: 'soon', patient: L.atypical_ulcer.options.gentleCare }));
    if (s.atypical && !top.some(x => KB_BY_ID[x.id]?.refer.some(r => r.to === 'dermatology' || r.to === 'rheumatology'))) {
      out.push(refer('au_derm', 'Dermatology (or rheumatology if systemic features)', 'Atypical ulcer screen positive', { urgency: 'soon', patient: L.atypical_ulcer.options.specialist }));
    }
    return out;
  },
};

// ── Stevens–Johnson syndrome / toxic epidermal necrolysis ─────────────────
export const SJS_TEN: ConditionTemplate = {
  id: 'sjs_ten', label: 'Drug eruption / suspected SJS–TEN', group: 'Skin and soft tissue', prefix: 'sjs_',
  synonyms: ['SJS', 'TEN', 'Stevens-Johnson syndrome', 'toxic epidermal necrolysis', 'drug eruption', 'drug reaction', 'skin peeling after medicine'],
  complaintIds: ['blisters'], suggestFor: ['rash'],
  history: {
    id: 'cond_sjs_ten', title: 'Drug eruption / SJS–TEN',
    questions: [
      sel('sjs_drug_new', 'New medicine in the last 8 weeks', YNU, { redFlags: ['Yes'] }),
      text('sjs_drug', 'Which medicine(s) and when started (co-trimoxazole, nevirapine, carbamazepine, phenytoin, lamotrigine, allopurinol, NSAIDs…)'),
      multi('sjs_prodrome', 'Before the rash', ['Fever', 'Sore throat', 'Sore eyes', 'Painful skin', 'None']),
      sel('sjs_malignancy', 'Known cancer', YNU),
    ],
  },
  exam: {
    id: 'cond_sjs_ten_exam', title: 'Drug eruption examination',
    questions: [
      exMulti('sjs_mucosa', 'Mucous membranes eroded', [...SJS.mucosa], { redFlags: ['Eyes', 'Mouth / lips', 'Genitals'] }),
      exMulti('sjs_ex_morphology', 'Skin (on dark skin dusky macules look grey-violaceous)', [...SJS.morphology], { redFlags: ['Sheets of peeling skin', 'Positive Nikolsky sign'] }),
      numQ('sjs_ex_bsa', 'Body surface area detached or detachable', '%'),
    ],
  },
  classification: { name: 'SJS under 10% BSA, overlap 10–30%, TEN over 30%; SCORTEN', source: 'Bastuji-Garin S et al. J Invest Dermatol. 2000;115(2):149-153. Creamer D et al. Br J Dermatol. 2016;174(6):1194-1227.' },
  sources: ['Creamer D et al. UK guidelines for the management of SJS/TEN in adults 2016. Br J Dermatol. 2016;174(6):1194-1227.', 'Bastuji-Garin S et al. J Invest Dermatol. 2000;115(2):149-153 (SCORTEN).'],
  hardRules: c => { const f = features(c); return dermHardRules(f, screen(f).candidates).filter(r => r.id === 'sjs_emergency').map(r => r.text); },
  plan: c => {
    const f = features(c);
    const s = screen(f);
    const suspected = (s.candidates.find(x => x.id === 'sjs_ten')?.score ?? 0) >= 4;
    const bsa = f.sjs.detachmentPercent;
    const sc = SCORTEN.compute(scortenItems({ age: c.facts.ageYears, malignancy: c.is('sjs_malignancy', 'Yes'), heartRate: null, bsaPercent: bsa, ureaMmolL: null, bicarbonateMmolL: null, glucoseMmolL: null }));
    const kb = KB_BY_ID.sjs_ten;
    const out: TemplateLine[] = [
      problem('sjs', suspected
        ? `Suspected ${bsa == null ? 'SJS / TEN' : bsa > 30 ? 'TEN' : bsa >= 10 ? 'SJS–TEN overlap' : 'SJS'}${bsa != null ? ` (${bsa}% detached)` : ''}; partial SCORTEN ${sc.total} from the clerking (add heart rate, urea, bicarbonate and glucose)`
        : 'Drug eruption: no features of SJS / TEN recorded', { patient: L.sjs_ten.name, urgency: suspected ? 'urgent' : 'soon' }),
      ...counselAll('sjs', L.sjs_ten.counselling),
    ];
    if (suspected) {
      out.push(
        proc('sjs_admit', kb.management.immediate.join('; '), 'SJS / TEN is an emergency (UK guideline 2016)', { urgency: 'urgent', patient: L.sjs_ten.options.admission }),
        ...kbLines([{ id: 'sjs_ten', label: kb.label, score: 10, why: [], mustNotMiss: true }]),
        monitor('sjs_scorten', 'SCORTEN on admission and day 3 (age, malignancy, heart rate, BSA detached, urea, bicarbonate, glucose)'),
      );
    } else {
      out.push(
        proc('sjs_stop', 'Stop the likely culprit drug; record it as an allergy', 'Drug eruption', { urgency: 'soon' }),
        followUp('sjs_48h', 'In 48 hours', 'Check for blistering, mucosal or eye involvement', 2, { patient: 'A check of your skin in two days' }),
      );
    }
    return out;
  },
};

// ── Hidradenitis suppurativa ──────────────────────────────────────────────
const HURLEY_OPTS = ['Hurley I — abscesses without tracts or scarring', 'Hurley II — recurrent abscesses with tracts and scarring, separate areas', 'Hurley III — diffuse, interconnected tracts across the area'];
export const HIDRADENITIS: ConditionTemplate = {
  id: 'hidradenitis', label: 'Hidradenitis suppurativa', group: 'Skin and soft tissue', prefix: 'hs_',
  synonyms: ['hidradenitis suppurativa', 'hidradenitis', 'acne inversa', 'HS', 'recurrent armpit boils', 'groin boils'],
  complaintIds: [], suggestFor: ['lump', 'sinus_fistula'],
  history: {
    id: 'cond_hidradenitis', title: 'Hidradenitis history',
    questions: [
      multi('hs_sites', 'Areas affected', ['Armpits', 'Groin', 'Buttocks / perianal', 'Under the breasts', 'Neck / nape', 'Other']),
      sel('hs_duration', 'Recurrent for', ['Under 6 months', '6 months–2 years', 'Over 2 years']),
      sel('hs_flares', 'Flares', ['Under 2 a year', '2–6 a year', 'Constant']),
      multi('hs_previous', 'Treatment so far', ['None', 'Incision and drainage', 'Antibiotic courses', 'Excision', 'Biologic']),
    ],
  },
  exam: {
    id: 'cond_hidradenitis_exam', title: 'Hidradenitis examination',
    questions: [
      exSel('hs_ex_hurley', 'Hurley stage (worst area)', HURLEY_OPTS),
      exSel('hs_ex_chronic', 'A long-standing open area that does not heal', ['No', 'Yes'], { redFlags: ['Yes'] }),
    ],
  },
  classification: { name: 'Hurley staging (I–III)', source: 'Hurley HJ 1989, in Roenigk RK, Roenigk HH, eds. Dermatologic Surgery.' },
  sources: ['Zouboulis CC et al. J Eur Acad Dermatol Venereol. 2015;29(4):619-644.', 'Alikhan A et al. J Am Acad Dermatol. 2019;81(1):76-90 and 91-101.'],
  plan: c => {
    const stage = HURLEY_OPTS.findIndex(o => c.is('hs_ex_hurley', o)) + 1;
    const kb = KB_BY_ID.hidradenitis;
    const out: TemplateLine[] = [
      problem('hs', `Hidradenitis suppurativa${stage ? `, Hurley ${['', 'I', 'II', 'III'][stage]}` : ' (Hurley stage not documented)'}${list(c.a('hs_sites')).length ? `: ${list(c.a('hs_sites')).join(', ')}` : ''}`, { patient: L.hidradenitis.name }),
      proc('hs_medical', stage >= 2 ? kb.management.definitive[0] : 'Topical clindamycin 1% twice daily to lesions; stop smoking; weight support', 'Hurley-based treatment (European S1 2015; North American 2019)', { patient: L.hidradenitis.options.medicines }),
      ...counselAll('hs', L.hidradenitis.counselling),
      followUp('hs_review', 'In 8–12 weeks', 'Response to treatment', 70, { patient: 'A check of how the treatment is working' }),
    ];
    if (stage >= 2) out.push(proc('hs_surgery', kb.management.definitive[1], 'Hurley II–III: tracts do not resolve with medicines alone', { procedureReviewModuleId: 'wound_care_review', patient: L.hidradenitis.options.surgery }), ...kbLines([{ id: 'hidradenitis', label: kb.label, score: 4, why: [], mustNotMiss: false }]).filter(l => l.section === 'referrals'));
    if (c.is('hs_ex_chronic', 'Yes')) out.push({ id: 'inv:hs_biopsy', section: 'investigations', text: 'Biopsy of the long-standing non-healing area', why: 'Squamous cell carcinoma in chronic hidradenitis (especially buttocks / perineum)', urgency: 'soon', test: { id: 'histo_wound_edge' }, patient: P.tests.biopsy });
    return out;
  },
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === '' ? [] : [String(v)]);

export const DERM_RHEUM_TEMPLATES: ConditionTemplate[] = [ATYPICAL_ULCER, SJS_TEN, HIDRADENITIS];
