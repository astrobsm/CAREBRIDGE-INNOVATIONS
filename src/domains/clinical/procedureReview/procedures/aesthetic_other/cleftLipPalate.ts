/**
 * Cleft lip and / or palate repair — primary lip repair, primary palatoplasty,
 * fistula repair and secondary procedures, in a cleft team.
 *
 * Pre-operative: the cleft, associated anomalies (Pierre Robin sequence,
 * 22q11.2 deletion, Van der Woude, Stickler, cardiac), the airway, feeding
 * and weight gain, timing (the "rule of 10s" for lip repair; unit protocol
 * for the palate), hearing, recent respiratory infection and the MDT.
 * Post-operative: airway, bleeding, feeding and hydration, arm splints, the
 * lip / palate wound. Follow-up: lip and nose, fistula, speech and
 * velopharyngeal function, hearing, dental / orthodontic and alveolar bone
 * grafting, and the family's and child's wellbeing.
 *
 * Weight and haemoglobin are the core's (core.weight_kg, core.hb); the rule
 * of 10s reads them rather than asking again; growth on the chart is the
 * core's paediatric nutrition question (core.paed_growth). Age in weeks is
 * still asked here: the record gives whole months, and the rule of 10s and
 * palate timing are set in weeks.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import type { PlanRule, ProcedureModule } from '../../types';
import { chosen, hasAny, isOneOf, isYes, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'cleft_lip_palate';
const f = (id: string) => `${ID}.${id}`;

const ACPA = 'American Cleft Palate-Craniofacial Association. Parameters for evaluation and treatment of patients with cleft lip/palate or other craniofacial differences (revised 2018). Cleft Palate Craniofac J 2018;55:137-56';
const RULE_OF_10S = 'Wilhelmsen HR, Musgrave RH. Complications of cleft lip surgery. Cleft Palate J 1966;3:223-31 (the "rule of 10s")';
const NG75 = 'NICE NG75 Faltering growth: recognition and management in children (2017)';

// ── Fields carried forward ──────────────────────────────────────────────────

const CLEFT: EncounterField = {
  id: f('cleft'), label: 'Cleft', kind: 'select', important: true,
  options: [
    { value: 'ucl_incomplete', label: 'Unilateral cleft lip — incomplete' },
    { value: 'ucl_complete', label: 'Unilateral cleft lip (± alveolus) — complete' },
    { value: 'bcl', label: 'Bilateral cleft lip (± alveolus)' },
    { value: 'uclp', label: 'Unilateral cleft lip and palate' },
    { value: 'bclp', label: 'Bilateral cleft lip and palate' },
    { value: 'cp', label: 'Cleft palate only (hard and / or soft)' },
    { value: 'smcp', label: 'Submucous cleft palate' },
  ],
};
const SIDE: EncounterField = {
  id: f('side'), label: 'Side', kind: 'select',
  options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'bilateral', label: 'Bilateral' }, { value: 'midline', label: 'Midline (palate)' }],
};
const OPERATION: EncounterField = {
  id: f('operation'), label: 'Operation', kind: 'select', important: true,
  options: [
    { value: 'lip', label: 'Primary lip repair (± primary nose)' },
    { value: 'palate', label: 'Primary palate repair' },
    { value: 'lip_palate', label: 'Lip and palate together' },
    { value: 'fistula', label: 'Palatal fistula repair' },
    { value: 'vpi', label: 'Surgery for velopharyngeal insufficiency' },
    { value: 'lip_revision', label: 'Lip / nose revision' },
    { value: 'abg', label: 'Alveolar bone graft' },
  ],
};
const ASSOCIATED: EncounterField = {
  id: f('associated'), label: 'Associated conditions', kind: 'multiselect', important: true,
  options: [
    { value: 'none', label: 'None known' },
    { value: 'pierre_robin', label: 'Pierre Robin sequence', flag: 'amber', flagReason: 'Pierre Robin sequence: airway obstruction risk before and especially after palate repair — anaesthetic and airway plan.' },
    { value: 'del22q11', label: 'Suspected / confirmed 22q11.2 deletion', flag: 'amber', flagReason: '22q11.2 deletion: cardiac assessment, calcium, immune status; medially displaced carotids matter in pharyngeal surgery.' },
    { value: 'van_der_woude', label: 'Lip pits (Van der Woude)' },
    { value: 'stickler', label: 'Stickler (high myopia / family history of retinal detachment)', flag: 'amber', flagReason: 'Possible Stickler syndrome: ophthalmology review (retinal detachment risk).' },
    { value: 'cardiac', label: 'Congenital heart disease', flag: 'amber', flagReason: 'Congenital heart disease: cardiology / echocardiography and anaesthetic assessment before surgery.' },
    { value: 'other', label: 'Other anomalies / developmental delay' },
  ],
};
const AGE_WEEKS: EncounterField = {
  id: f('age_weeks'), label: 'Age', kind: 'number', unit: 'weeks', min: 0, max: 1100, important: true,
  help: 'The record gives whole months; the rule of 10s and cleft timing are planned in weeks.',
};

const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The cleft',
  intent: 'Recorded once and carried forward; the cleft team decides the protocol.',
  fields: [CLEFT, SIDE, OPERATION, ASSOCIATED, AGE_WEEKS],
};

const palateOp = (a: Record<string, unknown>) => ['palate', 'lip_palate', 'fistula', 'vpi'].includes(String(a[f('operation')]));
const lipOp = (a: Record<string, unknown>) => ['lip', 'lip_palate', 'lip_revision'].includes(String(a[f('operation')]));

// ── Pre-operative ───────────────────────────────────────────────────────────

const READINESS: EncounterSection = {
  id: f('readiness'),
  title: 'Readiness for cleft surgery',
  intent: 'Airway, feeding and growth, timing, ears, intercurrent infection and the cleft team.',
  fields: [
    {
      id: f('airway'), label: 'Airway', kind: 'select', important: true,
      options: [
        { value: 'clear', label: 'No obstructive symptoms' },
        { value: 'obstruction', label: 'Snoring, apnoeas, desaturation or noisy breathing', flag: 'red', flagReason: 'Airway obstruction: sleep study / oximetry, ENT and senior anaesthetic review; palate repair can worsen obstruction.' },
        { value: 'treated', label: 'Previous airway intervention (prone positioning, nasopharyngeal airway, tongue–lip adhesion)' },
      ],
    },
    {
      id: f('feeding'), label: 'Feeding', kind: 'select', important: true,
      options: [
        { value: 'breast', label: 'Breastfeeding effectively' },
        { value: 'squeezy', label: 'Expressed / formula milk by squeezable (cleft) bottle' },
        { value: 'cup_spoon', label: 'Cup / spoon / paladai' },
        { value: 'ng', label: 'Nasogastric tube', flag: 'amber', flagReason: 'Tube-fed: specialist feeding team; assess for an associated syndrome or airway problem.' },
        { value: 'struggling', label: 'Struggling — long feeds, nasal regurgitation, choking', flag: 'amber', flagReason: 'Feeding difficulty: cleft nurse / feeding specialist now; weigh weekly.' },
      ],
    },
    {
      id: f('recent_infection'), label: 'Respiratory infection or fever', kind: 'select',
      options: [
        { value: 'none', label: 'None in the last 2–4 weeks' },
        { value: 'recent', label: 'Recent / current cough, runny nose with fever, chest signs', flag: 'amber', flagReason: 'Recent respiratory infection raises airway complications under anaesthesia in infants: anaesthetist to decide whether to defer.' },
      ],
    },
    {
      id: f('hearing'), label: 'Ears and hearing', kind: 'select',
      options: [
        { value: 'normal', label: 'Screened — normal' },
        { value: 'ome', label: 'Otitis media with effusion / hearing loss', flag: 'amber', flagReason: 'Glue ear is common with cleft palate: ENT / audiology; grommets may be placed at palate repair.' },
        { value: 'not_screened', label: 'Not screened', flag: 'amber', flagReason: 'Hearing assessment for every child with a cleft palate (ACPA 2018).' },
      ],
    },
    {
      id: f('presurgical'), label: 'Presurgical orthopaedics', kind: 'select',
      visibleWhen: lipOp,
      options: [{ value: 'none', label: 'None' }, { value: 'taping', label: 'Lip taping' }, { value: 'nam', label: 'Nasoalveolar moulding (NAM)' }],
    },
    {
      id: f('immunisation'), label: 'Immunisations', kind: 'select',
      options: [
        { value: 'up_to_date', label: 'Up to date for age' },
        { value: 'behind', label: 'Behind schedule', flag: 'amber', flagReason: 'Catch up immunisations (avoid live vaccines within the anaesthetist\'s window before surgery).' },
      ],
    },
    {
      id: f('mdt'), label: 'Seen by the cleft team (surgeon, cleft nurse / feeding, speech therapy, ENT / audiology, orthodontics, paediatrics)', kind: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'partly', label: 'Partly', flag: 'amber', flagReason: 'Complete the cleft-team assessments (ACPA 2018).' },
      ],
    },
    {
      id: f('speech_pre'), label: 'Speech (palate re-operation / VPI)', kind: 'select',
      visibleWhen: a => isOneOf(a, f('operation'), 'vpi', 'fistula'),
      options: [
        { value: 'assessed', label: 'Perceptual speech assessment and nasendoscopy / videofluoroscopy done' },
        { value: 'perceptual_only', label: 'Perceptual assessment only', flag: 'amber', flagReason: 'Instrumental assessment (nasendoscopy or videofluoroscopy) guides the choice of VPI surgery.' },
        { value: 'not_assessed', label: 'Not assessed by a speech therapist', flag: 'amber', flagReason: 'Speech therapy assessment before VPI / fistula surgery.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const POST: EncounterSection = {
  id: f('post'),
  title: 'After cleft repair',
  fields: [
    {
      id: f('airway_post'), label: 'Airway', kind: 'select', important: true,
      options: [
        { value: 'clear', label: 'Clear, settled' },
        { value: 'noisy', label: 'Noisy breathing / snoring / desaturation', flag: 'red', flagReason: 'Airway obstruction after palate repair (tongue swelling, narrowed airway): position, oxygen, nasopharyngeal airway or tongue stitch; senior anaesthetic review now.' },
      ],
    },
    {
      id: f('bleeding'), label: 'Bleeding (mouth / nose / lip)', kind: 'select', important: true,
      options: [
        { value: 'none', label: 'None / minimal ooze' },
        { value: 'ooze', label: 'Persistent ooze', flag: 'amber', flagReason: 'Persistent ooze: keep the child upright and calm; adrenaline-soaked pack to the palate as directed; check Hb.' },
        { value: 'active', label: 'Active bleeding / swallowing blood / vomiting blood', flag: 'red', flagReason: 'Active bleeding after cleft repair: surgeon now; IV access, group and cross-match; return to theatre if it continues.' },
      ],
    },
    {
      id: f('feeding_post'), label: 'Feeding', kind: 'select', important: true,
      options: [
        { value: 'feeding', label: 'Feeding as planned (breast / bottle / cup–spoon)' },
        { value: 'reduced', label: 'Feeding less than half the usual', flag: 'amber', flagReason: 'Poor feeding after repair: analgesia, change method; IV fluids if not keeping up.' },
        { value: 'refusing', label: 'Not feeding', flag: 'amber', flagReason: 'Not feeding: IV fluids, analgesia; examine the repair.' },
      ],
    },
    {
      id: f('hydration'), label: 'Wet nappies / hydration', kind: 'select',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'reduced', label: 'Fewer wet nappies, dry mouth, sunken fontanelle', flag: 'amber', flagReason: 'Dehydration in an infant: IV fluids and fluid balance.' },
      ],
    },
    {
      id: f('arm_splints'), label: 'Arm (elbow) splints', kind: 'select',
      options: [
        { value: 'in_place', label: 'In place, skin fine' },
        { value: 'problem', label: 'Rubbing / too tight', flag: 'amber', flagReason: 'Splints rubbing: pad or refit; check the skin and circulation.' },
        { value: 'not_used', label: 'Not used (unit practice)' },
      ],
    },
    {
      id: f('lip_wound'), label: 'Lip / nose wound', kind: 'select',
      visibleWhen: lipOp,
      options: [
        { value: 'clean', label: 'Clean, intact' },
        { value: 'crusting', label: 'Crusting' },
        { value: 'dehisced', label: 'Separated', flag: 'red', flagReason: 'Lip dehiscence: surgeon review — usually re-repair once inflammation settles.' },
        { value: 'infected', label: 'Red, swollen, discharging', flag: 'amber', flagReason: 'Lip wound infection: swab, antibiotics, keep clean.' },
      ],
    },
    {
      id: f('palate_wound'), label: 'Palate repair', kind: 'select',
      visibleWhen: palateOp,
      options: [
        { value: 'intact', label: 'Intact' },
        { value: 'gap', label: 'Gap / breakdown visible', flag: 'amber', flagReason: 'Palatal breakdown: record size and site; most fistulae are repaired later, not now.' },
      ],
    },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const FU: EncounterSection = {
  id: f('fu'),
  title: 'Lip, nose, palate, speech, hearing and teeth',
  fields: [
    {
      id: f('lip_result'), label: 'Lip and nose', kind: 'multiselect',
      visibleWhen: a => !isOneOf(a, f('cleft'), 'cp', 'smcp'),
      options: [
        { value: 'good', label: 'Good result' },
        { value: 'scar', label: 'Hypertrophic / wide scar' },
        { value: 'notch', label: 'Vermilion notch / whistle deformity' },
        { value: 'mismatch', label: 'Cupid\'s bow / white-roll mismatch' },
        { value: 'short_lip', label: 'Short lip' },
        { value: 'nasal', label: 'Nasal asymmetry / alar collapse' },
      ],
    },
    {
      id: f('fistula'), label: 'Palatal fistula', kind: 'select',
      visibleWhen: a => !isOneOf(a, f('cleft'), 'ucl_incomplete', 'ucl_complete', 'bcl'),
      options: [
        { value: 'none', label: 'None' },
        { value: 'asymptomatic', label: 'Present, no symptoms' },
        { value: 'symptomatic', label: 'Nasal regurgitation of food / fluid, or affects speech', flag: 'amber', flagReason: 'Symptomatic fistula: plan repair with the cleft team (timing with orthodontics / bone grafting).' },
      ],
    },
    {
      id: f('speech'), label: 'Speech', kind: 'select',
      visibleWhen: a => !isOneOf(a, f('cleft'), 'ucl_incomplete', 'ucl_complete', 'bcl'),
      options: [
        { value: 'not_due', label: 'Too young to assess' },
        { value: 'normal', label: 'Assessed — within normal limits' },
        { value: 'articulation', label: 'Cleft-type articulation errors' , flag: 'amber', flagReason: 'Cleft-type articulation: speech therapy.' },
        { value: 'vpi', label: 'Hypernasality / nasal emission (possible VPI)', flag: 'amber', flagReason: 'Possible velopharyngeal insufficiency: speech therapy assessment with nasendoscopy / videofluoroscopy; consider VPI surgery.' },
      ],
    },
    {
      id: f('hearing_fu'), label: 'Hearing', kind: 'select',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'ome', label: 'Glue ear / hearing loss', flag: 'amber', flagReason: 'Hearing loss affects speech and school: ENT / audiology (grommets or hearing aids).' },
        { value: 'not_tested', label: 'Not tested since the last review', flag: 'amber', flagReason: 'Regular hearing checks through childhood for children with cleft palate (ACPA 2018).' },
      ],
    },
    {
      id: f('dental'), label: 'Teeth and jaws', kind: 'multiselect',
      options: [
        { value: 'ok', label: 'No concerns' },
        { value: 'caries', label: 'Dental caries' },
        { value: 'crossbite', label: 'Crossbite / malocclusion' },
        { value: 'midface', label: 'Midface retrusion' },
        { value: 'abg_due', label: 'Alveolar cleft — bone graft planning due' },
      ],
    },
    {
      id: f('wellbeing'), label: 'Child / family wellbeing', kind: 'select',
      help: 'Feeding stress and stigma for parents; teasing and school for the child.',
      options: [
        { value: 'ok', label: 'Coping well' },
        { value: 'concerns', label: 'Concerns (stigma, teasing, school, parental distress)', flag: 'amber', flagReason: 'Psychosocial concern: cleft-team psychology / social work and parent-support group.' },
      ],
    },
  ],
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => ({
  problem: {
    goals: [
      L('Safe repair at the age the cleft team protocol sets, in a thriving child', `Timing and safety (${ACPA.split('.')[0]} 2018)`),
      lipOp(ctx.answers) || !palateOp(ctx.answers)
        ? L('A symmetrical lip and nose with a well-aligned muscle and fine scar', 'Purpose of lip repair')
        : L('An intact palate with a functioning velum for normal speech and no fistula', 'Purpose of palate repair'),
      L('Coordinated cleft-team care through to adulthood: speech, hearing, teeth, growth and wellbeing', 'Cleft care is long term (ACPA 2018)'),
    ],
  },
});

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const weeks = numOf(a, f('age_weeks'));
  const kg = numOf(a, 'core.weight_kg');
  const hb = numOf(a, 'core.hb');
  const assoc = chosen(a, f('associated'));
  const primaryLip = isOneOf(a, f('operation'), 'lip', 'lip_palate');
  const unmet: string[] = [];
  if (primaryLip) {
    if (weeks != null && weeks < 10) unmet.push(`age ${weeks} weeks (under 10)`);
    if (kg != null && kg < 4.5) unmet.push(`weight ${kg} kg (under 4.5 kg / 10 lb)`);
    if (hb != null && hb < 10) unmet.push(`Hb ${hb} g/dL (under 10)`);
  }
  return merge(
    primaryLip && unmet.length > 0 && { problem: { treatment: [L(
      `Rule of 10s not met (${unmet.join(', ')}): defer lip repair until it is, unless the cleft team decides otherwise`,
      `Lip repair safety criteria (${RULE_OF_10S.split('.')[0]})`, 'urgent')] } },
    primaryLip && (weeks == null || kg == null || hb == null) && { problem: { investigations: [L('Record age in weeks, weight and haemoglobin to check the rule of 10s (10 weeks, 10 lb / 4.5 kg, Hb 10 g/dL)', `Lip repair safety criteria (${RULE_OF_10S.split('.')[0]})`)] } },
    isOneOf(a, f('operation'), 'palate') && weeks != null && (weeks < 26 || weeks > 78) && { problem: { treatment: [L(
      weeks < 26 ? 'Palate repair is usually done between about 6 and 12 months (unit protocol): confirm the planned date with the cleft team'
        : 'Palate repair after 18 months: speech outcome is better with earlier repair — expedite and involve speech therapy early',
      `Age ${weeks} weeks (${ACPA.split('.')[0]} 2018; unit protocol)`)] } },
    isOneOf(a, f('airway'), 'obstruction') || assoc.includes('pierre_robin')
      ? { problem: {
          investigations: [L('Overnight oximetry or sleep study before palate repair', 'Airway obstruction / Pierre Robin sequence')],
          referrals: [L('ENT and senior paediatric anaesthetist: airway plan, post-operative monitoring in HDU, nasopharyngeal airway available', 'Airway risk after palate repair', 'urgent')],
        } }
      : null,
    (assoc.includes('cardiac') || assoc.includes('del22q11')) && { problem: { investigations: [L('Echocardiogram and cardiology opinion before anaesthesia; calcium and FBC if 22q11.2 deletion suspected (and genetic testing where available)', 'Cardiac anomaly / suspected 22q11.2 deletion')] } },
    assoc.includes('stickler') && { problem: { referrals: [L('Ophthalmology for retinal assessment', 'Possible Stickler syndrome')] } },
    assoc.some(x => ['pierre_robin', 'del22q11', 'van_der_woude', 'stickler', 'other'].includes(x)) && { problem: { referrals: [L('Clinical genetics / paediatrics for syndrome assessment and family counselling', 'Associated anomaly')] } },
    isOneOf(a, f('feeding'), 'struggling', 'ng') || isOneOf(a, 'core.paed_growth', 'faltering', 'below_2nd')
      ? { general: [G('Nutrition', L('Cleft feeding support: squeezable bottle or cup / spoon technique taught with the cleft nurse, feeding plan and weekly weights until back on the centile', `${isOneOf(a, 'core.paed_growth', 'faltering', 'below_2nd') ? 'Faltering growth (NICE NG75)' : 'Feeding difficulty'}`))] }
      : null,
    isOneOf(a, f('recent_infection'), 'recent') && { general: [G('Anaesthesia and theatre', L('Anaesthetist to decide on deferral: a respiratory infection in the last 2–4 weeks raises airway complications in infants', 'Recent respiratory infection'))] },
    isOneOf(a, f('hearing'), 'ome', 'not_screened') && palateOp(a) && { problem: { referrals: [L('ENT / audiology: hearing assessment and whether to insert grommets at the palate repair', 'Hearing not screened / glue ear')] } },
    isOneOf(a, f('hearing'), 'not_screened') && !palateOp(a) && { problem: { referrals: [L('Hearing screening (audiology)', 'Every child with a cleft (ACPA 2018)')] } },
    isOneOf(a, f('mdt'), 'partly') && { problem: { referrals: [L('Complete the cleft-team assessments: cleft nurse / feeding, speech and language therapy, ENT / audiology, orthodontics, paediatrics, psychology', 'Cleft-team care (ACPA 2018)')] } },
    isOneOf(a, f('speech_pre'), 'perceptual_only', 'not_assessed') && { problem: { investigations: [L('Speech therapy assessment with nasendoscopy or videofluoroscopy before VPI / fistula surgery', 'Instrumental assessment guides the operation')] } },
    { general: [G('Patient education', L('Teach the parents post-operative feeding (method the unit uses), arm-splint care, wound cleaning and the warning signs before admission', 'Parents are the carers after discharge'))] },
    { counselling: [
      P('Cleft repair', 'What the operation does and does not do; further operations and therapy through childhood (speech, ears, teeth, bone graft, revisions); support groups.', 'Cleft consent (ACPA 2018)'),
      P('Cause and future children', 'Most clefts have no single cause; the chance in future children and in the child\'s own children; genetics referral if a syndrome is suspected.', 'Parents commonly ask; guilt and stigma are common'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('airway_post'), 'noisy') && { problem: { treatment: [L('Airway obstruction after repair: position (side / prone), oxygen, suction gently away from the repair, nasopharyngeal airway or tongue stitch traction; senior anaesthetic review now', 'Noisy breathing / desaturation after cleft repair', 'urgent')] } },
    palateOp(a) && { problem: { monitoring: [L('Continuous pulse oximetry for the first night after palate repair', 'Airway swelling peaks in the first 24 hours')] } },
    isOneOf(a, f('bleeding'), 'active') && { problem: { treatment: [L('Active bleeding: surgeon now; IV access, Hb, group and cross-match; pack (adrenaline) and return to theatre if it continues', 'Active bleeding after cleft repair', 'urgent')] } },
    isOneOf(a, f('bleeding'), 'ooze') && { problem: { monitoring: [L('Keep upright and calm, observe the ooze, check Hb', 'Persistent ooze')] } },
    isOneOf(a, f('feeding_post'), 'reduced', 'refusing') || isOneOf(a, f('hydration'), 'reduced')
      ? { problem: { treatment: [L('IV maintenance fluids until feeding is adequate; regular paracetamol (± ibuprofen if the surgeon allows) before feeds; try the alternative feeding method', 'Poor feeding / dehydration after repair')] } }
      : null,
    { general: [G('Nutrition', L('Resume milk feeds as soon as awake (breast or bottle unless the unit protocol says cup / spoon); clear water after feeds to rinse the repair; soft diet for older children', 'Early feeding after cleft repair (unit protocol)'))] },
    isOneOf(a, f('arm_splints'), 'problem') && { general: [G('Pressure care', L('Pad or refit the arm splints; check skin and circulation each shift', 'Arm splints rubbing'))] },
    isOneOf(a, f('arm_splints'), 'in_place') && { general: [G('Patient education', L('Arm splints for the period the surgeon sets (often 2–3 weeks), removed one at a time several times a day for movement and skin care under supervision', 'Prevent fingers and objects reaching the repair (unit protocol)'))] },
    lipOp(a) && { general: [G('Wound care and dressings', L('Clean the lip with cooled boiled water or saline to keep crusts off; a thin layer of the prescribed ointment; nasal conformer care if used', 'Lip wound care'))] },
    isOneOf(a, f('lip_wound'), 'dehisced') && { problem: { treatment: [L('Lip dehiscence: clean and protect; plan re-repair once inflammation settles', 'Lip wound separated', 'urgent')] } },
    isOneOf(a, f('lip_wound'), 'infected') && { problem: { treatment: [L('Swab and start antibiotics; keep the wound clean', 'Lip wound infection')] } },
    isOneOf(a, f('palate_wound'), 'gap') && { problem: { monitoring: [L('Record the breakdown (site, size); soft diet and rinses; review fistula need at follow-up', 'Palatal breakdown')] } },
    { dischargeCriteria: [
      'Airway clear without oxygen',
      'Feeding enough to stay hydrated without IV fluids',
      'Bleeding settled',
      'Parents confident with feeding, wound and splint care and the warning signs',
    ] },
    { general: [G('Red flags — return immediately if', L('Noisy breathing, pauses in breathing or blue colour; bleeding from the mouth or nose; not feeding or fewer wet nappies', 'Cleft-repair safety-netting'))] },
  );
};

const followUp: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const lip = chosen(a, f('lip_result'));
  const age = ctx.patient.ageYears;
  const dental = chosen(a, f('dental'));
  return merge(
    lip.includes('scar') && { problem: { treatment: [L('Lip scar: massage, silicone, sun protection; review maturation before considering revision', 'Hypertrophic / wide lip scar')] } },
    lip.some(x => ['notch', 'mismatch', 'short_lip', 'nasal'].includes(x)) && { problem: { treatment: [L('Discuss lip / nose revision with the family at an age agreed with the cleft team (nasal definitive surgery usually after growth)', `Lip / nose: ${lip.filter(x => x !== 'good' && x !== 'scar').join(', ')}`)] } },
    isOneOf(a, f('fistula'), 'symptomatic') && { problem: { treatment: [L('Plan fistula repair with the cleft team, timed with orthodontics / alveolar bone grafting where it lies in the alveolus', 'Symptomatic palatal fistula')] } },
    isOneOf(a, f('speech'), 'vpi') && { problem: { investigations: [L('Speech therapy assessment with nasendoscopy / videofluoroscopy; plan VPI surgery if structural', 'Possible velopharyngeal insufficiency')] } },
    isOneOf(a, f('speech'), 'articulation') && { problem: { referrals: [L('Speech and language therapy (cleft-specialist where available; remote / tele-therapy otherwise)', 'Cleft-type articulation errors')] } },
    isOneOf(a, f('speech'), 'not_due') && { problem: { monitoring: [L('Speech assessment by a speech therapist around age 3 and again before school (unit protocol)', 'Routine cleft speech surveillance (ACPA 2018)')] } },
    isOneOf(a, f('hearing_fu'), 'ome', 'not_tested') && { problem: { referrals: [L('ENT / audiology review', `Hearing: ${String(a[f('hearing_fu')]).replace(/_/g, ' ')}`)] } },
    (dental.includes('abg_due') || (age != null && age >= 7 && age <= 11 && !isOneOf(a, f('cleft'), 'cp', 'smcp', 'ucl_incomplete'))) && { problem: { referrals: [L('Orthodontics: plan alveolar bone grafting in the mixed dentition, before the permanent canine erupts (commonly 8–11 years)', 'Alveolar cleft (ACPA 2018)')] } },
    dental.includes('caries') && { general: [G('Patient education', L('Dental care: brushing twice daily with fluoride toothpaste, dental review; teeth near the cleft are at higher risk', 'Dental caries'))] },
    (dental.includes('crossbite') || dental.includes('midface')) && { problem: { referrals: [L('Orthodontic assessment; orthognathic surgery discussion after growth if midface retrusion is significant', 'Malocclusion / midface retrusion')] } },
    isOneOf(a, f('wellbeing'), 'concerns') && { general: [G('Psychology and wellbeing', L('Cleft-team psychology or social work; parent-support group; liaise with the school about teasing', 'Child / family psychosocial concern'))] },
    { general: [G('Patient education', L('Weigh and plot growth at every visit; keep the cleft-team review schedule even when all seems well', 'Cleft care is long term (ACPA 2018)'))] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const cleftLipPalate: ProcedureModule = {
  id: ID,
  name: 'Cleft lip and palate repair',
  summary: 'Primary and secondary cleft lip and palate surgery: associated anomalies, airway, feeding and growth, rule of 10s and palate timing, hearing, speech, teeth and the cleft team.',
  group: 'other',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Cleft lip and / or palate',
  basis: [
    ACPA,
    RULE_OF_10S,
    NG75,
    'WHO Child Growth Standards (2006)',
    'Smile Train Safety and Quality Protocol (partner hospitals)',
    'WHO Surgical Safety Checklist; APAGBI guidance for paediatric anaesthesia',
  ],
  catalog: {
    feeIds: ['major-006', 'major-007'],
    educationId: 'CONGEN-001',
    patientEducationIds: ['cleft-lip-palate'],
  },
  sections: {
    pre_op: [DETAILS, READINESS],
    post_op: [DETAILS, POST],
    follow_up: [DETAILS, FU],
  },
  paediatric: true,
  carryForward: [f('cleft'), f('side'), f('operation'), f('associated')],
  planRules: [goals, preOp, postOp, followUp],
  consent: {
    procedureName: 'Cleft lip and / or palate repair',
    phases: ['pre_op'],
    intendedBenefits: [
      'Close the cleft and restore the shape of the lip and nose (lip repair)',
      'Close the palate and rebuild the soft-palate muscles for feeding and speech (palate repair)',
      'Help the child feed, speak and grow normally',
    ],
    risks: [
      { name: 'Bleeding', description: 'From the lip, nose or palate, rarely needing a return to theatre or transfusion' },
      { name: 'Breathing problems after palate repair', description: 'Swelling can narrow the airway in the first day or two; the child is monitored closely' },
      { name: 'Wound breakdown', description: 'The lip or palate may separate and need repair later' },
      { name: 'Nasal-sounding speech (velopharyngeal insufficiency)', description: 'Some children need speech therapy and sometimes another operation for speech' },
      { name: 'Feeding difficulty for a few days', description: 'Feeding may be slow at first; a drip may be needed' },
      { name: 'Effect on facial growth', description: 'Palate repair can affect growth of the upper jaw; some children need orthodontics or jaw surgery later' },
      { name: 'Thick scar', description: 'The lip scar may thicken before it settles' },
    ],
    alternatives: [
      'Delaying the repair (the cleft does not close on its own; delay affects feeding, speech and appearance)',
      'A staged approach (lip adhesion, or lip and palate at separate operations)',
      'Feeding plates / obturators where surgery is not possible',
      'No surgery',
    ],
    riskOfNotTreating: 'An unrepaired cleft lip leaves a visible difference that can lead to stigma; an unrepaired palate causes feeding problems, nasal regurgitation, ear problems and speech that is hard to understand, which become harder to correct the later the repair.',
    anaesthesiaOptions: ['general'],
    additionalProcedures: [
      'Primary nasal reshaping with the lip repair',
      'Grommets (ear tubes) at palate repair',
      'Later operations: fistula repair, speech surgery, alveolar bone graft, lip / nose revision',
    ],
    photography: true,
    bloodProducts: 'possible',
    specimen: false,
    counsellingTopics: [
      'Feeding after surgery and the method the unit uses',
      'Arm splints, wound care and the warning signs at home',
      'Long-term cleft-team care: speech, hearing, teeth, bone graft, revisions',
      'Cause, recurrence in future children, and support groups',
      'Consent from a parent or guardian',
    ],
    modifiers: [
      { id: 'clp_robin', when: c => hasAny(c.answers, f('associated'), 'pierre_robin') || isOneOf(c.answers, f('airway'), 'obstruction'),
        text: 'Because your child already has a narrow airway, breathing problems after the palate repair are more likely; they will be monitored in a high-dependency area.',
        why: 'Pierre Robin sequence / airway obstruction' },
      { id: 'clp_syndrome', when: c => hasAny(c.answers, f('associated'), 'del22q11', 'cardiac', 'other'),
        text: 'Because of your child\'s other condition, the anaesthetic carries more risk and speech problems after palate repair are more likely.',
        why: 'Associated syndrome / cardiac anomaly' },
      { id: 'clp_late_palate', when: c => isOneOf(c.answers, f('operation'), 'palate') && (numOf(c.answers, f('age_weeks')) ?? 0) > 78,
        text: 'Because the palate is being repaired later than usual, speech therapy is more likely to be needed afterwards.',
        why: 'Palate repair after 18 months' },
      { id: 'clp_wide', when: c => isOneOf(c.answers, f('cleft'), 'bclp', 'uclp'),
        text: 'With a complete cleft of the lip and palate, a small hole (fistula) in the palate and later revision are more likely.',
        why: 'Complete cleft lip and palate' },
      { id: 'clp_infection', when: c => isOneOf(c.answers, f('recent_infection'), 'recent') || isYes(c.answers, 'core.active_infection_elsewhere'),
        text: 'A recent chest or nose infection increases breathing problems during and after the anaesthetic; the operation may be postponed.',
        why: 'Recent respiratory infection' },
    ],
  },
  followUp: {
    pre_op: [{ when: 'Admission', purpose: 'Rule of 10s / fitness check on the day; feeding plan taught' }],
    post_op: [
      { when: 'Day 5–7', purpose: 'Lip wound check; sutures (non-absorbable) out' },
      { when: '2–3 weeks', purpose: 'Splints off; feeding and weight' },
      { when: '6 weeks', purpose: 'Repair healed; next stage planned with the cleft team' },
    ],
    follow_up: [
      { when: 'Every 6–12 months (cleft team)', purpose: 'Growth, hearing, speech, teeth, wellbeing' },
      { when: 'Age about 3 and 5 years', purpose: 'Speech assessments (unit protocol)' },
      { when: 'Age 8–11 years', purpose: 'Alveolar bone graft planning with orthodontics' },
    ],
  },
  handoffs: [
    { label: 'Growth charts', route: '/growth', phases: ['pre_op', 'post_op', 'follow_up'], when: 'Plot weight on the WHO chart' },
    { label: 'Nutrition', route: '/nutrition', phases: ['pre_op', 'post_op'], when: 'Faltering growth or feeding difficulty' },
    { label: 'MDT (cleft team)', route: '/mdt', phases: ['pre_op', 'follow_up'], when: 'Cleft-team planning' },
    { label: 'Scar Monitor', route: '/scar-monitor', phases: ['follow_up'], when: 'Lip scar' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate / sponsorship (e.g. Smile Train partner)' },
  ],
};
