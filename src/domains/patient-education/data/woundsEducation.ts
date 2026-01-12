/**
 * Patient Education Content - Category B: Wounds - Acute & Chronic
 * Part 1: Lacerations and Abrasions
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Evidence-Based Practice
 */

import type { EducationCondition } from '../types';

/**
 * Lacerations - Cuts and Tears in the Skin
 */
export const lacerations: EducationCondition = {
  id: 'laceration',
  name: 'Lacerations (Cuts and Tears)',
  category: 'B',
  icdCode: 'T14.1',
  description: 'A laceration is a wound produced by tearing of body tissue. Unlike an incision which has smooth edges, a laceration often has irregular, jagged edges caused by blunt trauma or sharp objects.',
  alternateNames: ['Cuts', 'Tears', 'Gashes', 'Wounds'],
  
  overview: {
    definition: 'A laceration is a tear or cut in the skin and underlying tissues caused by trauma. Lacerations can vary from superficial skin cuts to deep wounds involving muscles, tendons, nerves, and blood vessels. Proper treatment depends on the depth, location, contamination level, and time since injury.',
    causes: [
      'Sharp objects such as knives, broken glass, or metal edges',
      'Blunt force trauma causing skin to split over bones',
      'Falls onto rough or sharp surfaces',
      'Motor vehicle accidents',
      'Industrial or occupational accidents',
      'Animal bites or attacks',
      'Sports-related injuries',
      'Machinery accidents'
    ],
    symptoms: [
      'Bleeding from the wound - may be minimal or profuse depending on depth',
      'Pain at the site of injury',
      'Visible break in the skin with irregular or jagged edges',
      'Swelling around the wound',
      'Bruising in surrounding tissue',
      'Possible numbness if nerves are damaged',
      'Weakness or inability to move the affected area if tendons are cut',
      'Visible fat, muscle, or bone in deep lacerations'
    ],
    riskFactors: [
      'Occupations involving sharp tools or machinery',
      'Participating in contact sports',
      'Alcohol or drug intoxication affecting coordination',
      'Blood clotting disorders or anticoagulant medications',
      'Peripheral neuropathy reducing protective sensation',
      'Poor vision or balance issues in elderly',
      'Unsafe home or work environments'
    ],
    complications: [
      'Wound infection (cellulitis, abscess formation)',
      'Excessive bleeding requiring transfusion',
      'Nerve damage causing numbness or weakness',
      'Tendon injury affecting movement',
      'Scarring and keloid formation',
      'Tetanus if not properly immunized',
      'Delayed wound healing',
      'Chronic pain at the injury site'
    ],
    prevalence: 'Lacerations are one of the most common injuries treated in emergency departments worldwide, accounting for approximately 8-10% of all emergency visits. They affect all age groups but are most common in young males aged 15-44 years.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate First Aid',
      duration: 'First 30 minutes',
      description: 'The immediate priority is to control bleeding and prevent further contamination of the wound. This phase focuses on stabilization before definitive medical care.',
      goals: [
        'Stop or control bleeding',
        'Prevent wound contamination',
        'Assess severity of injury',
        'Seek appropriate medical care'
      ],
      activities: [
        'Apply direct pressure with clean cloth or bandage for at least 10-15 minutes',
        'Elevate the injured area above heart level if possible',
        'Do not remove objects embedded in the wound',
        'Cover wound with clean dressing once bleeding controlled',
        'Assess for numbness, weakness, or inability to move'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Bleeding that does not stop with 15 minutes of pressure',
        'Spurting or pulsating blood (arterial bleeding)',
        'Numbness or tingling beyond the wound',
        'Inability to move fingers or toes',
        'Signs of shock: pale, cold, sweaty skin'
      ]
    },
    {
      phase: 2,
      name: 'Medical Assessment and Wound Closure',
      duration: '1-6 hours from injury',
      description: 'Professional medical evaluation to determine wound depth, check for underlying damage, clean the wound properly, and close it using appropriate technique.',
      goals: [
        'Thorough wound assessment',
        'Proper wound irrigation and debridement',
        'Identify and address underlying injuries',
        'Achieve wound closure with good cosmetic outcome'
      ],
      activities: [
        'Complete wound examination including exploration for foreign bodies',
        'Assessment of nerve function (sensation) and tendon function (movement)',
        'Wound irrigation with sterile saline solution',
        'Removal of dead tissue and foreign material (debridement)',
        'Wound closure with sutures, staples, adhesive, or tape as appropriate',
        'Tetanus vaccination if needed'
      ],
      medications: [
        {
          name: 'Local Anesthetic (Lidocaine)',
          purpose: 'Numb the area for painless wound cleaning and closure',
          duration: '1-2 hours effect'
        },
        {
          name: 'Tetanus Toxoid',
          purpose: 'Prevent tetanus infection if vaccination not current',
          duration: 'Single dose'
        }
      ],
      warningSignsThisPhase: [
        'Discovery of tendon or nerve injury requiring surgical repair',
        'Wound too contaminated for primary closure',
        'Signs of infection already present'
      ]
    },
    {
      phase: 3,
      name: 'Early Healing Phase',
      duration: 'Days 1-7',
      description: 'The wound begins to heal through inflammation and early tissue formation. Focus is on keeping the wound clean, dry, and protected while monitoring for infection.',
      goals: [
        'Prevent wound infection',
        'Optimize conditions for healing',
        'Manage pain appropriately',
        'Recognize early signs of complications'
      ],
      activities: [
        'Keep wound dressing clean and dry',
        'Change dressings as instructed (usually daily or every other day)',
        'Take prescribed antibiotics if given',
        'Elevate the injured area to reduce swelling',
        'Avoid getting the wound wet for first 24-48 hours'
      ],
      medications: [
        {
          name: 'Paracetamol/Acetaminophen',
          purpose: 'Pain relief',
          duration: 'As needed for 5-7 days'
        },
        {
          name: 'Ibuprofen',
          purpose: 'Pain and inflammation relief',
          duration: 'As needed for 5-7 days'
        },
        {
          name: 'Antibiotics (if prescribed)',
          purpose: 'Prevent or treat wound infection',
          duration: '5-7 days typically'
        }
      ],
      warningSignsThisPhase: [
        'Increasing redness spreading from wound edges',
        'Pus or foul-smelling discharge',
        'Fever above 38°C (100.4°F)',
        'Increasing pain after initial improvement',
        'Red streaks extending from wound'
      ]
    },
    {
      phase: 4,
      name: 'Suture Removal and Continued Healing',
      duration: 'Days 5-14',
      description: 'Sutures or staples are removed once wound edges have joined sufficiently. The wound continues to strengthen and mature.',
      goals: [
        'Remove sutures at appropriate time',
        'Confirm wound healing progression',
        'Begin scar management if appropriate',
        'Resume normal activities gradually'
      ],
      activities: [
        'Attend appointment for suture/staple removal',
        'Apply scar cream or silicone sheets if recommended',
        'Begin gentle range of motion exercises',
        'Protect healing wound from sun exposure',
        'Gradually increase activity as tolerated'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Wound reopening after suture removal',
        'Delayed healing with persistent scab',
        'Excessive scar formation'
      ]
    },
    {
      phase: 5,
      name: 'Scar Maturation',
      duration: '2 weeks to 18 months',
      description: 'The scar continues to remodel and fade over time. Scar management techniques can optimize final appearance.',
      goals: [
        'Minimize scar visibility',
        'Restore full function',
        'Address any persistent issues',
        'Complete recovery'
      ],
      activities: [
        'Massage scar daily once fully healed',
        'Use silicone-based scar products',
        'Apply sunscreen to scar (SPF 30+)',
        'Consider scar revision if necessary after 12-18 months',
        'Resume all normal activities'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Keloid or hypertrophic scar formation',
        'Persistent pain or itching',
        'Functional limitations from scar contracture'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Emergency department or urgent care evaluation for acute lacerations',
      'Plastic surgeon for facial lacerations or complex wounds',
      'Hand surgeon for lacerations involving tendons or nerves',
      'Vascular surgeon if major blood vessel injury suspected'
    ],
    investigations: [
      'X-ray if foreign body suspected (glass, metal fragments)',
      'Wound exploration under anesthesia for deep wounds',
      'Doppler ultrasound if blood vessel injury suspected',
      'Blood tests for clotting function if excessive bleeding'
    ],
    medications: [
      {
        medication: 'Blood thinners (Warfarin, Aspirin)',
        instruction: 'discuss',
        reason: 'May increase bleeding - doctor will assess risks and benefits'
      },
      {
        medication: 'Diabetes medications',
        instruction: 'continue',
        reason: 'Good blood sugar control aids healing'
      }
    ],
    dayBeforeSurgery: [
      'For scheduled wound repair, shower and clean the area gently',
      'Do not eat or drink for 6 hours if general anesthesia planned',
      'Arrange transportation home after the procedure',
      'Prepare a clean, comfortable recovery area at home'
    ],
    dayOfSurgery: [
      'Wear loose, comfortable clothing that is easy to remove',
      'Bring list of all current medications',
      'Inform medical team of any allergies',
      'Expect to spend 1-3 hours for assessment and repair'
    ],
    whatToBring: [
      'Insurance and identification documents',
      'List of current medications and allergies',
      'Comfortable loose clothing',
      'Someone to drive you home'
    ],
    fastingInstructions: 'For minor laceration repair under local anesthesia, no fasting required. For larger procedures requiring sedation or general anesthesia, no food for 6 hours and clear fluids only up to 2 hours before.'
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia (injection to numb the area) for most lacerations. Regional block or general anesthesia for complex repairs.',
    procedureSteps: [
      'Wound is thoroughly irrigated with sterile saline',
      'Dead or damaged tissue is removed (debridement)',
      'Wound is explored for foreign bodies and deep injuries',
      'Bleeding vessels are identified and controlled',
      'Deep tissues are closed in layers if needed',
      'Skin is closed with sutures, staples, or adhesive',
      'Sterile dressing is applied'
    ],
    duration: '30 minutes to 2 hours depending on complexity',
    whatToExpect: 'You will feel pressure but not pain during the procedure. The area will be numb from local anesthesia. You may hear the medical team discussing the wound. The procedure is usually straightforward.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate the injured limb above heart level when resting to reduce swelling',
      expectedSymptoms: [
        'Numbness in the area for 2-4 hours as anesthesia wears off',
        'Mild to moderate pain once anesthesia wears off',
        'Some swelling and bruising around the wound',
        'Slight oozing from the wound in first 24 hours'
      ],
      painManagement: 'Take paracetamol or prescribed pain medication before the numbness wears off',
      activityLevel: 'Rest and limit use of the injured area for first 24-48 hours'
    },
    woundCare: [
      {
        day: 'First 24-48 hours',
        instruction: 'Keep dressing clean and dry. Do not remove the initial dressing unless instructed.'
      },
      {
        day: 'Days 2-3',
        instruction: 'You may shower briefly but keep wound dry or covered with waterproof dressing.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Change dressing daily after gentle cleaning with clean water or saline.'
      },
      {
        day: 'After suture removal',
        instruction: 'Keep wound clean. Apply petroleum jelly and bandage for another week.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) for first 2-3 days, then gradually decreasing',
      medications: [
        'Paracetamol 1000mg every 6 hours as needed',
        'Ibuprofen 400mg every 8 hours with food if no contraindication',
        'Stronger painkillers may be prescribed for severe wounds'
      ],
      nonPharmacological: [
        'Ice packs wrapped in cloth, 15-20 minutes every few hours',
        'Elevation of injured area',
        'Rest and immobilization'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '2-4 weeks depending on wound location',
        reason: 'Strain can reopen the wound'
      },
      {
        activity: 'Swimming/bathing',
        restriction: 'Avoid immersing wound',
        duration: 'Until sutures removed and wound healed',
        reason: 'Risk of infection from water exposure'
      },
      {
        activity: 'Sports',
        restriction: 'Avoid contact and strenuous activity',
        duration: '2-6 weeks depending on wound',
        reason: 'Risk of wound reopening or reinjury'
      }
    ],
    dietaryGuidelines: [
      'Eat a balanced diet rich in protein for tissue healing (meat, fish, eggs, legumes)',
      'Include vitamin C from fruits and vegetables to support collagen formation',
      'Ensure adequate zinc from nuts, seeds, and whole grains',
      'Stay well hydrated - aim for 8 glasses of water daily',
      'Avoid excessive alcohol as it impairs healing'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Pain and swelling peak, then begin to improve'
      },
      {
        timeframe: '1 week',
        expectation: 'Wound edges joined, initial healing complete, sutures may be removed'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Wound closed, mild residual tenderness, can resume most activities'
      }
    ],
    longTerm: [
      {
        timeframe: '1-3 months',
        expectation: 'Scar is firm and may be red or raised, gradually softening'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Scar fades to pink or white, becomes flatter and less noticeable'
      },
      {
        timeframe: '12-18 months',
        expectation: 'Final scar appearance achieved, maximum strength restored'
      }
    ],
    functionalRecovery: 'Most simple lacerations heal completely with full return of function within 2-4 weeks. Lacerations involving tendons or nerves may require longer rehabilitation.',
    cosmeticOutcome: 'Scars fade significantly over 12-18 months. Final appearance depends on wound location, closure technique, and individual healing. Facial wounds typically heal with excellent cosmetic results.',
    successRate: 'Primary closure success rate exceeds 95% for clean lacerations treated within 6-12 hours. Infection rates are less than 5% with proper wound care.'
  },

  followUpCare: {
    schedule: [
      {
        timing: '24-48 hours',
        purpose: 'Wound check for signs of infection or problems (may be telephone consultation)'
      },
      {
        timing: '5-7 days (face/neck)',
        purpose: 'Suture removal for facial wounds'
      },
      {
        timing: '7-10 days (body/arms)',
        purpose: 'Suture removal for trunk and upper limb wounds'
      },
      {
        timing: '10-14 days (legs/joints)',
        purpose: 'Suture removal for lower limb and over-joint wounds'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Final check, scar assessment, return to full activities'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy if wound involves joints or affects mobility',
      'Hand therapy for lacerations involving tendons',
      'Scar massage techniques once wound fully healed'
    ],
    lifestyleModifications: [
      'Protect wound from sun exposure to minimize scar darkening',
      'Avoid smoking as it impairs wound healing',
      'Maintain good nutrition to support healing'
    ]
  },

  warningSigns: [
    'Increasing pain or swelling after the first 48 hours',
    'Redness spreading beyond wound edges',
    'Pus or cloudy discharge from the wound',
    'Fever or feeling unwell',
    'Wound edges separating',
    'Numbness or weakness that was not present initially',
    'Foul smell from the wound',
    'Excessive bleeding soaking through dressings'
  ],

  emergencySigns: [
    'Heavy uncontrolled bleeding',
    'Signs of severe infection: high fever, confusion, rapid heartbeat',
    'Red streaks spreading from wound toward heart',
    'Complete loss of sensation or movement in affected limb',
    'Signs of allergic reaction to medications: difficulty breathing, swelling of face/throat'
  ],

  complianceRequirements: [
    {
      requirement: 'Keep wound clean and dry',
      importance: 'critical',
      consequence: 'Wound infection can occur, potentially requiring antibiotics or reopening the wound'
    },
    {
      requirement: 'Complete full course of antibiotics if prescribed',
      importance: 'critical',
      consequence: 'Incomplete treatment can lead to antibiotic-resistant infection'
    },
    {
      requirement: 'Attend follow-up for suture removal',
      importance: 'critical',
      consequence: 'Sutures left too long cause scarring; removed too early, wound may reopen'
    },
    {
      requirement: 'Avoid strenuous activity',
      importance: 'important',
      consequence: 'Wound may reopen or heal poorly'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Basic Emergency Care',
      reference: 'WHO-BEC 2018',
      keyPoints: [
        'Apply direct pressure to control bleeding',
        'Clean wounds with copious clean water or saline',
        'All wounds should be assessed for tetanus prophylaxis needs',
        'Wounds older than 6-12 hours may require delayed closure'
      ]
    },
    {
      title: 'WHO Surgical Safety Checklist',
      reference: 'WHO-SSC 2009',
      keyPoints: [
        'Confirm patient identity and procedure',
        'Check for known allergies',
        'Ensure appropriate equipment available',
        'Maintain sterile technique during repair'
      ]
    }
  ]
};

/**
 * Abrasions - Grazes and Scrapes
 */
export const abrasions: EducationCondition = {
  id: 'abrasion',
  name: 'Abrasions (Grazes and Scrapes)',
  category: 'B',
  icdCode: 'T14.0',
  description: 'An abrasion is a superficial wound where the top layer of skin (epidermis) is scraped or worn away by friction against a rough surface. Also known as a graze or scrape.',
  alternateNames: ['Graze', 'Scrape', 'Road Rash', 'Friction Burn', 'Carpet Burn'],
  
  overview: {
    definition: 'An abrasion is a type of wound caused by friction or scraping of the skin against a rough surface. Unlike cuts which penetrate through the skin layers, abrasions typically affect only the superficial skin layers. Despite being superficial, abrasions can be very painful because they expose nerve endings in the skin.',
    causes: [
      'Falls onto rough surfaces (concrete, gravel, asphalt)',
      'Road traffic accidents (road rash)',
      'Sports injuries, especially contact sports',
      'Friction against ropes, carpets, or synthetic surfaces',
      'Bicycle accidents',
      'Playground injuries in children',
      'Slipping and sliding on rough ground'
    ],
    symptoms: [
      'Raw, red, or pink area where skin has been removed',
      'Pain and tenderness - often more painful than deeper cuts',
      'Minor bleeding or oozing of clear fluid',
      'Swelling around the affected area',
      'Dirt or debris embedded in the wound',
      'Scab formation as healing begins',
      'Burning or stinging sensation'
    ],
    riskFactors: [
      'Cycling, skateboarding, or rollerblading without protective gear',
      'Participation in contact sports',
      'Working with rough materials without gloves',
      'Falls due to poor balance or mobility issues',
      'Thin or fragile skin in elderly patients'
    ],
    complications: [
      'Wound infection, especially if debris remains',
      'Traumatic tattooing (permanent discoloration from embedded debris)',
      'Scarring and pigmentation changes',
      'Allergic reactions to wound care products',
      'Delayed healing in certain skin areas'
    ],
    prevalence: 'Abrasions are extremely common injuries, particularly in children and athletes. They account for a significant proportion of minor injuries treated in emergency departments and clinics.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate First Aid',
      duration: 'First 30 minutes',
      description: 'Initial wound cleaning is critical for abrasions to remove debris and prevent traumatic tattooing. Thorough cleaning immediately after injury produces the best outcomes.',
      goals: [
        'Stop any bleeding',
        'Remove debris and contaminants',
        'Prevent infection',
        'Protect the wound'
      ],
      activities: [
        'Wash hands thoroughly before touching the wound',
        'Rinse wound under clean running water for several minutes',
        'Gently remove visible debris with clean tweezers',
        'Apply gentle pressure with clean cloth if bleeding',
        'Pat dry and apply clean dressing'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Deep abrasion with visible fat or muscle',
        'Uncontrollable bleeding',
        'Large amounts of embedded debris',
        'Abrasion over a joint limiting movement'
      ]
    },
    {
      phase: 2,
      name: 'Wound Cleaning and Assessment',
      duration: 'First 6 hours',
      description: 'Thorough wound cleaning to remove all debris. Medical attention may be needed for large abrasions, heavily contaminated wounds, or abrasions with embedded debris.',
      goals: [
        'Complete debris removal',
        'Assess need for professional cleaning',
        'Determine tetanus prophylaxis needs',
        'Establish wound care plan'
      ],
      activities: [
        'Scrub wound gently with soft brush and soap if tolerated',
        'Remove all visible dirt particles',
        'Apply antiseptic solution',
        'Cover with non-adherent dressing',
        'Seek medical care if debris cannot be removed'
      ],
      medications: [
        {
          name: 'Antiseptic Solution',
          purpose: 'Kill bacteria and prevent infection',
          duration: 'During initial cleaning'
        }
      ],
      warningSignsThisPhase: [
        'Debris deeply embedded requiring surgical removal',
        'Signs of significant contamination',
        'Wound involvement of face or sensitive areas'
      ]
    },
    {
      phase: 3,
      name: 'Active Healing Phase',
      duration: 'Days 1-14',
      description: 'The wound heals from the edges inward and from the base upward. New skin gradually covers the abraded area. Proper wound care accelerates this process.',
      goals: [
        'Maintain moist wound environment',
        'Prevent infection',
        'Minimize scarring',
        'Manage pain'
      ],
      activities: [
        'Change dressings daily or when soiled',
        'Keep wound moist with petroleum jelly or wound gel',
        'Avoid picking at scabs',
        'Protect from sun exposure',
        'Monitor for signs of infection'
      ],
      medications: [
        {
          name: 'Petroleum Jelly',
          purpose: 'Maintain moist healing environment',
          duration: 'Throughout healing phase'
        },
        {
          name: 'Paracetamol',
          purpose: 'Pain relief if needed',
          duration: 'First few days as needed'
        }
      ],
      warningSignsThisPhase: [
        'Increasing redness beyond wound edges',
        'Pus or yellow discharge',
        'Fever',
        'Wound not healing after 2 weeks'
      ]
    },
    {
      phase: 4,
      name: 'Re-epithelialization and Scar Maturation',
      duration: '2 weeks to 6 months',
      description: 'New skin covers the wound and gradually matures. The new skin is initially pink or red and slowly returns to normal color.',
      goals: [
        'Complete skin coverage',
        'Minimize pigmentation changes',
        'Achieve best cosmetic outcome',
        'Full return to activities'
      ],
      activities: [
        'Protect new skin from sun with SPF 30+ sunscreen',
        'Moisturize healed area regularly',
        'Massage healed area to prevent scar tightness',
        'Resume normal activities as tolerated'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Persistent redness or raised scarring',
        'Darkening of healed skin (hyperpigmentation)',
        'Itching or sensitivity that does not improve'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Emergency department for large or heavily contaminated abrasions',
      'Dermatologist if significant debris is embedded',
      'Plastic surgeon for abrasions on face or cosmetically sensitive areas'
    ],
    investigations: [
      'X-ray if metallic debris suspected',
      'Wound culture if infection is present'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'continue',
        reason: 'Abrasions rarely cause significant bleeding'
      }
    ],
    dayBeforeSurgery: [
      'For planned debridement procedures, follow fasting instructions',
      'Shower and gently clean the surrounding skin'
    ],
    dayOfSurgery: [
      'Wear comfortable loose clothing',
      'Bring current dressings and wound care supplies'
    ],
    whatToBring: [
      'Identification and insurance documents',
      'List of allergies and medications'
    ],
    fastingInstructions: 'No fasting required for bedside wound cleaning. For operating room debridement under sedation, fast for 6 hours.'
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia or topical anesthetic gel for painful wound cleaning. General anesthesia only for extensive wounds requiring surgical debridement.',
    procedureSteps: [
      'Wound is numbed with local anesthetic',
      'Wound is irrigated with large volumes of saline',
      'Debris is removed with scrubbing or surgical instruments',
      'Non-viable tissue is removed',
      'Wound is dressed with appropriate dressing'
    ],
    duration: '15-60 minutes depending on wound size and contamination',
    whatToExpect: 'Wound cleaning can be uncomfortable despite anesthesia. You may feel pressure and scrubbing sensation. The goal is to remove all debris to prevent permanent discoloration.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate affected area if on limb to reduce swelling',
      expectedSymptoms: [
        'Mild pain and discomfort at wound site',
        'Oozing of clear or slightly blood-tinged fluid',
        'Some swelling around the wound',
        'Feeling of tightness as healing begins'
      ],
      painManagement: 'Over-the-counter pain relievers usually sufficient',
      activityLevel: 'Light activities; avoid activities that cause friction to the wound'
    },
    woundCare: [
      {
        day: 'Day 1',
        instruction: 'Keep initial dressing in place. Expect some oozing through dressing.'
      },
      {
        day: 'Days 2-7',
        instruction: 'Change dressing daily. Clean gently with water, apply petroleum jelly, cover with non-stick dressing.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Continue daily dressing changes until wound is covered with new skin.'
      },
      {
        day: 'After re-epithelialization',
        instruction: 'Moisturize area and protect from sun. No dressing needed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (2-5/10), particularly painful when dressings changed',
      medications: [
        'Paracetamol 500-1000mg every 6 hours as needed',
        'Ibuprofen 200-400mg every 8 hours with food',
        'Topical anesthetic gel before dressing changes if needed'
      ],
      nonPharmacological: [
        'Soak dressing with water before removal to reduce pain',
        'Cool compresses for pain relief',
        'Distraction techniques during dressing changes'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Activities causing friction to wound',
        restriction: 'Avoid',
        duration: 'Until wound healed',
        reason: 'Friction can damage new skin and delay healing'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: 'Until wound fully healed',
        reason: 'Risk of infection from water'
      }
    ],
    dietaryGuidelines: [
      'Maintain balanced diet to support healing',
      'Adequate protein intake for tissue repair',
      'Stay hydrated',
      'Vitamin C from fruits and vegetables'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Pain improves, scab or healing membrane forms'
      },
      {
        timeframe: '1 week',
        expectation: 'New skin begins to grow from edges, wound smaller'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Most abrasions completely covered with new skin'
      }
    ],
    longTerm: [
      {
        timeframe: '1 month',
        expectation: 'New skin is pink, slightly different from surrounding skin'
      },
      {
        timeframe: '3-6 months',
        expectation: 'Skin color gradually normalizes'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Minimal or no visible difference from surrounding skin'
      }
    ],
    functionalRecovery: 'Full recovery expected within 2-4 weeks for most abrasions. No long-term functional limitations.',
    cosmeticOutcome: 'Most abrasions heal with excellent cosmetic results if debris is completely removed and wound is kept moist during healing. Sun protection is essential to prevent permanent pigmentation changes.',
    successRate: 'Near 100% healing rate for properly treated abrasions. Risk of traumatic tattooing is minimized with thorough initial cleaning.'
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 days',
        purpose: 'Check for proper healing and absence of infection (may be self-assessment)'
      },
      {
        timing: '1 week',
        purpose: 'Confirm healing progressing, assess for complications'
      },
      {
        timing: '2-4 weeks',
        purpose: 'Confirm complete healing, provide scar care advice'
      }
    ],
    rehabilitationNeeds: [
      'Usually none required',
      'May need physical therapy if abrasion is over a joint and causes stiffness'
    ],
    lifestyleModifications: [
      'Wear protective gear during sports and cycling',
      'Use sunscreen on healed areas for 6-12 months',
      'Maintain skin hydration'
    ]
  },

  warningSigns: [
    'Increasing pain after first 48 hours',
    'Redness spreading beyond wound edges',
    'Pus or yellow-green discharge',
    'Fever or feeling unwell',
    'Wound not showing improvement after 1 week',
    'Dark particles visible in healing wound (traumatic tattooing)'
  ],

  emergencySigns: [
    'High fever with wound infection signs',
    'Red streaks spreading from wound',
    'Severe swelling and pain',
    'Signs of allergic reaction to wound care products'
  ],

  complianceRequirements: [
    {
      requirement: 'Keep wound moist with petroleum jelly',
      importance: 'important',
      consequence: 'Dry wounds heal slower and scar more'
    },
    {
      requirement: 'Remove all debris during initial cleaning',
      importance: 'critical',
      consequence: 'Debris left in wound causes permanent discoloration (traumatic tattooing)'
    },
    {
      requirement: 'Protect healed skin from sun',
      importance: 'important',
      consequence: 'Sun exposure causes darkening of healed skin that may be permanent'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Basic Wound Care',
      reference: 'WHO-BWC 2018',
      keyPoints: [
        'Clean wounds with clean water thoroughly',
        'Remove all foreign material from wounds',
        'Keep wounds covered and moist for optimal healing',
        'Assess tetanus immunization status'
      ]
    }
  ]
};

// Export all wounds conditions
export const woundsEducationPart1 = [lacerations, abrasions];
