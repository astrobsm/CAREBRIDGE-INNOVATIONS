/**
 * Patient Education Content - Category I: Cosmetic and Elective Reconstructive Procedures
 * Part 1: Rhinoplasty and Blepharoplasty
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Plastic Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Rhinoplasty (Nose Reshaping Surgery)
 */
export const rhinoplasty: EducationCondition = {
  id: 'cosmetic-rhinoplasty',
  name: 'Rhinoplasty (Nose Reshaping Surgery)',
  category: 'I',
  icdCode: 'Z41.1',
  description: 'Rhinoplasty is a surgical procedure to change the shape or improve the function of the nose. It can be performed for cosmetic reasons, to correct breathing problems, or to repair the nose after injury.',
  alternateNames: ['Nose Job', 'Nose Reshaping', 'Nasal Surgery', 'Septorhinoplasty'],
  
  overview: {
    definition: 'Rhinoplasty is a surgical procedure that modifies the shape, size, or proportions of the nose. It involves reshaping the bone, cartilage, and skin of the nose to achieve the desired appearance or improve breathing function. The procedure can address a variety of concerns including a hump on the bridge, a wide or crooked nose, a bulbous tip, or breathing difficulties due to structural problems.',
    causes: [
      'Desire to improve facial harmony and proportion',
      'Congenital nasal deformity',
      'Nasal trauma or injury',
      'Breathing difficulties due to deviated septum',
      'Previous unsuccessful rhinoplasty requiring revision',
      'Ethnic rhinoplasty for proportional enhancement',
      'Cleft lip nasal deformity correction'
    ],
    symptoms: [
      'Dissatisfaction with nasal appearance',
      'Nasal obstruction or difficulty breathing',
      'Crooked or asymmetric nose',
      'Prominent nasal hump',
      'Wide or bulbous nasal tip',
      'Drooping nasal tip',
      'Nostrils that are too wide or too narrow'
    ],
    riskFactors: [
      'Unrealistic expectations',
      'Active smoking',
      'Blood clotting disorders',
      'Previous nasal surgery',
      'Chronic nasal conditions',
      'Connective tissue disorders',
      'Body dysmorphic disorder'
    ],
    complications: [
      'Bleeding (epistaxis)',
      'Infection',
      'Adverse reaction to anesthesia',
      'Difficulty breathing through the nose',
      'Numbness or pain',
      'Asymmetry',
      'Unsatisfactory cosmetic result',
      'Need for revision surgery',
      'Septal perforation',
      'Scarring'
    ],
    prevalence: 'Rhinoplasty is one of the most commonly performed cosmetic procedures worldwide, with over 200,000 procedures performed annually in the United States alone.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Planning',
      duration: '2-4 weeks before surgery',
      description: 'Comprehensive evaluation including detailed discussion of goals, computer imaging, and medical assessment to ensure candidacy and plan the surgical approach.',
      goals: [
        'Establish realistic expectations',
        'Determine surgical approach',
        'Complete medical evaluation',
        'Create surgical plan'
      ],
      activities: [
        'Detailed consultation with surgeon',
        'Photograph documentation',
        'Computer imaging of expected results',
        'Medical history review',
        'Physical examination of nose structure'
      ],
      warningSignsThisPhase: [
        'Unrealistic expectations identified',
        'Medical conditions preventing surgery',
        'Active infection or illness'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Preparation',
      duration: '2 weeks before surgery',
      description: 'Final preparations including stopping certain medications, arranging recovery support, and preparing for the post-operative period.',
      goals: [
        'Optimize health for surgery',
        'Stop medications that increase bleeding',
        'Arrange post-operative care',
        'Prepare recovery area at home'
      ],
      activities: [
        'Stop smoking at least 4 weeks before',
        'Stop aspirin and blood thinners as directed',
        'Arrange for someone to drive home',
        'Prepare ice packs and recovery supplies',
        'Fill prescriptions in advance'
      ],
      warningSignsThisPhase: [
        'Development of cold or respiratory infection',
        'Unable to stop smoking',
        'New medical concerns'
      ]
    },
    {
      phase: 3,
      name: 'Surgery Day',
      duration: '2-4 hours',
      description: 'The rhinoplasty procedure is performed under general or local anesthesia with sedation. The nose is reshaped through internal or external incisions.',
      goals: [
        'Safely perform surgery',
        'Achieve planned nasal reshaping',
        'Minimize trauma to tissues',
        'Ensure patient comfort'
      ],
      activities: [
        'Administration of anesthesia',
        'Surgical incisions (internal or external)',
        'Reshaping of bone and cartilage',
        'Closure of incisions',
        'Application of splint and dressings'
      ],
      warningSignsThisPhase: [
        'Excessive bleeding during surgery',
        'Anesthesia complications'
      ]
    },
    {
      phase: 4,
      name: 'Immediate Recovery',
      duration: 'Days 1-7',
      description: 'Initial healing period with swelling and bruising at their peak. Nasal splint remains in place. Rest and limited activity are essential.',
      goals: [
        'Control swelling and bruising',
        'Prevent complications',
        'Manage pain appropriately',
        'Protect surgical result'
      ],
      activities: [
        'Keep head elevated at all times',
        'Apply cold compresses around eyes (not on nose)',
        'Take prescribed medications',
        'Avoid blowing nose',
        'Sleep on back with head elevated'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control post-operative discomfort',
          duration: '5-7 days'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Saline spray',
          purpose: 'Keep nasal passages moist',
          duration: 'Several weeks'
        }
      ],
      warningSignsThisPhase: [
        'Severe uncontrolled bleeding',
        'High fever',
        'Increasing pain despite medication',
        'Signs of infection'
      ]
    },
    {
      phase: 5,
      name: 'Early Recovery',
      duration: 'Weeks 1-4',
      description: 'Splint is removed after 1 week. Major swelling subsides but residual swelling persists. Gradual return to light activities.',
      goals: [
        'Remove splint and sutures',
        'Monitor healing progress',
        'Gradually resume activities',
        'Manage expectations about swelling'
      ],
      activities: [
        'Attend follow-up for splint removal',
        'Gentle nasal cleaning as instructed',
        'Avoid strenuous activities',
        'Protect nose from trauma',
        'Use sunscreen if going outdoors'
      ],
      warningSignsThisPhase: [
        'Persistent severe swelling',
        'Signs of infection',
        'Breathing difficulties',
        'Wound separation'
      ]
    },
    {
      phase: 6,
      name: 'Long-Term Healing',
      duration: '1-12 months',
      description: 'Gradual resolution of swelling and refinement of final result. The tip takes longest to settle. Final result visible at 12-18 months.',
      goals: [
        'Complete resolution of swelling',
        'Achieve final cosmetic result',
        'Return to all normal activities',
        'Address any concerns'
      ],
      activities: [
        'Regular follow-up appointments',
        'Protect nose from sun and trauma',
        'Be patient with swelling resolution',
        'Discuss any concerns with surgeon'
      ],
      warningSignsThisPhase: [
        'Persistent asymmetry after swelling resolves',
        'Breathing difficulties',
        'Dissatisfaction with result'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon or facial plastic surgeon consultation',
      'Medical clearance from primary care physician if needed',
      'Anesthesia evaluation if general anesthesia planned'
    ],
    investigations: [
      'Blood tests: full blood count, clotting studies',
      'CT scan of sinuses if functional surgery included',
      'Photographs for surgical planning'
    ],
    medications: [
      {
        medication: 'Aspirin and NSAIDs',
        instruction: 'stop',
        reason: 'Increase bleeding risk - stop 2 weeks before'
      },
      {
        medication: 'Blood thinners',
        instruction: 'stop',
        reason: 'Increase bleeding risk - stop as directed by prescribing doctor'
      },
      {
        medication: 'Vitamin E and fish oil supplements',
        instruction: 'stop',
        reason: 'May increase bleeding - stop 2 weeks before'
      },
      {
        medication: 'Regular prescription medications',
        instruction: 'discuss',
        reason: 'Most can continue - discuss with surgeon'
      }
    ],
    fastingInstructions: 'No food or drink for 8 hours before surgery if general anesthesia is planned.',
    dayBeforeSurgery: [
      'Shower and wash face thoroughly',
      'Do not apply makeup or skincare products',
      'Prepare recovery area at home',
      'Confirm transportation arrangements',
      'Get a good night\'s rest'
    ],
    whatToBring: [
      'Comfortable loose clothing that buttons in front',
      'Dark glasses to hide bruising',
      'Photo ID and insurance cards',
      'List of current medications',
      'Driver to take you home'
    ],
    dayOfSurgery: [
      'Arrive at scheduled time',
      'Wear comfortable front-opening clothing',
      'Do not wear makeup, jewelry, or contact lenses',
      'Take approved medications with small sip of water only'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia (most common) or local anesthesia with sedation',
    procedureDescription: 'Rhinoplasty is performed through either an open approach (small incision across the columella) or closed approach (incisions inside the nose only). The surgeon elevates the skin to access the underlying bone and cartilage, which are then reshaped. Bone may be broken and reset (osteotomies) to narrow the nose. Cartilage may be trimmed, reshaped, or augmented with grafts. The skin is then redraped and incisions closed. A splint is placed on the outside of the nose.',
    duration: '2-4 hours depending on complexity',
    whatToExpect: 'You will be asleep for the procedure. When you wake up, you will have a splint on your nose and packing may be in your nostrils. Your face will feel congested and you will breathe through your mouth initially.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep head elevated above heart level at all times, including when sleeping. Use 2-3 pillows or sleep in a recliner.',
      expectedSymptoms: [
        'Congestion and inability to breathe through nose',
        'Swelling around eyes and cheeks',
        'Bruising under eyes (may extend to cheeks)',
        'Mild to moderate pain or discomfort',
        'Headache',
        'Bloody drainage from nose',
        'Numbness of nose and upper lip'
      ],
      activityLevel: 'Rest at home for first week. Avoid bending over, straining, or any activity that raises blood pressure.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Do not touch the splint. Clean around nostrils gently with saline-moistened cotton buds. Change drip pad under nose as needed.'
      },
      {
        day: 'Day 7-10',
        instruction: 'Splint and sutures removed at clinic. Gently clean nose as instructed. Avoid rubbing or touching nose.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Gentle nasal hygiene. Saline rinses as directed. Protect nose from any trauma.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10). Pain is usually less than expected; discomfort from congestion is often worse.',
      medications: [
        'Prescribed pain medication for first 3-5 days',
        'Paracetamol (acetaminophen) for mild pain',
        'AVOID aspirin, ibuprofen, and other NSAIDs for 2 weeks'
      ],
      nonPharmacological: [
        'Cold compresses around eyes (not on nose) for 48 hours',
        'Head elevation',
        'Rest and relaxation',
        'Saline spray for comfort'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Blowing nose',
        restriction: 'Do not blow nose',
        duration: '3-4 weeks',
        reason: 'Can disrupt healing and cause bleeding'
      },
      {
        activity: 'Wearing glasses',
        restriction: 'Do not rest glasses on nose',
        duration: '6-8 weeks',
        reason: 'Pressure can cause indentation in healing bone'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Raises blood pressure and increases swelling and bleeding risk'
      },
      {
        activity: 'Contact sports',
        restriction: 'Avoid',
        duration: '3-6 months',
        reason: 'Risk of nasal trauma'
      },
      {
        activity: 'Sun exposure',
        restriction: 'Avoid prolonged sun exposure',
        duration: '6-12 months',
        reason: 'Increases swelling and can cause permanent discoloration'
      }
    ],
    dietaryGuidelines: [
      'Eat soft foods initially if chewing is uncomfortable',
      'Stay well hydrated',
      'Avoid very hot foods and drinks for first week',
      'Limit salt intake to reduce swelling',
      'Avoid alcohol for 2 weeks'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Splint removed, major bruising fading, significant swelling present'
      },
      {
        timeframe: '2-3 weeks',
        expectation: 'Bruising resolved, swelling improving, can return to work/social activities'
      },
      {
        timeframe: '1 month',
        expectation: 'About 70% of swelling resolved, nose shape becoming visible'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'About 80-90% of swelling resolved, good idea of final result'
      },
      {
        timeframe: '6 months',
        expectation: 'Tip swelling continuing to refine'
      },
      {
        timeframe: '12-18 months',
        expectation: 'Final result achieved, all swelling resolved'
      }
    ],
    functionalRecovery: 'Breathing typically improves within 2-4 weeks as internal swelling subsides. Full nasal breathing restored within 2-3 months.',
    cosmeticOutcome: 'Most patients are satisfied with their rhinoplasty results. The nose will look more refined and proportionate to the face. Scars from open rhinoplasty are typically imperceptible after healing.',
    successRate: 'Primary rhinoplasty has a satisfaction rate of 85-90%. Approximately 5-15% of patients may desire revision surgery.',
    possibleComplications: [
      {
        complication: 'Unsatisfactory cosmetic result',
        riskLevel: 'moderate',
        prevention: 'Thorough preoperative planning and realistic expectations',
        management: 'Revision rhinoplasty if needed (wait 12-18 months)'
      },
      {
        complication: 'Nasal obstruction',
        riskLevel: 'low',
        prevention: 'Careful surgical technique preserving nasal function',
        management: 'May require functional revision'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '5-7 days',
        purpose: 'Remove splint and external sutures, check healing'
      },
      {
        timing: '2 weeks',
        purpose: 'Monitor healing, address any concerns'
      },
      {
        timing: '1 month',
        purpose: 'Assess early result, clearance for more activities'
      },
      {
        timing: '3 months',
        purpose: 'Evaluate healing progress'
      },
      {
        timing: '6 months',
        purpose: 'Assess result, photograph comparison'
      },
      {
        timing: '12 months',
        purpose: 'Final result assessment'
      }
    ],
    rehabilitationNeeds: [
      'No formal rehabilitation required',
      'Patience with swelling resolution',
      'Emotional adjustment to new appearance'
    ],
    lifestyleModifications: [
      'Protect nose from trauma for at least 6 months',
      'Use high SPF sunscreen on nose',
      'Avoid wearing heavy glasses on nose bridge',
      'Consider taping glasses to forehead or using cheek rests'
    ]
  },

  warningSigns: [
    'Increasing swelling after first few days',
    'Fever above 38°C (100.4°F)',
    'Increasing redness or warmth',
    'Persistent severe headache',
    'Significant asymmetry that worsens',
    'Foul smell from nose'
  ],

  emergencySigns: [
    'Severe uncontrolled nosebleed',
    'Difficulty breathing that worsens suddenly',
    'Signs of severe infection: high fever, spreading redness',
    'Vision changes',
    'Chest pain or shortness of breath',
    'Signs of allergic reaction to medications'
  ],

  complianceRequirements: [
    {
      requirement: 'Keep head elevated for at least 1 week',
      importance: 'critical',
      consequence: 'Lying flat increases swelling and prolongs recovery'
    },
    {
      requirement: 'Do not blow your nose',
      importance: 'critical',
      consequence: 'Can displace structures and cause bleeding'
    },
    {
      requirement: 'Avoid glasses resting on nose',
      importance: 'critical',
      consequence: 'Can cause permanent indentation in healing nasal bones'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'important',
      consequence: 'Early detection of any concerns improves outcomes'
    }
  ],

  whoGuidelines: [
    {
      title: 'Surgical Safety Guidelines',
      reference: 'WHO Surgical Safety Checklist 2009',
      keyPoints: [
        'Confirm correct patient and procedure',
        'Review allergies and medical history',
        'Ensure proper antibiotic prophylaxis',
        'Monitor for complications post-operatively'
      ]
    }
  ]
};

/**
 * Blepharoplasty (Eyelid Surgery)
 */
export const blepharoplasty: EducationCondition = {
  id: 'cosmetic-blepharoplasty',
  name: 'Blepharoplasty (Eyelid Surgery)',
  category: 'I',
  icdCode: 'Z41.1',
  description: 'Blepharoplasty is a surgical procedure to improve the appearance of the eyelids by removing excess skin, muscle, and fat. It can be performed on upper lids, lower lids, or both.',
  alternateNames: ['Eyelid Lift', 'Eyelid Surgery', 'Eye Lift', 'Upper Blepharoplasty', 'Lower Blepharoplasty'],
  
  overview: {
    definition: 'Blepharoplasty is a surgical procedure that removes excess skin, muscle, and sometimes fat from the upper and/or lower eyelids. Upper blepharoplasty addresses droopy upper lids that can make you look tired or impair vision. Lower blepharoplasty treats bags and puffiness under the eyes. The procedure rejuvenates the eye area, creating a more youthful, rested appearance.',
    causes: [
      'Aging causing skin laxity and fat herniation',
      'Genetic predisposition to puffy eyes',
      'Excess upper eyelid skin impairing peripheral vision',
      'Desire for cosmetic improvement',
      'Tired or aged appearance despite adequate rest',
      'Asymmetry between eyelids'
    ],
    symptoms: [
      'Excess skin on upper eyelids',
      'Drooping upper eyelids (ptosis may need separate treatment)',
      'Bags or puffiness under eyes',
      'Dark circles under eyes',
      'Tired, aged appearance',
      'Peripheral vision impairment from heavy upper lids',
      'Difficulty wearing eye makeup'
    ],
    riskFactors: [
      'Dry eye syndrome',
      'Thyroid eye disease (Graves disease)',
      'Diabetes',
      'High blood pressure',
      'Bleeding disorders',
      'Previous eye surgery',
      'Glaucoma'
    ],
    complications: [
      'Dry eyes (temporary or permanent)',
      'Difficulty closing eyes',
      'Asymmetry',
      'Bleeding (hematoma)',
      'Infection',
      'Scarring',
      'Temporary blurred vision',
      'Ectropion (lower lid pulling down)',
      'Hollow appearance if too much fat removed'
    ],
    prevalence: 'Blepharoplasty is one of the top 5 most commonly performed cosmetic procedures, with over 300,000 procedures performed annually in the United States.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Consultation and Assessment',
      duration: '2-4 weeks before surgery',
      description: 'Comprehensive evaluation of eyelid concerns, vision testing if upper lid surgery, and determination of surgical plan.',
      goals: [
        'Assess candidacy for surgery',
        'Document baseline appearance and vision',
        'Discuss realistic expectations',
        'Plan surgical approach'
      ],
      activities: [
        'Complete eye examination',
        'Visual field testing if upper blepharoplasty',
        'Review medical history',
        'Photograph documentation',
        'Discussion of goals and expectations'
      ],
      warningSignsThisPhase: [
        'Uncontrolled dry eye disease',
        'Significant ptosis requiring different surgery',
        'Unrealistic expectations'
      ]
    },
    {
      phase: 2,
      name: 'Surgery Day',
      duration: '1-2 hours',
      description: 'The blepharoplasty procedure is performed, usually under local anesthesia with sedation. Excess skin and fat are removed through carefully placed incisions.',
      goals: [
        'Safely perform surgery',
        'Remove appropriate amount of tissue',
        'Ensure symmetry',
        'Place incisions in natural creases'
      ],
      activities: [
        'Local anesthesia with or without sedation',
        'Incisions in upper lid crease and/or below lower lashes',
        'Removal of excess skin, muscle, fat',
        'Meticulous closure',
        'Application of ointment and cool compresses'
      ],
      warningSignsThisPhase: [
        'Excessive bleeding during surgery',
        'Anesthesia complications'
      ]
    },
    {
      phase: 3,
      name: 'Initial Recovery',
      duration: 'Days 1-7',
      description: 'Peak swelling and bruising occur in first 48-72 hours then gradually improve. Cold compresses and head elevation are essential.',
      goals: [
        'Minimize swelling and bruising',
        'Prevent complications',
        'Keep incisions clean',
        'Protect eyes'
      ],
      activities: [
        'Apply cold compresses 20 minutes on, 20 minutes off',
        'Keep head elevated',
        'Use prescribed eye drops and ointments',
        'Take medications as directed',
        'Avoid straining and bending'
      ],
      medications: [
        {
          name: 'Lubricating eye drops',
          purpose: 'Prevent dry eye and protect cornea',
          duration: '2-4 weeks or longer'
        },
        {
          name: 'Antibiotic ointment',
          purpose: 'Prevent infection',
          duration: '1-2 weeks'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '3-5 days'
        }
      ],
      warningSignsThisPhase: [
        'Severe pain especially with eye movement',
        'Vision changes or loss',
        'Significant asymmetric swelling',
        'Fever'
      ]
    },
    {
      phase: 4,
      name: 'Early Healing',
      duration: 'Weeks 1-4',
      description: 'Sutures are removed around day 5-7. Bruising fades, swelling continues to improve. Gradual return to normal activities.',
      goals: [
        'Remove sutures',
        'Monitor healing',
        'Gradually resume activities',
        'Address any concerns'
      ],
      activities: [
        'Attend follow-up for suture removal',
        'Gentle cleaning of incisions',
        'Continue eye lubrication',
        'Wear sunglasses outdoors',
        'Avoid makeup for 2 weeks'
      ],
      warningSignsThisPhase: [
        'Wound separation',
        'Persistent severe swelling',
        'Difficulty closing eyes completely',
        'Signs of infection'
      ]
    },
    {
      phase: 5,
      name: 'Final Healing',
      duration: '1-6 months',
      description: 'Residual swelling resolves, scars mature and fade. Final result becomes apparent.',
      goals: [
        'Complete healing',
        'Scar maturation',
        'Final result assessment',
        'Return to all activities'
      ],
      activities: [
        'Regular follow-up appointments',
        'Sun protection for scars',
        'Resume all normal activities',
        'Use makeup to conceal scars if desired'
      ],
      warningSignsThisPhase: [
        'Persistent asymmetry',
        'Scar problems',
        'Ongoing dry eyes'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic surgeon or oculoplastic surgeon consultation',
      'Ophthalmologist evaluation for dry eye and vision',
      'Medical clearance if significant health conditions'
    ],
    investigations: [
      'Visual field testing (if upper lids for functional reasons)',
      'Tear production testing if dry eye concerns',
      'Blood tests: clotting studies if indicated',
      'Photography for documentation'
    ],
    medications: [
      {
        medication: 'Aspirin and NSAIDs',
        instruction: 'stop',
        reason: 'Increase bleeding and bruising - stop 2 weeks before'
      },
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop - discuss with prescribing doctor'
      },
      {
        medication: 'Eye drops',
        instruction: 'continue',
        reason: 'Continue regular eye drops as prescribed'
      }
    ],
    fastingInstructions: 'If sedation is planned, no food for 6 hours and clear fluids only up to 2 hours before. Local anesthesia only - light breakfast is usually fine.',
    dayBeforeSurgery: [
      'Remove contact lenses and wear glasses',
      'Wash face and eye area thoroughly',
      'Prepare recovery area with cold compresses ready',
      'Get good rest'
    ],
    whatToBring: [
      'Dark sunglasses',
      'Comfortable loose clothing',
      'Driver to take you home',
      'List of medications',
      'Ice packs or frozen peas for cold compresses'
    ],
    dayOfSurgery: [
      'Do not wear makeup or eye cream',
      'Wear comfortable clothing',
      'Remove contact lenses',
      'Arrive at scheduled time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia with or without sedation (most common). General anesthesia is used occasionally.',
    procedureDescription: 'For upper blepharoplasty, an incision is made in the natural crease of the upper lid. Excess skin and sometimes muscle and fat are removed. The incision is closed with fine sutures. For lower blepharoplasty, the incision is made just below the lash line (external approach) or inside the lower lid (transconjunctival approach). Excess fat is removed or repositioned, and if needed, excess skin is removed. Incisions heal to become nearly invisible.',
    duration: '1-2 hours (both upper and lower lids)',
    whatToExpect: 'You will be awake but relaxed if having sedation. You will feel pressure but not pain. The area will be numb from local anesthetic. You may see lights and instruments but should keep eyes closed as directed.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Keep head elevated above heart level, including when sleeping. Use 2-3 pillows or sleep in recliner.',
      expectedSymptoms: [
        'Swelling of eyelids (peaks at 48-72 hours)',
        'Bruising around eyes (may extend to cheeks)',
        'Watery or dry eyes',
        'Light sensitivity',
        'Blurred vision (from ointment)',
        'Mild discomfort or tightness',
        'Difficulty closing eyes completely (temporary)'
      ],
      activityLevel: 'Rest at home for first 2-3 days. Avoid bending, straining, and heavy lifting.'
    },
    woundCare: [
      {
        day: 'Days 1-5',
        instruction: 'Apply prescribed antibiotic ointment to incisions 2-3 times daily. Gently clean with saline if any crusting.'
      },
      {
        day: 'Days 5-7',
        instruction: 'Sutures removed in clinic. Continue gentle cleaning.'
      },
      {
        day: 'Weeks 1-4',
        instruction: 'Keep incisions clean. Apply sunscreen or wear sunglasses outdoors. May use concealing makeup after 2 weeks.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild (2-4/10). Discomfort and tightness more common than pain.',
      medications: [
        'Paracetamol (acetaminophen) for mild discomfort',
        'Prescribed pain medication if needed (rarely required after day 2)',
        'AVOID aspirin and NSAIDs for 2 weeks'
      ],
      nonPharmacological: [
        'Cold compresses for first 48-72 hours',
        'Head elevation',
        'Artificial tears for comfort',
        'Rest with eyes closed'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Reading and screens',
        restriction: 'Limit for first few days',
        duration: '3-5 days',
        reason: 'Eyes may tire easily and need rest'
      },
      {
        activity: 'Wearing contact lenses',
        restriction: 'Do not wear',
        duration: '2 weeks',
        reason: 'Allow eyes to heal without irritation'
      },
      {
        activity: 'Eye makeup',
        restriction: 'Do not apply',
        duration: '2 weeks minimum',
        reason: 'Risk of irritation and infection'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '3-4 weeks',
        reason: 'Increases blood pressure and swelling'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: '4 weeks',
        reason: 'Risk of infection and irritation'
      }
    ],
    dietaryGuidelines: [
      'No special diet required',
      'Stay well hydrated',
      'Limit salt to reduce swelling',
      'Avoid alcohol for first week'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1 week',
        expectation: 'Sutures removed, bruising fading, significant swelling still present'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Most bruising resolved, can return to work/social activities'
      },
      {
        timeframe: '1 month',
        expectation: 'Major swelling resolved, early result visible'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Near-final result visible, scars fading'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Final result, scars well-healed and usually imperceptible'
      }
    ],
    functionalRecovery: 'Vision typically improves (if impaired by droopy lids) within 1-2 weeks as swelling subsides. Full return to all activities within 4-6 weeks.',
    cosmeticOutcome: 'Eyes appear more open, rested, and youthful. Bags and puffiness are reduced or eliminated. Scars are hidden in natural creases and become essentially invisible.',
    successRate: 'Patient satisfaction rates exceed 90%. Results typically last 5-10 years or longer for upper lids.',
    possibleComplications: [
      {
        complication: 'Dry eyes',
        riskLevel: 'moderate',
        prevention: 'Careful assessment of pre-existing dry eye, conservative tissue removal',
        management: 'Lubricating drops, punctal plugs if persistent'
      },
      {
        complication: 'Asymmetry',
        riskLevel: 'low',
        prevention: 'Careful surgical technique and marking',
        management: 'Minor revision if needed after full healing'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '5-7 days',
        purpose: 'Suture removal, assess healing'
      },
      {
        timing: '2 weeks',
        purpose: 'Check healing progress'
      },
      {
        timing: '1 month',
        purpose: 'Assess early result'
      },
      {
        timing: '3 months',
        purpose: 'Evaluate result, address any concerns'
      }
    ],
    rehabilitationNeeds: [
      'No formal rehabilitation required',
      'Use of lubricating eye drops as needed'
    ],
    lifestyleModifications: [
      'Protect eyes from sun with sunglasses and sunscreen',
      'Continue good skincare around eyes',
      'Avoid smoking to preserve results'
    ]
  },

  warningSigns: [
    'Increasing pain, especially with eye movement',
    'Significant worsening of swelling after day 3',
    'Unable to close eyes completely',
    'Persistent blurred or double vision',
    'Fever',
    'Increasing redness around incisions'
  ],

  emergencySigns: [
    'Sudden severe pain in eye (may indicate bleeding behind eye)',
    'Sudden vision loss or significant vision change',
    'Severe swelling that prevents eye opening',
    'Signs of severe infection: high fever, spreading redness',
    'Difficulty breathing or severe allergic reaction'
  ],

  complianceRequirements: [
    {
      requirement: 'Use lubricating eye drops frequently',
      importance: 'critical',
      consequence: 'Prevents dry eye damage and discomfort'
    },
    {
      requirement: 'Keep head elevated especially when sleeping',
      importance: 'important',
      consequence: 'Reduces swelling and speeds recovery'
    },
    {
      requirement: 'Apply cold compresses in first 48 hours',
      importance: 'important',
      consequence: 'Significantly reduces bruising and swelling'
    },
    {
      requirement: 'Avoid eye makeup for 2 weeks',
      importance: 'important',
      consequence: 'Prevents infection and irritation'
    }
  ],

  whoGuidelines: [
    {
      title: 'Safe Surgery Guidelines',
      reference: 'WHO Surgical Safety Checklist',
      keyPoints: [
        'Proper patient identification',
        'Confirm procedure and site',
        'Review allergies and medications',
        'Ensure sterile technique'
      ]
    }
  ]
};

// Export cosmetic procedures part 1
export const cosmeticProceduresPart1 = [rhinoplasty, blepharoplasty];
