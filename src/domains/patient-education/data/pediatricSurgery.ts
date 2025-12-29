/**
 * Patient Education Content - Category F: Pediatric Surgical Conditions
 * Part 1: Pyloric Stenosis and Intussusception
 * 
 * CareBridge Innovations in Healthcare
 * Content aligned with WHO Guidelines and Pediatric Surgery Guidelines
 */

import type { EducationCondition } from '../types';

/**
 * Pyloric Stenosis
 */
export const pyloricStenosis: EducationCondition = {
  id: 'pediatric-pyloric-stenosis',
  name: 'Pyloric Stenosis',
  category: 'F',
  icdCode: 'K31.1',
  description: 'Pyloric stenosis is a condition affecting infants where the muscle controlling the outlet of the stomach (pylorus) becomes abnormally thickened, blocking food from passing into the small intestine.',
  alternateNames: ['Infantile Hypertrophic Pyloric Stenosis', 'IHPS', 'Pyloric Obstruction'],
  
  overview: {
    definition: 'Pyloric stenosis occurs when the pyloric sphincter muscle (the ring of muscle between the stomach and small intestine) becomes abnormally enlarged and thickened, creating a blockage that prevents stomach contents from emptying into the duodenum. This causes progressive, forceful "projectile" vomiting in affected infants. The condition typically develops between 2-8 weeks of age and requires surgical correction.',
    causes: [
      'Exact cause unknown',
      'Muscle hypertrophy (thickening) of pylorus',
      'Possible genetic factors',
      'Environmental factors',
      'Associated with erythromycin exposure in early infancy',
      'Bottle feeding (possible association)'
    ],
    symptoms: [
      'Projectile vomiting (non-bilious - no green/yellow)',
      'Vomiting worsens over days to weeks',
      'Baby hungry immediately after vomiting',
      'Weight loss or poor weight gain',
      'Dehydration signs (dry mouth, fewer wet nappies)',
      'Constipation (fewer bowel movements)',
      'Visible peristalsis (wave-like movement across upper abdomen)',
      'Palpable "olive" mass in right upper abdomen'
    ],
    riskFactors: [
      'Male gender (4-5 times more common in boys)',
      'First-born child',
      'Family history of pyloric stenosis',
      'Caucasian ethnicity',
      'Premature birth',
      'Macrolide antibiotic exposure (e.g., erythromycin)',
      'Bottle feeding'
    ],
    complications: [
      'Dehydration',
      'Electrolyte imbalances (hypochloremic metabolic alkalosis)',
      'Poor weight gain/malnutrition',
      'Jaundice',
      'Aspiration of vomit'
    ],
    prevalence: 'Pyloric stenosis affects 2-4 per 1,000 live births. It is 4-5 times more common in males and typically presents at 3-6 weeks of age.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Diagnosis and Resuscitation',
      duration: '12-48 hours',
      description: 'Confirming diagnosis with ultrasound and correcting dehydration and electrolyte imbalances before surgery.',
      goals: [
        'Confirm diagnosis',
        'Correct dehydration',
        'Normalize electrolytes',
        'Prepare for safe anesthesia'
      ],
      activities: [
        'Abdominal ultrasound (diagnostic)',
        'Blood tests for electrolytes',
        'IV fluid resuscitation',
        'Nil by mouth',
        'Nasogastric tube if needed',
        'Correction of metabolic alkalosis'
      ],
      medications: [
        {
          name: 'IV fluids (0.45% saline with dextrose)',
          purpose: 'Rehydration and electrolyte correction',
          duration: 'Until surgery'
        },
        {
          name: 'Potassium chloride (IV)',
          purpose: 'Correct low potassium if present',
          duration: 'As needed'
        }
      ],
      warningSignsThisPhase: [
        'Severe dehydration',
        'Significant electrolyte abnormalities',
        'Aspiration'
      ]
    },
    {
      phase: 2,
      name: 'Surgical Correction',
      duration: 'Day of surgery',
      description: 'Pyloromyotomy - surgical division of the thickened pyloric muscle to relieve the obstruction.',
      goals: [
        'Divide pyloric muscle',
        'Preserve mucosal integrity',
        'Relieve obstruction'
      ],
      activities: [
        'General anesthesia',
        'Laparoscopic or open pyloromyotomy',
        'Division of pyloric muscle fibers',
        'Confirm no mucosal injury'
      ],
      warningSignsThisPhase: [
        'Mucosal perforation',
        'Incomplete myotomy'
      ]
    },
    {
      phase: 3,
      name: 'Post-Operative Recovery',
      duration: '1-3 days',
      description: 'Gradual reintroduction of feeding and monitoring for complications.',
      goals: [
        'Establish full feeds',
        'Ensure weight gain',
        'Wound healing'
      ],
      activities: [
        'Start feeds 4-6 hours post-op (or earlier)',
        'Gradual increase in feed volume',
        'Monitor for vomiting',
        'Pain management',
        'Wound care'
      ],
      warningSignsThisPhase: [
        'Persistent vomiting (some expected initially)',
        'Wound infection',
        'Failure to tolerate feeds'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric surgeon',
      'Pediatric anesthetist',
      'Pediatrician'
    ],
    investigations: [
      'Abdominal ultrasound (pyloric muscle thickness >3mm, length >15mm)',
      'Serum electrolytes (sodium, potassium, chloride, bicarbonate)',
      'Blood urea and creatinine',
      'Blood glucose',
      'Blood gas if indicated'
    ],
    medications: [
      {
        medication: 'Oral feeds',
        instruction: 'stop completely',
        reason: 'Nil by mouth for surgery preparation'
      }
    ],
    fastingInstructions: 'Nil by mouth. IV fluids will maintain hydration. Nasogastric tube may drain stomach.',
    dayBeforeSurgery: [
      'IV fluids running',
      'Blood tests monitored',
      'Baby kept warm and comfortable',
      'Parents can hold and comfort baby'
    ],
    whatToBring: [
      'Nappies',
      'Change of clothes for baby',
      'Comfort items',
      'Formula or breast milk pump if breastfeeding',
      'Parent essentials for hospital stay'
    ],
    dayOfSurgery: [
      'Baby kept nil by mouth',
      'IV fluids continued',
      'Parents can stay until anesthesia',
      'Surgery time confirmed'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'General anesthesia (special pediatric techniques)',
    procedureDescription: 'PYLOROMYOTOMY (Ramstedt Procedure): The thickened pyloric muscle is surgically divided to relieve the obstruction. This can be done through: LAPAROSCOPIC approach: 3 small incisions (3-5mm each), camera and instruments used to divide the muscle. OPEN approach: Small incision (2-3cm) in right upper quadrant or around umbilicus. The pyloric muscle is identified and an incision made along its length through the muscle down to (but not through) the inner lining (mucosa). The muscle fibers are spread apart, allowing the mucosa to bulge through and relieve the obstruction. The mucosa is tested for leaks. If intact, the abdomen is closed.',
    duration: '30-60 minutes',
    whatToExpect: 'Short surgery. Baby will have small incisions. May have nasogastric tube initially. Feeding can often start within hours of surgery.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Baby positioned on back or side. Head of bed may be slightly elevated.',
      expectedSymptoms: [
        'Some vomiting in first 24-48 hours is normal',
        'Mild wound discomfort',
        'Drowsiness from anesthesia',
        'May be irritable initially'
      ],
      activityLevel: 'Normal infant activity. Handle gently around wound. Can be held and cuddled.'
    },
    woundCare: [
      {
        day: 'Days 1-3',
        instruction: 'Wounds covered with waterproof dressings. Keep dry. No bathing - sponge bath only.'
      },
      {
        day: 'Days 3-7',
        instruction: 'Dressings can be removed. Wounds may be covered or left open. Avoid submerging in bath.'
      },
      {
        day: 'Week 2',
        instruction: 'Wounds should be healed. Normal bathing can resume. Sutures usually dissolving.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild discomfort expected',
      medications: [
        'Paracetamol (acetaminophen) - infant formulation',
        'Rarely need stronger pain relief'
      ],
      nonPharmacological: [
        'Comfort holding',
        'Feeding (once allowed)',
        'Swaddling',
        'Pacifier/dummy'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Bathing',
        restriction: 'Sponge bath only initially',
        duration: '5-7 days',
        reason: 'Keep wounds dry'
      },
      {
        activity: 'Tummy time',
        restriction: 'Avoid pressure on wounds',
        duration: '1-2 weeks',
        reason: 'Wound comfort'
      }
    ],
    dietaryGuidelines: [
      'FEEDING PROTOCOL (varies by center):',
      'Often start feeds 4-6 hours after surgery',
      'Begin with small volumes of breast milk or formula',
      'Gradually increase volume and frequency',
      'Expect some vomiting initially - this is normal',
      'Full feeds usually achieved by 24-48 hours',
      'Breastfeeding can continue as normal once established'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: '24-48 hours',
        expectation: 'Tolerating full feeds, some vomiting is normal'
      },
      {
        timeframe: '2-3 days',
        expectation: 'Ready for discharge, feeding well'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Weight gain resumed, wounds healed'
      }
    ],
    longTerm: [
      {
        timeframe: '1 month',
        expectation: 'Normal growth and feeding'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Complete cure, normal development'
      }
    ],
    functionalRecovery: 'Excellent. Pyloromyotomy is curative with >99% success rate. Normal feeding and growth expected.',
    cosmeticOutcome: 'Laparoscopic: 3 tiny scars (3-5mm) that fade significantly. Open: Single small scar (2-3cm) that fades with growth.',
    successRate: 'Cure rate >99%. Recurrence is extremely rare (<1%). Second surgery almost never needed.',
    possibleComplications: [
      'Vomiting post-operatively (common, temporary)',
      'Wound infection (rare)',
      'Incomplete myotomy (rare, <1%)',
      'Mucosal perforation (rare, recognized and repaired at surgery)',
      'Incisional hernia (rare)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '1-2 weeks',
        purpose: 'Wound check, weight gain assessment'
      },
      {
        timing: '4-6 weeks',
        purpose: 'Confirm normal feeding and growth'
      }
    ],
    rehabilitationNeeds: [
      'Normal infant care',
      'Regular health visitor/pediatrician checks',
      'Standard immunization schedule'
    ],
    lifestyleModifications: [
      'No specific modifications needed after recovery',
      'Normal diet appropriate for age',
      'Normal developmental activities'
    ]
  },

  warningSigns: [
    'Persistent projectile vomiting after 48 hours',
    'Wound redness, swelling, or discharge',
    'Fever',
    'Baby not feeding well',
    'Dehydration signs (dry mouth, reduced wet nappies)',
    'Blood in vomit or stool'
  ],

  emergencySigns: [
    'Bilious (green/yellow) vomiting - different problem',
    'High fever',
    'Baby very unwell, lethargic',
    'Signs of severe dehydration',
    'Wound breakdown'
  ],

  complianceRequirements: [
    {
      requirement: 'Follow feeding protocol',
      importance: 'critical',
      consequence: 'Gradual feeding advancement allows stomach to adjust'
    },
    {
      requirement: 'Attend follow-up appointments',
      importance: 'important',
      consequence: 'Confirm normal growth and recovery'
    },
    {
      requirement: 'Keep wounds clean and dry',
      importance: 'important',
      consequence: 'Prevents infection'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Pediatric Surgery',
      reference: 'WHO/UNICEF',
      keyPoints: [
        'Pyloromyotomy is the standard treatment',
        'Pre-operative fluid and electrolyte correction is essential',
        'Early postoperative feeding is safe and reduces hospital stay',
        'Laparoscopic and open approaches have similar outcomes',
        'Excellent prognosis with >99% cure rate'
      ]
    }
  ]
};

/**
 * Intussusception
 */
export const intussusception: EducationCondition = {
  id: 'pediatric-intussusception',
  name: 'Intussusception',
  category: 'F',
  icdCode: 'K56.1',
  description: 'Intussusception occurs when one segment of the intestine telescopes inside another, like a collapsing telescope, causing bowel obstruction. It is one of the most common causes of intestinal obstruction in children under 3 years.',
  alternateNames: ['Telescoping Bowel', 'Invagination of Bowel', 'Bowel Intussusception'],
  
  overview: {
    definition: 'Intussusception is a condition where a segment of intestine (intussusceptum) invaginates or "telescopes" into an adjacent segment (intussuscipiens). This causes bowel obstruction and compromises blood supply to the affected bowel. The most common type in children is ileocolic intussusception, where the ileum (last part of small bowel) telescopes into the colon. It typically occurs in children aged 6 months to 3 years and requires urgent treatment to prevent bowel damage.',
    causes: [
      'Idiopathic (no cause found) in 90% of cases',
      'Viral infection (lymphoid hyperplasia acts as lead point)',
      'Meckel\'s diverticulum',
      'Intestinal polyps',
      'Lymphoma',
      'Henoch-Schönlein purpura',
      'Cystic fibrosis',
      'Post-operative (after abdominal surgery)'
    ],
    symptoms: [
      'Intermittent severe abdominal pain (colicky)',
      'Crying with legs drawn up',
      'Vomiting (may become bilious/green)',
      'Bloody "redcurrant jelly" stool (late sign)',
      'Palpable abdominal mass ("sausage-shaped")',
      'Lethargy between pain episodes',
      'Refusing feeds',
      'Distended abdomen'
    ],
    riskFactors: [
      'Age 6 months to 3 years (peak 5-9 months)',
      'Male gender (slightly more common)',
      'Recent viral illness',
      'Previous intussusception (recurrence risk)',
      'Cystic fibrosis',
      'Rotavirus vaccine (very small increased risk)'
    ],
    complications: [
      'Bowel ischemia (loss of blood supply)',
      'Bowel necrosis (death of bowel tissue)',
      'Bowel perforation',
      'Peritonitis',
      'Shock',
      'Recurrence (5-10%)'
    ],
    prevalence: 'Intussusception occurs in 1-4 per 1,000 children under 1 year. It is the most common cause of intestinal obstruction in infants and young children.'
  },

  treatmentPhases: [
    {
      phase: 1,
      name: 'Emergency Assessment',
      duration: 'Hours',
      description: 'Rapid assessment, resuscitation if needed, and diagnosis confirmation. This is a surgical emergency.',
      goals: [
        'Rapid diagnosis',
        'Assess child\'s condition',
        'Fluid resuscitation',
        'Determine treatment approach'
      ],
      activities: [
        'Clinical examination',
        'Abdominal ultrasound (diagnostic)',
        'IV access and fluid resuscitation',
        'Nasogastric tube if vomiting',
        'Blood tests',
        'Surgical consultation'
      ],
      medications: [
        {
          name: 'IV fluids',
          purpose: 'Resuscitation and hydration',
          duration: 'Until resolved'
        },
        {
          name: 'Antibiotics',
          purpose: 'If peritonitis suspected or surgery needed',
          duration: 'As required'
        }
      ],
      warningSignsThisPhase: [
        'Signs of peritonitis',
        'Shock',
        'Evidence of bowel perforation'
      ]
    },
    {
      phase: 2,
      name: 'Non-Surgical Reduction (First Line)',
      duration: '1-2 hours',
      description: 'Air or contrast enema reduction - successful in 80-90% of uncomplicated cases.',
      goals: [
        'Reduce intussusception without surgery',
        'Confirm complete reduction',
        'Avoid surgery if possible'
      ],
      activities: [
        'Air or contrast (barium/water-soluble) enema under fluoroscopy or ultrasound',
        'Controlled pressure to push telescoped bowel back',
        'Monitoring during procedure',
        'Confirm reduction radiologically'
      ],
      warningSignsThisPhase: [
        'Failed reduction',
        'Perforation during procedure',
        'Recurrence immediately after reduction'
      ]
    },
    {
      phase: 3,
      name: 'Surgical Reduction (If Needed)',
      duration: 'Day of surgery',
      description: 'Surgery required if enema reduction fails, if signs of perforation/peritonitis, or if pathological lead point suspected.',
      goals: [
        'Reduce intussusception',
        'Assess bowel viability',
        'Resect non-viable bowel if needed',
        'Remove pathological lead point'
      ],
      activities: [
        'Laparoscopic or open surgery',
        'Manual reduction of intussusception',
        'Assessment of bowel',
        'Bowel resection if necrotic',
        'Appendectomy often performed'
      ],
      warningSignsThisPhase: [
        'Non-viable bowel requiring resection',
        'Pathological lead point found'
      ]
    },
    {
      phase: 4,
      name: 'Recovery Phase',
      duration: '2-7 days',
      description: 'Post-procedure monitoring and return to normal feeding. Duration depends on whether surgery was required.',
      goals: [
        'Establish normal feeding',
        'Monitor for recurrence',
        'Wound healing (if surgery)'
      ],
      activities: [
        'Gradual reintroduction of feeds',
        'Pain management',
        'Monitor for recurrence',
        'Wound care if surgery'
      ],
      warningSignsThisPhase: [
        'Recurrence of symptoms',
        'Wound infection',
        'Delayed bowel function'
      ]
    }
  ],

  preoperativeInstructions: {
    consultations: [
      'Pediatric surgeon',
      'Pediatric radiologist',
      'Pediatric anesthetist (if surgery needed)'
    ],
    investigations: [
      'Abdominal ultrasound (target sign, pseudokidney sign)',
      'Abdominal X-ray',
      'Complete blood count',
      'Electrolytes',
      'Blood type and crossmatch (if surgery anticipated)'
    ],
    medications: [
      {
        medication: 'Oral intake',
        instruction: 'nil by mouth',
        reason: 'Preparing for possible procedure or surgery'
      }
    ],
    fastingInstructions: 'Nil by mouth from time of diagnosis. Child will receive IV fluids.',
    dayBeforeSurgery: [
      'Emergency presentation - no planned pre-admission',
      'IV fluids and resuscitation as needed',
      'Nasogastric tube if vomiting'
    ],
    whatToBring: [
      'Comfort items for child',
      'Nappies/diapers',
      'Change of clothes',
      'Parent essentials'
    ],
    dayOfSurgery: [
      'Emergency or semi-urgent procedure',
      'Child kept nil by mouth',
      'IV fluids running',
      'Parents can stay for comfort'
    ]
  },

  intraoperativeInfo: {
    anesthesiaType: 'Sedation for enema reduction; General anesthesia for surgery',
    procedureDescription: 'AIR/CONTRAST ENEMA REDUCTION: Performed by radiologist with surgeon present. A catheter is placed in the rectum and air or contrast is instilled under controlled pressure. This pushes the telescoped bowel back into place. Success is confirmed by seeing air/contrast flow into the small bowel. Success rate 80-90% for uncomplicated cases. SURGICAL REDUCTION: If enema fails or child has peritonitis/perforation. Laparoscopic or open approach. The intussusception is manually reduced by gently squeezing (milking) the bowel rather than pulling. Bowel viability is assessed. Necrotic bowel is resected. Appendectomy often performed. If a pathological lead point (polyp, Meckel\'s) is found, it is removed.',
    duration: 'Enema: 30-60 minutes. Surgery: 1-2 hours',
    whatToExpect: 'Enema reduction is first choice if child is stable. Surgeon present throughout. Surgery performed if enema fails or not appropriate.'
  },

  postoperativeInstructions: {
    immediatePostop: {
      positioning: 'Comfortable position. After surgery, avoid pressure on abdomen.',
      expectedSymptoms: [
        'Mild abdominal discomfort after enema',
        'More significant pain after surgery',
        'May pass blood-stained stool (from irritated bowel)',
        'Drowsiness if sedated/anesthetized'
      ],
      activityLevel: 'Rest initially. Normal activity as tolerated once feeding established.'
    },
    woundCare: [
      {
        day: 'After enema',
        instruction: 'No wound care needed. Monitor for symptoms of recurrence.'
      },
      {
        day: 'After surgery Days 1-7',
        instruction: 'Wounds covered with dressings. Keep dry. Sponge bathing only.'
      },
      {
        day: 'Days 7-14',
        instruction: 'Sutures usually dissolving. Normal bathing can resume. Wounds should be healing.'
      }
    ],
    painManagement: {
      expectedPainLevel: 'Mild after enema, moderate after surgery',
      medications: [
        'Paracetamol (acetaminophen)',
        'Ibuprofen (after surgery, if appropriate)',
        'Stronger pain relief may be needed after major surgery'
      ],
      nonPharmacological: [
        'Comfort holding',
        'Distraction',
        'Warm pack (not on wounds)'
      ]
    },
    activityRestrictions: [
      {
        activity: 'Normal play',
        restriction: 'As tolerated',
        duration: 'Days to weeks depending on treatment',
        reason: 'Allow recovery'
      },
      {
        activity: 'Contact sports/rough play',
        restriction: 'Avoid after surgery',
        duration: '4-6 weeks',
        reason: 'Wound healing'
      }
    ],
    dietaryGuidelines: [
      'After successful enema: Clear fluids first, then normal diet within hours',
      'After surgery: Nil by mouth until bowel function returns',
      'Start with clear fluids, advance as tolerated',
      'Normal diet usually within 2-5 days after surgery',
      'If bowel resection performed, slower advancement'
    ]
  },

  expectedOutcomes: {
    shortTerm: [
      {
        timeframe: 'After enema',
        expectation: 'Home within 24-48 hours if successful and stable'
      },
      {
        timeframe: 'After surgery',
        expectation: 'Hospital stay 3-7 days, longer if resection'
      },
      {
        timeframe: '1-2 weeks',
        expectation: 'Normal feeding and activity'
      }
    ],
    longTerm: [
      {
        timeframe: '1-3 months',
        expectation: 'Full recovery, monitoring period for recurrence'
      },
      {
        timeframe: 'Long-term',
        expectation: 'Normal bowel function, no long-term effects'
      }
    ],
    functionalRecovery: 'Excellent. Full recovery expected in almost all cases. Normal bowel function and development.',
    cosmeticOutcome: 'Enema: No scars. Laparoscopic surgery: 3 small scars. Open surgery: Single scar that fades.',
    successRate: 'Enema reduction: 80-90% success. Overall cure rate >95%. Recurrence 5-10% (higher after enema than surgery).',
    possibleComplications: [
      'Recurrence (5-10%, usually within 72 hours)',
      'Bowel perforation (rare)',
      'Bowel resection needed (5-10% of surgical cases)',
      'Wound infection (surgical cases)',
      'Adhesive bowel obstruction later (surgical cases)'
    ]
  },

  followUpCare: {
    schedule: [
      {
        timing: '24-72 hours after discharge',
        purpose: 'Phone or clinic review - monitor for recurrence'
      },
      {
        timing: '1-2 weeks',
        purpose: 'Clinical review, wound check if surgery'
      },
      {
        timing: '6 weeks',
        purpose: 'Confirm full recovery'
      }
    ],
    rehabilitationNeeds: [
      'Normal developmental activities',
      'Catch-up feeding if weight loss',
      'Standard pediatric follow-up'
    ],
    lifestyleModifications: [
      'No specific modifications after recovery',
      'Awareness of recurrence symptoms',
      'Normal diet and activities'
    ]
  },

  warningSigns: [
    'Return of colicky abdominal pain',
    'Vomiting',
    'Blood in stool',
    'Fever (after surgery)',
    'Wound redness or discharge (after surgery)',
    'Refusing to eat or drink',
    'Excessive lethargy'
  ],

  emergencySigns: [
    'Severe abdominal pain returning',
    'Bilious (green) vomiting',
    'Large amount of blood in stool',
    'Child very unwell, lethargic, pale',
    'Signs of dehydration',
    'High fever'
  ],

  complianceRequirements: [
    {
      requirement: 'Monitor closely for 72 hours after reduction',
      importance: 'critical',
      consequence: 'Recurrence most common in this period'
    },
    {
      requirement: 'Return immediately if symptoms recur',
      importance: 'critical',
      consequence: 'Recurrence needs prompt treatment'
    },
    {
      requirement: 'Follow feeding guidelines',
      importance: 'important',
      consequence: 'Allows bowel to recover'
    }
  ],

  whoGuidelines: [
    {
      title: 'WHO Guidelines on Pediatric Emergency Surgery',
      reference: 'WHO Surgical Care',
      keyPoints: [
        'Air/contrast enema reduction is first-line treatment',
        'Surgical reduction if enema fails or contraindicated',
        'Prompt treatment prevents bowel necrosis',
        'Recurrence occurs in 5-10% of cases',
        'Excellent prognosis with timely treatment'
      ]
    }
  ]
};

// Export pediatric conditions part 1
export const pediatricSurgeryPart1 = [pyloricStenosis, intussusception];
