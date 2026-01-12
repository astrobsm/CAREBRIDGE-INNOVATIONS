/**
 * Patient Education Content - Category I: Cosmetic and Elective Reconstructive Procedures
 * Part 3: Liposuction and Breast Augmentation
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Liposuction
 */
export const liposuction: EducationCondition = {
  id: 'cosmetic-liposuction',
  name: 'Liposuction',
  category: 'I',
  icdCode: 'Z41.1',
  description: 'Liposuction is a surgical procedure that removes excess fat deposits from specific areas of the body to improve body contours and proportion.',
  alternateNames: ['Lipoplasty', 'Suction-Assisted Lipectomy', 'Liposculpture', 'Body Contouring'],
  
  overview: {
    definition: 'Liposuction is a surgical technique that uses suction to remove fat from specific areas of the body such as the abdomen, hips, thighs, buttocks, arms, or chin. It is a body contouring procedure that shapes and contours areas of the body that have not responded to diet and exercise. Liposuction is not a weight loss solution or treatment for obesity, but rather a sculpting procedure for specific problem areas.',
    causes: [
      'Localized fat deposits resistant to diet and exercise',
      'Genetic predisposition to fat accumulation in certain areas',
      'Body contour irregularities',
      'Lipomas (fatty tumors)',
      'Gynecomastia (male breast enlargement)',
      'Lipodystrophy (abnormal fat distribution)'
    ],
    symptoms: [
      'Stubborn fat deposits in specific areas',
      'Disproportionate body contours',
      'Fat that does not respond to healthy lifestyle',
      'Excess fat under chin or neck',
      'Love handles or flank fat',
      'Thigh or buttock fat accumulation'
    ],
    riskFactors: [
      'Obesity (not suitable if BMI too high)',
      'Poor skin elasticity',
      'Smoking',
      'Cardiac or pulmonary disease',
      'Bleeding disorders',
      'Unrealistic expectations'
    ],
    complications: [
      'Contour irregularities',
      'Fluid accumulation (seroma)',
      'Numbness',
      'Infection',
      'Fat embolism (rare but serious)',
      'Skin irregularities or waviness',
      'Asymmetry',
      'Need for revision',
      'Lidocaine toxicity with tumescent technique'
    ],
    prevalence: 'Liposuction is one of the most commonly performed cosmetic procedures worldwide, with over 250,000 procedures performed annually in the United States.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Planning',
      duration: '2-4 weeks before surgery',
      description: 'Evaluation of areas of concern, assessment of skin quality, and determination of best approach.',
      goals: [
        'Assess candidacy',
        'Identify treatment areas',
        'Set realistic expectations',
        'Complete medical evaluation'
      ],
      activities: [
        'Physical examination of fat deposits and skin quality',
        'Photography documentation',
        'Medical history review',
        'Discussion of technique options',
        'Weight stabilization'
      ],
      warningSignsThisPhase: [
        'Unrealistic expectations',
        'BMI too high for safe procedure',
        'Poor skin elasticity'
      ]
    },
    {
      phase: 2,
      name: 'Surgery Day',
      duration: '1-4 hours',
      description: 'The liposuction procedure is performed using tumescent technique with local or general anesthesia.',
      goals: [
        'Safely remove fat',
        'Create smooth contours',
        'Minimize blood loss',
        'Ensure symmetry'
      ],
      activities: [
        'Infiltration of tumescent solution',
        'Fat removal through small incisions',
        'Contouring of treated areas',
        'Assessment of symmetry',
        'Application of compression garment'
      ],
      warningSignsThisPhase: [
        'Excessive blood loss',
        'Signs of lidocaine toxicity',
        'Anesthesia complications'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Recovery',
      duration: 'Days 1-14',
      description: 'Swelling, bruising, and fluid drainage are expected. Compression garment is worn continuously.',
      goals: [
        'Manage swelling and bruising',
        'Prevent complications',
        'Maintain compression',
        'Monitor healing'
      ],
      activities: [
        'Wear compression garment 24/7',
        'Allow tumescent fluid to drain',
        'Take medications as prescribed',
        'Light walking to prevent blood clots',
        'Expect significant bruising and swelling'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '5-7 days'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5 days'
        }
      ],
      warningSignsThisPhase: [
        'Fever above 38°C (100.4°F)',
        'Severe pain not relieved by medication',
        'Excessive swelling or firmness',
        'Signs of infection'
      ]
    },
    {
      phase: 4,
      name: 'Progressive Recovery',
      duration: 'Weeks 2-6',
      description: 'Gradual resolution of swelling and bruising. Return to most activities. Continued compression wear.',
      goals: [
        'Reduce swelling',
        'Return to work',
        'Gradual activity increase',
        'Monitor contour results'
      ],
      activities: [
        'Continue compression garment (4-6 weeks total)',
        'Return to desk work at 1-2 weeks',
        'Light exercise at 2-3 weeks',
        'Massage if recommended',
        'Healthy diet and hydration'
      ],
      warningSignsThisPhase: [
        'Fluid collection',
        'Contour irregularities',
        'Persistent numbness'
      ]
    },
    {
      phase: 5,
      name: 'Final Results',
      duration: '3-6 months',
      description: 'Swelling fully resolves, final contours visible, skin retracts.',
      goals: [
        'Complete swelling resolution',
        'Final contour assessment',
        'Maintain results',
        'Address any concerns'
      ],
      activities: [
        'Regular follow-up',
        'Maintain stable weight',
        'Regular exercise',
        'Healthy lifestyle'
      ],
      warningSignsThisPhase: [
        'Significant asymmetry',
        'Contour problems requiring revision'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon consultation',
      'Medical clearance if indicated'
    ],
    investigations: [
      'Blood tests: full blood count, metabolic panel',
      'Photography documentation'
    ],
    medications: [
      {
        medication: 'Aspirin and NSAIDs',
        instruction: 'stop',
        reason: 'Increase bruising - stop 2 weeks before'
      },
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      }
    ],
    fastingInstructions: 'No food for 6 hours before if sedation or general anesthesia.',
    dayBeforeSurgery: [
      'Shower with antibacterial soap',
      'Prepare comfortable recovery area',
      'Have compression garment ready',
      'Arrange transportation'
    ],
    whatToBring: [
      'Loose dark clothing',
      'Compression garment if provided',
      'Driver',
      'Medications list'
    ],
    dayOfSurgery: [
      'Shower with antibacterial soap',
      'Do not apply lotions',
      'Wear loose comfortable clothing',
      'Arrive at scheduled time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia with sedation (most common) or general anesthesia for larger volume cases',
    procedureDescription: 'Small incisions (3-4mm) are made in inconspicuous locations. Tumescent solution (saline with lidocaine and epinephrine) is infiltrated into the fat layer. A thin hollow tube (cannula) is inserted through the incisions and used to suction out the fat. The cannula is moved back and forth in a fanning pattern to remove fat evenly and create smooth contours. Multiple areas can be treated in one session.',
    duration: '1-4 hours depending on number of areas',
    whatToExpect: 'If awake, you will feel pushing and pressure. There is no pain due to the tumescent anesthesia. You may hear the suction machine. Afterwards, you will have a compression garment on.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Can move around. No specific position required. Walking encouraged.',
      expectedSymptoms: [
        'Drainage of blood-tinged fluid for 24-48 hours',
        'Significant swelling',
        'Bruising (may be extensive)',
        'Soreness similar to muscle ache',
        'Numbness in treated areas',
        'Tightness from compression garment'
      ],
      activityLevel: 'Light activity. Walk around to prevent blood clots. Avoid strenuous activity.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Allow incisions to drain. Place absorbent pads under compression garment. Change as needed.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Drainage stops. May shower. Keep incisions clean. Continue compression garment.'
      },
      {
        day: 'Weeks 1-6',
        instruction: 'Continue compression garment as directed. Incisions heal quickly.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10). Soreness similar to workout.',
      medications: [
        'Prescribed pain medication for first few days',
        'Paracetamol usually sufficient after day 3',
        'Avoid aspirin and NSAIDs for 2 weeks'
      ],
      nonPharmacological: [
        'Compression garment reduces discomfort',
        'Gentle walking',
        'Cool compresses if swelling significant'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '3-4 weeks',
        reason: 'Allows healing and swelling to resolve'
      },
      {
        activity: 'Work (desk job)',
        restriction: 'Can return',
        duration: '3-7 days',
        reason: 'Light activity is fine'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: '3 weeks',
        reason: 'Incisions need to heal'
      }
    ],
    dietaryGuidelines: [
      'Healthy balanced diet',
      'Adequate protein for healing',
      'Stay well hydrated',
      'Limit salt to reduce swelling',
      'Maintain stable weight'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Drainage stopped, significant swelling and bruising'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Return to work, bruising fading, swelling improving'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Return to exercise, most swelling resolved'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Near-final result, contours visible'
      },
      {
        timeframe: '6 months',
        expectation: 'Final result, skin retraction complete'
      }
    ],
    functionalRecovery: 'Full recovery within 2-4 weeks. Return to all activities including exercise by 4-6 weeks.',
    cosmeticOutcome: 'Improved body contours. Fat is permanently removed from treated areas. Results are long-lasting with stable weight. Scars are minimal (3-4mm) and typically imperceptible.',
    successRate: 'High patient satisfaction rates (>90%). Results are permanent if weight is maintained.',
    possibleComplications: [
      {
        complication: 'Contour irregularities',
        riskLevel: 'moderate',
        prevention: 'Experienced surgeon, appropriate technique',
        management: 'Revision liposuction if needed'
      },
      {
        complication: 'Seroma',
        riskLevel: 'low',
        prevention: 'Proper compression, drainage',
        management: 'Aspiration'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Check healing, assess for complications'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Evaluate early result'
      },
      {
        timing: '3 months',
        purpose: 'Assess final contours'
      },
      {
        timing: '6 months',
        purpose: 'Final result evaluation'
      }
    ],
    rehabilitationNeeds: [
      'No formal rehabilitation',
      'Lymphatic massage may help swelling (optional)'
    ],
    lifestyleModifications: [
      'Maintain stable weight - essential',
      'Regular exercise',
      'Healthy diet',
      'Compression garment wear as directed'
    ]
  },

  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Severe pain not relieved by medication',
    'Increasing swelling after day 3',
    'Signs of infection: redness, warmth, pus',
    'Significant asymmetry'
  ],

  emergencySigns: [
    'Difficulty breathing (possible fat embolism)',
    'Chest pain',
    'Severe dizziness or confusion',
    'Signs of severe infection',
    'Excessive bleeding'
  ],

  complianceRequirements: [
    {
      requirement: 'Wear compression garment as directed',
      importance: 'critical',
      consequence: 'Reduces swelling, prevents irregularities'
    },
    {
      requirement: 'Maintain stable weight',
      importance: 'critical',
      consequence: 'Weight gain will diminish results'
    },
    {
      requirement: 'Walk regularly after surgery',
      importance: 'important',
      consequence: 'Prevents blood clots'
    }
  ],

  whoGuidelines: [
    {
      title: 'Safe Surgical Practice',
      reference: 'WHO Guidelines',
      keyPoints: [
        'Appropriate patient selection',
        'Safe anesthesia limits',
        'Monitoring for complications',
        'Sterile technique'
      ]
    }
  ]
};

/**
 * Breast Augmentation
 */
export const breastAugmentation: EducationCondition = {
  id: 'cosmetic-breast-augmentation',
  name: 'Breast Augmentation',
  category: 'I',
  icdCode: 'Z41.1',
  description: 'Breast augmentation is a surgical procedure to increase breast size, improve shape, or restore volume using implants or fat transfer.',
  alternateNames: ['Augmentation Mammoplasty', 'Breast Implants', 'Breast Enhancement', 'Boob Job'],
  
  overview: {
    definition: 'Breast augmentation is a surgical procedure to enhance breast size and shape using silicone or saline implants, or in some cases, fat transfer (lipofilling). The procedure can increase breast volume, improve symmetry, and restore fullness lost after weight loss or pregnancy. It is one of the most commonly performed cosmetic surgeries worldwide.',
    causes: [
      'Desire for larger breasts',
      'Breast asymmetry',
      'Loss of volume after pregnancy or breastfeeding',
      'Weight loss causing deflated breasts',
      'Congenital breast underdevelopment',
      'Reconstruction after mastectomy'
    ],
    symptoms: [
      'Small breast size relative to body',
      'Asymmetric breasts',
      'Loss of breast fullness',
      'Deflated appearance after pregnancy',
      'Difficulty finding properly fitting bras',
      'Self-consciousness about breast appearance'
    ],
    riskFactors: [
      'Unrealistic expectations',
      'Family history of breast cancer',
      'Autoimmune conditions',
      'Smoking',
      'Active infection',
      'Plans for significant weight change'
    ],
    complications: [
      'Capsular contracture (scar tissue tightening)',
      'Implant rupture or leak',
      'Infection',
      'Changes in nipple sensation',
      'Implant malposition',
      'Asymmetry',
      'Need for revision surgery',
      'Breast implant-associated anaplastic large cell lymphoma (BIA-ALCL) - rare'
    ],
    prevalence: 'Breast augmentation is one of the most popular cosmetic surgeries globally, with over 300,000 procedures performed annually in the United States.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Implant Selection',
      duration: '2-4 weeks before surgery',
      description: 'Detailed discussion of goals, implant options, sizing, and surgical planning.',
      goals: [
        'Determine ideal implant size and type',
        'Choose incision location',
        'Discuss placement (above or below muscle)',
        'Set realistic expectations'
      ],
      activities: [
        'Breast measurements',
        'Implant sizing (try-on)',
        'Discussion of implant types (silicone vs saline)',
        'Photography documentation',
        'Medical history review'
      ],
      warningSignsThisPhase: [
        'Unrealistic expectations',
        'Breast abnormalities requiring further investigation',
        'Medical conditions affecting surgery'
      ]
    },
    {
      phase: 2,
      name: 'Surgery Day',
      duration: '1-2 hours',
      description: 'Breast implants are placed through chosen incision site and position.',
      goals: [
        'Safely insert implants',
        'Achieve symmetry',
        'Proper implant positioning',
        'Natural appearance'
      ],
      activities: [
        'General anesthesia',
        'Incision (inframammary, periareolar, or axillary)',
        'Creation of implant pocket',
        'Implant insertion',
        'Symmetry assessment',
        'Incision closure'
      ],
      warningSignsThisPhase: [
        'Bleeding',
        'Anesthesia complications'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Recovery',
      duration: 'Days 1-14',
      description: 'Initial healing with swelling, tightness, and implants sitting high. Supportive bra worn.',
      goals: [
        'Manage swelling and discomfort',
        'Prevent complications',
        'Allow implants to settle',
        'Protect incisions'
      ],
      activities: [
        'Wear supportive surgical bra',
        'Rest with limited arm movement',
        'Take medications as prescribed',
        'Sleep on back',
        'Avoid lifting arms above head'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '5-7 days'
        },
        {
          name: 'Muscle relaxant',
          purpose: 'Help with muscle spasm if under muscle',
          duration: '3-5 days'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5 days'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Severe asymmetric swelling',
        'Signs of infection',
        'Excessive pain'
      ]
    },
    {
      phase: 4,
      name: 'Early Healing',
      duration: 'Weeks 2-6',
      description: 'Implants begin to settle into natural position. Gradual return to activities.',
      goals: [
        'Allow implants to drop and fluff',
        'Gradual activity increase',
        'Monitor healing',
        'Scar care'
      ],
      activities: [
        'Continue supportive bra',
        'Breast massage if directed',
        'Return to desk work at 1 week',
        'Light exercise at 3-4 weeks',
        'Scar care when incisions healed'
      ],
      warningSignsThisPhase: [
        'Hardening of breast (capsular contracture)',
        'Asymmetric implant position',
        'Wound healing problems'
      ]
    },
    {
      phase: 5,
      name: 'Final Results',
      duration: '3-6 months',
      description: 'Implants settle into final position. Swelling resolves. Final breast shape achieved.',
      goals: [
        'Complete healing',
        'Final implant position',
        'Return to all activities',
        'Enjoy results'
      ],
      activities: [
        'Return to all normal activities including exercise',
        'Regular bra wear',
        'Annual follow-up',
        'Breast self-examination'
      ],
      warningSignsThisPhase: [
        'New asymmetry',
        'Hardening',
        'Shape changes'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon consultation',
      'Mammogram if indicated by age or history'
    ],
    investigations: [
      'Baseline mammogram if over 40 or family history',
      'Blood tests if indicated',
      'Photography documentation'
    ],
    medications: [
      {
        medication: 'Aspirin and blood thinners',
        instruction: 'stop',
        reason: 'Increase bleeding - stop 2 weeks before'
      },
      {
        medication: 'Birth control',
        instruction: 'discuss',
        reason: 'May increase blood clot risk'
      }
    ],
    fastingInstructions: 'No food or drink after midnight before surgery.',
    dayBeforeSurgery: [
      'Shower and wash chest area',
      'Do not apply lotions or deodorant',
      'Prepare comfortable recovery area',
      'Get supportive bra or surgical bra ready'
    ],
    whatToBring: [
      'Loose front-opening top',
      'Supportive bra',
      'Driver',
      'Medications list'
    ],
    dayOfSurgery: [
      'Do not eat or drink',
      'Shower, no products on chest',
      'Wear comfortable front-opening clothing',
      'No jewelry'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'An incision is made in one of several locations: in the fold under the breast (inframammary - most common), around the areola (periareolar), or in the armpit (axillary). A pocket is created either behind the breast tissue (subglandular) or behind the chest muscle (submuscular/dual plane). The implant is inserted and positioned. The incision is closed in layers. Both sides are done, with careful attention to symmetry.',
    duration: '1-2 hours',
    whatToExpect: 'You will be asleep for the procedure. When you wake up, you will be wearing a supportive bra. Your breasts will feel tight and swollen. Implants will sit high initially and drop over weeks to months.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Sleep on back with upper body slightly elevated. Do not sleep on stomach or sides initially.',
      expectedSymptoms: [
        'Tightness and pressure in chest',
        'Swelling of breasts',
        'Bruising',
        'Implants sitting high (normal)',
        'Discomfort especially with movement',
        'Temporary numbness around incisions'
      ],
      activityLevel: 'Rest at home for first week. No lifting, pushing, or pulling. Limited arm movement.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep incisions dry. Wear surgical bra at all times. No showering until directed.'
      },
      {
        day: 'Week 1-2',
        instruction: 'May shower when cleared. Pat incisions dry. Continue surgical bra.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Keep incisions clean. Apply scar cream when fully healed. Continue supportive bra.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) first week, especially with submuscular placement. Improves significantly by week 2.',
      medications: [
        'Prescribed pain medication for first week',
        'Muscle relaxant if muscles tight',
        'Paracetamol after first week'
      ],
      nonPharmacological: [
        'Cold compresses (not on incisions)',
        'Supportive bra reduces movement',
        'Rest arms at sides',
        'Avoid reaching overhead'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Lifting more than 5kg',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Strain on muscles and healing'
      },
      {
        activity: 'Upper body exercise',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Allow muscle and pocket healing'
      },
      {
        activity: 'Sleeping on stomach/sides',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Pressure on implants'
      },
      {
        activity: 'Underwire bras',
        restriction: 'Avoid',
        duration: '3 months',
        reason: 'Pressure on incisions and implants'
      }
    ],
    dietaryGuidelines: [
      'Healthy balanced diet',
      'Adequate protein',
      'Stay hydrated',
      'Limit salt to reduce swelling'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Swollen, tight, implants high. Can return to desk work.'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Implants beginning to settle, swelling decreasing'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Can resume most activities, implants continuing to drop'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Near-final result, implants mostly settled'
      },
      {
        timeframe: '6 months',
        expectation: 'Final result, implants fully settled'
      },
      {
        timeframe: '10-20 years',
        expectation: 'Implants may need replacement eventually'
      }
    ],
    functionalRecovery: 'Most normal activities resume by 2 weeks. Full return to exercise by 6 weeks. No permanent functional limitations.',
    cosmeticOutcome: 'Fuller, more proportionate breasts. Natural-feeling with modern implants. Scars fade and become imperceptible in most cases.',
    successRate: 'High patient satisfaction (>90%). Implants are long-lasting but may need replacement after 10-20 years.',
    possibleComplications: [
      {
        complication: 'Capsular contracture',
        riskLevel: 'moderate',
        prevention: 'Modern implants, proper technique, massage',
        management: 'May require capsulectomy and implant exchange'
      },
      {
        complication: 'Implant rupture',
        riskLevel: 'low',
        prevention: 'Quality implants, avoid trauma',
        management: 'Implant replacement'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Wound check, assess healing'
      },
      {
        timing: '1 month',
        purpose: 'Evaluate implant position'
      },
      {
        timing: '3 months',
        purpose: 'Assess early result'
      },
      {
        timing: '6 months',
        purpose: 'Final result assessment'
      },
      {
        timing: 'Annually',
        purpose: 'Implant monitoring, breast examination'
      }
    ],
    rehabilitationNeeds: [
      'Breast massage as directed',
      'Gradual return to upper body exercise'
    ],
    lifestyleModifications: [
      'Wear supportive bras during exercise',
      'Continue breast self-examination',
      'Maintain stable weight',
      'Annual follow-up recommended'
    ]
  },

  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Increasing pain after first week',
    'Redness or warmth of breast',
    'Unusual discharge from incision',
    'Significant asymmetry',
    'Hardening of one breast'
  ],

  emergencySigns: [
    'Signs of severe infection: high fever, spreading redness',
    'Difficulty breathing',
    'Chest pain',
    'Severe allergic reaction'
  ],

  complianceRequirements: [
    {
      requirement: 'Wear supportive bra as directed',
      importance: 'important',
      consequence: 'Supports healing and implant position'
    },
    {
      requirement: 'Avoid upper body exercise for 6 weeks',
      importance: 'critical',
      consequence: 'Allows proper healing of muscle and pocket'
    },
    {
      requirement: 'Perform breast massage if instructed',
      importance: 'important',
      consequence: 'May help prevent capsular contracture'
    },
    {
      requirement: 'Attend annual follow-up',
      importance: 'important',
      consequence: 'Monitor for complications'
    }
  ],

  whoGuidelines: [
    {
      title: 'Medical Device Safety',
      reference: 'WHO Guidelines on Medical Devices',
      keyPoints: [
        'Use approved, quality implants',
        'Proper informed consent',
        'Long-term follow-up recommended',
        'Report adverse events'
      ]
    }
  ]
};

// Export cosmetic procedures part 3
export const cosmeticProceduresPart3 = [liposuction, breastAugmentation];
