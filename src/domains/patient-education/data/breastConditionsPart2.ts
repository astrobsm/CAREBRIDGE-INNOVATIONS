/**
 * Patient Education Content - Category H: Breast Conditions
 * Part 2: Breast Abscess and Mastitis
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Breast Surgery Standards
 */

import type { EducationCondition } from '../types';

/**
 * Breast Abscess
 */
export const breastAbscess: EducationCondition = {
  id: 'breast-abscess',
  name: 'Breast Abscess',
  category: 'H',
  icdCode: 'N61',
  description: 'A breast abscess is a collection of pus within the breast tissue, usually resulting from untreated mastitis or bacterial infection. It appears as a painful, swollen lump and requires drainage for treatment.',
  alternateNames: ['Mammary Abscess', 'Breast Infection with Abscess', 'Lactational Abscess', 'Non-Lactational Abscess'],
  
  overview: {
    definition: 'A breast abscess is a localized collection of pus (infected fluid) that develops in the breast tissue. It most commonly occurs in breastfeeding women (lactational abscess) when mastitis is not adequately treated. Non-lactational abscesses can occur in non-breastfeeding women, often related to smoking, nipple piercing, or underlying conditions like diabetes. The abscess appears as a painful, red, swollen area that may have a fluctuant (fluid-filled) feel. Treatment typically involves drainage and antibiotics.',
    causes: [
      'Untreated or poorly treated mastitis',
      'Blocked milk ducts (lactational)',
      'Bacterial infection (commonly Staphylococcus aureus)',
      'Smoking (non-lactational)',
      'Nipple piercing',
      'Diabetes',
      'Periareolar abscess (squamous metaplasia of ducts)'
    ],
    symptoms: [
      'Painful, swollen breast lump',
      'Redness and warmth over the area',
      'Fluctuant (soft, fluid-filled) mass',
      'Fever and chills',
      'Malaise (feeling unwell)',
      'Nipple discharge (may be purulent)',
      'Skin thinning or pointing of abscess'
    ],
    riskFactors: [
      'Breastfeeding (especially first-time mothers)',
      'History of mastitis',
      'Cracked or damaged nipples',
      'Smoking',
      'Nipple piercing',
      'Diabetes',
      'Obesity',
      'Previous breast abscess'
    ],
    complications: [
      'Recurrent abscess',
      'Chronic fistula (tract to skin)',
      'Sepsis (if untreated)',
      'Milk fistula (lactating women)',
      'Scarring',
      'Difficulty breastfeeding'
    ],
    prevalence: 'Breast abscesses affect 0.4-11% of breastfeeding women with mastitis who do not receive adequate treatment. Non-lactational abscesses more common in smokers.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis',
      duration: 'Same day',
      description: 'Clinical assessment and confirmation of abscess, usually with ultrasound.',
      goals: [
        'Confirm abscess diagnosis',
        'Assess size and location',
        'Exclude inflammatory breast cancer (rare mimic)',
        'Plan drainage approach'
      ],
      activities: [
        'Clinical examination',
        'Breast ultrasound (confirms fluid collection)',
        'Blood tests (FBC, inflammatory markers)',
        'Pus culture (when drained)'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Start immediately (flucloxacillin or co-amoxiclav)',
          duration: '7-14 days'
        }
      ],
      warningSignsThisPhase: [
        'Signs of sepsis',
        'Very large abscess',
        'Failed aspiration'
      ]
    },
    {
      phase: 2,
      name: 'Drainage',
      duration: 'Same day or next day',
      description: 'Drainage of the abscess, either by needle aspiration or surgical incision.',
      goals: [
        'Drain the pus collection',
        'Send pus for culture',
        'Relieve pain',
        'Initiate healing'
      ],
      activities: [
        'Ultrasound-guided needle aspiration (first choice for <3-5cm)',
        'May need repeated aspirations',
        'Surgical incision and drainage (larger abscesses)',
        'Local or general anesthesia'
      ],
      warningSignsThisPhase: [
        'Failed aspiration',
        'Rapid re-accumulation',
        'Worsening infection'
      ]
    },
    {
      phase: 3,
      name: 'Recovery and Healing',
      duration: '2-4 weeks',
      description: 'Antibiotic treatment, wound care, and monitoring for healing.',
      goals: [
        'Complete infection clearance',
        'Wound healing',
        'Continue breastfeeding if desired',
        'Prevent recurrence'
      ],
      activities: [
        'Complete antibiotic course',
        'Wound care (if surgical drainage)',
        'Continue breastfeeding/expressing from affected breast',
        'Follow-up ultrasound if needed'
      ],
      medications: [
        {
          name: 'Oral antibiotics',
          purpose: 'Clear infection',
          duration: '7-14 days'
        },
        {
          name: 'Analgesia',
          purpose: 'Pain control',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Recurrence',
        'Wound not healing',
        'New fever',
        'Persistent lump'
      ]
    },
    {
      phase: 4,
      name: 'Follow-Up',
      duration: '2-6 weeks',
      description: 'Ensure complete resolution and address any underlying causes.',
      goals: [
        'Confirm complete resolution',
        'Address recurrence risk factors',
        'Exclude underlying pathology'
      ],
      activities: [
        'Clinical review',
        'Ultrasound if persistent lump',
        'Core biopsy if atypical features',
        'Smoking cessation advice'
      ],
      warningSignsThisPhase: [
        'Persistent mass (exclude cancer)',
        'Recurrent abscess',
        'Chronic fistula'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Breast surgeon or general surgeon',
      'Lactation consultant (if breastfeeding)'
    ],
    investigations: [
      'Breast ultrasound',
      'Blood tests: FBC, CRP',
      'Pus culture and sensitivity'
    ],
    medications: [
      {
        medication: 'Antibiotics',
        instruction: 'start immediately',
        reason: 'Control infection before and after drainage'
      }
    ],
    fastingInstructions: 'If surgical drainage under general anesthesia: fast for 6 hours. For needle aspiration under local: no fasting required.',
    dayBeforeSurgery: [
      'Take antibiotics as prescribed',
      'Continue breastfeeding/expressing if applicable',
      'Wear comfortable supportive bra'
    ],
    whatToBring: [
      'Supportive bra',
      'Breast pads if lactating',
      'Loose comfortable top',
      'Driver if sedation planned'
    ],
    dayOfSurgery: [
      'Follow fasting instructions if applicable',
      'Take antibiotics',
      'Express milk before procedure if breastfeeding'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia (aspiration) or general anesthesia (surgical drainage)',
    procedureDescription: 'ULTRASOUND-GUIDED ASPIRATION: This is first-line treatment for most abscesses <5cm. Under ultrasound guidance, a needle is inserted into the abscess cavity. Pus is aspirated (sucked out) and sent for culture. May need to be repeated every 2-3 days until resolved. SURGICAL INCISION AND DRAINAGE: For larger abscesses, failed aspirations, or pointing abscesses. An incision is made over the abscess (ideally along Langer\'s lines for cosmesis). Pus is drained and cavity irrigated. Wound may be packed and left to heal by secondary intention, or closed with a drain. General anesthesia usually required.',
    duration: 'Aspiration: 15-30 minutes. Surgical drainage: 30-60 minutes.',
    whatToExpect: 'Aspiration can be done in clinic. Surgical drainage is a theater procedure. Significant pain relief after pus is drained.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Wear supportive bra. Keep wound clean.',
      expectedSymptoms: [
        'Immediate pain relief (usually)',
        'Some oozing from wound',
        'Bruising',
        'Residual lump (may take weeks to resolve)'
      ],
      activityLevel: 'Normal activities can resume quickly. Rest as needed.'
    },
    woundCare: [
      {
        day: 'Days 1-7 (if packed wound)',
        instruction: 'Daily or alternate-day packing changes by nurse. Keep wound clean.'
      },
      {
        day: 'If closed wound',
        instruction: 'Keep dressing dry. Watch for signs of recollection.'
      },
      {
        day: 'Weeks 2-4',
        instruction: 'Wound healing by secondary intention. Scar will form.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate initially, improving rapidly after drainage (4-6/10 reducing)',
      medications: [
        'Paracetamol regularly',
        'Ibuprofen if not contraindicated',
        'Stronger pain relief rarely needed after drainage'
      ],
      nonPharmacological: [
        'Supportive bra',
        'Warm compresses',
        'Rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Breastfeeding',
        restriction: 'Can and should continue on both breasts',
        duration: 'Ongoing',
        reason: 'Helps clear infection, safe for baby'
      },
      {
        activity: 'Normal activities',
        restriction: 'Resume as tolerated',
        duration: 'Within days',
        reason: 'Minor procedure'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid until wound healed',
        duration: '2-4 weeks',
        reason: 'Infection risk'
      }
    ],
    dietaryGuidelines: [
      'Normal diet',
      'Stay well hydrated (important if breastfeeding)',
      'Adequate nutrition supports healing'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Pain relief, fever resolving'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Infection clearing, wound healing'
      }
    ],
    longTerm: [
      {
        timeframe: '4-6 weeks',
        expectation: 'Complete resolution'
      },
      {
        timeframe: 'Ongoing',
        expectation: 'Monitor for recurrence'
      }
    ],
    functionalRecovery: 'Excellent. Breastfeeding can continue successfully in most cases.',
    cosmeticOutcome: 'Good. Small scar from aspiration. Larger scar if surgical drainage needed. May have minor skin indentation.',
    successRate: 'Ultrasound-guided aspiration successful in 80-90% (may need multiple aspirations). Surgical drainage rarely needed with modern approach.',
    possibleComplications: [
      'Recurrence (10-20%)',
      'Chronic fistula (especially smokers)',
      'Milk fistula (breastfeeding)',
      'Scarring',
      'Breastfeeding difficulties',
      'Missed cancer (rare, if not biopsied when indicated)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2-3 days after aspiration',
        purpose: 'Assess for re-accumulation, may need repeat aspiration'
      },
      {
        timing: '2 weeks',
        purpose: 'Confirm healing, culture results'
      },
      {
        timing: '6 weeks',
        purpose: 'Ensure complete resolution, consider imaging if persistent lump'
      }
    ],
    rehabilitationNeeds: [
      'Lactation support if breastfeeding',
      'Wound care if surgical drainage'
    ],
    lifestyleModifications: [
      'Stop smoking (reduces recurrence)',
      'Proper breastfeeding technique',
      'Empty breasts regularly',
      'Treat cracked nipples promptly',
      'Maintain good hygiene'
    ]
  },

  warningSigns: [
    'Recurrence of lump or pain',
    'Fever returning',
    'Wound not healing',
    'Increasing redness',
    'Persistent lump after 6 weeks'
  ],

  emergencySigns: [
    'High fever with rigors (sepsis)',
    'Rapidly spreading redness',
    'Confusion or severe illness',
    'Unable to care for baby'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete antibiotic course',
      importance: 'critical',
      consequence: 'Incomplete treatment leads to recurrence'
    },
    {
      requirement: 'Attend for repeat aspiration if needed',
      importance: 'critical',
      consequence: 'May need multiple drainages for resolution'
    },
    {
      requirement: 'Continue breastfeeding if lactating',
      importance: 'important',
      consequence: 'Stopping can worsen the problem'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Mastitis and Breast Abscess Guidelines',
      reference: 'World Health Organization 2000',
      keyPoints: [
        'Ultrasound-guided aspiration is first-line treatment',
        'Breastfeeding should continue from both breasts',
        'Antibiotics are essential alongside drainage',
        'Smoking cessation reduces recurrence',
        'Non-resolving cases need biopsy to exclude malignancy'
      ]
    }
  ]
};

/**
 * Mastitis
 */
export const mastitis: EducationCondition = {
  id: 'breast-mastitis',
  name: 'Mastitis',
  category: 'H',
  icdCode: 'N61',
  description: 'Mastitis is inflammation of the breast tissue, often due to infection, most commonly occurring in breastfeeding women. It causes breast pain, swelling, warmth, and flu-like symptoms.',
  alternateNames: ['Lactational Mastitis', 'Puerperal Mastitis', 'Breast Infection', 'Non-Lactational Mastitis'],
  
  overview: {
    definition: 'Mastitis is inflammation of breast tissue that may or may not involve infection. Lactational mastitis occurs in breastfeeding women, usually when milk stasis (milk not draining properly) allows bacteria to multiply. It causes a painful, red, swollen area in the breast with flu-like symptoms. Non-lactational mastitis can occur in non-breastfeeding women. Early treatment with continued breastfeeding and antibiotics usually resolves the condition, but untreated mastitis can progress to a breast abscess.',
    causes: [
      'Milk stasis (blocked milk flow)',
      'Cracked or damaged nipples (entry point for bacteria)',
      'Bacterial infection (commonly Staphylococcus aureus)',
      'Infrequent or incomplete breastfeeding',
      'Tight bras or clothing',
      'Fatigue and stress',
      'Previous mastitis'
    ],
    symptoms: [
      'Painful, tender breast',
      'Red, wedge-shaped area on breast',
      'Warmth and swelling',
      'Fever (>38.5°C)',
      'Chills and body aches',
      'Fatigue and malaise',
      'Flu-like symptoms',
      'Hard lump in breast (engorgement)'
    ],
    riskFactors: [
      'Breastfeeding (especially first-time mothers)',
      'Poor latch or positioning',
      'Cracked nipples',
      'Previous mastitis',
      'Engorgement',
      'Wearing tight bra',
      'Stress and fatigue',
      'Sudden weaning'
    ],
    complications: [
      'Breast abscess (5-10% of untreated cases)',
      'Chronic/recurrent mastitis',
      'Early weaning',
      'Reduced milk supply',
      'Sepsis (rare, if untreated)'
    ],
    prevalence: 'Affects 2-10% of breastfeeding women, most commonly in the first 6 weeks postpartum. Can occur at any stage of breastfeeding.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate Treatment',
      duration: '24-48 hours',
      description: 'Initiate effective treatment to resolve infection and maintain breastfeeding.',
      goals: [
        'Relieve symptoms',
        'Clear infection',
        'Maintain breastfeeding',
        'Prevent abscess formation'
      ],
      activities: [
        'Continue breastfeeding frequently (start on affected side)',
        'Empty breast completely',
        'Apply warm compresses before feeding',
        'Rest and fluids',
        'Analgesia'
      ],
      medications: [
        {
          name: 'Antibiotics (flucloxacillin, cephalexin, or clindamycin)',
          purpose: 'Treat bacterial infection',
          duration: '10-14 days'
        },
        {
          name: 'Paracetamol/Ibuprofen',
          purpose: 'Reduce pain and fever',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Worsening despite treatment',
        'Fluctuant lump developing (abscess)',
        'High fever not improving',
        'Unable to breastfeed'
      ]
    },
    {
      phase: 2,
      name: 'Continued Treatment',
      duration: '7-14 days',
      description: 'Complete antibiotic course and monitor for resolution.',
      goals: [
        'Complete resolution',
        'Prevent recurrence',
        'Maintain milk supply',
        'Support breastfeeding'
      ],
      activities: [
        'Complete antibiotic course',
        'Frequent breastfeeding or expressing',
        'Breast massage',
        'Address underlying causes'
      ],
      warningSignsThisPhase: [
        'Symptoms not improving by 48 hours',
        'Lump becoming fluctuant',
        'Recurrence'
      ]
    },
    {
      phase: 3,
      name: 'Recovery and Prevention',
      duration: 'Ongoing',
      description: 'Prevent recurrence through good breastfeeding practices.',
      goals: [
        'Prevent recurrence',
        'Optimize breastfeeding technique',
        'Maintain good breast health'
      ],
      activities: [
        'Lactation consultant review',
        'Optimize latch and positioning',
        'Avoid engorgement',
        'Rest and self-care'
      ],
      warningSignsThisPhase: [
        'Recurrent episodes',
        'Chronic nipple damage',
        'Persistent breast lump'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'GP or midwife (first-line)',
      'Lactation consultant',
      'Breast surgeon (if abscess develops)'
    ],
    investigations: [
      'Usually clinical diagnosis',
      'Breast ultrasound if abscess suspected',
      'Milk culture if recurrent or not responding',
      'Blood tests if sepsis suspected'
    ],
    medications: [
      {
        medication: 'Antibiotics',
        instruction: 'start promptly - safe during breastfeeding',
        reason: 'Most antibiotics for mastitis are compatible with breastfeeding'
      }
    ],
    fastingInstructions: 'No fasting required - mastitis is typically managed medically. Fasting only if abscess drainage needed.',
    dayBeforeSurgery: [
      'Not applicable for most mastitis',
      'Continue breastfeeding',
      'Take antibiotics as prescribed'
    ],
    whatToBring: [
      'Supportive nursing bra',
      'Breast pads',
      'Breast pump if using'
    ],
    dayOfSurgery: [
      'Not typically surgical',
      'If attending clinic: feed or express before appointment'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Not applicable - medical management. If abscess develops, see Breast Abscess.',
    procedureDescription: 'Mastitis is managed medically, not surgically. MEDICAL MANAGEMENT: 1) Antibiotics: First-line treatment with flucloxacillin 500mg four times daily, or cephalexin if penicillin allergic. 2) Continue breastfeeding: Feed frequently starting on affected side. Empty breast completely. 3) Supportive care: Rest, fluids, analgesics, warm compresses. 4) If abscess develops: See breast abscess management (aspiration or drainage). The key to preventing progression to abscess is early and complete treatment.',
    duration: 'Not applicable',
    whatToExpect: 'Symptoms should begin improving within 24-48 hours of starting antibiotics. Fever usually resolves first, followed by local symptoms. Complete course of antibiotics even if feeling better.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Rest with breast well supported.',
      expectedSymptoms: [
        'Symptoms should improve within 24-48 hours',
        'Fever resolves first',
        'Local symptoms may take longer',
        'Bruising if abscess was drained'
      ],
      activityLevel: 'Rest is important. Light activities as tolerated.'
    },
    woundCare: [
      {
        day: 'N/A - medical treatment',
        instruction: 'No wound unless abscess drained. Keep nipples clean and treat any cracks.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe initially (5-7/10), improving with treatment',
      medications: [
        'Paracetamol 1g every 4-6 hours',
        'Ibuprofen 400mg every 8 hours (anti-inflammatory)',
        'Both are safe during breastfeeding'
      ],
      nonPharmacological: [
        'Warm compresses before feeding',
        'Cold compresses after feeding',
        'Rest',
        'Supportive bra',
        'Gentle massage during feeding'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Breastfeeding',
        restriction: 'Continue - this is essential treatment',
        duration: 'Ongoing',
        reason: 'Draining the breast helps clear infection'
      },
      {
        activity: 'Rest',
        restriction: 'Rest as much as possible',
        duration: 'Until symptoms resolve',
        reason: 'Supports healing'
      },
      {
        activity: 'Work',
        restriction: 'Stay home if unwell',
        duration: 'Until fever resolved',
        reason: 'Rest needed, may be contagious'
      }
    ],
    dietaryGuidelines: [
      'Drink plenty of fluids',
      'Balanced diet',
      'Do not restrict fluids thinking it will help'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Fever resolving, beginning to feel better'
      },
      {
        timeframe: '7-10 days',
        expectation: 'Complete resolution with full antibiotic course'
      }
    ],
    longTerm: [
      {
        timeframe: 'Ongoing',
        expectation: 'Most women continue breastfeeding successfully'
      }
    ],
    functionalRecovery: 'Excellent. Breastfeeding can continue successfully.',
    cosmeticOutcome: 'No cosmetic changes from mastitis. May have scar if abscess required drainage.',
    successRate: '90-95% resolve with antibiotics and continued breastfeeding. 5-10% may progress to abscess if treatment delayed.',
    possibleComplications: [
      'Breast abscess (5-10%)',
      'Recurrent mastitis',
      'Chronic mastitis',
      'Early weaning',
      'Reduced milk supply'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '48 hours',
        purpose: 'Phone or in-person review if not improving'
      },
      {
        timing: '1-2 weeks',
        purpose: 'Confirm resolution, lactation support'
      }
    ],
    rehabilitationNeeds: [
      'Lactation consultant support',
      'Breastfeeding technique review'
    ],
    lifestyleModifications: [
      'Feed frequently and on demand',
      'Ensure complete breast drainage',
      'Good latch and positioning',
      'Avoid tight bras',
      'Address cracked nipples promptly',
      'Rest and reduce stress',
      'Gradual weaning when ready (not sudden)'
    ]
  },

  warningSigns: [
    'Symptoms not improving after 48 hours of antibiotics',
    'Developing fluctuant lump',
    'Worsening pain',
    'Fever persisting or returning',
    'Recurrent episodes'
  ],

  emergencySigns: [
    'Very high fever (>39°C)',
    'Rigors (shaking chills)',
    'Signs of sepsis (fast heart rate, confusion)',
    'Unable to care for baby',
    'Rapidly spreading redness'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete the full antibiotic course',
      importance: 'critical',
      consequence: 'Stopping early leads to recurrence and abscess'
    },
    {
      requirement: 'Continue breastfeeding/expressing',
      importance: 'critical',
      consequence: 'Stopping worsens the condition'
    },
    {
      requirement: 'Seek review if not improving in 48 hours',
      importance: 'important',
      consequence: 'May need different antibiotics or abscess drainage'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Mastitis: Causes and Management',
      reference: 'World Health Organization 2000',
      keyPoints: [
        'Effective milk removal is the key to treatment',
        'Breastfeeding should continue from the affected breast',
        'Antibiotics are indicated if symptoms are severe or not improving after 12-24 hours',
        'Most common organisms are Staphylococcus aureus',
        'Abscess formation is preventable with early treatment'
      ]
    }
  ]
};

// Export breast conditions part 2
export const breastConditionsPart2 = [breastAbscess, mastitis];
