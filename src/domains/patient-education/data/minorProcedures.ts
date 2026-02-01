/**
 * Patient Education Content - Category N: Minor/Day Case Procedures
 * Part 1: Keloid Excision, Ingrown Toenail, Lipoma Removal
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Best Practice Standards
 * 
 * These are outpatient/day case procedures typically performed under local anesthesia
 */

import type { EducationCondition } from '../types';

/**
 * Keloid Excision
 */
export const keloidExcision: EducationCondition = {
  id: 'minor-keloid-excision',
  name: 'Keloid Excision',
  category: 'N',
  icdCode: 'L91.0',
  description: 'Keloid excision is a surgical procedure to remove keloid scars - raised, thickened areas of scar tissue that grow beyond the boundaries of the original wound. This is typically a day case procedure performed under local anesthesia.',
  alternateNames: ['Keloid Removal', 'Keloid Surgery', 'Keloid Scar Excision', 'Hypertrophic Scar Removal'],
  
  overview: {
    definition: 'A keloid is an overgrowth of scar tissue that develops around a wound, usually after the wound has healed. Unlike normal scars, keloids grow beyond the original wound boundaries and do not regress over time. Keloid excision involves surgically removing the keloid tissue, often combined with other treatments to prevent recurrence. Keloids are more common in people with darker skin tones and those with a genetic predisposition. The procedure is typically performed as a day case under local anesthesia, allowing patients to go home the same day.',
    causes: [
      'Skin injuries (cuts, burns, surgical incisions)',
      'Acne scars',
      'Ear piercings',
      'Tattoos',
      'Vaccination sites',
      'Insect bites',
      'Chicken pox scars',
      'Spontaneous keloid formation (rare)'
    ],
    symptoms: [
      'Raised, firm scar tissue extending beyond original wound',
      'Pink, red, or skin-colored appearance',
      'Shiny, hairless surface',
      'Itching or tenderness',
      'Discomfort with clothing or jewelry contact',
      'Cosmetic concerns',
      'Restricted movement if over a joint',
      'Growth over time (months to years)'
    ],
    riskFactors: [
      'African, Asian, or Hispanic ancestry (10-15 times higher risk)',
      'Age 10-30 years (peak incidence)',
      'Family history of keloids',
      'Previous keloid formation',
      'Darker skin pigmentation',
      'Pregnancy (can trigger or worsen keloids)',
      'Wounds under tension',
      'Wounds in high-risk areas (chest, shoulders, earlobes, upper back)'
    ],
    complications: [
      'Keloid recurrence (30-100% without adjuvant therapy)',
      'Larger keloid formation after excision',
      'Infection',
      'Wound dehiscence',
      'Hyperpigmentation or hypopigmentation',
      'Chronic pain',
      'Nerve damage'
    ],
    prevalence: 'Keloids affect approximately 4-16% of the global population. They are 15 times more common in people of African descent. Peak incidence is between ages 10-30 years.',
    prognosis: 'With combined therapy (excision + adjuvant treatment), recurrence rates can be reduced to 10-20%. Single modality treatment has higher recurrence rates. Early intervention and multimodal therapy improve outcomes.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Procedure Assessment',
      duration: '1-2 weeks before procedure',
      description: 'Evaluation of keloid characteristics and planning of comprehensive treatment strategy including adjuvant therapies.',
      goals: [
        'Assess keloid size, location, and characteristics',
        'Determine surgical approach',
        'Plan adjuvant therapy (steroid injections, pressure therapy, radiation)',
        'Set realistic expectations with patient',
        'Identify risk factors for recurrence'
      ],
      activities: [
        'Clinical examination and photography',
        'Discuss treatment options and recurrence risks',
        'Plan multimodal therapy approach',
        'Pre-operative blood tests if needed',
        'Obtain informed consent'
      ],
      warningSignsThisPhase: [
        'Signs of active infection in keloid',
        'Rapid growth suggesting malignancy',
        'Uncontrolled medical conditions'
      ]
    },
    {
      phase: 2,
      name: 'Day of Procedure',
      duration: 'Same day (2-4 hours total visit)',
      description: 'Surgical excision of keloid under local anesthesia as a day case procedure.',
      goals: [
        'Complete excision of keloid tissue',
        'Tension-free wound closure',
        'Minimize tissue trauma',
        'Immediate post-excision steroid injection if planned'
      ],
      activities: [
        'Arrive at facility (fasting not required for local anesthesia)',
        'Local anesthesia administration',
        'Keloid excision with appropriate technique',
        'Intralesional steroid injection (often done immediately)',
        'Careful wound closure',
        'Pressure dressing application',
        'Post-procedure observation (30-60 minutes)',
        'Discharge with instructions'
      ],
      warningSignsThisPhase: [
        'Excessive bleeding',
        'Allergic reaction to anesthesia',
        'Wound tension issues'
      ]
    },
    {
      phase: 3,
      name: 'Early Recovery',
      duration: 'Days 1-14',
      description: 'Wound healing phase with focus on preventing infection and initiating adjuvant therapy.',
      goals: [
        'Wound healing',
        'Pain management',
        'Prevent infection',
        'Begin adjuvant therapy',
        'Start pressure therapy'
      ],
      activities: [
        'Keep wound clean and dry',
        'Take prescribed medications',
        'Apply pressure garment or silicone sheets as directed',
        'Attend follow-up for steroid injections',
        'Avoid sun exposure to wound',
        'Limit physical activity involving the area'
      ],
      medications: [
        {
          name: 'Paracetamol',
          purpose: 'Pain relief',
          duration: 'As needed for 3-5 days'
        },
        {
          name: 'Antibiotics (if prescribed)',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Triamcinolone injections',
          purpose: 'Prevent keloid recurrence',
          duration: 'Weekly for 4-6 weeks, then monthly'
        }
      ],
      warningSignsThisPhase: [
        'Increasing redness, swelling, or warmth',
        'Pus or discharge from wound',
        'Fever',
        'Wound opening',
        'Severe pain not relieved by medication'
      ]
    },
    {
      phase: 4,
      name: 'Long-term Prevention Phase',
      duration: 'Weeks 2-52',
      description: 'Ongoing adjuvant therapy and monitoring to prevent keloid recurrence.',
      goals: [
        'Prevent keloid recurrence',
        'Optimize cosmetic outcome',
        'Complete adjuvant therapy course',
        'Monitor for early signs of recurrence'
      ],
      activities: [
        'Continue pressure therapy (minimum 6-12 months)',
        'Apply silicone gel sheets daily',
        'Attend steroid injection appointments',
        'Sun protection of scar',
        'Massage therapy when wound fully healed',
        'Regular follow-up appointments'
      ],
      warningSignsThisPhase: [
        'Any elevation or thickening of scar',
        'Redness or discoloration',
        'Itching or pain in healed area',
        'Visible keloid regrowth'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Plastic/General Surgeon',
      'Dermatologist (for complex cases)',
      'Radiation oncologist (if radiation therapy planned)'
    ],
    investigations: [
      'None routinely required for healthy adults',
      'Bleeding profile if on anticoagulants',
      'Blood glucose if diabetic'
    ],
    medications: [
      {
        medication: 'Aspirin/NSAIDs',
        instruction: 'stop 7 days before if possible',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Blood thinners',
        instruction: 'discuss with surgeon - may need bridging',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Regular medications',
        instruction: 'continue as normal',
        reason: 'Maintain health status'
      }
    ],
    dietaryRestrictions: [
      'No fasting required for local anesthesia procedures',
      'Eat a light meal before procedure to prevent feeling faint',
      'Stay well hydrated'
    ],
    physicalPreparation: [
      'Shower/bathe on morning of procedure',
      'Wear loose, comfortable clothing',
      'Avoid lotions or creams on the keloid area',
      'Arrange transportation if nervous about driving after'
    ],
    dayBeforeInstructions: [
      'Confirm appointment time',
      'Prepare loose clothing that avoids the surgical area',
      'Get a good night\'s sleep',
      'Do not shave the area (surgeon will do if needed)'
    ],
    dayOfSurgeryInstructions: [
      'Eat a light breakfast/meal',
      'Take regular medications with sips of water',
      'Arrive on time for appointment',
      'Bring list of medications and allergies',
      'Bring someone to drive you home if preferred'
    ]
  },

  intraoperativeInfo: {
    procedureSteps: [
      'Local anesthetic injection around keloid',
      'Wait for anesthesia to take effect (5-10 minutes)',
      'Careful excision of keloid tissue',
      'Hemostasis (stopping any bleeding)',
      'Intralesional steroid injection',
      'Tension-free wound closure with sutures',
      'Pressure dressing application'
    ],
    anesthesiaType: 'Local anesthesia (lidocaine with epinephrine)',
    duration: '30-60 minutes depending on keloid size',
    teamInvolved: [
      'Surgeon',
      'Nurse/Assistant',
      'Patient (awake during procedure)'
    ]
  },

  postoperativeInstructions: {
    immediatePostOp: [
      'Rest in recovery area for 30-60 minutes',
      'Ensure bleeding has stopped',
      'Receive discharge instructions',
      'Collect prescribed medications',
      'Schedule follow-up appointment'
    ],
    woundCare: {
      frequency: 'Daily or as directed',
      method: 'Keep dressing clean and dry. Clean with saline if directed. Apply prescribed ointment.',
      products: [
        'Sterile gauze',
        'Saline solution',
        'Antibiotic ointment if prescribed',
        'Silicone gel/sheets (after wound heals)'
      ],
      precautions: [
        'Do not wet the wound for first 48 hours',
        'Do not pick at scabs or sutures',
        'Avoid sun exposure',
        'Do not apply unprescribed creams'
      ]
    },
    activityRestrictions: {
      duration: '2-4 weeks',
      restrictions: [
        'Avoid strenuous activity for 2 weeks',
        'No heavy lifting for 2-4 weeks',
        'Avoid stretching the wound area',
        'Return to desk work in 1-2 days',
        'Return to physical work in 2-4 weeks'
      ]
    },
    medications: [
      {
        name: 'Paracetamol 1g',
        dosage: '1g every 6 hours as needed',
        frequency: 'Every 6 hours',
        duration: '3-5 days',
        sideEffects: 'Rare at recommended doses',
        instructions: 'Do not exceed 4g per day'
      },
      {
        name: 'Ibuprofen 400mg (if prescribed)',
        dosage: '400mg with food',
        frequency: 'Every 8 hours',
        duration: '3-5 days',
        sideEffects: 'Stomach upset, take with food',
        instructions: 'Take with food, avoid if kidney problems'
      }
    ],
    followUpSchedule: [
      {
        timing: '7-10 days',
        purpose: 'Suture removal, first steroid injection if not done at surgery'
      },
      {
        timing: '2-3 weeks',
        purpose: 'Second steroid injection, assess healing'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Third steroid injection, start pressure therapy review'
      },
      {
        timing: 'Monthly for 6-12 months',
        purpose: 'Steroid injections and recurrence monitoring'
      }
    ]
  },

  expectedOutcomes: {
    immediateOutcomes: [
      'Keloid removed',
      'Linear scar in place of keloid',
      'Mild pain and swelling (normal)',
      'Bruising around wound'
    ],
    shortTermOutcomes: [
      'Wound heals in 10-14 days',
      'Sutures removed at 7-10 days',
      'Flat, linear scar',
      'Reduced cosmetic concern'
    ],
    longTermOutcomes: [
      'Flat, soft scar with continued treatment',
      'Improved appearance',
      'Reduced symptoms (itching, pain)',
      'Need for ongoing monitoring',
      '10-20% recurrence rate with multimodal therapy'
    ],
    recoveryTimeline: {
      phases: [
        { day: '0', milestone: 'Procedure completed, go home same day' },
        { day: '1-2', milestone: 'Minimal discomfort, normal activities' },
        { day: '7-10', milestone: 'Sutures removed' },
        { day: '14', milestone: 'Wound fully healed, start silicone therapy' },
        { day: '30', milestone: 'Scar maturing, continue adjuvant therapy' },
        { day: '90', milestone: 'Early assessment of recurrence risk' },
        { day: '365', milestone: 'Final assessment, adjuvant therapy may continue' }
      ],
      returnToWork: '1-2 days for desk work, 2-4 weeks for physical work',
      returnToNormalActivities: '2-4 weeks',
      fullRecovery: 'Scar maturation takes 12-18 months'
    }
  },

  followUpCare: {
    appointments: [
      {
        timing: '7-10 days post-procedure',
        purpose: 'Suture removal, assess healing, steroid injection'
      },
      {
        timing: 'Weekly for 4-6 weeks',
        purpose: 'Steroid injections'
      },
      {
        timing: 'Monthly for 6-12 months',
        purpose: 'Ongoing steroid injections and monitoring'
      },
      {
        timing: 'Annually for 2-3 years',
        purpose: 'Long-term recurrence monitoring'
      }
    ],
    selfMonitoring: [
      'Daily wound inspection during healing',
      'Check for signs of infection (redness, swelling, discharge)',
      'Monitor for early signs of keloid recurrence',
      'Track compliance with pressure therapy',
      'Note any new symptoms'
    ],
    rehabilitationExercises: [
      'Gentle range of motion if over a joint',
      'Scar massage (after wound fully healed, around 2-3 weeks)',
      'Gradual return to normal activities'
    ]
  },

  complianceRequirements: [
    {
      requirement: 'Pressure therapy',
      importance: 'Critical for preventing recurrence',
      frequency: '23 hours/day for 6-12 months',
      consequences: 'High recurrence risk if not followed'
    },
    {
      requirement: 'Silicone therapy',
      importance: 'Important for scar quality',
      frequency: 'Daily application for 3-6 months',
      consequences: 'Suboptimal scar appearance'
    },
    {
      requirement: 'Steroid injection appointments',
      importance: 'Critical for preventing recurrence',
      frequency: 'Weekly then monthly as scheduled',
      consequences: '50-100% recurrence without injections'
    },
    {
      requirement: 'Sun protection',
      importance: 'Important for scar appearance',
      frequency: 'Daily for 12 months',
      consequences: 'Hyperpigmentation, poor cosmetic result'
    }
  ],

  warningSigns: [
    'Increasing pain after first few days',
    'Redness spreading from wound',
    'Pus or foul-smelling discharge',
    'Fever or chills',
    'Wound opening or sutures coming out',
    'Any elevation or thickening of healing scar',
    'Recurrence of itching or growth'
  ],

  emergencySigns: [
    'Severe allergic reaction (difficulty breathing, swelling of face/throat)',
    'Uncontrollable bleeding',
    'Signs of severe infection (high fever, red streaking from wound)',
    'Severe pain not controlled by medications'
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Wound Management',
      reference: 'WHO 2018',
      keyPoints: [
        'Aseptic technique during procedures',
        'Appropriate wound closure',
        'Prevention of wound complications'
      ]
    }
  ]
};

/**
 * Ingrown Toenail (Onychocryptosis)
 */
export const ingrownToenail: EducationCondition = {
  id: 'minor-ingrown-toenail',
  name: 'Ingrown Toenail Surgery',
  category: 'N',
  icdCode: 'L60.0',
  description: 'Ingrown toenail surgery is a minor procedure to treat a toenail that has grown into the surrounding skin, causing pain, swelling, and often infection. The procedure is performed under local anesthesia as a day case.',
  alternateNames: ['Onychocryptosis Treatment', 'Partial Nail Avulsion', 'Wedge Resection', 'Nail Matricectomy', 'Ingrown Nail Removal'],
  
  overview: {
    definition: 'An ingrown toenail occurs when the edge of the toenail grows into the skin of the toe, most commonly affecting the big toe. This causes pain, redness, swelling, and sometimes infection. When conservative treatments fail, surgical removal of part or all of the nail with destruction of the nail matrix (root) is performed. The procedure is done under local anesthesia in clinic as a day case, taking about 20-30 minutes. Recovery is quick, with most patients returning to normal activities within days.',
    causes: [
      'Improper nail trimming (cutting nails too short or curved)',
      'Tight or narrow footwear',
      'Trauma to the toe',
      'Naturally curved or thick nails',
      'Genetic predisposition',
      'Poor foot hygiene',
      'Fungal nail infection',
      'Hyperhidrosis (excessive sweating)',
      'Diabetes-related nail changes'
    ],
    symptoms: [
      'Pain and tenderness along one or both sides of the nail',
      'Redness around the nail',
      'Swelling of the toe around the nail',
      'Infection with pus drainage',
      'Overgrowth of skin around the nail (granulation tissue)',
      'Bleeding when touched',
      'Difficulty wearing shoes',
      'Difficulty walking comfortably'
    ],
    riskFactors: [
      'Improper nail cutting technique',
      'Wearing tight shoes or high heels',
      'Diabetes mellitus',
      'Poor circulation',
      'Sweaty feet',
      'Adolescents (rapid nail growth)',
      'Athletes',
      'Previous ingrown toenails',
      'Obesity',
      'Fungal nail infections'
    ],
    complications: [
      'Cellulitis (skin infection)',
      'Osteomyelitis (bone infection) - rare but serious',
      'Abscess formation',
      'Chronic pain',
      'Nail deformity',
      'Ulceration',
      'Gangrene (in diabetics with poor circulation)',
      'Recurrence after surgery (5-20%)'
    ],
    prevalence: 'Ingrown toenails are one of the most common nail conditions, affecting approximately 2.5-5% of the population at some point. They are most common in teenagers and young adults.',
    prognosis: 'With proper surgical treatment including matrix ablation, cure rates exceed 95%. Without matrix destruction, recurrence rates are 30-50%.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Procedure Assessment',
      duration: 'At initial consultation',
      description: 'Evaluation of the ingrown nail and planning of appropriate surgical approach.',
      goals: [
        'Assess severity of ingrown nail',
        'Rule out infection requiring antibiotics first',
        'Determine appropriate surgical technique',
        'Check for diabetes and vascular status',
        'Patient education'
      ],
      activities: [
        'Physical examination of toe',
        'Check for signs of infection',
        'Assess pulses and sensation (especially in diabetics)',
        'Discuss procedure options',
        'Obtain informed consent'
      ],
      warningSignsThisPhase: [
        'Severe spreading infection requiring antibiotics before surgery',
        'Signs of poor circulation (cold, pale toe)',
        'Uncontrolled diabetes'
      ]
    },
    {
      phase: 2,
      name: 'Day of Procedure',
      duration: 'Same day (1-2 hours total visit)',
      description: 'Minor surgical procedure under local anesthesia to remove ingrown portion and prevent recurrence.',
      goals: [
        'Remove ingrown nail edge',
        'Destroy nail matrix to prevent regrowth',
        'Drain any infection',
        'Provide immediate pain relief'
      ],
      activities: [
        'Arrive at facility',
        'Digital nerve block (local anesthesia)',
        'Application of tourniquet',
        'Partial or total nail avulsion',
        'Chemical matricectomy (phenol) or surgical matricectomy',
        'Wound dressing',
        'Post-procedure observation',
        'Discharge with instructions'
      ],
      warningSignsThisPhase: [
        'Allergic reaction to anesthesia',
        'Excessive bleeding',
        'Severe pain despite anesthesia'
      ]
    },
    {
      phase: 3,
      name: 'Early Recovery',
      duration: 'Days 1-14',
      description: 'Wound healing phase with focus on preventing infection and managing post-procedure discomfort.',
      goals: [
        'Wound healing',
        'Prevent infection',
        'Manage pain',
        'Protect the toe',
        'Return to normal activities'
      ],
      activities: [
        'Keep foot elevated when possible for first 24-48 hours',
        'Take prescribed pain medications',
        'Daily wound care with salt water soaks',
        'Keep dressing clean and dry',
        'Wear open-toed shoes or sandals',
        'Avoid strenuous activities'
      ],
      medications: [
        {
          name: 'Paracetamol',
          purpose: 'Pain relief',
          duration: '3-5 days as needed'
        },
        {
          name: 'Ibuprofen',
          purpose: 'Pain and inflammation',
          duration: '3-5 days as needed'
        },
        {
          name: 'Antibiotics (if prescribed)',
          purpose: 'Treat/prevent infection',
          duration: '5-7 days'
        }
      ],
      warningSignsThisPhase: [
        'Increasing pain after first 48 hours',
        'Spreading redness',
        'Pus or discharge',
        'Fever',
        'Numbness that doesn\'t resolve',
        'Excessive bleeding'
      ]
    },
    {
      phase: 4,
      name: 'Full Recovery',
      duration: 'Weeks 2-6',
      description: 'Complete healing and return to all normal activities including sports.',
      goals: [
        'Complete wound healing',
        'Return to all activities',
        'Learn prevention strategies',
        'Monitor for recurrence'
      ],
      activities: [
        'Gradually return to normal footwear',
        'Resume all activities including sports',
        'Learn proper nail cutting technique',
        'Wear appropriate footwear',
        'Monitor for any signs of recurrence'
      ],
      warningSignsThisPhase: [
        'Delayed healing',
        'Signs of nail regrowth at the edge',
        'Persistent pain or discomfort',
        'Nail deformity'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General/Plastic Surgeon or Podiatrist',
      'Diabetic review if diabetic (ensure good control)'
    ],
    investigations: [
      'None routinely required',
      'Blood glucose if diabetic',
      'X-ray if bone infection suspected'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss with surgeon - may continue for this minor procedure',
        reason: 'Individual assessment needed'
      },
      {
        medication: 'Regular medications',
        instruction: 'continue as normal',
        reason: 'Maintain health status'
      },
      {
        medication: 'Antibiotics (if prescribed for active infection)',
        instruction: 'complete course before or continue through procedure',
        reason: 'Control infection'
      }
    ],
    dietaryRestrictions: [
      'No fasting required - eat normally',
      'Stay well hydrated'
    ],
    physicalPreparation: [
      'Wash feet thoroughly before procedure',
      'Remove nail polish from affected toe',
      'Wear loose, comfortable footwear that you can slip on easily',
      'Bring sandals or open-toed shoes to wear home'
    ],
    dayBeforeInstructions: [
      'Soak foot in warm salt water for 15-20 minutes',
      'Ensure you have pain relief at home',
      'Prepare open-toed shoes for after procedure'
    ],
    dayOfSurgeryInstructions: [
      'Eat a normal breakfast/meal',
      'Take regular medications',
      'Arrive on time',
      'Bring sandals or flip-flops',
      'Arrange transportation home if nervous about walking/driving'
    ]
  },

  intraoperativeInfo: {
    procedureSteps: [
      'Digital ring block with local anesthetic',
      'Application of finger tourniquet',
      'Removal of ingrown nail edge (partial nail avulsion)',
      'Chemical destruction of nail matrix with phenol (prevents regrowth)',
      'Irrigation and cleaning',
      'Removal of tourniquet',
      'Application of dressing',
      'Observation until anesthesia wearing off'
    ],
    anesthesiaType: 'Digital nerve block (local anesthesia)',
    duration: '20-30 minutes',
    teamInvolved: [
      'Surgeon/Podiatrist',
      'Nurse',
      'Patient (awake during procedure)'
    ]
  },

  postoperativeInstructions: {
    immediatePostOp: [
      'Rest with foot elevated for first few hours',
      'Keep dressing clean and dry for 24 hours',
      'Take pain relief before anesthesia wears off',
      'Avoid driving on the day of procedure',
      'Wear open-toed shoes or sandals home'
    ],
    woundCare: {
      frequency: 'Daily from day 2',
      method: 'Soak foot in warm salt water (1 teaspoon salt per pint of water) for 10 minutes, then apply clean dressing',
      products: [
        'Salt for soaks',
        'Sterile gauze',
        'Medical tape',
        'Antiseptic if prescribed'
      ],
      precautions: [
        'Do not soak foot for first 24 hours',
        'Keep wound dry when not doing salt water soaks',
        'Do not remove any scabs',
        'Avoid tight bandaging'
      ]
    },
    activityRestrictions: {
      duration: '1-2 weeks',
      restrictions: [
        'Avoid walking long distances for first 2-3 days',
        'Keep foot elevated when sitting',
        'Avoid running/sports for 2-3 weeks',
        'Wear open-toed shoes for 1-2 weeks',
        'Return to desk work next day',
        'Return to standing/physical work in 3-7 days'
      ]
    },
    medications: [
      {
        name: 'Paracetamol 1g',
        dosage: '1g every 6 hours',
        frequency: 'As needed',
        duration: '3-5 days',
        sideEffects: 'Rare',
        instructions: 'Take before anesthesia wears off'
      },
      {
        name: 'Ibuprofen 400mg',
        dosage: '400mg with food',
        frequency: 'Every 8 hours',
        duration: '3-5 days',
        sideEffects: 'Take with food',
        instructions: 'Can combine with paracetamol'
      }
    ],
    followUpSchedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Check healing, ensure no infection'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Final check, confirm healing complete'
      }
    ]
  },

  expectedOutcomes: {
    immediateOutcomes: [
      'Relief of ingrown nail pain',
      'Some post-procedure discomfort (normal)',
      'Bleeding controlled',
      'Ability to walk home'
    ],
    shortTermOutcomes: [
      'Pain significantly reduced within 24-48 hours',
      'Wound healing over 2-3 weeks',
      'Able to return to work within 1-2 days',
      'Swelling reduces over 1 week'
    ],
    longTermOutcomes: [
      'Permanent resolution of ingrown nail (>95% success)',
      'Normal-appearing nail (may be slightly narrower)',
      'No recurrence with matrix ablation',
      'Return to all activities including sports'
    ],
    recoveryTimeline: {
      phases: [
        { day: '0', milestone: 'Procedure completed, go home same day' },
        { day: '1', milestone: 'Some discomfort, keep elevated, start salt soaks' },
        { day: '2-3', milestone: 'Pain improving, walking more comfortable' },
        { day: '7', milestone: 'Much improved, normal shoes may be possible' },
        { day: '14', milestone: 'Wound mostly healed' },
        { day: '21-28', milestone: 'Fully healed, all activities resumed' },
        { day: '90-180', milestone: 'New nail fully grown (if partial removal)' }
      ],
      returnToWork: '1-2 days for desk work, 3-7 days for physical work',
      returnToNormalActivities: '2-3 weeks',
      fullRecovery: '3-4 weeks'
    }
  },

  followUpCare: {
    appointments: [
      {
        timing: '1-2 weeks',
        purpose: 'Check wound healing'
      },
      {
        timing: '4-6 weeks (if needed)',
        purpose: 'Confirm complete healing'
      }
    ],
    selfMonitoring: [
      'Daily inspection of wound',
      'Monitor for signs of infection',
      'Note any unusual pain or discharge',
      'Watch for signs of recurrence'
    ],
    rehabilitationExercises: [
      'Gentle toe movements to maintain mobility',
      'Gradual increase in walking',
      'Return to sports when comfortable'
    ]
  },

  complianceRequirements: [
    {
      requirement: 'Daily salt water soaks',
      importance: 'Important for healing',
      frequency: 'Once daily for 2 weeks',
      consequences: 'Delayed healing, increased infection risk'
    },
    {
      requirement: 'Proper nail care going forward',
      importance: 'Critical for prevention',
      frequency: 'Every time nails are cut',
      consequences: 'Recurrence in remaining nail'
    },
    {
      requirement: 'Appropriate footwear',
      importance: 'Important for prevention',
      frequency: 'Always',
      consequences: 'Increased recurrence risk'
    }
  ],

  warningSigns: [
    'Increasing pain after 48 hours',
    'Spreading redness beyond the toe',
    'Pus or foul-smelling discharge',
    'Fever',
    'Red streaks extending up the foot',
    'Wound not healing after 2 weeks',
    'Numbness that persists'
  ],

  emergencySigns: [
    'Severe spreading infection (red streaking up leg)',
    'High fever with chills',
    'Severe pain not controlled by medication',
    'Signs of allergic reaction',
    'Heavy uncontrolled bleeding',
    'For diabetics: any sign of spreading infection'
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Foot Care',
      reference: 'WHO Diabetes Foot Care Guidelines',
      keyPoints: [
        'Importance of foot care in diabetics',
        'Prevention of foot complications',
        'Early treatment of nail problems'
      ]
    }
  ]
};

/**
 * Lipoma Removal
 */
export const lipomaRemoval: EducationCondition = {
  id: 'minor-lipoma-removal',
  name: 'Lipoma Removal',
  category: 'N',
  icdCode: 'D17.9',
  description: 'Lipoma removal is a minor surgical procedure to excise a lipoma - a benign (non-cancerous) fatty tumor that develops under the skin. The procedure is typically performed under local anesthesia as a day case.',
  alternateNames: ['Lipoma Excision', 'Fatty Tumor Removal', 'Lipoma Surgery', 'Benign Tumor Removal'],
  
  overview: {
    definition: 'A lipoma is a slow-growing, benign tumor made up of fat cells. It appears as a soft, rubbery lump under the skin that moves easily when pressed. Lipomas are usually painless and harmless but may be removed for cosmetic reasons, if they cause discomfort, or to confirm the diagnosis. Lipoma removal is a straightforward day case procedure performed under local anesthesia. The lipoma is removed through a small incision, and the wound is closed with sutures. Most patients go home immediately after and return to normal activities within days.',
    causes: [
      'Unknown exact cause',
      'Genetic predisposition (familial multiple lipomatosis)',
      'Minor injuries may trigger development',
      'Certain genetic conditions (Gardner syndrome, adiposis dolorosa)',
      'May be associated with high cholesterol (unproven)'
    ],
    symptoms: [
      'Soft, doughy lump under the skin',
      'Usually painless',
      'Easily moveable when pressed',
      'Slow-growing (may take years to reach noticeable size)',
      'Usually 2-10 cm in diameter',
      'Commonly found on neck, shoulders, back, arms, thighs',
      'Occasionally painful if pressing on nerves',
      'Cosmetic concern'
    ],
    riskFactors: [
      'Age 40-60 years (peak incidence)',
      'Family history of lipomas',
      'Genetic conditions (familial lipomatosis)',
      'Obesity (may make lipomas more noticeable)',
      'High cholesterol',
      'Diabetes'
    ],
    complications: [
      'Rare transformation to liposarcoma (<1%)',
      'Post-surgery: infection, bleeding, hematoma',
      'Seroma (fluid collection)',
      'Recurrence (rare if completely removed)',
      'Nerve damage if lipoma near nerves',
      'Scarring'
    ],
    prevalence: 'Lipomas are the most common benign soft tissue tumor, affecting approximately 1% of the population. They are slightly more common in men and peak between ages 40-60.',
    prognosis: 'Excellent. Complete surgical removal is curative with very low recurrence rates (<5%). Lipomas are benign and do not spread to other parts of the body.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Procedure Assessment',
      duration: 'At consultation',
      description: 'Clinical assessment to confirm diagnosis and plan surgery.',
      goals: [
        'Confirm lipoma diagnosis',
        'Rule out other conditions (liposarcoma, cyst, abscess)',
        'Assess size and location',
        'Determine if removal is needed/desired',
        'Plan surgical approach'
      ],
      activities: [
        'Physical examination',
        'Ultrasound if diagnosis uncertain',
        'MRI for deep or large lipomas',
        'Discuss procedure and alternatives',
        'Obtain informed consent'
      ],
      warningSignsThisPhase: [
        'Rapidly growing lump',
        'Hard or fixed mass',
        'Pain in the lump',
        'Features suggesting malignancy'
      ]
    },
    {
      phase: 2,
      name: 'Day of Procedure',
      duration: 'Same day (1-2 hours total visit)',
      description: 'Surgical excision of lipoma under local anesthesia.',
      goals: [
        'Complete removal of lipoma',
        'Minimize scarring',
        'Obtain tissue for histology',
        'Safe discharge home'
      ],
      activities: [
        'Arrive at facility',
        'Mark surgical site',
        'Administer local anesthesia',
        'Make incision over lipoma',
        'Shell out/excise lipoma completely',
        'Achieve hemostasis',
        'Close wound in layers',
        'Apply dressing',
        'Send specimen for histology',
        'Discharge with instructions'
      ],
      warningSignsThisPhase: [
        'Lipoma larger or deeper than expected',
        'Atypical appearance suggesting malignancy',
        'Excessive bleeding'
      ]
    },
    {
      phase: 3,
      name: 'Early Recovery',
      duration: 'Days 1-14',
      description: 'Wound healing and gradual return to activities.',
      goals: [
        'Wound healing',
        'Pain management',
        'Prevent complications',
        'Receive histology results'
      ],
      activities: [
        'Rest on day of procedure',
        'Keep wound clean and dry',
        'Take pain relief as needed',
        'Avoid strenuous activities',
        'Attend for histology results',
        'Watch for complications'
      ],
      medications: [
        {
          name: 'Paracetamol',
          purpose: 'Pain relief',
          duration: 'As needed for 3-5 days'
        },
        {
          name: 'Antibiotics (if prescribed)',
          purpose: 'Prevent/treat infection',
          duration: '5-7 days'
        }
      ],
      warningSignsThisPhase: [
        'Increasing pain or swelling',
        'Wound redness or discharge',
        'Fever',
        'Wound opening',
        'Fluid collection under wound'
      ]
    },
    {
      phase: 4,
      name: 'Full Recovery',
      duration: 'Weeks 2-6',
      description: 'Complete healing and return to all activities.',
      goals: [
        'Complete wound healing',
        'Scar maturation',
        'Return to all activities',
        'Confirm benign histology'
      ],
      activities: [
        'Suture removal at 10-14 days',
        'Gradual scar massage',
        'Sun protection for scar',
        'Return to all activities',
        'Final follow-up if needed'
      ],
      warningSignsThisPhase: [
        'Keloid or hypertrophic scar formation',
        'Persistent lump suggesting incomplete removal',
        'Histology showing unexpected findings'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General/Plastic Surgeon'
    ],
    investigations: [
      'Usually none required for small superficial lipomas',
      'Ultrasound for larger or uncertain lumps',
      'MRI for deep lipomas or suspected liposarcoma'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss with surgeon - may stop 5-7 days before',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Aspirin',
        instruction: 'may continue or stop per surgeon',
        reason: 'Balance bleeding vs cardiac risk'
      },
      {
        medication: 'Regular medications',
        instruction: 'continue as normal',
        reason: 'Maintain health'
      }
    ],
    dietaryRestrictions: [
      'No fasting required for local anesthesia',
      'Eat a light meal before procedure',
      'Stay hydrated'
    ],
    physicalPreparation: [
      'Shower on morning of procedure',
      'Wear loose, comfortable clothing',
      'Avoid lotions on the area',
      'Arrange transportation if lipoma is in area affecting driving'
    ],
    dayBeforeInstructions: [
      'Confirm appointment time',
      'Prepare comfortable clothes',
      'Get good rest'
    ],
    dayOfSurgeryInstructions: [
      'Eat a light breakfast',
      'Take regular medications',
      'Arrive on time',
      'Bring list of medications and allergies'
    ]
  },

  intraoperativeInfo: {
    procedureSteps: [
      'Mark surgical site with patient',
      'Clean and drape area',
      'Inject local anesthetic',
      'Make incision over lipoma (usually same length as lipoma diameter)',
      'Dissect around lipoma capsule',
      'Shell out lipoma in one piece',
      'Check for complete removal',
      'Achieve hemostasis',
      'Close wound in layers (deep and skin sutures)',
      'Apply dressing'
    ],
    anesthesiaType: 'Local anesthesia (lidocaine with epinephrine)',
    duration: '20-45 minutes depending on size and location',
    teamInvolved: [
      'Surgeon',
      'Nurse/Assistant',
      'Patient (awake during procedure)'
    ]
  },

  postoperativeInstructions: {
    immediatePostOp: [
      'Rest in recovery for 15-30 minutes',
      'Receive discharge instructions',
      'Collect any prescribed medications',
      'Schedule follow-up appointment'
    ],
    woundCare: {
      frequency: 'Daily from day 2',
      method: 'Keep dressing clean and dry. Can shower from day 2 but pat dry and apply new dressing.',
      products: [
        'Sterile gauze dressings',
        'Medical tape',
        'Antiseptic if prescribed'
      ],
      precautions: [
        'Keep wound dry for first 48 hours',
        'No soaking (baths, swimming) until wound healed',
        'Do not remove dressing until first change',
        'Do not apply unprescribed ointments'
      ]
    },
    activityRestrictions: {
      duration: '1-4 weeks depending on location',
      restrictions: [
        'Avoid strenuous activity for 1-2 weeks',
        'No heavy lifting for 2-4 weeks',
        'Return to desk work next day',
        'Return to physical work in 1-2 weeks',
        'Avoid stretching the wound area'
      ]
    },
    medications: [
      {
        name: 'Paracetamol 1g',
        dosage: '1g every 6 hours',
        frequency: 'As needed',
        duration: '3-5 days',
        sideEffects: 'Rare',
        instructions: 'Do not exceed 4g per day'
      },
      {
        name: 'Ibuprofen 400mg (optional)',
        dosage: '400mg with food',
        frequency: 'Every 8 hours',
        duration: '3-5 days',
        sideEffects: 'Take with food',
        instructions: 'Can use with paracetamol'
      }
    ],
    followUpSchedule: [
      {
        timing: '10-14 days',
        purpose: 'Suture removal, discuss histology results'
      },
      {
        timing: '4-6 weeks (if needed)',
        purpose: 'Check scar healing'
      }
    ]
  },

  expectedOutcomes: {
    immediateOutcomes: [
      'Lipoma completely removed',
      'Wound closed with sutures',
      'Mild pain and swelling (normal)',
      'Bruising around wound'
    ],
    shortTermOutcomes: [
      'Pain resolves in 2-3 days',
      'Swelling reduces over 1 week',
      'Sutures removed at 10-14 days',
      'Wound heals by 2 weeks'
    ],
    longTermOutcomes: [
      'Permanent removal of lipoma',
      'Linear scar (fades over time)',
      'Very low recurrence rate',
      'Benign histology confirmed'
    ],
    recoveryTimeline: {
      phases: [
        { day: '0', milestone: 'Procedure completed, go home same day' },
        { day: '1-2', milestone: 'Some discomfort, rest recommended' },
        { day: '3-5', milestone: 'Discomfort improving, normal light activities' },
        { day: '7', milestone: 'Most activities resumed, wound healing well' },
        { day: '10-14', milestone: 'Sutures removed, histology results' },
        { day: '28', milestone: 'Fully healed, all activities resumed' },
        { day: '90-365', milestone: 'Scar continues to mature and fade' }
      ],
      returnToWork: '1-2 days for desk work, 1-2 weeks for physical work',
      returnToNormalActivities: '1-2 weeks',
      fullRecovery: '4-6 weeks'
    }
  },

  followUpCare: {
    appointments: [
      {
        timing: '10-14 days',
        purpose: 'Suture removal and histology results'
      },
      {
        timing: '4-6 weeks (optional)',
        purpose: 'Final check if any concerns'
      }
    ],
    selfMonitoring: [
      'Daily wound inspection',
      'Monitor for infection signs',
      'Watch for fluid collection',
      'Note any concerns for follow-up'
    ],
    rehabilitationExercises: [
      'Gentle movement of affected area as comfort allows',
      'Scar massage from 2 weeks (when wound fully healed)',
      'Gradual return to exercise'
    ]
  },

  complianceRequirements: [
    {
      requirement: 'Keep wound clean and dry',
      importance: 'Critical for healing',
      frequency: 'Continuous for 2 weeks',
      consequences: 'Infection, wound breakdown'
    },
    {
      requirement: 'Avoid strenuous activity',
      importance: 'Important for healing',
      frequency: 'For 1-2 weeks',
      consequences: 'Hematoma, wound opening'
    },
    {
      requirement: 'Attend for histology results',
      importance: 'Critical for confirming diagnosis',
      frequency: 'Once at 10-14 days',
      consequences: 'Miss important diagnosis'
    }
  ],

  warningSigns: [
    'Increasing pain after first 48 hours',
    'Redness spreading from wound',
    'Discharge or pus from wound',
    'Fever',
    'Wound opening',
    'Increasing swelling (hematoma)',
    'Fluid leaking from wound (seroma)'
  ],

  emergencySigns: [
    'Severe spreading infection',
    'High fever with chills',
    'Heavy bleeding soaking through dressing',
    'Allergic reaction (breathing difficulty, swelling)',
    'Severe pain not controlled by medications'
  ],

  whoGuidelines: [
    {
      title: 'WHO Surgical Care Guidelines',
      reference: 'WHO Safe Surgery Guidelines',
      keyPoints: [
        'Safe surgical practices',
        'Infection prevention',
        'Proper wound care'
      ]
    }
  ]
};

// Export all minor procedures conditions
export const minorProceduresEducation: EducationCondition[] = [
  keloidExcision,
  ingrownToenail,
  lipomaRemoval
];
