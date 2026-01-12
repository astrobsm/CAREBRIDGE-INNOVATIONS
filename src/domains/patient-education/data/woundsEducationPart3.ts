/**
 * Patient Education Content - Category B: Wounds - Acute & Chronic
 * Part 3: Chronic Wounds and Wound Dehiscence
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Evidence-Based Practice
 */

import type { EducationCondition } from '../types';

/**
 * Chronic Non-Healing Wounds
 */
export const chronicWounds: EducationCondition = {
  id: 'chronic-wound',
  name: 'Chronic Non-Healing Wounds',
  category: 'B',
  icdCode: 'L98.4',
  description: 'A chronic wound is a wound that fails to heal through the normal healing process within the expected time frame, typically 4-6 weeks. These wounds require specialized assessment and treatment.',
  alternateNames: ['Non-Healing Wound', 'Hard-to-Heal Wound', 'Complex Wound', 'Problematic Wound'],
  
  overview: {
    definition: 'A chronic wound is defined as a wound that has not proceeded through the orderly and timely reparative process within 4-6 weeks, despite appropriate standard wound care. These wounds become "stuck" in one phase of healing, usually the inflammatory phase. Understanding and addressing the underlying causes is essential for successful healing.',
    causes: [
      'Underlying medical conditions (diabetes, vascular disease)',
      'Repeated trauma or pressure to the wound',
      'Infection (bacterial biofilm)',
      'Poor blood supply (arterial disease)',
      'Venous insufficiency causing leg ulcers',
      'Malnutrition and protein deficiency',
      'Immunosuppression',
      'Foreign body in wound',
      'Cancer in the wound (Marjolin ulcer)'
    ],
    symptoms: [
      'Wound not showing signs of healing for more than 4 weeks',
      'Wound increasing in size',
      'Persistent or recurrent drainage',
      'Unhealthy wound bed (dark, dry, or covered in slough)',
      'Foul odor from the wound',
      'Pain that may be increasing or changing character',
      'Surrounding skin changes (dark, thin, or hardened)',
      'Exposed bone, tendon, or muscle'
    ],
    riskFactors: [
      'Diabetes mellitus, especially poorly controlled',
      'Peripheral arterial disease',
      'Venous insufficiency',
      'Obesity',
      'Smoking',
      'Malnutrition',
      'Advanced age',
      'Immobility',
      'Immunocompromised state',
      'Repeated wound trauma',
      'Radiation history to area'
    ],
    complications: [
      'Wound infection spreading to surrounding tissue (cellulitis)',
      'Bone infection (osteomyelitis)',
      'Systemic infection (sepsis)',
      'Amputation (especially diabetic foot ulcers)',
      'Malignant transformation (Marjolin ulcer)',
      'Chronic pain',
      'Depression and reduced quality of life',
      'Prolonged hospitalization'
    ],
    prevalence: 'Chronic wounds affect approximately 1-2% of the population in developed countries. The prevalence is increasing due to aging populations and rising rates of diabetes and obesity.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Comprehensive Assessment',
      duration: 'First 1-2 weeks',
      description: 'Thorough evaluation to identify and address all factors preventing wound healing. This includes assessment of the wound itself, underlying conditions, and patient factors.',
      goals: [
        'Identify all barriers to healing',
        'Establish accurate diagnosis',
        'Create comprehensive treatment plan',
        'Optimize underlying conditions'
      ],
      activities: [
        'Complete wound assessment (size, depth, tissue type)',
        'Vascular assessment (pulses, ankle-brachial index)',
        'Nutritional assessment',
        'Diabetes screening and control assessment',
        'Biopsy if wound suspicious for cancer',
        'Imaging if bone infection suspected'
      ],
      medications: [
        {
          name: 'Pain Medications',
          purpose: 'Control chronic wound pain',
          duration: 'Ongoing as needed'
        }
      ],
      warningSignsThisPhase: [
        'Signs of spreading infection',
        'Suspicion of underlying cancer',
        'Severe arterial disease requiring revascularization',
        'Rapidly worsening wound'
      ]
    },
    {
      phase: 2,
      name: 'Wound Bed Preparation',
      duration: '2-6 weeks',
      description: 'Focus on creating optimal conditions for healing by removing dead tissue, controlling infection, managing moisture, and addressing wound edges.',
      goals: [
        'Remove dead and unhealthy tissue',
        'Control bacterial burden',
        'Establish healthy wound bed',
        'Prepare wound for healing or advanced therapy'
      ],
      activities: [
        'Sharp or surgical debridement of dead tissue',
        'Antimicrobial dressings or agents',
        'Appropriate moisture management',
        'Compression therapy for venous ulcers',
        'Offloading for diabetic foot ulcers',
        'Negative pressure wound therapy (wound VAC) if appropriate'
      ],
      medications: [
        {
          name: 'Topical Antimicrobials',
          purpose: 'Control wound bioburden',
          duration: 'Until wound bed healthy'
        },
        {
          name: 'Systemic Antibiotics',
          purpose: 'Treat infection spreading beyond wound',
          duration: 'Course as prescribed'
        }
      ],
      warningSignsThisPhase: [
        'Signs of systemic infection',
        'Wound getting larger despite treatment',
        'Exposed bone suggesting osteomyelitis',
        'Allergic reaction to wound products'
      ]
    },
    {
      phase: 3,
      name: 'Active Healing Phase',
      duration: '6 weeks to months',
      description: 'With barriers addressed and wound bed prepared, the wound can progress through normal healing. Continued support and monitoring required.',
      goals: [
        'Promote granulation tissue formation',
        'Support epithelialization (skin coverage)',
        'Prevent complications',
        'Consider advanced therapies if needed'
      ],
      activities: [
        'Regular dressing changes with appropriate products',
        'Continued compression or offloading',
        'Consider advanced therapies (skin grafts, growth factors)',
        'Hyperbaric oxygen therapy if indicated',
        'Nutritional supplementation',
        'Regular wound measurements to track progress'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Wound not responding to optimal care',
        'Recurrent breakdown',
        'Signs of underlying undiagnosed condition'
      ]
    },
    {
      phase: 4,
      name: 'Maintenance and Prevention',
      duration: 'Lifelong',
      description: 'Even after healing, the underlying conditions persist. Ongoing care is needed to prevent recurrence, which occurs in up to 70% of some chronic wound types.',
      goals: [
        'Maintain healed tissue',
        'Prevent wound recurrence',
        'Optimize underlying conditions',
        'Patient education and self-monitoring'
      ],
      activities: [
        'Continue compression therapy for venous disease',
        'Proper footwear and foot care for diabetic patients',
        'Regular skin checks',
        'Ongoing management of diabetes, circulation',
        'Maintain healthy weight and nutrition'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Any break in healed skin',
        'Early signs of new wound forming',
        'Worsening of underlying condition'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Wound care specialist or wound clinic referral',
      'Vascular surgeon if arterial or venous disease',
      'Diabetes specialist if blood sugar poorly controlled',
      'Nutritionist for malnutrition',
      'Infectious disease if recurrent or resistant infection',
      'Plastic surgeon for reconstructive options'
    ],
    investigations: [
      'Blood tests: full blood count, kidney function, glucose, HbA1c, albumin, inflammatory markers',
      'Wound culture and sensitivity',
      'Ankle-brachial pressure index (ABPI) for leg ulcers',
      'Doppler ultrasound of leg veins',
      'CT or MRI angiography if arterial disease suspected',
      'X-ray or MRI for suspected bone infection',
      'Wound biopsy if atypical appearance or not healing'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need adjustment for debridement procedures'
      },
      {
        medication: 'Diabetes medications',
        instruction: 'continue',
        reason: 'Good blood sugar control essential for healing'
      },
      {
        medication: 'Nutritional supplements',
        instruction: 'continue',
        reason: 'Support healing with protein and vitamin supplements'
      }
    ],
    dayBeforeSurgery: [
      'For planned debridement: fast as instructed',
      'Continue prescribed wound care',
      'Note any changes in wound to report'
    ],
    dayOfSurgery: [
      'Bring list of all current wound care products',
      'Wear loose comfortable clothing',
      'Bring comfortable shoes for offloading foot wounds'
    ],
    whatToBring: [
      'Complete medication list',
      'Current wound care supplies',
      'Compression stockings if using',
      'Medical records from other providers'
    ],
    fastingInstructions: 'For bedside debridement, no fasting required. For operating room procedures, follow standard fasting instructions.'
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia for minor debridement. Regional or general anesthesia for major debridement, skin grafting, or flap surgery.',
    procedureSteps: [
      'Wound assessed and photographed',
      'Sharp debridement of dead and unhealthy tissue',
      'Wound edges freshened',
      'Thorough irrigation',
      'Assessment of wound bed quality',
      'Skin graft or flap if planned',
      'Negative pressure dressing if appropriate',
      'Appropriate wound dressing applied'
    ],
    duration: '30 minutes to several hours depending on wound size and planned procedures',
    whatToExpect: 'Debridement may need to be repeated multiple times. You may need negative pressure wound therapy (wound VAC) applied. The wound may look larger after debridement - this is normal and necessary for healing.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate legs for venous ulcers. Offload pressure from diabetic foot ulcers. Follow specific instructions for skin grafts.',
      expectedSymptoms: [
        'Mild increased pain after debridement (temporary)',
        'Increased wound drainage initially',
        'Wound appears larger after dead tissue removed',
        'Healthy red tissue visible in wound bed'
      ],
      painManagement: 'Take pain medications as prescribed. Pain should improve as wound becomes healthier.',
      activityLevel: 'Follow specific instructions based on wound location and treatment. Generally, some mobility encouraged but protect the wound.'
    },
    woundCare: [
      {
        day: 'First 24-48 hours',
        instruction: 'Keep dressing in place unless excessive drainage. Elevate as instructed.'
      },
      {
        day: 'Ongoing',
        instruction: 'Follow dressing protocol from wound care team. This varies by wound type and products used.'
      },
      {
        day: 'Between appointments',
        instruction: 'Change dressings as instructed. Watch for signs of infection. Attend all follow-up appointments.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Variable. Chronic wound pain can be significant. Should improve as wound heals.',
      medications: [
        'Regular paracetamol',
        'Ibuprofen if not contraindicated',
        'Gabapentin or pregabalin for neuropathic pain',
        'Topical anesthetics before dressing changes',
        'Stronger medications for severe pain'
      ],
      nonPharmacological: [
        'Optimal dressing that maintains moisture and does not stick',
        'Gentle dressing changes',
        'Elevation for leg ulcers',
        'Relaxation techniques'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Walking (leg ulcers)',
        restriction: 'Limit standing; elevate when sitting',
        duration: 'Until healed and ongoing for prevention',
        reason: 'Reduces venous congestion and promotes healing'
      },
      {
        activity: 'Weight bearing (foot ulcers)',
        restriction: 'Offload with special shoes or boot',
        duration: 'Until healed',
        reason: 'Pressure prevents healing of diabetic foot ulcers'
      }
    ],
    dietaryGuidelines: [
      'High protein diet (1.25-1.5g protein per kg body weight)',
      'Adequate calories to support healing',
      'Vitamin C supplementation (500-1000mg daily)',
      'Zinc supplementation (15-30mg daily)',
      'Arginine supplements may help wound healing',
      'Good hydration',
      'Strict blood sugar control for diabetics'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2-4 weeks',
        expectation: 'Wound bed should look healthier (red, granulating). Size may be same or slightly larger after debridement.'
      },
      {
        timeframe: '4-8 weeks',
        expectation: 'Visible wound contraction and healing from edges. Wound should be getting smaller.'
      },
      {
        timeframe: '8-12 weeks',
        expectation: 'Significant wound size reduction. Healthy granulation tissue throughout.'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Many chronic wounds healed or nearly healed with optimal care.'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Complete healing for most wounds. Ongoing prevention measures continue.'
      },
      {
        timeframe: 'Lifelong',
        expectation: 'Ongoing prevention required. Recurrence rate is 30-70% without prevention.'
      }
    ],
    functionalRecovery: 'Depends on wound location and underlying condition. Many patients achieve good functional recovery with proper treatment. Some may have permanent limitations.',
    cosmeticOutcome: 'Chronic wounds may leave significant scarring. Skin grafted areas may have different texture and color. Compression therapy helps maintain healed tissue.',
    successRate: 'With optimal care, 60-80% of chronic wounds can be healed. Success depends heavily on addressing underlying conditions and patient compliance.'
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Weekly initially',
        purpose: 'Wound assessment, dressing changes, treatment adjustment'
      },
      {
        timing: 'Every 2-4 weeks as healing',
        purpose: 'Monitor progress, adjust treatment plan'
      },
      {
        timing: 'Monthly after healing',
        purpose: 'Prevent recurrence, early detection of new wounds'
      },
      {
        timing: 'Every 3-6 months long-term',
        purpose: 'Ongoing monitoring and prevention'
      }
    ],
    rehabilitationNeeds: [
      'Compression therapy training for venous ulcers',
      'Footwear fitting and education for diabetic foot',
      'Physical therapy for mobility and strength',
      'Nutritional counseling'
    ],
    lifestyleModifications: [
      'Stop smoking - essential for healing',
      'Control blood sugar strictly',
      'Daily skin and foot inspections',
      'Wear compression stockings as prescribed',
      'Wear appropriate therapeutic footwear',
      'Maintain healthy weight',
      'Regular exercise appropriate to condition'
    ]
  },

  warningSigns: [
    'Wound increasing in size',
    'Increased pain, redness, or warmth',
    'Increasing or foul-smelling drainage',
    'Fever or feeling unwell',
    'New areas of breakdown',
    'Exposed bone or tendon',
    'Dark or black tissue in wound'
  ],

  emergencySigns: [
    'Signs of severe infection: high fever, confusion, rapid heart rate',
    'Rapidly spreading redness',
    'Severe pain out of proportion to wound',
    'Signs of gangrene: black tissue spreading',
    'New numbness or weakness in limb'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all wound care appointments',
      importance: 'critical',
      consequence: 'Missed appointments delay healing and risk complications'
    },
    {
      requirement: 'Use compression therapy as prescribed',
      importance: 'critical',
      consequence: 'Venous ulcers will not heal without compression'
    },
    {
      requirement: 'Offload diabetic foot ulcers',
      importance: 'critical',
      consequence: 'Walking on ulcers prevents healing and can lead to amputation'
    },
    {
      requirement: 'Control blood sugar (HbA1c < 7%)',
      importance: 'critical',
      consequence: 'Uncontrolled diabetes prevents wound healing'
    },
    {
      requirement: 'Stop smoking',
      importance: 'critical',
      consequence: 'Smoking severely impairs wound healing and circulation'
    },
    {
      requirement: 'Follow nutritional recommendations',
      importance: 'important',
      consequence: 'Malnutrition prevents wound healing'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Wound Assessment and Treatment',
      reference: 'WHO-WAT 2018',
      keyPoints: [
        'Identify and treat underlying cause of wound',
        'Debride non-viable tissue',
        'Control bacterial bioburden',
        'Maintain moist wound environment',
        'Address patient factors (nutrition, diabetes control)'
      ]
    },
    {
      title: 'WHO Diabetes Management Guidelines',
      reference: 'WHO-DM 2021',
      keyPoints: [
        'Regular foot examination for diabetic patients',
        'Appropriate footwear to prevent ulceration',
        'Prompt treatment of diabetic foot ulcers',
        'Multidisciplinary approach to diabetic foot care'
      ]
    }
  ]
};

/**
 * Wound Dehiscence
 */
export const woundDehiscence: EducationCondition = {
  id: 'wound-dehiscence',
  name: 'Wound Dehiscence (Wound Reopening)',
  category: 'B',
  icdCode: 'T81.31',
  description: 'Wound dehiscence is the partial or complete reopening of a surgical incision along the suture line. This is a serious complication requiring immediate medical attention.',
  alternateNames: ['Wound Breakdown', 'Burst Abdomen', 'Wound Separation', 'Incision Reopening'],
  
  overview: {
    definition: 'Wound dehiscence occurs when a surgical incision partially or completely opens after it has been closed. It typically occurs 5-10 days after surgery when wound strength is at its lowest. In abdominal surgery, complete dehiscence with exposure of internal organs (evisceration) is a surgical emergency. Early recognition and treatment are essential.',
    causes: [
      'Wound infection',
      'Increased abdominal pressure (coughing, vomiting, straining)',
      'Poor surgical technique',
      'Premature suture removal',
      'Emergency surgery (less optimal conditions)',
      'Previous surgery through same incision',
      'Tissue weakness from steroids or malnutrition'
    ],
    symptoms: [
      'Sudden feeling of "giving way" or popping at incision',
      'Gush of clear, pink, or bloody fluid from wound (hallmark sign)',
      'Visible separation of wound edges',
      'Exposure of deeper tissues or internal organs',
      'Pain at the surgical site',
      'Fever if infection is the cause'
    ],
    riskFactors: [
      'Obesity',
      'Smoking',
      'Diabetes mellitus',
      'Malnutrition and low albumin',
      'Chronic cough (COPD, asthma)',
      'Steroid or immunosuppressive use',
      'Previous wound dehiscence',
      'Emergency surgery',
      'Advanced age',
      'Wound infection',
      'Ascites (abdominal fluid)'
    ],
    complications: [
      'Evisceration (organs protruding through wound)',
      'Wound infection',
      'Incisional hernia',
      'Need for reoperation',
      'Prolonged hospitalization',
      'Death (mortality 25-45% with evisceration)'
    ],
    prevalence: 'Wound dehiscence occurs in 0.5-3% of abdominal surgeries. Risk is higher in emergency surgery, obese patients, and those with wound infections.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Emergency Assessment and Stabilization',
      duration: 'First hours',
      description: 'Immediate recognition and stabilization. For abdominal evisceration, this is a surgical emergency. Cover exposed tissues and prepare for surgery.',
      goals: [
        'Recognize dehiscence immediately',
        'Protect exposed tissues',
        'Stabilize patient',
        'Prepare for surgical repair'
      ],
      activities: [
        'Keep patient calm and lying flat',
        'Cover exposed tissues with saline-soaked sterile dressing',
        'Do NOT push organs back in',
        'Call for immediate medical help',
        'Establish IV access',
        'Give pain relief and antibiotics'
      ],
      medications: [
        {
          name: 'IV Antibiotics',
          purpose: 'Prevent or treat infection',
          duration: 'Starting immediately, continued course'
        },
        {
          name: 'IV Pain Relief',
          purpose: 'Control pain and reduce straining',
          duration: 'Until surgery and postoperatively'
        }
      ],
      warningSignsThisPhase: [
        'Bowel visible outside abdomen',
        'Signs of shock',
        'Signs of bowel strangulation'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Repair',
      duration: 'Hours to 1-2 days',
      description: 'Return to operating room for wound inspection, debridement if infected, and reclosure. May require temporary closure techniques if tissues edematous.',
      goals: [
        'Thorough wound inspection',
        'Debridement of unhealthy tissue',
        'Secure wound closure',
        'Prevent recurrence'
      ],
      activities: [
        'General anesthesia',
        'Wound exploration and debridement',
        'Mass closure or retention sutures',
        'Possible mesh reinforcement',
        'Negative pressure dressing if appropriate'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Bowel injury',
        'Unable to close abdomen (open abdomen may be needed)',
        'Hemodynamic instability'
      ]
    },
    {
      phase: 3,
      name: 'Post-Repair Recovery',
      duration: '1-4 weeks',
      description: 'Careful monitoring after repair. Higher risk of recurrent dehiscence. Focus on eliminating risk factors and supporting healing.',
      goals: [
        'Prevent recurrent dehiscence',
        'Treat underlying causes',
        'Optimize nutrition',
        'Monitor for complications'
      ],
      activities: [
        'Abdominal binder support',
        'Cough suppression and bowel regulation',
        'Nutritional support',
        'Blood sugar control',
        'Gradual mobilization',
        'Keep sutures in longer (2-3 weeks)'
      ],
      medications: [
        {
          name: 'Stool Softeners',
          purpose: 'Prevent straining',
          duration: 'Until wound healed'
        },
        {
          name: 'Cough Suppressants',
          purpose: 'Reduce abdominal pressure',
          duration: 'As needed'
        },
        {
          name: 'Antibiotics',
          purpose: 'Treat or prevent wound infection',
          duration: '7-14 days typically'
        }
      ],
      warningSignsThisPhase: [
        'Recurrent wound separation',
        'Signs of infection',
        'Fistula formation',
        'Ongoing drainage'
      ]
    },
    {
      phase: 4,
      name: 'Long-Term Recovery',
      duration: 'Months to years',
      description: 'Complete healing and rehabilitation. Monitor for incisional hernia which occurs in many patients after dehiscence.',
      goals: [
        'Complete wound healing',
        'Restore function',
        'Monitor for hernia',
        'Address modifiable risk factors'
      ],
      activities: [
        'Gradual return to activities',
        'Weight loss if obese',
        'Smoking cessation',
        'Monitor for hernia development',
        'Consider elective hernia repair if develops'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Bulge at incision site (hernia)',
        'Pain with activity',
        'Bowel obstruction symptoms'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'EMERGENCY: Call for immediate medical help if wound opens',
      'Surgical team assessment',
      'Anesthesia evaluation for reoperation'
    ],
    investigations: [
      'Wound culture if infection suspected',
      'Blood tests for infection markers and nutrition',
      'CT scan if internal complications suspected'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need reversal for emergency surgery'
      }
    ],
    dayBeforeSurgery: [
      'This is usually an emergency - no advance preparation',
      'Keep nothing by mouth if surgery planned'
    ],
    dayOfSurgery: [
      'Do not eat or drink',
      'Keep wound covered and protected',
      'Remain calm and lying down'
    ],
    whatToBring: [
      'Current medication list',
      'Advance directive if available',
      'Contact information for family'
    ],
    fastingInstructions: 'For emergency surgery, stomach will be emptied via tube if needed. For planned repair, standard fasting applies.'
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia for all but the most superficial dehiscence',
    procedureSteps: [
      'Wound edges are cleaned and debrided',
      'Abdominal cavity is inspected',
      'Bowel is checked for injury',
      'Wound is irrigated thoroughly',
      'Strong retention sutures are placed',
      'Mesh may be used for reinforcement',
      'Superficial layers closed over drains if needed'
    ],
    duration: '1-3 hours depending on complexity',
    whatToExpect: 'This is a more extensive operation than the original surgery. You will have stronger sutures and possibly reinforcement with mesh. Recovery will take longer than after the original surgery.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Lie flat or with head slightly elevated. Avoid sitting up abruptly which increases abdominal pressure.',
      expectedSymptoms: [
        'More pain than after original surgery',
        'Abdominal binder in place',
        'Possible drains from wound',
        'Nasogastric tube may be present',
        'Longer hospitalization required'
      ],
      painManagement: 'Stronger pain control required. Pain should be controlled to prevent coughing and straining.',
      activityLevel: 'Bed rest initially. Very gradual mobilization with support.'
    },
    woundCare: [
      {
        day: 'First week',
        instruction: 'Wound care by medical team only. Sutures will stay much longer than normal.'
      },
      {
        day: 'Weeks 2-4',
        instruction: 'Keep wound clean and dry. Abdominal binder worn at all times when upright.'
      },
      {
        day: 'After suture removal',
        instruction: 'Continue binder support. Very gradual activity increase.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe initially, higher than after original surgery',
      medications: [
        'Strong pain medications (opioids) initially',
        'Regular paracetamol',
        'Anti-inflammatory when cleared by surgeon'
      ],
      nonPharmacological: [
        'Splinting abdomen when coughing',
        'Abdominal binder support',
        'Careful positioning',
        'Adequate rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Any lifting',
        restriction: 'No lifting more than a cup of water',
        duration: '6-8 weeks minimum',
        reason: 'High risk of recurrent dehiscence'
      },
      {
        activity: 'Driving',
        restriction: 'No driving',
        duration: 'Until off all strong medications and cleared by surgeon',
        reason: 'Reaction time impaired'
      },
      {
        activity: 'Straining',
        restriction: 'Avoid all straining (constipation, coughing)',
        duration: '6-8 weeks',
        reason: 'Increases abdominal pressure'
      }
    ],
    dietaryGuidelines: [
      'Clear fluids advancing slowly to regular diet',
      'High protein diet essential for wound healing',
      'High fiber to prevent constipation',
      'Plenty of fluids',
      'Nutritional supplements if recommended'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Wound secure. Beginning oral intake. Starting to mobilize.'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Wound healing. Sutures may still be in place. Gradual activity increase.'
      },
      {
        timeframe: '6-8 weeks',
        expectation: 'Sutures removed. Wound healed on surface. Internal healing ongoing.'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Returning to normal activities. Monitor for hernia.'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Full recovery possible. Hernia may develop in 30-50% of patients.'
      },
      {
        timeframe: 'Lifelong',
        expectation: 'Permanent scar. Ongoing hernia risk.'
      }
    ],
    functionalRecovery: 'Full functional recovery is possible but takes longer than uncomplicated surgery. Some patients may need hernia repair surgery later.',
    cosmeticOutcome: 'Scar will be wider and more prominent than a normally healed incision. Further surgery may be needed for hernia.',
    successRate: 'Wound repair is successful in most cases, but recurrence and hernia development are common long-term complications.'
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, ensure healing, remove staples if used'
      },
      {
        timing: '3-4 weeks',
        purpose: 'Remove all sutures, assess wound healing'
      },
      {
        timing: '6-8 weeks',
        purpose: 'Clear for increased activity'
      },
      {
        timing: '3-6 months',
        purpose: 'Check for hernia development'
      },
      {
        timing: 'Annually',
        purpose: 'Ongoing monitoring for hernia'
      }
    ],
    rehabilitationNeeds: [
      'Very gradual core strengthening after full healing',
      'Physical therapy if deconditioning',
      'Nutritional rehabilitation if malnourished'
    ],
    lifestyleModifications: [
      'Permanent weight restrictions may apply',
      'Weight loss if obese',
      'Stop smoking permanently',
      'Treat chronic cough',
      'Prevent constipation'
    ]
  },

  warningSigns: [
    'Any fluid leaking from wound',
    'Wound edges separating',
    'Increasing pain at incision',
    'Fever',
    'Redness or swelling increasing',
    'Bulge at incision site'
  ],

  emergencySigns: [
    'Organs visible through wound (EMERGENCY - do not push back)',
    'Gush of pink or brown fluid from wound',
    'Complete wound separation',
    'Signs of shock: fast heart rate, dizziness, confusion',
    'Severe abdominal pain'
  ],

  complianceRequirements: [
    {
      requirement: 'Splint abdomen when coughing',
      importance: 'critical',
      consequence: 'Coughing without support can cause recurrent dehiscence'
    },
    {
      requirement: 'Avoid all heavy lifting',
      importance: 'critical',
      consequence: 'Lifting increases abdominal pressure and can cause recurrence'
    },
    {
      requirement: 'Take stool softeners',
      importance: 'critical',
      consequence: 'Straining with bowel movements can cause wound breakdown'
    },
    {
      requirement: 'Wear abdominal binder as directed',
      importance: 'important',
      consequence: 'Binder provides wound support during healing'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of complications is essential'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Surgical Care Guidelines',
      reference: 'WHO-SC 2018',
      keyPoints: [
        'Risk factor modification before elective surgery',
        'Proper surgical technique and suture selection',
        'Nutritional optimization before major surgery',
        'Early recognition and management of complications'
      ]
    }
  ]
};

// Export wounds conditions part 3
export const woundsEducationPart3 = [chronicWounds, woundDehiscence];
