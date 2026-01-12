/**
 * Patient Education Content - Category E: Hernia
 * Part 2: Incisional Hernia and Hiatal Hernia
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and European Hernia Society Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Incisional Hernia
 */
export const incisionalHernia: EducationCondition = {
  id: 'hernia-incisional',
  name: 'Incisional Hernia',
  category: 'E',
  icdCode: 'K43.0',
  description: 'An incisional hernia occurs when tissue protrudes through a previous surgical incision in the abdominal wall. It is a common complication after abdominal surgery, occurring in 10-20% of patients.',
  alternateNames: ['Ventral Hernia', 'Post-operative Hernia', 'Surgical Site Hernia', 'Laparotomy Site Hernia'],
  
  overview: {
    definition: 'An incisional hernia develops when the abdominal wall fails to heal properly after surgical incision, allowing abdominal contents to protrude through the weakened area. It can occur months to years after the original surgery. The hernia may be small (containing only fat) or large (containing bowel). Large incisional hernias can be complex to repair and may significantly impact quality of life.',
    causes: [
      'Wound infection after original surgery',
      'Poor wound healing',
      'Technical factors in wound closure',
      'Early return to heavy activity',
      'Chronic cough post-operatively',
      'Obesity',
      'Malnutrition',
      'Steroid use',
      'Diabetes',
      'Emergency surgery (higher risk than elective)'
    ],
    symptoms: [
      'Bulge at or near surgical scar',
      'Bulge increases with straining, standing, or coughing',
      'Discomfort or pain at the hernia site',
      'May be reducible or irreducible',
      'Dragging or heavy sensation',
      'Skin changes over large hernias',
      'Altered bowel function with large hernias'
    ],
    riskFactors: [
      'Previous wound infection',
      'Obesity',
      'Smoking',
      'Diabetes',
      'Chronic lung disease/cough',
      'Malnutrition',
      'Steroid or immunosuppressive therapy',
      'Previous incisional hernia',
      'Emergency surgery',
      'Vertical midline incisions (higher risk)'
    ],
    complications: [
      'Incarceration',
      'Strangulation',
      'Bowel obstruction',
      'Loss of abdominal domain (large hernias)',
      'Skin ulceration',
      'Chronic pain',
      'Recurrence (15-30% after repair)'
    ],
    prevalence: 'Incisional hernias occur in 10-20% of patients after midline laparotomy. After wound infection, rates increase to 30-40%.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Optimization',
      duration: '4-12 weeks',
      description: 'Thorough assessment of hernia complexity and aggressive optimization of modifiable risk factors before repair.',
      goals: [
        'Document hernia size and contents',
        'Identify loss of domain',
        'Optimize patient condition',
        'Plan surgical approach',
        'Reduce recurrence risk'
      ],
      activities: [
        'CT scan of abdomen/pelvis',
        'Measure hernia defect size',
        'Calculate loss of domain',
        'Weight loss program',
        'Smoking cessation (minimum 4 weeks)',
        'Optimize diabetes control',
        'Pre-rehabilitation if large hernia'
      ],
      medications: [
        {
          name: 'Nutritional supplements',
          purpose: 'Optimize healing capacity',
          duration: 'Pre and post-operatively'
        }
      ],
      warningSignsThisPhase: [
        'Hernia becoming incarcerated',
        'Acute obstruction',
        'Skin breakdown over hernia'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Preparation',
      duration: '1-2 weeks before surgery',
      description: 'Final preparations including possible botox to lateral abdominal wall muscles for large hernias.',
      goals: [
        'Final medical optimization',
        'Prepare for specific surgical approach',
        'Consider component separation if needed',
        'Organize post-operative care'
      ],
      activities: [
        'Pre-operative assessment',
        'Botox injection to abdominal wall (large hernias)',
        'Progressive pneumoperitoneum (selected cases)',
        'Blood transfusion preparation',
        'Enhanced recovery protocol'
      ],
      warningSignsThisPhase: [
        'Acute incarceration',
        'Medical deterioration'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Repair',
      duration: 'Day of surgery',
      description: 'Surgical repair with mesh reinforcement. Approach depends on hernia size and complexity.',
      goals: [
        'Reduce hernia contents',
        'Close fascial defect',
        'Reinforce with mesh',
        'Minimize recurrence risk'
      ],
      activities: [
        'Open or laparoscopic approach',
        'Adhesiolysis (free bowel from adhesions)',
        'Component separation if needed',
        'Mesh placement (various positions)',
        'Drain placement if large cavity',
        'Abdominal binder fitted'
      ],
      warningSignsThisPhase: [
        'Bowel injury',
        'Inability to close fascia',
        'Excessive blood loss',
        'Compartment syndrome risk'
      ]
    },
    {
      phase: 4,
      name: 'Recovery Phase',
      duration: '6-12 weeks',
      description: 'Extended recovery period reflecting complexity of repair. Focus on preventing recurrence.',
      goals: [
        'Wound healing',
        'Prevent seroma',
        'Prevent recurrence',
        'Gradual return to activities'
      ],
      activities: [
        'Abdominal binder continuously for 6 weeks',
        'Wound care including drains',
        'Progressive activity',
        'Core rehabilitation (delayed)',
        'Weight management'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Large seroma',
        'Mesh infection',
        'Early recurrence',
        'Respiratory compromise'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General/Hernia surgeon',
      'Anesthetist',
      'Dietitian for weight optimization',
      'Respiratory physician if COPD',
      'Physiotherapist for pre-rehabilitation'
    ],
    investigations: [
      'CT scan of abdomen and pelvis with contrast',
      'Complete blood count',
      'Coagulation profile',
      'Liver and kidney function',
      'Blood glucose and HbA1c',
      'ECG and cardiac assessment',
      'Pulmonary function tests if large hernia',
      'Blood type and crossmatch'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Smoking',
        instruction: 'stop minimum 4-6 weeks before',
        reason: 'Dramatically reduces wound complications and recurrence'
      },
      {
        medication: 'Metformin',
        instruction: 'hold day of surgery',
        reason: 'Contrast and anesthesia safety'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight. Carbohydrate drink may be given up to 2 hours before if part of enhanced recovery.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Bowel preparation if instructed',
      'Light meal evening before',
      'Pack for hospital stay (3-7 days for large repairs)'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Abdominal binder (may be provided)',
      'Walking aids if used',
      'CPAP machine if you use one',
      'All medications'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight (unless carb drink given)',
      'Antiseptic shower morning of surgery',
      'Compression stockings will be applied',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'OPEN REPAIR: The previous incision is opened, adhesions freed, hernia contents reduced, and fascia repaired. Mesh is placed in various positions: Onlay (over fascia), Sublay/Retrorectus (behind rectus muscles), or Intraperitoneal. Component separation may be performed for large hernias to allow tension-free closure. LAPAROSCOPIC REPAIR: May use IPOM (intraperitoneal mesh), eTEP (extended totally extraperitoneal), or TAR (transversus abdominis release) techniques. Laparoscopic approach has lower wound complications but may be unsuitable for very large hernias.',
    duration: '1-4 hours depending on complexity',
    whatToExpect: 'Hospital stay 1-5 days depending on size of repair. Drains may be present. Abdominal binder will be fitted. Epidural or TAP block may be used for pain control.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Head of bed elevated. Support abdomen when coughing or moving. Abdominal binder on at all times.',
      expectedSymptoms: [
        'Significant abdominal pain (larger surgery than other hernias)',
        'Swelling and bruising',
        'Tightness from closure',
        'Drains with serous fluid',
        'May feel short of breath initially if large hernia reduced'
      ],
      activityLevel: 'Early mobilization day 1. Walk with assistance. Deep breathing exercises essential.'
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'Dressing changes by nursing staff. Monitor drains. Keep binder on.'
      },
      {
        day: 'Days 5-14',
        instruction: 'Drains removed when output <50ml/24hr. Shower after drain removal. Keep wound dry otherwise.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Continue wearing binder. Monitor for seroma. Suture removal if not dissolving.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (5-7/10) initially, improving over weeks',
      medications: [
        'Epidural or PCA pump initially',
        'Transition to oral analgesia',
        'Paracetamol regularly',
        'NSAIDs when safe',
        'Opioids for breakthrough'
      ],
      nonPharmacological: [
        'Abdominal binder for support',
        'Pillows for positioning',
        'Deep breathing exercises',
        'Early mobilization'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: '8-12 weeks',
        reason: 'Extended healing needed for large repairs'
      },
      {
        activity: 'Driving',
        restriction: 'When comfortable with emergency stop',
        duration: '2-4 weeks',
        reason: 'Safety and insurance'
      },
      {
        activity: 'Work',
        restriction: 'Desk work 2-4 weeks, physical work 8-12 weeks',
        duration: 'Depends on repair size',
        reason: 'Allow adequate healing'
      },
      {
        activity: 'Abdominal exercises',
        restriction: 'Avoid until cleared',
        duration: '12 weeks',
        reason: 'Protect repair'
      }
    ],
    dietaryGuidelines: [
      'High protein diet for healing',
      'Adequate calories',
      'Fiber to prevent constipation',
      'Maintain weight loss if achieved',
      'No weight gain during recovery'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Managing with oral analgesia, walking regularly, drains out'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Most daily activities resumed, wound healing'
      },
      {
        timeframe: '6-8 weeks',
        expectation: 'Returning to work, light activities'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Full activities resumed, mesh incorporated'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Final outcome, monitoring for recurrence'
      }
    ],
    functionalRecovery: 'Good recovery expected but longer than primary hernia repairs. Large hernia repairs may have prolonged recovery.',
    cosmeticOutcome: 'Previous scar revised. May have drain site scars. Abdominal contour usually improved.',
    successRate: 'Recurrence rates 10-20% depending on technique and patient factors. Mesh repair has lower recurrence than suture. Laparoscopic may have lower wound complications.',
    possibleComplications: [
      'Seroma (very common - 30-50%)',
      'Wound infection (5-10%)',
      'Recurrence (10-20%)',
      'Chronic pain (5-10%)',
      'Mesh infection (requiring removal)',
      'Bowel injury',
      'Respiratory complications (large repairs)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check, drain site, early recovery'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing, seroma management'
      },
      {
        timing: '3 months',
        purpose: 'Return to activities, assess for recurrence'
      },
      {
        timing: '1 year',
        purpose: 'Long-term outcome'
      }
    ],
    rehabilitationNeeds: [
      'Core strengthening program after 3 months',
      'Physiotherapy for large repairs',
      'Weight management ongoing'
    ],
    lifestyleModifications: [
      'Maintain healthy weight (critical)',
      'No smoking permanently',
      'Proper lifting technique',
      'Core strengthening long-term',
      'Avoid chronic constipation'
    ]
  },

  warningSigns: [
    'Increasing pain after initial improvement',
    'Fever',
    'Wound redness, warmth, or discharge',
    'Increasing swelling or fluid collection',
    'Nausea and vomiting',
    'Breathing difficulty',
    'New bulge appearing'
  ],

  emergencySigns: [
    'Severe abdominal pain',
    'Inability to pass gas or stool',
    'High fever with wound infection',
    'Significant shortness of breath',
    'Wound breakdown'
  ],

  complianceRequirements: [
    {
      requirement: 'Wear abdominal binder for 6 weeks',
      importance: 'critical',
      consequence: 'Binder supports repair and reduces seroma'
    },
    {
      requirement: 'Avoid heavy lifting for 8-12 weeks',
      importance: 'critical',
      consequence: 'Premature strain causes recurrence'
    },
    {
      requirement: 'No smoking permanently',
      importance: 'critical',
      consequence: 'Smoking dramatically increases recurrence and complications'
    },
    {
      requirement: 'Maintain weight loss',
      importance: 'critical',
      consequence: 'Weight gain is major cause of recurrence'
    }
  ],

  whoGuidelines: [
    {
      title: 'European Hernia Society Guidelines on Ventral Hernia',
      reference: 'EHS 2020',
      keyPoints: [
        'Mesh reinforcement is standard for incisional hernia repair',
        'Pre-operative optimization reduces recurrence',
        'Smoking cessation mandatory before elective repair',
        'Weight optimization before surgery',
        'Choice of approach based on hernia characteristics and expertise'
      ]
    }
  ]
};

/**
 * Hiatal Hernia
 */
export const hiatalHernia: EducationCondition = {
  id: 'hernia-hiatal',
  name: 'Hiatal Hernia',
  category: 'E',
  icdCode: 'K44',
  description: 'A hiatal hernia occurs when part of the stomach pushes up through the diaphragm into the chest cavity through the hiatus (the opening where the esophagus passes through the diaphragm).',
  alternateNames: ['Hiatus Hernia', 'Diaphragmatic Hernia', 'Paraesophageal Hernia', 'Sliding Hiatal Hernia'],
  
  overview: {
    definition: 'A hiatal hernia develops when the upper part of the stomach pushes through the diaphragm\'s hiatus (the opening for the esophagus). There are two main types: Type I (Sliding): The gastroesophageal junction slides up into the chest. This is the most common type (95%) and is associated with gastroesophageal reflux. Type II-IV (Paraesophageal): Part or all of the stomach (and sometimes other organs) herniate alongside the esophagus. These carry risk of strangulation and are more likely to require surgery.',
    causes: [
      'Age-related weakening of diaphragm',
      'Increased abdominal pressure',
      'Obesity',
      'Pregnancy',
      'Chronic coughing',
      'Heavy lifting or straining',
      'Congenital large hiatus',
      'Previous esophageal or gastric surgery',
      'Trauma'
    ],
    symptoms: [
      'Heartburn (most common)',
      'Regurgitation of food or acid',
      'Difficulty swallowing (dysphagia)',
      'Chest pain',
      'Feeling full quickly',
      'Shortness of breath after eating',
      'Bloating',
      'Many small hiatal hernias have no symptoms'
    ],
    riskFactors: [
      'Age over 50',
      'Obesity',
      'Smoking',
      'Pregnancy',
      'Chronic cough',
      'Chronic constipation',
      'Heavy lifting',
      'Previous abdominal surgery'
    ],
    complications: [
      'Gastroesophageal reflux disease (GERD)',
      'Esophagitis (inflammation of esophagus)',
      'Barrett\'s esophagus (precancerous)',
      'Strangulation (paraesophageal - emergency)',
      'Gastric volvulus (stomach twisting)',
      'Anemia from chronic bleeding',
      'Aspiration pneumonia'
    ],
    prevalence: 'Hiatal hernias are very common, affecting up to 60% of people over 60. Most are Type I and asymptomatic.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Medical Management',
      duration: 'Ongoing',
      description: 'Most hiatal hernias are managed conservatively with lifestyle changes and medications. Surgery is reserved for failed medical therapy or complicated hernias.',
      goals: [
        'Confirm diagnosis and type',
        'Control reflux symptoms',
        'Prevent complications',
        'Identify need for surgery'
      ],
      activities: [
        'Upper GI endoscopy',
        'Barium swallow',
        'CT scan for large hernias',
        'Lifestyle modifications',
        'Acid-suppressing medication',
        'Weight management'
      ],
      medications: [
        {
          name: 'Proton pump inhibitors (PPIs)',
          purpose: 'Reduce acid production',
          duration: 'Long-term for reflux control'
        },
        {
          name: 'Antacids',
          purpose: 'Symptomatic relief',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Symptoms not controlled with medication',
        'Dysphagia worsening',
        'Weight loss',
        'Anemia',
        'Paraesophageal hernia identified'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Assessment (if surgery needed)',
      duration: '2-4 weeks',
      description: 'For patients requiring surgery: thorough assessment of hernia and esophageal function.',
      goals: [
        'Confirm surgical indication',
        'Assess esophageal function',
        'Optimize patient condition',
        'Plan surgical approach'
      ],
      activities: [
        'Esophageal manometry',
        'pH monitoring',
        'Upper GI series',
        'Nutritional assessment',
        'Weight optimization',
        'Cardiac and pulmonary assessment'
      ],
      warningSignsThisPhase: [
        'Acute incarceration',
        'Volvulus',
        'Severe dysphagia'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Repair',
      duration: 'Day of surgery',
      description: 'Laparoscopic repair is the standard approach, involving reducing the hernia, repairing the hiatus, and often adding an anti-reflux procedure.',
      goals: [
        'Reduce hernia contents to abdomen',
        'Repair hiatal defect',
        'Prevent recurrence',
        'Address reflux (fundoplication)'
      ],
      activities: [
        'Laparoscopic approach (usually)',
        'Reduce stomach to abdomen',
        'Crural repair (suture the hiatus)',
        'Fundoplication (wrap stomach around esophagus)',
        'May use mesh reinforcement for large defects'
      ],
      warningSignsThisPhase: [
        'Esophageal or gastric injury',
        'Pneumothorax',
        'Bleeding'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Recovery',
      duration: '4-6 weeks',
      description: 'Modified diet progression is essential after fundoplication to allow healing and prevent wrap disruption.',
      goals: [
        'Gradual diet progression',
        'Manage post-operative symptoms',
        'Prevent wrap disruption',
        'Return to normal eating'
      ],
      activities: [
        'Liquid diet initially',
        'Progressive diet stages',
        'Anti-emetics to prevent vomiting',
        'Gas-bloat management',
        'Gradual activity increase'
      ],
      warningSignsThisPhase: [
        'Inability to swallow',
        'Persistent vomiting',
        'Chest pain',
        'Fever'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Upper GI/Foregut surgeon',
      'Gastroenterologist',
      'Anesthetist',
      'Dietitian'
    ],
    investigations: [
      'Upper GI endoscopy',
      'Barium swallow/Upper GI series',
      'CT scan chest and abdomen',
      'Esophageal manometry',
      '24-hour pH monitoring',
      'Complete blood count (check for anemia)',
      'ECG and cardiac assessment'
    ],
    medications: [
      {
        medication: 'Proton pump inhibitors',
        instruction: 'continue until surgery',
        reason: 'Minimize reflux damage'
      },
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      }
    ],
    fastingInstructions: 'Clear liquids only day before, nothing from midnight',
    dayBeforeSurgery: [
      'Clear liquid diet',
      'Shower normally',
      'No heavy meals',
      'Pack for 1-2 night stay'
    ],
    whatToBring: [
      'Comfortable loose clothing',
      'List of medications',
      'CPAP machine if used',
      'Driver for discharge'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Take approved medications with sip of water',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'LAPAROSCOPIC HIATAL HERNIA REPAIR: Through 4-5 small incisions, the stomach is reduced from the chest back into the abdomen. The hiatal defect is repaired by suturing the crura (pillars of the diaphragm) together behind the esophagus. A FUNDOPLICATION is usually performed - the upper stomach (fundus) is wrapped around the lower esophagus to create a valve that prevents reflux. Common types include Nissen (360° wrap), Toupet (270° posterior), or Dor (anterior). Mesh reinforcement may be used for large defects.',
    duration: '1.5-3 hours',
    whatToExpect: 'Keyhole surgery with 4-5 small incisions. Usually 1-2 night hospital stay. Soft diet on discharge.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Head of bed elevated 30-45 degrees. Avoid lying flat.',
      expectedSymptoms: [
        'Shoulder tip pain (referred from diaphragm irritation)',
        'Difficulty swallowing initially (expected - will improve)',
        'Bloating and inability to burp or vomit',
        'Early satiety (feeling full quickly)',
        'Some chest discomfort'
      ],
      activityLevel: 'Walk same day of surgery. Deep breathing exercises. Avoid straining.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep wounds dry. Small dressings over port sites. Monitor for redness or discharge.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Dressings can be removed. Shower normally. Wounds should be healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10), shoulder pain can be bothersome',
      medications: [
        'Paracetamol regularly',
        'NSAIDs if not contraindicated',
        'Avoid effervescent tablets (cannot burp)',
        'Anti-emetics to prevent vomiting'
      ],
      nonPharmacological: [
        'Heat pack for shoulder pain',
        'Walking helps gas pain',
        'Peppermint tea for bloating',
        'Elevated sleeping position'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: '4-6 weeks',
        reason: 'Allow crural repair to heal'
      },
      {
        activity: 'Vomiting/Retching',
        restriction: 'Must avoid - use anti-emetics',
        duration: '6 weeks',
        reason: 'Can disrupt wrap'
      },
      {
        activity: 'Carbonated drinks',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Cannot burp - causes bloating'
      },
      {
        activity: 'Large meals',
        restriction: 'Small frequent meals only',
        duration: '4-6 weeks',
        reason: 'Stomach capacity reduced'
      }
    ],
    dietaryGuidelines: [
      'WEEK 1: Liquids only (water, broths, juice, smoothies)',
      'WEEK 2: Pureed foods (mashed potato, yogurt, soups)',
      'WEEKS 3-4: Soft foods (scrambled eggs, fish, pasta)',
      'WEEK 5+: Gradually return to normal diet',
      'Chew food very thoroughly',
      'Eat slowly',
      'Small frequent meals (6 per day initially)',
      'Avoid bread, dry meat, carbonated drinks initially'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Tolerating liquids and purees, shoulder pain settling'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Tolerating soft foods, swallowing improving'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Normal diet resumed, reflux symptoms resolved'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Full recovery, eating normally, off acid medications'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Durable reflux control in 85-90%'
      }
    ],
    functionalRecovery: 'Excellent relief of reflux symptoms in 85-90%. Dysphagia usually temporary. May lose some ability to burp or vomit.',
    cosmeticOutcome: '4-5 small scars (5-10mm) that fade over time.',
    successRate: 'Reflux symptom relief in 85-90%. Recurrence of hernia in 5-15%. May need revision surgery in 5-10%.',
    possibleComplications: [
      'Dysphagia (difficulty swallowing) - usually temporary',
      'Gas-bloat syndrome (inability to burp)',
      'Hernia recurrence (5-15%)',
      'Wrap migration or disruption',
      'Vagal nerve injury (rare)',
      'Splenic injury (rare)',
      'Need for revision surgery (5-10%)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check, diet progression, symptom assessment'
      },
      {
        timing: '6 weeks',
        purpose: 'Recovery assessment, clear for normal diet and activities'
      },
      {
        timing: '3-6 months',
        purpose: 'Assess long-term symptom control'
      },
      {
        timing: 'As needed',
        purpose: 'If symptoms recur'
      }
    ],
    rehabilitationNeeds: [
      'Diet education and progression',
      'Weight management',
      'Eating behavior modification'
    ],
    lifestyleModifications: [
      'Maintain healthy weight (prevents recurrence)',
      'Avoid large meals',
      'No eating within 3 hours of bed',
      'Elevate head of bed if any residual reflux',
      'Avoid very hot or very cold foods initially',
      'Chew food thoroughly permanently'
    ]
  },

  warningSigns: [
    'Complete inability to swallow (even liquids)',
    'Persistent vomiting (should not be able to vomit easily)',
    'Severe chest or abdominal pain',
    'Fever',
    'Worsening bloating',
    'Signs of dehydration'
  ],

  emergencySigns: [
    'Cannot swallow own saliva',
    'Severe unremitting chest pain',
    'High fever with abdominal pain',
    'Vomiting blood',
    'Signs of obstruction'
  ],

  complianceRequirements: [
    {
      requirement: 'Follow diet stages strictly',
      importance: 'critical',
      consequence: 'Eating solid food too early can disrupt repair'
    },
    {
      requirement: 'Avoid vomiting at all costs',
      importance: 'critical',
      consequence: 'Retching can disrupt fundoplication wrap'
    },
    {
      requirement: 'Take anti-emetics as prescribed',
      importance: 'critical',
      consequence: 'Prevents vomiting which damages repair'
    },
    {
      requirement: 'Eat small, frequent meals',
      importance: 'important',
      consequence: 'Large meals cause discomfort and bloating'
    }
  ],

  whoGuidelines: [
    {
      title: 'Guidelines for Hiatal Hernia and GERD Surgery',
      reference: 'SAGES 2021',
      keyPoints: [
        'Laparoscopic approach is preferred',
        'Fundoplication addresses reflux effectively',
        'Paraesophageal hernias should generally be repaired',
        'Diet progression is critical post-operatively',
        'Long-term follow-up for symptom recurrence'
      ]
    }
  ]
};

// Export hernia conditions part 2
export const herniaEducationPart2 = [incisionalHernia, hiatalHernia];
