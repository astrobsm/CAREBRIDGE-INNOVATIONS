/**
 * Hand conditions, congenital and acquired.
 *
 * Classifications are the standard ones (cited per template). Timing of
 * congenital surgery follows the cited reviews; the owner should confirm it
 * matches the practice's own timing.
 */
import type { ConditionTemplate, TemplateLine } from './types';
import {
  P, YNU, counselAll, daysUntilAgeMonths, exMulti, exSel, followUp, inv, list, monitor, multi, problem, proc, refer, sel,
} from './kit';

const OMT = 'Goldfarb CA, Ezaki M, Wall LB, Lam WL, Oberg KC. The Oberg-Manske-Tonkin (OMT) classification of congenital upper extremities: update for 2020. J Hand Surg Am. 2020;45(6):542-547.';
const PREOP_CHILD: TemplateLine[] = [
  inv('preop_fbc', 'Full blood count before general anaesthesia', 'Baseline haemoglobin before an operation in a child', { testId: 'fbc', analytes: ['hb', 'wbc', 'plt'] }),
  inv('preop_genotype', 'Haemoglobin genotype before general anaesthesia (if not known)', 'Sickle status changes anaesthetic and tourniquet management', { testId: 'genotype', options: ['AA', 'AS', 'AC', 'SS', 'SC', 'Other'] }),
];

// ── Syndactyly ──────────────────────────────────────────────────────────────
const BORDER = ['Thumb–index (1st web)', 'Ring–little (4th web)'];
export const SYNDACTYLY: ConditionTemplate = {
  id: 'syndactyly', label: 'Syndactyly (webbed / joined fingers)', group: 'Congenital hand', prefix: 'syn_',
  synonyms: ['syndactyly', 'webbed fingers', 'joined fingers', 'fused fingers', 'webbed toes'],
  complaintIds: [], suggestFor: ['congenital_hand'],
  history: {
    id: 'cond_syndactyly', title: 'Syndactyly history',
    questions: [
      multi('syn_webs', 'Web spaces involved', ['Thumb–index (1st web)', 'Index–middle (2nd web)', 'Middle–ring (3rd web)', 'Ring–little (4th web)', 'Toes as well']),
      sel('syn_side', 'Side', ['Left', 'Right', 'Both hands']),
      sel('syn_family', 'Family history of syndactyly or other hand / foot differences', YNU),
      sel('syn_pregnancy', 'Pregnancy and birth', ['Uneventful', 'Early leak of waters / infection (amniotic band risk)', 'Drugs or herbs taken in pregnancy', 'Maternal diabetes', 'Premature birth', 'Unknown']),
      multi('syn_assoc', 'Other differences noticed', ['None known', 'Skull or face shape (possible Apert / craniosynostosis)', 'Chest muscle / breast underdeveloped on that side (possible Poland)', 'Rings or missing fingertips (possible amniotic band)', 'Heart, kidney or spine problem', 'Feet involved', 'Other'],
        { redFlags: ['Skull or face shape (possible Apert / craniosynostosis)'] }),
      sel('syn_growth', 'Fingers bending or pulling crooked as the child grows', YNU, { redFlags: ['Yes'] }),
      sel('syn_function', 'Hand use', ['Uses the hand normally for age', 'Grasp limited', 'Not yet assessable', 'Unknown']),
      sel('syn_previous', 'Previous operation on the hand', ['No', 'Yes', 'Unknown']),
      sel('syn_concern', "Parents' main concern", ['Function', 'Appearance', 'Both', 'Not discussed']),
    ],
  },
  exam: {
    id: 'cond_syndactyly_exam', title: 'Syndactyly examination',
    questions: [
      exSel('syn_ex_extent', 'Extent (worst web)', ['Complete — joined to the fingertips', 'Incomplete — part of the web only']),
      exSel('syn_ex_type', 'Type', ['Simple — skin and soft tissue only', 'Complex — bones joined side to side', 'Complicated — extra or abnormal bones (Apert type)', 'Not yet known — X-ray needed']),
      exSel('syn_ex_nail', 'Nails', ['Separate nails and nail folds', 'Shared nail (synonychia)']),
      exSel('syn_ex_bone', 'Bony fusion on palpation', ['No bony fusion felt', 'Bony fusion felt or suspected']),
      exSel('syn_ex_joints', 'Joints and creases', ['Independent movement, normal creases', 'Stiff joints / absent creases (symphalangism)']),
      exSel('syn_ex_deviation', 'Digit alignment', ['Straight', 'Deviating or flexion contracture (tethering)'], { redFlags: ['Deviating or flexion contracture (tethering)'] }),
      exMulti('syn_ex_screen', 'Screening for associated anomalies', ['Feet normal', 'Toe syndactyly', 'Chest wall / pectoralis absent on that side (Poland)', 'Constriction rings / fingertip loss (amniotic band)', 'Abnormal skull / face shape (Apert / craniosynostosis)', 'Heart murmur', 'Spine abnormality', 'No other anomaly found'],
        { redFlags: ['Abnormal skull / face shape (Apert / craniosynostosis)'] }),
    ],
  },
  classification: { name: 'Simple / complex / complicated; complete / incomplete (with the OMT classification of congenital hand differences)', source: 'Dao KD, Shin AY, Billings A, Oberg KC, Wood VE. Surgical treatment of congenital syndactyly of the hand. J Am Acad Orthop Surg. 2004;12(1):39-48.' },
  sources: ['Dao KD, Shin AY, Billings A, Oberg KC, Wood VE. Surgical treatment of congenital syndactyly of the hand. J Am Acad Orthop Surg. 2004;12(1):39-48.', OMT],
  plan: c => {
    const L = P.conditions.syndactyly;
    const webs = list(c.a('syn_webs'));
    const border = webs.some(w => BORDER.includes(w));
    const complex = c.is('syn_ex_type', 'Complex — bones joined side to side', 'Complicated — extra or abnormal bones (Apert type)') || c.is('syn_ex_bone', 'Bony fusion felt or suspected');
    const apert = c.is('syn_assoc', 'Skull or face shape (possible Apert / craniosynostosis)') || c.is('syn_ex_screen', 'Abnormal skull / face shape (Apert / craniosynostosis)');
    const poland = c.is('syn_assoc', 'Chest muscle / breast underdeveloped on that side (possible Poland)') || c.is('syn_ex_screen', 'Chest wall / pectoralis absent on that side (Poland)');
    const band = c.is('syn_assoc', 'Rings or missing fingertips (possible amniotic band)') || c.is('syn_ex_screen', 'Constriction rings / fingertip loss (amniotic band)');
    const heart = c.is('syn_assoc', 'Heart, kidney or spine problem') || c.is('syn_ex_screen', 'Heart murmur', 'Spine abnormality');
    const tether = c.is('syn_growth', 'Yes') || c.is('syn_ex_deviation', 'Deviating or flexion contracture (tethering)');
    const m = c.facts.ageMonths;
    const extent = c.a('syn_ex_extent') && c.a('syn_ex_extent') !== 'Not examined' ? String(c.a('syn_ex_extent')).split(' —')[0].toLowerCase() : null;
    const type = c.a('syn_ex_type') && c.a('syn_ex_type') !== 'Not examined' ? String(c.a('syn_ex_type')).split(' —')[0].toLowerCase() : null;
    const desc = [webs.filter(w => w !== 'Toes as well').join(', ') || 'web spaces not documented', c.a('syn_side'), extent, type].filter(Boolean).join(' · ');
    const releaseAt = border || tether ? 6 : 12;
    const out: TemplateLine[] = [
      problem('syndactyly', `Syndactyly: ${desc}`, { patient: L.name }),
      inv('syn_xray', 'Plain X-ray of both hands (and feet if involved)', complex ? 'Bony fusion or extra bones suspected: defines complex / complicated syndactyly and the plan' : 'Shows whether the bones are joined before release is planned', { testId: 'xray', urgency: 'routine' }),
      ...(m == null || m < 24 ? PREOP_CHILD : [PREOP_CHILD[0]]),
      proc('syn_release', 'Syndactyly release: zig-zag flaps, dorsal commissure flap and full-thickness skin graft; one side of a digit at a time',
        border || tether
          ? 'Border digits (thumb–index, ring–little) or tethering: release early, from about 6 months, to prevent growth deformity'
          : 'Central webs: release usually at 12–18 months',
        { procedureReviewModuleId: 'skin_graft', patient: L.options.release, urgency: tether ? 'soon' : 'routine' }),
      monitor('syn_growth', 'Digit alignment and growth at each visit until release (tethering, flexion contracture)'),
      monitor('syn_webcreep', 'After release: web creep and graft contracture yearly through growth'),
      followUp('syn_planning', m != null && m < releaseAt ? `At about ${releaseAt} months of age` : 'Within 4–6 weeks', 'Surgical planning visit: consent, anaesthetic review, X-ray review',
        m != null && m < releaseAt ? daysUntilAgeMonths(m, releaseAt) : 35, { patient: 'A visit to plan the operation and answer your questions' }),
      followUp('syn_postop', '2–3 weeks after the operation', 'Remove the dressing / cast and check the graft', undefined, { patient: 'A check of the hand when the dressing comes off' }),
      ...counselAll('syn', L.counselling),
    ];
    if (complex) out.push(proc('syn_complex', 'Complex / complicated syndactyly: staged reconstruction; separate bony fusion; nail fold reconstruction (Buck-Gramcko pulp flaps)', 'Bony fusion or shared nail', { urgency: 'routine' }));
    if (apert) out.push(refer('syn_craniofacial', 'Craniofacial surgery and clinical genetics (possible Apert / craniosynostosis syndrome)', 'Skull or face shape difference with syndactyly', { urgency: 'soon' }));
    if (poland) out.push(refer('syn_poland', 'Poland syndrome: chest wall assessment; breast / chest reconstruction planning in adolescence', 'Absent pectoralis on the side of the syndactyly'));
    if (band) out.push(proc('syn_band', 'Amniotic band: release of constriction rings (Z-plasty) and acrosyndactyly release, staged', 'Constriction rings or fingertip loss'));
    if (heart) out.push(refer('syn_paeds', 'Paediatrics: cardiac / renal / spinal assessment (echocardiogram, renal ultrasound as indicated)', 'Associated anomaly reported or found'), inv('syn_screen', 'Syndromic screen as indicated (echocardiogram, renal ultrasound)', 'Associated anomaly', { testId: 'syndrome_screen' }));
    if (c.is('syn_family', 'Yes') && !apert) out.push(refer('syn_genetics', 'Clinical genetics (familial syndactyly): counselling about recurrence', 'Family history of hand / foot differences', { urgency: 'routine' }));
    return out;
  },
};

// ── Polydactyly ─────────────────────────────────────────────────────────────
export const POLYDACTYLY: ConditionTemplate = {
  id: 'polydactyly', label: 'Polydactyly (extra digit)', group: 'Congenital hand', prefix: 'poly_',
  synonyms: ['polydactyly', 'extra finger', 'extra toe', 'sixth finger', 'duplicated thumb', 'thumb duplication'],
  complaintIds: [], suggestFor: ['congenital_hand'],
  history: {
    id: 'cond_polydactyly', title: 'Polydactyly history',
    questions: [
      sel('poly_side_digit', 'Which side of the hand', ['Little-finger side (postaxial / ulnar)', 'Thumb side (preaxial / radial)', 'Central finger', 'Toes only']),
      sel('poly_side', 'Side', ['Left', 'Right', 'Both']),
      sel('poly_family', 'Family history of extra digits', YNU),
      sel('poly_ligation', 'Thread tied around it already', ['No', 'Yes — fell off', 'Yes — still attached / infected', 'Unknown'], { redFlags: ['Yes — still attached / infected'] }),
      multi('poly_assoc', 'Other differences noticed', ['None known', 'Feet also affected', 'Heart / kidney problem', 'Short stature / other body differences', 'Developmental delay', 'Other']),
      sel('poly_concern', "Parents' main concern", ['Appearance', 'Function', 'Both', 'Not discussed']),
    ],
  },
  exam: {
    id: 'cond_polydactyly_exam', title: 'Polydactyly examination',
    questions: [
      exSel('poly_ex_postaxial', 'Postaxial (little-finger side) type', ['Type A — well-formed digit with bone', 'Type B — small nubbin on a narrow skin stalk', 'Not applicable']),
      exSel('poly_ex_wassel', 'Thumb duplication (Wassel)', ['I — bifid distal phalanx', 'II — duplicated distal phalanx', 'III — bifid proximal phalanx', 'IV — duplicated proximal phalanx (commonest)', 'V — bifid metacarpal', 'VI — duplicated metacarpal', 'VII — triphalangeal component', 'Not applicable']),
      exSel('poly_ex_stalk', 'Attachment', ['Narrow skin stalk only', 'Broad base with bone / joint', 'Not examined clearly']),
      exSel('poly_ex_stability', 'Stability / angulation of the remaining digit', ['Stable and straight', 'Unstable or angulated']),
      exMulti('poly_ex_screen', 'Screen for associated anomalies', ['Feet normal', 'Polydactyly of the feet', 'Syndactyly', 'Heart murmur', 'Dysmorphic features', 'No other anomaly found']),
    ],
  },
  classification: { name: 'Wassel (thumb duplication); Temtamy–McKusick type A / B (postaxial)', source: 'Wassel HD. The results of surgery for polydactyly of the thumb. Clin Orthop Relat Res. 1969;64:175-193. Temtamy SA, McKusick VA. The genetics of hand malformations. Birth Defects Orig Artic Ser. 1978;14(3):i-xviii,1-619.' },
  sources: ['Wassel HD. Clin Orthop Relat Res. 1969;64:175-193.', 'Temtamy SA, McKusick VA. Birth Defects Orig Artic Ser. 1978;14(3).', OMT],
  plan: c => {
    const L = P.conditions.polydactyly;
    const pre = c.is('poly_side_digit', 'Thumb side (preaxial / radial)') || (!!c.a('poly_ex_wassel') && !c.is('poly_ex_wassel', 'Not applicable', 'Not examined'));
    const typeB = c.is('poly_ex_postaxial', 'Type B — small nubbin on a narrow skin stalk') || c.is('poly_ex_stalk', 'Narrow skin stalk only');
    const syndromic = c.is('poly_assoc', 'Heart / kidney problem', 'Short stature / other body differences', 'Developmental delay') || c.is('poly_ex_screen', 'Heart murmur', 'Dysmorphic features');
    const m = c.facts.ageMonths;
    const out: TemplateLine[] = [
      problem('polydactyly', `Polydactyly: ${[c.a('poly_side_digit'), c.a('poly_side'), pre ? c.a('poly_ex_wassel') && `Wassel ${String(c.a('poly_ex_wassel')).split(' —')[0]}` : c.a('poly_ex_postaxial') && String(c.a('poly_ex_postaxial')).split(' —')[0]].filter(Boolean).join(' · ') || 'type not documented'}`, { patient: L.name }),
      ...counselAll('poly', L.counselling),
    ];
    if (pre) {
      out.push(
        inv('poly_xray', 'Plain X-ray of the hand', 'Level of duplication (Wassel type) and joint shape before reconstruction', { testId: 'xray' }),
        ...PREOP_CHILD,
        proc('poly_recon', 'Thumb duplication reconstruction: excise the lesser (usually radial) thumb, reconstruct the collateral ligament, realign and rebalance tendons; osteotomy if angulated', 'Preaxial polydactyly: one operation at about 9–12 months', { procedureReviewModuleId: 'local_regional_flap', patient: L.options.reconstruction }),
        followUp('poly_plan', m != null && m < 9 ? 'At about 9–12 months of age' : 'Within 4–6 weeks', 'Surgical planning: X-ray review, consent', m != null && m < 9 ? daysUntilAgeMonths(m, 9) : 35, { patient: 'A visit to plan the operation' }),
        monitor('poly_growth', 'After reconstruction: alignment, stability and nail at each visit; Z-deformity through growth'),
      );
    } else {
      out.push(
        ...(typeB ? [] : [inv('poly_xray', 'Plain X-ray of the hand', 'Type A: bony articulation determines the excision', { testId: 'xray' })]),
        proc('poly_excise', typeB ? 'Excision of the type B nubbin (formal excision, not suture ligation), local anaesthetic or short general anaesthetic' : 'Excision of the extra digit with ligament / capsule repair and abductor transfer as needed',
          typeB ? 'Type B: excision avoids the painful neuroma or bump suture ligation can leave' : 'Type A: well-formed digit articulating with the metacarpal',
          { procedureReviewModuleId: 'soft_tissue_lesion_excision', patient: L.options.excision }),
        followUp('poly_plan', typeB ? 'Next available minor-operation list' : m != null && m < 9 ? 'At about 9–12 months of age' : 'Within 4–6 weeks', 'Excision of the extra digit', typeB ? 21 : m != null && m < 9 ? daysUntilAgeMonths(m, 9) : 35, { patient: 'A visit for the small operation' }),
      );
      if (!typeB) out.push(...PREOP_CHILD);
    }
    if (c.is('poly_ligation', 'Yes — still attached / infected')) out.push(proc('poly_ligated', 'Ligated digit still attached or infected: remove the ligature, treat infection, formal excision once settled', 'Ligation complication', { urgency: 'soon' }));
    if (syndromic || (pre && c.is('poly_assoc', 'Heart / kidney problem'))) out.push(refer('poly_genetics', 'Paediatrics / clinical genetics: syndromic screen (e.g. Ellis–van Creveld, trisomy 13, Bardet–Biedl, Fanconi with radial differences)', 'Associated anomalies'), inv('poly_screen', 'Syndromic screen as indicated (echocardiogram, renal ultrasound, FBC for radial-sided anomalies)', 'Associated anomalies', { testId: 'syndrome_screen' }));
    return out;
  },
};

// ── Cleft hand and other congenital hand differences (brief) ────────────────
export const CONGENITAL_HAND_OTHER: ConditionTemplate = {
  id: 'congenital_hand', label: 'Cleft hand / other congenital hand difference', group: 'Congenital hand', prefix: 'chd_',
  synonyms: ['cleft hand', 'central deficiency', 'lobster claw hand', 'radial club hand', 'radial longitudinal deficiency', 'thumb hypoplasia', 'symbrachydactyly', 'camptodactyly', 'clinodactyly', 'congenital hand difference'],
  complaintIds: [], suggestFor: ['congenital_hand'],
  history: {
    id: 'cond_congenital_hand', title: 'Congenital hand difference history',
    questions: [
      sel('chd_type', 'Type of difference (working description)', ['Cleft hand (central deficiency)', 'Thumb hypoplasia / absent thumb', 'Radial longitudinal deficiency (radial club hand)', 'Symbrachydactyly (short / missing fingers)', 'Camptodactyly (bent little finger)', 'Clinodactyly (angled finger)', 'Constriction band', 'Other']),
      sel('chd_side', 'Side', ['Left', 'Right', 'Both']),
      sel('chd_feet', 'Feet also affected', YNU),
      sel('chd_family', 'Family history of hand / foot differences', YNU),
      multi('chd_assoc', 'Other problems', ['None known', 'Heart problem', 'Blood problem / easy bruising / pallor', 'Kidney problem', 'Spine problem', 'Hearing / face differences', 'Developmental delay', 'Other'],
        { redFlags: ['Blood problem / easy bruising / pallor'] }),
      sel('chd_function', 'Hand use', ['Uses the hand well for age', 'Limited grasp / pinch', 'Avoids using the hand', 'Not yet assessable']),
    ],
  },
  exam: {
    id: 'cond_congenital_hand_exam', title: 'Congenital hand examination',
    questions: [
      exSel('chd_ex_web', 'First web space (Manske–Halikis, cleft hand)', ['I — normal web', 'IIA — mildly narrowed', 'IIB — severely narrowed', 'III — syndactylised', 'IV — index ray suppressed', 'V — thumb absent', 'Not applicable']),
      exSel('chd_ex_thumb', 'Thumb', ['Normal', 'Small but stable', 'Unstable CMC / absent', 'Absent']),
      exSel('chd_ex_forearm', 'Forearm / wrist', ['Normal', 'Radial deviation of the wrist', 'Short forearm']),
      exSel('chd_ex_grasp', 'Grasp and pinch', ['Normal for age', 'Weak / limited', 'Absent']),
      exMulti('chd_ex_screen', 'Screen for associated anomalies', ['Feet normal', 'Feet affected', 'Heart murmur', 'Pallor / petechiae', 'Spine abnormality', 'No other anomaly found'], { redFlags: ['Pallor / petechiae'] }),
    ],
  },
  classification: { name: 'Oberg–Manske–Tonkin (OMT) classification; Manske–Halikis first-web classification for cleft hand', source: `${OMT} Manske PR, Halikis MN. Surgical classification of central deficiency according to the thumb web. J Hand Surg Am. 1995;20(4):687-697.` },
  sources: [OMT, 'Manske PR, Halikis MN. J Hand Surg Am. 1995;20(4):687-697.'],
  plan: c => {
    const L = P.conditions.congenital_hand;
    const radial = c.is('chd_type', 'Thumb hypoplasia / absent thumb', 'Radial longitudinal deficiency (radial club hand)');
    const blood = c.is('chd_assoc', 'Blood problem / easy bruising / pallor') || c.is('chd_ex_screen', 'Pallor / petechiae');
    const out: TemplateLine[] = [
      problem('chd', `Congenital hand difference: ${[c.a('chd_type'), c.a('chd_side'), c.a('chd_ex_web') && !c.is('chd_ex_web', 'Not applicable', 'Not examined') ? `first web ${String(c.a('chd_ex_web')).split(' —')[0]}` : null].filter(Boolean).join(' · ') || 'type not documented'}`, { patient: L.name }),
      inv('chd_xray', 'Plain X-rays of both hands and forearms (and feet if affected)', 'Bony anatomy for classification and planning', { testId: 'xray' }),
      ...PREOP_CHILD,
      proc('chd_recon', c.is('chd_type', 'Cleft hand (central deficiency)') ? 'Cleft hand: cleft closure with first-web reconstruction (e.g. Snow–Littler / Ueba), timed to first-web severity'
        : radial ? 'Radial deficiency / thumb hypoplasia: staged care — stretching and splinting, centralisation / radialisation, pollicisation for an absent or unstable thumb'
          : 'Reconstruction planned for function (web deepening, release, osteotomy) as indicated', 'Function first, at the cited ages (usually the first 1–2 years)', { patient: L.options.reconstruction }),
      refer('chd_therapy', 'Hand therapy / occupational therapy: splinting, stretching, function', 'Function and early splinting'),
      followUp('chd_review', 'In 4–6 weeks', 'Review the X-rays and agree the surgical plan', 35, { patient: 'A visit to look at the X-rays and agree the plan' }),
      ...counselAll('chd', L.counselling),
    ];
    if (radial || blood) out.push(
      inv('chd_fbc', 'Full blood count and blood film', 'Radial-sided differences: screen for TAR syndrome, Fanconi anaemia (and VACTERL / Holt–Oram)', { testId: 'fbc', analytes: ['hb', 'wbc', 'plt'], urgency: blood ? 'soon' : 'routine' }),
      inv('chd_screen', 'Echocardiogram, renal ultrasound and spine X-ray', 'Holt–Oram and VACTERL association with radial deficiency', { testId: 'syndrome_screen' }),
      refer('chd_haem', 'Paediatric haematology / genetics (Fanconi anaemia: chromosome breakage test where available)', 'Radial deficiency or blood abnormality', { urgency: blood ? 'soon' : 'routine' }),
    );
    return out;
  },
};

// ── Trigger finger ─────────────────────────────────────────────────────────
export const TRIGGER_FINGER: ConditionTemplate = {
  id: 'trigger_finger', label: 'Trigger finger / thumb', group: 'Hand', prefix: 'tf_',
  synonyms: ['trigger finger', 'trigger thumb', 'stenosing tenosynovitis', 'locking finger', 'snapping finger'],
  complaintIds: ['trigger_finger'],
  history: {
    id: 'cond_trigger_finger', title: 'Trigger finger history',
    questions: [
      multi('tf_digits', 'Digits affected', ['Thumb', 'Index', 'Middle', 'Ring', 'Little']),
      sel('tf_side', 'Side', ['Left', 'Right', 'Both']),
      sel('tf_locking', 'Catching / locking', ['Pain only, no catching', 'Catches but straightens by itself', 'Needs the other hand to straighten', 'Locked — cannot straighten / bend'], { redFlags: [] }),
      sel('tf_morning', 'Worse in the morning', YNU),
      sel('tf_previous_injection', 'Previous steroid injections into this finger', ['None', 'One', 'Two or more']),
      sel('tf_dominance', 'Hand dominance', ['Right', 'Left', 'Ambidextrous']),
      sel('tf_job', 'Heavy gripping at work', YNU),
    ],
  },
  exam: {
    id: 'cond_trigger_finger_exam', title: 'Trigger finger examination',
    questions: [
      exSel('tf_ex_nodule', 'Tender nodule over the A1 pulley', ['Present', 'Absent']),
      exSel('tf_ex_grade', 'Grade (Quinnell / Green)', ['I — pain / tenderness at A1, no catching', 'II — catching, actively correctable', 'III — locking, passively correctable', 'IV — fixed flexion contracture']),
      exSel('tf_ex_pip', 'PIP flexion contracture', ['None', 'Present']),
      exSel('tf_ex_other', 'Other hand findings', ['None', 'Dupuytren cords', 'Carpal tunnel signs', 'Inflammatory arthritis']),
    ],
  },
  classification: { name: 'Quinnell grading as modified by Green (I–IV)', source: 'Quinnell RC. Conservative management of trigger finger. Practitioner. 1980;224(1340):187-190 (as modified by Green).' },
  sources: ['Quinnell RC. Practitioner. 1980;224:187-190.', 'Makkouk AH, Oetgen ME, Swigart CR, Dodds SD. Trigger finger: etiology, evaluation, and treatment. Curr Rev Musculoskelet Med. 2008;1(2):92-96.'],
  plan: c => {
    const L = P.conditions.trigger_finger;
    const grade = String(c.a('tf_ex_grade') ?? '');
    const high = /^III|^IV/.test(grade) || c.is('tf_locking', 'Locked — cannot straighten / bend');
    const injections = c.is('tf_previous_injection', 'Two or more');
    const child = c.facts.isChild;
    const out: TemplateLine[] = [
      problem('tf', `Trigger ${list(c.a('tf_digits')).join(', ') || 'digit'} ${c.a('tf_side') || ''}${grade ? ` · grade ${grade.split(' —')[0]}` : ''}`.trim(), { patient: L.name }),
      ...counselAll('tf', L.counselling),
    ];
    if (child) {
      out.push(
        proc('tf_paeds', 'Paediatric trigger thumb: observation / splinting; A1 pulley release if persistent (commonly after age 3) or fixed', 'Paediatric trigger thumb often resolves; it is not treated with steroid injection', { patient: L.options.release }),
        followUp('tf_review', 'In 3–6 months', 'Review the thumb', 120, { patient: 'A check of the thumb' }),
      );
      return out;
    }
    if (c.facts.diabetes) out.push(inv('tf_glucose', 'Blood glucose / HbA1c', 'Diabetes: trigger digits are commoner and respond less well to injection; injection raises glucose for a few days', { testId: 'glucose_hba1c', analytes: ['glucose', 'hba1c'] }));
    if (!high && !injections) out.push(
      proc('tf_splint', 'Night extension splint for 6 weeks', 'Grade I–II, first-line', { patient: L.options.splint }),
      proc('tf_injection', 'Corticosteroid injection into the flexor sheath at A1 (e.g. triamcinolone 10–20 mg or methylprednisolone 20–40 mg with lidocaine); up to 2 injections', 'Grade I–III first-line', { patient: L.options.injection }),
    );
    out.push(proc('tf_release', 'Open A1 pulley release under local anaesthetic (WALANT)', high ? 'Locked or fixed (grade III–IV)' : injections ? 'Failed 2 injections' : 'If splint and injection fail', { patient: L.options.release, urgency: high ? 'soon' : 'routine' }));
    out.push(followUp('tf_review', 'In 6 weeks', 'Review response to splint / injection', 42, { patient: 'A check of the finger' }));
    return out;
  },
};

// ── Dupuytren's disease ─────────────────────────────────────────────────────
export const DUPUYTREN: ConditionTemplate = {
  id: 'dupuytren', label: "Dupuytren's disease", group: 'Hand', prefix: 'dup_',
  synonyms: ['dupuytren', 'dupuytrens', 'palmar fibromatosis', 'bent fingers', 'palm cord'],
  complaintIds: [], suggestFor: ['hand_stiffness'],
  history: {
    id: 'cond_dupuytren', title: "Dupuytren's history",
    questions: [
      multi('dup_digits', 'Digits affected', ['Thumb', 'Index', 'Middle', 'Ring', 'Little']),
      sel('dup_side', 'Side', ['Left', 'Right', 'Both']),
      sel('dup_progress', 'Progression', ['Slow', 'Rapid (months)', 'Static', 'Unknown']),
      sel('dup_tabletop', 'Can put the hand flat on a table (Hueston tabletop test)', ['Yes', 'No']),
      multi('dup_diathesis', 'Diathesis features', ['Onset before 50', 'Family history', 'Both hands', 'Knuckle pads (Garrod)', 'Plantar fibromatosis (Ledderhose)', 'Penile (Peyronie)', 'None']),
      multi('dup_risks', 'Associated factors', ['Diabetes', 'Epilepsy / anticonvulsants', 'Heavy alcohol', 'Smoking', 'Manual work', 'None']),
      sel('dup_previous', 'Previous treatment', ['None', 'Needle fasciotomy', 'Fasciectomy', 'Recurrence after surgery']),
    ],
  },
  exam: {
    id: 'cond_dupuytren_exam', title: "Dupuytren's examination",
    questions: [
      exSel('dup_ex_mcp', 'Worst MCP joint extension deficit', ['None', 'Under 30°', '30° or more']),
      exSel('dup_ex_pip', 'Worst PIP joint extension deficit', ['None', 'Present (any)']),
      exSel('dup_ex_tubiana', 'Tubiana stage (total deficit of the ray)', ['N — nodule only', '1 — 0–45°', '2 — 45–90°', '3 — 90–135°', '4 — over 135°']),
      exSel('dup_ex_skin', 'Skin', ['Supple', 'Pitted / adherent to cord', 'Scarred from previous surgery']),
      exSel('dup_ex_sensation', 'Digital sensation', ['Normal', 'Reduced']),
    ],
  },
  classification: { name: 'Tubiana staging', source: "Tubiana R, Michon J, Thomine JM. Scheme for the assessment of deformities in Dupuytren's disease. Surg Clin North Am. 1968;48(5):979-984." },
  sources: ["Tubiana R, Michon J, Thomine JM. Surg Clin North Am. 1968;48(5):979-984.", "NICE Interventional procedures guidance IPG43: Needle fasciotomy for Dupuytren's contracture (2004)."],
  plan: c => {
    const L = P.conditions.dupuytren;
    const indicated = c.is('dup_tabletop', 'No') || c.is('dup_ex_mcp', '30° or more') || c.is('dup_ex_pip', 'Present (any)');
    const out: TemplateLine[] = [
      problem('dup', `Dupuytren's disease: ${[list(c.a('dup_digits')).join(', '), c.a('dup_side'), c.a('dup_ex_tubiana') && `Tubiana ${String(c.a('dup_ex_tubiana')).split(' —')[0]}`].filter(Boolean).join(' · ') || 'extent not documented'}`, { patient: L.name }),
      ...counselAll('dup', L.counselling),
    ];
    if (c.is('dup_risks', 'Diabetes') || c.facts.diabetes) out.push(inv('dup_hba1c', 'Blood glucose / HbA1c', 'Diabetes association', { testId: 'glucose_hba1c', analytes: ['glucose', 'hba1c'] }));
    if (indicated) {
      out.push(
        proc('dup_nf', 'Percutaneous needle fasciotomy (MCP contractures, well-defined palmar cord)', 'Contracture with a positive tabletop test; quicker recovery, higher recurrence', { patient: L.options.needle }),
        proc('dup_fasciectomy', 'Limited fasciectomy (PIP involvement, recurrence, diathesis); dermofasciectomy with FTSG for recurrent / skin-involved disease', 'PIP contracture or recurrence', { procedureReviewModuleId: 'skin_graft', patient: L.options.fasciectomy }),
        refer('dup_therapy', 'Hand therapy: post-operative splint and exercises', 'Function after release'),
        followUp('dup_plan', 'In 4 weeks', 'Surgical planning and consent', 28, { patient: 'A visit to plan the treatment' }),
      );
    } else {
      out.push(
        monitor('dup_watch', 'Observe: measure MCP and PIP deficits with a goniometer at each visit; treat when the tabletop test is positive, MCP ≥ 30° or any PIP contracture'),
        followUp('dup_review', 'In 6 months', 'Re-measure contractures', 180, { patient: 'A check of your hand' }),
      );
    }
    return out;
  },
};

// ── Carpal tunnel syndrome ─────────────────────────────────────────────────
export const CARPAL_TUNNEL: ConditionTemplate = {
  id: 'carpal_tunnel', label: 'Carpal tunnel syndrome', group: 'Hand', prefix: 'cts_',
  synonyms: ['carpal tunnel', 'CTS', 'median nerve compression', 'tingling fingers at night'],
  complaintIds: [], suggestFor: ['hand_numbness', 'weak_grip'],
  history: {
    id: 'cond_carpal_tunnel', title: 'Carpal tunnel history',
    questions: [
      sel('cts_side', 'Side', ['Left', 'Right', 'Both']),
      sel('cts_distribution', 'Numbness / tingling distribution', ['Thumb, index, middle (and half of ring)', 'Little and ring finger', 'Whole hand', 'Unclear']),
      sel('cts_night', 'Woken at night / shakes the hand for relief', YNU),
      sel('cts_constant', 'Numbness constant (not only at night)', YNU, { redFlags: ['Yes'] }),
      sel('cts_weakness', 'Dropping things / weak pinch', YNU),
      multi('cts_assoc', 'Associated conditions', ['Diabetes', 'Hypothyroidism', 'Pregnancy', 'Rheumatoid arthritis', 'Previous wrist fracture', 'Kidney failure / dialysis', 'Obesity', 'None known']),
      sel('cts_neck', 'Neck pain radiating down the arm', YNU),
      sel('cts_previous', 'Previous treatment', ['None', 'Splint', 'Steroid injection', 'Surgery']),
    ],
  },
  exam: {
    id: 'cond_carpal_tunnel_exam', title: 'Carpal tunnel examination',
    questions: [
      exSel('cts_ex_wasting', 'Thenar wasting', ['None', 'Present'], { redFlags: ['Present'] }),
      exSel('cts_ex_abd', 'Abductor pollicis brevis power', ['Normal (5/5)', 'Weak (< 5/5)']),
      exSel('cts_ex_sensation', 'Sensation (median distribution)', ['Normal', 'Reduced light touch', 'Two-point discrimination over 6 mm']),
      exSel('cts_ex_phalen', "Phalen's test", ['Positive', 'Negative']),
      exSel('cts_ex_durkan', 'Carpal compression (Durkan) test', ['Positive', 'Negative']),
      exSel('cts_ex_tinel', "Tinel's sign over the carpal tunnel", ['Positive', 'Negative']),
      exSel('cts_ex_neck', 'Cervical spine / Spurling test', ['Normal', 'Positive — consider radiculopathy']),
    ],
  },
  classification: { name: 'Clinical severity (mild / moderate / severe); Bland neurophysiological grade when nerve studies are done', source: 'Bland JD. A neurophysiological grading scale for carpal tunnel syndrome. Muscle Nerve. 2000;23(8):1280-1283.' },
  sources: ['American Academy of Orthopaedic Surgeons. Management of Carpal Tunnel Syndrome Evidence-Based Clinical Practice Guideline (2016).', 'Bland JD. Muscle Nerve. 2000;23(8):1280-1283.'],
  plan: c => {
    const L = P.conditions.carpal_tunnel;
    const severe = c.is('cts_ex_wasting', 'Present') || c.is('cts_constant', 'Yes') || c.is('cts_ex_abd', 'Weak (< 5/5)') || c.is('cts_ex_sensation', 'Two-point discrimination over 6 mm');
    const pregnant = c.is('cts_assoc', 'Pregnancy') || c.facts.pregnancy === 'confirmed';
    const out: TemplateLine[] = [
      problem('cts', `Carpal tunnel syndrome ${c.a('cts_side') || ''}${severe ? ' — severe features (wasting / constant numbness / weakness)' : ''}`.trim(), { patient: L.name }),
      inv('cts_ncs', 'Nerve conduction studies', severe ? 'Severe features: confirm and grade before release' : 'If the diagnosis is uncertain or before surgery', { testId: 'nerve_test', urgency: severe ? 'soon' : 'routine' }),
      inv('cts_glucose', 'Blood glucose / HbA1c', 'Diabetes is a common association', { testId: 'glucose_hba1c', analytes: ['glucose', 'hba1c'] }),
      inv('cts_tsh', 'TSH', 'Hypothyroidism association', { testId: 'thyroid' }),
      ...counselAll('cts', L.counselling),
    ];
    if (c.is('cts_assoc', 'Rheumatoid arthritis')) out.push(inv('cts_rf', 'Rheumatoid factor / anti-CCP and ESR / CRP', 'Inflammatory arthritis', { testId: 'vasculitis' }));
    if (c.is('cts_ex_neck', 'Positive — consider radiculopathy') || c.is('cts_neck', 'Yes')) out.push(refer('cts_neck', 'Assess for cervical radiculopathy / double crush (cervical spine imaging if indicated)', 'Neck pain or positive Spurling'));
    if (!severe) out.push(
      proc('cts_splint', 'Neutral wrist splint at night for 6–8 weeks', 'Mild–moderate: first-line', { patient: L.options.splint }),
      ...(pregnant ? [] : [proc('cts_injection', 'Carpal tunnel corticosteroid injection (e.g. methylprednisolone 40 mg or triamcinolone 20–40 mg)', 'Mild–moderate, short-term relief', { patient: L.options.injection })]),
    );
    if (pregnant) out.push(proc('cts_pregnancy', 'Pregnancy: splint and review; usually resolves after delivery — surgery only for severe persistent symptoms', 'Pregnancy-related CTS'));
    out.push(proc('cts_release', 'Open carpal tunnel release under local anaesthetic (WALANT)', severe ? 'Thenar wasting, constant numbness or weakness: release without delay' : 'If splint / injection fail', { urgency: severe ? 'soon' : 'routine', patient: L.options.release }));
    out.push(followUp('cts_review', severe ? 'In 2–4 weeks' : 'In 6–8 weeks', severe ? 'Nerve study result and surgical planning' : 'Review the response to the splint', severe ? 21 : 49, { patient: 'A check of your hand and the test results' }));
    return out;
  },
};

// ── Ganglion ──────────────────────────────────────────────────────────────
export const GANGLION: ConditionTemplate = {
  id: 'ganglion', label: 'Ganglion / mucous cyst', group: 'Hand', prefix: 'gan_',
  synonyms: ['ganglion', 'wrist lump', 'mucous cyst', 'seed ganglion', 'bible bump'],
  complaintIds: [], suggestFor: ['hand_lump'],
  history: {
    id: 'cond_ganglion', title: 'Ganglion history',
    questions: [
      sel('gan_site', 'Site', ['Dorsal wrist', 'Volar (palm side) wrist', 'Flexor sheath (base of finger, seed ganglion)', 'End joint of finger (mucous cyst)', 'Foot / ankle', 'Other']),
      sel('gan_size_change', 'Size changes', ['Fluctuates', 'Steadily growing', 'Static', 'Unknown'], { redFlags: ['Steadily growing'] }),
      sel('gan_pain', 'Pain or interference with use', ['None', 'Ache with use', 'Painful / limits work']),
      sel('gan_numbness', 'Numbness / tingling in the fingers', YNU),
      sel('gan_previous', 'Previous treatment', ['None', 'Aspiration', 'Excision', 'Hit / burst']),
    ],
  },
  exam: {
    id: 'cond_ganglion_exam', title: 'Ganglion examination',
    questions: [
      exSel('gan_ex_feel', 'Consistency', ['Smooth, firm, rubbery', 'Hard / bony', 'Soft and compressible', 'Pulsatile'], { redFlags: ['Pulsatile', 'Hard / bony'] }),
      exSel('gan_ex_trans', 'Transillumination', ['Transilluminates', 'Does not transilluminate']),
      exSel('gan_ex_size', 'Size', ['Under 1 cm', '1–3 cm', 'Over 3 cm']),
      exSel('gan_ex_allen', "Allen's test (volar wrist ganglion near the radial artery)", ['Normal', 'Abnormal', 'Not applicable']),
      exSel('gan_ex_nail', 'Nail grooving (mucous cyst)', ['None', 'Present', 'Not applicable']),
    ],
  },
  sources: ['Gude W, Morelli V. Ganglion cysts of the wrist: pathophysiology, clinical picture, and management. Curr Rev Musculoskelet Med. 2008;1(3-4):205-211.'],
  plan: c => {
    const L = P.conditions.ganglion;
    const atypical = c.is('gan_ex_feel', 'Hard / bony', 'Pulsatile', 'Soft and compressible') || c.is('gan_ex_trans', 'Does not transilluminate') || c.is('gan_size_change', 'Steadily growing');
    const mucous = c.is('gan_site', 'End joint of finger (mucous cyst)');
    const symptomatic = c.is('gan_pain', 'Painful / limits work', 'Ache with use') || c.is('gan_numbness', 'Yes');
    const out: TemplateLine[] = [
      problem('gan', `${mucous ? 'Mucous cyst' : 'Ganglion'}: ${c.a('gan_site') || 'site not documented'}${atypical ? ' — atypical features' : ''}`, { patient: L.name }),
      ...counselAll('gan', L.counselling),
    ];
    if (atypical) out.push(inv('gan_uss', 'Ultrasound of the lump (MRI if solid or deep)', 'Atypical: not transilluminating, hard, pulsatile or growing — exclude a solid tumour or aneurysm', { testId: 'ultrasound', urgency: 'soon' }));
    if (mucous) out.push(inv('gan_xray', 'X-ray of the finger', 'Mucous cyst: DIP joint osteoarthritis and osteophyte', { testId: 'xray' }));
    out.push(proc('gan_observe', 'Reassurance and observation (many resolve spontaneously)', 'Asymptomatic, typical ganglion', { patient: L.options.observe }));
    if (!mucous && !c.is('gan_site', 'Volar (palm side) wrist')) out.push(proc('gan_aspirate', 'Aspiration with a wide-bore needle', 'Symptomatic dorsal / seed ganglion; recurrence is common', { patient: L.options.aspiration }));
    if (symptomatic || atypical || mucous) out.push(proc('gan_excise', mucous ? 'Excision of the mucous cyst with DIP joint osteophyte debridement' : 'Excision of the ganglion with its stalk (care with the radial artery in volar wrist ganglia)', 'Symptomatic or recurrent', { procedureReviewModuleId: 'soft_tissue_lesion_excision', patient: L.options.excision }));
    out.push(followUp('gan_review', 'In 3 months, or sooner if it grows', 'Review the lump', 90, { patient: 'A check of the lump' }));
    return out;
  },
};

// ── Hand trauma / fingertip injury ─────────────────────────────────────────
export const HAND_TRAUMA: ConditionTemplate = {
  id: 'hand_trauma', label: 'Hand trauma / fingertip injury', group: 'Hand', prefix: 'ht_',
  synonyms: ['hand injury', 'fingertip injury', 'nail bed injury', 'finger amputation', 'tendon injury', 'crushed finger'],
  complaintIds: ['hand_injury', 'finger_injury'],
  history: {
    id: 'cond_hand_trauma', title: 'Hand injury details',
    questions: [
      sel('ht_mechanism', 'Mechanism', ['Sharp cut (knife / glass)', 'Crush (door, machine)', 'Saw / machine', 'Bite (human / animal)', 'Blast / gunshot', 'Burn', 'Fall', 'Other']),
      sel('ht_hours', 'Hours since injury', ['Under 6', '6–12', '12–24', 'Over 24']),
      multi('ht_digits', 'Digits injured', ['Thumb', 'Index', 'Middle', 'Ring', 'Little', 'Palm', 'Dorsum of hand', 'Wrist']),
      sel('ht_dominance', 'Hand dominance', ['Right', 'Left', 'Ambidextrous']),
      sel('ht_occupation', 'Occupation using fine hand skills', YNU),
      sel('ht_amputated_part', 'Amputated part', ['None', 'Brought, cooled correctly (wrapped, on ice, not in ice)', 'Brought, not cooled', 'Lost']),
      sel('ht_tetanus', 'Tetanus immunisation', ['Up to date (< 10 years)', 'Not up to date', 'Unknown']),
    ],
  },
  exam: {
    id: 'cond_hand_trauma_exam', title: 'Hand injury examination',
    questions: [
      exSel('ht_ex_cascade', 'Finger cascade at rest', ['Normal cascade', 'Digit held extended (flexor tendon injury suspected)']),
      exMulti('ht_ex_tendon', 'Tendon function', ['FDP intact', 'FDP absent', 'FDS intact', 'FDS absent', 'Extensors intact', 'Extensor lag / mallet']),
      exSel('ht_ex_sensation', 'Digital sensation (2-point discrimination)', ['Normal', 'Reduced — digital nerve injury suspected']),
      exSel('ht_ex_perfusion', 'Digit perfusion (colour, capillary refill, turgor)', ['Pink, refill < 2 s', 'Pale / white or refill delayed', 'Congested / blue'], { redFlags: ['Pale / white or refill delayed', 'Congested / blue'] }),
      exSel('ht_ex_allen', 'Fingertip amputation level (Allen)', ['Zone 1 — distal to the bone (pulp only)', 'Zone 2 — exposed distal phalanx, nail bed involved', 'Zone 3 — through the lunula / proximal nail bed', 'Zone 4 — proximal to the nail fold', 'No amputation']),
      exSel('ht_ex_nailbed', 'Nail bed', ['Intact', 'Laceration / subungual haematoma over 50%', 'Nail avulsed']),
      exSel('ht_ex_bone', 'Deformity / bone exposed', ['None', 'Deformity / suspected fracture', 'Bone exposed (open fracture)'], { redFlags: ['Bone exposed (open fracture)'] }),
      exSel('ht_ex_contamination', 'Contamination', ['Clean', 'Soil / farm', 'Bite', 'Heavily contaminated']),
    ],
  },
  classification: { name: 'Allen classification of fingertip injuries; flexor tendon zones (IFSSH, Verdan)', source: 'Allen MJ. Conservative management of finger tip injuries in adults. Hand. 1980;12(3):257-265.' },
  sources: ['Allen MJ. Hand. 1980;12(3):257-265.', 'British Society for Surgery of the Hand (BSSH). Standards of care in hand trauma.', 'WHO. Tetanus vaccines: WHO position paper, 2017.'],
  plan: c => {
    const L = P.conditions.hand_trauma;
    const perf = c.is('ht_ex_perfusion', 'Pale / white or refill delayed', 'Congested / blue');
    const tendon = c.is('ht_ex_tendon', 'FDP absent', 'FDS absent', 'Extensor lag / mallet') || c.is('ht_ex_cascade', 'Digit held extended (flexor tendon injury suspected)');
    const nerve = c.is('ht_ex_sensation', 'Reduced — digital nerve injury suspected');
    const open = c.is('ht_ex_bone', 'Bone exposed (open fracture)');
    const bite = c.is('ht_mechanism', 'Bite (human / animal)') || c.is('ht_ex_contamination', 'Bite');
    const dirty = c.is('ht_ex_contamination', 'Soil / farm', 'Heavily contaminated');
    const tip = !!c.a('ht_ex_allen') && !c.is('ht_ex_allen', 'No amputation', 'Not examined');
    const w = c.facts.weightKg;
    const out: TemplateLine[] = [
      problem('ht', `Hand injury: ${[c.a('ht_mechanism'), list(c.a('ht_digits')).join(', '), tendon && 'tendon injury', nerve && 'digital nerve injury', open && 'open fracture', tip && `fingertip ${String(c.a('ht_ex_allen')).split(' —')[0]}`].filter(Boolean).join(' · ') || 'details not documented'}`, { patient: L.name, urgency: perf ? 'urgent' : 'soon' }),
      inv('ht_xray', 'X-ray of the hand / digit (AP, lateral, oblique)', 'Fracture, foreign body (glass), joint involvement', { testId: 'xray', urgency: 'soon' }),
      ...counselAll('ht', L.counselling),
      monitor('ht_neurovasc', 'Digit perfusion and sensation before and after repair; swelling and splint fit'),
      followUp('ht_wound', '3–5 days after repair', 'Wound check and dressing; start hand therapy as planned', 4, { patient: 'A wound check and the start of hand exercises' }),
      followUp('ht_sutures', 'At 10–14 days', 'Suture removal; therapy progression', 12, { patient: 'Removal of stitches' }),
      refer('ht_therapy', 'Hand therapy: protected mobilisation protocol for tendon / nerve repairs', 'Movement after repair depends on therapy'),
    ];
    if (perf) out.push(proc('ht_revasc', 'Devascularised digit: urgent exploration ± revascularisation / replantation (if part suitable)', 'Pale / congested digit', { urgency: 'urgent', procedureReviewModuleId: 'nerve_repair_hand_trauma' }));
    if (tendon) out.push(proc('ht_tendon', 'Tendon repair in theatre (core suture + epitendinous), within days', 'Tendon function absent', { procedureReviewModuleId: 'tendon_repair', urgency: 'soon', patient: L.options.repair }));
    if (nerve) out.push(proc('ht_nerve', 'Digital nerve exploration and microsurgical repair', 'Reduced sensation in a digital nerve distribution', { procedureReviewModuleId: 'nerve_repair_hand_trauma', urgency: 'soon', patient: L.options.repair }));
    if (tip) out.push(proc('ht_tip', c.is('ht_ex_allen', 'Zone 1 — distal to the bone (pulp only)') ? 'Zone 1 tip: dressings / healing by secondary intention (or composite graft in a child)' : 'Zone 2–4 tip: nail bed repair; local flap (V-Y advancement, cross-finger, thenar, homodigital) or terminalisation; replantation if suitable',
      'Fingertip amputation by Allen zone', { procedureReviewModuleId: 'local_regional_flap', patient: L.options.tip }));
    if (c.is('ht_ex_nailbed', 'Laceration / subungual haematoma over 50%', 'Nail avulsed')) out.push(proc('ht_nailbed', 'Nail bed repair (absorbable 6/0 or tissue glue) with the nail or a splint replaced under the fold', 'Nail bed injury'));
    if (!perf && !tendon && !nerve && !tip && !open) out.push(proc('ht_simple', 'Wound washout and closure under local anaesthetic', 'Simple laceration, structures intact', { patient: L.options.repair }));
    if (open || bite || dirty) {
      const childDose = c.facts.isChild && w ? `per BNFc for ${w} kg` : null;
      out.push({
        id: 'med:ht_antibiotic', section: 'medications', text: open ? 'Antibiotic prophylaxis for open fracture (co-amoxiclav)' : bite ? 'Antibiotic for a bite wound (co-amoxiclav)' : 'Antibiotic for a heavily contaminated wound (co-amoxiclav)',
        why: open ? 'Open fracture of the hand' : bite ? 'Bite wounds carry polymicrobial risk' : 'Soil / heavy contamination',
        medication: { drug: 'Co-amoxiclav (amoxicillin / clavulanic acid)', dose: childDose ?? '625 mg', route: 'oral (IV if admitted)', frequency: 'three times a day', duration: open ? 'until debridement / per open-fracture protocol' : bite ? '5 days' : '5 days', weightBasis: childDose ?? undefined,
          cautions: c.facts.penicillinAllergy ? ['PENICILLIN ALLERGY recorded: do not give co-amoxiclav; use an alternative per local guideline (e.g. clindamycin + ciprofloxacin in adults).'] : [] },
        withheld: c.facts.penicillinAllergy ? 'Penicillin allergy recorded: choose an alternative' : undefined,
        patient: undefined,
      });
    }
    if (!c.is('ht_tetanus', 'Up to date (< 10 years)')) out.push({ id: 'med:ht_tetanus', section: 'medications', text: 'Tetanus toxoid booster (and tetanus immunoglobulin if tetanus-prone and not immunised)', why: 'Tetanus status not up to date / unknown',
      medication: { drug: 'Tetanus toxoid-containing vaccine', dose: '0.5 mL', route: 'IM', frequency: 'single dose', duration: '', cautions: [] } });
    return out;
  },
};

export const HAND_TEMPLATES: ConditionTemplate[] = [SYNDACTYLY, POLYDACTYLY, CONGENITAL_HAND_OTHER, TRIGGER_FINGER, DUPUYTREN, CARPAL_TUNNEL, GANGLION, HAND_TRAUMA];
