/**
 * Patient Education Content - Category J: Genital and Perineal Reconstruction
 * Part 2: Vaginal Reconstruction and Penile Reconstruction
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Reconstructive Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Vaginal Reconstruction (Vaginoplasty)
 */
export const vaginalReconstruction: EducationCondition = {
  id: 'genital-vaginal-reconstruction',
  name: 'Vaginal Reconstruction (Vaginoplasty)',
  category: 'J',
  icdCode: 'N99.8',
  description: 'Surgical creation or reconstruction of the vagina due to congenital absence (MRKH syndrome), cancer surgery, or trauma.',
  alternateNames: ['Vaginoplasty', 'Neovagina Creation', 'Vaginal Reconstruction Surgery'],
  
  overview: {
    definition: 'Vaginal reconstruction (vaginoplasty) is surgery to create a functional vagina when absent from birth (as in MRKH syndrome - affecting about 1 in 4,500 women), or to reconstruct the vagina after removal due to cancer or trauma. Various surgical techniques exist, including skin grafts, intestinal segments, or tissue expansion methods. The goal is to create a vagina that allows for comfortable sexual intercourse.',
    causes: [
      'Mayer-Rokitansky-Küster-Hauser (MRKH) syndrome (congenital absence)',
      'Vaginal agenesis',
      'Removal for cancer (vaginectomy)',
      'Severe trauma',
      'Gender-affirming surgery',
      'Post-radiation stenosis'
    ],
    symptoms: [
      'Absent or shortened vagina',
      'Inability to have penetrative intercourse',
      'Amenorrhea (with functioning uterus)',
      'Psychological distress',
      'Relationship difficulties'
    ],
    riskFactors: [
      'Genetic syndromes',
      'History of pelvic malignancy',
      'Previous pelvic radiation',
      'Complex medical history'
    ],
    complications: [
      'Vaginal stenosis (narrowing)',
      'Graft failure',
      'Fistula formation',
      'Prolapse of neovagina',
      'Need for revision surgery',
      'Sexual dysfunction',
      'Psychological adjustment issues'
    ],
    prevalence: 'MRKH syndrome affects approximately 1 in 4,500 women. Vaginal reconstruction after cancer varies by cancer type and stage.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Evaluation and Counseling',
      duration: 'Several weeks to months',
      description: 'Comprehensive evaluation, psychological assessment, and thorough discussion of options.',
      goals: [
        'Confirm diagnosis',
        'Assess anatomy',
        'Explore non-surgical options if appropriate',
        'Psychological preparation',
        'Choose surgical technique'
      ],
      activities: [
        'Physical examination',
        'MRI of pelvis',
        'Psychological evaluation',
        'Discussion of surgical options',
        'Non-surgical dilation trial (may be offered first)',
        'Support group referral'
      ],
      warningSignsThisPhase: [
        'Unrealistic expectations',
        'Psychological contraindications',
        'Medical conditions affecting surgery'
      ]
    },
    {
      phase: 2,
      name: 'Surgery',
      duration: '2-4 hours',
      description: 'Creation of neovagina using chosen technique.',
      goals: [
        'Create neovaginal space',
        'Line with graft or tissue',
        'Adequate depth and width',
        'Good blood supply'
      ],
      activities: [
        'General anesthesia',
        'Creation of vaginal space',
        'Graft placement (skin, bowel, or other)',
        'Placement of vaginal mold/stent',
        'Catheter insertion'
      ],
      warningSignsThisPhase: [
        'Bowel or bladder injury',
        'Bleeding',
        'Graft failure'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Recovery',
      duration: 'Days 1-14',
      description: 'Hospital stay followed by strict rest and stent care.',
      goals: [
        'Graft take',
        'Maintain stent in place',
        'Prevent infection',
        'Early mobility'
      ],
      activities: [
        'Bed rest initially',
        'Catheter care',
        'Stent maintenance',
        'Pain management',
        'Bowel care to prevent straining'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '7-14 days'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '1-2 weeks'
        },
        {
          name: 'Stool softeners',
          purpose: 'Prevent straining',
          duration: '4 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Excessive bleeding',
        'Foul odor',
        'Stent displacement'
      ]
    },
    {
      phase: 4,
      name: 'Dilation Phase',
      duration: 'Months (lifelong maintenance)',
      description: 'Critical phase of regular dilation to maintain vaginal size.',
      goals: [
        'Maintain vaginal depth and width',
        'Prevent stenosis',
        'Prepare for sexual activity',
        'Gradual reduction in frequency'
      ],
      activities: [
        'Regular vaginal dilation (initially 2-3 times daily)',
        'Gradual size progression',
        'Hygiene education',
        'Follow-up appointments',
        'Transition to sexual activity or maintenance dilation'
      ],
      warningSignsThisPhase: [
        'Vaginal narrowing',
        'Difficulty with dilation',
        'Pain',
        'Discharge or bleeding'
      ]
    },
    {
      phase: 5,
      name: 'Long-term',
      duration: 'Lifelong',
      description: 'Maintenance of vaginal function, sexual health, and psychological well-being.',
      goals: [
        'Maintain vaginal function',
        'Satisfactory sexual life',
        'Psychological adjustment',
        'Long-term health'
      ],
      activities: [
        'Ongoing dilation or regular sexual activity',
        'Annual gynecological check',
        'Psychological support as needed'
      ],
      warningSignsThisPhase: [
        'Vaginal stenosis',
        'Prolapse',
        'Unusual discharge',
        'Pain with intercourse'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Gynecologist or plastic surgeon specialized in reconstruction',
      'Psychologist/psychiatrist',
      'Support groups for MRKH or specific condition'
    ],
    investigations: [
      'MRI pelvis',
      'Karyotype (genetic testing)',
      'Renal ultrasound (associated abnormalities)',
      'Blood tests',
      'Examination under anesthesia if needed'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      },
      {
        medication: 'Hormones',
        instruction: 'discuss',
        reason: 'May continue or adjust'
      }
    ],
    fastingInstructions: 'No food for 8 hours, clear liquids for 6 hours. Bowel preparation as directed.',
    dayBeforeSurgery: [
      'Complete bowel preparation as directed',
      'Shower with antiseptic soap',
      'Remove all jewelry',
      'Prepare for hospital stay (5-7 days typically)'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Personal items for hospital stay',
      'List of medications',
      'Support person contact information',
      'Insurance documents'
    ],
    dayOfSurgery: [
      'Final hygiene preparation',
      'Nothing to eat or drink',
      'Arrive at designated time',
      'Bring a calm support person'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'Several techniques exist. The McIndoe technique uses a split-thickness skin graft placed over a mold inserted into a surgically created space between bladder and rectum. Intestinal vaginoplasty uses a segment of bowel (sigmoid or ileum) to line the neovagina. The Davydov technique uses peritoneum. Non-surgical dilation (Frank method) may be tried first. The surgeon creates a space between bladder and rectum, lines it with chosen tissue, and places a stent/mold to maintain the space during healing.',
    duration: '2-4 hours depending on technique',
    whatToExpect: 'You will be asleep throughout. When you wake up, you will have a catheter and a vaginal stent/mold in place. You will have discomfort but be given pain medication.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Bed rest for first few days. Avoid hip flexion. Keep stent in place.',
      expectedSymptoms: [
        'Vaginal and pelvic discomfort',
        'Catheter in place',
        'Vaginal stent present',
        'Swelling',
        'Some bloody discharge'
      ],
      activityLevel: 'Strict bed rest initially. Gradual mobilization as directed.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Stent care as directed. Keep area clean. Catheter care.'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Stent removed and dilation teaching begins.'
      },
      {
        day: 'Ongoing',
        instruction: 'Regular dilation with prescribed dilators. Good hygiene.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate initially (5-7/10), improving over 2 weeks',
      medications: [
        'Prescribed pain medication for first 1-2 weeks',
        'Transition to over-the-counter as able',
        'Lubricant for dilation'
      ],
      nonPharmacological: [
        'Ice packs (protect skin)',
        'Rest',
        'Relaxation techniques for dilation'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Sexual intercourse',
        restriction: 'Avoid',
        duration: '6-12 weeks (varies by technique)',
        reason: 'Allow complete healing'
      },
      {
        activity: 'Tampons, douching',
        restriction: 'Avoid',
        duration: '12 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Prevent strain'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Infection prevention'
      }
    ],
    dietaryGuidelines: [
      'High fiber diet to prevent constipation',
      'Plenty of fluids',
      'Avoid straining with bowel movements'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6-12 weeks',
        expectation: 'Initial healing complete, dilation established'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Vaginal lining matured, sexual activity possible'
      },
      {
        timeframe: '1 year',
        expectation: 'Full function, reduced dilation frequency needed'
      }
    ],
    functionalRecovery: 'Most women achieve satisfactory vaginal function for sexual intercourse. Average vaginal depth achieved is 8-12 cm.',
    cosmeticOutcome: 'External appearance is generally natural. Internal appearance varies by technique.',
    successRate: 'Success rates are 85-95% for various techniques. Sexual satisfaction is reported by 80-90% of patients.',
    possibleComplications: [
      {
        complication: 'Vaginal stenosis',
        riskLevel: 'moderate',
        prevention: 'Regular dilation compliance',
        management: 'Increased dilation, revision surgery if needed'
      },
      {
        complication: 'Graft failure',
        riskLevel: 'low',
        prevention: 'Proper surgical technique',
        management: 'Revision surgery'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Stent removal, begin dilation'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing, dilation progress'
      },
      {
        timing: '3 months',
        purpose: 'Vaginal assessment, sexual activity counseling'
      },
      {
        timing: '6-12 months and annually',
        purpose: 'Long-term follow-up'
      }
    ],
    rehabilitationNeeds: [
      'Dilation education and support',
      'Sexual health counseling',
      'Psychological support',
      'Relationship counseling if needed'
    ],
    lifestyleModifications: [
      'Lifelong maintenance dilation or regular sexual activity',
      'Annual gynecological examination',
      'Psychological support as needed'
    ]
  },

  warningSigns: [
    'Fever',
    'Increasing pain',
    'Foul-smelling discharge',
    'Bleeding',
    'Difficulty with dilation',
    'Signs of fistula (urine or stool from vagina)'
  ],

  emergencySigns: [
    'Heavy bleeding',
    'Signs of bowel or bladder injury',
    'Severe infection',
    'Complete stenosis'
  ],

  complianceRequirements: [
    {
      requirement: 'Regular vaginal dilation (lifelong)',
      importance: 'critical',
      consequence: 'Without dilation, the vagina will narrow and close'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of problems improves outcomes'
    },
    {
      requirement: 'Psychological support',
      importance: 'important',
      consequence: 'Emotional adjustment is key to successful outcome'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Genital Reconstruction',
      reference: 'WHO Reconstructive Surgery Guidelines',
      keyPoints: [
        'Multidisciplinary approach',
        'Psychological support essential',
        'Informed consent with realistic expectations',
        'Long-term follow-up required'
      ]
    }
  ]
};

/**
 * Penile Reconstruction
 */
export const penileReconstruction: EducationCondition = {
  id: 'genital-penile-reconstruction',
  name: 'Penile Reconstruction',
  category: 'J',
  icdCode: 'N50.8',
  description: 'Surgical reconstruction of the penis after traumatic loss, cancer surgery, or congenital abnormality.',
  alternateNames: ['Phalloplasty', 'Penile Reconstruction Surgery', 'Neophallus Creation'],
  
  overview: {
    definition: 'Penile reconstruction (phalloplasty) is complex surgery to create or reconstruct a penis when lost to trauma (including industrial or animal injury), cancer surgery (penectomy), or for severe congenital abnormalities. In African settings, penile loss from traditional circumcision complications or gangrene is also encountered. Reconstruction aims to restore urinary function, create acceptable cosmetic appearance, and potentially restore sexual function. This typically requires multiple surgeries over 1-2 years.',
    causes: [
      'Traumatic amputation (industrial, animal attack)',
      'Penile cancer requiring removal',
      'Fournier\'s gangrene',
      'Traditional circumcision complications',
      'Severe congenital abnormalities',
      'Burns',
      'Gender-affirming surgery'
    ],
    symptoms: [
      'Partial or complete penile loss',
      'Urinary difficulties',
      'Psychological distress',
      'Sexual dysfunction',
      'Cosmetic concerns'
    ],
    riskFactors: [
      'Occupational hazards',
      'Traditional practices without medical supervision',
      'Diabetes (for gangrene)',
      'Penile cancer risk factors',
      'Poor wound care'
    ],
    complications: [
      'Urethral complications (stricture, fistula)',
      'Flap failure',
      'Infection',
      'Nerve damage (loss of sensation)',
      'Implant complications',
      'Need for multiple revisions',
      'Donor site problems'
    ],
    prevalence: 'Penile loss requiring reconstruction is relatively rare but devastating. Penile cancer requiring partial or total penectomy has varying incidence, higher in regions with lower circumcision rates.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Initial Assessment and Planning',
      duration: 'Several months',
      description: 'Comprehensive evaluation, psychological support, and staged surgical planning.',
      goals: [
        'Assess remaining anatomy',
        'Psychological evaluation',
        'Discuss options and expectations',
        'Plan staged reconstruction'
      ],
      activities: [
        'Physical examination',
        'CT angiography (to map blood vessels)',
        'Urological evaluation',
        'Psychological assessment',
        'Support and counseling',
        'Detailed surgical planning'
      ],
      warningSignsThisPhase: [
        'Unrealistic expectations',
        'Uncontrolled medical conditions',
        'Active infection or cancer'
      ]
    },
    {
      phase: 2,
      name: 'Neophallus Creation',
      duration: '6-10 hours (major surgery)',
      description: 'Creation of the new penis using tissue from forearm, thigh, or abdomen.',
      goals: [
        'Create neophallus with adequate size',
        'Establish blood supply (microvascular)',
        'Preserve or create sensation',
        'Create external appearance'
      ],
      activities: [
        'General anesthesia',
        'Tissue flap harvest (commonly radial forearm free flap)',
        'Microvascular anastomosis',
        'Nerve coaptation for sensation',
        'Shaping and attachment',
        'Skin grafting of donor site'
      ],
      warningSignsThisPhase: [
        'Flap failure',
        'Bleeding',
        'Vascular compromise'
      ]
    },
    {
      phase: 3,
      name: 'Recovery from Stage 1',
      duration: 'Weeks to months',
      description: 'Healing of neophallus and donor site before next stage.',
      goals: [
        'Flap survival',
        'Donor site healing',
        'Preparation for next stage',
        'Psychological support'
      ],
      activities: [
        'Close monitoring of flap',
        'Wound care',
        'Physiotherapy for donor area',
        'Urinary management (suprapubic catheter)',
        'Follow-up appointments'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: 'As directed'
        },
        {
          name: 'Aspirin or anticoagulant',
          purpose: 'Prevent clot in blood vessels',
          duration: 'As directed'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: 'Weeks'
        }
      ],
      warningSignsThisPhase: [
        'Color changes in neophallus (white, blue, mottled)',
        'Fever',
        'Discharge',
        'Donor site problems'
      ]
    },
    {
      phase: 4,
      name: 'Urethral Reconstruction',
      duration: 'Second major surgery (2-4 hours)',
      description: 'Creation of urethra to allow standing urination.',
      goals: [
        'Create functional urethra',
        'Allow voiding through neophallus',
        'Minimize complications'
      ],
      activities: [
        'Urethroplasty',
        'Connection to native urethra',
        'Catheter placement',
        'Close monitoring'
      ],
      warningSignsThisPhase: [
        'Fistula development',
        'Stricture',
        'Infection'
      ]
    },
    {
      phase: 5,
      name: 'Optional: Implant Placement',
      duration: 'Third surgery if desired',
      description: 'Placement of penile prosthesis for rigidity if sexual function desired.',
      goals: [
        'Enable penetrative sexual function',
        'Reliable erection mechanism'
      ],
      activities: [
        'Penile implant insertion (usually 12+ months after initial surgery)',
        'Recovery and training on use'
      ],
      warningSignsThisPhase: [
        'Implant infection',
        'Implant erosion',
        'Mechanical failure'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon specialized in phalloplasty',
      'Urologist',
      'Psychologist/psychiatrist',
      'Vascular surgeon (for complex cases)'
    ],
    investigations: [
      'CT angiography of donor site',
      'Complete blood work',
      'Urological evaluation',
      'Psychological assessment',
      'Cardiac evaluation if indicated'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'Balance between stopping and maintaining'
      },
      {
        medication: 'Smoking cessation',
        instruction: 'stop',
        reason: 'Smoking significantly increases flap failure risk'
      }
    ],
    fastingInstructions: 'Nothing by mouth for 8 hours before surgery.',
    dayBeforeSurgery: [
      'Shower with antiseptic soap',
      'Shave as directed',
      'Prepare for extended hospital stay (1-2 weeks)',
      'Arrange extended recovery support'
    ],
    whatToBring: [
      'Items for hospital stay (1-2 weeks)',
      'Loose comfortable clothing',
      'Support person contact',
      'All medications and records'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Final hygiene preparation',
      'Arrive early as directed'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia for 6-10 hours',
    procedureDescription: 'The most common technique is the radial forearm free flap (RFFF). A section of forearm skin, with its blood vessels and nerves, is shaped into a tube to form the neophallus. This is transferred to the genital area and connected using microsurgery to blood vessels and nerves. The urethra may be created within the flap or in a later stage. Alternative donor sites include the thigh (ALT flap) or abdomen. The forearm donor site is skin grafted.',
    duration: '6-10 hours for main stage',
    whatToExpect: 'This is major surgery requiring extended anesthesia. You will wake up with the neophallus and a suprapubic catheter. The arm (if forearm flap) will be bandaged. You will be closely monitored in the hospital.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Bed rest. Avoid any pressure on neophallus. Keep arm elevated if forearm donor.',
      expectedSymptoms: [
        'Significant swelling of neophallus',
        'Donor site discomfort',
        'Suprapubic catheter in place',
        'Drains present',
        'Fatigue from long surgery'
      ],
      activityLevel: 'Bed rest initially. Very gradual increase in activity.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Specialized dressing care. Flap monitoring (color, temperature). Donor site care.'
      },
      {
        day: 'Weeks 1-4',
        instruction: 'Gradual dressing changes. Skin graft care for donor site. Suture removal.'
      },
      {
        day: 'Months',
        instruction: 'Scar management. Preparation for next stage.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to significant initially',
      medications: [
        'Strong prescription pain medication initially',
        'Transition over weeks',
        'Specific medications for nerve pain if needed'
      ],
      nonPharmacological: [
        'Positioning',
        'Ice packs (not directly on neophallus)',
        'Distraction and support'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy use of donor arm (if RFFF)',
        restriction: 'Avoid',
        duration: '3-6 months',
        reason: 'Allow healing and strengthening'
      },
      {
        activity: 'Sexual activity',
        restriction: 'Avoid',
        duration: 'Until cleared after all stages',
        reason: 'Neophallus must fully heal'
      },
      {
        activity: 'Strenuous activity',
        restriction: 'Avoid',
        duration: '6 weeks after each stage',
        reason: 'Allow healing'
      }
    ],
    dietaryGuidelines: [
      'Healthy balanced diet for healing',
      'High protein intake',
      'Good hydration',
      'Avoid alcohol'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Initial stage healed'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Secondary procedures completed'
      }
    ],
    longTerm: [
      {
        timeframe: '1-2 years',
        expectation: 'Full reconstruction complete'
      },
      {
        timeframe: 'Ongoing',
        expectation: 'Functional neophallus, possible sexual function'
      }
    ],
    functionalRecovery: 'Urination through neophallus achieved in 75-85%. Erogenous sensation develops in 80-90%. With implant, penetrative function possible in 70-80%.',
    cosmeticOutcome: 'Modern techniques achieve good cosmetic results. Size is typically comparable to average. Donor site scar is the main cosmetic trade-off.',
    successRate: 'Flap survival is 95%+ in experienced hands. Complete urethral reconstruction success is 75-85%. Sexual function with implant 70-80%.',
    possibleComplications: [
      {
        complication: 'Urethral fistula',
        riskLevel: 'moderate',
        prevention: 'Careful technique, staged approach',
        management: 'Secondary repair'
      },
      {
        complication: 'Flap failure',
        riskLevel: 'low',
        prevention: 'Experienced microsurgeon, no smoking',
        management: 'Emergency salvage or revision'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Days 1-14',
        purpose: 'Close flap monitoring'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing'
      },
      {
        timing: '3-6 months',
        purpose: 'Plan next stage'
      },
      {
        timing: 'Ongoing for 2+ years',
        purpose: 'Complete reconstruction and follow-up'
      }
    ],
    rehabilitationNeeds: [
      'Hand/arm therapy if forearm donor',
      'Pelvic floor exercises',
      'Sexual health counseling',
      'Psychological support throughout'
    ],
    lifestyleModifications: [
      'Absolute smoking cessation',
      'Careful protection of neophallus during healing',
      'Patience through multi-stage process'
    ]
  },

  warningSigns: [
    'Color changes in neophallus (pale, blue, mottled)',
    'Temperature changes (cold neophallus is concerning)',
    'Fever',
    'Increased swelling',
    'Discharge or bleeding',
    'Donor site problems'
  ],

  emergencySigns: [
    'Sudden color change of neophallus (emergency - flap may be failing)',
    'Heavy bleeding',
    'Signs of severe infection',
    'Urinary problems'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolute smoking cessation',
      importance: 'critical',
      consequence: 'Smoking dramatically increases flap failure risk'
    },
    {
      requirement: 'Close monitoring and immediate reporting of changes',
      importance: 'critical',
      consequence: 'Early detection of flap problems allows salvage'
    },
    {
      requirement: 'Complete all stages of reconstruction',
      importance: 'important',
      consequence: 'Incomplete reconstruction limits function'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Principles of Reconstructive Surgery',
      reference: 'WHO Surgical Guidelines',
      keyPoints: [
        'Specialized surgical team required',
        'Multidisciplinary approach',
        'Psychological support essential',
        'Realistic expectations and informed consent'
      ]
    }
  ]
};

// Export genital reconstruction part 2
export const genitalReconstructionPart2 = [vaginalReconstruction, penileReconstruction];
