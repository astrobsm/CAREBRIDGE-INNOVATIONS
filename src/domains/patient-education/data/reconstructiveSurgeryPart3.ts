/**
 * Patient Education Content - Category D: Reconstructive Surgery
 * Part 3: Hand Surgery and Microsurgery
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Surgical Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Hand Surgery (Reconstructive)
 */
export const handSurgery: EducationCondition = {
  id: 'reconstructive-hand-surgery',
  name: 'Hand Surgery (Reconstructive)',
  category: 'D',
  icdCode: 'Z96.69',
  description: 'Reconstructive hand surgery encompasses procedures to restore function and appearance to hands affected by injury, disease, congenital conditions, or deformity. This includes tendon repair, nerve repair, fracture fixation, contracture release, and soft tissue reconstruction.',
  alternateNames: ['Hand Reconstruction', 'Hand Trauma Surgery', 'Tendon Repair', 'Nerve Repair', 'Dupuytren\'s Release', 'Trigger Finger Release'],
  
  overview: {
    definition: 'Reconstructive hand surgery covers a wide range of procedures aimed at restoring hand function and appearance. The hand is a highly complex structure with intricate relationships between tendons, nerves, blood vessels, joints, and skin. Common reconstructive procedures include: tendon repair/reconstruction, nerve repair/grafting, contracture release (Dupuytren\'s, burn), fracture fixation, replantation, flap coverage, and treatment of congenital abnormalities.',
    causes: [
      'Traumatic injuries (cuts, crush injuries)',
      'Burns affecting hand',
      'Dupuytren\'s disease',
      'Trigger finger',
      'Carpal tunnel syndrome',
      'Congenital hand abnormalities',
      'Rheumatoid arthritis affecting hand',
      'Tumors of the hand',
      'Nerve compression syndromes'
    ],
    symptoms: [
      'Loss of hand function after injury',
      'Inability to straighten or bend fingers',
      'Numbness or weakness in hand',
      'Visible deformity',
      'Pain limiting hand use',
      'Contracture preventing hand opening'
    ],
    riskFactors: [
      'Occupational hand injuries',
      'Diabetes (affects healing)',
      'Smoking (affects healing and circulation)',
      'Previous hand surgery with scarring',
      'Delayed treatment of injuries',
      'Poor compliance with rehabilitation'
    ],
    complications: [
      'Stiffness (most common)',
      'Adhesions limiting tendon gliding',
      'Infection',
      'Nerve damage',
      'Complex regional pain syndrome',
      'Re-rupture of tendon repairs',
      'Incomplete recovery'
    ],
    prevalence: 'Hand injuries are extremely common, accounting for up to 20% of emergency department presentations. Many require surgical reconstruction for optimal outcomes.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Initial Assessment and Stabilization',
      duration: 'Emergency/First week',
      description: 'Comprehensive assessment of hand injury, wound care, and stabilization. Some repairs are done urgently while others may be staged.',
      goals: [
        'Assess all structures (tendons, nerves, vessels, bones)',
        'Control bleeding and prevent infection',
        'Stabilize fractures',
        'Plan definitive repair',
        'Preserve all tissue for reconstruction'
      ],
      activities: [
        'Thorough clinical examination',
        'X-rays of hand',
        'Wound exploration if needed',
        'Splinting for protection',
        'Tetanus prophylaxis',
        'Antibiotic coverage for open injuries',
        'Hand elevation'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection in open injuries',
          duration: '5-7 days'
        },
        {
          name: 'Tetanus prophylaxis',
          purpose: 'Prevent tetanus',
          duration: 'Single dose if needed'
        }
      ],
      warningSignsThisPhase: [
        'Compromised blood supply to fingers',
        'Compartment syndrome signs',
        'Infection developing',
        'Progressive nerve dysfunction'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Reconstruction',
      duration: 'Day of surgery',
      description: 'Surgical repair of damaged structures. May involve tendon repair, nerve repair, fracture fixation, flap coverage, or combination.',
      goals: [
        'Repair all damaged structures',
        'Restore blood supply',
        'Achieve stable fixation of fractures',
        'Provide soft tissue coverage',
        'Position for optimal healing'
      ],
      activities: [
        'Tourniquet-controlled surgery for bloodless field',
        'Tendon repair with strong suture',
        'Nerve repair under microscope',
        'Fracture fixation with wires/plates',
        'Flap coverage if needed',
        'Careful wound closure',
        'Protective splinting'
      ],
      warningSignsThisPhase: [
        'Inadequate blood supply to repaired structures',
        'Tension on repairs',
        'Inadequate soft tissue coverage'
      ]
    },
    {
      phase: 3,
      name: 'Immobilization and Protection',
      duration: 'Days 1 to 3-6 weeks',
      description: 'Protected healing phase. Splint maintains optimal position while repairs heal. Duration depends on structures involved.',
      goals: [
        'Protect repairs from disruption',
        'Prevent stiffness',
        'Control swelling',
        'Begin early controlled motion (some injuries)'
      ],
      activities: [
        'Splint/cast as prescribed',
        'Hand elevation above heart level',
        'Finger exercises if permitted',
        'Wound care',
        'Hand therapy begins',
        'Edema control'
      ],
      medications: [
        {
          name: 'Analgesics',
          purpose: 'Pain control',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Increasing pain suggesting compartment syndrome',
        'Color change in fingers (white, blue)',
        'Wound infection',
        'Splint too tight'
      ]
    },
    {
      phase: 4,
      name: 'Rehabilitation Phase',
      duration: '4 weeks to 6 months',
      description: 'Progressive hand therapy to restore motion, strength, and function. This phase is critical for outcome.',
      goals: [
        'Restore range of motion',
        'Prevent adhesions',
        'Regain strength',
        'Restore function for daily activities',
        'Return to work'
      ],
      activities: [
        'Intensive hand therapy sessions',
        'Progressive exercise program',
        'Splint weaning',
        'Scar massage',
        'Desensitization if nerve injury',
        'Strengthening exercises',
        'Functional training'
      ],
      warningSignsThisPhase: [
        'Failure to progress in therapy',
        'Tendon rupture',
        'Stiffness not responding',
        'Chronic pain syndrome developing'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Hand surgeon (plastic surgeon or orthopedic)',
      'Hand therapist for post-operative planning',
      'Anesthetist',
      'Occupational therapist for work assessment'
    ],
    investigations: [
      'X-rays of hand (AP, lateral, oblique)',
      'CT scan if complex fracture',
      'MRI if tendon/ligament injury suspected',
      'Doppler studies if vascular injury',
      'Nerve conduction studies if indicated',
      'Blood tests as per anesthetic requirements'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Minimize bleeding during surgery'
      },
      {
        medication: 'Smoking',
        instruction: 'stop completely',
        reason: 'Critical for wound and tendon healing'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight if general anesthesia. May eat light meal if local anesthesia only.',
    dayBeforeSurgery: [
      'Shower normally',
      'Remove rings and jewelry from hand',
      'Trim fingernails short',
      'Pack loose clothing and front-opening tops'
    ],
    whatToBring: [
      'Loose, comfortable clothing that opens in front',
      'Slip-on shoes (cannot tie laces)',
      'List of medications',
      'Driver/support person'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'No hand cream or nail polish',
      'Leave jewelry at home',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: ['Regional anesthesia (arm block)', 'General anesthesia', 'Local anesthesia (minor procedures)', 'Wide-awake local anesthesia (WALANT)'],
    procedureDescription: 'Hand surgery is performed under tourniquet for a bloodless field. Tendon Repair: Damaged ends are identified and sutured using strong, specialized techniques (e.g., Kessler, Bunnell). Nerve Repair: Under magnification, nerve ends are aligned and sutured precisely. Fracture Fixation: Wires (K-wires), screws, or plates hold bone fragments in position. Contracture Release: Tight tissue is released and may require Z-plasty or skin grafting. The hand is then splinted in a protected position.',
    duration: '1-4 hours depending on complexity',
    whatToExpect: 'Regional anesthesia (arm block) is common - you may be awake but feel no pain. The hand is kept elevated during surgery. A splint or cast will be applied before you wake up.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'ELEVATION essential - hand must be kept above heart level at all times. Use pillows when sitting, sling when walking.',
      expectedSymptoms: [
        'Numbness from block (can last 12-24 hours)',
        'Swelling and throbbing once block wears off',
        'Fingers may be stiff from splint',
        'Pain controlled with medications'
      ],
      activityLevel: 'Rest with hand elevated. Move fingers if instructed. Do not use hand for any activities.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep splint/dressing completely dry. Do not remove. Monitor finger tips for color and sensation.'
      },
      {
        day: 'Days 7-14',
        instruction: 'First dressing change by hand therapist or surgeon. Suture removal at 10-14 days.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Splint worn as directed. Begin scar massage once wound closed. Continue exercises from hand therapy.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (4-7/10) initially, improving over days',
      medications: [
        'Paracetamol 1000mg every 6 hours regularly',
        'Ibuprofen if not contraindicated',
        'Opioids for severe pain first few days',
        'Reduce medication as pain improves'
      ],
      nonPharmacological: [
        'ELEVATION is the best pain reliever',
        'Ice to elbow area (not over wound)',
        'Keep hand moving as permitted'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Using operated hand',
        restriction: 'No lifting, gripping, or weight bearing',
        duration: '6-12 weeks',
        reason: 'Protect healing repairs'
      },
      {
        activity: 'Getting splint wet',
        restriction: 'Keep completely dry',
        duration: 'Until advised otherwise',
        reason: 'Maintain wound cleanliness and splint integrity'
      },
      {
        activity: 'Work',
        restriction: 'Time off varies with job type',
        duration: '2 weeks (desk) to 3 months (manual)',
        reason: 'Depends on hand demands of work'
      },
      {
        activity: 'Driving',
        restriction: 'No driving with splint',
        duration: 'Until out of splint and cleared',
        reason: 'Cannot safely control vehicle'
      }
    ],
    dietaryGuidelines: [
      'Normal healthy diet',
      'Adequate protein for healing',
      'No smoking - absolutely critical for tendon and wound healing'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2 weeks',
        expectation: 'Wound healing, swelling reducing, early controlled motion starting'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Tendon repairs gaining strength, protected motion continuing'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Active motion improving, beginning strengthening'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Maximum recovery usually achieved. Nerve recovery may take 18-24 months.'
      }
    ],
    functionalRecovery: 'Depends on injury severity. Isolated tendon repairs: 80-90% function. Complex injuries: 50-80%. Nerve injuries: slow recovery over 12-24 months. Hand therapy compliance is the biggest predictor of outcome.',
    cosmeticOutcome: 'Scars mature over 12-18 months. Hand surgery scars generally well-concealed in skin creases.',
    successRate: 'Tendon repairs: 85-95% avoid re-rupture. Nerve repairs: useful recovery in 60-80%. Overall hand function depends heavily on rehabilitation.',
    possibleComplications: [
      'Stiffness (most common, requires therapy)',
      'Tendon adhesions',
      'Re-rupture of tendon repair',
      'Incomplete nerve recovery',
      'Complex regional pain syndrome',
      'Infection',
      'Cold intolerance'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '3-7 days',
        purpose: 'First hand therapy visit, begin early motion if appropriate'
      },
      {
        timing: '2 weeks',
        purpose: 'Wound check, suture removal, continue therapy'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Assess healing, advance therapy program'
      },
      {
        timing: '3 months',
        purpose: 'Assess functional recovery'
      },
      {
        timing: '6-12 months',
        purpose: 'Final outcome, especially nerve injuries'
      }
    ],
    rehabilitationNeeds: [
      'Hand therapy is ESSENTIAL - typically 2-3 times weekly for 3-6 months',
      'Home exercise program performed multiple times daily',
      'Splinting regimen as prescribed',
      'Scar management',
      'Work hardening program if needed'
    ],
    lifestyleModifications: [
      'No smoking - critical for hand healing',
      'Protect hand from cold',
      'Continue home exercises long-term',
      'Wear protective gloves for work/activities'
    ]
  },

  warningSigns: [
    'Fingers turning white or blue',
    'Increasing pain despite elevation',
    'Unable to move fingers within splint',
    'Splint feeling too tight',
    'Wound becoming red, swollen, or draining pus',
    'Fever',
    'Sudden loss of movement that was present (tendon rupture)'
  ],

  emergencySigns: [
    'Complete loss of finger sensation or circulation',
    'Fingers completely white or black',
    'Severe pain not relieved by elevation and medication',
    'High fever with wound infection',
    'Sudden snap or pop followed by loss of movement (tendon rupture)'
  ],

  complianceRequirements: [
    {
      requirement: 'Attend all hand therapy appointments',
      importance: 'critical',
      consequence: 'Hand therapy is the main determinant of outcome - missing therapy leads to poor results'
    },
    {
      requirement: 'Keep hand elevated',
      importance: 'critical',
      consequence: 'Swelling causes stiffness and pain'
    },
    {
      requirement: 'Perform home exercises as prescribed',
      importance: 'critical',
      consequence: 'Daily exercises prevent adhesions and stiffness'
    },
    {
      requirement: 'No smoking',
      importance: 'critical',
      consequence: 'Smoking dramatically impairs tendon and wound healing'
    },
    {
      requirement: 'Wear splint as directed',
      importance: 'critical',
      consequence: 'Protects repairs from rupture'
    }
  ],

  whoGuidelines: [
    {
      title: 'Hand Injury Management',
      reference: 'WHO-HIM 2019',
      keyPoints: [
        'Early treatment optimizes outcomes',
        'Specialized hand surgery achieves best results',
        'Rehabilitation is essential for functional recovery',
        'Patient compliance determines outcome'
      ]
    }
  ]
};

/**
 * Microsurgery
 */
export const microsurgery: EducationCondition = {
  id: 'reconstructive-microsurgery',
  name: 'Microsurgery',
  category: 'D',
  icdCode: 'Z48.816',
  description: 'Microsurgery is a specialized surgical technique using an operating microscope and fine instruments to perform surgery on very small structures such as blood vessels (1-3mm diameter) and nerves. This enables free tissue transfer, replantation of amputated parts, and complex reconstructions.',
  alternateNames: ['Free Flap Surgery', 'Free Tissue Transfer', 'Microvascular Surgery', 'Replantation Surgery', 'Perforator Flap'],
  
  overview: {
    definition: 'Microsurgery refers to surgical procedures performed under high-powered magnification (10-40x) on structures as small as 1mm. The most common applications are: Free tissue transfer (moving tissue with its blood supply from one body location to another, reconnecting vessels under the microscope), Replantation of amputated digits or limbs, Nerve repair and grafting, and Lymphatic surgery for lymphedema. These procedures can reconstruct complex defects that would otherwise be unrepairable.',
    causes: [
      'Complex wounds requiring free flap coverage',
      'Breast reconstruction after mastectomy',
      'Head and neck cancer reconstruction',
      'Trauma with tissue loss',
      'Amputated digits or limbs requiring replantation',
      'Nerve gaps requiring grafting',
      'Lymphedema requiring lymphatic surgery'
    ],
    symptoms: [
      'Complex wound not suitable for simpler reconstruction',
      'Major tissue defect requiring bulk and coverage',
      'Amputated part potentially for replantation',
      'Nerve gap requiring bridging',
      'Breast absence after mastectomy'
    ],
    riskFactors: [
      'Smoking (major risk factor)',
      'Diabetes',
      'Peripheral vascular disease',
      'Previous radiation',
      'Obesity',
      'Blood clotting disorders',
      'Atherosclerosis',
      'Vasospastic conditions'
    ],
    complications: [
      'Flap failure from vascular thrombosis',
      'Venous congestion',
      'Partial flap loss',
      'Donor site complications',
      'Infection',
      'Anastomosis bleeding',
      'Need for revision surgery'
    ],
    prevalence: 'Microsurgery is performed in specialized centers worldwide. Free flap success rates exceed 95% in experienced hands.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Operative Planning',
      duration: '1-4 weeks',
      description: 'Detailed planning including imaging of blood vessels, selection of donor site, and optimization of patient.',
      goals: [
        'Map recipient and donor vessels',
        'Select optimal flap for defect',
        'Optimize patient health',
        'Plan operating team and resources'
      ],
      activities: [
        'CT angiography of donor and recipient vessels',
        'Mark perforator vessels with Doppler',
        'Nutritional optimization',
        'Smoking cessation (mandatory)',
        'Medical optimization',
        'Plan ICU/HDU bed for monitoring',
        'Coordinate multi-disciplinary team'
      ],
      medications: [
        {
          name: 'Aspirin (sometimes)',
          purpose: 'Reduce thrombosis risk',
          duration: 'Start before surgery and continue post-op'
        }
      ],
      warningSignsThisPhase: [
        'Patient unable to stop smoking',
        'Unsuitable vessels on imaging',
        'Medical conditions not optimized'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Procedure',
      duration: 'Day of surgery (6-12+ hours)',
      description: 'Complex surgery often involving two teams - one preparing the recipient site and one raising the flap. Vessels are connected under the microscope.',
      goals: [
        'Raise flap with intact pedicle',
        'Prepare recipient vessels',
        'Achieve patent microvascular anastomoses',
        'Inset flap appropriately',
        'Close donor site'
      ],
      activities: [
        'Flap elevation preserving vessels',
        'Recipient vessel preparation',
        'Microvascular anastomosis (arterial and venous)',
        'Confirm flap perfusion',
        'Flap inset and shaping',
        'Donor site closure',
        'Careful dressing to allow flap monitoring'
      ],
      warningSignsThisPhase: [
        'Vessel spasm',
        'Thrombosis of anastomosis',
        'Inadequate flap perfusion',
        'Tension on vessels'
      ]
    },
    {
      phase: 3,
      name: 'Critical Monitoring Phase',
      duration: 'First 72 hours (especially first 24)',
      description: 'Intensive monitoring of flap perfusion. Most vascular complications occur in first 24-48 hours and may be salvageable with urgent return to theatre.',
      goals: [
        'Detect vascular compromise immediately',
        'Maintain optimal physiology',
        'Prevent thrombosis',
        'Enable urgent intervention if needed'
      ],
      activities: [
        'Hourly flap checks (color, temperature, capillary refill)',
        'Doppler monitoring of flap',
        'Keep patient warm, hydrated, comfortable',
        'Pain control to prevent vasospasm',
        'Maintain blood pressure',
        'Keep hematocrit optimal',
        'Anticoagulation per protocol'
      ],
      medications: [
        {
          name: 'Low molecular weight heparin',
          purpose: 'Prevent venous thrombosis',
          duration: 'Per protocol (often 5-7 days)'
        },
        {
          name: 'Aspirin',
          purpose: 'Prevent arterial thrombosis',
          duration: '2-4 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Flap pale/white (arterial occlusion) - EMERGENCY',
        'Flap congested/purple (venous occlusion) - EMERGENCY',
        'Flap cool compared to surrounding',
        'Loss of Doppler signal',
        'Dark blood on scratch test'
      ]
    },
    {
      phase: 4,
      name: 'Recovery and Rehabilitation',
      duration: 'Weeks 2-12+',
      description: 'Once flap is stable, focus shifts to healing, donor site recovery, and rehabilitation.',
      goals: [
        'Complete flap integration',
        'Wound healing',
        'Donor site recovery',
        'Restore function',
        'Return to normal activities'
      ],
      activities: [
        'Wound care',
        'Progressive mobilization',
        'Physiotherapy as needed',
        'Secondary procedures if needed (debulking, revision)',
        'Address any complications'
      ],
      warningSignsThisPhase: [
        'Wound breakdown',
        'Partial flap loss',
        'Infection',
        'Donor site problems'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Microsurgeon',
      'Anesthetist (essential - long surgery)',
      'Nutritionist',
      'Physiotherapist',
      'Other specialists depending on underlying condition'
    ],
    investigations: [
      'CT angiography of donor and recipient sites',
      'Doppler mapping of perforators',
      'Complete blood count',
      'Coagulation profile',
      'Blood type and crossmatch (2-4 units)',
      'Renal and liver function',
      'ECG and cardiac assessment',
      'Chest X-ray'
    ],
    medications: [
      {
        medication: 'Smoking/Nicotine',
        instruction: 'stop minimum 6 weeks before',
        reason: 'CRITICAL - nicotine causes vessel spasm and thrombosis'
      },
      {
        medication: 'Anticoagulants',
        instruction: 'discuss with surgeon',
        reason: 'May need to modify for surgery'
      },
      {
        medication: 'Aspirin',
        instruction: 'may be started before surgery',
        reason: 'May reduce thrombosis risk'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight',
    dayBeforeSurgery: [
      'Antimicrobial shower',
      'Bowel preparation if abdominal surgery',
      'Light meal in evening',
      'No alcohol',
      'Pack for extended hospital stay (5-7+ days)'
    ],
    whatToBring: [
      'Loose, comfortable clothing',
      'All medications',
      'Entertainment (books, tablet)',
      'Personal toiletries',
      'Contact details of family',
      'Advance directive'
    ],
    dayOfSurgery: [
      'Nothing by mouth from midnight',
      'Morning antimicrobial shower',
      'Compression stockings will be applied',
      'Urinary catheter will be placed',
      'Surgery may take 6-12+ hours'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia (procedure is long)',
    procedureDescription: 'Microsurgery involves two main components: 1) FLAP HARVEST: The chosen tissue (e.g., DIEP flap from abdomen, ALT flap from thigh, fibula for bone) is carefully dissected, preserving the feeding artery and draining veins on a pedicle. The flap is then detached by dividing the vessels. 2) MICROSURGICAL ANASTOMOSIS: Under the operating microscope at 10-40x magnification, the flap artery is sutured to a recipient artery, and the vein(s) to recipient vein(s), using sutures finer than a human hair (8-0, 9-0, 10-0). Blood flow is then restored. The flap is inset and shaped, and the donor site is closed.',
    duration: '6-12 hours or longer for complex cases',
    whatToExpect: 'Very long surgery requiring specialized anesthetic management. You will be in recovery or ICU afterwards. Family should expect to wait many hours. You will have multiple monitoring devices attached.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Positioning depends on flap location. Generally keep warm, avoid pressure on flap, optimize circulation. May need specific positioning to avoid kinking vessels.',
      expectedSymptoms: [
        'Flap will appear pink and warm if healthy',
        'Some swelling is normal',
        'Multiple monitoring devices attached',
        'May be in ICU initially',
        'Pain managed with medications',
        'Urinary catheter in place'
      ],
      activityLevel: 'Bed rest for first 24-72 hours. Gradual mobilization after flap stable.'
    },
    woundCare: [
      {
        day: 'First 72 hours',
        instruction: 'Flap monitored hourly. Dressings left in place. Focus on flap perfusion. Do not disturb.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Flap monitoring reduced. First dressing changes. Drains managed.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Regular wound care. Suture removal. Begin scar management once healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate to severe (5-8/10) from donor and recipient sites',
      medications: [
        'Patient-controlled analgesia (PCA) initially',
        'Transition to oral medications',
        'Paracetamol regularly',
        'Avoid NSAIDs in first 48 hours (may affect anastomosis)'
      ],
      nonPharmacological: [
        'Good positioning',
        'Warmth',
        'Adequate hydration',
        'Relaxation techniques'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Position changes that stress flap/vessels',
        restriction: 'Avoid as directed',
        duration: 'First 5-7 days',
        reason: 'Prevent vessel kinking or tension'
      },
      {
        activity: 'Caffeine',
        restriction: 'Avoid',
        duration: 'First 5-7 days',
        reason: 'Caffeine causes vasoconstriction'
      },
      {
        activity: 'Cold exposure',
        restriction: 'Avoid',
        duration: '2 weeks',
        reason: 'Cold causes vessel spasm'
      },
      {
        activity: 'Heavy activity',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Allow complete healing'
      }
    ],
    dietaryGuidelines: [
      'High protein diet for healing',
      'Adequate hydration essential',
      'No caffeine for first week (causes vasoconstriction)',
      'No smoking EVER',
      'No alcohol for first 2 weeks'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24 hours',
        expectation: 'Flap pink, warm, with good capillary refill'
      },
      {
        timeframe: '72 hours',
        expectation: 'Critical period passed, flap stable'
      },
      {
        timeframe: '1 week',
        expectation: 'Flap well perfused, wounds healing, mobilizing'
      }
    ],
    longTerm: [
      {
        timeframe: '6 weeks',
        expectation: 'Flap healed, donor site healed, returning to activities'
      },
      {
        timeframe: '3-6 months',
        expectation: 'Flap matured, may need revision surgery for shaping'
      },
      {
        timeframe: '12 months',
        expectation: 'Final result, flap integrated, function restored'
      }
    ],
    functionalRecovery: 'Excellent functional outcomes for reconstruction. Free flaps provide durable, well-vascularized tissue. Bone flaps allow weight bearing. Nerve recovery in innervated flaps takes 12-24 months.',
    cosmeticOutcome: 'Good cosmetic outcomes with skilled surgery. Flaps can often be shaped and revised for optimal contour. Secondary procedures may be offered.',
    successRate: 'Free flap success rates exceed 95% in experienced centers. Total flap loss occurs in 1-5% of cases. Partial loss in 5-10%.',
    possibleComplications: [
      'Total flap loss (1-5%)',
      'Partial flap loss (5-10%)',
      'Return to theatre for vascular compromise (5-10%)',
      'Donor site complications',
      'Infection',
      'Hematoma/seroma',
      'DVT/PE'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: 'Hourly for first 72 hours',
        purpose: 'Flap monitoring'
      },
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, drain removal, sutures'
      },
      {
        timing: '6 weeks',
        purpose: 'Healing assessment'
      },
      {
        timing: '3-6 months',
        purpose: 'Assess for revision surgery if needed'
      },
      {
        timing: '12 months',
        purpose: 'Final outcome assessment'
      }
    ],
    rehabilitationNeeds: [
      'Physiotherapy as indicated by reconstruction',
      'Occupational therapy for hand/upper limb',
      'Lymphedema therapy if applicable',
      'Psychological support'
    ],
    lifestyleModifications: [
      'No smoking ever',
      'Protect reconstructed area',
      'Maintain good nutrition',
      'Report any concerns promptly'
    ]
  },

  warningSigns: [
    'Flap turning pale/white (arterial problem)',
    'Flap turning blue/purple (venous problem)',
    'Flap becoming cold',
    'Loss of capillary refill',
    'Increasing swelling and tension',
    'Bleeding from wound',
    'Fever'
  ],

  emergencySigns: [
    'Sudden color change of flap - EMERGENCY requiring immediate return to theatre',
    'Flap completely white or black',
    'Significant bleeding',
    'High fever with signs of infection',
    'Chest pain, shortness of breath (PE)'
  ],

  complianceRequirements: [
    {
      requirement: 'Report ANY flap color or temperature change immediately',
      importance: 'critical',
      consequence: 'Vascular compromise is salvageable only if detected and treated within hours'
    },
    {
      requirement: 'No smoking or nicotine ever',
      importance: 'critical',
      consequence: 'Nicotine causes vessel spasm and thrombosis leading to flap loss'
    },
    {
      requirement: 'Avoid caffeine first week',
      importance: 'important',
      consequence: 'Caffeine causes vasoconstriction'
    },
    {
      requirement: 'Follow positioning instructions exactly',
      importance: 'critical',
      consequence: 'Improper position can kink vessels and cause flap loss'
    }
  ],

  whoGuidelines: [
    {
      title: 'Microsurgery Standards',
      reference: 'WHO-MSS 2020',
      keyPoints: [
        'Microsurgery requires specialized training and infrastructure',
        'Post-operative monitoring is critical for success',
        'Smoking cessation is mandatory for microsurgery patients',
        'Early detection of vascular compromise enables salvage'
      ]
    }
  ]
};

// Export reconstructive surgery conditions part 3
export const reconstructiveSurgeryPart3 = [handSurgery, microsurgery];
