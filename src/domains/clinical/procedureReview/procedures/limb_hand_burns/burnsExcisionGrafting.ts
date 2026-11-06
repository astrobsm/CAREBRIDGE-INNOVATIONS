/**
 * Burns: acute assessment, resuscitation, early excision and grafting, and
 * scar care — ISBI Practice Guidelines 2016 / 2018, ABA.
 *
 * Wound review and pre-operative: mechanism, %TBSA (Lund–Browder, from the
 * Burns module chart), depth, special areas, circumferential burns and
 * escharotomy, inhalation injury, first aid, fluid resuscitation (the
 * calculator engine's calculateParkland: ABA 2 mL/kg/%TBSA starting volume,
 * Parkland 4 mL/kg/%TBSA reference), urine output and fluid creep,
 * electrical and chemical specifics, revised Baux (calculateBaux), ABA
 * burn-centre criteria (burnScoringService.checkBurnCenterCriteria), tetanus,
 * safeguarding (NICE CG89 alerting features) and intent. Pre-operative adds
 * the excision plan: timing, area per session, cover, donor skin, blood,
 * warming, airway and suxamethonium, and burn-specific nutrition.
 *
 * Post-operative: graft take (detail in the Skin Graft module), burn-wound
 * infection (ISBI 2018) and the ABA sepsis criteria (Greenhalgh 2007),
 * feeding, positioning and splints. Follow-up: healing, hypertrophic scar
 * and contracture, pressure garments, silicone, itch, sun, psychological
 * trauma symptoms, school and work.
 *
 * Burn CONTRACTURE RELEASE is the reconstruction group's module; skin-graft
 * take and donor site in detail are the skin_graft module's.
 */
import type { EncounterField, EncounterSection } from '../../../data/encounterModel';
import { calculateBaux, calculateParkland } from '../../../../calculators/engine/calculationEngine';
import { checkBurnCenterCriteria } from '../../../../burns/services/burnScoringService';
import type { PlanContext, PlanContribution, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { chosen, hasAny, isOneOf, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';

const ID = 'burns_excision_grafting';
const f = (id: string) => `${ID}.${id}`;

const isChild = (c: Pick<PlanContext, 'patient'>) => c.patient.ageYears != null && c.patient.ageYears < 16;
const majorBurn = (c: Pick<PlanContext, 'patient' | 'answers'>) => (numOf(c.answers, f('tbsa')) ?? 0) >= (isChild(c) ? 10 : 20);

// ── The burn (carried forward) ──────────────────────────────────────────────

const MECHANISM: EncounterField = {
  id: f('mechanism'), label: 'Mechanism', kind: 'select', important: true,
  options: [
    { value: 'flame', label: 'Flame' },
    { value: 'flash', label: 'Flash / explosion (gas cylinder, petrol, kerosene)' },
    { value: 'scald', label: 'Scald' },
    { value: 'contact', label: 'Contact' },
    { value: 'electrical_low', label: 'Electrical — low voltage (under 1000 V)' },
    { value: 'electrical_high', label: 'Electrical — high voltage / lightning', flag: 'red',
      flagReason: 'High-voltage injury: deep muscle damage under small skin wounds — ECG and cardiac monitoring, CK and myoglobin, compartment checks.' },
    { value: 'chemical', label: 'Chemical (acid / alkali)', flag: 'amber', flagReason: 'Chemical burn: irrigate with copious water until pH is neutral; identify the agent (hydrofluoric acid needs calcium gluconate).' },
    { value: 'friction', label: 'Friction' },
  ],
};
const TBSA: EncounterField = {
  id: f('tbsa'), label: 'Total burn %TBSA (partial + full thickness; Lund–Browder)', kind: 'number', unit: '%', min: 0, max: 100, important: true,
  help: 'Exclude simple erythema. Use the Lund–Browder chart in the Burns module.',
  numericFlags: [{ op: '>=', value: 20, level: 'amber', reason: '20% TBSA or more (10% in children): major burn — formal fluid resuscitation and burns-unit care (ISBI 2016).' }],
};
const FT: EncounterField = { id: f('ft_pct'), label: 'Full-thickness %TBSA', kind: 'number', unit: '%', min: 0, max: 100 };
const DEEP: EncounterField = { id: f('deep_pct'), label: 'Deep partial-thickness %TBSA', kind: 'number', unit: '%', min: 0, max: 100 };
const SPECIAL: EncounterField = {
  id: f('special_areas'), label: 'Special areas', kind: 'multiselect', important: true,
  options: [
    { value: 'none', label: 'None' },
    { value: 'face', label: 'Face / neck' },
    { value: 'hands', label: 'Hands' },
    { value: 'feet', label: 'Feet' },
    { value: 'perineum', label: 'Perineum / genitalia' },
    { value: 'major_joints', label: 'Major joints' },
    { value: 'circumferential_limb', label: 'Circumferential deep burn of a limb or digit', flag: 'amber', flagReason: 'Circumferential deep burn: check distal perfusion hourly — escharotomy if it is compromised.' },
    { value: 'circumferential_trunk', label: 'Circumferential deep burn of chest / abdomen / neck', flag: 'red', flagReason: 'Circumferential chest / abdominal burn can restrict ventilation: escharotomy if ventilation is impaired.' },
  ],
};
const INHALATION: EncounterField = {
  id: f('inhalation'), label: 'Inhalation injury', kind: 'select', important: true,
  options: [
    { value: 'none', label: 'No features' },
    { value: 'suspected', label: 'Suspected (enclosed space, facial burns, singed nasal hair, soot, carbonaceous sputum, hoarse voice)', flag: 'red',
      flagReason: 'Suspected inhalation injury: early senior airway assessment — airway oedema worsens over 24–48 hours; 100% oxygen and carboxyhaemoglobin.' },
    { value: 'confirmed', label: 'Confirmed (bronchoscopy / intubated)', flag: 'red', flagReason: 'Inhalation injury: critical care; it raises mortality (revised Baux +17).' },
  ],
};
const DETAILS: EncounterSection = {
  id: f('details'),
  title: 'The burn',
  intent: 'Recorded once (and corrected as depth declares itself at 48–72 hours), carried forward.',
  fields: [
    { id: f('burn_date'), label: 'Date of the burn', kind: 'date', important: true },
    MECHANISM, TBSA, FT, DEEP, SPECIAL, INHALATION,
  ],
};

// ── Acute assessment (wound review, pre-op) ─────────────────────────────────

const ACUTE: EncounterSection = {
  id: f('acute'),
  title: 'Acute burn assessment',
  fields: [
    {
      id: f('arrival'), label: 'Time from burn to arrival here', kind: 'select', important: true,
      options: [
        { value: 'under_6h', label: 'Under 6 hours' },
        { value: '6_24h', label: '6–24 hours' },
        { value: '1_3d', label: '1–3 days', flag: 'amber', flagReason: 'Late presentation: resuscitation, infection and nutrition deficits — reassess depth, cultures, start feeding.' },
        { value: 'over_3d', label: 'Over 3 days', flag: 'amber', flagReason: 'Presentation after 3 days: infected, deepened burns are likely — cultures, debridement, early nutrition.' },
      ],
    },
    { id: f('hours_since'), label: 'Hours since the burn (now)', kind: 'number', unit: 'hours', min: 0, max: 2000 },
    {
      id: f('first_aid'), label: 'First aid', kind: 'select',
      options: [
        { value: 'cool_water', label: 'Cool running water for about 20 minutes' },
        { value: 'none', label: 'None' },
        { value: 'harmful', label: 'Harmful substances (toothpaste, palm oil, raw egg, herbs, kerosene, dung)', flag: 'amber',
          flagReason: 'Traditional / harmful applications contaminate and deepen burns: wash them off, culture, and expect a higher infection risk.' },
        { value: 'ice', label: 'Ice', flag: 'amber', flagReason: 'Ice deepens burns and causes hypothermia.' },
      ],
    },
    {
      id: f('intent'), label: 'How it happened', kind: 'select', important: true,
      options: [
        { value: 'accident', label: 'Accidental — consistent history' },
        { value: 'assault', label: 'Assault (including acid attack)', flag: 'amber', flagReason: 'Assault: document carefully, photographs, police per hospital policy, and support.' },
        { value: 'self_inflicted', label: 'Self-inflicted', flag: 'red', flagReason: 'Self-inflicted burn: psychiatric assessment and suicide-risk management alongside burn care.' },
        { value: 'undetermined', label: 'Undetermined' },
      ],
    },
    {
      id: f('safeguarding'), label: 'Safeguarding — alerting features (child, elder or dependent adult)', kind: 'multiselect',
      help: 'NICE CG89: consider or suspect maltreatment.',
      options: [
        { value: 'none', label: 'None' },
        { value: 'inconsistent', label: 'History inconsistent with the injury or the child\'s development', flag: 'red', flagReason: 'Inconsistent history: suspect maltreatment — safeguarding referral today (NICE CG89).' },
        { value: 'delay', label: 'Unexplained delay in seeking care', flag: 'amber', flagReason: 'Unexplained delay: consider maltreatment (NICE CG89).' },
        { value: 'immersion', label: 'Immersion pattern (glove / stocking, clear tide-lines, spared flexures or buttocks)', flag: 'red', flagReason: 'Immersion pattern scald: suspect deliberate injury (NICE CG89).' },
        { value: 'contact_pattern', label: 'Patterned contact burn (iron, cigarette) or in a protected area', flag: 'red', flagReason: 'Patterned or unusually sited contact burn: suspect maltreatment (NICE CG89).' },
        { value: 'other_injuries', label: 'Other injuries / previous unexplained injuries', flag: 'red', flagReason: 'Other or previous unexplained injuries: suspect maltreatment (NICE CG89).' },
        { value: 'neglect', label: 'Lack of supervision / neglect', flag: 'amber', flagReason: 'Supervision concern: consider neglect (NICE CG89).' },
      ],
    },
    {
      id: f('airway'), label: 'Airway and breathing', kind: 'multiselect',
      showWhen: { field: f('inhalation'), equals: ['suspected', 'confirmed'] },
      options: [
        { value: 'stable', label: 'Stable, no voice change' },
        { value: 'hoarse', label: 'Hoarse voice / brassy cough', flag: 'red', flagReason: 'Hoarseness after a burn: airway oedema developing — senior anaesthetist now; early intubation.' },
        { value: 'stridor', label: 'Stridor', flag: 'red', flagReason: 'Stridor: impending airway obstruction — secure the airway now.' },
        { value: 'intubated', label: 'Intubated' },
      ],
    },
    { id: f('cohb'), label: 'Carboxyhaemoglobin', kind: 'number', unit: '%', min: 0, max: 80,
      showWhen: { field: f('inhalation'), equals: ['suspected', 'confirmed'] } },
    {
      id: f('escharotomy'), label: 'Escharotomy', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed — distal perfusion and ventilation adequate' },
        { value: 'needed', label: 'Needed — distal perfusion compromised or ventilation restricted', flag: 'red', flagReason: 'Escharotomy needed: do it now (bedside, mid-axial lines) — limb or ventilation at risk.' },
        { value: 'done', label: 'Done' },
      ],
    },
    {
      id: f('electrical'), label: 'Electrical injury checks', kind: 'multiselect',
      showWhen: { field: f('mechanism'), equals: ['electrical_low', 'electrical_high'] },
      options: [
        { value: 'ecg_normal', label: 'ECG normal' },
        { value: 'ecg_abnormal', label: 'ECG abnormal / arrhythmia / loss of consciousness', flag: 'red', flagReason: 'Abnormal ECG or loss of consciousness after electrical injury: continuous cardiac monitoring for at least 24 hours.' },
        { value: 'myoglobinuria', label: 'Dark (pigmented) urine', flag: 'red', flagReason: 'Myoglobinuria: higher urine output target until it clears; check CK and potassium; look for compartment syndrome.' },
        { value: 'compartment', label: 'Tense compartments / pain on passive stretch', flag: 'red', flagReason: 'Compartment syndrome after electrical injury: fasciotomy now.' },
      ],
    },
    {
      id: f('urine_ml_kg_h'), label: 'Urine output (last hours)', kind: 'number', unit: 'mL/kg/h', min: 0, max: 10,
      help: 'Targets: adults 0.5–1 mL/kg/h; children under 30 kg about 1 mL/kg/h; higher with myoglobinuria.',
      numericFlags: [{ op: '<', value: 0.5, level: 'amber', reason: 'Urine output below 0.5 mL/kg/h: under-resuscitation — increase the infusion and reassess hourly (ISBI 2016; ABA).' }],
    },
    { id: f('fluid_24h_ml'), label: 'Crystalloid given in the first 24 hours', kind: 'number', unit: 'mL', min: 0, max: 60000 },
    {
      id: f('healing_expected'), label: 'Expected healing of the deepest areas', kind: 'select', important: true,
      help: 'Burn depth evolves: reassess at 48–72 hours.',
      options: [
        { value: 'under_2w', label: 'Within 2 weeks (superficial / superficial partial)' },
        { value: '2_3w', label: 'In 2–3 weeks' },
        { value: 'over_3w', label: 'Not within 3 weeks (deep dermal / full thickness)', flag: 'amber',
          flagReason: 'Burns that will not heal within about 3 weeks scar badly: plan excision and grafting (ISBI 2016; Deitch 1983).' },
      ],
    },
  ],
};

// ── Pre-operative: the excision plan ────────────────────────────────────────

const EXCISION: EncounterSection = {
  id: f('excision'),
  title: 'Excision and grafting plan',
  fields: [
    { id: f('days_since'), label: 'Days since the burn', kind: 'number', unit: 'days', min: 0, max: 365, important: true },
    { id: f('excise_pct'), label: 'Area to excise this session', kind: 'number', unit: '%TBSA', min: 0, max: 100, important: true },
    {
      id: f('excision_type'), label: 'Excision', kind: 'select',
      options: [
        { value: 'tangential', label: 'Tangential (to bleeding dermis / fat)' },
        { value: 'fascial', label: 'Fascial (deep full thickness, invasive infection)' },
        { value: 'enzymatic', label: 'Enzymatic debridement (where available)' },
      ],
    },
    {
      id: f('cover'), label: 'Planned cover', kind: 'multiselect',
      options: [
        { value: 'sheet_autograft', label: 'Sheet autograft (face, hands, joints)' },
        { value: 'meshed_autograft', label: 'Meshed autograft' },
        { value: 'meek', label: 'Meek micrografting' },
        { value: 'allograft', label: 'Allograft / xenograft / amnion (temporary)' },
        { value: 'dermal_substitute', label: 'Dermal substitute' },
        { value: 'staged', label: 'Excise now, graft later' },
      ],
    },
    {
      id: f('donor_available'), label: 'Unburnt donor skin', kind: 'select',
      options: [
        { value: 'ample', label: 'Ample' },
        { value: 'limited', label: 'Limited (large burn)', flag: 'amber', flagReason: 'Limited donor skin: stage the excision, wide meshing / Meek, temporary cover, re-harvest healed donor sites (ISBI 2016).' },
      ],
    },
    { id: f('units_booked'), label: 'Red cells cross-matched', kind: 'number', unit: 'units', min: 0, max: 40 },
    {
      id: f('haemostasis'), label: 'Blood-loss measures planned', kind: 'multiselect',
      options: [
        { value: 'tourniquet', label: 'Limb tourniquets' },
        { value: 'adrenaline', label: 'Tumescent / topical dilute adrenaline' },
        { value: 'staged', label: 'Staged excision' },
        { value: 'cell_salvage', label: 'Two surgical teams to shorten the operation' },
      ],
    },
    {
      id: f('warming'), label: 'Warming plan', kind: 'multiselect', important: true,
      options: [
        { value: 'warm_theatre', label: 'Warm theatre (raise the ambient temperature)' },
        { value: 'warmed_fluids', label: 'Warmed IV and irrigation fluids' },
        { value: 'forced_air', label: 'Forced-air / conductive warming' },
        { value: 'none', label: 'No warming available', flag: 'amber', flagReason: 'No active warming: burns patients lose heat fast — limit exposure and the area excised.' },
      ],
    },
    {
      id: f('feeding'), label: 'Feeding', kind: 'select', important: true,
      options: [
        { value: 'oral_adequate', label: 'Eating enough orally' },
        { value: 'enteral', label: 'Enteral (nasogastric) feeding' },
        { value: 'not_started', label: 'Not started / inadequate', flag: 'amber', flagReason: 'Major burns are hypermetabolic: start enteral feeding within 24 hours (ISBI 2016; ESPEN 2013).' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const ABA_SEPSIS: EncounterField = {
  id: f('aba_sepsis'), label: 'ABA sepsis criteria present (Greenhalgh 2007)', kind: 'multiselect', important: true,
  help: 'Three or more, with documented infection, define sepsis in burns. Usual SIRS criteria do not apply to burns.',
  options: [
    { value: 'none', label: 'None' },
    { value: 'temperature', label: 'Temperature above 39 C or below 36.5 C' },
    { value: 'tachycardia', label: 'Progressive tachycardia (adults above 110/min; children above 2 SD for age)' },
    { value: 'tachypnoea', label: 'Progressive tachypnoea (above 25/min unventilated, or minute ventilation above 12 L/min)' },
    { value: 'thrombocytopenia', label: 'Platelets below 100 x10^9/L (3 days or more after resuscitation)' },
    { value: 'hyperglycaemia', label: 'Untreated glucose above 11.1 mmol/L, or insulin resistance (above 7 units/h IV, or a 25% rise in 24 h)' },
    { value: 'feeding_intolerance', label: 'Enteral feeding intolerance over 24 hours (distension, high residuals, diarrhoea above 2500 mL/day adults)' },
  ],
};
const POST: EncounterSection = {
  id: f('post'),
  title: 'After excision and grafting',
  fields: [
    { id: f('take_pct'), label: 'Graft take (% of the area grafted)', kind: 'number', unit: '%', min: 0, max: 100, important: true,
      help: 'Detail (haematoma, shear, donor sites) in the Skin Graft module.' },
    { id: f('open_pct'), label: 'Remaining open burn', kind: 'number', unit: '%TBSA', min: 0, max: 100 },
    {
      id: f('wound_infection'), label: 'Burn-wound infection signs (ISBI 2018)', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'graft_loss', label: 'Graft loss / lysis' },
        { value: 'conversion', label: 'Partial thickness converting to full thickness', flag: 'amber', flagReason: 'Conversion of depth suggests invasive infection: biopsy / culture, debride.' },
        { value: 'discoloration', label: 'Dark brown, black or violaceous areas; green pigment', flag: 'amber', flagReason: 'Focal dark or green discoloration: invasive bacterial (Pseudomonas) or fungal infection — tissue biopsy and culture.' },
        { value: 'cellulitis', label: 'Spreading erythema beyond the burn', flag: 'amber', flagReason: 'Cellulitis around a burn: systemic antibiotics per culture.' },
        { value: 'early_separation', label: 'Rapid eschar separation / pus' },
      ],
    },
    ABA_SEPSIS,
    {
      id: f('feeding_post'), label: 'Feeding', kind: 'select',
      options: [
        { value: 'meeting_target', label: 'Meeting the dietitian\'s target' },
        { value: 'below_target', label: 'Below target', flag: 'amber', flagReason: 'Below the energy / protein target: weight loss and poor healing — supplements, nasogastric feeding.' },
      ],
    },
    {
      id: f('positioning'), label: 'Positioning and splints', kind: 'select', important: true,
      options: [
        { value: 'anti_contracture', label: 'Anti-contracture positions and splints in place' },
        { value: 'not_in_place', label: 'Not in place', flag: 'amber', flagReason: 'Burn scars contract toward the position of comfort: position and splint from day 1 (ISBI 2016).' },
      ],
    },
    { id: f('transfused_units'), label: 'Red cells transfused this admission', kind: 'number', unit: 'units', min: 0, max: 100 },
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const SCAR: EncounterSection = {
  id: f('scar'),
  title: 'Healing, scars and recovery',
  fields: [
    { id: f('healed_pct'), label: 'Burn healed', kind: 'number', unit: '% of the burn', min: 0, max: 100, important: true },
    {
      id: f('scar_type'), label: 'Scar', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'Flat, maturing' },
        { value: 'hypertrophic', label: 'Hypertrophic (raised, red, firm)', flag: 'amber', flagReason: 'Hypertrophic burn scar: pressure, silicone, massage; score on the Scar Monitor (ISBI 2018).' },
        { value: 'contracture', label: 'Contracture limiting movement', flag: 'amber', flagReason: 'Burn contracture: therapy and splinting now; contracture release (reconstruction) if established.' },
        { value: 'keloid', label: 'Keloid' },
        { value: 'unstable', label: 'Unstable / ulcerating scar', flag: 'amber', flagReason: 'Chronic ulceration in a burn scar: biopsy to exclude Marjolin ulcer.' },
      ],
    },
    {
      id: f('garment'), label: 'Pressure garment', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'wearing', label: 'Worn about 23 hours a day' },
        { value: 'part_time', label: 'Worn part of the day' },
        { value: 'not_wearing', label: 'Prescribed but not worn', flag: 'amber', flagReason: 'Pressure garment not worn: find out why (heat, fit, cost, growth in children).' },
        { value: 'not_available', label: 'Needed but not available / affordable' },
      ],
    },
    { id: f('silicone'), label: 'Silicone gel or sheet in use', kind: 'boolean' },
    {
      id: f('itch'), label: 'Itch', kind: 'select',
      options: [{ value: 'none', label: 'None' }, { value: 'mild', label: 'Mild' }, { value: 'severe', label: 'Severe / disturbs sleep', flag: 'amber', flagReason: 'Severe post-burn itch: moisturisers, antihistamine, gabapentinoid (ISBI 2018).' }],
    },
    {
      id: f('trauma_symptoms'), label: 'Psychological trauma symptoms since the burn', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'nightmares', label: 'Nightmares / flashbacks' },
        { value: 'avoidance', label: 'Avoids reminders (fire, kitchen, the place)' },
        { value: 'hyperarousal', label: 'Jumpy, irritable, poor sleep' },
        { value: 'appearance', label: 'Distress about appearance; hides scars' },
        { value: 'school_work', label: 'Not back at school / work because of the burn' },
      ],
    },
    {
      id: f('safeguarding_fu'), label: 'Safeguarding plan', kind: 'select',
      options: [
        { value: 'not_applicable', label: 'Not applicable' },
        { value: 'in_place', label: 'In place, followed up' },
        { value: 'outstanding', label: 'Outstanding', flag: 'red', flagReason: 'Safeguarding concern not yet resolved: contact the safeguarding lead before discharge from follow-up.' },
      ],
    },
  ],
};

// ── Scores ──────────────────────────────────────────────────────────────────

/** Revised Baux, by the calculator engine's calculateBaux. */
export const bauxScore: ScoreRule = ({ phase, answers: a, patient }) => {
  if (phase === 'follow_up') return null;
  const tbsa = numOf(a, f('tbsa'));
  if (tbsa == null) return null;
  const age = patient.ageYears;
  const inh = isOneOf(a, f('inhalation'), 'suspected', 'confirmed');
  if (age == null) {
    return { id: `${ID}.baux`, name: 'Revised Baux score', abbreviation: 'rBaux', total: null, band: null, incomplete: ['Age (from the patient record)'],
      source: 'calculators/engine/calculationEngine.calculateBaux (Osler T et al. J Trauma 2010;68:690-7)' };
  }
  const r = calculateBaux(age, tbsa, inh);
  return {
    id: `${ID}.baux`, name: 'Revised Baux score', abbreviation: 'rBaux', total: r.revisedBaux,
    band: { label: `Revised Baux ${r.revisedBaux}`, level: 'none',
      interpretation: `Age ${age} + ${tbsa}% TBSA${inh ? ' + 17 (inhalation injury)' : ''} = ${r.revisedBaux}. Mortality rises with the score (Osler 2010); it informs a senior prognosis discussion and is never on its own a reason to withhold treatment.` },
    incomplete: isOneOf(a, f('inhalation'), 'suspected', 'confirmed', 'none') ? [] : ['Inhalation injury'],
    source: 'calculators/engine/calculationEngine.calculateBaux (Osler T et al. J Trauma 2010;68:690-7)',
  };
};

/** Starting resuscitation volume, by the calculator engine's calculateParkland. */
export const parklandScore: ScoreRule = ({ phase, answers: a, patient }) => {
  if (phase !== 'wound_review' && phase !== 'pre_op') return null;
  const tbsa = numOf(a, f('tbsa')), wt = numOf(a, 'core.weight_kg');
  if (tbsa == null || tbsa <= 0) return null;
  const child = patient.ageYears != null && patient.ageYears < 16;
  if (tbsa < (child ? 10 : 20)) return null;
  const hrs = numOf(a, f('hours_since'));
  if (hrs != null && hrs >= 48) return null;
  const r = wt != null ? calculateParkland(wt, tbsa) : null;
  if (!r) {
    return { id: `${ID}.fluids`, name: 'Burn resuscitation volume (first 24 hours)', abbreviation: 'Fluids', total: null, band: null, incomplete: ['Weight'],
      source: 'calculators/engine/calculationEngine.calculateParkland (ABA 2 mL/kg/%TBSA starting; Parkland 4 mL/kg/%TBSA)' };
  }
  const left8 = hrs != null && hrs < 8 ? 8 - hrs : null;
  return {
    id: `${ID}.fluids`, name: 'Burn resuscitation volume (first 24 hours)', abbreviation: 'Fluids', total: r.totalFluid24h,
    band: { label: `${r.totalFluid24h} mL starting estimate (Parkland upper reference ${r.parklandUpperBound24h} mL)`, level: 'moderate',
      interpretation: `Lactated Ringer's / Hartmann's: ${r.first8Hours} mL in the first 8 hours FROM THE TIME OF THE BURN (${r.hourlyFirst8} mL/h)${left8 != null ? `, ${left8} h of that window remain` : ''}, then ${r.next16Hours} mL over 16 hours (${r.hourlyNext16} mL/h). A starting estimate only: titrate hourly to urine output.${child ? ' Children: 3 mL/kg/%TBSA plus maintenance fluid with dextrose (ABLS).' : ''}${isOneOf(a, f('mechanism'), 'electrical_high') ? ' High-voltage injury: 4 mL/kg/%TBSA and a higher urine target while pigmenturia persists (ABLS).' : ''}` },
    incomplete: [],
    source: 'calculators/engine/calculationEngine.calculateParkland (ABA / ABLS 2018: 2 mL/kg/%TBSA starting volume; classic Parkland 4 mL/kg/%TBSA shown as the upper reference)',
  };
};

/** Count of the ABA sepsis criteria (Greenhalgh 2007). */
export const abaSepsisScore: ScoreRule = ({ phase, answers: a }) => {
  if (phase !== 'post_op') return null;
  if (!a[f('aba_sepsis')]) return null;
  const n = chosen(a, f('aba_sepsis')).length;
  return {
    id: `${ID}.aba_sepsis`, name: 'ABA sepsis criteria', abbreviation: 'ABA sepsis', total: n, max: 6,
    band: { label: n >= 3 ? '3 or more criteria' : 'Fewer than 3 criteria', level: n >= 3 ? 'high' : n > 0 ? 'low' : 'none',
      interpretation: n >= 3 ? `${n} of 6 ABA criteria: sepsis if infection is documented (positive culture, pathological tissue source or response to antimicrobials).` : `${n} of 6 ABA criteria.` },
    incomplete: [],
    source: 'Greenhalgh DG et al. American Burn Association consensus conference on burn sepsis. J Burn Care Res 2007;28:776-90',
    flag: n >= 3 ? { level: 'red', reason: `${n} ABA sepsis criteria: look for the source (wound, lines, chest, urine), cultures, start antibiotics per the local antibiogram (ABA 2007; ISBI 2018).` } : undefined,
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = ctx => ({
  problem: {
    goals: [
      L(majorBurn(ctx) ? 'Survive the burn: airway, resuscitation, infection control, nutrition' : 'Heal the burn without infection', majorBurn(ctx) ? 'Major burn (ISBI 2016)' : 'Purpose of burn care'),
      L('Close deep burns early with autograft so they heal within about 3 weeks', 'Early excision and grafting reduces mortality and scarring (Ong 2006 meta-analysis; ISBI 2016)'),
      L('Function, appearance and psychological recovery: prevent contracture, manage scars, return to school or work', 'Burn rehabilitation (ISBI 2018)'),
    ],
  },
});

const acute: PlanRule = ctx => {
  if (ctx.phase !== 'wound_review' && ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const tbsa = numOf(a, f('tbsa')) ?? 0;
  const ft = numOf(a, f('ft_pct')) ?? 0;
  const special = chosen(a, f('special_areas'));
  const inh = isOneOf(a, f('inhalation'), 'suspected', 'confirmed');
  const fluids = ctx.scores[`${ID}.fluids`];
  const uo = numOf(a, f('urine_ml_kg_h'));
  const wt = numOf(a, 'core.weight_kg');
  const given = numOf(a, f('fluid_24h_ml'));
  const parts: PlanContribution[] = [];
  if (inh) {
    parts.push({ problems: [{ problem: 'Inhalation injury', lines: {
      investigations: [L('Arterial blood gas with carboxyhaemoglobin and lactate; chest X-ray; bronchoscopy where available', 'Suspected / confirmed inhalation injury (ISBI 2016)', 'urgent')],
      treatment: [L('100% oxygen by non-rebreather until carboxyhaemoglobin is normal; early intubation by a senior anaesthetist if hoarse, stridulous, deep facial burns or a large burn needing transfer (uncut tube)', 'Inhalation injury — airway oedema progresses over 24–48 hours (ISBI 2016)', 'urgent')],
      referrals: [L('Critical care', 'Inhalation injury', 'urgent')],
    } }] });
  }
  if (isOneOf(a, f('escharotomy'), 'needed')) {
    parts.push({ problem: { treatment: [L('Escharotomy now: mid-axial incisions through the eschar to bleeding tissue (fingers mid-lateral; chest along the anterior axillary lines and across the costal margin); fasciotomy if compartments remain tight', 'Distal perfusion compromised or ventilation restricted (ISBI 2016)', 'urgent')] } });
  } else if (special.includes('circumferential_limb') || special.includes('circumferential_trunk')) {
    parts.push({ problem: { monitoring: [L('Hourly distal perfusion (colour, capillary refill, Doppler signal, pain) and ventilation pressures; elevate limbs', 'Circumferential deep burn', 'urgent')] } });
  }
  if (fluids?.total != null) {
    parts.push({ problems: [{ problem: 'Burn shock — fluid resuscitation', lines: {
      treatment: [L(`IV crystalloid: ${fluids.band!.label}; ${fluids.band!.interpretation.split('. A starting')[0]}`, `${tbsa}% TBSA${wt != null ? `, ${wt} kg` : ''} (ABLS 2018; ISBI 2016)`, 'urgent')],
      monitoring: [
        L(`Urinary catheter; hourly urine output — target ${isChild(ctx) && (wt ?? 99) < 30 ? 'about 1 mL/kg/h' : '0.5–1 mL/kg/h'}${hasAny(a, f('electrical'), 'myoglobinuria') ? ', higher (about 1–1.5 mL/kg/h) until the urine is clear of pigment' : ''}; adjust the rate by 20–30% each hour off target`, 'Resuscitation is titrated to urine output, not the formula (ISBI 2016; ABLS)', 'urgent'),
      ],
    } }] });
  }
  if (uo != null && uo < 0.5) {
    parts.push({ problem: { treatment: [L('Increase the infusion rate (about a quarter) and reassess in an hour; check the catheter; look for bleeding or other injury', `Urine output ${uo} mL/kg/h`, 'urgent')] } });
  }
  if (given != null && wt != null && given / wt > 250) {
    parts.push({ problem: { monitoring: [L('Fluid creep: measure intra-abdominal (bladder) pressure, watch for abdominal and limb compartment syndromes and pulmonary oedema; consider colloid (albumin) rescue', `${Math.round(given / wt)} mL/kg in 24 hours exceeds the Ivy index of 250 mL/kg (Ivy 2000; WSACS)`, 'urgent')] } });
  }
  if (isOneOf(a, f('mechanism'), 'electrical_high', 'electrical_low')) {
    const ecgBad = hasAny(a, f('electrical'), 'ecg_abnormal');
    parts.push({ problem: {
      investigations: [L('Electrical-injury work-up: ECG on arrival, CK, potassium, creatinine and urine for myoglobin', 'Electrical injury', isOneOf(a, f('mechanism'), 'electrical_high') ? 'urgent' : 'routine')],
      monitoring: [L(ecgBad || isOneOf(a, f('mechanism'), 'electrical_high') ? 'Continuous cardiac monitoring for at least 24 hours; hourly compartment checks' : 'Low-voltage injury with a normal ECG and no loss of consciousness: cardiac monitoring is not needed', ecgBad ? 'Abnormal ECG / loss of consciousness' : `Electrical injury (${String(a[f('mechanism')]).replace('_', ' ')})`, ecgBad ? 'urgent' : 'routine')],
    } });
    if (hasAny(a, f('electrical'), 'compartment')) parts.push({ problem: { treatment: [L('Fasciotomy now; debride dead muscle; second look in 24–48 hours', 'Compartment syndrome after electrical injury', 'urgent')] } });
  }
  if (isOneOf(a, f('mechanism'), 'chemical')) {
    parts.push({ problem: { treatment: [L('Irrigate with copious water (at least 30–60 minutes; longer for alkali) until skin pH is neutral; identify the agent; calcium gluconate gel / infiltration for hydrofluoric acid with calcium and ECG monitoring', 'Chemical burn (ISBI 2016)', 'urgent')] } });
  }
  if (isOneOf(a, f('first_aid'), 'harmful')) {
    parts.push({ general: [G('Wound care and dressings', L('Wash off all applied substances with water and mild soap; swab for culture; do not apply further traditional preparations', 'Harmful substances applied to the burn'))] });
  }
  const hrsNow = numOf(a, f('hours_since'));
  if (isOneOf(a, f('first_aid'), 'none') && hrsNow != null && hrsNow <= 3) {
    parts.push({ general: [G('Wound care and dressings', L('Cool the burn with running water for 20 minutes (beneficial up to 3 hours after the burn) while keeping the patient warm', `No first aid, ${hrsNow} h after the burn (ISBI 2016; ANZBA)`))] });
  }
  const crit = ctx.patient.ageYears != null ? checkBurnCenterCriteria(
    tbsa, ft, inh, ctx.patient.ageYears, special,
    String(a[f('mechanism')] ?? ''), isOneOf(a, f('mechanism'), 'chemical'), isOneOf(a, f('mechanism'), 'electrical_low', 'electrical_high'),
    special.some(s => s.startsWith('circumferential')), isOneOf(a, 'core.asa', '3', '4', '5'),
  ) : null;
  if (crit?.meetsCriteria) {
    parts.push({ problem: { referrals: [L('Manage in the burns unit under a burns consultant (or refer to the nearest burns centre)', `ABA burn-centre criteria: ${crit.reasons.join('; ')}`)] } });
  }
  if (isOneOf(a, f('healing_expected'), 'over_3w')) {
    parts.push({ problem: { treatment: [L('Plan early excision and autografting of the deep areas once resuscitated — within the first week', 'Deep burn not expected to heal within 3 weeks (ISBI 2016; Ong 2006; Deitch 1983)')] } });
  } else if (isOneOf(a, f('healing_expected'), '2_3w')) {
    parts.push({ problem: { monitoring: [L('Re-assess depth at 48–72 hours and again at day 10; graft areas that will not be healed by about 3 weeks', 'Indeterminate depth (ISBI 2016)')] } });
  }
  parts.push({ general: [G('Antibiotic prophylaxis and infection', L('No prophylactic systemic antibiotics for burns; topical antimicrobial dressings (silver, honey, or the unit\'s agent); systemic antibiotics only for documented infection or ABA sepsis', 'Prophylactic systemic antibiotics do not prevent burn-wound infection (ISBI 2016)'))] });
  if (isOneOf(a, f('intent'), 'self_inflicted')) {
    parts.push({ problem: { referrals: [L('Psychiatry today: suicide-risk assessment, observation level, and a safety plan', 'Self-inflicted burn', 'urgent')] } });
  }
  if (isOneOf(a, f('intent'), 'assault')) {
    parts.push({ general: [G('Social and financial support', L('Document the injury (body map, photographs), inform the police per hospital policy, social work and gender-based-violence support where relevant', 'Assault burn'))] });
  }
  return merge(...parts);
};

const safeguarding: PlanRule = ctx => {
  const a = ctx.answers;
  const flags = chosen(a, f('safeguarding'));
  if (!flags.length) return null;
  const under2 = ctx.patient.ageYears != null && ctx.patient.ageYears < 2;
  return { problems: [{ problem: 'Safeguarding concern', lines: {
    investigations: under2 ? [L('Skeletal survey (and neuroimaging per local child-protection protocol)', 'Suspected maltreatment in a child under 2 (NICE CG89; RCR/RCPCH)', 'urgent')] : [],
    treatment: [L('Document the history verbatim, the body map and photographs; do not discharge until a safe plan is agreed', `Alerting features: ${flags.join(', ').replace(/_/g, ' ')} (NICE CG89)`, 'urgent')],
    referrals: [L('Hospital safeguarding / child-protection lead and social work today; statutory referral per state child-protection law and hospital policy', 'NICE CG89 — suspect maltreatment', 'urgent')],
  } }] };
};

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const days = numOf(a, f('days_since'));
  const excise = numOf(a, f('excise_pct'));
  const tbsa = numOf(a, f('tbsa')) ?? 0;
  const warm = chosen(a, f('warming'));
  const parts: PlanContribution[] = [];
  parts.push({ general: [G('Anaesthesia and theatre',
    L('Cross-match for the planned excision and agree with the anaesthetist when to stop: limit the area per session to what can be covered and to the blood loss the team can replace (staged excision for large burns)', `Excision ${excise ?? '?'}% TBSA planned — blood loss is proportional to the area excised (ISBI 2016; local protocol)`, (excise ?? 0) >= 10 ? 'urgent' : 'routine'),
    L('Keep the patient warm: raise the theatre temperature, warm all fluids, forced-air warming, expose only the area being operated on; core temperature at or above 36 C throughout', 'Burns patients lose heat through the wound (NICE CG65 inadvertent peri-operative hypothermia; ISBI 2016)'),
    L('Do not give suxamethonium from 24–48 hours after the burn (hyperkalaemia) until the burn has healed', 'Burns upregulate extra-junctional acetylcholine receptors'),
  )] });
  if (warm.includes('none') || warm.length === 0) {
    parts.push({ cautions: ['No active warming recorded: hypothermia worsens bleeding and infection in burns surgery — limit the excision.'] });
  }
  if (days != null && days > 7 && isOneOf(a, f('healing_expected'), 'over_3w')) {
    parts.push({ cautions: [`Day ${days}: excision is later than ideal — expect more bleeding, a colonised bed and lower take; culture the wound before surgery.`] });
  }
  if (isOneOf(a, f('donor_available'), 'limited') || tbsa >= 40) {
    parts.push({ problem: { treatment: [L('Prioritise excision of large flat areas first (trunk, limbs) for survival, then hands, face and joints for function; temporary cover (allograft, xenograft, amnion) where autograft is insufficient; re-harvest healed donor sites', `${tbsa}% TBSA / limited donor skin (ISBI 2016)`)] } });
  }
  if (hasAny(a, f('special_areas'), 'hands', 'face', 'major_joints')) {
    parts.push({ problem: { treatment: [L('Sheet (unmeshed) autograft for the hands, face and over major joints; splint in the anti-contracture position', 'Functional / aesthetic areas (ISBI 2016)')] } });
  }
  if (majorBurn(ctx) || isOneOf(a, f('feeding'), 'not_started')) {
    parts.push({ general: [G('Nutrition',
      L('Enteral feeding within 24 hours of a major burn (nasogastric if oral intake is not enough); energy target by indirect calorimetry where available, otherwise a burn-specific formula with the dietitian', 'Burn hypermetabolism (ISBI 2016; ESPEN 2013 burns)'),
      L('Major burn: the protein target is 1.5–2 g/kg/day in adults (higher in children), above the general wound-healing target; trace elements (copper, selenium, zinc) for burns over 20% TBSA — an exception to the no-routine-supplement rule', 'Burn hypermetabolism (ESPEN 2013 endorsed burns recommendations)'),
    )] });
  }
  if (tbsa >= 40) {
    parts.push({ problem: { treatment: [L('Consider anabolic / anti-catabolic therapy with the consultant: oxandrolone, and propranolol in children, for very large burns', 'Burns of about 40% TBSA or more (ISBI 2016; Herndon 2001)')] } });
  }
  if (majorBurn(ctx)) {
    parts.push({ general: [G('Optimisation before surgery', L('Stress-ulcer prophylaxis while feeding is not established', 'Major burn (ISBI 2016)'))] });
  }
  parts.push({ counselling: [
    P('Burn surgery', 'Dead skin is removed and replaced with thin skin taken from unburnt areas; large burns need several operations; blood transfusion is often needed.', 'Burn excision and grafting'),
    P('Scars', 'Grafted and healed burns scar; pressure garments, silicone, massage and splints for many months reduce thick and tight scars.', 'Burn scar management (ISBI 2018)'),
  ] });
  return merge(...parts);
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const take = numOf(a, f('take_pct'));
  const inf = chosen(a, f('wound_infection'));
  const sepsis = ctx.scores[`${ID}.aba_sepsis`];
  const open = numOf(a, f('open_pct'));
  const parts: PlanContribution[] = [];
  if (take != null && take < 80) {
    parts.push({ problem: { treatment: [L('Find the cause of graft loss (haematoma, shear, infection, bed) and plan regrafting of the lost area once the bed is clean', `Graft take ${take}%`)] } });
  }
  if (inf.some(x => ['conversion', 'discoloration', 'early_separation', 'graft_loss'].includes(x))) {
    parts.push({ problem: {
      investigations: [L('Tissue biopsy for quantitative culture and histology (invasive infection), with sensitivities; fungal culture if dark / violaceous', `Burn-wound infection signs: ${inf.join(', ').replace(/_/g, ' ')} (ISBI 2018)`, 'urgent')],
      treatment: [L('Excise infected tissue; change topical agent per culture; systemic antibiotics for invasive infection', 'Invasive burn-wound infection (ISBI 2018)', 'urgent')],
    } });
  }
  if (inf.includes('cellulitis')) {
    parts.push({ problem: { treatment: [L('Systemic antibiotics for cellulitis around the burn per the local antibiogram, rationalised to culture', 'Cellulitis (ISBI 2018)', 'urgent')] } });
  }
  if (sepsis?.total != null && sepsis.total >= 3) {
    parts.push({ problems: [{ problem: 'Burn sepsis (ABA criteria)', lines: {
      investigations: [L('Blood cultures, wound biopsy culture, line tips, urine, sputum; lactate, FBC, CRP / procalcitonin', `${sepsis.total} ABA sepsis criteria (Greenhalgh 2007)`, 'urgent')],
      treatment: [L('Broad-spectrum IV antibiotics per the burns-unit antibiogram (cover Pseudomonas and MRSA where prevalent) within 1 hour; source control (remove infected lines, excise infected wound)', 'Burn sepsis (ABA 2007; Surviving Sepsis Campaign 2021)', 'urgent')],
      referrals: [L('Critical care review', 'Burn sepsis', 'urgent')],
    } }] });
  }
  if (isOneOf(a, f('feeding_post'), 'below_target')) {
    parts.push({ general: [G('Nutrition', L('Nasogastric feeding to meet the target; weigh twice weekly; dietitian review', 'Feeding below target after burn surgery (ISBI 2016)'))] });
  }
  if (isOneOf(a, f('positioning'), 'not_in_place')) {
    parts.push({ general: [G('Rehabilitation (physiotherapy / OT)', L('Anti-contracture positioning (neck extended, shoulders abducted, elbows and knees extended, ankles at 90 degrees, hands in the safe position) and splints from now; daily physiotherapy', 'Contracture prevention (ISBI 2016)'))] });
  }
  if (open != null && open > 0) {
    parts.push({ problem: { treatment: [L('Plan the next stage: excise and graft the remaining open burn, or re-harvest healed donor sites', `${open}% TBSA still open`)] } });
  }
  parts.push({ dischargeCriteria: [
    'Burn and donor sites healed or small enough for clinic / PHC dressings',
    'Eating enough; weight stable',
    'Splints, positioning and exercises taught; pressure-garment measurement booked',
    'Pain and itch controlled on oral medication',
    'Safeguarding plan in place where there was concern',
  ] });
  return merge(...parts);
};

const followUpRule: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const scar = chosen(a, f('scar_type'));
  const trauma = chosen(a, f('trauma_symptoms'));
  const parts: PlanContribution[] = [];
  if (scar.includes('hypertrophic')) {
    parts.push({ problem: { treatment: [L('Pressure garment about 23 hours a day until the scar matures (often 12–18 months), silicone gel or sheet, massage with moisturiser; intralesional steroid or laser for resistant areas', 'Hypertrophic burn scar (ISBI 2018; Monstrey 2014)')] } });
  }
  if (scar.includes('contracture')) {
    parts.push({ problem: { treatment: [L('Stretching, serial splinting and therapy now; surgical release (Z-plasty, graft or flap) if it is established or limiting function — use the contracture release review', 'Burn contracture (ISBI 2018)')], referrals: [L('Burns therapist (physiotherapy / OT)', 'Burn contracture')] } });
  }
  if (scar.includes('unstable')) {
    parts.push({ problem: { investigations: [L('Biopsy the chronic ulcer in the burn scar (edge and base) to exclude squamous cell carcinoma (Marjolin ulcer)', 'Unstable / ulcerating burn scar', 'urgent')] } });
  }
  if (isOneOf(a, f('garment'), 'not_available')) {
    parts.push({ general: [G('Social and financial support', L('Low-cost pressure: locally sewn garments from measured elastic fabric, tubular elastic bandage, or self-adhesive bandage under supervision', 'Pressure garment not available / affordable'))] });
  }
  if (isOneOf(a, f('garment'), 'part_time', 'not_wearing')) {
    parts.push({ counselling: [P('Pressure garments', 'They work only when worn almost all day; two sets let one be washed; return for refitting as they loosen or the child grows.', `Garment ${String(a[f('garment')]).replace('_', ' ')}`)] });
  }
  if (isOneOf(a, f('itch'), 'severe')) {
    parts.push({ general: [G('Analgesia', L('Post-burn itch: frequent emollient, sedating antihistamine at night, gabapentin or pregabalin if persistent; massage', 'Severe post-burn itch (ISBI 2018)'))] });
  }
  if (trauma.some(t => ['nightmares', 'avoidance', 'hyperarousal'].includes(t))) {
    parts.push({ general: [G('Psychology and wellbeing', L('Refer for trauma-focused psychological therapy (trauma-focused CBT or EMDR); for children, involve the family and school', `Post-traumatic symptoms: ${trauma.join(', ').replace(/_/g, ' ')} (NICE NG116 PTSD)`))] });
  }
  if (trauma.includes('appearance') || trauma.includes('school_work')) {
    parts.push({ general: [G('Psychology and wellbeing', L('Appearance and social-reintegration support: camouflage advice, peer / burn-survivor groups, school or workplace re-entry planning', trauma.includes('school_work') ? 'Not back at school / work' : 'Appearance distress'))] });
  }
  parts.push({ general: [G('Patient education', L('Protect healed burns and grafts from sun for at least a year (clothing, hat, SPF 30+); moisturise healed skin twice daily', 'Healed burns pigment and dry easily (ISBI 2018)'))] });
  if (isOneOf(a, f('safeguarding_fu'), 'outstanding')) {
    parts.push({ problem: { referrals: [L('Contact the safeguarding lead before the next appointment; do not close follow-up while the concern is unresolved', 'Safeguarding plan outstanding', 'urgent')] } });
  }
  return merge(...parts);
};

// ── The module ──────────────────────────────────────────────────────────────

export const burnsExcisionGrafting: ProcedureModule = {
  id: ID,
  name: 'Burns: excision and grafting',
  summary: 'Acute burns and their surgery: %TBSA, depth, inhalation, resuscitation (Parkland / ABA), revised Baux, escharotomy, early excision and grafting, sepsis, safeguarding and scar care.',
  group: 'burns',
  phases: ['wound_review', 'pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Burn injury',
  basis: [
    'ISBI Practice Guidelines for Burn Care, Part 1 (2016) and Part 2 (2018)',
    'American Burn Association: Advanced Burn Life Support (ABLS) 2018; burn-centre referral criteria',
    'Greenhalgh DG et al. ABA consensus conference to define sepsis and infection in burns. J Burn Care Res 2007',
    'Osler T et al. Simplified estimates of the probability of death after burn injuries (revised Baux). J Trauma 2010',
    'Ong YS et al. Meta-analysis of early excision of burns. Burns 2006; Deitch EA et al. Hypertrophic burn scars. J Trauma 1983',
    'ESPEN endorsed recommendations: nutritional therapy in major burns (2013)',
    'NICE CG89 Child maltreatment: when to suspect (2009, updated 2017); NICE CG65 hypothermia; NICE NG116 PTSD',
  ],
  catalog: {
    feeIds: ['burns-003', 'burns-004', 'burns-001', 'burns-002', 'major-001'],
    educationId: 'BURNS-001',
    patientEducationIds: ['acute-burn-injuries', 'burn-grafting-care'],
  },
  sections: {
    wound_review: [DETAILS, ACUTE],
    pre_op: [DETAILS, ACUTE, EXCISION],
    post_op: [DETAILS, POST],
    follow_up: [DETAILS, SCAR],
  },
  // Tetanus is the core's question (a burn is tetanus-prone).
  includeCore: { wound_review: ['tetanus'], pre_op: ['tetanus'] },
  carryForward: [f('burn_date'), f('mechanism'), f('tbsa'), f('ft_pct'), f('deep_pct'), f('special_areas'), f('inhalation')],
  scores: [bauxScore, parklandScore, abaSepsisScore],
  planRules: [goals, acute, safeguarding, preOp, postOp, followUpRule],
  consent: {
    procedureName: 'Excision of burn and skin grafting (with escharotomy / fasciotomy if needed)',
    phases: ['pre_op'],
    intendedBenefits: [
      'Remove dead burnt skin before it becomes infected',
      'Close the wound with your own skin so it heals in weeks rather than months',
      'Reduce the risk of infection, death (in large burns) and tight, thick scarring',
    ],
    risks: [
      { name: 'Major bleeding and blood transfusion', description: 'Removing burnt skin bleeds; transfusion is often needed for larger excisions' },
      { name: 'Hypothermia', description: 'Losing body heat during surgery, which increases bleeding and infection' },
      { name: 'Infection and sepsis', description: 'Burns can become infected and infection can spread to the blood' },
      { name: 'Several operations', description: 'Large burns are excised and grafted in stages, and lost grafts need regrafting' },
      { name: 'Hypertrophic scarring', description: 'Thick, raised, itchy scars for many months; pressure garments and silicone help' },
      { name: 'Donor-site problems', description: 'Donor sites can be slow to heal, scar or change colour' },
      { name: 'Loss of a limb or digit', description: 'In deep electrical or full-thickness circumferential burns, a part may not survive' },
    ],
    alternatives: [
      'Dressings alone and waiting for the burn to separate and heal (reasonable only for burns expected to heal within about 3 weeks)',
      'Temporary cover with allograft, xenograft or amnion before final grafting',
      'Dermal substitutes, where available',
      'Delayed (later) excision',
    ],
    riskOfNotTreating: 'Deep burns left to separate on their own take months, are prone to infection and sepsis, and heal with thick, tight scars that can limit movement; in large burns, delaying excision increases the risk of death.',
    anaesthesiaOptions: ['general', 'regional', 'spinal'],
    additionalProcedures: [
      'Escharotomy or fasciotomy',
      'Taking skin from unburnt donor sites (often several)',
      'Blood transfusion',
      'Central venous or arterial line; nasogastric feeding tube',
      'Tracheostomy in prolonged ventilation',
    ],
    photography: true,
    bloodProducts: 'likely',
    specimen: false,
    counsellingTopics: [
      'The number of operations likely and the time in hospital',
      'Blood transfusion',
      'Prognosis in large burns, discussed with the consultant',
      'Scar care for 12–18 months: garments, silicone, splints, sun protection',
      'Feeding and why extra protein is needed',
      'Emotional recovery, school and work',
    ],
    modifiers: [
      { id: 'burn_inhalation', when: c => isOneOf(c.answers, f('inhalation'), 'suspected', 'confirmed'),
        text: 'Because smoke has injured your airway or lungs, breathing problems, pneumonia and the risk of not surviving are higher; a breathing tube may be needed.',
        why: 'Inhalation injury (revised Baux +17)' },
      { id: 'burn_major', when: c => majorBurn(c),
        text: 'Because the burn covers a large area, you will need several operations and blood transfusions, and the risks of infection, organ failure and death are significant; the team will discuss these with you and your family.',
        why: 'Major burn (20% TBSA or more; 10% in children)' },
      { id: 'burn_late', when: c => isOneOf(c.answers, f('arrival'), '1_3d', 'over_3d'),
        text: 'Because treatment started some days after the burn, infection is more likely and the burn may be deeper than it first appeared.',
        why: 'Late presentation' },
      { id: 'burn_remedies', when: c => isOneOf(c.answers, f('first_aid'), 'harmful'),
        text: 'Substances applied to the burn before arrival increase the risk of infection and of the burn becoming deeper.',
        why: 'Harmful first aid / traditional applications' },
      { id: 'burn_electrical', when: c => isOneOf(c.answers, f('mechanism'), 'electrical_high'),
        text: 'High-voltage electrical injuries damage muscle under the skin; more operations, kidney problems, heart rhythm problems and loss of a limb are more likely than the skin wounds suggest.',
        why: 'High-voltage electrical injury' },
      { id: 'burn_age', when: c => (c.patient.ageYears ?? 0) >= 65,
        text: 'Older age increases the risk of complications and of not surviving a burn of this size.',
        why: 'Age 65 or more (Baux)' },
    ],
  },
  followUp: {
    wound_review: [
      { when: '48–72 hours', purpose: 'Re-assess depth; decide excision vs dressings' },
      { when: 'Day 10–14', purpose: 'Areas not healing: list for excision and grafting' },
    ],
    pre_op: [{ when: 'Day 3–5 after grafting', purpose: 'First graft inspection' }],
    post_op: [
      { when: 'Day 3–5', purpose: 'First graft inspection; plan regrafting' },
      { when: 'Twice weekly', purpose: 'Wounds, nutrition, sepsis screen, physiotherapy' },
    ],
    follow_up: [
      { when: '2–4 weeks after healing', purpose: 'Pressure-garment fitting, scar review, splints' },
      { when: 'Every 3 months for 18–24 months', purpose: 'Scar maturation, contracture, garment refit, psychological recovery; children until growth is complete' },
    ],
  },
  handoffs: [
    { label: 'Burns (Lund–Browder chart, resuscitation, monitoring)', route: '/burns', phases: ['wound_review', 'pre_op', 'post_op'], when: 'TBSA chart, hourly fluids and burn observations' },
    { label: 'Skin Graft Monitor', route: '/skin-graft', phases: ['post_op', 'follow_up'], when: 'Graft take and donor sites in detail' },
    { label: 'Scar Monitor (POSAS / VSS)', route: '/scar-monitor', phases: ['follow_up'], when: 'Hypertrophic scarring' },
    { label: 'Keloid Care', route: '/keloid-care', phases: ['follow_up'], when: 'Keloid in a burn scar' },
    { label: 'Nutrition', route: '/nutrition', phases: ['wound_review', 'pre_op', 'post_op'], when: 'Burn energy and protein targets' },
    { label: 'Blood transfusion', route: '/blood-transfusion', phases: ['pre_op', 'post_op'], when: 'Cross-match for excision' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate for staged surgery' },
  ],
};
