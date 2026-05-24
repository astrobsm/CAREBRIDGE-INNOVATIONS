/**
 * whoSurgicalGuidelinesService.ts
 *
 * WHO-adapted surgical guidance, curated for Nigerian / sub-Saharan clinical
 * contexts. Sources:
 *   - WHO Surgical Safety Checklist (Safe Surgery Saves Lives, 2nd ed.)
 *   - WHO Global Guidelines for the Prevention of Surgical Site Infection (2018)
 *   - WHO Three-Step Analgesic Ladder (cancer pain relief; widely adapted for
 *     post-operative analgesia)
 *   - WHO/ASA recommended pre-operative fasting (clear fluids 2 h, light meal
 *     6 h, full meal 8 h)
 *
 * The service is OFFLINE. Content is bundled with the app — no network calls
 * are required to render the guidance.
 *
 * Use:
 *   const enriched = enrichWithWHOGuidelines(education, { category, riskTier });
 *   const bundle  = getWHOBundleForCategory('orthopaedic');
 */

import type {
  ProcedureEducation,
  PatientResponsibility,
  LifestyleChange,
} from '../data/patientEducation';

// ============================================================================
// WHO Surgical Safety Checklist (2nd edition)
// ============================================================================
export const WHO_SURGICAL_SAFETY_CHECKLIST = {
  signIn: [
    'Patient has confirmed identity, site, procedure and consent',
    'Surgical site is marked / not applicable',
    'Anaesthesia safety check completed',
    'Pulse oximeter on patient and functioning',
    'Known allergy? Difficult airway / aspiration risk? Risk of >500 mL blood loss (7 mL/kg in children)?',
  ],
  timeOut: [
    'All team members have introduced themselves by name and role',
    'Surgeon, anaesthetist and nurse verbally confirm patient, site and procedure',
    'Anticipated critical events reviewed (surgeon, anaesthetist, nurse)',
    'Antibiotic prophylaxis given within the last 60 minutes',
    'Essential imaging displayed',
  ],
  signOut: [
    'Nurse verbally confirms procedure name recorded',
    'Instrument, sponge and needle counts are correct',
    'Specimen labelled (including patient name)',
    'Any equipment problems addressed',
    'Key concerns for recovery and management of this patient reviewed',
  ],
} as const;

// ============================================================================
// WHO Global Guidelines for the Prevention of Surgical Site Infection (SSI)
// ============================================================================
export const WHO_SSI_PREVENTION_BUNDLE: string[] = [
  'Pre-operative bathing with plain or antimicrobial soap on the day of surgery',
  'Decolonisation of nasal Staphylococcus aureus carriers with mupirocin for cardiothoracic / orthopaedic procedures',
  'Surgical antibiotic prophylaxis administered 30–60 min before incision; redose for prolonged operations or major blood loss',
  'Do NOT shave hair routinely; if hair removal is essential, use clippers (not razors) immediately before surgery',
  'Skin preparation with alcohol-based chlorhexidine gluconate (preferred) or aqueous povidone-iodine',
  'Maintain perioperative normothermia (≥36 °C)',
  'Optimise tissue oxygenation with 80% FiO2 intra-operatively and 2–6 h post-operatively for general anaesthesia with endotracheal intubation',
  'Tight peri-operative glucose control (target <11.1 mmol/L) in both diabetic and non-diabetic patients',
  'Use of triclosan-coated sutures to reduce SSI risk',
  'Do NOT prolong antibiotic prophylaxis after wound closure for SSI prevention',
];

// ============================================================================
// WHO Three-Step Analgesic Ladder (adapted for post-operative pain)
// ============================================================================
export const WHO_PAIN_LADDER = {
  step1: {
    label: 'Step 1 — Mild pain (VAS 1–3)',
    options: ['Paracetamol 1 g qds PO', 'NSAID (e.g. ibuprofen 400 mg tds) if no contraindications'],
  },
  step2: {
    label: 'Step 2 — Moderate pain (VAS 4–6)',
    options: [
      'Continue Step 1 baseline analgesia',
      'Add weak opioid: codeine 30–60 mg qds or tramadol 50–100 mg qds',
    ],
  },
  step3: {
    label: 'Step 3 — Severe pain (VAS 7–10)',
    options: [
      'Continue Step 1 baseline analgesia',
      'Strong opioid: morphine PO 5–10 mg 4-hourly or IV/SC titrated, or pethidine where morphine unavailable',
      'Consider regional / neuraxial techniques',
    ],
  },
  adjuvants: [
    'Anti-emetic with opioid (e.g. ondansetron 4–8 mg)',
    'Stimulant laxative when opioids continued beyond 48 h',
    'Gabapentinoid for neuropathic component',
  ],
} as const;

// ============================================================================
// WHO / ASA Pre-Operative Fasting Guidelines
// ============================================================================
export const WHO_FASTING_GUIDELINES = {
  clearFluids: '2 hours — water, clear apple juice, black tea/coffee (no milk)',
  breastMilk: '4 hours — infants',
  lightMeal: '6 hours — toast and clear fluid; non-human milk',
  fullMeal: '8 hours — fried / fatty / meat-containing meal',
} as const;

// ============================================================================
// Category-specific WHO emphasis areas
// ============================================================================
const CATEGORY_EMPHASIS: Record<string, string[]> = {
  orthopaedic: [
    'WHO: Nasal Staphylococcus aureus decolonisation with mupirocin (especially arthroplasty)',
    'WHO: Mechanical + pharmacological VTE prophylaxis until full mobilisation',
    'WHO: Functional rehabilitation programme started day 0–1 post-op',
  ],
  vascular: [
    'WHO: Pre-operative ABPI and continuous monitoring of distal perfusion',
    'WHO: Optimise diabetes control (HbA1c <8%) before elective revascularisation',
    'WHO: Smoking cessation counselling and pharmacotherapy support',
  ],
  oncology: [
    'WHO: Multidisciplinary team (MDT) review and pathology confirmation before resection',
    'WHO: Pre-habilitation — nutrition, exercise, psychological support 2–4 weeks pre-op',
    'WHO: Palliative care referral when curative intent is not possible',
  ],
  general: [
    'WHO: Enhanced Recovery After Surgery (ERAS) pathway where feasible',
    'WHO: Early mobilisation within 24 h of surgery',
    'WHO: Document and discuss with patient any deviation from standard pathway',
  ],
  obstetric: [
    'WHO: Active management of the third stage of labour with uterotonic agents',
    'WHO: Skin-to-skin contact and early initiation of breastfeeding',
    'WHO: Magnesium sulphate as first-line for severe pre-eclampsia / eclampsia',
  ],
  paediatric: [
    'WHO: Weight-based dosing for all drugs; document weight on consent form',
    'WHO: Family-centred care — parental presence at induction where possible',
    'WHO: Caregiver education on warning signs in local language',
  ],
  burns: [
    'WHO: Modified Parkland fluid resuscitation; titrate to urine output 0.5–1 mL/kg/h (adults)',
    'WHO: Tetanus prophylaxis for all burn wounds',
    'WHO: Early enteral nutrition within 24 h to attenuate hypermetabolism',
  ],
};

function pickEmphasis(category: string): string[] {
  const key = category.toLowerCase();
  for (const tag of Object.keys(CATEGORY_EMPHASIS)) {
    if (key.includes(tag)) return CATEGORY_EMPHASIS[tag];
  }
  return CATEGORY_EMPHASIS.general;
}

// ============================================================================
// WHO bundle returned to UI for display + audit
// ============================================================================
export interface WHOBundle {
  procedureName: string;
  category: string;
  appliedAt: string;
  ssiPrevention: string[];
  safetyChecklist: typeof WHO_SURGICAL_SAFETY_CHECKLIST;
  painLadder: typeof WHO_PAIN_LADDER;
  fasting: typeof WHO_FASTING_GUIDELINES;
  categoryEmphasis: string[];
  citations: string[];
}

export function getWHOBundleForCategory(
  category: string,
  procedureName = ''
): WHOBundle {
  return {
    procedureName,
    category,
    appliedAt: new Date().toISOString(),
    ssiPrevention: WHO_SSI_PREVENTION_BUNDLE,
    safetyChecklist: WHO_SURGICAL_SAFETY_CHECKLIST,
    painLadder: WHO_PAIN_LADDER,
    fasting: WHO_FASTING_GUIDELINES,
    categoryEmphasis: pickEmphasis(category),
    citations: [
      'WHO Safe Surgery Saves Lives — Surgical Safety Checklist (2nd ed.)',
      'WHO Global Guidelines for the Prevention of Surgical Site Infection (2018)',
      'WHO Cancer Pain Relief — Three-Step Analgesic Ladder',
      'WHO/ASA Pre-Operative Fasting Guidelines',
    ],
  };
}

// ============================================================================
// Enrich ProcedureEducation with WHO content
// ============================================================================
export function enrichWithWHOGuidelines(
  education: ProcedureEducation
): ProcedureEducation {
  const emphasis = pickEmphasis(education.category || 'general');

  // Add WHO emphasis to aims (deduplicated)
  const aims = Array.from(new Set([...(education.aims || []), ...emphasis]));

  // Add WHO peri-operative duties to patient responsibilities
  const whoResponsibilities: PatientResponsibility[] = [
    {
      phase: 'pre_operative',
      responsibility: `Observe pre-operative fasting (WHO/ASA): ${WHO_FASTING_GUIDELINES.clearFluids}; ${WHO_FASTING_GUIDELINES.lightMeal}; ${WHO_FASTING_GUIDELINES.fullMeal}.`,
      importance: 'critical',
    },
    {
      phase: 'pre_operative',
      responsibility: 'Pre-operative bath on the day of surgery with plain or antimicrobial soap (WHO SSI bundle).',
      importance: 'important',
    },
    {
      phase: 'immediate_post_op',
      responsibility: 'Cooperate with WHO Surgical Safety Checklist Sign-Out verification before leaving theatre.',
      importance: 'important',
    },
    {
      phase: 'recovery',
      responsibility: 'Follow WHO three-step analgesic ladder; report any pain not controlled by Step 1 / Step 2 medication promptly.',
      importance: 'important',
    },
  ];

  const responsibilities = [
    ...(education.patientResponsibilities || []),
    ...whoResponsibilities,
  ];

  // Add WHO lifestyle items
  const whoLifestyle: LifestyleChange[] = [
    {
      category: 'Glycaemic control',
      recommendation: 'Maintain blood glucose <11.1 mmol/L peri-operatively (WHO SSI guideline).',
      importance: 'recommended',
    },
    {
      category: 'Smoking cessation',
      recommendation: 'Stop tobacco use ≥4 weeks before elective surgery to reduce wound and pulmonary complications.',
      duration: '4 weeks pre-op and indefinitely after',
      importance: 'recommended',
    },
  ];

  const lifestyle = [...(education.lifestyleChanges || []), ...whoLifestyle];

  // Append WHO warning signs
  const whoWarnings = [
    'Calf or thigh swelling, tenderness or breathlessness (WHO: deep vein thrombosis / pulmonary embolism)',
    'Confusion, persistent vomiting or reduced urine output (WHO: sepsis or dehydration)',
  ];
  const warnings = Array.from(
    new Set([...(education.warningSignsToReport || []), ...whoWarnings])
  );

  return {
    ...education,
    aims,
    patientResponsibilities: responsibilities,
    lifestyleChanges: lifestyle,
    warningSignsToReport: warnings,
  };
}
