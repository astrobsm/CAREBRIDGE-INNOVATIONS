/** The four owner cases as clerkings, shared by the tests (and mirrored by the browser drive). */
import { clerking, complaint } from '../../clinical/clerkingPlan/__tests__/fixtures';
import { AU } from '../features';

/** (a) 45-year-old woman: rapidly enlarging, painful leg ulcer, undermined violaceous edge, IBD. */
export const caseA = () => ({
  data: clerking({
    complaints: [complaint('cond_atypical_ulcer', 'Atypical ulcer / possible inflammatory cause', {
      au_duration: AU.duration[0], au_progress: AU.progress[0], au_pain: AU.pain[2], au_onset: AU.onset[0], au_pathergy: 'Yes',
      au_assoc: ['Inflammatory bowel disease'], au_systemic: ['Bloody diarrhoea / bowel symptoms'],
    }, { value: 3, unit: 'weeks' })],
    exam: { cond_atypical_ulcer_exam: { au_ex_site: ['Shin / pretibial'], au_ex_edge: AU.edge[0], au_ex_shape: AU.shape[1], au_ex_number: 'Single' } },
    vitals: { weight: 70 },
  }),
  ctx: { ageYears: 45, sex: 'Female' as const },
});

/** (b) 60-year-old man: 2-year non-healing burn-scar ulcer, rolled edges. */
export const caseB = () => ({
  data: clerking({
    complaints: [complaint('ulcer_in_scar', 'Ulcer in an old scar', { cw_duration: 'Over 1 year', cw_cause: 'Burn / old burn scar' }, { value: 2, unit: 'years' })],
    exam: { cond_chronic_wound_exam: { cw_ex_edge: 'Rolled / heaped / everted', cw_ex_skin: 'Old burn scar' } },
    vitals: { weight: 68 },
  }),
  ctx: { ageYears: 60, sex: 'Male' as const },
});

/** (c) 30-year-old woman: digital ulcers, Raynaud's, skin thickening. */
export const caseC = () => ({
  data: clerking({
    complaints: [complaint('cond_atypical_ulcer', 'Atypical ulcer / possible inflammatory cause', {
      au_duration: AU.duration[1], au_pain: AU.pain[2], au_systemic: ['Raynaud\'s (fingers turn white / blue in the cold)', 'Skin tightening of fingers or face'],
    })],
    exam: { cond_atypical_ulcer_exam: { au_ex_site: ['Fingers / toes (digits)'], au_ex_number: 'Several (2–5)', au_ex_signs: ['Digital ulcers / fingertip pitting scars', 'Sclerodactyly / thickened finger skin', 'Puffy fingers'] } },
  }),
  ctx: { ageYears: 30, sex: 'Female' as const },
});

/** (d) A pigmented plantar lesion. */
export const caseD = () => ({
  data: clerking({
    complaints: [complaint('pigmented_lesion', 'Dark / changing mole', { pig_duration: '3–12 months', pig_change: ['Size', 'Colour'], pig_site_type: 'Sole of foot' })],
    exam: { cond_pigmented_lesion_exam: { pig_ex_abcde: ['Asymmetry', 'Border irregular', 'Colour variation'], pig_ex_size: '6 mm–2 cm', pig_ex_morphology: 'Flat pigmented' } },
  }),
  ctx: { ageYears: 55, sex: 'Male' as const },
});

/** SJS / TEN on the blisters complaint. */
export const caseSjs = () => ({
  data: clerking({
    complaints: [complaint('blisters', 'Blisters / skin peeling', { sjs_drug_new: 'Yes', sjs_drug: 'co-trimoxazole 10 days ago' }, { value: 3, unit: 'days' })],
    exam: { cond_sjs_ten_exam: { sjs_mucosa: ['Mouth / lips', 'Eyes'], sjs_ex_morphology: ['Dusky macules / atypical targets', 'Positive Nikolsky sign'], sjs_ex_bsa: 15 } },
  }),
  ctx: { ageYears: 34, sex: 'Female' as const },
});
