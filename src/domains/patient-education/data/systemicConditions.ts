/**
 * Patient Education Content - Category L: Systemic and Complicating Conditions
 * Part 1: Diabetes and Surgery, Malnutrition and Surgery
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Perioperative Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Diabetes and Surgery
 */
export const diabetesAndSurgery: EducationCondition = {
  id: 'systemic-diabetes-surgery',
  name: 'Diabetes and Surgical Care',
  category: 'L',
  icdCode: 'E11.9',
  description: 'Management of diabetes mellitus in patients undergoing surgery, including perioperative glucose control and wound healing considerations.',
  alternateNames: ['Diabetic Surgical Patient', 'Perioperative Diabetes Management', 'Surgical Diabetes Care'],
  
  overview: {
    definition: 'Diabetes mellitus significantly affects surgical outcomes. High blood glucose impairs wound healing, increases infection risk, and affects overall recovery. Patients with diabetes require specialized perioperative management including careful glucose monitoring, medication adjustments, and vigilant wound care. Both Type 1 (insulin-dependent) and Type 2 diabetes require attention, with Type 1 patients having more complex insulin management needs.',
    causes: [
      'Pre-existing Type 1 diabetes',
      'Pre-existing Type 2 diabetes',
      'Gestational diabetes in pregnant surgical patients',
      'Stress-induced hyperglycemia in non-diabetics',
      'Steroid-induced diabetes'
    ],
    symptoms: [
      'Elevated blood glucose levels',
      'Increased thirst (polydipsia)',
      'Frequent urination (polyuria)',
      'Slow wound healing',
      'Increased susceptibility to infections',
      'Peripheral neuropathy (numbness)',
      'Poor circulation'
    ],
    riskFactors: [
      'Poor preoperative glucose control (high HbA1c)',
      'Long duration of diabetes',
      'Diabetic complications (neuropathy, nephropathy, retinopathy)',
      'Obesity',
      'Cardiovascular disease',
      'Poor nutrition',
      'Emergency surgery (no time for optimization)'
    ],
    complications: [
      'Surgical site infection (2-3x higher risk)',
      'Poor wound healing',
      'Dehiscence (wound breakdown)',
      'Hypoglycemia (low blood sugar)',
      'Diabetic ketoacidosis (DKA)',
      'Hyperosmolar state',
      'Cardiovascular events',
      'Delayed recovery',
      'Increased mortality'
    ],
    prevalence: 'Approximately 10-15% of surgical patients have diabetes. This is higher in certain surgical populations (vascular surgery, cardiac surgery).'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Preoperative Optimization',
      duration: '2-6 weeks before elective surgery',
      description: 'Optimizing glucose control before surgery to reduce risks.',
      goals: [
        'HbA1c <8.5% (ideally <7.5%)',
        'Stable blood glucose control',
        'Identify and manage complications',
        'Plan perioperative management'
      ],
      activities: [
        'HbA1c testing',
        'Diabetes specialist review if poorly controlled',
        'Medication optimization',
        'Patient education on perioperative glucose',
        'Cardiac risk assessment',
        'Renal function testing',
        'Eye examination if due'
      ],
      warningSignsThisPhase: [
        'HbA1c >9% (consider postponing elective surgery)',
        'Uncontrolled blood sugars',
        'Undiagnosed complications',
        'Dehydration'
      ]
    },
    {
      phase: 2,
      name: 'Immediate Preoperative Period',
      duration: 'Day before and day of surgery',
      description: 'Medication adjustments and fasting management.',
      goals: [
        'Safe fasting',
        'Appropriate medication adjustments',
        'Avoid hypoglycemia and hyperglycemia',
        'Proper hydration'
      ],
      activities: [
        'Adjust oral medications (stop some, continue others)',
        'Reduce insulin doses (typically by 50-80% depending on type)',
        'Early morning surgery preferred (less fasting)',
        'Check blood glucose before surgery',
        'IV fluids if needed'
      ],
      medications: [
        {
          name: 'Metformin',
          purpose: 'Stop to prevent lactic acidosis with contrast/surgery',
          duration: 'Hold 24-48 hours before and after'
        },
        {
          name: 'SGLT2 inhibitors (empagliflozin, etc.)',
          purpose: 'Stop to prevent ketoacidosis',
          duration: 'Hold 3-5 days before'
        },
        {
          name: 'Long-acting insulin',
          purpose: 'Reduce by 20-50% night before',
          duration: 'Resume normal after eating'
        }
      ],
      warningSignsThisPhase: [
        'Blood glucose <4 mmol/L (hypoglycemia)',
        'Blood glucose >15 mmol/L (hyperglycemia)',
        'Ketones in urine',
        'Feeling unwell'
      ]
    },
    {
      phase: 3,
      name: 'Intraoperative Management',
      duration: 'During surgery',
      description: 'Maintaining safe glucose levels during surgery.',
      goals: [
        'Blood glucose 6-10 mmol/L (108-180 mg/dL)',
        'Avoid hypoglycemia',
        'Avoid severe hyperglycemia',
        'Maintain hydration'
      ],
      activities: [
        'Hourly glucose monitoring',
        'IV insulin infusion if needed (variable rate)',
        'IV dextrose if at risk of hypoglycemia',
        'Careful fluid management'
      ],
      warningSignsThisPhase: [
        'Glucose <4 mmol/L',
        'Glucose >15 mmol/L requiring insulin adjustment',
        'Ketosis'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Care',
      duration: 'Days to weeks',
      description: 'Continued glucose management during recovery.',
      goals: [
        'Maintain target glucose (6-12 mmol/L)',
        'Transition back to usual medications',
        'Promote wound healing',
        'Prevent infections'
      ],
      activities: [
        'Regular glucose monitoring (4-6 times daily initially)',
        'Adjust insulin as eating resumes',
        'Resume oral medications when eating normally',
        'Monitor wound closely',
        'Watch for infection signs'
      ],
      medications: [
        {
          name: 'Insulin',
          purpose: 'Main tool for glucose control post-op',
          duration: 'Until stable, then transition'
        },
        {
          name: 'Oral medications',
          purpose: 'Resume when eating and stable',
          duration: 'Resume usual regimen'
        }
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Poor wound healing',
        'Persistent hyperglycemia',
        'Hypoglycemia episodes',
        'DKA symptoms'
      ]
    },
    {
      phase: 5,
      name: 'Recovery and Long-Term',
      duration: 'Weeks to months',
      description: 'Return to normal diabetes management and healing.',
      goals: [
        'Resume normal diabetes routine',
        'Complete wound healing',
        'Optimize long-term control',
        'Prevent complications'
      ],
      activities: [
        'Return to usual medications',
        'Wound monitoring until fully healed',
        'HbA1c check at 3 months',
        'Continue good glucose control'
      ],
      warningSignsThisPhase: [
        'Wound not healing',
        'Recurrent infections',
        'Worsening diabetes control',
        'Late wound breakdown'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Surgeon',
      'Diabetes team/endocrinologist if poor control',
      'Anesthesiologist',
      'Dietitian if needed'
    ],
    investigations: [
      'HbA1c (within 3 months)',
      'Fasting glucose',
      'Renal function tests',
      'ECG and cardiac assessment if indicated',
      'Urine test for protein'
    ],
    medications: [
      {
        medication: 'Metformin',
        instruction: 'stop',
        reason: 'Hold for 24-48 hours before surgery'
      },
      {
        medication: 'SGLT2 inhibitors',
        instruction: 'stop',
        reason: 'Hold for 3-5 days before (risk of ketoacidosis)'
      },
      {
        medication: 'Sulfonylureas',
        instruction: 'discuss',
        reason: 'Usually hold day of surgery'
      },
      {
        medication: 'Long-acting insulin',
        instruction: 'modify',
        reason: 'Reduce by 20-50% night before'
      }
    ],
    fastingInstructions: 'Follow standard fasting guidelines. Diabetics should be scheduled first on the operating list to minimize fasting time. Check blood glucose before leaving for hospital.',
    dayBeforeSurgery: [
      'Take usual diabetes medications during the day',
      'Reduce long-acting insulin at night as directed',
      'Eat a normal dinner',
      'Prepare glucose monitoring supplies',
      'Have glucose tablets for emergency'
    ],
    whatToBring: [
      'All diabetes medications and insulin',
      'Glucose meter and strips',
      'Glucose tablets',
      'Insulin pen/syringes',
      'List of current medications and doses',
      'Recent blood glucose log'
    ],
    dayOfSurgery: [
      'Check blood glucose before leaving home',
      'Do not take diabetes tablets (unless specifically instructed)',
      'May need reduced insulin as directed',
      'Bring all diabetes supplies',
      'Inform staff of diabetes immediately on arrival'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Any type can be used; choice based on surgical needs',
    procedureDescription: 'During surgery, blood glucose is monitored frequently (every 1-2 hours). For major surgery or poorly controlled diabetes, a variable-rate intravenous insulin infusion (VRIII or "sliding scale") is used. This allows precise glucose control. IV dextrose is given alongside if needed to prevent hypoglycemia. Target glucose during surgery is 6-10 mmol/L (108-180 mg/dL).',
    duration: 'Varies by procedure',
    whatToExpect: 'You will have your blood glucose checked frequently. You may have an insulin drip through your IV. The team will manage your blood sugar throughout.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'As directed by surgery type',
      expectedSymptoms: [
        'Blood glucose fluctuations (normal in stress)',
        'May have IV insulin',
        'Frequent finger-prick glucose checks',
        'May feel hungry but unable to eat immediately'
      ],
      activityLevel: 'As directed by surgery type'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'Inspect wound carefully. Diabetic wounds need extra attention. Report any redness, discharge, or poor healing immediately.'
      },
      {
        day: 'Ongoing',
        instruction: 'Wounds heal slower in diabetes. May take 1.5-2x longer than usual. Keep glucose controlled to optimize healing.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'As per surgery type',
      medications: [
        'Standard pain medications as prescribed',
        'Be aware that neuropathy may affect pain sensation'
      ],
      nonPharmacological: [
        'Position changes',
        'Distraction',
        'Relaxation techniques'
      ]
    },
    activityRestrictions: [
      {
        activity: 'As per surgery type',
        restriction: 'Follow surgical instructions',
        duration: 'As directed',
        reason: 'General surgical recovery'
      },
      {
        activity: 'Monitor blood glucose with activity',
        restriction: 'Check glucose before/after exercise',
        duration: 'Ongoing',
        reason: 'Activity affects blood sugar'
      }
    ],
    dietaryGuidelines: [
      'Resume eating as soon as cleared',
      'Consistent carbohydrate intake',
      'Avoid very high sugar foods while healing',
      'Good protein intake for wound healing',
      'Stay well hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'During hospitalization',
        expectation: 'Stable glucose, no DKA or hypoglycemia'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Resumption of normal diabetes routine'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 weeks',
        expectation: 'Complete wound healing (longer than non-diabetics)'
      },
      {
        timeframe: 'Ongoing',
        expectation: 'Return to usual diabetes management'
      }
    ],
    functionalRecovery: 'Diabetes may slow recovery slightly. Good glucose control speeds healing.',
    cosmeticOutcome: 'Diabetic wounds may have more scarring due to slower healing.',
    successRate: 'With proper perioperative management, diabetic patients have surgical outcomes approaching non-diabetics. Poor control significantly increases complications.',
    possibleComplications: [
      {
        complication: 'Surgical site infection',
        riskLevel: 'high',
        prevention: 'Maintain glucose 6-10 during/after surgery',
        management: 'Antibiotics, wound care, possibly debridement'
      },
      {
        complication: 'Delayed wound healing',
        riskLevel: 'moderate',
        prevention: 'Good glucose control, nutrition, no smoking',
        management: 'Continue glucose control, nutrition support'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'As per surgery type',
        purpose: 'Surgical wound check'
      },
      {
        timing: '1-2 weeks',
        purpose: 'Review diabetes medications, glucose control'
      },
      {
        timing: '3 months',
        purpose: 'HbA1c to assess overall control'
      }
    ],
    rehabilitationNeeds: [
      'As per surgery type',
      'May need diabetes education reinforcement',
      'Nutrition counseling'
    ],
    lifestyleModifications: [
      'Maintain good glucose control long-term',
      'Monitor wounds carefully',
      'Regular diabetes follow-up',
      'Healthy diet and exercise when recovered'
    ]
  },

  warningSigns: [
    'Blood glucose <4 mmol/L (hypoglycemia) - treat immediately',
    'Blood glucose consistently >15 mmol/L',
    'Wound redness, swelling, discharge',
    'Fever',
    'Nausea, vomiting with high blood sugar (possible DKA)',
    'Confusion'
  ],

  emergencySigns: [
    'Severe hypoglycemia with confusion or loss of consciousness',
    'Signs of DKA: nausea, vomiting, abdominal pain, fruity breath',
    'Severe wound infection',
    'Chest pain or signs of heart attack'
  ],

  complianceRequirements: [
    {
      requirement: 'Monitor blood glucose frequently',
      importance: 'critical',
      consequence: 'Undetected highs or lows cause complications'
    },
    {
      requirement: 'Follow medication adjustments exactly',
      importance: 'critical',
      consequence: 'Wrong doses cause hypoglycemia or hyperglycemia'
    },
    {
      requirement: 'Report wound problems immediately',
      importance: 'critical',
      consequence: 'Early treatment prevents serious infection'
    },
    {
      requirement: 'Resume usual diabetes care as directed',
      importance: 'important',
      consequence: 'Long-term control affects future health'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Diabetes Management',
      reference: 'WHO Diabetes Guidelines',
      keyPoints: [
        'Perioperative glucose targets 6-10 mmol/L',
        'Avoid hypoglycemia',
        'Optimize HbA1c before elective surgery',
        'Close monitoring of wounds',
        'Multidisciplinary approach'
      ]
    }
  ]
};

/**
 * Malnutrition and Surgery
 */
export const malnutritionAndSurgery: EducationCondition = {
  id: 'systemic-malnutrition-surgery',
  name: 'Malnutrition and Surgical Care',
  category: 'L',
  icdCode: 'E46',
  description: 'Management of nutritional deficiencies in surgical patients to optimize healing and reduce complications.',
  alternateNames: ['Surgical Malnutrition', 'Perioperative Nutrition', 'Nutritional Support in Surgery'],
  
  overview: {
    definition: 'Malnutrition is a critical factor affecting surgical outcomes. It includes undernutrition (inadequate calories/protein), specific deficiencies (vitamins, minerals), and obesity with poor nutritional quality. Malnourished patients have 2-3x higher complication rates, longer hospital stays, and increased mortality. Nutrition optimization before and after surgery significantly improves outcomes. Albumin <30 g/L indicates significant malnutrition risk.',
    causes: [
      'Inadequate food intake',
      'Cancer and chronic illness',
      'Gastrointestinal diseases affecting absorption',
      'Eating disorders',
      'Poverty and food insecurity',
      'Alcoholism',
      'Advanced age with decreased intake',
      'Depression affecting appetite'
    ],
    symptoms: [
      'Weight loss (>10% in 6 months significant)',
      'Muscle wasting',
      'Weakness and fatigue',
      'Poor wound healing history',
      'Frequent infections',
      'Edema (low protein)',
      'Dry skin, brittle hair',
      'Poor appetite'
    ],
    riskFactors: [
      'Weight loss >10% in 6 months',
      'BMI <18.5',
      'Albumin <30 g/L',
      'Cancer',
      'Chronic disease',
      'Advanced age',
      'Major surgery planned',
      'Emergency surgery without optimization'
    ],
    complications: [
      'Surgical site infection (3-4x higher risk)',
      'Anastomotic leak',
      'Wound dehiscence',
      'Prolonged ileus',
      'Respiratory complications',
      'Pressure sores',
      'Prolonged hospital stay',
      'Increased mortality'
    ],
    prevalence: 'Malnutrition affects 30-50% of hospitalized patients. Prevalence is higher in cancer patients (up to 80%) and elderly.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Nutritional Assessment',
      duration: 'At surgical consultation',
      description: 'Screening and assessment of nutritional status.',
      goals: [
        'Identify malnourished patients',
        'Assess severity',
        'Identify specific deficiencies',
        'Plan nutritional support'
      ],
      activities: [
        'MUST screening tool',
        'Weight and BMI measurement',
        'Weight loss history',
        'Dietary intake assessment',
        'Blood tests (albumin, prealbumin, vitamins)',
        'Referral to dietitian if indicated'
      ],
      warningSignsThisPhase: [
        'MUST score ≥2 (high risk)',
        'Albumin <30 g/L',
        'Weight loss >10% in 6 months',
        'Inability to eat adequately'
      ]
    },
    {
      phase: 2,
      name: 'Preoperative Optimization',
      duration: '2-4 weeks before elective surgery',
      description: 'Nutritional supplementation before surgery if malnourished.',
      goals: [
        'Improve nutritional status',
        'Correct deficiencies',
        'Build protein reserves',
        'Reduce surgical risk'
      ],
      activities: [
        'High protein, high calorie diet',
        'Oral nutritional supplements (ONS)',
        'Consider enteral feeding if unable to eat',
        'Correct vitamin deficiencies',
        'Consider immunonutrition (arginine, omega-3)'
      ],
      medications: [
        {
          name: 'Oral nutritional supplements',
          purpose: 'Increase calorie and protein intake',
          duration: '2 weeks minimum before surgery'
        },
        {
          name: 'Vitamin supplements',
          purpose: 'Correct deficiencies',
          duration: 'As needed'
        },
        {
          name: 'Iron supplementation',
          purpose: 'Treat anemia',
          duration: 'If deficient'
        }
      ],
      warningSignsThisPhase: [
        'Unable to tolerate oral supplements',
        'Continued weight loss',
        'Cannot delay surgery'
      ]
    },
    {
      phase: 3,
      name: 'Perioperative Nutrition',
      duration: 'Day before surgery through early post-op',
      description: 'Minimizing fasting and early nutritional support.',
      goals: [
        'Minimize preoperative fasting',
        'Carbohydrate loading',
        'Early post-operative feeding',
        'Maintain nutritional support'
      ],
      activities: [
        'Carbohydrate drink 2-3 hours before surgery (Enhanced Recovery)',
        'Early resumption of oral intake post-op (within hours if safe)',
        'Oral nutritional supplements post-op',
        'IV nutrition only if gut not usable'
      ],
      warningSignsThisPhase: [
        'Prolonged ileus',
        'Unable to tolerate oral intake',
        'Nausea and vomiting'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Nutritional Support',
      duration: 'Weeks',
      description: 'Continued nutritional support during healing.',
      goals: [
        'Meet increased nutritional needs',
        'Support wound healing',
        'Prevent muscle loss',
        'Return to normal eating'
      ],
      activities: [
        'High protein diet (1.5-2 g/kg/day)',
        'Adequate calories',
        'Oral nutritional supplements',
        'Enteral feeding if unable to eat adequately',
        'Monitor weight and intake',
        'Dietitian follow-up'
      ],
      medications: [
        {
          name: 'Oral nutritional supplements',
          purpose: 'Support healing',
          duration: '4-6 weeks minimum'
        },
        {
          name: 'Multivitamins',
          purpose: 'Ensure micronutrient needs',
          duration: 'Weeks to months'
        }
      ],
      warningSignsThisPhase: [
        'Poor oral intake',
        'Continued weight loss',
        'Wound healing problems',
        'Weakness'
      ]
    },
    {
      phase: 5,
      name: 'Recovery and Rehabilitation',
      duration: 'Months',
      description: 'Nutritional rehabilitation and return to normal.',
      goals: [
        'Regain weight and muscle',
        'Full functional recovery',
        'Long-term healthy eating',
        'Address ongoing needs'
      ],
      activities: [
        'Gradually normalize diet',
        'Continue supplements if needed',
        'Exercise and physical activity',
        'Regular weight monitoring',
        'Long-term dietitian support if needed'
      ],
      warningSignsThisPhase: [
        'Failure to regain weight',
        'Persistent weakness',
        'Recurrent nutritional problems'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Surgeon',
      'Dietitian/nutritionist',
      'Medical team if underlying conditions'
    ],
    investigations: [
      'Blood tests: albumin, prealbumin, total protein',
      'Full blood count for anemia',
      'Vitamin levels if suspected deficiency',
      'MUST nutritional screening'
    ],
    medications: [
      {
        medication: 'Oral nutritional supplements (e.g., Ensure, Fortisip)',
        instruction: 'continue',
        reason: 'Start 2 weeks before surgery if malnourished'
      },
      {
        medication: 'Vitamin supplements',
        instruction: 'continue',
        reason: 'Correct any deficiencies'
      }
    ],
    fastingInstructions: 'Modern practice minimizes fasting. Clear fluids including carbohydrate drinks may be allowed up to 2 hours before surgery (Enhanced Recovery protocols).',
    dayBeforeSurgery: [
      'Eat well',
      'Take nutritional supplements',
      'Stay hydrated',
      'Carbohydrate drink if prescribed'
    ],
    whatToBring: [
      'Nutritional supplements',
      'List of dietary restrictions/allergies',
      'Dentures if applicable (for eating)'
    ],
    dayOfSurgery: [
      'Carbohydrate drink 2 hours before if prescribed',
      'Otherwise follow fasting instructions',
      'Plan for early feeding after surgery'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'As per surgical procedure',
    procedureDescription: 'Malnutrition itself is not a surgical procedure but affects surgical care. During surgery, the anesthesia team maintains hydration and may give glucose. The surgical team works efficiently to minimize stress on the malnourished patient.',
    duration: 'Varies by procedure',
    whatToExpect: 'Surgery proceeds as normal. The team is aware of your nutritional status and will support early feeding after surgery.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'As per surgery type',
      expectedSymptoms: [
        'Initial lack of appetite (normal)',
        'May have nausea initially',
        'Weakness (existing + surgery stress)'
      ],
      activityLevel: 'Early mobilization helps appetite and recovery'
    },
    woundCare: [
      {
        day: 'Daily',
        instruction: 'Inspect wounds carefully. Malnourished patients are at higher risk for poor healing.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'As per surgery type',
      medications: [
        'Standard pain medications',
        'Manage nausea to enable eating'
      ],
      nonPharmacological: [
        'Positioning',
        'Small frequent meals easier to tolerate'
      ]
    },
    activityRestrictions: [
      {
        activity: 'As per surgery type',
        restriction: 'Follow surgical instructions',
        duration: 'As directed',
        reason: 'Surgical recovery'
      }
    ],
    dietaryGuidelines: [
      'Start eating as soon as cleared (even if small amounts)',
      'High protein foods: eggs, meat, fish, dairy, beans',
      'Small frequent meals if large meals difficult',
      'Take nutritional supplements between meals',
      'Aim for 1.5-2 g protein per kg body weight daily',
      'Stay hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Eating adequately, stable weight'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 weeks',
        expectation: 'Weight gain, improved strength'
      },
      {
        timeframe: '3-6 months',
        expectation: 'Nutritional rehabilitation complete'
      }
    ],
    functionalRecovery: 'Malnourished patients may have slower functional recovery but can achieve excellent outcomes with nutritional support.',
    cosmeticOutcome: 'Wound healing may be slower, with potential for more visible scarring.',
    successRate: 'Preoperative nutritional optimization reduces complications by 30-50% in malnourished patients.',
    possibleComplications: [
      {
        complication: 'Poor wound healing',
        riskLevel: 'high',
        prevention: 'Adequate protein and calories',
        management: 'Nutritional support, wound care'
      },
      {
        complication: 'Surgical site infection',
        riskLevel: 'high',
        prevention: 'Preoperative optimization, good glucose control',
        management: 'Antibiotics, wound care'
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
        timing: '2-4 weeks',
        purpose: 'Weight check, nutritional assessment'
      },
      {
        timing: 'Ongoing',
        purpose: 'Dietitian follow-up until goals met'
      }
    ],
    rehabilitationNeeds: [
      'Dietitian counseling',
      'Physical therapy to rebuild strength',
      'Occupational therapy if needed'
    ],
    lifestyleModifications: [
      'Maintain healthy diet long-term',
      'Continue supplements until recovered',
      'Regular meals and snacks',
      'Limit alcohol',
      'Treat underlying causes of malnutrition'
    ]
  },

  warningSigns: [
    'Unable to eat',
    'Continued weight loss',
    'Wound problems',
    'Increasing weakness',
    'Swelling (edema)',
    'Fever'
  ],

  emergencySigns: [
    'Severe dehydration',
    'Unable to keep any food down',
    'Signs of refeeding syndrome (rare) - confusion, heart palpitations',
    'Severe wound infection'
  ],

  complianceRequirements: [
    {
      requirement: 'Take nutritional supplements as prescribed',
      importance: 'critical',
      consequence: 'Inadequate nutrition impairs healing'
    },
    {
      requirement: 'Eat high protein diet',
      importance: 'critical',
      consequence: 'Protein essential for wound healing'
    },
    {
      requirement: 'Attend dietitian appointments',
      importance: 'important',
      consequence: 'Professional guidance optimizes recovery'
    },
    {
      requirement: 'Delay elective surgery if possible until optimized',
      importance: 'critical',
      consequence: '2 weeks of optimization significantly reduces complications'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Nutrition',
      reference: 'WHO Nutrition Guidelines',
      keyPoints: [
        'Screen all surgical patients for malnutrition',
        'Optimize nutrition 2+ weeks before elective surgery',
        'High protein intake during recovery',
        'Early feeding after surgery',
        'Multidisciplinary approach with dietitian'
      ]
    }
  ]
};

// Export systemic conditions part 1
export const systemicConditionsPart1 = [diabetesAndSurgery, malnutritionAndSurgery];
