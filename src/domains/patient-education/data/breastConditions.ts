/**
 * Patient Education Content - Category H: Breast Conditions
 * Part 1: Breast Cancer and Fibroadenoma
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Breast Surgery Standards
 */

import type { EducationCondition } from '../types';

/**
 * Breast Cancer
 */
export const breastCancer: EducationCondition = {
  id: 'breast-cancer',
  name: 'Breast Cancer',
  category: 'H',
  icdCode: 'C50',
  description: 'Breast cancer is a malignant tumor that develops from breast tissue. It is the most common cancer in women worldwide and can occur in men. Early detection and modern treatment have significantly improved survival rates.',
  alternateNames: ['Mammary Carcinoma', 'Breast Malignancy', 'Carcinoma of Breast'],
  
  overview: {
    definition: 'Breast cancer occurs when abnormal cells in the breast multiply uncontrollably, forming a tumor that can invade surrounding tissue and spread (metastasize) to other parts of the body. Types include ductal carcinoma (most common, starting in milk ducts), lobular carcinoma (starting in milk-producing glands), and inflammatory breast cancer. Treatment depends on the type, stage, hormone receptor status (ER, PR), and HER2 status of the cancer.',
    causes: [
      'Genetic mutations (BRCA1, BRCA2)',
      'Hormonal factors (estrogen exposure)',
      'Family history',
      'Age (risk increases with age)',
      'Lifestyle factors',
      'Previous breast conditions',
      'Radiation exposure'
    ],
    symptoms: [
      'Painless breast lump (most common)',
      'Change in breast size or shape',
      'Nipple changes (inversion, discharge)',
      'Skin changes (dimpling, puckering)',
      'Orange-peel skin (peau d\'orange)',
      'Breast pain (less common)',
      'Lump in armpit (lymph node)',
      'Nipple rash or crusting'
    ],
    riskFactors: [
      'Female gender',
      'Increasing age',
      'Family history of breast/ovarian cancer',
      'BRCA1/BRCA2 gene mutations',
      'Early menstruation/late menopause',
      'Hormone replacement therapy',
      'Obesity (postmenopausal)',
      'Alcohol consumption',
      'Previous breast cancer or DCIS',
      'Dense breast tissue'
    ],
    complications: [
      'Local recurrence',
      'Metastatic spread (bone, liver, lung, brain)',
      'Lymphedema (arm swelling)',
      'Treatment side effects',
      'Psychological impact',
      'Fertility issues from treatment'
    ],
    prevalence: 'Breast cancer affects 1 in 8 women over their lifetime. Over 2 million new cases diagnosed worldwide annually. 5-year survival rate is >90% when detected early.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Staging',
      duration: '2-4 weeks',
      description: 'Comprehensive evaluation to confirm diagnosis, determine cancer type, and stage the disease.',
      goals: [
        'Confirm diagnosis with biopsy',
        'Determine cancer type and grade',
        'Assess hormone receptor and HER2 status',
        'Stage the disease',
        'Develop treatment plan'
      ],
      activities: [
        'Core needle biopsy or surgical biopsy',
        'Mammography and breast ultrasound',
        'Breast MRI',
        'CT scan (if metastatic disease suspected)',
        'Bone scan or PET scan (staging)',
        'Blood tests including tumor markers',
        'Genetic testing if indicated'
      ],
      warningSignsThisPhase: [
        'Rapid tumor growth',
        'Signs of inflammatory breast cancer',
        'Symptoms of metastatic disease'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Treatment Planning',
      duration: '1-2 weeks',
      description: 'Multidisciplinary team discussion and preparation for treatment.',
      goals: [
        'Multidisciplinary team review',
        'Discuss treatment options with patient',
        'Informed consent',
        'Prepare for surgery/treatment'
      ],
      activities: [
        'MDT meeting',
        'Surgical planning',
        'Pre-operative assessment',
        'Fertility preservation discussion if appropriate',
        'Psychological support'
      ],
      medications: [
        {
          name: 'Neoadjuvant chemotherapy',
          purpose: 'May be given before surgery to shrink tumor',
          duration: '3-6 months if indicated'
        }
      ],
      warningSignsThisPhase: [
        'Tumor progression during neoadjuvant therapy',
        'Severe side effects from chemotherapy'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Treatment',
      duration: '1-2 days hospital stay',
      description: 'Surgery to remove the cancer, ranging from lumpectomy to mastectomy.',
      goals: [
        'Complete cancer removal',
        'Assess lymph node status',
        'Achieve clear margins',
        'Consider reconstruction'
      ],
      activities: [
        'Breast-conserving surgery (lumpectomy) or mastectomy',
        'Sentinel lymph node biopsy',
        'Axillary lymph node dissection if needed',
        'Immediate reconstruction if chosen'
      ],
      warningSignsThisPhase: [
        'Positive surgical margins',
        'Extensive lymph node involvement',
        'Post-operative complications'
      ]
    },
    {
      phase: 4,
      name: 'Adjuvant Therapy',
      duration: '3-12 months',
      description: 'Additional treatments after surgery to reduce recurrence risk.',
      goals: [
        'Eliminate microscopic disease',
        'Reduce recurrence risk',
        'Target specific cancer features',
        'Manage side effects'
      ],
      activities: [
        'Radiotherapy (after lumpectomy usually)',
        'Chemotherapy (if indicated)',
        'Targeted therapy (HER2 positive)',
        'Hormone therapy (ER/PR positive)'
      ],
      medications: [
        {
          name: 'Chemotherapy regimens',
          purpose: 'Kill remaining cancer cells',
          duration: '3-6 months'
        },
        {
          name: 'Trastuzumab (Herceptin)',
          purpose: 'Target HER2 positive cancers',
          duration: '1 year'
        },
        {
          name: 'Tamoxifen or Aromatase inhibitors',
          purpose: 'Block hormone-driven cancer growth',
          duration: '5-10 years'
        }
      ],
      warningSignsThisPhase: [
        'Severe treatment side effects',
        'Signs of recurrence',
        'Cardiac issues with Herceptin'
      ]
    },
    {
      phase: 5,
      name: 'Long-Term Surveillance',
      duration: 'Lifelong',
      description: 'Regular monitoring for recurrence and management of long-term effects.',
      goals: [
        'Early detection of recurrence',
        'Manage long-term side effects',
        'Support survivorship',
        'Ongoing hormone therapy compliance'
      ],
      activities: [
        'Regular clinical examinations',
        'Annual mammography',
        'Blood tests as needed',
        'Bone density monitoring',
        'Psychological support'
      ],
      warningSignsThisPhase: [
        'New breast lump',
        'Bone pain',
        'Persistent cough',
        'Unexplained weight loss'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Breast surgeon',
      'Medical oncologist',
      'Radiation oncologist',
      'Plastic surgeon (if reconstruction planned)',
      'Breast care nurse',
      'Genetic counselor (if indicated)'
    ],
    investigations: [
      'Core needle biopsy with pathology',
      'Mammography',
      'Breast ultrasound',
      'Breast MRI (selected cases)',
      'Staging CT scan and bone scan (if indicated)',
      'Blood tests: FBC, U&E, LFT, tumor markers',
      'ECG and echocardiogram (if chemotherapy planned)'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed (usually 5-7 days before)',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Hormone replacement therapy',
        instruction: 'stop',
        reason: 'May stimulate hormone-positive cancers'
      },
      {
        medication: 'Regular medications',
        instruction: 'continue unless advised otherwise',
        reason: 'Maintain health'
      }
    ],
    fastingInstructions: 'No food for 6 hours before surgery. Clear fluids up to 2 hours before.',
    dayBeforeSurgery: [
      'Shower with antiseptic wash if provided',
      'No shaving of underarm',
      'Pack overnight bag',
      'Arrange transport home',
      'Get good rest'
    ],
    whatToBring: [
      'Loose, front-opening top or dress',
      'Comfortable supportive bra (post-surgical if provided)',
      'Toiletries',
      'Medications list',
      'Insurance/hospital documents',
      'Book or entertainment for recovery'
    ],
    dayOfSurgery: [
      'Remain fasted',
      'Take essential medications with sip of water',
      'No makeup, nail polish, or jewelry',
      'Arrive at designated time',
      'Bring someone for support'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'BREAST-CONSERVING SURGERY (Lumpectomy/Wide Local Excision): The tumor is removed with a margin of normal tissue. The breast shape is preserved. Usually combined with radiotherapy. Suitable for smaller tumors. MASTECTOMY: The entire breast tissue is removed. May be simple (breast tissue only) or modified radical (including lymph nodes). Skin-sparing or nipple-sparing mastectomy may allow better reconstruction. SENTINEL LYMPH NODE BIOPSY: A tracer is injected to identify the first lymph node(s) that drain the breast. These nodes are removed and checked for cancer. If clear, no further lymph node surgery is needed. AXILLARY LYMPH NODE DISSECTION: Removal of lymph nodes from the armpit if cancer is found in sentinel nodes or known spread. RECONSTRUCTION: Can be immediate (at the same surgery) or delayed. Options include implants or tissue from other body parts (DIEP flap, latissimus flap).',
    duration: 'Lumpectomy: 1-2 hours. Mastectomy: 2-3 hours. With reconstruction: 3-6 hours.',
    whatToExpect: 'General anesthesia. Wake up with dressing on breast. May have drain tubes. Usually overnight stay. Some pain and tightness expected.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Semi-upright position. Affected arm supported on pillow.',
      expectedSymptoms: [
        'Pain and tenderness',
        'Swelling and bruising',
        'Tightness across chest',
        'Numbness in breast/arm area',
        'Drainage from tubes if present'
      ],
      activityLevel: 'Gentle mobilization encouraged. Arm exercises as taught by physiotherapist.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep dressings dry. Empty drains as instructed. Record drainage amounts.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Drains usually removed when output <30ml/day. Sutures may dissolve or be removed.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Gentle scar massage when healed. Continue arm exercises.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) initially, improving over weeks',
      medications: [
        'Paracetamol regularly',
        'NSAIDs if not contraindicated',
        'Codeine or tramadol for breakthrough pain',
        'Nerve pain medication if needed'
      ],
      nonPharmacological: [
        'Arm elevation',
        'Gentle exercises',
        'Supportive bra',
        'Heat or cold packs as comfortable'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Arm exercises',
        restriction: 'Start gentle exercises as taught',
        duration: 'From day 1, progress gradually',
        reason: 'Prevent stiffness, reduce lymphedema risk'
      },
      {
        activity: 'Lifting',
        restriction: 'No heavy lifting (>5kg)',
        duration: '4-6 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Driving',
        restriction: 'When comfortable and off strong pain medication',
        duration: 'Usually 2-4 weeks',
        reason: 'Safety'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid until wound fully healed',
        duration: '4-6 weeks',
        reason: 'Infection prevention'
      }
    ],
    dietaryGuidelines: [
      'Balanced, nutritious diet',
      'Adequate protein for healing',
      'Plenty of fruits and vegetables',
      'Stay well hydrated',
      'Limit alcohol',
      'Maintain healthy weight'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Drains removed, wound healing, pain improving'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Return to most normal activities, adjuvant therapy begins'
      }
    ],
    longTerm: [
      {
        timeframe: '6-12 months',
        expectation: 'Complete adjuvant therapy, scar matured'
      },
      {
        timeframe: '5+ years',
        expectation: 'Ongoing surveillance, excellent survival for early-stage disease'
      }
    ],
    functionalRecovery: 'Most patients return to full function. Arm range of motion regained with exercises. Some may experience long-term numbness or tightness.',
    cosmeticOutcome: 'Depends on surgery type. Lumpectomy usually good cosmetic result. Reconstruction can achieve good symmetry. Prostheses available.',
    successRate: 'Stage I: >95% 5-year survival. Stage II: 85-95%. Stage III: 70-85%. Results depend on cancer biology and response to treatment.',
    possibleComplications: [
      'Seroma (fluid collection)',
      'Wound infection',
      'Bleeding/hematoma',
      'Lymphedema (arm swelling)',
      'Chronic pain',
      'Shoulder stiffness',
      'Numbness',
      'Implant complications if reconstruction',
      'Recurrence'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, drain removal, pathology results'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Treatment planning, begin adjuvant therapy'
      },
      {
        timing: 'Every 3-6 months for 5 years',
        purpose: 'Oncology follow-up, monitor for recurrence'
      },
      {
        timing: 'Annually ongoing',
        purpose: 'Mammography, clinical examination'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy for arm mobility',
      'Lymphedema prevention education',
      'Psychological support/counseling',
      'Breast care nurse support',
      'Support groups'
    ],
    lifestyleModifications: [
      'Maintain healthy weight',
      'Regular physical exercise',
      'Limit alcohol',
      'Balanced diet rich in plants',
      'Arm care to prevent lymphedema',
      'No blood pressure or needles on affected arm',
      'Protect arm from cuts and burns'
    ]
  },

  warningSigns: [
    'Increasing pain or swelling',
    'Wound opening or discharge',
    'Fever or chills',
    'Red, hot, swollen arm (lymphedema/cellulitis)',
    'Increasing arm swelling',
    'Shortness of breath'
  ],

  emergencySigns: [
    'Severe chest pain',
    'Difficulty breathing',
    'Signs of blood clot (DVT/PE)',
    'High fever with wound infection',
    'Severe arm swelling with pain (lymphedema emergency)',
    'Confusion or severe headache'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all oncology appointments',
      importance: 'critical',
      consequence: 'Missing appointments may delay treatment and affect outcomes'
    },
    {
      requirement: 'Complete adjuvant therapy as prescribed',
      importance: 'critical',
      consequence: 'Incomplete treatment increases recurrence risk'
    },
    {
      requirement: 'Take hormone therapy daily for prescribed duration',
      importance: 'critical',
      consequence: 'Non-compliance significantly increases recurrence risk'
    },
    {
      requirement: 'Perform arm exercises regularly',
      importance: 'important',
      consequence: 'Prevents stiffness and reduces lymphedema risk'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Breast Cancer Management Guidelines',
      reference: 'World Health Organization 2021',
      keyPoints: [
        'Early detection through awareness and screening saves lives',
        'Multidisciplinary care improves outcomes',
        'Breast-conserving surgery is equivalent to mastectomy for suitable cases',
        'Sentinel node biopsy reduces morbidity versus full dissection',
        'Adjuvant therapy based on tumor characteristics',
        'Access to essential medicines and radiotherapy is critical'
      ]
    }
  ]
};

/**
 * Fibroadenoma
 */
export const fibroadenoma: EducationCondition = {
  id: 'breast-fibroadenoma',
  name: 'Fibroadenoma',
  category: 'H',
  icdCode: 'D24',
  description: 'A fibroadenoma is a common benign (non-cancerous) breast tumor made up of glandular and connective tissue. It typically appears as a painless, smooth, rubbery lump that moves easily in the breast.',
  alternateNames: ['Breast Mouse', 'Fibroadenoma of Breast', 'Benign Breast Lump'],
  
  overview: {
    definition: 'Fibroadenomas are the most common benign breast tumors, particularly in young women. They are composed of both glandular (milk-producing) and stromal (connective) tissue. They feel smooth, round, and rubbery, and can be moved around within the breast (hence "breast mouse"). Most fibroadenomas are small (<3cm) and do not require treatment. Larger (giant) fibroadenomas or those causing concern may be removed surgically.',
    causes: [
      'Hormonal influence (estrogen)',
      'Most common in reproductive years',
      'May enlarge during pregnancy',
      'Often shrink after menopause',
      'Exact cause unknown'
    ],
    symptoms: [
      'Painless breast lump',
      'Smooth, rubbery texture',
      'Well-defined, rounded edges',
      'Movable within breast tissue',
      'Usually single, but can be multiple',
      'May fluctuate with menstrual cycle'
    ],
    riskFactors: [
      'Young age (15-35 most common)',
      'Female gender',
      'Reproductive age',
      'Hormonal factors',
      'Oral contraceptive use (some studies)'
    ],
    complications: [
      'Anxiety about lump',
      'Giant fibroadenoma (>5cm)',
      'Complex fibroadenoma (slightly increased cancer risk)',
      'Cosmetic deformity if large',
      'Rare malignant transformation (phyllodes tumor)'
    ],
    prevalence: 'Most common benign breast tumor. Affects up to 10% of women, more common in women under 30. Accounts for over 50% of breast biopsies in young women.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Triple Assessment',
      duration: '1-2 weeks',
      description: 'Standard breast assessment to confirm benign nature of the lump.',
      goals: [
        'Confirm diagnosis',
        'Exclude malignancy',
        'Determine management approach',
        'Reassure patient'
      ],
      activities: [
        'Clinical breast examination',
        'Breast ultrasound (primary imaging in young women)',
        'Core needle biopsy or fine needle aspiration',
        'Mammography (if over 40)'
      ],
      warningSignsThisPhase: [
        'Atypical features on imaging',
        'Suspicious biopsy result',
        'Rapid growth'
      ]
    },
    {
      phase: 2,
      name: 'Management Decision',
      duration: 'Ongoing if observation chosen',
      description: 'Decision about observation versus surgical removal based on patient preference and tumor characteristics.',
      goals: [
        'Informed decision-making',
        'Address patient concerns',
        'Plan appropriate management'
      ],
      activities: [
        'Discussion of options',
        'Observation with periodic ultrasound (for small stable fibroadenomas)',
        'Or surgical excision planning'
      ],
      warningSignsThisPhase: [
        'Significant growth on surveillance',
        'Change in character',
        'New symptoms'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Excision (if chosen)',
      duration: 'Day surgery',
      description: 'Surgical removal of the fibroadenoma if indicated or requested.',
      goals: [
        'Complete removal of lump',
        'Good cosmetic outcome',
        'Histological confirmation',
        'Patient reassurance'
      ],
      activities: [
        'Excision biopsy',
        'Vacuum-assisted excision (alternative for smaller lumps)',
        'Histopathology of specimen'
      ],
      warningSignsThisPhase: [
        'Unexpected pathology',
        'Wound complications'
      ]
    },
    {
      phase: 4,
      name: 'Follow-Up',
      duration: '4-6 weeks post-surgery; ongoing if observing',
      description: 'Post-operative check or continued surveillance if not surgically managed.',
      goals: [
        'Confirm wound healing',
        'Review pathology',
        'Reassure patient',
        'Plan any further follow-up'
      ],
      activities: [
        'Wound check',
        'Pathology review',
        'Breast awareness education',
        'Discharge or surveillance plan'
      ],
      warningSignsThisPhase: [
        'Wound complications',
        'New breast lumps',
        'Unexpected pathology result'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Breast surgeon',
      'Breast care nurse'
    ],
    investigations: [
      'Breast ultrasound',
      'Core needle biopsy',
      'Mammography if age appropriate',
      'Routine blood tests (if required by hospital)'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss with surgeon',
        reason: 'May need to stop briefly'
      },
      {
        medication: 'Regular medications',
        instruction: 'continue as normal',
        reason: 'Minor surgery, few drug interactions'
      }
    ],
    fastingInstructions: 'No food for 6 hours if general anesthesia. May eat if local anesthesia only - confirm with surgeon.',
    dayBeforeSurgery: [
      'Shower normally',
      'No special preparation needed',
      'Arrange transport home'
    ],
    whatToBring: [
      'Comfortable supportive bra',
      'Loose, front-opening top',
      'Driver to take home',
      'ID and hospital documents'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Wear comfortable clothing',
      'Remove jewelry',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia or local anesthesia with sedation',
    procedureDescription: 'EXCISION BIOPSY: A small incision is made in the breast, often along the natural crease or around the areola for cosmesis. The fibroadenoma is carefully dissected out from surrounding breast tissue. The incision is closed with dissolving sutures. The specimen is sent for pathology. VACUUM-ASSISTED EXCISION (VAE): For smaller fibroadenomas, a needle-based technique can be used. Under ultrasound guidance, a special vacuum-assisted probe removes the lump through a small cut. Less scarring but may not be complete removal for larger lumps.',
    duration: '30-60 minutes',
    whatToExpect: 'Day surgery procedure. Local or general anesthesia. Small incision. Go home same day. Minimal pain expected.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Normal positioning. Wear supportive bra.',
      expectedSymptoms: [
        'Mild pain or discomfort',
        'Bruising around incision',
        'Slight swelling',
        'Numbness around wound'
      ],
      activityLevel: 'Normal activities can resume quickly. Avoid strenuous activity for 1-2 weeks.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep dressing dry. Can shower with waterproof dressing.'
      },
      {
        day: 'Days 3-7',
        instruction: 'May remove dressing. Keep wound clean and dry.'
      },
      {
        day: 'Week 2',
        instruction: 'Sutures usually dissolve. Steri-strips fall off naturally.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild (2-4/10)',
      medications: [
        'Paracetamol as needed',
        'Ibuprofen if needed',
        'Rarely need stronger pain relief'
      ],
      nonPharmacological: [
        'Supportive bra',
        'Ice pack if needed',
        'Rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Normal activities',
        restriction: 'Resume as comfortable',
        duration: 'Within days',
        reason: 'Minor surgery'
      },
      {
        activity: 'Exercise',
        restriction: 'Avoid strenuous exercise and lifting',
        duration: '1-2 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid until wound healed',
        duration: '2 weeks',
        reason: 'Prevent infection'
      }
    ],
    dietaryGuidelines: [
      'Normal diet',
      'No special dietary requirements'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 days',
        expectation: 'Return to normal activities, mild discomfort'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Wound healed, pathology results confirmed'
      }
    ],
    longTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Full recovery, scar fading'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Excellent prognosis, may develop new fibroadenomas'
      }
    ],
    functionalRecovery: 'Excellent. No functional limitation. Normal breast tissue preserved.',
    cosmeticOutcome: 'Good to excellent. Small scar, often hidden in natural crease or areola border. May have minor contour change if large lump removed.',
    successRate: 'Complete removal in >95% of cases. Recurrence possible (new fibroadenomas may develop, rarely at same site).',
    possibleComplications: [
      'Seroma (fluid collection)',
      'Hematoma (blood collection)',
      'Wound infection (rare)',
      'Scarring',
      'Contour deformity (rare, large lumps)',
      'Recurrence or new fibroadenomas'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check, pathology results'
      },
      {
        timing: 'As needed',
        purpose: 'If new lumps develop'
      }
    ],
    rehabilitationNeeds: [
      'No formal rehabilitation needed',
      'Breast awareness education'
    ],
    lifestyleModifications: [
      'Regular breast self-examination',
      'Report new lumps promptly',
      'No specific lifestyle changes required'
    ]
  },

  warningSigns: [
    'Increasing pain or swelling',
    'Wound redness or discharge',
    'Fever',
    'Fluid leaking from wound'
  ],

  emergencySigns: [
    'Significant wound bleeding',
    'High fever with wound changes',
    'Severe breast pain'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend follow-up to receive pathology results',
      importance: 'important',
      consequence: 'Important to confirm benign diagnosis'
    },
    {
      requirement: 'Report new breast lumps',
      importance: 'important',
      consequence: 'New fibroadenomas may develop'
    }
  ],

  whoGuidelines: [
    {
      title: 'Benign Breast Disease Management',
      reference: 'Breast Surgery Clinical Guidelines',
      keyPoints: [
        'Triple assessment is standard for all breast lumps',
        'Observation is appropriate for small, confirmed fibroadenomas',
        'Surgery reserved for large, symptomatic, or patient preference',
        'Fibroadenomas are benign with excellent prognosis',
        'Complex fibroadenomas need careful histology review'
      ]
    }
  ]
};

// Export breast conditions part 1
export const breastConditionsPart1 = [breastCancer, fibroadenoma];
