/**
 * Patient Education Content - Category F: Pediatric Surgical Conditions
 * Part 2: Appendicitis (Pediatric) and Undescended Testis
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Pediatric Surgery Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Appendicitis (Pediatric)
 */
export const pediatricAppendicitis: EducationCondition = {
  id: 'pediatric-appendicitis',
  name: 'Appendicitis (Pediatric)',
  category: 'F',
  icdCode: 'K35',
  description: 'Appendicitis is inflammation of the appendix, a small finger-like pouch attached to the beginning of the large intestine. It is one of the most common causes of emergency abdominal surgery in children.',
  alternateNames: ['Acute Appendicitis', 'Inflamed Appendix', 'Appendiceal Inflammation'],
  
  overview: {
    definition: 'Appendicitis occurs when the appendix becomes blocked (often by stool, mucus, or lymphoid tissue) and then becomes inflamed and infected. If not treated, the appendix can rupture (perforate), causing peritonitis. In children, appendicitis can progress more rapidly than in adults, and young children may have atypical presentations making diagnosis more challenging.',
    causes: [
      'Obstruction of appendix opening (most common)',
      'Fecalith (hardened stool) blocking appendix',
      'Lymphoid hyperplasia (swelling of immune tissue)',
      'Viral or bacterial infection',
      'Rarely: parasites, tumors, or foreign bodies'
    ],
    symptoms: [
      'Abdominal pain starting around umbilicus, then moving to right lower abdomen',
      'Loss of appetite (anorexia)',
      'Nausea and vomiting (usually after pain starts)',
      'Low-grade fever',
      'Pain worsens with movement, coughing, or jumping',
      'Tenderness in right lower abdomen',
      'Child may walk bent over or refuse to walk',
      'Diarrhea or constipation (occasionally)'
    ],
    riskFactors: [
      'Age 10-19 years (peak incidence)',
      'Male gender (slightly more common)',
      'Family history of appendicitis',
      'Low-fiber diet (possible association)',
      'Cystic fibrosis'
    ],
    complications: [
      'Perforation (rupture) - more common in young children',
      'Abscess formation',
      'Peritonitis (infection of abdominal cavity)',
      'Sepsis',
      'Bowel obstruction (from adhesions later)'
    ],
    prevalence: 'Appendicitis affects approximately 1-2 per 1,000 children per year. Lifetime risk is 7-8%. Peak incidence is in adolescence.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Assessment',
      duration: 'Hours',
      description: 'Clinical evaluation, investigations, and decision-making. Appendicitis is a clinical diagnosis supported by investigations.',
      goals: [
        'Confirm diagnosis',
        'Assess for perforation',
        'Prepare for surgery',
        'Start antibiotics'
      ],
      activities: [
        'Physical examination',
        'Blood tests (white cell count, CRP)',
        'Urine test (rule out UTI)',
        'Ultrasound (first-line imaging in children)',
        'CT scan (if ultrasound inconclusive)',
        'IV fluids and antibiotics',
        'Nil by mouth'
      ],
      medications: [
        {
          name: 'IV antibiotics',
          purpose: 'Treat infection, prevent spread',
          duration: 'Started pre-operatively'
        },
        {
          name: 'Pain relief',
          purpose: 'Comfort',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Signs of perforation',
        'Peritonitis',
        'Sepsis'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Treatment',
      duration: 'Day of surgery',
      description: 'Appendectomy - removal of the appendix. Laparoscopic approach is standard in children.',
      goals: [
        'Remove appendix',
        'Washout if perforated',
        'Drain abscess if present'
      ],
      activities: [
        'Laparoscopic appendectomy (usual)',
        'Open appendectomy (if needed)',
        'Peritoneal washout if perforated',
        'Drain placement if abscess'
      ],
      warningSignsThisPhase: [
        'Perforated appendix found',
        'Generalized peritonitis',
        'Need for bowel resection (rare)'
      ]
    },
    {
      phase: 3,
      name: 'Post-Operative Recovery',
      duration: '1-7 days (depending on perforation status)',
      description: 'Recovery in hospital with gradual return to normal diet and activities.',
      goals: [
        'Pain control',
        'Complete antibiotic course',
        'Return to normal diet',
        'Wound healing'
      ],
      activities: [
        'Pain management',
        'Antibiotics (longer if perforated)',
        'Early mobilization',
        'Gradual diet advancement',
        'Wound care'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Intra-abdominal abscess',
        'Ileus (slow bowel function)',
        'Ongoing fever'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric surgeon',
      'Pediatric anesthetist',
      'Pediatrician (for complex cases)'
    ],
    investigations: [
      'Complete blood count (elevated white cells)',
      'CRP (elevated inflammatory marker)',
      'Urinalysis (rule out UTI)',
      'Abdominal ultrasound',
      'CT scan if diagnosis unclear'
    ],
    medications: [
      {
        medication: 'Pain relief',
        instruction: 'can be given',
        reason: 'Pain relief does not mask appendicitis'
      },
      {
        medication: 'Oral intake',
        instruction: 'nil by mouth',
        reason: 'Preparing for surgery'
      }
    ],
    fastingInstructions: 'Nil by mouth from time of diagnosis. IV fluids will be given.',
    dayBeforeSurgery: [
      'Usually emergency - no planned admission',
      'IV fluids started',
      'Antibiotics given',
      'Blood tests completed'
    ],
    whatToBring: [
      'Comfort items (toy, book, device)',
      'Loose comfortable clothing',
      'Phone charger',
      'Parent essentials for hospital stay'
    ],
    dayOfSurgery: [
      'Emergency or semi-urgent surgery',
      'Keep child nil by mouth',
      'IV fluids running',
      'Parents can stay for comfort'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'LAPAROSCOPIC APPENDECTOMY: Three small incisions (5-10mm) are made - usually at the umbilicus, left lower abdomen, and suprapubic or right lower abdomen. A camera is inserted to visualize the appendix. The appendix is identified, its blood supply is divided (usually with clips or stapler), and the appendix is removed. If perforated, the abdomen is washed out with saline. The appendix is removed through one of the port sites in a bag. OPEN APPENDECTOMY: Used if laparoscopy not available or not suitable. A small incision in the right lower abdomen (McBurney\'s or Lanz incision) is used to remove the appendix.',
    duration: '30-60 minutes (uncomplicated), 60-90 minutes (complicated)',
    whatToExpect: 'Laparoscopic surgery with 3 small incisions. Hospital stay 1-2 days for simple appendicitis, 3-7 days if perforated.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Comfortable position. No special positioning required.',
      expectedSymptoms: [
        'Abdominal pain (improving daily)',
        'Shoulder tip pain (from gas used in surgery)',
        'Nausea initially',
        'Drowsiness from anesthesia'
      ],
      activityLevel: 'Up and walking same day or next day. Gentle activity. No strenuous activity.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Wounds covered with waterproof dressings. Keep dry. Can shower with dressings on after 24-48 hours.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Dressings can be removed. Shower normally. Pat wounds dry.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Wounds should be healed. Sutures usually dissolving. Monitor for signs of infection.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) initially, improving over days',
      medications: [
        'Paracetamol regularly',
        'Ibuprofen (if not contraindicated)',
        'Codeine or tramadol for breakthrough (short-term)',
        'Decrease to paracetamol alone by day 3-5'
      ],
      nonPharmacological: [
        'Pillows for comfortable positioning',
        'Gentle movement helps',
        'Distraction activities'
      ]
    },
    activityRestrictions: [
      {
        activity: 'School',
        restriction: 'Time off',
        duration: '1-2 weeks (longer if perforated)',
        reason: 'Recovery and healing'
      },
      {
        activity: 'Sports/PE',
        restriction: 'Avoid',
        duration: '2-4 weeks',
        reason: 'Allow wound healing'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '4 weeks',
        reason: 'Reduce hernia risk'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid until wounds healed',
        duration: '2 weeks',
        reason: 'Wound healing'
      }
    ],
    dietaryGuidelines: [
      'Clear fluids first',
      'Light diet when tolerating fluids',
      'Normal diet within 24-48 hours',
      'May take longer if perforated appendix',
      'High fiber to prevent constipation',
      'Adequate fluids'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 days',
        expectation: 'Simple appendicitis: home, eating normally'
      },
      {
        timeframe: '3-7 days',
        expectation: 'Perforated: hospital stay for IV antibiotics'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Return to school, wounds healed'
      }
    ],
    longTerm: [
      {
        timeframe: '4-6 weeks',
        expectation: 'Full recovery, all activities'
      },
      {
        timeframe: 'Long-term',
        expectation: 'No ongoing issues, normal life'
      }
    ],
    functionalRecovery: 'Excellent. Complete recovery expected. No long-term effects from appendix removal.',
    cosmeticOutcome: 'Laparoscopic: 3 small scars (5-10mm) that fade. One often hidden in umbilicus. Open: Single scar (3-5cm) in right lower abdomen.',
    successRate: 'Cure rate >99%. Complications more common if perforated (15-20% vs 3-5% simple).',
    possibleComplications: [
      'Wound infection (3-5% simple, 10-20% perforated)',
      'Intra-abdominal abscess (more common if perforated)',
      'Ileus (slow bowel function)',
      'Adhesive bowel obstruction (rare, later complication)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, confirm recovery'
      },
      {
        timing: '4-6 weeks (if perforated)',
        purpose: 'Confirm complete resolution'
      }
    ],
    rehabilitationNeeds: [
      'Return to normal activities gradually',
      'Return to school when comfortable',
      'Sports when cleared'
    ],
    lifestyleModifications: [
      'No specific modifications needed',
      'Normal diet',
      'Normal activities after recovery'
    ]
  },

  warningSigns: [
    'Increasing pain after initial improvement',
    'Fever',
    'Wound redness, swelling, or discharge',
    'Nausea and vomiting returning',
    'Unable to eat',
    'Abdominal distension'
  ],

  emergencySigns: [
    'Severe abdominal pain',
    'High fever (>38.5°C)',
    'Vomiting with distension',
    'Signs of dehydration',
    'Wound breakdown'
  ],

  complianceRequirements: [
    {
      requirement: 'Complete antibiotic course',
      importance: 'critical',
      consequence: 'Incomplete course increases abscess risk'
    },
    {
      requirement: 'Activity restrictions for 4 weeks',
      importance: 'important',
      consequence: 'Reduces hernia and complications'
    },
    {
      requirement: 'Attend follow-up',
      importance: 'important',
      consequence: 'Confirms complete recovery'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Surgical Care Guidelines',
      reference: 'WHO Global Initiative',
      keyPoints: [
        'Appendectomy is treatment of choice',
        'Laparoscopic approach preferred when available',
        'Prompt surgery reduces perforation rates',
        'Antibiotics essential, especially if perforated',
        'Excellent outcomes with timely treatment'
      ]
    }
  ]
};

/**
 * Undescended Testis
 */
export const undescendedTestis: EducationCondition = {
  id: 'pediatric-undescended-testis',
  name: 'Undescended Testis',
  category: 'F',
  icdCode: 'Q53',
  description: 'An undescended testis (cryptorchidism) is when one or both testes have not moved down (descended) into the scrotum by the time of birth. It is the most common genital abnormality in newborn boys.',
  alternateNames: ['Cryptorchidism', 'Maldescended Testis', 'Empty Scrotum', 'Retractile Testis', 'Ectopic Testis'],
  
  overview: {
    definition: 'During fetal development, the testes form inside the abdomen and normally descend into the scrotum before birth. An undescended testis is one that has not completed this journey. The testis may be: Palpable (can be felt) in the groin or upper scrotum, Non-palpable (cannot be felt) - may be in the abdomen or absent. True undescended testes differ from retractile testes, which move in and out of the scrotum but can be brought down and will stay. Undescended testes require surgical correction (orchidopexy) to optimize fertility and allow cancer surveillance.',
    causes: [
      'Unknown in most cases',
      'Hormonal factors during fetal development',
      'Mechanical factors preventing descent',
      'Genetic factors',
      'Associated syndromes (e.g., Prader-Willi)',
      'Prematurity (testicular descent occurs late in pregnancy)'
    ],
    symptoms: [
      'Empty scrotum on one or both sides',
      'Asymmetric scrotum',
      'Testis felt in groin but not in scrotum',
      'Usually painless',
      'Often discovered on newborn examination',
      'May be discovered at later age'
    ],
    riskFactors: [
      'Premature birth (15-30% of premature boys)',
      'Low birth weight',
      'Family history',
      'Maternal smoking during pregnancy',
      'Gestational diabetes',
      'Certain genetic syndromes'
    ],
    complications: [
      'Infertility (if untreated, especially bilateral)',
      'Testicular cancer risk (increased even after surgery)',
      'Testicular torsion (slightly increased risk)',
      'Inguinal hernia (often associated)',
      'Psychological impact'
    ],
    prevalence: '3% of full-term male newborns have an undescended testis. Most descend by 3 months of age. 1% still undescended at 1 year. 15-30% of premature boys affected.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Observation Period',
      duration: '0-6 months of age',
      description: 'Many undescended testes will descend spontaneously in the first few months of life. Surgery is typically performed if not descended by 6-12 months.',
      goals: [
        'Monitor for spontaneous descent',
        'Confirm true undescended vs retractile testis',
        'Plan timing of surgery'
      ],
      activities: [
        'Regular examination by pediatrician',
        'Confirm position of testis',
        'Distinguish from retractile testis',
        'Surgical referral if not descended by 6 months'
      ],
      warningSignsThisPhase: [
        'Bilateral non-palpable testes (may need hormone tests)',
        'Associated genital abnormalities'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Assessment',
      duration: '1-2 weeks before surgery',
      description: 'Surgical assessment, location of testis, and planning of approach.',
      goals: [
        'Confirm testis position',
        'Plan surgical approach',
        'Pre-operative preparation'
      ],
      activities: [
        'Clinical examination',
        'Ultrasound (limited usefulness)',
        'Laparoscopy planned if non-palpable',
        'General pre-operative assessment'
      ],
      warningSignsThisPhase: [
        'Bilateral non-palpable (consider disorders of sex development)',
        'Acute scrotal pain (torsion)'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Correction (Orchidopexy)',
      duration: 'Day of surgery',
      description: 'Surgery to bring the testis down into the scrotum and fix it in place. Performed as day surgery.',
      goals: [
        'Locate testis',
        'Mobilize testis',
        'Place testis in scrotum',
        'Fix testis in position'
      ],
      activities: [
        'Open or laparoscopic approach depending on testis location',
        'Inguinal orchidopexy for palpable testis',
        'Laparoscopy for non-palpable testis',
        'Repair of inguinal hernia if present'
      ],
      warningSignsThisPhase: [
        'Atrophic (very small) testis found',
        'Absent testis (vanishing testis)',
        'Very short vessels requiring staged procedure'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Recovery',
      duration: '4-6 weeks',
      description: 'Recovery period with activity restrictions to protect the repair.',
      goals: [
        'Wound healing',
        'Testis in good position',
        'Normal blood supply maintained',
        'Return to normal activities'
      ],
      activities: [
        'Wound care',
        'Pain management',
        'Activity restrictions',
        'Follow-up to confirm testis position'
      ],
      warningSignsThisPhase: [
        'Testicular swelling or discoloration',
        'Wound infection',
        'Testis ascending again'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric surgeon or pediatric urologist',
      'Pediatric anesthetist'
    ],
    investigations: [
      'Usually no investigations needed for palpable testis',
      'Ultrasound sometimes performed (limited usefulness)',
      'Hormone tests if bilateral non-palpable (rare)',
      'MRI rarely needed'
    ],
    medications: [
      {
        medication: 'Oral intake',
        instruction: 'fasting as directed',
        reason: 'General anesthesia'
      }
    ],
    fastingInstructions: 'No solid food for 6 hours, clear fluids up to 2-4 hours before (follow specific instructions)',
    dayBeforeSurgery: [
      'Normal activities',
      'Bath/shower child',
      'Prepare for day surgery discharge'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Favorite toy or comfort item',
      'Nappies if still using',
      'Car seat for journey home'
    ],
    dayOfSurgery: [
      'Follow fasting instructions exactly',
      'Dress child in comfortable clothes',
      'Arrive at designated time',
      'Parent can stay for anesthetic induction'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia, often with caudal or local anesthetic block for post-op pain',
    procedureDescription: 'INGUINAL ORCHIDOPEXY (palpable testis): An incision is made in the groin crease. The testis and spermatic cord are identified in the inguinal canal. Any associated hernia sac is divided. The cord is mobilized to allow the testis to reach the scrotum without tension. A second small incision is made in the scrotum, a pouch is created between skin and dartos muscle, and the testis is placed and fixed in this pouch. LAPAROSCOPIC APPROACH (non-palpable testis): A camera is inserted through the umbilicus to locate the testis. If found in the abdomen: vessels may be divided (Fowler-Stephens procedure, staged or single-stage) or standard orchidopexy performed. If vessels enter the internal ring, testis is usually in the canal. If absent (vanishing testis), no further surgery needed.',
    duration: '45-90 minutes depending on complexity',
    whatToExpect: 'Day surgery in most cases. Incision in groin and/or scrotum. Testis will be in scrotum after surgery. Some swelling is normal.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'No special positioning. Child may be more comfortable with legs slightly apart.',
      expectedSymptoms: [
        'Scrotal and groin swelling',
        'Bruising (may be significant)',
        'Mild to moderate pain',
        'Drowsiness from anesthesia'
      ],
      activityLevel: 'Gentle activity only. No straddle toys, rough play, or sports. Walking is fine.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Wounds covered with waterproof dressings. Keep dry. No baths - quick shower or sponge bath.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Dressings can usually be removed. Shower normally. Pat dry carefully.'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Wounds should be healed. Sutures usually dissolving. Bruising and swelling settling.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10) for 2-3 days',
      medications: [
        'Paracetamol regularly for 2-3 days',
        'Ibuprofen if needed',
        'Caudal block may provide 4-8 hours of pain relief'
      ],
      nonPharmacological: [
        'Loose clothing',
        'Supportive underwear in older boys',
        'Ice pack wrapped in cloth (not directly on skin)',
        'Distraction activities'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Straddle toys (bikes, ride-ons)',
        restriction: 'Avoid completely',
        duration: '4-6 weeks',
        reason: 'Protect testis position'
      },
      {
        activity: 'Rough play/sports',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Allow healing and secure fixation'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid until wounds healed',
        duration: '2 weeks',
        reason: 'Wound care'
      },
      {
        activity: 'School/daycare',
        restriction: 'Time off',
        duration: '3-5 days',
        reason: 'Comfort and wound protection'
      }
    ],
    dietaryGuidelines: [
      'Normal diet can resume once awake and alert',
      'May have reduced appetite initially',
      'Adequate fluids important',
      'High fiber to prevent constipation (straining causes discomfort)'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Settled at home, pain controlled, eating normally'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Swelling and bruising settling, wounds healing'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Full recovery, all activities resumed'
      }
    ],
    longTerm: [
      {
        timeframe: '3-6 months',
        expectation: 'Testis in good position, good size'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Normal testicular development, fertility optimized'
      }
    ],
    functionalRecovery: 'Excellent. Testis brought to normal position in 95%+ of cases. Fertility outcomes optimized by early surgery. Self-examination possible for cancer surveillance.',
    cosmeticOutcome: 'Groin scar (in skin crease, fades well) and small scrotal scar. Scrotum will appear more symmetric.',
    successRate: 'Primary orchidopexy success rate 95-98%. Testicular atrophy (shrinkage) in <5%. Re-do surgery needed in 2-5% for ascent.',
    possibleComplications: [
      'Testicular atrophy (2-5%)',
      'Testicular ascent (2-5% - may need redo)',
      'Wound infection (rare)',
      'Hematoma (bruising)',
      'Damage to vas deferens (rare)',
      'Inguinal hernia later (uncommon)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2-4 weeks',
        purpose: 'Wound check, confirm testis in scrotum'
      },
      {
        timing: '6 months',
        purpose: 'Confirm testis remains in position and is growing'
      },
      {
        timing: 'Long-term',
        purpose: 'Teach testicular self-examination at puberty'
      }
    ],
    rehabilitationNeeds: [
      'No specific rehabilitation',
      'Normal developmental activities',
      'Standard pediatric follow-up'
    ],
    lifestyleModifications: [
      'Learn testicular self-examination at puberty',
      'Awareness of slightly increased testicular cancer risk',
      'Regular self-checks monthly',
      'No restrictions on activities or sports after healing'
    ]
  },

  warningSigns: [
    'Testis appears to have gone back up',
    'Increasing scrotal swelling',
    'Wound redness or discharge',
    'Fever',
    'Severe pain',
    'Discolored (blue/dark) scrotum'
  ],

  emergencySigns: [
    'Acute severe testicular/scrotal pain (torsion risk)',
    'Scrotum becoming blue or very swollen',
    'High fever with wound changes',
    'Signs of significant bleeding'
  ],

  complianceRequirements: [
    {
      requirement: 'No straddle toys or rough play for 6 weeks',
      importance: 'critical',
      consequence: 'Trauma can dislodge testis or damage repair'
    },
    {
      requirement: 'Attend follow-up appointments',
      importance: 'critical',
      consequence: 'Confirm testis remains in position'
    },
    {
      requirement: 'Learn testicular self-examination',
      importance: 'important',
      consequence: 'Early detection of testicular cancer (slightly increased lifelong risk)'
    }
  ],

  whoGuidelines: [
    {
      title: 'Pediatric Urology Guidelines',
      reference: 'European Association of Urology / American Urological Association',
      keyPoints: [
        'Surgery recommended by 6-12 months of age',
        'Early surgery optimizes fertility outcomes',
        'Orchidopexy is the treatment of choice',
        'Hormonal treatment generally not recommended',
        'Lifelong testicular cancer surveillance important'
      ]
    }
  ]
};

// Export pediatric conditions part 2
export const pediatricSurgeryPart2 = [pediatricAppendicitis, undescendedTestis];
