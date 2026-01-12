/**
 * Patient Education Content - Category L: Systemic and Complicating Conditions
 * Part 3: Smoking and Surgery, Obesity and Surgery
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Perioperative Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Smoking and Surgery
 */
export const smokingAndSurgery: EducationCondition = {
  id: 'systemic-smoking-surgery',
  name: 'Smoking and Surgical Care',
  category: 'L',
  icdCode: 'F17.2',
  description: 'Understanding how smoking affects surgical outcomes and the importance of smoking cessation for surgical patients.',
  alternateNames: ['Tobacco Use and Surgery', 'Smoking Cessation for Surgery', 'Nicotine and Surgical Outcomes'],
  
  overview: {
    definition: 'Smoking is one of the most significant modifiable risk factors affecting surgical outcomes. Tobacco smoke contains over 4,000 chemicals that impair wound healing, reduce blood oxygen levels, compromise immune function, and increase cardiovascular and respiratory risks. Smokers have 2-3 times higher complication rates than non-smokers. Smoking cessation, even just 4-8 weeks before surgery, significantly reduces these risks.',
    causes: [
      'Nicotine addiction',
      'Long-term tobacco use',
      'Cigarette smoking',
      'Cigar/pipe smoking',
      'Smokeless tobacco',
      'E-cigarettes/vaping (also harmful)'
    ],
    symptoms: [
      'Active smoker or recent tobacco user',
      'Nicotine dependence',
      'History of smoking-related disease',
      'Chronic cough',
      'Reduced exercise tolerance'
    ],
    riskFactors: [
      'Heavy smoking (pack-years)',
      'Long duration of smoking',
      'Continued smoking close to surgery',
      'COPD or respiratory disease',
      'Cardiovascular disease',
      'Peripheral vascular disease',
      'Diabetes (combined risk is very high)'
    ],
    complications: [
      'Wound complications (2-4x higher)',
      'Wound infection',
      'Wound dehiscence (opening)',
      'Delayed healing',
      'Skin flap and graft failure',
      'Bone non-union',
      'Respiratory complications (pneumonia, need for ventilator)',
      'Cardiovascular events (heart attack, stroke)',
      'Anastomotic leak',
      'Increased mortality'
    ],
    prevalence: 'Approximately 15-20% of surgical patients are current smokers. In some surgical populations (vascular, head and neck), rates are higher.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Smoking Assessment and Counseling',
      duration: 'At surgical consultation',
      description: 'Assessing smoking status and providing strong cessation advice.',
      goals: [
        'Document smoking status',
        'Assess nicotine dependence',
        'Provide cessation counseling',
        'Offer cessation support',
        'Set quit date before surgery'
      ],
      activities: [
        'Ask about smoking status',
        'Assess pack-years history',
        'Fagerström test for nicotine dependence',
        'Brief cessation intervention',
        'Referral to smoking cessation services',
        'Prescription for nicotine replacement or cessation medications'
      ],
      warningSignsThisPhase: [
        'High nicotine dependence',
        'Previous failed quit attempts',
        'Lack of motivation to quit'
      ]
    },
    {
      phase: 2,
      name: 'Preoperative Cessation Period',
      duration: 'Ideally 4-8 weeks before surgery',
      description: 'Stopping smoking to reduce surgical risks.',
      goals: [
        'Complete smoking cessation',
        'Manage withdrawal symptoms',
        'Improve lung function',
        'Reduce carbon monoxide levels',
        'Prepare body for surgery'
      ],
      activities: [
        'Stop smoking completely',
        'Use nicotine replacement if needed',
        'Attend cessation support',
        'Exercise as tolerated',
        'Deep breathing exercises',
        'Avoid triggers'
      ],
      medications: [
        {
          name: 'Nicotine replacement (patch, gum, lozenge)',
          purpose: 'Manage withdrawal, improve quit rate',
          duration: '8-12 weeks total program'
        },
        {
          name: 'Varenicline (Champix)',
          purpose: 'Reduce cravings and withdrawal',
          duration: 'Start 1-2 weeks before quit date'
        },
        {
          name: 'Bupropion (Zyban)',
          purpose: 'Aid cessation',
          duration: 'Start 1-2 weeks before quit date'
        }
      ],
      warningSignsThisPhase: [
        'Unable to quit',
        'Severe withdrawal symptoms',
        'Relapse to smoking'
      ]
    },
    {
      phase: 3,
      name: 'Perioperative Period',
      duration: 'Day of surgery',
      description: 'Surgery with attention to smoking-related risks.',
      goals: [
        'No smoking on day of surgery',
        'Optimize oxygenation',
        'Prevent respiratory complications',
        'Careful surgical technique'
      ],
      activities: [
        'Confirm smoking status',
        'Preoxygenation',
        'Careful airway management',
        'Lung-protective ventilation',
        'Careful tissue handling'
      ],
      warningSignsThisPhase: [
        'Patient smoked close to surgery',
        'Respiratory issues during anesthesia',
        'Poor tissue quality'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Care',
      duration: 'Days to weeks',
      description: 'Enhanced monitoring and continued cessation.',
      goals: [
        'Prevent respiratory complications',
        'Optimize wound healing',
        'Maintain smoking cessation',
        'Early mobilization'
      ],
      activities: [
        'Deep breathing and coughing exercises',
        'Incentive spirometry',
        'Early mobilization',
        'Careful wound monitoring',
        'Continued cessation support',
        'Avoid second-hand smoke'
      ],
      medications: [
        {
          name: 'Continue nicotine replacement if needed',
          purpose: 'Maintain quit during stress of recovery',
          duration: 'As per cessation program'
        }
      ],
      warningSignsThisPhase: [
        'Respiratory symptoms (cough, sputum, fever)',
        'Wound problems',
        'Return to smoking',
        'Chest pain'
      ]
    },
    {
      phase: 5,
      name: 'Long-Term Cessation',
      duration: 'Lifelong',
      description: 'Maintaining permanent smoking cessation for long-term health.',
      goals: [
        'Permanent smoking cessation',
        'Complete recovery',
        'Long-term health improvement',
        'Reduced risk for future procedures'
      ],
      activities: [
        'Continued cessation support',
        'Address relapse if occurs',
        'Regular exercise',
        'Healthy lifestyle',
        'Avoid triggers'
      ],
      warningSignsThisPhase: [
        'Relapse to smoking',
        'Cravings persisting',
        'Stressful situations triggering urges'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Surgeon',
      'Smoking cessation service',
      'Primary care physician',
      'Respiratory physician if lung disease'
    ],
    investigations: [
      'Lung function tests (spirometry) if respiratory symptoms',
      'Chest X-ray if indicated',
      'Carbon monoxide level (optional to verify cessation)',
      'Cardiac assessment if high risk'
    ],
    medications: [
      {
        medication: 'Nicotine replacement',
        instruction: 'discuss',
        reason: 'Can use during cessation; some surgeons prefer to stop 24 hours before surgery'
      },
      {
        medication: 'Varenicline/Bupropion',
        instruction: 'continue',
        reason: 'Continue through surgery to maintain cessation'
      }
    ],
    fastingInstructions: 'Standard fasting as directed. No smoking or vaping.',
    dayBeforeSurgery: [
      'Do not smoke at all',
      'Avoid second-hand smoke',
      'Practice deep breathing',
      'Shower and prepare'
    ],
    whatToBring: [
      'Nicotine replacement if using',
      'Incentive spirometer if provided',
      'Comfortable loose clothing'
    ],
    dayOfSurgery: [
      'Do not smoke',
      'No nicotine gum or lozenge morning of surgery (aspiration risk)',
      'Nicotine patch may be removed (discuss with team)',
      'Be honest about last cigarette'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Any appropriate anesthesia with attention to airway',
    procedureDescription: 'Smokers may have more reactive airways and increased secretions. The anesthesia team takes extra care with airway management. Surgery proceeds with careful tissue handling as smokers have reduced tissue oxygen levels.',
    duration: 'Varies by procedure',
    whatToExpect: 'Surgery proceeds with attention to your smoking history. You may have extra respiratory care after surgery.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Head up position helps breathing. Move as directed.',
      expectedSymptoms: [
        'Possible increased secretions',
        'May need extra respiratory support',
        'Nicotine withdrawal symptoms possible',
        'Normal surgical recovery symptoms'
      ],
      activityLevel: 'Early mobilization very important - get up and walk as soon as able'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'Monitor wound closely. Smoker\'s wounds need extra attention. Report any concerns immediately.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'As per surgery type',
      medications: [
        'Standard pain medications',
        'Avoid oversedation that impairs deep breathing'
      ],
      nonPharmacological: [
        'Deep breathing exercises',
        'Positioning',
        'Early mobilization'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Smoking',
        restriction: 'Absolutely do not smoke',
        duration: 'Permanently if possible; minimum 4-6 weeks',
        reason: 'Smoking devastates wound healing'
      },
      {
        activity: 'Vaping/e-cigarettes',
        restriction: 'Avoid',
        duration: 'Same as smoking',
        reason: 'Also contains harmful chemicals'
      },
      {
        activity: 'Second-hand smoke exposure',
        restriction: 'Avoid',
        duration: 'During recovery and beyond',
        reason: 'Also impairs healing'
      }
    ],
    dietaryGuidelines: [
      'Healthy balanced diet',
      'Vitamin C rich foods may support healing',
      'Avoid using food as substitute for cigarettes',
      'Stay hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '48-72 hours',
        expectation: 'Worse of nicotine withdrawal passing'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Lung function improving, wound healing progressing'
      }
    ],
    longTerm: [
      {
        timeframe: '4-6 weeks',
        expectation: 'Wound healed (if no complications)'
      },
      {
        timeframe: '3-6 months',
        expectation: 'Significant improvement in lung function if quit permanently'
      }
    ],
    functionalRecovery: 'Quitting smoking improves recovery. Continued smoking significantly impairs outcomes.',
    cosmeticOutcome: 'Smokers have worse scarring and more wound complications.',
    successRate: 'Patients who quit 4-8 weeks before surgery have outcomes approaching non-smokers.',
    possibleComplications: [
      {
        complication: 'Wound complications',
        riskLevel: 'high',
        prevention: 'Smoking cessation 4-8 weeks before',
        management: 'Wound care, possible debridement, additional surgery'
      },
      {
        complication: 'Respiratory complications',
        riskLevel: 'high',
        prevention: 'Smoking cessation, lung exercises',
        management: 'Respiratory support, antibiotics if infection'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'As per surgery',
        purpose: 'Surgical follow-up with attention to wound healing'
      },
      {
        timing: 'Ongoing',
        purpose: 'Smoking cessation support'
      }
    ],
    rehabilitationNeeds: [
      'Respiratory physiotherapy if needed',
      'Continued smoking cessation support',
      'Standard surgical rehabilitation'
    ],
    lifestyleModifications: [
      'Permanent smoking cessation (most important)',
      'Regular exercise',
      'Healthy diet',
      'Avoid all tobacco products',
      'Avoid vaping/e-cigarettes'
    ]
  },

  warningSigns: [
    'Wound not healing, opening, or discharging',
    'Increased wound pain or redness',
    'Fever',
    'Productive cough, yellow/green sputum',
    'Shortness of breath',
    'Chest pain',
    'Skin around wound looking dusky or dead'
  ],

  emergencySigns: [
    'Severe shortness of breath',
    'Chest pain (possible heart attack)',
    'Signs of severe wound infection',
    'Tissue dying (black, foul-smelling)'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete smoking cessation',
      importance: 'critical',
      consequence: 'Smoking is the single most harmful factor for surgical outcomes'
    },
    {
      requirement: 'Quit at least 4 weeks before elective surgery',
      importance: 'critical',
      consequence: 'This timeframe significantly reduces complications'
    },
    {
      requirement: 'Do not smoke after surgery',
      importance: 'critical',
      consequence: 'Post-operative smoking causes wound failure'
    },
    {
      requirement: 'Deep breathing and coughing exercises',
      importance: 'important',
      consequence: 'Prevents pneumonia'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Tobacco Cessation',
      reference: 'WHO FCTC and Surgical Guidelines',
      keyPoints: [
        'Smoking cessation reduces surgical complications by up to 50%',
        '4-8 weeks of cessation before surgery is ideal',
        'Even short-term cessation helps (carbon monoxide clears in 24-48 hours)',
        'Use pharmacotherapy to support cessation',
        'Surgical setting is a teachable moment for permanent cessation'
      ]
    }
  ]
};

/**
 * Obesity and Surgery
 */
export const obesityAndSurgery: EducationCondition = {
  id: 'systemic-obesity-surgery',
  name: 'Obesity and Surgical Care',
  category: 'L',
  icdCode: 'E66.9',
  description: 'Perioperative considerations for obese and morbidly obese patients undergoing surgery.',
  alternateNames: ['Bariatric Surgical Patient', 'Overweight and Surgery', 'Morbid Obesity Surgery Considerations'],
  
  overview: {
    definition: 'Obesity (BMI ≥30 kg/m²) and especially morbid obesity (BMI ≥40 kg/m²) present unique challenges for surgical care. These include technical difficulties due to body habitus, increased complication rates, and associated conditions (diabetes, sleep apnea, heart disease). However, with proper preparation and techniques, obese patients can have successful surgical outcomes. Some surgeries may require weight loss before proceeding.',
    causes: [
      'Pre-existing obesity',
      'Morbid obesity (BMI ≥40)',
      'Super obesity (BMI ≥50)',
      'Associated metabolic syndrome',
      'Genetic and lifestyle factors',
      'Medications causing weight gain'
    ],
    symptoms: [
      'BMI ≥30 kg/m²',
      'Central adiposity',
      'Limited mobility',
      'Associated conditions (diabetes, hypertension, sleep apnea)',
      'Reduced exercise tolerance'
    ],
    riskFactors: [
      'Very high BMI (>40)',
      'Central/abdominal obesity',
      'Associated diabetes',
      'Obstructive sleep apnea',
      'Cardiovascular disease',
      'Reduced mobility',
      'Major surgery',
      'Emergency surgery'
    ],
    complications: [
      'Wound complications (infection, dehiscence)',
      'Deep vein thrombosis/pulmonary embolism',
      'Respiratory complications',
      'Cardiovascular events',
      'Technical surgical difficulties',
      'Longer operative time',
      'Anesthetic challenges',
      'Positioning injuries',
      'Delayed recovery'
    ],
    prevalence: 'Obesity affects over 30% of adults in many countries. Surgical rates in obese patients are increasing.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Preoperative Assessment',
      duration: 'Weeks to months before surgery',
      description: 'Comprehensive assessment and optimization of obesity-related conditions.',
      goals: [
        'Assess obesity-related risks',
        'Screen for sleep apnea',
        'Optimize diabetes and hypertension',
        'Consider weight loss if time permits',
        'Plan anesthetic approach'
      ],
      activities: [
        'Calculate BMI',
        'STOP-BANG questionnaire for sleep apnea',
        'Sleep study if indicated',
        'Cardiac assessment',
        'Blood glucose/HbA1c',
        'Chest X-ray',
        'Anesthesia consultation',
        'Dietitian consultation for weight loss if surgery not urgent'
      ],
      warningSignsThisPhase: [
        'Undiagnosed severe sleep apnea',
        'Uncontrolled diabetes',
        'Very high BMI (>50) requiring special equipment',
        'Poor cardiac function'
      ]
    },
    {
      phase: 2,
      name: 'Preoperative Optimization',
      duration: 'Weeks before elective surgery',
      description: 'Optimizing weight and comorbidities before surgery if possible.',
      goals: [
        'Weight loss if time permits (even 5-10% helps)',
        'CPAP compliance if sleep apnea',
        'Optimize blood sugar',
        'Exercise and mobility improvement',
        'Psychological preparation'
      ],
      activities: [
        'Supervised weight loss program',
        'Low calorie diet',
        'CPAP therapy optimization',
        'Diabetes management intensification',
        'Pre-habilitation exercises',
        'VTE risk assessment'
      ],
      medications: [
        {
          name: 'Weight loss medications (if indicated)',
          purpose: 'Aid preoperative weight loss',
          duration: 'Weeks to months'
        },
        {
          name: 'CPAP for sleep apnea',
          purpose: 'Reduce perioperative respiratory complications',
          duration: 'Nightly, ongoing'
        }
      ],
      warningSignsThisPhase: [
        'Unable to lose weight',
        'Non-compliance with CPAP',
        'Worsening diabetes',
        'Unable to exercise'
      ]
    },
    {
      phase: 3,
      name: 'Perioperative Care',
      duration: 'Day of surgery',
      description: 'Special considerations during anesthesia and surgery.',
      goals: [
        'Safe anesthesia',
        'Appropriate positioning and equipment',
        'VTE prophylaxis',
        'Careful surgical technique',
        'Prevent pressure injuries'
      ],
      activities: [
        'Specialized equipment if needed (table, instruments)',
        'Careful positioning to prevent nerve/pressure injury',
        'Enhanced VTE prophylaxis',
        'Attention to airway management',
        'Longer surgical time expected',
        'Possible laparoscopic approach (reduces wound issues)'
      ],
      warningSignsThisPhase: [
        'Difficult airway',
        'Positioning complications',
        'Unexpected findings due to body habitus',
        'Bleeding'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Care',
      duration: 'Days to weeks',
      description: 'Enhanced monitoring and complication prevention.',
      goals: [
        'Prevent respiratory complications',
        'Prevent blood clots',
        'Promote wound healing',
        'Early mobilization',
        'Resume CPAP'
      ],
      activities: [
        'Head-up positioning',
        'Early mobilization (very important)',
        'CPAP immediately post-op if sleep apnea',
        'Extended VTE prophylaxis',
        'Wound monitoring',
        'Blood glucose control',
        'Respiratory support as needed'
      ],
      medications: [
        {
          name: 'VTE prophylaxis (enoxaparin)',
          purpose: 'Prevent blood clots (higher doses may be needed)',
          duration: 'Until fully mobile; consider extended prophylaxis'
        },
        {
          name: 'Standard medications',
          purpose: 'As per surgery type',
          duration: 'As directed'
        }
      ],
      warningSignsThisPhase: [
        'Respiratory distress',
        'Wound problems',
        'Leg swelling (DVT)',
        'Chest pain (PE)',
        'Poor mobility'
      ]
    },
    {
      phase: 5,
      name: 'Recovery and Long-Term',
      duration: 'Weeks to months',
      description: 'Complete recovery and long-term weight management.',
      goals: [
        'Complete wound healing',
        'Return to normal activities',
        'Address underlying obesity',
        'Prevent recurrence of surgical problem'
      ],
      activities: [
        'Wound care until healed',
        'Gradual activity increase',
        'Weight management counseling',
        'Consider bariatric surgery if appropriate',
        'Long-term health optimization'
      ],
      warningSignsThisPhase: [
        'Delayed wound healing',
        'Incisional hernia',
        'Weight regain affecting outcomes',
        'Recurrence of original problem'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Surgeon',
      'Anesthesiologist (mandatory for high BMI)',
      'Cardiologist if heart concerns',
      'Sleep medicine if sleep apnea suspected',
      'Dietitian',
      'Endocrinologist if diabetes'
    ],
    investigations: [
      'ECG',
      'Chest X-ray',
      'Blood tests including HbA1c',
      'STOP-BANG screening',
      'Sleep study if indicated',
      'Echocardiogram if cardiac concerns',
      'Pulmonary function tests if respiratory symptoms'
    ],
    medications: [
      {
        medication: 'Diabetes medications',
        instruction: 'discuss',
        reason: 'Adjust as per diabetes guidelines for surgery'
      },
      {
        medication: 'Blood pressure medications',
        instruction: 'continue',
        reason: 'Usually continue'
      },
      {
        medication: 'CPAP',
        instruction: 'continue',
        reason: 'Bring CPAP to hospital - will use after surgery'
      }
    ],
    fastingInstructions: 'Standard fasting guidelines. CPAP can be used until going to OR.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap (pay attention to skin folds)',
      'Ensure CPAP is clean and ready to bring',
      'Prepare loose comfortable clothing',
      'Get good rest'
    ],
    whatToBring: [
      'CPAP machine if you use one (essential)',
      'All medications',
      'Very loose comfortable clothing',
      'Support stockings if provided'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Bring CPAP',
      'Wear support stockings if provided',
      'Take approved medications',
      'Inform team of sleep apnea status'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Any appropriate anesthesia with special considerations for airway and dosing',
    procedureDescription: 'Surgery in obese patients requires specialized equipment (tables, instruments), careful positioning to prevent nerve and pressure injuries, and often takes longer. Laparoscopic/minimally invasive approaches are preferred when possible as they reduce wound complications. The anesthesia team takes special care with airway management.',
    duration: 'May be longer than in non-obese patients',
    whatToExpect: 'Surgery may take longer. Special attention is paid to positioning you safely. You may be in a head-up position. Extra care is taken with your airway.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Head of bed elevated (helps breathing). May need special positioning.',
      expectedSymptoms: [
        'Possible need for extra oxygen',
        'CPAP resumed if you use it',
        'Support stockings/compression devices',
        'May feel tired',
        'Normal surgical symptoms'
      ],
      activityLevel: 'Get up and walk as soon as safely possible - extremely important to prevent blood clots'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'Keep wound clean and dry. Pay attention to skin folds. Monitor for signs of infection. May take longer to heal.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'As per surgery type',
      medications: [
        'Careful opioid dosing (respiratory effects)',
        'Multimodal pain management',
        'Consider regional techniques'
      ],
      nonPharmacological: [
        'Positioning',
        'Ice if appropriate',
        'Early mobilization reduces pain'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Staying in bed',
        restriction: 'Avoid prolonged bed rest',
        duration: 'Get up within hours if possible',
        reason: 'Blood clot prevention (critical)'
      },
      {
        activity: 'As per surgery type',
        restriction: 'Follow surgical instructions',
        duration: 'As directed',
        reason: 'Normal surgical recovery'
      }
    ],
    dietaryGuidelines: [
      'Resume eating as directed',
      'Consider using surgery as motivation for healthy eating',
      'High protein for wound healing',
      'Avoid excessive calories',
      'Consider post-operative nutritional counseling'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Walking, breathing exercises, CPAP resumed'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Recovering, wound healing beginning'
      }
    ],
    longTerm: [
      {
        timeframe: '4-8 weeks',
        expectation: 'Wound healed (may be slower than normal)'
      },
      {
        timeframe: 'Ongoing',
        expectation: 'Address obesity for long-term health'
      }
    ],
    functionalRecovery: 'Recovery may be slightly slower. Good outcomes achievable with proper management.',
    cosmeticOutcome: 'May have more wound complications and scarring. Skin folds may affect wound healing.',
    successRate: 'With proper perioperative management, obese patients can have successful surgical outcomes.',
    possibleComplications: [
      {
        complication: 'VTE (blood clots)',
        riskLevel: 'high',
        prevention: 'Early mobilization, extended prophylaxis, compression',
        management: 'Anticoagulation, possible IVC filter'
      },
      {
        complication: 'Wound infection',
        riskLevel: 'moderate',
        prevention: 'Good blood sugar control, proper antibiotics',
        management: 'Antibiotics, wound care, possible debridement'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'As per surgery',
        purpose: 'Surgical follow-up'
      },
      {
        timing: 'Ongoing',
        purpose: 'Weight management support'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy to improve mobility',
      'Weight management program',
      'Respiratory support if sleep apnea',
      'Standard surgical rehabilitation'
    ],
    lifestyleModifications: [
      'Use surgery as opportunity for lifestyle change',
      'Consider formal weight loss program',
      'Improve diet quality',
      'Increase physical activity as able',
      'Ensure compliance with CPAP if prescribed',
      'Consider bariatric surgery evaluation if appropriate'
    ]
  },

  warningSigns: [
    'Wound redness, swelling, discharge',
    'Leg swelling or pain (possible DVT)',
    'Shortness of breath (possible PE)',
    'Fever',
    'Poor wound healing',
    'Increased fatigue or sleepiness'
  ],

  emergencySigns: [
    'Sudden shortness of breath (PE)',
    'Chest pain',
    'Severe leg pain and swelling',
    'Confusion or decreased consciousness',
    'Signs of severe infection'
  ],

  complianceRequirements: [
    {
      requirement: 'Use CPAP after surgery if prescribed',
      importance: 'critical',
      consequence: 'Prevents dangerous respiratory complications'
    },
    {
      requirement: 'Get up and walk as soon as possible',
      importance: 'critical',
      consequence: 'Prevents life-threatening blood clots'
    },
    {
      requirement: 'Continue VTE prophylaxis as prescribed',
      importance: 'critical',
      consequence: 'Obesity increases clot risk significantly'
    },
    {
      requirement: 'Monitor wound in skin folds',
      importance: 'important',
      consequence: 'Early detection of infection in high-risk areas'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Obesity',
      reference: 'WHO Obesity Prevention and Surgical Guidelines',
      keyPoints: [
        'Preoperative optimization of comorbidities',
        'Enhanced VTE prophylaxis',
        'Early mobilization critical',
        'CPAP compliance for sleep apnea',
        'Multidisciplinary approach',
        'Long-term weight management support'
      ]
    }
  ]
};

// Export systemic conditions part 3
export const systemicConditionsPart3 = [smokingAndSurgery, obesityAndSurgery];
