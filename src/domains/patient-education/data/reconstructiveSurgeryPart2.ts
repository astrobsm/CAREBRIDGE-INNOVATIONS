/**
 * Patient Education Content - Category D: Reconstructive Surgery
 * Part 2: Tissue Expansion and Scar Revision
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Tissue Expansion
 */
export const tissueExpansion: EducationCondition = {
  id: 'reconstructive-tissue-expansion',
  name: 'Tissue Expansion',
  category: 'D',
  icdCode: 'Z96.89',
  description: 'Tissue expansion is a reconstructive technique where a balloon-like device (expander) is placed under the skin and gradually filled with saline over weeks to months, stretching the skin to grow additional tissue for reconstruction.',
  alternateNames: ['Skin Expansion', 'Tissue Expander', 'Serial Expansion', 'Controlled Tissue Growth'],
  
  overview: {
    definition: 'Tissue expansion is a process that enables the body to grow extra skin for reconstructive surgery. A balloon-like silicone expander is surgically implanted under the skin near the area requiring reconstruction. Over weeks to months, the expander is progressively filled with saline through a valve, causing the overlying skin to stretch and grow. This expanded tissue, which closely matches the surrounding skin in color and texture, is then used to replace or cover damaged areas.',
    causes: [
      'Post-burn scar contracture requiring release',
      'Breast reconstruction after mastectomy',
      'Scalp reconstruction for alopecia',
      'Congenital nevus requiring staged excision',
      'Traumatic soft tissue defects',
      'Repair of previous scarring',
      'Ear reconstruction'
    ],
    symptoms: [
      'Scarred or damaged tissue requiring replacement',
      'Insufficient local tissue for reconstruction',
      'Need for tissue matching in color and texture',
      'Desire to avoid skin grafts'
    ],
    riskFactors: [
      'Infection prone patient',
      'Smoking',
      'Poor compliance with expansion protocol',
      'Very thin or damaged overlying skin',
      'Radiation to expansion site',
      'Immunosuppression',
      'Bleeding disorders'
    ],
    complications: [
      'Infection (most common)',
      'Expander exposure',
      'Expander deflation or leak',
      'Pain during expansion',
      'Flap necrosis after final surgery',
      'Poor quality expanded skin',
      'Device malposition'
    ],
    prevalence: 'Tissue expansion is widely used in reconstructive surgery, particularly for breast reconstruction and burn scar revision, with thousands of procedures performed annually.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Expander Placement Surgery',
      duration: 'Day of initial surgery',
      description: 'Surgical implantation of the tissue expander in a pocket beneath the skin adjacent to the defect.',
      goals: [
        'Implant expander in optimal position',
        'Achieve primary closure over expander',
        'Identify fill port location',
        'Minimize infection risk'
      ],
      activities: [
        'Create subcutaneous pocket',
        'Place expander with fill port',
        'Partial initial fill if possible',
        'Layered closure',
        'Dressing application'
      ],
      medications: [
        {
          name: 'Prophylactic Antibiotics',
          purpose: 'Prevent device infection',
          duration: 'Usually single dose at surgery or short course'
        }
      ],
      warningSignsThisPhase: [
        'Wound breakdown',
        'Early infection',
        'Expander visible under skin',
        'Excessive pain'
      ]
    },
    {
      phase: 2,
      name: 'Expansion Phase',
      duration: '2-6 months (weekly fills)',
      description: 'Gradual inflation of the expander with saline at regular intervals to stretch the overlying skin.',
      goals: [
        'Achieve adequate skin expansion',
        'Monitor skin viability',
        'Maintain patient comfort',
        'Prevent complications'
      ],
      activities: [
        'Weekly or bi-weekly clinic visits for fills',
        'Inject saline through port (15-60ml per session)',
        'Monitor skin for blanching or compromise',
        'Assess for infection at each visit',
        'Adjust fill volume based on skin tolerance',
        'Photographic documentation'
      ],
      medications: [
        {
          name: 'Topical anesthetic cream',
          purpose: 'Reduce discomfort during fills',
          duration: 'Apply before each fill session'
        }
      ],
      warningSignsThisPhase: [
        'Skin thinning or blanching',
        'Pain not settling after fill',
        'Redness or warmth suggesting infection',
        'Expander deflation',
        'Fluid leaking'
      ]
    },
    {
      phase: 3,
      name: 'Maintenance Period',
      duration: '2-4 weeks after final fill',
      description: 'Period of maintaining maximum expansion to allow tissue stabilization before final surgery.',
      goals: [
        'Allow expanded skin to stabilize',
        'Plan final reconstruction',
        'Maintain expansion volume'
      ],
      activities: [
        'Keep expander at maximum comfortable volume',
        'Plan final reconstruction surgery',
        'Pre-operative optimization',
        'Continue monitoring for complications'
      ],
      warningSignsThisPhase: [
        'Late expander exposure',
        'Infection',
        'Significant deflation'
      ]
    },
    {
      phase: 4,
      name: 'Final Reconstruction Surgery',
      duration: 'Second surgery day',
      description: 'Removal of expander and use of expanded skin flap to reconstruct the defect.',
      goals: [
        'Remove expander',
        'Advance expanded tissue flap',
        'Close defect with expanded skin',
        'Remove original scar/lesion',
        'Achieve optimal cosmetic result'
      ],
      activities: [
        'Remove expander device',
        'Advance or rotate expanded skin flap',
        'Excise original pathology',
        'Tension-free closure',
        'Drain placement if needed'
      ],
      warningSignsThisPhase: [
        'Flap vascular compromise',
        'Tension on closure',
        'Inadequate tissue for coverage'
      ]
    },
    {
      phase: 5,
      name: 'Recovery and Scar Maturation',
      duration: '6-18 months',
      description: 'Healing and maturation of the reconstructed area with scar management.',
      goals: [
        'Complete wound healing',
        'Optimal scar maturation',
        'Restore function and appearance'
      ],
      activities: [
        'Wound care and dressing changes',
        'Scar massage once healed',
        'Sun protection',
        'Silicone gel or sheets for scarring',
        'Regular follow-up'
      ],
      warningSignsThisPhase: [
        'Wound dehiscence',
        'Hypertrophic scarring',
        'Contracture recurrence',
        'Infection'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic/Reconstructive surgeon',
      'Anesthetist',
      'Possibly clinical psychologist (for body image)',
      'Physiotherapist if contracture release planned'
    ],
    investigations: [
      'Complete blood count',
      'Coagulation studies',
      'Photography of area to be reconstructed',
      'Doppler studies if flap planned',
      'ECG if cardiac history'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Minimize bleeding risk'
      },
      {
        medication: 'Smoking',
        instruction: 'stop 4-6 weeks before',
        reason: 'Essential for tissue viability'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before each surgery',
    dayBeforeSurgery: [
      'Shower with antimicrobial soap',
      'Pack for overnight stay if needed',
      'Light meal in evening',
      'Early rest'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'All regular medications',
      'Entertainment for expansion visits',
      'Caregiver for transportation'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Morning shower with antimicrobial soap',
      'No makeup or jewelry',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['General anesthesia for placement and final surgery', 'Local anesthesia for expansion sessions'],
    procedureDescription: 'First Surgery (Placement): An incision is made adjacent to the area needing reconstruction. A pocket is created under the skin or muscle, and the silicone expander is placed. The wound is closed, and the fill port is left accessible. Expansion Sessions: Using sterile technique, saline is injected through the port every 1-2 weeks. Final Surgery (Reconstruction): The expander is removed through the same incision, and the expanded skin is advanced as a flap to cover the defect after excision of the scar or lesion.',
    duration: 'Placement: 1-2 hours. Expansion fills: 15-30 minutes. Final surgery: 2-4 hours.',
    whatToExpect: 'Two surgical procedures with a lengthy expansion period in between. Weekly clinic visits for fills. Progressive increase in size of expanded area.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Avoid pressure on expander site. Sleep on opposite side or back.',
      expectedSymptoms: [
        'Swelling and bruising around expander',
        'Tightness of skin over expander',
        'Visible bulge from expander',
        'Discomfort that improves over days'
      ],
      activityLevel: 'Light activities after placement surgery. Avoid strenuous exercise during expansion phase.'
    },
    woundCare: [
      {
        day: 'Days 1-7 post-placement',
        instruction: 'Keep dressing clean and dry. Monitor for signs of infection. No submersion in water.'
      },
      {
        day: 'During expansion phase',
        instruction: 'Keep fill site clean. Small dressing after each fill. Report any redness, drainage, or unusual pain.'
      },
      {
        day: 'After final surgery',
        instruction: 'Standard wound care. Suture removal at 10-14 days. Begin scar massage at 3-4 weeks.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10) after surgery, tightness after fills',
      medications: [
        'Paracetamol for regular pain',
        'Codeine for more significant pain',
        'Apply EMLA cream before expansion fills'
      ],
      nonPharmacological: [
        'Ice packs for swelling (wrapped, not direct)',
        'Relaxation techniques',
        'Gradual fills to manage discomfort'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Contact sports or trauma to expander',
        restriction: 'Avoid completely',
        duration: 'Until expander removed',
        reason: 'Risk of expander rupture or displacement'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid immersion',
        duration: 'Until all wounds healed',
        reason: 'Infection risk'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '4-6 weeks after each surgery',
        reason: 'Prevent wound breakdown'
      }
    ],
    dietaryGuidelines: [
      'Healthy balanced diet',
      'Adequate protein for tissue growth',
      'Stay well hydrated',
      'No smoking essential'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'After each fill',
        expectation: 'Visible increase in expanded tissue, tightness that settles within 24-48 hours'
      },
      {
        timeframe: '2-6 months',
        expectation: 'Adequate expansion achieved for planned reconstruction'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months post final surgery',
        expectation: 'Healed reconstruction, scars maturing, good tissue match'
      },
      {
        timeframe: '12-18 months',
        expectation: 'Final result with mature scars, excellent tissue match'
      }
    ],
    functionalRecovery: 'Excellent functional outcomes. Expanded tissue has normal sensation and properties. Contracture release provides improved mobility.',
    cosmeticOutcome: 'Excellent cosmetic outcomes as expanded tissue matches surrounding skin in color, texture, and hair bearing. Superior to skin grafts for visible areas.',
    successRate: 'Success rates of 85-95%. Complications occur in 15-20% but most are manageable without expander loss.',
    possibleComplications: [
      'Infection (5-10%)',
      'Expander exposure (5-10%)',
      'Deflation/leak',
      'Inadequate expansion',
      'Flap necrosis at final surgery',
      'Scarring'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Weekly during expansion',
        purpose: 'Saline fills and monitoring'
      },
      {
        timing: '1-2 weeks post each surgery',
        purpose: 'Wound check, suture removal'
      },
      {
        timing: '6 weeks post final surgery',
        purpose: 'Healing assessment'
      },
      {
        timing: '3, 6, 12 months',
        purpose: 'Long-term outcome assessment'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy if contracture release performed',
      'Scar therapy',
      'Psychological support if needed'
    ],
    lifestyleModifications: [
      'Protect expanded skin and reconstruction from sun',
      'No smoking',
      'Avoid trauma to area'
    ]
  },

  warningSigns: [
    'Redness, warmth, or swelling suggesting infection',
    'Thin or blanching skin over expander',
    'Pain not settling after fills',
    'Fluid draining from any wound or port site',
    'Sudden decrease in expander size (deflation)',
    'Expander visible through thin skin'
  ],

  emergencySigns: [
    'High fever with infected expander',
    'Expander exposed through skin',
    'Signs of systemic infection',
    'Necrotic skin over expander'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all expansion sessions',
      importance: 'critical',
      consequence: 'Missed sessions delay reconstruction and may affect tissue quality'
    },
    {
      requirement: 'Protect expander from trauma',
      importance: 'critical',
      consequence: 'Trauma can cause rupture or displacement'
    },
    {
      requirement: 'No smoking',
      importance: 'critical',
      consequence: 'Smoking increases complication rates significantly'
    },
    {
      requirement: 'Report any signs of infection immediately',
      importance: 'critical',
      consequence: 'Untreated infection may require expander removal'
    }
  ],

  whoGuidelines: [
    {
      title: 'Reconstructive Surgery Techniques',
      reference: 'WHO-RST 2020',
      keyPoints: [
        'Tissue expansion provides like tissue for reconstruction',
        'Superior aesthetic outcome compared to grafts',
        'Requires patient commitment to expansion schedule',
        'Careful patient selection essential for success'
      ]
    }
  ]
};

/**
 * Scar Revision
 */
export const scarRevision: EducationCondition = {
  id: 'reconstructive-scar-revision',
  name: 'Scar Revision',
  category: 'D',
  icdCode: 'Z42.1',
  description: 'Scar revision is a surgical procedure to improve the appearance or function of a scar. While no scar can be completely removed, revision techniques can make scars less noticeable and restore function restricted by scar contracture.',
  alternateNames: ['Scar Correction', 'Scar Improvement', 'Scar Reconstruction', 'Z-plasty', 'W-plasty'],
  
  overview: {
    definition: 'Scar revision encompasses a range of surgical and non-surgical techniques designed to improve the appearance and/or function of scars. Options include: simple excision (removing the scar and reclosing), Z-plasty or W-plasty (breaking up straight lines and realigning scars), dermabrasion, laser resurfacing, and tissue expansion for larger scars. The goal is to create a scar that is less noticeable and blends better with surrounding skin.',
    causes: [
      'Prominent or unsightly scars from previous surgery',
      'Traumatic scars in visible locations',
      'Hypertrophic or keloid scars',
      'Scar contracture limiting movement',
      'Burn scars affecting function or appearance',
      'Acne scarring',
      'Wide or depressed scars'
    ],
    symptoms: [
      'Scar that is raised, depressed, wide, or discolored',
      'Scar in conspicuous location causing distress',
      'Tight scar limiting joint movement',
      'Scar causing pain or itching',
      'Hypertrophic or keloid scarring'
    ],
    riskFactors: [
      'History of hypertrophic or keloid scarring',
      'Dark skin (higher risk of abnormal scarring)',
      'Smoking',
      'Diabetes',
      'Immunosuppression',
      'Poor nutrition',
      'Sun exposure to scar'
    ],
    complications: [
      'Recurrence of original scar type',
      'Keloid formation',
      'Wound dehiscence',
      'Infection',
      'Changes in skin sensation',
      'Asymmetry',
      'Unsatisfactory cosmetic result'
    ],
    prevalence: 'Scar revision is one of the most common plastic surgery procedures, performed to improve both functional and aesthetic outcomes.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Planning',
      duration: '1-2 consultations',
      description: 'Comprehensive assessment of scar characteristics and planning optimal revision strategy.',
      goals: [
        'Assess scar type and characteristics',
        'Determine patient expectations',
        'Choose optimal revision technique',
        'Time surgery appropriately (mature scars)',
        'Optimize patient condition'
      ],
      activities: [
        'Detailed scar assessment',
        'Photography and documentation',
        'Discussion of options and expectations',
        'Plan timing (usually wait 12-18 months for maturation)',
        'Pre-treatment with silicone/steroids if indicated',
        'Smoking cessation'
      ],
      warningSignsThisPhase: [
        'Unrealistic patient expectations',
        'History of keloid formation',
        'Scar still actively maturing'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Revision',
      duration: 'Day of surgery',
      description: 'Surgical procedure to revise the scar using chosen technique.',
      goals: [
        'Execute planned revision technique',
        'Achieve tension-free closure',
        'Align scar favorably with skin lines',
        'Minimize new scar formation'
      ],
      activities: [
        'Simple excision: remove scar and reclose',
        'Z-plasty: break up linear scar with Z-shaped incisions',
        'W-plasty: create irregular line that scatters light',
        'Geometric broken line closure',
        'Layered closure with deep dermal sutures',
        'Meticulous technique to minimize tension'
      ],
      warningSignsThisPhase: [
        'Excessive tension on closure',
        'Unexpected tissue findings',
        'Bleeding'
      ]
    },
    {
      phase: 3,
      name: 'Early Healing',
      duration: 'Weeks 1-4',
      description: 'Initial wound healing with careful wound management to optimize new scar formation.',
      goals: [
        'Primary wound healing',
        'Minimize tension on wound',
        'Prevent infection',
        'Begin scar management early'
      ],
      activities: [
        'Wound care and dressing changes',
        'Suture removal at 5-14 days depending on location',
        'Paper tape or steri-strips for support',
        'Avoid tension on wound',
        'Begin silicone therapy once wound closed'
      ],
      medications: [
        {
          name: 'Silicone gel/sheets',
          purpose: 'Prevent hypertrophic scarring',
          duration: '3-6 months'
        }
      ],
      warningSignsThisPhase: [
        'Wound opening',
        'Signs of infection',
        'Early hypertrophy',
        'Suture reaction'
      ]
    },
    {
      phase: 4,
      name: 'Scar Maturation and Management',
      duration: '3-18 months',
      description: 'Long-term scar management to achieve optimal final result.',
      goals: [
        'Optimal scar maturation',
        'Prevent hypertrophic scarring',
        'Achieve best cosmetic outcome',
        'Address any contracture'
      ],
      activities: [
        'Scar massage starting at 3-4 weeks',
        'Silicone gel or sheeting daily',
        'Sun protection essential',
        'Steroid injections if hypertrophy develops',
        'Pressure therapy if indicated',
        'Possible laser therapy for residual redness'
      ],
      warningSignsThisPhase: [
        'Scar becoming raised or thickened',
        'Increasing redness',
        'Scar becoming itchy or painful',
        'Contracture developing'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon',
      'Possibly dermatologist for complex scars',
      'Anesthetist if general anesthesia planned'
    ],
    investigations: [
      'Photography of scar',
      'Basic blood tests if general anesthesia',
      'Coagulation studies if on blood thinners'
    ],
    medications: [
      {
        medication: 'Blood thinners/aspirin',
        instruction: 'stop 7-10 days before',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Smoking',
        instruction: 'stop 4 weeks before',
        reason: 'Improve wound healing'
      },
      {
        medication: 'Vitamin E supplements',
        instruction: 'stop 2 weeks before',
        reason: 'May increase bleeding'
      }
    ],
    fastingInstructions: 'If general anesthesia: nothing from midnight. If local anesthesia: light meal is fine.',
    dayBeforeSurgery: [
      'Shower normally',
      'Arrange transport home',
      'Prepare recovery area at home'
    ],
    whatToBring: [
      'Comfortable clothing',
      'Driver if sedation or general anesthesia',
      'List of medications'
    ],
    dayOfSurgery: [
      'Follow fasting instructions if applicable',
      'Shower and wear clean, loose clothing',
      'No makeup in surgical area',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['Local anesthesia (most common)', 'Local with sedation', 'General anesthesia (larger revisions)'],
    procedureDescription: 'Simple Excision: The scar is cut out and the wound edges are brought together with careful layered closure. Z-plasty: The scar is excised with triangular extensions on each side. These triangular flaps are then transposed, changing the direction of the scar and adding length to release contracture. W-plasty: The scar is excised with a zigzag pattern, creating an irregular line that is less noticeable. All techniques emphasize meticulous closure with minimal tension.',
    duration: '30 minutes to 2 hours depending on complexity',
    whatToExpect: 'Most scar revisions are done under local anesthesia as day surgery. You will be awake but the area will be numb. You can go home the same day.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate area if limb surgery. Avoid tension on wound.',
      expectedSymptoms: [
        'Numbness from local anesthetic (wears off in hours)',
        'Mild swelling and bruising',
        'Mild to moderate pain',
        'Wound feels tight'
      ],
      activityLevel: 'Rest on day of surgery. Light activities from next day. Avoid straining wound.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep wound clean and dry. Small dressing may be removed after 24-48 hours.'
      },
      {
        day: 'Days 3-14',
        instruction: 'Keep wound clean. Paper tape or steri-strips to support wound. Avoid submerging in water.'
      },
      {
        day: 'After suture removal',
        instruction: 'Apply silicone gel twice daily. Begin gentle scar massage at 3-4 weeks. Sun protection essential.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild (2-4/10)',
      medications: [
        'Paracetamol 1000mg every 6 hours as needed',
        'Rarely need stronger analgesia'
      ],
      nonPharmacological: [
        'Ice packs for swelling',
        'Elevation if appropriate',
        'Rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Stretching the wound',
        restriction: 'Avoid any tension on wound',
        duration: '4-6 weeks',
        reason: 'Tension causes widening of scar'
      },
      {
        activity: 'Exercise',
        restriction: 'Light activity only',
        duration: '2-4 weeks',
        reason: 'Avoid stretching wound'
      },
      {
        activity: 'Sun exposure to scar',
        restriction: 'Complete protection',
        duration: '12-18 months',
        reason: 'Sun causes permanent pigmentation changes in new scars'
      }
    ],
    dietaryGuidelines: [
      'Normal healthy diet',
      'Adequate protein',
      'Stay well hydrated',
      'No smoking'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2 weeks',
        expectation: 'Wound healed, sutures removed, initial redness'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Scar may look pink and slightly raised initially - this is normal'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Scar beginning to fade and soften'
      },
      {
        timeframe: '12-18 months',
        expectation: 'Final result - scar should be pale, flat, and less noticeable than original'
      }
    ],
    functionalRecovery: 'Excellent recovery for contracture release - improved range of motion. Z-plasty adds length to contracted areas.',
    cosmeticOutcome: 'Scars can never be eliminated, but can be significantly improved. A well-positioned, fine line scar is much less noticeable than a wide, raised, or poorly positioned scar.',
    successRate: 'Patient satisfaction rates of 80-90% for appropriately selected procedures. Revision does not guarantee perfect skin.',
    possibleComplications: [
      'Recurrent hypertrophic or keloid scarring (especially if history)',
      'Wider scar than desired',
      'Infection',
      'Dehiscence',
      'Asymmetry',
      'Need for further revision'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '5-14 days',
        purpose: 'Suture removal'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Early scar assessment, adjust management'
      },
      {
        timing: '3 months',
        purpose: 'Assess scar maturation, possible steroid injection'
      },
      {
        timing: '6-12 months',
        purpose: 'Final outcome assessment'
      }
    ],
    rehabilitationNeeds: [
      'Scar massage therapy',
      'Silicone therapy',
      'Physiotherapy if contracture release',
      'Possible laser treatment for redness'
    ],
    lifestyleModifications: [
      'Strict sun protection of scar for 12-18 months',
      'Daily scar massage for 3-6 months',
      'Silicone gel application',
      'No smoking'
    ]
  },

  warningSigns: [
    'Wound opening (dehiscence)',
    'Signs of infection: increasing redness, swelling, drainage',
    'Scar becoming raised or thickened early',
    'Increasing pain or tenderness',
    'Suture reaction (red bumps at suture sites)'
  ],

  emergencySigns: [
    'High fever with wound infection',
    'Rapidly spreading redness (cellulitis)',
    'Significant bleeding from wound',
    'Complete wound breakdown'
  ],

  complianceRequirements: [
    {
      requirement: 'Avoid any tension or stretching of wound',
      importance: 'critical',
      consequence: 'Tension causes scar to widen'
    },
    {
      requirement: 'Complete sun protection of scar',
      importance: 'critical',
      consequence: 'Sun exposure causes permanent pigmentation changes'
    },
    {
      requirement: 'Consistent silicone therapy and massage',
      importance: 'important',
      consequence: 'These interventions significantly improve final scar'
    },
    {
      requirement: 'No smoking',
      importance: 'important',
      consequence: 'Smoking impairs wound healing and scar quality'
    }
  ],

  whoGuidelines: [
    {
      title: 'Scar Management Principles',
      reference: 'International Scar Guidelines 2020',
      keyPoints: [
        'Wait for scar maturation before revision (12-18 months)',
        'Silicone therapy is first-line prevention of hypertrophy',
        'Z-plasty effective for contracture release',
        'Manage patient expectations - scars cannot be eliminated',
        'Sun protection essential during maturation'
      ]
    }
  ]
};

// Export reconstructive surgery conditions part 2
export const reconstructiveSurgeryPart2 = [tissueExpansion, scarRevision];
