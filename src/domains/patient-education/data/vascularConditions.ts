/**
 * Patient Education Content - Category G: Vascular Conditions
 * Part 1: Peripheral Arterial Disease and Abdominal Aortic Aneurysm
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Vascular Surgery Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Peripheral Arterial Disease (PAD)
 */
export const peripheralArterialDisease: EducationCondition = {
  id: 'vascular-pad',
  name: 'Peripheral Arterial Disease',
  category: 'G',
  icdCode: 'I73.9',
  description: 'Peripheral arterial disease (PAD) is a condition where narrowed arteries reduce blood flow to the limbs, most commonly the legs. It is caused by atherosclerosis (hardening of the arteries) and can lead to pain, poor wound healing, and in severe cases, limb loss.',
  alternateNames: ['Peripheral Vascular Disease', 'PVD', 'Arterial Insufficiency', 'Claudication', 'Critical Limb Ischemia'],
  
  overview: {
    definition: 'PAD occurs when fatty deposits (atherosclerotic plaques) build up in the walls of arteries supplying the legs, reducing blood flow. This causes a spectrum of disease from asymptomatic to intermittent claudication (leg pain with walking) to critical limb ischemia (rest pain, ulcers, gangrene). PAD is a marker for systemic atherosclerosis and significantly increases risk of heart attack and stroke.',
    causes: [
      'Atherosclerosis (main cause)',
      'Smoking (strongest modifiable risk factor)',
      'Diabetes mellitus',
      'High blood pressure',
      'High cholesterol',
      'Inflammation of blood vessels (rare)',
      'Blood vessel injury',
      'Radiation exposure'
    ],
    symptoms: [
      'Leg pain when walking (claudication) that resolves with rest',
      'Leg pain at rest (critical ischemia)',
      'Numbness or weakness in legs',
      'Cold legs or feet',
      'Slow-healing wounds on feet or legs',
      'Shiny skin on legs',
      'Hair loss on legs',
      'Weak or absent pulses in feet',
      'Color changes in legs (pale when raised, red when lowered)',
      'Erectile dysfunction (in men)'
    ],
    riskFactors: [
      'Smoking (most important)',
      'Diabetes',
      'Age over 50',
      'High blood pressure',
      'High cholesterol',
      'Family history of PAD or heart disease',
      'Obesity',
      'Kidney disease',
      'Previous heart attack or stroke'
    ],
    complications: [
      'Critical limb ischemia',
      'Non-healing ulcers',
      'Gangrene',
      'Amputation',
      'Heart attack (3-6x increased risk)',
      'Stroke (3-6x increased risk)',
      'Death from cardiovascular causes'
    ],
    prevalence: 'PAD affects 200 million people worldwide. Prevalence increases with age - affecting 5% of people aged 50-59 and 20% of those over 70. Many are undiagnosed.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Risk Factor Modification',
      duration: 'Ongoing',
      description: 'Initial assessment, diagnosis, and aggressive modification of cardiovascular risk factors. This is the foundation of PAD treatment.',
      goals: [
        'Confirm diagnosis',
        'Assess severity',
        'Stop disease progression',
        'Reduce cardiovascular events',
        'Improve symptoms'
      ],
      activities: [
        'Ankle-Brachial Index (ABI) measurement',
        'Duplex ultrasound of arteries',
        'Smoking cessation (critical)',
        'Blood pressure control',
        'Cholesterol management',
        'Diabetes control',
        'Supervised exercise program'
      ],
      medications: [
        {
          name: 'Antiplatelet (aspirin or clopidogrel)',
          purpose: 'Reduce cardiovascular events',
          duration: 'Lifelong'
        },
        {
          name: 'Statin (e.g., atorvastatin)',
          purpose: 'Lower cholesterol, stabilize plaques',
          duration: 'Lifelong'
        },
        {
          name: 'ACE inhibitor',
          purpose: 'Blood pressure control, cardiovascular protection',
          duration: 'Lifelong'
        },
        {
          name: 'Cilostazol',
          purpose: 'Improve walking distance (claudication)',
          duration: '3-6 months trial'
        }
      ],
      warningSignsThisPhase: [
        'Rest pain developing',
        'New wounds on feet',
        'Sudden worsening'
      ]
    },
    {
      phase: 2,
      name: 'Supervised Exercise Program',
      duration: '3-6 months',
      description: 'Structured walking program - proven to significantly improve walking distance and quality of life.',
      goals: [
        'Improve walking distance',
        'Develop collateral circulation',
        'Improve cardiovascular fitness',
        'Reduce symptoms'
      ],
      activities: [
        'Walking until moderate claudication pain',
        'Rest until pain resolves',
        'Repeat for 30-60 minutes',
        '3 sessions per week',
        'Gradual progression'
      ],
      warningSignsThisPhase: [
        'Symptoms worsening despite exercise',
        'Rest pain developing',
        'New foot wounds'
      ]
    },
    {
      phase: 3,
      name: 'Intervention (If Needed)',
      duration: 'Variable',
      description: 'Endovascular (angioplasty/stenting) or surgical (bypass) intervention for patients with lifestyle-limiting claudication or critical limb ischemia.',
      goals: [
        'Restore blood flow',
        'Relieve symptoms',
        'Heal wounds',
        'Prevent amputation'
      ],
      activities: [
        'Angiography to plan intervention',
        'Angioplasty and stenting (endovascular)',
        'Bypass surgery (surgical)',
        'Wound care if ulcers present'
      ],
      warningSignsThisPhase: [
        'Graft or stent failure',
        'Worsening ischemia',
        'Wound deterioration'
      ]
    },
    {
      phase: 4,
      name: 'Long-Term Management',
      duration: 'Lifelong',
      description: 'Ongoing risk factor control, surveillance, and foot care to prevent disease progression and complications.',
      goals: [
        'Prevent disease progression',
        'Maintain intervention patency',
        'Prevent cardiovascular events',
        'Preserve limbs'
      ],
      activities: [
        'Regular vascular review',
        'Continued exercise',
        'Foot care and inspection',
        'Medication compliance',
        'Surveillance scans if intervention performed'
      ],
      warningSignsThisPhase: [
        'Recurrent symptoms',
        'New wounds',
        'Bypass graft problems'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Vascular surgeon',
      'Cardiologist (cardiac risk assessment)',
      'Anesthetist',
      'Diabetic team if diabetic'
    ],
    investigations: [
      'Ankle-Brachial Index (ABI)',
      'Duplex ultrasound of leg arteries',
      'CT angiography or MR angiography',
      'ECG and cardiac assessment',
      'Blood tests: FBC, U&E, glucose, HbA1c, lipids, coagulation',
      'Chest X-ray'
    ],
    medications: [
      {
        medication: 'Aspirin/clopidogrel',
        instruction: 'continue unless directed otherwise',
        reason: 'Cardiovascular protection'
      },
      {
        medication: 'Metformin',
        instruction: 'stop 48 hours before if having contrast/surgery',
        reason: 'Kidney protection with contrast'
      },
      {
        medication: 'Blood thinners (warfarin, DOACs)',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before procedure',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Light evening meal',
      'Take regular medications as directed',
      'No smoking'
    ],
    whatToBring: [
      'Comfortable loose clothing',
      'Walking shoes for discharge',
      'All medications',
      'Glucose monitor if diabetic',
      'Reading material'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Take approved medications with sip of water',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia (endovascular), Regional or General (surgical bypass)',
    procedureDescription: 'ENDOVASCULAR TREATMENT (Angioplasty/Stenting): Performed through a small puncture in the groin (or arm). A catheter with a balloon is threaded to the blocked artery. The balloon is inflated to open the artery. A stent (metal mesh tube) may be placed to keep the artery open. Used for shorter blockages and patients with higher surgical risk. SURGICAL BYPASS: An incision is made to access the arteries. A graft (often patient\'s own vein or synthetic tube) is sewn above and below the blockage to create a new pathway for blood flow. Types include femoral-popliteal bypass and femoral-tibial bypass. Used for longer blockages or when endovascular fails.',
    duration: 'Endovascular: 1-2 hours. Bypass surgery: 3-5 hours',
    whatToExpect: 'Endovascular: Usually day case or overnight. Bypass: Hospital stay 5-10 days. Recovery depends on procedure.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep leg straight for 4-6 hours after endovascular. Elevate leg after bypass.',
      expectedSymptoms: [
        'Groin discomfort or bruising (endovascular)',
        'Leg swelling (bypass)',
        'Incision pain (bypass)',
        'Improved warmth and pulses in foot'
      ],
      activityLevel: 'Bedrest initially (4-6 hours after endovascular, longer after bypass). Then gradual mobilization.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Groin puncture site: keep dry, monitor for swelling. Bypass wounds: dressings changed by staff.'
      },
      {
        day: 'Days 3-14',
        instruction: 'Shower with dressings off once wounds dry. Monitor for infection signs.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Sutures removed at 2 weeks. Continue to monitor wounds. Report any drainage.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild after endovascular, moderate after bypass',
      medications: [
        'Paracetamol regularly',
        'NSAIDs if not contraindicated',
        'Stronger analgesia for bypass (short-term)',
        'Continue all cardiac medications'
      ],
      nonPharmacological: [
        'Leg elevation',
        'Gentle walking as tolerated',
        'Comfortable positioning'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Driving',
        restriction: 'When comfortable with controls',
        duration: '1-2 weeks endovascular, 4-6 weeks bypass',
        reason: 'Safety and wound healing'
      },
      {
        activity: 'Lifting',
        restriction: 'No heavy lifting',
        duration: '2 weeks endovascular, 6 weeks bypass',
        reason: 'Prevent wound complications'
      },
      {
        activity: 'Walking',
        restriction: 'Encouraged - progressive',
        duration: 'Start immediately, increase gradually',
        reason: 'Essential for recovery and graft patency'
      }
    ],
    dietaryGuidelines: [
      'Heart-healthy diet',
      'Low saturated fat',
      'Plenty of fruits and vegetables',
      'Limit salt',
      'Mediterranean diet recommended',
      'Adequate hydration'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'Immediate',
        expectation: 'Improved blood flow, warmer foot, better pulses'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Wounds healing, walking distance improving'
      },
      {
        timeframe: '3 months',
        expectation: 'Significant improvement in claudication'
      }
    ],
    longTerm: [
      {
        timeframe: '1 year',
        expectation: 'Endovascular patency 60-80%, Bypass patency 70-90%'
      },
      {
        timeframe: '5 years',
        expectation: 'Sustained improvement with risk factor control'
      }
    ],
    functionalRecovery: 'Most patients experience significant improvement in walking distance and quality of life. Critical limb ischemia: limb salvage rates 80-90% with successful revascularization.',
    cosmeticOutcome: 'Endovascular: small puncture site scar. Bypass: longer incisions along leg that fade over time.',
    successRate: 'Technical success >90%. Long-term patency depends on procedure type, lesion characteristics, and risk factor control. Continued smoking dramatically reduces success.',
    possibleComplications: [
      'Access site bleeding or hematoma',
      'Arterial dissection or rupture',
      'Distal embolization',
      'Restenosis (re-narrowing)',
      'Graft failure (bypass)',
      'Wound infection',
      'Heart attack (perioperative risk)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, symptom assessment'
      },
      {
        timing: '6 weeks',
        purpose: 'Duplex ultrasound (bypass graft surveillance)'
      },
      {
        timing: '3, 6, 12 months then annually',
        purpose: 'Ongoing surveillance and risk factor management'
      }
    ],
    rehabilitationNeeds: [
      'Supervised exercise program',
      'Smoking cessation support',
      'Cardiac rehabilitation may be appropriate',
      'Diabetic foot care if applicable'
    ],
    lifestyleModifications: [
      'STOP SMOKING (most important)',
      'Daily walking exercise',
      'Foot care and inspection',
      'Heart-healthy diet',
      'Weight management',
      'Take all medications as prescribed',
      'Report any change in symptoms promptly'
    ]
  },

  warningSigns: [
    'Return of leg pain',
    'Increasing rest pain',
    'New wounds on feet',
    'Color change in foot (pale or blue)',
    'Wound site problems',
    'Fever'
  ],

  emergencySigns: [
    'Sudden severe leg pain with cold, pale leg (acute ischemia)',
    'Rapid swelling at groin (bleeding)',
    'Chest pain',
    'Signs of stroke',
    'Black toes or spreading gangrene'
  ],

  complianceRequirements: [
    {
      requirement: 'Stop smoking permanently',
      importance: 'critical',
      consequence: 'Continued smoking causes treatment failure and limb loss'
    },
    {
      requirement: 'Take all cardiovascular medications',
      importance: 'critical',
      consequence: 'Reduces heart attack, stroke, and death'
    },
    {
      requirement: 'Daily walking exercise',
      importance: 'critical',
      consequence: 'Essential for maintaining improvement'
    },
    {
      requirement: 'Attend surveillance appointments',
      importance: 'important',
      consequence: 'Early detection of graft problems allows intervention'
    }
  ],

  whoGuidelines: [
    {
      title: 'ESC/ESVS Guidelines on PAD',
      reference: 'European Society of Cardiology/Vascular Surgery 2024',
      keyPoints: [
        'Smoking cessation is the most important intervention',
        'Supervised exercise is first-line for claudication',
        'All patients need antiplatelet and statin therapy',
        'Revascularization for lifestyle-limiting claudication or critical limb ischemia',
        'Endovascular-first strategy for many lesions'
      ]
    }
  ]
};

/**
 * Abdominal Aortic Aneurysm (AAA)
 */
export const abdominalAorticAneurysm: EducationCondition = {
  id: 'vascular-aaa',
  name: 'Abdominal Aortic Aneurysm',
  category: 'G',
  icdCode: 'I71.4',
  description: 'An abdominal aortic aneurysm (AAA) is an abnormal bulging or widening of the aorta (the main blood vessel in the abdomen) to more than 1.5 times its normal size. If left untreated, large aneurysms can rupture, which is often fatal.',
  alternateNames: ['AAA', 'Aortic Aneurysm', 'Triple A'],
  
  overview: {
    definition: 'The aorta is the main artery carrying blood from the heart to the body. An AAA occurs when the wall of the aorta weakens and bulges outward. Normal aortic diameter is about 2cm; an aneurysm is defined as diameter >3cm. Most AAAs are asymptomatic and found incidentally on imaging or through screening. The major risk is rupture - the larger the aneurysm, the higher the risk. Rupture is a surgical emergency with very high mortality.',
    causes: [
      'Atherosclerosis (hardening of arteries)',
      'Smoking (strongest risk factor)',
      'Genetic factors',
      'Connective tissue disorders (Marfan, Ehlers-Danlos)',
      'Infection (rare - mycotic aneurysm)',
      'Trauma (rare)',
      'Inflammation (inflammatory aneurysm)'
    ],
    symptoms: [
      'Usually asymptomatic (silent)',
      'Pulsating feeling in abdomen',
      'Deep, constant abdominal or back pain (concerning)',
      'Pain radiating to back, groin, or legs',
      'If rupturing: sudden severe abdominal/back pain, dizziness, collapse'
    ],
    riskFactors: [
      'Age over 65',
      'Male gender (6x more common)',
      'Smoking (90% of AAAs occur in smokers)',
      'Family history of AAA',
      'High blood pressure',
      'Peripheral arterial disease',
      'COPD',
      'High cholesterol'
    ],
    complications: [
      'Rupture (often fatal)',
      'Embolization (clot to legs)',
      'Aorto-enteric fistula (rare)',
      'Compression of adjacent structures'
    ],
    prevalence: 'AAA affects 4-8% of men over 65. Screening programs can detect AAA before rupture. Rupture mortality is 80-90%.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Surveillance (Small Aneurysms)',
      duration: 'Ongoing until threshold reached',
      description: 'Regular ultrasound monitoring of small aneurysms (<5.5cm in men, <5.0cm in women) with cardiovascular risk factor modification.',
      goals: [
        'Monitor growth rate',
        'Modify risk factors',
        'Plan elective repair before rupture',
        'Reduce cardiovascular risk'
      ],
      activities: [
        'Regular ultrasound scans',
        'Smoking cessation',
        'Blood pressure control',
        'Statin therapy',
        'Lifestyle modification'
      ],
      medications: [
        {
          name: 'Statin',
          purpose: 'Cardiovascular protection',
          duration: 'Lifelong'
        },
        {
          name: 'Antihypertensive',
          purpose: 'Control blood pressure',
          duration: 'Lifelong'
        },
        {
          name: 'Antiplatelet',
          purpose: 'Reduce cardiovascular events',
          duration: 'Lifelong'
        }
      ],
      warningSignsThisPhase: [
        'Rapid growth (>1cm/year)',
        'Development of pain',
        'Symptoms suggesting leak'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Assessment',
      duration: '2-4 weeks',
      description: 'Comprehensive assessment before elective repair when aneurysm reaches threshold (5.5cm) or is symptomatic.',
      goals: [
        'Assess fitness for surgery',
        'Plan surgical approach',
        'Optimize medical conditions',
        'Informed consent'
      ],
      activities: [
        'CT angiography',
        'Cardiac assessment (echo, stress test)',
        'Pulmonary function tests',
        'Kidney function assessment',
        'Optimization of comorbidities'
      ],
      warningSignsThisPhase: [
        'Onset of pain (may need urgent repair)',
        'Cardiac issues limiting surgery'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Repair',
      duration: 'Day of surgery',
      description: 'Elective repair by endovascular (EVAR) or open surgery to prevent rupture.',
      goals: [
        'Exclude aneurysm from circulation',
        'Prevent rupture',
        'Preserve blood flow to legs and organs'
      ],
      activities: [
        'EVAR (endovascular aneurysm repair) - most common',
        'Open surgical repair with graft',
        'Intensive care monitoring post-op'
      ],
      warningSignsThisPhase: [
        'Kidney injury',
        'Bowel ischemia',
        'Limb ischemia',
        'Cardiac events'
      ]
    },
    {
      phase: 4,
      name: 'Recovery and Surveillance',
      duration: 'Lifelong',
      description: 'Post-operative recovery and lifelong surveillance for endoleak (EVAR) or graft complications.',
      goals: [
        'Complete recovery',
        'Monitor for endoleak',
        'Continue cardiovascular protection',
        'Monitor for other aneurysms'
      ],
      activities: [
        'Gradual return to activities',
        'CT surveillance (EVAR: 1, 6, 12 months then annually)',
        'Ultrasound surveillance (open repair)',
        'Cardiovascular risk management'
      ],
      warningSignsThisPhase: [
        'Endoleak requiring treatment',
        'Aneurysm sac enlargement',
        'Graft infection'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Vascular surgeon',
      'Cardiologist',
      'Anesthetist',
      'Respiratory physician if COPD'
    ],
    investigations: [
      'CT angiography (detailed planning)',
      'Echocardiogram',
      'Cardiac stress test or angiography if indicated',
      'Pulmonary function tests',
      'Blood tests: FBC, U&E, LFTs, coagulation, crossmatch',
      'Chest X-ray'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed (warfarin 5 days, DOACs 2-3 days)',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Metformin',
        instruction: 'stop 48 hours before',
        reason: 'Contrast and kidney protection'
      },
      {
        medication: 'Continue statin, beta-blocker, aspirin',
        instruction: 'continue on day of surgery',
        reason: 'Cardiovascular protection'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight',
    dayBeforeSurgery: [
      'Admission to hospital',
      'Pre-operative checks',
      'Marking of groins if EVAR',
      'Shower with antiseptic soap'
    ],
    whatToBring: [
      'Comfortable clothing for discharge',
      'All medications',
      'Walking aids if used',
      'CPAP machine if used',
      'Reading material'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Take approved medications',
      'Compression stockings fitted'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'EVAR: Local/Regional or General anesthesia. Open repair: General anesthesia',
    procedureDescription: 'ENDOVASCULAR ANEURYSM REPAIR (EVAR): Through small incisions in both groins, a stent-graft (fabric-covered metal frame) is inserted into the aorta using X-ray guidance. The stent-graft lines the aneurysm, excluding it from blood flow and preventing rupture. Suitable for most patients with suitable anatomy. OPEN SURGICAL REPAIR: Through a large abdominal incision, the aorta is clamped above and below the aneurysm. The aneurysm is opened and a synthetic graft is sewn in place. The aneurysm wall is wrapped around the graft. More invasive but more durable long-term.',
    duration: 'EVAR: 2-3 hours. Open repair: 4-6 hours',
    whatToExpect: 'EVAR: 1-3 days hospital stay. Open: 7-14 days with possible ICU. Recovery faster with EVAR.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Bed rest for first few hours. Keep legs straight after EVAR. Gradual mobilization.',
      expectedSymptoms: [
        'Groin discomfort (EVAR)',
        'Abdominal discomfort (open)',
        'Fatigue',
        'Reduced appetite initially (open)'
      ],
      activityLevel: 'EVAR: Walking same day or next day. Open: Gradual mobilization over days.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'EVAR: Groin wounds kept dry, monitor for swelling. Open: Large dressing, changed by staff.'
      },
      {
        day: 'Days 3-14',
        instruction: 'Shower when wounds dry. Monitor for infection. Staples/sutures removed at 10-14 days.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Wounds healing. Report any drainage or opening.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild (EVAR), Moderate-severe initially (open)',
      medications: [
        'EVAR: Paracetamol, mild opioids if needed',
        'Open: Epidural or PCA initially, then oral analgesia',
        'Continue all cardiac medications'
      ],
      nonPharmacological: [
        'Positioning',
        'Deep breathing exercises',
        'Early mobilization'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Driving',
        restriction: 'When comfortable with emergency stop',
        duration: 'EVAR: 1-2 weeks. Open: 4-6 weeks',
        reason: 'Safety'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: 'EVAR: 2-4 weeks. Open: 6-12 weeks',
        reason: 'Wound and graft protection'
      },
      {
        activity: 'Sexual activity',
        restriction: 'When comfortable',
        duration: '2-4 weeks',
        reason: 'Comfort and wound healing'
      }
    ],
    dietaryGuidelines: [
      'EVAR: Normal diet when tolerated',
      'Open: Gradual diet advancement as bowel function returns',
      'Heart-healthy diet long-term',
      'Adequate hydration'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'EVAR 1-3 days, Open 7-14 days',
        expectation: 'Hospital discharge, mobilizing'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'EVAR: near normal activity. Open: gradual improvement'
      },
      {
        timeframe: '6 weeks',
        expectation: 'EVAR: full recovery. Open: significant recovery'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Open: full recovery'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Aneurysm excluded, rupture risk eliminated'
      }
    ],
    functionalRecovery: 'Full recovery expected. Quality of life returns to baseline. EVAR: faster recovery. Open: longer but durable.',
    cosmeticOutcome: 'EVAR: Two small groin scars. Open: Large midline or transverse abdominal scar.',
    successRate: 'Operative mortality: EVAR 1-2%, Open 3-5%. Long-term survival: 70% at 5 years (limited by cardiovascular disease). Re-intervention: EVAR 20% at 5 years, Open 5%.',
    possibleComplications: [
      'Endoleak (EVAR) - requiring surveillance or treatment',
      'Kidney injury',
      'Bowel ischemia',
      'Limb ischemia',
      'Sexual dysfunction (open)',
      'Heart attack',
      'Graft infection (rare)',
      'Wound complications'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2-4 weeks',
        purpose: 'Wound check, recovery assessment'
      },
      {
        timing: '1, 6, 12 months (EVAR)',
        purpose: 'CT angiography to check for endoleak'
      },
      {
        timing: 'Annually lifelong',
        purpose: 'Imaging surveillance and cardiovascular review'
      }
    ],
    rehabilitationNeeds: [
      'Graduated walking program',
      'Cardiac rehabilitation may be appropriate',
      'Smoking cessation support'
    ],
    lifestyleModifications: [
      'Stop smoking permanently',
      'Take cardiovascular medications',
      'Heart-healthy diet',
      'Regular exercise',
      'Attend all surveillance appointments',
      'Report any new symptoms promptly'
    ]
  },

  warningSigns: [
    'New or increasing abdominal or back pain',
    'Fever',
    'Wound redness or discharge',
    'Leg color change or weakness',
    'Blood in stool',
    'Groin swelling'
  ],

  emergencySigns: [
    'Sudden severe abdominal or back pain (may indicate rupture or endoleak)',
    'Collapse or near-collapse',
    'Cold, pale leg',
    'Significant wound bleeding',
    'Chest pain'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all surveillance scans (especially EVAR)',
      importance: 'critical',
      consequence: 'Endoleaks can be silent but lead to rupture'
    },
    {
      requirement: 'Stop smoking permanently',
      importance: 'critical',
      consequence: 'Smoking damages grafts and other arteries'
    },
    {
      requirement: 'Take cardiovascular medications',
      importance: 'critical',
      consequence: 'Reduces death from heart attack and stroke'
    },
    {
      requirement: 'Report new symptoms immediately',
      importance: 'critical',
      consequence: 'Late rupture can still occur'
    }
  ],

  whoGuidelines: [
    {
      title: 'ESC/ESVS Guidelines on Aortic Disease',
      reference: 'European Society of Cardiology/Vascular Surgery 2024',
      keyPoints: [
        'Screening recommended for men over 65 with smoking history',
        'Repair threshold 5.5cm men, 5.0cm women',
        'EVAR preferred for suitable anatomy and high-risk patients',
        'Open repair more durable but higher perioperative risk',
        'Lifelong surveillance required after EVAR'
      ]
    }
  ]
};

// Export vascular conditions part 1
export const vascularConditionsPart1 = [peripheralArterialDisease, abdominalAorticAneurysm];
