/**
 * Patient Education Content - Category K: Reconstructive Techniques and Procedures
 * Part 3: Bone Reconstruction and Nerve Repair
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Surgical Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Bone Grafting and Reconstruction
 */
export const boneReconstruction: EducationCondition = {
  id: 'recon-bone-grafting',
  name: 'Bone Grafting and Reconstruction',
  category: 'K',
  icdCode: 'M84.8',
  description: 'Surgical procedures to repair or rebuild bone using transplanted bone tissue or bone substitutes.',
  alternateNames: ['Bone Grafting', 'Bone Transfer', 'Segmental Bone Reconstruction', 'Vascularized Bone Graft'],
  
  overview: {
    definition: 'Bone grafting and reconstruction involves transplanting bone tissue to repair bone defects, fill gaps, or promote bone healing. Bone grafts can be autografts (from patient\'s own body - gold standard), allografts (from a donor/bone bank), or synthetic substitutes. For large defects, vascularized bone transfers (bone with its blood supply reconnected using microsurgery) may be used. This is essential in treating non-healing fractures, bone loss from trauma or tumor, and reconstruction of facial or limb defects.',
    causes: [
      'Non-union of fractures',
      'Large bone defects from trauma',
      'Bone loss after tumor removal',
      'Jaw reconstruction after cancer',
      'Congenital bone defects',
      'Spine fusion',
      'Joint replacement revision',
      'Osteomyelitis with bone loss'
    ],
    symptoms: [
      'Bone that won\'t heal (non-union)',
      'Missing section of bone',
      'Bone deformity',
      'Limb length discrepancy',
      'Pain from unstable bone',
      'Functional limitation'
    ],
    riskFactors: [
      'Smoking (major factor in bone healing)',
      'Diabetes',
      'Malnutrition',
      'Infection',
      'Poor blood supply',
      'Immunosuppression',
      'Previous radiation',
      'Non-steroidal anti-inflammatory use'
    ],
    complications: [
      'Graft non-incorporation',
      'Infection',
      'Donor site pain',
      'Graft resorption',
      'Fracture of graft',
      'Non-union persistence',
      'Hardware failure',
      'Vascular compromise (vascularized grafts)'
    ],
    prevalence: 'Bone grafting is one of the most common procedures in orthopedic and maxillofacial surgery, with over 2 million bone grafts performed annually worldwide.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Planning',
      duration: 'Weeks before surgery',
      description: 'Comprehensive evaluation of bone defect and planning reconstruction.',
      goals: [
        'Define bone defect size and location',
        'Assess vascularity and soft tissue',
        'Select graft type and source',
        'Optimize patient health',
        'Treat any infection'
      ],
      activities: [
        'X-rays and CT scans',
        'MRI or angiography if needed',
        'Blood tests including infection markers',
        'Nutrition assessment',
        'Smoking cessation program',
        'Treatment of any infection'
      ],
      warningSignsThisPhase: [
        'Active infection',
        'Poor soft tissue',
        'Inadequate blood supply',
        'Continued smoking'
      ]
    },
    {
      phase: 2,
      name: 'Bone Graft Surgery',
      duration: '2-6 hours depending on complexity',
      description: 'Harvesting bone graft and placing at recipient site with fixation.',
      goals: [
        'Harvest or prepare graft',
        'Prepare recipient site',
        'Stable fixation',
        'Achieve bone contact'
      ],
      activities: [
        'General or regional anesthesia',
        'Graft harvest (if autograft)',
        'Recipient site preparation',
        'Graft placement',
        'Internal or external fixation',
        'Wound closure',
        'For vascularized: microvascular anastomosis'
      ],
      warningSignsThisPhase: [
        'Inadequate bone stock at donor',
        'Unexpected infection',
        'Poor recipient bed',
        'Vascular problems (if microvascular)'
      ]
    },
    {
      phase: 3,
      name: 'Early Healing Phase',
      duration: 'Weeks 1-6',
      description: 'Protection of graft and early bone healing.',
      goals: [
        'Protect graft fixation',
        'Prevent infection',
        'Control pain',
        'Begin controlled mobilization'
      ],
      activities: [
        'Wound care',
        'Pain management',
        'Immobilization (cast, splint, or limited weight bearing)',
        'Monitoring for complications',
        'Nutritional support'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '24 hours to several days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control post-operative pain',
          duration: 'As needed'
        },
        {
          name: 'Calcium and Vitamin D',
          purpose: 'Support bone healing',
          duration: 'Months'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Increasing pain',
        'Wound drainage',
        'Hardware prominence',
        'Loss of fixation'
      ]
    },
    {
      phase: 4,
      name: 'Bone Incorporation',
      duration: 'Weeks 6-24',
      description: 'Graft incorporation and bone healing progression.',
      goals: [
        'Graft incorporation',
        'Progressive bone healing',
        'Gradual loading',
        'Function restoration'
      ],
      activities: [
        'Serial X-rays',
        'Gradual increase in weight bearing',
        'Physical therapy',
        'Continued nutrition optimization',
        'Activity modification'
      ],
      warningSignsThisPhase: [
        'No healing progression on X-ray',
        'Increasing pain',
        'Hardware loosening',
        'Graft resorption'
      ]
    },
    {
      phase: 5,
      name: 'Maturation and Return to Function',
      duration: 'Months to 1 year',
      description: 'Complete bone healing and return to normal function.',
      goals: [
        'Full bone healing',
        'Complete functional recovery',
        'Return to normal activities',
        'Hardware removal if needed'
      ],
      activities: [
        'Final imaging',
        'Full rehabilitation',
        'Return to activities',
        'Consider hardware removal (if symptomatic)'
      ],
      warningSignsThisPhase: [
        'Persistent non-union',
        'Hardware failure',
        'Re-fracture',
        'Chronic pain'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Orthopedic or maxillofacial surgeon',
      'Plastic surgeon (for microvascular)',
      'Infectious disease (if infection history)',
      'Medical clearance'
    ],
    investigations: [
      'X-rays',
      'CT scan',
      'MRI if soft tissue assessment needed',
      'Angiography for vascularized grafts',
      'Blood tests including infection markers',
      'Bone density if indicated'
    ],
    medications: [
      {
        medication: 'NSAIDs (ibuprofen, etc.)',
        instruction: 'stop',
        reason: 'May inhibit bone healing'
      },
      {
        medication: 'Smoking',
        instruction: 'stop',
        reason: 'Dramatically reduces bone healing - stop 6+ weeks before'
      },
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      }
    ],
    fastingInstructions: 'Nothing to eat or drink from midnight before surgery.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Prepare home for recovery (ground floor if possible)',
      'Arrange help and transportation',
      'Prepare mobility aids if needed'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Crutches or walker if leg surgery',
      'List of medications',
      'Driver and helper'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Shower with antiseptic',
      'Wear loose clothing',
      'Arrive as directed'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General or regional anesthesia',
    procedureDescription: 'For autograft: Bone is harvested from a donor site, commonly the iliac crest (hip), fibula, or rib. For non-vascularized grafts: The harvested bone is placed in the defect and fixed with plates, screws, or other devices. For vascularized grafts: The bone is harvested with its blood vessels intact and transplanted to the recipient site where the vessels are reconnected under microscope (commonly fibula for jaw or long bone defects). Allografts or synthetic substitutes are alternatives when autograft is not suitable.',
    duration: '2-6 hours depending on complexity',
    whatToExpect: 'You will be asleep or the area will be numbed. You may have incisions at both the donor and recipient sites. There will be hardware (plates/screws) holding the bone. You may have drains.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate affected limb. Follow specific instructions for weight bearing.',
      expectedSymptoms: [
        'Pain at operative site(s)',
        'Swelling',
        'Bruising',
        'Limited mobility',
        'Donor site discomfort (often significant for iliac crest)'
      ],
      activityLevel: 'Very limited initially. Follow weight bearing instructions exactly.'
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Keep wounds clean and dry. Dressing changes as directed. Watch for infection signs.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Suture removal. Continued wound care. Cast/splint care if applicable.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Significant initially (6-8/10), especially iliac crest donor site',
      medications: [
        'Prescribed pain medication',
        'Paracetamol as baseline',
        'AVOID NSAIDs (ibuprofen) - inhibit bone healing',
        'Transition over weeks'
      ],
      nonPharmacological: [
        'Ice packs (protect skin)',
        'Elevation',
        'Rest',
        'Distraction'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Weight bearing (if leg)',
        restriction: 'As directed (often non or partial)',
        duration: '6-12 weeks',
        reason: 'Protect healing graft'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '3-6 months',
        reason: 'Protect healing bone'
      },
      {
        activity: 'Sports',
        restriction: 'Avoid',
        duration: 'Until cleared (often 6-12 months)',
        reason: 'Risk of failure'
      }
    ],
    dietaryGuidelines: [
      'High protein diet',
      'Adequate calcium (1000-1200mg daily)',
      'Vitamin D supplementation',
      'Good overall nutrition',
      'No alcohol initially'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Early healing, stable fixation'
      },
      {
        timeframe: '3 months',
        expectation: 'Progressive bone healing visible on X-ray'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Bone union achieved'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Full function restored'
      }
    ],
    functionalRecovery: 'Most patients achieve functional recovery with successful bone healing. May have some donor site discomfort long-term.',
    cosmeticOutcome: 'Scars at operative sites. Hardware may be palpable. Bone contour restored.',
    successRate: 'Bone graft success is 85-95% in appropriate conditions. Lower with smoking, infection, poor blood supply.',
    possibleComplications: [
      {
        complication: 'Non-union',
        riskLevel: 'moderate',
        prevention: 'No smoking, good fixation, adequate blood supply',
        management: 'Revision surgery'
      },
      {
        complication: 'Donor site pain',
        riskLevel: 'moderate',
        prevention: 'Careful harvest technique',
        management: 'Pain management, usually improves over time'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check'
      },
      {
        timing: '6 weeks',
        purpose: 'X-ray, assess healing'
      },
      {
        timing: '3 months',
        purpose: 'Progress assessment'
      },
      {
        timing: '6-12 months',
        purpose: 'Union confirmation'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy (extensive for limb)',
      'Occupational therapy (for upper limb)',
      'Gait training (for lower limb)',
      'Strengthening exercises'
    ],
    lifestyleModifications: [
      'Permanent smoking cessation',
      'Adequate calcium and vitamin D intake',
      'Avoid NSAIDs when possible',
      'Weight management',
      'Fall prevention'
    ]
  },

  warningSigns: [
    'Fever',
    'Wound redness, swelling, or drainage',
    'Increasing pain after first week',
    'Hardware becoming prominent',
    'Inability to progress with therapy',
    'Deformity developing'
  ],

  emergencySigns: [
    'Signs of severe infection',
    'Loss of pulse or sensation',
    'Sudden severe pain',
    'Hardware breaking through skin'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolute smoking cessation',
      importance: 'critical',
      consequence: 'Smoking reduces bone healing by 50%+'
    },
    {
      requirement: 'Avoid NSAIDs',
      importance: 'important',
      consequence: 'NSAIDs inhibit bone healing'
    },
    {
      requirement: 'Follow weight bearing restrictions',
      importance: 'critical',
      consequence: 'Overloading causes graft failure'
    },
    {
      requirement: 'Complete rehabilitation program',
      importance: 'important',
      consequence: 'Needed for full functional recovery'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Bone Health',
      reference: 'WHO Orthopedic Guidelines',
      keyPoints: [
        'Bone grafting is essential for complex fractures and defects',
        'Autograft is gold standard',
        'Smoking cessation critical',
        'Nutrition optimization important'
      ]
    }
  ]
};

/**
 * Nerve Repair and Reconstruction
 */
export const nerveRepair: EducationCondition = {
  id: 'recon-nerve-repair',
  name: 'Nerve Repair and Reconstruction',
  category: 'K',
  icdCode: 'S44.9',
  description: 'Surgical repair or reconstruction of damaged peripheral nerves to restore sensation and motor function.',
  alternateNames: ['Nerve Reconstruction', 'Neurorrhaphy', 'Nerve Grafting', 'Nerve Transfer'],
  
  overview: {
    definition: 'Nerve repair and reconstruction involves surgical procedures to restore function after peripheral nerve injury. When a nerve is cut, the portion beyond the injury cannot function. Direct nerve repair (neurorrhaphy) reconnects the severed ends. When there is a gap, nerve grafts (typically sensory nerves like the sural nerve) bridge the defect. Nerve transfers use a functioning but less important nerve to power a more critical paralyzed muscle. Recovery is slow as nerves regenerate at approximately 1mm per day.',
    causes: [
      'Traumatic laceration',
      'Stretch or traction injuries',
      'Compression injuries',
      'Tumor removal',
      'Injection injuries',
      'Fractures damaging nerves',
      'Birth injuries (brachial plexus)',
      'Iatrogenic (surgical) injury'
    ],
    symptoms: [
      'Numbness in nerve distribution',
      'Weakness or paralysis of muscles',
      'Tingling or abnormal sensations',
      'Pain (especially with neuroma)',
      'Muscle wasting',
      'Loss of sweating in affected area'
    ],
    riskFactors: [
      'Smoking',
      'Diabetes',
      'Age (younger patients heal better)',
      'Level of injury (proximal worse than distal)',
      'Delay in repair',
      'Tension on repair',
      'Type of injury (sharp better than crush)'
    ],
    complications: [
      'Incomplete recovery',
      'Neuroma (painful nerve swelling)',
      'Wrong connections (aberrant regeneration)',
      'Synkinesis (abnormal movements)',
      'Chronic pain',
      'Cold intolerance',
      'Donor nerve deficit (with grafting)'
    ],
    prevalence: 'Peripheral nerve injuries are common, affecting an estimated 2.8% of trauma patients. Many recover spontaneously, but significant injuries require surgical repair.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Evaluation and Timing Decision',
      duration: 'Immediate to weeks',
      description: 'Assessment of nerve injury and decision on timing and type of repair.',
      goals: [
        'Define nerve injury level and type',
        'Determine if surgery needed',
        'Optimal timing of repair',
        'Prepare patient'
      ],
      activities: [
        'Clinical examination',
        'Nerve conduction studies/EMG',
        'Imaging if needed',
        'Decision: primary repair vs. delayed vs. observation',
        'Sharp injuries: early repair preferred',
        'Blunt injuries: may observe for recovery'
      ],
      warningSignsThisPhase: [
        'Complete loss of function',
        'Open wound with nerve injury',
        'No recovery over time (blunt injury)'
      ]
    },
    {
      phase: 2,
      name: 'Nerve Repair Surgery',
      duration: '2-6 hours',
      description: 'Surgical repair, grafting, or transfer of damaged nerve.',
      goals: [
        'Tension-free repair',
        'Accurate alignment',
        'Bridge gaps if needed',
        'Optimize conditions for regeneration'
      ],
      activities: [
        'General or regional anesthesia',
        'Identification of nerve ends',
        'Trimming of damaged nerve (neuromas)',
        'Direct repair or grafting',
        'Nerve transfer if appropriate',
        'Microsurgical technique',
        'Wound closure'
      ],
      warningSignsThisPhase: [
        'Large gap requiring long grafts',
        'Poor nerve quality',
        'Excessive tension'
      ]
    },
    {
      phase: 3,
      name: 'Early Post-Operative Phase',
      duration: 'Weeks 1-6',
      description: 'Protection of repair and early therapy.',
      goals: [
        'Protect repair from tension',
        'Maintain joint mobility',
        'Prevent stiffness',
        'Pain management'
      ],
      activities: [
        'Splinting in protective position',
        'Wound care',
        'Gentle passive motion',
        'Edema control',
        'Pain management',
        'Sensory re-education begins'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control post-operative pain',
          duration: '1-2 weeks'
        },
        {
          name: 'Neuropathic pain medications (gabapentin)',
          purpose: 'Control nerve pain if present',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Wound problems',
        'Severe pain',
        'Joint stiffness developing'
      ]
    },
    {
      phase: 4,
      name: 'Nerve Regeneration Phase',
      duration: 'Months to years',
      description: 'Waiting for and promoting nerve regeneration (1mm/day).',
      goals: [
        'Maintain muscle and joint health',
        'Prevent contractures',
        'Support nerve regeneration',
        'Track recovery with Tinel\'s sign'
      ],
      activities: [
        'Regular therapy',
        'Splinting to prevent contracture',
        'Electrical stimulation (debated benefit)',
        'Sensory re-education',
        'Tracking regeneration (Tinel\'s sign advancing)',
        'EMG at intervals'
      ],
      warningSignsThisPhase: [
        'No advancement of Tinel\'s sign',
        'No recovery at expected time',
        'Fixed contractures developing',
        'Severe neuropathic pain'
      ]
    },
    {
      phase: 5,
      name: 'Functional Recovery',
      duration: '1-3 years after injury',
      description: 'Reinnervation of targets and rehabilitation for function.',
      goals: [
        'Maximize motor recovery',
        'Optimize sensory recovery',
        'Adapt to any permanent deficits',
        'Return to function'
      ],
      activities: [
        'Intensive motor re-education',
        'Sensory re-education',
        'Strengthening as muscles recover',
        'Adaptive strategies',
        'Final functional assessment',
        'Consider tendon transfers if motor recovery incomplete'
      ],
      warningSignsThisPhase: [
        'Plateau without expected function',
        'Persistent pain',
        'Incomplete recovery'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Microsurgeon or peripheral nerve surgeon',
      'Hand therapist evaluation',
      'Neurologist/electrodiagnostics'
    ],
    investigations: [
      'Nerve conduction studies/EMG',
      'MRI or ultrasound if needed',
      'Blood tests'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need adjustment'
      },
      {
        medication: 'Smoking',
        instruction: 'stop',
        reason: 'Impairs nerve healing'
      }
    ],
    fastingInstructions: 'Nothing to eat or drink from midnight if general anesthesia.',
    dayBeforeSurgery: [
      'Shower',
      'Prepare for limited hand/limb use after',
      'Arrange help at home'
    ],
    whatToBring: [
      'Loose clothing easy to put on with one hand',
      'Driver',
      'List of medications'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Remove jewelry from affected hand',
      'Arrive as directed'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia, regional block, or local with sedation',
    procedureDescription: 'Direct nerve repair (neurorrhaphy): The damaged nerve ends are trimmed back to healthy tissue and sutured together under microscope magnification using ultra-fine sutures. Nerve grafting: When there is a gap, a sensory nerve (usually sural nerve from leg) is harvested and used to bridge the defect. Multiple cable grafts may be needed for large nerves. Nerve transfer: A functioning but dispensable nerve is redirected to power a more important paralyzed muscle. This is used for high injuries where regeneration distance would be too long.',
    duration: '2-6 hours depending on complexity',
    whatToExpect: 'You will be asleep or the arm/leg will be numbed. The surgery uses microscope magnification. You may have splints or a protective cast after. If a nerve graft was taken from your leg, there will be numbness on the outer foot.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate. Protect repair - joints may be splinted in position that relaxes the nerve.',
      expectedSymptoms: [
        'Numbness continues (nerve hasn\'t regenerated yet)',
        'Surgical pain',
        'Splint or cast',
        'Limited mobility',
        'Donor site numbness (if graft taken)'
      ],
      activityLevel: 'Rest. Protect repair. Follow splinting instructions exactly.'
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Keep dressings dry. Watch for infection signs.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Suture removal. Begin gentle motion as directed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Variable. Neuropathic pain can be significant.',
      medications: [
        'Standard pain medications initially',
        'Gabapentin or pregabalin for nerve pain',
        'Transition over weeks'
      ],
      nonPharmacological: [
        'Elevation',
        'Desensitization techniques',
        'TENS in some cases'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Stretching the repaired nerve',
        restriction: 'Absolutely avoid',
        duration: '6 weeks minimum',
        reason: 'Protects repair from disruption'
      },
      {
        activity: 'Heavy lifting/gripping',
        restriction: 'Avoid',
        duration: 'Until cleared',
        reason: 'Protect healing'
      }
    ],
    dietaryGuidelines: [
      'Normal healthy diet',
      'Adequate protein',
      'B vitamins may support nerve health'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Wounds healed, begin therapy'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Tinel\'s sign advancing (regeneration progressing)'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Maximum motor recovery'
      },
      {
        timeframe: '2-3 years',
        expectation: 'Maximum sensory recovery'
      }
    ],
    functionalRecovery: 'Recovery depends on age, injury level, and delay. Young patients with distal, sharp injuries repaired early have best outcomes. Proximal injuries and older patients have more limited recovery.',
    cosmeticOutcome: 'Surgical scars. If nerve graft taken from leg, area of numbness on outer foot.',
    successRate: 'Excellent results (M4-5, S3+) in 60-80% of ideal cases (young, distal, sharp, early). Results decrease with adverse factors.',
    possibleComplications: [
      {
        complication: 'Incomplete recovery',
        riskLevel: 'moderate',
        prevention: 'Early repair, good technique, therapy',
        management: 'Tendon transfers, adaptive strategies'
      },
      {
        complication: 'Neuroma/pain',
        riskLevel: 'low',
        prevention: 'Good repair technique',
        management: 'Desensitization, medication, possible revision'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check'
      },
      {
        timing: '6 weeks',
        purpose: 'Begin active motion'
      },
      {
        timing: '3 months, 6 months, 1 year',
        purpose: 'Track regeneration, EMG'
      },
      {
        timing: '2-3 years',
        purpose: 'Final outcome assessment'
      }
    ],
    rehabilitationNeeds: [
      'Hand therapy (extensive and critical)',
      'Sensory re-education',
      'Motor re-education',
      'Splinting program',
      'Home exercise program'
    ],
    lifestyleModifications: [
      'Protect insensate areas from injury',
      'Patience - recovery takes 2-3 years',
      'Avoid smoking',
      'Consistent therapy attendance'
    ]
  },

  warningSigns: [
    'Severe increasing pain',
    'Wound infection signs',
    'No Tinel\'s sign progression',
    'Joints becoming stiff despite therapy'
  ],

  emergencySigns: [
    'Signs of compartment syndrome (severe pain, swelling)',
    'Severe wound infection',
    'Loss of previously present function'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all therapy sessions',
      importance: 'critical',
      consequence: 'Therapy maximizes recovery and prevents stiffness'
    },
    {
      requirement: 'Follow splinting instructions exactly',
      importance: 'critical',
      consequence: 'Protects repair and prevents contractures'
    },
    {
      requirement: 'Patience through long recovery',
      importance: 'important',
      consequence: 'Nerve regeneration takes 2-3 years'
    },
    {
      requirement: 'Protect insensate areas',
      importance: 'important',
      consequence: 'Can\'t feel injuries until sensation returns'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Peripheral Nerve Injury',
      reference: 'WHO Surgical Guidelines',
      keyPoints: [
        'Early repair of sharp injuries',
        'Microsurgical expertise required',
        'Extended rehabilitation essential',
        'Recovery depends on multiple factors'
      ]
    }
  ]
};

// Export reconstructive techniques part 3
export const reconstructiveTechniquesPart3 = [boneReconstruction, nerveRepair];
