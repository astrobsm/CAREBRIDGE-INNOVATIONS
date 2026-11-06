/**
 * Core plan rules: the care every plastic-surgery patient needs, decided from
 * their own answers and scores, whatever the procedure.
 *
 * Optimisation before surgery, anaesthesia, VTE prophylaxis, antibiotic
 * principles, analgesia, wound care, nutrition, pressure care, psychology,
 * rehabilitation, social and financial support, education, red flags,
 * post-operative complications, discharge criteria and follow-up comparison.
 * A rule reads only fields that exist in the composed review (an absent field
 * is simply unanswered), so the same rule is safe in every phase.
 *
 * Every line carries its `why`: the answer or score that triggered it and,
 * where one exists, the guideline. Numbers are published thresholds only.
 * Drug choices stop at the class or the standard prophylactic dose; the
 * prescriber decides the rest.
 */
import type { CounsellingPoint, PlanContext, PlanContribution, PlanRule, RuleLine } from './types';
import { G, L, P, merge } from './ruleKit';
import { chosen, hasAny, isOneOf, isYes, labelOf, numOf, answered } from './core/answers';
import { anaemiaThreshold, healingBarriers } from './engine';
import { preoperativeService, fastingGuidelines } from '../../../services/preoperativeService';
import { DRESSING_SELECTION, SSKIN_BUNDLE } from '../../pressure-sore/data/clinicalProtocol';
import { educationConditionById } from '../../surgery/utils/surgicalDocumentGenerator';
import { PATIENT_FACTORS, PSYCHOLOGY, SOCIAL } from './core/holistic';
import { WOUND_ASSESSMENT } from './core/wound';
import { AGE_LIMITS, isChild, isUnder } from './core/age';

const field = (sectionFields: { id: string }[], id: string) => sectionFields.find(f => f.id === id) as Parameters<typeof labelOf>[0];
const optionLabel = (id: string, v: string) =>
  labelOf(field([...PATIENT_FACTORS.fields, ...SOCIAL.fields, ...PSYCHOLOGY.fields, ...WOUND_ASSESSMENT.fields], id), v);

const pre = (ctx: PlanContext) => ctx.phase === 'pre_op';
const post = (ctx: PlanContext) => ctx.phase === 'post_op';
const woundPhase = (ctx: PlanContext) => ctx.phase === 'wound_review';
/** Under 18: adult-only tools and wording (MUST, 4AT, incentive spirometry) do not apply. */
const child = (ctx: PlanContext) => isChild(ctx.patient, ctx.module);
/** Under 16: outside NICE NG89 and the adult Caprini / enoxaparin regimen. */
const belowVteAge = (ctx: PlanContext) => isUnder(ctx.patient, AGE_LIMITS.vte, ctx.module);

// ── Optimisation: glucose ───────────────────────────────────────────────────

const glycaemia: PlanRule = ctx => {
  const a = ctx.answers;
  const dm = a['core.diabetes'];
  const hba1c = numOf(a, 'core.hba1c'), glu = numOf(a, 'core.glucose');
  const parts: PlanContribution[] = [];
  if (dm === 'diet' || dm === 'oral' || dm === 'insulin') {
    const type = optionLabel('core.diabetes', String(dm));
    const why = `Diabetes (${type.toLowerCase()})`;
    if (hba1c != null && hba1c > 8.5 && pre(ctx)) {
      parts.push({ general: [G('Optimisation before surgery', L(
        'Defer elective surgery where it is safe to wait, and optimise glycaemic control with the diabetes team (target HbA1c 69 mmol/mol / 8.5% or below)',
        `HbA1c ${hba1c}% (CPOC 2021; JBDS-IP)`, 'urgent'))] });
    }
    if (hba1c == null && (pre(ctx) || woundPhase(ctx))) {
      parts.push({ problem: { investigations: [L('HbA1c (if none in the last 3 months)', `${why}; no HbA1c recorded`)] } });
    }
    if (pre(ctx)) {
      parts.push({ general: [G('Optimisation before surgery', L(
        'Peri-operative diabetes plan: capillary glucose target 6–10 mmol/L (acceptable 4–12); first on the list; variable-rate insulin if more than one meal will be missed; adjust insulin and oral agents per JBDS-IP',
        `${why} (JBDS-IP; CPOC 2021)`))] });
    }
    if (post(ctx) || woundPhase(ctx)) {
      parts.push({ comorbidities: [{ condition: 'Diabetes', actions: [L(
        'Capillary glucose before meals and at bedtime; target 6–10 mmol/L — hyperglycaemia impairs neutrophil function and healing',
        `${why} (JBDS-IP)`)] }] });
    }
  }
  if (dm === 'not_screened') {
    parts.push({ problem: { investigations: [L('Random or fasting glucose and HbA1c to screen for diabetes', 'Diabetes status not known')] } });
  }
  if (glu != null && glu < 4) {
    parts.push({ problem: { treatment: [child(ctx)
      ? L('Treat hypoglycaemia now: fast-acting glucose 0.3 g/kg by mouth (or IV 10% glucose 2 mL/kg if unable to take it), recheck in 15 minutes and find the cause', `Glucose ${glu} mmol/L in a child (ISPAD 2022; BSPED)`, 'urgent')
      : L('Treat hypoglycaemia now (15–20 g fast-acting carbohydrate, or IV glucose if unable to swallow) and recheck in 15 minutes', `Glucose ${glu} mmol/L (JBDS hypoglycaemia guideline)`, 'urgent')] } });
  } else if (glu != null && glu > 12) {
    parts.push({ problem: { treatment: [L('Treat the hyperglycaemia and look for its cause (infection, steroids, missed medication)', `Glucose ${glu} mmol/L — above the acceptable 4–12 mmol/L (JBDS-IP)`, 'urgent')] } });
  }
  return merge(...parts);
};

// ── Optimisation: smoking, alcohol, substances, herbal medicines ────────────

const lifestyle: PlanRule = ctx => {
  const a = ctx.answers;
  const parts: PlanContribution[] = [];
  const smoking = a['core.smoking'];
  if (smoking === 'current' || smoking === 'vaping' || smoking === 'smokeless') {
    const what = optionLabel('core.smoking', String(smoking));
    const why = `${what}: nicotine reduces skin and flap perfusion; smoking increases wound infection, dehiscence and graft / flap loss (WHO 2020 Tobacco and postsurgical outcomes)`;
    parts.push({
      general: [G(pre(ctx) ? 'Optimisation before surgery' : 'Patient education', L(
        pre(ctx)
          ? 'Stop smoking and all nicotine now — ideally at least 4 weeks before surgery and until the wound has healed; offer brief advice, behavioural support and cessation pharmacotherapy where available'
          : 'Stop smoking and all nicotine until the wound has healed; offer brief advice and cessation support',
        why))],
      counselling: [P('Smoking', 'How smoking and nicotine starve the healing tissue of blood, and why stopping matters; agree a quit date and who will support it.', why)],
    });
    if (isOneOf(a, 'core.smoking_readiness', 'not_ready') && pre(ctx)) {
      parts.push({ cautions: ['Patient not ready to stop smoking: document the discussion; the consultant decides whether elective reconstruction should wait.'] });
    }
  } else if (smoking === 'ex_under_4w') {
    parts.push({ counselling: [P('Smoking', 'Stay stopped: the benefit to healing builds from four weeks without nicotine.', 'Stopped smoking under 4 weeks ago (WHO 2020)')] });
  }
  if (isOneOf(a, 'core.alcohol', 'dependent')) {
    parts.push({ general: [G(pre(ctx) ? 'Optimisation before surgery' : 'Psychology and wellbeing',
      L('Alcohol dependence: assess withdrawal risk, give thiamine, and monitor for withdrawal after admission (CIWA-Ar); offer referral to alcohol services', 'Alcohol dependence recorded', 'urgent'))] });
  } else if (isOneOf(a, 'core.alcohol', 'above')) {
    parts.push({ counselling: [P('Alcohol', 'Cut down to 14 units a week or fewer before surgery and during healing.', 'Above 14 units a week (UK CMO guidelines)')] });
  }
  if (hasAny(a, 'core.substance', 'opioid_misuse')) {
    parts.push({ general: [G('Analgesia', L(
      'Opioid misuse: plan analgesia with the pain team; continue any substitution therapy; expect higher requirements; screen with the Substance Use module and offer referral',
      'Tramadol / codeine / opioid misuse recorded'))] });
  }
  if (isOneOf(a, 'core.traditional_remedies', 'oral')) {
    parts.push({ general: [G(pre(ctx) ? 'Optimisation before surgery' : 'Patient education', L(
      'Record which herbal medicines are being taken and stop them before surgery (ideally 2 weeks) — risk of bleeding and drug interactions',
      'Herbal medicines taken by mouth (ASA patient guidance)'))] });
  }
  if (isOneOf(a, 'core.traditional_remedies', 'topical')) {
    parts.push({
      general: [G('Wound care and dressings', L('Stop applying traditional preparations to the wound; agree what will be used instead', 'Traditional remedies currently applied to the wound'))],
      counselling: [P('Traditional remedies', 'Explain, without blame, why herbs, charcoal, toothpaste or hot fomentation on a wound cause infection and delay healing.', 'Topical traditional remedies in use')],
    });
  }
  return merge(...parts);
};

// ── Optimisation: anaemia, blood ────────────────────────────────────────────

const anaemia: PlanRule = ctx => {
  const a = ctx.answers;
  const hb = numOf(a, 'core.hb');
  const parts: PlanContribution[] = [];
  const limit = anaemiaThreshold(ctx.patient, a);
  if (hb != null && hb < 7) {
    parts.push({ problem: { treatment: [L('Assess for red-cell transfusion (restrictive threshold 7 g/dL; 8 g/dL with acute coronary syndrome) and find the cause', `Hb ${hb} g/dL (NICE NG24)`, 'urgent')] } });
  }
  if (hb != null && limit != null && hb < limit) {
    const why = `Hb ${hb} g/dL — anaemia (WHO: below ${limit} g/dL)`;
    parts.push(pre(ctx)
      ? { general: [G('Optimisation before surgery', L(
        'Investigate the anaemia (red-cell indices, ferritin / iron studies, B12 / folate, reticulocytes; malaria film and stool microscopy where indicated) and correct it before elective surgery — oral or IV iron for iron deficiency',
        `${why} (international consensus on pre-operative anaemia, 2017)`))] }
      : { problem: { investigations: [L('Anaemia work-up (red-cell indices, ferritin / iron studies, B12 / folate)', why)] } });
  }
  if (isOneOf(a, 'core.blood_acceptance', 'declines') && (pre(ctx) || woundPhase(ctx))) {
    parts.push({
      general: [G('Optimisation before surgery', L(
        'Declines blood: record exactly which products are refused; optimise Hb before surgery; plan blood conservation (meticulous haemostasis, tranexamic acid, cell salvage where available)',
        'Patient declines blood transfusion'))],
      counselling: [P('Blood transfusion', 'Confirm which blood products the patient refuses and which they would accept; explain the risk this carries.', 'Declines blood')],
    });
  }
  return merge(...parts);
};

// ── Optimisation: anticoagulants and antiplatelets ──────────────────────────

const anticoagulation: PlanRule = ctx => {
  if (!pre(ctx)) return null;
  const a = ctx.answers;
  const drugs = chosen(a, 'core.anticoagulant');
  if (!drugs.length) return null;
  const extent = a['core.surgery_extent'] === 'minor' ? 'minor' : 'major';
  const indication = a['core.anticoag_indication'];
  const items: RuleLine[] = [];
  for (const d of drugs) {
    const m = preoperativeService.getAnticoagulantManagement(d, extent);
    const name = d.charAt(0).toUpperCase() + d.slice(1);
    items.push(L(
      m.preoperativeInstruction === 'continue'
        ? `${name}: continue through ${extent} surgery`
        : `${name}: stop ${m.holdDuration} before surgery; restart ${m.restartInstruction} once haemostasis is secure`,
      `${name} recorded; ${extent} surgery — timings per preoperativeService, to be confirmed against the local protocol`));
  }
  if (drugs.includes('warfarin')) items.push(L('INR the day before surgery (most surgery proceeds when INR is below 1.5)', 'Warfarin (BSH peri-operative guidance)'));
  if (drugs.some(d => d === 'warfarin' || d === 'rivaroxaban' || d === 'apixaban' || d === 'dabigatran')) {
    if (indication === 'mechanical_valve' || indication === 'vte_recent') {
      items.push(L('High thrombotic risk: bridging plan with haematology / cardiology before stopping', `Indication: ${indication === 'mechanical_valve' ? 'mechanical heart valve' : 'VTE within 3 months'}`, 'urgent'));
    } else if (drugs.includes('warfarin')) {
      items.push(L('Bridging is not routinely needed for this indication — confirm with haematology', 'Warfarin for AF / older VTE (BRIDGE trial, NEJM 2015)'));
    }
  }
  if (drugs.includes('dabigatran') || (drugs.some(d => d === 'rivaroxaban' || d === 'apixaban') && isOneOf(a, 'core.renal', 'ckd_3', 'ckd_4_5', 'dialysis'))) {
    items.push(L('Check creatinine clearance: the stop interval for a DOAC lengthens as kidney function falls', 'DOAC with renal impairment or dabigatran'));
  }
  if (indication === 'coronary_stent' && drugs.some(d => d === 'clopidogrel' || d === 'aspirin')) {
    items.push(L('Do not stop antiplatelet therapy without cardiology advice (coronary stent)', 'Antiplatelet for a coronary stent', 'urgent'));
  }
  return { general: [G('Optimisation before surgery', ...items)] };
};

// ── Optimisation: heart, lungs, kidney, haemoglobinopathy, immunity ─────────

const systems: PlanRule = ctx => {
  const a = ctx.answers, s = ctx.scores;
  const parts: PlanContribution[] = [];
  if (hasAny(a, 'core.cardiac', 'recent_mi') && pre(ctx)) {
    parts.push({ general: [G('Optimisation before surgery', L('Defer elective surgery: myocardial infarction or stroke within 3 months', 'Recent MI / stroke (ASA 4)', 'urgent'))] });
  }
  const rcri = s.rcri?.total ?? 0;
  const poorCapacity = s.mets?.band?.label === 'poor';
  if (pre(ctx) && (rcri >= 2 || (poorCapacity && rcri >= 1))) {
    parts.push({ problem: { referrals: [L('Physician / cardiology assessment before elective surgery', `RCRI ${rcri}${poorCapacity ? '; functional capacity under 4 METs' : ''} (ESC/ESA 2022)`)] } });
  }
  if (pre(ctx) && (rcri >= 1 || chosen(a, 'core.cardiac').length || (s.asa?.total ?? 0) >= 3)) {
    parts.push({ problem: { investigations: [L('12-lead ECG', `Cardiac history / RCRI ${rcri} / ASA ${s.asa?.total ?? '—'} (NICE NG45)`)] } });
  }
  if (pre(ctx) && hasAny(a, 'core.cardiac', 'heart_failure')) {
    parts.push({ problem: { investigations: [L('Echocardiogram if none in the last year or symptoms have changed', 'Heart failure (ESC/ESA 2022)')] } });
  }
  if (hasAny(a, 'core.respiratory', 'asthma', 'copd')) {
    parts.push({ comorbidities: [{ condition: 'Asthma / COPD', actions: [L('Continue inhalers, including on the day of surgery; bring them to hospital; chest physiotherapy after general anaesthesia', 'Asthma / COPD recorded')] }] });
  }
  if (pre(ctx) && hasAny(a, 'core.respiratory', 'recent_infection')) {
    parts.push({ general: [G('Optimisation before surgery', L('Defer elective general anaesthesia until the chest infection has resolved', 'Chest infection in the last 4 weeks'))] });
  }
  if (isOneOf(a, 'core.renal', 'ckd_4_5', 'dialysis')) {
    parts.push({ comorbidities: [{ condition: 'Chronic kidney disease', actions: [
      L('Renally adjust every drug; avoid NSAIDs and nephrotoxins; U&E before and after surgery', optionLabel('core.renal', String(a['core.renal']))),
      ...(isOneOf(a, 'core.renal', 'dialysis') ? [L('Schedule surgery the day after dialysis; protect the fistula arm (no cannula, no BP cuff)', 'On dialysis')] : []),
    ] }] });
  }
  if (isOneOf(a, 'core.haemoglobinopathy', 'ss_sc')) {
    parts.push({ problem: { referrals: [L('Haematology review before surgery: transfusion plan, hydration, warmth and oxygenation; avoid tourniquets where possible', 'Sickle cell disease (HbSS / HbSC)', 'urgent')] } });
  } else if (isOneOf(a, 'core.haemoglobinopathy', 'unknown') && (pre(ctx) || woundPhase(ctx))) {
    parts.push({ problem: { investigations: [L('Haemoglobin genotype (electrophoresis)', 'Genotype not known — affects anaesthesia, tourniquet and transfusion planning')] } });
  }
  if (hasAny(a, 'core.immune', 'steroids')) {
    parts.push({ comorbidities: [{ condition: 'Long-term corticosteroids', actions: [L(pre(ctx) || post(ctx)
      ? 'Do not stop long-term steroids abruptly; peri-operative steroid cover per the unit protocol'
      : 'Review whether the steroid dose can be reduced with the prescribing team; expect slower healing',
    'Long-term corticosteroids (AAGBI/RCP glucocorticoid guideline 2020)')] }] });
  }
  if (hasAny(a, 'core.immune', 'chemo') && pre(ctx)) {
    parts.push({ problem: { referrals: [L('Agree timing with oncology: operate when blood counts have recovered', 'Current / recent chemotherapy')] } });
  }
  if (hasAny(a, 'core.immune', 'hiv')) {
    parts.push({ comorbidities: [{ condition: 'HIV', actions: [L('Continue antiretroviral therapy without interruption; CD4 and viral load if not recent; check interactions with new drugs', 'HIV recorded')] }] });
  }
  if (isYes(a, 'core.active_infection_elsewhere') && pre(ctx)) {
    parts.push({ general: [G('Optimisation before surgery', L('Treat the infection elsewhere before elective surgery', 'Active infection elsewhere — raises surgical-site infection risk'))] });
  }
  if (isOneOf(a, 'core.pregnancy', 'possible') && pre(ctx)) {
    parts.push({ problem: { investigations: [L('Pregnancy test before anaesthesia or radiology', 'Possible pregnancy (NICE NG45)', 'urgent')] } });
  } else if (pre(ctx) && ctx.patient.sex === 'female' && (ctx.patient.ageYears ?? 0) >= 12 && (ctx.patient.ageYears ?? 99) <= 50 && !isOneOf(a, 'core.pregnancy', 'not_pregnant', 'pregnant')) {
    parts.push({ cautions: ['Female of child-bearing age: confirm pregnancy status before anaesthesia (NICE NG45).'] });
  }
  return merge(...parts);
};

// ── Anaesthesia and theatre ─────────────────────────────────────────────────

const anaesthesia: PlanRule = ctx => {
  if (!pre(ctx)) return null;
  const a = ctx.answers, s = ctx.scores;
  const items: RuleLine[] = [
    L('WHO Surgical Safety Checklist: confirm identity, site marking, consent, allergies, anticipated blood loss and instrument counts', 'WHO Surgical Safety Checklist (2009)'),
  ];
  const asa = s.asa?.total;
  if (asa != null && asa >= 4) items.push(L('Consultant anaesthetist review and a critical-care (HDU / ICU) bed before surgery', `ASA ${asa}`, 'urgent'));
  else if (asa === 3) items.push(L('Anaesthetic pre-assessment clinic review and optimisation before listing', 'ASA 3'));
  if (s.airway?.band && s.airway.band.level !== 'none') {
    items.push(L('Tell the anaesthetist: airway predictors present — difficult-airway equipment, senior anaesthetist; consider regional or awake techniques', `Airway: ${s.airway.band.label} (DAS guidelines)`, s.airway.band.level === 'high' ? 'urgent' : 'routine'));
  }
  for (const d of s.stopbang?.detail ?? []) items.push(L(d, `STOP-BANG ${s.stopbang!.total} (${s.stopbang!.band?.label})`));
  const apfel = s.apfel?.total;
  if (apfel != null && apfel >= 1) {
    items.push(L(apfel <= 2
      ? 'PONV prophylaxis with two antiemetics of different classes'
      : 'PONV prophylaxis with three or more antiemetics; consider total intravenous anaesthesia and opioid-sparing analgesia',
    `Apfel ${apfel} (${s.apfel!.band?.label}) — Fourth Consensus Guidelines (Gan 2020)`));
  }
  if (isOneOf(a, 'core.anaesthesia_planned', 'local')) {
    items.push(L('Local anaesthetic: confirm the unit\'s fasting policy — fast as for general anaesthesia if sedation may be needed; calculate the maximum safe local anaesthetic dose', 'Local anaesthesia planned'));
  } else if (child(ctx)) {
    items.push(L(
      'Fasting (child): solids, formula and cow\'s milk until 6 hours before; breast milk until 4 hours before; clear fluids encouraged until 1 hour before — avoid prolonged fasting',
      'Paediatric fasting (APAGBI / ESPA / EPA consensus statement 2018; Thomas M et al. Paediatr Anaesth 2018;28:411-4)'));
  } else {
    items.push(L(
      `Fasting: no food or milk for ${fastingGuidelines.solids.hours} hours before; clear fluids until ${fastingGuidelines.clearFluids.hours} hours before (water, clear juice, black tea / coffee); usual medicines with a sip of water unless told otherwise`,
      'Pre-operative fasting (ASA / ESA guidance; preoperativeService.fastingGuidelines)'));
  }
  if (isOneOf(a, 'core.anaesthesia_planned', 'spinal') ) {
    items.push(L('Prophylactic LMWH: give the last dose at least 12 hours before the spinal / epidural', 'Neuraxial anaesthesia planned (AAGBI / ASRA)'));
  }
  const cfs = s.cfs?.total;
  const parts: PlanContribution[] = [{ general: [G('Anaesthesia and theatre', ...items)] }];
  if (cfs != null && cfs >= 5) {
    parts.push({ problem: { referrals: [L('Comprehensive geriatric assessment / physician review; delirium-prevention measures; agree goals of care with the patient and family', `CFS ${cfs} (CPOC 2021)`)] } });
  }
  if (cfs != null && cfs >= 7) parts.push({ cautions: [`CFS ${cfs}: agree goals of care and ceilings of treatment before any elective procedure.`] });
  if ((ctx.patient.ageYears ?? 0) >= 65 && cfs == null) parts.push({ cautions: ['Age 65 or over: record the Clinical Frailty Scale (CPOC 2021).'] });
  return merge(...parts);
};

// ── VTE prophylaxis ─────────────────────────────────────────────────────────

/**
 * Heparin-induced thrombocytopenia or a heparin allergy: no heparin of any
 * kind, including LMWH (BSH 2012; ASH 2018 HIT guideline). Raised as a
 * caution at every phase so module lines that mention LMWH or heparin
 * (free-flap antithrombotics, chemical leeching) are read against it.
 */
const heparinBarred = (ctx: PlanContext) =>
  hasAny(ctx.answers, 'core.caprini', 'heparin_thrombocytopenia')
  || ctx.patient.allergies.some(x => /heparin|enoxaparin|dalteparin|tinzaparin|lmwh/.test(x));

const vte: PlanRule = ctx => merge(vteLines(ctx), heparinBarred(ctx) && {
  cautions: ['Heparin-induced thrombocytopenia or heparin allergy recorded: no heparin of any kind — no LMWH, unfractionated heparin, heparin flushes or heparin-soaked pledgets; haematology advice on a non-heparin anticoagulant.'],
});

const vteLines: PlanRule = ctx => {
  const a = ctx.answers, s = ctx.scores;
  if (post(ctx)) {
    if (belowVteAge(ctx)) {
      return { general: [G('VTE prophylaxis', L('Early mobilisation and good hydration; pharmacological prophylaxis only if the paediatric team has prescribed it', 'Child under 16 — outside NICE NG89 (which covers people aged 16 and over)'))] };
    }
    return { general: [G('VTE prophylaxis', L('Continue the prescribed VTE prophylaxis until the patient is mobile, and reassess risk if their condition changes', 'Post-operative (NICE NG89)'))] };
  }
  if (!pre(ctx)) return null;
  const drugs = chosen(a, 'core.anticoagulant');
  if (drugs.some(d => ['warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin'].includes(d))) {
    return { general: [G('VTE prophylaxis', L('Already anticoagulated: the stop / restart plan replaces routine prophylaxis; mechanical prophylaxis while anticoagulation is held', 'On anticoagulation'))] };
  }
  if (belowVteAge(ctx)) {
    return { general: [G('VTE prophylaxis', L(
      'No routine pharmacological VTE prophylaxis: early mobilisation and hydration. Discuss with the paediatric team if there are major risk factors (post-pubertal with prolonged immobility, central venous catheter, known thrombophilia or previous VTE, oestrogen therapy)',
      'Child under 16 — Caprini was derived in adults and NICE NG89 covers people aged 16 and over'))] };
  }
  const c = s.caprini;
  if (!c || c.total == null) {
    return { general: [G('VTE prophylaxis', L('Complete the Caprini VTE risk assessment before surgery', 'VTE risk assessment is required for every surgical admission (NICE NG89)'))] };
  }
  const why = `Caprini ${c.total} (${c.band?.label})`;
  const arterial = isOneOf(a, 'core.pvd', 'suspected', 'confirmed');
  const mech = arterial
    ? 'Mechanical prophylaxis by intermittent pneumatic compression — not anti-embolism stockings (arterial disease)'
    : 'Mechanical prophylaxis (anti-embolism stockings or intermittent pneumatic compression) unless contraindicated (e.g. a leg wound or graft under the stocking)';
  if (c.total === 0) return { general: [G('VTE prophylaxis', L('Early mobilisation; no specific prophylaxis needed', why))] };
  if (c.total <= 2) return { general: [G('VTE prophylaxis', L(mech, `${why} (NICE NG89)`))] };
  const bleedHigh = s.bleeding?.band?.level === 'high' || (numOf(a, 'core.platelets') ?? 999) < 50;
  if (bleedHigh) {
    return { general: [G('VTE prophylaxis',
      L(`${mech} now; start pharmacological prophylaxis once the bleeding risk has been reviewed`, `${why}; bleeding risk ${s.bleeding?.band?.label ?? 'high'} (NICE NG89)`, 'urgent'))] };
  }
  if (heparinBarred(ctx)) {
    return { general: [G('VTE prophylaxis',
      L(`${mech}; pharmacological prophylaxis only with a non-heparin agent (e.g. fondaparinux) on haematology advice — no LMWH or heparin`,
        `${why} — pharmacological prophylaxis indicated, but heparin-induced thrombocytopenia or heparin allergy recorded (BSH 2012; ASH 2018)`, 'urgent'))] };
  }
  const renal = isOneOf(a, 'core.renal', 'ckd_4_5', 'dialysis');
  const bmi = ctx.patient.bmi;
  return { general: [G('VTE prophylaxis',
    L(`LMWH — enoxaparin 40 mg SC once daily${renal ? ' (reduce for creatinine clearance under 30 mL/min)' : ''}${bmi != null && bmi >= 40 ? ' (weight-adjusted dose for BMI 40 or over)' : ''}, first dose 6–12 hours after surgery once haemostasis is secure, for 7 days or until mobile`,
      `${why} — pharmacological prophylaxis indicated (NICE NG89, plastic and reconstructive surgery)`, c.total >= 5 ? 'urgent' : 'routine'),
    L(mech, why))] };
};

// ── Antibiotic prophylaxis and infection prevention ─────────────────────────

const antibiotics: PlanRule = ctx => {
  if (!pre(ctx)) return null;
  const penicillin = ctx.patient.allergies.some(x => /penicillin|amoxicillin|ampicillin|augmentin|beta.?lactam/.test(x));
  return {
    general: [G('Antibiotic prophylaxis and infection',
      L('Antibiotic prophylaxis only when indicated (clean-contaminated or contaminated surgery, implants, or the unit protocol for grafts / flaps): one IV dose within 60 minutes before incision, re-dosed for long operations or major blood loss, and not continued beyond 24 hours', 'Surgical-site infection prevention (WHO 2016; NICE NG125)'),
      L('Shower on the day of (or day before) surgery; do not shave the site — clip hair if it must be removed; alcohol-based chlorhexidine skin preparation', 'WHO 2016 SSI guideline; NICE NG125'),
    )],
    cautions: penicillin ? ['Penicillin allergy recorded: use the local non-beta-lactam prophylaxis.'] : [],
  };
};

// ── Analgesia ───────────────────────────────────────────────────────────────

const analgesia: PlanRule = ctx => {
  const a = ctx.answers;
  const pain = a['core.pain_present'];
  const score = numOf(a, 'core.pain_score');
  const items: RuleLine[] = [];
  const parts: PlanContribution[] = [];
  // Ibuprofen is not licensed under 3 months (BNFc); NSAIDs are avoided in
  // pregnancy (fetal renal impairment and ductal closure — MHRA 2020).
  // Age in months unknown: a child in their first year, or of unknown age in a
  // paediatric module, is treated as possibly under 3 months.
  const { ageMonths, ageYears } = ctx.patient;
  const infant = (ageMonths != null ? ageMonths < 3
    : ageYears === 0 || (ageYears == null && !!ctx.module.paediatric))
    || (child(ctx) && (numOf(a, 'core.weight_kg') ?? 99) < 5);
  const pregnant = isOneOf(a, 'core.pregnancy', 'pregnant', 'possible');
  const moduleReason = ctx.module.avoidNsaids?.(ctx) ?? null;
  const nsaidUnsafe = isOneOf(a, 'core.renal', 'ckd_4_5', 'dialysis') || chosen(a, 'core.anticoagulant').length > 0
    || ctx.scores.bleeding?.band?.level === 'high' || infant || pregnant || !!moduleReason;
  const nsaidWhy = moduleReason ?? (infant ? 'Infant under 3 months or under 5 kg, or an infant whose age in months is not known — ibuprofen is not licensed (BNFc)'
    : pregnant ? 'Pregnant or possibly pregnant — avoid NSAIDs (MHRA 2020)'
      : 'Renal impairment, anticoagulation or high bleeding risk');
  if ((pain && pain !== 'none') || pre(ctx)) {
    const why = pain && pain !== 'none' ? `Pain: ${String(pain).replace(/_/g, ' ')}${score != null ? ` (${score}/10)` : ''}` : 'Peri-operative analgesia plan';
    items.push(L(
      'Multimodal analgesia: regular paracetamol; local or regional anaesthesia where possible; opioid only for breakthrough pain, at the lowest dose for the shortest time, with a stop date',
      `${why} (FPM Surgery and Opioids 2021)`));
    items.push(nsaidUnsafe
      ? L('Avoid NSAIDs', nsaidWhy)
      : L('Add a regular NSAID unless contraindicated (peptic ulcer, renal impairment, asthma sensitivity, bleeding risk)', why));
  }
  if (score != null && score >= 7) items.push(L('Pain 7/10 or more: review analgesia today and look for a cause', `Pain score ${score}/10`, 'urgent'));
  if (pain === 'out_of_proportion') {
    parts.push({ problem: { treatment: [L('Pain out of proportion: examine now for haematoma, ischaemia, compartment syndrome or necrotising infection', 'Pain out of proportion to the findings', 'urgent')] } });
  }
  if (woundPhase(ctx) && pain && pain !== 'none') {
    items.push(L('Analgesia 30–60 minutes before dressing changes; atraumatic (silicone) contact layers', 'Painful wound — dressing-related pain'));
  }
  if (isOneOf(a, 'core.analgesic_use', 'long_term_opioid')) {
    items.push(L('Continue the usual opioid dose peri-operatively and plan additional analgesia with the pain team; do not stop abruptly', 'Long-term opioid use (FPM 2021)'));
  }
  if (items.length) parts.push({ general: [G('Analgesia', ...items)] });
  return merge(...parts);
};

// ── Nutrition ───────────────────────────────────────────────────────────────

const nutrition: PlanRule = ctx => {
  const a = ctx.answers, s = ctx.scores;
  if (!s.must && !answered(a, 'core.weight_kg') && !answered(a, 'core.paed_growth')) return null;
  const items: RuleLine[] = [];
  const parts: PlanContribution[] = [];
  if (child(ctx)) {
    // MUST is not used under 18 (BAPEN): growth on the chart instead (NICE NG75).
    const g = a['core.paed_growth'];
    if (g === 'faltering' || g === 'below_2nd') {
      items.push(L('Paediatric dietitian: feeding and dietary assessment, a nutrition plan, and weight (and length / height) plotted on the growth chart at every visit',
        `${g === 'faltering' ? 'Faltering growth — crossing centiles downwards' : 'Weight below the 2nd centile for age'} (NICE NG75)`, 'urgent'));
    } else if (g === 'not_plotted' || (!answered(a, 'core.paed_growth') && answered(a, 'core.weight_kg'))) {
      items.push(L('Plot weight (and length / height) on the WHO or national growth chart', 'Growth not plotted (NICE NG75)'));
    }
  }
  const must = s.must?.total;
  const w = numOf(a, 'core.weight_kg');
  if (s.must && s.must.incomplete.length) items.push(L('Complete the MUST: weigh and measure height (or MUAC), and ask about weight loss', `MUST incomplete: ${s.must.incomplete.join(', ')}`));
  if (must != null && must >= 2) {
    items.push(L('Refer to the dietitian; oral nutritional supplements; food and fluid chart', `MUST ${must} — high risk (NICE CG32)`, 'urgent'));
    if (pre(ctx)) {
      const alb = numOf(a, 'core.albumin');
      const severe = (ctx.patient.bmi != null && ctx.patient.bmi < 18.5) || a['core.weight_loss'] === '2' || (alb != null && alb < 30);
      if (severe) {
        parts.push({ general: [G('Optimisation before surgery', L(
          'Severe nutritional risk: 7–14 days of nutritional therapy before major elective reconstruction, even if surgery must wait',
          `MUST ${must}${ctx.patient.bmi != null ? `; BMI ${ctx.patient.bmi}` : ''}${alb != null ? `; albumin ${alb} g/L` : ''} (ESPEN 2017 clinical nutrition in surgery)`))] });
      }
    }
  } else if (must === 1) {
    items.push(L('Record food intake for 3 days; encourage protein and energy; repeat MUST weekly', 'MUST 1 — medium risk (BAPEN)'));
  } else if (must === 0) {
    items.push(L('Repeat MUST weekly while in hospital and at each review', 'MUST 0 — low risk (BAPEN)'));
  }
  const woundRelated = woundPhase(ctx) || ctx.module.group !== 'aesthetic';
  if (woundRelated && (must ?? 0) >= 1) {
    const grams = w ? ` (about ${Math.round(w * 1.25)}–${Math.round(w * 1.5)} g protein a day for ${w} kg)` : '';
    items.push(L(`Protein 1.25–1.5 g/kg/day${grams} and energy 30–35 kcal/kg/day while the wound heals`, `MUST ${must} with a wound to heal (EPUAP/NPIAP 2019)`));
    if (isOneOf(a, 'core.cost_barrier', 'no', 'with_difficulty') || isOneOf(a, 'core.funding', 'out_of_pocket')) {
      items.push(L('Advise affordable local protein sources (eggs, beans, fish, groundnuts, milk, soya) where supplements cannot be bought', 'Cost barrier / out-of-pocket payment'));
    }
  }
  const alb = numOf(a, 'core.albumin');
  if (alb != null && alb < 35) items.push(L('Interpret albumin with CRP: treat the cause (inflammation, infection, intake) rather than the number — albumin infusion does not improve healing', `Albumin ${alb} g/L`));
  const def = chosen(a, 'core.micronutrients');
  if (def.length) items.push(L('Replace the documented deficiencies; routine vitamin and zinc supplements are not recommended without deficiency', `Deficiency: ${def.join(', ').replace(/_/g, ' ')} (EPUAP/NPIAP 2019)`));
  if (isOneOf(a, 'core.intake', 'poor', 'reduced') && !(must != null && must >= 2)) {
    items.push(L('Food chart and dietary advice; oral supplements if intake stays poor', `Oral intake ${String(a['core.intake'])}`));
  }
  if (items.length) parts.push({ general: [G('Nutrition', ...items)] });
  return merge(...parts);
};

// ── Pressure care ───────────────────────────────────────────────────────────

const pressureCare: PlanRule = ctx => {
  const a = ctx.answers, b = ctx.scores.braden;
  const parts: PlanContribution[] = [];
  if (b?.total != null) {
    const why = `Braden ${b.total} (${b.band?.label})`;
    if (b.total <= 14) {
      parts.push({ general: [G('Pressure care',
        ...SSKIN_BUNDLE.filter(x => x.name !== 'Nutrition / Hydration').map(x => L(`${x.name}: ${x.actions.slice(0, 2).join('; ')}`, `${why} — SSKIN bundle (NPIAP/EPUAP 2019)`, b.total! <= 9 ? 'urgent' : 'routine')),
      )] });
    } else if (b.total <= 18) {
      parts.push({ general: [G('Pressure care', L('Daily skin inspection of pressure areas; encourage mobility; reassess Braden if the condition changes', `${why} — at risk (Braden 15–18)`))] });
    }
  }
  const pi = a['core.existing_pi'];
  if (typeof pi === 'string' && pi !== 'none') {
    parts.push({ problems: [{ problem: `Pressure injury (${pi.replace(/_/g, ' ')})`, lines: {
      treatment: [L('Offload the pressure injury completely; document on the body map; measure and photograph on the WoundProgress Monitor', `Existing ${pi.replace(/_/g, ' ')} pressure injury (NPIAP/EPUAP 2019)`)],
    } }] });
  }
  return merge(...parts);
};

// ── Psychology and wellbeing ────────────────────────────────────────────────

const psychology: PlanRule = ctx => {
  const a = ctx.answers, s = ctx.scores;
  const items: RuleLine[] = [];
  const parts: PlanContribution[] = [];
  const item9 = numOf(a, 'core.phq.q9');
  if (item9 != null && item9 > 0) {
    items.push(L('Same-day risk assessment by a doctor: ask directly about intent, plans and means; do not leave the patient alone if at immediate risk; refer to psychiatry / the emergency mental-health service today; involve family with consent',
      `PHQ-9 item 9 answered "${['', 'several days', 'more than half the days', 'nearly every day'][item9]}"`, 'urgent'));
    parts.push({ cautions: ['PHQ-9 item 9 positive: suicide / self-harm risk must be assessed today before the patient leaves.'] });
  }
  const phq9 = s.phq9, phq2 = s.phq2;
  if (phq9?.total != null) {
    if (phq9.total >= 10) items.push(L('Refer to clinical psychology / psychiatry for assessment and treatment of depression', `PHQ-9 ${phq9.total} (${phq9.band?.label}) (Kroenke 2001)`));
    else if (phq9.total >= 5) items.push(L('Supportive discussion; repeat the PHQ-9 at the next review', `PHQ-9 ${phq9.total} (mild)`));
  } else if (phq2?.total != null && phq2.total >= 3) {
    items.push(L('Complete the PHQ-9', `PHQ-2 ${phq2.total} — positive screen (Kroenke 2003)`));
  }
  const gad7 = s.gad7, gad2 = s.gad2;
  if (gad7?.total != null) {
    if (gad7.total >= 10) items.push(L('Refer for psychological assessment and treatment of anxiety', `GAD-7 ${gad7.total} (${gad7.band?.label}) (Spitzer 2006)`));
    else if (gad7.total >= 5) items.push(L('Information and reassurance about the procedure; repeat the GAD-7 at the next review', `GAD-7 ${gad7.total} (mild)`));
  } else if (gad2?.total != null && gad2.total >= 3) {
    items.push(L('Complete the GAD-7', `GAD-2 ${gad2.total} — positive screen`));
  }
  if (s.appearance?.total === 1) {
    items.push(ctx.module.group === 'aesthetic'
      ? L('Specialist mental-health assessment for possible body dysmorphic concern; do not proceed with elective aesthetic surgery until it is done', 'Appearance-concern screen positive (screen, not a diagnosis)', 'urgent')
      : L('Discuss appearance concerns openly; offer psychological support (and assessment for body dysmorphic concern if distress persists)', 'Appearance-concern screen positive (screen, not a diagnosis)'));
  }
  if (isOneOf(a, 'core.child_wellbeing', 'concern', 'marked')) {
    const marked = isOneOf(a, 'core.child_wellbeing', 'marked');
    items.push(L(marked
      ? 'Refer to paediatric psychology / child mental-health services; explain the procedure to the child at their level (play specialist where available)'
      : 'Talk with the child and caregiver about what is worrying them; play-based preparation for the procedure; refer to paediatric psychology if it persists',
    `Child's wellbeing: ${marked ? 'marked distress' : 'some concern'}`));
  }
  if (isOneOf(a, 'core.caregiver_coping', 'struggling')) items.push(L('Support the caregiver: social work, peer / family support and a named contact for questions', 'Caregiver struggling'));
  if (isOneOf(a, 'core.child_safeguarding', 'concern')) {
    parts.push({
      problems: [{ problem: 'Safeguarding concern', lines: {
        referrals: [L('Follow the child-protection procedure today: inform the hospital safeguarding lead and social work, document what was seen and said, and do not discharge until the child is safe', 'Safeguarding concern recorded (NICE CG89)', 'urgent')],
      } }],
      cautions: ['Safeguarding concern: do not discharge the child until a safe plan is agreed with the safeguarding lead.'],
    });
  }
  if (isOneOf(a, 'core.coping', 'struggling', 'not_coping')) items.push(L('Offer psychological support and peer / family support', `Coping: ${String(a['core.coping']).replace('_', ' ')}`));
  if (hasAny(a, 'core.psych_history', 'psychosis')) items.push(L('Liaise with the patient\'s psychiatric team; continue psychiatric medication through the admission', 'Psychosis / bipolar disorder'));
  const counselling: CounsellingPoint[] = [];
  if (isOneOf(a, 'core.expectations', 'partly', 'unrealistic')) {
    counselling.push(P('Expectations', 'Agree realistic goals: show examples, explain the scars, colour and contour differences, the chance of more than one operation and how long the final result takes.', `Expectations ${String(a['core.expectations'])}`));
    if (isOneOf(a, 'core.expectations', 'unrealistic') && pre(ctx)) parts.push({ cautions: ['Expectations unrealistic: do not take consent until they have been addressed (GMC Decision making and consent 2020).'] });
  }
  if (isOneOf(a, 'core.capacity', 'lacks_capacity', 'fluctuating')) {
    parts.push({ cautions: [`Capacity ${String(a['core.capacity']).replace('_', ' ')}: assess and document capacity for this specific decision; if lacking, follow the hospital policy (best-interests decision with the next of kin / legal representative); only emergency treatment to save life or limb meanwhile.`] });
  }
  if (isOneOf(a, 'core.capacity', 'minor')) {
    counselling.push(P('Consent for a child', 'Consent from a parent or guardian; involve the child in the decision as far as their maturity allows.', 'Patient is a child'));
  }
  if (items.length) parts.push({ general: [G('Psychology and wellbeing', ...items)] });
  if (counselling.length) parts.push({ counselling });
  return merge(...parts);
};

// ── Social, financial and access ────────────────────────────────────────────

const social: PlanRule = ctx => {
  const a = ctx.answers;
  const items: RuleLine[] = [];
  const rehab: RuleLine[] = [];
  const parts: PlanContribution[] = [];
  if (isOneOf(a, 'core.cost_barrier', 'no', 'with_difficulty')) {
    items.push(L('Social-work / welfare referral; itemised estimate (surgeon, anaesthesia, theatre, consumables, admission, drugs) before booking; check NHIA / HMO cover; choose an affordable dressing regimen',
      `Affordability: ${optionLabel('core.cost_barrier', String(a['core.cost_barrier']))}`, isOneOf(a, 'core.cost_barrier', 'no') ? 'urgent' : 'routine'));
  } else if (isOneOf(a, 'core.funding', 'out_of_pocket') && (pre(ctx) || woundPhase(ctx))) {
    items.push(L('Give an itemised cost estimate before booking so the family can plan', 'Out-of-pocket payment'));
  }
  if (isOneOf(a, 'core.distance', 'over_2h')) {
    items.push(L('Arrange dressings at the nearest primary health centre with written instructions and a supply of dressings; phone / WhatsApp photograph review between visits, with consent', 'Over 2 hours from this facility'));
  }
  if (isOneOf(a, 'core.phone', 'none')) parts.push({ cautions: ['No phone: book every review in person and give written red-flag instructions.'] });
  if (isOneOf(a, 'core.carer', 'none')) items.push(L('Social work: plan dressings, daily care and discharge without a carer (community nurse, admission or family meeting)', 'No practical help at home'));
  if (isOneOf(a, 'core.livelihood', 'significant')) items.push(L('Plan the timing of surgery and recovery around the patient\'s work; medical certificate; welfare referral if income is lost', 'Recovery threatens livelihood'));
  if (isOneOf(a, 'core.mobility', 'bedbound', 'wheelchair')) {
    rehab.push(L('Physiotherapy: positioning, transfers, chest care; occupational therapy for equipment and home adaptations', `Mobility: ${String(a['core.mobility'])}`));
  }
  if (isYes(a, 'core.interpreter_needed')) {
    parts.push({ counselling: [P('Interpreter', 'Use a trained interpreter for the consent discussion and record their name; a family member only if no interpreter can be found, and say so.', 'Interpreter needed')] });
  }
  if (items.length) parts.push({ general: [G('Social and financial support', ...items)] });
  if (rehab.length) parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', ...rehab)] });
  return merge(...parts);
};

// ── Local healing barriers (perfusion, oedema, pressure) ────────────────────

const localBarriers: PlanRule = ctx => {
  const a = ctx.answers;
  const parts: PlanContribution[] = [];
  if (isOneOf(a, 'core.perfusion', 'poor')) {
    parts.push({ problem: { referrals: [L('Vascular assessment before further surgery or compression (Vascular module: ABPI / toe pressures, WIfI)', 'Poor local perfusion', 'urgent')] } });
  } else if (isOneOf(a, 'core.perfusion', 'doubtful') || isOneOf(a, 'core.pvd', 'suspected')) {
    parts.push({ problem: { investigations: [L('Perfusion assessment: pulses, ABPI or toe pressures, hand-held Doppler', isOneOf(a, 'core.pvd', 'suspected') ? 'Suspected arterial disease' : 'Doubtful perfusion')] } });
  }
  if (isOneOf(a, 'core.oedema', 'moderate', 'severe')) {
    parts.push({ general: [G('Wound care and dressings', L('Elevate the part; treat the cause of the oedema; compression only once arterial supply is confirmed adequate', `Oedema ${String(a['core.oedema'])}`))] });
  }
  if (isYes(a, 'core.pressure_shear')) {
    parts.push({ general: [G('Pressure care', L('Offload the site completely (pressure-redistributing surface, positioning or off-loading device)', 'Site exposed to pressure or shear'))] });
  }
  if (isYes(a, 'core.foreign_body')) {
    parts.push({ problem: { investigations: [L('Imaging for a retained foreign body or sequestrum, and plan its removal', 'Foreign body / sequestrum recorded')] } });
  }
  const barriers = healingBarriers(a, ctx.patient, ctx.scores);
  if (barriers.length >= 3 && (pre(ctx) || woundPhase(ctx))) {
    parts.push({ cautions: [`${barriers.length} barriers to healing: ${barriers.map(b => b.barrier).join(', ')}. Correct what can be corrected before definitive reconstruction.`] });
  }
  return merge(...parts);
};

// ── Wound review: TIMERS ────────────────────────────────────────────────────

const timers: PlanRule = ctx => {
  if (!answered(ctx.answers, 'core.wound_aetiology') && !answered(ctx.answers, 'core.wound_tissue')) return null;
  const a = ctx.answers, s = ctx.scores;
  const parts: PlanContribution[] = [];
  const wc: RuleLine[] = [];
  const tissue = chosen(a, 'core.wound_tissue');
  const nonviable = tissue.some(t => t === 'slough' || t === 'necrotic' || t === 'eschar') || isOneOf(a, 'core.wound_nonviable', 'lt25', '25_50', 'gt50');
  const ischaemic = isOneOf(a, 'core.perfusion', 'poor') || isOneOf(a, 'core.pvd', 'suspected', 'confirmed') || isOneOf(a, 'core.wound_aetiology', 'arterial');
  // T
  if (nonviable) {
    if (ischaemic && tissue.includes('eschar')) {
      parts.push({ problem: { treatment: [L('Leave dry, stable eschar on an ischaemic limb intact until vascular assessment; debride only if it becomes wet or infected', 'Eschar with impaired perfusion')] } });
    } else {
      parts.push({ problem: { treatment: [L(
        'Debride non-viable tissue: sharp / surgical debridement for extensive or infected necrosis (theatre if extensive); autolytic (hydrogel) where sharp debridement is unsuitable',
        `Non-viable tissue: ${tissue.filter(t => ['slough', 'necrotic', 'eschar'].includes(t)).join(', ') || String(a['core.wound_nonviable'])} (TIMERS — T)`,
        isOneOf(a, 'core.wound_nonviable', 'gt50') ? 'urgent' : 'routine')] } });
    }
  }
  // I — IWII continuum
  const stage = s.iwii?.total ?? 0;
  if (stage === 1 || stage === 2) {
    wc.push(L('Wound hygiene at every change: cleanse, debride, refashion the edges; topical antiseptic / antimicrobial dressing (e.g. silver, PHMB, iodine, medical-grade honey) for 2 weeks, then reassess',
      `${s.iwii!.band!.label} (IWII 2022)`));
  }
  if (stage >= 3) {
    parts.push({ problems: [{ problem: stage === 4 ? 'Systemic wound infection' : 'Spreading wound infection', lines: {
      investigations: [
        L('Tissue sample for culture after cleansing and debridement (or a Levine-technique swab)', `${s.iwii!.band!.label} (IWII 2022)`, 'urgent'),
        L('FBC, CRP, U&E, glucose; blood cultures if febrile', s.iwii!.band!.label, stage === 4 ? 'urgent' : 'routine'),
      ],
      treatment: [
        L('Systemic antibiotics per the local antibiogram, rationalised to culture; continue local wound hygiene and antiseptic dressings', `${s.iwii!.band!.label} (IWII 2022)`, 'urgent'),
        ...(stage === 4 ? [L('Sepsis screen and treatment within 1 hour: lactate, IV antibiotics, fluids, source control', 'Systemic infection signs (Surviving Sepsis Campaign 2021)', 'urgent')] : []),
      ],
      monitoring: [L('Mark the margin of erythema; review within 24–48 hours', 'Spreading infection')],
    } }] });
  }
  if (isYes(a, 'core.nsti_concern')) {
    parts.push({ problems: [{ problem: 'Possible necrotising soft-tissue infection', lines: {
      treatment: [L('Emergency surgical exploration and debridement — do not delay for imaging or a low LRINEC; resuscitate; broad-spectrum IV antibiotics with clindamycin', 'Features of necrotising infection', 'urgent')],
      referrals: [L('Anaesthesia / critical care now; use the Soft Tissue Infection module', 'Necrotising infection is a surgical emergency', 'urgent')],
    } }] });
  }
  // M — dressing from the pressure-sore dressing guide
  const exudate = a['core.wound_exudate'];
  const pick = stage >= 2 ? 'Infected / Critically Colonized'
    : nonviable && !(ischaemic && tissue.includes('eschar')) ? 'Slough / Necrotic'
      : exudate === 'heavy' ? 'Heavy Exudate'
        : exudate === 'moderate' ? 'Moderate Exudate / Granulating'
          : exudate === 'light' || exudate === 'none' ? 'Dry / Low Exudate' : null;
  const d = pick ? DRESSING_SELECTION.find(x => x.woundType === pick) : undefined;
  if (d) {
    wc.push(L(`Primary dressing: ${d.primary}; secondary: ${d.secondary}; change ${d.changeFrequency.toLowerCase()}`,
      `${d.woundType}${exudate ? `, exudate ${exudate}` : ''} — ${d.rationale}`));
  }
  if (isOneOf(a, 'core.cost_barrier', 'no', 'with_difficulty') && d) {
    wc.push(L('If advanced dressings cannot be afforded: cleanse with saline or clean water; paraffin gauze or petroleum-jelly gauze as contact layer; medical-grade honey for sloughy or colonised wounds; sterile gauze secondary', 'Cost barrier'));
  }
  if (hasAny(a, 'core.wound_periwound', 'macerated', 'excoriated')) wc.push(L('Protect the surrounding skin (barrier film or zinc paste); increase absorbency or change frequency', 'Macerated / excoriated surrounding skin'));
  const cleanse = a['core.cleansing'];
  if (cleanse) wc.push(L(`Cleanse with ${cleanse === 'potable_water' ? 'clean (potable) water' : cleanse === 'saline' ? 'normal saline' : 'an antiseptic solution'} at each change`, 'Cleansing agent chosen at review'));
  // E
  if (isOneOf(a, 'core.wound_edge', 'raised_irregular')) {
    parts.push({ problem: { investigations: [L('Biopsy the edge and the base (several sites) to exclude malignancy (Marjolin ulcer); refer to the Tumour Board if positive', 'Raised, everted or irregular edge', 'urgent')] } });
  } else if (isOneOf(a, 'core.wound_edge', 'non_advancing', 'rolled')) {
    parts.push({ problem: { treatment: [L('Refashion (debride) the edge and re-examine every TIMERS factor; an area reduction under 40% after 4 weeks of optimal care predicts non-healing — re-evaluate the diagnosis and consider advanced therapy or closure',
      `Edge ${String(a['core.wound_edge']).replace('_', ' ')} (Kantor & Margolis 2000; Sheehan 2003)`)] } });
  }
  const longstanding = isOneOf(a, 'core.wound.duration', 'over_3m', 'over_1y');
  if (isOneOf(a, 'core.wound_biopsy', 'indicated') || (longstanding && !answered(a, 'core.wound_biopsy') && !isOneOf(a, 'core.wound_edge', 'raised_irregular'))) {
    parts.push({ problem: { investigations: [L('Wound biopsy (edge and base)', longstanding ? 'Wound open over 3 months — exclude malignancy and atypical causes' : 'Biopsy indicated')] } });
  }
  // R
  const exposed = chosen(a, 'core.wound_exposed');
  if (exposed.includes('bone')) parts.push({ problem: { investigations: [L('X-ray (MRI where available) and bone biopsy / culture for osteomyelitis', 'Exposed or probe-able bone')] } });
  if (isOneOf(a, 'core.wound_repair', 'ready')) {
    parts.push({ problem: { treatment: [exposed.some(x => ['bone', 'tendon', 'joint', 'hardware', 'vessels'].includes(x))
      ? L('Plan vascularised (flap) cover: exposed bone, tendon without paratenon, joint, implant or vessel will not take a graft', `Exposed ${exposed.join(', ')}`)
      : L('Plan closure: delayed primary closure, split-thickness skin graft or local flap according to size, site and depth', 'Clean, healthy granulating bed (TIMERS — R)')] } });
  } else if (isOneOf(a, 'core.wound_repair', 'adjunct')) {
    parts.push({ problem: { treatment: [L('Consider negative-pressure wound therapy (not over untreated osteomyelitis, malignancy in the wound, exposed vessels or untreated necrotic tissue)', 'Adjunct needed for bed preparation (NPWT contraindications per NICE / manufacturers)')] } });
  }
  // Goal of care
  if (isOneOf(a, 'core.goal_of_care', 'palliative')) {
    parts.push({ problem: { treatment: [L('Symptom-focused care: odour (topical metronidazole, charcoal dressings), exudate containment, bleeding (haemostatic dressings, topical tranexamic acid) and pain', 'Goal: symptom control for a non-healable wound')] } });
  } else if (isOneOf(a, 'core.goal_of_care', 'maintenance')) {
    parts.push({ problem: { treatment: [L('Correct the cause before expecting healing (perfusion, offloading, infection, nutrition); keep the wound stable and infection-free meanwhile', 'Goal: maintenance wound')] } });
  }
  // Measurement and who does the dressings
  parts.push({ problem: { monitoring: [L('Measure and photograph at each review (at least every 2 weeks) on the WoundProgress Monitor with a calibrated photograph', 'Healing trajectory decides when to change the plan')] } });
  if (isOneOf(a, 'core.who_dresses', 'phc', 'carer', 'self')) {
    parts.push({ general: [G('Patient education', L('Teach the dressing technique to whoever will do it (carer / PHC nurse / patient) with teach-back; written instructions and a supply of dressings', `Dressings by ${String(a['core.who_dresses'])}`))] });
  }
  if (wc.length) parts.push({ general: [G('Wound care and dressings', ...wc)] });
  return merge(...parts);
};

// ── Tetanus (Green Book ch. 30; WHO 2017) ───────────────────────────────────

/**
 * UK Green Book chapter 30, table "Immunisation recommendations for clean
 * and tetanus-prone wounds": fully immunised, or primary course complete with
 * boosters up to date — nothing now. Primary incomplete or boosters not up to
 * date — a reinforcing dose of vaccine and further doses to complete the
 * schedule, plus HTIG if the wound is high-risk. Not immunised or unknown —
 * an immediate dose of vaccine and a full course, plus HTIG if the wound is
 * tetanus-prone or high-risk.
 */
const tetanus: PlanRule = ctx => {
  const a = ctx.answers;
  const status = a['core.tetanus'];
  if (status !== 'due' && status !== 'unknown') return null;
  const wound = a['core.tetanus_wound'];
  const vaccine = child(ctx) && isUnder(ctx.patient, 10, ctx.module)
    ? 'the age-appropriate tetanus-containing vaccine of the national childhood schedule'
    : 'tetanus-containing vaccine (Td or Td/IPV)';
  const dose = status === 'unknown'
    ? `An immediate dose of ${vaccine}, then a full course if the records confirm it is needed`
    : `A reinforcing dose of ${vaccine}, then further doses to complete the schedule`;
  const htig = 'human tetanus immunoglobulin (250 IU IM; 500 IU if over 24 hours since the injury, heavy contamination or a burn) at a different site';
  const needsHtig = wound === 'high_risk' || (status === 'unknown' && wound === 'prone');
  const why = `Tetanus status ${status === 'unknown' ? 'not immunised / unknown' : 'incomplete'}${wound ? `; ${String(wound).replace('_', '-')} wound` : ''} (UK Green Book ch. 30; WHO tetanus position paper 2017)`;
  const text = !wound
    ? `Tetanus prophylaxis now: ${dose.charAt(0).toLowerCase()}${dose.slice(1)}; plus ${htig} if the wound is ${status === 'unknown' ? 'tetanus-prone' : 'high-risk tetanus-prone'}`
    : `Tetanus prophylaxis now: ${dose.charAt(0).toLowerCase()}${dose.slice(1)}${needsHtig ? `; plus ${htig}` : ''}`;
  return { problem: { treatment: [
    L(text, why, 'urgent'),
    ...(wound === 'prone' || wound === 'high_risk' ? [L('Thorough cleaning and debridement of the wound — immunoglobulin does not replace it', 'Tetanus-prone wound (Green Book ch. 30)')] : []),
  ] } };
};

// ── Post-operative ──────────────────────────────────────────────────────────

const postOperative: PlanRule = ctx => {
  if (!post(ctx)) return null;
  const a = ctx.answers, s = ctx.scores;
  const parts: PlanContribution[] = [];
  const news = s.news2;
  if (news?.total != null && news.total >= 5) {
    parts.push({ problem: { monitoring: [L(news.band!.interpretation, `NEWS2 ${news.total} (RCP 2017)`, 'urgent')] } });
  } else if (news?.total != null) {
    parts.push({ problem: { monitoring: [L(news.band!.interpretation, `NEWS2 ${news.total} (RCP 2017)`)] } });
  } else if (news?.flag) {
    parts.push({ problem: { monitoring: [L(news.flag.reason, 'Incomplete observations with a NEWS2 3-point parameter (RCP 2017)', 'urgent')] } });
  } else if (news && isUnder(ctx.patient, AGE_LIMITS.news2, ctx.module)) {
    parts.push({ problem: { monitoring: [L(news.band!.interpretation, 'Child under 16 — NEWS2 does not apply (RCP 2017)')] } });
  }
  const temp = numOf(a, 'core.obs_temp');
  if (temp != null && temp >= 38) {
    parts.push({ problem: { investigations: [L('Find the source of the fever: wound, chest, urine, cannula sites and VTE; cultures before antibiotics', `Temperature ${temp} C`)] } });
  }
  const comp = chosen(a, 'core.complications');
  const map: Record<string, PlanContribution> = {
    haematoma: { problem: { treatment: [L('Evacuate the haematoma (bedside or theatre) and find the bleeding point; check clotting and platelets', 'Haematoma — threatens the graft / flap', 'urgent')] } },
    seroma: { problem: { treatment: [L('Aspirate the seroma under aseptic technique; compression', 'Seroma')] } },
    ssi: { problem: {
      investigations: [L('Pus or tissue for culture', 'Surgical-site infection (NICE NG125)')],
      treatment: [L('Open and drain any collection; antibiotics for cellulitis or systemic signs, rationalised to culture', 'Surgical-site infection (NICE NG125)', 'urgent')],
    } },
    dehiscence: { problem: { treatment: [L('Assess depth and cause (infection, haematoma, tension); plan healing by secondary intention, NPWT or re-closure', 'Wound dehiscence')] } },
    vte: { problem: {
      investigations: [L('Wells score; proximal leg-vein ultrasound (DVT) or CTPA (PE)', 'Suspected VTE (NICE NG158)', 'urgent')],
      treatment: [L('Interim treatment-dose anticoagulation while waiting for imaging unless contraindicated', 'Suspected VTE (NICE NG158)', 'urgent')],
    } },
    ponv: { general: [G('Analgesia', L('Rescue antiemetic from a class not used for prophylaxis', 'PONV (Gan 2020)'))] },
    chest: { general: [G('Rehabilitation (physiotherapy / OT)', child(ctx)
      ? L('Chest physiotherapy, sit up and move; age-appropriate breathing exercises (blowing games or bubbles for young children); antibiotics if pneumonia', 'Chest complication (child)')
      : L('Chest physiotherapy, sit out, incentive spirometry; sputum culture and antibiotics if pneumonia', 'Chest complication'))] },
    delirium: { problem: { treatment: [child(ctx)
      ? L('Screen with a paediatric delirium tool (e.g. Cornell Assessment of Pediatric Delirium); treat the cause (pain, retention, constipation, infection, hypoxia, drugs); avoid sedatives where possible; a parent or caregiver present, familiar objects and routine', 'Delirium (child) — the 4AT is validated in adults')
      : L('4AT; treat the cause (pain, retention, constipation, infection, hypoxia, drugs); avoid sedatives; reorientation and family presence', 'Delirium')] } },
    retention: { problem: { treatment: [L('Bladder scan or catheter; review opioids and anticholinergic drugs', 'Urinary retention')] } },
  };
  for (const c of comp) if (map[c]) parts.push(map[c]);
  if (isOneOf(a, 'core.op_wound', 'soaked') || isOneOf(a, 'core.drain', 'frank_blood')) {
    parts.push({ problem: { treatment: [L('Examine now: direct pressure, check clotting and platelets, inform the operating surgeon; return to theatre if bleeding continues', isOneOf(a, 'core.drain', 'frank_blood') ? 'Fresh blood in the drain' : 'Soaked dressing / active bleeding', 'urgent')] } });
  }
  if (isOneOf(a, 'core.drain', 'serous', 'haemoserous', 'purulent')) {
    parts.push({ problem: { monitoring: [L('Record drain output every 24 hours; remove when the operating surgeon\'s criteria are met', `Drain: ${String(a['core.drain'])}${numOf(a, 'core.drain_output') != null ? `, ${numOf(a, 'core.drain_output')} mL/24 h` : ''}`)] } });
  }
  if (isOneOf(a, 'core.urine', 'low')) parts.push({ problem: { monitoring: [L('Fluid balance chart; assess for hypovolaemia and bleeding', 'Low urine output')] } });
  if (isOneOf(a, 'core.eating', 'nbm', 'limited')) parts.push({ general: [G('Nutrition', L('Resume eating and drinking as soon as it is safe', 'Early oral intake (ERAS)'))] });
  if (isOneOf(a, 'core.mobilising', 'no', 'limited')) {
    parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', child(ctx)
      ? L('Encourage age-appropriate activity out of bed today (sitting up and play; held or carried for infants) unless the operation requires rest', 'Not yet back to usual activity (child)')
      : L('Mobilise with physiotherapy today unless the operation requires rest; mechanical VTE prophylaxis meanwhile', 'Not yet mobilising (ERAS)'))] });
  }
  parts.push({ dischargeCriteria: child(ctx) ? [
    'Observations within the normal range for age, or at the child\'s agreed baseline',
    'Pain controlled on oral analgesia',
    'Feeding / eating and drinking, and passing urine (wet nappies in infants)',
    'Back to usual activity for age, or a plan in place at home',
    'Operative site checked; dressing plan and supplies arranged; caregiver confident with care',
    'Follow-up booked; red flags explained to the caregiver; medicines (doses by weight) and written instructions given',
  ] : [
    'NEWS2 low (0–4) with no single parameter scoring 3, or at the patient\'s agreed baseline',
    'Pain controlled on oral analgesia',
    'Eating, drinking and passing urine',
    'Mobilising safely, or a mobility plan in place at home',
    'Operative site checked; dressing plan and supplies arranged',
    'Follow-up booked; red flags explained; medicines and written instructions given',
  ] });
  return merge(...parts);
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const parts: PlanContribution[] = [];
  const barriers = chosen(a, 'core.adherence_barrier');
  const fix: Record<string, RuleLine> = {
    cost: L('Agree an affordable regimen and refer to social work', 'Plan not followed: cost'),
    distance: L('Move dressings to the nearest primary health centre; phone / WhatsApp review between visits', 'Plan not followed: distance'),
    understanding: L('Re-explain the plan using teach-back and give it in writing in the patient\'s language', 'Plan not followed: not understood'),
    pain: L('Review analgesia, especially before dressing changes', 'Plan not followed: pain'),
    side_effects: L('Review the medicine causing side effects', 'Plan not followed: side effects'),
    availability: L('Substitute an available dressing / drug with the same function', 'Plan not followed: not available'),
  };
  const items = barriers.map(b => fix[b]).filter(Boolean);
  if (items.length) parts.push({ general: [G('Social and financial support', ...items)] });
  if (isOneOf(a, 'core.adherence_fu', 'partial', 'none') && !barriers.length) {
    parts.push({ general: [G('Patient education', L('Find out why the plan was not followed before changing the treatment', `Adherence ${String(a['core.adherence_fu'])}`))] });
  }
  if (hasAny(a, 'core.interval_events', 'infection')) parts.push({ problem: { monitoring: [L('Confirm the infection has resolved; review the culture result and the antibiotic course', 'Infection treated since the last review')] } });
  if (hasAny(a, 'core.interval_events', 'readmission')) parts.push({ problem: { monitoring: [L('Review the readmission summary and adjust the plan', 'Readmitted since the last review')] } });
  if (isOneOf(a, 'core.function', 'static', 'worse')) {
    parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Physiotherapy / occupational therapy review; examine for contracture, nerve or tendon problems', `Function ${String(a['core.function'])}`))] });
  }
  return merge(...parts);
};

/** Changes since the previous review that need a response. */
const comparison: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up' && ctx.phase !== 'wound_review') return null;
  const last = ctx.prior.find(p => p.moduleId === ctx.module.id) ?? ctx.prior[0];
  if (!last) return null;
  const parts: PlanContribution[] = [];
  const area = (x: typeof ctx.answers) => {
    const ar = numOf(x, 'core.wound_area');
    if (ar != null) return ar;
    const l = numOf(x, 'core.wound_length'), w = numOf(x, 'core.wound_width');
    return l != null && w != null ? l * w : null;
  };
  const before = area(last.answers), now = area(ctx.answers);
  if (before != null && now != null && now > before) {
    parts.push({ problem: { treatment: [L('Wound larger than at the last review: reassess TIMERS, infection, perfusion, offloading and adherence; biopsy if it is not healing', `Area ${Math.round(before * 10) / 10} -> ${Math.round(now * 10) / 10} cm2 since ${last.at.slice(0, 10)}`, 'urgent')] } });
  }
  const pb = numOf(last.answers, 'core.pain_score'), pn = numOf(ctx.answers, 'core.pain_score');
  if (pb != null && pn != null && pn >= pb + 2) {
    parts.push({ general: [G('Analgesia', L('Pain has increased: examine for infection or another complication before increasing analgesia', `Pain ${pb} -> ${pn}/10 since ${last.at.slice(0, 10)}`))] });
  }
  return merge(...parts);
};

// ── Education and red flags ─────────────────────────────────────────────────

const education: PlanRule = ctx => {
  const items: RuleLine[] = (ctx.module.catalog.patientEducationIds ?? [])
    .map(id => educationConditionById(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map(c => L(`Explain and give the leaflet: ${c.name}`, 'Patient education library'));
  const red: RuleLine[] = [
    L('Fever of 38 C or more, shivering, or feeling generally unwell', 'Safety-netting'),
    L('Increasing pain, redness, swelling, a bad smell or pus from the wound', 'Safety-netting'),
    L('Bleeding that does not stop after 10 minutes of firm pressure', 'Safety-netting'),
    L('Calf pain or swelling, chest pain or breathlessness', 'Safety-netting: possible VTE'),
  ];
  if (woundPhase(ctx)) red.push(L('Red streaks spreading up the limb, or the skin around the wound turning dark', 'Safety-netting: spreading infection'));
  return {
    general: [...(items.length ? [G('Patient education', ...items)] : []), G('Red flags — return immediately if', ...red)],
    counselling: [P('Red flags', 'When and how to come back urgently (see the red-flag list), with the ward / clinic phone number.', 'Safety-netting')],
  };
};

/** Core rules, run before the module's rules in this order. */
export const CORE_RULES: readonly PlanRule[] = [
  glycaemia, lifestyle, anaemia, anticoagulation, systems, anaesthesia, vte, antibiotics,
  analgesia, nutrition, pressureCare, psychology, social, localBarriers, timers, tetanus,
  postOperative, followUp, comparison, education,
];
