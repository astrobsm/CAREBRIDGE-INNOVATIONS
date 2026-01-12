/**
 * Patient Education Content - Category J: Genital and Perineal Reconstruction
 * Part 3: Anal Reconstruction and Rectovaginal Fistula Repair
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Colorectal Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Anal Reconstruction (Anorectal Reconstruction)
 */
export const analReconstruction: EducationCondition = {
  id: 'genital-anal-reconstruction',
  name: 'Anal Reconstruction',
  category: 'J',
  icdCode: 'K62.8',
  description: 'Surgical reconstruction of the anus and anal canal after injury, cancer surgery, or for congenital abnormalities.',
  alternateNames: ['Anorectal Reconstruction', 'Neo-anus Creation', 'Anoplasty', 'Anal Sphincter Reconstruction'],
  
  overview: {
    definition: 'Anal reconstruction involves surgical procedures to restore or create a functional anus and anal canal. This may be needed after trauma, cancer surgery (abdominoperineal resection with later restoration), or for congenital conditions like imperforate anus. The goal is to restore fecal continence and natural defecation, eliminating or closing a colostomy. Complex cases may require muscle transfers (graciloplasty) or artificial sphincter devices.',
    causes: [
      'Anorectal cancer requiring resection',
      'Trauma to the anus',
      'Congenital imperforate anus',
      'Burns',
      'Obstetric injury',
      'Fistula disease destroying sphincter',
      'Failed previous anal surgery'
    ],
    symptoms: [
      'Colostomy in place (if anus removed)',
      'Fecal incontinence',
      'Anal stenosis',
      'Absent or abnormal anal anatomy',
      'Difficulty with defecation',
      'Recurrent infections'
    ],
    riskFactors: [
      'Colorectal cancer',
      'Congenital anomalies',
      'Previous pelvic radiation',
      'Obstetric complications',
      'Inflammatory bowel disease'
    ],
    complications: [
      'Persistent incontinence',
      'Stenosis',
      'Fistula',
      'Infection',
      'Need for permanent stoma',
      'Nerve damage',
      'Device failure (if artificial sphincter)'
    ],
    prevalence: 'Imperforate anus affects about 1 in 5,000 births. Anorectal cancer requiring major surgery is less common but significant.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Evaluation and Planning',
      duration: 'Several weeks',
      description: 'Comprehensive assessment of anorectal anatomy and function, planning surgical approach.',
      goals: [
        'Define anatomy and defect',
        'Assess potential for continence',
        'Choose surgical technique',
        'Optimize general health'
      ],
      activities: [
        'Physical examination',
        'MRI of pelvis',
        'Endorectal ultrasound',
        'Anorectal physiology studies',
        'Assessment of remaining sphincter',
        'Discussion of realistic expectations'
      ],
      warningSignsThisPhase: [
        'Recurrent cancer',
        'Poor sphincter remnant',
        'Severe scarring from radiation'
      ]
    },
    {
      phase: 2,
      name: 'Primary Reconstruction Surgery',
      duration: '3-5 hours',
      description: 'Surgical reconstruction of anus and/or sphincter mechanism.',
      goals: [
        'Create or restore anal canal',
        'Reconstruct or reinforce sphincter',
        'Establish blood supply',
        'Maintain nerve function'
      ],
      activities: [
        'General anesthesia',
        'Reconstruction procedure (varies by case)',
        'Possible gracilis muscle transfer',
        'Possible artificial sphincter placement',
        'Protective stoma if needed'
      ],
      warningSignsThisPhase: [
        'Bleeding',
        'Unexpected anatomy',
        'Need for more extensive surgery'
      ]
    },
    {
      phase: 3,
      name: 'Early Recovery',
      duration: '2-4 weeks',
      description: 'Initial healing, stoma management if present, wound care.',
      goals: [
        'Wound healing',
        'Prevent infection',
        'Manage stoma if present',
        'Control bowel function'
      ],
      activities: [
        'Wound care',
        'Stoma care (if present)',
        'Gradual diet advancement',
        'Pain management',
        'Early mobilization'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent wound infection',
          duration: '7-14 days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '2-4 weeks'
        },
        {
          name: 'Stool softeners',
          purpose: 'Prevent straining',
          duration: 'Ongoing'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Wound breakdown',
        'Increasing pain',
        'Stoma problems'
      ]
    },
    {
      phase: 4,
      name: 'Functional Training',
      duration: 'Months',
      description: 'If graciloplasty done, training of the transposed muscle. Bowel retraining.',
      goals: [
        'Activate transposed muscle',
        'Establish bowel routine',
        'Improve continence',
        'Prepare for stoma reversal'
      ],
      activities: [
        'Electrical stimulation of gracilis (if applicable)',
        'Biofeedback training',
        'Bowel retraining program',
        'Dietary management'
      ],
      warningSignsThisPhase: [
        'No muscle function',
        'Persistent incontinence',
        'Stenosis'
      ]
    },
    {
      phase: 5,
      name: 'Stoma Reversal (if applicable)',
      duration: 'Second surgery, months after primary',
      description: 'Closing the temporary stoma to restore intestinal continuity.',
      goals: [
        'Close stoma safely',
        'Establish rectal function',
        'Achieve continence'
      ],
      activities: [
        'Pre-reversal assessment',
        'Stoma closure surgery',
        'Post-operative monitoring',
        'Continence assessment'
      ],
      warningSignsThisPhase: [
        'Anastomotic leak',
        'Severe incontinence',
        'Stenosis'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Colorectal surgeon',
      'Plastic surgeon (for complex reconstruction)',
      'Stoma nurse',
      'Physiotherapist for pelvic floor'
    ],
    investigations: [
      'MRI pelvis',
      'Endorectal ultrasound',
      'Anorectal manometry',
      'Blood tests',
      'Colonoscopy if indicated'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      },
      {
        medication: 'Bowel preparation',
        instruction: 'continue',
        reason: 'Clean bowel for surgery'
      }
    ],
    fastingInstructions: 'Full bowel preparation as directed. Nothing by mouth for 8 hours before surgery.',
    dayBeforeSurgery: [
      'Complete bowel preparation',
      'Clear liquid diet then fasting',
      'Shower with antiseptic soap',
      'Get good rest'
    ],
    whatToBring: [
      'Hospital stay supplies (1-2 weeks)',
      'Loose comfortable clothing',
      'List of medications',
      'Support person contact'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Shower',
      'Arrive as directed',
      'Prepare for possible stoma'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'Procedures vary widely based on the defect. Options include: Direct sphincter repair or reconstruction; Graciloplasty - transfer of the gracilis muscle from the thigh to wrap around the anus and provide sphincter function; Artificial bowel sphincter - a hydraulic device implanted to provide continence; Anoplasty - reconstruction of the anal opening. A temporary stoma is often created to protect the reconstruction while it heals.',
    duration: '3-5 hours depending on complexity',
    whatToExpect: 'You will be asleep throughout. When you wake up, you may have a stoma (temporary bag for stool). The perineal area will be dressed and may have drains.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Avoid sitting directly on the reconstruction. Side-lying or cushioned sitting.',
      expectedSymptoms: [
        'Perineal pain and swelling',
        'Stoma functioning (if present)',
        'Drains in place',
        'Difficulty sitting',
        'Fatigue'
      ],
      activityLevel: 'Bed rest initially. Gradual increase as tolerated.'
    },
    woundCare: [
      {
        day: 'Days 1-14',
        instruction: 'Perineal wound care by nurses. Keep clean and dry. Stoma care education.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Sitz baths if cleared. Careful hygiene. Stoma independence.'
      },
      {
        day: 'Ongoing',
        instruction: 'Good perineal hygiene. Monitor for problems.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to significant (5-7/10) first weeks',
      medications: [
        'Prescribed pain medication',
        'Transition to milder medications over weeks',
        'Stool softeners essential'
      ],
      nonPharmacological: [
        'Cushion for sitting',
        'Sitz baths when cleared',
        'Ice packs (protect skin)'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Sitting directly on hard surfaces',
        restriction: 'Use cushion',
        duration: '6-8 weeks',
        reason: 'Protect reconstruction'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Prevent strain'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '8-12 weeks',
        reason: 'Allow healing'
      }
    ],
    dietaryGuidelines: [
      'Progress diet as tolerated',
      'High fiber once healed',
      'Plenty of fluids',
      'Avoid constipation',
      'May need bowel training diet'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6-8 weeks',
        expectation: 'Wounds healed, stoma functioning'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Stoma reversed if applicable, continence established'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Maximum functional recovery'
      }
    ],
    functionalRecovery: 'Continence outcomes vary. With graciloplasty, 40-70% achieve social continence. With artificial sphincter, 70-85% achieve continence but device complications are common.',
    cosmeticOutcome: 'A functioning anus is created. Appearance may not be completely normal but functional.',
    successRate: 'Success varies greatly by procedure type and patient factors. Complete continence is not always achievable; goal is often "social continence" (ability to defer defecation).',
    possibleComplications: [
      {
        complication: 'Persistent incontinence',
        riskLevel: 'moderate',
        prevention: 'Appropriate patient selection, good technique',
        management: 'Biofeedback, dietary management, possible further surgery'
      },
      {
        complication: 'Device failure/infection',
        riskLevel: 'moderate',
        prevention: 'Proper placement, hygiene',
        management: 'Revision or removal'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check'
      },
      {
        timing: '6-8 weeks',
        purpose: 'Assess healing'
      },
      {
        timing: '3-6 months',
        purpose: 'Plan stoma reversal if applicable'
      },
      {
        timing: '1 year and ongoing',
        purpose: 'Functional assessment'
      }
    ],
    rehabilitationNeeds: [
      'Biofeedback for continence training',
      'Pelvic floor physiotherapy',
      'Stoma care education',
      'Dietary counseling'
    ],
    lifestyleModifications: [
      'Bowel routine management',
      'Dietary modifications for stool consistency',
      'Skin care around anus',
      'Ongoing pelvic floor exercises'
    ]
  },

  warningSigns: [
    'Fever',
    'Increasing perineal pain',
    'Wound breakdown',
    'Severe incontinence',
    'Stoma problems',
    'Signs of infection'
  ],

  emergencySigns: [
    'Heavy bleeding',
    'Signs of severe infection/sepsis',
    'Complete wound breakdown',
    'Bowel obstruction signs'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete bowel retraining program',
      importance: 'critical',
      consequence: 'Retraining optimizes continence outcomes'
    },
    {
      requirement: 'Maintain stool consistency',
      importance: 'important',
      consequence: 'Proper stool consistency aids continence'
    },
    {
      requirement: 'Attend physiotherapy and biofeedback',
      importance: 'critical',
      consequence: 'Therapy significantly improves outcomes'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Colorectal Surgery',
      reference: 'WHO Surgical Safety Guidelines',
      keyPoints: [
        'Specialized surgical team',
        'Multidisciplinary approach',
        'Stoma education essential',
        'Long-term follow-up for continence'
      ]
    }
  ]
};

/**
 * Rectovaginal Fistula Repair
 */
export const rectovaginalFistulaRepair: EducationCondition = {
  id: 'genital-rvf-repair',
  name: 'Rectovaginal Fistula Repair',
  category: 'J',
  icdCode: 'N82.3',
  description: 'Surgical repair of an abnormal connection between the rectum and vagina, which allows passage of stool and gas through the vagina.',
  alternateNames: ['RVF Repair', 'Rectal Vaginal Fistula Surgery', 'Rectovaginal Fistula Closure'],
  
  overview: {
    definition: 'A rectovaginal fistula (RVF) is an abnormal connection (tract) between the rectum (lower bowel) and vagina. This allows stool and gas to pass through the vagina, causing significant distress and social isolation. In African settings, obstetric injury from prolonged labor is the most common cause, but RVF can also result from Crohn\'s disease, cancer, radiation, or surgical complications. Repair aims to close the fistula and restore normal anatomy and function.',
    causes: [
      'Obstetric injury (most common globally, especially in Africa)',
      'Prolonged obstructed labor',
      'Crohn\'s disease',
      'Pelvic radiation',
      'Cancer involving rectum or vagina',
      'Surgical complications',
      'Infection or abscess',
      'Episiotomy complications'
    ],
    symptoms: [
      'Passage of stool through vagina',
      'Passage of gas (flatus) through vagina',
      'Foul-smelling vaginal discharge',
      'Recurrent vaginal infections',
      'Pain during intercourse',
      'Social isolation and depression',
      'Relationship difficulties'
    ],
    riskFactors: [
      'Obstructed labor without intervention',
      'Lack of access to emergency obstetric care',
      'Young maternal age (small pelvis)',
      'Crohn\'s disease',
      'Prior pelvic surgery or radiation'
    ],
    complications: [
      'Persistent fistula',
      'Recurrence after repair',
      'Fecal incontinence',
      'Vaginal stenosis',
      'Continued social problems',
      'Depression'
    ],
    prevalence: 'In Africa, obstetric fistula (including RVF) affects an estimated 2 million women, with 50,000-100,000 new cases annually. RVF also occurs in developed settings from other causes.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Preparation',
      duration: 'Weeks to months',
      description: 'Comprehensive evaluation, treatment of any infection, nutritional optimization.',
      goals: [
        'Define fistula size and location',
        'Treat any infection',
        'Optimize nutrition',
        'Psychological support',
        'Plan surgical approach'
      ],
      activities: [
        'Physical examination',
        'Examination under anesthesia if needed',
        'Treatment of vaginitis',
        'Nutritional rehabilitation',
        'Counseling and support',
        'Waiting for tissue recovery if recent injury'
      ],
      warningSignsThisPhase: [
        'Untreated infection',
        'Severe malnutrition',
        'Active Crohn\'s disease',
        'Cancer requiring other treatment'
      ]
    },
    {
      phase: 2,
      name: 'Fistula Repair Surgery',
      duration: '1-3 hours',
      description: 'Surgical closure of the fistula through vaginal or abdominal approach.',
      goals: [
        'Identify fistula tract',
        'Excise fistula edges',
        'Close rectal and vaginal layers',
        'Interpose tissue if needed',
        'Achieve watertight closure'
      ],
      activities: [
        'General or regional anesthesia',
        'Approach selection (vaginal, rectal, or abdominal)',
        'Fistula excision',
        'Layered closure',
        'Possible tissue flap interposition',
        'Possible diverting stoma for complex cases'
      ],
      warningSignsThisPhase: [
        'Unexpected cancer',
        'Very large fistula',
        'Severe scarring'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Post-Operative Care',
      duration: 'Days 1-14',
      description: 'Careful wound care, bowel management, and prevention of early complications.',
      goals: [
        'Prevent strain on repair',
        'Prevent infection',
        'Manage bowel function',
        'Pain control'
      ],
      activities: [
        'Wound care',
        'Low residue diet initially',
        'Stool softeners',
        'Catheter care (bladder rest)',
        'Pain management'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '7-14 days'
        },
        {
          name: 'Stool softeners',
          purpose: 'Prevent straining',
          duration: '4-6 weeks'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '1-2 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Stool from vagina (repair failure)',
        'Wound infection',
        'Urinary problems'
      ]
    },
    {
      phase: 4,
      name: 'Healing and Recovery',
      duration: 'Weeks 2-12',
      description: 'Continued healing, gradual return to normal activities and diet.',
      goals: [
        'Complete fistula closure',
        'Resume normal diet',
        'Resume normal activities',
        'Reintegrate socially'
      ],
      activities: [
        'Gradual diet advancement',
        'Wound checks',
        'Confirmation of fistula closure',
        'Psychological support',
        'Sexual health counseling'
      ],
      warningSignsThisPhase: [
        'Return of stool/gas from vagina',
        'Vaginal discharge',
        'Constipation'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Colorectal surgeon or fistula surgeon',
      'Gynecologist',
      'Nutritionist',
      'Psychological/social support'
    ],
    investigations: [
      'Physical examination and EUA',
      'Blood tests including nutrition markers',
      'Stool test for infection',
      'Imaging if complex fistula',
      'Colonoscopy if Crohn\'s or cancer suspected'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      },
      {
        medication: 'Crohn\'s medications',
        instruction: 'continue',
        reason: 'Disease control important'
      }
    ],
    fastingInstructions: 'Bowel preparation as directed. Nothing by mouth for 8 hours before surgery.',
    dayBeforeSurgery: [
      'Complete bowel preparation if directed',
      'Low residue diet then clear liquids',
      'Clean perineal area',
      'Get good rest'
    ],
    whatToBring: [
      'Hospital stay supplies (3-7 days)',
      'Loose comfortable clothing',
      'Sanitary pads',
      'Support person'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Final hygiene preparation',
      'Arrive as directed'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General or spinal anesthesia',
    procedureDescription: 'Several approaches exist depending on fistula location and size. Transvaginal repair: Done through the vagina, the fistula is excised and the rectum and vagina are closed in layers. Transrectal (endorectal) advancement flap: The rectal mucosa is advanced to cover the fistula. Transabdominal: For high or complex fistulas, requiring abdominal surgery. Tissue interposition: A layer of tissue (such as muscle or fat) may be placed between the repaired rectum and vagina to improve healing. A temporary stoma may be created for complex or recurrent cases.',
    duration: '1-3 hours',
    whatToExpect: 'You will be asleep or numb from the waist down. After surgery, you will have a urinary catheter. There may be vaginal packing. You will be on a special diet initially.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Comfortable position. Avoid straining.',
      expectedSymptoms: [
        'Vaginal and perineal discomfort',
        'Urinary catheter in place',
        'Possible vaginal packing initially',
        'Slight bloody discharge',
        'Constipation (intentional initially)'
      ],
      activityLevel: 'Rest initially. Gentle walking encouraged. Avoid straining.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep area clean. Gentle cleaning after toileting. No vaginal washing/douching.'
      },
      {
        day: 'Weeks 1-6',
        instruction: 'Sitz baths when cleared. Good hygiene. Monitor for discharge.'
      },
      {
        day: 'Ongoing',
        instruction: 'Normal hygiene. Report any stool or gas from vagina.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10)',
      medications: [
        'Prescribed pain medication for first week',
        'Paracetamol and ibuprofen after',
        'Stool softeners essential'
      ],
      nonPharmacological: [
        'Sitz baths',
        'Ice packs (protect skin)',
        'Rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Sexual intercourse',
        restriction: 'Avoid',
        duration: '8-12 weeks',
        reason: 'Allow complete healing'
      },
      {
        activity: 'Tampon use',
        restriction: 'Avoid',
        duration: '8-12 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Straining with bowel movements',
        restriction: 'Absolutely avoid',
        duration: 'Always',
        reason: 'Can disrupt repair'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Prevent strain'
      }
    ],
    dietaryGuidelines: [
      'Low residue diet initially (few days)',
      'Gradual advancement to normal diet',
      'High fiber once cleared (to prevent constipation)',
      'Plenty of fluids',
      'Stool softeners as directed'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2-6 weeks',
        expectation: 'Initial healing, no stool from vagina'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Fistula healed, sexual activity possible'
      },
      {
        timeframe: '1 year',
        expectation: 'Complete functional and social recovery'
      }
    ],
    functionalRecovery: 'Successful closure achieved in 80-95% of cases with appropriate technique and patient selection. Many women can return to normal sexual function and social life.',
    cosmeticOutcome: 'External appearance is generally normal. Internal anatomy restored.',
    successRate: 'First-time repair success rates are 80-95%. Recurrent fistulas have lower success rates but can still be repaired.',
    possibleComplications: [
      {
        complication: 'Fistula recurrence',
        riskLevel: 'moderate',
        prevention: 'Good technique, tissue interposition, avoid straining',
        management: 'Repeat repair'
      },
      {
        complication: 'Vaginal stenosis',
        riskLevel: 'low',
        prevention: 'Careful technique',
        management: 'Dilation or revision'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check, confirm no leak'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing'
      },
      {
        timing: '3 months',
        purpose: 'Confirm success, clear for activities'
      },
      {
        timing: '6-12 months',
        purpose: 'Long-term follow-up'
      }
    ],
    rehabilitationNeeds: [
      'Pelvic floor physiotherapy',
      'Psychological counseling',
      'Social reintegration support',
      'Family planning counseling'
    ],
    lifestyleModifications: [
      'Maintain soft regular bowel movements',
      'Good perineal hygiene',
      'Avoid constipation',
      'Discuss future pregnancy plans with doctor'
    ]
  },

  warningSigns: [
    'Stool or gas passing from vagina',
    'Foul-smelling vaginal discharge',
    'Fever',
    'Increasing pain',
    'Wound problems'
  ],

  emergencySigns: [
    'Heavy bleeding',
    'Signs of severe infection',
    'Inability to pass stool',
    'Severe abdominal pain'
  ],

  complianceRequirements: [
    {
      requirement: 'Prevent constipation and straining',
      importance: 'critical',
      consequence: 'Straining can cause fistula recurrence'
    },
    {
      requirement: 'Avoid sexual intercourse until cleared',
      importance: 'critical',
      consequence: 'Can disrupt healing repair'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of recurrence allows prompt treatment'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Obstetric Fistula',
      reference: 'WHO Obstetric Fistula Guiding Principles',
      keyPoints: [
        'Prevention through access to emergency obstetric care',
        'Treatment by trained fistula surgeons',
        'Holistic care including psychological support',
        'Social reintegration essential',
        'Prevention of recurrence through safe childbirth practices'
      ]
    }
  ]
};

// Export genital reconstruction part 3
export const genitalReconstructionPart3 = [analReconstruction, rectovaginalFistulaRepair];
