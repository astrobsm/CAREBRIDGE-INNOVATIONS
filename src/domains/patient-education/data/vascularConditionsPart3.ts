/**
 * Patient Education Content - Category G: Vascular Conditions
 * Part 3: Carotid Artery Disease and Arteriovenous Fistula
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Vascular Surgery Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Carotid Artery Disease
 */
export const carotidArteryDisease: EducationCondition = {
  id: 'vascular-carotid-disease',
  name: 'Carotid Artery Disease',
  category: 'G',
  icdCode: 'I65.2',
  description: 'Carotid artery disease occurs when fatty deposits (plaques) narrow the carotid arteries in the neck, reducing blood flow to the brain. It is a major cause of stroke and can be treated to prevent future strokes.',
  alternateNames: ['Carotid Stenosis', 'Carotid Artery Stenosis', 'Atherosclerosis of Carotid Artery'],
  
  overview: {
    definition: 'The carotid arteries are two major blood vessels in the neck that supply blood to the brain. Carotid artery disease develops when these arteries become narrowed or blocked by atherosclerotic plaque (fatty deposits). When plaque breaks off or significantly reduces blood flow, it can cause a stroke or transient ischemic attack (TIA, or "mini-stroke"). Carotid disease accounts for 10-20% of all strokes and is often treatable to prevent stroke.',
    causes: [
      'Atherosclerosis (hardening of arteries)',
      'High cholesterol',
      'High blood pressure',
      'Diabetes',
      'Smoking',
      'Obesity',
      'Physical inactivity',
      'Family history'
    ],
    symptoms: [
      'Often no symptoms until stroke or TIA',
      'TIA: temporary weakness, numbness, or paralysis (face, arm, leg)',
      'TIA: sudden difficulty speaking or understanding',
      'TIA: sudden vision loss in one eye (amaurosis fugax)',
      'TIA: sudden severe headache',
      'TIA: loss of balance or coordination',
      'Bruit (whooshing sound heard with stethoscope)'
    ],
    riskFactors: [
      'Age over 65',
      'Smoking',
      'High blood pressure',
      'Diabetes',
      'High cholesterol',
      'Coronary artery disease',
      'Peripheral arterial disease',
      'Family history of stroke or heart disease',
      'Obesity',
      'Physical inactivity'
    ],
    complications: [
      'Ischemic stroke (brain damage)',
      'TIA (transient ischemic attack)',
      'Death from stroke',
      'Permanent disability (paralysis, speech difficulties)',
      'Cognitive impairment'
    ],
    prevalence: 'Moderate to severe carotid stenosis affects 5-10% of adults over 65. Carotid disease causes 10-20% of all strokes.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Risk Assessment',
      duration: '1-2 weeks',
      description: 'Identification of carotid disease and assessment of severity and stroke risk.',
      goals: [
        'Confirm diagnosis and severity',
        'Assess symptomatic vs asymptomatic',
        'Optimize medical risk factors',
        'Determine need for intervention'
      ],
      activities: [
        'Carotid duplex ultrasound',
        'CT angiography or MR angiography',
        'Cardiovascular risk assessment',
        'Blood pressure monitoring',
        'Cholesterol and diabetes testing'
      ],
      medications: [
        {
          name: 'Antiplatelet (aspirin/clopidogrel)',
          purpose: 'Reduce stroke risk',
          duration: 'Lifelong'
        },
        {
          name: 'Statin',
          purpose: 'Lower cholesterol, stabilize plaque',
          duration: 'Lifelong'
        },
        {
          name: 'Antihypertensive',
          purpose: 'Control blood pressure',
          duration: 'Lifelong'
        }
      ],
      warningSignsThisPhase: [
        'New TIA or stroke symptoms',
        'Vision changes',
        'Speech difficulties'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Procedure Preparation',
      duration: '1-4 weeks',
      description: 'For patients requiring intervention (symptomatic >50% stenosis or asymptomatic >70% stenosis).',
      goals: [
        'Optimize medical condition',
        'Complete pre-operative testing',
        'Informed consent',
        'Arrange surgery within 2 weeks of TIA (if symptomatic)'
      ],
      activities: [
        'Cardiac assessment',
        'Blood tests',
        'Brain imaging',
        'Anesthesia assessment',
        'Medication review'
      ],
      warningSignsThisPhase: [
        'TIA or stroke while waiting',
        'Chest pain'
      ]
    },
    {
      phase: 3,
      name: 'Intervention',
      duration: '1-2 days (hospital stay)',
      description: 'Carotid endarterectomy (CEA) or carotid artery stenting (CAS) to remove or bypass the blockage.',
      goals: [
        'Remove or reduce stenosis',
        'Restore blood flow',
        'Prevent stroke',
        'Monitor for complications'
      ],
      activities: [
        'Carotid endarterectomy (gold standard)',
        'Or carotid artery stenting',
        'Close monitoring in hospital',
        'Blood pressure control'
      ],
      warningSignsThisPhase: [
        'Stroke during or after procedure',
        'Neck swelling (hematoma)',
        'Difficulty breathing',
        'Hyperperfusion syndrome'
      ]
    },
    {
      phase: 4,
      name: 'Recovery and Secondary Prevention',
      duration: 'Lifelong',
      description: 'Recovery from intervention and lifelong medical treatment to prevent further cardiovascular events.',
      goals: [
        'Complete surgical healing',
        'Optimize risk factor control',
        'Prevent stroke and heart disease',
        'Surveillance for restenosis'
      ],
      activities: [
        'Wound care',
        'Dual antiplatelet for 1-3 months post-stent',
        'Lifelong single antiplatelet and statin',
        'Lifestyle modification',
        'Regular duplex ultrasound surveillance'
      ],
      medications: [
        {
          name: 'Aspirin',
          purpose: 'Prevent stroke and heart attack',
          duration: 'Lifelong'
        },
        {
          name: 'Statin',
          purpose: 'Cholesterol control, plaque stabilization',
          duration: 'Lifelong'
        }
      ],
      warningSignsThisPhase: [
        'New neurological symptoms',
        'Recurrent TIA',
        'Wound infection',
        'Restenosis on surveillance'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Vascular surgeon',
      'Neurologist',
      'Cardiologist (if heart disease)',
      'Anesthetist'
    ],
    investigations: [
      'Carotid duplex ultrasound',
      'CT angiography or MR angiography',
      'Brain CT or MRI',
      'ECG and echocardiogram',
      'Blood tests: FBC, U&E, clotting, group & save'
    ],
    medications: [
      {
        medication: 'Aspirin',
        instruction: 'continue',
        reason: 'Reduces perioperative stroke risk'
      },
      {
        medication: 'Statin',
        instruction: 'continue',
        reason: 'Cardiovascular protection'
      },
      {
        medication: 'Blood pressure medications',
        instruction: 'continue or as directed',
        reason: 'BP control critical'
      },
      {
        medication: 'Diabetes medications',
        instruction: 'as directed by diabetes team',
        reason: 'Glucose control important'
      }
    ],
    fastingInstructions: 'No food for 6 hours before surgery. Clear fluids may be allowed up to 2 hours prior.',
    dayBeforeSurgery: [
      'Confirm fasting times',
      'Take regular medications as instructed',
      'Shower/bathe',
      'Get good night\'s rest',
      'Do not smoke'
    ],
    whatToBring: [
      'All current medications',
      'Photo ID',
      'Comfortable loose clothing',
      'Toiletries for overnight stay',
      'Contact information for family'
    ],
    dayOfSurgery: [
      'Remain fasted',
      'Take morning medications with sip of water as directed',
      'Arrive at designated time',
      'Blood pressure will be closely monitored'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia (most common) or regional (local anesthesia with sedation)',
    procedureDescription: 'CAROTID ENDARTERECTOMY (CEA): An incision is made along the side of the neck over the carotid artery. The artery is clamped (blood flow is temporarily stopped). The artery is opened, and the atherosclerotic plaque is carefully removed (endarterectomy). The artery is closed, often with a patch to widen it. Blood flow is restored. The incision is closed. The procedure takes 1-2 hours. CAROTID ARTERY STENTING (CAS): Under local anesthesia, a catheter is inserted through the groin into the carotid artery. A stent (mesh tube) is placed across the narrowing to hold the artery open. An embolic protection device is used to catch any debris. Used when surgery is higher risk or for certain anatomies.',
    duration: 'CEA: 1-2 hours. CAS: 1-2 hours.',
    whatToExpect: 'General anesthesia for CEA (awake surgery sometimes used). Close blood pressure monitoring. Wake-up neurological check. Overnight stay typical.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Head elevated. Bed rest initially with close monitoring.',
      expectedSymptoms: [
        'Neck pain and swelling',
        'Bruising around incision',
        'Difficulty swallowing initially',
        'Numbness around ear/jaw (temporary)',
        'Headache'
      ],
      activityLevel: 'Bed rest initially, then mobilize slowly. Blood pressure closely controlled.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep wound dry. Observe for swelling, bleeding, or signs of infection.'
      },
      {
        day: 'Days 3-7',
        instruction: 'May shower carefully. Pat wound dry. Watch for increasing swelling.'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Wound healing. Sutures/staples removed at 7-10 days.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10)',
      medications: [
        'Paracetamol regularly',
        'Codeine if needed',
        'Avoid NSAIDs (bleeding risk)'
      ],
      nonPharmacological: [
        'Ice pack to neck (protect skin)',
        'Soft pillow support',
        'Relaxation'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Driving',
        restriction: 'Do not drive',
        duration: '1-2 weeks minimum, discuss with surgeon',
        reason: 'Safety, neck movement, medication effects'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Strain, blood pressure spikes'
      },
      {
        activity: 'Work',
        restriction: 'Light work after 1-2 weeks, physical work after 4-6 weeks',
        duration: 'As tolerated',
        reason: 'Recovery time'
      },
      {
        activity: 'Neck movements',
        restriction: 'Avoid extreme movements',
        duration: '2-4 weeks',
        reason: 'Allow healing'
      }
    ],
    dietaryGuidelines: [
      'Soft diet initially if swallowing difficulty',
      'Heart-healthy diet (low saturated fat, low salt)',
      'High fiber',
      'Moderate alcohol only',
      'No smoking'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 days',
        expectation: 'Home discharge, wound healing begins'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Pain resolved, wound healed, back to light activities'
      }
    ],
    longTerm: [
      {
        timeframe: '30 days',
        expectation: 'Full recovery, back to normal activities'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Significantly reduced stroke risk, lifelong medical management'
      }
    ],
    functionalRecovery: 'Excellent. Most patients return to full activities within 2-4 weeks. No physical limitations expected long-term.',
    cosmeticOutcome: 'Small scar along side of neck. Fades over time.',
    successRate: 'CEA reduces stroke risk by 50-70% in symptomatic patients. Perioperative stroke risk 1-3% in experienced hands. Long-term patency >90%.',
    possibleComplications: [
      'Perioperative stroke (1-3%)',
      'Cranial nerve injury (hoarseness, swallowing, tongue weakness - usually temporary)',
      'Wound hematoma',
      'Hyperperfusion syndrome (headache, seizures - rare)',
      'Heart attack',
      'Wound infection',
      'Restenosis (5-10% at 5 years)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, neurological assessment'
      },
      {
        timing: '6 weeks',
        purpose: 'Full recovery check, confirm medications'
      },
      {
        timing: '6 months, then annually',
        purpose: 'Duplex ultrasound surveillance, cardiovascular review'
      }
    ],
    rehabilitationNeeds: [
      'Cardiac rehabilitation if heart disease',
      'Stroke rehabilitation if perioperative stroke',
      'Lifestyle modification support'
    ],
    lifestyleModifications: [
      'STOP SMOKING - most important',
      'Heart-healthy diet',
      'Regular exercise',
      'Blood pressure control',
      'Cholesterol control',
      'Diabetes control',
      'Healthy weight',
      'Limit alcohol'
    ]
  },

  warningSigns: [
    'Increasing neck swelling',
    'Difficulty swallowing or breathing',
    'Wound bleeding or oozing',
    'Fever',
    'Severe headache',
    'Voice changes'
  ],

  emergencySigns: [
    'Sudden weakness or numbness (face, arm, leg)',
    'Sudden difficulty speaking or understanding',
    'Sudden vision loss',
    'Sudden severe headache',
    'Rapid neck swelling with difficulty breathing',
    'Loss of consciousness'
  ],

  complianceRequirements: [
    {
      requirement: 'Take antiplatelet medication (aspirin) lifelong',
      importance: 'critical',
      consequence: 'Stopping increases stroke and heart attack risk'
    },
    {
      requirement: 'Take statin medication lifelong',
      importance: 'critical',
      consequence: 'Reduces cardiovascular events'
    },
    {
      requirement: 'STOP SMOKING completely',
      importance: 'critical',
      consequence: 'Smoking is major cause, doubles risk of stroke and death'
    },
    {
      requirement: 'Control blood pressure',
      importance: 'critical',
      consequence: 'High BP accelerates disease and causes strokes'
    }
  ],

  whoGuidelines: [
    {
      title: 'ESVS Guidelines on Carotid Disease',
      reference: 'European Society for Vascular Surgery 2023',
      keyPoints: [
        'CEA remains gold standard for symptomatic carotid stenosis >50%',
        'CEA may be considered for asymptomatic stenosis >60% if perioperative risk <3%',
        'Surgery should be performed within 14 days of TIA/stroke',
        'Best medical therapy is essential for all patients',
        'CAS is alternative in high surgical risk patients'
      ]
    }
  ]
};

/**
 * Arteriovenous Fistula (for Hemodialysis)
 */
export const arteriovenousFistula: EducationCondition = {
  id: 'vascular-av-fistula',
  name: 'Arteriovenous Fistula for Dialysis',
  category: 'G',
  icdCode: 'Z99.2',
  description: 'An arteriovenous (AV) fistula is a surgically created connection between an artery and vein, typically in the arm, to provide access for hemodialysis in patients with kidney failure. It is considered the best type of dialysis access.',
  alternateNames: ['AVF', 'AV Fistula', 'Dialysis Fistula', 'Hemodialysis Access', 'Radiocephalic Fistula', 'Brachiocephalic Fistula'],
  
  overview: {
    definition: 'An arteriovenous fistula (AVF) is a connection between an artery and a vein created surgically to allow needles to access the bloodstream for hemodialysis. The increased blood flow from the artery causes the vein to enlarge and strengthen (mature), making it suitable for repeated puncture during dialysis sessions. The fistula is usually created in the non-dominant arm, either at the wrist (radiocephalic/Brescia-Cimino fistula) or elbow (brachiocephalic fistula). It is the preferred form of dialysis access due to lower complication rates compared to grafts or catheters.',
    causes: [
      'Chronic kidney disease requiring dialysis',
      'End-stage renal disease (ESRD)',
      'Preparation for dialysis before kidney function fails completely'
    ],
    symptoms: [
      'AV fistula itself does not cause symptoms of disease',
      'After creation: palpable thrill (vibration) over fistula',
      'Visible enlarged vein in arm',
      'Audible bruit (whooshing sound)',
      'Mild arm swelling initially'
    ],
    riskFactors: [
      'Diabetes (affects blood vessels)',
      'Peripheral vascular disease',
      'Previous IV drug use',
      'Multiple previous blood draws or IVs in arm',
      'Small veins',
      'Obesity',
      'Advanced age',
      'Female gender (smaller vessels)'
    ],
    complications: [
      'Failure to mature (does not develop adequately)',
      'Stenosis (narrowing)',
      'Thrombosis (clotting)',
      'Aneurysm formation',
      'Infection',
      'Steal syndrome (reduced blood flow to hand)',
      'High-output cardiac failure (rare, large fistulas)'
    ],
    prevalence: 'AV fistulas are the recommended access for hemodialysis patients worldwide. Primary failure rates 20-50%. Once mature, primary patency 60-70% at 1 year.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Operative Planning',
      duration: '2-4 weeks',
      description: 'Assessment of blood vessels and planning of optimal fistula site. Ideally performed 6 months before dialysis is needed.',
      goals: [
        'Map veins and arteries',
        'Identify optimal site for fistula',
        'Preserve arm veins',
        'Plan timing (6 months before dialysis ideally)'
      ],
      activities: [
        'Vascular assessment',
        'Duplex ultrasound of arm veins and arteries',
        'Fistula planning',
        'Vein preservation education'
      ],
      warningSignsThisPhase: [
        'Rapid decline in kidney function requiring urgent dialysis',
        'No suitable veins'
      ]
    },
    {
      phase: 2,
      name: 'Fistula Creation Surgery',
      duration: 'Day surgery',
      description: 'Surgical creation of the arteriovenous fistula under local or regional anesthesia.',
      goals: [
        'Create functional fistula',
        'Minimize complications',
        'Preserve future access sites'
      ],
      activities: [
        'Surgical procedure',
        'Immediate assessment of fistula function',
        'Wound care education'
      ],
      warningSignsThisPhase: [
        'No thrill felt after surgery',
        'Excessive bleeding',
        'Severe hand pain (steal)'
      ]
    },
    {
      phase: 3,
      name: 'Maturation Period',
      duration: '6-12 weeks',
      description: 'The fistula needs time to mature - the vein enlarges and strengthens to allow dialysis access.',
      goals: [
        'Allow fistula to mature',
        'Monitor for complications',
        'Develop fistula exercises',
        'Protect the fistula arm'
      ],
      activities: [
        'Fistula exercises (squeezing ball)',
        'Monitoring thrill and bruit',
        'Protecting fistula arm',
        'Follow-up assessment'
      ],
      medications: [
        {
          name: 'Aspirin',
          purpose: 'May improve patency',
          duration: 'Ongoing'
        }
      ],
      warningSignsThisPhase: [
        'Loss of thrill (thrombosis)',
        'Swelling of arm or hand',
        'Hand pain or coldness',
        'Failure to mature'
      ]
    },
    {
      phase: 4,
      name: 'Dialysis and Long-Term Care',
      duration: 'Lifelong (while on dialysis)',
      description: 'The mature fistula is used for dialysis access. Ongoing care is essential for longevity.',
      goals: [
        'Successful dialysis access',
        'Prevent complications',
        'Maximize fistula lifespan',
        'Preserve other access sites'
      ],
      activities: [
        'Dialysis sessions (typically 3x per week)',
        'Daily fistula checks',
        'Proper cannulation technique',
        'Monitoring for complications'
      ],
      warningSignsThisPhase: [
        'Loss of thrill or bruit',
        'Increasing difficulty with dialysis',
        'Aneurysm formation',
        'Signs of infection'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Vascular surgeon',
      'Nephrologist (kidney doctor)',
      'Dialysis team'
    ],
    investigations: [
      'Duplex ultrasound of arm veins and arteries',
      'Blood tests: FBC, U&E, clotting',
      'ECG if cardiac history'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'as directed by surgeon',
        reason: 'May need to stop briefly or continue'
      },
      {
        medication: 'Diabetes medications',
        instruction: 'as directed',
        reason: 'May need adjustment'
      }
    ],
    fastingInstructions: 'May be light fasting or normal eating depending on anesthesia type. Follow specific instructions.',
    dayBeforeSurgery: [
      'Do not have blood tests or IV in the arm planned for fistula',
      'Wash arm thoroughly',
      'Get good rest'
    ],
    whatToBring: [
      'Loose short-sleeved top',
      'All current medications',
      'Snack and drink for after',
      'Driver to take home'
    ],
    dayOfSurgery: [
      'Follow fasting instructions if given',
      'Take medications as directed',
      'Arrive on time',
      'Wear loose short-sleeved clothing'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia (most common) or regional nerve block. General anesthesia rarely needed.',
    procedureDescription: 'The surgeon makes an incision in the arm (wrist or elbow area, depending on planned fistula type). The selected artery and vein are identified and exposed. The vein is connected to the artery, creating the fistula. Blood now flows from the artery into the vein. A thrill (vibration) should be felt immediately over the connection. The wound is closed with sutures. For RADIOCEPHALIC (wrist) fistula: the radial artery is connected to the cephalic vein at the wrist. For BRACHIOCEPHALIC (elbow) fistula: the brachial artery is connected to the cephalic vein near the elbow. Elbow fistulas have higher flow but wrist fistulas preserve options for future access.',
    duration: '1-2 hours',
    whatToExpect: 'Local anesthesia injection. You will be awake during surgery. Mild pressure and pulling sensations. Surgeon will check the fistula is working before closing.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep arm elevated. Fingers should be warm and able to move.',
      expectedSymptoms: [
        'Wound pain (mild)',
        'Bruising around wound',
        'Mild swelling',
        'Palpable thrill (vibration) over fistula',
        'Audible bruit'
      ],
      activityLevel: 'Can mobilize immediately. Avoid heavy use of fistula arm.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep wound dry and clean. Observe for bleeding or swelling.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Can shower, keep wound clean. Do not submerge in bath.'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Wound healing. Sutures may be removed or dissolve.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild (2-4/10)',
      medications: [
        'Paracetamol as needed',
        'Rarely need stronger pain relief'
      ],
      nonPharmacological: [
        'Arm elevation',
        'Ice pack if needed (avoid over fistula)'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Fistula arm',
        restriction: 'No blood pressure, blood draws, or IV on this arm EVER',
        duration: 'Lifelong',
        reason: 'Protects fistula'
      },
      {
        activity: 'Heavy lifting with fistula arm',
        restriction: 'Avoid',
        duration: '2-4 weeks initially',
        reason: 'Allow healing'
      },
      {
        activity: 'Wearing tight sleeves or jewelry on arm',
        restriction: 'Avoid',
        duration: 'Lifelong',
        reason: 'Can compress and damage fistula'
      },
      {
        activity: 'Fistula exercises',
        restriction: 'Start after 1-2 weeks',
        duration: 'During maturation',
        reason: 'Helps fistula develop'
      }
    ],
    dietaryGuidelines: [
      'Follow kidney diet as advised by dietitian',
      'Adequate protein for healing',
      'Fluid restriction as per renal team'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 days',
        expectation: 'Home same day, thrill felt in fistula'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Wound healed, begin fistula exercises'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 weeks',
        expectation: 'Fistula mature enough for dialysis'
      },
      {
        timeframe: 'Years',
        expectation: 'Can last many years with good care'
      }
    ],
    functionalRecovery: 'Excellent. No significant arm function limitation. Fistula allows effective dialysis.',
    cosmeticOutcome: 'Visible enlarged vein in arm. Scar from incision.',
    successRate: 'Primary maturation success 50-80% (higher with good pre-operative assessment). Once mature, can last 5-10+ years. Best long-term outcomes of any dialysis access.',
    possibleComplications: [
      'Failure to mature (20-50%)',
      'Thrombosis (clotting)',
      'Stenosis (narrowing)',
      'Aneurysm/pseudoaneurysm',
      'Infection',
      'Steal syndrome (hand ischemia)',
      'High-output cardiac failure (rare)',
      'Neuropathy'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Wound check, assess thrill'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Assess maturation progress'
      },
      {
        timing: '6-12 weeks',
        purpose: 'Determine if ready for dialysis, ultrasound if needed'
      },
      {
        timing: 'Ongoing with dialysis',
        purpose: 'Monitor at each dialysis session'
      }
    ],
    rehabilitationNeeds: [
      'Fistula exercises during maturation',
      'Education on fistula care',
      'Dialysis access education'
    ],
    lifestyleModifications: [
      'Protect fistula arm from injury',
      'No blood tests, BP, or IV on fistula arm',
      'No tight clothing, jewelry, or watches on arm',
      'Sleep positioning to avoid lying on fistula arm',
      'Check thrill daily',
      'Keep arm clean for dialysis'
    ]
  },

  warningSigns: [
    'Loss of thrill (vibration) in fistula',
    'Loss of bruit (sound) in fistula',
    'Pain in fistula',
    'Swelling of arm or hand',
    'Redness or warmth over fistula (infection)',
    'Bleeding from cannulation sites'
  ],

  emergencySigns: [
    'Sudden loss of thrill (fistula clotted) - URGENT',
    'Severe bleeding from fistula - apply pressure, call emergency',
    'Signs of severe infection: fever, spreading redness, pus',
    'Hand turning cold, blue, or very painful (severe steal)',
    'Chest pain or shortness of breath (cardiac)'
  ],

  complianceRequirements: [
    {
      requirement: 'Never allow blood draws, BP, or IV on fistula arm',
      importance: 'critical',
      consequence: 'Can damage fistula'
    },
    {
      requirement: 'Check thrill every day',
      importance: 'critical',
      consequence: 'Early detection of clotting allows salvage'
    },
    {
      requirement: 'Perform fistula exercises during maturation',
      importance: 'important',
      consequence: 'Helps fistula mature successfully'
    },
    {
      requirement: 'Attend all dialysis sessions',
      importance: 'critical',
      consequence: 'Missing dialysis is life-threatening'
    }
  ],

  whoGuidelines: [
    {
      title: 'KDOQI Vascular Access Guidelines',
      reference: 'Kidney Disease Outcomes Quality Initiative 2019',
      keyPoints: [
        'AV fistula is preferred access (fistula first)',
        'Plan access when GFR <30 (Stage 4 CKD)',
        'Create fistula 6 months before anticipated dialysis',
        'Preserve arm veins in all CKD patients',
        'Radiocephalic fistula preferred if suitable vessels'
      ]
    }
  ]
};

// Export vascular conditions part 3
export const vascularConditionsPart3 = [carotidArteryDisease, arteriovenousFistula];
