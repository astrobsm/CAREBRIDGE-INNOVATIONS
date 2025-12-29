/**
 * Patient Education Content - Category K: Reconstructive Techniques and Procedures
 * Part 1: Skin Grafting and Tissue Expansion
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Skin Grafting
 */
export const skinGrafting: EducationCondition = {
  id: 'recon-skin-grafting',
  name: 'Skin Grafting',
  category: 'K',
  icdCode: 'Z94.5',
  description: 'Surgical transplantation of skin from one area of the body to another to cover wounds, burns, or areas of skin loss.',
  alternateNames: ['Skin Transplantation', 'Split-Thickness Skin Graft', 'Full-Thickness Skin Graft', 'STSG', 'FTSG'],
  
  overview: {
    definition: 'Skin grafting is a surgical procedure where healthy skin is removed from one area of the body (donor site) and transplanted to cover a wound, burn, or area of skin loss (recipient site). There are two main types: Split-thickness skin grafts (STSG) contain the epidermis and part of the dermis, while Full-thickness skin grafts (FTSG) contain the entire epidermis and dermis. Each has different uses, advantages, and considerations.',
    causes: [
      'Burns',
      'Traumatic wounds',
      'Surgical defects after cancer removal',
      'Chronic non-healing wounds',
      'Diabetic ulcers',
      'Venous ulcers',
      'Pressure sores',
      'Contracture release',
      'Skin cancer removal sites'
    ],
    symptoms: [
      'Open wound requiring coverage',
      'Exposed bone, tendon, or other structures',
      'Large area of skin loss',
      'Non-healing wound despite treatment',
      'Wound too large to close directly'
    ],
    riskFactors: [
      'Diabetes (affects healing)',
      'Smoking (significantly impairs graft take)',
      'Poor nutrition',
      'Immunosuppression',
      'Peripheral vascular disease',
      'Infection at recipient site',
      'Movement at graft site'
    ],
    complications: [
      'Graft failure (non-take)',
      'Infection',
      'Hematoma (blood under graft)',
      'Seroma (fluid under graft)',
      'Graft contracture',
      'Poor cosmetic appearance',
      'Donor site problems',
      'Hyperpigmentation or hypopigmentation'
    ],
    prevalence: 'Skin grafting is one of the most common reconstructive procedures, performed thousands of times daily worldwide for various indications.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Wound Preparation',
      duration: 'Days to weeks before grafting',
      description: 'Preparing the recipient site to optimize graft take.',
      goals: [
        'Clean granulating wound bed',
        'Control infection',
        'Optimize patient health',
        'Plan donor site'
      ],
      activities: [
        'Wound debridement',
        'Negative pressure wound therapy if needed',
        'Treatment of infection',
        'Nutritional optimization',
        'Smoking cessation',
        'Selection of donor site'
      ],
      warningSignsThisPhase: [
        'Persistent infection',
        'Poor granulation tissue',
        'Exposed bone/tendon without periosteum/paratenon',
        'Ongoing tissue necrosis'
      ]
    },
    {
      phase: 2,
      name: 'Skin Graft Surgery',
      duration: '1-2 hours',
      description: 'Harvesting skin from donor site and applying to recipient site.',
      goals: [
        'Harvest appropriate graft',
        'Apply securely to recipient site',
        'Protect with appropriate dressing',
        'Care for donor site'
      ],
      activities: [
        'General or regional anesthesia',
        'Skin graft harvest (dermatome for STSG, scalpel for FTSG)',
        'Preparation of recipient bed',
        'Graft placement and securing',
        'Bolster dressing application',
        'Donor site dressing'
      ],
      warningSignsThisPhase: [
        'Bleeding from recipient bed',
        'Poor quality recipient bed',
        'Graft damage during handling'
      ]
    },
    {
      phase: 3,
      name: 'Graft Take (Critical Phase)',
      duration: 'Days 1-7',
      description: 'Critical period when graft must establish blood supply from recipient bed.',
      goals: [
        'Immobilization of graft',
        'Prevention of hematoma/seroma',
        'Prevention of infection',
        'Donor site healing'
      ],
      activities: [
        'Strict immobilization of grafted area',
        'Bolster dressing left in place',
        'Limb elevation if applicable',
        'Careful monitoring for signs of failure',
        'Donor site dressing care'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort (especially donor site)',
          duration: '1-2 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Foul smell from graft',
        'Color change (pale, blue, or dark)',
        'Excessive fluid under graft',
        'Pain increasing'
      ]
    },
    {
      phase: 4,
      name: 'Graft Maturation',
      duration: 'Weeks 2-12',
      description: 'Graft establishes permanent blood supply and begins to mature.',
      goals: [
        'Complete vascularization',
        'Begin graft conditioning',
        'Prevent contracture',
        'Optimize cosmetic result'
      ],
      activities: [
        'Dressing changes and wound care',
        'Gentle graft massage (when healed)',
        'Moisturization',
        'Sun protection',
        'Pressure therapy if indicated',
        'Physiotherapy if over joint'
      ],
      warningSignsThisPhase: [
        'Graft breakdown',
        'Infection',
        'Excessive scarring',
        'Contracture development'
      ]
    },
    {
      phase: 5,
      name: 'Long-Term Management',
      duration: '3-12 months',
      description: 'Scar maturation and optimization of functional and cosmetic outcome.',
      goals: [
        'Scar maturation',
        'Minimize contracture',
        'Optimize cosmesis',
        'Full function'
      ],
      activities: [
        'Ongoing moisturization',
        'Sun protection (very important)',
        'Scar massage',
        'Pressure garments if needed',
        'Physiotherapy continuation',
        'Assessment for revision if needed'
      ],
      warningSignsThisPhase: [
        'Hypertrophic scarring',
        'Contracture limiting function',
        'Chronic wounds',
        'Skin cancer (in long term)'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon or general surgeon',
      'Wound care team',
      'Anesthesia assessment',
      'Nutritionist if malnourished'
    ],
    investigations: [
      'Blood tests (including albumin for nutrition)',
      'Wound swab for culture',
      'Blood glucose control in diabetics',
      'Vascular assessment if peripheral vascular disease'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May affect bleeding'
      },
      {
        medication: 'Smoking',
        instruction: 'stop',
        reason: 'Smoking dramatically reduces graft survival'
      }
    ],
    fastingInstructions: 'No food for 6 hours, clear liquids for 2 hours before surgery.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Prepare for possible hospital stay',
      'Do not apply lotions to donor or recipient areas',
      'Optimize blood sugar if diabetic'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Transportation home',
      'Supplies for dressing care at home',
      'List of medications'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Take approved medications with small sip of water',
      'Wear loose clothing that avoids donor and recipient sites',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General, regional, or local anesthesia depending on extent',
    procedureDescription: 'For Split-Thickness Skin Grafts (STSG): A dermatome (specialized knife) is used to harvest a thin layer of skin from the donor site (commonly thigh, buttock, or back). The graft may be meshed (cut in a pattern) to allow expansion and drainage. For Full-Thickness Skin Grafts (FTSG): A scalpel is used to remove a complete thickness of skin from the donor site (commonly groin, neck, or behind ear). The donor site is closed directly. The graft is carefully placed on the prepared recipient bed and secured with sutures, staples, or dressings. A bolster dressing is often applied for pressure.',
    duration: '1-2 hours depending on size and complexity',
    whatToExpect: 'You will be asleep or the area will be numbed. The grafted area will have a special dressing. The donor site will also be dressed and may be painful.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate grafted limb if applicable. Avoid any pressure on graft site.',
      expectedSymptoms: [
        'Pain at donor site (often more than graft site)',
        'Bulky dressing over graft',
        'Limb elevation required',
        'Limited mobility',
        'Mild fever possible first 48 hours'
      ],
      activityLevel: 'Rest. Keep grafted area still. May need bed rest if leg grafted.'
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'Bolster dressing left undisturbed. Donor site dressing may need monitoring.'
      },
      {
        day: 'Day 5-7',
        instruction: 'First graft inspection at clinic. Dressing change. Donor site care continues.'
      },
      {
        day: 'Weeks 1-4',
        instruction: 'Regular dressing changes. Begin gentle graft care once healed. Donor site healing (STSG 2-3 weeks, FTSG 2-3 weeks if closed).'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Donor site pain is often significant (5-7/10). Graft site usually less painful.',
      medications: [
        'Prescribed pain medication for donor site',
        'Paracetamol and ibuprofen as maintenance',
        'Pain medication before dressing changes'
      ],
      nonPharmacological: [
        'Elevation',
        'Cool room temperature',
        'Distraction',
        'Rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Movement of grafted area',
        restriction: 'Minimize',
        duration: '7-14 days',
        reason: 'Allows graft to take'
      },
      {
        activity: 'Walking (if leg grafted)',
        restriction: 'Limited to essential',
        duration: '7-14 days',
        reason: 'Reduces swelling, protects graft'
      },
      {
        activity: 'Submersion in water',
        restriction: 'Avoid',
        duration: 'Until fully healed (2-4 weeks)',
        reason: 'Infection risk'
      },
      {
        activity: 'Sun exposure',
        restriction: 'Avoid',
        duration: '12 months',
        reason: 'Prevents hyperpigmentation'
      }
    ],
    dietaryGuidelines: [
      'High protein diet for healing',
      'Adequate calories',
      'Good hydration',
      'Vitamin C and zinc may help healing'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '5-7 days',
        expectation: 'Graft take confirmed'
      },
      {
        timeframe: '2-3 weeks',
        expectation: 'Graft healed, donor site healing'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Graft mature, early scar maturation'
      },
      {
        timeframe: '12 months',
        expectation: 'Scar maturation complete, final appearance'
      }
    ],
    functionalRecovery: 'Full function usually returns. Grafts over joints may need physiotherapy to prevent contracture.',
    cosmeticOutcome: 'FTSG provides better cosmetic match but limited donor skin. STSG may have mesh pattern visible. Color match improves over time. Donor site (STSG) can be visible.',
    successRate: 'Graft take rates are 85-95% in good conditions. Lower with infection, poor blood supply, or smoking.',
    possibleComplications: [
      {
        complication: 'Graft failure',
        riskLevel: 'low',
        prevention: 'No smoking, good wound prep, immobilization',
        management: 'Debride and regraft'
      },
      {
        complication: 'Contracture',
        riskLevel: 'moderate',
        prevention: 'FTSG over joints, physiotherapy, pressure therapy',
        management: 'Physiotherapy, possible surgical release'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '5-7 days',
        purpose: 'First graft inspection'
      },
      {
        timing: '2 weeks',
        purpose: 'Assess healing'
      },
      {
        timing: '6 weeks',
        purpose: 'Full assessment, begin scar management'
      },
      {
        timing: '3-6 months',
        purpose: 'Monitor scar maturation'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy if graft over joint',
      'Occupational therapy if hand/arm',
      'Scar massage instruction',
      'Pressure therapy fitting if indicated'
    ],
    lifestyleModifications: [
      'Strict sun protection for 12 months',
      'Daily moisturization',
      'Ongoing scar massage',
      'Skin cancer surveillance if large graft'
    ]
  },

  warningSigns: [
    'Foul smell from graft or donor site',
    'Fever above 38°C (100.4°F)',
    'Graft turning dark, white, or blue',
    'Increasing pain after first few days',
    'Pus or discharge',
    'Graft separating from bed'
  ],

  emergencySigns: [
    'Signs of severe infection (high fever, redness spreading)',
    'Complete graft loss',
    'Severe bleeding'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolute smoking cessation',
      importance: 'critical',
      consequence: 'Smoking reduces graft survival by 50% or more'
    },
    {
      requirement: 'Immobilize grafted area as directed',
      importance: 'critical',
      consequence: 'Movement causes shearing and graft failure'
    },
    {
      requirement: 'Attend all dressing changes and follow-ups',
      importance: 'critical',
      consequence: 'Early detection of problems allows intervention'
    },
    {
      requirement: 'Sun protection for 12 months',
      importance: 'important',
      consequence: 'Prevents permanent hyperpigmentation'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Burns and Wound Management',
      reference: 'WHO Emergency and Essential Surgical Care',
      keyPoints: [
        'Adequate wound preparation before grafting',
        'Aseptic technique',
        'Appropriate graft selection',
        'Post-operative immobilization',
        'Long-term scar management'
      ]
    }
  ]
};

/**
 * Tissue Expansion
 */
export const tissueExpansion: EducationCondition = {
  id: 'recon-tissue-expansion',
  name: 'Tissue Expansion',
  category: 'K',
  icdCode: 'Z96.89',
  description: 'A technique where a balloon-like device is placed under the skin and gradually inflated to stretch and grow new skin for reconstruction.',
  alternateNames: ['Skin Expansion', 'Expander Surgery', 'Tissue Expander Reconstruction'],
  
  overview: {
    definition: 'Tissue expansion is a surgical technique that uses the body\'s ability to grow new skin when stretched. A silicone balloon (tissue expander) is placed under the skin near the area requiring reconstruction. Over weeks to months, saline is gradually injected into the expander through a port, stretching the skin above it. This newly grown skin is then used to reconstruct nearby defects, providing skin that matches in color and texture.',
    causes: [
      'Breast reconstruction after mastectomy',
      'Scalp reconstruction (hair-bearing skin)',
      'Burn scar reconstruction',
      'Removal of large birthmarks',
      'Reconstruction after tumor removal',
      'Scar revision',
      'Congenital skin defects'
    ],
    symptoms: [
      'Need for reconstruction with matching skin',
      'Large area requiring coverage',
      'Hair-bearing skin needed',
      'Limited local tissue available'
    ],
    riskFactors: [
      'Smoking',
      'Previous radiation',
      'Poor nutrition',
      'Diabetes',
      'Immunosuppression',
      'Thin skin',
      'Infection prone areas'
    ],
    complications: [
      'Expander infection',
      'Expander exposure (coming through skin)',
      'Expander rupture',
      'Pain during expansion',
      'Inadequate expansion',
      'Skin necrosis',
      'Hematoma',
      'Capsular contracture'
    ],
    prevalence: 'Tissue expansion is widely used, most commonly for breast reconstruction (over 50,000 annually in the US) and scalp reconstruction.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Planning and Expander Insertion',
      duration: 'Surgery 1-2 hours',
      description: 'Placement of tissue expander under the skin.',
      goals: [
        'Place expander in optimal position',
        'Allow initial healing',
        'Begin expansion plan'
      ],
      activities: [
        'Pre-operative planning and marking',
        'General or local anesthesia',
        'Incision and pocket creation',
        'Expander placement',
        'Initial fill with some saline',
        'Wound closure'
      ],
      warningSignsThisPhase: [
        'Bleeding into pocket',
        'Damage to expander',
        'Poor skin quality over expander'
      ]
    },
    {
      phase: 2,
      name: 'Initial Healing',
      duration: 'Weeks 1-3',
      description: 'Allow incision to heal before beginning expansion.',
      goals: [
        'Wound healing',
        'Expander settling',
        'Pain resolution',
        'Begin planning expansion schedule'
      ],
      activities: [
        'Wound care',
        'Rest and activity modification',
        'Pain management',
        'Watch for early complications'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '7 days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control post-operative pain',
          duration: '1-2 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Wound opening',
        'Increasing redness around expander',
        'Fluid drainage'
      ]
    },
    {
      phase: 3,
      name: 'Expansion Phase',
      duration: 'Weeks to months',
      description: 'Regular saline injections to gradually expand the skin.',
      goals: [
        'Achieve adequate tissue volume',
        'Tolerable expansion pace',
        'Maintain skin integrity',
        'Monitor for complications'
      ],
      activities: [
        'Weekly or biweekly clinic visits',
        'Saline injection through port',
        'Monitoring of skin and expander',
        'Adjustment of expansion rate as needed',
        'Pain management during expansion'
      ],
      warningSignsThisPhase: [
        'Severe pain with expansion',
        'Skin becoming too thin or discolored',
        'Signs of infection',
        'Expander leaking',
        'Expander visible through skin'
      ]
    },
    {
      phase: 4,
      name: 'Reconstruction Surgery',
      duration: 'Final surgery 2-4 hours',
      description: 'Removal of expander and use of expanded skin for reconstruction.',
      goals: [
        'Remove expander',
        'Use expanded skin for coverage',
        'Close donor and recipient sites',
        'Achieve optimal result'
      ],
      activities: [
        'Expander removal',
        'Advancement or transfer of expanded skin',
        'Excision of scar/defect',
        'Layered closure',
        'For breast: may place permanent implant'
      ],
      warningSignsThisPhase: [
        'Insufficient skin despite expansion',
        'Poor quality of expanded skin',
        'Bleeding'
      ]
    },
    {
      phase: 5,
      name: 'Final Healing and Result',
      duration: 'Weeks to months',
      description: 'Final healing and assessment of reconstruction.',
      goals: [
        'Complete wound healing',
        'Optimal cosmetic result',
        'Patient satisfaction',
        'Address any revisions'
      ],
      activities: [
        'Wound care',
        'Scar management',
        'Follow-up assessments',
        'Possible touch-up procedures'
      ],
      warningSignsThisPhase: [
        'Wound breakdown',
        'Poor cosmetic result',
        'Capsular contracture (breast)',
        'Recurrence of original problem'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon',
      'Anesthesia assessment',
      'Medical clearance if needed'
    ],
    investigations: [
      'Blood tests',
      'Cardiac evaluation if indicated',
      'Photos for documentation'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      },
      {
        medication: 'Smoking',
        instruction: 'stop',
        reason: 'Impairs healing and increases complications'
      }
    ],
    fastingInstructions: 'No food for 6 hours before surgery.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Prepare recovery area at home',
      'Arrange for help during recovery'
    ],
    whatToBring: [
      'Loose comfortable clothing (button-front for breast)',
      'Driver and helper',
      'Medications list'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'No jewelry or makeup',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General or local anesthesia with sedation',
    procedureDescription: 'An incision is made near the defect (or in the planned reconstruction site for breast). A pocket is created under the skin (and muscle for breast). The silicone expander is placed and partially filled with saline. The filling port may be built into the expander or placed separately. The incision is closed. For breast reconstruction, the expander is placed under the pectoralis muscle.',
    duration: '1-2 hours for placement; 2-4 hours for final reconstruction',
    whatToExpect: 'You will be asleep or sedated. You will notice a bulge where the expander is placed. The area will be sore initially.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Depends on location. For breast: avoid lying flat on stomach. For scalp: elevate head.',
      expectedSymptoms: [
        'Tightness over expander',
        'Soreness',
        'Visible bulge',
        'Bruising',
        'Limited arm movement (breast)'
      ],
      activityLevel: 'Rest initially. Gradual return to light activities.'
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Keep incision clean and dry. Dressing as directed.'
      },
      {
        day: 'During expansion',
        instruction: 'Watch for skin changes. Report any thinning or color change.'
      },
      {
        day: 'After final surgery',
        instruction: 'Standard wound care. Scar management once healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild after placement. Tightness during expansion (managed with timing).',
      medications: [
        'Prescribed pain medication after surgery',
        'Paracetamol before expansion visits',
        'Anti-inflammatory if tolerated'
      ],
      nonPharmacological: [
        'Ice packs (carefully over expander)',
        'Comfortable positioning',
        'Loose clothing'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '4-6 weeks after each surgery',
        reason: 'Protect healing and expander'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Prevent displacement'
      },
      {
        activity: 'Pressure on expander',
        restriction: 'Avoid',
        duration: 'Throughout expansion',
        reason: 'Prevent complications'
      }
    ],
    dietaryGuidelines: [
      'Normal healthy diet',
      'Good protein intake for healing',
      'Stay well hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2-4 months',
        expectation: 'Expansion complete, ready for final surgery'
      }
    ],
    longTerm: [
      {
        timeframe: '6 months',
        expectation: 'Reconstruction complete, early result visible'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Final result, scars matured'
      }
    ],
    functionalRecovery: 'Full function typically restored. For scalp, hair-bearing skin is preserved.',
    cosmeticOutcome: 'Excellent color and texture match since using body\'s own skin. Scars from incisions. Some bulging during expansion (temporary).',
    successRate: 'Success rates are 90-95% in experienced hands. Higher complication rates with radiation, smoking.',
    possibleComplications: [
      {
        complication: 'Expander exposure',
        riskLevel: 'moderate',
        prevention: 'Careful expansion, good skin quality',
        management: 'May require expander removal, start again later'
      },
      {
        complication: 'Infection',
        riskLevel: 'low',
        prevention: 'Sterile technique, antibiotics',
        management: 'Antibiotics, possible expander removal'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week after placement',
        purpose: 'Wound check'
      },
      {
        timing: 'Weekly/biweekly during expansion',
        purpose: 'Saline injection, monitoring'
      },
      {
        timing: '2 weeks after final surgery',
        purpose: 'Wound check'
      },
      {
        timing: '3-6 months',
        purpose: 'Assess result'
      }
    ],
    rehabilitationNeeds: [
      'Arm exercises (breast expansion)',
      'Scar massage after healing',
      'Moisturization of expanded skin'
    ],
    lifestyleModifications: [
      'Plan for multiple clinic visits during expansion',
      'Accommodate temporary bulge in clothing',
      'Patience during multi-month process'
    ]
  },

  warningSigns: [
    'Fever',
    'Increasing redness or warmth over expander',
    'Skin becoming very thin or discolored',
    'Severe pain',
    'Wound opening',
    'Expander feeling deflated',
    'Fluid leaking'
  ],

  emergencySigns: [
    'Expander visible through skin',
    'Signs of severe infection',
    'Extreme pain',
    'Rapid expansion of swelling'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all expansion appointments',
      importance: 'critical',
      consequence: 'Missing appointments prolongs treatment and may compromise result'
    },
    {
      requirement: 'Report any skin changes immediately',
      importance: 'critical',
      consequence: 'Early detection of thinning can prevent expander exposure'
    },
    {
      requirement: 'Avoid pressure or trauma to expander',
      importance: 'important',
      consequence: 'Prevents rupture or displacement'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Principles of Reconstructive Surgery',
      reference: 'WHO Surgical Guidelines',
      keyPoints: [
        'Tissue expansion provides excellent color and texture match',
        'Patient selection is important',
        'Multiple visits required during expansion',
        'Careful monitoring for complications'
      ]
    }
  ]
};

// Export reconstructive techniques part 1
export const reconstructiveTechniquesPart1 = [skinGrafting, tissueExpansion];
