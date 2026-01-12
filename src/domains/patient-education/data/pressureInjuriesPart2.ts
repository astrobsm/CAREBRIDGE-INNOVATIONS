/**
 * Patient Education Content - Category C: Pressure Injuries
 * Part 2: Stage 3 and Stage 4 Pressure Injuries
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and NPUAP/EPUAP Classifications
 */

import type { EducationCondition } from '../types';

/**
 * Stage 3 Pressure Injury
 */
export const stage3PressureInjury: EducationCondition = {
  id: 'pressure-injury-stage3',
  name: 'Stage 3 Pressure Injury',
  category: 'C',
  icdCode: 'L89.2',
  description: 'A Stage 3 pressure injury is a full-thickness skin loss in which subcutaneous fat may be visible but bone, tendon, or muscle are not exposed. Slough may be present but does not obscure the depth of tissue loss.',
  alternateNames: ['Stage 3 Pressure Ulcer', 'Stage 3 Bedsore', 'Full Thickness Pressure Ulcer', 'Deep Pressure Sore'],
  
  overview: {
    definition: 'Stage 3 pressure injury involves full-thickness skin loss. The depth of tissue damage varies by anatomical location - areas with significant adipose tissue (buttocks) can develop extremely deep wounds, while areas with thin tissue (nose, ear, occiput) may remain relatively shallow. Subcutaneous fat may be visible in the wound, but bone, tendon, and muscle are not exposed. Slough (yellow tissue) may be present but should not obscure assessment of wound depth. Undermining and tunneling may be present.',
    causes: [
      'Progression from untreated or inadequately treated Stage 2',
      'Severe and prolonged pressure with ischemia',
      'Deep tissue injury surfacing as full thickness wound',
      'Combination of pressure, shear, friction, and moisture',
      'Poor tissue tolerance due to systemic illness',
      'Inadequate nutrition',
      'Underlying vascular disease'
    ],
    symptoms: [
      'Full-thickness crater extending into subcutaneous tissue',
      'Subcutaneous fat visible in wound bed',
      'Slough may be present (yellow tissue)',
      'Possible undermining (tissue damage beneath intact skin edges)',
      'Possible tunneling (tract extending from wound)',
      'Significant wound depth',
      'Moderate to significant drainage',
      'Pain (though may be reduced due to nerve damage)'
    ],
    riskFactors: [
      'All risk factors for Stages 1-2 plus:',
      'Delayed presentation or recognition',
      'Multiple failed treatment attempts',
      'Severe mobility impairment',
      'Multiple comorbidities',
      'Severe malnutrition',
      'End-stage chronic disease'
    ],
    complications: [
      'Progression to Stage 4 with exposed bone/muscle',
      'Wound infection including cellulitis',
      'Osteomyelitis (bone infection)',
      'Sepsis',
      'Extended hospitalization',
      'Significant morbidity',
      'Need for surgical intervention'
    ],
    prevalence: 'Stage 3 pressure injuries represent approximately 10-15% of all pressure injuries in hospital settings but account for disproportionate healthcare costs.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Comprehensive Assessment and Stabilization',
      duration: 'First 1-2 weeks',
      description: 'Thorough wound assessment, evaluation for infection, optimization of patient condition, and establishment of comprehensive wound care plan.',
      goals: [
        'Complete wound assessment including undermining/tunneling',
        'Rule out or treat infection',
        'Implement aggressive pressure offloading',
        'Establish nutritional support',
        'Determine if surgical consultation needed',
        'Control wound exudate'
      ],
      activities: [
        'Detailed wound measurement including depth, undermining, tunneling',
        'Wound culture if signs of infection',
        'Photograph for baseline documentation',
        'Implement specialty support surface',
        'Strict turning protocol',
        'Nutritional assessment and supplementation',
        'Pain management',
        'Surgical consultation for possible debridement'
      ],
      medications: [
        {
          name: 'Systemic Antibiotics',
          purpose: 'Treat wound infection if present',
          duration: '7-14 days as indicated by culture'
        },
        {
          name: 'Appropriate Wound Dressings',
          purpose: 'Manage exudate, protect wound, promote healing',
          duration: 'Ongoing throughout healing'
        }
      ],
      warningSignsThisPhase: [
        'Exposed bone, tendon, or muscle (Stage 4)',
        'Signs of systemic infection or sepsis',
        'Rapidly expanding wound',
        'Foul odor despite treatment'
      ]
    },
    {
      phase: 2,
      name: 'Wound Bed Preparation and Debridement',
      duration: 'Weeks 2-6',
      description: 'Removal of non-viable tissue through appropriate debridement methods to create clean wound bed. Continued optimization of patient and wound environment.',
      goals: [
        'Remove slough and necrotic tissue',
        'Establish granulating wound bed',
        'Control bacterial bioburden',
        'Maintain moist wound environment',
        'Continue aggressive prevention'
      ],
      activities: [
        'Sharp/surgical debridement if indicated',
        'Autolytic debridement with appropriate dressings',
        'Enzymatic debridement if appropriate',
        'Frequent dressing changes for heavily draining wounds',
        'Negative pressure wound therapy if appropriate',
        'Continue nutritional optimization'
      ],
      medications: [
        {
          name: 'Alginate or Hydrofiber Dressings',
          purpose: 'Absorb exudate and promote debridement',
          duration: 'Change every 1-3 days'
        },
        {
          name: 'Negative Pressure Wound Therapy (NPWT)',
          purpose: 'Promote granulation and manage exudate',
          duration: 'Continuous, changed every 48-72 hours'
        }
      ],
      warningSignsThisPhase: [
        'Wound not responding to treatment',
        'Persistent slough despite debridement',
        'Infection not resolving',
        'Patient tolerance issues'
      ]
    },
    {
      phase: 3,
      name: 'Granulation and Healing',
      duration: 'Weeks 4-16+',
      description: 'Once wound bed is clean, granulation tissue fills the wound cavity, followed by epithelialization. This phase can be prolonged for large, deep wounds.',
      goals: [
        'Fill wound cavity with healthy granulation tissue',
        'Achieve wound contraction',
        'Promote epithelialization from edges',
        'Maintain infection-free status'
      ],
      activities: [
        'Transition to dressings promoting granulation',
        'Protect fragile new tissue',
        'Continue all prevention measures',
        'Weekly wound measurements',
        'Consider skin grafting for large wounds'
      ],
      warningSignsThisPhase: [
        'Wound stalled in healing',
        'Loss of granulation tissue',
        'Recurrence of slough or necrosis',
        'Wound increasing despite treatment'
      ]
    },
    {
      phase: 4,
      name: 'Surgical Intervention (if needed)',
      duration: 'Variable',
      description: 'Some Stage 3 wounds may require surgical closure with flap reconstruction, especially if located over bony prominence and expected to face ongoing pressure.',
      goals: [
        'Definitive wound closure',
        'Restore tissue coverage over bony prominence',
        'Reduce healing time'
      ],
      activities: [
        'Pre-surgical optimization',
        'Surgical flap closure',
        'Post-operative care with strict pressure relief',
        'Long-term prevention planning'
      ],
      warningSignsThisPhase: [
        'Flap failure signs: color change, coolness, breakdown',
        'Infection',
        'Dehiscence',
        'Recurrence'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic or reconstructive surgeon',
      'Wound care specialist',
      'Infectious disease specialist if osteomyelitis suspected',
      'Dietitian for aggressive nutritional support',
      'Physical therapy for long-term planning'
    ],
    investigations: [
      'Wound culture and sensitivity',
      'Complete blood count and inflammatory markers',
      'Nutritional labs: albumin, prealbumin, total protein',
      'Blood glucose and HbA1c for diabetics',
      'MRI or bone scan if osteomyelitis suspected',
      'Doppler studies if vascular disease suspected'
    ],
    medications: [
      {
        medication: 'Anticoagulants',
        instruction: 'hold if surgery planned',
        reason: 'Discuss with surgeon - may need bridging'
      },
      {
        medication: 'Nutritional supplements',
        instruction: 'start',
        reason: 'Essential for wound healing'
      }
    ],
    fastingInstructions: 'If surgery planned: nothing by mouth from midnight',
    dayBeforeSurgery: [
      'Complete bowel preparation if sacral surgery',
      'Shower with antimicrobial soap',
      'Light meal evening before',
      'Ensure support surface available post-operatively'
    ],
    whatToBring: [
      'All current medications',
      'Comfortable loose clothing',
      'Someone to stay with you post-operatively'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Take approved medications with sip of water',
      'Arrive at designated time',
      'Prepare for extended hospital stay (weeks)'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['General anesthesia', 'Spinal/regional anesthesia'],
    procedureDescription: 'Surgical management may include: Debridement to remove all non-viable tissue; Flap reconstruction using local tissue rotation or advancement flaps to provide durable coverage over bony prominence; In some cases, muscle flaps may be used to fill dead space and provide blood supply.',
    duration: '2-4 hours depending on complexity',
    whatToExpect: 'Patient will be under anesthesia. Surgeon will remove all dead tissue and reconstruct the area with healthy tissue. Multiple drains may be placed. Expect extended recovery with strict pressure precautions.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'STRICT positioning to keep ALL pressure off surgical site for 2-6 weeks. Special beds (air fluidized or low air loss) essential. No sitting on flaps until cleared by surgeon.',
      expectedSymptoms: [
        'Surgical site pain requiring strong analgesia',
        'Swelling around surgical site',
        'Drains will have bloody output initially',
        'Immobility required for weeks'
      ],
      activityLevel: 'Strict bed rest with complete pressure relief. May take weeks to months before any pressure allowed on flap.'
    },
    woundCare: [
      {
        day: 'Days 1-14 post-surgery',
        instruction: 'Surgical dressing remains intact unless soiled. Monitor flap color, temperature, and capillary refill. Empty drains and record output.'
      },
      {
        day: 'Weeks 2-4',
        instruction: 'Suture removal at 2-3 weeks. Transition to appropriate protective dressing. Continue strict positioning.'
      },
      {
        day: 'Weeks 4-8+',
        instruction: 'Gradual introduction of limited pressure as directed by surgeon. Progressive seating protocol.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (5-8/10) immediately post-op, decreasing over weeks',
      medications: [
        'Strong opioids (morphine, oxycodone) first 1-2 weeks',
        'Transition to weaker analgesics as tolerated',
        'Paracetamol as baseline',
        'NSAIDs if not contraindicated'
      ],
      nonPharmacological: [
        'Proper positioning on specialty surface',
        'Distraction techniques',
        'Ice to surrounding area (not on flap)',
        'Progressive mobility when allowed'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Any pressure on surgical site',
        restriction: 'Completely prohibited',
        duration: '4-8 weeks minimum',
        reason: 'Pressure will compromise flap blood supply and cause failure'
      },
      {
        activity: 'Sitting',
        restriction: 'Prohibited for sacral/ischial flaps',
        duration: '6-8 weeks or until cleared by surgeon',
        reason: 'Direct pressure on flap causes failure'
      },
      {
        activity: 'Mobility',
        restriction: 'Bed rest with careful positioning',
        duration: '4-6 weeks',
        reason: 'Movement can disrupt flap healing'
      }
    ],
    dietaryGuidelines: [
      'Aggressive nutritional support essential for flap healing',
      'High protein diet (1.5-2g/kg body weight)',
      'Adequate calories (35+ kcal/kg)',
      'Supplementation with vitamin C, zinc, vitamin A',
      'May need enteral or parenteral nutrition if intake poor',
      'No smoking - absolutely critical for flap survival'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Flap viable with good color and perfusion. Drains output decreasing.'
      },
      {
        timeframe: '2-3 weeks',
        expectation: 'Sutures removed. Flap healing well. Drains removed.'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Flap well healed. Beginning very gradual pressure introduction.'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Full healing with gradual return to sitting/positioning'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Complete integration of flap. Ongoing prevention required.'
      }
    ],
    functionalRecovery: 'Recovery depends on underlying condition causing immobility. Flap provides durable coverage but area remains at risk for recurrence. Lifelong prevention measures required.',
    cosmeticOutcome: 'Surgical scars visible. Flap tissue may appear different from surrounding skin. Function prioritized over cosmesis.',
    successRate: 'Flap success rates are 75-90% with strict post-operative protocols. Recurrence rates of 15-30% emphasize need for lifelong prevention.',
    possibleComplications: [
      'Flap necrosis (death of tissue)',
      'Wound dehiscence (opening)',
      'Infection',
      'Hematoma or seroma',
      'Recurrent pressure injury'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Daily',
        purpose: 'Flap assessment, drain management, positioning checks'
      },
      {
        timing: 'Weekly for 6 weeks',
        purpose: 'Wound assessment, suture removal, progress evaluation'
      },
      {
        timing: 'Monthly for 6 months',
        purpose: 'Long-term healing assessment and prevention reinforcement'
      },
      {
        timing: 'Annually thereafter',
        purpose: 'Ongoing surveillance and prevention'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy for mobility once cleared',
      'Occupational therapy for seating and positioning',
      'Pressure mapping for optimal surface prescription',
      'Patient and caregiver training for lifelong prevention'
    ],
    lifestyleModifications: [
      'Lifelong pressure relief and prevention measures',
      'Appropriate seating and sleeping surfaces permanently',
      'Regular skin inspections twice daily',
      'Maintain optimal nutrition',
      'No smoking ever',
      'Prompt attention to any skin changes',
      'Regular follow-up with wound care team'
    ]
  },

  warningSigns: [
    'Flap changing color (pale, blue, dark)',
    'Flap becoming cool',
    'Wound breakdown at suture line',
    'Increasing drainage or bleeding',
    'Fever',
    'Increasing pain',
    'Foul odor',
    'Swelling or hardness around flap'
  ],

  emergencySigns: [
    'Flap suddenly very pale, blue, or black (emergency - may need urgent surgery)',
    'High fever with wound infection',
    'Rapid expansion of redness suggesting cellulitis',
    'Signs of sepsis',
    'Significant bleeding'
  ],

  complianceRequirements: [
    {
      requirement: 'Strict positioning with zero pressure on flap',
      importance: 'critical',
      consequence: 'ANY pressure on new flap will cause failure requiring repeat surgery or non-healing'
    },
    {
      requirement: 'No smoking',
      importance: 'critical',
      consequence: 'Smoking dramatically increases flap failure rates and prevents healing'
    },
    {
      requirement: 'High protein nutrition',
      importance: 'critical',
      consequence: 'Malnutrition is leading cause of flap failure'
    },
    {
      requirement: 'All follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of problems enables intervention before flap loss'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Surgical Site Infection Prevention',
      reference: 'WHO-SSI 2018',
      keyPoints: [
        'Perioperative antibiotic prophylaxis as indicated',
        'Surgical site preparation with appropriate antiseptics',
        'Normothermia maintenance during surgery',
        'Glucose control in diabetic patients'
      ]
    },
    {
      title: 'NPUAP/EPUAP Stage 3 Guidelines',
      reference: 'NPUAP 2019',
      keyPoints: [
        'Assess depth including undermining and tunneling',
        'Determine need for debridement',
        'Consider advanced wound therapies',
        'Surgical consultation for non-healing wounds',
        'Address all contributing factors'
      ]
    }
  ]
};

/**
 * Stage 4 Pressure Injury
 */
export const stage4PressureInjury: EducationCondition = {
  id: 'pressure-injury-stage4',
  name: 'Stage 4 Pressure Injury',
  category: 'C',
  icdCode: 'L89.3',
  description: 'A Stage 4 pressure injury involves full-thickness skin and tissue loss with exposed or directly palpable bone, tendon, fascia, muscle, or cartilage. This is the most severe stageable pressure injury.',
  alternateNames: ['Stage 4 Pressure Ulcer', 'Stage 4 Bedsore', 'Full Thickness Pressure Ulcer with Deep Tissue Involvement', 'Severe Pressure Sore'],
  
  overview: {
    definition: 'Stage 4 pressure injury is full-thickness skin and tissue loss with exposed or directly palpable fascia, muscle, tendon, ligament, cartilage, or bone in the wound. Slough and/or eschar may be visible. Epibole (rolled wound edges), undermining, and/or tunneling often occur. Depth varies by anatomical location. These wounds can extend into muscle and supporting structures, potentially causing osteomyelitis or osteitis.',
    causes: [
      'Progression from inadequately treated earlier stages',
      'Severe, prolonged pressure causing deep tissue destruction',
      'Deep tissue injury surfacing through skin',
      'Severe ischemia with tissue necrosis',
      'Combination of multiple contributing factors',
      'Patient factors: malnutrition, immobility, comorbidities'
    ],
    symptoms: [
      'Deep wound extending to bone, tendon, or muscle',
      'Bone, tendon, or muscle visible or palpable in wound',
      'Significant tissue loss and wound depth',
      'May have slough or eschar (dead tissue)',
      'Undermining and tunneling often present',
      'Moderate to heavy wound drainage',
      'Foul odor may be present',
      'May have reduced pain due to nerve destruction'
    ],
    riskFactors: [
      'All risk factors for earlier stages',
      'Prolonged immobility (spinal cord injury, coma)',
      'Severe malnutrition',
      'Multiple system organ failure',
      'Advanced age with multiple comorbidities',
      'Poor access to healthcare',
      'Delayed presentation'
    ],
    complications: [
      'Osteomyelitis (bone infection) - common',
      'Sepsis and septic shock',
      'Cellulitis and spreading infection',
      'Hemorrhage from vessel erosion',
      'Significant protein loss through wound',
      'Anemia from chronic blood loss',
      'Amyloidosis with chronic wounds',
      'Malignancy in chronic wounds (Marjolin ulcer)',
      'Death'
    ],
    prevalence: 'Stage 4 pressure injuries represent approximately 5-10% of all pressure injuries but account for the highest morbidity, mortality, and healthcare costs.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Urgent Stabilization and Assessment',
      duration: 'First 1-2 weeks',
      description: 'Aggressive systemic stabilization, evaluation for life-threatening complications (sepsis, osteomyelitis), and comprehensive wound assessment.',
      goals: [
        'Stabilize patient systemically',
        'Diagnose and treat infection/osteomyelitis',
        'Complete wound mapping including deep structures',
        'Implement maximum pressure relief',
        'Begin nutritional resuscitation',
        'Pain control'
      ],
      activities: [
        'Complete wound assessment with probing for bone',
        'MRI or bone biopsy if osteomyelitis suspected',
        'Blood cultures if systemic infection suspected',
        'Specialty mattress (air fluidized bed ideal)',
        'IV antibiotics as indicated',
        'Nutritional support (may need TPN)',
        'Pain management protocol'
      ],
      medications: [
        {
          name: 'IV Antibiotics',
          purpose: 'Treat infection/osteomyelitis',
          duration: '6-8 weeks for osteomyelitis'
        },
        {
          name: 'Strong Analgesics',
          purpose: 'Pain control',
          duration: 'Ongoing'
        }
      ],
      warningSignsThisPhase: [
        'Sepsis: fever, confusion, rapid heart rate, low blood pressure',
        'Hemorrhage from wound',
        'Rapid deterioration',
        'Multi-organ failure'
      ]
    },
    {
      phase: 2,
      name: 'Aggressive Debridement',
      duration: 'Weeks 2-8',
      description: 'Removal of all dead tissue including potentially infected bone. May require multiple surgical procedures.',
      goals: [
        'Remove all necrotic tissue',
        'Remove infected bone if present',
        'Establish clean wound bed',
        'Control bioburden'
      ],
      activities: [
        'Surgical debridement (often multiple sessions)',
        'Removal of infected/necrotic bone',
        'Negative pressure wound therapy',
        'Frequent dressing changes',
        'Continued systemic antibiotic therapy',
        'Continued nutritional optimization'
      ],
      medications: [
        {
          name: 'Negative Pressure Wound Therapy',
          purpose: 'Promote granulation and manage exudate',
          duration: 'Weeks to months'
        }
      ],
      warningSignsThisPhase: [
        'Osteomyelitis not responding to treatment',
        'Wound not responding despite debridement',
        'Patient unable to tolerate surgery',
        'Nutritional status not improving'
      ]
    },
    {
      phase: 3,
      name: 'Reconstruction Planning and Healing',
      duration: 'Months 2-6+',
      description: 'Once wound bed is clean and infection controlled, planning for definitive closure through surgical reconstruction or continued wound healing.',
      goals: [
        'Achieve granulating wound bed',
        'Determine surgical versus conservative closure',
        'Optimize patient for surgery if indicated',
        'Establish long-term plan'
      ],
      activities: [
        'Continue wound bed preparation',
        'Nutritional optimization for surgery',
        'Pre-operative planning if surgery indicated',
        'Patient and caregiver education',
        'Long-term positioning and equipment planning'
      ],
      warningSignsThisPhase: [
        'Wound stalling despite optimal care',
        'Recurrent infection',
        'Patient unable to comply with requirements'
      ]
    },
    {
      phase: 4,
      name: 'Surgical Reconstruction',
      duration: 'Surgery plus 3-6 months recovery',
      description: 'Definitive surgical closure with myocutaneous or fasciocutaneous flap to provide durable soft tissue coverage.',
      goals: [
        'Definitive wound closure',
        'Durable tissue coverage',
        'Prevention of recurrence'
      ],
      activities: [
        'Flap surgery for wound closure',
        'Strict post-operative positioning protocol',
        'Long-term prevention implementation',
        'Gradual progressive seating/positioning'
      ],
      warningSignsThisPhase: [
        'Flap compromise',
        'Wound breakdown',
        'Recurrence of pressure injury'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic/Reconstructive surgeon experienced in flap surgery',
      'Infectious disease specialist',
      'Orthopedic surgeon if bone debridement needed',
      'Dietitian for aggressive nutritional optimization',
      'Anesthesiologist for pre-operative assessment',
      'Physical medicine and rehabilitation'
    ],
    investigations: [
      'MRI to assess extent of tissue damage and osteomyelitis',
      'Bone biopsy and culture if osteomyelitis suspected',
      'CT scan for surgical planning',
      'Complete blood count, inflammatory markers',
      'Comprehensive metabolic panel',
      'Nutritional labs (albumin, prealbumin, total protein)',
      'Blood type and crossmatch',
      'ECG and cardiac clearance if indicated'
    ],
    medications: [
      {
        medication: 'Antibiotics',
        instruction: 'continue',
        reason: 'Complete full course for osteomyelitis before reconstruction'
      },
      {
        medication: 'Anticoagulants',
        instruction: 'discuss with surgeon',
        reason: 'May need to hold or bridge for surgery'
      },
      {
        medication: 'Nutritional supplements',
        instruction: 'start or continue',
        reason: 'Optimal nutrition essential for flap survival'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before surgery',
    dayBeforeSurgery: [
      'Bowel preparation for sacral wounds',
      'Antimicrobial shower',
      'Confirm blood products available',
      'Specialty bed confirmed for post-operative period'
    ],
    whatToBring: [
      'All current medications',
      'Advance directive documents',
      'Family contact information',
      'Prepare for extended hospital stay (weeks to months)'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Take approved medications with sip of water',
      'Arrive at designated time',
      'Family present for pre and post-operative discussions'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia (procedure is extensive)',
    procedureDescription: 'Stage 4 reconstruction typically involves: Radical debridement of all non-viable tissue including bone if osteomyelitic; Myocutaneous flap rotation (using muscle with overlying skin for blood supply and padding); Large flaps may be required (gluteus maximus, tensor fascia lata, rectus femoris, etc.); Multiple drains placed; May require multiple surgeries.',
    duration: '3-6 hours or longer depending on complexity',
    whatToExpect: 'Extensive surgery under general anesthesia. Patient will have drains, possibly feeding tubes, and require ICU or specialized bed. Extended hospital stay anticipated.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'ABSOLUTE zero pressure on flap for 4-8 weeks minimum. Air fluidized bed or low air loss mattress required. Nursing staff trained in flap care. Flap checks every 2-4 hours initially.',
      expectedSymptoms: [
        'Significant surgical pain',
        'Swelling',
        'Bloody drainage from drains',
        'Difficulty with positioning',
        'Need for assistance with all activities'
      ],
      activityLevel: 'Complete bed rest. No sitting, no pressure on flap. This may continue for 6-8 weeks or longer.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Surgical dressing remains in place. Monitor flap color, temperature, capillary refill every 2-4 hours. Empty and measure drain output.'
      },
      {
        day: 'Days 7-14',
        instruction: 'First dressing change. Gentle wound care. Assess for infection. Continue flap monitoring.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Progressive wound care. Suture/staple removal at 2-3 weeks. Drain removal when output minimal.'
      },
      {
        day: 'Weeks 6-12+',
        instruction: 'Very gradual introduction of pressure per surgical protocol. Progressive seating protocol.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Severe initially (7-10/10), gradually decreasing',
      medications: [
        'Patient-controlled analgesia (PCA) first 48-72 hours',
        'Transition to oral opioids',
        'Paracetamol and NSAIDs as adjuncts',
        'Gradual weaning over weeks',
        'May need pain medicine consultation'
      ],
      nonPharmacological: [
        'Specialty bed for comfort',
        'Careful positioning',
        'Music therapy, relaxation',
        'Psychological support'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Any pressure on flap',
        restriction: 'Absolutely prohibited',
        duration: '6-8 weeks minimum',
        reason: 'Flap requires this time to establish blood supply'
      },
      {
        activity: 'Sitting',
        restriction: 'Prohibited for pelvic flaps',
        duration: '6-12 weeks',
        reason: 'Direct pressure causes flap failure'
      },
      {
        activity: 'Walking',
        restriction: 'May be allowed with walker depending on flap location',
        duration: 'Per surgeon',
        reason: 'Some movement may be permitted if does not stress flap'
      },
      {
        activity: 'Transfer/Mobility',
        restriction: 'Maximum assistance required',
        duration: 'Weeks to months',
        reason: 'Prevent shear and pressure on flap'
      }
    ],
    dietaryGuidelines: [
      'Maximum nutritional support essential',
      'Protein: 1.5-2g/kg body weight or more',
      'Calories: 35-40 kcal/kg',
      'Vitamin C: 1000mg daily',
      'Zinc: 40mg daily',
      'Vitamin A supplementation',
      'May need tube feeding or TPN if oral intake insufficient',
      'ABSOLUTE NO SMOKING'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '48 hours',
        expectation: 'Flap viable with good color and perfusion'
      },
      {
        timeframe: '1 week',
        expectation: 'Flap stable, drains decreasing, no infection'
      },
      {
        timeframe: '2-3 weeks',
        expectation: 'Wound healing, sutures removed, drains out'
      }
    ],
    longTerm: [
      {
        timeframe: '2-3 months',
        expectation: 'Complete flap healing, beginning gradual pressure introduction'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Full return to premorbid activity level if possible'
      }
    ],
    functionalRecovery: 'Depends heavily on underlying condition. Spinal cord injury patients may return to wheelchair. Goal is stable soft tissue coverage allowing function. Lifelong prevention required.',
    cosmeticOutcome: 'Significant scarring. Flap tissue different from surrounding skin. Function prioritized over appearance.',
    successRate: 'Flap success rates 70-85% with optimal care. Recurrence rates 20-40% emphasize the importance of lifelong prevention.',
    possibleComplications: [
      'Flap failure (partial or complete)',
      'Wound dehiscence',
      'Infection',
      'Hematoma/seroma',
      'Recurrence of pressure injury',
      'Deep vein thrombosis',
      'Pulmonary embolism'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Multiple times daily initially',
        purpose: 'Flap monitoring'
      },
      {
        timing: 'Weekly for first 2 months',
        purpose: 'Wound assessment and care plan adjustment'
      },
      {
        timing: 'Monthly for 6 months',
        purpose: 'Long-term healing and prevention'
      },
      {
        timing: 'Every 3 months for 2 years',
        purpose: 'Surveillance for recurrence'
      },
      {
        timing: 'Annually lifelong',
        purpose: 'Prevention maintenance'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy (inpatient and outpatient)',
      'Occupational therapy for ADLs and positioning',
      'Pressure mapping for seating',
      'Wheelchair or seating clinic',
      'Home assessment for equipment needs',
      'Caregiver training'
    ],
    lifestyleModifications: [
      'Lifelong pressure injury prevention',
      'Specialty seating and sleeping surfaces forever',
      'Skin checks minimum twice daily',
      'Optimize nutrition permanently',
      'Never smoke',
      'Regular healthcare follow-up',
      'Immediate attention to any skin changes',
      'May need periodic return to specialty services'
    ]
  },

  warningSigns: [
    'Flap color change (pale, blue, mottled, dark)',
    'Flap cool to touch',
    'Wound breakdown or opening',
    'Increasing drainage or bleeding',
    'Fever or feeling unwell',
    'Increasing pain',
    'Foul odor from wound',
    'Redness spreading beyond wound'
  ],

  emergencySigns: [
    'Flap suddenly pale, blue, or black - EMERGENCY (call surgeon immediately)',
    'High fever with rigors',
    'Confusion or altered mental status',
    'Rapid breathing, fast heart rate (sepsis signs)',
    'Significant hemorrhage',
    'Sudden severe pain'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolute zero pressure on flap for prescribed duration',
      importance: 'critical',
      consequence: 'Any pressure causes flap failure, requiring repeat surgery or permanent wound'
    },
    {
      requirement: 'No smoking ever',
      importance: 'critical',
      consequence: 'Smoking causes vasoconstriction and dramatically increases flap failure'
    },
    {
      requirement: 'Complete nutritional protocol',
      importance: 'critical',
      consequence: 'Malnutrition is leading cause of flap failure'
    },
    {
      requirement: 'Strict bed rest protocol',
      importance: 'critical',
      consequence: 'Movement and shear disrupt flap healing'
    },
    {
      requirement: 'All follow-up appointments',
      importance: 'critical',
      consequence: 'Problems must be detected early for intervention'
    },
    {
      requirement: 'Lifelong prevention measures',
      importance: 'critical',
      consequence: 'High recurrence rate without ongoing prevention'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Surgical Care Guidelines',
      reference: 'WHO-SCG 2018',
      keyPoints: [
        'Surgical site preparation and infection prevention',
        'Perioperative antibiotic prophylaxis',
        'VTE prophylaxis for high-risk surgery',
        'Nutritional optimization pre-operatively'
      ]
    },
    {
      title: 'NPUAP/EPUAP Stage 4 Guidelines',
      reference: 'NPUAP 2019',
      keyPoints: [
        'Evaluate and treat osteomyelitis before reconstruction',
        'Full debridement of necrotic tissue including bone',
        'Surgical reconstruction should be considered',
        'Address all causative factors before and after surgery',
        'Lifelong prevention protocol required'
      ]
    }
  ]
};

// Export pressure injury conditions part 2
export const pressureInjuriesPart2 = [stage3PressureInjury, stage4PressureInjury];
