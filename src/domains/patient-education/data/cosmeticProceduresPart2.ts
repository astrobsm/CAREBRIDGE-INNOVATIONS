/**
 * Patient Education Content - Category I: Cosmetic and Elective Reconstructive Procedures
 * Part 2: Facelift and Abdominoplasty
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Facelift (Rhytidectomy)
 */
export const facelift: EducationCondition = {
  id: 'cosmetic-facelift',
  name: 'Facelift (Rhytidectomy)',
  category: 'I',
  icdCode: 'Z41.1',
  description: 'A facelift is a surgical procedure to improve visible signs of aging in the face and neck, including sagging skin, deep folds, jowls, and loose neck skin.',
  alternateNames: ['Rhytidectomy', 'Face Lift', 'Facial Rejuvenation Surgery', 'Lower Face Lift', 'Neck Lift'],
  
  overview: {
    definition: 'A facelift (rhytidectomy) is a surgical procedure that lifts and tightens sagging facial skin and underlying tissues to create a more youthful appearance. It addresses the lower two-thirds of the face and neck, treating jowls, deep nasolabial folds, loose neck skin, and lost facial definition. A facelift does not stop aging but "turns back the clock" by 7-10 years. It is often combined with other procedures like blepharoplasty, brow lift, or fat transfer.',
    causes: [
      'Natural aging process',
      'Loss of skin elasticity',
      'Gravity effects on facial tissues',
      'Loss of facial fat volume',
      'Sun damage',
      'Genetic factors',
      'Significant weight loss'
    ],
    symptoms: [
      'Sagging skin of the mid-face',
      'Deep creases below the lower eyelids',
      'Deep fold lines from nose to mouth (nasolabial folds)',
      'Loss of jawline definition',
      'Jowls (fat and skin hanging below jawline)',
      'Loose skin and excess fat under chin (double chin)',
      'Turkey neck (loose neck skin and bands)'
    ],
    riskFactors: [
      'Smoking (significantly increases complications)',
      'Diabetes',
      'High blood pressure',
      'Blood clotting disorders',
      'Previous facial surgery',
      'History of poor wound healing',
      'Unrealistic expectations'
    ],
    complications: [
      'Hematoma (blood collection)',
      'Nerve injury causing weakness or numbness',
      'Infection',
      'Skin loss',
      'Hair loss at incision lines',
      'Asymmetry',
      'Unsatisfactory scarring',
      'Skin discoloration',
      'Deep vein thrombosis'
    ],
    prevalence: 'Facelift surgery is one of the top cosmetic procedures worldwide, with over 120,000 procedures performed annually in the United States.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Planning',
      duration: '2-4 weeks before surgery',
      description: 'Comprehensive evaluation of facial aging, discussion of goals, medical assessment, and surgical planning.',
      goals: [
        'Assess degree of facial aging',
        'Discuss realistic expectations',
        'Plan surgical approach',
        'Complete medical evaluation',
        'Stop smoking if applicable'
      ],
      activities: [
        'Detailed facial analysis',
        'Photography documentation',
        'Medical history review',
        'Discussion of procedure options',
        'Smoking cessation (minimum 4 weeks before)'
      ],
      warningSignsThisPhase: [
        'Unable to stop smoking',
        'Uncontrolled medical conditions',
        'Unrealistic expectations'
      ]
    },
    {
      phase: 2,
      name: 'Surgery Day',
      duration: '3-6 hours',
      description: 'The facelift procedure is performed under general anesthesia or deep sedation. Skin and deeper tissues are lifted and repositioned.',
      goals: [
        'Safely perform surgery',
        'Lift and tighten facial tissues',
        'Achieve natural-looking result',
        'Minimize complications'
      ],
      activities: [
        'General anesthesia or IV sedation',
        'Incisions around ears and into hairline',
        'Lifting and repositioning of SMAS layer',
        'Removal of excess skin',
        'Meticulous closure',
        'Placement of drains if needed'
      ],
      warningSignsThisPhase: [
        'Excessive bleeding',
        'Anesthesia complications'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Recovery',
      duration: 'Days 1-14',
      description: 'Critical healing period with maximum swelling and bruising. Drain removal if placed. Close monitoring for complications.',
      goals: [
        'Monitor for hematoma',
        'Manage swelling and bruising',
        'Protect surgical result',
        'Prevent infection'
      ],
      activities: [
        'Keep head elevated at all times',
        'Drain removal (if present) at day 1-2',
        'Gentle wound care',
        'Wear compression garment as directed',
        'Take medications as prescribed',
        'Avoid neck movement and turning head rapidly'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control post-operative discomfort',
          duration: '7-10 days'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Anti-nausea medication',
          purpose: 'Prevent vomiting (protects repair)',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Sudden severe swelling on one side (hematoma)',
        'Severe pain not relieved by medication',
        'Fever',
        'Skin color changes (pale, dusky)'
      ]
    },
    {
      phase: 4,
      name: 'Early Healing',
      duration: 'Weeks 2-6',
      description: 'Sutures removed, bruising fades, swelling continues to improve. Gradual return to normal activities.',
      goals: [
        'Complete suture removal',
        'Monitor healing',
        'Gradually increase activities',
        'Address any concerns'
      ],
      activities: [
        'Suture removal at 5-10 days',
        'Gentle face washing',
        'Gradually resume light activities',
        'Continue to sleep elevated',
        'Avoid sun exposure'
      ],
      warningSignsThisPhase: [
        'Wound separation',
        'Persistent numbness or weakness',
        'Signs of infection'
      ]
    },
    {
      phase: 5,
      name: 'Long-Term Healing',
      duration: '6 weeks to 12 months',
      description: 'Final healing and scar maturation. Swelling fully resolves and final result becomes apparent.',
      goals: [
        'Complete resolution of swelling',
        'Scar maturation',
        'Final result assessment',
        'Return to all activities'
      ],
      activities: [
        'Regular follow-up appointments',
        'Sun protection for scars',
        'Resume all normal activities',
        'Enjoy rejuvenated appearance'
      ],
      warningSignsThisPhase: [
        'Persistent asymmetry',
        'Scar problems',
        'Ongoing nerve issues'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon consultation',
      'Medical clearance from primary care physician',
      'Cardiology clearance if heart conditions',
      'Anesthesia evaluation'
    ],
    investigations: [
      'Blood tests: full blood count, metabolic panel, clotting studies',
      'ECG if over 50 or with cardiac history',
      'Photography documentation'
    ],
    medications: [
      {
        medication: 'Aspirin and blood thinners',
        instruction: 'stop',
        reason: 'Significantly increase bleeding risk - stop 2 weeks before'
      },
      {
        medication: 'Herbal supplements (vitamin E, ginkgo, garlic)',
        instruction: 'stop',
        reason: 'May increase bleeding - stop 2 weeks before'
      },
      {
        medication: 'Blood pressure medications',
        instruction: 'continue',
        reason: 'Blood pressure control is essential'
      }
    ],
    fastingInstructions: 'No food or drink after midnight before surgery.',
    dayBeforeSurgery: [
      'Wash hair and face thoroughly',
      'Do not apply any products to face or hair',
      'Prepare recovery area at home',
      'Confirm transportation and care help',
      'Get good rest'
    ],
    whatToBring: [
      'Comfortable button-front clothing',
      'Scarf or high-collared top to hide dressings',
      'Sunglasses',
      'Driver and caregiver',
      'All current medications'
    ],
    dayOfSurgery: [
      'Do not eat or drink',
      'Do not wear makeup or jewelry',
      'Wear comfortable front-opening clothes',
      'Arrive at scheduled time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia or deep IV sedation with local anesthesia',
    procedureDescription: 'Incisions are made in front of and behind the ear, extending into the hairline. The skin is elevated off the underlying muscle layer (SMAS). The SMAS is lifted and tightened to reposition sagging tissues. Excess skin is removed and the remaining skin is redraped without tension. If a neck lift is included, a small incision under the chin allows tightening of neck muscles. Meticulous closure is performed to hide scars within natural creases and hairline.',
    duration: '3-6 hours depending on extent of procedure and combination with other surgeries',
    whatToExpect: 'You will be asleep or deeply sedated. When you wake up, you will have a bandage around your head and face. You may have drains. Your face will feel tight and numb. You will be drowsy from anesthesia.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep head elevated at 30-45 degrees at all times, including when sleeping. Use a recliner or multiple pillows. Do not bend over or lie flat.',
      expectedSymptoms: [
        'Significant swelling of face and neck',
        'Bruising that may extend to chest',
        'Tightness and numbness',
        'Ear numbness',
        'Mild to moderate pain',
        'Difficulty chewing (eat soft foods)',
        'Drains collecting fluid (if present)'
      ],
      activityLevel: 'Rest at home for first 2 weeks. Have someone stay with you for first 24-48 hours. Walk around house to prevent blood clots but avoid exertion.'
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'Keep bandages clean and dry. Do not remove. Empty drains as instructed. Report excessive drainage.'
      },
      {
        day: 'Days 5-10',
        instruction: 'Bandages removed in clinic. Sutures removed in stages. Gently wash hair and face as instructed.'
      },
      {
        day: 'Weeks 2-4',
        instruction: 'Keep incisions clean. Apply antibiotic ointment as directed. Protect from sun.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10). Tightness and discomfort more common than sharp pain.',
      medications: [
        'Prescribed pain medication for first week',
        'Paracetamol (acetaminophen) for mild pain',
        'AVOID aspirin and NSAIDs for 2 weeks'
      ],
      nonPharmacological: [
        'Cold compresses (gently, not on incisions)',
        'Head elevation',
        'Relaxation techniques'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Driving',
        restriction: 'Do not drive',
        duration: '2-3 weeks',
        reason: 'Medications impair judgment; neck stiffness limits head turning'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Raises blood pressure, increases swelling and bleeding risk'
      },
      {
        activity: 'Alcohol',
        restriction: 'Avoid',
        duration: '2 weeks',
        reason: 'Increases bleeding and interacts with medications'
      },
      {
        activity: 'Sun exposure',
        restriction: 'Avoid direct sun on face',
        duration: '3-6 months',
        reason: 'Prolongs swelling and can cause permanent discoloration'
      },
      {
        activity: 'Smoking',
        restriction: 'Absolutely no smoking',
        duration: '4 weeks after surgery',
        reason: 'Critical - smoking can cause skin death and poor healing'
      }
    ],
    dietaryGuidelines: [
      'Soft diet for first 1-2 weeks (chewing may be uncomfortable)',
      'Stay well hydrated',
      'Low salt diet to reduce swelling',
      'High protein for healing',
      'No alcohol for 2 weeks'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2 weeks',
        expectation: 'Sutures removed, major bruising faded, still significant swelling'
      },
      {
        timeframe: '3-4 weeks',
        expectation: 'Most bruising gone, can return to public activities, swelling improving'
      },
      {
        timeframe: '6 weeks',
        expectation: 'About 80% of swelling resolved, return to exercise'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Near-final result, scars maturing'
      },
      {
        timeframe: '6 months',
        expectation: 'Final result apparent, subtle swelling may persist'
      },
      {
        timeframe: '12 months',
        expectation: 'Complete healing, scars well-faded'
      }
    ],
    functionalRecovery: 'Full recovery of facial movement and sensation typically occurs within 3-6 months. Some areas of numbness may persist longer.',
    cosmeticOutcome: 'Face appears more youthful, rested, and rejuvenated. Jowls are eliminated, neck is tightened, and facial contours are restored. Results typically last 7-10 years.',
    successRate: 'Patient satisfaction exceeds 90%. Results are long-lasting and can be refreshed with future procedures.',
    possibleComplications: [
      {
        complication: 'Hematoma',
        riskLevel: 'moderate',
        prevention: 'Blood pressure control, avoid blood thinners, careful technique',
        management: 'Urgent drainage in operating room if large'
      },
      {
        complication: 'Nerve injury',
        riskLevel: 'low',
        prevention: 'Careful surgical technique',
        management: 'Usually temporary; permanent injury rare'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 days',
        purpose: 'Check for hematoma, remove drains if present'
      },
      {
        timing: '1 week',
        purpose: 'Remove some sutures, assess healing'
      },
      {
        timing: '2 weeks',
        purpose: 'Remove remaining sutures, evaluate progress'
      },
      {
        timing: '6 weeks',
        purpose: 'Clear for exercise and most activities'
      },
      {
        timing: '3 months',
        purpose: 'Assess result'
      },
      {
        timing: '6-12 months',
        purpose: 'Final result evaluation'
      }
    ],
    rehabilitationNeeds: [
      'No formal rehabilitation required',
      'Lymphatic massage may help swelling (optional)'
    ],
    lifestyleModifications: [
      'Sun protection is essential',
      'Good skincare routine',
      'No smoking',
      'Maintain stable weight'
    ]
  },

  warningSigns: [
    'Sudden increasing swelling on one side (hematoma)',
    'Severe pain not relieved by medication',
    'Fever above 38°C (100.4°F)',
    'Discharge or foul odor from incisions',
    'Skin turning dark or pale',
    'Difficulty breathing'
  ],

  emergencySigns: [
    'Sudden severe swelling causing eye closure or difficulty breathing',
    'Chest pain or shortness of breath (blood clot)',
    'Signs of severe infection: high fever, spreading redness',
    'Skin turning black (necrosis)',
    'Severe allergic reaction'
  ],

  complianceRequirements: [
    {
      requirement: 'Absolutely no smoking for 4 weeks before and after surgery',
      importance: 'critical',
      consequence: 'Smoking causes skin death and severe complications'
    },
    {
      requirement: 'Keep head elevated for at least 2 weeks',
      importance: 'critical',
      consequence: 'Lying flat increases swelling and hematoma risk'
    },
    {
      requirement: 'Control blood pressure',
      importance: 'critical',
      consequence: 'High blood pressure causes bleeding and hematoma'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of complications is essential'
    }
  ],

  whoGuidelines: [
    {
      title: 'Surgical Safety Standards',
      reference: 'WHO Surgical Safety Checklist',
      keyPoints: [
        'Patient identification and procedure confirmation',
        'Review of allergies and medications',
        'Venous thromboembolism prophylaxis',
        'Appropriate antibiotic prophylaxis'
      ]
    }
  ]
};

/**
 * Abdominoplasty (Tummy Tuck)
 */
export const abdominoplasty: EducationCondition = {
  id: 'cosmetic-abdominoplasty',
  name: 'Abdominoplasty (Tummy Tuck)',
  category: 'I',
  icdCode: 'Z41.1',
  description: 'Abdominoplasty is a surgical procedure to remove excess skin and fat from the abdomen and tighten the abdominal muscles, creating a flatter, more toned abdominal profile.',
  alternateNames: ['Tummy Tuck', 'Abdominal Lipectomy', 'Mini Tummy Tuck', 'Extended Abdominoplasty'],
  
  overview: {
    definition: 'Abdominoplasty is a surgical procedure that removes excess skin and fat from the middle and lower abdomen while tightening the muscles of the abdominal wall. It is particularly beneficial for those with stretched abdominal muscles and loose skin following pregnancy (diastasis recti) or significant weight loss. A full abdominoplasty involves an incision from hip to hip and around the navel. Mini-abdominoplasty addresses only the area below the navel with a shorter incision.',
    causes: [
      'Multiple pregnancies stretching abdominal skin and muscles',
      'Significant weight loss leaving excess skin',
      'Aging and loss of skin elasticity',
      'Previous abdominal surgery with scarring',
      'Genetic tendency to carry weight in abdomen',
      'Diastasis recti (separated abdominal muscles)'
    ],
    symptoms: [
      'Loose, sagging abdominal skin',
      'Stretch marks on lower abdomen',
      'Abdominal bulge despite diet and exercise',
      'Separated abdominal muscles (diastasis recti)',
      'Overhanging skin fold (pannus)',
      'Skin rashes under abdominal fold',
      'Back pain from weak core'
    ],
    riskFactors: [
      'Smoking',
      'Obesity (BMI should be stable before surgery)',
      'Diabetes',
      'Blood clotting disorders',
      'Previous abdominal surgery',
      'Plans for future pregnancy',
      'History of deep vein thrombosis'
    ],
    complications: [
      'Seroma (fluid collection)',
      'Hematoma (blood collection)',
      'Wound healing problems',
      'Infection',
      'Blood clots (DVT/PE)',
      'Numbness that may be permanent',
      'Asymmetry',
      'Unfavorable scarring',
      'Need for revision surgery'
    ],
    prevalence: 'Abdominoplasty is one of the most popular body contouring procedures, with over 130,000 performed annually in the United States.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Preparation',
      duration: '2-6 weeks before surgery',
      description: 'Comprehensive evaluation, weight stabilization, and surgical planning.',
      goals: [
        'Achieve stable weight',
        'Complete medical evaluation',
        'Stop smoking',
        'Plan surgical approach'
      ],
      activities: [
        'Weight stabilization (BMI ideally <30)',
        'Smoking cessation (minimum 4-6 weeks before)',
        'Medical clearance',
        'Photography documentation',
        'Discussion of scar placement and expectations'
      ],
      warningSignsThisPhase: [
        'Unable to stabilize weight',
        'Unable to stop smoking',
        'Uncontrolled medical conditions'
      ]
    },
    {
      phase: 2,
      name: 'Surgery Day',
      duration: '2-5 hours',
      description: 'The abdominoplasty procedure is performed under general anesthesia. Excess skin and fat are removed and muscles tightened.',
      goals: [
        'Safely perform surgery',
        'Remove excess skin and fat',
        'Repair muscle separation',
        'Create natural navel appearance'
      ],
      activities: [
        'General anesthesia',
        'Incision along lower abdomen',
        'Elevation of abdominal skin flap',
        'Muscle plication (tightening)',
        'Removal of excess skin and fat',
        'Creation of new navel opening',
        'Drain placement',
        'Compression garment application'
      ],
      warningSignsThisPhase: [
        'Excessive bleeding',
        'Anesthesia complications'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Recovery',
      duration: 'Days 1-14',
      description: 'Critical healing period requiring careful monitoring. Walking hunched over initially to protect repair. Drains in place.',
      goals: [
        'Prevent blood clots',
        'Monitor drains',
        'Manage pain',
        'Protect muscle repair'
      ],
      activities: [
        'Walk hunched over to reduce tension on repair',
        'Empty drains and record output',
        'Wear compression garment 24/7',
        'Take medications as prescribed',
        'Sleep on back with legs elevated'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control post-operative discomfort',
          duration: '10-14 days'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Blood clot prevention',
          purpose: 'Prevent DVT',
          duration: 'Until mobile'
        },
        {
          name: 'Stool softeners',
          purpose: 'Prevent straining',
          duration: '2-3 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Severe pain not controlled by medication',
        'Fever above 38°C (100.4°F)',
        'Excessive drain output or sudden increase',
        'Leg pain or swelling (possible blood clot)',
        'Shortness of breath',
        'Wound separation'
      ]
    },
    {
      phase: 4,
      name: 'Progressive Recovery',
      duration: 'Weeks 2-6',
      description: 'Drains removed, gradual straightening of posture, increasing activity. Continued compression garment use.',
      goals: [
        'Remove drains',
        'Gradually straighten posture',
        'Return to light activities',
        'Monitor wound healing'
      ],
      activities: [
        'Drain removal when output minimal',
        'Gradual standing more upright',
        'Light walking encouraged',
        'Continue compression garment (6-8 weeks total)',
        'Return to desk work around 2-3 weeks'
      ],
      warningSignsThisPhase: [
        'Fluid collection after drain removal',
        'Wound separation',
        'Signs of infection',
        'Increasing swelling'
      ]
    },
    {
      phase: 5,
      name: 'Full Recovery',
      duration: '6 weeks to 6 months',
      description: 'Return to all activities including exercise. Final results become apparent as swelling resolves.',
      goals: [
        'Return to full activities',
        'Resume exercise',
        'Final scar care',
        'Enjoy results'
      ],
      activities: [
        'Gradual return to exercise at 6-8 weeks',
        'Core strengthening exercises when cleared',
        'Scar massage and silicone treatment',
        'Sun protection for scar'
      ],
      warningSignsThisPhase: [
        'Hernia development',
        'Scar problems',
        'Persistent numbness'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon consultation',
      'Medical clearance from primary care physician',
      'Nutritional assessment if significant weight loss history',
      'Anesthesia evaluation'
    ],
    investigations: [
      'Blood tests: full blood count, metabolic panel, clotting studies',
      'ECG if over 50 or with cardiac history',
      'Chest X-ray if indicated',
      'Photographs for documentation'
    ],
    medications: [
      {
        medication: 'Aspirin and blood thinners',
        instruction: 'stop',
        reason: 'Increase bleeding risk - stop 2 weeks before'
      },
      {
        medication: 'Birth control pills',
        instruction: 'discuss',
        reason: 'May increase blood clot risk - discuss with surgeon'
      },
      {
        medication: 'Diabetes medications',
        instruction: 'discuss',
        reason: 'May need adjustment on surgery day'
      }
    ],
    fastingInstructions: 'No food or drink after midnight before surgery.',
    dayBeforeSurgery: [
      'Shower with antibacterial soap',
      'Do not shave abdominal area yourself',
      'Prepare recovery area at home',
      'Confirm transportation and help at home',
      'Have loose, comfortable clothing ready'
    ],
    whatToBring: [
      'Loose-fitting dress or robe (no pants initially)',
      'Slip-on shoes',
      'Driver and caregiver for first few days',
      'All current medications',
      'Pillows for car ride home'
    ],
    dayOfSurgery: [
      'Do not eat or drink',
      'Shower with antibacterial soap',
      'Do not apply lotions',
      'Wear comfortable loose clothing',
      'Arrive at scheduled time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'A horizontal incision is made low on the abdomen, from hip to hip, just above the pubic area. A second incision is made around the navel. The skin is elevated off the abdominal muscles up to the rib cage. The separated rectus muscles are sutured together in the midline (plication), creating a tighter waistline. Excess skin is pulled down, the excess is removed, and a new opening is created for the navel. Liposuction may be used to contour the flanks. Drains are placed and the incision is closed in layers. A compression garment is applied.',
    duration: '2-5 hours depending on extent',
    whatToExpect: 'You will be asleep for the entire procedure. When you wake up, you will have a compression garment on and drains coming from your incision. You will feel very tight and hunched over. Pain will be managed with medication.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Sleep in a reclined position with hips flexed and pillows under knees. Walk hunched over initially - do not stand straight or stretch the repair.',
      expectedSymptoms: [
        'Significant tightness in abdomen',
        'Moderate to severe pain',
        'Swelling of abdomen and genitalia',
        'Bruising extending to thighs',
        'Numbness of abdominal skin',
        'Drains with bloody fluid output',
        'Difficulty standing straight'
      ],
      activityLevel: 'Walk short distances hunched over starting day 1 to prevent blood clots. Avoid lying flat. No lifting or straining.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep incisions dry. Empty drains 3-4 times daily and record output. Keep compression garment clean.'
      },
      {
        day: 'Week 1-2',
        instruction: 'May shower once drains removed or as directed. Pat incisions dry. Continue compression garment.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Continue compression garment. Scar care with silicone products when incision fully closed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (5-8/10) first week, improving significantly after day 5',
      medications: [
        'Prescribed pain medication (often combination of medications)',
        'Muscle relaxant may help with spasms',
        'AVOID aspirin and NSAIDs for 2 weeks'
      ],
      nonPharmacological: [
        'Positioning with hips flexed',
        'Ice packs with caution',
        'Walking as tolerated',
        'Heating pad on back (not on incision)'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Standing straight',
        restriction: 'Gradually straighten over 1-2 weeks',
        duration: '2 weeks',
        reason: 'Protects repair and incision'
      },
      {
        activity: 'Lifting over 5kg',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Protects muscle repair'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Protects repair and prevents complications'
      },
      {
        activity: 'Abdominal exercises',
        restriction: 'Avoid',
        duration: '8-12 weeks',
        reason: 'Allow muscle repair to heal'
      },
      {
        activity: 'Driving',
        restriction: 'Do not drive',
        duration: '2-3 weeks',
        reason: 'Medications and restricted movement'
      }
    ],
    dietaryGuidelines: [
      'Light, easily digestible diet initially',
      'High fiber to prevent constipation',
      'Adequate protein for healing',
      'Stay well hydrated',
      'Avoid carbonated beverages',
      'No alcohol while on pain medication'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2 weeks',
        expectation: 'Drains out, able to stand more upright, significant swelling'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Return to desk work, much less swelling, able to stand straight'
      },
      {
        timeframe: '8 weeks',
        expectation: 'Return to exercise, swelling continuing to improve'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Near-final result visible, return to all activities'
      },
      {
        timeframe: '6 months',
        expectation: 'Swelling fully resolved, scar maturing'
      },
      {
        timeframe: '12-18 months',
        expectation: 'Final result, scar faded and softened'
      }
    ],
    functionalRecovery: 'Core strength typically improved once healed due to muscle repair. Full return to all activities including strenuous exercise by 8-12 weeks.',
    cosmeticOutcome: 'Flatter, firmer abdomen. Improved waistline. Removal of excess skin and stretch marks below navel. Scar is permanent but hidden in underwear line.',
    successRate: 'Patient satisfaction exceeds 95%. Results are long-lasting with stable weight.',
    possibleComplications: [
      {
        complication: 'Seroma',
        riskLevel: 'moderate',
        prevention: 'Proper drain management, compression garment',
        management: 'Aspiration if symptomatic'
      },
      {
        complication: 'Blood clots (DVT/PE)',
        riskLevel: 'moderate',
        prevention: 'Early walking, compression stockings, possible blood thinners',
        management: 'Anticoagulation therapy'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1 week',
        purpose: 'Wound check, possible drain removal'
      },
      {
        timing: '2 weeks',
        purpose: 'Remove remaining drains, assess healing'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Assess recovery, clearance for more activities'
      },
      {
        timing: '3 months',
        purpose: 'Evaluate result'
      },
      {
        timing: '6-12 months',
        purpose: 'Final result assessment'
      }
    ],
    rehabilitationNeeds: [
      'Gradual core strengthening after 8-12 weeks',
      'Scar massage after 4-6 weeks',
      'Physical therapy if needed'
    ],
    lifestyleModifications: [
      'Maintain stable weight',
      'Regular exercise once cleared',
      'Avoid future pregnancy if possible',
      'Sun protection for scar',
      'Good nutrition'
    ]
  },

  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Increasing pain after day 5',
    'Sudden swelling or firmness',
    'Discharge from incision',
    'Wound separation',
    'Foul odor from wound',
    'Nausea and vomiting that persists'
  ],

  emergencySigns: [
    'Chest pain or difficulty breathing (possible blood clot)',
    'Calf pain, swelling, or tenderness (possible DVT)',
    'Sudden severe abdominal pain',
    'Skin turning dark or black',
    'High fever with wound infection signs',
    'Confusion or severe dizziness'
  ],

  complianceRequirements: [
    {
      requirement: 'No smoking for 4-6 weeks before and after surgery',
      importance: 'critical',
      consequence: 'Smoking causes severe wound complications and tissue death'
    },
    {
      requirement: 'Wear compression garment as directed',
      importance: 'critical',
      consequence: 'Prevents fluid accumulation and supports healing'
    },
    {
      requirement: 'Walk regularly starting day 1',
      importance: 'critical',
      consequence: 'Prevents life-threatening blood clots'
    },
    {
      requirement: 'Avoid lifting and straining for 6 weeks',
      importance: 'critical',
      consequence: 'Protects muscle repair from failure'
    }
  ],

  whoGuidelines: [
    {
      title: 'Venous Thromboembolism Prevention',
      reference: 'WHO Surgical Safety Guidelines',
      keyPoints: [
        'Risk assessment for DVT/PE',
        'Early mobilization essential',
        'Compression stockings recommended',
        'Pharmacological prophylaxis when indicated'
      ]
    }
  ]
};

// Export cosmetic procedures part 2
export const cosmeticProceduresPart2 = [facelift, abdominoplasty];
