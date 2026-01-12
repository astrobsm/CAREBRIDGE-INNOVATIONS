/**
 * Patient Education Content - Category D: Reconstructive Surgery
 * Part 1: Skin Grafts and Flaps
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Skin Grafts
 */
export const skinGrafts: EducationCondition = {
  id: 'reconstructive-skin-grafts',
  name: 'Skin Grafts',
  category: 'D',
  icdCode: 'Z48.290',
  description: 'A skin graft is a surgical procedure that involves removing healthy skin from one area of the body (donor site) and transplanting it to cover a wound or area with missing skin (recipient site).',
  alternateNames: ['Skin Transplant', 'Dermal Graft', 'Split-Thickness Skin Graft (STSG)', 'Full-Thickness Skin Graft (FTSG)'],
  
  overview: {
    definition: 'Skin grafting is a reconstructive surgical technique where skin is harvested from a donor site on the patient\'s body and transplanted to cover wounds, burns, or areas of skin loss. There are two main types: Split-Thickness Skin Grafts (STSG) containing epidermis and part of dermis, and Full-Thickness Skin Grafts (FTSG) containing epidermis and entire dermis. The choice depends on wound location, size, and functional/cosmetic requirements.',
    causes: [
      'Burns requiring skin coverage',
      'Traumatic wounds with skin loss',
      'Surgical wounds after tumor removal',
      'Chronic wounds not healing with conservative care',
      'Pressure injuries requiring coverage',
      'Diabetic foot ulcers',
      'Venous leg ulcers after preparation'
    ],
    symptoms: [
      'Open wound requiring coverage',
      'Granulating wound bed ready for grafting',
      'Skin defect after excision',
      'Contracture requiring release and resurfacing'
    ],
    riskFactors: [
      'Poor wound bed (infection, necrosis)',
      'Smoking (major risk for graft failure)',
      'Diabetes with poor control',
      'Peripheral vascular disease',
      'Immunosuppression',
      'Malnutrition',
      'Radiation damage to recipient site'
    ],
    complications: [
      'Graft failure (partial or complete)',
      'Infection',
      'Hematoma under graft',
      'Seroma formation',
      'Contracture of graft',
      'Poor cosmetic outcome',
      'Donor site complications'
    ],
    prevalence: 'Skin grafting is one of the most commonly performed reconstructive procedures worldwide, essential for managing extensive wounds and burns.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Operative Wound Preparation',
      duration: '1-4 weeks before surgery',
      description: 'Preparing the wound bed to receive the graft. A clean, granulating wound bed is essential for graft success.',
      goals: [
        'Achieve clean, granulating wound bed',
        'Eliminate infection',
        'Optimize patient health',
        'Plan donor site selection',
        'Ensure adequate nutrition'
      ],
      activities: [
        'Wound bed preparation with appropriate dressings',
        'Debridement of non-viable tissue',
        'Treatment of wound infection',
        'Negative pressure wound therapy if needed',
        'Nutritional optimization',
        'Smoking cessation (mandatory)',
        'Blood glucose optimization for diabetics'
      ],
      medications: [
        {
          name: 'Antibiotics (if wound infected)',
          purpose: 'Clear wound infection before grafting',
          duration: 'Until wound culture negative'
        }
      ],
      warningSignsThisPhase: [
        'Wound infection not clearing',
        'Poor granulation tissue',
        'Patient unable to stop smoking',
        'Uncontrolled diabetes'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Procedure',
      duration: 'Day of surgery',
      description: 'Harvesting skin from donor site and applying to prepared recipient wound bed.',
      goals: [
        'Harvest appropriate graft type and size',
        'Secure graft to wound bed',
        'Minimize donor site morbidity',
        'Ensure graft-bed contact'
      ],
      activities: [
        'Final wound bed preparation',
        'Graft harvest with dermatome (STSG) or excision (FTSG)',
        'Meshing of graft if needed for larger wounds',
        'Graft application and fixation',
        'Bolster dressing application',
        'Donor site dressing'
      ],
      warningSignsThisPhase: [
        'Inadequate hemostasis (bleeding under graft)',
        'Poor wound bed quality found at surgery',
        'Insufficient donor skin available'
      ]
    },
    {
      phase: 3,
      name: 'Graft Take Phase',
      duration: 'Days 1-7 post-op',
      description: 'Critical period when the graft establishes blood supply from the wound bed. The graft must remain immobilized and protected.',
      goals: [
        'Protect graft from shear and movement',
        'Prevent fluid accumulation under graft',
        'Establish vascularization (graft take)',
        'Prevent infection',
        'Manage donor site'
      ],
      activities: [
        'Strict immobilization of grafted area',
        'Bolster dressing kept in place 5-7 days',
        'Monitor for hematoma/seroma',
        'Pain management',
        'Donor site care',
        'Elevation if limb grafted'
      ],
      medications: [
        {
          name: 'Prophylactic Antibiotics',
          purpose: 'Prevent graft infection',
          duration: '5-7 days'
        },
        {
          name: 'Analgesics',
          purpose: 'Pain control especially for donor site',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Graft appearing dark or pale',
        'Fluid collecting under graft',
        'Fever or signs of infection',
        'Graft moving or shearing'
      ]
    },
    {
      phase: 4,
      name: 'Graft Maturation',
      duration: 'Weeks 2-12',
      description: 'The graft matures, establishes full circulation, and integrates with surrounding tissue. Gradual return to activity.',
      goals: [
        'Complete graft take and maturation',
        'Prevent contracture',
        'Donor site healing',
        'Gradual activity resumption',
        'Scar management'
      ],
      activities: [
        'Transition to lighter dressings',
        'Begin gentle massage once healed',
        'Moisturization of graft and donor site',
        'Sun protection',
        'Pressure garments if indicated',
        'Range of motion exercises for joints'
      ],
      warningSignsThisPhase: [
        'Partial graft loss',
        'Contracture developing',
        'Hypertrophic scarring',
        'Donor site not healing'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic/Reconstructive surgeon',
      'Wound care nurse for wound bed preparation',
      'Dietitian for nutritional optimization',
      'Anesthetist for pre-operative assessment',
      'Physiotherapist for post-operative planning'
    ],
    investigations: [
      'Complete blood count',
      'Coagulation studies',
      'Blood glucose and HbA1c for diabetics',
      'Wound swab for culture',
      'Nutritional markers (albumin, prealbumin)',
      'Doppler studies if vascular disease suspected'
    ],
    medications: [
      {
        medication: 'Aspirin/Blood thinners',
        instruction: 'stop 7 days before surgery',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Smoking/Nicotine',
        instruction: 'stop minimum 4 weeks before',
        reason: 'Critical for graft survival - nicotine causes vasoconstriction'
      },
      {
        medication: 'Nutritional supplements',
        instruction: 'start if deficient',
        reason: 'Optimize healing capacity'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before surgery',
    dayBeforeSurgery: [
      'Shower with antimicrobial soap',
      'Shave donor site if instructed',
      'Light meal in evening',
      'No alcohol',
      'Arrange transport and home support'
    ],
    whatToBring: [
      'Loose, comfortable clothing',
      'All current medications',
      'Walking aids if using',
      'Someone to drive you home'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Take approved medications with sip of water',
      'Wear comfortable, loose clothing',
      'No jewelry or makeup'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['General anesthesia', 'Regional anesthesia', 'Local anesthesia with sedation (small grafts)'],
    procedureDescription: 'For Split-Thickness Skin Grafts: A dermatome is used to harvest a thin layer of skin (typically from thigh, buttock, or arm). The graft is often meshed (perforated) to expand coverage and allow drainage. For Full-Thickness Skin Grafts: An ellipse of skin is excised (commonly from groin, neck, or behind ear) and the donor site is closed directly. The graft is sutured or stapled to the wound bed and covered with a bolster dressing to ensure contact.',
    duration: '1-3 hours depending on wound size',
    whatToExpect: 'Patient will be anesthetized. Both donor and recipient sites will be treated. Dressings will be bulky. May need to stay overnight for larger grafts.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate grafted limb. Keep grafted area completely immobile. No pressure on graft.',
      expectedSymptoms: [
        'Pain at donor site (often more painful than graft site)',
        'Swelling around grafted area',
        'Bulky dressings',
        'Limited mobility due to immobilization'
      ],
      activityLevel: 'Bed rest for 48-72 hours for larger grafts. Strict immobilization of grafted area for 5-7 days.'
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'DO NOT remove bolster dressing. Keep completely dry. Monitor for drainage, odor, or fever.'
      },
      {
        day: 'Days 5-7',
        instruction: 'First dressing change by medical team. Assess graft take. Apply non-adherent dressing.'
      },
      {
        day: 'Weeks 2-4',
        instruction: 'Gentle daily dressing with moisturizer once graft stable. Begin gentle massage.'
      },
      {
        day: 'Donor site',
        instruction: 'Keep dressing dry. STSG donor site heals in 10-14 days. FTSG donor site sutured and heals in 10-14 days.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10), donor site often more painful',
      medications: [
        'Paracetamol 1000mg every 6 hours',
        'Codeine or tramadol for breakthrough pain',
        'NSAIDs if not contraindicated'
      ],
      nonPharmacological: [
        'Elevation of grafted limb',
        'Ice packs around (not on) dressings',
        'Distraction techniques'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Movement of grafted area',
        restriction: 'Complete immobilization',
        duration: '5-7 days',
        reason: 'Movement prevents graft from taking'
      },
      {
        activity: 'Wetting the graft',
        restriction: 'Keep completely dry',
        duration: 'Until first dressing change',
        reason: 'Moisture promotes infection and loosens dressing'
      },
      {
        activity: 'Exercise and heavy activity',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Protect healing graft and donor site'
      },
      {
        activity: 'Sun exposure',
        restriction: 'Complete protection',
        duration: '12 months',
        reason: 'New skin is very sensitive and will burn/pigment abnormally'
      }
    ],
    dietaryGuidelines: [
      'High protein diet (1.5g/kg) essential for healing',
      'Adequate calories for tissue repair',
      'Vitamin C 500-1000mg daily',
      'Zinc 40mg daily',
      'Stay well hydrated',
      'No alcohol for first 2 weeks',
      'NO SMOKING - critical for graft survival'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '5-7 days',
        expectation: 'Graft should be pink/red indicating blood supply established (graft take)'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Graft well adherent, donor site healing, reduced swelling'
      },
      {
        timeframe: '4 weeks',
        expectation: 'Graft stable, may begin gentle stretching if over joint'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Graft matured, color stabilizing, normal activities resumed'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Final appearance. Grafts remain slightly different in color/texture from surrounding skin.'
      }
    ],
    functionalRecovery: 'Full functional recovery expected for most grafts. Grafts over joints may require physiotherapy. FTSG provides better function and sensation than STSG.',
    cosmeticOutcome: 'Grafted skin never matches surrounding skin exactly. FTSG provides better cosmetic result than STSG. May have mesh pattern visible with meshed STSG. Donor site may have color difference.',
    successRate: 'Graft take rates of 90-95% expected with good wound bed preparation, optimal patient condition, and proper post-operative care. Smoking reduces success by 50% or more.',
    possibleComplications: [
      'Graft failure (partial or complete)',
      'Infection',
      'Hematoma',
      'Contracture',
      'Hypertrophic scarring',
      'Chronic pain at donor site'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '5-7 days',
        purpose: 'First dressing change, assess graft take'
      },
      {
        timing: '2 weeks',
        purpose: 'Assess healing, remove sutures if FTSG'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Full healing assessment, begin scar management'
      },
      {
        timing: '3 months',
        purpose: 'Long-term outcome assessment'
      },
      {
        timing: '6-12 months',
        purpose: 'Final outcome, assess for contracture'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy for grafts over joints',
      'Pressure garment therapy if hypertrophic',
      'Scar massage and moisturization',
      'Range of motion exercises'
    ],
    lifestyleModifications: [
      'No smoking permanently (dramatically improves outcomes)',
      'Sun protection SPF 50+ for 12 months minimum',
      'Regular moisturization',
      'Protect from trauma'
    ]
  },

  warningSigns: [
    'Graft turning dark, black, or pale white',
    'Fluid bulging under graft',
    'Increasing pain after initial improvement',
    'Fever',
    'Foul smell from dressings',
    'Graft lifting off at edges',
    'Donor site becoming increasingly painful or red'
  ],

  emergencySigns: [
    'High fever with signs of infection',
    'Graft completely dark/black (necrosis)',
    'Spreading redness suggesting cellulitis',
    'Significant bleeding from sites',
    'Signs of sepsis'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolute no smoking or nicotine',
      importance: 'critical',
      consequence: 'Nicotine causes vasoconstriction and graft failure in 50%+ of smokers'
    },
    {
      requirement: 'Keep graft completely immobile for first week',
      importance: 'critical',
      consequence: 'Movement prevents vascular ingrowth and causes graft loss'
    },
    {
      requirement: 'Keep dressings completely dry',
      importance: 'critical',
      consequence: 'Moisture promotes infection and graft failure'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'important',
      consequence: 'Early detection of complications enables treatment'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Burn Management',
      reference: 'WHO-BURN 2018',
      keyPoints: [
        'Skin grafting is standard treatment for full-thickness burns',
        'Wound bed preparation is essential for graft success',
        'Infection control paramount before and after grafting',
        'Nutritional optimization improves outcomes'
      ]
    },
    {
      title: 'Reconstructive Surgery Principles',
      reference: 'WHO-RSP 2020',
      keyPoints: [
        'STSG for larger wounds where donor site is a concern',
        'FTSG for smaller wounds in cosmetically sensitive areas',
        'Meshing allows expansion for large defects',
        'Post-operative immobilization is critical'
      ]
    }
  ]
};

/**
 * Flaps (Local and Regional)
 */
export const flaps: EducationCondition = {
  id: 'reconstructive-flaps',
  name: 'Flaps (Local and Regional)',
  category: 'D',
  icdCode: 'Z48.815',
  description: 'A flap is a section of tissue that is moved from one location to another while maintaining its own blood supply. Unlike a graft, a flap carries its blood vessels with it, making it suitable for more complex wounds.',
  alternateNames: ['Tissue Flap', 'Rotation Flap', 'Advancement Flap', 'Transposition Flap', 'Pedicled Flap', 'Myocutaneous Flap'],
  
  overview: {
    definition: 'Flap surgery involves transferring tissue (skin, fat, muscle, or combinations) from one area to another while maintaining blood supply through a pedicle (attached base with blood vessels). Local flaps use tissue adjacent to the wound, while regional flaps use tissue from nearby areas. Flaps are superior to grafts for wounds requiring bulk, covering exposed bone/tendon, or areas needing blood supply to the wound bed.',
    causes: [
      'Complex wounds with exposed bone, tendon, or hardware',
      'Pressure injuries requiring durable coverage',
      'Post-cancer reconstruction',
      'Chronic wounds not suitable for grafting',
      'Wounds with poor blood supply',
      'Defects requiring bulk for contour',
      'Release of contractures'
    ],
    symptoms: [
      'Deep wound with exposed vital structures',
      'Wound in area of poor vascularity',
      'Failed skin grafts',
      'Need for tissue bulk',
      'Defect requiring like-for-like tissue'
    ],
    riskFactors: [
      'Smoking (major risk factor)',
      'Diabetes',
      'Peripheral vascular disease',
      'Previous radiation to area',
      'Malnutrition',
      'Obesity',
      'Advanced age',
      'Immunosuppression'
    ],
    complications: [
      'Flap necrosis (partial or complete)',
      'Venous congestion',
      'Arterial insufficiency',
      'Infection',
      'Dehiscence',
      'Hematoma/seroma',
      'Donor site morbidity'
    ],
    prevalence: 'Flap surgery is a fundamental technique in reconstructive surgery, performed thousands of times annually for complex wound coverage and reconstruction.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Operative Planning',
      duration: '1-4 weeks',
      description: 'Careful planning of flap design, optimization of patient condition, and preparation of wound bed.',
      goals: [
        'Design appropriate flap for defect',
        'Optimize wound bed',
        'Eliminate infection',
        'Optimize patient health',
        'Plan for donor site closure'
      ],
      activities: [
        'Detailed wound assessment',
        'Flap design and marking',
        'Doppler assessment of flap blood supply',
        'Wound bed preparation',
        'Smoking cessation (mandatory)',
        'Nutritional optimization',
        'Medical optimization'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Clear any wound infection',
          duration: 'Until wound culture negative'
        }
      ],
      warningSignsThisPhase: [
        'Unable to stop smoking',
        'Wound infection persisting',
        'Inadequate tissue for planned flap',
        'Medical conditions not optimized'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Procedure',
      duration: 'Day of surgery',
      description: 'Raising and transferring the flap to cover the defect while maintaining blood supply.',
      goals: [
        'Raise flap with intact blood supply',
        'Achieve tension-free closure',
        'Cover all vital structures',
        'Close donor site'
      ],
      activities: [
        'Flap elevation maintaining pedicle',
        'Inset into defect',
        'Layered closure',
        'Donor site closure or grafting',
        'Drain placement if needed',
        'Appropriate dressing'
      ],
      warningSignsThisPhase: [
        'Bleeding from pedicle',
        'Flap appearing congested or pale',
        'Tension on closure',
        'Pedicle kinking'
      ]
    },
    {
      phase: 3,
      name: 'Critical Monitoring Phase',
      duration: 'Days 1-7',
      description: 'Intensive monitoring of flap perfusion. Early detection of vascular compromise allows intervention.',
      goals: [
        'Maintain flap perfusion',
        'Detect vascular compromise early',
        'Prevent hematoma/seroma',
        'Prevent infection',
        'Prevent pedicle compression'
      ],
      activities: [
        'Hourly flap checks initially',
        'Monitor color, temperature, capillary refill',
        'Doppler assessment of flap',
        'Avoid pressure on pedicle',
        'Maintain patient warmth and hydration',
        'Strict positioning'
      ],
      medications: [
        {
          name: 'Prophylactic Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Low molecular weight heparin',
          purpose: 'Prevent thrombosis (in some cases)',
          duration: 'Per surgeon protocol'
        }
      ],
      warningSignsThisPhase: [
        'Flap pale/white (arterial problem)',
        'Flap dark purple/congested (venous problem)',
        'Flap cool to touch',
        'No capillary refill',
        'Increasing swelling/tension'
      ]
    },
    {
      phase: 4,
      name: 'Healing and Maturation',
      duration: 'Weeks 2-12',
      description: 'Flap healing and integration. Gradual return to normal activities.',
      goals: [
        'Complete flap healing',
        'Donor site healing',
        'Scar maturation',
        'Return to function'
      ],
      activities: [
        'Regular wound care',
        'Suture/staple removal',
        'Scar massage once healed',
        'Gradual activity progression',
        'Physiotherapy if needed'
      ],
      warningSignsThisPhase: [
        'Wound dehiscence',
        'Partial flap loss',
        'Infection',
        'Poor scarring'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic/Reconstructive surgeon',
      'Anesthetist',
      'Wound care specialist',
      'Dietitian',
      'Physiotherapist for pre-operative assessment'
    ],
    investigations: [
      'Complete blood count',
      'Coagulation studies',
      'Blood type and crossmatch',
      'CT angiography if perforator flap planned',
      'Doppler mapping of flap vessels',
      'Wound culture',
      'Nutritional labs',
      'ECG and cardiac clearance if indicated'
    ],
    medications: [
      {
        medication: 'Anticoagulants',
        instruction: 'stop as directed by surgeon',
        reason: 'Reduce bleeding risk but balance with thrombosis risk'
      },
      {
        medication: 'Smoking/Nicotine',
        instruction: 'stop minimum 4-6 weeks before',
        reason: 'Absolutely critical - nicotine causes flap failure'
      },
      {
        medication: 'Aspirin',
        instruction: 'may continue or stop per surgeon',
        reason: 'Balance bleeding vs thrombosis risk'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight',
    dayBeforeSurgery: [
      'Antimicrobial shower',
      'No shaving of operative site yourself',
      'Light meal evening before',
      'No alcohol',
      'Early night for good rest'
    ],
    whatToBring: [
      'Loose, comfortable clothing that opens in front',
      'All medications',
      'Advance directive if applicable',
      'Expect extended hospital stay (days to weeks)'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Antimicrobial shower morning of surgery',
      'Arrive at designated time',
      'No makeup, jewelry, or nail polish'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia (most flaps require this)',
    procedureDescription: 'Local flaps: Tissue adjacent to the wound is elevated while keeping its blood supply intact at the base (pedicle). The flap is then rotated, advanced, or transposed to cover the wound. Regional flaps: Tissue from a nearby area (with a longer pedicle) is transferred. Myocutaneous flaps include muscle which carries reliable blood vessels. Common flaps include rotation flaps, V-Y advancement, Z-plasty, and muscle flaps like latissimus dorsi or TRAM.',
    duration: '2-6 hours depending on complexity',
    whatToExpect: 'Extensive surgery under general anesthesia. Will have drains. May require ICU monitoring. Hospital stay of several days to weeks depending on complexity.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Specific to flap location. Avoid ANY pressure on flap or pedicle. May need special positioning devices.',
      expectedSymptoms: [
        'Flap swelling is normal',
        'Bruising around flap and donor site',
        'Pain at operative sites',
        'Drains with bloody output',
        'Limited mobility due to positioning'
      ],
      activityLevel: 'Bed rest with strict positioning. May be in ICU for monitoring. No pressure on flap.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Dressings managed by medical team. Flap observed regularly. Do not disturb dressings.'
      },
      {
        day: 'Days 7-14',
        instruction: 'First dressing change. Sutures/staples may remain longer. Drains removed when output minimal.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Gentle wound care. Begin scar massage once fully healed. Moisturize regularly.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (5-8/10) initially',
      medications: [
        'Patient-controlled analgesia (PCA) initially',
        'Transition to oral opioids',
        'Paracetamol regularly',
        'NSAIDs once no bleeding concern'
      ],
      nonPharmacological: [
        'Careful positioning',
        'Warmth (avoid cooling which causes vasoconstriction)',
        'Relaxation techniques',
        'Distraction'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Any pressure on flap',
        restriction: 'Absolutely avoid',
        duration: '2-4 weeks minimum',
        reason: 'Pressure compromises blood supply'
      },
      {
        activity: 'Stretching or tension on flap',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Can cause dehiscence'
      },
      {
        activity: 'Strenuous activity',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Protect healing tissues'
      }
    ],
    dietaryGuidelines: [
      'High protein diet critical',
      'Adequate calories for healing',
      'Vitamin supplementation',
      'Stay well hydrated',
      'ABSOLUTELY NO SMOKING'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Flap pink and warm with good capillary refill'
      },
      {
        timeframe: '1 week',
        expectation: 'Flap viable, beginning to heal, swelling reducing'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Flap well integrated, sutures removing'
      }
    ],
    longTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Flap healed, normal activities resuming'
      },
      {
        timeframe: '3-6 months',
        expectation: 'Flap matured, final contour achieved, scar softening'
      }
    ],
    functionalRecovery: 'Excellent functional recovery expected. Flaps provide durable coverage and restore contour. Some muscle flaps may have donor site weakness.',
    cosmeticOutcome: 'Good cosmetic outcomes. Flaps match adjacent tissue better than grafts. Some contour irregularity may occur. Scars mature over 12-18 months.',
    successRate: 'Flap success rates of 95-99% for local flaps with good technique. Risk factors like smoking reduce success significantly.',
    possibleComplications: [
      'Partial flap loss (5-10%)',
      'Complete flap loss (1-5%)',
      'Dehiscence',
      'Infection',
      'Hematoma/seroma',
      'Dog-ear deformity',
      'Sensory changes'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Daily initially',
        purpose: 'Flap monitoring'
      },
      {
        timing: '1-2 weeks',
        purpose: 'Suture removal, assess healing'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Complete healing assessment'
      },
      {
        timing: '3 months',
        purpose: 'Long-term outcome'
      },
      {
        timing: '12 months',
        purpose: 'Final assessment'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy for range of motion',
      'Scar therapy',
      'Occupational therapy if hand/arm flap'
    ],
    lifestyleModifications: [
      'No smoking permanently',
      'Protect from sun',
      'Maintain good nutrition',
      'Regular moisturization'
    ]
  },

  warningSigns: [
    'Flap turning pale or white',
    'Flap turning dark purple or blue',
    'Flap becoming cold',
    'No bleeding when gently pricked (capillary refill check)',
    'Increasing pain or swelling',
    'Wound opening',
    'Fever or chills'
  ],

  emergencySigns: [
    'Sudden flap color change to very pale or very dark - EMERGENCY - may need return to theatre',
    'Complete flap loss/necrosis',
    'High fever with wound infection',
    'Significant bleeding from wound'
  ],

  complianceRequirements: [
    {
      requirement: 'No smoking or nicotine products',
      importance: 'critical',
      consequence: 'Smoking dramatically increases flap failure risk'
    },
    {
      requirement: 'Maintain prescribed position and avoid pressure on flap',
      importance: 'critical',
      consequence: 'Pressure compromises flap blood supply'
    },
    {
      requirement: 'Report any color changes immediately',
      importance: 'critical',
      consequence: 'Early detection of vascular compromise allows intervention'
    },
    {
      requirement: 'Keep warm (avoid cold)',
      importance: 'important',
      consequence: 'Cold causes vasoconstriction affecting flap perfusion'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Reconstructive Surgery Guidelines',
      reference: 'WHO-RSG 2020',
      keyPoints: [
        'Flaps provide superior coverage for complex wounds',
        'Choice of flap depends on defect characteristics',
        'Patient optimization is essential',
        'Post-operative monitoring is critical for success'
      ]
    }
  ]
};

// Export reconstructive surgery conditions part 1
export const reconstructiveSurgeryPart1 = [skinGrafts, flaps];
