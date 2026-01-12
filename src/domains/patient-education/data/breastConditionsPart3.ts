/**
 * Patient Education Content - Category H: Breast Conditions
 * Part 3: Breast Reconstruction and Gynecomastia
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Breast Surgery Standards
 */

import type { EducationCondition } from '../types';

/**
 * Breast Reconstruction
 */
export const breastReconstruction: EducationCondition = {
  id: 'breast-reconstruction',
  name: 'Breast Reconstruction',
  category: 'H',
  icdCode: 'Z42.1',
  description: 'Breast reconstruction is surgery to recreate a breast shape after mastectomy or lumpectomy. It can be done at the same time as cancer surgery (immediate) or later (delayed), using implants, your own tissue, or a combination.',
  alternateNames: ['Mammoplasty', 'Breast Rebuilding', 'Post-Mastectomy Reconstruction'],
  
  overview: {
    definition: 'Breast reconstruction is a surgical procedure that restores the shape, size, and appearance of the breast after mastectomy or breast-conserving surgery for cancer. It can be performed immediately at the time of cancer surgery or delayed months to years later. Options include implant-based reconstruction (silicone or saline implants) or autologous reconstruction (using tissue from other parts of your body such as the abdomen, back, or thighs). The choice depends on patient preference, body habitus, cancer treatment plan, and surgeon expertise.',
    causes: [
      'Mastectomy for breast cancer',
      'Prophylactic mastectomy (risk reduction)',
      'Lumpectomy defect correction',
      'Breast asymmetry after cancer treatment'
    ],
    symptoms: [
      'Not applicable - reconstruction is elective',
      'Reasons for seeking reconstruction:',
      'Desire to restore breast shape',
      'Improve body image and confidence',
      'Avoid external prostheses',
      'Achieve symmetry with other breast'
    ],
    riskFactors: [
      'Factors affecting reconstruction options:',
      'Body mass index (obesity increases complications)',
      'Smoking (major risk factor)',
      'Diabetes',
      'Previous radiation therapy',
      'Need for post-mastectomy radiation',
      'Previous abdominal surgery (affects flap options)'
    ],
    complications: [
      'Implant complications (capsular contracture, rupture)',
      'Flap failure (partial or complete)',
      'Infection',
      'Wound healing problems',
      'Fat necrosis',
      'Asymmetry requiring revision',
      'Seroma and hematoma',
      'Donor site complications'
    ],
    prevalence: 'Breast reconstruction rates vary globally. In developed countries, 40-60% of mastectomy patients undergo reconstruction. Immediate reconstruction is increasingly common.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Reconstruction Planning',
      duration: '2-6 weeks',
      description: 'Consultation, decision-making, and preparation for reconstruction.',
      goals: [
        'Discuss reconstruction options',
        'Choose appropriate technique',
        'Optimize health for surgery',
        'Coordinate with cancer treatment plan'
      ],
      activities: [
        'Plastic surgery consultation',
        'Discussion of options (implant vs autologous)',
        'Pre-operative photos',
        'Smoking cessation (minimum 4-6 weeks)',
        'Weight optimization if needed',
        'Medical optimization'
      ],
      warningSignsThisPhase: [
        'Continued smoking (major risk)',
        'Uncontrolled diabetes',
        'Inadequate donor tissue'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Reconstruction',
      duration: '1-4 days hospital stay',
      description: 'The reconstruction surgery, either immediate (with mastectomy) or delayed.',
      goals: [
        'Create breast mound',
        'Achieve symmetry',
        'Minimize complications',
        'Good cosmetic outcome'
      ],
      activities: [
        'Implant placement or tissue transfer',
        'Mastectomy if immediate reconstruction',
        'Drain insertion',
        'Post-operative monitoring'
      ],
      warningSignsThisPhase: [
        'Flap viability concerns',
        'Excessive bleeding',
        'Early infection signs'
      ]
    },
    {
      phase: 3,
      name: 'Initial Recovery',
      duration: '4-6 weeks',
      description: 'Healing of wounds, drain removal, and early recovery.',
      goals: [
        'Wound healing',
        'Drain removal',
        'Pain management',
        'Early return to activities'
      ],
      activities: [
        'Wound care',
        'Drain management and removal',
        'Arm exercises (after mastectomy)',
        'Gradual activity increase'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Skin necrosis',
        'Implant exposure',
        'Fat necrosis (hard lumps in flap)'
      ]
    },
    {
      phase: 4,
      name: 'Completion and Revision',
      duration: '3-12 months later',
      description: 'Additional procedures for optimization, including nipple reconstruction and symmetry procedures.',
      goals: [
        'Create nipple if desired',
        'Optimize symmetry',
        'Revise contour if needed',
        'Final aesthetic result'
      ],
      activities: [
        'Nipple reconstruction (surgical)',
        'Nipple tattooing',
        'Fat grafting for contour',
        'Contralateral breast adjustment (lift, reduction, augmentation)'
      ],
      warningSignsThisPhase: [
        'Capsular contracture (implant)',
        'Significant asymmetry',
        'Patient dissatisfaction'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon',
      'Breast surgeon (if combined with mastectomy)',
      'Oncologist',
      'Anesthetist'
    ],
    investigations: [
      'Standard pre-operative blood tests',
      'ECG',
      'Chest X-ray if indicated',
      'CT angiography (for perforator flaps like DIEP)',
      'Mammography of contralateral breast'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed (usually 7 days)',
        reason: 'Reduce bleeding and hematoma risk'
      },
      {
        medication: 'Oral contraceptives/HRT',
        instruction: 'may need to stop',
        reason: 'DVT risk with long surgery'
      },
      {
        medication: 'Herbal supplements',
        instruction: 'stop 2 weeks before',
        reason: 'Some increase bleeding'
      }
    ],
    fastingInstructions: 'No food for 6 hours, clear fluids up to 2 hours before surgery.',
    dayBeforeSurgery: [
      'Shower with antiseptic wash',
      'Prepare recovery area at home',
      'Arrange help for first 1-2 weeks',
      'Pack comfortable loose clothing',
      'No shaving of surgical sites'
    ],
    whatToBring: [
      'Loose front-opening tops/dresses',
      'Post-surgical bra if provided',
      'Pillow for car journey home',
      'Entertainment for hospital stay',
      'Toiletries'
    ],
    dayOfSurgery: [
      'Remain fasted',
      'No makeup, nail polish, jewelry',
      'Wear comfortable loose clothing',
      'Arrive at designated time',
      'Bring support person'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'IMPLANT-BASED RECONSTRUCTION: A tissue expander or permanent implant is placed under the chest muscle or in front of it (prepectoral). Expanders are gradually inflated over weeks to stretch the skin, then replaced with permanent implant. May use acellular dermal matrix (ADM) for support. AUTOLOGOUS (FLAP) RECONSTRUCTION: DIEP FLAP - Skin and fat from lower abdomen transferred with blood vessels reconnected microsurgically. Gives natural result, tummy tuck effect. LATISSIMUS DORSI FLAP - Back muscle and skin tunneled to chest, often combined with implant. TRAM FLAP - Abdominal muscle and fat transferred. TUG FLAP - Inner thigh tissue used. NIPPLE RECONSTRUCTION: Performed 3-6 months later using local skin flaps, followed by tattooing for color.',
    duration: 'Implant: 1-2 hours. DIEP flap: 6-8 hours. Latissimus flap: 3-4 hours.',
    whatToExpect: 'General anesthesia. Wake up with dressings and drains. May have compression garments on donor site. Significant but manageable pain. Hospital stay 1-4 days depending on procedure.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Semi-upright for breast, flat if DIEP (protects abdominal closure). Support flap with pillows.',
      expectedSymptoms: [
        'Significant pain (controlled with medications)',
        'Swelling and bruising',
        'Tightness across chest',
        'Donor site discomfort (flaps)',
        'Drains in place'
      ],
      activityLevel: 'Bed rest initially for flaps. Gentle mobilization encouraged. No heavy arm use.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep all wounds dry. Empty drains and record output. Observe for color changes (flap).'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Drains removed when output <30ml/day. Gentle wound care. Wear supportive bra.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Wounds healing. Begin scar massage when fully healed. Compression for donor site.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to high initially (5-8/10), improving over weeks',
      medications: [
        'Strong pain medication first few days (morphine, oxycodone)',
        'Transition to paracetamol and ibuprofen',
        'Gabapentin for nerve pain if needed'
      ],
      nonPharmacological: [
        'Positioning with pillows',
        'Ice packs (not directly on flap)',
        'Relaxation techniques',
        'Gentle movement'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Lifting',
        restriction: 'No lifting >2kg',
        duration: '6 weeks',
        reason: 'Protect repair and donor site'
      },
      {
        activity: 'Driving',
        restriction: 'When off pain medication and comfortable',
        duration: '3-6 weeks',
        reason: 'Safety'
      },
      {
        activity: 'Exercise',
        restriction: 'No strenuous exercise',
        duration: '6-8 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Work',
        restriction: 'Desk job 2-4 weeks, physical work 6-8 weeks',
        duration: 'Variable',
        reason: 'Recovery needs'
      }
    ],
    dietaryGuidelines: [
      'High protein diet for healing',
      'Plenty of fluids',
      'Fiber to prevent constipation (from pain medication)',
      'Balanced nutrition'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Drains out, wound healing, initial swelling'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Return to most activities, swelling improving'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Breast shape settling, ready for nipple reconstruction'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Final result, scars matured, revisions completed'
      }
    ],
    functionalRecovery: 'Most patients return to full function. Donor sites heal well. Sensation partially recovers in some.',
    cosmeticOutcome: 'Variable - good to excellent in experienced hands. Natural appearance achievable especially with autologous reconstruction. Implants require long-term monitoring.',
    successRate: 'Implant reconstruction: >95% success. DIEP flap: >95% flap survival, <2% complete loss. Satisfaction rates generally high.',
    possibleComplications: [
      'Infection (2-5%)',
      'Hematoma/seroma',
      'Wound healing problems',
      'Capsular contracture (implants, 10-20%)',
      'Implant rupture/malposition',
      'Partial/total flap loss (<5%)',
      'Fat necrosis',
      'Asymmetry requiring revision',
      'Donor site complications (hernia, seroma)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Wound check, drain removal'
      },
      {
        timing: '2-4 weeks',
        purpose: 'Healing assessment, begin expansion if expander'
      },
      {
        timing: '3-6 months',
        purpose: 'Plan nipple reconstruction and revisions'
      },
      {
        timing: 'Annually',
        purpose: 'Long-term monitoring (especially implants)'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy for arm mobility',
      'Scar massage techniques',
      'Core strengthening (abdominal flaps)',
      'Psychological support'
    ],
    lifestyleModifications: [
      'No smoking (critical for healing and long-term)',
      'Maintain healthy weight',
      'Wear supportive bra',
      'Protect scars from sun',
      'Regular breast self-examination',
      'Report any changes in implant/reconstruction'
    ]
  },

  warningSigns: [
    'Increasing pain or swelling',
    'Wound opening or discharge',
    'Fever',
    'Changes in skin color (flap)',
    'Hardening around implant',
    'Donor site problems'
  ],

  emergencySigns: [
    'Flap turning dark/blue (circulation problem) - URGENT',
    'High fever with wound infection',
    'Heavy bleeding',
    'Severe breathing difficulty',
    'Chest pain',
    'Signs of blood clot'
  ],

  complianceRequirements: [
    {
      requirement: 'No smoking - before and after surgery',
      importance: 'critical',
      consequence: 'Smoking greatly increases flap loss and wound complications'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'important',
      consequence: 'Detect complications early, optimize outcome'
    },
    {
      requirement: 'Wear compression garments as directed',
      importance: 'important',
      consequence: 'Reduces swelling and improves contour'
    }
  ],

  whoGuidelines: [
    {
      title: 'Breast Reconstruction Guidelines',
      reference: 'Oncoplastic and Reconstructive Breast Surgery Consensus 2020',
      keyPoints: [
        'All women should be informed of reconstruction options',
        'Immediate reconstruction is safe and does not delay cancer treatment',
        'Choice of technique based on patient factors and preferences',
        'Autologous reconstruction provides long-lasting results',
        'Implant reconstruction requires long-term surveillance',
        'Psychological benefits of reconstruction are well-documented'
      ]
    }
  ]
};

/**
 * Gynecomastia
 */
export const gynecomastia: EducationCondition = {
  id: 'breast-gynecomastia',
  name: 'Gynecomastia',
  category: 'H',
  icdCode: 'N62',
  description: 'Gynecomastia is the enlargement of breast tissue in males. It is common during puberty and in older men, and can cause embarrassment or discomfort. Surgery can remove excess tissue for a flatter chest.',
  alternateNames: ['Male Breast Enlargement', 'Man Boobs', 'Pubertal Gynecomastia'],
  
  overview: {
    definition: 'Gynecomastia is the benign proliferation of male breast glandular tissue, resulting in breast enlargement. It occurs due to an imbalance between estrogen and testosterone activity. Physiological gynecomastia is common during infancy, puberty, and older age. Pathological gynecomastia can result from medications, medical conditions, or hormonal disorders. Pseudogynecomastia refers to fat accumulation without glandular enlargement (seen in obesity). Surgery is considered when gynecomastia causes significant psychological distress or does not resolve.',
    causes: [
      'Physiological (normal hormonal changes at puberty, infancy, older age)',
      'Medications (spironolactone, cimetidine, anti-androgens, steroids)',
      'Recreational drugs (marijuana, heroin, alcohol)',
      'Medical conditions (liver disease, kidney disease, hyperthyroidism)',
      'Hormonal disorders (hypogonadism, tumors)',
      'Obesity (pseudogynecomastia)',
      'Idiopathic (unknown cause)'
    ],
    symptoms: [
      'Enlargement of one or both breasts',
      'Rubbery or firm tissue under nipple',
      'Breast tenderness (sometimes)',
      'Nipple sensitivity',
      'Psychological distress/embarrassment',
      'Asymmetric enlargement possible'
    ],
    riskFactors: [
      'Puberty (50-70% of boys affected)',
      'Older age',
      'Obesity',
      'Use of certain medications',
      'Anabolic steroid use',
      'Liver or kidney disease',
      'Hormone-producing tumors'
    ],
    complications: [
      'Psychological impact (embarrassment, social withdrawal)',
      'Breast cancer (rare, but risk slightly increased)',
      'Persisting after puberty (30% do not resolve)',
      'Skin changes if severe'
    ],
    prevalence: 'Very common. Affects 50-70% of pubertal boys (resolves in most). Present in 30-65% of adult men. Increases with age.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Evaluation',
      duration: '2-4 weeks',
      description: 'Assessment to determine cause and exclude secondary causes.',
      goals: [
        'Confirm gynecomastia vs pseudogynecomastia',
        'Identify underlying causes',
        'Exclude breast cancer',
        'Assess psychological impact'
      ],
      activities: [
        'Clinical examination',
        'Drug and substance history',
        'Blood tests (liver, kidney, thyroid, hormones)',
        'Ultrasound or mammogram if indicated',
        'Review of medications'
      ],
      medications: [
        {
          name: 'Treat underlying cause',
          purpose: 'Stop offending drugs, treat hormonal disorder',
          duration: 'As indicated'
        }
      ],
      warningSignsThisPhase: [
        'Hard, fixed lump (rule out cancer)',
        'Nipple discharge',
        'Rapid unilateral growth',
        'Signs of hormonal tumor'
      ]
    },
    {
      phase: 2,
      name: 'Observation or Medical Treatment',
      duration: '6-12 months',
      description: 'Many cases resolve spontaneously, especially pubertal gynecomastia. Medical treatment may be tried.',
      goals: [
        'Allow spontaneous resolution',
        'Consider medical therapy',
        'Address underlying causes'
      ],
      activities: [
        'Observation (pubertal cases)',
        'Stop offending medications',
        'Weight loss for obesity-related'
      ],
      medications: [
        {
          name: 'Tamoxifen (off-label)',
          purpose: 'May reduce breast tissue if <12 months duration',
          duration: '3-6 months'
        },
        {
          name: 'Raloxifene (off-label)',
          purpose: 'Alternative to tamoxifen',
          duration: '3-6 months'
        }
      ],
      warningSignsThisPhase: [
        'Not resolving',
        'Worsening',
        'Significant distress'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Treatment',
      duration: 'Day surgery',
      description: 'Surgery to remove breast tissue and/or excess fat for persistent gynecomastia.',
      goals: [
        'Remove excess glandular tissue',
        'Remove excess fat',
        'Achieve flat chest contour',
        'Improve self-confidence'
      ],
      activities: [
        'Subcutaneous mastectomy (gland removal)',
        'Liposuction (fat removal)',
        'Combination of both',
        'Skin excision (severe cases)'
      ],
      warningSignsThisPhase: [
        'Hematoma',
        'Wound infection',
        'Contour irregularities'
      ]
    },
    {
      phase: 4,
      name: 'Recovery',
      duration: '4-6 weeks',
      description: 'Healing and return to normal activities.',
      goals: [
        'Wound healing',
        'Achieve final contour',
        'Return to activities',
        'Psychological improvement'
      ],
      activities: [
        'Compression garment wear',
        'Wound care',
        'Gradual return to exercise'
      ],
      warningSignsThisPhase: [
        'Seroma',
        'Asymmetry',
        'Nipple changes'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon or general surgeon',
      'Endocrinologist (if hormonal cause suspected)'
    ],
    investigations: [
      'Blood tests: liver function, kidney function, hormone levels (LH, FSH, testosterone, estradiol, prolactin)',
      'Thyroid function',
      'Breast ultrasound or mammogram (if cancer needs exclusion)',
      'Testicular ultrasound (if hormonal tumor suspected)'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Anabolic steroids/supplements',
        instruction: 'stop completely',
        reason: 'Causative factor, affects results'
      }
    ],
    fastingInstructions: 'No food for 6 hours if general anesthesia. May be done under local.',
    dayBeforeSurgery: [
      'Shower normally',
      'Do not shave chest (surgeon will if needed)',
      'Arrange for someone to drive home'
    ],
    whatToBring: [
      'Loose dark T-shirt',
      'Compression vest (may be provided)',
      'Driver',
      'ID and documents'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Wear comfortable clothing',
      'No jewelry or piercings',
      'Arrive on time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia or local anesthesia with sedation',
    procedureDescription: 'SUBCUTANEOUS MASTECTOMY: An incision is made at the edge of the areola (periareolar). The glandular breast tissue is excised, leaving a small button of tissue under the nipple for natural contour. LIPOSUCTION: Through small incisions, a cannula removes excess fat from around the glandular tissue and from the chest. Often used in combination with mastectomy. COMBINED APPROACH: Most effective for typical gynecomastia - liposuction of fat and direct excision of gland. SKIN EXCISION: For severe gynecomastia with excess skin, additional skin may need to be removed, leaving more visible scars.',
    duration: '1-2 hours',
    whatToExpect: 'Day surgery in most cases. Wake up with compression garment. Drains sometimes used. Moderate discomfort. Home same day.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Normal positioning. Wear compression garment.',
      expectedSymptoms: [
        'Bruising and swelling (significant)',
        'Moderate discomfort',
        'Tightness from compression',
        'Numbness around nipples (temporary)',
        'Asymmetry initially due to swelling'
      ],
      activityLevel: 'Rest for first 24-48 hours. Light activities after.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep dressings dry. Wear compression garment 24/7. Shower after 48 hours with waterproof dressing.'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Sutures may dissolve or be removed. Continue compression. Bruising improving.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Continue compression garment. Swelling gradually reducing. Scar care when healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) for first few days',
      medications: [
        'Paracetamol regularly',
        'Ibuprofen if not contraindicated',
        'Codeine for breakthrough pain',
        'Rarely need stronger medication'
      ],
      nonPharmacological: [
        'Compression garment',
        'Rest',
        'Ice packs over garment'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Compression garment',
        restriction: 'Wear 24/7 except showering',
        duration: '4-6 weeks',
        reason: 'Reduces swelling, improves contour'
      },
      {
        activity: 'Exercise',
        restriction: 'No chest exercises, gym, or heavy lifting',
        duration: '4-6 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: 'Until wounds healed (2-3 weeks)',
        reason: 'Infection risk'
      },
      {
        activity: 'Work',
        restriction: 'Desk job after 3-5 days, physical work after 2-3 weeks',
        duration: 'Variable',
        reason: 'Recovery needs'
      }
    ],
    dietaryGuidelines: [
      'Normal balanced diet',
      'Avoid excess alcohol',
      'Maintain healthy weight',
      'Stop marijuana if using'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Bruising improving, swelling reducing, return to light activities'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Compression garment can be stopped, return to exercise'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Final result visible, swelling resolved, scars fading'
      },
      {
        timeframe: '1 year',
        expectation: 'Mature scars, stable result'
      }
    ],
    functionalRecovery: 'Excellent. Full return to activities. Improved confidence reported by most patients.',
    cosmeticOutcome: 'Good to excellent. Scars hidden around areola. Natural masculine chest contour. May need revision for asymmetry.',
    successRate: 'High satisfaction rates (>90%). Recurrence uncommon if underlying cause addressed.',
    possibleComplications: [
      'Hematoma (blood collection)',
      'Seroma (fluid collection)',
      'Infection',
      'Nipple numbness (usually temporary)',
      'Contour irregularity',
      'Asymmetry',
      'Under-correction (residual tissue)',
      'Over-correction (crater deformity)',
      'Scarring',
      'Recurrence (if cause not addressed)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Wound check, remove dressings'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Assess result, stop compression'
      },
      {
        timing: '3-6 months',
        purpose: 'Final assessment, discuss revision if needed'
      }
    ],
    rehabilitationNeeds: [
      'No formal rehabilitation',
      'Gradual return to chest exercises'
    ],
    lifestyleModifications: [
      'Maintain healthy weight',
      'Avoid anabolic steroids and marijuana',
      'Review medications that may cause gynecomastia',
      'Report any recurrence'
    ]
  },

  warningSigns: [
    'Increasing swelling or pain',
    'Wound bleeding or discharge',
    'Fever',
    'Firmness suggesting hematoma',
    'Nipple color change'
  ],

  emergencySigns: [
    'Severe bleeding',
    'Signs of wound infection with fever',
    'Severe chest pain',
    'Difficulty breathing'
  ],

  complianceRequirements: [
    {
      requirement: 'Wear compression garment as directed',
      importance: 'critical',
      consequence: 'Not wearing increases swelling and affects result'
    },
    {
      requirement: 'Avoid strenuous chest activity',
      importance: 'important',
      consequence: 'May cause bleeding or poor healing'
    },
    {
      requirement: 'Stop causative substances',
      importance: 'important',
      consequence: 'Continued use leads to recurrence'
    }
  ],

  whoGuidelines: [
    {
      title: 'Gynecomastia Management Guidelines',
      reference: 'Endocrine Society Clinical Practice Guideline 2019',
      keyPoints: [
        'Exclude secondary causes before treatment',
        'Pubertal gynecomastia often resolves spontaneously',
        'Medical therapy may be tried in early gynecomastia',
        'Surgery is effective for long-standing gynecomastia',
        'Psychological impact should be considered in treatment decisions'
      ]
    }
  ]
};

// Export breast conditions part 3
export const breastConditionsPart3 = [breastReconstruction, gynecomastia];
