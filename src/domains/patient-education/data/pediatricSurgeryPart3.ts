/**
 * Patient Education Content - Category F: Pediatric Surgical Conditions
 * Part 3: Pediatric Inguinal Hernia and Hirschsprung Disease
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and Pediatric Surgery Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Pediatric Inguinal Hernia
 */
export const pediatricInguinalHernia: EducationCondition = {
  id: 'pediatric-inguinal-hernia',
  name: 'Inguinal Hernia (Pediatric)',
  category: 'F',
  icdCode: 'K40',
  description: 'A pediatric inguinal hernia is a bulge in the groin area caused by a persistent opening (processus vaginalis) that allows abdominal contents to pass through. Unlike adult hernias, pediatric hernias are congenital (present from birth) rather than caused by weakness.',
  alternateNames: ['Groin Hernia in Children', 'Congenital Inguinal Hernia', 'Indirect Inguinal Hernia'],
  
  overview: {
    definition: 'In the developing fetus, a tunnel (processus vaginalis) extends from the abdomen into the groin to allow the testes to descend into the scrotum (in boys) or form the round ligament (in girls). Normally this tunnel closes before or shortly after birth. If it remains open (patent processus vaginalis), abdominal contents (usually bowel or fluid) can pass through, causing a hernia. Pediatric inguinal hernias are almost always "indirect" hernias and require surgical repair to prevent incarceration.',
    causes: [
      'Patent processus vaginalis (failure to close)',
      'Congenital condition (present from birth)',
      'Prematurity (less time for closure)',
      'Not caused by lifting or straining (different from adults)'
    ],
    symptoms: [
      'Bulge in groin, may extend into scrotum (boys) or labia (girls)',
      'Bulge appears with crying, coughing, or straining',
      'Bulge may reduce (go back in) when calm or lying down',
      'Usually painless unless incarcerated',
      'May be noticed during nappy changes or baths',
      'Can appear at any age in childhood'
    ],
    riskFactors: [
      'Prematurity (up to 30% of premature infants)',
      'Male gender (8-10 times more common)',
      'Family history',
      'Connective tissue disorders',
      'Conditions that increase abdominal pressure (VP shunt, peritoneal dialysis)',
      'Undescended testis',
      'Abdominal wall defects'
    ],
    complications: [
      'Incarceration (trapped contents - cannot be reduced)',
      'Strangulation (blood supply cut off - emergency)',
      'Bowel obstruction',
      'Testicular damage (if testicular vessels compressed)',
      'Ovarian damage in girls'
    ],
    prevalence: '1-5% of full-term infants, up to 30% of premature infants. Right side more common (60%), left (25%), bilateral (15%). More common in boys.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Surgical Planning',
      duration: '1-4 weeks',
      description: 'Diagnosis is clinical. Once diagnosed, surgery should be scheduled relatively soon to prevent incarceration.',
      goals: [
        'Confirm diagnosis',
        'Assess for contralateral hernia',
        'Plan surgery timing',
        'Educate parents on incarceration signs'
      ],
      activities: [
        'Clinical examination',
        'Usually no imaging needed',
        'Surgical consultation',
        'Pre-operative assessment',
        'Parent education on warning signs'
      ],
      medications: [
        {
          name: 'None routinely',
          purpose: 'No medications for hernia itself',
          duration: 'N/A'
        }
      ],
      warningSignsThisPhase: [
        'Hernia becoming irreducible',
        'Pain with the hernia',
        'Redness over hernia',
        'Vomiting with hernia'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Repair',
      duration: 'Day of surgery',
      description: 'Herniotomy - surgical repair by closing the processus vaginalis. Usually performed as day surgery.',
      goals: [
        'Divide and ligate processus vaginalis',
        'Return contents to abdomen',
        'Assess other side if indicated'
      ],
      activities: [
        'Open or laparoscopic repair',
        'Inguinal incision and high ligation of sac',
        'Contralateral exploration in selected cases',
        'No mesh used in children (unlike adults)'
      ],
      warningSignsThisPhase: [
        'Incarcerated hernia requiring emergency surgery',
        'Bowel damage from incarceration',
        'Difficulty with vas deferens'
      ]
    },
    {
      phase: 3,
      name: 'Post-Operative Recovery',
      duration: '1-2 weeks',
      description: 'Simple recovery with activity restrictions to protect the repair.',
      goals: [
        'Wound healing',
        'Pain control',
        'Return to normal activities'
      ],
      activities: [
        'Wound care',
        'Pain management',
        'Progressive return to activities',
        'Monitor for complications'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Swelling of scrotum/labia',
        'Recurrence of bulge'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric surgeon',
      'Pediatric anesthetist'
    ],
    investigations: [
      'Usually no investigations needed',
      'Ultrasound if diagnosis uncertain',
      'Routine blood tests not required for healthy children'
    ],
    medications: [
      {
        medication: 'Oral intake',
        instruction: 'follow fasting guidelines',
        reason: 'General anesthesia'
      }
    ],
    fastingInstructions: 'Breast milk up to 4 hours before, formula/food 6 hours before, clear fluids 2 hours before (follow specific instructions)',
    dayBeforeSurgery: [
      'Normal activities',
      'Bath child',
      'Prepare for day surgery'
    ],
    whatToBring: [
      'Comfortable loose clothing',
      'Favorite comfort item',
      'Nappies if applicable',
      'Formula/breast milk for after surgery',
      'Car seat'
    ],
    dayOfSurgery: [
      'Follow fasting guidelines exactly',
      'Dress in comfortable clothes',
      'Arrive at designated time',
      'Parent can stay for anesthetic'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia, often with caudal or local anesthetic block',
    procedureDescription: 'INGUINAL HERNIOTOMY: A small incision (2-3cm) is made in the groin skin crease. The hernia sac (processus vaginalis) is identified at the level of the internal ring. The sac is carefully separated from the spermatic cord structures (vas deferens and vessels), divided, and the upper part is ligated (tied off) at the internal ring. No mesh is used in children as this is not a weakness repair but closure of a congenital opening. LAPAROSCOPIC REPAIR: Camera through umbilicus allows visualization of internal ring on both sides. The processus is closed with sutures. Allows easy visualization and repair of bilateral hernias.',
    duration: '30-45 minutes (unilateral), 45-60 minutes (bilateral)',
    whatToExpect: 'Day surgery. Single groin incision. Dissolving sutures. Can go home when eating and comfortable. Scrotal swelling is common.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'No special positioning. May be more comfortable with slightly elevated legs.',
      expectedSymptoms: [
        'Groin and scrotal swelling (normal)',
        'Bruising',
        'Mild to moderate pain',
        'Fussiness'
      ],
      activityLevel: 'Gentle activity. Walking fine. No straddle toys, rough play, or climbing.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Wound covered with waterproof dressing. Keep dry. Sponge bath or quick shower.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Dressing can be removed. Shower normally. No baths until wound healed.'
      },
      {
        day: 'Week 2',
        instruction: 'Wound should be healed. Sutures dissolving. Normal bathing can resume.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10) for 1-3 days',
      medications: [
        'Paracetamol regularly for 2-3 days',
        'Ibuprofen if needed',
        'Caudal block provides initial pain relief'
      ],
      nonPharmacological: [
        'Loose clothing',
        'Comfort measures (holding, distraction)',
        'Cool pack wrapped in cloth if needed'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Straddle toys (bikes, ride-ons)',
        restriction: 'Avoid',
        duration: '2-3 weeks',
        reason: 'Pressure on wound'
      },
      {
        activity: 'Rough play/climbing/sports',
        restriction: 'Avoid',
        duration: '2-3 weeks',
        reason: 'Protect repair'
      },
      {
        activity: 'Swimming/baths',
        restriction: 'Shower only until wound healed',
        duration: '7-10 days',
        reason: 'Keep wound dry'
      },
      {
        activity: 'Daycare/school',
        restriction: 'Time off',
        duration: '3-5 days',
        reason: 'Comfort and activity limitation'
      }
    ],
    dietaryGuidelines: [
      'Normal diet once awake',
      'May have reduced appetite initially',
      'Ensure adequate fluids',
      'High fiber to prevent constipation'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'Same day',
        expectation: 'Home, comfortable, eating'
      },
      {
        timeframe: '1 week',
        expectation: 'Swelling settling, back to light activities'
      },
      {
        timeframe: '2-3 weeks',
        expectation: 'Full activities resumed'
      }
    ],
    longTerm: [
      {
        timeframe: '1-3 months',
        expectation: 'Complete healing'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Excellent - hernia should not recur'
      }
    ],
    functionalRecovery: 'Excellent. Complete cure expected. No long-term restrictions or effects.',
    cosmeticOutcome: 'Scar in groin crease (2-3cm), fades very well. Often barely visible after 1 year.',
    successRate: 'Recurrence rate <1%. Excellent outcomes. Testicular problems rare (<1%).',
    possibleComplications: [
      'Wound infection (1-2%)',
      'Scrotal swelling/hematoma (common, temporary)',
      'Recurrence (<1%)',
      'Vas deferens injury (rare)',
      'Testicular atrophy (rare, more common if incarcerated)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check (may be phone review)'
      },
      {
        timing: '6 weeks',
        purpose: 'Confirm healing if concerns'
      }
    ],
    rehabilitationNeeds: [
      'No specific rehabilitation',
      'Normal developmental activities',
      'Standard pediatric care'
    ],
    lifestyleModifications: [
      'No long-term modifications needed',
      'Normal activities and sports after healing',
      'Report new bulges'
    ]
  },

  warningSigns: [
    'New bulge appearing',
    'Wound redness, swelling, or discharge',
    'Fever',
    'Increasing swelling',
    'Pain not controlled with simple analgesia',
    'Not eating'
  ],

  emergencySigns: [
    'Hard, painful, non-reducible bulge (incarcerated)',
    'Vomiting with groin bulge',
    'Abdominal distension',
    'High fever',
    'Scrotal discoloration (blue/dark)'
  ],

  complianceRequirements: [
    {
      requirement: 'Avoid straddle toys for 2-3 weeks',
      importance: 'important',
      consequence: 'Prevents wound disruption'
    },
    {
      requirement: 'Avoid rough play',
      importance: 'important',
      consequence: 'Protects repair'
    },
    {
      requirement: 'Return immediately if incarceration signs',
      importance: 'critical',
      consequence: 'Incarceration requires emergency surgery'
    }
  ],

  whoGuidelines: [
    {
      title: 'Pediatric Surgery Guidelines',
      reference: 'APSA/EUPSA Guidelines',
      keyPoints: [
        'All pediatric inguinal hernias should be repaired',
        'Surgery should not be unduly delayed due to incarceration risk',
        'Premature infants at higher risk for incarceration',
        'No mesh used in pediatric hernia repair',
        'Laparoscopic approach allows bilateral visualization'
      ]
    }
  ]
};

/**
 * Hirschsprung Disease
 */
export const hirschsprungDisease: EducationCondition = {
  id: 'pediatric-hirschsprung',
  name: 'Hirschsprung Disease',
  category: 'F',
  icdCode: 'Q43.1',
  description: 'Hirschsprung disease is a birth defect where nerve cells (ganglion cells) are missing from part of the large bowel, preventing normal bowel movements. This causes severe constipation or bowel obstruction from birth.',
  alternateNames: ['Congenital Megacolon', 'Aganglionic Megacolon', 'Congenital Aganglionosis'],
  
  overview: {
    definition: 'Hirschsprung disease occurs when nerve cells (ganglion cells) that normally control the muscles of the bowel wall fail to develop in the final portion of the large intestine. Without these nerve cells, the affected segment cannot relax, creating a functional obstruction. Stool backs up, causing the normal bowel above to become dilated (megacolon). The condition affects the rectum and a variable length of colon - most commonly the rectosigmoid (short-segment, 80%), but can involve the entire colon (total colonic, 5-10%) or rarely the small bowel.',
    causes: [
      'Failure of nerve cell migration during fetal development',
      'Genetic factors (multiple genes involved)',
      'Associated with Down syndrome (10%)',
      'Associated with other conditions (MEN2, Waardenburg syndrome)',
      'Usually sporadic (not inherited), but can be familial'
    ],
    symptoms: [
      'Failure to pass meconium within 48 hours of birth',
      'Abdominal distension in newborn',
      'Vomiting (may be bilious/green)',
      'Poor feeding',
      'Severe constipation from birth',
      '"Explosive" stool after rectal examination',
      'Failure to thrive',
      'Episodes of enterocolitis (dangerous intestinal infection)'
    ],
    riskFactors: [
      'Male gender (4:1 male predominance)',
      'Family history (4% if sibling affected, higher if parent)',
      'Down syndrome (2-15% of Down syndrome have Hirschsprung)',
      'Other congenital anomalies',
      'Associated syndromes'
    ],
    complications: [
      'Enterocolitis (life-threatening bowel infection)',
      'Bowel perforation',
      'Malnutrition',
      'Fluid and electrolyte imbalances',
      'Delayed diagnosis complications'
    ],
    prevalence: '1 in 5,000 live births. More common in males. Can run in families, especially longer segment disease.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Stabilization',
      duration: 'Days to weeks',
      description: 'Diagnosis through rectal biopsy, stabilization with bowel decompression, and surgical planning.',
      goals: [
        'Confirm diagnosis with rectal biopsy',
        'Determine length of aganglionic segment',
        'Stabilize the child',
        'Prevent enterocolitis',
        'Plan definitive surgery'
      ],
      activities: [
        'Rectal suction biopsy (diagnostic)',
        'Contrast enema (shows transition zone)',
        'Rectal washouts/irrigation',
        'IV fluids and nutrition',
        'Possibly stoma formation if very ill'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'If enterocolitis suspected or present',
          duration: 'As needed'
        },
        {
          name: 'IV fluids',
          purpose: 'Hydration and electrolyte balance',
          duration: 'Until stable'
        }
      ],
      warningSignsThisPhase: [
        'Enterocolitis (fever, explosive diarrhea, distension)',
        'Perforation',
        'Severe dehydration'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Preparation',
      duration: 'Days to weeks',
      description: 'Regular rectal washouts to keep bowel decompressed, nutritional optimization, and surgical planning.',
      goals: [
        'Keep bowel decompressed',
        'Optimize nutrition',
        'Plan surgical approach',
        'Prevent enterocolitis'
      ],
      activities: [
        'Daily or twice-daily rectal washouts',
        'Nutritional support',
        'Contrast studies to define transition zone',
        'Biopsy mapping if long segment suspected',
        'Teach parents rectal washout technique'
      ],
      warningSignsThisPhase: [
        'Inadequate decompression',
        'Signs of enterocolitis',
        'Failure to thrive'
      ]
    },
    {
      phase: 3,
      name: 'Definitive Surgical Treatment',
      duration: 'Day of surgery',
      description: 'Pull-through surgery to remove the aganglionic segment and connect normal bowel to the anus.',
      goals: [
        'Remove aganglionic bowel',
        'Preserve sphincter function',
        'Restore bowel continuity',
        'Confirm ganglion cells at anastomosis'
      ],
      activities: [
        'Laparoscopic-assisted or open transanal pull-through',
        'Swenson, Duhamel, or Soave technique',
        'Frozen section biopsy to confirm ganglion cells',
        'Primary anastomosis or staged if stoma present'
      ],
      warningSignsThisPhase: [
        'Total colonic aganglionosis',
        'Anastomotic complications',
        'Unexpected short bowel'
      ]
    },
    {
      phase: 4,
      name: 'Post-Operative Recovery',
      duration: 'Weeks to months',
      description: 'Initial hospital recovery followed by long-term management of stooling pattern.',
      goals: [
        'Establish bowel function',
        'Manage frequent stools',
        'Prevent anastomotic complications',
        'Prevent enterocolitis',
        'Achieve bowel control'
      ],
      activities: [
        'Gradual feeding advancement',
        'Monitor stooling pattern',
        'Perianal skin care (frequent stools)',
        'Anal dilations if stricture',
        'Constipation management',
        'Enterocolitis prevention protocol'
      ],
      warningSignsThisPhase: [
        'Anastomotic leak or stricture',
        'Enterocolitis (remains a risk)',
        'Ongoing obstructive symptoms',
        'Severe perianal excoriation'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric surgeon',
      'Pediatric gastroenterologist',
      'Pediatric anesthetist',
      'Dietitian'
    ],
    investigations: [
      'Rectal suction biopsy (absence of ganglion cells)',
      'Contrast enema (transition zone)',
      'Anorectal manometry (absence of recto-anal inhibitory reflex)',
      'Full blood count',
      'Electrolytes',
      'Blood type and crossmatch'
    ],
    medications: [
      {
        medication: 'Continue rectal washouts',
        instruction: 'as per hospital protocol',
        reason: 'Keep bowel decompressed'
      }
    ],
    fastingInstructions: 'Nil by mouth as directed. IV fluids will maintain hydration.',
    dayBeforeSurgery: [
      'Rectal washouts as directed',
      'May be admitted day before for bowel prep',
      'IV fluids started',
      'Keep warm and comfortable'
    ],
    whatToBring: [
      'Comfort items for baby/child',
      'Nappies',
      'Formula or breast pump',
      'Parent essentials for extended stay',
      'Barrier cream for later'
    ],
    dayOfSurgery: [
      'Nil by mouth',
      'IV fluids running',
      'Rectal washout morning of surgery',
      'Parents can accompany'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia',
    procedureDescription: 'PULL-THROUGH SURGERY: The goal is to remove the aganglionic (affected) bowel and bring normal ganglionic bowel down to the anus. Several techniques exist: TRANSANAL ENDORECTAL PULL-THROUGH (Soave modification): Most common modern approach. Laparoscopy identifies the transition zone and confirms ganglion cells with frozen section biopsy. The normal bowel is mobilized. Working through the anus, the rectal mucosa is stripped and the normal colon is pulled through the residual rectal cuff and anastomosed just above the anus. DUHAMEL PROCEDURE: Normal bowel brought behind the rectum. SWENSON PROCEDURE: Complete removal of aganglionic segment. The surgery may be one-stage (primary pull-through) or staged with an initial colostomy if the child is very sick, followed by pull-through later.',
    duration: '2-4 hours',
    whatToExpect: 'Major surgery. May be laparoscopic-assisted. Hospital stay 3-7 days. May have initial stoma if staged approach.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Comfortable position. Perianal area needs protection.',
      expectedSymptoms: [
        'Abdominal discomfort',
        'Frequent loose stools (expected and normal initially)',
        'Perianal irritation from frequent stools',
        'Drowsiness from anesthesia'
      ],
      activityLevel: 'Gentle movement as tolerated. Normal infant handling.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Abdominal wounds kept clean and dry. Perianal area needs barrier cream at every nappy change.'
      },
      {
        day: 'Weeks 1-4',
        instruction: 'Continue perianal skin protection. Frequent nappy changes. Abdominal wounds healing.'
      },
      {
        day: 'Ongoing',
        instruction: 'Perianal care continues as long as stools frequent and loose.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate initially, improving over days',
      medications: [
        'IV pain relief initially',
        'Transition to oral paracetamol and ibuprofen',
        'May need opioids short-term'
      ],
      nonPharmacological: [
        'Comfort positioning',
        'Sitz baths for perianal comfort (older children)',
        'Distraction'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Normal activity',
        restriction: 'As tolerated',
        duration: 'Variable',
        reason: 'Recovery'
      },
      {
        activity: 'Strenuous activity',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Allow healing'
      }
    ],
    dietaryGuidelines: [
      'Gradual feeding advancement after surgery',
      'Breastfeeding can continue',
      'Normal diet for age once tolerating',
      'May need thickened feeds or dietary adjustments',
      'Adequate fluids to prevent constipation'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Home, frequent stools (up to 10-20/day initially)'
      },
      {
        timeframe: '1-3 months',
        expectation: 'Stool frequency decreasing, perianal skin improving'
      },
      {
        timeframe: '6-12 months',
        expectation: 'More formed stools, fewer per day'
      }
    ],
    longTerm: [
      {
        timeframe: '1-3 years',
        expectation: 'Toilet training achieved (may be delayed)'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Most achieve social continence, may have ongoing management needs'
      }
    ],
    functionalRecovery: 'Most children (90%) achieve social continence. Some have ongoing constipation or soiling requiring management. Quality of life is generally good.',
    cosmeticOutcome: 'Laparoscopic: small abdominal scars. Transanal: minimal or no visible scars. Stoma scars if staged approach.',
    successRate: 'Cure of obstruction in 95%+. Functional outcomes: 90% achieve social continence, 10% have persistent issues requiring ongoing management.',
    possibleComplications: [
      'Enterocolitis (can occur even after surgery - 10-30%)',
      'Anastomotic stricture (may need dilations)',
      'Anastomotic leak (rare)',
      'Constipation (common, 10-30%)',
      'Soiling/incontinence (10-20%)',
      'Recurrent obstruction'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check, stooling pattern assessment'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess function, may need anal dilatation assessment'
      },
      {
        timing: '3, 6, 12 months',
        purpose: 'Ongoing functional assessment'
      },
      {
        timing: 'Long-term',
        purpose: 'Bowel management, enterocolitis surveillance'
      }
    ],
    rehabilitationNeeds: [
      'Bowel management program',
      'Dietitian input',
      'Toilet training support (may be delayed)',
      'Psychological support if needed'
    ],
    lifestyleModifications: [
      'Know signs of enterocolitis (fever, distension, diarrhea)',
      'Bowel management routine',
      'Adequate hydration and fiber',
      'May need regular washouts if recurrent enterocolitis',
      'Normal school and activities'
    ]
  },

  warningSigns: [
    'Abdominal distension',
    'Fever with diarrhea (enterocolitis)',
    'Refusing feeds',
    'Vomiting',
    'Lethargy',
    'Excessive constipation',
    'Bloody diarrhea',
    'Not passing stool (if stricture)'
  ],

  emergencySigns: [
    'Signs of enterocolitis: fever + explosive diarrhea + distension',
    'Severe abdominal distension',
    'Bilious vomiting',
    'Child very unwell',
    'Signs of dehydration'
  ],

  complianceRequirements: [
    {
      requirement: 'Know and watch for enterocolitis signs',
      importance: 'critical',
      consequence: 'Enterocolitis is life-threatening but treatable if caught early'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Long-term monitoring essential for good outcomes'
    },
    {
      requirement: 'Follow bowel management program',
      importance: 'important',
      consequence: 'Reduces constipation and enterocolitis risk'
    },
    {
      requirement: 'Perianal skin care',
      importance: 'important',
      consequence: 'Prevents severe skin breakdown'
    }
  ],

  whoGuidelines: [
    {
      title: 'Pediatric Colorectal Surgery Guidelines',
      reference: 'APSA/IPEG Guidelines',
      keyPoints: [
        'Diagnosis by rectal biopsy (absence of ganglion cells)',
        'Pull-through surgery is definitive treatment',
        'Single-stage transanal pull-through is preferred when safe',
        'Enterocolitis risk persists lifelong',
        'Long-term follow-up is essential'
      ]
    }
  ]
};

// Export pediatric conditions part 3
export const pediatricSurgeryPart3 = [pediatricInguinalHernia, hirschsprungDisease];
