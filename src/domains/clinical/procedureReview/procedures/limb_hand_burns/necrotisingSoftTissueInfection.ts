/**
 * Necrotising soft-tissue infection (necrotising fasciitis, Fournier's
 * gangrene, gas gangrene): emergency debridement, re-look, and staged
 * reconstruction.
 *
 * It is a clinical diagnosis and a surgical emergency. LRINEC is computed by
 * the soft-tissue-infection domain's calculateLRINEC from the CRP, WBC,
 * sodium and creatinine asked here and the haemoglobin and glucose the core
 * already asks — and is labelled for what it is: a pooled sensitivity of
 * about 68% at 6 or more (Fernando 2019), so a low score never delays
 * exploration when the hard signs are present.
 *
 * Pre-operative: site, hard signs, the sepsis bundle (Surviving Sepsis
 * Campaign 2021 hour-1), organ dysfunction and ICU criteria, antibiotics
 * against the local antibiogram, special sites (perineum, head and neck).
 * Post-operative: extent and completeness of debridement, specimens, re-look
 * every 24–36 hours (IDSA 2014), physiological trend, antibiotic
 * rationalisation, nutrition. Follow-up: reconstruction staging and function.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import { SYSTEMIC_FIELD } from '../../../data/encounterModel';
import { calculateLRINEC } from '../../../../soft-tissue-infection/services/scoringService';
import type { PlanContribution, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { answered, chosen, hasAny, isOneOf, namespaced, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'necrotising_soft_tissue_infection';
const f = (id: string) => `${ID}.${id}`;

// ── The infection (carried forward) ─────────────────────────────────────────

const SITE: EncounterField = {
  id: f('site'), label: 'Site', kind: 'select', important: true,
  options: [
    { value: 'lower_limb', label: 'Lower limb' },
    { value: 'upper_limb', label: 'Upper limb' },
    { value: 'perineum', label: 'Perineum / genitalia (Fournier\'s gangrene)' },
    { value: 'trunk', label: 'Trunk / abdominal wall' },
    { value: 'head_neck', label: 'Head and neck (cervical necrotising fasciitis)', flag: 'red', flagReason: 'Cervical necrotising infection threatens the airway and can spread to the mediastinum: senior anaesthetist and CT neck / chest.' },
    { value: 'breast', label: 'Breast' },
    { value: 'post_operative', label: 'Post-operative wound' },
  ],
};
const SOURCE: EncounterField = {
  id: f('source'), label: 'Likely source / predisposition', kind: 'multiselect',
  options: [
    { value: 'minor_trauma', label: 'Minor trauma, insect bite or injection' },
    { value: 'surgery', label: 'Recent surgery' },
    { value: 'perianal_urogenital', label: 'Perianal abscess / urethral or urogenital source' },
    { value: 'scarification', label: 'Traditional scarification / incisions or herbal applications' },
    { value: 'ivdu', label: 'Injecting drug use' },
    { value: 'varicella', label: 'Chickenpox (child)' },
    { value: 'nsaid', label: 'NSAID use masking symptoms' },
    { value: 'unknown', label: 'Unknown' },
  ],
};
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The infection',
  intent: 'Recorded once and carried forward.',
  fields: [SITE, SOURCE, { id: f('onset_date'), label: 'Date symptoms began', kind: 'date' }],
};

// ── Pre-operative ───────────────────────────────────────────────────────────

const DIAGNOSIS: EncounterSection = {
  id: f('diagnosis'),
  title: 'Diagnosis — hard signs first',
  intent: 'A clinical diagnosis. Hard signs mean theatre now, whatever the LRINEC or the imaging.',
  fields: [
    {
      id: f('hard_signs'), label: 'Hard signs', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'bullae', label: 'Haemorrhagic bullae', flag: 'red', flagReason: 'Haemorrhagic bullae: a hard sign of necrotising infection — emergency exploration.' },
        { value: 'necrosis', label: 'Skin necrosis / ecchymosis', flag: 'red', flagReason: 'Skin necrosis: a hard sign of necrotising infection — emergency exploration.' },
        { value: 'crepitus', label: 'Crepitus / gas on imaging', flag: 'red', flagReason: 'Gas in the soft tissues: emergency exploration (gas gangrene / polymicrobial NSTI).' },
        { value: 'anaesthesia', label: 'Skin anaesthesia over the area', flag: 'red', flagReason: 'Cutaneous anaesthesia: nerves destroyed in the fascial plane — emergency exploration.' },
        { value: 'rapid_spread', label: 'Rapid spread despite IV antibiotics', flag: 'red', flagReason: 'Spreading despite antibiotics: emergency exploration.' },
      ],
    },
    {
      id: f('soft_signs'), label: 'Early / soft signs', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'pain_disproportionate', label: 'Pain out of proportion to the skin findings', flag: 'amber', flagReason: 'Pain out of proportion: the earliest sign of necrotising infection — senior surgical review now.' },
        { value: 'oedema_beyond', label: 'Oedema / tenderness beyond the erythema' },
        { value: 'woody', label: 'Woody induration' },
        { value: 'dishwater', label: 'Thin "dishwater" discharge' },
      ],
    },
    namespaced(ID, SYSTEMIC_FIELD),
    {
      id: f('haemodynamics'), label: 'Circulation', kind: 'select', important: true,
      options: [
        { value: 'stable', label: 'Normotensive' },
        { value: 'fluid_responsive', label: 'Hypotension responding to fluids', flag: 'red', flagReason: 'Sepsis-induced hypotension: 30 mL/kg crystalloid, lactate, critical care review (Surviving Sepsis Campaign 2021).' },
        { value: 'shock', label: 'Septic shock — vasopressors needed for MAP 65 mmHg or more', flag: 'red', flagReason: 'Septic shock: ICU, vasopressors, and source control in theatre without delay.' },
      ],
    },
    {
      id: f('lactate'), label: 'Lactate', kind: 'number', unit: 'mmol/L', min: 0, max: 30,
      numericFlags: [
        { op: '>=', value: 4, level: 'red', reason: 'Lactate 4 mmol/L or more: 30 mL/kg crystalloid and critical care (Surviving Sepsis Campaign 2021).' },
        { op: '>=', value: 2, level: 'amber', reason: 'Lactate 2 mmol/L or more: hypoperfusion — remeasure within 2–4 hours (Surviving Sepsis Campaign 2021).' },
      ],
    },
    {
      id: f('organ_dysfunction'), label: 'Organ dysfunction', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'aki', label: 'Acute kidney injury / oliguria', flag: 'amber', flagReason: 'AKI: fluid resuscitation, renal dosing, avoid nephrotoxins.' },
        { value: 'confusion', label: 'New confusion' },
        { value: 'respiratory', label: 'Respiratory failure / rising oxygen need', flag: 'red', flagReason: 'Respiratory failure: critical care.' },
        { value: 'coagulopathy', label: 'Coagulopathy / thrombocytopenia', flag: 'amber', flagReason: 'Coagulopathy: correct for theatre; consider streptococcal toxic shock.' },
        { value: 'jaundice', label: 'Jaundice' },
      ],
    },
    { id: f('crp'), label: 'CRP', kind: 'number', unit: 'mg/L', min: 0, max: 600, important: true },
    { id: f('wbc'), label: 'White cell count', kind: 'number', unit: 'x10^9/L', min: 0, max: 100, important: true },
    { id: f('sodium'), label: 'Sodium', kind: 'number', unit: 'mmol/L', min: 100, max: 180, important: true },
    { id: f('creatinine'), label: 'Creatinine', kind: 'number', unit: 'umol/L', min: 10, max: 2000, important: true },
    {
      id: f('imaging'), label: 'Imaging', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done — not needed for a clinical diagnosis' },
        { value: 'gas', label: 'Gas in the soft tissues', flag: 'red', flagReason: 'Soft-tissue gas: emergency exploration.' },
        { value: 'fascial_fluid', label: 'Fascial thickening / fluid (US, CT or MRI)' },
        { value: 'normal', label: 'No necrotising features (does not exclude)' },
      ],
    },
    {
      id: f('antibiogram'), label: 'Local antibiogram', kind: 'select',
      options: [
        { value: 'available', label: 'Available and consulted' },
        { value: 'not_available', label: 'Not available — use the hospital / national empirical guidance' },
      ],
    },
    {
      id: f('decision_time'), label: 'Time of decision to operate', kind: 'text', placeholder: 'e.g. 14:20',
      help: 'Recorded so delay to theatre is visible.',
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const OPERATIVE: EncounterSection = {
  id: f('operative'),
  title: 'After debridement',
  fields: [
    { id: f('debridement_no'), label: 'Debridement number', kind: 'number', min: 1, max: 30, important: true },
    {
      id: f('findings'), label: 'Findings', kind: 'multiselect',
      options: [
        { value: 'fascial_necrosis', label: 'Grey, non-bleeding fascia; finger test positive' },
        { value: 'muscle_necrosis', label: 'Muscle necrosis (myonecrosis)' },
        { value: 'dishwater', label: 'Dishwater fluid' },
        { value: 'no_nsti', label: 'No necrotising infection found (cellulitis / abscess only)' },
      ],
    },
    { id: f('extent'), label: 'Area debrided', kind: 'number', unit: '%TBSA', min: 0, max: 100 },
    {
      id: f('completeness'), label: 'Debridement', kind: 'select', important: true,
      options: [
        { value: 'complete', label: 'To healthy, bleeding tissue at all margins' },
        { value: 'incomplete', label: 'Incomplete (instability, extent)', flag: 'red', flagReason: 'Incomplete debridement: back to theatre as soon as the patient can tolerate it.' },
        { value: 'progressing', label: 'Necrosis progressing since the last operation', flag: 'red', flagReason: 'Progressing necrosis: return to theatre now.' },
      ],
    },
    {
      id: f('specimens'), label: 'Specimens', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None', flag: 'amber', flagReason: 'No deep tissue sent: antibiotics cannot be rationalised.' },
        { value: 'tissue_culture', label: 'Deep tissue for Gram stain and culture' },
        { value: 'histology', label: 'Tissue for histology' },
        { value: 'blood_culture', label: 'Blood cultures' },
      ],
    },
    { id: f('organism'), label: 'Organism(s) / Gram stain', kind: 'text' },
    {
      id: f('organism_type'), label: 'Type', kind: 'select',
      options: [
        { value: 'unknown', label: 'Not yet known' },
        { value: 'type1', label: 'Type I — polymicrobial' },
        { value: 'type2', label: 'Type II — group A Streptococcus (± S. aureus)' },
        { value: 'clostridial', label: 'Clostridial (gas gangrene)' },
        { value: 'vibrio_other', label: 'Vibrio / Aeromonas / fungal / other' },
      ],
    },
    {
      id: f('trend'), label: 'Since the last operation', kind: 'select', important: true,
      options: [
        { value: 'improving', label: 'Improving: vasopressors weaning, lactate falling, afebrile' },
        { value: 'static', label: 'No better' },
        { value: 'worse', label: 'Worse', flag: 'red', flagReason: 'Deteriorating after debridement: residual necrosis until proven otherwise — return to theatre.' },
      ],
    },
    {
      id: f('relook_booked'), label: 'Re-look booked', kind: 'select', important: true,
      options: [
        { value: 'booked_24_36h', label: 'Booked within 24–36 hours' },
        { value: 'not_needed', label: 'Not needed — no further necrosis at the last look' },
        { value: 'not_booked', label: 'Not booked', flag: 'amber', flagReason: 'Re-look within 24–36 hours of every debridement until no further necrosis (IDSA 2014).' },
      ],
    },
    {
      id: f('icu'), label: 'Level of care', kind: 'select',
      options: [{ value: 'icu', label: 'ICU' }, { value: 'hdu', label: 'HDU' }, { value: 'ward', label: 'Ward' }],
    },
    { id: f('diversion'), label: 'Faecal diversion / urinary catheter or suprapubic (perineal)', kind: 'multiselect',
      showWhen: { field: f('site'), equals: ['perineum'] },
      options: [
        { value: 'none', label: 'Not needed' },
        { value: 'catheter', label: 'Urinary catheter' },
        { value: 'suprapubic', label: 'Suprapubic catheter' },
        { value: 'colostomy', label: 'Diverting colostomy' },
        { value: 'faecal_device', label: 'Faecal management system' },
      ] },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const RECON: EncounterSection = {
  id: f('recon'),
  title: 'Wound and reconstruction',
  fields: [
    {
      id: f('wound_stage'), label: 'Wound', kind: 'select', important: true,
      options: [
        { value: 'granulating', label: 'Clean, granulating — ready for cover' },
        { value: 'preparing', label: 'Bed preparation (dressings / NPWT)' },
        { value: 'covered', label: 'Covered (graft / flap / closure)' },
        { value: 'healed', label: 'Healed' },
        { value: 'infected', label: 'Recurrent infection / necrosis', flag: 'red', flagReason: 'Recurrent necrosis or infection: urgent surgical review.' },
      ],
    },
    {
      id: f('cover_plan'), label: 'Reconstruction', kind: 'select',
      options: [
        { value: 'secondary', label: 'Secondary intention' },
        { value: 'delayed_closure', label: 'Delayed primary closure' },
        { value: 'stsg', label: 'Split-thickness skin graft' },
        { value: 'flap', label: 'Local / regional flap' },
        { value: 'scrotal', label: 'Scrotal / perineal reconstruction (thigh pouch, flap, graft)' },
      ],
    },
    {
      id: f('sequelae'), label: 'Sequelae', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'contracture', label: 'Contracture / restricted joint' },
        { value: 'lymphoedema', label: 'Lymphoedema of the limb' },
        { value: 'weakness', label: 'Weakness after muscle debridement' },
        { value: 'sexual_urinary', label: 'Sexual or urinary problems (perineal)' },
        { value: 'stoma', label: 'Stoma awaiting reversal' },
        { value: 'body_image', label: 'Distress about scars / body image' },
      ],
    },
  ],
};

// ── Score: LRINEC ───────────────────────────────────────────────────────────

/** LRINEC by scoringService.calculateLRINEC; Hb and glucose from the core. */
export const lrinecScore: ScoreRule = ({ phase, answers: a }) => {
  if (phase !== 'pre_op') return null;
  const vals = {
    crp: numOf(a, f('crp')), wbc: numOf(a, f('wbc')), hemoglobin: numOf(a, 'core.hb'),
    sodium: numOf(a, f('sodium')), creatinine: numOf(a, f('creatinine')), glucose: numOf(a, 'core.glucose'),
  };
  const labels: Record<keyof typeof vals, string> = { crp: 'CRP', wbc: 'White cell count', hemoglobin: 'Haemoglobin (nutrition section)', sodium: 'Sodium', creatinine: 'Creatinine', glucose: 'Glucose (risk factors section)' };
  const missing = (Object.keys(vals) as (keyof typeof vals)[]).filter(k => vals[k] == null).map(k => labels[k]);
  if (missing.length === 6) return null;
  const source = 'soft-tissue-infection/scoringService.calculateLRINEC (Wong CH et al. Crit Care Med 2004;32:1535-41)';
  if (missing.length) {
    return { id: `${ID}.lrinec`, name: 'LRINEC', abbreviation: 'LRINEC', total: null, max: 13, band: null, incomplete: missing, source };
  }
  const r = calculateLRINEC(vals as Record<keyof typeof vals, number>);
  const level = r.riskCategory === 'high' ? 'very_high' : r.riskCategory === 'moderate' ? 'high' : 'moderate';
  return {
    id: `${ID}.lrinec`, name: 'LRINEC', abbreviation: 'LRINEC', total: r.totalScore, max: 13,
    band: { label: `${r.riskCategory} (Wong 2004 bands)`, level,
      interpretation: `LRINEC ${r.totalScore}. At 6 or more the pooled sensitivity is about 68% and specificity about 85% (Fernando SM et al. Ann Surg 2019): a low score does NOT exclude necrotising infection — clinical hard signs decide.` },
    incomplete: [],
    source,
    detail: [r.interpretation],
    flag: r.totalScore >= 6 ? { level: 'red', reason: `LRINEC ${r.totalScore} (6 or more): necrotising infection likely — surgical exploration (Wong 2004).` } : undefined,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Survive: complete surgical source control with physiological resuscitation', 'NSTI mortality falls with early, complete debridement (IDSA 2014; WSES 2018)'),
      L('No residual necrosis: re-look until the wound is clean', 'Re-look every 24–36 hours until no further necrosis (IDSA 2014)'),
      L('Close the wound and restore function with the simplest durable reconstruction', 'Staged reconstruction after source control'),
    ],
  },
});

const emergency: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const hard = chosen(a, f('hard_signs'));
  const soft = chosen(a, f('soft_signs'));
  const lrinec = ctx.scores[`${ID}.lrinec`];
  const lactate = numOf(a, f('lactate'));
  const shock = isOneOf(a, f('haemodynamics'), 'shock');
  const hypo = isOneOf(a, f('haemodynamics'), 'fluid_responsive') || shock;
  const organs = chosen(a, f('organ_dysfunction'));
  const parts: PlanContribution[] = [];
  // Sepsis itself (hypotension, raised lactate, organ dysfunction) starts the
  // hour-1 bundle even before hard or soft signs are ticked (SSC 2021).
  const suspected = hard.length > 0 || soft.length > 0 || (lrinec?.total ?? 0) >= 6 || isOneOf(a, f('imaging'), 'gas')
    || hypo || (lactate ?? 0) >= 2 || organs.length > 0;
  if (hard.length || isOneOf(a, f('imaging'), 'gas') || (lrinec?.total ?? 0) >= 6) {
    parts.push({ problem: { treatment: [L('Emergency theatre now: wide exploration and radical debridement of all necrotic skin, fat, fascia and muscle back to bleeding tissue; do not wait for imaging or further tests; resuscitate in parallel', `${hard.length ? `Hard signs: ${hard.join(', ').replace(/_/g, ' ')}` : isOneOf(a, f('imaging'), 'gas') ? 'Gas on imaging' : `LRINEC ${lrinec?.total}`} (IDSA 2014; WSES 2018) — delay to surgery increases mortality (Nawijn 2016)`, 'urgent')] } });
  } else if (soft.length) {
    parts.push({ problem: { treatment: [L('Senior surgical review within the hour; if doubt remains, explore — a small incision and finger test under anaesthesia (grey fascia, dishwater fluid, no resistance) settles it', `Soft signs: ${soft.join(', ').replace(/_/g, ' ')}`, 'urgent')] } });
  }
  if (lrinec?.total != null && lrinec.total < 6 && hard.length) {
    parts.push({ cautions: [`LRINEC ${lrinec.total} with hard signs present: the score misses about a third of NSTIs (Fernando 2019) — operate.`] });
  }
  if (suspected) {
    parts.push({ problems: [{ problem: 'Sepsis', lines: {
      investigations: [L('Blood cultures before antibiotics (do not delay them), lactate, FBC, U&E, CRP, coagulation, glucose, group and cross-match', 'Hour-1 sepsis bundle (Surviving Sepsis Campaign 2021)', 'urgent')],
      treatment: [
        L('Empirical IV antibiotics within 1 hour: broad cover for Gram-positive (including MRSA where prevalent), Gram-negative and anaerobic organisms, PLUS clindamycin to suppress toxin production — choose agents from the local antibiogram', `Necrotising infection (IDSA 2014 SSTI; WSES 2018)${isOneOf(a, f('antibiogram'), 'not_available') ? '; no local antibiogram — use the hospital / national empirical guidance' : ''}`, 'urgent'),
        ...(hypo || (lactate ?? 0) >= 4 ? [L('30 mL/kg balanced crystalloid within 3 hours; vasopressor (noradrenaline) for MAP 65 mmHg or more if hypotension persists', `${shock ? 'Septic shock' : hypo ? 'Hypotension' : `Lactate ${lactate} mmol/L`} (Surviving Sepsis Campaign 2021)`, 'urgent')] : []),
      ],
      monitoring: [L('Hourly observations and urine output (catheter); repeat lactate within 2–4 hours if raised', 'Sepsis (Surviving Sepsis Campaign 2021)', 'urgent')],
    } }] });
  }
  if (shock || organs.some(o => ['respiratory', 'coagulopathy', 'aki'].includes(o)) || (lactate ?? 0) >= 4) {
    parts.push({ problem: { referrals: [L('ICU / critical care now — before and after theatre', `${shock ? 'Septic shock' : (lactate ?? 0) >= 4 ? `Lactate ${lactate}` : `Organ dysfunction: ${organs.join(', ')}`}`, 'urgent')] } });
  }
  if (isOneOf(a, f('site'), 'perineum')) {
    parts.push({ problem: { treatment: [L('Fournier\'s: examine the anus and urethra under anaesthesia; urinary catheter (suprapubic if urethral injury); colorectal / urology input on faecal diversion; testes are usually spared — keep them', 'Perineal necrotising infection (EAU 2023 urological infections)', 'urgent')] } });
  }
  if (isOneOf(a, f('site'), 'head_neck')) {
    parts.push({ problem: { treatment: [L('Secure the airway first (awake fibre-optic or surgical airway); CT neck and chest for mediastinal extension; ENT / maxillofacial and cardiothoracic input', 'Cervical necrotising fasciitis', 'urgent')] } });
  }
  if (hasAny(a, f('source'), 'nsaid')) {
    parts.push({ general: [G('Analgesia', L('Stop NSAIDs', 'NSAIDs may mask and worsen necrotising infection'))] });
  }
  if (hasAny(a, f('source'), 'varicella')) {
    parts.push({ cautions: ['Necrotising infection after chickenpox is usually group A streptococcal: watch for streptococcal toxic shock.'] });
  }
  parts.push({ general: [G('Anaesthesia and theatre', L('Theatre booking as a life-threatening emergency (immediate category); general anaesthesia — avoid neuraxial techniques in sepsis and coagulopathy; blood available; photograph and mark the extent', 'NSTI is a time-critical surgical emergency', 'urgent'))] });
  parts.push({ counselling: [P('Emergency surgery', 'This infection destroys tissue quickly; the operation removes all dead tissue, the wound will be large and left open, more operations every day or two are expected, and intensive care may be needed. Amputation is sometimes needed to save life.', 'NSTI consent')] });
  return merge(...parts);
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const findings = chosen(a, f('findings'));
  const type = a[f('organism_type')];
  const parts: PlanContribution[] = [];
  if (isOneOf(a, f('completeness'), 'incomplete', 'progressing') || isOneOf(a, f('trend'), 'worse')) {
    parts.push({ problem: { treatment: [L('Return to theatre now for further debridement (and amputation if the limb cannot be cleared and the patient is deteriorating)', isOneOf(a, f('trend'), 'worse') ? 'Deteriorating after debridement' : `Debridement ${String(a[f('completeness')])}`, 'urgent')] } });
  } else if (!isOneOf(a, f('relook_booked'), 'booked_24_36h', 'not_needed') && !findings.includes('no_nsti')) {
    parts.push({ problem: { treatment: [L('Book a re-look in theatre 24–36 hours after this debridement, and daily thereafter until no further necrosis is found', 'Re-look not booked (IDSA 2014)', 'urgent')] } });
  }
  if (hasAny(a, f('specimens'), 'none')) {
    parts.push({ problem: { investigations: [L('Send deep tissue for Gram stain, culture and histology at the next debridement', 'No specimens sent')] } });
  }
  if (type === 'type2') {
    parts.push({ problem: { treatment: [L('Group A streptococcal NSTI: penicillin plus clindamycin; IVIG may be considered for streptococcal toxic shock (limited evidence); notify / advise close-contact prophylaxis per public-health policy', 'Group A Streptococcus (IDSA 2014; UKHSA iGAS guidance 2023)')] } });
  } else if (type === 'clostridial') {
    parts.push({ problem: { treatment: [L('Clostridial myonecrosis: penicillin plus clindamycin; radical excision of all affected muscle; hyperbaric oxygen only if available without delaying surgery', 'Gas gangrene (IDSA 2014)')] } });
  } else if (type === 'type1' || type === 'vibrio_other') {
    parts.push({ problem: { treatment: [L('Rationalise antibiotics to the culture; continue until no further debridement is needed, the patient has improved and has been afebrile for 48–72 hours', 'Antibiotic duration in NSTI (IDSA 2014)')] } });
  }
  if (findings.includes('no_nsti')) {
    parts.push({ problem: { treatment: [L('No necrotising infection found: treat as cellulitis / abscess; close or dress the exploratory incision', 'Negative exploration — an acceptable outcome of early surgery')] } });
  }
  parts.push({ general: [
    G('Nutrition', L('Early enteral nutrition (within 48 hours) with high protein — at least 1.3 g/kg/day, more with large exuding wounds, set by the dietitian', 'Catabolic state with large open wounds (ESPEN ICU nutrition guideline 2019)')),
    G('Wound care and dressings', L('Between debridements: moist dressings or NPWT once no necrosis remains and haemostasis is secure; measure and photograph the wound each time', 'Open NSTI wound')),
  ] });
  if (isOneOf(a, f('site'), 'perineum') && !answered(a, f('diversion'))) {
    parts.push({ problem: { treatment: [L('Decide on faecal diversion (colostomy or faecal management system) if the wound is soiled or the anal sphincter is involved', 'Perineal wound contamination')] } });
  }
  parts.push({ dischargeCriteria: [
    'No necrosis at the last look; wound clean and covered or in a bed-preparation plan',
    'Off vasopressors and organ support; afebrile; antibiotics completed or oral',
    'Eating enough; mobilising with physiotherapy',
    'Reconstruction plan and clinic date',
  ] });
  return merge(...parts);
};

const followUpRule: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const seq = chosen(a, f('sequelae'));
  return merge(
    isOneOf(a, f('wound_stage'), 'infected') && { problem: { treatment: [L('Urgent surgical review for recurrent necrosis or infection; cultures and imaging', 'Recurrent infection', 'urgent')] } },
    isOneOf(a, f('wound_stage'), 'granulating') && { problem: { treatment: [L('Plan cover: split-thickness skin graft for most; flaps over exposed tendon, bone, joint or vessels; perineal / scrotal reconstruction where needed', 'Clean granulating bed after NSTI')] } },
    isOneOf(a, f('wound_stage'), 'preparing') && { problem: { treatment: [L('Continue bed preparation (NPWT where suitable) and plan the date for cover', 'Wound bed preparation')] } },
    seq.includes('contracture') && { general: [G('Rehabilitation (physiotherapy / OT)', L('Stretching and splinting; plan release if established', 'Contracture after NSTI'))] },
    seq.includes('lymphoedema') && { problem: { referrals: [L('Lymphoedema service: compression and skin care', 'Lymphoedema after limb NSTI')] } },
    seq.includes('stoma') && { problem: { referrals: [L('Colorectal review for stoma reversal once the perineum has healed', 'Stoma awaiting reversal')] } },
    seq.includes('sexual_urinary') && { problem: { referrals: [L('Urology review for sexual / urinary function after perineal NSTI', 'Sexual or urinary sequelae')] } },
    seq.includes('body_image') && { general: [G('Psychology and wellbeing', L('Psychological support for body image and the trauma of critical illness', 'Body-image distress after NSTI'))] },
    { comorbidities: [{ condition: 'Predisposing conditions', actions: [L('Treat the predisposition: diabetes control, HIV / immunosuppression review, safe injecting or addiction services, perianal disease', 'Prevent recurrence')] }] },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

export const necrotisingSoftTissueInfection: ProcedureModule = {
  id: ID,
  name: 'Necrotising soft-tissue infection (debridement and re-look)',
  summary: 'Necrotising fasciitis, Fournier\'s and gas gangrene: hard signs, LRINEC (supporting only), hour-1 sepsis bundle, emergency debridement, re-look every 24–36 h and staged reconstruction.',
  group: 'wound',
  phases: ['pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Necrotising soft-tissue infection',
  basis: [
    'IDSA Practice guidelines for skin and soft tissue infections (Stevens DL et al. Clin Infect Dis 2014)',
    'WSES/SIS-E consensus on skin and soft-tissue infections (Sartelli M et al. World J Emerg Surg 2018)',
    'Surviving Sepsis Campaign: international guidelines 2021',
    'Wong CH et al. The LRINEC score. Crit Care Med 2004; Fernando SM et al. Ann Surg 2019 (diagnostic accuracy)',
    'Nawijn F et al. Time is of the essence when treating NSTI: systematic review. World J Emerg Surg 2016',
    'EAU Guidelines on urological infections (Fournier\'s gangrene) 2023; UKHSA iGAS guidance 2023',
  ],
  catalog: {
    feeIds: ['intermediate-002', 'major-010'],
    educationId: 'WOUND-001',
    patientEducationIds: ['infected-wounds'],
  },
  sections: {
    pre_op: [DETAILS, DIAGNOSIS],
    post_op: [DETAILS, OPERATIVE],
    follow_up: [DETAILS, RECON],
  },
  carryForward: [f('site'), f('source'), f('onset_date')],
  // An NSTI wound is devitalised tissue — tetanus-prone by definition
  // (Green Book ch. 30); sources here include minor trauma, injections and
  // scarification. Asked once, at the first (pre-operative) review.
  includeCore: { pre_op: ['tetanus'] },
  avoidNsaids: () => 'Necrotising infection: NSAIDs may mask its progression, and acute kidney injury is common (IDSA 2014)',
  scores: [lrinecScore],
  planRules: [goals, emergency, postOp, followUpRule],
  emergencySurgery: () => 'Necrotising soft-tissue infection — immediate-category emergency',
  therapeuticAntibiotics: () => 'Necrotising soft-tissue infection: therapeutic IV antibiotics (IDSA 2014)',
  consent: {
    procedureName: 'Emergency exploration and debridement of necrotising soft-tissue infection (with amputation if needed to save life)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove all dead and infected tissue to stop the infection spreading',
      'Give the best chance of survival',
      'Confirm the diagnosis and the organism',
    ],
    risks: [
      { name: 'Death', description: 'Necrotising infection is life-threatening even with prompt surgery and intensive care', frequency: 'About 1 in 5 in contemporary series' },
      { name: 'Repeated operations', description: 'Further debridement every day or two is usual until no dead tissue remains' },
      { name: 'Amputation', description: 'Removal of a limb may be needed to control the infection' },
      { name: 'Large wounds and reconstruction', description: 'Wounds are left open and later need grafts or flaps; scarring is extensive' },
      { name: 'Intensive care and organ failure', description: 'Breathing support, kidney failure and dialysis may be needed' },
      { name: 'Colostomy (perineal infection)', description: 'A temporary stoma may be needed to keep the wound clean' },
      { name: 'Bleeding and transfusion', description: 'Extensive debridement can bleed heavily' },
    ],
    alternatives: [
      'Antibiotics alone (not effective — dead tissue must be removed; without surgery the infection is usually fatal)',
      'A limited exploratory incision first where the diagnosis is uncertain',
    ],
    riskOfNotTreating: 'Without urgent surgery necrotising infection spreads along the tissue planes within hours, causing septic shock, organ failure, loss of the limb and, in most cases, death.',
    anaesthesiaOptions: ['general'],
    additionalProcedures: [
      'Amputation of a limb or digit',
      'Faecal diversion (colostomy) or suprapubic catheter for perineal infection',
      'NPWT; later skin grafts or flaps',
      'Central line, arterial line, ventilation, dialysis',
    ],
    photography: true,
    bloodProducts: 'likely',
    specimen: true,
    counsellingTopics: [
      'The diagnosis, why surgery cannot wait, and the possibility of amputation or death',
      'Repeated operations and intensive care',
      'The size of the wound and later reconstruction',
      'For the family: what to expect and who will update them',
    ],
    modifiers: [
      { id: 'nsti_shock', when: c => isOneOf(c.answers, f('haemodynamics'), 'shock') || (numOf(c.answers, f('lactate')) ?? 0) >= 4,
        text: 'Because the infection has already caused shock, the risk of organ failure and death is considerably higher.',
        why: 'Septic shock / lactate 4 mmol/L or more' },
      { id: 'nsti_renal', when: c => isOneOf(c.answers, 'core.renal', 'ckd_4_5', 'dialysis') || hasAny(c.answers, f('organ_dysfunction'), 'aki'),
        text: 'Because your kidneys are affected, dialysis may be needed and the risk of death is higher.',
        why: 'Kidney failure / AKI' },
      { id: 'nsti_glucose', when: c => (numOf(c.answers, 'core.glucose') ?? 0) > 12 || (numOf(c.answers, 'core.hba1c') ?? 0) > 8.5,
        text: 'High blood sugar makes the infection harder to control; it will be treated with insulin.',
        why: 'Hyperglycaemia' },
      { id: 'nsti_delay', when: c => hasAny(c.answers, f('hard_signs'), 'necrosis', 'anaesthesia', 'crepitus'),
        text: 'Because the skin is already dead or numb, the infection is advanced; more tissue will need to be removed and the risk of amputation and death is higher.',
        why: 'Advanced hard signs at presentation' },
      { id: 'nsti_head_neck', when: c => isOneOf(c.answers, f('site'), 'head_neck'),
        text: 'Infection in the neck can block the airway and spread into the chest; a tracheostomy or chest surgery may be needed.',
        why: 'Cervical necrotising fasciitis' },
    ],
  },
  followUp: {
    pre_op: [{ when: '24–36 hours after surgery', purpose: 'Re-look in theatre' }],
    post_op: [
      { when: 'Every 24–36 hours', purpose: 'Re-look debridement until no necrosis' },
      { when: 'Daily', purpose: 'Sepsis trend, antibiotics vs cultures, nutrition' },
    ],
    follow_up: [
      { when: '1–2 weeks after discharge', purpose: 'Wound, graft / flap, function' },
      { when: '3 and 6 months', purpose: 'Contracture, lymphoedema, stoma reversal, psychological recovery' },
    ],
  },
  handoffs: [
    { label: 'Soft tissue infection (LRINEC, NSTI pathway)', route: '/sti-protocol', when: 'Full NSTI pathway and serial scores' },
    { label: 'NPWT', route: '/npwt', phases: ['post_op', 'follow_up'], when: 'Once no necrosis remains' },
    { label: 'Skin Graft Monitor', route: '/skin-graft', phases: ['follow_up'], when: 'Grafting the clean bed' },
    { label: 'Blood transfusion', route: '/blood-transfusion', phases: ['pre_op', 'post_op'], when: 'Cross-match for debridement' },
    { label: 'Nutrition', route: '/nutrition', phases: ['post_op'], when: 'High-protein enteral feeding' },
  ],
};
