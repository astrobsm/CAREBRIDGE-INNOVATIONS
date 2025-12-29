/**
 * Patient Education Content - Category G: Vascular Conditions
 * Part 2: Varicose Veins and Deep Vein Thrombosis
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Vascular Surgery Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Varicose Veins
 */
export const varicoseVeins: EducationCondition = {
  id: 'vascular-varicose-veins',
  name: 'Varicose Veins',
  category: 'G',
  icdCode: 'I83',
  description: 'Varicose veins are enlarged, twisted veins that commonly appear in the legs. They occur when the valves in the veins malfunction, causing blood to pool and the veins to swell. While often a cosmetic concern, they can cause significant symptoms and complications.',
  alternateNames: ['Varicosities', 'Venous Insufficiency', 'Chronic Venous Disease'],
  
  overview: {
    definition: 'Varicose veins develop when the one-way valves in leg veins become weak or damaged, allowing blood to flow backward and pool in the veins. This causes the veins to enlarge and become tortuous (twisted). The great saphenous vein (inner leg) and small saphenous vein (back of calf) are most commonly affected. Chronic venous insufficiency can lead to skin changes, ulceration, and reduced quality of life.',
    causes: [
      'Valve failure (primary cause)',
      'Family history/genetic factors',
      'Prolonged standing',
      'Pregnancy',
      'Previous deep vein thrombosis (DVT)',
      'Obesity',
      'Aging',
      'Hormonal factors'
    ],
    symptoms: [
      'Visible enlarged, bulging veins',
      'Aching or heavy feeling in legs',
      'Throbbing or cramping',
      'Swelling in lower legs/ankles',
      'Itching around veins',
      'Skin discoloration (brown staining)',
      'Restless legs',
      'Symptoms worse after standing',
      'Night cramps',
      'Venous ulcers (severe cases)'
    ],
    riskFactors: [
      'Family history',
      'Female gender',
      'Multiple pregnancies',
      'Age over 50',
      'Prolonged standing occupation',
      'Obesity',
      'Previous DVT',
      'Leg injury'
    ],
    complications: [
      'Superficial thrombophlebitis (blood clot in varicose vein)',
      'Bleeding from varicose vein',
      'Skin changes (lipodermatosclerosis)',
      'Venous eczema',
      'Venous ulcers (hard to heal)',
      'DVT (rare)'
    ],
    prevalence: 'Varicose veins affect up to 30% of adults. More common in women. Prevalence increases with age.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Conservative Management',
      duration: 'Ongoing',
      description: 'Lifestyle modifications and compression therapy to manage symptoms. May be sufficient for mild disease.',
      goals: [
        'Reduce symptoms',
        'Prevent progression',
        'Avoid complications',
        'Assess need for intervention'
      ],
      activities: [
        'Compression stockings (Class 2, 20-30 mmHg)',
        'Leg elevation when resting',
        'Regular walking exercise',
        'Avoid prolonged standing',
        'Weight management',
        'Skin care'
      ],
      medications: [
        {
          name: 'Venoactive drugs (e.g., Daflon)',
          purpose: 'May improve symptoms',
          duration: 'As directed'
        }
      ],
      warningSignsThisPhase: [
        'Worsening symptoms',
        'Skin changes developing',
        'Ulcer formation',
        'Thrombophlebitis'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Procedure Assessment',
      duration: '1-2 weeks',
      description: 'Duplex ultrasound assessment to map the venous system and plan treatment.',
      goals: [
        'Map the venous anatomy',
        'Identify refluxing veins',
        'Plan treatment approach',
        'Exclude deep vein problems'
      ],
      activities: [
        'Duplex ultrasound scan',
        'Clinical assessment',
        'Discussion of treatment options',
        'Pre-procedure planning'
      ],
      warningSignsThisPhase: [
        'DVT found on scan',
        'Complex anatomy'
      ]
    },
    {
      phase: 3,
      name: 'Intervention',
      duration: 'Day procedure',
      description: 'Minimally invasive treatment to close or remove the varicose veins.',
      goals: [
        'Ablate (close) the main refluxing vein',
        'Remove visible varicosities',
        'Improve symptoms',
        'Improve appearance'
      ],
      activities: [
        'Endovenous laser ablation (EVLA) or radiofrequency ablation (RFA)',
        'Foam sclerotherapy',
        'Phlebectomy (hook avulsions)',
        'Combination treatments'
      ],
      warningSignsThisPhase: [
        'Nerve injury',
        'DVT',
        'Skin burns'
      ]
    },
    {
      phase: 4,
      name: 'Recovery and Maintenance',
      duration: '4-6 weeks',
      description: 'Post-procedure recovery with compression therapy and gradual return to normal activities.',
      goals: [
        'Complete vein closure',
        'Symptom improvement',
        'Prevent recurrence',
        'Optimize cosmetic result'
      ],
      activities: [
        'Compression stockings continuously',
        'Walking encouraged',
        'Avoid prolonged standing initially',
        'Follow-up scan'
      ],
      warningSignsThisPhase: [
        'Thrombophlebitis',
        'DVT symptoms',
        'Wound infection',
        'Recurrence'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Vascular surgeon or venous specialist',
      'Duplex ultrasound technologist'
    ],
    investigations: [
      'Duplex ultrasound of leg veins',
      'No blood tests usually required for healthy patients',
      'Basic blood tests if anticoagulation or health concerns'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'continue in most cases (discuss with doctor)',
        reason: 'Low bleeding risk from procedure'
      },
      {
        medication: 'Regular medications',
        instruction: 'continue as normal',
        reason: 'No interactions expected'
      }
    ],
    fastingInstructions: 'Light breakfast is usually fine (local anesthesia procedure)',
    dayBeforeSurgery: [
      'Normal activities',
      'Remove nail polish from toes',
      'Shave leg if requested'
    ],
    whatToBring: [
      'Loose comfortable pants or skirt',
      'Flat comfortable shoes',
      'Compression stockings (may be provided)',
      'Driver if sedation planned'
    ],
    dayOfSurgery: [
      'Light breakfast',
      'Wear loose clothing',
      'Take regular medications',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia (tumescent anesthesia along the vein)',
    procedureDescription: 'ENDOVENOUS LASER/RADIOFREQUENCY ABLATION: Under ultrasound guidance, a thin catheter is inserted into the diseased vein through a tiny puncture. Tumescent anesthesia (dilute local anesthetic) is injected around the vein. The catheter delivers laser or radiofrequency energy to heat and close the vein. The body naturally absorbs the closed vein over time. FOAM SCLEROTHERAPY: A foam agent is injected into varicose veins causing them to close. PHLEBECTOMY: Small stab incisions (2-3mm) are made over visible varicose veins and the veins are hooked out. These techniques are often combined for complete treatment.',
    duration: '45-90 minutes',
    whatToExpect: 'Walk-in, walk-out procedure. Local anesthesia only. Multiple small injections for anesthesia. Compression stocking applied immediately after.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Walk around immediately after procedure. Then rest with leg elevated.',
      expectedSymptoms: [
        'Bruising along treated vein',
        'Tightness or cord-like feeling',
        'Mild to moderate discomfort',
        'Swelling initially'
      ],
      activityLevel: 'Walk for 30 minutes immediately. Continue walking regularly. Avoid prolonged standing or sitting.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep compression stocking on continuously (day and night). Do not remove. Keep wounds dry.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Can remove stocking to shower quickly. Replace immediately. Continue day and night wear.'
      },
      {
        day: 'Weeks 1-6',
        instruction: 'Compression stocking during daytime. Small wounds should heal. Bruising fading.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10), like a deep bruise',
      medications: [
        'Paracetamol regularly',
        'Ibuprofen if not contraindicated',
        'Rarely need stronger pain relief'
      ],
      nonPharmacological: [
        'Walking helps',
        'Leg elevation when resting',
        'Compression stockings',
        'Ice pack if significant bruising'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Walking',
        restriction: 'Encouraged - walk 30 mins daily minimum',
        duration: 'Start immediately',
        reason: 'Prevents DVT, reduces symptoms'
      },
      {
        activity: 'Gym/running',
        restriction: 'Avoid high impact',
        duration: '2 weeks',
        reason: 'Allow vein closure'
      },
      {
        activity: 'Hot baths/saunas',
        restriction: 'Avoid',
        duration: '2-4 weeks',
        reason: 'Heat can cause vein to reopen'
      },
      {
        activity: 'Flying',
        restriction: 'Short flights OK, long haul discuss with doctor',
        duration: '2-4 weeks',
        reason: 'DVT prevention'
      }
    ],
    dietaryGuidelines: [
      'Normal diet',
      'Stay well hydrated',
      'Maintain healthy weight'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'Same day',
        expectation: 'Walk home, some bruising and discomfort'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Bruising settling, cord-like feeling normal'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Significant symptom improvement'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Treated vein absorbed, cosmetic improvement'
      },
      {
        timeframe: '5 years',
        expectation: 'Recurrence in 10-20%, may need touch-up'
      }
    ],
    functionalRecovery: 'Excellent. Rapid return to normal activities. Symptoms of aching, heaviness, and swelling typically improve significantly.',
    cosmeticOutcome: 'Good to excellent. Bruising resolves. Small scars from phlebectomy fade. May need additional sclerotherapy for residual veins.',
    successRate: 'Technical success >95%. Long-term closure rates 90-95% at 5 years. Recurrence possible (new veins can become varicose).',
    possibleComplications: [
      'Bruising (common, temporary)',
      'Thrombophlebitis (inflammation of treated vein)',
      'DVT (rare, <1%)',
      'Nerve injury/numbness (2-5%, usually temporary)',
      'Skin staining (hyperpigmentation)',
      'Skin burns (rare with proper technique)',
      'Recurrence'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week (phone review)',
        purpose: 'Check recovery, answer questions'
      },
      {
        timing: '6 weeks',
        purpose: 'Clinical review, assess result'
      },
      {
        timing: '6 months',
        purpose: 'Duplex scan, check for recurrence, plan additional treatment if needed'
      }
    ],
    rehabilitationNeeds: [
      'Continue regular walking',
      'Consider long-term compression for chronic venous insufficiency',
      'Weight management'
    ],
    lifestyleModifications: [
      'Avoid prolonged standing',
      'Regular exercise',
      'Elevate legs when resting',
      'Maintain healthy weight',
      'Use compression stockings during long travel or standing'
    ]
  },

  warningSigns: [
    'Increasing pain or redness',
    'Spreading redness up the leg',
    'Fever',
    'Significant swelling of whole leg',
    'Numbness that worsens',
    'Skin breakdown'
  ],

  emergencySigns: [
    'Severe calf pain with swelling (DVT)',
    'Shortness of breath (PE)',
    'Chest pain',
    'Heavy bleeding from wound',
    'Spreading infection'
  ],

  complianceRequirements: [
    {
      requirement: 'Wear compression stockings as directed',
      importance: 'critical',
      consequence: 'Compression prevents DVT and improves results'
    },
    {
      requirement: 'Walk daily',
      importance: 'critical',
      consequence: 'Walking prevents DVT and speeds recovery'
    },
    {
      requirement: 'Avoid hot baths and saunas',
      importance: 'important',
      consequence: 'Heat may prevent vein closure'
    }
  ],

  whoGuidelines: [
    {
      title: 'NICE Guidelines on Varicose Veins',
      reference: 'National Institute for Health and Care Excellence (UK) 2013',
      keyPoints: [
        'Endovenous ablation is first-line treatment',
        'Surgery (stripping) reserved for when ablation not suitable',
        'Treatment recommended for symptomatic varicose veins',
        'Compression alone is not sufficient treatment for truncal reflux',
        'Early treatment of venous ulcers improves healing'
      ]
    }
  ]
};

/**
 * Deep Vein Thrombosis (DVT)
 */
export const deepVeinThrombosis: EducationCondition = {
  id: 'vascular-dvt',
  name: 'Deep Vein Thrombosis',
  category: 'G',
  icdCode: 'I82',
  description: 'Deep vein thrombosis (DVT) is a blood clot that forms in a deep vein, usually in the leg. It can cause leg pain and swelling, and is dangerous because pieces of the clot can break off and travel to the lungs (pulmonary embolism).',
  alternateNames: ['DVT', 'Deep Venous Thrombosis', 'Leg Blood Clot', 'Venous Thromboembolism'],
  
  overview: {
    definition: 'DVT occurs when a blood clot (thrombus) forms in one or more of the deep veins of the body, most commonly in the legs. The clot partially or completely blocks blood flow, causing pain and swelling. The main danger is that the clot can dislodge and travel through the heart to the lungs, causing a pulmonary embolism (PE), which can be life-threatening. DVT and PE together are called venous thromboembolism (VTE).',
    causes: [
      'Virchow\'s triad: stasis, vessel injury, hypercoagulability',
      'Immobility (surgery, illness, travel)',
      'Surgery (especially hip/knee, cancer surgery)',
      'Trauma',
      'Cancer',
      'Inherited clotting disorders',
      'Pregnancy and postpartum',
      'Hormone therapy/contraceptives',
      'Medical illness requiring hospitalization'
    ],
    symptoms: [
      'Leg swelling (often one-sided)',
      'Leg pain or tenderness (calf most common)',
      'Warmth in affected leg',
      'Redness or discoloration',
      'Visible surface veins',
      'Pain worse with standing or walking',
      'Some DVTs are asymptomatic',
      'PE symptoms: sudden shortness of breath, chest pain, coughing blood'
    ],
    riskFactors: [
      'Recent surgery (especially orthopedic)',
      'Prolonged immobility',
      'Active cancer',
      'Previous VTE',
      'Obesity',
      'Older age',
      'Pregnancy/postpartum',
      'Hormonal contraceptives or HRT',
      'Inherited thrombophilia',
      'Central venous catheters',
      'Long-haul travel (>4 hours)'
    ],
    complications: [
      'Pulmonary embolism (PE) - potentially fatal',
      'Post-thrombotic syndrome (chronic leg swelling and pain)',
      'Chronic venous insufficiency',
      'Venous ulcers',
      'Recurrent DVT'
    ],
    prevalence: 'VTE affects 1-2 per 1,000 people annually. Risk increases with age. 30% of untreated proximal DVTs cause PE.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Acute Treatment',
      duration: '5-14 days',
      description: 'Immediate anticoagulation to prevent clot extension and PE. Most DVTs are treated at home.',
      goals: [
        'Prevent clot extension',
        'Prevent pulmonary embolism',
        'Relieve symptoms',
        'Initiate anticoagulation'
      ],
      activities: [
        'Diagnosis confirmation (ultrasound)',
        'Initiate anticoagulation',
        'Pain relief',
        'Compression therapy',
        'Early mobilization'
      ],
      medications: [
        {
          name: 'Direct oral anticoagulants (DOACs)',
          purpose: 'Blood thinning - rivaroxaban, apixaban (most common)',
          duration: 'Minimum 3 months'
        },
        {
          name: 'Low molecular weight heparin (LMWH)',
          purpose: 'Initial anticoagulation (some protocols)',
          duration: '5-10 days then switch to oral'
        },
        {
          name: 'Warfarin',
          purpose: 'Alternative oral anticoagulation',
          duration: 'Minimum 3 months'
        }
      ],
      warningSignsThisPhase: [
        'Shortness of breath (PE)',
        'Chest pain',
        'Worsening leg swelling',
        'Major bleeding'
      ]
    },
    {
      phase: 2,
      name: 'Continued Anticoagulation',
      duration: '3-6 months minimum',
      description: 'Ongoing blood-thinning treatment to allow the body to dissolve the clot and prevent recurrence.',
      goals: [
        'Allow clot resolution',
        'Prevent recurrence',
        'Manage symptoms',
        'Monitor for complications'
      ],
      activities: [
        'Daily anticoagulant medication',
        'Compression stockings',
        'Regular activity',
        'INR monitoring if on warfarin',
        'Avoid activities with bleeding risk'
      ],
      warningSignsThisPhase: [
        'Bleeding signs',
        'Recurrent swelling or pain',
        'PE symptoms'
      ]
    },
    {
      phase: 3,
      name: 'Assessment for Extended Treatment',
      duration: 'At 3-6 months',
      description: 'Decision about ongoing anticoagulation based on risk factors for recurrence versus bleeding.',
      goals: [
        'Assess recurrence risk',
        'Assess bleeding risk',
        'Make informed decision about duration',
        'Review ongoing symptoms'
      ],
      activities: [
        'Clinical review',
        'Repeat ultrasound if symptoms persist',
        'Thrombophilia testing in selected patients',
        'D-dimer testing (may guide)',
        'Shared decision-making about duration'
      ],
      warningSignsThisPhase: [
        'Ongoing symptoms suggesting non-resolved clot',
        'Signs of post-thrombotic syndrome'
      ]
    },
    {
      phase: 4,
      name: 'Long-Term Management',
      duration: 'Extended/Lifelong for some',
      description: 'Ongoing management which may include extended anticoagulation for high-risk patients, and management of post-thrombotic syndrome.',
      goals: [
        'Prevent recurrence',
        'Manage post-thrombotic syndrome',
        'Prevent VTE in high-risk situations'
      ],
      activities: [
        'Compression stockings for post-thrombotic syndrome',
        'Extended anticoagulation (unprovoked DVT, recurrent VTE, thrombophilia)',
        'Prevention during high-risk situations (surgery, travel)',
        'Annual review if on long-term anticoagulation'
      ],
      warningSignsThisPhase: [
        'Recurrent symptoms',
        'Bleeding complications'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Hematologist or vascular specialist',
      'Primary care physician',
      'Anticoagulation clinic'
    ],
    investigations: [
      'Compression duplex ultrasound of leg veins',
      'D-dimer blood test (if DVT uncertain)',
      'CT pulmonary angiogram (if PE suspected)',
      'Blood tests: FBC, kidney function, liver function, coagulation',
      'Thrombophilia screen (selected patients, after acute treatment)'
    ],
    medications: [
      {
        medication: 'Anticoagulant',
        instruction: 'start immediately once diagnosed',
        reason: 'Prevents clot extension and PE'
      }
    ],
    fastingInstructions: 'No fasting required for medical treatment. If intervention needed, specific instructions provided.',
    dayBeforeSurgery: [
      'Most DVTs treated at home with medications',
      'Hospital admission for high-risk cases',
      'Interventions (thrombolysis, filter) rare'
    ],
    whatToBring: [
      'Medication list',
      'Comfortable loose clothing',
      'Compression stockings if already issued'
    ],
    dayOfSurgery: [
      'Take anticoagulant medication as directed',
      'Wear compression stockings',
      'Stay mobile'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Most DVT is treated medically (no surgery). Interventions rare.',
    procedureDescription: 'MEDICAL TREATMENT (majority of cases): Anticoagulation with DOACs or LMWH/warfarin. Compression stockings. Early mobilization. This is outpatient treatment. CATHETER-DIRECTED THROMBOLYSIS (rare, selected cases): For extensive iliofemoral DVT in young patients with severe symptoms and low bleeding risk. A catheter is inserted into the clot and clot-dissolving medication infused directly. Reduces risk of post-thrombotic syndrome but carries bleeding risk. IVC FILTER (rare): A filter placed in the inferior vena cava to catch clots if anticoagulation is contraindicated. Usually temporary.',
    duration: 'Medical: Outpatient treatment. Thrombolysis: 24-72 hour infusion. Filter placement: 30-60 minutes.',
    whatToExpect: 'Most patients go home with anticoagulation tablets. Hospital admission only for severe DVT, high PE risk, or need for intervention.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate leg when sitting. Do not stay still for long periods.',
      expectedSymptoms: [
        'Leg swelling may take days to weeks to improve',
        'Leg pain improving gradually',
        'May have residual swelling long-term',
        'Bruising from blood thinners normal'
      ],
      activityLevel: 'Walk regularly. Avoid prolonged sitting or standing. Stay active.'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'No wounds from medical treatment. If intervention: keep puncture site clean.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate initially, improving over days',
      medications: [
        'Paracetamol for pain',
        'Avoid NSAIDs (increase bleeding risk with anticoagulants)',
        'Leg elevation helps'
      ],
      nonPharmacological: [
        'Leg elevation',
        'Compression stockings',
        'Walking',
        'Gentle calf exercises'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Walking',
        restriction: 'Encouraged - walk regularly',
        duration: 'Immediately',
        reason: 'Prevents clot extension, improves symptoms'
      },
      {
        activity: 'Contact sports',
        restriction: 'Avoid',
        duration: 'While on anticoagulation',
        reason: 'Bleeding risk'
      },
      {
        activity: 'Alcohol',
        restriction: 'Limit',
        duration: 'While on anticoagulation',
        reason: 'Increases bleeding risk'
      },
      {
        activity: 'Air travel',
        restriction: 'OK with precautions after acute phase',
        duration: 'Wear stockings, move regularly, stay hydrated',
        reason: 'Prevent recurrence'
      }
    ],
    dietaryGuidelines: [
      'Normal diet',
      'If on warfarin: consistent vitamin K intake (green vegetables)',
      'Stay well hydrated',
      'Limit alcohol'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Leg pain improving, swelling starting to reduce'
      },
      {
        timeframe: '1-3 months',
        expectation: 'Most symptoms resolved, clot organizing'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Clot resolved or residual clot. May have post-thrombotic changes.'
      },
      {
        timeframe: 'Long-term',
        expectation: '30-50% develop some post-thrombotic syndrome'
      }
    ],
    functionalRecovery: 'Most patients return to normal activities. Some have residual swelling or discomfort. Post-thrombotic syndrome affects 30-50% with varying severity.',
    cosmeticOutcome: 'May have residual swelling, skin discoloration, or visible veins if post-thrombotic syndrome develops.',
    successRate: 'Anticoagulation prevents PE and clot extension in 95%+. Recurrence: 5-10% if provoked (temporary risk factor), 30% if unprovoked (no known cause) over 5 years without extended anticoagulation.',
    possibleComplications: [
      'Pulmonary embolism (can be fatal)',
      'Post-thrombotic syndrome (30-50%)',
      'Recurrent DVT',
      'Bleeding from anticoagulation',
      'Chronic venous insufficiency',
      'Venous ulcers'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Check symptoms improving, medication tolerance'
      },
      {
        timing: '1 month',
        purpose: 'Review symptoms, check for bleeding, confirm compliance'
      },
      {
        timing: '3 months',
        purpose: 'Decide on anticoagulation duration, repeat ultrasound if indicated'
      },
      {
        timing: '6 months and annually',
        purpose: 'If on extended anticoagulation: review risk/benefit'
      }
    ],
    rehabilitationNeeds: [
      'Compression stockings (minimum 2 years for post-thrombotic syndrome prevention)',
      'Regular walking exercise',
      'Leg elevation when possible'
    ],
    lifestyleModifications: [
      'Stay active - avoid prolonged immobility',
      'Maintain healthy weight',
      'Stay hydrated',
      'Wear compression stockings for long travel',
      'Inform doctors of DVT history before any surgery',
      'Consider prevention for high-risk situations'
    ]
  },

  warningSigns: [
    'Worsening leg swelling or pain',
    'New swelling in other leg',
    'Signs of bleeding: blood in urine, black stool, excessive bruising',
    'Persistent symptoms after weeks of treatment',
    'Signs of skin breakdown'
  ],

  emergencySigns: [
    'Sudden shortness of breath',
    'Chest pain (especially with breathing)',
    'Coughing up blood',
    'Rapid heart rate with faintness',
    'Severe headache with anticoagulation (intracranial bleed)',
    'Major bleeding'
  ],

  complianceRequirements: [
    {
      requirement: 'Take anticoagulation medication daily',
      importance: 'critical',
      consequence: 'Missing doses increases risk of PE and clot extension'
    },
    {
      requirement: 'Do not stop anticoagulation without medical advice',
      importance: 'critical',
      consequence: 'Stopping early dramatically increases recurrence risk'
    },
    {
      requirement: 'Report any bleeding immediately',
      importance: 'critical',
      consequence: 'Bleeding can be life-threatening on anticoagulation'
    },
    {
      requirement: 'Wear compression stockings as directed',
      importance: 'important',
      consequence: 'Reduces post-thrombotic syndrome'
    }
  ],

  whoGuidelines: [
    {
      title: 'ASH/NICE Guidelines on VTE Treatment',
      reference: 'American Society of Hematology / NICE 2020',
      keyPoints: [
        'DOACs are preferred over warfarin for most patients',
        'Minimum 3 months anticoagulation for all DVT',
        'Extended anticoagulation for unprovoked DVT if bleeding risk acceptable',
        'Compression stockings for post-thrombotic syndrome symptoms',
        'Early mobilization is safe and recommended'
      ]
    }
  ]
};

// Export vascular conditions part 2
export const vascularConditionsPart2 = [varicoseVeins, deepVeinThrombosis];
