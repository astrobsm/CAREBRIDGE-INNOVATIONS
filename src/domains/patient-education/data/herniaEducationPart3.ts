/**
 * Patient Education Content - Category E: Hernia
 * Part 3: Umbilical Hernia and Epigastric Hernia
 * 
 * AstroHEALTH Innovations in Healthcare
 * Content aligned with WHO Guidelines and European Hernia Society Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Umbilical Hernia
 */
export const umbilicalHernia: EducationCondition = {
  id: 'hernia-umbilical',
  name: 'Umbilical Hernia',
  category: 'E',
  icdCode: 'K42',
  description: 'An umbilical hernia occurs when abdominal contents protrude through a weakness at or near the umbilicus (navel). It is common in both children and adults, with different management approaches for each.',
  alternateNames: ['Navel Hernia', 'Belly Button Hernia', 'Para-umbilical Hernia', 'Periumbilical Hernia'],
  
  overview: {
    definition: 'An umbilical hernia develops when intra-abdominal contents (fat or bowel) push through a weakness in the abdominal wall at or around the umbilicus. In infants, these are true umbilical hernias through the umbilical ring and often close spontaneously by age 4-5. In adults, these are usually para-umbilical hernias through a defect adjacent to the umbilicus and do not resolve without surgery. Adult umbilical hernias have higher risk of incarceration than other hernias.',
    causes: [
      'Congenital weakness (infants)',
      'Increased abdominal pressure',
      'Obesity (major factor in adults)',
      'Pregnancy (especially multiple pregnancies)',
      'Ascites (fluid in abdomen)',
      'Chronic cough',
      'Heavy lifting',
      'Prior abdominal surgery'
    ],
    symptoms: [
      'Bulge at or near the belly button',
      'Bulge increases with straining or standing',
      'Usually reducible initially',
      'Discomfort or pain at site',
      'May become larger over time',
      'Skin over large hernias may be thin or discolored',
      'May be asymptomatic (found incidentally)'
    ],
    riskFactors: [
      'Obesity (strongest risk factor in adults)',
      'Multiple pregnancies',
      'Premature birth (infants)',
      'African descent (infants)',
      'Ascites',
      'Chronic liver disease',
      'Dialysis',
      'Previous abdominal surgery'
    ],
    complications: [
      'Incarceration (trapped contents)',
      'Strangulation (cut off blood supply)',
      'Bowel obstruction',
      'Skin ulceration (large hernias)',
      'Recurrence after repair'
    ],
    prevalence: 'Umbilical hernias affect 10-30% of infants, with most closing by age 5. Adult umbilical hernias are common, especially in obese patients and those with cirrhosis.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment Phase',
      duration: '1-2 weeks',
      description: 'Clinical assessment, imaging if needed, and decision-making regarding management.',
      goals: [
        'Confirm diagnosis',
        'Assess defect size',
        'Identify hernia contents',
        'Determine surgical candidacy',
        'Optimize patient factors'
      ],
      activities: [
        'Physical examination',
        'Ultrasound or CT scan if needed',
        'Assessment of obesity and comorbidities',
        'Pre-operative optimization'
      ],
      warningSignsThisPhase: [
        'Hernia becoming painful',
        'Unable to reduce hernia',
        'Signs of obstruction'
      ]
    },
    {
      phase: 2,
      name: 'Pre-Operative Optimization',
      duration: 'Variable (weeks to months)',
      description: 'Weight loss and risk factor optimization before elective repair, especially for larger hernias.',
      goals: [
        'Weight reduction (if obese)',
        'Smoking cessation',
        'Optimize comorbidities',
        'Reduce recurrence risk'
      ],
      activities: [
        'Weight loss program',
        'Smoking cessation',
        'Diabetes control',
        'Manage ascites if present'
      ],
      medications: [
        {
          name: 'Diuretics',
          purpose: 'Control ascites if present',
          duration: 'Pre and post-operatively'
        }
      ],
      warningSignsThisPhase: [
        'Hernia becoming incarcerated',
        'Increasing symptoms'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Repair',
      duration: 'Day surgery (usually)',
      description: 'Surgical repair via open or laparoscopic approach with suture or mesh repair depending on defect size.',
      goals: [
        'Reduce hernia contents',
        'Close fascial defect',
        'Reinforce with mesh if indicated',
        'Preserve umbilicus cosmetically'
      ],
      activities: [
        'Day surgery or short stay',
        'Local, regional, or general anesthesia',
        'Open repair (most common) or laparoscopic',
        'Suture repair for small defects (<2cm)',
        'Mesh repair for larger defects'
      ],
      warningSignsThisPhase: [
        'Bowel injury',
        'Cannot achieve primary closure'
      ]
    },
    {
      phase: 4,
      name: 'Recovery Phase',
      duration: '2-6 weeks',
      description: 'Post-operative recovery with activity restrictions to allow healing.',
      goals: [
        'Wound healing',
        'Pain control',
        'Return to activities',
        'Prevent recurrence'
      ],
      activities: [
        'Wound care',
        'Progressive activity',
        'Weight management ongoing',
        'Support garment if needed'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Seroma',
        'Recurrence'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General surgeon',
      'Anesthetist',
      'Physician for medical optimization',
      'Dietitian for weight management'
    ],
    investigations: [
      'Ultrasound of abdominal wall (optional)',
      'CT scan for large or complex hernias',
      'Complete blood count',
      'Coagulation profile',
      'Blood glucose',
      'Liver function (if ascites)',
      'ECG if indicated'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Smoking',
        instruction: 'stop 4 weeks before',
        reason: 'Improves wound healing and reduces recurrence'
      }
    ],
    fastingInstructions: 'Nothing by mouth from midnight before surgery',
    dayBeforeSurgery: [
      'Light evening meal',
      'Shower with normal soap',
      'Arrange someone to drive you home (if day surgery)'
    ],
    whatToBring: [
      'Comfortable loose clothing',
      'Driver for discharge',
      'List of medications'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink',
      'Take approved medications with sip of water',
      'Shower morning of surgery',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia, regional (spinal), or local anesthesia with sedation',
    procedureDescription: 'OPEN REPAIR (most common): A curved incision is made below the umbilicus. The hernia sac is identified and opened, contents reduced, and the sac excised or inverted. For small defects (<2cm), suture closure of the fascial edges is performed. For larger defects, mesh is placed (usually in retrorectus or preperitoneal position). The umbilicus is preserved and secured to the repaired fascia. LAPAROSCOPIC REPAIR: Used for larger or recurrent hernias. Mesh is placed intraperitoneally or in retrorectus space via keyhole approach.',
    duration: '30-60 minutes (open small hernia), 60-90 minutes (larger or laparoscopic)',
    whatToExpect: 'Usually day surgery. Discharged same day with simple dressing. Umbilicus will look slightly different initially but settles.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'No special positioning required. Avoid straining when getting up.',
      expectedSymptoms: [
        'Mild to moderate pain around umbilicus',
        'Bruising and swelling',
        'Umbilicus may look different initially',
        'Some discomfort with movement'
      ],
      activityLevel: 'Walk on day of surgery. Can perform light activities at home. Avoid straining.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep dressing dry. No shower initially. Monitor for increased swelling or discharge.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Can shower with dressing removed. Pat dry. Monitor wound for infection.'
      },
      {
        day: 'Weeks 1-2',
        instruction: 'Wound should be healed. Sutures removed if not dissolving. Scar will be visible.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate (3-5/10) for first few days',
      medications: [
        'Paracetamol regularly',
        'NSAIDs if not contraindicated',
        'Mild opioid for breakthrough pain'
      ],
      nonPharmacological: [
        'Ice pack to area (not directly on skin)',
        'Support abdomen when coughing',
        'Pillows for comfortable positioning'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: '4-6 weeks',
        reason: 'Allow fascia to heal'
      },
      {
        activity: 'Driving',
        restriction: 'When off pain medications and can perform emergency stop',
        duration: '1-2 weeks',
        reason: 'Safety'
      },
      {
        activity: 'Work',
        restriction: 'Desk work 1-2 weeks, physical work 4-6 weeks',
        duration: 'As above',
        reason: 'Allow adequate healing'
      },
      {
        activity: 'Exercise',
        restriction: 'Light walking immediately, gym/core work after 6 weeks',
        duration: '6 weeks',
        reason: 'Protect repair'
      }
    ],
    dietaryGuidelines: [
      'Normal diet can be resumed',
      'High fiber to prevent constipation',
      'Adequate protein for healing',
      'Continue weight management if started pre-operatively',
      'Avoid excessive weight gain'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 days',
        expectation: 'Managing at home with oral analgesia'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Wound healed, light activities resumed'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Full activities resumed'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Complete healing, low risk of recurrence'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Durable repair if weight maintained'
      }
    ],
    functionalRecovery: 'Excellent. Most patients return to full activities without restrictions after healing.',
    cosmeticOutcome: 'Umbilicus preserved but may look slightly different. Scar typically hidden within or below umbilicus.',
    successRate: 'Suture repair for small defects: 5-10% recurrence. Mesh repair: 1-5% recurrence. Recurrence higher with ongoing obesity.',
    possibleComplications: [
      'Wound infection (2-5%)',
      'Seroma (fluid collection)',
      'Recurrence (varies by technique)',
      'Chronic pain (uncommon)',
      'Mesh complications (rare)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, suture removal if needed'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Confirm healing, clear for full activities'
      },
      {
        timing: 'As needed',
        purpose: 'If concerns about recurrence'
      }
    ],
    rehabilitationNeeds: [
      'Core strengthening after full healing',
      'Weight management ongoing',
      'Proper lifting technique education'
    ],
    lifestyleModifications: [
      'Maintain healthy weight (prevents recurrence)',
      'Avoid rapid weight gain',
      'Proper lifting technique',
      'Core strengthening exercises',
      'Treat chronic cough',
      'Prevent constipation'
    ]
  },

  warningSigns: [
    'Increasing pain after initial improvement',
    'Wound redness, swelling, or discharge',
    'Fever',
    'New bulge appearing at repair site',
    'Nausea or vomiting'
  ],

  emergencySigns: [
    'Severe abdominal pain',
    'Inability to pass gas or stool',
    'Vomiting with distended abdomen',
    'High fever with wound changes'
  ],

  complianceRequirements: [
    {
      requirement: 'Avoid heavy lifting for 4-6 weeks',
      importance: 'critical',
      consequence: 'Early strain can cause repair failure'
    },
    {
      requirement: 'Maintain weight loss',
      importance: 'critical',
      consequence: 'Weight gain is major cause of recurrence'
    },
    {
      requirement: 'Attend follow-up appointments',
      importance: 'important',
      consequence: 'Early detection of complications'
    }
  ],

  whoGuidelines: [
    {
      title: 'European Hernia Society Guidelines',
      reference: 'EHS 2020',
      keyPoints: [
        'Small asymptomatic umbilical hernias may be observed',
        'Symptomatic umbilical hernias should be repaired',
        'Mesh recommended for defects >2cm',
        'Weight optimization before elective repair',
        'Cirrhotic patients need specialized management'
      ]
    }
  ]
};

/**
 * Epigastric Hernia
 */
export const epigastricHernia: EducationCondition = {
  id: 'hernia-epigastric',
  name: 'Epigastric Hernia',
  category: 'E',
  icdCode: 'K43.9',
  description: 'An epigastric hernia occurs in the midline of the upper abdomen, between the umbilicus and the xiphoid process (lower end of the breastbone), where the linea alba (midline tendon) is weakest.',
  alternateNames: ['Ventral Hernia', 'Linea Alba Hernia', 'Midline Hernia', 'Supraumbilical Hernia'],
  
  overview: {
    definition: 'An epigastric hernia develops through a defect in the linea alba (the fibrous band running down the center of the abdomen) between the umbilicus and the xiphoid. These hernias typically contain preperitoneal fat (not bowel) and are often small but can cause significant pain. Multiple small epigastric hernias are common. The linea alba is wider and weaker above the umbilicus, explaining why these hernias occur in this location.',
    causes: [
      'Congenital weakness in linea alba',
      'Natural gap where blood vessels pass through',
      'Increased abdominal pressure',
      'Obesity',
      'Pregnancy',
      'Heavy lifting',
      'Previous surgery in the area',
      'Aging and tissue weakening'
    ],
    symptoms: [
      'Small firm lump in upper midline abdomen',
      'Pain or tenderness at the lump (often more painful than expected for size)',
      'Pain worse after eating',
      'Pain with exertion or straining',
      'May be asymptomatic',
      'Often not reducible',
      'Multiple lumps may be present'
    ],
    riskFactors: [
      'Male gender (3:1 male predominance)',
      'Age 20-50 years',
      'Obesity',
      'Heavy physical work',
      'Previous abdominal surgery',
      'Diastasis recti'
    ],
    complications: [
      'Incarceration of fat (painful but not dangerous)',
      'Rarely, bowel incarceration (larger hernias)',
      'Chronic pain',
      'Multiple hernias developing'
    ],
    prevalence: 'Epigastric hernias occur in 3-5% of the population. They are more common in men and often occur in multiples.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Decision',
      duration: '1-2 weeks',
      description: 'Clinical diagnosis and decision regarding surgical repair. Asymptomatic small hernias may be observed.',
      goals: [
        'Confirm diagnosis',
        'Assess symptoms',
        'Rule out other causes of lump',
        'Determine need for surgery'
      ],
      activities: [
        'Physical examination',
        'Ultrasound if diagnosis uncertain',
        'CT scan for complex cases',
        'Discuss management options'
      ],
      warningSignsThisPhase: [
        'Severe pain suggesting incarceration',
        'Rapid increase in size'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Repair',
      duration: 'Day surgery',
      description: 'Surgical repair of the hernia defect, typically done as day surgery under local or general anesthesia.',
      goals: [
        'Excise incarcerated fat',
        'Close fascial defect',
        'Address multiple defects if present',
        'Reinforce with mesh for larger defects'
      ],
      activities: [
        'Usually open repair via small midline incision',
        'Identify and excise herniated fat',
        'Primary suture closure for small defects',
        'Mesh repair for larger or multiple defects',
        'May combine with diastasis repair'
      ],
      warningSignsThisPhase: [
        'Finding of unexpected bowel in hernia',
        'Multiple defects requiring extensive repair'
      ]
    },
    {
      phase: 3,
      name: 'Recovery Phase',
      duration: '2-4 weeks',
      description: 'Post-operative recovery with return to normal activities.',
      goals: [
        'Wound healing',
        'Pain resolution',
        'Return to activities',
        'Prevent recurrence'
      ],
      activities: [
        'Simple wound care',
        'Progressive activity',
        'Return to work',
        'Core strengthening after healing'
      ],
      warningSignsThisPhase: [
        'Wound infection',
        'Persistent pain',
        'New lumps appearing'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'General surgeon',
      'Anesthetist (if general anesthesia planned)'
    ],
    investigations: [
      'Usually no investigations needed for simple epigastric hernia',
      'Ultrasound if diagnosis uncertain',
      'CT scan if multiple or large defects suspected',
      'Basic blood tests if general anesthesia'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'stop as directed',
        reason: 'Reduce bleeding risk'
      },
      {
        medication: 'Anti-inflammatory medications',
        instruction: 'may need to stop',
        reason: 'Bleeding and healing considerations'
      }
    ],
    fastingInstructions: 'Nothing by mouth for 6 hours before surgery (may be shorter for local anesthesia)',
    dayBeforeSurgery: [
      'Normal activities',
      'Light evening meal',
      'Arrange transport home'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Driver for discharge',
      'List of medications'
    ],
    dayOfSurgery: [
      'Nothing to eat or drink as directed',
      'Shower normally',
      'Wear comfortable clothes',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Local anesthesia with sedation, or general anesthesia',
    procedureDescription: 'OPEN REPAIR: A small vertical incision (3-5cm) is made over the hernia. The hernia sac containing preperitoneal fat is identified and excised. The fascial defect is closed with strong sutures. If the defect is larger than 2cm or there are multiple defects, mesh reinforcement may be used. The linea alba is palpated throughout to identify additional small hernias. For patients with diastasis recti (separation of rectus muscles), a more extensive repair may be performed. LAPAROSCOPIC REPAIR: Occasionally used for recurrent or multiple hernias, with mesh placed behind the defect.',
    duration: '30-45 minutes for simple repair',
    whatToExpect: 'Day surgery. Small incision in upper abdomen. Local anesthesia may be sufficient. Discharge within a few hours.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'No special positioning. Avoid straining when getting up from lying down.',
      expectedSymptoms: [
        'Mild pain at repair site',
        'Some bruising',
        'Small dressing in place',
        'May feel some tightness'
      ],
      activityLevel: 'Can walk immediately. Light activities same day. No driving if sedated.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Keep dressing dry. Can remove after 24-48 hours if no ooze.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Shower normally. Keep wound clean. No need for dressing if dry.'
      },
      {
        day: 'Week 2',
        instruction: 'Sutures removed if not dissolving. Wound should be healed.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild (2-4/10), usually well controlled with simple analgesia',
      medications: [
        'Paracetamol regularly for 2-3 days',
        'NSAIDs if needed and not contraindicated',
        'Rarely need stronger analgesia'
      ],
      nonPharmacological: [
        'Ice pack if needed',
        'Support when coughing or straining'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid >5kg',
        duration: '2-4 weeks',
        reason: 'Allow fascia to heal'
      },
      {
        activity: 'Driving',
        restriction: 'When comfortable',
        duration: '2-5 days',
        reason: 'Must be able to emergency stop'
      },
      {
        activity: 'Work',
        restriction: 'Desk work 2-3 days, physical work 2-4 weeks',
        duration: 'As above',
        reason: 'Depends on work demands'
      },
      {
        activity: 'Exercise',
        restriction: 'Light exercise 1 week, full gym 4 weeks',
        duration: '4 weeks for core/abdominal work',
        reason: 'Protect repair'
      }
    ],
    dietaryGuidelines: [
      'Normal diet immediately',
      'High fiber to prevent constipation',
      'Stay hydrated'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'Same day',
        expectation: 'Discharged home, mild discomfort'
      },
      {
        timeframe: '1 week',
        expectation: 'Resuming normal activities'
      },
      {
        timeframe: '2-4 weeks',
        expectation: 'Full recovery, all activities'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Complete healing'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Low recurrence, possible new hernias adjacent'
      }
    ],
    functionalRecovery: 'Excellent. Quick return to all activities. Pain at site usually resolved.',
    cosmeticOutcome: 'Small vertical scar in upper midline. Fades with time.',
    successRate: 'Recurrence rate 5-10% at same site. May develop new hernias adjacent to repair (different site, same underlying weakness).',
    possibleComplications: [
      'Wound infection (uncommon)',
      'Hematoma',
      'Recurrence (5-10%)',
      'New hernia at different site',
      'Chronic pain (rare)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, suture removal'
      },
      {
        timing: 'As needed',
        purpose: 'If recurrence suspected or new lumps appear'
      }
    ],
    rehabilitationNeeds: [
      'Core strengthening after healing',
      'May address diastasis recti separately'
    ],
    lifestyleModifications: [
      'Maintain healthy weight',
      'Proper lifting technique',
      'Core strengthening',
      'Report new lumps early'
    ]
  },

  warningSigns: [
    'Increasing pain at repair site',
    'Wound redness or discharge',
    'New lump appearing',
    'Fever'
  ],

  emergencySigns: [
    'Severe pain (rare for epigastric hernia)',
    'Signs of wound infection with fever'
  ],

  complianceRequirements: [
    {
      requirement: 'Avoid heavy lifting for 2-4 weeks',
      importance: 'critical',
      consequence: 'Strain can cause repair failure'
    },
    {
      requirement: 'Attend for suture removal',
      importance: 'important',
      consequence: 'Sutures left too long can cause problems'
    },
    {
      requirement: 'Report new lumps',
      importance: 'important',
      consequence: 'Early repair of new hernias is simpler'
    }
  ],

  whoGuidelines: [
    {
      title: 'European Hernia Society Guidelines',
      reference: 'EHS 2020',
      keyPoints: [
        'Symptomatic epigastric hernias should be repaired',
        'Asymptomatic small hernias can be observed',
        'Mesh may be used for larger or recurrent defects',
        'Check for multiple defects at surgery',
        'Consider underlying diastasis recti'
      ]
    }
  ]
};

// Export hernia conditions part 3
export const herniaEducationPart3 = [umbilicalHernia, epigastricHernia];
