/**
 * Patient Education Content - Category E: Hernia
 * Part 1: Inguinal Hernia and Umbilical Hernia
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and European Hernia Society Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Inguinal Hernia
 */
export const inguinalHernia: EducationCondition = {
  id: 'hernia-inguinal',
  name: 'Inguinal Hernia',
  category: 'E',
  icdCode: 'K40',
  description: 'An inguinal hernia occurs when tissue, usually part of the intestine or fatty tissue, protrudes through a weak spot in the abdominal muscles in the groin area. It is the most common type of hernia, particularly in men.',
  alternateNames: ['Groin Hernia', 'Direct Inguinal Hernia', 'Indirect Inguinal Hernia', 'Bubonocele'],
  
  overview: {
    definition: 'An inguinal hernia is a protrusion of abdominal contents through the inguinal canal, a natural passage in the lower abdominal wall. There are two types: Indirect inguinal hernias follow the path of the spermatic cord and are the most common type, often congenital in origin. Direct inguinal hernias push through a weakened area in the posterior wall of the inguinal canal and are typically acquired due to weakness from aging or strain. Inguinal hernias account for 75% of all abdominal wall hernias and are 25 times more common in men than women.',
    causes: [
      'Congenital weakness in abdominal wall (indirect)',
      'Age-related weakening of abdominal muscles (direct)',
      'Chronic coughing',
      'Chronic constipation and straining',
      'Heavy lifting with improper technique',
      'Obesity',
      'Previous abdominal surgery',
      'Pregnancy',
      'Connective tissue disorders'
    ],
    symptoms: [
      'Bulge in the groin area that increases with standing or straining',
      'Aching or burning sensation at the bulge',
      'Pain or discomfort in the groin, especially when bending, coughing, or lifting',
      'Dragging or heavy sensation in the groin',
      'Weakness or pressure in the groin',
      'Pain and swelling around the testicles (if hernia descends into scrotum)',
      'Symptoms worsen as day progresses, improve when lying down'
    ],
    riskFactors: [
      'Male gender (lifetime risk 27% for men vs 3% for women)',
      'Family history of hernias',
      'Chronic cough (COPD, smoking)',
      'Chronic constipation',
      'History of previous inguinal hernia',
      'Premature birth',
      'Obesity',
      'Heavy physical labor',
      'Connective tissue disorders'
    ],
    complications: [
      'Incarceration (hernia cannot be pushed back)',
      'Strangulation (blood supply cut off - surgical emergency)',
      'Bowel obstruction',
      'Chronic pain',
      'Recurrence after repair'
    ],
    prevalence: 'Inguinal hernias affect approximately 27% of men and 3% of women at some point in their lives. Over 20 million inguinal hernia repairs are performed worldwide annually.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Watchful Waiting (if applicable)',
      duration: 'Variable',
      description: 'Some small, minimally symptomatic hernias may be watched. However, most inguinal hernias require surgical repair as they do not resolve spontaneously.',
      goals: [
        'Confirm diagnosis',
        'Assess hernia characteristics',
        'Evaluate surgical risk',
        'Determine timing of surgery'
      ],
      activities: [
        'Physical examination with Valsalva maneuver',
        'Ultrasound if diagnosis uncertain',
        'CT scan for complex or recurrent hernias',
        'Pre-operative optimization',
        'Manage contributing factors (cough, constipation)'
      ],
      warningSignsThisPhase: [
        'Hernia becoming irreducible (stuck out)',
        'Increasing pain',
        'Redness or skin changes over hernia',
        'Nausea and vomiting (possible obstruction)'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Preparation',
      duration: '1-4 weeks before surgery',
      description: 'Optimization of patient condition and preparation for surgical repair.',
      goals: [
        'Optimize medical conditions',
        'Reduce surgical risk factors',
        'Plan appropriate repair technique',
        'Patient education'
      ],
      activities: [
        'Stop smoking (minimum 4 weeks ideal)',
        'Treat chronic cough',
        'Manage constipation',
        'Optimize diabetes control',
        'Weight loss if obese',
        'Pre-operative assessment'
      ],
      medications: [
        {
          name: 'Stool softeners',
          purpose: 'Prevent straining post-operatively',
          duration: 'Start before surgery, continue 2 weeks after'
        }
      ],
      warningSignsThisPhase: [
        'Hernia becoming incarcerated',
        'Unable to reduce hernia',
        'Acute pain suggesting strangulation'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Repair',
      duration: 'Day of surgery',
      description: 'Surgical repair using open or laparoscopic technique with mesh reinforcement.',
      goals: [
        'Reduce hernia contents',
        'Repair defect in abdominal wall',
        'Reinforce with mesh',
        'Prevent recurrence'
      ],
      activities: [
        'Hernia sac identification and reduction',
        'Mesh placement (tension-free repair)',
        'Secure mesh fixation',
        'Wound closure'
      ],
      warningSignsThisPhase: [
        'Incarcerated/strangulated bowel found',
        'Need for bowel resection',
        'Significant bleeding'
      ]
    },
    {
      phase: 4,
      name: 'Recovery Phase',
      duration: 'Weeks 1-6',
      description: 'Gradual recovery with progressive return to normal activities. Mesh incorporation occurs over weeks.',
      goals: [
        'Wound healing',
        'Pain management',
        'Prevent recurrence',
        'Return to normal activities'
      ],
      activities: [
        'Rest initially then gradual mobilization',
        'Wound care',
        'Avoid heavy lifting',
        'Gradual return to work and activities',
        'Monitor for complications'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Increasing swelling (hematoma, seroma)',
        'Severe pain',
        'Urinary retention',
        'Signs of recurrence'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General surgeon',
      'Anesthetist',
      'Cardiologist if cardiac history',
      'Pulmonologist if chronic lung disease'
    ],
    investigations: [
      'Complete blood count',
      'Coagulation profile',
      'Blood glucose and HbA1c if diabetic',
      'ECG if over 50 or cardiac history',
      'Chest X-ray if indicated',
      'Ultrasound of groin if diagnosis unclear'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed by surgeon',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Aspirin',
        instruction: 'may continue or stop per surgeon',
        reason: 'Balance bleeding and cardiac risk'
      },
      {
        medication: 'Stool softeners',
        instruction: 'start before surgery',
        reason: 'Prevent straining after surgery'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before surgery',
    dayBeforeSurgery: [
      'Shower with regular soap',
      'Trim groin hair if instructed (do not shave)',
      'Light meal in evening',
      'Empty bowels if possible',
      'Pack comfortable, loose underwear'
    ],
    whatToBring: [
      'Loose, comfortable clothing',
      'Supportive underwear (briefs, not boxers)',
      'List of medications',
      'Driver to take you home'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Shower in morning',
      'No jewelry or valuables',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['Local anesthesia with sedation (some open repairs)', 'Regional/spinal anesthesia', 'General anesthesia (most laparoscopic)'],
    procedureDescription: 'OPEN REPAIR (Lichtenstein): Through a 6-8cm groin incision, the hernia sac is identified and reduced. A synthetic mesh is placed over the defect and secured, providing tension-free reinforcement. LAPAROSCOPIC REPAIR (TEP/TAPP): Using keyhole surgery, the hernia is repaired from inside the abdominal wall. A mesh is placed behind the muscles covering the defect. Advantages include less post-operative pain and faster recovery. Both techniques have similar long-term outcomes.',
    duration: '45 minutes to 1.5 hours',
    whatToExpect: 'Most repairs are day surgery. You will be in recovery for 1-2 hours after surgery before going home. Some patients stay overnight.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'May lie flat or with head elevated. Ice packs to groin can reduce swelling.',
      expectedSymptoms: [
        'Groin pain and discomfort (expected)',
        'Bruising and swelling in groin and scrotum',
        'Difficulty urinating initially (especially after spinal)',
        'Feeling of tightness in groin'
      ],
      activityLevel: 'Walk around within hours of surgery. Avoid bed rest. Light activities only.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep wound dressings dry. Ice packs 20 minutes every few hours for swelling. Supportive underwear.'
      },
      {
        day: 'Days 3-7',
        instruction: 'May shower with waterproof dressing or after dressing removed. Pat dry. No baths or swimming.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Sutures removed or dissolve. Continue to monitor wound. May shower normally.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) first few days, improving daily',
      medications: [
        'Paracetamol 1000mg every 6 hours regularly for first few days',
        'Ibuprofen 400mg every 8 hours if not contraindicated',
        'Stronger analgesia (codeine/tramadol) for breakthrough pain'
      ],
      nonPharmacological: [
        'Ice packs to groin (wrapped, 20 minutes on/off)',
        'Supportive underwear',
        'Pillow over incision when coughing',
        'Gentle walking'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting (>5kg)',
        restriction: 'Avoid completely',
        duration: '4-6 weeks',
        reason: 'Allow mesh incorporation and wound healing'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Prevent recurrence during healing'
      },
      {
        activity: 'Driving',
        restriction: 'Avoid until comfortable with emergency braking',
        duration: '1-2 weeks typically',
        reason: 'Safety and insurance requirements'
      },
      {
        activity: 'Sexual activity',
        restriction: 'When comfortable',
        duration: 'Usually 2 weeks',
        reason: 'Allow wound healing'
      },
      {
        activity: 'Return to work',
        restriction: 'Desk work 1-2 weeks, manual work 4-6 weeks',
        duration: 'Depends on job demands',
        reason: 'Match recovery to work requirements'
      }
    ],
    dietaryGuidelines: [
      'Normal diet as tolerated',
      'High fiber diet to prevent constipation',
      'Plenty of fluids',
      'Stool softeners to avoid straining'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Pain improving, able to walk and do light activities'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Most daily activities resumed, wound healed'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Full activities including exercise and lifting'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Full recovery, mesh fully incorporated'
      },
      {
        timeframe: 'Lifelong',
        expectation: 'Permanent repair in >95% of cases'
      }
    ],
    functionalRecovery: 'Full return to all activities expected. Most patients return to normal work within 2-4 weeks. Athletes may take 6-8 weeks.',
    cosmeticOutcome: 'Open repair: 6-8cm scar that fades over time. Laparoscopic: 3 small scars (5-10mm) below umbilicus.',
    successRate: 'Recurrence rates: Open mesh repair 1-2%, Laparoscopic repair 1-2%. Both techniques are highly effective.',
    possibleComplications: [
      'Chronic groin pain (5-10%)',
      'Recurrence (1-2%)',
      'Wound infection (1-2%)',
      'Hematoma/seroma (5-10%)',
      'Testicular swelling',
      'Urinary retention',
      'Mesh infection (rare)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, suture removal'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess recovery, clear for full activities'
      },
      {
        timing: '1 year (if needed)',
        purpose: 'Long-term follow-up for any concerns'
      }
    ],
    rehabilitationNeeds: [
      'Gradual return to exercise',
      'Core strengthening after 6 weeks',
      'No specific physiotherapy usually needed'
    ],
    lifestyleModifications: [
      'Maintain healthy weight',
      'Avoid chronic straining',
      'Proper lifting technique',
      'Treat chronic cough',
      'High fiber diet for bowel regularity'
    ]
  },

  warningSigns: [
    'Increasing pain after initial improvement',
    'Fever',
    'Wound redness, swelling, or discharge',
    'Inability to urinate',
    'Testicular swelling or severe pain',
    'Nausea and vomiting',
    'New bulge appearing'
  ],

  emergencySigns: [
    'Severe sudden pain in groin or abdomen',
    'Nausea and vomiting with abdominal distension',
    'Unable to pass gas or stool',
    'Fever with wound infection signs',
    'Blood in urine or stool'
  ],

  complianceRequirements: [
    {
      requirement: 'Avoid heavy lifting for 4-6 weeks',
      importance: 'critical',
      consequence: 'Premature heavy lifting can cause recurrence'
    },
    {
      requirement: 'Prevent constipation',
      importance: 'important',
      consequence: 'Straining increases intra-abdominal pressure and stress on repair'
    },
    {
      requirement: 'Report any wound problems promptly',
      importance: 'important',
      consequence: 'Early treatment of infection prevents mesh complications'
    },
    {
      requirement: 'Complete recommended activity restrictions',
      importance: 'important',
      consequence: 'Proper healing time reduces recurrence risk'
    }
  ],

  whoGuidelines: [
    {
      title: 'International Guidelines for Groin Hernia Management',
      reference: 'HerniaSurge 2018',
      keyPoints: [
        'Mesh repair is recommended for adult inguinal hernias',
        'Both open and laparoscopic approaches are acceptable',
        'Watchful waiting is acceptable for minimally symptomatic hernias',
        'Antibiotic prophylaxis recommended in open repair',
        'Early mobilization and return to activities is safe'
      ]
    }
  ]
};

/**
 * Umbilical Hernia
 */
export const umbilicalHernia: EducationCondition = {
  id: 'hernia-umbilical',
  name: 'Umbilical Hernia',
  category: 'E',
  icdCode: 'K42',
  description: 'An umbilical hernia occurs when part of the intestine or fatty tissue protrudes through the abdominal wall near the navel (umbilicus). Common in infants but also occurs in adults, particularly those with obesity or multiple pregnancies.',
  alternateNames: ['Belly Button Hernia', 'Navel Hernia', 'Periumbilical Hernia', 'Paraumbilical Hernia'],
  
  overview: {
    definition: 'An umbilical hernia is a protrusion of abdominal contents through a weakness or opening in the umbilical ring. In infants, it occurs because the umbilical ring (where the umbilical cord passed through) fails to close completely after birth. In adults, it develops due to increased abdominal pressure weakening the tissue around the navel. Adult umbilical hernias do not resolve spontaneously and carry a higher risk of incarceration than infant hernias.',
    causes: [
      'Incomplete closure of umbilical ring (infants)',
      'Obesity',
      'Multiple pregnancies',
      'Ascites (fluid in abdomen)',
      'Heavy lifting',
      'Chronic cough',
      'Persistent straining',
      'Previous abdominal surgery',
      'Connective tissue weakness'
    ],
    symptoms: [
      'Soft bulge at or near the belly button',
      'Bulge increases with coughing, straining, or standing',
      'May reduce (go back in) when lying down',
      'Discomfort or pain at the site',
      'Aching sensation with activity',
      'Skin changes over hernia (if large)'
    ],
    riskFactors: [
      'Obesity (strongest risk factor)',
      'Multiple pregnancies',
      'Chronic liver disease with ascites',
      'Previous abdominal surgery',
      'Chronic constipation',
      'Chronic cough',
      'Heavy lifting occupation',
      'Female gender (in adults)',
      'African descent (in infants)'
    ],
    complications: [
      'Incarceration (more common than in inguinal hernias)',
      'Strangulation (surgical emergency)',
      'Bowel obstruction',
      'Skin ulceration over large hernias',
      'Recurrence after repair'
    ],
    prevalence: 'Umbilical hernias occur in 10-20% of infants. In adults, they account for about 10% of all abdominal wall hernias.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Decision Making',
      duration: 'Initial consultation',
      description: 'Determine need for surgery based on symptoms, size, and risk factors. In infants, many resolve by age 4-5.',
      goals: [
        'Confirm diagnosis',
        'Assess hernia size and reducibility',
        'Evaluate for complications',
        'Determine surgical timing'
      ],
      activities: [
        'Physical examination',
        'Assess reducibility',
        'Measure defect size',
        'Consider imaging if complex',
        'Assess contributing factors'
      ],
      warningSignsThisPhase: [
        'Irreducible hernia',
        'Pain and tenderness',
        'Skin changes',
        'Signs of obstruction'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Optimization',
      duration: '2-8 weeks',
      description: 'Optimize modifiable risk factors before surgery to reduce recurrence risk.',
      goals: [
        'Weight optimization',
        'Manage contributing conditions',
        'Pre-operative assessment',
        'Plan surgical approach'
      ],
      activities: [
        'Weight loss program if obese',
        'Stop smoking',
        'Optimize diabetes',
        'Treat ascites if present',
        'Pre-operative workup'
      ],
      warningSignsThisPhase: [
        'Hernia becoming incarcerated',
        'Increasing symptoms'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Repair',
      duration: 'Day of surgery',
      description: 'Repair of the umbilical defect, usually with mesh reinforcement for adult hernias.',
      goals: [
        'Close the fascial defect',
        'Reinforce with mesh (for larger defects)',
        'Preserve umbilicus cosmesis',
        'Prevent recurrence'
      ],
      activities: [
        'Infraumbilical or periumbilical incision',
        'Reduction of hernia contents',
        'Excision of hernia sac',
        'Primary suture (small defects) or mesh repair',
        'Umbilicoplasty for cosmesis'
      ],
      warningSignsThisPhase: [
        'Bowel involvement',
        'Large defect requiring complex repair',
        'Contamination'
      ]
    },
    {
      phase: 4,
      name: 'Recovery',
      duration: '4-6 weeks',
      description: 'Post-operative healing with gradual return to activities.',
      goals: [
        'Wound healing',
        'Pain control',
        'Prevent recurrence',
        'Resume normal activities'
      ],
      activities: [
        'Wound care',
        'Activity restrictions',
        'Pain management',
        'Monitor for complications',
        'Gradual activity increase'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Seroma formation',
        'Recurrence',
        'Chronic pain'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General surgeon',
      'Anesthetist',
      'Hepatologist if liver disease/ascites',
      'Weight management clinic if obese'
    ],
    investigations: [
      'Complete blood count',
      'Coagulation studies',
      'Liver function tests if ascites',
      'CT scan for large or complex hernias',
      'ECG if indicated',
      'Blood glucose'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Diuretics (if ascites)',
        instruction: 'optimize fluid status',
        reason: 'Reduce ascites before surgery'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight',
    dayBeforeSurgery: [
      'Shower normally',
      'Light meal in evening',
      'Empty bowels',
      'Prepare loose, comfortable clothing'
    ],
    whatToBring: [
      'Loose clothing that avoids waistband pressure on umbilicus',
      'List of medications',
      'Driver for transport home'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Morning shower',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['General anesthesia (most common)', 'Local anesthesia with sedation (small hernias)'],
    procedureDescription: 'OPEN REPAIR: A curved incision is made below the umbilicus. The hernia sac is identified, contents reduced, and sac excised. For small defects (<2cm), primary suture closure may be adequate. For larger defects (>2cm), mesh reinforcement is placed either in front of (onlay) or behind (sublay/preperitoneal) the fascia. The umbilicus is reconstructed for cosmesis. LAPAROSCOPIC REPAIR: May be used for larger hernias or combined with other procedures.',
    duration: '30 minutes to 1 hour',
    whatToExpect: 'Usually day surgery. Dressing over umbilicus. May have discomfort in umbilical area.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'May lie flat or sit up as comfortable. Support abdomen when coughing or moving.',
      expectedSymptoms: [
        'Pain and tenderness around umbilicus',
        'Bruising and swelling at operative site',
        'Umbilicus may look different initially',
        'Mild nausea from anesthesia'
      ],
      activityLevel: 'Walk around within hours. Avoid straining. No heavy lifting.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep dressing dry. Monitor for bleeding or discharge.'
      },
      {
        day: 'Days 3-7',
        instruction: 'May shower with waterproof dressing or after dressing removed. Pat dry.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Suture removal if not dissolving. Continue wound monitoring.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (3-5/10), improving over days',
      medications: [
        'Paracetamol 1000mg every 6 hours',
        'Ibuprofen if not contraindicated',
        'Codeine for breakthrough pain'
      ],
      nonPharmacological: [
        'Support abdomen when coughing or moving',
        'Ice pack to area (wrapped)',
        'Gentle walking'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: '4-6 weeks',
        reason: 'Allow proper healing and mesh incorporation'
      },
      {
        activity: 'Core exercises/sit-ups',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Stress on repair site'
      },
      {
        activity: 'Driving',
        restriction: 'When comfortable with emergency stop',
        duration: '1-2 weeks',
        reason: 'Safety'
      }
    ],
    dietaryGuidelines: [
      'Normal diet as tolerated',
      'High fiber to prevent constipation',
      'Adequate fluids',
      'Avoid weight gain'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Pain settling, able to do light activities'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Wound healed, most normal activities resumed'
      }
    ],
    longTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Full activities, complete healing'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Permanent repair with low recurrence'
      }
    ],
    functionalRecovery: 'Full recovery expected. Most return to work within 1-2 weeks for sedentary jobs.',
    cosmeticOutcome: 'Scar hidden in or below umbilicus. Umbilicus should look normal after healing.',
    successRate: 'Recurrence rates 1-5% with mesh repair, higher (10-30%) with suture-only repair in larger defects.',
    possibleComplications: [
      'Seroma (fluid collection) - common',
      'Wound infection (2-5%)',
      'Recurrence',
      'Chronic pain (uncommon)',
      'Mesh infection (rare)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check'
      },
      {
        timing: '6 weeks',
        purpose: 'Final recovery check'
      }
    ],
    rehabilitationNeeds: [
      'Gradual core strengthening after 6 weeks',
      'No formal physiotherapy usually needed'
    ],
    lifestyleModifications: [
      'Maintain healthy weight (most important)',
      'Avoid chronic straining',
      'Core strengthening long-term',
      'Proper lifting technique'
    ]
  },

  warningSigns: [
    'Increasing pain or swelling',
    'Wound redness, warmth, or discharge',
    'Fever',
    'Nausea or vomiting',
    'Bulge reappearing'
  ],

  emergencySigns: [
    'Severe abdominal pain',
    'Vomiting with inability to pass gas/stool',
    'High fever with wound infection',
    'Wound opening'
  ],

  complianceRequirements: [
    {
      requirement: 'Maintain weight loss if achieved pre-operatively',
      importance: 'critical',
      consequence: 'Weight gain is major risk factor for recurrence'
    },
    {
      requirement: 'Avoid heavy lifting for 4-6 weeks',
      importance: 'critical',
      consequence: 'Premature strain can disrupt repair'
    },
    {
      requirement: 'Prevent constipation',
      importance: 'important',
      consequence: 'Straining increases recurrence risk'
    }
  ],

  whoGuidelines: [
    {
      title: 'Umbilical and Epigastric Hernia Guidelines',
      reference: 'European Hernia Society 2020',
      keyPoints: [
        'Mesh reinforcement recommended for defects >1-2cm',
        'Weight optimization before elective surgery',
        'Suture repair acceptable for small defects',
        'Laparoscopic approach for complex or recurrent cases'
      ]
    }
  ]
};

// Export hernia conditions part 1
export const herniaEducationPart1 = [inguinalHernia, umbilicalHernia];
