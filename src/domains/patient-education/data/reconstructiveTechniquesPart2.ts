/**
 * Patient Education Content - Category K: Reconstructive Techniques and Procedures
 * Part 2: Local Flaps and Free Tissue Transfer
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Local and Regional Flaps
 */
export const localRegionalFlaps: EducationCondition = {
  id: 'recon-local-flaps',
  name: 'Local and Regional Flaps',
  category: 'K',
  icdCode: 'Z96.89',
  description: 'Surgical techniques that move nearby tissue with its blood supply to cover wounds or reconstruct defects.',
  alternateNames: ['Rotation Flap', 'Advancement Flap', 'Transposition Flap', 'Pedicled Flap', 'V-Y Advancement'],
  
  overview: {
    definition: 'Local and regional flaps are reconstructive surgical techniques where skin and underlying tissue are moved from an adjacent area to cover a wound or defect, while maintaining attachment to their original blood supply. Unlike skin grafts (which are completely detached), flaps bring their own blood supply, making them suitable for covering bone, tendon, or areas with poor blood supply. Local flaps are moved from tissue immediately adjacent to the defect; regional flaps come from nearby but not immediately adjacent areas.',
    causes: [
      'Skin cancer removal (Mohs surgery defects)',
      'Traumatic wounds',
      'Burn reconstruction',
      'Chronic wounds over bone or tendon',
      'Pressure sore coverage',
      'Congenital defects',
      'Post-surgical defects',
      'Radiation-damaged tissue'
    ],
    symptoms: [
      'Wound that cannot be closed directly',
      'Exposed bone, tendon, or hardware',
      'Defect too large for skin graft',
      'Need for tissue with good blood supply',
      'Need for padding or bulk'
    ],
    riskFactors: [
      'Smoking (major risk)',
      'Diabetes',
      'Peripheral vascular disease',
      'Previous radiation',
      'Malnutrition',
      'Chronic steroid use',
      'Advanced age'
    ],
    complications: [
      'Flap necrosis (partial or complete)',
      'Wound dehiscence',
      'Infection',
      'Hematoma',
      'Seroma',
      'Donor site problems',
      'Poor cosmetic result',
      'Need for revision'
    ],
    prevalence: 'Local flaps are among the most commonly performed reconstructive procedures, used daily in plastic and reconstructive surgery.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Planning and Preparation',
      duration: 'Pre-operative assessment',
      description: 'Careful planning of flap design based on defect and local tissue.',
      goals: [
        'Define defect size and location',
        'Assess available local tissue',
        'Plan flap design',
        'Optimize patient health'
      ],
      activities: [
        'Defect assessment',
        'Tissue quality evaluation',
        'Blood supply assessment (may use Doppler)',
        'Marking of planned flap',
        'Medical optimization',
        'Smoking cessation'
      ],
      warningSignsThisPhase: [
        'Insufficient local tissue',
        'Poor tissue quality',
        'Active infection',
        'Continued smoking'
      ]
    },
    {
      phase: 2,
      name: 'Flap Surgery',
      duration: '1-3 hours',
      description: 'Raising and moving the flap to cover the defect.',
      goals: [
        'Raise flap preserving blood supply',
        'Inset flap into defect',
        'Close donor site',
        'Ensure flap perfusion'
      ],
      activities: [
        'General or local anesthesia',
        'Defect preparation',
        'Flap incision and elevation',
        'Rotation/advancement/transposition',
        'Layered closure',
        'Drain placement if needed',
        'Dressing application'
      ],
      warningSignsThisPhase: [
        'Poor flap perfusion (color)',
        'Excessive tension',
        'Bleeding'
      ]
    },
    {
      phase: 3,
      name: 'Critical Healing Period',
      duration: 'Days 1-7',
      description: 'Monitoring flap viability and preventing complications.',
      goals: [
        'Maintain flap blood supply',
        'Prevent hematoma',
        'Prevent infection',
        'Rest and protect flap'
      ],
      activities: [
        'Regular flap checks (color, warmth, capillary refill)',
        'Rest and elevation',
        'Drain management if present',
        'Wound care',
        'Avoid pressure on flap'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '1-2 weeks'
        },
        {
          name: 'Aspirin (sometimes)',
          purpose: 'Improve blood flow',
          duration: 'As directed'
        }
      ],
      warningSignsThisPhase: [
        'Flap turning blue, white, or mottled',
        'Cold flap',
        'Absent capillary refill',
        'Increasing pain',
        'Bleeding under flap',
        'Wound opening'
      ]
    },
    {
      phase: 4,
      name: 'Healing and Maturation',
      duration: 'Weeks 2-12',
      description: 'Continued healing, suture removal, scar management.',
      goals: [
        'Complete wound healing',
        'Begin scar management',
        'Return to normal activities',
        'Optimize cosmetic result'
      ],
      activities: [
        'Suture removal (7-14 days)',
        'Wound monitoring',
        'Begin scar massage when healed',
        'Sun protection',
        'Gradual activity increase'
      ],
      warningSignsThisPhase: [
        'Wound breakdown',
        'Excessive scarring',
        'Flap contraction',
        'Persistent problems'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon or reconstructive surgeon',
      'Mohs surgeon (if for skin cancer)',
      'Medical clearance if needed'
    ],
    investigations: [
      'Blood tests',
      'Blood supply assessment if needed',
      'Photography documentation'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop or continue depending on situation'
      },
      {
        medication: 'Smoking',
        instruction: 'stop',
        reason: 'Smoking significantly increases flap failure risk'
      }
    ],
    fastingInstructions: 'Depends on anesthesia type. Follow specific instructions given.',
    dayBeforeSurgery: [
      'Shower with regular or antiseptic soap',
      'Do not apply creams or makeup to area',
      'Prepare recovery area'
    ],
    whatToBring: [
      'Driver (even for local anesthesia)',
      'Loose clothing that avoids surgical area',
      'List of medications'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Arrive clean and on time',
      'Wear comfortable loose clothing'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia (small flaps), sedation, or general anesthesia (larger flaps)',
    procedureDescription: 'Common types include: Rotation flaps - semicircular flap rotated into the defect; Advancement flaps - tissue pushed forward in a straight line; Transposition flaps - tissue moved over an intervening bridge of skin; V-Y advancement - V-shaped incision advanced as a Y. The surgeon designs the flap based on defect size, location, and available tissue. The flap is raised carefully preserving its blood supply (random pattern or known blood vessel). It is moved into position and sutured in layers. The donor site is closed directly or with a skin graft.',
    duration: '1-3 hours depending on complexity',
    whatToExpect: 'You may be awake with the area numbed, sedated, or asleep. After surgery, the flap will be slightly swollen. There will be suture lines where the flap was moved.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep flap elevated if possible. Avoid any pressure on flap.',
      expectedSymptoms: [
        'Swelling',
        'Bruising (normal)',
        'Some pain',
        'Suture lines visible',
        'Possible drain'
      ],
      activityLevel: 'Rest. Avoid activity that increases blood flow to area (bending over, straining).'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep dressings dry. Monitor flap color if visible. Report any concerns immediately.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Dressing change as directed. Gentle cleaning. Continue flap monitoring.'
      },
      {
        day: 'Weeks 1-4',
        instruction: 'Suture removal. Begin gentle wound care. Start scar massage once fully healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10)',
      medications: [
        'Prescribed pain medication for first few days',
        'Paracetamol and ibuprofen thereafter',
        'Ice packs (carefully, not directly on flap) may help'
      ],
      nonPharmacological: [
        'Rest and elevation',
        'Cool environment',
        'Distraction'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Bending over',
        restriction: 'Minimize',
        duration: '1 week',
        reason: 'Increases blood pressure to head/face flaps'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '2-4 weeks',
        reason: 'Prevents bleeding and swelling'
      },
      {
        activity: 'Sun exposure',
        restriction: 'Avoid',
        duration: '12 months',
        reason: 'Prevents hyperpigmentation of scar'
      }
    ],
    dietaryGuidelines: [
      'Normal healthy diet',
      'Adequate protein for healing',
      'Avoid alcohol for first week (affects bleeding)',
      'Stay hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Flap viable, initial healing'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Sutures removed, wound healed'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Scar maturation, good color match'
      },
      {
        timeframe: '12 months',
        expectation: 'Final result, scars faded'
      }
    ],
    functionalRecovery: 'Full function typically restored. Sensation may be altered initially but often returns.',
    cosmeticOutcome: 'Excellent color and texture match since local tissue used. Scars at flap edges, which usually fade well.',
    successRate: 'Flap survival is 95%+ in non-smokers with good technique. Higher failure rates with smoking.',
    possibleComplications: [
      {
        complication: 'Partial flap necrosis',
        riskLevel: 'low',
        prevention: 'Good design, no tension, no smoking',
        management: 'Debride, allow to heal or regraft'
      },
      {
        complication: 'Trapdoor deformity',
        riskLevel: 'low',
        prevention: 'Good technique, may be unavoidable',
        management: 'Scar massage, possible revision'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '24-48 hours',
        purpose: 'Early flap check'
      },
      {
        timing: '1 week',
        purpose: 'Wound assessment, possibly suture removal'
      },
      {
        timing: '2 weeks',
        purpose: 'Complete suture removal'
      },
      {
        timing: '3 months',
        purpose: 'Scar assessment, possible revision planning'
      }
    ],
    rehabilitationNeeds: [
      'Scar massage instruction',
      'Sun protection education',
      'Possible scar treatment if hypertrophic'
    ],
    lifestyleModifications: [
      'Strict sun protection for 12 months',
      'Daily moisturization of scar',
      'Scar massage 2-3 times daily once healed'
    ]
  },

  warningSigns: [
    'Flap turning dark, blue, white, or mottled',
    'Flap becoming cold',
    'Increasing pain',
    'Swelling under flap (hematoma)',
    'Wound opening',
    'Signs of infection (redness spreading, pus)'
  ],

  emergencySigns: [
    'Sudden color change in flap (can be salvaged if caught early)',
    'Heavy bleeding',
    'Signs of severe infection'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolutely no smoking',
      importance: 'critical',
      consequence: 'Smoking causes flap failure'
    },
    {
      requirement: 'Avoid pressure on flap',
      importance: 'critical',
      consequence: 'Pressure compromises blood supply'
    },
    {
      requirement: 'Attend early follow-up',
      importance: 'critical',
      consequence: 'Early detection of problems allows salvage'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Reconstructive Surgery',
      reference: 'WHO Surgical Guidelines',
      keyPoints: [
        'Local flaps provide excellent reconstruction',
        'Proper planning essential',
        'Smoking cessation critical',
        'Post-operative monitoring important'
      ]
    }
  ]
};

/**
 * Free Tissue Transfer (Microvascular Surgery)
 */
export const freeTissueTransfer: EducationCondition = {
  id: 'recon-free-flap',
  name: 'Free Tissue Transfer (Microvascular Free Flap)',
  category: 'K',
  icdCode: 'Z96.89',
  description: 'Advanced reconstructive surgery where tissue is moved from one part of the body to another and reconnected using microsurgery.',
  alternateNames: ['Free Flap', 'Microvascular Reconstruction', 'Free Tissue Transfer Surgery'],
  
  overview: {
    definition: 'Free tissue transfer (free flap) is an advanced reconstructive technique where tissue (skin, fat, muscle, bone, or combinations) is completely removed from one part of the body (donor site) and transferred to the defect site. The blood vessels supplying the tissue are reconnected to blood vessels at the recipient site using microsurgery (operating through a microscope on vessels 1-3mm in diameter). This allows reconstruction of complex defects anywhere in the body with well-vascularized tissue.',
    causes: [
      'Head and neck cancer reconstruction',
      'Breast reconstruction (DIEP, TRAM flaps)',
      'Lower limb trauma with bone and soft tissue loss',
      'Chronic wounds with exposed bone/hardware',
      'Complex hand injuries',
      'Facial reconstruction',
      'Pressure sores over bone'
    ],
    symptoms: [
      'Large complex defect',
      'Local tissue inadequate',
      'Need for composite tissue (bone + skin)',
      'Failed previous reconstruction',
      'Need for significant bulk'
    ],
    riskFactors: [
      'Smoking (major risk)',
      'Diabetes',
      'Peripheral vascular disease',
      'Obesity',
      'Previous radiation',
      'Blood clotting disorders',
      'Previous surgery affecting vessels'
    ],
    complications: [
      'Flap failure (5-10%)',
      'Partial flap loss',
      'Venous or arterial thrombosis',
      'Hematoma',
      'Donor site problems',
      'Infection',
      'Fat necrosis',
      'Need for take-back surgery'
    ],
    prevalence: 'Thousands of free flaps are performed annually worldwide. Success rates in experienced centers exceed 95%.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Comprehensive Planning',
      duration: 'Days to weeks before surgery',
      description: 'Detailed assessment and planning of flap and recipient vessels.',
      goals: [
        'Define reconstruction needs',
        'Select appropriate flap',
        'Map blood vessels (CT angiography)',
        'Optimize patient health'
      ],
      activities: [
        'Multidisciplinary planning',
        'CT or MR angiography',
        'Doppler vessel mapping',
        'Medical optimization',
        'Smoking cessation (minimum 4 weeks)',
        'Nutrition optimization',
        'Patient education'
      ],
      warningSignsThisPhase: [
        'No suitable recipient vessels',
        'Uncontrolled medical conditions',
        'Continued smoking',
        'Severe malnutrition'
      ]
    },
    {
      phase: 2,
      name: 'Free Flap Surgery',
      duration: '6-12 hours',
      description: 'Major surgery with simultaneous flap harvest and recipient preparation.',
      goals: [
        'Harvest flap with vessels',
        'Prepare recipient vessels',
        'Perform microvascular anastomosis',
        'Inset and shape flap',
        'Close donor site'
      ],
      activities: [
        'General anesthesia',
        'Two-team approach often (harvest and recipient)',
        'Flap elevation with vessels',
        'Recipient vessel preparation',
        'Microvascular anastomosis',
        'Flap inset and shaping',
        'Donor site closure',
        'External monitoring device (sometimes)'
      ],
      warningSignsThisPhase: [
        'Poor vessel quality',
        'Anastomosis difficulty',
        'Flap ischemia time prolonged',
        'Inadequate flap perfusion after anastomosis'
      ]
    },
    {
      phase: 3,
      name: 'Critical Monitoring Period',
      duration: 'Days 1-7',
      description: 'Intensive monitoring of flap viability - most failures occur in this period.',
      goals: [
        'Maintain flap perfusion',
        'Detect vascular problems early',
        'Return to operating room if needed',
        'Prevent complications'
      ],
      activities: [
        'Hourly flap checks (color, warmth, Doppler, capillary refill)',
        'Bedrest initially',
        'Hydration maintenance',
        'Anticoagulation as prescribed',
        'Temperature control',
        'Pain management',
        'Prevention of hypotension'
      ],
      medications: [
        {
          name: 'Anticoagulation (aspirin, heparin, or dextran)',
          purpose: 'Prevent clot in anastomosis',
          duration: '5-7 days or longer'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Color change (pale = arterial; blue/congested = venous)',
        'Temperature drop',
        'Absent Doppler signal',
        'Slow or absent capillary refill',
        'Rapid or excessive capillary refill with dark blood',
        'Increasing swelling'
      ]
    },
    {
      phase: 4,
      name: 'Recovery and Rehabilitation',
      duration: 'Weeks 2-12',
      description: 'Flap stabilization, wound healing, and beginning rehabilitation.',
      goals: [
        'Complete wound healing',
        'Begin rehabilitation',
        'Return to normal activities',
        'Donor site recovery'
      ],
      activities: [
        'Less frequent flap monitoring',
        'Wound care',
        'Gradual mobilization',
        'Physical therapy if indicated',
        'Scar management begins'
      ],
      warningSignsThisPhase: [
        'Wound breakdown',
        'Infection',
        'Fat necrosis',
        'Donor site problems'
      ]
    },
    {
      phase: 5,
      name: 'Long-Term Follow-Up and Refinement',
      duration: 'Months to years',
      description: 'Assessing final result and performing any revisions.',
      goals: [
        'Optimal functional result',
        'Cosmetic refinement if needed',
        'Long-term monitoring',
        'Complete rehabilitation'
      ],
      activities: [
        'Regular follow-up',
        'Revision surgery if needed (often for debulking)',
        'Scar management',
        'Monitoring for recurrence (cancer cases)',
        'Long-term function assessment'
      ],
      warningSignsThisPhase: [
        'Cancer recurrence',
        'Chronic problems',
        'Significant functional deficit'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Reconstructive plastic surgeon',
      'Primary surgeon (oncologist, orthopedist)',
      'Anesthesia team',
      'Medical optimization',
      'Nutritionist'
    ],
    investigations: [
      'CT or MR angiography',
      'Blood tests including clotting studies',
      'Cardiac evaluation',
      'Doppler mapping of vessels',
      'Cross-match blood for transfusion'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop or adjust'
      },
      {
        medication: 'Smoking',
        instruction: 'stop',
        reason: 'Must stop 4-6 weeks before - dramatically affects success'
      },
      {
        medication: 'Caffeine',
        instruction: 'modify',
        reason: 'Can cause vessel spasm'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before surgery.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Prepare for extended hospital stay (5-10 days)',
      'Arrange extended recovery support',
      'Final pre-operative review'
    ],
    whatToBring: [
      'Items for hospital stay',
      'Loose comfortable clothing',
      'List of all medications',
      'Support person contact information'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Shower with antiseptic',
      'Arrive early as directed',
      'Prepare mentally for major surgery'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia for 6-12 hours',
    procedureDescription: 'This is major surgery often performed by two surgical teams. Common donor flaps include: DIEP (Deep Inferior Epigastric Perforator) - abdominal tissue for breast; ALT (Anterolateral Thigh) - thigh tissue for many uses; Fibula - leg bone with skin for jaw reconstruction; Latissimus - back muscle for various uses; Radial Forearm - arm skin for mouth/pharynx. One team harvests the flap while the other prepares the recipient site. The flap is transferred and its artery and vein are connected to recipient vessels using an operating microscope (vessels 1-3mm). The flap is shaped and sutured in place.',
    duration: '6-12 hours depending on complexity',
    whatToExpect: 'This is lengthy major surgery. You will wake up with monitoring devices on the flap. You will be in a specialized bed/unit initially. You will feel tired from the long anesthesia.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Specific positioning to protect flap and vessels - varies by flap type. Avoid any pressure on flap or pedicle.',
      expectedSymptoms: [
        'Significant fatigue',
        'Flap swelling',
        'Donor site pain',
        'Multiple monitoring devices',
        'Limited mobility initially'
      ],
      activityLevel: 'Bed rest initially. Specific movement restrictions based on flap location.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Flap monitoring every 1-2 hours. Dressings left in place. Minimal handling.'
      },
      {
        day: 'Weeks 1-4',
        instruction: 'Transition to regular wound care. Donor site care. Gradual mobilization.'
      },
      {
        day: 'Weeks 4+',
        instruction: 'Regular wound care. Scar management begins.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Significant initially (6-8/10), managed with multiple medications',
      medications: [
        'Patient-controlled analgesia (PCA) initially',
        'Transition to oral medications',
        'Specific pain management for donor site'
      ],
      nonPharmacological: [
        'Positioning',
        'Temperature control (warmth aids blood flow)',
        'Distraction and support'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Position changes (depends on flap)',
        restriction: 'Specific restrictions',
        duration: '1-2 weeks',
        reason: 'Protect vessel pedicle'
      },
      {
        activity: 'Strenuous activity',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Smoking',
        restriction: 'Absolutely prohibited',
        duration: 'Permanently ideally',
        reason: 'Risk to flap and future healing'
      }
    ],
    dietaryGuidelines: [
      'High protein diet for healing',
      'Adequate calories',
      'Good hydration (helps blood flow)',
      'Avoid caffeine initially (vessel spasm)',
      'Avoid alcohol'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '48-72 hours',
        expectation: 'Flap viability confirmed'
      },
      {
        timeframe: '1 week',
        expectation: 'Past highest risk period'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Wounds healed, flap matured'
      },
      {
        timeframe: '1 year',
        expectation: 'Final result (may need debulking)'
      }
    ],
    functionalRecovery: 'Depends on reconstruction type. Free flaps can restore function (e.g., ability to eat after head/neck cancer) and form (e.g., breast reconstruction).',
    cosmeticOutcome: 'Modern free flaps can achieve excellent results. Often need revision for optimal cosmesis. Donor site scar is trade-off.',
    successRate: 'Flap survival is 95-98% in experienced microsurgery centers. Re-exploration if needed salvages many compromised flaps.',
    possibleComplications: [
      {
        complication: 'Flap failure',
        riskLevel: 'low',
        prevention: 'Experienced team, no smoking, close monitoring',
        management: 'Emergency take-back may salvage; otherwise alternate reconstruction'
      },
      {
        complication: 'Partial necrosis',
        riskLevel: 'low',
        prevention: 'Good flap design and technique',
        management: 'Debride, may need additional coverage'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Hourly for 48-72 hours',
        purpose: 'Flap monitoring'
      },
      {
        timing: 'Daily while in hospital',
        purpose: 'Continued monitoring and wound care'
      },
      {
        timing: '2 weeks',
        purpose: 'Post-discharge check'
      },
      {
        timing: '1-3 months',
        purpose: 'Healing assessment, plan any revisions'
      },
      {
        timing: '6-12 months',
        purpose: 'Long-term follow-up, final assessment'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy (often extensive)',
      'Occupational therapy (for hand reconstruction)',
      'Speech therapy (head/neck reconstruction)',
      'Lymphedema management if applicable'
    ],
    lifestyleModifications: [
      'Lifelong smoking cessation',
      'Careful monitoring of reconstructed area',
      'Protection of flap during healing',
      'Follow-up for cancer surveillance if applicable'
    ]
  },

  warningSigns: [
    'Flap color change (pale or blue/congested)',
    'Flap temperature drop',
    'Loss of Doppler signal',
    'Abnormal capillary refill',
    'Sudden swelling',
    'Any concerns about flap',
    'Fever'
  ],

  emergencySigns: [
    'Sudden flap color change (requires immediate evaluation - flap may be salvageable)',
    'Severe pain in flap',
    'Heavy bleeding',
    'Signs of severe infection'
  ],

  complianceRequirements: [
    {
      requirement: 'Hourly flap monitoring compliance (patient or nurse)',
      importance: 'critical',
      consequence: 'Early detection of problems saves flaps'
    },
    {
      requirement: 'Absolute smoking cessation',
      importance: 'critical',
      consequence: 'Smoking causes flap failure'
    },
    {
      requirement: 'Report ANY concerns about flap immediately',
      importance: 'critical',
      consequence: 'Time is tissue - early intervention saves flaps'
    },
    {
      requirement: 'Follow positioning instructions exactly',
      importance: 'critical',
      consequence: 'Wrong position can kink or compress vessels'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Complex Reconstruction',
      reference: 'WHO Surgical Guidelines',
      keyPoints: [
        'Requires specialized microsurgical expertise',
        'Multidisciplinary approach essential',
        'Intensive post-operative monitoring critical',
        'Can restore form and function after devastating injuries'
      ]
    }
  ]
};

// Export reconstructive techniques part 2
export const reconstructiveTechniquesPart2 = [localRegionalFlaps, freeTissueTransfer];
