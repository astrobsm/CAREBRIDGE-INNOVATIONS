/**
 * Patient Education Content - Category B: Wounds - Acute & Chronic
 * Part 2: Surgical Wounds and Puncture Wounds
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Evidence-Based Practice
 */

import type { EducationCondition } from '../types';

/**
 * Surgical Wound Care
 */
export const surgicalWounds: EducationCondition = {
  id: 'surgical-wound',
  name: 'Surgical Wounds and Incisions',
  category: 'B',
  icdCode: 'T81.4',
  description: 'A surgical wound is a cut or incision made by a surgeon during an operation. Proper care of surgical wounds is essential for healing and preventing complications.',
  alternateNames: ['Operative Wound', 'Surgical Incision', 'Post-Surgical Wound'],
  
  overview: {
    definition: 'A surgical wound is a controlled injury made by a surgeon during an operative procedure. These wounds are classified as clean, clean-contaminated, contaminated, or dirty depending on the type of surgery and infection risk. Understanding how to care for your surgical wound is essential for proper healing.',
    causes: [
      'Planned surgical procedures (elective surgery)',
      'Emergency surgical operations',
      'Minimally invasive (laparoscopic) surgery',
      'Open surgical procedures',
      'Biopsy and diagnostic procedures',
      'Reconstructive surgery'
    ],
    symptoms: [
      'Clean incision line closed with sutures, staples, or adhesive',
      'Normal mild swelling around the incision',
      'Bruising around the surgical site',
      'Mild to moderate pain at the incision site',
      'Slight redness at wound edges (normal healing)',
      'Clear or slightly blood-tinged drainage for first 24-48 hours',
      'Numbness around the incision (normal, resolves over months)'
    ],
    riskFactors: [
      'Diabetes or high blood sugar',
      'Obesity',
      'Smoking',
      'Poor nutrition',
      'Immunosuppression (steroids, chemotherapy)',
      'Previous radiation to the surgical area',
      'Advanced age',
      'Emergency versus elective surgery',
      'Contaminated surgery (bowel, abscess drainage)'
    ],
    complications: [
      'Surgical site infection (SSI)',
      'Wound dehiscence (wound opening)',
      'Seroma (fluid collection under skin)',
      'Hematoma (blood collection)',
      'Incisional hernia',
      'Hypertrophic or keloid scarring',
      'Chronic wound pain'
    ],
    prevalence: 'Millions of surgical procedures are performed worldwide each year. Surgical site infections occur in 2-5% of patients undergoing surgery, making proper wound care critically important.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate Post-Operative Phase',
      duration: 'First 24-48 hours',
      description: 'The surgical wound is covered with a sterile dressing applied in the operating room. The focus is on rest, pain control, and early identification of any complications.',
      goals: [
        'Maintain sterile dressing protection',
        'Control post-operative pain',
        'Monitor for early complications',
        'Begin gentle mobilization as directed'
      ],
      activities: [
        'Keep surgical dressing clean, dry, and intact',
        'Take pain medications as prescribed',
        'Rest but perform gentle movements as instructed',
        'Report any excessive bleeding or drainage',
        'Monitor temperature for fever'
      ],
      medications: [
        {
          name: 'Prescribed Pain Medications',
          purpose: 'Control post-operative pain',
          duration: 'First 3-7 days typically'
        },
        {
          name: 'Prophylactic Antibiotics',
          purpose: 'Prevent surgical site infection',
          duration: 'Usually completed in hospital'
        }
      ],
      warningSignsThisPhase: [
        'Heavy bleeding soaking through dressing',
        'Fever above 38°C (100.4°F)',
        'Severe pain not relieved by medication',
        'Breathing difficulties',
        'Wound opening'
      ]
    },
    {
      phase: 2,
      name: 'Early Healing Phase',
      duration: 'Days 2-7',
      description: 'The wound edges begin to join together. Inflammation peaks and then subsides. First dressing change usually occurs in this phase.',
      goals: [
        'Prevent wound infection',
        'Allow wound edges to unite',
        'Manage swelling and bruising',
        'Begin gradual return to activities'
      ],
      activities: [
        'First dressing change as instructed (usually day 2-3)',
        'Shower may be permitted - keep wound dry or use waterproof dressing',
        'Avoid baths, pools, or hot tubs',
        'Continue pain management as needed',
        'Begin walking and light activities as permitted'
      ],
      medications: [
        {
          name: 'Paracetamol',
          purpose: 'Pain relief as strong medications are weaned',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Increasing redness, warmth, or swelling',
        'Cloudy or foul-smelling drainage',
        'Wound edges separating',
        'Fever or chills'
      ]
    },
    {
      phase: 3,
      name: 'Proliferative Phase',
      duration: 'Days 7-21',
      description: 'New tissue forms to fill and close the wound. Sutures or staples are typically removed during this phase. The wound gains strength.',
      goals: [
        'Remove sutures/staples at appropriate time',
        'Support ongoing healing',
        'Gradually increase activity level',
        'Begin scar management'
      ],
      activities: [
        'Attend appointment for suture/staple removal',
        'Apply scar care products as recommended',
        'Protect wound from sun exposure',
        'Continue activity restrictions for internal healing',
        'Gradually return to normal activities'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Wound opens after suture removal',
        'Late infection signs',
        'Fluid collection under skin',
        'Increasing pain after initial improvement'
      ]
    },
    {
      phase: 4,
      name: 'Remodeling and Maturation',
      duration: '3 weeks to 2 years',
      description: 'The scar tissue matures and becomes stronger. The scar gradually fades and softens. Final wound strength achieved.',
      goals: [
        'Optimize scar appearance',
        'Restore full function',
        'Return to all normal activities',
        'Address any long-term concerns'
      ],
      activities: [
        'Massage scar once fully healed (after 3-4 weeks)',
        'Use silicone scar products if recommended',
        'Apply sunscreen to scar (SPF 30+)',
        'Full return to activities including exercise',
        'Follow up for any concerns'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Keloid or excessive scar formation',
        'Incisional hernia (bulge at incision site)',
        'Chronic pain at scar site'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pre-operative assessment with surgeon',
      'Anesthesia evaluation',
      'Medical clearance if required for existing conditions',
      'Nutritional assessment if malnourished'
    ],
    investigations: [
      'Blood tests as ordered (full blood count, kidney function, clotting)',
      'Chest X-ray if indicated',
      'ECG for cardiac assessment',
      'MRSA screening swab if required by hospital'
    ],
    medications: [
      {
        medication: 'Blood thinners (Warfarin, Clopidogrel)',
        instruction: 'stop',
        reason: 'Increase bleeding risk - stop as directed by surgeon (usually 5-7 days before)'
      },
      {
        medication: 'Aspirin',
        instruction: 'discuss',
        reason: 'May need to stop depending on surgery type and cardiac history'
      },
      {
        medication: 'Diabetes medications',
        instruction: 'discuss',
        reason: 'May need adjustment on surgery day - follow specific instructions'
      },
      {
        medication: 'Blood pressure medications',
        instruction: 'continue',
        reason: 'Usually continue with sip of water on morning of surgery'
      },
      {
        medication: 'Herbal supplements',
        instruction: 'stop',
        reason: 'Many increase bleeding or interact with anesthesia - stop 2 weeks before'
      }
    ],
    dayBeforeSurgery: [
      'Shower with antiseptic soap if provided',
      'Do not shave the surgical area yourself',
      'Prepare your home for recovery (easy meals, help arranged)',
      'Stop eating and drinking at midnight unless otherwise instructed',
      'Pack bag for hospital stay if applicable'
    ],
    dayOfSurgery: [
      'Shower with antiseptic soap',
      'Do not apply lotions, deodorant, or makeup to surgical area',
      'Wear comfortable loose clothing',
      'Remove jewelry and leave valuables at home',
      'Bring list of medications and allergies',
      'Arrive at designated time'
    ],
    whatToBring: [
      'Photo ID and insurance documents',
      'List of current medications and allergies',
      'Comfortable loose clothing for discharge',
      'Walking aids if normally used',
      'CPAP machine if used for sleep apnea'
    ],
    fastingInstructions: 'No food for 6 hours and no clear fluids for 2 hours before scheduled surgery time. Follow specific instructions given by your surgical team.'
  },

  intraoperativeInfo: {
    anesthesiaType: 'Depends on surgery type: local anesthesia, regional anesthesia (spinal/epidural), or general anesthesia. Your anesthetist will discuss the best option.',
    procedureSteps: [
      'Surgical site is cleaned and draped',
      'Anesthesia is administered',
      'Surgical incision is made',
      'Procedure is performed',
      'Bleeding is controlled',
      'Wound is closed in layers',
      'Sterile dressing is applied'
    ],
    duration: 'Varies from 30 minutes to several hours depending on procedure',
    whatToExpect: 'You will be monitored throughout. For general anesthesia, you will sleep through the procedure. For regional anesthesia, you will be awake but feel no pain. Local anesthesia involves numbing only the surgical area.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Follow specific positioning instructions for your surgery. Generally, slight elevation of the surgical site helps reduce swelling.',
      expectedSymptoms: [
        'Pain at the surgical site (managed with medications)',
        'Swelling and bruising around the incision',
        'Numbness around the incision from cut nerves',
        'Drowsiness from anesthesia',
        'Mild nausea',
        'Slight drainage from wound (first 24-48 hours)'
      ],
      painManagement: 'Take pain medications as prescribed. Do not wait for severe pain - take medications regularly in first 48-72 hours.',
      activityLevel: 'Rest but move as instructed. Early mobilization helps prevent blood clots and speeds recovery.'
    },
    woundCare: [
      {
        day: 'First 24-48 hours',
        instruction: 'Leave original dressing in place. Keep clean and dry.'
      },
      {
        day: 'Days 2-3',
        instruction: 'First dressing change as instructed. May shower briefly - pat wound dry gently.'
      },
      {
        day: 'Days 3-14',
        instruction: 'Daily dressing changes or leave open if wound dry. Keep wound clean and dry.'
      },
      {
        day: 'After suture removal',
        instruction: 'Keep area clean. Apply silicone scar products if recommended.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (5-8/10) initially, decreasing to mild (2-4/10) by day 5-7',
      medications: [
        'Strong pain medications (opioids) for first 3-5 days as prescribed',
        'Paracetamol 1000mg every 6 hours regularly',
        'Ibuprofen 400mg every 8 hours with food (if approved by surgeon)',
        'Gradually reduce to over-the-counter medications'
      ],
      nonPharmacological: [
        'Ice packs for 15-20 minutes every few hours (first 48 hours)',
        'Elevation of surgical site',
        'Distraction techniques',
        'Gentle breathing exercises for relaxation'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Driving',
        restriction: 'Do not drive',
        duration: 'Until off strong pain medications and can brake safely (usually 1-2 weeks minimum)',
        reason: 'Impaired reaction time and judgment'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid lifting more than 2-5 kg',
        duration: '4-6 weeks typically',
        reason: 'Risk of wound dehiscence and hernia'
      },
      {
        activity: 'Strenuous exercise',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Allows internal healing and wound strength'
      },
      {
        activity: 'Swimming/bathing',
        restriction: 'No immersion of wound',
        duration: 'Until wound fully healed (usually 2-3 weeks)',
        reason: 'Risk of infection'
      },
      {
        activity: 'Sexual activity',
        restriction: 'Avoid',
        duration: '2-6 weeks depending on surgery',
        reason: 'Physical strain on healing tissues'
      }
    ],
    dietaryGuidelines: [
      'Start with clear fluids, advance diet as tolerated',
      'High protein diet to support healing (meat, fish, eggs, legumes)',
      'Plenty of fiber and fluids to prevent constipation (especially if taking opioids)',
      'Adequate vitamin C (citrus fruits, vegetables)',
      'Limit alcohol as it impairs healing and interacts with medications'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Pain managed with medications, up and walking short distances'
      },
      {
        timeframe: '1 week',
        expectation: 'Significant pain reduction, returning to light daily activities'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Sutures/staples removed, wound closed, minimal pain'
      }
    ],
    longTerm: [
      {
        timeframe: '4-6 weeks',
        expectation: 'Return to most normal activities, wound strength 50%'
      },
      {
        timeframe: '3 months',
        expectation: 'Full return to activities including exercise, wound strength 80%'
      },
      {
        timeframe: '1-2 years',
        expectation: 'Scar fully matured, maximum strength achieved, scar faded'
      }
    ],
    functionalRecovery: 'Depends on the type of surgery. Most patients return to full function within 6-12 weeks of major surgery.',
    cosmeticOutcome: 'Surgical scars fade significantly over 12-24 months. Final appearance depends on genetics, wound location, and scar care. Scars are usually thin white lines.',
    successRate: 'Surgical site infection rate is 2-5% overall. Proper wound care and following activity restrictions significantly reduce complication rates.'
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check and suture/staple removal'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Post-operative review, clearance for increased activities'
      },
      {
        timing: '3 months',
        purpose: 'Final outcome review, address any concerns'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy if surgery affected mobility',
      'Occupational therapy for hand or upper limb surgery',
      'Gradual return to exercise program'
    ],
    lifestyleModifications: [
      'Stop smoking for optimal healing',
      'Maintain healthy weight',
      'Control blood sugar if diabetic',
      'Sun protection for scar'
    ]
  },

  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Increasing redness, warmth, or swelling at wound',
    'Cloudy, colored, or foul-smelling wound drainage',
    'Wound edges separating',
    'Increasing pain after initial improvement',
    'Swelling, pain, or redness in legs (possible blood clot)'
  ],

  emergencySigns: [
    'Sudden severe pain',
    'Heavy bleeding from wound',
    'Wound completely opening with visible internal tissue',
    'High fever with confusion',
    'Chest pain or difficulty breathing (possible blood clot)',
    'Severe allergic reaction to medications'
  ],

  complianceRequirements: [
    {
      requirement: 'Take medications as prescribed',
      importance: 'critical',
      consequence: 'Poor pain control delays recovery; incomplete antibiotics cause resistant infection'
    },
    {
      requirement: 'Follow activity restrictions',
      importance: 'critical',
      consequence: 'Premature activity can cause wound opening or hernia'
    },
    {
      requirement: 'Keep wound clean and attend follow-up',
      importance: 'critical',
      consequence: 'Missed signs of infection can lead to serious complications'
    },
    {
      requirement: 'Stop smoking',
      importance: 'important',
      consequence: 'Smoking significantly increases infection and healing complication rates'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Global Guidelines for Surgical Site Infection Prevention',
      reference: 'WHO-SSI 2018',
      keyPoints: [
        'Preoperative bathing with antiseptic soap recommended',
        'Appropriate antibiotic prophylaxis timing',
        'Maintain normothermia during surgery',
        'Optimal blood glucose control perioperatively',
        'Use sterile technique for dressing changes'
      ]
    },
    {
      title: 'WHO Surgical Safety Checklist',
      reference: 'WHO-SSC 2009',
      keyPoints: [
        'Verify correct patient, site, and procedure',
        'Confirm allergies documented',
        'Ensure antibiotic prophylaxis given appropriately',
        'Count surgical instruments and materials'
      ]
    }
  ]
};

/**
 * Puncture Wounds
 */
export const punctureWounds: EducationCondition = {
  id: 'puncture-wound',
  name: 'Puncture Wounds',
  category: 'B',
  icdCode: 'T14.1',
  description: 'A puncture wound is a deep, narrow wound caused by a sharp pointed object penetrating the skin. Despite small surface appearance, puncture wounds carry high infection risk.',
  alternateNames: ['Penetrating Wound', 'Stab Wound', 'Nail Puncture', 'Bite Wound'],
  
  overview: {
    definition: 'A puncture wound occurs when a sharp, pointed object pierces the skin, creating a small entry hole that extends deep into the underlying tissues. Unlike cuts or scrapes, puncture wounds seal quickly at the surface, potentially trapping bacteria and debris inside. This makes them more prone to infection than other wound types.',
    causes: [
      'Stepping on nails or sharp objects',
      'Needle stick injuries',
      'Animal or human bites',
      'Splinters or thorns',
      'Fish hooks',
      'Glass fragments',
      'Industrial accidents with sharp tools',
      'Assault with sharp weapons'
    ],
    symptoms: [
      'Small entry wound that may look minor',
      'Bleeding that often stops quickly as wound seals',
      'Pain, especially with deep wounds',
      'Possible visible object in wound',
      'Swelling around the wound',
      'Later: redness, warmth, and discharge if infected',
      'Possible numbness if nerves injured'
    ],
    riskFactors: [
      'Walking barefoot outdoors or on construction sites',
      'Occupations involving sharp objects',
      'Diabetes or peripheral neuropathy',
      'Immunocompromised conditions',
      'Not up to date on tetanus vaccination',
      'Delay in seeking treatment'
    ],
    complications: [
      'Wound infection (cellulitis, abscess)',
      'Tetanus (if not immunized)',
      'Deep tissue abscess',
      'Osteomyelitis (bone infection) especially in foot punctures',
      'Retained foreign body',
      'Septic arthritis if joint penetrated',
      'Nerve or tendon damage'
    ],
    prevalence: 'Puncture wounds account for approximately 5% of wounds seen in emergency departments. Foot punctures are among the most common, particularly nail punctures through footwear.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Immediate First Aid',
      duration: 'First 30 minutes',
      description: 'Initial assessment and cleaning of the wound. Do not remove deeply embedded objects - this should be done by medical professionals.',
      goals: [
        'Control bleeding',
        'Prevent further contamination',
        'Safely remove superficial foreign bodies',
        'Assess severity and seek medical care'
      ],
      activities: [
        'Wash hands before touching wound',
        'Allow wound to bleed briefly to flush out debris',
        'Clean wound gently with water and mild soap',
        'Remove splinters near surface with clean tweezers',
        'Do NOT remove large or deeply embedded objects',
        'Apply clean bandage'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Heavy uncontrolled bleeding',
        'Deeply embedded object',
        'Wound in sensitive area (face, hands, joints, genitals)',
        'Signs of shock'
      ]
    },
    {
      phase: 2,
      name: 'Medical Evaluation',
      duration: 'Within 6-24 hours of injury',
      description: 'Professional assessment to evaluate wound depth, check for retained foreign body, clean thoroughly, and determine need for tetanus prophylaxis and antibiotics.',
      goals: [
        'Complete wound assessment',
        'Remove all foreign material',
        'Administer tetanus prophylaxis if needed',
        'Determine antibiotic need',
        'Plan follow-up care'
      ],
      activities: [
        'X-ray or ultrasound to check for foreign body',
        'Wound exploration and irrigation',
        'Foreign body removal',
        'Tetanus immunization',
        'Antibiotic prescription if indicated',
        'Wound dressing'
      ],
      medications: [
        {
          name: 'Tetanus Toxoid/Immunoglobulin',
          purpose: 'Prevent tetanus infection',
          duration: 'Single dose at time of injury'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent or treat infection (especially for foot punctures, bites)',
          duration: '5-10 days'
        }
      ],
      warningSignsThisPhase: [
        'Joint or bone involvement',
        'Vascular or nerve injury',
        'High-risk contamination (barnyard injuries, human bites)'
      ]
    },
    {
      phase: 3,
      name: 'Healing and Monitoring',
      duration: 'Days 1-14',
      description: 'Close monitoring for signs of infection. Puncture wounds heal from the inside out and require careful observation since infection can develop deep in tissues.',
      goals: [
        'Monitor for infection development',
        'Complete antibiotic course if prescribed',
        'Manage pain appropriately',
        'Allow wound healing'
      ],
      activities: [
        'Soak foot/affected area in warm salt water 2-3 times daily (for foot punctures)',
        'Watch for signs of infection',
        'Complete full antibiotic course',
        'Rest and elevate the affected area',
        'Avoid putting weight on foot punctures'
      ],
      medications: [
        {
          name: 'Prescribed Antibiotics',
          purpose: 'Prevent or treat infection',
          duration: 'Complete full course (usually 5-10 days)'
        },
        {
          name: 'Paracetamol/Ibuprofen',
          purpose: 'Pain relief',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Increasing pain after first 48 hours',
        'Spreading redness',
        'Pus or discharge',
        'Fever',
        'Swelling that worsens'
      ]
    },
    {
      phase: 4,
      name: 'Complete Healing',
      duration: '2-4 weeks',
      description: 'Wound fully heals from inside. Return to normal activities with ongoing awareness of any late complications.',
      goals: [
        'Confirm complete healing',
        'Rule out bone infection (especially foot)',
        'Return to normal activities',
        'Address any persistent symptoms'
      ],
      activities: [
        'Attend follow-up if symptoms persist',
        'Gradually return to normal activities',
        'Wear appropriate footwear',
        'Complete any rehabilitation if needed'
      ],
      medications: [],
      warningSignsThisPhase: [
        'Persistent pain or swelling (may indicate bone infection)',
        'Wound that reopens',
        'Chronic drainage'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Emergency department for deep puncture wounds, bites, or wounds in sensitive areas',
      'Urgent care for minor puncture wounds needing professional cleaning',
      'Orthopedic surgeon if bone or joint involvement suspected',
      'Hand surgeon for punctures to hand'
    ],
    investigations: [
      'X-ray to detect metallic foreign bodies',
      'Ultrasound for non-metallic foreign bodies (wood, plastic)',
      'Blood tests if systemic infection suspected',
      'MRI if bone infection (osteomyelitis) suspected'
    ],
    medications: [
      {
        medication: 'Current medications',
        instruction: 'continue',
        reason: 'Most can be continued for wound evaluation'
      }
    ],
    dayBeforeSurgery: [
      'For planned foreign body removal: fast as instructed if anesthesia needed',
      'Note any changes in symptoms to report'
    ],
    dayOfSurgery: [
      'Bring current dressings',
      'Wear loose comfortable clothing',
      'Arrange transport home if sedation planned'
    ],
    whatToBring: [
      'Insurance and identification',
      'List of medications and allergies',
      'Tetanus immunization records if available',
      'Object that caused injury if safely available'
    ],
    fastingInstructions: 'No fasting for simple wound cleaning. For foreign body removal under sedation or general anesthesia, no food for 6 hours.'
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia for most wound exploration. Regional block for hand wounds. General anesthesia for deep wounds or pediatric patients.',
    procedureSteps: [
      'Wound is numbed with local anesthetic',
      'Wound is explored and enlarged if necessary',
      'Foreign body is located and removed',
      'Wound is thoroughly irrigated',
      'Dead tissue is removed',
      'Wound may be left open to heal or loosely closed',
      'Dressing is applied'
    ],
    duration: '20-60 minutes depending on complexity',
    whatToExpect: 'You may feel pressure during wound exploration. The wound may be enlarged to allow proper cleaning. Puncture wounds are often left open initially to allow drainage.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Elevate the affected limb above heart level',
      expectedSymptoms: [
        'Pain as anesthesia wears off',
        'Some drainage from the wound (expected as it heals from inside)',
        'Swelling around the wound',
        'The wound may look worse after exploration (this is normal)'
      ],
      painManagement: 'Take pain medication before numbness wears off',
      activityLevel: 'Rest with elevation. Limit use of affected area for 24-48 hours minimum.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep dressing in place. May soak in warm salt water 2-3 times daily for foot wounds.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Change dressing daily. Allow wound to drain. Continue soaking if instructed.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Wound should be closing. Continue clean dressings until healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) for first few days, then gradually decreasing',
      medications: [
        'Paracetamol 1000mg every 6 hours',
        'Ibuprofen 400mg every 8 hours with food',
        'Stronger medications if prescribed for first 2-3 days'
      ],
      nonPharmacological: [
        'Elevation of affected area',
        'Rest and offloading weight from foot punctures',
        'Warm soaks for comfort and drainage'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Weight bearing (foot punctures)',
        restriction: 'Minimize or use crutches',
        duration: '3-7 days or until pain resolved',
        reason: 'Pressure can push debris deeper and delay healing'
      },
      {
        activity: 'Use of affected hand/limb',
        restriction: 'Limit heavy use',
        duration: '1-2 weeks',
        reason: 'Allow wound to heal'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: 'Until wound healed',
        reason: 'Risk of infection'
      }
    ],
    dietaryGuidelines: [
      'Balanced diet with adequate protein',
      'Stay well hydrated',
      'Vitamin C from fruits and vegetables',
      'Avoid excessive alcohol'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Pain should stabilize or begin improving. Watch for infection signs.'
      },
      {
        timeframe: '1 week',
        expectation: 'Wound healing progressing. Pain significantly reduced.'
      },
      {
        timeframe: '2 weeks',
        expectation: 'Most puncture wounds healed or nearly healed.'
      }
    ],
    longTerm: [
      {
        timeframe: '1 month',
        expectation: 'Complete healing. Watch for late bone infection (foot punctures).'
      },
      {
        timeframe: '3 months',
        expectation: 'Any scar fading. Full return to activities.'
      }
    ],
    functionalRecovery: 'Full recovery expected for most puncture wounds within 2-4 weeks with proper treatment. Wounds involving tendons or nerves may take longer.',
    cosmeticOutcome: 'Puncture wounds typically heal with minimal scarring due to small size. Some may leave small permanent mark.',
    successRate: 'Most puncture wounds heal without complication with proper treatment. Infection rate is 5-15% without proper care, reduced to less than 2% with appropriate treatment.'
  },

  followUpCare: {
    schedule: [
      {
        timing: '48-72 hours',
        purpose: 'Wound check for early infection signs'
      },
      {
        timing: '1 week',
        purpose: 'Confirm healing, remove dressings if appropriate'
      },
      {
        timing: '4-6 weeks (foot punctures)',
        purpose: 'Ensure no late bone infection developed'
      }
    ],
    rehabilitationNeeds: [
      'Physical therapy if joint or tendon involved',
      'Gradual return to weight bearing for foot punctures'
    ],
    lifestyleModifications: [
      'Wear appropriate protective footwear',
      'Keep tetanus immunization current',
      'Wear gloves when handling sharp objects'
    ]
  },

  warningSigns: [
    'Pain increasing after first 48 hours',
    'Redness spreading from wound',
    'Pus or cloudy discharge',
    'Fever',
    'Red streaks extending from wound',
    'Wound not improving after 1 week',
    'New numbness or weakness'
  ],

  emergencySigns: [
    'High fever with wound infection',
    'Severe spreading infection (red, hot, rapidly expanding)',
    'Signs of tetanus: jaw stiffness, muscle spasms, difficulty swallowing',
    'Signs of sepsis: confusion, rapid breathing, severe illness',
    'Severe allergic reaction to antibiotics'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete full course of antibiotics',
      importance: 'critical',
      consequence: 'Incomplete treatment can cause resistant or recurrent infection'
    },
    {
      requirement: 'Keep tetanus immunization current',
      importance: 'critical',
      consequence: 'Tetanus is a potentially fatal infection easily prevented by vaccination'
    },
    {
      requirement: 'Watch for infection signs and seek care if present',
      importance: 'critical',
      consequence: 'Delayed treatment of puncture wound infection can lead to serious deep infection'
    },
    {
      requirement: 'Rest and offload affected area',
      importance: 'important',
      consequence: 'Weight bearing can push debris deeper and delay healing'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Wound Care',
      reference: 'WHO-WC 2018',
      keyPoints: [
        'Thorough wound irrigation is essential',
        'Tetanus prophylaxis should be current',
        'Puncture wounds at high risk of infection require close monitoring',
        'Do not close puncture wounds primarily - allow to heal open'
      ]
    },
    {
      title: 'WHO Position on Tetanus Prevention',
      reference: 'WHO-TP 2017',
      keyPoints: [
        'All wounds contaminated with soil, manure, or saliva require tetanus assessment',
        'Tetanus toxoid and immunoglobulin based on vaccination history',
        'Dirty and puncture wounds carry higher tetanus risk'
      ]
    }
  ]
};

// Export wounds conditions part 2
export const woundsEducationPart2 = [surgicalWounds, punctureWounds];
