/**
 * Patient Education Content - Category C: Pressure Injuries
 * Part 1: Stage 1 and Stage 2 Pressure Injuries
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and NPUAP/EPUAP Classifications
 */

import type { EducationCondition } from '../types';

/**
 * Stage 1 Pressure Injury
 */
export const stage1PressureInjury: EducationCondition = {
  id: 'pressure-injury-stage1',
  name: 'Stage 1 Pressure Injury',
  category: 'C',
  icdCode: 'L89.0',
  description: 'A Stage 1 pressure injury is the earliest stage of pressure damage where the skin remains intact but shows persistent redness that does not blanch (turn white) when pressed.',
  alternateNames: ['Stage 1 Pressure Ulcer', 'Stage 1 Bedsore', 'Non-Blanchable Erythema', 'Early Pressure Sore'],
  
  overview: {
    definition: 'A Stage 1 pressure injury is characterized by intact skin with a localized area of non-blanchable erythema (redness that does not turn white when pressed). This indicates damage to underlying tissue that is not yet visible on the surface. In individuals with darker skin tones, the area may appear differently - as purple or maroon discoloration, or present as a change in skin texture, temperature, or firmness. Early detection and intervention at this stage can prevent progression to more severe stages.',
    causes: [
      'Prolonged pressure on bony prominences (sacrum, heels, hips)',
      'Friction from rubbing against sheets or surfaces',
      'Shear forces when skin moves in opposite direction to underlying tissues',
      'Moisture from incontinence, perspiration, or wound drainage',
      'Poor circulation reducing oxygen supply to tissues',
      'Inadequate nutrition affecting tissue resilience',
      'Reduced mobility or sensation'
    ],
    symptoms: [
      'Persistent redness that does not fade within 30 minutes of pressure relief',
      'Area does not blanch (turn white) when pressed with finger',
      'Skin may feel warmer or cooler than surrounding tissue',
      'Area may feel firmer or softer than surrounding tissue',
      'Affected area may be painful, tender, or itchy',
      'In dark skin: may appear purple, blue, or ashen',
      'Skin texture may differ from surrounding areas'
    ],
    riskFactors: [
      'Immobility or limited ability to change position',
      'Reduced sensation (spinal cord injury, neuropathy)',
      'Poor nutritional status, low protein or albumin',
      'Incontinence (urinary or fecal)',
      'Advanced age with fragile skin',
      'Diabetes and vascular disease',
      'Use of wheelchairs or prolonged bed rest',
      'Previous pressure injury history',
      'Cognitive impairment',
      'Dehydration'
    ],
    complications: [
      'Progression to Stage 2 pressure injury if untreated',
      'Further tissue damage and skin breakdown',
      'Increased risk of infection',
      'Pain and discomfort',
      'Extended hospital stay'
    ],
    prevalence: 'Pressure injuries affect approximately 3 million adults annually. Stage 1 injuries are the most common and are often underreported, especially in dark-skinned individuals where detection is more challenging.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate Pressure Relief',
      duration: 'Immediately upon detection',
      description: 'The most critical intervention is immediate and complete pressure relief from the affected area. This alone can reverse Stage 1 damage if implemented promptly.',
      goals: [
        'Remove all pressure from affected area',
        'Prevent progression to Stage 2',
        'Promote blood flow to damaged tissue',
        'Document and monitor the area'
      ],
      activities: [
        'Reposition patient immediately off the affected area',
        'Do NOT massage the reddened area (can cause more damage)',
        'Apply pressure-redistributing surface if not already in use',
        'Mark the area boundary for monitoring',
        'Photograph the area for documentation',
        'Notify healthcare team'
      ],
      warningSignsThisPhase: [
        'Skin breakdown (indicates progression to Stage 2)',
        'Increasing pain or tenderness',
        'Color changes becoming darker',
        'Area increasing in size'
      ]
    },
    {
      phase: 2,
      name: 'Prevention Protocol Implementation',
      duration: 'First 24-72 hours',
      description: 'Comprehensive assessment and implementation of prevention measures to prevent recurrence and progression while monitoring for improvement.',
      goals: [
        'Implement structured repositioning schedule',
        'Address all contributing factors',
        'Protect at-risk areas',
        'Monitor for healing or progression'
      ],
      activities: [
        'Establish turning schedule (every 2 hours minimum)',
        'Apply appropriate support surface (pressure-relieving mattress)',
        'Protect heels with elevation or protective devices',
        'Keep skin clean and moisturized',
        'Manage incontinence with appropriate products',
        'Optimize nutrition and hydration',
        'Assess and document every shift'
      ],
      medications: [
        {
          name: 'Barrier Cream',
          purpose: 'Protect skin from moisture and friction',
          duration: 'Apply regularly, especially after cleaning'
        }
      ],
      warningSignsThisPhase: [
        'Redness not resolving within 72 hours',
        'Any break in skin surface',
        'Patient unable to be positioned off area',
        'Multiple new pressure areas developing'
      ]
    },
    {
      phase: 3,
      name: 'Healing and Prevention Maintenance',
      duration: '72 hours to 2 weeks',
      description: 'Continue all prevention measures while the damaged tissue heals. Focus on establishing sustainable prevention practices.',
      goals: [
        'Complete resolution of erythema',
        'Establish long-term prevention routine',
        'Address underlying risk factors',
        'Prevent new pressure injuries'
      ],
      activities: [
        'Continue repositioning schedule',
        'Maintain pressure-redistributing surfaces',
        'Daily skin inspection of all at-risk areas',
        'Nutritional optimization',
        'Mobility and activity promotion as able',
        'Patient and caregiver education'
      ],
      warningSignsThisPhase: [
        'Recurrence of redness after resolution',
        'New areas of concern developing',
        'Inability to maintain prevention measures'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Wound care nurse or tissue viability specialist',
      'Dietitian for nutritional assessment',
      'Physical therapist for mobility assessment',
      'Occupational therapist for seating and positioning',
      'Physician if signs of systemic illness'
    ],
    investigations: [
      'Serum albumin and prealbumin for nutritional status',
      'Complete blood count if infection suspected',
      'Blood glucose for diabetic patients',
      'Braden or Waterlow risk assessment scale'
    ],
    medications: [
      {
        medication: 'Current medications',
        instruction: 'continue',
        reason: 'Review medications that may affect skin integrity (steroids, anticoagulants)'
      }
    ],
    dayBeforeSurgery: [
      'Surgery is not required for Stage 1 pressure injuries',
      'Focus is on conservative management and prevention'
    ],
    dayOfSurgery: [
      'Not applicable - Stage 1 is managed conservatively'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Not applicable - Stage 1 pressure injuries do not require surgery',
    procedureDescription: 'Conservative management only. Stage 1 pressure injuries are treated with pressure relief and prevention strategies, not surgical intervention.',
    duration: 'Not applicable',
    whatToExpect: 'Treatment focuses on nursing care and prevention measures rather than surgical procedures.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Position patient completely off the affected area. Use 30-degree lateral positioning. Elevate heels off bed surface.',
      expectedSymptoms: [
        'Redness should begin fading within hours of pressure relief',
        'Mild tenderness may persist initially',
        'Skin color gradually normalizing'
      ],
      activityLevel: 'Encourage mobility as tolerated. Frequent position changes essential.'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'No wound dressing needed for intact Stage 1. Keep skin clean and dry. Apply moisturizer to surrounding skin. Apply barrier cream if at risk of moisture.'
      },
      {
        day: 'Every shift',
        instruction: 'Inspect area for improvement or deterioration. Document color, size, and tissue characteristics.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild discomfort (1-3/10) with pressure relief',
      medications: [
        'Paracetamol if needed for discomfort',
        'Topical barrier creams for protection'
      ],
      nonPharmacological: [
        'Complete pressure relief is the primary pain treatment',
        'Proper positioning with support surfaces',
        'Gentle handling during repositioning'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Lying on affected area',
        restriction: 'Avoid completely',
        duration: 'Until erythema resolved (typically 24-72 hours)',
        reason: 'Any pressure will prevent healing and cause progression'
      },
      {
        activity: 'Sitting',
        restriction: 'Limit duration, use cushioning',
        duration: 'Ongoing',
        reason: 'Sitting puts pressure on sacral area and ischial tuberosities'
      }
    ],
    dietaryGuidelines: [
      'Adequate protein intake (1.25-1.5g/kg body weight) essential for tissue repair',
      'Adequate calorie intake to meet metabolic needs',
      'Vitamin C (500mg daily) supports collagen formation',
      'Zinc (15mg daily) supports wound healing',
      'Adequate hydration (30ml/kg body weight unless fluid restricted)',
      'Consider nutritional supplements if intake inadequate'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2-4 hours',
        expectation: 'Redness should begin to fade with complete pressure relief'
      },
      {
        timeframe: '24 hours',
        expectation: 'Significant improvement in erythema if pressure fully relieved'
      },
      {
        timeframe: '72 hours',
        expectation: 'Complete resolution expected in most cases with optimal care'
      }
    ],
    longTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Full recovery with ongoing prevention measures'
      },
      {
        timeframe: 'Ongoing',
        expectation: 'Continued risk management required to prevent recurrence'
      }
    ],
    functionalRecovery: 'Full recovery expected with no lasting effects if treated promptly. The previously affected area may remain more vulnerable to future pressure damage.',
    cosmeticOutcome: 'No permanent skin changes expected with Stage 1 if treated appropriately.',
    successRate: 'Stage 1 pressure injuries resolve in over 95% of cases with prompt pressure relief and appropriate care.'
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Every 2-4 hours initially',
        purpose: 'Repositioning and skin assessment'
      },
      {
        timing: 'Daily',
        purpose: 'Comprehensive skin inspection of all at-risk areas'
      },
      {
        timing: 'Weekly',
        purpose: 'Overall risk assessment review and care plan adjustment'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy for mobility improvement if immobile',
      'Occupational therapy for seating and positioning optimization',
      'Caregiver training for repositioning techniques'
    ],
    lifestyleModifications: [
      'Regular position changes even when redness resolved',
      'Appropriate seating cushions for wheelchair users',
      'Daily skin inspections using mirror if needed',
      'Maintain good nutrition and hydration',
      'Report any new areas of redness promptly'
    ]
  },

  warningSigns: [
    'Redness not improving after 24-48 hours of pressure relief',
    'Redness becoming darker or more purple',
    'Area increasing in size',
    'Any break in skin surface (indicates progression to Stage 2)',
    'Increased pain at the site',
    'Swelling or hardness in surrounding tissue',
    'New areas of redness developing'
  ],

  emergencySigns: [
    'Skin breakdown with open wound (emergency in terms of staging progression)',
    'Signs of infection: fever, increasing pain, warmth, swelling',
    'Rapidly spreading redness suggesting cellulitis',
    'Dark purple or black discoloration suggesting deep tissue injury'
  ],

  complianceRequirements: [
    {
      requirement: 'Maintain complete pressure relief from affected area',
      importance: 'critical',
      consequence: 'Continued pressure will cause progression to Stage 2 or worse'
    },
    {
      requirement: 'Reposition every 2 hours minimum',
      importance: 'critical',
      consequence: 'Failure to reposition leads to tissue damage and new pressure injuries'
    },
    {
      requirement: 'Do NOT massage reddened areas',
      importance: 'critical',
      consequence: 'Massage causes additional tissue damage to already compromised tissue'
    },
    {
      requirement: 'Report any skin changes immediately',
      importance: 'important',
      consequence: 'Early detection enables early intervention and better outcomes'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Pressure Injury Prevention',
      reference: 'WHO-PIP 2019',
      keyPoints: [
        'Risk assessment should be performed on admission and regularly thereafter',
        'Repositioning is the cornerstone of prevention',
        'Pressure-redistributing support surfaces should be used for at-risk patients',
        'Nutritional assessment and optimization is essential',
        'Skin should be kept clean, dry, and moisturized'
      ]
    },
    {
      title: 'NPUAP/EPUAP/PPPIA International Pressure Injury Guidelines',
      reference: 'NPUAP 2019',
      keyPoints: [
        'Stage 1 is defined as intact skin with non-blanchable erythema',
        'Assessment in dark-skinned individuals requires attention to color changes and texture',
        'Do not massage or vigorously rub at-risk skin',
        'Keep heels free of pressure (float the heels)',
        'Use proper lifting techniques to avoid friction and shear'
      ]
    }
  ]
};

/**
 * Stage 2 Pressure Injury
 */
export const stage2PressureInjury: EducationCondition = {
  id: 'pressure-injury-stage2',
  name: 'Stage 2 Pressure Injury',
  category: 'C',
  icdCode: 'L89.1',
  description: 'A Stage 2 pressure injury involves partial-thickness skin loss with exposed dermis. The wound bed is pink or red, moist, and may present as an intact or ruptured blister.',
  alternateNames: ['Stage 2 Pressure Ulcer', 'Stage 2 Bedsore', 'Partial Thickness Pressure Ulcer', 'Superficial Pressure Sore'],
  
  overview: {
    definition: 'Stage 2 pressure injury represents partial-thickness skin loss where the epidermis has been breached and the dermis is exposed. The wound appears as a shallow, open ulcer with a pink-red wound bed, without slough or eschar. It may also present as an intact or ruptured serum-filled blister. This stage should not be used to describe skin tears, tape burns, moisture-associated skin damage, or excoriation.',
    causes: [
      'Progression from untreated Stage 1 pressure injury',
      'Continued pressure on tissue despite early warning signs',
      'Shear forces causing skin layers to separate',
      'Friction damage combined with pressure',
      'Moisture damage weakening skin integrity',
      'Inadequate prevention measures',
      'Poor tissue tolerance due to malnutrition or medical conditions'
    ],
    symptoms: [
      'Shallow open wound with pink-red wound bed',
      'Intact or ruptured fluid-filled blister',
      'Shiny or dry appearance of wound bed',
      'Partial loss of skin thickness',
      'No slough (yellow tissue) or eschar (black tissue) present',
      'Pain at the wound site',
      'May have small amount of clear or blood-tinged drainage'
    ],
    riskFactors: [
      'All risk factors for Stage 1 plus:',
      'Failed or inadequate prevention measures',
      'Multiple medical comorbidities',
      'Reduced tissue tolerance',
      'Poor circulation',
      'Existing Stage 1 that was not identified or treated',
      'Inadequate support surfaces'
    ],
    complications: [
      'Progression to Stage 3 or Stage 4',
      'Wound infection',
      'Delayed healing',
      'Pain and reduced quality of life',
      'Increased healthcare costs',
      'Extended hospitalization'
    ],
    prevalence: 'Stage 2 is one of the most commonly reported pressure injury stages. Hospital-acquired pressure injury rates range from 2-10% in acute care settings.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Initial Assessment and Pressure Relief',
      duration: 'First 24-48 hours',
      description: 'Complete wound assessment, implement pressure relief, and establish wound care plan. Stage 2 requires formal wound care in addition to pressure prevention.',
      goals: [
        'Complete pressure relief from wound site',
        'Protect wound from further damage',
        'Assess wound characteristics thoroughly',
        'Rule out infection',
        'Establish baseline measurements'
      ],
      activities: [
        'Immediate repositioning off wound',
        'Clean wound gently with normal saline',
        'Measure wound length, width, and depth',
        'Document wound bed appearance',
        'Apply appropriate moist wound dressing',
        'Implement support surface if not in place',
        'Notify wound care specialist'
      ],
      medications: [
        {
          name: 'Wound Dressing',
          purpose: 'Protect wound and maintain moist healing environment',
          duration: 'Until healed'
        }
      ],
      warningSignsThisPhase: [
        'Signs of infection: increasing redness, warmth, purulent drainage',
        'Wound enlarging',
        'Deepening of wound (indicates progression to Stage 3)',
        'Development of slough or necrotic tissue'
      ]
    },
    {
      phase: 2,
      name: 'Active Wound Management',
      duration: 'Weeks 1-4',
      description: 'Consistent wound care with appropriate dressings to promote healing while maintaining pressure relief and addressing contributing factors.',
      goals: [
        'Promote moist wound healing',
        'Prevent infection',
        'Reduce wound size',
        'Maintain skin integrity around wound',
        'Optimize nutrition'
      ],
      activities: [
        'Dressing changes per protocol (typically every 1-3 days)',
        'Gentle wound cleansing at each change',
        'Monitor wound bed for granulation tissue',
        'Protect surrounding skin with barrier products',
        'Continue strict repositioning schedule',
        'Weekly wound measurements',
        'Nutritional supplementation if needed'
      ],
      medications: [
        {
          name: 'Hydrocolloid or Foam Dressing',
          purpose: 'Maintain moist wound environment and absorb exudate',
          duration: 'Change every 3-5 days or as needed'
        },
        {
          name: 'Barrier Film/Cream',
          purpose: 'Protect surrounding skin from moisture',
          duration: 'Apply with each dressing change'
        }
      ],
      warningSignsThisPhase: [
        'No reduction in wound size after 2 weeks',
        'Increasing exudate or change in color',
        'Foul odor from wound',
        'Fever or systemic symptoms',
        'Exposed deeper structures'
      ]
    },
    {
      phase: 3,
      name: 'Healing and Re-epithelialization',
      duration: 'Weeks 2-6+',
      description: 'As granulation tissue fills the wound, epithelial cells migrate across to close the wound. Continue all prevention measures.',
      goals: [
        'Complete wound closure',
        'Protect new tissue',
        'Establish long-term prevention',
        'Prevent recurrence'
      ],
      activities: [
        'Continue appropriate dressings until fully healed',
        'Reduce dressing frequency as wound heals',
        'Protect healed area from pressure for extended period',
        'Continue nutritional support',
        'Plan for long-term prevention'
      ],
      warningSignsThisPhase: [
        'Wound stalling in healing',
        'Recurrence after apparent healing',
        'Skin fragility at healed site'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Wound care nurse or tissue viability specialist',
      'Dietitian for nutritional optimization',
      'Physical/Occupational therapy for positioning',
      'Physician for wound assessment and systemic evaluation',
      'Surgeon consultation if wound not responding to conservative care'
    ],
    investigations: [
      'Wound measurement and photography',
      'Wound culture if infection suspected',
      'Nutritional labs: albumin, prealbumin, hemoglobin',
      'Blood glucose for diabetic patients',
      'Consider biopsy if wound not healing appropriately'
    ],
    medications: [
      {
        medication: 'Current medications',
        instruction: 'continue',
        reason: 'Review for medications affecting healing (steroids, immunosuppressants)'
      }
    ],
    dayBeforeSurgery: [
      'Surgery rarely needed for Stage 2',
      'Conservative wound care is standard treatment',
      'Surgical consultation only if progression or non-healing'
    ],
    dayOfSurgery: [
      'Not typically applicable for Stage 2 injuries'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Usually not applicable - Stage 2 is managed conservatively. Minor debridement if needed may use local anesthesia.',
    procedureDescription: 'Stage 2 pressure injuries typically do not require surgery. Treatment is wound dressing-based with pressure relief.',
    duration: 'Not applicable for surgical intervention',
    whatToExpect: 'Conservative management with appropriate dressings. If debridement needed, it is usually minor and done at bedside.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Complete offloading of wound. 30-degree lateral positioning. Heels floated off bed. Use trapeze for patient to assist with movement.',
      expectedSymptoms: [
        'Wound will produce some drainage (clear to slightly yellow)',
        'Pink wound bed indicates healthy granulation',
        'Gradual reduction in wound size over weeks'
      ],
      activityLevel: 'Maximize mobility within ability. Never put weight on wound.'
    },
    woundCare: [
      {
        day: 'At each dressing change (every 1-5 days)',
        instruction: 'Gently cleanse wound with saline. Pat dry surrounding skin. Apply appropriate moisture-retentive dressing. Protect surrounding skin with barrier.'
      },
      {
        day: 'Weekly',
        instruction: 'Measure wound size and document. Photograph for comparison. Assess for healing progress.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (2-5/10), especially during dressing changes',
      medications: [
        'Paracetamol 1000mg 30 minutes before dressing changes',
        'Ibuprofen if no contraindications',
        'Topical lidocaine gel for painful dressing changes if needed'
      ],
      nonPharmacological: [
        'Use non-adherent dressings to minimize pain at changes',
        'Moisten dressings before removal',
        'Gentle technique',
        'Positioning for comfort'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Pressure on wound',
        restriction: 'Avoid completely',
        duration: 'Until healed and for weeks after',
        reason: 'Any pressure prevents healing'
      },
      {
        activity: 'Sitting on sacral wound',
        restriction: 'Strictly avoid',
        duration: 'Until completely healed',
        reason: 'Sitting directly pressures sacral area'
      }
    ],
    dietaryGuidelines: [
      'High protein diet essential (1.25-1.5g/kg body weight)',
      'Adequate calories (30-35 kcal/kg)',
      'Vitamin C 500-1000mg daily',
      'Zinc 40mg daily',
      'Vitamin A if deficient',
      'Adequate hydration',
      'Consider oral nutritional supplements'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Wound bed should appear pink with early granulation. Wound edges should not be spreading.'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Visible reduction in wound size. Healthy granulation tissue. Early epithelialization from edges.'
      },
      {
        timeframe: '4 weeks',
        expectation: 'Significant wound size reduction. May be approaching closure.'
      }
    ],
    longTerm: [
      {
        timeframe: '4-6 weeks',
        expectation: 'Complete healing in most cases with optimal care'
      },
      {
        timeframe: '6-12 weeks',
        expectation: 'More complex wounds may take this long. Evaluate if not healed by 4-6 weeks.'
      }
    ],
    functionalRecovery: 'Full recovery expected with minimal scarring if healed appropriately. Area remains at higher risk for future pressure injury.',
    cosmeticOutcome: 'Minimal scarring expected. Healed skin may be slightly different in color or texture.',
    successRate: 'Stage 2 pressure injuries heal in approximately 70-80% of cases within 4-6 weeks with appropriate care.'
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Every 1-3 days',
        purpose: 'Dressing changes and wound assessment'
      },
      {
        timing: 'Weekly',
        purpose: 'Wound measurement and care plan review'
      },
      {
        timing: 'Monthly after healing',
        purpose: 'Monitor for recurrence and continued prevention'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy for mobility improvement',
      'Occupational therapy for seating prescription',
      'Patient and caregiver education on prevention'
    ],
    lifestyleModifications: [
      'Lifelong pressure injury prevention measures',
      'Regular skin inspections',
      'Appropriate support surfaces at all times',
      'Nutritional maintenance',
      'Prompt reporting of any new skin concerns'
    ]
  },

  warningSigns: [
    'Wound increasing in size',
    'Wound deepening or exposing fat (progression to Stage 3)',
    'Increasing drainage or change to purulent',
    'Foul odor from wound',
    'Increasing pain',
    'Redness and warmth extending beyond wound edges',
    'Fever or feeling unwell'
  ],

  emergencySigns: [
    'High fever with wound infection',
    'Rapidly spreading redness (cellulitis)',
    'Exposed bone, tendon, or muscle (indicates Stage 3-4)',
    'Signs of sepsis: confusion, rapid breathing, low blood pressure',
    'Significant bleeding from wound'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete pressure relief from wound',
      importance: 'critical',
      consequence: 'Pressure prevents healing and causes progression to deeper stage'
    },
    {
      requirement: 'Regular dressing changes as prescribed',
      importance: 'critical',
      consequence: 'Inappropriate wound care delays healing and risks infection'
    },
    {
      requirement: 'Maintain high protein diet',
      importance: 'important',
      consequence: 'Malnutrition is a major cause of non-healing wounds'
    },
    {
      requirement: 'Report any deterioration immediately',
      importance: 'critical',
      consequence: 'Early intervention prevents progression to Stage 3 or 4'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Wound Care Guidelines',
      reference: 'WHO-WCG 2018',
      keyPoints: [
        'Moist wound healing is the standard of care',
        'Address underlying cause of wound',
        'Optimize patient nutrition',
        'Prevent infection through appropriate wound care'
      ]
    },
    {
      title: 'NPUAP/EPUAP Stage 2 Management',
      reference: 'NPUAP 2019',
      keyPoints: [
        'Do not stage skin tears as pressure injuries',
        'Protect blisters - do not intentionally rupture',
        'Use appropriate moisture-retentive dressings',
        'Monitor closely for progression',
        'Address all causative factors'
      ]
    }
  ]
};

// Export pressure injury conditions part 1
export const pressureInjuriesPart1 = [stage1PressureInjury, stage2PressureInjury];
