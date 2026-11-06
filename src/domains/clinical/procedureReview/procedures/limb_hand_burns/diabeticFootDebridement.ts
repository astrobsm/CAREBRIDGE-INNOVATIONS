/**
 * Diabetic foot debridement (with drainage or minor amputation for source
 * control) — IWGDF 2023 / IWGDF-IDSA 2023.
 *
 * The wound itself (size, tissue, exposed structures, edge) is the core
 * TIMERS assessment; this module adds what IWGDF asks of a diabetic foot:
 * ulcer site (SINBAD), Wagner grade, gangrene (WIfI), loss of protective
 * sensation (10 g monofilament), deformity and Charcot, perfusion (pulses,
 * Doppler waveforms, ABI / TBI with the calcification caveat, toe pressure,
 * TcPO2), the IWGDF/IDSA infection grade and osteomyelitis (probe-to-bone,
 * X-ray, MRI, ESR), offloading, the foot team, footwear and the other foot.
 *
 * Scores: WIfI by the vascular domain's computeWifi; ABI / TBI by its
 * perfusion calculators; SINBAD with limbSalvageService.calculateSINBADScore
 * (fed the published item definitions — see sinbadScore);
 * the IWGDF 2023 risk category for recurrence screening.
 *
 * Time-critical: severe infection, gas, abscess, necrotising infection, wet
 * gangrene and severe ischaemia are urgent lines and red flags.
 */
import type { EncounterAnswers, EncounterField, EncounterSection } from '../../../data/encounterModel';
import { computeWifi, wifiShorthand } from '../../../../vascular/services/wifiEngine';
import type { FootInfectionSeverity, GangreneExtent, VascularWoundSnapshot } from '../../../../vascular/types';
import { calculateSINBADScore, getWagnerDescription } from '../../../../../services/limbSalvageService';
import type { WagnerGrade } from '../../../../../types';
import type { PlanContext, PlanContribution, PlanRule, ProcedureModule, ScoreRule } from '../../types';
import { answered, chosen, hasAny, isOneOf, numOf } from '../../core/answers';
import { G, L, P, merge } from '../../ruleKit';
import { abiScore, perfusionFields, pressuresFrom, severeIschaemia, tbiScore } from './shared';

const ID = 'diabetic_foot_debridement';
const f = (id: string) => `${ID}.${id}`;

// ── Classification (carried forward) ────────────────────────────────────────

const SIDE: EncounterField = {
  id: f('side'), label: 'Foot', kind: 'select', important: true,
  options: [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }],
};
const REGION: EncounterField = {
  id: f('region'), label: 'Ulcer site (SINBAD)', kind: 'select', important: true,
  options: [
    { value: 'forefoot', label: 'Forefoot (toes, metatarsal heads)' },
    { value: 'midfoot', label: 'Midfoot' },
    { value: 'hindfoot', label: 'Hindfoot / heel', flag: 'amber', flagReason: 'Heel and hindfoot ulcers heal more slowly and carry a higher amputation risk (SINBAD; IWGDF 2023 classification).' },
  ],
};
const WAGNER: EncounterField = {
  id: f('wagner'), label: 'Wagner grade', kind: 'select', important: true,
  options: ([0, 1, 2, 3, 4, 5] as WagnerGrade[]).map(g => ({
    value: String(g), label: `${g} — ${getWagnerDescription(g)}`,
    ...(g === 3 ? { flag: 'amber' as const, flagReason: 'Wagner 3: abscess, osteomyelitis or deep infection — surgical debridement / drainage and bone assessment.' } : {}),
    ...(g >= 4 ? { flag: 'red' as const, flagReason: `Wagner ${g}: gangrene — urgent surgical and vascular assessment; discuss the level of amputation.` } : {}),
  })),
};
const GANGRENE: EncounterField = {
  id: f('gangrene'), label: 'Gangrene', kind: 'select', important: true,
  options: [
    { value: 'none', label: 'None' },
    { value: 'dry_toe', label: 'Dry, limited to toe(s)' },
    { value: 'wet_toe', label: 'Wet (infected), limited to toe(s)', flag: 'red', flagReason: 'Wet gangrene is spreading infection in dead tissue: urgent surgical source control (IWGDF/IDSA 2023).' },
    { value: 'forefoot', label: 'Forefoot', flag: 'red', flagReason: 'Gangrene beyond the toes (WIfI W3): urgent surgical and vascular assessment.' },
    { value: 'midfoot', label: 'Midfoot', flag: 'red', flagReason: 'Gangrene beyond the toes (WIfI W3): urgent surgical and vascular assessment.' },
    { value: 'heel', label: 'Heel', flag: 'red', flagReason: 'Heel gangrene (WIfI W3): limb threat — urgent surgical and vascular assessment.' },
    { value: 'extensive', label: 'Extensive', flag: 'red', flagReason: 'Extensive gangrene: limb (and life) threat — urgent surgical decision.' },
  ],
};
const CLASSIFY: EncounterSection = {
  id: f('classify'),
  title: 'Ulcer classification (IWGDF 2023)',
  intent: 'Site, Wagner grade and gangrene. Size, depth, tissue and exposed structures are in the wound assessment.',
  fields: [SIDE, REGION, WAGNER, GANGRENE],
};

// ── Neuropathy and foot structure ───────────────────────────────────────────

const MONOFILAMENT: EncounterField = {
  id: f('monofilament'), label: '10 g monofilament (3 plantar sites per foot)', kind: 'select', important: true,
  options: [
    { value: 'intact', label: 'Felt at all sites' },
    { value: 'lost', label: 'Not felt at one or more sites — loss of protective sensation', flag: 'amber',
      flagReason: 'Loss of protective sensation: the foot cannot warn of injury — offloading, protective footwear and daily inspection (IWGDF 2023 prevention).' },
    { value: 'not_tested', label: 'Not tested', flag: 'amber', flagReason: 'Test protective sensation with a 10 g monofilament (IWGDF 2023).' },
  ],
};
const NEURO: EncounterSection = {
  id: f('neuro'),
  title: 'Neuropathy, deformity and Charcot',
  fields: [
    MONOFILAMENT,
    {
      id: f('vibration'), label: 'Vibration (128 Hz tuning fork, hallux)', kind: 'select',
      options: [{ value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'not_tested', label: 'Not tested' }],
    },
    {
      id: f('deformity'), label: 'Deformity and foot structure', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'claw_hammer', label: 'Claw / hammer toes' },
        { value: 'hallux_valgus', label: 'Hallux valgus' },
        { value: 'prominent_mth', label: 'Prominent metatarsal heads' },
        { value: 'limited_joint_mobility', label: 'Limited joint mobility' },
        { value: 'previous_minor_amputation', label: 'Previous toe / ray amputation' },
        { value: 'charcot_chronic', label: 'Charcot foot — chronic (inactive)' },
        { value: 'charcot_active', label: 'Hot, red, swollen foot (possible active Charcot)', flag: 'red',
          flagReason: 'A warm, swollen foot in neuropathy is active Charcot until proven otherwise: immobilise and offload now; X-ray, MRI if the X-ray is normal (IWGDF 2023 Charcot guideline).' },
      ],
    },
  ],
};

// ── Perfusion ───────────────────────────────────────────────────────────────

const PERFUSION: EncounterSection = {
  id: f('perfusion'),
  title: 'Perfusion (IWGDF 2023 PAD)',
  intent: 'Examine the pulses and measure: a normal ABI does not exclude PAD in diabetes — calcified vessels read high, so take a toe pressure.',
  fields: perfusionFields(f),
};

// ── Infection and bone ──────────────────────────────────────────────────────

const INFECTION_GRADE: EncounterField = {
  id: f('infection_grade'), label: 'Infection (IWGDF/IDSA 2023 classification)', kind: 'select', important: true,
  help: 'Infection = at least 2 of: swelling or induration, erythema >0.5 cm, tenderness, warmth, purulence. Systemic signs are in the infection section.',
  options: [
    { value: '1', label: '1 — Uninfected' },
    { value: '2', label: '2 — Mild: skin and subcutaneous tissue, erythema 0.5–2 cm around the ulcer' },
    { value: '3', label: '3 — Moderate: erythema over 2 cm or deeper than skin (abscess, osteomyelitis, septic arthritis, fasciitis), no systemic signs', flag: 'amber',
      flagReason: 'Moderate diabetic foot infection: deep tissue culture, antibiotics per the local antibiogram and an urgent surgical opinion (IWGDF/IDSA 2023).' },
    { value: '4', label: '4 — Severe: any foot infection with systemic inflammatory response (2 or more SIRS criteria)', flag: 'red',
      flagReason: 'Severe diabetic foot infection: limb- and life-threatening — admit, blood cultures, IV antibiotics, urgent surgical source control (IWGDF/IDSA 2023).' },
  ],
};
const PTB: EncounterField = {
  id: f('probe_to_bone'), label: 'Probe-to-bone test', kind: 'select', important: true,
  options: [
    { value: 'negative', label: 'Negative' },
    { value: 'positive', label: 'Positive (hard, gritty bone)', flag: 'amber',
      flagReason: 'Positive probe-to-bone in an infected ulcer makes osteomyelitis likely: X-ray, ESR / CRP, and bone for culture and histology (IWGDF/IDSA 2023).' },
    { value: 'not_done', label: 'Not done' },
  ],
};
const INFECTION: EncounterSection = {
  id: f('infection'),
  title: 'Infection and osteomyelitis (IWGDF/IDSA 2023)',
  fields: [
    INFECTION_GRADE,
    {
      id: f('surgical_emergency'), label: 'Signs needing urgent surgery', kind: 'multiselect', important: true,
      options: [
        { value: 'none', label: 'None' },
        { value: 'abscess', label: 'Deep abscess / fluctuance', flag: 'red', flagReason: 'Deep foot abscess: urgent incision and drainage (IWGDF/IDSA 2023).' },
        { value: 'gas', label: 'Gas in the tissues (crepitus or on X-ray)', flag: 'red', flagReason: 'Gas in the foot: gas-forming / necrotising infection — emergency surgery.' },
        { value: 'necrotising', label: 'Necrotising features (bullae, ecchymosis, pain out of proportion, rapid spread)', flag: 'red', flagReason: 'Necrotising infection: emergency debridement — do not wait for imaging.' },
        { value: 'compartment', label: 'Plantar compartment tension / tracking up the tendon sheaths', flag: 'red', flagReason: 'Compartment infection tracks proximally fast: urgent decompression and debridement.' },
        { value: 'extensive_necrosis', label: 'Extensive necrosis', flag: 'red', flagReason: 'Extensive necrosis: urgent surgical debridement.' },
      ],
    },
    PTB,
    {
      id: f('xray'), label: 'Plain X-ray of the foot', kind: 'select',
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'normal', label: 'No bony changes' },
        { value: 'osteomyelitis', label: 'Features of osteomyelitis (cortical erosion, periosteal reaction, sequestrum)', flag: 'amber',
          flagReason: 'X-ray features of osteomyelitis: bone sample for culture and histology to direct treatment (IWGDF/IDSA 2023).' },
        { value: 'gas', label: 'Soft-tissue gas', flag: 'red', flagReason: 'Soft-tissue gas: emergency surgical debridement.' },
        { value: 'foreign_body', label: 'Foreign body' },
        { value: 'charcot', label: 'Charcot changes (fragmentation, dislocation)' },
      ],
    },
    {
      id: f('mri'), label: 'MRI', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed' },
        { value: 'not_available', label: 'Not available / not affordable' },
        { value: 'pending', label: 'Requested' },
        { value: 'osteomyelitis', label: 'Osteomyelitis' },
        { value: 'no_osteomyelitis', label: 'No osteomyelitis' },
      ],
    },
    {
      id: f('esr'), label: 'ESR', kind: 'number', unit: 'mm/h', min: 0, max: 150,
      numericFlags: [{ op: '>', value: 70, level: 'amber', reason: 'ESR above 70 mm/h supports osteomyelitis in a diabetic foot ulcer (IWGDF/IDSA 2023).' }],
    },
    { id: f('crp'), label: 'CRP', kind: 'number', unit: 'mg/L', min: 0, max: 600 },
    {
      id: f('bone_sample'), label: 'Bone sample (culture and histology)', kind: 'select',
      options: [
        { value: 'not_indicated', label: 'Not indicated' },
        { value: 'planned', label: 'Planned (percutaneous or at surgery)' },
        { value: 'sent', label: 'Sent' },
        { value: 'positive', label: 'Result: osteomyelitis' },
        { value: 'negative', label: 'Result: no osteomyelitis' },
      ],
    },
  ],
};

// ── Offloading, foot team, footwear, the other foot ─────────────────────────

const OFFLOADING: EncounterField = {
  id: f('offloading'), label: 'Offloading now', kind: 'select', important: true,
  options: [
    { value: 'none', label: 'None — walking on the ulcer', flag: 'amber', flagReason: 'No offloading: an ulcer that is walked on will not heal (IWGDF 2023 offloading).' },
    { value: 'footwear', label: 'Ordinary or adapted footwear only', flag: 'amber', flagReason: 'Footwear alone does not offload a plantar ulcer: knee-high device (IWGDF 2023 offloading).' },
    { value: 'removable_walker', label: 'Removable knee-high walker' },
    { value: 'non_removable', label: 'Non-removable knee-high device (TCC or iTCC)' },
    { value: 'ankle_high', label: 'Ankle-high device / half shoe / felted foam' },
    { value: 'non_weight_bearing', label: 'Non-weight-bearing (crutches, wheelchair, bed rest)' },
  ],
};
const CONTRALATERAL: EncounterField = {
  id: f('contralateral'), label: 'The other foot', kind: 'select', important: true,
  options: [
    { value: 'healthy', label: 'Examined — no ulcer, sensation and pulses intact' },
    { value: 'at_risk', label: 'Examined — at risk (neuropathy, PAD or deformity)', flag: 'amber', flagReason: 'The other foot is at risk: protect it while this one is offloaded (it takes the load).' },
    { value: 'ulcer', label: 'Has an ulcer too', flag: 'amber', flagReason: 'Bilateral foot disease: classify and treat the other ulcer as well.' },
    { value: 'amputated', label: 'Previous major amputation' },
    { value: 'not_examined', label: 'Not examined', flag: 'amber', flagReason: 'Examine both feet at every review (IWGDF 2023).' },
  ],
};
const CARE: EncounterSection = {
  id: f('care'),
  title: 'Offloading, foot team and footwear',
  fields: [
    OFFLOADING,
    {
      id: f('history'), label: 'Foot history', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'previous_ulcer', label: 'Previous foot ulcer' },
        { value: 'previous_minor', label: 'Previous minor amputation' },
        { value: 'previous_major', label: 'Previous major amputation' },
        { value: 'previous_revasc', label: 'Previous revascularisation' },
      ],
    },
    {
      id: f('presentation'), label: 'Time from the first sign of this problem to presentation here', kind: 'select',
      options: [
        { value: 'under_1w', label: 'Under 1 week' },
        { value: '1_4w', label: '1–4 weeks' },
        { value: 'over_4w', label: 'Over 4 weeks', flag: 'amber', flagReason: 'Late presentation: deeper infection, osteomyelitis and amputation are more likely — find out why (cost, distance, traditional treatment).' },
      ],
    },
    {
      id: f('footwear'), label: 'Usual footwear', kind: 'select',
      options: [
        { value: 'appropriate', label: 'Fits, protective, accommodates any deformity' },
        { value: 'inappropriate', label: 'Ill-fitting, open or worn out', flag: 'amber', flagReason: 'Ill-fitting footwear is the commonest trigger of diabetic foot ulcers (IWGDF 2023 prevention).' },
        { value: 'barefoot', label: 'Often walks barefoot (home, farm, place of worship)', flag: 'amber', flagReason: 'Barefoot walking with neuropathy: protective footwear indoors and outdoors (IWGDF 2023 prevention).' },
      ],
    },
    CONTRALATERAL,
    {
      id: f('foot_team'), label: 'Multidisciplinary foot team', kind: 'select',
      options: [
        { value: 'involved', label: 'Involved' },
        { value: 'to_refer', label: 'Not yet referred' },
        { value: 'unavailable', label: 'No foot team at this hospital' },
      ],
    },
  ],
};

// ── Pre-operative: the operation ────────────────────────────────────────────

const PLAN: EncounterSection = {
  id: f('plan'),
  title: 'The planned operation',
  fields: [
    {
      id: f('procedure'), label: 'Planned procedure', kind: 'multiselect', important: true,
      options: [
        { value: 'sharp_debridement', label: 'Sharp / surgical debridement' },
        { value: 'drainage', label: 'Incision and drainage of abscess' },
        { value: 'bone_resection', label: 'Resection of infected bone' },
        { value: 'toe_amputation', label: 'Toe amputation' },
        { value: 'ray_amputation', label: 'Ray amputation' },
        { value: 'tma', label: 'Transmetatarsal amputation' },
        { value: 'open_guillotine', label: 'Open (guillotine) amputation for sepsis, definitive later' },
      ],
    },
    {
      id: f('urgency'), label: 'Urgency', kind: 'select', important: true,
      options: [
        { value: 'emergency', label: 'Emergency (within hours — sepsis, gas, abscess, wet gangrene)' },
        { value: 'urgent', label: 'Urgent (within 24–48 hours)' },
        { value: 'planned', label: 'Planned' },
      ],
    },
    {
      id: f('revasc'), label: 'Revascularisation', kind: 'select',
      options: [
        { value: 'not_needed', label: 'Not needed — perfusion adequate' },
        { value: 'before', label: 'Planned before definitive surgery' },
        { value: 'after_source_control', label: 'After urgent source control' },
        { value: 'not_possible', label: 'Not possible / not available', flag: 'amber', flagReason: 'Ischaemic foot without a revascularisation option: healing is unlikely — honest discussion of the amputation level and goals.' },
        { value: 'not_assessed', label: 'Not yet assessed' },
      ],
    },
    {
      id: f('amputation_discussion'), label: 'Amputation discussed with the patient and family', kind: 'select',
      options: [
        { value: 'not_relevant', label: 'Not relevant now' },
        { value: 'minor', label: 'Discussed — minor (toe / ray / forefoot)' },
        { value: 'major', label: 'Discussed — major may be needed' },
        { value: 'not_yet', label: 'Not yet discussed', flag: 'amber', flagReason: 'If amputation is possible, discuss it before theatre — consent for the likely level, not only the hoped-for one.' },
      ],
    },
  ],
};

// ── Post-operative ──────────────────────────────────────────────────────────

const OPERATIVE: EncounterSection = {
  id: f('operative'),
  title: 'After debridement',
  fields: [
    {
      id: f('debridement_result'), label: 'Debridement achieved', kind: 'select', important: true,
      options: [
        { value: 'complete', label: 'To healthy, bleeding tissue' },
        { value: 'residual', label: 'Residual necrosis / infection left', flag: 'amber', flagReason: 'Residual necrosis or infection: re-look in theatre within 24–48 hours.' },
        { value: 'ischaemic_bed', label: 'Bed does not bleed (ischaemic)', flag: 'red', flagReason: 'A debrided bed that does not bleed is ischaemic: urgent vascular assessment — it will necrose further without revascularisation.' },
      ],
    },
    {
      id: f('wound_after'), label: 'Wound now', kind: 'multiselect',
      options: [
        { value: 'healthy', label: 'Healthy, granulating / clean' },
        { value: 'new_necrosis', label: 'New necrosis at the edges', flag: 'amber', flagReason: 'New necrosis after debridement: infection progressing or ischaemia — re-look and perfusion check.' },
        { value: 'spreading', label: 'Spreading cellulitis or tracking proximally', flag: 'red', flagReason: 'Infection spreading after debridement: urgent return to theatre.' },
        { value: 'pus', label: 'Pus', flag: 'amber', flagReason: 'Pus after debridement: undrained collection — explore.' },
      ],
    },
    {
      id: f('specimens'), label: 'Specimens sent at surgery', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None', flag: 'amber', flagReason: 'No deep tissue or bone culture: antibiotics cannot be targeted.' },
        { value: 'deep_tissue', label: 'Deep tissue for culture' },
        { value: 'bone_culture', label: 'Bone for culture' },
        { value: 'bone_histology', label: 'Bone for histology' },
        { value: 'proximal_margin', label: 'Proximal (clean-margin) bone separately' },
      ],
    },
    {
      id: f('margin_result'), label: 'Residual bone margin result', kind: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'clear', label: 'Clear — all infected bone removed' },
        { value: 'positive', label: 'Positive — infected bone remains' },
        { value: 'no_bone', label: 'No bone resected' },
      ],
    },
    { id: f('culture_result'), label: 'Culture result and sensitivities', kind: 'text' },
    OFFLOADING,
  ],
};

// ── Follow-up ───────────────────────────────────────────────────────────────

const OUTCOME: EncounterSection = {
  id: f('outcome'),
  title: 'Healing and prevention of recurrence',
  fields: [
    {
      id: f('ulcer_status'), label: 'Ulcer', kind: 'select', important: true,
      options: [
        { value: 'healed', label: 'Healed (epithelialised)' },
        { value: 'reducing', label: 'Smaller, healthy' },
        { value: 'not_reducing', label: 'Not smaller after 4 weeks of good care', flag: 'amber',
          flagReason: 'Not healing despite 4–6 weeks of good care: re-image the arteries whatever the bedside tests, and re-check offloading, infection and bone (IWGDF 2023 PAD and wound healing).' },
        { value: 'worse', label: 'Larger / deteriorating', flag: 'amber', flagReason: 'Deteriorating ulcer: re-assess infection, perfusion and offloading now.' },
        { value: 'recurred', label: 'Healed and recurred', flag: 'amber', flagReason: 'Recurrence: find the cause (footwear, adherence, a new pressure point).' },
      ],
    },
    {
      id: f('prevention'), label: 'Prevention in place', kind: 'multiselect',
      options: [
        { value: 'none', label: 'None' },
        { value: 'footwear', label: 'Therapeutic footwear / insoles' },
        { value: 'education', label: 'Foot-care education, daily self-inspection' },
        { value: 'podiatry', label: 'Regular podiatry (callus, nails)' },
        { value: 'temperature', label: 'Home foot-temperature monitoring' },
      ],
    },
    MONOFILAMENT,
    CONTRALATERAL,
    {
      id: f('antibiotics_done'), label: 'Antibiotic course', kind: 'select',
      options: [
        { value: 'not_given', label: 'None needed' },
        { value: 'completed', label: 'Completed' },
        { value: 'ongoing', label: 'Still taking' },
        { value: 'stopped_early', label: 'Stopped early (cost, side effects, supply)', flag: 'amber', flagReason: 'Antibiotic course not completed: check the infection and bone have settled.' },
      ],
    },
  ],
};

// ── Scores ──────────────────────────────────────────────────────────────────

const INFECTION_TO_WIFI: Record<string, FootInfectionSeverity> = {
  '1': 'none', '2': 'mild_local', '3': 'moderate_deeper', '4': 'severe_systemic',
};
const deepStructures = (a: EncounterAnswers) =>
  chosen(a, 'core.wound_exposed').filter((x): x is 'tendon' | 'bone' | 'joint' => x === 'tendon' || x === 'bone' || x === 'joint');
const areaOf = (a: EncounterAnswers) => {
  const area = numOf(a, 'core.wound_area');
  if (area != null) return area;
  const l = numOf(a, 'core.wound_length'), w = numOf(a, 'core.wound_width');
  return l != null && w != null ? Math.round(l * w * 10) / 10 : undefined;
};
const osteoSuspected = (a: EncounterAnswers) =>
  isOneOf(a, f('probe_to_bone'), 'positive') || isOneOf(a, f('xray'), 'osteomyelitis') || isOneOf(a, f('mri'), 'osteomyelitis')
  || isOneOf(a, f('bone_sample'), 'positive') || (numOf(a, f('esr')) ?? 0) > 70 || deepStructures(a).includes('bone');

/** WIfI component grades, by the vascular domain's computeWifi. */
export const wifiScore: ScoreRule = ({ phase, answers: a }) => {
  if (phase === 'post_op') return null;
  const gangrene = a[f('gangrene')];
  if (!gangrene && !a[f('wagner')] && !a[f('infection_grade')] && !pressuresFrom(a, f)) return null;
  const wound: VascularWoundSnapshot = {
    present: !isOneOf(a, f('wagner'), '0') && !isOneOf(a, f('ulcer_status'), 'healed'),
    areaCm2: areaOf(a),
    exposedStructure: deepStructures(a),
    heelInvolved: isOneOf(a, f('region'), 'hindfoot'),
    gangrene: typeof gangrene === 'string' ? gangrene as GangreneExtent : undefined,
  };
  const p = pressuresFrom(a, f);
  const grade = a[f('infection_grade')];
  const r = computeWifi({
    wound,
    perfusion: p ? { side: isOneOf(a, f('side'), 'left') ? 'left' : 'right', pressures: p,
      local: numOf(a, f('tcpo2')) != null ? [{ kind: 'tcpo2', value: numOf(a, f('tcpo2'))!, unit: 'mmHg', site: 'foot' }] : [] } : undefined,
    infection: typeof grade === 'string' && INFECTION_TO_WIFI[grade] ? {
      severity: INFECTION_TO_WIFI[grade],
      deeperStructuresInvolved: grade === '3' || grade === '4',
      systemicSigns: grade === '4',
      osteomyelitisSuspected: osteoSuspected(a),
    } : undefined,
  });
  const grades = [r.wound.grade, r.ischaemia.grade, r.footInfection.grade];
  const levelMap = { low: 'low', moderate: 'moderate', high: 'high', very_high: 'very_high', insufficient_data: 'none' } as const;
  const incomplete = [...(r.wound.missing ?? []), ...(r.ischaemia.missing ?? []), ...(r.footInfection.missing ?? [])];
  const i3 = r.ischaemia.grade === 3, f3 = r.footInfection.grade === 3;
  return {
    id: `${ID}.wifi`, name: 'WIfI (Wound, Ischaemia, foot Infection)', abbreviation: 'WIfI',
    total: r.complete ? Math.max(...(grades as number[])) : null, max: 3,
    band: {
      label: `${wifiShorthand(r)} — limb-threat signal: ${r.limbThreat.replace('_', ' ')}`,
      level: levelMap[r.limbThreat],
      interpretation: [r.wound.reason, r.ischaemia.reason, r.footInfection.reason, ...r.limbThreatBasis].join(' '),
    },
    incomplete,
    source: 'vascular/wifiEngine.computeWifi (SVS WIfI component grades; the total shown is the highest component grade — the SVS stage grid is not configured)',
    detail: [...(r.ischaemia.notUsed ?? []), r.svsStageNote],
    flag: i3 ? { level: 'red', reason: `WIfI ischaemia grade 3 (${r.ischaemia.decidedBy}): urgent vascular imaging and revascularisation assessment (IWGDF 2023 PAD; GVG 2019).` }
      : f3 ? { level: 'red', reason: 'WIfI foot infection grade 3: severe infection — urgent source control.' }
        : r.limbThreat === 'high' || r.limbThreat === 'very_high' ? { level: 'amber', reason: `WIfI ${wifiShorthand(r)}: high limb threat — foot team and vascular review.` } : undefined,
  };
};

/**
 * SINBAD (Ince 2008), via limbSalvageService.calculateSINBADScore, fed the
 * published item definitions from this review's answers. Ischaemia: at least
 * one palpable foot pulse is intact flow; with no palpable pulse it scores 1;
 * when pulses cannot be felt for oedema the Doppler waveform, ABI and toe
 * pressure decide. Depth: an exposed tendon / bone / joint, a positive
 * probe-to-bone or Wagner 2 or more reaches muscle, tendon or deeper.
 */
export const sinbadScore: ScoreRule = ({ phase, answers: a }) => {
  if (phase === 'post_op') return null;
  if (!a[f('region')]) return null;
  const abi = (() => {
    const p = pressuresFrom(a, f);
    const ankle = p?.ankleMmHg, arm = Math.max(p?.rightBrachialMmHg ?? 0, p?.leftBrachialMmHg ?? 0);
    return ankle && arm ? ankle / arm : undefined;
  })();
  const toe = numOf(a, f('toe_pressure'));
  const pulses = a[f('pedal_pulses')];
  const reducedPedalFlow = pulses === 'both' || pulses === 'one' ? false
    : pulses === 'none' ? true
      : isOneOf(a, f('waveform'), 'monophasic', 'absent') || (toe != null && toe < 30) || (abi != null && abi < 0.9) ? true
        : isOneOf(a, f('waveform'), 'triphasic', 'biphasic') ? false : undefined;
  const grade = a[f('infection_grade')];
  const mono = a[f('monofilament')];
  const deep = deepStructures(a).length > 0 || isOneOf(a, f('probe_to_bone'), 'positive') || isOneOf(a, f('wagner'), '2', '3', '4', '5');
  const r = calculateSINBADScore({
    site: String(a[f('region')]),
    reducedPedalFlow,
    protectiveSensationLost: mono === 'lost' ? true : mono === 'intact' ? false : undefined,
    infection: grade === '1' ? false : grade === '2' || grade === '3' || grade === '4' ? true : undefined,
    areaCm2: areaOf(a),
    deepToMuscleOrTendon: deep ? true : isOneOf(a, f('wagner'), '0', '1') ? false : undefined,
  });
  const LABEL: Record<string, string> = {
    site: 'Ulcer site', ischemia: 'Foot pulses (or Doppler / toe pressure)', neuropathy: 'Protective sensation (monofilament)',
    bacterialInfection: 'Infection grade', area: 'Ulcer area (wound assessment)', depth: 'Depth (Wagner grade or exposed structures)',
  };
  return {
    id: `${ID}.sinbad`, name: 'SINBAD', abbreviation: 'SINBAD', total: r.total, max: 6,
    band: {
      label: r.severe ? 'SINBAD 3 or more' : 'SINBAD under 3',
      level: r.severe ? 'high' : 'low',
      interpretation: `Site ${r.site}, Ischaemia ${r.ischemia}, Neuropathy ${r.neuropathy}, Bacterial infection ${r.bacterialInfection}, Area ${r.area}, Depth ${r.depth}. A score of 3 or more is associated with longer healing times (Ince 2008); IWGDF 2023 recommends SINBAD for communication between professionals and audit.`,
    },
    incomplete: r.missing.map(m => LABEL[m]),
    detail: r.missing.length ? ['Unassessed items score 0: the total is a minimum.'] : undefined,
    source: 'limbSalvageService.calculateSINBADScore (Ince P et al. Diabetes Care 2008;31:964-7)',
  };
};

/** IWGDF 2023 risk stratification for ulceration, and its screening interval. */
export const iwgdfRiskScore: ScoreRule = ({ phase, answers: a }) => {
  // For a person whose ulcer has healed or is healing: this episode is itself
  // a history of foot ulcer, so LOPS or PAD puts them in category 3.
  if (phase !== 'follow_up') return null;
  if (!a[f('monofilament')] || isOneOf(a, f('monofilament'), 'not_tested')) return null;
  const lops = isOneOf(a, f('monofilament'), 'lost');
  const pad = isOneOf(a, 'core.pvd', 'suspected', 'confirmed', 'revascularised') || (numOf(a, f('toe_pressure')) ?? 999) < 30;
  // Category 0 needs PAD to have been looked for: with intact sensation and no
  // PAD assessment the category is unknown, not "very low risk".
  const padAssessed = answered(a, 'core.pvd') || answered(a, f('toe_pressure'));
  if (!lops && !pad && !padAssessed) {
    return {
      id: `${ID}.iwgdf_risk`, name: 'IWGDF risk category', abbreviation: 'IWGDF risk', total: null, max: 3,
      band: null,
      incomplete: ['Peripheral arterial disease status (pulses, ABI / toe pressure)'],
      source: 'IWGDF 2023 Guidelines on the prevention of foot ulcers in persons with diabetes',
      detail: ['Protective sensation is intact, but without a PAD assessment the risk category cannot be set — after a foot ulcer it is category 3 if PAD is present.'],
    };
  }
  const cat = lops || pad ? 3 : 0;
  const b = cat === 3
    ? { label: 'IWGDF 3 — high risk', level: 'high' as const, interval: 'every 1–3 months' }
    : { label: 'IWGDF 0 — very low risk (no LOPS, no PAD)', level: 'none' as const, interval: 'once a year' };
  return {
    id: `${ID}.iwgdf_risk`, name: 'IWGDF risk category', abbreviation: 'IWGDF risk', total: cat, max: 3,
    band: { label: b.label, level: b.level, interpretation: `${b.label}: foot screening ${b.interval} (IWGDF 2023 prevention guideline).` },
    incomplete: answered(a, 'core.pvd') ? [] : ['Peripheral arterial disease status'],
    source: 'IWGDF 2023 Guidelines on the prevention of foot ulcers in persons with diabetes (risk stratification: LOPS or PAD with a history of foot ulcer = category 3)',
    detail: [b.interval],
  };
};

// ── Rules ───────────────────────────────────────────────────────────────────

const goals: PlanRule = () => ({
  problem: {
    goals: [
      L('Control the infection and remove all dead and infected tissue', 'Purpose of diabetic foot debridement (IWGDF/IDSA 2023)'),
      L('Save the limb and keep the patient walking — at the most distal level that will heal', 'Limb salvage is the aim (IWGDF 2023)'),
      L('A healed ulcer, then no recurrence (footwear, education, foot screening)', 'Recurrence is common: about 40% within a year of healing (Armstrong, NEJM 2017)'),
    ],
  },
});

const classification: PlanRule = ctx => {
  if (ctx.phase === 'post_op') return null;
  const w = ctx.scores[`${ID}.wifi`], s = ctx.scores[`${ID}.sinbad`];
  const parts: PlanContribution[] = [];
  if (w?.band) parts.push({ problem: { monitoring: [L(`Record the classification at every review: ${w.band.label}${s?.total != null ? `; SINBAD ${s.total}/6` : ''}`, 'IWGDF 2023 classification guideline: SINBAD for communication, WIfI for perfusion and amputation risk')] } });
  if (w && w.incomplete.length) parts.push({ problem: { investigations: [L(`Complete the WIfI grading: ${w.incomplete.join(', ')}`, 'WIfI incomplete — limb threat cannot be judged without it')] } });
  return merge(...parts);
};

const infection: PlanRule = ctx => {
  if (ctx.phase === 'post_op') return null;
  const a = ctx.answers;
  const g = a[f('infection_grade')];
  const emergency = chosen(a, f('surgical_emergency'));
  const parts: PlanContribution[] = [];
  const systemic = ctx.scores.iwii?.total === 4;
  if (g === '4') {
    parts.push({ problems: [{ problem: 'Severe diabetic foot infection', lines: {
      investigations: [
        L('Blood cultures before antibiotics; FBC, CRP, U&E, lactate, glucose and ketones', 'IWGDF/IDSA grade 4 — severe infection', 'urgent'),
      ],
      treatment: [
        L('Admit; IV broad-spectrum antibiotics covering Gram-positive cocci, Gram-negatives and anaerobes per the local antibiogram, after cultures; rationalise to deep-tissue results', 'IWGDF/IDSA grade 4 (IWGDF/IDSA 2023)', 'urgent'),
        L('Urgent surgical source control (drainage, debridement, open amputation of dead tissue) — do not delay it for vascular imaging or revascularisation', 'Severe infection: source control first, revascularise within days (IWGDF 2023 PAD)', 'urgent'),
        ...(systemic ? [] : [L('Sepsis bundle within 1 hour: lactate, blood cultures, IV antibiotics, 30 mL/kg crystalloid for hypotension or lactate 4 mmol/L or more', 'Severe infection with systemic response (Surviving Sepsis Campaign 2021)', 'urgent')]),
      ],
      referrals: [L('Anaesthesia and critical care review; diabetes team for insulin infusion', 'Severe diabetic foot infection', 'urgent')],
    } }] });
  } else if (g === '3') {
    parts.push({ problem: {
      investigations: [L('Deep tissue (curettage or biopsy after cleansing and debridement) for culture — not a superficial swab', 'IWGDF/IDSA grade 3 (IWGDF/IDSA 2023)', 'urgent')],
      treatment: [L('Antibiotics per the local antibiogram, IV at first if the infection is extensive or the patient cannot take oral; 1–2 weeks for skin and soft tissue, longer if slow to settle', 'Moderate diabetic foot infection (IWGDF/IDSA 2023)', 'urgent')],
      referrals: [L('Surgical opinion within 24 hours: moderate infections often need debridement or drainage', 'IWGDF/IDSA grade 3', 'urgent')],
    } });
  } else if (g === '2') {
    parts.push({ problem: { treatment: [L('Oral antibiotic active against Staphylococcus aureus and streptococci for 1–2 weeks; review in 2–3 days', 'Mild diabetic foot infection (IWGDF/IDSA 2023)')] } });
  } else if (g === '1') {
    parts.push({ problem: { treatment: [L('No antibiotics for an uninfected ulcer — treat with debridement, offloading and perfusion', 'IWGDF/IDSA grade 1: antibiotics do not help healing or prevent infection (IWGDF/IDSA 2023)')] } });
  }
  if (emergency.length) {
    parts.push({ problem: { treatment: [L('Emergency theatre (within hours): drain, open compartments and tendon sheaths, excise all necrotic tissue; leave the wound open; send deep tissue and bone', `Surgical emergency: ${emergency.join(', ').replace(/_/g, ' ')} (IWGDF/IDSA 2023)`, 'urgent')] } });
  }
  if (isOneOf(a, f('gangrene'), 'wet_toe')) {
    parts.push({ problem: { treatment: [L('Wet gangrene: urgent open amputation of the dead part with drainage; definitive closure once infection is controlled', 'Wet (infected) gangrene', 'urgent')] } });
  } else if (isOneOf(a, f('gangrene'), 'dry_toe') && !isOneOf(a, f('infection_grade'), '3', '4')) {
    parts.push({ problem: { treatment: [L('Dry toe gangrene: keep it dry and padded; amputate after perfusion is assessed (and revascularised if needed) and the line of demarcation is clear', 'Dry gangrene without spreading infection')] } });
  }
  return merge(...parts);
};

const osteomyelitis: PlanRule = ctx => {
  if (ctx.phase === 'post_op') return null;
  const a = ctx.answers;
  if (!osteoSuspected(a)) return null;
  const imaged = !isOneOf(a, f('xray'), 'not_done') && !!a[f('xray')];
  // The core already asks for X-ray / MRI and bone biopsy when bone is exposed.
  const coreAsks = deepStructures(a).includes('bone');
  return merge(
    !imaged && !coreAsks && { problem: { investigations: [L('Plain X-ray of the foot (repeat in 2–4 weeks if normal and suspicion persists)', 'Possible osteomyelitis (IWGDF/IDSA 2023)')] } },
    !answered(a, f('esr')) && { problem: { investigations: [L('ESR and CRP (ESR above 70 mm/h supports osteomyelitis)', 'Possible osteomyelitis (IWGDF/IDSA 2023)')] } },
    isOneOf(a, f('mri'), 'not_needed') || !a[f('mri')]
      ? { problem: { investigations: [L('MRI when the diagnosis remains uncertain after probe-to-bone, X-ray and inflammatory markers (white-cell or PET imaging if MRI is contraindicated)', 'Osteomyelitis not yet confirmed (IWGDF/IDSA 2023)')] } } : null,
    !coreAsks && !isOneOf(a, f('bone_sample'), 'sent', 'positive', 'negative') && { problem: { investigations: [L('Bone sample (percutaneous or at surgery) for culture and histology; where safe, after a 2-week antibiotic-free window', 'Diabetic foot osteomyelitis (IWGDF/IDSA 2023)')] } },
    { problem: { treatment: [L('Osteomyelitis: resect the infected bone (then a short course if the margin is clear, about 3 weeks if a residual margin is positive), or treat a forefoot osteomyelitis without abscess or necrosis with antibiotics alone for 6 weeks', 'Diabetic foot osteomyelitis (IWGDF/IDSA 2023)')] } },
  );
};

const perfusion: PlanRule = ctx => {
  if (ctx.phase === 'post_op') return null;
  const a = ctx.answers;
  const abi = ctx.scores[`${ID}.abi`], wifi = ctx.scores[`${ID}.wifi`];
  const severe = severeIschaemia(a, f, abi?.total);
  const parts: PlanContribution[] = [];
  if (severe || wifi?.flag?.reason.startsWith('WIfI ischaemia grade 3')) {
    parts.push({ problem: { referrals: [L('Urgent vascular imaging (duplex, CT or digital subtraction angiography) and a revascularisation decision with the vascular team', `${severe ?? 'WIfI ischaemia grade 3'} — IWGDF 2023 PAD threshold`, 'urgent')] } });
  }
  if (abi?.band?.label.startsWith('Non-compressible') && !answered(a, f('toe_pressure'))) {
    parts.push({ problem: { investigations: [L('Toe pressure / TBI (or TcPO2): the ankle index is non-compressible and cannot exclude PAD', 'ABI above 1.40 (IWGDF 2023 PAD)')] } });
  }
  const measured = answered(a, f('ankle_pressure')) || answered(a, f('toe_pressure')) || answered(a, f('tcpo2'));
  const coreAsks = isOneOf(a, 'core.perfusion', 'doubtful', 'poor') || isOneOf(a, 'core.pvd', 'suspected');
  if (!measured && !coreAsks) {
    parts.push({ problem: { investigations: [L('Doppler pedal waveforms, ABI and toe pressure / TBI for every diabetic foot ulcer — a normal ABI does not exclude PAD; TBI 0.75 or more with triphasic waveforms makes it less likely', 'No perfusion measurement recorded (IWGDF 2023 PAD)')] } });
  }
  if ((severe || isOneOf(a, 'core.pvd', 'confirmed')) && isOneOf(a, f('infection_grade'), '3', '4')) {
    parts.push({ cautions: ['Infection and ischaemia together: drain and debride now, then revascularise within days — waiting for revascularisation lets infection destroy the foot (IWGDF 2023 PAD).'] });
  }
  if (isOneOf(a, f('revasc'), 'not_possible')) {
    parts.push({ counselling: [P('Healing without revascularisation', 'With poor circulation that cannot be improved, the wound may not heal and a higher amputation may be the safer choice; we will discuss the options and your wishes.', 'Revascularisation not possible (IWGDF 2023 PAD)')] });
  }
  if (isOneOf(a, 'core.renal', 'ckd_3', 'ckd_4_5', 'dialysis') && (severe || isOneOf(a, f('revasc'), 'before', 'after_source_control'))) {
    parts.push({ comorbidities: [{ condition: 'Kidney disease', actions: [L('Before contrast angiography: hydration plan, hold metformin and nephrotoxins, creatinine 48–72 hours afterwards; duplex first where it answers the question', 'Contrast with impaired kidney function (KDIGO AKI 2012)')] }] });
  }
  return merge(...parts);
};

const neuropathy: PlanRule = ctx => {
  const a = ctx.answers;
  return merge(
    isOneOf(a, f('monofilament'), 'not_tested') && { problem: { investigations: [L('10 g monofilament at 3 plantar sites per foot (and a 128 Hz tuning fork)', 'Protective sensation not tested (IWGDF 2023)')] } },
    hasAny(a, f('deformity'), 'charcot_active') && { problems: [{ problem: 'Possible active Charcot neuro-osteoarthropathy', lines: {
      investigations: [L('Weight-bearing foot and ankle X-ray; MRI if the X-ray is normal; compare skin temperature with the other foot', 'Warm, swollen neuropathic foot (IWGDF 2023 Charcot guideline)', 'urgent')],
      treatment: [castUnsafe(ctx)
        ? L('Immobilise and offload now in a removable knee-high device, non-weight-bearing where possible, until the infection or ischaemia is controlled — then a non-removable knee-high device (TCC); inspect the foot daily', `Active Charcot with ${castUnsafeWhy(ctx)}: a non-removable cast is contraindicated (IWGDF 2023 Charcot and offloading guidelines)`, 'urgent')
        : L('Immobilise and offload now in a non-removable knee-high device (TCC); distinguish from infection — the two can coexist', 'Active Charcot (IWGDF 2023 Charcot guideline)', 'urgent')],
    } }] },
  );
};

/**
 * A non-removable cast hides the foot: contraindicated with a moderate or
 * severe infection or with moderate / severe ischaemia (IWGDF 2023
 * offloading guideline) — use a removable knee-high device and inspect daily.
 */
const castUnsafe = (ctx: PlanContext) => isOneOf(ctx.answers, f('infection_grade'), '3', '4') || pad(ctx);
const castUnsafeWhy = (ctx: PlanContext) => isOneOf(ctx.answers, f('infection_grade'), '3', '4')
  ? `infection grade ${String(ctx.answers[f('infection_grade')])}` : 'significant ischaemia';

const offloading: PlanRule = ctx => {
  const a = ctx.answers;
  // A healed ulcer at follow-up needs footwear (followUpRule), not a cast.
  if (ctx.phase === 'follow_up' && isOneOf(a, f('ulcer_status'), 'healed')) return null;
  const off = a[f('offloading')];
  const plantarFore = isOneOf(a, f('region'), 'forefoot', 'midfoot');
  const heel = isOneOf(a, f('region'), 'hindfoot');
  const parts: PlanContribution[] = [];
  if (!off || isOneOf(a, f('offloading'), 'none', 'footwear', 'ankle_high')) {
    parts.push({ problem: { treatment: [L(
      heel
        ? 'Offload the heel: knee-high device or heel-offloading boot, heel free in bed; non-weight-bearing where possible'
        : castUnsafe(ctx)
          ? 'Offload in a removable knee-high device (non-removable casts are contraindicated with a moderate or severe infection or significant ischaemia); inspect the foot daily; non-weight-bearing where possible'
          : 'Offload in a non-removable knee-high device (total contact cast or a walker made irremovable); removable knee-high walker if non-removable is contraindicated; ankle-high devices only if knee-high is impossible',
      `${plantarFore ? 'Plantar fore- / midfoot' : heel ? 'Heel' : 'Diabetic foot'} ulcer; offloading ${off ? String(off).replace(/_/g, ' ') : 'not recorded'}${castUnsafe(ctx) ? `; ${castUnsafeWhy(ctx)}` : ''} (IWGDF 2023 offloading)`,
      ctx.phase === 'pre_op' ? 'routine' : 'urgent')] } });
    parts.push({ general: [G('Wound care and dressings', L('Where a cast or walker cannot be bought: felted foam with an improvised irremovable dressing, crutches or a wheelchair, and a dated plan to obtain a device', 'Low-cost offloading (IWGDF 2023 offloading — when knee-high devices are unavailable)'))] });
  }
  if (isOneOf(a, f('offloading'), 'non_removable') && castUnsafe(ctx)) {
    parts.push({ cautions: ['Non-removable cast with a moderate or severe infection or uncontrolled ischaemia is contraindicated: use a removable device and inspect daily (IWGDF 2023 offloading).'] });
  }
  return merge(...parts);
};

const team: PlanRule = ctx => {
  const a = ctx.answers;
  const parts: PlanContribution[] = [];
  if (ctx.phase !== 'post_op') {
    parts.push({ problem: { referrals: [L(
      isOneOf(a, f('foot_team'), 'unavailable')
        ? 'No foot team here: a named consultant coordinates, with telephone / tele-review by vascular surgery, diabetes, podiatry or orthotics, and the wound nurse'
        : 'Multidisciplinary foot team (surgeon, diabetologist, vascular, podiatry, orthotist, wound nurse): within 1 working day for an active diabetic foot problem, immediately if limb- or life-threatening',
      'NICE NG19 (2015, updated 2019); IWGDF 2023',
      isOneOf(a, f('infection_grade'), '4') ? 'urgent' : 'routine')] } });
  }
  if (isOneOf(a, f('contralateral'), 'at_risk', 'ulcer', 'not_examined')) {
    parts.push({ general: [G('Pressure care', L('Protect the other foot: examine it at every review, heel protectors in bed, and protective footwear while the ulcerated foot is offloaded', `Other foot ${String(a[f('contralateral')]).replace(/_/g, ' ')} (IWGDF 2023)`))] });
  }
  if (isOneOf(a, f('footwear'), 'barefoot', 'inappropriate')) {
    parts.push({ general: [G('Patient education', L('Never walk barefoot, indoors or out (including at home, on the farm and at places of worship); shoes that fit, with socks, checked inside before wearing', `Footwear: ${String(a[f('footwear')])} (IWGDF 2023 prevention)`))] });
  }
  if (isOneOf(a, f('presentation'), 'over_4w')) {
    parts.push({ counselling: [P('Coming early', 'Any new wound, colour change, swelling or warmth in the foot needs to be seen within a day — delay is the commonest reason a foot is lost.', 'Late presentation (IWGDF 2023)')] });
  }
  return merge(...parts);
};

const glycaemiaFoot: PlanRule = ctx => {
  const a = ctx.answers;
  if (!isOneOf(a, 'core.diabetes', 'oral', 'insulin', 'diet')) return null;
  return merge(
    isOneOf(a, f('infection_grade'), '3', '4') && { comorbidities: [{ condition: 'Diabetes', actions: [
      L('Infection raises glucose and insulin needs: diabetes team review, insulin rather than oral agents while acutely unwell; check ketones if glucose is above 14 mmol/L or the patient is vomiting', 'Moderate / severe diabetic foot infection (JBDS-IP)'),
    ] }] },
    ctx.phase === 'follow_up' && { comorbidities: [{ condition: 'Diabetes', actions: [L('HbA1c every 3 months; agree an individual target with the diabetes team; review blood pressure, lipids and the renal profile', 'Diabetic foot disease marks high cardiovascular and renal risk (NICE NG28; NICE NG19)')] }] },
  );
};

const preOp: PlanRule = ctx => {
  if (ctx.phase !== 'pre_op') return null;
  const a = ctx.answers;
  const proc = chosen(a, f('procedure'));
  return merge(
    isOneOf(a, f('amputation_discussion'), 'not_yet') && { problem: { treatment: [L('Discuss and consent for the likely level of amputation, not only the hoped-for debridement; the final level is decided at surgery by the tissue found', 'Amputation possible but not yet discussed')] } },
    proc.some(p => ['toe_amputation', 'ray_amputation', 'tma', 'open_guillotine'].includes(p)) && { general: [G('Anaesthesia and theatre',
      L('Send the resected bone in two pots: the infected bone, and a separate clean proximal margin for culture and histology', 'Minor amputation for osteomyelitis — the margin decides the antibiotic duration (IWGDF/IDSA 2023)'))] },
    { general: [G('Anaesthesia and theatre',
      L('Ankle block or popliteal-sciatic block suits most forefoot surgery in the frail; avoid a tourniquet in an ischaemic limb', 'Diabetic foot surgery in high-risk patients'))] },
    { general: [G('Wound care and dressings', L('Leave the debrided wound open, packed or under NPWT; plan delayed closure, graft or minor flap once infection is controlled', 'Infected diabetic foot wounds are not closed primarily'))] },
    { counselling: [
      P('Debridement', 'The wound will look larger after the dead tissue is removed; more than one operation is common.', 'Diabetic foot debridement (procedure education record)'),
      P('Offloading', 'Healing depends on keeping weight off the wound every time you stand, for weeks to months.', 'IWGDF 2023 offloading'),
    ] },
  );
};

const postOp: PlanRule = ctx => {
  if (ctx.phase !== 'post_op') return null;
  const a = ctx.answers;
  const wound = chosen(a, f('wound_after'));
  const margin = a[f('margin_result')];
  return merge(
    (isOneOf(a, f('debridement_result'), 'residual') || wound.includes('new_necrosis') || wound.includes('pus')) && { problem: { treatment: [L('Return to theatre for a re-look and further debridement within 24–48 hours', 'Residual / progressing necrosis or pus after debridement', 'urgent')] } },
    wound.includes('spreading') && { problem: { treatment: [L('Return to theatre today: infection is spreading after debridement — explore proximally along the tendon sheaths', 'Spreading infection after debridement', 'urgent')] } },
    (isOneOf(a, f('debridement_result'), 'ischaemic_bed') || wound.includes('new_necrosis')) && { problem: { referrals: [L('Vascular team review today: a non-bleeding or necrosing bed needs revascularisation to heal', 'Ischaemic wound bed after debridement (IWGDF 2023 PAD)', 'urgent')] } },
    margin === 'clear' && { problem: { treatment: [L('All infected bone removed with a clear margin: a short post-operative antibiotic course (a few days) for any residual soft-tissue infection', 'Clear residual bone margin (IWGDF/IDSA 2023)')] } },
    margin === 'positive' && { problem: { treatment: [L('Residual bone margin positive: about 3 weeks of antibiotics directed by the bone culture', 'Positive residual bone margin after minor amputation (IWGDF/IDSA 2023)')] } },
    hasAny(a, f('specimens'), 'none') && { cautions: ['No deep tissue or bone was sent: antibiotics remain empirical — send tissue at the next debridement.'] },
    (!a[f('offloading')] || isOneOf(a, f('offloading'), 'none', 'footwear')) && { general: [G('Rehabilitation (physiotherapy / OT)', L('Physiotherapy: non-weight-bearing or heel-weight-bearing gait with a frame or crutches; post-operative offloading shoe or walker before mobilising', 'No offloading after foot surgery (IWGDF 2023 offloading)'))] },
    { dischargeCriteria: [
      'Infection controlled: no spreading erythema, afebrile, inflammatory markers falling',
      'Offloading device fitted and its use demonstrated (teach-back)',
      'Dressing plan with the nearest health centre, and supplies',
      'Glucose plan agreed with the diabetes team',
      'Foot-clinic review booked within 1–2 weeks; antibiotic course and duration written',
    ] },
  );
};

const followUpRule: PlanRule = ctx => {
  if (ctx.phase !== 'follow_up') return null;
  const a = ctx.answers;
  const risk = ctx.scores[`${ID}.iwgdf_risk`];
  const st = a[f('ulcer_status')];
  const prevention = chosen(a, f('prevention'));
  return merge(
    (st === 'not_reducing' || st === 'worse') && { problem: {
      investigations: [L('Vascular imaging even if bedside tests were acceptable; repeat X-ray / ESR for osteomyelitis', `Ulcer ${String(st).replace('_', ' ')} (IWGDF 2023 PAD and wound healing)`, 'urgent')],
      treatment: [L('Re-check offloading (is it worn at every step?), infection and the wound bed before adding an adjunct; consider sucrose-octasulfate dressing for a non-infected neuro-ischaemic ulcer, NPWT after surgery, or leucocyte–platelet–fibrin patch where available', 'Non-healing diabetic foot ulcer (IWGDF 2023 wound healing guideline)')],
    } },
    st === 'healed' && { problem: { treatment: [L('Healed: therapeutic footwear with demonstrated plantar pressure relief, worn at all times; integrated foot care with podiatry', 'Healed plantar ulcer — recurrence prevention (IWGDF 2023 prevention)')] } },
    risk?.band && { problem: { monitoring: [L(`Foot screening ${risk.detail?.[0] ?? 'by risk category'} once healed, by a trained professional`, `${risk.band.label} (IWGDF 2023 prevention)`)] } },
    risk && !risk.band && { problem: { investigations: [L('Assess for PAD (pedal pulses, ABI and toe pressure) to set the foot-screening interval', 'IWGDF risk category cannot be set without PAD status (IWGDF 2023 prevention)')] } },
    !prevention.includes('education') && { general: [G('Patient education', L('Daily foot inspection (use a mirror or a family member), wash and dry between the toes, moisturise but not between the toes, cut nails straight; never self-treat corns or callus; come within a day for any new wound, colour change or swelling', 'Foot self-care education (IWGDF 2023 prevention)'))] },
    isOneOf(a, f('antibiotics_done'), 'stopped_early') && { problem: { investigations: [L('CRP / ESR and re-examination for persistent infection or osteomyelitis', 'Antibiotic course stopped early')] } },
  );
};

// ── The module ──────────────────────────────────────────────────────────────

const pad = (c: PlanContext) =>
  !!severeIschaemia(c.answers, f, c.scores[`${ID}.abi`]?.total) || /\bI[23]\b/.test(c.scores[`${ID}.wifi`]?.band?.label ?? '');

export const diabeticFootDebridement: ProcedureModule = {
  id: ID,
  name: 'Diabetic foot debridement (drainage / minor amputation)',
  summary: 'Diabetic foot ulcer and infection: SINBAD / Wagner / WIfI, perfusion with ABI / TBI, IWGDF/IDSA infection grade, osteomyelitis, offloading and the foot team.',
  group: 'diabetic_foot',
  phases: ['wound_review', 'pre_op', 'post_op', 'follow_up'],
  problemLabel: 'Diabetic foot ulcer / infection',
  basis: [
    'IWGDF Guidelines on the prevention and management of diabetic-related foot disease 2023 (classification, offloading, PAD, wound healing, prevention, Charcot)',
    'IWGDF/IDSA Guidelines on the diagnosis and treatment of diabetes-related foot infections 2023',
    'IWGDF/ESVS/SVS Intersocietal guideline on PAD in diabetes and a foot ulcer 2023; Global Vascular Guidelines on CLTI 2019',
    'NICE NG19 Diabetic foot problems: prevention and management (2015, updated 2019)',
    'SVS WIfI classification (Mills 2014); SINBAD (Ince 2008); Wagner 1981',
    'Surviving Sepsis Campaign 2021; JBDS-IP peri-operative diabetes guidance; KDIGO AKI 2012',
  ],
  catalog: {
    feeIds: ['intermediate-003', 'major-005', 'diabetic-001'],
    educationId: 'WOUND-002',
    patientEducationIds: ['systemic-diabetes-surgery', 'nutrition-diabetes-healing', 'vascular-pad'],
  },
  sections: {
    wound_review: [CLASSIFY, NEURO, PERFUSION, INFECTION, CARE],
    pre_op: [CLASSIFY, NEURO, PERFUSION, INFECTION, CARE, PLAN],
    post_op: [CLASSIFY, OPERATIVE],
    follow_up: [CLASSIFY, OUTCOME],
  },
  includeCore: { pre_op: ['wound_assessment'], follow_up: ['wound_assessment', 'healing_barriers'] },
  carryForward: [f('side'), f('region'), f('wagner'), f('gangrene'), f('monofilament'), f('contralateral')],
  scores: [wifiScore, sinbadScore, abiScore(ID, f, a => !!a[f('region')]), tbiScore(ID, f), iwgdfRiskScore],
  planRules: [goals, classification, infection, osteomyelitis, perfusion, neuropathy, offloading, team, glycaemiaFoot, preOp, postOp, followUpRule],
  consent: {
    procedureName: 'Debridement of diabetic foot (with drainage and removal of dead or infected tissue or bone; toe / ray amputation if needed)',
    phases: ['pre_op', 'wound_review'],
    intendedBenefits: [
      'Remove dead and infected tissue and drain pus so the infection can be controlled',
      'Give the foot the best chance of healing and of avoiding a bigger amputation',
      'Obtain deep tissue or bone to choose the right antibiotic',
    ],
    risks: [
      { name: 'Further operations', description: 'More than one debridement is often needed; the wound is usually left open and closed or grafted later' },
      { name: 'Amputation', description: 'If infection or poor circulation cannot be controlled, part of the foot or the leg may need to be removed', frequency: 'About 1 in 5 moderate or severe foot infections (IWGDF/IDSA 2023)' },
      { name: 'Slow healing', description: 'Healing takes weeks to months and depends on offloading, circulation and blood-sugar control' },
      { name: 'Ulcer recurrence', description: 'A new ulcer after healing is common without protective footwear and foot care', frequency: 'About 40% within 1 year (Armstrong, NEJM 2017)' },
      { name: 'Transfer lesion', description: 'After a toe or ray is removed, pressure shifts and a new ulcer can form nearby' },
    ],
    alternatives: [
      'Antibiotics and dressings alone (only reasonable for mild infection or forefoot osteomyelitis without abscess or dead tissue)',
      'Bedside sharp debridement without anaesthesia in a numb foot, where the extent allows',
      'Revascularisation first, where infection is not severe and the foot is ischaemic',
      'Primary major amputation, when the foot cannot be saved or the patient chooses it',
    ],
    riskOfNotTreating: 'Dead and infected tissue in a diabetic foot spreads along tendons and into bone; without surgery the infection can cost the foot or the leg, and severe infection can cause sepsis and death.',
    anaesthesiaOptions: ['local', 'regional', 'spinal', 'general'],
    additionalProcedures: [
      'Removal of a toe, a ray or infected bone if found at surgery',
      'Negative-pressure wound therapy',
      'Later closure, skin graft or local flap',
      'Angiography / revascularisation by the vascular team',
    ],
    photography: true,
    bloodProducts: 'unlikely',
    specimen: true,
    counsellingTopics: [
      'Why offloading must be used at every step, and for how long',
      'The possibility of losing a toe, part of the foot or the leg, and how that decision is made',
      'Blood-sugar control as part of the treatment',
      'Daily foot checks and protective footwear for life',
      'The other foot is also at risk',
    ],
    modifiers: [
      { id: 'dfu_ischaemia', when: c => pad(c),
        text: 'Because the circulation to your foot is severely reduced, the wound may not heal without a procedure to improve the blood flow, and an amputation is more likely.',
        why: 'Severe ischaemia by IWGDF 2023 thresholds / WIfI ischaemia grade' },
      { id: 'dfu_renal', when: c => isOneOf(c.answers, 'core.renal', 'ckd_4_5', 'dialysis'),
        text: 'Kidney failure slows healing and increases the risks of infection, amputation and of not surviving major foot disease.',
        why: 'CKD 4–5 / dialysis' },
      { id: 'dfu_glucose', when: c => (numOf(c.answers, 'core.hba1c') ?? 0) > 8.5 || (numOf(c.answers, 'core.glucose') ?? 0) > 12,
        text: 'Your blood sugar is high at present, which makes the infection harder to control and healing slower; bringing it down is part of the treatment.',
        why: 'HbA1c above 8.5% or glucose above 12 mmol/L' },
      { id: 'dfu_osteo', when: c => osteoSuspected(c.answers),
        text: 'Infection in the bone usually means removing the infected bone or a long course of antibiotics, and a higher chance of further surgery.',
        why: 'Osteomyelitis suspected or confirmed' },
      { id: 'dfu_late', when: c => isOneOf(c.answers, f('presentation'), 'over_4w'),
        text: 'Because the infection has been present for some weeks, more tissue may need to be removed and an amputation is more likely.',
        why: 'Late presentation (over 4 weeks)' },
      { id: 'dfu_heel', when: c => isOneOf(c.answers, f('region'), 'hindfoot'),
        text: 'Heel wounds heal more slowly than forefoot wounds and are more likely to lead to amputation.',
        why: 'Hindfoot / heel ulcer (SINBAD)' },
    ],
  },
  followUp: {
    wound_review: [
      { when: '2–3 days', purpose: 'Infection response to antibiotics and debridement (mild / moderate infection)' },
      { when: 'Weekly', purpose: 'Foot clinic: debridement, offloading check, measurement' },
    ],
    pre_op: [{ when: '24–48 hours after surgery', purpose: 'Wound inspection and decision on a re-look' }],
    post_op: [
      { when: '24–48 hours', purpose: 'Re-look or dressing change; review cultures and rationalise antibiotics' },
      { when: '1–2 weeks after discharge', purpose: 'Foot clinic: wound, offloading, glucose, bone result' },
    ],
    follow_up: [
      { when: 'Every 1–2 weeks until healed', purpose: 'Wound measurement, offloading, infection' },
      { when: 'After healing, by IWGDF risk category', purpose: 'Foot screening (every 1–3 months for category 3)' },
    ],
  },
  handoffs: [
    { label: 'Limb salvage (diabetic foot pathway)', route: '/limb-salvage', when: 'Full limb-salvage assessment and staging' },
    { label: 'Vascular assessment (ABI, toe pressures, WIfI)', route: '/vascular', phases: ['wound_review', 'pre_op', 'follow_up'], when: 'Any absent pulse, abnormal index or non-healing ulcer' },
    { label: 'WoundProgress Monitor', route: '/wound-monitor', when: 'Calibrated area and photograph at every review' },
    { label: 'Soft tissue infection (LRINEC, NSTI pathway)', route: '/sti-protocol', phases: ['wound_review', 'pre_op'], when: 'Necrotising features or gas' },
    { label: 'NPWT', route: '/npwt', phases: ['post_op', 'follow_up'], when: 'After debridement, once infection is controlled' },
    { label: 'Surgical cost estimate', route: '/billing/surgical-estimate', phases: ['pre_op'], when: 'Itemised estimate for the family' },
  ],
};
