/**
 * Patient Education Content - Category J: Genital and Perineal Reconstruction
 * Part 1: Hypospadias Repair and Epispadias Repair
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Urological Surgery Best Practices
 */

import type { EducationCondition } from '../types';

/**
 * Hypospadias Repair
 */
export const hypospadiasRepair: EducationCondition = {
  id: 'genital-hypospadias',
  name: 'Hypospadias Repair',
  category: 'J',
  icdCode: 'Q54',
  description: 'Hypospadias is a congenital condition where the urethral opening is on the underside of the penis rather than at the tip. Surgical repair restores normal anatomy and function.',
  alternateNames: ['Hypospadias Correction', 'Urethroplasty for Hypospadias', 'Penile Reconstruction'],
  
  overview: {
    definition: 'Hypospadias is a birth defect affecting approximately 1 in 300 male births, where the urethral opening (meatus) is located on the underside of the penis rather than at the tip. The condition may be associated with a downward curvature of the penis (chordee) and an abnormal foreskin (hooded prepuce). Surgical repair aims to place the urethral opening at the tip of the penis, straighten the penis, and create a normal appearance.',
    causes: [
      'Congenital developmental abnormality',
      'Disruption of normal penile development in utero',
      'Genetic factors',
      'Hormonal influences during pregnancy',
      'Environmental factors (not fully understood)'
    ],
    symptoms: [
      'Urethral opening not at tip of penis',
      'Abnormal urinary stream direction',
      'Downward curvature of penis (chordee)',
      'Hooded foreskin (incomplete on underside)',
      'Difficulty with urination while standing',
      'Cosmetic appearance concerns'
    ],
    riskFactors: [
      'Family history of hypospadias',
      'Low birth weight',
      'Fertility treatments',
      'Advanced maternal age',
      'Maternal exposure to certain medications'
    ],
    complications: [
      'Urethrocutaneous fistula (hole allowing urine leak)',
      'Meatal stenosis (narrowing of urethral opening)',
      'Urethral stricture',
      'Wound breakdown',
      'Recurrent chordee',
      'Diverticulum formation',
      'Need for additional surgery'
    ],
    prevalence: 'Hypospadias affects approximately 1 in 200-300 male births. It is one of the most common congenital anomalies in boys.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Pre-Operative Assessment',
      duration: '2-4 weeks before surgery',
      description: 'Evaluation of the type and severity of hypospadias, planning surgical approach, and preparing the child and family.',
      goals: [
        'Assess severity and type of hypospadias',
        'Plan surgical technique',
        'Prepare family for surgery and recovery',
        'Ensure child is healthy for surgery'
      ],
      activities: [
        'Physical examination',
        'Photography for documentation',
        'Discussion with parents about surgery',
        'Pre-operative instructions',
        'Ensure no urinary infection'
      ],
      warningSignsThisPhase: [
        'Urinary tract infection',
        'Other health issues requiring attention',
        'Previous failed repair requiring different approach'
      ]
    },
    {
      phase: 2,
      name: 'Surgery',
      duration: '1-3 hours',
      description: 'Surgical repair performed under general anesthesia. Technique depends on severity.',
      goals: [
        'Correct urethral position',
        'Straighten penis if curved',
        'Create normal appearance',
        'Establish good urinary stream'
      ],
      activities: [
        'General anesthesia',
        'Chordee correction if present',
        'Urethroplasty (creation of new urethra)',
        'Glanuloplasty (reshaping of glans)',
        'Skin coverage',
        'Catheter or stent placement'
      ],
      warningSignsThisPhase: [
        'Excessive bleeding',
        'Anesthesia complications'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Post-Operative Care',
      duration: 'Days 1-14',
      description: 'Critical healing period with catheter in place. Pain management and prevention of complications.',
      goals: [
        'Maintain catheter function',
        'Prevent infection',
        'Manage pain and distress',
        'Protect surgical repair'
      ],
      activities: [
        'Catheter care',
        'Pain medication administration',
        'Dressing care',
        'Limiting child\'s activity',
        'Monitoring for complications'
      ],
      medications: [
        {
          name: 'Pain medication',
          purpose: 'Control post-operative pain',
          duration: '5-7 days'
        },
        {
          name: 'Antibiotics',
          purpose: 'Prevent infection',
          duration: '5-7 days'
        },
        {
          name: 'Anticholinergic (oxybutynin)',
          purpose: 'Reduce bladder spasms',
          duration: 'While catheter in place'
        }
      ],
      warningSignsThisPhase: [
        'Catheter blockage or dislodgement',
        'Fever',
        'Excessive swelling',
        'Bleeding'
      ]
    },
    {
      phase: 4,
      name: 'Healing and Follow-Up',
      duration: 'Weeks 2-12',
      description: 'Catheter removed, monitoring of urinary function and wound healing.',
      goals: [
        'Remove catheter',
        'Confirm good urinary stream',
        'Monitor wound healing',
        'Detect any complications early'
      ],
      activities: [
        'Catheter removal (usually 7-14 days)',
        'Observe urinary stream',
        'Follow-up appointments',
        'Gradual return to normal activities'
      ],
      warningSignsThisPhase: [
        'Urine leaking from wound (fistula)',
        'Weak or spraying urinary stream',
        'Wound breakdown',
        'Persistent swelling'
      ]
    },
    {
      phase: 5,
      name: 'Long-Term Follow-Up',
      duration: 'Years',
      description: 'Monitoring through growth and development into adulthood.',
      goals: [
        'Ensure normal function as child grows',
        'Address any late complications',
        'Psychological support if needed',
        'Long-term outcome assessment'
      ],
      activities: [
        'Annual follow-up through puberty',
        'Assessment of urinary function',
        'Evaluation of cosmetic result',
        'Psychological support if concerns'
      ],
      warningSignsThisPhase: [
        'Difficulty urinating',
        'Abnormal penile curvature',
        'Cosmetic concerns',
        'Sexual function concerns (in adolescence)'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric urologist or plastic surgeon',
      'Pediatrician clearance',
      'Anesthesia assessment'
    ],
    investigations: [
      'Urine test to exclude infection',
      'Blood tests if indicated',
      'Photography documentation'
    ],
    medications: [
      {
        medication: 'Hormone cream (testosterone)',
        instruction: 'discuss',
        reason: 'May be applied to increase penile size before surgery in some cases'
      }
    ],
    fastingInstructions: 'Fasting according to pediatric anesthesia guidelines - typically 6 hours for solids, 4 hours for breast milk, 2 hours for clear fluids.',
    dayBeforeSurgery: [
      'Bath or shower the child',
      'Ensure child is well with no cold or illness',
      'Prepare for hospital stay if overnight',
      'Explain to child (age-appropriately) what will happen'
    ],
    whatToBring: [
      'Comfort items (toy, blanket)',
      'Loose-fitting clothing and underwear',
      'Diapers or pull-ups (even if potty trained)',
      'Insurance and identification',
      'List of medications and allergies'
    ],
    dayOfSurgery: [
      'Follow fasting instructions',
      'Give medications as instructed',
      'Arrive at designated time',
      'Stay calm to help child stay calm'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia, often with caudal block for post-operative pain relief',
    procedureDescription: 'The specific technique depends on the type and severity of hypospadias. Common procedures include: TIP (Tubularized Incised Plate) repair for distal hypospadias; staged repairs for more severe cases; use of preputial or buccal graft if additional tissue needed. The chordee (curvature) is corrected first. The urethra is then reconstructed to bring the opening to the tip of the penis. The glans is shaped around the new urethra. A catheter or stent is placed to drain urine while healing.',
    duration: '1-3 hours depending on complexity',
    whatToExpect: 'Your child will be asleep throughout. A catheter will be in place after surgery to drain urine. The penis will be wrapped in a dressing. There may be some bruising and swelling.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'No specific position required. Keep the genital area protected.',
      expectedSymptoms: [
        'Swelling of penis and scrotum',
        'Bruising',
        'Discomfort (especially bladder spasms)',
        'Bloody urine initially (normal)',
        'Fussiness and irritability'
      ],
      activityLevel: 'Rest at home. Avoid straddling toys, rough play. Keep diaper area clean.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Leave dressing in place unless instructed otherwise. Keep diaper area clean. Apply barrier cream around catheter.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Dressing removed at clinic or as directed. Gentle cleaning. May have dressing-free periods.'
      },
      {
        day: 'After catheter removal',
        instruction: 'Keep area clean. Observe urinary stream. Report any urine leaking from wound.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild to moderate. Bladder spasms can be distressing but are controllable.',
      medications: [
        'Paracetamol (acetaminophen) regularly',
        'Ibuprofen as directed',
        'Oxybutynin for bladder spasms',
        'Stronger pain medication if needed'
      ],
      nonPharmacological: [
        'Distraction and comfort',
        'Warm baths (after dressing removed)',
        'Loose clothing',
        'Comfort items'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Straddling toys (bikes, rocking horses)',
        restriction: 'Avoid',
        duration: '4-6 weeks',
        reason: 'Pressure on repair'
      },
      {
        activity: 'Swimming',
        restriction: 'Avoid',
        duration: 'Until fully healed (about 6 weeks)',
        reason: 'Prevent infection'
      },
      {
        activity: 'Rough play',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Protect healing area'
      },
      {
        activity: 'School/daycare',
        restriction: 'May return when comfortable',
        duration: '1-2 weeks typically',
        reason: 'Allow initial healing'
      }
    ],
    dietaryGuidelines: [
      'Normal diet as tolerated',
      'Encourage fluids to keep urine flowing',
      'High fiber to prevent constipation',
      'Avoid straining with bowel movements'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '1-2 weeks',
        expectation: 'Catheter removed, swelling subsiding'
      },
      {
        timeframe: '4-6 weeks',
        expectation: 'Healed, can return to all activities'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Final appearance, normal function'
      },
      {
        timeframe: 'Through puberty',
        expectation: 'Normal growth and development'
      },
      {
        timeframe: 'Adulthood',
        expectation: 'Normal urinary and sexual function in most cases'
      }
    ],
    functionalRecovery: 'Most boys have normal urinary function with a straight stream. Sexual function is normal in most cases when assessed in adulthood.',
    cosmeticOutcome: 'Goal is a normal-appearing penis with meatus at the tip. Results are generally excellent with modern techniques.',
    successRate: 'Success rates are 85-95% for single-stage repairs of distal hypospadias. More complex cases may require additional surgery.',
    possibleComplications: [
      {
        complication: 'Fistula',
        riskLevel: 'moderate',
        prevention: 'Good surgical technique, proper healing',
        management: 'Secondary surgical repair'
      },
      {
        complication: 'Meatal stenosis',
        riskLevel: 'low',
        prevention: 'Proper technique',
        management: 'Dilation or meatotomy'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Catheter removal, wound check'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing and urinary stream'
      },
      {
        timing: '3-6 months',
        purpose: 'Evaluate outcome'
      },
      {
        timing: 'Annually through puberty',
        purpose: 'Monitor growth and development'
      }
    ],
    rehabilitationNeeds: [
      'None specifically required',
      'Psychological support if needed'
    ],
    lifestyleModifications: [
      'No long-term restrictions once healed',
      'Normal activities can be resumed',
      'Annual follow-up through puberty recommended'
    ]
  },

  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Catheter not draining',
    'Significant swelling or redness',
    'Bleeding from wound',
    'Wound separating',
    'Urine leaking from wound (fistula)'
  ],

  emergencySigns: [
    'Unable to urinate after catheter removed',
    'Severe pain',
    'Signs of severe infection',
    'Heavy bleeding'
  ],

  complianceRequirements: [
    {
      requirement: 'Keep catheter in place and functioning',
      importance: 'critical',
      consequence: 'Catheter is essential for healing - dislodgement can compromise repair'
    },
    {
      requirement: 'Give all medications as prescribed',
      importance: 'critical',
      consequence: 'Pain control and antibiotics essential for good outcome'
    },
    {
      requirement: 'Avoid straddling activities',
      importance: 'important',
      consequence: 'Prevents pressure on healing repair'
    },
    {
      requirement: 'Attend all follow-up appointments',
      importance: 'critical',
      consequence: 'Early detection of complications improves outcomes'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Congenital Anomalies',
      reference: 'WHO Birth Defects Guidelines',
      keyPoints: [
        'Early diagnosis and referral',
        'Optimal timing for repair (6-18 months)',
        'Experienced surgical team',
        'Long-term follow-up through puberty'
      ]
    }
  ]
};

/**
 * Perineal Reconstruction
 */
export const perinealReconstruction: EducationCondition = {
  id: 'genital-perineal-reconstruction',
  name: 'Perineal Reconstruction',
  category: 'J',
  icdCode: 'N81',
  description: 'Perineal reconstruction repairs damage to the perineum (area between genitals and anus) from childbirth, trauma, or cancer surgery.',
  alternateNames: ['Perineoplasty', 'Perineal Repair', 'Perineorrhaphy', 'Perineal Body Reconstruction'],
  
  overview: {
    definition: 'The perineum is the area between the vaginal opening and anus in women, or scrotum and anus in men. Perineal reconstruction repairs damage to this area resulting from childbirth tears, trauma, or surgical removal of cancers. The repair aims to restore anatomy, function (bowel and bladder control), and appearance. In women, it often addresses vaginal looseness and perineal body weakness.',
    causes: [
      'Obstetric perineal tears (3rd and 4th degree)',
      'Episiotomy complications',
      'Trauma',
      'Cancer surgery (perineal resection)',
      'Fistula repair',
      'Congenital abnormalities',
      'Previous failed repairs'
    ],
    symptoms: [
      'Perineal pain or discomfort',
      'Fecal incontinence',
      'Vaginal looseness',
      'Pain during intercourse',
      'Cosmetic concerns',
      'Wound healing problems',
      'Recurrent infections'
    ],
    riskFactors: [
      'Previous obstetric injury',
      'History of difficult delivery',
      'Multiple vaginal deliveries',
      'Chronic constipation',
      'Obesity',
      'Diabetes',
      'Previous radiation'
    ],
    complications: [
      'Wound breakdown',
      'Infection',
      'Fistula formation',
      'Persistent incontinence',
      'Pain',
      'Need for additional surgery',
      'Scarring'
    ],
    prevalence: 'Third and fourth degree perineal tears occur in 1-8% of vaginal deliveries. Perineal reconstruction is needed when primary repair fails or for other perineal defects.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Assessment and Planning',
      duration: '2-4 weeks before surgery',
      description: 'Comprehensive evaluation of perineal defect and planning of reconstruction.',
      goals: [
        'Assess extent of damage',
        'Evaluate bowel and bladder function',
        'Plan surgical approach',
        'Optimize health before surgery'
      ],
      activities: [
        'Physical examination',
        'Endoanal ultrasound if sphincter damage',
        'Anorectal physiology tests',
        'Treatment of any infection',
        'Bowel preparation if needed'
      ],
      warningSignsThisPhase: [
        'Active infection',
        'Uncontrolled medical conditions',
        'Need for more complex reconstruction'
      ]
    },
    {
      phase: 2,
      name: 'Surgery',
      duration: '1-3 hours',
      description: 'Surgical reconstruction of the perineal body and associated structures.',
      goals: [
        'Repair perineal defect',
        'Restore anal sphincter if damaged',
        'Reconstruct perineal body',
        'Improve function and appearance'
      ],
      activities: [
        'General or regional anesthesia',
        'Scar excision if needed',
        'Sphincter repair (sphincteroplasty)',
        'Levatorplasty (muscle approximation)',
        'Perineorrhaphy',
        'Vaginal mucosa repair'
      ],
      warningSignsThisPhase: [
        'Extensive tissue loss requiring flaps',
        'Unexpected findings'
      ]
    },
    {
      phase: 3,
      name: 'Immediate Recovery',
      duration: 'Days 1-14',
      description: 'Careful wound care, bowel management, and pain control.',
      goals: [
        'Maintain wound healing',
        'Prevent infection',
        'Avoid straining',
        'Manage pain'
      ],
      activities: [
        'Rest and limited activity',
        'Stool softeners to avoid straining',
        'Wound care',
        'Sitz baths when cleared',
        'Pain medication'
      ],
      medications: [
        {
          name: 'Antibiotics',
          purpose: 'Prevent wound infection',
          duration: '5-7 days'
        },
        {
          name: 'Stool softeners',
          purpose: 'Prevent straining',
          duration: '4-6 weeks'
        },
        {
          name: 'Pain medication',
          purpose: 'Control discomfort',
          duration: '1-2 weeks'
        }
      ],
      warningSignsThisPhase: [
        'Fever',
        'Wound breakdown',
        'Increasing pain',
        'Fecal leakage from wound'
      ]
    },
    {
      phase: 4,
      name: 'Healing and Recovery',
      duration: 'Weeks 2-12',
      description: 'Progressive healing, gradual return to activities.',
      goals: [
        'Complete wound healing',
        'Resume normal activities',
        'Restore function',
        'Assess outcomes'
      ],
      activities: [
        'Gradual activity increase',
        'Pelvic floor exercises when cleared',
        'Continue high fiber diet',
        'Follow-up appointments'
      ],
      warningSignsThisPhase: [
        'Persistent incontinence',
        'Pain with intercourse',
        'Wound problems'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Colorectal surgeon or gynecologist',
      'Pelvic floor physiotherapist (pre and post-operative)',
      'Medical clearance if health conditions'
    ],
    investigations: [
      'Endoanal ultrasound',
      'Anorectal physiology studies',
      'Blood tests',
      'Swab if infection suspected'
    ],
    medications: [
      {
        medication: 'Blood thinners',
        instruction: 'discuss',
        reason: 'May need to stop'
      },
      {
        medication: 'Laxatives/stool softeners',
        instruction: 'continue',
        reason: 'Prevent constipation'
      }
    ],
    fastingInstructions: 'No food for 6 hours before surgery. Bowel preparation may be required.',
    dayBeforeSurgery: [
      'Complete bowel preparation if directed',
      'Shower and clean perineal area',
      'Light diet',
      'Get good rest'
    ],
    whatToBring: [
      'Loose comfortable clothing',
      'Sanitary pads',
      'Donut cushion for sitting',
      'Driver',
      'Medications list'
    ],
    dayOfSurgery: [
      'Complete any remaining bowel prep',
      'Shower',
      'Wear loose comfortable clothing',
      'Arrive at designated time'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General or spinal anesthesia',
    procedureDescription: 'The patient is positioned to allow access to the perineum. Any scar tissue is removed. If the anal sphincter is damaged, it is repaired (sphincteroplasty). The perineal body muscles are reconstructed by bringing together the levator ani muscles in the midline. The vaginal mucosa is closed. The perineal skin is closed. For complex defects, tissue flaps may be needed.',
    duration: '1-3 hours depending on complexity',
    whatToExpect: 'You will be asleep or numb from the waist down. When you wake up, the perineal area will be tender. You may have a urinary catheter initially.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Avoid prolonged sitting on perineum. Use donut cushion. Lie on side or back.',
      expectedSymptoms: [
        'Perineal pain and swelling',
        'Bruising',
        'Difficulty sitting',
        'Urinary catheter may be present initially',
        'Bloody discharge'
      ],
      activityLevel: 'Rest at home. Avoid straining, heavy lifting. Short walks encouraged.'
    },
    woundCare: [
      {
        day: 'Days 1-7',
        instruction: 'Keep area clean and dry. Rinse with water after toileting. Pat dry.'
      },
      {
        day: 'Week 1-2',
        instruction: 'Sitz baths 2-3 times daily for comfort and cleaning.'
      },
      {
        day: 'Weeks 2-6',
        instruction: 'Continue good hygiene. Wound healing continues.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Moderate (4-6/10) first week, improving thereafter',
      medications: [
        'Prescribed pain medication for first week',
        'Paracetamol and ibuprofen after that',
        'Topical anesthetic gel may help'
      ],
      nonPharmacological: [
        'Ice packs (protect skin)',
        'Sitz baths',
        'Donut cushion for sitting',
        'Rest'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Sexual intercourse',
        restriction: 'Avoid',
        duration: '6-8 weeks',
        reason: 'Allow complete healing'
      },
      {
        activity: 'Heavy lifting',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Prevents strain on repair'
      },
      {
        activity: 'Tampon use',
        restriction: 'Avoid',
        duration: '6 weeks',
        reason: 'Allow healing'
      },
      {
        activity: 'Straining with bowel movements',
        restriction: 'Avoid at all costs',
        duration: 'Indefinitely',
        reason: 'Can damage repair'
      }
    ],
    dietaryGuidelines: [
      'High fiber diet to prevent constipation',
      'Plenty of fluids',
      'Stool softeners as prescribed',
      'Avoid foods that cause hard stools'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '2 weeks',
        expectation: 'Wound healing, able to sit more comfortably'
      },
      {
        timeframe: '6 weeks',
        expectation: 'Healed, can resume most activities'
      }
    ],
    longTerm: [
      {
        timeframe: '3 months',
        expectation: 'Full healing, improved function'
      },
      {
        timeframe: '6-12 months',
        expectation: 'Final outcome, maximum improvement in continence'
      }
    ],
    functionalRecovery: 'Improvement in fecal continence in 60-80% of patients with sphincter repair. Improvement in vaginal support and comfort.',
    cosmeticOutcome: 'Improved perineal appearance. Scar will be present but usually well-hidden.',
    successRate: 'Success rates for sphincter repair are 60-80% initially, though may decline over time. Perineoplasty for vaginal laxity has high satisfaction rates.',
    possibleComplications: [
      {
        complication: 'Wound breakdown',
        riskLevel: 'moderate',
        prevention: 'Good technique, bowel management',
        management: 'Conservative care or re-repair'
      },
      {
        complication: 'Persistent incontinence',
        riskLevel: 'moderate',
        prevention: 'Careful sphincter repair, physiotherapy',
        management: 'Further surgery or conservative measures'
      }
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '2 weeks',
        purpose: 'Wound check'
      },
      {
        timing: '6 weeks',
        purpose: 'Assess healing, clear for activities'
      },
      {
        timing: '3 months',
        purpose: 'Evaluate continence and function'
      },
      {
        timing: '6-12 months',
        purpose: 'Long-term outcome assessment'
      }
    ],
    rehabilitationNeeds: [
      'Pelvic floor physiotherapy (very important)',
      'Biofeedback therapy for continence',
      'Ongoing fiber supplementation'
    ],
    lifestyleModifications: [
      'Maintain regular soft bowel movements',
      'Continue pelvic floor exercises',
      'Maintain healthy weight',
      'Discuss future childbirth plans with doctor'
    ]
  },

  warningSigns: [
    'Fever above 38°C (100.4°F)',
    'Increasing pain after first few days',
    'Foul-smelling discharge',
    'Wound opening',
    'Fecal leakage from wound',
    'Inability to pass urine'
  ],

  emergencySigns: [
    'Heavy bleeding',
    'Complete wound breakdown',
    'Signs of severe infection',
    'Unable to urinate or defecate'
  ],

  complianceRequirements: [
    {
      requirement: 'Take stool softeners to avoid straining',
      importance: 'critical',
      consequence: 'Straining can destroy the repair'
    },
    {
      requirement: 'Complete pelvic floor physiotherapy',
      importance: 'critical',
      consequence: 'Physiotherapy significantly improves outcomes'
    },
    {
      requirement: 'Avoid sexual intercourse for 6-8 weeks',
      importance: 'critical',
      consequence: 'Allows complete healing'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Recommendations on Perineal Trauma',
      reference: 'WHO Intrapartum Care Guidelines',
      keyPoints: [
        'Proper classification of perineal tears',
        'Repair by trained personnel',
        'Use of appropriate technique and materials',
        'Follow-up for complications'
      ]
    }
  ]
};

// Export genital reconstruction part 1
export const genitalReconstructionPart1 = [hypospadiasRepair, perinealReconstruction];
