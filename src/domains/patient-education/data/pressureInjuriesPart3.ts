/**
 * Patient Education Content - Category C: Pressure Injuries
 * Part 3: Unstageable Pressure Injury and Deep Tissue Pressure Injury
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and NPUAP/EPUAP Classifications
 */

import type { EducationCondition } from '../types';

/**
 * Unstageable Pressure Injury
 */
export const unstageablePressureInjury: EducationCondition = {
  id: 'pressure-injury-unstageable',
  name: 'Unstageable Pressure Injury',
  category: 'C',
  icdCode: 'L89.9',
  description: 'An unstageable pressure injury is a full-thickness skin and tissue loss in which the extent of tissue damage within the wound cannot be confirmed because it is obscured by slough or eschar.',
  alternateNames: ['Unstageable Pressure Ulcer', 'Unstageable Bedsore', 'Obscured Pressure Injury', 'Pressure Injury with Slough/Eschar'],
  
  overview: {
    definition: 'Unstageable pressure injury involves full-thickness skin and tissue loss where the true depth of the wound cannot be determined because the wound bed is covered by slough (yellow, tan, gray, green, or brown tissue) and/or eschar (dead tissue that is tan, brown, or black). If slough or eschar is removed, a Stage 3 or Stage 4 pressure injury will be revealed. Stable eschar (dry, adherent, intact without erythema or fluctuance) on the heel or ischemic limb should not be softened or removed as it serves as a natural biological cover.',
    causes: [
      'Prolonged severe pressure causing full-thickness tissue death',
      'Delayed identification of pressure injury',
      'Inadequate treatment of earlier stage pressure injury',
      'Deep tissue injury that has surfaced',
      'Combination of pressure, shear, and moisture damage'
    ],
    symptoms: [
      'Wound covered with slough (yellow/tan/brown soft tissue)',
      'Wound covered with eschar (black/brown hard dead tissue)',
      'Unable to visualize wound bed or determine depth',
      'May have undermining or tunneling',
      'Variable amounts of drainage (may be trapped under eschar)',
      'May have odor',
      'Surrounding skin may show signs of infection'
    ],
    riskFactors: [
      'All risk factors for pressure injuries',
      'Delayed recognition and treatment',
      'Poor circulation limiting tissue healing',
      'Severe malnutrition',
      'Multiple medical comorbidities',
      'Limited access to wound care'
    ],
    complications: [
      'Underlying osteomyelitis (may be present but hidden)',
      'Abscess formation under eschar',
      'Sepsis',
      'Significant tissue loss once debrided',
      'Extended treatment duration'
    ],
    prevalence: 'Unstageable pressure injuries account for approximately 10-15% of all hospital-acquired pressure injuries and often represent delayed presentation or recognition.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Decision-Making',
      duration: 'First 1-2 weeks',
      description: 'Assess the wound and patient to determine whether debridement is appropriate and safe. Some eschar should NOT be removed.',
      goals: [
        'Determine wound location and patient condition',
        'Decide if debridement is appropriate',
        'Rule out infection under eschar',
        'Implement pressure offloading',
        'Optimize patient nutrition'
      ],
      activities: [
        'Document wound covered by slough/eschar',
        'Assess stability of eschar (especially heels)',
        'Check for fluctuance, odor, drainage suggesting infection',
        'Implement pressure relief measures',
        'Nutritional assessment and optimization',
        'Wound care specialist consultation'
      ],
      medications: [
        {
          name: 'Antibiotics (if infection suspected)',
          purpose: 'Treat underlying infection',
          duration: 'Per culture and sensitivity'
        }
      ],
      warningSignsThisPhase: [
        'Fluctuance under eschar (suggests abscess)',
        'Spreading redness (cellulitis)',
        'Fever or systemic symptoms',
        'Increasing drainage or odor',
        'Eschar becoming unstable'
      ]
    },
    {
      phase: 2,
      name: 'Debridement Phase',
      duration: 'Weeks 1-6',
      description: 'Appropriate removal of slough and eschar to reveal wound bed and allow accurate staging. Method depends on wound and patient factors.',
      goals: [
        'Remove dead tissue safely',
        'Reveal true wound depth',
        'Enable accurate staging',
        'Prepare wound bed for healing'
      ],
      activities: [
        'Surgical sharp debridement for most wounds',
        'Autolytic debridement (using dressings) for some wounds',
        'Enzymatic debridement as alternative',
        'Mechanical debridement with wet-to-dry dressings',
        'May require multiple debridement sessions'
      ],
      medications: [
        {
          name: 'Wound Dressings (Hydrogel/Hydrocolloid)',
          purpose: 'Promote autolytic debridement of slough',
          duration: 'Until wound bed clear'
        },
        {
          name: 'Collagenase Ointment',
          purpose: 'Enzymatic debridement of necrotic tissue',
          duration: 'Until wound bed debrided'
        }
      ],
      warningSignsThisPhase: [
        'Deep structures exposed after debridement (Stage 4)',
        'Infection despite debridement',
        'Wound larger than expected after debridement',
        'Poor granulation after eschar removed'
      ]
    },
    {
      phase: 3,
      name: 'Post-Debridement Management',
      duration: 'Weeks 4-ongoing',
      description: 'Once wound bed is visible, treat according to revealed stage (typically Stage 3 or 4).',
      goals: [
        'Stage wound accurately after debridement',
        'Implement stage-appropriate treatment',
        'Promote wound healing',
        'Prevent recurrence'
      ],
      activities: [
        'Re-stage wound as Stage 3 or 4',
        'Follow treatment protocols for revealed stage',
        'Continue all prevention measures',
        'Consider surgical reconstruction for Stage 4'
      ],
      warningSignsThisPhase: [
        'Wound not progressing to healing',
        'Recurrence of slough or eschar',
        'Signs of chronic non-healing wound'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Wound care specialist or tissue viability nurse',
      'Surgeon for sharp debridement if needed',
      'Vascular specialist if limb eschar (to assess circulation)',
      'Infectious disease if infection suspected',
      'Dietitian for nutritional optimization'
    ],
    investigations: [
      'Assessment of circulation if limb wound',
      'Wound culture if infection suspected',
      'MRI if osteomyelitis suspected under eschar',
      'Blood glucose and nutritional labs',
      'Complete blood count and inflammatory markers'
    ],
    medications: [
      {
        medication: 'Anticoagulants',
        instruction: 'discuss with surgeon',
        reason: 'May need adjustment for debridement'
      }
    ],
    dayBeforeSurgery: [
      'Shower with antimicrobial soap if debridement scheduled',
      'Continue pressure relief measures',
      'Light meal if procedure next day'
    ],
    dayOfSurgery: [
      'Fasting as instructed if surgical debridement',
      'Take approved medications'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['Local anesthesia for bedside debridement', 'General or regional for operative debridement'],
    procedureDescription: 'Surgical sharp debridement involves systematic removal of all slough and eschar until healthy bleeding tissue is reached. This reveals the true wound depth and enables accurate staging. Multiple sessions may be needed. In some cases, this is combined with negative pressure wound therapy.',
    duration: '30 minutes to 2 hours depending on wound size and depth',
    whatToExpect: 'Procedure may be done at bedside with local anesthesia or in operating room. Wound will appear larger after debridement as full extent is revealed. Bleeding is expected and controlled. True stage will be determined.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Complete pressure relief from wound. Use appropriate support surface. Position changes every 2 hours.',
      expectedSymptoms: [
        'Wound will appear larger after debridement',
        'Some bleeding controlled with dressings',
        'Pain at wound site managed with analgesia',
        'Wound will now be red/pink tissue visible'
      ],
      activityLevel: 'No pressure on wound. Mobility as tolerated otherwise.'
    },
    woundCare: [
      {
        day: 'Day 1 post-debridement',
        instruction: 'Bleeding usually stops. First dressing change. Assess wound depth and stage accordingly.'
      },
      {
        day: 'Daily or every 2-3 days',
        instruction: 'Wound care per stage (Stage 3 or 4 protocols). Clean wound, apply appropriate dressings.'
      },
      {
        day: 'Weekly',
        instruction: 'Wound measurements and photography. Progress assessment.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) after debridement',
      medications: [
        'Paracetamol or codeine-containing analgesics',
        'Pre-medication before dressing changes',
        'Topical anesthetic for painful wound care'
      ],
      nonPharmacological: [
        'Gentle wound care technique',
        'Non-adherent dressings',
        'Pressure relief'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Pressure on wound',
        restriction: 'Avoid completely',
        duration: 'Until healed',
        reason: 'Any pressure prevents healing'
      }
    ],
    dietaryGuidelines: [
      'High protein diet essential for healing',
      'Adequate calories',
      'Vitamin and mineral supplementation',
      'Good hydration'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Complete debridement revealing true wound stage'
      },
      {
        timeframe: '4 weeks',
        expectation: 'Wound bed granulating, wound size decreasing'
      }
    ],
    longTerm: [
      {
        timeframe: '2-6 months',
        expectation: 'Healing depending on revealed stage and treatment'
      }
    ],
    functionalRecovery: 'Depends on underlying stage revealed. Stage 3 wounds heal with conservative care. Stage 4 may require surgical reconstruction.',
    cosmeticOutcome: 'Scarring expected. Depends on wound depth after debridement.',
    successRate: 'Outcomes depend on revealed stage. Earlier intervention yields better results.'
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Weekly initially',
        purpose: 'Wound assessment and care plan adjustment'
      },
      {
        timing: 'As needed based on revealed stage',
        purpose: 'Stage-appropriate follow-up'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy for mobility',
      'Occupational therapy for positioning',
      'Caregiver training'
    ],
    lifestyleModifications: [
      'Lifelong pressure injury prevention',
      'Regular skin inspections',
      'Appropriate support surfaces',
      'Nutritional maintenance'
    ]
  },

  warningSigns: [
    'Fluctuance developing under eschar',
    'Increasing redness around wound',
    'Fever',
    'Increasing pain',
    'Foul odor',
    'Unstable eschar (separating at edges)'
  ],

  emergencySigns: [
    'High fever with wound infection',
    'Rapidly spreading cellulitis',
    'Signs of sepsis',
    'Sudden eschar breakdown with large drainage'
  ],

  complianceRequirements: [
    {
      requirement: 'Do not pick at or remove eschar yourself',
      importance: 'critical',
      consequence: 'Improper debridement can cause hemorrhage or spread infection'
    },
    {
      requirement: 'Report changes in wound immediately',
      importance: 'critical',
      consequence: 'Early detection of infection enables treatment'
    },
    {
      requirement: 'Keep scheduled debridement appointments',
      importance: 'critical',
      consequence: 'Delayed debridement allows ongoing tissue damage'
    }
  ],

  whoGuidelines: [
    {
      title: 'NPUAP/EPUAP Unstageable Guidelines',
      reference: 'NPUAP 2019',
      keyPoints: [
        'Cannot accurately stage until slough/eschar removed',
        'Stable heel eschar should not be removed',
        'Debridement reveals true stage (3 or 4)',
        'Monitor for signs of infection under eschar',
        'Debride if eschar becomes unstable'
      ]
    }
  ]
};

/**
 * Deep Tissue Pressure Injury (DTPI)
 */
export const deepTissuePressureInjury: EducationCondition = {
  id: 'pressure-injury-deep-tissue',
  name: 'Deep Tissue Pressure Injury',
  category: 'C',
  icdCode: 'L89.6',
  description: 'A deep tissue pressure injury presents as a localized area of persistent non-blanchable deep red, maroon, or purple discoloration OR an intact or non-intact skin with a blood-filled blister due to damage of underlying soft tissue from pressure and/or shear.',
  alternateNames: ['DTPI', 'Deep Tissue Injury', 'Deep Pressure Injury', 'Suspected Deep Tissue Injury'],
  
  overview: {
    definition: 'Deep tissue pressure injury (DTPI) occurs when tissue damage begins at the bone-muscle interface and works outward to the skin surface. The skin may remain intact initially with discoloration, or present as a blood-filled blister. The area may be preceded by tissue that is painful, firm, mushy, boggy, warmer, or cooler compared to adjacent tissue. DTPI may be difficult to detect in individuals with dark skin tones. Evolution may include a thin blister over a dark wound bed, and the wound may further evolve and become covered by thin eschar. Evolution may be rapid, exposing additional layers of tissue even with optimal treatment.',
    causes: [
      'Intense and/or prolonged pressure',
      'Shear forces transmitted to deep tissues',
      'Pressure applied over bony prominence',
      'Short-term severe pressure (as during surgery)',
      'Tissue tolerance factors (nutrition, perfusion)',
      'External mechanical factors (medical devices)'
    ],
    symptoms: [
      'Localized deep red, maroon, or purple discoloration',
      'Skin may be intact or non-intact',
      'Blood-filled blister may be present',
      'Area may feel different from surrounding tissue',
      'May be painful, boggy, mushy, firm, or tender',
      'May be warmer or cooler than adjacent tissue',
      'May evolve rapidly to open wound'
    ],
    riskFactors: [
      'Acute illness with hemodynamic instability',
      'Extended surgical procedures',
      'Immobilization on hard surfaces',
      'Poor tissue perfusion',
      'ICU admission',
      'Use of vasopressors',
      'Prolonged emergency department stay',
      'Spinal cord injury'
    ],
    complications: [
      'Evolution to Stage 3 or Stage 4',
      'Rapid wound deterioration despite treatment',
      'Large tissue loss',
      'Infection',
      'Need for surgical intervention'
    ],
    prevalence: 'DTPI rates have increased with recognition as a distinct category. Common in ICU settings and after prolonged procedures. Often unavoidable despite optimal prevention.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Early Recognition and Immediate Pressure Relief',
      duration: 'Upon identification',
      description: 'Critical early recognition and immediate complete pressure relief. The damage has already occurred in deep tissue - goal is to prevent further pressure while allowing evolution to reveal extent.',
      goals: [
        'Immediate and complete pressure relief',
        'Document baseline appearance',
        'Intensify monitoring',
        'Prepare for potential evolution',
        'Optimize systemic factors'
      ],
      activities: [
        'Complete offloading of affected area',
        'Photograph and document',
        'Mark wound borders',
        'Implement high-specification support surface',
        'Increase turning frequency to every 1-2 hours',
        'Optimize nutrition and hydration',
        'Monitor every shift for evolution'
      ],
      warningSignsThisPhase: [
        'Rapid color deepening',
        'Skin breakdown',
        'Blister formation or rupture',
        'Area enlarging'
      ]
    },
    {
      phase: 2,
      name: 'Monitoring and Conservative Management',
      duration: 'Days 1-14',
      description: 'Close monitoring as the injury evolves. Some DTPI may resolve if not deep; others will open to reveal full-thickness damage. Prevention of further injury is paramount.',
      goals: [
        'Monitor wound evolution',
        'Prevent progression if possible',
        'Identify signs of deep damage',
        'Support tissue healing if superficial'
      ],
      activities: [
        'Daily wound assessment with photography',
        'Continue complete pressure offloading',
        'Protect skin with non-adhesive dressings',
        'Do not debride unless clearly indicated',
        'Continue nutritional support',
        'Patient and family education about evolution'
      ],
      medications: [
        {
          name: 'Protective Dressings',
          purpose: 'Protect area from friction and further injury',
          duration: 'Until evolution known'
        }
      ],
      warningSignsThisPhase: [
        'Skin breakdown',
        'Thin blister forming',
        'Dark eschar developing',
        'Full-thickness wound revealing'
      ]
    },
    {
      phase: 3,
      name: 'Management of Evolved Wound',
      duration: 'Weeks 2 onwards',
      description: 'Once the wound has evolved, stage and treat according to revealed depth. DTPI often evolves to Stage 3 or 4.',
      goals: [
        'Stage evolved wound accurately',
        'Implement appropriate wound care',
        'Continue aggressive prevention',
        'Prepare for surgical consultation if Stage 4'
      ],
      activities: [
        'Re-stage wound as appropriate',
        'Follow treatment protocols for revealed stage',
        'Continue all prevention measures',
        'Wound care per evolved stage',
        'Surgical referral if needed'
      ],
      warningSignsThisPhase: [
        'Wound not progressing',
        'Infection developing',
        'Extensive tissue loss'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Wound care specialist',
      'Plastic surgeon if evolves to Stage 4',
      'Dietitian for nutritional optimization',
      'Physical/Occupational therapy for positioning'
    ],
    investigations: [
      'Wound assessment and photography',
      'Nutritional labs if poor wound healing',
      'MRI if deep tissue extent uncertain',
      'Doppler if vascular status in question'
    ],
    medications: [
      {
        medication: 'Current medications',
        instruction: 'continue',
        reason: 'Review medications affecting tissue perfusion'
      }
    ],
    dayBeforeSurgery: [
      'Surgery typically not needed initially',
      'Conservative management while wound evolves',
      'Surgical debridement only after evolution complete'
    ],
    dayOfSurgery: [
      'If surgical debridement needed after evolution',
      'Standard pre-operative preparation'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Usually not applicable initially - DTPI is managed conservatively while evolving. Surgery may be needed later if evolves to Stage 3/4.',
    procedureDescription: 'Conservative management during evolution phase. If wound evolves to Stage 3 or 4, debridement and potential reconstruction per those protocols.',
    duration: 'Not applicable initially',
    whatToExpect: 'The injury needs time to declare itself. The discoloration may resolve if damage is superficial, or the wound may open to reveal full-thickness damage. This evolution typically occurs over 1-2 weeks.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Complete pressure relief essential. May need specialty support surface. Turn every 1-2 hours. Float heels if heel DTPI.',
      expectedSymptoms: [
        'Discoloration may spread initially',
        'Blister may form and rupture',
        'Wound may open over days to weeks',
        'Pain variable depending on nerve involvement'
      ],
      activityLevel: 'Avoid all pressure on affected area. Mobility otherwise as tolerated.'
    },
    woundCare: [
      {
        day: 'Initial care',
        instruction: 'Protect with non-adherent dressing. Do not massage or apply pressure. Monitor for evolution.'
      },
      {
        day: 'If blister forms',
        instruction: 'Protect blister - do not intentionally rupture. If ruptures, treat as open wound.'
      },
      {
        day: 'If wound opens',
        instruction: 'Stage wound and treat according to revealed depth (Stage 3 or 4 protocols).'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Variable (0-7/10) - may be painless if nerves damaged',
      medications: [
        'Paracetamol as needed',
        'Stronger analgesia if painful',
        'Pre-medication before dressing changes once open'
      ],
      nonPharmacological: [
        'Complete pressure relief',
        'Gentle handling',
        'Non-adherent dressings'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Any pressure on affected area',
        restriction: 'Avoid completely',
        duration: 'Until healed',
        reason: 'Pressure will worsen injury and prevent healing'
      }
    ],
    dietaryGuidelines: [
      'High protein diet to support tissue repair',
      'Adequate calories',
      'Vitamin C and zinc supplementation',
      'Good hydration'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-72 hours',
        expectation: 'Wound may show early evolution - increasing discoloration or blister formation'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Wound evolution should be complete - either resolving or revealing full extent'
      }
    ],
    longTerm: [
      {
        timeframe: 'If resolves (rare)',
        expectation: 'Discoloration fades over 1-2 weeks, no lasting damage'
      },
      {
        timeframe: 'If evolves to Stage 3/4',
        expectation: 'Follow treatment timeline for revealed stage'
      }
    ],
    functionalRecovery: 'Depends on evolution. If resolves, full recovery. If evolves to Stage 3/4, recovery follows those timelines.',
    cosmeticOutcome: 'If resolves, may have temporary discoloration. If evolves, scarring per revealed stage.',
    successRate: 'Most DTPI will evolve to reveal full-thickness damage. Early detection and pressure relief give best outcomes.'
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Every shift for first 1-2 weeks',
        purpose: 'Monitor evolution'
      },
      {
        timing: 'Once evolved, per stage',
        purpose: 'Stage-appropriate follow-up'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy once mobile',
      'Occupational therapy for positioning',
      'Pressure mapping when appropriate'
    ],
    lifestyleModifications: [
      'Lifelong pressure injury awareness',
      'Regular skin inspections',
      'Appropriate support surfaces',
      'Report any discoloration immediately'
    ]
  },

  warningSigns: [
    'Discoloration deepening or spreading',
    'Blister forming',
    'Skin breakdown',
    'Increasing pain',
    'Area becoming more boggy or fluctuant',
    'Eschar developing'
  ],

  emergencySigns: [
    'Rapid evolution with large tissue loss',
    'Signs of infection (fever, spreading redness)',
    'Sepsis symptoms',
    'Hemorrhage from wound'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete pressure relief from affected area',
      importance: 'critical',
      consequence: 'Any pressure will worsen the deep tissue damage'
    },
    {
      requirement: 'Do not massage affected area',
      importance: 'critical',
      consequence: 'Massage causes additional tissue damage'
    },
    {
      requirement: 'Report any changes immediately',
      importance: 'critical',
      consequence: 'Early detection of evolution enables appropriate treatment'
    },
    {
      requirement: 'Allow wound to evolve before treatment decisions',
      importance: 'important',
      consequence: 'Premature intervention may not address full extent of damage'
    }
  ],

  whoGuidelines: [
    {
      title: 'NPUAP/EPUAP Deep Tissue Pressure Injury Guidelines',
      reference: 'NPUAP 2019',
      keyPoints: [
        'DTPI is a distinct category - not staged 1-4',
        'Damage originates at deep tissue level',
        'May evolve rapidly despite optimal treatment',
        'Do not debride intact DTPI',
        'Once evolved, re-stage and treat accordingly',
        'Cannot be reverse-staged (stays DTPI in records)'
      ]
    }
  ]
};

// Export pressure injury conditions part 3
export const pressureInjuriesPart3 = [unstageablePressureInjury, deepTissuePressureInjury];
